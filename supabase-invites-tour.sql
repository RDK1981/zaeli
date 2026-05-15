-- ════════════════════════════════════════════════════════════════════════
-- Zaeli — Phase 2b: invite_tokens table + tour_state column on profiles
-- Run AFTER supabase-auth-tables.sql + supabase-data-rls.sql
-- ════════════════════════════════════════════════════════════════════════
--
-- What this does:
--   1. Creates public.invite_tokens — short-code-keyed invite records
--      with family RLS (inviters only see their own family's invites)
--   2. SECURITY DEFINER RPCs for anonymous receiver access:
--        - get_invite_by_token(token)  → returns row OR null
--        - accept_invite(token)        → marks accepted + records timestamp
--        - revoke_invite(token)        → marks revoked (inviter only)
--      Receiver lookups go via RPC because /invite/[token] runs without
--      a session yet — RLS would otherwise hide every row.
--   3. Adds profiles.tour_state jsonb — single source of truth for the
--      11-stop tour state. Survives reinstall + cross-device.
--
-- Idempotent — safe to re-run.

-- ────────────────────────────────────────────────────────────────────────
-- 1. invite_tokens table
-- ────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.invite_tokens (
  token             text PRIMARY KEY,           -- 6-char short code
  family_id         uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  inviter_user_id   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  role              text NOT NULL CHECK (role IN ('adult', 'kid')),
  name              text NOT NULL,
  phone             text,
  status            text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'accepted', 'revoked')),
  surfaced_heads_up boolean NOT NULL DEFAULT false,
  accepted_user_id  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  accepted_at       timestamptz,
  revoked_at        timestamptz
);

ALTER TABLE public.invite_tokens ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.invite_tokens ADD COLUMN IF NOT EXISTS surfaced_heads_up boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_invite_tokens_family ON public.invite_tokens(family_id);
CREATE INDEX IF NOT EXISTS idx_invite_tokens_status ON public.invite_tokens(status);

-- ────────────────────────────────────────────────────────────────────────
-- 2. RLS on invite_tokens — inviter-side family scoping
-- ────────────────────────────────────────────────────────────────────────
ALTER TABLE public.invite_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invite_tokens_select_family" ON public.invite_tokens;
CREATE POLICY "invite_tokens_select_family" ON public.invite_tokens
  FOR SELECT TO authenticated
  USING (family_id = public.current_family_id());

DROP POLICY IF EXISTS "invite_tokens_insert_family" ON public.invite_tokens;
CREATE POLICY "invite_tokens_insert_family" ON public.invite_tokens
  FOR INSERT TO authenticated
  WITH CHECK (family_id = public.current_family_id());

DROP POLICY IF EXISTS "invite_tokens_update_family" ON public.invite_tokens;
CREATE POLICY "invite_tokens_update_family" ON public.invite_tokens
  FOR UPDATE TO authenticated
  USING (family_id = public.current_family_id())
  WITH CHECK (family_id = public.current_family_id());

DROP POLICY IF EXISTS "invite_tokens_delete_family" ON public.invite_tokens;
CREATE POLICY "invite_tokens_delete_family" ON public.invite_tokens
  FOR DELETE TO authenticated
  USING (family_id = public.current_family_id());

-- ────────────────────────────────────────────────────────────────────────
-- 3. SECURITY DEFINER RPCs for receiver flow (callable by anon)
-- ────────────────────────────────────────────────────────────────────────

-- Lookup by token. Returns the row as jsonb (or NULL) so anon clients
-- can read it without RLS visibility. The token IS the secret — same
-- security model as Stripe idempotency keys / password reset links.
CREATE OR REPLACE FUNCTION public.get_invite_by_token(p_token text)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT jsonb_build_object(
    'token',             token,
    'family_id',         family_id,
    'role',              role,
    'name',              name,
    'phone',             phone,
    'status',            status,
    'surfaced_heads_up', surfaced_heads_up,
    'created_at',        created_at,
    'accepted_at',       accepted_at,
    'revoked_at',        revoked_at
  )
  FROM public.invite_tokens
  WHERE token = p_token
  LIMIT 1
$$;

-- Mark an invite accepted. Called by receiver after they finish onboarding.
-- p_user_id is optional — Phase 2b receivers may not yet have an auth user
-- (real-auth wiring lands in Phase 2d). Passes NULL safely.
CREATE OR REPLACE FUNCTION public.accept_invite(p_token text, p_user_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite public.invite_tokens%ROWTYPE;
BEGIN
  SELECT * INTO v_invite FROM public.invite_tokens WHERE token = p_token LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invite not found: %', p_token;
  END IF;
  IF v_invite.status = 'revoked' THEN
    RAISE EXCEPTION 'Invite has been revoked';
  END IF;

  UPDATE public.invite_tokens
  SET status            = 'accepted',
      surfaced_heads_up = false,           -- chat will resurface + flip to true
      accepted_user_id  = COALESCE(p_user_id, accepted_user_id),
      accepted_at       = now()
  WHERE token = p_token
  RETURNING * INTO v_invite;

  RETURN jsonb_build_object(
    'token',       v_invite.token,
    'family_id',   v_invite.family_id,
    'role',        v_invite.role,
    'name',        v_invite.name,
    'status',      v_invite.status,
    'accepted_at', v_invite.accepted_at
  );
END;
$$;

-- Receiver-friendly explicit grants. RLS still applies for the table; the
-- RPC bypasses it via SECURITY DEFINER but only returns the single token row.
GRANT EXECUTE ON FUNCTION public.get_invite_by_token(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.accept_invite(text, uuid) TO anon, authenticated;

-- ────────────────────────────────────────────────────────────────────────
-- 4. profiles.tour_state — JSONB for tour state
-- ────────────────────────────────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tour_state jsonb;

-- ────────────────────────────────────────────────────────────────────────
-- 5. Verify
-- ────────────────────────────────────────────────────────────────────────
SELECT polname FROM pg_policy WHERE polrelid = 'public.invite_tokens'::regclass ORDER BY polname;

SELECT proname FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND proname IN ('get_invite_by_token', 'accept_invite')
ORDER BY proname;

SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'tour_state';
