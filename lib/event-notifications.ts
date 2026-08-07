/**
 * lib/event-notifications.ts — Calendar event alert notifications.
 *
 * Round B commit 29 — real event notification build. Prior state: the
 * "15 min before" toggle in Settings and the alert_rule field on events
 * both existed, but no code ever scheduled a notification. Rich created
 * events expecting alerts and got nothing.
 *
 * Design:
 *   - Local expo-notifications only (matches reminders pattern). No push.
 *   - Uses SchedulableTriggerInputTypes.DATE (0.29+ API — same lesson as
 *     commit 24's reminder trigger fix).
 *   - Fires on the DEVICE that scheduled it. If Anna creates an event on
 *     her phone, Anna's phone schedules the alert. Rich's phone doesn't
 *     re-schedule from RLS-visible events — keeps things simple and avoids
 *     N-users-N-notifs blow-up.
 *   - notif_id storage: AsyncStorage map { eventId: notifId }. Avoids a
 *     SQL migration Rich would have to run before building. Cold-start
 *     persistence via AsyncStorage; iOS keeps the scheduled notif itself
 *     across app kills (per Apple docs), so the map's only job is
 *     "which notif_id do I cancel when the event is deleted?"
 *
 * Public API:
 *   parseAlertRule(rule)              — "15 min before" → 15
 *   scheduleEventAlert(event)         — schedule (cancels any prior for this event)
 *   cancelEventAlert(eventId)         — cancel
 *   cancelManyEventAlerts(ids)        — batch cancel (for recurring delete_all)
 */

import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'event_notif_ids_v1';

let _map: Record<string, string> = {}; // eventId → notifId
let _loaded = false;

async function ensureLoaded(): Promise<void> {
  if (_loaded) return;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) _map = JSON.parse(raw);
  } catch (e:any) {
    console.log('[event-notif] load error:', e?.message);
  }
  _loaded = true;
}

async function persist(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(_map));
  } catch (e:any) {
    console.log('[event-notif] persist error:', e?.message);
  }
}

// ── Alert rule parser ────────────────────────────────────────────────────
// Accepts strings like:
//   "15 min before", "10 min before", "30 min before", "1 hour before",
//   "2 hours before", "None", "" — returns minutes or null.
export function parseAlertRule(rule?: string | null): number | null {
  if (!rule) return null;
  const s = String(rule).toLowerCase().trim();
  if (s === 'none' || s === '') return null;
  const m = s.match(/(\d+)\s*(min|hour|hr)/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  const unit = m[2];
  return unit.startsWith('hour') || unit === 'hr' ? n * 60 : n;
}

// Parse an event's start into a local Date object. Handles both shapes
// we've seen in the events table:
//   - Full ISO local: "2026-08-07T09:45:00"
//   - Bare time-of-day: "09:45" (paired with a separate date field)
// Uses local-components constructor to avoid Hermes UTC-parsing (same
// pattern as parseLocalIsoAsDate in lib/reminders.ts).
function parseEventStart(dateStr: string, startStr: string): Date | null {
  if (!startStr) return null;
  const iso = startStr.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (iso) {
    return new Date(
      parseInt(iso[1], 10),
      parseInt(iso[2], 10) - 1,
      parseInt(iso[3], 10),
      parseInt(iso[4], 10),
      parseInt(iso[5], 10),
      iso[6] ? parseInt(iso[6], 10) : 0,
    );
  }
  const bare = startStr.match(/^(\d{2}):(\d{2})/);
  if (bare && dateStr) {
    const d = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (d) {
      return new Date(
        parseInt(d[1], 10),
        parseInt(d[2], 10) - 1,
        parseInt(d[3], 10),
        parseInt(bare[1], 10),
        parseInt(bare[2], 10),
        0,
      );
    }
  }
  return null;
}

// ── Public: schedule / cancel ────────────────────────────────────────────
export interface EventForAlert {
  id: string;
  title: string;
  date: string;         // "YYYY-MM-DD"
  start_time: string;   // ISO local or bare "HH:MM"
  alert_rule?: string | null;
  reminder_minutes?: number | null;
}

// Schedule an alert notification for an event. Cancels any prior notif
// for this event first (safe if none). Returns the notif_id if scheduled,
// or null (no alert_rule / past trigger / permission denied / error).
export async function scheduleEventAlert(event: EventForAlert): Promise<string | null> {
  await ensureLoaded();

  // Cancel any prior notif for this event — handles the update case.
  const prior = _map[event.id];
  if (prior) {
    try { await Notifications.cancelScheduledNotificationAsync(prior); } catch {}
    delete _map[event.id];
  }

  const minutes = parseAlertRule(event.alert_rule) ?? event.reminder_minutes ?? null;
  if (minutes === null) {
    await persist();
    return null;
  }

  const eventStart = parseEventStart(event.date, event.start_time);
  if (!eventStart) {
    console.log('[event-notif] could not parse start —', event.date, event.start_time);
    await persist();
    return null;
  }

  const trigger = new Date(eventStart.getTime() - minutes * 60 * 1000);
  if (trigger.getTime() <= Date.now() + 1000) {
    console.log('[event-notif] skipped (past trigger) —', event.title, 'trigger:', trigger.toString());
    await persist();
    return null;
  }

  try {
    // Check permission — no point trying if denied.
    const perm = await Notifications.getPermissionsAsync();
    if (perm.status !== 'granted') {
      console.log('[event-notif] permission not granted — skipping schedule');
      return null;
    }

    const bodyMinutes = minutes === 60 ? 'Starts in 1 hour'
                      : minutes >  60 ? `Starts in ${Math.round(minutes / 60)} hours`
                      : `Starts in ${minutes} min`;

    const notifId = await Notifications.scheduleNotificationAsync({
      content: {
        title: event.title || 'Event',
        body: bodyMinutes,
        sound: 'default',
        data: { type: 'event', eventId: event.id },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: trigger,
      },
    });
    _map[event.id] = notifId;
    await persist();
    console.log('[event-notif] scheduled', event.title, '→ fires at', trigger.toString(), '· notifId:', notifId);
    return notifId;
  } catch (e:any) {
    console.log('[event-notif] schedule failed:', e?.message);
    return null;
  }
}

export async function cancelEventAlert(eventId: string): Promise<void> {
  await ensureLoaded();
  const notifId = _map[eventId];
  if (notifId) {
    try { await Notifications.cancelScheduledNotificationAsync(notifId); } catch {}
    delete _map[eventId];
    await persist();
  }
}

export async function cancelManyEventAlerts(eventIds: string[]): Promise<void> {
  await ensureLoaded();
  let changed = false;
  for (const id of eventIds) {
    const notifId = _map[id];
    if (notifId) {
      try { await Notifications.cancelScheduledNotificationAsync(notifId); } catch {}
      delete _map[id];
      changed = true;
    }
  }
  if (changed) await persist();
}
