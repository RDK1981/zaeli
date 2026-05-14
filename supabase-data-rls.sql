-- ════════════════════════════════════════════════════════════════════════
-- Zaeli — Phase 2a: RLS on existing data tables + legacy data backfill
-- Run this in the Supabase SQL editor AFTER supabase-auth-tables.sql
-- ════════════════════════════════════════════════════════════════════════
--
-- What this does:
--   1. Adds standard "family-scoped" RLS policies to all data tables that
--      have a family_id column. Each policy grants SELECT/INSERT/UPDATE/
--      DELETE access only when family_id = public.current_family_id().
--   2. Provides public.claim_legacy_data() — a SECURITY DEFINER helper
--      that reassigns all rows currently pointing to DUMMY_FAMILY_ID
--      ('00000000-0000-0000-0000-000000000001') to the calling user's
--      real family.id. Run it ONCE after sign-up to claim your test data.
--   3. Enables RLS on each table. Done last so the backfill function can
--      run without being blocked by its own policies.
--
-- Tables covered (all have a family_id column already):
--   events, todos, shopping_items, pantry_items, receipts,
--   meal_plans, recipes, family_members, zaeli_briefs, personal_tasks,
--   kids_jobs, kids_rewards, kids_points_log, kids_pending_approvals,
--   kids_trivia_history, tutor_sessions, tutor_progress, reminders, notes
--
-- Tutor messages are linked to sessions, not directly to family — handled
-- via session-aware policy.
--
-- Idempotent — safe to re-run as schema evolves.

-- ────────────────────────────────────────────────────────────────────────
-- claim_legacy_data() — reassigns DUMMY_FAMILY_ID rows to caller's family
-- ────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.claim_legacy_data()
RETURNS TABLE(table_name TEXT, rows_updated BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target_family UUID;
  v_dummy UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
  -- Resolve caller's family_id from their profile
  SELECT family_id INTO v_target_family
  FROM public.profiles WHERE id = auth.uid() LIMIT 1;

  IF v_target_family IS NULL THEN
    RAISE EXCEPTION 'No profile found for current user. Sign in first.';
  END IF;

  -- Reassign each table's legacy rows. Returns count per table for visibility.
  RETURN QUERY
  WITH updates AS (
    SELECT 'events'::TEXT AS tbl, COUNT(*) AS n FROM public.events WHERE family_id = v_dummy
    UNION ALL SELECT 'todos', COUNT(*) FROM public.todos WHERE family_id = v_dummy
    UNION ALL SELECT 'shopping_items', COUNT(*) FROM public.shopping_items WHERE family_id = v_dummy
    UNION ALL SELECT 'pantry_items', COUNT(*) FROM public.pantry_items WHERE family_id = v_dummy
    UNION ALL SELECT 'receipts', COUNT(*) FROM public.receipts WHERE family_id = v_dummy
    UNION ALL SELECT 'meal_plans', COUNT(*) FROM public.meal_plans WHERE family_id = v_dummy
    UNION ALL SELECT 'recipes', COUNT(*) FROM public.recipes WHERE family_id = v_dummy
    UNION ALL SELECT 'family_members', COUNT(*) FROM public.family_members WHERE family_id = v_dummy
    UNION ALL SELECT 'zaeli_briefs', COUNT(*) FROM public.zaeli_briefs WHERE family_id = v_dummy
    UNION ALL SELECT 'personal_tasks', COUNT(*) FROM public.personal_tasks WHERE family_id = v_dummy
    UNION ALL SELECT 'kids_jobs', COUNT(*) FROM public.kids_jobs WHERE family_id = v_dummy
    UNION ALL SELECT 'kids_rewards', COUNT(*) FROM public.kids_rewards WHERE family_id = v_dummy
    UNION ALL SELECT 'kids_points_log', COUNT(*) FROM public.kids_points_log WHERE family_id = v_dummy
    UNION ALL SELECT 'kids_pending_approvals', COUNT(*) FROM public.kids_pending_approvals WHERE family_id = v_dummy
    UNION ALL SELECT 'kids_trivia_history', COUNT(*) FROM public.kids_trivia_history WHERE family_id = v_dummy
    UNION ALL SELECT 'tutor_sessions', COUNT(*) FROM public.tutor_sessions WHERE family_id = v_dummy
    UNION ALL SELECT 'tutor_progress', COUNT(*) FROM public.tutor_progress WHERE family_id = v_dummy
    UNION ALL SELECT 'reminders', COUNT(*) FROM public.reminders WHERE family_id = v_dummy
    UNION ALL SELECT 'notes', COUNT(*) FROM public.notes WHERE family_id = v_dummy
  )
  SELECT tbl, n FROM updates WHERE n > 0;

  -- Now do the actual reassign (per table — IGNORE missing tables)
  BEGIN UPDATE public.events                 SET family_id = v_target_family WHERE family_id = v_dummy; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN UPDATE public.todos                  SET family_id = v_target_family WHERE family_id = v_dummy; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN UPDATE public.shopping_items         SET family_id = v_target_family WHERE family_id = v_dummy; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN UPDATE public.pantry_items           SET family_id = v_target_family WHERE family_id = v_dummy; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN UPDATE public.receipts               SET family_id = v_target_family WHERE family_id = v_dummy; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN UPDATE public.meal_plans             SET family_id = v_target_family WHERE family_id = v_dummy; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN UPDATE public.recipes                SET family_id = v_target_family WHERE family_id = v_dummy; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN UPDATE public.family_members         SET family_id = v_target_family WHERE family_id = v_dummy; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN UPDATE public.zaeli_briefs           SET family_id = v_target_family WHERE family_id = v_dummy; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN UPDATE public.personal_tasks         SET family_id = v_target_family WHERE family_id = v_dummy; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN UPDATE public.kids_jobs              SET family_id = v_target_family WHERE family_id = v_dummy; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN UPDATE public.kids_rewards           SET family_id = v_target_family WHERE family_id = v_dummy; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN UPDATE public.kids_points_log        SET family_id = v_target_family WHERE family_id = v_dummy; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN UPDATE public.kids_pending_approvals SET family_id = v_target_family WHERE family_id = v_dummy; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN UPDATE public.kids_trivia_history    SET family_id = v_target_family WHERE family_id = v_dummy; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN UPDATE public.tutor_sessions         SET family_id = v_target_family WHERE family_id = v_dummy; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN UPDATE public.tutor_progress         SET family_id = v_target_family WHERE family_id = v_dummy; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN UPDATE public.reminders              SET family_id = v_target_family WHERE family_id = v_dummy; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN UPDATE public.notes                  SET family_id = v_target_family WHERE family_id = v_dummy; EXCEPTION WHEN undefined_table THEN NULL; END;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_legacy_data() TO authenticated;

-- ────────────────────────────────────────────────────────────────────────
-- RLS policies — apply to every table with a family_id column
-- Pattern: family_id = public.current_family_id()
-- ────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  t TEXT;
  family_tables TEXT[] := ARRAY[
    'events', 'todos', 'shopping_items', 'pantry_items', 'receipts',
    'meal_plans', 'recipes', 'family_members', 'zaeli_briefs',
    'personal_tasks', 'kids_jobs', 'kids_rewards', 'kids_points_log',
    'kids_pending_approvals', 'kids_trivia_history',
    'tutor_sessions', 'tutor_progress', 'reminders', 'notes'
  ];
BEGIN
  FOREACH t IN ARRAY family_tables LOOP
    -- Skip tables that don't exist (some installs may be missing one or two)
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      CONTINUE;
    END IF;

    -- Drop + recreate the four standard policies (idempotent)
    EXECUTE format('DROP POLICY IF EXISTS "%s_select_family" ON public.%I', t, t);
    EXECUTE format(
      'CREATE POLICY "%s_select_family" ON public.%I FOR SELECT USING (family_id = public.current_family_id())',
      t, t
    );

    EXECUTE format('DROP POLICY IF EXISTS "%s_insert_family" ON public.%I', t, t);
    EXECUTE format(
      'CREATE POLICY "%s_insert_family" ON public.%I FOR INSERT WITH CHECK (family_id = public.current_family_id())',
      t, t
    );

    EXECUTE format('DROP POLICY IF EXISTS "%s_update_family" ON public.%I', t, t);
    EXECUTE format(
      'CREATE POLICY "%s_update_family" ON public.%I FOR UPDATE USING (family_id = public.current_family_id()) WITH CHECK (family_id = public.current_family_id())',
      t, t
    );

    EXECUTE format('DROP POLICY IF EXISTS "%s_delete_family" ON public.%I', t, t);
    EXECUTE format(
      'CREATE POLICY "%s_delete_family" ON public.%I FOR DELETE USING (family_id = public.current_family_id())',
      t, t
    );

    -- Enable RLS on this table
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

-- ────────────────────────────────────────────────────────────────────────
-- tutor_messages — linked via session_id, not family_id directly
-- Policy: user can access messages where the parent session belongs to
-- their family.
-- ────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='tutor_messages') THEN
    DROP POLICY IF EXISTS "tutor_messages_select_family" ON public.tutor_messages;
    CREATE POLICY "tutor_messages_select_family" ON public.tutor_messages
      FOR SELECT USING (
        session_id IN (
          SELECT id FROM public.tutor_sessions
          WHERE family_id = public.current_family_id()
        )
      );

    DROP POLICY IF EXISTS "tutor_messages_insert_family" ON public.tutor_messages;
    CREATE POLICY "tutor_messages_insert_family" ON public.tutor_messages
      FOR INSERT WITH CHECK (
        session_id IN (
          SELECT id FROM public.tutor_sessions
          WHERE family_id = public.current_family_id()
        )
      );

    DROP POLICY IF EXISTS "tutor_messages_update_family" ON public.tutor_messages;
    CREATE POLICY "tutor_messages_update_family" ON public.tutor_messages
      FOR UPDATE USING (
        session_id IN (SELECT id FROM public.tutor_sessions WHERE family_id = public.current_family_id())
      );

    DROP POLICY IF EXISTS "tutor_messages_delete_family" ON public.tutor_messages;
    CREATE POLICY "tutor_messages_delete_family" ON public.tutor_messages
      FOR DELETE USING (
        session_id IN (SELECT id FROM public.tutor_sessions WHERE family_id = public.current_family_id())
      );

    ALTER TABLE public.tutor_messages ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────────────────
-- api_logs — keep open for now (used for cost tracking; no PII).
-- Will lock down in Phase 3 once admin role is defined.
-- ────────────────────────────────────────────────────────────────────────

-- ────────────────────────────────────────────────────────────────────────
-- Done. Now run this ONCE in the SQL editor (signed in as your auth user
-- via the dashboard) to claim your existing test data:
--
--   SELECT * FROM public.claim_legacy_data();
--
-- It returns a list of (table_name, rows_updated) so you can verify the
-- backfill worked. Then reload the app — events / shopping / meals etc
-- will be visible to your auth user and only to your family.
-- ────────────────────────────────────────────────────────────────────────
