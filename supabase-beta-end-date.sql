-- Beta program — comp accounts for test families.
--
-- Session 28 (10 July 2026). Test families get 3 months free without any
-- Stripe interaction. When beta_end_date > now(), lib/stripe.ts treats the
-- user as 'trialing' with plan 'beta', overriding subscription_status.
-- When beta_end_date passes, they get prompted to subscribe via Payment Link.
--
-- Idempotent — safe to re-run.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS beta_end_date timestamptz;

COMMENT ON COLUMN profiles.beta_end_date IS
  'End date of comp beta access for test families. NULL for non-beta users. '
  'Overrides subscription_status while in effect. Once passed, real subscription '
  'state (Stripe-driven) takes over.';
