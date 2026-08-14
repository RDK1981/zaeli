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

// Round B commit 34 — DEFAULT_ROSTER removed (CRITICAL data isolation fix).
//
// Prior behaviour: _roster initialised to a hardcoded list of Rich's real
// family (Anna, Richard, Poppy, Gab, Duke) as a "graceful fallback" for
// the pre-load flash. When apple-review@zaeli.ai signed up on the same
// device, invalidateRosterCache() reset _roster to those same defaults;
// loadRoster's `if (data.length > 0)` guard skipped the empty-result
// assignment; so _roster stayed as Rich's family and apple-review saw
// Rich's real family members in Our Family. That's a cross-user data
// leak, and blocking for beta with real testers.
//
// New behaviour: empty roster by default. Screens must handle an empty
// roster gracefully (they already do — "no family members yet" state).
// A brief pre-load render with no avatars is a smaller UX cost than
// showing someone else's family.

let _roster: RosterMember[] = [];
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
    // Round B commit 34 — CRITICAL: always assign the query result, even
    // when empty. Previous `if (data.length > 0)` guard skipped empty
    // results, leaving stale _roster from a prior user's family. That's
    // how apple-review@zaeli.ai saw Rich's real family members in Our
    // Family after Rich signed out and apple-review signed up on the
    // same device (fresh family with no members → empty result → guard
    // skipped assignment → cached Rich family survived).
    _roster = (data ?? []).map((r: any) => ({
      id:          r.id,
      name:        r.name,
      color:       colorFor(r.name, r.colour),
      role:        r.role || 'parent',
      yearLevel:   r.year_level ?? null,
      avatarEmoji: r.avatar_emoji || '👤',
      tutorActive: !!r.tutor_active,
    }));
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
//
// Session 30 fix: NEVER return a DEFAULT_ROSTER `seed-*` id. If a caller
// hits this before loadRoster has completed (race window on cold start),
// the id would otherwise be `seed-rich`/`seed-anna` etc. — a placeholder
// that gets persisted to events.assignees where it can never resolve back
// to a real family_members row. Rich hit this via Anna's multi-photo
// parent-teacher upload — 4 events landed with seed-* ids and lost their
// avatars in every subsequent view. Now: seed IDs return undefined; caller
// (Sonnet's add_calendar_event tool path) will omit that assignee rather
// than persist a broken reference.
export function resolveAssigneeId(n: string): string | undefined {
  const q = (n || '').toLowerCase().trim();
  if (!q) return undefined;
  const found = (
    _roster.find(m => m.name.toLowerCase() === q) ||
    _roster.find(m => m.name.toLowerCase().startsWith(q)) ||
    _roster.find(m => q.startsWith(m.name.toLowerCase()))
  );
  if (!found) return undefined;
  if (found.id.startsWith('seed-')) return undefined; // Session 30 fix
  return found.id;
}

// Default assignee for a new event = the signed-in user (was hardcoded '2').
// Session 30: same seed-* guard as resolveAssigneeId — never persist a
// DEFAULT_ROSTER placeholder id.
export function defaultAssigneeIds(): string[] {
  const me = getMemberByName(getProfile()?.name || '')
    ?? _roster.find(m => m.role === 'parent')
    ?? _roster[0];
  if (!me) return [];
  if (me.id.startsWith('seed-')) return []; // Session 30 fix
  return [me.id];
}

export function invalidateRosterCache(): void {
  // Round B commit 34 — reset to empty, NOT to DEFAULT_ROSTER (removed).
  // See top-of-file comment for the cross-user data-leak this fixes.
  _loaded = false;
  _roster = [];
}

// ─────────────────────────────────────────────────────────────────────────
// Option C (Aug 27) — member edit helpers. Wired from Our Family →
// member profile view when Andy discovered every row was inert.
//
// RLS invariant: family_members.id === profiles.id === auth.uid() for the
// same person. `supabase-family-editing.sql` tightens UPDATE policy to
// (owner OR self) — client-side we ALSO gate the buttons on isOwner /
// isMe, so the two layers agree. Adults calling update on someone else's
// row will hit RLS deny.
// ─────────────────────────────────────────────────────────────────────────

// Update a member's display name. Writes to family_members.name AND to
// profiles.name if the row belongs to a signed-in user (so identity stays
// consistent across surfaces — Settings hero, brief prompts etc.).
export async function updateMemberName(memberId: string, newName: string): Promise<{ ok: boolean; error?: string }> {
  const trimmed = (newName || '').trim();
  if (!trimmed) return { ok: false, error: 'Name cannot be empty' };
  if (trimmed.length > 40) return { ok: false, error: 'Name is too long' };

  try {
    const { error: rmErr } = await supabase
      .from('family_members')
      .update({ name: trimmed })
      .eq('id', memberId);
    if (rmErr) return { ok: false, error: rmErr.message };

    // Best-effort: also update the profile row if one exists. If it doesn't
    // (e.g. a legacy roster-only entry with no auth user), the update just
    // matches zero rows — not an error.
    await supabase.from('profiles').update({ name: trimmed, updated_at: new Date().toISOString() }).eq('id', memberId);

    // Update cache in place so screens re-render fast without waiting for
    // a full reload.
    _roster = _roster.map(m => (m.id === memberId ? { ...m, name: trimmed, color: colorFor(trimmed, m.color) } : m));
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? 'unknown error' };
  }
}

// Update a member's colour. Writes to family_members.colour.
export async function updateMemberColor(memberId: string, newColor: string): Promise<{ ok: boolean; error?: string }> {
  const c = (newColor || '').trim();
  if (!/^#[0-9A-Fa-f]{6}$/.test(c)) return { ok: false, error: 'Invalid colour format' };

  try {
    const { error } = await supabase
      .from('family_members')
      .update({ colour: c })
      .eq('id', memberId);
    if (error) return { ok: false, error: error.message };

    _roster = _roster.map(m => (m.id === memberId ? { ...m, color: c } : m));
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? 'unknown error' };
  }
}

// Remove a member from the family. Owner-only, enforced server-side by the
// remove_family_member SECURITY DEFINER RPC (see supabase-family-editing.sql).
// The RPC deletes the family_members row + nulls profiles.family_id, so the
// removed user loses RLS access to all family data but keeps their auth user
// (can be re-invited later).
export async function removeMember(memberId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('remove_family_member', { target_id: memberId });
    if (error) return { ok: false, error: error.message };
    if (data && typeof data === 'object' && data.ok === false) {
      return { ok: false, error: (data as any).error ?? 'remove failed' };
    }
    _roster = _roster.filter(m => m.id !== memberId);
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? 'unknown error' };
  }
}

// Read a kid's Budget access flag from profiles.budget_access.
export async function getBudgetAccess(profileId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('budget_access')
      .eq('id', profileId)
      .maybeSingle();
    if (error || !data) return false;
    return !!data.budget_access;
  } catch {
    return false;
  }
}

// Set a kid's Budget access flag. RLS policy on profiles requires owner
// permission to update someone else's row — enforced by the tightened
// policies in supabase-data-rls.sql (Session 21).
export async function setBudgetAccess(profileId: string, value: boolean): Promise<{ ok: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ budget_access: value, updated_at: new Date().toISOString() })
      .eq('id', profileId);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? 'unknown error' };
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Aug 27 hotfix — owner/invitee auto-heal into family_members.
//
// Andy reported he wasn't in his own family list. Root cause:
// onboarding/index.tsx:391 explicitly filtered out `id === 'me'` when
// persisting family_members. Comment justified it as "family_members is for
// OTHER family members" — but every screen that reads family_members
// (Our Family, Calendar avatars, Meal cook picker) treats it as THE
// authoritative roster. So the owner was invisible.
//
// Same problem exists for invitees who join via app/invite/[token].tsx —
// the invitee flow never creates a family_members row for them, so they'd
// see themselves missing too.
//
// This helper is called from family.tsx on load. If the signed-in user has
// a profile but NO family_members row keyed by their auth.uid, it INSERTs
// one using profile data. Idempotent — calling on a healthy account is a
// no-op after the check.
//
// Invariant established: family_members.id === profiles.id === auth.uid()
// for the person themselves. This lets `roster.find(m => m.id === meId)`
// resolve cleanly across all future queries.
export async function ensureOwnMembership(profile: {
  id: string;
  family_id: string;
  name?: string | null;
  colour?: string | null;
  kind?: string | null;
}): Promise<{ ok: boolean; created: boolean; error?: string }> {
  if (!profile?.id || !profile?.family_id) {
    return { ok: false, created: false, error: 'missing profile.id or family_id' };
  }

  try {
    // Check if a row already exists for this user
    const { data: existing } = await supabase
      .from('family_members')
      .select('id')
      .eq('id', profile.id)
      .eq('family_id', profile.family_id)
      .maybeSingle();
    if (existing?.id) return { ok: true, created: false };

    // Insert a row using profile data
    const displayName = (profile.name || '').trim() || 'You';
    const colour = profile.colour || colorFor(displayName, null);
    const role = profile.kind === 'kid' ? 'child' : 'parent';

    const { error } = await supabase
      .from('family_members')
      .insert({
        id: profile.id,
        family_id: profile.family_id,
        name: displayName,
        colour,
        role,
        year_level: null,
        avatar_emoji: null,
        tutor_active: false,
      });
    if (error) {
      // If it's a unique-violation on id, the row got created by another
      // process in the meantime — treat as success.
      if (error.code === '23505') return { ok: true, created: false };
      return { ok: false, created: false, error: error.message };
    }
    // Invalidate cache so next loadRoster picks up the new row
    _loaded = false;
    return { ok: true, created: true };
  } catch (e: any) {
    return { ok: false, created: false, error: e?.message ?? 'unknown error' };
  }
}
