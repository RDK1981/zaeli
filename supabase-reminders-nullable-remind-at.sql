-- ═══════════════════════════════════════════════════════════════════════
-- supabase-reminders-nullable-remind-at.sql — Round B commit 11
--
-- Drops the NOT NULL constraint from reminders.remind_at.
--
-- Root cause of Rich's "manual reminder add doesn't save" bug:
--   The reminders table pre-dated the v2 schema. The original creation
--   defined remind_at as NOT NULL. My supabase-reminders.sql migration
--   used ADD COLUMN IF NOT EXISTS which skipped altering the constraint
--   on the existing column. As a result, ANY reminder without a
--   remind_at value (date-only reminders that only set remind_on, or
--   undated to-dos that set neither) was rejected by Postgres with:
--
--     ERROR: null value in column "remind_at" of relation "reminders"
--            violates not-null constraint (errCode 23502)
--
--   Manual add from the Reminders sheet + tap Send always produced a
--   date-only reminder → this constraint fired → nothing landed.
--
-- The intent of the v2 schema is three shapes:
--   • Timed:    remind_at set, remind_on null      → push at instant
--   • Date-only: remind_at null, remind_on set     → shows on that day
--   • Undated:   both null                         → "someday" bucket
--
-- Drop the NOT NULL. Idempotent — safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════

ALTER TABLE public.reminders ALTER COLUMN remind_at DROP NOT NULL;

-- Sanity check the state
DO $$
DECLARE
  nullable text;
BEGIN
  SELECT is_nullable INTO nullable
    FROM information_schema.columns
   WHERE table_schema = 'public'
     AND table_name   = 'reminders'
     AND column_name  = 'remind_at';
  RAISE NOTICE '[reminders-nullable-fix] remind_at is_nullable = %', nullable;
END $$;
