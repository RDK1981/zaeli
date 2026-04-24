/**
 * lib/tour-state.ts — Post-onboarding tour state machine + stop definitions.
 *
 * 11 stops + finale celebration. Single source of truth: STOPS array drives
 * the /tour route render. AsyncStorage persists current stop + completion
 * timestamps so the user can leave the tour mid-stream and resume.
 *
 * Public API:
 *   loadTourState()     — read from AsyncStorage, initialise if missing
 *   getCurrentStop()    — current stop number (1..11) or 'finale'
 *   advanceStop()       — next stop, or → 'finale' when past 11
 *   replayFromStart()   — reset to stop 1, clear completion
 *   replayStop(n)       — jump to a specific stop
 *   completeTour()      — mark complete + stamp time
 *   isCompleted()       — bool
 *   getStopById(n)      — TourStop metadata
 *   STOPS               — array of all 11 stop definitions
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_STATE = 'tour_state_v1';

export type CtaTarget =
  | { kind: 'sheet'; ctx: any }       // Set pendingChatContext + nav to swipe-world
  | { kind: 'route'; path: string }   // Direct router.navigate
  | { kind: 'chat' };                 // Just go back to chat (Photos stop)

export interface TourAccent {
  cardBg: string;       // soft tint for the stop card
  pillBg: string;       // CTA primary button
  pillText: string;     // CTA primary text
  progressFill: string; // top progress bar fill
  eyebrow: string;      // tour-eyebrow label colour
  border?: string;      // optional card border (used for hero)
}

export interface TourStop {
  id: number;                // 1..11
  emoji: string;
  pageH1: string;            // big headline on tour page
  pageSub: string;           // 1-line sub under headline
  cardTitle: string;         // bold name on the card
  cardSub: string;           // longer description on the card
  trySaying: string;         // italic example phrase
  trySayingType?: 'speak' | 'tap';  // 'speak' = mint callout, 'tap' = sky callout
  features: string[];        // pill labels
  ctaLabel: string;
  ctaTarget: CtaTarget;
  accent: TourAccent;
  isHero?: boolean;          // Tutor only — bumps to violet treatment + 2 CTAs
  trialBadge?: boolean;
  priceLine?: string;
  secondaryCtaLabel?: string; // hero only
}

// ── Palette tokens (mirrors CLAUDE.md channel accents) ────────────────────
const TINT = {
  lavender:    '#F0EBFF',
  lavenderDeep:'#5020C0',
  mint:        '#E6F7EF',
  mintDeep:    '#2D7A52',
  mintLine:    '#B8EDD0',
  cobalt:      '#E0E8FE',
  cobaltDeep:  '#2055F0',
  gold:        '#FEF4D0',
  goldDeep:    '#8A6500',
  peach:       '#FFF0E8',
  peachDeep:   '#8A3A00',
  peachLine:   '#FAC8A8',
  sky:         '#E8F4FD',
  skyLine:     '#A8D8F0',
  skyDeep:     '#0A4A6A',
  violet:      '#F4ECFF',
  violetDeep:  '#6B35D9',
  magenta:     '#FCE0F0',
  magentaDeep: '#A1014F',
};

const INK = '#0A0A0A';

// ── The 11 stops ──────────────────────────────────────────────────────────
export const STOPS: TourStop[] = [
  {
    id: 1,
    emoji: '🛒',
    pageH1: 'Smart Shopping List.',
    pageSub: 'Built for chat. Add by typing, snap a receipt, or use the list directly.',
    cardTitle: 'Shopping',
    cardSub: 'Family-shared in real time. Auto-categorised. Receipt scan ticks bought items + updates pantry.',
    trySaying: '"Add milk, eggs and bread to the shopping list"',
    features: ['Chat-driven', 'Receipt scan', 'Pantry tracking', 'Spend monthly'],
    ctaLabel: 'Open Shopping →',
    ctaTarget: { kind: 'sheet', ctx: { type: 'shopping_sheet' } },
    accent: { cardBg: TINT.lavender, pillBg: INK, pillText: '#fff', progressFill: TINT.lavenderDeep, eyebrow: TINT.mintDeep },
  },
  {
    id: 2,
    emoji: '🍝',
    pageH1: 'Meal Planner.',
    pageSub: '10-day rolling plan. Recipes, favourites, pantry-aware shopping list pull.',
    cardTitle: 'Meal Planner',
    cardSub: 'Plan the week. Tap a night to swap. Heart your favourites. Snap a recipe page and I\u2019ll save it.',
    trySaying: '"Spag bol for tonight, chicken curry tomorrow"',
    features: ['10-day plan', 'Recipe library', 'Photo scan', 'Cooks per night'],
    ctaLabel: 'Open Meal Planner →',
    ctaTarget: { kind: 'sheet', ctx: { type: 'meals_sheet' } },
    accent: { cardBg: TINT.mint, pillBg: INK, pillText: '#fff', progressFill: TINT.mintDeep, eyebrow: TINT.mintDeep },
  },
  {
    id: 3,
    emoji: '\uD83D\uDCC5',
    pageH1: 'Calendar.',
    pageSub: 'Natural language works \u2014 even messy time references. Long-press a day to add inline.',
    cardTitle: 'Calendar',
    cardSub: 'Family-shared. Each member colour-coded. Snap a permission slip and I add the date for you.',
    trySaying: '"Add Poppy\u2019s dentist next Tuesday at 3pm"',
    features: ['Natural language', 'Per-member colours', 'Photo extract', 'Reminders'],
    ctaLabel: 'Open Calendar →',
    ctaTarget: { kind: 'sheet', ctx: { type: 'calendar_sheet', event: { tab: 'today' } } },
    accent: { cardBg: TINT.cobalt, pillBg: INK, pillText: '#fff', progressFill: TINT.cobaltDeep, eyebrow: TINT.mintDeep },
  },
  {
    id: 4,
    emoji: '\uD83C\uDFAE',
    pageH1: 'Kids Hub.',
    pageSub: 'Each kid gets their own. Jobs, rewards, age-tiered games. They suggest, you approve.',
    cardTitle: 'Kids Hub',
    cardSub: 'Younger kids get easier puzzles. Daily Wordle, Maths Sprint, World Trivia. Streaks + points + custom rewards.',
    trySaying: '"Give Duke a job to feed the dog this week"',
    features: ['Per-child hub', 'Jobs + approval', 'Rewards system', '5 games \u00B7 age-tiered'],
    ctaLabel: 'Open Kids Hub →',
    ctaTarget: { kind: 'route', path: '/(tabs)/kids' },
    accent: { cardBg: TINT.lavender, pillBg: INK, pillText: '#fff', progressFill: TINT.lavenderDeep, eyebrow: TINT.mintDeep },
  },
  {
    id: 5,
    emoji: '\u2713',
    pageH1: 'Tasks & Reminders.',
    pageSub: 'The mental load you can offload. Personal or shared with the whole family.',
    cardTitle: 'Tasks & Reminders',
    cardSub: 'Set-and-forget reminders with push notifications. Toggle "Shared" and the whole family sees it on their Dashboard.',
    trySaying: '"Remind me to pay the school fees Friday morning"',
    features: ['Personal + shared', 'Push reminders', 'Dashboard surface', 'Voice add'],
    ctaLabel: 'Open Tasks →',
    ctaTarget: { kind: 'sheet', ctx: { type: 'notes_tasks_sheet', tab: 'tasks' } },
    accent: { cardBg: TINT.gold, pillBg: INK, pillText: '#fff', progressFill: TINT.goldDeep, eyebrow: TINT.mintDeep },
  },
  {
    id: 6,
    emoji: '\uD83D\uDCF8',
    pageH1: 'Photos & Docs.',
    pageSub: 'Snap anything. I read what matters and put it where it belongs.',
    cardTitle: 'Photos & Docs',
    cardSub: 'Permission slips \u2192 calendar. Recipes \u2192 meal planner. Receipts \u2192 pantry + spend. Even "is this rash anything?".',
    trySaying: 'Tap the camera icon in chat. Snap a permission slip, recipe page, receipt \u2014 anything.',
    trySayingType: 'tap',
    features: ['Permission slips', 'Recipe pages', 'Receipts', 'Anything else'],
    ctaLabel: 'Open chat \u2192',
    ctaTarget: { kind: 'chat' },
    accent: { cardBg: TINT.peach, pillBg: INK, pillText: '#fff', progressFill: TINT.peachDeep, eyebrow: TINT.mintDeep },
  },
  {
    id: 7,
    emoji: '\uD83D\uDCDA',
    pageH1: 'And then there\u2019s Tutor.',
    pageSub: 'The thing that makes Zaeli different. Per-kid, curriculum-aligned, adaptive.',
    cardTitle: 'Tutor',
    cardSub: 'Maths \u00B7 English \u00B7 Science \u00B7 HASS. Foundation through Year 12. Difficulty bands shift up when they nail it, ease back when they\u2019re stuck. Parent recap after every session.',
    trySaying: '"Run a maths session with Poppy"',
    features: ['4 subjects', 'F\u201312 curriculum', '3 difficulty bands', 'Parent recap', 'Voice + photo'],
    ctaLabel: 'Open Tutor \u2192',
    ctaTarget: { kind: 'route', path: '/(tabs)/tutor' },
    accent: {
      cardBg: TINT.violet,
      pillBg: TINT.violetDeep,
      pillText: '#fff',
      progressFill: TINT.violetDeep,
      eyebrow: TINT.violetDeep,
      border: TINT.violetDeep,
    },
    isHero: true,
    trialBadge: true,
    priceLine: 'Trial includes everything \u00B7 then $9.99 / child / month',
    secondaryCtaLabel: 'Just have a look',
  },
  {
    id: 8,
    emoji: '\u2708\uFE0F',
    pageH1: 'Travel.',
    pageSub: 'Trips planned, packed, costed. Bookings auto-extracted from screenshots.',
    cardTitle: 'Travel',
    cardSub: 'Per-trip overview, bookings, packing checklist, notes. Pure Planner budget \u2014 set total + Booked auto-sums.',
    trySaying: '"Plan a trip to Bali in September"',
    features: ['Bookings', 'Packing', 'Notes', 'Per-trip budget'],
    ctaLabel: 'Open Travel \u2192',
    ctaTarget: { kind: 'route', path: '/(tabs)/travel' },
    accent: { cardBg: TINT.sky, pillBg: INK, pillText: '#fff', progressFill: TINT.skyDeep, eyebrow: TINT.mintDeep },
  },
  {
    id: 9,
    emoji: '\uD83D\uDCB0',
    pageH1: 'Our Budget.',
    pageSub: 'A planner, not a tracker. Plan the month. Hit the goals. No surprise bills.',
    cardTitle: 'Our Budget',
    cardSub: 'Income streams, fixed bills, variable categories, savings goals. AI helper turns a statement screenshot into starter line items.',
    trySaying: '"Set up a savings goal for our holiday"',
    features: ['Income streams', 'Categories', 'Savings goals', 'Statement scan'],
    ctaLabel: 'Open Our Budget \u2192',
    ctaTarget: { kind: 'route', path: '/(tabs)/our-budget' },
    accent: { cardBg: TINT.mint, pillBg: INK, pillText: '#fff', progressFill: TINT.mintDeep, eyebrow: TINT.mintDeep },
  },
  {
    id: 10,
    emoji: '\uD83C\uDF3F',
    pageH1: 'My Space.',
    pageSub: 'Your zone. Just you. Family stuff is everywhere else.',
    cardTitle: 'My Space',
    cardSub: 'Personal notes & tasks \u00B7 goals \u00B7 fitness ring \u00B7 stretch \u00B7 zen sessions \u00B7 daily Wordle. Word of the Day.',
    trySaying: '"Take me to my space" or just swipe to the My Space tile',
    features: ['Notes', 'Goals', 'Fitness', 'Wordle', 'Zen'],
    ctaLabel: 'Open My Space \u2192',
    ctaTarget: { kind: 'route', path: '/(tabs)/my-space' },
    accent: { cardBg: TINT.peach, pillBg: INK, pillText: '#fff', progressFill: TINT.peachDeep, eyebrow: TINT.mintDeep },
  },
  {
    id: 11,
    emoji: '\uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC67\u200D\uD83D\uDC66',
    pageH1: 'Our Family.',
    pageSub: 'Manage the household. Profiles, approvals, invitations.',
    cardTitle: 'Our Family',
    cardSub: 'Each member has a profile. Approve kid-suggested jobs and rewards. Invite Anna, the kids, even grandparents.',
    trySaying: '"Invite Anna to join our family"',
    features: ['Profiles', 'Approvals', 'Invites', 'Roles'],
    ctaLabel: 'Open Our Family \u2192',
    ctaTarget: { kind: 'route', path: '/(tabs)/family' },
    accent: { cardBg: TINT.magenta, pillBg: INK, pillText: '#fff', progressFill: TINT.magentaDeep, eyebrow: TINT.mintDeep },
  },
];

export const TOTAL_STOPS = STOPS.length; // 11

export type StopPosition = number | 'finale';

export interface TourState {
  currentStop: StopPosition; // 1..11 or 'finale'
  startedAt: string | null;  // ISO
  completedAt: string | null;
  lastOpenedAt: string | null;        // last time /tour mounted
  lastResumePromptAt: string | null;  // last time the inactivity prompt was shown
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

// ── Persistence ────────────────────────────────────────────────────────────
async function persist(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY_STATE, JSON.stringify(_state));
  } catch {}
}

export async function loadTourState(): Promise<TourState> {
  if (_loaded) return _state;
  try {
    const raw = await AsyncStorage.getItem(KEY_STATE);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<TourState>;
      _state = {
        currentStop: parsed.currentStop ?? 1,
        startedAt: parsed.startedAt ?? null,
        completedAt: parsed.completedAt ?? null,
        lastOpenedAt: parsed.lastOpenedAt ?? null,
        lastResumePromptAt: parsed.lastResumePromptAt ?? null,
      };
    }
  } catch {}
  _loaded = true;
  return _state;
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
  const next: StopPosition = cur >= TOTAL_STOPS ? 'finale' : cur + 1;
  _state = { ..._state, currentStop: next };
  await persist();
  return next;
}

export async function goBackStop(): Promise<StopPosition> {
  const cur = _state.currentStop;
  if (cur === 'finale') {
    _state = { ..._state, currentStop: TOTAL_STOPS };
    await persist();
    return TOTAL_STOPS;
  }
  if (cur <= 1) return 1;
  const prev = cur - 1;
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
  const clamped = Math.max(1, Math.min(TOTAL_STOPS, Math.floor(n)));
  _state = { ..._state, currentStop: clamped, lastOpenedAt: new Date().toISOString() };
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

export function getProgressPct(): number {
  const cur = _state.currentStop;
  if (cur === 'finale') return 100;
  // (cur - 1) / (TOTAL - 1) so stop 1 = 0%, stop 11 = 100% — even 10% jumps per step.
  if (TOTAL_STOPS <= 1) return 100;
  return Math.round(((cur - 1) / (TOTAL_STOPS - 1)) * 100);
}
