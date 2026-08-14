-- ═══════════════════════════════════════════════════════════════════════
-- supabase-admin-console.sql — Admin Console v3 (Batch 1)
-- ═══════════════════════════════════════════════════════════════════════
--
-- Creates the auth boundary + wider read access for the admin console
-- that lives at zaeli.app/admin/. Idempotent — safe to re-run.
--
-- Model:
--   1. `admin_whitelist` table lists the email addresses allowed to see
--      the admin console. Signed-in Supabase auth users NOT on the
--      whitelist get access denied even with a valid session.
--   2. SECURITY DEFINER RPC `is_admin()` returns true if the caller's
--      email is on the whitelist. Reads auth.users.email safely inside
--      the function's postgres role context.
--   3. Additional SELECT RLS policies on customer-facing tables grant
--      cross-family reads to whitelisted users. Existing family-scoped
--      policies stay in place — they OR with the admin one, so a user
--      still sees their own family's data whether or not they're admin.
--   4. For destructive admin actions (grant beta, delete family) we'll
--      route through a service-role Edge Function in Batch 2 — never
--      grant DELETE/UPDATE directly to the browser client.
--
-- To run:
--   Supabase Studio → SQL Editor → paste this whole file → Run.
-- ═══════════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────────────
-- Admin whitelist
-- ────────────────────────────────────────────────────────────────────────
create table if not exists public.admin_whitelist (
  email      text primary key,
  notes      text,
  created_at timestamptz not null default now()
);

-- Rich seeded. Add more admins later via INSERT.
insert into public.admin_whitelist (email, notes)
values ('richarddekretser@gmail.com', 'Founder')
on conflict (email) do nothing;

-- Deny all direct access — this table is read only via is_admin()
alter table public.admin_whitelist enable row level security;

do $$
declare pol record;
begin
  for pol in select polname from pg_policy where polrelid = 'public.admin_whitelist'::regclass loop
    execute format('drop policy if exists %I on public.admin_whitelist', pol.polname);
  end loop;
end $$;
-- No policies = deny everything. Deliberate.

-- ────────────────────────────────────────────────────────────────────────
-- is_admin() — the boundary check
-- ────────────────────────────────────────────────────────────────────────
-- SECURITY DEFINER so we can read auth.users.email + admin_whitelist
-- regardless of the caller's RLS grants. Session 21 gotcha applied:
-- SET search_path = public, auth so auth.uid() resolves correctly.
create or replace function public.is_admin()
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  caller_email text;
begin
  select email into caller_email from auth.users where id = auth.uid();
  if caller_email is null then return false; end if;
  return exists (
    select 1 from public.admin_whitelist w
    where lower(w.email) = lower(caller_email)
  );
end;
$$;

-- Any signed-in user can CALL is_admin — but it only returns true for
-- whitelisted emails. Others get false, no data leak.
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_admin() to anon;

-- ────────────────────────────────────────────────────────────────────────
-- Admin SELECT policies — grant whitelisted users cross-family reads.
-- These OR with existing family-scoped policies (Session 21). Non-admins
-- still see only their own family; admins see everything.
-- ────────────────────────────────────────────────────────────────────────

-- profiles — admin sees all
drop policy if exists "Admin reads all profiles" on public.profiles;
create policy "Admin reads all profiles" on public.profiles
  for select using (public.is_admin());

-- families — admin sees all
drop policy if exists "Admin reads all families" on public.families;
create policy "Admin reads all families" on public.families
  for select using (public.is_admin());

-- beta_signups — no anon access, admin-only SELECT
drop policy if exists "Admin reads all beta_signups" on public.beta_signups;
create policy "Admin reads all beta_signups" on public.beta_signups
  for select using (public.is_admin());

-- api_logs (currently no RLS at all). Enable RLS + grant admin SELECT.
-- Non-admins get nothing — they never read api_logs from the client anyway.
alter table public.api_logs enable row level security;
drop policy if exists "Admin reads all api_logs" on public.api_logs;
create policy "Admin reads all api_logs" on public.api_logs
  for select using (public.is_admin());

-- family_members — admin sees all (existing policy scoped to family)
drop policy if exists "Admin reads all family_members" on public.family_members;
create policy "Admin reads all family_members" on public.family_members
  for select using (public.is_admin());

-- reminders / events / shopping_items — admin needs read for per-family
-- diagnostics (Costs page filters etc.)
drop policy if exists "Admin reads all reminders" on public.reminders;
create policy "Admin reads all reminders" on public.reminders
  for select using (public.is_admin());

drop policy if exists "Admin reads all events" on public.events;
create policy "Admin reads all events" on public.events
  for select using (public.is_admin());

-- ═══════════════════════════════════════════════════════════════════════
-- Verify:
--   select * from public.admin_whitelist;                     -- your email
--   select public.is_admin();                                 -- true (as Rich)
--   select count(*) from public.profiles;                     -- all families
--   select count(*) from public.beta_signups;                 -- all signups
--   select count(*) from public.api_logs where created_at >= date_trunc('month', now()); -- month spend rows
-- ═══════════════════════════════════════════════════════════════════════
