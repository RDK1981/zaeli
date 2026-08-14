-- ═══════════════════════════════════════════════════════════════════════
-- supabase-calendar-sync.sql — Build 48 (iCal two-way sync foundation)
-- ═══════════════════════════════════════════════════════════════════════
--
-- Andy asked for two-way sync between iPhone Calendar and Zaeli. This is
-- the SQL foundation. Client-side work (expo-calendar native module,
-- permission dance, per-calendar picker, sync engine) rides on top.
--
-- DESIGN DECISIONS LOCKED (Aug 27 conversation with Rich):
--   • PER-USER external sync — Andy's iPhone events show only for Andy in
--     Zaeli. Anna sees only her own external events. Family-owned Zaeli
--     events stay shared as always.
--   • OPT-IN PER CALENDAR — Andy picks which of his 8+ iOS calendars to
--     sync (Work / Personal iCloud / Kids School / etc). Persisted in the
--     new calendar_sync_config table.
--   • STORED IN SUPABASE — external events land in the events table with
--     source='apple-ical' + privacy_scope='personal' + imported_by_user_id=Andy.
--     Enables Sonnet brief to reference them ("Dentist at 3pm — leave by 2:45").
--
-- WHAT THIS ADDS:
--   1. events.source — nullable text: null | 'apple-ical' | 'gcal' | 'outlook'
--      (nullable for backwards-compat with all existing Zaeli-created events)
--   2. events.external_id — EventKit event identifier (needed for delta
--      detection: on next sync, check if this external_id already exists →
--      UPDATE not INSERT).
--   3. events.external_calendar_id — which of user's iOS calendars this came
--      from. Used for filtering (e.g. "hide Work calendar temporarily") and
--      per-calendar toggle behavior.
--   4. events.imported_by_user_id — the Supabase user (Andy) who owns this
--      external event. Needed for privacy_scope enforcement (Anna shouldn't
--      see Andy's work meetings).
--   5. events.privacy_scope — 'family' (default) vs 'personal'. External-
--      imported events default to 'personal'. Zaeli-created events default
--      to 'family'. Client + RLS both enforce.
--   6. events.synced_at — timestamptz of last successful sync. Used for
--      "modified since" queries in the sync engine.
--   7. New calendar_sync_config table — per-user config: which iOS calendars
--      to sync + the Zaeli-owned calendar id + master enable + last sync time.
--   8. Updated events SELECT RLS to enforce privacy_scope.
--   9. Indexes for fast lookups.
--
-- SECURITY:
--   • events RLS: family_id match AND privacy_scope='family' OR (privacy_scope=
--     'personal' AND imported_by_user_id = auth.uid()). So Anna cannot query
--     Andy's personal events even if she guessed IDs.
--   • calendar_sync_config RLS: only own row.
-- ═══════════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────────────
-- 1. events — new columns
-- ────────────────────────────────────────────────────────────────────────
alter table public.events
  add column if not exists source                text,
  add column if not exists external_id           text,
  add column if not exists external_calendar_id  text,
  add column if not exists imported_by_user_id   uuid references auth.users(id) on delete set null,
  add column if not exists privacy_scope         text not null default 'family',
  add column if not exists synced_at             timestamptz;

comment on column public.events.source is
  'Origin: null = Zaeli-native, ''apple-ical'' = iOS EventKit, ''gcal'' = Google Calendar (future), ''outlook'' = Microsoft (future).';
comment on column public.events.external_id is
  'External system identifier (EventKit id for apple-ical). Unique per source. Used for delta detection on subsequent syncs.';
comment on column public.events.external_calendar_id is
  'Which external calendar this event came from (iOS calendar id for apple-ical). Used for per-calendar filtering.';
comment on column public.events.imported_by_user_id is
  'The Supabase user who owns this external event. Combined with privacy_scope=personal, enforces per-user visibility.';
comment on column public.events.privacy_scope is
  '''family'' (default, whole family sees) or ''personal'' (only imported_by_user_id sees). External imports default to personal.';
comment on column public.events.synced_at is
  'Last successful sync timestamp. Used for modified-since queries.';

-- Unique constraint on (imported_by_user_id, external_id) so re-syncing
-- the same iOS event doesn't create duplicates. Partial index — only
-- enforces when both are non-null (Zaeli-native events don't need this).
create unique index if not exists events_external_dedup
  on public.events (imported_by_user_id, external_id)
  where external_id is not null and imported_by_user_id is not null;

-- Fast lookup for "give me all personal events for this user in date range"
create index if not exists events_personal_lookup
  on public.events (imported_by_user_id, date)
  where privacy_scope = 'personal';


-- ────────────────────────────────────────────────────────────────────────
-- 2. calendar_sync_config — per-user config
-- ────────────────────────────────────────────────────────────────────────
-- One row per user. JSONB shape for external_calendars:
--   [
--     {"id": "F8AE...", "title": "iCloud", "sync_enabled": true, "color": "#FF3B30", "source": "apple-ical"},
--     {"id": "9AB2...", "title": "Work", "sync_enabled": false, "color": "#007AFF", "source": "apple-ical"}
--   ]
-- Client manages this list — on Settings screen mount, fetches current iOS
-- calendars via expo-calendar, merges with saved config (preserves user's
-- sync_enabled toggles). Toggle change → UPDATE this row.
--
-- zaeli_calendar_id: EventKit id of the "Zaeli" calendar the app creates
-- on the user's device for write-back. Created on first sync-out.
create table if not exists public.calendar_sync_config (
  user_id             uuid primary key references auth.users(id) on delete cascade,
  family_id           uuid not null references public.families(id) on delete cascade,
  external_calendars  jsonb not null default '[]',
  zaeli_calendar_id   text,
  sync_enabled        boolean not null default false,
  permission_granted  boolean not null default false,
  last_synced_at      timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on table public.calendar_sync_config is
  'Per-user iOS Calendar sync configuration. External events go into events table; this table tracks which calendars to sync + the Zaeli-owned calendar id for write-back.';

alter table public.calendar_sync_config enable row level security;

drop policy if exists "sync_config select own" on public.calendar_sync_config;
drop policy if exists "sync_config insert own" on public.calendar_sync_config;
drop policy if exists "sync_config update own" on public.calendar_sync_config;
drop policy if exists "sync_config delete own" on public.calendar_sync_config;

create policy "sync_config select own" on public.calendar_sync_config
  for select using (user_id = auth.uid());

create policy "sync_config insert own" on public.calendar_sync_config
  for insert with check (user_id = auth.uid() and family_id = public.current_family_id());

create policy "sync_config update own" on public.calendar_sync_config
  for update using (user_id = auth.uid())
              with check (user_id = auth.uid());

create policy "sync_config delete own" on public.calendar_sync_config
  for delete using (user_id = auth.uid());


-- ────────────────────────────────────────────────────────────────────────
-- 3. events SELECT RLS — enforce privacy_scope
-- ────────────────────────────────────────────────────────────────────────
-- Existing SELECT policy (Session 21) was: family_id = current_family_id().
-- Now: additionally require (privacy_scope='family' OR user owns the personal event).
--
-- Note on legacy rows: the ALTER TABLE above set default='family' + NOT NULL,
-- so every existing event now has privacy_scope='family'. No data risk.

drop policy if exists "events select" on public.events;

create policy "events select" on public.events
  for select
  using (
    family_id = public.current_family_id()
    and (
      privacy_scope = 'family'
      or (privacy_scope = 'personal' and imported_by_user_id = auth.uid())
    )
  );

-- INSERT/UPDATE policies keep the family_id check (unchanged from Session 21).
-- Personal events can only be created by their own owner via WITH CHECK.
-- Client-side we always set imported_by_user_id = auth.uid() at insert time
-- for personal events, so this is defence-in-depth.

drop policy if exists "events insert" on public.events;
create policy "events insert" on public.events
  for insert
  with check (
    family_id = public.current_family_id()
    and (
      privacy_scope = 'family'
      or (privacy_scope = 'personal' and imported_by_user_id = auth.uid())
    )
  );

drop policy if exists "events update" on public.events;
create policy "events update" on public.events
  for update
  using (
    family_id = public.current_family_id()
    and (
      privacy_scope = 'family'
      or (privacy_scope = 'personal' and imported_by_user_id = auth.uid())
    )
  )
  with check (
    family_id = public.current_family_id()
    and (
      privacy_scope = 'family'
      or (privacy_scope = 'personal' and imported_by_user_id = auth.uid())
    )
  );

drop policy if exists "events delete" on public.events;
create policy "events delete" on public.events
  for delete
  using (
    family_id = public.current_family_id()
    and (
      privacy_scope = 'family'
      or (privacy_scope = 'personal' and imported_by_user_id = auth.uid())
    )
  );


-- ────────────────────────────────────────────────────────────────────────
-- 4. Verify:
--
--   -- New columns exist
--   select column_name, data_type, column_default
--     from information_schema.columns
--     where table_name = 'events'
--       and column_name in ('source','external_id','external_calendar_id','imported_by_user_id','privacy_scope','synced_at');
--
--   -- All existing events default to family scope
--   select privacy_scope, count(*) from public.events group by privacy_scope;
--   -- Should show: family (all rows), no null, no personal
--
--   -- New table exists with RLS enabled + 4 policies
--   select tablename, rowsecurity from pg_tables where tablename = 'calendar_sync_config';
--   select polname from pg_policy where polrelid = 'public.calendar_sync_config'::regclass;
--
--   -- events has all 4 policies updated
--   select polname, polcmd from pg_policy
--     where polrelid = 'public.events'::regclass
--     order by polname;
-- ═══════════════════════════════════════════════════════════════════════
