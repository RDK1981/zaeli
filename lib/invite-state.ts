/**
 * lib/invite-state.ts — Family invite tokens (Supabase-backed, Phase 2b).
 *
 * Phase 2a stored these in AsyncStorage as a single-device mock. Phase 2b
 * moves them to public.invite_tokens with RLS so invites work cross-device.
 *
 * Two halves:
 *
 *   Inviter side (signed-in user): hydrates a module-level cache from
 *   Supabase via family-scoped RLS. Same call-site API as before
 *   (getInvites / getPendingInvites / findByToken / createInvite /
 *   markAccepted / resendInvite / revokeInvite) so chat + family screens
 *   don't need to change. Mutations write through to Supabase.
 *
 *   Receiver side (no session yet — they just tapped a link):
 *   - lookupInviteByToken(token)  → RPC get_invite_by_token (anon-callable)
 *   - acceptInviteRemote(token)   → RPC accept_invite
 *
 *   Both RPCs are SECURITY DEFINER so they bypass RLS but only return /
 *   modify the single token row. The token IS the secret — same security
 *   model as Stripe idempotency keys / password reset links.
 */

import { supabase } from './supabase';
import { getProfile } from './auth';

// Phase 3c — link path matches the Expo Router route `/invite/[token]` so
// the Universal Link auto-routes when the AASA file is hosted on zaeli.app.
const INVITE_LINK_BASE = 'zaeli.app/invite/';

export type InviteRole = 'adult' | 'kid';
export type InviteStatus = 'pending' | 'accepted' | 'revoked';

export interface Invite {
  token: string;
  role: InviteRole;
  name: string;
  phone?: string;
  status: InviteStatus;
  createdAt: string;
  acceptedAt: string | null;
  acceptedUserId: string | null;   // Phase 2d — auth.users.id of the accepter
  inviterUserId: string | null;    // Phase 2d — auth.users.id of the inviter
  inviterName: string | null;      // Session 23 — denormalised inviter first name for receiver UI
  revokedAt: string | null;
  surfacedHeadsUp: boolean;
}

let _invites: Invite[] = [];
let _loaded = false;

// ── Row mapping ───────────────────────────────────────────────────────────
function rowToInvite(row: any): Invite {
  return {
    token:           row.token,
    role:            row.role,
    name:            row.name,
    phone:           row.phone || undefined,
    status:          row.status,
    createdAt:       row.created_at,
    acceptedAt:      row.accepted_at,
    acceptedUserId:  row.accepted_user_id ?? null,
    inviterUserId:   row.inviter_user_id ?? null,
    inviterName:     row.inviter_name ?? null,
    revokedAt:       row.revoked_at,
    surfacedHeadsUp: !!row.surfaced_heads_up,
  };
}

// ── Inviter-side cache ────────────────────────────────────────────────────
export async function loadInvites(): Promise<Invite[]> {
  // Always re-fetch on call — caller-controlled refresh. Cache stays warm
  // for sync getInvites() reads in render after the first load.
  try {
    const { data, error } = await supabase
      .from('invite_tokens')
      .select('token,role,name,phone,status,surfaced_heads_up,created_at,accepted_at,accepted_user_id,inviter_user_id,inviter_name,revoked_at')
      .order('created_at', { ascending: false });
    if (error) {
      console.log('[invites] load error:', error.message);
      // Keep stale cache if present
      _loaded = true;
      return _invites;
    }
    _invites = (data || []).map(rowToInvite);
    _loaded = true;
  } catch (e: any) {
    console.log('[invites] load exception:', e?.message);
  }
  return _invites;
}

export function getInvites(): Invite[] {
  return [..._invites];
}

export function getPendingInvites(): Invite[] {
  return _invites.filter(i => i.status === 'pending');
}

export function getPendingForName(name: string): Invite | undefined {
  const lower = name.trim().toLowerCase();
  return _invites.find(i => i.status === 'pending' && i.name.trim().toLowerCase() === lower);
}

export function findByToken(token: string): Invite | undefined {
  // Inviter-side cache lookup. Receivers should use lookupInviteByToken().
  return _invites.find(i => i.token === token);
}

// ── Token helper ──────────────────────────────────────────────────────────
function generateToken(): string {
  // 6 chars, alphanumeric, no easily-confused glyphs.
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let out = '';
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

// ── createInvite ──────────────────────────────────────────────────────────
export interface CreateInviteArgs {
  role: InviteRole;
  name: string;
  phone?: string;
  inviterFirstName: string;
}

export interface CreatedInvite {
  invite: Invite;
  link: string;
  sms: string;
}

export async function createInvite(args: CreateInviteArgs): Promise<CreatedInvite> {
  // Resolve current family + user from auth context. Without a session this
  // throws — createInvite is inviter-only (must be signed in).
  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData?.session;
  if (!session) throw new Error('Not signed in');
  const userId = session.user.id;

  const { data: profile, error: profErr } = await supabase
    .from('profiles')
    .select('family_id')
    .eq('id', userId)
    .limit(1)
    .single();
  if (profErr || !profile?.family_id) throw new Error('No family for current user');
  const familyId = profile.family_id as string;

  // Generate a unique token (retry up to 5x on the rare collision).
  let token = generateToken();
  for (let attempt = 0; attempt < 5; attempt++) {
    const { error } = await supabase
      .from('invite_tokens')
      .insert({
        token,
        family_id:       familyId,
        inviter_user_id: userId,
        inviter_name:    args.inviterFirstName?.trim() || null,
        role:            args.role,
        name:            args.name.trim(),
        phone:           args.phone?.trim() || null,
        status:          'pending',
      });
    if (!error) break;
    if (error.code === '23505') {
      // Unique violation on token — regenerate and try again
      token = generateToken();
      if (attempt === 4) throw error;
      continue;
    }
    throw error;
  }

  const invite: Invite = {
    token,
    role:            args.role,
    name:            args.name.trim(),
    phone:           args.phone?.trim() || undefined,
    status:          'pending',
    createdAt:       new Date().toISOString(),
    acceptedAt:      null,
    acceptedUserId:  null,
    inviterUserId:   userId,
    inviterName:     args.inviterFirstName?.trim() || null,
    revokedAt:       null,
    surfacedHeadsUp: false,
  };
  _invites.unshift(invite);

  const link = `https://${INVITE_LINK_BASE}${token}`;
  const sms = composeSms(args.role, args.name, args.inviterFirstName, link);
  return { invite, link, sms };
}

function composeSms(role: InviteRole, name: string, inviter: string, link: string): string {
  const first = name.split(/\s+/)[0];
  if (role === 'adult') {
    return `${first} — ${inviter} invited you to join our family on Zaeli 🏡 It's the family-life app — handles the daily juggle. Set up takes 2 min: ${link}`;
  }
  return `${first}! 🎉 ${inviter} set up Zaeli for our family — your own hub, jobs, games, Tutor for homework, plus the family calendar, meals and shopping. Tap to join: ${link}`;
}

// ── markAccepted (inviter cache + DB) ────────────────────────────────────
// Call from inviter side ONLY (rarely — receiver path uses acceptInviteRemote).
// Kept for the dev "Simulate invite accepted" row in Settings.
export async function markAccepted(token: string): Promise<void> {
  const inv = _invites.find(i => i.token === token);
  if (inv) {
    inv.status = 'accepted';
    inv.acceptedAt = new Date().toISOString();
    inv.surfacedHeadsUp = false;
  }
  try {
    await supabase
      .from('invite_tokens')
      .update({
        status:            'accepted',
        accepted_at:       new Date().toISOString(),
        surfaced_heads_up: false,
      })
      .eq('token', token);
  } catch (e: any) {
    console.log('[invites] markAccepted DB error:', e?.message);
  }
}

export async function resendInvite(token: string): Promise<void> {
  const inv = _invites.find(i => i.token === token);
  if (inv) inv.createdAt = new Date().toISOString();
  try {
    await supabase
      .from('invite_tokens')
      .update({ created_at: new Date().toISOString() })
      .eq('token', token);
  } catch (e: any) {
    console.log('[invites] resend DB error:', e?.message);
  }
}

export async function revokeInvite(token: string): Promise<void> {
  const inv = _invites.find(i => i.token === token);
  if (inv) {
    inv.status = 'revoked';
    inv.revokedAt = new Date().toISOString();
  }
  try {
    await supabase
      .from('invite_tokens')
      .update({ status: 'revoked', revoked_at: new Date().toISOString() })
      .eq('token', token);
  } catch (e: any) {
    console.log('[invites] revoke DB error:', e?.message);
  }
}

// ── Heads-up surfacing for inviter chat ──────────────────────────────────
const HEADSUP_WINDOW_MIN = 60;

export function recentlyAcceptedInvites(): Invite[] {
  const cutoff = Date.now() - HEADSUP_WINDOW_MIN * 60 * 1000;
  // Phase 2d — only the INVITER sees the heads-up, not the accepter and
  // not other family members. Filter to invites where the current user is
  // the original sender.
  const currentUserId = getProfile()?.id ?? null;
  if (!currentUserId) return [];  // Fail closed — no heads-up if we don't know who we are
  return _invites.filter(i =>
    i.status === 'accepted' &&
    !i.surfacedHeadsUp &&
    i.acceptedAt &&
    new Date(i.acceptedAt).getTime() > cutoff &&
    i.inviterUserId === currentUserId
  );
}

export async function clearJustAcceptedFlag(token: string): Promise<void> {
  const inv = _invites.find(i => i.token === token);
  if (inv) inv.surfacedHeadsUp = true;
  try {
    await supabase
      .from('invite_tokens')
      .update({ surfaced_heads_up: true })
      .eq('token', token);
  } catch (e: any) {
    console.log('[invites] clearJustAcceptedFlag DB error:', e?.message);
  }
}

// ── Receiver-side lookup (no auth required) ──────────────────────────────
// Hits SECURITY DEFINER RPC so RLS doesn't block the lookup. Returns null
// for invalid / missing tokens.
export async function lookupInviteByToken(token: string): Promise<Invite | null> {
  if (!token) return null;
  try {
    const { data, error } = await supabase.rpc('get_invite_by_token', { p_token: token });
    if (error) {
      console.log('[invites] lookup RPC error:', error.message);
      return null;
    }
    if (!data) return null;
    return rowToInvite(data);
  } catch (e: any) {
    console.log('[invites] lookup exception:', e?.message);
    return null;
  }
}

// Mark accepted from the receiver side. Doesn't require auth (anon RPC).
// p_user_id is optional — passes null until Phase 2d wires real auth at signup.
export async function acceptInviteRemote(token: string, userId?: string | null): Promise<Invite | null> {
  if (!token) return null;
  try {
    const { data, error } = await supabase.rpc('accept_invite', {
      p_token:   token,
      p_user_id: userId ?? null,
    });
    if (error) {
      console.log('[invites] accept RPC error:', error.message);
      return null;
    }
    // RPC returns a partial row — re-fetch the full one for cache parity.
    return await lookupInviteByToken(token);
  } catch (e: any) {
    console.log('[invites] accept exception:', e?.message);
    return null;
  }
}

// ── Helpers for relative time display on Family screen ───────────────────
export function relTime(iso: string): string {
  const t = new Date(iso).getTime();
  const now = Date.now();
  const diffMin = Math.floor((now - t) / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}

// ── Reset (for dev row in Settings) ──────────────────────────────────────
// Wipes the local cache and refetches. Useful after backfill / testing.
export async function resetCache(): Promise<void> {
  _invites = [];
  _loaded = false;
  await loadInvites();
}
