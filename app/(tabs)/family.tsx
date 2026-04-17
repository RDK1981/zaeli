/**
 * family.tsx — Our Family
 * app/(tabs)/family.tsx
 *
 * Dedicated screen accessed via router.navigate('/(tabs)/family')
 * Background: #F0C8C0 (peach)
 * Sub-views managed internally: home | child-detail | pending | profiles
 *
 * Dummy data for now — Supabase integration later
 */

import React, { useState, useCallback, useRef } from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal,
  Dimensions, StatusBar as RNStatusBar, TextInput, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import Svg, { Polyline, Path } from 'react-native-svg';
import { supabase } from '../../lib/supabase';
import { generateSubjectSummary, generateSessionSummary } from '../../lib/tutor-summaries';

const FAMILY_ID = '00000000-0000-0000-0000-000000000001';

const { width: W } = Dimensions.get('window');

// ── Palette ──────────────────────────────────────────────────────────────────
const FAM_BG     = '#F0C8C0';
const FAM_ACCENT = '#D8CCFF';   // wordmark a+i colour in Our Family
const INK        = '#0A0A0A';
const INK2       = 'rgba(0,0,0,0.50)';
const INK3       = 'rgba(0,0,0,0.32)';
const INK4       = 'rgba(0,0,0,0.40)';
const CARD       = '#FFFFFF';
const HUB_GREEN  = '#A8E8CC';
const HUB_DARK   = '#0A4030';
const TUTOR_PURPLE = '#5020C0';
const TUTOR_BG   = '#D8CCFF';
const RED_ACCENT = '#A01830';

// Family members — matches CLAUDE.md
const FAMILY = {
  Rich:  { initial: 'R', colour: '#4D8BFF', role: 'parent', email: 'rich@email.com', dob: '1981', loginStatus: 'full' },
  Anna:  { initial: 'A', colour: '#FF7B6B', role: 'parent', email: 'anna@email.com', dob: '1984', loginStatus: 'full' },
  Poppy: { initial: 'P', colour: '#A855F7', role: 'child', year: 6, age: 12, dob: '3 Apr 2014', loginStatus: 'own', tutorActive: true },
  Gab:   { initial: 'G', colour: '#22C55E', role: 'child', year: 4, age: 10, dob: '14 Jun 2015', loginStatus: 'invite', tutorActive: false },
  Duke:  { initial: 'D', colour: '#F59E0B', role: 'child', year: 1, age: 8, dob: '22 Sep 2016', loginStatus: 'parent-device', tutorActive: true },
};

type ChildName = 'Poppy' | 'Gab' | 'Duke';

const KIDS: { name: ChildName; streak: number; points: number; jobsDone: number; jobsTotal: number; sessions: number; mathsBand: string; }[] = [
  { name: 'Poppy', streak: 12, points: 400, jobsDone: 4, jobsTotal: 4, sessions: 14, mathsBand: '\u2191 Ext' },
  { name: 'Gab',   streak: 6,  points: 235, jobsDone: 3, jobsTotal: 4, sessions: 0,  mathsBand: '' },
  { name: 'Duke',  streak: 3,  points: 100, jobsDone: 3, jobsTotal: 3, sessions: 5,  mathsBand: 'Core' },
];

const PENDING_ACTIONS = [
  { id: '1', child: 'Gab' as ChildName, type: 'job' as const, title: 'Gab washed the car \u{1F697}', sub: 'Suggests 50 pts \u00B7 "Did the whole thing!"', points: 50 },
  { id: '2', child: 'Poppy' as ChildName, type: 'reward' as const, title: 'Sleepover party \u{1F389}', sub: '400 pts \u00B7 Poppy has 400 pts', points: 400 },
];

// Child detail data
const CHILD_DETAIL: Record<ChildName, { subjects: { name: string; band: string; bandColour: string; bandBg: string; pct: number; barColour: string; note: string }[]; recentSessions: { title: string; meta: string; dotColour: string }[]; jobs: { icon: string; name: string; done: boolean }[] }> = {
  Poppy: {
    subjects: [
      { name: 'Maths', band: '\u2191 Extension', bandColour: '#92400E', bandBg: 'rgba(253,230,138,0.25)', pct: 88, barColour: '#A855F7', note: 'Fractions at Year 7 level. 1 hint across last 6 questions.' },
      { name: 'English', band: 'Core', bandColour: '#0A6040', bandBg: 'rgba(168,232,204,0.2)', pct: 58, barColour: '#5020C0', note: 'Comprehension strong. Persuasive writing structure still developing.' },
      { name: 'Science', band: 'Core', bandColour: '#0A6040', bandBg: 'rgba(168,232,204,0.2)', pct: 42, barColour: '#22C55E', note: '2 sessions this month. Body systems needs more work.' },
    ],
    recentSessions: [
      { title: 'Fractions \u2014 dividing by whole numbers', meta: 'Today \u00B7 Maths \u00B7 18 min', dotColour: '#A855F7' },
      { title: "Charlotte's Web \u2014 comprehension", meta: 'Yesterday \u00B7 English \u00B7 24 min', dotColour: '#5020C0' },
    ],
    jobs: [
      { icon: '\u{1F373}', name: 'Cook dinner Tuesday', done: true },
      { icon: '\u{1F415}', name: 'Walk the dog', done: true },
      { icon: '\u{1F9F9}', name: 'Vacuum lounge', done: true },
    ],
  },
  Gab: {
    subjects: [],
    recentSessions: [],
    jobs: [
      { icon: '\u{1F37D}\uFE0F', name: 'Set the table', done: true },
      { icon: '\u{1F6BF}', name: 'Shower before 8pm', done: true },
      { icon: '\u{1F9FA}', name: 'Put washing away', done: false },
    ],
  },
  Duke: {
    subjects: [
      { name: 'Reading', band: 'Core', bandColour: '#0A6040', bandBg: 'rgba(168,232,204,0.2)', pct: 55, barColour: '#F59E0B', note: 'Building confidence with sight words.' },
    ],
    recentSessions: [
      { title: 'Sight words \u2014 Level 3', meta: 'Yesterday \u00B7 Reading \u00B7 12 min', dotColour: '#F59E0B' },
    ],
    jobs: [
      { icon: '\u{1F6CF}\uFE0F', name: 'Make my bed', done: true },
      { icon: '\u{1F415}', name: 'Feed the dog', done: true },
      { icon: '\u{1F9E6}', name: 'Pack school bag', done: true },
    ],
  },
};

// ── SVG Icons ────────────────────────────────────────────────────────────────
function IcoBack({ color = INK, size = 14 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={2.5} strokeLinecap="round">
      <Polyline points="15 18 9 12 15 6" />
    </Svg>
  );
}

function IcoCheck({ color = HUB_DARK, size = 8 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={3} strokeLinecap="round">
      <Polyline points="20 6 9 17 4 12" />
    </Svg>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────
function localDateStr(d?: Date): string {
  const dt = d || new Date();
  return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
}

export default function OurFamilyScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'home' | 'jobs' | 'family'>('home');
  const [selectedChild, setSelectedChild] = useState<ChildName>('Poppy');
  const [dbPending, setDbPending] = useState<any[]>([]);
  const [dbPoints, setDbPoints] = useState<Record<string, number>>({});
  const [dbJobs, setDbJobs] = useState<any[]>([]);
  const [dbRewards, setDbRewards] = useState<any[]>([]);
  const [dbStreaks, setDbStreaks] = useState<Record<string, number>>({});
  const [dbJobCounts, setDbJobCounts] = useState<Record<string, { done: number; total: number }>>({});
  // Tutor data — live from Supabase
  const [dbTutorSessions, setDbTutorSessions] = useState<Record<string, any[]>>({});
  const [dbTutorProgress, setDbTutorProgress] = useState<Record<string, any[]>>({});
  const [dbTutorMessages, setDbTutorMessages] = useState<Record<string, any[]>>({});
  // Parent tutor views inside child detail
  const [childDetailView, setChildDetailView] = useState<'overview' | 'progress' | 'session-review'>('overview');
  const [reviewSessionId, setReviewSessionId] = useState<string | null>(null);
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);
  const [subjectSummaries, setSubjectSummaries] = useState<Record<string, string>>({});
  const [loadingSummary, setLoadingSummary] = useState<string | null>(null);
  const [sessionSummaries, setSessionSummaries] = useState<Record<string, string>>({});
  // Management forms
  const [showAddJob, setShowAddJob] = useState(false);
  const [showAddReward, setShowAddReward] = useState(false);
  const jobsScrollRef = useRef<ScrollView>(null);
  const [addTitle, setAddTitle] = useState('');
  const [addEmoji, setAddEmoji] = useState('');
  const [addPoints, setAddPoints] = useState(10);
  const [addType, setAddType] = useState<'daily'|'weekly'|'oneoff'>('oneoff');
  const [addSelectedKids, setAddSelectedKids] = useState<ChildName[]>([]);
  // Profile view
  const [editingMember, setEditingMember] = useState<string | null>(null);
  const [familyView, setFamilyView] = useState<'list' | 'profile' | 'add'>('list');
  const [profileMember, setProfileMember] = useState<string | null>(null);
  // Add member form
  const [newName, setNewName] = useState('');
  const [newNickname, setNewNickname] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newDob, setNewDob] = useState('');
  const [newYear, setNewYear] = useState('');
  const [newColour, setNewColour] = useState('#EC4899');
  const [newAccess, setNewAccess] = useState<'full' | 'dedicated' | 'shared' | 'view'>('shared');
  const [newEmail, setNewEmail] = useState('');
  const COLOUR_OPTIONS = ['#4D8BFF','#FF7B6B','#A855F7','#22C55E','#F59E0B','#EC4899','#6366F1','#06B6D4','#EF4444','#8B5CF6'];

  useFocusEffect(useCallback(() => {
    RNStatusBar.setBarStyle('dark-content', true);
    loadFamilyData();
  }, []));

  async function loadFamilyData() {
    try {
      const today = localDateStr();
      // Load pending approvals
      const { data: pending } = await supabase.from('kids_pending_approvals')
        .select('*').eq('family_id', FAMILY_ID).eq('status', 'pending')
        .order('created_at', { ascending: false });
      setDbPending(pending ?? []);
      // Load points per child
      const { data: pointsData } = await supabase.from('kids_points_log')
        .select('child_name, points').eq('family_id', FAMILY_ID);
      const pts: Record<string, number> = {};
      (pointsData ?? []).forEach((p: any) => { pts[p.child_name] = (pts[p.child_name] || 0) + (p.points || 0); });
      setDbPoints(pts);
      // Load all jobs
      const { data: jobsData } = await supabase.from('kids_jobs')
        .select('*').eq('family_id', FAMILY_ID).eq('approved', true);
      setDbJobs(jobsData ?? []);
      // Calculate per-child job counts for today
      const counts: Record<string, { done: number; total: number }> = {};
      const childNames: ChildName[] = ['Poppy', 'Gab', 'Duke'];
      childNames.forEach(name => {
        const childJobs = (jobsData ?? []).filter((j: any) => j.child_name === name);
        const todayJobs = childJobs.filter((j: any) =>
          j.type === 'daily' || (j.type === 'weekly') || (j.type === 'oneoff' && !j.is_complete)
        );
        const doneToday = childJobs.filter((j: any) => j.is_complete && j.completed_at?.startsWith(today)).length;
        counts[name] = { done: doneToday, total: Math.max(todayJobs.length, doneToday) };
      });
      setDbJobCounts(counts);
      // Calculate streaks
      const streaks: Record<string, number> = {};
      childNames.forEach(name => {
        const childJobs = (jobsData ?? []).filter((j: any) => j.child_name === name && j.is_complete && j.completed_at);
        const completeDates = [...new Set(childJobs.map((j: any) => j.completed_at?.split('T')[0]).filter(Boolean))].sort().reverse();
        let streak = 0;
        let checkDate = today;
        for (const d of completeDates) {
          if (d === checkDate) {
            streak++;
            const prev = new Date(checkDate + 'T00:00:00');
            prev.setDate(prev.getDate() - 1);
            checkDate = localDateStr(prev);
          } else break;
        }
        streaks[name] = streak;
      });
      setDbStreaks(streaks);
      // Load rewards
      const { data: rewardsData } = await supabase.from('kids_rewards')
        .select('*').eq('family_id', FAMILY_ID).eq('is_active', true);
      setDbRewards(rewardsData ?? []);

      // Load tutor sessions (last 30 days) per child
      try {
        const since = new Date();
        since.setDate(since.getDate() - 30);
        const { data: tutorSess, error: tutorErr } = await supabase.from('tutor_sessions')
          .select('id, child_name, pillar, subject, topic, duration_seconds, difficulty_band, question_count, hints_used, status, summary, created_at')
          .eq('family_id', FAMILY_ID)
          .gte('created_at', since.toISOString())
          .order('created_at', { ascending: false })
          .limit(100);
        if (tutorErr) console.error('TUTOR SESSIONS LOAD ERROR:', tutorErr.message, tutorErr.details);
        else console.log('TUTOR SESSIONS LOADED:', (tutorSess ?? []).length, 'sessions', (tutorSess ?? []).map((s: any) => s.child_name));
        const sessMap: Record<string, any[]> = {};
        (tutorSess ?? []).forEach((s: any) => {
          if (!sessMap[s.child_name]) sessMap[s.child_name] = [];
          sessMap[s.child_name].push(s);
        });
        setDbTutorSessions(sessMap);

        // Load tutor progress per child per subject
        const { data: tutorProg } = await supabase.from('tutor_progress')
          .select('child_name, subject, difficulty_band, total_sessions, total_minutes, status_label, notes')
          .eq('family_id', FAMILY_ID);
        const progMap: Record<string, any[]> = {};
        (tutorProg ?? []).forEach((p: any) => {
          if (!progMap[p.child_name]) progMap[p.child_name] = [];
          progMap[p.child_name].push(p);
        });
        setDbTutorProgress(progMap);

        // Load tutor messages for recent sessions (for parent review)
        const recentIds = (tutorSess ?? []).slice(0, 20).map((s: any) => s.id).filter(Boolean);
        if (recentIds.length > 0) {
          const { data: msgs } = await supabase.from('tutor_messages')
            .select('session_id, role, content, message_type, hint_level, created_at')
            .in('session_id', recentIds)
            .order('created_at', { ascending: true });
          const msgMap: Record<string, any[]> = {};
          (msgs ?? []).forEach((m: any) => {
            if (!msgMap[m.session_id]) msgMap[m.session_id] = [];
            msgMap[m.session_id].push(m);
          });
          setDbTutorMessages(msgMap);
        }
      } catch (e) { console.log('[family] tutor data load error:', e); }
    } catch (e) { console.log('[family] loadFamilyData error:', e); }
  }

  // Parent management — add job for selected children
  async function addJobForChildren() {
    if (!addTitle.trim() || addSelectedKids.length === 0) return;
    try {
      for (const kidName of addSelectedKids) {
        await supabase.from('kids_jobs').insert({
          family_id: FAMILY_ID, child_name: kidName, title: addTitle.trim(),
          emoji: addEmoji || '📋', points: addPoints, type: addType,
          source: 'parent', approved: true,
        });
      }
      setShowAddForm(null);
      setAddTitle(''); setAddEmoji(''); setAddPoints(10); setAddType('oneoff'); setAddSelectedKids([]);
      loadFamilyData();
    } catch (e) { console.log('[family] addJobForChildren error:', e); }
  }

  // Parent management — add reward for selected children
  async function addRewardForChildren() {
    if (!addTitle.trim() || addSelectedKids.length === 0) return;
    try {
      for (const kidName of addSelectedKids) {
        await supabase.from('kids_rewards').insert({
          family_id: FAMILY_ID, child_name: kidName, title: addTitle.trim(),
          emoji: addEmoji || '🎁', cost: addPoints,
        });
      }
      setShowAddForm(null);
      setAddTitle(''); setAddEmoji(''); setAddPoints(100); setAddSelectedKids([]);
      loadFamilyData();
    } catch (e) { console.log('[family] addRewardForChildren error:', e); }
  }

  async function approveItem(item: any) {
    try {
      if (item.type === 'job_suggestion') {
        // Create the job and award points
        await supabase.from('kids_jobs').insert({
          family_id: FAMILY_ID, child_name: item.child_name, title: item.title,
          emoji: item.emoji || '📋', points: item.points, type: 'oneoff',
          source: 'child_suggested', approved: true,
        });
        await supabase.from('kids_points_log').insert({
          family_id: FAMILY_ID, child_name: item.child_name,
          points: item.points, reason: item.title, source: 'job_complete',
        });
      } else if (item.type === 'reward_redemption') {
        // Deduct points
        await supabase.from('kids_points_log').insert({
          family_id: FAMILY_ID, child_name: item.child_name,
          points: -(item.points), reason: `Redeemed: ${item.title}`, source: 'reward_redeem',
        });
      }
      // Mark as approved
      await supabase.from('kids_pending_approvals').update({ status: 'approved' }).eq('id', item.id);
      loadFamilyData();
    } catch (e) { console.log('[family] approveItem error:', e); }
  }

  async function declineItem(item: any) {
    try {
      await supabase.from('kids_pending_approvals').update({ status: 'declined' }).eq('id', item.id);
      loadFamilyData();
    } catch (e) { console.log('[family] declineItem error:', e); }
  }

  function goBack() {
    router.navigate('/(tabs)/swipe-world' as any);
  }

  // Add form state
  const [showAddForm, setShowAddForm] = useState<'job' | 'reward' | null>(null);

  const [editingJob, setEditingJob] = useState<any>(null); // when set, the add form becomes edit mode

  async function saveEditedJob() {
    if (!editingJob || !addTitle.trim()) return;
    try {
      await supabase.from('kids_jobs').update({
        title: addTitle.trim(), emoji: addEmoji || '📋', points: addPoints, type: addType,
      }).eq('id', editingJob.id);
      setEditingJob(null); setShowAddForm(null);
      setAddTitle(''); setAddEmoji(''); setAddPoints(10); setAddType('oneoff');
      loadFamilyData();
    } catch (e) { console.log('[family] saveEditedJob error:', e); }
  }

  async function saveEditedReward() {
    if (!editingJob || !addTitle.trim()) return;
    try {
      await supabase.from('kids_rewards').update({
        title: addTitle.trim(), emoji: addEmoji || '🎁', cost: addPoints,
      }).eq('id', editingJob.id);
      setEditingJob(null); setShowAddForm(null);
      setAddTitle(''); setAddEmoji(''); setAddPoints(100);
      loadFamilyData();
    } catch (e) { console.log('[family] saveEditedReward error:', e); }
  }

  function openEditJob(job: any) {
    setEditingJob(job);
    setAddTitle(job.title);
    setAddEmoji(job.emoji || '');
    setAddPoints(job.points);
    setAddType(job.type || 'oneoff');
    setAddSelectedKids([job.child_name]);
    setShowAddForm('job');
    setTimeout(() => jobsScrollRef.current?.scrollTo({ y: 0, animated: true }), 100);
  }

  function openEditReward(rw: any) {
    setEditingJob(rw);
    setAddTitle(rw.title);
    setAddEmoji(rw.emoji || '');
    setAddPoints(rw.cost);
    setAddSelectedKids([rw.child_name]);
    setShowAddForm('reward');
    setTimeout(() => jobsScrollRef.current?.scrollTo({ y: 0, animated: true }), 100);
  }

  async function deleteJob(id: string) {
    try { await supabase.from('kids_jobs').delete().eq('id', id); loadFamilyData(); } catch {}
  }
  async function deleteReward(id: string) {
    try { await supabase.from('kids_rewards').delete().eq('id', id); loadFamilyData(); } catch {}
  }
  async function reactivateJob(job: any) {
    try {
      await supabase.from('kids_jobs').update({ is_complete: false, completed_at: null }).eq('id', job.id);
      loadFamilyData();
    } catch {}
  }
  const [showCompletedJobs, setShowCompletedJobs] = useState(false);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);

  // ── Banner (shared) ──────────────────────────────────────────────────────
  function Banner({ title }: { title: string }) {
    return (
      <>
        <View style={s.banner}>
          <View style={s.bannerLeft}>
            <TouchableOpacity onPress={goBack} activeOpacity={0.7} style={s.bannerBackBtn}>
              <IcoBack size={18} color={INK} />
            </TouchableOpacity>
            <Text style={s.wordmark}>
              z<Text style={{ color: '#A8D8F0' }}>a</Text>el
              <Text style={{ color: '#A8D8F0' }}>i</Text>
            </Text>
          </View>
          <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 17, color: INK4 }}>{title}</Text>
        </View>
        <View style={s.divider} />
      </>
    );
  }

  // ── Sub-header with back button ──────────────────────────────────────────
  function SubHeader({ title, right }: { title: string; right?: React.ReactNode }) {
    return (
      <View style={s.subHeader}>
        <TouchableOpacity style={s.backBtn} onPress={goBack} activeOpacity={0.7}>
          <IcoBack />
        </TouchableOpacity>
        <Text style={s.subHeaderTitle}>{title}</Text>
        {right && <View style={{ marginLeft: 'auto' }}>{right}</View>}
      </View>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // HOME VIEW
  // ══════════════════════════════════════════════════════════════════════════
  function HomeView() {
    const hasPending = dbPending.length > 0;

    return (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Pending actions */}
        {hasPending && (
          <>
            <Text style={s.sectionLabel}>Needs your attention</Text>
            {dbPending.map((action: any) => {
              const childName = action.child_name || action.child;
              const member = FAMILY[childName as keyof typeof FAMILY];
              const isJob = (action.type === 'job_suggestion' || action.type === 'job');
              const pts = action.points || 0;
              const title = action.title || '';
              const sub = action.note || action.sub || (isJob ? `Suggests ${pts} pts` : `${pts} pts`);
              const isReal = !!action.child_name; // from Supabase
              return (
                <View key={action.id} style={s.pendingCard}>
                  <View style={[s.pendingAvatar, { backgroundColor: member?.colour || '#999' }]}>
                    <Text style={s.pendingAvatarTxt}>{member?.initial || '?'}</Text>
                  </View>
                  <View style={s.pendingInfo}>
                    <View style={s.pendingTagRow}>
                      <View style={[s.pendingTag, isJob ? s.tagJob : s.tagReward]}>
                        <Text style={[s.pendingTagTxt, isJob ? s.tagJobTxt : s.tagRewardTxt]}>
                          {isJob ? 'Job request' : 'Reward request'}
                        </Text>
                      </View>
                    </View>
                    <Text style={s.pendingTitle}>{action.emoji || ''} {title}</Text>
                    <Text style={s.pendingSub}>{sub}</Text>
                  </View>
                  <View style={s.pendingBtns}>
                    <TouchableOpacity style={s.pendingYes} activeOpacity={0.7} onPress={() => approveItem(action)}>
                      <Text style={s.pendingYesTxt}>
                        {isJob ? `\u2713 ${pts} pts` : '\u2713 Grant'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.pendingNo} activeOpacity={0.7} onPress={() => declineItem(action)}>
                      <Text style={s.pendingNoTxt}>{action.type === 'job' ? 'Edit' : 'Not yet'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </>
        )}

        {/* Our Kids — Supabase data */}
        <Text style={s.sectionLabel}>Our kids</Text>
        {KIDS.map(kid => {
          const member = FAMILY[kid.name];
          const hasTutor = (FAMILY[kid.name] as any).tutorActive;
          const realPoints = dbPoints[kid.name] ?? kid.points;
          const realStreak = dbStreaks[kid.name] ?? kid.streak;
          const jc = dbJobCounts[kid.name] ?? { done: kid.jobsDone, total: kid.jobsTotal };
          // Next reward distance
          const childRewards = dbRewards.filter((r: any) => r.child_name === kid.name);
          const nextReward = childRewards.find((r: any) => r.cost > realPoints);
          const toNextReward = nextReward ? nextReward.cost - realPoints : 0;

          return (
            <TouchableOpacity
              key={kid.name}
              style={s.kidCard}
              onPress={() => {}}
              activeOpacity={0.8}
            >
              <View style={s.kidTop}>
                <View style={[s.kidAvatar, { backgroundColor: member.colour }]}>
                  <Text style={s.kidAvatarTxt}>{member.initial}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={s.kidName}>{kid.name}</Text>
                    <View style={{ backgroundColor: 'rgba(0,0,0,0.07)', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 2 }}>
                      <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 14, color: INK }}>Yr {(FAMILY[kid.name] as any).year}</Text>
                    </View>
                  </View>
                  <Text style={{ fontFamily: 'Poppins_500Medium', fontSize: 13, color: INK4, marginTop: 2 }}>Age {(FAMILY[kid.name] as any).age} {(FAMILY[kid.name] as any).dob ? `\u00B7 \u{1F382} ${(FAMILY[kid.name] as any).dob}` : ''}</Text>
                </View>
                <View style={s.kidPts}>
                  <Text style={s.kidPtsTxt}>{'\u2B50'} {realPoints}</Text>
                </View>
              </View>

              <View style={s.kidStats}>
                <View style={s.kidStat}>
                  <Text style={s.kidStatN}>{jc.done}/{jc.total}</Text>
                  <Text style={s.kidStatL}>Jobs today</Text>
                </View>
                <View style={s.kidStat}>
                  {kid.sessions > 0 ? (
                    <Text style={s.kidStatN}>{kid.sessions}</Text>
                  ) : (
                    <Text style={[s.kidStatN, { fontSize: 14 }]}>No Tutor</Text>
                  )}
                  <Text style={s.kidStatL}>{kid.sessions > 0 ? 'Sessions' : 'Not enrolled'}</Text>
                </View>
                <View style={s.kidStat}>
                  <Text style={s.kidStatN}>{toNextReward > 0 ? toNextReward : '\u2713'}</Text>
                  <Text style={s.kidStatL}>{toNextReward > 0 ? 'To reward' : 'Reward ready'}</Text>
                </View>
              </View>

              <TouchableOpacity
                style={{ backgroundColor: hasTutor ? TUTOR_BG : 'rgba(0,0,0,0.05)', borderRadius: 12, paddingVertical: 11, alignItems: 'center', marginTop: 8 }}
                activeOpacity={0.7}
                onPress={(e) => { e.stopPropagation(); if (hasTutor) { setSelectedChild(kid.name); setChildDetailView('progress'); } }}
              >
                <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 14, color: hasTutor ? TUTOR_PURPLE : 'rgba(0,0,0,0.30)' }}>
                  {'\u{1F4DA}'} {hasTutor ? 'Tutor progress' : 'Add Tutor'}
                </Text>
              </TouchableOpacity>
            </TouchableOpacity>
          );
        })}

      </ScrollView>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CHILD DETAIL VIEW
  // ══════════════════════════════════════════════════════════════════════════
  function ChildDetailView() {
    const kid = KIDS.find(k => k.name === selectedChild)!;
    const member = FAMILY[selectedChild];
    const detail = CHILD_DETAIL[selectedChild];
    const hasTutor = (member as any).tutorActive;
    const realPoints = dbPoints[selectedChild] ?? kid.points;
    const realStreak = dbStreaks[selectedChild] ?? kid.streak;
    const jc = dbJobCounts[selectedChild] ?? { done: kid.jobsDone, total: kid.jobsTotal };
    const childJobs = dbJobs.filter((j: any) => j.child_name === selectedChild);
    const today = localDateStr();
    const childRewards = dbRewards.filter((r: any) => r.child_name === selectedChild);
    const nextReward = childRewards.find((r: any) => r.cost > realPoints);
    const toNextReward = nextReward ? nextReward.cost - realPoints : 0;

    // Tutor data — computed before render
    const liveSessions = dbTutorSessions[selectedChild] ?? [];
    const liveProgress = dbTutorProgress[selectedChild] ?? [];
    const totalSessions = liveSessions.length;
    const totalMins = Math.round(liveSessions.reduce((sum: number, se: any) => sum + (se.duration_seconds ?? 0), 0) / 60);

    // Build subject summaries from live sessions if no tutor_progress rows yet
    const subjectMap: Record<string, { sessions: number; mins: number; band: string; lastTopic: string }> = {};
    liveSessions.forEach((se: any) => {
      const subj = se.subject ?? 'General';
      if (!subjectMap[subj]) subjectMap[subj] = { sessions: 0, mins: 0, band: 'core', lastTopic: '' };
      subjectMap[subj].sessions++;
      subjectMap[subj].mins += Math.round((se.duration_seconds ?? 0) / 60);
      if (se.difficulty_band) subjectMap[subj].band = se.difficulty_band;
      if (se.topic) subjectMap[subj].lastTopic = se.topic;
    });

    const tutorSubjects = liveProgress.length > 0 ? liveProgress : Object.entries(subjectMap).map(([name, d]) => ({
      subject: name, difficulty_band: d.band, total_sessions: d.sessions, total_minutes: d.mins,
      status_label: d.sessions >= 8 ? 'excelling' : d.sessions >= 3 ? 'tracking well' : 'getting started',
      notes: d.lastTopic ? `Last topic: ${d.lastTopic}` : '',
    }));

    const BAND_STYLES: Record<string, { colour: string; bg: string; label: string }> = {
      'foundation': { colour: '#1E40AF', bg: 'rgba(147,197,253,0.2)', label: 'Foundation' },
      'core': { colour: '#0A6040', bg: 'rgba(168,232,204,0.2)', label: 'Core' },
      'extension': { colour: '#92400E', bg: 'rgba(253,230,138,0.25)', label: '\u2191 Extension' },
    };
    const STATUS_COLOURS: Record<string, string> = {
      'excelling': '#22C55E', 'tracking well': '#F59E0B', 'getting started': '#6366F1', 'needs work': '#EF4444',
    };
    const SUBJ_COLOURS: Record<string, string> = {
      'Maths': member.colour, 'English': '#5020C0', 'Science': '#22C55E', 'HASS': '#F59E0B', 'General': '#6366F1',
    };

    return (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Child header */}
        <View style={s.detailHeader}>
          <TouchableOpacity style={s.backBtn} onPress={goBack} activeOpacity={0.7}>
            <IcoBack />
          </TouchableOpacity>
          <View style={[s.avatar, { backgroundColor: member.colour, width: 44, height: 44 }]}>
            <Text style={[s.avatarTxt, { fontSize: 16 }]}>{member.initial}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.detailName}>{selectedChild}</Text>
            <Text style={s.detailMeta}>
              Year {(member as any).year} {'\u00B7'} Age {(member as any).age} {'\u00B7'} {'\u{1F382}'} {(member as any).dob} {'\u00B7'} {'\u{1F525}'} {realStreak} day streak
            </Text>
          </View>
          <TouchableOpacity style={s.editBadge} activeOpacity={0.7}>
            <Text style={s.editBadgeTxt}>Edit</Text>
          </TouchableOpacity>
        </View>

        {/* Tutor progress — live from Supabase */}
        {hasTutor && totalSessions > 0 && (
          <View style={s.sectionCard}>
            <View style={s.sectionCardHeader}>
              <Text style={{ fontSize: 20 }}>{'\u{1F4DA}'}</Text>
              <Text style={s.sectionCardTitle}>Tutor progress</Text>
              <View style={s.streakBadge}>
                <Text style={s.streakBadgeTxt}>{totalSessions} sessions {'·'} {totalMins}m</Text>
              </View>
            </View>

            {tutorSubjects.map((subj: any, i: number) => {
              const band = BAND_STYLES[subj.difficulty_band] ?? BAND_STYLES['core'];
              const barColour = SUBJ_COLOURS[subj.subject] ?? member.colour;
                const maxSessions = 20;
                const pct = Math.min(100, Math.round(((subj.total_sessions ?? 0) / maxSessions) * 100));
                const statusColour = STATUS_COLOURS[subj.status_label] ?? '#6366F1';
                return (
                  <View key={subj.subject} style={[s.subjectRow, i === tutorSubjects.length - 1 && { marginBottom: 0 }]}>
                    <View style={s.subjTop}>
                      <Text style={s.subjName}>{subj.subject}</Text>
                      <View style={[s.subjBand, { backgroundColor: band.bg }]}>
                        <Text style={[s.subjBandTxt, { color: band.colour }]}>{band.label}</Text>
                      </View>
                    </View>
                    <View style={s.subjBarWrap}>
                      <View style={[s.subjBar, { width: `${pct}%`, backgroundColor: barColour }]} />
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={s.subjNote}>{subj.total_sessions ?? 0} sessions {'·'} {subj.total_minutes ?? 0}m</Text>
                      <Text style={[s.subjNote, { color: statusColour, fontFamily: 'Poppins_600SemiBold' }]}>{subj.status_label}</Text>
                    </View>
                    {subj.notes ? <Text style={[s.subjNote, { marginTop: 2 }]}>{subj.notes}</Text> : null}
                  </View>
                );
              })}

              {/* Recent sessions */}
              {liveSessions.slice(0, 3).map((sess: any, i: number) => {
                const when = (() => {
                  const d = new Date(sess.created_at);
                  const diff = Math.floor((Date.now() - d.getTime()) / 86400000);
                  if (diff === 0) return 'Today';
                  if (diff === 1) return 'Yesterday';
                  return ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()];
                })();
                const dotColour = SUBJ_COLOURS[sess.subject] ?? member.colour;
                const title = sess.topic && sess.topic !== 'Zaeli picks' ? sess.topic : sess.subject ? `${sess.pillar ?? 'Session'} — ${sess.subject}` : sess.pillar ?? 'Session';
                const dur = sess.duration_seconds ? ` · ${Math.round(sess.duration_seconds / 60)}m` : '';
                return (
                  <View key={i} style={s.recentSession}>
                    <View style={[s.rsDot, { backgroundColor: dotColour }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={s.rsTitle} numberOfLines={1}>{title}</Text>
                      <Text style={s.rsMeta}>{when} {'·'} {sess.subject ?? sess.pillar}{dur}</Text>
                    </View>
                    <Text style={s.rsView}>View {'→'}</Text>
                  </View>
                );
              })}

              <TouchableOpacity
                style={{ marginTop: 10, paddingVertical: 10, backgroundColor: 'rgba(80,32,192,0.08)', borderRadius: 10, alignItems: 'center' }}
                onPress={() => setChildDetailView('progress')}
                activeOpacity={0.76}
              >
                <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 14, color: '#5020C0' }}>Full Tutor report {'→'}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Tutor enrolled but no sessions yet */}
          {hasTutor && totalSessions === 0 && (
            <View style={s.sectionCard}>
              <View style={s.sectionCardHeader}>
                <Text style={{ fontSize: 20 }}>{'\u{1F4DA}'}</Text>
                <Text style={s.sectionCardTitle}>Tutor progress</Text>
              </View>
              <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 14, color: INK4, marginBottom: 10 }}>No sessions yet. Start a session in Tutor to see progress here.</Text>
              <TouchableOpacity
                style={{ paddingVertical: 10, backgroundColor: 'rgba(80,32,192,0.08)', borderRadius: 10, alignItems: 'center' }}
                onPress={() => router.navigate({ pathname: '/(tabs)/tutor-child', params: { childId: '', childName: selectedChild, yearLevel: String((member as any).year) } })}
                activeOpacity={0.76}
              >
                <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 14, color: '#5020C0' }}>Open Tutor {'→'}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Tutor not enrolled — upsell */}
          {!hasTutor && (
            <View style={s.sectionCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 8 }}>
                <Text style={{ fontSize: 26 }}>{'\u{1F4DA}'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 16, color: INK, marginBottom: 1 }}>Tutor not enrolled</Text>
                  <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 13, color: INK4 }}>A$9.99/month {'·'} Australian curriculum Yr {(member as any).year}</Text>
                </View>
              </View>
              <TouchableOpacity style={s.tutorCta} activeOpacity={0.7}>
                <Text style={s.tutorCtaTxt}>Add {selectedChild} to Tutor {'→'}</Text>
              </TouchableOpacity>
            </View>
          )}

        {/* Kids Hub section */}
        <View style={s.sectionCard}>
          <View style={s.sectionCardHeader}>
            <Text style={{ fontSize: 20 }}>{'\u{1F3E0}'}</Text>
            <Text style={s.sectionCardTitle}>Kids Hub</Text>
            <Text style={s.hubPtsBadge}>{'\u2B50'} {realPoints} pts</Text>
          </View>

          <View style={s.hubStatRow}>
            <View style={s.hubStat}>
              <Text style={s.hubStatN}>{jc.done}/{jc.total}</Text>
              <Text style={s.hubStatL}>Jobs today</Text>
            </View>
            <View style={s.hubStat}>
              <Text style={s.hubStatN}>{'\u{1F525}'} {realStreak}</Text>
              <Text style={s.hubStatL}>Day streak</Text>
            </View>
            <View style={s.hubStat}>
              <Text style={s.hubStatN}>{toNextReward > 0 ? toNextReward : '\u2713'}</Text>
              <Text style={s.hubStatL}>{toNextReward > 0 ? (nextReward ? `To ${nextReward.title}` : 'To reward') : 'Reward ready'}</Text>
            </View>
          </View>

          {/* Today's jobs from Supabase */}
          {childJobs.length > 0 ? childJobs.slice(0, 6).map((job: any) => {
            const isDone = job.is_complete && job.completed_at?.startsWith(today);
            return (
              <View key={job.id} style={s.jobMini}>
                <Text style={s.jobMiniIcon}>{job.emoji || '\u{1F4CB}'}</Text>
                <Text style={[s.jobMiniName, isDone && { textDecorationLine: 'line-through', color: 'rgba(0,0,0,0.35)' }]}>{job.title}</Text>
                <View style={[s.jobMiniCheck, isDone && s.jobMiniCheckDone]}>
                  {isDone && <IcoCheck />}
                </View>
              </View>
            );
          }) : detail.jobs.map((job, i) => (
            <View key={i} style={s.jobMini}>
              <Text style={s.jobMiniIcon}>{job.icon}</Text>
              <Text style={s.jobMiniName}>{job.name}</Text>
              <View style={[s.jobMiniCheck, job.done && s.jobMiniCheckDone]}>
                {job.done && <IcoCheck />}
              </View>
            </View>
          ))}

        </View>
      </ScrollView>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PENDING ACTIONS VIEW
  // ══════════════════════════════════════════════════════════════════════════
  function PendingView() {
    return (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <SubHeader
          title="Needs attention"
          right={
            <View style={s.pendingCountBadge}>
              <Text style={s.pendingCountTxt}>{dbPending.length || PENDING_ACTIONS.length} items</Text>
            </View>
          }
        />

        <Text style={s.sectionLabel}>Job requests</Text>
        {PENDING_ACTIONS.filter(a => a.type === 'job').map(action => {
          const member = FAMILY[action.child];
          return (
            <View key={action.id} style={s.pendingCard}>
              <View style={[s.pendingAvatar, { backgroundColor: member.colour }]}>
                <Text style={s.pendingAvatarTxt}>{member.initial}</Text>
              </View>
              <View style={s.pendingInfo}>
                <View style={s.pendingTagRow}>
                  <View style={[s.pendingTag, s.tagJob]}>
                    <Text style={[s.pendingTagTxt, s.tagJobTxt]}>Job request</Text>
                  </View>
                </View>
                <Text style={s.pendingTitle}>{action.title}</Text>
                <Text style={s.pendingSub}>{action.sub}</Text>
              </View>
              <View style={s.pendingBtns}>
                <TouchableOpacity style={s.pendingYes} activeOpacity={0.7}>
                  <Text style={s.pendingYesTxt}>{'\u2713'} {action.points} pts</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.pendingNo} activeOpacity={0.7}>
                  <Text style={s.pendingNoTxt}>Edit</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

        <Text style={s.sectionLabel}>Reward requests</Text>
        {PENDING_ACTIONS.filter(a => a.type === 'reward').map(action => {
          const member = FAMILY[action.child];
          return (
            <View key={action.id} style={s.pendingCard}>
              <View style={[s.pendingAvatar, { backgroundColor: member.colour }]}>
                <Text style={s.pendingAvatarTxt}>{member.initial}</Text>
              </View>
              <View style={s.pendingInfo}>
                <View style={s.pendingTagRow}>
                  <View style={[s.pendingTag, s.tagReward]}>
                    <Text style={[s.pendingTagTxt, s.tagRewardTxt]}>Reward request</Text>
                  </View>
                </View>
                <Text style={s.pendingTitle}>{action.title}</Text>
                <Text style={s.pendingSub}>{action.sub}</Text>
              </View>
              <View style={s.pendingBtns}>
                <TouchableOpacity style={s.pendingYes} activeOpacity={0.7}>
                  <Text style={s.pendingYesTxt}>{'\u2713'} Grant</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.pendingNo} activeOpacity={0.7}>
                  <Text style={s.pendingNoTxt}>Not yet</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // FAMILY PROFILES VIEW
  // ══════════════════════════════════════════════════════════════════════════
  function ProfilesView() {
    const members: { name: string; data: typeof FAMILY.Rich }[] = [
      { name: 'Rich', data: FAMILY.Rich },
      { name: 'Anna', data: FAMILY.Anna },
      { name: 'Poppy', data: FAMILY.Poppy as any },
      { name: 'Gab', data: FAMILY.Gab as any },
      { name: 'Duke', data: FAMILY.Duke as any },
    ];

    return (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <SubHeader title="Family profiles" />

        {members.map(m => (
          <View key={m.name} style={s.profileCard}>
            <View style={s.profileAvWrap}>
              <View style={[s.profileColourRing, { backgroundColor: m.data.colour }]}>
                <Text style={s.profileRingTxt}>{m.data.initial}</Text>
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.profileName}>{m.name}</Text>
              <Text style={s.profileMeta}>
                {m.data.role === 'parent'
                  ? `${m.data.email} \u00B7 Parent`
                  : `Year ${(m.data as any).year} \u00B7 Age ${(m.data as any).age} \u00B7 \u{1F382} ${(m.data as any).dob}`
                }
              </Text>
              {m.data.loginStatus === 'full' && (
                <View style={s.loginBadge}>
                  <Text style={s.loginBadgeTxt}>{'\u2713'} Full account</Text>
                </View>
              )}
              {m.data.loginStatus === 'own' && (
                <View style={s.loginBadge}>
                  <Text style={s.loginBadgeTxt}>{'\u2713'} Own Zaeli login</Text>
                </View>
              )}
              {m.data.loginStatus === 'invite' && (
                <TouchableOpacity style={s.inviteBadge} activeOpacity={0.7}>
                  <Text style={s.inviteBadgeTxt}>+ Invite to Zaeli</Text>
                </TouchableOpacity>
              )}
              {m.data.loginStatus === 'parent-device' && (
                <Text style={s.parentDeviceTxt}>Uses parent{"'"}s device</Text>
              )}
            </View>
            <View style={[s.roleBadge, m.data.role === 'parent' ? s.roleParent : s.roleChild]}>
              <Text style={[s.roleBadgeTxt, m.data.role === 'parent' ? s.roleParentTxt : s.roleChildTxt]}>
                {m.data.role === 'parent' ? 'Parent' : 'Child'}
              </Text>
            </View>
          </View>
        ))}

        {/* Add member */}
        <TouchableOpacity style={s.addMember} activeOpacity={0.7}>
          <Text style={{ fontSize: 22, opacity: 0.4 }}>{'\u2795'}</Text>
          <Text style={s.addMemberTxt}>Add a family member</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // TUTOR PROGRESS VIEW — Screen 11 from mockup
  // Per-child: sessions/time/streak, per-subject cards with bands + bars
  // ══════════════════════════════════════════════════════════════════════════
  function TutorProgressView() {
    const member = FAMILY[selectedChild];
    const liveSessions = dbTutorSessions[selectedChild] ?? [];
    const liveProgress = dbTutorProgress[selectedChild] ?? [];
    const totalSessions = liveSessions.length;
    const totalMins = Math.round(liveSessions.reduce((sum: number, se: any) => sum + (se.duration_seconds ?? 0), 0) / 60);
    const totalHrs = Math.floor(totalMins / 60);
    const remainMins = totalMins % 60;
    const timeStr = totalHrs > 0 ? `${totalHrs}h ${remainMins}m` : `${totalMins}m`;

    // Calculate streak
    const dates = new Set(liveSessions.map((s: any) => {
      const d = new Date(s.created_at);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }));
    const sorted = Array.from(dates).sort().reverse();
    const today = localDateStr();
    let streak = 0;
    if (sorted[0] === today || sorted[0] === localDateStr((() => { const d = new Date(); d.setDate(d.getDate() - 1); return d; })())) {
      streak = 1;
      for (let i = 1; i < sorted.length; i++) {
        const prev = new Date(sorted[i - 1]);
        const curr = new Date(sorted[i]);
        if (Math.round((prev.getTime() - curr.getTime()) / 86400000) === 1) streak++;
        else break;
      }
    }

    // Subject summaries
    const subjectMap: Record<string, { sessions: number; mins: number; band: string; lastTopic: string }> = {};
    liveSessions.forEach((se: any) => {
      const subj = se.subject ?? 'General';
      if (!subjectMap[subj]) subjectMap[subj] = { sessions: 0, mins: 0, band: 'core', lastTopic: '' };
      subjectMap[subj].sessions++;
      subjectMap[subj].mins += Math.round((se.duration_seconds ?? 0) / 60);
      if (se.difficulty_band) subjectMap[subj].band = se.difficulty_band;
      if (se.topic) subjectMap[subj].lastTopic = se.topic;
    });

    const subjects = liveProgress.length > 0 ? liveProgress : Object.entries(subjectMap).map(([name, d]) => ({
      subject: name, difficulty_band: d.band, total_sessions: d.sessions, total_minutes: d.mins,
      status_label: d.sessions >= 8 ? 'excelling' : d.sessions >= 3 ? 'tracking well' : 'getting started',
      notes: d.lastTopic ? `Last topic: ${d.lastTopic}` : '',
    }));

    const BAND_STYLES: Record<string, { colour: string; bg: string; label: string }> = {
      'foundation': { colour: '#1E40AF', bg: 'rgba(147,197,253,0.2)', label: 'Foundation' },
      'core': { colour: '#0A6040', bg: 'rgba(168,232,204,0.2)', label: 'Core' },
      'extension': { colour: '#92400E', bg: 'rgba(253,230,138,0.25)', label: '\u2191 Extension' },
    };
    const STATUS_COLOURS: Record<string, string> = {
      'excelling': '#22C55E', 'tracking well': '#F59E0B', 'getting started': '#6366F1', 'needs work': '#EF4444',
    };
    const SUBJ_COLOURS: Record<string, string> = {
      'Maths': member.colour, 'English': '#5020C0', 'Science': '#22C55E', 'HASS': '#F59E0B', 'General': '#6366F1',
    };

    function sessWhen(iso: string) {
      const d = new Date(iso);
      const diff = Math.floor((Date.now() - d.getTime()) / 86400000);
      if (diff === 0) return 'Today';
      if (diff === 1) return 'Yesterday';
      return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
    }

    return (
      <ScrollView style={{ flex: 1, backgroundColor: '#F8F6FF' }} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12 }}>
          <TouchableOpacity style={s.backBtn} onPress={() => setChildDetailView('overview')} activeOpacity={0.7}>
            <IcoBack />
          </TouchableOpacity>
          <View style={[s.avatar, { backgroundColor: member.colour, width: 34, height: 34 }]}>
            <Text style={[s.avatarTxt, { fontSize: 16 }]}>{member.initial}</Text>
          </View>
          <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 18, color: INK, flex: 1 }}>{selectedChild}'s progress</Text>
          <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 14, color: INK4 }}>This month</Text>
        </View>

        {/* Stats strip */}
        <View style={{ flexDirection: 'row', marginHorizontal: 14, marginBottom: 14, backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 14, paddingVertical: 12 }}>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontFamily: 'Poppins_800ExtraBold', fontSize: 24, color: TUTOR_PURPLE }}>{totalSessions}</Text>
            <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 11, color: INK4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Sessions</Text>
          </View>
          <View style={{ width: 1, height: 30, backgroundColor: 'rgba(0,0,0,0.08)' }} />
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontFamily: 'Poppins_800ExtraBold', fontSize: 24, color: TUTOR_PURPLE }}>{timeStr}</Text>
            <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 11, color: INK4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Total time</Text>
          </View>
          <View style={{ width: 1, height: 30, backgroundColor: 'rgba(0,0,0,0.08)' }} />
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontFamily: 'Poppins_800ExtraBold', fontSize: 24, color: TUTOR_PURPLE }}>{streak > 0 ? `\u{1F525} ${streak}` : '0'}</Text>
            <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 11, color: INK4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Day streak</Text>
          </View>
        </View>

        {/* Subject cards — tap to expand */}
        {subjects.map((subj: any) => {
          const band = BAND_STYLES[subj.difficulty_band] ?? BAND_STYLES['core'];
          const barColour = SUBJ_COLOURS[subj.subject] ?? member.colour;
          const pct = Math.min(100, Math.round(((subj.total_sessions ?? 0) / 20) * 100));
          const statusColour = STATUS_COLOURS[subj.status_label] ?? '#6366F1';
          const isExpanded = expandedSubject === subj.subject;
          const subjSessions = liveSessions.filter((se: any) => (se.subject ?? 'General') === subj.subject);
          return (
            <TouchableOpacity
              key={subj.subject}
              style={{ backgroundColor: '#fff', borderRadius: 16, marginHorizontal: 14, marginBottom: 10, padding: 14, borderWidth: isExpanded ? 1.5 : 0, borderColor: isExpanded ? 'rgba(80,32,192,0.2)' : 'transparent' }}
              onPress={() => {
                if (isExpanded) { setExpandedSubject(null); return; }
                setExpandedSubject(subj.subject);
                // Fetch AI summary if not cached
                const cacheKey = `${selectedChild}-${subj.subject}`;
                if (!subjectSummaries[cacheKey]) {
                  setLoadingSummary(subj.subject);
                  generateSubjectSummary(selectedChild, subj.subject).then(s => {
                    if (s) setSubjectSummaries(prev => ({ ...prev, [cacheKey]: s }));
                    setLoadingSummary(null);
                  });
                }
              }}
              activeOpacity={0.8}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 19, color: INK }}>{subj.subject}</Text>
                <View style={[s.subjBand, { backgroundColor: band.bg }]}>
                  <Text style={[s.subjBandTxt, { color: band.colour }]}>{band.label}</Text>
                </View>
              </View>
              <View style={s.subjBarWrap}>
                <View style={[s.subjBar, { width: `${pct}%`, backgroundColor: barColour }]} />
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4, marginBottom: 4 }}>
                <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 14, color: INK4 }}>{subj.total_sessions ?? 0} sessions {'·'} {subj.total_minutes ?? 0}m</Text>
                <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: statusColour }}>{subj.status_label}</Text>
              </View>
              {subj.notes ? <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 15, color: INK4, lineHeight: 22, marginTop: 2 }}>{subj.notes}</Text> : null}

              {/* Expanded — Zaeli summary + recent sessions for this subject */}
              {isExpanded && (
                <View style={{ marginTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.06)', paddingTop: 10 }}>
                  {/* Zaeli AI summary */}
                  <View style={{ backgroundColor: '#F8F6FF', borderRadius: 10, padding: 10, borderLeftWidth: 3, borderLeftColor: '#A8E8CC', marginBottom: 10 }}>
                    <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase', color: TUTOR_PURPLE, marginBottom: 4 }}>{'\u2726'} Zaeli's take</Text>
                    {loadingSummary === subj.subject ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 }}>
                        <ActivityIndicator size="small" color={TUTOR_PURPLE} />
                        <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 15, color: INK4 }}>Zaeli is reviewing sessions...</Text>
                      </View>
                    ) : (
                      <View>
                        {(subjectSummaries[`${selectedChild}-${subj.subject}`] ?? `${subjSessions.length} session${subjSessions.length === 1 ? '' : 's'} in ${subj.subject}. Tap to generate Zaeli's analysis.`).split('\n').filter((p: string) => p.trim()).map((para: string, pi: number) => (
                          <Text key={pi} style={{ fontFamily: 'Poppins_400Regular', fontSize: 15, color: INK, lineHeight: 23, marginBottom: 8 }}>{para.trim()}</Text>
                        ))}
                      </View>
                    )}
                  </View>

                  {/* Recent sessions for this subject */}
                  {subjSessions.slice(0, 3).map((sess: any, i: number) => {
                    const title = sess.topic && sess.topic !== 'Zaeli picks' ? sess.topic : sess.pillar ?? 'Session';
                    const dur = sess.duration_seconds ? `${Math.round(sess.duration_seconds / 60)}m` : '';
                    return (
                      <TouchableOpacity
                        key={sess.id ?? i}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 7, borderBottomWidth: i < Math.min(subjSessions.length, 3) - 1 ? 1 : 0, borderBottomColor: 'rgba(0,0,0,0.05)' }}
                        onPress={() => { setReviewSessionId(sess.id); setChildDetailView('session-review'); }}
                        activeOpacity={0.76}
                      >
                        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: barColour }} />
                        <Text style={{ fontFamily: 'Poppins_500Medium', fontSize: 15, color: INK, flex: 1 }} numberOfLines={1}>{title}</Text>
                        <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 13, color: INK4 }}>{sessWhen(sess.created_at)}{dur ? ` · ${dur}` : ''}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        {/* All sessions list */}
        {liveSessions.length > 0 && (
          <>
            <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 14, textTransform: 'uppercase', letterSpacing: 1, color: INK4, paddingHorizontal: 18, marginTop: 6, marginBottom: 8 }}>All sessions</Text>
            {liveSessions.map((sess: any, i: number) => {
              const dotColour = SUBJ_COLOURS[sess.subject] ?? member.colour;
              const title = sess.topic && sess.topic !== 'Zaeli picks' ? sess.topic : sess.subject ? `${sess.pillar ?? 'Session'} — ${sess.subject}` : sess.pillar ?? 'Session';
              const dur = sess.duration_seconds ? `${Math.round(sess.duration_seconds / 60)}m` : '';
              return (
                <TouchableOpacity
                  key={sess.id ?? i}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: 12, marginHorizontal: 14, marginBottom: 6, padding: 12 }}
                  onPress={() => { setReviewSessionId(sess.id); setChildDetailView('session-review'); }}
                  activeOpacity={0.76}
                >
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dotColour }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: INK }} numberOfLines={1}>{title}</Text>
                    <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 13, color: INK4 }}>{sessWhen(sess.created_at)} {'·'} {sess.subject ?? sess.pillar}{dur ? ` · ${dur}` : ''}</Text>
                  </View>
                  <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: TUTOR_PURPLE }}>View {'→'}</Text>
                </TouchableOpacity>
              );
            })}
          </>
        )}

        {totalSessions === 0 && (
          <View style={{ alignItems: 'center', paddingTop: 40 }}>
            <Text style={{ fontSize: 32, marginBottom: 8 }}>{'\u{1F4DA}'}</Text>
            <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 16, color: INK4 }}>No sessions yet</Text>
          </View>
        )}
      </ScrollView>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SESSION REVIEW VIEW — Screen 10 from mockup
  // Parent sees: Zaeli summary, stats, topic tags, full transcript
  // ══════════════════════════════════════════════════════════════════════════
  function SessionReviewView() {
    const member = FAMILY[selectedChild];
    const allSessions = dbTutorSessions[selectedChild] ?? [];
    const session = allSessions.find((s: any) => s.id === reviewSessionId);
    const messages = dbTutorMessages[reviewSessionId ?? ''] ?? [];

    if (!session) {
      return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8F6FF' }}>
          <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 16, color: INK4 }}>Session not found</Text>
          <TouchableOpacity onPress={() => setChildDetailView('progress')} style={{ marginTop: 16 }}>
            <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 16, color: TUTOR_PURPLE }}>{'←'} Back to progress</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const duration = session.duration_seconds ? `${Math.round(session.duration_seconds / 60)} min` : '';
    const title = session.topic && session.topic !== 'Zaeli picks' ? session.topic : session.subject ? `${session.pillar ?? 'Session'} — ${session.subject}` : session.pillar ?? 'Session';
    const msgCount = messages.length;
    const hints = session.hints_used ?? 0;
    const questions = session.question_count ?? 0;
    const photos = messages.filter((m: any) => m.message_type === 'photo').length;

    // Generate summary from transcript
    const zaeliMsgs = messages.filter((m: any) => m.role === 'zaeli');
    const childMsgs = messages.filter((m: any) => m.role === 'child');

    function sessWhen(iso: string) {
      const d = new Date(iso);
      const diff = Math.floor((Date.now() - d.getTime()) / 86400000);
      if (diff === 0) return 'Today';
      if (diff === 1) return 'Yesterday';
      return d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });
    }

    return (
      <ScrollView style={{ flex: 1, backgroundColor: '#F8F6FF' }} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={{ backgroundColor: '#D8CCFF', paddingBottom: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 10, marginBottom: 8 }}>
            <TouchableOpacity style={s.backBtn} onPress={() => setChildDetailView('progress')} activeOpacity={0.7}>
              <IcoBack />
            </TouchableOpacity>
            <View style={[s.avatar, { backgroundColor: member.colour, width: 26, height: 26 }]}>
              <Text style={[s.avatarTxt, { fontSize: 12 }]}>{member.initial}</Text>
            </View>
            <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 14, color: INK4 }}>{selectedChild} {'·'} {sessWhen(session.created_at)}</Text>
          </View>

          <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 20, color: INK, paddingHorizontal: 16, marginBottom: 3, letterSpacing: -0.3 }}>{title}</Text>
          <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 14, color: INK4, paddingHorizontal: 16 }}>
            {session.pillar ?? 'Practice'} {'·'} {session.subject ?? ''}{duration ? ` · ${duration}` : ''} {'·'} {msgCount} messages
          </Text>

          {/* Stats row */}
          <View style={{ flexDirection: 'row', gap: 6, paddingHorizontal: 16, marginTop: 10 }}>
            {questions > 0 && (
              <View style={{ backgroundColor: 'rgba(255,255,255,0.55)', borderRadius: 10, paddingVertical: 7, paddingHorizontal: 10, flex: 1, alignItems: 'center' }}>
                <Text style={{ fontFamily: 'Poppins_800ExtraBold', fontSize: 18, color: TUTOR_PURPLE }}>{questions}</Text>
                <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 10, color: INK4, textTransform: 'uppercase', letterSpacing: 0.3 }}>Questions</Text>
              </View>
            )}
            <View style={{ backgroundColor: 'rgba(255,255,255,0.55)', borderRadius: 10, paddingVertical: 7, paddingHorizontal: 10, flex: 1, alignItems: 'center' }}>
              <Text style={{ fontFamily: 'Poppins_800ExtraBold', fontSize: 18, color: TUTOR_PURPLE }}>{hints}</Text>
              <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 10, color: INK4, textTransform: 'uppercase', letterSpacing: 0.3 }}>Hints used</Text>
            </View>
            {photos > 0 && (
              <View style={{ backgroundColor: 'rgba(255,255,255,0.55)', borderRadius: 10, paddingVertical: 7, paddingHorizontal: 10, flex: 1, alignItems: 'center' }}>
                <Text style={{ fontFamily: 'Poppins_800ExtraBold', fontSize: 18, color: TUTOR_PURPLE }}>{photos}</Text>
                <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 10, color: INK4, textTransform: 'uppercase', letterSpacing: 0.3 }}>Photos</Text>
              </View>
            )}
            <View style={{ backgroundColor: 'rgba(255,255,255,0.55)', borderRadius: 10, paddingVertical: 7, paddingHorizontal: 10, flex: 1, alignItems: 'center' }}>
              <Text style={{ fontFamily: 'Poppins_800ExtraBold', fontSize: 18, color: '#22C55E' }}>{'\u2713'}</Text>
              <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 10, color: INK4, textTransform: 'uppercase', letterSpacing: 0.3 }}>Done</Text>
            </View>
          </View>
        </View>

        {/* Zaeli AI summary card */}
        <View style={{ backgroundColor: '#fff', borderRadius: 14, marginHorizontal: 14, marginTop: 12, padding: 13, borderLeftWidth: 4, borderLeftColor: '#A8E8CC' }}>
          <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: TUTOR_PURPLE, marginBottom: 5 }}>{'\u2726'} Zaeli's summary</Text>
          {loadingSummary === session.id ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 }}>
              <ActivityIndicator size="small" color={TUTOR_PURPLE} />
              <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 16, color: INK4 }}>Zaeli is writing the summary...</Text>
            </View>
          ) : (session.summary || sessionSummaries[session.id]) ? (
            <View>
              {(session.summary ?? sessionSummaries[session.id] ?? '').split('\n').filter((p: string) => p.trim()).map((para: string, pi: number) => (
                <Text key={pi} style={{ fontFamily: 'Poppins_400Regular', fontSize: 16, color: INK, lineHeight: 25, marginBottom: 8 }}>{para.trim()}</Text>
              ))}
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => {
                setLoadingSummary(session.id);
                generateSessionSummary(session.id).then(s => {
                  if (s) setSessionSummaries(prev => ({ ...prev, [session.id]: s }));
                  setLoadingSummary(null);
                });
              }}
              style={{ backgroundColor: 'rgba(80,32,192,0.08)', borderRadius: 8, paddingVertical: 8, alignItems: 'center' }}
              activeOpacity={0.76}
            >
              <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: TUTOR_PURPLE }}>Generate summary</Text>
            </TouchableOpacity>
          )}
            {/* Topic tags */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
              {session.subject && <View style={{ backgroundColor: '#EDE8FF', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}><Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 11, color: TUTOR_PURPLE }}>{session.subject}</Text></View>}
              {session.topic && session.topic !== 'Zaeli picks' && <View style={{ backgroundColor: '#EDE8FF', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}><Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 11, color: TUTOR_PURPLE }}>{session.topic}</Text></View>}
              {session.difficulty_band && <View style={{ backgroundColor: '#EDE8FF', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}><Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 11, color: TUTOR_PURPLE }}>{session.difficulty_band}</Text></View>}
            </View>
          </View>
        )}

        {/* Full transcript */}
        {messages.length > 0 && (
          <View style={{ paddingHorizontal: 16, marginTop: 14 }}>
            <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', color: INK4, marginBottom: 8 }}>Full transcript</Text>
            {messages.map((msg: any, i: number) => {
              const isZaeli = msg.role === 'zaeli';
              return (
                <View key={i} style={{ flexDirection: 'row', gap: 8, marginBottom: 8, alignItems: 'flex-start' }}>
                  <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 10, letterSpacing: 0.5, textTransform: 'uppercase', width: 36, paddingTop: 4, color: isZaeli ? TUTOR_PURPLE : member.colour }}>{isZaeli ? 'Zaeli' : selectedChild.slice(0, 5)}</Text>
                  <View style={{ flex: 1, backgroundColor: '#fff', borderRadius: 9, padding: 8, borderLeftWidth: 2, borderLeftColor: isZaeli ? '#A8E8CC' : member.colour }}>
                    <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 14, color: INK, lineHeight: 21 }}>{msg.content}</Text>
                    {msg.hint_level ? <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 11, color: '#F59E0B', marginTop: 3 }}>{'\u{1F4A1}'} Hint {msg.hint_level} used</Text> : null}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {messages.length === 0 && (
          <View style={{ alignItems: 'center', paddingTop: 30 }}>
            <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 16, color: INK4 }}>No transcript available for this session</Text>
          </View>
        )}
      </ScrollView>
    );
  }

  // ── Jobs & Rewards Tab ──
  function JobsRewardsTab() {
    const today = localDateStr();
    const activeJobs = dbJobs.filter((j: any) => !j.is_complete || j.type === 'daily');
    const completedJobs = dbJobs.filter((j: any) => j.is_complete && j.type !== 'daily');

    return (
      <ScrollView ref={jobsScrollRef} style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: 14 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Add buttons */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10, marginTop: 6 }}>
          <TouchableOpacity onPress={() => { setAddTitle(''); setAddEmoji(''); setAddPoints(10); setAddType('oneoff'); setAddSelectedKids([]); setShowAddForm(showAddForm === 'job' ? null : 'job'); }} style={{ flex: 1, backgroundColor: HUB_GREEN, borderRadius: 14, paddingVertical: 14, alignItems: 'center' }} activeOpacity={0.8}>
            <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 15, color: HUB_DARK }}>+ Add a Job</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setAddTitle(''); setAddEmoji(''); setAddPoints(100); setAddSelectedKids([]); setShowAddForm(showAddForm === 'reward' ? null : 'reward'); }} style={{ flex: 1, backgroundColor: 'rgba(161,24,48,0.10)', borderRadius: 14, paddingVertical: 14, alignItems: 'center' }} activeOpacity={0.8}>
            <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 15, color: RED_ACCENT }}>+ Add a Reward</Text>
          </TouchableOpacity>
        </View>

        {/* Inline add form */}
        {showAddForm && (
          <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 10 }}>
            <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 17, color: INK, marginBottom: 12 }}>{editingJob ? (showAddForm === 'job' ? 'Edit job' : 'Edit reward') : (showAddForm === 'job' ? 'Add a job' : 'Add a reward')}</Text>

            <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 10, color: INK4, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>For which kids?</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
              {(['Poppy', 'Gab', 'Duke'] as ChildName[]).map(name => {
                const sel = addSelectedKids.includes(name);
                const mem = FAMILY[name];
                return (
                  <TouchableOpacity key={name} onPress={() => setAddSelectedKids(prev => sel ? prev.filter(n => n !== name) : [...prev, name])} style={{ alignItems: 'center', gap: 3 }} activeOpacity={0.75}>
                    <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: mem.colour, alignItems: 'center', justifyContent: 'center', borderWidth: sel ? 3 : 0, borderColor: sel ? (showAddForm === 'job' ? HUB_DARK : RED_ACCENT) : 'transparent', opacity: sel ? 1 : 0.35 }}>
                      <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 15, color: '#fff' }}>{mem.initial}</Text>
                    </View>
                    <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 10, color: sel ? INK : INK4 }}>{name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Past items */}
            {showAddForm === 'job' && dbJobs.length > 0 && (
              <>
                <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 10, color: INK4, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Past jobs</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    {[...new Set(dbJobs.map((j: any) => j.title))].slice(0, 8).map((title: string) => {
                      const job = dbJobs.find((j: any) => j.title === title);
                      return (
                        <TouchableOpacity key={title} onPress={() => { setAddTitle(title); setAddPoints(job?.points || 10); }} style={{ backgroundColor: addTitle === title ? HUB_DARK : 'rgba(0,0,0,0.05)', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12 }} activeOpacity={0.75}>
                          <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 12, color: addTitle === title ? '#fff' : INK4 }}>{job?.emoji || ''} {title}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>
              </>
            )}
            {showAddForm === 'reward' && dbRewards.length > 0 && (
              <>
                <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 10, color: INK4, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Existing rewards</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    {[...new Set(dbRewards.map((r: any) => r.title))].slice(0, 8).map((title: string) => {
                      const rw = dbRewards.find((r: any) => r.title === title);
                      return (
                        <TouchableOpacity key={title} onPress={() => { setAddTitle(title); setAddPoints(rw?.cost || 100); }} style={{ backgroundColor: addTitle === title ? RED_ACCENT : 'rgba(0,0,0,0.05)', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12 }} activeOpacity={0.75}>
                          <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 12, color: addTitle === title ? '#fff' : INK4 }}>{rw?.emoji || ''} {title}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>
              </>
            )}

            <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 10, color: INK4, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>{showAddForm === 'job' ? 'Job title' : 'Reward name'}</Text>
            <TextInput style={{ backgroundColor: 'rgba(0,0,0,0.04)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontFamily: 'Poppins_400Regular', fontSize: 15, color: INK, marginBottom: 10 }} placeholder={showAddForm === 'job' ? 'e.g. Vacuum the lounge' : 'e.g. Extra screen time'} placeholderTextColor="rgba(0,0,0,0.25)" value={addTitle} onChangeText={setAddTitle}/>

            <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 10, color: INK4, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>{showAddForm === 'job' ? 'Points' : 'Point cost'}</Text>
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 10 }}>
              {(showAddForm === 'job' ? [5,10,15,20,30,50] : [50,100,150,250,500]).map(p => (
                <TouchableOpacity key={p} onPress={() => setAddPoints(p)} style={{ flex: 1, paddingVertical: 9, borderRadius: 10, backgroundColor: addPoints === p ? (showAddForm === 'job' ? HUB_DARK : RED_ACCENT) : 'rgba(0,0,0,0.04)', alignItems: 'center' }} activeOpacity={0.75}>
                  <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 13, color: addPoints === p ? '#fff' : INK4 }}>{p}</Text>
                </TouchableOpacity>
              ))}
              <TextInput style={{ flex: 1, borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.10)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 7, fontFamily: 'Poppins_700Bold', fontSize: 13, color: INK, textAlign: 'center' }} placeholder="Other" placeholderTextColor="rgba(0,0,0,0.20)" keyboardType="number-pad" onChangeText={v => { const n = parseInt(v); if (n > 0) setAddPoints(n); }}/>
            </View>

            {showAddForm === 'job' && (
              <>
                <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 10, color: INK4, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Type</Text>
                <View style={{ flexDirection: 'row', gap: 6, marginBottom: 10 }}>
                  {(['daily','weekly','oneoff'] as const).map(t => (
                    <TouchableOpacity key={t} onPress={() => setAddType(t)} style={{ flex: 1, paddingVertical: 9, borderRadius: 10, backgroundColor: addType === t ? HUB_DARK : 'rgba(0,0,0,0.04)', alignItems: 'center' }} activeOpacity={0.75}>
                      <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 12, color: addType === t ? '#fff' : INK4 }}>{t === 'oneoff' ? 'One-off' : t.charAt(0).toUpperCase() + t.slice(1)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity onPress={() => {
                if (editingJob) { showAddForm === 'job' ? saveEditedJob() : saveEditedReward(); }
                else { showAddForm === 'job' ? addJobForChildren() : addRewardForChildren(); }
              }} style={{ flex: 1, backgroundColor: addTitle.trim() ? (showAddForm === 'job' ? HUB_DARK : RED_ACCENT) : 'rgba(0,0,0,0.08)', borderRadius: 14, paddingVertical: 14, alignItems: 'center' }} activeOpacity={0.8}>
                <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 15, color: addTitle.trim() ? '#fff' : 'rgba(0,0,0,0.30)' }}>
                  {editingJob ? 'Save Changes' : (showAddForm === 'job' ? 'Add Job' : 'Add Reward')}{!editingJob && addSelectedKids.length > 0 ? ` for ${addSelectedKids.join(' & ')}` : ''}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setShowAddForm(null); setEditingJob(null); setAddTitle(''); setAddEmoji(''); setAddSelectedKids([]); }} style={{ paddingVertical: 14, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center' }} activeOpacity={0.7}>
                <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: INK4 }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Active jobs */}
        <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 10, color: 'rgba(0,0,0,0.30)', textTransform: 'uppercase', letterSpacing: 0.1, marginTop: 6, marginBottom: 6 }}>Active jobs</Text>
        {activeJobs.length === 0 ? (
          <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 13, color: INK4, fontStyle: 'italic', marginBottom: 10 }}>No active jobs. Add one above!</Text>
        ) : activeJobs.map((job: any) => {
          const mem = FAMILY[job.child_name as keyof typeof FAMILY];
          const isExp = expandedJobId === job.id;
          return (
            <View key={job.id} style={{ backgroundColor: '#fff', borderRadius: 16, marginBottom: 6, overflow: 'hidden' }}>
              <TouchableOpacity onPress={() => setExpandedJobId(isExp ? null : job.id)} style={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }} activeOpacity={0.75}>
                <Text style={{ fontSize: 24 }}>{job.emoji || '📋'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 16, color: INK }}>{job.title}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 }}>
                      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: mem?.colour || '#999' }}/>
                      <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 12, color: INK4 }}>{job.child_name}</Text>
                    </View>
                    <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 13, color: HUB_DARK }}>{job.points} pts</Text>
                  </View>
                </View>
                <View style={{ backgroundColor: job.type === 'daily' ? 'rgba(168,232,204,0.25)' : job.type === 'weekly' ? 'rgba(245,158,11,0.15)' : 'rgba(0,0,0,0.06)', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4 }}>
                  <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.04, color: job.type === 'daily' ? HUB_DARK : job.type === 'weekly' ? '#92400E' : INK4 }}>{job.type === 'oneoff' ? 'one-off' : job.type}</Text>
                </View>
              </TouchableOpacity>
              {isExp && (
                <View style={{ borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.06)', padding: 12, flexDirection: 'row', gap: 8, justifyContent: 'flex-end' }}>
                  <TouchableOpacity onPress={() => { setExpandedJobId(null); openEditJob(job); }} style={{ backgroundColor: HUB_GREEN, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 16 }} activeOpacity={0.75}>
                    <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: HUB_DARK }}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => { setExpandedJobId(null); deleteJob(job.id); }} style={{ backgroundColor: 'rgba(255,59,59,0.08)', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 16 }} activeOpacity={0.75}>
                    <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: '#FF3B3B' }}>Delete</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}

        {/* Active rewards */}
        <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 10, color: 'rgba(0,0,0,0.30)', textTransform: 'uppercase', letterSpacing: 0.1, marginTop: 10, marginBottom: 6 }}>Active rewards</Text>
        {dbRewards.length === 0 ? (
          <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 13, color: INK4, fontStyle: 'italic', marginBottom: 10 }}>No rewards set up yet.</Text>
        ) : dbRewards.map((rw: any) => {
          const mem = FAMILY[rw.child_name as keyof typeof FAMILY];
          const isExp = expandedJobId === ('r-' + rw.id);
          return (
            <View key={rw.id} style={{ backgroundColor: '#fff', borderRadius: 16, marginBottom: 6, overflow: 'hidden' }}>
              <TouchableOpacity onPress={() => setExpandedJobId(isExp ? null : 'r-' + rw.id)} style={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }} activeOpacity={0.75}>
                <Text style={{ fontSize: 24 }}>{rw.emoji || '🎁'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 16, color: INK }}>{rw.title}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start', marginTop: 3 }}>
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: mem?.colour || '#999' }}/>
                    <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 12, color: INK4 }}>{rw.child_name}</Text>
                  </View>
                </View>
                <Text style={{ fontFamily: 'Poppins_800ExtraBold', fontSize: 15, color: RED_ACCENT }}>{rw.cost} pts</Text>
              </TouchableOpacity>
              {isExp && (
                <View style={{ borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.06)', padding: 12, flexDirection: 'row', gap: 8, justifyContent: 'flex-end' }}>
                  <TouchableOpacity onPress={() => { setExpandedJobId(null); openEditReward(rw); }} style={{ backgroundColor: 'rgba(161,24,48,0.08)', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 16 }} activeOpacity={0.75}>
                    <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: RED_ACCENT }}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => { setExpandedJobId(null); deleteReward(rw.id); }} style={{ backgroundColor: 'rgba(255,59,59,0.08)', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 16 }} activeOpacity={0.75}>
                    <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: '#FF3B3B' }}>Delete</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}

        {/* Completed jobs toggle */}
        {completedJobs.length > 0 && (
          <>
            <TouchableOpacity onPress={() => setShowCompletedJobs(v => !v)} style={{ backgroundColor: 'rgba(0,0,0,0.04)', borderRadius: 12, padding: 10, alignItems: 'center', marginTop: 10 }} activeOpacity={0.7}>
              <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: INK4 }}>{showCompletedJobs ? 'Hide' : 'Show'} completed jobs ({completedJobs.length})</Text>
            </TouchableOpacity>
            {showCompletedJobs && completedJobs.slice(0, 20).map((job: any) => {
              const mem = FAMILY[job.child_name as keyof typeof FAMILY];
              const isExp = expandedJobId === ('c-' + job.id);
              return (
                <View key={job.id} style={{ backgroundColor: '#fff', borderRadius: 14, marginTop: 6, overflow: 'hidden', opacity: 0.6 }}>
                  <TouchableOpacity onPress={() => setExpandedJobId(isExp ? null : 'c-' + job.id)} style={{ padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }} activeOpacity={0.75}>
                    <Text style={{ fontSize: 18 }}>{job.emoji || '📋'}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: INK, textDecorationLine: 'line-through' }}>{job.title}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: mem?.colour || '#999' }}/>
                        <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 11, color: INK4 }}>{job.child_name} +{job.points} pts</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                  {isExp && (
                    <View style={{ borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.06)', padding: 12, flexDirection: 'row', gap: 8, justifyContent: 'flex-end' }}>
                      <TouchableOpacity onPress={() => { setExpandedJobId(null); openEditJob(job); }} style={{ backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 16 }} activeOpacity={0.75}>
                        <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: INK4 }}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => { reactivateJob(job); setExpandedJobId(null); }} style={{ backgroundColor: HUB_GREEN, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 16 }} activeOpacity={0.75}>
                        <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: HUB_DARK }}>Reactivate</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => { deleteJob(job.id); setExpandedJobId(null); }} style={{ backgroundColor: 'rgba(255,59,59,0.08)', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 16 }} activeOpacity={0.75}>
                        <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: '#FF3B3B' }}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}
          </>
        )}
      </ScrollView>
    );
  }

  // ── Family Tab ──
  // Helper to render a field row
  // Editable field state
  const [editFieldKey, setEditFieldKey] = useState<string | null>(null);
  const [editFieldValue, setEditFieldValue] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [profileDate, setProfileDate] = useState(new Date());
  const [profileColour, setProfileColour] = useState<string | null>(null);
  const [profileAccess, setProfileAccess] = useState<'dedicated' | 'shared' | null>(null);

  function FieldRow({ icon, label, value, fieldKey }: { icon: string; label: string; value?: string; fieldKey?: string }) {
    const isEditing = editFieldKey === fieldKey;
    return (
      <TouchableOpacity onPress={() => {
        if (fieldKey) {
          if (isEditing) { setEditFieldKey(null); }
          else { setEditFieldKey(fieldKey); setEditFieldValue(value || ''); }
        }
      }} style={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.04)' }} activeOpacity={fieldKey ? 0.7 : 1}>
        <Text style={{ fontSize: 18, width: 26, textAlign: 'center' }}>{icon}</Text>
        <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: INK, flex: 1 }}>{label}</Text>
        {isEditing ? (
          <TextInput
            autoFocus
            style={{ fontFamily: 'Poppins_400Regular', fontSize: 15, color: INK, backgroundColor: 'rgba(0,0,0,0.04)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, minWidth: 120, textAlign: 'right' }}
            value={editFieldValue}
            onChangeText={setEditFieldValue}
            onBlur={() => setEditFieldKey(null)}
            returnKeyType="done"
            onSubmitEditing={() => setEditFieldKey(null)}
          />
        ) : (
          <>
            {value && <Text style={{ fontFamily: 'Poppins_500Medium', fontSize: 14, color: INK4, maxWidth: 170, textAlign: 'right' }}>{value}</Text>}
            {fieldKey && <Text style={{ fontSize: 15, color: 'rgba(0,0,0,0.18)', marginLeft: 4 }}>›</Text>}
          </>
        )}
      </TouchableOpacity>
    );
  }

  function FamilyTab() {
    // Profile detail view
    if (familyView === 'profile' && profileMember) {
      const mem = FAMILY[profileMember as keyof typeof FAMILY];
      if (!mem) { setFamilyView('list'); return null; }
      const isChild = (mem as any).role === 'child';
      const year = (mem as any).year;
      const age = (mem as any).age;
      const dob = (mem as any).dob;
      const login = (mem as any).loginStatus;
      const roleTitle = isChild ? ((mem as any).year ? (profileMember === 'Poppy' ? 'Daughter' : 'Son') : 'Child') : 'Parent';

      return (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {/* Back */}
          <TouchableOpacity onPress={() => setFamilyView('list')} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 8 }} activeOpacity={0.7}>
            <Text style={{ fontSize: 18, color: INK4 }}>‹</Text>
            <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: INK4 }}>Back</Text>
          </TouchableOpacity>

          {/* Avatar hero */}
          <View style={{ alignItems: 'center', paddingVertical: 16 }}>
            <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: mem.colour, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontFamily: 'Poppins_800ExtraBold', fontSize: 28, color: '#fff' }}>{mem.initial}</Text>
            </View>
            <Text style={{ fontFamily: 'Poppins_800ExtraBold', fontSize: 24, color: INK, marginTop: 10 }}>{profileMember}</Text>
            <Text style={{ fontFamily: 'Poppins_500Medium', fontSize: 15, color: INK4, marginTop: 3 }}>
              {roleTitle}{isChild && year ? ` · Year ${year} · Age ${age}` : ''}
            </Text>
          </View>

          <View style={{ paddingHorizontal: 14 }}>
            {/* Personal info */}
            <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 11, color: 'rgba(0,0,0,0.30)', textTransform: 'uppercase', letterSpacing: 0.1, marginBottom: 6 }}>Personal info</Text>
            <View style={{ backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', marginBottom: 10 }}>
              {[
                { icon: '👤', label: 'Full name', value: profileMember || '', key: 'name' },
                { icon: '💬', label: 'Nickname', value: profileMember === 'Richard' ? 'Rich' : (profileMember || ''), key: 'nickname' },
                { icon: '📝', label: 'Role title', value: roleTitle, key: 'role' },
                ...(dob ? [{ icon: '🎂', label: 'Date of birth', value: dob, key: 'dob' }] : []),
                ...(isChild && year ? [{ icon: '🎓', label: 'Year level', value: `Year ${year}`, key: 'year' }] : []),
                ...((mem as any).email ? [{ icon: '📧', label: 'Email', value: (mem as any).email, key: 'email' }] : []),
              ].map(field => (
                <TouchableOpacity key={field.key} onPress={() => {
                  if (field.key === 'dob') { setShowDatePicker(true); return; }
                  if (editFieldKey === field.key) setEditFieldKey(null);
                  else { setEditFieldKey(field.key); setEditFieldValue(field.value); }
                }} style={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.04)' }} activeOpacity={0.7}>
                  <Text style={{ fontSize: 18, width: 26, textAlign: 'center' }}>{field.icon}</Text>
                  <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: INK, flex: 1 }}>{field.label}</Text>
                  {editFieldKey === field.key && field.key !== 'dob' ? (
                    <TextInput
                      key={`input-${field.key}`}
                      autoFocus
                      style={{ fontFamily: 'Poppins_400Regular', fontSize: 15, color: INK, backgroundColor: 'rgba(0,0,0,0.04)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, minWidth: 120, textAlign: 'right' }}
                      value={editFieldValue}
                      onChangeText={setEditFieldValue}
                      returnKeyType="done"
                      onSubmitEditing={() => setEditFieldKey(null)}
                    />
                  ) : (
                    <>
                      <Text style={{ fontFamily: 'Poppins_500Medium', fontSize: 14, color: INK4, maxWidth: 170, textAlign: 'right' }}>{field.value}</Text>
                      <Text style={{ fontSize: 15, color: 'rgba(0,0,0,0.18)', marginLeft: 4 }}>›</Text>
                    </>
                  )}
                </TouchableOpacity>
              ))}
              {/* Date picker */}
              {showDatePicker && (
                <DateTimePicker
                  value={profileDate}
                  mode="date"
                  display="spinner"
                  onChange={(e: any, date?: Date) => {
                    setShowDatePicker(false);
                    if (date) setProfileDate(date);
                  }}
                />
              )}
            </View>

            {/* Colour */}
            <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 11, color: 'rgba(0,0,0,0.30)', textTransform: 'uppercase', letterSpacing: 0.1, marginBottom: 6 }}>Colour</Text>
            <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                {COLOUR_OPTIONS.map(c => {
                  const isSelected = (profileColour || mem.colour) === c;
                  return (
                    <TouchableOpacity key={c} onPress={() => setProfileColour(c)} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: c, ...(isSelected ? { borderWidth: 3, borderColor: '#fff', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } } : {}) }} activeOpacity={0.7}/>
                  );
                })}
              </View>
            </View>

            {/* Access */}
            <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 11, color: 'rgba(0,0,0,0.30)', textTransform: 'uppercase', letterSpacing: 0.1, marginBottom: 6 }}>Access</Text>
            {isChild ? (
              <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <Text style={{ fontSize: 20 }}>🔑</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 14, color: INK }}>How does {profileMember} use Zaeli?</Text>
                    <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 11, color: INK4, lineHeight: 16 }}>Dedicated = own login. Shared = uses your device.</Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {(['dedicated', 'shared'] as const).map(opt => {
                    const currentAccess = profileAccess || (login === 'own' ? 'dedicated' : 'shared');
                    const isOn = currentAccess === opt;
                    return (
                      <TouchableOpacity key={opt} onPress={() => setProfileAccess(opt)} style={{ flex: 1, borderWidth: 1.5, borderColor: isOn ? HUB_DARK : 'rgba(0,0,0,0.10)', backgroundColor: isOn ? 'rgba(10,64,48,0.06)' : 'transparent', borderRadius: 12, padding: 12, alignItems: 'center' }} activeOpacity={0.75}>
                        <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 14, color: isOn ? HUB_DARK : INK4 }}>{opt === 'dedicated' ? 'Dedicated' : 'Shared'}</Text>
                        <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 10, color: INK4 }}>{opt === 'dedicated' ? 'Own login' : 'Parent device'}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ) : (
              <View style={{ backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', marginBottom: 10 }}>
                <FieldRow icon="🔐" label="Access level" value="Full Admin" />
                <FieldRow icon="✅" label="Login status" value="Full account" />
              </View>
            )}

            {/* Tutor (kids only) */}
            {isChild && (
              <>
                <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 11, color: 'rgba(0,0,0,0.30)', textTransform: 'uppercase', letterSpacing: 0.1, marginBottom: 6 }}>Tutor</Text>
                <View style={{ backgroundColor: 'rgba(80,32,192,0.06)', borderWidth: 1.5, borderColor: 'rgba(80,32,192,0.12)', borderRadius: 16, padding: 14, marginBottom: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Text style={{ fontSize: 18 }}>📚</Text>
                    <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 14, color: TUTOR_PURPLE, flex: 1 }}>
                      {(mem as any).tutorActive ? 'Tutor enrolled' : 'Tutor not enrolled'}
                    </Text>
                    <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 11, color: 'rgba(80,32,192,0.6)' }}>A$9.99/month</Text>
                  </View>
                  {(mem as any).tutorActive && (
                    <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 11, color: 'rgba(80,32,192,0.5)', marginTop: 4, lineHeight: 16 }}>
                      Year {year} Australian curriculum
                    </Text>
                  )}
                </View>
              </>
            )}

            {/* Save button */}
            <TouchableOpacity onPress={() => {
              // TODO: Save profile changes to Supabase when real data model is built
              setFamilyView('list');
            }} style={{ backgroundColor: HUB_DARK, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginBottom: 14, marginTop: 6 }} activeOpacity={0.8}>
              <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 16, color: '#fff' }}>Save changes</Text>
            </TouchableOpacity>

            {/* Danger zone */}
            <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 11, color: 'rgba(0,0,0,0.30)', textTransform: 'uppercase', letterSpacing: 0.1, marginBottom: 6 }}>Danger zone</Text>
            <View style={{ backgroundColor: 'rgba(255,59,59,0.04)', borderWidth: 1, borderColor: 'rgba(255,59,59,0.12)', borderRadius: 16, padding: 14, marginBottom: 10 }}>
              <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }} activeOpacity={0.7}>
                <Text style={{ fontSize: 16 }}>🗑</Text>
                <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: '#FF3B3B', flex: 1 }}>Remove {profileMember} from family</Text>
                <Text style={{ fontSize: 14, color: 'rgba(255,59,59,0.3)' }}>›</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      );
    }

    // Add member form
    if (familyView === 'add') {
      const ROLE_OPTS = ['Son', 'Daughter', 'Partner', 'Nana', 'Pop', 'Carer', 'Step-mum', 'Step-dad'];
      const YEAR_OPTS = ['Prep', 'Yr 1', 'Yr 2', 'Yr 3', 'Yr 4', 'Yr 5', 'Yr 6', 'Yr 7', 'Yr 8+'];
      return (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: 14 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => setFamilyView('list')} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 }} activeOpacity={0.7}>
            <Text style={{ fontSize: 18, color: INK4 }}>‹</Text>
            <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: INK4 }}>Back</Text>
          </TouchableOpacity>

          <View style={{ backgroundColor: '#fff', borderRadius: 18, padding: 18, marginTop: 6 }}>
            <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 18, color: INK, marginBottom: 4 }}>Add a family member</Text>
            <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 12, color: INK4, marginBottom: 14, lineHeight: 18 }}>5 of 8 members used. Add anyone who's part of your family.</Text>

            <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 10, color: INK4, textTransform: 'uppercase', letterSpacing: 0.05, marginBottom: 4 }}>Full name</Text>
            <TextInput style={{ backgroundColor: 'rgba(0,0,0,0.04)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontFamily: 'Poppins_400Regular', fontSize: 14, color: INK, marginBottom: 10 }} placeholder="e.g. Margaret" placeholderTextColor="rgba(0,0,0,0.25)" value={newName} onChangeText={setNewName}/>

            <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 10, color: INK4, textTransform: 'uppercase', letterSpacing: 0.05, marginBottom: 4 }}>Nickname (used in the app)</Text>
            <TextInput style={{ backgroundColor: 'rgba(0,0,0,0.04)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontFamily: 'Poppins_400Regular', fontSize: 14, color: INK, marginBottom: 10 }} placeholder="e.g. Nana" placeholderTextColor="rgba(0,0,0,0.25)" value={newNickname} onChangeText={setNewNickname}/>

            <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 10, color: INK4, textTransform: 'uppercase', letterSpacing: 0.05, marginBottom: 4 }}>Role in your family</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
              {ROLE_OPTS.map(r => (
                <TouchableOpacity key={r} onPress={() => setNewRole(r)} style={{ borderWidth: 1.5, borderColor: newRole === r ? HUB_DARK : 'rgba(0,0,0,0.10)', backgroundColor: newRole === r ? 'rgba(10,64,48,0.06)' : 'transparent', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14 }} activeOpacity={0.75}>
                  <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 12, color: newRole === r ? HUB_DARK : INK4 }}>{r}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput style={{ backgroundColor: 'rgba(0,0,0,0.04)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontFamily: 'Poppins_400Regular', fontSize: 12, color: INK, marginBottom: 10 }} placeholder="Or type a custom role..." placeholderTextColor="rgba(0,0,0,0.25)" value={ROLE_OPTS.includes(newRole) ? '' : newRole} onChangeText={setNewRole}/>

            <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 10, color: INK4, textTransform: 'uppercase', letterSpacing: 0.05, marginBottom: 4 }}>Date of birth</Text>
            <TextInput style={{ backgroundColor: 'rgba(0,0,0,0.04)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontFamily: 'Poppins_400Regular', fontSize: 14, color: INK, marginBottom: 10 }} placeholder="DD/MM/YYYY" placeholderTextColor="rgba(0,0,0,0.25)" value={newDob} onChangeText={setNewDob}/>

            <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 10, color: INK4, textTransform: 'uppercase', letterSpacing: 0.05, marginBottom: 4 }}>Year level (kids only)</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
              {YEAR_OPTS.map(y => (
                <TouchableOpacity key={y} onPress={() => setNewYear(y)} style={{ borderWidth: 1.5, borderColor: newYear === y ? HUB_DARK : 'rgba(0,0,0,0.10)', backgroundColor: newYear === y ? 'rgba(10,64,48,0.06)' : 'transparent', borderRadius: 10, paddingVertical: 7, paddingHorizontal: 12 }} activeOpacity={0.75}>
                  <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 12, color: newYear === y ? HUB_DARK : INK4 }}>{y}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 10, color: INK4, textTransform: 'uppercase', letterSpacing: 0.05, marginBottom: 4 }}>Colour</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
              {COLOUR_OPTIONS.map(c => (
                <TouchableOpacity key={c} onPress={() => setNewColour(c)} style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: c, ...(c === newColour ? { borderWidth: 2, borderColor: '#fff', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } } : {}) }} activeOpacity={0.75}/>
              ))}
            </View>

            <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 10, color: INK4, textTransform: 'uppercase', letterSpacing: 0.05, marginBottom: 4 }}>Access level</Text>
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 10 }}>
              {([['full','Full','Admin'],['dedicated','Dedicated','Own login'],['shared','Shared','Your device'],['view','View','Read only']] as const).map(([key, label, sub]) => (
                <TouchableOpacity key={key} onPress={() => setNewAccess(key as any)} style={{ flex: 1, borderWidth: 1.5, borderColor: newAccess === key ? HUB_DARK : 'rgba(0,0,0,0.10)', backgroundColor: newAccess === key ? 'rgba(10,64,48,0.06)' : 'transparent', borderRadius: 12, padding: 8, alignItems: 'center' }} activeOpacity={0.75}>
                  <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 11, color: newAccess === key ? HUB_DARK : INK4 }}>{label}</Text>
                  <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 8, color: INK4 }}>{sub}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 10, color: INK4, textTransform: 'uppercase', letterSpacing: 0.05, marginBottom: 4 }}>Email (optional — needed for own login)</Text>
            <TextInput style={{ backgroundColor: 'rgba(0,0,0,0.04)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontFamily: 'Poppins_400Regular', fontSize: 14, color: INK, marginBottom: 14 }} placeholder="email@example.com" placeholderTextColor="rgba(0,0,0,0.25)" value={newEmail} onChangeText={setNewEmail} keyboardType="email-address"/>

            <TouchableOpacity onPress={() => {
              // TODO: Save to Supabase when real auth is built
              setFamilyView('list');
              setNewName(''); setNewNickname(''); setNewRole(''); setNewDob(''); setNewYear(''); setNewEmail('');
            }} style={{ backgroundColor: newName.trim() ? HUB_DARK : 'rgba(0,0,0,0.08)', borderRadius: 14, paddingVertical: 14, alignItems: 'center' }} activeOpacity={0.8}>
              <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 15, color: newName.trim() ? '#fff' : 'rgba(0,0,0,0.30)' }}>Add to family</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      );
    }

    // List view (default)
    return (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: 14 }} showsVerticalScrollIndicator={false}>
        <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 10, color: 'rgba(0,0,0,0.30)', textTransform: 'uppercase', letterSpacing: 0.1, marginTop: 10, marginBottom: 6 }}>Parents</Text>
        {(['Rich', 'Anna'] as const).map(name => {
          const mem = FAMILY[name];
          return (
            <TouchableOpacity key={name} onPress={() => { setProfileMember(name); setFamilyView('profile'); }} style={{ backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 12 }} activeOpacity={0.75}>
              <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: mem.colour, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 17, color: '#fff' }}>{mem.initial}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 16, color: INK }}>{name}</Text>
                <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 12, color: INK4 }}>{(mem as any).email}</Text>
                <View style={{ backgroundColor: 'rgba(34,197,94,0.12)', borderRadius: 5, paddingHorizontal: 7, paddingVertical: 2, alignSelf: 'flex-start', marginTop: 3 }}>
                  <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 9, color: '#166534' }}>Full account</Text>
                </View>
              </View>
              <Text style={{ fontSize: 16, color: 'rgba(0,0,0,0.20)' }}>›</Text>
            </TouchableOpacity>
          );
        })}

        <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 10, color: 'rgba(0,0,0,0.30)', textTransform: 'uppercase', letterSpacing: 0.1, marginTop: 10, marginBottom: 6 }}>Kids</Text>
        {(['Poppy', 'Gab', 'Duke'] as ChildName[]).map(name => {
          const mem = FAMILY[name];
          const year = (mem as any).year;
          const age = (mem as any).age;
          const dob = (mem as any).dob;
          const login = (mem as any).loginStatus;
          return (
            <TouchableOpacity key={name} onPress={() => { setProfileMember(name); setFamilyView('profile'); }} style={{ backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 12 }} activeOpacity={0.75}>
              <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: mem.colour, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 17, color: '#fff' }}>{mem.initial}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 16, color: INK }}>{name}</Text>
                  <View style={{ backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: 7, paddingHorizontal: 8, paddingVertical: 2 }}>
                    <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 13, color: INK }}>Yr {year}</Text>
                  </View>
                </View>
                <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 12, color: INK4 }}>Age {age} {dob ? `· 🎂 ${dob}` : ''}</Text>
                {login === 'own' && <View style={{ backgroundColor: 'rgba(34,197,94,0.12)', borderRadius: 5, paddingHorizontal: 7, paddingVertical: 2, alignSelf: 'flex-start', marginTop: 3 }}><Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 9, color: '#166534' }}>Own Zaeli login</Text></View>}
                {login === 'invite' && <View style={{ backgroundColor: 'rgba(99,102,241,0.1)', borderRadius: 5, paddingHorizontal: 7, paddingVertical: 2, alignSelf: 'flex-start', marginTop: 3 }}><Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 9, color: '#4338CA' }}>+ Invite to Zaeli</Text></View>}
                {login === 'parent-device' && <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 10, color: INK4, marginTop: 3 }}>Uses parent's device</Text>}
              </View>
              <Text style={{ fontSize: 16, color: 'rgba(0,0,0,0.20)' }}>›</Text>
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity onPress={() => { setNewName(''); setNewNickname(''); setNewRole(''); setNewDob(''); setNewYear(''); setNewEmail(''); setNewColour('#EC4899'); setNewAccess('shared'); setFamilyView('add'); }} style={{ borderWidth: 1.5, borderStyle: 'dashed', borderColor: 'rgba(0,0,0,0.12)', borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 }} activeOpacity={0.7}>
          <Text style={{ fontSize: 18, opacity: 0.4 }}>+</Text>
          <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: 'rgba(0,0,0,0.38)' }}>Add a family member</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <RNStatusBar barStyle="dark-content" />
      <Banner title="Our Family" />

      {/* Dark pill tab switcher */}
      <View style={{ flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: 22, padding: 4, marginHorizontal: 14, marginTop: 8, marginBottom: 8 }}>
        {([['home','Home'],['jobs','Jobs'],['family','Family']] as const).map(([key, label]) => (
          <TouchableOpacity key={key} style={{ flex: 1, alignItems: 'center', paddingVertical: 13, borderRadius: 19, backgroundColor: activeTab === key ? '#0A0A0A' : 'transparent' }} onPress={() => { setActiveTab(key as any); setChildDetailView('overview'); }} activeOpacity={0.75}>
            <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 14, color: activeTab === key ? '#fff' : 'rgba(0,0,0,0.40)' }}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={s.body}>
        {activeTab === 'home' && childDetailView === 'overview' && HomeView()}
        {activeTab === 'home' && childDetailView === 'progress' && TutorProgressView()}
        {activeTab === 'home' && childDetailView === 'session-review' && SessionReviewView()}
        {activeTab === 'jobs' && JobsRewardsTab()}
        {activeTab === 'family' && FamilyTab()}
      </View>

    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: FAM_BG },
  body: { flex: 1, backgroundColor: FAM_BG },

  // Banner
  banner: { paddingHorizontal: 20, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: FAM_BG },
  bannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bannerBackBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(10,10,10,0.05)', alignItems: 'center', justifyContent: 'center' },
  wordmark: { fontFamily: 'Poppins_800ExtraBold', fontSize: 40, letterSpacing: -1.5, color: INK, lineHeight: 46 },
  bannerRight: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  bannerLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: INK4 },
  avatar: { borderRadius: 50, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { fontFamily: 'Poppins_700Bold', fontSize: 12, color: '#fff' },
  divider: { height: 1, backgroundColor: 'rgba(0,0,0,0.08)' },

  // Sub header
  subHeader: { paddingHorizontal: 20, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(0,0,0,0.08)', alignItems: 'center', justifyContent: 'center' },
  subHeaderTitle: { fontFamily: 'Poppins_700Bold', fontSize: 18, color: INK },

  // Section label
  sectionLabel: { fontFamily: 'Poppins_700Bold', fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', color: INK3, paddingHorizontal: 20, marginBottom: 8, marginTop: 16 },

  // Brief card
  briefCard: { marginHorizontal: 14, marginTop: 14, backgroundColor: CARD, borderRadius: 22, padding: 22 },
  briefEye: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 5 },
  briefEyeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: FAM_ACCENT },
  briefEyeTxt: { fontFamily: 'Poppins_700Bold', fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase', color: 'rgba(161,24,48,0.5)' },
  briefHero: { fontFamily: 'Poppins_700Bold', fontSize: 24, color: INK, lineHeight: 30, letterSpacing: -0.5, marginBottom: 8 },
  briefHeroEm: { fontStyle: 'italic', color: 'rgba(0,0,0,0.3)' },
  briefDetail: { fontFamily: 'Poppins_400Regular', fontSize: 15, color: INK2, lineHeight: 22, marginBottom: 12 },
  briefChips: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  briefChip: { borderWidth: 1, borderColor: 'rgba(0,0,0,0.12)', borderRadius: 22, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: CARD },
  briefChipTxt: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: INK2 },

  // Brief quiet
  briefQuiet: { marginHorizontal: 14, marginTop: 14, backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  briefQuietIcon: { fontSize: 24 },
  briefQuietTxt: { fontFamily: 'Poppins_400Regular', fontSize: 15, color: INK2, lineHeight: 22, flex: 1 },

  // Pending card
  pendingCard: { backgroundColor: CARD, borderRadius: 20, paddingHorizontal: 18, paddingVertical: 16, marginHorizontal: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 12 },
  pendingAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  pendingAvatarTxt: { fontFamily: 'Poppins_700Bold', fontSize: 14, color: '#fff' },
  pendingInfo: { flex: 1, minWidth: 0 },
  pendingTagRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  pendingTag: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3 },
  pendingTagTxt: { fontFamily: 'Poppins_700Bold', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  tagJob: { backgroundColor: 'rgba(168,232,204,0.25)' },
  tagJobTxt: { color: HUB_DARK },
  tagReward: { backgroundColor: 'rgba(161,24,48,0.1)' },
  tagRewardTxt: { color: RED_ACCENT },
  pendingTitle: { fontFamily: 'Poppins_700Bold', fontSize: 16, color: INK, marginBottom: 2 },
  pendingSub: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: INK4, lineHeight: 18 },
  pendingBtns: { flexDirection: 'column', gap: 4 },
  pendingYes: { backgroundColor: HUB_DARK, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7, alignItems: 'center' },
  pendingYesTxt: { fontFamily: 'Poppins_700Bold', fontSize: 13, color: '#fff' },
  pendingNo: { backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7, alignItems: 'center' },
  pendingNoTxt: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: INK4 },
  pendingCountBadge: { backgroundColor: RED_ACCENT, borderRadius: 22, paddingHorizontal: 12, paddingVertical: 4 },
  pendingCountTxt: { fontFamily: 'Poppins_700Bold', fontSize: 13, color: '#fff' },

  // Kid card
  kidCard: { backgroundColor: CARD, borderRadius: 22, marginHorizontal: 14, marginBottom: 10, padding: 20 },
  kidTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  kidAvatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  kidAvatarTxt: { fontFamily: 'Poppins_700Bold', fontSize: 17, color: '#fff' },
  kidName: { fontFamily: 'Poppins_700Bold', fontSize: 17, color: INK },
  kidNameMeta: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: 'rgba(0,0,0,0.35)' },
  kidMeta: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: INK4, marginTop: 2 },
  kidPts: { backgroundColor: 'rgba(10,64,48,0.08)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 5, marginLeft: 'auto' },
  kidPtsTxt: { fontFamily: 'Poppins_800ExtraBold', fontSize: 14, color: HUB_DARK },
  kidStats: { flexDirection: 'row', gap: 8 },
  kidStat: { flex: 1, backgroundColor: 'rgba(0,0,0,0.04)', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 10, alignItems: 'center' },
  kidStatN: { fontFamily: 'Poppins_800ExtraBold', fontSize: 17, color: INK, lineHeight: 20 },
  kidStatL: { fontFamily: 'Poppins_600SemiBold', fontSize: 9, color: 'rgba(0,0,0,0.35)', textTransform: 'uppercase', letterSpacing: 0.3, marginTop: 2 },
  kidActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  kidAction: { flex: 1, borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  kidActionTxt: { fontFamily: 'Poppins_700Bold', fontSize: 13 },
  kidActionTutor: { backgroundColor: TUTOR_BG },
  kidActionTutorTxt: { color: TUTOR_PURPLE },
  kidActionTutorLocked: { backgroundColor: 'rgba(0,0,0,0.05)' },
  kidActionTutorLockedTxt: { color: 'rgba(0,0,0,0.3)' },
  kidActionHub: { backgroundColor: HUB_GREEN },
  kidActionHubTxt: { color: HUB_DARK },

  // Quick links
  quickLinks: { flexDirection: 'row', gap: 10, marginHorizontal: 14, marginTop: 16 },
  quickLink: { flex: 1, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  quickLinkTxt: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: INK4 },

  // Child detail
  detailHeader: { paddingHorizontal: 20, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  detailName: { fontFamily: 'Poppins_800ExtraBold', fontSize: 20, color: INK, lineHeight: 24 },
  detailMeta: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: INK4 },
  editBadge: { backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  editBadgeTxt: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: 'rgba(0,0,0,0.35)' },

  // Section card (white card in detail views)
  sectionCard: { marginHorizontal: 14, backgroundColor: CARD, borderRadius: 22, padding: 20, marginBottom: 10 },
  sectionCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  sectionCardTitle: { fontFamily: 'Poppins_700Bold', fontSize: 16, color: INK, flex: 1 },
  streakBadge: { backgroundColor: TUTOR_BG, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  streakBadgeTxt: { fontFamily: 'Poppins_700Bold', fontSize: 12, color: TUTOR_PURPLE },
  hubPtsBadge: { fontFamily: 'Poppins_800ExtraBold', fontSize: 14, color: HUB_DARK },

  // Subject rows
  subjectRow: { marginBottom: 12 },
  subjTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  subjName: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: INK },
  subjBand: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3 },
  subjBandTxt: { fontFamily: 'Poppins_700Bold', fontSize: 10 },
  subjBarWrap: { height: 7, backgroundColor: 'rgba(0,0,0,0.07)', borderRadius: 4, overflow: 'hidden', marginBottom: 4 },
  subjBar: { height: 7, borderRadius: 4 },
  subjNote: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: INK4, lineHeight: 18 },

  // Recent session
  recentSession: { backgroundColor: 'rgba(0,0,0,0.03)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  rsDot: { width: 8, height: 8, borderRadius: 4 },
  rsTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: INK },
  rsMeta: { fontFamily: 'Poppins_400Regular', fontSize: 11, color: 'rgba(0,0,0,0.35)' },
  rsView: { fontFamily: 'Poppins_700Bold', fontSize: 12, color: TUTOR_PURPLE },

  // Hub stats
  hubStatRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  hubStat: { flex: 1, backgroundColor: 'rgba(168,232,204,0.15)', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 10, alignItems: 'center' },
  hubStatN: { fontFamily: 'Poppins_800ExtraBold', fontSize: 18, color: HUB_DARK, lineHeight: 22 },
  hubStatL: { fontFamily: 'Poppins_600SemiBold', fontSize: 9, color: 'rgba(10,64,48,0.5)', textTransform: 'uppercase', letterSpacing: 0.3, marginTop: 2 },

  // Job mini
  jobMini: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
  jobMiniIcon: { fontSize: 18 },
  jobMiniName: { fontFamily: 'Poppins_400Regular', fontSize: 14, color: INK, flex: 1 },
  jobMiniCheck: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.12)', alignItems: 'center', justifyContent: 'center' },
  jobMiniCheckDone: { backgroundColor: HUB_GREEN, borderColor: HUB_GREEN },

  // Tutor CTA
  tutorCta: { backgroundColor: TUTOR_PURPLE, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  tutorCtaTxt: { fontFamily: 'Poppins_700Bold', fontSize: 15, color: '#fff' },

  // Profile card
  profileCard: { backgroundColor: CARD, borderRadius: 20, paddingHorizontal: 18, paddingVertical: 16, marginHorizontal: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 14 },
  profileAvWrap: { position: 'relative' },
  profileColourRing: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  profileRingTxt: { fontFamily: 'Poppins_700Bold', fontSize: 18, color: '#fff' },
  profileName: { fontFamily: 'Poppins_700Bold', fontSize: 17, color: INK, marginBottom: 3 },
  profileMeta: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: INK4, lineHeight: 19 },
  loginBadge: { backgroundColor: 'rgba(34,197,94,0.12)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start', marginTop: 5 },
  loginBadgeTxt: { fontFamily: 'Poppins_700Bold', fontSize: 10, color: '#166534' },
  inviteBadge: { backgroundColor: 'rgba(99,102,241,0.1)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start', marginTop: 5 },
  inviteBadgeTxt: { fontFamily: 'Poppins_700Bold', fontSize: 10, color: '#4338CA' },
  parentDeviceTxt: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: 'rgba(0,0,0,0.35)', marginTop: 5 },
  roleBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
  roleBadgeTxt: { fontFamily: 'Poppins_700Bold', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.3 },
  roleParent: { backgroundColor: 'rgba(77,139,255,0.12)' },
  roleParentTxt: { color: '#1D4ED8' },
  roleChild: { backgroundColor: 'rgba(0,0,0,0.06)' },
  roleChildTxt: { color: INK4 },

  // Add member
  addMember: { marginHorizontal: 14, borderWidth: 1.5, borderStyle: 'dashed', borderColor: 'rgba(0,0,0,0.12)', borderRadius: 20, paddingHorizontal: 18, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  addMemberTxt: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: INK4 },
});
