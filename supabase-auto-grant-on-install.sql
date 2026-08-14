-- ═══════════════════════════════════════════════════════════════════════
-- supabase-auto-grant-on-install.sql — Batch 8
-- ═══════════════════════════════════════════════════════════════════════
--
-- Auto-grants beta + fires welcome email the moment a person installs the
-- app and signs up, IF their email was already in the invited beta_signups
-- queue (Rich clicked "Send TestFlight invite" for them earlier).
--
-- Removes the "wait for Rich to see + click Grant beta" delay. Andrew
-- installs at 9pm → welcome email lands within ~30 seconds → 3-day / 14-day
-- lifecycle emails auto-schedule from that moment.
--
-- MECHANISM:
--   1. handle_new_user() trigger runs on auth.users INSERT (already exists
--      from Session 21). This migration ADDS a new branch to it that runs
--      AFTER the existing owner/invitee flows: check if the new user's
--      email is in beta_signups.invited_at → auto-set profile.beta_start_date
--      + beta_end_date + fire welcome via pg_net → admin-actions.
--
--   2. admin-actions Edge Function accepts a NEW service-role-only action
--      "auto_send_welcome" that fires the welcome email inline (uses the
--      same SMTP path as the manual grant flow).
--
-- SETUP (one-time):
--   1. Deploy the updated Edge Function:
--        supabase functions deploy admin-actions
--   2. Fill in your service_role key on the line marked FILL IN below.
--   3. Run this whole file in Supabase Studio → SQL Editor.
--   4. Test by simulating a signup — fill the zaeli.app form, click
--      Send TestFlight invite in admin, then create the auth user in
--      Studio → Auth → Users → Add User with the same email. Welcome
--      email should arrive within 30 seconds.
--
-- SAFETY:
--   - The manual "Grant 3-mo beta" button in the admin console STILL WORKS
--     for edge cases (someone who wasn't in the invited queue). This trigger
--     only fires for the invited-then-installed path.
--   - beta_start_date is set inside the trigger's SECURITY DEFINER context
--     so RLS doesn't block it.
--   - If the pg_net call to admin-actions fails, the profile is still
--     created and beta is still granted — the welcome email is best-effort.
--     Rich can manually re-fire from the admin console → Signup queue.
-- ═══════════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────────────
-- Recreate handle_new_user() with the new auto-grant + welcome branch
-- ────────────────────────────────────────────────────────────────────────
-- Preserves the existing owner + invitee_token flows (from Session 21/22).
-- Adds a THIRD conditional branch at the end for the invited-beta case.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  new_family_id     uuid;
  meta_name         text;
  meta_family_name  text;
  meta_invite_token text;
  invite_row        public.invite_tokens%rowtype;
  is_beta_invited   boolean;
begin
  meta_name         := coalesce(new.raw_user_meta_data->>'name', '');
  meta_family_name  := coalesce(new.raw_user_meta_data->>'family_name', '');
  meta_invite_token := new.raw_user_meta_data->>'invite_token';

  if meta_invite_token is not null and meta_invite_token <> '' then
    -- ── Invitee flow — join an existing family via token ────────────────
    select * into invite_row from public.invite_tokens
      where token = meta_invite_token
      limit 1;
    if invite_row.token is null then
      raise exception 'invite token not found: %', meta_invite_token;
    end if;
    if invite_row.status = 'revoked' then
      raise exception 'invite token revoked';
    end if;
    if invite_row.status = 'accepted' then
      raise exception 'invite token already accepted';
    end if;

    insert into public.profiles (id, family_id, kind, name, email, created_at, updated_at)
      values (new.id, invite_row.family_id, invite_row.role, coalesce(meta_name, invite_row.name), new.email, now(), now());

    update public.invite_tokens
      set status = 'accepted', accepted_user_id = new.id, accepted_at = now()
      where token = meta_invite_token;

  else
    -- ── Owner flow — create new family + owner profile ──────────────────
    insert into public.families (name)
      values (case when meta_family_name <> '' then meta_family_name else meta_name || '''s family' end)
      returning id into new_family_id;

    insert into public.profiles (id, family_id, kind, name, email, created_at, updated_at)
      values (new.id, new_family_id, 'owner', meta_name, new.email, now(), now());

    -- ── Batch 8 — auto-grant beta if email is in the invited queue ──────
    -- Only owner flow; invitees never signed up via the website form.
    select true into is_beta_invited
      from public.beta_signups
      where lower(email) = lower(new.email)
        and invited_at is not null
      limit 1;

    if coalesce(is_beta_invited, false) then
      update public.profiles
        set beta_start_date = now(),
            beta_end_date   = now() + interval '3 months'
        where id = new.id;

      -- Fire welcome via pg_net → admin-actions auto_send_welcome action.
      -- Fire-and-forget: profile is created regardless. If pg_net or SMTP
      -- fails, welcome can be manually resent from the admin console.
      --
      -- Aug 26 fix: was `extensions.net.http_post` which silently errored
      -- (pg_net functions live in the `net` schema, not `extensions.net`).
      -- Now `net.http_post` (matches brief-scheduler which works).
      begin
        perform net.http_post(
          url     := 'https://rsvbzakyyrftezthlhtd.supabase.co/functions/v1/admin-actions',
          headers := jsonb_build_object(
            'Content-Type',  'application/json',
            'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY_HERE'   -- FILL IN before running
          ),
          body    := jsonb_build_object(
            'action',  'auto_send_welcome',
            'user_id', new.id
          ),
          timeout_milliseconds := 15000
        );
      exception when others then
        -- Log but don't fail the signup
        raise notice 'auto-welcome fire failed for %: %', new.email, sqlerrm;
      end;
    end if;
  end if;

  return new;
end;
$$;

-- ────────────────────────────────────────────────────────────────────────
-- Verify:
--   select tgname, tgrelid::regclass, tgenabled from pg_trigger
--   where tgname = 'on_auth_user_created';
--   -- Should show one row, enabled ('O')
--
--   -- Manual test after Andrew is in the queue:
--   -- 1. Confirm the row exists:
--   --      select * from public.beta_signups where email = 'fraggle@me.com';
--   -- 2. Confirm invited_at is set (should be from your earlier click):
--   --      select invited_at from public.beta_signups where email = 'fraggle@me.com';
--   -- 3. Once Andrew installs + signs up in the app, check within 60s:
--   --      select id, email, beta_start_date, beta_end_date from public.profiles
--   --      where email = 'fraggle@me.com';
--   --      -- Should show beta_start_date = now(), beta_end_date = now() + 3 months
--   --      select * from public.email_log
--   --      where recipient_email = 'fraggle@me.com' and template_id = 'welcome';
--   --      -- Should show status = 'sent'
-- ═══════════════════════════════════════════════════════════════════════
