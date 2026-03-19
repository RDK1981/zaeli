/**
 * Tutor Child Home Screen
 * app/(tabs)/tutor-child.tsx
 */

import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar as RNStatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';

// ── Constants ─────────────────────────────────────────────────
const FAMILY_ID = '00000000-0000-0000-0000-000000000001';
const T_DARK  = '#1A1A2E';
const T_GOLD  = '#C9A84C';
const T_GOLD2 = '#B8963E';
const T_GOLDL = 'rgba(201,168,76,0.08)';
const MAG     = '#E0007C';
const GREEN   = '#00C97A';
const INK     = '#0A0A0A';
const INK2    = 'rgba(10,10,10,0.45)';
const INK3    = 'rgba(10,10,10,0.18)';
const BORDER  = 'rgba(0,0,0,0.07)';
const BG      = '#F7F7F7';
const CARD    = '#FFFFFF';
const YELLOW  = '#FFE500';

// ── Helpers ───────────────────────────────────────────────────
function getTierLabel(y: number) {
  if (y <= 2) return 'Little Learner';
  if (y <= 6) return 'Middle Years';
  return 'Middle & Senior';
}
function getEmoji(name: string) {
  const m: Record<string, string> = { Poppy: '🌸', Gab: '⭐', Duke: '🦖' };
  return m[name] ?? '👤';
}
function modeDotBg(mode: string) {
  if (mode === 'practice') return 'rgba(201,168,76,0.12)';
  if (mode === 'reading')  return 'rgba(224,0,124,0.08)';
  return T_GOLDL;
}
function modeIcon(mode: string) {
  if (mode === 'homework') return '📝';
  if (mode === 'practice') return '🧠';
  if (mode === 'reading')  return '📖';
  return '📚';
}
function sessionWhen(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[new Date(iso).getDay()];
}
function fmtDuration(secs: number) {
  if (!secs || secs < 60) return '';
  return ` · ${Math.round(secs / 60)} mins`;
}
function sessionSubtitle(session: Session): string {
  const when    = sessionWhen(session.created_at);
  const dur     = fmtDuration(session.duration_seconds);
  const subj    = session.subject ? ` · ${session.subject}` : '';

  // Practice: show score
  if (session.mode === 'practice' && session.questions_answered > 0) {
    return `${when}${dur} · ${session.questions_correct}/${session.questions_answered} correct${subj}`;
  }
  return `${when}${dur}${subj}`;
}

// ── Types ─────────────────────────────────────────────────────
interface Session {
  id: string; mode: string; subject: string | null;
  topic: string | null; duration_seconds: number;
  questions_answered: number; questions_correct: number;
  created_at: string; status: string;
}

// ── Component ─────────────────────────────────────────────────
export default function TutorChildScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ childId: string; childName: string; yearLevel: string }>();

  const childName = params.childName ?? '';
  const yearLevel = parseInt(params.yearLevel ?? '5', 10);
  const childId   = params.childId ?? '';
  const tierLabel = getTierLabel(yearLevel);
  const tierEmoji = getEmoji(childName);

  const [sessions, setSessions] = useState<Session[]>([]);

  // Refetch every time we focus — picks up new sessions immediately
  useFocusEffect(useCallback(() => {
    RNStatusBar.setBarStyle('light-content', true);
    fetchSessions();
  }, [childId]));

  async function fetchSessions() {
    const { data } = await supabase
      .from('tutor_sessions')
      .select('id, mode, subject, topic, duration_seconds, questions_answered, questions_correct, created_at, status')
      .eq('family_id', FAMILY_ID)
      .eq('child_name', childName)
      .order('created_at', { ascending: false })
      .limit(5);
    setSessions(data ?? []);
  }

  function goMode(mode: 'homework' | 'practice' | 'reading') {
    const base = { childId, childName, yearLevel: String(yearLevel) };
    if (mode === 'homework') {
      router.push({ pathname: '/(tabs)/tutor-session',  params: { ...base, mode: 'homework' } });
    } else if (mode === 'practice') {
      router.push({ pathname: '/(tabs)/tutor-practice', params: base });
    } else {
      router.push({ pathname: '/(tabs)/tutor-reading',  params: base });
    }
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <RNStatusBar barStyle="light-content" />

      {/* Hero */}
      <View style={s.hero}>
        <View style={s.heroOrbOuter} />
        <View style={s.heroOrbInner} />
        <View style={s.heroOrb2} />

        <TouchableOpacity
          onPress={() => router.replace('/(tabs)/tutor')}
          activeOpacity={0.7}
          style={s.backRow}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={s.backTxt}>‹ Back</Text>
        </TouchableOpacity>

        <View style={s.tierBadge}>
          <Text style={s.tierBadgeTxt}>{tierEmoji} Year {yearLevel} · {tierLabel}</Text>
        </View>
        <Text style={s.heroTitle}>Hey {childName}! 👋</Text>
        <Text style={s.heroSub}>What are we tackling today?</Text>
      </View>

      {/* Content */}
      <View style={s.content}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48 }}>

          <Text style={s.slbl}>Choose a mode</Text>

          <View style={s.modeRow}>
            <TouchableOpacity style={[s.modeCard, s.modeHw]} onPress={() => goMode('homework')} activeOpacity={0.82}>
              <View style={s.modeHwOrb} />
              <Text style={s.modeIcon}>📚</Text>
              <Text style={s.modeLabel}>Homework{'\n'}Help</Text>
              <Text style={s.modeSub}>Stuck on something?</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.modeCard, s.modePr]} onPress={() => goMode('practice')} activeOpacity={0.82}>
              <Text style={s.modeIcon}>🧠</Text>
              <Text style={s.modeLabel}>Practice</Text>
              <Text style={s.modeSub}>15 mins before dinner?</Text>
            </TouchableOpacity>
          </View>

          <View style={s.modeFullWrap}>
            <TouchableOpacity style={[s.modeCardFull, s.modeRd]} onPress={() => goMode('reading')} activeOpacity={0.82}>
              <Text style={s.modeIconInline}>📖</Text>
              <View>
                <Text style={s.modeLabel}>Reading &amp; Speaking</Text>
                <Text style={s.modeSub}>Read aloud, get Zaeli's feedback</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Recent sessions */}
          {sessions.length > 0 && (
            <>
              <Text style={s.slbl}>Recent Sessions</Text>
              {sessions.map(session => (
                <View key={session.id} style={s.sessionItem}>
                  <View style={[s.siDot, { backgroundColor: modeDotBg(session.mode) }]}>
                    <Text style={s.siDotIcon}>{modeIcon(session.mode)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={s.siTitleRow}>
                      <Text style={s.siTitle} numberOfLines={1}>
                        {session.topic ?? session.subject ?? 'Session'}
                      </Text>
                      {session.status === 'complete' && session.mode === 'practice' && session.questions_answered > 0 && (
                        <View style={s.scoreBadge}>
                          <Text style={s.scoreBadgeTxt}>{session.questions_correct}/{session.questions_answered}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={s.siMeta}>{sessionSubtitle(session)}</Text>
                  </View>
                  <Text style={s.siArrow}>›</Text>
                </View>
              ))}
            </>
          )}

          {sessions.length === 0 && (
            <View style={s.noSessions}>
              <Text style={s.noSessionsIcon}>✨</Text>
              <Text style={s.noSessionsTxt}>No sessions yet — let's start one!</Text>
            </View>
          )}

        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: T_DARK },
  content: { flex: 1, backgroundColor: BG },

  hero:         { backgroundColor: T_DARK, paddingHorizontal: 22, paddingTop: 14, paddingBottom: 18, position: 'relative', overflow: 'hidden' },
  heroOrbOuter: { position: 'absolute', right: -60, top: -80, width: 260, height: 260, borderRadius: 130, backgroundColor: 'rgba(201,168,76,0.07)' },
  heroOrbInner: { position: 'absolute', right: 20,  top: -20, width: 160, height: 160, borderRadius: 80,  backgroundColor: 'rgba(201,168,76,0.09)' },
  heroOrb2:     { position: 'absolute', left: -20, bottom: 10, width: 100, height: 100, borderRadius: 50,  backgroundColor: 'rgba(201,168,76,0.05)' },

  backRow: { marginBottom: 10 },
  backTxt: { fontSize: 22, color: 'rgba(255,255,255,0.65)', fontFamily: 'Poppins_400Regular' },

  tierBadge:    { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 10 },
  tierBadgeTxt: { fontFamily: 'Poppins_700Bold', fontSize: 11, color: 'rgba(255,255,255,0.8)', letterSpacing: 0.5 },

  heroTitle: { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 38, color: '#fff', letterSpacing: -0.8, marginBottom: 5 },
  heroSub:   { fontFamily: 'Poppins_400Regular', fontSize: 17, color: 'rgba(255,255,255,0.55)', lineHeight: 24 },

  slbl: { fontFamily: 'Poppins_700Bold', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.5, color: INK2, paddingHorizontal: 22, paddingTop: 14, paddingBottom: 8 },

  modeRow:      { flexDirection: 'row', paddingHorizontal: 18, gap: 10, marginBottom: 10 },
  modeCard:     { flex: 1, borderRadius: 18, padding: 18, paddingHorizontal: 14, overflow: 'hidden', position: 'relative' },
  modeCardFull: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 18, padding: 16 },
  modeFullWrap: { paddingHorizontal: 18, marginBottom: 4 },

  modeHw:    { backgroundColor: T_DARK },
  modeHwOrb: { position: 'absolute', right: -20, bottom: -20, width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(201,168,76,0.08)' },
  modePr:    { backgroundColor: '#C9A84C' },
  modeRd:    { backgroundColor: MAG },

  modeIcon:       { fontSize: 24, marginBottom: 8 },
  modeIconInline: { fontSize: 24 },
  modeLabel:      { fontFamily: 'Poppins_700Bold', fontSize: 17, color: '#fff', letterSpacing: -0.2 },
  modeSub:        { fontFamily: 'Poppins_400Regular', fontSize: 14, color: 'rgba(255,255,255,0.6)', marginTop: 3 },

  sessionItem: { marginHorizontal: 18, marginBottom: 10, backgroundColor: CARD, borderRadius: 14, borderWidth: 1.5, borderColor: BORDER, padding: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  siDot:       { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  siDotIcon:   { fontSize: 18 },

  siTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  siTitle:    { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: INK, flex: 1 },
  siMeta:     { fontFamily: 'Poppins_400Regular', fontSize: 12, color: INK2 },
  siArrow:    { fontSize: 18, color: INK3 },

  // Score badge on practice sessions
  scoreBadge:    { backgroundColor: 'rgba(0,201,122,0.1)', borderWidth: 1, borderColor: 'rgba(0,201,122,0.2)', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  scoreBadgeTxt: { fontFamily: 'Poppins_700Bold', fontSize: 11, color: GREEN },

  noSessions:     { alignItems: 'center', paddingTop: 32, paddingHorizontal: 40 },
  noSessionsIcon: { fontSize: 32, marginBottom: 10 },
  noSessionsTxt:  { fontFamily: 'Poppins_400Regular', fontSize: 14, color: INK2, textAlign: 'center' },
});
