/**
 * kids.tsx — Kids Hub
 * app/(tabs)/kids.tsx
 *
 * Dedicated screen accessed via router.navigate('/(tabs)/kids')
 * Background: #A8E8CC (mint green)
 * Wordmark a+i colour: #FAC8A8 (peach)
 *
 * Sub-views: child-select | hub-home (tabs: Jobs/Rewards/Games/Leaderboard)
 * Age tiers: Little (Yr1-3), Middle (Yr4-7), Older (Yr8+)
 *
 * All dummy data — Supabase integration later
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Modal, StyleSheet,
  Dimensions, StatusBar as RNStatusBar, Image, TextInput, Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import Svg, { Polyline } from 'react-native-svg';
import { supabase } from '../../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  WORDLE_LITTLE, WORDLE_MIDDLE, WORDLE_OLDER,
  SCRAMBLE_LITTLE, SCRAMBLE_MIDDLE, SCRAMBLE_OLDER,
  TRIVIA_LITTLE, TRIVIA_MIDDLE, TRIVIA_OLDER,
  generateMathsQuestion, scrambleWord, getWeeklyCrossword,
  type TriviaQuestion, type CrosswordPuzzle,
} from './kids-games-data';
import { KB_ROWS, getTileStates } from './wordle-data';

const { width: W, height: H } = Dimensions.get('window');
const FAMILY_ID = '00000000-0000-0000-0000-000000000001';
function localDateStr(d?: Date): string {
  const dt = d || new Date();
  return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
}
// Curated GIPHY search tags — kid-safe, celebratory
const GIPHY_TAGS = ['congratulations', 'you rock', 'celebration', 'nailed it', 'high five', 'amazing', 'well done', 'awesome', 'proud of you'];

// ── Palette ──────────────────────────────────────────────────────────────────
const HUB_BG    = '#A8E8CC';
const HUB_DARK  = '#0A4030';
const HUB_PEACH = '#FAC8A8';   // wordmark a+i in Kids Hub
const INK       = '#0A0A0A';
const INK2      = 'rgba(0,0,0,0.50)';
const INK3      = 'rgba(0,0,0,0.32)';
const INK4      = 'rgba(0,0,0,0.40)';
const CARD      = '#FFFFFF';
const RED_ACC   = '#A01830';
const GOLD      = '#F59E0B';
const AMBER_BG  = 'rgba(245,158,11,0.15)';
const AMBER_TXT = '#92400E';

// Family children
type ChildName = 'Poppy' | 'Gab' | 'Duke';
type AgeTier = 'little' | 'middle' | 'older';

const CHILDREN: { name: ChildName; initial: string; colour: string; bgLight: string; year: number; age: number; tier: AgeTier; points: number; streak: number }[] = [
  { name: 'Poppy', initial: 'P', colour: '#A855F7', bgLight: '#EDE5FF', year: 6, age: 12, tier: 'older',  points: 340, streak: 12 },
  { name: 'Gab',   initial: 'G', colour: '#22C55E', bgLight: '#D4F5E0', year: 4, age: 10, tier: 'middle', points: 185, streak: 5 },
  { name: 'Duke',  initial: 'D', colour: '#F59E0B', bgLight: '#FEF3CD', year: 1, age: 8,  tier: 'little', points: 90,  streak: 3 },
];

// Jobs per child
const JOBS: Record<ChildName, { icon: string; name: string; pts: number; type: 'daily' | 'oneoff'; done: boolean }[]> = {
  Poppy: [
    { icon: '\u{1F373}', name: 'Cook dinner Tuesday', pts: 50, type: 'oneoff', done: true },
    { icon: '\u{1F9F9}', name: 'Vacuum lounge room', pts: 30, type: 'oneoff', done: false },
    { icon: '\u{1F415}', name: 'Walk the dog', pts: 20, type: 'daily', done: true },
    { icon: '\u{1F455}', name: 'Iron school shirts', pts: 25, type: 'oneoff', done: false },
  ],
  Gab: [
    { icon: '\u{1F37D}\uFE0F', name: 'Set the table', pts: 15, type: 'daily', done: true },
    { icon: '\u{1F6BF}', name: 'Shower before 8pm', pts: 10, type: 'daily', done: true },
    { icon: '\u{267B}\uFE0F', name: 'Take bins out', pts: 20, type: 'oneoff', done: true },
    { icon: '\u{1F9FA}', name: 'Put washing away', pts: 15, type: 'oneoff', done: false },
  ],
  Duke: [
    { icon: '\u{1F6CF}\uFE0F', name: 'Make my bed', pts: 10, type: 'daily', done: true },
    { icon: '\u{1F415}', name: 'Feed the dog', pts: 10, type: 'daily', done: true },
    { icon: '\u{1F9E6}', name: 'Pack school bag', pts: 10, type: 'daily', done: false },
    { icon: '\u{1F9F9}', name: 'Tidy my room', pts: 25, type: 'oneoff', done: false },
  ],
};

// Rewards per child
const REWARDS: Record<ChildName, { icon: string; name: string; cost: number; status: 'afford' | 'almost' | 'saving' }[]> = {
  Poppy: [
    { icon: '\u{1F3AE}', name: 'Extra Nintendo hour', cost: 150, status: 'afford' },
    { icon: '\u{1F389}', name: 'Sleepover party', cost: 400, status: 'almost' },
    { icon: '\u{1F4B0}', name: '$50 spending money', cost: 1000, status: 'saving' },
  ],
  Gab: [
    { icon: '\u{1F3AE}', name: 'Extra Nintendo hour', cost: 150, status: 'almost' },
    { icon: '\u{1F355}', name: 'Choose dinner tonight', cost: 50, status: 'afford' },
    { icon: '\u{1F9F1}', name: 'Lego set', cost: 500, status: 'saving' },
  ],
  Duke: [
    { icon: '\u{1F355}', name: 'Choose dinner tonight', cost: 50, status: 'afford' },
    { icon: '\u{1F319}', name: 'Stay up 30 mins late', cost: 75, status: 'afford' },
    { icon: '\u{1F9F1}', name: 'Lego set', cost: 500, status: 'saving' },
  ],
};

// Games
const GAMES = [
  { icon: '\u{1F7E9}', name: "Zaeli's Wordle", desc: 'Daily word challenge \u2014 guess the hidden word!', badge: 'daily', badgeText: "Today's word waiting!", featured: true },
  { icon: '\u{1F524}', name: 'Word Scramble', desc: 'Unscramble the letters to find the hidden word', badge: 'anytime', badgeText: 'Anytime', featured: false },
  { icon: '\u26A1', name: 'Maths Sprint', desc: '60 seconds \u2014 how many can you get?', badge: 'anytime', badgeText: 'Beat your best', featured: false },
  { icon: '\u{1F30D}', name: 'World Trivia', desc: 'Questions about Australia and the world', badge: 'anytime', badgeText: 'Anytime', featured: false },
  { icon: '\u270F\uFE0F', name: 'Mini Crossword', desc: 'New puzzle every Monday \u2014 5\u00D75 grid', badge: 'weekly', badgeText: 'New Monday', featured: false },
];

// ── SVG Icons ────────────────────────────────────────────────────────────────
function IcoBack({ color = INK, size = 14 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={2.5} strokeLinecap="round">
      <Polyline points="15 18 9 12 15 6" />
    </Svg>
  );
}

function IcoCheck({ color = HUB_DARK, size = 12 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={3} strokeLinecap="round">
      <Polyline points="20 6 9 17 4 12" />
    </Svg>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function KidsHubScreen() {
  const router = useRouter();
  const [view, setView] = useState<'select' | 'hub'>('select');
  const [selectedChild, setSelectedChild] = useState<ChildName>('Duke');
  const [activeTab, setActiveTab] = useState<'jobs' | 'rewards' | 'games' | 'leaderboard'>('jobs');
  const [showGiphy, setShowGiphy] = useState(false);
  const [giphyData, setGiphyData] = useState<{ pts: number; jobName: string; gifUrl: string | null }>({ pts: 0, jobName: '', gifUrl: null });
  const [redeemItem, setRedeemItem] = useState<null | typeof REWARDS.Poppy[0]>(null);
  // Supabase-driven state
  const [dbJobs, setDbJobs] = useState<any[]>([]);
  const [dbRewards, setDbRewards] = useState<any[]>([]);
  const [dbPoints, setDbPoints] = useState<Record<string, number>>({});
  const [dbStreaks, setDbStreaks] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  // Active game state
  const [activeGame, setActiveGame] = useState<null | 'wordle' | 'scramble' | 'maths' | 'trivia' | 'crossword'>(null);
  // Wordle state
  const [wordleGuesses, setWordleGuesses] = useState<string[]>([]);
  const [wordleInput, setWordleInput] = useState('');
  const [wordleAnswer, setWordleAnswer] = useState('');
  const [wordleWon, setWordleWon] = useState(false);
  const [wordleKeyStates, setWordleKeyStates] = useState<Record<string, 'correct'|'present'|'absent'>>({});
  // Shared celebration overlay
  const [celebration, setCelebration] = useState<{ emoji: string; title: string; sub: string } | null>(null);
  // Scramble state
  const [scrambleAnswer, setScrambleAnswer] = useState('');
  const [scrambleScrambled, setScrambleScrambled] = useState('');
  const [scrambleHint, setScrambleHint] = useState('');
  const [scrambleHintVisible, setScrambleHintVisible] = useState(false);
  const [scrambleInput, setScrambleInput] = useState('');
  const [scrambleScore, setScrambleScore] = useState(0);
  const [scrambleRound, setScrambleRound] = useState(0);
  // Maths state
  const [mathsQuestion, setMathsQuestion] = useState('');
  const [mathsAnswer, setMathsAnswer] = useState(0);
  const [mathsInput, setMathsInput] = useState('');
  const [mathsScore, setMathsScore] = useState(0);
  const [mathsTimeLeft, setMathsTimeLeft] = useState(60);
  const [mathsActive, setMathsActive] = useState(false);
  const [mathsFlash, setMathsFlash] = useState<'correct'|'wrong'|null>(null);
  const mathsTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  // Crossword state
  const [crosswordSel, setCrosswordSel] = useState<{ r: number; c: number } | null>(null);
  const [crosswordGrid, setCrosswordGrid] = useState<Record<string, string>>({});
  const [crosswordChecked, setCrosswordChecked] = useState(false);
  const [showGameInfo, setShowGameInfo] = useState(false);
  // Trivia state
  const [triviaQ, setTriviaQ] = useState<TriviaQuestion | null>(null);
  const [triviaIndex, setTriviaIndex] = useState(0);
  const [triviaScore, setTriviaScore] = useState(0);
  const [triviaSelected, setTriviaSelected] = useState<number | null>(null);
  const [triviaTotal, setTriviaTotal] = useState(0);
  const [showCompletedJobs, setShowCompletedJobs] = useState(false);
  const [expandedJobId, setExpandedJobId] = useState<string|null>(null);
  // Suggest a job form
  const [suggestFormOpen, setSuggestFormOpen] = useState(false);
  const [suggestTitle, setSuggestTitle] = useState('');
  const [suggestPts, setSuggestPts] = useState(20);
  const [suggestNote, setSuggestNote] = useState('');

  useFocusEffect(useCallback(() => {
    RNStatusBar.setBarStyle('dark-content', true);
    loadKidsData();
  }, []));

  async function loadKidsData() {
    setLoading(true);
    try {
      // Load jobs for all children
      const { data: jobsData } = await supabase.from('kids_jobs')
        .select('*').eq('family_id', FAMILY_ID).eq('approved', true)
        .order('created_at', { ascending: true });
      setDbJobs(jobsData ?? []);

      // Load rewards
      const { data: rewardsData } = await supabase.from('kids_rewards')
        .select('*').eq('family_id', FAMILY_ID).eq('is_active', true)
        .order('cost', { ascending: true });
      setDbRewards(rewardsData ?? []);

      // Calculate points per child from points log
      const { data: pointsData } = await supabase.from('kids_points_log')
        .select('child_name, points').eq('family_id', FAMILY_ID);
      const pts: Record<string, number> = {};
      (pointsData ?? []).forEach((p: any) => {
        pts[p.child_name] = (pts[p.child_name] || 0) + (p.points || 0);
      });
      setDbPoints(pts);

      // Calculate streaks — consecutive days with at least 1 completed job
      const streaks: Record<string, number> = {};
      for (const c of CHILDREN) {
        const childJobs = (jobsData ?? []).filter((j: any) => j.child_name === c.name && j.is_complete && j.completed_at);
        const completeDates = [...new Set(childJobs.map((j: any) => j.completed_at?.split('T')[0]).filter(Boolean))].sort().reverse();
        let streak = 0;
        const today = localDateStr();
        let checkDate = today;
        for (const d of completeDates) {
          if (d === checkDate) {
            streak++;
            const prev = new Date(checkDate + 'T00:00:00');
            prev.setDate(prev.getDate() - 1);
            checkDate = localDateStr(prev);
          } else break;
        }
        streaks[c.name] = streak;
      }
      setDbStreaks(streaks);
    } catch (e) {
      console.log('[kids] loadKidsData error:', e);
    }
    setLoading(false);
  }

  async function completeJob(job: any) {
    if (job.done) return;
    const jobId = job.id || job._raw?.id;
    const pts = job.pts || 10;
    // Optimistic UI update
    setDbJobs(prev => prev.map((j: any) => j.id === jobId ? { ...j, is_complete: true, completed_at: new Date().toISOString() } : j));
    setDbPoints(prev => ({ ...prev, [selectedChild]: (prev[selectedChild] || 0) + pts }));
    // Show GIPHY celebration
    setGiphyData({ pts, jobName: job.name, gifUrl: null });
    setShowGiphy(true);
    // Fetch a random GIPHY GIF
    try {
      const tag = GIPHY_TAGS[Math.floor(Math.random() * GIPHY_TAGS.length)];
      const giphyKey = process.env.EXPO_PUBLIC_GIPHY_API_KEY || '';
      if (giphyKey) {
        const res = await fetch(`https://api.giphy.com/v1/gifs/random?api_key=${giphyKey}&tag=${encodeURIComponent(tag)}&rating=g`);
        const data = await res.json();
        const gifUrl = data?.data?.images?.fixed_height?.url || data?.data?.images?.original?.url || null;
        if (gifUrl) setGiphyData(prev => ({ ...prev, gifUrl }));
      }
    } catch { /* GIPHY optional */ }
    // Persist to Supabase
    if (jobId) {
      try {
        await supabase.from('kids_jobs').update({ is_complete: true, completed_at: new Date().toISOString() }).eq('id', jobId);
        await supabase.from('kids_points_log').insert({ family_id: FAMILY_ID, child_name: selectedChild, points: pts, reason: job.name, source: 'job_complete' });
      } catch (e) { console.log('[kids] completeJob error:', e); }
    }
  }

  async function uncompleteJob(job: any) {
    if (!job.done) return;
    const jobId = job.id || job._raw?.id;
    const pts = job.pts || 10;
    // Optimistic undo
    setDbJobs(prev => prev.map((j: any) => j.id === jobId ? { ...j, is_complete: false, completed_at: null } : j));
    setDbPoints(prev => ({ ...prev, [selectedChild]: Math.max(0, (prev[selectedChild] || 0) - pts) }));
    // Persist
    if (jobId) {
      try {
        await supabase.from('kids_jobs').update({ is_complete: false, completed_at: null }).eq('id', jobId);
        // Remove the points log entry
        await supabase.from('kids_points_log').delete()
          .eq('family_id', FAMILY_ID).eq('child_name', selectedChild)
          .eq('reason', job.name).eq('source', 'job_complete')
          .order('created_at', { ascending: false }).limit(1);
      } catch (e) { console.log('[kids] uncompleteJob error:', e); }
    }
  }

  async function repeatJob(job: any) {
    // Send a repeat request to parent for approval
    try {
      await supabase.from('kids_pending_approvals').insert({
        family_id: FAMILY_ID, child_name: selectedChild,
        type: 'job_suggestion', title: `Repeat: ${job.name}`,
        emoji: job.icon || '📋', points: job.pts || 10,
        note: `${selectedChild} wants to do this job again`,
        status: 'pending',
      });
    } catch (e) { console.log('[kids] repeatJob error:', e); }
  }

  async function submitJobSuggestion() {
    if (!suggestTitle.trim()) return;
    try {
      await supabase.from('kids_pending_approvals').insert({
        family_id: FAMILY_ID, child_name: selectedChild,
        type: 'job_suggestion', title: suggestTitle.trim(),
        emoji: '📋', points: suggestPts, note: suggestNote.trim() || null,
        status: 'pending',
      });
      setSuggestFormOpen(false);
      setSuggestTitle('');
      setSuggestPts(20);
      setSuggestNote('');
    } catch (e) { console.log('[kids] submitJobSuggestion error:', e); }
  }

  async function requestReward(reward: any) {
    try {
      await supabase.from('kids_pending_approvals').insert({
        family_id: FAMILY_ID, child_name: selectedChild,
        type: 'reward_redemption', title: reward.name,
        emoji: reward.icon, points: reward.cost, note: null,
        status: 'pending',
      });
      setRedeemItem(null);
    } catch (e) { console.log('[kids] requestReward error:', e); }
  }

  // Auto-dismiss celebration after 2.5s
  React.useEffect(() => {
    if (!celebration) return;
    const t = setTimeout(() => setCelebration(null), 2500);
    return () => clearTimeout(t);
  }, [celebration]);

  // ── Game save/load ──
  const gameStorageKey = (game: string) => `kidshub_${selectedChild}_${game}_${localDateStr()}`;
  async function saveGameState(game: string, state: any) {
    try { await AsyncStorage.setItem(gameStorageKey(game), JSON.stringify(state)); } catch {}
  }
  async function loadGameState(game: string): Promise<any|null> {
    try { const v = await AsyncStorage.getItem(gameStorageKey(game)); return v ? JSON.parse(v) : null; } catch { return null; }
  }

  // ── Game launchers ──
  async function startWordle() {
    const tier = child.tier;
    const list = tier === 'little' ? WORDLE_LITTLE : tier === 'middle' ? WORDLE_MIDDLE : WORDLE_OLDER;
    const dayIndex = Math.floor((Date.now() - Date.parse('2026-01-01')) / 86400000);
    const word = list[((dayIndex % list.length) + list.length) % list.length].toUpperCase();
    setWordleAnswer(word);
    setWordleInput('');
    setCelebration(null);
    // Try loading saved state
    const saved = await loadGameState('wordle');
    if (saved && saved.answer === word) {
      setWordleGuesses(saved.guesses || []);
      setWordleWon(saved.won || false);
      setWordleKeyStates(saved.keyStates || {});
    } else {
      setWordleGuesses([]);
      setWordleWon(false);
      setWordleKeyStates({});
    }
    setActiveGame('wordle');
  }

  async function startScramble() {
    const tier = child.tier;
    const list = tier === 'little' ? SCRAMBLE_LITTLE : tier === 'middle' ? SCRAMBLE_MIDDLE : SCRAMBLE_OLDER;
    setCelebration(null);
    // Try loading saved state
    const saved = await loadGameState('scramble');
    if (saved && saved.round < Math.min(10, list.length)) {
      setScrambleRound(saved.round);
      setScrambleScore(saved.score);
      loadScrambleRound(list, saved.round);
    } else {
      setScrambleRound(0);
      setScrambleScore(0);
      loadScrambleRound(list, 0);
    }
    setActiveGame('scramble');
  }
  function loadScrambleRound(list: any[], round: number) {
    if (round >= list.length) return;
    const item = list[round];
    setScrambleAnswer(item.word.toUpperCase());
    setScrambleScrambled(scrambleWord(item.word.toUpperCase()));
    setScrambleHint(item.hint);
    setScrambleInput('');
    setScrambleHintVisible(false);
  }

  function startMaths() {
    setMathsScore(0);
    setMathsTimeLeft(120);
    setMathsActive(true);
    nextMathsQuestion();
    setActiveGame('maths');
    mathsTimer.current = setInterval(() => {
      setMathsTimeLeft(prev => {
        if (prev <= 1) {
          if (mathsTimer.current) clearInterval(mathsTimer.current);
          setMathsActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }
  function nextMathsQuestion() {
    const q = generateMathsQuestion(child.tier);
    setMathsQuestion(q.question);
    setMathsAnswer(q.answer);
    setMathsInput('');
  }

  function startTrivia() {
    const tier = child.tier;
    const list = tier === 'little' ? TRIVIA_LITTLE : tier === 'middle' ? TRIVIA_MIDDLE : TRIVIA_OLDER;
    setTriviaIndex(0);
    setTriviaScore(0);
    setTriviaSelected(null);
    setTriviaTotal(list.length);
    setTriviaQ(list[0]);
    setActiveGame('trivia');
  }

  function goBack() {
    if (activeGame) {
      if (mathsTimer.current) { clearInterval(mathsTimer.current); mathsTimer.current = null; }
      setActiveGame(null);
      return;
    }
    if (view === 'hub') {
      setView('select');
      setActiveTab('jobs');
    } else {
      router.navigate('/(tabs)/swipe-world' as any);
    }
  }

  function selectChild(name: ChildName) {
    setSelectedChild(name);
    setActiveTab('jobs');
    setView('hub');
  }

  const child = CHILDREN.find(c => c.name === selectedChild)!;
  // Use Supabase data if available, otherwise dummy
  const childPoints = dbPoints[selectedChild] ?? child.points;
  const childStreak = dbStreaks[selectedChild] ?? child.streak;
  const childWithDb = { ...child, points: childPoints, streak: childStreak };
  const today = localDateStr();
  // Get jobs for selected child — daily jobs: only show if not completed today
  const childDbJobs = dbJobs.filter((j: any) => j.child_name === selectedChild);
  const jobs = childDbJobs.length > 0
    ? childDbJobs.map((j: any) => ({
        id: j.id, icon: j.emoji || '📋', name: j.title, pts: j.points || 10,
        type: j.type || 'oneoff', done: j.is_complete && (j.type !== 'daily' || j.completed_at?.startsWith(today)),
        _raw: j,
      }))
    : JOBS[selectedChild];
  const rewards = dbRewards.filter((r: any) => r.child_name === selectedChild).length > 0
    ? dbRewards.filter((r: any) => r.child_name === selectedChild).map((r: any) => ({
        icon: r.emoji || '🎁', name: r.title, cost: r.cost,
        status: childPoints >= r.cost ? 'afford' as const : childPoints >= r.cost * 0.7 ? 'almost' as const : 'saving' as const,
      }))
    : REWARDS[selectedChild];
  const jobsDone = jobs.filter(j => j.done).length;
  const jobsTotal = jobs.length;

  // ── Banner (shared) ──────────────────────────────────────────────────────
  function Banner() {
    return (
      <>
        <View style={[s.banner, view === 'hub' && { backgroundColor: childWithDb.bgLight || HUB_BG }]}>
          <TouchableOpacity onPress={goBack} activeOpacity={0.7}>
            <Text style={s.wordmark}>
              z<Text style={{ color: view === 'hub' ? child.colour : HUB_PEACH }}>a</Text>el
              <Text style={{ color: view === 'hub' ? child.colour : HUB_PEACH }}>i</Text>
            </Text>
          </TouchableOpacity>
          <Text style={s.bannerLabel}>Kids Hub</Text>
        </View>
        <View style={s.divider} />
      </>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CHILD SELECT VIEW
  // ══════════════════════════════════════════════════════════════════════════
  function ChildSelectView() {
    return (
      <View style={s.selectBody}>
        <View style={s.selectHero}>
          <Text style={s.selectTitle}>
            Whose hub{'\n'}<Text style={s.selectTitleEm}>today?</Text>
          </Text>
        </View>
        <View style={s.selectCards}>
          {CHILDREN.map(c => (
            <TouchableOpacity
              key={c.name}
              style={[s.selectCard, { backgroundColor: `${c.colour}20` }]}
              onPress={() => selectChild(c.name)}
              activeOpacity={0.8}
            >
              <View style={[s.selectCardAv, { backgroundColor: c.colour }]}>
                <Text style={s.selectCardAvTxt}>{c.initial}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.selectCardName}>{c.name}</Text>
                <Text style={s.selectCardMeta}>Year {c.year} {'\u00B7'} {'\u{1F525}'} {dbStreaks[c.name] ?? c.streak} day streak</Text>
              </View>
              <View style={s.selectCardPts}>
                <Text style={s.selectCardPtsTxt}>{'\u2B50'} {dbPoints[c.name] ?? c.points} pts</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // HUB HOME — header + tabs + content
  // ══════════════════════════════════════════════════════════════════════════
  // Compute next reward distance
  const nextReward = rewards.find((r: any) => (r.cost || 0) > childPoints);
  const toNextReward = nextReward ? (nextReward.cost || 0) - childPoints : 0;

  function HubHomeView() {
    return (
      <View style={{ flex: 1 }}>
        {/* Header — unified for all kids */}
        <View style={s.hubHeader}>
          <TouchableOpacity style={s.backBtn} onPress={goBack} activeOpacity={0.7}>
            <IcoBack />
          </TouchableOpacity>
          <Text style={{ fontSize: 22 }}>{'\u{1F44B}'}</Text>
          <Text style={s.hubHeaderTitle}>Hey {selectedChild}!</Text>
          <View style={[s.ptsBadge, { backgroundColor: child.colour }]}>
            <Text style={s.ptsBadgeN}>{childWithDb.points}</Text>
            <Text style={s.ptsBadgeL}>pts</Text>
          </View>
        </View>

        {/* 3-stat row — same for all kids */}
        <View style={s.midStats}>
          <View style={s.midStat}><Text style={s.midStatN}>{'\u{1F525}'} {childWithDb.streak}</Text><Text style={s.midStatL}>Streak</Text></View>
          <View style={s.midStat}><Text style={s.midStatN}>{jobsDone}/{jobsTotal}</Text><Text style={s.midStatL}>Jobs today</Text></View>
          <View style={s.midStat}><Text style={s.midStatN}>{toNextReward > 0 ? toNextReward : '\u2713'}</Text><Text style={s.midStatL}>{toNextReward > 0 ? 'To next reward' : 'Reward ready!'}</Text></View>
        </View>

        {/* Tabs — hidden when game is active */}
        {!activeGame && <View style={s.tabs}>
          <TouchableOpacity style={[s.tab, activeTab === 'jobs' && s.tabOn]} onPress={() => setActiveTab('jobs')}>
            <Text style={[s.tabTxt, activeTab === 'jobs' && s.tabTxtOn]}>Jobs</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.tab, activeTab === 'rewards' && s.tabOn]} onPress={() => setActiveTab('rewards')}>
            <Text style={[s.tabTxt, activeTab === 'rewards' && s.tabTxtOn]}>Rewards</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.tab, activeTab === 'games' && s.tabOn]} onPress={() => setActiveTab('games')}>
            <Text style={[s.tabTxt, activeTab === 'games' && s.tabTxtOn]}>Games</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.tab, activeTab === 'leaderboard' && s.tabOn]} onPress={() => setActiveTab('leaderboard')}>
            <Text style={[s.tabTxt, activeTab === 'leaderboard' && s.tabTxtOn]}>{'\u{1F3C6}'}</Text>
          </TouchableOpacity>
        </View>}

        {/* Tab content — always visible */}
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {activeTab === 'jobs' && <JobsTab />}
          {activeTab === 'rewards' && <RewardsTab />}
          {activeTab === 'games' && <GamesTab />}
          {activeTab === 'leaderboard' && <LeaderboardTab />}
        </ScrollView>

        {/* ── GAME MODAL (92% sheet) ── */}
        <Modal visible={activeGame !== null} transparent animationType="slide" onRequestClose={goBack}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.40)', justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: childWithDb.bgLight || HUB_BG, borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '92%', flexDirection: 'column' }}>
              {/* Handle + close */}
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(0,0,0,0.12)', alignSelf: 'center', marginTop: 10 }}/>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 }}>
                <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 18, color: INK, flex: 1 }}>
                  {activeGame === 'wordle' ? "Zaeli's Wordle" : activeGame === 'scramble' ? 'Word Scramble' : activeGame === 'maths' ? 'Maths Sprint' : activeGame === 'trivia' ? 'World Trivia' : activeGame === 'crossword' ? 'Mini Crossword' : ''}
                </Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {(activeGame === 'wordle' || activeGame === 'crossword') && (
                    <TouchableOpacity onPress={() => setShowGameInfo(true)} style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.07)', alignItems: 'center', justifyContent: 'center' }} activeOpacity={0.7}>
                      <Text style={{ fontSize: 16, color: 'rgba(0,0,0,0.5)' }}>?</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={goBack} style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.07)', alignItems: 'center', justifyContent: 'center' }} activeOpacity={0.7}>
                    <Text style={{ fontSize: 16, color: 'rgba(0,0,0,0.5)' }}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={{ flex: 1 }}>
            {/* ── WORDLE ── */}
            {activeGame === 'wordle' && (() => {
              const wordLen = wordleAnswer.length;
              const maxGuesses = wordLen === 4 ? 5 : 6;
              const gameOver = wordleWon || wordleGuesses.length >= maxGuesses;
              const accent = child.colour;
              function handleWordleKey(key: string) {
                if (gameOver) return;
                if (key === 'DEL') { setWordleInput(prev => prev.slice(0, -1)); return; }
                if (key === 'ENTER') {
                  if (wordleInput.length < wordLen) return;
                  const guess = wordleInput.toUpperCase();
                  const newGuesses = [...wordleGuesses, guess];
                  setWordleGuesses(newGuesses);
                  // Update keyboard states
                  if (wordLen === 5) {
                    const states = getTileStates(guess, wordleAnswer);
                    const newKS = { ...wordleKeyStates };
                    guess.split('').forEach((l, i) => {
                      const s = states[i];
                      if (s === 'correct') newKS[l] = 'correct';
                      else if (s === 'present' && newKS[l] !== 'correct') newKS[l] = 'present';
                      else if (s === 'absent' && !newKS[l]) newKS[l] = 'absent';
                    });
                    setWordleKeyStates(newKS);
                  }
                  const won = guess === wordleAnswer;
                  if (won) { setWordleWon(true); setCelebration({ emoji: '🎉', title: 'You got it!', sub: `${newGuesses.length}/${maxGuesses} guesses` }); }
                  else if (newGuesses.length >= maxGuesses) { setCelebration({ emoji: '😅', title: `The word was ${wordleAnswer}`, sub: 'Better luck tomorrow!' }); }
                  setWordleInput('');
                  // Save state
                  saveGameState('wordle', { answer: wordleAnswer, guesses: newGuesses, won, keyStates: wordLen === 5 ? { ...wordleKeyStates } : {} });
                  return;
                }
                if (wordleInput.length >= wordLen) return;
                setWordleInput(prev => prev + key);
              }
              return (
                <ScrollView style={{ flex: 1 }} contentContainerStyle={{ alignItems: 'center', paddingTop: 10, paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
                  <Text style={{ fontFamily: 'Poppins_800ExtraBold', fontSize: 20, color: INK, marginBottom: 10 }}>Zaeli's Wordle</Text>
                  {/* Grid */}
                  {Array.from({ length: maxGuesses }).map((_, row) => {
                    const guess = wordleGuesses[row] || (row === wordleGuesses.length ? wordleInput.padEnd(wordLen, ' ') : '');
                    const isSubmitted = !!wordleGuesses[row];
                    const states = isSubmitted && wordLen === 5 ? getTileStates(wordleGuesses[row], wordleAnswer) : null;
                    // For 4-letter words, compute inline
                    const states4 = isSubmitted && wordLen === 4 ? (() => {
                      const r: string[] = Array(4).fill('absent'); const a = wordleAnswer.split(''); const g = wordleGuesses[row].split(''); const u = [false,false,false,false];
                      for (let i=0;i<4;i++) { if (g[i]===a[i]) { r[i]='correct'; u[i]=true; } }
                      for (let i=0;i<4;i++) { if (r[i]==='correct') continue; const j=a.findIndex((c,k)=>c===g[i]&&!u[k]); if (j>=0) { r[i]='present'; u[j]=true; } }
                      return r;
                    })() : null;
                    const tileStates = states || states4;
                    return (
                      <View key={row} style={{ flexDirection: 'row', gap: 6, marginBottom: 6 }}>
                        {Array.from({ length: wordLen }).map((_, col) => {
                          const letter = guess[col] || '';
                          const ts = tileStates?.[col];
                          const bg = ts === 'correct' ? accent : ts === 'present' ? '#F0DC80' : ts === 'absent' ? '#6B7280' : letter.trim() ? '#fff' : 'rgba(255,255,255,0.4)';
                          const textC = ts ? '#fff' : letter.trim() ? INK : 'transparent';
                          const bdr = ts ? bg : letter.trim() ? `${accent}50` : 'rgba(0,0,0,0.10)';
                          return (
                            <View key={col} style={{ width: wordLen === 4 ? 58 : 52, height: wordLen === 4 ? 58 : 52, borderRadius: 10, backgroundColor: bg, borderWidth: 2, borderColor: bdr, alignItems: 'center', justifyContent: 'center' }}>
                              <Text style={{ fontFamily: 'Poppins_800ExtraBold', fontSize: wordLen === 4 ? 26 : 22, color: textC }}>{letter.trim()}</Text>
                            </View>
                          );
                        })}
                      </View>
                    );
                  })}
                  {/* Embedded keyboard */}
                  <View style={{ gap: 5, paddingHorizontal: 6, marginTop: 10, width: '100%' }}>
                    {KB_ROWS.map((row, ri) => (
                      <View key={ri} style={{ flexDirection: 'row', gap: 4, justifyContent: 'center' }}>
                        {row.map(key => {
                          const isWide = key === 'ENTER' || key === 'DEL';
                          const ks = wordleKeyStates[key];
                          const kbBg = ks === 'correct' ? accent : ks === 'present' ? '#F0DC80' : ks === 'absent' ? '#6B7280' : 'rgba(255,255,255,0.7)';
                          const kbC = ks ? '#fff' : INK;
                          return (
                            <TouchableOpacity key={key} onPress={() => handleWordleKey(key)} activeOpacity={0.7}
                              style={{ height: 48, flex: isWide ? 1.5 : 1, maxWidth: isWide ? 60 : 36, borderRadius: 8, backgroundColor: kbBg, alignItems: 'center', justifyContent: 'center' }}>
                              <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: isWide ? 16 : 17, color: kbC }}>{key === 'DEL' ? '\u232B' : key}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    ))}
                  </View>
                </ScrollView>
              );
            })()}

            {/* ── WORD SCRAMBLE ── */}
            {activeGame === 'scramble' && (() => {
              const tier = child.tier;
              const list = tier === 'little' ? SCRAMBLE_LITTLE : tier === 'middle' ? SCRAMBLE_MIDDLE : SCRAMBLE_OLDER;
              const maxRounds = Math.min(10, list.length);
              const isDone = scrambleRound >= maxRounds;
              function handleScrambleKey(key: string) {
                if (key === 'DEL') { setScrambleInput(prev => prev.slice(0, -1)); return; }
                if (key === 'ENTER') {
                  if (scrambleInput.toUpperCase() === scrambleAnswer) {
                    setScrambleScore(prev => prev + 1);
                    setCelebration({ emoji: '🎉', title: 'Correct!', sub: `${scrambleAnswer} — nice one!` });
                  } else {
                    setCelebration({ emoji: '🤔', title: `It was ${scrambleAnswer}`, sub: 'Keep going!' });
                  }
                  const correct = scrambleInput.toUpperCase() === scrambleAnswer;
                  const next = scrambleRound + 1;
                  const newScore = correct ? scrambleScore + 1 : scrambleScore;
                  setScrambleRound(next);
                  saveGameState('scramble', { round: next, score: newScore });
                  if (next < maxRounds) setTimeout(() => loadScrambleRound(list, next), 500);
                  return;
                }
                if (scrambleInput.length >= scrambleAnswer.length) return;
                setScrambleInput(prev => prev + key);
              }
              return (
                <ScrollView style={{ flex: 1 }} contentContainerStyle={{ alignItems: 'center', paddingTop: 10, paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
                  <Text style={{ fontFamily: 'Poppins_800ExtraBold', fontSize: 20, color: INK, marginBottom: 4 }}>Word Scramble</Text>
                  <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 14, color: INK4, marginBottom: 12 }}>Score: {scrambleScore} | Round {Math.min(scrambleRound + 1, maxRounds)}/{maxRounds}</Text>
                  {!isDone ? (
                    <>
                      {/* Scrambled word */}
                      <View style={{ backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 18, padding: 20, alignItems: 'center', width: '100%', marginBottom: 10 }}>
                        <Text style={{ fontFamily: 'Poppins_800ExtraBold', fontSize: 34, color: child.colour, letterSpacing: 8 }}>{scrambleScrambled}</Text>
                        {scrambleHintVisible ? (
                          <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 14, color: INK4, marginTop: 8 }}>{scrambleHint}</Text>
                        ) : (
                          <TouchableOpacity onPress={() => setScrambleHintVisible(true)} style={{ marginTop: 8 }} activeOpacity={0.7}>
                            <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: child.colour }}>Need a hint?</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                      {/* Input tiles */}
                      <View style={{ flexDirection: 'row', gap: 6, marginBottom: 10 }}>
                        {Array.from({ length: scrambleAnswer.length }).map((_, i) => (
                          <View key={i} style={{ width: 44, height: 48, borderRadius: 10, backgroundColor: scrambleInput[i] ? '#fff' : 'rgba(255,255,255,0.4)', borderWidth: 2, borderColor: scrambleInput[i] ? `${child.colour}50` : 'rgba(0,0,0,0.10)', alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={{ fontFamily: 'Poppins_800ExtraBold', fontSize: 22, color: INK }}>{scrambleInput[i] || ''}</Text>
                          </View>
                        ))}
                      </View>
                      {/* Keyboard */}
                      <View style={{ gap: 5, paddingHorizontal: 6, width: '100%' }}>
                        {KB_ROWS.map((row, ri) => (
                          <View key={ri} style={{ flexDirection: 'row', gap: 4, justifyContent: 'center' }}>
                            {row.map(key => {
                              const isWide = key === 'ENTER' || key === 'DEL';
                              return (
                                <TouchableOpacity key={key} onPress={() => handleScrambleKey(key)} activeOpacity={0.7}
                                  style={{ height: 48, flex: isWide ? 1.5 : 1, maxWidth: isWide ? 60 : 36, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.7)', alignItems: 'center', justifyContent: 'center' }}>
                                  <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: isWide ? 16 : 17, color: INK }}>{key === 'DEL' ? '\u232B' : key}</Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        ))}
                      </View>
                    </>
                  ) : (
                    <View style={{ backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 18, padding: 24, alignItems: 'center', width: '100%' }}>
                      <Text style={{ fontSize: 44 }}>{scrambleScore >= maxRounds * 0.8 ? '🏆' : '🎉'}</Text>
                      <Text style={{ fontFamily: 'Poppins_800ExtraBold', fontSize: 22, color: INK, marginTop: 8 }}>All done!</Text>
                      <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 16, color: INK4, marginTop: 4 }}>{scrambleScore} out of {maxRounds} correct</Text>
                      <TouchableOpacity onPress={startScramble} style={{ backgroundColor: child.colour, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 28, marginTop: 16 }} activeOpacity={0.8}>
                        <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 15, color: '#fff' }}>Play again</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </ScrollView>
              );
            })()}

            {/* ── MATHS SPRINT ── */}
            {activeGame === 'maths' && (() => {
              const NUM_ROWS = [['1','2','3'],['4','5','6'],['7','8','9'],['0','DEL','GO']];
              function handleMathsKey(key: string) {
                if (!mathsActive) return;
                if (key === 'DEL') { setMathsInput(prev => prev.slice(0, -1)); return; }
                if (key === 'GO') {
                  const correct = parseInt(mathsInput) === mathsAnswer;
                  if (correct) { setMathsScore(prev => prev + 1); setMathsFlash('correct'); }
                  else { setMathsFlash('wrong'); }
                  setTimeout(() => setMathsFlash(null), 400);
                  nextMathsQuestion();
                  return;
                }
                if (mathsInput.length >= 6) return;
                setMathsInput(prev => prev + key);
              }
              return (
                <View style={{ flex: 1, alignItems: 'center', paddingTop: 10 }}>
                  <Text style={{ fontFamily: 'Poppins_800ExtraBold', fontSize: 20, color: INK, marginBottom: 10 }}>Maths Sprint</Text>
                  {/* Timer bar */}
                  <View style={{ width: '90%', height: 8, backgroundColor: 'rgba(0,0,0,0.08)', borderRadius: 4, overflow: 'hidden', marginBottom: 12 }}>
                    <View style={{ height: 8, borderRadius: 4, backgroundColor: mathsTimeLeft <= 10 ? '#FF4545' : child.colour, width: `${(mathsTimeLeft / 120) * 100}%` }}/>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 16, marginBottom: 14 }}>
                    <View style={{ backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 14, paddingHorizontal: 18, paddingVertical: 8, alignItems: 'center' }}>
                      <Text style={{ fontFamily: 'Poppins_800ExtraBold', fontSize: 26, color: mathsTimeLeft <= 10 ? '#FF4545' : INK }}>{mathsTimeLeft}s</Text>
                    </View>
                    <View style={{ backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 14, paddingHorizontal: 18, paddingVertical: 8, alignItems: 'center' }}>
                      <Text style={{ fontFamily: 'Poppins_800ExtraBold', fontSize: 26, color: child.colour }}>{mathsScore}</Text>
                      <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 11, color: INK4 }}>correct</Text>
                    </View>
                  </View>
                  {mathsActive ? (
                    <>
                      <View style={{ backgroundColor: mathsFlash === 'correct' ? 'rgba(34,197,94,0.15)' : mathsFlash === 'wrong' ? 'rgba(255,69,69,0.10)' : 'rgba(255,255,255,0.6)', borderRadius: 18, padding: 28, alignItems: 'center', width: '90%', marginBottom: 10 }}>
                        <Text style={{ fontFamily: 'Poppins_800ExtraBold', fontSize: 40, color: INK }}>{mathsQuestion}</Text>
                      </View>
                      {/* Answer display */}
                      <View style={{ backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 20, paddingVertical: 12, minWidth: 120, alignItems: 'center', marginBottom: 10 }}>
                        <Text style={{ fontFamily: 'Poppins_800ExtraBold', fontSize: 28, color: INK }}>{mathsInput || '?'}</Text>
                      </View>
                      {/* Number pad */}
                      <View style={{ gap: 6, width: '80%' }}>
                        {NUM_ROWS.map((row, ri) => (
                          <View key={ri} style={{ flexDirection: 'row', gap: 6 }}>
                            {row.map(key => (
                              <TouchableOpacity key={key} onPress={() => handleMathsKey(key)} activeOpacity={0.7}
                                style={{ flex: 1, height: 62, borderRadius: 14, backgroundColor: key === 'GO' ? child.colour : key === 'DEL' ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.7)', alignItems: 'center', justifyContent: 'center' }}>
                                <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: key === 'GO' || key === 'DEL' ? 14 : 22, color: key === 'GO' ? '#fff' : INK }}>{key === 'DEL' ? '\u232B' : key}</Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        ))}
                      </View>
                    </>
                  ) : mathsTimeLeft === 0 ? (
                    <View style={{ backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 18, padding: 24, alignItems: 'center', width: '90%' }}>
                      <Text style={{ fontSize: 44 }}>{mathsScore >= 15 ? '🔥' : mathsScore >= 8 ? '⭐' : '💪'}</Text>
                      <Text style={{ fontFamily: 'Poppins_800ExtraBold', fontSize: 22, color: INK, marginTop: 8 }}>Time's up!</Text>
                      <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 16, color: INK4, marginTop: 4 }}>{mathsScore} correct in 2 minutes</Text>
                      <TouchableOpacity onPress={startMaths} style={{ backgroundColor: child.colour, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 28, marginTop: 16 }} activeOpacity={0.8}>
                        <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 15, color: '#fff' }}>Try again</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity onPress={startMaths} style={{ backgroundColor: child.colour, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32, marginTop: 20 }} activeOpacity={0.8}>
                      <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 16, color: '#fff' }}>Start!</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })()}

            {/* ── AUSSIE TRIVIA ── */}
            {activeGame === 'trivia' && (() => {
              const tier = child.tier;
              const list = tier === 'little' ? TRIVIA_LITTLE : tier === 'middle' ? TRIVIA_MIDDLE : TRIVIA_OLDER;
              const isDone = triviaIndex >= list.length;
              return (
                <ScrollView style={{ flex: 1 }} contentContainerStyle={{ alignItems: 'center', padding: 14, paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
                  <Text style={{ fontFamily: 'Poppins_800ExtraBold', fontSize: 20, color: INK, marginBottom: 4 }}>Aussie Trivia</Text>
                  <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 14, color: INK4, marginBottom: 14 }}>Q{Math.min(triviaIndex + 1, list.length)}/{list.length} | Score: {triviaScore}</Text>
                  {!isDone && triviaQ ? (
                    <View style={{ backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 18, padding: 18, width: '100%' }}>
                      <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 17, color: INK, lineHeight: 24, marginBottom: 16 }}>{triviaQ.question}</Text>
                      {triviaQ.options.map((opt, i) => {
                        const isSelected = triviaSelected === i;
                        const isCorrect = i === triviaQ!.correct;
                        const showResult = triviaSelected !== null;
                        return (
                          <TouchableOpacity
                            key={i}
                            onPress={() => {
                              if (triviaSelected !== null) return;
                              setTriviaSelected(i);
                              if (i === triviaQ!.correct) {
                                setTriviaScore(prev => prev + 1);
                                setCelebration({ emoji: '✅', title: 'Correct!', sub: opt });
                              } else {
                                setCelebration({ emoji: '❌', title: `Nope — it was ${triviaQ!.options[triviaQ!.correct]}`, sub: '' });
                              }
                              setTimeout(() => {
                                const next = triviaIndex + 1;
                                setTriviaIndex(next);
                                if (next < list.length) { setTriviaQ(list[next]); setTriviaSelected(null); }
                              }, 2000);
                            }}
                            style={{ borderRadius: 14, padding: 16, marginBottom: 8, borderWidth: 2, backgroundColor: showResult && isCorrect ? 'rgba(34,197,94,0.10)' : showResult && isSelected && !isCorrect ? 'rgba(255,69,69,0.06)' : '#fff', borderColor: showResult ? (isCorrect ? '#22C55E' : isSelected ? '#FF4545' : 'rgba(0,0,0,0.06)') : 'rgba(0,0,0,0.06)' }}
                            activeOpacity={0.75}
                          >
                            <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: showResult && isCorrect ? '#22C55E' : showResult && isSelected && !isCorrect ? '#FF4545' : INK }}>{opt}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ) : (
                    <View style={{ backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 18, padding: 24, alignItems: 'center', width: '100%' }}>
                      <Text style={{ fontSize: 44 }}>{triviaScore >= list.length * 0.8 ? '🏆' : triviaScore >= list.length * 0.5 ? '⭐' : '💪'}</Text>
                      <Text style={{ fontFamily: 'Poppins_800ExtraBold', fontSize: 22, color: INK, marginTop: 8 }}>Quiz complete!</Text>
                      <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 16, color: INK4, marginTop: 4 }}>{triviaScore} out of {list.length} correct</Text>
                      <TouchableOpacity onPress={startTrivia} style={{ backgroundColor: child.colour, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 28, marginTop: 16 }} activeOpacity={0.8}>
                        <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 15, color: '#fff' }}>Play again</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </ScrollView>
              );
            })()}

            {/* ── MINI CROSSWORD ── */}
            {activeGame === 'crossword' && (() => {
              const puzzle = getWeeklyCrossword();
              return (
                <ScrollView style={{ flex: 1 }} contentContainerStyle={{ alignItems: 'center', padding: 14, paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
                  <Text style={{ fontFamily: 'Poppins_800ExtraBold', fontSize: 20, color: INK, marginBottom: 4 }}>Mini Crossword</Text>
                  <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 13, color: INK4, marginBottom: 12 }}>Weekly puzzle — tap cells to fill in</Text>
                  {/* Grid — interactive with clue numbers */}
                  {(() => {
                    // Build a map of clue numbers per cell position
                    const cellNums: Record<string, number> = {};
                    [...puzzle.acrossClues, ...puzzle.downClues].forEach(cl => { cellNums[`${cl.row}-${cl.col}`] = cl.num; });
                    return (
                  <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 8, alignItems: 'center', marginBottom: 10 }}>
                    {puzzle.grid.map((row, r) => (
                      <View key={r} style={{ flexDirection: 'row' }}>
                        {row.map((cell, c) => {
                          const isBlack = cell === '#';
                          const isSelected = crosswordSel?.r === r && crosswordSel?.c === c;
                          const userVal = crosswordGrid[`${r}-${c}`] || '';
                          const isChecked = crosswordChecked;
                          const isCorrect = isChecked && userVal.toUpperCase() === cell.toUpperCase();
                          const isWrong = isChecked && userVal && userVal.toUpperCase() !== cell.toUpperCase();
                          const clueNum = cellNums[`${r}-${c}`];
                          return (
                            <TouchableOpacity key={c} activeOpacity={isBlack ? 1 : 0.7}
                              onPress={() => { if (!isBlack) setCrosswordSel({ r, c }); }}
                              style={{ width: 52, height: 52, borderWidth: 1.5, borderColor: isBlack ? 'transparent' : isSelected ? child.colour : 'rgba(0,0,0,0.15)', backgroundColor: isBlack ? '#1A1A1A' : isSelected ? `${child.colour}20` : isCorrect ? 'rgba(34,197,94,0.12)' : isWrong ? 'rgba(255,69,69,0.08)' : '#fff', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                              {!!clueNum && !isBlack && (
                                <Text style={{ position: 'absolute', top: 2, left: 4, fontFamily: 'Poppins_700Bold', fontSize: 8, color: 'rgba(0,0,0,0.35)' }}>{clueNum}</Text>
                              )}
                              {!isBlack && <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 20, color: isCorrect ? '#22C55E' : isWrong ? '#FF4545' : INK }}>{userVal}</Text>}
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    ))}
                  </View>
                    );
                  })()}
                  {/* Clues */}
                  <View style={{ width: '100%', backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 16, padding: 14, marginBottom: 10 }}>
                    <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 12, color: INK4, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Across</Text>
                    {puzzle.acrossClues.map(cl => (
                      <Text key={cl.num} style={{ fontFamily: 'Poppins_400Regular', fontSize: 14, color: INK, marginBottom: 4 }}>{cl.num}. {cl.clue}</Text>
                    ))}
                    <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 12, color: INK4, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 10, marginBottom: 6 }}>Down</Text>
                    {puzzle.downClues.map(cl => (
                      <Text key={cl.num} style={{ fontFamily: 'Poppins_400Regular', fontSize: 14, color: INK, marginBottom: 4 }}>{cl.num}. {cl.clue}</Text>
                    ))}
                  </View>
                  {/* Check button */}
                  <TouchableOpacity onPress={() => setCrosswordChecked(true)} style={{ backgroundColor: child.colour, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 28, marginBottom: 8 }} activeOpacity={0.8}>
                    <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 15, color: '#fff' }}>Check answers</Text>
                  </TouchableOpacity>
                  {/* Keyboard for crossword */}
                  {crosswordSel && (
                    <View style={{ gap: 5, paddingHorizontal: 6, width: '100%', marginTop: 6 }}>
                      {KB_ROWS.map((row, ri) => (
                        <View key={ri} style={{ flexDirection: 'row', gap: 4, justifyContent: 'center' }}>
                          {row.map(key => {
                            const isWide = key === 'ENTER' || key === 'DEL';
                            return (
                              <TouchableOpacity key={key} onPress={() => {
                                if (!crosswordSel) return;
                                const { r, c } = crosswordSel;
                                if (key === 'DEL') {
                                  setCrosswordGrid(prev => { const n = { ...prev }; delete n[`${r}-${c}`]; return n; });
                                } else if (key === 'ENTER') {
                                  setCrosswordSel(null);
                                } else {
                                  setCrosswordGrid(prev => ({ ...prev, [`${r}-${c}`]: key }));
                                  // Auto advance to next cell in row
                                  const puzzle = getWeeklyCrossword();
                                  for (let nc = c + 1; nc < 5; nc++) {
                                    if (puzzle.grid[r][nc] !== '#') { setCrosswordSel({ r, c: nc }); return; }
                                  }
                                  setCrosswordSel(null);
                                }
                              }} activeOpacity={0.7}
                                style={{ height: 44, flex: isWide ? 1.5 : 1, maxWidth: isWide ? 56 : 34, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.7)', alignItems: 'center', justifyContent: 'center' }}>
                                <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: isWide ? 16 : 16, color: INK }}>{key === 'DEL' ? '\u232B' : key}</Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      ))}
                    </View>
                  )}
                </ScrollView>
              );
            })()}

            {/* ── Game info overlay ── */}
            {showGameInfo && (
              <TouchableOpacity
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 24 }}
                activeOpacity={1}
                onPress={() => setShowGameInfo(false)}
              >
                <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 24, width: '100%', maxWidth: 320 }}>
                  {activeGame === 'wordle' && (
                    <>
                      <Text style={{ fontFamily: 'Poppins_800ExtraBold', fontSize: 18, color: INK, marginBottom: 10 }}>How to play</Text>
                      <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 14, color: INK, lineHeight: 21, marginBottom: 12 }}>Guess the hidden word in 6 tries. Each guess must be a real word.</Text>
                      <View style={{ gap: 8, marginBottom: 14 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: child.colour, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontFamily: 'Poppins_800ExtraBold', fontSize: 16, color: '#fff' }}>A</Text></View>
                          <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 14, color: INK }}>Correct letter, correct spot</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#F0DC80', alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontFamily: 'Poppins_800ExtraBold', fontSize: 16, color: '#5A4200' }}>B</Text></View>
                          <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 14, color: INK }}>Correct letter, wrong spot</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#6B7280', alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontFamily: 'Poppins_800ExtraBold', fontSize: 16, color: '#fff' }}>C</Text></View>
                          <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 14, color: INK }}>Letter not in the word</Text>
                        </View>
                      </View>
                      <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 13, color: INK4 }}>A new word every day!</Text>
                    </>
                  )}
                  {activeGame === 'crossword' && (
                    <>
                      <Text style={{ fontFamily: 'Poppins_800ExtraBold', fontSize: 18, color: INK, marginBottom: 10 }}>How to play</Text>
                      <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 14, color: INK, lineHeight: 21, marginBottom: 8 }}>Fill in the grid using the clues below.</Text>
                      <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 14, color: INK, lineHeight: 21, marginBottom: 8 }}>Tap a white cell to select it, then use the keyboard to type a letter. The cursor moves to the next cell automatically.</Text>
                      <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 14, color: INK, lineHeight: 21, marginBottom: 8 }}>When you're done, tap "Check answers" to see which letters are correct (green) or wrong (red).</Text>
                      <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 13, color: INK4 }}>New puzzle every week!</Text>
                    </>
                  )}
                  <TouchableOpacity onPress={() => setShowGameInfo(false)} style={{ backgroundColor: child.colour, borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 14 }} activeOpacity={0.8}>
                    <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 15, color: '#fff' }}>Got it!</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            )}

            {/* ── Celebration overlay (shared across games) ── */}
            {celebration && (
              <TouchableOpacity
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center', zIndex: 99 }}
                activeOpacity={1}
                onPress={() => setCelebration(null)}
              >
                <Text style={{ fontSize: 56 }}>{celebration.emoji}</Text>
                <Text style={{ fontFamily: 'Poppins_800ExtraBold', fontSize: 24, color: '#fff', marginTop: 10, textAlign: 'center' }}>{celebration.title}</Text>
                {!!celebration.sub && <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 15, color: 'rgba(255,255,255,0.6)', marginTop: 6, textAlign: 'center' }}>{celebration.sub}</Text>}
              </TouchableOpacity>
            )}
              </View>
            </View>
          </View>
        </Modal>

        {/* GIPHY celebration overlay */}
        {showGiphy && (
          <TouchableOpacity
            style={s.giphyOverlay}
            activeOpacity={1}
            onPress={() => setShowGiphy(false)}
          >
            <View style={s.giphyFrame}>
              {giphyData.gifUrl ? (
                <Image source={{ uri: giphyData.gifUrl }} style={{ width: 260, height: 195, borderRadius: 20 }} resizeMode="cover"/>
              ) : (
                <Text style={s.giphyPlaceholder}>{'\u{1F389}'}</Text>
              )}
            </View>
            <View style={s.giphyPtsEarned}>
              <Text style={s.giphyPtsText}>+{giphyData.pts} points! {'\u2B50'}</Text>
            </View>
            <Text style={s.giphyText}>You smashed it, {selectedChild}! {'\u{1F525}'}</Text>
            <Text style={s.giphySub}>
              {giphyData.jobName} done!
              {jobsDone + 1 >= jobsTotal
                ? ' All jobs complete today!'
                : ` ${jobsTotal - jobsDone - 1} jobs left`
              }
            </Text>
            <View style={s.giphyDismiss}>
              <Text style={s.giphyDismissTxt}>Tap anywhere to continue</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Redeem confirmation modal */}
        <Modal visible={redeemItem !== null} transparent animationType="fade">
          <View style={s.confirmOverlay}>
            <View style={s.confirmSheet}>
              <Text style={s.confirmIcon}>{redeemItem?.icon}</Text>
              <Text style={s.confirmTitle}>{redeemItem?.name}</Text>
              <Text style={s.confirmSub}>This will go to Mum or Dad for approval. If they say yes, the points come off your balance.</Text>
              <View style={s.confirmBalance}>
                <View style={s.confirmBalRow}>
                  <Text style={s.confirmBalLabel}>Your balance</Text>
                  <Text style={s.confirmBalValue}>{childWithDb.points} pts</Text>
                </View>
                <View style={s.confirmBalRow}>
                  <Text style={s.confirmBalLabel}>Cost of this reward</Text>
                  <Text style={[s.confirmBalValue, { color: RED_ACC }]}>{'\u2212'} {redeemItem?.cost} pts</Text>
                </View>
                <View style={s.confirmBalDivider} />
                <View style={s.confirmBalRow}>
                  <Text style={[s.confirmBalLabel, { fontFamily: 'Poppins_800ExtraBold', color: INK }]}>Balance after</Text>
                  <Text style={[s.confirmBalValue, { fontFamily: 'Poppins_800ExtraBold', color: HUB_DARK }]}>{child.points - (redeemItem?.cost ?? 0)} pts</Text>
                </View>
              </View>
              <TouchableOpacity style={s.confirmYes} onPress={() => requestReward(redeemItem)} activeOpacity={0.7}>
                <Text style={s.confirmYesTxt}>Yes, request this reward {redeemItem?.icon}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.confirmNo} onPress={() => setRedeemItem(null)} activeOpacity={0.7}>
                <Text style={s.confirmNoTxt}>Not yet — keep saving</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Suggest a Job form modal */}
        <Modal visible={suggestFormOpen} transparent animationType="slide" onRequestClose={() => setSuggestFormOpen(false)}>
          <View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.4)', justifyContent:'flex-end' }}>
            <TouchableOpacity style={{ flex:1 }} onPress={() => { Keyboard.dismiss(); setSuggestFormOpen(false); }} activeOpacity={1}/>
            <ScrollView scrollEnabled={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 0 }}>
            <View style={{ backgroundColor:'#fff', borderTopLeftRadius:24, borderTopRightRadius:24, padding:20 }}>
              <View style={{ width:36, height:4, borderRadius:2, backgroundColor:'rgba(0,0,0,0.12)', alignSelf:'center', marginBottom:16 }}/>
              <Text style={{ fontFamily:'Poppins_700Bold', fontSize:18, color:INK, marginBottom:4 }}>Suggest a job</Text>
              <Text style={{ fontFamily:'Poppins_400Regular', fontSize:13, color:INK4, marginBottom:16 }}>Mum or Dad will review and approve it.</Text>

              <Text style={{ fontFamily:'Poppins_700Bold', fontSize:11, color:INK4, textTransform:'uppercase', letterSpacing:0.5, marginBottom:6 }}>What's the job?</Text>
              <TextInput
                style={{ backgroundColor:'rgba(0,0,0,0.04)', borderRadius:12, paddingHorizontal:14, paddingVertical:12, fontFamily:'Poppins_400Regular', fontSize:15, color:INK, marginBottom:14 }}
                placeholder="e.g. Washed the car"
                placeholderTextColor="rgba(0,0,0,0.30)"
                value={suggestTitle}
                onChangeText={setSuggestTitle}
              />

              <Text style={{ fontFamily:'Poppins_700Bold', fontSize:11, color:INK4, textTransform:'uppercase', letterSpacing:0.5, marginBottom:6 }}>How many points?</Text>
              <View style={{ flexDirection:'row', gap:8, marginBottom:14 }}>
                {[10, 20, 30, 50, 100].map(pts => (
                  <TouchableOpacity
                    key={pts}
                    onPress={() => setSuggestPts(pts)}
                    style={{ flex:1, borderWidth:1.5, borderColor: suggestPts === pts ? HUB_DARK : 'rgba(0,0,0,0.12)', borderRadius:12, paddingVertical:10, alignItems:'center', backgroundColor: suggestPts === pts ? 'rgba(10,64,48,0.07)' : 'transparent' }}
                    activeOpacity={0.75}
                  >
                    <Text style={{ fontFamily:'Poppins_600SemiBold', fontSize:14, color: suggestPts === pts ? HUB_DARK : INK4 }}>{pts}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={{ fontFamily:'Poppins_700Bold', fontSize:11, color:INK4, textTransform:'uppercase', letterSpacing:0.5, marginBottom:6 }}>Note to Mum or Dad (optional)</Text>
              <TextInput
                style={{ backgroundColor:'rgba(0,0,0,0.04)', borderRadius:12, paddingHorizontal:14, paddingVertical:12, fontFamily:'Poppins_400Regular', fontSize:14, color:INK, minHeight:60, textAlignVertical:'top', marginBottom:16 }}
                placeholder="Optional details..."
                placeholderTextColor="rgba(0,0,0,0.30)"
                value={suggestNote}
                onChangeText={setSuggestNote}
                multiline
              />

              <TouchableOpacity onPress={submitJobSuggestion} style={{ backgroundColor:HUB_DARK, borderRadius:14, paddingVertical:14, alignItems:'center', marginBottom:8 }} activeOpacity={0.8}>
                <Text style={{ fontFamily:'Poppins_700Bold', fontSize:15, color:'#fff' }}>Send to Mum & Dad</Text>
              </TouchableOpacity>
              <Text style={{ fontFamily:'Poppins_400Regular', fontSize:12, color:INK4, textAlign:'center' }}>They'll get a notification and can approve, change the points, or send a note back.</Text>
            </View>
            </ScrollView>
          </View>
        </Modal>
      </View>
    );
  }

  // ── Jobs Tab ─────────────────────────────────────────────────────────────
  function JobsTab() {
    const todayStr = localDateStr();
    const activeJobs = jobs.filter(j => !j.done);
    const completedToday = jobs.filter(j => j.done);
    // Older completed: from Supabase, completed on previous days, not in today's list
    const olderCompleted = dbJobs.filter((j: any) =>
      j.child_name === selectedChild && j.is_complete &&
      j.completed_at && !j.completed_at.startsWith(todayStr)
    );

    return (
      <View style={s.tabContent}>
        {/* All done hero */}
        {activeJobs.length === 0 && completedToday.length > 0 && (
          <View style={{ backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 18, padding: 20, alignItems: 'center', marginBottom: 8 }}>
            <Text style={{ fontSize: 32, marginBottom: 8 }}>{'\u{1F31F}'}</Text>
            <Text style={{ fontFamily: 'Poppins_800ExtraBold', fontSize: 18, color: INK }}>All done today!</Text>
            <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 14, color: INK4, marginTop: 4 }}>Keep it up tomorrow for day {childWithDb.streak + 1}</Text>
          </View>
        )}

        {/* ── Active jobs ── */}
        {activeJobs.map((job, i) => {
          const jid = job.id || String(i);
          const isExp = expandedJobId === jid;
          return (
            <View key={jid} style={s.jobCard}>
              {/* Card body — tap to expand */}
              <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 }} activeOpacity={0.7} onPress={() => setExpandedJobId(isExp ? null : jid)}>
                <Text style={s.jobIcon}>{job.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.jobName}>{job.name}</Text>
                  <Text style={s.jobPts}>
                    {job.pts} pts {'\u00B7'}{' '}
                    <Text style={[s.jobType, job.type === 'daily' ? s.jobTypeDaily : s.jobTypeOneoff]}>
                      {job.type === 'daily' ? 'daily' : job.type === 'weekly' ? 'weekly' : 'this week'}
                    </Text>
                  </Text>
                </View>
              </TouchableOpacity>
              {/* Checkbox — tap to complete */}
              <TouchableOpacity
                onPress={() => { setExpandedJobId(null); completeJob(job); }}
                style={s.jobCheck}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              />
            </View>
          );
        })}

        {/* ── Completed today — strikethrough ── */}
        {completedToday.length > 0 && (
          <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 11, color: 'rgba(0,0,0,0.25)', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 8, marginBottom: 4, paddingHorizontal: 2 }}>Done today</Text>
        )}
        {completedToday.map((job, i) => {
          const jid = job.id || ('d' + i);
          const isExp = expandedJobId === jid;
          return (
            <View key={jid}>
              <View style={[s.jobCard, { opacity: 0.55 }]}>
                {/* Card body — tap to expand options */}
                <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 }} activeOpacity={0.7} onPress={() => setExpandedJobId(isExp ? null : jid)}>
                  <Text style={[s.jobIcon, { opacity: 0.6 }]}>{job.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.jobName, { textDecorationLine: 'line-through', color: 'rgba(0,0,0,0.35)' }]}>{job.name}</Text>
                    <Text style={[s.jobPts, { color: 'rgba(0,0,0,0.25)' }]}>+{job.pts} pts earned</Text>
                  </View>
                </TouchableOpacity>
                {/* Checkbox — tap to undo */}
                <TouchableOpacity
                  onPress={() => uncompleteJob(job)}
                  style={[s.jobCheck, s.jobCheckDone]}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <IcoCheck size={14} />
                </TouchableOpacity>
              </View>
              {/* Expanded options */}
              {isExp && (
                <View style={{ backgroundColor: 'rgba(255,255,255,0.4)', borderRadius: 14, marginTop: -4, marginBottom: 4, padding: 12, flexDirection: 'row', gap: 8, justifyContent: 'flex-end' }}>
                  <TouchableOpacity onPress={() => { setExpandedJobId(null); repeatJob(job); }} style={{ backgroundColor: HUB_DARK, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 16 }} activeOpacity={0.75}>
                    <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: '#fff' }}>Repeat</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => { setExpandedJobId(null); uncompleteJob(job); }} style={{ backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 16 }} activeOpacity={0.75}>
                    <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: INK4 }}>Undo</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}

        {/* Suggest a job */}
        <TouchableOpacity style={[s.jobCard, s.suggestJob]} activeOpacity={0.7} onPress={() => setSuggestFormOpen(true)}>
          <Text style={{ fontSize: 26, opacity: 0.3 }}>{'\u2795'}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[s.jobName, { color: INK4 }]}>Suggest a job</Text>
            <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 13, color: 'rgba(0,0,0,0.25)' }}>
              Propose points — parent approves
            </Text>
          </View>
        </TouchableOpacity>

        {/* ── Completed Jobs history (previous days) ── */}
        {olderCompleted.length > 0 && (
          <>
            <TouchableOpacity onPress={() => setShowCompletedJobs(v => !v)} style={{ paddingVertical: 12, alignItems: 'center', marginTop: 4 }} activeOpacity={0.7}>
              <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: INK4 }}>
                {showCompletedJobs ? 'Hide completed jobs' : `Show completed jobs (${olderCompleted.length})`}
              </Text>
            </TouchableOpacity>
            {showCompletedJobs && olderCompleted.slice(0, 20).map((j: any) => {
              const jid = 'old-' + j.id;
              const isExp = expandedJobId === jid;
              const completedDate = j.completed_at ? new Date(j.completed_at).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' }) : '';
              return (
                <View key={j.id}>
                  <TouchableOpacity style={[s.jobCard, { opacity: 0.4 }]} activeOpacity={0.7} onPress={() => setExpandedJobId(isExp ? null : jid)}>
                    <Text style={[s.jobIcon, { opacity: 0.5 }]}>{j.emoji || '\u{1F4CB}'}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.jobName, { textDecorationLine: 'line-through', color: 'rgba(0,0,0,0.30)' }]}>{j.title}</Text>
                      <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 12, color: 'rgba(0,0,0,0.20)' }}>+{j.points} pts {completedDate ? `\u00B7 ${completedDate}` : ''}</Text>
                    </View>
                  </TouchableOpacity>
                  {isExp && (
                    <View style={{ backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 14, marginTop: -4, marginBottom: 4, padding: 12, flexDirection: 'row', gap: 8, justifyContent: 'flex-end' }}>
                      <TouchableOpacity onPress={() => { setExpandedJobId(null); repeatJob({ name: j.title, icon: j.emoji, pts: j.points }); }} style={{ backgroundColor: HUB_DARK, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 16 }} activeOpacity={0.75}>
                        <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: '#fff' }}>Repeat</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}
          </>
        )}
      </View>
    );
  }

  // ── Rewards Tab ──────────────────────────────────────────────────────────
  function RewardsTab() {
    return (
      <View style={s.tabContent}>
        {/* Reward cards */}
        {rewards.map((reward, i) => {
          const pct = Math.min(100, Math.round((childPoints / reward.cost) * 100));
          const canAfford = childPoints >= reward.cost;
          const isAlmost = !canAfford && pct >= 70;

          return (
            <View
              key={i}
              style={[
                s.rewardCard,
                canAfford && s.rewardCardAfford,
                !canAfford && !isAlmost && s.rewardCardFar,
              ]}
            >
              <View style={s.rewardTop}>
                <Text style={s.rewardIcon}>{reward.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[s.rewardName, !canAfford && !isAlmost && { color: INK2 }]}>{reward.name}</Text>
                  <Text style={s.rewardCost}>
                    Costs {reward.cost} pts
                    {!canAfford && ` \u00B7 ${reward.cost - childPoints} more to go`}
                  </Text>
                </View>
                {canAfford && (
                  <View style={s.affordTag}><Text style={s.affordTagTxt}>{'\u2713'} You can afford this</Text></View>
                )}
                {isAlmost && (
                  <View style={s.almostTag}><Text style={s.almostTagTxt}>Almost there!</Text></View>
                )}
              </View>

              {/* Progress bar */}
              <View style={s.rewardBarWrap}>
                <View style={[
                  s.rewardBar,
                  { width: `${pct}%` },
                  canAfford && { backgroundColor: HUB_BG },
                  isAlmost && { backgroundColor: GOLD },
                  !canAfford && !isAlmost && { backgroundColor: 'rgba(0,0,0,0.15)' },
                ]} />
              </View>
              <View style={s.rewardBarRow}>
                <Text style={[s.rewardBarLabel, !canAfford && !isAlmost && { color: 'rgba(0,0,0,0.3)' }]}>
                  {canAfford ? `You have ${childWithDb.points} pts` : `${childWithDb.points} of ${reward.cost} pts`}
                </Text>
                <Text style={[
                  s.rewardBarLabel,
                  canAfford && { color: HUB_DARK, fontFamily: 'Poppins_700Bold' },
                  isAlmost && { color: GOLD, fontFamily: 'Poppins_700Bold' },
                ]}>
                  {canAfford ? 'Ready to redeem!' : isAlmost ? `${reward.cost - childPoints} pts away` : `${pct}%`}
                </Text>
              </View>

              {/* CTA */}
              <TouchableOpacity
                style={[
                  s.redeemBtn,
                  canAfford && s.redeemBtnAfford,
                  isAlmost && s.redeemBtnAlmost,
                  !canAfford && !isAlmost && s.redeemBtnDisabled,
                ]}
                activeOpacity={canAfford ? 0.7 : 1}
                onPress={() => { if (canAfford) setRedeemItem(reward); }}
              >
                <Text style={[
                  s.redeemBtnTxt,
                  canAfford && s.redeemBtnTxtAfford,
                  isAlmost && s.redeemBtnTxtAlmost,
                  !canAfford && !isAlmost && s.redeemBtnTxtDisabled,
                ]}>
                  {canAfford ? `Redeem for ${reward.cost} pts \u2192` : isAlmost ? `Need ${reward.cost - childPoints} more pts to unlock` : `${reward.cost - childPoints} pts needed`}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}

        {/* Suggest a reward */}
        <TouchableOpacity style={[s.rewardCard, s.suggestJob]} activeOpacity={0.7} onPress={() => {
          setSuggestTitle('');
          setSuggestPts(100);
          setSuggestNote('');
          setSuggestFormOpen(true);
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <Text style={{ fontSize: 26, opacity: 0.3 }}>{'\u2795'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[s.rewardName, { color: INK4 }]}>Suggest a reward</Text>
              <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 13, color: 'rgba(0,0,0,0.25)' }}>
                Tell Mum or Dad what you'd love to earn
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Games Tab ────────────────────────────────────────────────────────────
  function GamesTab() {
    return (
      <View style={s.tabContent}>
        {/* Games grid */}
        <View style={s.gamesGrid}>
          {GAMES.map((game, i) => {
            if (game.featured) {
              return (
                <TouchableOpacity key={i} style={[s.gameFeatured, { backgroundColor: child.colour }]} activeOpacity={0.7} onPress={startWordle}>
                  <Text style={s.gameFeaturedIcon}>{game.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={s.gameFeaturedName}>{game.name}</Text>
                    <Text style={s.gameFeaturedDesc}>{game.desc}</Text>
                    <View style={s.gameBadgeDaily}>
                      <Text style={s.gameBadgeDailyTxt}>{game.badgeText}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            }
            const gameActions: Record<string, () => void> = {
              'Word Scramble': startScramble,
              'Maths Sprint': startMaths,
              'World Trivia': startTrivia,
              'Mini Crossword': () => { setCrosswordGrid({}); setCrosswordSel(null); setCrosswordChecked(false); setCelebration(null); setActiveGame('crossword'); },
            };
            return (
              <TouchableOpacity key={i} style={s.gameCard} activeOpacity={0.7} onPress={gameActions[game.name] || (() => {})}>
                <Text style={s.gameIcon}>{game.icon}</Text>
                <Text style={s.gameName}>{game.name}</Text>
                <Text style={s.gameDesc}>{game.desc}</Text>
                <View style={[
                  s.gameBadge,
                  game.badge === 'weekly' && s.gameBadgeWeekly,
                  game.badge === 'anytime' && s.gameBadgeAnytime,
                ]}>
                  <Text style={[
                    s.gameBadgeTxt,
                    game.badge === 'weekly' && s.gameBadgeWeeklyTxt,
                    game.badge === 'anytime' && s.gameBadgeAnytimeTxt,
                  ]}>{game.badgeText}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  }

  // ── Leaderboard Tab ──────────────────────────────────────────────────────
  function LeaderboardTab() {
    const sorted = [...CHILDREN].map(c => ({ ...c, points: dbPoints[c.name] ?? c.points, streak: dbStreaks[c.name] ?? c.streak })).sort((a, b) => b.points - a.points);

    return (
      <View style={s.tabContent}>
        {/* Podium */}
        <View style={s.podium}>
          {/* 2nd place */}
          <View style={s.podiumPos}>
            <View style={[s.podiumAv, { backgroundColor: sorted[1].colour, width: 42, height: 42 }]}>
              <Text style={[s.podiumAvTxt, { fontSize: 18 }]}>{sorted[1].initial}</Text>
            </View>
            <Text style={s.podiumName}>{sorted[1].name}</Text>
            <Text style={s.podiumPts}>{sorted[1].points} pts</Text>
            <View style={[s.podiumBar, { height: 55, backgroundColor: `${sorted[1].colour}33` }]}>
              <Text style={s.podiumRank}>2</Text>
            </View>
          </View>
          {/* 1st place */}
          <View style={s.podiumPos}>
            <Text style={{ fontSize: 18 }}>{'\u{1F451}'}</Text>
            <View style={[s.podiumAv, { backgroundColor: sorted[0].colour, width: 48, height: 48 }]}>
              <Text style={[s.podiumAvTxt, { fontSize: 20 }]}>{sorted[0].initial}</Text>
            </View>
            <Text style={s.podiumName}>{sorted[0].name}</Text>
            <Text style={[s.podiumPts, { fontSize: 16 }]}>{sorted[0].points} pts</Text>
            <View style={[s.podiumBar, { height: 72, backgroundColor: `${sorted[0].colour}33` }]}>
              <Text style={[s.podiumRank, { fontSize: 22 }]}>1</Text>
            </View>
          </View>
          {/* 3rd place */}
          <View style={s.podiumPos}>
            <View style={[s.podiumAv, { backgroundColor: sorted[2].colour, width: 38, height: 38 }]}>
              <Text style={[s.podiumAvTxt, { fontSize: 16 }]}>{sorted[2].initial}</Text>
            </View>
            <Text style={s.podiumName}>{sorted[2].name}</Text>
            <Text style={s.podiumPts}>{sorted[2].points} pts</Text>
            <View style={[s.podiumBar, { height: 40, backgroundColor: `${sorted[2].colour}33` }]}>
              <Text style={s.podiumRank}>3</Text>
            </View>
          </View>
        </View>

        {/* Detail rows */}
        {sorted.map((c, i) => (
          <View key={c.name} style={[s.lbRow, c.name === selectedChild && s.lbRowHighlight]}>
            <Text style={s.lbRank}>{i + 1}</Text>
            <View style={[s.lbAv, { backgroundColor: c.colour }]}>
              <Text style={s.lbAvTxt}>{c.initial}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.lbRowName}>{c.name}{c.name === selectedChild ? ' \u00B7 you!' : ''}</Text>
              <Text style={s.lbRowStreak}>{'\u{1F525}'} {c.streak} day streak</Text>
            </View>
            <Text style={s.lbRowPts}>{c.points}</Text>
          </View>
        ))}

        <View style={s.toggleNote}>
          <Text style={s.toggleNoteTxt}>Leaderboard is on \u2014 Mum or Dad can turn this off in settings {'\u{1F527}'}</Text>
        </View>
      </View>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[s.safe, view === 'hub' && { backgroundColor: childWithDb.bgLight || HUB_BG }]} edges={['top']}>
      <RNStatusBar barStyle="dark-content" />
      <Banner />
      <View style={[s.body, view === 'hub' && { backgroundColor: childWithDb.bgLight || HUB_BG }]}>
        {view === 'select' && <ChildSelectView />}
        {view === 'hub' && <HubHomeView />}
      </View>
    </SafeAreaView>
  );
}

// ── STYLES ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: HUB_BG },
  body: { flex: 1, backgroundColor: HUB_BG },

  // Banner
  banner: { paddingHorizontal: 20, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: HUB_BG },
  wordmark: { fontFamily: 'Poppins_800ExtraBold', fontSize: 40, letterSpacing: -1.5, color: INK, lineHeight: 46 },
  bannerLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 17, color: INK4 },
  divider: { height: 1, backgroundColor: 'rgba(0,0,0,0.08)' },

  // Child Select
  selectBody: { flex: 1 },
  selectHero: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 14 },
  selectGreet: { fontFamily: 'Poppins_500Medium', fontSize: 15, color: INK4, marginBottom: 4 },
  selectTitle: { fontFamily: 'Poppins_700Bold', fontSize: 32, color: INK, lineHeight: 38, letterSpacing: -0.5 },
  selectTitleEm: { fontStyle: 'italic', color: 'rgba(0,0,0,0.28)' },
  familyBadge: { marginLeft: 20, alignSelf: 'flex-start', backgroundColor: 'rgba(10,64,48,0.12)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 16 },
  familyBadgeTxt: { fontFamily: 'Poppins_700Bold', fontSize: 11, color: HUB_DARK, textTransform: 'uppercase', letterSpacing: 0.3 },
  selectCards: { paddingHorizontal: 14, gap: 12 },
  selectCard: { borderRadius: 22, paddingHorizontal: 20, paddingVertical: 20, flexDirection: 'row', alignItems: 'center', gap: 16 },
  selectCardAv: { width: 62, height: 62, borderRadius: 31, alignItems: 'center', justifyContent: 'center' },
  selectCardAvTxt: { fontFamily: 'Poppins_700Bold', fontSize: 22, color: '#fff' },
  selectCardName: { fontFamily: 'Poppins_700Bold', fontSize: 20, color: INK, marginBottom: 3 },
  selectCardMeta: { fontFamily: 'Poppins_500Medium', fontSize: 14, color: INK4 },
  selectCardPts: { backgroundColor: 'rgba(0,0,0,0.08)', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 9 },
  selectCardPtsTxt: { fontFamily: 'Poppins_700Bold', fontSize: 18, color: HUB_DARK },

  // Hub header
  hubHeader: { paddingHorizontal: 20, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(0,0,0,0.08)', alignItems: 'center', justifyContent: 'center' },
  hubHeaderTitle: { fontFamily: 'Poppins_800ExtraBold', fontSize: 22, color: INK },
  ptsBadge: { marginLeft: 'auto', borderRadius: 28, paddingHorizontal: 22, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', gap: 7 },
  ptsBadgeN: { fontFamily: 'Poppins_800ExtraBold', fontSize: 26, color: '#fff' },
  ptsBadgeL: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 0.3 },

  // Streak strip (little)
  streakStrip: { marginHorizontal: 14, marginBottom: 12, backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 18, paddingHorizontal: 18, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  streakFire: { fontSize: 32 },
  streakNum: { fontFamily: 'Poppins_800ExtraBold', fontSize: 28, color: INK, lineHeight: 32 },
  streakLbl: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: INK4, textTransform: 'uppercase', letterSpacing: 0.3 },

  // Older header card
  olderHeaderCard: { marginHorizontal: 14, marginBottom: 12, backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 22, paddingHorizontal: 22, paddingVertical: 18, flexDirection: 'row', alignItems: 'center', gap: 14 },
  olderPtsBig: { fontFamily: 'Poppins_800ExtraBold', fontSize: 38, color: INK, lineHeight: 44 },
  olderPtsLbl: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: INK4, textTransform: 'uppercase', letterSpacing: 0.3 },
  olderStreakPill: { backgroundColor: HUB_DARK, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 7, marginTop: 8, alignSelf: 'flex-start' },
  olderStreakPillTxt: { fontFamily: 'Poppins_700Bold', fontSize: 14, color: HUB_BG },

  // Middle stats
  midStats: { flexDirection: 'row', gap: 8, paddingHorizontal: 14, marginBottom: 12 },
  midStat: { flex: 1, backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 16, paddingVertical: 12, paddingHorizontal: 12, alignItems: 'center' },
  midStatN: { fontFamily: 'Poppins_800ExtraBold', fontSize: 22, color: INK, lineHeight: 26 },
  midStatL: { fontFamily: 'Poppins_600SemiBold', fontSize: 11, color: INK4, textTransform: 'uppercase', letterSpacing: 0.3, marginTop: 3 },

  // Tabs
  tabs: { flexDirection: 'row', gap: 8, paddingHorizontal: 14, marginBottom: 12 },
  tab: { flex: 1, backgroundColor: 'rgba(255,255,255,0.35)', borderRadius: 14, paddingVertical: 12, alignItems: 'center' },
  tabOn: { backgroundColor: CARD },
  tabTxt: { fontFamily: 'Poppins_700Bold', fontSize: 15, color: 'rgba(0,0,0,0.45)' },
  tabTxtOn: { color: HUB_DARK },

  // Tab content
  tabContent: { paddingHorizontal: 14, gap: 8 },

  // Job card (Little/Middle)
  jobCard: { backgroundColor: CARD, borderRadius: 20, paddingHorizontal: 20, paddingVertical: 18, flexDirection: 'row', alignItems: 'center', gap: 14 },
  jobIcon: { fontSize: 30 },
  jobName: { fontFamily: 'Poppins_700Bold', fontSize: 18, color: INK, marginBottom: 3 },
  jobPts: { fontFamily: 'Poppins_500Medium', fontSize: 14, color: INK4 },
  jobType: { fontFamily: 'Poppins_700Bold', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.3 },
  jobTypeDaily: { color: HUB_DARK },
  jobTypeOneoff: { color: AMBER_TXT },
  jobCheck: { width: 38, height: 38, borderRadius: 19, borderWidth: 2, borderColor: 'rgba(0,0,0,0.15)', alignItems: 'center', justifyContent: 'center', marginLeft: 'auto' },
  jobCheckDone: { backgroundColor: HUB_BG, borderColor: HUB_BG },
  suggestJob: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: 'rgba(0,0,0,0.12)', backgroundColor: 'rgba(0,0,0,0.02)' },

  // Older job card
  olderJob: { backgroundColor: CARD, borderRadius: 18, paddingHorizontal: 20, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', gap: 14 },
  olderJobIcon: { fontSize: 22 },
  olderJobName: { fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: INK, flex: 1 },
  olderJobPts: { fontFamily: 'Poppins_700Bold', fontSize: 15, color: HUB_DARK },
  olderJobCheck: { width: 34, height: 34, borderRadius: 10, borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.15)', alignItems: 'center', justifyContent: 'center' },
  olderJobCheckDone: { backgroundColor: HUB_BG, borderColor: HUB_BG },

  // Rewards
  balanceHero: { backgroundColor: HUB_DARK, borderRadius: 22, paddingHorizontal: 22, paddingVertical: 20, flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  balanceNum: { fontFamily: 'Poppins_800ExtraBold', fontSize: 42, color: '#fff', lineHeight: 44, letterSpacing: -1 },
  balanceLbl: { fontFamily: 'Poppins_600SemiBold', fontSize: 12, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 0.3, marginTop: 3 },
  balanceStreak: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 22, paddingHorizontal: 14, paddingVertical: 6, marginTop: 10, alignSelf: 'flex-start' },
  balanceStreakTxt: { fontFamily: 'Poppins_700Bold', fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  earnLabel: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 4 },
  earnNum: { fontFamily: 'Poppins_800ExtraBold', fontSize: 16, color: HUB_BG },
  earnSub: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 4 },

  rewardCard: { backgroundColor: CARD, borderRadius: 20, paddingHorizontal: 20, paddingVertical: 18 },
  rewardCardAfford: { borderWidth: 2, borderColor: HUB_BG },
  rewardCardFar: { backgroundColor: 'rgba(255,255,255,0.55)' },
  rewardTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  rewardIcon: { fontSize: 28 },
  rewardName: { fontFamily: 'Poppins_700Bold', fontSize: 18, color: INK, marginBottom: 2 },
  rewardCost: { fontFamily: 'Poppins_400Regular', fontSize: 14, color: INK4 },
  affordTag: { backgroundColor: HUB_BG, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 5, marginLeft: 'auto' },
  affordTagTxt: { fontFamily: 'Poppins_700Bold', fontSize: 12, color: HUB_DARK },
  almostTag: { backgroundColor: AMBER_BG, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 5, marginLeft: 'auto' },
  almostTagTxt: { fontFamily: 'Poppins_700Bold', fontSize: 12, color: AMBER_TXT },
  rewardBarWrap: { height: 8, backgroundColor: 'rgba(0,0,0,0.07)', borderRadius: 4, overflow: 'hidden', marginBottom: 6 },
  rewardBar: { height: 8, borderRadius: 4 },
  rewardBarRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  rewardBarLabel: { fontFamily: 'Poppins_400Regular', fontSize: 14, color: INK4 },
  redeemBtn: { borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  redeemBtnAfford: { backgroundColor: '#22C55E' },
  redeemBtnAlmost: { backgroundColor: AMBER_BG },
  redeemBtnDisabled: { backgroundColor: 'rgba(0,0,0,0.07)' },
  redeemBtnTxt: { fontFamily: 'Poppins_700Bold', fontSize: 16 },
  redeemBtnTxtAfford: { color: '#fff' },
  redeemBtnTxtAlmost: { color: AMBER_TXT },
  redeemBtnTxtDisabled: { color: 'rgba(0,0,0,0.3)' },

  // Games
  dailyBanner: { backgroundColor: HUB_DARK, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  dailyBannerTxt: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: HUB_BG },
  dailyBannerWord: { fontFamily: 'Poppins_800ExtraBold', fontSize: 17, color: '#fff', letterSpacing: 3 },
  dailyBannerPlay: { marginLeft: 'auto', backgroundColor: 'rgba(168,232,204,0.2)', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7 },
  dailyBannerPlayTxt: { fontFamily: 'Poppins_700Bold', fontSize: 13, color: HUB_BG },

  gamesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gameFeatured: { width: '100%', borderRadius: 20, paddingHorizontal: 18, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', gap: 14 },
  gameFeaturedIcon: { fontSize: 36 },
  gameFeaturedName: { fontFamily: 'Poppins_700Bold', fontSize: 18, color: '#fff', marginBottom: 3 },
  gameFeaturedDesc: { fontFamily: 'Poppins_400Regular', fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 20 },
  gameBadgeDaily: { backgroundColor: 'rgba(168,232,204,0.2)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 5, alignSelf: 'flex-start', marginTop: 8 },
  gameBadgeDailyTxt: { fontFamily: 'Poppins_700Bold', fontSize: 13, color: HUB_BG },
  gameCard: { width: (W - 28 - 10) / 2, backgroundColor: CARD, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 16 },
  gameIcon: { fontSize: 30, marginBottom: 8 },
  gameName: { fontFamily: 'Poppins_700Bold', fontSize: 16, color: INK, marginBottom: 3 },
  gameDesc: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: INK4, lineHeight: 19 },
  gameBadge: { backgroundColor: 'rgba(168,232,204,0.3)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 5, alignSelf: 'flex-start', marginTop: 8 },
  gameBadgeTxt: { fontFamily: 'Poppins_700Bold', fontSize: 13, color: HUB_DARK },
  gameBadgeWeekly: { backgroundColor: AMBER_BG },
  gameBadgeWeeklyTxt: { color: AMBER_TXT },
  gameBadgeAnytime: { backgroundColor: 'rgba(99,102,241,0.12)' },
  gameBadgeAnytimeTxt: { color: '#4338CA' },

  // Leaderboard
  podium: { flexDirection: 'row', gap: 8, alignItems: 'flex-end', paddingHorizontal: 0, marginBottom: 10 },
  podiumPos: { flex: 1, alignItems: 'center', gap: 4 },
  podiumAv: { borderRadius: 50, alignItems: 'center', justifyContent: 'center' },
  podiumAvTxt: { fontFamily: 'Poppins_700Bold', color: '#fff' },
  podiumName: { fontFamily: 'Poppins_700Bold', fontSize: 12, color: INK, textAlign: 'center' },
  podiumPts: { fontFamily: 'Poppins_800ExtraBold', fontSize: 14, color: INK, textAlign: 'center' },
  podiumBar: { borderTopLeftRadius: 8, borderTopRightRadius: 8, width: '100%', alignItems: 'center', justifyContent: 'center' },
  podiumRank: { fontFamily: 'Poppins_800ExtraBold', fontSize: 18, color: 'rgba(0,0,0,0.4)' },

  lbRow: { backgroundColor: CARD, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  lbRowHighlight: { borderWidth: 2, borderColor: 'rgba(34,197,94,0.3)' },
  lbRank: { fontFamily: 'Poppins_800ExtraBold', fontSize: 15, color: 'rgba(0,0,0,0.25)', width: 24 },
  lbAv: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  lbAvTxt: { fontFamily: 'Poppins_700Bold', fontSize: 14, color: '#fff' },
  lbRowName: { fontFamily: 'Poppins_700Bold', fontSize: 15, color: INK },
  lbRowStreak: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: INK4 },
  lbRowPts: { fontFamily: 'Poppins_800ExtraBold', fontSize: 16, color: HUB_DARK, marginLeft: 'auto' },
  toggleNote: { backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, marginTop: 6 },
  toggleNoteTxt: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: 'rgba(0,0,0,0.45)', textAlign: 'center' },

  // GIPHY overlay
  giphyOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', alignItems: 'center', justifyContent: 'center', gap: 12, zIndex: 50 },
  giphyFrame: { width: 260, height: 195, borderRadius: 20, backgroundColor: '#1a1a2e', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  giphyPlaceholder: { fontSize: 72 },
  giphyApiNote: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 6 },
  giphyPtsEarned: { backgroundColor: 'rgba(168,232,204,0.15)', borderRadius: 14, paddingHorizontal: 18, paddingVertical: 8 },
  giphyPtsText: { fontFamily: 'Poppins_800ExtraBold', fontSize: 20, color: HUB_BG },
  giphyText: { fontFamily: 'Poppins_800ExtraBold', fontSize: 22, color: '#fff', textAlign: 'center', letterSpacing: -0.3 },
  giphySub: { fontFamily: 'Poppins_400Regular', fontSize: 14, color: 'rgba(255,255,255,0.5)' },
  giphyDismiss: { backgroundColor: '#fff', borderRadius: 22, paddingHorizontal: 28, paddingVertical: 10, marginTop: 4 },
  giphyDismissTxt: { fontFamily: 'Poppins_700Bold', fontSize: 15, color: INK },

  // Redeem confirm modal
  confirmOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  confirmSheet: { backgroundColor: '#fff', borderRadius: 24, padding: 24, width: '100%' },
  confirmIcon: { fontSize: 40, textAlign: 'center', marginBottom: 10 },
  confirmTitle: { fontFamily: 'Poppins_800ExtraBold', fontSize: 18, color: INK, textAlign: 'center', marginBottom: 6 },
  confirmSub: { fontFamily: 'Poppins_400Regular', fontSize: 14, color: INK2, textAlign: 'center', lineHeight: 21, marginBottom: 18 },
  confirmBalance: { backgroundColor: 'rgba(0,0,0,0.04)', borderRadius: 16, paddingHorizontal: 18, paddingVertical: 14, marginBottom: 18 },
  confirmBalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 7 },
  confirmBalLabel: { fontFamily: 'Poppins_400Regular', fontSize: 14, color: INK2 },
  confirmBalValue: { fontFamily: 'Poppins_400Regular', fontSize: 14, color: INK2 },
  confirmBalDivider: { height: 1, backgroundColor: 'rgba(0,0,0,0.07)', marginVertical: 6 },
  confirmYes: { backgroundColor: HUB_DARK, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginBottom: 8 },
  confirmYesTxt: { fontFamily: 'Poppins_700Bold', fontSize: 15, color: '#fff' },
  confirmNo: { backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  confirmNoTxt: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: INK4 },
});
