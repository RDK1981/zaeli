import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';

const DUMMY_FAMILY_ID = '00000000-0000-0000-0000-000000000001';
const DUMMY_MEMBER_ID = '00000000-0000-0000-0000-000000000002';
const DUMMY_MEMBER_NAME = 'Sarah';
const LATITUDE = -27.4698;
const LONGITUDE = 153.0251;

// ── BOLD BLOCKS PALETTE ─────────────────────────────────────────────────────
const C = {
  // Hero
  heroTop:    '#0057FF',
  heroBot:    '#0044CC',
  heroCircle: 'rgba(255,255,255,0.09)',
  // Orb
  orb:        '#FFE500',
  orbRing:    'rgba(255,230,0,0.55)',
  // Body — dark
  bg:         '#0A0A0A',
  card:       '#141414',
  border:     '#1E1E1E',
  // Text
  text:       '#FFFFFF',
  text2:      'rgba(255,255,255,0.55)',
  text3:      'rgba(255,255,255,0.28)',
  textDark:   '#111111',
  // Accents
  magenta:    '#E0007C',
  yellow:     '#FFE500',
  blue:       '#4488FF',
  // Dinner card
  dinBg:      '#E0007C',
  dinLabel:   'rgba(0,0,0,0.5)',
  dinText:    '#000000',
  // Nudge
  nudgeBg:    '#141414',
  nudgeOrb:   '#0057FF',
  // Chat
  chatSend:   '#0057FF',
};

const DAYS   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const WMO: Record<number, { emoji: string }> = {
  0:{emoji:'☀️'}, 1:{emoji:'🌤️'}, 2:{emoji:'⛅'}, 3:{emoji:'☁️'},
  45:{emoji:'🌫️'}, 48:{emoji:'🌫️'}, 51:{emoji:'🌦️'}, 61:{emoji:'🌧️'},
  63:{emoji:'🌧️'}, 65:{emoji:'🌧️'}, 71:{emoji:'❄️'}, 80:{emoji:'🌦️'},
  95:{emoji:'⛈️'},
};

// ── CHAT SCREEN ──────────────────────────────────────────────────────────────
function ChatScreen({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const scrollRef               = useRef<ScrollView>(null);

  const SUGGESTIONS = [
    "What's on today?",
    "Who's cooking tonight?",
    "Help me plan the week",
    "Any clashes this week?",
  ];

  const sendMessage = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg) return;
    setInput('');
    Keyboard.dismiss();
    const userMsg    = { role: 'user', content: msg };
    const newMsgs    = [...messages, userMsg];
    setMessages(newMsgs);
    setLoading(true);
    try {
      const [evRes, miRes, memRes] = await Promise.all([
        supabase.from('events').select('*').eq('family_id', DUMMY_FAMILY_ID).limit(20),
        supabase.from('missions').select('*').eq('family_id', DUMMY_FAMILY_ID).limit(20),
        supabase.from('family_members').select('*').eq('family_id', DUMMY_FAMILY_ID),
      ]);
      const ctx = `Family: ${JSON.stringify(memRes.data)}. Events: ${JSON.stringify(evRes.data)}. Tasks: ${JSON.stringify(miRes.data)}. Today: ${new Date().toDateString()}.`;
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY || '', 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: `You are Zaeli, a warm smart family assistant. ${ctx} Be concise, friendly, helpful. Use emojis sparingly.`,
          messages: newMsgs,
        }),
      });
      const data  = await res.json();
      const reply = data.content?.[0]?.text || "I couldn't get a response right now.";
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I'm having trouble connecting right now." }]);
    }
    setLoading(false);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <StatusBar style="light" />
      <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: Platform.OS === 'ios' ? 14 : 30 }}>

        {/* Header */}
        <View style={s.chatHeader}>
          <TouchableOpacity onPress={onClose} style={s.chatBack}>
            <Text style={s.chatBackTxt}>‹ Back</Text>
          </TouchableOpacity>
          <View style={s.chatHeaderCenter}>
            <View style={s.chatAvatar}><Text style={{ fontSize: 16 }}>✦</Text></View>
            <View>
              <Text style={s.chatName}>Zaeli</Text>
              <Text style={s.chatStatus}>● Knows your family</Text>
            </View>
          </View>
          <View style={{ width: 60 }} />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
          keyboardVerticalOffset={88}
        >
          <ScrollView
            ref={scrollRef}
            style={s.chatMessages}
            contentContainerStyle={{ padding: 20, paddingBottom: 20 }}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          >
            {messages.length === 0 && (
              <View style={s.chatEmpty}>
                <View style={s.chatEmptyOrb}><Text style={{ fontSize: 28 }}>✦</Text></View>
                <Text style={s.chatEmptyTitle}>Hi, I'm Zaeli</Text>
                <Text style={s.chatEmptySub}>Ask me anything about your family — schedules, dinner ideas, reminders, or just what's on today.</Text>
                <View style={s.chips}>
                  {SUGGESTIONS.map((sg, i) => (
                    <TouchableOpacity key={i} style={s.chip} onPress={() => sendMessage(sg)}>
                      <Text style={s.chipTxt}>{sg}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
            {messages.map((m, i) => (
              <View key={i} style={[s.bubble, m.role === 'user' ? s.bubbleUser : s.bubbleAI]}>
                {m.role === 'assistant' && (
                  <View style={s.aiAvatar}><Text style={{ fontSize: 12 }}>✦</Text></View>
                )}
                <View style={[s.bubbleInner, m.role === 'user' ? s.bubbleUserInner : s.bubbleAIInner]}>
                  <Text style={[s.bubbleTxt, m.role === 'user' && s.bubbleUserTxt]}>{m.content}</Text>
                </View>
              </View>
            ))}
            {loading && (
              <View style={[s.bubble, s.bubbleAI]}>
                <View style={s.aiAvatar}><Text style={{ fontSize: 12 }}>✦</Text></View>
                <View style={s.bubbleAIInner}>
                  <ActivityIndicator size="small" color={C.magenta} />
                </View>
              </View>
            )}
          </ScrollView>

          <View style={s.chatInputBar}>
            <TextInput
              style={s.chatInput}
              value={input}
              onChangeText={setInput}
              placeholder="Ask Zaeli anything..."
              placeholderTextColor={C.text3}
              multiline
              onSubmitEditing={() => sendMessage()}
            />
            <TouchableOpacity
              style={[s.chatSendBtn, !input.trim() && { opacity: 0.35 }]}
              onPress={() => sendMessage()}
              disabled={!input.trim() || loading}
            >
              <Text style={s.chatSendTxt}>↑</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ── DINNER MODAL ─────────────────────────────────────────────────────────────
function DinnerModal({ visible, onClose, onSaved }: {
  visible: boolean; onClose: () => void; onSaved: () => void;
}) {
  const [meal, setMeal]                   = useState('');
  const [selectedCooks, setSelectedCooks] = useState<string[]>([]);
  const [saving, setSaving]               = useState(false);
  const COOKS = ['Sarah', 'Dad', 'Jack', 'Emma', 'Everyone', 'Takeaway 🍕', 'Eating out 🍽️'];

  const toggle = (name: string) =>
    setSelectedCooks(prev => prev.includes(name) ? prev.filter(c => c !== name) : [...prev, name]);

  const save = async () => {
    if (!meal.trim()) return;
    setSaving(true);
    const today = new Date().toISOString().split('T')[0];
    await supabase.from('meal_plans').upsert({
      family_id:    DUMMY_FAMILY_ID,
      planned_date: today,
      meal_name:    meal.trim(),
      meal_type:    'dinner',
      notes:        selectedCooks.join(', '),
    }, { onConflict: 'family_id,planned_date,meal_type' });
    setSaving(false);
    onSaved();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
        <View style={s.dinHeader}>
          <TouchableOpacity onPress={onClose}><Text style={s.dinCancel}>Cancel</Text></TouchableOpacity>
          <Text style={s.dinTitle}>🍝 Tonight's Dinner</Text>
          <TouchableOpacity onPress={save} disabled={!meal.trim() || saving}>
            <Text style={[s.dinSave, !meal.trim() && { opacity: 0.35 }]}>
              {saving ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={{ padding: 20 }}>
          <Text style={s.dinLabel}>What's for dinner?</Text>
          <TextInput
            style={s.dinInput}
            value={meal}
            onChangeText={setMeal}
            placeholder="e.g. Pasta, Thai takeaway..."
            placeholderTextColor={C.text3}
            autoFocus
          />
          <Text style={s.dinLabel}>Who's cooking?</Text>
          <View style={s.cookRow}>
            {COOKS.map(c => (
              <TouchableOpacity
                key={c}
                style={[s.cookChip, selectedCooks.includes(c) && s.cookChipOn]}
                onPress={() => toggle(c)}
              >
                <Text style={[s.cookChipTxt, selectedCooks.includes(c) && s.cookChipTxtOn]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ── HOME SCREEN ───────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const [weather, setWeather]           = useState<any>(null);
  const [suburb, setSuburb]             = useState('Brisbane');
  const [events, setEvents]             = useState<any[]>([]);
  const [dinner, setDinner]             = useState<any>(null);
  const [chatVisible, setChatVisible]   = useState(false);
  const [dinnerVisible, setDinnerVisible] = useState(false);
  const [briefing, setBriefing]         = useState('');
  const [briefingLoading, setBriefingLoading] = useState(false);

  const pulseAnim   = useRef(new Animated.Value(1)).current;
  const briefFade   = useRef(new Animated.Value(0)).current;

  const now      = new Date();
  const hour     = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const dateStr  = `${DAYS[now.getDay()]}, ${now.getDate()} ${MONTHS[now.getMonth()]}`;

  useEffect(() => {
    loadAll();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.12, duration: 2200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 2200, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const loadAll = async () => {
    await Promise.all([fetchWeather(), fetchEvents(), fetchDinner()]);
    await fetchBriefing();
  };

  const fetchWeather = async () => {
    try {
      const res  = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${LATITUDE}&longitude=${LONGITUDE}&current=temperature_2m,weathercode&timezone=auto`
      );
      const data = await res.json();
      setWeather(data.current);
      const geo     = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${LATITUDE}&lon=${LONGITUDE}&format=json`,
        { headers: { 'User-Agent': 'ZaeliApp/1.0' } }
      );
      const geoData = await geo.json();
      setSuburb(geoData.address?.suburb || geoData.address?.city || 'Brisbane');
    } catch {}
  };

  const fetchEvents = async () => {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase.from('events').select('*')
      .eq('family_id', DUMMY_FAMILY_ID)
      .gte('start_time', `${today}T00:00:00`)
      .lte('start_time', `${today}T23:59:59`)
      .order('start_time');
    if (data) setEvents(data);
  };

  const fetchDinner = async () => {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase.from('meal_plans').select('*')
      .eq('family_id', DUMMY_FAMILY_ID)
      .eq('planned_date', today)
      .eq('meal_type', 'dinner')
      .single();
    setDinner(data ?? null);
  };

  const fetchBriefing = async () => {
    setBriefingLoading(true);
    briefFade.setValue(0);
    try {
      const [evRes, miRes, memRes] = await Promise.all([
        supabase.from('events').select('*').eq('family_id', DUMMY_FAMILY_ID).limit(20),
        supabase.from('missions').select('*').eq('family_id', DUMMY_FAMILY_ID).limit(20),
        supabase.from('family_members').select('*').eq('family_id', DUMMY_FAMILY_ID),
      ]);
      const res  = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY || '', 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 150,
          system: `You are Zaeli, a warm family assistant. Today is ${new Date().toDateString()}. Family: ${JSON.stringify(memRes.data)}. Today's events: ${JSON.stringify(evRes.data)}. Tasks: ${JSON.stringify(miRes.data)}. Write 1-2 short warm sentences briefing the family on today. Be specific about names and times. No intro phrases like "Today" or "Here's your briefing".`,
          messages: [{ role: 'user', content: 'Brief me on today.' }],
        }),
      });
      const data = await res.json();
      setBriefing(data.content?.[0]?.text || '');
    } catch {
      setBriefing("Tap to chat with Zaeli about your day.");
    }
    setBriefingLoading(false);
    Animated.timing(briefFade, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  };

  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true });

  const wmoEntry = WMO[weather?.weathercode] ?? { emoji: '☀️' };
  const temp     = weather ? Math.round(weather.temperature_2m) : null;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar style="light" />
      <ChatScreen   visible={chatVisible}   onClose={() => setChatVisible(false)} />
      <DinnerModal  visible={dinnerVisible} onClose={() => setDinnerVisible(false)} onSaved={fetchDinner} />

      <ScrollView
        style={s.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scrollContent}
      >

        {/* ── MAGENTA HERO ───────────────────────────────────────────────── */}
        <View style={s.hero}>
          {/* decorative circles */}
          <View style={s.heroCircle1} />
          <View style={s.heroCircle2} />

          {/* top row: pill + orb */}
          <View style={s.heroTopRow}>
            <View style={s.heroPill}>
              <Text style={s.heroPillDate}>{dateStr.toUpperCase()}</Text>
              {temp !== null && (
                <Text style={s.heroPillWx}>{wmoEntry.emoji} {temp}° · {suburb}</Text>
              )}
            </View>

            <TouchableOpacity onPress={() => setChatVisible(true)}>
              <View style={s.orbWrap}>
                <Animated.View style={[s.orbRing, { transform: [{ scale: pulseAnim }] }]} />
                <View style={s.orb}><Text style={{ fontSize: 20 }}>✦</Text></View>
              </View>
            </TouchableOpacity>
          </View>

          {/* ── THE HEADING — both lines same big serif, no size difference ── */}
          <Text style={s.heroHeading}>{greeting},{'\n'}{DUMMY_MEMBER_NAME}</Text>

          {/* briefing */}
          {briefingLoading ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18 }}>
              <ActivityIndicator size="small" color="rgba(255,255,255,0.6)" />
              <Text style={s.heroLoadingTxt}>Zaeli is thinking...</Text>
            </View>
          ) : (
            <Animated.Text style={[s.heroBriefing, { opacity: briefFade }]}>
              {briefing}
            </Animated.Text>
          )}

          {/* CTA */}
          <TouchableOpacity style={s.heroCta} onPress={() => setChatVisible(true)} activeOpacity={0.85}>
            <Text style={s.heroCtaTxt}>Chat with Zaeli →</Text>
          </TouchableOpacity>
        </View>

        {/* ── WHITE BODY ─────────────────────────────────────────────────── */}
        <View style={s.body}>

          {/* TODAY EVENTS */}
          <View style={s.section}>
            <Text style={s.sectionLbl}>Today · tap to open calendar</Text>
            {events.length === 0 ? (
              <Text style={s.emptyTxt}>Nothing scheduled · enjoy the quiet ✨</Text>
            ) : (
              events.map(ev => {
                const isPast = new Date(ev.start_time) < now;
                const colour = ev.colour || C.magenta;
                return (
                  <View key={ev.id} style={s.evRow}>
                    <View style={[s.evDot, { backgroundColor: isPast ? '#D0D0D0' : colour }]} />
                    <Text style={[s.evTime, isPast && s.evPast]}>{fmtTime(ev.start_time)}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.evTitle, isPast && s.evPastStrike]}>{ev.title}</Text>
                      {ev.location ? <Text style={s.evMeta}>{ev.location}</Text> : null}
                    </View>
                  </View>
                );
              })
            )}
            <Text style={s.calHint}>View full calendar →</Text>
          </View>

          <View style={s.divider} />

          {/* DINNER — yellow block */}
          <TouchableOpacity style={s.dinCard} onPress={() => setDinnerVisible(true)} activeOpacity={0.88}>
            <View style={{ flex: 1 }}>
              <Text style={s.dinCardLbl}>Tonight's Dinner</Text>
              {dinner ? (
                <>
                  <Text style={s.dinCardMeal}>{dinner.meal_name}</Text>
                  {dinner.notes ? <Text style={s.dinCardCook}>👨‍🍳 {dinner.notes}</Text> : null}
                </>
              ) : (
                <Text style={s.dinCardEmpty}>Nobody knows yet · tap to plan 👀</Text>
              )}
            </View>
            <Text style={s.dinCardArr}>→</Text>
          </TouchableOpacity>

          <View style={{ height: 10 }} />

          {/* ZAELI NUDGE */}
          <TouchableOpacity style={s.nudge} onPress={() => setChatVisible(true)} activeOpacity={0.85}>
            <View style={s.nudgeOrb}>
              <Text style={{ fontSize: 14 }}>✦</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.nudgeTxt}>Ask Zaeli anything</Text>
              <Text style={s.nudgeSub}>Schedules · ideas · reminders · anything</Text>
            </View>
            <Text style={s.nudgeArr}>→</Text>
          </TouchableOpacity>

          <View style={{ height: 32 }} />
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// ── STYLES ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: C.heroTop },
  scroll:       { flex: 1 },
  scrollContent: { paddingBottom: 40 },

  // ── Hero ──
  hero: {
    backgroundColor: C.heroTop,
    // gradient-like feel via overlay — React Native can't do CSS gradients inline,
    // but the two decorative circles + bg colour give depth
    paddingHorizontal: 20,
    paddingTop:        20,
    paddingBottom:     26,
    position:          'relative',
    overflow:          'hidden',
  },
  heroCircle1: {
    position:     'absolute',
    top:          -60,
    right:        -60,
    width:        220,
    height:       220,
    borderRadius: 110,
    backgroundColor: C.heroCircle,
  },
  heroCircle2: {
    position:     'absolute',
    bottom:       -70,
    left:         -40,
    width:        180,
    height:       180,
    borderRadius: 90,
    backgroundColor: 'rgba(0,0,0,0.07)',
  },
  heroTopRow: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'flex-start',
    marginBottom:   18,
    zIndex:         1,
  },
  heroPill: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius:    10,
    paddingHorizontal: 12,
    paddingVertical:   8,
  },
  heroPillDate: {
    fontSize:      9,
    fontWeight:    '700',
    color:         'rgba(255,255,255,0.75)',
    letterSpacing: 1.5,
    lineHeight:    14,
  },
  heroPillWx: {
    fontSize:   12,
    color:      'rgba(255,255,255,0.92)',
    marginTop:  3,
    lineHeight: 16,
  },
  orbWrap: {
    width:    44,
    height:   44,
    alignItems:     'center',
    justifyContent: 'center',
  },
  orbRing: {
    position:     'absolute',
    width:        54,
    height:       54,
    borderRadius: 27,
    borderWidth:  2,
    borderColor:  C.orbRing,
  },
  orb: {
    width:           44,
    height:          44,
    borderRadius:    22,
    backgroundColor: C.orb,
    alignItems:      'center',
    justifyContent:  'center',
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 4 },
    shadowOpacity:   0.25,
    shadowRadius:    8,
    elevation:       6,
  },

  // THE HEADING — both lines same font, same size, no weight change
  heroHeading: {
    fontFamily:    'DMSerifDisplay_400Regular',
    fontSize:      46,
    color:         '#FFFFFF',
    lineHeight:    46,
    letterSpacing: -0.5,
    marginBottom:  14,
    zIndex:        1,
  },

  heroLoadingTxt: {
    fontSize:    14,
    color:       'rgba(255,255,255,0.6)',
    fontStyle:   'italic',
    marginBottom: 18,
  },
  heroBriefing: {
    fontSize:    14,
    color:       'rgba(255,255,255,0.82)',
    lineHeight:  22,
    marginBottom: 18,
    fontFamily:  'Poppins_400Regular',
  },
  heroCta: {
    alignSelf:       'flex-start',
    backgroundColor: C.orb,
    borderRadius:    8,
    paddingHorizontal: 16,
    paddingVertical:   9,
  },
  heroCtaTxt: {
    fontSize:   13,
    fontWeight: '700',
    color:      '#000000',
    letterSpacing: 0.2,
  },

  // ── White body ──
  body: {
    backgroundColor: '#FFFFFF',
    flex:            1,
  },
  section: {
    paddingHorizontal: 20,
    paddingTop:        18,
    paddingBottom:     14,
  },
  sectionLbl: {
    fontSize:      9,
    fontWeight:    '700',
    color:         '#BBBBBB',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom:  14,
  },
  emptyTxt: {
    fontSize:  14,
    color:     '#BBBBBB',
    fontStyle: 'italic',
  },
  evRow: {
    flexDirection:  'row',
    alignItems:     'flex-start',
    gap:            12,
    marginBottom:   12,
  },
  evDot: {
    width:        8,
    height:       8,
    borderRadius: 2,
    marginTop:    5,
    flexShrink:   0,
  },
  evTime: {
    fontSize:   12,
    color:      '#AAAAAA',
    width:      50,
    fontWeight: '600',
    paddingTop: 1,
  },
  evTitle: {
    fontSize:   15,
    color:      '#111111',
    fontWeight: '600',
    lineHeight: 20,
  },
  evMeta: {
    fontSize:  11,
    color:     '#AAAAAA',
    marginTop: 2,
  },
  evPast: {
    color: '#CCCCCC',
  },
  evPastStrike: {
    color:               '#CCCCCC',
    textDecorationLine:  'line-through',
    fontWeight:          '400',
  },
  calHint: {
    fontSize:      9,
    fontWeight:    '700',
    color:         C.magenta,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    textAlign:     'right',
    marginTop:     10,
  },

  divider: {
    height:          1.5,
    backgroundColor: '#F2F2F2',
    marginHorizontal: 0,
  },

  // ── Dinner yellow card ──
  dinCard: {
    backgroundColor: C.dinBg,
    marginHorizontal: 16,
    marginTop:        16,
    borderRadius:     16,
    padding:          16,
    flexDirection:    'row',
    alignItems:       'center',
  },
  dinCardLbl: {
    fontSize:      11,
    fontWeight:    '700',
    color:         'rgba(255,255,255,0.7)',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom:  5,
  },
  dinCardMeal: {
    fontSize:   16,
    fontWeight: '700',
    color:      '#000000',
  },
  dinCardCook: {
    fontSize:  12,
    color:     'rgba(255,255,255,0.85)',
    marginTop: 3,
  },
  dinCardEmpty: {
    fontSize:  13,
    color:     'rgba(255,255,255,0.7)',
    fontStyle: 'italic',
  },
  dinCardArr: {
    fontSize: 20,
    color:    'rgba(255,255,255,0.5)',
    marginLeft: 'auto',
  },

  // ── Nudge strip ──
  nudge: {
    backgroundColor: '#F7F7F7',
    marginHorizontal: 16,
    borderRadius:     16,
    padding:          14,
    flexDirection:    'row',
    alignItems:       'center',
    gap:              12,
  },
  nudgeOrb: {
    width:           32,
    height:          32,
    borderRadius:    8,
    backgroundColor: C.nudgeOrb,
    alignItems:      'center',
    justifyContent:  'center',
    flexShrink:      0,
  },
  nudgeTxt: {
    fontSize:   13.5,
    fontWeight: '700',
    color:      '#111111',
  },
  nudgeSub: {
    fontSize:  11,
    color:     '#AAAAAA',
    marginTop: 2,
  },
  nudgeArr: {
    fontSize: 16,
    color:    '#CCCCCC',
    marginLeft: 'auto',
  },

  // ── Dinner modal ──
  dinHeader: {
    flexDirection:    'row',
    justifyContent:   'space-between',
    alignItems:       'center',
    paddingHorizontal: 20,
    paddingVertical:   16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  dinTitle:  { fontSize: 17, fontWeight: '700', color: C.text },
  dinCancel: { fontSize: 16, color: C.text2 },
  dinSave:   { fontSize: 16, fontWeight: '700', color: C.magenta },
  dinLabel: {
    fontSize:      12,
    fontWeight:    '600',
    color:         C.text2,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom:  10,
    marginTop:     20,
  },
  dinInput: {
    backgroundColor: C.card,
    borderWidth:     1.5,
    borderColor:     C.border,
    borderRadius:    12,
    padding:         14,
    fontSize:        16,
    color:           C.text,
    marginBottom:    8,
  },
  cookRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cookChip: {
    backgroundColor: C.card,
    borderWidth:     1.5,
    borderColor:     C.border,
    borderRadius:    20,
    paddingHorizontal: 14,
    paddingVertical:   8,
  },
  cookChipOn: {
    backgroundColor: 'rgba(224,0,124,0.12)',
    borderColor:     'rgba(224,0,124,0.4)',
  },
  cookChipTxt:   { fontSize: 13, color: C.text2, fontWeight: '500' },
  cookChipTxtOn: { color: C.magenta, fontWeight: '700' },

  // ── Chat ──
  chatHeader: {
    flexDirection:    'row',
    alignItems:       'center',
    justifyContent:   'space-between',
    paddingHorizontal: 16,
    paddingVertical:   12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  chatBack:    { paddingVertical: 4, paddingHorizontal: 8 },
  chatBackTxt: { fontSize: 17, color: C.magenta, fontWeight: '500' },
  chatHeaderCenter: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  chatAvatar: {
    width:           36,
    height:          36,
    borderRadius:    18,
    backgroundColor: 'rgba(224,0,124,0.15)',
    alignItems:      'center',
    justifyContent:  'center',
    borderWidth:     1,
    borderColor:     'rgba(224,0,124,0.4)',
  },
  chatName:   { fontSize: 15, fontWeight: '700', color: C.text },
  chatStatus: { fontSize: 11, color: C.magenta, marginTop: 1 },
  chatMessages: { flex: 1 },
  chatEmpty: { alignItems: 'center', paddingTop: 40, gap: 12 },
  chatEmptyOrb: {
    width:           64,
    height:          64,
    borderRadius:    32,
    backgroundColor: 'rgba(224,0,124,0.15)',
    alignItems:      'center',
    justifyContent:  'center',
    borderWidth:     1.5,
    borderColor:     'rgba(224,0,124,0.4)',
  },
  chatEmptyTitle:  { fontSize: 22, fontWeight: '700', color: C.text },
  chatEmptySub: {
    fontSize:          14,
    color:             C.text2,
    textAlign:         'center',
    lineHeight:        21,
    paddingHorizontal: 20,
  },
  chips: {
    flexDirection:  'row',
    flexWrap:       'wrap',
    gap:            8,
    justifyContent: 'center',
    marginTop:      8,
  },
  chip: {
    backgroundColor: C.card,
    borderWidth:     1.5,
    borderColor:     C.border,
    borderRadius:    20,
    paddingHorizontal: 14,
    paddingVertical:   8,
  },
  chipTxt:    { fontSize: 13, color: C.text2 },
  bubble:     { flexDirection: 'row', marginBottom: 16, gap: 8 },
  bubbleUser: { justifyContent: 'flex-end' },
  bubbleAI:   { justifyContent: 'flex-start' },
  aiAvatar: {
    width:           28,
    height:          28,
    borderRadius:    14,
    backgroundColor: 'rgba(224,0,124,0.15)',
    alignItems:      'center',
    justifyContent:  'center',
    borderWidth:     1,
    borderColor:     'rgba(224,0,124,0.35)',
    marginBottom:    4,
    alignSelf:       'flex-end',
  },
  bubbleInner: { maxWidth: '78%', borderRadius: 16, padding: 12 },
  bubbleUserInner: {
    backgroundColor:    C.magenta,
    borderBottomRightRadius: 4,
  },
  bubbleAIInner: {
    backgroundColor: C.card,
    borderBottomLeftRadius: 4,
    borderWidth:     1,
    borderColor:     C.border,
  },
  bubbleTxt:     { fontSize: 15, color: C.text2, lineHeight: 22 },
  bubbleUserTxt: { color: '#fff' },
  chatInputBar: {
    flexDirection:    'row',
    alignItems:       'flex-end',
    paddingHorizontal: 16,
    paddingVertical:   12,
    borderTopWidth:   1,
    borderTopColor:   C.border,
    gap:              10,
    backgroundColor:  C.bg,
  },
  chatInput: {
    flex:              1,
    backgroundColor:   C.card,
    borderWidth:       1.5,
    borderColor:       C.border,
    borderRadius:      20,
    paddingHorizontal: 16,
    paddingVertical:   10,
    fontSize:          15,
    color:             C.text,
    maxHeight:         100,
  },
  chatSendBtn: {
    width:           40,
    height:          40,
    borderRadius:    20,
    backgroundColor: C.chatSend,
    alignItems:      'center',
    justifyContent:  'center',
  },
  chatSendTxt: { fontSize: 18, color: '#fff', fontWeight: '700' },
});






