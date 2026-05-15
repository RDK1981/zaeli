/**
 * lib/user-prefs.ts — Settings preferences (Supabase-backed, Phase 2c).
 *
 * Phase 2a/2b stored these in AsyncStorage under `zaeli_settings_prefs_v1`.
 * Phase 2c moves them to profiles.user_preferences JSONB so settings
 * follow the user across devices, with the same write-through pattern as
 * lib/tour-state.ts.
 *
 * Profile is source of truth when signed in. AsyncStorage stays as
 * offline fallback + pre-auth path (kid receivers, mid-onboarding flows).
 *
 * Public API:
 *   loadPrefs()        — hydrate cache from profile (or AsyncStorage)
 *   getPrefs()         — sync read of cached prefs
 *   updatePref(k, v)   — write through to both stores
 *   savePrefs(p)       — bulk replace, write-through
 *   DEFAULT_PREFS      — for first-load before hydration
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

const KEY_PREFS = 'zaeli_settings_prefs_v1';

export interface Prefs {
  briefMorningTime: string;     // 'HH:MM'
  briefEveningTime: string;
  briefMorningOn:   boolean;
  briefEveningOn:   boolean;
  calendarNotif:    boolean;
  shoppingLowNotif: boolean;
  dinnerUnplanned:  boolean;
  kidsJobApprovals: boolean;
  kidsRewardReqs:   boolean;
  quietHoursOn:     boolean;
  quietStart:       string;
  quietEnd:         string;
  soundOn:          boolean;
  vibrationOn:      boolean;
  memoryLearningOn: boolean;
}

export const DEFAULT_PREFS: Prefs = {
  briefMorningTime: '07:00',
  briefEveningTime: '18:30',
  briefMorningOn:   true,
  briefEveningOn:   true,
  calendarNotif:    true,
  shoppingLowNotif: true,
  dinnerUnplanned:  true,
  kidsJobApprovals: true,
  kidsRewardReqs:   true,
  quietHoursOn:     true,
  quietStart:       '21:30',
  quietEnd:         '06:30',
  soundOn:          true,
  vibrationOn:      false,
  memoryLearningOn: true,
};

let _prefs: Prefs = { ...DEFAULT_PREFS };
let _loaded = false;

// ── Sanitise (forward-compat — extra keys ignored, missing get defaults) ──
function sanitise(parsed: any): Prefs {
  return { ...DEFAULT_PREFS, ...(parsed || {}) };
}

// ── Persistence (write-through to profile + AsyncStorage) ────────────────
async function persist(): Promise<void> {
  // AsyncStorage write — fire-and-forget for offline + fast restart
  AsyncStorage.setItem(KEY_PREFS, JSON.stringify(_prefs)).catch(() => {});

  // Profile write — only if signed in
  try {
    const { data } = await supabase.auth.getSession();
    const userId = data?.session?.user?.id;
    if (!userId) return;
    await supabase
      .from('profiles')
      .update({ user_preferences: _prefs })
      .eq('id', userId);
  } catch (e: any) {
    console.log('[prefs] persist DB error:', e?.message);
  }
}

// ── Public API ─────────────────────────────────────────────────────────────
export async function loadPrefs(): Promise<Prefs> {
  if (_loaded) return _prefs;

  // Profile is source of truth when signed in. Fall back to AsyncStorage.
  let loadedFromProfile = false;
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    if (userId) {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_preferences')
        .eq('id', userId)
        .single();
      if (!error && data?.user_preferences) {
        _prefs = sanitise(data.user_preferences);
        loadedFromProfile = true;
      }
    }
  } catch (e: any) {
    console.log('[prefs] load DB error:', e?.message);
  }

  if (!loadedFromProfile) {
    try {
      const raw = await AsyncStorage.getItem(KEY_PREFS);
      if (raw) _prefs = sanitise(JSON.parse(raw));
    } catch {}
  }

  _loaded = true;
  return _prefs;
}

export function getPrefs(): Prefs {
  return { ..._prefs };
}

export async function updatePref<K extends keyof Prefs>(key: K, value: Prefs[K]): Promise<void> {
  _prefs = { ..._prefs, [key]: value };
  await persist();
}

export async function savePrefs(next: Prefs): Promise<void> {
  _prefs = sanitise(next);
  await persist();
}

// For tests / dev row — clears in-memory cache so next load re-fetches.
export function invalidateCache(): void {
  _loaded = false;
  _prefs = { ...DEFAULT_PREFS };
}
