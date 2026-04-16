-- Zaeli Tutor — Supabase Tables
-- Run in Supabase SQL Editor (ap-southeast-2)
-- ══════════════════════════════════════════════════

-- ── tutor_sessions ──
-- One row per session. Tracks child, pillar, subject, topic,
-- difficulty band, duration, and completion status.
CREATE TABLE IF NOT EXISTS tutor_sessions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id     uuid NOT NULL,
  child_name    text NOT NULL,
  pillar        text NOT NULL,          -- homework | practice | read-aloud | write-review | comprehension | money-life
  subject       text,                   -- Maths | English | Science | HASS | null
  topic         text,                   -- specific topic within subject
  difficulty_band text DEFAULT 'core',  -- foundation | core | extension
  status        text DEFAULT 'active',  -- active | completed | abandoned
  duration_seconds integer DEFAULT 0,
  question_count integer DEFAULT 0,
  hints_used    integer DEFAULT 0,
  correct_count integer DEFAULT 0,
  created_at    timestamptz DEFAULT now(),
  completed_at  timestamptz
);

-- Index for fast child lookups
CREATE INDEX IF NOT EXISTS idx_tutor_sessions_family_child
  ON tutor_sessions (family_id, child_name, created_at DESC);

-- ── tutor_messages ──
-- Full conversation transcript per session.
-- Used for parent review and session replay.
CREATE TABLE IF NOT EXISTS tutor_messages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  uuid NOT NULL REFERENCES tutor_sessions(id) ON DELETE CASCADE,
  role        text NOT NULL,            -- zaeli | child
  content     text NOT NULL,
  message_type text DEFAULT 'text',     -- text | mc_question | mc_answer | hint | technique | photo | voice
  hint_level  integer,                  -- 1-3 if this is a hint response
  created_at  timestamptz DEFAULT now()
);

-- Index for session transcript loading
CREATE INDEX IF NOT EXISTS idx_tutor_messages_session
  ON tutor_messages (session_id, created_at ASC);

-- ── tutor_progress ──
-- Aggregated per-child per-subject progress snapshots.
-- Updated at session completion.
CREATE TABLE IF NOT EXISTS tutor_progress (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id       uuid NOT NULL,
  child_name      text NOT NULL,
  subject         text NOT NULL,
  difficulty_band text DEFAULT 'core',    -- current band for this subject
  total_sessions  integer DEFAULT 0,
  total_minutes   integer DEFAULT 0,
  status_label    text DEFAULT 'tracking well',  -- needs work | tracking well | excelling
  notes           text,                   -- Zaeli-generated summary
  updated_at      timestamptz DEFAULT now(),
  UNIQUE (family_id, child_name, subject)
);

-- ── tutor_money_levels ──
-- Per-child Money & Life level progression.
CREATE TABLE IF NOT EXISTS tutor_money_levels (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id   uuid NOT NULL,
  child_name  text NOT NULL,
  level       integer DEFAULT 1,          -- 1=Earning, 2=Saving, 3=Investing, 4=Big Life
  is_complete boolean DEFAULT false,
  updated_at  timestamptz DEFAULT now(),
  UNIQUE (family_id, child_name)
);

-- ── Enable RLS ──
ALTER TABLE tutor_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tutor_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE tutor_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE tutor_money_levels ENABLE ROW LEVEL SECURITY;

-- ── RLS policies (permissive for dev — tighten before launch) ──
CREATE POLICY "Allow all tutor_sessions" ON tutor_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all tutor_messages" ON tutor_messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all tutor_progress" ON tutor_progress FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all tutor_money_levels" ON tutor_money_levels FOR ALL USING (true) WITH CHECK (true);
