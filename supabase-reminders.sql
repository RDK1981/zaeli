-- ═══════════════════════════════════════════════════════════════════════
-- supabase-reminders.sql — Session 32 v2 Phase 05
--
-- Reminders subsystem — the 4th pillar of Zaeli v2 (Calendar/Shopping/
-- Budget/Reminders).
--
-- Design:
--   * family-shared visibility, creator-only local notifications
--   * timed / date-only / undated (three shapes)
--   * recurring supported (same 12-month generated-instances pattern as
--     calendar events — repeat_group_id ties a series together)
--   * created_by = auth.uid at insert time so we know who to notify
--
-- RLS: Session 21 pattern — family_id = public.current_family_id()
--
-- ⚠️ NOTE: An old `reminders` table exists in some projects from the
--    pre-Session-14 architecture. `CREATE TABLE IF NOT EXISTS` will
--    silently skip if a table with that name exists but has a different
--    shape — leaving new columns missing. Fix: create the base shell,
--    then ADD COLUMN IF NOT EXISTS for each field. Safe either way,
--    non-destructive to any existing rows.
--
-- Idempotent — safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════

-- Base shell (id + family_id + created_at only, guaranteed columns for
-- any existing legacy table). Everything else is added via ALTER.
CREATE TABLE IF NOT EXISTS public.reminders (
  id                uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id         uuid            NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  created_at        timestamptz     NOT NULL DEFAULT now()
);

-- Session 32 v2 columns (each guarded — works on legacy + fresh tables)
ALTER TABLE public.reminders ADD COLUMN IF NOT EXISTS created_by       uuid;
ALTER TABLE public.reminders ADD COLUMN IF NOT EXISTS title            text;
ALTER TABLE public.reminders ADD COLUMN IF NOT EXISTS notes            text;
ALTER TABLE public.reminders ADD COLUMN IF NOT EXISTS remind_at        timestamptz;
ALTER TABLE public.reminders ADD COLUMN IF NOT EXISTS remind_on        date;
ALTER TABLE public.reminders ADD COLUMN IF NOT EXISTS repeat_rule      text;
ALTER TABLE public.reminders ADD COLUMN IF NOT EXISTS repeat_group_id  uuid;
ALTER TABLE public.reminders ADD COLUMN IF NOT EXISTS status           text NOT NULL DEFAULT 'active';
ALTER TABLE public.reminders ADD COLUMN IF NOT EXISTS completed_at     timestamptz;
ALTER TABLE public.reminders ADD COLUMN IF NOT EXISTS notif_id         text;
ALTER TABLE public.reminders ADD COLUMN IF NOT EXISTS updated_at       timestamptz NOT NULL DEFAULT now();

-- Ensure `title` cannot be NULL going forward (backfill anything legacy first)
UPDATE public.reminders SET title = '(untitled)' WHERE title IS NULL;
DO $$
BEGIN
  ALTER TABLE public.reminders ALTER COLUMN title SET NOT NULL;
EXCEPTION WHEN OTHERS THEN
  -- Already NOT NULL, or column just added with matching data — fine
  NULL;
END $$;

-- FK on created_by (only if not already constrained)
DO $$
BEGIN
  ALTER TABLE public.reminders
    ADD CONSTRAINT reminders_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Indexes (all guarded, safe to re-run) ─────────────────────────────
CREATE INDEX IF NOT EXISTS reminders_family_id_idx     ON public.reminders(family_id);
CREATE INDEX IF NOT EXISTS reminders_family_status_idx ON public.reminders(family_id, status);
CREATE INDEX IF NOT EXISTS reminders_remind_at_idx     ON public.reminders(remind_at) WHERE remind_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS reminders_repeat_group_idx  ON public.reminders(repeat_group_id) WHERE repeat_group_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS reminders_created_by_idx    ON public.reminders(created_by);

-- ── RLS ────────────────────────────────────────────────────────────────
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS "reminders_select" ON public.reminders;
  DROP POLICY IF EXISTS "reminders_insert" ON public.reminders;
  DROP POLICY IF EXISTS "reminders_update" ON public.reminders;
  DROP POLICY IF EXISTS "reminders_delete" ON public.reminders;

  CREATE POLICY "reminders_select" ON public.reminders
    FOR SELECT USING (family_id = public.current_family_id());
  CREATE POLICY "reminders_insert" ON public.reminders
    FOR INSERT WITH CHECK (family_id = public.current_family_id());
  CREATE POLICY "reminders_update" ON public.reminders
    FOR UPDATE USING (family_id = public.current_family_id());
  CREATE POLICY "reminders_delete" ON public.reminders
    FOR DELETE USING (family_id = public.current_family_id());
END $$;
