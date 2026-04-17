-- Kids Trivia History — tracks every AI-generated trivia question asked per child
-- Used to prevent question repetition across sessions
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS kids_trivia_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id uuid NOT NULL,
  child_name text NOT NULL,
  question text NOT NULL,
  correct_answer text NOT NULL,
  was_correct boolean,
  tier text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Index for fast lookup of recent questions per child
CREATE INDEX IF NOT EXISTS idx_trivia_history_child
  ON kids_trivia_history (family_id, child_name, created_at DESC);

-- RLS
ALTER TABLE kids_trivia_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for now" ON kids_trivia_history
  FOR ALL USING (true) WITH CHECK (true);
