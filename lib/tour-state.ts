/**
 * lib/tour-state.ts — Post-onboarding tour state machine + stop definitions.
 *
 * Round B commit 21 (v2 rewrite): 11 stops → 5 stops + finale, matching
 * zaeli-v2-tour-mockup.html. All Session 19 hidden-feature stops removed
 * (Meal Planner / Kids Hub / Tutor HERO / Travel / My Space / Our Family
 * / Photos & Docs — the last is now a feature pill inside Shopping/Chat
 * stops rather than its own stop). Tutor HERO gone with it (trialBadge /
 * priceLine / secondaryCtaLabel kept in the type so we don't have to touch
 * the /tour route render, just omitted from all v2 stops).
 *
 * v2 stops:
 *   1. Welcome + Home (coral, kind: 'advance' — CTA "Let's go →" just moves)
 *   2. Calendar (slate)
 *   3. Shopping (lavender)
 *   4. Reminders & To-dos (gold)
 *   5. Chat with Zaeli (sky)
 *   finale — "You're set" celebration (Budget + Family invite callouts)
 *
 * Persistence: profile.tour_state JSONB when signed in, AsyncStorage otherwise.
 *
 * Public API surface unchanged from Round B so call sites (chat tour pill,
 * /tour route, settings replay picker) work as-is:
 *   loadTourState / getCurrentStop / advanceStop / goBackStop / skipToFinale
 *   completeTour / replayFromStart / replayStop(n) / isCompleted / isInProgress
 *   getStopById(n) / getEffectiveStops / getEffectiveTotal / getProgressPct
 *   STOPS / TOTAL_STOPS
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadAccount } from './account-state';
import { supabase } from './supabase';

const KEY_STATE = 'tour_state_v1';

// v2 note: KID_SKIP_IDS retired. The 5 v2 stops (Home / Calendar / Shopping /
// Reminders / Chat) are all universal features — kids see the same walkthrough
// as adults. Budget + Family were the kid-skip stops in v1; v2 puts Budget in
// the finale (mention only, no walkthrough stop) and Family in the invite
// modal (not part of the tour).

export type CtaTarget =
  | { kind: 'advance' }               // Just move to next stop, no nav
  | { kind: 'sheet'; ctx: any }       // Set pendingChatContext + nav to swipe-world
  | { kind: 'route'; path: string }   // Direct router.navigate
  | { kind: 'chat' };                 // Nav to swipe-world (lands on Chat)

export interface TourAccent {
  cardBg: string;
  pillBg: string;
  pillText: string;
  progressFill: string;
  eyebrow: string;
  border?: string;
}

export interface TourStop {
  id: number;
  emoji: string;
  pageH1: string;
  pageSub: string;
  cardTitle: string;
  cardSub: string;
  trySaying: string;
  trySayingType?: 'speak' | 'tap';
  features: string[];
  ctaLabel: string;
  ctaTarget: CtaTarget;
  accent: TourAccent;
  // Legacy Session 19 HERO fields — kept in the type so the /tour route
  // render doesn't need edits, but omitted from every v2 stop.
  isHero?: boolean;
  trialBadge?: boolean;
  priceLine?: string;
  secondaryCtaLabel?: string;
}

const TINT = {
  slate:      '#E3E7EE',    // Calendar identity tint (matches Home tile bg-derived)
  slateDeep:  '#2D3748',
  lavender:   '#F0EBFF',
  lavenderDeep:'#5020C0',
  gold:       '#FEF4D0',
  goldDeep:   '#8A6500',
  sky:        '#E8F4FD',
  skyLine:    '#A8D8F0',
  skyDeep:    '#0A4A6A',
  coral:      '#FF4545',
  coralSoft:  '#FFE4E0',
  mintDeep:   '#2D7A52',
  peach:      '#F5EDE3',
  peachDeep:  '#8A3A00',
};

const INK = '#0A0A0A';

// ── The 5 v2 stops ────────────────────────────────────────────────────────
export const STOPS: TourStop[] = [
  {
    id: 1,
    emoji: '👋',
    pageH1: 'Welcome to your family hub.',
    pageSub: 'Home is where everything lives at a glance. Four tiles, one per thing your family juggles — no digging.',
    cardTitle: 'Home',
    cardSub: 'Calendar · Shopping · Reminders · Budget — all in one glance. Tap a tile to open. Tap the mic to speak.',
    trySaying: '"Zaeli, what’s on today?"',
    features: ['📅 Calendar', '🛒 Shopping', '⏰ Reminders', '💰 Budget'],
    ctaLabel: 'Let’s go →',
    ctaTarget: { kind: 'advance' },
    accent: {
      cardBg: TINT.coralSoft,
      pillBg: TINT.coral,
      pillText: '#fff',
      progressFill: TINT.coral,
      eyebrow: TINT.coral,
    },
  },
  {
    id: 2,
    emoji: '📅',
    pageH1: 'Your family’s calendar.',
    pageSub: 'Every event, every kid. Tap a tile → today, tomorrow, or the whole month. Tap + Add event to drop something in fast.',
    cardTitle: 'Calendar',
    cardSub: 'Family-shared, per-member colours. Snap a permission slip — I’ll pull the date. Voice-add works with messy time refs.',
    trySaying: '"Add soccer for Gab, Thursday 4pm."',
    features: ['👨‍👩‍👧‍👦 Whole family', '📸 Photo → event', '🎤 Voice add'],
    ctaLabel: 'Open Calendar →',
    ctaTarget: { kind: 'sheet', ctx: { type: 'calendar_sheet', event: { tab: 'today' } } },
    accent: {
      cardBg: TINT.slate,
      pillBg: TINT.slateDeep,
      pillText: '#fff',
      progressFill: TINT.slateDeep,
      eyebrow: TINT.slateDeep,
    },
  },
  {
    id: 3,
    emoji: '🛒',
    pageH1: 'The shopping list everyone shares.',
    pageSub: 'One list, whole family. Tap to tick off. Scan a receipt and Zaeli extracts every item into your history. Fast enough to beat Notes.',
    cardTitle: 'Shopping',
    cardSub: 'Family-shared in real time. Auto-categorised. Receipt scan ticks bought items + updates pantry. Voice-add multiple items in one go.',
    trySaying: '"Add milk, eggs, and Cocoa Pops."',
    features: ['🧾 Scan receipts', '🥬 Pantry tracking', '💰 Monthly spend'],
    ctaLabel: 'Open Shopping →',
    ctaTarget: { kind: 'sheet', ctx: { type: 'shopping_sheet' } },
    accent: {
      cardBg: TINT.lavender,
      pillBg: TINT.lavenderDeep,
      pillText: '#fff',
      progressFill: TINT.lavenderDeep,
      eyebrow: TINT.lavenderDeep,
    },
  },
  {
    id: 4,
    emoji: '⏰',
    pageH1: 'Never forget the little things.',
    pageSub: 'Timed reminders, date-only, or someday to-dos. Personal by default — one tap makes them family-shared.',
    cardTitle: 'Reminders & To-dos',
    cardSub: '🔒 Personal (only you see it, only you get the push) or 👥 Shared (family sees it, still only you get the push). One-tap toggle after add.',
    trySaying: '"Remind me to call Mum at 6pm."',
    features: ['🔒 Personal', '👥 Family shared', '🔔 Push at time'],
    ctaLabel: 'Open Reminders →',
    ctaTarget: { kind: 'sheet', ctx: { type: 'reminders_sheet' } },
    accent: {
      cardBg: TINT.gold,
      pillBg: TINT.goldDeep,
      pillText: '#fff',
      progressFill: TINT.goldDeep,
      eyebrow: TINT.goldDeep,
    },
  },
  {
    id: 5,
    emoji: '💬',
    pageH1: 'Talk to Zaeli directly.',
    pageSub: 'Swipe left from Home to chat. Type, tap the mic, or drop a photo — she’ll add events, reminders, shopping, or just chat.',
    cardTitle: 'Chat',
    cardSub: 'Voice, photo, or text. Sonnet parses natural language into real actions. Ask her to text a family member and she’ll fire a push (with your name attached).',
    trySaying: '"Text Anna I’ll be 15 mins late."',
    features: ['🎤 Voice', '📷 Photo → data', '👨‍👩‍👧 Family reach'],
    ctaLabel: 'Open Chat →',
    ctaTarget: { kind: 'chat' },
    accent: {
      cardBg: TINT.sky,
      pillBg: TINT.skyDeep,
      pillText: '#fff',
      progressFill: TINT.skyDeep,
      eyebrow: TINT.skyDeep,
    },
  },
];

export const TOTAL_STOPS = STOPS.length; // 5

export type StopPosition = number | 'finale';

export interface TourState {
  currentStop: StopPosition;
  startedAt: string | null;
  completedAt: string | null;
  lastOpenedAt: string | null;
  lastResumePromptAt: string | null;
}

const DEFAULT_STATE: TourState = {
  currentStop: 1,
  startedAt: null,
  completedAt: null,
  lastOpenedAt: null,
  lastResumePromptAt: null,
};

let _state: TourState = { ...DEFAULT_STATE };
let _loaded = false;

// ── Persistence (write-through to profile + AsyncStorage) ────────────────
async function persist(): Promise<void> {
  // AsyncStorage write — fire-and-forget for offline + fast restart.
  AsyncStorage.setItem(KEY_STATE, JSON.stringify(_state)).catch(() => {});

  // Profile write — only if signed in. Same fire-and-forget; cache stays
  // authoritative locally until next loadTourState().
  try {
    const { data } = await supabase.auth.getSession();
    const userId = data?.session?.user?.id;
    if (!userId) return;
    await supabase
      .from('profiles')
      .update({ tour_state: _state })
      .eq('id', userId);
  } catch (e: any) {
    // Network blips are fine — AsyncStorage already has the latest.
    console.log('[tour] persist DB error:', e?.message);
  }
}

export async function loadTourState(): Promise<TourState> {
  // Always make sure account is loaded too — some downstream callers check
  // isKidAccount() to alter behaviour (kept for compat even though v2 tour
  // no longer branches on account kind).
  await loadAccount();
  if (_loaded) return _state;

  // Phase 2d — when signed in, profile is the ONLY source of truth (even
  // if it's null = fresh user). Don't fall back to AsyncStorage because
  // it might still hold the previous user's data. Only the unsigned-in
  // path (kid receivers mid-onboarding) reads from AsyncStorage.
  let signedIn = false;
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    if (userId) {
      signedIn = true;
      const { data, error } = await supabase
        .from('profiles')
        .select('tour_state')
        .eq('id', userId)
        .single();
      if (!error && data?.tour_state) {
        _state = sanitiseState(data.tour_state);
      } else {
        // Signed-in user with no saved tour_state yet — start clean.
        _state = { ...DEFAULT_STATE };
      }
    }
  } catch (e: any) {
    console.log('[tour] load DB error:', e?.message);
  }

  if (!signedIn) {
    try {
      const raw = await AsyncStorage.getItem(KEY_STATE);
      if (raw) _state = sanitiseState(JSON.parse(raw));
    } catch {}
  }

  // Guard against stale state from Session 19 v1 (currentStop could be 6-11).
  // If the persisted stop id isn't in the v2 STOPS array and isn't 'finale',
  // reset to stop 1 so the user starts the v2 tour cleanly.
  if (typeof _state.currentStop === 'number') {
    const valid = STOPS.some(s => s.id === _state.currentStop);
    if (!valid) {
      console.log('[tour] stale v1 stop', _state.currentStop, '→ resetting to 1');
      _state = { ..._state, currentStop: 1 };
      await persist();
    }
  }

  _loaded = true;
  return _state;
}

// Phase 2d — clear cache so next loadTourState() re-fetches from profile.
// Called from _layout.tsx onAuthChange so a new user doesn't see the
// previous user's tour progress.
export function invalidateCache(): void {
  _loaded = false;
  _state = { ...DEFAULT_STATE };
}

function sanitiseState(parsed: any): TourState {
  return {
    currentStop:        parsed?.currentStop ?? 1,
    startedAt:          parsed?.startedAt ?? null,
    completedAt:        parsed?.completedAt ?? null,
    lastOpenedAt:       parsed?.lastOpenedAt ?? null,
    lastResumePromptAt: parsed?.lastResumePromptAt ?? null,
  };
}

// ── Effective stops (v2: kids + adults see the same 5 stops) ─────────────
// Kept as a function so call sites don't need to change from Session 19.
export function getEffectiveStops(): TourStop[] {
  return STOPS;
}

export function getEffectiveTotal(): number {
  return STOPS.length;
}

// ── Public API ─────────────────────────────────────────────────────────────
export function getCurrentStop(): StopPosition {
  return _state.currentStop;
}

export function getState(): TourState {
  return { ..._state };
}

export async function startTourIfNeeded(): Promise<void> {
  if (!_state.startedAt) {
    _state = { ..._state, startedAt: new Date().toISOString() };
    await persist();
  }
}

export async function markOpened(): Promise<void> {
  _state = { ..._state, lastOpenedAt: new Date().toISOString() };
  await persist();
}

export async function advanceStop(): Promise<StopPosition> {
  const cur = _state.currentStop;
  if (cur === 'finale') return 'finale';
  const stops = getEffectiveStops();
  const idx = stops.findIndex(s => s.id === cur);
  let next: StopPosition;
  if (idx < 0) {
    next = stops[0]?.id ?? 'finale';
  } else if (idx >= stops.length - 1) {
    next = 'finale';
  } else {
    next = stops[idx + 1].id;
  }
  _state = { ..._state, currentStop: next };
  await persist();
  return next;
}

export async function goBackStop(): Promise<StopPosition> {
  const stops = getEffectiveStops();
  const cur = _state.currentStop;
  if (cur === 'finale') {
    const last = stops[stops.length - 1]?.id ?? 1;
    _state = { ..._state, currentStop: last };
    await persist();
    return last;
  }
  const idx = stops.findIndex(s => s.id === cur);
  if (idx <= 0) return cur;
  const prev = stops[idx - 1].id;
  _state = { ..._state, currentStop: prev };
  await persist();
  return prev;
}

export async function skipToFinale(): Promise<void> {
  _state = { ..._state, currentStop: 'finale' };
  await persist();
}

export async function completeTour(): Promise<void> {
  _state = {
    ..._state,
    currentStop: 'finale',
    completedAt: new Date().toISOString(),
  };
  await persist();
}

export async function replayFromStart(): Promise<void> {
  _state = {
    currentStop: 1,
    startedAt: new Date().toISOString(),
    completedAt: null,
    lastOpenedAt: new Date().toISOString(),
    lastResumePromptAt: null,
  };
  await persist();
}

// ── Inactivity resume prompt ───────────────────────────────────────────────
const RESUME_INACTIVE_HOURS = 24;
const RESUME_PROMPT_COOLDOWN_HOURS = 24;

export async function markResumePromptShown(): Promise<void> {
  _state = { ..._state, lastResumePromptAt: new Date().toISOString() };
  await persist();
}

export function shouldShowResumePrompt(): boolean {
  if (!isInProgress()) return false;
  if (!_state.lastOpenedAt) return false;

  const hoursSinceOpened =
    (Date.now() - new Date(_state.lastOpenedAt).getTime()) / 1000 / 3600;
  if (hoursSinceOpened < RESUME_INACTIVE_HOURS) return false;

  if (_state.lastResumePromptAt) {
    const hoursSincePrompt =
      (Date.now() - new Date(_state.lastResumePromptAt).getTime()) / 1000 / 3600;
    if (hoursSincePrompt < RESUME_PROMPT_COOLDOWN_HOURS) return false;
  }
  return true;
}

export async function replayStop(n: number): Promise<void> {
  const stops = getEffectiveStops();
  const valid = stops.find(s => s.id === n);
  const target = valid ? valid.id : (stops[0]?.id ?? 1);
  _state = { ..._state, currentStop: target, lastOpenedAt: new Date().toISOString() };
  await persist();
}

export function isCompleted(): boolean {
  return _state.completedAt !== null;
}

export function isInProgress(): boolean {
  return _state.startedAt !== null && _state.completedAt === null;
}

export function getStopById(id: number): TourStop | undefined {
  return STOPS.find(s => s.id === id);
}

// v2 progress: 5 stops → 0 / 20 / 40 / 60 / 80. Finale = 100.
// Matches the mockup's per-stop progress fill widths.
export function getProgressPct(): number {
  const cur = _state.currentStop;
  if (cur === 'finale') return 100;
  const stops = getEffectiveStops();
  if (stops.length === 0) return 0;
  const idx = stops.findIndex(s => s.id === cur);
  if (idx < 0) return 0;
  return Math.round((idx / stops.length) * 100);
}
