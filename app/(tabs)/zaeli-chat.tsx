/**
 * Zaeli AI Chat Screen
 * app/(tabs)/zaeli-chat.tsx
 * Matches platform-v5.html s-zaeli-chat exactly
 */

import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Easing,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { detectReminderIntent, scheduleReminder } from '../../lib/notifications';
import { supabase } from '../../lib/supabase';
import { buildMemoryContext, saveConversation } from '../../lib/zaeli-memory';

const DUMMY_FAMILY_ID   = '00000000-0000-0000-0000-000000000001';
const DUMMY_MEMBER_NAME = 'Natalie';

// ── COLOURS ───────────────────────────────────────────────────
const C = {
  blue:    '#0057FF',
  mag:     '#E0007C',
  ink:     '#0A0A0A',
  ink2:    'rgba(0,0,0,0.50)',
  ink3:    'rgba(0,0,0,0.28)',
  border:  'rgba(0,0,0,0.07)',
  bg:      '#F7F7F7',
  chatBg:  '#F4F6FA',
  green:   '#00C97A',
  white:   '#FFFFFF',
};

// ── TYPING DOT ────────────────────────────────────────────────
function TypingDot({ delay }: { delay: number }) {
  const y = useRef(new Animated.Value(0)).current;
  const o = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(y, { toValue:-5, duration:300, easing:Easing.inOut(Easing.sin), useNativeDriver:true }),
        Animated.timing(o, { toValue:1,  duration:300, useNativeDriver:true }),
      ]),
      Animated.parallel([
        Animated.timing(y, { toValue:0,  duration:300, easing:Easing.inOut(Easing.sin), useNativeDriver:true }),
        Animated.timing(o, { toValue:0.3,duration:300, useNativeDriver:true }),
      ]),
      Animated.delay(300),
    ])).start();
  }, []);
  return (
    <Animated.View style={{
      width:7, height:7, borderRadius:4,
      backgroundColor: C.ink3,
      transform:[{translateY:y}], opacity:o,
    }}/>
  );
}

// ── PULSING AVATAR ────────────────────────────────────────────
function PulsingAvatar() {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(scale, { toValue:1.08, duration:1200, easing:Easing.inOut(Easing.sin), useNativeDriver:true }),
      Animated.timing(scale, { toValue:1,    duration:1300, easing:Easing.inOut(Easing.sin), useNativeDriver:true }),
    ])).start();
  }, []);
  return (
    <Animated.View style={[s.av, { transform:[{scale}] }]}>
      <Text style={s.avStar}>✦</Text>
    </Animated.View>
  );
}

// ── TYPES ─────────────────────────────────────────────────────
type Message = {
  id:    string;
  role:  'user' | 'assistant';
  content: string;
  time:  string;
};

function getTime() {
  const n = new Date();
  const h = n.getHours(), m = n.getMinutes().toString().padStart(2,'0');
  return `${h % 12 || 12}:${m} ${h >= 12 ? 'pm' : 'am'}`;
}

// ── BOLD TEXT RENDERER ────────────────────────────────────────
function BoldText({ text, style }: { text:string; style?:any }) {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return (
    <Text style={style}>
      {parts.map((p,i) => i % 2 === 1
        ? <Text key={i} style={{ fontFamily:'Poppins_700Bold' }}>{p}</Text>
        : <Text key={i}>{p}</Text>
      )}
    </Text>
  );
}

// ── CONSTANTS ─────────────────────────────────────────────────
const CTX_CHIPS  = ['Everything','Calendar','Shopping','Kids','Meals','Notes','To-Do'];
const HINTS = [
  "What's on this week?",
  "What should we have for dinner?",
  "How's Jack doing?",
  "Shopping list",
  "Any clashes this week?",
  "Help me plan the weekend",
];

// ── MAIN SCREEN ───────────────────────────────────────────────
export default function ZaeliChatScreen() {
  const router     = useRouter();
  const scrollRef  = useRef<ScrollView>(null);
  const inputRef   = useRef<TextInput>(null);

  const [messages,  setMessages]  = useState<Message[]>([]);
  const [input,     setInput]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const [activeCtx, setActiveCtx] = useState('Everything');
  const [showHints, setShowHints] = useState(true);

  useEffect(() => { loadOpeningGreeting(); }, []);

  // ── OPENING GREETING ───────────────────────────────────────
  const loadOpeningGreeting = async () => {
    setLoading(true);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const [evR, miR, mlR] = await Promise.all([
        supabase.from('events').select('*').eq('family_id',DUMMY_FAMILY_ID).gte('start_time',todayStr).order('start_time').limit(5),
        supabase.from('missions').select('*').eq('family_id',DUMMY_FAMILY_ID).limit(20),
        supabase.from('meal_plans').select('*').eq('family_id',DUMMY_FAMILY_ID).eq('day_key',todayStr).limit(1),
      ]);
      const memCtx = await buildMemoryContext(DUMMY_FAMILY_ID);
      const ctx = `Today's events:${JSON.stringify(evR.data||[])}. Kids missions:${JSON.stringify(miR.data||[])}. Tonight's meal:${JSON.stringify(mlR.data?.[0]||null)}.${memCtx}`;
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method:'POST',
        headers:{'Content-Type':'application/json','x-api-key':process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY||'','anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
        body: JSON.stringify({
          model:'claude-sonnet-4-20250514', max_tokens:120,
          system:`You are Zaeli. Write a warm specific opening greeting for ${DUMMY_MEMBER_NAME}. Mention 2-3 specific things. Bold key info with **word**. Max 35 words. One emoji at the start only.`,
          messages:[{ role:'user', content: ctx }],
        }),
      });
      const d = await res.json();
      const greeting = d.content?.[0]?.text || `Hey ${DUMMY_MEMBER_NAME} 👋 What can I help you with today?`;
      setMessages([{ id:'0', role:'assistant', content:greeting, time:getTime() }]);
    } catch {
      setMessages([{ id:'0', role:'assistant', content:`Hey ${DUMMY_MEMBER_NAME} 👋 What can I help you with today?`, time:getTime() }]);
    } finally {
      setLoading(false);
    }
  };

  // ── SEND MESSAGE ───────────────────────────────────────────
  const send = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput('');
    setShowHints(false);
    Keyboard.dismiss();

    const userMsg: Message = { id: Date.now().toString(), role:'user', content:msg, time:getTime() };
    const next = [...messages, userMsg];
    setMessages(next);
    setLoading(true);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated:true }), 100);

    try {
      const [evR, miR, shR, memR] = await Promise.all([
        supabase.from('events').select('*').eq('family_id',DUMMY_FAMILY_ID).limit(20),
        supabase.from('missions').select('*').eq('family_id',DUMMY_FAMILY_ID).limit(20),
        supabase.from('shopping_items').select('*').eq('family_id',DUMMY_FAMILY_ID).limit(30),
        supabase.from('family_members').select('*').eq('family_id',DUMMY_FAMILY_ID),
      ]);
      const memCtx = await buildMemoryContext(DUMMY_FAMILY_ID);
      const ctx = `Family:${JSON.stringify(memR.data)}. Events:${JSON.stringify(evR.data)}. Kids tasks:${JSON.stringify(miR.data)}. Shopping:${JSON.stringify(shR.data)}. Today:${new Date().toDateString()}.${memCtx}`;
      const history = next.slice(-10).map(m => ({ role:m.role, content:m.content }));

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method:'POST',
        headers:{'Content-Type':'application/json','x-api-key':process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY||'','anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
        body: JSON.stringify({
          model:'claude-sonnet-4-20250514', max_tokens:300,
          system:`You are Zaeli, a deeply knowledgeable family assistant. You know this family's routines, preferences and patterns. Be warm, specific and helpful. Bold key info with **word**. Keep responses concise — 1-3 sentences unless more is genuinely needed. Context: ${ctx}`,
          messages: history,
        }),
      });
      const d = await res.json();
      const reply = d.content?.[0]?.text || 'Sorry, I had trouble with that. Try again?';
      const assistantMsg: Message = { id:(Date.now()+1).toString(), role:'assistant', content:reply, time:getTime() };
      const msgsWithReply = [...next, assistantMsg];
      setMessages(msgsWithReply);
      saveConversation(DUMMY_FAMILY_ID, msg, reply);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated:true }), 150);

      // ── Detect + schedule reminder ────────────────────────
      try {
        const reminder = await detectReminderIntent(msg, reply, DUMMY_FAMILY_ID);
        if (reminder) {
          const notifId = await scheduleReminder(reminder);
          const { error: todoError } = await supabase.from('todos').insert({
            family_id:     DUMMY_FAMILY_ID,
            title:         reminder.title,
            priority:      'high',
            status:        'active',
            due_label:     `Today at ${reminder.remindAt.toLocaleTimeString('en-AU',{ hour:'numeric', minute:'2-digit', hour12:true })}`,
            reminder_time: reminder.remindAt.toISOString(),
            notif_id:      notifId,
          });
          if (todoError) console.log('Todo insert error:', todoError.message);
          const confirmMsg: Message = {
            id:      (Date.now()+2).toString(),
            role:    'assistant',
            content: notifId
              ? `✅ Done! Reminder set for **${reminder.remindAt.toLocaleTimeString('en-AU',{ hour:'numeric', minute:'2-digit', hour12:true })}** — I've also added it to your Today's Focus.`
              : `📝 Added "${reminder.title}" to your Today's Focus.`,
            time: getTime(),
          };
          setMessages(prev => [...prev, confirmMsg]);
          setTimeout(() => scrollRef.current?.scrollToEnd({ animated:true }), 150);
        }
      } catch (e) {
        console.log('Reminder detection error:', e);
      }
    } catch {
      setMessages(prev => [...prev, { id:(Date.now()+1).toString(), role:'assistant', content:"I'm having trouble connecting. Please try again.", time:getTime() }]);
    } finally {
      setLoading(false);
    }
  };

  // ── RENDER ─────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar style="dark"/>

      {/* ── HEADER ──────────────────────────────────────────── */}
      <View style={s.hdr}>
        {/* Back */}
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={s.backArrow}>‹</Text>
        </TouchableOpacity>

        {/* Pulsing avatar */}
        <PulsingAvatar/>

        {/* Name + status — no source pills, more breathing room */}
        <View style={{ flex:1, gap:2 }}>
          <Text style={s.hdrName}>
            {'z'}<Text style={{ color: C.mag }}>{'a'}</Text>{'el'}<Text style={{ color: C.mag }}>{'i'}</Text>
          </Text>
          <Text style={s.hdrStatus}>● Here for your family</Text>
        </View>
      </View>

      {/* ── CONTEXT CHIP BAR ─────────────────────────────────── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.ctxBar}
        contentContainerStyle={{ paddingHorizontal:16, paddingVertical:9, gap:6 }}
      >
        {CTX_CHIPS.map(c => (
          <TouchableOpacity
            key={c}
            style={[s.ctxChip, activeCtx===c && s.ctxChipOn]}
            onPress={() => setActiveCtx(c)}
            activeOpacity={0.8}
          >
            <Text style={[s.ctxChipTxt, activeCtx===c && s.ctxChipTxtOn]}>{c}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── CHAT SCROLL ──────────────────────────────────────── */}
      <ScrollView
        ref={scrollRef}
        style={s.chatScroll}
        contentContainerStyle={{ padding:16, paddingBottom:24 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated:true })}
      >
        {/* Date separator */}
        <Text style={s.dateSep}>
          {new Date().toLocaleDateString('en-AU',{ weekday:'long', day:'numeric', month:'short' }).toUpperCase()}
        </Text>

        {messages.map((m, idx) => {
          const isZaeli  = m.role === 'assistant';
          const showTime = idx === messages.length - 1 || messages[idx+1]?.role !== m.role;
          return (
            <View key={m.id} style={{ marginBottom: showTime ? 14 : 4 }}>
              <View style={[s.bubbleRow, !isZaeli && s.bubbleRowRight]}>
                {/* Zaeli small avatar */}
                {isZaeli && (
                  <View style={s.bubbleAv}>
                    <Text style={s.bubbleAvStar}>✦</Text>
                  </View>
                )}
                <View style={{ maxWidth:'75%' }}>
                  <View style={{ position:'relative' }}>
                    <BoldText
                      text={m.content}
                      style={[s.bubble, isZaeli ? s.bubbleZaeli : s.bubbleUser]}
                    />
                    {/* 🔊 Play button on Zaeli bubbles — ready for voice */}
                    {isZaeli && (
                      <TouchableOpacity style={s.playBtn} activeOpacity={0.7} onPress={() => {}}>
                        <Text style={s.playBtnTxt}>🔊</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  {showTime && (
                    <Text style={[s.bubbleTime, !isZaeli && { textAlign:'right' }]}>{m.time}</Text>
                  )}
                </View>
              </View>
            </View>
          );
        })}

        {/* Typing indicator */}
        {loading && (
          <View style={s.bubbleRow}>
            <View style={s.bubbleAv}>
              <Text style={s.bubbleAvStar}>✦</Text>
            </View>
            <View style={s.typingBubble}>
              <Text style={s.typingLabel}>Thinking…</Text>
              <View style={{ flexDirection:'row', gap:5, alignItems:'center' }}>
                {[0,200,400].map(d => <TypingDot key={d} delay={d}/>)}
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* ── INPUT AREA ────────────────────────────────────────── */}
      <KeyboardAvoidingView behavior={Platform.OS==='ios' ? 'padding' : 'height'}>
        <View style={s.inputArea}>
          <View style={s.inputBox}>
            <TextInput
              ref={inputRef}
              style={s.inputField}
              value={input}
              onChangeText={setInput}
              placeholder="Ask Zaeli anything…"
              placeholderTextColor={C.ink3}
              multiline
              returnKeyType="send"
              onSubmitEditing={() => send()}
              onFocus={() => setShowHints(false)}
            />
            {/* Mic — ready for voice input */}
            <TouchableOpacity style={s.micBtn} activeOpacity={0.7} onPress={() => {}}>
              <Text style={{ fontSize:20 }}>🎙</Text>
            </TouchableOpacity>
            {/* Send */}
            <TouchableOpacity
              style={[s.sendBtn, (!input.trim() || loading) && { opacity:0.4 }]}
              onPress={() => send()}
              disabled={!input.trim() || loading}
              activeOpacity={0.8}
            >
              <Text style={{ fontSize:18, color:'#fff', lineHeight:22 }}>↑</Text>
            </TouchableOpacity>
          </View>

          {/* Hint chips */}
          {showHints && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap:6, paddingTop:10 }}
            >
              {HINTS.map(h => (
                <TouchableOpacity key={h} style={s.hintChip} onPress={() => send(h)} activeOpacity={0.8}>
                  <Text style={s.hintTxt}>{h}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── STYLES ────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex:1, backgroundColor:'#fff' },

  // Header
  hdr: {
    flexDirection:'row', alignItems:'center', gap:12,
    paddingHorizontal:16, paddingVertical:14,
    backgroundColor:'#fff',
    borderBottomWidth:1, borderBottomColor: C.border,
  },
  backBtn:   { width:28, alignItems:'center', justifyContent:'center' },
  backArrow: { fontSize:32, color: C.blue, lineHeight:36, fontFamily:'Poppins_400Regular', marginTop:-4 },
  av: {
    width:44, height:44, borderRadius:14,
    backgroundColor: C.blue,
    alignItems:'center', justifyContent:'center',
    shadowColor: C.blue, shadowOpacity:0.35, shadowRadius:10, shadowOffset:{width:0,height:4},
  },
  avStar:    { fontSize:22, color:'#fff' },
  hdrName:   { fontFamily:'DMSerifDisplay_400Regular', fontSize:26, color: C.ink, lineHeight:30 },
  hdrStatus: { fontFamily:'Poppins_600SemiBold', fontSize:12, color: C.green },

  // Context chip bar
  ctxBar: {
    backgroundColor:'rgba(0,87,255,0.04)',
    borderBottomWidth:1, borderBottomColor: C.border,
    flexGrow:0,
  },
  ctxChip:     { paddingHorizontal:12, paddingVertical:5, borderRadius:20, backgroundColor:'#fff', borderWidth:1.5, borderColor:'rgba(0,0,0,0.10)' },
  ctxChipOn:   { backgroundColor: C.blue, borderColor: C.blue },
  ctxChipTxt:  { fontFamily:'Poppins_600SemiBold', fontSize:11, color: C.ink2 },
  ctxChipTxtOn:{ color:'#fff' },

  // Chat scroll
  chatScroll: { flex:1, backgroundColor: C.chatBg },
  dateSep: {
    fontFamily:'Poppins_700Bold', fontSize:10,
    color: C.ink3, textTransform:'uppercase',
    letterSpacing:1.2, textAlign:'center', marginBottom:16,
  },

  // Bubbles
  bubbleRow:      { flexDirection:'row', gap:10, alignItems:'flex-end' },
  bubbleRowRight: { flexDirection:'row-reverse' },
  bubbleAv: {
    width:34, height:34, borderRadius:11,
    backgroundColor: C.blue,
    alignItems:'center', justifyContent:'center', flexShrink:0,
    shadowColor: C.blue, shadowOpacity:0.2, shadowRadius:6, shadowOffset:{width:0,height:2},
  },
  bubbleAvStar: { fontSize:15, color:'#fff' },
  bubble: {
    paddingHorizontal:15, paddingVertical:12,
    fontFamily:'Poppins_400Regular', fontSize:15, lineHeight:24,
  },
  bubbleZaeli: {
    backgroundColor:'#fff',
    borderRadius:4, borderTopRightRadius:18, borderBottomLeftRadius:18, borderBottomRightRadius:18,
    color: C.ink,
    shadowColor:'#000', shadowOpacity:0.07, shadowRadius:8, shadowOffset:{width:0,height:2},
    paddingBottom:28, // room for play button
  },
  bubbleUser: {
    backgroundColor: C.blue,
    borderRadius:18, borderTopRightRadius:4,
    color:'#fff',
  },
  bubbleTime: {
    fontFamily:'Poppins_400Regular', fontSize:10,
    color: C.ink3, marginTop:5,
  },

  // 🔊 Play button on Zaeli bubbles
  playBtn: {
    position:'absolute', bottom:8, right:10,
    opacity:0.45,
  },
  playBtnTxt: { fontSize:13 },

  // Typing bubble
  typingBubble: {
    backgroundColor:'rgba(0,87,255,0.05)',
    borderWidth:1.5, borderColor:'rgba(0,87,255,0.12)',
    borderRadius:4, borderTopRightRadius:18, borderBottomLeftRadius:18, borderBottomRightRadius:18,
    paddingHorizontal:15, paddingVertical:12,
  },
  typingLabel: {
    fontFamily:'Poppins_700Bold', fontSize:10,
    textTransform:'uppercase', letterSpacing:1,
    color: C.blue, marginBottom:8,
  },

  // Input area
  inputArea: {
    backgroundColor:'#fff',
    borderTopWidth:1, borderTopColor: C.border,
    paddingHorizontal:14, paddingTop:10,
    paddingBottom: Platform.OS==='ios' ? 28 : 12,
  },
  inputBox: {
    flexDirection:'row', alignItems:'center', gap:8,
    backgroundColor: C.bg,
    borderWidth:1.5, borderColor:'rgba(0,0,0,0.10)',
    borderRadius:18, paddingHorizontal:14, paddingVertical:10,
  },
  inputField: {
    flex:1, fontFamily:'Poppins_400Regular', fontSize:15,
    color: C.ink, maxHeight:100,
  },
  micBtn:  { width:34, height:34, alignItems:'center', justifyContent:'center' },
  sendBtn: {
    width:36, height:36, borderRadius:11,
    backgroundColor: C.blue,
    alignItems:'center', justifyContent:'center',
    shadowColor: C.blue, shadowOpacity:0.3, shadowRadius:6, shadowOffset:{width:0,height:2},
  },
  hintChip: {
    paddingHorizontal:14, paddingVertical:7, borderRadius:20,
    backgroundColor: C.bg, borderWidth:1.5, borderColor:'rgba(0,0,0,0.10)',
  },
  hintTxt: { fontFamily:'Poppins_500Medium', fontSize:12, color: C.ink2 },
});