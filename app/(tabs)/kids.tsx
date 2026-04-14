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
import {
  WORDLE_LITTLE, WORDLE_MIDDLE, WORDLE_OLDER,
  SCRAMBLE_LITTLE, SCRAMBLE_MIDDLE, SCRAMBLE_OLDER,
  TRIVIA_LITTLE, TRIVIA_MIDDLE, TRIVIA_OLDER,
  generateMathsQuestion, scrambleWord, getWeeklyCrossword,
  type TriviaQuestion, type CrosswordPuzzle,
} from './kids-games-data';

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

const CHILDREN: { name: ChildName; initial: string; colour: string; year: number; age: number; tier: AgeTier; points: number; streak: number }[] = [
  { name: 'Poppy', initial: 'P', colour: '#A855F7', year: 6, age: 12, tier: 'older',  points: 340, streak: 12 },
  { name: 'Gab',   initial: 'G', colour: '#22C55E', year: 4, age: 10, tier: 'middle', points: 185, streak: 5 },
  { name: 'Duke',  initial: 'D', colour: '#F59E0B', year: 1, age: 8,  tier: 'little', points: 90,  streak: 3 },
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
  { icon: '\u{1F7E9}', name: "Zaeli's Wordle", desc: 'Daily 5-letter word \u2014 family shares the same one', badge: 'daily', badgeText: "Today's word waiting!", featured: true },
  { icon: '\u{1F524}', name: 'Word Scramble', desc: 'Unscramble the letters to find the hidden word', badge: 'anytime', badgeText: 'Anytime', featured: false },
  { icon: '\u26A1', name: 'Maths Sprint', desc: '60 seconds \u2014 how many can you get?', badge: 'anytime', badgeText: 'Beat your best', featured: false },
  { icon: '\u{1F998}', name: 'Aussie Trivia', desc: 'Australian animals, places, sport and culture', badge: 'anytime', badgeText: 'Anytime', featured: false },
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
  // Scramble state
  const [scrambleAnswer, setScrambleAnswer] = useState('');
  const [scrambleScrambled, setScrambleScrambled] = useState('');
  const [scrambleHint, setScrambleHint] = useState('');
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
  const mathsTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  // Trivia state
  const [triviaQ, setTriviaQ] = useState<TriviaQuestion | null>(null);
  const [triviaIndex, setTriviaIndex] = useState(0);
  const [triviaScore, setTriviaScore] = useState(0);
  const [triviaSelected, setTriviaSelected] = useState<number | null>(null);
  const [triviaTotal, setTriviaTotal] = useState(0);
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

  // ── Game launchers ──
  function startWordle() {
    const tier = child.tier;
    const list = tier === 'little' ? WORDLE_LITTLE : tier === 'middle' ? WORDLE_MIDDLE : WORDLE_OLDER;
    const dayIndex = Math.floor((Date.now() - Date.parse('2026-01-01')) / 86400000);
    const word = list[((dayIndex % list.length) + list.length) % list.length];
    setWordleAnswer(word.toUpperCase());
    setWordleGuesses([]);
    setWordleInput('');
    setWordleWon(false);
    setActiveGame('wordle');
  }

  function startScramble() {
    const tier = child.tier;
    const list = tier === 'little' ? SCRAMBLE_LITTLE : tier === 'middle' ? SCRAMBLE_MIDDLE : SCRAMBLE_OLDER;
    setScrambleRound(0);
    setScrambleScore(0);
    loadScrambleRound(list, 0);
    setActiveGame('scramble');
  }
  function loadScrambleRound(list: any[], round: number) {
    if (round >= list.length) return;
    const item = list[round];
    setScrambleAnswer(item.word.toUpperCase());
    setScrambleScrambled(scrambleWord(item.word.toUpperCase()));
    setScrambleHint(item.hint);
    setScrambleInput('');
  }

  function startMaths() {
    setMathsScore(0);
    setMathsTimeLeft(60);
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
        <View style={s.banner}>
          <TouchableOpacity onPress={goBack} activeOpacity={0.7}>
            <Text style={s.wordmark}>
              z<Text style={{ color: HUB_PEACH }}>a</Text>el
              <Text style={{ color: HUB_PEACH }}>i</Text>
            </Text>
          </TouchableOpacity>
          <View style={s.bannerRight}>
            <Text style={s.bannerLabel}>Kids Hub</Text>
            <View style={[s.avatar, { backgroundColor: view === 'hub' ? child.colour : '#4D8BFF' }]}>
              <Text style={s.avatarTxt}>{view === 'hub' ? child.initial : 'R'}</Text>
            </View>
          </View>
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
          <Text style={s.selectGreet}>Good morning, Rich {'\u{1F44B}'}</Text>
          <Text style={s.selectTitle}>
            Whose hub{'\n'}<Text style={s.selectTitleEm}>today?</Text>
          </Text>
        </View>
        <View style={s.familyBadge}>
          <Text style={s.familyBadgeTxt}>Family Plan {'\u2713'}</Text>
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
  function HubHomeView() {
    const isLittle = child.tier === 'little';
    const isOlder = child.tier === 'older';

    return (
      <View style={{ flex: 1 }}>
        {/* Header */}
        <View style={s.hubHeader}>
          <TouchableOpacity style={s.backBtn} onPress={goBack} activeOpacity={0.7}>
            <IcoBack />
          </TouchableOpacity>
          {isLittle ? (
            <>
              <Text style={{ fontSize: 20 }}>{'\u{1F44B}'}</Text>
              <Text style={s.hubHeaderTitle}>Hey {selectedChild}!</Text>
            </>
          ) : (
            <Text style={s.hubHeaderTitle}>{isOlder ? selectedChild : `${selectedChild}'s Hub`}</Text>
          )}
          <View style={s.ptsBadge}>
            <Text style={s.ptsBadgeN}>{childWithDb.points}</Text>
            <Text style={s.ptsBadgeL}>pts</Text>
          </View>
        </View>

        {/* Streak strip (Little tier) */}
        {isLittle && (
          <View style={s.streakStrip}>
            <Text style={s.streakFire}>{'\u{1F525}'}</Text>
            <View>
              <Text style={s.streakNum}>{childWithDb.streak}</Text>
              <Text style={s.streakLbl}>Day Streak</Text>
            </View>
            <Text style={{ marginLeft: 'auto', fontSize: 26 }}>
              {Array(Math.min(child.streak, 5)).fill('\u2B50').join('')}
            </Text>
          </View>
        )}

        {/* Older header card */}
        {isOlder && (
          <View style={s.olderHeaderCard}>
            <View>
              <Text style={s.olderPtsBig}>{childWithDb.points}</Text>
              <Text style={s.olderPtsLbl}>points this month</Text>
              <View style={s.olderStreakPill}>
                <Text style={s.olderStreakPillTxt}>{'\u{1F525}'} {childWithDb.streak} day streak</Text>
              </View>
            </View>
            <View style={{ marginLeft: 'auto', alignItems: 'flex-end' }}>
              <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 14, color: INK4, marginBottom: 3 }}>Next reward</Text>
              <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 17, color: INK }}>Sleepover {'\u{1F389}'}</Text>
              <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: HUB_DARK }}>60 pts to go</Text>
            </View>
          </View>
        )}

        {/* Middle stats */}
        {child.tier === 'middle' && (
          <View style={s.midStats}>
            <View style={s.midStat}><Text style={s.midStatN}>{'\u{1F525}'} {childWithDb.streak}</Text><Text style={s.midStatL}>Streak</Text></View>
            <View style={s.midStat}><Text style={s.midStatN}>{jobsDone}/{jobsTotal}</Text><Text style={s.midStatL}>Jobs today</Text></View>
            <View style={s.midStat}><Text style={s.midStatN}>45</Text><Text style={s.midStatL}>To next reward</Text></View>
          </View>
        )}

        {/* Tabs — hidden when game is active */}
        {!activeGame && <View style={s.tabs}>
          <TouchableOpacity style={[s.tab, activeTab === 'jobs' && s.tabOn]} onPress={() => setActiveTab('jobs')}>
            <Text style={[s.tabTxt, activeTab === 'jobs' && s.tabTxtOn]}>{isLittle ? 'My Jobs' : 'Jobs'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.tab, activeTab === 'rewards' && s.tabOn]} onPress={() => setActiveTab('rewards')}>
            <Text style={[s.tabTxt, activeTab === 'rewards' && s.tabTxtOn]}>Rewards</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.tab, activeTab === 'games' && s.tabOn]} onPress={() => setActiveTab('games')}>
            <Text style={[s.tabTxt, activeTab === 'games' && s.tabTxtOn]}>{isLittle ? 'Games \u{1F3AE}' : 'Games'}</Text>
          </TouchableOpacity>
          {!isLittle && (
            <TouchableOpacity style={[s.tab, activeTab === 'leaderboard' && s.tabOn]} onPress={() => setActiveTab('leaderboard')}>
              <Text style={[s.tabTxt, activeTab === 'leaderboard' && s.tabTxtOn]}>{'\u{1F3C6}'}</Text>
            </TouchableOpacity>
          )}
        </View>}

        {/* Tab content or active game */}
        {activeGame ? (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 14, paddingBottom: 40 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* ── WORDLE ── */}
            {activeGame === 'wordle' && (() => {
              const wordLen = wordleAnswer.length;
              const maxGuesses = wordLen === 4 ? 5 : 6;
              function getColors(guess: string): string[] {
                const res = Array(wordLen).fill('#787C7E');
                const ans = wordleAnswer.split('');
                const g = guess.split('');
                const used = Array(wordLen).fill(false);
                for (let i = 0; i < wordLen; i++) { if (g[i] === ans[i]) { res[i] = '#6AAA64'; used[i] = true; } }
                for (let i = 0; i < wordLen; i++) { if (res[i] !== '#6AAA64') { const j = ans.findIndex((c, k) => c === g[i] && !used[k]); if (j >= 0) { res[i] = '#C9B458'; used[j] = true; } } }
                return res;
              }
              return (
                <View style={{ alignItems: 'center', gap: 10 }}>
                  <Text style={{ fontFamily: 'Poppins_800ExtraBold', fontSize: 20, color: INK }}>Zaeli's Wordle</Text>
                  <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 13, color: INK4 }}>{wordLen}-letter word ({child.tier} mode)</Text>
                  {/* Grid */}
                  {Array.from({ length: maxGuesses }).map((_, row) => {
                    const guess = wordleGuesses[row] || (row === wordleGuesses.length ? wordleInput.padEnd(wordLen, ' ') : '');
                    const colors = wordleGuesses[row] ? getColors(wordleGuesses[row]) : null;
                    return (
                      <View key={row} style={{ flexDirection: 'row', gap: 5 }}>
                        {Array.from({ length: wordLen }).map((_, col) => {
                          const letter = guess[col] || '';
                          const bg = colors ? colors[col] : (letter.trim() ? 'rgba(0,0,0,0.08)' : 'transparent');
                          return (
                            <View key={col} style={{ width: wordLen === 4 ? 56 : 50, height: wordLen === 4 ? 56 : 50, borderRadius: 10, backgroundColor: bg, borderWidth: colors ? 0 : 2, borderColor: 'rgba(0,0,0,0.12)', alignItems: 'center', justifyContent: 'center' }}>
                              <Text style={{ fontFamily: 'Poppins_800ExtraBold', fontSize: wordLen === 4 ? 24 : 22, color: colors ? '#fff' : INK }}>{letter.trim()}</Text>
                            </View>
                          );
                        })}
                      </View>
                    );
                  })}
                  {/* Result */}
                  {wordleWon && <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 16, color: '#6AAA64', marginTop: 8 }}>You got it!</Text>}
                  {wordleGuesses.length >= maxGuesses && !wordleWon && <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 16, color: '#FF4545', marginTop: 8 }}>The word was {wordleAnswer}</Text>}
                  {/* Input */}
                  {!wordleWon && wordleGuesses.length < maxGuesses && (
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                      <TextInput
                        style={{ flex: 1, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.12)', paddingHorizontal: 14, paddingVertical: 10, fontFamily: 'Poppins_700Bold', fontSize: 18, color: INK, textAlign: 'center', letterSpacing: 4, textTransform: 'uppercase' }}
                        value={wordleInput}
                        onChangeText={t => setWordleInput(t.toUpperCase().slice(0, wordLen))}
                        maxLength={wordLen}
                        autoCapitalize="characters"
                        returnKeyType="done"
                        onSubmitEditing={() => {
                          if (wordleInput.length === wordLen) {
                            const newGuesses = [...wordleGuesses, wordleInput.toUpperCase()];
                            setWordleGuesses(newGuesses);
                            if (wordleInput.toUpperCase() === wordleAnswer) setWordleWon(true);
                            setWordleInput('');
                          }
                        }}
                      />
                      <TouchableOpacity onPress={() => {
                        if (wordleInput.length === wordLen) {
                          const newGuesses = [...wordleGuesses, wordleInput.toUpperCase()];
                          setWordleGuesses(newGuesses);
                          if (wordleInput.toUpperCase() === wordleAnswer) setWordleWon(true);
                          setWordleInput('');
                        }
                      }} style={{ backgroundColor: HUB_DARK, borderRadius: 12, paddingHorizontal: 20, justifyContent: 'center' }} activeOpacity={0.8}>
                        <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 14, color: '#fff' }}>Go</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  <TouchableOpacity onPress={goBack} style={{ marginTop: 12 }} activeOpacity={0.7}>
                    <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: INK4 }}>Back to Games</Text>
                  </TouchableOpacity>
                </View>
              );
            })()}

            {/* ── WORD SCRAMBLE ── */}
            {activeGame === 'scramble' && (() => {
              const tier = child.tier;
              const list = tier === 'little' ? SCRAMBLE_LITTLE : tier === 'middle' ? SCRAMBLE_MIDDLE : SCRAMBLE_OLDER;
              const isDone = scrambleRound >= list.length;
              return (
                <View style={{ alignItems: 'center', gap: 14 }}>
                  <Text style={{ fontFamily: 'Poppins_800ExtraBold', fontSize: 20, color: INK }}>Word Scramble</Text>
                  <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 13, color: INK4 }}>Score: {scrambleScore}/{list.length} | Round {Math.min(scrambleRound + 1, list.length)}/{list.length}</Text>
                  {!isDone ? (
                    <>
                      <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 20, alignItems: 'center', width: '100%' }}>
                        <Text style={{ fontFamily: 'Poppins_800ExtraBold', fontSize: 32, color: HUB_DARK, letterSpacing: 6 }}>{scrambleScrambled}</Text>
                        <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 13, color: INK4, marginTop: 8 }}>Hint: {scrambleHint}</Text>
                      </View>
                      <TextInput
                        style={{ width: '100%', backgroundColor: '#fff', borderRadius: 12, borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.12)', paddingHorizontal: 14, paddingVertical: 12, fontFamily: 'Poppins_700Bold', fontSize: 18, color: INK, textAlign: 'center', letterSpacing: 3, textTransform: 'uppercase' }}
                        value={scrambleInput}
                        onChangeText={t => setScrambleInput(t.toUpperCase())}
                        autoCapitalize="characters"
                        returnKeyType="done"
                        onSubmitEditing={() => {
                          if (scrambleInput.toUpperCase() === scrambleAnswer) {
                            setScrambleScore(prev => prev + 1);
                          }
                          const next = scrambleRound + 1;
                          setScrambleRound(next);
                          if (next < list.length) loadScrambleRound(list, next);
                        }}
                      />
                      <TouchableOpacity onPress={() => {
                        if (scrambleInput.toUpperCase() === scrambleAnswer) setScrambleScore(prev => prev + 1);
                        const next = scrambleRound + 1;
                        setScrambleRound(next);
                        if (next < list.length) loadScrambleRound(list, next);
                      }} style={{ backgroundColor: HUB_DARK, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 30 }} activeOpacity={0.8}>
                        <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 15, color: '#fff' }}>Submit</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 20, alignItems: 'center', width: '100%' }}>
                      <Text style={{ fontSize: 40 }}>🎉</Text>
                      <Text style={{ fontFamily: 'Poppins_800ExtraBold', fontSize: 22, color: INK, marginTop: 8 }}>All done!</Text>
                      <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 15, color: INK4, marginTop: 4 }}>You got {scrambleScore} out of {list.length}</Text>
                      <TouchableOpacity onPress={startScramble} style={{ backgroundColor: HUB_DARK, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 24, marginTop: 14 }} activeOpacity={0.8}>
                        <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 14, color: '#fff' }}>Play again</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  <TouchableOpacity onPress={goBack} activeOpacity={0.7}>
                    <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: INK4 }}>Back to Games</Text>
                  </TouchableOpacity>
                </View>
              );
            })()}

            {/* ── MATHS SPRINT ── */}
            {activeGame === 'maths' && (
              <View style={{ alignItems: 'center', gap: 14 }}>
                <Text style={{ fontFamily: 'Poppins_800ExtraBold', fontSize: 20, color: INK }}>Maths Sprint</Text>
                <View style={{ flexDirection: 'row', gap: 16 }}>
                  <View style={{ backgroundColor: mathsTimeLeft <= 10 ? 'rgba(255,69,69,0.12)' : 'rgba(255,255,255,0.5)', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8, alignItems: 'center' }}>
                    <Text style={{ fontFamily: 'Poppins_800ExtraBold', fontSize: 24, color: mathsTimeLeft <= 10 ? '#FF4545' : INK }}>{mathsTimeLeft}s</Text>
                  </View>
                  <View style={{ backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8, alignItems: 'center' }}>
                    <Text style={{ fontFamily: 'Poppins_800ExtraBold', fontSize: 24, color: HUB_DARK }}>{mathsScore}</Text>
                    <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 10, color: INK4 }}>correct</Text>
                  </View>
                </View>
                {mathsActive ? (
                  <>
                    <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 24, alignItems: 'center', width: '100%' }}>
                      <Text style={{ fontFamily: 'Poppins_800ExtraBold', fontSize: 36, color: INK }}>{mathsQuestion}</Text>
                    </View>
                    <TextInput
                      style={{ width: '100%', backgroundColor: '#fff', borderRadius: 12, borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.12)', paddingHorizontal: 14, paddingVertical: 12, fontFamily: 'Poppins_700Bold', fontSize: 24, color: INK, textAlign: 'center' }}
                      value={mathsInput}
                      onChangeText={setMathsInput}
                      keyboardType="number-pad"
                      autoFocus
                      returnKeyType="done"
                      onSubmitEditing={() => {
                        if (parseInt(mathsInput) === mathsAnswer) setMathsScore(prev => prev + 1);
                        nextMathsQuestion();
                      }}
                    />
                  </>
                ) : (
                  <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 20, alignItems: 'center', width: '100%' }}>
                    <Text style={{ fontSize: 40 }}>{mathsScore >= 10 ? '🔥' : mathsScore >= 5 ? '⭐' : '💪'}</Text>
                    <Text style={{ fontFamily: 'Poppins_800ExtraBold', fontSize: 22, color: INK, marginTop: 8 }}>Time's up!</Text>
                    <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 15, color: INK4, marginTop: 4 }}>You got {mathsScore} correct in 60 seconds</Text>
                    <TouchableOpacity onPress={startMaths} style={{ backgroundColor: HUB_DARK, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 24, marginTop: 14 }} activeOpacity={0.8}>
                      <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 14, color: '#fff' }}>Try again</Text>
                    </TouchableOpacity>
                  </View>
                )}
                <TouchableOpacity onPress={goBack} activeOpacity={0.7}>
                  <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: INK4 }}>Back to Games</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ── AUSSIE TRIVIA ── */}
            {activeGame === 'trivia' && (() => {
              const tier = child.tier;
              const list = tier === 'little' ? TRIVIA_LITTLE : tier === 'middle' ? TRIVIA_MIDDLE : TRIVIA_OLDER;
              const isDone = triviaIndex >= list.length;
              return (
                <View style={{ alignItems: 'center', gap: 14 }}>
                  <Text style={{ fontFamily: 'Poppins_800ExtraBold', fontSize: 20, color: INK }}>Aussie Trivia</Text>
                  <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 13, color: INK4 }}>Score: {triviaScore}/{triviaTotal} | Q{Math.min(triviaIndex + 1, list.length)}/{list.length}</Text>
                  {!isDone && triviaQ ? (
                    <>
                      <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 18, width: '100%' }}>
                        <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 16, color: INK, lineHeight: 22, marginBottom: 14 }}>{triviaQ.question}</Text>
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
                                if (i === triviaQ!.correct) setTriviaScore(prev => prev + 1);
                                // Auto advance after 1.5s
                                setTimeout(() => {
                                  const next = triviaIndex + 1;
                                  setTriviaIndex(next);
                                  if (next < list.length) { setTriviaQ(list[next]); setTriviaSelected(null); }
                                }, 1500);
                              }}
                              style={{ borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 2, borderColor: showResult ? (isCorrect ? '#6AAA64' : isSelected ? '#FF4545' : 'rgba(0,0,0,0.08)') : (isSelected ? HUB_DARK : 'rgba(0,0,0,0.08)'), backgroundColor: showResult && isCorrect ? 'rgba(106,170,100,0.08)' : showResult && isSelected && !isCorrect ? 'rgba(255,69,69,0.05)' : 'transparent' }}
                              activeOpacity={0.75}
                            >
                              <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: showResult && isCorrect ? '#6AAA64' : showResult && isSelected ? '#FF4545' : INK }}>{opt}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </>
                  ) : (
                    <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 20, alignItems: 'center', width: '100%' }}>
                      <Text style={{ fontSize: 40 }}>{triviaScore >= list.length * 0.8 ? '🏆' : triviaScore >= list.length * 0.5 ? '⭐' : '💪'}</Text>
                      <Text style={{ fontFamily: 'Poppins_800ExtraBold', fontSize: 22, color: INK, marginTop: 8 }}>Quiz complete!</Text>
                      <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 15, color: INK4, marginTop: 4 }}>{triviaScore} out of {list.length} correct</Text>
                      <TouchableOpacity onPress={startTrivia} style={{ backgroundColor: HUB_DARK, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 24, marginTop: 14 }} activeOpacity={0.8}>
                        <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 14, color: '#fff' }}>Play again</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  <TouchableOpacity onPress={goBack} activeOpacity={0.7}>
                    <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: INK4 }}>Back to Games</Text>
                  </TouchableOpacity>
                </View>
              );
            })()}

            {/* ── MINI CROSSWORD ── */}
            {activeGame === 'crossword' && (() => {
              const puzzle = getWeeklyCrossword();
              return (
                <View style={{ alignItems: 'center', gap: 14 }}>
                  <Text style={{ fontFamily: 'Poppins_800ExtraBold', fontSize: 20, color: INK }}>Mini Crossword</Text>
                  <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 13, color: INK4 }}>Weekly puzzle</Text>
                  {/* Grid */}
                  <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 16, alignItems: 'center' }}>
                    {puzzle.grid.map((row, r) => (
                      <View key={r} style={{ flexDirection: 'row' }}>
                        {row.map((cell, c) => (
                          <View key={c} style={{ width: 44, height: 44, borderWidth: 1, borderColor: cell === '#' ? '#fff' : 'rgba(0,0,0,0.15)', backgroundColor: cell === '#' ? '#0A0A0A' : '#fff', alignItems: 'center', justifyContent: 'center' }}>
                            {cell !== '#' && <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 16, color: INK }}>{cell}</Text>}
                          </View>
                        ))}
                      </View>
                    ))}
                  </View>
                  {/* Clues */}
                  <View style={{ width: '100%', backgroundColor: '#fff', borderRadius: 14, padding: 14 }}>
                    <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 12, color: INK4, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Across</Text>
                    {puzzle.acrossClues.map(c => (
                      <Text key={c.num} style={{ fontFamily: 'Poppins_400Regular', fontSize: 13, color: INK, marginBottom: 4 }}>{c.num}. {c.clue}</Text>
                    ))}
                    <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 12, color: INK4, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 10, marginBottom: 6 }}>Down</Text>
                    {puzzle.downClues.map(c => (
                      <Text key={c.num} style={{ fontFamily: 'Poppins_400Regular', fontSize: 13, color: INK, marginBottom: 4 }}>{c.num}. {c.clue}</Text>
                    ))}
                  </View>
                  <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 11, color: INK4 }}>Interactive input coming soon - for now, solve on paper!</Text>
                  <TouchableOpacity onPress={goBack} activeOpacity={0.7}>
                    <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: INK4 }}>Back to Games</Text>
                  </TouchableOpacity>
                </View>
              );
            })()}
          </ScrollView>
        ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {activeTab === 'jobs' && <JobsTab />}
          {activeTab === 'rewards' && <RewardsTab />}
          {activeTab === 'games' && <GamesTab />}
          {activeTab === 'leaderboard' && <LeaderboardTab />}
        </ScrollView>
        )}

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
                <Text style={s.confirmNoTxt}>Not yet \u2014 keep saving</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Suggest a Job form modal */}
        <Modal visible={suggestFormOpen} transparent animationType="slide">
          <View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.4)', justifyContent:'flex-end' }}>
            <TouchableOpacity style={{ flex:1 }} onPress={() => setSuggestFormOpen(false)} activeOpacity={1}/>
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
                autoFocus
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
          </View>
        </Modal>
      </View>
    );
  }

  // ── Jobs Tab ─────────────────────────────────────────────────────────────
  function JobsTab() {
    const isOlder = child.tier === 'older';

    return (
      <View style={s.tabContent}>
        {jobs.map((job, i) => (
          <TouchableOpacity
            key={i}
            style={isOlder ? s.olderJob : s.jobCard}
            activeOpacity={0.7}
            onPress={() => {
              if (!job.done) completeJob(job);
            }}
          >
            <Text style={isOlder ? s.olderJobIcon : s.jobIcon}>{job.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={isOlder ? s.olderJobName : s.jobName}>{job.name}</Text>
              {!isOlder && (
                <Text style={s.jobPts}>
                  {job.pts} pts {'\u00B7'}{' '}
                  <Text style={[s.jobType, job.type === 'daily' ? s.jobTypeDaily : s.jobTypeOneoff]}>
                    {job.type === 'daily' ? 'daily' : 'this week'}
                  </Text>
                </Text>
              )}
            </View>
            {isOlder && <Text style={s.olderJobPts}>{job.pts} pts{job.type === 'daily' ? ' \u00B7 daily' : ''}</Text>}
            <View style={[isOlder ? s.olderJobCheck : s.jobCheck, job.done && (isOlder ? s.olderJobCheckDone : s.jobCheckDone)]}>
              {job.done && <IcoCheck size={isOlder ? 10 : 12} />}
            </View>
          </TouchableOpacity>
        ))}

        {/* Suggest a job */}
        <TouchableOpacity style={[child.tier === 'older' ? s.olderJob : s.jobCard, s.suggestJob]} activeOpacity={0.7} onPress={() => setSuggestFormOpen(true)}>
          <Text style={{ fontSize: child.tier === 'older' ? 20 : 26, opacity: 0.3 }}>{'\u2795'}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[child.tier === 'older' ? s.olderJobName : s.jobName, { color: INK4 }]}>
              {child.tier === 'older' ? 'Suggest a job to Dad or Mum' : 'Suggest a job'}
            </Text>
            <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 12, color: 'rgba(0,0,0,0.25)' }}>
              Propose points \u2014 parent approves
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Rewards Tab ──────────────────────────────────────────────────────────
  function RewardsTab() {
    return (
      <View style={s.tabContent}>
        {/* Balance hero */}
        <View style={s.balanceHero}>
          <View style={{ flex: 1 }}>
            <Text style={s.balanceNum}>{childWithDb.points}</Text>
            <Text style={s.balanceLbl}>points to spend</Text>
            <View style={s.balanceStreak}>
              <Text style={s.balanceStreakTxt}>{'\u{1F525}'} {childWithDb.streak} day streak</Text>
            </View>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={s.earnLabel}>Earning this week</Text>
            <Text style={s.earnNum}>+{jobsDone * 15} pts</Text>
            <Text style={s.earnSub}>from {jobsDone} jobs done</Text>
          </View>
        </View>

        {/* Reward cards */}
        {rewards.map((reward, i) => {
          const pct = Math.min(100, Math.round((child.points / reward.cost) * 100));
          const canAfford = child.points >= reward.cost;
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
                    {!canAfford && ` \u00B7 ${reward.cost - child.points} more to go`}
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
                  {canAfford ? 'Ready to redeem!' : isAlmost ? `${reward.cost - child.points} pts away` : `${pct}%`}
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
                  {canAfford ? `Redeem for ${reward.cost} pts \u2192` : isAlmost ? `Need ${reward.cost - child.points} more pts to unlock` : `${reward.cost - child.points} pts needed`}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
    );
  }

  // ── Games Tab ────────────────────────────────────────────────────────────
  function GamesTab() {
    return (
      <View style={s.tabContent}>
        {/* Daily Wordle banner */}
        <View style={s.dailyBanner}>
          <Text style={{ fontSize: 22 }}>{'\u{1F7E9}'}</Text>
          <View>
            <Text style={s.dailyBannerTxt}>Zaeli{"'"}s Wordle {'\u00B7'} Today{"'"}s word</Text>
            <Text style={s.dailyBannerWord}>_ _ _ _ _</Text>
          </View>
          <TouchableOpacity style={s.dailyBannerPlay} activeOpacity={0.7} onPress={startWordle}>
            <Text style={s.dailyBannerPlayTxt}>Play now</Text>
          </TouchableOpacity>
        </View>

        {/* Games grid */}
        <View style={s.gamesGrid}>
          {GAMES.map((game, i) => {
            if (game.featured) {
              return (
                <TouchableOpacity key={i} style={s.gameFeatured} activeOpacity={0.7} onPress={startWordle}>
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
              'Aussie Trivia': startTrivia,
              'Mini Crossword': () => setActiveGame('crossword'),
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
    <SafeAreaView style={s.safe} edges={['top']}>
      <RNStatusBar barStyle="dark-content" />
      <Banner />
      <View style={s.body}>
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
  wordmark: { fontFamily: 'Poppins_800ExtraBold', fontSize: 32, letterSpacing: -1.5, color: INK, lineHeight: 38 },
  bannerRight: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  bannerLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: INK4 },
  avatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { fontFamily: 'Poppins_700Bold', fontSize: 12, color: '#fff' },
  divider: { height: 1, backgroundColor: 'rgba(0,0,0,0.08)' },

  // Child Select
  selectBody: { flex: 1 },
  selectHero: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 14 },
  selectGreet: { fontFamily: 'Poppins_500Medium', fontSize: 15, color: INK4, marginBottom: 4 },
  selectTitle: { fontFamily: 'Poppins_700Bold', fontSize: 28, color: INK, lineHeight: 34, letterSpacing: -0.5 },
  selectTitleEm: { fontStyle: 'italic', color: 'rgba(0,0,0,0.28)' },
  familyBadge: { marginLeft: 20, alignSelf: 'flex-start', backgroundColor: 'rgba(10,64,48,0.12)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 16 },
  familyBadgeTxt: { fontFamily: 'Poppins_700Bold', fontSize: 11, color: HUB_DARK, textTransform: 'uppercase', letterSpacing: 0.3 },
  selectCards: { paddingHorizontal: 14, gap: 10 },
  selectCard: { borderRadius: 20, paddingHorizontal: 18, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', gap: 14 },
  selectCardAv: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  selectCardAvTxt: { fontFamily: 'Poppins_700Bold', fontSize: 18, color: '#fff' },
  selectCardName: { fontFamily: 'Poppins_700Bold', fontSize: 17, color: INK, marginBottom: 2 },
  selectCardMeta: { fontFamily: 'Poppins_500Medium', fontSize: 13, color: INK4 },
  selectCardPts: { backgroundColor: 'rgba(0,0,0,0.08)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 5 },
  selectCardPtsTxt: { fontFamily: 'Poppins_700Bold', fontSize: 13, color: HUB_DARK },

  // Hub header
  hubHeader: { paddingHorizontal: 20, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(0,0,0,0.08)', alignItems: 'center', justifyContent: 'center' },
  hubHeaderTitle: { fontFamily: 'Poppins_800ExtraBold', fontSize: 18, color: INK },
  ptsBadge: { marginLeft: 'auto', backgroundColor: HUB_DARK, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 6 },
  ptsBadgeN: { fontFamily: 'Poppins_800ExtraBold', fontSize: 17, color: HUB_BG },
  ptsBadgeL: { fontFamily: 'Poppins_600SemiBold', fontSize: 11, color: 'rgba(168,232,204,0.6)', textTransform: 'uppercase', letterSpacing: 0.3 },

  // Streak strip (little)
  streakStrip: { marginHorizontal: 14, marginBottom: 12, backgroundColor: 'rgba(255,255,255,0.4)', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  streakFire: { fontSize: 28 },
  streakNum: { fontFamily: 'Poppins_800ExtraBold', fontSize: 24, color: INK, lineHeight: 26 },
  streakLbl: { fontFamily: 'Poppins_600SemiBold', fontSize: 11, color: INK4, textTransform: 'uppercase', letterSpacing: 0.3 },

  // Older header card
  olderHeaderCard: { marginHorizontal: 14, marginBottom: 12, backgroundColor: 'rgba(0,0,0,0.08)', borderRadius: 20, paddingHorizontal: 20, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', gap: 14 },
  olderPtsBig: { fontFamily: 'Poppins_800ExtraBold', fontSize: 34, color: INK, lineHeight: 36 },
  olderPtsLbl: { fontFamily: 'Poppins_600SemiBold', fontSize: 11, color: INK4, textTransform: 'uppercase', letterSpacing: 0.3 },
  olderStreakPill: { backgroundColor: HUB_DARK, borderRadius: 22, paddingHorizontal: 14, paddingVertical: 6, marginTop: 6, alignSelf: 'flex-start' },
  olderStreakPillTxt: { fontFamily: 'Poppins_700Bold', fontSize: 13, color: HUB_BG },

  // Middle stats
  midStats: { flexDirection: 'row', gap: 8, paddingHorizontal: 14, marginBottom: 12 },
  midStat: { flex: 1, backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 14, paddingVertical: 10, paddingHorizontal: 12, alignItems: 'center' },
  midStatN: { fontFamily: 'Poppins_800ExtraBold', fontSize: 20, color: INK, lineHeight: 24 },
  midStatL: { fontFamily: 'Poppins_600SemiBold', fontSize: 10, color: INK4, textTransform: 'uppercase', letterSpacing: 0.3, marginTop: 2 },

  // Tabs
  tabs: { flexDirection: 'row', gap: 8, paddingHorizontal: 14, marginBottom: 10 },
  tab: { flex: 1, backgroundColor: 'rgba(255,255,255,0.35)', borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  tabOn: { backgroundColor: CARD },
  tabTxt: { fontFamily: 'Poppins_700Bold', fontSize: 13, color: 'rgba(0,0,0,0.45)' },
  tabTxtOn: { color: HUB_DARK },

  // Tab content
  tabContent: { paddingHorizontal: 14, gap: 8 },

  // Job card (Little/Middle)
  jobCard: { backgroundColor: CARD, borderRadius: 20, paddingHorizontal: 18, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', gap: 14 },
  jobIcon: { fontSize: 26 },
  jobName: { fontFamily: 'Poppins_700Bold', fontSize: 17, color: INK, marginBottom: 3 },
  jobPts: { fontFamily: 'Poppins_500Medium', fontSize: 13, color: INK4 },
  jobType: { fontFamily: 'Poppins_700Bold', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.3 },
  jobTypeDaily: { color: HUB_DARK },
  jobTypeOneoff: { color: AMBER_TXT },
  jobCheck: { width: 34, height: 34, borderRadius: 17, borderWidth: 2, borderColor: 'rgba(0,0,0,0.15)', alignItems: 'center', justifyContent: 'center', marginLeft: 'auto' },
  jobCheckDone: { backgroundColor: HUB_BG, borderColor: HUB_BG },
  suggestJob: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: 'rgba(0,0,0,0.12)', backgroundColor: 'rgba(0,0,0,0.02)' },

  // Older job card
  olderJob: { backgroundColor: CARD, borderRadius: 16, paddingHorizontal: 18, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  olderJobIcon: { fontSize: 20 },
  olderJobName: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: INK, flex: 1 },
  olderJobPts: { fontFamily: 'Poppins_700Bold', fontSize: 14, color: HUB_DARK },
  olderJobCheck: { width: 30, height: 30, borderRadius: 8, borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.15)', alignItems: 'center', justifyContent: 'center' },
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

  rewardCard: { backgroundColor: CARD, borderRadius: 20, paddingHorizontal: 18, paddingVertical: 16 },
  rewardCardAfford: { borderWidth: 2, borderColor: HUB_BG },
  rewardCardFar: { backgroundColor: 'rgba(255,255,255,0.55)' },
  rewardTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  rewardIcon: { fontSize: 26 },
  rewardName: { fontFamily: 'Poppins_700Bold', fontSize: 17, color: INK, marginBottom: 2 },
  rewardCost: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: INK4 },
  affordTag: { backgroundColor: HUB_BG, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, marginLeft: 'auto' },
  affordTagTxt: { fontFamily: 'Poppins_700Bold', fontSize: 10, color: HUB_DARK },
  almostTag: { backgroundColor: AMBER_BG, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, marginLeft: 'auto' },
  almostTagTxt: { fontFamily: 'Poppins_700Bold', fontSize: 10, color: AMBER_TXT },
  rewardBarWrap: { height: 8, backgroundColor: 'rgba(0,0,0,0.07)', borderRadius: 4, overflow: 'hidden', marginBottom: 6 },
  rewardBar: { height: 8, borderRadius: 4 },
  rewardBarRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  rewardBarLabel: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: INK4 },
  redeemBtn: { borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  redeemBtnAfford: { backgroundColor: HUB_DARK },
  redeemBtnAlmost: { backgroundColor: AMBER_BG },
  redeemBtnDisabled: { backgroundColor: 'rgba(0,0,0,0.07)' },
  redeemBtnTxt: { fontFamily: 'Poppins_700Bold', fontSize: 15 },
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
  gameFeatured: { width: '100%', backgroundColor: HUB_DARK, borderRadius: 20, paddingHorizontal: 18, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', gap: 14 },
  gameFeaturedIcon: { fontSize: 36 },
  gameFeaturedName: { fontFamily: 'Poppins_700Bold', fontSize: 17, color: '#fff', marginBottom: 3 },
  gameFeaturedDesc: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 18 },
  gameBadgeDaily: { backgroundColor: 'rgba(168,232,204,0.2)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start', marginTop: 8 },
  gameBadgeDailyTxt: { fontFamily: 'Poppins_700Bold', fontSize: 10, color: HUB_BG },
  gameCard: { width: (W - 28 - 10) / 2, backgroundColor: CARD, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 16 },
  gameIcon: { fontSize: 30, marginBottom: 8 },
  gameName: { fontFamily: 'Poppins_700Bold', fontSize: 15, color: INK, marginBottom: 3 },
  gameDesc: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: INK4, lineHeight: 18 },
  gameBadge: { backgroundColor: 'rgba(168,232,204,0.3)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start', marginTop: 8 },
  gameBadgeTxt: { fontFamily: 'Poppins_700Bold', fontSize: 10, color: HUB_DARK },
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
