/**
 * lib/notifications.ts
 * ─────────────────────────────────────────────────────────────
 * Zaeli Notifications System
 *
 * Handles:
 *  • Permission requests on launch
 *  • Scheduling local notifications
 *  • Cancelling notifications
 *  • Parsing natural language time from Zaeli AI
 *  • Saving reminders to Supabase
 *
 * Install required package:
 *   npx expo install expo-notifications
 * ─────────────────────────────────────────────────────────────
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from './supabase';
import { DUMMY_FAMILY_ID } from './family';
import { getCurrentUserId } from './auth';

// DUMMY_FAMILY_ID kept as the default-parameter fallback so callers without
// auth context still work. Authenticated callers should pass getFamilyId().

// ── NOTIFICATION BEHAVIOUR ────────────────────────────────────
// How notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  true,
  }),
});

// ── TYPES ─────────────────────────────────────────────────────
export type ReminderRequest = {
  title:     string;   // e.g. "Call Grandma"
  body?:     string;   // e.g. "Don't forget to call Grandma"
  remindAt:  Date;     // exact Date object for when to fire
  repeat?:   'none' | 'daily' | 'weekly';
  familyId?: string;
  todoId?:   string;   // link to a todo if applicable
};

export type ScheduledReminder = {
  id:        string;   // expo notification id
  title:     string;
  remindAt:  Date;
};

// ── BRIEF NOTIFICATION IDS (stable so re-schedule is idempotent) ──
const BRIEF_ID_MORNING = 'zaeli_brief_morning';
const BRIEF_ID_EVENING = 'zaeli_brief_evening';

// ── SCHEDULE / CANCEL DAILY BRIEF NOTIFICATIONS ──────────────
// Phase 3a — wires the morning + evening brief times from
// profiles.user_preferences into iOS local notifications. Daily
// recurring trigger fires even when the app is closed.
//
// Idempotent: caller can re-invoke whenever prefs change; this
// cancels both first then re-schedules whichever are toggled on.
//
// Skips silently if notification permission isn't granted — the
// briefs still fire in-app when chat opens, the user just doesn't
// get an OS-level reminder.
export interface BriefScheduleOpts {
  morningTime: string;   // 'HH:MM' (24h)
  eveningTime: string;
  morningOn:   boolean;
  eveningOn:   boolean;
}

export async function scheduleBriefNotifications(opts: BriefScheduleOpts): Promise<void> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;

    await cancelBriefNotifications();

    if (opts.morningOn) {
      const [h, m] = opts.morningTime.split(':').map(n => parseInt(n, 10));
      await Notifications.scheduleNotificationAsync({
        identifier: BRIEF_ID_MORNING,
        content: {
          title: '☀️ Morning brief',
          body:  'Tap to see how today shapes up.',
          sound: true,
          data:  { type: 'brief', window: 'morning' },
        },
        trigger: { type: 'daily' as any, hour: h, minute: m } as any,
      });
    }

    if (opts.eveningOn) {
      const [h, m] = opts.eveningTime.split(':').map(n => parseInt(n, 10));
      await Notifications.scheduleNotificationAsync({
        identifier: BRIEF_ID_EVENING,
        content: {
          title: '🌙 Evening brief',
          body:  "Today's wrap + tomorrow's shape.",
          sound: true,
          data:  { type: 'brief', window: 'evening' },
        },
        trigger: { type: 'daily' as any, hour: h, minute: m } as any,
      });
    }
  } catch (e: any) {
    console.log('[notifications] scheduleBriefNotifications error:', e?.message);
  }
}

export async function cancelBriefNotifications(): Promise<void> {
  try { await Notifications.cancelScheduledNotificationAsync(BRIEF_ID_MORNING); } catch {}
  try { await Notifications.cancelScheduledNotificationAsync(BRIEF_ID_EVENING); } catch {}
}

// Debug helper — returns currently-scheduled brief notification identifiers
// + their next-fire trigger. Useful for the dev rows / test plan.
export async function debugBriefNotifications(): Promise<Array<{ id: string; title: string; trigger: any }>> {
  try {
    const all = await Notifications.getAllScheduledNotificationsAsync();
    return all
      .filter(n => n.identifier === BRIEF_ID_MORNING || n.identifier === BRIEF_ID_EVENING)
      .map(n => ({
        id: n.identifier,
        title: typeof n.content.title === 'string' ? n.content.title : '',
        trigger: n.trigger,
      }));
  } catch {
    return [];
  }
}

// ── REQUEST PERMISSION ────────────────────────────────────────
// Call this on app launch from _layout.tsx
export async function requestNotificationPermission(): Promise<boolean> {
  // Simulator always returns 'granted' for testing
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('zaeli', {
      name:       'Zaeli Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#0057FF',
    });
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  
  return status === 'granted';
}

// ── SCHEDULE A REMINDER ───────────────────────────────────────
// Schedules local notification + saves to Supabase
export async function scheduleReminder(req: ReminderRequest): Promise<string | null> {
  try {
    const { title, body, remindAt, repeat = 'none', familyId = DUMMY_FAMILY_ID, todoId } = req;

    // Don't schedule if time is in the past
    if (remindAt <= new Date()) {
      console.log('Reminder time is in the past — skipping');
      return null;
    }

    // Schedule with Expo
    const secondsUntil = Math.floor((remindAt.getTime() - Date.now()) / 1000);
    if (secondsUntil < 5) {
      console.log('Reminder too soon — minimum 5 seconds');
      return null;
    }

    
    const notifId = await Notifications.scheduleNotificationAsync({
      content: {
        title: `⭐ ${title}`,
        body:  body || title,
        sound: true,
        data:  { familyId, todoId, type: 'reminder' },
      },
      trigger: repeat === 'daily' ? {
        type: 'daily' as any,
        hour:    remindAt.getHours(),
        minute:  remindAt.getMinutes(),
      } : repeat === 'weekly' ? {
        type: 'weekly' as any,
        weekday: remindAt.getDay() + 1,
        hour:    remindAt.getHours(),
        minute:  remindAt.getMinutes(),
      } : {
        type: 'timeInterval' as any,
        seconds: secondsUntil,
        repeats: false,
      },
    });

    // Save to Supabase reminders table
    await supabase.from('reminders').insert({
      family_id:  familyId,
      title,
      body:       body || title,
      remind_at:  remindAt.toISOString(),
      repeat,
      notif_id:   notifId,
      status:     'pending',
      source:     'zaeli_ai',
    });

    // If linked to a todo, update that todo's notif_id
    if (todoId) {
      await supabase
        .from('todos')
        .update({ notif_id: notifId, reminder_time: remindAt.toISOString() })
        .eq('id', todoId);
    }

    console.log(`✅ Reminder scheduled: "${title}" at ${remindAt.toLocaleString()} — id: ${notifId}`);
    return notifId;
  } catch (e: any) {
    console.log('Schedule reminder error:', JSON.stringify(e), e?.message);
    return null;
  }
}

// ── CANCEL A REMINDER ─────────────────────────────────────────
export async function cancelReminder(notifId: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(notifId);
    await supabase
      .from('reminders')
      .update({ status: 'cancelled' })
      .eq('notif_id', notifId);
    console.log(`❌ Reminder cancelled: ${notifId}`);
  } catch (e) {
    console.log('Cancel reminder error:', e);
  }
}

// ── GET ALL PENDING REMINDERS ─────────────────────────────────
export async function getPendingReminders(): Promise<ScheduledReminder[]> {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    return scheduled.map(n => ({
      id:       n.identifier,
      title:    n.content.title?.replace('⭐ ', '') || '',
      remindAt: new Date((n.trigger as any)?.value || Date.now()),
    }));
  } catch {
    return [];
  }
}

// ── PARSE NATURAL LANGUAGE TIME ───────────────────────────────
// Called after Claude detects a reminder request.
// Takes Claude's extracted JSON and converts to a real Date.
export function parseReminderTime(
  timeStr: string,   // e.g. "5pm", "tomorrow 9am", "in 2 hours", "Friday 3:30pm"
  referenceDate: Date = new Date()
): Date | null {
  try {
    const now    = new Date(referenceDate);
    const lower  = timeStr.toLowerCase().trim();

    // "in X minutes/hours"
    const inMatch = lower.match(/in (\d+) (minute|hour)s?/);
    if (inMatch) {
      const amount = parseInt(inMatch[1]);
      const unit   = inMatch[2];
      const result = new Date(now);
      if (unit === 'minute') result.setMinutes(result.getMinutes() + amount);
      if (unit === 'hour')   result.setHours(result.getHours() + amount);
      return result;
    }

    // Parse time component (e.g. "5pm", "9:30am", "17:00")
    const parseTime = (t: string, base: Date): Date | null => {
      const d = new Date(base);
      // "5pm" / "5:30pm" / "17:00"
      const m = t.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
      if (!m) return null;
      let hours   = parseInt(m[1]);
      const mins  = parseInt(m[2] || '0');
      const ampm  = m[3]?.toLowerCase();
      if (ampm === 'pm' && hours < 12) hours += 12;
      if (ampm === 'am' && hours === 12) hours = 0;
      d.setHours(hours, mins, 0, 0);
      return d;
    };

    // "today at 5pm" / "5pm today"
    if (lower.includes('today')) {
      const timeOnly = lower.replace(/today|at/g, '').trim();
      return parseTime(timeOnly, now);
    }

    // "tomorrow at 9am"
    if (lower.includes('tomorrow')) {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const timeOnly = lower.replace(/tomorrow|at/g, '').trim();
      return parseTime(timeOnly, tomorrow) || tomorrow;
    }

    // "monday", "tuesday" etc
    const days = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
    for (let i = 0; i < days.length; i++) {
      if (lower.includes(days[i])) {
        const target = new Date(now);
        const diff   = (i - now.getDay() + 7) % 7 || 7;
        target.setDate(target.getDate() + diff);
        const timeOnly = lower.replace(days[i], '').replace('at','').trim();
        return parseTime(timeOnly, target) || target;
      }
    }

    // Just a time like "5pm" — assume today, or tomorrow if already past
    const parsed = parseTime(lower, now);
    if (parsed) {
      if (parsed <= now) parsed.setDate(parsed.getDate() + 1); // push to tomorrow if past
      return parsed;
    }

    return null;
  } catch {
    return null;
  }
}

// ── FAMILY PUSH NOTIFICATIONS (Session 29 ⭐) ─────────────────
// Store this device's Expo push token in profiles.expo_push_token so the
// family-notify Edge Function can look it up when another family member wants
// to ping this device. Idempotent — safe to call on every auth SIGNED_IN.
//
// Skips silently on:
//   - Simulators (Expo push doesn't deliver to simulators)
//   - No signed-in user
//   - Permission denied (no point registering — pushes wouldn't display)
//   - No projectId (misconfigured build)
export async function registerPushToken(): Promise<string | null> {
  try {
    // Note: simulators return valid-format Expo tokens but pushes to them
    // silently fail server-side (Expo returns DeviceNotRegistered). We skip
    // adding expo-device dependency and rely on that silent-failure model.
    const userId = await getCurrentUserId();
    if (!userId) {
      console.log('[push] No signed-in user, skipping');
      return null;
    }

    // Ensure permission first — if the user hasn't granted, don't request the
    // token (registering a token without granted permission is fine but pointless).
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      console.log('[push] Permission not granted, skipping token registration');
      return null;
    }

    // Expo push tokens require the projectId in newer SDKs. Read from Constants —
    // in dev-client it comes from app.json's expo.extra.eas.projectId, in a
    // built app it's baked in at build time.
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      (Constants as any)?.easConfig?.projectId ??
      undefined;

    const tokenResult = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    const token = tokenResult.data;

    if (!token || !token.startsWith('ExponentPushToken[')) {
      console.log('[push] Got unexpected token format:', token);
      return null;
    }

    // Write to profiles. Only update if it changed (avoid unnecessary writes
    // on every app open — most opens the token is the same).
    const { data: existing } = await supabase
      .from('profiles')
      .select('expo_push_token')
      .eq('id', userId)
      .maybeSingle();

    if (existing?.expo_push_token === token) {
      // Already current — no write needed.
      return token;
    }

    const { error } = await supabase
      .from('profiles')
      .update({ expo_push_token: token })
      .eq('id', userId);

    if (error) {
      console.log('[push] Failed to write token to profile:', error.message);
      return null;
    }

    console.log('[push] Registered token for user', userId, '→', token.slice(0, 30) + '...');
    return token;
  } catch (e: any) {
    console.log('[push] registerPushToken error:', e?.message);
    return null;
  }
}

// Session 29/30 — verbose diagnostic. Wraps EVERY external call in its own
// try/catch and captures typeof checks on the Notifications module so we
// can pinpoint whether the failure is auth, expo-notifications module link,
// APNs entitlement, or the DB write.
export async function debugPushToken(): Promise<{
  ok: boolean;
  step: string;
  detail: string;
  userId?: string | null;
  permission?: string;
  projectId?: string;
  token?: string;
  dbWriteOk?: boolean;
  notifTypes?: string;
}> {
  // Step 0 — sanity check that expo-notifications module actually linked at native level
  const notifTypes = `getPermissionsAsync=${typeof Notifications.getPermissionsAsync}, getExpoPushTokenAsync=${typeof Notifications.getExpoPushTokenAsync}`;
  if (typeof Notifications.getExpoPushTokenAsync !== 'function') {
    return { ok: false, step: 'module', detail: `expo-notifications module not linked: ${notifTypes}`, notifTypes };
  }

  // Step 1 — auth (fixed: getCurrentUserId is async, must await)
  let userId: string | null = null;
  try {
    userId = await getCurrentUserId();
  } catch (e: any) {
    return { ok: false, step: 'auth', detail: `getCurrentUserId threw: ${e?.message ?? e}`, notifTypes };
  }
  if (!userId) return { ok: false, step: 'auth', detail: 'getCurrentUserId returned null (no signed-in user)', userId: null, notifTypes };

  // Step 2 — permission
  let permission: string = 'unknown';
  try {
    const p = await Notifications.getPermissionsAsync();
    permission = p.status;
  } catch (e: any) {
    return { ok: false, step: 'permissions', detail: `getPermissionsAsync threw: ${e?.message ?? e}`, userId, notifTypes };
  }
  if (permission !== 'granted') {
    return { ok: false, step: 'permissions', detail: `status='${permission}' (not granted)`, userId, permission, notifTypes };
  }

  // Step 3 — projectId
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    (Constants as any)?.easConfig?.projectId ??
    undefined;
  if (!projectId) {
    return { ok: false, step: 'projectId', detail: 'No projectId in Constants.expoConfig.extra.eas.projectId or Constants.easConfig.projectId', userId, permission, notifTypes };
  }

  // Step 4 — request token from Expo/APNs
  let token: string;
  try {
    const tokenResult = await Notifications.getExpoPushTokenAsync({ projectId });
    token = tokenResult?.data;
  } catch (e: any) {
    return {
      ok: false,
      step: 'getExpoPushTokenAsync',
      detail: `THREW: ${e?.message ?? e}${e?.code ? ` (code: ${e.code})` : ''}`,
      userId, permission, projectId, notifTypes,
    };
  }

  if (!token) {
    return { ok: false, step: 'token-format', detail: 'getExpoPushTokenAsync returned null/undefined data', userId, permission, projectId, notifTypes };
  }
  if (!token.startsWith('ExponentPushToken[')) {
    return { ok: false, step: 'token-format', detail: `Unexpected format: ${token}`, userId, permission, projectId, token, notifTypes };
  }

  // Step 5 — DB write
  try {
    const { error: writeErr } = await supabase.from('profiles').update({ expo_push_token: token }).eq('id', userId);
    if (writeErr) {
      return { ok: false, step: 'db-write', detail: `Supabase update failed: ${writeErr.message}`, userId, permission, projectId, token, dbWriteOk: false, notifTypes };
    }
  } catch (e: any) {
    return { ok: false, step: 'db-write', detail: `Supabase update threw: ${e?.message ?? e}`, userId, permission, projectId, token, dbWriteOk: false, notifTypes };
  }
  return { ok: true, step: 'done', detail: 'Token registered + DB write confirmed', userId, permission, projectId, token, dbWriteOk: true, notifTypes };
}

// Clear this device's push token on sign-out so pushes don't keep landing
// after the user has left the account.
export async function unregisterPushToken(): Promise<void> {
  try {
    const userId = getCurrentUserId();
    if (!userId) return;
    await supabase.from('profiles').update({ expo_push_token: null }).eq('id', userId);
  } catch { /* silent */ }
}

// Send a push notification to family members via the family-notify Edge Function.
// The function verifies the caller (JWT) shares a family with each recipient
// before it looks up their tokens — so we can safely pass any user IDs here
// and the server enforces boundaries.
//
// Returns:
//   - sent:   number of pushes actually dispatched to Expo
//   - failed: number of recipients whose token was missing or dispatch failed
//   - error:  populated only on total-failure (network, function down)
export interface NotifyFamilyResult {
  sent:   number;
  failed: number;
  error?: string;
}

export async function notifyFamily(params: {
  recipientUserIds: string[];
  title:            string;
  body:             string;
  data?:            Record<string, any>;
}): Promise<NotifyFamilyResult> {
  try {
    if (!params.recipientUserIds.length) {
      return { sent: 0, failed: 0 };
    }

    const { data: sess } = await supabase.auth.getSession();
    const jwt = sess?.session?.access_token;
    if (!jwt) {
      return { sent: 0, failed: params.recipientUserIds.length, error: 'no-session' };
    }

    const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
    const url = `${SUPABASE_URL}/functions/v1/family-notify`;

    const res = await fetch(url, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${jwt}`,
      },
      body: JSON.stringify({
        recipient_user_ids: params.recipientUserIds,
        title:              params.title,
        body:               params.body,
        data:               params.data ?? {},
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return { sent: 0, failed: params.recipientUserIds.length, error: `${res.status}: ${text.slice(0, 200)}` };
    }

    const json = await res.json();
    return {
      sent:   json.sent   ?? 0,
      failed: json.failed ?? 0,
    };
  } catch (e: any) {
    return { sent: 0, failed: params.recipientUserIds.length, error: e?.message ?? 'unknown' };
  }
}

// ── DETECT REMINDER INTENT FROM AI RESPONSE ──────────────────
// Pass the user message + Zaeli's reply.
// First tries simple keyword detection (fast, no API call).
// Falls back to Claude extraction for complex cases.
export async function detectReminderIntent(
  userMessage:     string,
  assistantReply:  string,
  familyId:        string = DUMMY_FAMILY_ID
): Promise<ReminderRequest | null> {
  try {
    const lower = userMessage.toLowerCase();

    // Quick keyword check — only call Claude if reminder-related
    const reminderKeywords = ['remind', 'reminder', 'alert', 'alarm', 'don\'t forget', 'notify', 'tell me', 'wake me'];
    const hasReminderIntent = reminderKeywords.some(k => lower.includes(k));
    if (!hasReminderIntent) return null;

    // Ask Claude to extract the reminder details as JSON
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':                              'application/json',
        'x-api-key':                                 process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY || '',
        'anthropic-version':                         '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model:      'claude-sonnet-4-6',
        max_tokens: 100,
        system: `Extract reminder details from this user message. Return ONLY valid JSON, nothing else, no markdown:
{"isReminder":true,"title":"short task title max 6 words","time":"time string e.g. 5pm, tomorrow 9am, in 2 hours, friday 3pm","repeat":"none"}
If not a reminder request return ONLY: {"isReminder":false}
Today is ${new Date().toDateString()}. Current time is ${new Date().toLocaleTimeString('en-AU',{hour:'numeric',minute:'2-digit',hour12:true})}.`,
        messages: [{ role:'user', content: userMessage }],
      }),
    });

    if (!res.ok) {
      console.log('detectReminderIntent API error:', res.status);
      return null;
    }

    const d    = await res.json();
    const text = (d.content?.[0]?.text || '{"isReminder":false}').trim();

    // Strip any accidental markdown fences
    const clean = text.replace(/```json|```/g, '').trim();
    const json  = JSON.parse(clean);

    if (!json.isReminder) return null;

    const remindAt = parseReminderTime(json.time);
    if (!remindAt) {
      console.log('Could not parse reminder time:', json.time);
      return null;
    }

    console.log(`🔔 Reminder detected: "${json.title}" at ${remindAt.toLocaleString()}`);
    return {
      title:    json.title,
      body:     `Zaeli reminder: ${json.title}`,
      remindAt,
      repeat:   json.repeat || 'none',
      familyId,
    };
  } catch (e) {
    console.log('detectReminderIntent error:', e);
    return null;
  }
}