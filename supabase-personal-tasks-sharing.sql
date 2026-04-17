-- Personal Tasks — add sharing columns for "On the Radar" dashboard card
-- Run this in Supabase SQL Editor

ALTER TABLE personal_tasks
  ADD COLUMN IF NOT EXISTS is_shared boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS member_name text;

-- Backfill existing rows as Rich's tasks (adjust if your data differs)
UPDATE personal_tasks
SET member_name = 'Rich'
WHERE member_name IS NULL;

-- Index for fast "tasks due in next 7 days for Rich or shared" lookup
CREATE INDEX IF NOT EXISTS idx_personal_tasks_member
  ON personal_tasks (family_id, member_name, is_shared, due_date);
