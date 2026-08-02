-- ═══════════════════════════════════════════════════════════════════════
-- supabase-reminders-visibility-enforce.sql — Round B commit 13
--
-- HARD-REDO of the reminders visibility RLS policy. Rich reported that
-- Anna is seeing his personal "take out the bins" reminder despite the
-- lock icon. Two possibilities:
--   (a) supabase-reminders-visibility.sql was never run
--   (b) it ran, but the DO-block silently no-op'd (RLS policy already
--       existed with the loose rule from supabase-reminders.sql — DROP
--       fired, then CREATE would have replaced it, but perhaps
--       transaction rolled back)
--
-- This migration is defensive: it FIRST verifies the visibility column
-- exists (fail loudly if not — means neither v1 nor v2 SQL ran), THEN
-- unconditionally drops the SELECT policy and creates the tight one.
-- Ends with a verification query that lists the actual policies on
-- reminders so Rich can eyeball that the tight rule landed.
--
-- Rule enforced: SELECT ok IF
--     family_id = current_family_id()
--   AND (visibility = 'shared' OR created_by = auth.uid())
--
-- Idempotent. Safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════

-- 0. Fail loudly if the visibility column isn't present (means the
--    first Round B migration never ran).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name   = 'reminders'
       AND column_name  = 'visibility'
  ) THEN
    RAISE EXCEPTION 'reminders.visibility column missing. Run supabase-reminders-visibility.sql FIRST.';
  END IF;
END $$;

-- 1. Drop + re-create the SELECT policy with the tight rule.
--    Wrapped in DO to guarantee order + surface any error.
DO $$
BEGIN
  DROP POLICY IF EXISTS "reminders_select" ON public.reminders;

  CREATE POLICY "reminders_select" ON public.reminders
    FOR SELECT USING (
      family_id = public.current_family_id()
      AND (visibility = 'shared' OR created_by = auth.uid())
    );

  RAISE NOTICE '[reminders-visibility-enforce] SELECT policy replaced with visibility-aware rule';
END $$;

-- 2. Verify — show the resulting SELECT policy definition. Rich should
--    eyeball that the "qual" column contains BOTH:
--       family_id = current_family_id()
--       (visibility = 'shared' OR created_by = auth.uid())
--    If only the family_id check is there, the policy didn't replace.
SELECT
  polname                                         AS policy_name,
  pg_catalog.pg_get_expr(polqual, polrelid)       AS using_clause
FROM pg_catalog.pg_policy
WHERE polrelid = 'public.reminders'::regclass
  AND polname  = 'reminders_select';
