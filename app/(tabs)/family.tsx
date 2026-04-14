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

import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Dimensions, StatusBar as RNStatusBar, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import Svg, { Polyline, Path } from 'react-native-svg';
import { supabase } from '../../lib/supabase';

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
export default function OurFamilyScreen() {
  const router = useRouter();
  const [view, setView] = useState<'home' | 'child-detail' | 'pending' | 'profiles'>('home');
  const [selectedChild, setSelectedChild] = useState<ChildName>('Poppy');
  const [dbPending, setDbPending] = useState<any[]>([]);
  const [dbPoints, setDbPoints] = useState<Record<string, number>>({});

  useFocusEffect(useCallback(() => {
    RNStatusBar.setBarStyle('dark-content', true);
    loadFamilyData();
  }, []));

  async function loadFamilyData() {
    try {
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
    } catch (e) { console.log('[family] loadFamilyData error:', e); }
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
    if (view === 'home') {
      router.navigate('/(tabs)/swipe-world' as any);
    } else {
      setView('home');
    }
  }

  function openChild(name: ChildName) {
    setSelectedChild(name);
    setView('child-detail');
  }

  // ── Banner (shared) ──────────────────────────────────────────────────────
  function Banner({ title }: { title: string }) {
    return (
      <>
        <View style={s.banner}>
          <TouchableOpacity onPress={goBack} activeOpacity={0.7}>
            <Text style={s.wordmark}>
              z<Text style={{ color: FAM_ACCENT }}>a</Text>el
              <Text style={{ color: FAM_ACCENT }}>i</Text>
            </Text>
          </TouchableOpacity>
          <View style={s.bannerRight}>
            <Text style={s.bannerLabel}>{title}</Text>
            <View style={[s.avatar, { backgroundColor: FAMILY.Rich.colour, width: 32, height: 32 }]}>
              <Text style={s.avatarTxt}>R</Text>
            </View>
          </View>
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
    const hasPending = dbPending.length > 0 || PENDING_ACTIONS.length > 0;

    return (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Zaeli brief card */}
        {hasPending ? (
          <View style={s.briefCard}>
            <View style={s.briefEye}>
              <View style={s.briefEyeDot} />
              <Text style={s.briefEyeTxt}>Zaeli \u00B7 Family snapshot</Text>
            </View>
            <Text style={s.briefHero}>
              <Text style={s.briefHeroEm}>{PENDING_ACTIONS.length} things</Text> need your attention today.
            </Text>
            <Text style={s.briefDetail}>
              {"Gab's proposed a job, Poppy's requested her sleepover reward, and Duke hasn't ticked off his jobs yet."}
            </Text>
            <View style={s.briefChips}>
              <TouchableOpacity style={s.briefChip}><Text style={s.briefChipTxt}>{"Review Gab's job"}</Text></TouchableOpacity>
              <TouchableOpacity style={s.briefChip}><Text style={s.briefChipTxt}>{"Poppy's reward"}</Text></TouchableOpacity>
              <TouchableOpacity style={s.briefChip}><Text style={s.briefChipTxt}>Remind Duke</Text></TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={s.briefQuiet}>
            <Text style={s.briefQuietIcon}>{'\u2705'}</Text>
            <Text style={s.briefQuietTxt}>
              <Text style={{ fontFamily: 'Poppins_700Bold', color: INK }}>All good today. </Text>
              {"Everyone's on top of their jobs and nothing's waiting for you."}
            </Text>
          </View>
        )}

        {/* Pending actions */}
        {hasPending && (
          <>
            <Text style={s.sectionLabel}>Needs your attention</Text>
            {(dbPending.length > 0 ? dbPending : PENDING_ACTIONS).map((action: any) => {
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
                    <TouchableOpacity style={s.pendingYes} activeOpacity={0.7} onPress={() => isReal && approveItem(action)}>
                      <Text style={s.pendingYesTxt}>
                        {isJob ? `\u2713 ${pts} pts` : '\u2713 Grant'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.pendingNo} activeOpacity={0.7} onPress={() => isReal && declineItem(action)}>
                      <Text style={s.pendingNoTxt}>{action.type === 'job' ? 'Edit' : 'Not yet'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </>
        )}

        {/* Our Kids */}
        <Text style={s.sectionLabel}>Our kids</Text>
        {KIDS.map(kid => {
          const member = FAMILY[kid.name];
          const detail = CHILD_DETAIL[kid.name];
          const hasTutor = (FAMILY[kid.name] as any).tutorActive;

          return (
            <TouchableOpacity
              key={kid.name}
              style={s.kidCard}
              onPress={() => openChild(kid.name)}
              activeOpacity={0.8}
            >
              <View style={s.kidTop}>
                <View style={[s.kidAvatar, { backgroundColor: member.colour }]}>
                  <Text style={s.kidAvatarTxt}>{member.initial}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.kidName}>
                    {kid.name} <Text style={s.kidNameMeta}>{'\u00B7'} Yr {(FAMILY[kid.name] as any).year} {'\u00B7'} {(FAMILY[kid.name] as any).age}</Text>
                  </Text>
                  <Text style={s.kidMeta}>{'\u{1F525}'} {kid.streak} day streak</Text>
                </View>
                <View style={s.kidPts}>
                  <Text style={s.kidPtsTxt}>{'\u2B50'} {kid.points}</Text>
                </View>
              </View>

              <View style={s.kidStats}>
                <View style={s.kidStat}>
                  <Text style={s.kidStatN}>{kid.jobsDone}/{kid.jobsTotal}</Text>
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
                  {kid.mathsBand ? (
                    <Text style={s.kidStatN}>{kid.mathsBand}</Text>
                  ) : (
                    <Text style={s.kidStatN}>{kid.points - 190 > 0 ? kid.points - 190 : 45}</Text>
                  )}
                  <Text style={s.kidStatL}>{kid.mathsBand ? (kid.name === 'Duke' ? 'Reading band' : 'Maths band') : 'To reward'}</Text>
                </View>
              </View>

              <View style={s.kidActions}>
                <TouchableOpacity
                  style={[s.kidAction, hasTutor ? s.kidActionTutor : s.kidActionTutorLocked]}
                  activeOpacity={0.7}
                  onPress={(e) => { e.stopPropagation(); }}
                >
                  <Text style={[s.kidActionTxt, hasTutor ? s.kidActionTutorTxt : s.kidActionTutorLockedTxt]}>
                    {'\u{1F4DA}'} {hasTutor ? 'Tutor progress' : 'Add Tutor'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.kidAction, s.kidActionHub]}
                  activeOpacity={0.7}
                  onPress={(e) => { e.stopPropagation(); }}
                >
                  <Text style={[s.kidActionTxt, s.kidActionHubTxt]}>{'\u{1F3E0}'} Kids Hub</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Quick links */}
        <View style={s.quickLinks}>
          <TouchableOpacity style={s.quickLink} onPress={() => setView('profiles')} activeOpacity={0.7}>
            <Text style={s.quickLinkTxt}>{'\u{1F464}'} Family profiles</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.quickLink} onPress={() => setView('pending')} activeOpacity={0.7}>
            <Text style={s.quickLinkTxt}>{'\u{1F4CB}'} See all pending</Text>
          </TouchableOpacity>
        </View>
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
              Year {(member as any).year} {'\u00B7'} Age {(member as any).age} {'\u00B7'} {'\u{1F382}'} {(member as any).dob} {'\u00B7'} {'\u{1F525}'} {kid.streak} day streak
            </Text>
          </View>
          <TouchableOpacity style={s.editBadge} activeOpacity={0.7}>
            <Text style={s.editBadgeTxt}>Edit</Text>
          </TouchableOpacity>
        </View>

        {/* Tutor progress */}
        {hasTutor && detail.subjects.length > 0 ? (
          <View style={s.sectionCard}>
            <View style={s.sectionCardHeader}>
              <Text style={{ fontSize: 20 }}>{'\u{1F4DA}'}</Text>
              <Text style={s.sectionCardTitle}>Tutor progress</Text>
              <View style={s.streakBadge}>
                <Text style={s.streakBadgeTxt}>{'\u{1F525}'} {kid.sessions} sessions</Text>
              </View>
            </View>

            {detail.subjects.map((subj, i) => (
              <View key={subj.name} style={[s.subjectRow, i === detail.subjects.length - 1 && { marginBottom: 0 }]}>
                <View style={s.subjTop}>
                  <Text style={s.subjName}>{subj.name}</Text>
                  <View style={[s.subjBand, { backgroundColor: subj.bandBg }]}>
                    <Text style={[s.subjBandTxt, { color: subj.bandColour }]}>{subj.band}</Text>
                  </View>
                </View>
                <View style={s.subjBarWrap}>
                  <View style={[s.subjBar, { width: `${subj.pct}%`, backgroundColor: subj.barColour }]} />
                </View>
                <Text style={s.subjNote}>{subj.note}</Text>
              </View>
            ))}

            {detail.recentSessions.map((sess, i) => (
              <View key={i} style={s.recentSession}>
                <View style={[s.rsDot, { backgroundColor: sess.dotColour }]} />
                <View style={{ flex: 1 }}>
                  <Text style={s.rsTitle} numberOfLines={1}>{sess.title}</Text>
                  <Text style={s.rsMeta}>{sess.meta}</Text>
                </View>
                <Text style={s.rsView}>View {'\u2192'}</Text>
              </View>
            ))}
          </View>
        ) : !hasTutor ? (
          <View style={s.sectionCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 8 }}>
              <Text style={{ fontSize: 26 }}>{'\u{1F4DA}'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 16, color: INK, marginBottom: 1 }}>Tutor not enrolled</Text>
                <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 13, color: INK4 }}>A$9.99/month {'\u00B7'} Australian curriculum Yr {(member as any).year}</Text>
              </View>
            </View>
            <TouchableOpacity style={s.tutorCta} activeOpacity={0.7}>
              <Text style={s.tutorCtaTxt}>Add {selectedChild} to Tutor {'\u2192'}</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Kids Hub section */}
        <View style={s.sectionCard}>
          <View style={s.sectionCardHeader}>
            <Text style={{ fontSize: 20 }}>{'\u{1F3E0}'}</Text>
            <Text style={s.sectionCardTitle}>Kids Hub</Text>
            <Text style={s.hubPtsBadge}>{'\u2B50'} {kid.points} pts</Text>
          </View>

          <View style={s.hubStatRow}>
            <View style={s.hubStat}>
              <Text style={s.hubStatN}>{kid.jobsDone}/{kid.jobsTotal}</Text>
              <Text style={s.hubStatL}>Jobs today</Text>
            </View>
            <View style={s.hubStat}>
              <Text style={s.hubStatN}>{'\u{1F525}'} {kid.streak}</Text>
              <Text style={s.hubStatL}>Day streak</Text>
            </View>
            <View style={s.hubStat}>
              <Text style={s.hubStatN}>{selectedChild === 'Poppy' ? 210 : selectedChild === 'Gab' ? 45 : 50}</Text>
              <Text style={s.hubStatL}>{selectedChild === 'Poppy' ? 'To sleepover' : 'To reward'}</Text>
            </View>
          </View>

          {detail.jobs.map((job, i) => (
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
              <Text style={s.pendingCountTxt}>{PENDING_ACTIONS.length} items</Text>
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

  // ── Main render ────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <RNStatusBar barStyle="dark-content" />
      <Banner title="Our Family" />
      <View style={s.body}>
        {view === 'home' && <HomeView />}
        {view === 'child-detail' && <ChildDetailView />}
        {view === 'pending' && <PendingView />}
        {view === 'profiles' && <ProfilesView />}
      </View>
    </SafeAreaView>
  );
}

// ── STYLES ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: FAM_BG },
  body: { flex: 1, backgroundColor: FAM_BG },

  // Banner
  banner: { paddingHorizontal: 20, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: FAM_BG },
  wordmark: { fontFamily: 'Poppins_800ExtraBold', fontSize: 32, letterSpacing: -1.5, color: INK, lineHeight: 38 },
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
