/**
 * app/tour/index.tsx — Post-onboarding tour route.
 *
 * Single-route component. Reads tour-state, renders the current stop card.
 * "Open X" CTA either routes to a live module or sets a pendingChatContext
 * + nav to swipe-world (which opens the corresponding sheet).
 *
 * "Next →" advances stop. "Skip to end" → finale celebration. Finale has
 * a single "Take me to chat" CTA which marks complete + routes home.
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Platform, StatusBar as RNStatusBar, Animated, Easing,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import {
  loadTourState, getCurrentStop, getStopById,
  advanceStop, goBackStop, skipToFinale, completeTour,
  startTourIfNeeded, markOpened, getProgressPct,
  getEffectiveStops, getEffectiveTotal,
  STOPS, TOTAL_STOPS, StopPosition, TourStop,
} from '../../lib/tour-state';
import { setPendingChatContext } from '../../lib/navigation-store';

const BG = '#FAF8F5';
const INK = '#0A0A0A';
const INK2 = 'rgba(10,10,10,0.72)';
const INK3 = 'rgba(10,10,10,0.55)';
const INK4 = 'rgba(10,10,10,0.42)';
const LINE = 'rgba(10,10,10,0.08)';
const SOFT = 'rgba(10,10,10,0.05)';
const CARD = '#FFFFFF';
const CORAL = '#FF4545';
const MINT_DEEP = '#2D7A52';
const MINT_TINT = '#E6F7EF';
const MINT_LINE = '#C8F0DA';
const SKY_BG = '#E8F4FD';
const SKY_DEEP = '#0A4A6A';

export default function TourScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [position, setPosition] = useState<StopPosition>(1);
  const [ready, setReady] = useState(false);
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Load state on mount
  useEffect(() => {
    (async () => {
      await loadTourState();
      await startTourIfNeeded();
      await markOpened();
      setPosition(getCurrentStop());
      // Snap progress to current value without animating on first load
      progressAnim.setValue(getProgressPct());
      setReady(true);
    })();
  }, []);

  // Animate progress whenever position changes
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: getProgressPct(),
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // width animation can't use native driver
    }).start();
  }, [position]);

  // Re-read state on focus (in case user came back from a live sheet)
  useFocusEffect(useCallback(() => {
    if (ready) setPosition(getCurrentStop());
  }, [ready]));

  // Status bar
  useFocusEffect(useCallback(() => {
    if (Platform.OS === 'android') RNStatusBar.setBarStyle('dark-content', true);
    return () => {};
  }, []));

  if (!ready) {
    return <View style={[s.root, { paddingTop: insets.top }]} />;
  }

  // ── Finale ───────────────────────────────────────────────────────────────
  if (position === 'finale') {
    return (
      <View style={[s.root, { paddingTop: insets.top + 8 }]}>
        <StatusBar style="dark"/>
        <View style={s.finaleWrap}>
          <Text style={s.finaleEmoji}>🎉</Text>
          <Text style={s.finaleH1}>That’s the lot.</Text>
          <Text style={s.finaleSub}>You’ve seen everything I do. Now go play — I’ll keep showing you new things along the way.</Text>
          <View style={s.finaleSummary}>
            <FinaleRow text={'Daily loop — Shopping, Meals, Calendar, Kids, Tasks, Photos'}/>
            <FinaleRow text={'Hero — Tutor (free 14 days)'} highlight/>
            <FinaleRow text={'Bonus — Travel, Budget, My Space, Family'}/>
          </View>
          <TouchableOpacity
            style={s.finaleCta}
            activeOpacity={0.85}
            onPress={async () => {
              await completeTour();
              router.replace('/(tabs)/swipe-world' as any);
            }}
          >
            <Text style={s.finaleCtaTxt}>Take me to chat ✨</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Stop ─────────────────────────────────────────────────────────────────
  const stop = getStopById(position as number);
  if (!stop) {
    // Defensive — shouldn't happen
    return (
      <View style={[s.root, { paddingTop: insets.top + 8 }]}>
        <Text style={{ padding: 20 }}>Tour stop missing.</Text>
      </View>
    );
  }

  function handleOpenCta() {
    if (!stop) return;
    const t = stop.ctaTarget;
    if (t.kind === 'route') {
      router.navigate(t.path as any);
    } else if (t.kind === 'sheet') {
      setPendingChatContext(t.ctx);
      router.navigate('/(tabs)/swipe-world' as any);
    } else if (t.kind === 'chat') {
      router.navigate('/(tabs)/swipe-world' as any);
    }
  }

  async function handleNext() {
    const next = await advanceStop();
    setPosition(next);
  }

  async function handleBack() {
    const prev = await goBackStop();
    setPosition(prev);
  }

  async function handleSkipToEnd() {
    await skipToFinale();
    setPosition('finale');
  }

  function handleClose() {
    router.replace('/(tabs)/swipe-world' as any);
  }

  const isHero = !!stop.isHero;
  // Effective list (kids skip Budget + Family, adults see all 11)
  const effectiveStops = getEffectiveStops();
  const effectiveTotal = effectiveStops.length;
  const effectiveIdx = effectiveStops.findIndex(es => es.id === stop.id);
  const displayPos = effectiveIdx >= 0 ? effectiveIdx + 1 : 1;
  const isLastStop = effectiveIdx === effectiveTotal - 1;
  const eyebrowLabel = isHero
    ? `🧭 TOUR · STOP ${displayPos} OF ${effectiveTotal} · HERO`
    : `🧭 TOUR · STOP ${displayPos} OF ${effectiveTotal}`;

  return (
    <View style={[s.root, { paddingTop: insets.top + 4 }]}>
      <StatusBar style="dark"/>

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.headerBtn} onPress={handleClose} activeOpacity={0.7}>
          <Text style={s.headerBtnIcon}>✕</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleSkipToEnd} activeOpacity={0.7}>
          <Text style={s.skipLink}>Skip to end</Text>
        </TouchableOpacity>
      </View>

      {/* Title block */}
      <View style={s.titleBlock}>
        <Text style={[s.eyebrow, { color: stop.accent.eyebrow }]}>{eyebrowLabel}</Text>
        <Text style={s.h1}>{stop.pageH1}</Text>
        <Text style={s.sub}>{stop.pageSub}</Text>
      </View>

      {/* Progress bar — animated width */}
      <View style={s.progressTrack}>
        <Animated.View
          style={[
            s.progressFill,
            {
              backgroundColor: stop.accent.progressFill,
              width: progressAnim.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>

      {/* Card */}
      <ScrollView style={s.cardArea} contentContainerStyle={s.cardAreaContent} showsVerticalScrollIndicator={false}>
        <View
          style={[
            s.card,
            { backgroundColor: stop.accent.cardBg },
            isHero && stop.accent.border ? { borderColor: stop.accent.border, borderWidth: 2 } : null,
          ]}
        >
          {stop.trialBadge && (
            <View style={s.trialBadgeRow}>
              <View style={s.trialBadge}>
                <Text style={s.trialBadgeTxt}>✨  FREE FOR 14 DAYS</Text>
              </View>
            </View>
          )}
          <View style={[s.cardIcon, isHero ? { borderColor: stop.accent.border ?? LINE } : null]}>
            <Text style={s.cardIconTxt}>{stop.emoji}</Text>
          </View>
          <Text style={[s.cardTitle, isHero ? { color: stop.accent.eyebrow } : null]}>
            {stop.cardTitle}
          </Text>
          <Text style={s.cardSub}>{stop.cardSub}</Text>

          {/* Try-saying callout */}
          <TrySaying text={stop.trySaying} type={stop.trySayingType ?? 'speak'} accent={isHero ? stop.accent.eyebrow : undefined}/>

          {/* Feature pills */}
          <View style={s.featureRow}>
            {stop.features.map((f, i) => (
              <View key={i} style={s.featurePill}>
                <Text style={s.featurePillTxt}>{f}</Text>
              </View>
            ))}
          </View>

          {/* CTAs */}
          <TouchableOpacity
            style={[s.ctaPrimary, { backgroundColor: stop.accent.pillBg }]}
            activeOpacity={0.85}
            onPress={handleOpenCta}
          >
            <Text style={[s.ctaPrimaryTxt, { color: stop.accent.pillText }]}>{stop.ctaLabel}</Text>
          </TouchableOpacity>

          {isHero && stop.secondaryCtaLabel && (
            <TouchableOpacity
              style={s.ctaSecondary}
              activeOpacity={0.85}
              onPress={handleOpenCta}
            >
              <Text style={s.ctaSecondaryTxt}>{stop.secondaryCtaLabel}</Text>
            </TouchableOpacity>
          )}

          {stop.priceLine && (
            <Text style={s.priceLine}>{stop.priceLine}</Text>
          )}
        </View>
      </ScrollView>

      {/* Bottom nav */}
      <View style={[s.bottomNav, { paddingBottom: insets.bottom + 14 }]}>
        <TouchableOpacity
          style={[s.navBtn, s.navBack, effectiveIdx <= 0 && s.navDisabled]}
          activeOpacity={0.85}
          onPress={handleBack}
          disabled={effectiveIdx <= 0}
        >
          <Text style={s.navBackTxt}>← Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            s.navBtn,
            s.navNext,
            { backgroundColor: stop.accent.progressFill },
            isLastStop && { backgroundColor: CORAL, flex: 2 },
          ]}
          activeOpacity={0.85}
          onPress={handleNext}
        >
          <Text style={s.navNextTxt}>
            {isLastStop ? '🎉 Finish tour' : 'Next →'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────
function TrySaying({ text, type, accent }: { text: string; type: 'speak' | 'tap'; accent?: string }) {
  const isTap = type === 'tap';
  const labelColour = accent ?? (isTap ? SKY_DEEP : MINT_DEEP);
  const bg = isTap ? 'rgba(168,216,240,0.15)' : 'rgba(45,122,82,0.08)';
  const border = isTap ? '#A8D8F0' : MINT_LINE;
  return (
    <View style={[s.trySaying, { backgroundColor: bg, borderColor: border }]}>
      <Text style={[s.tryLabel, { color: labelColour }]}>
        {isTap ? '💡 TAP THE 📷 ICON IN CHAT' : '💡 TRY SAYING'}
      </Text>
      <Text style={s.tryText}>{text}</Text>
    </View>
  );
}

function FinaleRow({ text, highlight }: { text: string; highlight?: boolean }) {
  return (
    <View style={s.finaleRow}>
      <Text style={s.finaleCheck}>✓</Text>
      <Text style={[s.finaleRowTxt, highlight && { color: '#6B35D9', fontFamily: 'Poppins_600SemiBold' }]}>
        {text}
      </Text>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  // Header
  header: {
    paddingHorizontal: 18, paddingBottom: 8,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  headerBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: SOFT,
    alignItems: 'center', justifyContent: 'center',
  },
  headerBtnIcon: {
    fontFamily: 'Poppins_600SemiBold', fontSize: 18, color: INK2,
  },
  skipLink: {
    fontFamily: 'Poppins_600SemiBold', fontSize: 15,
    color: MINT_DEEP, textDecorationLine: 'underline',
  },

  // Title block
  titleBlock: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 16 },
  eyebrow: {
    fontFamily: 'Poppins_700Bold', fontSize: 13,
    letterSpacing: 0.9, textTransform: 'uppercase',
    marginBottom: 8,
  },
  h1: {
    fontFamily: 'Poppins_700Bold', fontSize: 32, color: INK,
    lineHeight: 38, letterSpacing: -0.5,
  },
  sub: {
    fontFamily: 'Poppins_400Regular', fontSize: 16, color: INK3,
    lineHeight: 23, marginTop: 8,
  },

  // Progress
  progressTrack: {
    marginHorizontal: 20, marginBottom: 14,
    height: 4, backgroundColor: 'rgba(10,10,10,0.08)', borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 2 },

  // Card area
  cardArea: { flex: 1 },
  cardAreaContent: { paddingBottom: 20 },
  card: {
    marginHorizontal: 20, marginBottom: 14,
    borderRadius: 22, padding: 22,
    borderWidth: 1, borderColor: 'rgba(10,10,10,0.06)',
    position: 'relative',
  },

  trialBadgeRow: {
    flexDirection: 'row', justifyContent: 'flex-end',
    marginBottom: 12,
  },
  trialBadge: {
    backgroundColor: MINT_DEEP,
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 14,
  },
  trialBadgeTxt: {
    fontFamily: 'Poppins_700Bold', fontSize: 12, color: '#fff',
    letterSpacing: 0.7,
  },

  cardIcon: {
    width: 60, height: 60, borderRadius: 18,
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1, borderColor: 'rgba(10,10,10,0.08)',
  },
  cardIconTxt: { fontSize: 32 },
  cardTitle: {
    fontFamily: 'Poppins_700Bold', fontSize: 26, color: INK,
    marginBottom: 8,
  },
  cardSub: {
    fontFamily: 'Poppins_400Regular', fontSize: 16, color: INK2,
    lineHeight: 24, marginBottom: 16,
  },

  // Try saying callout
  trySaying: {
    borderRadius: 14, padding: 14, marginBottom: 16,
    borderWidth: 1, borderStyle: 'dashed',
  },
  tryLabel: {
    fontFamily: 'Poppins_700Bold', fontSize: 12,
    letterSpacing: 0.7, marginBottom: 6,
  },
  tryText: {
    fontFamily: 'Poppins_500Medium', fontSize: 16, color: INK,
    fontStyle: 'italic', lineHeight: 23,
  },

  // Feature pills
  featureRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 18 },
  featurePill: {
    backgroundColor: 'rgba(10,10,10,0.05)',
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 11,
  },
  featurePillTxt: {
    fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: INK2,
  },

  // CTAs
  ctaPrimary: {
    paddingVertical: 15, paddingHorizontal: 18,
    borderRadius: 14, alignItems: 'center',
  },
  ctaPrimaryTxt: { fontFamily: 'Poppins_700Bold', fontSize: 16 },
  ctaSecondary: {
    paddingVertical: 13, paddingHorizontal: 18,
    borderRadius: 14, alignItems: 'center', marginTop: 10,
    borderWidth: 1.5, borderColor: 'rgba(10,10,10,0.10)',
    backgroundColor: 'transparent',
  },
  ctaSecondaryTxt: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: INK2 },
  priceLine: {
    fontFamily: 'Poppins_500Medium', fontSize: 14, color: INK3,
    textAlign: 'center', marginTop: 12,
  },

  // Bottom nav
  bottomNav: {
    flexDirection: 'row', gap: 10,
    paddingHorizontal: 20, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: 'rgba(10,10,10,0.06)',
    backgroundColor: BG,
  },
  navBtn: {
    flex: 1, paddingVertical: 16, borderRadius: 14,
    alignItems: 'center',
  },
  navBack: { backgroundColor: SOFT },
  navBackTxt: { fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: INK2 },
  navNext: {},
  navNextTxt: { fontFamily: 'Poppins_700Bold', fontSize: 16, color: '#fff' },
  navDisabled: { opacity: 0.4 },

  // Finale
  finaleWrap: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: 30, gap: 0,
  },
  finaleEmoji: { fontSize: 64, marginBottom: 16 },
  finaleH1: {
    fontFamily: 'Poppins_700Bold', fontSize: 34, color: INK,
    lineHeight: 40, letterSpacing: -0.5, textAlign: 'center', marginBottom: 14,
  },
  finaleSub: {
    fontFamily: 'Poppins_400Regular', fontSize: 17, color: INK2,
    lineHeight: 26, textAlign: 'center', marginBottom: 26,
  },
  finaleSummary: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: 'rgba(10,10,10,0.08)',
    borderRadius: 16, padding: 18,
    width: '100%', marginBottom: 26,
  },
  finaleRow: { flexDirection: 'row', gap: 10, paddingVertical: 8 },
  finaleCheck: { color: MINT_DEEP, fontFamily: 'Poppins_700Bold', fontSize: 16 },
  finaleRowTxt: {
    fontFamily: 'Poppins_400Regular', fontSize: 15, color: INK2,
    lineHeight: 22, flex: 1,
  },
  finaleCta: {
    backgroundColor: CORAL, paddingVertical: 17, paddingHorizontal: 32,
    borderRadius: 14, width: '100%', alignItems: 'center',
  },
  finaleCtaTxt: { fontFamily: 'Poppins_700Bold', fontSize: 17, color: '#fff' },
});
