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

// ── Constants — identical to tutor.tsx ───────────────────────
const FAMILY_ID = '00000000-0000-0000-0000-000000000001';
const T_DARK  = '#1A1A2E';
const T_GOLD  = '#C9A84C';
const T_GOLDL = 'rgba(201,168,76,0.08)';
const MAG     = '#E0007C';
const HW_INDIGO = '#1A5F7A';  // Homework Help — deep teal
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
  const m: Record<string,string> = { Poppy:'🌸', Gab:'⭐', Duke:'🦖' };
  return m[name] ?? '👤';
}
function modeDotBg(mode: string) {
  if (mode === 'practice') return 'rgba(0,87,255,0.08)';
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
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  return days[new Date(iso).getDay()];
}
function sessionDuration(secs: number) {
  if (!secs) return '';
  return ` · ${Math.round(secs / 60)} mins`;
}

interface Session {
  id: string; mode: string; subject: string|null;
  topic: string|null; duration_seconds: number; created_at: string;
}

// ── Component ─────────────────────────────────────────────────
export default function TutorChildScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    childId: string; childName: string; yearLevel: string;
  }>();

  const childName = params.childName ?? '';
  const yearLevel = parseInt(params.yearLevel ?? '5', 10);
  const childId   = params.childId ?? '';
  const tierLabel = getTierLabel(yearLevel);
  const tierEmoji = getEmoji(childName);

  const [sessions, setSessions] = useState<Session[]>([]);

  useFocusEffect(useCallback(() => {
    RNStatusBar.setBarStyle('light-content', true);
    fetchSessions();
  }, [childId]));

  async function fetchSessions() {
    const { data } = await supabase
      .from('tutor_sessions')
      .select('id, mode, subject, topic, duration_seconds, created_at')
      .eq('family_id', FAMILY_ID)
      .eq('child_name', childName)
      .order('created_at', { ascending: false })
      .limit(5);
    setSessions(data ?? []);
  }

  function goMode(mode: 'homework' | 'practice' | 'reading') {
    const base = { childId, childName, yearLevel: String(yearLevel) };
    if (mode === 'homework') {
      // Always new session — no resumeSessionId
      router.push({ pathname:'/(tabs)/tutor-session', params:{ ...base, mode:'homework' } });
    } else if (mode === 'practice') {
      router.push({ pathname:'/(tabs)/tutor-practice', params: base });
    } else {
      router.push({ pathname:'/(tabs)/tutor-reading', params: base });
    }
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <RNStatusBar barStyle="light-content" />

      {/* ══════════════════════════════════════════
          HERO — same structure as tutor.tsx
          padding-bottom: 18px (from HTML)
      ══════════════════════════════════════════ */}
      <View style={s.hero}>
        <View style={s.heroOrbOuter}/>
        <View style={s.heroOrbInner}/>
        <View style={s.heroOrb2}/>

        {/* Top row: ‹ Back left | Year badge right */}
        <View style={s.heroTopRow}>
          <TouchableOpacity onPress={() => router.replace('/(tabs)/tutor')} activeOpacity={0.7}
            hitSlop={{ top:12, bottom:12, left:12, right:12 }}>
            <Text style={s.backTxt}>‹ Back</Text>
          </TouchableOpacity>
          <View style={s.tierBadge}>
            <Text style={s.tierBadgeTxt}>{tierEmoji} Year {yearLevel} · {tierLabel}</Text>
          </View>
        </View>

        {/* Greeting */}
        <Text style={s.heroTitle}>Hey {childName}! 👋</Text>
        <Text style={s.heroSub}>What are we tackling today?</Text>
      </View>

      {/* ══════════════════════════════════════════
          CONTENT
      ══════════════════════════════════════════ */}
      <View style={s.content}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom:48 }}>

          {/* Section label — .slbl (same as tutor.tsx) */}
          <Text style={s.slbl}>Choose a mode</Text>

          {/* ── Mode cards — all full width, stacked ── */}
          <View style={s.modeStack}>

            <TouchableOpacity style={[s.modeCardFull, s.modeHw]} onPress={() => goMode('homework')} activeOpacity={0.82}>
              <View style={s.modeHwOrb}/>
              <Text style={s.modeIconInline}>📚</Text>
              <View style={{ flex:1 }}>
                <Text style={s.modeLabel}>Homework Help</Text>
                <Text style={s.modeSub}>Stuck on something?</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={[s.modeCardFull, s.modePr]} onPress={() => goMode('practice')} activeOpacity={0.82}>
              <Text style={s.modeIconInline}>🧠</Text>
              <View style={{ flex:1 }}>
                <Text style={s.modeLabel}>Practice</Text>
                <Text style={s.modeSub}>15 mins before dinner?</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={[s.modeCardFull, s.modeRd]} onPress={() => goMode('reading')} activeOpacity={0.82}>
              <Text style={s.modeIconInline}>📖</Text>
              <View style={{ flex:1 }}>
                <Text style={s.modeLabel}>Reading &amp; Speaking</Text>
                <Text style={s.modeSub}>Read aloud, get Zaeli's feedback</Text>
              </View>
            </TouchableOpacity>

          </View>

          {/* ── Recent sessions ── */}
          {sessions.length > 0 && (
            <>
              <Text style={s.slbl}>Recent Sessions</Text>
              {sessions.map(session => (
                <TouchableOpacity
                  key={session.id}
                  style={s.sessionItem}
                  activeOpacity={0.75}
                  onPress={() => {
                    const base = { childId, childName, yearLevel: String(yearLevel) };
                    if (session.mode === 'homework') {
                      router.push({ pathname:'/(tabs)/tutor-session', params:{ ...base, mode:'homework', resumeSessionId: session.id } });
                    } else if (session.mode === 'practice') {
                      router.push({ pathname:'/(tabs)/tutor-practice', params: base });
                    } else {
                      router.push({ pathname:'/(tabs)/tutor-reading', params: base });
                    }
                  }}
                >
                  <View style={[s.siDot, { backgroundColor: modeDotBg(session.mode) }]}>
                    <Text style={s.siDotIcon}>{modeIcon(session.mode)}</Text>
                  </View>
                  <View style={{ flex:1 }}>
                    <Text style={s.siTitle} numberOfLines={1}>
                      {session.topic ?? session.subject ?? 'Session'}
                    </Text>
                    <Text style={s.siMeta}>
                      {sessionWhen(session.created_at)}
                      {sessionDuration(session.duration_seconds)}
                      {session.subject ? ` · ${session.subject}` : ''}
                    </Text>
                  </View>
                  <Text style={s.siArrow}>›</Text>
                </TouchableOpacity>
              ))}
            </>
          )}

          {/* Empty state — no sessions yet */}
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

// ── STYLES ────────────────────────────────────────────────────
const s = StyleSheet.create({

  // Same safe + content pattern as tutor.tsx
  safe:    { flex:1, backgroundColor: T_DARK },
  content: { flex:1, backgroundColor: BG },

  // ── Hero ──
  hero: {
    backgroundColor: T_DARK,
    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  heroOrbOuter: { position:'absolute', width:260, height:260, borderRadius:130, top:-80,  right:-60, backgroundColor:'rgba(201,168,76,0.07)' },
  heroOrbInner: { position:'absolute', width:160, height:160, borderRadius:80,  top:-20,  right:20,  backgroundColor:'rgba(201,168,76,0.09)' },
  heroOrb2:     { position:'absolute', width:100, height:100, borderRadius:50,  bottom:10, left:-20, backgroundColor:'rgba(201,168,76,0.05)' },

  // Top row: back left, badge right
  heroTopRow: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:12 },
  backRow:    { marginBottom: 0 }, // keep for compat
  backTxt:    { fontFamily:'Poppins_600SemiBold', fontSize:15, color:'rgba(255,255,255,0.7)' },

  tierBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tierBadgeTxt: { fontFamily:'Poppins_600SemiBold', fontSize:11, color:'rgba(255,255,255,0.8)', letterSpacing:0.3 },

  heroTitle: { fontFamily:'DMSerifDisplay_400Regular', fontSize:32, color:'#fff', letterSpacing:-0.8, marginBottom:4 },
  heroSub:   { fontFamily:'Poppins_400Regular', fontSize:14, color:'rgba(255,255,255,0.55)', lineHeight:20 },

  // Section label — bigger and darker so kids can read it clearly
  slbl: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    color: INK2,
    paddingHorizontal: 22,
    paddingTop: 16,
    paddingBottom: 8,
  },

  // ── Mode cards — all full width stacked ──
  modeStack: { paddingHorizontal: 18, gap: 10, marginBottom: 6 },

  modeCardFull: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 18,
    overflow: 'hidden',
    position: 'relative',
  },

  modeHw:  { backgroundColor: HW_INDIGO },
  modePr:  { backgroundColor: '#C9A84C' },
  modeRd:  { backgroundColor: MAG },

  modeHwOrb: {
    position: 'absolute', right: -20, bottom: -20,
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(201,168,76,0.08)',
  },

  modeIconInline: { fontSize: 28 },

  modeLabel: { fontFamily:'Poppins_700Bold', fontSize:17, color:'#fff', letterSpacing:-0.2 },
  modeSub:   { fontFamily:'Poppins_400Regular', fontSize:13, color:'rgba(255,255,255,0.65)', marginTop:3 },

  // Keep for compat — no longer used but avoids TS errors
  modeRow: { flexDirection:'row', paddingHorizontal:18, gap:10, marginBottom:10 },
  modeCard: { flex:1, borderRadius:18, padding:18, paddingHorizontal:14, overflow:'hidden', position:'relative' },
  modeFullWrap: { paddingHorizontal:18, marginBottom:4 },
  modeIcon: { fontSize:24, marginBottom:8 },

  // ── Session items ──
  // .session-item: m 0 18 10, CARD, r14, 1.5px BORDER, p 12 14, flex, gap12
  sessionItem: {
    marginHorizontal: 18,
    marginBottom: 10,
    backgroundColor: CARD,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: BORDER,
    padding: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  // .si-dot: 36×36, r12, flex center
  siDot:     { width:36, height:36, borderRadius:12, alignItems:'center', justifyContent:'center', flexShrink:0 },
  siDotIcon: { fontSize: 16 },

  // .si-title: 13px 600 ink — bumped to 14
  siTitle: { fontFamily:'Poppins_600SemiBold', fontSize:14, color:INK },

  // .si-meta: 11px ink2 mt1 — bumped to 12
  siMeta:  { fontFamily:'Poppins_400Regular', fontSize:12, color:INK2, marginTop:2 },

  // .si-arrow: 16px ink3
  siArrow: { fontSize:18, color:INK3 },

  // No sessions
  noSessions:     { alignItems:'center', paddingTop:32, paddingHorizontal:40 },
  noSessionsIcon: { fontSize:32, marginBottom:10 },
  noSessionsTxt:  { fontFamily:'Poppins_400Regular', fontSize:14, color:INK2, textAlign:'center' },
});