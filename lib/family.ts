/**
 * lib/family.ts — Single source of truth for the current user's family_id.
 *
 * Replaces the old `const FAMILY_ID = '00000000-0000-0000-0000-000000000001'`
 * pattern that was scattered across 12+ files. Now every file imports
 * getFamilyId() and resolves at query time.
 *
 * - Authenticated user → returns profiles.family_id
 * - Unauthenticated (e.g. dev / pre-onboarding flows) → falls back to the
 *   legacy DUMMY_FAMILY_ID so existing local-only tests keep working.
 *
 * Once Phase 2b lands invite_tokens + the rest of the AsyncStorage
 * migration, the fallback is no longer needed for normal users — it stays
 * as a safety net for the dev "Re-do onboarding" flow.
 */

import { getCurrentFamilyId, getSession, loadProfile } from './auth';

export const DUMMY_FAMILY_ID = '00000000-0000-0000-0000-000000000001';

let _warnedAboutFallback = false;

export function getFamilyId(): string {
  const real = getCurrentFamilyId();
  if (real) return real;
  // Profile not loaded — most callers should have ensured it loaded before
  // querying. Log once so we can spot the race + kick off a load attempt.
  if (!_warnedAboutFallback) {
    _warnedAboutFallback = true;
    console.warn('[family] getFamilyId() fell back to DUMMY — profile not loaded yet. Triggering loadProfile().');
    getSession().then(s => {
      if (s) loadProfile().then(() => { _warnedAboutFallback = false; });
    });
  }
  return DUMMY_FAMILY_ID;
}

// For debugging — call from anywhere to see current state
export function debugFamily(): { hasProfile: boolean; familyId: string } {
  return {
    hasProfile: getCurrentFamilyId() !== null,
    familyId: getFamilyId(),
  };
}
