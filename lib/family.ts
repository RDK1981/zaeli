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

import { getCurrentFamilyId } from './auth';

export const DUMMY_FAMILY_ID = '00000000-0000-0000-0000-000000000001';

export function getFamilyId(): string {
  return getCurrentFamilyId() ?? DUMMY_FAMILY_ID;
}
