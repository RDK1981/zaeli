/**
 * Tutor Session Screen — Unified Session Engine
 * app/(tabs)/tutor-session.tsx
 *
 * Screens 3-9 from zaeli-tutor-final-mockup-v4_1.html
 * Handles all 6 pillars with pillar-specific UI:
 *   Practice/Comprehension: progress bar + hint/next pill + MC
 *   Homework: free conversation, no progress bar
 *   Read Aloud: mic-highlighted, voice-first
 *   Write & Review: text input focused, feedback cards
 *   Money & Life: amber theme variant
 *
 * Core engine: Sonnet-powered conversation with curriculum-aware prompts.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, StatusBar as RNStatusBar,
  ActivityIndicator, Dimensions, Keyboard, ActionSheetIOS, Alert,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Svg, { Polyline, Line, Rect, Path, Polygon } from 'react-native-svg';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '../../lib/supabase';
import { callClaude } from '../../lib/api-logger';
import { getCurriculumPrompt, getMoneyLevelPrompt, getTopicChips, DIFFICULTY_RULES, HINT_RULES } from './tutor-curriculum';
import { generateSessionSummary } from '../../lib/tutor-summaries';

// ── Constants ─────────────────────────────────────────────────
const FAMILY_ID = '00000000-0000-0000-0000-000000000001';
const SONNET = 'claude-sonnet-4-6';
const WHISPER_URL = 'https://api.openai.com/v1/audio/transcriptions';
const ANTHROPIC_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? '';
const OPENAI_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? '';
const { width: W, height: H } = Dimensions.get('window');

// Palette
const LAV       = '#D8CCFF';
const PURPLE    = '#5020C0';
const PURPLE_D  = '#3010A0';
const PURPLE_L  = '#EDE8FF';
const MINT      = '#A8E8CC';
const MINT_BG   = 'rgba(168,232,204,0.15)';
const MINT_BD   = 'rgba(168,232,204,0.3)';
const INK       = '#0A0A0A';
const INK2      = 'rgba(0,0,0,0.42)';
const INK3      = 'rgba(0,0,0,0.35)';
const CORAL     = '#FF4545';
const GREEN     = '#22C55E';
const RED       = '#EF4444';
const AMBER     = '#F59E0B';
const BODY_BG   = '#FFFFFF';

// Pillar display names
const PILLAR_NAMES: Record<string, string> = {
  'homework': 'Homework',
  'practice': 'Practice',
  'read-aloud': 'Read Aloud',
  'write-review': 'Write & Review',
  'comprehension': 'Comprehension',
  'money-life': 'Money & Life',
};

// Which pillars get progress bar + hint/next pill
const STRUCTURED_PILLARS = ['practice', 'comprehension', 'money-life'];

// Family colours
const FAMILY_COLOURS: Record<string, string> = {
  Rich: '#4D8BFF', Anna: '#FF7B6B', Poppy: '#A855F7', Gab: '#22C55E', Duke: '#F59E0B',
};

// ── Types ─────────────────────────────────────────────────────
interface Message {
  id: string;
  role: 'zaeli' | 'child';
  content: string;
  chips?: string[];
  mcOptions?: MCOption[];
  techniqueCard?: { label: string; content: string; caption?: string };
  imageUri?: string;
  timestamp: Date;
}

interface MCOption {
  label: string;
  text: string;
  correct?: boolean;
  selected?: boolean;
}

// ── SVG Icons ────────────────────────────────────────────────
function IcoBack({ color = INK, size = 12 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={2.5} strokeLinecap="round">
      <Polyline points="15 18 9 12 15 6" />
    </Svg>
  );
}

function IcoMic({ color = 'rgba(0,0,0,0.32)', size = 18 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={1.8} strokeLinecap="round">
      <Rect x={9} y={2} width={6} height={11} rx={3} />
      <Path d="M5 10a7 7 0 0014 0" />
      <Line x1={12} y1={19} x2={12} y2={23} />
      <Line x1={8} y1={23} x2={16} y2={23} />
    </Svg>
  );
}

function IcoSend({ color = '#fff', size = 13 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={2.5} strokeLinecap="round">
      <Line x1={12} y1={19} x2={12} y2={5} />
      <Polyline points="5 12 12 5 19 12" />
    </Svg>
  );
}

// ── Chat action icons (same as main Zaeli chat) ─────────────
function IcoPlay({ color = INK3 }: { color?: string }) {
  return <Svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><Polygon points="5 3 19 12 5 21 5 3"/></Svg>;
}
function IcoCopy({ color = INK3 }: { color?: string }) {
  return <Svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><Rect x="9" y="9" width="13" height="13" rx="2"/><Path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></Svg>;
}
function IcoForward({ color = INK3 }: { color?: string }) {
  return <Svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><Line x1="22" y1="2" x2="11" y2="13"/><Polygon points="22 2 15 22 11 13 2 9 22 2"/></Svg>;
}

// ── Whisper spelling fix ─────────────────────────────────────
function fixZaeliSpelling(text: string): string {
  return text.replace(/\b(zelie|zeli|zayli|zaylee|zaily|zalie|zellie|zailee|zaelie|xaeli|xaily|xaylee|zayeli)\b/gi, 'Zaeli');
}

// ── System prompt builder ────────────────────────────────────
function buildSystemPrompt(childName: string, yearLevel: number, pillar: string, subject?: string, topic?: string) {
  // Get real curriculum content for this year level + subject
  const curriculumContent = subject ? getCurriculumPrompt(yearLevel, subject, topic ?? undefined) : '';

  const base = `You are Zaeli, a warm, sharp, encouraging AI tutor for Australian children. You are helping ${childName}, a Year ${yearLevel} student.

ABSOLUTE RULES:
- Guide thinking. Build confidence. NEVER just give the answer.
- Use Socratic questioning — break problems into small steps, one at a time.
- If correct: confirm warmly, move to next step or question.
- If wrong: say "not quite" gently, give a hint without revealing the answer.
- Keep responses to 2-3 sentences max. Short, clear, age-appropriate.
- Never start with "I". Australian English. Plain text only — no markdown, no asterisks, no bold.
- Always end with a question or prompt that moves the child forward.
- Use Australian contexts: AUD currency, Australian geography, Australian cultural references.

${DIFFICULTY_RULES}

${HINT_RULES}`;

  if (pillar === 'practice') {
    return base + `

SESSION TYPE: Practice
${curriculumContent}

QUESTION FORMAT RULES:
- Generate questions grounded in the curriculum content above.
- Mix of multiple choice and working-out problems.
- For MC questions, format options as: A) option text, B) option text, C) option text, D) option text — each on a new line.
- After each question, WAIT for the child's answer before responding.
- Aim for 6 questions per session. Track which question number you are on.
- When you present a new question, start with "Question [N]." so the app can track progress.
- For Maths above Year 3: after questions requiring working, prompt "show your working" and suggest photo upload.`;
  }

  if (pillar === 'homework') {
    return base + `

SESSION TYPE: Homework Help
${curriculumContent}

- The child will describe or upload a photo of their homework.
- If they upload a photo, describe what you see and identify the specific question.
- Guide them through step by step — never solve it for them.
- Free-flowing conversation, no question count.
- If the child shows working, check their METHOD, not just the answer.
- Celebrate effort and progress, not just correct answers.`;
  }

  if (pillar === 'read-aloud') {
    return base + `

SESSION TYPE: Read Aloud
- Voice-first session. The child will read aloud and you receive the Whisper transcription.
- Analyse fluency, pacing, expression, and accuracy.
- For younger children (Year 1-3): focus on word accuracy, encourage, break down tricky words syllable by syllable. Use a format like: "cat - er - pil - lar" for syllable practice.
- For older children (Year 4+): provide feedback on pace, projection, expression, filler words ("um", "like").
- For presentation practice: give feedback on structure, opening impact, and closing strength.
- Be genuinely enthusiastic about their reading. Every attempt is progress.`;
  }

  if (pillar === 'write-review') {
    return base + `

SESSION TYPE: Write & Review
${curriculumContent}

- The child will type or upload their writing (essays, stories, creative writing).
- Give structured feedback with SPECIFIC before/after examples (max 3 per round).
- Never rewrite the whole piece — teach through targeted suggestions.
- Format feedback as: "Instead of [original phrase], try [improved phrase]" with brief explanation of why.
- Focus on: structure, vocabulary, argument strength, academic register appropriate for Year ${yearLevel}.
- After feedback, ask them to rewrite the section and send it back.`;
  }

  if (pillar === 'comprehension') {
    const isNaplan = [3, 5, 7, 9].includes(yearLevel);
    return base + `

SESSION TYPE: Comprehension
${curriculumContent}

- Present a short passage (150-250 words, appropriate for Year ${yearLevel}), then ask questions.
- Use Australian content and contexts in passages.
- Progress from literal (what does the text say?) to inferential (what can we infer?) to analytical (why did the author choose this?).
${isNaplan ? '- THIS IS A NAPLAN YEAR: include NAPLAN-style question formats (MC with specific wording patterns).\n' : ''}- Include the full passage text clearly before asking the first question.
- Mix of MC and short-answer questions. Aim for 5 questions per passage.
- When you present a new question, start with "Question [N]." so the app can track progress.`;
  }

  if (pillar === 'money-life') {
    // Determine appropriate money level based on year
    const level = yearLevel <= 5 ? 1 : yearLevel <= 8 ? 2 : yearLevel <= 10 ? 3 : 4;
    const moneyContent = getMoneyLevelPrompt(level);
    return base + `

SESSION TYPE: Money & Life (Financial Literacy)
${moneyContent}

QUESTION FORMAT:
- Mix conversational explanations with questions.
- Include "real numbers" examples — show actual calculations with AUD amounts.
- For MC questions, format as A), B), C), D) on separate lines.
- When you present a new topic/question, start with "Topic [N]." so the app can track progress.
- Aim for 5 topics per session.
- After explaining a concept, always ask a follow-up question to check understanding.`;
  }

  return base;
}

// ── Component ────────────────────────────────────────────────
export default function TutorSessionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    childId: string; childName: string; yearLevel: string; pillar: string;
  }>();

  const childName = params.childName ?? 'Poppy';
  const yearLevel = parseInt(params.yearLevel ?? '6', 10);
  const childId = params.childId ?? '';
  const pillar = params.pillar ?? 'practice';
  const colour = FAMILY_COLOURS[childName] ?? '#A855F7';

  const isStructured = STRUCTURED_PILLARS.includes(pillar);
  const isMoneyLife = pillar === 'money-life';
  const isReadAloud = pillar === 'read-aloud';

  // Unique key per session — forces full reset when child/pillar changes
  const sessionKey = `${childId}-${pillar}-${Date.now()}`;
  const sessionKeyRef = useRef(sessionKey);

  // ── State ──
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [subject, setSubject] = useState<string | null>(null);
  const [topic, setTopic] = useState<string | null>(null);
  const [phase, setPhase] = useState<'select' | 'active'>('select');
  const [questionNum, setQuestionNum] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(6);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [hintLevel, setHintLevel] = useState(0);
  const [difficultyBand, setDifficultyBand] = useState<'foundation' | 'core' | 'extension'>('foundation');
  const [consecutiveCorrect, setConsecutiveCorrect] = useState(0);
  const [consecutiveWrong, setConsecutiveWrong] = useState(0);
  const [timer, setTimer] = useState(0);
  const [conversationHistory, setConversationHistory] = useState<{ role: string; content: string }[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [micTimer, setMicTimer] = useState(0);

  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const micTimerRef = useRef<NodeJS.Timeout | null>(null);
  const waveAnims = useRef(Array.from({ length: 7 }, () => new Animated.Value(0.3))).current;
  const waveLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const micOverlayAnim = useRef(new Animated.Value(0)).current;
  const msgIdRef = useRef(0);
  function nextMsgId() { msgIdRef.current += 1; return `msg-${childId}-${pillar}-${msgIdRef.current}`; }

  // ── Full reset when params change (different child or pillar) ──
  useEffect(() => {
    // Clear previous timer
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }

    // Reset all state
    msgIdRef.current = 0;
    setMessages([]);
    setInput('');
    setSending(false);
    setSessionId(null);
    setSubject(null);
    setTopic(null);
    setPhase('select');
    setQuestionNum(0);
    setTotalQuestions(6);
    setHintsUsed(0);
    setHintLevel(0);
    setDifficultyBand('foundation');
    setConsecutiveCorrect(0);
    setConsecutiveWrong(0);
    setTimer(0);
    setConversationHistory([]);

    RNStatusBar.setBarStyle('dark-content', true);
    sendInitialMessage();

    return () => {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    };
  }, [childId, pillar]);

  // ── Timer — start/stop based on phase ──
  useEffect(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (phase === 'active') {
      timerRef.current = setInterval(() => setTimer(t => t + 1), 1000);
    }
    return () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } };
  }, [phase]);

  const timerStr = `${String(Math.floor(timer / 60)).padStart(2, '0')}:${String(timer % 60).padStart(2, '0')}`;

  async function sendInitialMessage() {
    // Load prior difficulty band from tutor_progress (if exists for this child+subject)
    // Note: subject isn't selected yet at session start for Practice pillar,
    // so we'll reload the band when subject is chosen (in sendMessage chip handler)
    let startBand: 'foundation' | 'core' | 'extension' = 'foundation';

    // Create session in Supabase
    try {
      const { data, error } = await supabase
        .from('tutor_sessions')
        .insert({
          family_id: FAMILY_ID,
          child_name: childName,
          pillar,
          mode: pillar,
          status: 'active',
          difficulty_band: startBand,
        })
        .select('id')
        .single();
      if (error) {
        console.error('SESSION CREATE ERROR:', error.message, error.details, error.hint);
      } else if (data) {
        console.log('SESSION CREATED:', data.id);
        setSessionId(data.id);
      }
    } catch (e) {
      console.error('SESSION CREATE EXCEPTION:', e);
    }

    // First Zaeli message based on pillar
    let firstMsg: Message;

    if (pillar === 'practice') {
      firstMsg = {
        id: nextMsgId(),
        role: 'zaeli',
        content: `Hey ${childName}! What subject do you want to practice today?`,
        chips: ['Maths', 'English', 'Science', 'HASS'],
        timestamp: new Date(),
      };
    } else if (pillar === 'homework') {
      firstMsg = {
        id: nextMsgId(),
        role: 'zaeli',
        content: `Let's get your homework sorted. You can tell me what you're working on, take a photo of your worksheet, or just start talking through the problem.`,
        chips: ['\u{1F4F7} Photo my worksheet', "I'll describe it", '\u{1F3A4} Tell Zaeli'],
        timestamp: new Date(),
      };
      setPhase('active');
    } else if (pillar === 'read-aloud') {
      firstMsg = {
        id: nextMsgId(),
        role: 'zaeli',
        content: `Time to read! You can upload a photo of a book page, or just hit the mic and start reading whenever you're ready.`,
        chips: ['\u{1F4F7} Photo of book', "I'm ready to read", 'Presentation practice'],
        timestamp: new Date(),
      };
      setPhase('active');
    } else if (pillar === 'write-review') {
      firstMsg = {
        id: nextMsgId(),
        role: 'zaeli',
        content: `What kind of writing are we working on today? You can type it in the chat, or take a photo if it's on paper.`,
        chips: ['Persuasive essay', 'Narrative / story', 'Report', 'Something else'],
        timestamp: new Date(),
      };
      setPhase('active');
    } else if (pillar === 'comprehension') {
      firstMsg = {
        id: nextMsgId(),
        role: 'zaeli',
        content: `Hey ${childName}! What subject area do you want for comprehension today?`,
        chips: ['English', 'Science', 'HASS', 'Zaeli picks'],
        timestamp: new Date(),
      };
    } else if (pillar === 'money-life') {
      firstMsg = {
        id: nextMsgId(),
        role: 'zaeli',
        content: `Welcome to Money & Life! Real Australian financial literacy \u2014 at your level. Ready to learn how money works?`,
        chips: ['Let\'s go!', 'What will we cover?'],
        timestamp: new Date(),
      };
      setPhase('active');
    } else {
      firstMsg = {
        id: nextMsgId(),
        role: 'zaeli',
        content: `Hey ${childName}! What would you like to work on today?`,
        timestamp: new Date(),
      };
      setPhase('active');
    }

    setMessages([firstMsg]);
  }

  // ── Auto-scroll on new messages ──
  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);
  }, [messages]);

  // ── Send message ──
  async function sendMessage(text: string) {
    if (!text.trim() || sending) return;

    const userMsg: Message = {
      id: nextMsgId(),
      role: 'child',
      content: text.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    if (inputRef.current) inputRef.current.clear();
    Keyboard.dismiss();
    setSending(true);

    // Handle pillar select phase
    if (phase === 'select') {
      await handlePillarSelect(text.trim(), userMsg);
    } else {
      await handleSessionMessage(text.trim(), userMsg);
    }

    setSending(false);
  }

  async function handlePillarSelect(text: string, userMsg: Message) {
    const subjects = ['Maths', 'English', 'Science', 'HASS'];
    const isSubject = subjects.some(s => text.toLowerCase().includes(s.toLowerCase()));

    if (!subject && isSubject) {
      const selectedSubject = subjects.find(s => text.toLowerCase().includes(s.toLowerCase())) ?? text;
      setSubject(selectedSubject);

      // Load prior difficulty band for this child + subject
      try {
        const { data: progressData } = await supabase
          .from('tutor_progress')
          .select('difficulty_band')
          .eq('family_id', FAMILY_ID)
          .eq('child_name', childName)
          .eq('subject', selectedSubject)
          .single();
        if (progressData?.difficulty_band) {
          const band = progressData.difficulty_band as 'foundation' | 'core' | 'extension';
          setDifficultyBand(band);
          console.log(`[tutor] Loaded band for ${childName}/${selectedSubject}: ${band}`);
        } else {
          setDifficultyBand('foundation');
          console.log(`[tutor] No prior band for ${childName}/${selectedSubject}, starting at foundation`);
        }
      } catch {
        setDifficultyBand('foundation');
      }

      // Update session with subject
      if (sessionId) {
        supabase.from('tutor_sessions').update({ subject: selectedSubject }).eq('id', sessionId).then(() => {});
      }

      // Ask for topic — dynamic based on year level + subject
      const topicChips = getTopicChips(yearLevel, selectedSubject);

      const topicMsg: Message = {
        id: nextMsgId(),
        role: 'zaeli',
        content: `Good choice. Is there a specific topic you want to focus on, or shall I pick one from your Year ${yearLevel} curriculum?`,
        chips: topicChips,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, topicMsg]);
      return;
    }

    if (subject && !topic) {
      const selectedTopic = text === 'Zaeli picks' ? null : text;
      setTopic(selectedTopic);

      if (sessionId) {
        supabase.from('tutor_sessions').update({ topic: selectedTopic ?? 'Zaeli picks' }).eq('id', sessionId).then(() => {});
      }

      // Start the session
      setPhase('active');
      setQuestionNum(1);

      // Generate first question via Sonnet — use loaded difficulty band
      await generateAIResponse(`The child has chosen ${subject}${selectedTopic ? ' — ' + selectedTopic : ''}. Start the session with a brief intro and the first question. For practice sessions, aim for 6 questions. Start at the child's current difficulty band.`);
      return;
    }

    // Fallback for comprehension pillar select
    if (pillar === 'comprehension') {
      setSubject(text === 'Zaeli picks' ? 'English' : text);
      setPhase('active');
      setQuestionNum(1);
      await generateAIResponse(`The child wants comprehension practice in ${text}. Present a short passage appropriate for Year ${yearLevel}, then ask the first question about it. Start with a literal comprehension question.`);
      return;
    }
  }

  async function handleSessionMessage(text: string, userMsg: Message) {
    await generateAIResponse(text);
  }

  // ── Conversation summarisation — keep context bounded ──
  const SUMMARISE_AFTER = 8; // Summarise older turns after this many exchanges

  function buildCompactHistory(fullHistory: { role: string; content: string }[], newUserText: string): { role: string; content: string }[] {
    const allMessages = [...fullHistory, { role: 'user', content: newUserText }];

    // If conversation is short enough, return as-is
    if (allMessages.length <= SUMMARISE_AFTER * 2) return allMessages;

    // Split: summarise older messages, keep recent ones in full
    const keepRecent = 8; // Keep last 8 messages (4 exchanges) in full
    const olderMessages = allMessages.slice(0, allMessages.length - keepRecent);
    const recentMessages = allMessages.slice(allMessages.length - keepRecent);

    // Build a compact summary of older exchanges
    const summaryLines: string[] = [];
    for (let i = 0; i < olderMessages.length; i += 2) {
      const child = olderMessages[i]?.content?.slice(0, 60) ?? '';
      const zaeli = olderMessages[i + 1]?.content?.slice(0, 80) ?? '';
      if (child || zaeli) summaryLines.push(`Child: ${child}${child.length >= 60 ? '...' : ''} | Zaeli: ${zaeli}${zaeli.length >= 80 ? '...' : ''}`);
    }

    // Inject summary as a system-style context message
    const summaryMsg = {
      role: 'user',
      content: `[Session context — earlier exchanges summarised]\n${summaryLines.join('\n')}\n[End summary — recent conversation follows]`,
    };

    return [summaryMsg, ...recentMessages];
  }

  async function generateAIResponse(userText: string) {
    try {
      let systemPrompt = buildSystemPrompt(childName, yearLevel, pillar, subject ?? undefined, topic ?? undefined);

      // Dynamic difficulty state (appended fresh each call — not cached)
      let difficultyState = '';
      if (isStructured && subject) {
        difficultyState = `

CURRENT DIFFICULTY STATE:
- Band: ${difficultyBand}
- Consecutive correct (no hints): ${consecutiveCorrect}
- Consecutive wrong on current question: ${consecutiveWrong}
- Hints used this question: ${hintLevel}

BAND RULES — apply these to question difficulty:
- If band is "foundation": ask simpler questions within the year level curriculum. Focus on foundational skills and confidence building.
- If band is "core": ask standard achievement-level questions matching the Year ${yearLevel} curriculum.
- If band is "extension": ask challenging questions that stretch toward the next year level.
- When you present a question, prefix with the band like: [Foundation] Question 3: ... or [Core] Question 3: ... or [Extension] Question 3: ...`;
      }

      // Build conversation history with summarisation for long sessions
      const newHistory = buildCompactHistory(conversationHistory, userText);

      // Use structured system prompt with cache_control for prompt caching
      // The static base prompt + curriculum is cached (saves ~90% on repeated calls)
      // The dynamic difficulty state is NOT cached (changes each turn)
      const systemBlocks: any[] = [
        {
          type: 'text',
          text: systemPrompt,
          cache_control: { type: 'ephemeral' },
        },
      ];
      if (difficultyState) {
        systemBlocks.push({ type: 'text', text: difficultyState });
      }

      const response = await callClaude({
        feature: pillar === 'practice' ? 'tutor_practice' : pillar === 'comprehension' ? 'tutor_practice' : 'tutor_session',
        familyId: FAMILY_ID,
        body: {
          model: SONNET,
          max_tokens: 1200,
          system: systemBlocks,
          messages: newHistory,
        },
      });

      const text = response?.content?.[0]?.text ?? 'Something went wrong — try again.';

      // Parse response for MC options, question tracking, technique cards
      const parsed = parseZaeliResponse(text);

      // Track question number from Sonnet's response
      if (parsed.detectedQuestion > 0 && isStructured) {
        setQuestionNum(parsed.detectedQuestion);
      }

      // ── Detect correct/wrong from Sonnet's response and update band ──
      if (isStructured && phase === 'active') {
        const lower = text.toLowerCase();
        const correctPatterns = ['correct', 'well done', "that's right", 'nice work', 'great job', 'spot on', 'exactly', 'perfect', 'nailed it', 'brilliant', 'you got it'];
        const wrongPatterns = ['not quite', 'try again', 'almost', 'let me help', 'not exactly', 'close but', 'have another go', 'think about', 'not the right'];

        const isCorrectAnswer = correctPatterns.some(p => lower.includes(p));
        const isWrongAnswer = wrongPatterns.some(p => lower.includes(p));

        if (isCorrectAnswer && !isWrongAnswer) {
          if (hintLevel === 0) {
            // Clean correct — no hints used this question
            const newCC = consecutiveCorrect + 1;
            setConsecutiveCorrect(newCC);
            setConsecutiveWrong(0);

            // Check for upgrade: 3 correct in a row without hints
            if (newCC >= 3 && difficultyBand !== 'extension') {
              const newBand = difficultyBand === 'foundation' ? 'core' : 'extension';
              setDifficultyBand(newBand);
              setConsecutiveCorrect(0);
              console.log(`[tutor] Band UPGRADE: ${difficultyBand} -> ${newBand} for ${childName}`);
            }
          } else {
            // Correct but used hints — reset streak
            setConsecutiveCorrect(0);
            setConsecutiveWrong(0);
          }
          setHintLevel(0); // Reset for next question
        } else if (isWrongAnswer && !isCorrectAnswer) {
          const newCW = consecutiveWrong + 1;
          setConsecutiveWrong(newCW);
          setConsecutiveCorrect(0);

          // Check for downgrade: 3 wrong in a row
          if (newCW >= 3 && difficultyBand !== 'foundation') {
            const newBand = difficultyBand === 'extension' ? 'core' : 'foundation';
            setDifficultyBand(newBand);
            setConsecutiveWrong(0);
            console.log(`[tutor] Band DOWNGRADE: ${difficultyBand} -> ${newBand} for ${childName}`);
          }
        }
        // If neither pattern detected (e.g. a follow-up question, explanation), don't change counters
      }

      const zaeliMsg: Message = {
        id: nextMsgId(),
        role: 'zaeli',
        content: parsed.text,
        chips: parsed.chips.length > 0 ? parsed.chips : undefined,
        mcOptions: parsed.mcOptions.length > 0 ? parsed.mcOptions : undefined,
        techniqueCard: parsed.techniqueCard ?? undefined,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, zaeliMsg]);
      setConversationHistory([
        ...newHistory,
        { role: 'assistant', content: text },
      ]);

      // ── Record to Supabase ──
      if (sessionId) {
        // Save both messages
        supabase.from('tutor_messages').insert([
          { session_id: sessionId, role: 'child', content: userText, message_type: 'text' },
          { session_id: sessionId, role: 'zaeli', content: text, message_type: parsed.mcOptions.length > 0 ? 'mc_question' : 'text' },
        ]).then(({ error }) => { if (error) console.error('MSG SAVE ERROR:', error.message, error.details); else console.log('MSG SAVED OK'); });

        // Update session stats
        supabase.from('tutor_sessions').update({
          subject: subject ?? undefined,
          topic: topic ?? undefined,
          question_count: parsed.detectedQuestion > 0 ? parsed.detectedQuestion : undefined,
          hints_used: hintsUsed,
          difficulty_band: difficultyBand,
          duration_seconds: timer,
        }).eq('id', sessionId).then(({ error }) => { if (error) console.error('SESSION UPDATE ERROR:', error.message); });
      } else {
        console.warn('NO SESSION ID — messages not saved');
      }

      setSending(false);
    } catch (e) {
      console.error('Tutor AI error:', e);
      const errorMsg: Message = {
        id: nextMsgId(),
        role: 'zaeli',
        content: 'Hmm, something went wrong on my end. Give me another go?',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMsg]);
      setSending(false);
    }
  }

  // ── Parse Zaeli's response ──
  function parseZaeliResponse(text: string): {
    text: string;
    chips: string[];
    mcOptions: MCOption[];
    techniqueCard: { label: string; content: string; caption?: string } | null;
    detectedQuestion: number;
  } {
    const mcOptions: MCOption[] = [];
    const chips: string[] = [];
    let cleanText = text;
    let techniqueCard = null;
    let detectedQuestion = 0;

    // Detect question number: "Question 3." or "Q3." or "Topic 2."
    const qMatch = text.match(/(?:Question|Q|Topic)\s*(\d+)/i);
    if (qMatch) {
      detectedQuestion = parseInt(qMatch[1], 10);
    }

    // Extract MC options: A) ... B) ... C) ... D) ...
    const mcRegex = /^([A-D])\)\s*(.+)$/gm;
    let match;
    while ((match = mcRegex.exec(text)) !== null) {
      mcOptions.push({ label: match[1], text: match[2].trim() });
    }
    if (mcOptions.length >= 2) {
      // Remove the MC lines from the display text
      cleanText = text.replace(/^[A-D]\)\s*.+$/gm, '').trim();
      // Remove double blank lines
      cleanText = cleanText.replace(/\n{3,}/g, '\n\n');
    }

    return { text: cleanText, chips, mcOptions, techniqueCard, detectedQuestion };
  }

  // ── Hint button ──
  function handleHint() {
    if (hintLevel >= 3 || sending) return;
    const newLevel = hintLevel + 1;
    setHintLevel(newLevel);
    setHintsUsed(prev => prev + 1);
    setSending(true); // Show "Zaeli is thinking..." immediately

    const hintPrompt = newLevel === 1
      ? 'The child tapped Hint. Give Hint 1: show the technique on a DIFFERENT equation/example. Never touch the actual question numbers.'
      : newLevel === 2
      ? 'The child needs Hint 2: show the FIRST STEP of their actual question only. Stop there.'
      : 'The child needs Hint 3: give the full worked example with explanation. Frame it as learning together.';

    generateAIResponse(hintPrompt);
  }

  // ── Next question ──
  function handleNext() {
    // Don't allow skipping if no messages from child yet on this question
    const childMsgCount = messages.filter(m => m.role === 'child').length;
    if (childMsgCount === 0) return; // Can't skip before answering anything

    setHintLevel(0);
    setConsecutiveWrong(0); // Reset wrong counter for new question
    const nextQ = questionNum + 1;
    setQuestionNum(nextQ);
    generateAIResponse(`The child is ready for the next question. This will be Question ${nextQ} of ${totalQuestions}. Generate the next question at the current difficulty band. Remember to start with "[${difficultyBand.charAt(0).toUpperCase() + difficultyBand.slice(1)}] Question ${nextQ}."${nextQ >= totalQuestions ? ' This is the last question — after they answer, give a warm session summary.' : ''}`);
  }

  // ── Chip tap ──
  function handleChipTap(chipText: string) {
    // Intercept camera/photo/mic chips
    const lower = chipText.toLowerCase();
    if (lower.includes('photo') && (lower.includes('worksheet') || lower.includes('book'))) {
      handleCamera();
      return;
    }
    if (lower.includes('tell zaeli') || lower.includes('ready to read')) {
      startRecording();
      return;
    }
    sendMessage(chipText);
  }

  // ── MC option tap ──
  function handleMCTap(msgId: string, optionLabel: string) {
    sendMessage(optionLabel);
  }

  // ── Camera / Photo upload ──
  async function handleCamera() {
    try {
      const { granted } = await ImagePicker.requestCameraPermissionsAsync();
      if (!granted) return;
      const r = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.85 });
      if (r.canceled || !r.assets?.[0]) return;
      await processImage(r.assets[0].uri);
    } catch (e) { console.error('Camera error:', e); }
  }

  async function handlePhotoLibrary() {
    try {
      const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!granted) return;
      const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.85 });
      if (r.canceled || !r.assets?.[0]) return;
      await processImage(r.assets[0].uri);
    } catch (e) { console.error('Photo library error:', e); }
  }

  async function processImage(uri: string) {
    setSending(true);
    try {
      // HEIC → JPEG + resize to 1200px
      const resized = await manipulateAsync(uri, [{ resize: { width: 1200 } }], { compress: 0.7, format: SaveFormat.JPEG });
      const base64 = await FileSystem.readAsStringAsync(resized.uri, { encoding: 'base64' as any });

      // Show user message with photo indicator
      const userMsg: Message = {
        id: nextMsgId(),
        role: 'child',
        content: 'Uploaded a photo',
        imageUri: resized.uri,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, userMsg]);

      // Send to Claude Sonnet vision
      const systemPrompt = buildSystemPrompt(childName, yearLevel, pillar, subject ?? undefined, topic ?? undefined);
      const visionMessage = {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64 } },
          { type: 'text', text: pillar === 'homework'
            ? 'The child has uploaded a photo of their homework/worksheet. Describe what you see, identify the specific questions, and start guiding them through the first one.'
            : pillar === 'read-aloud'
            ? 'The child has uploaded a photo of a book page. Read the text visible and help them prepare to read it aloud.'
            : pillar === 'write-review'
            ? 'The child has uploaded a photo of their writing. Read it carefully and give structured feedback with specific before/after suggestions.'
            : 'The child has uploaded a photo of their working. Check their method step by step — celebrate what is correct, identify where they went wrong.'
          },
        ],
      };

      const newHistory = [...conversationHistory, visionMessage];

      const response = await callClaude({
        feature: 'tutor_vision',
        familyId: FAMILY_ID,
        body: {
          model: SONNET,
          max_tokens: 1200,
          system: systemPrompt,
          messages: newHistory,
        },
      });

      const text = response?.content?.[0]?.text ?? 'I had trouble reading that image. Could you try again?';
      const parsed = parseZaeliResponse(text);

      const zaeliMsg: Message = {
        id: nextMsgId(),
        role: 'zaeli',
        content: parsed.text,
        chips: parsed.chips.length > 0 ? parsed.chips : undefined,
        mcOptions: parsed.mcOptions.length > 0 ? parsed.mcOptions : undefined,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, zaeliMsg]);
      setConversationHistory([...newHistory, { role: 'assistant', content: text }]);

      // Record to Supabase
      if (sessionId) {
        supabase.from('tutor_messages').insert([
          { session_id: sessionId, role: 'child', content: '[Photo uploaded]', message_type: 'photo' },
          { session_id: sessionId, role: 'zaeli', content: text, message_type: 'text' },
        ]).then(() => {});
      }
    } catch (e) {
      console.error('Image processing error:', e);
      setMessages(prev => [...prev, { id: nextMsgId(), role: 'zaeli', content: 'Had trouble with that photo. Could you try again?', timestamp: new Date() }]);
    }
    setSending(false);
  }

  // ── Mic / Whisper ──
  async function startRecording() {
    try {
      Keyboard.dismiss();
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) return;
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      recordingRef.current = recording;
      setIsRecording(true);
      setMicTimer(0);
      Animated.timing(micOverlayAnim, { toValue: 1, duration: 220, useNativeDriver: true }).start();
      micTimerRef.current = setInterval(() => setMicTimer(t => t + 1), 1000);
      // Start waveform animation
      const loops = waveAnims.map((anim, i) =>
        Animated.loop(Animated.sequence([
          Animated.delay(i * 60),
          Animated.timing(anim, { toValue: 1, duration: 400 + (i % 4) * 80, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0.15, duration: 400 + (i % 3) * 80, useNativeDriver: true }),
        ]))
      );
      waveLoopRef.current = Animated.parallel(loops);
      waveLoopRef.current.start();
    } catch (e) { console.error('startRecording:', e); }
  }

  async function stopRecording(cancel = false) {
    try {
      setIsRecording(false);
      if (micTimerRef.current) { clearInterval(micTimerRef.current); micTimerRef.current = null; }
      waveLoopRef.current?.stop();
      waveAnims.forEach(a => a.setValue(0.3));
      Animated.timing(micOverlayAnim, { toValue: 0, duration: 180, useNativeDriver: true }).start();
      if (!recordingRef.current) return;
      const status = await recordingRef.current.getStatusAsync();
      const durationSec = (status as any)?.durationMillis ? (status as any).durationMillis / 1000 : 10;
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      if (!uri || cancel) return;

      // Show thinking indicator
      setSending(true);

      // Whisper transcription
      if (!OPENAI_KEY) { setSending(false); return; }
      const form = new FormData();
      form.append('file', { uri, type: 'audio/m4a', name: 'audio.m4a' } as any);
      form.append('model', 'whisper-1');
      const resp = await fetch(WHISPER_URL, { method: 'POST', headers: { Authorization: `Bearer ${OPENAI_KEY}` }, body: form });
      const data = await resp.json();
      const rawTranscript = data?.text?.trim() ?? '';
      const transcript = fixZaeliSpelling(rawTranscript);

      setSending(false);

      if (!transcript) return;

      // Log Whisper cost
      if (sessionId) {
        supabase.from('tutor_messages').insert({
          session_id: sessionId, role: 'child', content: transcript, message_type: 'voice',
        }).then(() => {});
      }

      // Send transcript as a message
      sendMessage(transcript);
    } catch (e) {
      console.error('stopRecording:', e);
      setSending(false);
    }
  }

  function handleMicPress() {
    if (isRecording) stopRecording();
    else startRecording();
  }

  // ── Attachment button — action sheet ──
  function handleAttachPress() {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Take Photo', 'Choose from Library', 'Cancel'], cancelButtonIndex: 2 },
        (index) => {
          if (index === 0) handleCamera();
          else if (index === 1) handlePhotoLibrary();
        },
      );
    } else {
      Alert.alert('Upload', 'Choose an option', [
        { text: 'Take Photo', onPress: handleCamera },
        { text: 'Choose from Library', onPress: handlePhotoLibrary },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  }

  // ── Render ──
  const headerBg = isMoneyLife ? '#FEF3C7' : LAV;
  const progressColour = isMoneyLife ? AMBER : PURPLE;

  return (
    <View style={[st.safe, { paddingTop: insets.top }]}>
      <RNStatusBar barStyle="dark-content" />

      {/* ── Session header ── */}
      <View style={[st.sessionHeader, { backgroundColor: headerBg }]}>
        <TouchableOpacity style={st.backBtn} onPress={() => {
          if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
          // Save session duration and generate AI summary on exit
          if (sessionId) {
            // Save session with final difficulty band
            supabase.from('tutor_sessions').update({
              duration_seconds: timer,
              hints_used: hintsUsed,
              question_count: questionNum,
              subject: subject ?? undefined,
              topic: topic ?? undefined,
              difficulty_band: difficultyBand,
              status: 'completed',
            }).eq('id', sessionId).then(({ error }) => {
              if (error) console.error('SESSION EXIT SAVE ERROR:', error.message);
              else {
                console.log('SESSION SAVED ON EXIT, duration:', timer, 'band:', difficultyBand);
                // Generate AI summary in background (fire-and-forget)
                generateSessionSummary(sessionId).then(s => {
                  if (s) console.log('SESSION SUMMARY GENERATED:', s.slice(0, 60));
                });
              }
            });

            // Persist difficulty band to tutor_progress for next session
            if (subject) {
              supabase.from('tutor_progress').upsert({
                family_id: FAMILY_ID,
                child_name: childName,
                subject,
                difficulty_band: difficultyBand,
                updated_at: new Date().toISOString(),
              }, { onConflict: 'family_id,child_name,subject' }).then(({ error }) => {
                if (error) console.error('PROGRESS BAND SAVE ERROR:', error.message);
                else console.log(`[tutor] Band saved: ${childName}/${subject} = ${difficultyBand}`);
              });
            }
          }
          router.navigate({ pathname: '/(tabs)/tutor-child', params: { childId, childName, yearLevel: String(yearLevel) } });
        }}>
          <IcoBack color={INK} size={12} />
        </TouchableOpacity>
        <View style={[st.childAv, { backgroundColor: colour }]}>
          <Text style={st.childAvTxt}>{childName[0]}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={st.headerTitle} numberOfLines={1}>
            {PILLAR_NAMES[pillar] ?? 'Session'}{subject ? ' · ' + subject : ''}{topic ? ' · ' + topic : ''}
          </Text>
          <Text style={st.headerSub}>Year {yearLevel} {'·'} {childName}</Text>
        </View>
        {phase === 'active' && (
          <View style={st.timerPill}>
            <Text style={st.timerTxt}>{'\u23F1'} {timerStr}</Text>
          </View>
        )}
      </View>

      {/* ── Question progress bar (structured pillars only) ── */}
      {isStructured && phase === 'active' && (
        <View style={[st.progressBar, { backgroundColor: headerBg }]}>
          {Array.from({ length: totalQuestions }).map((_, i) => (
            <View
              key={i}
              style={[
                st.progressDot,
                { backgroundColor: i < questionNum ? progressColour : 'rgba(0,0,0,0.12)' },
              ]}
            />
          ))}
          <Text style={st.progressLbl}>Q{questionNum} of {totalQuestions}</Text>
        </View>
      )}

      <View style={[st.divider, { backgroundColor: headerBg === LAV ? 'rgba(0,0,0,0.08)' : 'rgba(0,0,0,0.07)' }]} />

      {/* ── Chat area ── */}
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: isMoneyLife ? '#FFFBEB' : BODY_BG }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={-16}
      >
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {messages.map(msg => (
            <View key={msg.id} style={{ marginBottom: 14 }}>
              {msg.role === 'zaeli' ? (
                <View>
                  {/* Zaeli label */}
                  <View style={st.zaeliLabel}>
                    <View style={[st.zaeliDot, { backgroundColor: isMoneyLife ? AMBER : MINT }]} />
                    <Text style={[st.zaeliLblTxt, isMoneyLife && { color: '#92400E' }]}>Zaeli</Text>
                    <Text style={st.zaeliTime}>{msg.timestamp.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}</Text>
                  </View>
                  {/* Zaeli text */}
                  <Text style={st.zaeliText}>{msg.content}</Text>

                  {/* Technique card */}
                  {msg.techniqueCard && (
                    <View style={st.techniqueCard}>
                      <Text style={st.tcLabel}>{msg.techniqueCard.label}</Text>
                      <Text style={st.tcContent}>{msg.techniqueCard.content}</Text>
                      {msg.techniqueCard.caption && <Text style={st.tcCaption}>{msg.techniqueCard.caption}</Text>}
                    </View>
                  )}

                  {/* MC options */}
                  {msg.mcOptions && msg.mcOptions.length > 0 && (
                    <View style={st.mcBox}>
                      {msg.mcOptions.map((opt, i) => (
                        <TouchableOpacity
                          key={i}
                          style={[st.mcOption, opt.selected && (opt.correct ? st.mcCorrect : st.mcWrong)]}
                          onPress={() => handleMCTap(msg.id, opt.label + ' — ' + opt.text)}
                          activeOpacity={0.76}
                        >
                          <View style={[st.mcLabel, opt.selected && (opt.correct ? st.mcLabelOk : st.mcLabelNo)]}>
                            <Text style={[st.mcLabelTxt, opt.selected && { color: '#fff' }]}>{opt.label}</Text>
                          </View>
                          <Text style={st.mcText}>{opt.text}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  {/* Chips */}
                  {msg.chips && msg.chips.length > 0 && (
                    <View style={st.chipRow}>
                      {msg.chips.map((chip, i) => (
                        <TouchableOpacity
                          key={i}
                          style={st.chip}
                          onPress={() => handleChipTap(chip)}
                          activeOpacity={0.76}
                        >
                          <Text style={st.chipTxt}>{chip}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  {/* Zaeli action icons: Play · Copy · Forward · ThumbUp · ThumbDown */}
                  <View style={st.zaeliIconRow}>
                    <TouchableOpacity style={st.iconBtn} activeOpacity={0.6}><IcoPlay color={INK3}/></TouchableOpacity>
                    <TouchableOpacity style={st.iconBtn} onPress={() => { try { require('react-native').Clipboard.setString(msg.content); } catch {} }} activeOpacity={0.6}><IcoCopy color={INK3}/></TouchableOpacity>
                    <TouchableOpacity style={st.iconBtn} onPress={() => { try { require('react-native').Share.share({ message: msg.content }); } catch {} }} activeOpacity={0.6}><IcoForward color={INK3}/></TouchableOpacity>
                  </View>
                </View>
              ) : (
                /* ── Child message bubble ── */
                <View>
                  <View style={st.childRow}>
                    <View style={st.childBubble}>
                      <Text style={st.childBubbleTxt}>{msg.content}</Text>
                    </View>
                  </View>
                  {/* User action icons: Copy · Forward (right-aligned) */}
                  <View style={st.userIconRow}>
                    <TouchableOpacity style={st.iconBtn} onPress={() => { try { require('react-native').Clipboard.setString(msg.content); } catch {} }} activeOpacity={0.6}><IcoCopy color={INK3}/></TouchableOpacity>
                    <TouchableOpacity style={st.iconBtn} onPress={() => { try { require('react-native').Share.share({ message: msg.content }); } catch {} }} activeOpacity={0.6}><IcoForward color={INK3}/></TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          ))}

          {/* Sending indicator */}
          {sending && (
            <View style={st.zaeliLabel}>
              <View style={[st.zaeliDot, { backgroundColor: MINT }]} />
              <ActivityIndicator size="small" color={PURPLE} />
              <Text style={[st.zaeliLblTxt, { marginLeft: 6 }]}>Zaeli is thinking{'…'}</Text>
            </View>
          )}
        </ScrollView>

        {/* ── Hint / Next pill (structured pillars only, after child has answered at least once) ── */}
        {isStructured && phase === 'active' && questionNum >= 1 && messages.some(m => m.role === 'child') && (
          <View style={[st.pillRow, { backgroundColor: isMoneyLife ? '#FFFBEB' : BODY_BG }]}>
            <TouchableOpacity
              style={[
                st.hintPill,
                hintLevel >= 3 && st.hintPillUsed,
                isMoneyLife && { backgroundColor: 'rgba(245,158,11,0.12)', borderColor: 'rgba(245,158,11,0.3)' },
              ]}
              onPress={handleHint}
              activeOpacity={0.76}
              disabled={hintLevel >= 3}
            >
              <Text style={[
                st.hintPillTxt,
                hintLevel >= 3 && { color: 'rgba(0,0,0,0.25)' },
                isMoneyLife && hintLevel < 3 && { color: '#92400E' },
              ]}>
                {hintLevel >= 3 ? 'Hint (used)' : `\u{1F4A1} Hint (${hintLevel}/3)`}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[st.nextPill, isMoneyLife && { backgroundColor: AMBER }]}
              onPress={handleNext}
              activeOpacity={0.76}
            >
              <Text style={st.nextPillTxt}>Next question {'→'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Mic recording overlay — floating pill (matches chat/FAB design) ── */}
        {isRecording && (
          <Animated.View style={{
            position: 'absolute',
            bottom: Platform.OS === 'ios' ? 124 : 110,
            left: 16, right: 16, zIndex: 60,
            flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 12,
            backgroundColor: 'rgba(255,255,255,0.97)',
            borderRadius: 28,
            paddingVertical: 24, paddingHorizontal: 24,
            shadowColor: '#000', shadowOpacity: 0.16, shadowRadius: 32, shadowOffset: { width: 0, height: 12 },
            elevation: 16,
            borderWidth: 1, borderColor: 'rgba(255,255,255,0.98)',
            opacity: micOverlayAnim,
          }}>
            {/* Waveform bars — 7 bars, exact FAB heights */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              {[10, 18, 28, 36, 28, 18, 10].map((h, i) => (
                <Animated.View key={i} style={{ width: 4, height: h, borderRadius: 2, backgroundColor: CORAL, transform: [{ scaleY: waveAnims[i] }] }} />
              ))}
            </View>
            {/* Label */}
            <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: 'rgba(10,10,10,0.45)' }}>{`Listening\u2026`}</Text>
            {/* Cancel / Send buttons */}
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
              <TouchableOpacity onPress={() => stopRecording(true)} activeOpacity={0.75} style={{ flex: 1, backgroundColor: 'rgba(255,69,69,0.09)', borderRadius: 14, paddingVertical: 12, alignItems: 'center' }}>
                <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 14, color: CORAL }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => stopRecording()} activeOpacity={0.75} style={{ flex: 1, backgroundColor: CORAL, borderRadius: 14, paddingVertical: 12, alignItems: 'center' }}>
                <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 14, color: '#fff' }}>{`Send \u2192`}</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}

        {/* ── Chat bar ── */}
        <View style={[st.barWrap, { backgroundColor: isMoneyLife ? '#FFFBEB' : BODY_BG }]}>
          <View style={st.barPill}>
            <TouchableOpacity style={st.barBtn} activeOpacity={0.7} onPress={handleAttachPress}>
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none"
                stroke="rgba(0,0,0,0.4)" strokeWidth={2} strokeLinecap="round">
                <Line x1={12} y1={5} x2={12} y2={19} />
                <Line x1={5} y1={12} x2={19} y2={12} />
              </Svg>
            </TouchableOpacity>
            <View style={st.barSep} />
            <TextInput
              ref={inputRef}
              style={st.barInput}
              placeholder={isRecording ? `Recording... ${micTimer}s` : pillar === 'homework' ? 'Ask about this question...' : pillar === 'read-aloud' ? 'Read aloud or type...' : 'Type or speak...'}
              placeholderTextColor={isRecording ? CORAL : 'rgba(0,0,0,0.3)'}
              value={input}
              onChangeText={setInput}
              onSubmitEditing={() => sendMessage(input)}
              returnKeyType="send"
              multiline={false}
              editable={!isRecording}
            />
            <TouchableOpacity
              style={[st.barBtn, isReadAloud && !isRecording && st.micHighlight, isRecording && { backgroundColor: CORAL, borderRadius: 18 }]}
              activeOpacity={0.7}
              onPress={handleMicPress}
            >
              {isRecording ? (
                <Svg width={14} height={14} viewBox="0 0 24 24" fill="#fff" stroke="none">
                  <Rect x={4} y={4} width={16} height={16} rx={2} />
                </Svg>
              ) : (
                <IcoMic color={isReadAloud ? INK : 'rgba(0,0,0,0.32)'} />
              )}
            </TouchableOpacity>
            <View
              style={st.sendBtn}
              onTouchStart={() => {
                const txt = input;
                setInput('');
                if (inputRef.current) inputRef.current.clear();
                sendMessage(txt);
              }}
            >
              <IcoSend />
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// ── STYLES ────────────────────────────────────────────────────
const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: LAV },

  // ── Session header ──
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  childAv: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  childAvTxt: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 13,
    color: '#fff',
  },
  headerTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 18,
    color: INK,
  },
  headerSub: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: INK2,
  },
  timerPill: {
    backgroundColor: 'rgba(80,32,192,0.1)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  timerTxt: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 14,
    color: PURPLE,
  },

  // ── Progress bar ──
  progressBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 16,
    paddingBottom: 7,
  },
  progressDot: {
    height: 6,
    borderRadius: 3,
    flex: 1,
  },
  progressLbl: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    color: INK3,
    marginLeft: 5,
  },
  divider: {
    height: 1,
  },

  // ── Zaeli message ──
  zaeliLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  zaeliDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  zaeliLblTxt: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: PURPLE,
  },
  zaeliTime: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: 'rgba(0,0,0,0.25)',
  },
  zaeliText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 17,
    color: INK,
    lineHeight: 27,
    letterSpacing: -0.1,
  },

  // ── Message action icons (matches main Zaeli chat) ──
  zaeliIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 7,
    gap: 2,
  },
  userIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 2,
    justifyContent: 'flex-end',
  },
  iconBtn: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },

  // ── Technique card ──
  techniqueCard: {
    backgroundColor: PURPLE_L,
    borderRadius: 13,
    padding: 13,
    marginTop: 10,
    borderLeftWidth: 3,
    borderLeftColor: MINT,
  },
  tcLabel: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: PURPLE,
    marginBottom: 6,
  },
  tcContent: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 15,
    color: PURPLE_D,
    lineHeight: 24,
  },
  tcCaption: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: 'rgba(80,32,192,0.6)',
    marginTop: 6,
    lineHeight: 20,
  },

  // ── MC options ──
  mcBox: { marginTop: 10, gap: 7 },
  mcOption: {
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.11)',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  mcCorrect: { borderColor: GREEN, backgroundColor: '#F0FDF4' },
  mcWrong: { borderColor: RED, backgroundColor: '#FEF2F2' },
  mcLabel: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mcLabelOk: { backgroundColor: GREEN },
  mcLabelNo: { backgroundColor: RED },
  mcLabelTxt: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 14,
    color: INK,
  },
  mcText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 16,
    color: INK,
    flex: 1,
    lineHeight: 23,
  },

  // ── Chips ──
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 10,
  },
  chip: {
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.13)',
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  chipTxt: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 15,
    color: 'rgba(0,0,0,0.55)',
  },

  // ── Child message ──
  childRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  childBubble: {
    backgroundColor: PURPLE_L,
    borderRadius: 16,
    borderTopRightRadius: 3,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '78%',
  },
  childBubbleTxt: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 17,
    color: INK,
    lineHeight: 27,
  },

  // ── Hint / Next pills ──
  pillRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    paddingTop: 8,
  },
  hintPill: {
    flex: 1,
    backgroundColor: MINT_BG,
    borderWidth: 1,
    borderColor: MINT_BD,
    borderRadius: 22,
    paddingVertical: 11,
    alignItems: 'center',
  },
  hintPillUsed: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderColor: 'rgba(0,0,0,0.1)',
  },
  hintPillTxt: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 14,
    color: '#2A8060',
  },
  nextPill: {
    flex: 3,
    backgroundColor: PURPLE,
    borderRadius: 22,
    paddingVertical: 11,
    alignItems: 'center',
  },
  nextPillTxt: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 15,
    color: '#fff',
  },

  // ── Chat bar ──
  barWrap: {
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 24,
  },
  barPill: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(10,10,10,0.09)',
    borderRadius: 30,
    paddingVertical: 8,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -2 },
    elevation: 3,
  },
  barBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  barSep: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(10,10,10,0.1)',
  },
  barInput: {
    flex: 1,
    fontFamily: 'Poppins_400Regular',
    fontSize: 16,
    color: INK,
    paddingVertical: 0,
  },
  micHighlight: {
    backgroundColor: MINT,
    borderRadius: 18,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: CORAL,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
