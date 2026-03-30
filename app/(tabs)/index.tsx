/**
 * index.tsx — Zaeli Home · AI-First Chat Interface
 * Chat is home. Zaeli opens every session. Pills bring screens into chat.
 * See ZAELI-PRODUCT.md for full framework.
 *
 * Session 23: Inline calendar EventCard rendering
 * - isCalendarQuery() detects calendar questions
 * - fetchEventsForContext() loads Supabase events into GPT context
 * - GPT returns {intro, events, followUp, showCalendarPill, replies}
 * - EventCard + EventDetailModal ported from calendar.tsx for inline render
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Animated, Easing, TextInput, KeyboardAvoidingView,
  Platform, Modal, Pressable, Image, Share, Clipboard, Keyboard,
} from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { getPendingCalendarImage, setPendingCalendarImage } from './calendar';
import Svg, { Path, Line, Rect, Circle, Polyline, Polygon } from 'react-native-svg';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Audio } from 'expo-av';
import { supabase } from '../../lib/supabase';
import { NavMenu, HamburgerButton } from '../components/NavMenu';

// ── Constants ──────────────────────────────────────────────────────────────
const FAMILY_ID   = '00000000-0000-0000-0000-000000000001';
const MEMBER_NAME = 'Rich';
const INK    = '#0A0A0A';
const INK3   = 'rgba(10,10,10,0.32)';
const HOME_AI = '#A8D8F0';  // Sky blue — Home channel ai colour

// Home channel theme tokens
const T = {
  bannerBg:    '#F5EAD8',
  bg:          '#FFFFFF',
  ink:         '#0A0A0A',
  ink2:        'rgba(10,10,10,0.5)',
  ink3:        'rgba(10,10,10,0.28)',
  border:      'rgba(10,10,10,0.09)',
  userBubble:  '#F2F2F2',
  userText:    '#0A0A0A',
  zaeliAi:     HOME_AI,
  dateLine:    'rgba(10,10,10,0.09)',
  pillBg:      HOME_AI,
  pillText:    '#0A0A0A',
  dismiss:     'rgba(10,10,10,0.32)',
  barBg:       '#FFFFFF',
  barBorder:   'rgba(10,10,10,0.09)',
  barPh:       'rgba(10,10,10,0.5)',
  barSep:      'rgba(10,10,10,0.1)',
  barIcon:     'rgba(10,10,10,0.4)',
  sendBg:      HOME_AI,
  statusBar:   'dark' as const,
};

// ── Calendar colour constants (for EventCard) ──────────────────────────────
const CAL_AI  = '#F0C8C0'; // blush — used as portal pill bg
const CAL_BG  = '#B8EDD0'; // mint — calendar pill bg

// ── Family members (for EventCard avatars) ────────────────────────────────
const FAMILY_MEMBERS = [
  { id:'1', name:'Anna',  color:'#FF7B6B' },
  { id:'2', name:'Rich',  color:'#4D8BFF' },
  { id:'3', name:'Poppy', color:'#A855F7' },
  { id:'4', name:'Gab',   color:'#22C55E' },
  { id:'5', name:'Duke',  color:'#F59E0B' },
];

const OPENAI_URL  = 'https://api.openai.com/v1/chat/completions';
const WHISPER_URL = 'https://api.openai.com/v1/audio/transcriptions';

const ALL_SCREENS = [
  { key: 'calendar', label: 'Calendar',   emoji: '📅', route: '/(tabs)/calendar' },
  { key: 'shopping', label: 'Shopping',   emoji: '🛒', route: '/(tabs)/shopping' },
  { key: 'meals',    label: 'Meals',      emoji: '🍽',  route: '/(tabs)/shopping' },
  { key: 'tutor',    label: 'Tutor',      emoji: '🎓', route: '/(tabs)/tutor' },
  { key: 'todos',    label: 'To-dos',     emoji: '✅', route: '/(tabs)/more' },
  { key: 'kids',     label: 'Kids Hub',   emoji: '👧', route: '/(tabs)/more' },
  { key: 'notes',    label: 'Notes',      emoji: '📝', route: '/(tabs)/more' },
  { key: 'travel',   label: 'Travel',     emoji: '✈️', route: '/(tabs)/more' },
  { key: 'family',   label: 'Our Family', emoji: '👨‍👩‍👧', route: '/(tabs)/more' },
];

// ── Repeat / Alert options for EventDetailModal ───────────────────────────
const REPEAT_OPTIONS = ['Never','Every day','Every week','Every fortnight','Every month','Every year'];
const ALERT_OPTIONS  = ['None','At time of event','5 min before','15 min before','30 min before','1 hour before','2 hours before','1 day before','1 week before'];
const HOURS   = Array.from({ length:12 }, (_, i) => i + 1);
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

// ── Message type ───────────────────────────────────────────────────────────
interface InlineData {
  type: 'calendar' | 'todos' | 'shopping' | 'meals' | 'kids';
  intro?: string;
  followUp?: string;
  items?: any[];
  showPortalPill?: boolean;
}

interface Msg {
  id: string;
  role: 'zaeli' | 'user';
  text: string;
  imageUri?: string;
  ts: string;
  isLoading?: boolean;
  isBrief?: boolean;
  isVoice?: boolean;
  quickReplies?: string[];
  inlineData?: InlineData;
}

// ── Helpers ────────────────────────────────────────────────────────────────
function localDateStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function fmtTime(t?: string | null): string {
  if (!t) return '';
  const timePart = t.includes('T') ? t.split('T')[1] : t.split(' ')[1] || '';
  if (!timePart) return '';
  const [hStr, mStr] = timePart.split(':');
  const h = parseInt(hStr, 10); const m = parseInt(mStr, 10);
  const ampm = h >= 12 ? 'pm' : 'am';
  const h12  = h === 0 ? 12 : h > 12 ? h-12 : h;
  return `${h12}:${String(m).padStart(2,'0')} ${ampm}`;
}
function naturalDate(ds: string, td: string): string {
  const diff = Math.round((new Date(ds+'T00:00:00').getTime() - new Date(td+'T00:00:00').getTime()) / 86400000);
  if (diff === 0) return 'today';
  if (diff === 1) return 'tomorrow';
  if (diff <= 6)  return new Date(ds+'T00:00:00').toLocaleDateString('en-AU', { weekday: 'long' });
  return new Date(ds+'T00:00:00').toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' });
}
function nowTs() {
  return new Date().toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' });
}
function uid() { return `${Date.now()}-${Math.random().toString(36).slice(2)}`; }
function isoToMinutes(iso: string): number {
  if (!iso) return 0;
  const timePart = iso.includes('T') ? iso.split('T')[1] : iso.split(' ')[1] || '';
  if (!timePart) return 0;
  const [h, m] = timePart.split(':').map(Number);
  return h * 60 + m;
}
function getMemberColor(assignees?: string[]): string {
  if (!assignees || assignees.length === 0) return '#A8D8F0';
  const m = FAMILY_MEMBERS.find(m => assignees.includes(m.id));
  return m?.color ?? '#A8D8F0';
}
function getEvAssignees(ev: any): any[] {
  if (!ev.assignees || ev.assignees.length === 0) return [];
  return (ev.assignees as string[])
    .map((id: string) => FAMILY_MEMBERS.find(m => m.id === id))
    .filter(Boolean) as any[];
}

// Parse [bracketed text] in hero into italic DM Serif spans
function renderHeroText(text: string, highlightColor: string) {
  const parts = text.split(/(\[[^\]]+\])/g);
  return parts.map((part, i) => {
    if (part.startsWith('[') && part.endsWith(']')) {
      return <Text key={i} style={{ color:'#0A0A0A', fontFamily:'DMSerifDisplay_400Regular', fontStyle:'italic' as const }}>{part.slice(1,-1)}</Text>;
    }
    return <Text key={i}>{part}</Text>;
  });
}

// ── Calendar keyword detection ─────────────────────────────────────────────
const CALENDAR_KEYWORDS = [
  "what's on", "whats on", "what is on", "calendar", "schedule", "schedule",
  "this week", "next week", "this weekend", "today", "tomorrow", "tonight",
  "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
  "mon", "tue", "wed", "thu", "fri", "sat", "sun",
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
  "next month", "this month", "coming up", "upcoming", "what do we have",
  "any events", "anything on", "game", "training", "practice", "appointment",
  "pickup", "drop off", "school", "when is", "when does", "remind me",
  "week ahead", "what have we got", "busy", "free",
];

// Action intent — these must ALWAYS go to Anthropic tool-calling, never the calendar GPT path
const ACTION_KEYWORDS = [
  'add ', 'remove ', 'delete ', 'change ', 'move ', 'update ', 'edit ',
  'reschedule', 'cancel ', 'rename ', 'shift ', 'put ', 'book ',
  'also add', 'can you add', 'please add', 'add anna', 'add rich', 'add poppy',
  'add gab', 'add duke', 'assign ', 'invite ',
];

function isActionQuery(text: string): boolean {
  const lower = text.toLowerCase();
  return ACTION_KEYWORDS.some(kw => lower.includes(kw));
}

function isCalendarQuery(text: string): boolean {
  const lower = text.toLowerCase();
  // Action messages must go to tool-calling — never calendar GPT path
  if (isActionQuery(lower)) return false;
  return CALENDAR_KEYWORDS.some(kw => lower.includes(kw));
}

// Detects requests for the full calendar — these should route conversationally, not dump all events inline
function isFullCalendarRequest(text: string): boolean {
  const lower = text.toLowerCase();
  return /full calendar|whole calendar|all events|all my events|everything on|show.{0,10}calendar|open calendar|see.{0,10}calendar|view.{0,10}calendar/.test(lower);
}

// How many days forward to fetch based on query
function getEventFetchDays(text: string): number {
  const lower = text.toLowerCase();
  const MONTHS = ['january','february','march','april','may','june','july','august','september','october','november','december'];
  if (MONTHS.some(m => lower.includes(m))) return 120;
  if (lower.includes('next month')) return 60;
  if (/\d{1,2}(st|nd|rd|th)/.test(lower)) return 120;
  return 14;
}

// ── Brief pill colour by topic ─────────────────────────────────────────────
// Maps chip text to channel bg colour so pills reflect their topic
function getPillColor(chip: string): string {
  const t = chip.toLowerCase();
  if (/calendar|schedule|on today|on tomorrow|on this|on next|what's on|what have|coming up|week ahead|event|clashes?|clashing|busy|free day|show me|tomorrow|prep|morning|week|day ahead|first up|what's first|see next|next day/.test(t)) return '#B8EDD0'; // Calendar mint
  if (/shop|list|groceries|pantry|buy|milk|eggs|coles|woolies|supermarket|receipt|spend|spending|stock/.test(t)) return '#F0E880'; // Shopping yellow
  if (/dinner|lunch|breakfast|meal|recipe|food|eat|cook|tonight/.test(t)) return '#FAC8A8'; // Meals peach
  if (/todo|task|urgent|pressing|to.do|remind|due|overdue|sort|what needs|needs doing/.test(t)) return '#F0DC80'; // Todos gold
  if (/kids?|family|homework|school|poppy|gab|duke|anna|children|sport|activity|jobs/.test(t)) return '#A8E8CC'; // Kids/family aqua
  return HOME_AI; // Default sky blue
}
async function fetchEventsForContext(days: number): Promise<{ eventsJson: string; eventsRaw: any[] }> {
  try {
    const today = localDateStr();
    const future = new Date();
    future.setDate(future.getDate() + days);
    const futureStr = localDateStr(future);
    const { data } = await supabase
      .from('events')
      .select('id, title, date, start_time, end_time, notes, assignees, all_day')
      .eq('family_id', FAMILY_ID)
      .gte('date', today)
      .lte('date', futureStr)
      .order('date')
      .order('start_time')
      .limit(50);
    // Filter out all-day events and midnight-anchored reminders (T00:00:00)
    // These show as pills in Calendar day strip, not as timed events
    const eventsRaw = (data ?? []).filter((e: any) => {
      if (e.all_day) return false;
      const st = e.start_time || '';
      if (st.includes('T00:00:00') || st.includes(' 00:00:00')) return false;
      return true;
    });
    const eventsJson = eventsRaw.map(e => ({
      id: e.id,
      title: e.title,
      date: e.date,
      start_time: e.start_time,
      end_time: e.end_time,
      notes: e.notes || '',
      assignees: e.assignees || [],
    }));
    return { eventsJson: JSON.stringify(eventsJson), eventsRaw };
  } catch {
    return { eventsJson: '[]', eventsRaw: [] };
  }
}

// ── OpenAI / API logging ────────────────────────────────────────────────────
const GPT_IN_PER_M  = 0.15;
const GPT_OUT_PER_M = 0.60;

async function logApiCall(params: {
  family_id: string; feature: string; model: string;
  input_tokens: number; output_tokens: number; cost_usd: number;
}) {
  try {
    const { error } = await supabase.from('api_logs').insert({
      ...params, created_at: new Date().toISOString(),
    });
    if (error) console.error('[logApiCall] Supabase error:', JSON.stringify(error));
  } catch (e: any) { console.error('[logApiCall] Exception:', e?.message); }
}

async function callGPT(
  system: string,
  msgs: { role: string; content: string }[],
  maxTokens = 400,
  feature = 'chat_response'
): Promise<string> {
  const key = process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? '';
  if (!key) throw new Error('No OpenAI key');
  const res = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: 'gpt-5.4-mini', max_completion_tokens: maxTokens, messages: [{ role: 'system', content: system }, ...msgs] }),
  });
  const json = await res.json();
  const text = json?.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error(`GPT empty: ${JSON.stringify(json)}`);
  const pt = json?.usage?.prompt_tokens ?? 0;
  const ct = json?.usage?.completion_tokens ?? 0;
  const cost = (pt / 1_000_000 * GPT_IN_PER_M) + (ct / 1_000_000 * GPT_OUT_PER_M);
  logApiCall({ family_id: FAMILY_ID, feature, model: 'gpt-5.4-mini', input_tokens: pt, output_tokens: ct, cost_usd: cost });
  return text;
}

function logWhisper(durationSeconds: number) {
  const cost = (durationSeconds / 60) * 0.006;
  logApiCall({ family_id: FAMILY_ID, feature: 'whisper_transcription', model: 'whisper-1', input_tokens: 0, output_tokens: 0, cost_usd: cost });
}

const CLAUDE_IN_PER_M  = 3.00;
const CLAUDE_OUT_PER_M = 15.00;
function logVision(inputTokens: number, outputTokens: number) {
  const cost = (inputTokens / 1_000_000 * CLAUDE_IN_PER_M) + (outputTokens / 1_000_000 * CLAUDE_OUT_PER_M);
  logApiCall({ family_id: FAMILY_ID, feature: 'chat_vision', model: 'claude-sonnet-4-20250514', input_tokens: inputTokens, output_tokens: outputTokens, cost_usd: cost });
}

// ── Icons ──────────────────────────────────────────────────────────────────
function IcoPlus({ color = INK3 }: { color?: string }) {
  return <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><Line x1="12" y1="5" x2="12" y2="19"/><Line x1="5" y1="12" x2="19" y2="12"/></Svg>;
}
function IcoMic({ color = INK3, size = 20 }: { color?: string; size?: number }) {
  return <Svg width={size} height={size} viewBox="0 0 24 26" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><Rect x="9" y="2" width="6" height="11" rx="3"/><Path d="M5 10a7 7 0 0014 0"/><Line x1="12" y1="19" x2="12" y2="23"/><Line x1="8" y1="23" x2="16" y2="23"/></Svg>;
}
function IcoSend() {
  return <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><Line x1="12" y1="19" x2="12" y2="5"/><Polyline points="5 12 12 5 19 12"/></Svg>;
}
function IcoArrowDown() {
  return <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><Line x1="12" y1="5" x2="12" y2="19"/><Polyline points="19 12 12 19 5 12"/></Svg>;
}
function IcoPlay({ color = INK3 }: { color?: string }) {
  return <Svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><Polygon points="5 3 19 12 5 21 5 3"/></Svg>;
}
function IcoCopy({ color = INK3 }: { color?: string }) {
  return <Svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><Rect x="9" y="9" width="13" height="13" rx="2"/><Path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></Svg>;
}
function IcoForward({ color = INK3 }: { color?: string }) {
  return <Svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><Line x1="22" y1="2" x2="11" y2="13"/><Polygon points="22 2 15 22 11 13 2 9 22 2"/></Svg>;
}
function IcoThumbUp({ color = INK3 }: { color?: string }) {
  return <Svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><Path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z"/><Path d="M7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"/></Svg>;
}
function IcoThumbDown({ color = INK3 }: { color?: string }) {
  return <Svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><Path d="M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3H10z"/><Path d="M17 2h2.67A2.31 2.31 0 0122 4v7a2.31 2.31 0 01-2.33 2H17"/></Svg>;
}
function IcoClose() {
  return <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={INK} strokeWidth="2.2" strokeLinecap="round"><Line x1="18" y1="6" x2="6" y2="18"/><Line x1="6" y1="6" x2="18" y2="18"/></Svg>;
}
function IcoCamera() {
  return <Svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={INK} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><Path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><Circle cx="12" cy="13" r="4"/></Svg>;
}
function IcoPhotos() {
  return <Svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={INK} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><Rect x="3" y="3" width="18" height="18" rx="2"/><Circle cx="8.5" cy="8.5" r="1.5"/><Polyline points="21 15 16 10 5 21"/></Svg>;
}
function IcoX() {
  return <Svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><Line x1="18" y1="6" x2="6" y2="18"/><Line x1="6" y1="6" x2="18" y2="18"/></Svg>;
}

// ── Typing dots ────────────────────────────────────────────────────────────
function TypingDots({ color = '#FF4545' }: { color?: string }) {
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
      {dots.map((op, i) => <Animated.View key={i} style={[s.dot, { opacity: op, backgroundColor: color }]} />)}
    </View>
  );
}

// ── Waveform ───────────────────────────────────────────────────────────────
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

// ── MicWaveform — larger animated bars for the recording overlay ──────────
function MicWaveform() {
  const anims = useRef(Array.from({ length: 13 }, (_, i) => new Animated.Value(0.15 + (i % 3) * 0.1))).current;
  useEffect(() => {
    const loops = anims.map((anim, i) => {
      const min = 0.1 + (i % 4) * 0.05;
      const max = 0.6 + (i % 5) * 0.08;
      const spd = 280 + (i % 6) * 60;
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
    <View style={{ flexDirection:'row', alignItems:'center', gap:4, height:52 }}>
      {anims.map((anim, i) => (
        <Animated.View
          key={i}
          style={{
            width: 4, borderRadius: 3,
            backgroundColor: HOME_AI,
            transform: [{ scaleY: anim }],
            height: 52,
          }}
        />
      ))}
    </View>
  );
}
function getEventEmoji(title: string): string {
  const t = title.toLowerCase();
  if (/soccer|football|footy/.test(t))              return '⚽';
  if (/danc|ballet|recital/.test(t))                return '💃';
  if (/run|jog|park run/.test(t))                   return '🏃';
  if (/swim|pool|squad/.test(t))                    return '🏊';
  if (/gym|workout|weights|crossfit/.test(t))       return '🏋️';
  if (/tennis/.test(t))                             return '🎾';
  if (/cricket/.test(t))                            return '🏏';
  if (/netball|basket/.test(t))                     return '🏀';
  if (/rugby|afl|nrl/.test(t))                      return '🏉';
  if (/golf/.test(t))                               return '⛳';
  if (/bike|cycling|ride/.test(t))                  return '🚴';
  if (/yoga|pilates|stretch/.test(t))               return '🧘';
  if (/school|class|lesson|tutor|homework/.test(t)) return '🏫';
  if (/photo|portrait/.test(t))                     return '📷';
  if (/library|book/.test(t))                       return '📚';
  if (/dentist|orthodon/.test(t))                   return '🦷';
  if (/doctor|gp|hospital|physio|chiro/.test(t))    return '🏥';
  if (/birthday|party|celebrat/.test(t))            return '🎂';
  if (/sushi|japanese/.test(t))                     return '🍣';
  if (/pizza/.test(t))                              return '🍕';
  if (/burger|maccas|mcdonalds/.test(t))            return '🍔';
  if (/taco|mexican/.test(t))                       return '🌮';
  if (/pasta|italian/.test(t))                      return '🍝';
  if (/bbq|barbe/.test(t))                          return '🍖';
  if (/dinner|supper/.test(t))                      return '🍽';
  if (/lunch/.test(t))                              return '🥗';
  if (/breakfast/.test(t))                          return '🥞';
  if (/coffee|cafe/.test(t))                        return '☕';
  if (/takeaway|takeout/.test(t))                   return '🥡';
  if (/dog|walk.*dog|dog.*walk|puppy/.test(t))      return '🐕';
  if (/cat|vet/.test(t))                            return '🐈';
  if (/shop|supermarket|groceries|woolies|coles/.test(t)) return '🛒';
  if (/haircut|hair|barber/.test(t))                return '✂️';
  if (/flight|travel|airport|holiday|trip/.test(t)) return '✈️';
  if (/meeting|call|zoom|teams/.test(t))            return '💼';
  if (/pickup|drop.?off/.test(t))                   return '🚗';
  if (/bins|rubbish|recycl|garbage/.test(t))        return '🗑';
  if (/concert|show|theatre|movie|film/.test(t))    return '🎭';
  if (/church|mass|service/.test(t))                return '⛪';
  if (/t.?ball|tball/.test(t))                      return '⚾';
  if (/gymnastics/.test(t))                         return '🤸';
  return '📅';
}

// ── EventCard (ported from calendar.tsx, adapted for Home inline use) ─────
function EventCard({ ev, onPress }: { ev: any; onPress: () => void }) {
  const assignedMembers = (ev.assignees || [])
    .map((id: string) => FAMILY_MEMBERS.find(m => m.id === id))
    .filter(Boolean) as any[];
  const primaryColor = assignedMembers.length > 0 ? assignedMembers[0].color : null;
  const bgColor = primaryColor ? primaryColor + '2E' : 'rgba(0,0,0,0.06)';
  const timeColor = primaryColor ?? 'rgba(0,0,0,0.45)';
  const emoji = getEventEmoji(ev.title || '');
  const noteParts = (ev.notes || '').split(' | ');
  const location = noteParts.length > 1 ? noteParts[noteParts.length - 1] : '';

  return (
    <TouchableOpacity style={[s.evCard, { backgroundColor: bgColor }]} onPress={onPress} activeOpacity={0.75}>
      <View style={s.evCardInner}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Text style={{ fontSize: 20 }}>{emoji}</Text>
            <Text style={[s.evTitle, { marginBottom: 0, flex: 1 }]}>{ev.title}</Text>
          </View>
          <Text style={[s.evTime, { color: timeColor }]}>
            {fmtTime(ev.start_time)}{ev.end_time && ev.end_time !== ev.start_time ? ` – ${fmtTime(ev.end_time)}` : ''}
          </Text>
          {location ? <Text style={s.evLocation}>📍 {location}</Text> : null}
        </View>
        {assignedMembers.length > 0 && (
          <View style={s.evAvatarCol}>
            {assignedMembers.length <= 3 ? (
              // 1-3: single column
              assignedMembers.map((m: any) => {
                const size = assignedMembers.length === 1 ? 28 : assignedMembers.length === 2 ? 26 : 22;
                return (
                  <View key={m.id} style={[s.evAv, { backgroundColor: m.color, width: size, height: size, borderRadius: size / 2 }]}>
                    <Text style={[s.evAvTxt, { fontSize: assignedMembers.length === 1 ? 12 : assignedMembers.length === 2 ? 11 : 10 }]}>{m.name[0]}</Text>
                  </View>
                );
              })
            ) : (
              // 4+: show 3 avatars + "+N" overflow chip in 2×2 grid
              <View style={s.evAvatarGrid}>
                {assignedMembers.slice(0, 3).map((m: any) => (
                  <View key={m.id} style={[s.evAv, { backgroundColor: m.color, width: 20, height: 20, borderRadius: 10 }]}>
                    <Text style={[s.evAvTxt, { fontSize: 8 }]}>{m.name[0]}</Text>
                  </View>
                ))}
                <View style={[s.evAv, { backgroundColor: 'rgba(10,10,10,0.12)', width: 20, height: 20, borderRadius: 10 }]}>
                  <Text style={{ fontFamily:'Poppins_700Bold', fontSize: 7, color: 'rgba(10,10,10,0.55)' }}>+{assignedMembers.length - 3}</Text>
                </View>
              </View>
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ── Picker subcomponents for EventDetailModal ─────────────────────────────
const ROW_H = 52;

function SnapCol({ items, selected, onSelect, fmtItem }: {
  items: (string|number)[]; selected: string|number;
  onSelect: (v: string|number) => void; fmtItem?: (v: string|number) => string;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const selIdx = items.indexOf(selected);
  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollTo({ y: selIdx * ROW_H, animated: false }), 50);
  }, []);
  return (
    <View style={{ flex:1, height: ROW_H * 5, overflow:'hidden' }}>
      <View pointerEvents="none" style={{
        position:'absolute', top: ROW_H * 2, left:4, right:4, height: ROW_H,
        backgroundColor:'rgba(168,216,240,0.12)', borderRadius:12,
        borderTopWidth:1.5, borderBottomWidth:1.5, borderColor:'rgba(168,216,240,0.3)', zIndex:2,
      }}/>
      <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false}
        snapToInterval={ROW_H} decelerationRate="fast"
        contentContainerStyle={{ paddingVertical: ROW_H * 2 }}
        onMomentumScrollEnd={e => {
          const idx = Math.round(e.nativeEvent.contentOffset.y / ROW_H);
          onSelect(items[Math.max(0, Math.min(idx, items.length-1))]);
        }}
        onScrollEndDrag={e => {
          const idx = Math.round(e.nativeEvent.contentOffset.y / ROW_H);
          onSelect(items[Math.max(0, Math.min(idx, items.length-1))]);
        }}>
        {items.map((item, i) => {
          const isSel = item === selected;
          const label = fmtItem ? fmtItem(item) : (
            typeof item === 'number' ? String(item).padStart(2,'0') : String(item).toUpperCase()
          );
          return (
            <TouchableOpacity key={i} style={{ height: ROW_H, alignItems:'center', justifyContent:'center' }}
              onPress={() => { scrollRef.current?.scrollTo({ y: i * ROW_H, animated: true }); onSelect(item); }}
              activeOpacity={0.7}>
              <Text style={{
                fontFamily: isSel ? 'Poppins_700Bold' : 'Poppins_400Regular',
                fontSize: isSel ? 26 : 18, color: isSel ? INK : INK3,
              }}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

function TimePickerModal({ visible, hour, minute, ampm, onConfirm, onClose }: {
  visible: boolean; hour: number; minute: number; ampm: 'am'|'pm';
  onConfirm: (h:number, m:number, ap:'am'|'pm') => void; onClose: () => void;
}) {
  const [h, setH] = useState(hour);
  const [m, setM] = useState(minute);
  const [ap, setAp] = useState<'am'|'pm'>(ampm);
  useEffect(() => { if (visible) { setH(hour); setM(minute); setAp(ampm); } }, [visible]);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.45)', justifyContent:'center', alignItems:'center', padding:32 }}>
        <View style={{ backgroundColor:'#fff', borderRadius:24, width:'100%', padding:24,
          shadowColor:'#000', shadowOpacity:0.18, shadowRadius:24, shadowOffset:{ width:0, height:8 } }}>
          <Text style={{ fontFamily:'Poppins_700Bold', fontSize:16, color:INK, textAlign:'center', marginBottom:16 }}>Select time</Text>
          <View style={{ flexDirection:'row', alignItems:'center' }}>
            <SnapCol items={HOURS} selected={h} onSelect={v => setH(v as number)}/>
            <Text style={{ fontFamily:'Poppins_700Bold', fontSize:28, color:INK3, paddingHorizontal:4 }}>:</Text>
            <SnapCol items={MINUTES} selected={m} onSelect={v => setM(v as number)}/>
            <View style={{ width:1, backgroundColor:'rgba(0,0,0,0.07)', alignSelf:'stretch', marginHorizontal:8, marginVertical:8 }}/>
            <SnapCol items={['am','pm']} selected={ap} onSelect={v => setAp(v as 'am'|'pm')}/>
          </View>
          <View style={{ flexDirection:'row', gap:12, marginTop:20 }}>
            <TouchableOpacity style={{ flex:1, paddingVertical:14, borderRadius:14, borderWidth:1.5, borderColor:'rgba(0,0,0,0.07)', alignItems:'center' }}
              onPress={onClose} activeOpacity={0.8}>
              <Text style={{ fontFamily:'Poppins_600SemiBold', fontSize:15, color:'rgba(10,10,10,0.5)' }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ flex:1, paddingVertical:14, borderRadius:14, backgroundColor:HOME_AI, alignItems:'center' }}
              onPress={() => { onConfirm(h, m, ap); onClose(); }} activeOpacity={0.85}>
              <Text style={{ fontFamily:'Poppins_700Bold', fontSize:15, color:INK }}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function TimePill({ hour, minute, ampm, onHour, onMinute, onAmpm }: {
  hour:number; minute:number; ampm:'am'|'pm';
  onHour:(h:number)=>void; onMinute:(m:number)=>void; onAmpm:(a:'am'|'pm')=>void;
}) {
  const [open, setOpen] = useState(false);
  const display = `${hour}:${String(minute).padStart(2,'0')} ${ampm.toUpperCase()}`;
  return (
    <>
      <TouchableOpacity style={s.gcPill} onPress={() => setOpen(true)} activeOpacity={0.7}>
        <Text style={[s.gcPillTxt, open && { color: HOME_AI }]}>{display}</Text>
      </TouchableOpacity>
      <TimePickerModal visible={open} hour={hour} minute={minute} ampm={ampm}
        onConfirm={(h,m,ap) => { onHour(h); onMinute(m); onAmpm(ap); }}
        onClose={() => setOpen(false)}/>
    </>
  );
}

function DropdownPicker({ options, value, onChange }: { options:string[]; value:string; onChange:(v:string)=>void }) {
  const [open, setOpen] = useState(false);
  return (
    <View>
      <TouchableOpacity style={s.gcRowRight} onPress={() => setOpen(true)} activeOpacity={0.7}>
        <Text style={s.gcRowRightTxt}>{value}</Text>
        <Text style={{ color:INK3, fontSize:14, marginLeft:4 }}>⌄</Text>
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={{ flex:1, backgroundColor:'rgba(0,0,0,0.35)', justifyContent:'center', alignItems:'center', padding:32 }}
          onPress={() => setOpen(false)} activeOpacity={1}>
          <View style={{ backgroundColor:'#fff', borderRadius:18, width:'100%', overflow:'hidden',
            shadowColor:'#000', shadowOpacity:0.15, shadowRadius:20, shadowOffset:{ width:0, height:8 } }}>
            {options.map((opt, i) => (
              <TouchableOpacity key={opt}
                style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between',
                  paddingHorizontal:20, paddingVertical:16,
                  borderBottomWidth: i < options.length-1 ? 1 : 0, borderBottomColor:'rgba(0,0,0,0.07)' }}
                onPress={() => { onChange(opt); setOpen(false); }} activeOpacity={0.7}>
                <Text style={{ fontFamily: opt===value ? 'Poppins_600SemiBold' : 'Poppins_400Regular',
                  fontSize:16, color: opt===value ? HOME_AI : INK }}>{opt}</Text>
                {opt === value && <Text style={{ color:HOME_AI, fontSize:16, fontFamily:'Poppins_700Bold' }}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// ── EventDetailModal (ported from calendar.tsx) ────────────────────────────
function EventDetailModal({ event, onClose, onDeleted, onReload }: {
  event: any | null; onClose: () => void; onDeleted: () => void; onReload: () => void;
}) {
  const [mode,          setMode]          = useState<'view'|'edit'>('view');
  const [deleting,      setDeleting]      = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving,        setSaving]        = useState(false);
  const [editTitle,     setEditTitle]     = useState('');
  const [editNotes,     setEditNotes]     = useState('');
  const [editLocation,  setEditLocation]  = useState('');
  const [editRepeat,    setEditRepeat]    = useState('Never');
  const [editAlert,     setEditAlert]     = useState('None');
  const [editAssignees, setEditAssignees] = useState<string[]>([]);
  const [editStartH,    setEditStartH]    = useState(9);
  const [editStartM,    setEditStartM]    = useState(0);
  const [editStartAp,   setEditStartAp]   = useState<'am'|'pm'>('am');
  const [editEndH,      setEditEndH]      = useState(10);
  const [editEndM,      setEditEndM]      = useState(0);
  const [editEndAp,     setEditEndAp]     = useState<'am'|'pm'>('am');

  useEffect(() => {
    if (event) {
      setMode('view'); setDeleting(false); setConfirmDelete(false); setSaving(false);
      setEditTitle(event.title || '');
      const parts = (event.notes || '').split(' | ');
      setEditNotes(parts[0] || '');
      setEditLocation(parts.length > 1 ? parts[parts.length - 1] : '');
      setEditRepeat(event.repeat_rule || 'Never');
      setEditAlert(event.alert_rule || 'None');
      setEditAssignees(event.assignees || []);
      if (event.start_time) {
        const mins = isoToMinutes(event.start_time);
        const h24 = Math.floor(mins / 60); const m = mins % 60;
        setEditStartH(h24 === 0 ? 12 : h24 > 12 ? h24-12 : h24);
        setEditStartM(m);
        setEditStartAp(h24 >= 12 ? 'pm' : 'am');
      }
      if (event.end_time) {
        const mins = isoToMinutes(event.end_time);
        const h24 = Math.floor(mins / 60); const m = mins % 60;
        setEditEndH(h24 === 0 ? 12 : h24 > 12 ? h24-12 : h24);
        setEditEndM(m);
        setEditEndAp(h24 >= 12 ? 'pm' : 'am');
      }
    }
  }, [event?.id]);

  if (!event) return null;

  const toH24 = (h: number, ap: 'am'|'pm') =>
    ap === 'pm' ? (h===12 ? 12 : h+12) : (h===12 ? 0 : h);

  const saveEdit = async () => {
    setSaving(true);
    try {
      const pad = (n: number) => String(n).padStart(2,'0');
      const sh24 = toH24(editStartH, editStartAp);
      const eh24 = toH24(editEndH, editEndAp);
      const dateStr = event.date || localDateStr();
      const updates: any = {
        title: editTitle.trim() || event.title,
        notes: [editNotes.trim(), editLocation.trim()].filter(Boolean).join(' | '),
        repeat_rule: editRepeat, alert_rule: editAlert,
        assignees: editAssignees,
        start_time: `${dateStr}T${pad(sh24)}:${pad(editStartM)}:00`,
        end_time:   `${dateStr}T${pad(eh24)}:${pad(editEndM)}:00`,
      };
      let { error } = await supabase.from('events').update(updates).eq('id', event.id);
      if (error && (error.message?.includes('assignees') || error.code==='42703')) {
        const { assignees: _a, ...slim } = updates;
        const r2 = await supabase.from('events').update(slim).eq('id', event.id);
        error = r2.error;
      }
      if (!error) { onReload(); onClose(); }
      setSaving(false);
    } catch { setSaving(false); }
  };

  const doDelete = async () => {
    setDeleting(true);
    await supabase.from('events').delete().eq('id', event.id);
    onDeleted();
  };

  const assignedMembers = getEvAssignees(event);
  const accent = getMemberColor(event.assignees);

  return (
    <Modal visible={!!event} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex:1, backgroundColor:'#fff' }} edges={['top']}>
        <KeyboardAvoidingView style={{ flex:1 }} behavior={Platform.OS==='ios' ? 'padding' : 'height'}>
          <View style={s.modalHdr}>
            <TouchableOpacity onPress={onClose} hitSlop={{ top:12,bottom:12,left:12,right:12 }}>
              <Text style={s.modalCancel}>{mode==='edit' ? '← Back' : 'Close'}</Text>
            </TouchableOpacity>
            <Text style={s.modalTitle}>{mode==='view' ? 'Event' : 'Edit Event'}</Text>
            {mode==='view'
              ? <TouchableOpacity onPress={() => setMode('edit')} hitSlop={{ top:12,bottom:12,left:12,right:12 }}>
                  <Text style={s.modalSave}>Edit</Text>
                </TouchableOpacity>
              : <TouchableOpacity onPress={saveEdit} disabled={saving} hitSlop={{ top:12,bottom:12,left:12,right:12 }}>
                  <Text style={[s.modalSave, saving && { opacity:0.35 }]}>{saving ? 'Saving…' : 'Save'}</Text>
                </TouchableOpacity>
            }
          </View>
          <ScrollView contentContainerStyle={{ paddingBottom:48 }} keyboardShouldPersistTaps="handled">
            {/* Tinted header */}
            <View style={{ backgroundColor:accent+'14', padding:20, paddingTop:14 }}>
              {mode==='view'
                ? <Text style={{ fontFamily:'Poppins_700Bold', fontSize:22, color:INK, letterSpacing:-0.3 }}>{event.title}</Text>
                : <TextInput style={{ fontFamily:'Poppins_600SemiBold', fontSize:20, color:INK, borderBottomWidth:1.5, borderBottomColor:accent, paddingBottom:6 }}
                    value={editTitle} onChangeText={setEditTitle} placeholder="Event title" placeholderTextColor={INK3}/>
              }
              {assignedMembers.length > 0 && (
                <View style={{ flexDirection:'row', gap:5, marginTop:10 }}>
                  {assignedMembers.map((m: any) => (
                    <View key={m.id} style={{ flexDirection:'row', alignItems:'center', gap:5, backgroundColor:m.color+'20', borderRadius:20, paddingHorizontal:10, paddingVertical:4 }}>
                      <View style={{ width:8, height:8, borderRadius:4, backgroundColor:m.color }}/>
                      <Text style={{ fontFamily:'Poppins_600SemiBold', fontSize:12, color:m.color }}>{m.name}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
            {mode==='view' ? (
              <View>
                {event.start_time && (
                  <View style={s.detailRow}>
                    <Text style={s.detailIcon}>🕐</Text>
                    <Text style={s.detailTxt}>{fmtTime(event.start_time)}{event.end_time ? ` → ${fmtTime(event.end_time)}` : ''}</Text>
                  </View>
                )}
                {(() => {
                  const parts = (event.notes || '').split(' | ');
                  const loc  = parts.length > 1 ? parts[parts.length - 1] : '';
                  const note = parts[0] || '';
                  return (<>
                    {loc ? <View style={s.detailRow}><Text style={s.detailIcon}>📍</Text><Text style={s.detailTxt}>{loc}</Text></View> : null}
                    {note ? <View style={s.detailRow}><Text style={s.detailIcon}>📝</Text><Text style={s.detailTxt}>{note}</Text></View> : null}
                  </>);
                })()}
                <View style={{ padding:20, gap:10 }}>
                  {!confirmDelete
                    ? <TouchableOpacity style={s.deleteBtn} onPress={() => setConfirmDelete(true)} activeOpacity={0.8}>
                        <Text style={s.deleteBtnTxt}>Delete event</Text>
                      </TouchableOpacity>
                    : <TouchableOpacity style={[s.deleteBtn, s.deleteBtnConfirm]} onPress={doDelete} disabled={deleting} activeOpacity={0.8}>
                        <Text style={s.deleteBtnTxt}>{deleting ? 'Deleting…' : 'Tap again to confirm delete'}</Text>
                      </TouchableOpacity>
                  }
                </View>
              </View>
            ) : (
              <View style={{ padding:20, gap:14 }}>
                <View style={s.gcBlock}>
                  <View style={s.gcRow}>
                    <Text style={s.gcRowLbl}>Start</Text>
                    <TimePill hour={editStartH} minute={editStartM} ampm={editStartAp} onHour={setEditStartH} onMinute={setEditStartM} onAmpm={setEditStartAp}/>
                  </View>
                  <View style={s.gcSep}/>
                  <View style={s.gcRow}>
                    <Text style={s.gcRowLbl}>End</Text>
                    <TimePill hour={editEndH} minute={editEndM} ampm={editEndAp} onHour={setEditEndH} onMinute={setEditEndM} onAmpm={setEditEndAp}/>
                  </View>
                </View>
                <View style={s.gcBlock}>
                  <View style={s.gcRow}>
                    <Text style={s.gcRowLbl}>Repeat</Text>
                    <DropdownPicker options={REPEAT_OPTIONS} value={editRepeat} onChange={setEditRepeat}/>
                  </View>
                  <View style={s.gcSep}/>
                  <View style={s.gcRow}>
                    <Text style={s.gcRowLbl}>Alert</Text>
                    <DropdownPicker options={ALERT_OPTIONS} value={editAlert} onChange={setEditAlert}/>
                  </View>
                </View>
                <View style={s.gcBlock}>
                  <View style={{ flexDirection:'row', alignItems:'center', paddingHorizontal:16, paddingVertical:14, gap:10 }}>
                    <Text style={{ fontSize:16, width:22, textAlign:'center' }}>📍</Text>
                    <TextInput style={[s.gcSubInput, { flex:1, paddingHorizontal:0, paddingVertical:0 }]}
                      value={editLocation} onChangeText={setEditLocation}
                      placeholder="Location (optional)" placeholderTextColor={INK3}/>
                  </View>
                  <View style={s.gcSep}/>
                  <TextInput style={s.gcSubInput} value={editNotes} onChangeText={setEditNotes}
                    placeholder="Notes" placeholderTextColor={INK3} multiline numberOfLines={3} textAlignVertical="top"/>
                </View>
                <Text style={{ fontFamily:'Poppins_600SemiBold', fontSize:13, color:'rgba(10,10,10,0.5)' }}>Who is this for?</Text>
                {FAMILY_MEMBERS.map(m => {
                  const on = editAssignees.includes(m.id);
                  return (
                    <TouchableOpacity key={m.id}
                      style={[s.memberRow, on && { borderColor:m.color+'40', backgroundColor:m.color+'08' }]}
                      onPress={() => setEditAssignees(prev => prev.includes(m.id) ? prev.filter(x=>x!==m.id) : [...prev, m.id])}
                      activeOpacity={0.8}>
                      <View style={[s.memberDot, { backgroundColor:m.color }]}/>
                      <Text style={s.memberName}>{m.name}</Text>
                      <View style={[s.memberCheck, on && { backgroundColor:m.color, borderColor:m.color }]}>
                        {on && <Text style={{ color:'#fff', fontSize:12, fontFamily:'Poppins_700Bold' }}>✓</Text>}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

// ── Brief cache ────────────────────────────────────────────────────────────
let cachedBriefText: string | null = null;
let cachedBriefSub:  string | null = null;
let cachedBriefSeed: string | null = null;
let lastBriefTime:   number | null = null;

// ── TOOLS & EXECUTOR ───────────────────────────────────────────────────────
const DUMMY_FAMILY_ID_HOME = '00000000-0000-0000-0000-000000000001';

const TOOLS = [
  { name:'add_calendar_event',
    description:'Add a single event to the family calendar. Use immediately when you have title + time.',
    input_schema:{ type:'object', properties:{
      title:      { type:'string', description:'Event title' },
      start_time: { type:'string', description:'ISO 8601 local time e.g. 2026-03-26T09:00:00' },
      end_time:   { type:'string', description:'ISO 8601 local end time' },
      notes:      { type:'string' },
      assignees:  { type:'array', items:{ type:'string' }, description:'Family member names to assign e.g. ["Anna","Rich"]. If not specified, defaults to Rich only. Use names: Anna, Rich, Poppy, Gab, Duke.' },
    }, required:['title','start_time'] } },
  { name:'update_calendar_event',
    description:'Update/reschedule an existing event. Always use this instead of adding a new one when editing. IMPORTANT: If user specifies a new end time, always include new_end_time. If user only specifies start time, omit new_end_time to preserve duration.',
    input_schema:{ type:'object', properties:{
      search_title:   { type:'string', description:'Title to search for (partial match ok)' },
      search_date:    { type:'string', description:'YYYY-MM-DD — use this to find the right occurrence when multiple exist (e.g. tomorrow)' },
      new_title:      { type:'string' },
      new_start_time: { type:'string', description:'ISO 8601 local e.g. 2026-03-26T13:00:00 — MUST include full date+time' },
      new_end_time:   { type:'string', description:'ISO 8601 local — include this when user explicitly specifies an end time' },
      new_date:       { type:'string', description:'YYYY-MM-DD — use when only changing the date, not the time' },
      new_notes:      { type:'string' },
      new_assignees:  { type:'array', items:{ type:'string' }, description:'Family member names to assign. Use names: Anna, Rich, Poppy, Gab, Duke. To ADD someone, include all current people plus the new one. To REMOVE someone, list only the people who should remain.' },
    }, required:['search_title'] } },
  { name:'delete_calendar_event',
    description:'Delete a calendar event by title.',
    input_schema:{ type:'object', properties:{
      search_title:{ type:'string' },
      date:        { type:'string', description:'YYYY-MM-DD to narrow to specific occurrence' },
    }, required:['search_title'] } },
  { name:'add_todo',
    description:'Add a task or to-do item.',
    input_schema:{ type:'object', properties:{
      title:    { type:'string' },
      priority: { type:'string', enum:['normal','urgent'] },
      due_date: { type:'string', description:'YYYY-MM-DD' },
      assignee: { type:'string' },
    }, required:['title'] } },
  { name:'add_shopping_item',
    description:'Add an item to the shopping list.',
    input_schema:{ type:'object', properties:{
      name:     { type:'string' },
      category: { type:'string', description:'Produce, Dairy, Meat, Pantry, Frozen, Bakery, Drinks, Household, Other' },
      quantity: { type:'string' },
    }, required:['name'] } },
];

async function executeTool(name: string, input: any): Promise<string> {
  try {
    if (name === 'add_calendar_event') {
      const raw = (input.start_time || '').replace('Z','').split('+')[0];
      // Robust date extraction — never let dateOnly be empty
      let dateOnly = raw.includes('T') ? raw.split('T')[0] : raw.slice(0,10);
      if (!dateOnly || dateOnly.length < 8) {
        const n = new Date();
        dateOnly = `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`;
      }
      const localDt = raw.includes('T') ? raw : `${dateOnly}T09:00:00`;
      // Simple end_time: start + 1 hour, no regex
      let endDt = localDt;
      if (input.end_time) {
        endDt = input.end_time.replace('Z','').split('+')[0];
      } else {
        try {
          const startMs = new Date(localDt).getTime();
          const endMs = startMs + 60 * 60 * 1000;
          const e = new Date(endMs);
          const pad = (n: number) => String(n).padStart(2,'0');
          endDt = `${e.getFullYear()}-${pad(e.getMonth()+1)}-${pad(e.getDate())}T${pad(e.getHours())}:${pad(e.getMinutes())}:00`;
        } catch { endDt = localDt; }
      }
      // Map family member names → IDs
      const NAME_TO_ID: Record<string,string> = {
        anna:'1', rich:'2', richard:'2', poppy:'3', gab:'4', gabriel:'4', duke:'5',
      };
      let assigneeIds: string[] = ['2']; // default: Rich
      if (input.assignees && Array.isArray(input.assignees) && input.assignees.length > 0) {
        const mapped = input.assignees
          .map((n: string) => NAME_TO_ID[n.toLowerCase().trim()])
          .filter(Boolean);
        if (mapped.length > 0) assigneeIds = mapped;
      }
      const row: any = {
        family_id:  DUMMY_FAMILY_ID_HOME,
        title:      input.title,
        date:       dateOnly,
        start_time: localDt,
        end_time:   endDt,
        notes:      input.notes || '',
        timezone:   'Australia/Brisbane',
        assignees:  assigneeIds,
      };
      let { error } = await supabase.from('events').insert(row);
      // If assignees column causes error, retry without it
      if (error && (error.message?.includes('assignees') || error.code === '42703')) {
        console.warn('[executeTool] assignees column issue, retrying without it');
        const { assignees: _a, ...slim } = row;
        const r2 = await supabase.from('events').insert(slim);
        error = r2.error;
      }
      if (error) {
        console.error('[executeTool] add_calendar_event FAILED:', JSON.stringify(error));
        return `TOOL_FAILED: Couldn't save "${input.title}" — ${error.message}`;
      }
      return `✅ "${input.title}" added on ${dateOnly} at ${localDt.split('T')[1]?.slice(0,5) ?? 'the time you specified'}.`;
    }
    if (name === 'update_calendar_event') {
      console.log('[DEBUG] update_calendar_event called with:', JSON.stringify(input));
      let updateQuery = supabase.from('events').select('id,title,date,start_time,end_time,assignees')
        .eq('family_id', DUMMY_FAMILY_ID_HOME)
        .ilike('title', `%${input.search_title}%`);
      if (input.search_date) updateQuery = (updateQuery as any).eq('date', input.search_date);
      const { data } = await (updateQuery as any).order('date').limit(1);
      if (!data || data.length === 0) return `Couldn't find an event matching "${input.search_title}".`;
      const t = data[0];
      const u: any = {};
      if (input.new_title)      u.title = input.new_title;
      if (input.new_notes)      u.notes = input.new_notes;
      if (input.new_assignees && Array.isArray(input.new_assignees)) {
        const NAME_TO_ID: Record<string,string> = {
          anna:'1', rich:'2', richard:'2', poppy:'3', gab:'4', gabriel:'4', duke:'5',
        };
        const mapped = input.new_assignees
          .map((n: string) => NAME_TO_ID[n.toLowerCase().trim()])
          .filter(Boolean);
        if (mapped.length > 0) {
          // Merge with existing assignees — union of old + new, no duplicates
          const existing: string[] = Array.isArray(t.assignees) ? t.assignees : [];
          const merged = Array.from(new Set([...existing, ...mapped]));
          u.assignees = merged;
        }
      }
      if (input.new_start_time) {
        u.start_time = input.new_start_time.replace('Z','').split('+')[0];
        u.date = u.start_time.split('T')[0];
        if (!input.new_end_time && t.start_time && t.end_time) {
          const oldStart = new Date(t.start_time).getTime();
          const oldEnd   = new Date(t.end_time).getTime();
          const duration = oldEnd - oldStart;
          if (duration > 0) {
            const newEnd = new Date(new Date(u.start_time).getTime() + duration);
            const pad = (n: number) => String(n).padStart(2,'0');
            u.end_time = `${newEnd.getFullYear()}-${pad(newEnd.getMonth()+1)}-${pad(newEnd.getDate())}T${pad(newEnd.getHours())}:${pad(newEnd.getMinutes())}:00`;
          }
        }
      }
      if (input.new_date) {
        u.date = input.new_date;
        if (t.start_time) u.start_time = `${input.new_date}T${t.start_time.split('T')[1]||'09:00:00'}`;
        if (t.end_time)   u.end_time   = `${input.new_date}T${t.end_time.split('T')[1]||'10:00:00'}`;
      }
      if (input.new_end_time) u.end_time = input.new_end_time.replace('Z','').split('+')[0];
      console.log('[DEBUG] update payload:', JSON.stringify(u), '— event id:', t.id);
      // Guard: if nothing to update, tell Claude clearly
      if (Object.keys(u).length === 0) {
        return `TOOL_FAILED: No valid fields to update — Claude did not send new_assignees, new_title, new_start_time, new_date, new_end_time, or new_notes.`;
      }
      let { error } = await supabase.from('events').update(u).eq('id', t.id);
      if (error && (error.message?.includes('assignees') || error.code === '42703')) {
        const { assignees: _a, ...slim } = u;
        const r2 = await supabase.from('events').update(slim).eq('id', t.id);
        error = r2.error;
      }
      if (error) { console.error('[executeTool] update error:', JSON.stringify(error)); throw error; }
      const what = input.new_assignees ? `assignees updated to: ${input.new_assignees.join(', ')}` : input.new_title ? `renamed to "${input.new_title}"` : 'updated';
      return `✅ "${input.new_title || t.title}" — ${what}.`;
    }
    if (name === 'delete_calendar_event') {
      let q = supabase.from('events').select('id,title,date').eq('family_id', DUMMY_FAMILY_ID_HOME).ilike('title', `%${input.search_title}%`);
      if (input.date) q = (q as any).eq('date', input.date);
      const { data } = await (q as any).order('date').limit(1);
      if (!data || data.length === 0) return `Couldn't find "${input.search_title}".`;
      await supabase.from('events').delete().eq('id', data[0].id);
      return `✅ **${data[0].title}** deleted.`;
    }
    if (name === 'add_todo') {
      const now = new Date();
      const { error } = await supabase.from('todos').insert({
        family_id: DUMMY_FAMILY_ID_HOME, title: input.title,
        priority: input.priority || 'normal', status: 'active',
        due_date: input.due_date || null, created_at: now.toISOString(),
      });
      if (error) throw error;
      return `✅ **${input.title}** added to your to-do list.`;
    }
    if (name === 'add_shopping_item') {
      const { error } = await supabase.from('shopping_items').insert({
        family_id: DUMMY_FAMILY_ID_HOME, name: input.name,
        category: input.category || 'Other', quantity: input.quantity || '',
        checked: false, is_food: false,
      });
      if (error) throw error;
      return `✅ **${input.name}** added to the shopping list.`;
    }
    return `Tool ${name} not yet implemented.`;
  } catch (e: any) {
    console.error(`[executeTool] ${name} threw:`, e?.message);
    return `TOOL_FAILED: Something went wrong with ${name} — ${e?.message ?? 'unknown error'}`;
  }
}

const CAPABILITY_RULES = `CRITICAL TOOL RULES:
- USE TOOLS IMMEDIATELY when you have enough info. Never say "I'll add that" — just add it.
- For "tomorrow" use tomorrow's actual date (today is provided in the system prompt).
- update_calendar_event: use this to change time/date/assignees. NEVER delete and re-add.
- When adding a person to an event, use new_assignees and include ALL people who should be on the event (existing + new). The executor merges automatically, but include everyone to be safe.
- If a tool result starts with "TOOL_FAILED", tell the user honestly it didn't work and suggest they try again or add it manually. Never claim success if the tool failed.
- If a tool call succeeds, confirm briefly ("Done — Anna's now on the gym session ✅").
- Zaeli CANNOT make phone calls or send messages autonomously.`;

// ── Main component ─────────────────────────────────────────────────────────
export default function HomeScreen() {
  const router    = useRouter();
  const params    = useLocalSearchParams<{ autoMic?: string; seedMessage?: string; calendarScan?: string }>();
  const scrollRef = useRef<ScrollView>(null);
  const inputRef  = useRef<TextInput>(null);
  const now       = new Date();
  const h         = now.getHours();
  const dateLabel = now.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' });

  const [menuOpen,        setMenuOpen]        = useState(false);
  const [messages,        setMessages]        = useState<Msg[]>([]);
  const [input,           setInput]           = useState('');
  const [loading,         setLoading]         = useState(false);
  const [isRecording,     setIsRecording]     = useState(false);
  const [micTimer,        setMicTimer]        = useState(0); // seconds elapsed
  const micTimerRef       = useRef<ReturnType<typeof setInterval> | null>(null);
  const micOverlayAnim    = useRef(new Animated.Value(0)).current;
  const [showScrollBtn,   setShowScrollBtn]   = useState(false);
  const [briefReplies,    setBriefReplies]    = useState<string[]>([]);
  const [briefHero,       setBriefHero]       = useState<string>('');
  const [briefSeed,       setBriefSeed]       = useState('');
  const [showAddSheet,    setShowAddSheet]    = useState(false);
  const [pendingImage,    setPendingImage]    = useState<string | null>(null);
  const [thumbs,          setThumbs]          = useState<Record<string, 'up'|'down'|null>>({});
  const [keyboardOpen,    setKeyboardOpen]    = useState(false);
  const [liveCamera,      setLiveCamera]      = useState(false);
  const [placeholderIdx,  setPlaceholderIdx]  = useState(0);
  const [selectedEvent,   setSelectedEvent]   = useState<any>(null); // for EventDetailModal
  const [screen,          setScreen]          = useState<'splash'|'entry'|'chat'>('splash');
  const [entryRecording,  setEntryRecording]  = useState(false);
  const [entryProcessing, setEntryProcessing] = useState(false);

  const PLACEHOLDERS = ['Chat with Zaeli…', 'Or just speak…', 'Chat with Zaeli…', 'Ask anything…'];

  const waveAnims = useRef(Array.from({ length: 13 }, () => new Animated.Value(0.3))).current;
  const waveLoopRef        = useRef<Animated.CompositeAnimation | null>(null);
  const scrollBtnAnim      = useRef(new Animated.Value(0)).current;
  const pillsAnim          = useRef(new Animated.Value(1)).current;
  const sheetAnim          = useRef(new Animated.Value(320)).current;
  const splashOpacity      = useRef(new Animated.Value(1)).current;
  const entryOpacity       = useRef(new Animated.Value(0)).current;
  const chatOpacity        = useRef(new Animated.Value(0)).current;
  const starScale          = useRef(new Animated.Value(0.4)).current;
  const wordmarkOpacity    = useRef(new Animated.Value(0)).current;
  const recordingRef       = useRef<Audio.Recording | null>(null);
  const isAtBottom         = useRef(true);
  const lastImageDesc      = useRef<string>('');
  const lastSendRef        = useRef<string>('');
  const handledScanRef     = useRef<string | null>(null);

  const FOCUS_CHIPS = [
    { emoji: '📅', label: "What's on today",    sub: 'Calendar · schedule · reminders',  seed: "What's on today?" },
    { emoji: '🛒', label: 'Shopping & meals',   sub: 'List · pantry · dinner tonight',   seed: 'Give me a shopping and meals update.' },
    { emoji: '✅', label: 'What needs doing',   sub: 'Tasks · urgent · slipping',        seed: "What's most pressing right now?" },
    { emoji: '👧', label: 'Kids & family',      sub: 'Jobs · homework · activities',     seed: 'How are the kids and family going?' },
    { emoji: '🌅', label: "What's coming up",   sub: 'Week ahead · events · plan',       seed: "What's coming up this week?" },
  ];

  // ── Splash → Chat ─────────────────────────────────────────────────────────
  useEffect(() => {
    Animated.spring(starScale, { toValue: 1, useNativeDriver: true, tension: 60, friction: 8 }).start();
    setTimeout(() => {
      Animated.timing(wordmarkOpacity, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    }, 250);
    setTimeout(() => {
      Animated.timing(splashOpacity, { toValue: 0, duration: 400, useNativeDriver: true })
        .start(() => { setScreen('chat'); chatOpacity.setValue(1); generateBrief(true); });
    }, 3000);
  }, []);

  function enterChat(topic?: string) {
    Animated.parallel([
      Animated.timing(entryOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      Animated.timing(chatOpacity,  { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start(() => { setScreen('chat'); generateBrief(true, topic); });
  }

  // ── Keyboard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const show = Keyboard.addListener('keyboardWillShow', () => {
      setKeyboardOpen(true);
      Animated.timing(pillsAnim, { toValue: 0, duration: 180, useNativeDriver: true }).start();
    });
    const hide = Keyboard.addListener('keyboardWillHide', () => {
      setKeyboardOpen(false);
      Animated.timing(pillsAnim, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    });
    return () => { show.remove(); hide.remove(); };
  }, []);

  // ── Placeholder cycling ───────────────────────────────────────────────────
  useEffect(() => {
    if (input.length > 0 || isRecording) return;
    const timer = setInterval(() => setPlaceholderIdx(i => (i + 1) % PLACEHOLDERS.length), 4000);
    return () => clearInterval(timer);
  }, [input, isRecording]);

  // ── Scroll helpers ────────────────────────────────────────────────────────
  function scrollToEnd(animated = true) {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated }), 80);
  }
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

  // ── Message helpers ───────────────────────────────────────────────────────
  function addMsg(partial: Partial<Msg>): string {
    const msg: Msg = { id: uid(), role: 'zaeli', text: '', ts: nowTs(), ...partial };
    setMessages(prev => [...prev, msg]);
    if (isAtBottom.current) scrollToEnd();
    return msg.id;
  }
  function updateMsg(id: string, patch: Partial<Msg>) {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, ...patch } : m));
    if (isAtBottom.current) scrollToEnd();
  }
  function handleCopy(text: string) { Clipboard.setString(text); }
  async function handleForward(text: string) { try { await Share.share({ message: text }); } catch {} }
  function handleThumb(msgId: string, dir: 'up'|'down') {
    setThumbs(prev => ({ ...prev, [msgId]: prev[msgId] === dir ? null : dir }));
  }

  // ── Build live context ────────────────────────────────────────────────────
  async function buildContext() {
    const td = localDateStr(now);
    const frame = h < 6 ? 'late night' : h < 12 ? 'morning' : h < 17 ? 'afternoon' : h < 21 ? 'evening' : 'night';
    const timeStr = now.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' });
    try {
      const [
        { count: shopCount },
        { data: shopItems },
        { data: events },
        { count: todoCount },
        { data: meals },
      ] = await Promise.all([
        supabase.from('shopping_items').select('*',{count:'exact',head:true}).eq('family_id',DUMMY_FAMILY_ID_HOME).eq('checked',false),
        supabase.from('shopping_items').select('name').eq('family_id',DUMMY_FAMILY_ID_HOME).eq('checked',false).limit(50),
        supabase.from('events').select('title,date,start_time').eq('family_id',DUMMY_FAMILY_ID_HOME).gte('date',td).lte('date', localDateStr(new Date(Date.now() + 7*24*60*60*1000))).order('date').order('start_time').limit(20),
        supabase.from('todos').select('*',{count:'exact',head:true}).eq('family_id',DUMMY_FAMILY_ID_HOME).eq('done',false),
        supabase.from('meal_plans').select('meal_name,date').eq('family_id',DUMMY_FAMILY_ID_HOME).gte('date',td).limit(7),
      ]);
      const shopNames = shopItems?.map((i:any) => i.name).join(', ') || '';
      const shopStr   = shopCount
        ? `${shopCount} items — ${shopNames}${(shopCount??0) > 50 ? ` + ${(shopCount??0) - 50} more` : ''}`
        : 'list is clear';
      const evStr = events?.length
        ? events.map((e:any) => `${e.title} (${naturalDate(e.date,td)}${e.start_time?' at '+fmtTime(e.start_time):''})`).join(', ')
        : 'nothing on the calendar';
      const mealToday = meals?.find((m:any)=>m.date===td)?.meal_name ?? null;
      const dinnerRule = h < 19
        ? mealToday ? `Dinner sorted — ${mealToday} tonight.` : "Dinner tonight isn't planned — mention warmly if relevant."
        : h < 21 ? "Don't mention tonight's dinner — too late. Tomorrow's is fair game." : "Don't mention dinner.";

      // Pre-compute next 7 days for tool-calling date accuracy
      const nextDays: Record<string,string> = {};
      for (let i = 0; i <= 7; i++) {
        const d = new Date(now); d.setDate(d.getDate() + i);
        const key = i === 0 ? 'today' : i === 1 ? 'tomorrow' : d.toLocaleDateString('en-AU',{weekday:'long'}).toLowerCase();
        nextDays[key] = localDateStr(d);
      }
      const datesCtx = Object.entries(nextDays).map(([k,v]) => `${k} = ${v}`).join(', ');

      const system = `You are Zaeli — a smart, warm, and quietly witty AI for a modern Australian family. You are confident, observant, and playful. You are a teammate, not just an assistant — when Rich's tired or crushing it, you're in it with him.

PERSONALITY: A smart, capable, slightly mischievous best friend who is always one step ahead. Dry when the moment calls for it. Warm when it matters. Energetic and encouraging when Rich needs a boost. Occasionally surprising. Never try-hard, never corporate.

POSITIVITY: Zaeli genuinely believes in this family and lets it show. Celebrate small wins, acknowledge hard days, notice effort. Make Rich feel good about his day, his family, himself.

VOICE: Vary tone deliberately. Humour is subtle. Never the same rhythm twice.

EMOJIS: Use 1–2 per message when the moment calls for it. Never decorative padding.

BEHAVIOUR: Guide, suggest, and anticipate. Think ahead on Rich's behalf. Feel like a teammate alongside Rich, not a service.

FAMILY: Rich (logged in), Anna, Poppy (Yr6, age 12), Gab (Yr4, age 10, boy), Duke (Yr1, age 8, boy).

LIVE DATA:
- Date: ${dateLabel} (${frame}, ${timeStr})
- Dates: ${datesCtx}
- Calendar: ${evStr}
- Shopping list: ${shopStr}
- To-dos: ${todoCount??0} open tasks
- ${dinnerRule}

CAPABILITIES: Add/update/delete calendar events, shopping items, todos DIRECTLY using tools — no confirmation needed, just do it. Today is ${td}. Never tell Rich to do it himself — you handle it immediately.

FORMAT: 2–4 sentences by default. Always natural flowing prose. No bullet points, no lists, no asterisks, no markdown. Never start with "I". Never say "mate". Never say "Of course!", "Absolutely!", or any hollow affirmation. Never invent facts.`;
      return { system, mealToday, shopCount: shopCount??0, shopStr, evStr, todoCount: todoCount??0, td };
    } catch {
      const td = localDateStr(now);
      return { system: `You are Zaeli — smart, warm, witty AI teammate for Rich's Australian family. Camaraderie, warmth, occasional dry wit. Prose only, no lists, no "mate". Today is ${td}.`, mealToday: null, shopCount:0, shopStr:'unknown', evStr:'nothing on calendar', todoCount:0, td };
    }
  }

  // ── Generate brief ────────────────────────────────────────────────────────
  async function generateBrief(force = false, focusHint?: string) {
    const elapsed = lastBriefTime ? Date.now() - lastBriefTime : Infinity;
    if (!force && elapsed < 30*60*1000 && cachedBriefText) {
      const cached = JSON.parse(cachedBriefText);
      setBriefHero(cached.hero ?? '');
      addMsg({ role:'zaeli', text: cached.detail, isBrief:true, isLoading:false, quickReplies: cached.replies });
      setBriefReplies(cached.replies ?? []);
      setBriefSeed(cachedBriefSeed ?? '');
      return;
    }
    lastBriefTime = Date.now();
    const loadId = addMsg({ role:'zaeli', text:'', isBrief:true, isLoading:true });
    try {
      const { system } = await buildContext();
      const isLate = h >= 21 || h < 6;
      const focusInstruction = focusHint
        ? `\nFOCUS: ${MEMBER_NAME} tapped "${focusHint}". Lead with that topic in both hero and detail.`
        : '';
      const briefSys = `${system}

You are Zaeli, writing the opening home screen message for ${MEMBER_NAME}.

PERSONA: Sharp, warm, genuinely enthusiastic about this family. You notice things others miss and find the funny angle through delight, not detachment. You celebrate small wins, spot the chaos before it arrives, and feel right in it with the family — never observing from a distance. Energy matches the moment: get-up-and-go in the morning, calm and settled at night. A touch of sass — through timing and observation, never forced, never at ${MEMBER_NAME}'s expense. Funny because you pay attention, not because you're trying to be clever.

BANNED WORDS AND PHRASES: "queued up", "locked in", "tidy", "sorted", "lined up", "on the cards", "all set", "looking good", "in play", "absolutely", "of course", "great question", "stacked neatly", "ambush", "sprint", "chaos", "suitcase", "packing into", "chaotic". Never start with "I". Never say "mate".

BE PROPORTIONATE: Zaeli's observations must match reality. A normal day with gaps is a good thing — find warmth in it, do not manufacture drama. A light day should feel light. A busy day should feel energising, not catastrophic. Never invent stress or tension that is not in the data.

STRUCTURE — two distinct parts:

PART 1 — HERO (2 sentences, DM Serif italic feel):
- Sentence 1: Find the ANGLE or IRONY in the day's data. Not a list. Not a summary. The observation that makes ${MEMBER_NAME} see the day differently. Sharp, specific, alive.
- Sentence 2: One warm personal detail that grounds it — a name, a time, a specific thing. Makes it feel like Zaeli actually knows this family.
- Wrap 2-3 key words in [square brackets] — these render italic for emphasis
- Max 30 words total across both sentences
- Must make ${MEMBER_NAME} smile or feel genuinely seen — if it wouldn't, rewrite it
- No greeting prefix. Straight into it.
${isLate ? '- It is late — calm and settled energy only. One warm observation about tomorrow. Nothing about tonight.' : ''}

PART 2 — DETAIL (2 sentences max, Poppins prose):
- Sentence 1: One warm layer that adds colour or a Zaeli moment — a short natural observation with light humour or insight. Never a repeat of the hero.
- Sentence 2: A confident specific offer. Zaeli leads — she does not ask permission. Use "Say the word and I'll..." or "I can..." — never "Want me to...?" or bare open questions.
- Plain text only. No asterisks, no lists, no markdown.

PROACTIVE AWARENESS (use this to make the hero and detail feel alive):
Scan the next 7 days of calendar data and look for:
- Things 2-3 days away that need prep — dinner plans, early starts, packed bags, school events
- First-occurrence or unusual events — school photos, excursions, medical appointments
- Conflicts or tight turnarounds worth flagging — two things back to back, a busy day after a late night
- Anything that would catch the family off guard if they hadn't thought about it yet
Weave ONE of these observations naturally into the hero or detail if relevant. Never list them all — pick the single most useful thing. If nothing jumps out, ignore this instruction.
${focusInstruction}

CHIPS — exactly 3, sound like things ${MEMBER_NAME} would actually say out loud, not navigation labels:
- Natural speech: "How bad is tomorrow really?" not "Check tomorrow"
- Natural speech: "Anything I'm missing?" not "View calendar"
- Natural speech: "What needs doing tonight?" not "Show to-dos"
- 3-6 words, no punctuation, no emoji

Return ONLY valid JSON (no markdown, no backticks):
{"hero":"[2 sentence hero]","detail":"[2 sentence detail]","replies":["chip 1","chip 2","chip 3"],"seed":"natural Zaeli follow-up response to the first chip, in full Zaeli voice"}`;

      const raw    = await callGPT(briefSys, [{ role:'user', content:'Generate now.' }], 600, 'home_brief');
      const parsed = JSON.parse(raw.replace(/```json|```/g,'').trim());
      const hero    = parsed.hero    ?? `${dateLabel} — let's see what the day has in store.`;
      const detail  = parsed.detail  ?? `Here's what's coming up, ${MEMBER_NAME}.`;
      const replies = parsed.replies ?? ["What's on today", "Check the list", "All sorted"];
      const seed    = parsed.seed    ?? replies[0] ?? "What's on today?";
      cachedBriefText = JSON.stringify({ hero, detail, replies });
      cachedBriefSeed = seed;
      setBriefHero(hero);
      updateMsg(loadId, { text: detail, isLoading: false, quickReplies: replies });
      setBriefReplies(replies);
      setBriefSeed(seed);
      // Scroll to top so greeting + hero are visible on load
      setTimeout(() => scrollRef.current?.scrollTo({ y: 0, animated: false }), 120);
    } catch (e) {
      console.error('Brief error:', e);
      const fallbackReplies = ["What's on today", "Check the list", "All good"];
      setBriefHero(`${dateLabel}.`);
      updateMsg(loadId, { text: `Ready when you are, ${MEMBER_NAME}.`, isLoading: false, quickReplies: fallbackReplies });
      setBriefReplies(fallbackReplies);
    }
  }

  // ── Refresh calendar events on focus (zero API cost) ─────────────────────
  // Called when returning from Calendar channel or after saving in EventDetailModal.
  // Re-fetches the Supabase rows for any events already shown in the chat thread
  // and patches messages state in-place — no GPT call, no visible flicker.
  const refreshCalendarEvents = useCallback(async () => {
    setMessages(prev => {
      // Find messages that have inline calendar events
      const hasCal = prev.some(m => m.inlineData?.type === 'calendar' && (m.inlineData.items?.length ?? 0) > 0);
      if (!hasCal) return prev; // nothing to refresh
      // Collect all event IDs across all calendar messages
      const allIds = prev
        .flatMap(m => m.inlineData?.type === 'calendar' ? (m.inlineData.items ?? []) : [])
        .map((e: any) => e.id)
        .filter(Boolean);
      if (allIds.length === 0) return prev;
      // Fire async fetch — update state once done
      supabase
        .from('events')
        .select('id, title, date, start_time, end_time, notes, assignees, all_day')
        .in('id', allIds)
        .then(({ data }) => {
          if (!data || data.length === 0) return;
          const byId: Record<string, any> = {};
          data.forEach((e: any) => { byId[e.id] = e; });
          setMessages(current => current.map(m => {
            if (m.inlineData?.type !== 'calendar' || !m.inlineData.items || m.inlineData.items.length === 0) return m;
            const updated = m.inlineData.items.map((e: any) => byId[e.id] ?? e);
            // Remove any events that were deleted (not returned by Supabase)
            const filtered = updated.filter((e: any) => byId[e.id]);
            return {
              ...m,
              inlineData: {
                ...m.inlineData,
                items: filtered.length > 0 ? filtered : undefined,
              },
            };
          }));
        })
        .catch(() => {}); // silent fail — stale data is acceptable
      return prev; // return prev immediately, state patched async above
    });
  }, []);

  useFocusEffect(useCallback(() => {
    if (params.autoMic === 'true') {
      const t = setTimeout(() => { startRecording(); }, 800);
      return () => clearTimeout(t);
    }
    if (params.calendarScan === 'true') {
      const imgUri = getPendingCalendarImage();
      if (imgUri && handledScanRef.current !== imgUri) {
        handledScanRef.current = imgUri;
        setPendingCalendarImage(null);
        const t = setTimeout(() => {
          setScreen('chat');
          chatOpacity.setValue(1); entryOpacity.setValue(0);
          setLoading(false);
          setTimeout(() => { send('Please help add this to the calendar.', imgUri); }, 200);
        }, 500);
        return () => clearTimeout(t);
      }
    }
    if (params.seedMessage) {
      const msg = params.seedMessage as string;
      const t = setTimeout(() => {
        const uMsg: Msg = { id: uid(), role:'user', text: msg, ts: nowTs() };
        setMessages(prev => [...prev, uMsg]);
        setScreen('chat');
        chatOpacity.setValue(1); entryOpacity.setValue(0);
        const replyId = uid();
        setMessages(prev => [...prev, { id: replyId, role:'zaeli', text:'', isLoading:true, ts: nowTs() }]);
        const sysPrompt = `You are Zaeli, warm Australian family assistant. You CAN add events to the calendar using tools. Rich said: "${msg}". Reply in 1 sentence — ask what you need to take action. Give 3 short quick reply chips. Return ONLY JSON: {"main":"...","replies":["...","...","..."]}`;
        callGPT(sysPrompt, [{ role:'user', content: msg }], 200, 'calendar_context')
          .then(raw => {
            try {
              const parsed = JSON.parse(raw.replace(/```json|```/g,'').trim());
              updateMsg(replyId, { text: parsed.main ?? raw, isLoading: false, quickReplies: parsed.replies });
            } catch { updateMsg(replyId, { text: raw, isLoading: false }); }
          })
          .catch(() => updateMsg(replyId, { text: "I'm here — what would you like to add?", isLoading: false }));
      }, 400);
      return () => clearTimeout(t);
    }
    if (screen !== 'chat') return;
    const elapsed = lastBriefTime ? Date.now() - lastBriefTime : Infinity;
    if (elapsed > 30 * 60 * 1000 && messages.length > 0) {
      setMessages([]);
      lastImageDesc.current = '';
      splashOpacity.setValue(1); entryOpacity.setValue(0); chatOpacity.setValue(0);
      starScale.setValue(0.4); wordmarkOpacity.setValue(0);
      setScreen('splash');
      Animated.spring(starScale, { toValue: 1, useNativeDriver: true, tension: 60, friction: 8 }).start();
      setTimeout(() => Animated.timing(wordmarkOpacity, { toValue: 1, duration: 500, useNativeDriver: true }).start(), 250);
      setTimeout(() => {
        Animated.timing(splashOpacity, { toValue: 0, duration: 400, useNativeDriver: true })
          .start(() => { setScreen('chat'); chatOpacity.setValue(1); generateBrief(true); });
      }, 3000);
    } else {
      // Silently refresh any inline calendar events shown in the thread
      refreshCalendarEvents();
    }
  }, [params.autoMic, params.seedMessage]));

  function handleQuickReply(chip: string) { send(chip); }

  // ── Send ───────────────────────────────────────────────────────────────────
  async function send(overrideText?: string, overrideImage?: string) {
    const text = (overrideText ?? input).trim();
    const imageUri = overrideImage || pendingImage || undefined;
    if ((!text && !imageUri) || loading) return;
    const sendKey = `${text}|${imageUri || ''}|${Date.now().toString().slice(0,-3)}`;
    if (lastSendRef.current === sendKey) return;
    lastSendRef.current = sendKey;
    const uMsg: Msg = { id: uid(), role: 'user', text: text || '', imageUri, ts: nowTs() };
    const history = [...messages, uMsg];
    setMessages(history); setInput(''); setPendingImage(null);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    const replyId = addMsg({ role:'zaeli', text:'', isLoading:true });
    setLoading(true);
    try {
      const { system, td } = await buildContext();

      // ── Read image upfront ──────────────────────────────────────────────
      let imageBase64 = '';
      let imageMimeType = 'image/jpeg';
      if (imageUri) {
        try {
          const ext = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
          const mimeMap: Record<string,string> = { jpg:'image/jpeg', jpeg:'image/jpeg', png:'image/png', heic:'image/jpeg', heif:'image/jpeg' };
          imageBase64 = await FileSystem.readAsStringAsync(imageUri, { encoding: 'base64' as any });
          imageMimeType = mimeMap[ext] || 'image/jpeg';
        } catch(e) { console.error('[send] Image read FAILED:', e); }
      }

      // ── Vision describe ────────────────────────────────────────────────
      let imageDescription = '';
      if (imageUri && imageBase64) {
        try {
          const claudeKey = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? '';
          const descRes = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: { 'Content-Type':'application/json', 'x-api-key':claudeKey, 'anthropic-version':'2023-06-01' },
            body: JSON.stringify({
              model: 'claude-sonnet-4-20250514', max_tokens: 300,
              messages: [{ role:'user', content:[
                { type:'image', source:{ type:'base64', media_type:imageMimeType, data:imageBase64 } },
                { type:'text', text:'Describe this image in 2 sentences. Focus on any text, dates, times, or event names visible.' },
              ]}],
            }),
          });
          const descJson = await descRes.json();
          imageDescription = descJson?.content?.[0]?.text || '';
          lastImageDesc.current = imageDescription;
          logVision(descJson?.usage?.input_tokens ?? 0, descJson?.usage?.output_tokens ?? 0);
        } catch(e) { console.log('Vision describe failed:', e); }
      } else if (lastImageDesc.current) {
        imageDescription = lastImageDesc.current;
      }

      const imgCtx = imageDescription ? `\nIMAGE CONTEXT: ${imageDescription}` : '';

      // ── Calendar query path ────────────────────────────────────────────
      const calQuery = isCalendarQuery(text);
      console.log('[DEBUG] isCalendarQuery:', calQuery, '| text:', text);
      if (!imageUri && text && calQuery) {

        // Full calendar requests → show today/tomorrow inline + portal pill to Calendar
        if (isFullCalendarRequest(text)) {
          const { eventsRaw } = await fetchEventsForContext(2);
          const td = localDateStr();
          const tomorrow = localDateStr(new Date(Date.now() + 86400000));
          const todayEvents = eventsRaw.filter((e: any) => e.date === td);
          const tomorrowEvents = eventsRaw.filter((e: any) => e.date === tomorrow);
          const showEvents = todayEvents.length > 0 ? todayEvents : tomorrowEvents;
          const dayLabel = todayEvents.length > 0 ? 'today' : 'tomorrow';
          const intro = showEvents.length > 0
            ? `Here's what's on ${dayLabel} — tap any event for details, or head to Calendar for the full picture.`
            : `Nothing locked in for today or tomorrow. The Calendar channel has the full view.`;
          updateMsg(replyId, {
            text: intro,
            inlineData: {
              type: 'calendar',
              intro,
              items: showEvents.slice(0, 5),
              followUp: '',
              showPortalPill: true,
            },
            quickReplies: ["What's on this week", 'Add an event', "What's coming up"],
            isLoading: false,
          });
          setLoading(false);
          return;
        }

        const fetchDays = getEventFetchDays(text);
        const { eventsJson, eventsRaw } = await fetchEventsForContext(fetchDays);

        const calSys = `${system}${imgCtx}

CALENDAR DATA (next ${fetchDays} days):
${eventsJson}

The user is asking a calendar question. Respond with ONLY valid JSON (no markdown, no backticks):

TIME-OF-DAY RULES (critical):
- After 9pm: ONE short warm sentence in intro about tomorrow only. No analysis of tonight. followUp is empty string "". Calm and settled tone.
- Before 9am: Lead with energy — what's first, what needs to be ready.
- Otherwise: normal warm Zaeli voice.

PERSONA: Sharp, warm, genuinely enthusiastic. Finds the funny angle through delight not detachment. Never dry or detached. Energy matches the moment.
BANNED: "queued up", "locked in", "tidy", "sorted", "lined up", "all set". Never start with "I". Never say "mate".

1. "intro": 1-2 sentences in Zaeli's voice. Find the angle or observation — not just a list of what's there. Specific, warm, alive.
2. "events": Array of the most relevant event objects from CALENDAR DATA — copy id, title, date, start_time, end_time, notes, assignees exactly. Maximum 5 events. Most relevant to the query only.
3. "followUp": 1 sentence only. A confident specific offer using "Say the word and I'll..." or "I can..." — never "Want me to...?". Empty string "" if after 9pm.
4. "replies": Exactly 3 chips that sound like things a person would say out loud — not navigation labels:
   - "How tight is the afternoon?" not "Check afternoon"
   - "Anything clashing?" not "View clashes"
   - "What can actually move?" not "Reschedule"
   - Always 3-6 words, no punctuation.

If NO matching events: set events to [] and write a warm Zaeli response in intro. followUp offers something specific.

{"intro":"...","events":[...max 5 event objects...],"followUp":"...","replies":["chip 1","chip 2","chip 3"]}`;

        const raw = await callGPT(calSys, [{ role:'user', content: text }], 2000, 'home_calendar');
        try {
          const parsed = JSON.parse(raw.replace(/```json|```/g,'').trim());
          const calEvents: any[] = (parsed.events ?? []).slice(0, 5).map((pe: any) => {
            // Match parsed event to raw event data so we have full Supabase row
            const match = eventsRaw.find((r: any) => r.id === pe.id);
            return match ?? pe;
          });
          updateMsg(replyId, {
            text: parsed.intro ?? '',
            inlineData: {
              type: 'calendar',
              intro: parsed.intro ?? '',
              items: calEvents.length > 0 ? calEvents : undefined,
              followUp: parsed.followUp ?? '',
              showPortalPill: true,
            },
            quickReplies: parsed.replies ?? [],
            isLoading: false,
          });
        } catch {
          // JSON parse failed — fall through to plain text
          updateMsg(replyId, { text: raw, isLoading: false });
        }
        setLoading(false);
        return;
      }

      // ── Standard tool-aware Anthropic call ────────────────────────────
      const histMsgs = history.slice(-12).map(m => ({
        role: m.role === 'zaeli' ? 'assistant' as const : 'user' as const,
        content: m.imageUri
          ? `[User shared a photo] ${m.text}`.trim()
          : m.inlineData?.type === 'calendar' && m.inlineData.items && m.inlineData.items.length > 0
            // For calendar messages, reconstruct context so Claude knows what events were shown
            ? `${m.inlineData.intro || ''} [Events shown: ${m.inlineData.items.map((e: any) => `"${e.title}" on ${e.date} at ${e.start_time?.split('T')[1]?.slice(0,5) ?? ''} (assignees: ${JSON.stringify(e.assignees)})`).join(', ')}] ${m.inlineData.followUp || ''}`.trim()
            : (m.text || '(message)'),
      }));

      const anthropicKey = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? '';
      const toolSys = system + imgCtx + '\n\n' + CAPABILITY_RULES;

      const msgContent: any = imageUri && imageBase64
        ? [
            { type:'image', source:{ type:'base64', media_type:imageMimeType, data: imageBase64 }},
            { type:'text', text: text || 'Please describe what you see.' }
          ]
        : text || '(message)';

      const apiMessages = [
        ...histMsgs.slice(0, -1).map(m => ({ role: m.role, content: m.content as string })),
        { role: 'user' as const, content: msgContent },
      ];

      console.log('[DEBUG] Sending to Claude. Last 3 messages:', JSON.stringify(apiMessages.slice(-3)));
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type':'application/json', 'x-api-key': anthropicKey, 'anthropic-version':'2023-06-01' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1024,
          system: toolSys,
          tools: TOOLS,
          messages: apiMessages,
        }),
      });
      const data = await res.json();
      console.log('[DEBUG] Claude stop_reason:', data.stop_reason, '| content types:', data.content?.map((b:any) => b.type).join(','));

      // Log claude usage
      const claudePt = data?.usage?.input_tokens ?? 0;
      const claudeCt = data?.usage?.output_tokens ?? 0;
      logApiCall({ family_id: FAMILY_ID, feature: 'home_chat', model: 'claude-sonnet-4-20250514', input_tokens: claudePt, output_tokens: claudeCt, cost_usd: (claudePt/1e6*CLAUDE_IN_PER_M)+(claudeCt/1e6*CLAUDE_OUT_PER_M) });

      if (data.stop_reason === 'tool_use') {
        const toolUses = data.content.filter((b: any) => b.type === 'tool_use');
        const toolResults: string[] = [];
        for (const tu of toolUses) {
          const result = await executeTool(tu.name, tu.input);
          toolResults.push(result);
        }
        const toolResultContent = toolUses.map((tu: any, i: number) => ({
          type: 'tool_result', tool_use_id: tu.id, content: toolResults[i]
        }));
        const followUp = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type':'application/json', 'x-api-key': anthropicKey, 'anthropic-version':'2023-06-01' },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514', max_tokens: 300, system: toolSys, tools: TOOLS,
            messages: [...apiMessages, { role:'assistant', content: data.content }, { role:'user', content: toolResultContent }],
          }),
        });
        const followData = await followUp.json();
        const followText = followData.content?.find((b: any) => b.type === 'text')?.text ?? toolResults.join('\n');
        updateMsg(replyId, { text: followText, isLoading: false });
      } else {
        const reply = data.content?.find((b: any) => b.type === 'text')?.text ?? 'Something went wrong — try again?';
        updateMsg(replyId, { text: reply, isLoading: false });
      }
    } catch (e) {
      console.error('send error:', e);
      updateMsg(replyId, { text: "Something went wrong — try that again?", isLoading: false });
    } finally { setLoading(false); }
  }

  // ── Recording ─────────────────────────────────────────────────────────────
  async function startRecording() {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) return;
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      recordingRef.current = recording;
      setIsRecording(true);
      setMicTimer(0);
      // Fade overlay in
      Animated.timing(micOverlayAnim, { toValue: 1, duration: 220, useNativeDriver: true }).start();
      // Start timer
      micTimerRef.current = setInterval(() => setMicTimer(t => t + 1), 1000);
    } catch (e) { console.error('startRecording:', e); }
  }
  async function stopRecording(cancel = false) {
    try {
      setIsRecording(false);
      // Stop timer and fade overlay out
      if (micTimerRef.current) { clearInterval(micTimerRef.current); micTimerRef.current = null; }
      Animated.timing(micOverlayAnim, { toValue: 0, duration: 180, useNativeDriver: true }).start();
      if (!recordingRef.current) return;
      const status = await recordingRef.current.getStatusAsync();
      const durationSec = (status as any)?.durationMillis ? (status as any).durationMillis / 1000 : 10;
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      if (!uri || cancel) return; // cancel = discard recording
      const key = process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? '';
      if (!key) return;
      logWhisper(durationSec);
      const form = new FormData();
      form.append('file', { uri, type:'audio/m4a', name:'audio.m4a' } as any);
      form.append('model', 'whisper-1');
      const resp = await fetch(WHISPER_URL, { method:'POST', headers:{ Authorization:`Bearer ${key}` }, body: form });
      const data = await resp.json();
      const transcript = data?.text?.trim() ?? '';
      if (!transcript) return;
      if (screen !== 'chat') { enterChat(transcript); } else { send(transcript); }
    } catch (e) { console.error('stopRecording:', e); }
  }
  function handleMicPress() { if (isRecording) stopRecording(); else startRecording(); }

  // ── Sheet ─────────────────────────────────────────────────────────────────
  function openSheet() {
    setShowAddSheet(true);
    Animated.spring(sheetAnim, { toValue:0, useNativeDriver:true, tension:65, friction:11 }).start();
  }
  function closeSheet(cb?: () => void) {
    Animated.timing(sheetAnim, { toValue:320, duration:200, useNativeDriver:true }).start(() => {
      setShowAddSheet(false); if (cb) setTimeout(cb, 350);
    });
  }
  async function openCamera() {
    closeSheet(async () => {
      try {
        const { granted } = await ImagePicker.requestCameraPermissionsAsync(); if (!granted) return;
        const r = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality:0.85 });
        if (!r.canceled && r.assets?.[0]) setPendingImage(r.assets[0].uri);
      } catch {}
    });
  }
  async function openPhotos() {
    closeSheet(async () => {
      try {
        const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync(); if (!granted) return;
        const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality:0.85 });
        if (!r.canceled && r.assets?.[0]) setPendingImage(r.assets[0].uri);
      } catch {}
    });
  }

  // ── renderMessages ─────────────────────────────────────────────────────────
  function renderMessages() {
    return messages.map((msg, i) => {
      // ── User bubble ──
      if (msg.role === 'user') {
        return (
          <View key={msg.id} style={[s.userMsgWrap, { marginTop: 18 }]}>
            {msg.isVoice && (
              <View style={s.voiceLabel}>
                <IcoMic color={T.ink3}/>
                <Text style={[s.voiceLabelTxt, { color: T.ink3 }]}>Voice message</Text>
              </View>
            )}
            {msg.imageUri && <Image source={{ uri: msg.imageUri }} style={s.msgImage} resizeMode="cover"/>}
            {!!msg.text && (
              <View style={[s.userBubble, { backgroundColor: T.userBubble }]}>
                <Text style={[s.userMsgText, { color: T.userText }]}>{msg.text}</Text>
              </View>
            )}
            <View style={s.userIconRow}>
              <Text style={[s.msgTime, { color: T.ink3 }]}>{msg.ts}</Text>
              <TouchableOpacity style={s.iconBtn} onPress={() => handleCopy(msg.text)} activeOpacity={0.6}><IcoCopy color={T.ink3}/></TouchableOpacity>
              <TouchableOpacity style={s.iconBtn} onPress={() => handleForward(msg.text)} activeOpacity={0.6}><IcoForward color={T.ink3}/></TouchableOpacity>
            </View>
          </View>
        );
      }

      // ── Zaeli message ──
      const prevMsg = i > 0 ? messages[i - 1] : null;
      const showEyebrow = !prevMsg || prevMsg.role === 'user';
      const thumbState = thumbs[msg.id] || null;

      // Check if this is a calendar inline render message
      // Also true when showPortalPill is set — so the block renders even with no events
      const hasCalendarEvents = !msg.isLoading && msg.inlineData?.type === 'calendar' && ((msg.inlineData.items?.length ?? 0) > 0 || !!msg.inlineData.showPortalPill);

      // Clean text for paragraph render
      const cleanText = msg.text ? msg.text.replace(/\[([^\]]+)\]/g, '$1') : '';
      const paragraphs = cleanText
        ? cleanText.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean)
        : [];

      // For calendar messages: intro text is in inlineData.intro, followUp in inlineData.followUp
      // msg.text may also contain intro for plain text fallback
      const introText = msg.inlineData?.intro ?? '';
      const followUpText = msg.inlineData?.followUp ?? '';
      const introParagraphs = introText
        ? introText.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean)
        : [];
      const followUpParagraphs = followUpText
        ? followUpText.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean)
        : [];

      return (
        <View key={msg.id} style={[s.zaeliMsgWrap, !showEyebrow && { marginTop: 6 }]}>
          {showEyebrow ? (
            <View style={s.zEyebrow}>
              <View style={[s.zStar, { backgroundColor: T.zaeliAi }]}>
                <Svg width="9" height="9" viewBox="0 0 16 16" fill="white"><Path d="M8 1L9.5 6.5L15 8L9.5 9.5L8 15L6.5 9.5L1 8L6.5 6.5L8 1Z"/></Svg>
              </View>
              <Text style={[s.zName, { color: T.zaeliAi }]}>Zaeli</Text>
              <Text style={[s.zTs, { color: T.ink3 }]}>{msg.ts}</Text>
            </View>
          ) : (
            <Text style={[s.zTsOnly, { color: T.ink3 }]}>{msg.ts}</Text>
          )}

          {/* Loading dots */}
          {msg.isLoading ? (
            <TypingDots color={HOME_AI}/>
          ) : hasCalendarEvents ? (
            /* ── CALENDAR INLINE RENDER ── */
            <View>
              {/* Intro text */}
              {introParagraphs.map((para, pi) => (
                <Text key={pi} style={[s.zaeliMsgText, { color: T.ink }, pi < introParagraphs.length - 1 && { marginBottom: 10 }]}>
                  {para}
                </Text>
              ))}

              {/* Event cards */}
              {(msg.inlineData!.items?.length ?? 0) > 0 && (
                <View style={s.calCardsWrap}>
                  {msg.inlineData!.items!.map((ev: any) => (
                    <EventCard
                      key={ev.id ?? ev.title}
                      ev={ev}
                      onPress={() => setSelectedEvent(ev)}
                    />
                  ))}
                </View>
              )}

              {/* Portal pill — open Calendar channel */}
              {msg.inlineData?.type === 'calendar' && msg.inlineData.showPortalPill === true && (
                <TouchableOpacity
                  style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', backgroundColor: CAL_BG, borderRadius:14, paddingVertical:13, paddingHorizontal:16, marginTop:10 }}
                  onPress={() => router.navigate('/(tabs)/calendar')}
                  activeOpacity={0.8}
                >
                  <Text style={{ fontFamily:'Poppins_600SemiBold', fontSize:14, color:'#0A0A0A' }}>Open Calendar</Text>
                  <Text style={{ fontFamily:'Poppins_700Bold', fontSize:18, color:'#0A0A0A' }}>{'→'}</Text>
                </TouchableOpacity>
              )}

              {/* Follow-up text */}
              {followUpParagraphs.map((para, pi) => (
                <Text key={pi} style={[s.zaeliMsgText, { color: T.ink, marginTop: pi === 0 ? 10 : 0 }, pi < followUpParagraphs.length - 1 && { marginBottom: 10 }]}>
                  {para}
                </Text>
              ))}

              {/* Quick reply chips — conversation continuations only */}
              {!msg.isLoading && (msg.quickReplies ?? []).length > 0 && (
                <View style={s.quickRepliesWrap}>
                  <View style={s.qrChips}>
                    {(msg.quickReplies ?? []).map((chip, ci) => (
                      <TouchableOpacity
                        key={ci}
                        style={[s.qrChip, { borderColor:'rgba(10,10,10,0.18)' }]}
                        onPress={() => handleQuickReply(chip)}
                        activeOpacity={0.7}
                      >
                        <Text style={s.qrChipTxt}>{chip}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </View>
          ) : (
            /* ── Standard text render ── */
            <View>
              {paragraphs.map((para, pi) => (
                <Text key={pi} style={[s.zaeliMsgText, { color: T.ink }, pi < paragraphs.length - 1 && { marginBottom: 10 }]}>
                  {para}
                </Text>
              ))}
            </View>
          )}

          {/* Quick reply chips — non-calendar, non-brief messages only */}
          {!msg.isLoading && !hasCalendarEvents && !msg.isBrief && (msg.quickReplies ?? []).length > 0 && (
            <View style={s.quickRepliesWrap}>
              <View style={s.qrChips}>
                {(msg.quickReplies ?? []).map((chip, ci) => (
                  <TouchableOpacity
                    key={ci}
                    style={[s.qrChip, { borderColor:'rgba(10,10,10,0.18)' }]}
                    onPress={() => handleQuickReply(chip)}
                    activeOpacity={0.7}
                  >
                    <Text style={s.qrChipTxt}>{chip}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Icon row — non-brief completed messages only */}
          {!msg.isLoading && !msg.isBrief && (
            <View style={s.zaeliIconRow}>
              <Text style={[s.msgTime, { color: T.ink3, marginRight: 6 }]}>{msg.ts}</Text>
              <TouchableOpacity style={s.iconBtn} activeOpacity={0.6}><IcoPlay color={T.ink3}/></TouchableOpacity>
              <TouchableOpacity style={s.iconBtn} onPress={() => handleCopy(msg.text)} activeOpacity={0.6}><IcoCopy color={T.ink3}/></TouchableOpacity>
              <TouchableOpacity style={s.iconBtn} onPress={() => handleForward(msg.text)} activeOpacity={0.6}><IcoForward color={T.ink3}/></TouchableOpacity>
              <TouchableOpacity style={s.iconBtn} onPress={() => handleThumb(msg.id,'up')} activeOpacity={0.6}><IcoThumbUp color={thumbState==='up' ? HOME_AI : T.ink3}/></TouchableOpacity>
              <TouchableOpacity style={s.iconBtn} onPress={() => handleThumb(msg.id,'down')} activeOpacity={0.6}><IcoThumbDown color={thumbState==='down' ? T.ink2 : T.ink3}/></TouchableOpacity>
            </View>
          )}
        </View>
      );
    });
  }

  // ── Entry handlers ────────────────────────────────────────────────────────
  const greeting = h < 12 ? 'Morning' : h < 17 ? 'Hey' : h < 21 ? 'Evening' : 'Hey';
  const greetingSub = h < 12 ? 'How can I help you today?'
    : h < 17 ? 'How can I help you this afternoon?'
    : h < 21 ? 'How can I help you tonight?'
    : 'What do you need before tomorrow?';

  async function handleEntryMicStart() {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) return;
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      recordingRef.current = recording;
      setEntryRecording(true);
      const loops = waveAnims.map((anim, i) =>
        Animated.loop(Animated.sequence([
          Animated.delay(i * 60),
          Animated.timing(anim, { toValue: 1, duration: 400 + (i % 4) * 80, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0.15, duration: 400 + (i % 3) * 80, useNativeDriver: true }),
        ]))
      );
      waveLoopRef.current = Animated.parallel(loops);
      waveLoopRef.current.start();
    } catch (e) { console.error('entry mic start:', e); }
  }

  async function handleEntryMicStop() {
    waveLoopRef.current?.stop();
    waveAnims.forEach(a => a.setValue(0.3));
    setEntryProcessing(true);
    try {
      if (!recordingRef.current) { _finishEntry(); return; }
      const status = await recordingRef.current.getStatusAsync();
      const durationSec = (status as any)?.durationMillis ? (status as any).durationMillis / 1000 : 10;
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      if (!uri) { _finishEntry(); return; }
      const key = process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? '';
      if (!key) { _finishEntry(); return; }
      logWhisper(durationSec);
      const form = new FormData();
      form.append('file', { uri, type:'audio/m4a', name:'audio.m4a' } as any);
      form.append('model', 'whisper-1');
      const resp = await fetch(WHISPER_URL, { method:'POST', headers:{ Authorization:`Bearer ${key}` }, body: form });
      const data = await resp.json();
      const transcript = data?.text?.trim() ?? '';
      _finishEntry(transcript);
    } catch (e) { console.error('entry mic stop:', e); _finishEntry(); }
  }

  function _finishEntry(transcript?: string) {
    Animated.parallel([
      Animated.timing(entryOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      Animated.timing(chatOpacity,  { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start(() => {
      setEntryRecording(false); setEntryProcessing(false); setScreen('chat');
      if (transcript) {
        setTimeout(() => {
          const voiceMsg: Msg = { id: uid(), role:'user', text: transcript, isVoice: true, ts: nowTs() };
          setMessages([voiceMsg]);
          isAtBottom.current = true;
          const replyId = uid();
          setMessages(prev => [...prev, { id: replyId, role:'zaeli', text:'', isLoading:true, ts: nowTs() }]);
          setLoading(true);
          buildContext().then(({ system }) => {
            const histMsgs = [{ role: 'user' as const, content: transcript }];
            callGPT(system, histMsgs, 500)
              .then(reply => {
                setMessages(prev => prev.map(m => m.id === replyId ? { ...m, text: reply, isLoading: false } : m));
              })
              .catch(() => {
                setMessages(prev => prev.map(m => m.id === replyId ? { ...m, text: "Something went wrong — try that again?", isLoading: false } : m));
              })
              .finally(() => setLoading(false));
          });
        }, 100);
      } else { generateBrief(true); }
    });
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={[s.root, { backgroundColor: T.bannerBg }]}>
      <ExpoStatusBar style={T.statusBar} animated/>
      <NavMenu visible={menuOpen} onClose={() => setMenuOpen(false)}/>

      {/* EventDetailModal — renders on top of everything */}
      <EventDetailModal
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        onDeleted={() => { setSelectedEvent(null); refreshCalendarEvents(); }}
        onReload={() => { setSelectedEvent(null); refreshCalendarEvents(); }}
      />

      {/* ── SPLASH ── */}
      {screen !== 'chat' && (
        <Animated.View style={[s.splashWrap, { opacity: splashOpacity, zIndex: screen === 'splash' ? 20 : 10 }]} pointerEvents={screen === 'splash' ? 'auto' : 'none'}>
          <SafeAreaView style={{ flex:1, alignItems:'center', justifyContent:'center' }} edges={['top']}>
            <View style={s.splashOrb1}/>
            <View style={s.splashOrb2}/>
            <Animated.View style={{ opacity: wordmarkOpacity, alignItems:'center', gap:10 }}>
              <Text style={s.splashGreeting}>{h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'}, {MEMBER_NAME} 👋</Text>
            </Animated.View>
            <Animated.View style={[{ transform:[{ scale: starScale }], alignItems:'center', marginTop:8 }]}>
              <Text style={s.splashWordmark}>
                z<Text style={{ color:'#FAC8A8' }}>a</Text>el<Text style={{ color:'#FAC8A8' }}>i</Text>
              </Text>
            </Animated.View>
            <Animated.View style={{ opacity: wordmarkOpacity, alignItems:'center', gap:20, marginTop:16 }}>
              <Text style={s.splashTagline}>LESS CHAOS. MORE FAMILY.</Text>
              <View style={s.splashDots}><TypingDots color="#FAC8A8"/></View>
            </Animated.View>
          </SafeAreaView>
        </Animated.View>
      )}

      {/* ── ENTRY ── */}
      {screen !== 'chat' && (
        <Animated.View style={[s.entryWrap, { opacity: entryOpacity, zIndex: screen === 'entry' ? 20 : 5 }]} pointerEvents={screen === 'entry' ? 'auto' : 'none'}>
          <SafeAreaView style={{ flex:1, flexDirection:'column' }} edges={['top','bottom']}>
            <View style={s.splashOrb1}/>
            <View style={s.entryOrb2}/>
            {(entryRecording || entryProcessing) ? (
              <View style={s.entryRecordingWrap}>
                <Text style={s.entryListeningLbl}>{entryProcessing ? 'Got it —' : 'Listening…'}</Text>
                <Text style={s.entryListeningSub}>{entryProcessing ? 'Just a second…' : 'Speak naturally — take your time.'}</Text>
                <View style={s.entryMicRingWrap}>
                  <View style={[s.entryMicRing1, entryProcessing && { borderColor:'rgba(255,255,255,0.2)' }]}/>
                  <View style={[s.entryMicRing2, entryProcessing && { borderColor:'rgba(255,255,255,0.1)' }]}/>
                  <TouchableOpacity style={s.entryMicBig} onPress={handleEntryMicStop} activeOpacity={0.85}>
                    <IcoMic color="#fff" size={36}/>
                  </TouchableOpacity>
                </View>
                <View style={s.entryWaveWrap}>
                  {waveAnims.map((anim, i) => (
                    <Animated.View key={i} style={[s.entryWaveBar, { transform:[{ scaleY: anim }] }]}/>
                  ))}
                </View>
                {!entryProcessing && (
                  <Text style={s.entryStopHint}>
                    <Text style={{ color:'#fff', fontFamily:'Poppins_600SemiBold' }}>Tap the mic</Text>{' '}when you're done.
                  </Text>
                )}
                {entryProcessing && <View style={{ flexDirection:'row', gap:6, alignItems:'center' }}><TypingDots color="rgba(255,255,255,0.6)"/></View>}
              </View>
            ) : (
              <>
                <View style={s.entryContent}>
                  <View style={s.entryStarBox}>
                    <Svg width="22" height="22" viewBox="0 0 16 16" fill="white"><Path d="M8 1L9.5 6.5L15 8L9.5 9.5L8 15L6.5 9.5L1 8L6.5 6.5L8 1Z"/></Svg>
                  </View>
                  <Text style={s.entryGreeting1}>{greeting}, {MEMBER_NAME}!</Text>
                  <Text style={s.entryGreeting2}>{greetingSub}</Text>
                  <Text style={s.entrySub}>Speak or tap a topic below.</Text>
                  <TouchableOpacity style={s.entryMicCard} onPress={handleEntryMicStart} activeOpacity={0.85}>
                    <View style={s.entryMicIcon}><IcoMic color="#fff"/></View>
                    <View style={{ flex:1 }}>
                      <Text style={s.entryMicTitle}>Speak to Zaeli</Text>
                      <Text style={s.entryMicSub}>"What's on today?" · "What's for dinner?"</Text>
                    </View>
                    <View style={s.entryWaveStatic}>
                      {[7,13,9,17,11].map((ht, i) => <View key={i} style={[s.entryWaveBarStatic, { height: ht }]}/>)}
                    </View>
                  </TouchableOpacity>
                  <View style={s.entryDivider}>
                    <View style={s.entryDivLine}/>
                    <Text style={s.entryDivTxt}>or tap a topic</Text>
                    <View style={s.entryDivLine}/>
                  </View>
                  <View style={s.entryChips}>
                    {FOCUS_CHIPS.map(chip => (
                      <TouchableOpacity key={chip.label} style={s.entryChip} onPress={() => enterChat(chip.seed)} activeOpacity={0.75}>
                        <Text style={s.entryChipEmoji}>{chip.emoji}</Text>
                        <Text style={s.entryChipTxt}>{chip.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <View style={[s.inputArea, { position:'relative', bottom:'auto' as any, paddingBottom: Platform.OS==='ios' ? 24 : 16 }]}>
                  <View style={[s.barPill, { backgroundColor:'#fff', borderColor:'rgba(10,10,10,0.09)' }]}>
                    <TouchableOpacity style={s.barBtn} onPress={() => {}} activeOpacity={0.75}><IcoPlus/></TouchableOpacity>
                    <View style={[s.barSep, { backgroundColor:'rgba(10,10,10,0.1)' }]}/>
                    <TextInput
                      style={[s.barInput, { color: INK }]}
                      placeholder="Ask Zaeli anything…"
                      placeholderTextColor="rgba(10,10,10,0.5)"
                      keyboardAppearance="light"
                      selectionColor={HOME_AI}
                      onSubmitEditing={(e) => { const txt = e.nativeEvent.text.trim(); if (txt) enterChat(txt); }}
                    />
                    <TouchableOpacity style={s.barBtn} onPress={handleEntryMicStart} activeOpacity={0.75}><IcoMic color={INK3}/></TouchableOpacity>
                    <TouchableOpacity style={s.barSend} onPress={() => enterChat()} activeOpacity={0.85}><IcoSend/></TouchableOpacity>
                  </View>
                </View>
              </>
            )}
          </SafeAreaView>
        </Animated.View>
      )}

      {/* ── MAIN CHAT ── */}
      <Animated.View style={[{ flex:1 }, screen === 'chat' ? {} : { opacity: chatOpacity }]} pointerEvents={screen === 'chat' ? 'auto' : 'none'}>

        {/* FIXED TOP BAR */}
        <SafeAreaView style={[s.topBar, { backgroundColor: T.bannerBg }]} edges={['top']}>
          <View style={s.topBarRow}>
            <TouchableOpacity onPress={() => router.navigate('/(tabs)/')} activeOpacity={0.8}>
              <Text style={s.logoWord}>
                z<Text style={{ color: HOME_AI }}>a</Text>el<Text style={{ color: HOME_AI }}>i</Text>
              </Text>
            </TouchableOpacity>
            <View style={s.topBarRight}>
              <Text style={s.topBarChannelName}>Home</Text>
              {/* DEV ONLY — remove pre-launch */}
              <TouchableOpacity onPress={() => router.navigate('/(tabs)/calendar')} activeOpacity={0.7}
                style={{ width:32, height:32, borderRadius:10, backgroundColor:'rgba(184,237,208,0.4)', alignItems:'center', justifyContent:'center' }}>
                <Text style={{ fontSize:16 }}>📅</Text>
              </TouchableOpacity>
              <View style={s.avatar}><Text style={s.avatarTxt}>R</Text></View>
            </View>
          </View>
          <View style={s.topBarDivider}/>
        </SafeAreaView>

        {/* CHAT */}
        <KeyboardAvoidingView
          style={s.kavWrap}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          <View style={[s.scrollWrap, { backgroundColor: T.bg }]}>
            <ScrollView
              ref={scrollRef}
              style={[s.scroll, { backgroundColor: T.bg }]}
              contentContainerStyle={s.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardDismissMode="interactive"
              onScroll={handleScroll}
              scrollEventThrottle={16}
              onContentSizeChange={() => {
                if (isAtBottom.current) scrollRef.current?.scrollToEnd({ animated: false });
              }}
            >
              {/* SCROLLABLE BRIEF SECTION */}
              <View style={[s.briefSection, { backgroundColor: T.bannerBg }]}>
                <Text style={s.briefGreeting}>
                  {h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'}, {MEMBER_NAME} 👋
                </Text>
                {briefHero ? (
                  <Text style={s.briefHero}>{renderHeroText(briefHero, HOME_AI)}</Text>
                ) : (
                  <View style={{ paddingVertical: 10 }}><TypingDots color={HOME_AI}/></View>
                )}
                {briefReplies.length > 0 && (
                  <View style={s.briefPills}>
                    {briefReplies.map((chip, i) => (
                      <TouchableOpacity
                        key={i}
                        style={[s.briefPill, { backgroundColor: getPillColor(chip) }]}
                        onPress={() => handleQuickReply(chip)}
                        activeOpacity={0.75}
                      >
                        <Text style={s.briefPillTxt}>{chip}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                <View style={s.briefDivider}/>
              </View>

              {/* Date divider */}
              <View style={s.dateRow}>
                <View style={[s.dateLine, { backgroundColor: T.dateLine }]}/>
                <Text style={[s.dateLabel, { color: T.ink3 }]}>{dateLabel.toUpperCase()}</Text>
                <View style={[s.dateLine, { backgroundColor: T.dateLine }]}/>
              </View>

              {renderMessages()}
              <View style={{ height: 16 }}/>
            </ScrollView>

            {showScrollBtn && (
              <Animated.View style={[s.scrollDownBtn, { opacity: scrollBtnAnim }]} pointerEvents="box-none">
                <TouchableOpacity style={s.scrollDownInner} onPress={() => scrollRef.current?.scrollToEnd({ animated:true })} activeOpacity={0.8}>
                  <IcoArrowDown/>
                </TouchableOpacity>
              </Animated.View>
            )}

            {/* FLOATING INPUT BAR */}
            <View style={[s.inputArea, keyboardOpen && s.inputAreaKb]}>
              {pendingImage && (
                <View style={s.imagePreviewWrap}>
                  <Image source={{ uri: pendingImage }} style={s.imagePreview} resizeMode="cover"/>
                  <TouchableOpacity style={s.imagePreviewRemove} onPress={() => setPendingImage(null)} activeOpacity={0.8}>
                    <IcoX/>
                  </TouchableOpacity>
                </View>
              )}
              <View style={[s.barPill, { backgroundColor: T.barBg, borderColor: T.barBorder }]}>
                <TouchableOpacity style={s.barBtn} onPress={openSheet} activeOpacity={0.75}><IcoPlus color={T.barIcon}/></TouchableOpacity>
                <View style={[s.barSep, { backgroundColor: T.barSep }]}/>
                <TextInput
                  ref={inputRef}
                  style={[s.barInput, { color: T.ink }]}
                  value={input}
                  onChangeText={setInput}
                  placeholder={PLACEHOLDERS[placeholderIdx]}
                  placeholderTextColor={T.barPh}
                  multiline
                  returnKeyType="default"
                  keyboardAppearance="light"
                  selectionColor={HOME_AI}
                  onFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated:true }), 350)}
                />
                {isRecording ? (
                  <TouchableOpacity style={[s.barWaveBtn, { backgroundColor: HOME_AI }]} onPress={handleMicPress} activeOpacity={0.85}>
                    <WaveformBars/>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={s.barMicBtn} onPress={handleMicPress} activeOpacity={0.75}>
                    <IcoMic color="#F5C8C8" size={26}/>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[s.barSend, ((!input.trim() && !pendingImage) || loading) && { opacity: 0.4 }]}
                  onPress={() => send()}
                  disabled={(!input.trim() && !pendingImage) || loading}
                  activeOpacity={0.85}
                >
                  <IcoSend/>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>

        {/* ADD SHEET */}
        <Modal visible={showAddSheet} transparent animationType="none" onRequestClose={() => closeSheet()}>
          <Pressable style={s.sheetOverlay} onPress={() => closeSheet()}>
            <Animated.View style={[s.sheet, { transform:[{ translateY:sheetAnim }] }]}>
              <Pressable onPress={() => {}}>
                <View style={s.sheetHandle}/>
                <View style={s.sheetHeader}>
                  <TouchableOpacity style={s.sheetCloseBtn} onPress={() => closeSheet()} activeOpacity={0.7}><IcoClose/></TouchableOpacity>
                  <Text style={s.sheetTitle}>Add to Chat</Text>
                  <View style={{ width:44 }}/>
                </View>
                <View style={s.sheetTiles}>
                  <TouchableOpacity style={s.sheetTile} onPress={openCamera} activeOpacity={0.75}><IcoCamera/><Text style={s.sheetTileLabel}>Camera</Text></TouchableOpacity>
                  <TouchableOpacity style={s.sheetTile} onPress={openPhotos} activeOpacity={0.75}><IcoPhotos/><Text style={s.sheetTileLabel}>Photos</Text></TouchableOpacity>
                  <TouchableOpacity style={s.sheetTile} onPress={() => { closeSheet(() => setLiveCamera(true)); }} activeOpacity={0.75}>
                    <Svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={INK} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <Circle cx="12" cy="12" r="3"/>
                      <Path d="M2 12C2 12 5 5 12 5s10 7 10 7-3 7-10 7S2 12 2 12z"/>
                    </Svg>
                    <Text style={s.sheetTileLabel}>Live</Text>
                  </TouchableOpacity>
                </View>
                <View style={{ height: Platform.OS === 'ios' ? 32 : 20 }}/>
              </Pressable>
            </Animated.View>
          </Pressable>
        </Modal>

        {/* LIVE CAMERA OVERLAY */}
        {liveCamera && (
          <View style={s.liveCameraOverlay}>
            <SafeAreaView style={{ flex:1 }} edges={['top']}>
              <View style={s.liveCameraTop}>
                <TouchableOpacity style={s.liveCameraClose} onPress={() => setLiveCamera(false)} activeOpacity={0.8}><IcoClose/></TouchableOpacity>
                <Text style={s.liveCameraTitle}>Live · Point & Ask</Text>
                <View style={{ width:44 }}/>
              </View>
              <View style={s.liveCameraBody}>
                <Text style={s.liveCameraHint}>Open your camera and ask Zaeli about anything you see</Text>
                <TouchableOpacity style={s.liveCameraBtn} onPress={async () => {
                  setLiveCamera(false);
                  await new Promise(r => setTimeout(r, 300));
                  openCamera();
                }} activeOpacity={0.85}>
                  <Text style={s.liveCameraBtnTxt}>Open Camera</Text>
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </View>
        )}

        {/* ── MIC RECORDING OVERLAY ── */}
        {isRecording && (
          <Animated.View
            style={[s.micOverlay, { opacity: micOverlayAnim }]}
            pointerEvents="auto"
          >
            <View style={s.micCard}>
              {/* Waveform */}
              <MicWaveform/>
              {/* Timer */}
              <Text style={s.micTimer}>
                {Math.floor(micTimer / 60)}:{String(micTimer % 60).padStart(2, '0')}
              </Text>
              {/* Label */}
              <Text style={s.micLabel}>Listening…</Text>
              {/* Stop button */}
              <TouchableOpacity
                style={s.micStopBtn}
                onPress={() => stopRecording(false)}
                activeOpacity={0.85}
              >
                <View style={s.micStopSquare}/>
              </TouchableOpacity>
              {/* Cancel */}
              <TouchableOpacity onPress={() => stopRecording(true)} activeOpacity={0.6}>
                <Text style={s.micCancel}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}
      </Animated.View>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex:1 },

  // Splash
  splashWrap:    { position:'absolute', top:0, left:0, right:0, bottom:0, backgroundColor:'#A8E8CC', alignItems:'center', justifyContent:'center' },
  splashOrb1:    { position:'absolute', width:420, height:420, borderRadius:210, backgroundColor:'rgba(255,255,255,0.18)', top:-140, right:-120 },
  splashOrb2:    { position:'absolute', width:300, height:300, borderRadius:150, backgroundColor:'rgba(255,255,255,0.12)', bottom:-100, left:-100 },
  splashGreeting:{ fontFamily:'Poppins_400Regular', fontSize:18, color:'rgba(10,10,10,0.55)', letterSpacing:0.1 },
  splashWordmark:{ fontFamily:'DMSerifDisplay_400Regular', fontSize:96, color:'#0A0A0A', letterSpacing:-4, lineHeight:100 },
  splashTagline: { fontFamily:'Poppins_500Medium', fontSize:12, color:'rgba(10,10,10,0.45)', letterSpacing:3, textTransform:'uppercase' as const },
  splashDots:    { alignItems:'center' },

  // Entry
  entryWrap:          { position:'absolute', top:0, left:0, right:0, bottom:0, backgroundColor:'#4D8BFF' },
  entryOrb2:          { position:'absolute', width:180, height:180, borderRadius:90, backgroundColor:'rgba(255,69,69,0.1)', bottom:160, left:-50, pointerEvents:'none' as any },
  entryContent:       { flex:1, paddingHorizontal:24, paddingTop:16, gap:10 },
  entryStarBox:       { width:44, height:44, borderRadius:13, backgroundColor:'rgba(255,255,255,0.18)', alignItems:'center', justifyContent:'center', alignSelf:'center', marginBottom:4 },
  entryGreeting1:     { fontFamily:'DMSerifDisplay_400Regular', fontSize:34, color:'#fff', letterSpacing:-0.5, lineHeight:40, textAlign:'center' as const },
  entryGreeting2:     { fontFamily:'DMSerifDisplay_400Regular', fontSize:28, color:'rgba(255,255,255,0.85)', letterSpacing:-0.4, lineHeight:34, textAlign:'center' as const, marginBottom:2 },
  entrySub:           { fontFamily:'Poppins_400Regular', fontSize:14, color:'rgba(255,255,255,0.55)', textAlign:'center' as const, marginBottom:4 },
  entryMicCard:       { flexDirection:'row', alignItems:'center', gap:14, backgroundColor:'rgba(255,123,107,0.22)', borderWidth:1.5, borderColor:'rgba(255,123,107,0.45)', borderRadius:20, padding:18 },
  entryMicIcon:       { width:52, height:52, borderRadius:26, alignItems:'center', justifyContent:'center', backgroundColor:'#FF4545', shadowColor:'#FF4545', shadowOpacity:0.45, shadowRadius:14, shadowOffset:{ width:0, height:4 }, flexShrink:0 },
  entryMicTitle:      { fontFamily:'Poppins_700Bold', fontSize:16, color:'#fff', marginBottom:3 },
  entryMicSub:        { fontFamily:'Poppins_400Regular', fontSize:12, color:'rgba(255,255,255,0.6)', lineHeight:18 },
  entryWaveStatic:    { flexDirection:'row', alignItems:'center', gap:3 },
  entryWaveBarStatic: { width:3.5, borderRadius:2, backgroundColor:'rgba(255,255,255,0.45)' },
  entryDivider:       { flexDirection:'row', alignItems:'center', gap:10 },
  entryDivLine:       { flex:1, height:1, backgroundColor:'rgba(255,255,255,0.15)' },
  entryDivTxt:        { fontFamily:'Poppins_400Regular', fontSize:11, color:'rgba(255,255,255,0.35)' },
  entryChips:         { flexDirection:'row', flexWrap:'wrap', gap:8 },
  entryChip:          { flexDirection:'row', alignItems:'center', gap:7, backgroundColor:'rgba(255,255,255,0.13)', borderWidth:1.5, borderColor:'rgba(255,255,255,0.22)', borderRadius:24, paddingVertical:10, paddingHorizontal:15 },
  entryChipEmoji:     { fontSize:15 },
  entryChipTxt:       { fontFamily:'Poppins_600SemiBold', fontSize:13, color:'rgba(255,255,255,0.92)' },
  entryRecordingWrap: { flex:1, alignItems:'center', justifyContent:'center', gap:18, paddingHorizontal:28 },
  entryListeningLbl:  { fontFamily:'DMSerifDisplay_400Regular', fontSize:34, color:'#fff', fontStyle:'italic' as const, textAlign:'center' as const },
  entryListeningSub:  { fontFamily:'Poppins_400Regular', fontSize:14, color:'rgba(255,255,255,0.5)', textAlign:'center' as const },
  entryMicRingWrap:   { position:'relative', width:110, height:110, alignItems:'center', justifyContent:'center' },
  entryMicRing1:      { position:'absolute', width:110, height:110, borderRadius:55, borderWidth:2, borderColor:'rgba(255,123,107,0.4)' },
  entryMicRing2:      { position:'absolute', width:110, height:110, borderRadius:55, borderWidth:2, borderColor:'rgba(255,123,107,0.22)' },
  entryMicBig:        { width:88, height:88, borderRadius:44, backgroundColor:'#FF4545', alignItems:'center', justifyContent:'center', shadowColor:'#FF4545', shadowOpacity:0.5, shadowRadius:20, shadowOffset:{ width:0, height:6 }, zIndex:2 },
  entryWaveWrap:      { flexDirection:'row', alignItems:'center', gap:5, height:60, width:'100%' as any, justifyContent:'center' },
  entryWaveBar:       { width:5, borderRadius:3, backgroundColor:'rgba(255,255,255,0.7)' },
  entryStopHint:      { fontFamily:'Poppins_400Regular', fontSize:14, color:'rgba(255,255,255,0.55)', textAlign:'center' as const },

  // Voice label
  voiceLabel:    { flexDirection:'row', alignItems:'center', gap:4, justifyContent:'flex-end', marginBottom:4 },
  voiceLabelTxt: { fontFamily:'Poppins_400Regular', fontSize:10 },

  // Top bar
  topBar:            { backgroundColor:'#F5EAD8' },
  topBarRow:         { flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingHorizontal:20, paddingTop:4, paddingBottom:10 },
  topBarDivider:     { height:1, backgroundColor:'rgba(10,10,10,0.08)' },
  topBarRight:       { flexDirection:'row', alignItems:'center', gap:10 },
  topBarChannelName: { fontFamily:'Poppins_600SemiBold', fontSize:16, color:'rgba(10,10,10,0.45)' },
  logoWord:          { fontFamily:'DMSerifDisplay_400Regular', fontSize:40, color:'#0A0A0A', letterSpacing:-1.5, lineHeight:44 },
  avatar:            { width:36, height:36, borderRadius:18, backgroundColor:'#4D8BFF', alignItems:'center', justifyContent:'center' },
  avatarTxt:         { fontFamily:'Poppins_700Bold', fontSize:14, color:'#fff' },

  // Brief section
  briefSection:  { backgroundColor:'#F5EAD8', paddingHorizontal:20, paddingTop:14, paddingBottom:0 },
  briefGreeting: { fontFamily:'Poppins_500Medium', fontSize:17, color:'rgba(10,10,10,0.62)', marginBottom:10 },
  briefHero:     { fontFamily:'DMSerifDisplay_400Regular', fontSize:28, color:'#0A0A0A', lineHeight:36, letterSpacing:-0.3, marginBottom:14 },
  briefPills:    { flexDirection:'row', flexWrap:'wrap', gap:7, marginBottom:14 },
  briefPill:     { backgroundColor:HOME_AI, paddingVertical:7, paddingHorizontal:14, borderRadius:20 },
  briefPillTxt:  { fontFamily:'Poppins_400Regular', fontSize:13, color:'#0A0A0A' },
  briefDivider:  { height:1, backgroundColor:'rgba(10,10,10,0.08)' },

  // KAV + scroll
  kavWrap:       { flex:1 },
  scrollWrap:    { flex:1, position:'relative' },
  scroll:        { flex:1 },
  scrollContent: { paddingHorizontal:0, paddingTop:0, paddingBottom:170 },

  // Date divider
  dateRow:  { flexDirection:'row', alignItems:'center', marginBottom:20, gap:10, paddingHorizontal:18, marginTop:16 },
  dateLine: { flex:1, height:1 },
  dateLabel:{ fontFamily:'Poppins_600SemiBold', fontSize:9, letterSpacing:1.2, textTransform:'uppercase' as const },

  // Zaeli message
  zaeliMsgWrap: { marginBottom:6, paddingHorizontal:18 },
  zEyebrow:     { flexDirection:'row', alignItems:'center', gap:5, marginBottom:6 },
  zStar:        { width:16, height:16, borderRadius:5, alignItems:'center', justifyContent:'center', flexShrink:0 },
  zName:        { fontFamily:'Poppins_700Bold', fontSize:10, letterSpacing:0.2 },
  zTs:          { fontFamily:'Poppins_400Regular', fontSize:9, marginLeft:'auto' as any },
  zTsOnly:      { fontFamily:'Poppins_400Regular', fontSize:10, marginBottom:5 },
  zaeliMsgText: { fontFamily:'Poppins_400Regular', fontSize:17, lineHeight:27, letterSpacing:-0.1 },
  zaeliIconRow: { flexDirection:'row', alignItems:'center', marginTop:7, gap:2 },

  // Dots
  dotsRow: { flexDirection:'row', gap:5, alignItems:'center', paddingVertical:4 },
  dot:     { width:7, height:7, borderRadius:4 },

  // Quick replies
  quickRepliesWrap: { marginTop:10 },
  qrLabel:          { fontFamily:'Poppins_600SemiBold', fontSize:10, letterSpacing:0.2, marginBottom:7 },
  qrChips:          { flexDirection:'row', flexWrap:'wrap', gap:6 },
  qrChip:           { borderWidth:1.5, borderRadius:20, paddingVertical:6, paddingHorizontal:12, backgroundColor:'white' },
  qrChipTxt:        { fontFamily:'Poppins_400Regular', fontSize:13, color:'rgba(10,10,10,0.65)' },
  qrDismiss:        { fontFamily:'Poppins_400Regular', fontSize:12, marginTop:9 },

  // User bubble
  userMsgWrap: { alignItems:'flex-end', marginBottom:6, paddingHorizontal:18 },
  userBubble:  { borderRadius:16, borderBottomRightRadius:3, paddingHorizontal:13, paddingVertical:9, maxWidth:'82%' as any },
  userMsgText: { fontFamily:'Poppins_400Regular', fontSize:17, lineHeight:27 },
  msgImage:    { width:'100%' as any, height:180, borderRadius:12, marginBottom:6 },

  // Icon rows
  msgTime:     { fontFamily:'Poppins_400Regular', fontSize:10 },
  userIconRow: { flexDirection:'row', alignItems:'center', marginTop:4, gap:2, justifyContent:'flex-end' },
  iconBtn:     { width:26, height:26, alignItems:'center', justifyContent:'center', borderRadius:6 },

  // Scroll down button
  scrollDownBtn:   { position:'absolute', bottom:100, left:0, right:0, alignItems:'center', zIndex:50 },
  scrollDownInner: { width:40, height:40, borderRadius:20, backgroundColor:'rgba(10,10,10,0.45)', alignItems:'center', justifyContent:'center' },

  // Input area
  inputArea:   { position:'absolute', bottom:0, left:0, right:0, paddingHorizontal:14, paddingBottom: Platform.OS==='ios' ? 30 : 18, paddingTop:10, backgroundColor:'transparent' },
  inputAreaKb: { paddingBottom: Platform.OS==='ios' ? 8 : 6 },

  // Image preview
  imagePreviewWrap:   { marginBottom:8, alignSelf:'flex-start', position:'relative' },
  imagePreview:       { width:80, height:80, borderRadius:10 },
  imagePreviewRemove: { position:'absolute', top:-6, right:-6, width:22, height:22, borderRadius:11, backgroundColor:'#0A0A0A', alignItems:'center', justifyContent:'center' },

  // Input bar
  barPill:    { flexDirection:'row', alignItems:'center', gap:8, borderRadius:30, paddingVertical:14, paddingHorizontal:16, borderWidth:1, shadowColor:'#000', shadowOpacity:0.07, shadowRadius:16, shadowOffset:{ width:0, height:-2 }, elevation:4 },
  barBtn:     { width:34, height:34, alignItems:'center', justifyContent:'center' },
  barMicBtn:  { width:32, height:32, alignItems:'center', justifyContent:'center', flexShrink:0 },
  barSep:     { width:1, height:18, flexShrink:0 },
  barInput:   { flex:1, fontFamily:'Poppins_400Regular', fontSize:15, maxHeight:100, paddingVertical:0 },
  barWaveBtn: { width:40, height:40, borderRadius:20, alignItems:'center', justifyContent:'center' },
  waveRow:    { flexDirection:'row', alignItems:'center', gap:3 },
  waveBar:    { width:3.5, height:18, borderRadius:2, backgroundColor:'#fff' },
  barSend:    { width:32, height:32, borderRadius:16, backgroundColor:HOME_AI, alignItems:'center', justifyContent:'center', flexShrink:0 },

  // Sheet
  sheetOverlay:   { flex:1, backgroundColor:'rgba(0,0,0,0.4)', justifyContent:'flex-end' },
  sheet:          { backgroundColor:'#FAF8F5', borderTopLeftRadius:26, borderTopRightRadius:26, paddingHorizontal:20, shadowColor:'#000', shadowOpacity:0.2, shadowRadius:20, shadowOffset:{ width:0, height:-4 } },
  sheetHandle:    { width:36, height:4, borderRadius:2, backgroundColor:'rgba(10,10,10,0.14)', alignSelf:'center', marginTop:12, marginBottom:4 },
  sheetHeader:    { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingVertical:18 },
  sheetCloseBtn:  { width:44, height:44, borderRadius:22, backgroundColor:'rgba(10,10,10,0.07)', alignItems:'center', justifyContent:'center' },
  sheetTitle:     { fontFamily:'Poppins_700Bold', fontSize:17, color:'#0A0A0A' },
  sheetTiles:     { flexDirection:'row', gap:12, marginBottom:10 },
  sheetTile:      { flex:1, backgroundColor:'rgba(10,10,10,0.05)', borderRadius:20, paddingVertical:30, alignItems:'center', justifyContent:'center', gap:12 },
  sheetTileLabel: { fontFamily:'Poppins_500Medium', fontSize:14, color:'#0A0A0A' },

  // More grid
  moreOverlay:   { flex:1, backgroundColor:'rgba(0,0,0,0.5)', justifyContent:'flex-end' },
  moreGrid:      { borderTopLeftRadius:24, borderTopRightRadius:24, padding:20, paddingBottom: Platform.OS==='ios' ? 40 : 24 },
  moreHandle:    { width:34, height:4, borderRadius:2, alignSelf:'center', marginBottom:14 },
  moreTitle:     { fontFamily:'Poppins_700Bold', fontSize:14, marginBottom:14 },
  moreItems:     { flexDirection:'row', flexWrap:'wrap', gap:9 },
  moreItem:      { width:'30%' as any, borderRadius:14, borderWidth:1, paddingVertical:14, alignItems:'center', gap:5 },
  moreItemEmoji: { fontSize:20 },
  moreItemLabel: { fontFamily:'Poppins_600SemiBold', fontSize:10, textAlign:'center' as const },

  // Live camera
  liveCameraOverlay: { position:'absolute', top:0, left:0, right:0, bottom:0, backgroundColor:'#111', zIndex:200 },
  liveCameraTop:     { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:16, paddingVertical:12 },
  liveCameraClose:   { width:36, height:36, borderRadius:18, backgroundColor:'rgba(255,255,255,0.15)', alignItems:'center', justifyContent:'center' },
  liveCameraTitle:   { fontFamily:'Poppins_700Bold', fontSize:15, color:'#fff' },
  liveCameraBody:    { flex:1, alignItems:'center', justifyContent:'center', padding:32, gap:24 },
  liveCameraHint:    { fontFamily:'Poppins_400Regular', fontSize:15, color:'rgba(255,255,255,0.55)', textAlign:'center' as const, lineHeight:25 },
  liveCameraBtn:     { backgroundColor:HOME_AI, borderRadius:16, paddingVertical:15, paddingHorizontal:30 },
  liveCameraBtnTxt:  { fontFamily:'Poppins_700Bold', fontSize:15, color:INK },

  // ── Mic recording overlay ─────────────────────────────────────
  micOverlay:    { position:'absolute', top:0, left:0, right:0, bottom:0, backgroundColor:'rgba(245,234,216,0.88)', alignItems:'center', justifyContent:'center', zIndex:100 },
  micCard:       { backgroundColor:'#fff', borderRadius:28, paddingVertical:32, paddingHorizontal:36, alignItems:'center', gap:18, shadowColor:'#000', shadowOpacity:0.10, shadowRadius:24, shadowOffset:{ width:0, height:8 }, borderWidth:1, borderColor:'rgba(10,10,10,0.06)' },
  micTimer:      { fontFamily:'Poppins_600SemiBold', fontSize:30, color:'#0A0A0A', letterSpacing:1 },
  micLabel:      { fontFamily:'Poppins_400Regular', fontSize:13, color:'rgba(10,10,10,0.40)' },
  micStopBtn:    { width:60, height:60, borderRadius:30, backgroundColor:'#FF4545', alignItems:'center', justifyContent:'center', shadowColor:'#FF4545', shadowOpacity:0.35, shadowRadius:14, shadowOffset:{ width:0, height:4 } },
  micStopSquare: { width:20, height:20, borderRadius:4, backgroundColor:'#fff' },
  micCancel:     { fontFamily:'Poppins_400Regular', fontSize:13, color:'rgba(10,10,10,0.35)' },

  // ── EventCard styles ─────────────────────────────────────────
  calCardsWrap:   { gap:8, marginTop:10, marginBottom:4 },
  evCard:         { borderRadius:14, padding:14, marginBottom:0 },
  evCardInner:    { flexDirection:'row', alignItems:'flex-start', gap:10 },
  evTitle:        { fontFamily:'Poppins_600SemiBold', fontSize:15, color:'#0A0A0A', letterSpacing:-0.2, marginBottom:3 },
  evTime:         { fontFamily:'Poppins_500Medium', fontSize:13, marginBottom:2 },
  evLocation:     { fontFamily:'Poppins_400Regular', fontSize:12, color:'rgba(0,0,0,0.5)', marginTop:2 },
  evAvatarCol:    { flexDirection:'column', gap:4, alignItems:'center', justifyContent:'flex-start', flexShrink:0 },
  evAvatarGrid:   { flexDirection:'row', flexWrap:'wrap', gap:3, width:44, justifyContent:'flex-end' },
  evAv:           { alignItems:'center', justifyContent:'center' },
  evAvTxt:        { fontFamily:'Poppins_700Bold', color:'#fff' },

  // ── Calendar portal chip (small, inline with chips row) ──────
  calPortalChip:    { borderWidth:1.5, borderRadius:20, paddingVertical:6, paddingHorizontal:12, backgroundColor:CAL_BG, borderColor:CAL_BG },
  calPortalChipTxt: { fontFamily:'Poppins_600SemiBold', fontSize:13, color:'#0A0A0A' },

  // ── Calendar portal pill — DEPRECATED, kept for safety ───────
  calPortalPill:      { flexDirection:'row', alignItems:'center', justifyContent:'space-between', backgroundColor:CAL_BG, borderRadius:14, paddingVertical:12, paddingHorizontal:16, marginTop:12 },
  calPortalPillTxt:   { fontFamily:'Poppins_600SemiBold', fontSize:14, color:'#0A0A0A' },
  calPortalPillArrow: { fontFamily:'Poppins_700Bold', fontSize:20 },

  // ── EventDetailModal styles ──────────────────────────────────
  modalHdr:      { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:20, paddingVertical:14, borderBottomWidth:1, borderBottomColor:'rgba(0,0,0,0.07)' },
  modalCancel:   { fontFamily:'Poppins_400Regular', fontSize:15, color:'rgba(10,10,10,0.5)' },
  modalTitle:    { fontFamily:'Poppins_700Bold', fontSize:16, color:'#0A0A0A' },
  modalSave:     { fontFamily:'Poppins_600SemiBold', fontSize:15, color:HOME_AI },
  detailRow:     { flexDirection:'row', alignItems:'flex-start', gap:12, paddingHorizontal:20, paddingVertical:12, borderBottomWidth:1, borderBottomColor:'rgba(0,0,0,0.06)' },
  detailIcon:    { fontSize:18, width:26, textAlign:'center' as const },
  detailTxt:     { fontFamily:'Poppins_400Regular', fontSize:15, color:'#0A0A0A', flex:1, lineHeight:22 },
  deleteBtn:     { backgroundColor:'rgba(232,55,75,0.08)', borderRadius:14, paddingVertical:14, alignItems:'center' },
  deleteBtnConfirm: { backgroundColor:'rgba(232,55,75,0.18)' },
  deleteBtnTxt:  { fontFamily:'Poppins_600SemiBold', fontSize:15, color:'#E8374B' },
  gcBlock:       { backgroundColor:'rgba(0,0,0,0.03)', borderRadius:14, marginHorizontal:20, marginBottom:2, overflow:'hidden' },
  gcRow:         { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:16, paddingVertical:14 },
  gcRowLbl:      { fontFamily:'Poppins_400Regular', fontSize:15, color:'#0A0A0A' },
  gcRowRight:    { flexDirection:'row', alignItems:'center' },
  gcRowRightTxt: { fontFamily:'Poppins_500Medium', fontSize:15, color:'rgba(10,10,10,0.5)' },
  gcSep:         { height:1, backgroundColor:'rgba(0,0,0,0.06)', marginHorizontal:16 },
  gcPill:        { backgroundColor:'rgba(0,0,0,0.06)', borderRadius:10, paddingVertical:6, paddingHorizontal:12 },
  gcPillTxt:     { fontFamily:'Poppins_500Medium', fontSize:14, color:'#0A0A0A' },
  gcSubInput:    { fontFamily:'Poppins_400Regular', fontSize:15, color:'#0A0A0A', paddingHorizontal:16, paddingVertical:12 },
  gcTitleInput:  { fontFamily:'Poppins_600SemiBold', fontSize:18, color:'#0A0A0A', paddingHorizontal:16, paddingVertical:16 },
  gcToggle:      { width:44, height:26, borderRadius:13, backgroundColor:'rgba(0,0,0,0.12)', justifyContent:'center', paddingHorizontal:2 },
  gcToggleOn:    { backgroundColor:HOME_AI },
  gcToggleThumb: { width:22, height:22, borderRadius:11, backgroundColor:'#fff', shadowColor:'#000', shadowOpacity:0.15, shadowRadius:4, shadowOffset:{ width:0, height:1 } },
  gcToggleThumbOn: { alignSelf:'flex-end' },
  memberRow:     { flexDirection:'row', alignItems:'center', gap:12, padding:14, borderRadius:12, borderWidth:1.5, borderColor:'rgba(0,0,0,0.07)', backgroundColor:'#fff' },
  memberDot:     { width:12, height:12, borderRadius:6 },
  memberName:    { fontFamily:'Poppins_500Medium', fontSize:15, color:'#0A0A0A', flex:1 },
  memberCheck:   { width:22, height:22, borderRadius:11, borderWidth:1.5, borderColor:'rgba(0,0,0,0.2)', alignItems:'center', justifyContent:'center' },
});
