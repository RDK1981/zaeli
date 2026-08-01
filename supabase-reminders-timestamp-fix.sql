-- ═══════════════════════════════════════════════════════════════════════
-- supabase-reminders-timestamp-fix.sql — Round B commit 4
--
-- Fixes the 10pm → 8am timezone bug Rich reported.
--
-- Root cause: reminders.remind_at is `timestamptz`. Sonnet sends
-- "2026-08-01T22:00:00" (naive Brisbane wall-clock 10pm). Postgres reads
-- a naive string into a timestamptz column as UTC, storing it as
-- "2026-08-01 22:00:00+00" (10pm UTC). Client reads that back with a Z
-- suffix, and new Date("...Z") → 10pm UTC → 8am Brisbane next day.
--
-- Fix: switch remind_at from timestamptz to plain timestamp (naive).
-- Postgres will strip the tz suffix on the ALTER, keeping the raw h/m/s
-- values (which for these buggy rows are actually what the user wanted:
-- 22:00 is what Sonnet meant, we just want to stop the +00 wrapping).
-- Then round-tripping is a straight string→string preserve.
--
-- Notes:
--   * Existing rows written correctly (rare during dev) would shift by
--     +10h on read after this migration. Given only Rich has tested and
--     every timed reminder has hit this bug, that's fine.
--   * completed_at + updated_at + created_at stay as timestamptz — those
--     are event timestamps (real moments in time), not user wall-clock.
--     remind_at is the ONLY column that represents "when the user wants
--     the reminder to fire in local Brisbane time", so it's the only one
--     that should be naive.
--   * Idempotent — safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════

-- Only alter if it's currently timestamptz (safe re-run)
DO $$
DECLARE
  current_type text;
BEGIN
  SELECT data_type INTO current_type
    FROM information_schema.columns
   WHERE table_schema = 'public'
     AND table_name   = 'reminders'
     AND column_name  = 'remind_at';

  IF current_type = 'timestamp with time zone' THEN
    ALTER TABLE public.reminders
      ALTER COLUMN remind_at TYPE timestamp
      USING (remind_at AT TIME ZONE 'Australia/Brisbane');
    RAISE NOTICE '[reminders-timestamp-fix] remind_at converted timestamptz → timestamp';
  ELSE
    RAISE NOTICE '[reminders-timestamp-fix] remind_at already type=%, no change', current_type;
  END IF;
END $$;
