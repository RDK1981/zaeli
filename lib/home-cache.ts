/**
 * lib/home-cache.ts — Instant-load cache for Home tiles (Build 53)
 *
 * Fixes the "2-3 sec blank tile flash" cold-start UX. Every Home tile
 * (events, shopping, reminders, radar, budget) hydrates from AsyncStorage
 * immediately on mount, then fetches fresh from Supabase in the background
 * and silently updates if changed. Users see content in ~50ms instead of
 * waiting for the network round-trip.
 *
 * Pattern per tile:
 *   1. On mount: loadTile(family, key) → hydrate state → paint
 *   2. In parallel: fetch fresh from Supabase
 *   3. On fetch complete: saveTile(family, key, data) + update state if different
 *   4. On write (add/edit/delete via tools or sheet): also refresh the cache
 *
 * Cache is per-user (keyed by family_id) and per-tile (short string keys
 * like "events-today", "shopping-summary"). Only stores the DISPLAYED shape
 * needed by the tile — never full row data, never PII beyond what's already
 * visible on the tile itself.
 *
 * Cleared on sign-out via lib/auth.onAuthChange in _layout.tsx.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const NS = 'zaeli.home-cache';

type CacheEntry<T> = {
  savedAt: string;   // ISO timestamp
  data: T;
};

function key(familyId: string, tileKey: string): string {
  return `${NS}.${familyId}.${tileKey}`;
}

// Read cached data for a tile. Returns null if never cached (fresh install
// or first mount after sign-out). Silently swallows all errors — cache is
// best-effort, never blocks anything.
export async function loadTile<T>(familyId: string, tileKey: string): Promise<T | null> {
  if (!familyId) return null;
  try {
    const raw = await AsyncStorage.getItem(key(familyId, tileKey));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry<T>;
    return parsed?.data ?? null;
  } catch {
    return null;
  }
}

// Save data for a tile. Fire-and-forget — never awaited by callers. Extra
// null-guard against empty family_id in case a tile fires this pre-auth.
export function saveTile<T>(familyId: string, tileKey: string, data: T): void {
  if (!familyId) return;
  const entry: CacheEntry<T> = { savedAt: new Date().toISOString(), data };
  AsyncStorage.setItem(key(familyId, tileKey), JSON.stringify(entry)).catch(() => {});
}

// Clear all home-cache entries for a specific family. Called from sign-out
// so the NEXT user (or same user re-signing-in) doesn't see stale content.
export async function clearFamilyCache(familyId: string): Promise<void> {
  if (!familyId) return;
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const familyPrefix = `${NS}.${familyId}.`;
    const toDelete = allKeys.filter(k => k.startsWith(familyPrefix));
    if (toDelete.length > 0) {
      await AsyncStorage.multiRemove(toDelete);
    }
  } catch {}
}

// Clear ALL home-cache entries across all families. Called on sign-out
// generically (safer than needing to know which family was signed in).
export async function clearAllHomeCache(): Promise<void> {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const toDelete = allKeys.filter(k => k.startsWith(NS + '.'));
    if (toDelete.length > 0) {
      await AsyncStorage.multiRemove(toDelete);
    }
  } catch {}
}

// Cache key constants — all tile identifiers in one place so we don't have
// magic strings scattered across dashboard.tsx.
export const CACHE_KEYS = {
  eventsToday:     'events-today',
  eventsTomorrow:  'events-tomorrow',
  shoppingSummary: 'shopping-summary',   // { count, items: string[] }
  remindersSummary:'reminders-summary',  // { count, items: [] }
  radarTasks:      'radar-tasks',        // top N tasks
  budgetSummary:   'budget-summary',     // headline totals
  mealTonight:     'meal-tonight',       // { name, cooks }
  // Session 37 — Home BriefTile cache (Variation B).
  // Shape: { text: string, window: 'morning'|'evening', generatedAt: string }
  // Read from zaeli_briefs table (server-scheduler writes; client reads only).
  briefLatest:     'brief-latest',
} as const;

// Track the last-active family_id in AsyncStorage. Dashboard can't hydrate
// from cache without knowing which family's cache to read, and profile isn't
// loaded yet on cold-start (Session 30 splash latency fix — loadProfile runs
// in the background AFTER setAuthed=true). This stash lets dashboard hydrate
// from cache BEFORE the profile network round-trip completes.
//
// Written by dashboard on every successful loadData. Read by dashboard on
// mount (via getLastFamilyId) to hydrate tile caches instantly.
const LAST_FAMILY_KEY = `${NS}.__last-family-id`;

export async function saveLastFamilyId(familyId: string): Promise<void> {
  if (!familyId) return;
  try { await AsyncStorage.setItem(LAST_FAMILY_KEY, familyId); } catch {}
}

export async function getLastFamilyId(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(LAST_FAMILY_KEY);
  } catch {
    return null;
  }
}
