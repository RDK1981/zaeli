-- ═══════════════════════════════════════════════════════════════════════
-- supabase-beta-signups.sql — public website beta signup capture (v2)
-- ═══════════════════════════════════════════════════════════════════════
--
-- Wires the beta form at zaeli.app to a real Supabase table so Rich sees
-- every signup in Studio + can trigger TestFlight invites.
--
-- v2 (Round B) — added `name` column so Rich can personalise TestFlight
-- outreach emails. Beta signups are prospective customers; capturing
-- name at first touch is cheap and pays off in later communication.
--
-- Design:
--   - beta_signups table with email UNIQUE (case-insensitive dedup —
--     Anna@X.com == anna@x.com).
--   - Anon-callable SECURITY DEFINER RPC register_beta_signup(email, name).
--     Called from public website JS (no user session — anon role).
--   - RLS on the table blocks direct anon SELECT so submitted emails
--     are not publicly readable. Rich reads via service_role in Studio.
--   - Idempotent per email — a second submit updates updated_at + name
--     if provided; does not error.
--
-- To run:
--   Supabase Studio → SQL Editor → paste this whole file → Run.
--   Idempotent — safe to re-run after edits.
-- ═══════════════════════════════════════════════════════════════════════

create table if not exists public.beta_signups (
  id           uuid primary key default gen_random_uuid(),
  email        text not null,
  name         text,                             -- v2 — captured at signup
  source       text,                             -- e.g. 'website', 'friend-referral'
  family_size  integer,                          -- optional, if form later asks
  notes        text,                             -- optional, if form later asks
  invited_at   timestamptz,                      -- Rich sets when TestFlight invite goes out
  activated_at timestamptz,                      -- Rich sets when they actually sign in
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- v2 — add column for existing databases that ran v1.
alter table public.beta_signups add column if not exists name text;

-- Case-insensitive uniqueness on email (Anna@X.com == anna@x.com).
create unique index if not exists beta_signups_email_lower_idx
  on public.beta_signups (lower(email));

-- RLS on. No anon SELECT — emails are private data.
alter table public.beta_signups enable row level security;

-- Wipe any prior policies so re-runs don't accumulate duplicates.
do $$
declare pol record;
begin
  for pol in select polname from pg_policy where polrelid = 'public.beta_signups'::regclass loop
    execute format('drop policy if exists %I on public.beta_signups', pol.polname);
  end loop;
end $$;

-- Owner-only SELECT/UPDATE/DELETE via authenticated users you designate
-- later. For now, we keep RLS locked; Rich reads via the service_role
-- (Supabase Studio) or a future admin console query.
-- (No policies = deny everything to anon + authenticated. Deliberate.)

-- v2 — drop old signature before creating new one (Postgres treats
-- functions with different param signatures as separate functions).
drop function if exists public.register_beta_signup(text, text, integer, text);
drop function if exists public.register_beta_signup(text, text, text, integer, text);

-- Anon-callable RPC. Idempotent per email — a second submit updates
-- updated_at + name instead of erroring, so users don't see a scary
-- "already exists" message if they resubmit.
create or replace function public.register_beta_signup(
  p_email       text,
  p_name        text default null,
  p_source      text default 'website',
  p_family_size integer default null,
  p_notes       text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  clean_email text := lower(trim(p_email));
  clean_name  text := nullif(trim(coalesce(p_name, '')), '');
  existed     boolean := false;
begin
  if clean_email is null or clean_email = '' or clean_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    return jsonb_build_object('ok', false, 'error', 'invalid_email');
  end if;

  perform 1 from public.beta_signups where lower(email) = clean_email;
  existed := found;

  insert into public.beta_signups (email, name, source, family_size, notes)
  values (clean_email, clean_name, coalesce(p_source, 'website'), p_family_size, p_notes)
  on conflict ((lower(email)))
  do update set
    updated_at  = now(),
    name        = coalesce(excluded.name, public.beta_signups.name),
    source      = coalesce(excluded.source, public.beta_signups.source),
    family_size = coalesce(excluded.family_size, public.beta_signups.family_size),
    notes       = coalesce(excluded.notes, public.beta_signups.notes);

  return jsonb_build_object('ok', true, 'existed', existed);
end;
$$;

-- Grant EXECUTE to anon so the public website (no session) can call it.
grant execute on function public.register_beta_signup(text, text, text, integer, text) to anon;

-- ═══════════════════════════════════════════════════════════════════════
-- Verify:
--   select count(*) from public.beta_signups;
--   select register_beta_signup('test@example.com', 'Test User');
--   select email, name, created_at from public.beta_signups order by created_at desc limit 5;
-- ═══════════════════════════════════════════════════════════════════════
