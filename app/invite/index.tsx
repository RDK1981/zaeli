/**
 * app/invite/index.tsx — New invite flow (inviter side).
 *
 * Two views in a state machine:
 *   'role'  — pick Adult vs Kid
 *   'form'  — name + optional phone + live SMS preview + Send button
 *
 * Send → createInvite() → opens iOS share sheet via Share.share() with
 * the pre-composed SMS body. After share dismisses, returns to /family
 * (the Family screen will pick up the new pending invite from invite-state).
 *
 * Optional `?role=adult` or `?role=kid` query param can pre-set the role
 * (used when an existing kid member taps "+ Invite to Zaeli" inline).
 *
 * Optional `?name=Anna` query param pre-fills the name field.
 */

import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, Share, Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { createInvite, InviteRole } from '../../lib/invite-state';
import { getProfile, loadProfile } from '../../lib/auth';

const BG = '#FAF8F5';
const INK = '#0A0A0A';
const INK2 = 'rgba(10,10,10,0.72)';
const INK3 = 'rgba(10,10,10,0.55)';
const INK4 = 'rgba(10,10,10,0.42)';
const LINE = 'rgba(10,10,10,0.08)';
const SOFT = 'rgba(10,10,10,0.05)';
const MINT_DEEP = '#2D7A52';
const MINT_TINT = '#E6F7EF';
const MINT_LINE = '#C8F0DA';
const SKY = '#A8D8F0';
const SKY_TINT = '#E8F4FD';
const SKY_DEEP = '#0A4A6A';
const LAV = '#D8CCFF';
const LAV_TINT = '#F0EBFF';
const LAV_DEEP = '#5020C0';

type View = 'role' | 'form';

export default function InviteScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ role?: string; name?: string }>();

  const initialRole = (params.role === 'kid' || params.role === 'adult')
    ? (params.role as InviteRole)
    : null;

  const [view, setView] = useState<View>(initialRole ? 'form' : 'role');
  const [role, setRole] = useState<InviteRole | null>(initialRole);
  const [name, setName] = useState<string>(typeof params.name === 'string' ? params.name : '');
  const [phone, setPhone] = useState<string>('');
  const [sending, setSending] = useState(false);
  // Inviter's first name = the signed-in user (Session 23 — was hardcoded 'Rich').
  const [inviterFirstName, setInviterFirstName] = useState<string>(
    getProfile()?.name?.split(/\s+/)[0] || 'A family member'
  );
  useEffect(() => {
    loadProfile().then(p => { if (p?.name) setInviterFirstName(p.name.split(/\s+/)[0]); });
  }, []);

  function handleBack() {
    if (view === 'form' && !initialRole) { setView('role'); return; }
    router.back();
  }

  function pickRole(r: InviteRole) {
    setRole(r);
    setView('form');
  }

  async function handleSend() {
    if (!role || !name.trim()) {
      Alert.alert('Need a name', 'Pop in their name so I know who I\u2019m welcoming.');
      return;
    }
    setSending(true);
    try {
      const { sms, link } = await createInvite({
        role,
        name: name.trim(),
        phone: phone.trim() || undefined,
        inviterFirstName,
      });

      // Open iOS share sheet with the pre-composed SMS body.
      // User picks Messages / Mail / WhatsApp / Copy / etc.
      try {
        await Share.share({
          message: sms,
          url: link, // iOS only — adds the link to Messages preview
        });
      } catch {
        // User dismissed share — invite is still saved as pending so they
        // can resend / copy from the Family screen.
      }

      // Either way, head back to the Family screen so user sees the pending row.
      router.replace('/(tabs)/family' as any);
    } finally {
      setSending(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────
  const pageLabel = view === 'role'
    ? 'Invite'
    : role === 'adult' ? 'Invite Adult' : 'Invite Kid';

  return (
    <View style={[s.root, { paddingTop: insets.top + 4 }]}>
      <StatusBar style="dark"/>

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={handleBack} activeOpacity={0.7}>
          <Text style={s.backBtnIcon}>{view === 'form' && !initialRole ? '\u2190' : '\u2715'}</Text>
        </TouchableOpacity>
        <Text style={s.pageLabel}>{pageLabel}</Text>
        <View style={{ width: 36 }}/>
      </View>

      {view === 'role' && <RoleView onPick={pickRole}/>}
      {view === 'form' && role && (
        <FormView
          role={role}
          name={name}
          phone={phone}
          sending={sending}
          inviterName={inviterFirstName}
          onChangeName={setName}
          onChangePhone={setPhone}
          onSend={handleSend}
        />
      )}
    </View>
  );
}

// ── Role picker ───────────────────────────────────────────────────────────
function RoleView({ onPick }: { onPick: (r: InviteRole) => void }) {
  return (
    <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
      <Text style={s.eyebrow}>STEP 1 OF 2</Text>
      <Text style={s.h1}>Who are you inviting?</Text>
      <Text style={s.sub}>Adults get full access. Kids get their own Hub — jobs, rewards, games, and Tutor.</Text>

      <View style={s.roleRow}>
        <TouchableOpacity
          style={[s.roleTile, { backgroundColor: SKY_TINT, borderColor: SKY }]}
          onPress={() => onPick('adult')}
          activeOpacity={0.85}
        >
          <Text style={[s.roleName, { color: SKY_DEEP }]}>Adult</Text>
          <Text style={s.roleDesc}>Other parent, grandparent, carer, nanny.</Text>
          <View style={s.roleFeatures}>
            <RoleFeature text="Full app access"/>
            <RoleFeature text="Edits everything"/>
            <RoleFeature text="Their own Zaeli"/>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.roleTile, { backgroundColor: LAV_TINT, borderColor: LAV }]}
          onPress={() => onPick('kid')}
          activeOpacity={0.85}
        >
          <Text style={[s.roleName, { color: LAV_DEEP }]}>Kid</Text>
          <Text style={s.roleDesc}>A child in your family with their own device.</Text>
          <View style={s.roleFeatures}>
            <RoleFeature text="Full app (no Budget/Family)"/>
            <RoleFeature text="Kids Hub + Tutor"/>
            <RoleFeature text="Chat with Zaeli"/>
          </View>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function RoleFeature({ text }: { text: string }) {
  return (
    <View style={s.roleFeatureRow}>
      <Text style={s.roleFeatureTick}>✓</Text>
      <Text style={s.roleFeatureTxt}>{text}</Text>
    </View>
  );
}

// ── Form ──────────────────────────────────────────────────────────────────
function FormView(p: {
  role: InviteRole;
  name: string;
  phone: string;
  sending: boolean;
  inviterName: string;
  onChangeName: (v: string) => void;
  onChangePhone: (v: string) => void;
  onSend: () => void;
}) {
  // Live SMS preview — mirrors what invite-state.composeSms does
  const first = (p.name.trim() || (p.role === 'adult' ? 'Anna' : 'Poppy')).split(/\s+/)[0];
  const previewSms = p.role === 'adult'
    ? `${first} — ${p.inviterName} invited you to join our family on Zaeli 🏡 It\u2019s the family-life app — handles the daily juggle. Set up takes 2 min: zaeli.app/i/\u2026`
    : `${first}! 🎉 ${p.inviterName} set up Zaeli for our family — your own hub, jobs, games, Tutor for homework, plus the family calendar, meals and shopping. Tap to join: zaeli.app/i/\u2026`;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={s.eyebrow}>STEP 2 OF 2</Text>
        <Text style={s.h1}>Who's joining?</Text>
        <Text style={s.sub}>We'll send them a link to set up. Takes 90 seconds.</Text>

        <View style={{ marginTop: 22 }}>
          <Text style={s.formLabel}>Their name</Text>
          <TextInput
            style={s.formInput}
            value={p.name}
            onChangeText={p.onChangeName}
            placeholder={p.role === 'adult' ? 'e.g. Anna' : 'e.g. Poppy'}
            placeholderTextColor={INK4}
            autoCapitalize="words"
            returnKeyType="next"
          />

          <Text style={[s.formLabel, { marginTop: 16 }]}>
            Phone or email <Text style={{ color: INK4, fontFamily: 'Poppins_400Regular' }}>(optional)</Text>
          </Text>
          <TextInput
            style={s.formInput}
            value={p.phone}
            onChangeText={p.onChangePhone}
            placeholder="+61 4XX XXX XXX"
            placeholderTextColor={INK4}
            keyboardType="email-address"
            autoCapitalize="none"
            returnKeyType="done"
          />
          <Text style={s.formHint}>If left blank, you'll just copy the link to send.</Text>
        </View>

        {/* SMS preview */}
        <View style={s.previewCard}>
          <Text style={s.previewLabel}>WHAT {first.toUpperCase()} WILL SEE</Text>
          <Text style={s.previewBody}>{previewSms}</Text>
        </View>

        <TouchableOpacity
          style={[s.sendCta, p.sending && { opacity: 0.5 }]}
          onPress={p.onSend}
          activeOpacity={0.85}
          disabled={p.sending}
        >
          <Text style={s.sendCtaTxt}>{p.sending ? 'Opening share sheet…' : '📨  Send invite'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  header: {
    paddingHorizontal: 18, paddingBottom: 8,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: SOFT,
    alignItems: 'center', justifyContent: 'center',
  },
  backBtnIcon: { fontFamily: 'Poppins_600SemiBold', fontSize: 18, color: INK2 },
  pageLabel: { fontFamily: 'Poppins_700Bold', fontSize: 17, color: INK2 },

  body: { padding: 22, paddingBottom: 40 },

  eyebrow: {
    fontFamily: 'Poppins_700Bold', fontSize: 12,
    color: MINT_DEEP, letterSpacing: 0.8,
    textTransform: 'uppercase', marginBottom: 8,
  },
  h1: {
    fontFamily: 'Poppins_700Bold', fontSize: 28,
    color: INK, lineHeight: 34, letterSpacing: -0.4,
  },
  sub: {
    fontFamily: 'Poppins_400Regular', fontSize: 15,
    color: INK3, lineHeight: 22, marginTop: 8,
  },

  // Role picker
  roleRow: { flexDirection: 'row', gap: 12, marginTop: 22 },
  roleTile: {
    flex: 1, padding: 22, borderRadius: 18,
    borderWidth: 2,
  },
  roleEmoji: { fontSize: 38, marginBottom: 12 },
  roleName: {
    fontFamily: 'Poppins_700Bold', fontSize: 18,
    color: INK, marginBottom: 6,
  },
  roleDesc: {
    fontFamily: 'Poppins_400Regular', fontSize: 13,
    color: INK2, lineHeight: 19,
  },
  roleFeatures: { marginTop: 12, gap: 4 },
  roleFeatureRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  roleFeatureTick: {
    fontFamily: 'Poppins_700Bold', fontSize: 12,
    color: MINT_DEEP,
  },
  roleFeatureTxt: {
    fontFamily: 'Poppins_500Medium', fontSize: 11,
    color: INK3,
  },

  // Form
  formLabel: {
    fontFamily: 'Poppins_600SemiBold', fontSize: 13,
    color: INK2, marginBottom: 6,
  },
  formInput: {
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: LINE,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14,
    fontFamily: 'Poppins_400Regular', fontSize: 16, color: INK,
  },
  formHint: {
    fontFamily: 'Poppins_400Regular', fontSize: 11,
    color: INK4, marginTop: 6,
  },

  previewCard: {
    backgroundColor: MINT_TINT, borderRadius: 12,
    padding: 14, marginTop: 18,
  },
  previewLabel: {
    fontFamily: 'Poppins_700Bold', fontSize: 11,
    color: MINT_DEEP, letterSpacing: 0.6, marginBottom: 6,
  },
  previewBody: {
    fontFamily: 'Poppins_400Regular', fontSize: 13,
    color: INK2, lineHeight: 19,
  },

  sendCta: {
    backgroundColor: INK, paddingVertical: 16, borderRadius: 14,
    alignItems: 'center', marginTop: 22,
  },
  sendCtaTxt: {
    fontFamily: 'Poppins_700Bold', fontSize: 16, color: '#fff',
  },
});
