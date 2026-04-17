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
