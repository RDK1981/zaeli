/**
 * voice-overlay.tsx — First-session voice entry point
 * Stop → Whisper → navigate immediately to zaeli-chat with seedMessage.
 * No GPT call here. zaeli-chat handles the response entirely.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Easing, Platform,
} from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Svg, { Path, Rect, Line } from 'react-native-svg';
import { Audio } from 'expo-av';

// ── Constants ──────────────────────────────────────────────────
const BG    = '#FAF8F5';
const INK   = '#0A0A0A';
const INK2  = 'rgba(10,10,10,0.45)';
const INK3  = 'rgba(10,10,10,0.28)';
const CORAL = '#FF4545';
const BORDER = 'rgba(10,10,10,0.08)';

// ── Mic SVG ────────────────────────────────────────────────────
function IcoMic({ color = INK3, size = 22 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <Rect x="9" y="2" width="6" height="11" rx="3"/>
      <Path d="M5 10a7 7 0 0014 0"/>
      <Line x1="12" y1="19" x2="12" y2="23"/>
      <Line x1="8" y1="23" x2="16" y2="23"/>
    </Svg>
  );
}

// ── Waveform bars ──────────────────────────────────────────────
function WaveformBars() {
  const anims = useRef(
    Array.from({ length: 5 }, (_, i) => new Animated.Value(0.3 + i * 0.08))
  ).current;

  useEffect(() => {
    const loops = anims.map((anim, i) => {
      const minH = 0.15 + i * 0.05;
      const maxH = 0.65 + (i % 3) * 0.18;
      const spd  = 180 + i * 55;
      return Animated.loop(Animated.sequence([
        Animated.timing(anim, { toValue: maxH, duration: spd, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(anim, { toValue: minH, duration: spd + 40, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]));
    });
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, []);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
      {anims.map((anim, i) => (
        <Animated.View key={i} style={{
          width: 4.5, height: 22, borderRadius: 3,
          backgroundColor: '#fff', transform: [{ scaleY: anim }],
        }} />
      ))}
    </View>
  );
}

// ── Typing dots ────────────────────────────────────────────────
function TypingDots() {
  const dots = useRef([0, 1, 2].map(() => new Animated.Value(0.3))).current;
  useEffect(() => {
    const anims = dots.map((d, i) =>
      Animated.loop(Animated.sequence([
        Animated.delay(i * 150),
        Animated.timing(d, { toValue: 1, duration: 280, easing: Easing.ease, useNativeDriver: true }),
        Animated.timing(d, { toValue: 0.3, duration: 280, easing: Easing.ease, useNativeDriver: true }),
        Animated.delay(450 - i * 150),
      ]))
    );
    anims.forEach(a => a.start());
    return () => anims.forEach(a => a.stop());
  }, []);
  return (
    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
      {dots.map((op, i) => (
        <Animated.View key={i} style={{
          width: 8, height: 8, borderRadius: 4,
          backgroundColor: CORAL, opacity: op,
        }} />
      ))}
    </View>
  );
}

// ── Component ─────────────────────────────────────────────────
type Stage = 'listening' | 'processing';

export default function VoiceOverlayScreen() {
  const router = useRouter();

  const [stage, setStage] = useState<Stage>('listening');
  const recordingRef      = useRef<Audio.Recording | null>(null);
  const stageRef          = useRef<Stage>('listening');
  const fadeAnim          = useRef(new Animated.Value(0)).current;

  function updateStage(s: Stage) { stageRef.current = s; setStage(s); }

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    startRecording();
    return () => { recordingRef.current?.stopAndUnloadAsync().catch(() => {}); };
  }, []);

  async function startRecording() {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) { router.back(); return; }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      recordingRef.current = recording;
      updateStage('listening');
    } catch (e) {
      console.error('Record start failed:', e);
      router.back();
    }
  }

  async function handleStop() {
    if (stageRef.current !== 'listening') return;
    updateStage('processing');

    let transcribed = '';
    try {
      if (recordingRef.current) {
        await recordingRef.current.stopAndUnloadAsync();
        const uri = recordingRef.current.getURI();
        recordingRef.current = null;
        if (uri) transcribed = await transcribeWithWhisper(uri);
      }
    } catch (e) {
      console.error('Stop/transcribe failed:', e);
    }

    if (!transcribed.trim()) {
      // Nothing captured — go back silently
      router.back();
      return;
    }

    // Navigate immediately to zaeli-chat — it handles GPT response
    router.replace({
      pathname: '/(tabs)/zaeli-chat',
      params: {
        channel: 'general',
        returnTo: '/(tabs)/',
        seedMessage: transcribed,
      },
    });
  }

  async function transcribeWithWhisper(uri: string): Promise<string> {
    try {
      const key = process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? '';
      if (!key) return '';
      const form = new FormData();
      form.append('file', { uri, type: 'audio/m4a', name: 'voice.m4a' } as any);
      form.append('model', 'whisper-1');
      form.append('language', 'en');
      const res  = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}` },
        body: form,
      });
      const json = await res.json();
      return json.text ?? '';
    } catch (e) {
      console.error('Whisper failed:', e);
      return '';
    }
  }

  function handleClose() {
    recordingRef.current?.stopAndUnloadAsync().catch(() => {});
    router.back();
  }

  return (
    <View style={s.root}>
      <ExpoStatusBar style="dark" />
      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>

        {/* Close */}
        <TouchableOpacity style={s.closeBtn} onPress={handleClose} activeOpacity={0.7}>
          <Text style={s.closeTxt}>✕</Text>
        </TouchableOpacity>

        {/* Centre */}
        <Animated.View style={[s.centre, { opacity: fadeAnim }]}>
          <Text style={s.title}>Chat with Zaeli</Text>

          {stage === 'listening' && (
            <Text style={s.hint}>Start talking…</Text>
          )}

          {stage === 'processing' && (
            <View style={s.thinkingRow}>
              <Text style={s.thinkingLabel}>Transcribing</Text>
              <TypingDots />
            </View>
          )}
        </Animated.View>

        {/* Bottom bar */}
        <View style={s.bottomBar}>
          {stage === 'listening' ? (
            <View style={s.barRow}>
              <View style={{ width: 44 }} />
              <View style={s.micCircle}>
                <IcoMic color="rgba(10,10,10,0.25)" size={20} />
              </View>
              {/* Stop pill with waveform */}
              <TouchableOpacity style={s.stopPill} onPress={handleStop} activeOpacity={0.85}>
                <WaveformBars />
                <Text style={s.stopTxt}>Stop</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={s.barRow}>
              <View style={{ width: 44 }} />
              <View style={s.micCircle}>
                <IcoMic color="rgba(10,10,10,0.12)" size={20} />
              </View>
              <View style={[s.stopPill, { opacity: 0.4 }]}>
                <Text style={s.stopTxt}>Processing…</Text>
              </View>
            </View>
          )}
        </View>

      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  safe: { flex: 1 },
  closeBtn: {
    position: 'absolute', top: 56, right: 22, zIndex: 20,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(10,10,10,0.06)',
    alignItems: 'center', justifyContent: 'center',
  },
  closeTxt: { fontSize: 14, color: INK3 },
  centre: {
    flex: 1, paddingHorizontal: 28,
    alignItems: 'center', justifyContent: 'center',
  },
  title: {
    fontFamily: 'DMSerifDisplay_400Regular',
    fontSize: 40, color: INK, letterSpacing: -1.2,
    textAlign: 'center', marginBottom: 20,
  },
  hint: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 16, color: INK3, textAlign: 'center',
  },
  thinkingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  thinkingLabel: {
    fontFamily: 'Poppins_400Regular', fontSize: 15, color: INK3,
  },
  bottomBar: {
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 12 : 18,
    paddingTop: 10,
  },
  barRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  micCircle: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(10,10,10,0.05)',
    alignItems: 'center', justifyContent: 'center',
  },
  stopPill: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: INK,
    borderRadius: 32, paddingVertical: 14, paddingHorizontal: 22,
  },
  stopTxt: { fontFamily: 'Poppins_700Bold', fontSize: 15, color: '#fff' },
});
