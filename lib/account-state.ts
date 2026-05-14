/**
 * lib/account-state.ts — Tracks the currently-active account identity.
 *
 * Phase 1 of backend pass (28 April 2026 — Session 21):
 *   - When a Supabase session exists, account state is sourced from the
 *     `profiles.kind` column via lib/auth.ts.
 *   - When NO session (pre-auth-migration testing flows like the dev
 *     "Open latest invite as receiver" row), falls back to the legacy
 *     AsyncStorage `account_state_v1` key so existing tests still work.
 *
 * Three account shapes:
 *   - Owner — primary user, account creator. Full access.
 *   - Adult — invited adult (other parent, grandparent, carer). Full access.
 *   - Kid   — invited kid with own device. Full access EXCEPT Our Budget + Our Family management.
 *
 * Kids land in their Kids Hub by default. They can swipe out to chat etc,
 * but Budget + Family management tiles are hidden in MoreSheet AND those
 * routes redirect to /kids on mount.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getProfile, loadProfile } from './auth';

const KEY_ACCOUNT = 'account_state_v1';

export type AccountKind = 'owner' | 'adult' | 'kid';

export interface AccountState {
  kind: AccountKind;
  name: string;        // first name
  avatar?: string;     // emoji (kids only for now)
}

const DEFAULT_STATE: AccountState = { kind: 'owner', name: 'Rich' };

let _state: AccountState = { ...DEFAULT_STATE };
let _loaded = false;

async function persist(): Promise<void> {
  try { await AsyncStorage.setItem(KEY_ACCOUNT, JSON.stringify(_state)); } catch {}
}

export async function loadAccount(): Promise<AccountState> {
  if (_loaded) return _state;
  // Prefer Supabase profile when authenticated. Falls back to AsyncStorage
  // for legacy/dev flows (no auth session, e.g. invite test dev row).
  const profile = getProfile() ?? await loadProfile();
  if (profile) {
    _state = {
      kind: profile.kind,
      name: profile.name,
      avatar: profile.avatar ?? undefined,
    };
    _loaded = true;
    return _state;
  }
  // No auth — read AsyncStorage fallback
  try {
    const raw = await AsyncStorage.getItem(KEY_ACCOUNT);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AccountState>;
      _state = {
        kind: parsed.kind ?? 'owner',
        name: parsed.name ?? 'Rich',
        avatar: parsed.avatar,
      };
    }
  } catch {}
  _loaded = true;
  return _state;
}

// Force a re-load on next call (e.g. after sign-in, account switch, profile update)
export function invalidateAccount(): void {
  _loaded = false;
  _state = { ...DEFAULT_STATE };
}

export function getAccount(): AccountState { return { ..._state }; }
export function isKidAccount(): boolean { return _state.kind === 'kid'; }
export function isAdultAccount(): boolean { return _state.kind === 'adult' || _state.kind === 'owner'; }

export async function setAccount(next: AccountState): Promise<void> {
  _state = { ...next };
  _loaded = true;
  await persist();
}

export async function resetToOwner(): Promise<void> {
  _state = { ...DEFAULT_STATE };
  await persist();
}
