/**
 * ZaeliFAB.tsx — Zaeli Floating Action Bar
 * v5 · Phase 1 · 4 April 2026
 *
 * The only navigation element in the app.
 * Present on every screen, always, in the same position.
 *
 * Contains:
 *   - Four-button FAB bar (Dashboard · Chat · Mic · More)
 *   - More overlay (3×3 grid, SVG icons, palette bg, full backdrop blur)
 *   - Mic v2 pill (animated waveform, listening label, cancel)
 *
 * Usage:
 *   <ZaeliFAB
 *     activeButton="dashboard"
 *     onDashboard={() => router.navigate('/(tabs)/dashboard')}
 *     onChat={() => router.navigate('/(tabs)/')}
 *     onChatKeyboard={() => inputRef.current?.focus()}
 *     onMoreItem={(item) => handleMoreItem(item)}
 *     onMicResult={(text) => handleVoiceInput(text)}
 *   />
 *
 * Props:
 *   activeButton  — which button shows as active (dark bg)
 *                   'dashboard' | 'chat' | 'keyboard' | null
 *   onDashboard   — called when Dashboard button tapped
 *   onChat        — called when Chat button tapped (first tap = navigate)
 *   onChatKeyboard — called when Chat tapped while already on chat (second tap = keyboard)
 *   onMoreItem    — called with item key when More grid item tapped
 *   onMicResult   — called with transcribed text after voice recording
 *
 * Notes:
 *   - More overlay and Mic pill are fully self-contained (no props needed)
 *   - position:absolute + zIndex:999 — sits above all content
 *   - Mic uses expo-av for recording + OpenAI Whisper for transcription
 *   - No chat input bar anywhere — this IS the input surface
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal,
  Animated, Easing, Platform, Alert,
} from 'react-native';
import Svg, { Path, Line, Rect, Circle, Polyline } from 'react-native-svg';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';

// ── Constants ───────────────────────────────────────────────────────────────
const INK    = '#0A0A0A';
const CORAL  = '#FF4545';
const CREAM  = '#FAF8F5';

const GPT_MINI_KEY = process.env.EXPO_PUBLIC_OPENAI_KEY ?? '';

// ── More grid items (3×3, Settings always bottom-right) ────────────────────
const MORE_ITEMS = [
  { key:'notes',    label:'Notes',    color:'#5C8A3C', bg:'rgba(92,138,60,0.10)' },
  { key:'kids',     label:'Kids Hub', color:'#0A8A5A', bg:'rgba(10,138,90,0.10)' },
  { key:'tutor',    label:'Tutor',    color:'#6B35D9', bg:'rgba(107,53,217,0.10)' },
  { key:'travel',   label:'Travel',   color:'#0096C7', bg:'rgba(0,150,199,0.10)' },
  { key:'family',   label:'Family',   color:'#D4006A', bg:'rgba(212,0,106,0.10)' },
  { key:'meals',    label:'Meals',    color:'#E8601A', bg:'rgba(232,96,26,0.10)' },
  { key:'pulse',    label:'Pulse',    color:'#FF4545', bg:'rgba(255,69,69,0.10)' },
  { key:'zen',      label:'Zen',      color:'#5C8A3C', bg:'rgba(92,138,60,0.08)' },
  { key:'settings', label:'Settings', color:'#6B7280', bg:'rgba(107,114,128,0.10)' },
];

// ── Types ───────────────────────────────────────────────────────────────────
type ActiveButton = 'dashboard' | 'chat' | 'keyboard' | null;

interface ZaeliFABProps {
  activeButton:    ActiveButton;
  onDashboard:     () => void;
  onChat:          () => void;
  onChatKeyboard?: () => void;  // called when chat btn tapped while already on chat
  onMoreItem?:     (itemKey: string) => void;
  onMicResult?:    (text: string) => void;
}

// ── SVG Icon components (thin stroke, FAB weight) ───────────────────────────

function IcoDash({ color = INK }: { color?: string }) {
  return (
    <Svg width="26" height="26" viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <Rect x="3" y="3" width="7" height="7" rx="1.5"/>
      <Rect x="14" y="3" width="7" height="7" rx="1.5"/>
      <Rect x="3" y="14" width="7" height="7" rx="1.5"/>
      <Rect x="14" y="14" width="7" height="7" rx="1.5"/>
    </Svg>
  );
}

function IcoChat({ color = INK }: { color?: string }) {
  return (
    <Svg width="26" height="26" viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
    </Svg>
  );
}

function IcoMicSvg({ color = INK }: { color?: string }) {
  return (
    <Svg width="26" height="26" viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/>
      <Path d="M19 10v2a7 7 0 01-14 0v-2"/>
      <Line x1="12" y1="19" x2="12" y2="23"/>
      <Line x1="8" y1="23" x2="16" y2="23"/>
    </Svg>
  );
}

function IcoMore({ color = INK }: { color?: string }) {
  return (
    <Svg width="26" height="26" viewBox="0 0 24 24" fill={color} stroke={color} strokeWidth="0">
      <Circle cx="5" cy="12" r="1.6"/>
      <Circle cx="12" cy="12" r="1.6"/>
      <Circle cx="19" cy="12" r="1.6"/>
    </Svg>
  );
}

// More grid SVG icons — same thin weight as FAB
function IcoNotes({ color }: { color: string }) {
  return (
    <Svg width="26" height="26" viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
      <Polyline points="14 2 14 8 20 8"/>
      <Line x1="16" y1="13" x2="8" y2="13"/>
      <Line x1="16" y1="17" x2="8" y2="17"/>
    </Svg>
  );
}

function IcoKids({ color }: { color: string }) {
  return (
    <Svg width="26" height="26" viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z"/>
      <Path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/>
      <Line x1="12" y1="12" x2="12" y2="16"/>
      <Line x1="10" y1="14" x2="14" y2="14"/>
    </Svg>
  );
}

function IcoTutor({ color }: { color: string }) {
  return (
    <Svg width="26" height="26" viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/>
      <Path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/>
    </Svg>
  );
}

function IcoTravel({ color }: { color: string }) {
  return (
    <Svg width="26" height="26" viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 2L2 7l10 5 10-5-10-5z"/>
      <Path d="M2 17l10 5 10-5"/>
      <Path d="M2 12l10 5 10-5"/>
    </Svg>
  );
}

function IcoFamily({ color }: { color: string }) {
  return (
    <Svg width="26" height="26" viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
      <Circle cx="9" cy="7" r="4"/>
      <Path d="M23 21v-2a4 4 0 00-3-3.87"/>
      <Path d="M16 3.13a4 4 0 010 7.75"/>
    </Svg>
  );
}

function IcoMeals({ color }: { color: string }) {
  return (
    <Svg width="26" height="26" viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2"/>
      <Path d="M7 2v20"/>
      <Path d="M21 15V2a5 5 0 00-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/>
    </Svg>
  );
}

function IcoPulse({ color }: { color: string }) {
  return (
    <Svg width="26" height="26" viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <Polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </Svg>
  );
}

function IcoZen({ color }: { color: string }) {
  return (
    <Svg width="26" height="26" viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="12" cy="12" r="10"/>
      <Path d="M8 14s1.5 2 4 2 4-2 4-2"/>
      <Line x1="9" y1="9" x2="9.01" y2="9"/>
      <Line x1="15" y1="9" x2="15.01" y2="9"/>
    </Svg>
  );
}

function IcoSettings({ color }: { color: string }) {
  return (
    <Svg width="26" height="26" viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="12" cy="12" r="3"/>
      <Path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
    </Svg>
  );
}

function MoreIcon({ itemKey, color }: { itemKey: string; color: string }) {
  const props = { color, size: 26 };
  switch (itemKey) {
    case 'notes':    return <IcoNotes color={color}/>;
    case 'kids':     return <IcoKids color={color}/>;
    case 'tutor':    return <IcoTutor color={color}/>;
    case 'travel':   return <IcoTravel color={color}/>;
    case 'family':   return <IcoFamily color={color}/>;
    case 'meals':    return <IcoMeals color={color}/>;
    case 'pulse':    return <IcoPulse color={color}/>;
    case 'zen':      return <IcoZen color={color}/>;
    case 'settings': return <IcoSettings color={color}/>;
    default:         return <IcoNotes color={color}/>;
  }
}

// ── Animated waveform bars ──────────────────────────────────────────────────
const WAVE_HEIGHTS = [10, 18, 28, 36, 28, 18, 10];

function WaveformBars() {
  const anims = useRef(WAVE_HEIGHTS.map(() => new Animated.Value(0.35))).current;

  useEffect(() => {
    const animations = anims.map((anim, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 100),
          Animated.timing(anim, {
            toValue: 1,
            duration: 400,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0.35,
            duration: 400,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      )
    );
    animations.forEach(a => a.start());
    return () => animations.forEach(a => a.stop());
  }, []);

  return (
    <View style={styles.waveRow}>
      {WAVE_HEIGHTS.map((h, i) => (
        <Animated.View
          key={i}
          style={[
            styles.waveBar,
            { height: h, transform: [{ scaleY: anims[i] }] },
          ]}
        />
      ))}
    </View>
  );
}

// ── Main component ──────────────────────────────────────────────────────────
export default function ZaeliFAB({
  activeButton,
  onDashboard,
  onChat,
  onChatKeyboard,
  onMoreItem,
  onMicResult,
}: ZaeliFABProps) {

  const [moreOpen, setMoreOpen]     = useState(false);
  const [micActive, setMicActive]   = useState(false);
  const [recording, setRecording]   = useState<Audio.Recording | null>(null);

  // More overlay animated values
  const moreScale   = useRef(new Animated.Value(0.90)).current;
  const moreOpacity = useRef(new Animated.Value(0)).current;

  // Mic pill animated values
  const micScale    = useRef(new Animated.Value(0.92)).current;
  const micOpacity  = useRef(new Animated.Value(0)).current;

  // ── More overlay animation ──────────────────────────────────────────────
  function openMore() {
    setMoreOpen(true);
    Animated.parallel([
      Animated.timing(moreOpacity, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.spring(moreScale,   { toValue: 1, tension: 200, friction: 20, useNativeDriver: true }),
    ]).start();
  }

  function closeMore() {
    Animated.parallel([
      Animated.timing(moreOpacity, { toValue: 0, duration: 160, useNativeDriver: true }),
      Animated.timing(moreScale,   { toValue: 0.90, duration: 160, useNativeDriver: true }),
    ]).start(() => setMoreOpen(false));
  }

  function toggleMore() {
    moreOpen ? closeMore() : openMore();
  }

  function handleMoreItem(key: string) {
    closeMore();
    setTimeout(() => onMoreItem?.(key), 180);
  }

  // ── Mic animation ───────────────────────────────────────────────────────
  function showMicPill() {
    setMicActive(true);
    Animated.parallel([
      Animated.timing(micOpacity, { toValue: 1, duration: 200, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.spring(micScale,   { toValue: 1, tension: 200, friction: 20, useNativeDriver: true }),
    ]).start();
  }

  function hideMicPill() {
    Animated.parallel([
      Animated.timing(micOpacity, { toValue: 0, duration: 160, useNativeDriver: true }),
      Animated.timing(micScale,   { toValue: 0.92, duration: 160, useNativeDriver: true }),
    ]).start(() => setMicActive(false));
  }

  // ── Mic recording ───────────────────────────────────────────────────────
  async function startMic() {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        Alert.alert('Microphone permission needed', 'Please allow microphone access in settings.');
        return;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const { recording: rec } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(rec);
      showMicPill();
    } catch (e) {
      console.error('Mic start error:', e);
    }
  }

  async function stopMic() {
    if (!recording) return;
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      hideMicPill();

      if (!uri) return;

      // Transcribe with Whisper
      const formData = new FormData();
      formData.append('file', { uri, type: 'audio/m4a', name: 'recording.m4a' } as any);
      formData.append('model', 'whisper-1');
      formData.append('language', 'en');

      const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${GPT_MINI_KEY}` },
        body: formData,
      });
      const json = await res.json();
      const text = json.text?.trim() ?? '';
      if (text) onMicResult?.(text);

    } catch (e) {
      console.error('Mic stop error:', e);
      hideMicPill();
    }
  }

  async function cancelMic() {
    if (recording) {
      try {
        await recording.stopAndUnloadAsync();
      } catch (_) {}
      setRecording(null);
    }
    hideMicPill();
  }

  function handleMicPress() {
    if (micActive) {
      stopMic();
    } else {
      startMic();
    }
  }

  // ── Button colours ──────────────────────────────────────────────────────
  const dashActive = activeButton === 'dashboard';
  const chatActive = activeButton === 'chat';
  const kbActive   = activeButton === 'keyboard';
  const micIsOn    = micActive;

  const dashBg    = dashActive ? INK    : 'transparent';
  const dashColor = dashActive ? '#fff' : 'rgba(10,10,10,0.48)';

  const chatBg    = chatActive || kbActive ? (kbActive ? CORAL : INK)    : 'transparent';
  const chatColor = chatActive || kbActive ? '#fff' : 'rgba(10,10,10,0.48)';

  const micBg     = micIsOn ? CORAL : 'transparent';
  const micColor  = micIsOn ? '#fff' : 'rgba(10,10,10,0.48)';

  // ── Chat button handler ─────────────────────────────────────────────────
  function handleChatPress() {
    if (chatActive || kbActive) {
      // Already on chat — second tap opens keyboard
      onChatKeyboard?.();
    } else {
      onChat();
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <View style={styles.root} pointerEvents="box-none">

      {/* ── More backdrop (full screen, behind card) ── */}
      {moreOpen && (
        <TouchableOpacity
          style={styles.moreBackdrop}
          activeOpacity={1}
          onPress={closeMore}
        />
      )}

      {/* ── More card (floats above FAB) ── */}
      {moreOpen && (
        <Animated.View
          style={[
            styles.moreCard,
            { opacity: moreOpacity, transform: [{ scale: moreScale }] },
          ]}
          pointerEvents="box-none"
        >
          <Text style={styles.moreLabel}>More</Text>
          <View style={styles.moreGrid}>
            {MORE_ITEMS.map(item => (
              <TouchableOpacity
                key={item.key}
                style={styles.moreItem}
                onPress={() => handleMoreItem(item.key)}
                activeOpacity={0.75}
              >
                <View style={[styles.moreIcon, { backgroundColor: item.bg }]}>
                  <MoreIcon itemKey={item.key} color={item.color}/>
                </View>
                <Text style={styles.moreItemLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      )}

      {/* ── Mic v2 pill (floats above FAB) ── */}
      {micActive && (
        <Animated.View
          style={[
            styles.micPill,
            { opacity: micOpacity, transform: [{ scale: micScale }] },
          ]}
          pointerEvents="box-none"
        >
          <WaveformBars/>
          <Text style={styles.micLabel}>Listening…</Text>
          <TouchableOpacity
            style={styles.micCancel}
            onPress={cancelMic}
            activeOpacity={0.75}
          >
            <Text style={styles.micCancelText}>Cancel</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* ── FAB bar ── */}
      <View style={styles.fab}>

        {/* Dashboard */}
        <TouchableOpacity
          style={[styles.fabBtn, { backgroundColor: dashBg }]}
          onPress={onDashboard}
          activeOpacity={0.75}
        >
          <IcoDash color={dashColor}/>
        </TouchableOpacity>

        <View style={styles.fabSep}/>

        {/* Chat */}
        <TouchableOpacity
          style={[styles.fabBtn, { backgroundColor: chatBg }]}
          onPress={handleChatPress}
          activeOpacity={0.75}
        >
          <IcoChat color={chatColor}/>
        </TouchableOpacity>

        {/* Mic */}
        <TouchableOpacity
          style={[styles.fabBtn, { backgroundColor: micBg }]}
          onPress={handleMicPress}
          activeOpacity={0.75}
        >
          <IcoMicSvg color={micColor}/>
        </TouchableOpacity>

        <View style={styles.fabSep}/>

        {/* More */}
        <TouchableOpacity
          style={[styles.fabBtn, moreOpen ? { backgroundColor: CORAL } : {}]}
          onPress={toggleMore}
          activeOpacity={0.75}
        >
          <IcoMore color={moreOpen ? '#fff' : 'rgba(10,10,10,0.48)'}/>
        </TouchableOpacity>

      </View>
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────
// FAB_WIDTH: fixed width — mic pill and more card match this exactly
const FAB_BTN    = 58;   // each button square
const FAB_PAD    = 10;   // internal padding each side
const FAB_SEP_W  = 1;
const FAB_SEP_MX = 8;    // margin around separators — adds width
const FAB_GAP    = 4;
// (66×4) + (10×2) + (1×2) + (8×4) + (4×3) = 264+20+2+32+12 = 330
const FAB_WIDTH  = FAB_BTN * 4 + FAB_PAD * 2 + FAB_SEP_W * 2 + FAB_SEP_MX * 4 + FAB_GAP * 3;

const styles = StyleSheet.create({

  // Root — fills screen, pointer-events passthrough except our elements
  root: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
    zIndex: 999,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: Platform.OS === 'ios' ? 24 : 14,
  },

  // ── FAB bar ──
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: FAB_GAP,
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderRadius: 36,
    padding: FAB_PAD,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.98)',
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 10 },
    elevation: 14,
  },

  fabBtn: {
    width: FAB_BTN,
    height: FAB_BTN,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },

  fabSep: {
    width: FAB_SEP_W,
    height: 32,
    backgroundColor: 'rgba(10,10,10,0.08)',
    marginHorizontal: FAB_SEP_MX,
  },

  // ── More backdrop ──
  moreBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(10,10,10,0.36)',
  },

  // ── More card — matches FAB width exactly ──
  moreCard: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 124 : 110,
    width: FAB_WIDTH,
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderRadius: 36,
    paddingHorizontal: 18,
    paddingTop: 26,
    paddingBottom: 22,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 16 },
    elevation: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,1)',
  },

  moreLabel: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: 'rgba(10,10,10,0.20)',
    textAlign: 'center',
    marginBottom: 20,
  },

  moreGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 4,
  },

  moreItem: {
    width: '31%',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 2,
    borderRadius: 16,
  },

  moreIcon: {
    width: 58,
    height: 58,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  moreItemLabel: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 11,
    color: 'rgba(10,10,10,0.42)',
    textAlign: 'center',
    lineHeight: 14,
  },

  // ── Mic pill — same width and radius as FAB ──
  micPill: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 124 : 110,
    width: FAB_WIDTH,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 36,
    paddingVertical: FAB_PAD,
    paddingHorizontal: 24,
    minHeight: FAB_BTN + FAB_PAD * 2,
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 10 },
    elevation: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.98)',
  },

  micLabel: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: 'rgba(10,10,10,0.50)',
    flex: 1,
  },

  micCancel: {
    backgroundColor: 'rgba(255,69,69,0.09)',
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },

  micCancelText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 13,
    color: CORAL,
  },

  // ── Waveform ──
  waveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },

  waveBar: {
    width: 4,
    backgroundColor: CORAL,
    borderRadius: 2,
  },
});
