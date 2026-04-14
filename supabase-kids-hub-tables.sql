-- Kids Hub Tables — run in Supabase SQL Editor
-- Project: rsvbzakyyrftezthlhtd (Sydney)

-- 1. Kids Jobs (chores/tasks assigned to children)
CREATE TABLE IF NOT EXISTS kids_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID NOT NULL,
  child_name TEXT NOT NULL,
  title TEXT NOT NULL,
  emoji TEXT DEFAULT '📋',
  points INTEGER NOT NULL DEFAULT 10,
  type TEXT NOT NULL DEFAULT 'oneoff', -- 'daily', 'weekly', 'oneoff'
  is_complete BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  source TEXT DEFAULT 'parent', -- 'parent', 'meal_planner', 'child_suggested'
  approved BOOLEAN DEFAULT TRUE, -- false if child-suggested and pending
  linked_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Kids Rewards (redeemable rewards set by parents)
CREATE TABLE IF NOT EXISTS kids_rewards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID NOT NULL,
  child_name TEXT NOT NULL,
  title TEXT NOT NULL,
  emoji TEXT DEFAULT '🎁',
  cost INTEGER NOT NULL DEFAULT 100,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Kids Points Log (all point changes — earn and spend)
CREATE TABLE IF NOT EXISTS kids_points_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID NOT NULL,
  child_name TEXT NOT NULL,
  points INTEGER NOT NULL, -- positive = earn, negative = spend
  reason TEXT,
  source TEXT DEFAULT 'job_complete', -- 'job_complete', 'reward_redeem', 'parent_bonus', 'parent_adjust'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Kids Pending Approvals (job suggestions + reward redemptions awaiting parent)
CREATE TABLE IF NOT EXISTS kids_pending_approvals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID NOT NULL,
  child_name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'job_suggestion', 'reward_redemption'
  title TEXT NOT NULL,
  emoji TEXT DEFAULT '📋',
  points INTEGER NOT NULL DEFAULT 0,
  note TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'declined'
  parent_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_kids_jobs_family ON kids_jobs(family_id);
CREATE INDEX IF NOT EXISTS idx_kids_jobs_child ON kids_jobs(family_id, child_name);
CREATE INDEX IF NOT EXISTS idx_kids_rewards_family ON kids_rewards(family_id);
CREATE INDEX IF NOT EXISTS idx_kids_points_family ON kids_points_log(family_id);
CREATE INDEX IF NOT EXISTS idx_kids_pending_family ON kids_pending_approvals(family_id);

-- RLS (using dummy family ID for dev)
ALTER TABLE kids_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE kids_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE kids_points_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE kids_pending_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kids_jobs_access" ON kids_jobs FOR ALL USING (family_id = '00000000-0000-0000-0000-000000000001'::uuid);
CREATE POLICY "kids_rewards_access" ON kids_rewards FOR ALL USING (family_id = '00000000-0000-0000-0000-000000000001'::uuid);
CREATE POLICY "kids_points_log_access" ON kids_points_log FOR ALL USING (family_id = '00000000-0000-0000-0000-000000000001'::uuid);
CREATE POLICY "kids_pending_access" ON kids_pending_approvals FOR ALL USING (family_id = '00000000-0000-0000-0000-000000000001'::uuid);

-- Seed some initial jobs for testing
INSERT INTO kids_jobs (family_id, child_name, title, emoji, points, type) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Poppy', 'Cook dinner Tuesday', '🍳', 50, 'oneoff'),
  ('00000000-0000-0000-0000-000000000001', 'Poppy', 'Vacuum lounge room', '🧹', 30, 'oneoff'),
  ('00000000-0000-0000-0000-000000000001', 'Poppy', 'Walk the dog', '🐕', 20, 'daily'),
  ('00000000-0000-0000-0000-000000000001', 'Poppy', 'Iron school shirts', '👕', 25, 'weekly'),
  ('00000000-0000-0000-0000-000000000001', 'Gab', 'Set the table', '🍽️', 15, 'daily'),
  ('00000000-0000-0000-0000-000000000001', 'Gab', 'Shower before 8pm', '🚿', 10, 'daily'),
  ('00000000-0000-0000-0000-000000000001', 'Gab', 'Take bins out', '♻️', 20, 'weekly'),
  ('00000000-0000-0000-0000-000000000001', 'Gab', 'Put washing away', '🧺', 15, 'oneoff'),
  ('00000000-0000-0000-0000-000000000001', 'Duke', 'Make my bed', '🛏️', 10, 'daily'),
  ('00000000-0000-0000-0000-000000000001', 'Duke', 'Feed the dog', '🐕', 10, 'daily'),
  ('00000000-0000-0000-0000-000000000001', 'Duke', 'Pack school bag', '🧦', 10, 'daily'),
  ('00000000-0000-0000-0000-000000000001', 'Duke', 'Tidy my room', '🧹', 25, 'oneoff');

-- Seed rewards
INSERT INTO kids_rewards (family_id, child_name, title, emoji, cost) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Poppy', 'Extra Nintendo hour', '🎮', 150),
  ('00000000-0000-0000-0000-000000000001', 'Poppy', 'Sleepover party', '🎉', 400),
  ('00000000-0000-0000-0000-000000000001', 'Poppy', '$50 spending money', '💰', 1000),
  ('00000000-0000-0000-0000-000000000001', 'Gab', 'Extra Nintendo hour', '🎮', 150),
  ('00000000-0000-0000-0000-000000000001', 'Gab', 'Choose dinner tonight', '🍕', 50),
  ('00000000-0000-0000-0000-000000000001', 'Gab', 'Lego set', '🧱', 500),
  ('00000000-0000-0000-0000-000000000001', 'Duke', 'Choose dinner tonight', '🍕', 50),
  ('00000000-0000-0000-0000-000000000001', 'Duke', 'Stay up 30 mins late', '🌙', 75),
  ('00000000-0000-0000-0000-000000000001', 'Duke', 'Lego set', '🧱', 500);

-- Seed some starting points
INSERT INTO kids_points_log (family_id, child_name, points, reason, source) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Poppy', 340, 'Starting balance', 'parent_bonus'),
  ('00000000-0000-0000-0000-000000000001', 'Gab', 185, 'Starting balance', 'parent_bonus'),
  ('00000000-0000-0000-0000-000000000001', 'Duke', 90, 'Starting balance', 'parent_bonus');
