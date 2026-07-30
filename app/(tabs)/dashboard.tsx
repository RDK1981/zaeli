/**
 * dashboard.tsx — Zaeli Bento Dashboard v2 (Phase 04a)
 *
 * Session 32 — v2 workshop results shipped.
 *
 * Changes from Phase 01 (Session 31):
 *   - Brief tile REMOVED (moves to Chat sheet + server-side lockscreen push)
 *   - Weather tile REMOVED (iOS has this natively)
 *   - Zaeli Noticed tile REMOVED (data still fuels chat context, no dedicated tile)
 *   - Chat tile REMOVED (universal chat bar at bottom replaces it)
 *   - Coral mic FAB REMOVED (chat bar has mic now)
 *   - Budget tile REDESIGNED — minimal, no financial numbers on the front door
 *     per Rich's call ("A$0 left is a downer every open")
 *   - UNIVERSAL CHAT BAR added at bottom — mic, text, camera, send. Any tap
 *     navigates to Chat page (real mic/camera routing lands in Phase 04c)
 *   - Font sizes bumped to match today's chat + dashboard (17px brief body
 *     equivalents in chat, 15px event/shop rows, 13px eyebrows, 24px avatars)
 *
 * What's NOT in this pass yet (later phases):
 *   - Reminders tile (Phase 05 — needs new subsystem)
 *   - Swipe-world page order swap + dots removed (Phase 04b, next commit)
 *   - Chat bar mic actually starts recording (Phase 04c — for now, taps
 *     navigate to Chat)
 *   - Notify chip on every add (Phase 06)
 *   - Server-side brief scheduler (Phase 07)
 *   - Budget expense flat model (Phase 08)
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
import { setPendingChatContext, setChatIntent } from '../../lib/navigation-store';
import Svg, { Path, Rect, Circle, Line, Polyline } from 'react-native-svg';

// ── Design tokens ────────────────────────────────────────────────────────
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
  gold:      '#F0DC80',
  goldTint:  '#FBF5D6',
  goldDeep:  '#8B6914',
  coral:     '#FF4545',
  slate:     '#2D3748',
  anna:      '#FF7B6B',
  rich:      '#4D8BFF',
  poppy:     '#A855F7',
  gab:       '#22C55E',
  duke:      '#F59E0B',
};

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

// ── SVG icons — matching those in index.tsx for visual continuity ──────
function IcoMic({ color = T.ink, size = 22 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 26" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <Rect x="9" y="2" width="6" height="11" rx="3"/>
      <Path d="M5 10a7 7 0 0014 0"/>
      <Line x1="12" y1="19" x2="12" y2="23"/>
      <Line x1="8" y1="23" x2="16" y2="23"/>
    </Svg>
  );
}
function IcoCamera({ color = T.coral, size = 22 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
      <Circle cx="12" cy="13" r="4"/>
    </Svg>
  );
}
function IcoSend({ color = '#fff', size = 18 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <Line x1="12" y1="19" x2="12" y2="5"/>
      <Polyline points="5 12 12 5 19 12"/>
    </Svg>
  );
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

// ── Props (optional — SwipeWorld passes navigation callbacks) ──────────
interface DashboardProps {
  onNavigateChat?: () => void;
  onNavigateMySpace?: () => void;
  isActive?: boolean;
  onContextTrigger?: () => void;
}

// ── Component ────────────────────────────────────────────────────────────
export default function DashboardScreen({
  onNavigateChat,
  isActive = true,
  onContextTrigger,
}: DashboardProps = {}) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // Roster load — bump version to re-render tiles once family_members hydrates.
  const [, setRosterVersion] = useState(0);
  useEffect(() => {
    loadRoster(getFamilyId()).then(() => setRosterVersion(v => v + 1));
  }, []);

  // Calendar
  const [todayEvents, setTodayEvents] = useState<EventLite[]>([]);
  const [eventCountToday, setEventCountToday] = useState(0);

  // Shopping
  const [shopItems, setShopItems] = useState<ShopItem[]>([]);
  const [shopCount, setShopCount] = useState(0);
  const [shopQuickAdd, setShopQuickAdd] = useState('');
  const [shopJustAdded, setShopJustAdded] = useState<string | null>(null);

  // Reminders (Session 32 v2 Phase 05)
  const [remindItems, setRemindItems] = useState<{ id: string; title: string; whenLabel: string; isMe: boolean }[]>([]);
  const [remindCount, setRemindCount] = useState(0);

  // ── Data loaders — leaner than Phase 01, only what tiles need ─────────
  const loadData = useCallback(async () => {
    const today = localDateStr();
    const fid = getFamilyId();
    const myId = getProfile()?.id;

    const [evRes, shopRes, remRes] = await Promise.all([
      supabase.from('events')
        .select('id,title,date,start_time,assignees')
        .eq('family_id', fid).eq('date', today)
        .order('start_time').limit(6),
      supabase.from('shopping_items')
        .select('id,name')
        .eq('family_id', fid).neq('checked', true)
        .order('created_at', { ascending: false }).limit(50),
      supabase.from('reminders')
        .select('id,title,remind_at,remind_on,created_by,status')
        .eq('family_id', fid).eq('status', 'active')
        .order('remind_at', { ascending: true, nullsFirst: false })
        .order('remind_on', { ascending: true, nullsFirst: false })
        .limit(20),
    ]);

    setTodayEvents((evRes.data ?? []).slice(0, 3));
    setEventCountToday((evRes.data ?? []).length);
    setShopItems((shopRes.data ?? []).slice(0, 3));
    setShopCount((shopRes.data ?? []).length);

    const rems = (remRes.data ?? []).map((r: any) => {
      let whenLabel = 'someday';
      if (r.remind_at) {
        const d = new Date(r.remind_at);
        const dToday = new Date(); dToday.setHours(0,0,0,0);
        const dTmw   = new Date(dToday.getTime() + 24*3600*1000);
        const dayOfR = new Date(d); dayOfR.setHours(0,0,0,0);
        const hh     = d.getHours(); const mm = d.getMinutes();
        const tstr   = `${((hh+11)%12+1)}${mm ? ':' + String(mm).padStart(2,'0') : ''}${hh<12?'am':'pm'}`;
        if (dayOfR.getTime() === dToday.getTime()) whenLabel = tstr;
        else if (dayOfR.getTime() === dTmw.getTime()) whenLabel = `tmw ${tstr}`;
        else whenLabel = `${d.toLocaleDateString('en-AU',{ weekday:'short' })} ${tstr}`;
      } else if (r.remind_on) {
        const d = new Date(r.remind_on + 'T00:00:00');
        whenLabel = d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric' });
      }
      return { id: r.id, title: r.title, whenLabel, isMe: r.created_by === myId };
    });
    setRemindItems(rems.slice(0, 3));
    setRemindCount(rems.length);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));
  useEffect(() => { if (isActive) loadData(); }, [isActive, loadData]);

  // ── Shopping quick-add (unchanged from Phase 01) ──────────────────────
  const handleShopSubmit = useCallback(async () => {
    const raw = shopQuickAdd.trim();
    if (!raw) return;
    const itemName = raw.charAt(0).toUpperCase() + raw.slice(1);
    setShopQuickAdd('');
    const optimisticId = `tmp-${Date.now()}`;
    setShopItems(prev => [{ id: optimisticId, name: itemName }, ...prev].slice(0, 3));
    setShopCount(c => c + 1);
    setShopJustAdded(itemName);
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
      setShopItems(prev => prev.map(s => s.id === optimisticId ? { ...s, id: data.id! } : s));
    } catch (e: any) {
      setShopItems(prev => prev.filter(s => s.id !== optimisticId));
      setShopCount(c => Math.max(0, c - 1));
      Alert.alert('Add failed', e?.message ?? 'Something went wrong.');
    }
    setTimeout(() => setShopJustAdded(null), 2000);
    Keyboard.dismiss();
  }, [shopQuickAdd]);

  // ── Navigation ─────────────────────────────────────────────────────────
  const openCalendarSheet = useCallback(() => {
    setPendingChatContext({ type: 'calendar_view', returnTo: 'dashboard' } as any);
    onContextTrigger?.();
    if (onNavigateChat) { onNavigateChat(); return; }
    router.navigate('/(tabs)');
  }, [router, onNavigateChat, onContextTrigger]);

  const openShoppingSheet = useCallback(() => {
    setPendingChatContext({ type: 'shopping_sheet', returnTo: 'dashboard' } as any);
    onContextTrigger?.();
    if (onNavigateChat) { onNavigateChat(); return; }
    router.navigate('/(tabs)');
  }, [router, onNavigateChat, onContextTrigger]);

  const openBudget = useCallback(() => {
    router.navigate('/(tabs)/our-budget');
  }, [router]);

  // Session 32 v2 Phase 05 — Reminders sheet lives in Chat (index.tsx)
  // to reuse the 92% Modal + KAV infrastructure. Same pattern as Shopping.
  const openRemindersSheet = useCallback(() => {
    setPendingChatContext({ type: 'reminders_sheet', returnTo: 'dashboard' } as any);
    onContextTrigger?.();
    if (onNavigateChat) { onNavigateChat(); return; }
    router.navigate('/(tabs)');
  }, [router, onNavigateChat, onContextTrigger]);

  const openChat = useCallback(() => {
    if (onNavigateChat) { onNavigateChat(); return; }
    router.navigate('/(tabs)');
  }, [router, onNavigateChat]);

  // ── Per-icon chat bar routing (Session 32 v2 Phase 04c) ────────────────
  // Set an intent flag so Chat can act on activation. The chat bar on
  // Dashboard is a fast-lane — tap mic and you get straight to recording;
  // tap camera and you get straight to the picker. No extra step.
  const openChatMic = useCallback(() => {
    setChatIntent({ kind: 'mic' });
    openChat();
  }, [openChat]);

  const openChatCamera = useCallback(() => {
    setChatIntent({ kind: 'camera' });
    openChat();
  }, [openChat]);

  const openChatFocus = useCallback(() => {
    setChatIntent({ kind: 'focus' });
    openChat();
  }, [openChat]);

  // ── Derived ────────────────────────────────────────────────────────────
  const roster = getRoster();
  const memberById = (id: string) => roster.find(m => m.id === id);

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: T.bg }} edges={['top']}>
      <ExpoStatusBar style="dark"/>

      {/* Header — wordmark + hamburger (Session 31 — directly to Settings) */}
      <View style={s.hdr}>
        <Text style={s.wordmark}>
          z<Text style={s.aa}>a</Text>el<Text style={s.aa}>i</Text>
        </Text>
        <TouchableOpacity
          style={s.ham}
          onPress={() => router.navigate('/(tabs)/settings')}
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

          {/* ── CALENDAR TILE (slate) ──────────────────────────────────── */}
          <TouchableOpacity
            style={[s.tile, { backgroundColor: T.slate, borderColor: 'transparent' }]}
            onPress={openCalendarSheet} activeOpacity={0.85}
          >
            <View style={s.tileHead}>
              <Text style={[s.tileEyebrow, { color: 'rgba(255,255,255,0.7)' }]}>📅 TODAY'S CALENDAR</Text>
              <Text style={[s.tileMeta, { color: 'rgba(255,255,255,0.55)' }]}>
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
                    <Text style={[s.calTitle, { color: 'rgba(255,255,255,0.92)' }]} numberOfLines={1}>{ev.title}</Text>
                    <View style={[s.avat, { backgroundColor: c }]}>
                      <Text style={s.avatTxt}>{initial}</Text>
                    </View>
                  </View>
                );
              })
            )}
            <View style={[s.quickAdd, { backgroundColor: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.18)' }]}>
              <Text style={[s.quickPlus, { color: T.coral }]}>+</Text>
              <Text style={[s.quickField, { color: 'rgba(255,255,255,0.7)' }]}>Add event…</Text>
            </View>
          </TouchableOpacity>

          {/* ── SHOPPING TILE (lavender) — Anna's speed fix ────────────── */}
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
              <Text style={{ fontSize: 12, color: T.mintDeep, fontWeight: '700', marginTop: 8, letterSpacing: 0.4 }}>
                ✓ ADDED {shopJustAdded.toUpperCase()}
              </Text>
            )}
          </TouchableOpacity>

          {/* ── REMINDERS TILE (gold) — Session 32 v2 Phase 05 ─────────── */}
          <TouchableOpacity
            style={[s.tile, { backgroundColor: T.goldTint, borderColor: 'transparent' }]}
            onPress={openRemindersSheet} activeOpacity={0.85}
          >
            <View style={s.tileHead}>
              <Text style={[s.tileEyebrow, { color: T.goldDeep }]}>⏰ REMINDERS</Text>
              <Text style={[s.tileMeta, { color: T.goldDeep, opacity: 0.65 }]}>
                {remindCount === 0 ? 'none' : `${remindCount} up next`}
              </Text>
            </View>
            {remindItems.length === 0 ? (
              <Text style={[s.emptyRow, { color: T.goldDeep, opacity: 0.65 }]}>Nothing to remember — tap to add one.</Text>
            ) : (
              remindItems.map(r => (
                <View key={r.id} style={s.calRow}>
                  <Text style={[s.calTime, { color: T.goldDeep, opacity: 0.75 }]}>{r.whenLabel}</Text>
                  <View style={[s.calDot, { backgroundColor: T.goldDeep, opacity: r.isMe ? 0.9 : 0.45 }]}/>
                  <Text style={[s.calTitle, { color: T.ink }]} numberOfLines={1}>{r.title}</Text>
                </View>
              ))
            )}
            <View style={[s.quickAdd, { backgroundColor: '#fff', borderColor: T.goldDeep, borderWidth: 1.5 }]}>
              <Text style={[s.quickPlus, { color: T.coral }]}>+</Text>
              <Text style={[s.quickField, { color: T.goldDeep, opacity: 0.75 }]}>Add a reminder…</Text>
            </View>
          </TouchableOpacity>

          {/* ── BUDGET TILE — minimal, no numbers, tap-through ─────────── */}
          <TouchableOpacity
            style={[s.tile, { backgroundColor: T.mintTint, borderColor: 'transparent' }]}
            onPress={openBudget} activeOpacity={0.85}
          >
            <Text style={[s.tileEyebrow, { color: T.mintDeep }]}>💰 OUR BUDGET</Text>
            <Text style={s.budTitle}>Categories · Savings · Spending</Text>
            <Text style={s.budSub}>Manage income, categories, savings goals.</Text>
            <Text style={s.budCta}>Tap to open →</Text>
          </TouchableOpacity>

          {/* NOTE — Reminders tile lands in Phase 05 as the 4th pillar */}

        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── UNIVERSAL CHAT BAR ─────────────────────────────────────────
          Session 32 v2 — per-icon routing (Phase 04c). Each control
          sets a specific ChatIntent then navigates. Chat consumes on
          activation and jumps straight into the right mode. */}
      <View style={[s.chatbar, { bottom: 22 + Math.max(0, insets.bottom - 8) }]}>
        <TouchableOpacity
          style={s.cbBtn}
          activeOpacity={0.7}
          onPress={openChatMic}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Start voice message"
        >
          <IcoMic color={T.ink}/>
        </TouchableOpacity>
        <View style={s.cbSep}/>
        <TouchableOpacity
          style={s.cbFieldTap}
          activeOpacity={0.85}
          onPress={openChatFocus}
          accessibilityLabel="Type a message to Zaeli"
        >
          <Text style={s.cbField}>Ask Zaeli anything…</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={s.cbBtn}
          activeOpacity={0.7}
          onPress={openChatCamera}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Add photo"
        >
          <IcoCamera color={T.coral}/>
        </TouchableOpacity>
        <TouchableOpacity
          style={s.cbSend}
          activeOpacity={0.85}
          onPress={openChatFocus}
          accessibilityLabel="Send message"
        >
          <IcoSend/>
        </TouchableOpacity>
      </View>

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
  // Session 32 — font bumps: eyebrow 11 → 13, meta 11 → 12
  tileEyebrow: {
    fontFamily: 'Poppins_700Bold', fontSize: 13,
    letterSpacing: 0.8, color: T.ink3,
  },
  tileMeta: {
    fontFamily: 'Poppins_600SemiBold', fontSize: 12,
    letterSpacing: 0.4, color: T.ink3,
  },
  emptyRow: {
    fontSize: 15, color: T.ink3, marginTop: 6, marginBottom: 6,
  },

  // Calendar rows — bumped 12/13 → 14/15, avatar 22/10 → 24/12
  calRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 6,
  },
  calTime: {
    fontFamily: 'Poppins_600SemiBold', fontSize: 14, minWidth: 64,
  },
  calDot: { width: 8, height: 8, borderRadius: 4 },
  calTitle: { flex: 1, fontSize: 15, fontWeight: '500' },
  avat: {
    width: 24, height: 24, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  avatTxt: {
    fontFamily: 'Poppins_700Bold', fontSize: 12, color: '#fff',
  },

  // Shopping rows — bumped 13 → 15
  shopRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 4,
  },
  bullet: { width: 5, height: 5, borderRadius: 3 },
  shopTxt: { fontSize: 15, flex: 1 },

  // Quick-add row — bumped 13 → 15 on input
  quickAdd: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: T.bg, borderWidth: 1, borderColor: T.line,
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
    marginTop: 10,
  },
  quickPlus: {
    fontFamily: 'Poppins_800ExtraBold', fontSize: 18, color: T.coral,
  },
  quickField: { fontSize: 15, color: T.ink3, flex: 1 },
  quickInput: {
    flex: 1, fontSize: 15, color: T.ink,
    paddingVertical: 0,
    fontFamily: 'Poppins_400Regular',
  },
  enterKey: {
    backgroundColor: 'rgba(10,10,10,0.06)',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
  },
  enterTxt: { fontSize: 12, color: T.ink3, fontWeight: '600' },

  // Budget tile — minimal (Rich's call — no financial numbers)
  budTitle: {
    fontFamily: 'Poppins_700Bold', fontSize: 18, color: T.ink,
    marginTop: 4,
  },
  budSub: {
    fontSize: 14, color: T.ink2, marginTop: 4,
  },
  budCta: {
    fontFamily: 'Poppins_700Bold', fontSize: 14, color: T.mintDeep,
    marginTop: 12, textAlign: 'right',
  },

  // Universal chat bar — Session 32
  chatbar: {
    position: 'absolute', left: 14, right: 14,
    backgroundColor: '#fff',
    borderWidth: 1, borderColor: 'rgba(210,210,210,0.55)',
    borderRadius: 32, paddingHorizontal: 10, paddingVertical: 8,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    minHeight: 60,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.10, shadowRadius: 20,
    elevation: 8,
  },
  cbBtn: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  cbSep: {
    width: 1, height: 24, backgroundColor: 'rgba(10,10,10,0.1)',
  },
  cbFieldTap: {
    flex: 1, justifyContent: 'center', paddingVertical: 10,
  },
  cbField: {
    fontSize: 17, color: T.ink3, paddingHorizontal: 4,
    fontFamily: 'Poppins_400Regular',
  },
  cbSend: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: T.coral,
    alignItems: 'center', justifyContent: 'center',
  },
});
