/**
 * TutorSidebar — iPad only
 * Renders the left panel in the two-column iPad tutor layout.
 * Not used on iPhone (IS_TABLET check done by parent).
 *
 * Usage:
 *   <TutorSidebar
 *     childName="Poppy"
 *     yearLevel={6}
 *     mode="homework"
 *     subject="English"
 *     topic="Essay structure"
 *     sessionStarted={startTimeRef.current}
 *     score={{ correct: 8, answered: 11 }}   // practice only
 *     onBack={() => router.replace('/(tabs)/tutor-child', ...)}
 *   />
 */

import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';

// ── Constants ─────────────────────────────────────────────────
const FAMILY_ID = '00000000-0000-0000-0000-000000000001';
const T_DARK    = '#1A1A2E';
const T_DEEP    = '#0D0D1F';
const T_GOLD    = '#C9A84C';
const T_GOLD2   = '#B8963E';
const T_GOLDL   = 'rgba(201,168,76,0.08)';
const INK       = '#0A0A0A';
const INK2      = 'rgba(10,10,10,0.45)';
const INK3      = 'rgba(10,10,10,0.18)';
const BORDER    = 'rgba(0,0,0,0.07)';
const GREEN     = '#00C97A';
const MAG       = '#E0007C';
const BLUE      = '#0057FF';

const EMOJI_MAP: Record<string, string>  = { Poppy: '🌸', Gab: '⭐', Duke: '🦖' };
const AVBG_MAP: Record<string, string>   = {
  Poppy: 'rgba(224,0,124,0.1)',
  Gab:   'rgba(0,87,255,0.1)',
  Duke:  'rgba(0,0,0,0.04)',
};

function modeLabel(mode: string) {
  if (mode === 'homework') return 'Homework Help';
  if (mode === 'practice') return 'Practice Mode';
  if (mode === 'reading')  return 'Reading';
  return 'Session';
}

function modeIcon(mode: string) {
  if (mode === 'homework') return '📚';
  if (mode === 'practice') return '🧠';
  if (mode === 'reading')  return '📖';
  return '✦';
}

function formatDuration(startMs: number): string {
  const secs = Math.floor((Date.now() - startMs) / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  return `${mins} min${mins !== 1 ? 's' : ''}`;
}

// ── Types ─────────────────────────────────────────────────────
interface Child {
  id: string;
  name: string;
  year_level: number;
  tutor_active: boolean;
}

interface Props {
  childName: string;
  childId: string;
  yearLevel: number;
  mode: 'homework' | 'practice' | 'reading';
  subject?: string;
  topic?: string;
  sessionStartMs: number;
  score?: { correct: number; answered: number };
  onBack: () => void;
}

// ── Component ─────────────────────────────────────────────────
export default function TutorSidebar({
  childName, childId, yearLevel, mode, subject, topic,
  sessionStartMs, score, onBack,
}: Props) {
  const router = useRouter();
  const [children, setChildren] = useState<Child[]>([]);
  const [elapsed, setElapsed] = useState('');

  // Load children list
  useEffect(() => {
    supabase
      .from('family_members')
      .select('id, name, year_level, tutor_active')
      .eq('family_id', FAMILY_ID)
      .eq('role', 'child')
      .order('name')
      .then(({ data }) => setChildren(data ?? []));
  }, []);

  // Live duration timer
  useEffect(() => {
    setElapsed(formatDuration(sessionStartMs));
    const t = setInterval(() => setElapsed(formatDuration(sessionStartMs)), 10000);
    return () => clearInterval(t);
  }, [sessionStartMs]);

  const scoreStr = score && score.answered > 0
    ? `${score.correct}/${score.answered} correct (${Math.round(score.correct / score.answered * 100)}%)`
    : null;

  return (
    <View style={s.sidebar}>

      {/* ── Header — dark gradient ── */}
      <View style={s.sbHdr}>
        {/* Logo row */}
        <View style={s.logoRow}>
          <View style={s.logoMark}>
            <Text style={s.logoStar}>✦</Text>
          </View>
          <Text style={s.logoWord}>Zaeli</Text>
        </View>
        {/* Tutor badge */}
        <View style={s.tutorBadge}>
          <Text style={s.tutorBadgeTxt}>✦ Tutor</Text>
        </View>
        {/* Child name + context */}
        <Text style={s.sbChildName}>{childName}'s{'\n'}Session</Text>
        <Text style={s.sbChildMeta}>
          Year {yearLevel} · {subject ?? modeLabel(mode)}{topic ? ` · ${topic}` : ''}
        </Text>
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>

        {/* ── Children list ── */}
        <Text style={s.sectionLbl}>Children</Text>
        {children.map(child => {
          const isActive = child.name === childName;
          const isLocked = !child.tutor_active;
          return (
            <TouchableOpacity
              key={child.id}
              style={[s.childItem, isActive && s.childItemActive]}
              activeOpacity={isLocked ? 1 : 0.75}
              onPress={() => {
                if (isLocked || isActive) return;
                router.replace({
                  pathname: '/(tabs)/tutor-child',
                  params: { childId: child.id, childName: child.name, yearLevel: String(child.year_level) },
                });
              }}
            >
              <View style={[s.childAv, { backgroundColor: AVBG_MAP[child.name] ?? 'rgba(0,0,0,0.04)' }]}>
                <Text style={{ fontSize: 16 }}>{EMOJI_MAP[child.name] ?? '👤'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.childName, isLocked && { color: INK2 }]}>{child.name}</Text>
                <Text style={s.childMeta}>
                  {isLocked
                    ? 'Locked · Tap to unlock'
                    : isActive
                    ? `Year ${child.year_level} · In session`
                    : `Year ${child.year_level} · Last: Today`}
                </Text>
              </View>
              {isActive && <View style={s.activeDot} />}
              {isLocked && <Text style={{ fontSize: 14 }}>🔒</Text>}
            </TouchableOpacity>
          );
        })}

        {/* ── Session info ── */}
        <View style={s.sessionInfo}>
          <Text style={s.sessionInfoTitle}>This Session</Text>
          <Text style={s.sessionInfoDetail}>
            {modeIcon(mode)} {modeLabel(mode)}{'\n'}
            {subject ? `📖 ${subject}` : ''}{topic ? `\n📝 ${topic}` : ''}{'\n'}
            ⏱ {elapsed}
          </Text>
          {scoreStr && (
            <View style={s.sessionTag}>
              <Text style={s.sessionTagTxt}>✓ {scoreStr}</Text>
            </View>
          )}
        </View>

      </ScrollView>

      {/* ── Back button ── */}
      <TouchableOpacity style={s.backBtn} onPress={onBack} activeOpacity={0.8}>
        <Text style={s.backBtnTxt}>‹ Back to hub</Text>
      </TouchableOpacity>

    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────
const s = StyleSheet.create({
  sidebar: {
    width: 290,
    backgroundColor: '#fff',
    borderRightWidth: 1,
    borderRightColor: BORDER,
    flexDirection: 'column',
  },

  // Header — dark gradient
  sbHdr: {
    backgroundColor: T_DARK,
    padding: 20,
    paddingBottom: 18,
  },
  logoRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  logoMark: { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  logoStar: { fontSize: 14, color: T_GOLD },
  logoWord: { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 22, color: '#fff', letterSpacing: -0.5 },
  tutorBadge:    { alignSelf: 'flex-start', backgroundColor: 'rgba(201,168,76,0.18)', borderWidth: 1, borderColor: 'rgba(201,168,76,0.3)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, marginBottom: 10 },
  tutorBadgeTxt: { fontFamily: 'Poppins_700Bold', fontSize: 10, color: T_GOLD, letterSpacing: 0.8 },
  sbChildName: { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 24, color: '#fff', letterSpacing: -0.5, marginBottom: 3 },
  sbChildMeta: { fontFamily: 'Poppins_400Regular', fontSize: 11, color: 'rgba(255,255,255,0.5)', lineHeight: 17 },

  // Section label
  sectionLbl: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    color: INK3,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 6,
  },

  // Child items
  childItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  childItemActive: {
    backgroundColor: T_GOLDL,
    borderLeftWidth: 3,
    borderLeftColor: T_GOLD,
    paddingLeft: 11, // compensate for border
  },
  childAv:   { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  childName: { fontFamily: 'Poppins_700Bold', fontSize: 13, color: INK },
  childMeta: { fontFamily: 'Poppins_400Regular', fontSize: 11, color: INK2, marginTop: 1 },
  activeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: GREEN, marginLeft: 'auto', flexShrink: 0 },

  // Session info
  sessionInfo: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  sessionInfoTitle:  { fontFamily: 'Poppins_700Bold', fontSize: 10, color: T_GOLD, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  sessionInfoDetail: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: INK2, lineHeight: 20 },
  sessionTag:    { marginTop: 10, backgroundColor: 'rgba(0,201,122,0.08)', borderWidth: 1, borderColor: 'rgba(0,201,122,0.15)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, alignSelf: 'flex-start' },
  sessionTagTxt: { fontFamily: 'Poppins_700Bold', fontSize: 11, color: GREEN },

  // Back
  backBtn:    { margin: 14, backgroundColor: 'rgba(0,0,0,0.04)', borderRadius: 12, borderWidth: 1, borderColor: BORDER, paddingVertical: 12, alignItems: 'center' },
  backBtnTxt: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: INK2 },
});
