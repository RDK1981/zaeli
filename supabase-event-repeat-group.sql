-- ════════════════════════════════════════════════════════════════════════
-- Zaeli — Session 23: repeat_group_id on events (recurring series grouping)
-- ════════════════════════════════════════════════════════════════════════
--
-- Recurring events are stored as concrete instances (the events table already
-- has repeat_rule). repeat_group_id ties all instances of one series together
-- with a shared UUID, so we can precisely:
--   - update the whole series ("add me to all of Gab's soccer")
--   - delete the whole series
--   - detect a series' end date (max(date) per group) to offer an extension
--
-- Nullable — one-off events leave it null. No new RLS (events already scoped).
-- Idempotent.

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS repeat_group_id uuid;

CREATE INDEX IF NOT EXISTS idx_events_repeat_group ON public.events(repeat_group_id);

-- Verify
SELECT column_name, data_type FROM information_schema.columns
WHERE table_schema='public' AND table_name='events' AND column_name='repeat_group_id';
