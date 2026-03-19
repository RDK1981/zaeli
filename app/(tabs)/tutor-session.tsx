/**
 * Tutor Session Screen — Homework Help
 * app/(tabs)/tutor-session.tsx
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, StatusBar as RNStatusBar,
  ActivityIndicator, Alert, Image, Keyboard, TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import { supabase } from '../../lib/supabase';
import { callClaude } from '../../lib/api-logger';

// ── Constants ─────────────────────────────────────────────────
const FAMILY_ID  = '00000000-0000-0000-0000-000000000001';
const T_DARK     = '#1A1A2E';
const T_GOLD     = '#C9A84C';
const T_GOLD2    = '#B8963E';
const T_GOLDL    = 'rgba(201,168,76,0.08)';
const INK        = '#0A0A0A';
const INK2       = 'rgba(10,10,10,0.45)';
const INK3       = 'rgba(10,10,10,0.18)';
const BORDER     = 'rgba(0,0,0,0.07)';
const BG         = '#F4F6FA';
const CARD       = '#FFFFFF';
const GPT_MODEL  = 'gpt-5.4-mini';

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
RULES:
- NEVER give the direct answer immediately. Always guide thinking first.
- NEVER complete work on behalf of the child.
- Ask a guiding question or give a hint before revealing anything.
- Break problems into small steps. Ask the child to try each step.
- Celebrate correct thinking specifically, not generically.
- If wrong, be gentle and redirect with a question.
- After 2-3 exchanges, you may reveal the answer but explain the method.
- Keep responses to 2-3 sentences. End with a question or prompt.
- Never start with "I". Australian English. Warm and encouraging.
${subject ? `Subject: ${subject}` : ''}`;
}

interface Message { role: 'zaeli' | 'child'; content: string; imageUri?: string; }

export default function TutorSessionScreen() {
  const router    = useRouter();
  const insets    = useSafeAreaInsets();
  const params    = useLocalSearchParams<{ childId: string; childName: string; yearLevel: string }>();
  const childName = params.childName ?? '';
  const yearLevel = parseInt(params.yearLevel ?? '5', 10);
  const childId   = params.childId ?? '';

  const [messages, setMessages]   = useState<Message[]>([]);
  const [input, setInput]         = useState('');
  const [sending, setSending]     = useState(false);
  const [subject, setSubject]     = useState('');
  const [topic, setTopic]         = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [audioRec, setAudioRec]   = useState<Audio.Recording | null>(null);
  const startTimeRef = useRef(Date.now());
  const scrollRef    = useRef<ScrollView>(null);

  useFocusEffect(useCallback(() => { RNStatusBar.setBarStyle('light-content', true); }, []));
  useEffect(() => { sendGreeting(); }, []);
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

  // ── Send photo — camera or library ───────────────────────────
  async function sendPhoto() {
    Alert.alert('Add a photo', 'How would you like to add a photo?', [
      { text: '📷 Camera', onPress: () => pickPhoto('camera') },
      { text: '🖼️ Photo Library', onPress: () => pickPhoto('library') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  async function pickPhoto(source: 'camera' | 'library') {
    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7, base64: true })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7, base64: true });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const updated: Message[] = [...messages, { role: 'child', content: 'Here is a photo of my work.', imageUri: asset.uri }];
    setMessages(updated);
    setSending(true);
    try {
      const vData = await callClaude({
        feature: 'receipt_scan', familyId: FAMILY_ID,
        body: { model: 'claude-sonnet-4-6', max_tokens: 400, messages: [{ role: 'user', content: [
          { type: 'image', source: { type: 'base64', media_type: asset.mimeType ?? 'image/jpeg', data: asset.base64 ?? '' } },
          { type: 'text',  text: `Describe this homework photo from a Year ${yearLevel} student in 2 sentences: what subject, what the task is, what they've attempted.` },
        ]}]},
      });
      const desc = vData.content?.[0]?.text ?? 'I can see your work.';
      const history = [
        { role: 'system', content: buildSystemPrompt(childName, yearLevel, subject) },
        ...updated.map(m => ({ role: m.role === 'zaeli' ? 'assistant' : 'user', content: m.content })),
        { role: 'user', content: `${childName} sent a photo. I can see: ${desc}. Respond warmly and Socratically — acknowledge their effort, say something specific, then ask a guiding question. Don't give the answer.` },
      ];
      const reply = await callGPT(history);
      const final: Message[] = reply ? [...updated, { role: 'zaeli', content: reply }] : updated;
      setMessages(final);
      await saveSession(final);
    } catch {
      setMessages(prev => [...prev, { role: 'zaeli', content: "I can see your work — let's think through this together. What step are you finding tricky?" }]);
    }
    setSending(false);
  }

  // ── Voice ────────────────────────────────────────────────────
  async function toggleVoice() {
    if (recording) {
      setRecording(false);
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

  // ── Complete session on Back ─────────────────────────────────
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

  // ── Render ───────────────────────────────────────────────────
  return (
    <View style={s.root}>
      <RNStatusBar barStyle="light-content" />

      <View style={s.sessionHdr}>
        <View style={s.sessionHdrOrb} />
        <SafeAreaView edges={['top']}>
          <View style={s.sessionHdrInner}>
            <View style={s.sessionHdrRow}>
              <TouchableOpacity
                onPress={handleBack}
                activeOpacity={0.7}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Text style={s.sessionBack}>‹</Text>
              </TouchableOpacity>
              <Text style={s.sessionChild} numberOfLines={1}>{childName} · Homework Help</Text>
              {subject !== '' && (
                <View style={s.sessionPill}>
                  <Text style={s.sessionPillTxt}>{subject} ✦</Text>
                </View>
              )}
            </View>
            <Text style={s.sessionTopic}>{topic || 'What are we working on today?'}</Text>
          </View>
        </SafeAreaView>
      </View>

      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <ScrollView
        ref={scrollRef}
        style={s.chatArea}
        contentContainerStyle={s.chatContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {messages.map((msg, i) => (
          <View key={i}>
            {msg.role === 'zaeli' ? (
              <View style={s.bz}>
                <Text style={s.bzName}>✦ Zaeli</Text>
                <Text style={s.bzText}>{msg.content}</Text>
              </View>
            ) : (
              <View style={s.bcWrap}>
                {msg.imageUri && (
                  <View style={s.photoBub}>
                    <Image source={{ uri: msg.imageUri }} style={s.photoImg} resizeMode="cover" />
                    <Text style={s.photoCap}>Photo uploaded</Text>
                  </View>
                )}
                {msg.content !== 'Here is a photo of my work.' && (
                  <View style={s.bc}>
                    <Text style={s.bcText}>{msg.content}</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        ))}
        {sending && (
          <View style={s.bz}>
            <Text style={s.bzName}>✦ Zaeli</Text>
            <ActivityIndicator size="small" color={T_GOLD} style={{ alignSelf: 'flex-start' }} />
          </View>
        )}
      </ScrollView>
      </TouchableWithoutFeedback>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
        <View style={[s.inputBar, { paddingBottom: insets.bottom || 16 }]}>
          <View style={s.inputRow}>
            <TextInput
              style={s.inputField}
              value={input}
              onChangeText={setInput}
              placeholder="Type your answer…"
              placeholderTextColor={INK2}
              multiline
            />
            <TouchableOpacity style={s.inputSend} onPress={sendMessage} activeOpacity={0.85}>
              <Text style={s.inputSendTxt}>↑</Text>
            </TouchableOpacity>
          </View>
          <View style={s.inputActions}>
            <TouchableOpacity style={[s.inputBtn, recording && s.inputBtnActive]} onPress={toggleVoice} activeOpacity={0.8}>
              <Text style={[s.inputBtnTxt, recording && s.inputBtnTxtActive]}>{recording ? '⏹ Stop' : '🎤 Voice'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.inputBtn} onPress={sendPhoto} activeOpacity={0.8}>
              <Text style={s.inputBtnTxt}>📸 Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.inputBtn} activeOpacity={0.8}>
              <Text style={s.inputBtnTxt}>🔊 Replay</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:     { flex: 1, backgroundColor: BG },

  sessionHdr:      { backgroundColor: T_DARK, overflow: 'hidden' },
  sessionHdrOrb:   { position: 'absolute', right: -30, top: -30, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(201,168,76,0.05)' },
  sessionHdrInner: { paddingHorizontal: 22, paddingTop: 14, paddingBottom: 16 },
  sessionHdrRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },

  sessionBack:    { fontSize: 30, color: 'rgba(255,255,255,0.7)', fontFamily: 'Poppins_400Regular', lineHeight: 36 },
  sessionChild:   { fontFamily: 'Poppins_700Bold', fontSize: 17, color: '#fff', flex: 1 },
  sessionPill:    { backgroundColor: 'rgba(201,168,76,0.2)', borderWidth: 1, borderColor: 'rgba(201,168,76,0.3)', borderRadius: 16, paddingHorizontal: 10, paddingVertical: 4 },
  sessionPillTxt: { fontFamily: 'Poppins_700Bold', fontSize: 11, color: T_GOLD, textTransform: 'uppercase', letterSpacing: 0.5 },
  sessionTopic:   { fontFamily: 'Poppins_400Regular', fontSize: 13, color: 'rgba(255,255,255,0.45)' },

  chatArea:    { flex: 1, backgroundColor: BG },
  chatContent: { padding: 14, paddingHorizontal: 18, gap: 10, paddingBottom: 8 },

  bz:     { maxWidth: '84%', backgroundColor: CARD, borderRadius: 18, borderTopLeftRadius: 4, padding: 14, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
  bzName: { fontFamily: 'Poppins_700Bold', fontSize: 11, color: T_GOLD, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.8 },
  bzText: { fontFamily: 'Poppins_400Regular', fontSize: 15, color: INK, lineHeight: 23 },

  bcWrap: { alignItems: 'flex-end' },
  bc:     { maxWidth: '74%', backgroundColor: T_DARK, borderRadius: 18, borderTopRightRadius: 4, padding: 14 },
  bcText: { fontFamily: 'Poppins_400Regular', fontSize: 15, color: '#fff', lineHeight: 22 },

  photoBub: { maxWidth: '78%', marginBottom: 4, alignSelf: 'flex-end' },
  photoImg: { width: 200, height: 140, borderRadius: 14, borderTopRightRadius: 4 },
  photoCap: { fontFamily: 'Poppins_400Regular', fontSize: 11, color: INK2, textAlign: 'right', marginTop: 3 },

  inputBar:     { backgroundColor: CARD, borderTopWidth: 1, borderTopColor: BORDER, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 22 },
  inputRow:     { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 9 },
  inputField:   { flex: 1, backgroundColor: '#F7F7F7', borderRadius: 24, borderWidth: 1.5, borderColor: BORDER, paddingHorizontal: 16, paddingVertical: 11, fontSize: 15, color: INK, maxHeight: 100, fontFamily: 'Poppins_400Regular' },
  inputSend:    { width: 46, height: 46, backgroundColor: T_DARK, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  inputSendTxt: { fontSize: 20, color: '#fff' },
  inputActions:     { flexDirection: 'row', gap: 7 },
  inputBtn:         { flex: 1, backgroundColor: '#F7F7F7', borderRadius: 12, borderWidth: 1.5, borderColor: BORDER, paddingVertical: 11, alignItems: 'center', justifyContent: 'center' },
  inputBtnActive:   { backgroundColor: T_GOLDL, borderColor: 'rgba(201,168,76,0.25)' },
  inputBtnTxt:      { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: INK2 },
  inputBtnTxtActive:{ color: T_GOLD2 },
});
