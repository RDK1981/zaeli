-- ════════════════════════════════════════════════════════════════════════
-- Zaeli — Phase 2d: real auth at invite acceptance
-- Run AFTER all prior phases (auth-tables, data-rls, invites-tour, user-prefs)
-- ════════════════════════════════════════════════════════════════════════
--
-- What this does:
--   Updates handle_new_user() trigger so it branches on whether the
--   sign-up included an invite_token in raw_user_meta_data:
--
--   • No invite_token (the original owner flow):
--       INSERT a fresh families row + matching owner profile.
--
--   • With invite_token (the NEW invitee flow):
--       Validate the token (must exist, not revoked, not already accepted).
--       Create a profile linked to the INVITE'S family_id (not a new one).
--       Use the invite.role as the new profile.kind ('adult' | 'kid').
--       Mark the invite_tokens row accepted + set accepted_user_id.
--
-- If the invite_token is bad (missing / revoked / already accepted) the
-- trigger raises an exception. Postgres rolls back the auth.users INSERT,
-- so we don't end up with an orphaned auth user.
--
-- Idempotent — safe to re-run.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_invite_token TEXT;
  v_invite       public.invite_tokens%ROWTYPE;
  v_family_id    UUID;
  v_kind         TEXT;
  v_name         TEXT;
  v_family_name  TEXT;
BEGIN
  v_invite_token := NULLIF(NEW.raw_user_meta_data ->> 'invite_token', '');
  v_name         := COALESCE(NEW.raw_user_meta_data ->> 'name', 'New user');

  IF v_invite_token IS NOT NULL THEN
    -- ── Invitee flow ──
    SELECT * INTO v_invite FROM public.invite_tokens WHERE token = v_invite_token;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Invalid invite token: %', v_invite_token;
    END IF;
    IF v_invite.status = 'revoked' THEN
      RAISE EXCEPTION 'Invite has been revoked';
    END IF;
    IF v_invite.status = 'accepted' AND v_invite.accepted_user_id IS NOT NULL THEN
      RAISE EXCEPTION 'Invite has already been accepted';
    END IF;

    v_family_id := v_invite.family_id;
    v_kind      := v_invite.role;  -- 'adult' or 'kid'

    -- Mark invite accepted in the same transaction
    UPDATE public.invite_tokens
    SET status            = 'accepted',
        surfaced_heads_up = false,
        accepted_user_id  = NEW.id,
        accepted_at       = now()
    WHERE token = v_invite_token;
  ELSE
    -- ── Owner flow (original) ──
    v_family_name := COALESCE(NEW.raw_user_meta_data ->> 'family_name', v_name || '''s family');
    INSERT INTO public.families(name) VALUES (v_family_name) RETURNING id INTO v_family_id;
    v_kind := 'owner';
  END IF;

  -- Create profile (common path for both flows)
  INSERT INTO public.profiles(id, family_id, kind, name, email)
  VALUES (NEW.id, v_family_id, v_kind, v_name, NEW.email);

  RETURN NEW;
END;
$$;

-- Trigger is already attached from Phase 1 (DROP TRIGGER IF EXISTS in
-- supabase-auth-tables.sql then CREATE TRIGGER on auth.users INSERT).
-- No re-attachment needed.

-- ── Verify ────────────────────────────────────────────────────────────────
-- Check trigger function exists and has correct search_path
SELECT proname, prosecdef AS is_security_definer,
       array_to_string(proconfig, ', ') AS settings
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND proname = 'handle_new_user';
