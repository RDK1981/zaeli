-- ════════════════════════════════════════════════════════════════════════
-- Zaeli — Phase 2c: user_preferences JSONB column on profiles
-- Run AFTER Phase 1 + 2a + 2b migrations
-- ════════════════════════════════════════════════════════════════════════
--
-- What this does:
--   Adds public.profiles.user_preferences jsonb — single blob holding
--   notification + brief + memory toggles managed by the Settings screen.
--   Same write-through pattern as tour_state: profile is source of truth
--   when signed in, AsyncStorage as offline fallback.
--
-- Schema of the JSONB blob (driven by lib/user-prefs.ts):
--   {
--     briefMorningTime: 'HH:MM',  briefMorningOn: bool,
--     briefEveningTime: 'HH:MM',  briefEveningOn: bool,
--     calendarNotif:    bool,
--     shoppingLowNotif: bool,
--     dinnerUnplanned:  bool,
--     kidsJobApprovals: bool,
--     kidsRewardReqs:   bool,
--     quietHoursOn:     bool,
--     quietStart:       'HH:MM',
--     quietEnd:         'HH:MM',
--     soundOn:          bool,
--     vibrationOn:      bool,
--     memoryLearningOn: bool
--   }
--
-- RLS not added separately — profiles already has the right policies
-- ('id = auth.uid()' for own profile; family members can read other
-- members of their family). user_preferences is just a column on that
-- existing row.
--
-- Idempotent — safe to re-run.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS user_preferences jsonb;

-- Verify
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'user_preferences';
