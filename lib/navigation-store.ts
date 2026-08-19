/**
 * lib/navigation-store.ts
 * 
 * Module-level store for passing context between Dashboard and Chat.
 * Same pattern as getPendingCalendarImage in calendar.tsx — production ready.
 * 
 * Usage:
 *   Dashboard: setPendingChatContext({ type:'edit_event', event:ev, returnTo:'dashboard' })
 *              then router.navigate('/(tabs)/')
 *   Chat:      const ctx = getPendingChatContext(); clearPendingChatContext();
 */

export type ChatEntryContext = {
  type: 'edit_event' | 'add_event' | 'shopping' | 'actions' | 'meals' | 'notes_tasks_sheet' | 'reminders_sheet' | 'calendar_view' | 'shopping_sheet' | null;
  event?:    any;     // for edit_event — full event object
  tab?:      'notes' | 'tasks';   // for notes_tasks_sheet — which tab to open
  // Round B — when set on 'calendar_view', the calendar sheet opens
  // directly into the manual add form for today (skipping the
  // "tap + Add event → tap Add manually" two-tap flow).
  openAdd?:  boolean;
  returnTo?: 'dashboard';
};

let _pending: ChatEntryContext = { type: null };

export function setPendingChatContext(ctx: ChatEntryContext): void {
  _pending = ctx;
}

export function getPendingChatContext(): ChatEntryContext {
  return _pending;
}

export function clearPendingChatContext(): void {
  _pending = { type: null };
}

export function hasPendingChatContext(): boolean {
  return _pending.type !== null;
}

// ── Tour resume-on-sheet-close (Round B commit 25) ───────────────────────
// When the tour's primary CTA opens a sheet, we set this flag so that when
// the sheet's Modal dismisses, we auto-navigate back to /tour and resume at
// the next stop. Without this, users close the sheet and land on Home/Chat
// without a clear path back to the tour (the Chat tour pill exists but is a
// swipe away in v2's sheet-over-Home world). Rich flagged: "some people
// might just get lost mid tour."
//
// Cleared by:
//  - consumeTourResumePending() — after dismiss handler re-navigates
//  - clearTourResumePending()   — when user explicitly closes tour (X /
//                                 skip-to-end / finale complete)
let _tourResumePending = false;

export function setTourResumePending(v: boolean): void {
  _tourResumePending = v;
}

export function consumeTourResumePending(): boolean {
  const v = _tourResumePending;
  _tourResumePending = false;
  return v;
}

export function clearTourResumePending(): void {
  _tourResumePending = false;
}

// ── Family screen origin flag ────────────────────────────────────────────
// When Settings opens Our Family, it sets this so family's back button
// returns to Settings instead of the default (swipe-world).
let _familyFrom: 'settings' | null = null;
export function setFamilyFromSettings(): void { _familyFrom = 'settings'; }
export function consumeFamilyFrom(): 'settings' | null {
  const v = _familyFrom;
  _familyFrom = null;
  return v;
}

// ── Chat intent (Session 32 v2) ──────────────────────────────────────────
// Dashboard universal chat bar sets this before navigating to Chat.
// Chat consumes on activation and acts:
//   'mic'    → open recording pill immediately (Keyboard.dismiss + startRecording)
//   'camera' → open Camera/Photos picker sheet
//   'focus'  → focus TextInput, keyboard opens automatically
//   'seed'   → same as focus + seed input with pre-typed text
export type ChatIntent =
  | { kind: 'mic' }
  | { kind: 'camera' }
  | { kind: 'focus' }
  | { kind: 'seed'; text: string }
  // Round B commit 8 — tile-specific mic modes. Dashboard tile mic on
  // Reminders → sets kind:'mic-reminder' → Chat's consumer starts recording
  // with a flag; on stop, transcript saves as a Reminder directly (no
  // Sonnet involved) + drops a confirmation message in Chat, then bumps
  // Home tile so user sees it on next swipe back.
  | { kind: 'mic-reminder' }
  | null;

let _chatIntent: ChatIntent = null;
export function setChatIntent(intent: ChatIntent): void { _chatIntent = intent; }
export function consumeChatIntent(): ChatIntent {
  const v = _chatIntent;
  _chatIntent = null;
  return v;
}
export function hasChatIntent(): boolean { return _chatIntent !== null; }

// ── Chat-focus request (Build 63 — Lock Screen mic widget) ──────────────
// The widget deep-link `zaeli://chat?mic=1` needs to scroll swipe-world
// from Dashboard (default page) to Chat, in addition to setting the mic
// intent. On COLD start, swipe-world mounts fresh and can read this flag.
// On WARM start (app already open, showing Dashboard), swipe-world's
// version subscriber sees the bump and scrolls to Chat.
let _chatFocusRequest = 0;
const _chatFocusSubscribers = new Set<(v: number) => void>();
export function requestChatFocus(): void {
  _chatFocusRequest++;
  _chatFocusSubscribers.forEach(fn => fn(_chatFocusRequest));
}
export function getChatFocusRequestVersion(): number { return _chatFocusRequest; }
export function subscribeChatFocus(fn: (v: number) => void): () => void {
  _chatFocusSubscribers.add(fn);
  return () => { _chatFocusSubscribers.delete(fn); };
}

// ── Persistent widget chat intent (Build 66) ─────────────────────────────
// Widget cold-start race problem (Build 65 aftermath): the Lock Screen mic
// widget's URL flow (zaeli://chat?mic=1) races against Chat's mount
// lifecycle. On cold-start, chat.tsx runs BEFORE Chat is mounted, so its
// in-memory setChatIntent + requestChatFocus land in a subscriber-less
// void. By the time Chat mounts + subscribes, the intent may already have
// been consumed elsewhere or the requestChatFocus counter bump is old news.
//
// AsyncStorage is a reliable back-channel independent of React mount
// timing: chat.tsx + _layout.tsx write the intent kind synchronously to
// disk; Chat's mount effect polls AsyncStorage for up to 2 seconds and
// dispatches whatever it finds. Belt AND braces (persistence + polling)
// eliminates every race identified so far — mount order doesn't matter,
// subscription timing doesn't matter, activePage transition doesn't matter.
import AsyncStorage from '@react-native-async-storage/async-storage';

const PERSISTED_WIDGET_INTENT_KEY = 'zaeli_widget_chat_intent_v1';

export async function persistWidgetChatIntent(kind: 'mic' | 'camera' | 'focus'): Promise<void> {
  try {
    await AsyncStorage.setItem(PERSISTED_WIDGET_INTENT_KEY, kind);
  } catch (e: any) {
    console.log('[nav-store] persistWidgetChatIntent threw:', e?.message);
  }
}

export async function consumePersistedWidgetChatIntent(): Promise<'mic' | 'camera' | 'focus' | null> {
  try {
    const v = await AsyncStorage.getItem(PERSISTED_WIDGET_INTENT_KEY);
    if (v) await AsyncStorage.removeItem(PERSISTED_WIDGET_INTENT_KEY);
    if (v === 'mic' || v === 'camera' || v === 'focus') return v;
    return null;
  } catch (e: any) {
    console.log('[nav-store] consumePersistedWidgetChatIntent threw:', e?.message);
    return null;
  }
}

// ── Home refresh trigger (Round B commit 3) ─────────────────────────────
// Home tiles cache their own state (reminders / calendar / shopping /
// tasks / budget). When the user mutates state via a sheet (which lives
// as a Modal in Chat, i.e. renders as a portal over Home without Home
// losing focus), Home doesn't know to reload.
//
// Pattern: any mutation inside a sheet calls bumpHomeRefresh(). Home
// subscribes via useEffect on the version counter and re-runs loadData.
// Cheap — just an int increment + one debounced Supabase round-trip.
//
// Any consumer that needs to observe the counter should:
//   const [ver, setVer] = useState(getHomeRefreshVersion());
//   useEffect(() => subscribeHomeRefresh(setVer), []);
//   useEffect(() => { loadData(); }, [ver]);
let _homeRefreshVersion = 0;
const _homeRefreshListeners = new Set<(v: number) => void>();

export function bumpHomeRefresh(): void {
  _homeRefreshVersion++;
  _homeRefreshListeners.forEach(fn => { try { fn(_homeRefreshVersion); } catch {} });
}
export function getHomeRefreshVersion(): number { return _homeRefreshVersion; }
export function subscribeHomeRefresh(fn: (v: number) => void): () => void {
  _homeRefreshListeners.add(fn);
  return () => { _homeRefreshListeners.delete(fn); };
}
