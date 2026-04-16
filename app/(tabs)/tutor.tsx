/**
 * Tutor Screen — Child Selector
 * app/(tabs)/tutor.tsx
 *
 * Screen 1 from zaeli-tutor-final-mockup-v4_1.html
 * Lavender #D8CCFF background, child cards with streaks,
 * locked/upsell states for non-enrolled children.
 *
 * Navigates to tutor-child.tsx on tap.
 */

import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar as RNStatusBar, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import Svg, { Polyline } from 'react-native-svg';
import { supabase } from '../../lib/supabase';

// ── Constants ─────────────────────────────────────────────────
const FAMILY_ID = '00000000-0000-0000-0000-000000000001';
const { width: W } = Dimensions.get('window');

// Tutor palette — lavender-based (v4 mockup)
const LAV       = '#D8CCFF';
const PURPLE    = '#5020C0';
const PURPLE_D  = '#3010A0';
const MINT      = '#A8E8CC';
const INK       = '#0A0A0A';
const INK2      = 'rgba(0,0,0,0.42)';
const INK3      = 'rgba(0,0,0,0.38)';
const BODY_BG   = '#FAF8F5';

// Family constants
const FAMILY_COLOURS: Record<string, string> = {
  Rich: '#4D8BFF', Anna: '#FF7B6B', Poppy: '#A855F7', Gab: '#22C55E', Duke: '#F59E0B',
};
const FAMILY_EMOJI: Record<string, string> = {
  Poppy: '\u{1F338}', Gab: '\u2B50', Duke: '\u{1F996}',
};
const CHILD_BG: Record<string, string> = {
  Poppy: 'rgba(168,85,247,0.12)', Gab: 'rgba(34,197,94,0.12)', Duke: 'rgba(245,158,11,0.12)',
};

// Subjects per child (hardcoded for now — will come from Supabase later)
const CHILD_SUBJECTS: Record<string, string> = {
  Poppy: 'Maths, English, Science',
  Gab: 'Maths, HASS',
  Duke: 'Reading, Maths',
};

// ── Types ─────────────────────────────────────────────────────
interface Child {
  id: string;
  name: string;
  year_level: number;
  tutor_active: boolean;
  role: string;
  colour?: string;
}

// ── SVG Icons ────────────────────────────────────────────────
function IcoBack({ color = INK, size = 14 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={2.5} strokeLinecap="round">
      <Polyline points="15 18 9 12 15 6" />
    </Svg>
  );
}

// ── Component ────────────────────────────────────────────────
export default function TutorScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [children, setChildren] = useState<Child[]>([]);
  const [streaks, setStreaks] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    RNStatusBar.setBarStyle('dark-content', true);
    fetchData();
  }, []));

  async function fetchData() {
    setLoading(true);
    try {
      // Fetch children
      const { data: members } = await supabase
        .from('family_members')
        .select('id, name, year_level, tutor_active, role, colour')
        .eq('family_id', FAMILY_ID)
        .in('role', ['child', 'kid'])
        .order('year_level', { ascending: false });
      const kids = members ?? [];
      setChildren(kids);

      // Calculate streaks from tutor_sessions (last 30 days)
      const since = new Date();
      since.setDate(since.getDate() - 30);
      try {
        const { data: sess } = await supabase
          .from('tutor_sessions')
          .select('child_name, created_at')
          .eq('family_id', FAMILY_ID)
          .gte('created_at', since.toISOString())
          .order('created_at', { ascending: false })
          .limit(200);

        // Calculate streak per child (consecutive days with sessions)
        const streakMap: Record<string, number> = {};
        kids.forEach(k => {
          const childSessions = (sess ?? []).filter(s => s.child_name === k.name);
          streakMap[k.name] = calculateStreak(childSessions);
        });
        setStreaks(streakMap);
      } catch {
        // tutor_sessions table might not exist yet
      }
    } catch (e) {
      console.error('tutor fetch:', e);
    } finally {
      setLoading(false);
    }
  }

  function calculateStreak(sessions: { created_at: string }[]): number {
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

    // Streak must include today or yesterday
    if (sorted[0] !== todayStr) {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
      if (sorted[0] !== yStr) return 0;
    }

    let streak = 1;
    for (let i = 1; i < sorted.length; i++) {
      const prev = new Date(sorted[i - 1]);
      const curr = new Date(sorted[i]);
      const diffDays = Math.round((prev.getTime() - curr.getTime()) / 86400000);
      if (diffDays === 1) streak++;
      else break;
    }
    return streak;
  }

  function goChild(child: Child) {
    router.navigate({
      pathname: '/(tabs)/tutor-child',
      params: { childId: child.id, childName: child.name, yearLevel: String(child.year_level) },
    });
  }

  const active = children.filter(c => c.tutor_active);
  const locked = children.filter(c => !c.tutor_active);

  // ── Hardcoded fallback if Supabase has no children yet ──
  const hasKids = children.length > 0;
  const displayKids = hasKids ? children : [
    { id: '1', name: 'Poppy', year_level: 6, tutor_active: true, role: 'child' },
    { id: '2', name: 'Gab', year_level: 4, tutor_active: true, role: 'child' },
    { id: '3', name: 'Duke', year_level: 1, tutor_active: true, role: 'child' },
  ];
  const displayActive = displayKids.filter(c => c.tutor_active);
  const displayLocked = displayKids.filter(c => !c.tutor_active);

  return (
    <View style={[s.safe, { paddingTop: insets.top }]}>
      <RNStatusBar barStyle="dark-content" />

      {/* ── Banner — matches Kids Hub exactly ── */}
      <View style={s.banner}>
        <TouchableOpacity onPress={() => router.navigate('/(tabs)/')} activeOpacity={0.7}>
          <Text style={s.wordmark}>
            {'z'}<Text style={{ color: MINT }}>{'a'}</Text>{'el'}<Text style={{ color: MINT }}>{'i'}</Text>
          </Text>
        </TouchableOpacity>
        <Text style={s.bannerLabel}>Tutor</Text>
      </View>
      <View style={s.divider} />

      {/* ── Hero area ── */}
      <View style={s.heroArea}>
        {/* Premium badge */}
        <View style={s.premBadge}>
          <Text style={s.premBadgeTxt}>{'\u2726'} Premium {'·'} Tutor</Text>
        </View>

        <Text style={s.heroTitle}>Who's learning</Text>
        <Text style={s.heroTitleItalic}>today?</Text>
      </View>

      {/* ── Child cards ── */}
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Active children */}
        {displayActive.map(child => {
          const streak = streaks[child.name] ?? 0;
          const bg = CHILD_BG[child.name] ?? 'rgba(0,0,0,0.06)';
          const colour = FAMILY_COLOURS[child.name] ?? '#999';
          const emoji = FAMILY_EMOJI[child.name] ?? '\u{1F464}';
          const subjects = CHILD_SUBJECTS[child.name] ?? '';

          return (
            <TouchableOpacity
              key={child.id}
              style={[s.childCard, { backgroundColor: bg }]}
              onPress={() => goChild(child)}
              activeOpacity={0.76}
            >
              <View style={s.childRow}>
                <View style={[s.childAv, { backgroundColor: colour }]}>
                  <Text style={s.childAvTxt}>{child.name[0]}</Text>
                </View>
                <View style={s.childInfo}>
                  <Text style={s.childName}>{child.name}</Text>
                  <Text style={s.childMeta}>Year {child.year_level} {subjects ? '\u00B7 ' + subjects : ''}</Text>
                </View>
                {streak > 0 && (
                  <View style={s.streakBox}>
                    <Text style={s.streakNum}>{'\u{1F525}'} {streak}</Text>
                    <Text style={s.streakLbl}>day streak</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Locked children — upsell */}
        {displayLocked.map(child => {
          const colour = FAMILY_COLOURS[child.name] ?? '#999';
          return (
            <View key={child.id} style={s.lockedCard}>
              <View style={s.childRow}>
                <View style={[s.childAv, { backgroundColor: colour + '4D' }]}>
                  <Text style={s.childAvTxt}>{child.name[0]}</Text>
                </View>
                <View style={s.childInfo}>
                  <Text style={[s.childName, { color: INK3 }]}>{child.name}</Text>
                  <Text style={s.childMeta}>Year {child.year_level} {'·'} Not enrolled</Text>
                </View>
                <View style={s.lockedBadge}>
                  <Text style={s.lockedBadgeTxt}>{'\u{1F512}'} Add</Text>
                </View>
              </View>
            </View>
          );
        })}

        {/* Upsell banner for locked children */}
        {displayLocked.length > 0 && (
          <View style={s.upsellBanner}>
            <Text style={{ fontSize: 22 }}>{'\u{1F393}'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.upsellTitle}>Add {displayLocked[0].name} to Tutor</Text>
              <Text style={s.upsellSub}>Year {displayLocked[0].year_level} reading & maths {'·'} A$9.99/mo</Text>
            </View>
            <TouchableOpacity style={s.upsellBtn} activeOpacity={0.75}>
              <Text style={s.upsellBtnTxt}>Add</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Empty state */}
        {displayKids.length === 0 && (
          <View style={s.empty}>
            <Text style={{ fontSize: 48, marginBottom: 14 }}>{'\u{1F393}'}</Text>
            <Text style={s.emptyTitle}>No children added yet</Text>
            <Text style={s.emptySub}>Add your children in Our Family first.</Text>
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

  // ── Banner — matches Kids Hub ──
  banner: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: LAV,
  },
  wordmark: {
    fontFamily: 'Poppins_800ExtraBold',
    fontSize: 40,
    color: INK,
    letterSpacing: -1.5,
    lineHeight: 46,
  },
  bannerLabel: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 17,
    color: 'rgba(0,0,0,0.35)',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },

  // ── Hero area ──
  heroArea: {
    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: 18,
    backgroundColor: LAV,
  },
  heroTitle: {
    fontFamily: 'Poppins_800ExtraBold',
    fontSize: 30,
    color: INK,
    letterSpacing: -0.5,
    lineHeight: 36,
  },
  heroTitleItalic: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 30,
    color: 'rgba(0,0,0,0.30)',
    fontStyle: 'italic',
    letterSpacing: -0.5,
    lineHeight: 36,
    marginBottom: 14,
  },
  premBadge: {
    alignSelf: 'flex-start',
    backgroundColor: PURPLE,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 5,
    marginBottom: 12,
  },
  premBadgeTxt: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 11,
    color: '#fff',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  // ── Scroll ──
  scroll: {
    flex: 1,
    backgroundColor: LAV,
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 10,
  },

  // ── Active child card ──
  childCard: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 10,
  },
  childRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  childAv: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  childAvTxt: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 20,
    color: '#fff',
  },
  childInfo: {
    flex: 1,
  },
  childName: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 19,
    color: INK,
    marginBottom: 2,
  },
  childMeta: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
    color: INK2,
  },
  streakBox: {
    alignItems: 'flex-end',
  },
  streakNum: {
    fontFamily: 'Poppins_800ExtraBold',
    fontSize: 20,
    color: INK,
    lineHeight: 24,
  },
  streakLbl: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 10,
    color: INK3,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // ── Locked card ──
  lockedCard: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 10,
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.12)',
    borderStyle: 'dashed',
    opacity: 0.65,
  },
  lockedBadge: {
    backgroundColor: 'rgba(0,0,0,0.07)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  lockedBadgeTxt: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 12,
    color: INK3,
    textTransform: 'uppercase',
  },

  // ── Upsell ──
  upsellBanner: {
    marginTop: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(80,32,192,0.09)',
    borderWidth: 1,
    borderColor: 'rgba(80,32,192,0.17)',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  upsellTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 16,
    color: PURPLE,
    marginBottom: 2,
  },
  upsellSub: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: 'rgba(80,32,192,0.55)',
    lineHeight: 18,
  },
  upsellBtn: {
    backgroundColor: PURPLE,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  upsellBtnTxt: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 14,
    color: '#fff',
  },

  // ── Empty ──
  empty: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 20,
    color: INK,
    marginBottom: 8,
  },
  emptySub: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 16,
    color: INK2,
    textAlign: 'center',
    lineHeight: 24,
  },
});
