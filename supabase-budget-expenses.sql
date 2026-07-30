-- ═══════════════════════════════════════════════════════════════════════
-- supabase-budget-expenses.sql — Session 32 v2 Phase 08
--
-- Flat Expenses model — replaces the old two-level categories + line_items.
-- Rich's ask: "Categories → Expenses flat model" (v2 workshop).
--
-- Design:
--   * One table, one row per recurring monthly expense
--   * type: 'fixed' (e.g. mortgage $2200) or 'variable' (e.g. groceries $600)
--   * emoji + name + monthly_amount per row — that's it
--   * No nested categories, no line items on categories
--   * AI statement analyser (our-budget.tsx) inserts directly here
--
-- Migration path:
--   Old rows in budget_categories + category_line_items are FLATTENED into
--   expenses. Old tables are LEFT INTACT so rollback is one client swap
--   (revert lib/budget.ts to previous helpers).
--
-- RLS: Session 21 pattern (family_id = current_family_id).
-- Idempotent — safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.budget_expenses (
  id                uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id         uuid            NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  name              text            NOT NULL,
  emoji             text            NOT NULL DEFAULT '💰',
  type              text            NOT NULL CHECK (type IN ('fixed','variable')),
  monthly_amount    numeric(10,2)   NOT NULL DEFAULT 0,
  sort_order        int             NOT NULL DEFAULT 0,
  created_at        timestamptz     NOT NULL DEFAULT now(),
  updated_at        timestamptz     NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS budget_expenses_family_idx        ON public.budget_expenses(family_id);
CREATE INDEX IF NOT EXISTS budget_expenses_family_type_idx   ON public.budget_expenses(family_id, type);

-- ── RLS ────────────────────────────────────────────────────────────────
ALTER TABLE public.budget_expenses ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS "budget_expenses_select" ON public.budget_expenses;
  DROP POLICY IF EXISTS "budget_expenses_insert" ON public.budget_expenses;
  DROP POLICY IF EXISTS "budget_expenses_update" ON public.budget_expenses;
  DROP POLICY IF EXISTS "budget_expenses_delete" ON public.budget_expenses;

  CREATE POLICY "budget_expenses_select" ON public.budget_expenses
    FOR SELECT USING (family_id = public.current_family_id());
  CREATE POLICY "budget_expenses_insert" ON public.budget_expenses
    FOR INSERT WITH CHECK (family_id = public.current_family_id());
  CREATE POLICY "budget_expenses_update" ON public.budget_expenses
    FOR UPDATE USING (family_id = public.current_family_id());
  CREATE POLICY "budget_expenses_delete" ON public.budget_expenses
    FOR DELETE USING (family_id = public.current_family_id());
END $$;

-- ── One-time data migration from old categories + line_items ──────────
-- Fixed categories: one expense per line_item (the line items ARE the
--   individual bills — e.g. Netflix + Spotify + Gym under "Subscriptions").
-- Variable categories: one expense using monthly_target as the amount
--   (variable had no line items, just a single target).
--
-- Migration is idempotent by name — running twice inserts twice. Only run
-- ONCE per family. To reset: DELETE FROM budget_expenses WHERE family_id = 'xxx';
--
-- CAUTION: This assumes budget_categories + category_line_items still exist
-- from the Session 30 schema. If those tables have been dropped, skip this.
--
-- Uncomment to run (leave commented in the SQL file so it doesn't auto-fire):
--
-- INSERT INTO public.budget_expenses (family_id, name, emoji, type, monthly_amount, sort_order)
-- SELECT
--   li.family_id,
--   li.label,
--   COALESCE(c.emoji, '💰'),
--   'fixed',
--   li.monthly_amount,
--   c.sort_order * 10
-- FROM public.category_line_items li
-- JOIN public.budget_categories c ON c.id = li.category_id
-- WHERE c.type = 'fixed';
--
-- INSERT INTO public.budget_expenses (family_id, name, emoji, type, monthly_amount, sort_order)
-- SELECT
--   c.family_id,
--   c.name,
--   COALESCE(c.emoji, '💰'),
--   'variable',
--   COALESCE(c.monthly_target, 0),
--   c.sort_order
-- FROM public.budget_categories c
-- WHERE c.type = 'variable';

COMMENT ON TABLE public.budget_expenses IS 'Flat monthly expenses (Session 32 v2 Phase 08). Replaces budget_categories + category_line_items.';
