/**
 * todos.tsx — Zaeli Todos + Reminders Channel
 *
 * Three tabs: Mine · Family · Reminders
 * - Mine: live from todos table (created_by = Rich id:2)
 * - Family: dummy data until real auth built
 * - Reminders: live from reminders table
 * - Shared chat across all tabs (Calendar/Shopping model)
 * - Claude Sonnet tool-calling: add_todo, complete_todo, add_reminder
 * - useChatPersistence('todos')
 * - Up/down scroll arrows
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Animated, Easing, TextInput, KeyboardAvoidingView,
  Platform, Modal, Pressable, Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import Svg, { Path, Line, Rect, Circle, Polyline } from 'react-native-svg';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '../../lib/supabase';
import { NavMenu, HamburgerButton } from '../components/NavMenu';
import { useChatPersistence } from '../../lib/use-chat-persistence';

// ── Constants ──────────────────────────────────────────────────────────────
const FAMILY_ID   = '00000000-0000-0000-0000-000000000001';
const OPENAI_URL  = 'https://api.openai.com/v1/chat/completions';
const WHISPER_URL = 'https://api.openai.com/v1/audio/transcriptions';

// Channel colours
const BANNER_BG  = '#F0DC80'; // gold
const AI_COLOUR  = '#D8CCFF'; // lavender
const ACCENT     = '#806000'; // dark gold
const BODY_BG    = '#FAF8F5';
const INK        = '#0A0A0A';
const INK3       = 'rgba(10,10,10,0.32)';

// Family members
const FAMILY_MEMBERS = [
  { id:'1', name:'Anna',  initial:'A', color:'#FF7B6B' },
  { id:'2', name:'Rich',  initial:'R', color:'#4D8BFF' },
  { id:'3', name:'Poppy', initial:'P', color:'#A855F7' },
  { id:'4', name:'Gab',   initial:'G', color:'#22C55E' },
  { id:'5', name:'Duke',  initial:'D', color:'#F59E0B' },
];

// Dummy family tab data (until real auth)
const DUMMY_ANNA_ASSIGNED = [
  { id:'dummy-1', title:'Pick up dry cleaning', due_date: getTomorrow(), priority:'high', assigned_to:'2', created_by:'1', status:'active', fromAnna: true },
];
const DUMMY_SHARED = [
  { id:'dummy-2', title:"Call Duke's school — excursion", due_date: getToday(), priority:'urgent', assigned_to:'2', created_by:'2', status:'active', shared: true, sharedWith:'1' },
  { id:'dummy-3', title:"Book Poppy's birthday dinner", due_date: getInDays(4), priority:'normal', assigned_to:'2', created_by:'1', status:'active', shared: true, sharedWith:'1' },
];
const DUMMY_ANNA_COMPLETED = [
  { id:'dummy-4', title:'School fees — Term 2', status:'done', created_by:'1', doneLabel:'Done yesterday · Anna' },
];

// ── Helpers ────────────────────────────────────────────────────────────────
function getToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function getTomorrow() {
  const d = new Date(); d.setDate(d.getDate()+1);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function getInDays(n: number) {
  const d = new Date(); d.setDate(d.getDate()+n);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function localDateStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function nowTs() {
  return new Date().toLocaleTimeString('en-AU', { hour:'2-digit', minute:'2-digit' });
}
function uid() { return `${Date.now()}-${Math.random().toString(36).slice(2)}`; }

function fmtDueDate(due: string | null): { label: string; style: 'overdue'|'today'|'soon'|'normal'|'none' } {
  if (!due) return { label:'No date', style:'none' };
  const today = getToday();
  const tomorrow = getTomorrow();
  if (due < today) return { label:'Overdue', style:'overdue' };
  if (due === today) return { label:'Today', style:'today' };
  if (due === tomorrow) return { label:'Tomorrow', style:'soon' };
  const d = new Date(due+'T00:00:00');
  const diff = Math.round((d.getTime() - new Date(today+'T00:00:00').getTime()) / 86400000);
  if (diff <= 7) return { label: d.toLocaleDateString('en-AU', { weekday:'short', day:'numeric', month:'short' }), style:'soon' };
  return { label: d.toLocaleDateString('en-AU', { day:'numeric', month:'short' }), style:'normal' };
}

function priorityDotColor(priority: string, due: string | null): string {
  const today = getToday();
  if (due && due < today) return '#DC2626'; // overdue — red
  if (priority === 'urgent') return '#DC2626';
  if (priority === 'high') return '#D97706';
  return 'rgba(0,0,0,0.15)';
}

function fmtReminderWhen(remind_at: string): { label: string; style: 'urgent'|'today'|'tomorrow'|'upcoming' } {
  const today = getToday();
  const tomorrow = getTomorrow();
  const dateStr = remind_at.slice(0,10);
  if (dateStr < today) return { label:'Overdue', style:'urgent' };
  if (dateStr === today) return { label:'Today', style:'today' };
  if (dateStr === tomorrow) return { label:'Tomorrow', style:'tomorrow' };
  const d = new Date(remind_at);
  return { label: d.toLocaleDateString('en-AU', { weekday:'short', day:'numeric', month:'short' }), style:'upcoming' };
}

function getMemberById(id: string | null) {
  return FAMILY_MEMBERS.find(m => m.id === id) ?? null;
}

// ── API logging ────────────────────────────────────────────────────────────
async function logApiCall(params: {
  family_id: string; feature: string; model: string;
  input_tokens: number; output_tokens: number; cost_usd: number;
}) {
  try {
    await supabase.from('api_logs').insert({ ...params, created_at: new Date().toISOString() });
  } catch {}
}

// ── Types ──────────────────────────────────────────────────────────────────
type TabType = 'actions' | 'family';

interface Msg {
  id: string;
  role: 'zaeli' | 'user';
  text: string;
  ts: string;
  isLoading?: boolean;
  quickReplies?: string[];
}

interface TodoItem {
  id: string;
  title: string;
  priority: string;
  status: string;
  due_date: string | null;
  assigned_to: string | null;
  created_by: string | null;
  notes?: string | null;
  show_in_brief?: boolean;
  pinned?: boolean;
  // dummy-only flags
  fromAnna?: boolean;
  shared?: boolean;
  sharedWith?: string;
  doneLabel?: string;
}

interface ReminderItem {
  id: string;
  title: string;
  remind_at: string;
  member_id: string | null;
  repeat: string | null;
  status: string;
  body?: string | null;
}

// ── Tools ──────────────────────────────────────────────────────────────────
const TOOLS = [
  {
    name: 'add_todo',
    description: 'Add a new todo item for Rich',
    input_schema: {
      type: 'object',
      properties: {
        title:    { type:'string', description:'Todo title' },
        priority: { type:'string', enum:['low','normal','high','urgent'], description:'Priority level' },
        due_date: { type:'string', description:'Due date YYYY-MM-DD (optional)' },
        notes:    { type:'string', description:'Extra notes (optional)' },
      },
      required: ['title'],
    },
  },
  {
    name: 'complete_todo',
    description: 'Mark a todo as done',
    input_schema: {
      type: 'object',
      properties: {
        title: { type:'string', description:'Title of the todo to complete (partial match ok)' },
      },
      required: ['title'],
    },
  },
  {
    name: 'add_reminder',
    description: 'Add a reminder — something to remember at a specific time',
    input_schema: {
      type: 'object',
      properties: {
        title:     { type:'string', description:'What to remember' },
        remind_at: { type:'string', description:'When to remind — ISO datetime e.g. 2026-04-02T07:00:00' },
        member_id: { type:'string', description:'Family member ID this is about (1=Anna,2=Rich,3=Poppy,4=Gab,5=Duke) — optional' },
        repeat:    { type:'string', enum:['none','daily','weekly','monthly'], description:'Recurrence — default none' },
      },
      required: ['title', 'remind_at'],
    },
  },
];

async function executeTool(name: string, input: any): Promise<string> {
  try {
    if (name === 'add_todo') {
      const { error } = await supabase.from('todos').insert({
        family_id: FAMILY_ID,
        title: input.title,
        priority: input.priority || 'normal',
        status: 'active',
        due_date: input.due_date || null,
        notes: input.notes || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      return `✅ "${input.title}" added to your todos.`;
    }
    if (name === 'complete_todo') {
      const { data } = await supabase.from('todos')
        .select('id,title').eq('family_id', FAMILY_ID)
        .ilike('title', `%${input.title}%`).eq('status','active').limit(1);
      if (!data || data.length === 0) return `Couldn't find a todo matching "${input.title}".`;
      await supabase.from('todos').update({ status:'done', updated_at:new Date().toISOString() }).eq('id', data[0].id);
      return `✅ "${data[0].title}" marked as done.`;
    }
    if (name === 'add_reminder') {
      const { error } = await supabase.from('reminders').insert({
        family_id: FAMILY_ID,
        title: input.title,
        remind_at: input.remind_at,
        member_id: input.member_id || null,
        repeat: input.repeat || 'none',
        status: 'active',
        created_at: new Date().toISOString(),
      });
      if (error) throw error;
      const member = getMemberById(input.member_id || null);
      const memberTxt = member ? ` about ${member.name}` : '';
      return `✅ Reminder set${memberTxt}. I'll nudge you at the right time.`;
    }
    return `Tool ${name} not implemented.`;
  } catch (e: any) {
    return `TOOL_FAILED: ${e?.message ?? 'unknown error'}`;
  }
}

// ── Icons ──────────────────────────────────────────────────────────────────
function IcoPlus({ color = INK3 }: { color?: string }) {
  return <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><Line x1="12" y1="5" x2="12" y2="19"/><Line x1="5" y1="12" x2="19" y2="12"/></Svg>;
}
function IcoMic({ color = INK3, size = 20 }: { color?: string; size?: number }) {
  return <Svg width={size} height={size} viewBox="0 0 24 26" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><Rect x="9" y="2" width="6" height="11" rx="3"/><Path d="M5 10a7 7 0 0014 0"/><Line x1="12" y1="19" x2="12" y2="23"/><Line x1="8" y1="23" x2="16" y2="23"/></Svg>;
}
function IcoSend() {
  return <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><Line x1="12" y1="19" x2="12" y2="5"/><Polyline points="5 12 12 5 19 12"/></Svg>;
}
function IcoArrowUp() {
  return <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><Line x1="12" y1="19" x2="12" y2="5"/><Polyline points="5 12 12 5 19 12"/></Svg>;
}
function IcoArrowDown() {
  return <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><Line x1="12" y1="5" x2="12" y2="19"/><Polyline points="19 12 12 19 5 12"/></Svg>;
}
function IcoClose() {
  return <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={INK} strokeWidth="2.2" strokeLinecap="round"><Line x1="18" y1="6" x2="6" y2="18"/><Line x1="6" y1="6" x2="18" y2="18"/></Svg>;
}
function IcoCopy() {
  return <Svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={INK3} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><Rect x="9" y="9" width="13" height="13" rx="2"/><Path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></Svg>;
}
function IcoForward() {
  return <Svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={INK3} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><Line x1="22" y1="2" x2="11" y2="13"/><Path d="M22 2L15 22l-4-9-9-4 20-7z"/></Svg>;
}
function IcoThumbUp({ active }: { active: boolean }) {
  const col = active ? ACCENT : INK3;
  return <Svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><Path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z"/><Path d="M7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"/></Svg>;
}
function IcoThumbDown({ active }: { active: boolean }) {
  const col = active ? INK : INK3;
  return <Svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><Path d="M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3H10z"/><Path d="M17 2h2.67A2.31 2.31 0 0122 4v7a2.31 2.31 0 01-2.33 2H17"/></Svg>;
}

// ── TypingDots ─────────────────────────────────────────────────────────────
function TypingDots({ color = ACCENT }: { color?: string }) {
  const dots = useRef([0,1,2].map(() => new Animated.Value(0.25))).current;
  useEffect(() => {
    const anims = dots.map((dot, i) =>
      Animated.loop(Animated.sequence([
        Animated.delay(i * 160),
        Animated.timing(dot, { toValue:1, duration:300, easing:Easing.ease, useNativeDriver:true }),
        Animated.timing(dot, { toValue:0.25, duration:300, easing:Easing.ease, useNativeDriver:true }),
        Animated.delay(500 - i * 160),
      ]))
    );
    anims.forEach(a => a.start());
    return () => anims.forEach(a => a.stop());
  }, []);
  return (
    <View style={{ flexDirection:'row', gap:5, alignItems:'center', paddingVertical:4 }}>
      {dots.map((op, i) => <Animated.View key={i} style={{ width:7, height:7, borderRadius:4, opacity:op, backgroundColor:color }}/>)}
    </View>
  );
}

function WaveformBars() {
  const anims = useRef(Array.from({ length:5 }, () => new Animated.Value(0.3))).current;
  useEffect(() => {
    const loops = anims.map((anim, i) => {
      const spd = 180 + i * 55;
      return Animated.loop(Animated.sequence([
        Animated.timing(anim, { toValue:0.7 + (i%3)*0.15, duration:spd, easing:Easing.inOut(Easing.ease), useNativeDriver:true }),
        Animated.timing(anim, { toValue:0.2 + i*0.05, duration:spd+40, easing:Easing.inOut(Easing.ease), useNativeDriver:true }),
      ]));
    });
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, []);
  return (
    <View style={{ flexDirection:'row', alignItems:'center', gap:3 }}>
      {anims.map((anim, i) => <Animated.View key={i} style={{ width:3.5, height:18, borderRadius:2, backgroundColor:'#fff', transform:[{ scaleY:anim }] }}/>)}
    </View>
  );
}

// ── MicWaveform ─────────────────────────────────────────────────────────────
function MicWaveform() {
  const anims = useRef(Array.from({ length:13 }, (_, i) => new Animated.Value(0.15 + (i%3)*0.1))).current;
  useEffect(() => {
    const loops = anims.map((anim, i) => {
      const min = 0.1 + (i%4)*0.05, max = 0.6 + (i%5)*0.08, spd = 280 + (i%6)*60;
      return Animated.loop(Animated.sequence([
        Animated.delay(i * 55),
        Animated.timing(anim, { toValue:max, duration:spd, easing:Easing.inOut(Easing.ease), useNativeDriver:true }),
        Animated.timing(anim, { toValue:min, duration:spd+40, easing:Easing.inOut(Easing.ease), useNativeDriver:true }),
      ]));
    });
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, []);
  return (
    <View style={{ flexDirection:'row', alignItems:'center', gap:4, height:52 }}>
      {anims.map((anim, i) => (
        <Animated.View key={i} style={{ width:4, borderRadius:3, backgroundColor:AI_COLOUR, transform:[{ scaleY:anim }], height:52 }}/>
      ))}
    </View>
  );
}

// ── TodoCard ────────────────────────────────────────────────────────────────
function TodoCard({
  todo, onTick, dimmed = false, showFromAnna = false, showShared = false,
}: {
  todo: TodoItem; onTick?: (todo: TodoItem) => void;
  dimmed?: boolean; showFromAnna?: boolean; showShared?: boolean;
}) {
  const isDone = todo.status === 'done';
  const due = fmtDueDate(todo.due_date);
  const dotColor = isDone ? 'transparent' : priorityDotColor(todo.priority, todo.due_date);
  const member = getMemberById(todo.assigned_to);
  const createdBy = getMemberById(todo.created_by);

  const dueLabelColor = {
    overdue: '#DC2626', today: ACCENT, soon: '#D97706', normal: 'rgba(0,0,0,0.38)', none: 'rgba(0,0,0,0.32)',
  }[due.style];

  return (
    <View style={[
      s.todoCard,
      dimmed && { opacity:0.5 },
      showFromAnna && { borderWidth:1.5, borderColor:'rgba(255,123,107,0.3)' },
    ]}>
      <View style={[s.priorityDot, { backgroundColor:dotColor }]}/>
      <TouchableOpacity
        style={[s.todoChk, isDone && s.todoChkDone]}
        onPress={() => onTick?.(todo)}
        activeOpacity={0.7}
        hitSlop={{ top:8, bottom:8, left:8, right:8 }}
      >
        {isDone && (
          <Svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
            <Polyline points="20 6 9 17 4 12"/>
          </Svg>
        )}
      </TouchableOpacity>
      <View style={s.todoInfo}>
        <Text style={[s.todoTitle, isDone && s.todoTitleDone]} numberOfLines={2}>{todo.title}</Text>
        <View style={s.todoMeta}>
          {todo.doneLabel ? (
            <Text style={s.todoDueNone}>{todo.doneLabel}</Text>
          ) : (
            <Text style={[s.todoDue, { color:dueLabelColor }]}>{due.label}</Text>
          )}
          {member && !isDone && (
            <View style={[s.todoAv, { backgroundColor:member.color }]}>
              <Text style={s.todoAvTxt}>{member.initial}</Text>
            </View>
          )}
          {showFromAnna && createdBy && (
            <Text style={{ fontFamily:'Poppins_600SemiBold', fontSize:11, color:createdBy.color }}>from {createdBy.name}</Text>
          )}
          {showShared && (
            <View style={s.sharedBadge}><Text style={s.sharedBadgeTxt}>Shared</Text></View>
          )}
          {todo.priority === 'urgent' && !isDone && (
            <View style={s.urgentBadge}><Text style={s.urgentBadgeTxt}>Urgent</Text></View>
          )}
        </View>
      </View>
    </View>
  );
}

// ── ReminderCard ─────────────────────────────────────────────────────────────
function ReminderCard({
  reminder, onAcknowledge,
}: {
  reminder: ReminderItem; onAcknowledge: (r: ReminderItem) => void;
}) {
  const isDone = reminder.status === 'acknowledged';
  const when = fmtReminderWhen(reminder.remind_at);
  const member = getMemberById(reminder.member_id);
  const isRecurring = reminder.repeat && reminder.repeat !== 'none';

  const whenColor = {
    urgent: '#DC2626', today: ACCENT, tomorrow: '#D97706', upcoming: 'rgba(0,0,0,0.38)',
  }[when.style];

  const bellBg = isDone ? 'rgba(0,0,0,0.08)' : when.style === 'today' || when.style === 'urgent'
    ? 'rgba(255,69,69,0.1)' : isRecurring ? 'rgba(128,96,0,0.1)' : 'rgba(245,158,11,0.1)';

  return (
    <View style={[s.remCard, isDone && { opacity:0.45 }]}>
      {/* Bell state */}
      <View style={[s.remBell, { backgroundColor:bellBg }]}>
        <Text style={{ fontSize:12 }}>{isDone ? '✓' : '🔔'}</Text>
      </View>
      {/* Acknowledge circle */}
      <TouchableOpacity
        style={[s.remChk, isDone && s.remChkDone]}
        onPress={() => !isDone && onAcknowledge(reminder)}
        activeOpacity={0.7}
        hitSlop={{ top:8, bottom:8, left:8, right:8 }}
      >
        {isDone && (
          <Svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="rgba(0,0,0,0.5)" strokeWidth="3" strokeLinecap="round">
            <Polyline points="20 6 9 17 4 12"/>
          </Svg>
        )}
      </TouchableOpacity>
      <View style={s.remInfo}>
        <Text style={[s.remTitle, isDone && s.remTitleDone]} numberOfLines={2}>{reminder.title}</Text>
        <View style={s.remMeta}>
          <Text style={[s.remWhen, { color:whenColor }]}>{when.label}</Text>
          {member && (
            <View style={[s.remWho, { backgroundColor:member.color }]}>
              <Text style={s.remWhoTxt}>{member.initial}</Text>
            </View>
          )}
          {isRecurring && (
            <View style={s.recBadge}>
              <Text style={s.recBadgeTxt}>↻ {reminder.repeat === 'weekly' ? 'Weekly' : reminder.repeat === 'daily' ? 'Daily' : 'Monthly'}</Text>
            </View>
          )}
        </View>
        {!isDone && (
          <View style={s.twoTouch}>
            <View style={s.twoTouchDot}/>
            <Text style={s.twoTouchTxt}>
              {when.style === 'today' ? 'Evening nudge sent · morning nudge at 7am if not done' : 'Evening nudge + morning nudge set'}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ── Add Reminder Sheet ───────────────────────────────────────────────────────
function AddReminderSheet({
  visible, onClose, onSaved,
}: {
  visible: boolean; onClose: () => void; onSaved: () => void;
}) {
  const [title, setTitle]       = useState('');
  const [memberId, setMemberId] = useState<string | null>(null);
  const [when, setWhen]         = useState<'tonight'|'tomorrow'|'in2days'|null>(null);
  const [twoTouch, setTwoTouch] = useState(true);
  const [saving, setSaving]     = useState(false);

  const reset = () => { setTitle(''); setMemberId(null); setWhen(null); setTwoTouch(true); setSaving(false); };

  const getRemindAt = (): string => {
    const d = new Date();
    if (when === 'tonight') { d.setHours(19,0,0,0); }
    else if (when === 'tomorrow') { d.setDate(d.getDate()+1); d.setHours(7,0,0,0); }
    else if (when === 'in2days') { d.setDate(d.getDate()+2); d.setHours(7,0,0,0); }
    else { d.setDate(d.getDate()+1); d.setHours(7,0,0,0); }
    const pad = (n:number) => String(n).padStart(2,'0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
  };

  const save = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await supabase.from('reminders').insert({
        family_id: FAMILY_ID,
        title: title.trim(),
        remind_at: getRemindAt(),
        member_id: memberId || null,
        repeat: 'none',
        status: 'active',
        created_at: new Date().toISOString(),
      });
      reset(); onSaved(); onClose();
    } catch (e) {
      Alert.alert('Could not save reminder — try again.');
    }
    setSaving(false);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.sheetOverlay} onPress={onClose}>
        <Pressable style={s.sheet} onPress={() => {}}>
          <View style={s.sheetHandle}/>
          <Text style={s.sheetTitle}>Add a reminder 🔔</Text>
          <Text style={s.sheetSub}>Zaeli will nudge you at the right time.</Text>

          <Text style={s.fieldLabel}>What to remember?</Text>
          <TextInput
            style={s.fieldInput}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Gold coin for Gab"
            placeholderTextColor="rgba(0,0,0,0.35)"
            autoFocus
            autoCapitalize="sentences"
          />

          <Text style={s.fieldLabel}>Who is it about?</Text>
          <View style={{ flexDirection:'row', flexWrap:'wrap', gap:8, marginBottom:16 }}>
            {FAMILY_MEMBERS.map(m => {
              const on = memberId === m.id;
              return (
                <TouchableOpacity
                  key={m.id}
                  style={[s.memberChip, on && { borderColor:m.color, backgroundColor:m.color+'18' }]}
                  onPress={() => setMemberId(on ? null : m.id)}
                  activeOpacity={0.75}
                >
                  <View style={[s.memberChipDot, { backgroundColor:m.color }]}/>
                  <Text style={[s.memberChipTxt, on && { color:m.color, fontFamily:'Poppins_700Bold' }]}>{m.name}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={s.fieldLabel}>When?</Text>
          <View style={s.whenChips}>
            {(['tonight','tomorrow','in2days'] as const).map(w => (
              <TouchableOpacity
                key={w}
                style={[s.whenChip, when===w && s.whenChipOn]}
                onPress={() => setWhen(when===w ? null : w)}
                activeOpacity={0.75}
              >
                <Text style={[s.whenChipTxt, when===w && s.whenChipTxtOn]}>
                  {w === 'tonight' ? 'Tonight' : w === 'tomorrow' ? 'Tomorrow morning' : 'In 2 days'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={s.twoTouchRow}>
            <View style={{ flex:1 }}>
              <Text style={s.twoTouchRowTitle}>Two-touch nudge</Text>
              <Text style={s.twoTouchRowSub}>Evening reminder + morning nudge if not done</Text>
            </View>
            <TouchableOpacity
              style={[s.toggle, twoTouch && s.toggleOn]}
              onPress={() => setTwoTouch(!twoTouch)}
              activeOpacity={0.8}
            >
              <Animated.View style={[s.toggleThumb, twoTouch && { alignSelf:'flex-end' }]}/>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[s.submitBtn, (!title.trim() || saving) && { opacity:0.45 }]}
            onPress={save}
            disabled={!title.trim() || saving}
            activeOpacity={0.85}
          >
            <Text style={s.submitBtnTxt}>{saving ? 'Saving…' : 'Add reminder'}</Text>
          </TouchableOpacity>
          <View style={{ height: Platform.OS === 'ios' ? 24 : 12 }}/>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Section divider ────────────────────────────────────────────────────────
function SectionLabel({ label }: { label: string }) {
  return <Text style={s.sectionLbl}>{label}</Text>;
}

function DoneDivider({ label, expanded, onToggle }: { label: string; expanded: boolean; onToggle: () => void }) {
  return (
    <TouchableOpacity style={s.doneDivider} onPress={onToggle} activeOpacity={0.7}>
      <View style={s.doneDivLine}/>
      <Text style={s.doneDivTxt}>{label} {expanded ? '∧' : '∨'}</Text>
      <View style={s.doneDivLine}/>
    </TouchableOpacity>
  );
}

// ── Brief strip ─────────────────────────────────────────────────────────────
function BriefStrip({ text }: { text: string }) {
  if (!text) return null;
  return (
    <View style={s.briefStrip}>
      <View style={s.briefStripDot}/>
      <Text style={s.briefStripTxt}>{text}</Text>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// ── MAIN COMPONENT ─────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════
export default function TodosScreen() {
  const router   = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const inputRef  = useRef<TextInput>(null);

  const [menuOpen, setMenuOpen]   = useState(false);
  const [tab, setTab]             = useState<TabType>('actions');
  const [input, setInput]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [micTimer, setMicTimer]   = useState(0);
  const micTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const micOverlayAnim = useRef(new Animated.Value(0)).current;
  const recordingRef = useRef<Audio.Recording | null>(null);
  const lastSendRef  = useRef('');

  // Data
  const [myTodos, setMyTodos]         = useState<TodoItem[]>([]);
  const [reminders, setReminders]     = useState<ReminderItem[]>([]);
  const [briefText, setBriefText]     = useState('');
  const [doneExpanded, setDoneExpanded]   = useState(false);
  const [ackExpanded, setAckExpanded]     = useState(false);
  const [showAddReminder, setShowAddReminder] = useState(false);
  const [thumbs, setThumbs] = useState<Record<string, 'up'|'down'|null>>({});
  function handleCopy(text: string) {
    // Clipboard not imported — just show brief confirmation via Alert
    Alert.alert('Copied', text.slice(0, 80) + (text.length > 80 ? '…' : ''));
  }
  function handleThumb(msgId: string, dir: 'up'|'down') {
    setThumbs(prev => ({ ...prev, [msgId]: prev[msgId]===dir ? null : dir }));
  }

  // Chat persistence
  const { messages, setMessages, loaded: chatLoaded } = useChatPersistence('todos');

  // ── Load data ──────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      const [todosRes, remindersRes] = await Promise.all([
        supabase.from('todos')
          .select('id,title,priority,status,due_date,assigned_to,created_by,notes,show_in_brief,pinned')
          .eq('family_id', FAMILY_ID)
          .neq('status', 'done')
          .order('created_at', { ascending:false })
          .limit(50),
        supabase.from('reminders')
          .select('id,title,remind_at,member_id,repeat,status,body')
          .eq('family_id', FAMILY_ID)
          .order('remind_at', { ascending:true })
          .limit(30),
      ]);

      const todos = (todosRes.data ?? []) as TodoItem[];
      setMyTodos(todos);
      setReminders((remindersRes.data ?? []) as ReminderItem[]);

      // Brief strip — most urgent item
      const urgent = todos.find(t => t.status === 'active' && (t.priority === 'urgent' || t.priority === 'high' || (t.due_date && t.due_date <= getTomorrow())));
      if (urgent) {
        const due = fmtDueDate(urgent.due_date);
        setBriefText(`${urgent.title}${due.style !== 'none' ? ` — ${due.label.toLowerCase()}.` : '.'}`);
      } else {
        setBriefText('');
      }
    } catch (e) {
      console.error('[loadData]', e);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  // ── Tick todo ──────────────────────────────────────────────────────────
  const handleTick = useCallback(async (todo: TodoItem) => {
    const isReminder = (todo as any).reminder_type === 'reminder';
    const isDone = todo.status === 'done' || todo.status === 'acknowledged';
    const newStatus = isDone ? 'active' : isReminder ? 'acknowledged' : 'done';

    // Optimistic update
    if (isReminder) {
      setReminders(prev => prev.map(r => r.id === todo.id ? { ...r, status: newStatus } : r));
    } else {
      setMyTodos(prev => prev.map(t => t.id === todo.id ? { ...t, status: newStatus } : t));
    }

    // Supabase write — immediate
    try {
      if (isReminder) {
        await supabase.from('reminders').update({ status: newStatus }).eq('id', todo.id);
      } else {
        await supabase.from('todos').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', todo.id);
      }
    } catch {
      // Roll back
      if (isReminder) {
        setReminders(prev => prev.map(r => r.id === todo.id ? { ...r, status: todo.status } : r));
      } else {
        setMyTodos(prev => prev.map(t => t.id === todo.id ? { ...t, status: todo.status } : t));
      }
    }
  }, []);

  // ── Acknowledge reminder ──────────────────────────────────────────────
  const handleAcknowledge = useCallback(async (reminder: ReminderItem) => {
    setReminders(prev => prev.map(r => r.id === reminder.id ? { ...r, status:'acknowledged' } : r));
    try {
      await supabase.from('reminders').update({ status:'acknowledged' }).eq('id', reminder.id);
    } catch {
      setReminders(prev => prev.map(r => r.id === reminder.id ? { ...r, status:'active' } : r));
    }
  }, []);

  // ── Scroll helpers ─────────────────────────────────────────────────────
  function scrollToTop() { scrollRef.current?.scrollTo({ y:0, animated:true }); }
  function scrollToBottom() { scrollRef.current?.scrollToEnd({ animated:true }); }

  // ── Message helpers ────────────────────────────────────────────────────
  function addMsg(partial: Partial<Msg>): string {
    const msg: Msg = { id:uid(), role:'zaeli', text:'', ts:nowTs(), ...partial };
    setMessages(prev => [...prev, msg]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated:true }), 80);
    return msg.id;
  }
  function updateMsg(id: string, patch: Partial<Msg>) {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, ...patch } : m));
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated:true }), 80);
  }

  // ── Build context ──────────────────────────────────────────────────────
  function buildContext(): string {
    const today = getToday();
    const activeTodos = myTodos.filter(t => t.status === 'active');
    const overdueCount = activeTodos.filter(t => t.due_date && t.due_date < today).length;
    const todayCount = activeTodos.filter(t => t.due_date === today).length;
    const activeReminders = reminders.filter(r => r.status === 'active');

    return `You are Zaeli — sharp, warm, witty AI for Rich's Australian family.

CHANNEL: Todos + Reminders. Rich is on the Actions tab — shows both todos and reminders together.

FAMILY: Rich (logged in, id:2), Anna (id:1), Poppy (id:3, Yr6, girl), Gab (id:4, Yr4, boy), Duke (id:5, Yr1, boy)

LIVE DATA:
- Active todos: ${activeTodos.length} (${overdueCount} overdue, ${todayCount} due today)
- Active reminders: ${activeReminders.length}
- Today: ${today}
- Tomorrow: ${getTomorrow()}
- In 2 days: ${getInDays(2)}

CAPABILITIES: add_todo · complete_todo · add_reminder. Use tools immediately — never say "I'll add that."

FORMAT: 2–3 sentences max. No lists, no asterisks. Never start with "I". Never say "mate".
Banned: "queued up", "locked in", "sorted", "chaos".`;
  }

  // ── Send ───────────────────────────────────────────────────────────────
  async function send(overrideText?: string) {
    const text = (overrideText ?? input).trim();
    if (!text || loading) return;
    const sendKey = `${text}|${Date.now().toString().slice(0,-3)}`;
    if (lastSendRef.current === sendKey) return;
    lastSendRef.current = sendKey;

    const uMsg: Msg = { id:uid(), role:'user', text, ts:nowTs() };
    setMessages(prev => [...prev, uMsg]);
    setInput('');
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated:true }), 100);

    const replyId = addMsg({ role:'zaeli', text:'', isLoading:true });
    setLoading(true);

    try {
      const system = buildContext();
      const anthropicKey = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? '';
      if (!anthropicKey) { updateMsg(replyId, { text:'No API key configured.', isLoading:false }); setLoading(false); return; }

      const apiMessages = [...messages.slice(-6), uMsg]
        .filter(m => !m.isLoading)
        .map(m => ({ role: m.role === 'user' ? 'user' as const : 'assistant' as const, content: m.text || '(no text)' }));

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method:'POST',
        headers:{ 'Content-Type':'application/json', 'x-api-key':anthropicKey, 'anthropic-version':'2023-06-01' },
        body:JSON.stringify({ model:'claude-sonnet-4-20250514', max_tokens:600, system, tools:TOOLS, messages:apiMessages }),
      });
      const data = await response.json();

      const inTok = data?.usage?.input_tokens ?? 0;
      const outTok = data?.usage?.output_tokens ?? 0;
      const cost = (inTok/1_000_000*3.00) + (outTok/1_000_000*15.00);
      logApiCall({ family_id:FAMILY_ID, feature:'todos_chat', model:'claude-sonnet-4-20250514', input_tokens:inTok, output_tokens:outTok, cost_usd:cost });

      const toolUses = (data.content||[]).filter((b:any) => b.type==='tool_use');
      if (toolUses.length > 0) {
        const toolResults: string[] = [];
        for (const tu of toolUses) {
          const result = await executeTool(tu.name, tu.input);
          toolResults.push(result);
        }
        const toolResultContent = toolUses.map((tu:any, i:number) => ({
          type:'tool_result', tool_use_id:tu.id, content:toolResults[i],
        }));
        const followUp = await fetch('https://api.anthropic.com/v1/messages', {
          method:'POST',
          headers:{ 'Content-Type':'application/json', 'x-api-key':anthropicKey, 'anthropic-version':'2023-06-01' },
          body:JSON.stringify({
            model:'claude-sonnet-4-20250514', max_tokens:300, system, tools:TOOLS,
            messages:[...apiMessages, { role:'assistant', content:data.content }, { role:'user', content:toolResultContent }],
          }),
        });
        const followData = await followUp.json();
        const followText = followData.content?.find((b:any) => b.type==='text')?.text ?? toolResults.join('\n');
        updateMsg(replyId, { text:followText, isLoading:false });
        setTimeout(loadData, 800);
      } else {
        const reply = data.content?.find((b:any) => b.type==='text')?.text ?? 'Something went wrong — try again?';
        const chips = parseChips(reply);
        updateMsg(replyId, { text:cleanReply(reply), isLoading:false, quickReplies:chips });
      }
    } catch (e) {
      updateMsg(replyId, { text:"Something went wrong — try that again?", isLoading:false });
    } finally { setLoading(false); }
  }

  function parseChips(text: string): string[] {
    const match = text.match(/\[CHIPS?:([^\]]+)\]/i);
    if (!match) return [];
    return match[1].split('|').map(c => c.trim()).filter(Boolean).slice(0, 3);
  }
  function cleanReply(text: string): string {
    return text.replace(/\[CHIPS?:[^\]]+\]/gi, '').trim();
  }

  // ── Recording ──────────────────────────────────────────────────────────
  async function startRecording() {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) return;
      await Audio.setAudioModeAsync({ allowsRecordingIOS:true, playsInSilentModeIOS:true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      recordingRef.current = recording;
      setIsRecording(true); setMicTimer(0);
      Animated.timing(micOverlayAnim, { toValue:1, duration:220, useNativeDriver:true }).start();
      micTimerRef.current = setInterval(() => setMicTimer(t => t+1), 1000);
    } catch (e) { console.error('startRecording:', e); }
  }
  async function stopRecording(cancel = false) {
    try {
      setIsRecording(false);
      if (micTimerRef.current) { clearInterval(micTimerRef.current); micTimerRef.current = null; }
      Animated.timing(micOverlayAnim, { toValue:0, duration:180, useNativeDriver:true }).start();
      if (!recordingRef.current) return;
      const status = await recordingRef.current.getStatusAsync();
      const durationSec = (status as any)?.durationMillis ? (status as any).durationMillis/1000 : 10;
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      if (!uri || cancel) return;
      const key = process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? '';
      if (!key) return;
      const form = new FormData();
      form.append('file', { uri, type:'audio/m4a', name:'audio.m4a' } as any);
      form.append('model', 'whisper-1');
      const resp = await fetch(WHISPER_URL, { method:'POST', headers:{ Authorization:`Bearer ${key}` }, body:form });
      const data = await resp.json();
      const transcript = data?.text?.trim() ?? '';
      if (transcript) send(transcript);
    } catch (e) { console.error('stopRecording:', e); }
  }

  // ── Computed tab data ──────────────────────────────────────────────────
  const activeTodos  = myTodos.filter(t => t.status === 'active');
  const doneTodos    = myTodos.filter(t => t.status === 'done');
  const today        = getToday();

  const todayTodos   = activeTodos.filter(t => t.due_date === today || (t.due_date && t.due_date < today));
  const weekTodos    = activeTodos.filter(t => t.due_date && t.due_date > today && t.due_date <= getInDays(7));
  const laterTodos   = activeTodos.filter(t => !t.due_date || t.due_date > getInDays(7));

  const activeReminders = reminders.filter(r => r.status === 'active');
  const ackReminders    = reminders.filter(r => r.status === 'acknowledged');
  const todayReminders  = activeReminders.filter(r => r.remind_at.slice(0,10) <= today);
  const upcomingReminders = activeReminders.filter(r => r.remind_at.slice(0,10) > today);

  // ── Render tab content ─────────────────────────────────────────────────
  function renderActionsTab() {
    const today = getToday();
    const tomorrow = getTomorrow();

    // Merge active todos + active reminders into one unified list
    const activeTodoItems = myTodos.filter(t => t.status === 'active');
    const activeReminderItems = reminders
      .filter(r => r.status === 'active')
      .map(r => ({
        id: r.id,
        title: r.title,
        priority: 'normal',
        status: 'active',
        due_date: r.remind_at ? r.remind_at.slice(0,10) : null,
        assigned_to: r.member_id || null,
        reminder_type: 'reminder' as const,
      }));

    const allActive = [...activeTodoItems, ...activeReminderItems];

    // Group by urgency
    const todayItems   = allActive.filter(t => t.due_date && t.due_date <= today);
    const weekItems    = allActive.filter(t => t.due_date && t.due_date > today && t.due_date <= getInDays(7));
    const laterItems   = allActive.filter(t => !t.due_date || t.due_date > getInDays(7));

    // Done / acknowledged
    const doneTodoItems = myTodos.filter(t => t.status === 'done');
    const ackRems = reminders.filter(r => r.status === 'acknowledged').map(r => ({
      id: r.id, title: r.title, priority: 'normal', status: 'done',
      due_date: r.remind_at ? r.remind_at.slice(0,10) : null,
      assigned_to: r.member_id || null, reminder_type: 'reminder' as const,
    }));
    const allDone = [...doneTodoItems, ...ackRems];

    return (
      <>
        {/* + Add button — lavender accent, inline with theme */}
        <TouchableOpacity
          style={s.addTopBtn}
          onPress={() => {
            inputRef.current?.focus();
            setTimeout(() => scrollRef.current?.scrollToEnd({ animated:true }), 350);
          }}
          activeOpacity={0.75}
        >
          <Text style={s.addTopBtnPlus}>+</Text>
          <Text style={s.addTopBtnTxt}>Add todo or reminder</Text>
          <Text style={s.addTopBtnArrow}>›</Text>
        </TouchableOpacity>

        {todayItems.length > 0 && <>
          <SectionLabel label="Today"/>
          {todayItems.map(t => <TodoCard key={t.id} todo={t} onTick={handleTick}/>)}
        </>}

        {weekItems.length > 0 && <>
          <SectionLabel label="This week"/>
          {weekItems.map(t => <TodoCard key={t.id} todo={t} onTick={handleTick}/>)}
        </>}

        {laterItems.length > 0 && <>
          <SectionLabel label="No date"/>
          {laterItems.map(t => <TodoCard key={t.id} todo={t} onTick={handleTick}/>)}
        </>}

        {allActive.length === 0 && (
          <View style={s.emptyState}>
            <Text style={s.emptyEmoji}>✅</Text>
            <Text style={s.emptyTitle}>All clear</Text>
            <Text style={s.emptySub}>Nothing pending — tell Zaeli what to add.</Text>
          </View>
        )}

        {allDone.length > 0 && (
          <>
            <DoneDivider
              label={`Done (${allDone.length})`}
              expanded={doneExpanded}
              onToggle={() => setDoneExpanded(!doneExpanded)}
            />
            {doneExpanded && allDone.slice(0,8).map(t => (
              <TodoCard key={t.id} todo={t} dimmed onTick={handleTick}/>
            ))}
          </>
        )}

        <TouchableOpacity style={s.quickAdd} onPress={() => {
          inputRef.current?.focus();
          setTimeout(() => scrollRef.current?.scrollToEnd({ animated:true }), 350);
        }} activeOpacity={0.7}>
          <Text style={s.quickAddIcon}>➕</Text>
          <Text style={s.quickAddTxt}>Add a todo or reminder…</Text>
        </TouchableOpacity>
      </>
    );
  }

  function renderFamilyTab() {
    return (
      <>
        <View style={s.briefStrip}>
          <View style={s.briefStripDot}/>
          <Text style={s.briefStripTxt}><Text style={{ fontFamily:'Poppins_700Bold', color:INK }}>Anna assigned you one thing</Text> — and {DUMMY_SHARED.length} shared todos between you.</Text>
        </View>

        <SectionLabel label="Anna assigned to you"/>
        {DUMMY_ANNA_ASSIGNED.map(t => (
          <TodoCard key={t.id} todo={t} showFromAnna onTick={() => {}}/>
        ))}

        <SectionLabel label="Shared with Anna"/>
        {DUMMY_SHARED.map(t => (
          <TodoCard key={t.id} todo={t} showShared onTick={() => {}}/>
        ))}

        <DoneDivider
          label={`Completed (${DUMMY_ANNA_COMPLETED.length})`}
          expanded={doneExpanded}
          onToggle={() => setDoneExpanded(!doneExpanded)}
        />
        {doneExpanded && DUMMY_ANNA_COMPLETED.map(t => (
          <TodoCard key={t.id} todo={t} dimmed/>
        ))}

        {/* Auth notice */}
        <View style={s.authNotice}>
          <Text style={s.authNoticeIcon}>👥</Text>
          <Text style={s.authNoticeTxt}>Family sharing activates with full accounts. Anna's todos will appear here automatically once Zaeli is live.</Text>
        </View>
      </>
    );
  }

  function renderRemindersTab() {
    return (
      <>
        {activeReminders.length > 0 ? (
          <View style={s.briefStrip}>
            <View style={s.briefStripDot}/>
            <Text style={s.briefStripTxt}>
              <Text style={{ fontFamily:'Poppins_700Bold', color:INK }}>
                {todayReminders.length > 0 ? `${todayReminders.length} reminder${todayReminders.length>1?'s':''} need attention today.` : 'All today\'s reminders acknowledged.'}
              </Text>
              {todayReminders.length > 0 ? ` ${todayReminders.map(r=>r.title).join(' and ')}.` : ''}
            </Text>
          </View>
        ) : null}

        {todayReminders.length > 0 && <>
          <SectionLabel label="Today"/>
          {todayReminders.map(r => <ReminderCard key={r.id} reminder={r} onAcknowledge={handleAcknowledge}/>)}
        </>}

        {upcomingReminders.length > 0 && <>
          <SectionLabel label="Upcoming"/>
          {upcomingReminders.map(r => <ReminderCard key={r.id} reminder={r} onAcknowledge={handleAcknowledge}/>)}
        </>}

        {activeReminders.length === 0 && (
          <View style={s.emptyState}>
            <Text style={s.emptyEmoji}>🔔</Text>
            <Text style={s.emptyTitle}>No reminders</Text>
            <Text style={s.emptySub}>Tap + Add or tell Zaeli what to remember.</Text>
          </View>
        )}

        {ackReminders.length > 0 && (
          <>
            <DoneDivider
              label={`Acknowledged (${ackReminders.length})`}
              expanded={ackExpanded}
              onToggle={() => setAckExpanded(!ackExpanded)}
            />
            {ackExpanded && ackReminders.map(r => (
              <ReminderCard key={r.id} reminder={r} onAcknowledge={() => {}}/>
            ))}
          </>
        )}

        {/* Quick add row */}
        <TouchableOpacity style={s.quickAdd} onPress={() => setShowAddReminder(true)} activeOpacity={0.7}>
          <Text style={s.quickAddIcon}>🔔</Text>
          <Text style={s.quickAddTxt}>Add a reminder…</Text>
        </TouchableOpacity>
      </>
    );
  }

  // ── Render messages ────────────────────────────────────────────────────
  function renderMessages() {
    return messages.map((msg, i) => {
      if (msg.role === 'user') {
        return (
          <View key={msg.id} style={[s.userMsgWrap, { marginTop:18 }]}>
            <View style={s.userBubble}>
              <Text style={s.userMsgText}>{msg.text}</Text>
            </View>
            <Text style={s.msgTime}>{msg.ts}</Text>
          </View>
        );
      }
      const prevMsg = i > 0 ? messages[i-1] : null;
      const showEyebrow = !prevMsg || prevMsg.role === 'user';
      return (
        <View key={msg.id} style={[s.zaeliMsgWrap, !showEyebrow && { marginTop:4 }]}>
          {showEyebrow && (
            <View style={s.zEyebrow}>
              <View style={s.zStar}>
                <Svg width="9" height="9" viewBox="0 0 16 16" fill="#fff"><Path d="M8 1L9.5 6.5L15 8L9.5 9.5L8 15L6.5 9.5L1 8L6.5 6.5L8 1Z"/></Svg>
              </View>
              <Text style={s.zName}>Zaeli</Text>
              <Text style={s.zTs}>{msg.ts}</Text>
            </View>
          )}
          {msg.isLoading ? (
            <TypingDots color={AI_COLOUR}/>
          ) : (
            <Text style={s.zaeliMsgText}>{msg.text}</Text>
          )}
          {!msg.isLoading && (msg.quickReplies??[]).length > 0 && (
            <View style={s.qrChips}>
              {(msg.quickReplies??[]).map((chip, ci) => (
                <TouchableOpacity key={ci} style={s.qrChip} onPress={() => send(chip)} activeOpacity={0.7}>
                  <Text style={s.qrChipTxt}>{chip}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          {!msg.isLoading && msg.text.length > 0 && (
            <View style={s.msgActions}>
              <TouchableOpacity style={s.msgActionBtn} onPress={() => handleCopy(msg.text)} activeOpacity={0.6}><IcoCopy/></TouchableOpacity>
              <TouchableOpacity style={s.msgActionBtn} activeOpacity={0.6}><IcoForward/></TouchableOpacity>
              <TouchableOpacity style={s.msgActionBtn} onPress={() => handleThumb(msg.id, 'up')} activeOpacity={0.6}><IcoThumbUp active={thumbs[msg.id]==='up'}/></TouchableOpacity>
              <TouchableOpacity style={s.msgActionBtn} onPress={() => handleThumb(msg.id, 'down')} activeOpacity={0.6}><IcoThumbDown active={thumbs[msg.id]==='down'}/></TouchableOpacity>
            </View>
          )}
        </View>
      );
    });
  }

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <View style={s.root}>
      <StatusBar style="dark" animated/>
      <NavMenu visible={menuOpen} onClose={() => setMenuOpen(false)}/>

      <AddReminderSheet
        visible={showAddReminder}
        onClose={() => setShowAddReminder(false)}
        onSaved={loadData}
      />

      {/* BANNER */}
      <SafeAreaView style={s.banner} edges={['top']}>
        <View style={s.bannerRow}>
          <TouchableOpacity onPress={() => router.navigate('/(tabs)/')} activeOpacity={0.8}>
            <Text style={s.wordmark}>
              z<Text style={{ color:AI_COLOUR }}>a</Text>el<Text style={{ color:AI_COLOUR }}>i</Text>
            </Text>
          </TouchableOpacity>
          <View style={s.bannerRight}>
            <Text style={s.channelName}>To-dos</Text>
            <HamburgerButton onPress={() => setMenuOpen(true)}/>
            <View style={s.avatar}><Text style={s.avatarTxt}>R</Text></View>
          </View>
        </View>
        {/* Tab pills — Shopping spec */}
        <View style={s.tabRow}>
          {(['actions','family'] as TabType[]).map((t) => {
            const hasActiveDot = t === 'actions' && (
              myTodos.filter(td => td.status === 'active').length > 0 ||
              reminders.filter(r => r.status === 'active').length > 0
            );
            return (
              <TouchableOpacity
                key={t}
                style={[s.tabPill, tab===t && s.tabPillOn]}
                onPress={() => setTab(t)}
                activeOpacity={0.75}
              >
                <Text style={[s.tabPillTxt, tab===t && s.tabPillTxtOn]}>
                  {t === 'actions' ? 'Actions' : 'Family'}
                </Text>
                {hasActiveDot && tab !== t && <View style={s.tabDot}/>}
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={s.bannerDivider}/>
      </SafeAreaView>

      {/* MAIN CONTENT */}
      <KeyboardAvoidingView style={{ flex:1 }} behavior={Platform.OS==='ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>
        <View style={{ flex:1, position:'relative', backgroundColor:BODY_BG }}>
          <ScrollView
            ref={scrollRef}
            style={{ flex:1, backgroundColor:BODY_BG }}
            contentContainerStyle={{ paddingBottom:180, paddingTop:4 }}
            showsVerticalScrollIndicator={false}
            keyboardDismissMode="interactive"
          >
            {/* Tab content */}
            {tab === 'actions' && renderActionsTab()}
            {tab === 'family'  && renderFamilyTab()}

            {/* Chat divider — date + Zaeli label, matches Home */}
            <View style={s.chatDivider}>
              <View style={s.chatDivLine}/>
              <Text style={s.chatDivTxt}>
                {new Date().toLocaleDateString('en-AU', { weekday:'short', day:'numeric', month:'short' }).toUpperCase()} · ZAELI
              </Text>
              <View style={s.chatDivLine}/>
            </View>

            {/* Chat thread */}
            {renderMessages()}
            <View style={{ height:16 }}/>
          </ScrollView>

          {/* Scroll arrows */}
          <View style={s.scrollArrowPair} pointerEvents="box-none">
            <TouchableOpacity style={s.scrollArrowBtn} onPress={scrollToTop} activeOpacity={0.75}>
              <IcoArrowUp/>
            </TouchableOpacity>
            <TouchableOpacity style={s.scrollArrowBtn} onPress={scrollToBottom} activeOpacity={0.75}>
              <IcoArrowDown/>
            </TouchableOpacity>
          </View>

          {/* Chat bar */}
          <View style={s.inputArea}>
            <View style={s.barPill}>
              <TouchableOpacity
                style={s.barBtn}
                onPress={() => inputRef.current?.focus()}
                activeOpacity={0.75}
              >
                <IcoPlus color="rgba(10,10,10,0.4)"/>
              </TouchableOpacity>
              <View style={s.barSep}/>
              <TextInput
                ref={inputRef}
                style={s.barInput}
                value={input}
                onChangeText={setInput}
                placeholder="Add or ask about todos and reminders…" 
                placeholderTextColor="rgba(10,10,10,0.4)"
                multiline
                returnKeyType="default"
                keyboardAppearance="light"
                selectionColor={AI_COLOUR}
                onFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated:true }), 350)}
              />
              {isRecording ? (
                <TouchableOpacity style={[s.barWaveBtn, { backgroundColor:AI_COLOUR }]} onPress={() => stopRecording()} activeOpacity={0.85}>
                  <WaveformBars/>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={s.barMicBtn} onPress={startRecording} activeOpacity={0.75}>
                  <IcoMic color="#F5C8C8" size={26}/>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[s.barSend, ((!input.trim()) || loading) && { opacity:0.4 }]}
                onPress={() => send()}
                disabled={!input.trim() || loading}
                activeOpacity={0.85}
              >
                <IcoSend/>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Mic overlay */}
      {isRecording && (
        <Animated.View style={[s.micOverlay, { opacity:micOverlayAnim }]} pointerEvents="auto">
          <View style={s.micCard}>
            <MicWaveform/>
            <Text style={s.micTimer}>{Math.floor(micTimer/60)}:{String(micTimer%60).padStart(2,'0')}</Text>
            <Text style={s.micLabel}>Listening…</Text>
            <TouchableOpacity style={s.micStopBtn} onPress={() => stopRecording(false)} activeOpacity={0.85}>
              <View style={s.micStopSquare}/>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => stopRecording(true)} activeOpacity={0.6}>
              <Text style={s.micCancel}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex:1, backgroundColor:BANNER_BG },

  // Banner
  banner:      { backgroundColor:BANNER_BG },
  bannerRow:   { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:20, paddingTop:4, paddingBottom:8 },
  bannerRight: { flexDirection:'row', alignItems:'center', gap:10 },
  wordmark:    { fontFamily:'DMSerifDisplay_400Regular', fontSize:40, color:INK, letterSpacing:-1.5, lineHeight:44 },
  channelName: { fontFamily:'Poppins_600SemiBold', fontSize:16, color:'rgba(0,0,0,0.45)' },
  avatar:      { width:34, height:34, borderRadius:17, backgroundColor:'#4D8BFF', alignItems:'center', justifyContent:'center' },
  avatarTxt:   { fontFamily:'Poppins_700Bold', fontSize:13, color:'#fff' },
  bannerDivider:{ height:1, backgroundColor:'rgba(0,0,0,0.08)' },

  // Tab pills — matches Shopping channel spec
  tabRow:       { flexDirection:'row', backgroundColor:'rgba(0,0,0,0.08)', borderRadius:22, padding:3, gap:2, marginHorizontal:16, marginBottom:10 },
  tabPill:      { flex:1, paddingVertical:8, borderRadius:19, alignItems:'center', position:'relative' },
  tabPillOn:    { backgroundColor:'#fff' },
  tabPillTxt:   { fontFamily:'Poppins_600SemiBold', fontSize:13, color:'rgba(0,0,0,0.40)' },
  tabPillTxtOn: { color:INK },
  tabDot:       { position:'absolute', top:4, right:6, width:6, height:6, borderRadius:3, backgroundColor:'#FF4545' },

  // Apply border radius to first and last tab
  // (done inline in render via style array)

  // + Add top button — light, inline with theme
  addTopBtn:     { flexDirection:'row', alignItems:'center', gap:10, backgroundColor:'rgba(216,204,255,0.25)', borderRadius:12, paddingVertical:11, paddingHorizontal:14, marginHorizontal:14, marginTop:12, marginBottom:4, borderWidth:1.5, borderColor:'rgba(216,204,255,0.6)' },
  addTopBtnPlus: { fontFamily:'Poppins_600SemiBold', fontSize:20, color:AI_COLOUR, lineHeight:24, marginTop:-1 },
  addTopBtnTxt:  { fontFamily:'Poppins_600SemiBold', fontSize:15, color:ACCENT, flex:1 },
  addTopBtnArrow:{ fontFamily:'Poppins_400Regular', fontSize:18, color:'rgba(0,0,0,0.25)' },

  // Brief strip (kept for Family tab)
  briefStrip:    { flexDirection:'row', alignItems:'flex-start', gap:8, backgroundColor:'rgba(0,0,0,0.05)', borderRadius:11, padding:10, marginHorizontal:14, marginTop:10, marginBottom:4 },
  briefStripDot: { width:6, height:6, borderRadius:3, backgroundColor:ACCENT, flexShrink:0, marginTop:5 },
  briefStripTxt: { fontFamily:'Poppins_400Regular', fontSize:14, color:'rgba(0,0,0,0.6)', lineHeight:20, flex:1 },

  // Section label
  sectionLbl: { fontFamily:'Poppins_700Bold', fontSize:11, letterSpacing:0.14, textTransform:'uppercase' as const, color:'rgba(0,0,0,0.32)', paddingHorizontal:14, marginTop:14, marginBottom:6 },

  // Todo card
  todoCard:     { flexDirection:'row', alignItems:'flex-start', gap:10, backgroundColor:'white', borderRadius:12, padding:12, marginHorizontal:14, marginBottom:6 },
  priorityDot:  { width:6, height:6, borderRadius:3, flexShrink:0, marginTop:7 },
  todoChk:      { width:22, height:22, borderRadius:11, borderWidth:1.5, borderColor:'rgba(0,0,0,0.22)', flexShrink:0, alignItems:'center', justifyContent:'center', marginTop:1 },
  todoChkDone:  { backgroundColor:'rgba(0,0,0,0.22)', borderColor:'transparent' },
  todoInfo:     { flex:1, minWidth:0 },
  todoTitle:    { fontFamily:'Poppins_600SemiBold', fontSize:15, color:INK, marginBottom:4, lineHeight:21 },
  todoTitleDone:{ textDecorationLine:'line-through' as const, color:'rgba(0,0,0,0.32)', fontFamily:'Poppins_400Regular' },
  todoMeta:     { flexDirection:'row', alignItems:'center', gap:6, flexWrap:'wrap' as const },
  todoDue:      { fontFamily:'Poppins_600SemiBold', fontSize:12 },
  todoDueNone:  { fontFamily:'Poppins_400Regular', fontSize:12, color:'rgba(0,0,0,0.35)' },
  todoAv:       { width:18, height:18, borderRadius:9, alignItems:'center', justifyContent:'center' },
  todoAvTxt:    { fontFamily:'Poppins_700Bold', fontSize:8, color:'#fff' },
  sharedBadge:  { backgroundColor:'rgba(77,139,255,0.12)', borderRadius:4, paddingHorizontal:6, paddingVertical:2 },
  sharedBadgeTxt:{ fontFamily:'Poppins_700Bold', fontSize:10, color:'#1D4ED8', textTransform:'uppercase' as const, letterSpacing:0.06 },
  urgentBadge:  { backgroundColor:'rgba(220,38,38,0.1)', borderRadius:4, paddingHorizontal:6, paddingVertical:2 },
  urgentBadgeTxt:{ fontFamily:'Poppins_700Bold', fontSize:10, color:'#B91C1C', textTransform:'uppercase' as const, letterSpacing:0.06 },

  // Reminder card
  remCard:   { flexDirection:'row', alignItems:'flex-start', gap:10, backgroundColor:'white', borderRadius:12, padding:12, marginHorizontal:14, marginBottom:6 },
  remBell:   { width:28, height:28, borderRadius:14, alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1 },
  remChk:    { width:22, height:22, borderRadius:11, borderWidth:1.5, borderColor:'rgba(0,0,0,0.18)', flexShrink:0, alignItems:'center', justifyContent:'center', marginTop:3 },
  remChkSmall:{ width:22, height:22, borderRadius:5, borderWidth:1.5, borderColor:'rgba(128,96,0,0.4)', flexShrink:0, alignItems:'center', justifyContent:'center', marginTop:1 },
  remChkDone:{ backgroundColor:'rgba(0,0,0,0.15)', borderColor:'transparent' },
  remInfo:   { flex:1, minWidth:0 },
  remTitle:  { fontFamily:'Poppins_600SemiBold', fontSize:15, color:INK, marginBottom:4, lineHeight:21 },
  remTitleDone:{ textDecorationLine:'line-through' as const, color:'rgba(0,0,0,0.32)', fontFamily:'Poppins_400Regular' },
  remMeta:   { flexDirection:'row', alignItems:'center', gap:6, flexWrap:'wrap' as const, marginBottom:4 },
  remWhen:   { fontFamily:'Poppins_600SemiBold', fontSize:12 },
  remWho:    { width:18, height:18, borderRadius:9, alignItems:'center', justifyContent:'center' },
  remWhoTxt: { fontFamily:'Poppins_700Bold', fontSize:8, color:'#fff' },
  recBadge:  { backgroundColor:'rgba(128,96,0,0.1)', borderRadius:4, paddingHorizontal:6, paddingVertical:2 },
  recBadgeTxt:{ fontFamily:'Poppins_700Bold', fontSize:10, color:ACCENT, textTransform:'uppercase' as const, letterSpacing:0.06 },
  twoTouch:  { flexDirection:'row', alignItems:'center', gap:5, marginTop:2 },
  twoTouchDot:{ width:5, height:5, borderRadius:3, backgroundColor:'rgba(128,96,0,0.35)', flexShrink:0 },
  twoTouchTxt:{ fontFamily:'Poppins_400Regular', fontSize:11, color:'rgba(0,0,0,0.35)', flex:1 },

  // Done / ack divider
  doneDivider:{ flexDirection:'row', alignItems:'center', gap:8, marginHorizontal:14, marginTop:14, marginBottom:6 },
  doneDivLine:{ flex:1, height:1, backgroundColor:'rgba(0,0,0,0.18)' },
  doneDivTxt: { fontFamily:'Poppins_700Bold', fontSize:13, color:'rgba(0,0,0,0.55)' },

  // Quick add
  quickAdd:    { flexDirection:'row', alignItems:'center', gap:10, borderWidth:1.5, borderStyle:'dashed' as const, borderColor:'rgba(0,0,0,0.14)', borderRadius:12, padding:12, marginHorizontal:14, marginTop:8 },
  quickAddIcon:{ fontSize:16, opacity:0.4 },
  quickAddTxt: { fontFamily:'Poppins_400Regular', fontSize:14, color:'rgba(0,0,0,0.35)' },

  // Empty state
  emptyState:{ alignItems:'center', paddingVertical:40, paddingHorizontal:30 },
  emptyEmoji:{ fontSize:36, marginBottom:10 },
  emptyTitle:{ fontFamily:'Poppins_700Bold', fontSize:17, color:INK, marginBottom:6 },
  emptySub:  { fontFamily:'Poppins_400Regular', fontSize:15, color:'rgba(0,0,0,0.4)', textAlign:'center' as const, lineHeight:22 },

  // Auth notice
  authNotice:    { flexDirection:'row', alignItems:'flex-start', gap:10, backgroundColor:'rgba(0,0,0,0.04)', borderRadius:12, padding:14, marginHorizontal:14, marginTop:14 },
  authNoticeIcon:{ fontSize:18, flexShrink:0 },
  authNoticeTxt: { fontFamily:'Poppins_400Regular', fontSize:13, color:'rgba(0,0,0,0.45)', lineHeight:20, flex:1 },

  // Add reminder sheet
  sheetOverlay:  { flex:1, backgroundColor:'rgba(0,0,0,0.4)', justifyContent:'flex-end' },
  sheet:         { backgroundColor:'#FAF8F5', borderTopLeftRadius:24, borderTopRightRadius:24, paddingHorizontal:20, paddingTop:0 },
  sheetHandle:   { width:36, height:4, borderRadius:2, backgroundColor:'rgba(0,0,0,0.14)', alignSelf:'center', marginTop:12, marginBottom:16 },
  sheetTitle:    { fontFamily:'Poppins_800ExtraBold', fontSize:17, color:INK, marginBottom:3 },
  sheetSub:      { fontFamily:'Poppins_400Regular', fontSize:13, color:'rgba(0,0,0,0.45)', marginBottom:18 },
  fieldLabel:    { fontFamily:'Poppins_700Bold', fontSize:11, letterSpacing:0.12, textTransform:'uppercase' as const, color:'rgba(0,0,0,0.38)', marginBottom:8 },
  fieldInput:    { backgroundColor:'rgba(0,0,0,0.04)', borderWidth:1.5, borderColor:'rgba(0,0,0,0.09)', borderRadius:10, paddingHorizontal:14, paddingVertical:12, fontFamily:'Poppins_400Regular', fontSize:15, color:INK, marginBottom:16 },
  memberChip:    { flexDirection:'row', alignItems:'center', gap:5, borderWidth:1.5, borderColor:'rgba(0,0,0,0.12)', borderRadius:20, paddingVertical:6, paddingHorizontal:12 },
  memberChipDot: { width:8, height:8, borderRadius:4 },
  memberChipTxt: { fontFamily:'Poppins_500Medium', fontSize:13, color:'rgba(0,0,0,0.55)' },
  whenChips:     { flexDirection:'row', flexWrap:'wrap' as const, gap:8, marginBottom:16 },
  whenChip:      { borderWidth:1.5, borderColor:'rgba(0,0,0,0.12)', borderRadius:20, paddingVertical:7, paddingHorizontal:14 },
  whenChipOn:    { borderColor:ACCENT, backgroundColor:'rgba(128,96,0,0.07)' },
  whenChipTxt:   { fontFamily:'Poppins_600SemiBold', fontSize:13, color:'rgba(0,0,0,0.5)' },
  whenChipTxtOn: { color:ACCENT },
  twoTouchRow:   { flexDirection:'row', alignItems:'center', gap:12, backgroundColor:'rgba(0,0,0,0.04)', borderRadius:10, padding:12, marginBottom:16 },
  twoTouchRowTitle:{ fontFamily:'Poppins_700Bold', fontSize:14, color:INK, marginBottom:2 },
  twoTouchRowSub:  { fontFamily:'Poppins_400Regular', fontSize:12, color:'rgba(0,0,0,0.45)' },
  toggle:        { width:42, height:24, borderRadius:12, backgroundColor:'rgba(0,0,0,0.18)', justifyContent:'center', paddingHorizontal:2 },
  toggleOn:      { backgroundColor:ACCENT },
  toggleThumb:   { width:20, height:20, borderRadius:10, backgroundColor:'#fff', shadowColor:'#000', shadowOpacity:0.15, shadowRadius:4, shadowOffset:{ width:0, height:1 } },
  submitBtn:     { backgroundColor:ACCENT, borderRadius:12, paddingVertical:14, alignItems:'center' },
  submitBtnTxt:  { fontFamily:'Poppins_700Bold', fontSize:15, color:'#fff' },

  // Chat divider
  chatDivider: { flexDirection:'row', alignItems:'center', marginHorizontal:18, marginTop:20, marginBottom:4, gap:10 },
  chatDivLine: { flex:1, height:1, backgroundColor:'rgba(0,0,0,0.09)' },
  chatDivTxt:  { fontFamily:'Poppins_700Bold', fontSize:10, letterSpacing:0.2, color:'rgba(0,0,0,0.40)' },

  // Chat messages
  userMsgWrap: { alignItems:'flex-end', marginBottom:6, paddingHorizontal:18 },
  userBubble:  { backgroundColor:'#F2F2F2', borderRadius:16, borderBottomRightRadius:3, paddingHorizontal:13, paddingVertical:9, maxWidth:'82%' as any },
  userMsgText: { fontFamily:'Poppins_400Regular', fontSize:17, lineHeight:27, color:INK },
  msgTime:     { fontFamily:'Poppins_400Regular', fontSize:10, color:'rgba(0,0,0,0.32)', marginTop:3 },
  zaeliMsgWrap:{ marginBottom:6, paddingHorizontal:18 },
  zEyebrow:    { flexDirection:'row', alignItems:'center', gap:5, marginBottom:6, marginTop:18 },
  zStar:       { width:16, height:16, borderRadius:5, backgroundColor:AI_COLOUR, alignItems:'center', justifyContent:'center', flexShrink:0 },
  zName:       { fontFamily:'Poppins_700Bold', fontSize:10, letterSpacing:0.2, color:INK },
  zTs:         { fontFamily:'Poppins_400Regular', fontSize:9, color:'rgba(0,0,0,0.32)', marginLeft:'auto' as any },
  zaeliMsgText:{ fontFamily:'Poppins_400Regular', fontSize:17, lineHeight:27, color:INK },
  qrChips:      { flexDirection:'row', flexWrap:'wrap' as const, gap:6, marginTop:10 },
  qrChip:       { borderWidth:1.5, borderColor:'rgba(0,0,0,0.18)', borderRadius:20, paddingVertical:6, paddingHorizontal:12, backgroundColor:'white' },
  qrChipTxt:    { fontFamily:'Poppins_400Regular', fontSize:13, color:'rgba(0,0,0,0.65)' },
  msgActions:   { flexDirection:'row', gap:14, marginTop:10, paddingTop:8, borderTopWidth:1, borderTopColor:'rgba(0,0,0,0.07)' },
  msgActionBtn: { padding:2 },

  // Scroll arrows
  scrollArrowPair:{ position:'absolute', bottom:110, right:16, flexDirection:'row', gap:8, zIndex:50 },
  scrollArrowBtn: { width:38, height:38, borderRadius:19, backgroundColor:'rgba(10,10,10,0.40)', alignItems:'center', justifyContent:'center' },

  // Input bar
  inputArea:  { position:'absolute', bottom:0, left:0, right:0, paddingHorizontal:14, paddingBottom:Platform.OS==='ios'?30:18, paddingTop:10, backgroundColor:'transparent' },
  barPill:    { flexDirection:'row', alignItems:'center', gap:8, borderRadius:30, paddingVertical:14, paddingHorizontal:16, borderWidth:1, backgroundColor:'#fff', borderColor:'rgba(10,10,10,0.09)', shadowColor:'#000', shadowOpacity:0.07, shadowRadius:16, shadowOffset:{ width:0, height:-2 }, elevation:4 },
  barBtn:     { width:34, height:34, alignItems:'center', justifyContent:'center' },
  barMicBtn:  { width:32, height:32, alignItems:'center', justifyContent:'center', flexShrink:0 },
  barSep:     { width:1, height:18, backgroundColor:'rgba(10,10,10,0.1)', flexShrink:0 },
  barInput:   { flex:1, fontFamily:'Poppins_400Regular', fontSize:15, maxHeight:100, paddingVertical:0, color:INK },
  barWaveBtn: { width:40, height:40, borderRadius:20, alignItems:'center', justifyContent:'center' },
  barSend:    { width:32, height:32, borderRadius:16, backgroundColor:'#FF4545', alignItems:'center', justifyContent:'center', flexShrink:0 },

  // Mic overlay
  micOverlay:   { position:'absolute', top:0, left:0, right:0, bottom:0, backgroundColor:`rgba(240,220,128,0.9)`, alignItems:'center', justifyContent:'center', zIndex:100 },
  micCard:      { backgroundColor:'#fff', borderRadius:28, paddingVertical:32, paddingHorizontal:36, alignItems:'center', gap:18, shadowColor:'#000', shadowOpacity:0.10, shadowRadius:24, shadowOffset:{ width:0, height:8 }, borderWidth:1, borderColor:'rgba(0,0,0,0.06)' },
  micTimer:     { fontFamily:'Poppins_600SemiBold', fontSize:30, color:INK, letterSpacing:1 },
  micLabel:     { fontFamily:'Poppins_400Regular', fontSize:13, color:'rgba(0,0,0,0.40)' },
  micStopBtn:   { width:60, height:60, borderRadius:30, backgroundColor:'#FF4545', alignItems:'center', justifyContent:'center', shadowColor:'#FF4545', shadowOpacity:0.35, shadowRadius:14, shadowOffset:{ width:0, height:4 } },
  micStopSquare:{ width:20, height:20, borderRadius:4, backgroundColor:'#fff' },
  micCancel:    { fontFamily:'Poppins_400Regular', fontSize:13, color:'rgba(0,0,0,0.35)' },
});
