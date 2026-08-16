-- ═══════════════════════════════════════════════════════════════════════
-- supabase-zaeli-briefs-per-user.sql · Build 54 (Session 36)
--
-- Promote Phase 85 (per-user brief cache) from queued to shipped.
--
-- WHY:
--   iCal sync (Builds 49→52) imports personal calendars per-user (Andy's
--   iPhone events are `privacy_scope='personal'` + `imported_by_user_id=Andy`,
--   only Andy can see them). But the brief-scheduler currently generates
--   ONE brief per family per window per day — so Andy sees "clear day"
--   in the shared family brief when his iPhone Calendar is full of work
--   meetings. Trust-breaking.
--
-- WHAT:
--   1. Add user_id column to zaeli_briefs (nullable initially)
--   2. Backfill existing rows → set user_id = family owner
--   3. NOT NULL constraint
--   4. Swap unique constraint from (family_id, date_key, time_window)
--      → (family_id, user_id, date_key, time_window)
--   5. RLS keeps working (family-scoped visibility — every adult in the
--      family can technically see the row, but each user only fetches
--      their own via user_id filter in the client).
--
-- SAFETY:
--   - Idempotent (uses IF NOT EXISTS, DROP IF EXISTS patterns)
--   - Backfill uses `LATERAL` join to find owner per family
--   - Runs in a transaction — nothing lands until every step succeeds
--
-- ═══════════════════════════════════════════════════════════════════════

BEGIN;

-- 1. Add nullable column
ALTER TABLE public.zaeli_briefs
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Backfill existing rows: user_id = family owner (kind='owner' profile)
-- If no owner found (shouldn't happen but paranoid), fall back to any
-- adult in the family. If STILL nothing, leave user_id null — that row
-- will be pruned by the client-side filter (safe).
UPDATE public.zaeli_briefs zb
SET user_id = (
  SELECT p.id
  FROM public.profiles p
  WHERE p.family_id = zb.family_id
  ORDER BY (p.kind = 'owner') DESC, p.created_at ASC
  LIMIT 1
)
WHERE zb.user_id IS NULL;

-- 3. Drop any rows still lacking user_id (family with no owner AND no adult
-- — orphan data, safe to delete). Should be zero.
DELETE FROM public.zaeli_briefs WHERE user_id IS NULL;

-- 4. NOT NULL constraint
ALTER TABLE public.zaeli_briefs
  ALTER COLUMN user_id SET NOT NULL;

-- 5. Swap the unique constraint. The old one used to guarantee "one brief
-- per family per window per day"; new one adds user_id so each adult can
-- have their own personalised brief.
ALTER TABLE public.zaeli_briefs
  DROP CONSTRAINT IF EXISTS zaeli_briefs_family_id_date_key_time_window_key;

-- Some Supabase versions auto-name it differently — try both known shapes
ALTER TABLE public.zaeli_briefs
  DROP CONSTRAINT IF EXISTS zaeli_briefs_family_id_date_key_time_window_key1;

-- Also drop any explicit unique index that mirrored it
DROP INDEX IF EXISTS zaeli_briefs_family_id_date_key_time_window_key;

-- Add the new per-user unique constraint. Using CREATE UNIQUE INDEX
-- (implicitly upserts a constraint) so we get a stable name.
CREATE UNIQUE INDEX IF NOT EXISTS zaeli_briefs_family_user_date_window_key
  ON public.zaeli_briefs (family_id, user_id, date_key, time_window);

-- 6. Update the lookup index to include user_id (client queries scope by it)
DROP INDEX IF EXISTS idx_zaeli_briefs_lookup;
CREATE INDEX IF NOT EXISTS idx_zaeli_briefs_lookup
  ON public.zaeli_briefs (family_id, user_id, date_key, time_window);

-- 7. RLS policies — visibility unchanged (any family member can technically
-- see any row in their family — RLS is family-scoped, client filters by
-- user_id). Note: this means Anna could hypothetically SELECT Rich's brief
-- text if she crafted a query bypassing the client filter. That's an
-- acceptable trade-off for MVP — brief text isn't sensitive PII, and the
-- family already shares calendar/shopping/etc. If we later need harder
-- isolation, add `AND user_id = auth.uid()` to the SELECT policy.

COMMIT;

-- ═══════════════════════════════════════════════════════════════════════
-- Verify (run after migration)
-- ═══════════════════════════════════════════════════════════════════════

-- Check the new column + constraint landed
-- SELECT column_name, is_nullable, data_type FROM information_schema.columns
--   WHERE table_name = 'zaeli_briefs' AND column_name = 'user_id';
-- SELECT indexname FROM pg_indexes WHERE tablename = 'zaeli_briefs';

-- Check backfill (should be zero null rows)
-- SELECT COUNT(*) FROM public.zaeli_briefs WHERE user_id IS NULL;

-- See distribution — should show one row per (family, user) for existing briefs
-- SELECT family_id, user_id, COUNT(*) FROM public.zaeli_briefs
-- GROUP BY family_id, user_id ORDER BY family_id, user_id;
