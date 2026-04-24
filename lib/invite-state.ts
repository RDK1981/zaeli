/**
 * lib/invite-state.ts — Local store for pending family invites.
 *
 * v1 = mock token (no backend). Each invite has a short code that gets
 * embedded in a `zaeli.app/i/<token>` link the user shares via SMS.
 * Real Supabase-backed token validation lands with the backend pass.
 *
 * Public API:
 *   loadInvites()                     — read from AsyncStorage on mount
 *   getInvites()                      — current array of invites
 *   createInvite({...})               — new invite, returns { invite, link, sms }
 *   markAccepted(token)               — receiver finished onboarding
 *   resendInvite(token)               — bumps timestamp (no real send)
 *   revokeInvite(token)               — removes from list
 *   getPendingForName(name)           — find pending invite for a member
 *   recentlyAcceptedInvites()         — invites accepted in last N min, for chat heads-up
 *   clearJustAcceptedFlag(token)      — once heads-up fired, mark surfaced
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_INVITES = 'invite_state_v1';
const INVITE_LINK_BASE = 'zaeli.app/i/';

export type InviteRole = 'adult' | 'kid';
export type InviteStatus = 'pending' | 'accepted' | 'revoked';

export interface Invite {
  token: string;            // short code embedded in link
  role: InviteRole;
  name: string;             // who we're inviting
  phone?: string;           // optional, just stored for record
  status: InviteStatus;
  createdAt: string;        // ISO
  acceptedAt: string | null;
  revokedAt: string | null;
  surfacedHeadsUp: boolean; // once chat shows "Anna joined" we set this true
}

let _invites: Invite[] = [];
let _loaded = false;

// ── Persistence ────────────────────────────────────────────────────────────
async function persist(): Promise<void> {
  try { await AsyncStorage.setItem(KEY_INVITES, JSON.stringify(_invites)); } catch {}
}

export async function loadInvites(): Promise<Invite[]> {
  if (_loaded) return _invites;
  try {
    const raw = await AsyncStorage.getItem(KEY_INVITES);
    if (raw) _invites = JSON.parse(raw) as Invite[];
  } catch {}
  _loaded = true;
  return _invites;
}

// ── Token helper ───────────────────────────────────────────────────────────
function generateToken(): string {
  // 6 chars, alphanumeric. Mock — real token would be cryptographically signed.
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let out = '';
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

// ── Public API ─────────────────────────────────────────────────────────────
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
  return _invites.find(i => i.token === token);
}

export interface CreateInviteArgs {
  role: InviteRole;
  name: string;
  phone?: string;
  inviterFirstName: string;   // used in SMS copy
}

export interface CreatedInvite {
  invite: Invite;
  link: string;               // full https link (mock domain)
  sms: string;                // pre-composed SMS body for share sheet
}

export async function createInvite(args: CreateInviteArgs): Promise<CreatedInvite> {
  const token = generateToken();
  const invite: Invite = {
    token,
    role: args.role,
    name: args.name.trim(),
    phone: args.phone?.trim() || undefined,
    status: 'pending',
    createdAt: new Date().toISOString(),
    acceptedAt: null,
    revokedAt: null,
    surfacedHeadsUp: false,
  };
  _invites.push(invite);
  await persist();

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

export async function markAccepted(token: string): Promise<void> {
  const inv = _invites.find(i => i.token === token);
  if (!inv) return;
  inv.status = 'accepted';
  inv.acceptedAt = new Date().toISOString();
  inv.surfacedHeadsUp = false; // chat will surface + mark true
  await persist();
}

export async function resendInvite(token: string): Promise<void> {
  const inv = _invites.find(i => i.token === token);
  if (!inv) return;
  inv.createdAt = new Date().toISOString(); // bump
  await persist();
}

export async function revokeInvite(token: string): Promise<void> {
  const inv = _invites.find(i => i.token === token);
  if (!inv) return;
  inv.status = 'revoked';
  inv.revokedAt = new Date().toISOString();
  await persist();
}

// ── Heads-up surfacing for inviter chat ────────────────────────────────────
const HEADSUP_WINDOW_MIN = 60; // surface within an hour of acceptance

export function recentlyAcceptedInvites(): Invite[] {
  const cutoff = Date.now() - HEADSUP_WINDOW_MIN * 60 * 1000;
  return _invites.filter(i =>
    i.status === 'accepted' &&
    !i.surfacedHeadsUp &&
    i.acceptedAt &&
    new Date(i.acceptedAt).getTime() > cutoff
  );
}

export async function clearJustAcceptedFlag(token: string): Promise<void> {
  const inv = _invites.find(i => i.token === token);
  if (!inv) return;
  inv.surfacedHeadsUp = true;
  await persist();
}

// ── Helpers for relative time display on Family screen ────────────────────
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
