-- ════════════════════════════════════════════════════════════════════════
-- Zaeli — Phase 3b: Stripe subscription fields on profiles
-- ════════════════════════════════════════════════════════════════════════
--
-- Adds the columns the app needs to display subscription state + open the
-- Stripe customer portal. Server-side webhooks (Supabase Edge Function or
-- similar) write to these columns when subscription state changes —
-- see STRIPE-SETUP.md for the endpoint spec.
--
-- Nullable so existing rows + free-trial users are unaffected.
-- Idempotent — safe to re-run.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_customer_id     text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_status    text;
  -- 'trialing' | 'active' | 'past_due' | 'cancelled' | 'incomplete' | NULL=free
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_plan      text;
  -- 'family' | 'family_tutor_1' | 'family_tutor_2' | ... | NULL
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_renews_at timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trial_ends_at          timestamptz;

CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer ON public.profiles(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

-- Verify
SELECT column_name, data_type FROM information_schema.columns
WHERE table_schema='public' AND table_name='profiles'
  AND column_name IN ('stripe_customer_id','subscription_status','subscription_plan','subscription_renews_at','trial_ends_at')
ORDER BY column_name;
