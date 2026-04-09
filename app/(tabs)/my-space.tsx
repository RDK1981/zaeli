/**
 * my-space.tsx — My Space · Page 2 in swipe-world
 * Phase 3b Pass 3 — Two-tap Goals · SVG play icons · True 92% sheets
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Modal, Share, Linking,
  StyleSheet, Dimensions, TextInput, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Polygon, Rect, Line, Path, Circle } from 'react-native-svg';
import { setPendingChatContext } from '../../lib/navigation-store';
import { supabase } from '../../lib/supabase';

const FAMILY_ID = '00000000-0000-0000-0000-000000000001';

const { width: W, height: H } = Dimensions.get('window');

// ─── SVG Icons (from index.tsx) ───────────────────────────────────────────────

function IcoPlay({ color = 'rgba(10,10,10,0.55)', size = 15 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Polygon points="5 3 19 12 5 21 5 3" />
    </Svg>
  );
}

function IcoPause({ color = 'rgba(10,10,10,0.55)', size = 15 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2.5" strokeLinecap="round">
      <Line x1="6" y1="4" x2="6" y2="20" />
      <Line x1="18" y1="4" x2="18" y2="20" />
    </Svg>
  );
}

// ─── SVG Icons ───────────────────────────────────────────────────────────────
function IcoNote({ color = 'rgba(10,10,10,0.5)', size = 20 }: { color?: string; size?: number }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><Path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><Path d="M14 2v6h6"/><Line x1="16" y1="13" x2="8" y2="13"/><Line x1="16" y1="17" x2="8" y2="17"/><Line x1="10" y1="9" x2="8" y2="9"/></Svg>;
}
function IcoLock({ color = 'rgba(10,10,10,0.35)', size = 14 }: { color?: string; size?: number }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><Rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><Path d="M7 11V7a5 5 0 0110 0v4"/></Svg>;
}
function IcoUsers({ color = 'rgba(10,10,10,0.35)', size = 14 }: { color?: string; size?: number }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><Path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><Circle cx="9" cy="7" r="4"/><Path d="M23 21v-2a4 4 0 00-3-3.87"/><Path d="M16 3.13a4 4 0 010 7.75"/></Svg>;
}
function IcoChevLeft({ color = 'rgba(10,10,10,0.5)', size = 22 }: { color?: string; size?: number }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><Path d="M15 18l-6-6 6-6"/></Svg>;
}
function IcoTrash({ color = '#FF4545', size = 18 }: { color?: string; size?: number }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><Path d="M3 6h18"/><Path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></Svg>;
}
function IcoPlus2({ color = '#5020C0', size = 18 }: { color?: string; size?: number }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round"><Line x1="12" y1="5" x2="12" y2="19"/><Line x1="5" y1="12" x2="19" y2="12"/></Svg>;
}

// ─── Dummy data ───────────────────────────────────────────────────────────────

const HEALTH = {
  steps: 7241, goal: 10000, pct: 72, distance: 5.2, calories: 348, activeMins: 42, standHrs: 9, standGoal: 12,
  weekSteps: [6200, 9800, 8400, 2100, 8600, 12400, 7241],
  weekDays: ['M','T','W','T','F','S','S'],
  workouts: [
    { icon: '🏃', name: 'Outdoor Run',       meta: 'Sat 5 Apr · 5.2 km', dur: '34 min', bg: '#EBF8F1' },
    { icon: '🚴', name: 'Cycling',            meta: 'Thu 3 Apr · 18.1 km', dur: '51 min', bg: '#EBF4FF' },
    { icon: '🏋️', name: 'Strength Training', meta: 'Tue 1 Apr',           dur: '45 min', bg: '#FFF5EB' },
  ],
};

type GoalLog = { id:string; date:string; value:number; note:string };
type GoalMilestone = { id:string; title:string; target_value:number; done:boolean };
type GoalType = 'fitness'|'health'|'habit'|'learning'|'financial'|'project';
type GoalFreq = 'daily'|'weekdays'|'x_per_week';
type GoalItem = {
  id:string; title:string; type:GoalType; icon:string;
  start_value:number; target_value:number; current_value:number; unit:string;
  frequency?:GoalFreq; frequency_target?:number; // habits only
  deadline:string;
  milestones:GoalMilestone[];
  logs:GoalLog[];
  streak:number; best_streak:number; // habits
  status:'active'|'completed'|'paused';
};

const GOAL_TYPES: { type:GoalType; icon:string; label:string; units:string[]; startQ:string; targetQ:string; logLabel:string; logUnit:string }[] = [
  { type:'fitness',   icon:'\u{1F3C3}', label:'Fitness',   units:['km','mins','sessions','laps'],          startQ:'Where are you now?',       targetQ:"What's the target?",   logLabel:'Add workout',   logUnit:'distance/time' },
  { type:'health',    icon:'\u{1F4AA}', label:'Health',    units:['kg','cm','bmi'],                        startQ:'Current weight?',          targetQ:'Target weight?',       logLabel:'Log weigh-in',  logUnit:'weight' },
  { type:'habit',     icon:'\u{1F504}', label:'Habit',     units:['days','streak'],                        startQ:'How often?',               targetQ:'Goal streak?',         logLabel:'Check in',      logUnit:'done' },
  { type:'learning',  icon:'\u{1F4DA}', label:'Learning',  units:['books','hours','courses','modules'],    startQ:'How many done so far?',    targetQ:'How many total?',      logLabel:'Add item',      logUnit:'completed' },
  { type:'financial', icon:'\u{1F4B0}', label:'Financial', units:['$'],                                    startQ:'How much saved so far?',   targetQ:'Target amount?',       logLabel:'Add deposit',   logUnit:'amount' },
  { type:'project',   icon:'\u{1F3AF}', label:'Project',   units:['tasks','phases','milestones'],          startQ:'How many tasks done?',     targetQ:'How many total?',      logLabel:'Complete task',  logUnit:'task' },
];

const HABIT_FREQS: { key:GoalFreq; label:string }[] = [
  { key:'daily', label:'Every day' },
  { key:'weekdays', label:'Weekdays' },
  { key:'x_per_week', label:'X times per week' },
];

const STREAK_GOALS = [7, 14, 30, 60, 100];

const INITIAL_GOALS: GoalItem[] = [
  { id:'g1', title:'Noosa 10km Run', type:'fitness', icon:'\u{1F3C3}', start_value:4, target_value:10, current_value:6.2, unit:'km', deadline:'2026-05-03', milestones:[
    { id:'m1', title:'Run 5km non-stop', target_value:5, done:true },
    { id:'m2', title:'Complete 8km run', target_value:8, done:false },
    { id:'m3', title:'Race day', target_value:10, done:false },
  ], logs:[
    { id:'l1', date:'2026-04-01', value:4.2, note:'Morning run, felt good' },
    { id:'l2', date:'2026-04-05', value:5.1, note:'First 5km!' },
    { id:'l3', date:'2026-04-08', value:6.2, note:'Pushed through wall at 5km' },
  ], streak:0, best_streak:0, status:'active' },
  { id:'g2', title:'Read 12 books this year', type:'learning', icon:'\u{1F4DA}', start_value:2, target_value:12, current_value:4, unit:'books', deadline:'2026-12-31', milestones:[
    { id:'m4', title:'6 books by June', target_value:6, done:false },
    { id:'m5', title:'9 books by September', target_value:9, done:false },
  ], logs:[
    { id:'l4', date:'2026-02-15', value:1, note:'Atomic Habits' },
    { id:'l5', date:'2026-03-20', value:1, note:'The Creative Act' },
  ], streak:0, best_streak:0, status:'active' },
  { id:'g3', title:'Drink 2L water daily', type:'habit', icon:'\u{1F504}', start_value:0, target_value:30, current_value:12, unit:'days', frequency:'daily', frequency_target:7, deadline:'', milestones:[
    { id:'m6', title:'7-day streak', target_value:7, done:true },
    { id:'m7', title:'30-day streak', target_value:30, done:false },
  ], logs:[
    { id:'l6', date:'2026-04-07', value:1, note:'' },
    { id:'l7', date:'2026-04-08', value:1, note:'' },
    { id:'l8', date:'2026-04-09', value:1, note:'' },
  ], streak:3, best_streak:8, status:'active' },
];

const FAMILY_MEMBERS = [
  { id:'1', name:'Anna',  color:'#FF7B6B' },
  { id:'2', name:'Rich',  color:'#4D8BFF' },
  { id:'3', name:'Poppy', color:'#A855F7' },
  { id:'4', name:'Gab',   color:'#22C55E' },
  { id:'5', name:'Duke',  color:'#F59E0B' },
];

type NoteItem = { id:string; title:string; text:string; preview:string; updated:string; shared:string[] };

const INITIAL_NOTES: NoteItem[] = [
  { id:'1', title:'Bathroom reno ideas',  text:'Hex tiles for floor.\nWall-hung vanity.\nKeep existing window.\nMatt black tapware throughout.\nDouble rain showerhead.\nBudget: $18-22k range.', preview:'Hex tiles for floor. Wall-hung vanity. Keep existing window.', updated:'2 days ago', shared:[] },
  { id:'2', title:'Books to read',        text:'Clear \u2014 James Clear\nThe Creative Act \u2014 Rick Rubin\nAtomic Habits (re-read)\nFour Thousand Weeks \u2014 Oliver Burkeman\nSame as Ever \u2014 Morgan Housel', preview:'Clear \u2014 James Clear. The Creative Act \u2014 Rick Rubin.', updated:'1 week ago', shared:[] },
  { id:'3', title:'Work \u2014 Q2 priorities', text:'Launch Zaeli beta\nOnboarding flow\nStripe integration\nTestFlight submission\nFirst 10 family testers\nWeekly retro with Anna', preview:'Launch Zaeli beta. Onboarding flow. Stripe. TestFlight.', updated:'Yesterday', shared:['1'] },
];

const WOTD = {
  word: 'ephemeral.',
  phonetic: '/ ɪˈfem.ər.əl / · adjective',
  def: 'Lasting for a very short time. From Greek ephemeros — lasting only a day.',
  eg: '"The ephemeral beauty of cherry blossoms makes them all the more precious."',
};

const ZEN_TRACKS = [
  { name: 'Morning grounding', dur: '5 min · calm' },
  { name: 'Focus flow',        dur: '12 min · focus' },
  { name: 'Let go of the day', dur: '8 min · evening' },
  { name: 'Sleep well',        dur: '10 min · sleep' },
];

const WORDLE_ROWS = [
  [{ l:'C',s:'g'},{l:'R',s:'x'},{l:'A',s:'y'},{l:'N',s:'x'},{l:'E',s:'x'}],
  [{ l:'S',s:'x'},{l:'L',s:'g'},{l:'A',s:'g'},{l:'T',s:'y'},{l:'E',s:'x'}],
  [{ l:'C',s:'c'},{l:'L',s:'c'},{l:'A',s:'c'},{l:'M',s:'c'},{l:'P',s:'c'}],
  [{ l:'', s:'e'},{l:'', s:'e'},{l:'', s:'e'},{l:'', s:'e'},{l:'', s:'e'}],
  [{ l:'', s:'e'},{l:'', s:'e'},{l:'', s:'e'},{l:'', s:'e'},{l:'', s:'e'}],
  [{ l:'', s:'e'},{l:'', s:'e'},{l:'', s:'e'},{l:'', s:'e'},{l:'', s:'e'}],
];
const KB_ROWS = [
  ['Q','W','E','R','T','Y','U','I','O','P'],
  ['A','S','D','F','G','H','J','K','L'],
  ['↵','Z','X','C','V','B','N','M','⌫'],
];
const KB_GREEN  = new Set(['C','L','A']);
const KB_YELLOW = new Set(['T']);
const KB_GREY   = new Set(['R','N','E','S','M','P','B','D','F','G','H','I','J','K','O','Q','U','V','W','X','Y','Z']);

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function MySpaceScreen({ onNavigateChat }: { onNavigateChat?: () => void } = {}) {
  const insets = useSafeAreaInsets();

  // Inline expand
  const [expanded, setExpanded] = useState<string | null>(null);
  // Sheet open — null | 'goals' | 'goal-detail' | 'goal-new' | 'notes' | 'wordle'
  const [sheet, setSheet]       = useState<string | null>(null);
  // Which goal is open in detail sheet
  const [activeGoal, setActiveGoal] = useState<string | null>(null);
  // Zen playing track
  const [zenPlaying, setZenPlaying] = useState(0);
  // Fitness goal state (shared between card + sheet)
  const [stepGoal, setStepGoal] = useState(HEALTH.goal);
  // Notes state
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [editingNote, setEditingNote] = useState<NoteItem | null>(null);
  // Tasks state
  type TaskItem = { id:string; title:string; due_date:string|null; is_complete:boolean; linked_note_id:string|null; completed_at:string|null };
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  // Goals state
  const [goals, setGoals] = useState<GoalItem[]>([]);

  // Load from Supabase on mount
  useEffect(() => {
    loadNotes();
    loadTasks();
    loadGoals();
  }, []);

  async function loadNotes() {
    try {
      const { data } = await supabase.from('personal_notes')
        .select('id,title,text,preview,shared,updated_at')
        .eq('family_id', FAMILY_ID)
        .order('updated_at', { ascending:false });
      if (data && data.length > 0) {
        setNotes(data.map((n:any) => ({
          id:n.id, title:n.title, text:n.text, preview:n.preview,
          updated: timeAgo(n.updated_at), shared:n.shared || [],
        })));
      } else {
        // No notes yet — show initial dummy data
        setNotes(INITIAL_NOTES);
      }
    } catch { setNotes(INITIAL_NOTES); }
  }

  async function loadTasks() {
    try {
      const { data } = await supabase.from('personal_tasks')
        .select('id,title,due_date,is_complete,linked_note_id,completed_at')
        .eq('family_id', FAMILY_ID)
        .order('is_complete').order('due_date', { ascending:true, nullsFirst:false }).order('created_at', { ascending:false });
      if (data) setTasks(data);
    } catch {}
  }

  async function addTask(title: string, due_date?: string) {
    const tempId = `t-${Date.now()}`;
    const task: TaskItem = { id:tempId, title, due_date:due_date||null, is_complete:false, linked_note_id:null, completed_at:null };
    setTasks(prev => [task, ...prev]);
    try {
      const { data } = await supabase.from('personal_tasks').insert({
        family_id:FAMILY_ID, title, due_date:due_date||null,
      }).select('id').single();
      if (data) setTasks(prev => prev.map(t => t.id === tempId ? { ...t, id:data.id } : t));
    } catch {}
  }

  async function toggleTask(id: string) {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, is_complete:!t.is_complete, completed_at:!t.is_complete ? new Date().toISOString() : null } : t));
    try {
      const task = tasks.find(t => t.id === id);
      if (task) {
        await supabase.from('personal_tasks').update({
          is_complete:!task.is_complete,
          completed_at:!task.is_complete ? new Date().toISOString() : null,
        }).eq('id', id);
      }
    } catch {}
  }

  async function deleteTask(id: string) {
    setTasks(prev => prev.filter(t => t.id !== id));
    try { await supabase.from('personal_tasks').delete().eq('id', id); } catch {}
  }

  async function loadGoals() {
    try {
      const { data } = await supabase.from('goals')
        .select('*')
        .eq('family_id', FAMILY_ID)
        .eq('status', 'active')
        .order('created_at', { ascending:false });
      if (data && data.length > 0) {
        setGoals(data.map((g:any) => ({
          id:g.id, title:g.title, type:g.type, icon:g.icon,
          start_value:g.start_value, target_value:g.target_value,
          current_value:g.current_value, unit:g.unit,
          frequency:g.frequency, frequency_target:g.frequency_target,
          deadline:g.deadline || '', milestones:g.milestones || [],
          logs:g.logs || [], streak:g.streak, best_streak:g.best_streak,
          status:g.status,
        })));
      } else {
        setGoals(INITIAL_GOALS);
      }
    } catch { setGoals(INITIAL_GOALS); }
  }

  function timeAgo(iso: string): string {
    const ms = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(ms / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return `${Math.floor(days/7)} weeks ago`;
  }

  // ── Supabase CRUD helpers ──
  async function saveNote(note: NoteItem) {
    try {
      const isNew = note.id.startsWith('new-');
      if (isNew) {
        const { data } = await supabase.from('personal_notes').insert({
          family_id:FAMILY_ID, title:note.title, text:note.text,
          preview:note.preview, shared:note.shared,
        }).select('id').single();
        if (data) {
          setNotes(prev => [{ ...note, id:data.id, updated:'Just now' }, ...prev.filter(n => n.id !== note.id)]);
        }
      } else {
        await supabase.from('personal_notes').update({
          title:note.title, text:note.text, preview:note.preview,
          shared:note.shared, updated_at:new Date().toISOString(),
        }).eq('id', note.id);
        setNotes(prev => prev.map(n => n.id === note.id ? { ...note, updated:'Just now' } : n));
      }
    } catch (e) { console.log('saveNote error:', e); }
  }

  async function deleteNote(id: string) {
    setNotes(prev => prev.filter(n => n.id !== id));
    try { await supabase.from('personal_notes').delete().eq('id', id); } catch {}
  }

  async function saveGoal(goal: GoalItem) {
    try {
      const isNew = goal.id.startsWith('g-');
      if (isNew) {
        const { data } = await supabase.from('goals').insert({
          family_id:FAMILY_ID, title:goal.title, type:goal.type, icon:goal.icon,
          start_value:goal.start_value, target_value:goal.target_value,
          current_value:goal.current_value, unit:goal.unit,
          frequency:goal.frequency || null, frequency_target:goal.frequency_target || null,
          deadline:goal.deadline || null, milestones:goal.milestones, logs:goal.logs,
          streak:goal.streak, best_streak:goal.best_streak, status:goal.status,
        }).select('id').single();
        if (data) {
          setGoals(prev => [{ ...goal, id:data.id }, ...prev.filter(g => g.id !== goal.id)]);
        }
      } else {
        await supabase.from('goals').update({
          title:goal.title, current_value:goal.current_value,
          milestones:goal.milestones, logs:goal.logs,
          streak:goal.streak, best_streak:goal.best_streak,
          updated_at:new Date().toISOString(),
        }).eq('id', goal.id);
        setGoals(prev => prev.map(g => g.id === goal.id ? goal : g));
      }
    } catch (e) { console.log('saveGoal error:', e); }
  }

  async function deleteGoal(id: string) {
    setGoals(prev => prev.filter(g => g.id !== id));
    try { await supabase.from('goals').delete().eq('id', id); } catch {}
  }

  function toggleInline(card: string) {
    setExpanded(prev => (prev === card ? null : card));
  }

  function closeSheet() {
    setSheet(null);
    setTimeout(() => setActiveGoal(null), 350);
  }

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* ── Fixed Header ── */}
      <View style={s.hdr}>
        <Text style={s.logo}>
          z<Text style={s.logoAi}>a</Text>el<Text style={s.logoAi}>i</Text>
        </Text>
        <Text style={s.pageLabel}>My Space</Text>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Zaeli Brief — REMOVED (design review) ── */}

        {/* ── Word of the Day ── */}
        <WotdCard
          expanded={expanded === 'wotd'}
          onToggle={() => toggleInline('wotd')}
        />

        {/* ── Fitness — full width ── */}
        <TouchableOpacity style={{ marginHorizontal:0, marginBottom:8, borderRadius:16, backgroundColor:'#3A3D4A', padding:16, paddingHorizontal:18 }} activeOpacity={0.88} onPress={() => setSheet('fitness')}>
          <Text style={[s.gridLabel, { color:'rgba(255,255,255,0.35)' }]}>FITNESS</Text>
          <Text style={{ fontFamily:'Poppins_800ExtraBold', fontSize:32, color:'#fff', letterSpacing:-1, lineHeight:36 }}>{HEALTH.steps.toLocaleString()}</Text>
          <Text style={{ fontFamily:'Poppins_500Medium', fontSize:15, color:'rgba(255,255,255,0.5)', marginTop:2 }}>steps today · {HEALTH.calories} cal · {HEALTH.activeMins} min active</Text>
          <View style={{ height:5, borderRadius:3, backgroundColor:'rgba(255,255,255,0.12)', overflow:'hidden', marginTop:10 }}>
            <View style={{ height:5, borderRadius:3, backgroundColor:'#A8D8F0', width:`${Math.min(100, Math.round((HEALTH.steps/stepGoal)*100))}%` as any }} />
          </View>
          <Text style={{ fontFamily:'Poppins_400Regular', fontSize:13, color:'rgba(255,255,255,0.45)', marginTop:4 }}>{Math.max(0, stepGoal - HEALTH.steps).toLocaleString()} steps to go · goal {stepGoal.toLocaleString()}</Text>
        </TouchableOpacity>

        {/* ── 4-Card Grid (2 rows x 2 columns) ── */}
        <View style={s.grid2}>
          {/* Row 1: Goals | Notes & Tasks */}
          <TouchableOpacity style={[s.gridCard, { backgroundColor:'#F0DC80' }]} activeOpacity={0.88} onPress={() => setSheet('goals')}>
            <Text style={[s.gridLabel, { color:'rgba(58,42,0,0.4)' }]}>GOALS</Text>
            <View style={{ flexDirection:'row', alignItems:'baseline', gap:6 }}>
              <Text style={[s.gridNum, { color:'#3A2A00' }]}>{goals.length}</Text>
              <Text style={{ fontFamily:'Poppins_700Bold', fontSize:18, color:'#3A2A00' }}>active</Text>
            </View>
            <Text style={[s.gridSub, { color:'rgba(58,42,0,0.5)' }]}>{goals.filter(g => g.target_value > 0 && ((g.current_value - g.start_value) / (g.target_value - g.start_value)) >= 0.5).length} on track</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.gridCard, { backgroundColor:'#FAC8A8' }]} activeOpacity={0.88} onPress={() => setSheet('notes')}>
            <Text style={[s.gridLabel, { color:'rgba(58,24,0,0.35)' }]}>NOTES & TASKS</Text>
            <Text style={[s.gridNum, { color:'#3A1800', fontSize:24 }]}>{notes.length} · {tasks.filter(t=>!t.is_complete).length}</Text>
            <Text style={{ fontFamily:'Poppins_700Bold', fontSize:16, color:'#3A1800' }}>notes · tasks</Text>
          </TouchableOpacity>

          {/* Row 2: Stretch | Zen */}
          <TouchableOpacity style={[s.gridCard, { backgroundColor:'#E8F4E8' }]} activeOpacity={0.88} onPress={() => setSheet('stretch')}>
            <Text style={[s.gridLabel, { color:'rgba(42,90,26,0.45)' }]}>DAILY STRETCH</Text>
            <Text style={{ fontFamily:'Poppins_700Bold', fontSize:22, color:'#2A5A1A', letterSpacing:-0.5, marginTop:4 }}>Morning flow</Text>
            <Text style={[s.gridSub, { color:'rgba(42,90,26,0.5)' }]}>5 movements · 8 min</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.gridCard, { backgroundColor:'#E0F3FC' }]} activeOpacity={0.88} onPress={() => setSheet('zen')}>
            <Text style={[s.gridLabel, { color:'rgba(10,74,106,0.45)' }]}>ZEN</Text>
            <Text style={{ fontFamily:'Poppins_700Bold', fontSize:22, color:'#0A4A6A', letterSpacing:-0.5, marginTop:4 }}>4 sessions</Text>
            <Text style={[s.gridSub, { color:'rgba(10,74,106,0.5)' }]}>Ready to play</Text>
          </TouchableOpacity>
        </View>

        {/* ── Wordle Card (full width) ── */}
        <WordleCard onOpen={() => setSheet('wordle')} />
      </ScrollView>

      {/* ── 92% Sheets ── */}
      <NotesSheet
        visible={sheet === 'notes'}
        onClose={closeSheet}
        notes={notes}
        tasks={tasks}
        onEdit={(n) => setEditingNote(n)}
        onNew={() => {
          const newNote: NoteItem = { id:`new-${Date.now()}`, title:'', text:'', preview:'', updated:'Just now', shared:[] };
          setEditingNote(newNote);
        }}
        onDelete={(id) => deleteNote(id)}
        onAddTask={addTask}
        onToggleTask={toggleTask}
        onDeleteTask={deleteTask}
        editingNote={editingNote}
        onEditorClose={() => setEditingNote(null)}
        onEditorSave={(updated) => { saveNote(updated); setEditingNote(null); }}
        onEditorDelete={(id) => { deleteNote(id); setEditingNote(null); }}
      />
      <WordleSheet
        visible={sheet === 'wordle'}
        onClose={closeSheet}
      />

      {/* ── Shell sheets for new cards ── */}
      <FitnessSheet visible={sheet === 'fitness'} onClose={closeSheet} stepGoal={stepGoal} onGoalChange={setStepGoal} />
      <GoalsListSheet
        visible={sheet === 'goals'}
        onClose={closeSheet}
        goals={goals}
        onGoalTap={(id) => setActiveGoal(id)}
        onAddGoal={(g) => { setGoals(prev => [g, ...prev]); saveGoal(g); }}
        activeGoal={activeGoal}
        onBackFromDetail={() => setActiveGoal(null)}
        onUpdateGoal={(updated) => { setGoals(prev => prev.map(g => g.id === updated.id ? updated : g)); saveGoal(updated); }}
        onDeleteGoal={(id) => { deleteGoal(id); setActiveGoal(null); }}
      />
      {/* Budget removed — lives on Dashboard now */}
      <StretchSheet visible={sheet === 'stretch'} onClose={closeSheet} />
      <ShellSheet visible={sheet === 'zen'} title="Zen" onClose={closeSheet} />
    </View>
  );
}

// ─── Shell Sheet (placeholder for new cards) ────────────────────────────────
function ShellSheet({ visible, title, onClose }: { visible: boolean; title: string; onClose: () => void }) {
  return (
    <Sheet visible={visible} onClose={onClose} title={title}>
      <View style={{ flex:1, alignItems:'center', justifyContent:'center', paddingBottom:60 }}>
        <Text style={{ fontFamily:'Poppins_600SemiBold', fontSize:16, color:'rgba(10,10,10,0.2)' }}>Coming soon</Text>
      </View>
    </Sheet>
  );
}

// ─── Health Card ──────────────────────────────────────────────────────────────

function HealthCard({ expanded, onToggle }: { expanded: boolean; onToggle: () => void }) {
  const remaining = HEALTH.goal - HEALTH.steps;
  return (
    <TouchableOpacity style={[s.card, s.cardSlate]} activeOpacity={0.88} onPress={onToggle}>
      <Text style={s.ghost}>6K</Text>
      <View style={s.row}>
        <Text style={[s.headlineLt, { flex: 1 }]}>{HEALTH.steps.toLocaleString()} steps{'\n'}so far today.</Text>
        <Text style={s.healthPct}>{HEALTH.pct}%</Text>
      </View>
      <View style={s.barWrap}>
        <View style={[s.barFill, { width: `${HEALTH.pct}%` as any }]} />
      </View>
      <Text style={s.barFoot}>{remaining.toLocaleString()} to go · goal {HEALTH.goal.toLocaleString()}</Text>

      {expanded && (
        <>
          <View style={s.divider} />
          <View style={[s.hstatRow, { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)' }]}>
            <Text style={s.hstatIcon}>🚶</Text>
            <View style={s.hstatLabel}>
              <Text style={s.hstatName}>Walk + Run distance</Text>
              <Text style={s.hstatMeta}>Today</Text>
            </View>
            <Text style={s.hstatVal}>{HEALTH.distance} <Text style={s.hstatUnit}>km</Text></Text>
          </View>
          <View style={s.hstatRow}>
            <Text style={s.hstatIcon}>🔥</Text>
            <View style={s.hstatLabel}>
              <Text style={s.hstatName}>Active calories</Text>
              <Text style={s.hstatMeta}>Today</Text>
            </View>
            <Text style={s.hstatVal}>{HEALTH.calories} <Text style={s.hstatUnit}>cal</Text></Text>
          </View>
          {HEALTH.workouts.map((w, i) => (
            <View key={i} style={s.workout}>
              <Text style={s.woIcon}>{w.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.woName}>{w.name}</Text>
                <Text style={s.woMeta}>{w.meta}</Text>
                <View style={s.woStats}>
                  {w.stats.map((stat, j) => <Text key={j} style={s.woStat}>{stat}</Text>)}
                </View>
              </View>
            </View>
          ))}
        </>
      )}
    </TouchableOpacity>
  );
}

// ─── Goals Card (tap 1 = inline, tap 2 = sheet) ───────────────────────────────

function GoalsCard({ expanded, onToggle, onGoalTap, onAddGoal }: {
  expanded: boolean;
  onToggle: () => void;
  onGoalTap: (index: number) => void;
  onAddGoal: () => void;
}) {
  return (
    <TouchableOpacity style={[s.card, s.cardGold]} activeOpacity={0.88} onPress={onToggle}>
      <Text style={s.headlineDk}>Three goals{'\n'}to work toward.</Text>

      {!expanded && (
        <Text style={s.tapHintDk}>Running · reading · hydration</Text>
      )}

      {expanded && (
        <>
          <View style={[s.divider, { backgroundColor: 'rgba(0,0,0,0.12)', opacity: 1 }]} />

          {GOALS.map((g, i) => (
            <TouchableOpacity
              key={i}
              style={[
                s.goalRow,
                i < GOALS.length - 1 && { borderBottomWidth: 1, borderBottomColor: 'rgba(10,10,10,0.08)' },
              ]}
              activeOpacity={0.75}
              onPress={e => { e.stopPropagation(); onGoalTap(i); }}
            >
              <Text style={s.goalIcon}>{g.icon}</Text>
              <View style={s.goalBody}>
                <Text style={s.goalName}>{g.name}</Text>
                <Text style={s.goalMeta}>{g.meta}</Text>
                <View style={s.goalBarWrap}>
                  <View style={[s.goalBarFill, { width: `${g.pct}%` as any }]} />
                </View>
              </View>
              <Text style={s.goalPct}>{g.pct}% ›</Text>
            </TouchableOpacity>
          ))}

          {/* Add goal button */}
          <TouchableOpacity
            style={s.addGoalBtn}
            activeOpacity={0.75}
            onPress={e => { e.stopPropagation(); onAddGoal(); }}
          >
            <Text style={s.addGoalTxt}>+ Add goal</Text>
          </TouchableOpacity>
        </>
      )}
    </TouchableOpacity>
  );
}

// ─── WotD Card ────────────────────────────────────────────────────────────────

function WotdCard({ expanded, onToggle }: { expanded: boolean; onToggle: () => void }) {
  return (
    <TouchableOpacity style={[s.card, s.cardSage]} activeOpacity={0.88} onPress={onToggle}>
      <Text style={s.cardLabel}>Word of the Day</Text>
      <Text style={s.wotdWord}>{WOTD.word}</Text>
      <Text style={s.tapHintWotd}>{WOTD.phonetic}</Text>
      {expanded && (
        <>
          <View style={[s.divider, { backgroundColor: 'rgba(107,53,217,0.25)', opacity: 1 }]} />
          <Text style={s.wotdDef}>{WOTD.def}</Text>
          <Text style={s.wotdEg}>{WOTD.eg}</Text>
          {/* SVG play button — matches index.tsx IcoPlay */}
          <TouchableOpacity
            style={s.wotdPlay}
            activeOpacity={0.75}
            onPress={e => e.stopPropagation()}
          >
            <IcoPlay color="#6B35D9" size={14} />
            <Text style={s.wotdPlayTxt}>Play pronunciation</Text>
          </TouchableOpacity>
        </>
      )}
    </TouchableOpacity>
  );
}

// ─── NASA Card ────────────────────────────────────────────────────────────────

function NasaCard({ expanded, onToggle }: { expanded: boolean; onToggle: () => void }) {
  return (
    <TouchableOpacity style={[s.card, s.cardSlate, { padding: 0, overflow: 'hidden' }]} activeOpacity={0.88} onPress={onToggle}>
      <View style={s.nasaImg}>
        <Text style={s.nasaImgTxt}>✦</Text>
      </View>
      <View style={{ padding: 22, paddingTop: 14 }}>
        <Text style={s.cardLabelLt}>NASA · Astronomy Picture of the Day</Text>
        <Text style={s.headlineLt}>Saturn's rings,{'\n'}today.</Text>
        {!expanded && <Text style={s.tapHintLt}>Tap to read the full story</Text>}
        {expanded && (
          <>
            <View style={s.divider} />
            <Text style={s.nasaDesc}>NASA's Cassini spacecraft captured this final mosaic of Saturn before its planned atmospheric dive in September 2017 — from 1.09 million kilometres away.</Text>
            <Text style={s.nasaLink}>View full image →</Text>
          </>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ─── Zen Card ─────────────────────────────────────────────────────────────────

function ZenCard({ expanded, onToggle, zenPlaying, setZenPlaying }: {
  expanded: boolean; onToggle: () => void;
  zenPlaying: number; setZenPlaying: (i: number) => void;
}) {
  return (
    <TouchableOpacity style={[s.card, s.cardPeach]} activeOpacity={0.88} onPress={onToggle}>
      <Text style={s.headlineDk}>Four meditations{'\n'}ready for you.</Text>
      {!expanded && <Text style={s.tapHintDk}>Calm · focus · evening · sleep</Text>}
      {expanded && (
        <>
          <View style={[s.divider, { backgroundColor: 'rgba(0,0,0,0.10)', opacity: 1 }]} />
          {ZEN_TRACKS.map((t, i) => (
            <TouchableOpacity
              key={i}
              style={[
                s.zenTrack,
                i < ZEN_TRACKS.length - 1 && { borderBottomWidth: 1, borderBottomColor: 'rgba(10,10,10,0.08)' },
              ]}
              activeOpacity={0.75}
              onPress={e => { e.stopPropagation(); setZenPlaying(i); }}
            >
              {/* SVG play/pause icon */}
              <View style={[s.zenBtn, zenPlaying === i && s.zenBtnOn]}>
                {zenPlaying === i
                  ? <IcoPause color={zenPlaying === i ? '#fff' : 'rgba(10,10,10,0.55)'} size={13} />
                  : <IcoPlay  color="rgba(10,10,10,0.55)" size={13} />
                }
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.zenName}>{t.name}</Text>
                <Text style={s.zenDur}>{t.dur}</Text>
              </View>
              {zenPlaying === i && (
                <View style={s.zenProg}>
                  <View style={[s.zenProgFill, { width: '35%' }]} />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </>
      )}
    </TouchableOpacity>
  );
}

// ─── Notes Card ───────────────────────────────────────────────────────────────

function NotesCard({ onOpen }: { onOpen: () => void }) {
  return (
    <TouchableOpacity style={[s.card, s.cardLav]} activeOpacity={0.88} onPress={onOpen}>
      <Text style={s.ghost}>3</Text>
      <Text style={s.headlineLt}>Three notes{'\n'}on the go.</Text>
      <Text style={s.tapHintLav}>Reno · books · work</Text>
    </TouchableOpacity>
  );
}

// ─── Wordle Card ──────────────────────────────────────────────────────────────

function WordleCard({ onOpen }: { onOpen: () => void }) {
  return (
    <TouchableOpacity style={[s.card, { backgroundColor:'#D8CCFF' }]} activeOpacity={0.88} onPress={onOpen}>
      <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
        <Text style={[s.cardLabel, { color:'rgba(60,20,140,0.45)' }]}>ZAELI WORDLE</Text>
        <Text style={{ fontFamily:'Poppins_500Medium', fontSize:11, color:'rgba(60,20,140,0.4)' }}>Tap to play →</Text>
      </View>
      <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between' }}>
        <Text style={{ fontFamily:'Poppins_800ExtraBold', fontSize:20, color:'#2A0A80', letterSpacing:-0.5 }}>12-day streak 🔥</Text>
        <View>
          <View style={{ flexDirection:'row', gap:3, marginBottom:3 }}>
            <View style={{ width:22, height:22, borderRadius:4, backgroundColor:'#5A8A3C', alignItems:'center', justifyContent:'center' }}><Text style={{ fontFamily:'Poppins_800ExtraBold', fontSize:9, color:'#fff' }}>C</Text></View>
            <View style={{ width:22, height:22, borderRadius:4, backgroundColor:'rgba(42,10,128,0.15)', alignItems:'center', justifyContent:'center' }}><Text style={{ fontFamily:'Poppins_800ExtraBold', fontSize:9, color:'rgba(42,10,128,0.4)' }}>R</Text></View>
            <View style={{ width:22, height:22, borderRadius:4, backgroundColor:'#C8A820', alignItems:'center', justifyContent:'center' }}><Text style={{ fontFamily:'Poppins_800ExtraBold', fontSize:9, color:'#fff' }}>A</Text></View>
            <View style={{ width:22, height:22, borderRadius:4, backgroundColor:'rgba(42,10,128,0.15)', alignItems:'center', justifyContent:'center' }}><Text style={{ fontFamily:'Poppins_800ExtraBold', fontSize:9, color:'rgba(42,10,128,0.4)' }}>N</Text></View>
            <View style={{ width:22, height:22, borderRadius:4, backgroundColor:'rgba(42,10,128,0.15)', alignItems:'center', justifyContent:'center' }}><Text style={{ fontFamily:'Poppins_800ExtraBold', fontSize:9, color:'rgba(42,10,128,0.4)' }}>E</Text></View>
          </View>
          <View style={{ flexDirection:'row', gap:3 }}>
            <View style={{ width:22, height:22, borderRadius:4, backgroundColor:'#5A8A3C', alignItems:'center', justifyContent:'center' }}><Text style={{ fontFamily:'Poppins_800ExtraBold', fontSize:9, color:'#fff' }}>C</Text></View>
            <View style={{ width:22, height:22, borderRadius:4, backgroundColor:'#5A8A3C', alignItems:'center', justifyContent:'center' }}><Text style={{ fontFamily:'Poppins_800ExtraBold', fontSize:9, color:'#fff' }}>H</Text></View>
            <View style={{ width:22, height:22, borderRadius:4, backgroundColor:'#5A8A3C', alignItems:'center', justifyContent:'center' }}><Text style={{ fontFamily:'Poppins_800ExtraBold', fontSize:9, color:'#fff' }}>A</Text></View>
            <View style={{ width:22, height:22, borderRadius:4, backgroundColor:'#5A8A3C', alignItems:'center', justifyContent:'center' }}><Text style={{ fontFamily:'Poppins_800ExtraBold', fontSize:9, color:'#fff' }}>I</Text></View>
            <View style={{ width:22, height:22, borderRadius:4, backgroundColor:'#5A8A3C', alignItems:'center', justifyContent:'center' }}><Text style={{ fontFamily:'Poppins_800ExtraBold', fontSize:9, color:'#fff' }}>R</Text></View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Sheet base component ─────────────────────────────────────────────────────

function Sheet({ visible, onClose, title, subtitle, children }: {
  visible: boolean; onClose: () => void;
  title: string; subtitle?: string; children: React.ReactNode;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.backdrop}>
        <TouchableOpacity style={{ flex:1 }} activeOpacity={1} onPress={onClose} />
        <View style={s.sheetWrap}>
          <View style={s.sheetHandle} />
          <View style={s.sheetHdr}>
            <View>
              <Text style={s.sheetTitle}>{title}</Text>
              {subtitle ? <Text style={s.sheetSubtitle}>{subtitle}</Text> : null}
            </View>
            <TouchableOpacity style={s.sheetClose} onPress={onClose}>
              <Text style={s.sheetCloseTxt}>✕</Text>
            </TouchableOpacity>
          </View>
          {children}
        </View>
      </View>
    </Modal>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDateAU(iso: string) {
  if (!iso || iso.length < 10) return '';
  try { return new Date(iso+'T00:00:00').toLocaleDateString('en-AU', { day:'numeric', month:'short', year:'numeric' }); }
  catch { return iso; }
}

// ─── Stretch data ────────────────────────────────────────────────────────────

const STRETCH_VIDEOS: Record<string, { title:string; channel:string; dur:string; ytId:string }> = {
  '5-adriene':  { title:'5 Min Morning Yoga',      channel:'Yoga With Adriene', dur:'5 min',  ytId:'4pKly2JojMw' },
  '15-adriene': { title:'15 Min Full Body Stretch', channel:'Yoga With Adriene', dur:'15 min', ytId:'g_tea8ZNkHE' },
  '30-adriene': { title:'30 Min Deep Stretch',      channel:'Yoga With Adriene', dur:'30 min', ytId:'GLy2rYHwUqY' },
  '5-patrick':  { title:'5 Min Quick Stretch',      channel:'Patrick Beach Yoga', dur:'5 min',  ytId:'3sMJRBPxN3o' },
  '15-patrick': { title:'15 Min Mobility Reset',    channel:'Patrick Beach Yoga', dur:'15 min', ytId:'Yzm3-P8aBYY' },
  '30-patrick': { title:'30 Min Full Mobility',     channel:'Patrick Beach Yoga', dur:'30 min', ytId:'v7AYKMP6rOE' },
};

const STRETCH_MOVES: Record<string, { name:string; detail:string }[]> = {
  '5': [
    { name:'Cat-Cow stretch',       detail:'60 sec · spine mobility' },
    { name:"Child's pose",          detail:'45 sec · lower back' },
    { name:'Hip flexor lunge',      detail:'30 sec each side · hips' },
    { name:'Seated hamstring',      detail:'30 sec each side' },
    { name:'Shoulder rolls + neck', detail:'60 sec · upper body' },
  ],
  '15': [
    { name:'Neck and shoulder release', detail:'90 sec · upper body' },
    { name:'Cat-Cow flow',              detail:'60 sec · spine' },
    { name:'Downward dog',              detail:'60 sec · full body' },
    { name:'Pigeon pose',               detail:'90 sec each side · hips' },
    { name:'Supine twist',              detail:'60 sec each side · lower back' },
    { name:'Seated forward fold',       detail:'90 sec · hamstrings' },
  ],
  '30': [
    { name:'Neck and shoulder rolls',   detail:'2 min · upper body' },
    { name:'Cat-Cow + thread needle',   detail:'3 min · spine mobility' },
    { name:'Low lunge flow',            detail:'3 min each side · hips' },
    { name:'Downward dog to cobra',     detail:'3 min · full body' },
    { name:'Pigeon pose hold',          detail:'2 min each side · deep hips' },
    { name:'Seated wide-leg fold',      detail:'2 min · inner thighs' },
    { name:'Supine spinal twist',       detail:'2 min each side · lower back' },
    { name:'Happy baby',                detail:'2 min · hip flexors' },
    { name:'Savasana',                  detail:'3 min · full body rest' },
  ],
};

// ─── Stretch Sheet ───────────────────────────────────────────────────────────

function StretchSheet({ visible, onClose }: { visible:boolean; onClose:()=>void }) {
  const [duration, setDuration] = useState<'5'|'15'|'30'>('5');
  const [instructor, setInstructor] = useState<'adriene'|'patrick'>('adriene');
  const [isDone, setIsDone] = useState(false);
  const [streak] = useState(3); // dummy

  const videoKey = `${duration}-${instructor}`;
  const video = STRETCH_VIDEOS[videoKey];
  const moves = STRETCH_MOVES[duration];

  function changeDuration(d: '5'|'15'|'30') { setDuration(d); setIsDone(false); }
  function changeInstructor(i: 'adriene'|'patrick') { setInstructor(i); setIsDone(false); }

  function openYouTube() {
    Linking.openURL(`https://www.youtube.com/watch?v=${video.ytId}`);
  }

  return (
    <Sheet visible={visible} onClose={onClose} title="Daily Stretch">
      <ScrollView style={s.sheetBody} showsVerticalScrollIndicator={false}>

        {/* Streak badge */}
        <View style={{ flexDirection:'row', justifyContent:'flex-end', marginBottom:12, marginTop:-4 }}>
          <View style={{ flexDirection:'row', alignItems:'center', gap:6, backgroundColor:'#FFF8E6', borderRadius:20, paddingVertical:5, paddingHorizontal:14 }}>
            <Text style={{ fontSize:14 }}>🔥</Text>
            <Text style={{ fontFamily:'Poppins_700Bold', fontSize:13, color:'#92660A' }}>{streak} day streak</Text>
          </View>
        </View>

        {/* Zaeli nudge */}
        <View style={{ backgroundColor:'#2D3748', borderRadius:18, padding:16, marginBottom:16 }}>
          <Text style={{ fontFamily:'Poppins_700Bold', fontSize:11, color:'#A8D8F0', letterSpacing:1, marginBottom:6 }}>ZAELI</Text>
          <Text style={{ fontFamily:'Poppins_500Medium', fontSize:14, color:'#E2E8F0', lineHeight:22 }}>Good morning — a quick 5 minutes before the school run would set you up nicely today.</Text>
        </View>

        {/* Session picker */}
        <Text style={{ fontFamily:'Poppins_700Bold', fontSize:12, color:'#9CA3AF', letterSpacing:0.8, textTransform:'uppercase' as any, marginBottom:10 }}>Choose your session</Text>

        <View style={{ backgroundColor:'#fff', borderRadius:18, padding:16, borderWidth:0.5, borderColor:'rgba(0,0,0,0.07)', marginBottom:16 }}>
          {/* Duration */}
          <View style={{ flexDirection:'row', alignItems:'center', marginBottom:14 }}>
            <Text style={{ fontFamily:'Poppins_700Bold', fontSize:13, color:'#9CA3AF', width:80 }}>Duration</Text>
            <View style={{ flexDirection:'row', flex:1, gap:8 }}>
              {(['5','15','30'] as const).map(d => (
                <TouchableOpacity key={d} onPress={() => changeDuration(d)} activeOpacity={0.7}
                  style={{ flex:1, paddingVertical:9, borderRadius:20, alignItems:'center',
                    backgroundColor: duration === d ? '#4A7C6F' : '#F7F7F4' }}>
                  <Text style={{ fontFamily:'Poppins_700Bold', fontSize:13, color: duration === d ? '#fff' : '#718096' }}>{d} min</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={{ height:0.5, backgroundColor:'rgba(0,0,0,0.07)', marginBottom:14 }} />

          {/* Instructor */}
          <View style={{ flexDirection:'row', alignItems:'center' }}>
            <Text style={{ fontFamily:'Poppins_700Bold', fontSize:13, color:'#9CA3AF', width:80 }}>Instructor</Text>
            <View style={{ flexDirection:'row', flex:1, gap:8 }}>
              {([{ k:'adriene' as const, l:'Adriene' },{ k:'patrick' as const, l:'Patrick' }]).map(i => (
                <TouchableOpacity key={i.k} onPress={() => changeInstructor(i.k)} activeOpacity={0.7}
                  style={{ flex:1, paddingVertical:9, borderRadius:20, alignItems:'center',
                    backgroundColor: instructor === i.k ? '#4A7C6F' : '#F7F7F4' }}>
                  <Text style={{ fontFamily:'Poppins_700Bold', fontSize:13, color: instructor === i.k ? '#fff' : '#718096' }}>{i.l}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Video card */}
        <TouchableOpacity onPress={openYouTube} activeOpacity={0.85}
          style={{ marginBottom:16, borderRadius:18, overflow:'hidden', borderWidth:0.5, borderColor:'rgba(0,0,0,0.07)' }}>
          {/* Thumbnail */}
          <View style={{ aspectRatio:16/9, backgroundColor:'#1A1A2E', alignItems:'center', justifyContent:'center' }}>
            <Text style={{ fontFamily:'Poppins_700Bold', fontSize:14, color:'rgba(255,255,255,0.5)', position:'absolute', top:'34%' as any }}>{video.channel}</Text>
            <Text style={{ fontFamily:'Poppins_500Medium', fontSize:12, color:'rgba(255,255,255,0.3)', position:'absolute', top:'50%' as any }}>{video.title} · {video.dur}</Text>
            <View style={{ width:60, height:60, borderRadius:16, backgroundColor:'#FF0000', alignItems:'center', justifyContent:'center' }}>
              <Svg width={24} height={24} viewBox="0 0 24 24" fill="#fff"><Polygon points="5 3 19 12 5 21 5 3" /></Svg>
            </View>
          </View>
          {/* Meta bar */}
          <View style={{ backgroundColor:'#fff', padding:14, flexDirection:'row', alignItems:'center', justifyContent:'space-between' }}>
            <View>
              <Text style={{ fontFamily:'Poppins_700Bold', fontSize:14, color:'#1A1A1A' }}>{video.title}</Text>
              <Text style={{ fontFamily:'Poppins_400Regular', fontSize:12, color:'#9CA3AF', marginTop:3 }}>{video.channel}</Text>
            </View>
            <View style={{ backgroundColor:'#EAF3EE', borderRadius:20, paddingVertical:5, paddingHorizontal:12 }}>
              <Text style={{ fontFamily:'Poppins_700Bold', fontSize:12, color:'#4A7C6F' }}>{video.dur}</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Movements */}
        <Text style={{ fontFamily:'Poppins_700Bold', fontSize:12, color:'#9CA3AF', letterSpacing:0.8, textTransform:'uppercase' as any, marginBottom:10 }}>{"What's in this session"}</Text>

        <View style={{ backgroundColor:'#fff', borderRadius:18, overflow:'hidden', borderWidth:0.5, borderColor:'rgba(0,0,0,0.07)', marginBottom:16 }}>
          {moves.map((m, i) => (
            <View key={i} style={{ flexDirection:'row', alignItems:'center', padding:14, gap:14, ...(i > 0 ? { borderTopWidth:0.5, borderTopColor:'rgba(0,0,0,0.06)' } : {}) }}>
              <View style={{ width:28, height:28, borderRadius:14, backgroundColor:'#EAF3EE', alignItems:'center', justifyContent:'center' }}>
                <Text style={{ fontFamily:'Poppins_800ExtraBold', fontSize:12, color:'#4A7C6F' }}>{i+1}</Text>
              </View>
              <View style={{ flex:1 }}>
                <Text style={{ fontFamily:'Poppins_700Bold', fontSize:15, color:'#1A1A1A' }}>{m.name}</Text>
                <Text style={{ fontFamily:'Poppins_400Regular', fontSize:12, color:'#9CA3AF', marginTop:3 }}>{m.detail}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Mark as done */}
        <TouchableOpacity onPress={() => setIsDone(true)} activeOpacity={0.7}
          style={{ backgroundColor: isDone ? '#EAF3EE' : '#4A7C6F', borderRadius:14, paddingVertical:16, alignItems:'center', flexDirection:'row', justifyContent:'center', gap:10, marginBottom:8 }}>
          <View style={{ width:22, height:22, borderRadius:11, backgroundColor: isDone ? '#4A7C6F' : 'rgba(255,255,255,0.2)', alignItems:'center', justifyContent:'center' }}>
            {isDone && <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><Path d="M20 6L9 17l-5-5"/></Svg>}
            {!isDone && <Text style={{ fontFamily:'Poppins_700Bold', fontSize:11, color:'rgba(255,255,255,0.6)' }}>✓</Text>}
          </View>
          <Text style={{ fontFamily:'Poppins_700Bold', fontSize:16, color: isDone ? '#4A7C6F' : '#fff' }}>{isDone ? 'Done for today' : 'Mark as done'}</Text>
        </TouchableOpacity>
        {isDone && (
          <Text style={{ fontFamily:'Poppins_600SemiBold', fontSize:13, color:'#9CA3AF', textAlign:'center', marginBottom:16 }}>Saved · Zaeli will remember this 👌</Text>
        )}

        <View style={{ height:30 }} />
      </ScrollView>
    </Sheet>
  );
}

// ─── Fitness Sheet ───────────────────────────────────────────────────────────

function FitnessSheet({ visible, onClose, stepGoal, onGoalChange }: { visible:boolean; onClose:()=>void; stepGoal:number; onGoalChange:(v:number)=>void }) {
  const [editGoal, setEditGoal] = useState(false);
  const [goalVal, setGoalVal] = useState(String(stepGoal));
  const remaining = Math.max(0, stepGoal - HEALTH.steps);
  const pct = Math.min(100, Math.round((HEALTH.steps / stepGoal) * 100));
  const todayLabel = new Date().toLocaleDateString('en-AU', { weekday:'short', day:'numeric', month:'short' });

  // SVG ring math
  const ringR = 38;
  const ringC = 2 * Math.PI * ringR;
  const ringOffset = ringC - (ringC * Math.min(pct, 100) / 100);

  // Weekly chart
  const maxSteps = Math.max(...HEALTH.weekSteps, 1);
  const barMaxH = 80;

  return (
    <Sheet visible={visible} onClose={onClose} title="Fitness">
      <ScrollView style={s.sheetBody} showsVerticalScrollIndicator={false}>

        {/* Date badge */}
        <View style={{ flexDirection:'row', justifyContent:'flex-end', marginBottom:12, marginTop:-4 }}>
          <View style={{ backgroundColor:'#E8E4DE', borderRadius:20, paddingVertical:5, paddingHorizontal:14 }}>
            <Text style={{ fontFamily:'Poppins_600SemiBold', fontSize:13, color:'#4A5568' }}>Today · {todayLabel}</Text>
          </View>
        </View>

        {/* Zaeli nudge */}
        <View style={{ backgroundColor:'#2D3748', borderRadius:18, padding:16, marginBottom:16 }}>
          <Text style={{ fontFamily:'Poppins_700Bold', fontSize:11, color:'#A8D8F0', letterSpacing:1, marginBottom:6 }}>ZAELI</Text>
          <Text style={{ fontFamily:'Poppins_500Medium', fontSize:14, color:'#E2E8F0', lineHeight:22 }}>Strong week, Rich — you've moved every day since Monday. Today's looking quiet so far but it's only the afternoon.</Text>
        </View>

        {/* Section: Today's movement */}
        <Text style={{ fontFamily:'Poppins_700Bold', fontSize:12, color:'#9CA3AF', letterSpacing:0.8, textTransform:'uppercase' as any, marginBottom:10 }}>{"Today's movement"}</Text>

        <View style={{ backgroundColor:'#fff', borderRadius:18, padding:18, borderWidth:0.5, borderColor:'rgba(0,0,0,0.07)', marginBottom:16 }}>
          {/* Steps + Ring */}
          <View style={{ flexDirection:'row', alignItems:'center', gap:20 }}>
            {/* Progress ring */}
            <View style={{ width:90, height:90, alignItems:'center', justifyContent:'center' }}>
              <Svg width={90} height={90} viewBox="0 0 90 90">
                <Circle cx={45} cy={45} r={ringR} fill="none" stroke="#E8F5EE" strokeWidth={8} />
                <Circle cx={45} cy={45} r={ringR} fill="none" stroke="#38A169" strokeWidth={8}
                  strokeDasharray={`${ringC}`} strokeDashoffset={`${ringOffset}`}
                  strokeLinecap="round" rotation={-90} origin="45,45" />
              </Svg>
              <View style={{ position:'absolute', alignItems:'center' }}>
                <Text style={{ fontFamily:'Poppins_800ExtraBold', fontSize:18, color:'#1A1A1A', lineHeight:22 }}>{pct}%</Text>
                <Text style={{ fontFamily:'Poppins_700Bold', fontSize:8, color:'#9CA3AF', letterSpacing:0.5 }}>OF GOAL</Text>
              </View>
            </View>

            {/* Step count */}
            <View style={{ flex:1 }}>
              <Text style={{ fontFamily:'Poppins_800ExtraBold', fontSize:36, color:'#1A1A1A', letterSpacing:-1, lineHeight:40 }}>{HEALTH.steps.toLocaleString()}</Text>
              <Text style={{ fontFamily:'Poppins_500Medium', fontSize:15, color:'#718096', marginTop:3 }}>steps today</Text>
              <View style={{ flexDirection:'row', alignItems:'center', gap:6, marginTop:8 }}>
                <View style={{ width:7, height:7, borderRadius:4, backgroundColor:'#38A169' }} />
                <Text style={{ fontFamily:'Poppins_600SemiBold', fontSize:13, color:'#38A169' }}>{remaining.toLocaleString()} steps to goal</Text>
              </View>
            </View>
          </View>

          {/* Metric pills */}
          <View style={{ flexDirection:'row', gap:10, marginTop:16 }}>
            <View style={{ flex:1, backgroundColor:'#F7F7F4', borderRadius:14, paddingVertical:12, paddingHorizontal:10, alignItems:'center' }}>
              <Text style={{ fontSize:17, marginBottom:4 }}>🔥</Text>
              <Text style={{ fontFamily:'Poppins_700Bold', fontSize:18, color:'#1A1A1A' }}>{HEALTH.calories}</Text>
              <Text style={{ fontFamily:'Poppins_600SemiBold', fontSize:11, color:'#9CA3AF', marginTop:3 }}>Active cal</Text>
            </View>
            <View style={{ flex:1, backgroundColor:'#F7F7F4', borderRadius:14, paddingVertical:12, paddingHorizontal:10, alignItems:'center' }}>
              <Text style={{ fontSize:17, marginBottom:4 }}>⚡</Text>
              <Text style={{ fontFamily:'Poppins_700Bold', fontSize:18, color:'#1A1A1A' }}>{HEALTH.activeMins}</Text>
              <Text style={{ fontFamily:'Poppins_600SemiBold', fontSize:11, color:'#9CA3AF', marginTop:3 }}>Active min</Text>
            </View>
            <View style={{ flex:1, backgroundColor:'#F7F7F4', borderRadius:14, paddingVertical:12, paddingHorizontal:10, alignItems:'center' }}>
              <Text style={{ fontSize:17, marginBottom:4 }}>🧍</Text>
              <Text style={{ fontFamily:'Poppins_700Bold', fontSize:18, color:'#1A1A1A' }}>{HEALTH.standHrs} / {HEALTH.standGoal}</Text>
              <Text style={{ fontFamily:'Poppins_600SemiBold', fontSize:11, color:'#9CA3AF', marginTop:3 }}>Stand hrs</Text>
            </View>
          </View>

          {/* Goal edit row */}
          <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginTop:16, paddingTop:14, borderTopWidth:0.5, borderTopColor:'rgba(0,0,0,0.07)' }}>
            <Text style={{ fontFamily:'Poppins_500Medium', fontSize:14, color:'#718096' }}>Daily goal: <Text style={{ fontFamily:'Poppins_700Bold', color:'#1A1A1A' }}>{stepGoal.toLocaleString()} steps</Text></Text>
            <TouchableOpacity onPress={() => setEditGoal(!editGoal)} activeOpacity={0.7}
              style={{ backgroundColor:'#F0EDE8', borderRadius:20, paddingVertical:6, paddingHorizontal:16 }}>
              <Text style={{ fontFamily:'Poppins_700Bold', fontSize:13, color:'#4A5568' }}>Edit goal</Text>
            </TouchableOpacity>
          </View>

          {/* Goal edit inline */}
          {editGoal && (
            <View style={{ marginTop:14 }}>
              <TextInput
                style={{ fontFamily:'Poppins_800ExtraBold', fontSize:28, color:'#1A1A1A', textAlign:'center', borderWidth:1.5, borderColor:'#E2E8F0', borderRadius:14, paddingVertical:12, marginBottom:12 }}
                value={goalVal} onChangeText={setGoalVal} keyboardType="numeric"
              />
              <View style={{ flexDirection:'row', gap:8, marginBottom:14, justifyContent:'center' }}>
                {[6000, 8000, 10000, 12000, 15000].map(v => (
                  <TouchableOpacity key={v} onPress={() => setGoalVal(String(v))} activeOpacity={0.7}
                    style={{ paddingVertical:7, paddingHorizontal:14, borderRadius:20,
                      backgroundColor: goalVal === String(v) ? '#2D3748' : '#F0EDE8' }}>
                    <Text style={{ fontFamily:'Poppins_700Bold', fontSize:13,
                      color: goalVal === String(v) ? '#fff' : '#4A5568' }}>{(v/1000)}k</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity onPress={() => { onGoalChange(parseInt(goalVal) || 10000); setEditGoal(false); }} activeOpacity={0.7}
                style={{ backgroundColor:'#FF4545', borderRadius:14, paddingVertical:15, alignItems:'center' }}>
                <Text style={{ fontFamily:'Poppins_700Bold', fontSize:15, color:'#fff' }}>Save goal</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Section: This week */}
        <Text style={{ fontFamily:'Poppins_700Bold', fontSize:12, color:'#9CA3AF', letterSpacing:0.8, textTransform:'uppercase' as any, marginBottom:10 }}>This week</Text>

        <View style={{ backgroundColor:'#fff', borderRadius:18, padding:18, borderWidth:0.5, borderColor:'rgba(0,0,0,0.07)', marginBottom:16 }}>
          <Text style={{ fontFamily:'Poppins_500Medium', fontSize:14, color:'#718096', marginBottom:16, lineHeight:20 }}>
            Active <Text style={{ fontFamily:'Poppins_700Bold', color:'#1A1A1A' }}>5 of 7 days</Text> · avg <Text style={{ fontFamily:'Poppins_700Bold', color:'#1A1A1A' }}>{Math.round(HEALTH.weekSteps.reduce((a,b)=>a+b,0)/7).toLocaleString()} steps</Text>
          </Text>

          {/* Bar chart */}
          <View style={{ flexDirection:'row', alignItems:'flex-end', gap:8, height:barMaxH, marginBottom:6 }}>
            {HEALTH.weekSteps.map((steps, i) => {
              const isToday = i === HEALTH.weekDays.length - 1;
              const h = Math.max(4, (steps / maxSteps) * barMaxH);
              const isLow = steps < HEALTH.goal * 0.3;
              return (
                <View key={i} style={{ flex:1, alignItems:'center', justifyContent:'flex-end', height:barMaxH }}>
                  <View style={{
                    width:'100%' as any, height:h, borderRadius:5,
                    backgroundColor: isLow ? '#E8E4DE' : isToday ? '#38A169' : '#68D391',
                    ...(isToday ? { borderWidth:2, borderColor:'#2F855A' } : {}),
                  }} />
                </View>
              );
            })}
          </View>
          <View style={{ flexDirection:'row', gap:8 }}>
            {HEALTH.weekDays.map((d, i) => {
              const isToday = i === HEALTH.weekDays.length - 1;
              return (
                <View key={i} style={{ flex:1, alignItems:'center' }}>
                  <Text style={{ fontFamily:'Poppins_700Bold', fontSize:11, color: isToday ? '#2F855A' : '#9CA3AF' }}>
                    {isToday ? 'Now' : d}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Section: Recent workouts */}
        <Text style={{ fontFamily:'Poppins_700Bold', fontSize:12, color:'#9CA3AF', letterSpacing:0.8, textTransform:'uppercase' as any, marginBottom:10 }}>Recent workouts</Text>

        <View style={{ backgroundColor:'#fff', borderRadius:18, overflow:'hidden', borderWidth:0.5, borderColor:'rgba(0,0,0,0.07)', marginBottom:16 }}>
          {HEALTH.workouts.map((w, i) => (
            <View key={i} style={{ flexDirection:'row', alignItems:'center', padding:16, gap:14, ...(i > 0 ? { borderTopWidth:0.5, borderTopColor:'rgba(0,0,0,0.07)' } : {}) }}>
              <View style={{ width:42, height:42, borderRadius:12, backgroundColor:w.bg, alignItems:'center', justifyContent:'center' }}>
                <Text style={{ fontSize:20 }}>{w.icon}</Text>
              </View>
              <View style={{ flex:1 }}>
                <Text style={{ fontFamily:'Poppins_700Bold', fontSize:15, color:'#1A1A1A' }}>{w.name}</Text>
                <Text style={{ fontFamily:'Poppins_400Regular', fontSize:13, color:'#9CA3AF', marginTop:3 }}>{w.meta}</Text>
              </View>
              <Text style={{ fontFamily:'Poppins_700Bold', fontSize:14, color:'#4A5568' }}>{w.dur}</Text>
            </View>
          ))}
        </View>

        {/* HealthKit footer */}
        <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'center', gap:8, paddingVertical:16 }}>
          <View style={{ width:8, height:8, borderRadius:4, backgroundColor:'#FC3C44' }} />
          <Text style={{ fontFamily:'Poppins_600SemiBold', fontSize:12, color:'#C0C0B8' }}>Data from Apple Health</Text>
        </View>

        <View style={{ height:30 }} />
      </ScrollView>
    </Sheet>
  );
}

// ─── Goals List Sheet ─────────────────────────────────────────────────────────

function GoalsListSheet({ visible, onClose, goals, onGoalTap, onAddGoal,
  activeGoal, onBackFromDetail, onUpdateGoal, onDeleteGoal }: {
  visible:boolean; onClose:()=>void; goals:GoalItem[];
  onGoalTap:(id:string)=>void; onAddGoal:(g:GoalItem)=>void;
  activeGoal:string|null; onBackFromDetail:()=>void;
  onUpdateGoal:(g:GoalItem)=>void; onDeleteGoal:(id:string)=>void;
}) {
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizStep, setWizStep] = useState(0);
  const [wTitle, setWTitle] = useState('');
  const [wType, setWType] = useState<GoalType|null>(null);
  const [wStart, setWStart] = useState('');
  const [wTarget, setWTarget] = useState('');
  const [wUnit, setWUnit] = useState('');
  const [wDeadline, setWDeadline] = useState('');
  const [wOngoing, setWOngoing] = useState(false);
  const [wFreq, setWFreq] = useState<GoalFreq>('daily');
  const [wFreqNum, setWFreqNum] = useState('5');

  function resetWiz() {
    setWizardOpen(false); setWizStep(0);
    setWTitle(''); setWType(null); setWStart(''); setWTarget(''); setWUnit(''); setWDeadline(''); setWOngoing(false); setWFreq('daily'); setWFreqNum('5');
  }

  function handleSave() {
    if (!wTitle.trim() || !wType) return;
    const gtt = GOAL_TYPES.find(t => t.type === wType)!;
    const startNum = parseFloat(wStart) || 0;
    const targetNum = parseFloat(wTarget) || 0;
    const isH = wType === 'habit';
    const streakT = isH ? (parseInt(wTarget) || 30) : 0;
    onAddGoal({
      id: `g-${Date.now()}`, title: wTitle.trim(), type: wType, icon: gtt.icon,
      start_value: startNum, target_value: isH ? streakT : targetNum,
      current_value: startNum, unit: wUnit || gtt.units[0],
      frequency: isH ? wFreq : undefined,
      frequency_target: isH ? (parseInt(wFreqNum) || 7) : undefined,
      deadline: wOngoing ? '' : wDeadline,
      milestones: [], logs: [], streak: 0, best_streak: 0, status: 'active',
    });
    resetWiz();
  }

  const gt = GOAL_TYPES.find(t => t.type === wType);
  const isHabit = wType === 'habit';
  const isProject = wType === 'project';
  const totalSteps = isProject ? 4 : 5;
  const canNext = wizStep === 0 ? !!(wTitle.trim() && wType) :
    wizStep === 1 ? (isHabit ? !!wFreq : !!wStart.trim()) :
    wizStep === 2 ? (isProject ? true : !!wTarget.trim()) :
    wizStep === 3 ? !!(wOngoing || wDeadline.trim()) : true;

  function quickDate(days: number) {
    const d = new Date(Date.now() + days * 86400000);
    const p = (n:number) => String(n).padStart(2,'0');
    setWDeadline(`${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`);
  }

  if (wizardOpen) {
    return (
      <Sheet visible={visible} onClose={resetWiz} title="New Goal">
        <KeyboardAvoidingView style={{ flex:1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={100}>
        <ScrollView style={s.sheetBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow:1 }}>
          <View style={{ flexDirection:'row', gap:6, marginBottom:24 }}>
            {Array.from({ length:totalSteps }).map((_,i) => (
              <View key={i} style={{ flex:1, height:3, borderRadius:2, backgroundColor: i <= wizStep ? '#F0DC80' : 'rgba(10,10,10,0.08)' }} />
            ))}
          </View>

          {wizStep === 0 && (<View>
            <Text style={{ fontFamily:'Poppins_700Bold', fontSize:20, color:'#0A0A0A', marginBottom:6 }}>{"What\u2019s the goal?"}</Text>
            <Text style={{ fontFamily:'Poppins_400Regular', fontSize:14, color:'rgba(10,10,10,0.4)', marginBottom:20 }}>Give it a clear, measurable title.</Text>
            <TextInput style={{ fontFamily:'Poppins_600SemiBold', fontSize:18, color:'#0A0A0A', borderBottomWidth:2, borderBottomColor:'#F0DC80', paddingBottom:10, marginBottom:28 }}
              value={wTitle} onChangeText={setWTitle} placeholder="e.g. Run Noosa 10km" placeholderTextColor="rgba(10,10,10,0.2)" autoFocus />
            <Text style={{ fontFamily:'Poppins_700Bold', fontSize:16, color:'#0A0A0A', marginBottom:12 }}>What type?</Text>
            <View style={{ flexDirection:'row', flexWrap:'wrap', gap:10 }}>
              {GOAL_TYPES.map(t => (
                <TouchableOpacity key={t.type} onPress={() => { setWType(t.type); setWUnit(t.units[0]); }} activeOpacity={0.7}
                  style={{ paddingVertical:10, paddingHorizontal:16, borderRadius:14, borderWidth:2,
                    borderColor: wType===t.type ? '#F0DC80' : 'rgba(10,10,10,0.08)',
                    backgroundColor: wType===t.type ? 'rgba(240,220,128,0.15)' : '#fff' }}>
                  <Text style={{ fontSize:20, textAlign:'center', marginBottom:4 }}>{t.icon}</Text>
                  <Text style={{ fontFamily:'Poppins_600SemiBold', fontSize:12, color: wType===t.type ? '#6B5A00' : 'rgba(10,10,10,0.5)', textAlign:'center' }}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>)}

          {wizStep === 1 && (<View>
            <Text style={{ fontFamily:'Poppins_700Bold', fontSize:20, color:'#0A0A0A', marginBottom:6 }}>{gt?.startQ ?? 'Starting point'}</Text>
            <Text style={{ fontFamily:'Poppins_400Regular', fontSize:14, color:'rgba(10,10,10,0.4)', marginBottom:20 }}>This is where you are right now.</Text>
            {isHabit ? (<>
              <Text style={{ fontFamily:'Poppins_600SemiBold', fontSize:15, color:'#0A0A0A', marginBottom:12 }}>How often?</Text>
              <View style={{ gap:8 }}>
                {HABIT_FREQS.map(f => (
                  <TouchableOpacity key={f.key} onPress={() => setWFreq(f.key)} activeOpacity={0.7}
                    style={{ paddingVertical:14, paddingHorizontal:16, borderRadius:14, borderWidth:2,
                      borderColor: wFreq===f.key ? '#F0DC80' : 'rgba(10,10,10,0.08)',
                      backgroundColor: wFreq===f.key ? 'rgba(240,220,128,0.15)' : '#fff' }}>
                    <Text style={{ fontFamily:'Poppins_600SemiBold', fontSize:15, color: wFreq===f.key ? '#6B5A00' : 'rgba(10,10,10,0.5)' }}>{f.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {wFreq === 'x_per_week' && (
                <View style={{ flexDirection:'row', alignItems:'center', gap:10, marginTop:14 }}>
                  <TextInput style={{ fontFamily:'Poppins_700Bold', fontSize:24, color:'#0A0A0A', width:50, textAlign:'center', borderBottomWidth:2, borderBottomColor:'#F0DC80', paddingBottom:4 }}
                    value={wFreqNum} onChangeText={setWFreqNum} keyboardType="numeric" />
                  <Text style={{ fontFamily:'Poppins_500Medium', fontSize:15, color:'rgba(10,10,10,0.4)' }}>times per week</Text>
                </View>
              )}
            </>) : (<>
              <TextInput style={{ fontFamily:'Poppins_800ExtraBold', fontSize:36, color:'#0A0A0A', textAlign:'center' }}
                value={wStart} onChangeText={setWStart} placeholder="0" placeholderTextColor="rgba(10,10,10,0.12)" keyboardType="numeric" autoFocus />
              <View style={{ flexDirection:'row', flexWrap:'wrap', gap:8, justifyContent:'center', marginTop:14 }}>
                {(gt?.units ?? []).map(u => (
                  <TouchableOpacity key={u} onPress={() => setWUnit(u)} activeOpacity={0.7}
                    style={{ paddingVertical:8, paddingHorizontal:16, borderRadius:20, borderWidth:1.5,
                      borderColor: wUnit===u ? '#F0DC80' : 'rgba(10,10,10,0.1)',
                      backgroundColor: wUnit===u ? 'rgba(240,220,128,0.15)' : '#fff' }}>
                    <Text style={{ fontFamily:'Poppins_600SemiBold', fontSize:14, color: wUnit===u ? '#6B5A00' : 'rgba(10,10,10,0.45)' }}>{u}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>)}
          </View>)}

          {wizStep === 2 && !isProject && (<View>
            <Text style={{ fontFamily:'Poppins_700Bold', fontSize:20, color:'#0A0A0A', marginBottom:6 }}>{gt?.targetQ ?? "What\u2019s the target?"}</Text>
            <Text style={{ fontFamily:'Poppins_400Regular', fontSize:14, color:'rgba(10,10,10,0.4)', marginBottom:20 }}>The finish line.</Text>
            {isHabit ? (
              <View style={{ flexDirection:'row', flexWrap:'wrap', gap:10, justifyContent:'center' }}>
                {STREAK_GOALS.map(n => (
                  <TouchableOpacity key={n} onPress={() => setWTarget(String(n))} activeOpacity={0.7}
                    style={{ paddingVertical:14, paddingHorizontal:22, borderRadius:14, borderWidth:2,
                      borderColor: wTarget===String(n) ? '#F0DC80' : 'rgba(10,10,10,0.08)',
                      backgroundColor: wTarget===String(n) ? 'rgba(240,220,128,0.15)' : '#fff' }}>
                    <Text style={{ fontFamily:'Poppins_800ExtraBold', fontSize:22, color: wTarget===String(n) ? '#6B5A00' : '#0A0A0A', textAlign:'center' }}>{n}</Text>
                    <Text style={{ fontFamily:'Poppins_400Regular', fontSize:12, color:'rgba(10,10,10,0.35)', textAlign:'center' }}>days</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (<>
              <TextInput style={{ fontFamily:'Poppins_800ExtraBold', fontSize:36, color:'#0A0A0A', textAlign:'center', marginBottom:8 }}
                value={wTarget} onChangeText={setWTarget} placeholder="0" placeholderTextColor="rgba(10,10,10,0.12)" keyboardType="numeric" autoFocus />
              <Text style={{ fontFamily:'Poppins_500Medium', fontSize:15, color:'rgba(10,10,10,0.35)', textAlign:'center' }}>{wUnit}</Text>
            </>)}
          </View>)}

          {wizStep === (isProject ? 2 : 3) && (<View>
            <Text style={{ fontFamily:'Poppins_700Bold', fontSize:20, color:'#0A0A0A', marginBottom:6 }}>When by?</Text>
            <Text style={{ fontFamily:'Poppins_400Regular', fontSize:14, color:'rgba(10,10,10,0.4)', marginBottom:20 }}>Set a deadline or mark as ongoing.</Text>
            {!wOngoing && (<>
              <View style={{ flexDirection:'row', flexWrap:'wrap', gap:8, marginBottom:16 }}>
                {[{l:'2 weeks',d:14},{l:'1 month',d:30},{l:'3 months',d:90},{l:'6 months',d:180}].map(q => (
                  <TouchableOpacity key={q.l} onPress={() => quickDate(q.d)} activeOpacity={0.7}
                    style={{ paddingVertical:10, paddingHorizontal:16, borderRadius:14, borderWidth:1.5, borderColor:'rgba(10,10,10,0.1)', backgroundColor:'#fff' }}>
                    <Text style={{ fontFamily:'Poppins_600SemiBold', fontSize:13, color:'rgba(10,10,10,0.5)' }}>{q.l}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput style={{ fontFamily:'Poppins_600SemiBold', fontSize:18, color:'#0A0A0A', borderBottomWidth:2, borderBottomColor:'#F0DC80', paddingBottom:10, marginBottom:6 }}
                value={wDeadline} onChangeText={setWDeadline} placeholder="YYYY-MM-DD" placeholderTextColor="rgba(10,10,10,0.2)" />
              {wDeadline.length >= 10 && <Text style={{ fontFamily:'Poppins_400Regular', fontSize:13, color:'rgba(10,10,10,0.35)', marginBottom:10 }}>{fmtDateAU(wDeadline)}</Text>}
            </>)}
            <TouchableOpacity onPress={() => setWOngoing(!wOngoing)} activeOpacity={0.7} style={{ flexDirection:'row', alignItems:'center', gap:10, paddingVertical:12 }}>
              <View style={{ width:24, height:24, borderRadius:12, borderWidth:2, borderColor:wOngoing?'#F0DC80':'rgba(10,10,10,0.15)', backgroundColor:wOngoing?'#F0DC80':'transparent', alignItems:'center', justifyContent:'center' }}>
                {wOngoing && <View style={{ width:10, height:10, borderRadius:5, backgroundColor:'#6B5A00' }} />}
              </View>
              <Text style={{ fontFamily:'Poppins_500Medium', fontSize:15, color:'#0A0A0A' }}>Ongoing (no deadline)</Text>
            </TouchableOpacity>
          </View>)}

          {wizStep === totalSteps - 1 && (<View>
            <Text style={{ fontFamily:'Poppins_700Bold', fontSize:20, color:'#0A0A0A', marginBottom:16 }}>Looking good!</Text>
            <View style={{ backgroundColor:'#fff', borderRadius:16, padding:18, borderWidth:1, borderColor:'rgba(10,10,10,0.06)', gap:12, marginBottom:20 }}>
              <View style={{ flexDirection:'row', alignItems:'center', gap:12 }}>
                <Text style={{ fontSize:28 }}>{gt?.icon}</Text>
                <View style={{ flex:1 }}>
                  <Text style={{ fontFamily:'Poppins_700Bold', fontSize:17, color:'#0A0A0A' }}>{wTitle}</Text>
                  <Text style={{ fontFamily:'Poppins_400Regular', fontSize:13, color:'rgba(10,10,10,0.4)' }}>{gt?.label}</Text>
                </View>
              </View>
              <View style={{ height:1, backgroundColor:'rgba(10,10,10,0.06)' }} />
              {isHabit ? (
                <Text style={{ fontFamily:'Poppins_500Medium', fontSize:14, color:'rgba(10,10,10,0.5)' }}>{HABIT_FREQS.find(f=>f.key===wFreq)?.label} · {wTarget}-day goal</Text>
              ) : (
                <Text style={{ fontFamily:'Poppins_500Medium', fontSize:14, color:'rgba(10,10,10,0.5)' }}>Start: {wStart} {wUnit} · Target: {wTarget} {wUnit}</Text>
              )}
              <Text style={{ fontFamily:'Poppins_400Regular', fontSize:13, color:'rgba(10,10,10,0.4)' }}>{wOngoing ? 'Ongoing' : `Deadline: ${wDeadline.length>=10 ? fmtDateAU(wDeadline) : wDeadline}`}</Text>
            </View>
            <Text style={{ fontFamily:'Poppins_400Regular', fontSize:13, color:'rgba(10,10,10,0.35)', textAlign:'center' }}>You can add milestones and log progress after saving</Text>
          </View>)}

          <View style={{ flexDirection:'row', gap:10, paddingTop:24, paddingBottom:20 }}>
            <TouchableOpacity onPress={() => { if (wizStep > 0) setWizStep(wizStep-1); else resetWiz(); }} activeOpacity={0.7}
              style={{ flex:1, paddingVertical:14, borderRadius:14, borderWidth:1, borderColor:'rgba(10,10,10,0.12)', alignItems:'center' }}>
              <Text style={{ fontFamily:'Poppins_600SemiBold', fontSize:15, color:'rgba(10,10,10,0.4)' }}>{wizStep > 0 ? 'Back' : 'Cancel'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { if (wizStep < totalSteps-1) setWizStep(wizStep+1); else handleSave(); }} activeOpacity={0.7}
              style={{ flex:1, paddingVertical:14, borderRadius:14, backgroundColor:canNext?'#F0DC80':'rgba(10,10,10,0.06)', alignItems:'center' }}>
              <Text style={{ fontFamily:'Poppins_700Bold', fontSize:15, color:canNext?'#6B5A00':'rgba(10,10,10,0.2)' }}>{wizStep < totalSteps-1 ? 'Next' : 'Save Goal'}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
        </KeyboardAvoidingView>
      </Sheet>
    );
  }

  // Active goal for inline detail
  const detailGoal = activeGoal ? goals.find(g => g.id === activeGoal) ?? null : null;

  return (
    <Sheet visible={visible} onClose={() => { if (activeGoal) onBackFromDetail(); else onClose(); }} title={detailGoal ? `${detailGoal.icon}  ${detailGoal.title}` : 'Goals'}>
      {/* Detail view (inline, replaces list) */}
      {detailGoal && (
        <GoalDetailInline goal={detailGoal} onBack={onBackFromDetail} onUpdate={onUpdateGoal} onDelete={onDeleteGoal} />
      )}

      {/* List view */}
      {!detailGoal && (
      <ScrollView style={s.sheetBody} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={[s.goalAddBtn, { marginBottom:16 }]} onPress={() => setWizardOpen(true)} activeOpacity={0.7}>
          <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
            <IcoPlus2 color="#6B5A00" size={18} />
            <Text style={s.goalAddTxt}>Add new goal</Text>
          </View>
        </TouchableOpacity>
        {goals.map(g => {
          const pct = g.target_value > 0 ? Math.round(((g.current_value - g.start_value) / (g.target_value - g.start_value)) * 100) : 0;
          const clamp = Math.max(0, Math.min(100, pct));
          const isH = g.type === 'habit';
          const dl = g.deadline ? fmtDateAU(g.deadline) : 'Ongoing';
          return (
            <TouchableOpacity key={g.id} style={s.goalListItem} activeOpacity={0.80} onPress={() => onGoalTap(g.id)}>
              <Text style={s.goalListIcon}>{g.icon}</Text>
              <View style={{ flex:1 }}>
                <Text style={s.goalListName}>{g.title}</Text>
                <Text style={s.goalListMeta}>{isH ? `${g.streak} day streak · ${dl}` : `${g.current_value} / ${g.target_value} ${g.unit} · ${dl}`}</Text>
                <View style={s.goalListBarWrap}>
                  <View style={[s.goalListBarFill, { width:`${clamp}%` as any }]} />
                </View>
                <Text style={s.goalListBarLabel}>{clamp}% · {g.milestones.filter(m=>m.done).length}/{g.milestones.length} milestones · {g.logs.length} logs</Text>
              </View>
              <Text style={s.goalListPct}>{clamp}%</Text>
            </TouchableOpacity>
          );
        })}
        <View style={{ height:40 }} />
      </ScrollView>
      )}
    </Sheet>
  );
}

// ─── Goal Detail Inline (renders inside GoalsListSheet) ──────────────────────
function GoalDetailInline({ goal, onBack, onUpdate, onDelete }: {
  goal:GoalItem; onBack:()=>void; onUpdate:(g:GoalItem)=>void; onDelete:(id:string)=>void;
}) {
  const gt = GOAL_TYPES.find(t => t.type === goal.type);
  const pct = goal.target_value > 0 ? Math.round(((goal.current_value - goal.start_value) / (goal.target_value - goal.start_value)) * 100) : 0;
  const clampPct = Math.max(0, Math.min(100, pct));
  const doneCount = goal.milestones.filter(m => m.done).length;
  const isHabit = goal.type === 'habit';
  const [showLog, setShowLog] = useState(false);
  const [logValue, setLogValue] = useState('');
  const [logNote, setLogNote] = useState('');
  const [confirmDel, setConfirmDel] = useState(false);

  function toggleMilestone(mId: string) {
    onUpdate({ ...goal, milestones: goal.milestones.map(m => m.id === mId ? { ...m, done:!m.done } : m) });
  }

  function addLog() {
    const val = parseFloat(logValue) || (isHabit ? 1 : 0);
    if (!val && !isHabit) return;
    const newLog: GoalLog = { id:`l-${Date.now()}`, date:new Date().toISOString().slice(0,10), value:val, note:logNote };
    // Fitness/health: log IS the current value (latest). Learning/financial/project: accumulate. Habit: increment.
    const newCurrent = isHabit ? goal.current_value + 1 : (goal.type === 'health' || goal.type === 'fitness') ? val : goal.current_value + val;
    const newStreak = isHabit ? goal.streak + 1 : goal.streak;
    onUpdate({ ...goal, current_value:newCurrent, streak:newStreak, best_streak:Math.max(goal.best_streak, newStreak), logs:[...goal.logs, newLog] });
    setLogValue(''); setLogNote(''); setShowLog(false);
  }

  return (
    <ScrollView style={s.sheetBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      {/* Back button */}
      <TouchableOpacity onPress={onBack} activeOpacity={0.7} style={{ flexDirection:'row', alignItems:'center', gap:6, marginBottom:16 }}>
        <IcoChevLeft size={20} color="rgba(10,10,10,0.4)" />
        <Text style={{ fontFamily:'Poppins_500Medium', fontSize:14, color:'rgba(10,10,10,0.4)' }}>Back to goals</Text>
      </TouchableOpacity>

      {/* Progress card */}
      <View style={{ backgroundColor:'#fff', borderRadius:16, padding:18, marginBottom:16, borderWidth:1, borderColor:'rgba(10,10,10,0.06)' }}>
        <View style={{ flexDirection:'row', alignItems:'flex-end', justifyContent:'space-between', marginBottom:12 }}>
          <View>
            <Text style={{ fontFamily:'Poppins_800ExtraBold', fontSize:36, color:'#0A0A0A', letterSpacing:-1 }}>{clampPct}%</Text>
            <Text style={{ fontFamily:'Poppins_400Regular', fontSize:13, color:'rgba(10,10,10,0.4)' }}>complete</Text>
          </View>
          <View style={{ alignItems:'flex-end' }}>
            {isHabit ? (<>
              <Text style={{ fontFamily:'Poppins_700Bold', fontSize:17, color:'#0A0A0A' }}>{goal.streak} day streak</Text>
              <Text style={{ fontFamily:'Poppins_400Regular', fontSize:12, color:'rgba(10,10,10,0.35)' }}>Best: {goal.best_streak} days</Text>
            </>) : (<>
              <Text style={{ fontFamily:'Poppins_700Bold', fontSize:17, color:'#0A0A0A' }}>{goal.current_value} / {goal.target_value}</Text>
              <Text style={{ fontFamily:'Poppins_400Regular', fontSize:12, color:'rgba(10,10,10,0.35)' }}>{goal.unit}</Text>
            </>)}
          </View>
        </View>
        <View style={{ height:8, borderRadius:4, backgroundColor:'rgba(10,10,10,0.06)', overflow:'hidden' }}>
          <View style={{ height:8, borderRadius:4, backgroundColor:'#FF4545', width:`${clampPct}%` as any }} />
        </View>
        {!isHabit && <Text style={{ fontFamily:'Poppins_400Regular', fontSize:11, color:'rgba(10,10,10,0.3)', marginTop:6 }}>Started at {goal.start_value} {goal.unit}</Text>}
      </View>

      {/* Log button */}
      <TouchableOpacity onPress={() => setShowLog(!showLog)} activeOpacity={0.7}
        style={{ backgroundColor:'#F0DC80', borderRadius:14, paddingVertical:14, alignItems:'center', marginBottom:16 }}>
        <Text style={{ fontFamily:'Poppins_700Bold', fontSize:15, color:'#6B5A00' }}>{isHabit ? 'Check in today' : gt?.logLabel ?? 'Log update'}</Text>
      </TouchableOpacity>

      {/* Log form */}
      {showLog && (
        <View style={{ backgroundColor:'#fff', borderRadius:14, padding:16, borderWidth:1, borderColor:'rgba(10,10,10,0.06)', marginBottom:16 }}>
          {!isHabit && (
            <View style={{ flexDirection:'row', alignItems:'center', gap:10, marginBottom:12 }}>
              <TextInput style={{ flex:1, fontFamily:'Poppins_600SemiBold', fontSize:20, color:'#0A0A0A', borderBottomWidth:2, borderBottomColor:'#F0DC80', paddingBottom:6 }}
                value={logValue} onChangeText={setLogValue} placeholder={goal.type==='health'?'Current weight':'Value'} placeholderTextColor="rgba(10,10,10,0.2)" keyboardType="numeric" autoFocus />
              <Text style={{ fontFamily:'Poppins_500Medium', fontSize:14, color:'rgba(10,10,10,0.35)' }}>{goal.unit}</Text>
            </View>
          )}
          <TextInput style={{ fontFamily:'Poppins_400Regular', fontSize:14, color:'#0A0A0A', marginBottom:12 }}
            value={logNote} onChangeText={setLogNote} placeholder="Note (optional)" placeholderTextColor="rgba(10,10,10,0.2)" />
          <View style={{ flexDirection:'row', gap:10 }}>
            <TouchableOpacity onPress={() => setShowLog(false)} activeOpacity={0.7} style={{ flex:1, paddingVertical:12, borderRadius:12, borderWidth:1, borderColor:'rgba(10,10,10,0.12)', alignItems:'center' }}>
              <Text style={{ fontFamily:'Poppins_600SemiBold', fontSize:14, color:'rgba(10,10,10,0.4)' }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={addLog} activeOpacity={0.7} style={{ flex:1, paddingVertical:12, borderRadius:12, backgroundColor:'#F0DC80', alignItems:'center' }}>
              <Text style={{ fontFamily:'Poppins_700Bold', fontSize:14, color:'#6B5A00' }}>{isHabit ? 'Done!' : 'Save'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Milestones */}
      {goal.milestones.length > 0 && (<>
        <Text style={{ fontFamily:'Poppins_700Bold', fontSize:16, color:'#0A0A0A', marginBottom:12 }}>Milestones ({doneCount}/{goal.milestones.length})</Text>
        {goal.milestones.map(m => (
          <TouchableOpacity key={m.id} onPress={() => toggleMilestone(m.id)} activeOpacity={0.7}
            style={{ flexDirection:'row', alignItems:'center', gap:12, paddingVertical:12, borderBottomWidth:1, borderBottomColor:'rgba(10,10,10,0.06)' }}>
            <View style={{ width:24, height:24, borderRadius:12, borderWidth:2, borderColor:m.done?'#22C55E':'rgba(10,10,10,0.15)', backgroundColor:m.done?'#22C55E':'transparent', alignItems:'center', justifyContent:'center' }}>
              {m.done && <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><Path d="M20 6L9 17l-5-5"/></Svg>}
            </View>
            <View style={{ flex:1 }}>
              <Text style={{ fontFamily:'Poppins_600SemiBold', fontSize:15, color:m.done?'rgba(10,10,10,0.35)':'#0A0A0A', textDecorationLine:m.done?'line-through':'none' as any }}>{m.title}</Text>
              {m.target_value > 0 && <Text style={{ fontFamily:'Poppins_400Regular', fontSize:12, color:'rgba(10,10,10,0.3)', marginTop:2 }}>Target: {m.target_value} {goal.unit}</Text>}
            </View>
          </TouchableOpacity>
        ))}
      </>)}

      {/* Recent logs */}
      {goal.logs.length > 0 && (<>
        <Text style={{ fontFamily:'Poppins_700Bold', fontSize:16, color:'#0A0A0A', marginTop:20, marginBottom:12 }}>Recent activity</Text>
        {goal.logs.slice(-5).reverse().map(l => (
          <View key={l.id} style={{ flexDirection:'row', alignItems:'center', gap:10, paddingVertical:10, borderBottomWidth:1, borderBottomColor:'rgba(10,10,10,0.04)' }}>
            <Text style={{ fontFamily:'Poppins_400Regular', fontSize:12, color:'rgba(10,10,10,0.3)', width:55 }}>{fmtDateAU(l.date).replace(/\s\d{4}$/,'')}</Text>
            <Text style={{ fontFamily:'Poppins_600SemiBold', fontSize:14, color:'#0A0A0A' }}>{isHabit ? 'Done' : `${l.value} ${goal.unit}`}</Text>
            {l.note ? <Text style={{ fontFamily:'Poppins_400Regular', fontSize:12, color:'rgba(10,10,10,0.35)', flex:1 }} numberOfLines={1}>{l.note}</Text> : null}
          </View>
        ))}
      </>)}

      {/* Delete */}
      <TouchableOpacity onPress={() => { if (confirmDel) { onDelete(goal.id); } else setConfirmDel(true); }}
        activeOpacity={0.7} style={{ flexDirection:'row', alignItems:'center', justifyContent:'center', gap:8, paddingVertical:14 }}>
        <IcoTrash size={18} color={confirmDel?'#FF4545':'rgba(10,10,10,0.25)'} />
        <Text style={{ fontFamily:'Poppins_600SemiBold', fontSize:14, color:confirmDel?'#FF4545':'rgba(10,10,10,0.3)' }}>{confirmDel ? 'Tap again to delete' : 'Delete goal'}</Text>
      </TouchableOpacity>
      <View style={{ height:40 }} />
    </ScrollView>
  );
}

// ─── Notes Sheet ──────────────────────────────────────────────────────────────

function NotesSheet({ visible, onClose, notes, tasks, onEdit, onNew, onDelete, onAddTask, onToggleTask, onDeleteTask, editingNote, onEditorClose, onEditorSave, onEditorDelete }: {
  visible: boolean; onClose: () => void;
  notes: NoteItem[]; tasks: { id:string; title:string; due_date:string|null; is_complete:boolean; linked_note_id:string|null; completed_at:string|null }[];
  onEdit: (n: NoteItem) => void; onNew: () => void; onDelete: (id: string) => void;
  onAddTask: (title:string, due?:string) => void; onToggleTask: (id:string) => void; onDeleteTask: (id:string) => void;
  editingNote: NoteItem | null; onEditorClose: () => void;
  onEditorSave: (n: NoteItem) => void; onEditorDelete: (id: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<'notes'|'tasks'>('notes');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string|null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDue, setNewTaskDue] = useState('');
  const [showAddTask, setShowAddTask] = useState(false);

  const today = new Date().toISOString().slice(0,10);
  const todayTasks = tasks.filter(t => !t.is_complete && t.due_date && t.due_date <= today);
  const upcomingTasks = tasks.filter(t => !t.is_complete && (!t.due_date || t.due_date > today));
  const doneTasks = tasks.filter(t => t.is_complete);

  function duePillStyle(due: string|null): { bg:string; color:string; label:string } {
    if (!due) return { bg:'rgba(10,10,10,0.06)', color:'rgba(10,10,10,0.4)', label:'No date' };
    const d = new Date(due+'T00:00:00');
    const diff = Math.ceil((d.getTime() - new Date(today+'T00:00:00').getTime()) / 86400000);
    if (diff < 0) return { bg:'#FEE2E2', color:'#991B1B', label:'Overdue' };
    if (diff === 0) return { bg:'#FEE2E2', color:'#991B1B', label:'Today' };
    if (diff <= 7) return { bg:'#FEF3C7', color:'#92400E', label:'This week' };
    if (diff <= 14) return { bg:'#D1FAE5', color:'#047857', label:'Next week' };
    return { bg:'#D1FAE5', color:'#047857', label:fmtDateAU(due) };
  }

  function handleAddTask() {
    if (!newTaskTitle.trim()) return;
    onAddTask(newTaskTitle.trim(), newTaskDue || undefined);
    setNewTaskTitle(''); setNewTaskDue(''); setShowAddTask(false);
  }

  return (
    <Sheet visible={visible} onClose={() => { if (editingNote) onEditorClose(); else onClose(); }} title="Notes & Tasks">
      {/* ── Editor view (replaces everything when editing a note) ── */}
      {editingNote && (
        <NoteEditorInline note={editingNote} onBack={onEditorClose} onSave={onEditorSave} onDelete={onEditorDelete} />
      )}

      {/* ── Tab bar + content ── */}
      {!editingNote && (<>
        <View style={{ flexDirection:'row', backgroundColor:'rgba(0,0,0,0.05)', borderRadius:14, marginHorizontal:18, marginTop:4, marginBottom:14, padding:4 }}>
          <TouchableOpacity onPress={() => setActiveTab('notes')} activeOpacity={0.7}
            style={{ flex:1, paddingVertical:13, borderRadius:11, alignItems:'center',
              backgroundColor: activeTab==='notes' ? '#fff' : 'transparent',
              ...(activeTab==='notes' ? { shadowColor:'#000', shadowOpacity:0.1, shadowRadius:4, shadowOffset:{width:0,height:1} } : {}) }}>
            <Text style={{ fontFamily:'Poppins_700Bold', fontSize:14, color: activeTab==='notes' ? '#0A0A0A' : 'rgba(10,10,10,0.38)' }}>Notes</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setActiveTab('tasks')} activeOpacity={0.7}
            style={{ flex:1, paddingVertical:13, borderRadius:11, alignItems:'center',
              backgroundColor: activeTab==='tasks' ? '#fff' : 'transparent',
              ...(activeTab==='tasks' ? { shadowColor:'#000', shadowOpacity:0.1, shadowRadius:4, shadowOffset:{width:0,height:1} } : {}) }}>
            <Text style={{ fontFamily:'Poppins_700Bold', fontSize:14, color: activeTab==='tasks' ? '#0A0A0A' : 'rgba(10,10,10,0.38)' }}>Tasks</Text>
          </TouchableOpacity>
        </View>

        {/* ── NOTES TAB ── */}
        {activeTab === 'notes' && (
          <ScrollView style={s.sheetBody} showsVerticalScrollIndicator={false}>
            <TouchableOpacity style={s.noteNewBtn} onPress={onNew} activeOpacity={0.7}>
              <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
                <IcoPlus2 color="#8A3A00" size={18} />
                <Text style={s.noteNewTxt}>New note</Text>
              </View>
            </TouchableOpacity>
            {notes.map((n) => (
              <TouchableOpacity key={n.id} style={s.noteCard} activeOpacity={0.80} onPress={() => { setConfirmDeleteId(null); onEdit(n); }}>
                <Text style={s.noteCardTitle}>{n.title}</Text>
                <Text style={s.noteCardPreview} numberOfLines={2}>{n.preview}</Text>
                <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginTop:10 }}>
                  <Text style={s.noteCardMeta}>Updated {n.updated}</Text>
                  <View style={{ flexDirection:'row', alignItems:'center', gap:12 }}>
                    {n.shared.length > 0 ? (
                      <>
                        <IcoUsers color="rgba(10,10,10,0.3)" size={20} />
                        {n.shared.map(sid => {
                          const m = FAMILY_MEMBERS.find(f => f.id === sid);
                          return m ? <View key={sid} style={{ width:12, height:12, borderRadius:6, backgroundColor:m.color }} /> : null;
                        })}
                      </>
                    ) : (
                      <IcoLock color="rgba(10,10,10,0.22)" size={20} />
                    )}
                    <TouchableOpacity
                      onPress={(e) => { e.stopPropagation(); if (confirmDeleteId === n.id) { onDelete(n.id); setConfirmDeleteId(null); } else setConfirmDeleteId(n.id); }}
                      activeOpacity={0.6} hitSlop={{ top:10, bottom:10, left:10, right:10 }}>
                      <IcoTrash color={confirmDeleteId === n.id ? '#FF4545' : 'rgba(10,10,10,0.18)'} size={20} />
                    </TouchableOpacity>
                  </View>
                </View>
                {confirmDeleteId === n.id && (
                  <Text style={{ fontFamily:'Poppins_500Medium', fontSize:13, color:'#FF4545', marginTop:6 }}>Tap bin again to delete</Text>
                )}
              </TouchableOpacity>
            ))}
            <View style={{ height:40 }} />
          </ScrollView>
        )}

        {/* ── TASKS TAB ── */}
        {activeTab === 'tasks' && (
          <ScrollView style={s.sheetBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* + Add task button (matches + New note style) */}
            {!showAddTask && (
              <TouchableOpacity style={s.noteNewBtn} onPress={() => setShowAddTask(true)} activeOpacity={0.7}>
                <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
                  <IcoPlus2 color="#8A3A00" size={18} />
                  <Text style={s.noteNewTxt}>New task</Text>
                </View>
              </TouchableOpacity>
            )}

            {/* Add task form */}
            {showAddTask && (
              <View style={{ backgroundColor:'#fff', borderRadius:14, padding:16, borderWidth:1, borderColor:'rgba(10,10,10,0.06)', marginBottom:14 }}>
                <TextInput style={{ fontFamily:'Poppins_600SemiBold', fontSize:17, color:'#0A0A0A', borderBottomWidth:2, borderBottomColor:'#FAC8A8', paddingBottom:10, marginBottom:14 }}
                  value={newTaskTitle} onChangeText={setNewTaskTitle} placeholder="What needs doing?" placeholderTextColor="rgba(10,10,10,0.25)" autoFocus />
                <Text style={{ fontFamily:'Poppins_700Bold', fontSize:10, letterSpacing:0.8, textTransform:'uppercase' as any, color:'rgba(10,10,10,0.28)', marginBottom:8 }}>Due date</Text>
                <View style={{ flexDirection:'row', gap:8, marginBottom:16 }}>
                  {[{l:'Today',v:today},{l:'Tomorrow',v:new Date(Date.now()+86400000).toISOString().slice(0,10)},{l:'This week',v:new Date(Date.now()+7*86400000).toISOString().slice(0,10)},{l:'None',v:''}].map(q => (
                    <TouchableOpacity key={q.l} onPress={() => setNewTaskDue(q.v)} activeOpacity={0.7}
                      style={{ paddingVertical:9, paddingHorizontal:14, borderRadius:12,
                        backgroundColor: newTaskDue === q.v ? '#FAC8A8' : 'rgba(10,10,10,0.06)' }}>
                      <Text style={{ fontFamily:'Poppins_600SemiBold', fontSize:13,
                        color: newTaskDue === q.v ? '#3A1000' : 'rgba(10,10,10,0.5)' }}>{q.l}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={{ flexDirection:'row', gap:10 }}>
                  <TouchableOpacity onPress={() => { setShowAddTask(false); setNewTaskTitle(''); setNewTaskDue(''); }} activeOpacity={0.7}
                    style={{ flex:1, paddingVertical:14, borderRadius:14, borderWidth:1, borderColor:'rgba(10,10,10,0.12)', alignItems:'center' }}>
                    <Text style={{ fontFamily:'Poppins_600SemiBold', fontSize:15, color:'rgba(10,10,10,0.4)' }}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleAddTask} activeOpacity={0.7}
                    style={{ flex:1, paddingVertical:14, borderRadius:14, backgroundColor:'#FAC8A8', alignItems:'center' }}>
                    <Text style={{ fontFamily:'Poppins_700Bold', fontSize:15, color:'#3A1000' }}>Save task</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Today & overdue */}
            {todayTasks.length > 0 && (
              <>
                <Text style={{ fontFamily:'Poppins_700Bold', fontSize:10, letterSpacing:1, textTransform:'uppercase' as any, color:'rgba(10,10,10,0.28)', marginBottom:10 }}>Today & overdue</Text>
                {todayTasks.map(t => {
                  const pill = duePillStyle(t.due_date);
                  return (
                    <View key={t.id} style={s.noteCard}>
                      <View style={{ flexDirection:'row', alignItems:'center', gap:12 }}>
                        <TouchableOpacity onPress={() => onToggleTask(t.id)} style={{ width:24, height:24, borderRadius:12, borderWidth:2, borderColor:'rgba(10,10,10,0.2)' }} />
                        <Text style={s.noteCardTitle}>{t.title}</Text>
                      </View>
                      <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginTop:10 }}>
                        <View style={{ backgroundColor:pill.bg, borderRadius:10, paddingVertical:3, paddingHorizontal:10 }}>
                          <Text style={{ fontFamily:'Poppins_700Bold', fontSize:10, color:pill.color }}>{pill.label}</Text>
                        </View>
                        <TouchableOpacity onPress={() => onDeleteTask(t.id)} hitSlop={{top:10,bottom:10,left:10,right:10}}>
                          <IcoTrash color="rgba(10,10,10,0.18)" size={20} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </>
            )}

            {/* Upcoming */}
            {upcomingTasks.length > 0 && (
              <>
                <Text style={{ fontFamily:'Poppins_700Bold', fontSize:10, letterSpacing:1, textTransform:'uppercase' as any, color:'rgba(10,10,10,0.28)', marginTop:14, marginBottom:10 }}>Upcoming</Text>
                {upcomingTasks.map(t => {
                  const pill = duePillStyle(t.due_date);
                  return (
                    <View key={t.id} style={s.noteCard}>
                      <View style={{ flexDirection:'row', alignItems:'center', gap:12 }}>
                        <TouchableOpacity onPress={() => onToggleTask(t.id)} style={{ width:24, height:24, borderRadius:12, borderWidth:2, borderColor:'rgba(10,10,10,0.2)' }} />
                        <Text style={s.noteCardTitle}>{t.title}</Text>
                      </View>
                      <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginTop:10 }}>
                        <View style={{ backgroundColor:pill.bg, borderRadius:10, paddingVertical:3, paddingHorizontal:10 }}>
                          <Text style={{ fontFamily:'Poppins_700Bold', fontSize:10, color:pill.color }}>{pill.label}</Text>
                        </View>
                        <TouchableOpacity onPress={() => onDeleteTask(t.id)} hitSlop={{top:10,bottom:10,left:10,right:10}}>
                          <IcoTrash color="rgba(10,10,10,0.18)" size={20} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </>
            )}

            {/* Done */}
            {doneTasks.length > 0 && (
              <>
                <Text style={{ fontFamily:'Poppins_700Bold', fontSize:10, letterSpacing:1, textTransform:'uppercase' as any, color:'rgba(10,10,10,0.28)', marginTop:14, marginBottom:10 }}>Done</Text>
                {doneTasks.map(t => (
                  <View key={t.id} style={[s.noteCard, { opacity:0.6 }]}>
                    <View style={{ flexDirection:'row', alignItems:'center', gap:12 }}>
                      <TouchableOpacity onPress={() => onToggleTask(t.id)}
                        style={{ width:24, height:24, borderRadius:12, backgroundColor:'#059669', alignItems:'center', justifyContent:'center' }}>
                        <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><Path d="M20 6L9 17l-5-5"/></Svg>
                      </TouchableOpacity>
                      <Text style={[s.noteCardTitle, { color:'rgba(10,10,10,0.35)', textDecorationLine:'line-through' }]}>{t.title}</Text>
                    </View>
                  </View>
                ))}
              </>
            )}

            {tasks.length === 0 && !showAddTask && (
              <View style={{ alignItems:'center', paddingTop:40 }}>
                <Text style={{ fontFamily:'Poppins_500Medium', fontSize:15, color:'rgba(10,10,10,0.2)' }}>No tasks yet</Text>
              </View>
            )}

            <View style={{ height:40 }} />
          </ScrollView>
        )}
      </>)}
    </Sheet>
  );
}

// ─── Note Editor (inline inside sheet — no separate modal) ───────────────────
function NoteEditorInline({ note, onBack, onSave, onDelete }: {
  note: NoteItem; onBack: () => void;
  onSave: (updated: NoteItem) => void; onDelete: (id: string) => void;
}) {
  const isNew = note.id.startsWith('new-');
  const [title, setTitle] = useState(note.title);
  const [text, setText]   = useState(note.text);
  const [shared, setShared] = useState<string[]>(note.shared);
  const [showShare, setShowShare] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  function handleSave() {
    const preview = text.split('\n').filter(Boolean).slice(0, 2).join('. ').slice(0, 80);
    onSave({ ...note, title: title.trim() || 'Untitled', text, preview, updated: 'Just now', shared });
  }

  function toggleMember(id: string) {
    setShared(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  return (
    <View style={{ flex:1 }}>
      {/* Header */}
      <View style={ns.hdr}>
        <TouchableOpacity onPress={() => { handleSave(); }} activeOpacity={0.7} style={ns.backBtn}>
          <IcoChevLeft size={24} />
        </TouchableOpacity>
        <View style={{ flex:1 }} />
        <TouchableOpacity onPress={() => {
          if (text.trim()) {
            Share.share({ message: `${title.trim() || 'Note'}\n\n${text}` });
          }
        }} activeOpacity={0.7} style={ns.sendBtn}>
          <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#8A3A00" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <Line x1="22" y1="2" x2="11" y2="13"/><Path d="M22 2l-7 20-4-9-9-4 20-7z"/>
          </Svg>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => { handleSave(); }} activeOpacity={0.7} style={ns.saveBtn}>
          <Text style={ns.saveTxt}>Done</Text>
        </TouchableOpacity>
      </View>

      {/* Title */}
      <TextInput
        style={ns.titleInput}
        value={title}
        onChangeText={setTitle}
        placeholder="Note title"
        placeholderTextColor="rgba(10,10,10,0.25)"
        autoFocus={isNew}
      />

      {/* Body */}
      <KeyboardAvoidingView style={{ flex:1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={80}>
        <ScrollView style={{ flex:1 }} keyboardShouldPersistTaps="handled">
          <TextInput
            style={ns.bodyInput}
            value={text}
            onChangeText={setText}
            placeholder="Start writing..."
            placeholderTextColor="rgba(10,10,10,0.2)"
            multiline
            textAlignVertical="top"
          />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom bar */}
      <View style={ns.bottomBar}>
        {/* Row: share left, delete right */}
        <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between' }}>
          {/* Share toggle — left */}
          <TouchableOpacity onPress={() => setShowShare(!showShare)} activeOpacity={0.7} style={ns.shareToggle}>
            {shared.length > 0 ? <IcoUsers color="rgba(10,10,10,0.45)" size={22}/> : <IcoLock color="rgba(10,10,10,0.35)" size={22}/>}
            <Text style={ns.shareLbl}>{shared.length > 0 ? `Shared with ${shared.length}` : 'Private · tap to add members'}</Text>
          </TouchableOpacity>

          {/* Delete — right */}
          {!isNew && (
            <TouchableOpacity
              onPress={() => {
                if (confirmDelete) { onDelete(note.id); }
                else setConfirmDelete(true);
              }}
              activeOpacity={0.7} style={ns.deleteRow}>
              <Text style={ns.deleteTxt}>{confirmDelete ? 'Confirm' : 'Delete'}</Text>
              <IcoTrash size={20} color={confirmDelete ? '#FF4545' : 'rgba(10,10,10,0.3)'} />
            </TouchableOpacity>
          )}
        </View>

        {/* Share chips */}
        {showShare && (
          <View style={ns.shareChips}>
            {FAMILY_MEMBERS.map(m => {
              const sel = shared.includes(m.id);
              return (
                <TouchableOpacity key={m.id} onPress={() => toggleMember(m.id)} activeOpacity={0.7}
                  style={[ns.shareChip, sel && { backgroundColor: m.color, borderColor: m.color }]}>
                  <Text style={[ns.shareChipTxt, sel && { color:'#fff' }]}>{m.name}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <View style={{ height: 16 }} />
      </View>
    </View>
  );
}

const ns = StyleSheet.create({
  hdr:        { flexDirection:'row', alignItems:'center', paddingHorizontal:16, paddingVertical:10, borderBottomWidth:1, borderBottomColor:'rgba(10,10,10,0.07)' },
  backBtn:    { width:40, height:40, alignItems:'center', justifyContent:'center' },
  sendBtn:    { width:40, height:40, alignItems:'center', justifyContent:'center' },
  saveBtn:    { paddingHorizontal:16, paddingVertical:8, backgroundColor:'#FAC8A8', borderRadius:12 },
  saveTxt:    { fontFamily:'Poppins_700Bold', fontSize:14, color:'#8A3A00' },
  titleInput: { fontFamily:'Poppins_700Bold', fontSize:24, color:'#0A0A0A', letterSpacing:-0.5, paddingHorizontal:20, paddingTop:20, paddingBottom:8 },
  bodyInput:  { fontFamily:'Poppins_400Regular', fontSize:16, color:'#0A0A0A', lineHeight:26, paddingHorizontal:20, paddingTop:8, minHeight:200 },
  bottomBar:  { borderTopWidth:1, borderTopColor:'rgba(10,10,10,0.07)', paddingHorizontal:20, paddingTop:12, gap:10 },
  shareToggle:{ flexDirection:'row', alignItems:'center', gap:10 },
  shareLbl:   { fontFamily:'Poppins_500Medium', fontSize:14, color:'rgba(10,10,10,0.45)' },
  shareChips: { flexDirection:'row', flexWrap:'wrap', gap:8, paddingTop:4 },
  shareChip:  { paddingVertical:6, paddingHorizontal:14, borderRadius:20, borderWidth:1.5, borderColor:'rgba(10,10,10,0.12)', backgroundColor:'#fff' },
  shareChipTxt:{ fontFamily:'Poppins_600SemiBold', fontSize:12, color:'rgba(10,10,10,0.55)' },
  deleteRow:  { flexDirection:'row', alignItems:'center', gap:8 },
  deleteTxt:  { fontFamily:'Poppins_600SemiBold', fontSize:14, color:'#FF4545' },
});

// ─── Wordle Sheet ─────────────────────────────────────────────────────────────

function WordleSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const tileColor:     Record<string,string> = { g:'#6AAA64', y:'#C9B458', x:'#787C7E', e:'transparent', c:'transparent' };
  const tileBorder:    Record<string,string> = { g:'transparent', y:'transparent', x:'transparent', e:'rgba(10,10,10,0.16)', c:'rgba(10,10,10,0.38)' };
  const tileTextColor: Record<string,string> = { g:'#fff', y:'#fff', x:'#fff', e:'transparent', c:'#0A0A0A' };

  function kbColor(letter: string) {
    if (KB_GREEN.has(letter))  return { bg: '#6AAA64', txt: '#fff' };
    if (KB_YELLOW.has(letter)) return { bg: '#C9B458', txt: '#fff' };
    if (KB_GREY.has(letter))   return { bg: 'rgba(10,10,10,0.22)', txt: 'rgba(10,10,10,0.35)' };
    return { bg: 'rgba(10,10,10,0.10)', txt: '#0A0A0A' };
  }

  return (
    <Sheet visible={visible} onClose={onClose} title="Wordle" subtitle="🔥 12-day streak">
      <ScrollView
        style={s.sheetBody}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ alignItems: 'center', paddingBottom: 40 }}
      >
        {/* Grid */}
        <View style={s.wlGrid}>
          {WORDLE_ROWS.map((row, ri) => (
            <View key={ri} style={s.wlRow}>
              {row.map((cell, ci) => (
                <View key={ci} style={[s.wlTile, { backgroundColor: tileColor[cell.s], borderColor: tileBorder[cell.s] }]}>
                  <Text style={[s.wlTileTxt, { color: tileTextColor[cell.s] }]}>{cell.l}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>

        {/* Keyboard */}
        <View style={s.wlKb}>
          {KB_ROWS.map((row, ri) => (
            <View key={ri} style={s.wlKbRow}>
              {row.map((k, ki) => {
                const col = kbColor(k);
                const isWide = k === '↵' || k === '⌫';
                return (
                  <TouchableOpacity
                    key={ki}
                    style={[s.wlKey, isWide && s.wlKeyWide, { backgroundColor: col.bg }]}
                    activeOpacity={0.70}
                  >
                    <Text style={[s.wlKeyTxt, { color: col.txt }]}>{k}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>
    </Sheet>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: '#FAF8F5' },
  scroll:  { flex: 1 },
  content: { paddingHorizontal: 14, paddingTop: 14, gap: 10, paddingBottom: 130 },

  // Header
  hdr:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 10, paddingTop: 4, borderBottomWidth: 1, borderBottomColor: 'rgba(10,10,10,0.08)' },
  logo:      { fontFamily: 'Poppins_800ExtraBold', fontSize: 40, color: '#0A0A0A', letterSpacing: -1.5, lineHeight: 46 },
  logoAi:    { color: '#A8D8F0' },
  pageLabel: { fontFamily: 'Poppins_700Bold', fontSize: 18, color: 'rgba(10,10,10,0.32)' },

  // Brief card (dark slate)
  briefCard:    { borderRadius:20, backgroundColor:'#A8D8F0', padding:16, paddingHorizontal:18, marginBottom:2 },
  briefLabel:   { fontFamily:'Poppins_700Bold', fontSize:13, letterSpacing:1, textTransform:'uppercase' as any, color:'rgba(0,60,100,0.45)', marginBottom:9 },
  briefMsg:     { fontFamily:'Poppins_500Medium', fontSize:17, color:'#0A2A40', lineHeight:26, marginBottom:14 },
  briefDivider: { height:1, backgroundColor:'rgba(0,60,100,0.12)', marginBottom:12 },
  briefQuote:   { fontFamily:'DMSerifDisplay_400Regular', fontSize:18, color:'rgba(0,40,70,0.5)', lineHeight:26, marginBottom:6, fontStyle:'italic' as any },
  briefAuthor:  { fontFamily:'Poppins_600SemiBold', fontSize:11, letterSpacing:0.8, textTransform:'uppercase' as any, color:'rgba(0,40,70,0.3)' },

  // 6-card grid
  grid2:        { flexDirection:'row' as any, flexWrap:'wrap' as any, gap:8, marginBottom:2 },
  gridCard:     { width:(W - 28 - 8) / 2, minHeight:120, borderRadius:16, padding:14 },
  gridLabel:    { fontFamily:'Poppins_700Bold', fontSize:13, letterSpacing:0.9, textTransform:'uppercase' as any, color:'rgba(255,255,255,0.35)', marginBottom:6 },
  gridNum:      { fontFamily:'Poppins_800ExtraBold', fontSize:30, letterSpacing:-0.8, lineHeight:34 },
  gridHl:       { fontFamily:'Poppins_700Bold', fontSize:15, letterSpacing:-0.3, lineHeight:20 },
  gridSub:      { fontFamily:'Poppins_500Medium', fontSize:13, marginTop:5 },
  gridBar:      { height:4, borderRadius:2, backgroundColor:'rgba(255,255,255,0.15)', marginTop:8, overflow:'hidden' as any },
  gridBarFill:  { height:4, borderRadius:2 },

  // Card base
  card:      { borderRadius: 22, padding: 22, overflow: 'hidden', position: 'relative' },
  cardSlate: { backgroundColor: '#3A3D4A' },
  cardGold:  { backgroundColor: '#F0DC80' },
  cardSage:  { backgroundColor: '#E8F4E8' },
  cardPeach: { backgroundColor: '#FAC8A8' },
  cardLav:   { backgroundColor: '#D8CCFF' },

  // Headlines
  headlineLt: { fontFamily: 'Poppins_700Bold', fontSize: 24, letterSpacing: -0.5, lineHeight: 30, color: '#fff' },
  headlineDk: { fontFamily: 'Poppins_700Bold', fontSize: 24, letterSpacing: -0.5, lineHeight: 30, color: '#1A1A1A' },

  // Labels & hints
  cardLabel:   { fontFamily: 'Poppins_700Bold', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.8, color: 'rgba(107,53,217,0.45)', marginBottom: 6 },
  cardLabelLt: { fontFamily: 'Poppins_700Bold', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.8, color: 'rgba(255,255,255,0.35)', marginBottom: 6 },
  tapHintDk:   { fontFamily: 'Poppins_500Medium', fontSize: 13, color: 'rgba(0,0,0,0.22)', marginTop: 10 },
  tapHintLt:   { fontFamily: 'Poppins_500Medium', fontSize: 13, color: 'rgba(255,255,255,0.40)', marginTop: 10 },
  tapHintWotd: { fontFamily: 'Poppins_500Medium', fontSize: 15, color: 'rgba(107,53,217,0.45)', marginTop: 4 },
  tapHintLav:  { fontFamily: 'Poppins_500Medium', fontSize: 15, color: 'rgba(255,255,255,0.55)', marginTop: 10 },

  row:     { flexDirection: 'row', alignItems: 'flex-start' },
  divider: { height: 1, marginVertical: 12, backgroundColor: 'rgba(255,255,255,0.15)' },

  // Ghost
  ghost: { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 88, color: 'rgba(255,255,255,0.07)', position: 'absolute', right: -8, top: -18, lineHeight: 96 },

  // Health
  healthPct: { fontFamily: 'Poppins_800ExtraBold', fontSize: 24, color: '#A8D8F0', marginLeft: 8, marginTop: 2, flexShrink: 0 },
  barWrap:   { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 6, height: 7, overflow: 'hidden', marginTop: 12, marginBottom: 4 },
  barFill:   { height: '100%', borderRadius: 6, backgroundColor: '#A8D8F0' },
  barFoot:   { fontFamily: 'Poppins_500Medium', fontSize: 13, color: 'rgba(255,255,255,0.28)', textAlign: 'right' },
  hstatRow:  { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  hstatIcon: { fontSize: 18, width: 24, textAlign: 'center' },
  hstatLabel:{ flex: 1 },
  hstatName: { fontFamily: 'Poppins_600SemiBold', fontSize: 17, color: 'rgba(255,255,255,0.90)' },
  hstatMeta: { fontFamily: 'Poppins_400Regular',  fontSize: 13, color: 'rgba(255,255,255,0.40)' },
  hstatVal:  { fontFamily: 'Poppins_700Bold', fontSize: 17, color: '#fff', flexShrink: 0 },
  hstatUnit: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: 'rgba(255,255,255,0.40)' },
  workout:   { backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 12, padding: 12, marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 10 },
  woIcon:    { fontSize: 20, flexShrink: 0 },
  woName:    { fontFamily: 'Poppins_700Bold', fontSize: 17, color: '#fff' },
  woMeta:    { fontFamily: 'Poppins_400Regular', fontSize: 13, color: 'rgba(255,255,255,0.40)', marginTop: 2 },
  woStats:   { flexDirection: 'row', gap: 8, marginTop: 4 },
  woStat:    { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: 'rgba(168,216,240,0.85)' },

  // Goals card
  goalRow:    { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  goalIcon:   { fontSize: 18, width: 24, textAlign: 'center', flexShrink: 0 },
  goalBody:   { flex: 1 },
  goalName:   { fontFamily: 'Poppins_600SemiBold', fontSize: 17, color: '#0A0A0A' },
  goalMeta:   { fontFamily: 'Poppins_400Regular',  fontSize: 13, color: 'rgba(10,10,10,0.42)' },
  goalBarWrap:{ height: 3, borderRadius: 2, backgroundColor: 'rgba(10,10,10,0.10)', marginTop: 5, overflow: 'hidden' },
  goalBarFill:{ height: '100%', borderRadius: 2, backgroundColor: '#FF4545' },
  goalPct:    { fontFamily: 'Poppins_700Bold', fontSize: 17, color: '#FF4545', flexShrink: 0 },
  addGoalBtn: { marginTop: 14, backgroundColor: 'rgba(0,0,0,0.08)', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  addGoalTxt: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: 'rgba(10,10,10,0.55)' },

  // Goals list sheet
  goalAddBtn:      { backgroundColor:'rgba(240,220,128,0.2)', borderWidth:1, borderStyle:'dashed' as any, borderColor:'rgba(107,90,0,0.25)', borderRadius:14, paddingVertical:16, alignItems:'center' as any, marginBottom:16 },
  goalAddTxt:      { fontFamily:'Poppins_600SemiBold', fontSize:15, color:'#6B5A00' },
  goalListItem:    { flexDirection:'row' as any, alignItems:'flex-start' as any, gap:12, paddingVertical:14, borderBottomWidth:1, borderBottomColor:'rgba(10,10,10,0.06)' },
  goalListIcon:    { fontSize:22, width:28, textAlign:'center' as any, flexShrink:0, marginTop:2 },
  goalListName:    { fontFamily:'Poppins_600SemiBold', fontSize:17, color:'#0A0A0A' },
  goalListMeta:    { fontFamily:'Poppins_400Regular', fontSize:13, color:'rgba(10,10,10,0.42)', marginTop:2 },
  goalListBarWrap: { height:5, borderRadius:3, backgroundColor:'rgba(10,10,10,0.08)', marginTop:8, overflow:'hidden' as any },
  goalListBarFill: { height:5, borderRadius:3, backgroundColor:'#FF4545' },
  goalListBarLabel:{ fontFamily:'Poppins_400Regular', fontSize:11, color:'rgba(10,10,10,0.35)' },
  goalListPct:     { fontFamily:'Poppins_700Bold', fontSize:17, color:'#FF4545', flexShrink:0, marginTop:2 },
  goalCta:         { backgroundColor:'#F0DC80', borderRadius:14, paddingVertical:16, alignItems:'center' as any, marginTop:20, marginBottom:12 },
  goalCtaTxt:      { fontFamily:'Poppins_700Bold', fontSize:15, color:'#6B5A00' },

  // WotD
  wotdWord:    { fontFamily: 'Poppins_700Bold', fontSize: 26, color: '#6B35D9', fontStyle: 'italic', letterSpacing: -0.5, lineHeight: 32 },
  wotdDef:     { fontFamily: 'Poppins_400Regular', fontSize: 16, color: 'rgba(10,10,10,0.55)', lineHeight: 22 },
  wotdEg:      { fontFamily: 'Poppins_400Regular', fontSize: 16, color: 'rgba(10,10,10,0.38)', fontStyle: 'italic', lineHeight: 22, marginTop: 6 },
  wotdPlay:    { flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start', marginTop: 12, backgroundColor: 'rgba(107,53,217,0.10)', paddingHorizontal: 13, paddingVertical: 8, borderRadius: 10 },
  wotdPlayTxt: { fontFamily: 'Poppins_700Bold', fontSize: 14, color: '#6B35D9' },

  // NASA
  nasaImg:    { width: '100%', height: 130, backgroundColor: '#0D0D22', alignItems: 'center', justifyContent: 'center' },
  nasaImgTxt: { fontSize: 48, color: 'rgba(168,216,240,0.45)' },
  nasaDesc:   { fontFamily: 'Poppins_400Regular', fontSize: 16, color: 'rgba(255,255,255,0.55)', lineHeight: 22, marginTop: 4 },
  nasaLink:   { fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: '#A8D8F0', marginTop: 10 },

  // Zen
  zenTrack:    { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  zenBtn:      { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(10,10,10,0.10)', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  zenBtnOn:    { backgroundColor: 'rgba(10,10,10,0.70)' },
  zenName:     { fontFamily: 'Poppins_600SemiBold', fontSize: 17, color: '#0A0A0A' },
  zenDur:      { fontFamily: 'Poppins_400Regular',  fontSize: 13, color: 'rgba(10,10,10,0.42)' },
  zenProg:     { width: 56, height: 3, backgroundColor: 'rgba(10,10,10,0.12)', borderRadius: 2, overflow: 'hidden', flexShrink: 0 },
  zenProgFill: { height: '100%', backgroundColor: 'rgba(10,10,10,0.55)', borderRadius: 2 },

  // ── Sheet base — true 92% height, matches platform standard ──
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.42)',
    justifyContent: 'flex-end',
  },
  sheetWrap: {
    backgroundColor: '#FAF8F5',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: H * 0.92,
  },
  sheetHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(10,10,10,0.14)',
    alignSelf: 'center', marginTop: 12, marginBottom: 4,
  },
  sheetHdr: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: 'rgba(10,10,10,0.07)',
  },
  sheetTitle:    { fontFamily: 'Poppins_700Bold', fontSize: 22, color: '#0A0A0A', letterSpacing: -0.3 },
  sheetSubtitle: { fontFamily: 'Poppins_500Medium', fontSize: 13, color: 'rgba(10,10,10,0.42)', marginTop: 2 },
  sheetClose:    { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(10,10,10,0.07)', alignItems: 'center', justifyContent: 'center' },
  sheetCloseTxt: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: 'rgba(10,10,10,0.45)' },
  sheetBody:     { paddingHorizontal: 20, paddingTop: 16, flex: 1 },

  // Goal detail sheet
  goalSheetBarWrap:  { height: 6, borderRadius: 3, backgroundColor: 'rgba(10,10,10,0.08)', overflow: 'hidden', marginBottom: 8, marginTop: 4 },
  goalSheetBarFill:  { height: '100%', borderRadius: 3, backgroundColor: '#FF4545' },
  goalSheetPctLabel: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: 'rgba(10,10,10,0.40)' },
  goalSheetPct:      { fontFamily: 'Poppins_700Bold', fontSize: 17, color: '#FF4545' },
  goalSheetDetail:   { fontFamily: 'Poppins_400Regular', fontSize: 16, color: 'rgba(10,10,10,0.55)', lineHeight: 23, marginBottom: 20 },
  zaeliBox:          { backgroundColor: 'rgba(10,10,10,0.04)', borderRadius: 14, padding: 16, marginBottom: 14 },
  zaeliBoxLbl:       { fontFamily: 'Poppins_700Bold', fontSize: 10, letterSpacing: 0.8, textTransform: 'uppercase', color: 'rgba(10,10,10,0.28)', marginBottom: 6 },
  zaeliBoxTxt:       { fontFamily: 'Poppins_400Regular', fontSize: 15, color: '#0A0A0A', lineHeight: 22 },
  zaeliCta:          { backgroundColor: '#F0DC80', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: 12 },
  zaeliCtaTxt:       { fontFamily: 'Poppins_700Bold', fontSize: 15, color: '#6B5A00' },

  // New goal sheet
  newGoalHint: { fontFamily: 'Poppins_400Regular', fontSize: 16, color: 'rgba(10,10,10,0.50)', lineHeight: 23, marginBottom: 24 },

  // Notes sheet
  noteNewBtn:      { backgroundColor: 'rgba(250,200,168,0.15)', borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(138,58,0,0.25)', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: 14 },
  noteNewTxt:      { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: '#8A3A00' },
  noteCard:        { backgroundColor: '#fff', borderWidth: 1, borderColor: 'rgba(10,10,10,0.07)', borderRadius: 14, padding: 16, marginBottom: 10 },
  noteCardTitle:   { fontFamily: 'Poppins_600SemiBold', fontSize: 17, color: '#0A0A0A', marginBottom: 4 },
  noteCardPreview: { fontFamily: 'Poppins_400Regular',  fontSize: 14, color: 'rgba(10,10,10,0.45)', lineHeight: 20 },
  noteCardMeta:    { fontFamily: 'Poppins_400Regular',  fontSize: 12, color: 'rgba(10,10,10,0.28)', marginTop: 6 },

  // Wordle sheet
  wlGrid:    { marginTop: 8, gap: 5 },
  wlRow:     { flexDirection: 'row', gap: 5 },
  wlTile:    { width: 52, height: 52, borderRadius: 8, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  wlTileTxt: { fontFamily: 'Poppins_800ExtraBold', fontSize: 20, letterSpacing: 1 },
  wlKb:      { marginTop: 20, gap: 6, width: '100%', paddingHorizontal: 4 },
  wlKbRow:   { flexDirection: 'row', justifyContent: 'center', gap: 5 },
  wlKey:     { minWidth: 30, height: 42, borderRadius: 7, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center', flex: 1, maxWidth: 38 },
  wlKeyWide: { maxWidth: 54, minWidth: 44 },
  wlKeyTxt:  { fontFamily: 'Poppins_700Bold', fontSize: 13 },
});
