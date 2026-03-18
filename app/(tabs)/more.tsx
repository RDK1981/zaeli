/**
 * More screen — hub for Settings, Our Family, To-dos, Notes, Travel
 * app/(tabs)/more.tsx
 */

import { DMSerifDisplay_400Regular } from '@expo-google-fonts/dm-serif-display';
import {
  Poppins_400Regular, Poppins_500Medium,
  Poppins_600SemiBold, Poppins_700Bold,
  useFonts,
} from '@expo-google-fonts/poppins';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { getZaeliProvider, setZaeliProvider } from '../../lib/zaeli-provider';
import {
  Alert, Modal, ScrollView, StyleSheet, Switch, Text,
  TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import { supabase } from '../../lib/supabase';
import { HamburgerButton, NavMenu } from '../components/NavMenu';

const DUMMY_FAMILY_ID = '00000000-0000-0000-0000-000000000001';

const C = {
  bg: '#F7F7F7', card: '#FFFFFF', border: '#E0E0E0',
  ink: '#0A0A0A', ink2: 'rgba(0,0,0,0.50)', ink3: 'rgba(0,0,0,0.28)',
  dark: '#0A0A0A',
  blue: '#0057FF', blueL: 'rgba(0,87,255,0.08)',
  green: '#00C97A', greenL: 'rgba(0,201,122,0.10)',
  orange: '#FF8C00',
  purple: '#9B7FD4', purpleL: 'rgba(155,127,212,0.10)',
  red: '#FF3B3B', redL: 'rgba(255,59,59,0.08)',
  yellow: '#FFE500',
};

// ── Family members ─────────────────────────────────────────────
const KIDS = [
  { id: '3', name: 'Poppy', color: '#9B6DD6', initials: 'P', age: 12 },
  { id: '4', name: 'Gab',   color: '#00B4D8', initials: 'G', age: 10 },
  { id: '5', name: 'Duke',  color: '#4A90E2', initials: 'D', age: 8  },
];

// ── Permissions types ──────────────────────────────────────────
type AccessLevel = 'full' | 'view' | 'hidden';
type ZaeliMode   = 'on' | 'kids' | 'off';

type MemberPermissions = {
  memberId:  string;
  shopping:  AccessLevel;
  calendar:  AccessLevel;
  meals:     AccessLevel;
  todos:     AccessLevel;
  notes:     AccessLevel;
  zaeli:     ZaeliMode;
};

const DEFAULT_PERMS: Omit<MemberPermissions, 'memberId'> = {
  shopping: 'full', calendar: 'full', meals: 'full',
  todos: 'full', notes: 'full', zaeli: 'kids',
};

const ACCESS_CYCLE: AccessLevel[] = ['full', 'view', 'hidden'];
const ZAELI_CYCLE:  ZaeliMode[]   = ['on', 'kids', 'off'];

const ACCESS_META: Record<AccessLevel, { label: string; bg: string; text: string; border: string }> = {
  full:   { label: 'Full',   bg: C.greenL,  text: C.green,  border: 'rgba(0,201,122,0.28)' },
  view:   { label: 'View',   bg: C.blueL,   text: C.blue,   border: 'rgba(0,87,255,0.22)' },
  hidden: { label: 'Hidden', bg: C.redL,    text: C.red,    border: 'rgba(255,59,59,0.22)' },
};
const ZAELI_META: Record<ZaeliMode, { label: string; bg: string; text: string; border: string }> = {
  on:   { label: 'Full',      bg: C.greenL,  text: C.green,  border: 'rgba(0,201,122,0.28)' },
  kids: { label: 'Kids mode', bg: C.purpleL, text: C.purple, border: 'rgba(155,127,212,0.28)' },
  off:  { label: 'Off',       bg: C.redL,    text: C.red,    border: 'rgba(255,59,59,0.22)' },
};

const SCREENS = [
  { key: 'shopping', label: 'Shopping',     emoji: '🛒' },
  { key: 'calendar', label: 'Calendar',     emoji: '📅' },
  { key: 'meals',    label: 'Meal Planner', emoji: '🍽️' },
  { key: 'todos',    label: 'To-dos',       emoji: '✅' },
  { key: 'notes',    label: 'Notes',        emoji: '📝' },
];

// ── SVG Icons ──────────────────────────────────────────────────
function IcoBack() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M15 18l-6-6 6-6" stroke={C.ink} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"/>
    </Svg>
  );
}
function IcoChevron({ color = C.ink3 }: { color?: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path d="M9 18l6-6-6-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/>
    </Svg>
  );
}
function IcoShield({ color = C.ink2 }: { color?: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"/>
    </Svg>
  );
}
function IcoFamily({ color = C.ink2 }: { color?: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Circle cx="9" cy="7" r="3" stroke={color} strokeWidth={1.8}/>
      <Path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" stroke={color} strokeWidth={1.8} strokeLinecap="round"/>
      <Circle cx="18" cy="8" r="2" stroke={color} strokeWidth={1.8}/>
      <Path d="M21 21v-1a3 3 0 00-3-3h-1" stroke={color} strokeWidth={1.8} strokeLinecap="round"/>
    </Svg>
  );
}
function IcoBell({ color = C.ink2 }: { color?: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"/>
    </Svg>
  );
}
function IcoLock({ color = C.ink2 }: { color?: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="11" width="18" height="11" rx="2" stroke={color} strokeWidth={1.8}/>
      <Path d="M7 11V7a5 5 0 0110 0v4" stroke={color} strokeWidth={1.8} strokeLinecap="round"/>
    </Svg>
  );
}
function IcoInfo({ color = C.ink2 }: { color?: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={1.8}/>
      <Line x1="12" y1="8" x2="12" y2="8.5" stroke={color} strokeWidth={2.5} strokeLinecap="round"/>
      <Line x1="12" y1="12" x2="12" y2="16" stroke={color} strokeWidth={1.8} strokeLinecap="round"/>
    </Svg>
  );
}

// ── Pill component (tap to cycle) ──────────────────────────────
function Pill({ meta, onPress }: {
  meta: { label: string; bg: string; text: string; border: string };
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[s.pill, { backgroundColor: meta.bg, borderColor: meta.border }]}
      onPress={onPress}
      activeOpacity={0.75}>
      <Text style={[s.pillTxt, { color: meta.text }]}>{meta.label}</Text>
      <Text style={[s.pillArrow, { color: meta.text }]}>↕</Text>
    </TouchableOpacity>
  );
}

// ── Copy-from modal ────────────────────────────────────────────
function CopyFromModal({ visible, targetName, sourceKids, onSelect, onClose }: {
  visible: boolean; targetName: string;
  sourceKids: typeof KIDS;
  onSelect: (fromId: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={s.modalBg} onPress={onClose} activeOpacity={1}>
        <View style={s.copyCard} onStartShouldSetResponder={() => true}>
          <Text style={s.copyTitle}>Copy settings to {targetName}</Text>
          <Text style={s.copySub}>Overwrites {targetName}'s current settings</Text>
          <View style={{ height: 1, backgroundColor: C.border, marginVertical: 12 }} />
          {sourceKids.map(k => (
            <TouchableOpacity key={k.id} style={s.copyRow} onPress={() => onSelect(k.id)} activeOpacity={0.7}>
              <View style={[s.avatar, { backgroundColor: k.color }]}>
                <Text style={s.avatarTxt}>{k.initials}</Text>
              </View>
              <Text style={s.copyRowTxt}>Copy from {k.name}</Text>
              <IcoChevron />
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={s.copyCancel} onPress={onClose} activeOpacity={0.7}>
            <Text style={s.copyCancelTxt}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// ── Single kid permission card ─────────────────────────────────
function KidPermCard({ kid, perm, onChange, onCopyFrom }: {
  kid: typeof KIDS[0];
  perm: MemberPermissions;
  onChange: (u: Partial<MemberPermissions>) => void;
  onCopyFrom: () => void;
}) {
  const cycleAccess = (key: string) => {
    const cur = perm[key as keyof MemberPermissions] as AccessLevel;
    onChange({ [key]: ACCESS_CYCLE[(ACCESS_CYCLE.indexOf(cur) + 1) % ACCESS_CYCLE.length] });
  };
  const cycleZaeli = () => {
    onChange({ zaeli: ZAELI_CYCLE[(ZAELI_CYCLE.indexOf(perm.zaeli) + 1) % ZAELI_CYCLE.length] });
  };

  return (
    <View style={s.kidCard}>
      {/* Header */}
      <View style={s.kidCardHdr}>
        <View style={[s.avatar, { backgroundColor: kid.color }]}>
          <Text style={s.avatarTxt}>{kid.initials}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.kidName}>{kid.name}</Text>
          <Text style={s.kidAge}>Age {kid.age}</Text>
        </View>
        <TouchableOpacity style={s.copyFromBtn} onPress={onCopyFrom} activeOpacity={0.7}>
          <Text style={s.copyFromTxt}>Copy from…</Text>
        </TouchableOpacity>
      </View>

      <View style={s.cardDivider} />

      {/* Screen rows */}
      {SCREENS.map(sc => (
        <View key={sc.key} style={s.permRow}>
          <Text style={s.permEmoji}>{sc.emoji}</Text>
          <Text style={s.permLabel}>{sc.label}</Text>
          <Pill
            meta={ACCESS_META[perm[sc.key as keyof MemberPermissions] as AccessLevel]}
            onPress={() => cycleAccess(sc.key)}
          />
        </View>
      ))}

      {/* Zaeli row */}
      <View style={[s.permRow, { borderBottomWidth: 0, paddingBottom: 14 }]}>
        <Text style={s.permEmoji}>✦</Text>
        <View style={{ flex: 1 }}>
          <Text style={s.permLabel}>Zaeli Chat</Text>
          <Text style={s.permSubLabel}>Kids mode filters topics &amp; tone</Text>
        </View>
        <Pill meta={ZAELI_META[perm.zaeli]} onPress={cycleZaeli} />
      </View>
    </View>
  );
}

// ── Permissions page ───────────────────────────────────────────
function PermissionsPage({ onBack }: { onBack: () => void }) {
  const [perms, setPerms] = useState<Record<string, MemberPermissions>>(
    Object.fromEntries(KIDS.map(k => [k.id, { memberId: k.id, ...DEFAULT_PERMS }]))
  );
  const [copyTarget, setCopyTarget] = useState<string | null>(null);
  const [saving, setSaving]         = useState(false);
  const [saved,  setSaved]          = useState(false);

  useEffect(() => { loadPerms(); }, []);

  const loadPerms = async () => {
    try {
      const { data } = await supabase
        .from('member_permissions').select('*')
        .eq('family_id', DUMMY_FAMILY_ID);
      if (data?.length) {
        const loaded: Record<string, MemberPermissions> = {};
        data.forEach((row: any) => {
          loaded[row.member_id] = {
            memberId: row.member_id,
            shopping: row.shopping || 'full',
            calendar: row.calendar || 'full',
            meals:    row.meals    || 'full',
            todos:    row.todos    || 'full',
            notes:    row.notes    || 'full',
            zaeli:    row.zaeli    || 'kids',
          };
        });
        KIDS.forEach(k => { if (!loaded[k.id]) loaded[k.id] = { memberId: k.id, ...DEFAULT_PERMS }; });
        setPerms(loaded);
      }
    } catch (e) { console.log('Load perms error:', e); }
  };

  const update = (id: string, u: Partial<MemberPermissions>) => {
    setPerms(prev => ({ ...prev, [id]: { ...prev[id], ...u } }));
    setSaved(false);
  };

  const copyPerms = (toId: string, fromId: string) => {
    const src = perms[fromId];
    if (src) setPerms(prev => ({ ...prev, [toId]: { ...src, memberId: toId } }));
    setCopyTarget(null);
    setSaved(false);
  };

  const save = async () => {
    setSaving(true);
    try {
      const rows = KIDS.map(k => ({
        family_id: DUMMY_FAMILY_ID, member_id: k.id,
        shopping: perms[k.id].shopping, calendar: perms[k.id].calendar,
        meals: perms[k.id].meals, todos: perms[k.id].todos,
        notes: perms[k.id].notes, zaeli: perms[k.id].zaeli,
      }));
      const { error } = await supabase
        .from('member_permissions')
        .upsert(rows, { onConflict: 'family_id,member_id' });
      if (error) console.log('Save perms error:', error);
      else { setSaved(true); setTimeout(() => setSaved(false), 2500); }
    } catch (e) { console.log(e); }
    setSaving(false);
  };

  const copyTargetKid = KIDS.find(k => k.id === copyTarget);

  return (
    <View style={{ flex: 1 }}>
      {/* Sub-header */}
      <View style={s.subHdr}>
        <TouchableOpacity style={s.backBtn} onPress={onBack} activeOpacity={0.7}>
          <IcoBack />
        </TouchableOpacity>
        <Text style={s.subHdrTitle}>Permissions</Text>
        <TouchableOpacity
          style={[s.saveBtn, saved && s.saveBtnDone]}
          onPress={save} disabled={saving} activeOpacity={0.85}>
          <Text style={[s.saveBtnTxt, saved && { color: C.green }]}>
            {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 18, gap: 12, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}>

        {/* Info banner */}
        <View style={s.infoBanner}>
          <IcoShield color={C.blue} />
          <Text style={s.infoBannerTxt}>
            Controls for <Text style={{ fontFamily: 'Poppins_700Bold' }}>Poppy, Gab and Duke</Text>. Anna and Richard always have full access.
          </Text>
        </View>

        {/* Legend */}
        <View style={s.legend}>
          {Object.entries(ACCESS_META).map(([key, m]) => (
            <View key={key} style={s.legendItem}>
              <View style={[s.legendDot, { backgroundColor: m.text }]} />
              <Text style={s.legendTxt}>{m.label}</Text>
            </View>
          ))}
          <View style={s.legendItem}>
            <View style={[s.legendDot, { backgroundColor: C.purple }]} />
            <Text style={s.legendTxt}>Kids mode</Text>
          </View>
        </View>

        {/* One card per kid */}
        {KIDS.map(kid => (
          <KidPermCard
            key={kid.id}
            kid={kid}
            perm={perms[kid.id]}
            onChange={u => update(kid.id, u)}
            onCopyFrom={() => setCopyTarget(kid.id)}
          />
        ))}

        <Text style={s.footNote}>
          Tap any pill to cycle through options. Press Save when done.
        </Text>
      </ScrollView>

      {copyTargetKid && (
        <CopyFromModal
          visible={!!copyTarget}
          targetName={copyTargetKid.name}
          sourceKids={KIDS.filter(k => k.id !== copyTarget)}
          onSelect={fromId => copyPerms(copyTarget!, fromId)}
          onClose={() => setCopyTarget(null)}
        />
      )}
    </View>
  );
}

// ── Settings page ──────────────────────────────────────────────
function SettingsPage({ onBack, onNav }: { onBack: () => void; onNav: (p: string) => void }) {
  const ROWS = [
    { key: 'family',        label: 'Our Family',    sub: 'Members, profiles, avatars',    icon: <IcoFamily />,  bg: '#EEF2FF' },
    { key: 'permissions',   label: 'Permissions',   sub: 'Screen access controls for kids', icon: <IcoShield color={C.green} />, bg: C.greenL },
    { key: 'notifications', label: 'Notifications', sub: 'What Zaeli tells you and when',  icon: <IcoBell />,    bg: '#FFF8ED' },
    { key: 'account',       label: 'Account',       sub: 'Login, plan, data',              icon: <IcoLock />,    bg: '#FFF0F0' },
    { key: 'about',         label: 'About Zaeli',   sub: 'Version, feedback, legal',       icon: <IcoInfo />,    bg: C.bg },
  ];

  return (
    <View style={{ flex: 1 }}>
      <View style={s.subHdr}>
        <TouchableOpacity style={s.backBtn} onPress={onBack} activeOpacity={0.7}><IcoBack /></TouchableOpacity>
        <Text style={s.subHdrTitle}>Settings</Text>
        <View style={{ width: 64 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
        <View style={s.settingsCard}>
          {ROWS.map((row, i) => (
            <React.Fragment key={row.key}>
              <TouchableOpacity style={s.settingsRow} onPress={() => onNav(row.key)} activeOpacity={0.7}>
                <View style={[s.settingsIcon, { backgroundColor: row.bg }]}>{row.icon}</View>
                <View style={{ flex: 1 }}>
                  <Text style={s.settingsLabel}>{row.label}</Text>
                  <Text style={s.settingsSub}>{row.sub}</Text>
                </View>
                <IcoChevron color={row.key === 'permissions' ? C.green : C.ink3} />
              </TouchableOpacity>
              {i < ROWS.length - 1 && <View style={s.rowSep} />}
            </React.Fragment>
          ))}
        </View>
        {/* ── AI Provider toggle (test mode) ── */}
        <AiProviderToggle />
        <Text style={s.versionTxt}>Zaeli · v0.1.0 · Family edition</Text>
      </ScrollView>
    </View>
  );
}

// ── AI Provider Toggle ─────────────────────────────────────────
function AiProviderToggle() {
  const [provider, setProvider] = useState<'claude'|'openai'>(getZaeliProvider());
  const toggle = () => {
    const next = provider === 'claude' ? 'openai' : 'claude';
    setZaeliProvider(next);
    setProvider(next);
    Alert.alert(
      next === 'openai' ? '🧪 Test mode on' : '✅ Back to Claude',
      next === 'openai'
        ? 'Zaeli will now use GPT-5.4 mini for all chats. Homework stays on Claude Sonnet.'
        : 'Zaeli is back to the Sonnet/Haiku blend.',
      [{text:'Got it'}]
    );
  };
  return (
    <View style={{ marginTop: 24, backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(0,0,0,0.07)' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: '#0A0A0A' }}>
            AI Engine {provider === 'openai' ? '🧪' : ''}
          </Text>
          <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 12, color: 'rgba(0,0,0,0.5)', marginTop: 2 }}>
            {provider === 'claude' ? 'Claude Sonnet/Haiku (production)' : 'GPT-5.4 mini (test mode)'}
          </Text>
        </View>
        <Switch
          value={provider === 'openai'}
          onValueChange={toggle}
          trackColor={{ false: 'rgba(0,0,0,0.12)', true: '#0057FF' }}
          thumbColor={'#fff'}
        />
      </View>
      {provider === 'openai' && (
        <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 11, color: '#E0007C', marginTop: 8 }}>
          Test mode active — comparing GPT-5.4 mini vs Claude
        </Text>
      )}
    </View>
  );
}

// ── Stub page ──────────────────────────────────────────────────
function StubPage({ title, emoji, onBack }: { title: string; emoji: string; onBack: () => void }) {
  return (
    <View style={{ flex: 1 }}>
      <View style={s.subHdr}>
        <TouchableOpacity style={s.backBtn} onPress={onBack} activeOpacity={0.7}><IcoBack /></TouchableOpacity>
        <Text style={s.subHdrTitle}>{title}</Text>
        <View style={{ width: 64 }} />
      </View>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        <Text style={{ fontSize: 44 }}>{emoji}</Text>
        <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 16, color: C.ink }}>{title}</Text>
        <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 13, color: C.ink2 }}>Coming soon</Text>
      </View>
    </View>
  );
}

// ── More home ──────────────────────────────────────────────────
function MoreHome({ onNav }: { onNav: (p: string) => void }) {
  const TILES = [
    { key: 'todo',     label: 'To-dos',     emoji: '✅', bg: '#EDFFF6', border: 'rgba(0,201,122,0.18)' },
    { key: 'notes',    label: 'Notes',      emoji: '📝', bg: '#F3EEFF', border: 'rgba(155,127,212,0.18)' },
    { key: 'travel',   label: 'Travel',     emoji: '✈️', bg: '#E8F8FF', border: 'rgba(0,180,216,0.18)' },
    { key: 'family',   label: 'Our Family', emoji: '👨‍👩‍👧‍👦', bg: '#EEF2FF', border: 'rgba(0,87,255,0.14)' },
    { key: 'settings', label: 'Settings',   emoji: '⚙️', bg: C.card,    border: C.border },
  ];
  return (
    <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
      <Text style={s.moreIntro}>Everything else lives here.</Text>
      <View style={{ gap: 8, marginTop: 8 }}>
        {TILES.map(t => (
          <TouchableOpacity key={t.key} style={[s.tile, { backgroundColor: t.bg, borderColor: t.border }]} onPress={() => onNav(t.key)} activeOpacity={0.75}>
            <Text style={s.tileEmoji}>{t.emoji}</Text>
            <Text style={s.tileLabel}>{t.label}</Text>
            <IcoChevron />
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

// ── Root screen ────────────────────────────────────────────────
export default function MoreScreen() {
  const params = useLocalSearchParams<{ initialPage?: string }>();
  const router = useRouter();
  const [navOpen, setNavOpen] = useState(false);
  const [page, setPage]       = useState(params.initialPage || 'home');

  const [fontsLoaded] = useFonts({
    Poppins_400Regular, Poppins_500Medium,
    Poppins_600SemiBold, Poppins_700Bold,
    DMSerifDisplay_400Regular,
  });

  useEffect(() => {
    if (params.initialPage) setPage(params.initialPage);
  }, [params.initialPage]);

  if (!fontsLoaded) return null;

  // Title shown in dark hero
  const TITLES: Record<string, string> = {
    home: 'More', settings: 'Settings', permissions: 'Permissions',
    family: 'Our Family', todo: 'To-dos', notes: 'Notes',
    travel: 'Travel', notifications: 'Notifications',
    account: 'Account', about: 'About',
  };

  const renderPage = () => {
    switch (page) {
      case 'settings':     return <SettingsPage onBack={() => router.back()} onNav={setPage} />;
      case 'permissions':  return <PermissionsPage onBack={() => setPage('settings')} />;
      case 'notifications':return <StubPage title="Notifications" emoji="🔔" onBack={() => setPage('settings')} />;
      case 'account':      return <StubPage title="Account"       emoji="🔒" onBack={() => setPage('settings')} />;
      case 'about':        return <StubPage title="About Zaeli"   emoji="✦"  onBack={() => setPage('settings')} />;
      case 'family':       return <StubPage title="Our Family"    emoji="👨‍👩‍👧‍👦" onBack={() => router.back()} />;
      case 'todo':         return <StubPage title="To-dos"        emoji="✅" onBack={() => router.back()} />;
      case 'notes':        return <StubPage title="Notes"         emoji="📝" onBack={() => router.back()} />;
      case 'travel':       return <StubPage title="Travel"        emoji="✈️" onBack={() => router.back()} />;
      default:             { router.back(); return null; }
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.dark }}>
      <StatusBar style="light" />
      <SafeAreaView edges={['top']} style={{ backgroundColor: C.dark }}>
        <View style={s.hero}>
          <View style={s.heroRow}>
            <View style={s.logoWrap}>
              <View style={s.logoMark}>
                <Text style={{ fontSize: 18, color: '#fff' }}>✦</Text>
              </View>
              <Text style={s.logoWord}>
                {'z'}<Text style={{ color: '#FFE500' }}>{'a'}</Text>{'el'}<Text style={{ color: '#FFE500' }}>{'i'}</Text>
              </Text>
            </View>
            <Text style={s.heroTitle}>{TITLES[page] || 'More'}</Text>
            <HamburgerButton onPress={() => setNavOpen(true)} />
          </View>
        </View>
      </SafeAreaView>

      <View style={{ flex: 1, backgroundColor: C.bg }}>
        {renderPage()}
      </View>

      <NavMenu visible={navOpen} onClose={() => setNavOpen(false)} />
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────
const s = StyleSheet.create({
  // Hero
  hero:       { paddingHorizontal: 22, paddingBottom: 14, paddingTop: 4 },
  heroRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroTitle:  { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 28, color: '#fff', letterSpacing: -0.5, position: 'absolute', left: 0, right: 0, textAlign: 'center' },
  logoWrap:   { flexDirection: 'row', alignItems: 'center', gap: 8, zIndex: 1 },
  logoMark:   { width: 34, height: 34, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  logoWord:   { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 24, color: '#fff', letterSpacing: -0.5 },

  // Sub-header (white, inside body)
  subHdr:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.card },
  subHdrTitle: { fontFamily: 'Poppins_700Bold', fontSize: 16, color: C.ink },
  backBtn:     { width: 36, height: 36, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.05)', alignItems: 'center', justifyContent: 'center' },
  saveBtn:     { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 10, backgroundColor: C.blue, minWidth: 64, alignItems: 'center' },
  saveBtnDone: { backgroundColor: C.greenL, borderWidth: 1.5, borderColor: 'rgba(0,201,122,0.28)' },
  saveBtnTxt:  { fontFamily: 'Poppins_700Bold', fontSize: 13, color: '#fff' },

  // More home tiles
  moreIntro:  { fontFamily: 'Poppins_400Regular', fontSize: 14, color: C.ink2 },
  tile:       { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 16, borderWidth: 1.5 },
  tileEmoji:  { fontSize: 22, width: 28, textAlign: 'center' },
  tileLabel:  { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: C.ink, flex: 1 },

  // Settings list
  settingsCard:  { backgroundColor: C.card, borderRadius: 18, borderWidth: 1.5, borderColor: C.border, overflow: 'hidden', marginBottom: 16 },
  settingsRow:   { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  settingsIcon:  { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  settingsLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: C.ink },
  settingsSub:   { fontFamily: 'Poppins_400Regular', fontSize: 12, color: C.ink2, marginTop: 1 },
  rowSep:        { height: 1, backgroundColor: C.border, marginLeft: 68 },
  versionTxt:    { fontFamily: 'Poppins_400Regular', fontSize: 11, color: C.ink3, textAlign: 'center', marginTop: 4 },

  // Permissions
  infoBanner:    { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: C.blueL, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: 'rgba(0,87,255,0.14)' },
  infoBannerTxt: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: C.ink, lineHeight: 19, flex: 1 },
  legend:        { flexDirection: 'row', gap: 12, paddingHorizontal: 2, flexWrap: 'wrap' },
  legendItem:    { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot:     { width: 7, height: 7, borderRadius: 3.5 },
  legendTxt:     { fontFamily: 'Poppins_400Regular', fontSize: 11, color: C.ink2 },
  footNote:      { fontFamily: 'Poppins_400Regular', fontSize: 12, color: C.ink3, textAlign: 'center', paddingHorizontal: 20, lineHeight: 18 },

  // Kid permission card
  kidCard:     { backgroundColor: C.card, borderRadius: 18, borderWidth: 1.5, borderColor: C.border, overflow: 'hidden' },
  kidCardHdr:  { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  cardDivider: { height: 1, backgroundColor: C.border, marginHorizontal: 16, marginBottom: 2 },
  kidName:     { fontFamily: 'Poppins_700Bold', fontSize: 15, color: C.ink },
  kidAge:      { fontFamily: 'Poppins_400Regular', fontSize: 12, color: C.ink2 },
  avatar:      { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarTxt:   { fontFamily: 'Poppins_700Bold', fontSize: 16, color: '#fff' },
  copyFromBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.05)', borderWidth: 1, borderColor: C.border },
  copyFromTxt: { fontFamily: 'Poppins_500Medium', fontSize: 11, color: C.ink2 },

  // Permission rows
  permRow:      { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: C.border },
  permEmoji:    { fontSize: 18, width: 26, textAlign: 'center', flexShrink: 0 },
  permLabel:    { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: C.ink, flex: 1 },
  permSubLabel: { fontFamily: 'Poppins_400Regular', fontSize: 11, color: C.ink3, marginTop: 1 },

  // Pill
  pill:      { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1.5, flexShrink: 0 },
  pillTxt:   { fontFamily: 'Poppins_600SemiBold', fontSize: 11 },
  pillArrow: { fontSize: 10, fontFamily: 'Poppins_700Bold' },

  // Copy from modal
  modalBg:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', paddingHorizontal: 32 },
  copyCard:     { backgroundColor: C.card, borderRadius: 20, padding: 20 },
  copyTitle:    { fontFamily: 'Poppins_700Bold', fontSize: 15, color: C.ink, marginBottom: 3 },
  copySub:      { fontFamily: 'Poppins_400Regular', fontSize: 12, color: C.ink2 },
  copyRow:      { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 },
  copyRowTxt:   { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: C.ink, flex: 1 },
  copyCancel:   { marginTop: 4, paddingVertical: 11, borderRadius: 12, borderWidth: 1.5, borderColor: C.border, alignItems: 'center' },
  copyCancelTxt:{ fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: C.ink2 },
});