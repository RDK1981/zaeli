import { useRouter } from 'expo-router';
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
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';

const DUMMY_FAMILY_ID = '00000000-0000-0000-0000-000000000001';
const DUMMY_MEMBER_ID = '00000000-0000-0000-0000-000000000002';
const LATITUDE = -27.4698;
const LONGITUDE = 153.0251;

const COLORS = {
  bg: '#0A0F1E', card: '#141929', card2: '#1A2235', border: '#1E2840',
  blue: '#4A90D9', blueLight: 'rgba(74,144,217,0.12)', blueBorder: 'rgba(74,144,217,0.25)',
  text: '#FFFFFF', text2: 'rgba(255,255,255,0.55)', text3: 'rgba(255,255,255,0.28)',
  green: '#1DB87A', greenLight: 'rgba(29,184,122,0.12)', greenBorder: 'rgba(29,184,122,0.25)',
  orange: '#E8922A', orangeLight: 'rgba(232,146,42,0.12)', orangeBorder: 'rgba(232,146,42,0.25)',
  purple: '#9B7FD4', purpleLight: 'rgba(155,127,212,0.12)', purpleBorder: 'rgba(155,127,212,0.25)',
  red: '#D64F3E', redLight: 'rgba(214,79,62,0.10)',
  yellow: '#F5C842', yellowLight: 'rgba(245,200,66,0.12)',
};

const WEATHER_CODES: Record<number, { icon: string; label: string }> = {
  0: { icon: '☀️', label: 'Clear' }, 1: { icon: '🌤️', label: 'Mostly clear' },
  2: { icon: '⛅', label: 'Partly cloudy' }, 3: { icon: '☁️', label: 'Overcast' },
  45: { icon: '🌫️', label: 'Foggy' }, 48: { icon: '🌫️', label: 'Icy fog' },
  51: { icon: '🌦️', label: 'Light drizzle' }, 53: { icon: '🌦️', label: 'Drizzle' },
  55: { icon: '🌧️', label: 'Heavy drizzle' }, 61: { icon: '🌧️', label: 'Light rain' },
  63: { icon: '🌧️', label: 'Rain' }, 65: { icon: '🌧️', label: 'Heavy rain' },
  71: { icon: '🌨️', label: 'Light snow' }, 73: { icon: '🌨️', label: 'Snow' },
  80: { icon: '🌦️', label: 'Showers' }, 81: { icon: '🌧️', label: 'Heavy showers' },
  95: { icon: '⛈️', label: 'Thunderstorm' }, 99: { icon: '⛈️', label: 'Severe storm' },
};

interface HourlyWeather {
  time: string; temp: number; rain: number; code: number;
}
interface WeatherData {
  current: { temp: number; code: number; windspeed: number; humidity: number };
  hourly: HourlyWeather[];
}
interface CalEvent {
  id: string; title: string; start_time: string; end_time?: string; colour?: string;
}
interface Mission {
  id: string; title: string; points: number; frequency: string; icon?: string;
}
interface ActivityItem {
  id: string; icon: string; title: string; created_at: string; link_tab?: string;
}
interface MealPlan {
  id: string; meal_name: string; planned_date: string;
  cook_member_id?: string; notes?: string;
}
interface Message {
  id: string; role: 'user' | 'assistant'; content: string;
}

// ─── TYPING DOT ──────────────────────────────────────────────────────────────
function TypingDot({ delay }: { delay: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 300, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <Animated.View style={[styles.typingDot, {
      opacity: anim,
      transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }]
    }]} />
  );
}

// ─── CHAT SCREEN ─────────────────────────────────────────────────────────────
function ChatScreen({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [messages, setMessages] = useState<Message[]>([{
    id: '1', role: 'assistant',
    content: "Hey Sarah 👋 What can I help with today? I'm across everything happening with the family.",
  }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const SUGGESTIONS = ["What's on this week?", 'Any clashes?', "Who hasn't done their Tasks?"];

  const send = async (text: string) => {
    if (!text.trim()) return;
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    Keyboard.dismiss();
    setLoading(true);
    try {
      const [eventsRes, TasksRes, completionsRes] = await Promise.all([
        supabase.from('events').select('*').eq('family_id', DUMMY_FAMILY_ID),
        supabase.from('Tasks').select('*').eq('family_id', DUMMY_FAMILY_ID),
        supabase.from('mission_completions').select('*').eq('member_id', DUMMY_MEMBER_ID),
      ]);
      const today = new Date().toISOString().split('T')[0];
      const context = `You are Zaeli, the AI assistant for the Mitchell family. You are warm, personal and concise.
Family members: Sarah (parent), Jack (kid), Emma (kid).
Today's date: ${today}
Upcoming events: ${JSON.stringify(eventsRes.data?.slice(0, 10) || [])}
Active Tasks: ${JSON.stringify(TasksRes.data?.slice(0, 10) || [])}
Recent completions: ${JSON.stringify(completionsRes.data?.slice(0, 10) || [])}
You can take actions: adding shopping items, creating events, marking Tasks. Confirm actions clearly with ✅.
Keep replies concise and personal. Use the family members' real names.`.trim();

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514', max_tokens: 1000,
          system: context,
          messages: [
            ...messages.map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: text.trim() },
          ],
        }),
      });
      const data = await response.json();
      const reply = data.content?.[0]?.text || "Sorry, I couldn't get a response right now.";
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: reply }]);
    } catch (e) {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: "Sorry, something went wrong. Try again!" }]);
    }
    setLoading(false);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <SafeAreaView style={styles.chatSafe}>
        <StatusBar style="light" />
        <View style={styles.chatHeader}>
          <TouchableOpacity onPress={onClose} style={styles.chatBack}>
            <Text style={styles.chatBackText}>‹ Back</Text>
          </TouchableOpacity>
          <View style={styles.chatHeaderCenter}>
            <View style={styles.chatAvatar}><Text style={{ fontSize: 16 }}>✦</Text></View>
            <View>
              <Text style={styles.chatName}>Zaeli AI</Text>
              <Text style={styles.chatStatus}>● Knows your family</Text>
            </View>
          </View>
          <View style={{ width: 60 }} />
        </View>
        <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }} keyboardVerticalOffset={88}>
          <ScrollView ref={scrollRef} style={styles.chatMessages}
            contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
            showsVerticalScrollIndicator={false}>
            {messages.map((msg, i) => (
              <View key={msg.id} style={[styles.msgRow, msg.role === 'user' && styles.msgRowUser]}>
                {msg.role === 'assistant' && (
                  <View style={styles.msgAvatar}><Text style={{ fontSize: 12 }}>✦</Text></View>
                )}
                <View style={[styles.bubble, msg.role === 'user' ? styles.bubbleUser : styles.bubbleZaeli]}>
                  <Text style={[styles.bubbleText, msg.role === 'user' && styles.bubbleTextUser]}>
                    {msg.content}
                  </Text>
                  {i === 0 && (
                    <View style={styles.chips}>
                      {SUGGESTIONS.map(s => (
                        <TouchableOpacity key={s} style={styles.chip} onPress={() => send(s)}>
                          <Text style={styles.chipText}>{s}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
                {msg.role === 'user' && (
                  <View style={[styles.msgAvatar, styles.msgAvatarUser]}>
                    <Text style={{ fontSize: 12, color: '#fff' }}>S</Text>
                  </View>
                )}
              </View>
            ))}
            {loading && (
              <View style={styles.msgRow}>
                <View style={styles.msgAvatar}><Text style={{ fontSize: 12 }}>✦</Text></View>
                <View style={styles.bubbleZaeli}>
                  <View style={styles.typingDots}>
                    <TypingDot delay={0} /><TypingDot delay={200} /><TypingDot delay={400} />
                  </View>
                </View>
              </View>
            )}
          </ScrollView>
          <View style={styles.chatInputBar}>
            <TextInput
              style={styles.chatInput} value={input} onChangeText={setInput}
              placeholder="Ask Zaeli anything..." placeholderTextColor={COLORS.text3}
              multiline onSubmitEditing={() => send(input)}
            />
            <TouchableOpacity
              style={[styles.sendBtn, !input.trim() && { opacity: 0.4 }]}
              onPress={() => send(input)} disabled={!input.trim() || loading}>
              <Text style={styles.sendBtnText}>↑</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

// ─── DINNER MODAL ─────────────────────────────────────────────────────────────
function DinnerModal({ visible, onClose, onSaved }: { visible: boolean; onClose: () => void; onSaved: () => void }) {
  const [mealName, setMealName] = useState('');
  const [cooks, setCooks] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const COOKS = ['Sarah', 'Dad', 'Jack', 'Emma', 'Liam', 'Mia', 'Everyone', 'Takeaway 🍕', 'Eating out 🍽️'];
  const toggleCook = (c: string) => setCooks(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);
  const cookLabel = cooks.length === 0 ? null : cooks.join(' & ');

  const save = async () => {
    if (!mealName.trim()) return;
    setSaving(true);
    const today = new Date().toISOString().split('T')[0];
    await supabase.from('meal_plans').upsert({
      family_id: DUMMY_FAMILY_ID,
      planned_date: today,
      meal_name: mealName.trim(),
      meal_type: 'dinner',
      notes: cookLabel || null,
    });
    await supabase.from('activity_log').insert({
      family_id: DUMMY_FAMILY_ID,
      member_id: DUMMY_MEMBER_ID,
      activity_type: 'meal_plan',
      title: `🍝 ${mealName.trim()} tonight${cookLabel ? ` — ${cookLabel} cooking` : ''}`,
      icon: '🍝',
      link_tab: 'more',
    });
    setSaving(false);
    setMealName('');
    setCooks([]);
    onSaved();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide">
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
          <TouchableOpacity activeOpacity={1} style={styles.dinnerModal}>
            <View style={styles.dinnerModalHandle} />
            <Text style={styles.dinnerModalTitle}>🍝 What's for dinner?</Text>
            <Text style={styles.dinnerModalSub}>Tell the family what's cooking tonight</Text>

            <TextInput
              style={styles.dinnerInput}
              value={mealName}
              onChangeText={setMealName}
              placeholder="e.g. Spaghetti bolognese"
              placeholderTextColor={COLORS.text3}
              autoFocus
            />

            <Text style={styles.dinnerCookLabel}>Who's cooking?</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
              <View style={styles.cookChips}>
                {COOKS.map(c => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.cookChip, cooks.includes(c) && styles.cookChipActive]}
                    onPress={() => toggleCook(c)}>
                    <Text style={[styles.cookChipText, cooks.includes(c) && styles.cookChipTextActive]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[styles.dinnerSaveBtn, !mealName.trim() && { opacity: 0.4 }]}
              onPress={save} disabled={!mealName.trim() || saving}>
              <Text style={styles.dinnerSaveBtnText}>{saving ? 'Saving...' : 'Tell the family ✓'}</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── MAIN HOME SCREEN ─────────────────────────────────────────────────────────
export default function HomeScreen() {
  const router = useRouter();
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [suburb, setSuburb] = useState('Brisbane');
  const [weatherExpanded, setWeatherExpanded] = useState(false);
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [Tasks, setTasks] = useState<Mission[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [shoppingItems, setShoppingItems] = useState<{ id: string; text: string }[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [tonightMeal, setTonightMeal] = useState<MealPlan | null>(null);
  const [dinnerModalVisible, setDinnerModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [chatVisible, setChatVisible] = useState(false);
  const expandAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => { loadData(); startPulse(); }, []);

  const startPulse = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.12, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ])
    ).start();
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([fetchWeather(), fetchEvents(), fetchTasks(), fetchShopping(), fetchActivity(), fetchTonightMeal()]);
    setLoading(false);
  };

  const fetchWeather = async () => {
    try {
      const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${LATITUDE}&lon=${LONGITUDE}&format=json`);
      const geoData = await geoRes.json();
      setSuburb(geoData?.address?.suburb || geoData?.address?.town || geoData?.address?.city || 'Brisbane');
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${LATITUDE}&longitude=${LONGITUDE}&current=temperature_2m,weathercode,windspeed_10m,relativehumidity_2m&hourly=temperature_2m,precipitation_probability,weathercode&timezone=Australia%2FBrisbane&forecast_days=1`
      );
      const data = await res.json();
      const currentHour = new Date().getHours();
      const hourly: HourlyWeather[] = data.hourly.time
        .map((t: string, i: number) => ({
          time: t, temp: Math.round(data.hourly.temperature_2m[i]),
          rain: data.hourly.precipitation_probability[i], code: data.hourly.weathercode[i],
        }))
        .filter((_: HourlyWeather, i: number) => i >= currentHour);
      setWeather({
        current: {
          temp: Math.round(data.current.temperature_2m), code: data.current.weathercode,
          windspeed: Math.round(data.current.windspeed_10m), humidity: data.current.relativehumidity_2m,
        },
        hourly,
      });
    } catch (e) { console.log('Weather error', e); }
  };

  const fetchEvents = async () => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    const { data } = await supabase.from('events').select('*')
      .eq('family_id', DUMMY_FAMILY_ID)
      .gte('start_time', today.toISOString())
      .lt('start_time', tomorrow.toISOString())
      .order('start_time');
    if (data) setEvents(data);
  };

  const fetchTasks = async () => {
    const [TasksRes, completionsRes] = await Promise.all([
      supabase.from('Tasks').select('*').eq('family_id', DUMMY_FAMILY_ID),
      supabase.from('mission_completions').select('*').eq('member_id', DUMMY_MEMBER_ID),
    ]);
    if (TasksRes.data) setTasks(TasksRes.data);
    if (completionsRes.data) {
      const today = new Date().toISOString().split('T')[0];
      const ids = completionsRes.data
        .filter(c => c.period_start === today && c.status === 'completed')
        .map(c => c.mission_id);
      setCompletedIds(new Set(ids));
    }
  };

  const fetchShopping = async () => {
    const { data } = await supabase.from('list_items').select('*')
      .eq('family_id', DUMMY_FAMILY_ID).eq('list_type', 'shopping')
      .eq('completed', false).order('created_at', { ascending: false });
    if (data) setShoppingItems(data);
  };

  const fetchActivity = async () => {
    const { data } = await supabase.from('activity_log').select('*')
      .eq('family_id', DUMMY_FAMILY_ID)
      .order('created_at', { ascending: false })
      .limit(8);
    if (data) setActivity(data);
  };

  const fetchTonightMeal = async () => {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase.from('meal_plans').select('*')
      .eq('family_id', DUMMY_FAMILY_ID)
      .eq('planned_date', today)
      .eq('meal_type', 'dinner')
      .single();
    if (data) setTonightMeal(data);
  };

  const toggleWeather = () => {
    setWeatherExpanded(prev => !prev);
    Animated.timing(expandAnim, {
      toValue: weatherExpanded ? 0 : 1, duration: 400, useNativeDriver: false,
    }).start();
  };

  const expandHeight = expandAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 110] });

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const formatEventTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const currentWeather = weather ? WEATHER_CODES[weather.current.code] || WEATHER_CODES[0] : null;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar style="light" />
      <ChatScreen visible={chatVisible} onClose={() => setChatVisible(false)} />
      <DinnerModal
        visible={dinnerModalVisible}
        onClose={() => setDinnerModalVisible(false)}
        onSaved={loadData}
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting()},</Text>
            <Text style={styles.name}>Sarah 👋</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity onPress={() => setChatVisible(true)} style={styles.zaeliIconWrap}>
              <Animated.View style={[styles.zaeliIconRing, { transform: [{ scale: pulseAnim }] }]} />
              <View style={styles.zaeliIcon}>
                <Text style={styles.zaeliIconText}>✦</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Weather ── */}
        {weather && currentWeather ? (
          <View style={styles.weatherCard}>
            <TouchableOpacity onPress={toggleWeather} activeOpacity={0.9}>
              <View style={styles.weatherTop}>
                <View style={styles.weatherLeft}>
                  <Text style={styles.weatherIcon}>{currentWeather.icon}</Text>
                  <View>
                    <Text style={styles.weatherTemp}>{weather.current.temp}°</Text>
                    <Text style={styles.weatherCondition}>{currentWeather.label} · {suburb}</Text>
                    <Text style={styles.weatherDetail}>💧 {weather.current.humidity}%  💨 {weather.current.windspeed}km/h</Text>
                  </View>
                </View>
                <View style={styles.weatherRight}>
                  <Text style={styles.weatherExpandHint}>{weatherExpanded ? 'Less ↑' : 'Hourly ↓'}</Text>
                  <View style={styles.weatherPills}>
                    {weather.hourly.slice(1, 4).map((h, i) => {
                      const hw = WEATHER_CODES[h.code] || WEATHER_CODES[0];
                      const t = new Date(h.time);
                      const label = t.getHours() === 12 ? '12pm' : t.getHours() > 12 ? `${t.getHours() - 12}pm` : `${t.getHours()}am`;
                      return (
                        <View key={i} style={styles.weatherPill}>
                          <Text style={styles.weatherPillIcon}>{hw.icon}</Text>
                          <Text style={styles.weatherPillTemp}>{h.temp}°</Text>
                          <Text style={styles.weatherPillTime}>{label}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              </View>
            </TouchableOpacity>
            <Animated.View style={[styles.hourlyWrap, { height: expandHeight }]}>
              <ScrollView horizontal showsHorizontalScrollIndicator={true} style={styles.hourlyScroll} contentContainerStyle={{ paddingRight: 20 }}>
                {weather.hourly.map((h, i) => {
                  const hw = WEATHER_CODES[h.code] || WEATHER_CODES[0];
                  const t = new Date(h.time);
                  const label = i === 0 ? 'Now' : t.getHours() === 12 ? '12pm' : t.getHours() > 12 ? `${t.getHours() - 12}pm` : `${t.getHours()}am`;
                  return (
                    <View key={i} style={[styles.hourCard, i === 0 && styles.hourCardActive]}>
                      <Text style={styles.hourTime}>{label}</Text>
                      <Text style={styles.hourIcon}>{hw.icon}</Text>
                      {h.rain > 0 && <Text style={styles.hourRain}>{h.rain}%</Text>}
                      <Text style={styles.hourTemp}>{h.temp}°</Text>
                    </View>
                  );
                })}
              </ScrollView>
            </Animated.View>
          </View>
        ) : (
          <View style={[styles.weatherCard, styles.weatherLoading]}>
            <ActivityIndicator color={COLORS.blue} />
            <Text style={styles.weatherLoadingText}>Loading weather...</Text>
          </View>
        )}

        {/* ── Zaeli Briefing ── */}
        <View style={styles.briefingCard}>
          <View style={styles.briefingHeader}>
            <View style={styles.briefingDot} />
            <Text style={styles.briefingBadge}>Zaeli Briefing</Text>
          </View>
          <Text style={styles.briefingText}>
            {events.length > 0
              ? `${events.length} thing${events.length > 1 ? 's' : ''} on today. ${Tasks.length - completedIds.size} mission${Tasks.length - completedIds.size !== 1 ? 's' : ''} still to do.`
              : 'Nothing scheduled today. A good day to get ahead! ✨'}
          </Text>
          <TouchableOpacity onPress={() => setChatVisible(true)} style={styles.briefingAsk}>
            <Text style={styles.briefingAskText}>✦ Ask Zaeli anything →</Text>
          </TouchableOpacity>
        </View>

        {/* ── Family Pulse ── */}
        {activity.length > 0 && (
          <View style={styles.pulseSection}>
            <Text style={[styles.sectionTitlePulse, { paddingHorizontal: 20 }]}>Family Pulse</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pulseScroll}>
              {activity.map(item => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.pulsePill}
                  onPress={() => item.link_tab && router.push(`/(tabs)/${item.link_tab}` as any)}
                  activeOpacity={0.75}>
                  <Text style={styles.pillIcon}>{item.icon}</Text>
                  <Text style={styles.pillText} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.pillTime}>{timeAgo(item.created_at)}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── Today's Events ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitleEvents}>📅 Today</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/calendar')}>
              <Text style={styles.sectionLink}>See all →</Text>
            </TouchableOpacity>
          </View>
          {events.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>📅 Nothing scheduled today</Text>
            </View>
          ) : (
            events.map(event => (
              <View key={event.id} style={styles.eventItem}>
                <View style={[styles.eventColor, { backgroundColor: event.colour || COLORS.blue }]} />
                <View style={styles.eventInfo}>
                  <Text style={styles.eventTitle}>{event.title}</Text>
                  <Text style={styles.eventMeta}>{formatEventTime(event.start_time)}</Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* ── What's for Dinner ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitleDinner}>🍝 Tonight's Dinner</Text>
            {tonightMeal && (
              <TouchableOpacity onPress={() => setDinnerModalVisible(true)}>
                <Text style={styles.sectionLink}>Change →</Text>
              </TouchableOpacity>
            )}
          </View>
          {tonightMeal ? (
            <View style={styles.dinnerCard}>
              <Text style={styles.dinnerEmoji}>🍽️</Text>
              <View style={styles.dinnerInfo}>
                <Text style={styles.dinnerMeal}>{tonightMeal.meal_name}</Text>
                {tonightMeal.notes ? (
                  <Text style={styles.dinnerCook}>👨‍🍳 {tonightMeal.notes} is cooking</Text>
                ) : (
                  <Text style={styles.dinnerCook}>No cook assigned yet</Text>
                )}
              </View>
            </View>
          ) : (
            <TouchableOpacity style={styles.dinnerEmpty} onPress={() => setDinnerModalVisible(true)} activeOpacity={0.8}>
              <Text style={styles.dinnerEmptyEmoji}>🤷</Text>
              <View>
                <Text style={styles.dinnerEmptyTitle}>Nobody knows yet...</Text>
                <Text style={styles.dinnerEmptySubtitle}>Tap to tell the family what's cooking 👇</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Shopping Preview ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitleShopping}>🛒 Shopping</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/shopping')}>
              <Text style={styles.sectionLink}>See all →</Text>
            </TouchableOpacity>
          </View>
          {shoppingItems.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>🛒 Shopping list is empty</Text>
            </View>
          ) : (
            <>
              {shoppingItems.slice(0, 3).map(item => (
                <View key={item.id} style={styles.shoppingPreviewItem}>
                  <Text style={styles.shoppingPreviewDot}>·</Text>
                  <Text style={styles.shoppingPreviewText}>{item.text}</Text>
                </View>
              ))}
              {shoppingItems.length > 3 && (
                <Text style={styles.shoppingMore}>+{shoppingItems.length - 3} more items →</Text>
              )}
            </>
          )}
        </View>

        {/* ── Tasks Preview ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitleTasks}>⚡ Tasks</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/chores')}>
              <Text style={styles.sectionLink}>See all →</Text>
            </TouchableOpacity>
          </View>
          {Tasks.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>⚡ No Tasks set yet</Text>
            </View>
          ) : (
            <>
              <View style={styles.TasksProgress}>
                <Text style={styles.TasksProgressText}>{completedIds.size} of {Tasks.length} done today</Text>
                <View style={styles.TasksBar}>
                  <View style={[styles.TasksBarFill, {
                    width: Tasks.length > 0 ? `${(completedIds.size / Tasks.length) * 100}%` as any : '0%'
                  }]} />
                </View>
              </View>
              {Tasks.slice(0, 3).map(mission => (
                <View key={mission.id} style={styles.missionPreviewItem}>
                  <Text style={styles.missionPreviewIcon}>{mission.icon || '⭐'}</Text>
                  <Text style={[styles.missionPreviewTitle, completedIds.has(mission.id) && styles.missionPreviewDone]}>
                    {mission.title}
                  </Text>
                  {completedIds.has(mission.id) && <Text style={styles.missionPreviewTick}>✓</Text>}
                </View>
              ))}
              {Tasks.length > 3 && (
                <Text style={styles.missionMore}>+{Tasks.length - 3} more →</Text>
              )}
            </>
          )}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* ── Voice FAB ── */}
      <TouchableOpacity style={styles.fab}>
        <Text style={styles.fabIcon}>🎤</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  scrollContent: { paddingBottom: 40 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 },
  greeting: { fontSize: 13, color: COLORS.text2, fontWeight: '400', marginBottom: 2 },
  name: { fontSize: 26, fontWeight: '700', color: COLORS.text, letterSpacing: -0.3 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },

  zaeliIconWrap: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  zaeliIconRing: { position: 'absolute', width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: 'rgba(155,127,212,0.3)' },
  zaeliIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.purple, alignItems: 'center', justifyContent: 'center', shadowColor: COLORS.purple, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 8, elevation: 8 },
  zaeliIconText: { fontSize: 18, color: '#fff' },

  weatherCard: { marginHorizontal: 20, marginBottom: 14, backgroundColor: '#0D1E30', borderRadius: 20, padding: 16, borderWidth: 1.5, borderColor: 'rgba(74,144,217,0.2)' },
  weatherLoading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 24 },
  weatherLoadingText: { fontSize: 13, color: COLORS.text2 },
  weatherTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  weatherLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  weatherIcon: { fontSize: 40 },
  weatherTemp: { fontSize: 36, fontWeight: '700', color: '#fff', letterSpacing: -1, lineHeight: 40 },
  weatherCondition: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: '500', marginBottom: 2 },
  weatherDetail: { fontSize: 11, color: 'rgba(255,255,255,0.4)' },
  weatherRight: { alignItems: 'flex-end', gap: 8 },
  weatherExpandHint: { fontSize: 10, fontWeight: '600', color: 'rgba(255,255,255,0.35)', letterSpacing: 0.5 },
  weatherPills: { flexDirection: 'row', gap: 6 },
  weatherPill: { backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 8, padding: 6, alignItems: 'center', minWidth: 40 },
  weatherPillIcon: { fontSize: 14 },
  weatherPillTemp: { fontSize: 12, fontWeight: '600', color: '#fff' },
  weatherPillTime: { fontSize: 9, color: 'rgba(255,255,255,0.45)', marginTop: 1 },
  hourlyWrap: { overflow: 'hidden' },
  hourlyScroll: { paddingTop: 12, paddingBottom: 8 },
  hourCard: { alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12, marginRight: 4, minWidth: 54, gap: 4 },
  hourCardActive: { backgroundColor: 'rgba(74,144,217,0.2)', borderWidth: 1, borderColor: 'rgba(74,144,217,0.3)' },
  hourTime: { fontSize: 9, fontWeight: '600', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: 0.3 },
  hourIcon: { fontSize: 18 },
  hourRain: { fontSize: 10, fontWeight: '600', color: '#5BB8FF' },
  hourTemp: { fontSize: 13, fontWeight: '600', color: '#fff' },

  briefingCard: { marginHorizontal: 20, marginBottom: 14, backgroundColor: COLORS.card, borderWidth: 1.5, borderColor: 'rgba(155,127,212,0.2)', borderRadius: 18, padding: 16 },
  briefingHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  briefingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.purple },
  briefingBadge: { fontSize: 10, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', color: COLORS.purple },
  briefingText: { fontSize: 14, color: COLORS.text2, lineHeight: 20, fontWeight: '300', marginBottom: 10 },
  briefingAsk: { backgroundColor: COLORS.purpleLight, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12, alignSelf: 'flex-start' },
  briefingAskText: { fontSize: 12, color: COLORS.purple, fontWeight: '600' },

  // Family Pulse
  pulseSection: { marginBottom: 14 },
  pulseLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', color: COLORS.text3, paddingHorizontal: 20, marginBottom: 10 },
  sectionTitlePulse: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', color: COLORS.purple, marginBottom: 24 },
  pulseScroll: { paddingHorizontal: 20, gap: 8, paddingTop: 8 },
  pulsePill: { flexDirection: 'column', alignItems: 'flex-start', backgroundColor: COLORS.card, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8, maxWidth: 180, minWidth: 150 },
  pillIcon: { fontSize: 14, marginBottom: 3 },
  pillText: { fontSize: 11, color: COLORS.text, fontWeight: '500', marginBottom: 2 },
  pillTime: { fontSize: 9, color: COLORS.text3, fontWeight: '400' },

  section: { paddingHorizontal: 20, marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, letterSpacing: -0.3 },
  
  sectionTitleDinner: { fontSize: 18, fontWeight: '700', color: COLORS.orange, letterSpacing: -0.3 },
  sectionTitleShopping: { fontSize: 18, fontWeight: '700', color: COLORS.blue, letterSpacing: -0.3 },
  sectionTitleTasks: { fontSize: 18, fontWeight: '700', color: COLORS.yellow, letterSpacing: -0.3 },
  sectionTitleEvents: { fontSize: 18, fontWeight: '700', color: COLORS.green, letterSpacing: -0.3 },
  sectionTitlePulse: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', color: COLORS.purple },
  sectionLink: { fontSize: 13, color: COLORS.blue },
  emptyCard: { backgroundColor: COLORS.card, borderRadius: 14, padding: 16, borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center' },
  emptyText: { fontSize: 13, color: COLORS.text2 },

  eventItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1.5, borderColor: COLORS.border, gap: 12 },
  eventColor: { width: 4, height: 40, borderRadius: 2 },
  eventInfo: { flex: 1 },
  eventTitle: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 3 },
  eventMeta: { fontSize: 12, color: COLORS.text2 },

  // Dinner
  dinnerCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 16, padding: 16, borderWidth: 1.5, borderColor: COLORS.orangeBorder, gap: 14 },
  dinnerEmoji: { fontSize: 36 },
  dinnerInfo: { flex: 1 },
  dinnerMeal: { fontSize: 17, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  dinnerCook: { fontSize: 13, color: COLORS.text2 },
  dinnerEmpty: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 16, padding: 16, borderWidth: 1.5, borderColor: COLORS.border, gap: 14 },
  dinnerEmptyEmoji: { fontSize: 36 },
  dinnerEmptyTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text2, marginBottom: 3 },
  dinnerEmptySubtitle: { fontSize: 12, color: COLORS.text3 },

  // Dinner modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  dinnerModal: { backgroundColor: COLORS.card2, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40 },
  dinnerModalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.border, alignSelf: 'center', marginBottom: 20 },
  dinnerModalTitle: { fontSize: 22, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  dinnerModalSub: { fontSize: 13, color: COLORS.text2, marginBottom: 20 },
  dinnerInput: { backgroundColor: COLORS.card, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 14, padding: 14, fontSize: 16, color: COLORS.text, marginBottom: 20 },
  dinnerCookLabel: { fontSize: 13, fontWeight: '600', color: COLORS.text2, marginBottom: 10 },
  cookChips: { flexDirection: 'row', gap: 8 },
  cookChip: { backgroundColor: COLORS.card, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  cookChipActive: { backgroundColor: COLORS.orangeLight, borderColor: COLORS.orangeBorder },
  cookChipText: { fontSize: 13, color: COLORS.text2, fontWeight: '500' },
  cookChipTextActive: { color: COLORS.orange },
  dinnerSaveBtn: { backgroundColor: COLORS.orange, borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 4 },
  dinnerSaveBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },

  TasksProgress: { marginBottom: 10 },
  TasksProgressText: { fontSize: 12, color: COLORS.text2, marginBottom: 6 },
  TasksBar: { height: 4, backgroundColor: COLORS.border, borderRadius: 2, overflow: 'hidden' },
  TasksBarFill: { height: '100%', backgroundColor: COLORS.green, borderRadius: 2 },
  missionPreviewItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 12, padding: 12, marginBottom: 6, borderWidth: 1.5, borderColor: COLORS.border, gap: 10 },
  missionPreviewIcon: { fontSize: 18 },
  missionPreviewTitle: { flex: 1, fontSize: 14, fontWeight: '500', color: COLORS.text },
  missionPreviewDone: { color: COLORS.text3, textDecorationLine: 'line-through' },
  missionPreviewTick: { fontSize: 14, color: COLORS.green, fontWeight: '700' },
  missionMore: { fontSize: 12, color: COLORS.blue, textAlign: 'center', marginTop: 4 },

  shoppingPreviewItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 12, padding: 12, marginBottom: 6, borderWidth: 1.5, borderColor: COLORS.border, gap: 10 },
  shoppingPreviewDot: { fontSize: 20, color: COLORS.blue, lineHeight: 20 },
  shoppingPreviewText: { flex: 1, fontSize: 14, fontWeight: '500', color: COLORS.text },
  shoppingMore: { fontSize: 12, color: COLORS.blue, textAlign: 'center', marginTop: 4 },

  fab: { position: 'absolute', bottom: 24, right: 20, width: 52, height: 52, borderRadius: 26, backgroundColor: COLORS.blue, alignItems: 'center', justifyContent: 'center', shadowColor: COLORS.blue, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },
  fabIcon: { fontSize: 22 },

  chatSafe: { flex: 1, backgroundColor: COLORS.bg, paddingTop: 14 },
  chatHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  chatBack: { paddingVertical: 4, paddingHorizontal: 8 },
  chatBackText: { fontSize: 16, color: COLORS.blue, fontWeight: '500' },
  chatHeaderCenter: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  chatAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.purple, alignItems: 'center', justifyContent: 'center' },
  chatName: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  chatStatus: { fontSize: 11, color: COLORS.green },
  chatMessages: { flex: 1 },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 12 },
  msgRowUser: { flexDirection: 'row-reverse' },
  msgAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.purple, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  msgAvatarUser: { backgroundColor: COLORS.blue },
  bubble: { maxWidth: '75%', borderRadius: 18, padding: 12 },
  bubbleZaeli: { backgroundColor: COLORS.card, borderWidth: 1.5, borderColor: COLORS.border },
  bubbleUser: { backgroundColor: COLORS.blue },
  bubbleText: { fontSize: 14, color: COLORS.text, lineHeight: 20 },
  bubbleTextUser: { color: '#fff' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  chip: { backgroundColor: COLORS.blueLight, borderWidth: 1, borderColor: COLORS.blueBorder, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  chipText: { fontSize: 12, color: COLORS.blue, fontWeight: '500' },
  typingDots: { flexDirection: 'row', gap: 4, padding: 4 },
  typingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.text3 },
  chatInputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: 16, paddingVertical: 12, paddingBottom: Platform.OS === 'ios' ? 8 : 12, borderTopWidth: 1, borderTopColor: COLORS.border, backgroundColor: COLORS.bg },
  chatInput: { flex: 1, backgroundColor: COLORS.card, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: COLORS.text, maxHeight: 100 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.blue, alignItems: 'center', justifyContent: 'center' },
  sendBtnText: { fontSize: 18, color: '#fff', fontWeight: '700' },
});