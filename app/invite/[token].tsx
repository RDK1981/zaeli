/**
 * app/invite/[token].tsx — Invite receiver / acceptance flow.
 *
 * Triggered when someone taps zaeli.app/i/<token> from an SMS.
 * Looks up the invite locally (v1; backend pass swaps for Supabase),
 * branches to AdultFlow (3 steps) or KidFlow (2 steps).
 *
 * Phase 2d (current): receiver actually creates a Supabase auth user via
 * signUpFromInvite(). The handle_new_user() DB trigger reads `invite_token`
 * from raw_user_meta_data, validates it, creates the invitee's profile
 * linked to the inviter's family_id, and marks the invite accepted in
 * the same transaction. This means the invitee is fully signed in after
 * onboarding completes — they can read family data via RLS, and (once
 * cross-device deep linking lands in Phase 3) work on a different
 * physical device.
 *
 * Adult invitee: email + password from the form go straight to signup.
 * Kid invitee:   we generate a synthetic email + use token+PIN as the
 *                password (Supabase requires 6+ chars). Kid sign-IN
 *                (vs first signup) ergonomics come in a later phase.
 *
 * On finish:
 *   - signUpFromInvite(token, email, password, name) → creates auth user
 *     + profile linked to inviter's family + marks invite accepted (via trigger)
 *   - loadProfile() so getCurrentFamilyId() works immediately on next screen
 *   - setAccount({...}) for MoreSheet permission gating (kid only — owner/adult fine)
 *   - Adult: set onboarding_complete + onboarding_just_completed → routes to chat → tour offer fires
 *   - Kid: routes to /(tabs)/kids → lands in their Hub
 */

import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, KeyboardAvoidingView, Platform, StatusBar as RNStatusBar, Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lookupInviteByToken, type Invite } from '../../lib/invite-state';
import { setAccount } from '../../lib/account-state';
import { signUpFromInvite, loadProfile } from '../../lib/auth';

const BG = '#FAF8F5';
const INK = '#0A0A0A';
const INK2 = 'rgba(10,10,10,0.72)';
const INK3 = 'rgba(10,10,10,0.55)';
const INK4 = 'rgba(10,10,10,0.42)';
const LINE = 'rgba(10,10,10,0.08)';
const SOFT = 'rgba(10,10,10,0.05)';
const CORAL = '#FF4545';
const MINT_DEEP = '#2D7A52';
const MINT_TINT = '#E6F7EF';
const MINT_LINE = '#C8F0DA';
const SKY = '#A8D8F0';
const PEACH = '#FAC8A8';
const LAV = '#D8CCFF';
const LAV_DEEP = '#5020C0';
const VIOLET = '#6B35D9';

export default function InviteTokenScreen() {
  const params = useLocalSearchParams<{ token?: string }>();
  const token = typeof params.token === 'string' ? params.token : '';
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [invite, setInvite] = useState<Invite | null>(null);
  const [view, setView] = useState<'loading' | 'invalid' | 'flow'>('loading');

  useEffect(() => {
    (async () => {
      // Phase 2b — receiver lookup hits SECURITY DEFINER RPC (no auth needed)
      const inv = await lookupInviteByToken(token);
      if (!inv) { setView('invalid'); return; }
      if (inv.status === 'revoked') { setView('invalid'); return; }
      if (inv.status === 'accepted') {
        // Already accepted — just route them home (or hub for kids)
        if (inv.role === 'kid') router.replace('/(tabs)/kids' as any);
        else router.replace('/(tabs)/swipe-world' as any);
        return;
      }
      setInvite(inv);
      setView('flow');
    })();
  }, [token]);

  if (view === 'loading') {
    return (
      <View style={[s.root, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}>
        <StatusBar style="dark"/>
        <Text style={s.loadingTxt}>Looking for your invite…</Text>
      </View>
    );
  }

  if (view === 'invalid') {
    return (
      <View style={[s.root, { paddingTop: insets.top + 20 }]}>
        <StatusBar style="dark"/>
        <View style={s.invalidWrap}>
          <Text style={s.invalidEmoji}>🤔</Text>
          <Text style={s.invalidH1}>This link doesn't work.</Text>
          <Text style={s.invalidSub}>The invite may have been revoked or already used. Ask the person who sent it to send a new one.</Text>
        </View>
      </View>
    );
  }

  if (!invite) return null;

  return invite.role === 'adult'
    ? <AdultFlow invite={invite} onFinish={(creds) => finishAdult(invite, creds, router)}/>
    : <KidFlow invite={invite} onFinish={(extras) => finishKid(invite, extras, router)}/>;
}

// ── Finish handlers (Phase 2d — real Supabase signup) ────────────────────
async function finishAdult(
  invite: Invite,
  creds: { name: string; email: string; password: string },
  router: ReturnType<typeof useRouter>,
) {
  try {
    await signUpFromInvite({
      inviteToken: invite.token,
      email:       creds.email,
      password:    creds.password,
      name:        creds.name,
    });
    // Trigger created profile + marked invite accepted in same transaction.
    // Now load profile so getCurrentFamilyId() resolves on the next screen.
    await loadProfile();
    await setAccount({ kind: 'adult', name: invite.name.split(/\s+/)[0] });
    try {
      await AsyncStorage.setItem('onboarding_complete', 'true');
      await AsyncStorage.setItem('onboarding_just_completed', 'true');
    } catch {}
    router.replace('/(tabs)/swipe-world' as any);
  } catch (e: any) {
    const msg = String(e?.message || e || 'Something went wrong');
    Alert.alert(
      'Sign-up failed',
      msg.toLowerCase().includes('already')
        ? 'An account already exists with that email. Try a different one, or sign in.'
        : msg,
    );
  }
}

async function finishKid(
  invite: Invite,
  extras: { avatar: string; pin: string },
  router: ReturnType<typeof useRouter>,
) {
  // Synthetic email + token-based password — kids don't have real email
  // and Supabase requires 6+ char passwords (4-digit PIN alone is too short).
  // Sign-IN ergonomics for kids are a later phase; for now they just stay
  // signed in via AsyncStorage session persistence.
  const synthEmail    = `kid-${invite.token}@invitees.zaeli.app`;
  const synthPassword = `${invite.token}-${extras.pin}`;
  try {
    await signUpFromInvite({
      inviteToken: invite.token,
      email:       synthEmail,
      password:    synthPassword,
      name:        invite.name,
    });
    await loadProfile();
    await setAccount({ kind: 'kid', name: invite.name.split(/\s+/)[0], avatar: extras.avatar });
    try {
      await AsyncStorage.setItem('onboarding_complete', 'true');
      // One-shot flag — Kids Hub reads + clears on mount, shows welcome banner
      await AsyncStorage.setItem('kid_just_joined', 'true');
    } catch {}
    router.replace('/(tabs)/kids' as any);
  } catch (e: any) {
    const msg = String(e?.message || e || 'Something went wrong');
    Alert.alert('Sign-up failed', msg);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ADULT FLOW
// ═══════════════════════════════════════════════════════════════════════════
type AdultStep = 'welcome' | 'account' | 'rhythm' | 'preferences';

function AdultFlow({
  invite, onFinish,
}: {
  invite: Invite;
  onFinish: (creds: { name: string; email: string; password: string }) => void;
}) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<AdultStep>('welcome');

  const first = invite.name.split(/\s+/)[0];
  // Session 23 — real inviter name from the invite (was hardcoded 'Rich')
  const inviter = invite.inviterName || 'A family member';
  const [fullName, setFullName] = useState(invite.name);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [morningTime, setMorningTime] = useState('7:15 am');
  const [eveningTime, setEveningTime] = useState('8:30 pm');

  function next() {
    if (step === 'welcome') setStep('account');
    else if (step === 'account') setStep('rhythm');
    else if (step === 'rhythm') setStep('preferences');
    else onFinish({ name: fullName, email, password });
  }
  function back() {
    if (step === 'account') setStep('welcome');
    else if (step === 'rhythm') setStep('account');
    else if (step === 'preferences') setStep('rhythm');
  }

  return (
    <View style={[s.root, { paddingTop: insets.top + 4 }]}>
      <StatusBar style="dark"/>

      {step !== 'welcome' && (
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={back} activeOpacity={0.7}>
            <Text style={s.backBtnIcon}>←</Text>
          </TouchableOpacity>
          <Text style={s.pageLabel}>Setup</Text>
          <View style={{ width: 36 }}/>
        </View>
      )}

      {step === 'welcome' && <AdultWelcome first={first} inviter={inviter} onNext={next}/>}
      {step === 'account' && (
        <AdultAccountStep
          fullName={fullName} email={email} password={password}
          onChangeName={setFullName} onChangeEmail={setEmail} onChangePassword={setPassword}
          onNext={next}
        />
      )}
      {step === 'rhythm' && (
        <AdultRhythmStep
          morning={morningTime} evening={eveningTime}
          onChangeMorning={setMorningTime} onChangeEvening={setEveningTime}
          onNext={next}
        />
      )}
      {step === 'preferences' && <AdultPrefsStep inviter={inviter} onFinish={() => onFinish({ name: fullName, email, password })}/>}
    </View>
  );
}

function AdultWelcome({ first, inviter, onNext }: { first: string; inviter: string; onNext: () => void }) {
  return (
    <View style={s.welcomeFlex}>
      <View style={[s.orb, s.orbPeach]} pointerEvents="none"/>
      <View style={[s.orb, s.orbMint]} pointerEvents="none"/>
      <View style={[s.orb, s.orbLav]} pointerEvents="none"/>
      <View style={[s.orb, s.orbSky]} pointerEvents="none"/>
      <View style={s.welcomeContent}>
        <Text style={s.welcomeEyebrow}>WELCOME</Text>
        <Text style={s.welcomeH1}>Hey {first} 👋{'\n'}I'm <Text style={{ color: CORAL }}>Zaeli</Text>.</Text>
        <Text style={s.welcomeSub}>{inviter} already set up your family — the kids, the calendar, the lot. Quick 90-second setup just for you, then I'll show you around.</Text>
      </View>
      <TouchableOpacity style={s.welcomeCta} onPress={onNext} activeOpacity={0.85}>
        <Text style={s.welcomeCtaTxt}>Let's go</Text>
      </TouchableOpacity>
    </View>
  );
}

function AdultAccountStep(p: {
  fullName: string; email: string; password: string;
  onChangeName: (v: string) => void; onChangeEmail: (v: string) => void; onChangePassword: (v: string) => void;
  onNext: () => void;
}) {
  // Phase 2d — validate before letting them continue (otherwise signup fails
  // at the end with a confusing alert). Email needs an @ + dot, password 6+.
  const emailOk = /^\S+@\S+\.\S+$/.test(p.email.trim());
  const pwOk    = p.password.length >= 6;
  const canContinue = !!p.fullName.trim() && emailOk && pwOk;
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={s.eyebrow}>STEP 1 OF 3</Text>
        <Text style={s.h1}>Confirm a couple things.</Text>
        <Text style={s.sub}>Just to make sure I've got you right.</Text>

        <View style={{ marginTop: 22 }}>
          <Text style={s.formLabel}>Your name</Text>
          <TextInput style={s.formInput} value={p.fullName} onChangeText={p.onChangeName} autoCapitalize="words"/>

          <Text style={[s.formLabel, { marginTop: 16 }]}>Email</Text>
          <TextInput
            style={s.formInput} value={p.email} onChangeText={p.onChangeEmail}
            placeholder="anna@example.com" placeholderTextColor={INK4}
            keyboardType="email-address" autoCapitalize="none"
          />

          <Text style={[s.formLabel, { marginTop: 16 }]}>Create a password</Text>
          <TextInput
            style={s.formInput} value={p.password} onChangeText={p.onChangePassword}
            placeholder="At least 6 characters" placeholderTextColor={INK4}
            secureTextEntry
          />
          <Text style={s.formHint}>Keeps your stuff yours.</Text>

          <TouchableOpacity
            style={[s.primaryCta, !canContinue && { opacity: 0.4 }]}
            onPress={p.onNext}
            activeOpacity={0.85}
            disabled={!canContinue}
          >
            <Text style={s.primaryCtaTxt}>Continue</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function AdultRhythmStep(p: {
  morning: string; evening: string;
  onChangeMorning: (v: string) => void; onChangeEvening: (v: string) => void;
  onNext: () => void;
}) {
  return (
    <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
      <Text style={s.eyebrow}>STEP 2 OF 3</Text>
      <Text style={s.h1}>Your daily rhythm.</Text>
      <Text style={s.sub}>When should I check in with you? You can change these anytime.</Text>

      <View style={s.rhythmCard}>
        <View>
          <Text style={s.rhythmTitle}>☀️ Morning brief</Text>
          <Text style={s.rhythmSub}>Forward-looking</Text>
        </View>
        <Text style={s.rhythmTime}>{p.morning}</Text>
      </View>
      <View style={s.rhythmCard}>
        <View>
          <Text style={s.rhythmTitle}>🌙 Evening brief</Text>
          <Text style={s.rhythmSub}>Wrap + tomorrow prep</Text>
        </View>
        <Text style={s.rhythmTime}>{p.evening}</Text>
      </View>

      <Text style={[s.formHint, { marginTop: 10 }]}>Tap a row in Settings to adjust later.</Text>

      <TouchableOpacity style={s.primaryCta} onPress={p.onNext} activeOpacity={0.85}>
        <Text style={s.primaryCtaTxt}>Continue</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const PREF_CHIPS = [
  { key: 'school',    label: '🏃 School run' },
  { key: 'meals',     label: '🍽 Meal planning' },
  { key: 'shopping',  label: '🛒 Groceries' },
  { key: 'appts',     label: '🏥 Appointments' },
  { key: 'homework',  label: '📚 Homework' },
  { key: 'sport',     label: '⚽ Activities' },
  { key: 'birthdays', label: '🎂 Birthdays' },
];

function AdultPrefsStep({ inviter, onFinish }: { inviter: string; onFinish: () => void }) {
  const [picked, setPicked] = useState<Set<string>>(new Set());
  function toggle(k: string) {
    setPicked(prev => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k); else next.add(k);
      return next;
    });
  }
  return (
    <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
      <Text style={s.eyebrow}>STEP 3 OF 3 · OPTIONAL</Text>
      <Text style={s.h1}>What's on your plate?</Text>
      <Text style={s.sub}>Tap anything I should know. Skip if nothing fits.</Text>

      <View style={s.chipsWrap}>
        {PREF_CHIPS.map(c => {
          const on = picked.has(c.key);
          return (
            <TouchableOpacity
              key={c.key}
              onPress={() => toggle(c.key)}
              style={[s.prefChip, on && s.prefChipOn]}
              activeOpacity={0.8}
            >
              <Text style={[s.prefChipTxt, on && s.prefChipTxtOn]}>{c.label}{on ? ' ✓' : ''}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={s.tipBox}>
        <Text style={s.tipTxt}>💡 You don't need to set this up — {inviter} already has the family stuff dialled in. This just helps me prioritise <Text style={{ fontFamily: 'Poppins_700Bold' }}>your</Text> brief.</Text>
      </View>

      <TouchableOpacity style={s.primaryCta} onPress={onFinish} activeOpacity={0.85}>
        <Text style={s.primaryCtaTxt}>Finish</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// KID FLOW
// ═══════════════════════════════════════════════════════════════════════════
type KidStep = 'welcome' | 'identity' | 'capabilities';

const KID_AVATARS = [
  { emoji: '🦊', bg: '#FF7B6B' },
  { emoji: '🐳', bg: '#4D8BFF' },
  { emoji: '🦄', bg: '#A855F7' },
  { emoji: '🐢', bg: '#22C55E' },
  { emoji: '🦁', bg: '#F59E0B' },
  { emoji: '🐧', bg: '#14B8A6' },
  { emoji: '🦋', bg: '#EC4899' },
  { emoji: '🦉', bg: '#8B5CF6' },
];

function KidFlow({
  invite, onFinish,
}: {
  invite: Invite;
  onFinish: (extras: { avatar: string; pin: string }) => void;
}) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<KidStep>('welcome');
  const first = invite.name.split(/\s+/)[0];
  const inviter = invite.inviterName || 'A family member';
  const [avatarIdx, setAvatarIdx] = useState<number>(2); // unicorn default
  const [pin, setPin] = useState<string>('');

  function next() {
    if (step === 'welcome') setStep('identity');
    else if (step === 'identity') setStep('capabilities');
    else onFinish({ avatar: KID_AVATARS[avatarIdx].emoji, pin });
  }
  function back() {
    if (step === 'identity') setStep('welcome');
    else if (step === 'capabilities') setStep('identity');
  }

  return (
    <View style={[s.root, { paddingTop: insets.top + 4 }]}>
      <StatusBar style="dark"/>

      {step !== 'welcome' && (
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={back} activeOpacity={0.7}>
            <Text style={s.backBtnIcon}>←</Text>
          </TouchableOpacity>
          <Text style={s.pageLabel}>Setup</Text>
          <View style={{ width: 36 }}/>
        </View>
      )}

      {step === 'welcome' && <KidWelcome first={first} inviter={inviter} onNext={next}/>}
      {step === 'identity' && (
        <KidIdentityStep
          avatarIdx={avatarIdx} pin={pin}
          onPickAvatar={setAvatarIdx} onChangePin={setPin}
          onNext={next}
        />
      )}
      {step === 'capabilities' && <KidCapabilitiesStep onFinish={() => onFinish({ avatar: KID_AVATARS[avatarIdx].emoji, pin })}/>}
    </View>
  );
}

function KidWelcome({ first, inviter, onNext }: { first: string; inviter: string; onNext: () => void }) {
  return (
    <View style={s.welcomeFlex}>
      <View style={[s.orb, s.orbLavBig]} pointerEvents="none"/>
      <View style={[s.orb, s.orbVioletSmall]} pointerEvents="none"/>
      <View style={s.welcomeContent}>
        <Text style={[s.welcomeEyebrow, { color: LAV_DEEP }]}>YOUR SPACE</Text>
        <Text style={s.welcomeH1}>Hi {first}! ✨{'\n'}Welcome to your <Text style={{ color: VIOLET }}>hub</Text>.</Text>
        <Text style={s.welcomeSub}>{inviter} set this up for you. You've got jobs, rewards, games, Tutor, plus the whole family calendar.</Text>
      </View>
      <TouchableOpacity style={[s.welcomeCta, { backgroundColor: VIOLET }]} onPress={onNext} activeOpacity={0.85}>
        <Text style={s.welcomeCtaTxt}>Let's go</Text>
      </TouchableOpacity>
    </View>
  );
}

function KidIdentityStep(p: {
  avatarIdx: number; pin: string;
  onPickAvatar: (i: number) => void; onChangePin: (v: string) => void;
  onNext: () => void;
}) {
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={[s.eyebrow, { color: LAV_DEEP }]}>STEP 1 OF 2</Text>
        <Text style={s.h1}>Pick your look.</Text>
        <Text style={s.sub}>You can change this anytime.</Text>

        <View style={s.avatarGrid}>
          {KID_AVATARS.map((a, i) => {
            const on = p.avatarIdx === i;
            return (
              <TouchableOpacity
                key={i}
                onPress={() => p.onPickAvatar(i)}
                style={[s.avatarTile, { backgroundColor: a.bg }, on && s.avatarTileOn]}
                activeOpacity={0.8}
              >
                <Text style={s.avatarEmoji}>{a.emoji}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[s.formLabel, { marginTop: 28 }]}>4-digit PIN <Text style={{ color: INK4, fontFamily: 'Poppins_400Regular' }}>(so it's just yours)</Text></Text>
        <TextInput
          style={[s.formInput, { fontSize: 24, letterSpacing: 12, textAlign: 'center', paddingVertical: 16 }]}
          value={p.pin}
          onChangeText={(v) => p.onChangePin(v.replace(/[^0-9]/g, '').slice(0, 4))}
          keyboardType="number-pad"
          maxLength={4}
          secureTextEntry
          placeholder="• • • •"
          placeholderTextColor={INK4}
        />

        <TouchableOpacity
          style={[s.primaryCta, { backgroundColor: VIOLET }, p.pin.length < 4 && { opacity: 0.5 }]}
          onPress={p.onNext}
          activeOpacity={0.85}
          disabled={p.pin.length < 4}
        >
          <Text style={s.primaryCtaTxt}>Continue</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function KidCapabilitiesStep({ onFinish }: { onFinish: () => void }) {
  return (
    <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
      <Text style={[s.eyebrow, { color: LAV_DEEP }]}>STEP 2 OF 2</Text>
      <Text style={s.h1}>Here's what you've got.</Text>
      <Text style={s.sub}>A quick tour just for you.</Text>

      <View style={{ marginTop: 22, gap: 12 }}>
        <KidCapTile emoji="✅" title="Jobs & Rewards" sub="Tick off jobs, earn points, redeem rewards."/>
        <KidCapTile emoji="🎮" title="Games" sub="Daily Wordle, Maths Sprint, World Trivia."/>
        <KidCapTile emoji="📚" title="Tutor" sub="Stuck on homework? Ask me anything."/>
        <KidCapTile emoji="💬" title="Chat with me" sub="Anything on your mind — I'm here."/>
      </View>

      <TouchableOpacity style={[s.primaryCta, { backgroundColor: VIOLET }]} onPress={onFinish} activeOpacity={0.85}>
        <Text style={s.primaryCtaTxt}>Take me to my hub</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function KidCapTile({ emoji, title, sub }: { emoji: string; title: string; sub: string }) {
  return (
    <View style={s.kidCapTile}>
      <Text style={{ fontSize: 28 }}>{emoji}</Text>
      <View style={{ flex: 1 }}>
        <Text style={s.kidCapTitle}>{title}</Text>
        <Text style={s.kidCapSub}>{sub}</Text>
      </View>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  loadingTxt: { fontFamily: 'Poppins_500Medium', fontSize: 15, color: INK3 },

  // Invalid link
  invalidWrap: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: 32, gap: 6,
  },
  invalidEmoji: { fontSize: 56, marginBottom: 12 },
  invalidH1: {
    fontFamily: 'Poppins_700Bold', fontSize: 28, color: INK,
    textAlign: 'center', marginBottom: 8,
  },
  invalidSub: {
    fontFamily: 'Poppins_400Regular', fontSize: 16, color: INK3,
    lineHeight: 23, textAlign: 'center',
  },

  // Shared header
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

  // Welcome (orb splash)
  welcomeFlex: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: 30, overflow: 'hidden', position: 'relative',
  },
  orb: { position: 'absolute', borderRadius: 9999 },
  orbPeach: { width: 280, height: 280, top: -80, right: -80, backgroundColor: PEACH, opacity: 0.42 },
  orbMint:  { width: 240, height: 240, bottom: -60, left: -70, backgroundColor: '#B8EDD0', opacity: 0.50 },
  orbLav:   { width: 180, height: 180, top: 120, left: -50, backgroundColor: LAV, opacity: 0.55 },
  orbSky:   { width: 160, height: 160, bottom: 140, right: -40, backgroundColor: SKY, opacity: 0.42 },
  orbLavBig:    { width: 320, height: 320, top: -80, right: -90, backgroundColor: LAV, opacity: 0.55 },
  orbVioletSmall: { width: 220, height: 220, bottom: -40, left: -50, backgroundColor: VIOLET, opacity: 0.20 },

  welcomeContent: { alignItems: 'flex-start', gap: 14, alignSelf: 'stretch', zIndex: 1 },
  welcomeEyebrow: {
    fontFamily: 'Poppins_700Bold', fontSize: 12,
    letterSpacing: 0.8, textTransform: 'uppercase',
    color: MINT_DEEP,
  },
  welcomeH1: {
    fontFamily: 'Poppins_700Bold', fontSize: 36, color: INK,
    lineHeight: 42, letterSpacing: -0.6,
  },
  welcomeSub: {
    fontFamily: 'Poppins_400Regular', fontSize: 16, color: INK2,
    lineHeight: 24, marginTop: 4,
  },
  welcomeCta: {
    backgroundColor: INK, paddingVertical: 16, borderRadius: 32,
    alignItems: 'center', alignSelf: 'stretch',
    marginTop: 30, zIndex: 1,
  },
  welcomeCtaTxt: { fontFamily: 'Poppins_700Bold', fontSize: 16, color: '#fff' },

  // Body
  body: { padding: 22, paddingBottom: 50 },
  eyebrow: {
    fontFamily: 'Poppins_700Bold', fontSize: 12, color: MINT_DEEP,
    letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8,
  },
  h1: {
    fontFamily: 'Poppins_700Bold', fontSize: 28, color: INK,
    lineHeight: 34, letterSpacing: -0.4,
  },
  sub: {
    fontFamily: 'Poppins_400Regular', fontSize: 15, color: INK3,
    lineHeight: 22, marginTop: 8,
  },

  // Form
  formLabel: {
    fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: INK2,
    marginBottom: 6,
  },
  formInput: {
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: LINE,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14,
    fontFamily: 'Poppins_400Regular', fontSize: 16, color: INK,
  },
  formHint: {
    fontFamily: 'Poppins_400Regular', fontSize: 12, color: INK4,
    marginTop: 6,
  },

  // Rhythm
  rhythmCard: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: LINE,
    borderRadius: 14, padding: 16, marginBottom: 10,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 16,
  },
  rhythmTitle: { fontFamily: 'Poppins_700Bold', fontSize: 15, color: INK },
  rhythmSub: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: INK3, marginTop: 2 },
  rhythmTime: { fontFamily: 'Poppins_700Bold', fontSize: 17, color: INK2 },

  // Pref chips
  chipsWrap: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
    marginTop: 22,
  },
  prefChip: {
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: LINE,
    borderRadius: 22, paddingHorizontal: 14, paddingVertical: 10,
  },
  prefChipOn: { backgroundColor: MINT_TINT, borderColor: MINT_DEEP },
  prefChipTxt: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: INK2 },
  prefChipTxtOn: { color: MINT_DEEP },
  tipBox: {
    backgroundColor: SOFT, borderRadius: 12,
    padding: 14, marginTop: 22,
  },
  tipTxt: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: INK2, lineHeight: 19 },

  // Kid avatar grid
  avatarGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 12,
    justifyContent: 'center', marginTop: 22,
  },
  avatarTile: {
    width: 68, height: 68, borderRadius: 34,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarTileOn: {
    borderWidth: 3, borderColor: VIOLET,
  },
  avatarEmoji: { fontSize: 32 },

  // Kid capability tiles
  kidCapTile: {
    backgroundColor: '#F4ECFF', borderWidth: 1.5, borderColor: LAV,
    borderRadius: 14, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  kidCapTitle: { fontFamily: 'Poppins_700Bold', fontSize: 15, color: INK },
  kidCapSub: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: INK3, marginTop: 2 },

  // Primary CTA
  primaryCta: {
    backgroundColor: INK, paddingVertical: 16, borderRadius: 14,
    alignItems: 'center', marginTop: 22,
  },
  primaryCtaTxt: { fontFamily: 'Poppins_700Bold', fontSize: 16, color: '#fff' },
});
