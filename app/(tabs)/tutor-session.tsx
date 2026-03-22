/**
 * Tutor Session Screen — Homework Help
 * app/(tabs)/tutor-session.tsx
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, StatusBar as RNStatusBar,
  ActivityIndicator, Alert, Image, Animated, Clipboard, Share,
} from 'react-native';
import Svg, { Path, Rect, Polygon, Polyline, Line, Circle } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Audio } from 'expo-av';
import { supabase } from '../../lib/supabase';
import { callClaude } from '../../lib/api-logger';

// ── Constants ─────────────────────────────────────────────────
const FAMILY_ID  = '00000000-0000-0000-0000-000000000001';
const T_DARK     = '#1A1A2E';
const HW_INDIGO  = '#1A5F7A';   // Homework Help — deep teal
const T_GOLD     = '#C9A84C';
const T_GOLD2    = '#B8963E';
const T_GOLDL    = 'rgba(201,168,76,0.08)';
const BLUE       = '#0057FF';
const MAG        = '#E0007C';
const INK        = '#0A0A0A';
const INK2       = 'rgba(10,10,10,0.45)';
const INK3       = 'rgba(10,10,10,0.18)';
const BORDER     = 'rgba(0,0,0,0.07)';
const BG         = '#F4F6FA';
const CARD       = '#FFFFFF';
const GPT_MODEL  = 'gpt-5.4-mini';

const ICON_SIZE   = 18;
const ICON_STROKE = 1.8;
const ICON_COLOR  = 'rgba(0,0,0,0.40)';

// ── Detect real image format from base64 magic bytes ──────────
// expo-image-picker mimeType can return 'image/jpg' (invalid for Claude)
// or undefined. Reading the actual bytes is the only reliable approach.
// HEIC files start with AAAAJGZ0eXBoZWlj — Claude cannot process these.
function getMediaType(base64: string): 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' {
  if (!base64) return 'image/jpeg';
  // Strip data URI prefix if present
  const raw = base64.replace(/^data:image\/[^;]+;base64,/, '');
  if (raw.startsWith('/9j/'))       return 'image/jpeg';
  if (raw.startsWith('iVBORw0K'))  return 'image/png';
  if (raw.startsWith('R0lGOD'))    return 'image/gif';
  if (raw.startsWith('UklGR'))     return 'image/webp';
  // HEIC/HEIF — Apple format, not supported by Claude
  // Magic bytes decode to ftyp box: AAAAJGZ0eXBoZWlj = ftypheic
  if (raw.startsWith('AAAAJ') || raw.startsWith('AAAAI')) return 'image/jpeg'; // will be caught by HEIC guard
  return 'image/jpeg';
}

function getOpenAIKey() { return process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? ''; }

async function logGpt(feature: string, usage: any) {
  const i = usage?.prompt_tokens ?? 0;
  const o = usage?.completion_tokens ?? 0;
  supabase.from('api_logs').insert({
    family_id: FAMILY_ID, feature, model: GPT_MODEL,
    input_tokens: i, output_tokens: o,
    cost_usd: parseFloat(((i * 0.75 + o * 4.50) / 1_000_000).toFixed(6)),
  }).then(({ error }) => { if (error) console.warn('log:', error.message); });
}

function buildSystemPrompt(childName: string, yearLevel: number, subject: string) {
  return `You are Zaeli, a warm encouraging AI tutor helping ${childName}, an Australian Year ${yearLevel} student.

ABSOLUTE RULES — never break these:
- NEVER state the answer to any calculation, question or problem. Not even as an example.
- NEVER complete any step for the child. Ask them to do every step themselves.
- If the child gives a CORRECT answer, confirm it warmly and move to the next step with a question.
- If the child gives a WRONG answer, say gently "not quite — let's think again" and give a hint without revealing the answer.
- Break every problem into the smallest possible steps. One step at a time.
- Always end with a question or prompt that moves them forward.
- Keep responses to 2-3 sentences maximum.
- Never start with "I". Australian English. Warm and encouraging.
- Do NOT use asterisks or markdown bold in your responses — plain text only.
${subject ? `Subject context: ${subject}` : ''}`;
}

interface Message { role: 'zaeli' | 'child'; content: string; imageUri?: string; }

export default function TutorSessionScreen() {
  const router    = useRouter();
  const params    = useLocalSearchParams<{ childId: string; childName: string; yearLevel: string; resumeSessionId?: string }>();
  const childName = params.childName ?? '';
  const yearLevel = parseInt(params.yearLevel ?? '5', 10);
  const childId   = params.childId ?? '';
  const resumeId  = params.resumeSessionId ?? null;

  const [messages, setMessages]   = useState<Message[]>([]);
  const [input, setInput]         = useState('');
  const [sending, setSending]     = useState(false);
  const [subject, setSubject]     = useState('');
  const [topic, setTopic]         = useState('');
  const [sessionId, setSessionId] = useState<string | null>(resumeId);
  const [recording, setRecording] = useState(false);
  const [audioRec, setAudioRec]   = useState<Audio.Recording | null>(null);
  const [saved, setSaved]         = useState(false);
  const [feedback, setFeedback]   = useState<Record<number, 'up'|'down'>>({});
  const savedOpacity              = useRef(new Animated.Value(0)).current;
  const startTimeRef = useRef(Date.now());
  const scrollRef    = useRef<ScrollView>(null);
  const micPulse     = useRef(new Animated.Value(1)).current;

  useFocusEffect(useCallback(() => {
    RNStatusBar.setBarStyle('light-content', true);
    // Reset state fresh on every focus so new sessions start clean
    setMessages([]);
    setInput('');
    setSubject('');
    setTopic('');
    setSessionId(resumeId);
    setFeedback({});
    startTimeRef.current = Date.now();
    if (resumeId) {
      loadSession(resumeId);
    } else {
      sendGreeting();
    }
  }, [resumeId]));
  useEffect(() => { setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100); }, [messages]);

  // ── GPT ──────────────────────────────────────────────────────
  async function callGPT(msgs: { role: string; content: string }[]): Promise<string> {
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getOpenAIKey()}` },
        body: JSON.stringify({ model: GPT_MODEL, max_completion_tokens: 300, messages: msgs }),
      });
      const json = await res.json();
      if (!res.ok) { console.error('[session] GPT error:', res.status, json?.error?.message); return ''; }
      logGpt('tutor_session', json.usage);
      return json.choices?.[0]?.message?.content ?? '';
    } catch (e) { console.error('[session] GPT fetch:', e); return ''; }
  }

  async function sendGreeting() {
    setSending(true);
    const reply = await callGPT([
      { role: 'system', content: buildSystemPrompt(childName, yearLevel, '') },
      { role: 'user',   content: `Give a brief warm 1-sentence greeting to ${childName} to start a homework session. Ask what they're working on today. Never start with "I".` },
    ]);
    if (reply) setMessages([{ role: 'zaeli', content: reply }]);
    setSending(false);
  }

  async function loadSession(id: string) {
    const { data } = await supabase
      .from('tutor_sessions')
      .select('messages, subject, topic')
      .eq('id', id)
      .single();
    if (data?.messages && Array.isArray(data.messages) && data.messages.length > 0) {
      setMessages(data.messages as Message[]);
      if (data.subject) setSubject(data.subject);
      if (data.topic)   setTopic(data.topic);
    } else {
      sendGreeting();
    }
  }

  // ── Send message ─────────────────────────────────────────────
  async function sendMessage() {
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    const updated: Message[] = [...messages, { role: 'child', content: text }];
    setMessages(updated);
    if (!subject && messages.length <= 2) detectSubject(text);
    setSending(true);
    const history = [
      { role: 'system', content: buildSystemPrompt(childName, yearLevel, subject) },
      ...updated.map(m => ({ role: m.role === 'zaeli' ? 'assistant' : 'user', content: m.content })),
    ];
    const reply = await callGPT(history);
    const final: Message[] = reply ? [...updated, { role: 'zaeli', content: reply }] : updated;
    setMessages(final);
    setSending(false);
    await saveSession(final);
  }

  // ── Send photo ───────────────────────────────────────────────
  async function sendPhoto() {
    Alert.alert('Add a photo', 'How would you like to add your photo?', [
      { text: 'Camera', onPress: () => doSendPhoto('camera') },
      { text: 'Photo Library', onPress: () => doSendPhoto('library') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  async function doSendPhoto(source: 'camera' | 'library') {
    try {
      let result;
      if (source === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) { Alert.alert('Permission needed', 'Please enable Camera access in Settings.'); return; }
        // allowsEditing forces transcoding to JPEG — prevents HEIC being sent to Claude
        result = await ImagePicker.launchCameraAsync({
          quality: 0.7,
          base64: true,
          exif: false,
          allowsEditing: false,
          mediaTypes: ['images'],
        });
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) { Alert.alert('Permission needed', 'Please enable Photo Library access in Settings.'); return; }
        // allowsEditing + mediaTypes forces Expo to transcode HEIC → JPEG
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.7,
          base64: true,
          exif: false,
          allowsEditing: false,
        });
      }
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];

      // Resize + compress to guarantee under Claude's 5MB limit
      // Max 1280px on longest side, quality 0.5 — plenty sharp for reading text
      const compressed = await ImageManipulator.manipulateAsync(
        asset.uri,
        [{ resize: { width: 1280 } }],
        { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );

      // Use compressed base64 — always JPEG from manipulateAsync, no HEIC risk
      const rawBase64 = (compressed.base64 ?? '').replace(/^data:image\/[^;]+;base64,/, '');
      console.log('[tutor-vision] base64 length after compress:', rawBase64.length, '| type:', getMediaType(rawBase64));

      const updated: Message[] = [...messages, { role: 'child', content: 'Here is a photo of my work.', imageUri: asset.uri }];
      setMessages(updated);
      setSending(true);

      // Step 1 — Claude Vision extracts content
      // Call fetch directly (not callClaude) — large base64 strings can be
      // corrupted when passed through the callClaude JSON.stringify wrapper.
      let desc = '';
      try {
        const API_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? '';
        const visionBody = {
          model: 'claude-sonnet-4-20250514',
          max_tokens: 800,
          messages: [{
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: getMediaType(rawBase64),
                  data: rawBase64,
                },
              },
              {
                type: 'text',
                text: `You are reading a homework photo for a Year ${yearLevel} Australian student.

CRITICAL EXTRACTION RULES:
1. Extract ALL mathematical content EXACTLY as written — every number, operator (÷ × + − = ( ) [ ]), fraction, equation, and blank line
2. Preserve the exact structure — if it's a numbered list of questions, list them all numbered
3. Do NOT interpret or solve — just transcribe faithfully
4. Note any handwritten working or answers the student has already written
5. If the image is unclear in any part, say exactly which part is unclear

Return your response in this format:
SUBJECT: [subject type]
QUESTIONS: [exact transcription of every question, numbered if applicable]
STUDENT_WORK: [any answers or working the student has written, or "none visible"]
CLARITY: [clear / partially unclear — describe what's hard to read]`,
              },
            ],
          }],
        };

        const vRes = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': API_KEY,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
          },
          body: JSON.stringify(visionBody),
        });

        const vData = await vRes.json();
        console.log('[tutor-vision] status:', vRes.status, '| response:', JSON.stringify(vData).substring(0, 200));

        if (!vRes.ok) {
          throw new Error(`Anthropic API ${vRes.status}: ${vData?.error?.message ?? 'unknown'}`);
        }

        desc = vData.content?.[0]?.text ?? '';
      } catch (vErr) {
        console.error('[tutor-vision] Claude Vision failed:', vErr);
        setMessages(prev => [...prev, { role: 'zaeli', content: `Hmm, I had trouble reading that photo — could you try uploading it again, or type out the question for me?` }]);
        setSending(false);
        return;
      }

      // Step 2 — GPT responds using the extraction
      try {
        const history = [
          { role: 'system', content: buildSystemPrompt(childName, yearLevel, subject) },
          ...updated.map(m => ({ role: m.role === 'zaeli' ? 'assistant' : 'user', content: m.content })),
          { role: 'user', content: `${childName} uploaded a photo of their homework. Here is exactly what I extracted from it:\n\n${desc}\n\nIMPORTANT INSTRUCTIONS:\n- Do NOT show the SUBJECT/QUESTIONS/STUDENT_WORK/CLARITY labels to ${childName} — those were for your internal use only\n- Start by naturally restating the first question in plain conversational language so ${childName} knows you read it correctly (e.g. "Ok, I can see question 1 is: 5 × (2 + 3 × 5) − 34")\n- Then ask one guiding question to get them started — what do they think should be solved first?\n- Never give the answer. One step at a time.` },
        ];
        const reply = await callGPT(history);
        console.log('[tutor-session] GPT reply:', reply);
        const final: Message[] = reply ? [...updated, { role: 'zaeli', content: reply }] : updated;
        setMessages(final);
        await saveSession(final);
      } catch (gErr) {
        console.error('[tutor-session] GPT failed:', gErr);
        // Show what we extracted at minimum so it's not lost
        const fallback = desc
          ? `Here's what I can see in your photo:\n\n${desc}\n\nWhat part would you like to start with?`
          : `I had trouble responding — can you type out the question for me?`;
        setMessages(prev => [...prev, { role: 'zaeli', content: fallback }]);
      }
      setSending(false);
    } catch (e) { console.error('[tutor-session] doSendPhoto outer:', e); setSending(false); }
  }

  // ── Voice ────────────────────────────────────────────────────
  async function toggleVoice() {
    if (recording) {
      setRecording(false);
      micPulse.stopAnimation(); micPulse.setValue(1);
      if (!audioRec) return;
      await audioRec.stopAndUnloadAsync();
      const uri = audioRec.getURI();
      setAudioRec(null);
      if (uri) await transcribeAudio(uri);
    } else {
      try {
        await Audio.requestPermissionsAsync();
        await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
        const { recording: rec } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
        setAudioRec(rec); setRecording(true);
        Animated.loop(
          Animated.sequence([
            Animated.timing(micPulse, { toValue: 1.3, duration: 600, useNativeDriver: true }),
            Animated.timing(micPulse, { toValue: 1.0, duration: 600, useNativeDriver: true }),
          ])
        ).start();
      } catch { Alert.alert('Microphone', 'Could not access microphone.'); }
    }
  }

  async function transcribeAudio(uri: string) {
    setSending(true);
    try {
      const form = new FormData();
      form.append('file', { uri, type: 'audio/m4a', name: 'audio.m4a' } as any);
      form.append('model', 'whisper-1');
      const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST', headers: { Authorization: `Bearer ${getOpenAIKey()}` }, body: form,
      });
      const json = await res.json();
      logGpt('whisper_transcription', { prompt_tokens: 0, completion_tokens: 0 });
      if (json.text?.trim()) setInput(json.text.trim());
    } catch (e) { console.error('Whisper:', e); }
    setSending(false);
  }

  // ── Subject detection ────────────────────────────────────────
  async function detectSubject(text: string) {
    const raw = await callGPT([{ role: 'user', content: `Detect subject and topic from: "${text}". Return JSON only: {"subject":"Maths|English|Science|HASS|Art|Technology|Other","topic":"specific topic"}` }]);
    try {
      const p = JSON.parse(raw.replace(/```json|```/g, '').trim());
      if (p.subject) setSubject(p.subject);
      if (p.topic)   setTopic(p.topic);
    } catch {}
  }

  // ── Save session ─────────────────────────────────────────────
  async function saveSession(msgs: Message[]) {
    const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
    const payload = {
      family_id: FAMILY_ID, child_name: childName, year_level: yearLevel,
      mode: 'homework', subject: subject || null, topic: topic || null,
      messages: msgs, duration_seconds: duration,
      questions_answered: 0, questions_correct: 0,
      status: 'active', updated_at: new Date().toISOString(),
    };
    if (sessionId) {
      await supabase.from('tutor_sessions').update(payload).eq('id', sessionId);
    } else {
      const { data } = await supabase.from('tutor_sessions').insert(payload).select('id').single();
      if (data?.id) setSessionId(data.id);
    }
  }

  // ── Save — silent, stay in session ──────────────────────────
  async function handleSave() {
    await saveSession(messages);
    // Brief toast then dismiss
    setSaved(true);
    Animated.sequence([
      Animated.timing(savedOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(700),
      Animated.timing(savedOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setSaved(false));
  }

  // ── Back — save + exit to child hub ─────────────────────────
  async function handleBack() {
    if (sessionId) {
      await supabase.from('tutor_sessions').update({
        status: 'complete',
        duration_seconds: Math.floor((Date.now() - startTimeRef.current) / 1000),
        updated_at: new Date().toISOString(),
      }).eq('id', sessionId);
    }
    router.replace({ pathname: '/(tabs)/tutor-child', params: { childId, childName, yearLevel: String(yearLevel) } });
  }


  async function retryLast() {
    const withoutLast = messages.slice(0, -1);
    if (withoutLast.length === 0) return;
    setMessages(withoutLast);
    setSending(true);
    const history = [
      { role: 'system', content: buildSystemPrompt(childName, yearLevel, subject) },
      ...withoutLast.map(m => ({ role: m.role === 'zaeli' ? 'assistant' : 'user', content: m.content })),
    ];
    const reply = await callGPT(history);
    const final: Message[] = reply ? [...withoutLast, { role: 'zaeli', content: reply }] : withoutLast;
    setMessages(final);
    setSending(false);
    await saveSession(final);
  }

  // ── Render ───────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <RNStatusBar barStyle="light-content" />

      {/* ── Header ── */}
      <View style={s.sessionHdr}>
        <View style={s.sessionHdrOrb} />
        <View style={s.sessionHdrInner}>
          <View style={s.sessionHdrRow}>
            <TouchableOpacity onPress={handleBack} activeOpacity={0.7}
              hitSlop={{ top:12, bottom:12, left:12, right:12 }}>
              <Text style={s.sessionBack}>‹ Back</Text>
            </TouchableOpacity>
            <Text style={s.sessionChild} numberOfLines={1}>{childName} · Homework Help</Text>
            {subject !== '' && (
              <View style={s.sessionPill}>
                <Text style={s.sessionPillTxt}>{subject} ✦</Text>
              </View>
            )}
          </View>
          {topic !== '' && (
            <Text style={s.sessionTopic}>{topic}</Text>
          )}
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: CARD }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollRef}
          style={s.chatArea}
          contentContainerStyle={s.chatContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {messages.map((msg, i) => {
            const isLast = i === messages.length - 1;
            const ts = new Date().toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' });
            const fb = feedback[i];
            return (
              <View key={i} style={s.msgWrap}>
                {msg.role === 'zaeli' ? (
                  /* ── Zaeli — full width, left accent ── */
                  <View style={s.zRow}>
                    <View style={s.zAccent} />
                    <View style={s.zBody}>
                      <Text style={s.bzName}>✦ Zaeli</Text>
                      <Text style={s.bzText}>{msg.content}</Text>
                      <View style={s.actRow}>
                        <TouchableOpacity style={s.actBtn} activeOpacity={0.6}>
                          <IcoPlay />
                        </TouchableOpacity>
                        <TouchableOpacity style={s.actBtn} activeOpacity={0.6}
                          onPress={() => Clipboard.setString(msg.content)}>
                          <IcoCopy />
                        </TouchableOpacity>
                        <TouchableOpacity style={s.actBtn} activeOpacity={0.6}
                          onPress={() => Share.share({ message: msg.content })}>
                          <IcoForward />
                        </TouchableOpacity>
                        <View style={s.actSep} />
                        <TouchableOpacity style={s.actBtn} activeOpacity={0.6}
                          onPress={() => setFeedback(f => ({ ...f, [i]: 'up' }))}>
                          <IcoThumbUp color={fb === 'up' ? HW_INDIGO : ICON_COLOR} />
                        </TouchableOpacity>
                        <TouchableOpacity style={s.actBtn} activeOpacity={0.6}
                          onPress={() => setFeedback(f => ({ ...f, [i]: 'down' }))}>
                          <IcoThumbDown color={fb === 'down' ? MAG : ICON_COLOR} />
                        </TouchableOpacity>
                        {isLast && (
                          <TouchableOpacity style={s.actBtn} activeOpacity={0.6}
                            onPress={retryLast}>
                            <IcoRetry />
                          </TouchableOpacity>
                        )}
                        <Text style={s.tsInline}>{ts}</Text>
                      </View>
                    </View>
                  </View>
                ) : (
                  /* ── Child — full width, teal tint ── */
                  <View style={s.cRow}>
                    {msg.imageUri && (
                      <Image source={{ uri: msg.imageUri }} style={s.photoImg} resizeMode="cover" />
                    )}
                    {msg.content !== 'Here is a photo of my work.' && (
                      <Text style={s.bcText}>{msg.content}</Text>
                    )}
                    <View style={s.cActRow}>
                      <Text style={s.tsInline}>{ts}</Text>
                      <TouchableOpacity style={s.actBtn} activeOpacity={0.6}
                        onPress={() => Clipboard.setString(msg.content)}>
                        <IcoCopy />
                      </TouchableOpacity>
                      <TouchableOpacity style={s.actBtn} activeOpacity={0.6}
                        onPress={() => Share.share({ message: msg.content })}>
                        <IcoForward />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            );
          })}
          {sending && (
            <View style={s.msgWrap}>
              <View style={s.zRow}>
                <View style={s.zAccent} />
                <View style={s.zBody}>
                  <Text style={s.bzName}>✦ Zaeli</Text>
                  <ActivityIndicator size="small" color={HW_INDIGO} style={{ alignSelf: 'flex-start', marginTop: 4 }} />
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {/* ── Input bar ── */}
        <View style={s.inputArea}>
          {recording && (
            <View style={s.recBanner}>
              <Animated.View style={[s.recDot, { transform: [{ scale: micPulse }] }]} />
              <Text style={s.recBannerTxt}>Listening… tap Stop when done</Text>
            </View>
          )}
          <View style={s.inputBox}>
            <TextInput
              style={s.inputField}
              value={input}
              onChangeText={setInput}
              placeholder="Chat with Zaeli…"
              placeholderTextColor={INK3}
              multiline
              returnKeyType="default"
            />
            <TouchableOpacity
              style={[s.micBtn, recording && s.micBtnActive]}
              onPress={toggleVoice}
              activeOpacity={0.7}
            >
              <IcoMic color={recording ? '#fff' : 'rgba(0,0,0,0.35)'} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.sendBtn, (!input.trim() && !recording) && { opacity: 0.45 }]}
              onPress={sendMessage}
              activeOpacity={0.8}
            >
              <IcoSend />
            </TouchableOpacity>
          </View>
          <View style={s.actionRow}>
            <TouchableOpacity style={s.actionBtn} onPress={() => doSendPhoto('camera')} activeOpacity={0.75}>
              <IcoCamera />
              <Text style={s.actionBtnTxt}>Camera</Text>
            </TouchableOpacity>
            <View style={s.actionDivider} />
            <TouchableOpacity style={s.actionBtn} onPress={() => doSendPhoto('library')} activeOpacity={0.75}>
              <IcoUpload />
              <Text style={s.actionBtnTxt}>Upload</Text>
            </TouchableOpacity>
            <View style={s.actionDivider} />
            <TouchableOpacity style={s.actionBtn} onPress={handleSave} activeOpacity={0.75}>
              <IcoSaveSession />
              <Text style={s.actionBtnTxt}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* ── Saved toast ── */}
      {saved && (
        <Animated.View style={[s.savedToast, { opacity: savedOpacity }]}>
          <IcoSaveSession color="#fff" />
          <Text style={s.savedToastTxt}>Session saved!</Text>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

// ── SVG Icons — identical to zaeli-chat ──────────────────────

function IcoPlay({ color = ICON_COLOR }: { color?: string }) {
  return (
    <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24">
      <Polygon points="5 3 19 12 5 21 5 3" stroke={color} strokeWidth={ICON_STROKE} fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    </Svg>
  );
}
function IcoCopy({ color = ICON_COLOR }: { color?: string }) {
  return (
    <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24">
      <Rect x="9" y="9" width="13" height="13" rx="2" stroke={color} strokeWidth={ICON_STROKE} fill="none"/>
      <Path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke={color} strokeWidth={ICON_STROKE} fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    </Svg>
  );
}
function IcoForward({ color = ICON_COLOR }: { color?: string }) {
  return (
    <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24">
      <Path d="M22 2L15 22l-3-7-7-3 17-10z" stroke={color} strokeWidth={ICON_STROKE} fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    </Svg>
  );
}
function IcoThumbUp({ color = ICON_COLOR }: { color?: string }) {
  return (
    <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24">
      <Path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z" stroke={color} strokeWidth={ICON_STROKE} fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      <Path d="M7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" stroke={color} strokeWidth={ICON_STROKE} fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    </Svg>
  );
}
function IcoThumbDown({ color = ICON_COLOR }: { color?: string }) {
  return (
    <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24">
      <Path d="M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3H10z" stroke={color} strokeWidth={ICON_STROKE} fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      <Path d="M17 2h2.67A2.31 2.31 0 0122 4v7a2.31 2.31 0 01-2.33 2H17" stroke={color} strokeWidth={ICON_STROKE} fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    </Svg>
  );
}
function IcoRetry({ color = ICON_COLOR }: { color?: string }) {
  return (
    <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24">
      <Polyline points="1 4 1 10 7 10" stroke={color} strokeWidth={ICON_STROKE} fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      <Path d="M3.51 15a9 9 0 102.13-9.36L1 10" stroke={color} strokeWidth={ICON_STROKE} fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    </Svg>
  );
}
function IcoMic({ color = ICON_COLOR }: { color?: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      <Rect x="9" y="2" width="6" height="11" rx="3" stroke={color} strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      <Path d="M5 10a7 7 0 0014 0" stroke={color} strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      <Line x1="12" y1="19" x2="12" y2="23" stroke={color} strokeWidth={1.8} strokeLinecap="round"/>
      <Line x1="8" y1="23" x2="16" y2="23" stroke={color} strokeWidth={1.8} strokeLinecap="round"/>
    </Svg>
  );
}
function IcoSend() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24">
      <Line x1="12" y1="19" x2="12" y2="5" stroke="#fff" strokeWidth={2.5} strokeLinecap="round"/>
      <Polyline points="5 12 12 5 19 12" stroke="#fff" strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    </Svg>
  );
}

// Camera icon — lens + body outline
function IcoCamera({ color = ICON_COLOR }: { color?: string }) {
  return (
    <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24">
      <Path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" stroke={color} strokeWidth={ICON_STROKE} fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      <Circle cx="12" cy="13" r="4" stroke={color} strokeWidth={ICON_STROKE} fill="none"/>
    </Svg>
  );
}
// Upload icon — image with up arrow
function IcoUpload({ color = ICON_COLOR }: { color?: string }) {
  return (
    <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24">
      <Rect x="3" y="3" width="18" height="18" rx="2" stroke={color} strokeWidth={ICON_STROKE} fill="none"/>
      <Path d="M12 16V8" stroke={color} strokeWidth={ICON_STROKE} strokeLinecap="round"/>
      <Polyline points="8 12 12 8 16 12" stroke={color} strokeWidth={ICON_STROKE} fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    </Svg>
  );
}
// Save / checkmark icon — circle with tick
function IcoSaveSession({ color = ICON_COLOR }: { color?: string }) {
  return (
    <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24">
      <Path d="M22 11.08V12a10 10 0 11-5.93-9.14" stroke={color} strokeWidth={ICON_STROKE} fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      <Polyline points="22 4 12 14.01 9 11.01" stroke={color} strokeWidth={ICON_STROKE} fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    </Svg>
  );
}

// ── Styles ────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: HW_INDIGO },

  // Header
  sessionHdr:      { backgroundColor: HW_INDIGO, overflow: 'hidden' },
  sessionHdrOrb:   { position: 'absolute', right: -30, top: -30, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.06)' },
  sessionHdrInner: { paddingHorizontal: 22, paddingTop: 14, paddingBottom: 14 },
  sessionHdrRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 2 },
  sessionBack:     { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: 'rgba(255,255,255,0.7)' },
  sessionChild:    { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: '#fff', flex: 1, textAlign: 'right' },
  sessionPill:     { backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', borderRadius: 16, paddingHorizontal: 10, paddingVertical: 4 },
  sessionPillTxt:  { fontFamily: 'Poppins_700Bold', fontSize: 11, color: '#fff', textTransform: 'uppercase', letterSpacing: 0.5 },
  sessionTopic:    { fontFamily: 'Poppins_400Regular', fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 4 },

  // Chat area
  chatArea:    { flex: 1, backgroundColor: BG },
  chatContent: { paddingVertical: 12 },

  // Message wrapper — full width with horizontal padding
  msgWrap: { paddingHorizontal: 16, marginBottom: 2 },

  // Zaeli message — full width with teal left accent bar
  zRow:    { flexDirection: 'row', marginBottom: 12 },
  zAccent: { width: 3, borderRadius: 2, backgroundColor: HW_INDIGO, marginRight: 12, marginTop: 2, flexShrink: 0 },
  zBody:   { flex: 1 },
  bzName:  { fontFamily: 'Poppins_700Bold', fontSize: 11, color: HW_INDIGO, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.8 },
  bzText:  { fontFamily: 'Poppins_400Regular', fontSize: 15, color: INK, lineHeight: 24 },

  // Child message — full width, teal tint background
  cRow:    { backgroundColor: `${HW_INDIGO}12`, borderRadius: 12, padding: 12, marginBottom: 12 },
  bcText:  { fontFamily: 'Poppins_400Regular', fontSize: 15, color: INK, lineHeight: 22 },
  cActRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 2 },

  // Action rows
  actRow:   { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 8 },
  actBtn:   { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  actSep:   { width: 1, height: 16, backgroundColor: 'rgba(0,0,0,0.10)', marginHorizontal: 4 },
  tsInline: { fontFamily: 'Poppins_400Regular', fontSize: 10, color: INK3, marginLeft: 'auto', paddingRight: 2 },

  // Photo — full width in conversation
  photoImg:  { width: '100%', height: 220, borderRadius: 10, marginBottom: 8 },

  // Input bar
  inputArea:    { backgroundColor: CARD, borderTopWidth: 1, borderTopColor: BORDER, paddingHorizontal: 14, paddingTop: 10, paddingBottom: Platform.OS === 'ios' ? 28 : 12 },
  inputBox:     { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F7F7F7', borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.10)', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  inputField:   { flex: 1, fontFamily: 'Poppins_400Regular', fontSize: 15, color: INK, maxHeight: 100 },
  micBtn:       { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: 11 },
  micBtnActive: { backgroundColor: MAG },
  sendBtn:      { width: 36, height: 36, borderRadius: 11, backgroundColor: BLUE, alignItems: 'center', justifyContent: 'center', shadowColor: BLUE, shadowOpacity: 0.3, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },

  // Three action buttons
  actionRow:     { flexDirection: 'row', alignItems: 'center', marginTop: 8, backgroundColor: '#F7F7F7', borderRadius: 18, borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.10)', overflow: 'hidden' },
  actionBtn:     { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, gap: 6 },
  actionBtnTxt:  { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: INK2 },
  actionDivider: { width: 1, height: 20, backgroundColor: 'rgba(0,0,0,0.08)' },

  // Saved toast
  savedToast:    { position: 'absolute', bottom: 120, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: HW_INDIGO, borderRadius: 24, paddingHorizontal: 20, paddingVertical: 12, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  savedToastTxt: { fontFamily: 'Poppins_700Bold', fontSize: 14, color: '#fff' },

  // Recording banner
  recBanner:    { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(224,0,124,0.08)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(224,0,124,0.2)' },
  recDot:       { width: 8, height: 8, borderRadius: 4, backgroundColor: MAG },
  recBannerTxt: { fontFamily: 'Poppins_600SemiBold', fontSize: 12, color: MAG, flex: 1 },
});
