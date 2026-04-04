/**
 * landing.tsx — Zaeli Landing Screen
 * Phase 2 · 4 April 2026
 *
 * Appears three times a day during time windows:
 *   Morning  6:00am – 9:00am  → warm amber gradient
 *   Midday  12:00pm – 2:00pm  → cool blue gradient
 *   Evening  5:00pm – 8:00pm  → soft purple gradient
 *
 * Outside all windows → immediately redirects to Chat (index).
 * Already dismissed this window → immediately redirects to Chat.
 * First swipe in any direction → dismisses + redirects to Chat.
 *
 * Brief is generated via GPT-mini on mount.
 * ZaeliFAB present with activeButton=null.
 * Full-screen gradient bleeds behind status bar.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, Animated, PanResponder,
  Platform, StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '../../lib/supabase';
import ZaeliFAB from '../components/ZaeliFAB';

// ── Constants ────────────────────────────────────────────────────────────────
const FAMILY_ID   = '00000000-0000-0000-0000-000000000001';
const MEMBER_NAME = 'Rich';
const OPENAI_URL  = 'https://api.openai.com/v1/chat/completions';
const FLAGS_FILE  = (FileSystem.documentDirectory ?? '') + 'landing_flags.json';

// ── Time window logic ────────────────────────────────────────────────────────
type TimeWindow = 'morning' | 'midday' | 'evening' | null;

// ── TEMP TEST MODE — set TEST_MODE = false before launch ─────────────────
// To test: open the app normally, it will redirect to landing automatically
const TEST_MODE    = true;
const TEST_WINDOW: TimeWindow = 'morning'; // 'morning' | 'midday' | 'evening'
// ─────────────────────────────────────────────────────────────────────────────

function getTimeWindow(hour: number): TimeWindow {
  if (TEST_MODE) return TEST_WINDOW;   // ← TEMP: remove before launch
  if (hour >= 6  && hour < 9)  return 'morning';
  if (hour >= 12 && hour < 14) return 'midday';
  if (hour >= 17 && hour < 20) return 'evening';
  return null;
}

function localDateStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function dismissKey(window: TimeWindow): string {
  return `${localDateStr()}-${window}`;
}

// ── Dismiss flag persistence ─────────────────────────────────────────────────
async function isDismissed(window: TimeWindow): Promise<boolean> {
  if (!window) return true;
  try {
    const raw = await FileSystem.readAsStringAsync(FLAGS_FILE);
    const flags: Record<string, boolean> = JSON.parse(raw);
    return !!flags[dismissKey(window)];
  } catch {
    return false;
  }
}

async function writeDismiss(window: TimeWindow): Promise<void> {
  if (!window) return;
  try {
    let flags: Record<string, boolean> = {};
    try {
      const raw = await FileSystem.readAsStringAsync(FLAGS_FILE);
      flags = JSON.parse(raw);
    } catch {}
    // Write new flag
    flags[dismissKey(window)] = true;
    // Prune old flags — keep last 10 only
    const keys = Object.keys(flags);
    if (keys.length > 10) {
      const pruned: Record<string, boolean> = {};
      keys.slice(-10).forEach(k => { pruned[k] = true; });
      flags = pruned;
    }
    await FileSystem.writeAsStringAsync(FLAGS_FILE, JSON.stringify(flags));
  } catch {}
}

// ── GPT call (same pattern as index.tsx) ────────────────────────────────────
async function callGPT(system: string, userMsg: string, maxTokens = 160): Promise<string> {
  const key = process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? '';
  if (!key) return '';
  const res = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: 'gpt-5.4-mini',
      max_completion_tokens: maxTokens,
      messages: [{ role: 'system', content: system }, { role: 'user', content: userMsg }],
    }),
  });
  const json = await res.json();
  return json?.choices?.[0]?.message?.content?.trim() ?? '';
}

// ── Gradient configs per time window ────────────────────────────────────────
const GRADIENTS: Record<NonNullable<TimeWindow>, readonly [string, string]> = {
  morning: ['#FFF6EC', '#FFDEB8'],
  midday:  ['#EDF6FF', '#C4DFFF'],
  evening: ['#F5EEFF', '#D8C8F8'],
};

// Logo AI letter colour — warm blush on all windows
const AI_COLOURS: Record<NonNullable<TimeWindow>, string> = {
  morning: '#F0C8C0',  // warm blush — contrasts cyan highlights on cream
  midday:  '#F0C8C0',
  evening: '#F0C8C0',
};

// Highlight colour for key facts — cyan, distinct from sky blue logo
const HIGHLIGHT_COLOURS: Record<NonNullable<TimeWindow>, string> = {
  morning: '#0096C7',  // cyan — cool against warm cream, energetic not alarming
  midday:  '#0096C7',
  evening: '#0096C7',
};

const GREETING: Record<NonNullable<TimeWindow>, string> = {
  morning: `Good morning, ${MEMBER_NAME}`,
  midday:  `Good afternoon, ${MEMBER_NAME}`,
  evening: `Good evening, ${MEMBER_NAME}`,
};

// ── Brief system prompt ──────────────────────────────────────────────────────
function buildBriefPrompt(window: TimeWindow, contextLines: string[]): string {
  const tod = window === 'morning' ? 'morning' : window === 'midday' ? 'afternoon' : 'evening';
  const tone = window === 'morning'
    ? 'Energetic, clear. Like a smart friend handing you the day.'
    : window === 'midday'
    ? 'Grounded, practical. Mid-stride. What matters right now.'
    : 'Warm, settling. Day winding down. Calm but switched on.';
  return `You are Zaeli — sharp, warm AI for Rich's Australian family (Anna, Poppy 12, Gab 10, Duke 8).
Write the ${tod} brief. EXACTLY 3 sentences. Max 180 characters TOTAL — be ruthlessly concise.
Tone: ${tone}

Sentence 1: Most urgent/time-sensitive thing. Specific. No waffle.
Sentence 2: One win, one clear gap, or something already handled. Short.
Sentence 3: ONE warm Zaeli observation — dry wit, human, specific to this family. NOT generic motivation.

Rules:
- Do NOT open with the person's name
- Wrap key facts (times, names) in [square brackets] for highlight
- NEVER start with "I". No emojis. No "Rich:" prefix.
- Banned phrases: "sorted", "chaos", "tidy", "locked in", "breathing room", "quick wins", "stack up", "first step", "you've got this", "make it count"
Context: ${contextLines.join(' ')}`;
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function LandingScreen() {
  const router = useRouter();
  const now    = new Date();
  const hour   = now.getHours();
  const window = getTimeWindow(hour);

  const [ready,     setReady]     = useState(false);   // true once dismiss check done
  const [briefText, setBriefText] = useState('');       // raw brief string
  const [briefSub,  setBriefSub]  = useState('');       // sub-line (tonight's dinner etc)
  const [loading,   setLoading]   = useState(true);     // brief still generating

  const dismissed  = useRef(false);
  const fadeAnim   = useRef(new Animated.Value(0)).current;
  const briefAnim  = useRef(new Animated.Value(0)).current;

  // ── Check dismiss on mount ────────────────────────────────────────────────
  useEffect(() => {
    async function check() {
      // TEMP: clear dismiss flags every launch so landing always shows in test mode
      if (TEST_MODE) {
        try { await FileSystem.writeAsStringAsync(FLAGS_FILE, JSON.stringify({})); } catch {}
      }
      // Outside all time windows → skip landing entirely
      if (!window) {
        router.navigate('/(tabs)/index' as any);
        return;
      }
      const alreadyDismissed = await isDismissed(window);
      if (alreadyDismissed) {
        router.navigate('/(tabs)/index' as any);
        return;
      }
      // We're good to show landing
      setReady(true);
      // Fade in the screen
      Animated.timing(fadeAnim, {
        toValue: 1, duration: 400, useNativeDriver: true,
      }).start();
      // Start generating the brief
      generateBrief();
    }
    check();
  }, []);

  // ── Generate brief ────────────────────────────────────────────────────────
  const generateBrief = useCallback(async () => {
    setLoading(true);
    try {
      const today    = localDateStr();
      const tomorrow = (() => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      })();

      const [eventsRes, todosRes, mealsRes] = await Promise.all([
        supabase.from('events')
          .select('title, date, start_time, assignees')
          .eq('family_id', FAMILY_ID)
          .gte('date', today)
          .lte('date', tomorrow)
          .order('date').order('start_time').limit(5),
        supabase.from('todos')
          .select('title, priority, due_date')
          .eq('family_id', FAMILY_ID)
          .eq('status', 'active')
          .order('created_at', { ascending: false }).limit(4),
        supabase.from('meal_plans')
          .select('meal_name, day_key')
          .eq('family_id', FAMILY_ID)
          .eq('day_key', today).limit(1),
      ]);

      const events  = eventsRes.data  ?? [];
      const todos   = todosRes.data   ?? [];
      const meals   = mealsRes.data   ?? [];

      // Build raw time string (no timezone)
      function fmtTime(t?: string | null): string {
        if (!t) return '';
        const timePart = t.includes('T') ? t.split('T')[1] : t.split(' ')[1] || '';
        if (!timePart) return '';
        const [hStr, mStr] = timePart.split(':');
        const h = parseInt(hStr, 10); const m = parseInt(mStr, 10);
        if (isNaN(h) || isNaN(m)) return '';
        const ampm = h >= 12 ? 'pm' : 'am';
        const h12  = h === 0 ? 12 : h > 12 ? h-12 : h;
        return `${h12}:${String(m).padStart(2,'0')} ${ampm}`;
      }

      const contextLines: string[] = [];
      if (events.length > 0) {
        const todayEvs = events.filter(e => e.date === today);
        const tomEvs   = events.filter(e => e.date === tomorrow);
        if (todayEvs.length > 0) {
          contextLines.push(`Today: ${todayEvs.map(e => `${e.title}${e.start_time ? ` at ${fmtTime(e.start_time)}` : ''}`).join(', ')}.`);
        }
        if (tomEvs.length > 0) {
          contextLines.push(`Tomorrow: ${tomEvs.map(e => e.title).join(', ')}.`);
        }
      } else {
        contextLines.push('Calendar is clear today.');
      }
      if (todos.length > 0) {
        const urgent = todos.filter(t => t.priority === 'high' || t.due_date === today);
        if (urgent.length > 0) {
          contextLines.push(`Urgent: ${urgent.map(t => t.title).join(', ')}.`);
        }
      }
      if (meals.length > 0) {
        contextLines.push(`Tonight: ${meals[0].meal_name}.`);
        setBriefSub(`${meals[0].meal_name} tonight`);
      }

      const system = buildBriefPrompt(window, contextLines);
      const raw    = await callGPT(system, 'Generate the brief now.', 200);

      if (raw) {
        setBriefText(raw);
        // Fade in the brief text
        Animated.timing(briefAnim, {
          toValue: 1, duration: 500, useNativeDriver: true,
        }).start();
      }
    } catch (e) {
      console.error('[Landing] brief error:', e);
      setBriefText(`${MEMBER_NAME}, here's the day ahead.`);
      Animated.timing(briefAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    } finally {
      setLoading(false);
    }
  }, [window]);

  // ── Dismiss handler ───────────────────────────────────────────────────────
  const dismiss = useCallback(async () => {
    if (dismissed.current) return;
    dismissed.current = true;
    await writeDismiss(window);
    // Fade out, then navigate
    Animated.timing(fadeAnim, {
      toValue: 0, duration: 280, useNativeDriver: true,
    }).start(() => {
      router.navigate('/(tabs)/index' as any);
    });
  }, [window]);

  // ── Swipe detection via PanResponder ─────────────────────────────────────
  const panResponder = useRef(
    PanResponder.create({
      // Don't claim the touch on start — let taps pass through to FAB
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      // Only claim when there's clear movement (swipe gesture)
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dx) > 12 || Math.abs(gs.dy) > 12,
      onMoveShouldSetPanResponderCapture: () => false,
      onPanResponderRelease: (_, gs) => {
        if (Math.abs(gs.dx) > 50 || Math.abs(gs.dy) > 50) {
          dismiss();
        }
      },
    })
  ).current;

  // ── Render brief with per-window highlight colour ─────────────────────────
  function renderBrief(text: string, highlightColour: string) {
    const parts = text.split(/(\[[^\]]+\])/g);
    return parts.map((part, i) => {
      if (part.startsWith('[') && part.endsWith(']')) {
        return (
          <Text key={i} style={[styles.briefHighlight, { color: highlightColour }]}>
            {part.slice(1, -1)}
          </Text>
        );
      }
      return <Text key={i}>{part}</Text>;
    });
  }

  // ── Early exit states ─────────────────────────────────────────────────────
  if (!ready) return null;
  if (!window) return null;

  const gradient       = GRADIENTS[window];
  const aiColour       = AI_COLOURS[window];
  const highlightColour = HIGHLIGHT_COLOURS[window];
  const greeting       = GREETING[window];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Animated.View style={[styles.root, { opacity: fadeAnim }]}>
      <ExpoStatusBar style="dark" animated/>

      {/* Full-bleed background */}
      <View
        style={[
          StyleSheet.absoluteFillObject,
          { backgroundColor: gradient[0] },
        ]}
      />

      {/* Swipe detection layer */}
      <View style={styles.swipeLayer} {...panResponder.panHandlers}>

        {/* Content */}
        <View style={styles.inner}>

          {/* Logo — top left, both 'a' and 'i' in ai colour */}
          <View style={styles.logoWrap}>
            <Text style={styles.logo}>
              z<Text style={{ color: aiColour }}>a</Text>el<Text style={{ color: aiColour }}>i</Text>
            </Text>
          </View>

          {/* Brief hero — centred vertically */}
          <View style={styles.briefWrap}>

            {/* Greeting label */}
            <Text style={styles.greeting}>{greeting.toUpperCase()}</Text>

            {/* Brief text */}
            {loading ? (
              <View style={styles.loadingWrap}>
                <LoadingDots highlightColour={highlightColour}/>
              </View>
            ) : (
              <Animated.View style={{ opacity: briefAnim }}>
                <Text style={styles.brief}>
                  {renderBrief(briefText, highlightColour)}
                </Text>
                {!!briefSub && (
                  <Text style={styles.briefSub}>{briefSub}</Text>
                )}
              </Animated.View>
            )}

          </View>

        </View>

        {/* Dots indicator — 3 dots, Landing = middle (active) */}
        <View style={styles.dotsRow}>
          <View style={styles.dot}/>
          <View style={[styles.dot, styles.dotActive]}/>
          <View style={styles.dot}/>
        </View>

        {/* FAB spacer — keeps content from sitting behind FAB */}
        <View style={styles.fabSpacer}/>

      </View>

      {/* ZaeliFAB — always present */}
      <ZaeliFAB
        activeButton={null}
        onDashboard={() => dismiss()}
        onChat={() => dismiss()}
        onChatKeyboard={() => dismiss()}
        onMoreItem={() => dismiss()}
        onMicResult={() => dismiss()}
      />

    </Animated.View>
  );
}

// ── Loading dots ─────────────────────────────────────────────────────────────
function LoadingDots({ highlightColour = '#E8601A' }: { highlightColour?: string }) {
  const dots = useRef([0, 1, 2].map(() => new Animated.Value(0.25))).current;
  const { Easing } = require('react-native');

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
    <View style={styles.dotsLoadRow}>
      {dots.map((op, i) => (
        <Animated.View key={i} style={[styles.dotLoad, { opacity: op, backgroundColor: highlightColour }]}/>
      ))}
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const STATUS_BAR_H = Platform.OS === 'ios' ? 54 : (StatusBar.currentHeight ?? 24) + 8;

const styles = StyleSheet.create({

  root: {
    position: 'absolute',
    inset: 0,
    flex: 1,
  } as any,

  swipeLayer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },

  inner: {
    flex: 1,
    paddingTop: STATUS_BAR_H + 8,
    paddingHorizontal: 28,
    paddingBottom: 0,
  },

  // Logo
  logoWrap: {
    marginBottom: 0,
  },
  logo: {
    fontFamily: 'DMSerifDisplay_400Regular',
    fontSize: 36,
    letterSpacing: -0.8,
    color: '#0A0A0A',
    lineHeight: 42,
  },

  // Brief section — centred in remaining space
  briefWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 24,
  },

  greeting: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    letterSpacing: 0.8,
    color: 'rgba(10,10,10,0.35)',
    marginBottom: 18,
  },

  brief: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 26,
    lineHeight: 38,
    letterSpacing: -0.5,
    color: '#0A0A0A',
  },

  briefHighlight: {
    color: '#E8601A', // overridden inline per window
  },

  briefSub: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: 'rgba(10,10,10,0.34)',
    marginTop: 16,
    lineHeight: 20,
  },

  // Loading dots
  loadingWrap: {
    paddingVertical: 8,
  },
  dotsLoadRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  dotLoad: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E8601A', // overridden by prop
  },

  // Navigation dots — pushed higher, more breathing room above FAB
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingBottom: 28,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(10,10,10,0.16)',
  },
  dotActive: {
    width: 20,
    borderRadius: 3,
    backgroundColor: 'rgba(10,10,10,0.38)',
  },

  // Space so content clears FAB
  fabSpacer: {
    height: Platform.OS === 'ios' ? 96 : 82,
  },
});
