-- ════════════════════════════════════════════════════════════════════════
-- Zaeli — Session 23: remap legacy event assignee IDs ('1'-'5') → real UUIDs
-- ════════════════════════════════════════════════════════════════════════
--
-- Before the family-roster migration, the calendar wrote assignees as the
-- hardcoded ids Anna=1, Rich=2, Poppy=3, Gab=4, Duke=5. The app now uses the
-- real family_members UUIDs everywhere. This one-time remap converts any
-- legacy ids stored on existing events to the real UUIDs so those events'
-- assignee avatars render. Values that are already UUIDs pass through
-- untouched.
--
-- UUIDs are the current family_members rows for family 51dff810-…:
--   Anna    4fbd7ef0-5c82-4f8a-8ee6-fb8cb77792ae
--   Richard b000de3c-d91d-4e49-9171-fc40552b03c2
--   Poppy   81b7d721-5904-4d56-b28b-26d3aae51954
--   Gab     d0d5fb7a-0f39-419f-a08f-065c171e55d3
--   Duke    a3c867a1-60b4-42ba-8352-7c79ebfc9b3b
--
-- RLS-safe (disable → update → enable). Idempotent — re-running is a no-op
-- once ids are already UUIDs.

ALTER TABLE public.events DISABLE ROW LEVEL SECURITY;

UPDATE public.events SET assignees = (
  SELECT jsonb_agg(
    CASE elem #>> '{}'
      WHEN '1' THEN to_jsonb('4fbd7ef0-5c82-4f8a-8ee6-fb8cb77792ae'::text)
      WHEN '2' THEN to_jsonb('b000de3c-d91d-4e49-9171-fc40552b03c2'::text)
      WHEN '3' THEN to_jsonb('81b7d721-5904-4d56-b28b-26d3aae51954'::text)
      WHEN '4' THEN to_jsonb('d0d5fb7a-0f39-419f-a08f-065c171e55d3'::text)
      WHEN '5' THEN to_jsonb('a3c867a1-60b4-42ba-8352-7c79ebfc9b3b'::text)
      ELSE elem
    END
  )
  FROM jsonb_array_elements(assignees) elem
)
WHERE family_id = '51dff810-699e-4583-997d-8234b0dd7144'
  AND assignees IS NOT NULL
  AND jsonb_typeof(assignees) = 'array'
  AND jsonb_array_length(assignees) > 0;

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Verify — show events that now have assignees
SELECT id, title, assignees FROM public.events
WHERE family_id = '51dff810-699e-4583-997d-8234b0dd7144'
  AND assignees IS NOT NULL
  AND jsonb_typeof(assignees) = 'array'
  AND jsonb_array_length(assignees) > 0
LIMIT 20;
