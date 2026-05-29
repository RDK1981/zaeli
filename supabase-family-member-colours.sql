-- ════════════════════════════════════════════════════════════════════════
-- Zaeli — Session 23: fix family_members colours to the canonical palette
-- ════════════════════════════════════════════════════════════════════════
--
-- Every family_members row currently has colour = '#4A90D9' (the per-member
-- palette was never applied). The app's lib/family-roster.ts colorFor()
-- already falls back to the right colour by name even without this fix, but
-- this makes the DB the correct source of truth so future edits / new members
-- start from real values.
--
-- Canonical palette (CLAUDE.md): Rich #4D8BFF · Anna #FF7B6B · Poppy #A855F7
-- · Gab #22C55E · Duke #F59E0B.
--
-- RLS is enabled on family_members (Phase 2a). The SQL-editor role enforces
-- RLS on UPDATE, so we disable → update → re-enable to guarantee the rows
-- are actually touched (same pattern as the Phase 2a backfill).
--
-- Idempotent — safe to re-run.

ALTER TABLE public.family_members DISABLE ROW LEVEL SECURITY;

UPDATE public.family_members SET colour = '#FF7B6B'
  WHERE family_id = '51dff810-699e-4583-997d-8234b0dd7144' AND name = 'Anna';
UPDATE public.family_members SET colour = '#4D8BFF'
  WHERE family_id = '51dff810-699e-4583-997d-8234b0dd7144' AND name = 'Richard';
UPDATE public.family_members SET colour = '#A855F7'
  WHERE family_id = '51dff810-699e-4583-997d-8234b0dd7144' AND name = 'Poppy';
UPDATE public.family_members SET colour = '#22C55E'
  WHERE family_id = '51dff810-699e-4583-997d-8234b0dd7144' AND name = 'Gab';
UPDATE public.family_members SET colour = '#F59E0B'
  WHERE family_id = '51dff810-699e-4583-997d-8234b0dd7144' AND name = 'Duke';

ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;

-- Verify
SELECT name, colour, role, year_level FROM public.family_members
WHERE family_id = '51dff810-699e-4583-997d-8234b0dd7144'
ORDER BY created_at;
