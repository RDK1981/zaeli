/**
 * zaeli-chat.tsx — Zaeli Chat Screen
 * Always injects live shopping, calendar and todo data into every GPT call
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, StatusBar as RNStatusBar, Animated,
  Easing, Modal, Pressable, Image, Share, Clipboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import Svg, { Path, Line, Rect, Circle, Polyline, Polygon } from 'react-native-svg';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Audio } from 'expo-av';
import { supabase } from '../../lib/supabase';
import { NavMenu, HamburgerButton } from '../components/NavMenu';

// ── Direct API helpers ────────────────────────────────────────────────────────
const OPENAI_URL  = 'https://api.openai.com/v1/chat/completions';
const GPT_MODEL   = 'gpt-5.4-mini';
const WHISPER_URL = 'https://api.openai.com/v1/audio/transcriptions';

async function callOpenAI(
  systemPrompt: string,
  messages: { role: string; content: string }[],
  maxTokens = 500,
): Promise<string> {
  const key = process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? '';
  if (!key) throw new Error('No OpenAI key');
  const res = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: GPT_MODEL,
      max_completion_tokens: maxTokens,
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
    }),
  });
  const json = await res.json();
  const text = json?.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error(`Empty GPT response: ${JSON.stringify(json)}`);
  return text;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const FAMILY_ID   = '00000000-0000-0000-0000-000000000001';
const MEMBER_NAME = 'Anna';
const BLUE        = '#0057FF';
const CORAL       = '#FF4545';
const INK         = '#0A0A0A';
const INK2        = 'rgba(10,10,10,0.5)';
const INK3        = 'rgba(10,10,10,0.32)';
const BORDER      = 'rgba(10,10,10,0.08)';
const BG          = '#FAF8F5';
const TEAL        = '#1A5F7A';

// ── Time context helper ───────────────────────────────────────────────────────
function getTimeContext() {
  const now    = new Date();
  const h      = now.getHours();
  const frame  = h < 6 ? 'late night' : h < 12 ? 'morning' : h < 17 ? 'afternoon' : h < 21 ? 'evening' : 'night';
  const isLate = h >= 21 || h < 6;
  const dateStr = now.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' });
  return { dateStr, timeStr, frame, isLate };
}

function localDateStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function addDays(date: Date, n: number) {
  const d = new Date(date); d.setDate(d.getDate() + n); return d;
}
function toLocalDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// ── Channel config ─────────────────────────────────────────────────────────────
const CHANNELS: Record<string, { label: string; color: string; persona: string; seeds: string[] }> = {
  general: {
    label: 'Zaeli', color: CORAL,
    persona: `You are Zaeli — a smart, warm, and quietly witty AI for a modern Australian family. You are a teammate, not just an assistant — when Anna's tired or crushing it, you're in it with her. Confident, observant, playful. Vary your tone: sometimes warm and encouraging, sometimes dry, sometimes full camaraderie ("we've got this, Anna!"), sometimes just a quick sharp line. Genuinely positive — celebrate small wins, acknowledge hard days, notice effort. Make Anna feel good about herself and her family. She's doing a lot — Zaeli sees it. Use emojis occasionally — 1-2 when the moment calls for it. Never say "mate". Never use hollow affirmations. Never start with "I". Short and natural. No bullet points, no markdown.`,
    seeds: ["What's on today?", 'Help with dinner', 'Shopping list', 'Kids activities'],
  },
  Calendar: {
    label: 'Calendar', color: '#2055F0',
    persona: `You are Zaeli — smart, organised, and lightly dry about what you see in the calendar. You notice clashes before Anna does, think ahead, and occasionally remark on what's coming ("Thursdays are working hard this week 👀"). You bring energy when something big is coming up — "big week ahead — we've got this." Never sound corporate. Never say "mate". Never start with "I". Use 1-2 emojis when the moment calls for it. Short, warm, specific. No bullet points, no markdown.`,
    seeds: ['What do we have this week?', 'Book something in', 'Move an event', 'Check conflicts'],
  },
  Shopping: {
    label: 'Shopping', color: '#1A7A45',
    persona: `You are Zaeli — practical, food-savvy, and lightly playful. You know exactly what's on the list. Make quick smart suggestions, add small observations, bring a little energy. Never just confirm actions flatly. Examples: "You're one or two ingredients off a very decent dinner here 👀" or "Done — future you is going to be very happy about this 🙌". Never say "mate". Never start with "I". Use 1-2 emojis when right. No bullet points, no markdown.`,
    seeds: ['Add to list', 'What do we need?', 'Pantry check', 'Recipe ingredients'],
  },
  Meals: {
    label: 'Meals', color: '#E8601A',
    persona: `You are Zaeli — food-curious, practical, and warm. You know what the kids like and what's in the pantry. You have opinions (gentle ones). Make dinner feel nearly sorted rather than like a problem. Light, helpful, occasionally a little opinionated. Use 1-2 emojis when the moment calls for it. Never say "mate". Never start with "I". No bullet points, no markdown.`,
    seeds: ["What's for dinner?", 'Quick meal ideas', 'Kids favourites', 'Weekly plan'],
  },
};

// ── SVG Icons ──────────────────────────────────────────────────────────────────
function IcoPlus() {
  return (
    <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={INK3} strokeWidth="2" strokeLinecap="round">
      <Line x1="12" y1="5" x2="12" y2="19"/><Line x1="5" y1="12" x2="19" y2="12"/>
    </Svg>
  );
}
function IcoMic({ color = INK3 }: { color?: string }) {
  return (
    <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <Rect x="9" y="2" width="6" height="11" rx="3"/>
      <Path d="M5 10a7 7 0 0014 0"/>
      <Line x1="12" y1="19" x2="12" y2="23"/><Line x1="8" y1="23" x2="16" y2="23"/>
    </Svg>
  );
}
function IcoSend() {
  return (
    <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <Line x1="12" y1="19" x2="12" y2="5"/><Polyline points="5 12 12 5 19 12"/>
    </Svg>
  );
}
function IcoArrowDown() {
  return (
    <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <Line x1="12" y1="5" x2="12" y2="19"/><Polyline points="19 12 12 19 5 12"/>
    </Svg>
  );
}
function IcoBack() {
  return (
    <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Polyline points="15 18 9 12 15 6"/>
    </Svg>
  );
}
function IcoClose() {
  return (
    <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={INK} strokeWidth="2.2" strokeLinecap="round">
      <Line x1="18" y1="6" x2="6" y2="18"/><Line x1="6" y1="6" x2="18" y2="18"/>
    </Svg>
  );
}
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
      <Line x1="12" y1="18" x2="12" y2="12"/><Line x1="9" y1="15" x2="15" y2="15"/>
    </Svg>
  );
}
function IcoX() {
  return (
    <Svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
      <Line x1="18" y1="6" x2="6" y2="18"/><Line x1="6" y1="6" x2="18" y2="18"/>
    </Svg>
  );
}
function IcoPlay({ color = INK3 }: { color?: string }) {
  return (
    <Svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Polygon points="5 3 19 12 5 21 5 3"/>
    </Svg>
  );
}
function IcoCopy({ color = INK3 }: { color?: string }) {
  return (
    <Svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Rect x="9" y="9" width="13" height="13" rx="2"/>
      <Path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
    </Svg>
  );
}
function IcoForward({ color = INK3 }: { color?: string }) {
  return (
    <Svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Line x1="22" y1="2" x2="11" y2="13"/>
      <Polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </Svg>
  );
}
function IcoThumbUp({ color = INK3 }: { color?: string }) {
  return (
    <Svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z"/>
      <Path d="M7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"/>
    </Svg>
  );
}
function IcoThumbDown({ color = INK3 }: { color?: string }) {
  return (
    <Svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3H10z"/>
      <Path d="M17 2h2.67A2.31 2.31 0 0122 4v7a2.31 2.31 0 01-2.33 2H17"/>
    </Svg>
  );
}

// ── Typing dots ────────────────────────────────────────────────────────────────
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

// ── Waveform bars ──────────────────────────────────────────────────────────────
function WaveformBars() {
  const anims = useRef(Array.from({ length: 5 }, (_, i) => new Animated.Value(0.3 + i * 0.1))).current;
  useEffect(() => {
    const loops = anims.map((anim, i) => {
      const min = 0.2 + i * 0.05, max = 0.7 + (i % 3) * 0.15, spd = 180 + i * 55;
      return Animated.loop(Animated.sequence([
        Animated.timing(anim, { toValue: max, duration: spd, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(anim, { toValue: min, duration: spd + 40, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]));
    });
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, []);
  return (
    <View style={s.waveRow}>
      {anims.map((anim, i) => <Animated.View key={i} style={[s.waveBar, { transform: [{ scaleY: anim }] }]} />)}
    </View>
  );
}

// ── Message type ───────────────────────────────────────────────────────────────
interface Msg {
  id: string; role: 'user' | 'zaeli'; text: string; imageUri?: string; ts: string;
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function ZaeliChat() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    channel?: string; returnTo?: string; seedMessage?: string;
    autoMic?: string; pendingImageUri?: string;
  }>();

  const returnTo  = params.returnTo || '/(tabs)/';
  const seedMsg   = params.seedMessage || '';
  const scrollRef = useRef<ScrollView>(null);
  const inputRef  = useRef<TextInput>(null);

  const [menuOpen,      setMenuOpen]      = useState(false);
  const [activeCtx,     setActiveCtx]     = useState('general');
  const [messages,      setMessages]      = useState<Msg[]>([]);
  const [input,         setInput]         = useState('');
  const [loading,       setLoading]       = useState(false);
  const [showHints,     setShowHints]     = useState(true);
  const [showAddSheet,  setShowAddSheet]  = useState(false);
  const [pendingImage,  setPendingImage]  = useState<string | null>(null);
  const [isRecording,   setIsRecording]   = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [thumbs,        setThumbs]        = useState<Record<string, 'up' | 'down' | null>>({});

  // Live platform data — loaded once, used in every system prompt
  const [shoppingItems, setShoppingItems] = useState<any[]>([]);
  const [liveEvents,    setLiveEvents]    = useState<any[]>([]);
  const [liveTodos,     setLiveTodos]     = useState<any[]>([]);

  const scrollBtnAnim   = useRef(new Animated.Value(0)).current;
  const recordingRef    = useRef<Audio.Recording | null>(null);
  const sheetAnim       = useRef(new Animated.Value(320)).current;
  const seedHandled     = useRef(false);
  const greetingHandled = useRef(false);
  const isAtBottom      = useRef(true);

  // ── Channel sync ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const ch = params.channel || 'general';
    setActiveCtx(CHANNELS[ch] ? ch : 'general');
  }, [params.channel]);

  useEffect(() => {
    if (params.pendingImageUri) setPendingImage(params.pendingImageUri);
  }, [params.pendingImageUri]);

  // ── Load live platform data ───────────────────────────────────────────────────
  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    const td = localDateStr();
    Promise.all([
      supabase.from('shopping_items').select('id,name,checked')
        .eq('family_id', FAMILY_ID).eq('checked', false).limit(200),
      supabase.from('events').select('title,date,time')
        .eq('family_id', FAMILY_ID).gte('date', td).order('date').order('time').limit(10),
      supabase.from('todos').select('title,priority')
        .eq('family_id', FAMILY_ID).eq('done', false).limit(10),
    ]).then(([shop, events, todos]) => {
      console.log('SHOPPING DEBUG — count:', shop.data?.length, 'error:', shop.error?.message);
      console.log('SHOPPING sample:', JSON.stringify(shop.data?.slice(0,3)));
      setShoppingItems(shop.data || []);
      setLiveEvents(events.data || []);
      setLiveTodos(todos.data || []);
      setDataLoaded(true);
    }).catch((e) => { console.error('Live data fetch error:', e); setDataLoaded(true); });
  }, []);

  // ── Seed message — wait for live data first ──────────────────────────────────
  // Reset seedHandled whenever seedMsg changes so returning with a new seed works
  useEffect(() => {
    if (!seedMsg) return;
    // New seed arrived — reset everything for a fresh conversation
    seedHandled.current = false;
    greetingHandled.current = false;
    setMessages([]);
    setShowHints(false);
  }, [seedMsg]);

  useEffect(() => {
    if (!seedMsg || seedHandled.current || !dataLoaded) return;
    seedHandled.current = true;
    const ch = params.channel || 'general';
    const ctx = CHANNELS[ch] ? ch : 'general';
    const userMsg: Msg = {
      id: Date.now().toString(), role: 'user', text: seedMsg,
      ts: new Date().toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages([userMsg]); setShowHints(false);
    greetingHandled.current = true;
    setTimeout(() => doSend(seedMsg, ctx, []), 100);
  }, [dataLoaded, seedMsg]);

  // ── Greeting — wait for live data first ──────────────────────────────────────
  useEffect(() => {
    if (greetingHandled.current || !dataLoaded) return;
    greetingHandled.current = true;
    const ch = params.channel || 'general';
    doGreeting(CHANNELS[ch] ? ch : 'general');
  }, [dataLoaded]);

  useFocusEffect(useCallback(() => { RNStatusBar.setBarStyle('dark-content', true); }, []));

  // ── autoMic ───────────────────────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) return;
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      recordingRef.current = recording; setIsRecording(true);
    } catch (e) { console.error('Record start:', e); }
  }, []);

  useFocusEffect(useCallback(() => {
    if (params.autoMic === 'true') startRecording();
  }, [params.autoMic]));

  // ── Scroll-down arrow ─────────────────────────────────────────────────────────
  function handleScroll(e: any) {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    const dist = contentSize.height - contentOffset.y - layoutMeasurement.height;
    const atBottom = dist < 80;
    isAtBottom.current = atBottom;
    if (!atBottom && !showScrollBtn) {
      setShowScrollBtn(true);
      Animated.timing(scrollBtnAnim, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    } else if (atBottom && showScrollBtn) {
      Animated.timing(scrollBtnAnim, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => setShowScrollBtn(false));
    }
  }

  // ── Sheet ─────────────────────────────────────────────────────────────────────
  function openSheet() {
    setShowAddSheet(true);
    Animated.spring(sheetAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }).start();
  }
  function closeSheet(cb?: () => void) {
    Animated.timing(sheetAnim, { toValue: 320, duration: 220, useNativeDriver: true }).start(() => { setShowAddSheet(false); cb?.(); });
  }
  async function openCamera() {
    closeSheet(async () => {
      await new Promise(r => setTimeout(r, 350));
      try {
        const { granted } = await ImagePicker.requestCameraPermissionsAsync();
        if (!granted) return;
        const result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.85 });
        if (!result.canceled && result.assets[0]) setPendingImage(result.assets[0].uri);
      } catch (e) { console.error('Camera:', e); }
    });
  }
  async function openPhotos() {
    closeSheet(async () => {
      await new Promise(r => setTimeout(r, 350));
      try {
        const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!granted) return;
        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.85 });
        if (!result.canceled && result.assets[0]) setPendingImage(result.assets[0].uri);
      } catch (e) { console.error('Photos:', e); }
    });
  }

  // ── System prompt — always includes live platform data ────────────────────────
  function buildSystemPrompt(persona: string, imageDescription?: string): string {
    const tc = getTimeContext();
    const parts = [persona];

    parts.push(
      `TIME & DATE: It is ${tc.timeStr} on ${tc.dateStr} (${tc.frame}). ` +
      `You always know the exact real date and time — never guess or call it a "typical" day. ` +
      (tc.isLate ? `It is late — acknowledge this naturally and warmly if relevant. Focus on tomorrow rather than today. ` : '') +
      `Match your tone and content to the actual time of day.`
    );

    parts.push(
      `FAMILY: Anna (logged in), Richard, Poppy (Yr6, girl, age 11), Gab (Yr4, boy, age 9), Duke (Yr1, boy, age 6). Family ID: ${FAMILY_ID}.`
    );

    parts.push(
      `CAPABILITIES — you CAN and SHOULD take direct action when asked:\n` +
      `• Add calendar events → Supabase 'events' table (title, start_time, end_time, all_day, description, family_id)\n` +
      `• Add shopping items → Supabase 'shopping_items' table (name, aisle, checked=false, family_id)\n` +
      `• Add to-dos → Supabase 'todos' table (title, due_date, priority, family_id)\n` +
      `When asked to add/book/create something: confirm the details, then tell the user it's been added. ` +
      `If you need one missing detail ask for just that. Never tell the user to add things themselves — you handle it.`
    );

    // Always inject live data — Zaeli always knows the real state of the family's platform
    const shopCount = shoppingItems.length;
    const shopNames = shoppingItems.slice(0, 30).map((i: any) => i.name).join(', ');
    const eventStr  = liveEvents.length > 0
      ? liveEvents.map((e: any) => `${e.title} (${e.date}${e.time ? ' at ' + e.time.slice(0,5) : ''})`).join(', ')
      : 'no upcoming events found';
    const todoStr   = liveTodos.length > 0
      ? liveTodos.map((t: any) => `${t.title}${t.priority === 'high' || t.priority === 'urgent' ? ' [URGENT]' : ''}`).join(', ')
      : 'no open to-dos found';

    parts.push(
      `LIVE PLATFORM DATA — always use this, never say you don't have access:\n` +
      `• Shopping list: ${shopCount} item${shopCount === 1 ? '' : 's'} to get${shopCount > 0 ? ` — ${shopNames}${shopCount > 30 ? ` + ${shopCount - 30} more` : ''}` : ' (list is clear)'}\n` +
      `• Upcoming calendar events: ${eventStr}\n` +
      `• Open to-dos: ${todoStr}`
    );

    if (imageDescription) {
      parts.push(`IMAGE CONTEXT: The user shared a photo. Description: ${imageDescription}`);
    }

    return parts.join('\n\n');
  }

  // ── Claude vision ─────────────────────────────────────────────────────────────
  async function describeImageWithClaude(imageUri: string): Promise<string> {
    try {
      const claudeKey = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? '';
      if (!claudeKey) return 'an image the user shared';
      const base64   = await FileSystem.readAsStringAsync(imageUri, { encoding: 'base64' as any });
      const ext      = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
      const mimeMap: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp' };
      const mimeType = mimeMap[ext] || 'image/jpeg';
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': claudeKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6', max_tokens: 400,
          messages: [{ role: 'user', content: [
            { type: 'image', source: { type: 'base64', media_type: mimeType, data: base64 } },
            { type: 'text', text: 'Describe this image concisely in 2-4 sentences. Focus on what is shown, any text visible, and what the person might want help with. Be factual and specific.' },
          ]}],
        }),
      });
      const json = await res.json();
      return json?.content?.[0]?.text || 'an image the user shared';
    } catch (e) { console.error('Claude vision failed:', e); return 'an image the user shared'; }
  }

  // ── Greeting ──────────────────────────────────────────────────────────────────
  async function doGreeting(ctx: string) {
    setLoading(true);
    const channel = CHANNELS[ctx] || CHANNELS.general;
    try {
      const text = await callOpenAI(buildSystemPrompt(channel.persona), [{ role: 'user', content: 'Say hello.' }], 140);
      appendMsg({ role: 'zaeli', text });
    } catch (e) {
      console.error('Greeting error:', e);
      appendMsg({ role: 'zaeli', text: `Hey ${MEMBER_NAME}! What can I help with?` });
    } finally { setLoading(false); }
  }

  // ── Calendar tool use — extract and save events from GPT response ───────────
  // Two-step approach:
  // 1. Ask GPT to extract event intent (title, date, whether to copy times from existing)
  // 2. If copying an existing event, look up the real start/end times from Supabase
  async function tryExtractAndSaveCalendarEvent(userText: string, gptReply: string, history: Msg[]): Promise<void> {
    const confirmKeywords = ['added', 'booked', 'scheduled', 'created', 'done', 'copied', 'set up', 'locked in'];
    const looksLikeConfirmation = confirmKeywords.some(k => gptReply.toLowerCase().includes(k));
    if (!looksLikeConfirmation) return;

    try {
      const now2 = new Date();
      const td   = toLocalDateStr(now2);

      const historyContext = history.slice(-10).map(m =>
        `${m.role === 'user' ? 'User' : 'Zaeli'}: ${m.text}`
      ).join('\n');

      // Step 1: Extract intent — what event, what date, what title, copy existing?
      const intentPrompt = `Extract the calendar event being added from this conversation.

CONVERSATION:
${historyContext}
User: "${userText}"
Zaeli: "${gptReply}"

Today is ${td}. "Tomorrow" = ${toLocalDateStr(addDays(now2, 1))}.

Return ONLY valid JSON:
{
  "title": "exact event title being added",
  "date": "YYYY-MM-DD",
  "source_event_title": "if copying from an existing event, the original event name — else null",
  "source_event_date": "if copying, the original event date YYYY-MM-DD — else null",
  "explicit_start_time": "HH:MM:SS if a specific NEW time was mentioned — else null",
  "explicit_end_time": "HH:MM:SS if a specific NEW end time was mentioned — else null",
  "confirmed": true or false
}

If no event was confirmed as added, set confirmed: false.`;

      const intentRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.EXPO_PUBLIC_OPENAI_API_KEY || ''}` },
        body: JSON.stringify({ model: 'gpt-5.4-mini', max_completion_tokens: 250,
          messages: [{ role: 'user', content: intentPrompt }] }),
      });
      const intentJson = await intentRes.json();
      const intentRaw  = intentJson?.choices?.[0]?.message?.content?.trim() || '';
      const intent     = JSON.parse(intentRaw.replace(/```json|```/g, '').trim());

      if (!intent.confirmed || !intent.title || !intent.date) return;

      let startTime: string | null = intent.explicit_start_time || null;
      let endTime:   string | null = intent.explicit_end_time   || null;

      // Step 2: If copying an existing event, fetch its real times from Supabase
      if (intent.source_event_title) {
        // Fetch all events in a wide window — match title in JS, not SQL
        const fromDate = toLocalDateStr(addDays(now2, -30));
        const toDate   = toLocalDateStr(addDays(now2, 30));
        const { data: sourceEvents } = await supabase
          .from('events')
          .select('title, date, start_time, end_time')
          .eq('family_id', FAMILY_ID)
          .gte('date', fromDate)
          .lte('date', toDate)
          .order('date', { ascending: false })
          .limit(50);

        if (sourceEvents && sourceEvents.length > 0) {
          const srcTitle = intent.source_event_title.toLowerCase().trim();

          // Score each event by how many words of the source title it contains
          const scored = sourceEvents.map(e => {
            const eTitle = e.title.toLowerCase();
            const srcWords = srcTitle.split(/\s+/).filter((w: string) => w.length > 2);
            const matchCount = srcWords.filter((w: string) => eTitle.includes(w)).length;
            return { ...e, score: matchCount };
          }).filter(e => e.score > 0)
            .sort((a, b) => b.score - a.score);

          const match = scored[0] || null;
          console.log('Calendar tool use: source title lookup —', srcTitle, '→', match?.title, match?.start_time);

          if (match?.start_time) {
            const timePart = match.start_time.includes('T')
              ? match.start_time.split('T')[1].substring(0, 8)
              : match.start_time.substring(0, 8);
            startTime = timePart;
            console.log('Calendar tool use: using time', timePart, 'from event', match.title, 'on', match.date);
          }
          if (match?.end_time && !endTime) {
            const timePart = match.end_time.includes('T')
              ? match.end_time.split('T')[1].substring(0, 8)
              : match.end_time.substring(0, 8);
            endTime = timePart;
          }
        }
      }

      // Build and insert the row
      const row: any = {
        family_id:   FAMILY_ID,
        title:       intent.title,
        date:        intent.date,
        timezone:    'Australia/Brisbane',
        repeat_rule: 'Never',
        alert_rule:  'None',
      };
      if (startTime) row.start_time = `${intent.date}T${startTime}`;
      if (endTime)   row.end_time   = `${intent.date}T${endTime}`;

      const { error } = await supabase.from('events').insert(row);
      if (error) console.log('Calendar tool use insert error:', error.message);
      else       console.log('Calendar tool use: saved —', intent.title, intent.date, startTime);

    } catch (e) {
      console.log('Calendar tool use error:', e);
    }
  }

  // ── Core send ─────────────────────────────────────────────────────────────────
  async function doSend(text: string, ctx: string, history: Msg[], imageUri?: string) {
    setLoading(true);
    const channel = CHANNELS[ctx] || CHANNELS.general;
    try {
      let imageDescription = '';
      if (imageUri) imageDescription = await describeImageWithClaude(imageUri);

      const historyMsgs = history.slice(-12).map(m => ({
        role: m.role === 'zaeli' ? 'assistant' as const : 'user' as const,
        content: m.text.startsWith('[Image:') ? '(shared a photo)' : m.text,
      }));

      let userContent = text;
      if (imageDescription && !text) userContent = `[The user shared a photo: ${imageDescription}]`;
      else if (imageDescription && text) userContent = `${text} [Photo attached: ${imageDescription}]`;

      const reply = await callOpenAI(
        buildSystemPrompt(channel.persona, imageDescription || undefined),
        [...historyMsgs, { role: 'user', content: userContent }],
        500,
      );
      appendMsg({ role: 'zaeli', text: reply });

      // Calendar tool use — if in Calendar channel, try to save any confirmed events
      if (ctx === 'Calendar') {
        tryExtractAndSaveCalendarEvent(text, reply, history);
      }
    } catch (e) {
      console.error('doSend error:', e);
      appendMsg({ role: 'zaeli', text: "Something went wrong — try that again?" });
    } finally { setLoading(false); }
  }

  // ── Send ──────────────────────────────────────────────────────────────────────
  async function send(overrideText?: string) {
    const text = (overrideText ?? input).trim();
    if (!text && !pendingImage) return;
    if (loading) return;
    const imageUri = pendingImage || undefined;
    const userMsg: Msg = {
      id: Date.now().toString(), role: 'user', text: text || '', imageUri,
      ts: new Date().toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' }),
    };
    const currentMessages = [...messages, userMsg];
    setMessages(currentMessages); setInput(''); setPendingImage(null); setShowHints(false);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    await doSend(text, activeCtx, currentMessages, imageUri);
  }

  function appendMsg(partial: Partial<Msg>) {
    const msg: Msg = {
      id: Date.now().toString() + Math.random(), role: partial.role || 'zaeli',
      text: partial.text || '', imageUri: partial.imageUri,
      ts: new Date().toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages(prev => {
      const next = [...prev, msg];
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
      return next;
    });
  }

  // ── Mic ───────────────────────────────────────────────────────────────────────
  async function stopRecordingAndTranscribe() {
    try {
      setIsRecording(false);
      if (!recordingRef.current) return;
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      if (!uri) return;
      const openAIKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY || '';
      if (!openAIKey) { setInput('(Add your OpenAI key to .env to use voice)'); return; }
      const formData = new FormData();
      formData.append('file', { uri, type: 'audio/m4a', name: 'audio.m4a' } as any);
      formData.append('model', 'whisper-1');
      const resp = await fetch(WHISPER_URL, { method: 'POST', headers: { Authorization: `Bearer ${openAIKey}` }, body: formData });
      const data = await resp.json();
      setInput(data?.text?.trim() || '');
    } catch (e) { console.error('stopRecording:', e); }
  }
  function handleMicPress() { if (isRecording) stopRecordingAndTranscribe(); else startRecording(); }

  function handleCopy(text: string) { Clipboard.setString(text); }
  async function handleForward(text: string) { try { await Share.share({ message: text }); } catch {} }
  function handleThumb(msgId: string, dir: 'up' | 'down') {
    setThumbs(prev => ({ ...prev, [msgId]: prev[msgId] === dir ? null : dir }));
  }

  // ── Render messages ───────────────────────────────────────────────────────────
  function renderMessages() {
    return messages.map((msg, i) => {
      if (msg.role === 'user') {
        return (
          <View key={msg.id} style={s.userMsgWrap}>
            {msg.imageUri && <Image source={{ uri: msg.imageUri }} style={s.msgImage} resizeMode="cover" />}
            {!!msg.text && <View style={s.userBubble}><Text style={s.userMsgText}>{msg.text}</Text></View>}
            <View style={s.userIconRow}>
              <Text style={s.msgTime}>{msg.ts}</Text>
              <TouchableOpacity style={s.iconBtn} onPress={() => handleCopy(msg.text)} activeOpacity={0.6}><IcoCopy /></TouchableOpacity>
              <TouchableOpacity style={s.iconBtn} onPress={() => handleForward(msg.text)} activeOpacity={0.6}><IcoForward /></TouchableOpacity>
            </View>
          </View>
        );
      }
      const thumbState = thumbs[msg.id] || null;
      return (
        <View key={msg.id} style={[s.zaeliMsgWrap, i > 0 && s.zaeliMsgWrapGap]}>
          {msg.imageUri && <Image source={{ uri: msg.imageUri }} style={s.msgImageFull} resizeMode="cover" />}
          <Text style={s.zaeliMsgText}>{msg.text}</Text>
          <View style={s.zaeliIconRow}>
            <Text style={[s.msgTime, { marginRight: 6 }]}>{msg.ts}</Text>
            <TouchableOpacity style={s.iconBtn} activeOpacity={0.6}><IcoPlay /></TouchableOpacity>
            <TouchableOpacity style={s.iconBtn} onPress={() => handleCopy(msg.text)} activeOpacity={0.6}><IcoCopy /></TouchableOpacity>
            <TouchableOpacity style={s.iconBtn} onPress={() => handleForward(msg.text)} activeOpacity={0.6}><IcoForward /></TouchableOpacity>
            <TouchableOpacity style={s.iconBtn} onPress={() => handleThumb(msg.id, 'up')} activeOpacity={0.6}>
              <IcoThumbUp color={thumbState === 'up' ? TEAL : INK3} />
            </TouchableOpacity>
            <TouchableOpacity style={s.iconBtn} onPress={() => handleThumb(msg.id, 'down')} activeOpacity={0.6}>
              <IcoThumbDown color={thumbState === 'down' ? CORAL : INK3} />
            </TouchableOpacity>
          </View>
        </View>
      );
    });
  }

  const channel = CHANNELS[activeCtx] || CHANNELS.general;

  return (
    <View style={s.root}>
      <RNStatusBar barStyle="dark-content" animated />
      <NavMenu visible={menuOpen} onClose={() => setMenuOpen(false)} />

      {/* HEADER */}
      <SafeAreaView style={s.header} edges={['top']}>
        <View style={s.hdrInner}>
          <TouchableOpacity style={s.hdrBack} onPress={() => router.push(returnTo as any)} activeOpacity={0.7}>
            <IcoBack />
          </TouchableOpacity>
          <TouchableOpacity style={s.logoWrap} onPress={() => router.replace('/(tabs)/')} activeOpacity={0.8}>
            <View style={s.logoStarBox}><Text style={s.logoStarTxt}>✦</Text></View>
            <Text style={s.logoWord}>
              {'z'}<Text style={{ color: '#FFE500' }}>{'a'}</Text>{'el'}<Text style={{ color: '#FFE500' }}>{'i'}</Text>
            </Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          <View style={s.onlinePill}>
            <View style={s.onlineDot} />
            <Text style={s.onlineLabel}>Online</Text>
          </View>
          <View style={{ width: 16 }} />
          <HamburgerButton onPress={() => setMenuOpen(true)} tint={INK} />
        </View>
      </SafeAreaView>

      {/* KAV wraps scroll + input */}
      <KeyboardAvoidingView
        style={s.kavWrap}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <View style={s.scrollWrap}>
          <ScrollView
            ref={scrollRef}
            style={s.scroll}
            contentContainerStyle={s.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardDismissMode="interactive"
            onScroll={handleScroll}
            scrollEventThrottle={16}
            onContentSizeChange={() => {
              if (isAtBottom.current) scrollRef.current?.scrollToEnd({ animated: false });
            }}
          >
            <View style={s.dateRow}>
              <View style={s.dateLine} />
              <Text style={s.dateLabel}>
                {new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'short' }).toUpperCase()}
              </Text>
              <View style={s.dateLine} />
            </View>

            {renderMessages()}
            {loading && <View style={s.zaeliMsgWrap}><TypingDots /></View>}

            {showHints && !loading && messages.length <= 1 && (
              <View style={s.hintsWrap}>
                {channel.seeds.map(seed => (
                  <TouchableOpacity key={seed} style={s.hintChip} onPress={() => send(seed)} activeOpacity={0.75}>
                    <Text style={s.hintTxt}>{seed}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <View style={{ height: 20 }} />
          </ScrollView>

          {/* Scroll-down arrow */}
          {showScrollBtn && (
            <Animated.View style={[s.scrollDownBtn, { opacity: scrollBtnAnim }]} pointerEvents="box-none">
              <TouchableOpacity
                style={s.scrollDownInner}
                onPress={() => scrollRef.current?.scrollToEnd({ animated: true })}
                activeOpacity={0.8}
              >
                <IcoArrowDown />
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* Floating input bar */}
          <View style={s.inputArea}>
            {pendingImage && (
              <View style={s.imagePreviewWrap}>
                <Image source={{ uri: pendingImage }} style={s.imagePreview} resizeMode="cover" />
                <TouchableOpacity style={s.imagePreviewRemove} onPress={() => setPendingImage(null)} activeOpacity={0.8}>
                  <IcoX />
                </TouchableOpacity>
              </View>
            )}
            <View style={s.barPill}>
              <TouchableOpacity style={s.barBtn} onPress={openSheet} activeOpacity={0.75}><IcoPlus /></TouchableOpacity>
              <View style={s.barSep} />
              <TextInput
                ref={inputRef}
                style={s.barInput}
                value={input}
                onChangeText={setInput}
                placeholder="Chat with Zaeli…"
                placeholderTextColor={INK3}
                multiline
                returnKeyType="default"
                onFocus={() => {
                  setShowHints(false);
                  setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 350);
                }}
              />
              {isRecording ? (
                <TouchableOpacity style={s.barWaveBtn} onPress={handleMicPress} activeOpacity={0.85}><WaveformBars /></TouchableOpacity>
              ) : (
                <TouchableOpacity style={s.barBtn} onPress={handleMicPress} activeOpacity={0.75}><IcoMic color={INK3} /></TouchableOpacity>
              )}
              <TouchableOpacity
                style={[s.barSend, ((!input.trim() && !pendingImage) || loading) && { opacity: 0.4 }]}
                onPress={() => send()}
                disabled={(!input.trim() && !pendingImage) || loading}
                activeOpacity={0.85}
              >
                <IcoSend />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* ADD TO CHAT SHEET */}
      <Modal visible={showAddSheet} transparent animationType="none" onRequestClose={() => closeSheet()}>
        <Pressable style={s.sheetOverlay} onPress={() => closeSheet()}>
          <Animated.View style={[s.sheet, { transform: [{ translateY: sheetAnim }] }]}>
            <Pressable onPress={() => {}}>
              <View style={s.sheetHandle} />
              <View style={s.sheetHeader}>
                <TouchableOpacity style={s.sheetCloseBtn} onPress={() => closeSheet()} activeOpacity={0.7}><IcoClose /></TouchableOpacity>
                <Text style={s.sheetTitle}>Add to Chat</Text>
                <View style={{ width: 44 }} />
              </View>
              <View style={s.sheetTiles}>
                <TouchableOpacity style={s.sheetTile} onPress={openCamera} activeOpacity={0.75}>
                  <IcoCamera /><Text style={s.sheetTileLabel}>Camera</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.sheetTile} onPress={openPhotos} activeOpacity={0.75}>
                  <IcoPhotos /><Text style={s.sheetTileLabel}>Photos</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.sheetTile} onPress={() => closeSheet()} activeOpacity={0.75}>
                  <IcoFiles /><Text style={s.sheetTileLabel}>Files</Text>
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

// ── Styles ─────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },

  header: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: BORDER },
  hdrInner: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 10 },
  hdrBack: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  logoWrap: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoStarBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: BLUE, alignItems: 'center', justifyContent: 'center' },
  logoStarTxt: { fontSize: 21, color: '#fff' },
  logoWord: { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 28, color: INK, letterSpacing: -0.5 },
  onlinePill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: 'rgba(0,180,80,0.10)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(0,180,80,0.25)' },
  onlineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#00B450' },
  onlineLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 12, color: '#00B450' },

  kavWrap: { flex: 1 },
  scrollWrap: { flex: 1, position: 'relative' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 110 },

  scrollDownBtn: { position: 'absolute', bottom: 108, left: 0, right: 0, alignItems: 'center', zIndex: 50 },
  scrollDownInner: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(10,10,10,0.45)', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },

  dateRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 10 },
  dateLine: { flex: 1, height: 1, backgroundColor: BORDER },
  dateLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 10, color: INK3, letterSpacing: 1 },

  dotsRow: { flexDirection: 'row', gap: 5, alignItems: 'center', paddingVertical: 4 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: CORAL },

  zaeliMsgWrap: { marginBottom: 4 },
  zaeliMsgWrapGap: { marginTop: 16 },
  zaeliMsgText: { fontFamily: 'Poppins_400Regular', fontSize: 15, color: INK, lineHeight: 22 },

  userMsgWrap: { alignItems: 'flex-end', marginBottom: 4, marginTop: 16 },
  userBubble: { backgroundColor: BLUE, borderRadius: 18, borderBottomRightRadius: 4, paddingHorizontal: 14, paddingVertical: 10, maxWidth: '82%' },
  userMsgText: { fontFamily: 'Poppins_400Regular', fontSize: 15, color: '#fff', lineHeight: 22 },

  msgTime: { fontFamily: 'Poppins_400Regular', fontSize: 11, color: INK3 },
  msgImage: { width: '100%', height: 180, borderRadius: 12, marginBottom: 6 },
  msgImageFull: { width: '100%', height: 200, borderRadius: 12, marginBottom: 8 },

  zaeliIconRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 2 },
  userIconRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 2, justifyContent: 'flex-end' },
  iconBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', borderRadius: 6 },

  hintsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  hintChip: { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#F5F3EF', borderRadius: 20, borderWidth: 1, borderColor: BORDER },
  hintTxt: { fontFamily: 'Poppins_500Medium', fontSize: 13, color: INK2 },

  inputArea: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 16, paddingBottom: Platform.OS === 'ios' ? 32 : 20, paddingTop: 12, backgroundColor: 'transparent' },
  imagePreviewWrap: { marginBottom: 8, alignSelf: 'flex-start', position: 'relative' },
  imagePreview: { width: 80, height: 80, borderRadius: 10 },
  imagePreviewRemove: { position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: 11, backgroundColor: INK, alignItems: 'center', justifyContent: 'center' },
  barPill: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderRadius: 32, paddingVertical: 16, paddingHorizontal: 18, borderWidth: 1, borderColor: BORDER, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 18, shadowOffset: { width: 0, height: -2 }, elevation: 6 },
  barBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  barSep: { width: 1, height: 20, backgroundColor: 'rgba(10,10,10,0.1)' },
  barInput: { flex: 1, fontFamily: 'Poppins_400Regular', fontSize: 16, color: INK, maxHeight: 100, paddingVertical: 0 },
  barWaveBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: INK, alignItems: 'center', justifyContent: 'center' },
  waveRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  waveBar: { width: 3.5, height: 18, borderRadius: 2, backgroundColor: '#fff' },
  barSend: { width: 34, height: 34, borderRadius: 17, backgroundColor: CORAL, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },

  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.38)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: BG, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 20, shadowColor: '#000', shadowOpacity: 0.22, shadowRadius: 22, shadowOffset: { width: 0, height: -4 } },
  sheetHandle: { width: 38, height: 4, borderRadius: 2, backgroundColor: 'rgba(10,10,10,0.14)', alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 18 },
  sheetCloseBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(10,10,10,0.07)', alignItems: 'center', justifyContent: 'center' },
  sheetTitle: { fontFamily: 'Poppins_700Bold', fontSize: 17, color: INK },
  sheetTiles: { flexDirection: 'row', gap: 12, marginBottom: 10 },
  sheetTile: { flex: 1, backgroundColor: 'rgba(10,10,10,0.05)', borderRadius: 20, paddingVertical: 32, alignItems: 'center', justifyContent: 'center', gap: 14 },
  sheetTileLabel: { fontFamily: 'Poppins_500Medium', fontSize: 15, color: INK },
});
