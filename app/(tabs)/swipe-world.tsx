/**
 * swipe-world.tsx — Zaeli Swipe World Container
 * 7 April 2026 — v3 (Phase 3b: My Space wired)
 *
 * Pages:
 *   0 = Dashboard
 *   1 = Chat (HomeScreen named export from index.tsx)
 *   2 = My Space (MySpaceScreen)
 */

import React, { useRef, useState, useEffect } from 'react';
import {
  View, ScrollView, Dimensions, StyleSheet, Platform,
  Text, TouchableOpacity,
  NativeSyntheticEvent, NativeScrollEvent,
} from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { setPendingChatContext } from '../../lib/navigation-store';

import ZaeliFAB, { ZaeliFABHandle } from '../components/ZaeliFAB';
import DashboardScreen from './dashboard';
import { HomeScreen as ChatScreen } from './index';
import MySpaceScreen from './my-space';

// ── Constants ────────────────────────────────────────────────────────────────
const { width: W } = Dimensions.get('window');

const PAGE_DASHBOARD = 0;
const PAGE_CHAT      = 1;
const PAGE_MYSPACE   = 2;

const USER_INITIAL = 'R';
const USER_COLOR   = '#A8D8F0';

const DOT_COLORS  = ['#FAC8A8', '#D8CCFF', '#A8D8F0'];
const PAGE_ACTIVE = ['dashboard', 'chat', 'myspace'] as const;

const LANDING_TEST_MODE = true; // set false before launch

// ── Main ─────────────────────────────────────────────────────────────────────
export default function SwipeWorld() {
  const router    = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const fabRef    = useRef<ZaeliFABHandle>(null);

  const [activePage,  setActivePage]  = useState(PAGE_DASHBOARD);
  const [fabActive,   setFabActive]   = useState<'dashboard' | 'chat' | 'keyboard' | 'myspace'>('dashboard');
  const [showLanding, setShowLanding] = useState(false);
  const [pendingMicText, setPendingMicText] = useState<string|null>(null);
  const [contextTrigger, setContextTrigger] = useState(0);

  // Open on Dashboard
  useEffect(() => {
    const t = setTimeout(() => {
      scrollRef.current?.scrollTo({ x: PAGE_DASHBOARD * W, animated: false });
    }, 80);
    return () => clearTimeout(t);
  }, []);

  // Landing time-window check
  useEffect(() => {
    if (LANDING_TEST_MODE) { setShowLanding(true); return; }
    const h = new Date().getHours();
    if ((h >= 6 && h < 9) || (h >= 12 && h < 14) || (h >= 17 && h < 20)) {
      setShowLanding(true);
    }
  }, []);

  // ── Navigation helpers ───────────────────────────────────────────────────
  function scrollToPage(page: number) {
    scrollRef.current?.scrollTo({ x: page * W, animated: true });
    setActivePage(page);
    setFabActive(PAGE_ACTIVE[page]);
  }

  function handleScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const page = Math.round(e.nativeEvent.contentOffset.x / W);
    if (page !== activePage) {
      setActivePage(page);
      setFabActive(PAGE_ACTIVE[page]);
    }
  }

  // ── FAB handlers ─────────────────────────────────────────────────────────
  function onDashboard() { scrollToPage(PAGE_DASHBOARD); }

  function onChat() {
    if (activePage === PAGE_CHAT) {
      setFabActive('keyboard');
    } else {
      scrollToPage(PAGE_CHAT);
    }
  }

  function onMySpace() { scrollToPage(PAGE_MYSPACE); }

  function onMoreItem(key: string) {
    if (key === 'calendar') {
      setPendingChatContext({ type:'calendar_sheet' as any, event:{ tab:'today' }, returnTo:'dashboard' } as any);
      setContextTrigger(c => c + 1);
      scrollToPage(PAGE_CHAT);
      return;
    }
    if (key === 'shopping') {
      setPendingChatContext({ type:'shopping_sheet' as any, returnTo:'dashboard' } as any);
      setContextTrigger(c => c + 1);
      scrollToPage(PAGE_CHAT);
      return;
    }
    const sheetKeys = ['meals', 'todos', 'notes', 'travel'];
    if (sheetKeys.includes(key)) {
      scrollToPage(PAGE_CHAT);
      return;
    }
    const screens: Record<string, string> = {
      tutor:    '/(tabs)/tutor',
      kids:     '/(tabs)/kids',
      family:   '/(tabs)/family',
      settings: '/(tabs)/settings',
    };
    if (screens[key]) router.navigate(screens[key] as any);
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <View style={s.root}>
      <ExpoStatusBar style="dark" animated />

      {/* ── Three-page horizontal scroll ── */}
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
        {/* Page 0 — Dashboard */}
        <View style={s.page}>
          <DashboardScreen onNavigateChat={() => scrollToPage(PAGE_CHAT)} isActive={activePage === PAGE_DASHBOARD} onContextTrigger={() => setContextTrigger(c => c + 1)} />
        </View>

        {/* Page 1 — Chat */}
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

        {/* Page 2 — My Space */}
        <View style={s.page}>
          <MySpaceScreen onNavigateChat={() => scrollToPage(PAGE_CHAT)} />
        </View>
      </ScrollView>

      {/* ── 3-dot page indicator ── */}
      <View style={s.dots} pointerEvents="none">
        {[0, 1, 2].map(i => (
          <View
            key={i}
            style={[
              s.dot,
              activePage === i && {
                width: 16,
                borderRadius: 3,
                backgroundColor: DOT_COLORS[i],
              },
            ]}
          />
        ))}
      </View>

      {/* ── FAB — hidden on chat page so it doesn't block chat bar touches ── */}
      {activePage !== PAGE_CHAT && <ZaeliFAB
        ref={fabRef}
        activeButton={fabActive}
        userInitial={USER_INITIAL}
        userColor={USER_COLOR}
        onDashboard={onDashboard}
        onChat={onChat}
        onMySpace={onMySpace}
        onChatKeyboard={() => setFabActive('keyboard')}
        onMoreItem={onMoreItem}
        onMicResult={(text: string) => { setPendingMicText(text); scrollToPage(PAGE_CHAT); }}
      />}

      {/* ── Landing overlay ── */}
      {showLanding && (
        <TouchableOpacity
          style={s.landing}
          activeOpacity={1}
          onPress={() => setShowLanding(false)}
        >
          <Text style={s.landingLogo}>
            z<Text style={{ color: '#A8D8F0' }}>a</Text>el
            <Text style={{ color: '#A8D8F0' }}>i</Text>
          </Text>
          <Text style={s.landingHint}>Tap anywhere to continue</Text>
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
  dots: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 112 : 96,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
    zIndex: 998,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(10,10,10,0.14)',
  },
  landing: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(10,10,10,0.60)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  landingLogo: {
    fontFamily: 'Poppins_800ExtraBold',
    fontSize: 56,
    color: '#fff',
    letterSpacing: -2,
    lineHeight: 64,
  },
  landingHint: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: 'rgba(255,255,255,0.45)',
    marginTop: 16,
  },
});
