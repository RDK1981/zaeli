-- ═══════════════════════════════════════════════════════════════════════
-- supabase-reminders-visibility.sql — Round B (post-Round-A)
--
-- Adds `visibility` tier column to reminders so we can distinguish
-- Personal (only creator sees + only creator notified) vs Shared
-- (family sees + only creator notified, but Notify chip can fire push
-- to whole family).
--
-- Default: 'personal' — matches the new UX where Personal is the
-- default and Shared is a one-tap conversion.
--
-- IMPORTANT: existing reminders (pre-Round-B) were all family-shared by
-- default. We backfill them as 'shared' so nothing suddenly hides from
-- Anna. Only NEW reminders default to personal.
--
-- Idempotent. Safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════

ALTER TABLE public.reminders
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'personal';

-- Constrain valid values
DO $$
BEGIN
  ALTER TABLE public.reminders
    ADD CONSTRAINT reminders_visibility_check
    CHECK (visibility IN ('personal', 'shared'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Backfill pre-Round-B rows as 'shared' — they were all family-visible
-- by default under the old schema, don't retroactively hide them.
UPDATE public.reminders
   SET visibility = 'shared'
 WHERE visibility = 'personal'
   AND created_at < now() - interval '1 day';

-- Index for the load-time filter (created_by = me OR visibility = 'shared')
CREATE INDEX IF NOT EXISTS reminders_visibility_idx
  ON public.reminders(family_id, visibility);

-- ── RLS refinement — personal items only visible to creator ───────────
-- The current SELECT policy is family-scoped (anyone in family can read).
-- Tighten so Personal items are only readable by their creator; Shared
-- items still readable by the whole family.
DO $$
BEGIN
  DROP POLICY IF EXISTS "reminders_select" ON public.reminders;
  CREATE POLICY "reminders_select" ON public.reminders
    FOR SELECT USING (
      family_id = public.current_family_id()
      AND (visibility = 'shared' OR created_by = auth.uid())
    );
END $$;
