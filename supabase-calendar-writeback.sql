-- ═══════════════════════════════════════════════════════════════════════
-- supabase-calendar-writeback.sql — Build 50 (iCal two-way sync: write-back)
-- ═══════════════════════════════════════════════════════════════════════
--
-- Build 49 shipped read-in: iPhone Calendar events land in Zaeli's events
-- table with source='apple-ical'. Build 50 adds the OTHER direction —
-- Zaeli-native events (source=null) get mirrored INTO a dedicated "Zaeli"
-- calendar on the user's iPhone. So Andy sees his Zaeli events on his
-- iPhone Calendar, lockscreen, Apple Watch, CarPlay, everywhere iCal lives.
--
-- WHAT THIS ADDS:
--   events.mirrored_apple_id — text. The EventKit id where this Zaeli-native
--   event was mirrored. Null = not yet mirrored (or user doesn't have sync
--   enabled). Set = we've written the event to EventKit and can update/
--   delete it later using this id.
--
-- Design decisions (Session 34 continuation):
--   - Only mirror events with source=null (Zaeli-native). Never mirror
--     external events back — that'd create infinite ping-pong duplicates.
--   - Mirror per-user based on their sync config. Andy's sync only mirrors
--     to Andy's iPhone. Anna's sync only mirrors to Anna's. Family-scope
--     events get mirrored to EVERY family adult with sync enabled.
--   - Track mirror state on the events row itself (not a separate table).
--     Simpler queries + no join for the common case.
--
-- BUILD 50 MVP: INSERT-only. Zaeli events land in EventKit on next sync.
-- BUILD 51 (later): update mirror on Zaeli event edit, delete mirror on
-- Zaeli event delete.
--
-- SETUP:
--   Run this in Supabase Studio → SQL Editor. Idempotent.
-- ═══════════════════════════════════════════════════════════════════════

alter table public.events
  add column if not exists mirrored_apple_id text;

comment on column public.events.mirrored_apple_id is
  'EventKit id where this Zaeli-native event was mirrored to iPhone Calendar. Null = not mirrored. Only set for source=null events (external events are never mirrored back).';

-- Fast lookup for "have we mirrored this event yet?" queries during sync.
create index if not exists events_mirror_lookup
  on public.events (family_id, mirrored_apple_id)
  where source is null;


-- ────────────────────────────────────────────────────────────────────────
-- Verify:
--
--   select column_name, data_type
--     from information_schema.columns
--     where table_name = 'events' and column_name = 'mirrored_apple_id';
--
--   -- All existing Zaeli-native events should have null mirrored_apple_id
--   -- (they'll get filled in as they're mirrored on next sync).
--   select count(*) as total_zaeli_events,
--          count(mirrored_apple_id) as already_mirrored
--     from public.events
--     where source is null;
-- ═══════════════════════════════════════════════════════════════════════
