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
import { parseLocalIsoAsDate, loadReminders } from '../../lib/reminders';
import MoreSheet from '../components/MoreSheet';
import { getProfile, waitForProfile } from '../../lib/auth';
import { loadRoster, getRoster } from '../../lib/family-roster';
import { setPendingChatContext, setChatIntent, subscribeHomeRefresh, getHomeRefreshVersion } from '../../lib/navigation-store';
import { loadTile, saveTile, saveLastFamilyId, getLastFamilyId, CACHE_KEYS } from '../../lib/home-cache';
// (onAuthChange removed Commit 6 — polling for profile-ready is the fix)
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
  const [remindItems, setRemindItems] = useState<{ id: string; title: string; whenLabel: string; isMe: boolean; tier: 'personal'|'shared' }[]>([]);
  const [remindCount, setRemindCount] = useState(0);
  // Round B commit 15 — undated to-do count. Undated items (both remind_at
  // and remind_on null) live in the sheet's To-dos tab. Without a count on
  // the Home tile they were invisible (Rich noticed Anna's Poppy reminders
  // saved as undated + never showed on Home). Now shown as a small "· N to-dos"
  // suffix in the sub-line.
  const [todoCount, setTodoCount] = useState(0);

  // Round A — MoreSheet state (hamburger now opens this, not direct-to-Settings)
  const [moreOpen, setMoreOpen] = useState(false);

  // ── Data loaders — leaner than Phase 01, only what tiles need ─────────
  const loadData = useCallback(async () => {
    // Round B commit 8 — bail if profile not loaded yet. Previously
    // loadData called getFamilyId() which silently fell back to DUMMY on
    // race → queries returned 0 rows (RLS resolves real family from JWT,
    // DUMMY ≠ real) → tiles rendered empty. Now we bail; the
    // waitForProfile-driven useEffect below will fire loadData once the
    // real profile lands. Cold-open now shows loading state briefly
    // instead of "everything is empty".
    const p = getProfile();
    if (!p?.family_id) {
      console.log('[dashboard] loadData bailed — profile not ready yet');
      return;
    }
    const today = localDateStr();
    const fid = p.family_id;
    const myId = p.id;

    const [evRes, shopRes, allReminders] = await Promise.all([
      supabase.from('events')
        .select('id,title,date,start_time,assignees')
        .eq('family_id', fid).eq('date', today)
        .order('start_time').limit(6),
      supabase.from('shopping_items')
        .select('id,name')
        .eq('family_id', fid).neq('checked', true)
        .order('created_at', { ascending: false }).limit(50),
      // Round B commit 19 — switched from direct Supabase query to
      // loadReminders() so Dashboard uses the SAME source-of-truth as the
      // Reminders sheet. Before: Dashboard called supabase.from('reminders')
      // and trusted RLS; sheet used loadReminders() which adds a client-side
      // visibility filter on top. Any race between the two paths surfaced as
      // count mismatches (Rich saw "+4 undated to-dos" on Home while the
      // sheet showed only 1). Now both consume the same filtered list.
      loadReminders(),
    ]);

    const evList = (evRes.data ?? []).slice(0, 3);
    const evCount = (evRes.data ?? []).length;
    const shopList = (shopRes.data ?? []).slice(0, 3);
    const shopCnt = (shopRes.data ?? []).length;
    setTodayEvents(evList);
    setEventCountToday(evCount);
    setShopItems(shopList);
    setShopCount(shopCnt);
    // Build 53 — save to cache so next cold-start paints instantly.
    saveTile(fid, CACHE_KEYS.eventsToday, { items: evList, count: evCount });
    saveTile(fid, CACHE_KEYS.shoppingSummary, { items: shopList, count: shopCnt });

    // Round B — home tile shows DATED items in the primary "up next" list.
    // Undated to-dos surface as a small count in the sub-line (see todoCount)
    // so they're not invisible when Home is the front door.
    // loadReminders() already excludes other users' personal items (visibility
    // filter — RLS + belt-and-braces client filter) and returns Reminder objects
    // with camelCase fields.
    const activeRems = allReminders.filter(r => r.status !== 'done');
    const undated = activeRems.filter(r => !r.remindAt && !r.remindOn);
    setTodoCount(undated.length);
    const rems = activeRems
      .filter(r => r.remindAt || r.remindOn)
      .map(r => {
        let whenLabel = 'someday';
        if (r.remindAt) {
          // Round A fix — parse remindAt as local wall-clock (Hermes parses
          // no-timezone ISO as UTC otherwise, causing a 10-hour Brisbane skew)
          const d = parseLocalIsoAsDate(r.remindAt);
          const dToday = new Date(); dToday.setHours(0,0,0,0);
          const dTmw   = new Date(dToday.getTime() + 24*3600*1000);
          const dayOfR = new Date(d); dayOfR.setHours(0,0,0,0);
          const hh     = d.getHours(); const mm = d.getMinutes();
          const tstr   = `${((hh+11)%12+1)}${mm ? ':' + String(mm).padStart(2,'0') : ''}${hh<12?'am':'pm'}`;
          if (dayOfR.getTime() === dToday.getTime()) whenLabel = tstr;
          else if (dayOfR.getTime() === dTmw.getTime()) whenLabel = `tmw ${tstr}`;
          else whenLabel = `${d.toLocaleDateString('en-AU',{ weekday:'short' })} ${tstr}`;
        } else if (r.remindOn) {
          const d = new Date(r.remindOn + 'T00:00:00');
          whenLabel = d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric' });
        }
        return {
          id: r.id,
          title: r.title,
          whenLabel,
          isMe: r.createdBy === myId,
          tier: r.visibility ?? 'personal',
        };
      });
    const remsTop3 = rems.slice(0, 3);
    setRemindItems(remsTop3);
    setRemindCount(rems.length);
    // Build 53 — save reminders + last-family-id to cache
    saveTile(fid, CACHE_KEYS.remindersSummary, {
      items: remsTop3,
      count: rems.length,
      todoCount: undated.length,
    });
    saveLastFamilyId(fid);
  }, []);

  // Build 53 — hydrate tiles from AsyncStorage cache on mount BEFORE the
  // Supabase fetch completes. Fixes the 2-3s "blank shell" flash on every
  // cold-start. Reads the last-active family_id from cache (since profile
  // may not be loaded yet — Session 30 splash-latency fix loads profile in
  // the background after setAuthed=true). If cache hits, tiles paint in
  // ~50ms; loadData then fetches fresh and silently updates on divergence.
  useEffect(() => {
    (async () => {
      const fid = await getLastFamilyId();
      if (!fid) return;
      const [cachedEvents, cachedShop, cachedRems] = await Promise.all([
        loadTile<{ items: EventLite[]; count: number }>(fid, CACHE_KEYS.eventsToday),
        loadTile<{ items: ShopItem[]; count: number }>(fid, CACHE_KEYS.shoppingSummary),
        loadTile<{ items: any[]; count: number; todoCount: number }>(fid, CACHE_KEYS.remindersSummary),
      ]);
      if (cachedEvents) {
        setTodayEvents(cachedEvents.items ?? []);
        setEventCountToday(cachedEvents.count ?? 0);
      }
      if (cachedShop) {
        setShopItems(cachedShop.items ?? []);
        setShopCount(cachedShop.count ?? 0);
      }
      if (cachedRems) {
        setRemindItems(cachedRems.items ?? []);
        setRemindCount(cachedRems.count ?? 0);
        setTodoCount(cachedRems.todoCount ?? 0);
      }
    })();
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));
  useEffect(() => { if (isActive) loadData(); }, [isActive, loadData]);

  // Round B commit 3 — subscribe to bumpHomeRefresh() so sheet mutations
  // (add/tick/delete reminder, shop, etc) refresh the home tiles even
  // though the sheet is a Modal portal and Home never lost focus.
  const [homeRefreshVer, setHomeRefreshVer] = useState(getHomeRefreshVersion());
  useEffect(() => subscribeHomeRefresh(setHomeRefreshVer), []);
  useEffect(() => { if (homeRefreshVer > 0) loadData(); }, [homeRefreshVer, loadData]);

  // Round B commit 8 — cold-open empty tiles, event-based fix.
  //
  // Previous approach (Commit 6 polling every 300ms up to 6s) worked but
  // gave up if profile took >6s on flaky network. Now uses the new
  // waitForProfile() event helper from lib/auth.ts — subscribes to a
  // waiter list that loadProfile() drains on completion. No timeout cap.
  //
  // The other useEffects (line 240-242) still fire loadData() immediately,
  // but they now bail early inside loadData if getProfile is null (see the
  // guard added to the top of loadData). So empty queries stop firing
  // pre-auth entirely — tiles stay in loading state until real data lands.
  useEffect(() => {
    let cancelled = false;
    waitForProfile(60000).then(p => {
      if (cancelled) return;
      if (p?.family_id) loadData();
      else console.log('[dashboard] waitForProfile timed out — user may be signed out');
    });
    return () => { cancelled = true; };
  }, [loadData]);

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
  // Round A change (Rich feedback) — tile tap NO LONGER scrolls to Chat first
  // before opening the sheet. The 92% Modal is a React Native portal that
  // renders at root regardless of which page is on-screen, so we can open the
  // sheet directly and it appears over Home. When user closes the sheet, they
  // stay on Home (they never left). Return-to-origin is now the default because
  // there's no navigation to reverse.
  //
  // How it works: setPendingChatContext + onContextTrigger fires the Chat's
  // contextTrigger useEffect, which opens the sheet. We DON'T call
  // onNavigateChat, so swipe-world stays on Home.
  const openCalendarSheet = useCallback(() => {
    setPendingChatContext({ type: 'calendar_view', returnTo: 'dashboard' } as any);
    onContextTrigger?.();
  }, [onContextTrigger]);

  // Round B commit 3 — tapping the "+ Add event…" pill on the Calendar
  // tile now opens the sheet straight into the manual-add form for today,
  // skipping the intermediate "sheet lists events → tap Add manually"
  // second-tap Rich reported.
  const openCalendarSheetAdd = useCallback(() => {
    setPendingChatContext({ type: 'calendar_view', openAdd: true, returnTo: 'dashboard' } as any);
    onContextTrigger?.();
  }, [onContextTrigger]);

  const openShoppingSheet = useCallback(() => {
    setPendingChatContext({ type: 'shopping_sheet', returnTo: 'dashboard' } as any);
    onContextTrigger?.();
  }, [onContextTrigger]);

  const openBudget = useCallback(() => {
    router.navigate('/(tabs)/our-budget');
  }, [router]);

  const openRemindersSheet = useCallback(() => {
    setPendingChatContext({ type: 'reminders_sheet', returnTo: 'dashboard' } as any);
    onContextTrigger?.();
  }, [onContextTrigger]);

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

  // Round B commit 8 — Reminders tile mic. Direct-add path per Rich's
  // Option B: tap mic on Reminders tile → speak → transcript becomes a
  // reminder title (visibility='personal') without going through Chat +
  // Sonnet. Wired via ChatIntent 'mic-reminder' — Chat consumes, starts
  // recording with a flag; stopRecording routes to saveReminder direct.
  const openReminderTileMic = useCallback(() => {
    setChatIntent({ kind: 'mic-reminder' });
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

      {/* Header — wordmark + Home label + hamburger (Round A — Rich rename)
          Hamburger now opens MoreSheet (not direct-to-Settings shortcut). */}
      <View style={s.hdr}>
        <Text style={s.wordmark}>
          z<Text style={s.aa}>a</Text>el<Text style={s.aa}>i</Text>
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Text style={s.pageLabel}>Home</Text>
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

          {/* ── ZAELI CHAT TILE (Session 37 · Variation B) ────────────────
              Replaces the earlier BriefTile. Warm time-of-day greeting that
              taps into Chat. Brief content now lives on the lockscreen only
              (moment-in-time nudge — as originally designed). This tile is
              Zaeli's persistent "I'm here" tap-in on Home.

              5 time windows with palette-token bg tints already in use
              elsewhere in the app (peach = morning brief bubble, sky =
              weather tile, mint = budget, lavender = evening brief bubble,
              slate = a soft late-night). Greeting computed from wall-clock
              hour at render — stale text between opens is harmless; user
              closes and reopens throughout the day. */}
          {(() => {
            const hr = new Date().getHours();
            let greeting: string, emoji: string, bg: string, iconBg: string;
            if (hr >= 5 && hr < 12) {
              greeting = "Morning 👋 What's on your mind?";
              emoji = '☀️';
              bg = T.peachTint;
              iconBg = T.peach;
            } else if (hr >= 12 && hr < 16) {
              greeting = 'Hey — anything I can help with?';
              emoji = '💬';
              bg = T.skyTint;
              iconBg = T.sky;
            } else if (hr >= 16 && hr < 19) {
              greeting = 'Afternoon 👋 What can I sort?';
              emoji = '👋';
              bg = T.mintTint;
              iconBg = T.mint;
            } else if (hr >= 19 && hr < 24) {
              greeting = 'Evening — anything to knock off?';
              emoji = '🌙';
              bg = T.lavTint;
              iconBg = T.lavender;
            } else {
              // 0-4am
              greeting = "Still up? I'm here.";
              emoji = '💤';
              bg = 'rgba(45,55,72,0.06)';
              iconBg = T.slate;
            }
            return (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={openChat}
                style={{
                  backgroundColor: bg,
                  borderRadius: 22,
                  paddingVertical: 18,
                  paddingHorizontal: 18,
                  marginBottom: 14,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 14,
                }}
              >
                <View style={{
                  width: 44,
                  height: 44,
                  borderRadius: 999,
                  backgroundColor: iconBg,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Text style={{ fontSize: 20 }}>{emoji}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{
                    fontFamily: 'Poppins_700Bold',
                    fontSize: 16,
                    lineHeight: 22,
                    letterSpacing: -0.2,
                    color: T.ink,
                  }}>{greeting}</Text>
                  <Text style={{
                    fontFamily: 'Poppins_600SemiBold',
                    fontSize: 12,
                    color: T.ink2,
                    marginTop: 2,
                  }}>
                    Chat with me <Text style={{ color: T.coral, fontFamily: 'Poppins_700Bold' }}>→</Text>
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })()}

          {/* ── CALENDAR TILE (slate) — Round A big-text ──────────────── */}
          <TouchableOpacity
            style={[s.tile, { backgroundColor: T.slate, borderColor: 'transparent' }]}
            onPress={openCalendarSheet} activeOpacity={0.85}
          >
            <View style={s.tileHead}>
              <Text style={[s.tileEyebrow, { color: 'rgba(255,255,255,0.7)' }]}>📅 CALENDAR</Text>
              <Text style={[s.fullHint, { color: 'rgba(255,255,255,0.6)' }]}>Full calendar →</Text>
            </View>
            <Text style={[s.tileHeadline, { color: '#fff' }]}>
              {eventCountToday === 0 ? "Nothing on today." : `${eventCountToday} event${eventCountToday === 1 ? '' : 's'} on today.`}
            </Text>
            {todayEvents.map(ev => {
              // Build 54 (Session 36) — "?" avatar fix. Four cases:
              //   1. External iCal event (source='apple-ical'): assignees=[]
              //      by design (Rich's rule — don't stamp "R" on every work
              //      meeting). Render a small iPhone icon in the avatar slot,
              //      not a "?" letter.
              //   2. Zaeli event but roster hasn't hydrated yet (cold-start
              //      race): render a subtle placeholder dot, not "?".
              //   3. Zaeli event, roster loaded, but ALL assignee UUIDs are
              //      stale (from a duplicate-family_members cleanup — the
              //      row was patched but historical events still reference
              //      the old id): render circle in default colour, no
              //      letter. Never paint "?" — leaks identity concerns.
              //   4. NORMAL — at least one assignee resolves. Show that
              //      one's tinted letter avatar.
              //
              // Session 36 hotfix — Build 54.1: iterate the whole assignees
              // array instead of only checking [0]. Rich hit the case where
              // Soccer Training has assignees=[stale-rich, valid-duke,
              // valid-gab] — [0] is stale so old code fell to placeholder
              // even though Duke + Gab were both fine. New code finds first
              // resolvable member. Sheet renderer already does this via
              // .filter(Boolean); this brings Home tile in line.
              const isExternal = ev.source === 'apple-ical';
              const rosterLoaded = roster.length > 0;
              const assigneeIds: string[] = Array.isArray(ev.assignees) ? ev.assignees : [];
              let mem = null as ReturnType<typeof memberById> | null;
              for (const id of assigneeIds) {
                const m = memberById(id);
                if (m) { mem = m; break; }
              }
              const c = mem?.color ?? T.rich;
              const dotC = isExternal ? 'rgba(255,255,255,0.35)' : c;
              return (
                <View key={ev.id} style={s.calRow}>
                  <Text style={[s.calTime, { color: 'rgba(255,255,255,0.75)' }]}>{fmtTime(ev.start_time) || 'all day'}</Text>
                  <View style={[s.calDot, { backgroundColor: dotC }]}/>
                  <Text style={[s.calTitle, { color: 'rgba(255,255,255,0.92)' }]} numberOfLines={1}>{ev.title}</Text>
                  {isExternal ? (
                    <View style={[s.avat, { backgroundColor: 'rgba(255,255,255,0.14)' }]}>
                      <Text style={{ fontSize: 11 }}>📱</Text>
                    </View>
                  ) : mem ? (
                    <View style={[s.avat, { backgroundColor: c }]}>
                      <Text style={s.avatTxt}>{mem.name.charAt(0).toUpperCase()}</Text>
                    </View>
                  ) : !rosterLoaded ? (
                    <View style={[s.avat, { backgroundColor: 'rgba(255,255,255,0.14)' }]}/>
                  ) : (
                    <View style={[s.avat, { backgroundColor: 'rgba(255,255,255,0.18)' }]}/>
                  )}
                </View>
              );
            })}
            <TouchableOpacity
              onPress={(e) => { e.stopPropagation?.(); openCalendarSheetAdd(); }}
              activeOpacity={0.75}
              style={[s.quickAdd, { backgroundColor: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.18)' }]}
            >
              <Text style={[s.quickPlus, { color: T.coral }]}>+</Text>
              <Text style={[s.quickField, { color: 'rgba(255,255,255,0.7)' }]}>Add event…</Text>
              <TouchableOpacity
                onPress={(e) => { e.stopPropagation?.(); openChatMic(); }}
                style={[s.tileMic, { backgroundColor: 'rgba(255,255,255,0.14)' }]}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <IcoMic color="#fff" size={18}/>
              </TouchableOpacity>
            </TouchableOpacity>
          </TouchableOpacity>

          {/* ── SHOPPING TILE (lavender) — Round A big-text ──────────── */}
          <TouchableOpacity
            style={[s.tile, { backgroundColor: T.lavender, borderColor: 'transparent' }]}
            onPress={openShoppingSheet} activeOpacity={0.85}
          >
            <View style={s.tileHead}>
              <Text style={[s.tileEyebrow, { color: T.lavDeep }]}>🛒 SHOPPING</Text>
              <Text style={[s.fullHint, { color: T.lavDeep }]}>Full list →</Text>
            </View>
            <Text style={[s.tileHeadline, { color: T.ink }]}>
              {shopCount === 0 ? "List is empty." : `${shopCount} item${shopCount === 1 ? '' : 's'} to grab.`}
            </Text>
            {shopItems.map(it => (
              <View key={it.id} style={s.shopRow}>
                <View style={[s.bullet, { backgroundColor: T.lavDeep, opacity: 0.4 }]}/>
                <Text style={[s.shopTxt, { color: T.ink }]} numberOfLines={1}>{it.name}</Text>
              </View>
            ))}
            <View
              onStartShouldSetResponder={() => true}
              style={[s.quickAdd, { backgroundColor: '#fff', borderColor: T.lavDeep, borderWidth: 1.5 }]}
            >
              <Text style={[s.quickPlus, { color: T.coral }]}>+</Text>
              <TextInput
                value={shopQuickAdd}
                onChangeText={setShopQuickAdd}
                onSubmitEditing={handleShopSubmit}
                placeholder="Add item…"
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
              ) : (
                <TouchableOpacity
                  onPress={(e) => { e.stopPropagation?.(); openChatMic(); }}
                  style={s.tileMic}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <IcoMic color={T.lavDeep} size={18}/>
                </TouchableOpacity>
              )}
            </View>
            {shopJustAdded && (
              <Text style={{ fontSize: 12, color: T.mintDeep, fontWeight: '700', marginTop: 8, letterSpacing: 0.4 }}>
                ✓ ADDED {shopJustAdded.toUpperCase()}
              </Text>
            )}
          </TouchableOpacity>

          {/* ── REMINDERS & TO-DOS TILE (gold) — Round B renamed ──────────
              Sheet now holds both dated Reminders and undated To-dos in two
              tabs (Round B commit 2). Tile headline still surfaces just the
              next few DATED items (to-dos don't rank naturally without a
              due date) but the eyebrow + hint reflect the fuller scope. */}
          <TouchableOpacity
            style={[s.tile, { backgroundColor: T.goldTint, borderColor: 'transparent' }]}
            onPress={openRemindersSheet} activeOpacity={0.85}
          >
            <View style={s.tileHead}>
              <Text style={[s.tileEyebrow, { color: T.goldDeep }]}>⏰ REMINDERS & TO-DOS</Text>
              <Text style={[s.fullHint, { color: T.goldDeep }]}>Full list →</Text>
            </View>
            <Text style={[s.tileHeadline, { color: T.ink }]}>
              {remindCount === 0 && todoCount === 0
                ? "Nothing to remember."
                : remindCount === 0 && todoCount > 0
                ? `${todoCount} to-do${todoCount === 1 ? '' : 's'}.`
                : remindCount === 1 && remindItems[0]?.whenLabel
                ? `1 due ${remindItems[0].whenLabel}.`
                : `${remindCount} up next.`}
            </Text>
            {remindItems.map(r => (
              <View key={r.id} style={s.calRow}>
                <Text style={[s.calTime, { color: T.goldDeep, opacity: 0.75 }]}>{r.whenLabel}</Text>
                {/* Tier icon — 🔒 personal (mine only) / 👥 shared (family sees) */}
                <Text style={{ fontSize: 11, marginRight: 4 }}>{r.tier === 'personal' ? '🔒' : '👥'}</Text>
                <Text style={[s.calTitle, { color: T.ink }]} numberOfLines={1}>{r.title}</Text>
              </View>
            ))}
            {/* Round B commit 15 — undated to-do count line. Only shown when
                there are BOTH dated items above AND undated items below, so
                Anna's Poppy-style undated items aren't invisible on Home. */}
            {remindCount > 0 && todoCount > 0 && (
              <Text style={{ fontFamily:'Poppins_500Medium', fontSize:12, color:'rgba(0,0,0,0.5)', marginTop:6 }}>
                +{todoCount} undated to-do{todoCount === 1 ? '' : 's'}
              </Text>
            )}
            <View style={[s.quickAdd, { backgroundColor: '#fff', borderColor: T.goldDeep, borderWidth: 1.5 }]}>
              <Text style={[s.quickPlus, { color: T.coral }]}>+</Text>
              <Text style={[s.quickField, { color: T.goldDeep, opacity: 0.75 }]}>Add reminder or to-do…</Text>
              <TouchableOpacity
                onPress={(e) => { e.stopPropagation?.(); openReminderTileMic(); }}
                style={s.tileMic}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <IcoMic color={T.goldDeep} size={18}/>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>

          {/* ── BUDGET TILE — Round A big-text, no numbers ─────────────── */}
          <TouchableOpacity
            style={[s.tile, { backgroundColor: T.mintTint, borderColor: 'transparent' }]}
            onPress={openBudget} activeOpacity={0.85}
          >
            <View style={s.tileHead}>
              <Text style={[s.tileEyebrow, { color: T.mintDeep }]}>💰 OUR BUDGET</Text>
              <Text style={[s.fullHint, { color: T.mintDeep }]}>Full budget →</Text>
            </View>
            <Text style={[s.tileHeadline, { color: T.mintDeep }]}>On track for the month.</Text>
            <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 14, color: T.ink3, marginTop: -6 }}>
              Expenses · Savings · Spending
            </Text>
          </TouchableOpacity>

          {/* NOTE — Reminders tile lands in Phase 05 as the 4th pillar */}

        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── UNIVERSAL CHAT BAR ─────────────────────────────────────────
          Session 32 v2 — per-icon routing (Phase 04c). Each control
          sets a specific ChatIntent then navigates. Chat consumes on
          activation and jumps straight into the right mode. */}
      {/* Round A — bottom position matches Chat's barFloat exactly for
          zero-flicker swipe. Chat: barFloat wrapper paddingBottom 24 (iOS)
          + bottom 0. Same math here so the pill sits at exactly the same
          Y-position on both pages. */}
      <View style={[s.chatbar, { bottom: Platform.OS === 'ios' ? 24 : 14 }]}>
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

      {/* Round A — MoreSheet triggered by hamburger.
          Round B commit 4 — pass onAction so tile taps route THROUGH Home's
          own sheet-openers (which open the sheet OVER Home via portal), not
          through the default routing (which navigates to Chat's context that
          never fires because Chat isn't active — sheets appeared to
          "disappear" or land the user on the wrong page). */}
      <MoreSheet
        visible={moreOpen}
        onClose={() => setMoreOpen(false)}
        onAction={(key) => {
          setMoreOpen(false);
          setTimeout(() => {
            if      (key === 'calendar')  openCalendarSheet();
            else if (key === 'shopping')  openShoppingSheet();
            else if (key === 'reminders') openRemindersSheet();
            else if (key === 'budget')    openBudget();
            else if (key === 'family')    router.navigate('/(tabs)/family' as any);
            else if (key === 'settings')  router.navigate('/(tabs)/settings' as any);
            else if (key === 'chat')      onNavigateChat?.();
          }, 200); // let MoreSheet close animate before opening the next sheet
        }}
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
  pageLabel: { fontFamily: 'Poppins_700Bold', fontSize: 17, color: T.ink2 },

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
  // Round A — big-text headline (26px 800). Reads at a glance.
  tileHeadline: {
    fontFamily: 'Poppins_800ExtraBold', fontSize: 26,
    letterSpacing: -0.6, lineHeight: 31,
    marginTop: 6, marginBottom: 14,
  },
  // Round A — "Full × →" hint (top-right of each tile) so users know tile taps
  fullHint: {
    fontFamily: 'Poppins_600SemiBold', fontSize: 12,
    letterSpacing: 0.2, opacity: 0.75,
  },
  // Round A — per-tile mic in the add pill (routes to Chat with mic intent)
  tileMic: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: 'rgba(10,10,10,0.06)',
    alignItems: 'center', justifyContent: 'center',
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
  // Round A — match Chat's barPillV2 exactly for zero-flicker swipe.
  // Same border colour, padding, gap, shadow, minHeight, alignItems.
  chatbar: {
    position: 'absolute', left: 14, right: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: 'rgba(220,220,220,0.6)',
    borderRadius: 32, paddingVertical: 10, paddingHorizontal: 12,
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    minHeight: 60,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.10, shadowRadius: 18,
    elevation: 10,
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
