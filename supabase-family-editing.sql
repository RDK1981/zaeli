-- ═══════════════════════════════════════════════════════════════════════
-- supabase-family-editing.sql — Option C (Our Family — Batch 10)
-- ═══════════════════════════════════════════════════════════════════════
--
-- Andy caught that the Our Family member profile screen was essentially
-- read-only — Name / Colour / Access controls all displayed but nothing
-- tappable except a placeholder "Remove" button that fired a "not wired"
-- alert. This migration is the backend side of finishing that screen.
--
-- WHAT THIS ADDS:
--   1. profiles.budget_access — persists the per-kid "can open Our Budget"
--      toggle (was local state only, reset on app restart).
--   2. Tighter family_members UPDATE RLS — owner can edit any row in the
--      family, adult can only edit their own row (name / colour). Prior
--      policy from Session 21 allowed ANY family member to update ANY row
--      via direct Supabase call — client UI hid the buttons but a malicious
--      client could bypass.
--   3. remove_family_member(target_id) RPC — SECURITY DEFINER, owner-only,
--      deletes family_members row + nulls profiles.family_id for that user
--      (removing their RLS access to all family data). Auth user stays,
--      so they could later be re-invited via a fresh invite.
--
-- SETUP:
--   Run this whole file in Supabase Studio → SQL Editor. Idempotent.
--
-- SECURITY NOTES:
--   - remove_family_member re-checks that caller is the family owner via
--     profiles.kind='owner' + same family_id as target. Even though it's
--     SECURITY DEFINER, no cross-family removal is possible.
--   - SET search_path = public, auth is REQUIRED (Session 21 lesson) —
--     without it auth.uid() silently returns NULL inside the function.
-- ═══════════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────────────
-- 1. profiles.budget_access — kid Our Budget toggle persistence
-- ────────────────────────────────────────────────────────────────────────
alter table public.profiles
  add column if not exists budget_access boolean default false;

comment on column public.profiles.budget_access is
  'Kids only: owner-controlled flag for whether this child can open Our Budget. Ignored for owner/adult kinds (they always have access).';


-- ────────────────────────────────────────────────────────────────────────
-- 2. Tighter family_members UPDATE RLS — owner OR self
-- ────────────────────────────────────────────────────────────────────────
-- The Session 21 default was "any family member can UPDATE any row in the
-- family" which was fine when nothing wrote to family_members client-side.
-- Now that we're wiring inline name/colour edit, tighten to:
--   • Owner (profiles.kind='owner' in same family) → can UPDATE any row
--   • Anyone else → can UPDATE only their own row (family_members.id = auth.uid())
--
-- Invariant: family_members.id === profiles.id === auth.uid() for the same
-- person (confirmed via app/(tabs)/family.tsx:126 `roster.find(m => m.id === meId)`
-- where meId = profile.id).

drop policy if exists "family_members update" on public.family_members;

create policy "family_members update"
  on public.family_members
  for update
  using (
    family_id = public.current_family_id()
    and (
      id = auth.uid()
      or exists (
        select 1 from public.profiles
        where id = auth.uid()
          and kind = 'owner'
          and family_id = public.current_family_id()
      )
    )
  )
  with check (
    family_id = public.current_family_id()
    and (
      id = auth.uid()
      or exists (
        select 1 from public.profiles
        where id = auth.uid()
          and kind = 'owner'
          and family_id = public.current_family_id()
      )
    )
  );

-- Also tighten DELETE — only owner can delete family_members rows.
-- (Session 21 default was any-in-family; we want owner-only.)
drop policy if exists "family_members delete" on public.family_members;

create policy "family_members delete"
  on public.family_members
  for delete
  using (
    family_id = public.current_family_id()
    and exists (
      select 1 from public.profiles
      where id = auth.uid()
        and kind = 'owner'
        and family_id = public.current_family_id()
    )
  );


-- ────────────────────────────────────────────────────────────────────────
-- 3. remove_family_member RPC — owner-only, soft delete
-- ────────────────────────────────────────────────────────────────────────
-- Client calls this to remove a member. The function:
--   1. Verifies caller is the family owner
--   2. Verifies target is in caller's family
--   3. Refuses to remove the owner themselves (need transfer-ownership flow)
--   4. Deletes family_members row (their identity in the roster)
--   5. Nulls profiles.family_id for the removed user (revokes RLS access)
--
-- Their auth.users row stays intact — they can be re-invited later via a
-- fresh invite_tokens flow, at which point handle_new_user's invitee branch
-- would re-link them to a family. (Currently the invite trigger only fires
-- on auth.users INSERT, so a re-invite would need trigger updates. Deferred.)

create or replace function public.remove_family_member(target_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  caller_id   uuid;
  caller_kind text;
  caller_fid  uuid;
  target_kind text;
  target_fid  uuid;
begin
  caller_id := auth.uid();
  if caller_id is null then
    return jsonb_build_object('ok', false, 'error', 'not signed in');
  end if;

  -- Caller must be signed in AND owner of the family
  select kind, family_id into caller_kind, caller_fid
    from public.profiles where id = caller_id;

  if caller_kind is null then
    return jsonb_build_object('ok', false, 'error', 'no profile for caller');
  end if;

  if caller_kind <> 'owner' then
    return jsonb_build_object('ok', false, 'error', 'only the family owner can remove members');
  end if;

  -- Target must exist AND be in the caller's family
  select kind, family_id into target_kind, target_fid
    from public.profiles where id = target_id;

  if target_kind is null then
    return jsonb_build_object('ok', false, 'error', 'target profile not found');
  end if;

  if target_fid is distinct from caller_fid then
    return jsonb_build_object('ok', false, 'error', 'target is not in your family');
  end if;

  -- Refuse to remove the owner themselves
  if target_id = caller_id then
    return jsonb_build_object('ok', false, 'error', 'cannot remove the family owner (use transfer ownership first)');
  end if;

  -- Delete family_members row (may not exist for users who haven't been
  -- added to the roster yet — that's fine)
  delete from public.family_members
    where id = target_id and family_id = caller_fid;

  -- Null the profile's family_id to revoke RLS access. Keep the auth user
  -- intact so they can be re-invited later without recreating.
  update public.profiles
    set family_id = null,
        updated_at = now()
    where id = target_id;

  return jsonb_build_object('ok', true, 'removed_id', target_id);
exception
  when others then
    return jsonb_build_object('ok', false, 'error', sqlerrm);
end;
$$;

grant execute on function public.remove_family_member(uuid) to authenticated;


-- ────────────────────────────────────────────────────────────────────────
-- Verify:
--
--   -- Confirm column exists
--   select column_name, data_type, column_default
--     from information_schema.columns
--     where table_name = 'profiles' and column_name = 'budget_access';
--
--   -- Confirm policies
--   select polname, polcmd from pg_policy
--     where polrelid = 'public.family_members'::regclass
--     order by polname;
--   -- Should show 4 policies: SELECT / INSERT / UPDATE / DELETE
--
--   -- Confirm RPC exists
--   select proname, prosecdef from pg_proc
--     where proname = 'remove_family_member';
--   -- Should show one row, prosecdef = true (SECURITY DEFINER)
-- ═══════════════════════════════════════════════════════════════════════
