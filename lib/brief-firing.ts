/**
 * brief-firing.ts — Pure logic for deciding when to fire a Zaeli brief
 *
 * Two windows (Session 19 — reduced from 3 to 2):
 *   morning  05:00–15:59 — "Here's your day" (forward-looking)
 *   evening  16:00–04:59 — "Today's wrap + tomorrow's shape" (reflective + one step ahead)
 *
 * Midday brief was removed — it duplicated the morning forward-look and the
 * notification cost wasn't justified. Evening now covers tomorrow-morning prep.
 *
 * Rules:
 *   - New day → always fire
 *   - Window changed → fire unless user is mid-conversation (last msg <15 min ago)
 *     - If held, the mid-conversation brief fires on next app open OR after 15 min of inactivity
 *   - Same window already fired → no fire
 */

export type BriefWindow = 'morning' | 'evening';

const INACTIVITY_THRESHOLD_MS = 15 * 60 * 1000; // 15 min

export function currentWindow(now: Date = new Date()): BriefWindow {
  const h = now.getHours();
  if (h >= 5 && h < 16) return 'morning';
  return 'evening'; // 16-23 + 0-4
}

export function windowLabel(win: BriefWindow, now: Date = new Date()): string {
  const time = now.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();
  const label = win === 'morning' ? 'Morning' : 'Evening';
  return `${label} \u00B7 ${time}`;
}

export interface ShouldFireArgs {
  currentWindow: BriefWindow;
  lastBriefWindow: BriefWindow | null; // last window we fired in
  lastBriefDate: string | null;        // YYYY-MM-DD of last brief fire
  todayDate: string;                   // YYYY-MM-DD local today
  lastMessageAt: number | null;        // timestamp ms of last chat message from user
  appJustOpened: boolean;              // true on fresh mount / cold launch
}

export interface ShouldFireResult {
  fire: boolean;
  held: boolean;
  reason: string;
}

export function shouldFireBrief(args: ShouldFireArgs): ShouldFireResult {
  // 1. New day → always fire
  if (args.lastBriefDate !== args.todayDate) {
    return { fire: true, held: false, reason: 'new-day' };
  }

  // 2. Window changed → fire (unless mid-conversation)
  if (args.lastBriefWindow !== args.currentWindow) {
    const inactive = !args.lastMessageAt || (Date.now() - args.lastMessageAt) > INACTIVITY_THRESHOLD_MS;
    if (inactive || args.appJustOpened) {
      return { fire: true, held: false, reason: 'window-change-natural-break' };
    }
    return { fire: false, held: true, reason: 'window-change-mid-conversation' };
  }

  // 3. Same window, already fired today
  return { fire: false, held: false, reason: 'already-fired-this-window' };
}

/**
 * Simple string hash (djb2) — used for data_signature to detect data drift.
 * Not cryptographic — just "did the family context meaningfully change?"
 */
export function hashString(s: string): string {
  let hash = 5381;
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) + hash) + s.charCodeAt(i); // hash * 33 + c
    hash = hash | 0; // convert to 32-bit int
  }
  return Math.abs(hash).toString(16);
}
