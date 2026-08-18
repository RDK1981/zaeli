// ═══════════════════════════════════════════════════════════════════════
// app/chat.tsx — Build 64
//
// Redirect route for zaeli://chat?mic=1 (and any future zaeli://chat?<param>
// deep-links). Expo Router auto-routes based on the URL path — without a
// file at app/chat.tsx, the widget URL landed on Expo's built-in "Unmatched
// Route" error screen (blank + unstyled). User had to hit Back to reach
// the app, at which point the intent finally fired. Poor UX for a widget
// that's meant to feel one-tap.
//
// This file exists only to intercept /chat, capture any deep-link params,
// dispatch them via lib/navigation-store's intent + focus system, and
// router.replace() to the real app root at (tabs). No UI — returns null.
//
// Behaviour:
//   * ?mic=1 (Build 63 mic widget URL): setChatIntent({kind:'mic'}) +
//     requestChatFocus() → swipe-world lands on Chat with mic recording
//   * Future ?camera=1, ?focus=1 etc can be added the same way — one
//     branch per intent kind
//   * No params: still redirects to /(tabs)/ (just lands on Dashboard)
//
// The _layout.tsx Linking handler ALSO parses zaeli://chat URLs — that's
// fine, both paths are idempotent (setting the intent twice is harmless,
// requestChatFocus twice just bumps the counter twice which swipe-world
// coalesces into one animation).
// ═══════════════════════════════════════════════════════════════════════

import { useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { setChatIntent, requestChatFocus } from '../lib/navigation-store';

export default function ChatDeepLinkRedirect() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mic?: string; camera?: string; focus?: string }>();

  useEffect(() => {
    // Dispatch intent based on query param — same pattern as Dashboard's
    // openChatMic / openChatCamera / openChatFocus helpers so the Chat
    // isActive effect can consume them uniformly.
    if (params.mic === '1') {
      setChatIntent({ kind: 'mic' });
    } else if (params.camera === '1') {
      setChatIntent({ kind: 'camera' });
    } else if (params.focus === '1') {
      setChatIntent({ kind: 'focus' });
    }
    // Even with no params, request focus so we land on Chat page not
    // Dashboard — someone hitting zaeli://chat expects Chat.
    requestChatFocus();
    // Replace (not push) so Back button doesn't return to this blank route.
    router.replace('/(tabs)/');
  }, []);

  return null;
}
