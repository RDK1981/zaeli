/**
 * lib/apple-calendar.ts — Apple Calendar (EventKit) read-only integration.
 *
 * Round B commit 23 (v2 feature): first calendar provider integration.
 * One-way IN only — Zaeli pulls the user's iPhone Calendar events for
 * display alongside Zaeli's own events. Never writes back, never deletes.
 *
 * Design decisions (from Rich's sign-off):
 *   - Read-only. Zaeli's Calendar sheet renders Apple events with a small
 *     "📱 iPhone" badge. Users edit them in iPhone Calendar, not Zaeli.
 *   - No DB persistence. Events are fetched on-demand + kept in an in-memory
 *     cache. If user deletes in iPhone Calendar, next fetch reflects it.
 *     Zero sync-conflict resolution surface.
 *   - Off by default. User opts in via Settings → Connect Apple Calendar.
 *     Toggle state persists in AsyncStorage (per-device, not per-family).
 *   - iOS permission granted via expo-calendar. Toggle-on triggers the
 *     iOS permission prompt if not yet granted. Denial is remembered
 *     device-side by iOS; app just shows "Not connected" and disables.
 *   - Not yet in chat/brief context. Sonnet doesn't see external events
 *     (avoids "delete my 3pm dentist" attempts on rows Zaeli can't touch).
 *     Follow-up commit will teach Sonnet about read-only origins.
 *
 * Public API:
 *   isEnabledPref()          — has user toggled connection on?
 *   setEnabledPref(bool)     — persist toggle
 *   getPermissionStatus()    — current iOS permission ('granted'|'denied'|'undetermined')
 *   requestPermission()      — trigger the iOS prompt
 *   fetchEvents(from, to)    — pull events in date range (returns [] if disabled/denied)
 *   invalidateCache()        — force next fetch to be fresh
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Calendar from 'expo-calendar';
import { Platform } from 'react-native';

const KEY_ENABLED = 'apple_calendar_enabled_v1';

// ── Simple in-memory cache — keyed by "YYYY-MM-DD:YYYY-MM-DD" range ─────
// TTL is short (30s) so a user who deletes in iPhone Calendar sees it drop
// out of Zaeli within about half a minute. Not "instant" but zero-cost.
const CACHE_TTL_MS = 30 * 1000;
interface CacheEntry {
  events: AppleEvent[];
  fetchedAt: number;
}
const _cache = new Map<string, CacheEntry>();

// ── Types ────────────────────────────────────────────────────────────────
export interface AppleEvent {
  id:          string;         // Prefixed with 'apple:' so it never collides with UUID from Supabase
  title:       string;
  startDate:   Date;
  endDate:     Date;
  allDay:      boolean;
  location:    string;
  calendarTitle: string;       // e.g. "Home", "Work", "Family"
  calendarColour: string;      // Hex from EventKit
  isExternal:  true;           // Discriminator for Zaeli events vs Apple events
}

// ── Pref (toggle state) ──────────────────────────────────────────────────
export async function isEnabledPref(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(KEY_ENABLED);
    return raw === 'true';
  } catch { return false; }
}

export async function setEnabledPref(on: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY_ENABLED, on ? 'true' : 'false');
    if (!on) _cache.clear(); // Clear cache immediately on disable
  } catch (e:any) {
    console.log('[apple-calendar] setEnabledPref error:', e?.message);
  }
}

// ── Permission ───────────────────────────────────────────────────────────
export type PermissionStatus = 'granted' | 'denied' | 'undetermined';

export async function getPermissionStatus(): Promise<PermissionStatus> {
  if (Platform.OS !== 'ios') return 'denied'; // Not applicable on Android
  try {
    const res = await Calendar.getCalendarPermissionsAsync();
    if (res.status === 'granted') return 'granted';
    if (res.status === 'denied')  return 'denied';
    return 'undetermined';
  } catch { return 'undetermined'; }
}

export async function requestPermission(): Promise<PermissionStatus> {
  if (Platform.OS !== 'ios') return 'denied';
  try {
    const res = await Calendar.requestCalendarPermissionsAsync();
    if (res.status === 'granted') return 'granted';
    if (res.status === 'denied')  return 'denied';
    return 'undetermined';
  } catch (e:any) {
    console.log('[apple-calendar] requestPermission error:', e?.message);
    return 'denied';
  }
}

// ── Fetch ────────────────────────────────────────────────────────────────
// Pull events in [from, to] date range across ALL of the user's iPhone
// calendars. Returns [] if user has disabled the toggle OR denied permission
// OR iOS returned an error. Never throws — swallowing failures is the right
// posture for a bolt-on data source.
export async function fetchEvents(from: Date, to: Date): Promise<AppleEvent[]> {
  if (Platform.OS !== 'ios') return [];

  const enabled = await isEnabledPref();
  if (!enabled) return [];

  const perm = await getPermissionStatus();
  if (perm !== 'granted') return [];

  const cacheKey = `${from.toISOString()}:${to.toISOString()}`;
  const cached = _cache.get(cacheKey);
  if (cached && (Date.now() - cached.fetchedAt) < CACHE_TTL_MS) {
    return cached.events;
  }

  try {
    // Get all iPhone calendars — user might have multiple (Home, Work,
    // Family, Holidays, etc.). We pull events from every one so Zaeli
    // shows the full picture.
    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    if (!calendars.length) {
      _cache.set(cacheKey, { events: [], fetchedAt: Date.now() });
      return [];
    }
    const ids = calendars.map(c => c.id);
    const raw = await Calendar.getEventsAsync(ids, from, to);

    // Map to our AppleEvent shape. Cross-reference each event's calendarId
    // back to the calendar list to pull the display title + colour (the
    // event object itself doesn't include them in a stable way).
    const calById = new Map(calendars.map(c => [c.id, c]));
    const mapped: AppleEvent[] = raw.map(e => {
      const cal = calById.get(e.calendarId);
      return {
        id:             `apple:${e.id}`,
        title:          e.title || '(untitled)',
        startDate:      new Date(e.startDate as any),
        endDate:        new Date(e.endDate as any),
        allDay:         !!e.allDay,
        location:       e.location || '',
        calendarTitle:  cal?.title ?? 'Calendar',
        calendarColour: cal?.color ?? '#8E8E93',
        isExternal:     true,
      };
    });

    _cache.set(cacheKey, { events: mapped, fetchedAt: Date.now() });
    return mapped;
  } catch (e:any) {
    console.log('[apple-calendar] fetchEvents error:', e?.message);
    return [];
  }
}

export function invalidateCache(): void {
  _cache.clear();
}
