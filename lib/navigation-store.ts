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
