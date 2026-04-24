/**
 * onboarding/index.tsx — Zaeli first-run flow
 *
 * 13 screens, 4 acts. Chat-first — every step rendered inside the chat UI.
 * Act I — Meeting Zaeli · Act II — Getting to know you · Act III — Show don't tell · Act IV — Magic moment
 *
 * State: local to this file (name, email, family, rhythm, prefs). On
 * completion: writes `onboarding_complete` to AsyncStorage + `onboarding_data`
 * for backend pass to pick up later. Navigates to /(tabs)/swipe-world.
 *
 * Voice pill (Step 2): ElevenLabs call + expo-av playback. Falls back
 * gracefully if EXPO_PUBLIC_ELEVENLABS_API_KEY is missing.
 */

import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, Platform, Animated, Switch, Image,
  KeyboardAvoidingView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import DateTimePicker from '@react-native-community/datetimepicker';
import Svg, { Path } from 'react-native-svg';

// ── Colour tokens ──────────────────────────────────────────────────────────
const BG        = '#FAF8F5';
const CARD      = '#FFFFFF';
const INK       = '#0A0A0A';
const INK2      = 'rgba(10,10,10,0.72)';
const INK3      = 'rgba(10,10,10,0.55)';
const INK4      = 'rgba(10,10,10,0.42)';
const INK5      = 'rgba(10,10,10,0.30)';
const BORDER    = 'rgba(10,10,10,0.06)';
const CORAL       = '#FF4545';
const CORAL_SOFT  = '#FFE4E0';
const CORAL_DEEP  = '#B83333';
const SKY         = '#A8D8F0';
const SKY_BG      = '#E8F4FD';
const SKY_DEEP    = '#0A4A6A';
const MINT        = '#B8EDD0';
const MINT_DARK   = '#2D7A52';
const MINT_BG     = '#E6F7EF';
const PEACH       = '#FAC8A8';
const PEACH_BG    = '#F5EDE3';
const PEACH_DEEP  = '#8A3A00';
const LAV         = '#D8CCFF';
const GOLD        = '#F0DC80';
const SLATE       = '#2D3748';
const DANGER      = '#C53030';

// Family colours — locked across the app
const FAMILY_COLOURS = {
  rich:  '#4D8BFF',
  anna:  '#FF7B6B',
  poppy: '#A855F7',
  gab:   '#22C55E',
  duke:  '#F59E0B',
};

// ── Types ──────────────────────────────────────────────────────────────────
interface Member {
  id: string;
  name: string;
  role: 'parent' | 'child';
  age?: number;
  yearLevel?: string;
  colour: string;
  initial: string;
}

interface Rhythm {
  schoolRun: string;  // 'HH:MM' 24h
  dinner: string;
  kidsInBed: string;
}

interface Prefs {
  chips: string[];
  holiday: boolean;
  sharedShopping: boolean;
  budget: boolean;
}

// Family starts empty — user adds members on Step 4. (Removed seed Session 19.)

const STRESS_CHIPS = [
  'Meal planning', 'The mental load', 'After-school chaos', 'Forgetting things',
  'Weekends feel rushed', 'Homework battles', 'Shopping admin', 'Solo-parent days',
];

// ── Helpers ────────────────────────────────────────────────────────────────
function fmtTime12(hm: string): string {
  const [h, m] = hm.split(':').map(Number);
  const period = h >= 12 ? 'pm' : 'am';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return m === 0 ? `${h12} ${period}` : `${h12}:${String(m).padStart(2,'0')} ${period}`;
}
function hmToDate(hm: string): Date {
  const [h, m] = hm.split(':').map(Number);
  const d = new Date(); d.setHours(h, m, 0, 0);
  return d;
}
function dateToHm(d: Date): string {
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

// ── SVG atoms ──────────────────────────────────────────────────────────────
function BackArrow() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M15 18l-6-6 6-6" stroke={INK2} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"/>
    </Svg>
  );
}
function IcoStar({ color = INK }: { color?: string }) {
  return (
    <Svg width={9} height={9} viewBox="0 0 24 24" fill={color}>
      <Path d="M12 2L14.09 8.26L20 10L14.09 11.74L12 18L9.91 11.74L4 10L9.91 8.26L12 2Z"/>
    </Svg>
  );
}
function IcoMic() {
  return (
    <Svg width={19} height={19} viewBox="0 0 24 24" fill="none">
      <Path d="M12 2a3 3 0 00-3 3v6a3 3 0 006 0V5a3 3 0 00-3-3z" stroke={INK3} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/>
      <Path d="M19 10v2a7 7 0 01-14 0v-2M12 19v3" stroke={INK3} strokeWidth={2} strokeLinecap="round"/>
    </Svg>
  );
}
function IcoCamera() {
  return (
    <Svg width={19} height={19} viewBox="0 0 24 24" fill="none">
      <Path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" stroke={CORAL} strokeWidth={2} strokeLinejoin="round"/>
      <Path d="M12 17a4 4 0 100-8 4 4 0 000 8z" stroke={CORAL} strokeWidth={2}/>
    </Svg>
  );
}
function IcoSendUp() {
  return (
    <Svg width={19} height={19} viewBox="0 0 24 24" fill="none">
      <Path d="M12 19V5M5 12l7-7 7 7" stroke={CORAL} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"/>
    </Svg>
  );
}
function IcoPlay() {
  return (
    <Svg width={11} height={11} viewBox="0 0 24 24" fill="#FFFFFF">
      <Path d="M8 5v14l11-7z"/>
    </Svg>
  );
}
function IcoCheck({ color = '#fff' }: { color?: string }) {
  return (
    <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
      <Path d="M5 12l5 5 9-11" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"/>
    </Svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SHARED UI
// ═══════════════════════════════════════════════════════════════════════════
function ChatHeader(p: { onBack?: () => void }) {
  return (
    <View style={s.chatHeader}>
      {p.onBack ? (
        <TouchableOpacity onPress={p.onBack} style={s.back} activeOpacity={0.7}>
          <BackArrow/>
        </TouchableOpacity>
      ) : (
        <View style={{ width: 32 }}/>
      )}
      <Text style={s.wordmark}>
        z<Text style={{ color: SKY }}>a</Text>el<Text style={{ color: SKY }}>i</Text>
      </Text>
      <View style={{ width: 32 }}/>
    </View>
  );
}

function ZaeliEyebrow({ label }: { label: string }) {
  return (
    <View style={s.zEyebrow}>
      <View style={s.zStar}><IcoStar/></View>
      <Text style={s.zLabel}>{label}</Text>
    </View>
  );
}

function ZaeliMsg({ children }: { children: React.ReactNode }) {
  return (
    <View style={s.zMsgRow}>
      <View style={s.zBubble}>
        <Text style={s.zText}>{children}</Text>
      </View>
    </View>
  );
}

function UserMsg({ children }: { children: React.ReactNode }) {
  return (
    <View style={s.uMsgRow}>
      <View style={s.uBubble}>
        <Text style={s.uText}>{children}</Text>
      </View>
    </View>
  );
}

// ── Live typing reveal ─────────────────────────────────────────────────────
// TypedConversation plays an array of items out one at a time. Zaeli items
// get a typing-dots indicator before they appear; user/card items appear
// instantly with a small breathing pause. Calls onComplete when all items
// have rendered (so parent can reveal the CTA).

type ConvoItem =
  | { kind: 'eyebrow'; label: string }
  | { kind: 'zaeli'; node: React.ReactNode }
  | { kind: 'user'; node: React.ReactNode }
  | { kind: 'card'; node: React.ReactNode };

function TypedConversation(p: { items: ConvoItem[]; onComplete?: () => void }) {
  const [revealed, setRevealed] = useState(0);
  const [typing, setTyping]     = useState(false);
  const completedRef = useRef(false);

  React.useEffect(() => {
    if (revealed >= p.items.length) {
      if (!completedRef.current) {
        completedRef.current = true;
        p.onComplete?.();
      }
      return;
    }
    const next = p.items[revealed];
    let typingTimer: any, revealTimer: any;
    if (next.kind === 'zaeli') {
      typingTimer = setTimeout(() => setTyping(true), 200);
      revealTimer = setTimeout(() => {
        setTyping(false);
        setRevealed(r => r + 1);
      }, 200 + 900);
    } else {
      revealTimer = setTimeout(() => setRevealed(r => r + 1), 350);
    }
    return () => { clearTimeout(typingTimer); clearTimeout(revealTimer); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealed]);

  return (
    <View style={{ gap: 8 }}>
      {p.items.slice(0, revealed).map((item, i) => {
        if (item.kind === 'eyebrow') return <ZaeliEyebrow key={i} label={item.label}/>;
        if (item.kind === 'zaeli')   return <View key={i}><ZaeliMsg>{item.node}</ZaeliMsg></View>;
        if (item.kind === 'user')    return <UserMsg key={i}>{item.node}</UserMsg>;
        return <View key={i}>{item.node}</View>;
      })}
      {typing && <TypingBubble/>}
    </View>
  );
}

function TypingBubble() {
  const dots = useRef([
    new Animated.Value(0.3),
    new Animated.Value(0.3),
    new Animated.Value(0.3),
  ]).current;
  React.useEffect(() => {
    const anims = dots.map((v, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 180),
          Animated.timing(v, { toValue: 1, duration: 420, useNativeDriver: true }),
          Animated.timing(v, { toValue: 0.3, duration: 420, useNativeDriver: true }),
        ])
      )
    );
    anims.forEach(a => a.start());
    return () => anims.forEach(a => a.stop());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <View style={s.typingRow}>
      <View style={s.typingBubble}>
        {dots.map((v, i) => (
          <Animated.View key={i} style={[s.typingDot, { opacity: v, transform: [{ scale: v }] }]}/>
        ))}
      </View>
    </View>
  );
}

// (ChatBar removed — onboarding has no fake chat bar; CTAs land in-flow.)

// ═══════════════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ═══════════════════════════════════════════════════════════════════════════
export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // Step state
  const [step, setStep] = useState<number>(1);

  // Collected data — all blank, user fills in across the flow
  const [name, setName]       = useState('');
  const [email, setEmail]     = useState('');
  const [family, setFamily]   = useState<Member[]>([]);
  // Rhythm keeps sensible default times so the picker has something to start
  // from; user adjusts on Step 5.
  const [rhythm, setRhythm]   = useState<Rhythm>({ schoolRun: '08:15', dinner: '18:00', kidsInBed: '20:30' });
  const [prefs, setPrefs]     = useState<Prefs>({
    chips: [],
    holiday: false,
    sharedShopping: false,
    budget: false,
  });
  const [locationOK, setLocationOK] = useState<boolean | null>(null);
  const [notifOK, setNotifOK]       = useState<boolean | null>(null);

  // Voice playback
  const [voicePlaying, setVoicePlaying] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);

  function goNext() { setStep(s => s + 1); }
  function goBack() { setStep(s => Math.max(1, s - 1)); }

  async function handlePlayVoice() {
    // Tap-to-hear Zaeli welcome clip via ElevenLabs. Cache once.
    const key = process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY;
    if (!key) {
      Alert.alert(
        'Voice needs setup',
        'Add EXPO_PUBLIC_ELEVENLABS_API_KEY and an EXPO_PUBLIC_ELEVENLABS_VOICE_ID to your env, then rebuild. For now you can continue — voice will work once the keys are in.',
      );
      return;
    }
    const voiceId = process.env.EXPO_PUBLIC_ELEVENLABS_VOICE_ID ?? 'EXAVITQu4vr4xnSDxMaL'; // Bella default
    const cachePath = (FileSystem.cacheDirectory ?? '') + 'zaeli_welcome.mp3';

    try {
      setVoicePlaying(true);
      let exists = false;
      try { const info = await FileSystem.getInfoAsync(cachePath); exists = info.exists; } catch {}
      if (!exists) {
        const text = "Hello, I'm Zaeli. Think of me as your family's sharpest friend — the one who remembers what time pickup is and what's still in the freezer.";
        const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
          method: 'POST',
          headers: {
            'xi-api-key': key,
            'Content-Type': 'application/json',
            'accept': 'audio/mpeg',
          },
          body: JSON.stringify({
            text,
            model_id: 'eleven_turbo_v2_5',
            voice_settings: { stability: 0.5, similarity_boost: 0.75 },
          }),
        });
        if (!res.ok) throw new Error('ElevenLabs ' + res.status);
        const arrayBuf = await res.arrayBuffer();
        // Convert ArrayBuffer → base64 → write file
        const b64 = bufToB64(arrayBuf);
        await FileSystem.writeAsStringAsync(cachePath, b64, { encoding: 'base64' as any });
      }
      if (soundRef.current) { try { await soundRef.current.unloadAsync(); } catch {} }
      const { sound } = await Audio.Sound.createAsync({ uri: cachePath }, { shouldPlay: true });
      soundRef.current = sound;
      sound.setOnPlaybackStatusUpdate((status: any) => {
        if (status?.didJustFinish) { setVoicePlaying(false); sound.unloadAsync(); }
      });
    } catch (e) {
      console.error('[voice]', e);
      setVoicePlaying(false);
      Alert.alert('Voice playback failed', 'Check the ElevenLabs key and try again.');
    }
  }

  async function requestLocation() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationOK(status === 'granted');
    } catch { setLocationOK(false); }
  }
  async function requestNotif() {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      setNotifOK(status === 'granted');
    } catch { setNotifOK(false); }
  }

  async function finishOnboarding() {
    try {
      await AsyncStorage.setItem('onboarding_complete', 'true');
      await AsyncStorage.setItem('onboarding_just_completed', 'true');
      await AsyncStorage.setItem('onboarding_data', JSON.stringify({
        completedAt: new Date().toISOString(),
        name, email, family, rhythm, prefs, locationOK, notifOK,
      }));
    } catch {}
    router.replace('/(tabs)/swipe-world' as any);
  }

  // ── Render step ─────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: BG, paddingTop: insets.top }}>
      <StatusBar style="dark"/>

      {step === 1 && <WelcomeStep onNext={goNext}/>}
      {step === 2 && (
        <OpenerStep onNext={goNext} onBack={goBack}
          voicePlaying={voicePlaying} onPlayVoice={handlePlayVoice}/>
      )}
      {step === 3 && (
        <NameEmailStep
          name={name} setName={setName}
          email={email} setEmail={setEmail}
          onNext={goNext} onBack={goBack}
        />
      )}
      {step === 4 && (
        <FamilyStep
          family={family} setFamily={setFamily}
          userName={name}
          onNext={goNext} onBack={goBack}
        />
      )}
      {step === 5 && (
        <RhythmStep
          rhythm={rhythm} setRhythm={setRhythm}
          family={family}
          onNext={goNext} onBack={goBack}
        />
      )}
      {step === 6 && (
        <PreferencesStep
          prefs={prefs} setPrefs={setPrefs}
          onNext={goNext} onBack={goBack}
        />
      )}
      {step === 7 && (
        <PermissionsStep
          locationOK={locationOK} notifOK={notifOK}
          onRequestLocation={requestLocation} onRequestNotif={requestNotif}
          onNext={goNext} onBack={goBack}
        />
      )}
      {step === 8 && <PantryDemoStep onNext={goNext} onBack={goBack}/>}
      {step === 9 && <HomeworkDemoStep family={family} onNext={goNext} onBack={goBack}/>}
      {step === 10 && <LifeDemoStep family={family} onNext={goNext} onBack={goBack}/>}
      {step === 11 && (
        <BriefPreviewStep
          name={name} family={family} rhythm={rhythm}
          onNext={goNext} onBack={goBack}
        />
      )}
      {step === 12 && (
        <DashboardRevealStep
          prefs={prefs} onNext={goNext} onBack={goBack}
        />
      )}
      {step === 13 && (
        <ReadyStep name={name} rhythm={rhythm} onFinish={finishOnboarding}/>
      )}
    </View>
  );
}

// ── Helper: ArrayBuffer → base64 (avoids Buffer dep) ──────────────────────
function bufToB64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null as any, bytes.subarray(i, i + chunk) as any);
  }
  // btoa is available on RN via polyfill; fall back if missing
  if (typeof (globalThis as any).btoa === 'function') return (globalThis as any).btoa(binary);
  // Manual base64 (rare path)
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let b64 = '';
  for (let i = 0; i < binary.length; i += 3) {
    const c1 = binary.charCodeAt(i), c2 = binary.charCodeAt(i+1), c3 = binary.charCodeAt(i+2);
    const e1 = c1 >> 2;
    const e2 = ((c1 & 3) << 4) | (c2 >> 4);
    const e3 = isNaN(c2) ? 64 : ((c2 & 15) << 2) | (c3 >> 6);
    const e4 = isNaN(c3) ? 64 : c3 & 63;
    b64 += chars[e1] + chars[e2] + (e3 === 64 ? '=' : chars[e3]) + (e4 === 64 ? '=' : chars[e4]);
  }
  return b64;
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 1 — WELCOME
// ═══════════════════════════════════════════════════════════════════════════
function WelcomeStep(p: { onNext: () => void }) {
  return (
    <View style={s.welcomeFlex}>
      <View style={[s.splashOrb, s.splashOrbPeach]} pointerEvents="none"/>
      <View style={[s.splashOrb, s.splashOrbMint]} pointerEvents="none"/>
      <View style={[s.splashOrb, s.splashOrbLav]} pointerEvents="none"/>
      <View style={[s.splashOrb, s.splashOrbSky]} pointerEvents="none"/>
      <Text style={s.wmHuge}>z<Text style={{ color: SKY }}>a</Text>el<Text style={{ color: SKY }}>i</Text></Text>
      <Text style={s.welcomeTagline}>Less <Text style={[s.bold, { color: CORAL }]}>chaos</Text>.{'\n'}More family.</Text>
      <Text style={s.welcomeSub}>Your family's sharpest teammate — the one who always knows what's for dinner and when pickup is.</Text>
      <TouchableOpacity style={s.welcomeCta} onPress={p.onNext} activeOpacity={0.85}>
        <Text style={s.welcomeCtaTxt}>Let's meet</Text>
      </TouchableOpacity>
      <Text style={s.welcomeFine}>Already have an account? Sign in</Text>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 2 — OPENER (voice pill)
// ═══════════════════════════════════════════════════════════════════════════
function OpenerStep(p: { onNext: () => void; onBack: () => void; voicePlaying: boolean; onPlayVoice: () => void }) {
  const [done, setDone] = useState(false);
  const voicePill = (
    <TouchableOpacity style={s.voicePill} onPress={p.onPlayVoice} activeOpacity={0.85}>
      <View style={s.voicePillDot}>{p.voicePlaying ? <Text style={s.voicePillPlaying}>●</Text> : <IcoPlay/>}</View>
      <Text style={s.voicePillTxt}>{p.voicePlaying ? 'Playing…' : 'Tap to hear me · 0:08'}</Text>
    </TouchableOpacity>
  );
  return (
    <View style={{ flex: 1 }}>
      <ChatHeader onBack={p.onBack}/>
      <ScrollView contentContainerStyle={s.chatBody} showsVerticalScrollIndicator={false}>
        <TypedConversation
          items={[
            { kind: 'eyebrow', label: 'Zaeli · just now' },
            { kind: 'zaeli', node: <>Hey 👋 I'm <Text style={s.b}>Zaeli</Text>.</> },
            { kind: 'card', node: voicePill },
            { kind: 'zaeli', node: <>Think of me as your family's sharpest friend — the one who remembers what time pickup is, what's still in the freezer, and when the car rego is due.</> },
            { kind: 'zaeli', node: <>Once we're set up, you'll be able to <Text style={s.b}>message me</Text>, <Text style={s.b}>tap the mic</Text>, or <Text style={s.b}>show me a photo</Text> of just about anything 📸 — permission slips, a confusing recipe, even <Text style={s.italic}>"what's this homework asking?"</Text> 📚. For now, just tap through with me. The fun starts in three minutes ⏱️</> },
            { kind: 'zaeli', node: <>Couple of quick questions and we're off. Ready?</> },
          ]}
          onComplete={() => setDone(true)}
        />
        {done && (
          <TouchableOpacity style={s.primaryCta} onPress={p.onNext} activeOpacity={0.85}>
            <Text style={s.primaryCtaTxt}>Let's go</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 3 — NAME + EMAIL
// ═══════════════════════════════════════════════════════════════════════════
function NameEmailStep(p: {
  name: string; setName: (n: string) => void;
  email: string; setEmail: (e: string) => void;
  onNext: () => void; onBack: () => void;
}) {
  function submit() {
    if (!p.name.trim()) { Alert.alert('Your name?', 'Tell Zaeli what to call you.'); return; }
    if (!p.email.trim() || !p.email.includes('@')) { Alert.alert('Email', 'Just so I can reach you with your morning brief.'); return; }
    p.onNext();
  }
  const card = (
    <View style={s.inlineCard}>
      <Text style={s.cardLbl}>Let's get you set up</Text>
      <TextInput
        style={s.cardField}
        value={p.name} onChangeText={p.setName}
        placeholder="Your name" placeholderTextColor={INK4}
        autoCapitalize="words"
      />
      <TextInput
        style={s.cardField}
        value={p.email} onChangeText={p.setEmail}
        placeholder="you@example.com" placeholderTextColor={INK4}
        autoCapitalize="none" keyboardType="email-address"
      />
      <TouchableOpacity style={s.cardCta} onPress={submit} activeOpacity={0.85}>
        <Text style={s.cardCtaTxt}>That's me</Text>
      </TouchableOpacity>
    </View>
  );
  return (
    <View style={{ flex: 1 }}>
      <ChatHeader onBack={p.onBack}/>
      <ScrollView contentContainerStyle={s.chatBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <TypedConversation
          items={[
            { kind: 'user', node: "Let's go." },
            { kind: 'zaeli', node: <>Wonderful. <Text style={s.b}>Who are you</Text>, and how do I email you? I promise I won't spam — I'll only use it for your morning brief if the app's closed.</> },
            { kind: 'card', node: card },
          ]}
        />
      </ScrollView>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 4 — FAMILY
// ═══════════════════════════════════════════════════════════════════════════
function FamilyStep(p: {
  family: Member[]; setFamily: (f: Member[]) => void;
  userName: string;
  onNext: () => void; onBack: () => void;
}) {
  const greetingName = p.userName.trim() || 'friend';
  // Auto-seed the user themselves as the first parent on first mount.
  // They came in with a name on Step 3 — they shouldn't have to add themselves.
  React.useEffect(() => {
    if (p.family.length === 0 && p.userName.trim()) {
      const me: Member = {
        id: 'me',
        name: p.userName.trim(),
        role: 'parent',
        colour: FAMILY_COLOURS.anna,
        initial: p.userName.trim()[0].toUpperCase(),
      };
      p.setFamily([me]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<'parent' | 'child'>('child');
  const [newAge, setNewAge]   = useState('');
  const [newYear, setNewYear] = useState('');

  const COLOURS = [FAMILY_COLOURS.poppy, FAMILY_COLOURS.gab, FAMILY_COLOURS.duke, '#E879F9', '#06B6D4', '#10B981'];
  function nextColour(): string {
    const used = new Set(p.family.map(m => m.colour));
    return COLOURS.find(c => !used.has(c)) ?? FAMILY_COLOURS.poppy;
  }

  function addMember() {
    if (!newName.trim()) { Alert.alert('Name?', 'Give this family member a name.'); return; }
    // Normalise year level — accept "1", "Year 1", "yr 1" all as "Year 1"
    let yl: string | undefined;
    if (newRole === 'child' && newYear.trim()) {
      const raw = newYear.trim();
      if (/^\d+$/.test(raw)) yl = `Year ${raw}`;
      else if (/^year\s*\d+$/i.test(raw)) yl = raw.replace(/^year\s*/i, 'Year ');
      else if (/^yr\s*\d+$/i.test(raw)) yl = raw.replace(/^yr\s*/i, 'Year ');
      else yl = raw;
    }
    const m: Member = {
      id: `m-${Date.now()}`,
      name: newName.trim(),
      role: newRole,
      age: newRole === 'child' ? (parseInt(newAge, 10) || undefined) : undefined,
      yearLevel: yl,
      colour: nextColour(),
      initial: newName.trim()[0].toUpperCase(),
    };
    p.setFamily([...p.family, m]);
    setNewName(''); setNewAge(''); setNewYear(''); setNewRole('child'); setAddOpen(false);
  }

  const card = (
    <View style={s.inlineCard}>
      <Text style={s.cardLbl}>Your household</Text>
      {p.family.map((m, i) => (
        <View key={m.id} style={[s.familyRow, i === p.family.length - 1 && !addOpen && { borderBottomWidth: 0 }]}>
          <View style={[s.memberDot, { backgroundColor: m.colour }]}>
            <Text style={s.memberInitial}>{m.initial}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.memberName}>{m.name}</Text>
            <Text style={s.memberRole}>{m.role === 'parent' ? 'Parent' : m.yearLevel ?? 'Child'}</Text>
          </View>
          {m.age != null && <View style={s.agePill}><Text style={s.agePillTxt}>{m.age}</Text></View>}
        </View>
      ))}

      {addOpen ? (
        <View style={s.addRow}>
          <TextInput style={s.smallField} value={newName} onChangeText={setNewName} placeholder="Name" placeholderTextColor={INK4}/>
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
            <TouchableOpacity style={[s.roleTog, newRole === 'parent' && s.roleTogOn]} onPress={() => setNewRole('parent')} activeOpacity={0.75}>
              <Text style={[s.roleTogTxt, newRole === 'parent' && s.roleTogTxtOn]}>Parent</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.roleTog, newRole === 'child' && s.roleTogOn]} onPress={() => setNewRole('child')} activeOpacity={0.75}>
              <Text style={[s.roleTogTxt, newRole === 'child' && s.roleTogTxtOn]}>Child</Text>
            </TouchableOpacity>
          </View>
          {newRole === 'child' && (
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <TextInput style={[s.smallField, { flex: 1 }]} value={newAge} onChangeText={setNewAge} placeholder="Age" keyboardType="number-pad" placeholderTextColor={INK4}/>
              <TextInput style={[s.smallField, { flex: 2 }]} value={newYear} onChangeText={setNewYear} placeholder="Year level (e.g. Year 3)" placeholderTextColor={INK4}/>
            </View>
          )}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
            <TouchableOpacity style={[s.ghostBtn, { flex: 1 }]} onPress={() => { setAddOpen(false); setNewName(''); setNewAge(''); setNewYear(''); }} activeOpacity={0.85}>
              <Text style={s.ghostBtnTxt}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.solidBtn, { flex: 1, backgroundColor: MINT_DARK }]} onPress={addMember} activeOpacity={0.85}>
              <Text style={s.solidBtnTxt}>Add</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity style={s.addMemberRow} onPress={() => setAddOpen(true)} activeOpacity={0.75}>
          <View style={s.plusSq}><Text style={s.plusSqTxt}>+</Text></View>
          <Text style={s.addMemberTxt}>Add another</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={[s.cardCta, { marginTop: 12 }]} onPress={p.onNext} activeOpacity={0.85}>
        <Text style={s.cardCtaTxt}>That's us</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <ChatHeader onBack={p.onBack}/>
      <ScrollView
        contentContainerStyle={s.chatBody}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <TypedConversation
          items={[
            { kind: 'zaeli', node: <>Lovely to meet you, <Text style={s.b}>{greetingName}</Text>. Now — <Text style={s.b}>who else is in your family?</Text> Add each one and I'll start remembering them.</> },
            { kind: 'card', node: card },
          ]}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function renderFamilyGreeting(family: Member[]): string {
  const kids = family.filter(m => m.role === 'child');
  if (kids.length === 0) return 'Got it. Just the two of you — I can work with that.';
  const names = kids.map(k => k.name);
  const list = names.length === 1 ? names[0] : names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1];
  const youngest = kids.reduce((min, k) => (k.age ?? 99) < (min.age ?? 99) ? k : min, kids[0]);
  if (youngest && (youngest.age ?? 0) <= 7) {
    return `${list} — got it. ${youngest.yearLevel ?? 'The littlest'} is where everything's magical and everyone's tired. I'll keep an eye on ${youngest.name}.`;
  }
  return `${list} — got it. Big kids are a joy and a chaos in equal measure. I've met a few.`;
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 5 — RHYTHM
// ═══════════════════════════════════════════════════════════════════════════
function RhythmStep(p: { rhythm: Rhythm; setRhythm: (r: Rhythm) => void; family: Member[]; onNext: () => void; onBack: () => void }) {
  const [editing, setEditing] = useState<null | keyof Rhythm>(null);
  const [pickDate, setPickDate] = useState<Date>(new Date());

  function openPicker(k: keyof Rhythm) {
    setPickDate(hmToDate(p.rhythm[k]));
    setEditing(k);
  }

  const card = (
    <View style={s.inlineCard}>
      <Text style={s.cardLbl}>Your weekday rhythm</Text>

      <TouchableOpacity style={s.rhythmRow} activeOpacity={0.75} onPress={() => openPicker('schoolRun')}>
        <View style={[s.rhythmIcon, { backgroundColor: '#FFE8D6' }]}><Text style={{ fontSize: 16 }}>☀️</Text></View>
        <Text style={s.rhythmLabel}>School run out the door</Text>
        <Text style={s.rhythmTime}>{fmtTime12(p.rhythm.schoolRun)}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={s.rhythmRow} activeOpacity={0.75} onPress={() => openPicker('dinner')}>
        <View style={[s.rhythmIcon, { backgroundColor: '#FFEBE2' }]}><Text style={{ fontSize: 16 }}>🍝</Text></View>
        <Text style={s.rhythmLabel}>Dinner time</Text>
        <Text style={s.rhythmTime}>{fmtTime12(p.rhythm.dinner)}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[s.rhythmRow, { borderBottomWidth: 0 }]} activeOpacity={0.75} onPress={() => openPicker('kidsInBed')}>
        <View style={[s.rhythmIcon, { backgroundColor: '#E8E0FF' }]}><Text style={{ fontSize: 16 }}>🌙</Text></View>
        <Text style={s.rhythmLabel}>Kids in bed</Text>
        <Text style={s.rhythmTime}>{fmtTime12(p.rhythm.kidsInBed)}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[s.cardCta, { marginTop: 12 }]} onPress={p.onNext} activeOpacity={0.85}>
        <Text style={s.cardCtaTxt}>That's us</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={p.onNext} activeOpacity={0.7} style={s.skipLinkWrap}>
        <Text style={s.skipLink}>A bit different each day · set later</Text>
      </TouchableOpacity>
    </View>
  );

  // Family greeting carries over from Step 4 (the natural Zaeli reaction
  // happens after they've actually added members, not while they were typing).
  const greeting = renderFamilyGreeting(p.family);

  return (
    <View style={{ flex: 1 }}>
      <ChatHeader onBack={p.onBack}/>
      <ScrollView contentContainerStyle={s.chatBody} showsVerticalScrollIndicator={false}>
        <TypedConversation
          items={[
            { kind: 'zaeli', node: greeting },
            { kind: 'zaeli', node: <><Text style={s.b}>Three moments make or break a weekday.</Text> Set yours and I won't nudge at the wrong one — no one needs a ping at 7:58 when you're hunting for shoes.</> },
            { kind: 'card', node: card },
          ]}
        />

        {editing && (
          <View style={s.pickerModal}>
            <Text style={s.pickerLbl}>Set {editing === 'schoolRun' ? 'school run' : editing === 'dinner' ? 'dinner time' : 'bedtime'}</Text>
            <DateTimePicker
              value={pickDate} mode="time" display="spinner"
              onChange={(_: any, d?: Date) => { if (d) setPickDate(d); }}
            />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
              <TouchableOpacity style={[s.ghostBtn, { flex: 1 }]} onPress={() => setEditing(null)} activeOpacity={0.85}>
                <Text style={s.ghostBtnTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.solidBtn, { flex: 1, backgroundColor: MINT_DARK }]} onPress={() => {
                const k = editing!;
                p.setRhythm({ ...p.rhythm, [k]: dateToHm(pickDate) });
                setEditing(null);
              }} activeOpacity={0.85}>
                <Text style={s.solidBtnTxt}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 6 — PREFERENCES (chips + toggles)
// ═══════════════════════════════════════════════════════════════════════════
function PreferencesStep(p: { prefs: Prefs; setPrefs: (pr: Prefs) => void; onNext: () => void; onBack: () => void }) {
  function toggleChip(c: string) {
    const on = p.prefs.chips.includes(c);
    p.setPrefs({ ...p.prefs, chips: on ? p.prefs.chips.filter(x => x !== c) : [...p.prefs.chips, c] });
  }
  const allOn = p.prefs.chips.length === STRESS_CHIPS.length;
  function toggleAll() {
    p.setPrefs({ ...p.prefs, chips: allOn ? [] : [...STRESS_CHIPS] });
  }
  const card = (
    <View style={s.inlineCard}>
      <Text style={s.cardLbl}>Where I can help most</Text>
      <View style={s.chipsWrap}>
        {STRESS_CHIPS.map(c => {
          const on = p.prefs.chips.includes(c);
          return (
            <TouchableOpacity key={c} style={[s.chip, on && s.chipOn]} onPress={() => toggleChip(c)} activeOpacity={0.75}>
              <Text style={[s.chipTxt, on && s.chipTxtOn]}>{c}</Text>
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity style={[s.chip, allOn && s.chipOn, { borderStyle: 'dashed' }]} onPress={toggleAll} activeOpacity={0.75}>
          <Text style={[s.chipTxt, allOn && s.chipTxtOn]}>{allOn ? '✓ All of the above' : 'All of the above'}</Text>
        </TouchableOpacity>
      </View>

      <Text style={[s.cardLbl, { marginTop: 14 }]}>A few extras</Text>

      <View style={s.prefRow}>
        <View style={[s.prefIcon, { backgroundColor: SKY_BG }]}><Text style={{ fontSize: 17 }}>✈️</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={s.prefTtl}>Upcoming holiday or trip?</Text>
          <Text style={s.prefDesc}>I'll help with packing, bookings, countdown.</Text>
        </View>
        <Switch
          value={p.prefs.holiday}
          onValueChange={v => p.setPrefs({ ...p.prefs, holiday: v })}
          trackColor={{ false: 'rgba(10,10,10,0.15)', true: MINT_DARK }}
          thumbColor="#fff"
        />
      </View>

      <View style={s.prefRow}>
        <View style={[s.prefIcon, { backgroundColor: LAV }]}><Text style={{ fontSize: 17 }}>🛒</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={s.prefTtl}>Shared shopping list</Text>
          <Text style={s.prefDesc}>Everyone in the family can add items.</Text>
        </View>
        <Switch
          value={p.prefs.sharedShopping}
          onValueChange={v => p.setPrefs({ ...p.prefs, sharedShopping: v })}
          trackColor={{ false: 'rgba(10,10,10,0.15)', true: MINT_DARK }}
          thumbColor="#fff"
        />
      </View>

      <View style={[s.prefRow, { borderBottomWidth: 0 }]}>
        <View style={[s.prefIcon, { backgroundColor: MINT_BG }]}><Text style={{ fontSize: 17 }}>💰</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={s.prefTtl}>Track the monthly budget</Text>
          <Text style={s.prefDesc}>Plan categories, watch savings goals.</Text>
        </View>
        <Switch
          value={p.prefs.budget}
          onValueChange={v => p.setPrefs({ ...p.prefs, budget: v })}
          trackColor={{ false: 'rgba(10,10,10,0.15)', true: MINT_DARK }}
          thumbColor="#fff"
        />
      </View>

      <TouchableOpacity style={[s.cardCta, { marginTop: 14 }]} onPress={p.onNext} activeOpacity={0.85}>
        <Text style={s.cardCtaTxt}>Start me there</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={p.onNext} activeOpacity={0.7} style={s.skipLinkWrap}>
        <Text style={s.skipLink}>None of these — skip</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <ChatHeader onBack={p.onBack}/>
      <ScrollView contentContainerStyle={s.chatBody} showsVerticalScrollIndicator={false}>
        <TypedConversation
          items={[
            { kind: 'zaeli', node: <>Last question for a while, promise. <Text style={s.b}>Where's the heat right now?</Text> Tap anything that fits. I'll start there and stay out of what doesn't need me.</> },
            { kind: 'card', node: card },
          ]}
        />
      </ScrollView>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 7 — PERMISSIONS
// ═══════════════════════════════════════════════════════════════════════════
function PermissionsStep(p: {
  locationOK: boolean | null; notifOK: boolean | null;
  onRequestLocation: () => void; onRequestNotif: () => void;
  onNext: () => void; onBack: () => void;
}) {
  const canContinue = p.locationOK !== null && p.notifOK !== null;

  const locationCard = (
    <View style={[s.permCard, { borderColor: SKY }]}>
      <View style={s.permHeader}>
        <View style={[s.permIcon, { backgroundColor: SKY }]}><Text style={{ fontSize: 18 }}>📍</Text></View>
        <Text style={s.permTitle}>Where are you?</Text>
      </View>
      <Text style={s.permSub}>So I can put the right weather in your brief. Nothing stored on my end — just used each morning.</Text>
      {p.locationOK === null ? (
        <>
          <TouchableOpacity style={[s.permBtn, { backgroundColor: SKY_DEEP }]} onPress={p.onRequestLocation} activeOpacity={0.85}>
            <Text style={s.permBtnTxt}>Share location</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={p.onRequestLocation} activeOpacity={0.7} style={s.skipLinkWrap}>
            <Text style={s.skipLink}>Skip — I'll enter my suburb later</Text>
          </TouchableOpacity>
        </>
      ) : (
        <View style={s.permDoneRow}>
          <View style={[s.permDoneTick, { backgroundColor: p.locationOK ? MINT_DARK : INK4 }]}>
            <IcoCheck/>
          </View>
          <Text style={s.permDoneTxt}>{p.locationOK ? 'Location shared' : 'Set later'}</Text>
        </View>
      )}
    </View>
  );
  const notifCard = (
    <View style={[s.permCard, { borderColor: '#F59E0B', backgroundColor: '#FFFBEB', marginTop: 4 }]}>
      <View style={s.permHeader}>
        <View style={[s.permIcon, { backgroundColor: '#F59E0B' }]}><Text style={{ fontSize: 18 }}>🔔</Text></View>
        <Text style={s.permTitle}>Let me nudge you</Text>
      </View>
      <Text style={s.permSub}>Two a day, max — morning and evening. Never a badge buzzing with nothing useful.</Text>
      {p.notifOK === null ? (
        <>
          <TouchableOpacity style={[s.permBtn, { backgroundColor: '#D97706' }]} onPress={p.onRequestNotif} activeOpacity={0.85}>
            <Text style={s.permBtnTxt}>Yes, nudge me</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={p.onRequestNotif} activeOpacity={0.7} style={s.skipLinkWrap}>
            <Text style={s.skipLink}>Not yet</Text>
          </TouchableOpacity>
        </>
      ) : (
        <View style={s.permDoneRow}>
          <View style={[s.permDoneTick, { backgroundColor: p.notifOK ? MINT_DARK : INK4 }]}>
            <IcoCheck/>
          </View>
          <Text style={s.permDoneTxt}>{p.notifOK ? 'Notifications on' : 'Maybe later'}</Text>
        </View>
      )}
    </View>
  );

  const [convoDone, setConvoDone] = useState(false);

  return (
    <View style={{ flex: 1 }}>
      <ChatHeader onBack={p.onBack}/>
      <ScrollView contentContainerStyle={s.chatBody} showsVerticalScrollIndicator={false}>
        <TypedConversation
          items={[
            { kind: 'zaeli', node: <>Two tiny housekeeping bits. I promise this is the boring part — and the last of it.</> },
            { kind: 'card', node: locationCard },
            { kind: 'card', node: notifCard },
          ]}
          onComplete={() => setConvoDone(true)}
        />

        {convoDone && (
          <TouchableOpacity
            style={[s.primaryCta, !canContinue && { opacity: 0.45 }]}
            onPress={canContinue ? p.onNext : undefined}
            activeOpacity={canContinue ? 0.85 : 1}
          >
            <Text style={s.primaryCtaTxt}>{canContinue ? 'Continue' : 'Tap each one above first'}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 8 — PANTRY DEMO
// ═══════════════════════════════════════════════════════════════════════════
function PantryDemoStep(p: { onNext: () => void; onBack: () => void }) {
  const [done, setDone] = useState(false);
  const card = (
    <View style={s.demoCard}>
      <Text style={s.cardLbl}>Your pantry · a preview</Text>
      <PantryItem emoji="🥛" name="Full-cream milk" meta="Last bought 6 days ago" status="low"/>
      <PantryItem emoji="🍞" name="Sourdough"       meta="Last bought 2 days ago" status="ok"/>
      <PantryItem emoji="🥚" name="Eggs, free range" meta="Last bought 9 days ago" status="low" last/>
    </View>
  );
  return (
    <View style={{ flex: 1 }}>
      <ChatHeader onBack={p.onBack}/>
      <ScrollView contentContainerStyle={s.chatBody} showsVerticalScrollIndicator={false}>
        <TypedConversation
          items={[
            { kind: 'zaeli', node: <>Brilliant. Before I set up your space, three tiny things so you know what I'm good for. 👇</> },
            { kind: 'zaeli', node: <><Text style={s.b}>Remembering what you've bought.</Text> Show me a receipt or snap the pantry — I'll track what's running low so no one's buying three jars of Vegemite.</> },
            { kind: 'card', node: card },
          ]}
          onComplete={() => setDone(true)}
        />
        {done && (
          <TouchableOpacity style={s.primaryCta} onPress={p.onNext} activeOpacity={0.85}>
            <Text style={s.primaryCtaTxt}>Show me more</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}
function PantryItem(p: { emoji: string; name: string; meta: string; status: 'ok' | 'low'; last?: boolean }) {
  return (
    <View style={[s.pantryItem, p.last && { borderBottomWidth: 0 }]}>
      <Text style={{ fontSize: 22 }}>{p.emoji}</Text>
      <View style={{ flex: 1, marginLeft: 10 }}>
        <Text style={s.pantryName}>{p.name}</Text>
        <Text style={s.pantryMeta}>{p.meta}</Text>
      </View>
      <View style={[s.pantryStatus, p.status === 'low' ? { backgroundColor: CORAL_SOFT } : { backgroundColor: MINT_BG }]}>
        <Text style={[s.pantryStatusTxt, { color: p.status === 'low' ? CORAL_DEEP : MINT_DARK }]}>{p.status === 'low' ? 'Low' : 'Good'}</Text>
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 9 — HOMEWORK DEMO
// ═══════════════════════════════════════════════════════════════════════════
function HomeworkDemoStep(p: { family: Member[]; onNext: () => void; onBack: () => void }) {
  // Pick the user's first kid for the demo. Falls back to "your kid" if none.
  const demoKid = p.family.find(m => m.role === 'child');
  const kidName = demoKid?.name ?? 'your kid';
  const kidPronoun = 'them';
  const kidColour = demoKid?.colour ?? FAMILY_COLOURS.poppy;
  const kidInitial = demoKid?.initial ?? 'K';
  const kidYear = demoKid?.yearLevel ?? 'Year 6';
  const tutorViolet = '#6B35D9';

  const [done, setDone] = useState(false);

  // Card 1 — live practice session view (matches the actual Tutor screen)
  const practiceCard = (
    <View style={s.tutorCard}>
      {/* Header */}
      <View style={s.tutorHeader}>
        <View style={[s.tutorAv, { backgroundColor: kidColour }]}><Text style={s.tutorAvTxt}>{kidInitial}</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={s.tutorTitle}>Practice · Maths · Fractions</Text>
          <Text style={s.tutorSub}>{kidYear} · Core band</Text>
        </View>
        <View style={s.tutorTimer}><Text style={s.tutorTimerTxt}>⏱ 08:52</Text></View>
      </View>

      {/* Progress dots */}
      <View style={s.tutorProgressRow}>
        {[0,1,2,3,4,5].map(i => (
          <View key={i} style={[s.tutorProgressDot, { backgroundColor: i < 3 ? tutorViolet : 'rgba(10,10,10,0.1)' }]}/>
        ))}
        <Text style={s.tutorProgressTxt}>Q3 of 6</Text>
      </View>

      {/* Zaeli question */}
      <View style={s.tutorEyebrow}>
        <View style={[s.zStar, { backgroundColor: tutorViolet }]}><IcoStar color="#fff"/></View>
        <Text style={[s.zLabel, { color: tutorViolet }]}>ZAELI · 9:44</Text>
      </View>
      <Text style={s.tutorQuestion}>
        Question 3. A recipe needs ¾ of a cup of flour. If you're making half the recipe, how much flour do you need?
      </Text>

      {/* Multiple choice */}
      <View style={{ gap: 6, marginTop: 12 }}>
        <View style={s.answerRow}>
          <View style={[s.answerLetter, { backgroundColor: 'rgba(10,10,10,0.06)' }]}><Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 12, color: INK2 }}>A</Text></View>
          <Text style={s.answerTxt}>¼ cup</Text>
        </View>
        <View style={[s.answerRow, { borderColor: CORAL, backgroundColor: CORAL_SOFT, borderWidth: 1.5 }]}>
          <View style={[s.answerLetter, { backgroundColor: CORAL }]}><Text style={s.answerLetterOnTxt}>B</Text></View>
          <Text style={[s.answerTxt, { color: CORAL_DEEP }]}>½ cup ✕</Text>
        </View>
        <View style={[s.answerRow, { borderColor: MINT_DARK, backgroundColor: MINT_BG, borderWidth: 1.5 }]}>
          <View style={[s.answerLetter, { backgroundColor: MINT_DARK }]}><Text style={s.answerLetterOnTxt}>C</Text></View>
          <Text style={[s.answerTxt, { color: MINT_DARK }]}>⅜ cup ✓</Text>
        </View>
        <View style={s.answerRow}>
          <View style={[s.answerLetter, { backgroundColor: 'rgba(10,10,10,0.06)' }]}><Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 12, color: INK2 }}>D</Text></View>
          <Text style={s.answerTxt}>⅔ cup</Text>
        </View>
      </View>

      {/* Kid reply */}
      <View style={s.tutorUserBubble}>
        <Text style={s.tutorUserTxt}>B — ½ cup?</Text>
      </View>

      {/* Zaeli correction */}
      <View style={[s.tutorEyebrow, { marginTop: 10 }]}>
        <View style={[s.zStar, { backgroundColor: tutorViolet }]}><IcoStar color="#fff"/></View>
        <Text style={[s.zLabel, { color: tutorViolet }]}>ZAELI · 9:45</Text>
      </View>
      <Text style={s.tutorQuestion}>
        Not quite — "half the recipe" means you multiply the fraction by ½, not divide it. So it's ¾ × ½. Here's the method…
      </Text>
    </View>
  );

  // Card 2 — parent recap (matches the post-session view in Our Family)
  const recapCard = (
    <View style={s.recapCard}>
      <View style={s.recapHeader}>
        <View style={[s.tutorAv, { backgroundColor: kidColour }]}><Text style={s.tutorAvTxt}>{kidInitial}</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={s.recapName}>{kidName} · Today</Text>
        </View>
      </View>
      <Text style={s.recapTopic}>Fractions — multiplying and dividing</Text>
      <Text style={s.recapMeta}>Practice · Maths · 18 min · 22 messages</Text>

      {/* Stats grid */}
      <View style={s.statsGrid}>
        <View style={s.statBox}><Text style={s.statNum}>6</Text><Text style={s.statLbl}>QUESTIONS</Text></View>
        <View style={s.statBox}><Text style={s.statNum}>2</Text><Text style={s.statLbl}>HINTS USED</Text></View>
        <View style={s.statBox}><Text style={s.statNum}>1</Text><Text style={s.statLbl}>PHOTO UPLOADS</Text></View>
        <View style={s.statBox}><Text style={[s.statNum, { color: MINT_DARK }]}>✓</Text><Text style={s.statLbl}>DONE</Text></View>
      </View>

      {/* Summary */}
      <View style={s.summaryBlock}>
        <Text style={s.summaryHdr}>✦ ZAELI'S SUMMARY</Text>
        <Text style={s.summaryBody}>
          {kidName} worked through multiplying and dividing fractions including mixed numbers. {kidPronoun === 'them' ? 'They' : 'She'} struggled initially with "half of a fraction" questions but recovered quickly — by Q5 {kidPronoun === 'them' ? 'they were' : 'she was'} working at extension level with no hints needed. Strong session overall.
        </Text>
        <View style={s.tagRow}>
          <View style={s.tagPill}><Text style={s.tagPillTxt}>Fractions</Text></View>
          <View style={s.tagPill}><Text style={s.tagPillTxt}>Mixed numbers</Text></View>
          <View style={s.tagPill}><Text style={s.tagPillTxt}>{kidYear} Maths</Text></View>
        </View>
        <View style={s.extensionBadge}>
          <Text style={s.extensionBadgeTxt}>↑ Extension Q5</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <ChatHeader onBack={p.onBack}/>
      <ScrollView contentContainerStyle={s.chatBody} showsVerticalScrollIndicator={false}>
        <TypedConversation
          items={[
            { kind: 'zaeli', node: <><Text style={s.b}>Helping the kids without handing over the answer.</Text> When {kidName} gets stuck on homework, I guide {kidPronoun} through it — they do the thinking, I keep them moving.</> },
            { kind: 'card', node: practiceCard },
            { kind: 'zaeli', node: <>And so you don't miss anything — when the session's done, I send you the recap.</> },
            { kind: 'card', node: recapCard },
            { kind: 'zaeli', node: <>Your kid gets a patient tutor. You get clear visibility on what {kidPronoun === 'them' ? 'they' : 'she'} actually learned. Everyone wins.</> },
          ]}
          onComplete={() => setDone(true)}
        />
        {done && (
          <TouchableOpacity style={s.primaryCta} onPress={p.onNext} activeOpacity={0.85}>
            <Text style={s.primaryCtaTxt}>One more</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 10 — GENERAL LIFE DEMO
// ═══════════════════════════════════════════════════════════════════════════
function LifeDemoStep(p: { family: Member[]; onNext: () => void; onBack: () => void }) {
  // Pick a kid for the excursion demo — prefer the second kid (so it's not
  // the same one as homework demo); fall back to first kid, then generic.
  const kids = p.family.filter(m => m.role === 'child');
  const demoKid = kids[1] ?? kids[0];
  const kidName = demoKid?.name ?? 'your kid';
  const kidYear = demoKid?.yearLevel ?? 'Primary';

  const [done, setDone] = useState(false);
  const photoCard = (
    <View style={s.demoCard}>
      <View style={s.photoThumb}>
        <Text style={s.photoThumbTitle}>BRENTWOOD PRIMARY · Excursion Consent</Text>
        <Text style={s.photoThumbBody}>Dear Families, On Friday 9 May, {kidYear} students will travel to the Sydney Maritime Museum. Please return the slip below signed by a parent, along with $18 for entry. Packed lunch required. Departs 9:15am, returns 3:00pm. Spare warm layer recommended.</Text>
      </View>
      <Text style={s.photoMeta}>Taken just now · from camera roll</Text>
      <View style={s.photoAnswer}>
        <Text style={s.photoAnswerTxt}>
          <Text style={s.b}>Got it — it's {kidName}'s excursion.</Text>{'\n'}Friday 9 May, Sydney Maritime Museum. Depart 9:15am, back 3pm. $18, packed lunch, warm layer, signed slip. Shall I add the excursion to your calendar and put the $18 on your list of things to sort?
        </Text>
      </View>
      <View style={s.photoActions}>
        <View style={[s.photoActBtn, { backgroundColor: PEACH_DEEP }]}><Text style={s.photoActBtnTxt}>Yes, both</Text></View>
        <View style={s.photoActBtn}><Text style={[s.photoActBtnTxt, { color: INK2 }]}>Just calendar</Text></View>
        <View style={s.photoActBtn}><Text style={[s.photoActBtnTxt, { color: INK2 }]}>Not now</Text></View>
      </View>
    </View>
  );
  return (
    <View style={{ flex: 1 }}>
      <ChatHeader onBack={p.onBack}/>
      <ScrollView contentContainerStyle={s.chatBody} showsVerticalScrollIndicator={false}>
        <TypedConversation
          items={[
            { kind: 'zaeli', node: <>Here's my favourite bit. The stuff you don't think to ask an app — <Text style={s.b}>ask me anyway</Text>.</> },
            { kind: 'zaeli', node: <>Confusing school form? Mystery ingredient? <Text style={s.italic}>"Is this rash anything?"</Text> Show me the photo, ask the question. I handle the whole business of being a parent — not just the lists.</> },
            { kind: 'user', node: '📷 School permission slip.jpg' },
            { kind: 'card', node: photoCard },
          ]}
          onComplete={() => setDone(true)}
        />
        {done && (
          <TouchableOpacity style={s.primaryCta} onPress={p.onNext} activeOpacity={0.85}>
            <Text style={s.primaryCtaTxt}>Show me tomorrow</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 11 — BRIEF PREVIEW (pixel-matched to real brief)
// ═══════════════════════════════════════════════════════════════════════════
function BriefPreviewStep(p: { name: string; family: Member[]; rhythm: Rhythm; onNext: () => void; onBack: () => void }) {
  // Substitute real names into the template
  const kids = p.family.filter(m => m.role === 'child');
  const firstTwo = kids.slice(0, 2).map(k => k.name);
  const lastKid = kids[kids.length - 1];
  const olderNames = firstTwo.length === 2 ? `${firstTwo[0]} and ${firstTwo[1]}` : firstTwo[0] ?? 'the kids';
  const youngest = lastKid?.name ?? 'your youngest';
  const briefTime = fmtTime12(subtractMin(p.rhythm.schoolRun, 45));

  const [done, setDone] = useState(false);
  const briefBlock = (
    <View>
      <View style={s.briefEyebrow}>
        <View style={s.zStar}><IcoStar/></View>
        <Text style={s.zLabel}>Zaeli · {briefTime}</Text>
      </View>
      <View style={s.briefBubble}>
        <View style={s.briefPill}>
          <Text style={s.briefPillTxt}>☀️  MORNING</Text>
        </View>
        <Text style={s.briefText}>
          Morning {p.name || 'friend'} — light rain on the school run ☔{'\n\n'}
          Grab jackets for {olderNames}. {youngest}'s swim is tonight at 4:30 — on the radar. Low on milk if pancakes are on the cards 🥞{'\n\n'}
          One thing: dinner's not locked in yet — say the word and I'll sort it 🍽
        </Text>
      </View>
      <View style={s.briefChipsRow}>
        <View style={[s.briefChip, s.briefChipPri]}><Text style={s.briefChipPriTxt}>Plan dinner tonight</Text></View>
        <View style={s.briefChip}><Text style={s.briefChipTxt}>Add milk to list</Text></View>
        <View style={s.briefChip}><Text style={s.briefChipTxt}>All over it ✓</Text></View>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <ChatHeader onBack={p.onBack}/>
      <ScrollView contentContainerStyle={s.chatBody} showsVerticalScrollIndicator={false}>
        <TypedConversation
          items={[
            { kind: 'zaeli', node: <>Okay {p.name || 'friend'} — enough from me. Let me show you something <Text style={s.b}>real</Text>.</> },
            { kind: 'zaeli', node: <>Here's what tomorrow morning could look like, if I'd been with you a while.</> },
            { kind: 'card', node: briefBlock },
            { kind: 'zaeli', node: <>That's what I'll send every morning. In the evening, a quick wrap + tomorrow's shape. That's it. Gentle. Specific. Short.</> },
          ]}
          onComplete={() => setDone(true)}
        />
        {done && (
          <TouchableOpacity style={s.primaryCta} onPress={p.onNext} activeOpacity={0.85}>
            <Text style={s.primaryCtaTxt}>Love it</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}
function subtractMin(hm: string, mins: number): string {
  const d = hmToDate(hm);
  d.setMinutes(d.getMinutes() - mins);
  return dateToHm(d);
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 12 — DASHBOARD REVEAL
// ═══════════════════════════════════════════════════════════════════════════
function DashboardRevealStep(p: { prefs: Prefs; onNext: () => void; onBack: () => void }) {
  const { width } = require('react-native').Dimensions.get('window');
  const scrollRef = useRef<ScrollView | null>(null);
  const [page, setPage]         = useState<0 | 1>(0);   // 0 = Chat, 1 = Dashboard
  const [hasSwiped, setHasSwiped] = useState(false);    // user has visited Dashboard
  const [hasReturned, setHasReturned] = useState(false); // user has come back to Chat

  function onScroll(e: any) {
    const x = e.nativeEvent.contentOffset.x;
    const idx = Math.round(x / width) as 0 | 1;
    if (idx !== page) {
      setPage(idx);
      if (idx === 1 && !hasSwiped) setHasSwiped(true);
      if (idx === 0 && hasSwiped && !hasReturned) setHasReturned(true);
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <ChatHeader onBack={p.onBack}/>

      {/* 2-page horizontal scroll — mirrors the main app's swipe-world */}
      <ScrollView
        ref={scrollRef}
        horizontal pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        style={{ flex: 1 }}
      >
        {/* ── Page A: Chat side ── */}
        <View style={{ width }}>
          <ScrollView contentContainerStyle={s.chatBody} showsVerticalScrollIndicator={false}>
            <UserMsg>Oh that's lovely 🥹</UserMsg>
            <ZaeliMsg>I'm so glad. Two briefs a day — but I won't crowd you. Silence means nothing's urgent.</ZaeliMsg>

            {!hasSwiped && (
              <>
                <ZaeliMsg>
                  I've also set up a quiet little family space. Calendar, meals, shopping{p.prefs.holiday ? ', your upcoming trip' : ''} — all the reference stuff, one swipe away.
                </ZaeliMsg>
                <ZaeliMsg>
                  Go on — <Text style={s.b}>swipe right</Text> and meet it. Don't get lost in there. I'll be right here when you're back.
                </ZaeliMsg>
                <View style={s.swipeHint}>
                  <Text style={s.swipeHintArrow}>→</Text>
                  <Text style={s.swipeHintTxt}>Swipe right</Text>
                </View>
              </>
            )}

            {hasSwiped && !hasReturned && (
              <ZaeliMsg>…</ZaeliMsg>
            )}

            {hasReturned && (
              <>
                <ZaeliMsg>Knew you'd come back.</ZaeliMsg>
                <ZaeliMsg>
                  The Dashboard lives one swipe right, always. I live <Text style={s.b}>here</Text>. Deal?
                </ZaeliMsg>
                <TouchableOpacity style={s.primaryCta} onPress={p.onNext} activeOpacity={0.85}>
                  <Text style={s.primaryCtaTxt}>Deal ✓</Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </View>

        {/* ── Page B: Real Dashboard view (replicates the actual app dashboard) ── */}
        <View style={{ width, flex: 1 }}>
          <View style={s.dashHeader}>
            <Text style={s.dashHeaderWord}>
              z<Text style={{ color: '#FAC8A8' }}>a</Text>el<Text style={{ color: '#FAC8A8' }}>i</Text>
            </Text>
            <Text style={s.dashHeaderDate}>{new Date().toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })}</Text>
          </View>

          <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
            <View style={s.dashSwipeHint}>
              <Text style={s.dashSwipeHintArrow}>←</Text>
              <Text style={s.dashSwipeHintTxt}>Swipe left to find Zaeli</Text>
            </View>

            {/* Calendar card — slate */}
            <View style={[s.realDashCard, { backgroundColor: SLATE }]}>
              <View style={s.realDashHeadRow}>
                <Text style={[s.realDashLabel, { color: 'rgba(255,255,255,0.55)' }]}>CALENDAR</Text>
                <View style={s.realDashAddBtn}><Text style={s.realDashAddTxt}>+ Add</Text></View>
              </View>
              <Text style={[s.realDashHeadline, { color: '#fff' }]}>All clear today.</Text>
              <Text style={[s.realDashSub, { color: 'rgba(255,255,255,0.55)' }]}>Tap to see the week →</Text>
              <Text style={[s.realDashSub, { color: 'rgba(255,255,255,0.4)', marginTop: 4 }]}>Tap to expand</Text>
            </View>

            {/* Meal Planner — mint */}
            <View style={[s.realDashCard, { backgroundColor: MINT }]}>
              <Text style={[s.realDashLabel, { color: MINT_DARK }]}>MEAL PLANNER</Text>
              <Text style={[s.realDashHeadline, { color: INK }]}>Tonight unplanned.</Text>
              <Text style={[s.realDashSub, { color: MINT_DARK }]}>Tap to see the week →</Text>
              <Text style={[s.realDashSub, { color: 'rgba(45,122,82,0.55)', marginTop: 4 }]}>Tap to expand</Text>
            </View>

            {/* Weather + Zaeli Noticed bento */}
            <View style={s.bentoRow}>
              <View style={[s.bentoCard, { backgroundColor: SKY_BG, flex: 35 }]}>
                <Text style={[s.bentoLabel, { color: SKY_DEEP }]}>WEATHER</Text>
                <Text style={s.bentoEmoji}>☀️</Text>
                <Text style={[s.bentoTemp, { color: INK }]}>—°</Text>
                <Text style={[s.bentoSub, { color: SKY_DEEP }]}>I'll pull this in once you share location</Text>
              </View>
              <View style={[s.bentoCard, { backgroundColor: '#F0EDE8', flex: 65 }]}>
                <Text style={[s.bentoLabel, { color: INK4 }]}>ZAELI NOTICED</Text>
                <Text style={[s.bentoNotices, { color: INK }]}>Nothing yet.</Text>
                <Text style={[s.bentoSub, { color: INK3 }]}>I'll start spotting patterns once we get going.</Text>
              </View>
            </View>

            {/* Shopping — lavender */}
            <View style={[s.realDashCard, { backgroundColor: LAV }]}>
              <View style={s.realDashHeadRow}>
                <Text style={[s.realDashLabel, { color: '#5020C0' }]}>SHOPPING</Text>
                <View style={[s.realDashAddBtn, { backgroundColor: 'rgba(80,32,192,0.12)' }]}><Text style={[s.realDashAddTxt, { color: '#5020C0' }]}>+ Add</Text></View>
              </View>
              <Text style={[s.realDashHeadline, { color: INK }]}>Empty list — let's start.</Text>
              <Text style={[s.realDashSub, { color: '#5020C0' }]}>Tap to see →</Text>
              <Text style={[s.realDashSub, { color: 'rgba(80,32,192,0.55)', marginTop: 4 }]}>Tap to open sheet</Text>
            </View>

            {p.prefs.holiday && (
              <View style={[s.realDashCard, { backgroundColor: SKY_BG }]}>
                <Text style={[s.realDashLabel, { color: SKY_DEEP }]}>YOUR NEXT TRIP</Text>
                <Text style={[s.realDashHeadline, { color: INK }]}>Add a destination.</Text>
                <Text style={[s.realDashSub, { color: SKY_DEEP }]}>I'll help with packing, bookings, countdown.</Text>
              </View>
            )}

            {p.prefs.budget && (
              <View style={[s.realDashCard, { backgroundColor: MINT_BG }]}>
                <Text style={[s.realDashLabel, { color: MINT_DARK }]}>OUR BUDGET</Text>
                <Text style={[s.realDashHeadline, { color: INK }]}>Set your monthly plan.</Text>
                <Text style={[s.realDashSub, { color: MINT_DARK }]}>Tap to start →</Text>
              </View>
            )}

            {/* On the Radar — gold */}
            <View style={[s.realDashCard, { backgroundColor: GOLD }]}>
              <Text style={[s.realDashLabel, { color: '#8B6914' }]}>ON THE RADAR</Text>
              <Text style={[s.realDashHeadline, { color: INK }]}>All clear.</Text>
              <Text style={[s.realDashSub, { color: '#8B6914' }]}>I'll surface what needs you, when it does.</Text>
            </View>
          </ScrollView>
        </View>
      </ScrollView>
    </View>
  );
}

function DashRow(p: { emoji: string; bg: string; fg: string; title: string; sub: string; last?: boolean }) {
  return (
    <View style={[s.dashRow, p.last && { borderBottomWidth: 0 }]}>
      <View style={[s.dashIcon, { backgroundColor: p.bg }]}><Text style={{ fontSize: 18, color: p.fg }}>{p.emoji}</Text></View>
      <View style={{ flex: 1 }}>
        <Text style={s.dashName}>{p.title}</Text>
        <Text style={s.dashSub}>{p.sub}</Text>
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 13 — READY
// ═══════════════════════════════════════════════════════════════════════════
function ReadyStep(p: { name: string; rhythm: Rhythm; onFinish: () => void }) {
  const briefTime = fmtTime12(subtractMin(p.rhythm.schoolRun, 45));
  return (
    <View style={{ flex: 1 }}>
      <ChatHeader/>
      <View style={s.readyWrap}>
        <View style={[s.splashOrb, s.splashOrbPeach]} pointerEvents="none"/>
        <View style={[s.splashOrb, s.splashOrbMint]} pointerEvents="none"/>
        <View style={[s.splashOrb, s.splashOrbLav]} pointerEvents="none"/>
        <View style={[s.splashOrb, s.splashOrbSky]} pointerEvents="none"/>
        <Text style={s.readyStar}>✨</Text>
        <Text style={s.readyTitle}>
          You're in{'\n'}<Text style={{ color: CORAL }}>good hands</Text>.
        </Text>
        <Text style={s.readySub}>
          {briefTime} tomorrow morning — I'll be here. Gentle, specific, short. In the meantime, say hi anytime 💬
        </Text>
        <TouchableOpacity style={s.readyCta} onPress={p.onFinish} activeOpacity={0.85}>
          <Text style={s.readyCtaTxt}>Start with Zaeli</Text>
        </TouchableOpacity>
        <Text style={s.readyFine}>Free for 14 days · A$14.99/month after</Text>
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════════════════════════════════
const s = StyleSheet.create({
  // Welcome
  welcomeFlex: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 14, overflow: 'hidden' },
  splashOrb: { position: 'absolute', borderRadius: 9999 },
  splashOrbPeach: { width: 280, height: 280, top: -80, right: -80, backgroundColor: PEACH, opacity: 0.42 },
  splashOrbMint: { width: 240, height: 240, bottom: -60, left: -70, backgroundColor: MINT, opacity: 0.50 },
  splashOrbLav: { width: 180, height: 180, top: 120, left: -50, backgroundColor: LAV, opacity: 0.55 },
  splashOrbSky: { width: 160, height: 160, bottom: 140, right: -40, backgroundColor: SKY, opacity: 0.42 },
  wmHuge: { fontFamily: 'Poppins_800ExtraBold', fontSize: 92, letterSpacing: -4, lineHeight: 120, paddingTop: 14, color: INK },
  welcomeTagline: { fontFamily: 'Poppins_500Medium', fontSize: 26, color: INK, lineHeight: 36, textAlign: 'center', marginTop: 14 },
  bold: { fontFamily: 'Poppins_700Bold' },
  italic: { fontStyle: 'italic', color: SKY_DEEP },
  welcomeSub: { fontFamily: 'Poppins_400Regular', fontSize: 15, color: INK3, textAlign: 'center', lineHeight: 23, maxWidth: 300, marginTop: 6 },
  welcomeCta: { backgroundColor: INK, paddingVertical: 16, paddingHorizontal: 42, borderRadius: 32, marginTop: 36 },
  welcomeCtaTxt: { fontFamily: 'Poppins_700Bold', fontSize: 16, color: '#FFFFFF', letterSpacing: 0.2 },
  welcomeFine: { fontFamily: 'Poppins_500Medium', fontSize: 13, color: INK4, marginTop: 12 },

  // Chat header
  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: BORDER },
  back: { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(10,10,10,0.06)', alignItems: 'center', justifyContent: 'center' },
  wordmark: { fontFamily: 'Poppins_800ExtraBold', fontSize: 36, letterSpacing: -1.4, lineHeight: 40, color: INK },

  // Chat body (scrollable)
  chatBody: { padding: 14, paddingBottom: 30, gap: 10 },

  // Messages
  zMsgRow: { alignItems: 'flex-start', maxWidth: '90%' },
  zBubble: { backgroundColor: 'rgba(10,10,10,0.04)', borderRadius: 18, borderBottomLeftRadius: 6, paddingVertical: 13, paddingHorizontal: 16 },
  zText: { fontFamily: 'Poppins_400Regular', fontSize: 17, color: INK, lineHeight: 26 },
  b: { fontFamily: 'Poppins_700Bold' },
  uMsgRow: { alignItems: 'flex-end', alignSelf: 'flex-end', maxWidth: '86%' },
  uBubble: { backgroundColor: SKY_BG, borderRadius: 18, borderBottomRightRadius: 6, paddingVertical: 11, paddingHorizontal: 15 },
  uText: { fontFamily: 'Poppins_400Regular', fontSize: 17, color: INK, lineHeight: 26 },

  // Typing dots bubble
  typingRow: { alignItems: 'flex-start', maxWidth: '40%' },
  typingBubble: { flexDirection: 'row', backgroundColor: 'rgba(10,10,10,0.04)', borderRadius: 18, borderBottomLeftRadius: 6, paddingVertical: 14, paddingHorizontal: 18, gap: 6 },
  typingDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: 'rgba(10,10,10,0.42)' },

  // Zaeli eyebrow
  zEyebrow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 4, marginTop: 4 },
  zStar: { width: 16, height: 16, borderRadius: 5, backgroundColor: SKY, alignItems: 'center', justifyContent: 'center' },
  zLabel: { fontFamily: 'Poppins_700Bold', fontSize: 10, letterSpacing: 0.8, color: INK4, textTransform: 'uppercase' },

  // Voice pill
  voicePill: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', backgroundColor: SKY_BG, borderWidth: 1, borderColor: SKY, borderRadius: 22, paddingVertical: 8, paddingHorizontal: 14, marginVertical: 6 },
  voicePillDot: { width: 24, height: 24, borderRadius: 12, backgroundColor: SKY_DEEP, alignItems: 'center', justifyContent: 'center' },
  voicePillPlaying: { color: '#fff', fontSize: 10 },
  voicePillTxt: { fontFamily: 'Poppins_700Bold', fontSize: 13, color: SKY_DEEP },

  // Inline card
  inlineCard: { backgroundColor: CARD, borderRadius: 18, borderWidth: 1, borderColor: BORDER, padding: 16 },
  cardLbl: { fontFamily: 'Poppins_700Bold', fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', color: INK4, marginBottom: 10 },
  cardField: { backgroundColor: 'rgba(10,10,10,0.04)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, fontFamily: 'Poppins_600SemiBold', fontSize: 17, color: INK, marginBottom: 10 },
  cardCta: { backgroundColor: MINT_DARK, borderRadius: 14, paddingVertical: 13, alignItems: 'center' },
  cardCtaTxt: { fontFamily: 'Poppins_700Bold', fontSize: 15, color: '#fff' },
  skipLinkWrap: { alignItems: 'center', paddingVertical: 10 },
  skipLink: { fontFamily: 'Poppins_600SemiBold', fontSize: 12, color: INK4 },

  // Primary CTA (free-floating)
  primaryCta: { backgroundColor: INK, borderRadius: 16, paddingVertical: 14, alignItems: 'center', marginTop: 12 },
  primaryCtaTxt: { fontFamily: 'Poppins_700Bold', fontSize: 15, color: '#fff' },
  ghostBtn: { backgroundColor: '#fff', borderRadius: 12, paddingVertical: 11, alignItems: 'center', borderWidth: 1, borderColor: BORDER },
  ghostBtnTxt: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: INK2 },
  solidBtn: { borderRadius: 12, paddingVertical: 11, alignItems: 'center' },
  solidBtnTxt: { fontFamily: 'Poppins_700Bold', fontSize: 14, color: '#fff' },

  // Family
  familyRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(10,10,10,0.06)' },
  memberDot: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  memberInitial: { fontFamily: 'Poppins_700Bold', fontSize: 15, color: '#fff' },
  memberName: { fontFamily: 'Poppins_700Bold', fontSize: 15, color: INK },
  memberRole: { fontFamily: 'Poppins_500Medium', fontSize: 11, color: INK4, marginTop: 1 },
  agePill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12, backgroundColor: MINT_BG },
  agePillTxt: { fontFamily: 'Poppins_700Bold', fontSize: 11, color: MINT_DARK },
  addMemberRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14, borderTopWidth: 1, borderTopColor: 'rgba(10,10,10,0.06)' },
  plusSq: { width: 24, height: 24, borderRadius: 8, borderWidth: 1.5, borderStyle: 'dashed', borderColor: INK5, alignItems: 'center', justifyContent: 'center' },
  plusSqTxt: { fontFamily: 'Poppins_700Bold', fontSize: 14, color: INK4 },
  addMemberTxt: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: INK4 },
  addRow: { paddingVertical: 14, borderTopWidth: 1, borderTopColor: 'rgba(10,10,10,0.06)' },
  smallField: { backgroundColor: 'rgba(10,10,10,0.04)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontFamily: 'Poppins_500Medium', fontSize: 14, color: INK },
  roleTog: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10, borderWidth: 1.5, borderColor: BORDER, backgroundColor: '#fff' },
  roleTogOn: { borderColor: MINT_DARK, backgroundColor: MINT_BG },
  roleTogTxt: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: INK4 },
  roleTogTxtOn: { color: MINT_DARK, fontFamily: 'Poppins_700Bold' },

  // Rhythm
  rhythmRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(10,10,10,0.06)' },
  rhythmIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rhythmLabel: { flex: 1, fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: INK },
  rhythmTime: { fontFamily: 'Poppins_800ExtraBold', fontSize: 16, color: INK },
  pickerModal: { backgroundColor: CARD, borderRadius: 18, padding: 14, marginTop: 12, borderWidth: 1, borderColor: BORDER },
  pickerLbl: { fontFamily: 'Poppins_700Bold', fontSize: 13, color: INK, marginBottom: 6 },

  // Chips
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1.5, borderColor: 'rgba(10,10,10,0.1)' },
  chipOn: { backgroundColor: MINT_BG, borderColor: MINT_DARK },
  chipTxt: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: INK2 },
  chipTxtOn: { color: MINT_DARK, fontFamily: 'Poppins_700Bold' },

  // Preference rows
  prefRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(10,10,10,0.06)' },
  prefIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  prefTtl: { fontFamily: 'Poppins_700Bold', fontSize: 14, color: INK },
  prefDesc: { fontFamily: 'Poppins_500Medium', fontSize: 11, color: INK4, marginTop: 1, lineHeight: 15 },

  // Permissions
  permCard: { marginTop: 6, backgroundColor: '#fff', borderRadius: 22, padding: 18, borderWidth: 1.5 },
  permHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  permIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  permTitle: { fontFamily: 'Poppins_800ExtraBold', fontSize: 18, color: INK, letterSpacing: -0.3 },
  permSub: { fontFamily: 'Poppins_500Medium', fontSize: 13, color: INK3, lineHeight: 19 },
  permBtn: { borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 14 },
  permBtnTxt: { fontFamily: 'Poppins_700Bold', fontSize: 14, color: '#fff' },
  permDoneRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12, paddingVertical: 8 },
  permDoneTick: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  permDoneTxt: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: INK2 },

  // Demo cards
  demoCard: { backgroundColor: CARD, borderRadius: 18, borderWidth: 1, borderColor: BORDER, padding: 20 },
  pantryItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(10,10,10,0.05)' },
  pantryName: { fontFamily: 'Poppins_700Bold', fontSize: 14, color: INK },
  pantryMeta: { fontFamily: 'Poppins_500Medium', fontSize: 11, color: INK4, marginTop: 1 },
  pantryStatus: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  pantryStatusTxt: { fontFamily: 'Poppins_700Bold', fontSize: 11, letterSpacing: 0.3 },

  // Homework (legacy — kept in case demoCard reuses; new tutor styles below)
  hwHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(10,10,10,0.05)' },
  hwAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  hwAvatarTxt: { fontFamily: 'Poppins_700Bold', fontSize: 14, color: '#fff' },
  hwName: { fontFamily: 'Poppins_700Bold', fontSize: 14, color: INK },
  hwSub: { fontFamily: 'Poppins_500Medium', fontSize: 11, color: INK4, marginTop: 1 },
  hwBubble: { paddingVertical: 9, paddingHorizontal: 12, borderRadius: 12, maxWidth: '85%' },
  hwKid: { alignSelf: 'flex-end', backgroundColor: SKY_BG, borderBottomRightRadius: 4 },
  hwKidTxt: { fontFamily: 'Poppins_500Medium', fontSize: 13, color: SKY_DEEP, lineHeight: 18 },
  hwZae: { backgroundColor: 'rgba(10,10,10,0.04)', borderBottomLeftRadius: 4 },
  hwZaeTxt: { fontFamily: 'Poppins_500Medium', fontSize: 13, color: INK, lineHeight: 18 },

  // Tutor practice card (Step 9 demo) — matches the real Tutor session screen
  tutorCard: { backgroundColor: '#F5F0FF', borderRadius: 18, borderWidth: 1, borderColor: 'rgba(107,53,217,0.12)', padding: 14 },
  tutorHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  tutorAv: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  tutorAvTxt: { fontFamily: 'Poppins_700Bold', fontSize: 14, color: '#fff' },
  tutorTitle: { fontFamily: 'Poppins_700Bold', fontSize: 14, color: INK },
  tutorSub: { fontFamily: 'Poppins_500Medium', fontSize: 11, color: INK4, marginTop: 2 },
  tutorTimer: { backgroundColor: 'rgba(107,53,217,0.12)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  tutorTimerTxt: { fontFamily: 'Poppins_700Bold', fontSize: 12, color: '#6B35D9' },
  tutorProgressRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 12 },
  tutorProgressDot: { flex: 1, height: 4, borderRadius: 2 },
  tutorProgressTxt: { fontFamily: 'Poppins_700Bold', fontSize: 11, color: INK4, marginLeft: 8 },
  tutorEyebrow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  tutorQuestion: { fontFamily: 'Poppins_500Medium', fontSize: 14, color: INK, lineHeight: 20 },
  answerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: 'rgba(10,10,10,0.08)' },
  answerLetter: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  answerLetterOnTxt: { fontFamily: 'Poppins_700Bold', fontSize: 12, color: '#fff' },
  answerTxt: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: INK },
  tutorUserBubble: { alignSelf: 'flex-end', backgroundColor: SKY_BG, borderRadius: 14, borderBottomRightRadius: 4, paddingVertical: 8, paddingHorizontal: 12, marginTop: 12, maxWidth: '70%' },
  tutorUserTxt: { fontFamily: 'Poppins_500Medium', fontSize: 13, color: SKY_DEEP },

  // Tutor recap card (parent feedback view shown to onboarder)
  recapCard: { backgroundColor: '#EDE3FF', borderRadius: 18, borderWidth: 1, borderColor: 'rgba(107,53,217,0.18)', padding: 16 },
  recapHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  recapName: { fontFamily: 'Poppins_700Bold', fontSize: 14, color: INK },
  recapTopic: { fontFamily: 'Poppins_800ExtraBold', fontSize: 19, color: INK, letterSpacing: -0.3, lineHeight: 24 },
  recapMeta: { fontFamily: 'Poppins_500Medium', fontSize: 12, color: INK4, marginTop: 4, marginBottom: 12 },
  statsGrid: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  statBox: { flex: 1, backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 6, alignItems: 'center' },
  statNum: { fontFamily: 'Poppins_800ExtraBold', fontSize: 20, color: INK, letterSpacing: -0.4, lineHeight: 22 },
  statLbl: { fontFamily: 'Poppins_700Bold', fontSize: 8, letterSpacing: 0.4, color: INK4, textTransform: 'uppercase', marginTop: 4, textAlign: 'center' },
  summaryBlock: { backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 12, padding: 12 },
  summaryHdr: { fontFamily: 'Poppins_700Bold', fontSize: 11, letterSpacing: 1, color: '#6B35D9', textTransform: 'uppercase', marginBottom: 6 },
  summaryBody: { fontFamily: 'Poppins_500Medium', fontSize: 13, color: INK, lineHeight: 19 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  tagPill: { backgroundColor: '#EDE3FF', borderRadius: 12, paddingVertical: 4, paddingHorizontal: 10 },
  tagPillTxt: { fontFamily: 'Poppins_700Bold', fontSize: 11, color: '#6B35D9' },
  extensionBadge: { alignSelf: 'flex-start', backgroundColor: 'rgba(107,53,217,0.12)', borderRadius: 8, paddingVertical: 4, paddingHorizontal: 8, marginTop: 8 },
  extensionBadgeTxt: { fontFamily: 'Poppins_700Bold', fontSize: 11, color: '#6B35D9' },

  // Life demo — photo card
  photoThumb: { borderRadius: 14, padding: 18, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(10,10,10,0.12)' },
  photoThumbTitle: { fontFamily: 'Poppins_700Bold', fontSize: 12, color: PEACH_DEEP, letterSpacing: 1, textTransform: 'uppercase' },
  photoThumbBody: { fontFamily: 'Poppins_500Medium', fontSize: 14, color: INK2, lineHeight: 22, marginTop: 10 },
  photoMeta: { fontFamily: 'Poppins_600SemiBold', fontSize: 11, color: INK4, marginTop: 10 },
  photoAnswer: { backgroundColor: SKY_BG, borderLeftWidth: 4, borderLeftColor: SKY_DEEP, borderRadius: 14, padding: 16, marginTop: 14 },
  photoAnswerTxt: { fontFamily: 'Poppins_500Medium', fontSize: 16, color: INK, lineHeight: 25 },
  photoActions: { flexDirection: 'row', gap: 6, marginTop: 10 },
  photoActBtn: { flex: 1, backgroundColor: 'rgba(10,10,10,0.06)', borderRadius: 10, paddingVertical: 9, alignItems: 'center' },
  photoActBtnTxt: { fontFamily: 'Poppins_700Bold', fontSize: 12, color: '#fff' },

  // Brief preview
  briefEyebrow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 4, marginTop: 8 },
  briefBubble: { backgroundColor: '#FDF1E5', borderRadius: 18, borderBottomLeftRadius: 6, paddingVertical: 16, paddingHorizontal: 18, marginTop: 4 },
  briefPill: { alignSelf: 'flex-start', backgroundColor: PEACH, paddingVertical: 3, paddingHorizontal: 10, borderRadius: 10, marginBottom: 10 },
  briefPillTxt: { fontFamily: 'Poppins_700Bold', fontSize: 10, letterSpacing: 0.6, color: PEACH_DEEP },
  briefText: { fontFamily: 'Poppins_400Regular', fontSize: 17, color: INK, lineHeight: 26 },
  briefChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 8 },
  briefChip: { borderWidth: 1.5, borderColor: 'rgba(10,10,10,0.14)', borderRadius: 20, paddingVertical: 6, paddingHorizontal: 13, backgroundColor: '#fff' },
  briefChipTxt: { fontFamily: 'Poppins_600SemiBold', fontSize: 12, color: 'rgba(10,10,10,0.55)' },
  briefChipPri: { backgroundColor: CORAL_SOFT, borderColor: '#F5C2BA' },
  briefChipPriTxt: { fontFamily: 'Poppins_600SemiBold', fontSize: 12, color: CORAL_DEEP },

  // Dashboard preview (old, inline card — kept for reuse but unused on Step 12 now)
  dashCard: { backgroundColor: CARD, borderRadius: 18, borderWidth: 1, borderColor: BORDER, padding: 4, paddingTop: 14, overflow: 'hidden' },
  dashRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(10,10,10,0.05)' },
  dashIcon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  dashName: { fontFamily: 'Poppins_700Bold', fontSize: 14, color: INK },
  dashSub: { fontFamily: 'Poppins_500Medium', fontSize: 12, color: INK4, marginTop: 1 },

  // Swipe-right hint (on Page A of the step-12 paging scroll)
  swipeHint: { flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: 'center', backgroundColor: SKY_BG, borderWidth: 1, borderColor: SKY, borderRadius: 22, paddingVertical: 10, paddingHorizontal: 18, marginTop: 12 },
  swipeHintArrow: { fontFamily: 'Poppins_800ExtraBold', fontSize: 20, color: SKY_DEEP },
  swipeHintTxt: { fontFamily: 'Poppins_700Bold', fontSize: 13, color: SKY_DEEP, letterSpacing: 0.4 },

  // Dashboard page (Page B of step 12 paging) — mirrors the real app Dashboard
  dashHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: BORDER, backgroundColor: BG },
  dashHeaderWord: { fontFamily: 'Poppins_800ExtraBold', fontSize: 36, letterSpacing: -1.4, lineHeight: 40, color: INK },
  dashHeaderDate: { fontFamily: 'Poppins_700Bold', fontSize: 14, color: INK2 },
  dashSwipeHint: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', backgroundColor: '#FEF3C7', borderRadius: 14, paddingVertical: 8, paddingHorizontal: 12, marginBottom: 16 },
  dashSwipeHintArrow: { fontFamily: 'Poppins_800ExtraBold', fontSize: 16, color: '#92400E' },
  dashSwipeHintTxt: { fontFamily: 'Poppins_600SemiBold', fontSize: 12, color: '#92400E' },

  // Real-look dashboard cards
  realDashCard: { borderRadius: 22, padding: 22, marginBottom: 10 },
  realDashHeadRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  realDashLabel: { fontFamily: 'Poppins_700Bold', fontSize: 13, letterSpacing: 0.8 },
  realDashAddBtn: { backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14 },
  realDashAddTxt: { fontFamily: 'Poppins_700Bold', fontSize: 12, color: '#fff' },
  realDashHeadline: { fontFamily: 'Poppins_800ExtraBold', fontSize: 26, letterSpacing: -0.8, lineHeight: 30, marginTop: 6 },
  realDashSub: { fontFamily: 'Poppins_500Medium', fontSize: 13, marginTop: 8 },

  // Bento row (Weather + Zaeli Noticed)
  bentoRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  bentoCard: { borderRadius: 22, padding: 18 },
  bentoLabel: { fontFamily: 'Poppins_700Bold', fontSize: 11, letterSpacing: 0.8 },
  bentoEmoji: { fontSize: 32, marginTop: 8 },
  bentoTemp: { fontFamily: 'Poppins_800ExtraBold', fontSize: 28, letterSpacing: -0.8, lineHeight: 32, marginTop: 4 },
  bentoSub: { fontFamily: 'Poppins_500Medium', fontSize: 12, marginTop: 8, lineHeight: 17 },
  bentoNotices: { fontFamily: 'Poppins_800ExtraBold', fontSize: 22, letterSpacing: -0.5, lineHeight: 26, marginTop: 8 },

  // Ready
  readyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 14, overflow: 'hidden' },
  readyStar: { fontSize: 60, color: CORAL, marginBottom: 4 },
  readyTitle: { fontFamily: 'Poppins_800ExtraBold', fontSize: 42, letterSpacing: -1.2, lineHeight: 48, color: INK, textAlign: 'center' },
  readySub: { fontFamily: 'Poppins_400Regular', fontSize: 15, color: INK3, textAlign: 'center', lineHeight: 23, maxWidth: 300, marginTop: 6 },
  readyCta: { backgroundColor: INK, paddingVertical: 16, paddingHorizontal: 48, borderRadius: 32, marginTop: 24 },
  readyCtaTxt: { fontFamily: 'Poppins_700Bold', fontSize: 16, color: '#fff' },
  readyFine: { fontFamily: 'Poppins_500Medium', fontSize: 12, color: INK4, marginTop: 12 },

  // Chat bar (decorative)
  // (ChatBar styles removed — onboarding has no fake chat bar)
});
