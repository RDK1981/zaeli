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

import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Modal, StyleSheet,
  Dimensions, StatusBar as RNStatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import Svg, { Polyline } from 'react-native-svg';

const { width: W, height: H } = Dimensions.get('window');

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
function IcoBack({ color = INK, size = 10 }: { color?: string; size?: number }) {
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
  const [redeemItem, setRedeemItem] = useState<null | typeof REWARDS.Poppy[0]>(null);

  useFocusEffect(useCallback(() => {
    RNStatusBar.setBarStyle('dark-content', true);
  }, []));

  function goBack() {
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
  const jobs = JOBS[selectedChild];
  const rewards = REWARDS[selectedChild];
  const jobsDone = jobs.filter(j => j.done).length;
  const jobsTotal = jobs.length;

  // ── Banner (shared) ──────────────────────────────────────────────────────
  function Banner() {
    return (
      <>
        <View style={s.banner}>
          <Text style={s.wordmark}>
            z<Text style={{ color: HUB_PEACH }}>a</Text>el
            <Text style={{ color: HUB_PEACH }}>i</Text>
          </Text>
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
                <Text style={s.selectCardMeta}>Year {c.year} {'\u00B7'} {'\u{1F525}'} {c.streak} day streak</Text>
              </View>
              <View style={s.selectCardPts}>
                <Text style={s.selectCardPtsTxt}>{'\u2B50'} {c.points} pts</Text>
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
              <Text style={{ fontSize: 16 }}>{'\u{1F44B}'}</Text>
              <Text style={s.hubHeaderTitle}>Hey {selectedChild}!</Text>
            </>
          ) : (
            <Text style={s.hubHeaderTitle}>{isOlder ? selectedChild : `${selectedChild}'s Hub`}</Text>
          )}
          <View style={s.ptsBadge}>
            <Text style={s.ptsBadgeN}>{child.points}</Text>
            <Text style={s.ptsBadgeL}>pts</Text>
          </View>
        </View>

        {/* Streak strip (Little tier) */}
        {isLittle && (
          <View style={s.streakStrip}>
            <Text style={s.streakFire}>{'\u{1F525}'}</Text>
            <View>
              <Text style={s.streakNum}>{child.streak}</Text>
              <Text style={s.streakLbl}>Day Streak</Text>
            </View>
            <Text style={{ marginLeft: 'auto', fontSize: 22 }}>
              {Array(Math.min(child.streak, 5)).fill('\u2B50').join('')}
            </Text>
          </View>
        )}

        {/* Older header card */}
        {isOlder && (
          <View style={s.olderHeaderCard}>
            <View>
              <Text style={s.olderPtsBig}>{child.points}</Text>
              <Text style={s.olderPtsLbl}>points this month</Text>
              <View style={s.olderStreakPill}>
                <Text style={s.olderStreakPillTxt}>{'\u{1F525}'} {child.streak} day streak</Text>
              </View>
            </View>
            <View style={{ marginLeft: 'auto', alignItems: 'flex-end' }}>
              <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 11, color: INK4, marginBottom: 3 }}>Next reward</Text>
              <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 13, color: INK }}>Sleepover {'\u{1F389}'}</Text>
              <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 10, color: HUB_DARK }}>60 pts to go</Text>
            </View>
          </View>
        )}

        {/* Middle stats */}
        {child.tier === 'middle' && (
          <View style={s.midStats}>
            <View style={s.midStat}><Text style={s.midStatN}>{'\u{1F525}'} {child.streak}</Text><Text style={s.midStatL}>Streak</Text></View>
            <View style={s.midStat}><Text style={s.midStatN}>{jobsDone}/{jobsTotal}</Text><Text style={s.midStatL}>Jobs today</Text></View>
            <View style={s.midStat}><Text style={s.midStatN}>45</Text><Text style={s.midStatL}>To next reward</Text></View>
          </View>
        )}

        {/* Tabs */}
        <View style={s.tabs}>
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
        </View>

        {/* Tab content */}
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {activeTab === 'jobs' && <JobsTab />}
          {activeTab === 'rewards' && <RewardsTab />}
          {activeTab === 'games' && <GamesTab />}
          {activeTab === 'leaderboard' && <LeaderboardTab />}
        </ScrollView>

        {/* GIPHY celebration overlay */}
        {showGiphy && (
          <TouchableOpacity
            style={s.giphyOverlay}
            activeOpacity={1}
            onPress={() => setShowGiphy(false)}
          >
            <View style={s.giphyFrame}>
              <Text style={s.giphyPlaceholder}>{'\u{1F389}'}</Text>
              <Text style={s.giphyApiNote}>GIF loads here via GIPHY API</Text>
            </View>
            <View style={s.giphyPtsEarned}>
              <Text style={s.giphyPtsText}>+10 points! {'\u2B50'}</Text>
            </View>
            <Text style={s.giphyText}>You smashed it, {selectedChild}! {'\u{1F525}'}</Text>
            <Text style={s.giphySub}>
              {jobsDone + 1 >= jobsTotal
                ? `All jobs done today \u2014 streak to ${child.streak + 1} tomorrow`
                : `${jobsTotal - jobsDone - 1} jobs left today!`
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
                  <Text style={s.confirmBalValue}>{child.points} pts</Text>
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
              <TouchableOpacity style={s.confirmYes} onPress={() => setRedeemItem(null)} activeOpacity={0.7}>
                <Text style={s.confirmYesTxt}>Yes, request this reward {redeemItem?.icon}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.confirmNo} onPress={() => setRedeemItem(null)} activeOpacity={0.7}>
                <Text style={s.confirmNoTxt}>Not yet \u2014 keep saving</Text>
              </TouchableOpacity>
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
              if (!job.done) setShowGiphy(true);
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
        <TouchableOpacity style={[child.tier === 'older' ? s.olderJob : s.jobCard, s.suggestJob]} activeOpacity={0.7}>
          <Text style={{ fontSize: child.tier === 'older' ? 16 : 22, opacity: 0.3 }}>{'\u2795'}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[child.tier === 'older' ? s.olderJobName : s.jobName, { color: INK4 }]}>
              {child.tier === 'older' ? 'Suggest a job to Dad or Mum' : 'Suggest a job'}
            </Text>
            <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 9, color: 'rgba(0,0,0,0.25)' }}>
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
            <Text style={s.balanceNum}>{child.points}</Text>
            <Text style={s.balanceLbl}>points to spend</Text>
            <View style={s.balanceStreak}>
              <Text style={s.balanceStreakTxt}>{'\u{1F525}'} {child.streak} day streak</Text>
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
                  {canAfford ? `You have ${child.points} pts` : `${child.points} of ${reward.cost} pts`}
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
          <Text style={{ fontSize: 18 }}>{'\u{1F7E9}'}</Text>
          <View>
            <Text style={s.dailyBannerTxt}>Zaeli{"'"}s Wordle {'\u00B7'} Today{"'"}s word</Text>
            <Text style={s.dailyBannerWord}>_ _ _ _ _</Text>
          </View>
          <TouchableOpacity style={s.dailyBannerPlay} activeOpacity={0.7}>
            <Text style={s.dailyBannerPlayTxt}>Play now</Text>
          </TouchableOpacity>
        </View>

        {/* Games grid */}
        <View style={s.gamesGrid}>
          {GAMES.map((game, i) => {
            if (game.featured) {
              return (
                <TouchableOpacity key={i} style={s.gameFeatured} activeOpacity={0.7}>
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
            return (
              <TouchableOpacity key={i} style={s.gameCard} activeOpacity={0.7}>
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
    const sorted = [...CHILDREN].sort((a, b) => b.points - a.points);

    return (
      <View style={s.tabContent}>
        {/* Podium */}
        <View style={s.podium}>
          {/* 2nd place */}
          <View style={s.podiumPos}>
            <View style={[s.podiumAv, { backgroundColor: sorted[1].colour, width: 42, height: 42 }]}>
              <Text style={[s.podiumAvTxt, { fontSize: 15 }]}>{sorted[1].initial}</Text>
            </View>
            <Text style={s.podiumName}>{sorted[1].name}</Text>
            <Text style={s.podiumPts}>{sorted[1].points} pts</Text>
            <View style={[s.podiumBar, { height: 55, backgroundColor: `${sorted[1].colour}33` }]}>
              <Text style={s.podiumRank}>2</Text>
            </View>
          </View>
          {/* 1st place */}
          <View style={s.podiumPos}>
            <Text style={{ fontSize: 14 }}>{'\u{1F451}'}</Text>
            <View style={[s.podiumAv, { backgroundColor: sorted[0].colour, width: 48, height: 48 }]}>
              <Text style={[s.podiumAvTxt, { fontSize: 17 }]}>{sorted[0].initial}</Text>
            </View>
            <Text style={s.podiumName}>{sorted[0].name}</Text>
            <Text style={[s.podiumPts, { fontSize: 13 }]}>{sorted[0].points} pts</Text>
            <View style={[s.podiumBar, { height: 72, backgroundColor: `${sorted[0].colour}33` }]}>
              <Text style={[s.podiumRank, { fontSize: 18 }]}>1</Text>
            </View>
          </View>
          {/* 3rd place */}
          <View style={s.podiumPos}>
            <View style={[s.podiumAv, { backgroundColor: sorted[2].colour, width: 38, height: 38 }]}>
              <Text style={[s.podiumAvTxt, { fontSize: 13 }]}>{sorted[2].initial}</Text>
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
  banner: { paddingHorizontal: 16, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: HUB_BG },
  wordmark: { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 25, letterSpacing: -1, color: INK, lineHeight: 30 },
  bannerRight: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  bannerLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 10, color: INK4 },
  avatar: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { fontFamily: 'Poppins_700Bold', fontSize: 10, color: '#fff' },
  divider: { height: 1, backgroundColor: 'rgba(0,0,0,0.08)' },

  // Child Select
  selectBody: { flex: 1 },
  selectHero: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10 },
  selectGreet: { fontFamily: 'Poppins_500Medium', fontSize: 11, color: INK4, marginBottom: 3 },
  selectTitle: { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 23, color: INK, lineHeight: 28, letterSpacing: -0.5 },
  selectTitleEm: { fontStyle: 'italic', color: 'rgba(0,0,0,0.28)' },
  familyBadge: { marginLeft: 16, alignSelf: 'flex-start', backgroundColor: 'rgba(10,64,48,0.12)', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 3, marginBottom: 12 },
  familyBadgeTxt: { fontFamily: 'Poppins_700Bold', fontSize: 8, color: HUB_DARK, textTransform: 'uppercase', letterSpacing: 0.3 },
  selectCards: { paddingHorizontal: 12, gap: 8 },
  selectCard: { borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 11 },
  selectCardAv: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  selectCardAvTxt: { fontFamily: 'Poppins_700Bold', fontSize: 15, color: '#fff' },
  selectCardName: { fontFamily: 'Poppins_700Bold', fontSize: 13, color: INK, marginBottom: 1 },
  selectCardMeta: { fontFamily: 'Poppins_500Medium', fontSize: 9, color: INK4 },
  selectCardPts: { backgroundColor: 'rgba(0,0,0,0.08)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  selectCardPtsTxt: { fontFamily: 'Poppins_700Bold', fontSize: 10, color: HUB_DARK },

  // Hub header
  hubHeader: { paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 9 },
  backBtn: { width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(0,0,0,0.08)', alignItems: 'center', justifyContent: 'center' },
  hubHeaderTitle: { fontFamily: 'Poppins_800ExtraBold', fontSize: 13, color: INK },
  ptsBadge: { marginLeft: 'auto', backgroundColor: HUB_DARK, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, flexDirection: 'row', alignItems: 'center', gap: 5 },
  ptsBadgeN: { fontFamily: 'Poppins_800ExtraBold', fontSize: 14, color: HUB_BG },
  ptsBadgeL: { fontFamily: 'Poppins_600SemiBold', fontSize: 9, color: 'rgba(168,232,204,0.6)', textTransform: 'uppercase', letterSpacing: 0.3 },

  // Streak strip (little)
  streakStrip: { marginHorizontal: 12, marginBottom: 10, backgroundColor: 'rgba(255,255,255,0.4)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 8 },
  streakFire: { fontSize: 22 },
  streakNum: { fontFamily: 'Poppins_800ExtraBold', fontSize: 20, color: INK, lineHeight: 22 },
  streakLbl: { fontFamily: 'Poppins_600SemiBold', fontSize: 9, color: INK4, textTransform: 'uppercase', letterSpacing: 0.3 },

  // Older header card
  olderHeaderCard: { marginHorizontal: 12, marginBottom: 10, backgroundColor: 'rgba(0,0,0,0.08)', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  olderPtsBig: { fontFamily: 'Poppins_800ExtraBold', fontSize: 28, color: INK, lineHeight: 30 },
  olderPtsLbl: { fontFamily: 'Poppins_600SemiBold', fontSize: 9, color: INK4, textTransform: 'uppercase', letterSpacing: 0.3 },
  olderStreakPill: { backgroundColor: HUB_DARK, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, marginTop: 4, alignSelf: 'flex-start' },
  olderStreakPillTxt: { fontFamily: 'Poppins_700Bold', fontSize: 11, color: HUB_BG },

  // Middle stats
  midStats: { flexDirection: 'row', gap: 7, paddingHorizontal: 12, marginBottom: 10 },
  midStat: { flex: 1, backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 11, paddingVertical: 8, paddingHorizontal: 10, alignItems: 'center' },
  midStatN: { fontFamily: 'Poppins_800ExtraBold', fontSize: 18, color: INK, lineHeight: 20 },
  midStatL: { fontFamily: 'Poppins_600SemiBold', fontSize: 8, color: INK4, textTransform: 'uppercase', letterSpacing: 0.3, marginTop: 1 },

  // Tabs
  tabs: { flexDirection: 'row', gap: 6, paddingHorizontal: 12, marginBottom: 8 },
  tab: { flex: 1, backgroundColor: 'rgba(255,255,255,0.35)', borderRadius: 10, paddingVertical: 7, alignItems: 'center' },
  tabOn: { backgroundColor: CARD },
  tabTxt: { fontFamily: 'Poppins_700Bold', fontSize: 10, color: 'rgba(0,0,0,0.45)' },
  tabTxtOn: { color: HUB_DARK },

  // Tab content
  tabContent: { paddingHorizontal: 12, gap: 7 },

  // Job card (Little/Middle)
  jobCard: { backgroundColor: CARD, borderRadius: 14, paddingHorizontal: 13, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', gap: 11 },
  jobIcon: { fontSize: 22 },
  jobName: { fontFamily: 'Poppins_700Bold', fontSize: 13, color: INK, marginBottom: 2 },
  jobPts: { fontFamily: 'Poppins_500Medium', fontSize: 10, color: INK4 },
  jobType: { fontFamily: 'Poppins_700Bold', fontSize: 8, textTransform: 'uppercase', letterSpacing: 0.3 },
  jobTypeDaily: { color: HUB_DARK },
  jobTypeOneoff: { color: AMBER_TXT },
  jobCheck: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: 'rgba(0,0,0,0.15)', alignItems: 'center', justifyContent: 'center', marginLeft: 'auto' },
  jobCheckDone: { backgroundColor: HUB_BG, borderColor: HUB_BG },
  suggestJob: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: 'rgba(0,0,0,0.12)', backgroundColor: 'rgba(0,0,0,0.02)' },

  // Older job card
  olderJob: { backgroundColor: CARD, borderRadius: 12, paddingHorizontal: 13, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  olderJobIcon: { fontSize: 16 },
  olderJobName: { fontFamily: 'Poppins_600SemiBold', fontSize: 12, color: INK, flex: 1 },
  olderJobPts: { fontFamily: 'Poppins_700Bold', fontSize: 11, color: HUB_DARK },
  olderJobCheck: { width: 24, height: 24, borderRadius: 6, borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.15)', alignItems: 'center', justifyContent: 'center' },
  olderJobCheckDone: { backgroundColor: HUB_BG, borderColor: HUB_BG },

  // Rewards
  balanceHero: { backgroundColor: HUB_DARK, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  balanceNum: { fontFamily: 'Poppins_800ExtraBold', fontSize: 36, color: '#fff', lineHeight: 38, letterSpacing: -1 },
  balanceLbl: { fontFamily: 'Poppins_600SemiBold', fontSize: 10, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 0.3, marginTop: 2 },
  balanceStreak: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, marginTop: 8, alignSelf: 'flex-start' },
  balanceStreakTxt: { fontFamily: 'Poppins_700Bold', fontSize: 10, color: 'rgba(255,255,255,0.8)' },
  earnLabel: { fontFamily: 'Poppins_400Regular', fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 3 },
  earnNum: { fontFamily: 'Poppins_800ExtraBold', fontSize: 13, color: HUB_BG },
  earnSub: { fontFamily: 'Poppins_400Regular', fontSize: 9, color: 'rgba(255,255,255,0.4)', marginTop: 3 },

  rewardCard: { backgroundColor: CARD, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13 },
  rewardCardAfford: { borderWidth: 2, borderColor: HUB_BG },
  rewardCardFar: { backgroundColor: 'rgba(255,255,255,0.55)' },
  rewardTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  rewardIcon: { fontSize: 22 },
  rewardName: { fontFamily: 'Poppins_700Bold', fontSize: 13, color: INK, marginBottom: 1 },
  rewardCost: { fontFamily: 'Poppins_400Regular', fontSize: 10, color: INK4 },
  affordTag: { backgroundColor: HUB_BG, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, marginLeft: 'auto' },
  affordTagTxt: { fontFamily: 'Poppins_700Bold', fontSize: 8, color: HUB_DARK },
  almostTag: { backgroundColor: AMBER_BG, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, marginLeft: 'auto' },
  almostTagTxt: { fontFamily: 'Poppins_700Bold', fontSize: 8, color: AMBER_TXT },
  rewardBarWrap: { height: 6, backgroundColor: 'rgba(0,0,0,0.07)', borderRadius: 3, overflow: 'hidden', marginBottom: 5 },
  rewardBar: { height: 6, borderRadius: 3 },
  rewardBarRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  rewardBarLabel: { fontFamily: 'Poppins_400Regular', fontSize: 9, color: INK4 },
  redeemBtn: { borderRadius: 10, paddingVertical: 9, alignItems: 'center' },
  redeemBtnAfford: { backgroundColor: HUB_DARK },
  redeemBtnAlmost: { backgroundColor: AMBER_BG },
  redeemBtnDisabled: { backgroundColor: 'rgba(0,0,0,0.07)' },
  redeemBtnTxt: { fontFamily: 'Poppins_700Bold', fontSize: 12 },
  redeemBtnTxtAfford: { color: '#fff' },
  redeemBtnTxtAlmost: { color: AMBER_TXT },
  redeemBtnTxtDisabled: { color: 'rgba(0,0,0,0.3)' },

  // Games
  dailyBanner: { backgroundColor: HUB_DARK, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 8 },
  dailyBannerTxt: { fontFamily: 'Poppins_600SemiBold', fontSize: 11, color: HUB_BG },
  dailyBannerWord: { fontFamily: 'Poppins_800ExtraBold', fontSize: 14, color: '#fff', letterSpacing: 2 },
  dailyBannerPlay: { marginLeft: 'auto', backgroundColor: 'rgba(168,232,204,0.2)', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4 },
  dailyBannerPlayTxt: { fontFamily: 'Poppins_700Bold', fontSize: 10, color: HUB_BG },

  gamesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  gameFeatured: { width: '100%', backgroundColor: HUB_DARK, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', gap: 12 },
  gameFeaturedIcon: { fontSize: 30 },
  gameFeaturedName: { fontFamily: 'Poppins_700Bold', fontSize: 13, color: '#fff', marginBottom: 2 },
  gameFeaturedDesc: { fontFamily: 'Poppins_400Regular', fontSize: 9, color: 'rgba(255,255,255,0.6)', lineHeight: 14 },
  gameBadgeDaily: { backgroundColor: 'rgba(168,232,204,0.2)', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'flex-start', marginTop: 5 },
  gameBadgeDailyTxt: { fontFamily: 'Poppins_700Bold', fontSize: 8, color: HUB_BG },
  gameCard: { width: (W - 24 - 8) / 2, backgroundColor: CARD, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 13 },
  gameIcon: { fontSize: 26, marginBottom: 6 },
  gameName: { fontFamily: 'Poppins_700Bold', fontSize: 12, color: INK, marginBottom: 2 },
  gameDesc: { fontFamily: 'Poppins_400Regular', fontSize: 9, color: INK4, lineHeight: 14 },
  gameBadge: { backgroundColor: 'rgba(168,232,204,0.3)', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'flex-start', marginTop: 5 },
  gameBadgeTxt: { fontFamily: 'Poppins_700Bold', fontSize: 8, color: HUB_DARK },
  gameBadgeWeekly: { backgroundColor: AMBER_BG },
  gameBadgeWeeklyTxt: { color: AMBER_TXT },
  gameBadgeAnytime: { backgroundColor: 'rgba(99,102,241,0.12)' },
  gameBadgeAnytimeTxt: { color: '#4338CA' },

  // Leaderboard
  podium: { flexDirection: 'row', gap: 6, alignItems: 'flex-end', paddingHorizontal: 0, marginBottom: 8 },
  podiumPos: { flex: 1, alignItems: 'center', gap: 4 },
  podiumAv: { borderRadius: 50, alignItems: 'center', justifyContent: 'center' },
  podiumAvTxt: { fontFamily: 'Poppins_700Bold', color: '#fff' },
  podiumName: { fontFamily: 'Poppins_700Bold', fontSize: 9, color: INK, textAlign: 'center' },
  podiumPts: { fontFamily: 'Poppins_800ExtraBold', fontSize: 11, color: INK, textAlign: 'center' },
  podiumBar: { borderTopLeftRadius: 8, borderTopRightRadius: 8, width: '100%', alignItems: 'center', justifyContent: 'center' },
  podiumRank: { fontFamily: 'Poppins_800ExtraBold', fontSize: 16, color: 'rgba(0,0,0,0.4)' },

  lbRow: { backgroundColor: CARD, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 10 },
  lbRowHighlight: { borderWidth: 2, borderColor: 'rgba(34,197,94,0.3)' },
  lbRank: { fontFamily: 'Poppins_800ExtraBold', fontSize: 12, color: 'rgba(0,0,0,0.25)', width: 20 },
  lbAv: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  lbAvTxt: { fontFamily: 'Poppins_700Bold', fontSize: 11, color: '#fff' },
  lbRowName: { fontFamily: 'Poppins_700Bold', fontSize: 12, color: INK },
  lbRowStreak: { fontFamily: 'Poppins_400Regular', fontSize: 10, color: INK4 },
  lbRowPts: { fontFamily: 'Poppins_800ExtraBold', fontSize: 13, color: HUB_DARK, marginLeft: 'auto' },
  toggleNote: { backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: 10, paddingHorizontal: 11, paddingVertical: 8, marginTop: 4 },
  toggleNoteTxt: { fontFamily: 'Poppins_400Regular', fontSize: 10, color: 'rgba(0,0,0,0.45)', textAlign: 'center' },

  // GIPHY overlay
  giphyOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', alignItems: 'center', justifyContent: 'center', gap: 12, zIndex: 50 },
  giphyFrame: { width: 220, height: 165, borderRadius: 16, backgroundColor: '#1a1a2e', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  giphyPlaceholder: { fontSize: 60 },
  giphyApiNote: { fontFamily: 'Poppins_400Regular', fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 6 },
  giphyPtsEarned: { backgroundColor: 'rgba(168,232,204,0.15)', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 6 },
  giphyPtsText: { fontFamily: 'Poppins_800ExtraBold', fontSize: 16, color: HUB_BG },
  giphyText: { fontFamily: 'Poppins_800ExtraBold', fontSize: 18, color: '#fff', textAlign: 'center', letterSpacing: -0.3 },
  giphySub: { fontFamily: 'Poppins_400Regular', fontSize: 11, color: 'rgba(255,255,255,0.5)' },
  giphyDismiss: { backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 24, paddingVertical: 8, marginTop: 4 },
  giphyDismissTxt: { fontFamily: 'Poppins_700Bold', fontSize: 12, color: INK },

  // Redeem confirm modal
  confirmOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  confirmSheet: { backgroundColor: '#fff', borderRadius: 20, padding: 20, width: '100%' },
  confirmIcon: { fontSize: 32, textAlign: 'center', marginBottom: 8 },
  confirmTitle: { fontFamily: 'Poppins_800ExtraBold', fontSize: 15, color: INK, textAlign: 'center', marginBottom: 4 },
  confirmSub: { fontFamily: 'Poppins_400Regular', fontSize: 11, color: INK2, textAlign: 'center', lineHeight: 17, marginBottom: 14 },
  confirmBalance: { backgroundColor: 'rgba(0,0,0,0.04)', borderRadius: 12, paddingHorizontal: 13, paddingVertical: 11, marginBottom: 14 },
  confirmBalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  confirmBalLabel: { fontFamily: 'Poppins_400Regular', fontSize: 11, color: INK2 },
  confirmBalValue: { fontFamily: 'Poppins_400Regular', fontSize: 11, color: INK2 },
  confirmBalDivider: { height: 1, backgroundColor: 'rgba(0,0,0,0.07)', marginVertical: 4 },
  confirmYes: { backgroundColor: HUB_DARK, borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginBottom: 7 },
  confirmYesTxt: { fontFamily: 'Poppins_700Bold', fontSize: 12, color: '#fff' },
  confirmNo: { backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  confirmNoTxt: { fontFamily: 'Poppins_600SemiBold', fontSize: 12, color: INK4 },
});
