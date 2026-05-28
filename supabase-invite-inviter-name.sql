-- ════════════════════════════════════════════════════════════════════════
-- Zaeli — Session 23: store inviter's display name on invite_tokens
-- Run AFTER supabase-invites-tour.sql + supabase-invite-signup.sql
-- ════════════════════════════════════════════════════════════════════════
--
-- Why: the receiver flow (/invite/[token]) shows "<Inviter> already set up
-- your family". Previously hardcoded to "Rich". Now that any adult can send
-- invites, the receiver must see the ACTUAL inviter's name. We denormalise
-- the inviter's first name onto the invite row at creation time so the
-- anon-callable get_invite_by_token RPC can return it without a join to
-- profiles (which the receiver can't read pre-auth anyway).
--
-- Idempotent — safe to re-run.

ALTER TABLE public.invite_tokens
  ADD COLUMN IF NOT EXISTS inviter_name text;

-- Update the lookup RPC to include inviter_name in its jsonb payload.
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
    'inviter_name',      inviter_name,
    'created_at',        created_at,
    'accepted_at',       accepted_at,
    'revoked_at',        revoked_at
  )
  FROM public.invite_tokens
  WHERE token = p_token
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.get_invite_by_token(text) TO anon, authenticated;

-- Verify
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'invite_tokens' AND column_name = 'inviter_name';
