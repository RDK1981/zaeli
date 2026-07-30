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
import { getCurrentUserId } from './auth';
import * as Notifications from 'expo-notifications';

// ── UUID ─────────────────────────────────────────────────────────────────
export function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// ── Types ────────────────────────────────────────────────────────────────
export type RepeatRule =
  | 'none'
  | 'daily'
  | 'weekdays'
  | 'weekly'
  | 'fortnightly'
  | 'monthly';

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
  const familyId = getFamilyId();
  const userId = await getCurrentUserId();
  if (!familyId || !userId) return null;

  const id = r.id ?? uuidv4();
  const isNew = !r.id;
  const createdBy = r.createdBy ?? userId;

  // Cancel any prior scheduled notification (safe if notifId is null)
  if (r.notifId) {
    try { await Notifications.cancelScheduledNotificationAsync(r.notifId); } catch {}
  }

  // Schedule new notification if timed AND caller is creator
  let notifId: string | undefined = undefined;
  if (r.remindAt && createdBy === userId) {
    try {
      const trigger = new Date(r.remindAt);
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
    remind_at:       r.remindAt ?? null,
    remind_on:       r.remindOn ?? null,
    repeat_rule:     r.repeatRule ?? null,
    repeat_group_id: r.repeatGroupId ?? null,
    status:          r.status ?? 'active',
    completed_at:    r.completedAt ?? null,
    notif_id:        notifId ?? null,
    updated_at:      new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('reminders')
    .upsert(row, { onConflict: 'id' })
    .select()
    .maybeSingle();

  if (error || !data?.id) {
    console.log('[reminders] save error:', error?.message ?? 'no data');
    // Cancel the notif we just scheduled since the row didn't land
    if (notifId) { try { await Notifications.cancelScheduledNotificationAsync(notifId); } catch {} }
    return null;
  }

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
