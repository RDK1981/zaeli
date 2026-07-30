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
-- Idempotent — safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.reminders (
  id                uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id         uuid            NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  created_by        uuid            NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title             text            NOT NULL,
  notes             text,

  -- Time shape:
  --   remind_at NOT NULL  → timed reminder (fires push notification at that instant)
  --   remind_at NULL + remind_on NOT NULL → date-only reminder (shows on that day, no push)
  --   both NULL → undated ("someday" reminder, always visible at bottom)
  remind_at         timestamptz,
  remind_on         date,

  -- Recurring (mirrors events.repeat_group_id pattern)
  repeat_rule       text,           -- 'none'|'daily'|'weekdays'|'weekly'|'fortnightly'|'monthly'
  repeat_group_id   uuid,           -- shared uuid across all instances of a series

  -- Lifecycle
  status            text            NOT NULL DEFAULT 'active',  -- 'active'|'done'|'cancelled'
  completed_at      timestamptz,

  -- Push tracking (so we can cancel scheduled push when reminder edited/deleted)
  notif_id          text,

  created_at        timestamptz     NOT NULL DEFAULT now(),
  updated_at        timestamptz     NOT NULL DEFAULT now()
);

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
