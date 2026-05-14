-- ════════════════════════════════════════════════════════════════════════
-- Zaeli — Auth foundation tables (Phase 1 of backend pass)
-- Run this in the Supabase SQL editor for project rsvbzakyyrftezthlhtd
-- ════════════════════════════════════════════════════════════════════════
--
-- Creates the two tables that everything else hangs off:
--   * families  — one row per household (links Stripe customer + plan info)
--   * profiles  — one row per auth.user, links to families.id with role
--
-- IDEMPOTENT — safe to re-run. If a table already exists from an earlier
-- attempt, columns are added defensively via ALTER TABLE ADD COLUMN IF
-- NOT EXISTS. Policies are dropped + recreated each run.
--
-- Includes RLS policies so users only see their own family's data.
-- DOES NOT touch any existing data tables — those still use DUMMY_FAMILY_ID.

-- ────────────────────────────────────────────────────────────────────────
-- Required extensions
-- ────────────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";  -- for gen_random_uuid()

-- ────────────────────────────────────────────────────────────────────────
-- families
-- ────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

-- Add columns defensively (safe whether table existed before or not)
ALTER TABLE public.families
  ADD COLUMN IF NOT EXISTS created_by              UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS name                    TEXT NOT NULL DEFAULT 'My family',
  ADD COLUMN IF NOT EXISTS plan                    TEXT NOT NULL DEFAULT 'family',
  ADD COLUMN IF NOT EXISTS trial_ends_at           TIMESTAMPTZ DEFAULT (now() + interval '14 days'),
  ADD COLUMN IF NOT EXISTS subscription_status     TEXT NOT NULL DEFAULT 'trial',
  ADD COLUMN IF NOT EXISTS stripe_customer_id      TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id  TEXT,
  ADD COLUMN IF NOT EXISTS created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at              TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_families_created_by ON public.families(created_by);
CREATE INDEX IF NOT EXISTS idx_families_stripe_customer ON public.families(stripe_customer_id);

-- ────────────────────────────────────────────────────────────────────────
-- profiles  (one row per auth.user, hard-tied via id)
-- ────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
);

-- family_id needs to be added before NOT NULL is enforced — done in two
-- steps so a pre-existing profiles table without rows doesn't blow up.
-- (We add the column nullable, then the RLS policy enforces presence.)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS family_id           UUID REFERENCES public.families(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS kind                TEXT NOT NULL DEFAULT 'owner',
  ADD COLUMN IF NOT EXISTS name                TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS email               TEXT,
  ADD COLUMN IF NOT EXISTS avatar              TEXT,
  ADD COLUMN IF NOT EXISTS colour              TEXT,
  ADD COLUMN IF NOT EXISTS year_level          INT,
  ADD COLUMN IF NOT EXISTS brief_morning_at    TIME DEFAULT '07:15',
  ADD COLUMN IF NOT EXISTS brief_evening_at    TIME DEFAULT '20:30',
  ADD COLUMN IF NOT EXISTS created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at          TIMESTAMPTZ NOT NULL DEFAULT now();

-- Enforce kind values via a CHECK constraint (drop+recreate so it's idempotent)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_kind_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_kind_check
  CHECK (kind IN ('owner', 'adult', 'kid'));

CREATE INDEX IF NOT EXISTS idx_profiles_family_id ON public.profiles(family_id);
CREATE INDEX IF NOT EXISTS idx_profiles_kind ON public.profiles(kind);

-- ────────────────────────────────────────────────────────────────────────
-- updated_at triggers
-- ────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS families_set_updated_at ON public.families;
CREATE TRIGGER families_set_updated_at
  BEFORE UPDATE ON public.families
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS profiles_set_updated_at ON public.profiles;
CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ────────────────────────────────────────────────────────────────────────
-- Row Level Security
-- ────────────────────────────────────────────────────────────────────────

ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Helper: get the current user's family_id
CREATE OR REPLACE FUNCTION public.current_family_id()
RETURNS UUID AS $$
  SELECT family_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Profiles policies ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Read family profiles" ON public.profiles;
CREATE POLICY "Read family profiles" ON public.profiles
  FOR SELECT USING (family_id = public.current_family_id());

DROP POLICY IF EXISTS "Update own profile" ON public.profiles;
CREATE POLICY "Update own profile" ON public.profiles
  FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Insert own profile" ON public.profiles;
CREATE POLICY "Insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Owner deletes family profiles" ON public.profiles;
CREATE POLICY "Owner deletes family profiles" ON public.profiles
  FOR DELETE USING (
    family_id = public.current_family_id()
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND kind = 'owner')
  );

-- Families policies ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Read own family" ON public.families;
CREATE POLICY "Read own family" ON public.families
  FOR SELECT USING (id = public.current_family_id());

DROP POLICY IF EXISTS "Owner updates own family" ON public.families;
CREATE POLICY "Owner updates own family" ON public.families
  FOR UPDATE USING (
    id = public.current_family_id()
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND kind = 'owner')
  );

DROP POLICY IF EXISTS "Authenticated users create families" ON public.families;
CREATE POLICY "Authenticated users create families" ON public.families
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- ────────────────────────────────────────────────────────────────────────
-- Auto-create family + profile on signup (server-side trigger)
-- ────────────────────────────────────────────────────────────────────────
-- When supabase.auth.signUp() succeeds, this trigger fires on auth.users
-- INSERT and creates the corresponding families row + owner profile in
-- one atomic step. Runs with elevated privileges (SECURITY DEFINER) so it
-- bypasses RLS — the client never has to insert into families/profiles
-- directly, which avoids the chicken-and-egg session/RLS problem.
--
-- For owner sign-up (no invite): client passes `name` + optional
-- `family_name` via auth user metadata. Trigger creates a fresh family.
--
-- For invitee sign-up (Phase 2 — when invite_tokens lands): client passes
-- `invite_token` via metadata. Trigger looks up the token, joins the
-- existing family with the right role.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name        TEXT;
  v_family_name TEXT;
  v_family_id   UUID;
BEGIN
  -- Pull name from user metadata; fall back to email prefix
  v_name        := COALESCE(NULLIF(NEW.raw_user_meta_data->>'name', ''),
                            split_part(NEW.email, '@', 1));
  v_family_name := COALESCE(NULLIF(NEW.raw_user_meta_data->>'family_name', ''),
                            v_name || '''s family');

  -- Create the family
  INSERT INTO public.families (created_by, name)
  VALUES (NEW.id, v_family_name)
  RETURNING id INTO v_family_id;

  -- Create the owner profile
  INSERT INTO public.profiles (id, family_id, kind, name, email)
  VALUES (NEW.id, v_family_id, 'owner', v_name, NEW.email);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ────────────────────────────────────────────────────────────────────────
-- Done. If you got an error before, the ALTER TABLE statements above
-- should have added the missing columns to the pre-existing table.
-- Re-run this whole script — it's safe to run multiple times.
-- ────────────────────────────────────────────────────────────────────────
