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
import { supabase } from './supabase';

const DUMMY_FAMILY_ID = '00000000-0000-0000-0000-000000000001';

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
        model:      'claude-sonnet-4-20250514',
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