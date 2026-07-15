-- ═══════════════════════════════════════════════════════════════════════════
-- Session 30 — Our Budget backend migration (Phase 2 completion)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Our Budget shipped Session 17 as UI-only (React state initialised from
-- SEED_ constants). This migration finally gives it a persistent home so:
--   1. Users don't lose their entire budget on app restart / iOS jetsam
--   2. Anna sees the budget Rich edits (and vice versa) — family-scoped
--   3. Budget survives builds/reinstalls
--
-- Design pattern matches other Session 21+ family-scoped tables:
--   - family_id column on every row
--   - RLS policies scoped via public.current_family_id() helper
--   - Standard 4 policies (SELECT/INSERT/UPDATE/DELETE)
--   - Idempotent CREATE IF NOT EXISTS
--
-- Data model (mirrors app/(tabs)/our-budget.tsx interfaces):
--   income_streams        — Anna's salary, Rich's salary, rental income, etc
--   budget_categories     — Housing, Groceries, Fuel, etc. Fixed or variable.
--   category_line_items   — Line items inside a fixed category (mortgage,
--                           council rates, internet, etc). Fixed categories
--                           sum their line items. Variable categories don't
--                           have line items — they have a monthlyTarget.
--   savings_goals         — Holiday, house deposit, emergency fund, etc.
--
-- No auto-seed: fresh families start empty and build their budget from
-- scratch via the app's Add flows or AI upload helper.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── income_streams ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.income_streams (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id       UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  label           TEXT NOT NULL,
  type            TEXT NOT NULL,             -- 'Salary' / 'Property' / 'Freelance' / 'Other' etc
  monthly_amount  NUMERIC(10, 2) NOT NULL DEFAULT 0,
  member_id       TEXT,                      -- optional member name/id (e.g. 'anna', 'rich') — informational
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS income_streams_family_idx
  ON public.income_streams (family_id);

-- ── budget_categories ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.budget_categories (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id        UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  emoji            TEXT NOT NULL DEFAULT '📁',
  type             TEXT NOT NULL CHECK (type IN ('fixed', 'variable')),
  monthly_target   NUMERIC(10, 2),           -- variable only; NULL for fixed (line items sum instead)
  sort_order       INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS budget_categories_family_idx
  ON public.budget_categories (family_id, sort_order);

-- ── category_line_items ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.category_line_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- family_id kept on the row too (denormalised) so RLS can filter without
  -- an extra join, matching the pattern used for other family-scoped tables.
  family_id       UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  category_id     UUID NOT NULL REFERENCES public.budget_categories(id) ON DELETE CASCADE,
  label           TEXT NOT NULL,
  monthly_amount  NUMERIC(10, 2) NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS category_line_items_family_idx
  ON public.category_line_items (family_id);
CREATE INDEX IF NOT EXISTS category_line_items_category_idx
  ON public.category_line_items (category_id);

-- ── savings_goals ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.savings_goals (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id              UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  name                   TEXT NOT NULL,
  emoji                  TEXT NOT NULL DEFAULT '🎯',
  saved                  NUMERIC(10, 2) NOT NULL DEFAULT 0,
  target                 NUMERIC(10, 2) NOT NULL DEFAULT 0,
  target_date            TEXT,             -- 'Oct 2025' style OR NULL for flexible
  monthly_contribution   NUMERIC(10, 2) NOT NULL DEFAULT 0,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS savings_goals_family_idx
  ON public.savings_goals (family_id);

-- ── RLS ────────────────────────────────────────────────────────────────────
-- Standard family-scoped RLS via current_family_id() helper (Session 21 pattern).
-- Every SELECT/INSERT/UPDATE/DELETE requires the row's family_id to match
-- the caller's family_id from their profile.

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'income_streams',
    'budget_categories',
    'category_line_items',
    'savings_goals'
  ])
  LOOP
    -- Enable RLS
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);

    -- Drop any old policies (idempotent re-runs)
    EXECUTE format('DROP POLICY IF EXISTS "%s_select" ON public.%I;', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "%s_insert" ON public.%I;', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "%s_update" ON public.%I;', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "%s_delete" ON public.%I;', tbl, tbl);

    -- Create 4 fresh policies scoped to caller's family
    EXECUTE format(
      'CREATE POLICY "%s_select" ON public.%I FOR SELECT USING (family_id = public.current_family_id());',
      tbl, tbl
    );
    EXECUTE format(
      'CREATE POLICY "%s_insert" ON public.%I FOR INSERT WITH CHECK (family_id = public.current_family_id());',
      tbl, tbl
    );
    EXECUTE format(
      'CREATE POLICY "%s_update" ON public.%I FOR UPDATE USING (family_id = public.current_family_id()) WITH CHECK (family_id = public.current_family_id());',
      tbl, tbl
    );
    EXECUTE format(
      'CREATE POLICY "%s_delete" ON public.%I FOR DELETE USING (family_id = public.current_family_id());',
      tbl, tbl
    );
  END LOOP;
END $$;

-- ── Table comments ─────────────────────────────────────────────────────────
COMMENT ON TABLE public.income_streams IS
  'Monthly income streams (salaries, rental, freelance). Session 30.';
COMMENT ON TABLE public.budget_categories IS
  'Budget categories — fixed (line items sum) or variable (monthly_target). Session 30.';
COMMENT ON TABLE public.category_line_items IS
  'Line items inside fixed budget categories (e.g. Mortgage under Housing). Session 30.';
COMMENT ON TABLE public.savings_goals IS
  'Family savings goals with target amount + optional target date. Session 30.';
