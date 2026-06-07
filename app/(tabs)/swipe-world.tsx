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
  Text, TouchableOpacity, Animated, Easing,
  NativeSyntheticEvent, NativeScrollEvent,
} from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import DashboardScreen from './dashboard';
import { HomeScreen as ChatScreen } from './index';

// First-run flag for the "Swipe for your Dashboard →" hint — one-shot.
const SWIPE_HINT_KEY = 'swipe_hint_seen';

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
  const insets    = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);

  const [activePage,  setActivePage]  = useState(PAGE_CHAT);
  const [showLanding, setShowLanding] = useState(false);
  const [pendingMicText, setPendingMicText] = useState<string|null>(null);
  const [contextTrigger, setContextTrigger] = useState(0);

  // First-run swipe hint — "Swipe for your Dashboard →" — shown once ever.
  // Auto-dismisses on first swipe to dashboard, or after 6 seconds.
  const [showSwipeHint, setShowSwipeHint] = useState(false);
  const hintOpacity = useRef(new Animated.Value(0)).current;
  const hintArrowX  = useRef(new Animated.Value(0)).current;

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

  // First-run swipe hint — show once ever. Triggers after a short delay so it
  // doesn't fight with the landing splash + brief settling in.
  useEffect(() => {
    (async () => {
      try {
        const seen = await AsyncStorage.getItem(SWIPE_HINT_KEY);
        if (seen) return;
        // Wait for the landing splash + initial chat render to settle
        setTimeout(() => {
          setShowSwipeHint(true);
          // Fade in
          Animated.timing(hintOpacity, { toValue: 1, duration: 400, useNativeDriver: true }).start();
          // Loop the chevron nudge horizontally
          Animated.loop(
            Animated.sequence([
              Animated.timing(hintArrowX, { toValue: 6,  duration: 600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
              Animated.timing(hintArrowX, { toValue: 0,  duration: 600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
            ]),
          ).start();
          // Auto-dismiss after 6s
          setTimeout(() => dismissSwipeHint(), 6000);
        }, 2200);
      } catch {}
    })();
  }, []);

  function dismissSwipeHint() {
    Animated.timing(hintOpacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
      setShowSwipeHint(false);
    });
    AsyncStorage.setItem(SWIPE_HINT_KEY, 'true').catch(() => {});
  }

  // ── Navigation helpers ───────────────────────────────────────────────────
  function scrollToPage(page: number) {
    scrollRef.current?.scrollTo({ x: page * W, animated: true });
    setActivePage(page);
  }

  function handleScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const page = Math.round(e.nativeEvent.contentOffset.x / W);
    if (page !== activePage) {
      setActivePage(page);
      // Dismiss the swipe hint on first real swipe — user discovered it
      if (showSwipeHint && page === PAGE_DASHBOARD) dismissSwipeHint();
    }
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

      {/* ── Page dots — anchored INSIDE the header band, above the wordmark
          (Session 25). Sit on top of the swipe container so they stay put
          while pages swipe. Tappable — tap right dot to animate to Dashboard. */}
      <View pointerEvents="box-none" style={[s.dotsWrap, { top: insets.top + 10 }]}>
        <TouchableOpacity
          accessibilityLabel="Go to Chat"
          onPress={() => scrollToPage(PAGE_CHAT)}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <View style={[s.dot, activePage === PAGE_CHAT ? s.dotActive : s.dotIdle]} />
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityLabel="Go to Dashboard"
          onPress={() => scrollToPage(PAGE_DASHBOARD)}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <View style={[s.dot, activePage === PAGE_DASHBOARD ? s.dotActive : s.dotIdle]} />
        </TouchableOpacity>
      </View>

      {/* ── First-run swipe hint — one-shot, fades out on dismiss ── */}
      {showSwipeHint && activePage === PAGE_CHAT && (
        <Animated.View
          pointerEvents="box-none"
          style={[s.hintWrap, { opacity: hintOpacity, bottom: insets.bottom + 130 }]}
        >
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => { scrollToPage(PAGE_DASHBOARD); dismissSwipeHint(); }}
            style={s.hintPill}
          >
            <Text style={s.hintText}>Swipe for your Dashboard</Text>
            <Animated.Text style={[s.hintArrow, { transform: [{ translateX: hintArrowX }] }]}>→</Animated.Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* FAB removed — hamburger ☰ in each screen's header opens the new MoreSheet */}

      {/* ── Landing splash — Warm bg + palette orbs (matches onboarding splash) ── */}
      {showLanding && (
        <TouchableOpacity
          style={s.landing}
          activeOpacity={1}
          onPress={() => setShowLanding(false)}
        >
          <View style={s.landingOrbPeach} pointerEvents="none" />
          <View style={s.landingOrbMint} pointerEvents="none" />
          <View style={s.landingOrbLav} pointerEvents="none" />
          <View style={s.landingOrbSky} pointerEvents="none" />

          <View style={s.landingCenter}>
            <Text style={s.landingLogo}>
              z<Text style={s.landingLogoAccent}>a</Text>el
              <Text style={s.landingLogoAccent}>i</Text>
            </Text>
            <Text style={s.landingTagline}>
              Less <Text style={s.landingTaglineCoral}>chaos</Text>.
              <Text>{'\n'}More family.</Text>
            </Text>
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
  // ── Page dots (Session 25) — header-anchored, both pages ──
  dotsWrap: {
    position: 'absolute',
    left: 0, right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    zIndex: 50,
  },
  dot: {
    height: 7,
    borderRadius: 4,
  },
  dotIdle: {
    width: 7,
    backgroundColor: 'rgba(10,10,10,0.20)',
  },
  dotActive: {
    width: 22,
    backgroundColor: '#FF4545',  // coral — primary brand accent (chat send button)
  },
  // ── First-run swipe hint pill (Session 25) — one-shot ──
  hintWrap: {
    position: 'absolute',
    left: 0, right: 0,
    alignItems: 'center',
    zIndex: 50,
  },
  hintPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(10,10,10,0.85)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 22,
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  hintText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    color: '#fff',
    letterSpacing: 0.1,
  },
  hintArrow: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 15,
    color: '#A8D8F0',  // sky blue — matches Dashboard tile in MoreSheet
  },
  landing: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#FAF8F5',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    overflow: 'hidden',
  },
  // Palette orbs — peach, mint, lavender, sky
  landingOrbPeach: {
    position: 'absolute',
    width: 320, height: 320, borderRadius: 160,
    backgroundColor: '#FAC8A8',
    opacity: 0.42,
    top: -100, right: -100,
  },
  landingOrbMint: {
    position: 'absolute',
    width: 280, height: 280, borderRadius: 140,
    backgroundColor: '#B8EDD0',
    opacity: 0.50,
    bottom: -80, left: -90,
  },
  landingOrbLav: {
    position: 'absolute',
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: '#D8CCFF',
    opacity: 0.55,
    top: 140, left: -60,
  },
  landingOrbSky: {
    position: 'absolute',
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: '#A8D8F0',
    opacity: 0.42,
    bottom: 160, right: -50,
  },
  landingCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  landingLogo: {
    fontFamily: 'Poppins_800ExtraBold',
    fontSize: 96,
    color: '#0A0A0A',
    letterSpacing: -4,
    lineHeight: 128,
    paddingTop: 12,
    textAlignVertical: 'center',
  },
  landingLogoAccent: {
    color: '#A8D8F0', // sky blue — My Space identity
  },
  landingTagline: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 26,
    color: '#0A0A0A',
    lineHeight: 36,
    marginTop: 16,
    letterSpacing: 0,
    textAlign: 'center',
  },
  landingTaglineCoral: {
    fontFamily: 'Poppins_700Bold',
    color: '#FF4545',
  },
  landingHint: {
    position: 'absolute',
    bottom: 48,
    fontFamily: 'Poppins_500Medium',
    fontSize: 13,
    color: 'rgba(10,10,10,0.42)',
    letterSpacing: 1.4,
  },
});
