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
  Dimensions, Alert, Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setFamilyFromSettings } from '../../lib/navigation-store';
import { STOPS as TOUR_STOPS, TOTAL_STOPS as TOUR_TOTAL, replayFromStart, replayStop, loadTourState, isCompleted as tourIsCompleted, getState as getTourState, getEffectiveStops as tourEffectiveStops, getEffectiveTotal as tourEffectiveTotal } from '../../lib/tour-state';
import { loadInvites, getPendingInvites, markAccepted } from '../../lib/invite-state';
import { resetToOwner } from '../../lib/account-state';
import { signOut, loadProfile, getProfile, type Profile } from '../../lib/auth';
import { loadPrefs, updatePref as persistUpdatePref, DEFAULT_PREFS, type Prefs } from '../../lib/user-prefs';
import {
  fetchInsightsByCategory, fetchMilestones, deleteInsight, deleteMilestone,
  clearAllMemory, detectInsightsFromConversations, type InsightRow, type MilestoneRow,
} from '../../lib/zaeli-memory';
import { getFamilyId } from '../../lib/family';
import { scheduleBriefNotifications } from '../../lib/notifications';
import * as NotificationsAPI from 'expo-notifications';
import DateTimePicker from '@react-native-community/datetimepicker';
import Svg, { Path } from 'react-native-svg';
import MoreSheet from '../components/MoreSheet';

const { height: H } = Dimensions.get('window');

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
type View = 'main' | 'notifications' | 'memory' | 'tour';
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
  const [view, setView]     = useState<View>('main');
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
      // Phase 3a — if a brief time/toggle changed, re-schedule the daily
      // local notifications so they fire at the new time. Idempotent on
      // notification side (cancel + re-add).
      if (key === 'briefMorningTime' || key === 'briefEveningTime' ||
          key === 'briefMorningOn'   || key === 'briefEveningOn') {
        scheduleBriefNotifications({
          morningTime: next.briefMorningTime,
          eveningTime: next.briefEveningTime,
          morningOn:   next.briefMorningOn,
          eveningOn:   next.briefEveningOn,
        }).catch(() => {});
      }
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
          onDelete={() => Alert.alert('Delete account', 'Destructive flow — confirmation + cascade delete will live here.')}
          onOurFamily={() => { setFamilyFromSettings(); router.navigate('/(tabs)/family' as any); }}
          onReplayOnboarding={async () => {
            // Clear the completion flag so any future auto-redirect gate also fires,
            // then navigate. Matches fresh-install behaviour for testing.
            try { await AsyncStorage.removeItem('onboarding_complete'); } catch {}
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
            try { await AsyncStorage.removeItem('onboarding_just_completed'); } catch {}
            Alert.alert('Reset', 'Switched back to the owner account (Rich).');
          }}
          onTestNotification={async () => {
            try {
              const { status } = await NotificationsAPI.getPermissionsAsync();
              if (status !== 'granted') {
                Alert.alert('No permission', `Notification permission is "${status}". Enable it in iPhone Settings → Notifications → Zaeli.`);
                return;
              }
              await NotificationsAPI.scheduleNotificationAsync({
                content: { title: '🔔 Test', body: 'If you see this, delivery works.', sound: true },
                trigger: { type: 'timeInterval' as any, seconds: 10, repeats: false } as any,
              });
              Alert.alert('Scheduled', 'Background the app now. Should fire in ~10 seconds.');
            } catch (e: any) {
              Alert.alert('Error', e?.message ?? 'Failed to schedule test notification.');
            }
          }}
          onListScheduledBriefs={async () => {
            try {
              const all = await NotificationsAPI.getAllScheduledNotificationsAsync();
              if (all.length === 0) {
                Alert.alert('Scheduled notifications', 'None scheduled.');
                return;
              }
              const lines = all.map(n => {
                const title = typeof n.content.title === 'string' ? n.content.title : '(no title)';
                const trig = JSON.stringify(n.trigger);
                return `${n.identifier}\n${title}\n${trig}`;
              });
              Alert.alert(`Scheduled (${all.length})`, lines.join('\n\n'));
            } catch (e: any) {
              Alert.alert('Error', e?.message ?? 'Failed to read scheduled notifications.');
            }
          }}
          onRunMemoryExtraction={async () => {
            try {
              Alert.alert('Working…', 'Analysing recent chats for durable facts. Check Memory in a few seconds.');
              await detectInsightsFromConversations(getFamilyId());
              Alert.alert('Done', 'Extraction finished. Open Settings → Memory to see what landed.');
            } catch (e: any) {
              Alert.alert('Error', e?.message ?? 'Extraction failed.');
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
  onPlaceholder: (label: string) => void;
  onSignOut: () => void;
  onDelete: () => void;
  onOurFamily: () => void;
  onReplayOnboarding: () => void;
  onSimulateInviteAccept: () => void;
  onOpenLatestInvite: () => void;
  onResetAccount: () => void;
  onTestNotification: () => void;
  onListScheduledBriefs: () => void;
  onRunMemoryExtraction: () => void;
}) {
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

      {/* Subscription */}
      <SecLabel>Subscription</SecLabel>
      <View style={s.planCard}>
        <Text style={s.planLabel}>Current plan</Text>
        <Text style={s.planName}>Family</Text>
        <Text style={s.planPrice}>A$14.99 / month · next billed 17 May</Text>
        <View style={s.planExtras}>
          <Text style={s.planExtrasTxt}>+ Tutor add-on · Poppy · A$9.99/month</Text>
        </View>
        <TouchableOpacity style={s.planBtn} activeOpacity={0.85} onPress={() => p.onPlaceholder('Manage subscription')}>
          <Text style={s.planBtnTxt}>Manage subscription</Text>
        </TouchableOpacity>
      </View>

      {/* Family */}
      <SecLabel>Family</SecLabel>
      <View style={s.group}>
        <Row icon="👨‍👩‍👧‍👦" iconBg="#FFE4F1" iconFg="#D4006A"
             title="Our Family" sub="Anna, Poppy, Gab, Duke"
             onPress={p.onOurFamily} last/>
      </View>

      {/* Preferences */}
      <SecLabel>Preferences</SecLabel>
      <View style={s.group}>
        <Row icon="🔔" iconBg="#FFF4E0" iconFg="#D97706"
             title="Notifications" sub="Briefs, reminders, kids, shopping"
             onPress={p.onNavNotifications}/>
        <Row icon="✦" iconBg="#EDE8FF" iconFg="#6B35D9"
             title="Zaeli's memory" sub="What I remember about your family"
             onPress={p.onNavMemory}/>
        <Row icon="🧭" iconBg="#E6F7EF" iconFg="#2D7A52"
             title="Replay tour" sub="Run the whole thing or jump to one stop"
             onPress={p.onNavTour}/>
        <Row icon="🔗" iconBg="#E0F7FA" iconFg="#00838F"
             title="Integrations" sub="Calendar, health, school portals"
             onPress={() => p.onPlaceholder('Integrations')} last/>
      </View>

      {/* Data & Privacy */}
      <SecLabel>Data &amp; Privacy</SecLabel>
      <View style={s.group}>
        <Row icon="📥" iconBg="#FFE4E0" iconFg="#B83333"
             title="Export your data" sub="Calendar, meals, shopping, notes"
             onPress={() => p.onPlaceholder('Export your data')}/>
        <Row icon="🗑️" iconBg="#FFE4E0" iconFg="#B83333"
             title="Clear chat history" sub="Keep your data, reset Zaeli's thread"
             onPress={() => p.onPlaceholder('Clear chat history')}/>
        <Row icon="🛡️" iconBg="#FFE4E0" iconFg="#B83333"
             title="Privacy policy"
             onPress={() => p.onPlaceholder('Privacy policy')} last/>
      </View>

      {/* Developer — remove before launch */}
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
        <Row icon="🔔" iconBg="#FEF4D0" iconFg="#8A6500"
             title="Fire test notification (10s)"
             sub="Background the app — should buzz in 10 seconds"
             onPress={p.onTestNotification}/>
        <Row icon="📋" iconBg="#FEF4D0" iconFg="#8A6500"
             title="List scheduled briefs"
             sub="Shows what's queued + next fire time"
             onPress={p.onListScheduledBriefs}/>
        <Row icon="🧠" iconBg="#EDE8FF" iconFg="#6B35D9"
             title="Run memory extraction now"
             sub="Analyses recent chats → writes insights (then check Memory)"
             onPress={p.onRunMemoryExtraction} last/>
      </View>

      {/* About */}
      <SecLabel>About</SecLabel>
      <View style={s.group}>
        <Row icon="💬" iconBg="rgba(10,10,10,0.06)" iconFg={INK}
             title="Help &amp; support"
             onPress={() => p.onPlaceholder('Help & support')}/>
        <Row icon="⭐" iconBg="rgba(10,10,10,0.06)" iconFg={INK}
             title="Rate Zaeli"
             onPress={() => p.onPlaceholder('Rate Zaeli')}/>
        <Row icon="📜" iconBg="rgba(10,10,10,0.06)" iconFg={INK}
             title="Terms of service"
             onPress={() => p.onPlaceholder('Terms of service')}/>
        <Row icon="ℹ️" iconBg="rgba(10,10,10,0.06)" iconFg={INK}
             title="Version" value="1.0.0 (build 156)" last/>
      </View>

      {/* Danger */}
      <View style={s.group}>
        <Row icon="🚪" iconBg="rgba(197,48,48,0.1)" iconFg={DANGER}
             title="Sign out" danger onPress={p.onSignOut}/>
        <Row icon="⚠️" iconBg="rgba(197,48,48,0.1)" iconFg={DANGER}
             title="Delete account" sub="Permanent — all family data removed"
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
