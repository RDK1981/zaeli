/**
 * index.tsx — Zaeli Home · AI-First Chat Interface
 * Chat is home. Zaeli opens every session. Pills bring screens into chat.
 * See ZAELI-PRODUCT.md for full framework.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Animated, Easing, TextInput, KeyboardAvoidingView,
  Platform, Modal, Pressable, Image, Share, Clipboard, Keyboard,
  useColorScheme,
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
const MEMBER_NAME = 'Anna';
const CORAL = '#FF4545';
const INK   = '#0A0A0A';   // fallback for icon default props
const INK3  = 'rgba(10,10,10,0.32)';  // fallback for icon default props
const YELLOW      = '#FFE500';
const TEAL        = '#1A5F7A';

// Light mode — blue banner, coral accent touches
const L = {
  banner:      '#4D8BFF',
  bannerOrb:   'rgba(255,255,255,0.07)',
  bg:          '#FFFFFF',
  bg2:         '#FFFFFF',
  ink:         '#0A0A0A',
  ink2:        'rgba(10,10,10,0.5)',
  ink3:        'rgba(10,10,10,0.28)',
  border:      'rgba(10,10,10,0.09)',
  userBubble:  '#F2F2F2',
  userText:    '#0A0A0A',
  zaeliStar:   '#FF7B6B',   // light coral — warmth signal
  zaeliName:   '#FF7B6B',   // light coral — matches star
  dateLine:    'rgba(10,10,10,0.09)',
  replyBg:     '#FFFFFF',
  replyBorder: 'rgba(10,10,10,0.13)',
  replyText:   '#0A0A0A',
  dismiss:     'rgba(10,10,10,0.32)',
  gridBg:      'rgba(255,69,69,0.07)',    // coral tint
  gridBorder:  'rgba(255,69,69,0.2)',     // coral border
  gridDot:     '#FF4545',                 // full coral dots
  barBg:       '#FFFFFF',
  barBorder:   'rgba(10,10,10,0.09)',
  barPh:       'rgba(10,10,10,0.5)',      // darker — easier to read
  barSep:      'rgba(10,10,10,0.1)',
  barIcon:     'rgba(10,10,10,0.55)',     // darker + icon
  gridSheet:   '#FFFFFF',
  gridHandle:  'rgba(10,10,10,0.12)',
  gridTitle:   '#0A0A0A',
  gridItemBg:  'rgba(10,10,10,0.05)',
  gridItemBdr: 'rgba(10,10,10,0.09)',
  gridItemLbl: 'rgba(10,10,10,0.5)',
  statusBar:   'light' as const,
};

// Dark mode — Option A
const D = {
  banner:      '#0D1B3E',
  bannerOrb:   'rgba(255,255,255,0.06)',
  bg:          '#111111',
  bg2:         '#1C1C1C',
  ink:         '#F0EDE8',
  ink2:        'rgba(240,237,232,0.55)',
  ink3:        'rgba(240,237,232,0.28)',
  border:      'rgba(255,255,255,0.08)',
  userBubble:  '#1E2D50',
  userText:    '#A8C4FF',
  zaeliStar:   '#4D8BFF',
  zaeliName:   '#6BA3FF',
  dateLine:    'rgba(255,255,255,0.08)',
  replyBg:     '#1E1E1E',
  replyBorder: 'rgba(255,255,255,0.1)',
  replyText:   '#F0EDE8',
  dismiss:     'rgba(240,237,232,0.28)',
  gridBg:      'rgba(255,255,255,0.08)',
  gridBorder:  'rgba(255,255,255,0.1)',
  gridDot:     'rgba(240,237,232,0.45)',
  barBg:       '#1C1C1C',
  barBorder:   'rgba(255,255,255,0.08)',
  barPh:       'rgba(240,237,232,0.28)',
  barSep:      'rgba(255,255,255,0.08)',
  barIcon:     'rgba(240,237,232,0.32)',
  gridSheet:   '#1C1C1C',
  gridHandle:  'rgba(255,255,255,0.1)',
  gridTitle:   '#F0EDE8',
  gridItemBg:  'rgba(255,255,255,0.06)',
  gridItemBdr: 'rgba(255,255,255,0.09)',
  gridItemLbl: 'rgba(240,237,232,0.45)',
  statusBar:   'light' as const,
};

const OPENAI_URL  = 'https://api.openai.com/v1/chat/completions';
const WHISPER_URL = 'https://api.openai.com/v1/audio/transcriptions';

// All screens — for grid
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

// ── Message type ───────────────────────────────────────────────────────────
interface Msg {
  id: string;
  role: 'zaeli' | 'user';
  text: string;
  imageUri?: string;
  ts: string;
  isLoading?: boolean;
  isBrief?: boolean;
  isVoice?: boolean;
  quickReplies?: string[];   // contextual chips for brief
}

// ── Helpers ────────────────────────────────────────────────────────────────
function localDateStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function fmtTime(t?: string | null): string {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}${m ? ':' + String(m).padStart(2,'0') : ''}${h >= 12 ? 'pm' : 'am'}`;
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

// ── OpenAI ─────────────────────────────────────────────────────────────────
// ── API logging ────────────────────────────────────────────────────────────
// Fire-and-forget — never blocks the UI
async function logApiCall(params: {
  family_id: string;
  feature: string;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  cost_usd: number;
}) {
  try {
    await supabase.from('api_logs').insert({
      ...params,
      total_tokens: params.prompt_tokens + params.completion_tokens,
      created_at: new Date().toISOString(),
    });
  } catch (e) { /* silent — never crash the app over logging */ }
}

// GPT-5.4-mini pricing (per 1M tokens, as of March 2026)
const GPT_IN_PER_M  = 0.15;   // $0.15 / 1M input tokens
const GPT_OUT_PER_M = 0.60;   // $0.60 / 1M output tokens

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
  // Log usage
  const pt = json?.usage?.prompt_tokens ?? 0;
  const ct = json?.usage?.completion_tokens ?? 0;
  const cost = (pt / 1_000_000 * GPT_IN_PER_M) + (ct / 1_000_000 * GPT_OUT_PER_M);
  logApiCall({ family_id: FAMILY_ID, feature, model: 'gpt-5.4-mini', prompt_tokens: pt, completion_tokens: ct, cost_usd: cost });
  return text;
}

// Whisper: $0.006 / minute — approximate from audio duration
function logWhisper(durationSeconds: number) {
  const cost = (durationSeconds / 60) * 0.006;
  logApiCall({ family_id: FAMILY_ID, feature: 'whisper_transcription', model: 'whisper-1', prompt_tokens: 0, completion_tokens: 0, cost_usd: cost });
}

// Claude Vision: claude-sonnet-4-6 pricing
const CLAUDE_IN_PER_M  = 3.00;
const CLAUDE_OUT_PER_M = 15.00;
function logVision(inputTokens: number, outputTokens: number) {
  const cost = (inputTokens / 1_000_000 * CLAUDE_IN_PER_M) + (outputTokens / 1_000_000 * CLAUDE_OUT_PER_M);
  logApiCall({ family_id: FAMILY_ID, feature: 'chat_vision', model: 'claude-sonnet-4-6', prompt_tokens: inputTokens, completion_tokens: outputTokens, cost_usd: cost });
}

// ── Icons — exact set from zaeli-chat.tsx ─────────────────────────────────
function IcoPlus() {
  return <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={INK3} strokeWidth="2" strokeLinecap="round"><Line x1="12" y1="5" x2="12" y2="19"/><Line x1="5" y1="12" x2="19" y2="12"/></Svg>;
}
function IcoMic({ color = INK3 }: { color?: string }) {
  return <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><Rect x="9" y="2" width="6" height="11" rx="3"/><Path d="M5 10a7 7 0 0014 0"/><Line x1="12" y1="19" x2="12" y2="23"/><Line x1="8" y1="23" x2="16" y2="23"/></Svg>;
}
function IcoSend() {
  return <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><Line x1="12" y1="19" x2="12" y2="5"/><Polyline points="5 12 12 5 19 12"/></Svg>;
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
function IcoFiles() {
  return <Svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={INK} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><Path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><Polyline points="14 2 14 8 20 8"/><Line x1="12" y1="18" x2="12" y2="12"/><Line x1="9" y1="15" x2="15" y2="15"/></Svg>;
}
function IcoX() {
  return <Svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><Line x1="18" y1="6" x2="6" y2="18"/><Line x1="6" y1="6" x2="18" y2="18"/></Svg>;
}

// ── Typing dots — exact from zaeli-chat ────────────────────────────────────
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

// ── Waveform — exact from zaeli-chat ──────────────────────────────────────
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

// ── Brief cache (module-level) ────────────────────────────────────────────
let cachedBriefText: string | null = null;
let cachedBriefSub:  string | null = null;
let cachedBriefSeed: string | null = null;
let lastBriefTime:   number | null = null;


// ── TOOLS & EXECUTOR (ported from zaeli-chat.tsx) ─────────────────────────
const DUMMY_FAMILY_ID_HOME = '00000000-0000-0000-0000-000000000001';

const TOOLS = [
  { name:'add_calendar_event',
    description:'Add a single event to the family calendar. Use immediately when you have title + time.',
    input_schema:{ type:'object', properties:{
      title:      { type:'string', description:'Event title' },
      start_time: { type:'string', description:'ISO 8601 local time e.g. 2026-03-26T09:00:00' },
      end_time:   { type:'string', description:'ISO 8601 local end time' },
      notes:      { type:'string' },
      assignee:   { type:'string', description:'Family member name if relevant' },
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
      const localDt  = (input.start_time || '').replace('Z','').split('+')[0];
      const dateOnly = localDt.split('T')[0] || new Date().toISOString().split('T')[0];
      const { error } = await supabase.from('events').insert({
        family_id:  DUMMY_FAMILY_ID_HOME,
        title:      input.title,
        date:       dateOnly,
        start_time: localDt,
        end_time:   (input.end_time || input.start_time).replace('Z','').split('+')[0],
        notes:      input.notes || '',
        timezone:   'Australia/Brisbane',
      });
      if (error) { console.error('[executeTool] add_calendar_event error:', error); throw error; }
      console.log('[executeTool] added event:', input.title, 'date:', dateOnly);
      return `✅ **${input.title}** added to the calendar.`;
    }
    if (name === 'update_calendar_event') {
      let updateQuery = supabase.from('events').select('id,title,date,start_time,end_time')
        .eq('family_id', DUMMY_FAMILY_ID_HOME)
        .ilike('title', `%${input.search_title}%`);
      if (input.search_date) updateQuery = (updateQuery as any).eq('date', input.search_date);
      const { data } = await (updateQuery as any).order('date').limit(1);
      if (!data || data.length === 0) return `Couldn't find an event matching "${input.search_title}".`;
      const t = data[0];
      const u: any = {};
      if (input.new_title)      u.title = input.new_title;
      if (input.new_notes)      u.notes = input.new_notes;
      if (input.new_start_time) {
        u.start_time = input.new_start_time.replace('Z','').split('+')[0];
        u.date = u.start_time.split('T')[0];
        // Preserve duration — shift end_time by same delta if not explicitly provided
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
      const { error } = await supabase.from('events').update(u).eq('id', t.id);
      if (error) { console.error('[executeTool] update error:', error); throw error; }
      console.log('[executeTool] updated event:', t.id, 'changes:', u);
      return `✅ **${input.new_title || t.title}** updated.`;
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
    console.log(`Tool error [${name}]:`, e?.message);
    return `I hit a snag — you may need to add it manually.`;
  }
}

const CAPABILITY_RULES = `CRITICAL TOOL RULES:
- USE TOOLS IMMEDIATELY when you have enough info. Never say "I'll add that" — just add it.
- For "tomorrow" use tomorrow's actual date (today is provided in the system prompt).
- update_calendar_event: use this to change time/date. NEVER delete and re-add.
- If a tool call succeeds, confirm briefly ("Done — Poppy's dance moved to 4:30pm ✅").
- Zaeli CANNOT make phone calls or send messages autonomously.`;

// ── Main component ─────────────────────────────────────────────────────────
export default function HomeScreen() {
  const router    = useRouter();
  const params    = useLocalSearchParams<{ autoMic?: string; seedMessage?: string; calendarScan?: string }>();
  const scheme    = useColorScheme();
  const T         = scheme === 'dark' ? D : L;   // active theme tokens
  const scrollRef = useRef<ScrollView>(null);
  const inputRef  = useRef<TextInput>(null);
  const now       = new Date();
  const h         = now.getHours();
  const dateLabel = now.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' });
  const dateShort = now.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });

  const [menuOpen,      setMenuOpen]      = useState(false);
  const [messages,      setMessages]      = useState<Msg[]>([]);
  const [input,         setInput]         = useState('');
  const [loading,       setLoading]       = useState(false);
  const [isRecording,   setIsRecording]   = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [briefReplies,  setBriefReplies]  = useState<string[]>([]);
  const [briefSeed,     setBriefSeed]     = useState('');
  const [showAddSheet,  setShowAddSheet]  = useState(false);
  const [pendingImage,  setPendingImage]  = useState<string | null>(null);
  const [thumbs,        setThumbs]        = useState<Record<string, 'up'|'down'|null>>({});
  const [keyboardOpen,  setKeyboardOpen]  = useState(false);
  const [showMoreGrid,  setShowMoreGrid]  = useState(false);
  const [liveCamera,    setLiveCamera]    = useState(false);
  // Entry flow: splash → entry → chat
  const [screen,        setScreen]        = useState<'splash'|'entry'|'chat'>('splash');
  const [focusTopic,    setFocusTopic]    = useState<string>('');
  const [entryRecording, setEntryRecording] = useState(false); // recording state within entry screen
  const [entryProcessing, setEntryProcessing] = useState(false); // transcribing — hold screen

  // Waveform animation for recording state
  const waveAnims = useRef(
    Array.from({ length: 13 }, () => new Animated.Value(0.3))
  ).current;
  const waveLoopRef = useRef<Animated.CompositeAnimation | null>(null);

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
  const handledScanRef     = useRef<string | null>(null);

  // ── Entry focus chips ─────────────────────────────────────────────────────
  const FOCUS_CHIPS = [
    { emoji: '📅', label: "What's on today",    sub: 'Calendar · schedule · reminders',  seed: "What's on today?" },
    { emoji: '🛒', label: 'Shopping & meals',   sub: 'List · pantry · dinner tonight',   seed: 'Give me a shopping and meals update.' },
    { emoji: '✅', label: 'What needs doing',   sub: 'Tasks · urgent · slipping',        seed: "What's most pressing right now?" },
    { emoji: '👧', label: 'Kids & family',      sub: 'Jobs · homework · activities',     seed: 'How are the kids and family going?' },
    { emoji: '🌅', label: "What's coming up",   sub: 'Week ahead · events · plan',       seed: "What's coming up this week?" },
  ];

  // ── Splash → Entry → Chat transitions ────────────────────────────────────
  useEffect(() => {
    // Star bounces in immediately
    Animated.spring(starScale, {
      toValue: 1,
      useNativeDriver: true,
      tension: 60,
      friction: 8,
    }).start();

    // Wordmark fades in after star lands
    setTimeout(() => {
      Animated.timing(wordmarkOpacity, {
        toValue: 1, duration: 400, useNativeDriver: true,
      }).start();
    }, 350);

    // After 1.5s — fade splash out, go straight to chat (skip entry screen)
    setTimeout(() => {
      Animated.timing(splashOpacity, { toValue: 0, duration: 400, useNativeDriver: true })
        .start(() => {
          setScreen('chat');
          chatOpacity.setValue(1);
          generateBrief(true);
        });
    }, 1500);
  }, []);

  // ── Move from entry to chat ───────────────────────────────────────────────
  function enterChat(topic?: string) {
    Animated.parallel([
      Animated.timing(entryOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      Animated.timing(chatOpacity,  { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start(() => {
      setScreen('chat');
      generateBrief(true, topic);
    });
  }

  // ── Keyboard listeners ────────────────────────────────────────────────────
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

  // ── Claude Vision — describe image before GPT call ────────────────────────
  async function describeImageWithClaude(imageUri: string): Promise<string> {
    try {
      const claudeKey = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? '';
      if (!claudeKey) return 'an image the user shared';
      const base64   = await FileSystem.readAsStringAsync(imageUri, { encoding: 'base64' as any });
      const ext      = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
      const mimeMap: Record<string, string> = { jpg:'image/jpeg', jpeg:'image/jpeg', png:'image/png', gif:'image/gif', webp:'image/webp' };
      const mimeType = mimeMap[ext] || 'image/jpeg';
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type':'application/json', 'x-api-key':claudeKey, 'anthropic-version':'2023-06-01' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514', max_tokens: 400,
          messages: [{ role:'user', content:[
            { type:'image', source:{ type:'base64', media_type:mimeType, data:base64 } },
            { type:'text', text:'Describe this image concisely in 2-4 sentences. Focus on what is shown, any text visible, and what the person might want help with. Be factual and specific.' },
          ]}],
        }),
      });
      const json = await res.json();
      const outputTokens = json?.usage?.output_tokens ?? 0;
      const inputTokens  = json?.usage?.input_tokens  ?? 0;
      logVision(inputTokens, outputTokens);
      return json?.content?.[0]?.text || 'an image the user shared';
    } catch (e) { console.error('Claude vision failed:', e); return 'an image the user shared'; }
  }

  // ── Scroll ────────────────────────────────────────────────────────────────
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
        supabase.from('shopping_items').select('*',{count:'exact',head:true}).eq('family_id',FAMILY_ID).eq('checked',false),
        supabase.from('shopping_items').select('name').eq('family_id',FAMILY_ID).eq('checked',false).limit(50),
        supabase.from('events').select('title,date,start_time').eq('family_id',FAMILY_ID).gte('date',td).lte('date', localDateStr(new Date(Date.now() + 7*24*60*60*1000))).order('date').order('start_time').limit(20),
        supabase.from('todos').select('*',{count:'exact',head:true}).eq('family_id',FAMILY_ID).eq('done',false),
        supabase.from('meal_plans').select('meal_name,date').eq('family_id',FAMILY_ID).gte('date',td).limit(7),
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

      const system = `You are Zaeli — a smart, warm, and quietly witty AI for a modern Australian family. You are confident, observant, and playful. You are a teammate, not just an assistant — when Anna's tired or crushing it, you're in it with her.

PERSONALITY: A smart, capable, slightly mischievous best friend who is always one step ahead. Dry when the moment calls for it. Warm when it matters. Energetic and encouraging when Anna needs a boost. Occasionally surprising. Never try-hard, never corporate.

POSITIVITY — this is important: Zaeli genuinely believes in this family and lets it show. Not every message, not forced — but often enough that Anna feels it. Celebrate small wins ("that's actually impressive"), acknowledge hard days ("big week — you're handling it"), notice effort ("two runs before 10am — the legs are earning it"). A little warmth goes a long way. Make Anna feel good about her day, her family, herself. She's doing a lot — Zaeli sees it.

VOICE: Vary tone deliberately — sometimes warm and encouraging, sometimes dry and understated, sometimes full camaraderie and energy, sometimes just a quick sharp acknowledgement. Never the same rhythm twice. Humour is subtle — if it needs to be announced it isn't funny.

EMOJIS: Use 1–2 per message when the moment calls for it. Never a wall of emojis. The right one at the right moment adds warmth — 💪 for effort, 🙌 for wins, 👀 for observations, ✨ for delight. Never decorative padding.

BEHAVIOUR: Guide, suggest, and anticipate. Celebrate effort and wins genuinely. Think ahead on Anna's behalf. When completing an action, mark the moment — "sorted — future you will be very pleased about that 🙌". Feel like a teammate alongside Anna, not a service responding to her.

FAMILY: Anna (logged in), Richard, Poppy (Yr6, age 12), Gab (Yr4, age 10), Duke (Yr1, age 8).

LIVE DATA — you have full access to all of this, always reference it specifically:
- Date: ${dateLabel} (${frame}, ${timeStr})
- Calendar: ${evStr}
- Shopping list: ${shopStr}
- To-dos: ${todoCount??0} open tasks
- ${dinnerRule}

CAPABILITIES: Add/update/delete calendar events, shopping items, todos DIRECTLY using tools — no confirmation needed, just do it. Today is ${td}. Never tell Anna to do it herself — you handle it immediately.

FORMAT: 2–4 sentences by default. Expand only when genuinely useful. Always natural flowing prose. No bullet points, no lists, no asterisks, no markdown. Never start with "I". Never say "mate". Never say "Of course!", "Absolutely!", or any hollow affirmation. Never invent facts.`;
      return { system, mealToday, shopCount: shopCount??0, shopStr, evStr, todoCount: todoCount??0 };
    } catch {
      return { system: `You are Zaeli — smart, warm, witty AI teammate for Anna's Australian family. Camaraderie, warmth, occasional dry wit. Prose only, no lists, no "mate".`, mealToday: null, shopCount:0, shopStr:'unknown', evStr:'nothing on calendar', todoCount:0 };
    }
  }

  // ── Generate brief ────────────────────────────────────────────────────────
  async function generateBrief(force = false, focusHint?: string) {
    const elapsed = lastBriefTime ? Date.now() - lastBriefTime : Infinity;
    if (!force && elapsed < 30*60*1000 && cachedBriefText) {
      const cached = JSON.parse(cachedBriefText);
      addMsg({ role:'zaeli', text: cached.text, isBrief:true, isLoading:false, quickReplies: cached.replies });
      setBriefReplies(cached.replies ?? []);
      setBriefSeed(cachedBriefSeed ?? '');
      return;
    }
    lastBriefTime = Date.now();
    const loadId = addMsg({ role:'zaeli', text:'', isBrief:true, isLoading:true });
    try {
      const { system } = await buildContext();
      const greeting = h < 12 ? 'Morning' : h < 17 ? 'Afternoon' : h < 21 ? 'Evening' : 'Hey';
      const isLate   = h >= 21 || h < 6;
      const focusInstruction = focusHint
        ? `\nFOCUS: Anna tapped "${focusHint}" on the entry screen. Lead with that topic — make it the heart of the brief.`
        : '';
      const briefSys = `${system}

You are writing Zaeli's opening home screen message for ${MEMBER_NAME}. The most important message in the app. A switched-on friend who's been paying attention, not a status report.

RULES:
1. Open with "${greeting}, ${MEMBER_NAME} —" flowing straight into the content
2. Write exactly 3 more sentences (4 total). Warm, specific, alive. NO colour accent tags.
3. Reference actual day names (Monday, this Thursday) — never raw dates
4. Times naturally (this morning, tonight, at 9) — never "at 9:00 AM"
5. Plain text only — no [ACCENT] tags, no bold, no markdown
6. Never invent facts — only use data provided above
7. Use the Zaeli voice — dry, observational, occasionally surprising, warm camaraderie
8. Genuine positivity — notice effort, celebrate small wins, make Anna feel seen
${isLate ? '9. It is late — calm and quiet energy, focus on tomorrow.' : ''}
${focusInstruction}

QUICK REPLIES — generate exactly 3, time-aware and specific to focus topic if selected:
- Short phrases Anna would tap (3-6 words each)
- No punctuation at end

Return ONLY valid JSON (no markdown, no backticks):
{"main":"${greeting}, ${MEMBER_NAME} — [3 more sentences]","replies":["chip 1","chip 2","chip 3"],"seed":"Anna natural response to first chip"}`;

      const raw    = await callGPT(briefSys, [{ role:'user', content:'Generate now.' }], 500, 'home_brief');
      const parsed = JSON.parse(raw.replace(/```json|```/g,'').trim());
      const txt     = parsed.main    ?? `${greeting}, ${MEMBER_NAME} — let's see what the day has in store.`;
      const replies = parsed.replies ?? ["What's on today", "Check the list", "All sorted"];
      const seed    = parsed.seed    ?? replies[0] ?? "What's on today?";
      // Cache as JSON string
      cachedBriefText = JSON.stringify({ text: txt, replies });
      cachedBriefSeed = seed;
      updateMsg(loadId, { text: txt, isLoading: false, quickReplies: replies });
      setBriefReplies(replies);
      setBriefSeed(seed);
    } catch (e) {
      console.error('Brief error:', e);
      const g = h < 12 ? 'Morning' : h < 17 ? 'Afternoon' : 'Evening';
      const fallbackReplies = ["What's on today", "Check the list", "All good"];
      updateMsg(loadId, { text: `${g}, ${MEMBER_NAME} — let's see what the day has in store.`, isLoading: false, quickReplies: fallbackReplies });
      setBriefReplies(fallbackReplies);
    }
  }

  useFocusEffect(useCallback(() => {
    // Handle incoming params from calendar and other screens
    // useFocusEffect fires every time screen comes into view — catches push() navigation
    if (params.autoMic === 'true') {
      const t = setTimeout(() => { startRecording(); }, 800);
      return () => clearTimeout(t);
    }
    if (params.calendarScan === 'true') {
      const imgUri = getPendingCalendarImage();
      // Guard against double-firing — useFocusEffect runs on every focus
      if (imgUri && handledScanRef.current !== imgUri) {
        handledScanRef.current = imgUri;
        setPendingCalendarImage(null);
        const t = setTimeout(() => {
          // Transition to chat screen first
          setScreen('chat');
          chatOpacity.setValue(1); entryOpacity.setValue(0);
          setLoading(false); // ensure not locked from previous call
          // Small delay then send — screen must be fully in chat state
          setTimeout(() => {
            send('Please help add this to the calendar.', imgUri);
          }, 200);
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
        // Generate a focused Zaeli reply (not the full 4-sentence brief)
        const replyId = uid();
        setMessages(prev => [...prev, { id: replyId, role:'zaeli', text:'', isLoading:true, ts: nowTs() }]);
        const sysPrompt = `You are Zaeli, warm Australian family assistant. You CAN add events to the calendar using tools. Anna said: "${msg}". Reply in 1 sentence — ask what you need to take action. Give 3 short quick reply chips. Return ONLY JSON: {"main":"...","replies":["...","...","..."]}`;
        callGPT(sysPrompt, [{ role:'user', content: msg }], 200, 'calendar_context')
          .then(raw => {
            try {
              const parsed = JSON.parse(raw.replace(/```json|```/g,'').trim());
              updateMsg(replyId, { text: parsed.main ?? raw, isLoading: false, quickReplies: parsed.replies });
            } catch {
              updateMsg(replyId, { text: raw, isLoading: false });
            }
          })
          .catch(() => updateMsg(replyId, { text: "I'm here — what would you like to add?", isLoading: false }));
      }, 400);
      return () => clearTimeout(t);
    }

    // Only trigger refresh logic when already in chat — never interrupt entry flow
    if (screen !== 'chat') return;
    const elapsed = lastBriefTime ? Date.now() - lastBriefTime : Infinity;
    if (elapsed > 30 * 60 * 1000 && messages.length > 0) {
      setMessages([]);
      lastImageDesc.current = '';
      splashOpacity.setValue(1);
      entryOpacity.setValue(0);
      chatOpacity.setValue(0);
      starScale.setValue(0.4);
      wordmarkOpacity.setValue(0);
      setScreen('splash');
      Animated.spring(starScale, { toValue: 1, useNativeDriver: true, tension: 60, friction: 8 }).start();
      setTimeout(() => Animated.timing(wordmarkOpacity, { toValue: 1, duration: 400, useNativeDriver: true }).start(), 350);
      // Skip entry — go straight from splash to chat
      setTimeout(() => {
        Animated.timing(splashOpacity, { toValue: 0, duration: 400, useNativeDriver: true })
          .start(() => {
            setScreen('chat');
            chatOpacity.setValue(1);
            generateBrief(true);
          });
      }, 1500);
    }
  }, [params.autoMic, params.seedMessage])); // re-runs when params change (calendar nav)

  // ── Quick reply tap ───────────────────────────────────────────────────────
  function handleQuickReply(chip: string) {
    send(chip);
  }

  // ── Send ──────────────────────────────────────────────────────────────────
  async function send(overrideText?: string, overrideImage?: string) {
    const text = (overrideText ?? input).trim();
    const imageUri = overrideImage || pendingImage || undefined;
    if ((!text && !imageUri) || loading) return;
    const uMsg: Msg = { id: uid(), role: 'user', text: text || '', imageUri, ts: nowTs() };
    const history = [...messages, uMsg];
    setMessages(history); setInput(''); setPendingImage(null);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    const replyId = addMsg({ role:'zaeli', text:'', isLoading:true });
    setLoading(true);
    try {
      const { system } = await buildContext();

      // ── Read image ONCE upfront — temp files can expire on iOS ────────────
      let imageBase64 = '';
      let imageMimeType = 'image/jpeg';
      if (imageUri) {
        try {
          console.log('[send] Reading image:', imageUri.substring(0, 80));
          imageBase64 = await FileSystem.readAsStringAsync(imageUri, { encoding: 'base64' as any });
          console.log('[send] Image read OK, length:', imageBase64.length);
          const ext = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
          const mimeMap: Record<string,string> = { jpg:'image/jpeg', jpeg:'image/jpeg', png:'image/png', heic:'image/jpeg', heif:'image/jpeg' };
          imageMimeType = mimeMap[ext] || 'image/jpeg';
          console.log('[send] MIME type:', imageMimeType);
        } catch(e) { console.error('[send] Image read FAILED:', e); }
      }

      // ── Describe image using already-read base64 ──────────────────────────
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

      const histMsgs = history.slice(-12).map(m => ({
        role: m.role === 'zaeli' ? 'assistant' as const : 'user' as const,
        content: m.imageUri
          ? `[User shared a photo] ${m.text}`.trim()
          : (m.text || '(message)'),
      }));

      // ── Tool-aware Anthropic call ─────────────────────────────────────────
      const anthropicKey = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? '';
      const toolSys = system + imgCtx + '\n\n' + CAPABILITY_RULES;

      // Message content — image already read as base64 above
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

      console.log('[send] Calling Anthropic, hasImage:', !!imageBase64, 'msgContentType:', Array.isArray(msgContent) ? 'array' : 'string');
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
      console.log('[send] Anthropic response stop_reason:', data.stop_reason, 'error:', data.error);
      
      // Handle tool use
      if (data.stop_reason === 'tool_use') {
        const toolUses = data.content.filter((b: any) => b.type === 'tool_use');
        const toolResults: string[] = [];
        for (const tu of toolUses) {
          const result = await executeTool(tu.name, tu.input);
          toolResults.push(result);
        }
        // Get Zaeli's follow-up after tools ran
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
    } catch (e) { console.error('startRecording:', e); }
  }
  async function stopRecording() {
    try {
      setIsRecording(false);
      if (!recordingRef.current) return;
      const status = await recordingRef.current.getStatusAsync();
      const durationSec = (status as any)?.durationMillis ? (status as any).durationMillis / 1000 : 10;
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      if (!uri) return;
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
      // If on entry screen, transition to chat with voice message
      if (screen !== 'chat') {
        enterChat(transcript);
      } else {
        // Walkie-talkie: auto-send immediately in chat
        send(transcript);
      }
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

  // ── Render messages ───────────────────────────────────────────────────────
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

      // Split into paragraphs on sentence boundaries
      const paragraphs = msg.text
        ? msg.text.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean)
        : [];

      return (
        <View key={msg.id} style={[s.zaeliMsgWrap, !showEyebrow && { marginTop: 6 }]}>
          {showEyebrow ? (
            <View style={s.zEyebrow}>
              <View style={[s.zStar, { backgroundColor: T.zaeliStar }]}>
                <Svg width="9" height="9" viewBox="0 0 16 16" fill="white"><Path d="M8 1L9.5 6.5L15 8L9.5 9.5L8 15L6.5 9.5L1 8L6.5 6.5L8 1Z"/></Svg>
              </View>
              <Text style={[s.zName, { color: T.zaeliName }]}>Zaeli</Text>
              <Text style={[s.zTs, { color: T.ink3 }]}>{msg.ts}</Text>
            </View>
          ) : (
            <Text style={[s.zTsOnly, { color: T.ink3 }]}>{msg.ts}</Text>
          )}

          {msg.isLoading ? (
            <TypingDots color={CORAL}/>
          ) : (
            <View>
              {paragraphs.map((para, pi) => (
                <Text key={pi} style={[s.zaeliMsgText, { color: T.ink }, pi < paragraphs.length - 1 && { marginBottom: 10 }]}>
                  {para}
                </Text>
              ))}
            </View>
          )}

          {/* Quick replies — brief only */}
          {msg.isBrief && !msg.isLoading && (msg.quickReplies ?? briefReplies).length > 0 && (
            <View style={s.quickRepliesWrap}>
              <Text style={[s.qrLabel, { color: T.ink3 }]}>Quick replies</Text>
              <View style={s.qrChips}>
                {(msg.quickReplies ?? briefReplies).map((chip, ci) => (
                  <TouchableOpacity
                    key={ci}
                    style={[s.qrChip, { backgroundColor: T.replyBg, borderColor: T.replyBorder }]}
                    onPress={() => handleQuickReply(chip)}
                    activeOpacity={0.7}
                  >
                    <Text style={[s.qrChipTxt, { color: T.replyText }]}>{chip}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity
                onPress={() => setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isBrief: false } : m))}
                activeOpacity={0.6}
              >
                <Text style={[s.qrDismiss, { color: T.dismiss }]}>All good →</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Icon row — non-brief completed messages only */}
          {!msg.isLoading && !msg.isBrief && (
            <View style={s.zaeliIconRow}>
              <Text style={[s.msgTime, { color: T.ink3, marginRight: 6 }]}>{msg.ts}</Text>
              <TouchableOpacity style={s.iconBtn} activeOpacity={0.6}><IcoPlay color={T.ink3}/></TouchableOpacity>
              <TouchableOpacity style={s.iconBtn} onPress={() => handleCopy(msg.text)} activeOpacity={0.6}><IcoCopy color={T.ink3}/></TouchableOpacity>
              <TouchableOpacity style={s.iconBtn} onPress={() => handleForward(msg.text)} activeOpacity={0.6}><IcoForward color={T.ink3}/></TouchableOpacity>
              <TouchableOpacity style={s.iconBtn} onPress={() => handleThumb(msg.id,'up')} activeOpacity={0.6}><IcoThumbUp color={thumbState==='up' ? TEAL : T.ink3}/></TouchableOpacity>
              <TouchableOpacity style={s.iconBtn} onPress={() => handleThumb(msg.id,'down')} activeOpacity={0.6}><IcoThumbDown color={thumbState==='down' ? CORAL : T.ink3}/></TouchableOpacity>
            </View>
          )}
        </View>
      );
    });
  }

  // ── Render ────────────────────────────────────────────────────────────────
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
      // Start waveform animation
      const loops = waveAnims.map((anim, i) =>
        Animated.loop(
          Animated.sequence([
            Animated.delay(i * 60),
            Animated.timing(anim, { toValue: 1, duration: 400 + (i % 4) * 80, useNativeDriver: true }),
            Animated.timing(anim, { toValue: 0.15, duration: 400 + (i % 3) * 80, useNativeDriver: true }),
          ])
        )
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
    } catch (e) {
      console.error('entry mic stop:', e);
      _finishEntry();
    }
  }

  function _finishEntry(transcript?: string) {
    // Keep entryRecording/entryProcessing TRUE during the fade animation
    // so the entry screen doesn't flash back to resting state mid-transition
    Animated.parallel([
      Animated.timing(entryOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      Animated.timing(chatOpacity,  { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start(() => {
      // Only NOW clear entry states — entry screen is fully invisible
      setEntryRecording(false);
      setEntryProcessing(false);
      setScreen('chat');
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
      } else {
        generateBrief(true);
      }
    });
  }

  return (
    <View style={[s.root, { backgroundColor: T.banner }]}>
      <ExpoStatusBar style="light" animated/>
      <NavMenu visible={menuOpen} onClose={() => setMenuOpen(false)}/>

      {/* ── OPTION A1 SPLASH — coral star, 1.5 seconds ── */}
      {screen !== 'chat' && (
        <Animated.View style={[s.splashWrap, { opacity: splashOpacity, zIndex: screen === 'splash' ? 20 : 10 }]} pointerEvents={screen === 'splash' ? 'auto' : 'none'}>
          <SafeAreaView style={{ flex:1, alignItems:'center', justifyContent:'center' }} edges={['top']}>
            {/* Orbs */}
            <View style={s.splashOrb1}/>
            <View style={s.splashOrb2}/>
            <View style={s.splashOrb3}/>
            {/* Coral star — bounces in */}
            <Animated.View style={[s.splashStarBox, { transform:[{ scale: starScale }] }]}>
              <Svg width="42" height="42" viewBox="0 0 16 16" fill="white">
                <Path d="M8 1L9.5 6.5L15 8L9.5 9.5L8 15L6.5 9.5L1 8L6.5 6.5L8 1Z"/>
              </Svg>
            </Animated.View>
            {/* Wordmark fades in */}
            <Animated.View style={{ opacity: wordmarkOpacity, alignItems:'center', gap:14 }}>
              <Text style={s.splashWordmark}>
                z<Text style={{ color:YELLOW }}>a</Text>el<Text style={{ color:YELLOW }}>i</Text>
              </Text>
              <View style={s.splashDots}>
                <TypingDots color="rgba(255,255,255,0.6)"/>
              </View>
            </Animated.View>
          </SafeAreaView>
        </Animated.View>
      )}

      {/* ── OPTION E2 ENTRY — mic hero, focus chips ── */}
      {screen !== 'chat' && (
        <Animated.View style={[s.entryWrap, { opacity: entryOpacity, zIndex: screen === 'entry' ? 20 : 5 }]} pointerEvents={screen === 'entry' ? 'auto' : 'none'}>
          <SafeAreaView style={{ flex:1, flexDirection:'column' }} edges={['top','bottom']}>
            <View style={s.splashOrb1}/>
            <View style={s.entryOrb2}/>

            {/* ── RECORDING STATE — full screen takeover ── */}
            {(entryRecording || entryProcessing) ? (
              <View style={s.entryRecordingWrap}>
                <Text style={s.entryListeningLbl}>
                  {entryProcessing ? 'Got it —' : 'Listening…'}
                </Text>
                <Text style={s.entryListeningSub}>
                  {entryProcessing ? 'Just a second…' : 'Speak naturally — take your time.'}
                </Text>

                {/* Big coral mic circle with pulse rings */}
                <View style={s.entryMicRingWrap}>
                  <View style={[s.entryMicRing1, entryProcessing && { borderColor:'rgba(255,255,255,0.2)' }]}/>
                  <View style={[s.entryMicRing2, entryProcessing && { borderColor:'rgba(255,255,255,0.1)' }]}/>
                  <TouchableOpacity
                    style={[s.entryMicBig, entryProcessing && { backgroundColor:'rgba(255,69,69,0.5)' }]}
                    onPress={entryProcessing ? undefined : handleEntryMicStop}
                    activeOpacity={entryProcessing ? 1 : 0.85}
                  >
                    <IcoMic color="#fff"/>
                  </TouchableOpacity>
                </View>

                {/* Animated waveform — uses waveAnims for real motion */}
                <View style={s.entryWaveWrap}>
                  {[14,26,38,48,56,48,38,26,14,22,36,46,30].map((maxH, i) => (
                    <Animated.View
                      key={i}
                      style={[
                        s.entryWaveBar,
                        {
                          height: maxH,
                          transform: [{ scaleY: waveAnims[i] }],
                          opacity: entryProcessing ? 0.3 : 1,
                        }
                      ]}
                    />
                  ))}
                </View>

                {!entryProcessing && (
                  <Text style={s.entryStopHint}>
                    <Text style={{ color:'#fff', fontFamily:'Poppins_600SemiBold' }}>Tap the mic</Text>
                    {' '}when you're done.
                  </Text>
                )}
                {entryProcessing && (
                  <View style={{ flexDirection:'row', gap:6, alignItems:'center' }}>
                    <TypingDots color="rgba(255,255,255,0.6)"/>
                  </View>
                )}
              </View>
            ) : (
              <>
                {/* ── RESTING STATE ── */}
                <View style={s.entryContent}>
                  {/* Small star */}
                  <View style={s.entryStarBox}>
                    <Svg width="22" height="22" viewBox="0 0 16 16" fill="white">
                      <Path d="M8 1L9.5 6.5L15 8L9.5 9.5L8 15L6.5 9.5L1 8L6.5 6.5L8 1Z"/>
                    </Svg>
                  </View>

                  {/* Big centred greeting — two lines */}
                  <Text style={s.entryGreeting1}>{greeting}, {MEMBER_NAME}!</Text>
                  <Text style={s.entryGreeting2}>{greetingSub}</Text>
                  <Text style={s.entrySub}>Speak or tap a topic below.</Text>

                  {/* Big mic card */}
                  <TouchableOpacity style={s.entryMicCard} onPress={handleEntryMicStart} activeOpacity={0.85}>
                    <View style={s.entryMicIcon}>
                      <IcoMic color="#fff"/>
                    </View>
                    <View style={{ flex:1 }}>
                      <Text style={s.entryMicTitle}>Speak to Zaeli</Text>
                      <Text style={s.entryMicSub}>"What's on today?" · "What's for dinner?"</Text>
                    </View>
                    {/* Static waveform */}
                    <View style={s.entryWaveStatic}>
                      {[7,13,9,17,11].map((h, i) => (
                        <View key={i} style={[s.entryWaveBarStatic, { height: h }]}/>
                      ))}
                    </View>
                  </TouchableOpacity>

                  {/* Divider */}
                  <View style={s.entryDivider}>
                    <View style={s.entryDivLine}/>
                    <Text style={s.entryDivTxt}>or tap a topic</Text>
                    <View style={s.entryDivLine}/>
                  </View>

                  {/* Focus chips — bigger, horizontal wrap */}
                  <View style={s.entryChips}>
                    {FOCUS_CHIPS.map(chip => (
                      <TouchableOpacity
                        key={chip.label}
                        style={s.entryChip}
                        onPress={() => enterChat(chip.seed)}
                        activeOpacity={0.75}
                      >
                        <Text style={s.entryChipEmoji}>{chip.emoji}</Text>
                        <Text style={s.entryChipTxt}>{chip.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Bottom bar — IDENTICAL to chat bar */}
                <View style={[s.inputArea, { position:'relative', bottom:'auto' as any, paddingBottom: Platform.OS==='ios' ? 24 : 16 }]}>
                  <View style={[s.barPill, { backgroundColor:'#fff', borderColor:'rgba(10,10,10,0.09)' }]}>
                    <TouchableOpacity style={s.barBtn} onPress={() => {}} activeOpacity={0.75}>
                      <IcoPlus color={INK3}/>
                    </TouchableOpacity>
                    <View style={[s.barSep, { backgroundColor:'rgba(10,10,10,0.1)' }]}/>
                    <TextInput
                      style={[s.barInput, { color: INK }]}
                      placeholder="Ask Zaeli anything…"
                      placeholderTextColor="rgba(10,10,10,0.5)"
                      keyboardAppearance="light"
                      selectionColor={CORAL}
                      onSubmitEditing={(e) => {
                        const txt = e.nativeEvent.text.trim();
                        if (txt) enterChat(txt);
                      }}
                    />
                    <TouchableOpacity style={s.barBtn} onPress={handleEntryMicStart} activeOpacity={0.75}>
                      <IcoMic color={INK3}/>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.barSend} onPress={() => enterChat()} activeOpacity={0.85}>
                      <IcoSend/>
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            )}
          </SafeAreaView>
        </Animated.View>
      )}

      {/* ── MAIN CHAT ── */}
      <Animated.View style={[{ flex:1 }, screen === 'chat' ? {} : { opacity: chatOpacity }]} pointerEvents={screen === 'chat' ? 'auto' : 'none'}>


      {/* BANNER */}
      <SafeAreaView style={[s.banner, { backgroundColor: T.banner }]} edges={['top']}>
        <View style={[s.bannerOrb, { backgroundColor: T.bannerOrb }]}/>
        <View style={s.bannerRow}>
          <View style={s.logo}>
            <View style={s.logoBox}>
              <Svg width="14" height="14" viewBox="0 0 16 16" fill="white"><Path d="M8 1L9.5 6.5L15 8L9.5 9.5L8 15L6.5 9.5L1 8L6.5 6.5L8 1Z"/></Svg>
            </View>
            <Text style={s.logoWord}>z<Text style={{ color:YELLOW }}>a</Text>el<Text style={{ color:YELLOW }}>i</Text></Text>
          </View>
          <View style={s.bannerRight}>
            <Text style={s.bannerDate}>{dateShort}</Text>
            <HamburgerButton onPress={() => setMenuOpen(true)} tint="#fff"/>
          </View>
        </View>
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

          {/* FLOATING BAR — grid icon + input */}
          <View style={[s.inputArea, keyboardOpen && s.inputAreaKb]}>

            {/* Grid icon — right-aligned above send button, hide when keyboard open */}
            {!keyboardOpen && (
              <Animated.View style={[s.gridRow, { opacity: pillsAnim }]}>
                <TouchableOpacity
                  style={[s.gridBtn, { backgroundColor: T.gridBg, borderColor: T.gridBorder }]}
                  onPress={() => setShowMoreGrid(true)}
                  activeOpacity={0.75}
                >
                  <View style={s.gridDots}>
                    {Array.from({ length: 9 }).map((_, i) => (
                      <View key={i} style={[s.gridDot, { backgroundColor: T.gridDot }]}/>
                    ))}
                  </View>
                </TouchableOpacity>
              </Animated.View>
            )}

            {/* Image preview */}
            {pendingImage && (
              <View style={s.imagePreviewWrap}>
                <Image source={{ uri: pendingImage }} style={s.imagePreview} resizeMode="cover"/>
                <TouchableOpacity style={s.imagePreviewRemove} onPress={() => setPendingImage(null)} activeOpacity={0.8}>
                  <IcoX/>
                </TouchableOpacity>
              </View>
            )}

            {/* Input bar */}
            <View style={[s.barPill, { backgroundColor: T.barBg, borderColor: T.barBorder }]}>
              <TouchableOpacity style={s.barBtn} onPress={openSheet} activeOpacity={0.75}>
                <IcoPlus color={T.barIcon}/>
              </TouchableOpacity>
              <View style={[s.barSep, { backgroundColor: T.barSep }]}/>
              <TextInput
                ref={inputRef}
                style={[s.barInput, { color: T.ink }]}
                value={input}
                onChangeText={setInput}
                placeholder="Chat with Zaeli…"
                placeholderTextColor={T.barPh}
                multiline
                returnKeyType="default"
                keyboardAppearance="light"
                selectionColor={CORAL}
                onFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated:true }), 350)}
              />
              {isRecording ? (
                <TouchableOpacity style={[s.barWaveBtn, { backgroundColor: CORAL }]} onPress={handleMicPress} activeOpacity={0.85}>
                  <WaveformBars/>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={s.barBtn} onPress={handleMicPress} activeOpacity={0.75}>
                  <IcoMic color={T.barIcon}/>
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

      {/* ADD SHEET — Camera · Photos · Live */}
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

      {/* GRID MODAL — tapping injects context into chat, no navigation */}
      <Modal visible={showMoreGrid} transparent animationType="fade" onRequestClose={() => setShowMoreGrid(false)}>
        <Pressable style={s.moreOverlay} onPress={() => setShowMoreGrid(false)}>
          <View style={[s.moreGrid, { backgroundColor: T.gridSheet }]}>
            <View style={[s.moreHandle, { backgroundColor: T.gridHandle }]}/>
            <Text style={[s.moreTitle, { color: T.gridTitle }]}>What do you want to talk about?</Text>
            <View style={s.moreItems}>
              {ALL_SCREENS.map(scr => (
                <TouchableOpacity
                  key={scr.key}
                  style={[s.moreItem, { backgroundColor: T.gridItemBg, borderColor: T.gridItemBdr }]}
                  onPress={() => {
                    setShowMoreGrid(false);
                    // Inject as a quick message into chat — keeps user in the conversation
                    const seeds: Record<string, string> = {
                      calendar:  "What's on the calendar?",
                      shopping:  "Give me a shopping update.",
                      meals:     "What's the meal plan looking like?",
                      tutor:     "How are the kids going with study?",
                      todos:     "What tasks are still open?",
                      kids:      "How are the kids going with their jobs?",
                      notes:     "Can you help me jot something down?",
                      travel:    "What travel plans do we have coming up?",
                      family:    "Give me a family overview.",
                    };
                    const msg = seeds[scr.key] ?? `Tell me about ${scr.label}.`;
                    setTimeout(() => send(msg), 200);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={s.moreItemEmoji}>{scr.emoji}</Text>
                  <Text style={[s.moreItemLabel, { color: T.gridItemLbl }]}>{scr.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* LIVE CAMERA OVERLAY */}
      {liveCamera && (
        <View style={s.liveCameraOverlay}>
          <SafeAreaView style={{ flex:1 }} edges={['top']}>
            <View style={s.liveCameraTop}>
              <TouchableOpacity style={s.liveCameraClose} onPress={() => setLiveCamera(false)} activeOpacity={0.8}>
                <IcoClose/>
              </TouchableOpacity>
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
      </Animated.View>
    </View>
  );
}


// ── Styles — theme-independent (colours injected via T at render time) ─────
const s = StyleSheet.create({
  root: { flex:1 },

  // ── Splash (A1) ──
  splashWrap:    { position:'absolute', top:0, left:0, right:0, bottom:0, backgroundColor:'#4D8BFF', alignItems:'center', justifyContent:'center' },
  splashOrb1:    { position:'absolute', width:320, height:320, borderRadius:160, backgroundColor:'rgba(255,255,255,0.055)', top:-110, right:-90 },
  splashOrb2:    { position:'absolute', width:200, height:200, borderRadius:100, backgroundColor:'rgba(255,255,255,0.04)', bottom:-70, left:-70 },
  splashOrb3:    { position:'absolute', width:120, height:120, borderRadius:60, backgroundColor:'rgba(255,123,107,0.12)', bottom:80, right:-30 },
  splashStarBox: { width:88, height:88, borderRadius:26, alignItems:'center', justifyContent:'center', marginBottom:22, shadowColor:'#FF4545', shadowOpacity:0.4, shadowRadius:24, shadowOffset:{ width:0, height:8 }, backgroundColor:'#FF6B55' },
  splashWordmark:{ fontFamily:'DMSerifDisplay_400Regular', fontSize:42, color:'#fff', letterSpacing:-0.8, lineHeight:50 },
  splashDots:    { alignItems:'center' },

  // ── Entry (E2) ──
  entryWrap:     { position:'absolute', top:0, left:0, right:0, bottom:0, backgroundColor:'#4D8BFF' },
  entryOrb2:     { position:'absolute', width:180, height:180, borderRadius:90, backgroundColor:'rgba(255,69,69,0.1)', bottom:160, left:-50, pointerEvents:'none' as any },
  entryContent:  { flex:1, paddingHorizontal:24, paddingTop:16, gap:10 },
  entryStarBox:  { width:44, height:44, borderRadius:13, backgroundColor:'rgba(255,255,255,0.18)', alignItems:'center', justifyContent:'center', alignSelf:'center', marginBottom:4 },

  // Greeting — big, centred, two lines
  entryGreeting1:{ fontFamily:'DMSerifDisplay_400Regular', fontSize:34, color:'#fff', letterSpacing:-0.5, lineHeight:40, textAlign:'center' as const },
  entryGreeting2:{ fontFamily:'DMSerifDisplay_400Regular', fontSize:28, color:'rgba(255,255,255,0.85)', letterSpacing:-0.4, lineHeight:34, textAlign:'center' as const, marginBottom:2 },
  entrySub:      { fontFamily:'Poppins_400Regular', fontSize:14, color:'rgba(255,255,255,0.55)', textAlign:'center' as const, marginBottom:4 },

  // Mic card
  entryMicCard:  { flexDirection:'row', alignItems:'center', gap:14, backgroundColor:'rgba(255,123,107,0.22)', borderWidth:1.5, borderColor:'rgba(255,123,107,0.45)', borderRadius:20, padding:18 },
  entryMicIcon:  { width:52, height:52, borderRadius:26, alignItems:'center', justifyContent:'center', backgroundColor:'#FF4545', shadowColor:'#FF4545', shadowOpacity:0.45, shadowRadius:14, shadowOffset:{ width:0, height:4 }, flexShrink:0 },
  entryMicTitle: { fontFamily:'Poppins_700Bold', fontSize:16, color:'#fff', marginBottom:3 },
  entryMicSub:   { fontFamily:'Poppins_400Regular', fontSize:12, color:'rgba(255,255,255,0.6)', lineHeight:18 },

  // Static waveform in mic card
  entryWaveStatic:  { flexDirection:'row', alignItems:'center', gap:3 },
  entryWaveBarStatic:{ width:3.5, borderRadius:2, backgroundColor:'rgba(255,255,255,0.45)' },

  // Divider
  entryDivider:  { flexDirection:'row', alignItems:'center', gap:10 },
  entryDivLine:  { flex:1, height:1, backgroundColor:'rgba(255,255,255,0.15)' },
  entryDivTxt:   { fontFamily:'Poppins_400Regular', fontSize:11, color:'rgba(255,255,255,0.35)' },

  // Focus chips — horizontal wrap, bigger
  entryChips:    { flexDirection:'row', flexWrap:'wrap', gap:8 },
  entryChip:     { flexDirection:'row', alignItems:'center', gap:7, backgroundColor:'rgba(255,255,255,0.13)', borderWidth:1.5, borderColor:'rgba(255,255,255,0.22)', borderRadius:24, paddingVertical:10, paddingHorizontal:15 },
  entryChipEmoji:{ fontSize:15 },
  entryChipTxt:  { fontFamily:'Poppins_600SemiBold', fontSize:13, color:'rgba(255,255,255,0.92)' },

  // ── Recording state ──
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

  // Voice message label
  voiceLabel:    { flexDirection:'row', alignItems:'center', gap:4, justifyContent:'flex-end', marginBottom:4 },
  voiceLabelTxt: { fontFamily:'Poppins_400Regular', fontSize:10 },

  // Banner
  banner:     { paddingHorizontal:20, paddingBottom:12, overflow:'hidden' },
  bannerOrb:  { position:'absolute', width:150, height:150, borderRadius:75, top:-50, right:-30 },
  bannerRow:  { flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingTop:6 },
  logo:       { flexDirection:'row', alignItems:'center', gap:8 },
  logoBox:    { width:32, height:32, backgroundColor:'rgba(255,255,255,0.2)', borderRadius:9, alignItems:'center', justifyContent:'center' },
  logoWord:   { fontFamily:'DMSerifDisplay_400Regular', fontSize:22, color:'#fff', letterSpacing:-0.4 },
  bannerRight:{ flexDirection:'row', alignItems:'center', gap:12 },
  bannerDate: { fontFamily:'Poppins_600SemiBold', fontSize:12, color:'rgba(255,255,255,0.65)' },

  // KAV + scroll
  kavWrap:       { flex:1 },
  scrollWrap:    { flex:1, position:'relative' },
  scroll:        { flex:1 },
  scrollContent: { paddingHorizontal:18, paddingTop:14, paddingBottom:170 },

  // Date divider
  dateRow:  { flexDirection:'row', alignItems:'center', marginBottom:20, gap:10 },
  dateLine: { flex:1, height:1 },
  dateLabel:{ fontFamily:'Poppins_600SemiBold', fontSize:9, letterSpacing:1.2, textTransform:'uppercase' as const },

  // Zaeli message
  zaeliMsgWrap: { marginBottom:6 },
  zEyebrow:     { flexDirection:'row', alignItems:'center', gap:5, marginBottom:6 },
  zStar:        { width:16, height:16, borderRadius:5, alignItems:'center', justifyContent:'center', flexShrink:0 },
  zName:        { fontFamily:'Poppins_700Bold', fontSize:10, letterSpacing:0.2 },
  zTs:          { fontFamily:'Poppins_400Regular', fontSize:9, marginLeft:'auto' as any },
  zTsOnly:      { fontFamily:'Poppins_400Regular', fontSize:10, marginBottom:5 },
  zaeliMsgText: { fontFamily:'Poppins_400Regular', fontSize:17, lineHeight:27, letterSpacing:-0.1 },
  zaeliIconRow: { flexDirection:'row', alignItems:'center', marginTop:7, gap:2 },

  // Typing dots
  dotsRow: { flexDirection:'row', gap:5, alignItems:'center', paddingVertical:4 },
  dot:     { width:7, height:7, borderRadius:4 },

  // Quick replies
  quickRepliesWrap: { marginTop:12 },
  qrLabel:          { fontFamily:'Poppins_600SemiBold', fontSize:10, letterSpacing:0.2, marginBottom:7 },
  qrChips:          { flexDirection:'row', flexWrap:'wrap', gap:6 },
  qrChip:           { borderWidth:1.5, borderRadius:20, paddingVertical:7, paddingHorizontal:13 },
  qrChipTxt:        { fontFamily:'Poppins_500Medium', fontSize:13 },
  qrDismiss:        { fontFamily:'Poppins_400Regular', fontSize:12, marginTop:9 },

  // User bubble
  userMsgWrap: { alignItems:'flex-end', marginBottom:6 },
  userBubble:  { borderRadius:16, borderBottomRightRadius:3, paddingHorizontal:13, paddingVertical:9, maxWidth:'82%' as any },
  userMsgText: { fontFamily:'Poppins_400Regular', fontSize:17, lineHeight:27 },
  msgImage:    { width:'100%' as any, height:180, borderRadius:12, marginBottom:6 },

  // Icon rows
  msgTime:     { fontFamily:'Poppins_400Regular', fontSize:10 },
  userIconRow: { flexDirection:'row', alignItems:'center', marginTop:4, gap:2, justifyContent:'flex-end' },
  iconBtn:     { width:26, height:26, alignItems:'center', justifyContent:'center', borderRadius:6 },

  // Scroll down button
  scrollDownBtn:   { position:'absolute', bottom:170, left:0, right:0, alignItems:'center', zIndex:50 },
  scrollDownInner: { width:32, height:32, borderRadius:16, backgroundColor:'rgba(10,10,10,0.4)', alignItems:'center', justifyContent:'center' },

  // Input area — no fade line, clean background handled by scrollContent paddingBottom
  inputArea:   { position:'absolute', bottom:0, left:0, right:0, paddingHorizontal:14, paddingBottom: Platform.OS==='ios' ? 30 : 18, paddingTop:10, backgroundColor:'transparent' },
  inputAreaKb: { paddingBottom: Platform.OS==='ios' ? 8 : 6 },

  // Grid icon — bigger, centred above send button (right-aligned to match send position)
  gridRow:  { flexDirection:'row', justifyContent:'flex-end', marginBottom:8, paddingRight:1 },
  gridBtn:  { width:44, height:44, borderRadius:12, borderWidth:1, alignItems:'center', justifyContent:'center' },
  gridDots: { flexDirection:'row', flexWrap:'wrap', width:18, gap:3 },
  gridDot:  { width:4, height:4, borderRadius:1 },

  // Image preview
  imagePreviewWrap:   { marginBottom:8, alignSelf:'flex-start', position:'relative' },
  imagePreview:       { width:80, height:80, borderRadius:10 },
  imagePreviewRemove: { position:'absolute', top:-6, right:-6, width:22, height:22, borderRadius:11, backgroundColor:'#0A0A0A', alignItems:'center', justifyContent:'center' },

  // Input bar
  barPill:    { flexDirection:'row', alignItems:'center', gap:8, borderRadius:30, paddingVertical:14, paddingHorizontal:16, borderWidth:1, shadowColor:'#000', shadowOpacity:0.07, shadowRadius:16, shadowOffset:{ width:0, height:-2 }, elevation:4 },
  barBtn:     { width:34, height:34, alignItems:'center', justifyContent:'center' },
  barSep:     { width:1, height:18, flexShrink:0 },
  barInput:   { flex:1, fontFamily:'Poppins_400Regular', fontSize:15, maxHeight:100, paddingVertical:0 },
  barWaveBtn: { width:40, height:40, borderRadius:20, alignItems:'center', justifyContent:'center' },
  waveRow:    { flexDirection:'row', alignItems:'center', gap:3 },
  waveBar:    { width:3.5, height:18, borderRadius:2, backgroundColor:'#fff' },
  barSend:    { width:32, height:32, borderRadius:16, backgroundColor:CORAL, alignItems:'center', justifyContent:'center', flexShrink:0 },

  // Sheet
  sheetOverlay:  { flex:1, backgroundColor:'rgba(0,0,0,0.4)', justifyContent:'flex-end' },
  sheet:         { backgroundColor:'#FAF8F5', borderTopLeftRadius:26, borderTopRightRadius:26, paddingHorizontal:20, shadowColor:'#000', shadowOpacity:0.2, shadowRadius:20, shadowOffset:{ width:0, height:-4 } },
  sheetHandle:   { width:36, height:4, borderRadius:2, backgroundColor:'rgba(10,10,10,0.14)', alignSelf:'center', marginTop:12, marginBottom:4 },
  sheetHeader:   { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingVertical:18 },
  sheetCloseBtn: { width:44, height:44, borderRadius:22, backgroundColor:'rgba(10,10,10,0.07)', alignItems:'center', justifyContent:'center' },
  sheetTitle:    { fontFamily:'Poppins_700Bold', fontSize:17, color:'#0A0A0A' },
  sheetTiles:    { flexDirection:'row', gap:12, marginBottom:10 },
  sheetTile:     { flex:1, backgroundColor:'rgba(10,10,10,0.05)', borderRadius:20, paddingVertical:30, alignItems:'center', justifyContent:'center', gap:12 },
  sheetTileLabel:{ fontFamily:'Poppins_500Medium', fontSize:14, color:'#0A0A0A' },

  // More grid modal
  moreOverlay: { flex:1, backgroundColor:'rgba(0,0,0,0.5)', justifyContent:'flex-end' },
  moreGrid:    { borderTopLeftRadius:24, borderTopRightRadius:24, padding:20, paddingBottom: Platform.OS==='ios' ? 40 : 24 },
  moreHandle:  { width:34, height:4, borderRadius:2, alignSelf:'center', marginBottom:14 },
  moreTitle:   { fontFamily:'Poppins_700Bold', fontSize:14, marginBottom:14 },
  moreItems:   { flexDirection:'row', flexWrap:'wrap', gap:9 },
  moreItem:    { width:'30%' as any, borderRadius:14, borderWidth:1, paddingVertical:14, alignItems:'center', gap:5 },
  moreItemEmoji:{ fontSize:20 },
  moreItemLabel:{ fontFamily:'Poppins_600SemiBold', fontSize:10, textAlign:'center' as const },

  // Live camera overlay
  liveCameraOverlay: { position:'absolute', top:0, left:0, right:0, bottom:0, backgroundColor:'#111', zIndex:200 },
  liveCameraTop:     { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:16, paddingVertical:12 },
  liveCameraClose:   { width:36, height:36, borderRadius:18, backgroundColor:'rgba(255,255,255,0.15)', alignItems:'center', justifyContent:'center' },
  liveCameraTitle:   { fontFamily:'Poppins_700Bold', fontSize:15, color:'#fff' },
  liveCameraBody:    { flex:1, alignItems:'center', justifyContent:'center', padding:32, gap:24 },
  liveCameraHint:    { fontFamily:'Poppins_400Regular', fontSize:15, color:'rgba(255,255,255,0.55)', textAlign:'center' as const, lineHeight:25 },
  liveCameraBtn:     { backgroundColor:CORAL, borderRadius:16, paddingVertical:15, paddingHorizontal:30 },
  liveCameraBtnTxt:  { fontFamily:'Poppins_700Bold', fontSize:15, color:'#fff' },
});
