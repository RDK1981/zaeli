/**
 * app/(auth)/sign-in.tsx — Sign-in / sign-up screen.
 *
 * Phase 1 of backend pass. Three states:
 *   - Sign in (existing user)
 *   - Sign up (new family — DB trigger handle_new_user creates families + profile)
 *   - Check email (post-signup state when email confirmation is required)
 *
 * Phase 2 will add an invite-token sign-up flow at /invite/[token] that
 * branches into here with role + family_id pre-set via auth metadata.
 *
 * Design: matches the splash + onboarding aesthetic (warm BG, palette orbs,
 * sky a+i wordmark, coral accent). Lives at /(auth)/sign-in.
 */

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, Platform, KeyboardAvoidingView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { signInWithPassword, signUpOwner, loadProfile, getProfile, getSession } from '../../lib/auth';

const BG = '#FAF8F5';
const INK = '#0A0A0A';
const INK2 = 'rgba(10,10,10,0.72)';
const INK3 = 'rgba(10,10,10,0.55)';
const INK4 = 'rgba(10,10,10,0.42)';
const LINE = 'rgba(10,10,10,0.08)';
const CORAL = '#FF4545';
const SKY = '#A8D8F0';
const PEACH = '#FAC8A8';
const MINT = '#B8EDD0';
const LAV = '#D8CCFF';
const MINT_DEEP = '#2D7A52';

type Mode = 'sign-in' | 'sign-up' | 'check-email';

export default function SignInScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('sign-in');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');

  async function onSubmit() {
    if (!email.trim() || !password) {
      Alert.alert('Hold on', 'Pop in your email and password.');
      return;
    }
    if (mode === 'sign-up' && !name.trim()) {
      Alert.alert('Need your name', 'What should I call you?');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'sign-in') {
        await signInWithPassword({ email, password });
        await loadProfile();
        if (!getProfile()) {
          throw new Error('Signed in but profile not found. Try again or contact support.');
        }
        router.replace('/(tabs)/swipe-world' as any);
      } else {
        await signUpOwner({ email, password, name });
        // If email confirmation is enabled in Supabase, no session is created
        // until the user clicks the email link. Detect that and show the
        // "check your email" state instead of silently bouncing.
        const session = await getSession();
        if (!session) {
          setPendingEmail(email.trim());
          setMode('check-email');
          return;
        }
        await loadProfile();
        router.replace('/(tabs)/swipe-world' as any);
      }
    } catch (e: any) {
      const msg = e?.message ?? 'Something went wrong.';
      Alert.alert(mode === 'sign-in' ? 'Sign-in failed' : 'Sign-up failed', msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[s.root, { paddingTop: insets.top + 4 }]}>
        <StatusBar style="dark"/>

        {/* Palette orbs — repositioned so they DON'T overlap the form area */}
        <View style={[s.orb, s.orbPeach]} pointerEvents="none"/>
        <View style={[s.orb, s.orbMint]} pointerEvents="none"/>
        <View style={[s.orb, s.orbLav]} pointerEvents="none"/>

        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 28 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          style={{ zIndex: 1 }}
        >
          {/* Wordmark */}
          <Text style={s.wordmark}>
            z<Text style={{ color: SKY }}>a</Text>el<Text style={{ color: SKY }}>i</Text>
          </Text>

          {mode === 'check-email' ? (
            <CheckEmailView email={pendingEmail} onBackToSignIn={() => { setMode('sign-in'); setPassword(''); }}/>
          ) : (
            <>
              <Text style={s.title}>
                {mode === 'sign-in' ? (
                  <>Welcome <Text style={{ color: CORAL }}>back</Text>.</>
                ) : (
                  <>Let's get <Text style={{ color: CORAL }}>started</Text>.</>
                )}
              </Text>
              <Text style={s.sub}>
                {mode === 'sign-in'
                  ? "Sign in to your family."
                  : "Set up a brand new family. Anna and the kids can join via invite once you're in."}
              </Text>

              {/* Form */}
              <View style={{ marginTop: 26, gap: 14 }}>
                {mode === 'sign-up' && (
                  <View>
                    <Text style={s.label}>Your name</Text>
                    <TextInput
                      style={s.input}
                      value={name}
                      onChangeText={setName}
                      placeholder="e.g. Rich"
                      placeholderTextColor={INK4}
                      autoCapitalize="words"
                      returnKeyType="next"
                    />
                  </View>
                )}
                <View>
                  <Text style={s.label}>Email</Text>
                  <TextInput
                    style={s.input}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="you@example.com"
                    placeholderTextColor={INK4}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="next"
                  />
                </View>
                <View>
                  <Text style={s.label}>Password</Text>
                  <TextInput
                    style={s.input}
                    value={password}
                    onChangeText={setPassword}
                    placeholder={mode === 'sign-up' ? 'At least 6 characters' : '••••••••'}
                    placeholderTextColor={INK4}
                    secureTextEntry
                    returnKeyType="done"
                    onSubmitEditing={onSubmit}
                  />
                </View>
              </View>

              {/* Primary CTA */}
              <TouchableOpacity
                style={[s.cta, busy && { opacity: 0.5 }]}
                onPress={onSubmit}
                activeOpacity={0.85}
                disabled={busy}
              >
                <Text style={s.ctaTxt}>
                  {busy ? (mode === 'sign-in' ? 'Signing you in…' : 'Setting things up…') : (mode === 'sign-in' ? 'Sign in' : 'Create my family')}
                </Text>
              </TouchableOpacity>

              {/* Mode toggle */}
              <TouchableOpacity
                onPress={() => setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')}
                style={{ marginTop: 24, alignSelf: 'center' }}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={s.toggleTxt}>
                  {mode === 'sign-in'
                    ? <>New here? <Text style={{ color: MINT_DEEP, fontFamily: 'Poppins_700Bold' }}>Create a family →</Text></>
                    : <>Already set up? <Text style={{ color: MINT_DEEP, fontFamily: 'Poppins_700Bold' }}>Sign in →</Text></>}
                </Text>
              </TouchableOpacity>

              {mode === 'sign-up' && (
                <Text style={s.fineprint}>
                  Free for 14 days · A$14.99/month after
                </Text>
              )}
            </>
          )}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

// ── "Check your email" state ────────────────────────────────────────────
function CheckEmailView({ email, onBackToSignIn }: { email: string; onBackToSignIn: () => void }) {
  return (
    <View style={{ alignItems: 'center', gap: 16, paddingTop: 12 }}>
      <Text style={{ fontSize: 56 }}>📨</Text>
      <Text style={s.title}>Check your <Text style={{ color: CORAL }}>email</Text>.</Text>
      <Text style={s.sub}>
        Sent a confirmation link to <Text style={{ fontFamily: 'Poppins_700Bold', color: INK }}>{email}</Text>. Tap it to finish setting up your account, then come back here and sign in.
      </Text>
      <Text style={[s.fineprint, { marginTop: 18, marginBottom: 0 }]}>
        Can't find it? Check spam, or wait a minute and try again.
      </Text>
      <TouchableOpacity
        style={[s.cta, { marginTop: 22, alignSelf: 'stretch' }]}
        activeOpacity={0.85}
        onPress={onBackToSignIn}
      >
        <Text style={s.ctaTxt}>Got it — back to sign in</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG, overflow: 'hidden' },

  orb: { position: 'absolute', borderRadius: 9999, zIndex: 0 },
  // Repositioned: corners only, smaller, kept clear of the central form column
  orbPeach: { width: 280, height: 280, top: -90, right: -100, backgroundColor: PEACH, opacity: 0.36 },
  orbMint:  { width: 240, height: 240, bottom: -80, left: -90, backgroundColor: MINT, opacity: 0.42 },
  orbLav:   { width: 160, height: 160, top: 220, left: -70, backgroundColor: LAV, opacity: 0.45 },

  wordmark: {
    fontFamily: 'Poppins_800ExtraBold', fontSize: 64,
    letterSpacing: -2.5, lineHeight: 84, paddingTop: 8,
    color: INK, textAlign: 'center', marginBottom: 12,
  },
  title: {
    // bumped lineHeight for descender clearance on 'g' / 'y' characters
    fontFamily: 'Poppins_700Bold', fontSize: 30, color: INK,
    lineHeight: 42, letterSpacing: -0.5, textAlign: 'center',
  },
  sub: {
    // bumped lineHeight 22 → 26 so 'y' descender in "family" doesn't clip
    fontFamily: 'Poppins_400Regular', fontSize: 15, color: INK3,
    lineHeight: 26, marginTop: 10, textAlign: 'center',
    paddingHorizontal: 8,
  },

  label: {
    fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: INK2,
    lineHeight: 18, marginBottom: 6,
  },
  input: {
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: LINE,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14,
    fontFamily: 'Poppins_400Regular', fontSize: 16, color: INK,
  },

  cta: {
    backgroundColor: INK, paddingVertical: 16, paddingHorizontal: 18,
    borderRadius: 14, alignItems: 'center', marginTop: 22,
  },
  ctaTxt: {
    // explicit lineHeight stops 'g' descender clipping in "Sign in" / "Signing"
    fontFamily: 'Poppins_700Bold', fontSize: 16, lineHeight: 22, color: '#fff',
  },

  toggleTxt: {
    fontFamily: 'Poppins_400Regular', fontSize: 14, lineHeight: 20, color: INK3,
  },

  fineprint: {
    fontFamily: 'Poppins_500Medium', fontSize: 12, lineHeight: 18, color: INK4,
    textAlign: 'center', marginTop: 14,
  },
});
