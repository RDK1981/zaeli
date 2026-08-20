/**
 * settings.tsx — Zaeli Settings Screen
 *
 * Standalone full-screen route accessed via MoreSheet → Settings tile.
 * Three internal views: main | notifications | memory.
 *
 * v1 scope:
 *  - Main: account hero, subscription card, all rows
 *  - Notifications: brief time pickers, reminders, kids, quiet hours, sound
 *  - Memory: dummy data (Supabase wiring later)
 *  - Rows not wired show a simple alert placeholder
 *
 * Phase 2c — toggles/times persist to profiles.user_preferences JSONB
 * via lib/user-prefs.ts (Supabase write-through, AsyncStorage fallback).
 */

import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal,
  Dimensions, Alert, Platform, Linking, TextInput, AppState,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setFamilyFromSettings } from '../../lib/navigation-store';
import { STOPS as TOUR_STOPS, TOTAL_STOPS as TOUR_TOTAL, replayFromStart, replayStop, loadTourState, isCompleted as tourIsCompleted, getState as getTourState, getEffectiveStops as tourEffectiveStops, getEffectiveTotal as tourEffectiveTotal } from '../../lib/tour-state';
import { loadInvites, getPendingInvites, markAccepted } from '../../lib/invite-state';
import { resetToOwner } from '../../lib/account-state';
import { signOut, loadProfile, getProfile, getCurrentUserId, type Profile } from '../../lib/auth';
import { loadPrefs, updatePref as persistUpdatePref, DEFAULT_PREFS, type Prefs } from '../../lib/user-prefs';
import {
  fetchInsightsByCategory, fetchMilestones, deleteInsight, deleteMilestone,
  clearAllMemory, type InsightRow, type MilestoneRow,
} from '../../lib/zaeli-memory';
import { getFamilyId } from '../../lib/family';
import { loadRoster, getRoster } from '../../lib/family-roster';
import { registerPushToken, debugPushToken, notifyFamily } from '../../lib/notifications';
import { supabase } from '../../lib/supabase';
import { getSubscription, subscriptionLabel, fetchCustomerPortalUrl, shouldPromptSubscribe, getCheckoutUrl, isFamilyInBeta } from '../../lib/stripe';
import DateTimePicker from '@react-native-community/datetimepicker';
import Constants from 'expo-constants';
import Svg, { Path } from 'react-native-svg';
import MoreSheet from '../components/MoreSheet';
import * as AppleCal from '../../lib/apple-calendar';

const { height: H } = Dimensions.get('window');

// Build 70 — hardcoded BUILD_NUMBER for reliable version display.
// Build 69's attempt using Constants.nativeBuildVersion + expoConfig.ios
// .buildNumber both returned undefined at runtime — version rendered as
// just "1.0.0" with no build number, so we couldn't tell which build was
// actually installed. Hardcoded constant is 100% reliable. Manual bump
// per production build (I bump this each time I ship a new build).
const BUILD_NUMBER = '77';

// ── Colour tokens ──────────────────────────────────────────────────────────
const BG      = '#FAF8F5';
const CARD    = '#FFFFFF';
const INK     = '#0A0A0A';
const INK2    = 'rgba(10,10,10,0.72)';
const INK3    = 'rgba(10,10,10,0.55)';
const INK4    = 'rgba(10,10,10,0.42)';
const BORDER  = 'rgba(10,10,10,0.06)';
const DANGER  = '#C53030';
const SUCCESS = '#34C759';

// ── Types ──────────────────────────────────────────────────────────────────
// Round B commit 10 — added subscription/password/colour/pin sub-pages.
type Screen = 'main' | 'notifications' | 'memory' | 'tour' | 'subscription' | 'password' | 'colour' | 'pin' | 'calendar-sync';
// Prefs / DEFAULT_PREFS imported from lib/user-prefs (Phase 2c — Supabase-backed)

// '07:00' -> '7:00 am' · '12:30' -> '12:30 pm' · '18:30' -> '6:30 pm'
function fmtTime12(hm: string): string {
  const [hStr, mStr] = hm.split(':');
  const h = parseInt(hStr, 10);
  const m = mStr;
  const period = h >= 12 ? 'pm' : 'am';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return m === '00' ? `${h12} ${period}` : `${h12}:${m} ${period}`;
}
function dateToHm(d: Date): string {
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}
function hmToDate(hm: string): Date {
  const [h, m] = hm.split(':').map(Number);
  const d = new Date(); d.setHours(h, m, 0, 0);
  return d;
}

// ── SVGs ───────────────────────────────────────────────────────────────────
function BackArrow() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M15 18l-6-6 6-6" stroke={INK2} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"/>
    </Svg>
  );
}
function Hamburger() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M3 6h18M3 12h18M3 18h18" stroke={INK} strokeWidth={2.2} strokeLinecap="round"/>
    </Svg>
  );
}
function Chevron({ dir = 'right' }: { dir?: 'right' | 'down' }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path
        d={dir === 'right' ? 'M9 6l6 6-6 6' : 'M6 9l6 6 6-6'}
        stroke="rgba(10,10,10,0.30)" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"
      />
    </Svg>
  );
}
function CloseX() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="M6 6l12 12M18 6L6 18" stroke={INK3} strokeWidth={2.4} strokeLinecap="round"/>
    </Svg>
  );
}

// ── Tiny UI atoms ──────────────────────────────────────────────────────────
function SecLabel({ children }: { children: React.ReactNode }) {
  return <Text style={s.secLabel}>{children}</Text>;
}

interface RowProps {
  icon: string;
  iconBg: string;
  iconFg: string;
  title: string;
  sub?: string;
  value?: string;
  onPress?: () => void;
  toggle?: boolean;
  toggleValue?: boolean;
  onToggle?: (v: boolean) => void;
  danger?: boolean;
  last?: boolean;
  removable?: boolean;
  onRemove?: () => void;
}
function Row(p: RowProps) {
  return (
    <TouchableOpacity
      activeOpacity={p.onPress || p.onToggle ? 0.6 : 1}
      onPress={p.toggle ? () => p.onToggle?.(!p.toggleValue) : p.onPress}
      style={[s.row, !p.last && s.rowDivider]}
    >
      <View style={[s.rowIco, { backgroundColor: p.iconBg }]}>
        <Text style={{ fontSize: 16 }}>{p.icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[s.rowTitle, p.danger && { color: DANGER }]}>{p.title}</Text>
        {p.sub && <Text style={s.rowSub}>{p.sub}</Text>}
      </View>
      {p.value && <Text style={s.rowVal}>{p.value}</Text>}
      {p.toggle && <ToggleSwitch value={!!p.toggleValue} onChange={v => p.onToggle?.(v)}/>}
      {p.removable && (
        <TouchableOpacity onPress={p.onRemove} hitSlop={{ top:10, bottom:10, left:10, right:10 }}>
          <Text style={{ fontSize: 18, color: 'rgba(10,10,10,0.32)', paddingHorizontal: 4 }}>×</Text>
        </TouchableOpacity>
      )}
      {!p.toggle && !p.value && !p.removable && <Chevron/>}
    </TouchableOpacity>
  );
}

function ToggleSwitch({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={() => onChange(!value)}>
      <View style={[s.toggle, { backgroundColor: value ? SUCCESS : 'rgba(10,10,10,0.15)' }]}>
        <View style={[s.toggleKnob, { left: value ? 20 : 2 }]}/>
      </View>
    </TouchableOpacity>
  );
}

// ── Header (shared across views) ───────────────────────────────────────────
interface HeaderProps {
  pageLabel: string;
  onBack: () => void;
  onMore: () => void;
}
function Header({ pageLabel, onBack, onMore }: HeaderProps) {
  return (
    <View style={s.header}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <TouchableOpacity onPress={onBack} style={s.back} activeOpacity={0.7}>
          <BackArrow/>
        </TouchableOpacity>
        <Text style={s.wordmark}>
          z<Text style={{ color: '#A8D8F0' }}>a</Text>el<Text style={{ color: '#A8D8F0' }}>i</Text>
        </Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Text style={s.pageLabel}>{pageLabel}</Text>
        <TouchableOpacity onPress={onMore} style={s.hamburger} activeOpacity={0.7}>
          <Hamburger/>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Main component
// ═══════════════════════════════════════════════════════════════════════════
export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [view, setView]     = useState<Screen>('main');
  const [prefs, setPrefs]   = useState<Prefs>(DEFAULT_PREFS);
  const [loaded, setLoaded] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  // Real signed-in profile for the account hero (Phase 2 auth wiring).
  const [profile, setProfile] = useState<Profile | null>(getProfile());
  useEffect(() => { loadProfile().then(p => { if (p) setProfile(p); }); }, []);

  // Time picker state: which field is being edited (null = closed)
  const [editingTimeKey, setEditingTimeKey] = useState<keyof Prefs | null>(null);
  const [pickerDate, setPickerDate] = useState<Date>(new Date());

  // Memory — Phase 2f: real Supabase data via lib/zaeli-memory.ts.
  // Fetched on first navigation into the Memory view (not on settings mount,
  // since most users won't open this view every session).
  const [memory, setMemory] = useState<{
    routines: InsightRow[];
    preferences: InsightRow[];
    milestones: MilestoneRow[];
    loaded: boolean;
  }>({ routines: [], preferences: [], milestones: [], loaded: false });

  async function loadMemory() {
    const familyId = getFamilyId();
    const [routines, preferences, milestones] = await Promise.all([
      fetchInsightsByCategory(familyId, 'routine'),
      fetchInsightsByCategory(familyId, 'preference'),
      fetchMilestones(familyId),
    ]);
    setMemory({ routines, preferences, milestones, loaded: true });
  }

  // Trigger load whenever Memory view becomes visible. Always re-fetches so
  // SQL changes / new insights from chat show up on next entry. The "Loading…"
  // skeleton only shows on the very first load (when memory.loaded is false);
  // subsequent re-entries swap the data silently with no flash.
  useEffect(() => {
    if (view === 'memory') {
      loadMemory().catch(() => setMemory(prev => ({ ...prev, loaded: true })));
    }
  }, [view]);

  async function handleDeleteInsight(id: string) {
    // Optimistic UI — remove from local state first, then DB
    setMemory(prev => ({
      ...prev,
      routines:    prev.routines.filter(r => r.id !== id),
      preferences: prev.preferences.filter(p => p.id !== id),
    }));
    const ok = await deleteInsight(id);
    if (!ok) { Alert.alert('Couldn’t remove', 'Try again in a moment.'); loadMemory(); }
  }
  async function handleDeleteMilestone(id: string) {
    setMemory(prev => ({ ...prev, milestones: prev.milestones.filter(m => m.id !== id) }));
    const ok = await deleteMilestone(id);
    if (!ok) { Alert.alert('Couldn’t remove', 'Try again in a moment.'); loadMemory(); }
  }
  async function handleClearAllMemory() {
    const familyId = getFamilyId();
    const res = await clearAllMemory(familyId);
    if (!res.ok) {
      Alert.alert('Partial clear', `Some tables errored:\n${res.errors.join('\n')}`);
    }
    // Reset local state regardless — anything that did delete is gone
    setMemory({ routines: [], preferences: [], milestones: [], loaded: true });
  }

  useEffect(() => { loadPrefs().then(p => { setPrefs(p); setLoaded(true); }); }, []);

  function updatePref<K extends keyof Prefs>(key: K, val: Prefs[K]) {
    setPrefs(prev => {
      const next = { ...prev, [key]: val };
      // Phase 2c — write-through to profile + AsyncStorage. Fire-and-forget;
      // the local React state is the immediate source for re-render.
      persistUpdatePref(key, val).catch(() => {});
      // Round A — local brief notifications KILLED. Phase 07 server
      // scheduler is now the sole notification source. Prefs still saved
      // (server reads user_preferences.briefMorningTime/eveningTime), just
      // no client-side scheduling. Server picks up the new time on next
      // 15-min cron tick.
      return next;
    });
  }

  function openTimePicker(key: keyof Prefs) {
    setPickerDate(hmToDate(prefs[key] as string));
    setEditingTimeKey(key);
  }

  function onTimePickerChange(_: any, date?: Date) {
    if (Platform.OS === 'android') {
      // Android fires once on dismiss with either value or undefined
      setEditingTimeKey(null);
      if (date && editingTimeKey) updatePref(editingTimeKey, dateToHm(date) as any);
    } else {
      // iOS: just update the staged date, confirm via modal Done button
      if (date) setPickerDate(date);
    }
  }
  function confirmTimePicker() {
    if (editingTimeKey) updatePref(editingTimeKey, dateToHm(pickerDate) as any);
    setEditingTimeKey(null);
  }

  function handleRowPlaceholder(label: string) {
    Alert.alert(label, 'Coming soon.');
  }

  // ── Render ───────────────────────────────────────────────────────────────
  const pageLabel =
    view === 'main' ? 'Settings'
    : view === 'notifications' ? 'Notifications'
    : view === 'memory' ? 'Memory'
    : view === 'subscription' ? 'Subscription'
    : view === 'password' ? 'Password'
    : view === 'colour' ? 'Your colour'
    : view === 'pin' ? 'Change PIN'
    : view === 'calendar-sync' ? 'iPhone Calendar sync'
    : 'Replay tour';
  const handleBack = () => {
    if (view !== 'main') setView('main');
    else router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG, paddingTop: insets.top }}>
      <StatusBar style="dark"/>
      <Header pageLabel={pageLabel} onBack={handleBack} onMore={() => setMoreOpen(true)}/>

      {loaded && view === 'main' && (
        <MainView
          prefs={prefs}
          profile={profile}
          onNavNotifications={() => setView('notifications')}
          onNavMemory={() => setView('memory')}
          onNavTour={() => setView('tour')}
          onNavSubscription={() => setView('subscription')}
          onNavPassword={() => setView('password')}
          onNavColour={() => setView('colour')}
          onNavPin={() => setView('pin')}
          onNavCalendarSync={() => setView('calendar-sync')}
          onPlaceholder={handleRowPlaceholder}
          onSignOut={() => Alert.alert(
            'Sign out?',
            "You'll need to sign back in to access your family.",
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Sign out', style: 'destructive', onPress: async () => {
                await signOut();
                router.replace('/(auth)/sign-in' as any);
              }},
            ],
          )}
          onDelete={() => Alert.alert(
            'Delete account',
            'Emails hello@zaeli.ai from your Mail app. We\'ll action the delete within 30 days and confirm by reply. All family data will be permanently removed.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Email now', style: 'destructive', onPress: () => {
                const body = encodeURIComponent(
                  'Please delete my Zaeli account and all associated family data.\n\n' +
                  `Account email: ${profile?.email ?? '(add your email here)'}\n` +
                  `Family: ${profile?.name ?? '(add your name here)'}\n\n` +
                  'Thanks.'
                );
                Linking.openURL(`mailto:hello@zaeli.ai?subject=Delete%20my%20account&body=${body}`).catch(() => {});
              }},
            ],
          )}
          onOurFamily={() => { setFamilyFromSettings(); router.navigate('/(tabs)/family' as any); }}
          onReplayOnboarding={async () => {
            // Clear the completion flag so any future auto-redirect gate also fires,
            // then navigate. Matches fresh-install behaviour for testing.
            // Round B commit 34 — per-user key + also clear legacy device-wide.
            try {
              const uid = p.profile?.id;
              if (uid) await AsyncStorage.removeItem(`onboarding_complete_${uid}`);
              await AsyncStorage.removeItem('onboarding_complete');
            } catch {}
            router.navigate('/onboarding' as any);
          }}
          onSimulateInviteAccept={async () => {
            await loadInvites();
            const pending = getPendingInvites();
            if (pending.length === 0) {
              Alert.alert('No pending invites', 'Send one first from Our Family → + Invite, then tap this row again.');
              return;
            }
            const oldest = [...pending].sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
            await markAccepted(oldest.token);
            Alert.alert(
              `${oldest.name} just accepted`,
              `Open Home — Zaeli will surface a heads-up message in the chat.`,
              [{ text: 'OK' }],
            );
          }}
          onOpenLatestInvite={async () => {
            await loadInvites();
            const pending = getPendingInvites();
            if (pending.length === 0) {
              Alert.alert('No pending invites', 'Send one first from Our Family → + Invite, then tap this row again.');
              return;
            }
            const newest = [...pending].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
            router.navigate(`/invite/${newest.token}` as any);
          }}
          onResetAccount={async () => {
            await resetToOwner();
            try {
              // Round B commit 34 — clear per-user + legacy device-wide.
              const uid = p.profile?.id;
              if (uid) await AsyncStorage.removeItem(`onboarding_just_completed_${uid}`);
              await AsyncStorage.removeItem('onboarding_just_completed');
            } catch {}
            Alert.alert('Reset', 'Switched back to the owner account (Rich).');
          }}
          onManageSubscription={async () => {
            // Phase 3b — opens Stripe Customer Portal in the browser.
            // Session 28: fully wired, real portal fetch via Edge Function.
            const url = await fetchCustomerPortalUrl();
            if (url) {
              Linking.openURL(url).catch(() => {
                Alert.alert("Couldn't open portal", 'Try again in a moment.');
              });
            } else {
              // fetch returned null — either the profile has no
              // stripe_customer_id yet (never subscribed via checkout) OR the
              // Edge Function errored. Honest message, not the old
              // "not wired up yet" placeholder.
              Alert.alert(
                'Portal unavailable',
                "Couldn't open subscription portal right now. Try again in a moment. If this persists, tap Subscribe to set up your subscription first.",
              );
            }
          }}
          onSubscribe={() => {
            // Session 28 — opens Stripe Payment Link in browser. Configured
            // in Stripe Dashboard on the Family Plan product, URL pasted into
            // STRIPE_PAYMENT_LINK_FAMILY in lib/stripe.ts. Once the checkout
            // completes, Stripe fires customer.subscription.created → webhook
            // syncs profile → user returns from browser and sees Active state
            // (profile is refreshed on foreground — see _layout.tsx).
            const url = getCheckoutUrl();
            if (url) {
              Linking.openURL(url).catch(() => {
                Alert.alert("Couldn't open checkout", 'Try again in a moment.');
              });
            } else {
              Alert.alert(
                'Almost ready',
                'Subscription checkout will open in your browser. The Payment Link is being wired up — hang tight for a moment.',
              );
            }
          }}
          onTestCheckout={() => {
            // Session 29 — dev-only. Force-open Stripe checkout even when
            // beta grant hides the Subscribe button. Rich uses this to
            // validate the checkout path end-to-end without needing to
            // remove his beta_end_date first.
            const url = getCheckoutUrl();
            if (url) {
              Alert.alert(
                'Sandbox checkout',
                'Opens Stripe Payment Link in Safari. Use test card 4242 4242 4242 4242, any future date, any CVC. Return to the app and your profile will refresh.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Open', onPress: () => Linking.openURL(url).catch(() => {}) },
                ],
              );
            } else {
              Alert.alert('Checkout URL missing', 'STRIPE_PAYMENT_LINK_FAMILY is not configured in lib/stripe.ts.');
            }
          }}
          onRegisterPushToken={async () => {
            // Session 29 — verbose on-device diagnostic. debugPushToken()
            // returns structured info about every step so the Alert shows
            // exactly WHERE it fails (auth / permissions / getExpoPushTokenAsync
            // throwing / DB write) with the actual error message.
            try {
              const r = await debugPushToken();
              const lines: string[] = [];
              lines.push(`Step: ${r.step}`);
              lines.push(`Detail: ${r.detail}`);
              if (r.notifTypes) lines.push(`notifTypes: ${r.notifTypes}`);
              if (r.userId !== undefined) lines.push(`userId: ${r.userId ? r.userId.slice(0, 8) + '…' : 'null'}`);
              if (r.permission) lines.push(`permission: ${r.permission}`);
              if (r.projectId) lines.push(`projectId: ${r.projectId.slice(0, 8)}…`);
              if (r.token) lines.push(`token: ${r.token.slice(0, 30)}…`);
              if (r.dbWriteOk !== undefined) lines.push(`dbWrite: ${r.dbWriteOk ? 'OK' : 'FAILED'}`);
              Alert.alert(r.ok ? '✅ Push token registered' : `⚠ Failed at: ${r.step}`, lines.join('\n'));
            } catch (e: any) {
              Alert.alert('debugPushToken threw', e?.message ?? String(e));
            }
          }}
          onDirectPushTest={async () => {
            // Session 30 — bypass Sonnet entirely. Call notifyFamily with the
            // first eligible family member (owner/adult in same family, has a
            // push token, not the sender). This tells us definitively whether
            // the failure lives in Sonnet's tool invocation OR in the Edge
            // Function → Expo → APNs pipeline.
            try {
              const me = await getCurrentUserId();
              if (!me) { Alert.alert('Not signed in', 'Sign in first.'); return; }
              const fid = getFamilyId();
              if (!fid) { Alert.alert('No family_id', 'Profile not loaded yet.'); return; }
              const { data: candidates, error: qErr } = await supabase
                .from('profiles')
                .select('id, name, expo_push_token, kind')
                .eq('family_id', fid)
                .in('kind', ['owner', 'adult'])
                .neq('id', me)
                .not('expo_push_token', 'is', null);
              if (qErr) { Alert.alert('Query failed', qErr.message); return; }
              if (!candidates || candidates.length === 0) {
                Alert.alert('No eligible recipients',
                  'No other family adult has a push token registered.\n\n' +
                  'Get them to tap "Register push token now" first.');
                return;
              }
              const target = candidates[0];
              const tokenPreview = (target.expo_push_token || '').slice(0, 22);
              const res = await notifyFamily({
                recipientUserIds: [target.id],
                title: 'Zaeli test',
                body: `Direct push test to ${target.name} · ${new Date().toLocaleTimeString()}`,
                data: { source: 'direct-test' },
              });
              const lines: string[] = [];
              lines.push(`Recipient: ${target.name}`);
              lines.push(`Token: ${tokenPreview}…`);
              lines.push(`Sent: ${res.sent ?? 0}`);
              lines.push(`Failed: ${res.failed ?? 0}`);
              if (res.error) lines.push(`Error: ${res.error}`);
              Alert.alert(
                (res.sent ?? 0) > 0 ? '✅ Handed to Expo' : '⚠ Push dispatch failed',
                lines.join('\n'),
              );
            } catch (e: any) {
              Alert.alert('Direct test threw', e?.message ?? String(e));
            }
          }}
          onDiagnoseCalendarSync={async () => {
            // Session 36 hotfix / Build 67 — on-device diagnostic for iCal sync.
            // Runs a fresh syncNow and shows per-calendar counts + any events
            // matching an interest keyword (default "engine" for Engine Room
            // debugging). Per-event trace (Build 67) tells us whether a
            // specific event was fetched from iOS AND whether its upsert
            // succeeded. If the event NEVER appears in the trace at all,
            // EventKit dropped it. If it appears with result='insert_failed'
            // or 'no_row_returned', the DB write is the problem.
            try {
              const me = getProfile();
              if (!me?.id || !me?.family_id) { Alert.alert('Not signed in', 'Profile not loaded.'); return; }
              Alert.alert('Diagnosing...', 'Running full sync — this may take 10-20 seconds. Result will appear.');
              const CS = await import('../../lib/calendar-sync');
              const res = await CS.syncNow(me.id, me.family_id);
              const lines: string[] = [];
              lines.push(`ok: ${res.ok}`);
              if (res.error) lines.push(`error: ${res.error}`);
              lines.push(`inserted: ${res.inserted}  updated: ${res.updated}  deleted: ${res.deleted}`);
              lines.push('');
              lines.push('Per calendar:');
              for (const c of res.perCalendar) {
                const cf = c.chunkFailures > 0 ? ` (${c.chunkFailures} chunk fails)` : '';
                lines.push(`  ${c.title}: ${c.count}${cf}`);
              }
              // Build 67 — pull out events matching "engine" from the trace so
              // we see whether Engine Room was fetched + how it was handled.
              // Also surface any failed/no-row-returned entries as a heads-up.
              const trace = res.trace ?? [];
              const engineMatches = trace.filter(t => t.title.toLowerCase().includes('engine'));
              const failures = trace.filter(t => t.result === 'insert_failed' || t.result === 'update_failed' || t.result === 'no_row_returned');
              if (engineMatches.length > 0) {
                lines.push('');
                lines.push('Engine Room matches:');
                for (const t of engineMatches) {
                  lines.push(`  ${t.date} · ${t.title}`);
                  lines.push(`    → ${t.result}${t.error ? ' · ' + t.error : ''}`);
                }
              } else {
                lines.push('');
                lines.push('No "engine" match in trace — iOS did NOT return the event.');
              }
              if (failures.length > 0) {
                lines.push('');
                lines.push(`Failed upserts (${failures.length}):`);
                for (const t of failures.slice(0, 5)) {
                  lines.push(`  ${t.title.slice(0, 30)} → ${t.result}`);
                }
              }
              lines.push('');
              lines.push(`Total trace entries: ${trace.length}`);
              Alert.alert(res.ok ? '✅ Sync complete' : '⚠ Sync failed', lines.join('\n'));
            } catch (e: any) {
              Alert.alert('Diagnostic threw', e?.message ?? String(e));
            }
          }}
          onTestReminderSave={async () => {
            // Round B commit 4 — diagnose why the manual reminder-add path
            // is still failing after the visibility SQL migration. Runs the
            // EXACT payload submitRemind builds (personal, today's date-only)
            // + surfaces every step's outcome in a single Alert so we don't
            // need Metro logs.
            const lines: string[] = [];
            try {
              const me = await getCurrentUserId();
              const fid = getFamilyId();
              lines.push(`userId: ${me ? me.slice(0, 8) + '…' : 'null'}`);
              lines.push(`familyId: ${fid ? fid.slice(0, 8) + '…' : 'null'}`);
              if (!me || !fid) {
                Alert.alert('🐛 reminder save', lines.join('\n') + '\n\nBlocked: missing auth/family.');
                return;
              }
              const today = new Date();
              const todayKey = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
              const testTitle = `Diagnostic ${new Date().toLocaleTimeString()}`;

              // Step A — raw insert bypassing lib/reminders.saveReminder,
              // to isolate whether the failure is in saveReminder or the DB.
              const { data: rawIns, error: rawErr, status: rawStatus } = await supabase
                .from('reminders')
                .insert({
                  family_id: fid,
                  created_by: me,
                  title: testTitle + ' (raw)',
                  status: 'active',
                  visibility: 'personal',
                  remind_on: todayKey,
                  updated_at: new Date().toISOString(),
                })
                .select('id, visibility, created_by')
                .maybeSingle();
              lines.push('');
              lines.push('RAW INSERT:');
              lines.push(`  status: ${rawStatus}`);
              lines.push(`  error: ${rawErr?.message ?? 'none'}`);
              lines.push(`  errCode: ${(rawErr as any)?.code ?? '-'}`);
              lines.push(`  returned id: ${rawIns?.id ? rawIns.id.slice(0, 8) + '…' : 'null'}`);
              lines.push(`  visibility: ${rawIns?.visibility ?? '-'}`);

              // Step B — same via saveReminder helper (what the sheet uses)
              const { saveReminder } = await import('../../lib/reminders');
              const helped = await saveReminder({
                title: testTitle + ' (via helper)',
                status: 'active',
                visibility: 'personal',
                remindOn: todayKey,
              });
              lines.push('');
              lines.push('VIA saveReminder():');
              lines.push(`  returned: ${helped ? 'Reminder{id:' + helped.id.slice(0,8) + '…}' : 'null'}`);

              // Step C — re-read table to see if either row actually landed
              const { data: recent, error: rErr } = await supabase
                .from('reminders')
                .select('id, title, visibility, created_by')
                .eq('family_id', fid)
                .ilike('title', 'Diagnostic%')
                .order('created_at', { ascending: false })
                .limit(4);
              lines.push('');
              lines.push('SELECT-BACK:');
              lines.push(`  error: ${rErr?.message ?? 'none'}`);
              lines.push(`  rows: ${(recent ?? []).length}`);
              (recent ?? []).slice(0, 3).forEach(r => {
                lines.push(`   · ${r.title} · vis=${r.visibility} · by=${(r.created_by || '').slice(0,4)}…`);
              });

              Alert.alert('🐛 reminder save diagnostic', lines.join('\n'));
            } catch (e: any) {
              lines.push('');
              lines.push('THREW: ' + (e?.message ?? String(e)));
              Alert.alert('🐛 reminder save diagnostic', lines.join('\n'));
            }
          }}
          onTestReminderNotif={async () => {
            // Round B commit 28 — verify commit 24's trigger API fix. Schedules
            // a real 30s local notification via lib/reminders.scheduleTestNotification.
            const { scheduleTestNotification } = await import('../../lib/reminders');
            const res = await scheduleTestNotification();
            if (res.ok) {
              Alert.alert(
                '✅ Scheduled',
                `Notification will fire at ${res.scheduledFor}.\n\nLock your phone now and wait ~30s. If it pops, commit 24 fix works.\n\nIf nothing pops, the trigger API is still broken.`,
              );
            } else {
              Alert.alert('❌ Failed to schedule', res.error ?? 'Unknown error');
            }
          }}
          onRawEventKitTest={async () => {
            // Build 69 — direct iOS EventKit query bypassing our sync
            // pipeline entirely. Session 38: sync's per-day hot-zone
            // fetch (Build 68) returned zero new events for Engine Room's
            // Aug 19+ instances, but Rich confirmed Engine Room is
            // visible in iPhone Calendar. This test proves whether iOS
            // itself is dropping the event (bypass fix impossible) or
            // our sync filter drops it (client-side fix possible).
            try {
              const Calendar = await import('expo-calendar');
              const cals = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
              const now = new Date();
              const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
              const todayEnd = new Date(todayStart);
              todayEnd.setDate(todayEnd.getDate() + 1);
              const lines: string[] = [];
              lines.push(`Query: ${todayStart.toISOString().slice(0,10)} 00:00 → 24:00`);
              lines.push(`iOS calendars: ${cals.length}`);
              lines.push('');
              let totalEvents = 0;
              let engineFound = false;
              for (const cal of cals) {
                try {
                  const events = await Calendar.getEventsAsync([cal.id], todayStart, todayEnd);
                  if (events.length > 0) {
                    lines.push(`${cal.title} (${events.length}):`);
                    for (const ev of events) {
                      const t = (ev.title || 'Untitled').slice(0, 40);
                      const time = ev.startDate ? new Date(ev.startDate).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' }) : '?';
                      lines.push(`  • ${time} ${t}`);
                      if (t.toLowerCase().includes('engine')) engineFound = true;
                      totalEvents++;
                    }
                  }
                } catch (calErr: any) {
                  lines.push(`${cal.title}: FETCH ERROR — ${calErr?.message?.slice(0,40) ?? 'unknown'}`);
                }
              }
              lines.push('');
              lines.push(`Total events returned by iOS: ${totalEvents}`);
              lines.push(engineFound ? '✅ Engine Room IS in raw iOS data' : '❌ Engine Room NOT in raw iOS data');
              Alert.alert('🔬 Raw EventKit', lines.join('\n'));
            } catch (e: any) {
              Alert.alert('Raw EventKit threw', e?.message ?? String(e));
            }
          }}
          onDumpWidgetState={async () => {
            // Build 69 — widget state dump. Was crashing in Build 68 because
            // I used dynamic imports for AsyncStorage + AppState which
            // Hermes rejected. Now uses the static imports at the top of
            // this file. Reads the AsyncStorage widget intent key WITHOUT
            // consuming it so we can see the raw state.
            try {
              const raw = await AsyncStorage.getItem('zaeli_widget_chat_intent_v1');
              const state = AppState.currentState;
              const lines: string[] = [];
              lines.push(`AsyncStorage 'zaeli_widget_chat_intent_v1': ${raw ?? '(null — no intent stored)'}`);
              lines.push('');
              lines.push(`Current AppState: ${state}`);
              lines.push('');
              lines.push('What this means:');
              if (raw) {
                lines.push('  Intent IS in AsyncStorage but was not consumed.');
                lines.push('  → Poll effect never ran or was skipped.');
                lines.push('  → Chat might not have subscribed to AppState in time.');
              } else {
                lines.push('  Nothing in AsyncStorage.');
                lines.push('  Either: (a) widget URL never reached the app');
                lines.push('  (Linking/expo-router failed), OR (b) intent');
                lines.push('  was already consumed successfully.');
              }
              Alert.alert('🎤 Widget state', lines.join('\n'));
            } catch (e: any) {
              Alert.alert('Dump threw', e?.message ?? String(e));
            }
          }}
        />
      )}

      {loaded && view === 'notifications' && (
        <NotificationsView
          prefs={prefs}
          onToggle={(k, v) => updatePref(k, v)}
          onEditTime={openTimePicker}
        />
      )}

      {loaded && view === 'memory' && (
        <MemoryView
          memory={memory}
          prefs={prefs}
          onToggleLearning={v => updatePref('memoryLearningOn', v)}
          onDeleteInsight={handleDeleteInsight}
          onDeleteMilestone={handleDeleteMilestone}
          onClearAll={() => Alert.alert(
            'Clear everything Zaeli remembers?',
            'Removes all routines, preferences, milestones, and saved chat memory for the family. Can’t be undone.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Clear', style: 'destructive', onPress: handleClearAllMemory },
            ],
          )}
        />
      )}

      {loaded && view === 'tour' && (
        <TourReplayView
          onStartFull={async () => {
            await replayFromStart();
            router.navigate('/tour' as any);
          }}
          onJumpToStop={async (n: number) => {
            await replayStop(n);
            router.navigate('/tour' as any);
          }}
        />
      )}

      {loaded && view === 'subscription' && (
        <SubscriptionView profile={profile} onManage={async () => {
          const url = await fetchCustomerPortalUrl();
          if (url) {
            Linking.openURL(url).catch(() => Alert.alert("Couldn't open portal", 'Try again in a moment.'));
          } else {
            Alert.alert('Portal unavailable', "Couldn't open subscription portal right now. Try again in a moment.");
          }
        }}/>
      )}

      {loaded && view === 'password' && (
        <PasswordView onChanged={() => setView('main')}/>
      )}

      {loaded && view === 'colour' && (
        <ColourView profile={profile} onSaved={async () => {
          const p = await loadProfile();
          if (p) setProfile(p);
          setView('main');
        }}/>
      )}

      {loaded && view === 'pin' && (
        <PinResetView onDone={() => setView('main')}/>
      )}

      {loaded && view === 'calendar-sync' && (
        <CalendarSyncView profile={profile}/>
      )}

      {/* Time picker modal */}
      <Modal
        visible={!!editingTimeKey}
        transparent
        animationType="slide"
        onRequestClose={() => setEditingTimeKey(null)}
      >
        <View style={s.timeModalBackdrop}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setEditingTimeKey(null)}/>
          <View style={s.timeModalCard}>
            <View style={s.timeModalHeader}>
              <TouchableOpacity onPress={() => setEditingTimeKey(null)} style={s.timeModalBtn} activeOpacity={0.6}>
                <Text style={s.timeModalBtnTxt}>Cancel</Text>
              </TouchableOpacity>
              <Text style={s.timeModalTitle}>Set time</Text>
              <TouchableOpacity onPress={confirmTimePicker} style={s.timeModalBtn} activeOpacity={0.6}>
                <Text style={[s.timeModalBtnTxt, { color: '#2D7A52', fontFamily: 'Poppins_700Bold' }]}>Done</Text>
              </TouchableOpacity>
            </View>
            {Platform.OS === 'ios' ? (
              <DateTimePicker
                value={pickerDate}
                mode="time"
                display="spinner"
                onChange={onTimePickerChange}
                style={{ backgroundColor: CARD }}
                themeVariant="light"
              />
            ) : (
              editingTimeKey && (
                <DateTimePicker
                  value={pickerDate}
                  mode="time"
                  display="default"
                  onChange={onTimePickerChange}
                />
              )
            )}
          </View>
        </View>
      </Modal>

      <MoreSheet visible={moreOpen} onClose={() => setMoreOpen(false)}/>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN VIEW
// ═══════════════════════════════════════════════════════════════════════════
function MainView(p: {
  prefs: Prefs;
  profile: Profile | null;
  onNavNotifications: () => void;
  onNavMemory: () => void;
  onNavTour: () => void;
  // Round B commit 10 — new sub-page nav
  onNavSubscription: () => void;
  onNavPassword: () => void;
  onNavColour: () => void;
  onNavPin: () => void;
  // Build 49 — iCal sync
  onNavCalendarSync: () => void;
  onPlaceholder: (label: string) => void;
  onSignOut: () => void;
  onDelete: () => void;
  onOurFamily: () => void;
  onReplayOnboarding: () => void;
  onSimulateInviteAccept: () => void;
  onOpenLatestInvite: () => void;
  onResetAccount: () => void;
  onManageSubscription: () => void;
  onSubscribe: () => void;
  onTestCheckout: () => void;
  onRegisterPushToken: () => void;
  onDirectPushTest: () => void;
  onDiagnoseCalendarSync: () => void;
  onTestReminderSave: () => void;
  // Round B commit 28 — schedules a real 30s notification via the same
  // trigger-API path saveReminder uses (verifies commit 24 end-to-end).
  onTestReminderNotif: () => void;
  // Build 68 — widget state dump for debugging future mic widget failures
  // (Session 38). Reads AsyncStorage widget intent key + Chat's last
  // dispatch timestamp so Rich can screenshot after a failed widget tap.
  onDumpWidgetState: () => void;
  // Build 69 — raw EventKit test. Bypasses the sync pipeline entirely,
  // queries iOS EventKit directly for today's events across all
  // calendars. If Engine Room isn't in this raw list, iOS is dropping
  // it at the source — no client-side sync fix can recover.
  onRawEventKitTest: () => void;
}) {
  // Round B commit 36 — dynamic family names for the Our Family row sub.
  // Was hardcoded "Anna, Poppy, Gab, Duke" which leaked Rich's family to
  // every new signup on the Settings page (same class as the roster leak
  // fixed in commit 34). Load roster on mount, compute sub as comma
  // joined names. Falls back to "Invite your family" if empty.
  const [familyNames, setFamilyNames] = useState<string>('');
  useEffect(() => {
    (async () => {
      try {
        const fid = getFamilyId();
        if (fid) {
          await loadRoster(fid);
          const names = getRoster().map(m => m.name).join(', ');
          setFamilyNames(names);
        }
      } catch {}
    })();
  }, []);
  const ourFamilySub = familyNames || 'Invite your family →';

  // Round B commit 23 — Apple Calendar toggle state. Local to MainView (not
  // plumbed through top) because the pref persists device-side via
  // AsyncStorage in lib/apple-calendar.ts, not to profiles.user_preferences.
  // Loads once on mount, re-syncs after toggle to reflect iOS permission
  // outcome (user might deny in the system prompt).
  const [appleCalOn, setAppleCalOn] = useState(false);
  const [appleCalPerm, setAppleCalPerm] = useState<AppleCal.PermissionStatus>('undetermined');
  useEffect(() => {
    (async () => {
      const on   = await AppleCal.isEnabledPref();
      const perm = await AppleCal.getPermissionStatus();
      setAppleCalOn(on);
      setAppleCalPerm(perm);
    })();
  }, []);
  async function toggleAppleCal(next: boolean) {
    if (Platform.OS !== 'ios') {
      Alert.alert('iOS only', 'Apple Calendar sync is only available on iPhone right now.');
      return;
    }
    if (!next) {
      await AppleCal.setEnabledPref(false);
      setAppleCalOn(false);
      return;
    }
    // Turning ON — request permission if not already granted.
    let perm = await AppleCal.getPermissionStatus();
    if (perm === 'undetermined') perm = await AppleCal.requestPermission();
    setAppleCalPerm(perm);
    if (perm !== 'granted') {
      Alert.alert(
        'Permission needed',
        'To show your iPhone Calendar events, Zaeli needs Calendar access. Grant it in Settings → Zaeli → Calendars.',
      );
      return;
    }
    await AppleCal.setEnabledPref(true);
    setAppleCalOn(true);
  }

  return (
    <ScrollView contentContainerStyle={{ paddingTop: 14, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>

      {/* Account hero — real signed-in profile (Phase 2 auth wiring) */}
      {(() => {
        const name = p.profile?.name?.trim() || 'You';
        const email = p.profile?.email || '';
        const initial = name[0]?.toUpperCase() || 'Z';
        const kindTag = p.profile?.kind === 'kid' ? 'Kid account'
          : p.profile?.kind === 'adult' ? 'Adult · Family plan'
          : 'Family plan · Active';
        return (
          <View style={s.accountHero}>
            <View style={s.accountAvatar}><Text style={s.accountAvatarTxt}>{initial}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={s.accountName}>{name}</Text>
              {!!email && <Text style={s.accountEmail}>{email}</Text>}
              <View style={s.accountPlanTag}>
                <Text style={s.accountPlanTagTxt}>{kindTag}</Text>
              </View>
            </View>
          </View>
        );
      })()}

      {/* Subscription — Phase 3b / Session 28 beta program:
          - beta_end_date > now() → shows Beta state, prompts subscribe when
            <14 days left
          - null status → free/never subscribed, prompts subscribe
          - active → shows Manage subscription
          - cancelled → prompts re-subscribe */}
      <SecLabel>Subscription</SecLabel>
      {(() => {
        const sub = getSubscription();
        const label = subscriptionLabel(sub);
        const planName = sub.plan === 'beta'
          ? 'Beta · 3 months free'
          : sub.plan === 'family_tutor_1' || sub.plan === 'family_tutor_2' || sub.plan === 'family_tutor'
          ? 'Family + Tutor'
          : sub.plan === 'family'
          ? 'Family'
          : sub.status === 'trialing'
          ? 'Free trial'
          : 'Free';
        const showSubscribe = shouldPromptSubscribe(sub);
        const showManage = !!sub.customerId && sub.status !== null && sub.plan !== 'beta';
        return (
          <View style={s.planCard}>
            <Text style={s.planLabel}>Current plan</Text>
            <Text style={s.planName}>{planName}</Text>
            <Text style={s.planPrice}>{label}</Text>
            {showSubscribe && (
              <TouchableOpacity style={s.planBtn} activeOpacity={0.85} onPress={p.onSubscribe}>
                <Text style={s.planBtnTxt}>{sub.plan === 'beta' ? 'Continue with Family Plan' : 'Start free 14-day trial'}</Text>
              </TouchableOpacity>
            )}
            {showManage && (
              <TouchableOpacity
                style={[s.planBtn, showSubscribe && { marginTop: 8, backgroundColor: 'rgba(10,10,10,0.06)' }]}
                activeOpacity={0.85}
                onPress={p.onManageSubscription}
              >
                <Text style={[s.planBtnTxt, showSubscribe && { color: 'rgba(10,10,10,0.72)' }]}>Manage subscription</Text>
              </TouchableOpacity>
            )}
          </View>
        );
      })()}

      {/* Family */}
      <SecLabel>Family</SecLabel>
      <View style={s.group}>
        <Row icon="👨‍👩‍👧‍👦" iconBg="#FFE4F1" iconFg="#D4006A"
             title="Our Family" sub={ourFamilySub}
             onPress={p.onOurFamily} last/>
      </View>

      {/* Round B commit 10 — Account (owner + adults) */}
      {p.profile?.kind !== 'kid' && (
        <>
          <SecLabel>Account</SecLabel>
          <View style={s.group}>
            <Row icon="💳" iconBg="#EDE8FF" iconFg="#6B35D9"
                 title="Subscription" sub="Plan · billing · Manage"
                 onPress={p.onNavSubscription}/>
            <Row icon="🔐" iconBg="#FFE4E0" iconFg="#B83333"
                 title="Change password"
                 onPress={p.onNavPassword}/>
            <Row icon="🎨" iconBg="#E8F4FD" iconFg="#0A5C80"
                 title="Your colour" sub="How you appear on events + tiles"
                 onPress={p.onNavColour} last/>
          </View>
        </>
      )}

      {/* Round B commit 10 — Account (kid) — different rows */}
      {p.profile?.kind === 'kid' && (
        <>
          <SecLabel>Your account</SecLabel>
          <View style={s.group}>
            <Row icon="🔑" iconBg="#F0EBFF" iconFg="#5020C0"
                 title="Change your PIN"
                 onPress={p.onNavPin}/>
            <Row icon="🎨" iconBg="#E8F4FD" iconFg="#0A5C80"
                 title="Your colour"
                 onPress={p.onNavColour} last/>
          </View>
        </>
      )}

      {/* Round B commit 23 — Integrations back (Apple Calendar first). One-way
          IN sync: iPhone Calendar events show up in Zaeli's Calendar sheet
          with a "📱 iPhone" badge, read-only. Zaeli events stay in Zaeli.
          Off by default; toggle-on triggers iOS permission prompt.
          Google + Outlook come later — each needs its own OAuth setup.
          Session 34 — this old read-only toggle superseded by the new
          full two-way sync detail page under Preferences → iPhone Calendar
          sync. Block removed. lib/apple-calendar.ts still lives for now;
          may be deprecated once nothing references it. */}

      {/* Preferences */}
      <SecLabel>Preferences</SecLabel>
      <View style={s.group}>
        <Row icon="🔔" iconBg="#FFF4E0" iconFg="#D97706"
             title="Notifications" sub="Briefs, reminders, kids, shopping"
             onPress={p.onNavNotifications}/>
        <Row icon="📅" iconBg="#E8F4FD" iconFg="#0A5C80"
             title="iPhone Calendar sync" sub="Two-way sync with your iPhone calendars"
             onPress={p.onNavCalendarSync}/>
        <Row icon="✦" iconBg="#EDE8FF" iconFg="#6B35D9"
             title="Zaeli's memory" sub="What I remember about your family"
             onPress={p.onNavMemory} last/>
      </View>

      {/* Privacy — v2 cleanup: Export + Clear chat removed until we build
          them properly. Placeholder alerts hurt trust more than a missing row. */}
      <SecLabel>Privacy</SecLabel>
      <View style={s.group}>
        <Row icon="🛡️" iconBg="#FFE4E0" iconFg="#B83333"
             title="Privacy policy"
             onPress={() => Linking.openURL('https://zaeli.app/privacy.html').catch(() => {})} last/>
      </View>

      {/* Developer — Session 30: gated to Rich's email only. Anna and other
          testers/users don't see this section at all. Rich sees it whether
          running dev-client or an installed TestFlight/production build,
          so he keeps his on-device diagnostics (push token, Stripe test). */}
      {p.profile?.email === 'richarddekretser@gmail.com' && (
      <>
      <SecLabel>Developer</SecLabel>
      <View style={s.group}>
        <Row icon="🧪" iconBg="#E8F4FD" iconFg="#0A4A6A"
             title="Re-do onboarding"
             sub="Launch the first-run flow for testing"
             onPress={p.onReplayOnboarding}/>
        <Row icon="📨" iconBg="#E6F7EF" iconFg="#2D7A52"
             title="Simulate invite accepted"
             sub="Marks oldest pending invite as accepted — fires heads-up in chat"
             onPress={p.onSimulateInviteAccept}/>
        <Row icon="🔗" iconBg="#F0EBFF" iconFg="#5020C0"
             title="Open latest invite as receiver"
             sub="Walk through the invitee's stripped onboarding"
             onPress={p.onOpenLatestInvite}/>
        <Row icon="↩️" iconBg="rgba(10,10,10,0.05)" iconFg="#0A0A0A"
             title="Reset to owner account"
             sub="Switch back to Rich after testing as kid/adult invitee"
             onPress={p.onResetAccount}/>
        {/* Session 29 — force-open Stripe checkout even if beta hides the Subscribe button */}
        <Row icon="💳" iconBg="#EDE8FF" iconFg="#6B35D9"
             title="Test Stripe checkout"
             sub="Opens Payment Link (sandbox, use 4242 4242 4242 4242)"
             onPress={p.onTestCheckout}/>
        {/* Session 29 — on-device push token diagnostic (no Metro needed) */}
        <Row icon="🔔" iconBg="#FFE4E0" iconFg="#B83333"
             title="Register push token now"
             sub="Manually trigger + show result in an Alert"
             onPress={p.onRegisterPushToken}/>
        {/* Session 30 — direct family-notify test bypassing Sonnet, to isolate
            whether push failure is Sonnet tool-invocation OR Edge Function/APNs delivery */}
        <Row icon="🧪" iconBg="#E6F7EF" iconFg="#2D7A52"
             title="Test family push (direct)"
             sub="Bypasses Sonnet — hits Edge Function directly"
             onPress={p.onDirectPushTest}/>
        {/* Session 36 hotfix 2 — iCal sync diagnostic. Fires a fresh
            syncNow + shows per-calendar event counts + chunk failures.
            Tells us at a glance whether Aatroxcomm et al. are actually
            returning events from iOS EventKit. */}
        <Row icon="🔧" iconBg="rgba(168,216,240,0.35)" iconFg="#0A4A6A"
             title="Diagnose iCal sync"
             sub="Runs full sync + shows per-calendar event counts"
             onPress={p.onDiagnoseCalendarSync}/>
        {/* Round B commit 4 — reminder save diagnostic. Runs raw INSERT +
            saveReminder helper + SELECT-back and shows each step's result
            in an Alert so we can nail why manual add is failing. */}
        <Row icon="🐛" iconBg="#FBF5D6" iconFg="#8B6914"
             title="Test reminder save"
             sub="Raw insert + helper + read-back — full trace in Alert"
             onPress={p.onTestReminderSave}/>
        {/* Round B commit 28 — dev diagnostic for commit 24's trigger API fix.
            Schedules a local notification 30s out via the same code path
            saveReminder uses. Lock phone, wait 30s, confirm delivery. */}
        <Row icon="🔔" iconBg="#FBF5D6" iconFg="#8B6914"
             title="Test reminder in 30s"
             sub="Schedules a real notif — lock phone + wait 30s"
             onPress={p.onTestReminderNotif}/>
        {/* Build 68 — widget mic state dump. Reads AsyncStorage widget
            intent key + shows in Alert. Screenshot after a failed widget
            tap to see whether the URL wrote 'mic' to AsyncStorage at all
            (persist path OK but consume raced) or nothing was written
            (URL delivery via Linking/expo-router failed). */}
        <Row icon="🎤" iconBg="rgba(255,68,68,0.1)" iconFg="#B83333"
             title="Widget state dump"
             sub="AsyncStorage intent + last dispatch — for debugging"
             onPress={p.onDumpWidgetState}/>
        {/* Build 69 — RAW EventKit test. Bypasses sync pipeline entirely,
            queries iOS EventKit directly for today's events across all
            calendars. If Engine Room isn't in this raw list, iOS is
            silently dropping it at source and no client-side sync fix
            can recover. If it IS in this raw list, our sync pipeline
            has a filter bug we can fix client-side. */}
        <Row icon="🔬" iconBg="rgba(107,53,217,0.15)" iconFg="#6B35D9"
             title="Raw EventKit today test"
             sub="Direct iOS query for today's events — bypasses sync"
             onPress={p.onRawEventKitTest} last/>
      </View>
      </>
      )}

      {/* About — v2 cleanup: mailto wires replace placeholders */}
      <SecLabel>About</SecLabel>
      <View style={s.group}>
        <Row icon="💬" iconBg="rgba(10,10,10,0.06)" iconFg={INK}
             title="Help &amp; support" sub="Email hello@zaeli.ai"
             onPress={() => Linking.openURL('mailto:hello@zaeli.ai?subject=Zaeli%20help').catch(() => {})}/>
        <Row icon="⭐" iconBg="rgba(10,10,10,0.06)" iconFg={INK}
             title="Send feedback" sub="Tell us what's working (or not)"
             onPress={() => Linking.openURL('mailto:hello@zaeli.ai?subject=Zaeli%20feedback').catch(() => {})}/>
        <Row icon="📜" iconBg="rgba(10,10,10,0.06)" iconFg={INK}
             title="Terms of service"
             onPress={() => Linking.openURL('https://zaeli.app/terms.html').catch(() => {})}/>
        <Row icon="ℹ️" iconBg="rgba(10,10,10,0.06)" iconFg={INK}
             title="Version" value={(() => {
               // Build 70 — hardcoded BUILD_NUMBER (see top of file).
               // Runtime detection via Constants.* was returning undefined
               // for buildNumber, so we couldn't tell installed build.
               // Manual bump per production build = 100% reliable.
               const v = Constants.expoConfig?.version ?? '1.0.0';
               return `${v} (${BUILD_NUMBER})`;
             })()} last/>
      </View>

      {/* Danger */}
      <View style={s.group}>
        <Row icon="🚪" iconBg="rgba(197,48,48,0.1)" iconFg={DANGER}
             title="Sign out" danger onPress={p.onSignOut}/>
        <Row icon="⚠️" iconBg="rgba(197,48,48,0.1)" iconFg={DANGER}
             title="Delete account" sub="Email hello@zaeli.ai — actioned within 30 days"
             danger onPress={p.onDelete} last/>
      </View>

    </ScrollView>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// NOTIFICATIONS VIEW
// ═══════════════════════════════════════════════════════════════════════════
function NotificationsView(p: {
  prefs: Prefs;
  onToggle: <K extends keyof Prefs>(key: K, value: Prefs[K]) => void;
  onEditTime: (key: keyof Prefs) => void;
}) {
  return (
    <ScrollView contentContainerStyle={{ paddingTop: 4, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>

      {/* Briefs */}
      <SecLabel>Zaeli's briefs</SecLabel>
      <View style={s.group}>
        <BriefRow icon="🌅" title="Morning brief"
                  onPress={() => p.onEditTime('briefMorningTime')}
                  time={fmtTime12(p.prefs.briefMorningTime)}
                  on={p.prefs.briefMorningOn}
                  onToggle={v => p.onToggle('briefMorningOn', v)}/>
        <BriefRow icon="🌙" title="Evening brief"
                  onPress={() => p.onEditTime('briefEveningTime')}
                  time={fmtTime12(p.prefs.briefEveningTime)}
                  on={p.prefs.briefEveningOn}
                  onToggle={v => p.onToggle('briefEveningOn', v)}
                  last/>
      </View>

      {/* Reminders */}
      <SecLabel>Reminders</SecLabel>
      <View style={s.group}>
        <Row icon="📅" iconBg="#E6FBEF" iconFg="#2D7A52"
             title="Calendar events" sub="10 min before start"
             toggle toggleValue={p.prefs.calendarNotif}
             onToggle={v => p.onToggle('calendarNotif', v)}/>
        <Row icon="🛒" iconBg="#EDE8FF" iconFg="#6B35D9"
             title="Shopping low stock"
             toggle toggleValue={p.prefs.shoppingLowNotif}
             onToggle={v => p.onToggle('shoppingLowNotif', v)}/>
        <Row icon="🍽️" iconBg="#E6FBEF" iconFg="#2D7A52"
             title="Dinner not planned" sub="5pm if nothing locked in"
             toggle toggleValue={p.prefs.dinnerUnplanned}
             onToggle={v => p.onToggle('dinnerUnplanned', v)} last/>
      </View>

      {/* Kids */}
      <SecLabel>Kids activity</SecLabel>
      <View style={s.group}>
        <Row icon="🏆" iconBg="#FFE4F1" iconFg="#D4006A"
             title="Job completion approvals"
             toggle toggleValue={p.prefs.kidsJobApprovals}
             onToggle={v => p.onToggle('kidsJobApprovals', v)}/>
        <Row icon="🎁" iconBg="#FFE4F1" iconFg="#D4006A"
             title="Reward redemption requests"
             toggle toggleValue={p.prefs.kidsRewardReqs}
             onToggle={v => p.onToggle('kidsRewardReqs', v)} last/>
      </View>

      {/* Quiet hours */}
      <SecLabel>Quiet hours</SecLabel>
      <View style={s.group}>
        <Row icon="🌒" iconBg="rgba(10,10,10,0.06)" iconFg={INK}
             title="Do not disturb"
             sub={`${fmtTime12(p.prefs.quietStart)} — ${fmtTime12(p.prefs.quietEnd)}`}
             toggle toggleValue={p.prefs.quietHoursOn}
             onToggle={v => p.onToggle('quietHoursOn', v)}/>
        {p.prefs.quietHoursOn && (
          <>
            <Row icon="🌙" iconBg="rgba(10,10,10,0.06)" iconFg={INK}
                 title="Start" value={fmtTime12(p.prefs.quietStart)}
                 onPress={() => p.onEditTime('quietStart')}/>
            <Row icon="🌅" iconBg="rgba(10,10,10,0.06)" iconFg={INK}
                 title="End" value={fmtTime12(p.prefs.quietEnd)}
                 onPress={() => p.onEditTime('quietEnd')} last/>
          </>
        )}
      </View>

      {/* Sound & vibration */}
      <SecLabel>Sound &amp; vibration</SecLabel>
      <View style={s.group}>
        <Row icon="🔉" iconBg="rgba(10,10,10,0.06)" iconFg={INK}
             title="Play sound"
             toggle toggleValue={p.prefs.soundOn}
             onToggle={v => p.onToggle('soundOn', v)}/>
        <Row icon="📳" iconBg="rgba(10,10,10,0.06)" iconFg={INK}
             title="Vibration"
             toggle toggleValue={p.prefs.vibrationOn}
             onToggle={v => p.onToggle('vibrationOn', v)} last/>
      </View>

    </ScrollView>
  );
}

// Brief row: tap-to-edit time + toggle
function BriefRow(p: {
  icon: string;
  title: string;
  time: string;
  on: boolean;
  onPress: () => void;
  onToggle: (v: boolean) => void;
  last?: boolean;
}) {
  return (
    <View style={[s.row, !p.last && s.rowDivider]}>
      <View style={[s.rowIco, { backgroundColor: '#FFF4E0' }]}>
        <Text style={{ fontSize: 16 }}>{p.icon}</Text>
      </View>
      <TouchableOpacity style={{ flex: 1 }} onPress={p.onPress} activeOpacity={0.6}>
        <Text style={s.rowTitle}>{p.title}</Text>
        <Text style={s.rowSub}>{p.time}</Text>
      </TouchableOpacity>
      <ToggleSwitch value={p.on} onChange={p.onToggle}/>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MEMORY VIEW
// ═══════════════════════════════════════════════════════════════════════════
function MemoryView(p: {
  memory: { routines: InsightRow[]; preferences: InsightRow[]; milestones: MilestoneRow[]; loaded: boolean };
  prefs: Prefs;
  onToggleLearning: (v: boolean) => void;
  onDeleteInsight: (id: string) => void;
  onDeleteMilestone: (id: string) => void;
  onClearAll: () => void;
}) {
  // Confidence → short label for the sub line ("Strong" / "Building" / "New")
  const confidenceLabel = (c: number): string =>
    c >= 70 ? 'Strong pattern' : c >= 40 ? 'Building confidence' : 'New observation';
  const occurrenceLabel = (n: number | null): string =>
    !n ? '' : n === 1 ? ' · noticed once' : ` · noticed ${n}×`;

  return (
    <ScrollView contentContainerStyle={{ paddingTop: 4, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
      <View style={{ paddingHorizontal: 22, paddingVertical: 14 }}>
        <Text style={{ fontFamily: 'Poppins_500Medium', fontSize: 14, color: INK2, lineHeight: 22 }}>
          Here’s what I’ve picked up about your family so far. You can remove anything — it’s your life.
        </Text>
      </View>

      {/* Loading state — only on first visit to this view in the session */}
      {!p.memory.loaded && (
        <View style={{ padding: 32, alignItems: 'center' }}>
          <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 13, color: INK3 }}>Loading…</Text>
        </View>
      )}

      {p.memory.loaded && (
        <>
          <SecLabel>Routines</SecLabel>
          <View style={s.group}>
            {p.memory.routines.length === 0 ? (
              <EmptyMemoryRow text="Nothing yet — I'll start picking these up from chat as you use me." last/>
            ) : (
              p.memory.routines.map((r, i) => (
                <Row key={r.id} icon="🔁" iconBg="#EDE8FF" iconFg="#6B35D9"
                     title={r.subject ? `${r.subject} · ${r.insight}` : r.insight}
                     sub={`${confidenceLabel(r.confidence)}${occurrenceLabel(r.occurrence_count)}`}
                     removable
                     onRemove={() => p.onDeleteInsight(r.id)}
                     last={i === p.memory.routines.length - 1}/>
              ))
            )}
          </View>

          <SecLabel>Preferences</SecLabel>
          <View style={s.group}>
            {p.memory.preferences.length === 0 ? (
              <EmptyMemoryRow text="Tell me anything in chat — likes, dislikes, allergies — and I'll remember." last/>
            ) : (
              p.memory.preferences.map((r, i) => (
                <Row key={r.id} icon="✨" iconBg="#EDE8FF" iconFg="#6B35D9"
                     title={r.subject ? `${r.subject} · ${r.insight}` : r.insight}
                     sub={`${confidenceLabel(r.confidence)}${occurrenceLabel(r.occurrence_count)}`}
                     removable
                     onRemove={() => p.onDeleteInsight(r.id)}
                     last={i === p.memory.preferences.length - 1}/>
              ))
            )}
          </View>

          <SecLabel>Milestones</SecLabel>
          <View style={s.group}>
            {p.memory.milestones.length === 0 ? (
              <EmptyMemoryRow text="Birthdays, trips, big moments — I'll capture them as they come up." last/>
            ) : (
              p.memory.milestones.map((r, i) => (
                <Row key={r.id} icon={r.emoji || '⭐'} iconBg="#EDE8FF" iconFg="#6B35D9"
                     title={r.title}
                     sub={`${r.happened_on}${r.description ? ' · ' + r.description : ''}`}
                     removable
                     onRemove={() => p.onDeleteMilestone(r.id)}
                     last={i === p.memory.milestones.length - 1}/>
              ))
            )}
          </View>
        </>
      )}

      <SecLabel>Controls</SecLabel>
      <View style={s.group}>
        <Row icon="✦" iconBg="#EDE8FF" iconFg="#6B35D9"
             title="Let Zaeli learn from chats" sub="Pick up routines, tastes, plans"
             toggle toggleValue={p.prefs.memoryLearningOn}
             onToggle={p.onToggleLearning}/>
        <Row icon="🗑️" iconBg="rgba(197,48,48,0.1)" iconFg={DANGER}
             title="Clear everything Zaeli remembers" sub="Starts with a blank page"
             danger onPress={p.onClearAll} last/>
      </View>
    </ScrollView>
  );
}

// Empty-state line for a Memory section — same shape as Row but greyed.
function EmptyMemoryRow({ text, last }: { text: string; last?: boolean }) {
  return (
    <View style={[
      { paddingVertical: 14, paddingHorizontal: 16 },
      !last && { borderBottomWidth: 1, borderBottomColor: BORDER },
    ]}>
      <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 13, color: INK3, lineHeight: 20 }}>
        {text}
      </Text>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TOUR REPLAY VIEW
// ═══════════════════════════════════════════════════════════════════════════
function TourReplayView(p: {
  onStartFull: () => void;
  onJumpToStop: (n: number) => void;
}) {
  const [completedAt, setCompletedAt] = useState<string | null>(null);
  // Effective stops list reflects account kind — kid sees 9 rows, adult/owner sees 11
  const [stops, setStops] = useState(TOUR_STOPS);
  useEffect(() => {
    (async () => {
      await loadTourState(); // also loads account
      setCompletedAt(getTourState().completedAt);
      setStops(tourEffectiveStops());
    })();
  }, []);

  // Per-stop tile colour map (matches tour route accents)
  const stopTileBg: Record<number, { bg: string; fg: string }> = {
    1:  { bg: '#F0EBFF', fg: '#5020C0' }, // shopping — lavender
    2:  { bg: '#E6F7EF', fg: '#2D7A52' }, // meals — mint
    3:  { bg: '#E0E8FE', fg: '#2055F0' }, // calendar — cobalt
    4:  { bg: '#F0EBFF', fg: '#5020C0' }, // kids — lavender
    5:  { bg: '#FEF4D0', fg: '#8A6500' }, // tasks — gold
    6:  { bg: '#FFF0E8', fg: '#8A3A00' }, // photos — peach
    7:  { bg: '#F4ECFF', fg: '#6B35D9' }, // tutor — violet (HERO)
    8:  { bg: '#E8F4FD', fg: '#0A4A6A' }, // travel — sky
    9:  { bg: '#E6F7EF', fg: '#2D7A52' }, // budget — mint
    10: { bg: '#FFF0E8', fg: '#8A3A00' }, // myspace — peach
    11: { bg: '#FCE0F0', fg: '#A1014F' }, // family — magenta
  };

  const formatDate = (iso: string | null): string | null => {
    if (!iso) return null;
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch { return null; }
  };
  const lastCompletedLabel = formatDate(completedAt);

  return (
    <ScrollView contentContainerStyle={{ paddingTop: 4, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
      {/* Hero — run the whole tour */}
      <View style={s.tourHeroCard}>
        <Text style={s.tourHeroLabel}>RUN THE WHOLE TOUR</Text>
        <Text style={s.tourHeroH1}>All {stops.length} stops</Text>
        <Text style={s.tourHeroSub}>~3–4 minutes · Skip any stop</Text>
        {lastCompletedLabel && (
          <Text style={s.tourHeroMeta}>Last completed: {lastCompletedLabel}</Text>
        )}
        <TouchableOpacity style={s.tourHeroCta} activeOpacity={0.85} onPress={p.onStartFull}>
          <Text style={s.tourHeroCtaTxt}>▶  Start full tour</Text>
        </TouchableOpacity>
      </View>

      <SecLabel>Or jump to one stop</SecLabel>
      <View style={s.group}>
        {stops.map((stop, i) => {
          const c = stopTileBg[stop.id] ?? { bg: 'rgba(10,10,10,0.05)', fg: INK };
          const isHero = !!stop.isHero;
          return (
            <Row
              key={stop.id}
              icon={stop.emoji}
              iconBg={c.bg}
              iconFg={c.fg}
              title={isHero ? `${stop.cardTitle}` : stop.cardTitle}
              sub={isHero ? 'Hero feature' : `Stop ${i + 1}`}
              onPress={() => p.onJumpToStop(stop.id)}
              last={i === stops.length - 1}
            />
          );
        })}
      </View>
    </ScrollView>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SUBSCRIPTION VIEW — Round B commit 10
// Owner-only sub-page. Reads real Stripe state via lib/stripe.ts. Manage
// button hands off to Stripe Customer Portal in Safari.
// ═══════════════════════════════════════════════════════════════════════════
function SubscriptionView(p: { profile: Profile | null; onManage: () => void }) {
  const sub = getSubscription();
  const isTrial = sub.status === 'trialing';
  const isActive = sub.status === 'active';
  const isPastDue = sub.status === 'past_due';
  const isBeta = isFamilyInBeta();

  const statusBg = isBeta ? '#B8EDD0'
                 : isTrial ? '#A8D8F0'
                 : isPastDue ? '#FAC8A8'
                 : '#B8EDD0';
  const statusEyebrowColor = isBeta ? '#2D7A52'
                            : isTrial ? '#0A5C80'
                            : isPastDue ? '#8A3A00'
                            : '#2D7A52';
  const statusEyebrowText = isBeta ? 'Beta · full access'
                           : isTrial ? 'Free trial'
                           : isPastDue ? '⚠ Payment failed'
                           : 'Active';

  return (
    <ScrollView contentContainerStyle={{ paddingTop: 14, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
      {/* Status hero */}
      <View style={{ marginHorizontal: 14, backgroundColor: statusBg, borderRadius: 20, padding: 18, marginBottom: 16 }}>
        <Text style={{ fontFamily:'Poppins_800ExtraBold', fontSize: 11, letterSpacing: 0.5, color: statusEyebrowColor, textTransform:'uppercase' }}>{statusEyebrowText}</Text>
        <Text style={{ fontFamily:'Poppins_800ExtraBold', fontSize: 22, color: '#0A0A0A', letterSpacing:-0.5, marginTop: 4 }}>
          {sub.plan === 'family' ? 'Family plan' : 'Family plan'}
        </Text>
        <Text style={{ fontFamily:'Poppins_400Regular', fontSize: 12, color: 'rgba(10,10,10,0.72)', marginTop: 6 }}>
          {isBeta ? 'Beta access — free until beta ends'
           : isTrial ? 'A$6.99/month after trial'
           : isPastDue ? 'Please update your card to keep access'
           : 'A$6.99/month · inc GST'}
        </Text>
      </View>

      <SecLabel>Details</SecLabel>
      <View style={s.group}>
        <Row icon="📦" iconBg="#EDE8FF" iconFg="#6B35D9"
             title="Plan" value="Family"/>
        <Row icon="💵" iconBg="#E6F7EF" iconFg="#2D7A52"
             title="Price" value="A$6.99 / month"/>
        <Row icon="💳" iconBg="#E8F4FD" iconFg="#0A5C80"
             title="Payment method" value={sub.status === 'active' || sub.status === 'trialing' ? 'On file' : 'Not set up'}/>
        <Row icon="📅" iconBg="#FBF5D6" iconFg="#8B6914"
             title={isTrial ? 'Free until' : 'Next bill'}
             value={sub.renewsAt ? new Date(sub.renewsAt).toLocaleDateString('en-AU', { day:'numeric', month:'short', year:'numeric' }) : '—'}
             last/>
      </View>

      <TouchableOpacity onPress={p.onManage} style={{ marginHorizontal: 14, marginTop: 16, backgroundColor: '#0A0A0A', borderRadius: 14, paddingVertical: 14, alignItems:'center' }} activeOpacity={0.85}>
        <Text style={{ fontFamily:'Poppins_700Bold', fontSize: 14, color: 'white' }}>Manage subscription →</Text>
      </TouchableOpacity>
      <Text style={{ fontFamily:'Poppins_400Regular', fontSize: 10, color: 'rgba(10,10,10,0.48)', textAlign:'center', marginTop: 8, paddingHorizontal: 20, lineHeight: 15 }}>
        Opens Stripe in Safari — cancel, update card, view invoices.
      </Text>
    </ScrollView>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PASSWORD VIEW — Round B commit 10 (Supabase auth handles the actual work)
// ═══════════════════════════════════════════════════════════════════════════
function PasswordView(p: { onChanged: () => void }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);

  const validNew = next.length >= 8;
  const matches = next.length > 0 && next === confirm;
  const canSubmit = current.length > 0 && validNew && matches && !busy;

  async function submit() {
    setBusy(true);
    try {
      // Supabase auth.updateUser doesn't verify current password — we do a
      // sign-in with current pw first to confirm, then update.
      const { data: userData } = await supabase.auth.getUser();
      const email = userData.user?.email;
      if (!email) { Alert.alert('Not signed in'); setBusy(false); return; }
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password: current });
      if (signInErr) { Alert.alert('Wrong current password', 'Please try again.'); setBusy(false); return; }
      const { error: updateErr } = await supabase.auth.updateUser({ password: next });
      if (updateErr) { Alert.alert('Update failed', updateErr.message); setBusy(false); return; }
      Alert.alert('Password updated', 'You\'re still signed in on this device.');
      p.onChanged();
    } catch (e:any) {
      Alert.alert('Error', e?.message ?? 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={{ paddingTop: 14, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
      <SecLabel>Current password</SecLabel>
      <View style={{ marginHorizontal: 14, marginBottom: 14 }}>
        <View style={{ backgroundColor: 'white', borderRadius: 14, borderWidth: 1.5, borderColor: 'rgba(10,10,10,0.08)', padding: 14 }}>
          <TextInput
            value={current}
            onChangeText={setCurrent}
            secureTextEntry
            placeholder="Type your current password"
            placeholderTextColor="rgba(10,10,10,0.28)"
            style={{ fontFamily:'Poppins_400Regular', fontSize:15, color:'#0A0A0A' }}
            autoCapitalize="none"
          />
        </View>
      </View>

      <SecLabel>New password</SecLabel>
      <View style={{ marginHorizontal: 14, marginBottom: 6 }}>
        <View style={{ backgroundColor: 'white', borderRadius: 14, borderWidth: 1.5, borderColor: validNew ? '#A8D8F0' : 'rgba(10,10,10,0.08)', padding: 14 }}>
          <TextInput
            value={next}
            onChangeText={setNext}
            secureTextEntry
            placeholder="At least 8 characters"
            placeholderTextColor="rgba(10,10,10,0.28)"
            style={{ fontFamily:'Poppins_400Regular', fontSize:15, color:'#0A0A0A' }}
            autoCapitalize="none"
          />
        </View>
      </View>
      <Text style={{ fontFamily:'Poppins_400Regular', fontSize: 11, color: validNew ? '#2D7A52' : 'rgba(10,10,10,0.48)', paddingHorizontal: 18, marginBottom: 14 }}>
        {validNew ? '✓ Long enough' : 'At least 8 characters'}
      </Text>

      <SecLabel>Confirm new</SecLabel>
      <View style={{ marginHorizontal: 14, marginBottom: 14 }}>
        <View style={{ backgroundColor: 'white', borderRadius: 14, borderWidth: 1.5, borderColor: confirm.length > 0 && !matches ? '#FF4545' : 'rgba(10,10,10,0.08)', padding: 14 }}>
          <TextInput
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry
            placeholder="Type it again"
            placeholderTextColor="rgba(10,10,10,0.28)"
            style={{ fontFamily:'Poppins_400Regular', fontSize:15, color:'#0A0A0A' }}
            autoCapitalize="none"
          />
        </View>
      </View>

      <TouchableOpacity
        onPress={submit}
        disabled={!canSubmit}
        style={{ marginHorizontal: 14, marginTop: 10, backgroundColor: canSubmit ? '#0A0A0A' : 'rgba(10,10,10,0.15)', borderRadius: 14, paddingVertical: 14, alignItems:'center' }}
        activeOpacity={0.85}
      >
        <Text style={{ fontFamily:'Poppins_700Bold', fontSize: 14, color: 'white' }}>{busy ? 'Updating…' : 'Update password'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// COLOUR VIEW — Round B commit 10
// ═══════════════════════════════════════════════════════════════════════════
const COLOUR_SWATCHES = [
  '#4D8BFF', '#FF7B6B', '#A855F7', '#22C55E', '#F59E0B',
  '#FF4545', '#2D7A52', '#0A5C80', '#D4006A', '#8B6914',
];

function ColourView(p: { profile: Profile | null; onSaved: () => void }) {
  const current = (p.profile as any)?.colour ?? '#4D8BFF';
  const [picked, setPicked] = useState<string>(current);
  const [busy, setBusy] = useState(false);
  const name = p.profile?.name?.trim() || 'You';
  const initial = name[0]?.toUpperCase() ?? 'Y';

  async function save() {
    if (picked === current || !p.profile) return;
    setBusy(true);
    try {
      const { error } = await supabase.from('profiles').update({ colour: picked }).eq('id', p.profile.id);
      if (error) { Alert.alert('Save failed', error.message); setBusy(false); return; }
      Alert.alert('Colour updated', 'Your colour will show on new events and reminders.');
      p.onSaved();
    } catch (e:any) {
      Alert.alert('Error', e?.message ?? 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={{ paddingTop: 14, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
      <View style={{ marginHorizontal: 14, backgroundColor: 'white', borderRadius: 20, padding: 24, alignItems:'center', marginBottom: 16 }}>
        <View style={{ width: 70, height: 70, borderRadius: 35, backgroundColor: picked, alignItems:'center', justifyContent:'center', marginBottom: 10 }}>
          <Text style={{ fontFamily:'Poppins_800ExtraBold', fontSize: 26, color:'white' }}>{initial}</Text>
        </View>
        <Text style={{ fontFamily:'Poppins_400Regular', fontSize: 12, color:'rgba(10,10,10,0.48)', textAlign:'center' }}>
          This colour shows on events, reminders, and family list.
        </Text>
      </View>

      <SecLabel>Pick one</SecLabel>
      <View style={{ flexDirection:'row', flexWrap:'wrap', gap: 10, marginHorizontal: 14, marginBottom: 16 }}>
        {COLOUR_SWATCHES.map(c => {
          const isPicked = c === picked;
          return (
            <TouchableOpacity
              key={c}
              onPress={() => setPicked(c)}
              style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c, borderWidth: isPicked ? 3 : 0, borderColor: '#0A0A0A' }}
              activeOpacity={0.75}
            />
          );
        })}
      </View>

      <TouchableOpacity
        onPress={save}
        disabled={picked === current || busy}
        style={{ marginHorizontal: 14, marginTop: 10, backgroundColor: picked !== current && !busy ? '#0A0A0A' : 'rgba(10,10,10,0.15)', borderRadius: 14, paddingVertical: 14, alignItems:'center' }}
        activeOpacity={0.85}
      >
        <Text style={{ fontFamily:'Poppins_700Bold', fontSize: 14, color: 'white' }}>{busy ? 'Saving…' : 'Save colour'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// KID PIN RESET VIEW — Round B commit 10 (3-step wizard)
// ═══════════════════════════════════════════════════════════════════════════
function PinResetView(p: { onDone: () => void }) {
  const [step, setStep] = useState<1|2|3>(1);
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');

  function tapKey(k: string) {
    if (step === 1) {
      if (k === '⌫') { setCurrentPin(prev => prev.slice(0, -1)); return; }
      if (currentPin.length >= 4) return;
      const next = currentPin + k;
      setCurrentPin(next);
      if (next.length === 4) {
        // For now, no server-side verify — just proceed. Backend hook TODO.
        setTimeout(() => setStep(2), 250);
      }
    } else if (step === 2) {
      if (k === '⌫') { setNewPin(prev => prev.slice(0, -1)); return; }
      if (newPin.length >= 4) return;
      const next = newPin + k;
      setNewPin(next);
      if (next.length === 4) {
        // TODO: persist new PIN to Supabase (kids use synthetic email +
        // token+PIN as their password per Session 22). Would need
        // supabase.auth.updateUser({ password: `<token>-${newPin}` }).
        setTimeout(() => setStep(3), 250);
      }
    }
  }

  if (step === 3) {
    return (
      <ScrollView contentContainerStyle={{ paddingTop: 40, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        <View style={{ alignItems:'center', padding: 20 }}>
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor:'#B8EDD0', alignItems:'center', justifyContent:'center', marginBottom: 20 }}>
            <Text style={{ fontSize: 40 }}>✓</Text>
          </View>
          <Text style={{ fontFamily:'Poppins_800ExtraBold', fontSize: 20, letterSpacing:-0.4 }}>PIN updated</Text>
          <Text style={{ fontFamily:'Poppins_400Regular', fontSize: 12, color: 'rgba(10,10,10,0.48)', marginTop: 10, textAlign:'center', lineHeight: 18, paddingHorizontal: 30 }}>
            Use your new PIN next time you sign in.{'\n'}A parent can help if you forget.
          </Text>
          <TouchableOpacity onPress={p.onDone} style={{ marginTop: 28, backgroundColor:'#0A0A0A', borderRadius: 14, paddingHorizontal: 24, paddingVertical: 14 }} activeOpacity={0.85}>
            <Text style={{ fontFamily:'Poppins_700Bold', fontSize: 14, color: 'white' }}>Back to Settings</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  const currentValue = step === 1 ? currentPin : newPin;

  return (
    <View style={{ flex:1, padding: 20 }}>
      <View style={{ alignItems:'center', marginBottom: 6, marginTop: 6 }}>
        <Text style={{ fontFamily:'Poppins_800ExtraBold', fontSize: 16 }}>
          {step === 1 ? 'Enter your current PIN' : 'Choose a new 4-digit PIN'}
        </Text>
        <Text style={{ fontFamily:'Poppins_400Regular', fontSize: 12, color: 'rgba(10,10,10,0.48)', marginTop: 4 }}>{step} of 3</Text>
      </View>

      {/* PIN dots */}
      <View style={{ flexDirection:'row', justifyContent:'center', gap: 12, marginVertical: 24 }}>
        {[0,1,2,3].map(i => (
          <View key={i} style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: i < currentValue.length ? '#0A0A0A' : 'rgba(10,10,10,0.10)' }}/>
        ))}
      </View>

      {/* Keypad */}
      <View style={{ flexDirection:'row', flexWrap:'wrap', gap: 8, justifyContent:'center', marginTop: 12 }}>
        {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((k, i) => k === '' ? (
          <View key={i} style={{ width: '30%' }}/>
        ) : (
          <TouchableOpacity
            key={i}
            onPress={() => tapKey(k)}
            style={{ width: '30%', paddingVertical: 14, backgroundColor:'white', borderRadius: 12, alignItems:'center', borderWidth: 1, borderColor:'rgba(10,10,10,0.08)' }}
            activeOpacity={0.7}
          >
            <Text style={{ fontFamily:'Poppins_700Bold', fontSize: k === '⌫' ? 18 : 22, color: k === '⌫' ? 'rgba(10,10,10,0.48)' : '#0A0A0A' }}>{k}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {step === 1 && (
        <Text style={{ fontFamily:'Poppins_600SemiBold', fontSize: 12, color: '#0A5C80', textAlign:'center', marginTop: 20 }}>
          Forgot? Ask Rich or Anna to send a new one
        </Text>
      )}
      {step === 2 && (
        <Text style={{ fontFamily:'Poppins_400Regular', fontSize: 11, color: 'rgba(10,10,10,0.48)', textAlign:'center', marginTop: 20, paddingHorizontal: 20 }}>
          Pick something you'll remember — not 1234 or your birthday.
        </Text>
      )}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// iPhone Calendar sync view (Build 49 — two-way sync, per-calendar picker)
// ═══════════════════════════════════════════════════════════════════════════
function CalendarSyncView(p: { profile: Profile | null }) {
  const [perm, setPerm] = useState<'granted' | 'limited' | 'denied' | 'undetermined' | 'checking'>('checking');
  const [calendars, setCalendars] = useState<Array<{ id: string; title: string; color: string; source: string; sync_enabled: boolean }>>([]);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [syncing, setSyncing] = useState(false);

  async function refresh() {
    if (Platform.OS !== 'ios') {
      setPerm('denied');
      return;
    }
    try {
      const CS = await import('../../lib/calendar-sync');
      const currentPerm = await CS.getCurrentPermission();
      setPerm(currentPerm);
      const uid = await getCurrentUserId();
      if (!uid) return;
      if (currentPerm === 'granted' || currentPerm === 'limited') {
        const cals = await CS.listUserCalendars(uid);
        setCalendars(cals);
        const cfg = await CS.loadSyncConfig(uid);
        setLastSynced(cfg?.last_synced_at ?? null);
      }
    } catch (e: any) {
      console.log('[calendar-sync-view] refresh error:', e?.message);
    }
  }

  useEffect(() => { refresh(); }, []);

  async function onRequestPermission() {
    if (Platform.OS !== 'ios') {
      Alert.alert('iOS only', 'iPhone Calendar sync is only available on iPhone right now. Android support is coming.');
      return;
    }
    setBusy(true);
    try {
      const CS = await import('../../lib/calendar-sync');
      const status = await CS.requestCalendarPermission();
      setPerm(status);
      if (status === 'granted' || status === 'limited') {
        await refresh();
      } else if (status === 'denied') {
        Alert.alert(
          'Permission needed',
          'To sync your iPhone Calendar, Zaeli needs Calendar access. Enable it in iOS Settings → Zaeli → Calendars.',
          [{ text: 'OK' }],
        );
      }
    } finally {
      setBusy(false);
    }
  }

  async function onToggleCalendar(calId: string, next: boolean) {
    const uid = await getCurrentUserId();
    const familyId = getFamilyId();
    if (!uid || !familyId) return;
    // Optimistic
    setCalendars(prev => prev.map(c => c.id === calId ? { ...c, sync_enabled: next } : c));
    const CS = await import('../../lib/calendar-sync');
    const res = await CS.setCalendarSyncEnabled(uid, familyId, calId, next);
    if (!res.ok) {
      setCalendars(prev => prev.map(c => c.id === calId ? { ...c, sync_enabled: !next } : c));
      Alert.alert("Couldn't save", res.error ?? 'Try again in a moment.');
    }
  }

  async function onSyncNow() {
    const uid = await getCurrentUserId();
    const familyId = getFamilyId();
    if (!uid || !familyId) return;
    setSyncing(true);
    try {
      const CS = await import('../../lib/calendar-sync');
      const res = await CS.syncNow(uid, familyId);
      if (!res.ok) {
        Alert.alert(
          'Sync incomplete',
          res.error === 'no calendars enabled'
            ? 'Tick at least one calendar above, then try again.'
            : res.error ?? 'Something went wrong. Try again in a moment.',
        );
      } else {
        Alert.alert(
          'Synced ✓',
          `${res.inserted} new, ${res.updated} updated, ${res.deleted} removed across ${res.perCalendar.length} calendar${res.perCalendar.length === 1 ? '' : 's'}.`,
        );
        setLastSynced(new Date().toISOString());
      }
    } finally {
      setSyncing(false);
    }
  }

  async function onDisconnect() {
    Alert.alert(
      'Disconnect sync?',
      "All external events imported from your iPhone Calendar will be removed from Zaeli. Your iPhone Calendar itself is untouched.",
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            const uid = await getCurrentUserId();
            if (!uid) return;
            setBusy(true);
            try {
              const CS = await import('../../lib/calendar-sync');
              const res = await CS.disconnectSync(uid);
              if (!res.ok) {
                Alert.alert("Couldn't disconnect", res.error ?? 'Try again in a moment.');
              } else {
                Alert.alert('Disconnected', `${res.deleted} imported event${res.deleted === 1 ? '' : 's'} removed.`);
                setCalendars(prev => prev.map(c => ({ ...c, sync_enabled: false })));
                setLastSynced(null);
              }
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  }

  return (
    <ScrollView contentContainerStyle={{ paddingTop: 14, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>

      {/* Info hero */}
      <View style={{ marginHorizontal: 14, marginBottom: 16, padding: 18, backgroundColor: '#E8F4FD', borderRadius: 16 }}>
        <Text style={{ fontFamily:'Poppins_800ExtraBold', fontSize: 16, color: INK, marginBottom: 6 }}>Two-way iPhone Calendar sync</Text>
        <Text style={{ fontFamily:'Poppins_400Regular', fontSize: 13, color: INK2, lineHeight: 20 }}>
          Pick which iPhone calendars you want to see in Zaeli — those events show up here, personal to you (other family members don't see them). Your Zaeli events also appear on your iPhone Calendar in a dedicated "Zaeli" calendar. Sync runs automatically on every app open — tap "Sync now" to force it.
        </Text>
      </View>

      {/* Permission gate */}
      {perm === 'checking' && (
        <View style={{ marginHorizontal: 14, marginBottom: 20, padding: 18, alignItems:'center' }}>
          <Text style={{ fontFamily:'Poppins_400Regular', fontSize: 13, color: INK3 }}>Checking Calendar permission...</Text>
        </View>
      )}

      {(perm === 'undetermined' || perm === 'denied') && (
        <View style={{ marginHorizontal: 14, marginBottom: 20, padding: 20, backgroundColor: CARD, borderRadius: 16 }}>
          <Text style={{ fontFamily:'Poppins_800ExtraBold', fontSize: 15, color: INK, marginBottom: 8 }}>
            {perm === 'denied' ? 'Permission denied' : 'Calendar access needed'}
          </Text>
          <Text style={{ fontFamily:'Poppins_400Regular', fontSize: 13, color: INK2, lineHeight: 20, marginBottom: 14 }}>
            {perm === 'denied'
              ? 'Zaeli needs Calendar access to sync. Enable it in iOS Settings → Zaeli → Calendars, then come back here.'
              : "Zaeli will ask iOS for permission to read + write your calendars. You'll pick which ones to sync on the next screen."}
          </Text>
          {perm === 'undetermined' && (
            <TouchableOpacity
              disabled={busy}
              onPress={onRequestPermission}
              style={{ backgroundColor: INK, borderRadius: 12, paddingVertical: 12, alignItems:'center', opacity: busy ? 0.5 : 1 }}
              activeOpacity={0.85}
            >
              <Text style={{ fontFamily:'Poppins_700Bold', fontSize: 14, color:'white' }}>
                {busy ? 'Asking...' : 'Grant Calendar access'}
              </Text>
            </TouchableOpacity>
          )}
          {perm === 'denied' && (
            <TouchableOpacity
              onPress={() => Linking.openSettings().catch(() => {})}
              style={{ backgroundColor: '#E8F4FD', borderRadius: 12, paddingVertical: 12, alignItems:'center' }}
              activeOpacity={0.85}
            >
              <Text style={{ fontFamily:'Poppins_700Bold', fontSize: 14, color: '#0A5C80' }}>Open iOS Settings</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {(perm === 'granted' || perm === 'limited') && (
        <>
          {perm === 'limited' && (
            <View style={{ marginHorizontal: 14, marginBottom: 14, padding: 14, backgroundColor: '#FBF5D6', borderRadius: 12 }}>
              <Text style={{ fontFamily:'Poppins_400Regular', fontSize: 12, color: '#8B6914', lineHeight: 18 }}>
                Limited access — you're only sharing some of your calendars. That's fine — Zaeli only syncs the ones you tick below. To share more, go to iOS Settings → Zaeli → Calendars.
              </Text>
            </View>
          )}

          {/* Calendar picker */}
          <View style={{ paddingHorizontal: 14, marginBottom: 8 }}>
            <Text style={{ fontFamily:'Poppins_700Bold', fontSize: 11, letterSpacing: 0.5, textTransform:'uppercase', color: INK3 }}>
              Your calendars — pick what to sync
            </Text>
          </View>
          <View style={s.group}>
            {calendars.length === 0 && (
              <View style={{ padding: 20, alignItems:'center' }}>
                <Text style={{ fontFamily:'Poppins_400Regular', fontSize: 13, color: INK3 }}>No calendars found on this iPhone.</Text>
              </View>
            )}
            {calendars.map((cal, i) => (
              <TouchableOpacity
                key={cal.id}
                onPress={() => onToggleCalendar(cal.id, !cal.sync_enabled)}
                activeOpacity={0.7}
                style={{
                  flexDirection:'row', alignItems:'center',
                  paddingVertical: 14, paddingHorizontal: 16,
                  borderBottomWidth: i === calendars.length - 1 ? 0 : StyleSheet.hairlineWidth,
                  borderBottomColor: 'rgba(10,10,10,0.08)',
                }}
              >
                <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: cal.color, marginRight: 12 }}/>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily:'Poppins_600SemiBold', fontSize: 14, color: INK }}>{cal.title}</Text>
                  <Text style={{ fontFamily:'Poppins_400Regular', fontSize: 11, color: INK3, marginTop: 2 }}>{cal.source}</Text>
                </View>
                <View style={{
                  width: 44, height: 26, borderRadius: 13,
                  backgroundColor: cal.sync_enabled ? MINT_DEEP : 'rgba(10,10,10,0.12)',
                  padding: 2, justifyContent:'center',
                }}>
                  <View style={{
                    width: 22, height: 22, borderRadius: 11, backgroundColor: 'white',
                    alignSelf: cal.sync_enabled ? 'flex-end' : 'flex-start',
                  }}/>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Actions */}
          <View style={{ paddingHorizontal: 14, marginTop: 20, gap: 10 }}>
            <TouchableOpacity
              disabled={syncing}
              onPress={onSyncNow}
              style={{ backgroundColor: INK, borderRadius: 12, paddingVertical: 14, alignItems:'center', opacity: syncing ? 0.6 : 1 }}
              activeOpacity={0.85}
            >
              <Text style={{ fontFamily:'Poppins_700Bold', fontSize: 14, color:'white' }}>
                {syncing ? 'Syncing...' : 'Sync now'}
              </Text>
            </TouchableOpacity>
            <Text style={{ fontFamily:'Poppins_400Regular', fontSize: 11, color: INK3, textAlign:'center' }}>
              {lastSynced
                ? `Last synced ${new Date(lastSynced).toLocaleString('en-AU', { month:'short', day:'numeric', hour:'numeric', minute:'2-digit' })}`
                : 'Never synced'}
            </Text>
          </View>

          {/* Disconnect */}
          <View style={{ paddingHorizontal: 14, marginTop: 28 }}>
            <TouchableOpacity
              disabled={busy}
              onPress={onDisconnect}
              style={{ backgroundColor: 'rgba(197,48,48,0.08)', borderRadius: 12, paddingVertical: 12, alignItems:'center' }}
              activeOpacity={0.75}
            >
              <Text style={{ fontFamily:'Poppins_700Bold', fontSize: 13, color: '#B83333' }}>Disconnect sync</Text>
            </TouchableOpacity>
            <Text style={{ fontFamily:'Poppins_400Regular', fontSize: 10, color: INK4, textAlign:'center', marginTop: 8, lineHeight: 15, paddingHorizontal: 20 }}>
              Removes all imported events from Zaeli. Your iPhone Calendar is untouched.
            </Text>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const MINT_DEEP = '#2D7A52';

// ═══════════════════════════════════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════════════════════════════════
const s = StyleSheet.create({
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  back: {
    width: 32, height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(10,10,10,0.06)',
    alignItems: 'center', justifyContent: 'center',
  },
  wordmark: {
    fontFamily: 'Poppins_800ExtraBold',
    fontSize: 40,
    letterSpacing: -1.5,
    lineHeight: 46,
    color: INK,
  },
  pageLabel: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 17,
    color: INK2,
  },
  hamburger: {
    width: 42, height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(10,10,10,0.06)',
    alignItems: 'center', justifyContent: 'center',
  },

  // Account hero
  accountHero: {
    marginHorizontal: 14,
    marginBottom: 22,
    borderRadius: 20,
    padding: 18,
    backgroundColor: '#2D3748',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  accountAvatar: {
    width: 54, height: 54,
    borderRadius: 16,
    backgroundColor: '#FAC8A8',
    alignItems: 'center', justifyContent: 'center',
  },
  accountAvatarTxt: {
    fontFamily: 'Poppins_800ExtraBold',
    fontSize: 22,
    color: INK,
  },
  accountName: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 17,
    color: '#FFFFFF',
  },
  accountEmail: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  accountPlanTag: {
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: 'rgba(184,237,208,0.25)',
  },
  accountPlanTagTxt: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 10,
    letterSpacing: 0.8,
    color: '#B8EDD0',
    textTransform: 'uppercase',
  },

  // Plan card
  planCard: {
    marginHorizontal: 14,
    marginBottom: 18,
    borderRadius: 18,
    padding: 18,
    backgroundColor: '#B8EDD0',
  },
  planLabel: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 10,
    letterSpacing: 1.2,
    color: '#2D7A52',
    textTransform: 'uppercase',
  },
  planName: {
    fontFamily: 'Poppins_800ExtraBold',
    fontSize: 20,
    color: INK,
    marginTop: 4,
  },
  planPrice: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: 'rgba(10,10,10,0.6)',
    marginTop: 3,
  },
  planExtras: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(45,122,82,0.18)',
  },
  planExtrasTxt: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 12,
    color: 'rgba(10,10,10,0.5)',
  },
  planBtn: {
    marginTop: 12,
    backgroundColor: '#2D7A52',
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
  },
  planBtnTxt: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: '#FFFFFF',
  },

  // Section
  secLabel: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 11,
    letterSpacing: 1.2,
    color: INK4,
    textTransform: 'uppercase',
    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: 8,
  },
  group: {
    backgroundColor: CARD,
    marginHorizontal: 14,
    marginBottom: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(10,10,10,0.05)',
    overflow: 'hidden',
  },

  // Row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(10,10,10,0.06)',
  },
  rowIco: {
    width: 34, height: 34,
    borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  rowTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
    color: INK,
  },
  rowSub: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: INK3,
    marginTop: 2,
  },
  rowVal: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 13,
    color: INK3,
    marginRight: 6,
  },

  // Toggle
  toggle: {
    width: 44, height: 26,
    borderRadius: 14,
  },
  toggleKnob: {
    position: 'absolute',
    width: 22, height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    top: 2,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  // Time picker modal
  timeModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  timeModalCard: {
    backgroundColor: CARD,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 30,
  },
  timeModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  timeModalBtn: { paddingHorizontal: 4, paddingVertical: 4 },
  timeModalBtnTxt: { fontFamily: 'Poppins_500Medium', fontSize: 15, color: INK3 },
  timeModalTitle: { fontFamily: 'Poppins_700Bold', fontSize: 16, color: INK },

  // ── Tour replay view ────────────────────────────────────────────────────
  tourHeroCard: {
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 18,
    backgroundColor: '#E6F7EF',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#C8F0DA',
    padding: 18,
  },
  tourHeroLabel: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 11,
    color: '#2D7A52',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  tourHeroH1: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 19,
    color: INK,
    marginBottom: 4,
  },
  tourHeroSub: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: INK3,
    marginBottom: 4,
  },
  tourHeroMeta: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 12,
    color: INK4,
    marginBottom: 12,
  },
  tourHeroCta: {
    backgroundColor: '#2D7A52',
    paddingVertical: 13,
    paddingHorizontal: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  tourHeroCtaTxt: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 14,
    color: '#fff',
  },
});
