/**
 * Tutor Practice Screen
 * app/(tabs)/tutor-practice.tsx
 *
 * Features:
 * - "Talk me through it" Socratic bottom sheet (always available)
 * - Full-screen slide-up modal with smooth Animated.timing
 * - Voice (Whisper) + camera in Socratic chat
 * - Socratic messages logged to session record
 * - Next disabled until GPT feedback loads (no race condition)
 * - Subject change always creates new session (never overwrites)
 * - Wrong answer: Stage 2 hint + Stage 3 whiteboard workings
 * - Adaptive difficulty + no repeated questions
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar as RNStatusBar, ActivityIndicator, Alert, Image, TextInput,
  Modal, Animated, Dimensions, KeyboardAvoidingView, Platform,
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
const T_GOLD3    = 'rgba(201,168,76,0.15)';
const T_GOLDL    = 'rgba(201,168,76,0.08)';
const T_DARKL    = 'rgba(26,26,46,0.07)';
const GREEN      = '#00C97A';
const MAG        = '#E0007C';
const INK        = '#0A0A0A';
const INK2       = 'rgba(10,10,10,0.45)';
const INK3       = 'rgba(10,10,10,0.18)';
const BORDER     = 'rgba(0,0,0,0.07)';
const BG         = '#F7F7F7';
const CARD       = '#FFFFFF';
const SUBJECTS   = ['Maths', 'English', 'Science', 'HASS'];
const GPT_MODEL  = 'gpt-5.4-mini';
const { height: SCREEN_H } = Dimensions.get('window');

function getOpenAIKey() { return process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? ''; }
function isSenior(y: number) { return y >= 7; }
function getTierBadge(y: number) {
  if (y <= 2) return '🌟 Little Learner';
  if (y <= 6) return '🧠 Practice Mode';
  return '📐 Practice Mode';
}

// ── Difficulty ────────────────────────────────────────────────
function getDifficultyInstruction(answered: number, correct: number): string {
  if (answered < 2) return 'at the standard Year level';
  const rate = correct / answered;
  if (rate > 0.85) return 'harder than standard — this student is excelling, push them';
  if (rate > 0.70) return 'slightly challenging — a step above standard';
  if (rate < 0.40) return 'easier than standard — focus on fundamentals, build confidence';
  return 'at the standard Year level';
}
function getDifficultyTransition(answered: number, correct: number): string {
  if (answered < 2) return '';
  const rate = correct / answered;
  if (rate > 0.85) return `You're on a roll — let's try something trickier! 🔥`;
  if (rate < 0.40 && answered >= 3) return `Let's slow down and make sure the foundations are solid first.`;
  return '';
}

// ── GPT ───────────────────────────────────────────────────────
async function logGpt(feature: string, usage: any) {
  const i = usage?.prompt_tokens ?? 0;
  const o = usage?.completion_tokens ?? 0;
  supabase.from('api_logs').insert({
    family_id: FAMILY_ID, feature, model: GPT_MODEL,
    input_tokens: i, output_tokens: o,
    cost_usd: parseFloat(((i * 0.75 + o * 4.50) / 1_000_000).toFixed(6)),
  }).then(({ error }) => { if (error) console.warn('log:', error.message); });
}

async function callGPT(messages: { role: string; content: string }[], maxTokens = 600): Promise<string> {
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getOpenAIKey()}` },
      body: JSON.stringify({ model: GPT_MODEL, max_completion_tokens: maxTokens, messages }),
    });
    const json = await res.json();
    if (!res.ok) { console.error('GPT error:', res.status, json?.error?.message); return ''; }
    logGpt('tutor_practice', json.usage);
    return json.choices?.[0]?.message?.content ?? '';
  } catch (e) { console.error('GPT fetch:', e); return ''; }
}

// ── Types ─────────────────────────────────────────────────────
interface MCQuestion {
  question: string; options: string[]; correct: number;
  explanation: string; workingHint: string;
}
interface SeniorQuestion {
  question: string; zaeliPrompt: string; explanation: string;
}
type Question = MCQuestion | SeniorQuestion;
function isMC(q: Question): q is MCQuestion { return 'options' in q; }

interface SessionMessage {
  q: string; correct: boolean; subject: string; timestamp: string;
}
interface ChatMessage {
  role: 'zaeli' | 'child'; content: string; imageUri?: string;
}

// ── Socratic system prompt ────────────────────────────────────
function getSocraticPrompt(childName: string, yearLevel: number, subject: string, question: string, answered: boolean, wasCorrect?: boolean): string {
  return `You are Zaeli, a warm AI tutor in a live Socratic tutoring session with ${childName}, Year ${yearLevel}.

The question is: "${question}" (${subject})
${answered ? (wasCorrect ? 'They answered it correctly but want to understand it better.' : 'They got it wrong and need help working through it.') : 'They haven\'t answered yet — they want to work through it before trying.'}

YOUR RULES — never break these:
- Guide step by step using the ACTUAL NUMBERS from the question
- Ask ONE small question at a time — wait for the child's response
- Never give the full answer or full method in one go
- Celebrate each correct step specifically ("Nice! 6 × 7 = 42 — exactly right")
- If they're wrong on a step, gently redirect without telling them the answer
- Keep each response SHORT — 2-3 sentences max, one question at a time
- Use emojis naturally — 👉 for prompts, 🎉 for wins, 💪 for encouragement
- When they've clearly understood the full method, wrap up naturally
- End your final message with exactly: [READY_TO_TRY] on a new line (this triggers the close button)
- Australian English. Never start with "I". Warm, never condescending.`;
}

// ── Component ─────────────────────────────────────────────────
export default function TutorPracticeScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const params  = useLocalSearchParams<{ childId: string; childName: string; yearLevel: string }>();
  const childName = params.childName ?? '';
  const yearLevel = parseInt(params.yearLevel ?? '5', 10);
  const childId   = params.childId ?? '';
  const senior    = isSenior(yearLevel);

  // Question state
  const [subject, setSubject]     = useState('Maths');
  const [question, setQuestion]   = useState<Question | null>(null);
  const [loading, setLoading]     = useState(false);
  const [qIndex, setQIndex]       = useState(0);

  // Session tracking
  const [sessionId, setSessionId]     = useState<string | null>(null);
  const [answered, setAnswered]       = useState(0);
  const [correct, setCorrect]         = useState(0);
  const [sessionMsgs, setSessionMsgs] = useState<SessionMessage[]>([]);
  const [askedQs, setAskedQs]         = useState<string[]>([]);
  const startTimeRef = useRef(Date.now());

  // Per-question MC state
  const [selected, setSelected]               = useState<number | null>(null);
  const [qAnswered, setQAnswered]             = useState(false);
  const [feedback, setFeedback]               = useState('');
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [diffTransition, setDiffTransition]   = useState('');

  // Wrong answer flow
  const [wrongStage, setWrongStage]           = useState<0 | 1 | 2>(0);
  const [hint, setHint]                       = useState('');
  const [hintLoading, setHintLoading]         = useState(false);
  const [workings, setWorkings]               = useState('');
  const [workingsLoading, setWorkingsLoading] = useState(false);

  // Correct answer working photo
  const [showWorking, setShowWorking]               = useState(false);
  const [workingPhoto, setWorkingPhoto]             = useState<string | null>(null);
  const [workingFeedback, setWorkingFeedback]       = useState('');
  const [assessingWorking, setAssessingWorking]     = useState(false);

  // Senior state
  const [seniorAnswer, setSeniorAnswer]           = useState('');
  const [seniorPhoto, setSeniorPhoto]             = useState<string | null>(null);
  const [seniorFeedback, setSeniorFeedback]       = useState('');
  const [seniorSubmitted, setSeniorSubmitted]     = useState(false);
  const [assessingSenior, setAssessingSenior]     = useState(false);

  // ── Socratic sheet state ──────────────────────────────────────
  const [sheetVisible, setSheetVisible]         = useState(false);
  const [chatMessages, setChatMessages]         = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput]               = useState('');
  const [chatSending, setChatSending]           = useState(false);
  const [showReadyBtn, setShowReadyBtn]         = useState(false);
  const [recording, setRecording]               = useState(false);
  const [audioRec, setAudioRec]                 = useState<Audio.Recording | null>(null);
  const slideAnim  = useRef(new Animated.Value(SCREEN_H)).current;
  const chatScrollRef = useRef<ScrollView>(null);
  const mainScrollRef = useRef<ScrollView>(null);

  useFocusEffect(useCallback(() => { RNStatusBar.setBarStyle('light-content', true); }, []));
  useEffect(() => { loadQuestion(); }, []);

  // Auto-scroll chat
  useEffect(() => {
    setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [chatMessages]);

  // ── Load question ─────────────────────────────────────────────
  async function loadQuestion() {
    setLoading(true);
    resetQuestionState();

    const diffInstr  = getDifficultyInstruction(answered, correct);
    const transition = getDifficultyTransition(answered, correct);
    if (transition && answered > 0) setDiffTransition(transition);

    const avoidList = askedQs.length > 0
      ? `\nDo NOT repeat any of these questions:\n${askedQs.slice(-10).map((q, i) => `${i + 1}. ${q}`).join('\n')}`
      : '';

    const prompt = senior
      ? `Generate a practice question for ${childName}, Year ${yearLevel}, ${subject}. Difficulty: ${diffInstr}. ACARA Australian curriculum.${avoidList}
Return ONLY raw JSON, no markdown:
{"question":"question text","zaeliPrompt":"warm 1-sentence Socratic prompt to work through it on paper","explanation":"model answer"}`
      : `Generate a multiple choice question for ${childName}, Year ${yearLevel}, ${subject}. Difficulty: ${diffInstr}. ACARA Australian curriculum.${avoidList}
Return ONLY raw JSON, no markdown:
{"question":"question text","options":["A","B","C","D"],"correct":0,"explanation":"friendly explanation","workingHint":"what working to show"}
correct is 0-based index.`;

    const raw = await callGPT([{ role: 'user', content: prompt }]);
    try {
      const clean = raw.replace(/```json|```/g, '').trim();
      const s = clean.indexOf('{'), e = clean.lastIndexOf('}');
      if (s === -1 || e === -1) throw new Error('No JSON');
      const q = JSON.parse(clean.slice(s, e + 1)) as Question;
      setQuestion(q);
      setAskedQs(prev => [...prev, q.question]);
    } catch {
      if (!senior) {
        setQuestion({ question: `What is 7 × 8?`, options: ['54','56','48','64'], correct: 1, explanation: '7 × 8 = 56.', workingHint: 'Write multiplication steps' });
      } else {
        setQuestion({ question: `Solve for x: 2x + 6 = 14`, zaeliPrompt: `Work through it step by step on paper.`, explanation: 'x = 4' });
      }
    }
    setLoading(false);
  }

  function resetQuestionState() {
    setSelected(null); setQAnswered(false); setFeedback(''); setFeedbackLoading(false);
    setDiffTransition(''); setWrongStage(0); setHint(''); setWorkings('');
    setHintLoading(false); setWorkingsLoading(false);
    setShowWorking(false); setWorkingPhoto(null); setWorkingFeedback('');
    setSeniorAnswer(''); setSeniorPhoto(null); setSeniorFeedback('');
    setSeniorSubmitted(false); setChatMessages([]); setShowReadyBtn(false);
  }

  // ── Subject change — always new session ───────────────────────
  function changeSubject(sub: string) {
    if (sub === subject) return;
    setSubject(sub);
    setSessionId(null);
    setAnswered(0); setCorrect(0);
    setSessionMsgs([]); setAskedQs([]);
    setQIndex(0);
    startTimeRef.current = Date.now();
    setTimeout(() => loadQuestion(), 0);
  }

  // ── Select answer — Next disabled until feedback loads ────────
  async function selectOption(index: number) {
    if (qAnswered || !question || !isMC(question)) return;
    setSelected(index);
    setQAnswered(true);
    setFeedbackLoading(true);

    const isCorrect   = index === question.correct;
    const newAnswered = answered + 1;
    const newCorrect  = correct + (isCorrect ? 1 : 0);
    setAnswered(newAnswered);
    setCorrect(newCorrect);

    const msg: SessionMessage = { q: question.question, correct: isCorrect, subject, timestamp: new Date().toISOString() };
    const newMsgs = [...sessionMsgs, msg];
    setSessionMsgs(newMsgs);
    await upsertSession(newAnswered, newCorrect, newMsgs);

    const fb = await callGPT([{ role: 'user', content:
      `${childName} answered a Year ${yearLevel} ${subject} question ${isCorrect ? 'CORRECTLY' : 'INCORRECTLY'}.
Question: "${question.question}"
Their answer: "${question.options[index]}"
Correct: "${question.options[question.correct]}"
Score: ${newCorrect}/${newAnswered}.
1-2 warm sentences as Zaeli. ${isCorrect
  ? 'Celebrate specifically what they got right.'
  : 'Be gentle — acknowledge effort, give one nudge, do NOT give the answer or method.'
} Never start with "I". Australian English.` }]);
    setFeedback(fb || (isCorrect ? `Yes, ${childName}! That's exactly right. 🎉` : `Not quite — have another think!`));
    setFeedbackLoading(false);
  }

  // ── Wrong answer: Stage 2 hint ────────────────────────────────
  async function getHint() {
    if (!question || !isMC(question)) return;
    setHintLoading(true); setWrongStage(1);
    const h = await callGPT([{ role: 'user', content:
      `${childName} got this ${subject} question wrong and needs a hint.
Question: "${question.question}"
Correct: "${question.options[question.correct]}"
Give ONE specific hint pointing them in the right direction WITHOUT revealing the answer or method. 1-2 warm sentences. Never start with "I".` }]);
    setHint(h || `Think about what you know about ${subject.toLowerCase()} — what's the first step?`);
    setHintLoading(false);
  }

  // ── Wrong answer: Stage 3 whiteboard workings ─────────────────
  async function getWorkings() {
    if (!question || !isMC(question)) return;
    setWorkingsLoading(true); setWrongStage(2);
    const w = await callGPT([{ role: 'user', content:
      `Show ${childName} (Year ${yearLevel}) how to work out this ${subject} problem, as if writing on a whiteboard.
Question: "${question.question}"
Correct answer: "${question.options[question.correct]}"

Format:
- 1 warm intro sentence
- Number each step, use the ACTUAL NUMBERS from the question
- Simple Year ${yearLevel} language
- Show WHY each step works
- State the answer clearly at the end
- 1 encouraging closing line

Focus on teaching the METHOD so they can apply it next time.` }, 800]);
    setWorkings(w || `Let me show you how to approach this step by step…`);
    setWorkingsLoading(false);
  }

  // ── Socratic sheet ────────────────────────────────────────────
  function openSheet() {
    setSheetVisible(true);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 380,
      useNativeDriver: true,
    }).start(() => {
      // Send opening message from Zaeli after sheet is open
      if (chatMessages.length === 0) sendSocraticGreeting();
    });
  }

  function closeSheet() {
    Animated.timing(slideAnim, {
      toValue: SCREEN_H,
      duration: 320,
      useNativeDriver: true,
    }).start(() => {
      setSheetVisible(false);
    });
  }

  async function sendSocraticGreeting() {
    if (!question) return;
    setChatSending(true);
    const isAnswered = qAnswered;
    const wasCorrect = qAnswered && isMC(question) && selected === question.correct;
    const reply = await callGPT([
      { role: 'system', content: getSocraticPrompt(childName, yearLevel, subject, question.question, isAnswered, wasCorrect) },
      { role: 'user',   content: `Start the Socratic session. Jump straight in — no preamble. First message only.` },
    ], 200);
    const clean = reply.replace('[READY_TO_TRY]', '').trim();
    if (clean) setChatMessages([{ role: 'zaeli', content: clean }]);
    if (reply.includes('[READY_TO_TRY]')) setShowReadyBtn(true);
    setChatSending(false);
  }

  async function sendChatMessage() {
    const text = chatInput.trim();
    if (!text || chatSending || !question) return;
    setChatInput('');
    const updated: ChatMessage[] = [...chatMessages, { role: 'child', content: text }];
    setChatMessages(updated);
    setChatSending(true);

    const history = [
      { role: 'system', content: getSocraticPrompt(childName, yearLevel, subject, question.question, qAnswered, qAnswered && isMC(question) && selected === question.correct) },
      ...updated.map(m => ({ role: m.role === 'zaeli' ? 'assistant' : 'user', content: m.content })),
    ];
    const reply = await callGPT(history, 300);
    const clean = reply.replace('[READY_TO_TRY]', '').trim();
    const final: ChatMessage[] = clean ? [...updated, { role: 'zaeli', content: clean }] : updated;
    setChatMessages(final);
    if (reply.includes('[READY_TO_TRY]')) setShowReadyBtn(true);

    // Log Socratic exchange to session
    await appendSocraticToSession(final);
    setChatSending(false);
  }

  async function appendSocraticToSession(chatMsgs: ChatMessage[]) {
    if (!sessionId) return;
    await supabase.from('tutor_sessions').update({
      messages: [...sessionMsgs, { type: 'socratic', messages: chatMsgs, timestamp: new Date().toISOString() }],
      updated_at: new Date().toISOString(),
    }).eq('id', sessionId);
  }

  // ── Chat photo ────────────────────────────────────────────────
  async function sendChatPhoto() {
    Alert.alert('Add photo', 'How would you like to add a photo?', [
      { text: 'Camera', onPress: () => doChatPhoto('camera') },
      { text: 'Photo Library', onPress: () => doChatPhoto('library') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  async function doChatPhoto(source: 'camera' | 'library') {
    try {
      let result;
      if (source === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) { Alert.alert('Permission needed', 'Please enable Camera access in Settings.'); return; }
        result = await ImagePicker.launchCameraAsync({ quality: 0.7, base64: true });
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) { Alert.alert('Permission needed', 'Please enable Photo Library access in Settings.'); return; }
        result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7, base64: true });
      }
      if (result.canceled || !result.assets[0] || !question) return;
      const asset = result.assets[0];
      const updated: ChatMessage[] = [...chatMessages, { role: 'child', content: 'Here is a photo.', imageUri: asset.uri }];
      setChatMessages(updated);
      setChatSending(true);
      try {
        const vData = await callClaude({
          feature: 'tutor_vision', familyId: FAMILY_ID,
          body: { model: 'claude-sonnet-4-6', max_tokens: 200, messages: [{ role: 'user', content: [
            { type: 'image', source: { type: 'base64', media_type: asset.mimeType ?? 'image/jpeg', data: asset.base64 ?? '' } },
            { type: 'text',  text: 'Describe what the student has written or drawn in 1-2 sentences for a tutor.' },
          ]}]},
        });
        const desc = vData.content?.[0]?.text ?? 'I can see their work.';
        const history = [
          { role: 'system', content: getSocraticPrompt(childName, yearLevel, subject, question.question, qAnswered) },
          ...updated.map(m => ({ role: m.role === 'zaeli' ? 'assistant' : 'user', content: m.content })),
          { role: 'user', content: `${childName} shared a photo. I can see: ${desc}. Respond Socratically — acknowledge what they've done and ask the next guiding question.` },
        ];
        const reply = await callGPT(history, 300);
        const clean = reply.replace('[READY_TO_TRY]', '').trim();
        const final: ChatMessage[] = clean ? [...updated, { role: 'zaeli', content: clean }] : updated;
        setChatMessages(final);
        if (reply.includes('[READY_TO_TRY]')) setShowReadyBtn(true);
        await appendSocraticToSession(final);
      } catch { setChatMessages(prev => [...prev, { role: 'zaeli', content: "I can see your work — let's keep going! What did you try next?" }]); }
      setChatSending(false);
    } catch (e) { console.error('Chat photo:', e); }
  }

  // ── Voice ─────────────────────────────────────────────────────
  async function toggleVoice() {
    if (recording) {
      setRecording(false);
      if (!audioRec) return;
      await audioRec.stopAndUnloadAsync();
      const uri = audioRec.getURI();
      setAudioRec(null);
      if (uri) await transcribeVoice(uri);
    } else {
      try {
        await Audio.requestPermissionsAsync();
        await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
        const { recording: rec } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
        setAudioRec(rec); setRecording(true);
      } catch { Alert.alert('Microphone', 'Could not access microphone.'); }
    }
  }

  async function transcribeVoice(uri: string) {
    setChatSending(true);
    try {
      const form = new FormData();
      form.append('file', { uri, type: 'audio/m4a', name: 'audio.m4a' } as any);
      form.append('model', 'whisper-1');
      const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST', headers: { Authorization: `Bearer ${getOpenAIKey()}` }, body: form,
      });
      const json = await res.json();
      if (json.text?.trim()) setChatInput(json.text.trim());
    } catch (e) { console.error('Whisper:', e); }
    setChatSending(false);
  }

  // ── Session upsert ────────────────────────────────────────────
  async function upsertSession(totalAnswered: number, totalCorrect: number, msgs: SessionMessage[]) {
    const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
    const payload = {
      family_id: FAMILY_ID, child_name: childName, year_level: yearLevel,
      mode: 'practice', subject, topic: `${subject} Practice`,
      messages: msgs, questions_answered: totalAnswered, questions_correct: totalCorrect,
      duration_seconds: duration, status: 'active', updated_at: new Date().toISOString(),
    };
    if (sessionId) {
      await supabase.from('tutor_sessions').update(payload).eq('id', sessionId);
    } else {
      const { data } = await supabase.from('tutor_sessions').insert({ ...payload, created_at: new Date().toISOString() }).select('id').single();
      if (data?.id) setSessionId(data.id);
    }
  }

  // ── Back ──────────────────────────────────────────────────────
  async function handleBack() {
    if (sessionId && answered > 0) {
      await supabase.from('tutor_sessions').update({
        status: 'complete',
        duration_seconds: Math.floor((Date.now() - startTimeRef.current) / 1000),
        questions_answered: answered, questions_correct: correct,
        updated_at: new Date().toISOString(),
      }).eq('id', sessionId);
    }
    router.replace({ pathname: '/(tabs)/tutor-child', params: { childId, childName, yearLevel: String(yearLevel) } });
  }

  // ── Working photo ─────────────────────────────────────────────
  async function takeWorkingPhoto() {
    Alert.alert('Show your working', 'How would you like to add your photo?', [
      { text: 'Camera', onPress: () => doWorkingPhoto('camera') },
      { text: 'Photo Library', onPress: () => doWorkingPhoto('library') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  async function doWorkingPhoto(source: 'camera' | 'library') {
    try {
      let result;
      if (source === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) { Alert.alert('Permission needed', 'Please enable Camera access in Settings.'); return; }
        result = await ImagePicker.launchCameraAsync({ quality: 0.6, base64: true });
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) { Alert.alert('Permission needed', 'Please enable Photo Library access in Settings.'); return; }
        result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.6, base64: true });
      }
      if (result.canceled || !result.assets[0]) return;
      setWorkingPhoto(result.assets[0].uri);
      setAssessingWorking(true);
      try {
        const vData = await callClaude({
          feature: 'tutor_vision', familyId: FAMILY_ID,
          body: { model: 'claude-sonnet-4-6', max_tokens: 200, messages: [{ role: 'user', content: [
            { type: 'image', source: { type: 'base64', media_type: result.assets[0].mimeType ?? 'image/jpeg', data: result.assets[0].base64 ?? '' } },
            { type: 'text',  text: 'Describe the working out in 2 sentences. What method? What steps?' },
          ]}]},
        });
        const desc = vData.content?.[0]?.text ?? '';
        if (question && isMC(question)) {
          const wf = await callGPT([{ role: 'user', content: `Zaeli reviewing ${childName}'s working for: "${question.question}". Working: ${desc}. 1-2 warm sentences on their METHOD. Specific praise if good. Gentle redirect if not. Never start with "I".` }]);
          setWorkingFeedback(wf);
        }
      } catch { setWorkingFeedback("Great job showing your steps!"); }
      setAssessingWorking(false);
    } catch (e) { console.error('Working photo:', e); }
  }

  // ── Senior ────────────────────────────────────────────────────
  async function submitSeniorAnswer() {
    if (!seniorPhoto && !seniorAnswer.trim()) { Alert.alert('Show your working', 'Take a photo or type first.'); return; }
    setAssessingSenior(true); setSeniorSubmitted(true);
    const newAnswered = answered + 1; setAnswered(newAnswered);
    const msg: SessionMessage = { q: (question as SeniorQuestion).question, correct: false, subject, timestamp: new Date().toISOString() };
    const newMsgs = [...sessionMsgs, msg]; setSessionMsgs(newMsgs);
    await upsertSession(newAnswered, correct, newMsgs);
    const fb = await callGPT([{ role: 'user', content: `Zaeli reviewing ${childName}'s work: "${(question as SeniorQuestion).question}". ${seniorAnswer ? `Answer: "${seniorAnswer}".` : 'Photo submitted.'} 2-3 warm sentences on METHOD. Specific praise if correct. One guiding question if incomplete. Never start with "I".` }]);
    setSeniorFeedback(fb); setAssessingSenior(false);
  }

  async function takeSeniorPhoto() {
    Alert.alert('Show your working', 'How would you like to add your photo?', [
      { text: 'Camera', onPress: () => doSeniorPhoto('camera') },
      { text: 'Photo Library', onPress: () => doSeniorPhoto('library') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  async function doSeniorPhoto(source: 'camera' | 'library') {
    try {
      let result;
      if (source === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) { Alert.alert('Permission needed', 'Please enable Camera access in Settings.'); return; }
        result = await ImagePicker.launchCameraAsync({ quality: 0.65 });
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) { Alert.alert('Permission needed', 'Please enable Photo Library access in Settings.'); return; }
        result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.65 });
      }
      if (!result.canceled && result.assets[0]) setSeniorPhoto(result.assets[0].uri);
    } catch (e) { console.error('Senior photo:', e); }
  }

  async function nextQuestion() { setQIndex(i => i + 1); await loadQuestion(); }

  const isCorrectAnswer = qAnswered && question && isMC(question) && selected === question.correct;
  const isWrongAnswer   = qAnswered && question && isMC(question) && selected !== question.correct;

  // ── Render ────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <RNStatusBar barStyle="light-content" />

      {/* Hero */}
      <View style={s.practiceHdr}>
        <View style={s.practiceHdrOrb} />
        <TouchableOpacity onPress={handleBack} activeOpacity={0.7} hitSlop={{ top:12,bottom:12,left:12,right:12 }} style={s.backBtn}>
          <Text style={s.backTxt}>‹ Back</Text>
        </TouchableOpacity>
        <View style={s.goldBadge}>
          <Text style={s.goldBadgeTxt}>{getTierBadge(yearLevel)} · Year {yearLevel}</Text>
        </View>
        <Text style={s.heroTitle}>{subject}{'\n'}Practice</Text>
        <Text style={s.heroSub}>{senior ? 'ACARA-aligned · show your working' : 'ACARA-aligned · fresh questions every time'}</Text>
      </View>

      <View style={s.content}>
        <ScrollView ref={mainScrollRef} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48 }}>

          {/* Subject chips */}
          <View style={s.chips}>
            {SUBJECTS.map(sub => (
              <TouchableOpacity key={sub} style={[s.chip, subject===sub && s.chipOn]} onPress={() => changeSubject(sub)} activeOpacity={0.75}>
                <Text style={[s.chipTxt, subject===sub && s.chipTxtOn]}>{sub}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Progress */}
          <View style={s.progWrap}>
            <View style={s.progLblRow}>
              <Text style={s.progLblTxt}>Question {qIndex + 1}</Text>
              {answered > 0 && <Text style={s.progCorrect}>{correct}/{answered} correct ✓</Text>}
            </View>
            <View style={s.progTrack}>
              <View style={[s.progFill, { width: answered > 0 ? `${Math.round((correct/answered)*100)}%` : '0%' }]} />
            </View>
          </View>

          {loading && (
            <View style={s.loadingWrap}>
              <ActivityIndicator size="large" color={T_GOLD} />
              <Text style={s.loadingTxt}>Zaeli is finding the perfect question…</Text>
            </View>
          )}

          {!loading && diffTransition !== '' && (
            <View style={s.transitionCard}>
              <Text style={s.transitionTxt}>{diffTransition}</Text>
            </View>
          )}

          {/* ── MIDDLE YEARS ── */}
          {!loading && question && isMC(question) && (
            <>
              <View style={s.qCard}>
                <View style={s.qTop}>
                  <Text style={s.qMeta}>Year {yearLevel} {subject}</Text>
                  <Text style={s.qText}>{question.question}</Text>
                </View>
                <View style={s.qOpts}>
                  {question.options.map((opt, i) => {
                    const isCorrectOpt = qAnswered && i === question.correct;
                    const isWrongSel   = qAnswered && i === selected && i !== question.correct;
                    const isSel        = !qAnswered && selected === i;
                    return (
                      <TouchableOpacity key={i} style={[s.qOpt, isSel && s.qOptSel, isCorrectOpt && s.qOptCorrect, isWrongSel && s.qOptWrong]}
                        onPress={() => selectOption(i)} activeOpacity={qAnswered ? 1 : 0.75}>
                        <View style={[s.qLetter, isSel && s.qLetterSel, isCorrectOpt && s.qLetterCorrect]}>
                          <Text style={[s.qLetterTxt, isSel && s.qLetterTxtSel, isCorrectOpt && s.qLetterTxtCorrect]}>{['A','B','C','D'][i]}</Text>
                        </View>
                        <Text style={[s.qOptTxt, isCorrectOpt && {color:GREEN}, isWrongSel && {color:MAG}]}>{opt}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Talk me through it — always visible */}
              <TouchableOpacity style={s.socraticBtn} onPress={openSheet} activeOpacity={0.82}>
                <Text style={s.socraticBtnTxt}>🧠 Talk me through it</Text>
              </TouchableOpacity>

              {/* Feedback loading */}
              {feedbackLoading && (
                <View style={s.feedbackLoading}>
                  <ActivityIndicator size="small" color={T_GOLD} />
                  <Text style={s.feedbackLoadingTxt}>Zaeli is thinking…</Text>
                </View>
              )}

              {/* Zaeli feedback */}
              {!feedbackLoading && feedback !== '' && (
                <View style={[s.zf, isCorrectAnswer ? s.zfCorrect : s.zfWrong]}>
                  <Text style={s.zfIcon}>{isCorrectAnswer ? '🎉' : '💭'}</Text>
                  <Text style={s.zfText}>{feedback}</Text>
                </View>
              )}

              {/* Wrong answer flow */}
              {!feedbackLoading && feedback !== '' && isWrongAnswer && (
                <>
                  {wrongStage === 0 && (
                    <TouchableOpacity style={s.hintBtn} onPress={getHint} activeOpacity={0.8}>
                      <Text style={s.hintBtnTxt}>💡 Give me a hint</Text>
                    </TouchableOpacity>
                  )}
                  {hintLoading && <View style={s.feedbackLoading}><ActivityIndicator size="small" color={T_GOLD}/><Text style={s.feedbackLoadingTxt}>Thinking of a hint…</Text></View>}
                  {!hintLoading && hint !== '' && (
                    <View style={s.hintCard}>
                      <Text style={s.hintLabel}>💡 Hint</Text>
                      <Text style={s.hintText}>{hint}</Text>
                    </View>
                  )}
                  {wrongStage >= 1 && !hintLoading && workings === '' && (
                    <TouchableOpacity style={s.workingsBtn} onPress={getWorkings} activeOpacity={0.8}>
                      <Text style={s.workingsBtnTxt}>📝 Show me how to work this out</Text>
                    </TouchableOpacity>
                  )}
                  {workingsLoading && <View style={s.feedbackLoading}><ActivityIndicator size="small" color={T_GOLD}/><Text style={s.feedbackLoadingTxt}>Writing it out…</Text></View>}
                  {!workingsLoading && workings !== '' && (
                    <View style={s.workingsCard}>
                      <View style={s.workingsCardHeader}>
                        <Text style={s.workingsCardIcon}>📝</Text>
                        <Text style={s.workingsCardTitle}>How to work it out</Text>
                      </View>
                      <Text style={s.workingsText}>{workings}</Text>
                    </View>
                  )}
                </>
              )}

              {/* Show working (correct) */}
              {!feedbackLoading && qAnswered && isCorrectAnswer && (
                <View style={s.workingCard}>
                  <TouchableOpacity style={s.workingRow} onPress={() => setShowWorking(v => !v)} activeOpacity={0.75}>
                    <View style={s.workingIcon}><Text style={{fontSize:20}}>📷</Text></View>
                    <View style={{flex:1}}>
                      <Text style={s.workingTitle}>Show me how you got there</Text>
                      <Text style={s.workingSub}>Optional — great practice</Text>
                    </View>
                    <Text style={s.workingArrow}>{showWorking ? '↑' : '›'}</Text>
                  </TouchableOpacity>
                  {showWorking && !workingPhoto && (
                    <TouchableOpacity style={s.workingCta} onPress={takeWorkingPhoto} activeOpacity={0.8}>
                      <Text style={s.workingCtaTxt}>📸 Take a photo of your working</Text>
                    </TouchableOpacity>
                  )}
                  {workingPhoto && (
                    <View style={s.workingReceived}>
                      <Image source={{uri:workingPhoto}} style={s.workingThumb} resizeMode="cover"/>
                      <View style={{flex:1}}>
                        <Text style={s.workingReceivedLbl}>Working received ✓</Text>
                        {assessingWorking ? <ActivityIndicator size="small" color={T_GOLD}/> : <Text style={s.workingReceivedSub}>Zaeli has checked your approach</Text>}
                      </View>
                    </View>
                  )}
                </View>
              )}
              {workingFeedback !== '' && (
                <View style={s.bz}>
                  <Text style={s.bzName}>✦ Zaeli on your working</Text>
                  <Text style={s.bzText}>{workingFeedback}</Text>
                </View>
              )}

              {/* Next — only after feedback loads */}
              {!feedbackLoading && feedback !== '' && (
                <TouchableOpacity style={s.cta} onPress={nextQuestion} activeOpacity={0.85}>
                  <Text style={s.ctaTxt}>Next question →</Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {/* ── SENIOR ── */}
          {!loading && question && !isMC(question) && (
            <>
              <View style={s.qCard}>
                <View style={s.qTop}>
                  <Text style={s.qMeta}>Year {yearLevel} {subject}</Text>
                  <Text style={s.qText}>{(question as SeniorQuestion).question}</Text>
                </View>
                <View style={{padding:14}}>
                  <View style={s.bz}>
                    <Text style={s.bzName}>✦ Zaeli</Text>
                    <Text style={s.bzText}>{(question as SeniorQuestion).zaeliPrompt}</Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity style={s.socraticBtn} onPress={openSheet} activeOpacity={0.82}>
                <Text style={s.socraticBtnTxt}>🧠 Talk me through it</Text>
              </TouchableOpacity>

              {!seniorSubmitted && (
                <>
                  <View style={s.workingsPrompt}>
                    <View style={s.workingsPromptOrb}/>
                    <Text style={s.wpIcon}>📷</Text>
                    <Text style={s.wpLabel}>When you're ready</Text>
                    <Text style={s.wpTitle}>Show me your{'\n'}working out</Text>
                    <Text style={s.wpSub}>Take a photo and I'll check your approach — not just your answer.</Text>
                    {seniorPhoto ? (
                      <View style={{alignItems:'center',gap:8}}>
                        <Image source={{uri:seniorPhoto}} style={s.seniorThumb} resizeMode="cover"/>
                        <TouchableOpacity onPress={takeSeniorPhoto}><Text style={s.retakeTxt}>Retake</Text></TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity style={s.wpBtn} onPress={takeSeniorPhoto} activeOpacity={0.85}>
                        <Text style={s.wpBtnTxt}>📸 Take a photo</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <Text style={s.orTxt}>or type your answer below</Text>
                  <View style={s.seniorInputWrap}>
                    <TextInput style={s.seniorInput} value={seniorAnswer} onChangeText={setSeniorAnswer} placeholder="Write your answer here…" placeholderTextColor={INK2} multiline/>
                    <TouchableOpacity style={s.seniorSubmitBtn} onPress={submitSeniorAnswer} activeOpacity={0.85} disabled={assessingSenior}>
                      <Text style={s.seniorSubmitTxt}>Submit →</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
              {assessingSenior && <View style={s.loadingWrap}><ActivityIndicator color={T_GOLD}/><Text style={s.loadingTxt}>Zaeli is checking…</Text></View>}
              {seniorSubmitted && seniorFeedback !== '' && (
                <>
                  <View style={[s.bz,{marginHorizontal:18,marginBottom:10}]}>
                    <Text style={s.bzName}>✦ Zaeli on your working</Text>
                    <Text style={s.bzText}>{seniorFeedback}</Text>
                  </View>
                  <TouchableOpacity style={s.cta} onPress={nextQuestion} activeOpacity={0.85}>
                    <Text style={s.ctaTxt}>Next question →</Text>
                  </TouchableOpacity>
                </>
              )}
            </>
          )}

        </ScrollView>
      </View>

      {/* ══════════════════════════════════════════
          SOCRATIC BOTTOM SHEET
      ══════════════════════════════════════════ */}
      <Modal visible={sheetVisible} transparent animationType="none" onRequestClose={closeSheet}>
        <Animated.View style={[s.sheet, { transform: [{ translateY: slideAnim }] }]}>

          {/* Sheet header */}
          <View style={s.sheetHdr}>
            <View style={s.sheetHdrOrb}/>
            <SafeAreaView edges={['top']}>
              <View style={s.sheetHdrInner}>
                <View style={s.sheetHdrRow}>
                  <View style={{flex:1}}>
                    <Text style={s.sheetHdrLabel}>🧠 Zaeli · Tutoring</Text>
                    <Text style={s.sheetHdrQ} numberOfLines={2}>{question && isMC(question) ? question.question : (question as SeniorQuestion)?.question ?? ''}</Text>
                  </View>
                  <TouchableOpacity onPress={closeSheet} style={s.sheetClose} activeOpacity={0.75}>
                    <Text style={s.sheetCloseTxt}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </SafeAreaView>
          </View>

          {/* Chat area */}
          <ScrollView
            ref={chatScrollRef}
            style={s.chatArea}
            contentContainerStyle={s.chatContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {chatMessages.map((msg, i) => (
              <View key={i}>
                {msg.role === 'zaeli' ? (
                  <View style={s.bzChat}>
                    <Text style={s.bzName}>✦ Zaeli</Text>
                    <Text style={s.bzText}>{msg.content}</Text>
                  </View>
                ) : (
                  <View style={s.bcWrap}>
                    {msg.imageUri && <Image source={{uri:msg.imageUri}} style={s.chatPhoto} resizeMode="cover"/>}
                    {msg.content !== 'Here is a photo.' && (
                      <View style={s.bc}><Text style={s.bcText}>{msg.content}</Text></View>
                    )}
                  </View>
                )}
              </View>
            ))}
            {chatSending && (
              <View style={s.bzChat}>
                <Text style={s.bzName}>✦ Zaeli</Text>
                <ActivityIndicator size="small" color={T_GOLD} style={{alignSelf:'flex-start'}}/>
              </View>
            )}

            {/* Ready to try button */}
            {showReadyBtn && !chatSending && (
              <TouchableOpacity style={s.readyBtn} onPress={closeSheet} activeOpacity={0.85}>
                <Text style={s.readyBtnTxt}>Yes, let's go! →</Text>
              </TouchableOpacity>
            )}
          </ScrollView>

          {/* Input bar */}
          <KeyboardAvoidingView behavior={Platform.OS==='ios' ? 'padding' : undefined}>
            <View style={[s.chatInputBar, {paddingBottom: insets.bottom + 8}]}>
              <View style={s.chatInputRow}>
                <TextInput
                  style={s.chatInput}
                  value={chatInput}
                  onChangeText={setChatInput}
                  placeholder="Type your answer…"
                  placeholderTextColor={INK2}
                  multiline
                  returnKeyType="send"
                  onSubmitEditing={sendChatMessage}
                />
                <TouchableOpacity style={s.chatSendBtn} onPress={sendChatMessage} activeOpacity={0.85}>
                  <Text style={s.chatSendTxt}>↑</Text>
                </TouchableOpacity>
              </View>
              <View style={s.chatActions}>
                <TouchableOpacity style={[s.chatActionBtn, recording && s.chatActionBtnActive]} onPress={toggleVoice} activeOpacity={0.8}>
                  <Text style={[s.chatActionTxt, recording && s.chatActionTxtActive]}>{recording ? '⏹ Stop' : '🎤 Voice'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.chatActionBtn} onPress={sendChatPhoto} activeOpacity={0.8}>
                  <Text style={s.chatActionTxt}>📸 Photo</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>

        </Animated.View>
      </Modal>

    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:    { flex:1, backgroundColor:T_DARK },
  content: { flex:1, backgroundColor:BG },

  practiceHdr:    { backgroundColor:T_DARK, paddingHorizontal:22, paddingTop:14, paddingBottom:20, position:'relative', overflow:'hidden' },
  practiceHdrOrb: { position:'absolute', right:-40, top:-40, width:180, height:180, borderRadius:90, backgroundColor:'rgba(201,168,76,0.04)' },
  backBtn:      { marginBottom:10 },
  backTxt:      { fontSize:22, color:'rgba(255,255,255,0.65)', fontFamily:'Poppins_400Regular' },
  goldBadge:    { alignSelf:'flex-start', backgroundColor:'rgba(201,168,76,0.18)', borderWidth:1, borderColor:'rgba(201,168,76,0.35)', borderRadius:20, paddingHorizontal:10, paddingVertical:4, marginBottom:9 },
  goldBadgeTxt: { fontFamily:'Poppins_700Bold', fontSize:11, color:T_GOLD, letterSpacing:1.2, textTransform:'uppercase' },
  heroTitle:    { fontFamily:'DMSerifDisplay_400Regular', fontSize:34, color:'#fff', letterSpacing:-0.8, marginBottom:5 },
  heroSub:      { fontFamily:'Poppins_400Regular', fontSize:14, color:'rgba(255,255,255,0.55)' },

  chips:     { flexDirection:'row', gap:8, paddingHorizontal:18, paddingTop:14, paddingBottom:6, flexWrap:'wrap' },
  chip:      { paddingHorizontal:14, paddingVertical:8, borderRadius:20, borderWidth:1.5, borderColor:BORDER, backgroundColor:CARD },
  chipOn:    { backgroundColor:T_DARK, borderColor:T_DARK },
  chipTxt:   { fontFamily:'Poppins_600SemiBold', fontSize:13, color:INK2 },
  chipTxtOn: { color:'#fff' },

  progWrap:    { marginHorizontal:18, marginTop:4, marginBottom:12 },
  progLblRow:  { flexDirection:'row', justifyContent:'space-between', marginBottom:6 },
  progLblTxt:  { fontFamily:'Poppins_600SemiBold', fontSize:12, color:INK2 },
  progCorrect: { fontFamily:'Poppins_700Bold', fontSize:12, color:T_GOLD2 },
  progTrack:   { height:6, backgroundColor:'rgba(0,0,0,0.06)', borderRadius:4, overflow:'hidden' },
  progFill:    { height:6, backgroundColor:T_DARK, borderRadius:4 },

  loadingWrap: { alignItems:'center', paddingVertical:40, gap:12 },
  loadingTxt:  { fontFamily:'Poppins_400Regular', fontSize:14, color:INK2 },

  transitionCard: { marginHorizontal:18, marginBottom:12, backgroundColor:T_GOLDL, borderWidth:1.5, borderColor:'rgba(201,168,76,0.2)', borderRadius:14, padding:14 },
  transitionTxt:  { fontFamily:'Poppins_600SemiBold', fontSize:14, color:T_GOLD2 },

  qCard: { marginHorizontal:18, marginBottom:10, backgroundColor:CARD, borderRadius:18, borderWidth:1.5, borderColor:BORDER, overflow:'hidden' },
  qTop:  { padding:18, paddingBottom:14, borderBottomWidth:1, borderBottomColor:BORDER },
  qMeta: { fontFamily:'Poppins_700Bold', fontSize:11, textTransform:'uppercase', letterSpacing:1.2, color:INK3, marginBottom:8 },
  qText: { fontFamily:'Poppins_600SemiBold', fontSize:17, color:INK, lineHeight:25, letterSpacing:-0.2 },
  qOpts: { padding:12, paddingHorizontal:18, paddingBottom:16, gap:8 },
  qOpt:           { paddingVertical:13, paddingHorizontal:14, borderRadius:12, borderWidth:1.5, borderColor:BORDER, flexDirection:'row', alignItems:'center', gap:10 },
  qOptSel:        { borderColor:T_DARK, backgroundColor:T_DARKL },
  qOptCorrect:    { borderColor:GREEN, backgroundColor:'rgba(0,201,122,0.06)' },
  qOptWrong:      { borderColor:MAG, backgroundColor:'rgba(224,0,124,0.05)' },
  qOptTxt:        { fontFamily:'Poppins_500Medium', fontSize:15, color:INK, flex:1 },
  qLetter:            { width:26, height:26, borderRadius:8, backgroundColor:'rgba(0,0,0,0.05)', alignItems:'center', justifyContent:'center' },
  qLetterSel:         { backgroundColor:T_GOLD3 },
  qLetterCorrect:     { backgroundColor:'rgba(0,201,122,0.12)' },
  qLetterTxt:         { fontFamily:'Poppins_700Bold', fontSize:11, color:INK2 },
  qLetterTxtSel:      { color:T_GOLD2 },
  qLetterTxtCorrect:  { color:GREEN },

  // Talk me through it button
  socraticBtn:    { marginHorizontal:18, marginBottom:10, backgroundColor:T_GOLDL, borderWidth:1.5, borderColor:'rgba(201,168,76,0.25)', borderRadius:14, paddingVertical:13, alignItems:'center' },
  socraticBtnTxt: { fontFamily:'Poppins_700Bold', fontSize:14, color:T_GOLD2 },

  feedbackLoading:    { flexDirection:'row', gap:10, marginHorizontal:18, marginBottom:10, alignItems:'center' },
  feedbackLoadingTxt: { fontFamily:'Poppins_400Regular', fontSize:13, color:INK2 },

  zf:        { marginHorizontal:18, marginBottom:10, borderRadius:16, padding:14, flexDirection:'row', alignItems:'flex-start', gap:10 },
  zfCorrect: { backgroundColor:'rgba(0,201,122,0.07)', borderWidth:1.5, borderColor:'rgba(0,201,122,0.18)' },
  zfWrong:   { backgroundColor:'rgba(224,0,124,0.05)', borderWidth:1.5, borderColor:'rgba(224,0,124,0.15)' },
  zfIcon:    { fontSize:22, flexShrink:0 },
  zfText:    { fontFamily:'Poppins_400Regular', fontSize:15, color:INK, lineHeight:23, flex:1 },

  hintBtn:     { marginHorizontal:18, marginBottom:10, backgroundColor:T_GOLDL, borderWidth:1.5, borderColor:'rgba(201,168,76,0.3)', borderRadius:20, paddingVertical:11, alignItems:'center' },
  hintBtnTxt:  { fontFamily:'Poppins_700Bold', fontSize:13, color:T_GOLD2 },
  hintCard:    { marginHorizontal:18, marginBottom:10, backgroundColor:'#fffdf5', borderRadius:14, borderWidth:1.5, borderColor:'rgba(201,168,76,0.2)', padding:14 },
  hintLabel:   { fontFamily:'Poppins_700Bold', fontSize:11, color:T_GOLD, textTransform:'uppercase', letterSpacing:0.8, marginBottom:6 },
  hintText:    { fontFamily:'Poppins_400Regular', fontSize:14, color:INK, lineHeight:22 },

  workingsBtn:     { marginHorizontal:18, marginBottom:10, backgroundColor:T_DARK, borderRadius:14, paddingVertical:13, alignItems:'center' },
  workingsBtnTxt:  { fontFamily:'Poppins_700Bold', fontSize:13, color:'#fff' },
  workingsCard:        { marginHorizontal:18, marginBottom:12, backgroundColor:T_DARK, borderRadius:18, overflow:'hidden' },
  workingsCardHeader:  { flexDirection:'row', alignItems:'center', gap:10, padding:16, paddingBottom:12, borderBottomWidth:1, borderBottomColor:'rgba(255,255,255,0.08)' },
  workingsCardIcon:    { fontSize:18 },
  workingsCardTitle:   { fontFamily:'Poppins_700Bold', fontSize:14, color:T_GOLD },
  workingsText:        { fontFamily:'Poppins_400Regular', fontSize:14, color:'rgba(255,255,255,0.85)', lineHeight:24, padding:16, paddingTop:12 },

  workingCard:        { marginHorizontal:18, marginBottom:12, backgroundColor:CARD, borderRadius:16, borderWidth:1.5, borderColor:BORDER, overflow:'hidden' },
  workingRow:         { padding:14, flexDirection:'row', alignItems:'center', gap:12 },
  workingIcon:        { width:40, height:40, backgroundColor:T_GOLDL, borderRadius:12, alignItems:'center', justifyContent:'center' },
  workingTitle:       { fontFamily:'Poppins_700Bold', fontSize:14, color:T_DARK },
  workingSub:         { fontFamily:'Poppins_400Regular', fontSize:12, color:INK2, marginTop:2 },
  workingArrow:       { fontSize:18, color:INK3 },
  workingCta:         { margin:12, marginTop:4, backgroundColor:T_DARK, borderRadius:14, padding:14, alignItems:'center' },
  workingCtaTxt:      { fontFamily:'Poppins_700Bold', fontSize:14, color:'#fff' },
  workingReceived:    { borderTopWidth:1, borderTopColor:'rgba(201,168,76,0.15)', backgroundColor:T_GOLDL, padding:12, flexDirection:'row', alignItems:'center', gap:10 },
  workingThumb:       { width:50, height:50, borderRadius:10 },
  workingReceivedLbl: { fontFamily:'Poppins_700Bold', fontSize:12, color:T_GOLD2 },
  workingReceivedSub: { fontFamily:'Poppins_400Regular', fontSize:11, color:INK2, marginTop:2 },

  bz:     { marginHorizontal:18, marginBottom:10, backgroundColor:CARD, borderRadius:18, borderTopLeftRadius:4, padding:14, borderWidth:1, borderColor:'rgba(0,0,0,0.05)' },
  bzName: { fontFamily:'Poppins_700Bold', fontSize:11, color:T_GOLD, marginBottom:5, textTransform:'uppercase', letterSpacing:0.8 },
  bzText: { fontFamily:'Poppins_400Regular', fontSize:15, color:INK, lineHeight:23 },

  cta:    { marginHorizontal:18, marginTop:4, marginBottom:8, backgroundColor:T_DARK, borderRadius:16, padding:16, alignItems:'center' },
  ctaTxt: { fontFamily:'Poppins_700Bold', fontSize:15, color:'#fff' },

  workingsPrompt:    { marginHorizontal:18, marginBottom:4, backgroundColor:T_DARK, borderRadius:18, padding:22, alignItems:'center', gap:10, overflow:'hidden', position:'relative' },
  workingsPromptOrb: { position:'absolute', right:-30, top:-30, width:120, height:120, borderRadius:60, backgroundColor:'rgba(201,168,76,0.06)' },
  wpIcon:  { fontSize:34 },
  wpLabel: { fontFamily:'Poppins_700Bold', fontSize:11, color:T_GOLD, textTransform:'uppercase', letterSpacing:1.2 },
  wpTitle: { fontFamily:'DMSerifDisplay_400Regular', fontSize:24, color:'#fff', letterSpacing:-0.4, textAlign:'center', lineHeight:30 },
  wpSub:   { fontFamily:'Poppins_400Regular', fontSize:13, color:'rgba(255,255,255,0.5)', textAlign:'center', lineHeight:20 },
  wpBtn:   { backgroundColor:T_GOLD, borderRadius:14, paddingHorizontal:24, paddingVertical:13, marginTop:4 },
  wpBtnTxt:{ fontFamily:'Poppins_700Bold', fontSize:14, color:T_DARK },

  seniorThumb:     { width:100, height:100, borderRadius:12 },
  retakeTxt:       { fontFamily:'Poppins_600SemiBold', fontSize:13, color:T_GOLD },
  orTxt:           { fontFamily:'Poppins_400Regular', fontSize:14, color:INK2, textAlign:'center', marginVertical:10 },
  seniorInputWrap: { marginHorizontal:18, backgroundColor:CARD, borderRadius:16, borderWidth:1.5, borderColor:BORDER, padding:14, marginBottom:12 },
  seniorInput:     { fontFamily:'Poppins_400Regular', fontSize:15, color:INK, minHeight:50 },
  seniorSubmitBtn: { backgroundColor:T_DARK, borderRadius:12, padding:13, alignItems:'center', marginTop:10 },
  seniorSubmitTxt: { fontFamily:'Poppins_700Bold', fontSize:14, color:'#fff' },

  // ── Socratic sheet ──
  sheet:       { position:'absolute', top:0, left:0, right:0, bottom:0, backgroundColor:BG },
  sheetHdr:    { backgroundColor:T_DARK, overflow:'hidden' },
  sheetHdrOrb: { position:'absolute', right:-30, top:-30, width:120, height:120, borderRadius:60, backgroundColor:'rgba(201,168,76,0.06)' },
  sheetHdrInner: { paddingHorizontal:20, paddingTop:12, paddingBottom:16 },
  sheetHdrRow:   { flexDirection:'row', alignItems:'flex-start', gap:12 },
  sheetHdrLabel: { fontFamily:'Poppins_700Bold', fontSize:11, color:T_GOLD, textTransform:'uppercase', letterSpacing:0.8, marginBottom:4 },
  sheetHdrQ:     { fontFamily:'Poppins_600SemiBold', fontSize:15, color:'#fff', lineHeight:22 },
  sheetClose:    { width:34, height:34, borderRadius:10, backgroundColor:'rgba(255,255,255,0.12)', alignItems:'center', justifyContent:'center', flexShrink:0 },
  sheetCloseTxt: { fontSize:14, color:'rgba(255,255,255,0.7)', fontFamily:'Poppins_600SemiBold' },

  chatArea:    { flex:1, backgroundColor:'#F4F6FA' },
  chatContent: { padding:14, paddingHorizontal:18, gap:10, paddingBottom:8 },

  bzChat: { maxWidth:'84%', backgroundColor:CARD, borderRadius:18, borderTopLeftRadius:4, padding:14, shadowColor:'#000', shadowOpacity:0.05, shadowRadius:8, shadowOffset:{width:0,height:2}, borderWidth:1, borderColor:'rgba(0,0,0,0.05)' },
  bcWrap: { alignItems:'flex-end' },
  bc:     { maxWidth:'74%', backgroundColor:T_DARK, borderRadius:18, borderTopRightRadius:4, padding:14 },
  bcText: { fontFamily:'Poppins_400Regular', fontSize:15, color:'#fff', lineHeight:22 },
  chatPhoto: { width:180, height:130, borderRadius:14, marginBottom:4, alignSelf:'flex-end' },

  readyBtn:    { alignSelf:'center', backgroundColor:GREEN, borderRadius:16, paddingHorizontal:28, paddingVertical:14, marginTop:10, marginBottom:4 },
  readyBtnTxt: { fontFamily:'Poppins_700Bold', fontSize:15, color:'#fff' },

  chatInputBar:  { backgroundColor:CARD, borderTopWidth:1, borderTopColor:BORDER, paddingHorizontal:14, paddingTop:10 },
  chatInputRow:  { flexDirection:'row', alignItems:'flex-end', gap:8, marginBottom:9 },
  chatInput:     { flex:1, backgroundColor:'#F7F7F7', borderRadius:24, borderWidth:1.5, borderColor:BORDER, paddingHorizontal:16, paddingVertical:11, fontSize:15, color:INK, maxHeight:100, fontFamily:'Poppins_400Regular' },
  chatSendBtn:   { width:46, height:46, backgroundColor:T_DARK, borderRadius:23, alignItems:'center', justifyContent:'center' },
  chatSendTxt:   { fontSize:20, color:'#fff' },
  chatActions:       { flexDirection:'row', gap:7, marginBottom:4 },
  chatActionBtn:     { flex:1, backgroundColor:'#F7F7F7', borderRadius:12, borderWidth:1.5, borderColor:BORDER, paddingVertical:11, alignItems:'center' },
  chatActionBtnActive: { backgroundColor:T_GOLDL, borderColor:'rgba(201,168,76,0.25)' },
  chatActionTxt:     { fontFamily:'Poppins_600SemiBold', fontSize:13, color:INK2 },
  chatActionTxtActive: { color:T_GOLD2 },
});
