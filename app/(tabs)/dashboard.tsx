/**
 * dashboard.tsx — Zaeli Bento Dashboard (v2)
 *
 * Session 31 — Front-door reset per Anna beta feedback + design brief.
 * Old dashboard (Calendar / Meal / Weather+Noticed / Shopping / Radar cards)
 * replaced with the Bento layout: Brief tile · Calendar tile (slate) ·
 * Shopping tile (lavender) with inline quick-add · Weather+Budget bento pair ·
 * Chat tile · coral mic FAB.
 *
 * What still lives elsewhere for this pass:
 *   - swipe-world.tsx still routes / to Chat (index.tsx) — user swipes to
 *     Dashboard to see this. Flipping the default is Phase 02.
 *   - MoreSheet stays wired to the hamburger until Phase 03 (feature hide).
 *   - FAB shows a "voice coming soon" alert — real Sonnet routing is Phase 04.
 *
 * What's live and working:
 *   - Brief tile reads cached brief from zaeli_briefs (falls back gracefully).
 *   - Calendar tile shows next 3 events today.
 *   - Shopping tile shows first 3 unchecked items + INLINE QUICK-ADD row
 *     (direct Supabase insert, no chat, no AI — the Anna fix).
 *   - Budget tile shows month-to-date surplus.
 *   - Weather tile via wttr.in (unchanged).
 *   - Chat tile taps back to Chat home.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  Alert, KeyboardAvoidingView, Platform, Keyboard,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { useFocusEffect, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { getFamilyId } from '../../lib/family';
import { getProfile } from '../../lib/auth';
import { loadRoster, getRoster } from '../../lib/family-roster';
import { loadBudget } from '../../lib/budget';
import { currentWindow } from '../../lib/brief-firing';
import { setPendingChatContext } from '../../lib/navigation-store';
import MoreSheet from '../components/MoreSheet';
import Svg, { Path } from 'react-native-svg';

// ── Design tokens (mirror v2 brief HTML) ─────────────────────────────────
const T = {
  bg:        '#FAF8F5',
  ink:       '#0A0A0A',
  ink2:      'rgba(10,10,10,0.72)',
  ink3:      'rgba(10,10,10,0.48)',
  ink4:      'rgba(10,10,10,0.28)',
  line:      'rgba(10,10,10,0.08)',
  peach:     '#FAC8A8',
  peachTint: '#FDF1E5',
  mint:      '#B8EDD0',
  mintTint:  '#E6F7EF',
  mintDeep:  '#2D7A52',
  lavender:  '#D8CCFF',
  lavTint:   '#F0EBFF',
  lavDeep:   '#5020C0',
  sky:       '#A8D8F0',
  skyTint:   '#E8F4FD',
  skyDeep:   '#0A5C80',
  coral:     '#FF4545',
  slate:     '#2D3748',
  peachBrown:'#8A3A00',
  // family colours
  anna:      '#FF7B6B',
  rich:      '#4D8BFF',
  poppy:     '#A855F7',
  gab:       '#22C55E',
  duke:      '#F59E0B',
};

// ── Weather API config (unchanged from v1 dashboard) ────────────────────
const WEATHER_LAT = -26.39;
const WEATHER_LON = 153.03;

// ── Helpers ──────────────────────────────────────────────────────────────
function pad(n: number): string { return String(n).padStart(2, '0'); }
function localDateStr(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function fmtTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const t = iso.split('T')[1] || '';
  const [h, m] = t.split(':');
  if (!h) return '';
  const H = parseInt(h, 10);
  const hh12 = H === 0 ? 12 : H > 12 ? H - 12 : H;
  const ampm = H >= 12 ? 'pm' : 'am';
  return `${hh12}:${m ?? '00'} ${ampm}`;
}
function firstName(full?: string | null): string {
  if (!full) return 'you';
  return full.split(/\s+/)[0] || 'you';
}

// ── Types ────────────────────────────────────────────────────────────────
interface EventLite {
  id: string;
  title: string;
  date: string;
  start_time: string | null;
  assignees: string[] | null;
}
interface ShopItem {
  id: string;
  name: string;
}
interface BriefRow {
  brief_text: string;
  chips: any[];
  time_window: string;
}

// ── Component ────────────────────────────────────────────────────────────
export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // Roster load — bump version to re-render tiles once family_members hydrates.
  const [, setRosterVersion] = useState(0);
  useEffect(() => {
    loadRoster(getFamilyId()).then(() => setRosterVersion(v => v + 1));
  }, []);

  // Brief (cached read from zaeli_briefs — no Sonnet call from this screen)
  const [brief, setBrief] = useState<BriefRow | null>(null);
  const [briefDismissed, setBriefDismissed] = useState(false);

  // Calendar
  const [todayEvents, setTodayEvents] = useState<EventLite[]>([]);
  const [eventCountToday, setEventCountToday] = useState(0);

  // Shopping
  const [shopItems, setShopItems] = useState<ShopItem[]>([]);
  const [shopCount, setShopCount] = useState(0);
  const [shopQuickAdd, setShopQuickAdd] = useState('');
  const [shopJustAdded, setShopJustAdded] = useState<string | null>(null);

  // Budget
  const [budgetSurplus, setBudgetSurplus] = useState<number | null>(null);
  const [budgetCategoryLead, setBudgetCategoryLead] = useState<string>('');

  // Weather
  const [weather, setWeather] = useState<{ temp: number; cond: string } | null>(null);

  // Zaeli Noticed (kept, but simplified — reads from insights if present)
  const [noticed, setNoticed] = useState<string | null>(null);

  // MoreSheet — hamburger destination (temporary until Phase 03)
  const [moreOpen, setMoreOpen] = useState(false);

  // ── Data loaders ───────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    const today = localDateStr();
    const fid = getFamilyId();

    // Parallel fetches
    const [evRes, shopRes, briefRes, insightsRes] = await Promise.all([
      supabase.from('events')
        .select('id,title,date,start_time,assignees')
        .eq('family_id', fid).eq('date', today)
        .order('start_time').limit(6),
      supabase.from('shopping_items')
        .select('id,name')
        .eq('family_id', fid).neq('checked', true)
        .order('created_at', { ascending: false }).limit(50),
      supabase.from('zaeli_briefs')
        .select('brief_text,chips,time_window,generated_at')
        .eq('family_id', fid).eq('date_key', today)
        .eq('time_window', currentWindow(new Date()))
        .order('generated_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('family_insights')
        .select('insight')
        .eq('family_id', fid)
        .in('category', ['pattern', 'preference'])
        .gte('confidence', 0.6)
        .order('confidence', { ascending: false }).limit(1).maybeSingle(),
    ]);

    setTodayEvents((evRes.data ?? []).slice(0, 3));
    setEventCountToday((evRes.data ?? []).length);
    setShopItems((shopRes.data ?? []).slice(0, 3));
    setShopCount((shopRes.data ?? []).length);
    if (briefRes.data) setBrief(briefRes.data as BriefRow);
    if (insightsRes.data) setNoticed((insightsRes.data as any).insight);

    // Budget — read Supabase, compute surplus
    try {
      const bud = await loadBudget(fid);
      const income = (bud.incomeStreams || []).reduce((s: number, i: any) => s + (Number(i.amount) || 0), 0);
      const catPlanned = (bud.categories || []).reduce((s: number, c: any) => {
        if (c.type === 'variable') return s + (Number(c.monthly_target) || 0);
        return s + (c.line_items || []).reduce((ls: number, li: any) => ls + (Number(li.monthly_amount) || 0), 0);
      }, 0);
      setBudgetSurplus(income - catPlanned);
      // Pick the highest-target category name to show as a preview line
      const topCat = (bud.categories || []).sort((a: any, b: any) => {
        const at = a.type === 'variable' ? Number(a.monthly_target) || 0 : (a.line_items || []).reduce((s: number, li: any) => s + (Number(li.monthly_amount) || 0), 0);
        const bt = b.type === 'variable' ? Number(b.monthly_target) || 0 : (b.line_items || []).reduce((s: number, li: any) => s + (Number(li.monthly_amount) || 0), 0);
        return bt - at;
      })[0];
      if (topCat) setBudgetCategoryLead(topCat.name || '');
    } catch { /* budget failure is non-fatal for the dashboard */ }
  }, []);

  const loadWeather = useCallback(async () => {
    try {
      const res = await fetch(`https://wttr.in/${WEATHER_LAT},${WEATHER_LON}?format=j1`);
      if (!res.ok) return;
      const json = await res.json();
      const now = json?.current_condition?.[0];
      if (now) {
        const temp = parseInt(now.temp_C, 10);
        const cond = (now.weatherDesc?.[0]?.value || '').trim() || 'Clear';
        if (!isNaN(temp)) setWeather({ temp, cond });
      }
    } catch { /* weather is optional */ }
  }, []);

  useEffect(() => {
    loadData();
    loadWeather();
  }, [loadData, loadWeather]);

  useFocusEffect(useCallback(() => {
    loadData();
  }, [loadData]));

  // ── Actions ────────────────────────────────────────────────────────────
  const handleShopSubmit = useCallback(async () => {
    const raw = shopQuickAdd.trim();
    if (!raw) return;
    const itemName = raw.charAt(0).toUpperCase() + raw.slice(1);
    setShopQuickAdd('');
    // Optimistic add
    const optimisticId = `tmp-${Date.now()}`;
    setShopItems(prev => [{ id: optimisticId, name: itemName }, ...prev].slice(0, 3));
    setShopCount(c => c + 1);
    setShopJustAdded(itemName);
    // Real insert
    try {
      const { data, error } = await supabase.from('shopping_items').insert({
        family_id: getFamilyId(),
        name: itemName,
        item: itemName,
        checked: false,
      }).select('id').maybeSingle();
      if (error || !data?.id) {
        setShopItems(prev => prev.filter(s => s.id !== optimisticId));
        setShopCount(c => Math.max(0, c - 1));
        Alert.alert('Add failed', error?.message ?? 'Try again?');
        return;
      }
      // Replace optimistic id with real
      setShopItems(prev => prev.map(s => s.id === optimisticId ? { ...s, id: data.id! } : s));
    } catch (e: any) {
      setShopItems(prev => prev.filter(s => s.id !== optimisticId));
      setShopCount(c => Math.max(0, c - 1));
      Alert.alert('Add failed', e?.message ?? 'Something went wrong.');
    }
    // Clear the "just added" flash after 2s
    setTimeout(() => setShopJustAdded(null), 2000);
    Keyboard.dismiss();
  }, [shopQuickAdd]);

  const openCalendarSheet = useCallback(() => {
    setPendingChatContext({ type: 'calendar_view', returnTo: 'dashboard' } as any);
    router.navigate('/(tabs)');
  }, [router]);

  const openShoppingSheet = useCallback(() => {
    setPendingChatContext({ type: 'shopping_sheet', returnTo: 'dashboard' } as any);
    router.navigate('/(tabs)');
  }, [router]);

  const openBudget = useCallback(() => {
    router.navigate('/(tabs)/our-budget');
  }, [router]);

  const openChat = useCallback(() => {
    // Swipe-world lands on Chat by default — nav to root sends us there.
    router.navigate('/(tabs)');
  }, [router]);

  const openBriefInChat = useCallback(() => {
    // For this pass, tapping "Open chat" from the brief just routes to Chat
    // where the brief fires as normal. Real "expand-brief-in-sheet" wiring
    // comes with the ChatSheet extraction (later phase).
    setBriefDismissed(true);
    router.navigate('/(tabs)');
  }, [router]);

  const handleFabTap = useCallback(() => {
    Alert.alert(
      'Voice coming soon',
      'The mic FAB will let you add anything by voice. Wiring lands in a future build.',
    );
  }, []);

  // ── Derived / display ──────────────────────────────────────────────────
  const roster = getRoster();
  const memberById = (id: string) => roster.find(m => m.id === id);
  const primaryName = firstName(getProfile()?.name);

  const briefWindowLabel = brief?.time_window === 'evening' ? '🌙 EVENING' : '☀ MORNING';
  const isBriefEvening = brief?.time_window === 'evening';
  const briefPillBg = isBriefEvening ? T.lavender : T.peach;
  const briefPillColor = isBriefEvening ? T.lavDeep : T.peachBrown;
  const briefTileBg = isBriefEvening ? T.lavTint : T.peachTint;

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: T.bg }} edges={['top']}>
      <ExpoStatusBar style="dark"/>

      {/* Header — wordmark + hamburger */}
      <View style={s.hdr}>
        <Text style={s.wordmark}>
          z<Text style={s.aa}>a</Text>el<Text style={s.aa}>i</Text>
        </Text>
        <TouchableOpacity
          style={s.ham}
          onPress={() => setMoreOpen(true)}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <View style={s.hamLine}/>
          <View style={s.hamLine}/>
          <View style={s.hamLine}/>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 14, paddingBottom: 120 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* ── BRIEF TILE ─────────────────────────────────────────────── */}
          {brief && !briefDismissed && (
            <View style={[s.tile, { backgroundColor: briefTileBg, borderColor: 'transparent' }]}>
              <View style={[s.pill, { backgroundColor: briefPillBg }]}>
                <Text style={[s.pillTxt, { color: briefPillColor }]}>{briefWindowLabel}</Text>
              </View>
              <Text style={s.briefTxt}>{brief.brief_text}</Text>
              <View style={s.chipRow}>
                <TouchableOpacity style={[s.chip, s.chipPrimary]} onPress={openBriefInChat} activeOpacity={0.7}>
                  <Text style={s.chipTxt}>Open chat</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.chip} onPress={() => setBriefDismissed(true)} activeOpacity={0.7}>
                  <Text style={s.chipTxt}>Got it</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* If no brief yet, show a warm placeholder rather than empty space */}
          {!brief && !briefDismissed && (
            <View style={[s.tile, { backgroundColor: T.peachTint, borderColor: 'transparent' }]}>
              <View style={[s.pill, { backgroundColor: T.peach }]}>
                <Text style={[s.pillTxt, { color: T.peachBrown }]}>☀ MORNING</Text>
              </View>
              <Text style={s.briefTxt}>
                Morning {primaryName} — opening chat will kick off today's brief.
              </Text>
              <View style={s.chipRow}>
                <TouchableOpacity style={[s.chip, s.chipPrimary]} onPress={openChat} activeOpacity={0.7}>
                  <Text style={s.chipTxt}>Open chat</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ── CALENDAR TILE (slate) ──────────────────────────────────── */}
          <TouchableOpacity
            style={[s.tile, { backgroundColor: T.slate, borderColor: 'transparent' }]}
            onPress={openCalendarSheet} activeOpacity={0.85}
          >
            <View style={s.tileHead}>
              <Text style={[s.tileEyebrow, { color: 'rgba(255,255,255,0.6)' }]}>📅 TODAY'S CALENDAR</Text>
              <Text style={[s.tileMeta, { color: 'rgba(255,255,255,0.5)' }]}>
                {eventCountToday === 0 ? 'nothing on' : `${eventCountToday} event${eventCountToday === 1 ? '' : 's'}`}
              </Text>
            </View>
            {todayEvents.length === 0 ? (
              <Text style={[s.emptyRow, { color: 'rgba(255,255,255,0.6)' }]}>Rare quiet day — enjoy it.</Text>
            ) : (
              todayEvents.map(ev => {
                const mem = memberById((ev.assignees ?? [])[0] ?? '');
                const c = mem?.color ?? T.rich;
                const initial = (mem?.name ?? '?').charAt(0).toUpperCase();
                return (
                  <View key={ev.id} style={s.calRow}>
                    <Text style={[s.calTime, { color: '#fff' }]}>{fmtTime(ev.start_time) || 'all day'}</Text>
                    <View style={[s.calDot, { backgroundColor: c }]}/>
                    <Text style={[s.calTitle, { color: 'rgba(255,255,255,0.9)' }]} numberOfLines={1}>{ev.title}</Text>
                    <View style={[s.avat, { backgroundColor: c }]}>
                      <Text style={s.avatTxt}>{initial}</Text>
                    </View>
                  </View>
                );
              })
            )}
            <View style={[s.quickAdd, { backgroundColor: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.15)' }]}>
              <Text style={[s.quickPlus, { color: T.coral }]}>+</Text>
              <Text style={[s.quickField, { color: 'rgba(255,255,255,0.65)' }]}>Add event…</Text>
            </View>
          </TouchableOpacity>

          {/* ── SHOPPING TILE (lavender) ─ THE ANNA FIX ───────────────── */}
          <TouchableOpacity
            style={[s.tile, { backgroundColor: T.lavender, borderColor: 'transparent' }]}
            onPress={openShoppingSheet} activeOpacity={0.85}
          >
            <View style={s.tileHead}>
              <Text style={[s.tileEyebrow, { color: T.lavDeep }]}>🛒 SHOPPING</Text>
              <Text style={[s.tileMeta, { color: T.lavDeep, opacity: 0.65 }]}>
                {shopCount} item{shopCount === 1 ? '' : 's'}
              </Text>
            </View>
            {shopItems.length === 0 ? (
              <Text style={[s.emptyRow, { color: T.lavDeep, opacity: 0.6 }]}>List's empty — add something below.</Text>
            ) : (
              shopItems.map(it => (
                <View key={it.id} style={s.shopRow}>
                  <View style={[s.bullet, { backgroundColor: T.lavDeep, opacity: 0.4 }]}/>
                  <Text style={[s.shopTxt, { color: T.ink }]} numberOfLines={1}>{it.name}</Text>
                </View>
              ))
            )}
            {/* Inline quick-add — the Anna fix. Direct Supabase insert, no AI. */}
            <View
              onStartShouldSetResponder={() => true}
              style={[s.quickAdd, { backgroundColor: '#fff', borderColor: T.lavDeep, borderWidth: 1.5 }]}
            >
              <Text style={[s.quickPlus, { color: T.coral }]}>+</Text>
              <TextInput
                value={shopQuickAdd}
                onChangeText={setShopQuickAdd}
                onSubmitEditing={handleShopSubmit}
                placeholder="Add item… (tap Enter)"
                placeholderTextColor={T.ink3}
                returnKeyType="done"
                style={s.quickInput}
                blurOnSubmit={false}
              />
              {shopQuickAdd.trim() ? (
                <TouchableOpacity onPress={handleShopSubmit} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <View style={s.enterKey}>
                    <Text style={s.enterTxt}>⏎</Text>
                  </View>
                </TouchableOpacity>
              ) : null}
            </View>
            {shopJustAdded && (
              <Text style={{ fontSize: 11, color: T.mintDeep, fontWeight: '700', marginTop: 8, letterSpacing: 0.4 }}>
                ✓ ADDED {shopJustAdded.toUpperCase()}
              </Text>
            )}
          </TouchableOpacity>

          {/* ── BENTO PAIR — Weather + Budget ─────────────────────────── */}
          <View style={s.bentoPair}>
            {/* Weather */}
            <View style={[s.tileMini, { backgroundColor: T.skyTint }]}>
              <Text style={[s.miniEyebrow, { color: T.skyDeep }]}>WEATHER</Text>
              {weather ? (
                <>
                  <Text style={[s.miniPrimary, { color: T.ink }]}>{weather.temp}°</Text>
                  <Text style={[s.miniSub, { color: T.ink2 }]} numberOfLines={1}>{weather.cond}</Text>
                </>
              ) : (
                <Text style={[s.miniSub, { color: T.ink3, marginTop: 8 }]}>loading…</Text>
              )}
            </View>
            {/* Budget */}
            <TouchableOpacity
              style={[s.tileMini, { backgroundColor: T.mintTint, flex: 1.5 }]}
              onPress={openBudget} activeOpacity={0.85}
            >
              <Text style={[s.miniEyebrow, { color: T.mintDeep }]}>💰 BUDGET</Text>
              {budgetSurplus !== null ? (
                <>
                  <Text style={[s.miniPrimary, { color: T.mintDeep }]} numberOfLines={1}>
                    A${Math.abs(Math.round(budgetSurplus)).toLocaleString('en-AU')} {budgetSurplus < 0 ? 'over' : 'left'}
                  </Text>
                  <Text style={[s.miniSub, { color: T.ink2 }]} numberOfLines={1}>
                    {budgetCategoryLead ? `Top: ${budgetCategoryLead}` : 'This month'}
                  </Text>
                </>
              ) : (
                <Text style={[s.miniSub, { color: T.ink3, marginTop: 8 }]}>Tap to set up</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* ── ZAELI NOTICED (if we have an insight) ─────────────────── */}
          {noticed && (
            <View style={[s.tile, { backgroundColor: T.peachTint, borderColor: 'transparent' }]}>
              <Text style={[s.tileEyebrow, { color: T.peachBrown }]}>✨ ZAELI NOTICED</Text>
              <Text style={[s.briefTxt, { marginTop: 2 }]}>{noticed}</Text>
            </View>
          )}

          {/* ── CHAT TILE ─────────────────────────────────────────────── */}
          <TouchableOpacity
            style={[s.tile, s.tileChat]}
            onPress={openChat} activeOpacity={0.85}
          >
            <View style={s.tileHead}>
              <Text style={[s.tileEyebrow, { color: T.skyDeep }]}>💬 CHAT WITH ZAELI</Text>
            </View>
            <Text style={[s.chatLast, { color: T.ink3 }]}>
              Ask her anything — she remembers.
            </Text>
            <View style={s.chatCtaRow}>
              <View style={s.chatDot}/>
              <Text style={[s.chatCta, { color: T.skyDeep }]}>Open chat →</Text>
            </View>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── FAB (mic) — placeholder for Phase 04 voice wiring ─────────── */}
      <TouchableOpacity
        style={[s.fab, { bottom: 20 + Math.max(0, insets.bottom - 8) }]}
        onPress={handleFabTap}
        activeOpacity={0.85}
      >
        <Svg width={26} height={26} viewBox="0 0 24 24">
          <Path
            d="M12 14a3 3 0 003-3V5a3 3 0 00-6 0v6a3 3 0 003 3z"
            fill="#fff"
          />
          <Path
            d="M19 11a1 1 0 00-2 0 5 5 0 01-10 0 1 1 0 00-2 0 7 7 0 006 6.93V21a1 1 0 002 0v-3.07A7 7 0 0019 11z"
            fill="#fff"
          />
        </Svg>
      </TouchableOpacity>

      {/* MoreSheet — hamburger destination (temporary until Phase 03) */}
      <MoreSheet
        visible={moreOpen}
        onClose={() => setMoreOpen(false)}
      />

    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  // Header
  hdr: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: T.line,
  },
  wordmark: {
    fontFamily: 'Poppins_800ExtraBold', fontSize: 40,
    letterSpacing: -1.5, lineHeight: 46, color: T.ink,
  },
  aa: { color: T.sky },
  ham: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: 'rgba(10,10,10,0.05)',
    alignItems: 'center', justifyContent: 'center',
    gap: 4,
  },
  hamLine: { width: 18, height: 2.2, backgroundColor: T.ink, borderRadius: 1 },

  // Tile shared
  tile: {
    backgroundColor: '#fff',
    borderRadius: 22, padding: 18, marginBottom: 12,
    borderWidth: 1, borderColor: T.line,
  },
  tileHead: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 8,
  },
  tileEyebrow: {
    fontFamily: 'Poppins_700Bold', fontSize: 11,
    letterSpacing: 0.8, color: T.ink3,
  },
  tileMeta: {
    fontFamily: 'Poppins_600SemiBold', fontSize: 11,
    letterSpacing: 0.4, color: T.ink3,
  },
  emptyRow: {
    fontSize: 14, color: T.ink3, marginTop: 6, marginBottom: 6,
  },

  // Brief tile
  pill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 12, marginBottom: 10,
  },
  pillTxt: {
    fontFamily: 'Poppins_700Bold', fontSize: 10, letterSpacing: 0.8,
  },
  briefTxt: {
    fontSize: 15, lineHeight: 22, color: T.ink,
    marginBottom: 12,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: 'rgba(255,255,255,0.7)', borderWidth: 1, borderColor: 'rgba(10,10,10,0.08)',
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
  },
  chipPrimary: { backgroundColor: '#fff' },
  chipTxt: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: T.ink },

  // Calendar rows
  calRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 5,
  },
  calTime: {
    fontFamily: 'Poppins_600SemiBold', fontSize: 12, minWidth: 62,
  },
  calDot: { width: 8, height: 8, borderRadius: 4 },
  calTitle: { flex: 1, fontSize: 13, fontWeight: '500' },
  avat: {
    width: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
  },
  avatTxt: {
    fontFamily: 'Poppins_700Bold', fontSize: 10, color: '#fff',
  },

  // Shopping rows
  shopRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 3,
  },
  bullet: { width: 4, height: 4, borderRadius: 2 },
  shopTxt: { fontSize: 13, flex: 1 },

  // Quick-add row
  quickAdd: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: T.bg, borderWidth: 1, borderColor: T.line,
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
    marginTop: 10,
  },
  quickPlus: {
    fontFamily: 'Poppins_800ExtraBold', fontSize: 18, color: T.coral,
  },
  quickField: { fontSize: 13, color: T.ink3, flex: 1 },
  quickInput: {
    flex: 1, fontSize: 14, color: T.ink,
    paddingVertical: 0, // strip iOS default input padding
    fontFamily: 'Poppins_400Regular',
  },
  enterKey: {
    backgroundColor: 'rgba(10,10,10,0.06)',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
  },
  enterTxt: { fontSize: 12, color: T.ink3, fontWeight: '600' },

  // Bento pair
  bentoPair: {
    flexDirection: 'row', gap: 10, marginBottom: 12,
  },
  tileMini: {
    flex: 1, backgroundColor: T.skyTint,
    borderRadius: 18, padding: 14,
    borderWidth: 1, borderColor: 'transparent',
  },
  miniEyebrow: {
    fontFamily: 'Poppins_700Bold', fontSize: 10,
    letterSpacing: 0.6, marginBottom: 6,
  },
  miniPrimary: {
    fontFamily: 'Poppins_800ExtraBold', fontSize: 24, lineHeight: 26,
  },
  miniSub: { fontSize: 11, marginTop: 4 },

  // Chat tile
  tileChat: {
    backgroundColor: T.skyTint,
    borderColor: 'transparent',
  },
  chatLast: {
    fontSize: 13, fontStyle: 'italic', marginBottom: 10,
  },
  chatCtaRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  chatDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: T.mintDeep,
  },
  chatCta: {
    fontFamily: 'Poppins_700Bold', fontSize: 13,
  },

  // FAB
  fab: {
    position: 'absolute', right: 20,
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: T.coral,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: T.coral,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4, shadowRadius: 16,
    elevation: 8,
  },
});
