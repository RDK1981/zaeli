import { DMSerifDisplay_400Regular } from '@expo-google-fonts/dm-serif-display';
import {
  Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold,
  Poppins_700Bold, Poppins_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/poppins';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  Image,
  KeyboardAvoidingView,
  Modal, Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Line, Path, Polyline, Rect } from 'react-native-svg';
import { Audio } from 'expo-av';
import { callClaude } from '../../lib/api-logger';
import { getZaeliProvider } from '../../lib/zaeli-provider';
import { supabase } from '../../lib/supabase';
import { HamburgerButton, NavMenu } from '../components/NavMenu';
import { useChatPersistence, type PersistedMsg } from '../../lib/use-chat-persistence';

// ── Constants ──────────────────────────────────────────────────────────────────
const DUMMY_FAMILY_ID = '00000000-0000-0000-0000-000000000001';
const OPENAI_API_KEY  = process.env.EXPO_PUBLIC_OPENAI_API_KEY || '';

// ── Brief cache ────────────────────────────────────────────────────────────────
let mealBriefCache = '';
let mealBriefTime: number | null = null;

async function callBrief({ feature, system, userContent, maxTokens = 200 }: {
  feature: string; system: string; userContent: string; maxTokens?: number;
}): Promise<string> {
  if (getZaeliProvider() === 'openai') {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: 'gpt-5.4-mini', max_completion_tokens: maxTokens,
        messages: [{ role: 'system', content: system }, { role: 'user', content: userContent }],
      }),
    });
    const d = await res.json();
    try {
      const u = d.usage || {};
      const costUsd = ((u.prompt_tokens || 0) / 1_000_000) * 0.75 + ((u.completion_tokens || 0) / 1_000_000) * 4.50;
      supabase.from('api_logs').insert({
        family_id: DUMMY_FAMILY_ID, feature, model: 'gpt-5.4-mini',
        input_tokens: u.prompt_tokens || 0, output_tokens: u.completion_tokens || 0, cost_usd: costUsd,
      });
    } catch {}
    return d.choices?.[0]?.message?.content || '';
  } else {
    const d = await callClaude({
      feature, familyId: DUMMY_FAMILY_ID,
      body: { model: 'claude-haiku-4-5-20251001', max_tokens: maxTokens, system, messages: [{ role: 'user', content: userContent }] },
    });
    return d.content?.[0]?.text || '';
  }
}

// ── Colours — Meals channel palette (LOCKED) ───────────────────────────────────
const C = {
  bg: '#FAF8F5', card: '#FFFFFF', border: 'rgba(0,0,0,0.09)',
  ink: '#0A0A0A', ink2: 'rgba(0,0,0,0.50)', ink3: 'rgba(0,0,0,0.28)',
  dark: '#0A0A0A',
  // Meals channel colours (LOCKED)
  bannerBg: '#FAC8A8',         // terracotta banner
  ai:  '#A8E8CC',              // fresh green — AI / Zaeli accent
  aiL: 'rgba(168,232,204,0.18)',
  aiB: 'rgba(168,232,204,0.35)',
  accent: '#C84010',           // deep terracotta — buttons, labels
  accentL: 'rgba(200,64,16,0.09)',
  accentB: 'rgba(200,64,16,0.28)',
  // Badge colours
  mint:   '#A8E8CC', mintL: 'rgba(168,232,204,0.40)', mintD: '#1A7A45',
  sky:    '#A8D8F0', skyL:  'rgba(168,216,240,0.40)', skyD:  '#0060A0',
  lav:    '#D8CCFF', lavL:  'rgba(216,204,255,0.45)', lavD:  '#5020C0',
  gold:   '#F0DC80', goldL: 'rgba(240,220,128,0.45)', goldD: '#806000',
  // Heart / favourite
  heart: '#FF7B6B',
  // Keep legacy aliases used by modals
  orange: '#C84010', orangeL: 'rgba(200,64,16,0.09)', orangeB: 'rgba(200,64,16,0.28)',
  blue: '#A8E8CC', blueL: 'rgba(168,232,204,0.18)', blueB: 'rgba(168,232,204,0.35)',
  green: '#00C97A', greenL: 'rgba(0,201,122,0.10)', greenB: 'rgba(0,201,122,0.28)',
  red: '#FF3B3B', redL: 'rgba(255,59,59,0.08)',
  purple: '#5020C0', purpleL: 'rgba(80,32,192,0.10)',
  mag: '#E0007C',
  yellow: '#F0DC80', gold2: '#806000',
  kit: '#007a55', kitL: 'rgba(0,150,100,0.07)',
};

const FAMILY = [
  { id: '1', name: 'Anna',    initial: 'A', color: '#FF7B6B' },
  { id: '2', name: 'Rich',    initial: 'R', color: '#4D8BFF' },
  { id: '3', name: 'Poppy',   initial: 'P', color: '#A855F7' },
  { id: '4', name: 'Gab',     initial: 'G', color: '#22C55E' },
  { id: '5', name: 'Duke',    initial: 'D', color: '#F59E0B' },
];
const KIDS = FAMILY.filter(m => ['3', '4', '5'].includes(m.id));

// ── Types ──────────────────────────────────────────────────────────────────────
type TabType = 'dinners' | 'recipes' | 'favourites';
type ChatMsg = PersistedMsg;
type MealSource = 'library' | 'favourites' | 'zaeli' | 'manual' | 'kit' | 'takeaway';
type MealPlan = {
  id: string; day_key: string; meal_name: string; meal_type: string;
  source: MealSource; image_url?: string; prep_mins?: number;
  cook_ids?: string[]; ingredients?: Ingredient[]; notes?: string; family_id: string;
};
type Ingredient = { name: string; emoji: string; qty: string; in_pantry: boolean };
type SavedRecipe = {
  id: string; name: string; source_type: 'photo' | 'url' | 'manual' | 'spoonacular';
  image_url?: string; prep_mins?: number; tags?: string[]; notes?: string; family_id: string;
};
type SavedMenu = {
  id: string; venue_name: string; venue_type?: string;
  notes?: string; image_url?: string; family_id: string; created_at?: string;
  items?: { name: string; description: string; price: string; dietary: string[] }[];
};
type SpoonRecipe = {
  id: number; title: string; image: string; readyInMinutes: number;
  servings: number; glutenFree: boolean; dairyFree: boolean; lowFodmap: boolean;
};

// ── Helpers ────────────────────────────────────────────────────────────────────
function pad(n: number) { return n < 10 ? '0' + n : '' + n; }
function dayKey(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function fmtDay(d: Date) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
}
function fmtDayShort(d: Date) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[d.getDay()];
}
function fmtTonightDate(d: Date) {
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
}
function isToday(d: Date) { return dayKey(d) === dayKey(new Date()); }
function isTomorrow(d: Date) { return dayKey(d) === dayKey(addDays(new Date(), 1)); }
function dayLabel(d: Date) {
  if (isToday(d)) return 'TONIGHT';
  if (isTomorrow(d)) return 'TOMORROW';
  return fmtDay(d).toUpperCase().split(' ')[0];
}
function get7Days(): Date[] { return Array.from({ length: 7 }, (_, i) => addDays(new Date(), i)); }
function getTimeStr() {
  const n = new Date();
  return `${(n.getHours() % 12) || 12}:${String(n.getMinutes()).padStart(2, '0')} ${n.getHours() < 12 ? 'am' : 'pm'}`;
}
function nowTs() {
  const d = new Date();
  return `${d.getHours() % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')} ${d.getHours() < 12 ? 'am' : 'pm'}`;
}

function getMealEmoji(name: string): string {
  const n = name.toLowerCase();
  if (/pasta|spag|carb|lasag|penne|fettucc|rigatoni|gnocchi/.test(n)) return '🍝';
  if (/pizza/.test(n)) return '🍕';
  if (/taco|burrito|nacho|mexican|fajita/.test(n)) return '🌮';
  if (/curry|butter chicken|tikka|masala|korma|dahl|lentil/.test(n)) return '🍛';
  if (/salad|slaw|bowl/.test(n)) return '🥗';
  if (/salmon|fish|prawn|shrimp|seafood|tuna|cod/.test(n)) return '🐟';
  if (/soup|broth|stew|casserole|chowder/.test(n)) return '🍲';
  if (/stir.fry|fried rice|noodle|pad thai|ramen|laksa/.test(n)) return '🍜';
  if (/burger|patty|mince/.test(n)) return '🍔';
  if (/sausage|snag|frank|hot dog/.test(n)) return '🌭';
  if (/chicken|schnitzel|wing|drumstick|kyiv/.test(n)) return '🍗';
  if (/steak|beef|lamb|roast|brisket/.test(n)) return '🥩';
  if (/egg|omelette|frittata|quiche/.test(n)) return '🥚';
  if (/veg|veggie|tofu|tempeh|plant/.test(n)) return '🥦';
  if (/sandwich|wrap|sub|roll|toast/.test(n)) return '🥪';
  if (/dessert|cake|cookie|brownie|pudding|tart|ice cream/.test(n)) return '🍰';
  if (/breakfast|pancake|waffle|muesli|porridge/.test(n)) return '🥞';
  if (/takeaway|delivery/.test(n)) return '🍕';
  const emojis = ['🍽', '🍴', '🥘', '🫕', '🥣', '🧆', '🫔'];
  return emojis[name.length % emojis.length];
}

function getMediaType(base64: string): 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' {
  if (base64.startsWith('/9j/')) return 'image/jpeg';
  if (base64.startsWith('iVBORw0K')) return 'image/png';
  if (base64.startsWith('R0lGOD')) return 'image/gif';
  if (base64.startsWith('UklGR')) return 'image/webp';
  return 'image/jpeg';
}

// ── Dummy data ─────────────────────────────────────────────────────────────────
const DUMMY_RECIPES: SpoonRecipe[] = [
  { id: 654959, title: 'Pasta Carbonara',    image: 'https://spoonacular.com/recipeImages/654959-312x231.jpg', readyInMinutes: 20, servings: 4, glutenFree: false, dairyFree: false, lowFodmap: false },
  { id: 715538, title: 'Honey Soy Chicken',  image: 'https://spoonacular.com/recipeImages/715538-312x231.jpg', readyInMinutes: 25, servings: 4, glutenFree: true,  dairyFree: true,  lowFodmap: false },
  { id: 644387, title: 'Minestrone Soup',    image: 'https://spoonacular.com/recipeImages/644387-312x231.jpg', readyInMinutes: 35, servings: 6, glutenFree: false, dairyFree: true,  lowFodmap: false },
  { id: 716406, title: 'Lemon Baked Salmon', image: 'https://spoonacular.com/recipeImages/716406-312x231.jpg', readyInMinutes: 25, servings: 4, glutenFree: true,  dairyFree: true,  lowFodmap: true  },
  { id: 665613, title: 'Chicken Stir-Fry',   image: 'https://spoonacular.com/recipeImages/665613-312x231.jpg', readyInMinutes: 20, servings: 4, glutenFree: true,  dairyFree: true,  lowFodmap: false },
  { id: 632660, title: 'Beef Tacos',          image: 'https://spoonacular.com/recipeImages/632660-312x231.jpg', readyInMinutes: 20, servings: 4, glutenFree: false, dairyFree: true,  lowFodmap: false },
  { id: 715769, title: 'Greek Salad Bowl',   image: 'https://spoonacular.com/recipeImages/715769-312x231.jpg', readyInMinutes: 10, servings: 2, glutenFree: true,  dairyFree: false, lowFodmap: false },
  { id: 664147, title: 'Butter Chicken',     image: 'https://spoonacular.com/recipeImages/664147-312x231.jpg', readyInMinutes: 40, servings: 4, glutenFree: true,  dairyFree: false, lowFodmap: false },
];
const DUMMY_FAVS: SavedRecipe[] = [
  { id: 'f1', name: 'Honey Soy Chicken',     source_type: 'spoonacular', image_url: 'https://spoonacular.com/recipeImages/715538-312x231.jpg', prep_mins: 25, tags: ['Kids love', 'Quick'],   family_id: DUMMY_FAMILY_ID },
  { id: 'f2', name: 'Pasta Bake',            source_type: 'spoonacular', image_url: 'https://spoonacular.com/recipeImages/654959-312x231.jpg', prep_mins: 30, tags: ['Family', 'Kids love'], family_id: DUMMY_FAMILY_ID },
  { id: 'f3', name: "Mum's Slow Cooker Stew",source_type: 'photo',       tags: ['Comfort', 'Slow cook'],    family_id: DUMMY_FAMILY_ID },
  { id: 'f4', name: "Dr Joanna's Gut Soup",  source_type: 'url',         tags: ['Gut health', 'Low FODMAP'], family_id: DUMMY_FAMILY_ID },
];

// ── Icons ──────────────────────────────────────────────────────────────────────
function IcoSend() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24">
      <Line x1="12" y1="19" x2="12" y2="5" stroke="#fff" strokeWidth={2.5} strokeLinecap="round" />
      <Polyline points="5 12 12 5 19 12" stroke="#fff" strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
function IcoMic({ color = '#F5C8C8', size = 26 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x="9" y="2" width="6" height="11" rx="3" stroke={color} strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M5 10a7 7 0 0014 0" stroke={color} strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Line x1="12" y1="19" x2="12" y2="23" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Line x1="8" y1="23" x2="16" y2="23" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}
function IcoArrowUp() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Line x1="12" y1="19" x2="12" y2="5" stroke="#fff" strokeWidth={2.5} strokeLinecap="round" />
      <Polyline points="5 12 12 5 19 12" stroke="#fff" strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
function IcoArrowDown() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Line x1="12" y1="5" x2="12" y2="19" stroke="#fff" strokeWidth={2.5} strokeLinecap="round" />
      <Polyline points="19 12 12 19 5 12" stroke="#fff" strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
function IcoSearch({ color = C.ink3 }: { color?: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      <Circle cx="11" cy="11" r="8" stroke={color} strokeWidth={2} fill="none" />
      <Line x1="21" y1="21" x2="16.65" y2="16.65" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}
function IcoPlus({ color = C.ink3 }: { color?: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Line x1="12" y1="5" x2="12" y2="19" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
      <Line x1="5" y1="12" x2="19" y2="12" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
    </Svg>
  );
}
const INK3 = 'rgba(0,0,0,0.28)';
function IcoCopy() {
  return <Svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={INK3} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><Rect x="9" y="9" width="13" height="13" rx="2" /><Path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></Svg>;
}
function IcoForward() {
  return <Svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={INK3} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><Line x1="22" y1="2" x2="11" y2="13" /><Path d="M22 2L15 22l-4-9-9-4 20-7z" /></Svg>;
}
function IcoThumbUp({ active }: { active: boolean }) {
  const col = active ? C.accent : INK3;
  return <Svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><Path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z" /><Path d="M7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" /></Svg>;
}
function IcoThumbDown({ active }: { active: boolean }) {
  const col = active ? C.ink2 : INK3;
  return <Svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><Path d="M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3H10z" /><Path d="M17 2h2.67A2.31 2.31 0 0122 4v7a2.31 2.31 0 01-2.33 2H17" /></Svg>;
}

// ── Typing dots ────────────────────────────────────────────────────────────────
function TypingDots() {
  const anims = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];
  useEffect(() => {
    const makeSeq = (a: Animated.Value, delay: number) =>
      Animated.loop(Animated.sequence([
        Animated.delay(delay),
        Animated.timing(a, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(a, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.delay(600),
      ]));
    const anim = Animated.parallel(anims.map((a, i) => makeSeq(a, i * 160)));
    anim.start();
    return () => anim.stop();
  }, []);
  return (
    <View style={{ flexDirection: 'row', gap: 6, paddingVertical: 8 }}>
      {anims.map((a, i) => (
        <Animated.View key={i} style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: C.ai, opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }] }} />
      ))}
    </View>
  );
}

// ── Waveform bars (mic active in chat bar) ─────────────────────────────────────
function WaveformBars() {
  const anims = useRef(Array.from({ length: 4 }, () => new Animated.Value(0.4))).current;
  useEffect(() => {
    const loops = anims.map((anim, i) => {
      const spd = 260 + i * 80;
      return Animated.loop(Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: spd, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.2, duration: spd + 60, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]));
    });
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, []);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
      {anims.map((anim, i) => (
        <Animated.View key={i} style={{ width: 3.5, height: 18, borderRadius: 2, backgroundColor: '#fff', transform: [{ scaleY: anim }] }} />
      ))}
    </View>
  );
}

// ── MicWaveform (large overlay) ────────────────────────────────────────────────
function MicWaveform() {
  const anims = useRef(Array.from({ length: 13 }, (_, i) => new Animated.Value(0.15 + (i % 3) * 0.1))).current;
  useEffect(() => {
    const loops = anims.map((anim, i) => {
      const min = 0.1 + (i % 4) * 0.05, max = 0.6 + (i % 5) * 0.08, spd = 280 + (i % 6) * 60;
      return Animated.loop(Animated.sequence([
        Animated.delay(i * 55),
        Animated.timing(anim, { toValue: max, duration: spd, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(anim, { toValue: min, duration: spd + 40, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]));
    });
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, []);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, height: 52 }}>
      {anims.map((anim, i) => (
        <Animated.View key={i} style={{ width: 4, borderRadius: 3, backgroundColor: C.ai, transform: [{ scaleY: anim }], height: 52 }} />
      ))}
    </View>
  );
}

// ── Cook Avatars ───────────────────────────────────────────────────────────────
function CookAvatars({ cookIds, size = 20 }: { cookIds: string[]; size?: number }) {
  if (!cookIds?.length) return null;
  return (
    <View style={{ flexDirection: 'row', gap: 3 }}>
      {FAMILY.filter(m => cookIds.includes(m.id)).map(c => (
        <View key={c.id} style={{ width: size, height: size, borderRadius: size / 4, backgroundColor: c.color, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#fff', fontSize: size * 0.45, fontFamily: 'Poppins_700Bold' }}>{c.initial}</Text>
        </View>
      ))}
    </View>
  );
}

// ── CookAvatarsGrid — 2×2 stacking grid for week rows ───────────────────────────
function CookAvatarsGrid({ cookIds, size = 28 }: { cookIds: string[]; size?: number }) {
  if (!cookIds?.length) return null;
  const members = FAMILY.filter(m => cookIds.includes(m.id));
  if (members.length <= 2) {
    // Single column, stacked
    return (
      <View style={{ gap: 3 }}>
        {members.map(c => (
          <View key={c.id} style={{ width: size, height: size, borderRadius: size / 4, backgroundColor: c.color, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#fff', fontSize: size * 0.42, fontFamily: 'Poppins_700Bold' }}>{c.initial}</Text>
          </View>
        ))}
      </View>
    );
  }
  // 2×2 grid for 3-4 cooks
  const rows = [members.slice(0, 2), members.slice(2, 4)];
  return (
    <View style={{ gap: 3 }}>
      {rows.map((row, ri) => (
        <View key={ri} style={{ flexDirection: 'row', gap: 3 }}>
          {row.map(c => (
            <View key={c.id} style={{ width: size, height: size, borderRadius: size / 4, backgroundColor: c.color, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#fff', fontSize: size * 0.42, fontFamily: 'Poppins_700Bold' }}>{c.initial}</Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

// ── Heart badge component ──────────────────────────────────────────────────────
function HeartBadge({ size = 22, borderColor = C.bg }: { size?: number; borderColor?: string }) {
  return (
    <Text style={{
      position: 'absolute', bottom: -6, right: -6,
      fontSize: size,
      lineHeight: size + 4,
    }}>🩷</Text>
  );
}

// ── AssignCookModal ────────────────────────────────────────────────────────────
function AssignCookModal({ visible, dayLbl, mealName, onClose, onSave }: {
  visible: boolean; dayLbl: string; mealName: string;
  onClose: () => void;
  onSave: (cookIds: string[], jobKidIds: string[], pts: Record<string, number>) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [jobKids, setJobKids]   = useState<string[]>([]);
  const [points, setPoints]     = useState<Record<string, number>>({});
  const [custom, setCustom]     = useState<Record<string, string>>({});
  const toggle = (id: string) => setSelected(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  const toggleJob = (id: string) => setJobKids(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  const sugPts = (kidId: string) => FAMILY.find(m => m.id === kidId)?.id === '5' ? 15 : FAMILY.find(m => m.id === kidId)?.id === '4' ? 25 : 35;
  const handleSave = () => {
    const finalPts: Record<string, number> = {};
    for (const kid of jobKids) {
      const c = custom[kid];
      finalPts[kid] = (c && parseInt(c) > 0) ? parseInt(c) : (points[kid] || sugPts(kid));
    }
    onSave(selected, jobKids, finalPts);
    onClose();
  };
  const selKids = KIDS.filter(k => selected.includes(k.id));
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top']}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={s.modalHdr}>
            <TouchableOpacity onPress={onClose}><Text style={s.modalCancel}>Cancel</Text></TouchableOpacity>
            <Text style={s.modalTitle}>{"Who's cooking?"}</Text>
            <TouchableOpacity onPress={handleSave}><Text style={s.modalSave}>Done</Text></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }} keyboardShouldPersistTaps="handled">
            <Text style={s.modalSub}>{dayLbl}{mealName ? ` · ${mealName}` : ''}</Text>
            <Text style={s.fieldLbl}>SELECT FAMILY MEMBERS</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {FAMILY.map(m => {
                const on = selected.includes(m.id);
                return (
                  <TouchableOpacity key={m.id} style={[s.memberTile, on && { borderColor: C.accent, backgroundColor: C.accentL }]}
                    onPress={() => toggle(m.id)} activeOpacity={0.8}>
                    <View style={[s.memberAv, { backgroundColor: m.color }]}>
                      <Text style={{ color: '#fff', fontSize: 16, fontFamily: 'Poppins_700Bold' }}>{m.initial}</Text>
                    </View>
                    <Text style={[s.memberName, on && { color: C.ink, fontFamily: 'Poppins_700Bold' }]}>{m.name}</Text>
                    {on && <Text style={{ fontSize: 14, color: C.accent }}>✓</Text>}
                  </TouchableOpacity>
                );
              })}
            </View>
            {selKids.map(kid => (
              <View key={kid.id} style={s.jobPrompt}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <View style={{ width: 26, height: 26, borderRadius: 8, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: '#fff', fontSize: 11 }}>✦</Text>
                  </View>
                  <Text style={s.jpTitle}>{`Add a cooking job for ${kid.name}?`}</Text>
                </View>
                <Text style={s.jpBody}>Add <Text style={{ fontFamily: 'Poppins_700Bold' }}>{`"Help cook dinner — ${dayLbl}"`}</Text> to {kid.name}{"'s"} jobs list so they can tick it off and earn points.</Text>
                <TouchableOpacity style={[s.jpBtn, jobKids.includes(kid.id) && { backgroundColor: C.lavD, borderColor: C.lavD }]}
                  onPress={() => toggleJob(kid.id)} activeOpacity={0.8}>
                  <Text style={[s.jpBtnTxt, jobKids.includes(kid.id) && { color: '#fff' }]}>
                    {jobKids.includes(kid.id) ? '✓ Job added' : '+ Add job for ' + kid.name}
                  </Text>
                </TouchableOpacity>
                {jobKids.includes(kid.id) && (
                  <View style={{ marginTop: 12 }}>
                    <Text style={[s.fieldLbl, { marginBottom: 8 }]}>{`POINTS · Zaeli suggests ${sugPts(kid.id)} based on age`}</Text>
                    <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                      {[15, 25, 35].map(p => {
                        const on = points[kid.id] === p && !custom[kid.id];
                        return (
                          <TouchableOpacity key={p} style={[s.ptsOpt, on && s.ptsOptOn]}
                            onPress={() => { setPoints(prev => ({ ...prev, [kid.id]: p })); setCustom(prev => ({ ...prev, [kid.id]: '' })); }}
                            activeOpacity={0.8}>
                            <Text style={[s.ptsOptTxt, on && { color: '#fff' }]}>{p}</Text>
                          </TouchableOpacity>
                        );
                      })}
                      <TouchableOpacity style={[s.ptsOpt, (points[kid.id] === -1 || !!custom[kid.id]) ? s.ptsOptOn : {}]}
                        onPress={() => setPoints(prev => ({ ...prev, [kid.id]: -1 }))} activeOpacity={0.8}>
                        <Text style={[s.ptsOptTxt, (points[kid.id] === -1 || !!custom[kid.id]) && { color: '#fff' }]}>Custom</Text>
                      </TouchableOpacity>
                    </View>
                    {points[kid.id] === -1 && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 }}>
                        <TextInput style={s.customPtsInput} keyboardType="numeric" placeholder="e.g. 50"
                          placeholderTextColor={C.ink3} value={custom[kid.id] || ''}
                          onChangeText={v => setCustom(prev => ({ ...prev, [kid.id]: v }))} maxLength={4} />
                        <Text style={{ fontSize: 13, color: C.ink2, fontFamily: 'Poppins_600SemiBold' }}>pts</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            ))}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

// ── AddMealModal ───────────────────────────────────────────────────────────────
function AddMealModal({ visible, targetDayKey, targetDayLabel, targetMealType, onClose, onSaved, onBrowseRecipes, onFavourites }: {
  visible: boolean; targetDayKey: string; targetDayLabel: string; targetMealType?: string;
  onClose: () => void; onSaved: () => void;
  onBrowseRecipes: () => void; onFavourites: () => void;
}) {
  const router = useRouter();
  const [mode, setMode]     = useState<'menu' | 'manual' | 'kit'>('menu');
  const [name, setName]     = useState('');
  const [saving, setSaving] = useState(false);
  const reset = () => { setMode('menu'); setName(''); setSaving(false); };

  const saveToDb = async (mealName: string, source: MealSource) => {
    setSaving(true);
    const { error } = await supabase.from('meal_plans').insert({
      family_id: DUMMY_FAMILY_ID, day_key: targetDayKey, planned_date: targetDayKey,
      meal_name: mealName || 'Dinner', meal_type: targetMealType || 'dinner', source,
    });
    if (error) Alert.alert('Could not save', error.message);
    setSaving(false); reset(); onSaved(); onClose();
  };

  const opts = [
    { icon: '✦',  label: 'Ask Zaeli for ideas',   sub: "She'll ask a couple of quick questions", bg: C.accentL,
      onPress: () => { onClose(); reset(); router.push({ pathname: '/(tabs)/zaeli-chat', params: { channel: 'Meals', returnTo: '/(tabs)/mealplanner' } }); } },
    { icon: '🔍', label: 'Browse recipes',          sub: 'Search 5,000+ with pantry matching',    bg: 'rgba(168,216,240,0.18)',
      onPress: () => { onClose(); reset(); onBrowseRecipes(); } },
    { icon: '❤️', label: 'Pick from favourites',    sub: "Your family's saved meals",              bg: C.aiL,
      onPress: () => { onClose(); reset(); onFavourites(); } },
    { icon: '📦', label: 'Meal kit night',          sub: 'Ingredients included',                   bg: C.kitL,
      onPress: () => setMode('kit') },
    { icon: '✏️', label: 'Add manually',            sub: 'Just the name — no ingredients needed', bg: 'rgba(0,0,0,0.04)',
      onPress: () => setMode('manual') },
    { icon: '🍕', label: 'Takeaway / eating out',   sub: 'Mark the night as sorted',              bg: 'rgba(255,59,59,0.06)',
      onPress: () => saveToDb('Takeaway / Eating out', 'takeaway') },
  ];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => { onClose(); reset(); }}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top']}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={s.modalHdr}>
            <TouchableOpacity onPress={() => { if (mode !== 'menu') setMode('menu'); else { onClose(); reset(); } }}>
              <Text style={s.modalCancel}>{mode !== 'menu' ? '← Back' : 'Cancel'}</Text>
            </TouchableOpacity>
            <Text style={s.modalTitle}>{targetDayLabel}</Text>
            <View style={{ width: 60 }} />
          </View>
          <ScrollView contentContainerStyle={{ padding: 20, gap: 10 }} keyboardShouldPersistTaps="handled">
            {mode === 'menu' && opts.map((opt, i) => (
              <TouchableOpacity key={i} style={s.addOpt} onPress={opt.onPress} activeOpacity={0.85} disabled={saving}>
                <View style={[s.addOptIcon, { backgroundColor: opt.bg }]}>
                  <Text style={{ fontSize: 22 }}>{opt.icon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.addOptTitle}>{opt.label}</Text>
                  <Text style={s.addOptSub}>{opt.sub}</Text>
                </View>
              </TouchableOpacity>
            ))}
            {(mode === 'manual' || mode === 'kit') && (
              <>
                <Text style={s.modalSub}>{mode === 'kit' ? 'What meal kit are you having?' : 'What are you making?'}</Text>
                <TextInput style={[s.fieldInput, { marginVertical: 12 }]} value={name} onChangeText={setName}
                  placeholder={mode === 'kit' ? "e.g. HelloFresh Butter Chicken" : "e.g. Pasta Bake"}
                  placeholderTextColor={C.ink3} autoFocus autoCapitalize="words" />
                <TouchableOpacity style={[s.bigBtnOr, (!name.trim() || saving) && { opacity: 0.5 }]}
                  onPress={() => saveToDb(name.trim(), mode === 'kit' ? 'kit' : 'manual')}
                  disabled={!name.trim() || saving} activeOpacity={0.85}>
                  <Text style={s.bigBtnTxt}>{saving ? 'Saving…' : '+ Add to plan'}</Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

// ── SaveRecipeModal (stub — keeps parity) ──────────────────────────────────────
function SaveRecipeModal({ visible, onClose, onSaved, router }: {
  visible: boolean; onClose: () => void; onSaved: () => void; router: any;
}) {
  const [mode, setMode]   = useState<'menu' | 'url' | 'manual'>('menu');
  const [url, setUrl]     = useState('');
  const [name, setName]   = useState('');
  const [saving, setSaving] = useState(false);
  const reset = () => { setMode('menu'); setUrl(''); setName(''); setSaving(false); };

  const opts = [
    { icon: '📸', label: 'Photo of a recipe', sub: "Take or upload a photo — Zaeli reads it", bg: C.accentL,
      onPress: async () => {
        const r = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!r.granted) return;
        const img = await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.7, mediaTypes: ['images'] as any });
        if (img.canceled || !img.assets?.[0]?.base64) return;
        setSaving(true);
        try {
          const data = await callClaude({ feature: 'recipe_scan', familyId: DUMMY_FAMILY_ID, body: {
            model: 'claude-sonnet-4-20250514', max_tokens: 600,
            messages: [{ role: 'user', content: [
              { type: 'image', source: { type: 'base64', media_type: getMediaType(img.assets[0].base64!), data: img.assets[0].base64! } },
              { type: 'text', text: 'Extract the recipe name, ingredients and method from this image. Respond ONLY as JSON: {"name":"...","ingredients":"...","method":"...","prep_mins":null}' },
            ] }],
          } });
          const parsed = JSON.parse((data?.content?.[0]?.text || '{}').replace(/```json|```/g, '').trim());
          const noteParts = [parsed.ingredients ? `Ingredients:\n${parsed.ingredients}` : null, parsed.method ? `\nMethod:\n${parsed.method}` : null].filter(Boolean);
          await supabase.from('recipes').insert({ family_id: DUMMY_FAMILY_ID, name: parsed.name || 'Scanned recipe', source_type: 'photo', prep_mins: parsed.prep_mins || null, notes: noteParts.join('') || null });
          reset(); onSaved();
        } catch { Alert.alert('Could not read recipe', 'Try a clearer photo.'); }
        setSaving(false);
      }
    },
    { icon: '🔗', label: 'Save from URL', sub: "Paste a recipe link", bg: C.aiL, onPress: () => setMode('url') },
    { icon: '✏️', label: 'Add manually', sub: "Type it in yourself", bg: 'rgba(0,0,0,0.04)', onPress: () => setMode('manual') },
  ];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => { onClose(); reset(); }}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top']}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={s.modalHdr}>
            <TouchableOpacity onPress={() => { if (mode !== 'menu') setMode('menu'); else { onClose(); reset(); } }}>
              <Text style={s.modalCancel}>{mode !== 'menu' ? '← Back' : 'Cancel'}</Text>
            </TouchableOpacity>
            <Text style={s.modalTitle}>Save a recipe</Text>
            <View style={{ width: 60 }} />
          </View>
          <ScrollView contentContainerStyle={{ padding: 20, gap: 10 }} keyboardShouldPersistTaps="handled">
            {mode === 'menu' && opts.map((opt, i) => (
              <TouchableOpacity key={i} style={s.addOpt} onPress={opt.onPress} activeOpacity={0.85} disabled={saving}>
                <View style={[s.addOptIcon, { backgroundColor: opt.bg }]}><Text style={{ fontSize: 22 }}>{opt.icon}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={s.addOptTitle}>{opt.label}</Text>
                  <Text style={s.addOptSub}>{opt.sub}</Text>
                </View>
              </TouchableOpacity>
            ))}
            {saving && <Text style={{ fontFamily: 'Poppins_400Regular', color: C.ink3, textAlign: 'center' }}>Scanning recipe…</Text>}
            {mode === 'url' && (
              <>
                <TextInput style={[s.fieldInput, { marginVertical: 12 }]} value={url} onChangeText={setUrl}
                  placeholder="https://..." placeholderTextColor={C.ink3} autoFocus keyboardType="url" />
                <TouchableOpacity style={[s.bigBtnOr, !url.trim() && { opacity: 0.5 }]}
                  onPress={async () => {
                    if (!url.trim()) return;
                    setSaving(true);
                    await supabase.from('recipes').insert({ family_id: DUMMY_FAMILY_ID, name: 'Recipe from URL', source_type: 'url', notes: url.trim() });
                    setSaving(false); reset(); onSaved();
                  }} disabled={!url.trim() || saving} activeOpacity={0.85}>
                  <Text style={s.bigBtnTxt}>{saving ? 'Saving…' : 'Save recipe'}</Text>
                </TouchableOpacity>
              </>
            )}
            {mode === 'manual' && (
              <>
                <TextInput style={[s.fieldInput, { marginVertical: 8 }]} value={name} onChangeText={setName}
                  placeholder="Recipe name" placeholderTextColor={C.ink3} autoFocus autoCapitalize="words" />
                <TouchableOpacity style={[s.bigBtnOr, !name.trim() && { opacity: 0.5 }]}
                  onPress={async () => {
                    if (!name.trim()) return;
                    setSaving(true);
                    await supabase.from('recipes').insert({ family_id: DUMMY_FAMILY_ID, name: name.trim(), source_type: 'manual' });
                    setSaving(false); reset(); onSaved();
                  }} disabled={!name.trim() || saving} activeOpacity={0.85}>
                  <Text style={s.bigBtnTxt}>{saving ? 'Saving…' : 'Save recipe'}</Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

// ── FavouriteDetailModal — recipe detail + edit + delete + plan it ────────────
function FavouriteDetailModal({ visible, recipe, onClose, onSaved, onAdded }: {
  visible: boolean; recipe: SavedRecipe | null;
  onClose: () => void; onSaved: () => void;
  onAdded: (dk: string, dl: string) => void;
}) {
  const [mode, setMode]             = useState<'detail' | 'edit' | 'plan'>('detail');
  const [editName, setEditName]     = useState('');
  const [editIngredients, setEditIngredients] = useState('');
  const [editMethod, setEditMethod] = useState('');
  const [saving, setSaving]         = useState(false);
  const [addedDay, setAddedDay]     = useState<string | null>(null);

  useEffect(() => {
    if (visible && recipe) {
      setMode('detail');
      setEditName(recipe.name);
      // Split existing notes into ingredients / method sections
      const notes = recipe.notes || '';
      const methodIdx = notes.toLowerCase().indexOf('method:');
      if (methodIdx > -1) {
        setEditIngredients(notes.slice(0, methodIdx).replace(/^ingredients:\s*/i, '').trim());
        setEditMethod(notes.slice(methodIdx).replace(/^method:\s*/i, '').trim());
      } else {
        setEditIngredients(notes);
        setEditMethod('');
      }
      setAddedDay(null);
    }
  }, [visible, recipe?.id]);

  if (!recipe) return null;
  const icon = getMealEmoji(recipe.name);
  const days = get7Days();

  const saveEdit = async () => {
    setSaving(true);
    const combined = [
      editIngredients.trim() ? `Ingredients:\n${editIngredients.trim()}` : '',
      editMethod.trim() ? `Method:\n${editMethod.trim()}` : '',
    ].filter(Boolean).join('\n\n');
    await supabase.from('recipes').update({ name: editName.trim() || recipe.name, notes: combined || null }).eq('id', recipe.id);
    setSaving(false); setMode('detail'); onSaved();
  };

  const deleteFav = () => Alert.alert('Remove from Favourites', `Remove "${recipe.name}"?`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Remove', style: 'destructive', onPress: async () => { await supabase.from('recipes').delete().eq('id', recipe.id); onClose(); onSaved(); } },
  ]);

  const planToDay = async (dk: string, dl: string) => {
    setSaving(true);
    await supabase.from('meal_plans').insert({ family_id: DUMMY_FAMILY_ID, day_key: dk, planned_date: dk, meal_name: recipe.name, meal_type: 'dinner', source: 'favourites', prep_mins: recipe.prep_mins || null });
    setSaving(false); setAddedDay(dl); onAdded(dk, dl);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top']}>
        <View style={s.modalHdr}>
          <TouchableOpacity onPress={() => mode !== 'detail' ? setMode('detail') : onClose()}>
            <Text style={s.modalCancel}>{mode !== 'detail' ? '← Back' : '← Back'}</Text>
          </TouchableOpacity>
          <Text style={s.modalTitle} numberOfLines={1}>{mode === 'edit' ? 'Edit recipe' : mode === 'plan' ? 'Plan it' : recipe.name}</Text>
          {mode === 'detail' ? (
            <TouchableOpacity onPress={() => setMode('edit')}>
              <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 14, color: C.accent }}>Edit</Text>
            </TouchableOpacity>
          ) : mode === 'edit' ? (
            <TouchableOpacity onPress={saveEdit} disabled={saving}>
              <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 14, color: saving ? C.ink3 : C.accent }}>{saving ? 'Saving…' : 'Save'}</Text>
            </TouchableOpacity>
          ) : <View style={{ width: 60 }} />}
        </View>

        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 14 }} keyboardShouldPersistTaps="handled">
          {/* ── DETAIL MODE ── */}
          {mode === 'detail' && (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <View style={{ width: 72, height: 72, borderRadius: 20, backgroundColor: C.accentL, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 36 }}>{icon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: 'DMSerifDisplay_400Regular', fontSize: 22, color: C.ink, lineHeight: 26, marginBottom: 6 }}>{recipe.name}</Text>
                  <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                    {recipe.prep_mins && <View style={{ backgroundColor: 'rgba(240,220,128,0.42)', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 3 }}><Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 11, color: '#806000' }}>⏱ {recipe.prep_mins} min</Text></View>}
                    {(recipe.tags || []).slice(0, 2).map(t => <View key={t} style={{ backgroundColor: C.aiL, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 3 }}><Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 11, color: C.mintD }}>{t}</Text></View>)}
                  </View>
                </View>
              </View>
              {recipe.notes ? (() => {
                const notes = recipe.notes;
                const methodIdx = notes.toLowerCase().indexOf('method:');
                const ingText = methodIdx > -1 ? notes.slice(0, methodIdx).replace(/^ingredients:\n?/i, '').trim() : notes;
                const methText = methodIdx > -1 ? notes.slice(methodIdx).replace(/^method:\n?/i, '').trim() : '';
                const ingLines = ingText.split('\n').filter(Boolean);
                const methLines = methText.split('\n').filter(Boolean);
                return (
                  <>
                    {ingLines.length > 0 && <>
                      <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 11, letterSpacing: 1, color: 'rgba(0,0,0,0.30)', textTransform: 'uppercase', marginBottom: 8 }}>Ingredients</Text>
                      {ingLines.map((ing, i) => (
                        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)' }}>
                          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#A8E8CC', flexShrink: 0 }} />
                          <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 15, color: C.ink, flex: 1 }}>{ing.replace(/^[-•]\s*/, '')}</Text>
                        </View>
                      ))}
                    </>}
                    {methLines.length > 0 && <>
                      <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 11, letterSpacing: 1, color: 'rgba(0,0,0,0.30)', textTransform: 'uppercase', marginTop: 16, marginBottom: 8 }}>Method</Text>
                      {methLines.map((step, i) => (
                        <View key={i} style={{ flexDirection: 'row', gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)' }}>
                          <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(168,232,204,0.35)', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 10, color: '#1A7A45' }}>{i + 1}</Text>
                          </View>
                          <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 15, color: C.ink, flex: 1, lineHeight: 22 }}>{step.replace(/^\d+\.\s*/, '')}</Text>
                        </View>
                      ))}
                    </>}
                  </>
                );
              })() : (
                <View style={{ backgroundColor: 'rgba(0,0,0,0.04)', borderRadius: 12, padding: 14, alignItems: 'center' }}>
                  <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 14, color: 'rgba(0,0,0,0.40)', textAlign: 'center', lineHeight: 21 }}>{"No ingredients or method saved yet. Tap Edit to add them."}</Text>
                </View>
              )}
              <TouchableOpacity style={[s.bigBtnOr, { backgroundColor: '#A8E8CC', borderWidth: 1.5, borderColor: 'rgba(168,232,204,0.70)' }]} onPress={() => setMode('plan')} activeOpacity={0.85}>
                <Text style={[s.bigBtnTxt, { color: '#1A7A45' }]}>Plan it →</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.bigBtnGhost]} onPress={deleteFav} activeOpacity={0.85}>
                <Text style={[s.bigBtnGhostTxt, { color: C.red }]}>Remove from Favourites</Text>
              </TouchableOpacity>
            </>
          )}

          {/* ── EDIT MODE ── */}
          {mode === 'edit' && (
            <>
              <Text style={s.fieldLbl}>RECIPE NAME</Text>
              <TextInput style={[s.fieldInput, { marginTop: 6, marginBottom: 14 }]} value={editName} onChangeText={setEditName} placeholder="Recipe name" placeholderTextColor={C.ink3} autoCapitalize="words" />
              <Text style={s.fieldLbl}>INGREDIENTS</Text>
              <TextInput
                style={[s.fieldInput, { minHeight: 130, textAlignVertical: 'top', marginTop: 6, marginBottom: 14 }]}
                value={editIngredients} onChangeText={setEditIngredients}
                placeholder={"- 500g chicken thighs\n- 3 tbsp soy sauce\n- 2 cloves garlic"}
                placeholderTextColor={C.ink3} multiline />
              <Text style={s.fieldLbl}>METHOD</Text>
              <TextInput
                style={[s.fieldInput, { minHeight: 130, textAlignVertical: 'top', marginTop: 6 }]}
                value={editMethod} onChangeText={setEditMethod}
                placeholder={"1. Marinate chicken for 15 min\n2. Heat pan over high heat\n3. Cook 6 min each side"}
                placeholderTextColor={C.ink3} multiline />
            </>
          )}

          {/* ── PLAN MODE ── */}
          {mode === 'plan' && (
            <>
              {addedDay ? (
                <View style={s.pantryAllOk}>
                  <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 14, color: C.ink }}>Added to <Text style={{ color: C.accent }}>{addedDay}</Text>!</Text>
                </View>
              ) : (
                <>
                  <Text style={[s.fieldLbl, { marginBottom: 10 }]}>WHICH NIGHT?</Text>
                  {days.map(d => {
                    const dk = dayKey(d);
                    const isNight = isToday(d);
                    return (
                      <TouchableOpacity key={dk} disabled={saving}
                        style={{ borderRadius: 14, borderWidth: 1.5, padding: 15, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8, borderColor: isNight ? C.accent : C.border, backgroundColor: isNight ? C.accentL : '#fff', opacity: saving ? 0.5 : 1 }}
                        activeOpacity={0.8} onPress={() => planToDay(dk, dayLabel(d))}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 15, color: isNight ? C.accent : C.ink }}>{dayLabel(d)}</Text>
                          <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 12, color: C.ink3, marginTop: 2 }}>{fmtDay(d)}</Text>
                        </View>
                        <Text style={{ fontSize: 18, color: isNight ? C.accent : C.ink3 }}>→</Text>
                      </TouchableOpacity>
                    );
                  })}
                </>
              )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ── MealDetailModal (bottom-sheet style) ──────────────────────────────────────
function MealDetailModal({ visible, meal, dayLbl, onClose, onRequestAssign, onMove, onEdit, onSeeRecipe, onShopping }: {
  visible: boolean; meal: MealPlan | null; dayLbl: string;
  onClose: () => void; onRequestAssign: () => void;
  onMove: () => void; onEdit: (meal: MealPlan) => void;
  onSeeRecipe: (meal: MealPlan) => void;
  onShopping: (meal: MealPlan) => void;
}) {
  if (!meal) return null;
  const emoji = getMealEmoji(meal.meal_name);
  const cookNames = meal.cook_ids?.length
    ? FAMILY.filter(m => meal.cook_ids!.includes(m.id)).map(m => m.name).join(' + ')
    : null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top']}>
        <View style={s.modalHdr}>
          <TouchableOpacity onPress={onClose}><Text style={s.modalCancel}>← Back</Text></TouchableOpacity>
          <Text style={s.modalTitle} numberOfLines={1}>{meal.meal_name}</Text>
          <TouchableOpacity onPress={() => { onClose(); onEdit(meal); }}>
            <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 14, color: C.accent }}>Edit</Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48, gap: 14 }}>
          {/* Hero */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View style={{ width: 64, height: 64, borderRadius: 18, backgroundColor: C.accentL, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 32 }}>{emoji}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: 'DMSerifDisplay_400Regular', fontSize: 22, color: C.ink, lineHeight: 26 }}>{meal.meal_name}</Text>
              <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 12, color: C.ink2, marginTop: 3 }}>
                {dayLbl}{meal.prep_mins ? ` · ⏱ ${meal.prep_mins} min` : ''}
              </Text>
            </View>
          </View>
          {/* Zaeli strip */}
          <View style={{ backgroundColor: C.aiL, borderRadius: 12, padding: 12, flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
            <View style={{ width: 16, height: 16, borderRadius: 5, backgroundColor: C.ai, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
              <Text style={{ fontSize: 9, color: C.mintD }}>✦</Text>
            </View>
            <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 13, color: C.ink, lineHeight: 19, flex: 1 }}>
              {meal.prep_mins ? `${meal.prep_mins} minutes. ` : ''}
              {cookNames ? `${cookNames} on cooking duty.` : "Who's cooking tonight?"}
            </Text>
          </View>
          {/* Cook assign */}
          <TouchableOpacity style={{ backgroundColor: 'rgba(0,0,0,0.04)', borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }} onPress={onRequestAssign} activeOpacity={0.8}>
            {meal.cook_ids?.length ? (
              <><CookAvatars cookIds={meal.cook_ids} size={24} /><Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: C.ink, flex: 1 }}>{cookNames}</Text></>
            ) : (
              <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: C.accent, flex: 1 }}>+ Who is cooking?</Text>
            )}
            <Text style={{ fontSize: 16, color: C.ink3 }}>›</Text>
          </TouchableOpacity>
          {/* Notes */}
          {meal.notes ? (
            <View style={s.notesBox}>
              <Text style={s.notesTxt}>{meal.notes}</Text>
            </View>
          ) : null}
          {/* Action buttons */}
          <TouchableOpacity style={[s.bigBtnOr, { backgroundColor: '#A8E8CC', borderWidth: 1.5, borderColor: 'rgba(168,232,204,0.70)' }]} onPress={() => { onClose(); onSeeRecipe(meal); }} activeOpacity={0.85}>
            <Text style={[s.bigBtnTxt, { color: '#1A7A45' }]}>See full recipe →</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.bigBtnOr, { backgroundColor: 'rgba(0,0,0,0.08)', borderWidth: 0 }]} onPress={onClose} activeOpacity={0.85}>
            <Text style={[s.bigBtnTxt, { color: '#0A0A0A' }]}>Done</Text>
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={[s.bigBtnGhost, { flex: 1 }]} onPress={() => { onClose(); onShopping(meal); }} activeOpacity={0.85}>
              <Text style={s.bigBtnGhostTxt}>+ Shopping</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.bigBtnGhost, { flex: 1 }]} onPress={() => { onMove(); }} activeOpacity={0.85}>
              <Text style={s.bigBtnGhostTxt}>Move night</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.bigBtnGhost, { flex: 1 }]} activeOpacity={0.85}
              onPress={() => Alert.alert('Remove meal', `Remove ${meal.meal_name} from the plan?`, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Remove', style: 'destructive', onPress: async () => { await supabase.from('meal_plans').delete().eq('id', meal.id); onClose(); } },
              ])}>
              <Text style={[s.bigBtnGhostTxt, { color: C.red }]}>Remove</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ── Meal tools for Zaeli ───────────────────────────────────────────────────────
const MEAL_TOOLS = [
  {
    name: 'plan_dinner',
    description: 'Add or replace a dinner on a specific night.',
    input_schema: {
      type: 'object',
      properties: {
        day_key:   { type: 'string', description: 'YYYY-MM-DD date key' },
        meal_name: { type: 'string', description: 'Name of the meal' },
        prep_mins: { type: 'number', description: 'Prep time in minutes (optional)' },
      },
      required: ['day_key', 'meal_name'],
    },
  },
  {
    name: 'remove_dinner',
    description: 'Remove a planned dinner from a specific night.',
    input_schema: {
      type: 'object',
      properties: {
        day_key: { type: 'string', description: 'YYYY-MM-DD date key' },
      },
      required: ['day_key'],
    },
  },
  {
    name: 'add_to_favourites',
    description: 'Save a recipe to the family favourites.',
    input_schema: {
      type: 'object',
      properties: {
        meal_name: { type: 'string', description: 'Name of the recipe to save' },
        prep_mins: { type: 'number', description: 'Prep time in minutes (optional)' },
        tags:      { type: 'array', items: { type: 'string' }, description: 'Tags like Kids love, Quick, Comfort' },
      },
      required: ['meal_name'],
    },
  },
];

async function executeMealTool(name: string, input: any, onRefresh: () => void): Promise<string> {
  try {
    if (name === 'plan_dinner') {
      const { day_key, meal_name, prep_mins } = input;
      // Upsert — delete existing then insert
      await supabase.from('meal_plans').delete().eq('family_id', DUMMY_FAMILY_ID).eq('day_key', day_key).eq('meal_type', 'dinner');
      await supabase.from('meal_plans').insert({
        family_id: DUMMY_FAMILY_ID, day_key, planned_date: day_key,
        meal_name, meal_type: 'dinner', source: 'zaeli',
        prep_mins: prep_mins || null,
      });
      onRefresh();
      return `Planned ${meal_name} for ${day_key}.`;
    }
    if (name === 'remove_dinner') {
      const { day_key } = input;
      await supabase.from('meal_plans').delete().eq('family_id', DUMMY_FAMILY_ID).eq('day_key', day_key).eq('meal_type', 'dinner');
      onRefresh();
      return `Removed dinner for ${day_key}.`;
    }
    if (name === 'add_to_favourites') {
      const { meal_name, prep_mins, tags } = input;
      await supabase.from('recipes').insert({
        family_id: DUMMY_FAMILY_ID, name: meal_name, source_type: 'zaeli',
        prep_mins: prep_mins || null, tags: tags || [],
      });
      onRefresh();
      return `Saved ${meal_name} to favourites.`;
    }
    return 'Unknown tool.';
  } catch (e) {
    return `Error: ${String(e)}`;
  }
}


// ── Shopping Ingredient Review Modal ──────────────────────────────────────────
function ShoppingReviewModal({ visible, meal, onClose }: {
  visible: boolean;
  meal: MealPlan | null;
  onClose: () => void;
}) {
  const [items, setItems] = useState<{ name: string; checked: boolean; emoji: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible || !meal) return;
    // If meal has stored ingredients use them, otherwise generate from name
    if (meal.ingredients && meal.ingredients.length > 0) {
      setItems(meal.ingredients.map((ing: any) => ({
        name: ing.name || String(ing),
        emoji: ing.emoji || '🥘',
        checked: true,
      })));
    } else if (meal.source === 'manual' || meal.source === 'zaeli') {
      // Manual meals — blank, user adds their own
      setItems([]);
    } else {
      // Auto-generate from meal name using Claude
      setLoading(true);
      const key = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? '';
      fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 400,
          messages: [{ role: 'user', content: `List the main ingredients needed to cook "${meal.meal_name}" for a family of 5. Respond ONLY as JSON array, no markdown: [{"name":"Chicken thighs","emoji":"🍗"},{"name":"Soy sauce","emoji":"🫙"},...]. Max 12 items.` }],
        }),
      })
        .then(r => r.json())
        .then(d => {
          const raw = d.content?.[0]?.text || '[]';
          const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
          setItems(parsed.map((i: any) => ({ name: i.name, emoji: i.emoji || '🥘', checked: true })));
        })
        .catch(() => setItems([{ name: meal.meal_name + ' ingredients', emoji: '🥘', checked: true }]))
        .finally(() => setLoading(false));
    }
  }, [visible, meal?.id]);

  const toggle = (i: number) => setItems(prev => prev.map((it, idx) => idx === i ? { ...it, checked: !it.checked } : it));

  const confirm = async () => {
    if (!meal) return;
    setSaving(true);
    const toAdd = items.filter(i => i.checked);
    if (toAdd.length === 0) { onClose(); setSaving(false); return; }
    for (const item of toAdd) {
      await supabase.from('shopping_items').insert({
        family_id: DUMMY_FAMILY_ID, name: item.name, item: item.name,
        category: 'Other', checked: false, completed: false, meal_source: meal.meal_name,
      });
    }
    setSaving(false);
    onClose();
    Alert.alert(`${toAdd.length} item${toAdd.length !== 1 ? 's' : ''} added to shopping list`);
  };

  if (!meal) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top']}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.07)' }}>
          <TouchableOpacity onPress={onClose}><Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: 'rgba(0,0,0,0.50)' }}>Cancel</Text></TouchableOpacity>
          <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 16, color: '#0A0A0A' }}>Add to Shopping</Text>
          <TouchableOpacity onPress={confirm} disabled={saving || loading}>
            <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 15, color: saving || loading ? 'rgba(0,0,0,0.28)' : '#1A7A45' }}>{saving ? 'Adding…' : 'Add'}</Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
          <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 13, color: 'rgba(0,0,0,0.50)', marginBottom: 16, lineHeight: 19 }}>
            Ingredients for <Text style={{ fontFamily: 'Poppins_700Bold', color: '#0A0A0A' }}>{meal.meal_name}</Text>. Untick anything you already have.
          </Text>
          {loading && (
            <View style={{ alignItems: 'center', paddingVertical: 32 }}>
              <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 14, color: 'rgba(0,0,0,0.40)' }}>Checking ingredients…</Text>
            </View>
          )}
          {!loading && items.length === 0 && (
            <View style={{ alignItems: 'center', paddingVertical: 32 }}>
              <Text style={{ fontSize: 36, marginBottom: 12 }}>📝</Text>
              <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 15, color: '#0A0A0A', marginBottom: 6 }}>No ingredients saved</Text>
              <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 13, color: 'rgba(0,0,0,0.45)', textAlign: 'center', lineHeight: 20 }}>This meal was added manually. Edit the recipe to add ingredients.</Text>
            </View>
          )}
          {!loading && items.map((item, i) => (
            <TouchableOpacity key={i}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)' }}
              onPress={() => toggle(i)} activeOpacity={0.7}>
              <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: item.checked ? '#1A7A45' : 'rgba(0,0,0,0.25)', backgroundColor: item.checked ? '#A8E8CC' : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                {item.checked && <Text style={{ fontSize: 13, color: '#1A7A45', fontWeight: '700' }}>✓</Text>}
              </View>
              <Text style={{ fontSize: 16 }}>{item.emoji}</Text>
              <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 15, color: item.checked ? '#0A0A0A' : 'rgba(0,0,0,0.35)', flex: 1, textDecorationLine: item.checked ? 'none' : 'line-through' }}>{item.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ── DinnersTab ─────────────────────────────────────────────────────────────────
function DinnersTab({ onTabChange, favouritedNames, onRefresh, onRequestMove }: {
  onTabChange: (t: TabType) => void;
  favouritedNames: Set<string>;
  onRefresh: () => void;
  onRequestMove: (meal: MealPlan, meals: MealPlan[]) => void;
}) {
  const [meals, setMeals]           = useState<MealPlan[]>([]);
  const [loading, setLoading]       = useState(true);
  const [addDay, setAddDay]         = useState<{ key: string; label: string; mealType?: string } | null>(null);
  const [detailMeal, setDetailMeal] = useState<{ meal: MealPlan; label: string } | null>(null);
  const [assignState, setAssignState] = useState<{ key: string; label: string; meal: MealPlan } | null>(null);
  const [editingMeal, setEditingMeal] = useState<MealPlan | null>(null);
  const [editName, setEditName]         = useState('');
  const [editIngredients, setEditIngredients] = useState('');
  const [editNotes, setEditNotes]       = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [shoppingMeal, setShoppingMeal] = useState<MealPlan | null>(null);
  const [recipeViewMeal, setRecipeViewMeal] = useState<MealPlan | null>(null);

  const fetchMeals = useCallback(async () => {
    const days = get7Days();
    const keys = days.map(dayKey);
    const { data, error } = await supabase.from('meal_plans').select('*')
      .eq('family_id', DUMMY_FAMILY_ID).in('day_key', keys).order('created_at', { ascending: true });
    if (error) console.error('fetchMeals:', error);
    setMeals((data || []) as MealPlan[]);
    setLoading(false);
    onRefresh();
  }, []);

  useEffect(() => { fetchMeals(); }, []);
  useFocusEffect(useCallback(() => { fetchMeals(); }, [fetchMeals]));

  const handleAssignSave = async (cookIds: string[], jobKidIds: string[], pts: Record<string, number>) => {
    if (!assignState) return;
    await supabase.from('meal_plans').update({ cook_ids: cookIds }).eq('id', assignState.meal.id);
    for (const kidId of jobKidIds) {
      const kid = FAMILY.find(m => m.id === kidId);
      if (!kid) continue;
      await supabase.from('todos').insert({
        family_id: DUMMY_FAMILY_ID, title: `Help cook dinner — ${assignState.label}`,
        assigned_to: kidId, points: pts[kidId] || 25, status: 'pending',
        due_date: assignState.key, source: 'meals',
      });
    }
    await fetchMeals(); setAssignState(null);
  };

  const briefDays = get7Days();

  // Is a meal a favourite?
  const isFavourite = (mealName: string) => {
    const lower = mealName.toLowerCase();
    return [...favouritedNames].some(fn => fn.includes(lower) || lower.includes(fn));
  };

  const tonight = briefDays[0];
  // Supabase jsonb arrays sometimes come back as strings — parse safely
  const parsedMeals = meals.map(m => ({
    ...m,
    cook_ids: Array.isArray(m.cook_ids) ? m.cook_ids
      : typeof m.cook_ids === 'string' ? (() => { try { return JSON.parse(m.cook_ids as any); } catch { return []; } })()
      : [],
  }));
  const tonightMeal = parsedMeals.find(m => m.day_key === dayKey(tonight) && m.meal_type !== 'dessert');
  const weekDays = briefDays.slice(1);
  // Use parsedMeals for week rows too

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingTop: 0, paddingBottom: 130 }} showsVerticalScrollIndicator={false}>

        {/* ── All 7 nights — uniform treatment ── */}
        <View style={s.weekSection}>
          {briefDays.map((d, idx) => {
            const dk = dayKey(d);
            const isTonight = idx === 0;
            const meal = parsedMeals.find(m => m.day_key === dk && m.meal_type !== 'dessert');
            const isFav = meal ? isFavourite(meal.meal_name) : false;
            const isTakeaway = meal?.source === 'takeaway';
            const isKit = meal?.source === 'kit';
            const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
            const dateLabel = `${['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
            const label = isTonight ? `Tonight · ${dateLabel}` : dateLabel;
            return (
              <View key={dk} style={s.dayBlock}>
                {/* Date label above card */}
                <Text style={[s.dayLabel, isTonight && s.dayLabelTonight]}>{label}</Text>
                <TouchableOpacity
                  style={[s.weekRow, meal ? s.weekRowPlanned : s.weekRowUnplanned]}
                  onPress={() => meal ? setDetailMeal({ meal, label: isTonight ? 'Tonight' : dayLabel(d) }) : setAddDay({ key: dk, label: isTonight ? 'Tonight' : dayLabel(d) })}
                  activeOpacity={0.8}>
                  {/* Emoji box */}
                  <View style={[s.weekEmojiWrap, meal ? s.weekEmojiPlanned : { backgroundColor: 'rgba(0,0,0,0.05)' }]}>
                    <Text style={[{ fontSize: 28 }, !meal && { opacity: 0.28 }]}>
                      {meal ? getMealEmoji(meal.meal_name) : '🍽'}
                    </Text>
                    {isFav && <HeartBadge size={22} />}
                  </View>
                  {/* Meal info */}
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[s.weekMeal, !meal && s.weekMealEmpty]} numberOfLines={1}>
                      {meal ? meal.meal_name : 'Not planned'}
                    </Text>
                    {meal ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                        {isKit && <View style={[s.weekBadge, { backgroundColor: C.kitL }]}><Text style={[s.weekBadgeTxt, { color: C.kit }]}>Meal kit</Text></View>}
                        {isTakeaway && <View style={[s.weekBadge, { backgroundColor: 'rgba(255,59,59,0.08)' }]}><Text style={[s.weekBadgeTxt, { color: C.red }]}>Sorted ✓</Text></View>}
                        {!isKit && !isTakeaway && meal.prep_mins ? <View style={[s.weekBadge, { backgroundColor: C.goldL }]}><Text style={[s.weekBadgeTxt, { color: C.goldD }]}>{meal.prep_mins} min</Text></View> : null}
                        {!meal.cook_ids?.length && <Text style={s.weekAssignNudge}>+ Who's cooking?</Text>}
                      </View>
                    ) : null}
                  </View>
                  {/* Right — avatars or + Add */}
                  <View style={{ alignItems: 'center', justifyContent: 'center', flexShrink: 0, minWidth: 32 }}>
                    {meal?.cook_ids?.length ? (
                      <CookAvatarsGrid cookIds={meal.cook_ids} size={30} />
                    ) : !meal ? (
                      <Text style={s.weekAdd}>+ Add</Text>
                    ) : null}
                  </View>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

      </ScrollView>

      {/* Modals */}
      <AddMealModal
        visible={!!addDay} targetDayKey={addDay?.key || ''} targetDayLabel={addDay?.label || ''}
        targetMealType={addDay?.mealType}
        onClose={() => setAddDay(null)}
        onSaved={() => { setAddDay(null); fetchMeals(); }}
        onBrowseRecipes={() => { setAddDay(null); onTabChange('recipes'); }}
        onFavourites={() => { setAddDay(null); onTabChange('favourites'); }}
      />
      <MealDetailModal
        visible={!!detailMeal} meal={detailMeal?.meal || null} dayLbl={detailMeal?.label || ''}
        onClose={() => setDetailMeal(null)}
        onRequestAssign={() => {
          if (!detailMeal) return;
          const snap = { key: detailMeal.meal.day_key, label: detailMeal.label, meal: detailMeal.meal };
          setDetailMeal(null);
          setTimeout(() => setAssignState(snap), 350);
        }}
        onMove={() => {
          if (!detailMeal) return;
          const meal = detailMeal.meal;
          const mealSnapshot = [...meals];
          setDetailMeal(null);
          // Fire synchronously — move modal is at root level so no modal stacking risk
          onRequestMove(meal, mealSnapshot);
        }}
        onEdit={(meal) => { setEditName(meal.meal_name); setEditIngredients(meal.ingredients_text || ''); setEditNotes(meal.notes || ''); setEditingMeal(meal); }}
        onSeeRecipe={(meal) => setRecipeViewMeal(meal)}
        onShopping={(meal) => setShoppingMeal(meal)}
      />
      <Modal visible={!!editingMeal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setEditingMeal(null)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top']}>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={s.modalHdr}>
              <TouchableOpacity onPress={() => setEditingMeal(null)}><Text style={s.modalCancel}>Cancel</Text></TouchableOpacity>
              <Text style={s.modalTitle} numberOfLines={1}>{editName}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {/* Heart — toggle favourite */}
                <TouchableOpacity
                  style={{ width: 34, height: 34, borderRadius: 11, backgroundColor: isFavourite(editName) ? 'rgba(255,123,107,0.20)' : 'rgba(0,0,0,0.05)', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: isFavourite(editName) ? 'rgba(255,123,107,0.40)' : 'rgba(0,0,0,0.10)' }}
                  onPress={async () => {
                    if (!editingMeal) return;
                    const already = isFavourite(editName);
                    if (already) {
                      const { data } = await supabase.from('recipes').select('id').eq('family_id', DUMMY_FAMILY_ID).ilike('name', editName.trim());
                      if (data?.[0]) await supabase.from('recipes').delete().eq('id', data[0].id);
                    } else {
                      await supabase.from('recipes').insert({ family_id: DUMMY_FAMILY_ID, name: editName.trim(), source_type: 'zaeli', prep_mins: editingMeal.prep_mins || null, tags: [] });
                    }
                    onRefresh();
                  }}
                  activeOpacity={0.8}>
                  <Text style={{ fontSize: 17 }}>{isFavourite(editName) ? '♥' : '♡'}</Text>
                </TouchableOpacity>
                <TouchableOpacity disabled={savingEdit} activeOpacity={0.8} onPress={async () => {
                  if (!editingMeal) return;
                  setSavingEdit(true);
                  await supabase.from('meal_plans').update({ meal_name: editName.trim() || editingMeal.meal_name, notes: editNotes || null }).eq('id', editingMeal.id);
                  setSavingEdit(false); setEditingMeal(null); fetchMeals();
                }}>
                  <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 14, color: savingEdit ? C.ink3 : C.accent }}>{savingEdit ? 'Saving…' : 'Save'}</Text>
                </TouchableOpacity>
              </View>
            </View>
            <ScrollView contentContainerStyle={{ padding: 18, gap: 14 }} keyboardShouldPersistTaps="handled">
              <Text style={s.fieldLbl}>MEAL NAME</Text>
              <TextInput style={[s.fieldInput, { marginTop: 6 }]} value={editName} onChangeText={setEditName} placeholder="Meal name" placeholderTextColor={C.ink3} autoCapitalize="words" />
              <Text style={s.fieldLbl}>INGREDIENTS</Text>
              <TextInput style={[s.fieldInput, { minHeight: 100, textAlignVertical: 'top', marginTop: 6 }]} value={editIngredients} onChangeText={setEditIngredients} placeholder={"- 400g pasta\n- 200g bacon\n- 4 eggs"} placeholderTextColor={C.ink3} multiline />
              <Text style={s.fieldLbl}>METHOD</Text>
              <TextInput style={[s.fieldInput, { minHeight: 100, textAlignVertical: 'top', marginTop: 6 }]} value={editNotes} onChangeText={setEditNotes} placeholder={"1. Boil pasta in salted water\n2. Fry bacon until crispy\n3. Combine and serve"} placeholderTextColor={C.ink3} multiline />
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
      <ShoppingReviewModal visible={!!shoppingMeal} meal={shoppingMeal} onClose={() => setShoppingMeal(null)} />
      {/* Meal recipe view — shows ingredients + method for a planned meal */}
      <Modal visible={!!recipeViewMeal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setRecipeViewMeal(null)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top']}>
          <View style={s.modalHdr}>
            <TouchableOpacity onPress={() => setRecipeViewMeal(null)}><Text style={s.modalCancel}>← Back</Text></TouchableOpacity>
            <Text style={s.modalTitle} numberOfLines={1}>{recipeViewMeal?.meal_name}</Text>
            <TouchableOpacity
              style={{ width: 34, height: 34, borderRadius: 11, backgroundColor: recipeViewMeal && isFavourite(recipeViewMeal.meal_name) ? 'rgba(255,123,107,0.20)' : 'rgba(0,0,0,0.05)', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: recipeViewMeal && isFavourite(recipeViewMeal.meal_name) ? 'rgba(255,123,107,0.40)' : 'rgba(0,0,0,0.10)' }}
              onPress={async () => {
                if (!recipeViewMeal) return;
                const already = isFavourite(recipeViewMeal.meal_name);
                if (already) {
                  const { data } = await supabase.from('recipes').select('id').eq('family_id', DUMMY_FAMILY_ID).ilike('name', recipeViewMeal.meal_name);
                  if (data?.[0]) await supabase.from('recipes').delete().eq('id', data[0].id);
                } else {
                  await supabase.from('recipes').insert({ family_id: DUMMY_FAMILY_ID, name: recipeViewMeal.meal_name, source_type: 'zaeli', prep_mins: recipeViewMeal.prep_mins || null, tags: [] });
                }
                onRefresh();
              }}
              activeOpacity={0.8}>
              <Text style={{ fontSize: 17 }}>{recipeViewMeal && isFavourite(recipeViewMeal.meal_name) ? '♥' : '♡'}</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
            {recipeViewMeal && (() => {
              const RECIPE_DATA: Record<string, { ingredients: string[]; method: string[] }> = {
                'pasta carbonara': { ingredients: ['400g spaghetti','200g pancetta or bacon','4 large eggs','100g pecorino romano, grated','2 cloves garlic','Black pepper','Salt'], method: ['Cook spaghetti in salted water until al dente.','Fry pancetta with garlic until crispy.','Whisk eggs with pecorino and black pepper.','Drain pasta, keep ½ cup pasta water.','Remove pan from heat. Add pasta, toss with pancetta.','Pour egg mixture over, toss quickly with pasta water.','Serve immediately with extra cheese.'] },
                'honey soy chicken': { ingredients: ['800g chicken thighs','3 tbsp soy sauce','2 tbsp honey','2 cloves garlic, minced','1 tbsp sesame oil','1 tsp ginger','Spring onions'], method: ['Mix soy, honey, garlic, sesame oil and ginger.','Coat chicken and marinate 15 min.','Cook in pan 6–7 min each side.','Rest 3 min before slicing.','Serve with rice and spring onions.'] },
                'chicken tacos': { ingredients: ['600g chicken breast','1 pack taco shells','Cumin, paprika, garlic powder','1 onion','Cheese, sour cream, lettuce, tomato, avocado'], method: ['Brown chicken with onion and spices.','Warm taco shells.','Fill with chicken and toppings.'] },
                'homemade pizza': { ingredients: ['Pizza bases or dough','Passata','Mozzarella','Toppings of choice'], method: ['Spread passata on base.','Add cheese and toppings.','Bake 220°C for 12–15 min.'] },
              };
              const key = recipeViewMeal.meal_name.toLowerCase();
              const data = Object.keys(RECIPE_DATA).find(k => key.includes(k)) ? RECIPE_DATA[Object.keys(RECIPE_DATA).find(k => key.includes(k))!] : null;
              return (
                <>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20 }}>
                    <View style={{ width: 72, height: 72, borderRadius: 20, backgroundColor: 'rgba(250,200,168,0.32)', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 36 }}>{getMealEmoji(recipeViewMeal.meal_name)}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: 'DMSerifDisplay_400Regular', fontSize: 22, color: '#0A0A0A', lineHeight: 26, marginBottom: 6 }}>{recipeViewMeal.meal_name}</Text>
                      {recipeViewMeal.prep_mins && <View style={{ backgroundColor: 'rgba(240,220,128,0.45)', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 3, alignSelf: 'flex-start' }}><Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 11, color: '#806000' }}>⏱ {recipeViewMeal.prep_mins} min</Text></View>}
                    </View>
                  </View>
                  {data ? (
                    <>
                      <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 12, letterSpacing: 1, color: 'rgba(0,0,0,0.30)', textTransform: 'uppercase', marginBottom: 10 }}>Ingredients</Text>
                      {data.ingredients.map((ing, i) => (
                        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)' }}>
                          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#A8E8CC', flexShrink: 0 }} />
                          <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 15, color: '#0A0A0A', flex: 1 }}>{ing}</Text>
                        </View>
                      ))}
                      <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 12, letterSpacing: 1, color: 'rgba(0,0,0,0.30)', textTransform: 'uppercase', marginTop: 20, marginBottom: 10 }}>Method</Text>
                      {data.method.map((step, i) => (
                        <View key={i} style={{ flexDirection: 'row', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)' }}>
                          <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(168,232,204,0.35)', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 11, color: '#1A7A45' }}>{i + 1}</Text>
                          </View>
                          <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 15, color: '#0A0A0A', flex: 1, lineHeight: 22 }}>{step}</Text>
                        </View>
                      ))}
                    </>
                  ) : (
                    <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                      <Text style={{ fontSize: 40, marginBottom: 12 }}>📝</Text>
                      <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 16, color: '#0A0A0A', marginBottom: 6 }}>No recipe saved</Text>
                      <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 14, color: 'rgba(0,0,0,0.45)', textAlign: 'center', lineHeight: 21 }}>{"Edit this meal to add ingredients and method."}</Text>
                    </View>
                  )}
                </>
              );
            })()}
          </ScrollView>
        </SafeAreaView>
      </Modal>
      {assignState && (
        <AssignCookModal visible={!!assignState} dayLbl={assignState.label} mealName={assignState.meal.meal_name}
          onClose={() => setAssignState(null)} onSave={handleAssignSave} />
      )}

    </View>
  );
}


// ── Recipe Detail Modal ────────────────────────────────────────────────────────
function RecipeDetailModal({ visible, recipe, onClose, onPlan, isFav, onToggleFav }: {
  visible: boolean;
  recipe: SpoonRecipe | null;
  onClose: () => void;
  onPlan: () => void;
  isFav?: boolean;
  onToggleFav?: () => void;
}) {
  if (!recipe) return null;
  // Dummy ingredient data keyed by Spoonacular ID
  const RECIPE_DATA: Record<number, { ingredients: string[]; method: string[] }> = {
    654959: {
      ingredients: ['400g spaghetti','200g pancetta or bacon','4 large eggs','100g pecorino romano, grated','2 cloves garlic','Black pepper','Salt'],
      method: ['Cook spaghetti in salted water until al dente.','Fry pancetta with garlic until crispy.','Whisk eggs with pecorino and black pepper.','Drain pasta (keep ½ cup pasta water).','Remove pan from heat. Add pasta, toss with pancetta.','Pour egg mixture over, toss quickly adding pasta water to loosen.','Serve immediately with extra cheese.'],
    },
    715538: {
      ingredients: ['800g chicken thighs','3 tbsp soy sauce','2 tbsp honey','2 cloves garlic, minced','1 tbsp sesame oil','1 tsp ginger','Spring onions to serve'],
      method: ['Mix soy, honey, garlic, sesame oil and ginger into marinade.','Score chicken thighs and coat in marinade for 15 min.','Heat pan over medium-high. Cook chicken 6–7 min each side.','Rest 3 min before slicing.','Serve with rice and spring onions.'],
    },
    644387: {
      ingredients: ['2 tins crushed tomatoes','1 tin cannellini beans','2 carrots, diced','2 stalks celery','1 onion','3 cloves garlic','1 cup small pasta','Parmesan rind','Olive oil, salt, pepper'],
      method: ['Sauté onion, carrot, celery in olive oil 8 min.','Add garlic, cook 1 min.','Add tomatoes, beans, parmesan rind and 1L water.','Simmer 20 min. Add pasta, cook until tender.','Season and serve with grated parmesan.'],
    },
    716406: {
      ingredients: ['4 salmon fillets','2 lemons, sliced','3 cloves garlic','2 tbsp olive oil','Fresh herbs (dill, parsley)','Salt and pepper'],
      method: ['Preheat oven to 200°C.','Place salmon on baking tray lined with lemon slices.','Drizzle with olive oil, garlic and herbs.','Season well.','Bake 15–18 min until cooked through.'],
    },
    665613: {
      ingredients: ['600g chicken breast, sliced','2 cups bok choy','1 capsicum','3 tbsp soy sauce','2 tbsp oyster sauce','1 tbsp sesame oil','2 cloves garlic','Ginger','Rice to serve'],
      method: ['Heat wok over high heat with oil.','Cook chicken in batches until golden. Set aside.','Stir-fry garlic and ginger 30 sec.','Add vegetables, toss 2 min.','Return chicken, add sauces. Toss well.','Serve over rice with sesame oil.'],
    },
    632660: {
      ingredients: ['500g beef mince','1 packet taco shells','1 tsp cumin, paprika, garlic powder','1 onion','Toppings: cheese, sour cream, lettuce, tomato, avocado'],
      method: ['Brown mince with onion in pan.','Add spices and 2 tbsp water. Cook 2 min.','Warm taco shells per packet.','Fill with beef and toppings of choice.'],
    },
    715769: {
      ingredients: ['1 cucumber, diced','200g cherry tomatoes','1 tin olives','200g feta','½ red onion','Olive oil','Lemon juice','Dried oregano'],
      method: ['Combine cucumber, tomatoes, olives and red onion in bowl.','Crumble feta over the top.','Dress with olive oil, lemon juice and oregano.','Season and serve.'],
    },
    664147: {
      ingredients: ['800g chicken thighs','400g butter chicken sauce (jar)','1 onion','3 cloves garlic','1 tsp ginger','1 tin crushed tomatoes','200ml cream','Fresh coriander, rice to serve'],
      method: ['Brown chicken with onion, garlic and ginger.','Add tomatoes and sauce. Simmer 20 min.','Stir in cream. Simmer 5 min.','Serve with basmati rice and coriander.'],
    },
  };
  const data = RECIPE_DATA[recipe.id];
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top']}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.07)' }}>
          <TouchableOpacity onPress={onClose}><Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: 'rgba(0,0,0,0.50)' }}>← Back</Text></TouchableOpacity>
          <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 16, color: '#0A0A0A' }} numberOfLines={1}>{recipe.title}</Text>
          <View style={{ width: 60 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
          {/* Hero */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 18 }}>
            <View style={{ width: 72, height: 72, borderRadius: 20, backgroundColor: 'rgba(250,200,168,0.32)', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 36 }}>{getMealEmoji(recipe.title)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: 'DMSerifDisplay_400Regular', fontSize: 22, color: '#0A0A0A', lineHeight: 26, marginBottom: 6 }}>{recipe.title}</Text>
              <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                <View style={{ backgroundColor: 'rgba(240,220,128,0.45)', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 3 }}>
                  <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 11, color: '#806000' }}>⏱ {recipe.readyInMinutes} min</Text>
                </View>
                <View style={{ backgroundColor: 'rgba(168,216,240,0.42)', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 3 }}>
                  <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 11, color: '#0060A0' }}>Serves {recipe.servings}</Text>
                </View>
                {recipe.glutenFree && <View style={{ backgroundColor: 'rgba(168,232,204,0.42)', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 3 }}><Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 11, color: '#1A7A45' }}>GF</Text></View>}
              </View>
            </View>
          </View>
          {/* Ingredients */}
          <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 13, letterSpacing: 1, color: 'rgba(0,0,0,0.30)', textTransform: 'uppercase', marginBottom: 10 }}>Ingredients</Text>
          {(data?.ingredients || ['See full recipe online']).map((ing, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)' }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#A8E8CC', flexShrink: 0 }} />
              <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 15, color: '#0A0A0A', flex: 1 }}>{ing}</Text>
            </View>
          ))}
          {/* Method */}
          <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 13, letterSpacing: 1, color: 'rgba(0,0,0,0.30)', textTransform: 'uppercase', marginTop: 20, marginBottom: 10 }}>Method</Text>
          {(data?.method || ['See full recipe online']).map((step, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)' }}>
              <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(168,232,204,0.35)', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 11, color: '#1A7A45' }}>{i + 1}</Text>
              </View>
              <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 15, color: '#0A0A0A', flex: 1, lineHeight: 22 }}>{step}</Text>
            </View>
          ))}
          {/* Plan it */}
          <TouchableOpacity
            style={{ backgroundColor: '#A8E8CC', borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 24, borderWidth: 1.5, borderColor: 'rgba(168,232,204,0.70)' }}
            onPress={() => { onClose(); onPlan(); }} activeOpacity={0.85}>
            <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 15, color: '#1A7A45' }}>Plan it →</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ── RecipesTab ─────────────────────────────────────────────────────────────────
function RecipesTab({ onPlanAdded, openDayPicker, favouritedNames }: {
  onPlanAdded: () => void;
  openDayPicker: (ctx: any) => void;
  favouritedNames: Set<string>;
}) {
  const [query, setQuery]   = useState('');
  const [filter, setFilter] = useState('Pantry match');
  const [detailRecipe, setDetailRecipe] = useState<SpoonRecipe | null>(null);
  const FILTERS = ['Pantry match', 'Quick <30', 'Kids love', 'Gluten free', 'Dairy free'];

  const filtered = DUMMY_RECIPES.filter(r => {
    const mq = !query.trim() || r.title.toLowerCase().includes(query.toLowerCase());
    const mf = filter === 'Pantry match' ? true // would check pantry in real impl
      : filter === 'Quick <30' ? r.readyInMinutes < 30
      : filter === 'Kids love' ? [715538, 654959, 632660, 665613].includes(r.id)
      : filter === 'Gluten free' ? r.glutenFree
      : filter === 'Dairy free' ? r.dairyFree
      : true;
    return mq && mf;
  });

  // Simulate pantry match split
  const pantryMatch  = filtered.filter((_, i) => i < 3);
  const missingItems = filtered.filter((_, i) => i >= 3);

  const RecipeRow = ({ recipe }: { recipe: SpoonRecipe }) => (
    <TouchableOpacity style={s.recipeRow} onPress={() => setDetailRecipe(recipe)} activeOpacity={0.8}>
      <View style={s.recipeEmojiBox}>
        <Text style={{ fontSize: 22 }}>{getMealEmoji(recipe.title)}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={s.recipeName} numberOfLines={1}>{recipe.title}</Text>
        <Text style={s.recipeMeta}>{recipe.readyInMinutes} min · {recipe.servings} servings</Text>
        <View style={{ flexDirection: 'row', gap: 4, flexWrap: 'wrap', marginTop: 3 }}>
          {filter === 'Pantry match' && <View style={s.tagPantry}><Text style={s.tagPantryTxt}>Pantry ✓</Text></View>}
          {recipe.readyInMinutes < 25 && <View style={s.tagQuick}><Text style={s.tagQuickTxt}>Quick</Text></View>}
          {[715538, 654959, 632660, 665613].includes(recipe.id) && <View style={s.tagKids}><Text style={s.tagKidsTxt}>Kids love</Text></View>}
          {recipe.lowFodmap && <View style={s.tagLav}><Text style={s.tagLavTxt}>Low FODMAP</Text></View>}
        </View>
      </View>
      <TouchableOpacity style={s.planBtn}
        onPress={(e) => { e.stopPropagation?.(); openDayPicker({ name: recipe.title, source: 'library', prep_mins: recipe.readyInMinutes, onAdded: (_dk: string) => { onPlanAdded(); } }); }}
        activeOpacity={0.85}>
        <Text style={s.planBtnTxt}>Plan it</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
        <View style={{ padding: 14, paddingBottom: 8 }}>
          <View style={s.searchBar}>
            <IcoSearch />
            <TextInput style={s.searchInput} value={query} onChangeText={setQuery}
              placeholder="Search 5,000+ recipes…" placeholderTextColor={C.ink3}
              autoCorrect={false} clearButtonMode="while-editing" />
          </View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 14, gap: 6, paddingBottom: 8 }}>
          {FILTERS.map(f => (
            <TouchableOpacity key={f} style={[s.filterChip, filter === f && s.filterChipOn]} onPress={() => setFilter(f)} activeOpacity={0.8}>
              <Text style={[s.filterChipTxt, filter === f && s.filterChipTxtOn]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={s.sectionHdrRow}>
          <View style={[s.sectionDot, { backgroundColor: C.ai }]} />
          <Text style={s.sectionHdrTxt}>You have everything for these</Text>
        </View>
        {pantryMatch.map(r => <RecipeRow key={r.id} recipe={r} />)}

        {missingItems.length > 0 && (
          <>
            <View style={s.sectionHdrRow}>
              <View style={[s.sectionDot, { backgroundColor: C.bannerBg }]} />
              <Text style={s.sectionHdrTxt}>Missing 1–2 ingredients</Text>
            </View>
            {missingItems.map(r => <RecipeRow key={r.id} recipe={r} />)}
          </>
        )}
      </ScrollView>
      <RecipeDetailModal
        visible={!!detailRecipe} recipe={detailRecipe}
        onClose={() => setDetailRecipe(null)}
        onPlan={() => detailRecipe && openDayPicker({ name: detailRecipe.title, source: 'library', prep_mins: detailRecipe.readyInMinutes, onAdded: () => { onPlanAdded(); } })}
        isFav={detailRecipe ? favouritedNames.has(detailRecipe.title.toLowerCase()) : false}
        onToggleFav={async () => {
          if (!detailRecipe) return;
          const name = detailRecipe.title;
          const already = favouritedNames.has(name.toLowerCase());
          if (already) {
            const { data } = await supabase.from('recipes').select('id').eq('family_id', DUMMY_FAMILY_ID).ilike('name', name);
            if (data?.[0]) await supabase.from('recipes').delete().eq('id', data[0].id);
          } else {
            await supabase.from('recipes').insert({ family_id: DUMMY_FAMILY_ID, name, source_type: 'library', prep_mins: detailRecipe.readyInMinutes, tags: [] });
          }
          onPlanAdded(); // triggers favourites refresh in parent
        }}
      />
    </View>
  );
}

// ── FavouritesTab ──────────────────────────────────────────────────────────────
function FavouritesTab({ onPlanAdded, openDayPicker }: {
  onPlanAdded: () => void;
  openDayPicker: (ctx: any) => void;
}) {
  const router = useRouter();
  const [recipes, setRecipes]       = useState<SavedRecipe[]>([]);
  const [loading, setLoading]       = useState(true);
  const [saveVisible, setSaveVisible] = useState(false);
  const [selected, setSelected]     = useState<SavedRecipe | null>(null);
  const [filter, setFilter]         = useState('All');

  const fetchRecipes = useCallback(async () => {
    const { data } = await supabase.from('recipes').select('*').eq('family_id', DUMMY_FAMILY_ID).order('created_at', { ascending: false });
    setRecipes((data || []) as SavedRecipe[]);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { fetchRecipes(); }, [fetchRecipes]));

  const seenNames = new Set<string>();
  const dedupedRecipes = recipes.filter(r => {
    const k = r.name.toLowerCase();
    if (seenNames.has(k)) return false;
    seenNames.add(k); return true;
  });
  const dbNames = new Set(dedupedRecipes.map(r => r.name.toLowerCase()));
  const filteredDummies = DUMMY_FAVS.filter(d => !dbNames.has(d.name.toLowerCase()));
  let display = [...dedupedRecipes, ...filteredDummies];

  if (filter !== 'All') {
    display = display.filter(r => {
      if (filter === 'Kids love') return r.tags?.some(t => t.toLowerCase().includes('kids'));
      if (filter === 'Quick') return (r.prep_mins || 99) < 30 || r.tags?.some(t => t.toLowerCase().includes('quick'));
      if (filter === 'Comfort') return r.tags?.some(t => t.toLowerCase().includes('comfort'));
      return true;
    });
  }

  const FILTERS = ['All', 'Kids love', 'Quick', 'Comfort'];

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
        {/* Save CTA */}
        <TouchableOpacity style={s.saveCta} onPress={() => setSaveVisible(true)} activeOpacity={0.85}>
          <View style={s.saveCtaIcon}><Text style={{ fontSize: 24 }}>📸</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={s.saveCtaTitle}>Save a recipe</Text>
            <Text style={s.saveCtaSub}>Photo, URL or type it in</Text>
          </View>
          <View style={s.saveCtaBtn}><Text style={s.saveCtaBtnTxt}>+ Save</Text></View>
        </TouchableOpacity>

        {/* Filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 14, gap: 6, paddingBottom: 8 }}>
          {FILTERS.map(f => (
            <TouchableOpacity key={f} style={[s.filterChip, filter === f && s.filterChipOn]} onPress={() => setFilter(f)} activeOpacity={0.8}>
              <Text style={[s.filterChipTxt, filter === f && s.filterChipTxtOn]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {display.map(r => (
          <TouchableOpacity key={r.id} style={s.favRow} onPress={() => setSelected(r)} activeOpacity={0.8}>
            <View style={{ position: 'relative' }}>
              <View style={[s.favEmojiBox, { backgroundColor: C.accentL }]}>
                <Text style={{ fontSize: 22 }}>{getMealEmoji(r.name)}</Text>
              </View>
              <HeartBadge size={16} borderColor={C.bg} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.favName} numberOfLines={1}>{r.name}</Text>
              <View style={{ flexDirection: 'row', gap: 4, flexWrap: 'wrap', marginTop: 3 }}>
                {(r.tags || []).slice(0, 3).map(t => {
                  const isKids = t.toLowerCase().includes('kids');
                  const isQuick = t.toLowerCase().includes('quick');
                  const isComfort = t.toLowerCase().includes('comfort');
                  const bg = isKids ? C.skyL : isQuick ? C.goldL : isComfort ? C.lavL : C.aiL;
                  const color = isKids ? C.skyD : isQuick ? C.goldD : isComfort ? C.lavD : C.mintD;
                  return <View key={t} style={[s.favTag, { backgroundColor: bg }]}><Text style={[s.favTagTxt, { color }]}>{t}</Text></View>;
                })}
              </View>
            </View>
            <TouchableOpacity style={s.planBtn}
              onPress={(e) => { e.stopPropagation?.(); openDayPicker({ name: r.name, source: 'favourites', prep_mins: r.prep_mins, onAdded: () => onPlanAdded() }); }}
              activeOpacity={0.85}>
              <Text style={s.planBtnTxt}>Plan it</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <SaveRecipeModal visible={saveVisible} onClose={() => setSaveVisible(false)} onSaved={() => { setSaveVisible(false); fetchRecipes(); }} router={router} />
      <FavouriteDetailModal
        visible={!!selected} recipe={selected}
        onClose={() => { setSelected(null); fetchRecipes(); }}
        onSaved={fetchRecipes}
        onAdded={(dk, dl) => { setSelected(null); onPlanAdded(); }}
      />
    </View>
  );
}

// ── Main Screen ────────────────────────────────────────────────────────────────
export default function MealPlannerScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const [fontsLoaded] = useFonts({
    Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold,
    Poppins_700Bold, Poppins_800ExtraBold, DMSerifDisplay_400Regular,
  });

  const [activeTab, setActiveTab]   = useState<TabType>('dinners');
  const [navOpen, setNavOpen]       = useState(false);
  const [favouritedNames, setFavouritedNames] = useState<Set<string>>(new Set());

  // ── Shared chat state — persisted 24hr ───────────────────────────────────────
  const { messages, setMessages, clearMessages, loaded: chatLoaded } = useChatPersistence('meals');
  const [chatInput, setChatInput]   = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [thumbs, setThumbs]         = useState<Record<string, 'up' | 'down' | null>>({});
  const mainScrollRef = useRef<ScrollView>(null);
  const chatInputRef  = useRef<TextInput>(null);
  const [showScrollArrows, setShowScrollArrows] = useState(false);

  // ── Mic recording ────────────────────────────────────────────────────────────
  const [isRecording, setIsRecording]   = useState(false);
  const [micTimer, setMicTimer]         = useState(0);
  const micTimerRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const micOverlayAnim = useRef(new Animated.Value(0)).current;
  const recordingRef  = useRef<Audio.Recording | null>(null);

  // ── Shared day picker — never nested inside another modal ─────────────────────
  // ── Move modal — lifted to main screen to avoid nested modal crash on iOS ───
  const [moveState, setMoveState] = useState<MealPlan | null>(null);
  const [moveMeals, setMoveMeals] = useState<MealPlan[]>([]);
  const [dinnersRefreshKey, setDinnersRefreshKey] = useState(0);

  const [dayPickerCtx, setDayPickerCtx] = useState<{
    name: string; source: MealSource; ingredients?: any[]; notes?: string;
    image_url?: string; prep_mins?: number; onAdded: (dayKey: string, dayLabel: string) => void;
  } | null>(null);
  const [dayPickerSaving, setDayPickerSaving] = useState(false);

  const isMounted = useRef(true);
  useEffect(() => { isMounted.current = true; return () => { isMounted.current = false; }; }, []);

  const fetchFavourites = useCallback(async () => {
    const { data } = await supabase.from('recipes').select('name').eq('family_id', DUMMY_FAMILY_ID);
    if (isMounted.current) setFavouritedNames(new Set((data || []).map((r: any) => r.name.toLowerCase())));
  }, []);

  useFocusEffect(useCallback(() => { fetchFavourites(); }, [fetchFavourites]));

  if (!fontsLoaded) return null;

  // ── Parse chips ──────────────────────────────────────────────────────────────
  function parseChips(raw: string): { text: string; chips: string[] } {
    const match = raw.match(/\[chips:\s*([^\]]+)\]/i);
    if (!match) return { text: raw.trim(), chips: [] };
    const chips = match[1].split('|').map(s => s.trim()).filter(Boolean).slice(0, 4);
    const text = raw.replace(match[0], '').trim();
    return { text, chips };
  }

  // ── Send message — Claude Sonnet with tool-calling ────────────────────────────
  const sendMessage = async (overrideText?: string) => {
    const text = (overrideText ?? chatInput).trim();
    if (!text || chatLoading) return;
    setChatInput('');
    const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const replyId = uid();
    const ts = nowTs();
    setMessages(prev => [...prev,
      { id: uid(), role: 'user', text, ts },
      { id: replyId, role: 'zaeli', text: '', isLoading: true, ts },
    ]);
    setChatLoading(true);
    setTimeout(() => mainScrollRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const anthropicKey = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? '';

      // Build fresh context every call
      const days = get7Days();
      const keys = days.map(dayKey);
      const { data: mealData } = await supabase.from('meal_plans').select('day_key,meal_name,meal_type,prep_mins,source').eq('family_id', DUMMY_FAMILY_ID).in('day_key', keys).order('day_key');
      const { data: favData } = await supabase.from('recipes').select('name,tags').eq('family_id', DUMMY_FAMILY_ID);
      const { data: pantryData } = await supabase.from('pantry_items').select('name,stock').eq('family_id', DUMMY_FAMILY_ID).order('name');

      const mealCtx = (mealData || []).length > 0
        ? `This week's plan:\n${(mealData || []).map((m: any) => `${m.day_key}: ${m.meal_name}${m.prep_mins ? ' (' + m.prep_mins + ' min)' : ''}`).join('\n')}`
        : 'No meals planned this week yet.';
      const favCtx = (favData || []).length > 0
        ? `Favourites: ${(favData || []).map((r: any) => r.name).join(', ')}.`
        : 'No saved favourites yet.';
      const pantryCtx = (pantryData || []).length > 0
        ? `Pantry (key items): ${(pantryData || []).slice(0, 20).map((p: any) => `${p.name} (${p.stock})`).join(', ')}.`
        : 'No pantry items recorded.';

      const activeTabCtx = activeTab === 'dinners' ? 'User is on the Dinners tab.'
        : activeTab === 'recipes' ? 'User is on the Recipes tab.'
        : 'User is on the Favourites tab.';

      const systemPrompt = `You are Zaeli — warm, sharp AI heart of a family meal planning app. Full context below.

${activeTabCtx}
${mealCtx}
${favCtx}
${pantryCtx}
Today is ${new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })}.

TOOLS — use immediately when intent is clear, never say "I'll do that":
- plan_dinner: add or replace a dinner on a specific night (requires day_key as YYYY-MM-DD)
- remove_dinner: remove a planned dinner
- add_to_favourites: save a recipe to family favourites

PERSONALITY:
- Warm, specific, punchy — 1-2 sentences max
- Never start with "I". Never say "mate".
- Reference actual meal names and specific nights
- For pantry questions: answer from the data above

CHIPS: End every reply with [chips: chip1 | chip2 | chip3] — 2-3 short action suggestions (3-6 words). Examples: [chips: Plan Friday dinner | Suggest quick meals | Plan the whole week]`;

      const histMsgs = messages.slice(-6).map(m => ({
        role: m.role === 'zaeli' ? 'assistant' as const : 'user' as const,
        content: m.text || '(message)',
      }));
      const apiMessages = [
        ...histMsgs.filter(m => m.content !== '(message)'),
        { role: 'user' as const, content: text },
      ];

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514', max_tokens: 1024,
          system: systemPrompt, tools: MEAL_TOOLS, messages: apiMessages,
        }),
      });
      const data = await res.json();

      if (data.stop_reason === 'tool_use') {
        const toolUses = data.content.filter((b: any) => b.type === 'tool_use');
        const toolResults: string[] = [];
        for (const tu of toolUses) {
          const result = await executeMealTool(tu.name, tu.input, fetchFavourites);
          toolResults.push(result);
        }
        const toolResultContent = toolUses.map((tu: any, i: number) => ({
          type: 'tool_result', tool_use_id: tu.id, content: toolResults[i],
        }));
        const followUp = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01' },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514', max_tokens: 300,
            system: systemPrompt, tools: MEAL_TOOLS,
            messages: [...apiMessages, { role: 'assistant', content: data.content }, { role: 'user', content: toolResultContent }],
          }),
        });
        const followData = await followUp.json();
        const rawFollow = followData.content?.find((b: any) => b.type === 'text')?.text ?? toolResults.join(' ');
        const { text: followText, chips: followChips } = parseChips(rawFollow);
        setMessages(prev => prev.map(m => m.id === replyId ? { ...m, text: followText, isLoading: false, quickReplies: followChips } : m));
        try {
          const it = (data.usage?.input_tokens ?? 0) + (followData.usage?.input_tokens ?? 0);
          const ot = (data.usage?.output_tokens ?? 0) + (followData.usage?.output_tokens ?? 0);
          const cost = (it / 1_000_000) * 3.0 + (ot / 1_000_000) * 15.0;
          await supabase.from('api_logs').insert({ family_id: DUMMY_FAMILY_ID, feature: 'meals_chat', model: 'claude-sonnet-4-20250514', input_tokens: it, output_tokens: ot, cost_usd: cost });
        } catch {}
      } else {
        const rawReply = data.content?.find((b: any) => b.type === 'text')?.text ?? 'Something went wrong — try again?';
        const { text: reply, chips: replyChips } = parseChips(rawReply);
        setMessages(prev => prev.map(m => m.id === replyId ? { ...m, text: reply, isLoading: false, quickReplies: replyChips } : m));
        try {
          const it = data.usage?.input_tokens ?? 0;
          const ot = data.usage?.output_tokens ?? 0;
          const cost = (it / 1_000_000) * 3.0 + (ot / 1_000_000) * 15.0;
          await supabase.from('api_logs').insert({ family_id: DUMMY_FAMILY_ID, feature: 'meals_chat', model: 'claude-sonnet-4-20250514', input_tokens: it, output_tokens: ot, cost_usd: cost });
        } catch {}
      }
    } catch (e) {
      console.error('meals sendMessage:', e);
      setMessages(prev => prev.map(m => m.id === replyId ? { ...m, text: 'Something went wrong — try again?', isLoading: false } : m));
    } finally {
      setChatLoading(false);
      setTimeout(() => mainScrollRef.current?.scrollToEnd({ animated: true }), 150);
    }
  };

  // ── Mic recording ─────────────────────────────────────────────────────────────
  async function startRecording() {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) return;
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      recordingRef.current = recording;
      setIsRecording(true); setMicTimer(0);
      Animated.timing(micOverlayAnim, { toValue: 1, duration: 220, useNativeDriver: true }).start();
      micTimerRef.current = setInterval(() => setMicTimer(t => t + 1), 1000);
    } catch (e) { console.error('startRecording:', e); }
  }

  async function stopRecording(cancel = false) {
    try {
      setIsRecording(false);
      if (micTimerRef.current) { clearInterval(micTimerRef.current); micTimerRef.current = null; }
      Animated.timing(micOverlayAnim, { toValue: 0, duration: 180, useNativeDriver: true }).start();
      if (!recordingRef.current) return;
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      if (!uri || cancel) return;
      const key = process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? '';
      if (!key) return;
      const form = new FormData();
      form.append('file', { uri, type: 'audio/m4a', name: 'audio.m4a' } as any);
      form.append('model', 'whisper-1');
      const resp = await fetch('https://api.openai.com/v1/audio/transcriptions', { method: 'POST', headers: { Authorization: `Bearer ${key}` }, body: form });
      const d = await resp.json();
      const transcript = d?.text?.trim() ?? '';
      if (transcript) sendMessage(transcript);
    } catch (e) { console.error('stopRecording:', e); }
  }

  function handleScroll(e: any) {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const dist = contentSize.height - contentOffset.y - layoutMeasurement.height;
    setShowScrollArrows(dist > 50);
  }

  const saveToPlan = async (dk: string) => {
    if (!dayPickerCtx) return;
    setDayPickerSaving(true);
    try {
      await supabase.from('meal_plans').insert({
        family_id: DUMMY_FAMILY_ID, day_key: dk, planned_date: dk,
        meal_name: dayPickerCtx.name, meal_type: 'dinner', source: dayPickerCtx.source,
        image_url: dayPickerCtx.image_url || null, prep_mins: dayPickerCtx.prep_mins || null,
        notes: dayPickerCtx.notes || null, ingredients: dayPickerCtx.ingredients || null,
      });
      const dl = dayLabel(get7Days().find(d => dayKey(d) === dk) || new Date());
      dayPickerCtx.onAdded(dk, dl);
      setDayPickerCtx(null);
    } catch (e: any) {
      Alert.alert('Could not save', e?.message || 'Please try again');
    } finally {
      setDayPickerSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bannerBg }}>
      <StatusBar style="dark" />

      {/* ── Banner — matches Shopping exactly ── */}
      <SafeAreaView edges={['top']} style={{ backgroundColor: C.bannerBg }}>
        <View style={s.hero}>
          <View style={s.heroRow}>
            <TouchableOpacity style={s.logoWrap} onPress={() => router.navigate('/(tabs)/')} activeOpacity={0.75}>
              <Text style={s.logoWord}>
                {'z'}<Text style={{ color: C.ai }}>{'a'}</Text>{'el'}<Text style={{ color: C.ai }}>{'i'}</Text>
              </Text>
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, zIndex: 1 }}>
              <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: 'rgba(0,0,0,0.45)' }}>Meals</Text>
              <HamburgerButton onPress={() => setNavOpen(true)} />
            </View>
          </View>
          {/* Sub-tabs inside banner — matches Shopping */}
          <View style={s.subTabs}>
            {(['dinners', 'recipes', 'favourites'] as TabType[]).map(tab => (
              <TouchableOpacity key={tab} style={[s.subTab, activeTab === tab && s.subTabOn]}
                onPress={() => setActiveTab(tab)} activeOpacity={0.8}>
                <Text style={[s.subTabTxt, activeTab === tab && s.subTabTxtOn]}>
                  {tab === 'dinners' ? 'Dinners' : tab === 'recipes' ? 'Recipes' : 'Favourites'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </SafeAreaView>

      {/* ── Banner divider ── */}
      <View style={{ height: 1, backgroundColor: 'rgba(0,0,0,0.08)' }} />

      {/* ── Body — single KAV wrapping all tabs + shared chat ── */}
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>
        <View style={{ flex: 1, position: 'relative' }}>

          {/* ── Single scroll — tab content + shared chat thread ── */}
          <ScrollView
            ref={mainScrollRef}
            contentContainerStyle={{ paddingBottom: 120 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            onScroll={handleScroll}
            scrollEventThrottle={16}
          >
            {/* Tab content */}
            {activeTab === 'dinners' && (
              <DinnersTab
                key={dinnersRefreshKey}
                onTabChange={setActiveTab}
                favouritedNames={favouritedNames}
                onRefresh={fetchFavourites}
                onRequestMove={async (meal, mealSnapshot) => {
                  // Use the snapshot passed in for instant display, then fetch fresh for accuracy
                  setMoveMeals(mealSnapshot);
                  setMoveState(meal);
                  // Also fetch fresh in background to catch any recent changes
                  const days = get7Days(); const keys = days.map(dayKey);
                  const { data } = await supabase.from('meal_plans').select('*').eq('family_id', DUMMY_FAMILY_ID).in('day_key', keys);
                  if (data) setMoveMeals(data as MealPlan[]);
                }}
              />
            )}
            {activeTab === 'recipes' && (
              <RecipesTab onPlanAdded={() => { setActiveTab('dinners'); fetchFavourites(); }} openDayPicker={setDayPickerCtx} favouritedNames={favouritedNames} />
            )}
            {activeTab === 'favourites' && (
              <FavouritesTab onPlanAdded={() => setActiveTab('dinners')} openDayPicker={setDayPickerCtx} />
            )}

            {/* ── Shared chat thread — Calendar-style, all tabs ── */}
            {messages.length > 0 && (
              <View style={{ marginTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.06)', paddingTop: 4 }}>
                {messages.map((msg, i) => {
                  if (msg.role === 'user') {
                    return (
                      <View key={msg.id} style={s.userMsgWrap}>
                        <View style={s.userBubble}>
                          <Text style={s.userMsgText}>{msg.text}</Text>
                        </View>
                        <View style={s.userIconRow}>
                          <Text style={s.msgTime}>{msg.ts || ''}</Text>
                          <TouchableOpacity style={s.iconBtn} activeOpacity={0.6}><IcoCopy /></TouchableOpacity>
                          <TouchableOpacity style={s.iconBtn} activeOpacity={0.6}><IcoForward /></TouchableOpacity>
                        </View>
                      </View>
                    );
                  }
                  const prevMsg = i > 0 ? messages[i - 1] : null;
                  const showEyebrow = !prevMsg || prevMsg.role === 'user';
                  const thumbState = thumbs[msg.id] || null;
                  const paragraphs = msg.text
                    ? msg.text.split(/(?<=[.!?])\s+/).map((p: string) => p.trim()).filter(Boolean)
                    : [];
                  return (
                    <View key={msg.id} style={[s.zaeliMsgWrap, !showEyebrow && { marginTop: 6 }]}>
                      {showEyebrow ? (
                        <View style={s.eyebrow}>
                          <View style={[s.starBadge, { backgroundColor: C.ai }]}>
                            <Svg width="9" height="9" viewBox="0 0 16 16" fill="white"><Path d="M8 1L9.5 6.5L15 8L9.5 9.5L8 15L6.5 9.5L1 8L6.5 6.5L8 1Z" /></Svg>
                          </View>
                          <Text style={[s.zaeliName, { color: C.ai }]}>Zaeli</Text>
                          <Text style={s.zaeliTs}>{msg.ts || ''}</Text>
                        </View>
                      ) : (
                        <Text style={s.zaeliTsOnly}>{msg.ts || ''}</Text>
                      )}
                      {msg.isLoading ? (
                        <TypingDots />
                      ) : (
                        <View>
                          {paragraphs.map((para: string, pi: number) => (
                            <Text key={pi} style={[s.zaeliMsgText, pi < paragraphs.length - 1 && { marginBottom: 10 }]}>{para}</Text>
                          ))}
                        </View>
                      )}
                      {(msg.quickReplies || []).length > 0 && !msg.isLoading && (
                        <View style={s.chipsRow}>
                          {(msg.quickReplies || []).map((chip: string, ci: number) => (
                            <TouchableOpacity key={ci} style={s.chip} onPress={() => sendMessage(chip)} activeOpacity={0.7}>
                              <Text style={s.chipTxt}>{chip}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                      {!msg.isLoading && (
                        <View style={s.zaeliIconRow}>
                          <TouchableOpacity style={s.iconBtn} activeOpacity={0.6}><IcoCopy /></TouchableOpacity>
                          <TouchableOpacity style={s.iconBtn} activeOpacity={0.6}><IcoForward /></TouchableOpacity>
                          <TouchableOpacity style={s.iconBtn} onPress={() => setThumbs(prev => ({ ...prev, [msg.id]: 'up' }))} activeOpacity={0.6}><IcoThumbUp active={thumbState === 'up'} /></TouchableOpacity>
                          <TouchableOpacity style={s.iconBtn} onPress={() => setThumbs(prev => ({ ...prev, [msg.id]: 'down' }))} activeOpacity={0.6}><IcoThumbDown active={thumbState === 'down'} /></TouchableOpacity>
                        </View>
                      )}
                    </View>
                  );
                })}
                <View style={{ height: 16 }} />
              </View>
            )}
          </ScrollView>

          {/* ── Up/down scroll arrows — side-by-side bottom-right ── */}
          {showScrollArrows && (
            <View style={s.scrollArrowPair} pointerEvents="box-none">
              <TouchableOpacity style={s.scrollArrowBtn}
                onPress={() => mainScrollRef.current?.scrollTo({ y: 0, animated: true })} activeOpacity={0.8}>
                <IcoArrowUp />
              </TouchableOpacity>
              <TouchableOpacity style={s.scrollArrowBtn}
                onPress={() => mainScrollRef.current?.scrollToEnd({ animated: true })} activeOpacity={0.8}>
                <IcoArrowDown />
              </TouchableOpacity>
            </View>
          )}

          {/* ── CANONICAL CHAT BAR ── */}
          {/* inputArea: absolute bottom:0, paddingBottom iOS:30 paddingH:14 */}
          {/* KAV: behavior=padding backgroundColor='#fff' */}
          <View style={s.inputArea}>
            <View style={s.barPill}>
              {/* barBtn 34×34 — IcoPlus */}
              <TouchableOpacity style={s.barBtn} onPress={() => setActiveTab('dinners')} activeOpacity={0.75}>
                <IcoPlus color="rgba(0,0,0,0.4)" />
              </TouchableOpacity>
              {/* barSep 1×18px */}
              <View style={s.barSep} />
              {/* TextInput fontSize:15 Poppins_400Regular maxHeight:100 multiline */}
              <TextInput
                ref={chatInputRef}
                style={s.barInput}
                value={chatInput}
                onChangeText={setChatInput}
                placeholder={activeTab === 'recipes' ? "Ask Zaeli about recipes…" : activeTab === 'favourites' ? "Ask Zaeli about favourites…" : "Ask Zaeli about meals…"}
                placeholderTextColor="rgba(0,0,0,0.32)"
                multiline
                returnKeyType="default"
                keyboardAppearance="light"
                onFocus={() => setTimeout(() => mainScrollRef.current?.scrollToEnd({ animated: true }), 350)}
              />
              {/* barMicBtn 32×32 blush #F5C8C8 size 26, OR barWaveBtn when recording */}
              {isRecording ? (
                <TouchableOpacity style={[s.barWaveBtn, { backgroundColor: C.ai }]} onPress={() => stopRecording(false)} activeOpacity={0.85}>
                  <WaveformBars />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={s.barMicBtn} onPress={startRecording} activeOpacity={0.75}>
                  <IcoMic color="#F5C8C8" size={26} />
                </TouchableOpacity>
              )}
              {/* barSend 32×32 borderRadius:16 bg:#FF4545 CORAL ALWAYS */}
              <TouchableOpacity
                style={[s.barSend, (!chatInput.trim() || chatLoading) && { opacity: 0.4 }]}
                onPress={() => sendMessage()}
                disabled={!chatInput.trim() || chatLoading}
                activeOpacity={0.85}>
                <IcoSend />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* ── Mic overlay — root level ── */}
      {isRecording && (
        <Animated.View style={[s.micOverlay, { opacity: micOverlayAnim }]}>
          <View style={s.micCard}>
            <MicWaveform />
            <Text style={s.micTimer}>{`${Math.floor(micTimer / 60)}:${String(micTimer % 60).padStart(2, '0')}`}</Text>
            <Text style={s.micLabel}>Listening…</Text>
            <TouchableOpacity style={s.micStopBtn} onPress={() => stopRecording(false)} activeOpacity={0.85}>
              <View style={s.micStopSquare} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => stopRecording(true)} activeOpacity={0.7}>
              <Text style={s.micCancel}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      {/* ── Shared day picker ── */}
      <Modal visible={!!dayPickerCtx} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setDayPickerCtx(null)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top']}>
          <View style={s.modalHdr}>
            <TouchableOpacity onPress={() => setDayPickerCtx(null)}><Text style={s.modalCancel}>Cancel</Text></TouchableOpacity>
            <Text style={s.modalTitle}>Which night?</Text>
            <View style={{ width: 60 }} />
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 8 }}>
            <Text style={[s.modalSub, { marginBottom: 4 }]}>
              Adding: <Text style={{ fontFamily: 'Poppins_700Bold', color: C.ink }}>{dayPickerCtx?.name}</Text>
            </Text>
            {get7Days().map(d => {
              const dk = dayKey(d);
              const tonight = isToday(d);
              return (
                <TouchableOpacity key={dk} disabled={dayPickerSaving}
                  style={{ borderRadius: 14, borderWidth: 1.5, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderColor: tonight ? C.accent : C.border, backgroundColor: tonight ? C.accentL : '#fff', opacity: dayPickerSaving ? 0.5 : 1 }}
                  activeOpacity={0.8} onPress={() => saveToPlan(dk)}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 14, color: tonight ? C.accent : C.ink }}>{dayLabel(d)}</Text>
                    <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 11, color: C.ink3, marginTop: 2 }}>{fmtDay(d)}</Text>
                  </View>
                  <Text style={{ fontSize: 18, color: tonight ? C.accent : C.ink3 }}>→</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </SafeAreaView>
      </Modal>


      {/* ── Move night modal — at root level, no nested modal crash ── */}
      <Modal visible={moveState !== null} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setMoveState(null)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top']}>
          <View style={s.modalHdr}>
            <TouchableOpacity onPress={() => setMoveState(null)}><Text style={s.modalCancel}>Cancel</Text></TouchableOpacity>
            <Text style={s.modalTitle}>Move to another night</Text>
            <View style={{ width: 60 }} />
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 8 }}>
            <Text style={[s.modalSub, { marginBottom: 8 }]}>Moving: <Text style={{ fontFamily: 'Poppins_700Bold', color: C.ink }}>{moveState?.meal_name}</Text></Text>
            {get7Days().map(d => {
              const dk = dayKey(d);
              const dl = dayLabel(d);
              const existing = moveMeals.find((m: MealPlan) => m.day_key === dk && m.id !== moveState?.id);
              const isCurrent = dk === moveState?.day_key;
              return (
                <TouchableOpacity key={dk}
                  style={{ borderRadius: 14, borderWidth: 1.5, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderColor: isCurrent ? C.ink3 : existing ? C.orangeB : C.greenB, backgroundColor: isCurrent ? 'rgba(0,0,0,0.04)' : existing ? C.orangeL : C.greenL, opacity: isCurrent ? 0.4 : 1 }}
                  disabled={isCurrent} activeOpacity={0.8}
                  onPress={async () => {
                    if (!moveState) return;
                    const doMove = async () => {
                      await supabase.from('meal_plans').update({ day_key: dk, planned_date: dk }).eq('id', moveState.id);
                      setMoveState(null);
                      setDinnersRefreshKey(k => k + 1);
                    };
                    if (existing) {
                      Alert.alert(`${dl} already has ${existing.meal_name}`, 'Replace it?', [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Replace & move', style: 'destructive', onPress: async () => {
                          await supabase.from('meal_plans').delete().eq('id', existing.id);
                          await doMove();
                        }},
                      ]);
                    } else { await doMove(); }
                  }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 13, color: C.ink }}>{dl}</Text>
                    {existing && <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 11, color: C.orange, marginTop: 2 }}>{existing.meal_name} — will be replaced</Text>}
                    {!existing && !isCurrent && <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 11, color: C.green, marginTop: 2 }}>Free — move here</Text>}
                    {isCurrent && <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 11, color: C.ink3, marginTop: 2 }}>Current night</Text>}
                  </View>
                  {!isCurrent && <Text style={{ fontSize: 18 }}>{existing ? '⚠️' : '→'}</Text>}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <NavMenu visible={navOpen} onClose={() => setNavOpen(false)} />
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  // ── Banner ──────────────────────────────────────────────────────────────────
  hero:        { paddingHorizontal: 22, paddingBottom: 16 },
  heroRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4, marginBottom: 14 },
  logoWrap:    { flexDirection: 'row', alignItems: 'center', gap: 8, zIndex: 1 },
  logoWord:    { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 40, color: '#0A0A0A', letterSpacing: -1.5, lineHeight: 44 },
  // Sub-tabs inside banner — exact Shopping values
  subTabs:     { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.08)', borderRadius: 22, padding: 3, gap: 2 },
  subTab:      { flex: 1, paddingVertical: 8, borderRadius: 19, alignItems: 'center' },
  subTabOn:    { backgroundColor: '#fff' },
  subTabTxt:   { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: 'rgba(0,0,0,0.40)' },
  subTabTxtOn: { color: '#0A0A0A' },

  // ── Tonight hero — full green ────────────────────────────────────────────────
  tonightHero:          { backgroundColor: '#A8E8CC', paddingHorizontal: 18, paddingTop: 18, paddingBottom: 20 },
  tonightEyebrow:       { fontFamily: 'Poppins_700Bold', fontSize: 9, letterSpacing: 1.6, color: 'rgba(0,80,40,0.65)', textTransform: 'uppercase', marginBottom: 3 },
  tonightDateLine:      { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 22, color: '#0A0A0A', marginBottom: 16 },
  tonightMealRow:       { flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginBottom: 14 },
  tonightEmojiBox:      { width: 76, height: 76, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.40)', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  tonightHeartBadge:    { position: 'absolute', bottom: -5, right: -5, width: 22, height: 22, borderRadius: 7, backgroundColor: '#FF7B6B', alignItems: 'center', justifyContent: 'center', borderWidth: 2.5, borderColor: '#A8E8CC' },
  tonightMealName:      { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 28, color: '#0A0A0A', lineHeight: 30, letterSpacing: -0.5, marginBottom: 8 },
  tonightBadgeRow:      { flexDirection: 'row', gap: 6, marginBottom: 8, flexWrap: 'wrap' },
  tonightBadge:         { backgroundColor: 'rgba(0,0,0,0.10)', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 3 },
  tonightBadgeTxt:      { fontFamily: 'Poppins_700Bold', fontSize: 12, color: 'rgba(0,0,0,0.65)' },
  tonightBadgeGreen:    { backgroundColor: 'rgba(255,255,255,0.50)', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 3 },
  tonightBadgeGreenTxt: { fontFamily: 'Poppins_700Bold', fontSize: 12, color: '#1A7A45' },
  tonightCookRow:       { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tonightCookLabel:     { fontFamily: 'Poppins_500Medium', fontSize: 13, color: 'rgba(0,0,0,0.50)' },
  tonightAssignNudge:   { fontFamily: 'Poppins_600SemiBold', fontSize: 11, color: '#C84010' },
  tonightActions:       { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  tonightBtnPrimary:    { backgroundColor: '#C84010', borderRadius: 12, paddingVertical: 11, paddingHorizontal: 18 },
  tonightBtnPrimaryTxt: { fontFamily: 'Poppins_700Bold', fontSize: 13, color: '#fff' },
  tonightBtnGhost:      { backgroundColor: 'rgba(0,0,0,0.07)', borderRadius: 12, paddingVertical: 11, paddingHorizontal: 13, borderWidth: 1, borderColor: 'rgba(0,0,0,0.10)' },
  tonightBtnGhostTxt:   { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: 'rgba(0,0,0,0.55)' },
  tonightEmptyTitle:    { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 22, color: '#0A0A0A', marginBottom: 12 },
  tonightSuggestCard:   { backgroundColor: 'rgba(255,255,255,0.55)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.40)', padding: 14, marginBottom: 14 },
  tonightSuggestMeal:   { fontFamily: 'Poppins_700Bold', fontSize: 15, color: '#0A0A0A', marginBottom: 2 },
  tonightSuggestMeta:   { fontFamily: 'Poppins_400Regular', fontSize: 12, color: 'rgba(0,0,0,0.50)' },
  tonightEmptyChips:    { flexDirection: 'row', gap: 7, flexWrap: 'wrap' },
  tonightEmptyChip:     { backgroundColor: 'rgba(255,255,255,0.55)', borderWidth: 1.5, borderColor: 'rgba(200,64,16,0.25)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  tonightEmptyChipTxt:  { fontFamily: 'Poppins_600SemiBold', fontSize: 12, color: '#C84010' },
  // kept for modals
  btnPrimary:    { backgroundColor: '#C84010', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14 },
  btnPrimaryTxt: { fontFamily: 'Poppins_700Bold', fontSize: 11, color: '#fff' },
  btnGhost:      { backgroundColor: 'rgba(0,0,0,0.055)', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12 },
  btnGhostTxt:   { fontFamily: 'Poppins_600SemiBold', fontSize: 11, color: 'rgba(0,0,0,0.46)' },

  // ── Week rows ─────────────────────────────────────────────────────────────────
  weekSection:      { paddingHorizontal: 14, paddingTop: 14, paddingBottom: 4 },
  dayBlock:         { marginBottom: 14 },
  dayLabel:         { fontFamily: 'Poppins_400Regular', fontSize: 12, color: 'rgba(0,0,0,0.38)', marginBottom: 6, paddingLeft: 2 },
  dayLabelTonight:  { fontFamily: 'Poppins_700Bold', fontSize: 13, color: '#C84010' },
  weekHeader:       { fontFamily: 'Poppins_700Bold', fontSize: 10, letterSpacing: 1.2, color: 'rgba(0,0,0,0.30)', textTransform: 'uppercase', marginBottom: 10 },
  weekRow:          { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 14, backgroundColor: '#fff', borderRadius: 16, marginBottom: 8, borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.07)' },
  weekRowPlanned:   { backgroundColor: 'rgba(168,232,204,0.18)', borderColor: 'rgba(168,232,204,0.50)' },
  weekRowUnplanned: { backgroundColor: 'rgba(200,64,16,0.035)', borderColor: 'rgba(200,64,16,0.17)', borderStyle: 'dashed' as const },
  weekEmojiWrap:    { width: 50, height: 50, borderRadius: 14, backgroundColor: 'rgba(250,200,168,0.30)', alignItems: 'center', justifyContent: 'center', flexShrink: 0, position: 'relative' },
  weekEmojiPlanned: { backgroundColor: 'rgba(168,232,204,0.35)' },
  weekDay:          { fontFamily: 'Poppins_700Bold', fontSize: 14, color: '#0A0A0A' },
  weekDayDate:      { fontFamily: 'Poppins_400Regular', fontSize: 11, color: 'rgba(0,0,0,0.28)' },
  weekMeal:         { fontFamily: 'Poppins_700Bold', fontSize: 16, color: '#0A0A0A' },
  weekMealEmpty:    { color: 'rgba(0,0,0,0.26)', fontFamily: 'Poppins_400Regular', fontStyle: 'italic' as const },
  weekAssignNudge:  { fontFamily: 'Poppins_600SemiBold', fontSize: 10, color: '#C84010', marginTop: 2 },
  weekBadgeWrap:    { flexShrink: 0 },
  weekBadge:        { borderRadius: 9, paddingHorizontal: 9, paddingVertical: 4 },
  weekBadgeTxt:     { fontFamily: 'Poppins_700Bold', fontSize: 11 },
  weekAdd:          { fontFamily: 'Poppins_700Bold', fontSize: 12, color: '#C84010', backgroundColor: 'rgba(200,64,16,0.09)', borderRadius: 9, paddingHorizontal: 11, paddingVertical: 6, flexShrink: 0 },

  // ── Recipes tab ───────────────────────────────────────────────────────────────
  searchBar:     { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.10)', borderRadius: 24, paddingHorizontal: 14, paddingVertical: 9 },
  searchInput:   { flex: 1, fontFamily: 'Poppins_400Regular', fontSize: 14, color: '#0A0A0A', padding: 0 },
  filterChip:    { borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.10)', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 9, backgroundColor: '#fff' },
  filterChipOn:  { backgroundColor: 'rgba(200,64,16,0.10)', borderColor: 'rgba(200,64,16,0.35)' },
  filterChipTxt: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: 'rgba(0,0,0,0.46)' },
  filterChipTxtOn:{ color: '#C84010' },
  sectionHdrRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 6 },
  sectionDot:    { width: 6, height: 6, borderRadius: 3, flexShrink: 0 },
  sectionHdrTxt: { fontFamily: 'Poppins_700Bold', fontSize: 9, letterSpacing: 1.1, color: 'rgba(0,0,0,0.30)', textTransform: 'uppercase' },
  recipeRow:     { flexDirection: 'row', alignItems: 'center', gap: 13, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.07)', marginHorizontal: 14, marginBottom: 9, padding: 15 },
  recipeEmojiBox:{ width: 56, height: 56, borderRadius: 16, backgroundColor: 'rgba(250,200,168,0.28)', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  recipeName:    { fontFamily: 'Poppins_700Bold', fontSize: 16, color: '#0A0A0A', marginBottom: 3 },
  recipeMeta:    { fontFamily: 'Poppins_400Regular', fontSize: 13, color: 'rgba(0,0,0,0.38)', marginBottom: 5 },
  tagPantry:     { backgroundColor: 'rgba(168,232,204,0.42)', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  tagPantryTxt:  { fontFamily: 'Poppins_700Bold', fontSize: 12, color: '#1A7A45' },
  tagQuick:      { backgroundColor: 'rgba(240,220,128,0.48)', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  tagQuickTxt:   { fontFamily: 'Poppins_700Bold', fontSize: 12, color: '#806000' },
  tagKids:       { backgroundColor: 'rgba(168,216,240,0.42)', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  tagKidsTxt:    { fontFamily: 'Poppins_700Bold', fontSize: 12, color: '#0060A0' },
  tagLav:        { backgroundColor: 'rgba(216,204,255,0.48)', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  tagLavTxt:     { fontFamily: 'Poppins_700Bold', fontSize: 12, color: '#5020C0' },
  planBtn:       { backgroundColor: 'rgba(168,232,204,0.35)', borderWidth: 1.5, borderColor: 'rgba(168,232,204,0.70)', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, flexShrink: 0 },
  planBtnTxt:    { fontFamily: 'Poppins_700Bold', fontSize: 14, color: '#1A7A45' },

  // ── Favourites tab ────────────────────────────────────────────────────────────
  saveCta:       { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', marginHorizontal: 14, marginVertical: 12, borderRadius: 14, borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.07)', padding: 13 },
  saveCtaIcon:   { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(200,64,16,0.09)', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  saveCtaTitle:  { fontFamily: 'Poppins_700Bold', fontSize: 16, color: '#0A0A0A', marginBottom: 3 },
  saveCtaSub:    { fontFamily: 'Poppins_400Regular', fontSize: 13, color: 'rgba(0,0,0,0.42)' },
  saveCtaBtn:    { backgroundColor: 'rgba(200,64,16,0.10)', borderWidth: 1.5, borderColor: 'rgba(200,64,16,0.28)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7, flexShrink: 0 },
  saveCtaBtnTxt: { fontFamily: 'Poppins_700Bold', fontSize: 11, color: '#C84010' },
  favRow:        { flexDirection: 'row', alignItems: 'center', gap: 13, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.07)', marginHorizontal: 14, marginBottom: 9, padding: 15 },
  favEmojiBox:   { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexShrink: 0, position: 'relative' },
  favName:       { fontFamily: 'Poppins_700Bold', fontSize: 16, color: '#0A0A0A', marginBottom: 4 },
  favTag:        { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  favTagTxt:     { fontFamily: 'Poppins_700Bold', fontSize: 12 },

  // ── Chat thread — Calendar-style ─────────────────────────────────────────────
  userMsgWrap:   { alignItems: 'flex-end', marginBottom: 6, paddingHorizontal: 16, marginTop: 18 },
  userBubble:    { backgroundColor: '#F2F2F2', borderRadius: 16, borderBottomRightRadius: 2, paddingHorizontal: 13, paddingVertical: 9, maxWidth: '82%' as any },
  userMsgText:   { fontFamily: 'Poppins_400Regular', fontSize: 17, lineHeight: 27, letterSpacing: -0.1, color: '#0A0A0A' },
  userIconRow:   { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 2, justifyContent: 'flex-end' },
  zaeliMsgWrap:  { marginBottom: 6, paddingHorizontal: 16, marginTop: 18 },
  eyebrow:       { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 6 },
  starBadge:     { width: 16, height: 16, borderRadius: 5, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  zaeliName:     { fontFamily: 'Poppins_700Bold', fontSize: 10, letterSpacing: 0.2 },
  zaeliTs:       { fontFamily: 'Poppins_400Regular', fontSize: 9, color: 'rgba(0,0,0,0.28)', marginLeft: 'auto' as any },
  zaeliTsOnly:   { fontFamily: 'Poppins_400Regular', fontSize: 10, color: 'rgba(0,0,0,0.28)', marginBottom: 5 },
  zaeliMsgText:  { fontFamily: 'Poppins_400Regular', fontSize: 17, lineHeight: 27, letterSpacing: -0.1, color: '#0A0A0A' },
  zaeliIconRow:  { flexDirection: 'row', alignItems: 'center', marginTop: 7, gap: 2 },
  msgTime:       { fontFamily: 'Poppins_400Regular', fontSize: 10, color: 'rgba(0,0,0,0.28)' },
  iconBtn:       { width: 26, height: 26, alignItems: 'center', justifyContent: 'center', borderRadius: 6 },
  chipsRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  chip:          { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.15)', backgroundColor: '#fff' },
  chipTxt:       { fontFamily: 'Poppins_400Regular', fontSize: 12, color: 'rgba(10,10,10,0.65)' },

  // ── CANONICAL CHAT BAR (LOCKED) ──────────────────────────────────────────────
  inputArea: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 14, paddingBottom: Platform.OS === 'ios' ? 30 : 18, paddingTop: 10, backgroundColor: 'transparent' },
  barPill:   { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 30, paddingVertical: 14, paddingHorizontal: 16, borderWidth: 1, backgroundColor: '#fff', borderColor: 'rgba(10,10,10,0.09)' },
  barBtn:    { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  barSep:    { width: 1, height: 18, backgroundColor: 'rgba(10,10,10,0.1)', flexShrink: 0 },
  barInput:  { flex: 1, fontFamily: 'Poppins_400Regular', fontSize: 15, color: '#0A0A0A', paddingVertical: 0, maxHeight: 100 },
  barMicBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  barWaveBtn:{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  barSend:   { width: 32, height: 32, borderRadius: 16, backgroundColor: '#FF4545', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },

  // ── SCROLL ARROWS (LOCKED) ────────────────────────────────────────────────────
  scrollArrowPair: { position: 'absolute', bottom: 110, right: 16, flexDirection: 'row', gap: 8, zIndex: 50 },
  scrollArrowBtn:  { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(10,10,10,0.40)', alignItems: 'center', justifyContent: 'center' },

  // ── Mic overlay ───────────────────────────────────────────────────────────────
  micOverlay:    { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(250,200,168,0.92)', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  micCard:       { backgroundColor: '#fff', borderRadius: 28, paddingVertical: 32, paddingHorizontal: 36, alignItems: 'center', gap: 18, borderWidth: 1, borderColor: 'rgba(10,10,10,0.06)' },
  micTimer:      { fontFamily: 'Poppins_600SemiBold', fontSize: 30, color: '#0A0A0A', letterSpacing: 1 },
  micLabel:      { fontFamily: 'Poppins_400Regular', fontSize: 13, color: 'rgba(10,10,10,0.40)' },
  micStopBtn:    { width: 60, height: 60, borderRadius: 30, backgroundColor: '#FF4545', alignItems: 'center', justifyContent: 'center' },
  micStopSquare: { width: 20, height: 20, borderRadius: 4, backgroundColor: '#fff' },
  micCancel:     { fontFamily: 'Poppins_400Regular', fontSize: 13, color: 'rgba(10,10,10,0.35)' },

  // ── Modals ────────────────────────────────────────────────────────────────────
  modalHdr:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.07)' },
  modalCancel:   { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: 'rgba(0,0,0,0.50)' },
  modalTitle:    { fontFamily: 'Poppins_700Bold', fontSize: 16, color: '#0A0A0A' },
  modalSave:     { fontFamily: 'Poppins_700Bold', fontSize: 15, color: '#C84010' },
  modalSub:      { fontFamily: 'Poppins_400Regular', fontSize: 13, color: 'rgba(0,0,0,0.50)' },
  fieldLbl:      { fontFamily: 'Poppins_700Bold', fontSize: 10, letterSpacing: 1, color: 'rgba(0,0,0,0.28)', textTransform: 'uppercase' },
  fieldInput:    { borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.09)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: 'Poppins_400Regular', color: '#0A0A0A', backgroundColor: '#fff' },
  memberTile:    { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 13, borderRadius: 13, borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.09)', backgroundColor: '#fff', flex: 1, minWidth: '45%' as any },
  memberAv:      { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  memberName:    { fontFamily: 'Poppins_500Medium', fontSize: 14, color: 'rgba(0,0,0,0.50)', flex: 1 },
  jobPrompt:     { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1.5, borderColor: 'rgba(80,32,192,0.20)', padding: 16 },
  jpTitle:       { fontFamily: 'Poppins_700Bold', fontSize: 14, color: '#0A0A0A', flex: 1 },
  jpBody:        { fontFamily: 'Poppins_400Regular', fontSize: 13, color: 'rgba(0,0,0,0.50)', lineHeight: 19, marginBottom: 12 },
  jpBtn:         { borderRadius: 11, paddingVertical: 10, paddingHorizontal: 16, borderWidth: 1.5, borderColor: 'rgba(80,32,192,0.25)', backgroundColor: '#fff', alignSelf: 'flex-start' as const },
  jpBtnTxt:      { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: '#5020C0' },
  ptsOpt:        { borderRadius: 9, paddingVertical: 7, paddingHorizontal: 12, borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.10)', backgroundColor: '#fff' },
  ptsOptOn:      { backgroundColor: '#5020C0', borderColor: '#5020C0' },
  ptsOptTxt:     { fontFamily: 'Poppins_700Bold', fontSize: 12, color: 'rgba(0,0,0,0.50)' },
  customPtsInput:{ borderWidth: 1.5, borderColor: '#5020C0', borderRadius: 9, paddingVertical: 7, paddingHorizontal: 12, fontSize: 14, fontFamily: 'Poppins_700Bold', color: '#0A0A0A', width: 110, textAlign: 'center' as const },
  addOpt:        { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 15, borderRadius: 16, borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.09)', backgroundColor: '#fff', marginBottom: 0 },
  addOptIcon:    { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  addOptTitle:   { fontFamily: 'Poppins_700Bold', fontSize: 14, color: '#0A0A0A', marginBottom: 2 },
  addOptSub:     { fontFamily: 'Poppins_400Regular', fontSize: 12, color: 'rgba(0,0,0,0.50)' },
  bigBtnOr:      { backgroundColor: '#C84010', borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginBottom: 9 },
  bigBtnTxt:     { fontFamily: 'Poppins_700Bold', fontSize: 15, color: '#fff' },
  bigBtnGhost:   { backgroundColor: 'rgba(0,0,0,0.055)', borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.09)', borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginBottom: 9 },
  bigBtnGhostTxt:{ fontFamily: 'Poppins_700Bold', fontSize: 15, color: 'rgba(0,0,0,0.50)' },
  notesBox:      { backgroundColor: 'rgba(0,0,0,0.03)', borderRadius: 12, padding: 13, borderWidth: 1, borderColor: 'rgba(0,0,0,0.07)' },
  notesTxt:      { fontFamily: 'Poppins_400Regular', fontSize: 13, color: 'rgba(0,0,0,0.50)', lineHeight: 20 },
  pantryAllOk:   { backgroundColor: 'rgba(0,201,122,0.10)', borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14, borderWidth: 1.5, borderColor: 'rgba(0,201,122,0.28)' },

  // ── Misc ──────────────────────────────────────────────────────────────────────
  slbl:  { fontFamily: 'Poppins_700Bold', fontSize: 10, color: 'rgba(0,0,0,0.28)', letterSpacing: 1.5, textTransform: 'uppercase', paddingHorizontal: 16, paddingTop: 6, paddingBottom: 6 },
  rtPu:  { backgroundColor: 'rgba(216,204,255,0.45)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  rtPuTxt:{ fontFamily: 'Poppins_600SemiBold', fontSize: 10, color: '#5020C0' },
});
