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
  type: 'edit_event' | 'add_event' | 'shopping' | 'actions' | 'meals' | 'notes_tasks_sheet' | null;
  event?:    any;     // for edit_event — full event object
  tab?:      'notes' | 'tasks';   // for notes_tasks_sheet — which tab to open
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
  | null;

let _chatIntent: ChatIntent = null;
export function setChatIntent(intent: ChatIntent): void { _chatIntent = intent; }
export function consumeChatIntent(): ChatIntent {
  const v = _chatIntent;
  _chatIntent = null;
  return v;
}
export function hasChatIntent(): boolean { return _chatIntent !== null; }
