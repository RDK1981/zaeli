/**
 * lib/family-roster.ts — Single source of truth for the family member roster.
 *
 * Replaces the hardcoded `FAMILY_MEMBERS = [...5 members...]` arrays that were
 * duplicated across index.tsx / dashboard.tsx / calendar.tsx. The roster now
 * comes from the `family_members` Supabase table (RLS-scoped to the family),
 * so it's DYNAMIC — supports up to MAX_FAMILY_MEMBERS, edits via Our Family,
 * and new invitees.
 *
 * Pattern (same as lib/tour-state.ts etc):
 *   - module-level `_roster` cache for sync render reads
 *   - loadRoster(familyId) hydrates from DB
 *   - getRoster() / getMemberById() sync reads
 *   - invalidateRosterCache() on auth change
 *
 * Shape matches the old hardcoded array (`{ id, name, color }`) plus extra
 * fields, so call sites barely change.
 *
 * Resilience: colorFor() maps the DB's old generic colour (#4A90D9) — which
 * every row currently has — back to the canonical per-member palette by name,
 * so colours look right even before the SQL colour-fix migration runs.
 */

import { supabase } from './supabase';
import { getProfile } from './auth';
import { isFamilyInBeta } from './stripe';

export interface RosterMember {
  id: string;
  name: string;
  color: string;          // mapped from DB `colour`
  role: string;           // 'parent' | 'child'
  yearLevel: number | null;
  avatarEmoji: string;
  tutorActive: boolean;
}

export const MAX_FAMILY_MEMBERS = 8;

// Canonical family palette (CLAUDE.md family colours).
const PALETTE: Record<string, string> = {
  rich: '#4D8BFF', richard: '#4D8BFF',
  anna: '#FF7B6B',
  poppy: '#A855F7',
  gab: '#22C55E', gabriel: '#22C55E',
  duke: '#F59E0B',
};

// Graceful fallback before the DB load resolves. Uses name-keyed ids so a
// pre-load assignee write is obviously a seed value (real writes happen after
// load with DB UUIDs). For the current family these match reality.
const DEFAULT_ROSTER: RosterMember[] = [
  { id: 'seed-anna',  name: 'Anna',    color: '#FF7B6B', role: 'parent', yearLevel: null, avatarEmoji: '👤', tutorActive: false },
  { id: 'seed-rich',  name: 'Richard', color: '#4D8BFF', role: 'parent', yearLevel: null, avatarEmoji: '👤', tutorActive: false },
  { id: 'seed-poppy', name: 'Poppy',   color: '#A855F7', role: 'child',  yearLevel: 6,    avatarEmoji: '👤', tutorActive: true },
  { id: 'seed-gab',   name: 'Gab',     color: '#22C55E', role: 'child',  yearLevel: 4,    avatarEmoji: '👤', tutorActive: true },
  { id: 'seed-duke',  name: 'Duke',    color: '#F59E0B', role: 'child',  yearLevel: 1,    avatarEmoji: '👤', tutorActive: true },
];

let _roster: RosterMember[] = [...DEFAULT_ROSTER];
let _loaded = false;

function colorFor(name: string, dbColour: string | null): string {
  // Old generic default (or missing) → fall back to canonical palette by name.
  if (!dbColour || dbColour === '#4A90D9') {
    return PALETTE[name.trim().toLowerCase()] || '#4D8BFF';
  }
  return dbColour;
}

export async function loadRoster(familyId: string): Promise<RosterMember[]> {
  try {
    const { data, error } = await supabase
      .from('family_members')
      .select('id, name, colour, role, year_level, avatar_emoji, tutor_active')
      .eq('family_id', familyId)
      .order('created_at', { ascending: true })
      .limit(MAX_FAMILY_MEMBERS);
    if (error) {
      console.log('[roster] load error:', error.message);
      _loaded = true;
      return _roster;
    }
    if (data && data.length > 0) {
      _roster = data.map((r: any) => ({
        id:          r.id,
        name:        r.name,
        color:       colorFor(r.name, r.colour),
        role:        r.role || 'parent',
        yearLevel:   r.year_level ?? null,
        avatarEmoji: r.avatar_emoji || '👤',
        tutorActive: !!r.tutor_active,
      }));
    }
    _loaded = true;
  } catch (e: any) {
    console.log('[roster] load exception:', e?.message);
  }
  return _roster;
}

export function getRoster(): RosterMember[] {
  // Session 28 — beta override: while the family is inside the comp beta
  // window, force tutorActive=true for all CHILDREN. Adults never get Tutor
  // (it's a per-child add-on). When beta ends, this override disappears and
  // the raw DB tutorActive values take over — which are false unless the
  // parent has explicitly enabled Tutor for that child (real conversion
  // signal instead of default enrollment).
  if (isFamilyInBeta()) {
    return _roster.map(m => (m.role === 'child' && !m.tutorActive
      ? { ...m, tutorActive: true }
      : m));
  }
  return _roster;
}

export function getMemberById(id: string): RosterMember | undefined {
  // Route through getRoster() so beta override is applied consistently.
  return getRoster().find(m => m.id === id);
}

export function getMemberByName(name: string): RosterMember | undefined {
  const lower = name.trim().toLowerCase();
  return _roster.find(m => m.name.trim().toLowerCase() === lower);
}

export function isRosterLoaded(): boolean {
  return _loaded;
}

// Resolve a name Zaeli passes ("Rich", "Gabriel", "gab") to a real member id.
// Fuzzy: exact → name-prefix → query-prefix. Replaces the old hardcoded
// NAME_TO_ID maps so calendar assignees use real family_members UUIDs.
export function resolveAssigneeId(n: string): string | undefined {
  const q = (n || '').toLowerCase().trim();
  if (!q) return undefined;
  return (
    _roster.find(m => m.name.toLowerCase() === q) ||
    _roster.find(m => m.name.toLowerCase().startsWith(q)) ||
    _roster.find(m => q.startsWith(m.name.toLowerCase()))
  )?.id;
}

// Default assignee for a new event = the signed-in user (was hardcoded '2').
export function defaultAssigneeIds(): string[] {
  const me = getMemberByName(getProfile()?.name || '')
    ?? _roster.find(m => m.role === 'parent')
    ?? _roster[0];
  return me ? [me.id] : [];
}

export function invalidateRosterCache(): void {
  _loaded = false;
  _roster = [...DEFAULT_ROSTER];
}
