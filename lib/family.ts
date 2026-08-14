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

// Aug 27 fix — cold-start race that hit Andy on first install. Session 30's
// splash latency fix marks the app authed as soon as the session is verified
// (fast AsyncStorage read) and loads the profile in the background. That's
// fine for READ paths (worst case: empty results for a moment) but WRITES
// need the real family_id — otherwise the row ends up with DUMMY_FAMILY_ID,
// RLS blocks the insert, and the user sees "new row violates row-level
// security policy" (or worse, silently loses the write pre-Session-28).
//
// Any code path that WRITES to a family-scoped table must call this instead
// of getFamilyId(). It:
//   1. Returns immediately if the profile is already loaded (~zero cost)
//   2. Otherwise triggers loadProfile() and polls until it resolves
//   3. Times out after ~4s and throws — caller should show a friendly error
//      rather than fall back to DUMMY_FAMILY_ID (which is what caused the bug)
export async function awaitFamilyId(timeoutMs = 4000): Promise<string> {
  const immediate = getCurrentFamilyId();
  if (immediate) return immediate;

  // Kick off a fresh load if we have a session
  const session = await getSession();
  if (!session) throw new Error('not signed in');
  loadProfile().catch(() => {}); // fire-and-forget, we poll below

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const now = getCurrentFamilyId();
    if (now) return now;
    await new Promise(r => setTimeout(r, 60));
  }
  throw new Error('profile not ready — try again in a moment');
}

// For debugging — call from anywhere to see current state
export function debugFamily(): { hasProfile: boolean; familyId: string } {
  return {
    hasProfile: getCurrentFamilyId() !== null,
    familyId: getFamilyId(),
  };
}
