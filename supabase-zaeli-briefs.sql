-- Zaeli Briefs — family-wide cache of proactive AI briefs (morning/midday/evening)
-- One row per family per date per time_window. Data signature used to detect stale briefs.

CREATE TABLE IF NOT EXISTS zaeli_briefs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id uuid NOT NULL,
  date_key text NOT NULL,                    -- 'YYYY-MM-DD' local date
  time_window text NOT NULL,                 -- 'morning' | 'midday' | 'evening'
  brief_text text NOT NULL,                  -- markdown-lite body from Sonnet
  chips jsonb NOT NULL DEFAULT '[]'::jsonb,  -- [{label, primary?, dismiss?}]
  win_banner text,                           -- optional single-line win (mint banner)
  model text DEFAULT 'claude-sonnet-4-6',
  input_tokens int DEFAULT 0,
  output_tokens int DEFAULT 0,
  cost_usd numeric(10,6) DEFAULT 0,
  data_signature text,                       -- hash of family data used — detects significant changes
  generated_at timestamptz DEFAULT now(),
  UNIQUE (family_id, date_key, time_window)
);

CREATE INDEX IF NOT EXISTS idx_zaeli_briefs_lookup
  ON zaeli_briefs (family_id, date_key, time_window);

ALTER TABLE zaeli_briefs ENABLE ROW LEVEL SECURITY;

-- Drop legacy allow-all policy if present (was pre-Session-21 auth)
DROP POLICY IF EXISTS "Allow all for now" ON zaeli_briefs;

-- Session 21 RLS pattern — family-scoped via current_family_id() helper.
-- Requires supabase-data-rls.sql (or supabase-auth-tables.sql) to have been run first
-- so that public.current_family_id() exists.
DROP POLICY IF EXISTS "zaeli_briefs_select_own_family" ON zaeli_briefs;
CREATE POLICY "zaeli_briefs_select_own_family" ON zaeli_briefs
  FOR SELECT USING (family_id = public.current_family_id());

DROP POLICY IF EXISTS "zaeli_briefs_insert_own_family" ON zaeli_briefs;
CREATE POLICY "zaeli_briefs_insert_own_family" ON zaeli_briefs
  FOR INSERT WITH CHECK (family_id = public.current_family_id());

DROP POLICY IF EXISTS "zaeli_briefs_update_own_family" ON zaeli_briefs;
CREATE POLICY "zaeli_briefs_update_own_family" ON zaeli_briefs
  FOR UPDATE USING (family_id = public.current_family_id())
  WITH CHECK (family_id = public.current_family_id());

DROP POLICY IF EXISTS "zaeli_briefs_delete_own_family" ON zaeli_briefs;
CREATE POLICY "zaeli_briefs_delete_own_family" ON zaeli_briefs
  FOR DELETE USING (family_id = public.current_family_id());
