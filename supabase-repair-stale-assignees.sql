-- ═══════════════════════════════════════════════════════════════════════
-- supabase-repair-stale-assignees.sql  ·  Build 54 (Session 36)
--
-- Historical repair for Zaeli events whose `assignees` array references
-- family_members UUIDs that no longer exist in the family (or never did).
--
-- ROOT CAUSE (see Session 35):
--   `ensureOwnMembership()` name-match guard leaves the OLD (mismatched)
--   family_members.id in place when auth.uid doesn't match. Historical
--   events keep pointing at that old id. `roster.find(m => m.id === legacy)`
--   never resolves, so avatars render as "?".
--
-- Build 54 also adds a client-side fallback (dashboard.tsx no longer
-- shows "?" — instead shows a silent placeholder circle). This SQL
-- goes one step further and REPAIRS the underlying data so avatars
-- render fully-tinted again, not just placeholder circles.
--
-- ═══════════════════════════════════════════════════════════════════════
--
-- STEP 1 — DRY RUN (run this first, review output before applying)
--
-- Per-family count of events with stale assignee UUIDs + a sample of 5
-- events per family. If the count is high (e.g. 500+), check the samples
-- first — the fix drops the stale UUIDs from the array (leaving valid
-- assignees intact) but events with only-stale assignees end up unassigned.
--
-- ═══════════════════════════════════════════════════════════════════════

-- 1a. Count per family (should be small — a handful of accounts affected)
SELECT
  e.family_id,
  COUNT(*) AS affected_events
FROM public.events e
WHERE e.source IS NULL  -- Zaeli-native only, never touch iCal-imported
  AND e.assignees IS NOT NULL
  AND jsonb_typeof(e.assignees) = 'array'
  AND jsonb_array_length(e.assignees) > 0
  AND EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(e.assignees) AS elem(id)
    WHERE elem.id NOT IN (
      SELECT fm.id::text
      FROM public.family_members fm
      WHERE fm.family_id = e.family_id
    )
  )
GROUP BY e.family_id
ORDER BY affected_events DESC;

-- 1b. Sample 20 events across all affected families — verify these are
-- historical noise (old titles, not events the user needs right now)
SELECT
  e.family_id,
  e.title,
  e.date,
  e.assignees AS current_assignees,
  ARRAY(
    SELECT jsonb_array_elements_text(e.assignees)
    EXCEPT
    SELECT fm.id::text
    FROM public.family_members fm
    WHERE fm.family_id = e.family_id
  ) AS stale_ids_to_drop,
  ARRAY(
    SELECT jsonb_array_elements_text(e.assignees)
    INTERSECT
    SELECT fm.id::text
    FROM public.family_members fm
    WHERE fm.family_id = e.family_id
  ) AS valid_ids_to_keep
FROM public.events e
WHERE e.source IS NULL
  AND e.assignees IS NOT NULL
  AND jsonb_typeof(e.assignees) = 'array'
  AND jsonb_array_length(e.assignees) > 0
  AND EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(e.assignees) AS elem(id)
    WHERE elem.id NOT IN (
      SELECT fm.id::text
      FROM public.family_members fm
      WHERE fm.family_id = e.family_id
    )
  )
ORDER BY e.date DESC
LIMIT 20;

-- ═══════════════════════════════════════════════════════════════════════
--
-- STEP 2 — APPLY (uncomment the block below after reviewing dry-run output)
--
-- What it does:
--   - Rewrites each affected event's assignees array to keep only the
--     UUIDs that match real family_members rows in that family.
--   - Events whose ONLY assignee was stale end up with `[]` (unassigned).
--     Those will show the family default (avatar placeholder circle in
--     Build 54's dashboard fix). Owner can re-assign in the calendar sheet.
--   - Never touches iCal-imported events (source='apple-ical').
--   - Safe to run multiple times — idempotent, no-op on already-clean rows.
--
-- Uncomment the UPDATE below, then re-run 1a to verify the count drops to 0.
--
-- ═══════════════════════════════════════════════════════════════════════

/*
UPDATE public.events e
SET assignees = COALESCE(
  (
    SELECT jsonb_agg(elem.id)
    FROM jsonb_array_elements_text(e.assignees) AS elem(id)
    WHERE elem.id IN (
      SELECT fm.id::text
      FROM public.family_members fm
      WHERE fm.family_id = e.family_id
    )
  ),
  '[]'::jsonb
)
WHERE e.source IS NULL
  AND e.assignees IS NOT NULL
  AND jsonb_typeof(e.assignees) = 'array'
  AND jsonb_array_length(e.assignees) > 0
  AND EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(e.assignees) AS elem(id)
    WHERE elem.id NOT IN (
      SELECT fm.id::text
      FROM public.family_members fm
      WHERE fm.family_id = e.family_id
    )
  );
*/

-- Post-apply verification: this should return 0 rows.
-- SELECT COUNT(*) FROM public.events e
-- WHERE e.source IS NULL
--   AND e.assignees IS NOT NULL
--   AND jsonb_array_length(e.assignees) > 0
--   AND EXISTS (
--     SELECT 1 FROM jsonb_array_elements_text(e.assignees) AS elem(id)
--     WHERE elem.id NOT IN (SELECT fm.id::text FROM public.family_members fm WHERE fm.family_id = e.family_id)
--   );
