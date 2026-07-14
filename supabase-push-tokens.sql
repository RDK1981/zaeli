-- ═══════════════════════════════════════════════════════════════════════════
-- Session 29 — Family push notifications infrastructure
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Adds `expo_push_token` column to profiles for the "Notify family" feature.
-- Each device registers its Expo push token on sign-in (see lib/notifications.ts
-- `registerPushToken`). The `family-notify` Edge Function reads tokens for
-- recipient user_ids and POSTs to https://exp.host/--/api/v2/push/send.
--
-- Token characteristics:
--   - Format: ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]
--   - Length: ~50-70 chars
--   - Can rotate (device wipe, TestFlight update sometimes issues new token)
--   - Nullable — a profile without a token (e.g. Anna signed up but hasn't
--     opened the app on the new build yet) simply can't receive pushes.
--
-- RLS: profiles is already family-scoped via current_family_id() (Session 21).
-- The token is only readable by the same family (and the token owner). The
-- Edge Function uses the JWT to verify the caller shares a family with each
-- requested recipient before it looks up their token.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS expo_push_token TEXT;

-- Partial index for the common "who in this family can receive pushes?" query.
-- Excludes NULL tokens so the index only tracks profiles that are actually
-- reachable — smaller and faster than a plain btree.
CREATE INDEX IF NOT EXISTS profiles_expo_push_token_present_idx
  ON public.profiles (family_id)
  WHERE expo_push_token IS NOT NULL;

COMMENT ON COLUMN public.profiles.expo_push_token IS
  'Expo push token registered on sign-in. NULL means device has not registered '
  'yet (fresh install, permission denied, or logged in on a device without '
  'notification support). The family-notify Edge Function skips NULL tokens '
  'silently — the caller sees them in the "failed" list.';
