/**
 * index.tsx — Zaeli Home Screen
 * Full redesign: compact blue banner · oversized serif brief · emoji nav rows with sub-notes
 * Add to Chat sheet (SVG) · Claude-style mic + waveform animation
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Animated, Easing, Platform, Modal, Pressable,
} from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import Svg, { Path, Line, Rect, Circle, Polyline } from 'react-native-svg';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../lib/supabase';
import { callGPT } from '../../lib/zaeli-provider';
import { NavMenu, HamburgerButton } from '../components/NavMenu';

// ── Session-level voice overlay flag (resets on cold start) ────
// Once the overlay has been shown, subsequent mic taps go straight
// to zaeli-chat with voiceBarActive — no overlay again that session.
let voiceOverlayShownThisSession = false;

// ── Constants ──────────────────────────────────────────────────
const FAMILY_ID        = '00000000-0000-0000-0000-000000000001';
const MEMBER_NAME      = 'Anna';
const BLUE             = '#0057FF';
const CORAL            = '#FF4545';
const INK              = '#0A0A0A';
const INK2             = 'rgba(10,10,10,0.5)';
const INK3             = 'rgba(10,10,10,0.32)';
const BORDER           = 'rgba(10,10,10,0.08)';
const BG               = '#FAF8F5';
const YELLOW           = '#FFE500';
const SCROLL_THRESHOLD = 120;

// ── Helpers ────────────────────────────────────────────────────
function getGreeting(h: number) {
  if (h < 12) return 'Good morning,';
  if (h < 17) return 'Good afternoon,';
  if (h < 21) return 'Good evening,';
  return 'Good night,';
}
function getGreetingEmoji(h: number) {
  if (h < 12) return '👋';
  if (h < 17) return '☀️';
  if (h < 21) return '🌤️';
  return '🌙';
}
function localDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// ── SVG Icons ──────────────────────────────────────────────────
function IcoPlus() {
  return (
    <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={INK3} strokeWidth="2" strokeLinecap="round">
      <Line x1="12" y1="5" x2="12" y2="19"/>
      <Line x1="5" y1="12" x2="19" y2="12"/>
    </Svg>
  );
}
function IcoMic({ color = INK3 }: { color?: string }) {
  return (
    <Svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <Rect x="9" y="2" width="6" height="11" rx="3"/>
      <Path d="M5 10a7 7 0 0014 0"/>
      <Line x1="12" y1="19" x2="12" y2="23"/>
      <Line x1="8" y1="23" x2="16" y2="23"/>
    </Svg>
  );
}
function IcoSend() {
  return (
    <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <Line x1="12" y1="19" x2="12" y2="5"/>
      <Polyline points="5 12 12 5 19 12"/>
    </Svg>
  );
}
function IcoArrowDown() {
  return (
    <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <Line x1="12" y1="5" x2="12" y2="19"/>
      <Polyline points="19 12 12 19 5 12"/>
    </Svg>
  );
}
function IcoChevron() {
  return (
    <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={INK3} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Polyline points="9 18 15 12 9 6"/>
    </Svg>
  );
}
function IcoClose() {
  return (
    <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={INK} strokeWidth="2.2" strokeLinecap="round">
      <Line x1="18" y1="6" x2="6" y2="18"/>
      <Line x1="6" y1="6" x2="18" y2="18"/>
    </Svg>
  );
}
// Add to Chat sheet SVG icons
function IcoCamera() {
  return (
    <Svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={INK} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
      <Circle cx="12" cy="13" r="4"/>
    </Svg>
  );
}
function IcoPhotos() {
  return (
    <Svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={INK} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <Rect x="3" y="3" width="18" height="18" rx="2"/>
      <Circle cx="8.5" cy="8.5" r="1.5"/>
      <Polyline points="21 15 16 10 5 21"/>
    </Svg>
  );
}
function IcoFiles() {
  return (
    <Svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={INK} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
      <Polyline points="14 2 14 8 20 8"/>
      <Line x1="12" y1="18" x2="12" y2="12"/>
      <Line x1="9" y1="15" x2="15" y2="15"/>
    </Svg>
  );
}

// ── Claude-style waveform animation ────────────────────────────
// 5 bars, each independently animated at different speeds/heights
function WaveformBars() {
  const BAR_COUNT = 5;
  // Heights cycle differently per bar to look organic
  const anims = useRef(
    Array.from({ length: BAR_COUNT }, (_, i) => new Animated.Value(0.3 + i * 0.1))
  ).current;

  useEffect(() => {
    const loops = anims.map((anim, i) => {
      const minH  = 0.2 + i * 0.05;
      const maxH  = 0.7 + (i % 3) * 0.15;
      const speed = 180 + i * 55;
      return Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: maxH, duration: speed, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(anim, { toValue: minH, duration: speed + 40, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      );
    });
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, []);

  return (
    <View style={s.waveRow}>
      {anims.map((anim, i) => (
        <Animated.View
          key={i}
          style={[s.waveBar, { transform: [{ scaleY: anim }] }]}
        />
      ))}
    </View>
  );
}

// ── Typing dots (brief loading) ─────────────────────────────────
function TypingDots() {
  const dots = useRef([0,1,2].map(() => new Animated.Value(0.25))).current;
  useEffect(() => {
    const anims = dots.map((dot, i) =>
      Animated.loop(Animated.sequence([
        Animated.delay(i * 160),
        Animated.timing(dot, { toValue: 1, duration: 300, easing: Easing.ease, useNativeDriver: true }),
        Animated.timing(dot, { toValue: 0.25, duration: 300, easing: Easing.ease, useNativeDriver: true }),
        Animated.delay(500 - i * 160),
      ]))
    );
    anims.forEach(a => a.start());
    return () => anims.forEach(a => a.stop());
  }, []);
  return (
    <View style={s.dotsRow}>
      {dots.map((op, i) => <Animated.View key={i} style={[s.dot, { opacity: op }]} />)}
    </View>
  );
}

// ── Nav rows — emoji + live sub-note text ───────────────────────
// Sub-notes are hardcoded here; in production pull from Supabase
const NAV_ROWS = [
  { key: 'calendar', label: "What's on today",  sub: 'Soccer 4pm · Dentist done',        emoji: '📅', route: '/(tabs)/calendar' },
  { key: 'shopping', label: 'Shopping list',     sub: '8 items · Milk & eggs needed',      emoji: '🛒', route: '/(tabs)/shopping' },
  { key: 'meals',    label: 'Dinner ideas',      sub: 'Tonight unplanned — I can help',    emoji: '🍽️', route: '/(tabs)/mealplanner' },
  { key: 'tutor',    label: 'Zaeli Tutor',       sub: 'Poppy · Maths due today',           emoji: '🎓', route: '/(tabs)/tutor' },
  { key: 'todos',    label: 'To-do list',        sub: '3 tasks · Soccer slip unsigned',    emoji: '✅', route: '/(tabs)/more' },
  { key: 'kids',     label: 'Kids Hub',          sub: 'Poppy · Gab · Duke · Activity',    emoji: '👧', route: '/(tabs)/more' },
  { key: 'notes',    label: 'Notes',             sub: '3 notes this week',                 emoji: '📝', route: '/(tabs)/more' },
  { key: 'travel',   label: 'Travel plans',      sub: 'Easter trip · 3 weeks away',        emoji: '✈️', route: '/(tabs)/more' },
];

// ── Main component ─────────────────────────────────────────────
export default function HomeScreen() {
  const router    = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const now       = new Date();
  const hour      = now.getHours();
  const dateStr   = now.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });

  const [menuOpen,       setMenuOpen]       = useState(false);
  const [briefLoading,   setBriefLoading]   = useState(true);
  const [briefText,      setBriefText]      = useState('');
  const [briefAccent,    setBriefAccent]    = useState('');
  const [briefSub,       setBriefSub]       = useState('');
  const [ctaLabel,       setCtaLabel]       = useState('Yes please');
  const [ctaSeed,        setCtaSeed]        = useState('');
  const [briefGenerated, setBriefGenerated] = useState(false);
  const [showScrollBtn,  setShowScrollBtn]  = useState(false);
  const [showAddSheet,   setShowAddSheet]   = useState(false);

  // Mic — first session tap → voice overlay (full-screen "Chat with Zaeli")
  // Subsequent taps → zaeli-chat with voiceBarActive (types into input bar)
  function handleMicPress() {
    if (!voiceOverlayShownThisSession) {
      voiceOverlayShownThisSession = true;
      router.push('/(tabs)/voice-overlay' as any);
    } else {
      router.push({
        pathname: '/(tabs)/zaeli-chat',
        params: { channel: 'general', returnTo: '/(tabs)/', voiceBarActive: 'true' },
      });
    }
  }

  const scrollBtnOpacity = useRef(new Animated.Value(0)).current;
  const briefOpacity     = useRef(new Animated.Value(0)).current;
  const sheetAnim        = useRef(new Animated.Value(320)).current;

  // ── Add-to-chat sheet ──────────────────────────────────────
  function openSheet() {
    setShowAddSheet(true);
    Animated.spring(sheetAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }).start();
  }

  // Animate out → hide modal → wait for iOS to fully dismiss → then run callback
  function closeSheet(cb?: () => void) {
    Animated.timing(sheetAnim, { toValue: 320, duration: 200, useNativeDriver: true }).start(() => {
      setShowAddSheet(false);
      if (cb) {
        // Wait for the Modal to fully unmount before launching any pickers
        // iOS requires the presenting view controller to be gone first
        setTimeout(cb, 350);
      }
    });
  }

  // Open camera → get image URI → navigate to chat with it
  async function openCamera() {
    closeSheet(async () => {
      try {
        const { granted } = await ImagePicker.requestCameraPermissionsAsync();
        if (!granted) return;
        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.85,
        });
        if (!result.canceled && result.assets?.[0]) {
          router.push({
            pathname: '/(tabs)/zaeli-chat',
            params: { channel: 'general', returnTo: '/(tabs)/', pendingImageUri: result.assets[0].uri },
          });
        }
      } catch (e) { console.error('Camera error:', e); }
    });
  }

  // Open photo library → get image URI → navigate to chat with it
  async function openPhotos() {
    closeSheet(async () => {
      try {
        const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!granted) return;
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.85,
        });
        if (!result.canceled && result.assets?.[0]) {
          router.push({
            pathname: '/(tabs)/zaeli-chat',
            params: { channel: 'general', returnTo: '/(tabs)/', pendingImageUri: result.assets[0].uri },
          });
        }
      } catch (e) { console.error('Photos error:', e); }
    });
  }

  // Files — navigate to chat; zaeli-chat handles file picker from params
  function openFiles() {
    closeSheet(() => {
      router.push({
        pathname: '/(tabs)/zaeli-chat',
        params: { channel: 'general', returnTo: '/(tabs)/', openFilePicker: 'true' },
      });
    });
  }

  // ── Scroll arrow ───────────────────────────────────────────
  const handleScroll = useCallback((e: any) => {
    const { contentSize, layoutMeasurement, contentOffset } = e.nativeEvent;
    const dist = contentSize.height - layoutMeasurement.height - contentOffset.y;
    const show = dist > SCROLL_THRESHOLD;
    if (show !== showScrollBtn) {
      setShowScrollBtn(show);
      Animated.timing(scrollBtnOpacity, { toValue: show ? 1 : 0, duration: 200, useNativeDriver: true }).start();
    }
  }, [showScrollBtn]);

  // ── Brief generation ───────────────────────────────────────
  async function generateBrief() {
    if (briefGenerated) return;
    setBriefLoading(true);
    setBriefGenerated(true);
    try {
      const td = localDateStr(now);
      const [{ data: events }, { data: todos }, { data: meals }] = await Promise.all([
        supabase.from('events').select('title,date,time').eq('family_id', FAMILY_ID).gte('date', td).order('date').limit(5),
        supabase.from('todos').select('title,priority').eq('family_id', FAMILY_ID).eq('done', false).limit(5),
        supabase.from('meal_plans').select('meal_name,date').eq('family_id', FAMILY_ID).gte('date', td).limit(2),
      ]);
      const todayMeal  = meals?.find(m => m.date === td)?.meal_name;
      const dinnerRule = hour < 19
        ? todayMeal ? `Dinner planned: ${todayMeal}.` : 'Dinner not planned yet — mention warmly.'
        : 'Do not mention dinner.';
      const evStr  = events?.length ? events.map(e=>`${e.title} (${e.date===td?'TODAY':e.date}${e.time?' '+e.time:''})`).join(', ') : 'Nothing on calendar';
      const tdStr  = todos?.length  ? todos.slice(0,3).map(t=>t.title).join(', ') : 'No urgent tasks';
      const frame  = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : hour < 21 ? 'evening' : 'night';

      const sys = `You write the Zaeli home brief for ${MEMBER_NAME}. Zaeli is warm, witty, Australian — Anne Hathaway energy. No mate/guys. Never start with I.
TIME: ${now.toLocaleTimeString('en-AU',{hour:'2-digit',minute:'2-digit'})} (${frame})
EVENTS: ${evStr}
URGENT TASKS: ${tdStr}
${dinnerRule}
Return ONLY valid JSON (no markdown):
{"main":"1-2 warm sentences. Wrap ONE key phrase in [ACCENT]...[/ACCENT] — the most important fact. Never start with I.","sub":"One warm specific question ending with ?","cta":"3-4 word button label","seed":"Message to send when CTA tapped"}`;

      const raw    = await callGPT({ feature:'home_brief', familyId:FAMILY_ID, messages:[{role:'user',content:'Generate now.'}], systemPrompt:sys, maxTokens:300 });
      const txt    = raw?.choices?.[0]?.message?.content ?? '';
      const parsed = JSON.parse(txt.replace(/```json|```/g,'').trim());

      const mainRaw: string    = parsed.main ?? '';
      const accentMatch        = mainRaw.match(/\[ACCENT\](.*?)\[\/ACCENT\]/);
      const accentPhrase       = accentMatch ? accentMatch[1] : '';
      const mainClean          = mainRaw.replace(/\[ACCENT\](.*?)\[\/ACCENT\]/g, accentPhrase);

      setBriefText(mainClean);
      setBriefAccent(accentPhrase);
      setBriefSub(parsed.sub ?? '');
      setCtaLabel(parsed.cta ?? 'Yes please');
      setCtaSeed(parsed.seed ?? '');
    } catch {
      setBriefText('Hope the tacos went down well! Soccer at 4pm and the dentist is done — one less thing.');
      setBriefAccent('Soccer at 4pm');
      setBriefSub("Dinner's still wide open — want me to sort something quick?");
      setCtaLabel('Yes please');
      setCtaSeed('Can you help sort dinner?');
    } finally {
      setBriefLoading(false);
      Animated.timing(briefOpacity, { toValue:1, duration:400, useNativeDriver:true }).start();
    }
  }

  useFocusEffect(useCallback(() => { generateBrief(); }, []));

  function openChat(seed = '') {
    router.push({ pathname:'/(tabs)/zaeli-chat', params:{ channel:'general', returnTo:'/(tabs)/', seedMessage:seed } });
  }

  // ── Brief render ──────────────────────────────────────────
  function renderBrief() {
    if (briefLoading) {
      return (
        <View style={s.loadingWrap}>
          <Text style={s.loadingLabel}>Zaeli is thinking…</Text>
          <TypingDots />
        </View>
      );
    }
    const parts = briefAccent && briefText.includes(briefAccent) ? briefText.split(briefAccent) : null;
    return (
      <Animated.View style={{ opacity: briefOpacity }}>
        <Text style={s.briefMain}>
          {parts
            ? <>{parts[0]}<Text style={s.briefAccent}>{briefAccent}</Text>{parts[1] ?? ''}</>
            : briefText
          }
        </Text>
        {briefSub ? <Text style={s.briefSub}>{briefSub}</Text> : null}
      </Animated.View>
    );
  }

  // ─────────────────────────────────────────────────────────
  return (
    <View style={s.root}>
      <ExpoStatusBar style="light" />
      <NavMenu visible={menuOpen} onClose={() => setMenuOpen(false)} />

      {/* ══ COMPACT BLUE BANNER ══ */}
      <SafeAreaView style={s.banner} edges={['top']}>
        <View style={s.bannerOrb} />

        {/* Top row */}
        <View style={s.bannerTopRow}>
          {/* Logo — exact calendar/tutor style */}
          <TouchableOpacity style={s.logoMark} onPress={() => router.replace('/(tabs)/')} activeOpacity={0.8}>
            <View style={s.logoStarBox}>
              <Text style={s.logoStarTxt}>✦</Text>
            </View>
            <Text style={s.logoWord}>
              {'z'}<Text style={{ color: YELLOW }}>{'a'}</Text>{'el'}<Text style={{ color: YELLOW }}>{'i'}</Text>
            </Text>
          </TouchableOpacity>

          <View style={s.bannerRight}>
            {/* Date — same visual weight as hamburger */}
            <Text style={s.bannerDate}>{dateStr}</Text>
            <HamburgerButton onPress={() => setMenuOpen(true)} tint="#fff" />
          </View>
        </View>

        {/* Greeting — bigger, Anna in DM Serif */}
        <Text style={s.bannerGreeting}>{getGreeting(hour)}</Text>
        <Text style={s.bannerName}>
          <Text style={s.bannerNameSerif}>{MEMBER_NAME}</Text>
          {'  '}{getGreetingEmoji(hour)}
        </Text>
      </SafeAreaView>

      {/* ══ SCROLLABLE BODY ══ */}
      <View style={s.scrollWrap}>
        <ScrollView
          ref={scrollRef}
          style={s.scroll}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          {/* Brief */}
          <View style={s.briefBlock}>{renderBrief()}</View>

          {/* CTAs */}
          {!briefLoading && (
            <View style={s.ctas}>
              <TouchableOpacity style={s.btnPrimary} onPress={() => openChat(ctaSeed)} activeOpacity={0.85}>
                <Text style={s.btnPrimaryTxt}>{ctaLabel}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.btnSecondary} activeOpacity={0.7}>
                <Text style={s.btnSecondaryTxt}>All good, thanks</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={s.divider} />

          {/* Nav rows — emoji + sub-notes */}
          <View style={s.navRows}>
            {NAV_ROWS.map((row, i) => (
              <TouchableOpacity
                key={row.key}
                style={[s.navRow, i === NAV_ROWS.length - 1 && { borderBottomWidth: 0 }]}
                onPress={() => router.push(row.route as any)}
                activeOpacity={0.7}
              >
                <View style={s.navRowEmoji}>
                  <Text style={s.navRowEmojiTxt}>{row.emoji}</Text>
                </View>
                <View style={s.navRowText}>
                  <Text style={s.navRowLabel}>{row.label}</Text>
                  <Text style={s.navRowSub}>{row.sub}</Text>
                </View>
                <IcoChevron />
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ height: 36 }} />
        </ScrollView>

        {/* Scroll-to-bottom arrow — Claude style */}
        <Animated.View
          style={[s.scrollDownBtn, { opacity: scrollBtnOpacity }]}
          pointerEvents={showScrollBtn ? 'auto' : 'none'}
        >
          <TouchableOpacity
            style={s.scrollDownInner}
            onPress={() => scrollRef.current?.scrollToEnd({ animated: true })}
            activeOpacity={0.85}
          >
            <IcoArrowDown />
          </TouchableOpacity>
        </Animated.View>

        {/* ══ FLOATING BAR — bigger, Claude-style ══ */}
        <View style={s.floatingBar}>
          <View style={s.floatingBarInner}>

            {/* + Add to Chat */}
            <TouchableOpacity style={s.barIconBtn} onPress={openSheet} activeOpacity={0.75}>
              <IcoPlus />
            </TouchableOpacity>

            <View style={s.barSep} />

            {/* Placeholder text → opens chat */}
            <TouchableOpacity style={{ flex: 1, paddingVertical: 4 }} onPress={() => openChat('')} activeOpacity={0.6}>
              <Text style={s.barPlaceholder}>Chat with Zaeli…</Text>
            </TouchableOpacity>

            {/* Right side: mic — tapping navigates to zaeli-chat in voice mode */}
            <TouchableOpacity style={s.barIconBtn} onPress={handleMicPress} activeOpacity={0.75}>
              <IcoMic color={INK3} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ══ ADD TO CHAT BOTTOM SHEET ══ */}
      <Modal visible={showAddSheet} transparent animationType="none" onRequestClose={() => closeSheet()}>
        <Pressable style={s.sheetOverlay} onPress={() => closeSheet()}>
          <Animated.View style={[s.sheet, { transform: [{ translateY: sheetAnim }] }]}>
            <Pressable onPress={() => {}}>
              {/* Handle bar */}
              <View style={s.sheetHandle} />

              {/* Header */}
              <View style={s.sheetHeader}>
                <TouchableOpacity style={s.sheetCloseBtn} onPress={() => closeSheet()} activeOpacity={0.7}>
                  <IcoClose />
                </TouchableOpacity>
                <Text style={s.sheetTitle}>Add to Chat</Text>
                {/* Spacer to centre title */}
                <View style={{ width: 44 }} />
              </View>

              {/* Tile row */}
              <View style={s.sheetTiles}>
                <TouchableOpacity style={s.sheetTile} activeOpacity={0.75} onPress={openCamera}>
                  <IcoCamera />
                  <Text style={s.sheetTileLabel}>Camera</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.sheetTile} activeOpacity={0.75} onPress={openPhotos}>
                  <IcoPhotos />
                  <Text style={s.sheetTileLabel}>Photos</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.sheetTile} activeOpacity={0.75} onPress={openFiles}>
                  <IcoFiles />
                  <Text style={s.sheetTileLabel}>Files</Text>
                </TouchableOpacity>
              </View>

              <View style={{ height: Platform.OS === 'ios' ? 32 : 20 }} />
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BLUE },

  // ── BANNER ──────────────────────────────────────────────────
  banner: {
    backgroundColor: BLUE,
    paddingHorizontal: 22,
    paddingBottom: 24,
    overflow: 'hidden',
  },
  bannerOrb: {
    position: 'absolute', width: 160, height: 160, borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.07)', top: -55, right: -35,
  },
  bannerTopRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 18, paddingTop: 6,
  },

  // Logo — bigger on home than other screens (was 32/17/22, now 40/21/28)
  logoMark:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoStarBox: { width: 40, height: 40, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  logoStarTxt: { fontSize: 21, color: '#fff' },
  logoWord:    { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 28, color: '#fff', letterSpacing: -0.5 },

  bannerRight: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  // Date — Poppins SemiBold 14px matches hamburger visual weight
  bannerDate: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14, color: 'rgba(255,255,255,0.72)', letterSpacing: 0.1,
  },

  // Greeting — bigger overall
  bannerGreeting: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 17, color: 'rgba(255,255,255,0.82)', marginBottom: 3,
  },
  bannerName: {
    // "Anna" is DMSerifDisplay Italic, emoji after is Poppins bold
    fontSize: 30, color: '#fff', letterSpacing: -0.3,
  },
  // "Anna" rendered as nested Text with DM Serif Italic
  bannerNameSerif: {
    fontFamily: 'DMSerifDisplay_400Italic',
    fontSize: 34, color: '#fff', letterSpacing: -0.8,
  },

  // ── SCROLL ──────────────────────────────────────────────────
  scrollWrap:    { flex: 1, backgroundColor: BG, position: 'relative' },
  scroll:        { flex: 1, backgroundColor: BG },
  scrollContent: { paddingBottom: 130 },

  // ── BRIEF ───────────────────────────────────────────────────
  briefBlock: { paddingHorizontal: 22, paddingTop: 28, paddingBottom: 4, minHeight: 130 },
  loadingWrap: { paddingTop: 6 },
  loadingLabel: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: INK3, marginBottom: 12 },
  dotsRow: { flexDirection: 'row', gap: 7, alignItems: 'center' },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: CORAL },

  briefMain: {
    fontFamily: 'DMSerifDisplay_400Regular',
    fontSize: 48, color: INK, lineHeight: 54, letterSpacing: -2, marginBottom: 12,
  },
  briefAccent: { color: CORAL, fontStyle: 'italic' },
  briefSub: {
    fontFamily: 'DMSerifDisplay_400Italic',
    fontSize: 20, color: INK2, lineHeight: 28, letterSpacing: -0.3,
  },

  // ── CTAs ────────────────────────────────────────────────────
  ctas: {
    flexDirection: 'row', gap: 10, paddingHorizontal: 22, marginTop: 22, marginBottom: 26,
  },
  btnPrimary: {
    flex: 1, paddingVertical: 16, backgroundColor: CORAL,
    borderRadius: 14, alignItems: 'center',
  },
  btnPrimaryTxt: { fontFamily: 'Poppins_700Bold', fontSize: 14, color: '#fff' },
  btnSecondary: {
    flex: 1, paddingVertical: 15, borderWidth: 1.5, borderColor: BORDER,
    borderRadius: 14, alignItems: 'center',
  },
  btnSecondaryTxt: { fontFamily: 'Poppins_500Medium', fontSize: 13, color: INK3 },

  divider: { height: 1, backgroundColor: BORDER, marginHorizontal: 22 },

  // ── NAV ROWS ────────────────────────────────────────────────
  navRows: { paddingHorizontal: 22 },
  navRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  navRowEmoji: {
    width: 50, height: 50, borderRadius: 14,
    backgroundColor: 'rgba(10,10,10,0.04)',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  navRowEmojiTxt: { fontSize: 26 },
  navRowText:  { flex: 1 },
  navRowLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: INK, marginBottom: 3 },
  navRowSub:   { fontFamily: 'Poppins_400Regular', fontSize: 13, color: INK3 },

  // ── SCROLL-DOWN ARROW ───────────────────────────────────────
  scrollDownBtn: {
    position: 'absolute', bottom: 108, left: 0, right: 0,
    alignItems: 'center', zIndex: 50,
  },
  scrollDownInner: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: 'rgba(10,10,10,0.45)',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
  },

  // ── FLOATING BAR — bigger ────────────────────────────────────
  floatingBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 20,
    paddingTop: 12,
  },
  floatingBarInner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff',
    borderRadius: 32,
    paddingVertical: 16,   // bigger than before
    paddingHorizontal: 18,
    borderWidth: 1, borderColor: BORDER,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 18,
    shadowOffset: { width: 0, height: -2 }, elevation: 6,
  },
  barIconBtn: {
    width: 36, height: 36, alignItems: 'center', justifyContent: 'center',
  },
  barSep: { width: 1, height: 20, backgroundColor: 'rgba(10,10,10,0.1)' },
  barPlaceholder: {
    fontFamily: 'Poppins_400Regular', fontSize: 16, color: INK3,
  },

  // Waveform — black circle with animated bars
  barWaveBtn: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: INK,
    alignItems: 'center', justifyContent: 'center',
  },
  waveRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  waveBar: {
    width: 3.5, height: 18, borderRadius: 2,
    backgroundColor: '#fff',
  },

  // ── ADD TO CHAT SHEET ────────────────────────────────────────
  sheetOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.38)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: BG,
    borderTopLeftRadius: 26, borderTopRightRadius: 26,
    paddingHorizontal: 20,
    shadowColor: '#000', shadowOpacity: 0.22, shadowRadius: 22, shadowOffset: { width: 0, height: -4 },
  },
  sheetHandle: {
    width: 38, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(10,10,10,0.14)',
    alignSelf: 'center', marginTop: 12, marginBottom: 4,
  },
  sheetHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingVertical: 18,
  },
  sheetCloseBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(10,10,10,0.07)',
    alignItems: 'center', justifyContent: 'center',
  },
  sheetTitle: {
    fontFamily: 'Poppins_700Bold', fontSize: 17, color: INK,
  },
  sheetTiles: { flexDirection: 'row', gap: 12, marginBottom: 10 },
  sheetTile: {
    flex: 1,
    backgroundColor: 'rgba(10,10,10,0.05)',
    borderRadius: 20, paddingVertical: 32,
    alignItems: 'center', justifyContent: 'center', gap: 14,
  },
  sheetTileLabel: {
    fontFamily: 'Poppins_500Medium', fontSize: 15, color: INK,
  },
});
