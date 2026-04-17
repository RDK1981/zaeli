/**
 * swipe-world.tsx — Zaeli Swipe World Container
 * 17 April 2026 — v4 (Phase A: 2-page architecture, Chat-first)
 *
 * Pages:
 *   0 = Chat (HomeScreen named export from index.tsx) — OPENS HERE
 *   1 = Dashboard (DashboardScreen)
 *
 * My Space moved to standalone route (/(tabs)/my-space), accessed via More sheet.
 */

import React, { useRef, useState, useEffect } from 'react';
import {
  View, ScrollView, Dimensions, StyleSheet, Platform,
  Text, TouchableOpacity,
  NativeSyntheticEvent, NativeScrollEvent,
} from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';

import DashboardScreen from './dashboard';
import { HomeScreen as ChatScreen } from './index';

// ── Constants ────────────────────────────────────────────────────────────────
const { width: W } = Dimensions.get('window');

const PAGE_CHAT      = 0;
const PAGE_DASHBOARD = 1;

const LANDING_TEST_MODE = true; // set false before launch

// Module-level flag — only show splash once per app session, not on every swipe-world re-mount
let _splashShownThisSession = false;

// ── Main ─────────────────────────────────────────────────────────────────────
export default function SwipeWorld() {
  const router    = useRouter();
  const scrollRef = useRef<ScrollView>(null);

  const [activePage,  setActivePage]  = useState(PAGE_CHAT);
  const [showLanding, setShowLanding] = useState(false);
  const [pendingMicText, setPendingMicText] = useState<string|null>(null);
  const [contextTrigger, setContextTrigger] = useState(0);

  // Open on Chat (page 0)
  useEffect(() => {
    const t = setTimeout(() => {
      scrollRef.current?.scrollTo({ x: PAGE_CHAT * W, animated: false });
    }, 80);
    return () => clearTimeout(t);
  }, []);

  // Landing time-window check — only once per app session
  useEffect(() => {
    if (_splashShownThisSession) return;
    if (LANDING_TEST_MODE) { setShowLanding(true); _splashShownThisSession = true; return; }
    const h = new Date().getHours();
    if ((h >= 6 && h < 9) || (h >= 12 && h < 14) || (h >= 17 && h < 20)) {
      setShowLanding(true);
      _splashShownThisSession = true;
    }
  }, []);

  // ── Navigation helpers ───────────────────────────────────────────────────
  function scrollToPage(page: number) {
    scrollRef.current?.scrollTo({ x: page * W, animated: true });
    setActivePage(page);
  }

  function handleScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const page = Math.round(e.nativeEvent.contentOffset.x / W);
    if (page !== activePage) setActivePage(page);
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <View style={s.root}>
      <ExpoStatusBar style="dark" animated />

      {/* ── Two-page horizontal scroll ── */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={handleScroll}
        bounces={false}
        keyboardShouldPersistTaps="always"
        directionalLockEnabled={true}
        style={s.scroll}
        contentContainerStyle={{ flexGrow: 0 }}
      >
        {/* Page 0 — Chat (opens here) */}
        <View style={s.page}>
          <ChatScreen
            isEmbedded={true}
            isActive={activePage === PAGE_CHAT}
            contextTrigger={contextTrigger}
            onNavigateDashboard={() => scrollToPage(PAGE_DASHBOARD)}
            pendingMicText={pendingMicText}
            onMicTextConsumed={() => setPendingMicText(null)}
          />
        </View>

        {/* Page 1 — Dashboard */}
        <View style={s.page}>
          <DashboardScreen
            onNavigateChat={() => scrollToPage(PAGE_CHAT)}
            onNavigateMySpace={() => router.navigate('/(tabs)/my-space' as any)}
            isActive={activePage === PAGE_DASHBOARD}
            onContextTrigger={() => setContextTrigger(c => c + 1)}
          />
        </View>
      </ScrollView>

      {/* Dots removed — Navigate section in MoreSheet is the primary Chat↔Dashboard control */}
      {/* FAB removed — hamburger ☰ in each screen's header opens the new MoreSheet */}

      {/* ── Landing splash — Option C (Deep Slate + Sky + Mint + Lavender orbs) ── */}
      {showLanding && (
        <TouchableOpacity
          style={s.landing}
          activeOpacity={1}
          onPress={() => setShowLanding(false)}
        >
          {/* Lavender orb — top right */}
          <View style={s.landingOrbLavTop} pointerEvents="none" />
          {/* Lavender orb — bottom left */}
          <View style={s.landingOrbLavBot} pointerEvents="none" />
          {/* Sky glow — wrapping the wordmark */}
          <View style={s.landingGlow} pointerEvents="none" />

          <View style={s.landingCenter}>
            <Text style={s.landingLogo}>
              z<Text style={s.landingLogoAccent}>a</Text>el
              <Text style={s.landingLogoAccent}>i</Text>
            </Text>
            <Text style={s.landingTagline}>
              <Text style={s.landingTaglineBold}>Less Chaos.</Text>
              <Text> More Family.</Text>
            </Text>
            <View style={s.landingDivider} />
          </View>

          <Text style={s.landingHint}>TAP TO CONTINUE</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  scroll: {
    flex: 1,
  },
  page: {
    width: W,
    flex: 1,
  },
  // dots removed — navigation handled via MoreSheet Navigate section + swipe
  landing: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#1C2330',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    overflow: 'hidden',
  },
  // Sky-blue soft glow behind wordmark
  landingGlow: {
    position: 'absolute',
    width: 520,
    height: 520,
    borderRadius: 260,
    backgroundColor: 'rgba(168,216,240,0.10)',
    top: '50%',
    left: '50%',
    marginLeft: -260,
    marginTop: -280,
  },
  // Lavender orbs — Shopping-tile lavender #D8CCFF.
  // On a dark slate bg we need high opacity for the purple to actually show (low opacity just blends to grey).
  landingOrbLavTop: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(216,204,255,0.65)',
    top: -80,
    right: -90,
  },
  landingOrbLavBot: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(216,204,255,0.55)',
    bottom: -110,
    left: -120,
  },
  landingCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  landingLogo: {
    fontFamily: 'Poppins_800ExtraBold',
    fontSize: 96,
    color: '#FFFFFF',
    letterSpacing: -4,
    lineHeight: 128, // extra room so the dot on "i" never clips
    paddingTop: 12,  // breathing space above
    textAlignVertical: 'center',
  },
  landingLogoAccent: {
    color: '#A8D8F0', // sky blue — My Space identity
  },
  landingTagline: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 17,
    color: 'rgba(255,255,255,0.60)',
    marginTop: 16,
    letterSpacing: 0,
    textAlign: 'center',
  },
  landingTaglineBold: {
    fontFamily: 'Poppins_700Bold',
    color: '#B8EDD0', // mint accent on "Less Chaos." (kept as-is)
  },
  landingDivider: {
    marginTop: 20,
    width: 40,
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(184,237,208,0.5)',
  },
  landingHint: {
    position: 'absolute',
    bottom: 48,
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.40)',
    letterSpacing: 1.4,
  },
});
