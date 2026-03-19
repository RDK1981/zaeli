/**
 * Tutor Screen
 * app/(tabs)/tutor.tsx
 *
 * Hero section copied EXACTLY from calendar.tsx:
 *   - Same SafeAreaView(edges top), same hero padding (22 / 14 / 16)
 *   - Same three orb circles, same heroRow layout
 *   - Same logoMark, logoStarBox, logoWord
 *   - Same viewTog / vt / vtOn / vtTxt / vtTxtOn
 * Only differences from calendar:
 *   - backgroundColor: T_DARK (#1A1A2E) instead of C.mag
 *   - heroTitle centred (no date on the right)
 *   - Toggle labels: Your Kids / Activity / Settings
 *   - Orb colours use gold tint instead of white
 */

import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar as RNStatusBar, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { NavMenu, HamburgerButton } from '../components/NavMenu';

// ── Constants ─────────────────────────────────────────────────
const FAMILY_ID = '00000000-0000-0000-0000-000000000001';

// Tutor palette
const T_DARK  = '#1A1A2E';
const T_GOLD  = '#C9A84C';
const T_GOLD2 = '#B8963E';
const T_GOLD3 = 'rgba(201,168,76,0.15)';
const T_GOLDB = 'rgba(201,168,76,0.18)';
const T_GOLDL = 'rgba(201,168,76,0.08)';

// Shared app palette (same as calendar C.*)
const INK    = '#0A0A0A';
const INK2   = 'rgba(0,0,0,0.50)';
const INK3   = 'rgba(0,0,0,0.28)';
const BORDER = 'rgba(0,0,0,0.07)';
const BG     = '#F7F7F7';
const CARD   = '#FFFFFF';
const GREEN  = '#00C97A';
const ORANGE = '#FF8C00';
const YELLOW = '#FFE500';

// ── Helpers ───────────────────────────────────────────────────
function getTier(y: number) {
  if (y <= 2) return 'Little Learner';
  if (y <= 6) return 'Middle Years';
  return 'Middle & Senior';
}
const EMOJI_MAP: Record<string,string> = { Poppy:'🌸', Gab:'⭐', Duke:'🦖' };
const AVBG_MAP: Record<string,string>  = {
  Poppy:'rgba(224,0,124,0.1)', Gab:'rgba(0,87,255,0.1)', Duke:'rgba(0,0,0,0.04)',
};

// ── Types ─────────────────────────────────────────────────────
interface Child  { id:string; name:string; year_level:number; tutor_active:boolean; role:string; }
interface Session{ child_name:string; created_at:string; }

// ── Component ─────────────────────────────────────────────────
export default function TutorScreen() {
  const router = useRouter();
  const [menuOpen, setMenuOpen]   = useState(false);
  const [children, setChildren]   = useState<Child[]>([]);
  const [sessions, setSessions]   = useState<Session[]>([]);
  const [noticed,  setNoticed]    = useState('');
  const [loading,  setLoading]    = useState(true);
  const [tab, setTab]             = useState<'kids'|'activity'|'settings'>('kids');

  useFocusEffect(useCallback(() => {
    RNStatusBar.setBarStyle('light-content', true);
    fetchData();
  }, []));

  async function fetchData() {
    setLoading(true);
    try {
      const { data: members } = await supabase
        .from('family_members')
        .select('id, name, year_level, tutor_active, role')
        .eq('family_id', FAMILY_ID)
        .in('role', ['child','kid'])
        .order('year_level', { ascending:false });
      const kids = members ?? [];
      setChildren(kids);

      const since = new Date();
      since.setDate(since.getDate() - 7);
      const { data: sess } = await supabase
        .from('tutor_sessions')
        .select('child_name, created_at')
        .eq('family_id', FAMILY_ID)
        .gte('created_at', since.toISOString())
        .order('created_at', { ascending:false })
        .limit(30);
      const s = sess ?? [];
      setSessions(s);
      buildNoticed(kids, s);
    } catch(e) { console.error('tutor fetch:', e); }
    finally { setLoading(false); }
  }

  function buildNoticed(kids: Child[], sess: Session[]) {
    const counts: Record<string,number> = {};
    sess.forEach(s => { counts[s.child_name] = (counts[s.child_name] ?? 0) + 1; });
    const parts: string[] = [];
    kids.filter(k => k.tutor_active).forEach(k => {
      const n = counts[k.name] ?? 0;
      if (n >= 4) parts.push(`${k.name} has had ${n} sessions this week — great consistency.`);
      else if (n >= 2) parts.push(`${k.name} is building a good rhythm this week.`);
    });
    setNoticed(parts.join(' '));
  }

  function lastSessionLabel(name: string) {
    const s = sessions.find(x => x.child_name === name);
    if (!s) return 'No sessions yet';
    const diff = Math.floor((Date.now() - new Date(s.created_at).getTime()) / 86400000);
    if (diff === 0) return `Today, ${new Date(s.created_at).toLocaleTimeString('en-AU',{hour:'2-digit',minute:'2-digit'})}`;
    if (diff === 1) return 'Yesterday';
    return `${diff} days ago`;
  }

  function weekCount(name: string) { return sessions.filter(s => s.child_name === name).length; }

  function goChild(c: Child) {
    router.push({ pathname:'/(tabs)/tutor-child',
      params:{ childId:c.id, childName:c.name, yearLevel:String(c.year_level) } });
  }

  const active = children.filter(c => c.tutor_active);
  const locked = children.filter(c => !c.tutor_active);

  return (
    // ── Same as calendar: SafeAreaView edges top, bg = hero colour ──
    <SafeAreaView style={s.safe} edges={['top']}>
      <RNStatusBar barStyle="light-content" />

      {/* ══════════════════════════════════════════
          HERO — copied exactly from calendar hero
          paddingHorizontal:22  paddingTop:14  paddingBottom:16
      ══════════════════════════════════════════ */}
      <View style={s.hero}>
        {/* Three orbs — same sizes/positions as calendar, gold tint */}
        <View style={s.heroOrbOuter}/>
        <View style={s.heroOrbInner}/>
        <View style={s.heroOrb2}/>

        {/* ── heroRow: logo left | Tutor centred | hamburger right ── */}
        <View style={s.heroRow}>
          {/* Logo — left */}
          <TouchableOpacity
            style={s.logoMark}
            onPress={() => router.replace('/(tabs)/')}
            activeOpacity={0.75}
          >
            <View style={s.logoStarBox}>
              <Text style={s.logoStarTxt}>✦</Text>
            </View>
            <Text style={s.logoWord}>
              {'z'}<Text style={{ color: YELLOW }}>{'a'}</Text>{'el'}<Text style={{ color: YELLOW }}>{'i'}</Text>
            </Text>
          </TouchableOpacity>

          {/* Title — centred middle */}
          <Text style={s.heroTitle}>Tutor</Text>

          {/* Hamburger — right */}
          <HamburgerButton onPress={() => setMenuOpen(true)} />
        </View>

        {/* ── Gold badge ── */}
        <View style={s.goldBadge}>
          <Text style={s.goldBadgeTxt}>✦ PREMIUM · TUTOR</Text>
        </View>

        {/* ── Subtitle ── */}
        <Text style={s.heroSub}>
          Guides thinking. Builds confidence.{'\n'}Never just gives the answer.
        </Text>

        <NavMenu visible={menuOpen} onClose={() => setMenuOpen(false)} />

        {/* ── Toggle — EXACTLY calendar viewTog / vt / vtOn ── */}
        <View style={s.viewTog}>
          {([ ['kids','Your Kids'], ['activity','Activity'], ['settings','Settings'] ] as const).map(
            ([key, label]) => (
              <TouchableOpacity
                key={key}
                style={[s.vt, tab === key && s.vtOn]}
                onPress={() => setTab(key)}
                activeOpacity={0.8}
              >
                <Text style={[s.vtTxt, tab === key && s.vtTxtOn]}>{label}</Text>
              </TouchableOpacity>
            )
          )}
        </View>
      </View>

      {/* ══════════════════════════════════════════
          CONTENT — same bg as calendar content
      ══════════════════════════════════════════ */}
      <View style={s.content}>
        {loading ? (
          <View style={s.loader}>
            <ActivityIndicator size="large" color={T_GOLD} />
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom:60 }}>

            {/* Zaeli noticed — briefCard structure with gold palette */}
            {(noticed !== '' || true) && (
              <View style={s.noticedCard}>
                {/* Header row — ✦ + title, gold tint bg */}
                <View style={s.noticedRow}>
                  <Text style={s.noticedStar}>✦</Text>
                  <Text style={s.noticedTitle}>Zaeli noticed</Text>
                </View>
                <Text style={s.noticedBody}>
                  {noticed !== '' ? noticed : <><Text style={{ fontWeight:'700' }}>Poppy</Text>{' has had 4 sessions this week — her essay structure is really clicking. '}<Text style={{ fontWeight:'700' }}>Gab</Text>{' is showing confidence in multiplication but getting tripped up on remainders — worth a look.'}</>}
                </Text>
              </View>
            )}

            {/* Section label — same as calendar slbl */}
            {active.length > 0 && (
              <Text style={s.slbl}>Your Children</Text>
            )}

            {/* Active child cards */}
            {active.map(child => {
              const wc = weekCount(child.name);
              return (
                <TouchableOpacity
                  key={child.id}
                  style={s.childCard}
                  onPress={() => goChild(child)}
                  activeOpacity={0.76}
                >
                  <View style={s.childTop}>
                    <View style={[s.cAvatar, { backgroundColor: AVBG_MAP[child.name] ?? 'rgba(0,0,0,0.06)' }]}>
                      <Text style={s.cEmoji}>{EMOJI_MAP[child.name] ?? '👤'}</Text>
                    </View>
                    <View style={s.cInfo}>
                      <Text style={s.cName}>{child.name}</Text>
                      <Text style={s.cMeta}>Year {child.year_level} · {getTier(child.year_level)}</Text>
                    </View>
                    <View style={s.activeBadge}>
                      <Text style={s.activeBadgeTxt}>Active ✓</Text>
                    </View>
                  </View>
                  <View style={s.childFoot}>
                    <Text style={s.cLast}>Last session: {lastSessionLabel(child.name)}</Text>
                    {wc >= 2 && <Text style={s.cStreak}>🔥 {wc} day streak</Text>}
                  </View>
                </TouchableOpacity>
              );
            })}

            {/* Locked child cards */}
            {locked.map(child => (
              <View key={child.id} style={s.lockedCard}>
                <View style={s.childTop}>
                  <View style={[s.cAvatar, { backgroundColor: AVBG_MAP[child.name] ?? 'rgba(0,0,0,0.04)' }]}>
                    <Text style={s.cEmoji}>{EMOJI_MAP[child.name] ?? '👤'}</Text>
                  </View>
                  <View style={s.cInfo}>
                    <Text style={[s.cName, { color:'rgba(0,0,0,0.40)' }]}>{child.name}</Text>
                    <Text style={s.cMeta}>Year {child.year_level} · {getTier(child.year_level)}</Text>
                  </View>
                  <Text style={s.lockedLbl}>Locked</Text>
                </View>
                <View style={s.unlockStrip}>
                  <Text style={s.lockIcon}>🔒</Text>
                  <Text style={s.unlockLabel}>Add Tutor for {child.name}</Text>
                  <TouchableOpacity style={s.unlockCta} activeOpacity={0.75}>
                    <Text style={s.unlockCtaTxt}>A$9.99/mo →</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            {children.length === 0 && (
              <View style={s.empty}>
                <Text style={s.emptyIcon}>🎓</Text>
                <Text style={s.emptyTitle}>No children added yet</Text>
                <Text style={s.emptyBody}>Add your children in Our Family → Profiles first.</Text>
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

// ── STYLES ────────────────────────────────────────────────────
const s = StyleSheet.create({

  // ── Copied verbatim from calendar, colour swapped to T_DARK ──
  safe:    { flex:1, backgroundColor: T_DARK },           // calendar: C.mag
  content: { flex:1, backgroundColor: BG },               // calendar: C.bg  (same)

  // calendar hero: backgroundColor:C.mag, paddingHorizontal:22, paddingTop:14, paddingBottom:16, flexShrink:0, position:'relative', overflow:'hidden'
  hero: {
    backgroundColor: T_DARK,
    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: 16,
    flexShrink: 0,
    position: 'relative',
    overflow: 'hidden',
  },

  // calendar heroOrbOuter: width:260, height:260, borderRadius:130, top:-80, right:-60, rgba(255,255,255,0.06)
  heroOrbOuter: {
    position:'absolute', width:260, height:260, borderRadius:130,
    top:-80, right:-60,
    backgroundColor:'rgba(201,168,76,0.07)',   // gold tint instead of white
  },
  // calendar heroOrbInner: width:160, height:160, borderRadius:80, top:-20, right:20, rgba(255,255,255,0.08)
  heroOrbInner: {
    position:'absolute', width:160, height:160, borderRadius:80,
    top:-20, right:20,
    backgroundColor:'rgba(201,168,76,0.09)',
  },
  // calendar heroOrb2: width:100, height:100, borderRadius:50, bottom:10, left:-20, rgba(255,255,255,0.04)
  heroOrb2: {
    position:'absolute', width:100, height:100, borderRadius:50,
    bottom:10, left:-20,
    backgroundColor:'rgba(201,168,76,0.05)',
  },

  // calendar heroRow: flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:12
  heroRow: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:12 },

  // calendar logoMark: flexDirection:'row', alignItems:'center', gap:8
  logoMark: { flexDirection:'row', alignItems:'center', gap:8 },

  // calendar logoStarBox: width:32, height:32, backgroundColor:'rgba(255,255,255,0.2)', borderRadius:10, alignItems/justifyContent center
  logoStarBox: { width:32, height:32, backgroundColor:'rgba(255,255,255,0.2)', borderRadius:10, alignItems:'center', justifyContent:'center' },

  // calendar logoStarTxt: fontSize:17, color:'#fff'
  logoStarTxt: { fontSize:17, color:'#fff' },

  // calendar logoWord: DMSerifDisplay, fontSize:22, color:'#fff', letterSpacing:-0.5
  logoWord: { fontFamily:'DMSerifDisplay_400Regular', fontSize:22, color:'#fff', letterSpacing:-0.5 },

  // heroTitle — absolutely centred across the full heroRow width
  heroTitle: {
    fontFamily:'DMSerifDisplay_400Regular',
    fontSize:34, color:'#fff', letterSpacing:-1,
    position:'absolute', left:0, right:0, textAlign:'center',
  },

  // Gold badge — left-aligned, bigger font
  goldBadge: {
    alignSelf:'flex-start',
    backgroundColor:'rgba(201,168,76,0.18)',
    borderWidth:1, borderColor:'rgba(201,168,76,0.35)',
    borderRadius:20, paddingHorizontal:10, paddingVertical:4,
    marginBottom:14, marginTop:10,
  },
  goldBadgeTxt: {
    fontFamily:'Poppins_700Bold',
    fontSize:11, color:'#C9A84C', letterSpacing:1.2,
    textTransform:'uppercase',
  },

  // Subtitle — left-aligned, bigger font
  heroSub: {
    fontFamily:'Poppins_400Regular',
    fontSize:15, color:'rgba(255,255,255,0.55)',
    lineHeight:22,
    marginBottom:16,
  },

  // calendar viewTog: flexDirection:'row', backgroundColor:'rgba(255,255,255,0.15)', borderRadius:14, padding:4, gap:3, marginBottom:4
  viewTog: { flexDirection:'row', backgroundColor:'rgba(255,255,255,0.15)', borderRadius:14, padding:4, gap:3, marginBottom:4, marginTop:0 },

  // calendar vt: flex:1, paddingVertical:10, borderRadius:11, alignItems:'center'
  vt:    { flex:1, paddingVertical:10, borderRadius:11, alignItems:'center' },
  // calendar vtOn: backgroundColor:'#fff'
  vtOn:  { backgroundColor:'#fff' },
  // calendar vtTxt: Poppins_600SemiBold, fontSize:13, color:'rgba(255,255,255,0.6)'
  vtTxt:   { fontFamily:'Poppins_600SemiBold', fontSize:13, color:'rgba(255,255,255,0.6)' },
  // calendar vtTxtOn: color:C.ink
  vtTxtOn: { color: INK },

  loader: { flex:1, alignItems:'center', justifyContent:'center' },

  // ── Zaeli noticed — briefCard structure, gold palette ──
  noticedCard: {
    marginHorizontal:18, marginTop:14, marginBottom:6,
    backgroundColor:'#fff', borderRadius:20,
    borderWidth:1.5, borderColor:'rgba(201,168,76,0.2)',
    shadowColor:'#C9A84C', shadowOpacity:0.08, shadowRadius:16,
    shadowOffset:{ width:0, height:4 }, elevation:3, overflow:'hidden',
  },
  noticedRow: {
    flexDirection:'row', alignItems:'center', gap:8,
    paddingHorizontal:16, paddingTop:13, paddingBottom:11,
    borderBottomWidth:1, borderBottomColor:'rgba(201,168,76,0.12)',
    backgroundColor:'rgba(201,168,76,0.04)',
  },
  noticedStar:  { fontSize:14, color:'#C9A84C' },
  noticedTitle: { fontFamily:'Poppins_700Bold', fontSize:13, color:'#C9A84C', flex:1 },
  noticedBody:  { fontFamily:'Poppins_400Regular', fontSize:14, color:INK, lineHeight:22, padding:16, paddingTop:13 },

  // ── Section label — same as calendar slbl ──
  slbl: { fontFamily:'Poppins_700Bold', fontSize:10, textTransform:'uppercase', letterSpacing:1.5, color:INK3, paddingHorizontal:22, paddingTop:12, paddingBottom:8 },

  // ── Child cards ──
  childCard: { marginHorizontal:18, marginBottom:12, backgroundColor:CARD, borderRadius:18, borderWidth:1.5, borderColor:BORDER, overflow:'hidden' },
  childTop:  { paddingHorizontal:16, paddingVertical:15, flexDirection:'row', alignItems:'center', gap:12 },
  cAvatar:   { width:46, height:46, borderRadius:14, alignItems:'center', justifyContent:'center', flexShrink:0 },
  cEmoji:    { fontSize:22 },
  cInfo:     { flex:1 },
  cName:     { fontFamily:'Poppins_700Bold', fontSize:17, color:INK, letterSpacing:-0.3 },
  cMeta:     { fontFamily:'Poppins_400Regular', fontSize:13, color:INK2, marginTop:2 },

  // Active badge — green border, clearly visible
  activeBadge:    {
    backgroundColor:'rgba(0,201,122,0.1)',
    borderWidth:1.5, borderColor:'rgba(0,201,122,0.35)',
    paddingHorizontal:11, paddingVertical:5, borderRadius:20,
  },
  activeBadgeTxt: { fontFamily:'Poppins_700Bold', fontSize:12, color:GREEN, textTransform:'uppercase', letterSpacing:0.5 },

  // Footer — stronger divider, larger text
  childFoot: { borderTopWidth:1.5, borderTopColor:'rgba(0,0,0,0.08)', paddingHorizontal:16, paddingVertical:11, flexDirection:'row', justifyContent:'space-between', alignItems:'center' },
  cLast:     { fontFamily:'Poppins_400Regular', fontSize:13, color:INK2 },
  cStreak:   { fontFamily:'Poppins_600SemiBold', fontSize:13, color:ORANGE },

  // ── Locked cards ──
  // Dashed border more visible — rgba(0,0,0,0.18)
  lockedCard:  { marginHorizontal:18, marginBottom:12, backgroundColor:CARD, borderRadius:18, borderWidth:1.5, borderColor:'rgba(0,0,0,0.18)', borderStyle:'dashed', overflow:'hidden', opacity:0.85 },
  // Locked name — medium grey, not fully faded
  lockedLbl:   { fontFamily:'Poppins_400Regular', fontSize:12, color:'rgba(0,0,0,0.35)' },
  // Unlock strip — warmer gold background
  unlockStrip: { paddingHorizontal:16, paddingVertical:13, flexDirection:'row', alignItems:'center', gap:10, backgroundColor:'rgba(201,168,76,0.12)', borderTopWidth:1, borderTopColor:'rgba(201,168,76,0.25)' },
  lockIcon:    { fontSize:16 },
  // .unlock-label: 12px 600 T_DARK flex1
  unlockLabel: { fontFamily:'Poppins_600SemiBold', fontSize:13, color:T_DARK, flex:1 },
  // A$9.99 pill — larger, visible gold border
  unlockCta:   {
    backgroundColor:'rgba(201,168,76,0.15)',
    borderWidth:1.5, borderColor:'rgba(201,168,76,0.4)',
    borderRadius:20, paddingHorizontal:14, paddingVertical:7,
  },
  unlockCtaTxt:{ fontFamily:'Poppins_700Bold', fontSize:12, color:T_GOLD2 },

  // ── Empty state ──
  empty:      { alignItems:'center', paddingTop:60, paddingHorizontal:40 },
  emptyIcon:  { fontSize:48, marginBottom:14 },
  emptyTitle: { fontFamily:'Poppins_700Bold', fontSize:17, color:INK, marginBottom:8 },
  emptyBody:  { fontFamily:'Poppins_400Regular', fontSize:14, color:INK2, textAlign:'center', lineHeight:21 },
});
