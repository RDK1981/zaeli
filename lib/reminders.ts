/**
 * lib/reminders.ts — Session 32 v2 Phase 05
 *
 * Reminders subsystem — the 4th pillar of Zaeli v2. Family-shared
 * visibility (everyone can see) with creator-only local notifications
 * (only the person who set it gets the phone buzz).
 *
 * Three shapes:
 *   timed     → remind_at set    → local push notification scheduled to creator
 *   date-only → remind_on set    → shows on that day in the list, no push
 *   undated   → both null        → "someday" bucket, always visible at bottom
 *
 * Recurring: same 12-month generated-instances pattern as calendar events.
 * A series shares repeat_group_id. saveReminderSeries generates instances
 * client-side (same generateRecurrenceDates helper used by calendar).
 *
 * Push notifications: local (expo-notifications) scheduled at insert time
 * for the CREATOR only. On update/delete we cancel + reschedule so the
 * scheduled OS notification stays in sync with the DB row.
 *
 * All calls scoped by RLS to the caller's family_id — no manual filter.
 */

import { supabase } from './supabase';
import { getFamilyId } from './family';
import { getCurrentUserId, waitForProfile } from './auth';
import * as Notifications from 'expo-notifications';

// ── UUID ─────────────────────────────────────────────────────────────────
export function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// ── Local ISO helpers (Round A — timezone bug fix) ─────────────────────
// Round A discovered that Hermes (RN's engine) parses "2026-07-31T13:27:00"
// as UTC, not local. To keep reminder timing sane on-device:
//
//   normaliseLocalIso: if input has no timezone suffix, extract y/m/d/h/min
//   and store back as a stable local-form ISO ("YYYY-MM-DDTHH:MM:SS"). If it
//   HAS a Z or +hh:mm suffix, convert to local wall-clock time (someone else
//   picked UTC or a specific offset; we honor it but normalise to local
//   presentation).
//
//   parseLocalIsoAsDate: given a local-form ISO with no tz suffix, build a
//   real Date object using local constructor components (never new Date(str)
//   which is engine-dependent).

function pad2(n: number): string { return String(n).padStart(2, '0'); }

export function normaliseLocalIso(s: string): string {
  if (!s) return s;
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?(Z|[+-]\d{2}:?\d{2})?$/);
  if (!m) {
    // Not an ISO pattern we recognise — trust it as-is
    return s;
  }
  const [, y, mo, d, h, mi, se, tz] = m;
  const sec = se ?? '00';
  if (!tz) {
    // No timezone → already local, just normalise the shape
    return `${y}-${mo}-${d}T${h}:${mi}:${sec}`;
  }
  // Has timezone → convert to local wall-clock components
  const asDate = new Date(s);
  return `${asDate.getFullYear()}-${pad2(asDate.getMonth() + 1)}-${pad2(asDate.getDate())}T${pad2(asDate.getHours())}:${pad2(asDate.getMinutes())}:${pad2(asDate.getSeconds())}`;
}

export function parseLocalIsoAsDate(s: string): Date {
  // Round B commit 4 — accept both naive and tz-suffixed strings.
  //
  // Naive form ("YYYY-MM-DDTHH:MM:SS", the shape saveReminder writes now):
  //   parse components and build a local Date. Wall-clock preserved.
  //
  // Tz-suffixed form (legacy rows written when the column was still
  // timestamptz — supabase returns "...+00:00" or "...Z" for those):
  //   trust new Date() to convert the offset correctly. This yields the
  //   correct absolute instant, which on-device renders as Brisbane
  //   local time via toLocaleTimeString/getHours (both of which read the
  //   device timezone). No double-conversion.
  const naive = s.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (naive) {
    const [, y, mo, d, h, mi, se] = naive;
    return new Date(
      parseInt(y, 10),
      parseInt(mo, 10) - 1,
      parseInt(d, 10),
      parseInt(h, 10),
      parseInt(mi, 10),
      se ? parseInt(se, 10) : 0,
    );
  }
  // Has a tz suffix (Z or +HH:MM). Let JS parse the absolute instant.
  return new Date(s);
}

// ── Types ────────────────────────────────────────────────────────────────
export type RepeatRule =
  | 'none'
  | 'daily'
  | 'weekdays'
  | 'weekly'
  | 'fortnightly'
  | 'monthly';

// Round B — visibility tier. Personal = only creator sees + only creator gets
// push. Shared = family sees + only creator gets push (Notify chip fires push
// to whole family on demand). Default at insert: 'personal' — matches the new
// UX where personal is the fast-path default and shared is a one-tap toggle.
export type Visibility = 'personal' | 'shared';

export interface Reminder {
  id:             string;
  familyId:       string;
  createdBy:      string;
  title:          string;
  notes?:         string;
  remindAt?:      string;   // ISO local, e.g. '2026-08-15T09:00:00' — no Z suffix
  remindOn?:      string;   // 'YYYY-MM-DD'
  repeatRule?:    RepeatRule;
  repeatGroupId?: string;
  status:         'active' | 'done' | 'cancelled';
  completedAt?:   string;
  notifId?:       string;
  visibility:     Visibility;
  createdAt:      string;
}

function rowToReminder(r: any): Reminder {
  return {
    id:             r.id,
    familyId:       r.family_id,
    createdBy:      r.created_by,
    title:          r.title,
    notes:          r.notes ?? undefined,
    remindAt:       r.remind_at ?? undefined,
    remindOn:       r.remind_on ?? undefined,
    repeatRule:     r.repeat_rule ?? undefined,
    repeatGroupId:  r.repeat_group_id ?? undefined,
    status:         r.status,
    completedAt:    r.completed_at ?? undefined,
    notifId:        r.notif_id ?? undefined,
    visibility:     (r.visibility as Visibility) ?? 'personal',
    createdAt:      r.created_at,
  };
}

// ── LOAD ─────────────────────────────────────────────────────────────────
export async function loadReminders(): Promise<Reminder[]> {
  const familyId = getFamilyId();
  if (!familyId) return [];
  const { data, error } = await supabase
    .from('reminders')
    .select('*')
    .eq('family_id', familyId)
    .in('status', ['active', 'done'])
    .order('remind_at', { ascending: true, nullsFirst: false })
    .order('remind_on', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false });
  if (error) { console.log('[reminders] load error:', error.message); return []; }
  return (data ?? []).map(rowToReminder);
}

// ── SAVE (single reminder — insert or update) ───────────────────────────
// Schedules a local notification if remindAt is set AND caller is creator.
// Cancels any existing scheduled notif on update.
export async function saveReminder(r: Partial<Reminder> & { title: string }): Promise<Reminder | null> {
  // Round B commit 8 — wait for the profile cache to populate before
  // reading familyId. Previously getFamilyId() silently returned DUMMY on
  // race → INSERT WITH CHECK failed against RLS current_family_id() → row
  // never landed → user sees "nothing happened". Now we wait up to 5s;
  // if profile still not ready, bail cleanly.
  const profile = await waitForProfile(5000);
  if (!profile) {
    console.log('[reminders/save] EXIT NULL — profile did not resolve in 5s (offline / signed-out)');
    return null;
  }
  const familyId = profile.family_id;
  const userId = profile.id;
  console.log('[reminders/save] enter — familyId:', familyId, '· userId:', userId, '· title:', r.title, '· visibility:', r.visibility, '· remindAt:', r.remindAt, '· remindOn:', r.remindOn);
  if (!familyId || !userId) {
    console.log('[reminders/save] EXIT NULL — profile loaded but missing familyId or userId');
    return null;
  }

  const id = r.id ?? uuidv4();
  const isNew = !r.id;
  const createdBy = r.createdBy ?? userId;

  // Cancel any prior scheduled notification (safe if notifId is null)
  if (r.notifId) {
    try { await Notifications.cancelScheduledNotificationAsync(r.notifId); } catch {}
  }

  // Round A fix — normalize remindAt to a genuine local-time ISO string.
  // Hermes (RN's JS engine) parses "2026-07-31T13:27:00" (no timezone) as UTC,
  // not local. So a Sonnet-issued 1:27pm Brisbane time became 11:27pm on device.
  // Explicit parse from digits keeps it unambiguous. If the string already had
  // a Z or +hh:mm suffix, we honor that (someone passed real UTC on purpose).
  const remindAt = r.remindAt ? normaliseLocalIso(r.remindAt) : undefined;

  // Schedule new notification if timed AND caller is creator
  let notifId: string | undefined = undefined;
  if (remindAt && createdBy === userId) {
    try {
      const trigger = parseLocalIsoAsDate(remindAt);
      console.log('[reminders] scheduling notif — remindAt string:', remindAt, '· parsed date:', trigger.toString(), '· now:', new Date().toString());
      if (trigger.getTime() > Date.now() + 1000) {
        notifId = await Notifications.scheduleNotificationAsync({
          content: {
            title: r.title,
            body: r.notes ?? 'Reminder',
            sound: 'default',
            data: { type: 'reminder', reminderId: id },
          },
          trigger: { date: trigger },
        });
        console.log('[reminders] scheduled ok — notifId:', notifId);
      } else {
        console.log('[reminders] SKIPPED scheduling — trigger is in the past');
      }
    } catch (e: any) {
      console.log('[reminders] schedule notif failed:', e?.message);
    }
  }

  const row = {
    id,
    family_id:       familyId,
    created_by:      createdBy,
    title:           r.title,
    notes:           r.notes ?? null,
    remind_at:       remindAt ?? null,
    remind_on:       r.remindOn ?? null,
    repeat_rule:     r.repeatRule ?? null,
    repeat_group_id: r.repeatGroupId ?? null,
    status:          r.status ?? 'active',
    completed_at:    r.completedAt ?? null,
    notif_id:        notifId ?? null,
    // Round B — visibility persists tier. New items default 'personal' per
    // Rich's UX (fast-path); user taps 📣 Notify chip to convert to 'shared'.
    visibility:      r.visibility ?? 'personal',
    updated_at:      new Date().toISOString(),
  };

  console.log('[reminders/save] upserting row — id:', row.id, '· visibility:', row.visibility, '· remind_at:', row.remind_at, '· remind_on:', row.remind_on);
  const { data, error, status, statusText } = await supabase
    .from('reminders')
    .upsert(row, { onConflict: 'id' })
    .select()
    .maybeSingle();

  console.log('[reminders/save] result — status:', status, '· statusText:', statusText, '· error:', error?.message ?? 'none', '· errCode:', (error as any)?.code, '· data.id:', data?.id ?? 'null');

  if (error || !data?.id) {
    console.log('[reminders/save] EXIT NULL — error:', error?.message ?? 'no returning row (RLS or schema)');
    // Cancel the notif we just scheduled since the row didn't land
    if (notifId) { try { await Notifications.cancelScheduledNotificationAsync(notifId); } catch {} }
    return null;
  }

  console.log('[reminders/save] OK — returning rowToReminder');
  return rowToReminder(data);
}

// ── DELETE ──────────────────────────────────────────────────────────────
export async function deleteReminder(r: Reminder): Promise<boolean> {
  if (r.notifId) {
    try { await Notifications.cancelScheduledNotificationAsync(r.notifId); } catch {}
  }
  const { error } = await supabase.from('reminders').delete().eq('id', r.id);
  if (error) { console.log('[reminders] delete error:', error.message); return false; }
  return true;
}

// ── COMPLETE / UNDO ─────────────────────────────────────────────────────
export async function markReminderDone(r: Reminder): Promise<Reminder | null> {
  if (r.notifId) {
    try { await Notifications.cancelScheduledNotificationAsync(r.notifId); } catch {}
  }
  const { data, error } = await supabase
    .from('reminders')
    .update({ status: 'done', completed_at: new Date().toISOString(), notif_id: null, updated_at: new Date().toISOString() })
    .eq('id', r.id)
    .select()
    .maybeSingle();
  if (error) { console.log('[reminders] mark done error:', error.message); return null; }
  return data ? rowToReminder(data) : null;
}

export async function unmarkReminderDone(r: Reminder): Promise<Reminder | null> {
  const { data, error } = await supabase
    .from('reminders')
    .update({ status: 'active', completed_at: null, updated_at: new Date().toISOString() })
    .eq('id', r.id)
    .select()
    .maybeSingle();
  if (error) { console.log('[reminders] unmark done error:', error.message); return null; }
  return data ? rowToReminder(data) : null;
}

// ── VISIBILITY (Round B — tier conversion) ──────────────────────────────
// Flip a reminder from personal to shared (or back). Used by the Notify chip
// after add — one tap converts personal → shared + returns the updated row so
// the UI can then fire notifyFamily separately.
// Round B commit 11 — update just the title (used by inline edit in sheet).
export async function updateReminderTitle(id: string, title: string): Promise<Reminder | null> {
  const trimmed = title.trim();
  if (!trimmed) return null;
  const { data, error } = await supabase
    .from('reminders')
    .update({ title: trimmed, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .maybeSingle();
  if (error) { console.log('[reminders] update title error:', error.message); return null; }
  if (!data?.id) return null;
  return rowToReminder(data);
}

export async function updateReminderVisibility(id: string, visibility: Visibility): Promise<Reminder | null> {
  const { data, error } = await supabase
    .from('reminders')
    .update({ visibility, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .maybeSingle();
  if (error) { console.log('[reminders] update visibility error:', error.message); return null; }
  return data ? rowToReminder(data) : null;
}

// ── RECURRING (12-month horizon, matches calendar events pattern) ───────
export function generateRecurrenceDates(startISO: string, rule: RepeatRule, horizonDays = 366, cap = 400): string[] {
  const dates: string[] = [];
  const start = new Date(startISO);
  const endTs = start.getTime() + horizonDays * 24 * 3600 * 1000;
  const push = (d: Date) => {
    if (dates.length < cap && d.getTime() < endTs) {
      dates.push(d.toISOString());
    }
  };
  const cursor = new Date(start);
  push(cursor);
  if (rule === 'none') return dates;

  let guard = 0;
  while (cursor.getTime() < endTs && guard < cap) {
    guard++;
    if (rule === 'daily') {
      cursor.setDate(cursor.getDate() + 1);
      push(cursor);
    } else if (rule === 'weekdays') {
      cursor.setDate(cursor.getDate() + 1);
      const dow = cursor.getDay();
      if (dow !== 0 && dow !== 6) push(cursor);
    } else if (rule === 'weekly') {
      cursor.setDate(cursor.getDate() + 7);
      push(cursor);
    } else if (rule === 'fortnightly') {
      cursor.setDate(cursor.getDate() + 14);
      push(cursor);
    } else if (rule === 'monthly') {
      cursor.setMonth(cursor.getMonth() + 1);
      push(cursor);
    } else {
      break;
    }
  }
  return dates;
}

// Save a whole recurring series. All instances share repeat_group_id.
// Returns the newly-inserted reminders.
export async function saveReminderSeries(input: {
  title: string;
  notes?: string;
  firstOccurrenceISO: string;   // e.g. '2026-08-15T09:00:00' local
  rule: RepeatRule;
  horizonDays?: number;
}): Promise<Reminder[]> {
  const groupId = uuidv4();
  const dates = generateRecurrenceDates(input.firstOccurrenceISO, input.rule, input.horizonDays ?? 366);
  const saved: Reminder[] = [];
  for (const iso of dates) {
    const r = await saveReminder({
      title:         input.title,
      notes:         input.notes,
      remindAt:      iso,
      repeatRule:    input.rule,
      repeatGroupId: groupId,
    });
    if (r) saved.push(r);
  }
  return saved;
}

// Delete a whole series
export async function deleteReminderSeries(groupId: string): Promise<boolean> {
  const familyId = getFamilyId();
  if (!familyId) return false;
  // Cancel all scheduled notifs first
  const { data } = await supabase.from('reminders').select('notif_id').eq('repeat_group_id', groupId).eq('family_id', familyId);
  if (data) {
    for (const row of data) {
      if (row.notif_id) {
        try { await Notifications.cancelScheduledNotificationAsync(row.notif_id); } catch {}
      }
    }
  }
  const { error } = await supabase.from('reminders').delete().eq('repeat_group_id', groupId).eq('family_id', familyId);
  if (error) { console.log('[reminders] delete series error:', error.message); return false; }
  return true;
}
