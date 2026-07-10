/**
 * lib/auth.ts — Auth helpers wrapping Supabase auth.
 *
 * Public API:
 *   signInWithPassword({ email, password })       — existing user sign-in
 *   signUpOwner({ email, password, name, familyName? }) — new family + owner profile
 *   signUpFromInvite({ inviteToken, email, password, name }) — invitee signup,
 *                                                  linked to inviter's family via DB trigger
 *   signOut()                                      — clears session
 *   getSession()                                   — current Supabase session or null
 *   getCurrentUserId()                             — auth.uid() shortcut
 *   loadProfile()                                  — fetches+caches the user's profile row
 *   getProfile()                                   — returns cached profile (call loadProfile() first)
 *   getCurrentFamilyId()                           — convenience for families.id
 *   onAuthChange(cb)                               — subscribe to session changes
 */

import { supabase } from './supabase';
import type { Session, User, AuthChangeEvent } from '@supabase/supabase-js';

export interface Profile {
  id: string;                  // = auth.users.id
  family_id: string;
  kind: 'owner' | 'adult' | 'kid';
  name: string;
  email: string | null;
  avatar: string | null;
  colour: string | null;
  year_level: number | null;
  brief_morning_at: string | null;
  brief_evening_at: string | null;
  // Phase 3b — Stripe subscription fields (managed by server webhook)
  stripe_customer_id:     string | null;
  subscription_status:    'trialing' | 'active' | 'past_due' | 'cancelled' | 'incomplete' | null;
  subscription_plan:      string | null;
  subscription_renews_at: string | null;
  trial_ends_at:          string | null;
  // Session 28 — comp beta program for test families. When beta_end_date is
  // in the future, lib/stripe.ts overrides subscription_status and returns
  // 'trialing' with plan 'beta'. Once passed, real Stripe state takes over.
  beta_end_date:          string | null;
  created_at: string;
  updated_at: string;
}

let _profile: Profile | null = null;

// ── Sign in / up / out ────────────────────────────────────────────────────
export async function signInWithPassword(args: { email: string; password: string }) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: args.email.trim(),
    password: args.password,
  });
  if (error) throw error;
  // Don't load profile here — root layout will trigger loadProfile() on auth change
  return data;
}

export async function signUpOwner(args: {
  email: string;
  password: string;
  name: string;
  familyName?: string;
}) {
  // The database trigger `handle_new_user` (SECURITY DEFINER) creates the
  // families row + owner profile in one atomic step on the auth.users
  // INSERT. We just pass `name` + optional `family_name` via auth user
  // metadata. This avoids the RLS-vs-fresh-session chicken-and-egg.
  const { data, error } = await supabase.auth.signUp({
    email: args.email.trim(),
    password: args.password,
    options: {
      data: {
        name: args.name.trim(),
        family_name: args.familyName?.trim() ?? null,
      },
    },
  });
  if (error) throw error;
  if (!data.user) throw new Error('Sign up succeeded but no user returned');

  // Trigger fires synchronously inside the transaction, but a tiny wait
  // before reading the profile back avoids any read-after-write race in
  // the supabase-js client cache.
  await new Promise(r => setTimeout(r, 250));

  return { user: data.user };
}

export async function signUpFromInvite(args: {
  inviteToken: string;
  email: string;
  password: string;
  name: string;
}) {
  // The handle_new_user trigger (Phase 2d) reads `invite_token` from
  // raw_user_meta_data and links the new profile to the inviter's
  // family_id atomically. If the token is invalid/revoked/already
  // accepted, the trigger raises an exception and the auth.users INSERT
  // gets rolled back — no orphan auth user.
  const { data, error } = await supabase.auth.signUp({
    email: args.email.trim(),
    password: args.password,
    options: {
      data: {
        name: args.name.trim(),
        invite_token: args.inviteToken,
      },
    },
  });
  if (error) throw error;
  if (!data.user) throw new Error('Sign up succeeded but no user returned');

  // Tiny wait so the trigger commits cleanly before the client reads the
  // profile back (matches signUpOwner pattern).
  await new Promise(r => setTimeout(r, 250));

  return { user: data.user };
}

export async function signOut() {
  _profile = null;
  await supabase.auth.signOut();
}

// ── Session helpers ───────────────────────────────────────────────────────
export async function getSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function getCurrentUserId(): Promise<string | null> {
  const session = await getSession();
  return session?.user.id ?? null;
}

export function onAuthChange(cb: (event: AuthChangeEvent, session: Session | null) => void) {
  return supabase.auth.onAuthStateChange(cb);
}

// ── Profile load / read ───────────────────────────────────────────────────
export async function loadProfile(): Promise<Profile | null> {
  const userId = await getCurrentUserId();
  if (!userId) {
    _profile = null;
    return null;
  }
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) {
    console.error('[auth] loadProfile error:', error.message);
    _profile = null;
    return null;
  }
  _profile = data as Profile;
  return _profile;
}

export function getProfile(): Profile | null {
  return _profile;
}

export function getCurrentFamilyId(): string | null {
  return _profile?.family_id ?? null;
}

export function isAuthenticated(): boolean {
  return _profile !== null;
}

// ── Test helper — for the dev "Reset auth" row ────────────────────────────
export async function clearLocalProfileCache() {
  _profile = null;
}
