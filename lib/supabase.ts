/**
 * lib/supabase.ts — Supabase client configured for React Native.
 *
 * Critical for RN: Supabase defaults to window.localStorage for session
 * persistence, which doesn't exist in RN. Without explicit storage,
 * the user is signed out on every app reload. Wire AsyncStorage explicitly.
 *
 * Also: Supabase needs to know when the app is foregrounded/backgrounded
 * so it can pause/resume token refresh. Without this, the access token
 * expires silently after 1 hour and the user gets RLS-rejected randomly.
 */

// react-native-url-polyfill/auto is REQUIRED by Supabase auth on RN —
// without it, session tokens don't get serialized properly to AsyncStorage,
// so the user has to sign in on every app launch. Installed via:
// npx expo install react-native-url-polyfill
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // RN doesn't have URL-based session detection
  },
});

// Pause/resume auto-refresh based on app foreground state.
// Per Supabase RN quickstart — without this, tokens silently expire after
// background time and queries start failing RLS unexpectedly.
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
