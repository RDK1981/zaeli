/**
 * lib/account-state.ts — Tracks the currently-active account identity.
 *
 * v1 = local AsyncStorage. Real auth comes with the backend pass.
 *
 * Three account shapes:
 *   - Owner (Rich) — primary user, full access. Default.
 *   - Adult  — invited adult (Anna, grandparent, carer). Full access.
 *   - Kid    — invited kid with own device. Full access EXCEPT Our Budget + Our Family management.
 *
 * Kids land in their Kids Hub by default. They can swipe out to chat etc,
 * but Budget + Family management tiles are hidden in MoreSheet.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

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
