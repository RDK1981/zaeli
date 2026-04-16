/**
 * Tutor Child Home Screen
 * app/(tabs)/tutor-child.tsx
 *
 * Screen 2 from zaeli-tutor-final-mockup-v4_1.html
 * Child's personal hub with 6 pillars, week stats, recent sessions.
 * Lavender #D8CCFF header, white content area.
 */

import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  StatusBar as RNStatusBar, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter, useLocalSearchParams } from 'expo-router';
import Svg, { Polyline } from 'react-native-svg';
import { supabase } from '../../lib/supabase';

// ── Constants ─────────────────────────────────────────────────
const FAMILY_ID = '00000000-0000-0000-0000-000000000001';
const { width: W } = Dimensions.get('window');

// Palette
const LAV       = '#D8CCFF';
const PURPLE    = '#5020C0';
const MINT      = '#A8E8CC';
const INK       = '#0A0A0A';
const INK2      = 'rgba(0,0,0,0.42)';
const INK3      = 'rgba(0,0,0,0.38)';
const BODY_BG   = '#FAF8F5';

// Family
const FAMILY_COLOURS: Record<string, string> = {
  Rich: '#4D8BFF', Anna: '#FF7B6B', Poppy: '#A855F7', Gab: '#22C55E', Duke: '#F59E0B',
};

// ── Pillars — compact 3×2 grid (emoji + name only) ──────────
const PILLARS = [
  { id: 'homework',      icon: '\u{1F4CB}', name: 'Homework' },
  { id: 'practice',      icon: '\u270F\uFE0F', name: 'Practice' },
  { id: 'read-aloud',    icon: '\u{1F4D6}', name: 'Read Aloud' },
  { id: 'write-review',  icon: '\u{1F58A}\uFE0F', name: 'Write' },
  { id: 'comprehension',  icon: '\u{1F50D}', name: 'Comprehension' },
  { id: 'money-life',     icon: '\u{1F4B0}', name: 'Money & Life' },
];

// ── Types ─────────────────────────────────────────────────────
interface Session {
  id: string;
  pillar: string;
  subject: string | null;
  topic: string | null;
  duration_seconds: number;
  created_at: string;
  status: string;
}

// ── SVG Icons ────────────────────────────────────────────────
function IcoBack({ color = INK, size = 12 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={2.5} strokeLinecap="round">
      <Polyline points="15 18 9 12 15 6" />
    </Svg>
  );
}

// ── Helpers ───────────────────────────────────────────────────
function sessionWhen(iso: string) {
  const now = new Date();
  const d = new Date(iso);
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[d.getDay()];
}

function durationStr(secs: number) {
  if (!secs || secs < 60) return '';
  return `${Math.round(secs / 60)} min`;
}

const PILLAR_LABELS: Record<string, string> = {
  'homework': 'Homework', 'practice': 'Practice', 'read-aloud': 'Read Aloud',
  'write-review': 'Write & Review', 'comprehension': 'Comprehension', 'money-life': 'Money & Life',
};

function sessionDisplayTitle(sess: Session): string {
  const pillarLabel = PILLAR_LABELS[sess.pillar] ?? sess.pillar;
  if (sess.topic && sess.topic !== 'Zaeli picks') return `${sess.topic}`;
  if (sess.subject) return `${pillarLabel} — ${sess.subject}`;
  return pillarLabel;
}

function pillarDot(pillar: string) {
  if (pillar === 'practice') return PURPLE;
  if (pillar === 'homework') return '#F59E0B';
  if (pillar === 'read-aloud') return '#22C55E';
  if (pillar === 'write-review') return '#6366F1';
  if (pillar === 'comprehension') return MINT;
  if (pillar === 'money-life') return '#F59E0B';
  return '#A855F7';
}

// ── Component ────────────────────────────────────────────────
export default function TutorChildScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    childId: string; childName: string; yearLevel: string;
  }>();

  const childName = params.childName ?? 'Poppy';
  const yearLevel = parseInt(params.yearLevel ?? '6', 10);
  const childId = params.childId ?? '';
  const colour = FAMILY_COLOURS[childName] ?? '#999';

  const [sessions, setSessions] = useState<Session[]>([]);
  const [weekStats, setWeekStats] = useState({ sessions: 0, minutes: 0, topSubject: '' });
  const [streak, setStreak] = useState(0);
  const [editingSession, setEditingSession] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  useFocusEffect(useCallback(() => {
    RNStatusBar.setBarStyle('dark-content', true);
    fetchData();
  }, [childId]));

  async function fetchData() {
    try {
      // Recent sessions
      const { data: sess, error: sessErr } = await supabase
        .from('tutor_sessions')
        .select('id, pillar, subject, topic, duration_seconds, created_at, status')
        .eq('family_id', FAMILY_ID)
        .eq('child_name', childName)
        .order('created_at', { ascending: false })
        .limit(5);
      if (sessErr) console.error('TUTOR SESSIONS FETCH ERROR:', sessErr.message, sessErr.details);
      else console.log('TUTOR SESSIONS LOADED:', (sess ?? []).length, 'for', childName);
      setSessions(sess ?? []);

      // This week stats
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - 7);
      const { data: weekSess } = await supabase
        .from('tutor_sessions')
        .select('subject, duration_seconds')
        .eq('family_id', FAMILY_ID)
        .eq('child_name', childName)
        .gte('created_at', weekStart.toISOString());

      const ws = weekSess ?? [];
      const totalMins = Math.round(ws.reduce((sum, s) => sum + (s.duration_seconds ?? 0), 0) / 60);
      const subjectCounts: Record<string, number> = {};
      ws.forEach(s => {
        if (s.subject) subjectCounts[s.subject] = (subjectCounts[s.subject] ?? 0) + 1;
      });
      const topSubject = Object.entries(subjectCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';

      setWeekStats({ sessions: ws.length, minutes: totalMins, topSubject });

      // Streak
      const { data: allSess } = await supabase
        .from('tutor_sessions')
        .select('created_at')
        .eq('family_id', FAMILY_ID)
        .eq('child_name', childName)
        .gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString())
        .order('created_at', { ascending: false });
      setStreak(calcStreak(allSess ?? []));
    } catch (e) {
      console.error('tutor-child fetch:', e);
    }
  }

  function calcStreak(sessions: { created_at: string }[]): number {
    if (!sessions.length) return 0;
    const dates = new Set(
      sessions.map(s => {
        const d = new Date(s.created_at);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      })
    );
    const sorted = Array.from(dates).sort().reverse();
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
    if (sorted[0] !== todayStr && sorted[0] !== yStr) return 0;
    let count = 1;
    for (let i = 1; i < sorted.length; i++) {
      const prev = new Date(sorted[i - 1]);
      const curr = new Date(sorted[i]);
      if (Math.round((prev.getTime() - curr.getTime()) / 86400000) === 1) count++;
      else break;
    }
    return count;
  }

  function goPillar(pillarId: string) {
    router.navigate({
      pathname: '/(tabs)/tutor-session',
      params: { childId, childName, yearLevel: String(yearLevel), pillar: pillarId },
    });
  }

  function goSessionReview(sessionId: string) {
    // TODO: navigate to session review screen
    console.log('Review session:', sessionId);
  }

  function goProgress() {
    // TODO: navigate to progress screen
    console.log('View progress for', childName);
  }

  return (
    <View style={[s.safe, { paddingTop: insets.top }]}>
      <RNStatusBar barStyle="dark-content" />

      {/* ── Header strip ── */}
      <View style={s.headerStrip}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.navigate('/(tabs)/tutor')} activeOpacity={0.7}>
          <IcoBack color={INK} size={12} />
        </TouchableOpacity>
        <View style={[s.childAv, { backgroundColor: colour }]}>
          <Text style={s.childAvTxt}>{childName[0]}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.childNameHeader}>{childName}<Text style={s.childMetaHeader}> {'·'} Year {yearLevel}</Text></Text>
        </View>
        {streak > 0 && (
          <View style={s.streakPill}>
            <Text style={{ fontSize: 14 }}>{'\u{1F525}'}</Text>
            <Text style={s.streakNum}>{streak}</Text>
          </View>
        )}
      </View>

      {/* ── Week stats strip ── */}
      <View style={s.wkStrip}>
        <View style={s.wkStat}>
          <Text style={s.wkStatNum}>{weekStats.sessions || '\u2014'}</Text>
          <Text style={s.wkStatLbl}>Sessions</Text>
        </View>
        <View style={s.wkDiv} />
        <View style={s.wkStat}>
          <Text style={s.wkStatNum}>{weekStats.minutes || '\u2014'}</Text>
          <Text style={s.wkStatLbl}>Minutes</Text>
        </View>
        <View style={s.wkDiv} />
        <View style={s.wkStat}>
          <Text style={[s.wkStatNum, { fontSize: 12 }]}>{weekStats.topSubject || '\u2014'}</Text>
          <Text style={s.wkStatLbl}>Top subject</Text>
        </View>
      </View>

      <ScrollView
        style={s.content}
        contentContainerStyle={s.contentPad}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Compact 3×2 pillar grid ── */}
        <Text style={s.sectionLbl}>All pillars</Text>
        <View style={s.pillarGrid}>
          {PILLARS.map(p => (
            <TouchableOpacity
              key={p.id}
              style={s.pillarSq}
              onPress={() => goPillar(p.id)}
              activeOpacity={0.76}
            >
              <Text style={s.pillarEmoji}>{p.icon}</Text>
              <Text style={s.pillarName}>{p.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Recent sessions (main content) ── */}
        {sessions.length > 0 && (
          <>
            <Text style={[s.sectionLbl, { marginTop: 0 }]}>Recent sessions</Text>
            <View style={s.sessionList}>
              {sessions.map(sess => {
                const isEditing = editingSession === sess.id;
                const pillarLabel = PILLAR_LABELS[sess.pillar] ?? sess.pillar;
                return (
                  <TouchableOpacity
                    key={sess.id}
                    style={s.sessionRow}
                    onPress={() => sess.status === 'active' ? goPillar(sess.pillar) : goSessionReview(sess.id)}
                    onLongPress={() => { setEditingSession(sess.id); setEditTitle(sessionDisplayTitle(sess)); }}
                    activeOpacity={0.76}
                  >
                    <View style={[s.sessionDot, { backgroundColor: pillarDot(sess.pillar) }]} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      {isEditing ? (
                        <TextInput
                          style={s.sessionTitleEdit}
                          value={editTitle}
                          onChangeText={setEditTitle}
                          autoFocus
                          returnKeyType="done"
                          onSubmitEditing={() => {
                            if (editTitle.trim()) {
                              supabase.from('tutor_sessions').update({ topic: editTitle.trim() }).eq('id', sess.id).then(() => {});
                              setSessions(prev => prev.map(se => se.id === sess.id ? { ...se, topic: editTitle.trim() } : se));
                            }
                            setEditingSession(null);
                          }}
                          onBlur={() => setEditingSession(null)}
                        />
                      ) : (
                        <Text style={s.sessionTitle} numberOfLines={1}>{sessionDisplayTitle(sess)}</Text>
                      )}
                      <Text style={s.sessionMeta}>{sessionWhen(sess.created_at)} {'·'} {pillarLabel}{sess.duration_seconds ? ' · ' + durationStr(sess.duration_seconds) : ''}</Text>
                    </View>
                    <View style={s.sessionAction}>
                      <Text style={s.sessionActionTxt}>{sess.status === 'active' ? 'Resume' : 'Review'}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        {/* ── No sessions yet ── */}
        {sessions.length === 0 && (
          <View style={s.noSessions}>
            <Text style={{ fontSize: 28, marginBottom: 8 }}>{'\u{1F4DA}'}</Text>
            <Text style={s.noSessionsTxt}>No sessions yet — tap a pillar above to start!</Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ── STYLES ────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: LAV,
  },

  // ── Header strip ──
  headerStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: LAV,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  childAv: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  childAvTxt: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 17,
    color: '#fff',
  },
  childNameHeader: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 22,
    color: INK,
  },
  childMetaHeader: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 16,
    color: INK3,
  },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  streakNum: {
    fontFamily: 'Poppins_800ExtraBold',
    fontSize: 20,
    color: INK,
  },

  // ── Week stats strip ──
  wkStrip: {
    marginHorizontal: 14,
    marginBottom: 14,
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  wkStat: {
    alignItems: 'center',
    flex: 1,
  },
  wkStatNum: {
    fontFamily: 'Poppins_800ExtraBold',
    fontSize: 22,
    color: PURPLE,
    lineHeight: 26,
  },
  wkStatLbl: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 10,
    color: INK3,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  wkDiv: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },

  // ── Content ──
  content: {
    flex: 1,
    backgroundColor: LAV,
  },
  contentPad: {
    paddingBottom: 20,
  },

  // ── Section label ──
  sectionLbl: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: 'rgba(0,0,0,0.35)',
    paddingHorizontal: 18,
    marginBottom: 8,
  },

  // ── Compact 3×2 pillar grid ──
  pillarGrid: {
    paddingHorizontal: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  pillarSq: {
    width: Math.floor((W - 28 - 16) / 3),
    height: Math.floor((W - 28 - 16) / 3) + 4,
    backgroundColor: '#fff',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  pillarEmoji: {
    fontSize: 26,
    marginBottom: 5,
  },
  pillarName: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 12,
    color: INK,
    textAlign: 'center',
    lineHeight: 15,
  },

  // ── Session list ──
  sessionList: {
    paddingHorizontal: 14,
    gap: 8,
  },
  sessionRow: {
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderRadius: 14,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sessionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sessionTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
    color: INK,
  },
  sessionMeta: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: INK3,
    marginTop: 2,
  },
  sessionAction: {
    backgroundColor: PURPLE,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  sessionActionTxt: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 12,
    color: '#fff',
  },

  // ── Session title inline edit ──
  sessionTitleEdit: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
    color: INK,
    borderBottomWidth: 1.5,
    borderBottomColor: PURPLE,
    paddingVertical: 0,
    marginBottom: 1,
  },

  // ── No sessions ──
  noSessions: {
    alignItems: 'center',
    paddingTop: 30,
    paddingHorizontal: 40,
  },
  noSessionsTxt: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 15,
    color: INK2,
    textAlign: 'center',
    lineHeight: 22,
  },
});
