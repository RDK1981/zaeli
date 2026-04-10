/**
 * index.tsx — Zaeli Home · Single Interface
 *
 * Pass 1 (1 Apr 2026): Card stack, live data, weather, time-state order
 * Pass 2 (1 Apr 2026): Circle tick, 7-day dinner accordion, calendar overflow
 * Pass 3 (1 Apr 2026): Single interface rebuild
 * - Killer brief: live data fetched inside generateBrief(), formula-driven
 *   (name person + most urgent + one win + 2 sentences max)
 * - Brief chips inline below DM Serif hero (accent chip = most urgent action)
 * - Card stagger: Calendar → Weather+Shopping → Actions → Dinner
 *   (0 / 150 / 300 / 450ms fadeIn + slideUp)
 * - Post-card Zaeli prompt: after cards settle, GPT-mini drops targeted follow-up
 * - Domain pill bar: 9 pills above chat input (floating frosted glass)
 *   Tap → inline card drops into chat + GPT-mini follow-up (400ms delay)
 * - Pills: Home · Calendar · Shopping · Meals · To-dos · Notes · Travel · Family · More
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Animated, Easing, TextInput, KeyboardAvoidingView,
  Platform, Modal, Pressable, Image, Share, Clipboard, Keyboard,
  PanResponder, StatusBar,
} from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { getPendingCalendarImage, setPendingCalendarImage } from './calendar';
import Svg, { Path, Line, Rect, Circle, Polyline, Polygon } from 'react-native-svg';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Audio } from 'expo-av';
import { supabase } from '../../lib/supabase';
import ZaeliFAB, { ZaeliFABHandle } from '../components/ZaeliFAB';
import { useChatPersistence } from '../../lib/use-chat-persistence';
import { getPendingChatContext, clearPendingChatContext } from '../../lib/navigation-store';

// ── Constants ──────────────────────────────────────────────────────────────
const FAMILY_ID        = '00000000-0000-0000-0000-000000000001';
const DUMMY_FAMILY_ID_HOME = FAMILY_ID;
const MEMBER_NAME      = 'Rich';
const INK              = '#0A0A0A';
const INK3             = 'rgba(10,10,10,0.32)';
const HOME_AI          = '#A8D8F0';

// Tewantin (Noosa) coords for weather — update to real user location later
const WEATHER_LAT = -26.39;
const WEATHER_LON = 153.03;

const T = {
  bannerBg:   '#F5EAD8',
  bg:         '#FAF8F5',
  ink:        '#0A0A0A',
  ink2:       'rgba(10,10,10,0.5)',
  ink3:       'rgba(10,10,10,0.28)',
  border:     'rgba(10,10,10,0.09)',
  userBubble: '#F2F2F2',
  userText:   '#0A0A0A',
  zaeliAi:    HOME_AI,
  dateLine:   'rgba(10,10,10,0.09)',
  pillBg:     HOME_AI,
  pillText:   '#0A0A0A',
  dismiss:    'rgba(10,10,10,0.32)',
  barBg:      '#FFFFFF',
  barBorder:  'rgba(10,10,10,0.09)',
  barPh:      'rgba(10,10,10,0.5)',
  barSep:     'rgba(10,10,10,0.1)',
  barIcon:    'rgba(10,10,10,0.4)',
  sendBg:     HOME_AI,
  statusBar:  'dark' as const,
};

const CAL_AI = '#F0C8C0';
const CAL_BG = '#B8EDD0';

// ── Shopping colours ───────────────────────────────────────────────────────
const SHOP_C      = '#D8CCFF';               // lavender — inline card bg
const SHOP_ACCENT = '#5020C0';               // deep purple — text on card
const SHOP_GREEN  = '#1A7A45';               // forest green — ticks
const SHOP_MAG    = '#E0007C';               // magenta — recently bought
const FOOD_CATS   = ['Fruit & Veg','Dairy & Eggs','Meat & Seafood','Bakery','Pantry Staples','Frozen','Drinks','Snacks'];

// Local keyword category lookup — avoids API calls
function guessCategory(name: string): string {
  const n = name.toLowerCase();
  if (/apple|banana|orange|grape|berry|mango|avocado|tomato|potato|carrot|onion|garlic|lettuce|spinach|broccoli|zucchini|capsicum|cucumber|lemon|lime|pear|peach|melon|kiwi|pineapple|strawberry|mushroom|celery|corn|herb|ginger|rocket|leek|cauliflower|pumpkin|sweet potato|blueberry|raspberry|cherry|fennel|beetroot|radish/.test(n)) return 'Fruit & Veg';
  if (/milk|cheese|yoghurt|yogurt|butter|cream|egg|feta|mozzarella|parmesan|ricotta|sour cream|custard|dairy|cheddar|brie|haloumi/.test(n)) return 'Dairy & Eggs';
  if (/chicken|beef|lamb|pork|mince|steak|sausage|bacon|ham|turkey|fish|salmon|tuna|prawn|shrimp|seafood|salami|pepperoni|chorizo/.test(n)) return 'Meat & Seafood';
  if (/bread|roll|bun|croissant|muffin|cake|pastry|bagel|wrap|pita|sourdough|loaf|toast|brioche/.test(n)) return 'Bakery';
  if (/ice cream|frozen|edamame|gelato/.test(n)) return 'Frozen';
  if (/water|juice|soft drink|soda|coffee|tea|kombucha|energy drink|wine|beer|alcohol|drink|beverage|cordial|coconut water|sparkling/.test(n)) return 'Drinks';
  if (/chip|crisp|cracker|biscuit|chocolate|lolly|candy|nut|almond|cashew|popcorn|muesli bar|tim tam|snack|pretzel/.test(n)) return 'Snacks';
  if (/detergent|soap|shampoo|conditioner|toothpaste|toilet paper|tissue|cleaner|spray|sponge|bin bag|foil|wrap|nappy|pad|tampon|razor|deodorant|sunscreen|dishwasher|laundry|bleach/.test(n)) return 'Household';
  if (/pasta|rice|flour|sugar|salt|oil|vinegar|sauce|stock|tin|can|jar|cereal|oat|lentil|bean|chickpea|curry|spice|herb|condiment|honey|jam|peanut/.test(n)) return 'Pantry Staples';
  return 'Other';
}

// Shopping item emoji by name keyword
function getItemEmoji(name: string): string {
  const n = (name || '').toLowerCase();
  if (/milk|dairy/.test(n)) return '🥛';
  if (/egg/.test(n)) return '🥚';
  if (/bread|sourdough|loaf|toast|bun|roll/.test(n)) return '🍞';
  if (/chicken|poultry/.test(n)) return '🍗';
  if (/beef|steak|mince/.test(n)) return '🥩';
  if (/fish|salmon|tuna|prawn|seafood/.test(n)) return '🐟';
  if (/bacon|ham|pork/.test(n)) return '🥓';
  if (/apple/.test(n)) return '🍎';
  if (/banana/.test(n)) return '🍌';
  if (/orange|lemon|lime/.test(n)) return '🍊';
  if (/avocado/.test(n)) return '🥑';
  if (/tomato/.test(n)) return '🍅';
  if (/carrot/.test(n)) return '🥕';
  if (/broccoli/.test(n)) return '🥦';
  if (/lettuce|spinach|rocket|salad|leaf/.test(n)) return '🥬';
  if (/potato|sweet potato/.test(n)) return '🥔';
  if (/onion|garlic|shallot/.test(n)) return '🧅';
  if (/mushroom/.test(n)) return '🍄';
  if (/grape|berry|blueberry|strawberry|raspberry/.test(n)) return '🍇';
  if (/cheese|cheddar|feta|parmesan|brie|mozzarella|haloumi|ricotta/.test(n)) return '🧀';
  if (/butter/.test(n)) return '🧈';
  if (/yoghurt|yogurt/.test(n)) return '🥛';
  if (/cream/.test(n)) return '🍦';
  if (/chocolate|tim tam|biscuit|cookie/.test(n)) return '🍫';
  if (/chip|crisp|cracker|snack|popcorn/.test(n)) return '🍿';
  if (/ice cream|gelato/.test(n)) return '🍨';
  if (/coffee/.test(n)) return '☕';
  if (/tea/.test(n)) return '🍵';
  if (/juice|drink|water|soda|soft drink|kombucha|wine|beer/.test(n)) return '🧃';
  if (/pasta|spaghetti|noodle/.test(n)) return '🍝';
  if (/rice/.test(n)) return '🍚';
  if (/cereal|oat/.test(n)) return '🥣';
  if (/oil|olive|vinegar/.test(n)) return '🫙';
  if (/honey|jam|spread/.test(n)) return '🍯';
  if (/soap|shampoo|detergent|cleaner|toilet|tissue|dishwasher|laundry/.test(n)) return '🧴';
  if (/nappy|pad|tampon|razor/.test(n)) return '🧻';
  return '🛒';
}

const FAMILY_MEMBERS = [
  { id:'1', name:'Anna',  color:'#FF7B6B' },
  { id:'2', name:'Rich',  color:'#4D8BFF' },
  { id:'3', name:'Poppy', color:'#A855F7' },
  { id:'4', name:'Gab',   color:'#22C55E' },
  { id:'5', name:'Duke',  color:'#F59E0B' },
];

const OPENAI_URL  = 'https://api.openai.com/v1/chat/completions';
const WHISPER_URL = 'https://api.openai.com/v1/audio/transcriptions';

const ALL_SCREENS = [
  { key: 'calendar', label: 'Calendar',   emoji: '📅', route: '/(tabs)/calendar' },
  { key: 'shopping', label: 'Shopping',   emoji: '🛒', route: '/(tabs)/shopping' },
  { key: 'meals',    label: 'Meals',      emoji: '🍽',  route: '/(tabs)/mealplanner' },
  { key: 'tutor',    label: 'Tutor',      emoji: '🎓', route: '/(tabs)/tutor' },
  { key: 'todos',    label: 'To-dos',     emoji: '✅', route: '/(tabs)/todos' },
  { key: 'kids',     label: 'Kids Hub',   emoji: '👧', route: '/(tabs)/kids' },
  { key: 'notes',    label: 'Notes',      emoji: '📝', route: '/(tabs)/notes' },
  { key: 'travel',   label: 'Travel',     emoji: '✈️', route: '/(tabs)/travel' },
  { key: 'family',   label: 'Our Family', emoji: '👨‍👩‍👧', route: '/(tabs)/family' },
];

const REPEAT_OPTIONS = ['Never','Every day','Every week','Every fortnight','Every month','Every year'];
const ALERT_OPTIONS  = ['None','At time of event','5 min before','15 min before','30 min before','1 hour before','2 hours before','1 day before','1 week before'];
const HOURS   = Array.from({ length:12 }, (_, i) => i + 1);
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

// ── Types ──────────────────────────────────────────────────────────────────
interface InlineData {
  type: 'calendar' | 'todos' | 'shopping' | 'meals' | 'kids';
  intro?: string;
  followUp?: string;
  items?: any[];
  tomorrowItems?: any[];   // calendar only — tomorrow's events
  showPortalPill?: boolean;
}

interface Msg {
  id: string;
  role: 'zaeli' | 'user';
  text: string;
  imageUri?: string;
  ts: string;
  isLoading?: boolean;
  isBrief?: boolean;
  isVoice?: boolean;
  quickReplies?: string[];
  inlineData?: InlineData;
}

interface CardData {
  // Calendar
  todayEvents: any[];
  tomorrowEvents: any[];
  // Shopping
  shopItems: any[];
  shopCount: number;
  // Actions / todos + reminders
  todos: any[];
  reminders: any[];
  // Dinner / meals
  meals: any[]; // 7 days of meal_plans rows
  // Weather
  weather: WeatherData | null;
}

interface WeatherData {
  temp: number;
  condition: string;
  code: number;
  windspeed: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────
function localDateStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function localDatePlusDays(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return localDateStr(d);
}
function fmtTime(t?: string | null): string {
  if (!t) return '';
  // Raw-parse the stored local time portion — consistent with calendar.tsx
  // Supabase returns stored local time with +00:00 suffix; we read the hours directly
  const timePart = t.includes('T') ? t.split('T')[1] : t.split(' ')[1] || '';
  if (!timePart) return '';
  const [hStr, mStr] = timePart.split(':');
  const h = parseInt(hStr, 10); const m = parseInt(mStr, 10);
  if (isNaN(h) || isNaN(m)) return '';
  const ampm = h >= 12 ? 'pm' : 'am';
  const h12  = h === 0 ? 12 : h > 12 ? h-12 : h;
  return `${h12}:${String(m).padStart(2,'0')} ${ampm}`;
}
function naturalDate(ds: string, td: string): string {
  const diff = Math.round((new Date(ds+'T00:00:00').getTime() - new Date(td+'T00:00:00').getTime()) / 86400000);
  if (diff === 0) return 'today';
  if (diff === 1) return 'tomorrow';
  if (diff <= 6)  return new Date(ds+'T00:00:00').toLocaleDateString('en-AU', { weekday: 'long' });
  return new Date(ds+'T00:00:00').toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' });
}
function nowTs() {
  return new Date().toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' });
}
function uid() { return `${Date.now()}-${Math.random().toString(36).slice(2)}`; }
function isoToMinutes(iso: string): number {
  if (!iso) return 0;
  const timePart = iso.includes('T') ? iso.split('T')[1] : iso.split(' ')[1] || '';
  if (!timePart) return 0;
  const [h, m] = timePart.split(':').map(Number);
  return h * 60 + m;
}
function getMemberColor(assignees?: string[]): string {
  if (!assignees || assignees.length === 0) return '#A8D8F0';
  const m = FAMILY_MEMBERS.find(m => assignees.includes(m.id));
  return m?.color ?? '#A8D8F0';
}
function getEvAssignees(ev: any): any[] {
  if (!ev.assignees || ev.assignees.length === 0) return [];
  return (ev.assignees as string[])
    .map((id: string) => FAMILY_MEMBERS.find(m => m.id === id))
    .filter(Boolean) as any[];
}

function renderHeroText(text: string, highlightColor: string) {
  const parts = text.split(/(\[[^\]]+\])/g);
  return parts.map((part, i) => {
    if (part.startsWith('[') && part.endsWith(']')) {
      // Italic emphasis: colour + italic, inherits font size from parent heroLine
      return <Text key={i} style={{ fontStyle:'italic' as const, color:'rgba(10,10,10,0.65)' }}>{part.slice(1,-1)}</Text>;
    }
    return <Text key={i}>{part}</Text>;
  });
}

// ── Weather helpers ────────────────────────────────────────────────────────
function weatherCondition(code: number): string {
  if (code === 0) return 'Clear';
  if (code <= 3)  return 'Partly cloudy';
  if (code <= 48) return 'Foggy';
  if (code <= 57) return 'Drizzle';
  if (code <= 67) return 'Rain';
  if (code <= 77) return 'Snow';
  if (code <= 82) return 'Showers';
  if (code <= 86) return 'Heavy showers';
  return 'Stormy';
}

// WMO code → weather type for animated icon
function weatherType(code: number): 'sunny' | 'partly' | 'cloudy' | 'rain' | 'storm' {
  if (code === 0) return 'sunny';
  if (code <= 2)  return 'partly';
  if (code <= 48) return 'cloudy';
  if (code <= 82) return 'rain';
  return 'storm';
}

// Extra context line for weather card
function weatherExtra(code: number, windspeed: number): string {
  if (code === 0 && windspeed > 15) return 'Breezy · good beach day';
  if (code === 0) return 'Perfect day';
  if (code <= 2)  return windspeed > 20 ? 'Windy · jacket handy' : 'Nice day';
  if (code <= 48) return 'May need a jacket';
  if (code <= 67) return 'Umbrella recommended';
  if (code <= 82) return 'Keep the kids inside';
  return 'Stay dry today';
}

// ── Animated weather icon ─────────────────────────────────────────────────
function WeatherIcon({ type }: { type: 'sunny' | 'partly' | 'cloudy' | 'rain' | 'storm' }) {
  const pulse = useRef(new Animated.Value(1)).current;
  const drift = useRef(new Animated.Value(0)).current;
  const drop1 = useRef(new Animated.Value(0)).current;
  const drop2 = useRef(new Animated.Value(0)).current;
  const flash = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let anim: Animated.CompositeAnimation | null = null;
    if (type === 'sunny') {
      anim = Animated.loop(Animated.sequence([
        Animated.timing(pulse, { toValue: 1.15, duration: 1800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,    duration: 1800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]));
    } else if (type === 'partly' || type === 'cloudy') {
      anim = Animated.loop(Animated.sequence([
        Animated.timing(drift, { toValue: 3,  duration: 2200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(drift, { toValue: -3, duration: 2200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]));
    } else if (type === 'rain') {
      const d1 = Animated.loop(Animated.sequence([
        Animated.timing(drop1, { toValue: 1, duration: 700, easing: Easing.ease, useNativeDriver: true }),
        Animated.timing(drop1, { toValue: 0, duration: 100, useNativeDriver: true }),
        Animated.delay(300),
      ]));
      const d2 = Animated.loop(Animated.sequence([
        Animated.delay(400),
        Animated.timing(drop2, { toValue: 1, duration: 700, easing: Easing.ease, useNativeDriver: true }),
        Animated.timing(drop2, { toValue: 0, duration: 100, useNativeDriver: true }),
        Animated.delay(200),
      ]));
      anim = Animated.parallel([d1, d2]);
    } else if (type === 'storm') {
      anim = Animated.loop(Animated.sequence([
        Animated.timing(flash, { toValue: 0.4, duration: 100, useNativeDriver: true }),
        Animated.timing(flash, { toValue: 1,   duration: 100, useNativeDriver: true }),
        Animated.delay(2000),
      ]));
    }
    anim?.start();
    return () => anim?.stop();
  }, [type]);

  const EMOJI_SIZE = 26;

  if (type === 'sunny') {
    return (
      <Animated.Text style={{ fontSize: EMOJI_SIZE, transform: [{ scale: pulse }] }}>☀️</Animated.Text>
    );
  }
  if (type === 'partly') {
    return (
      <Animated.Text style={{ fontSize: EMOJI_SIZE, transform: [{ translateX: drift }] }}>⛅</Animated.Text>
    );
  }
  if (type === 'cloudy') {
    return (
      <Animated.Text style={{ fontSize: EMOJI_SIZE, transform: [{ translateX: drift }] }}>☁️</Animated.Text>
    );
  }
  if (type === 'rain') {
    return (
      <View>
        <Text style={{ fontSize: EMOJI_SIZE }}>🌧</Text>
        <View style={{ flexDirection:'row', gap:5, marginTop:2 }}>
          <Animated.View style={{ width:2, height:6, borderRadius:1, backgroundColor:'rgba(0,100,200,0.4)', opacity: drop1, transform:[{ translateY: Animated.multiply(drop1, 4) }] }}/>
          <Animated.View style={{ width:2, height:6, borderRadius:1, backgroundColor:'rgba(0,100,200,0.4)', opacity: drop2, transform:[{ translateY: Animated.multiply(drop2, 4) }] }}/>
          <Animated.View style={{ width:2, height:6, borderRadius:1, backgroundColor:'rgba(0,100,200,0.4)', opacity: drop1, transform:[{ translateY: Animated.multiply(drop1, 4) }] }}/>
        </View>
      </View>
    );
  }
  // storm
  return (
    <Animated.Text style={{ fontSize: EMOJI_SIZE, opacity: flash }}>⛈</Animated.Text>
  );
}

// ── Todo urgency dot colour ────────────────────────────────────────────────
function todoPriorityColor(todo: any): string {
  const today = localDateStr();
  const due = todo.due_date || null;
  if (todo.priority === 'urgent' || (due && due < today)) return '#FF4545'; // red = overdue
  if (due && due === today) return '#F59E0B';                                // amber = today
  if (todo.priority === 'high') return '#F59E0B';
  return 'rgba(0,0,0,0.15)';                                                // grey = normal
}

function todoBadge(todo: any): { label: string; style: 'rem' | 'ovd' | 'td' } | null {
  const today = localDateStr();
  const due = todo.due_date || null;
  if (due && due < today) return { label: 'Overdue', style: 'ovd' };
  if (todo.reminder_type === 'reminder') return { label: 'Reminder', style: 'rem' };
  return { label: 'Todo', style: 'td' };
}

// ── Meal emoji helper ──────────────────────────────────────────────────────
function getMealEmoji(name: string): string {
  const n = (name || '').toLowerCase();
  if (/pasta|bolognese|spaghetti|fettuccine/.test(n)) return '🍝';
  if (/pizza/.test(n)) return '🍕';
  if (/burger|maccas/.test(n)) return '🍔';
  if (/taco|mexican|burrito/.test(n)) return '🌮';
  if (/sushi|japanese/.test(n)) return '🍣';
  if (/stir.?fry|noodle|fried rice|asian/.test(n)) return '🍜';
  if (/roast|lamb|chicken|pork/.test(n)) return '🍗';
  if (/salad|veg|vegetable/.test(n)) return '🥗';
  if (/fish|salmon|tuna|seafood/.test(n)) return '🐟';
  if (/curry|indian/.test(n)) return '🍛';
  if (/soup|stew/.test(n)) return '🍲';
  if (/bbq|grill/.test(n)) return '🍖';
  if (/sandwich|wrap/.test(n)) return '🥙';
  if (/breakfast|eggs|pancake/.test(n)) return '🥞';
  return '🍽';
}

// ── Day label for dinner card ─────────────────────────────────────────────
function fmtDayLabel(dateStr: string): string {
  const today = localDateStr();
  const diff = Math.round((new Date(dateStr+'T00:00:00').getTime() - new Date(today+'T00:00:00').getTime()) / 86400000);
  if (diff === 0) return 'Tonight';
  const d = new Date(dateStr+'T00:00:00');
  return d.toLocaleDateString('en-AU', { weekday: 'short' });
}

// ── Calendar keyword detection ─────────────────────────────────────────────
const CALENDAR_KEYWORDS = [
  "what's on", "whats on", "what is on", "calendar", "schedule",
  "this week", "next week", "this weekend", "today", "tomorrow", "tonight",
  "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
  "mon", "tue", "wed", "thu", "fri", "sat", "sun",
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
  "next month", "this month", "coming up", "upcoming", "what do we have",
  "any events", "anything on", "game", "training", "practice", "appointment",
  "pickup", "drop off", "school", "when is", "when does", "remind me",
  "week ahead", "what have we got", "busy", "free",
];

// Fix Whisper misspellings of "Zaeli"
function fixZaeliSpelling(text: string): string {
  return text.replace(/\b(zelie|zeli|zayli|zaylee|zaily|zalie|zellie|zailee|zaelie)\b/gi, 'Zaeli');
}

const ACTION_KEYWORDS = [
  'add ', 'remove ', 'delete ', 'change ', 'move ', 'update ', 'edit ',
  'reschedule', 'cancel ', 'rename ', 'shift ', 'put ', 'book ',
  'also add', 'can you add', 'please add', 'add anna', 'add rich', 'add poppy',
  'add gab', 'add duke', 'assign ', 'invite ',
  'mark ', 'complete', 'done', 'finish', 'tick ', 'check off',
  'swap ', 'replace ', 'set ', 'plan ', 'goal',
];

function isActionQuery(text: string): boolean {
  const lower = text.toLowerCase();
  return ACTION_KEYWORDS.some(kw => lower.includes(kw));
}
function isCalendarQuery(text: string): boolean {
  const lower = text.toLowerCase();
  if (isActionQuery(lower)) return false;
  return CALENDAR_KEYWORDS.some(kw => lower.includes(kw));
}
function isFullCalendarRequest(text: string): boolean {
  const lower = text.toLowerCase();
  return /full calendar|whole calendar|all events|all my events|everything on|show.{0,10}calendar|open calendar|see.{0,10}calendar|view.{0,10}calendar/.test(lower);
}
function getEventFetchDays(text: string): number {
  const lower = text.toLowerCase();
  const MONTHS = ['january','february','march','april','may','june','july','august','september','october','november','december'];
  if (MONTHS.some(m => lower.includes(m))) return 120;
  if (lower.includes('next month')) return 60;
  if (/\d{1,2}(st|nd|rd|th)/.test(lower)) return 120;
  return 14;
}

function getPillColor(chip: string): string {
  const t = chip.toLowerCase();
  if (/calendar|schedule|on today|on tomorrow|on this|on next|what's on|what have|coming up|week ahead|event|clashes?|clashing|busy|free day|show me|tomorrow|prep|morning|week|day ahead|first up|what's first|see next|next day/.test(t)) return '#B8EDD0';
  if (/shop|list|groceries|pantry|buy|milk|eggs|coles|woolies|supermarket|receipt|spend|spending|stock/.test(t)) return '#F0E880';
  if (/dinner|lunch|breakfast|meal|recipe|food|eat|cook|tonight/.test(t)) return '#FAC8A8';
  if (/todo|task|urgent|pressing|to.do|remind|due|overdue|sort|what needs|needs doing/.test(t)) return '#F0DC80';
  if (/kids?|family|homework|school|poppy|gab|duke|anna|children|sport|activity|jobs/.test(t)) return '#A8E8CC';
  return HOME_AI;
}

async function fetchEventsForContext(days: number): Promise<{ eventsJson: string; eventsRaw: any[] }> {
  try {
    const today = localDateStr();
    const future = new Date();
    future.setDate(future.getDate() + days);
    const futureStr = localDateStr(future);
    const { data } = await supabase
      .from('events')
      .select('id, title, date, start_time, end_time, notes, assignees, all_day')
      .eq('family_id', FAMILY_ID)
      .gte('date', today)
      .lte('date', futureStr)
      .order('date')
      .order('start_time')
      .limit(50);
    const eventsRaw = (data ?? []).filter((e: any) => {
      if (e.all_day) return false;
      const st = e.start_time || '';
      if (st.includes('T00:00:00') || st.includes(' 00:00:00')) return false;
      return true;
    });
    const eventsJson = eventsRaw.map(e => ({
      id: e.id, title: e.title, date: e.date,
      start_time: e.start_time, end_time: e.end_time,
      notes: e.notes || '', assignees: e.assignees || [],
    }));
    return { eventsJson: JSON.stringify(eventsJson), eventsRaw };
  } catch {
    return { eventsJson: '[]', eventsRaw: [] };
  }
}

// ── API logging ────────────────────────────────────────────────────────────
const GPT_IN_PER_M     = 0.15;
const GPT_OUT_PER_M    = 0.60;
const CLAUDE_IN_PER_M  = 3.00;
const CLAUDE_OUT_PER_M = 15.00;

async function logApiCall(params: {
  family_id: string; feature: string; model: string;
  input_tokens: number; output_tokens: number; cost_usd: number;
}) {
  try {
    await supabase.from('api_logs').insert({ ...params, created_at: new Date().toISOString() });
  } catch {}
}

async function callGPT(
  system: string,
  msgs: { role: string; content: string }[],
  maxTokens = 400,
  feature = 'chat_response'
): Promise<string> {
  const key = process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? '';
  if (!key) throw new Error('No OpenAI key');
  const res = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: { 'Content-Type':'application/json', Authorization:`Bearer ${key}` },
    body: JSON.stringify({ model:'gpt-5.4-mini', max_completion_tokens:maxTokens, messages:[{ role:'system', content:system }, ...msgs] }),
  });
  const json = await res.json();
  const text = json?.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error(`GPT empty: ${JSON.stringify(json)}`);
  const pt = json?.usage?.prompt_tokens ?? 0;
  const ct = json?.usage?.completion_tokens ?? 0;
  const cost = (pt / 1_000_000 * GPT_IN_PER_M) + (ct / 1_000_000 * GPT_OUT_PER_M);
  logApiCall({ family_id: FAMILY_ID, feature, model:'gpt-5.4-mini', input_tokens:pt, output_tokens:ct, cost_usd:cost });
  return text;
}

function logWhisper(durationSeconds: number) {
  const cost = (durationSeconds / 60) * 0.006;
  logApiCall({ family_id:FAMILY_ID, feature:'whisper_transcription', model:'whisper-1', input_tokens:0, output_tokens:0, cost_usd:cost });
}
function logVision(inputTokens: number, outputTokens: number) {
  const cost = (inputTokens / 1_000_000 * CLAUDE_IN_PER_M) + (outputTokens / 1_000_000 * CLAUDE_OUT_PER_M);
  logApiCall({ family_id:FAMILY_ID, feature:'chat_vision', model:'claude-sonnet-4-20250514', input_tokens:inputTokens, output_tokens:outputTokens, cost_usd:cost });
}

// ── Icons ──────────────────────────────────────────────────────────────────
function IcoPlus({ color = INK3 }: { color?: string }) {
  return <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><Line x1="12" y1="5" x2="12" y2="19"/><Line x1="5" y1="12" x2="19" y2="12"/></Svg>;
}
function IcoMic({ color = INK3, size = 20 }: { color?: string; size?: number }) {
  return <Svg width={size} height={size} viewBox="0 0 24 26" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><Rect x="9" y="2" width="6" height="11" rx="3"/><Path d="M5 10a7 7 0 0014 0"/><Line x1="12" y1="19" x2="12" y2="23"/><Line x1="8" y1="23" x2="16" y2="23"/></Svg>;
}
function IcoSend() {
  return <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><Line x1="12" y1="19" x2="12" y2="5"/><Polyline points="5 12 12 5 19 12"/></Svg>;
}
function IcoArrowUp() {
  return <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><Line x1="12" y1="19" x2="12" y2="5"/><Polyline points="5 12 12 5 19 12"/></Svg>;
}
function IcoArrowDown() {
  return <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><Line x1="12" y1="5" x2="12" y2="19"/><Polyline points="19 12 12 19 5 12"/></Svg>;
}
function IcoPlay({ color = INK3 }: { color?: string }) {
  return <Svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><Polygon points="5 3 19 12 5 21 5 3"/></Svg>;
}
function IcoCopy({ color = INK3 }: { color?: string }) {
  return <Svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><Rect x="9" y="9" width="13" height="13" rx="2"/><Path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></Svg>;
}
function IcoForward({ color = INK3 }: { color?: string }) {
  return <Svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><Line x1="22" y1="2" x2="11" y2="13"/><Polygon points="22 2 15 22 11 13 2 9 22 2"/></Svg>;
}
function IcoThumbUp({ color = INK3 }: { color?: string }) {
  return <Svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><Path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z"/><Path d="M7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"/></Svg>;
}
function IcoThumbDown({ color = INK3 }: { color?: string }) {
  return <Svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><Path d="M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3H10z"/><Path d="M17 2h2.67A2.31 2.31 0 0122 4v7a2.31 2.31 0 01-2.33 2H17"/></Svg>;
}
function IcoClose() {
  return <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={INK} strokeWidth="2.2" strokeLinecap="round"><Line x1="18" y1="6" x2="6" y2="18"/><Line x1="6" y1="6" x2="18" y2="18"/></Svg>;
}

// ── Domain pill SVG icons (Option D spec) ──────────────────────────────────
function PilIcoHome({ color }: { color: string }) {
  return <Svg width="18" height="18" viewBox="0 0 24 24" fill="none"><Path d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1v-9.5z" stroke={color} strokeWidth="1.8" strokeLinejoin="round"/><Rect x="9" y="13" width="6" height="8" rx="1" stroke={color} strokeWidth="1.8"/></Svg>;
}
function PilIcoCal({ color }: { color: string }) {
  return <Svg width="18" height="18" viewBox="0 0 24 24" fill="none"><Rect x="3" y="4" width="18" height="18" rx="3" stroke={color} strokeWidth="1.8"/><Line x1="3" y1="10" x2="21" y2="10" stroke={color} strokeWidth="1.8"/><Line x1="8" y1="2" x2="8" y2="6" stroke={color} strokeWidth="1.8" strokeLinecap="round"/><Line x1="16" y1="2" x2="16" y2="6" stroke={color} strokeWidth="1.8" strokeLinecap="round"/><Circle cx="8" cy="15" r="1.2" fill={color}/><Circle cx="12" cy="15" r="1.2" fill={color}/><Circle cx="16" cy="15" r="1.2" fill={color}/></Svg>;
}
function PilIcoShop({ color }: { color: string }) {
  return <Svg width="18" height="18" viewBox="0 0 24 24" fill="none"><Path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" stroke={color} strokeWidth="1.8" strokeLinejoin="round"/><Line x1="3" y1="6" x2="21" y2="6" stroke={color} strokeWidth="1.8"/><Path d="M16 10a4 4 0 01-8 0" stroke={color} strokeWidth="1.8" strokeLinecap="round"/></Svg>;
}
function PilIcoMeal({ color }: { color: string }) {
  return <Svg width="18" height="18" viewBox="0 0 24 24" fill="none"><Circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.8"/><Line x1="8.5" y1="7" x2="8.5" y2="9.5" stroke={color} strokeWidth="1.8" strokeLinecap="round"/><Line x1="10.5" y1="7" x2="10.5" y2="9.5" stroke={color} strokeWidth="1.8" strokeLinecap="round"/><Line x1="9" y1="11.5" x2="9" y2="16" stroke={color} strokeWidth="1.8" strokeLinecap="round"/><Path d="M14 7.5 C15.5 9 15.5 11.5 14 13 L14 17" stroke={color} strokeWidth="1.8" strokeLinecap="round"/></Svg>;
}
function PilIcoTodo({ color }: { color: string }) {
  return <Svg width="18" height="18" viewBox="0 0 24 24" fill="none"><Rect x="3" y="3" width="18" height="18" rx="4" stroke={color} strokeWidth="1.8"/><Polyline points="7.5 12 10.5 15.5 16.5 8.5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></Svg>;
}
function PilIcoNotes({ color }: { color: string }) {
  return <Svg width="18" height="18" viewBox="0 0 24 24" fill="none"><Rect x="4" y="2" width="16" height="20" rx="2.5" stroke={color} strokeWidth="1.8"/><Line x1="8" y1="8" x2="16" y2="8" stroke={color} strokeWidth="1.6" strokeLinecap="round"/><Line x1="8" y1="12" x2="16" y2="12" stroke={color} strokeWidth="1.6" strokeLinecap="round"/><Line x1="8" y1="16" x2="13" y2="16" stroke={color} strokeWidth="1.6" strokeLinecap="round"/></Svg>;
}
function PilIcoTravel({ color }: { color: string }) {
  return <Svg width="18" height="18" viewBox="0 0 24 24" fill="none"><Path d="M21 16l-9-5-1-7-2 1 1 6.5L4 14.5l-.5 2 6.5-1.5 1 5.5 2 .5-.5-7 8.5-3.5z" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></Svg>;
}
function PilIcoFamily({ color }: { color: string }) {
  return <Svg width="18" height="18" viewBox="0 0 24 24" fill="none"><Circle cx="9" cy="7" r="3" stroke={color} strokeWidth="1.7"/><Circle cx="17" cy="8" r="2.5" stroke={color} strokeWidth="1.5"/><Path d="M3 19c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke={color} strokeWidth="1.7" strokeLinecap="round"/><Path d="M17 13c2.2.6 4 2.6 4 5" stroke={color} strokeWidth="1.5" strokeLinecap="round"/></Svg>;
}
function PilIcoMore({ color }: { color: string }) {
  return <Svg width="18" height="18" viewBox="0 0 24 24" fill="none"><Circle cx="5" cy="12" r="2" fill={color}/><Circle cx="12" cy="12" r="2" fill={color}/><Circle cx="19" cy="12" r="2" fill={color}/></Svg>;
}
function IcoCamera() {
  return <Svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={INK} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><Path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><Circle cx="12" cy="13" r="4"/></Svg>;
}
function IcoPhotos() {
  return <Svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={INK} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><Rect x="3" y="3" width="18" height="18" rx="2"/><Circle cx="8.5" cy="8.5" r="1.5"/><Polyline points="21 15 16 10 5 21"/></Svg>;
}
function IcoX() {
  return <Svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><Line x1="18" y1="6" x2="6" y2="18"/><Line x1="6" y1="6" x2="18" y2="18"/></Svg>;
}

// ── Typing dots ────────────────────────────────────────────────────────────
function TypingDots({ color = '#FF4545' }: { color?: string }) {
  const dots = useRef([0,1,2].map(() => new Animated.Value(0.25))).current;
  useEffect(() => {
    const anims = dots.map((dot, i) =>
      Animated.loop(Animated.sequence([
        Animated.delay(i * 160),
        Animated.timing(dot, { toValue:1, duration:300, easing:Easing.ease, useNativeDriver:true }),
        Animated.timing(dot, { toValue:0.25, duration:300, easing:Easing.ease, useNativeDriver:true }),
        Animated.delay(500 - i * 160),
      ]))
    );
    anims.forEach(a => a.start());
    return () => anims.forEach(a => a.stop());
  }, []);
  return (
    <View style={s.dotsRow}>
      {dots.map((op, i) => <Animated.View key={i} style={[s.dot, { opacity:op, backgroundColor:color }]}/>)}
    </View>
  );
}

// ── WaveformBars ────────────────────────────────────────────────────────────
function WaveformBars() {
  const anims = useRef(Array.from({ length:5 }, (_, i) => new Animated.Value(0.3 + i * 0.1))).current;
  useEffect(() => {
    const loops = anims.map((anim, i) => {
      const min = 0.2 + i * 0.05, max = 0.7 + (i % 3) * 0.15, spd = 180 + i * 55;
      return Animated.loop(Animated.sequence([
        Animated.timing(anim, { toValue:max, duration:spd, easing:Easing.inOut(Easing.ease), useNativeDriver:true }),
        Animated.timing(anim, { toValue:min, duration:spd+40, easing:Easing.inOut(Easing.ease), useNativeDriver:true }),
      ]));
    });
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, []);
  return (
    <View style={s.waveRow}>
      {anims.map((anim, i) => <Animated.View key={i} style={[s.waveBar, { transform:[{ scaleY:anim }] }]}/>)}
    </View>
  );
}

// ── MicWaveform ─────────────────────────────────────────────────────────────
function MicWaveform() {
  const anims = useRef(Array.from({ length:13 }, (_, i) => new Animated.Value(0.15 + (i % 3) * 0.1))).current;
  useEffect(() => {
    const loops = anims.map((anim, i) => {
      const min = 0.1 + (i % 4) * 0.05, max = 0.6 + (i % 5) * 0.08, spd = 280 + (i % 6) * 60;
      return Animated.loop(Animated.sequence([
        Animated.delay(i * 55),
        Animated.timing(anim, { toValue:max, duration:spd, easing:Easing.inOut(Easing.ease), useNativeDriver:true }),
        Animated.timing(anim, { toValue:min, duration:spd+40, easing:Easing.inOut(Easing.ease), useNativeDriver:true }),
      ]));
    });
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, []);
  return (
    <View style={{ flexDirection:'row', alignItems:'center', gap:4, height:52 }}>
      {anims.map((anim, i) => (
        <Animated.View key={i} style={{ width:4, borderRadius:3, backgroundColor:HOME_AI, transform:[{ scaleY:anim }], height:52 }}/>
      ))}
    </View>
  );
}

// ── getEventEmoji ─────────────────────────────────────────────────────────
function getEventEmoji(title: string): string {
  const t = title.toLowerCase();
  if (/soccer|football|footy/.test(t))              return '⚽';
  if (/danc|ballet|recital/.test(t))                return '💃';
  if (/run|jog|park run/.test(t))                   return '🏃';
  if (/swim|pool|squad/.test(t))                    return '🏊';
  if (/gym|workout|weights|crossfit/.test(t))       return '🏋️';
  if (/tennis/.test(t))                             return '🎾';
  if (/cricket/.test(t))                            return '🏏';
  if (/netball|basket/.test(t))                     return '🏀';
  if (/rugby|afl|nrl/.test(t))                      return '🏉';
  if (/golf/.test(t))                               return '⛳';
  if (/bike|cycling|ride/.test(t))                  return '🚴';
  if (/yoga|pilates|stretch/.test(t))               return '🧘';
  if (/school|class|lesson|tutor|homework/.test(t)) return '🏫';
  if (/surf|ski|kayak|paddle/.test(t))              return '🏄';
  if (/photo|portrait/.test(t))                     return '📷';
  if (/library|book/.test(t))                       return '📚';
  if (/dentist|orthodon/.test(t))                   return '🦷';
  if (/doctor|gp|hospital|physio|chiro/.test(t))    return '🏥';
  if (/birthday|party|celebrat/.test(t))            return '🎂';
  if (/dinner|supper/.test(t))                      return '🍽';
  if (/lunch/.test(t))                              return '🥗';
  if (/breakfast/.test(t))                          return '🥞';
  if (/coffee|cafe/.test(t))                        return '☕';
  if (/dog|walk.*dog/.test(t))                      return '🐕';
  if (/haircut|barber/.test(t))                     return '✂️';
  if (/flight|travel|airport|holiday|trip/.test(t)) return '✈️';
  if (/meeting|call|zoom|teams/.test(t))            return '💼';
  if (/pickup|drop.?off/.test(t))                   return '🚗';
  if (/bins|rubbish|recycl/.test(t))                return '🗑';
  if (/concert|show|theatre|movie/.test(t))         return '🎭';
  if (/t.?ball|tball/.test(t))                      return '⚾';
  if (/gymnastics/.test(t))                         return '🤸';
  return '📅';
}

// ── EventCard (card stack, existing style) ────────────────────────────────
function EventCard({ ev, onPress }: { ev: any; onPress: () => void }) {
  const assignedMembers = (ev.assignees || [])
    .map((id: string) => FAMILY_MEMBERS.find(m => m.id === id))
    .filter(Boolean) as any[];
  const primaryColor = assignedMembers.length > 0 ? assignedMembers[0].color : null;
  const bgColor = primaryColor ? primaryColor + '2E' : 'rgba(0,0,0,0.06)';
  const timeColor = primaryColor ?? 'rgba(0,0,0,0.45)';
  const emoji = getEventEmoji(ev.title || '');
  const noteParts = (ev.notes || '').split(' | ');
  const location = noteParts.length > 1 ? noteParts[noteParts.length - 1] : '';
  return (
    <TouchableOpacity style={[s.evCard, { backgroundColor:bgColor }]} onPress={onPress} activeOpacity={0.75}>
      <View style={s.evCardInner}>
        <View style={{ flex:1 }}>
          <View style={{ flexDirection:'row', alignItems:'center', gap:8, marginBottom:4 }}>
            <Text style={{ fontSize:20 }}>{emoji}</Text>
            <Text style={[s.evTitle, { marginBottom:0, flex:1 }]}>{ev.title}</Text>
          </View>
          <Text style={[s.evTime, { color:timeColor }]}>
            {fmtTime(ev.start_time)}{ev.end_time && ev.end_time !== ev.start_time ? ` – ${fmtTime(ev.end_time)}` : ''}
          </Text>
          {location ? <Text style={s.evLocation}>📍 {location}</Text> : null}
        </View>
        {assignedMembers.length > 0 && (
          <View style={s.evAvatarCol}>
            {assignedMembers.length <= 3 ? (
              assignedMembers.map((m: any) => {
                const size = assignedMembers.length === 1 ? 28 : 22;
                return (
                  <View key={m.id} style={[s.evAv, { backgroundColor:m.color, width:size, height:size, borderRadius:size/2 }]}>
                    <Text style={[s.evAvTxt, { fontSize:assignedMembers.length === 1 ? 12 : 10 }]}>{m.name[0]}</Text>
                  </View>
                );
              })
            ) : (
              <View style={s.evAvatarGrid}>
                {assignedMembers.slice(0,3).map((m: any) => (
                  <View key={m.id} style={[s.evAv, { backgroundColor:m.color, width:20, height:20, borderRadius:10 }]}>
                    <Text style={[s.evAvTxt, { fontSize:8 }]}>{m.name[0]}</Text>
                  </View>
                ))}
                <View style={[s.evAv, { backgroundColor:'rgba(10,10,10,0.12)', width:20, height:20, borderRadius:10 }]}>
                  <Text style={{ fontFamily:'Poppins_700Bold', fontSize:7, color:'rgba(10,10,10,0.55)' }}>+{assignedMembers.length - 3}</Text>
                </View>
              </View>
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ── Picker subcomponents ───────────────────────────────────────────────────

// ── InlineCalendarCard ────────────────────────────────────────────────────
// Dark slate inline card — drops into chat thread from pill tap.
// Shows today's events. Tap event → expands inline with action chips.
// Footer: Today | Tomorrow › | Month view ›

// Sub-component: animated expanded event detail
function ExpandedEventDetail({ ev, onCollapse, onEditWithZaeli, onFullSheet, onManualEdit, onDeleteEvent }: {
  ev: any; onCollapse: () => void;
  onEditWithZaeli: (ev: any) => void; onFullSheet: () => void;
  onManualEdit: (ev: any) => void; onDeleteEvent: (ev: any) => void;
}) {
  const [confirmDel, setConfirmDel] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;
  const noteParts = (ev.notes||'').split(' | ');
  const location = noteParts.length > 1 ? noteParts[noteParts.length-1] : '';
  const members = (ev.assignees||[]).map((id:string) => FAMILY_MEMBERS.find(m=>m.id===id)).filter(Boolean) as any[];
  const emoji = getEventEmoji(ev.title||'');

  useEffect(() => {
    Animated.spring(anim, { toValue:1, useNativeDriver:true, tension:80, friction:10 }).start();
  }, []);

  return (
    <Animated.View style={{
      backgroundColor:'rgba(255,255,255,0.09)', borderRadius:12, margin:6, padding:14,
      opacity: anim,
      transform:[{ scaleY: anim.interpolate({ inputRange:[0,1], outputRange:[0.85,1] }) }],
    }}>
      {/* Header */}
      <View style={{ flexDirection:'row', alignItems:'center', gap:10, marginBottom:6 }}>
        <Text style={{ fontSize:22 }}>{emoji}</Text>
        <Text style={{ fontFamily:'Poppins_700Bold', fontSize:16, color:'rgba(255,255,255,0.95)', flex:1 }}>{ev.title}</Text>
        <TouchableOpacity onPress={onCollapse} activeOpacity={0.7} hitSlop={{ top:8, bottom:8, left:8, right:8 }}>
          <Text style={{ fontFamily:'Poppins_400Regular', fontSize:11, color:'rgba(255,255,255,0.40)' }}>▲ close</Text>
        </TouchableOpacity>
      </View>
      {/* Meta */}
      <Text style={{ fontFamily:'Poppins_400Regular', fontSize:13, color:'rgba(255,255,255,0.55)', lineHeight:20, marginBottom:10 }}>
        {fmtTime(ev.start_time)}{ev.end_time && ev.end_time !== ev.start_time ? `–${fmtTime(ev.end_time)}` : ''}{location ? ` · ${location}` : ''}
      </Text>
      {/* Avatars */}
      {members.length > 0 && (
        <View style={{ flexDirection:'row', gap:6, marginBottom:12 }}>
          {members.map((m:any) => (
            <View key={m.id} style={{ width:28, height:28, borderRadius:14, backgroundColor:m.color, alignItems:'center', justifyContent:'center' }}>
              <Text style={{ fontFamily:'Poppins_700Bold', fontSize:10, color:'#fff' }}>{m.name[0]}</Text>
            </View>
          ))}
        </View>
      )}
      {/* Action chips */}
      <View style={{ flexDirection:'row', flexWrap:'wrap', gap:6 }}>
        <TouchableOpacity
          style={{ backgroundColor:'rgba(168,216,240,0.22)', borderWidth:1, borderColor:'rgba(168,216,240,0.45)', borderRadius:16, paddingVertical:6, paddingHorizontal:12 }}
          onPress={() => onEditWithZaeli(ev)} activeOpacity={0.75}
        >
          <Text style={{ fontFamily:'Poppins_600SemiBold', fontSize:12, color:'rgba(168,216,240,0.95)' }}>✦ Edit with Zaeli</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{ backgroundColor:'rgba(255,255,255,0.10)', borderWidth:1, borderColor:'rgba(255,255,255,0.18)', borderRadius:16, paddingVertical:6, paddingHorizontal:12 }}
          onPress={() => onEditWithZaeli(ev)} activeOpacity={0.75}
        >
          <Text style={{ fontFamily:'Poppins_600SemiBold', fontSize:12, color:'rgba(255,255,255,0.78)' }}>Move time</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{ backgroundColor:'rgba(255,255,255,0.10)', borderWidth:1, borderColor:'rgba(255,255,255,0.18)', borderRadius:16, paddingVertical:6, paddingHorizontal:12 }}
          onPress={() => onEditWithZaeli(ev)} activeOpacity={0.75}
        >
          <Text style={{ fontFamily:'Poppins_600SemiBold', fontSize:12, color:'rgba(255,255,255,0.78)' }}>Add someone</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{ backgroundColor:'rgba(255,255,255,0.10)', borderWidth:1, borderColor:'rgba(255,255,255,0.18)', borderRadius:16, paddingVertical:6, paddingHorizontal:12 }}
          onPress={() => onManualEdit(ev)} activeOpacity={0.75}
        >
          <Text style={{ fontFamily:'Poppins_600SemiBold', fontSize:12, color:'rgba(255,255,255,0.78)' }}>Manual edit</Text>
        </TouchableOpacity>
        {confirmDel ? (
          <TouchableOpacity
            style={{ backgroundColor:'rgba(220,38,38,0.25)', borderWidth:1, borderColor:'rgba(220,38,38,0.55)', borderRadius:16, paddingVertical:6, paddingHorizontal:12 }}
            onPress={() => onDeleteEvent(ev)} activeOpacity={0.75}
          >
            <Text style={{ fontFamily:'Poppins_700Bold', fontSize:12, color:'#ff6b6b' }}>Confirm delete</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={{ backgroundColor:'rgba(255,255,255,0.07)', borderWidth:1, borderColor:'rgba(255,255,255,0.14)', borderRadius:16, paddingVertical:6, paddingHorizontal:12 }}
            onPress={() => setConfirmDel(true)} activeOpacity={0.75}
          >
            <Text style={{ fontFamily:'Poppins_600SemiBold', fontSize:12, color:'rgba(255,100,100,0.70)' }}>Delete</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

function InlineCalendarCard({
  msgId, todayEvents, tomorrowEvents,
  onEditWithZaeli, onAddWithZaeli,
  onFullSheet, onTomorrowSheet,
  onExpandingCard, onManualEdit, onDeleteEvent,
}: {
  msgId: string;
  todayEvents: any[];
  tomorrowEvents: any[];
  onEditWithZaeli: (ev: any) => void;
  onAddWithZaeli: () => void;
  onFullSheet: () => void;
  onTomorrowSheet: () => void;
  onExpandingCard: () => void;
  onManualEdit: (ev: any) => void;
  onDeleteEvent: (ev: any) => void;
}) {
  const [showTab, setShowTab] = useState<'today'|'tomorrow'>('today');
  const [expandedId, setExpandedId] = useState<string|null>(null);
  const events = showTab === 'today' ? todayEvents : tomorrowEvents;
  const now = new Date();
  const todayLabel = now.toLocaleDateString('en-AU', { weekday:'short', day:'numeric', month:'short' }).toUpperCase();
  const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate()+1);
  const tomorrowLabel = tomorrow.toLocaleDateString('en-AU', { weekday:'short', day:'numeric', month:'short' }).toUpperCase();
  const eyeLabel = showTab === 'today'
    ? `📅 TODAY · ${todayLabel}`
    : `📅 TOMORROW · ${tomorrowLabel}`;

  const CAL_SLATE = '#3A3D4A';

  return (
    <View style={{ backgroundColor:CAL_SLATE, borderRadius:16, marginHorizontal:-4, marginTop:8, marginBottom:2, overflow:'hidden' }}>
      {/* Header */}
      <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:14, paddingTop:12, paddingBottom:10 }}>
        <Text style={{ fontFamily:'Poppins_700Bold', fontSize:12, letterSpacing:0.10, textTransform:'uppercase', color:'rgba(255,255,255,0.65)' }}>
          {eyeLabel}
        </Text>
        <View style={{ flexDirection:'row', alignItems:'center', gap:14 }}>
          <TouchableOpacity
            style={{ backgroundColor:'rgba(255,255,255,0.18)', borderRadius:9, paddingVertical:6, paddingHorizontal:13 }}
            onPress={onAddWithZaeli} activeOpacity={0.75}
          >
            <Text style={{ fontFamily:'Poppins_700Bold', fontSize:12, color:'#fff' }}>+ Add</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onFullSheet} activeOpacity={0.75} style={{ paddingVertical:6, paddingHorizontal:4 }}>
            <Text style={{ fontFamily:'Poppins_600SemiBold', fontSize:12, color:'rgba(255,255,255,0.55)' }}>Full ›</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Event rows */}
      {events.length === 0 ? (
        <Text style={{ fontFamily:'Poppins_400Regular', fontSize:15, color:'rgba(255,255,255,0.40)', fontStyle:'italic', paddingHorizontal:14, paddingBottom:14 }}>
          Nothing on {showTab === 'today' ? 'today' : 'tomorrow'}
        </Text>
      ) : events.map((ev: any) => {
        const members = (ev.assignees||[]).map((id:string) => FAMILY_MEMBERS.find(m=>m.id===id)).filter(Boolean) as any[];
        const dotColor = members.length > 0 ? members[0].color : 'rgba(255,255,255,0.4)';

        if (expandedId === ev.id) {
          return (
            <ExpandedEventDetail
              key={ev.id}
              ev={ev}
              onCollapse={() => setExpandedId(null)}
              onEditWithZaeli={onEditWithZaeli}
              onFullSheet={onFullSheet}
              onManualEdit={onManualEdit}
              onDeleteEvent={onDeleteEvent}
            />
          );
        }

        return (
          <TouchableOpacity
            key={ev.id}
            style={{ flexDirection:'row', alignItems:'center', gap:8, paddingHorizontal:14, paddingVertical:8, opacity: expandedId && expandedId !== ev.id ? 0.38 : 1 }}
            onPress={() => {
              onExpandingCard();
              setExpandedId(ev.id);
            }}
            activeOpacity={0.75}
          >
            <Text style={{ fontFamily:'Poppins_500Medium', fontSize:12, color:'rgba(255,255,255,0.50)', width:58, flexShrink:0 }} numberOfLines={1}>
              {fmtTime(ev.start_time)}
            </Text>
            <View style={{ width:8, height:8, borderRadius:4, backgroundColor:dotColor, flexShrink:0 }}/>
            <Text style={{ fontFamily:'Poppins_400Regular', fontSize:16, color:'rgba(255,255,255,0.92)', flex:1 }} numberOfLines={1}>
              {ev.title}
            </Text>
            {members.slice(0,3).map((m:any) => (
              <View key={m.id} style={{ width:26, height:26, borderRadius:13, backgroundColor:m.color, alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <Text style={{ fontFamily:'Poppins_700Bold', fontSize:9, color:'#fff' }}>{m.name[0]}</Text>
              </View>
            ))}
          </TouchableOpacity>
        );
      })}

      {/* Footer navigation */}
      <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:14, paddingTop:10, paddingBottom:12, borderTopWidth:1, borderTopColor:'rgba(255,255,255,0.10)', marginTop:4 }}>
        <View style={{ flexDirection:'row', alignItems:'center', gap:10 }}>
          <TouchableOpacity onPress={() => { setShowTab('today'); setExpandedId(null); }} activeOpacity={0.75}>
            <Text style={{ fontFamily:'Poppins_700Bold', fontSize:11, color: showTab==='today' ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.35)' }}>
              Today
            </Text>
          </TouchableOpacity>
          <Text style={{ fontSize:11, color:'rgba(255,255,255,0.20)' }}>·</Text>
          <TouchableOpacity onPress={() => { setShowTab('tomorrow'); setExpandedId(null); }} activeOpacity={0.75}>
            <Text style={{ fontFamily:'Poppins_700Bold', fontSize:11, color: showTab==='tomorrow' ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.35)' }}>
              Tomorrow ›
            </Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={onTomorrowSheet} activeOpacity={0.75}>
          <Text style={{ fontFamily:'Poppins_600SemiBold', fontSize:11, color:'rgba(255,255,255,0.35)' }}>Month view ›</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── InlineShoppingCard ────────────────────────────────────────────────────
// Lavender card — drops into chat from Shopping pill tap
// 4 items max · tap row = expand · tap circle = mark bought · "X more · Full ›"
function InlineShoppingCard({
  items, totalCount, onOpenSheet, onAddWithZaeli, onMarkBought, onEditItem,
}: {
  items: any[];         // unchecked items (up to 4 shown)
  totalCount: number;
  onOpenSheet: () => void;
  onAddWithZaeli: () => void;
  onMarkBought: (item: any) => void;
  onEditItem: (item: any) => void;
}) {
  const [expandedId, setExpandedId] = React.useState<string|null>(null);
  const [boughtIds,  setBoughtIds]  = React.useState<Set<string>>(new Set());

  const shown = items.slice(0, 4);
  const more  = Math.max(0, totalCount - 4);

  function toggleBought(item: any) {
    const id = item.id;
    setBoughtIds(prev => {
      const n = new Set(prev);
      if (n.has(id)) { n.delete(id); } else { n.add(id); onMarkBought(item); }
      return n;
    });
    setExpandedId(null);
  }

  return (
    <View style={{ backgroundColor: SHOP_C, borderRadius: 16, marginHorizontal: -4, marginTop: 8, marginBottom: 2, overflow: 'hidden' }}>
      {/* Header */}
      <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:14, paddingTop:12, paddingBottom:10 }}>
        <Text style={{ fontFamily:'Poppins_700Bold', fontSize:12, letterSpacing:0.10, textTransform:'uppercase', color:'rgba(80,32,192,0.60)' }}>
          🛒 Shopping List
        </Text>
        <View style={{ flexDirection:'row', alignItems:'center', gap:14 }}>
          <TouchableOpacity
            style={{ backgroundColor:'rgba(80,32,192,0.14)', borderRadius:9, paddingVertical:6, paddingHorizontal:13 }}
            onPress={onAddWithZaeli} activeOpacity={0.75}
          >
            <Text style={{ fontFamily:'Poppins_700Bold', fontSize:12, color: SHOP_ACCENT }}>+ Add</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onOpenSheet} activeOpacity={0.75} style={{ paddingVertical:6, paddingHorizontal:4 }}>
            <Text style={{ fontFamily:'Poppins_600SemiBold', fontSize:12, color:'rgba(80,32,192,0.45)' }}>Full ›</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Item rows */}
      {shown.length === 0 ? (
        <Text style={{ fontFamily:'Poppins_400Regular', fontSize:15, color:'rgba(80,32,192,0.45)', fontStyle:'italic', paddingHorizontal:14, paddingBottom:14 }}>
          List is clear
        </Text>
      ) : shown.map((item: any) => {
        const isBought   = boughtIds.has(item.id);
        const isExpanded = expandedId === item.id;
        const cat = item.category || guessCategory(item.name || item.item || '');

        return (
          <View key={item.id}>
            <TouchableOpacity
              style={{ flexDirection:'row', alignItems:'center', gap:8, paddingHorizontal:14, paddingVertical:8, opacity: isBought ? 0.40 : 1, backgroundColor: isExpanded ? 'rgba(80,32,192,0.07)' : 'transparent' }}
              onPress={() => { if (!isBought) setExpandedId(isExpanded ? null : item.id); }}
              activeOpacity={0.75}
            >
              <View style={{ width:6, height:6, borderRadius:3, backgroundColor: isBought ? SHOP_GREEN : 'rgba(80,32,192,0.28)', flexShrink:0 }}/>
              <Text
                style={{ fontFamily:'Poppins_400Regular', fontSize:16, color: isBought ? 'rgba(0,0,0,0.28)' : '#0A0A0A', flex:1, textDecorationLine: isBought ? 'line-through' : 'none' }}
                numberOfLines={1}
              >
                {item.name || item.item}
              </Text>
              {!isBought && (
                <Text style={{ fontFamily:'Poppins_600SemiBold', fontSize:9, color:'rgba(80,32,192,0.40)', flexShrink:0 }}>{cat.split(' ')[0]}</Text>
              )}
              <TouchableOpacity
                onPress={() => toggleBought(item)}
                hitSlop={{ top:10, bottom:10, left:10, right:10 }}
                activeOpacity={0.75}
                style={{ width:20, height:20, borderRadius:10, borderWidth:1.5, borderColor: isBought ? SHOP_GREEN : 'rgba(80,32,192,0.28)', backgroundColor: isBought ? SHOP_GREEN : 'transparent', alignItems:'center', justifyContent:'center', flexShrink:0 }}
              >
                {isBought && <Text style={{ fontSize:10, color:'#fff', fontWeight:'700' }}>✓</Text>}
              </TouchableOpacity>
            </TouchableOpacity>
            {isExpanded && !isBought && (
              <View style={{ backgroundColor:'rgba(80,32,192,0.06)', paddingHorizontal:14, paddingVertical:10, flexDirection:'row', alignItems:'center', justifyContent:'space-between' }}>
                <Text style={{ fontFamily:'Poppins_400Regular', fontSize:11, color:'rgba(80,32,192,0.55)' }}>
                  {cat}
                </Text>
                <View style={{ flexDirection:'row', gap:8 }}>
                  <TouchableOpacity onPress={() => { setExpandedId(null); onEditItem(item); }} style={{ backgroundColor:'rgba(80,32,192,0.10)', borderRadius:8, paddingVertical:5, paddingHorizontal:11 }} activeOpacity={0.75}>
                    <Text style={{ fontFamily:'Poppins_600SemiBold', fontSize:11, color: SHOP_ACCENT }}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => { setExpandedId(null); onOpenSheet(); }} style={{ backgroundColor:'rgba(255,59,59,0.08)', borderRadius:8, paddingVertical:5, paddingHorizontal:11 }} activeOpacity={0.75}>
                    <Text style={{ fontFamily:'Poppins_600SemiBold', fontSize:11, color:'#FF3B3B' }}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        );
      })}

      {/* Footer */}
      <View style={{ flexDirection:'row', alignItems:'flex-end', justifyContent:'space-between', paddingHorizontal:14, paddingTop:4, paddingBottom:12, borderTopWidth:1, borderTopColor:'rgba(80,32,192,0.10)', marginTop:4 }}>
        <View style={{ flexDirection:'row', alignItems:'flex-end', gap:3 }}>
          <Text style={{ fontFamily:'DMSerifDisplay_400Regular', fontSize:26, color:'rgba(80,32,192,0.60)', lineHeight:28 }}>{totalCount}</Text>
          <Text style={{ fontFamily:'Poppins_600SemiBold', fontSize:9, color:'rgba(80,32,192,0.48)', marginBottom:3 }}> items</Text>
        </View>
        <TouchableOpacity onPress={onOpenSheet} activeOpacity={0.75}>
          {more > 0
            ? <Text style={{ fontFamily:'Poppins_700Bold', fontSize:10, color:'rgba(80,32,192,0.55)', textAlign:'right' }}>+ {more} more{'\n'}<Text style={{ color:'rgba(80,32,192,0.75)', fontSize:11 }}>Full ›</Text></Text>
            : <Text style={{ fontFamily:'Poppins_600SemiBold', fontSize:11, color:'rgba(80,32,192,0.55)' }}>Full ›</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}


const ROW_H = 52;

function SnapCol({ items, selected, onSelect, fmtItem }: {
  items: (string|number)[]; selected: string|number;
  onSelect: (v: string|number) => void; fmtItem?: (v: string|number) => string;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const selIdx = items.indexOf(selected);
  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollTo({ y:selIdx * ROW_H, animated:false }), 50);
  }, []);
  return (
    <View style={{ flex:1, height:ROW_H * 5, overflow:'hidden' }}>
      <View pointerEvents="none" style={{
        position:'absolute', top:ROW_H*2, left:4, right:4, height:ROW_H,
        backgroundColor:'rgba(168,216,240,0.12)', borderRadius:12,
        borderTopWidth:1.5, borderBottomWidth:1.5, borderColor:'rgba(168,216,240,0.3)', zIndex:2,
      }}/>
      <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false}
        snapToInterval={ROW_H} decelerationRate="fast"
        contentContainerStyle={{ paddingVertical:ROW_H*2 }}
        onMomentumScrollEnd={e => {
          const idx = Math.round(e.nativeEvent.contentOffset.y / ROW_H);
          onSelect(items[Math.max(0, Math.min(idx, items.length-1))]);
        }}
        onScrollEndDrag={e => {
          const idx = Math.round(e.nativeEvent.contentOffset.y / ROW_H);
          onSelect(items[Math.max(0, Math.min(idx, items.length-1))]);
        }}>
        {items.map((item, i) => {
          const isSel = item === selected;
          const label = fmtItem ? fmtItem(item) : (
            typeof item === 'number' ? String(item).padStart(2,'0') : String(item).toUpperCase()
          );
          return (
            <TouchableOpacity key={i} style={{ height:ROW_H, alignItems:'center', justifyContent:'center' }}
              onPress={() => { scrollRef.current?.scrollTo({ y:i*ROW_H, animated:true }); onSelect(item); }}
              activeOpacity={0.7}>
              <Text style={{ fontFamily:isSel ? 'Poppins_700Bold' : 'Poppins_400Regular', fontSize:isSel ? 26 : 18, color:isSel ? INK : INK3 }}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

function TimePickerModal({ visible, hour, minute, ampm, onConfirm, onClose }: {
  visible: boolean; hour: number; minute: number; ampm: 'am'|'pm';
  onConfirm: (h:number,m:number,ap:'am'|'pm') => void; onClose: () => void;
}) {
  const [h, setH] = useState(hour);
  const [m, setM] = useState(minute);
  const [ap, setAp] = useState<'am'|'pm'>(ampm);
  useEffect(() => { if (visible) { setH(hour); setM(minute); setAp(ampm); } }, [visible]);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={{ flex:1, backgroundColor:'rgba(0,0,0,0.45)', justifyContent:'center', alignItems:'center' }} onPress={onClose}>
        <Pressable style={{ backgroundColor:'#fff', borderRadius:24, padding:20, width:300 }} onPress={() => {}}>
          <Text style={{ fontFamily:'Poppins_700Bold', fontSize:16, color:INK, marginBottom:12, textAlign:'center' as const }}>Set time</Text>
          <View style={{ flexDirection:'row', gap:4, marginBottom:16 }}>
            <SnapCol items={HOURS} selected={h} onSelect={v => setH(v as number)}/>
            <View style={{ alignSelf:'center', paddingBottom:4 }}><Text style={{ fontFamily:'Poppins_700Bold', fontSize:28, color:INK }}>:</Text></View>
            <SnapCol items={MINUTES} selected={m} onSelect={v => setM(v as number)} fmtItem={v => String(v).padStart(2,'0')}/>
            <SnapCol items={['am','pm']} selected={ap} onSelect={v => setAp(v as 'am'|'pm')} fmtItem={v => String(v).toUpperCase()}/>
          </View>
          <TouchableOpacity style={{ backgroundColor:HOME_AI, borderRadius:14, paddingVertical:13, alignItems:'center' }}
            onPress={() => onConfirm(h, m, ap)} activeOpacity={0.85}>
            <Text style={{ fontFamily:'Poppins_700Bold', fontSize:15, color:INK }}>Confirm</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function TimePill({ hour, minute, ampm, onHour, onMinute, onAmpm }: {
  hour: number; minute: number; ampm: 'am'|'pm';
  onHour: (v:number)=>void; onMinute: (v:number)=>void; onAmpm: (v:'am'|'pm')=>void;
}) {
  const [open, setOpen] = useState(false);
  const label = `${hour}:${String(minute).padStart(2,'0')} ${ampm.toUpperCase()}`;
  return (
    <>
      <TouchableOpacity style={s.gcPill} onPress={() => setOpen(true)} activeOpacity={0.7}>
        <Text style={s.gcPillTxt}>{label}</Text>
      </TouchableOpacity>
      <TimePickerModal visible={open} hour={hour} minute={minute} ampm={ampm}
        onClose={() => setOpen(false)}
        onConfirm={(h,m,ap) => { onHour(h); onMinute(m); onAmpm(ap); setOpen(false); }}/>
    </>
  );
}

function DropdownPicker({ options, value, onChange }: { options:string[]; value:string; onChange:(v:string)=>void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <TouchableOpacity style={s.gcPill} onPress={() => setOpen(true)} activeOpacity={0.7}>
        <Text style={s.gcPillTxt}>{value}</Text>
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={{ flex:1, backgroundColor:'rgba(0,0,0,0.45)', justifyContent:'center', alignItems:'center' }} onPress={() => setOpen(false)}>
          <Pressable style={{ backgroundColor:'#fff', borderRadius:20, paddingVertical:8, width:260 }} onPress={()=>{}}>
            {options.map(opt => (
              <TouchableOpacity key={opt} style={{ paddingVertical:13, paddingHorizontal:20, borderBottomWidth:1, borderBottomColor:'rgba(0,0,0,0.06)' }}
                onPress={() => { onChange(opt); setOpen(false); }} activeOpacity={0.7}>
                <Text style={{ fontFamily: opt===value ? 'Poppins_700Bold' : 'Poppins_400Regular', fontSize:15, color:opt===value ? HOME_AI : INK }}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

// ── EventDetailModal ───────────────────────────────────────────────────────
function EventDetailModal({ event, onClose, onDeleted, onReload }: {
  event: any; onClose:()=>void; onDeleted:()=>void; onReload:()=>void;
}) {
  const [mode, setMode] = useState<'view'|'edit'>('view');
  const [editTitle,    setEditTitle]    = useState('');
  const [editNotes,    setEditNotes]    = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editRepeat,   setEditRepeat]   = useState('Never');
  const [editAlert,    setEditAlert]    = useState('15 min before');
  const [editAssignees,setEditAssignees]= useState<string[]>([]);
  const [editStartH,   setEditStartH]   = useState(9);
  const [editStartM,   setEditStartM]   = useState(0);
  const [editStartAp,  setEditStartAp]  = useState<'am'|'pm'>('am');
  const [editEndH,     setEditEndH]     = useState(10);
  const [editEndM,     setEditEndM]     = useState(0);
  const [editEndAp,    setEditEndAp]    = useState<'am'|'pm'>('am');
  const [saving,       setSaving]       = useState(false);
  const [deleting,     setDeleting]     = useState(false);
  const [confirmDelete,setConfirmDelete]= useState(false);

  useEffect(() => {
    if (event) {
      setMode('view'); setDeleting(false); setConfirmDelete(false); setSaving(false);
      setEditTitle(event.title || '');
      const parts = (event.notes || '').split(' | ');
      setEditNotes(parts[0] || '');
      setEditLocation(parts.length > 1 ? parts[parts.length - 1] : '');
      setEditRepeat(event.repeat_rule || 'Never');
      setEditAlert(event.alert_rule || '15 min before');
      setEditAssignees(event.assignees || []);
      if (event.start_time) {
        const mins = isoToMinutes(event.start_time);
        const h24 = Math.floor(mins/60); const m = mins%60;
        setEditStartH(h24===0?12:h24>12?h24-12:h24); setEditStartM(m);
        setEditStartAp(h24>=12?'pm':'am');
      }
      if (event.end_time) {
        const mins = isoToMinutes(event.end_time);
        const h24 = Math.floor(mins/60); const m = mins%60;
        setEditEndH(h24===0?12:h24>12?h24-12:h24); setEditEndM(m);
        setEditEndAp(h24>=12?'pm':'am');
      }
    }
  }, [event?.id]);

  if (!event) return null;

  const toH24 = (h:number, ap:'am'|'pm') => ap==='pm' ? (h===12?12:h+12) : (h===12?0:h);

  const saveEdit = async () => {
    setSaving(true);
    try {
      const pad = (n:number) => String(n).padStart(2,'0');
      const sh24 = toH24(editStartH, editStartAp);
      const eh24 = toH24(editEndH, editEndAp);
      const dateStr = event.date || localDateStr();
      const updates: any = {
        title: editTitle.trim() || event.title,
        notes: [editNotes.trim(), editLocation.trim()].filter(Boolean).join(' | '),
        repeat_rule: editRepeat, alert_rule: editAlert,
        assignees: editAssignees,
        start_time: `${dateStr}T${pad(sh24)}:${pad(editStartM)}:00`,
        end_time:   `${dateStr}T${pad(eh24)}:${pad(editEndM)}:00`,
      };
      let { error } = await supabase.from('events').update(updates).eq('id', event.id);
      if (error && (error.message?.includes('assignees') || error.code==='42703')) {
        const { assignees: _a, ...slim } = updates;
        const r2 = await supabase.from('events').update(slim).eq('id', event.id);
        error = r2.error;
      }
      if (!error) { onReload(); onClose(); }
      setSaving(false);
    } catch { setSaving(false); }
  };

  const doDelete = async () => {
    setDeleting(true);
    await supabase.from('events').delete().eq('id', event.id);
    onDeleted();
  };

  const assignedMembers = getEvAssignees(event);
  const accent = getMemberColor(event.assignees);

  return (
    <Modal visible={!!event} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex:1, backgroundColor:'#fff' }} edges={['top']}>
        <KeyboardAvoidingView style={{ flex:1 }} behavior={Platform.OS==='ios' ? 'padding' : 'height'}>
          <View style={s.modalHdr}>
            <TouchableOpacity onPress={onClose} hitSlop={{ top:12,bottom:12,left:12,right:12 }}>
              <Text style={s.modalCancel}>{mode==='edit' ? '← Back' : 'Close'}</Text>
            </TouchableOpacity>
            <Text style={s.modalTitle}>{mode==='view' ? 'Event' : 'Edit Event'}</Text>
            {mode==='view'
              ? <TouchableOpacity onPress={() => setMode('edit')} hitSlop={{ top:12,bottom:12,left:12,right:12 }}>
                  <Text style={s.modalSave}>Edit</Text>
                </TouchableOpacity>
              : <TouchableOpacity onPress={saveEdit} disabled={saving} hitSlop={{ top:12,bottom:12,left:12,right:12 }}>
                  <Text style={[s.modalSave, saving && { opacity:0.35 }]}>{saving ? 'Saving…' : 'Save'}</Text>
                </TouchableOpacity>
            }
          </View>
          <ScrollView contentContainerStyle={{ paddingBottom:48 }} keyboardShouldPersistTaps="handled">
            <View style={{ backgroundColor:accent+'14', padding:20, paddingTop:14 }}>
              {mode==='view'
                ? <Text style={{ fontFamily:'Poppins_700Bold', fontSize:22, color:INK, letterSpacing:-0.3 }}>{event.title}</Text>
                : <TextInput style={{ fontFamily:'Poppins_600SemiBold', fontSize:20, color:INK, borderBottomWidth:1.5, borderBottomColor:accent, paddingBottom:6 }}
                    value={editTitle} onChangeText={setEditTitle} placeholder="Event title" placeholderTextColor={INK3}/>
              }
              {assignedMembers.length > 0 && (
                <View style={{ flexDirection:'row', gap:5, marginTop:10 }}>
                  {assignedMembers.map((m: any) => (
                    <View key={m.id} style={{ flexDirection:'row', alignItems:'center', gap:5, backgroundColor:m.color+'20', borderRadius:20, paddingHorizontal:10, paddingVertical:4 }}>
                      <View style={{ width:8, height:8, borderRadius:4, backgroundColor:m.color }}/>
                      <Text style={{ fontFamily:'Poppins_600SemiBold', fontSize:12, color:m.color }}>{m.name}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
            {mode==='view' ? (
              <View>
                {event.start_time && (
                  <View style={s.detailRow}>
                    <Text style={s.detailIcon}>🕐</Text>
                    <Text style={s.detailTxt}>{fmtTime(event.start_time)}{event.end_time ? ` → ${fmtTime(event.end_time)}` : ''}</Text>
                  </View>
                )}
                {(() => {
                  const parts = (event.notes || '').split(' | ');
                  const loc  = parts.length > 1 ? parts[parts.length - 1] : '';
                  const note = parts[0] || '';
                  return (<>
                    {loc  ? <View style={s.detailRow}><Text style={s.detailIcon}>📍</Text><Text style={s.detailTxt}>{loc}</Text></View> : null}
                    {note ? <View style={s.detailRow}><Text style={s.detailIcon}>📝</Text><Text style={s.detailTxt}>{note}</Text></View> : null}
                  </>);
                })()}
                <View style={{ padding:20, gap:10 }}>
                  {!confirmDelete
                    ? <TouchableOpacity style={s.deleteBtn} onPress={() => setConfirmDelete(true)} activeOpacity={0.8}><Text style={s.deleteBtnTxt}>Delete event</Text></TouchableOpacity>
                    : <TouchableOpacity style={[s.deleteBtn, s.deleteBtnConfirm]} onPress={doDelete} disabled={deleting} activeOpacity={0.8}><Text style={s.deleteBtnTxt}>{deleting ? 'Deleting…' : 'Tap again to confirm delete'}</Text></TouchableOpacity>
                  }
                </View>
              </View>
            ) : (
              <View style={{ padding:20, gap:14 }}>
                <View style={s.gcBlock}>
                  <View style={s.gcRow}>
                    <Text style={s.gcRowLbl}>Start</Text>
                    <TimePill hour={editStartH} minute={editStartM} ampm={editStartAp} onHour={setEditStartH} onMinute={setEditStartM} onAmpm={setEditStartAp}/>
                  </View>
                  <View style={s.gcSep}/>
                  <View style={s.gcRow}>
                    <Text style={s.gcRowLbl}>End</Text>
                    <TimePill hour={editEndH} minute={editEndM} ampm={editEndAp} onHour={setEditEndH} onMinute={setEditEndM} onAmpm={setEditEndAp}/>
                  </View>
                </View>
                <View style={s.gcBlock}>
                  <View style={s.gcRow}>
                    <Text style={s.gcRowLbl}>Repeat</Text>
                    <DropdownPicker options={REPEAT_OPTIONS} value={editRepeat} onChange={setEditRepeat}/>
                  </View>
                  <View style={s.gcSep}/>
                  <View style={s.gcRow}>
                    <Text style={s.gcRowLbl}>Alert</Text>
                    <DropdownPicker options={ALERT_OPTIONS} value={editAlert} onChange={setEditAlert}/>
                  </View>
                </View>
                <View style={s.gcBlock}>
                  <TextInput style={s.gcTitleInput} placeholder="Notes" placeholderTextColor={INK3}
                    value={editNotes} onChangeText={setEditNotes} multiline/>
                  <View style={s.gcSep}/>
                  <TextInput style={s.gcSubInput} placeholder="Location" placeholderTextColor={INK3}
                    value={editLocation} onChangeText={setEditLocation}/>
                </View>
                <Text style={{ fontFamily:'Poppins_600SemiBold', fontSize:13, color:INK, marginBottom:6 }}>People</Text>
                {FAMILY_MEMBERS.map(m => {
                  const on = editAssignees.includes(m.id);
                  return (
                    <TouchableOpacity key={m.id} style={[s.memberRow, on && { borderColor:m.color, backgroundColor:m.color+'0A' }]}
                      onPress={() => setEditAssignees(prev => on ? prev.filter(id=>id!==m.id) : [...prev,m.id])} activeOpacity={0.7}>
                      <View style={[s.memberDot, { backgroundColor:m.color }]}/>
                      <Text style={s.memberName}>{m.name}</Text>
                      <View style={[s.memberCheck, on && { backgroundColor:m.color, borderColor:m.color }]}>
                        {on && <Text style={{ color:'#fff', fontSize:12 }}>✓</Text>}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

// ── Tool execution ─────────────────────────────────────────────────────────
const TOOLS = [
  { name:'add_calendar_event', description:'Add a new calendar event', input_schema:{ type:'object', properties:{ title:{type:'string'}, start_time:{type:'string',description:'ISO datetime local'}, end_time:{type:'string'}, notes:{type:'string'}, assignees:{type:'array',items:{type:'string'}} }, required:['title','start_time'] } },
  { name:'update_calendar_event', description:'Update an existing event', input_schema:{ type:'object', properties:{ search_title:{type:'string'}, search_date:{type:'string'}, new_title:{type:'string'}, new_start_time:{type:'string'}, new_end_time:{type:'string'}, new_date:{type:'string'}, new_notes:{type:'string'}, new_assignees:{type:'array',items:{type:'string'}} }, required:['search_title'] } },
  { name:'delete_calendar_event', description:'Delete a calendar event', input_schema:{ type:'object', properties:{ search_title:{type:'string'}, date:{type:'string'} }, required:['search_title'] } },
  { name:'add_todo', description:'Add a todo item', input_schema:{ type:'object', properties:{ title:{type:'string'}, priority:{type:'string',enum:['low','normal','high','urgent']}, due_date:{type:'string'} }, required:['title'] } },
  { name:'add_shopping_item', description:'Add item to shopping list', input_schema:{ type:'object', properties:{ name:{type:'string'}, category:{type:'string'}, quantity:{type:'string'} }, required:['name'] } },
  { name:'add_meal', description:'Add a meal to the weekly meal planner', input_schema:{ type:'object', properties:{ meal_name:{type:'string',description:'Name of the meal e.g. Spaghetti Bolognese'}, date:{type:'string',description:'Date in YYYY-MM-DD format'}, day_label:{type:'string',description:'Day abbreviation e.g. Mon, Tue, Wed'}, prep_mins:{type:'number',description:'Estimated prep time in minutes'} }, required:['meal_name','date'] } },
  { name:'update_todo', description:'Update a todo item (title, priority, due date, or mark done)', input_schema:{ type:'object', properties:{ search_title:{type:'string',description:'Current title to search for'}, new_title:{type:'string'}, new_priority:{type:'string',enum:['low','normal','high','urgent']}, new_due_date:{type:'string'}, mark_done:{type:'boolean'} }, required:['search_title'] } },
  { name:'delete_todo', description:'Delete a todo item', input_schema:{ type:'object', properties:{ search_title:{type:'string',description:'Title to search for'} }, required:['search_title'] } },
  { name:'update_shopping_item', description:'Update a shopping list item (rename, change category or quantity)', input_schema:{ type:'object', properties:{ search_name:{type:'string',description:'Current item name to search for'}, new_name:{type:'string'}, new_category:{type:'string'}, new_quantity:{type:'string'} }, required:['search_name'] } },
  { name:'delete_shopping_item', description:'Remove an item from the shopping list', input_schema:{ type:'object', properties:{ search_name:{type:'string',description:'Item name to search for'} }, required:['search_name'] } },
  { name:'update_meal', description:'Update a planned meal (change meal name, move to different date)', input_schema:{ type:'object', properties:{ search_meal:{type:'string',description:'Current meal name to search for'}, search_date:{type:'string',description:'Date of the meal YYYY-MM-DD'}, new_meal_name:{type:'string'}, new_date:{type:'string'}, new_prep_mins:{type:'number'} }, required:['search_meal'] } },
  { name:'delete_meal', description:'Remove a meal from the planner', input_schema:{ type:'object', properties:{ search_meal:{type:'string',description:'Meal name to search for'}, date:{type:'string',description:'Date of the meal YYYY-MM-DD'} }, required:['search_meal'] } },
  { name:'add_goal', description:'Add a personal goal', input_schema:{ type:'object', properties:{ title:{type:'string',description:'Goal title e.g. Run a half marathon'}, target_date:{type:'string',description:'Target date YYYY-MM-DD'}, detail:{type:'string',description:'Description of the goal and how to measure it'} }, required:['title'] } },
  { name:'update_goal', description:'Update a goal (progress, title, target date)', input_schema:{ type:'object', properties:{ search_title:{type:'string',description:'Current goal title to search for'}, new_title:{type:'string'}, new_target_date:{type:'string'}, new_progress:{type:'number',description:'Progress percentage 0-100'}, new_detail:{type:'string'} }, required:['search_title'] } },
  { name:'delete_goal', description:'Delete a goal', input_schema:{ type:'object', properties:{ search_title:{type:'string',description:'Goal title to search for'} }, required:['search_title'] } },
];

async function executeTool(name: string, input: any): Promise<string> {
  try {
    if (name === 'add_calendar_event') {
      const raw = (input.start_time || '').replace('Z','').split('+')[0];
      let dateOnly = raw.includes('T') ? raw.split('T')[0] : raw.slice(0,10);
      if (!dateOnly || dateOnly.length < 8) {
        const n = new Date();
        dateOnly = `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`;
      }
      const localDt = raw.includes('T') ? raw : `${dateOnly}T09:00:00`;
      let endDt = localDt;
      if (input.end_time) {
        endDt = input.end_time.replace('Z','').split('+')[0];
      } else {
        try {
          const startMs = new Date(localDt).getTime();
          const e = new Date(startMs + 60*60*1000);
          const pad = (n:number) => String(n).padStart(2,'0');
          endDt = `${e.getFullYear()}-${pad(e.getMonth()+1)}-${pad(e.getDate())}T${pad(e.getHours())}:${pad(e.getMinutes())}:00`;
        } catch { endDt = localDt; }
      }
      const NAME_TO_ID: Record<string,string> = { anna:'1', rich:'2', richard:'2', poppy:'3', gab:'4', gabriel:'4', duke:'5' };
      let assigneeIds: string[] = ['2'];
      if (input.assignees && Array.isArray(input.assignees) && input.assignees.length > 0) {
        const mapped = input.assignees.map((n:string) => NAME_TO_ID[n.toLowerCase().trim()]).filter(Boolean);
        if (mapped.length > 0) assigneeIds = mapped;
      }
      const row: any = { family_id:DUMMY_FAMILY_ID_HOME, title:input.title, date:dateOnly, start_time:localDt, end_time:endDt, notes:input.notes||'', timezone:'Australia/Brisbane', assignees:assigneeIds };
      let { error } = await supabase.from('events').insert(row);
      if (error && (error.message?.includes('assignees') || error.code==='42703')) {
        const { assignees:_a, ...slim } = row;
        const r2 = await supabase.from('events').insert(slim);
        error = r2.error;
      }
      if (error) return `TOOL_FAILED: Couldn't save "${input.title}" — ${error.message}`;
      return `✅ "${input.title}" added on ${dateOnly} at ${localDt.split('T')[1]?.slice(0,5) ?? 'the time you specified'}.`;
    }
    if (name === 'update_calendar_event') {
      let updateQuery = supabase.from('events').select('id,title,date,start_time,end_time,assignees').eq('family_id', DUMMY_FAMILY_ID_HOME).ilike('title', `%${input.search_title}%`);
      if (input.search_date) updateQuery = (updateQuery as any).eq('date', input.search_date);
      const { data } = await (updateQuery as any).order('date').limit(1);
      if (!data || data.length === 0) return `Couldn't find an event matching "${input.search_title}".`;
      const t = data[0];
      const u: any = {};
      if (input.new_title)      u.title = input.new_title;
      if (input.new_notes)      u.notes = input.new_notes;
      if (input.new_assignees && Array.isArray(input.new_assignees)) {
        const NAME_TO_ID: Record<string,string> = { anna:'1', rich:'2', richard:'2', poppy:'3', gab:'4', gabriel:'4', duke:'5' };
        const mapped = input.new_assignees.map((n:string) => NAME_TO_ID[n.toLowerCase().trim()]).filter(Boolean);
        if (mapped.length > 0) {
          const existing: string[] = Array.isArray(t.assignees) ? t.assignees : [];
          u.assignees = Array.from(new Set([...existing, ...mapped]));
        }
      }
      if (input.new_start_time) {
        u.start_time = input.new_start_time.replace('Z','').split('+')[0];
        u.date = u.start_time.split('T')[0];
        // Preserve original duration when only start time changes
        // Use raw string parse (no timezone conversion) consistent with time contract
        if (!input.new_end_time) {
          const pad = (n:number) => String(n).padStart(2,'0');
          let durationMs = 60 * 60 * 1000; // default 1hr
          if (t.start_time && t.end_time && t.start_time !== t.end_time) {
            const sRaw = t.start_time.includes('T') ? t.start_time.split('T')[1] : '';
            const eRaw = t.end_time.includes('T') ? t.end_time.split('T')[1] : '';
            if (sRaw && eRaw) {
              const [sh, sm] = sRaw.split(':').map(Number);
              const [eh, em] = eRaw.split(':').map(Number);
              const calc = ((eh * 60 + em) - (sh * 60 + sm)) * 60 * 1000;
              if (calc > 0) durationMs = calc;
            }
          }
          // Apply duration to new start time using raw parse
          const [newDatePart, newTimePart] = u.start_time.split('T');
          const [nh, nm] = newTimePart.split(':').map(Number);
          const totalMins = nh * 60 + nm + Math.round(durationMs / 60000);
          const endH = Math.floor(totalMins / 60) % 24;
          const endM = totalMins % 60;
          u.end_time = `${newDatePart}T${pad(endH)}:${pad(endM)}:00`;
        }
      }
      if (input.new_date) {
        u.date = input.new_date;
        if (t.start_time) u.start_time = `${input.new_date}T${t.start_time.split('T')[1]||'09:00:00'}`;
        if (t.end_time)   u.end_time   = `${input.new_date}T${t.end_time.split('T')[1]||'10:00:00'}`;
      }
      if (input.new_end_time) u.end_time = input.new_end_time.replace('Z','').split('+')[0];
      if (Object.keys(u).length === 0) return `TOOL_FAILED: No valid fields to update.`;
      let { error } = await supabase.from('events').update(u).eq('id', t.id);
      if (error && (error.message?.includes('assignees') || error.code==='42703')) {
        const { assignees:_a, ...slim } = u;
        const r2 = await supabase.from('events').update(slim).eq('id', t.id);
        error = r2.error;
      }
      if (error) throw error;
      const what = input.new_assignees ? `assignees updated` : input.new_title ? `renamed to "${input.new_title}"` : 'updated';
      return `✅ "${input.new_title || t.title}" — ${what}.`;
    }
    if (name === 'delete_calendar_event') {
      let q = supabase.from('events').select('id,title,date').eq('family_id', DUMMY_FAMILY_ID_HOME).ilike('title', `%${input.search_title}%`);
      if (input.date) q = (q as any).eq('date', input.date);
      const { data } = await (q as any).order('date').limit(1);
      if (!data || data.length === 0) return `Couldn't find "${input.search_title}".`;
      await supabase.from('events').delete().eq('id', data[0].id);
      return `✅ **${data[0].title}** deleted.`;
    }
    if (name === 'add_todo') {
      const now = new Date();
      const { error } = await supabase.from('todos').insert({
        family_id:DUMMY_FAMILY_ID_HOME, title:input.title,
        priority:input.priority||'normal', status:'active',
        due_date:input.due_date||null, created_at:now.toISOString(),
      });
      if (error) throw error;
      return `✅ **${input.title}** added to your to-do list.`;
    }
    if (name === 'add_shopping_item') {
      const itemName = (input.name||'').charAt(0).toUpperCase() + (input.name||'').slice(1);
      const { error } = await supabase.from('shopping_items').insert({
        family_id:DUMMY_FAMILY_ID_HOME, name:itemName,
        item:itemName, category:input.category||guessCategory(itemName),
        meal_source: input.quantity || null,
        checked:false,
      });
      if (error) throw error;
      return `✅ **${itemName}**${input.quantity ? ' (' + input.quantity + ')' : ''} added to the shopping list.`;
    }
    if (name === 'add_meal') {
      const dateStr = input.date || localDateStr();
      const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
      const dayLabel = input.day_label || dayNames[new Date(dateStr+'T00:00:00').getDay()] || '';
      // Check if a meal already exists for this date — warn, don't auto-swap
      const { data: existing } = await supabase.from('meal_plans').select('id,meal_name').eq('family_id', DUMMY_FAMILY_ID_HOME).eq('planned_date', dateStr).limit(1);
      if (existing && existing.length > 0) {
        return `CLASH: **${existing[0].meal_name}** is already planned for ${dayLabel}. Want to swap it for **${input.meal_name}**, or pick a different night?`;
      }
      const { error } = await supabase.from('meal_plans').insert({
        family_id: DUMMY_FAMILY_ID_HOME,
        meal_name: input.meal_name,
        planned_date: dateStr,
        day_key: dateStr,
        prep_mins: input.prep_mins || null,
      });
      if (error) throw error;
      return `\u2705 **${input.meal_name}** added for ${dayLabel} ${dateStr}.`;
    }
    if (name === 'update_todo') {
      const { data } = await supabase.from('todos').select('id,title,status').eq('family_id', DUMMY_FAMILY_ID_HOME).ilike('title', `%${input.search_title}%`).order('created_at', { ascending: false }).limit(1);
      if (!data || data.length === 0) return `Couldn't find a to-do matching "${input.search_title}".`;
      const todo = data[0];
      const u: any = {};
      if (input.new_title) u.title = input.new_title;
      if (input.new_priority) u.priority = input.new_priority;
      if (input.new_due_date) u.due_date = input.new_due_date;
      if (input.mark_done) u.status = 'done';
      if (Object.keys(u).length === 0) return `TOOL_FAILED: No valid fields to update.`;
      const { error } = await supabase.from('todos').update(u).eq('id', todo.id);
      if (error) throw error;
      const what = input.mark_done ? 'marked as done' : input.new_title ? `renamed to "${input.new_title}"` : 'updated';
      return `\u2705 "${input.new_title || todo.title}" \u2014 ${what}.`;
    }
    if (name === 'delete_todo') {
      const { data } = await supabase.from('todos').select('id,title').eq('family_id', DUMMY_FAMILY_ID_HOME).ilike('title', `%${input.search_title}%`).order('created_at', { ascending: false }).limit(1);
      if (!data || data.length === 0) return `Couldn't find a to-do matching "${input.search_title}".`;
      const { error } = await supabase.from('todos').delete().eq('id', data[0].id);
      if (error) throw error;
      return `\u2705 **${data[0].title}** removed from your to-do list.`;
    }
    if (name === 'update_shopping_item') {
      const { data } = await supabase.from('shopping_items').select('id,name,item').eq('family_id', DUMMY_FAMILY_ID_HOME).ilike('name', `%${input.search_name}%`).neq('checked', true).order('created_at', { ascending: false }).limit(1);
      if (!data || data.length === 0) return `Couldn't find "${input.search_name}" on the shopping list.`;
      const item = data[0];
      const u: any = {};
      if (input.new_name) { u.name = input.new_name; u.item = input.new_name; }
      if (input.new_category) u.category = input.new_category;
      if (input.new_quantity) u.meal_source = input.new_quantity;
      if (Object.keys(u).length === 0) return `TOOL_FAILED: No valid fields to update.`;
      const { error } = await supabase.from('shopping_items').update(u).eq('id', item.id);
      if (error) throw error;
      return `\u2705 "${input.new_name || item.name}" updated on the shopping list.`;
    }
    if (name === 'delete_shopping_item') {
      const { data } = await supabase.from('shopping_items').select('id,name').eq('family_id', DUMMY_FAMILY_ID_HOME).ilike('name', `%${input.search_name}%`).neq('checked', true).order('created_at', { ascending: false }).limit(1);
      if (!data || data.length === 0) return `Couldn't find "${input.search_name}" on the shopping list.`;
      const { error } = await supabase.from('shopping_items').delete().eq('id', data[0].id);
      if (error) throw error;
      return `\u2705 **${data[0].name}** removed from the shopping list.`;
    }
    if (name === 'update_meal') {
      let q = supabase.from('meal_plans').select('id,meal_name,planned_date,day_key').eq('family_id', DUMMY_FAMILY_ID_HOME).ilike('meal_name', `%${input.search_meal}%`);
      if (input.search_date) q = q.eq('planned_date', input.search_date);
      const { data } = await q.order('planned_date').limit(1);
      if (!data || data.length === 0) return `Couldn't find a meal matching "${input.search_meal}".`;
      const meal = data[0];
      const u: any = {};
      if (input.new_meal_name) u.meal_name = input.new_meal_name;
      if (input.new_date) { u.planned_date = input.new_date; u.day_key = input.new_date; }
      if (input.new_prep_mins) u.prep_mins = input.new_prep_mins;
      if (Object.keys(u).length === 0) return `TOOL_FAILED: No valid fields to update.`;
      const { error } = await supabase.from('meal_plans').update(u).eq('id', meal.id);
      if (error) throw error;
      const what = input.new_date ? `moved to ${input.new_date}` : input.new_meal_name ? `changed to "${input.new_meal_name}"` : 'updated';
      return `\u2705 "${input.new_meal_name || meal.meal_name}" \u2014 ${what}.`;
    }
    if (name === 'delete_meal') {
      let q = supabase.from('meal_plans').select('id,meal_name').eq('family_id', DUMMY_FAMILY_ID_HOME).ilike('meal_name', `%${input.search_meal}%`);
      if (input.date) q = q.eq('planned_date', input.date);
      const { data } = await q.order('planned_date').limit(1);
      if (!data || data.length === 0) return `Couldn't find a meal matching "${input.search_meal}".`;
      const { error } = await supabase.from('meal_plans').delete().eq('id', data[0].id);
      if (error) throw error;
      return `\u2705 **${data[0].meal_name}** removed from the meal planner.`;
    }
    if (name === 'add_goal') {
      const { error } = await supabase.from('goals').insert({
        family_id: DUMMY_FAMILY_ID_HOME,
        title: input.title,
        target_date: input.target_date || null,
        detail: input.detail || '',
        progress: 0,
        status: 'active',
      });
      if (error) throw error;
      return `\u2705 **${input.title}** added to your goals.${input.target_date ? ` Target: ${input.target_date}.` : ''}`;
    }
    if (name === 'update_goal') {
      const { data } = await supabase.from('goals').select('id,title').eq('family_id', DUMMY_FAMILY_ID_HOME).ilike('title', `%${input.search_title}%`).eq('status', 'active').order('created_at', { ascending: false }).limit(1);
      if (!data || data.length === 0) return `Couldn't find a goal matching "${input.search_title}".`;
      const u: any = {};
      if (input.new_title) u.title = input.new_title;
      if (input.new_target_date) u.target_date = input.new_target_date;
      if (input.new_progress !== undefined) u.progress = input.new_progress;
      if (input.new_detail) u.detail = input.new_detail;
      if (Object.keys(u).length === 0) return `TOOL_FAILED: No valid fields to update.`;
      const { error } = await supabase.from('goals').update(u).eq('id', data[0].id);
      if (error) throw error;
      const what = input.new_progress !== undefined ? `progress updated to ${input.new_progress}%` : input.new_title ? `renamed to "${input.new_title}"` : 'updated';
      return `\u2705 "${input.new_title || data[0].title}" \u2014 ${what}.`;
    }
    if (name === 'delete_goal') {
      const { data } = await supabase.from('goals').select('id,title').eq('family_id', DUMMY_FAMILY_ID_HOME).ilike('title', `%${input.search_title}%`).order('created_at', { ascending: false }).limit(1);
      if (!data || data.length === 0) return `Couldn't find a goal matching "${input.search_title}".`;
      const { error } = await supabase.from('goals').delete().eq('id', data[0].id);
      if (error) throw error;
      return `\u2705 **${data[0].title}** removed from your goals.`;
    }
    return `Tool ${name} not yet implemented.`;
  } catch (e: any) {
    return `TOOL_FAILED: Something went wrong with ${name} — ${e?.message ?? 'unknown error'}`;
  }
}

const CAPABILITY_RULES = `CRITICAL TOOL RULES:
- USE TOOLS IMMEDIATELY when you have enough info. Never say "I'll add that" — just add it.
- For "tomorrow" use tomorrow's actual date (today is provided in the system prompt).
- CRITICAL: When the user says "change", "move", "update", "shift", "reschedule" an EXISTING item, use the UPDATE tool. NEVER use an ADD tool to modify something that already exists. This applies to ALL types: events, meals, shopping, todos.
- update_calendar_event: use this to change time/date/assignees of an existing event. NEVER delete and re-add. NEVER use add_calendar_event when the user wants to change an existing event.
- update_meal: use this to change a meal name, move a meal to a different date, or change prep time. NEVER use add_meal when the user wants to change or move an existing meal.
- update_todo: use this to change title, priority, due date, or mark a todo as done. When the user says "mark X as done/complete/finished", use update_todo with mark_done:true.
- update_shopping_item: use this to rename or change quantity/category of an existing shopping item.
- add_meal: use this ONLY when planning a NEW meal for a day that has NO existing meal. If the tool returns "CLASH:", tell the user what's already planned and ask if they want to swap or pick a different night. NEVER auto-swap without asking.
- When the user confirms a swap: use update_meal to change the existing meal's name (and/or move it to a new date). You can call multiple tools in one turn — e.g. update_meal to rename tomorrow's meal, then add_meal or another update_meal to move the old meal to a new date.
- CRITICAL: NEVER say you performed an action unless a tool confirmed it with a \u2705 response. If you didn't call a tool, you didn't do the action.
- delete_meal / delete_todo / delete_shopping_item / delete_calendar_event: use when the user wants to remove something entirely.
- If a tool result starts with "TOOL_FAILED", tell the user honestly it didn't work.
- Zaeli CANNOT make phone calls or send messages autonomously.
- NEVER confuse meal planner with calendar. Meals go in meal planner (add_meal/update_meal/delete_meal). Events go in calendar (add/update/delete_calendar_event). If the user says "meal planner" or "dinner", use meal tools. If the user says "calendar" or "event", use calendar tools.
- CLASH AWARENESS: After adding a dinner/restaurant event to the calendar, check if there's already a meal planned for that date. If so, proactively ask: "There's [meal] planned for tonight in the meal planner — want me to move it to another night since you're eating out?" Same in reverse: after adding a meal, check if there's a dinner event that night.
- After adding or editing anything, confirm warmly in 1 sentence. Name what was added and when. Be enthusiastic but brief. Never start with "I". Never say "I've added" — say what's done, not what you did.
- CRITICAL: When confirming, use the EXACT day/date the user specified. If they said "Saturday", confirm "Saturday" — never substitute a different day. Double-check dates against the day-of-week before confirming.
- add_goal: use when the user wants to set a personal goal. Ask for a title and optionally a target date and detail. After creating, offer a chip "Open Goals" to view it.
- update_goal: use to update progress, title, target date, or detail of an existing goal. When user says "I ran 5km today" and has a running goal, update the progress.
- delete_goal: use when the user wants to remove a goal entirely.`;

// ── CalSheetEventCard ─────────────────────────────────────────────────────
// White card with left-border family colour, used in sheet day/month views
function CalSheetEventCard({ ev, onEditWithZaeli, onManualEdit, onDeleted }: {
  ev: any; onEditWithZaeli: (ev:any)=>void; onManualEdit: (ev:any)=>void;
  onDeleted?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const members = (ev.assignees||[]).map((id:string) => FAMILY_MEMBERS.find(m=>m.id===id)).filter(Boolean) as any[];
  const borderColor = members.length > 0 ? members[0].color : 'rgba(0,0,0,0.15)';
  const noteParts = (ev.notes||'').split(' | ');
  const location = noteParts.length > 1 ? noteParts[noteParts.length-1] : '';

  async function deleteEvent() {
    await supabase.from('events').delete().eq('id', ev.id);
    onDeleted?.();
  }

  return (
    <TouchableOpacity onPress={() => { setExpanded(!expanded); setConfirmDelete(false); }} activeOpacity={0.88}
      style={{ backgroundColor:'#fff', borderRadius:16, marginBottom:10, padding:16, borderLeftWidth:4, borderLeftColor:borderColor }}>
      {/* Compact view — always visible */}
      <View style={{ flexDirection:'row', alignItems:'center', gap:14 }}>
        <View style={{ width:60, flexShrink:0 }}>
          <Text style={{ fontFamily:'Poppins_700Bold', fontSize:16, color:'rgba(0,0,0,0.45)', textAlign:'right' }} numberOfLines={1}>{fmtTime(ev.start_time)}</Text>
        </View>
        <View style={{ flex:1 }}>
          <Text style={{ fontFamily:'Poppins_700Bold', fontSize:17, color:'#0A0A0A' }} numberOfLines={1}>{ev.title}</Text>
          <Text style={{ fontFamily:'Poppins_400Regular', fontSize:13, color:'rgba(0,0,0,0.40)', marginTop:2 }}>
            {fmtTime(ev.start_time)}{ev.end_time && ev.end_time !== ev.start_time ? ` – ${fmtTime(ev.end_time)}` : ''}{location ? ` · ${location}` : ''}
          </Text>
        </View>
        {members.length > 0 && (
          <View style={{ flexDirection:'row', gap:4 }}>
            {members.slice(0,3).map((m:any) => (
              <View key={m.id} style={{ width:26, height:26, borderRadius:13, backgroundColor:m.color, alignItems:'center', justifyContent:'center' }}>
                <Text style={{ fontFamily:'Poppins_700Bold', fontSize:10, color:'#fff' }}>{m.name[0]}</Text>
              </View>
            ))}
            {members.length > 3 && <Text style={{ fontFamily:'Poppins_600SemiBold', fontSize:11, color:'rgba(0,0,0,0.3)', marginLeft:2 }}>+{members.length-3}</Text>}
          </View>
        )}
      </View>

      {/* Expanded actions — only visible on tap */}
      {expanded && (
        <View style={{ flexDirection:'row', gap:8, flexWrap:'wrap', alignItems:'center', marginTop:12, paddingTop:12, borderTopWidth:0.5, borderTopColor:'rgba(0,0,0,0.08)' }}>
          <TouchableOpacity
            style={{ flexDirection:'row', alignItems:'center', gap:5, backgroundColor:'rgba(168,216,240,0.18)', borderWidth:1, borderColor:'rgba(168,216,240,0.45)', borderRadius:12, paddingVertical:9, paddingHorizontal:14 }}
            onPress={() => onEditWithZaeli(ev)} activeOpacity={0.75}
          >
            <Text style={{ fontFamily:'Poppins_600SemiBold', fontSize:14, color:'rgba(0,0,0,0.55)' }}>✦ Edit with Zaeli</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ backgroundColor:'rgba(0,0,0,0.06)', borderRadius:12, paddingVertical:9, paddingHorizontal:14 }}
            onPress={() => onManualEdit(ev)} activeOpacity={0.75}
          >
            <Text style={{ fontFamily:'Poppins_600SemiBold', fontSize:14, color:'rgba(0,0,0,0.45)' }}>Edit</Text>
          </TouchableOpacity>
          {confirmDelete ? (
            <TouchableOpacity
              style={{ backgroundColor:'rgba(220,38,38,0.12)', borderWidth:1, borderColor:'rgba(220,38,38,0.35)', borderRadius:12, paddingVertical:9, paddingHorizontal:14 }}
              onPress={deleteEvent} activeOpacity={0.75}
            >
              <Text style={{ fontFamily:'Poppins_700Bold', fontSize:14, color:'#DC2626' }}>Confirm delete</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={{ backgroundColor:'rgba(0,0,0,0.04)', borderRadius:12, paddingVertical:9, paddingHorizontal:14 }}
              onPress={() => setConfirmDelete(true)} activeOpacity={0.75}
            >
              <Text style={{ fontFamily:'Poppins_600SemiBold', fontSize:14, color:'rgba(0,0,0,0.30)' }}>Delete</Text>
            </TouchableOpacity>
            )}
          </View>
        )}
    </TouchableOpacity>
  );
}

// ── CalSheetMonthView ─────────────────────────────────────────────────────
function CalSheetMonthView({ monthYear, onMonthChange, selectedDay, dayEvents, onDaySelect, onEditWithZaeli, onManualEdit, allEvents, onAddWithZaeli, onManualAdd, onDeleted }: {
  monthYear: { month:number; year:number };
  onMonthChange: (v:{ month:number; year:number })=>void;
  selectedDay: string|null;
  dayEvents: any[];
  allEvents: any[];
  onDaySelect: (dateStr:string)=>void;
  onEditWithZaeli: (ev:any)=>void;
  onManualEdit: (ev:any)=>void;
  onAddWithZaeli: ()=>void;
  onManualAdd: (dateStr:string)=>void;
  onDeleted: ()=>void;
}) {
  const { month, year } = monthYear;
  const MONTHS_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const DAY_HDRS = ['M','T','W','T','F','S','S'];
  const today = localDateStr();

  // Build dot map: dateStr → first 3 assignee colours
  const dotMap: Record<string, string[]> = {};
  allEvents.forEach((ev:any) => {
    if (!ev.date) return;
    const members = (ev.assignees||[]).map((id:string) => FAMILY_MEMBERS.find(m=>m.id===id)).filter(Boolean) as any[];
    const color = members.length > 0 ? members[0].color : '#A8D8F0';
    if (!dotMap[ev.date]) dotMap[ev.date] = [];
    if (dotMap[ev.date].length < 3) dotMap[ev.date].push(color);
  });

  // Build calendar grid
  const firstDay = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();
  const cells: { dateStr:string|null; day:number; isCurrentMonth:boolean }[] = [];
  for (let i = 0; i < firstDay; i++) {
    cells.push({ dateStr:null, day:daysInPrev - firstDay + 1 + i, isCurrentMonth:false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    cells.push({ dateStr:ds, day:d, isCurrentMonth:true });
  }
  const remaining = (7 - (cells.length % 7)) % 7;
  for (let i = 1; i <= remaining; i++) {
    cells.push({ dateStr:null, day:i, isCurrentMonth:false });
  }

  function prevMonth() {
    if (month === 0) onMonthChange({ month:11, year:year-1 });
    else onMonthChange({ month:month-1, year });
  }
  function nextMonth() {
    if (month === 11) onMonthChange({ month:0, year:year+1 });
    else onMonthChange({ month:month+1, year });
  }

  return (
    <>
      {/* Month nav */}
      <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
        <TouchableOpacity onPress={prevMonth} activeOpacity={0.7} style={{ padding:8 }}>
          <Text style={{ fontFamily:'Poppins_600SemiBold', fontSize:22, color:'rgba(0,0,0,0.45)' }}>‹</Text>
        </TouchableOpacity>
        <Text style={{ fontFamily:'Poppins_700Bold', fontSize:18, color:'#0A0A0A' }}>{MONTHS_FULL[month]} {year}</Text>
        <TouchableOpacity onPress={nextMonth} activeOpacity={0.7} style={{ padding:8 }}>
          <Text style={{ fontFamily:'Poppins_600SemiBold', fontSize:22, color:'rgba(0,0,0,0.45)' }}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Day headers */}
      <View style={{ flexDirection:'row', marginBottom:6 }}>
        {DAY_HDRS.map((d,i) => (
          <View key={i} style={{ flex:1, alignItems:'center', paddingBottom:8 }}>
            <Text style={{ fontFamily:'Poppins_700Bold', fontSize:12, color:'rgba(0,0,0,0.35)', letterSpacing:0.05 }}>{d}</Text>
          </View>
        ))}
      </View>

      {/* Calendar grid */}
      <View style={{ flexDirection:'row', flexWrap:'wrap', marginBottom:16 }}>
        {cells.map((cell, i) => {
          const isToday = cell.dateStr === today;
          const isSelected = cell.dateStr === selectedDay;
          const dots = cell.dateStr ? (dotMap[cell.dateStr] || []) : [];
          return (
            <TouchableOpacity
              key={i}
              style={{ width:'14.28%', alignItems:'center', paddingVertical:4 }}
              onPress={() => cell.dateStr && onDaySelect(cell.dateStr)}
              activeOpacity={cell.dateStr ? 0.7 : 1}
              disabled={!cell.dateStr}
            >
              <View style={{
                width:34, height:34, borderRadius:17, alignItems:'center', justifyContent:'center',
                backgroundColor: isSelected ? '#FF4545' : isToday ? '#3A3D4A' : 'transparent',
              }}>
                <Text style={{
                  fontFamily:'Poppins_600SemiBold', fontSize:15,
                  color: isSelected || isToday ? '#fff' : cell.isCurrentMonth ? '#0A0A0A' : 'rgba(0,0,0,0.22)',
                }}>{cell.day}</Text>
              </View>
              {/* Event dots */}
              {dots.length > 0 && (
                <View style={{ flexDirection:'row', gap:2, marginTop:2, height:5 }}>
                  {dots.map((c, di) => (
                    <View key={di} style={{ width:5, height:5, borderRadius:2.5, backgroundColor: c }}/>
                  ))}
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Selected day events */}
      {selectedDay && (
        <>
          <View style={{ height:1, backgroundColor:'rgba(0,0,0,0.08)', marginBottom:14 }}/>
          <Text style={{ fontFamily:'Poppins_700Bold', fontSize:13, color:'rgba(0,0,0,0.45)', letterSpacing:0.5, textTransform:'uppercase', marginBottom:12 }}>
            {new Date(selectedDay+'T00:00:00').toLocaleDateString('en-AU', { weekday:'long', day:'numeric', month:'long' })}
            {dayEvents.length > 0 ? ` — ${dayEvents.length} event${dayEvents.length>1?'s':''}` : ' — nothing on'}
          </Text>
          {dayEvents.length === 0 ? (
            <Text style={{ fontFamily:'Poppins_400Regular', fontSize:15, color:'rgba(0,0,0,0.35)', fontStyle:'italic', marginBottom:16 }}>Nothing scheduled</Text>
          ) : dayEvents.map((ev:any) => (
            <CalSheetEventCard key={ev.id} ev={ev} onEditWithZaeli={onEditWithZaeli} onManualEdit={onManualEdit} onDeleted={onDeleted}/>
          ))}
          {/* Add row — same as day view */}
          <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', borderWidth:1.5, borderStyle:'dashed', borderColor:'rgba(0,0,0,0.12)', borderRadius:14, padding:14, marginTop:4 }}>
            <TouchableOpacity
              onPress={() => onManualAdd(selectedDay!)}
              activeOpacity={0.75}
              style={{ flexDirection:'row', alignItems:'center', gap:10, flex:1 }}
            >
              <Text style={{ fontSize:18, color:'rgba(0,0,0,0.22)' }}>+</Text>
              <Text style={{ fontFamily:'Poppins_600SemiBold', fontSize:15, color:'rgba(0,0,0,0.35)' }}>
                Add event for {new Date(selectedDay+'T00:00:00').toLocaleDateString('en-AU', { weekday:'long' })}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onAddWithZaeli} activeOpacity={0.75}
              style={{ flexDirection:'row', alignItems:'center', gap:4, backgroundColor:'rgba(168,216,240,0.18)', borderWidth:1, borderColor:'rgba(168,216,240,0.45)', borderRadius:10, paddingVertical:7, paddingHorizontal:12 }}>
              <Text style={{ fontFamily:'Poppins_600SemiBold', fontSize:13, color:'rgba(0,0,0,0.50)' }}>✦ Add with Zaeli</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </>
  );
}

// ── CalSheetEditForm ──────────────────────────────────────────────────────
function CalSheetEditForm({ ev, onBack, onClose, onEditWithZaeli, onSaved, onDeleted }: {
  ev: any; onBack:()=>void; onClose:()=>void;
  onEditWithZaeli:(ev:any)=>void; onSaved:()=>void; onDeleted?:()=>void;
}) {
  const [title,     setTitle]     = useState(ev.title || '');
  const noteParts = (ev.notes||'').split(' | ');
  const [location,  setLocation]  = useState(noteParts.length > 1 ? noteParts[noteParts.length-1] : '');
  const [assignees, setAssignees] = useState<string[]>(ev.assignees || []);
  const [repeatRule, setRepeatRule] = useState(ev.repeat_rule || 'Never');
  const [alertRule,  setAlertRule]  = useState(ev.alert_rule || ev.reminder_minutes != null ? `${ev.reminder_minutes} min before` : '15 min before');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const toH24 = (h:number, ap:'am'|'pm') => ap==='pm' ? (h===12?12:h+12) : (h===12?0:h);

  // Parse existing start/end times
  const parseTime = (iso:string) => {
    const tp = iso?.includes('T') ? iso.split('T')[1] : '';
    if (!tp) return { h:9, m:0, ap:'am' as 'am'|'pm' };
    const [h24,m] = tp.split(':').map(Number);
    return { h: h24===0?12:h24>12?h24-12:h24, m, ap: (h24>=12?'pm':'am') as 'am'|'pm' };
  };
  const st = parseTime(ev.start_time);
  // Auto-fill end time: 1hr after start for new events
  const et = ev.end_time ? parseTime(ev.end_time) : (() => {
    const sh24 = toH24(st.h, st.ap) + 1;
    const endH24 = sh24 >= 24 ? 23 : sh24;
    return { h: endH24===0?12:endH24>12?endH24-12:endH24, m: st.m, ap: (endH24>=12?'pm':'am') as 'am'|'pm' };
  })();
  const [startH, setStartH] = useState(st.h);
  const [startM, setStartM] = useState(st.m);
  const [startAp, setStartAp] = useState<'am'|'pm'>(st.ap);
  const [endH, setEndH] = useState(et.h);
  const [endM, setEndM] = useState(et.m);
  const [endAp, setEndAp] = useState<'am'|'pm'>(et.ap);

  const REPEAT_OPTS = ['Never','Daily','Weekly','Fortnightly','Monthly'];
  const ALERT_OPTS  = ['None','At start','5 min','15 min','30 min','1 hour','1 day'];

  const toggleAssignee = (id:string) => {
    setAssignees(prev => prev.includes(id) ? prev.filter(x=>x!==id) : [...prev, id]);
  };

  async function save() {
    setSaving(true);
    try {
      const pad = (n:number) => String(n).padStart(2,'0');
      const sh24 = toH24(startH, startAp);
      const eh24 = toH24(endH, endAp);
      const dateStr = ev.date || localDateStr();
      const payload: any = {
        family_id: '00000000-0000-0000-0000-000000000001',
        title: title.trim() || 'New Event',
        notes: [noteParts[0]||'', location.trim()].filter(Boolean).join(' | '),
        repeat_rule: repeatRule,
        assignees,
        date: dateStr,
        start_time: `${dateStr}T${pad(sh24)}:${pad(startM)}:00`,
        end_time:   `${dateStr}T${pad(eh24)}:${pad(endM)}:00`,
      };
      let error: any = null;
      if (ev.id) {
        // Update existing
        const { error: e } = await supabase.from('events').update(payload).eq('id', ev.id);
        error = e;
        if (error && (error.message?.includes('assignees') || error.code==='42703')) {
          const { assignees:_a, family_id:_f, ...slim } = payload;
          const r2 = await supabase.from('events').update(slim).eq('id', ev.id);
          error = r2.error;
        }
      } else {
        // Insert new
        const { error: e } = await supabase.from('events').insert(payload);
        error = e;
        if (error && (error.message?.includes('assignees') || error.code==='42703')) {
          const { assignees:_a, ...slim } = payload;
          const r2 = await supabase.from('events').insert(slim);
          error = r2.error;
        }
      }
      if (!error) onSaved();
    } catch {}
    setSaving(false);
  }

  return (
    <KeyboardAvoidingView style={{ flex:1 }} behavior={Platform.OS==='ios'?'padding':'height'}>
      <ScrollView style={{ flex:1 }} contentContainerStyle={{ padding:16, paddingBottom:50 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* Zaeli hint */}
        <TouchableOpacity
          style={{ flexDirection:'row', alignItems:'center', gap:10, backgroundColor:'rgba(168,216,240,0.14)', borderWidth:1, borderColor:'rgba(168,216,240,0.35)', borderRadius:14, padding:14, marginBottom:20 }}
          onPress={() => onEditWithZaeli(ev)} activeOpacity={0.75}
        >
          <Text style={{ fontSize:16 }}>✦</Text>
          <Text style={{ fontFamily:'Poppins_400Regular', fontSize:14, color:'rgba(0,0,0,0.55)', flex:1, lineHeight:21 }}>Prefer to just say the change? Hand off to Zaeli.</Text>
          <Text style={{ fontFamily:'Poppins_700Bold', fontSize:13, color:'rgba(58,61,74,0.75)' }}>Edit ›</Text>
        </TouchableOpacity>

        {/* Title */}
        <Text style={{ fontFamily:'Poppins_700Bold', fontSize:11, color:'rgba(0,0,0,0.40)', textTransform:'uppercase', letterSpacing:0.8, marginBottom:8 }}>Event name</Text>
        <View style={{ backgroundColor:'#fff', borderRadius:12, borderWidth:1, borderColor:'rgba(0,0,0,0.10)', paddingHorizontal:14, paddingVertical:12, marginBottom:18 }}>
          <TextInput value={title} onChangeText={setTitle} style={{ fontFamily:'Poppins_400Regular', fontSize:17, color:'#0A0A0A' }} placeholder="Event name" placeholderTextColor="rgba(0,0,0,0.28)"/>
        </View>

        {/* Time */}
        <Text style={{ fontFamily:'Poppins_700Bold', fontSize:11, color:'rgba(0,0,0,0.40)', textTransform:'uppercase', letterSpacing:0.8, marginBottom:8 }}>Time</Text>
        <View style={{ flexDirection:'row', gap:10, marginBottom:18 }}>
          <View style={{ flex:1, backgroundColor:'#fff', borderRadius:12, borderWidth:1, borderColor:'rgba(0,0,0,0.10)', padding:12 }}>
            <Text style={{ fontFamily:'Poppins_700Bold', fontSize:10, color:'rgba(0,0,0,0.38)', textTransform:'uppercase', letterSpacing:0.6, marginBottom:6 }}>Start</Text>
            <TimePill hour={startH} minute={startM} ampm={startAp} onHour={setStartH} onMinute={setStartM} onAmpm={setStartAp}/>
          </View>
          <View style={{ flex:1, backgroundColor:'#fff', borderRadius:12, borderWidth:1, borderColor:'rgba(0,0,0,0.10)', padding:12 }}>
            <Text style={{ fontFamily:'Poppins_700Bold', fontSize:10, color:'rgba(0,0,0,0.38)', textTransform:'uppercase', letterSpacing:0.6, marginBottom:6 }}>End</Text>
            <TimePill hour={endH} minute={endM} ampm={endAp} onHour={setEndH} onMinute={setEndM} onAmpm={setEndAp}/>
          </View>
        </View>

        {/* Location */}
        <Text style={{ fontFamily:'Poppins_700Bold', fontSize:11, color:'rgba(0,0,0,0.40)', textTransform:'uppercase', letterSpacing:0.8, marginBottom:8 }}>Location</Text>
        <View style={{ backgroundColor:'#fff', borderRadius:12, borderWidth:1, borderColor:'rgba(0,0,0,0.10)', paddingHorizontal:14, paddingVertical:12, marginBottom:18 }}>
          <TextInput value={location} onChangeText={setLocation} style={{ fontFamily:'Poppins_400Regular', fontSize:17, color:'#0A0A0A' }} placeholder="Location" placeholderTextColor="rgba(0,0,0,0.28)"/>
        </View>

        {/* Attendees */}
        <Text style={{ fontFamily:'Poppins_700Bold', fontSize:11, color:'rgba(0,0,0,0.40)', textTransform:'uppercase', letterSpacing:0.8, marginBottom:12 }}>Who's going</Text>
        <View style={{ flexDirection:'row', gap:16, marginBottom:20, flexWrap:'wrap' }}>
          {FAMILY_MEMBERS.map(m => {
            const sel = assignees.includes(m.id);
            return (
              <TouchableOpacity key={m.id} onPress={() => toggleAssignee(m.id)} activeOpacity={0.75} style={{ alignItems:'center', gap:6 }}>
                <View style={{ width:44, height:44, borderRadius:22, backgroundColor:m.color, alignItems:'center', justifyContent:'center', opacity: sel ? 1 : 0.28, borderWidth: sel ? 2.5 : 0, borderColor:'#0A0A0A' }}>
                  <Text style={{ fontFamily:'Poppins_700Bold', fontSize:16, color:'#fff' }}>{m.name[0]}</Text>
                </View>
                <Text style={{ fontFamily:'Poppins_500Medium', fontSize:11, color: sel ? '#0A0A0A' : 'rgba(0,0,0,0.35)' }}>{m.name}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Repeat */}
        <Text style={{ fontFamily:'Poppins_700Bold', fontSize:11, color:'rgba(0,0,0,0.40)', textTransform:'uppercase', letterSpacing:0.8, marginBottom:10 }}>Repeat</Text>
        <View style={{ flexDirection:'row', flexWrap:'wrap', gap:8, marginBottom:20 }}>
          {REPEAT_OPTS.map(opt => (
            <TouchableOpacity key={opt} onPress={() => setRepeatRule(opt)} activeOpacity={0.75}
              style={{ borderWidth:1.5, borderColor: repeatRule===opt ? '#0A0A0A' : 'rgba(0,0,0,0.12)', borderRadius:22, paddingVertical:8, paddingHorizontal:16, backgroundColor: repeatRule===opt ? '#0A0A0A' : '#fff' }}>
              <Text style={{ fontFamily:'Poppins_600SemiBold', fontSize:14, color: repeatRule===opt ? '#fff' : 'rgba(0,0,0,0.55)' }}>{opt}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Reminder */}
        <Text style={{ fontFamily:'Poppins_700Bold', fontSize:11, color:'rgba(0,0,0,0.40)', textTransform:'uppercase', letterSpacing:0.8, marginBottom:10 }}>Reminder</Text>
        <View style={{ flexDirection:'row', flexWrap:'wrap', gap:8, marginBottom:28 }}>
          {ALERT_OPTS.map(opt => (
            <TouchableOpacity key={opt} onPress={() => setAlertRule(opt)} activeOpacity={0.75}
              style={{ borderWidth:1.5, borderColor: alertRule===opt ? '#0A0A0A' : 'rgba(0,0,0,0.12)', borderRadius:22, paddingVertical:8, paddingHorizontal:16, backgroundColor: alertRule===opt ? '#0A0A0A' : '#fff' }}>
              <Text style={{ fontFamily:'Poppins_600SemiBold', fontSize:14, color: alertRule===opt ? '#fff' : 'rgba(0,0,0,0.55)' }}>{opt}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Save / Cancel */}
        <View style={{ flexDirection:'row', gap:10, marginBottom: ev.id ? 0 : 0 }}>
          <TouchableOpacity onPress={onBack} style={{ flex:1, paddingVertical:16, borderRadius:14, backgroundColor:'rgba(0,0,0,0.06)', alignItems:'center' }} activeOpacity={0.75}>
            <Text style={{ fontFamily:'Poppins_700Bold', fontSize:15, color:'rgba(0,0,0,0.45)' }}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={save} disabled={saving} style={{ flex:2, paddingVertical:16, borderRadius:14, backgroundColor:'#3A3D4A', alignItems:'center', opacity: saving ? 0.5 : 1 }} activeOpacity={0.85}>
            <Text style={{ fontFamily:'Poppins_700Bold', fontSize:15, color:'#fff' }}>{saving ? 'Saving…' : ev.id ? 'Save changes' : 'Add event'}</Text>
          </TouchableOpacity>
        </View>

        {/* Delete — only for existing events */}
        {ev.id && (
          <View style={{ marginTop:12 }}>
            {confirmDelete ? (
              <View style={{ flexDirection:'row', gap:10 }}>
                <TouchableOpacity onPress={() => setConfirmDelete(false)} style={{ flex:1, paddingVertical:14, borderRadius:14, backgroundColor:'rgba(0,0,0,0.06)', alignItems:'center' }} activeOpacity={0.75}>
                  <Text style={{ fontFamily:'Poppins_600SemiBold', fontSize:14, color:'rgba(0,0,0,0.45)' }}>Keep it</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={async () => {
                    await supabase.from('events').delete().eq('id', ev.id);
                    onDeleted?.();
                    onBack();
                  }}
                  style={{ flex:2, paddingVertical:14, borderRadius:14, backgroundColor:'#DC2626', alignItems:'center' }}
                  activeOpacity={0.85}
                >
                  <Text style={{ fontFamily:'Poppins_700Bold', fontSize:14, color:'#fff' }}>Yes, delete event</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity onPress={() => setConfirmDelete(true)} style={{ paddingVertical:14, borderRadius:14, alignItems:'center' }} activeOpacity={0.75}>
                <Text style={{ fontFamily:'Poppins_600SemiBold', fontSize:14, color:'rgba(220,38,38,0.60)' }}>Delete event</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── ReceiptCard ─────────────────────────────────────────────────────────────
function ReceiptCard({ receipt }: { receipt: any }) {
  const [expanded, setExpanded] = React.useState(false);
  const items: any[] = receipt.items ?? [];
  const shown = expanded ? items : items.slice(0, 5);
  const emoji = receipt.store?.toLowerCase().includes('wool') ? '🛍' : '🛒';
  const dateLabel = receipt.purchase_date
    ? new Date(receipt.purchase_date + 'T00:00:00').toLocaleDateString('en-AU', { weekday:'short', day:'numeric', month:'short' })
    : '';
  return (
    <View style={{ backgroundColor:'#fff', borderRadius:16, borderWidth:1, borderColor:'rgba(0,0,0,0.08)', marginBottom:10, overflow:'hidden' }}>
      <TouchableOpacity style={{ flexDirection:'row', alignItems:'center', gap:12, padding:14 }} onPress={() => setExpanded(v => !v)} activeOpacity={0.75}>
        <Text style={{ fontSize:24, flexShrink:0 }}>{emoji}</Text>
        <View style={{ flex:1 }}>
          <Text style={{ fontFamily:'Poppins_700Bold', fontSize:14, color:'#0A0A0A' }}>{receipt.store || 'Unknown store'}</Text>
          <Text style={{ fontFamily:'Poppins_400Regular', fontSize:11, color:'rgba(0,0,0,0.45)', marginTop:2 }}>{dateLabel} · {receipt.item_count ?? items.length} items</Text>
        </View>
        {receipt.total_amount != null && (
          <Text style={{ fontFamily:'Poppins_700Bold', fontSize:16, color:'#0A0A0A', flexShrink:0 }}>${Number(receipt.total_amount).toFixed(2)}</Text>
        )}
        <Text style={{ fontSize:14, color:'rgba(0,0,0,0.25)', marginLeft:4, transform:[{ rotate: expanded ? '90deg' : '0deg' }] }}>›</Text>
      </TouchableOpacity>
      {expanded && items.length > 0 && (
        <View style={{ borderTopWidth:1, borderTopColor:'rgba(0,0,0,0.07)' }}>
          {shown.map((item: any, i: number) => (
            <View key={i} style={{ flexDirection:'row', alignItems:'center', gap:10, paddingVertical:9, paddingHorizontal:14, borderBottomWidth: i < shown.length - 1 ? 1 : 0, borderBottomColor:'rgba(0,0,0,0.05)' }}>
              <Text style={{ fontSize:14, flexShrink:0 }}>{item.emoji || '🛒'}</Text>
              <Text style={{ fontFamily:'Poppins_400Regular', fontSize:12, color:'#0A0A0A', flex:1 }}>{item.name}</Text>
              {item.price != null && <Text style={{ fontFamily:'Poppins_600SemiBold', fontSize:12, color:'rgba(0,0,0,0.45)', flexShrink:0 }}>${Number(item.price).toFixed(2)}</Text>}
            </View>
          ))}
          {items.length > 5 && !expanded && (
            <Text style={{ fontFamily:'Poppins_400Regular', fontSize:11, color:'rgba(0,0,0,0.35)', textAlign:'center', paddingVertical:9 }}>Show all {items.length} items</Text>
          )}
          {items.length > 5 && (
            <TouchableOpacity onPress={() => setExpanded(v => !v)} style={{ paddingVertical:9, alignItems:'center' }} activeOpacity={0.75}>
              <Text style={{ fontFamily:'Poppins_400Regular', fontSize:11, color:'rgba(0,0,0,0.35)' }}>{expanded && items.length > 5 ? 'Show less' : `Show all ${items.length} items`}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

// ── Brief cache (module-level) ─────────────────────────────────────────────
let lastBriefTime: number | null = null;
let cachedBriefText: string | null = null;
let cachedBriefSeed: string | null = null;

// ══════════════════════════════════════════════════════════════════════════
// ── CARD COMPONENTS ────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════

// ── CalendarCard ──────────────────────────────────────────────────────────
function CalendarCard({
  events, isEvening, onAdd, onFullCalendar, onEventPress,
}: {
  events: any[]; isEvening: boolean;
  onAdd: () => void; onFullCalendar: () => void;
  onEventPress: (ev: any) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const INITIAL_SHOW = 4;
  const now = new Date();
  const todayLabel = now.toLocaleDateString('en-AU', { weekday:'short', day:'numeric', month:'short' });
  const tomorrowDate = localDatePlusDays(1);
  const tomorrowLabel = new Date(tomorrowDate+'T00:00:00').toLocaleDateString('en-AU', { weekday:'short', day:'numeric', month:'short' });
  const eyeLabel = isEvening
    ? `📅 Tomorrow · ${tomorrowLabel}`
    : `📅 Today · ${todayLabel}`;

  const shown = expanded ? events : events.slice(0, INITIAL_SHOW);
  const overflow = events.length - INITIAL_SHOW;

  function renderEventRow(ev: any, i: number) {
    const members = (ev.assignees || []).map((id:string) => FAMILY_MEMBERS.find(m=>m.id===id)).filter(Boolean) as any[];
    const dotColor = members.length > 0 ? members[0].color : 'rgba(255,255,255,0.45)';
    return (
      <TouchableOpacity key={ev.id || i} style={cardS.tRow} onPress={() => onEventPress(ev)} activeOpacity={0.7}>
        <Text style={cardS.tTime} numberOfLines={1}>{fmtTime(ev.start_time)}</Text>
        <View style={[cardS.tDot, { backgroundColor:dotColor }]}/>
        <Text style={cardS.tEv} numberOfLines={1}>{ev.title} {getEventEmoji(ev.title)}</Text>
        {members.length <= 2
          ? members.map((m:any) => (
              <View key={m.id} style={[cardS.tAv, { backgroundColor:m.color }]}>
                <Text style={cardS.tAvTxt}>{m.name[0]}</Text>
              </View>
            ))
          : <>
              {members.slice(0,2).map((m:any) => (
                <View key={m.id} style={[cardS.tAv, { backgroundColor:m.color }]}>
                  <Text style={cardS.tAvTxt}>{m.name[0]}</Text>
                </View>
              ))}
              <View style={[cardS.tAv, { backgroundColor:'rgba(255,255,255,0.2)' }]}>
                <Text style={[cardS.tAvTxt, { fontSize:9 }]}>+{members.length - 2}</Text>
              </View>
            </>
        }
      </TouchableOpacity>
    );
  }

  return (
    <View style={cardS.cal}>
      {/* Header */}
      <View style={cardS.hdr}>
        <Text style={cardS.eyeLt}>{eyeLabel}</Text>
        <View style={cardS.hdrActions}>
          <TouchableOpacity style={cardS.addBtnLt} onPress={onAdd} activeOpacity={0.75}>
            <Text style={cardS.addBtnTxtLt}>+ Add</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onFullCalendar} activeOpacity={0.75}>
            <Text style={cardS.seeAllLt}>Full →</Text>
          </TouchableOpacity>
        </View>
      </View>
      {/* Event rows */}
      {events.length === 0 ? (
        <Text style={cardS.emptyLt}>Nothing on the calendar {isEvening ? 'tomorrow' : 'today'}</Text>
      ) : (
        <>
          {shown.map((ev, i) => renderEventRow(ev, i))}
          {!expanded && overflow > 0 && (
            <TouchableOpacity style={cardS.tOverflow} onPress={() => setExpanded(true)} activeOpacity={0.7}>
              <Text style={cardS.calOverflow}>{overflow} more ›</Text>
            </TouchableOpacity>
          )}
          {expanded && events.length > INITIAL_SHOW && (
            <TouchableOpacity style={cardS.tOverflow} onPress={() => setExpanded(false)} activeOpacity={0.7}>
              <Text style={cardS.calOverflow}>Show less ∧</Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </View>
  );
}

// ── WeatherCard ───────────────────────────────────────────────────────────
function WeatherCard({ weather, isEvening }: { weather: WeatherData | null; isEvening: boolean }) {
  const eyeLabel = isEvening ? 'Tomorrow' : 'Weather';
  if (!weather) {
    return (
      <View style={[cardS.wx, { justifyContent:'center', alignItems:'center' }]}>
        <Text style={cardS.eyeDk}>{eyeLabel}</Text>
        <TypingDots color="rgba(0,0,0,0.3)"/>
      </View>
    );
  }
  const wType = weatherType(weather.code);
  const extra = weatherExtra(weather.code, weather.windspeed);
  return (
    <View style={cardS.wx}>
      <Text style={cardS.eyeDkSm}>{eyeLabel}</Text>
      <Text style={cardS.wxTemp}>{Math.round(weather.temp)}°</Text>
      <Text style={cardS.wxCond}>{weatherCondition(weather.code)}</Text>
      <View style={{ marginVertical:6 }}>
        <WeatherIcon type={wType}/>
      </View>
      <Text style={cardS.wxExtra}>{extra}</Text>
    </View>
  );
}

// ── ShoppingCard ──────────────────────────────────────────────────────────
function ShoppingCard({
  items, count, onAdd, onFull,
}: {
  items: any[]; count: number; onAdd: () => void; onFull: () => void;
}) {
  const shown = items.filter((item:any) => item.checked !== true).slice(0, 3);
  return (
    <View style={cardS.shop}>
      <View style={cardS.hdr}>
        <Text style={cardS.eyeDk}>🛒 Shopping</Text>
        <View style={cardS.hdrActions}>
          <TouchableOpacity style={cardS.addBtnDk} onPress={onAdd} activeOpacity={0.75}>
            <Text style={cardS.addBtnTxtDk}>+ Add</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onFull} activeOpacity={0.75}>
            <Text style={cardS.seeAllDk}>Full →</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={{ flex:1 }}>
        {shown.map((item:any, i:number) => (
          <View key={item.id || i} style={cardS.shopItem}>
            <View style={cardS.shopDot}/>
            <Text style={cardS.shopTxt} numberOfLines={1}>{item.name || item.item}</Text>
          </View>
        ))}
        {shown.length === 0 && <Text style={cardS.emptyDkSm}>List is clear</Text>}
      </View>
      <View style={cardS.shopFooter}>
        <Text style={cardS.shopCountLbl}>items</Text>
        <Text style={cardS.shopCount}>{count}</Text>
      </View>
    </View>
  );
}

// ── ActionsCard ───────────────────────────────────────────────────────────
function ActionsCard({
  todos, timeState, tomorrowMorningEvents, onAdd, onFull, onTick,
}: {
  todos: any[]; timeState: 'am' | 'pm' | 'evening';
  tomorrowMorningEvents: any[];
  onAdd: () => void; onFull: () => void;
  onTick: (todo: any) => void;
}) {
  const isEvening = timeState === 'evening';
  // Show all — ticked ones stay visible (greyed/struck)
  const shownTodos = todos.slice(0, 5);
  const activeCount = todos.filter(t => !t.done && t.status !== 'done').length;

  return (
    <View style={cardS.act}>
      <View style={cardS.hdr}>
        <Text style={cardS.eyeDk}>
          {isEvening ? "🌙 Put out tonight" : "🎯 Today's actions"}
        </Text>
        <View style={cardS.hdrActions}>
          {activeCount > 0 && (
            <View style={cardS.actCount}>
              <Text style={cardS.actCountTxt}>{activeCount}</Text>
            </View>
          )}
          <TouchableOpacity style={cardS.addBtnDk} onPress={onAdd} activeOpacity={0.75}>
            <Text style={cardS.addBtnTxtDk}>+ Add</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onFull} activeOpacity={0.75}>
            <Text style={cardS.seeAllDk}>Full →</Text>
          </TouchableOpacity>
        </View>
      </View>

      {shownTodos.length === 0 ? (
        <Text style={cardS.emptyDk}>Nothing pending — enjoy the day 🎉</Text>
      ) : (
        shownTodos.map((todo:any, i:number) => {
          const isDone = todo.done === true || todo.status === 'done';
          const dotColor = isDone ? 'rgba(0,0,0,0.12)' : todoPriorityColor(todo);
          const badge = todoBadge(todo);
          const memberIds: string[] = Array.isArray(todo.assigned_to) ? todo.assigned_to : todo.assigned_to ? [todo.assigned_to] : [];
          const members = memberIds.map((id:string) => FAMILY_MEMBERS.find(m=>m.id===id)).filter(Boolean) as any[];
          return (
            <View key={todo.id || i} style={[cardS.actRow, isDone && { opacity:0.45 }]}>
              {/* Circle tick */}
              <TouchableOpacity
                style={[cardS.actChk, isDone && cardS.actChkDone]}
                onPress={() => onTick(todo)}
                activeOpacity={0.7}
                hitSlop={{ top:8, bottom:8, left:8, right:8 }}
              >
                {isDone && <Text style={{ fontSize:10, color:'rgba(0,0,0,0.5)' }}>✓</Text>}
              </TouchableOpacity>
              <View style={[cardS.actDot, { backgroundColor:dotColor }]}/>
              <Text style={[cardS.actTxt, isDone && { textDecorationLine:'line-through', color:'rgba(0,0,0,0.32)', fontFamily:'Poppins_400Regular' }]} numberOfLines={1}>{todo.title}</Text>
              {members.slice(0,1).map((m:any) => (
                <View key={m.id} style={[cardS.actWho, { backgroundColor:m.color }]}>
                  <Text style={cardS.actWhoTxt}>{m.name[0]}</Text>
                </View>
              ))}
              {badge && !isDone && (
                <View style={[cardS.bdg,
                  badge.style==='rem' && cardS.bdgRem,
                  badge.style==='ovd' && cardS.bdgOvd,
                  badge.style==='td'  && cardS.bdgTd,
                ]}>
                  <Text style={[cardS.bdgTxt,
                    badge.style==='rem' && { color:'#CC2020' },
                    badge.style==='ovd' && { color:'#B91C1C' },
                    badge.style==='td'  && { color:'#6A4800' },
                  ]}>{badge.label}</Text>
                </View>
              )}
            </View>
          );
        })
      )}

      {/* Evening — tomorrow morning section */}
      {isEvening && tomorrowMorningEvents.length > 0 && (
        <>
          <View style={cardS.actDivider}>
            <View style={cardS.actDivLine}/>
            <Text style={cardS.actDivLbl}>🌅 Tomorrow morning</Text>
            <View style={cardS.actDivLine}/>
          </View>
          {tomorrowMorningEvents.slice(0, 3).map((ev:any, i:number) => {
            const members = (ev.assignees||[]).map((id:string) => FAMILY_MEMBERS.find(m=>m.id===id)).filter(Boolean) as any[];
            const dotColor = members.length > 0 ? members[0].color : 'rgba(0,0,0,0.2)';
            return (
              <View key={ev.id || i} style={[cardS.actRow, { marginLeft:6 }]}>
                <View style={[cardS.actDot, { backgroundColor:dotColor }]}/>
                <Text style={[cardS.actTxt, { fontWeight:'500', color:'rgba(0,0,0,0.65)' }]} numberOfLines={1}>
                  {ev.title}{fmtTime(ev.start_time) ? ` ${fmtTime(ev.start_time)}` : ''}
                </Text>
                {members.slice(0,1).map((m:any) => (
                  <View key={m.id} style={[cardS.actWho, { backgroundColor:m.color }]}>
                    <Text style={cardS.actWhoTxt}>{m.name[0]}</Text>
                  </View>
                ))}
              </View>
            );
          })}
        </>
      )}
    </View>
  );
}

// ── DinnerCard ────────────────────────────────────────────────────────────
function DinnerCard({
  meals, timeState, onPlanMeals,
}: {
  meals: any[]; timeState: 'am' | 'pm' | 'evening'; onPlanMeals: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const today = localDateStr();
  const tomorrow = localDatePlusDays(1);
  const isEvening = timeState === 'evening';
  const targetDate = isEvening ? tomorrow : today;
  const eyeLabel = isEvening ? "🍽️ Tomorrow's dinner" : "🍽️ Tonight's dinner";

  const tonightMeal = meals.find(m => m.day_key === targetDate || m.planned_date === targetDate);

  // Build 7-day list from today
  const sevenDays = Array.from({ length:7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const key = localDateStr(d);
    const meal = meals.find(m => m.day_key === key || m.planned_date === key);
    const isTonight = i === 0;
    const dayAbbr = i === 0 ? 'Tonight' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-AU', { weekday:'short' });
    return { key, meal, isTonight, dayAbbr };
  });

  const unplannedCount = sevenDays.filter(d => !d.meal).length;

  return (
    <View style={cardS.din}>
      <View style={[cardS.hdr, { marginBottom:10 }]}>
        <Text style={cardS.eyeDk}>{eyeLabel}</Text>
        {expanded && (
          <TouchableOpacity onPress={() => setExpanded(false)} activeOpacity={0.75}>
            <Text style={cardS.seeAllDk}>Close ∧</Text>
          </TouchableOpacity>
        )}
      </View>

      {tonightMeal ? (
        <View style={cardS.dinRow}>
          <Text style={cardS.dinIcon}>{getMealEmoji(tonightMeal.meal_name)}</Text>
          <View style={{ flex:1 }}>
            <Text style={cardS.dinName}>{tonightMeal.meal_name}</Text>
            {tonightMeal.prep_mins > 0 && (
              <Text style={cardS.dinSub}>{tonightMeal.prep_mins} min prep</Text>
            )}
          </View>
          <View style={cardS.dinTick}><Text style={cardS.dinTickTxt}>✓ Planned</Text></View>
        </View>
      ) : (
        <TouchableOpacity style={cardS.dinNudge} onPress={onPlanMeals} activeOpacity={0.75}>
          <Text style={cardS.dinNudgeTxt}>Nothing planned {isEvening ? 'for tomorrow' : 'for tonight'} — Quick idea? 💡</Text>
        </TouchableOpacity>
      )}

      {/* 7-day expanded strip */}
      {expanded && (
        <View style={cardS.dinExpanded}>
          {sevenDays.map(({ key, meal, isTonight, dayAbbr }) => (
            <View key={key} style={cardS.dinDayRow}>
              <Text style={[cardS.dinDayLbl, isTonight && { color:'#C84010', fontFamily:'Poppins_700Bold' }]}>{dayAbbr}</Text>
              {meal ? (
                <>
                  <Text style={cardS.dinDayMeal} numberOfLines={1}>{getMealEmoji(meal.meal_name)} {meal.meal_name}</Text>
                  <Text style={cardS.dinDayTick}>✓</Text>
                </>
              ) : (
                <>
                  <Text style={cardS.dinDayBlank}>Nothing yet</Text>
                  <Text style={cardS.dinDayWarn}>⚠</Text>
                </>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Footer */}
      <View style={cardS.dinFooter}>
        {expanded
          ? <Text style={cardS.dinFooterLbl}>{unplannedCount > 0 ? `${unplannedCount} nights unplanned` : 'Week looking good'}</Text>
          : <Text style={cardS.dinFooterLbl}>Meal plan</Text>
        }
        {expanded ? (
          <TouchableOpacity onPress={onPlanMeals} activeOpacity={0.75}>
            <Text style={cardS.dinFooterTap}>Open meal planner ›</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => setExpanded(true)} activeOpacity={0.75}>
            <Text style={cardS.dinFooterTap}>Next 7 days ›</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// ── MAIN COMPONENT ─────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════
// ── Landing overlay — no navigation needed, renders on top of HomeScreen ──
const LANDING_TEST_MODE = true; // ← TEMP: set false before launch

// Default export — SwipeWorld is the app entry point
// HomeScreen is available as named export for future ChatPage.tsx extraction
import SwipeWorld from './swipe-world';
export default SwipeWorld;
export { HomeScreen };

function HomeScreen({
  inputRef: externalInputRef,
  fabRef: externalFabRef,
  fabActive: externalFabActive,
  setFabActive: externalSetFabActive,
  onNavigateDashboard,
  isEmbedded = false,
  isActive = false,
  pendingMicText = null,
  onMicTextConsumed,
}: {
  inputRef?: React.RefObject<any>;
  fabRef?: React.RefObject<ZaeliFABHandle>;
  fabActive?: 'dashboard'|'chat'|'keyboard'|'myspace'|null;
  setFabActive?: (v: any) => void;
  onNavigateDashboard?: () => void;
  isEmbedded?: boolean;
  isActive?: boolean;
  pendingMicText?: string|null;
  onMicTextConsumed?: () => void;
} = {}) {
  const router    = useRouter();
  const params    = useLocalSearchParams<{ autoMic?: string; seedMessage?: string; calendarScan?: string }>();
  const scrollRef = useRef<ScrollView>(null);
  const inputRef  = externalInputRef ?? useRef<TextInput>(null);
  const fabRef    = externalFabRef   ?? useRef<ZaeliFABHandle>(null);
  const now       = new Date();
  const h         = now.getHours();
  const dateLabel = now.toLocaleDateString('en-AU', { weekday:'long', day:'numeric', month:'long' });

  // Time state: am=5–12, pm=12–20, evening=20–5
  const timeState: 'am' | 'pm' | 'evening' = h >= 5 && h < 12 ? 'am' : h >= 12 && h < 20 ? 'pm' : 'evening';

  // ── Chat persistence ─────────────────────────────────────────────────────
  const { messages: persistedMessages, setMessages: setPersistedMessages, loaded: chatLoaded } = useChatPersistence('home');

  const [menuOpen,        setMenuOpen]        = useState(false);
  const [messages,        setMessages]        = useState<Msg[]>([]);
  const [input,           setInput]           = useState('');
  const [loading,         setLoading]         = useState(false);
  const [isRecording,     setIsRecording]     = useState(false);
  const [micTimer,        setMicTimer]        = useState(0);
  const micTimerRef       = useRef<ReturnType<typeof setInterval> | null>(null);
  const micOverlayAnim    = useRef(new Animated.Value(0)).current;
  const [showScrollBtn,   setShowScrollBtn]   = useState(false);
  const [briefReplies,    setBriefReplies]    = useState<string[]>([]);
  const [chatBriefText,   setChatBriefText]   = useState('');
  const [chatBriefChips,  setChatBriefChips]  = useState<string[]>([]);
  const [briefHero,       setBriefHero]       = useState<string>('');
  const [briefChips,      setBriefChips]      = useState<string[]>([]);
  const [activePill,      setActivePill]      = useState<string>('');
  const [overviewOpen,    setOverviewOpen]    = useState(false);
  const [briefSeed,       setBriefSeed]       = useState('');
  const [showAddSheet,    setShowAddSheet]    = useState(false);
  const [pendingImage,    setPendingImage]    = useState<string | null>(null);
  const [thumbs,          setThumbs]          = useState<Record<string, 'up'|'down'|null>>({});
  const [keyboardOpen,    setKeyboardOpen]    = useState(false);
  const [liveCamera,      setLiveCamera]      = useState(false);
  const [placeholderIdx,  setPlaceholderIdx]  = useState(0);
  const [selectedEvent,   setSelectedEvent]   = useState<any>(null);
  // v5: FAB active button state — use external if provided by swipe-world
  const [internalFabActive, internalSetFabActive] = useState<'dashboard'|'chat'|'keyboard'|null>('chat');
  const fabActive    = externalFabActive    ?? internalFabActive;
  const setFabActive = externalSetFabActive ?? internalSetFabActive;
  // v5: true when we arrived from Dashboard — shows back pill
  const [returnToDashboard, setReturnToDashboard] = useState(false);
  const [screen,          setScreen]          = useState<'splash'|'entry'|'chat'>('chat');
  const [entryRecording,  setEntryRecording]  = useState(false);
  const [entryProcessing, setEntryProcessing] = useState(false);
  const [calSheetOpen,    setCalSheetOpen]    = useState(false);
  const [calSheetTab,     setCalSheetTab]     = useState<'today'|'tomorrow'|'month'>('today');
  const [calSheetEvents,  setCalSheetEvents]  = useState<any[]>([]);
  const [calSheetTomEvents, setCalSheetTomEvents] = useState<any[]>([]);
  const [calSheetEditEv,  setCalSheetEditEv]  = useState<any>(null); // null = list view, event = edit form
  const [calSheetMonthYear, setCalSheetMonthYear] = useState(() => { const n = new Date(); return { month: n.getMonth(), year: n.getFullYear() }; });
  const [calSheetSelDay,  setCalSheetSelDay]  = useState<string|null>(null);
  const [calSheetDayEvs,  setCalSheetDayEvs]  = useState<any[]>([]);
  const [calSheetMonthEvs, setCalSheetMonthEvs] = useState<any[]>([]); // all events in current month for dots

  // ── Shopping sheet state ─────────────────────────────────────────────────
  const [shopSheetOpen,      setShopSheetOpen]      = useState(false);
  const [shopSheetTab,       setShopSheetTab]       = useState<'list'|'pantry'|'spend'>('list');
  const [shopSheetItems,     setShopSheetItems]     = useState<any[]>([]);   // unchecked
  const [shopSheetBought,    setShopSheetBought]    = useState<any[]>([]);   // checked / recently bought
  const [shopSheetPantry,    setShopSheetPantry]    = useState<any[]>([]);
  const [shopSheetReceipts,  setShopSheetReceipts]  = useState<any[]>([]);
  const [shopSheetMonthSpend,setShopSheetMonthSpend]= useState(0);
  const [shopSheetMonthShops,setShopSheetMonthShops]= useState(0);
  const [shopSheetMonthItems,setShopSheetMonthItems]= useState(0);
  const [shopSearchOpen,     setShopSearchOpen]     = useState(false);
  const [shopSearchText,     setShopSearchText]     = useState('');
  const [shopAisleMode,      setShopAisleMode]      = useState(false);
  const [shopPantryAisle,    setShopPantryAisle]    = useState(false);
  const [shopDelConfirmId,   setShopDelConfirmId]   = useState<string|null>(null);
  const [shopExpandedId,     setShopExpandedId]     = useState<string|null>(null);
  const [shopAddInput,       setShopAddInput]       = useState('');
  const [shopEditingId,      setShopEditingId]      = useState<string|null>(null);
  const [shopEditText,       setShopEditText]       = useState('');
  const [shopEditQty,        setShopEditQty]        = useState('');

  // ── Card data state ──────────────────────────────────────────────────────
  const [cardData, setCardData] = useState<CardData>({
    todayEvents: [], tomorrowEvents: [], shopItems: [], shopCount: 0,
    todos: [], reminders: [], meals: [], weather: null,
  });
  const [cardLoading, setCardLoading] = useState(true);

  const PLACEHOLDERS = ['Chat with Zaeli…', 'Or just speak…', 'Chat with Zaeli…', 'Ask anything…'];

  const waveAnims        = useRef(Array.from({ length:13 }, () => new Animated.Value(0.3))).current;

  // Card stagger animations — fade + slide in sequentially
  const cardAnims = useRef([0,1,2,3].map(() => ({
    opacity: new Animated.Value(0),
    translateY: new Animated.Value(16),
  }))).current;

  // Trigger stagger + open overview when brief loads
  useEffect(() => {
    if (!briefHero) return;
    // Open the card stack with a small delay so hero text renders first
    setTimeout(() => setOverviewOpen(true), 200);
    // Stagger: 0ms, 150ms, 300ms, 450ms
    cardAnims.forEach((anim, i) => {
      Animated.parallel([
        Animated.timing(anim.opacity,     { toValue:1, duration:380, delay:i*150 + 200, useNativeDriver:true }),
        Animated.timing(anim.translateY,  { toValue:0, duration:380, delay:i*150 + 200, easing:Easing.out(Easing.cubic), useNativeDriver:true }),
      ]).start();
    });
  }, [briefHero]);
  const waveLoopRef      = useRef<Animated.CompositeAnimation | null>(null);
  const scrollBtnAnim    = useRef(new Animated.Value(0)).current;
  const pillsAnim        = useRef(new Animated.Value(1)).current;
  const sheetAnim        = useRef(new Animated.Value(320)).current;
  const splashOpacity    = useRef(new Animated.Value(1)).current;
  const entryOpacity     = useRef(new Animated.Value(0)).current;
  const chatOpacity      = useRef(new Animated.Value(1)).current;
  const starScale        = useRef(new Animated.Value(0.4)).current;
  const wordmarkOpacity  = useRef(new Animated.Value(0)).current;
  const recordingRef     = useRef<Audio.Recording | null>(null);
  const shopMicMode      = useRef(false); // true = mic triggered from shop sheet → add as item
  const shopListScrollRef = useRef<ScrollView>(null);
  const isAtBottom       = useRef(false);
  const isExpandingCard  = useRef(false); // suppresses auto-scroll during inline card expansion
  const lastImageDesc    = useRef<string>('');
  const lastSendRef      = useRef<string>('');
  const handledScanRef   = useRef<string | null>(null);
  const pendingCalendarAdd = useRef(false); // true while user is in add-with-Zaeli flow

  const FOCUS_CHIPS = [
    { emoji:'📅', label:"What's on today",   sub:'Calendar · schedule · reminders', seed:"What's on today?" },
    { emoji:'🛒', label:'Shopping & meals',  sub:'List · pantry · dinner tonight',  seed:'Give me a shopping and meals update.' },
    { emoji:'✅', label:'What needs doing',  sub:'Tasks · urgent · slipping',       seed:"What's most pressing right now?" },
    { emoji:'👧', label:'Kids & family',     sub:'Jobs · homework · activities',    seed:'How are the kids and family going?' },
    { emoji:'🌅', label:"What's coming up",  sub:'Week ahead · events · plan',      seed:"What's coming up this week?" },
  ];

  // ── Load card data ────────────────────────────────────────────────────────
  const loadCardData = useCallback(async () => {
    setCardLoading(true);
    try {
      const today    = localDateStr();
      const tomorrow = localDatePlusDays(1);
      const in7days  = localDatePlusDays(7);

      const [
        eventsRes,
        shopRes,
        shopCountRes,
        todosRes,
        remindersRes,
        mealsRes,
      ] = await Promise.all([
        supabase.from('events')
          .select('id,title,date,start_time,end_time,notes,assignees,all_day')
          .eq('family_id', FAMILY_ID)
          .gte('date', today)
          .lte('date', tomorrow)
          .order('date').order('start_time').limit(30),
        supabase.from('shopping_items')
          .select('id,name,item,category,checked')
          .eq('family_id', FAMILY_ID)
          .limit(10),
        supabase.from('shopping_items')
          .select('*', { count:'exact', head:true })
          .eq('family_id', FAMILY_ID)
          .neq('checked', true),
        supabase.from('todos')
          .select('id,title,priority,status,due_date,assigned_to,notes')
          .eq('family_id', FAMILY_ID)
          .eq('status', 'active')
          .order('created_at', { ascending: false }).limit(8),
        supabase.from('reminders')
          .select('id,title,remind_at,member_id,repeat,status')
          .eq('family_id', FAMILY_ID)
          .eq('status', 'active')
          .lte('remind_at', new Date(Date.now() + 24*60*60*1000).toISOString())
          .order('remind_at').limit(5),
        supabase.from('meal_plans')
          .select('id,meal_name,meal_type,planned_date,day_key,prep_mins,cook_ids')
          .eq('family_id', FAMILY_ID)
          .gte('planned_date', today)
          .lte('planned_date', in7days)
          .order('planned_date').limit(7),
      ]);

      // Filter events — no all-day
      // start_time stored as UTC: "2026-04-01 08:20:00+00" — new Date() handles this correctly
      const nowMinus15Ms = Date.now() - 15 * 60 * 1000;
      const allEvents = (eventsRes.data ?? []).filter((e:any) => {
        if (e.all_day) return false;
        return true;
      });
      const todayEvents = allEvents.filter((e:any) => {
        if (e.date !== today) return false;
        if (!e.start_time) return true; // no time = always show
        // new Date() parses "+00" suffix correctly → gives local time in ms
        const eventMs = new Date(e.start_time).getTime();
        return eventMs >= nowMinus15Ms;
      });
      const tomorrowEvents = allEvents.filter((e:any) => e.date === tomorrow);

      // Fetch weather from Open-Meteo (free, no key)
      let weatherData: WeatherData | null = null;
      try {
        const wxRes = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${WEATHER_LAT}&longitude=${WEATHER_LON}&current=temperature_2m,weather_code,windspeed_10m&timezone=Australia%2FBrisbane`
        );
        const wxJson = await wxRes.json();
        const curr = wxJson?.current;
        if (curr) {
          weatherData = {
            temp:      curr.temperature_2m ?? 22,
            code:      curr.weather_code ?? 0,
            windspeed: curr.windspeed_10m ?? 0,
            condition: weatherCondition(curr.weather_code ?? 0),
          };
        }
      } catch { /* weather fails silently */ }

      // Merge reminders into actions — show today's reminders with Reminder badge
      const todayReminders = (remindersRes.data ?? []).map((r:any) => ({
        id: r.id,
        title: r.title,
        priority: 'normal',
        status: 'active',
        done: false,
        due_date: r.remind_at ? r.remind_at.slice(0,10) : null,
        assigned_to: r.member_id || null,
        reminder_type: 'reminder',
      }));

      setCardData({
        todayEvents,
        tomorrowEvents,
        shopItems:   shopRes.data ?? [],
        shopCount:   shopCountRes.count ?? 0,
        todos:       [...(todosRes.data ?? []), ...todayReminders],
        reminders:   remindersRes.data ?? [],
        meals:       mealsRes.data ?? [],
        weather:     weatherData,
      });
    } catch (e) {
      console.error('[loadCardData] error:', e);
    } finally {
      setCardLoading(false);
    }
  }, []);

  // ── Sync messages with persistence ────────────────────────────────────────
  const persistenceHasLoaded = useRef(false);

  useEffect(() => {
    if (chatLoaded && !persistenceHasLoaded.current) {
      persistenceHasLoaded.current = true;
      if (persistedMessages.length > 0) {
        // Only restore the brief — strip all inline cards and conversation.
        // Cards are always freshly generated on pill tap.
        const briefOnly = persistedMessages.filter(m => m.isBrief);
        setMessages(briefOnly);
      }
    }
  }, [chatLoaded, persistedMessages]);

  // Save messages to persistence whenever they change (debounced by the persistence hook)
  useEffect(() => {
    if (chatLoaded && persistenceHasLoaded.current) {
      setPersistedMessages(messages);
    }
  }, [messages]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Mount → load brief + card data immediately ─────────────────────────────
  useEffect(() => {
    generateBrief(true);
    loadCardData();
  }, []);

  function enterChat(topic?: string) {
    Animated.parallel([
      Animated.timing(entryOpacity, { toValue:0, duration:300, useNativeDriver:true }),
      Animated.timing(chatOpacity,  { toValue:1, duration:400, useNativeDriver:true }),
    ]).start(() => { setScreen('chat'); generateBrief(true, topic); });
  }

  // ── Keyboard listeners removed in v5 — FAB handles keyboard state ────────

  // ── Placeholder cycling removed in v5 — no persistent input bar ─────────

  // ── Scroll helpers ────────────────────────────────────────────────────────
  function scrollToEnd(animated = true) {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated }), 80);
  }
  function handleScroll(e: any) {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    const dist = contentSize.height - contentOffset.y - layoutMeasurement.height;
    const atBottom = dist < 80;
    isAtBottom.current = atBottom;
    if (!atBottom && !showScrollBtn) {
      setShowScrollBtn(true);
      Animated.timing(scrollBtnAnim, { toValue:1, duration:180, useNativeDriver:true }).start();
    } else if (atBottom && showScrollBtn) {
      Animated.timing(scrollBtnAnim, { toValue:0, duration:180, useNativeDriver:true }).start(() => setShowScrollBtn(false));
    }
  }

  // ── Message helpers ───────────────────────────────────────────────────────
  function addMsg(partial: Partial<Msg>): string {
    const msg: Msg = { id:uid(), role:'zaeli', text:'', ts:nowTs(), ...partial };
    setMessages(prev => [...prev, msg]);
    if (isAtBottom.current) scrollToEnd();
    return msg.id;
  }
  function updateMsg(id: string, patch: Partial<Msg>) {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, ...patch } : m));
    if (isAtBottom.current) scrollToEnd();
  }
  function handleCopy(text: string) { Clipboard.setString(text); }
  async function handleForward(text: string) { try { await Share.share({ message:text }); } catch {} }
  function handleThumb(msgId: string, dir: 'up'|'down') {
    setThumbs(prev => ({ ...prev, [msgId]: prev[msgId]===dir ? null : dir }));
  }

  // ── Toggle tick on Actions card — silent, keeps item visible, no reload ──
  async function handleTodoTick(todo: any) {
    const isReminder = todo.reminder_type === 'reminder';
    const isDone = todo.status === 'done' || todo.status === 'acknowledged';
    const newStatus = isDone
      ? 'active'
      : isReminder ? 'acknowledged' : 'done';

    // Optimistic update — keep item in card, just change status (stays visible greyed)
    setCardData(prev => ({
      ...prev,
      todos: prev.todos.map(t =>
        t.id === todo.id ? { ...t, status: newStatus } : t
      ),
    }));

    // Supabase write — silent, no reload (item stays visible in card)
    try {
      if (isReminder) {
        await supabase.from('reminders')
          .update({ status: newStatus })
          .eq('id', todo.id);
      } else {
        await supabase.from('todos')
          .update({ status: newStatus, updated_at: new Date().toISOString() })
          .eq('id', todo.id);
      }
    } catch {
      // Roll back on failure
      setCardData(prev => ({
        ...prev,
        todos: prev.todos.map(t =>
          t.id === todo.id ? { ...t, status: todo.status } : t
        ),
      }));
    }
  }

  // ── Domain pill tap → inject inline card + GPT-mini follow-up ──────────
  async function handlePillTap(domain: string) {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated:true }), 80);

    const cardMsgId = uid();
    const inlineTypeMap: Record<string, InlineData['type']> = {
      calendar: 'calendar', shopping: 'shopping', meals: 'meals', todos: 'todos',
    };
    const inlineType = inlineTypeMap[domain] ?? null;

    if (inlineType) {
      const today = localDateStr();
      let items: any[] = [];
      if (inlineType === 'calendar') {
        const tomorrow = localDatePlusDays(1);
        const [todayRes, tomorrowRes] = await Promise.all([
          supabase.from('events')
            .select('id,title,date,start_time,end_time,assignees,notes')
            .eq('family_id', FAMILY_ID).eq('date', today)
            .order('start_time').limit(8),
          supabase.from('events')
            .select('id,title,date,start_time,end_time,assignees,notes')
            .eq('family_id', FAMILY_ID).eq('date', tomorrow)
            .order('start_time').limit(8),
        ]);
        items = todayRes.data ?? [];
        const calMsg: Msg = {
          id: cardMsgId, role: 'zaeli', text: '', ts: nowTs(),
          inlineData: { type: 'calendar', items, tomorrowItems: tomorrowRes.data ?? [] },
        };
        // Remove all existing calendar inline cards, then append fresh full-day card at bottom
        setMessages(prev => {
          const withoutCalCards = prev.filter(m => m.inlineData?.type !== 'calendar');
          return [...withoutCalCards, calMsg];
        });
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated:true }), 120);
      } else if (inlineType === 'shopping') {
        const [uncheckedRes, countRes] = await Promise.all([
          supabase.from('shopping_items').select('id,name,item,category,checked,meal_source').eq('family_id', FAMILY_ID).neq('checked', true).order('created_at', { ascending: false }).limit(4),
          supabase.from('shopping_items').select('*', { count: 'exact', head: true }).eq('family_id', FAMILY_ID).neq('checked', true),
        ]);
        const shopItems4 = uncheckedRes.data ?? [];
        const shopTotal  = countRes.count ?? 0;
        // Remove all existing shopping inline cards, append fresh one
        const msg: Msg = { id: cardMsgId, role: 'zaeli', text: '', ts: nowTs(), inlineData: { type: 'shopping', items: shopItems4, tomorrowItems: [{ _count: shopTotal }] } };
        setMessages(prev => {
          const withoutShop = prev.filter(m => m.inlineData?.type !== 'shopping');
          return [...withoutShop, msg];
        });
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);
      } else if (inlineType === 'todos') {
        const { data } = await supabase.from('todos')
          .select('id,title,priority,status,due_date').eq('family_id', FAMILY_ID)
          .eq('status','active').limit(8);
        items = data ?? [];
        const msg: Msg = { id: cardMsgId, role: 'zaeli', text: '', ts: nowTs(), inlineData: { type: inlineType, items } };
        setMessages(prev => [...prev, msg]);
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated:true }), 120);
      } else if (inlineType === 'meals') {
        const { data } = await supabase.from('meal_plans')
          .select('id,meal_name,day_key,prep_mins').eq('family_id', FAMILY_ID)
          .gte('day_key', today).limit(7);
        items = data ?? [];
        const msg: Msg = { id: cardMsgId, role: 'zaeli', text: '', ts: nowTs(), inlineData: { type: inlineType, items } };
        setMessages(prev => [...prev, msg]);
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated:true }), 120);
      }
    }

    // Fire GPT follow-up — remove any existing pill follow-up first to avoid stacking
    const replyId = uid();
    setTimeout(async () => {
      setMessages(prev => {
        // Remove previous pill follow-up if exists, then add fresh loading one
        const without = prev.filter(m => !(m as any)._isPillFollowUp);
        return [...without, { id:replyId, role:'zaeli' as const, text:'', ts:nowTs(), isLoading:true, _isPillFollowUp:true } as any];
      });
      try {
        const today = localDateStr();
        const contextLines: string[] = [];
        if (domain === 'calendar') {
          const { data } = await supabase.from('events').select('title,start_time').eq('family_id',FAMILY_ID).eq('date',today).order('start_time').limit(5);
          contextLines.push((data??[]).length > 0 ? `Today: ${(data??[]).map((e:any) => `${e.title} at ${fmtTime(e.start_time)}`).join(', ')}` : 'No events today.');
        } else if (domain === 'shopping') {
          const { data } = await supabase.from('shopping_items').select('name,item').eq('family_id',FAMILY_ID).neq('checked',true).limit(5);
          const names = (data??[]).map((i:any) => i.name || i.item).filter(Boolean);
          contextLines.push(names.length > 0 ? `List: ${names.join(', ')} (${names.length} items)` : 'Shopping list is clear.');
        } else if (domain === 'meals') {
          const { data } = await supabase.from('meal_plans').select('meal_name,day_key').eq('family_id',FAMILY_ID).gte('day_key',today).limit(3);
          const tonightMeal = (data??[]).find((m:any) => m.day_key === today)?.meal_name;
          contextLines.push(tonightMeal ? `Tonight: ${tonightMeal}.` : 'Tonight not planned.');
        } else if (domain === 'todos') {
          const { data } = await supabase.from('todos').select('title,due_date').eq('family_id',FAMILY_ID).eq('status','active').limit(4);
          contextLines.push((data??[]).length > 0 ? `Open: ${(data??[]).map((t:any) => t.title).join(', ')}` : 'No open todos.');
        }
        const sys = `You are Zaeli — sharp, warm AI for Rich's Australian family.
Rich tapped the ${domain} pill. A card just dropped into the chat showing live data.
Context: ${contextLines.join(' ')}
Write ONE targeted follow-up line (max 10 words). Be specific to the data. Offer something concrete.
Never start with "I". No hollow phrases. Then 3 chips.
Return ONLY JSON: {"line":"...","chips":["chip1","chip2","chip3"]}`;
        const raw = await callGPT(sys, [{role:'user', content:'Generate.'}], 150, 'home_pill_tap');
        try {
          const parsed = JSON.parse(raw.replace(/\`\`\`json|\`\`\`/g,'').trim());
          updateMsg(replyId, { text: parsed.line ?? raw, isLoading:false, quickReplies: parsed.chips ?? [] });
        } catch {
          // JSON parse failed — show raw text as fallback
          updateMsg(replyId, { text: raw || "What would you like to do?", isLoading:false, quickReplies: ['Add event', 'Check tomorrow', 'Full calendar'] });
        }
      } catch {
        // Network/API failure — show fallback rather than disappearing
        updateMsg(replyId, { text: domain === 'calendar' ? "Anything to add or change today?" : "What would you like to do?", isLoading:false, quickReplies: ['Add event', 'Check tomorrow', 'Full calendar'] });
      }
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated:true }), 150);
    }, 400);
  }
  // ── + Add card handlers → seed Zaeli chat ────────────────────────────────
  function handleCardAdd(context: 'calendar' | 'shopping' | 'actions') {
    const prompts: Record<string, string> = {
      calendar: "What would you like to add to the calendar?",
      shopping: "What do you need to pick up?",
      actions:  "What do you need to remember or do?",
    };
    const prompt = prompts[context];
    // Scroll down to chat thread
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated:true }), 100);
    // Add Zaeli prompt inline
    addMsg({ role:'zaeli', text:prompt, isLoading:false,
      quickReplies: context === 'calendar'
        ? ["Add event for today", "Add event for tomorrow", "Add something for the kids"]
        : context === 'shopping'
        ? ["Add milk", "Add from pantry", "Clear the list"]
        : ["Add a reminder", "Add a task for today", "Cancel"],
    });
    // Focus input
    setTimeout(() => inputRef.current?.focus(), 400);
  }

  // ── Build live context ────────────────────────────────────────────────────
  async function buildContext() {
    const td = localDateStr(now);
    const frame = h < 6 ? 'late night' : h < 12 ? 'morning' : h < 17 ? 'afternoon' : h < 21 ? 'evening' : 'night';
    const timeStr = now.toLocaleTimeString('en-AU', { hour:'2-digit', minute:'2-digit' });
    try {
      const [
        { count: shopCount },
        { data: shopItems },
        { data: events },
        { count: todoCount },
        { data: meals },
      ] = await Promise.all([
        supabase.from('shopping_items').select('*',{count:'exact',head:true}).eq('family_id',DUMMY_FAMILY_ID_HOME).eq('checked',false),
        supabase.from('shopping_items').select('name').eq('family_id',DUMMY_FAMILY_ID_HOME).eq('checked',false).limit(50),
        supabase.from('events').select('title,date,start_time').eq('family_id',DUMMY_FAMILY_ID_HOME).gte('date',td).lte('date', localDateStr(new Date(Date.now() + 7*24*60*60*1000))).order('date').order('start_time').limit(20),
        supabase.from('todos').select('*',{count:'exact',head:true}).eq('family_id',DUMMY_FAMILY_ID_HOME).eq('done',false),
        supabase.from('meal_plans').select('meal_name,planned_date,day_key').eq('family_id',DUMMY_FAMILY_ID_HOME).gte('planned_date',td).limit(7),
      ]);
      const shopNames = shopItems?.map((i:any) => i.name).join(', ') || '';
      const shopStr   = shopCount ? `${shopCount} items — ${shopNames}` : 'list is clear';
      const evStr     = events?.length ? events.map((e:any) => `${e.title} (${naturalDate(e.date,td)}${e.start_time?' at '+fmtTime(e.start_time):''})`).join(', ') : 'nothing on the calendar';
      const mealToday = meals?.find((m:any) => m.planned_date===td || m.day_key===td)?.meal_name ?? null;
      const dinnerRule = h < 19
        ? mealToday ? `Dinner sorted — ${mealToday} tonight.` : "Dinner tonight isn't planned — mention warmly if relevant."
        : "Don't mention dinner.";
      const nextDays: Record<string,string> = {};
      for (let i = 0; i <= 7; i++) {
        const d = new Date(now); d.setDate(d.getDate() + i);
        const key = i===0?'today':i===1?'tomorrow':d.toLocaleDateString('en-AU',{weekday:'long'}).toLowerCase();
        nextDays[key] = localDateStr(d);
      }
      const datesCtx = Object.entries(nextDays).map(([k,v]) => `${k} = ${v}`).join(', ');
      const system = `You are Zaeli — a smart, warm, and quietly witty AI for a modern Australian family. Sharp, warm, genuinely enthusiastic. Finds the funny angle through delight, not detachment.

FAMILY: Rich (logged in), Anna, Poppy (Yr6, age 12), Gab (Yr4, age 10, boy), Duke (Yr1, age 8, boy).

LIVE DATA:
- Date: ${dateLabel} (${frame}, ${timeStr})
- Dates: ${datesCtx}
- Calendar: ${evStr}
- Shopping list: ${shopStr}
- To-dos: ${todoCount??0} open tasks
- ${dinnerRule}

CAPABILITIES: Add/update/delete calendar events, shopping items, todos DIRECTLY using tools. Today is ${td}. Never tell Rich to do it himself.

FORMAT: 2–4 sentences. Natural prose. No bullet points, no lists, no asterisks. Never start with "I". Never say "mate". Never say "Of course!" or any hollow affirmation.`;
      return { system, mealToday, shopCount:shopCount??0, shopStr, evStr, todoCount:todoCount??0, td };
    } catch {
      const td = localDateStr(now);
      return { system:`You are Zaeli — smart, warm, witty AI teammate for Rich's Australian family. Today is ${td}.`, mealToday:null, shopCount:0, shopStr:'unknown', evStr:'nothing on calendar', todoCount:0, td };
    }
  }

  // ── Generate brief ────────────────────────────────────────────────────────
  async function generateBrief(force = false, focusHint?: string) {
    // Never generate if persistence has already loaded messages
    if (chatLoaded && persistedMessages.length > 0 && !focusHint) return;
    if (!force && messages.length > 0) return;

    const elapsed = lastBriefTime ? Date.now() - lastBriefTime : Infinity;
    if (!force && elapsed < 30*60*1000 && cachedBriefText) {
      const cached = JSON.parse(cachedBriefText);
      setBriefHero(cached.hero ?? '');
      setBriefChips(cached.chips ?? []);
      return;
    }
    lastBriefTime = Date.now();
    setBriefHero(''); // show loading dots while generating

    try {
      // Fetch live data INSIDE brief — never rely on component state
      const today = localDateStr();
      const tomorrow = localDatePlusDays(1);
      const isLate = h >= 21 || h < 6;
      const isEvening = h >= 20;
      const isMorning = h >= 5 && h < 12;
      const frame = isLate ? 'late night' : isMorning ? 'morning' : h < 17 ? 'afternoon' : 'evening';

      const [eventsRes, todosRes, remindersRes, mealsRes, shopRes] = await Promise.all([
        supabase.from('events')
          .select('title,date,start_time,assignees')
          .eq('family_id', FAMILY_ID)
          .eq('date', today)
          .order('start_time').limit(10),
        supabase.from('todos')
          .select('title,priority,status,due_date')
          .eq('family_id', FAMILY_ID)
          .eq('status', 'active')
          .limit(8),
        supabase.from('reminders')
          .select('title,remind_at,member_id')
          .eq('family_id', FAMILY_ID)
          .eq('status', 'active')
          .lte('remind_at', new Date(Date.now() + 24*60*60*1000).toISOString())
          .limit(5),
        supabase.from('meal_plans')
          .select('meal_name,day_key')
          .eq('family_id', FAMILY_ID)
          .gte('day_key', today)
          .lte('day_key', tomorrow)
          .limit(2),
        supabase.from('shopping_items')
          .select('name,item')
          .eq('family_id', FAMILY_ID)
          .neq('checked', true)
          .limit(3),
      ]);

      const todayEvents = (eventsRes.data ?? []).map((e:any) => {
        const time = fmtTime(e.start_time);
        const assignees = (e.assignees || []).map((id:string) => FAMILY_MEMBERS.find(m=>m.id===id)?.name).filter(Boolean);
        return `${e.title}${time ? ' at ' + time : ''}${assignees.length ? ' (' + assignees.join(', ') + ')' : ''}`;
      });
      const todos = (todosRes.data ?? []).map((t:any) => `${t.title}${t.due_date && t.due_date <= today ? ' [OVERDUE]' : t.due_date === today ? ' [DUE TODAY]' : ''}`);
      const reminders = (remindersRes.data ?? []).map((r:any) => {
        const member = FAMILY_MEMBERS.find(m => m.id === r.member_id);
        return `${r.title}${member ? ' (re: ' + member.name + ')' : ''}`;
      });
      const meals = (mealsRes.data ?? []);
      const tonightMeal = meals.find((m:any) => m.day_key === today)?.meal_name ?? null;

      const contextStr = [
        todayEvents.length ? `TODAY'S EVENTS: ${todayEvents.join(' · ')}` : 'No events today.',
        todos.length ? `OPEN TODOS: ${todos.join(' · ')}` : 'No open todos.',
        reminders.length ? `REMINDERS DUE SOON: ${reminders.join(' · ')}` : '',
        tonightMeal ? `DINNER TONIGHT: ${tonightMeal} — sorted.` : (isMorning || h < 19 ? 'DINNER TONIGHT: not planned.' : ''),
      ].filter(Boolean).join('\n');

      const briefSys = `You are Zaeli — sharp, warm AI for Rich's Australian family (Anna, Poppy Yr6, Gab Yr4 boy, Duke Yr1 boy).

CURRENT TIME: ${frame}, ${new Date().toLocaleTimeString('en-AU', { hour:'2-digit', minute:'2-digit' })}

LIVE DATA:
${contextStr}

WRITE THE HOME SCREEN BRIEF. This is the FIRST thing Rich sees when he opens the app. It must feel like Zaeli genuinely knows his family — not a generic summary.

THE BRIEF FORMULA (non-negotiable — STRICT):
1. EXACTLY 2 SHORT sentences. Not 3. Not 4. TWO.
2. Sentence 1: Name the most time-sensitive thing. Use the PERSON'S NAME (Gab, Poppy, Duke). One specific fact only.
3. Sentence 2: One confirmation (what's sorted/fine) OR one forward-looking note. Never repeat sentence 1.
4. Wrap 1-2 key phrases in [square brackets] for italic emphasis — these render in DM Serif italic.
5. NEVER start with "I", "Good morning", "Hey", any greeting, or any weather/general observation.
6. NEVER write more than 20 words per sentence.
7. NEVER use phrases like "breathing room", "sorted out", "taken care of", "good to go", "on the radar".

TONE — match the time exactly:
- Morning (5–12): Sharp, energised, direct. "Gab needs a gold coin today."
- Afternoon (12–20): Practical. Mention what's left, confirm what's done.
- Evening (20–5): Calm. One gentle note. Never alarming. Short.
- All done: "[Enjoy the evening] — nothing left to do."

CHIPS — exactly 3 short phrases (3–5 words max each):
- CHIP 1 (accent, most important): The single most pressing action right now.
- CHIP 2 & 3: Other relevant actions from the data.
- Sound like things Rich would tap naturally. No punctuation. No emoji.
- NEVER use "View", "See", "Check" as the first word — use action verbs.

BANNED WORDS: "breathing room", "queued up", "locked in", "tidy", "sorted", "lined up", "all set", "stacked", "ambush", "sprint", "chaos", "chaotic", "mate", "guys", "great".

Return ONLY valid JSON (no markdown, no backticks):
{"hero":"2 sentences max with [italic key phrases]","chips":["most urgent action","second chip","third chip"]}

EXAMPLES OF GOOD BRIEFS:
- Morning with todos: "Gab needs a gold coin today — and [car insurance is due tomorrow]. Dinner sorted, soccer at 4."
- Evening with reminder: "Poppy's library books are due back [tomorrow morning]. Insurance still open — worth 5 minutes tonight."
- All done: "Everything sorted. [Enjoy the evening] — you've earned it."
- Afternoon calm: "[Pasta Carbonara] is on for tonight. Two things still open — the plumber call and Duke's eye test."`;

      const raw = await callGPT(briefSys, [{ role:'user', content:'Generate the brief now. Remember: EXACTLY 2 short sentences.' }], 160, 'home_brief');
      const parsed = JSON.parse(raw.replace(/\`\`\`json|\`\`\`/g,'').trim());
      const hero  = parsed.hero  ?? `${dateLabel}.`;
      const chips = parsed.chips ?? ["What's on today", "Check the list", "Anything urgent"];

      cachedBriefText = JSON.stringify({ hero, chips });
      setBriefHero(hero);
      setBriefChips(chips);
      // Store for lavender brief card
      setChatBriefText(hero);
      setChatBriefChips(chips);

      // Also push a brief detail message into the chat thread
      // This is the secondary line + chips that appear below the card stack
      // Keep it short — the hero says the important thing, this offers to help
      const detailSys = `You are Zaeli. Rich just saw this brief: "${hero}"
Write ONE warm follow-up sentence (max 10 words) offering to help with the most urgent thing.
Never start with "I". Never say "mate". Not hollow — be specific to the brief.
Then 3 chips (3-5 words each, action-oriented).
Return ONLY JSON: {"detail":"...","replies":["chip1","chip2","chip3"]}`;
      try {
        const detailRaw = await callGPT(detailSys, [{role:'user', content:'Generate.'}], 120, 'home_brief_detail');
        const detailParsed = JSON.parse(detailRaw.replace(/\`\`\`json|\`\`\`/g,'').trim());
        addMsg({
          role: 'zaeli',
          text: detailParsed.detail ?? '',
          isBrief: true,
          isLoading: false,
          quickReplies: detailParsed.replies ?? chips,
        });
      } catch {
        // Fallback — use chips from brief as quick replies, no detail text
        addMsg({ role:'zaeli', text:'', isBrief:true, isLoading:false, quickReplies:chips });
      }

      // After cards stagger in, drop the post-card prompt
      setTimeout(() => {
        generatePostCardPrompt();
      }, 900);

    } catch (e) {
      console.error('Brief error:', e);
      setBriefHero(`${dateLabel}.`);
      setBriefChips(["What's on today", "Check the list", "Anything urgent"]);
    }
  }

  // ── Post-card Zaeli prompt — drops after cards stagger in ─────────────────
  async function generatePostCardPrompt() {
    if (messages.length > 0) return; // only on cold open
    try {
      // Quick contextual GPT-mini call — targeted 1-line follow-up
      const today = localDateStr();
      const [todosRes, remindersRes] = await Promise.all([
        supabase.from('todos').select('title,priority,due_date').eq('family_id',FAMILY_ID).eq('status','active').limit(3),
        supabase.from('reminders').select('title').eq('family_id',FAMILY_ID).eq('status','active').lte('remind_at', new Date(Date.now()+24*60*60*1000).toISOString()).limit(2),
      ]);
      const urgent = (todosRes.data??[]).filter((t:any) => t.due_date && t.due_date <= today);
      const reminders = remindersRes.data ?? [];
      const hasUrgent = urgent.length > 0 || reminders.length > 0;

      const promptSys = `You are Zaeli — sharp, warm AI for Rich's Australian family.
After showing Rich his morning cards, you ask one short follow-up.
${hasUrgent ? `There are ${urgent.length} overdue/due-today items and ${reminders.length} active reminders.` : 'Everything looks calm.'}

Write ONE short conversational line (max 12 words). Warm but not hollow. Then return 3 chips.
${hasUrgent ? 'Offer to help with the most pressing thing.' : 'Offer to help plan, add, or check something.'}
Never start with "I". Never say "mate". No hollow phrases like "How can I help today?"

Return ONLY JSON: {"line":"...","chips":["chip1","chip2","chip3"]}`;

      const raw = await callGPT(promptSys, [{role:'user', content:'Generate.'}], 150, 'home_post_card');
      const parsed = JSON.parse(raw.replace(/\`\`\`json|\`\`\`/g,'').trim());
      addMsg({
        role: 'zaeli',
        text: parsed.line ?? 'What would you like to tackle first?',
        isLoading: false,
        quickReplies: parsed.chips ?? ["What's most urgent", "Check the calendar", "What's for dinner"],
      });
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);
    } catch {
      addMsg({
        role: 'zaeli',
        text: 'What would you like to tackle first?',
        isLoading: false,
        quickReplies: ["What's most urgent", "Check the calendar", "What's for dinner"],
      });
    }
  }

  // ── Refresh calendar events ────────────────────────────────────────────────
  const refreshCalendarEvents = useCallback(async () => {
    setMessages(prev => {
      const hasCal = prev.some(m => m.inlineData?.type==='calendar' && (m.inlineData.items?.length??0)>0);
      if (!hasCal) return prev;
      const allIds = prev.flatMap(m => m.inlineData?.type==='calendar' ? (m.inlineData.items??[]) : []).map((e:any) => e.id).filter(Boolean);
      if (allIds.length === 0) return prev;
      supabase.from('events').select('id,title,date,start_time,end_time,notes,assignees,all_day').in('id', allIds)
        .then(({ data }) => {
          if (!data || data.length === 0) return;
          const byId: Record<string,any> = {};
          data.forEach((e:any) => { byId[e.id] = e; });
          setMessages(current => current.map(m => {
            if (m.inlineData?.type!=='calendar' || !m.inlineData.items || m.inlineData.items.length===0) return m;
            const updated = m.inlineData.items.map((e:any) => byId[e.id] ?? e);
            const filtered = updated.filter((e:any) => byId[e.id]);
            return { ...m, inlineData:{ ...m.inlineData, items:filtered.length>0?filtered:undefined } };
          }));
        }).catch(() => {});
      return prev;
    });
    // Also refresh card data
    loadCardData();
  }, [loadCardData]);

  // ── useFocusEffect ────────────────────────────────────────────────────────
  useFocusEffect(useCallback(() => {
    // Refresh card data every time we come back to Home
    loadCardData();

    // ── Check for Dashboard → Chat context ───────────────────────────────
    const ctx = getPendingChatContext();
    if (ctx.type) {
      clearPendingChatContext();
      setReturnToDashboard(ctx.returnTo === 'dashboard');
      // Ensure we're in chat screen
      setScreen('chat'); chatOpacity.setValue(1); entryOpacity.setValue(0);

      if (ctx.type === 'edit_event' && ctx.event) {
        const ev = ctx.event;
        // Build a human-readable time string
        const dayName = ev.date
          ? new Date(ev.date+'T00:00:00').toLocaleDateString('en-AU', { weekday:'long' })
          : '';
        const timeStr = fmtTime(ev.start_time);
        const prompt = `${ev.title}${dayName ? ` — ${dayName}` : ''}${timeStr ? ` at ${timeStr}` : ''}. What would you like to change?`;

        // Inject event as inline card + Zaeli prompt with chips
        const calCard: Msg = {
          id: uid(), role:'zaeli', text:'', ts:nowTs(),
          inlineData: { type:'calendar', items:[ev], tomorrowItems:[] },
        };
        const zaeliMsg: Msg = {
          id: uid(), role:'zaeli', text:prompt, ts:nowTs(), isLoading:false,
          quickReplies: ['Move the time', 'Add someone', 'Change location', 'Cancel it', 'Manual edit'],
        };
        setMessages(prev => {
          const withoutOldCal = prev.filter(m => m.inlineData?.type !== 'calendar');
          return [...withoutOldCal, calCard, zaeliMsg];
        });
        // Pre-load keyboard
        setTimeout(() => {
          scrollRef.current?.scrollToEnd({ animated:true });
          inputRef.current?.focus();
        }, 350);
        return;
      }

      if (ctx.type === 'add_event') {
        const zaeliMsg: Msg = {
          id: uid(), role:'zaeli', text:"What's the event? Just tell me what, when, and who's going.", ts:nowTs(), isLoading:false,
          quickReplies: ['Today', 'Tomorrow', 'This week', 'For the kids'],
        };
        setMessages(prev => [...prev, zaeliMsg]);
        setTimeout(() => {
          scrollRef.current?.scrollToEnd({ animated:true });
          inputRef.current?.focus();
        }, 350);
        return;
      }

      if ((ctx.type as string) === 'noticed' && ctx.event) {
        const notice = (ctx.event as any).title as string;
        const zaeliMsg: Msg = {
          id: uid(), role:'zaeli',
          text: notice,
          ts: nowTs(), isLoading: false,
          quickReplies: ['Tell me more', 'What should I do?', 'Remind me later'],
        };
        setMessages(prev => [...prev, zaeliMsg]);
        setTimeout(() => {
          scrollRef.current?.scrollToEnd({ animated:true });
          inputRef.current?.focus();
        }, 350);
        return;
      }

      if (ctx.type === 'shopping') {
        const zaeliMsg: Msg = {
          id: uid(), role:'zaeli',
          text: "What needs to go on the list?",
          ts: nowTs(), isLoading: false,
          quickReplies: ['Add a few things', 'Scan a receipt', 'Weekly essentials', 'Open Shopping List'],
        };
        setMessages(prev => [...prev, zaeliMsg]);
        setTimeout(() => {
          scrollRef.current?.scrollToEnd({ animated:true });
          inputRef.current?.focus();
        }, 350);
        return;
      }

      if ((ctx.type as string) === 'shopping_sheet') {
        setScreen('chat'); chatOpacity.setValue(1); entryOpacity.setValue(0);
        setTimeout(() => setShopSheetOpen(true), 300);
        return;
      }

      if ((ctx.type as string) === 'calendar_sheet') {
        setScreen('chat'); chatOpacity.setValue(1); entryOpacity.setValue(0);
        setTimeout(() => openCalSheet((ctx.event as any)?.tab || 'today'), 300);
        return;
      }

      if (ctx.type === 'actions') {
        const todo = ctx.event as any;
        let prompt: string;
        let chips: string[];
        if (todo?.title) {
          const dueStr = todo.due_date
            ? ` · due ${new Date(todo.due_date+'T00:00:00').toLocaleDateString('en-AU', { weekday:'short', day:'numeric', month:'short' })}`
            : '';
          prompt = `"${todo.title}"${dueStr} — what would you like to do with this one?`;
          chips = ['Change the due date', 'Reassign it', 'Mark as urgent', 'Break it into steps', 'Open To-dos'];
        } else {
          prompt = "What needs to go on the list?";
          chips = ["Something for me", "For the family", "Set a reminder", "Open To-dos"];
        }
        const zaeliMsg: Msg = {
          id: uid(), role:'zaeli', text:prompt, ts:nowTs(), isLoading:false,
          quickReplies: chips,
        };
        setMessages(prev => [...prev, zaeliMsg]);
        setTimeout(() => {
          scrollRef.current?.scrollToEnd({ animated:true });
          inputRef.current?.focus();
        }, 350);
        return;
      }

      if (ctx.type === 'meals' && ctx.event) {
        const { meal, dayAbbr } = ctx.event as { meal:any|null; dateKey:string; dayAbbr:string };
        const dayLabel = dayAbbr ?? 'that night';
        let prompt: string;
        let chips: string[];
        if (meal) {
          prompt = `${meal.meal_name} is on for ${dayLabel} — what would you like to do with it?`;
          chips = ['Change the meal', 'Move to another night', 'Add to shopping list', 'Find a similar recipe', 'Open Meal Planner'];
        } else {
          prompt = `${dayLabel} is wide open for dinner — what are you thinking?`;
          chips = ["Something quick", "Surprise me", "Use what's in the fridge", "Family favourite", 'Open Meal Planner'];
        }
        const zaeliMsg: Msg = {
          id: uid(), role:'zaeli', text:prompt, ts:nowTs(), isLoading:false,
          quickReplies: chips,
        };
        setMessages(prev => [...prev, zaeliMsg]);
        setTimeout(() => {
          scrollRef.current?.scrollToEnd({ animated:true });
          inputRef.current?.focus();
        }, 350);
        return;
      }
    }

    if (params.autoMic === 'true') {
      const t = setTimeout(() => { startRecording(); }, 800);
      return () => clearTimeout(t);
    }
    if (params.calendarScan === 'true') {
      const imgUri = getPendingCalendarImage();
      if (imgUri && handledScanRef.current !== imgUri) {
        handledScanRef.current = imgUri;
        setPendingCalendarImage(null);
        const t = setTimeout(() => {
          setScreen('chat'); chatOpacity.setValue(1); entryOpacity.setValue(0);
          setLoading(false);
          setTimeout(() => { send('Please help add this to the calendar.', imgUri); }, 200);
        }, 500);
        return () => clearTimeout(t);
      }
    }
    if (params.seedMessage) {
      const msg = params.seedMessage as string;
      const t = setTimeout(() => {
        const uMsg: Msg = { id:uid(), role:'user', text:msg, ts:nowTs() };
        setMessages(prev => [...prev, uMsg]);
        setScreen('chat'); chatOpacity.setValue(1); entryOpacity.setValue(0);
        const replyId = uid();
        setMessages(prev => [...prev, { id:replyId, role:'zaeli', text:'', isLoading:true, ts:nowTs() }]);
        const sysPrompt = `You are Zaeli, warm Australian family assistant. Rich said: "${msg}". Reply in 1 sentence. Give 3 short quick reply chips. Return ONLY JSON: {"main":"...","replies":["...","...","..."]}`;
        callGPT(sysPrompt, [{ role:'user', content:msg }], 200, 'calendar_context')
          .then(raw => {
            try {
              const parsed = JSON.parse(raw.replace(/```json|```/g,'').trim());
              updateMsg(replyId, { text:parsed.main??raw, isLoading:false, quickReplies:parsed.replies });
            } catch { updateMsg(replyId, { text:raw, isLoading:false }); }
          })
          .catch(() => updateMsg(replyId, { text:"Ready — what would you like to add?", isLoading:false }));
      }, 400);
      return () => clearTimeout(t);
    }
    if (screen !== 'chat') return;
    const elapsed = lastBriefTime ? Date.now() - lastBriefTime : Infinity;
    if (elapsed > 30*60*1000 && messages.length > 0) {
      setMessages([]);
      lastImageDesc.current = '';
      splashOpacity.setValue(1); entryOpacity.setValue(0); chatOpacity.setValue(0);
      starScale.setValue(0.4); wordmarkOpacity.setValue(0);
      setScreen('splash');
      Animated.spring(starScale, { toValue:1, useNativeDriver:true, tension:60, friction:8 }).start();
      setTimeout(() => Animated.timing(wordmarkOpacity, { toValue:1, duration:500, useNativeDriver:true }).start(), 250);
      setTimeout(() => {
        Animated.timing(splashOpacity, { toValue:0, duration:400, useNativeDriver:true })
          .start(() => { setScreen('chat'); chatOpacity.setValue(1); generateBrief(true); });
      }, 3000);
    } else {
      refreshCalendarEvents();
    }
  }, [params.autoMic, params.seedMessage]));

  // ── isActive context check (fires when swipe-world scrolls to chat page) ──
  const prevIsActive = useRef(false);
  useEffect(() => {
    const justBecameActive = isActive && !prevIsActive.current;
    prevIsActive.current = isActive;
    console.log('CHAT: isActive =', isActive, 'justBecameActive =', justBecameActive);
    if (!justBecameActive) return;
    const ctx = getPendingChatContext();
    console.log('CHAT: pending context =', ctx.type);
    if (!ctx.type) return;
    clearPendingChatContext();
    console.log('CHAT: processing context type =', ctx.type);
    setReturnToDashboard(ctx.returnTo === 'dashboard');
    setScreen('chat'); chatOpacity.setValue(1); entryOpacity.setValue(0);

    if (ctx.type === 'edit_event' && ctx.event) {
      const ev = ctx.event;
      const dayName = ev.date
        ? new Date(ev.date+'T00:00:00').toLocaleDateString('en-AU', { weekday:'long' })
        : '';
      const timeStr = fmtTime(ev.start_time);
      const prompt = `${ev.title}${dayName ? ` \u2014 ${dayName}` : ''}${timeStr ? ` at ${timeStr}` : ''}. What would you like to change?`;
      const calCard: Msg = {
        id: uid(), role:'zaeli', text:'', ts:nowTs(),
        inlineData: { type:'calendar', items:[ev], tomorrowItems:[] },
      };
      const zaeliMsg: Msg = {
        id: uid(), role:'zaeli', text:prompt, ts:nowTs(), isLoading:false,
        quickReplies: ['Move the time', 'Add someone', 'Change location', 'Cancel it', 'Manual edit'],
      };
      setMessages(prev => {
        const withoutOldCal = prev.filter(m => m.inlineData?.type !== 'calendar');
        return [...withoutOldCal, calCard, zaeliMsg];
      });
      setTimeout(() => { scrollRef.current?.scrollToEnd({ animated:true }); }, 350);
      return;
    }

    if (ctx.type === 'add_event') {
      const zaeliMsg: Msg = {
        id: uid(), role:'zaeli', text:"What's the event? Just tell me what, when, and who's going.", ts:nowTs(), isLoading:false,
        quickReplies: ['Today', 'Tomorrow', 'This week', 'For the kids'],
      };
      setMessages(prev => [...prev, zaeliMsg]);
      setTimeout(() => { scrollRef.current?.scrollToEnd({ animated:true }); }, 350);
      return;
    }

    if ((ctx.type as string) === 'noticed' && ctx.event) {
      const notice = (ctx.event as any).title as string;
      const zaeliMsg: Msg = {
        id: uid(), role:'zaeli',
        text: notice,
        ts: nowTs(), isLoading: false,
        quickReplies: ['Tell me more', 'What should I do?', 'Remind me later'],
      };
      setMessages(prev => [...prev, zaeliMsg]);
      setTimeout(() => { scrollRef.current?.scrollToEnd({ animated:true }); }, 350);
      return;
    }

    if (ctx.type === 'shopping') {
      const zaeliMsg: Msg = {
        id: uid(), role:'zaeli',
        text: "What needs to go on the list?",
        ts: nowTs(), isLoading: false,
        quickReplies: ['Add a few things', 'Scan a receipt', 'Weekly essentials', 'Open Shopping List'],
      };
      setMessages(prev => [...prev, zaeliMsg]);
      setTimeout(() => { scrollRef.current?.scrollToEnd({ animated:true }); }, 350);
      return;
    }

    if ((ctx.type as string) === 'shopping_sheet') {
      setScreen('chat'); chatOpacity.setValue(1); entryOpacity.setValue(0);
      setTimeout(() => setShopSheetOpen(true), 300);
      return;
    }

    if ((ctx.type as string) === 'calendar_sheet') {
      setScreen('chat'); chatOpacity.setValue(1); entryOpacity.setValue(0);
      setTimeout(() => openCalSheet((ctx.event as any)?.tab || 'today'), 300);
      return;
    }

    if (ctx.type === 'actions') {
      const todo = ctx.event as any;
      let prompt: string;
      let chips: string[];
      if (todo?.title) {
        const dueStr = todo.due_date
          ? ` \u00b7 due ${new Date(todo.due_date+'T00:00:00').toLocaleDateString('en-AU', { weekday:'short', day:'numeric', month:'short' })}`
          : '';
        prompt = `"${todo.title}"${dueStr} \u2014 what would you like to do with this one?`;
        chips = ['Change the due date', 'Reassign it', 'Mark as urgent', 'Break it into steps', 'Open To-dos'];
      } else {
        prompt = "What needs to go on the list?";
        chips = ["Something for me", "For the family", "Set a reminder", "Open To-dos"];
      }
      const zaeliMsg: Msg = {
        id: uid(), role:'zaeli', text:prompt, ts:nowTs(), isLoading:false,
        quickReplies: chips,
      };
      setMessages(prev => [...prev, zaeliMsg]);
      setTimeout(() => { scrollRef.current?.scrollToEnd({ animated:true }); }, 350);
      return;
    }

    if (ctx.type === 'meals' && ctx.event) {
      const { meal, dayAbbr } = ctx.event as { meal:any|null; dateKey:string; dayAbbr:string };
      const dayLabel = dayAbbr ?? 'that night';
      let prompt: string;
      let chips: string[];
      if (meal) {
        prompt = `${meal.meal_name} is on for ${dayLabel} \u2014 what would you like to do with it?`;
        chips = ['Change the meal', 'Move to another night', 'Add to shopping list', 'Find a similar recipe', 'Open Meal Planner'];
      } else {
        prompt = `${dayLabel} is wide open for dinner \u2014 what are you thinking?`;
        chips = ["Something quick", "Surprise me", "Use what's in the fridge", "Family favourite", 'Open Meal Planner'];
      }
      const zaeliMsg: Msg = {
        id: uid(), role:'zaeli', text:prompt, ts:nowTs(), isLoading:false,
        quickReplies: chips,
      };
      setMessages(prev => [...prev, zaeliMsg]);
      setTimeout(() => { scrollRef.current?.scrollToEnd({ animated:true }); }, 350);
      return;
    }
  }, [isActive]);

  // ── Handle FAB mic transcript from dashboard/myspace ──
  useEffect(() => {
    if (!pendingMicText || !isActive) return;
    const txt = pendingMicText;
    onMicTextConsumed?.();
    // Let the page scroll fully settle before sending
    setTimeout(() => {
      setScreen('chat'); chatOpacity.setValue(1); entryOpacity.setValue(0);
      send(txt);
    }, 600);
  }, [pendingMicText, isActive]);

  function handleQuickReply(chip: string) {
    if (chip === 'Open Meal Planner') {
      // TODO: open Meal Planner sheet when built
      send('Show me the meal plan for this week');
      return;
    }
    if (chip === 'Open Shopping List') {
      setShopSheetOpen(true);
      return;
    }
    if (chip === 'Open To-dos') {
      // TODO: open Family Tasks sheet when built
      send('Show me my tasks');
      return;
    }
    if (chip === 'Open Goals') {
      // TODO: swipe to My Space + open goals sheet
      send('Show me my goals');
      return;
    }
    send(chip);
  }

  // ── Send ───────────────────────────────────────────────────────────────────
  async function send(overrideText?: string, overrideImage?: string) {
    const text = (overrideText ?? input).trim();
    const imageUri = overrideImage || pendingImage || undefined;
    if ((!text && !imageUri) || loading) return;
    const sendKey = `${text}|${imageUri||''}|${Date.now().toString().slice(0,-3)}`;
    if (lastSendRef.current === sendKey) return;
    lastSendRef.current = sendKey;
    const uMsg: Msg = { id:uid(), role:'user', text:text||'', imageUri, ts:nowTs() };
    const history = [...messages, uMsg];
    setMessages(history); setInput(''); setPendingImage(null);
    if (returnToDashboard) setReturnToDashboard(false);
    isAtBottom.current = true; // force scroll-to-bottom tracking
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated:true }), 50);
    const replyId = addMsg({ role:'zaeli', text:'', isLoading:true });
    setLoading(true);
    // Aggressive scroll — thinking dots MUST be visible above keyboard
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated:false }), 100);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated:false }), 250);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated:true }), 500);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated:true }), 800);
    try {
      const { system, td } = await buildContext();

      // Read image
      let imageBase64 = '';
      let imageMimeType = 'image/jpeg';
      if (imageUri) {
        try {
          const ext = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
          const mimeMap: Record<string,string> = { jpg:'image/jpeg', jpeg:'image/jpeg', png:'image/png', heic:'image/jpeg', heif:'image/jpeg' };
          imageBase64 = await FileSystem.readAsStringAsync(imageUri, { encoding:'base64' as any });
          imageMimeType = mimeMap[ext] || 'image/jpeg';
        } catch(e) { console.error('[send] Image read FAILED:', e); }
      }

      // Vision describe
      let imageDescription = '';
      if (imageUri && imageBase64) {
        try {
          const claudeKey = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? '';
          const descRes = await fetch('https://api.anthropic.com/v1/messages', {
            method:'POST',
            headers:{ 'Content-Type':'application/json', 'x-api-key':claudeKey, 'anthropic-version':'2023-06-01' },
            body:JSON.stringify({
              model:'claude-sonnet-4-20250514', max_tokens:300,
              messages:[{ role:'user', content:[
                { type:'image', source:{ type:'base64', media_type:imageMimeType, data:imageBase64 } },
                { type:'text', text:'Describe this image in 2 sentences. Focus on any text, dates, times, or event names visible.' },
              ]}],
            }),
          });
          const descJson = await descRes.json();
          imageDescription = descJson?.content?.[0]?.text || '';
          lastImageDesc.current = imageDescription;
          logVision(descJson?.usage?.input_tokens??0, descJson?.usage?.output_tokens??0);
        } catch(e) { console.log('Vision describe failed:', e); }
      } else if (lastImageDesc.current) {
        imageDescription = lastImageDesc.current;
      }

      const imgCtx = imageDescription ? `\nIMAGE CONTEXT: ${imageDescription}` : '';

      // Calendar query path
      const calQuery = isCalendarQuery(text);
      if (!imageUri && text && calQuery) {
        if (isFullCalendarRequest(text)) {
          const { eventsRaw } = await fetchEventsForContext(2);
          const today2 = localDateStr();
          const tomorrow2 = localDateStr(new Date(Date.now() + 86400000));
          const todayEvents2 = eventsRaw.filter((e:any) => e.date === today2);
          const tomorrowEvents2 = eventsRaw.filter((e:any) => e.date === tomorrow2);
          const showEvents = todayEvents2.length > 0 ? todayEvents2 : tomorrowEvents2;
          const dayLabel2 = todayEvents2.length > 0 ? 'today' : 'tomorrow';
          const intro = showEvents.length > 0
            ? `Here's what's on ${dayLabel2} — tap any event for details, or head to Calendar for the full picture.`
            : `Nothing on for today or tomorrow. The Calendar channel has the full view.`;
          updateMsg(replyId, {
            text:intro,
            inlineData:{ type:'calendar', intro, items:showEvents.slice(0,5), followUp:'', showPortalPill:true },
            quickReplies:["What's on this week", 'Add an event', "What's coming up"],
            isLoading:false,
          });
          setLoading(false);
          return;
        }

        const fetchDays = getEventFetchDays(text);
        const { eventsJson, eventsRaw } = await fetchEventsForContext(fetchDays);
        const calSys = `${system}${imgCtx}

CALENDAR DATA (next ${fetchDays} days):
${eventsJson}

Answer the user's calendar question using the data above. Be warm and specific. Reference names and times.
Return ONLY valid JSON: {"intro":"[1 sentence intro]","events":[{"id":"...","title":"...","date":"...","start_time":"...","end_time":"...","notes":"...","assignees":[...]}],"followUp":"[1 sentence follow-up or empty]","showCalendarPill":true,"replies":["action chip 1","action chip 2","action chip 3"]}
Only include events directly relevant to the question. Max 5 events.`;
        const raw = await callGPT(calSys, [{ role:'user', content:text }], 500, 'home_calendar');
        try {
          const parsed = JSON.parse(raw.replace(/```json|```/g,'').trim());
          const eventIds: string[] = (parsed.events||[]).map((e:any) => e.id).filter(Boolean);
          const richEvents = eventsRaw.filter((e:any) => eventIds.includes(e.id));
          updateMsg(replyId, {
            text:parsed.intro||'',
            inlineData:{ type:'calendar', intro:parsed.intro||'', items:richEvents, followUp:parsed.followUp||'', showPortalPill:!!parsed.showCalendarPill },
            quickReplies:parsed.replies||[],
            isLoading:false,
          });
        } catch {
          updateMsg(replyId, { text:raw, isLoading:false });
        }
        setLoading(false);
        return;
      }

      // Action / tool-calling path — also forced when user is in add/edit-with-Zaeli flow
      // Also force tools when a shopping inline card is visible — chips like "Milk and eggs" need tool routing
      const hasShoppingCardInChat = messages.some(m => m.inlineData?.type === 'shopping');
      const isShoppingContext = hasShoppingCardInChat && !isCalendarQuery(text) && !!text;
      if (isActionQuery(text) || imageUri || pendingCalendarAdd.current || isShoppingContext) {
        pendingCalendarAdd.current = false; // clear flag — one-shot
        const anthropicKey = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? '';
        if (!anthropicKey) { updateMsg(replyId, { text:'No API key configured.', isLoading:false }); setLoading(false); return; }

        const toolSys = `${system}${imgCtx}\n\n${CAPABILITY_RULES}`;
        const apiMessages: any[] = [];
        history.slice(-6).forEach(m => {
          if (m.role === 'user') {
            if (m.imageUri && imageBase64 && m.id === uMsg.id) {
              apiMessages.push({ role:'user', content:[
                { type:'image', source:{ type:'base64', media_type:imageMimeType, data:imageBase64 } },
                { type:'text', text:m.text || 'Please help with this image.' },
              ]});
            } else {
              apiMessages.push({ role:'user', content:m.text || '(no text)' });
            }
          } else if (!m.isLoading && m.text) {
            apiMessages.push({ role:'assistant', content:m.text });
          }
        });

        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method:'POST',
          headers:{ 'Content-Type':'application/json', 'x-api-key':anthropicKey, 'anthropic-version':'2023-06-01' },
          body:JSON.stringify({ model:'claude-sonnet-4-20250514', max_tokens:800, system:toolSys, tools:TOOLS, messages:apiMessages }),
        });
        const data = await response.json();
        const inTok = data?.usage?.input_tokens ?? 0;
        const outTok = data?.usage?.output_tokens ?? 0;
        const claudeCost = (inTok/1_000_000*CLAUDE_IN_PER_M) + (outTok/1_000_000*CLAUDE_OUT_PER_M);
        logApiCall({ family_id:FAMILY_ID, feature:'home_chat', model:'claude-sonnet-4-20250514', input_tokens:inTok, output_tokens:outTok, cost_usd:claudeCost });

        const toolUses = (data.content||[]).filter((b:any) => b.type==='tool_use');
        if (toolUses.length > 0) {
          const toolResults: string[] = [];
          for (const tu of toolUses) {
            const result = await executeTool(tu.name, tu.input);
            toolResults.push(result);
          }
          const toolResultContent = toolUses.map((tu:any, i:number) => ({
            type:'tool_result', tool_use_id:tu.id, content:toolResults[i]
          }));
          const followUp = await fetch('https://api.anthropic.com/v1/messages', {
            method:'POST',
            headers:{ 'Content-Type':'application/json', 'x-api-key':anthropicKey, 'anthropic-version':'2023-06-01' },
            body:JSON.stringify({ model:'claude-sonnet-4-20250514', max_tokens:300, system:toolSys, tools:TOOLS, messages:[...apiMessages, { role:'assistant', content:data.content }, { role:'user', content:toolResultContent }] }),
          });
          const followData = await followUp.json();
          const followText = followData.content?.find((b:any) => b.type==='text')?.text ?? toolResults.join('\n');

          // For add_calendar_event — fetch the newly created event and inject as inline card
          const addTool = toolUses.find((tu:any) => tu.name === 'add_calendar_event');
          if (addTool && !toolResults[toolUses.indexOf(addTool)].startsWith('TOOL_FAILED')) {
            try {
              const today = localDateStr();
              const rawStart = (addTool.input.start_time || '').replace('Z','').split('+')[0];
              const dateOnly = rawStart.includes('T') ? rawStart.split('T')[0] : today;
              const { data: newEvData } = await supabase.from('events')
                .select('id,title,date,start_time,end_time,assignees,notes')
                .eq('family_id', FAMILY_ID)
                .ilike('title', `%${addTool.input.title}%`)
                .eq('date', dateOnly)
                .order('created_at', { ascending: false })
                .limit(1);
              if (newEvData && newEvData.length > 0) {
                const confirmCard: Msg = {
                  id: uid(), role: 'zaeli', text: '', ts: nowTs(),
                  inlineData: { type: 'calendar', items: [newEvData[0]], tomorrowItems: [] },
                };
                setMessages(prev => {
                  // Replace the loading reply with confirmation card + text
                  return prev.map(m => m.id === replyId
                    ? { ...m, text: followText, isLoading: false }
                    : m
                  ).concat([confirmCard]);
                });
                loadCardData();
                refreshCalendarEvents();
                setLoading(false);
                setTimeout(() => scrollRef.current?.scrollToEnd({ animated:true }), 150);
                return;
              }
            } catch { /* fallback to normal flow */ }
          }

          updateMsg(replyId, { text:followText, isLoading:false });
          // Refresh card data + inline calendar cards after any tool action
          loadCardData();
          refreshCalendarEvents();
          // If shopping item was added — re-fetch and re-inject fresh inline card
          const shopAddTool = toolUses.find((tu:any) => tu.name === 'add_shopping_item');
          if (shopAddTool && !toolResults[toolUses.indexOf(shopAddTool)].startsWith('TOOL_FAILED')) {
            try {
              const [freshRes, freshCountRes] = await Promise.all([
                supabase.from('shopping_items').select('id,name,item,category,checked,meal_source').eq('family_id', FAMILY_ID).neq('checked', true).order('created_at', { ascending: false }).limit(4),
                supabase.from('shopping_items').select('*', { count: 'exact', head: true }).eq('family_id', FAMILY_ID).neq('checked', true),
              ]);
              const freshCard: Msg = {
                id: uid(), role: 'zaeli', text: '', ts: nowTs(),
                inlineData: { type: 'shopping', items: freshRes.data ?? [], tomorrowItems: [{ _count: freshCountRes.count ?? 0 }] },
              };
              setMessages(prev => {
                const withoutShop = prev.filter(m => m.inlineData?.type !== 'shopping');
                return [...withoutShop, freshCard];
              });
            } catch { /* silent */ }
          }
        } else {
          const reply = data.content?.find((b:any) => b.type==='text')?.text ?? 'Something went wrong — try again?';
          updateMsg(replyId, { text:reply, isLoading:false });
        }
        setLoading(false);
        return;
      }

      // General chat path
      const apiMsgs = history.slice(-8).map(m => ({
        role: m.role==='user' ? 'user' : 'assistant',
        content: m.text || '(no text)',
      }));
      const reply = await callGPT(system + imgCtx, apiMsgs, 400, 'home_chat');
      updateMsg(replyId, { text:reply, isLoading:false });
    } catch (e) {
      console.error('send error:', e);
      updateMsg(replyId, { text:"Something went wrong — try that again?", isLoading:false });
    } finally { setLoading(false); }
  }

  // ── Recording ─────────────────────────────────────────────────────────────
  async function startRecording() {
    try {
      Keyboard.dismiss();
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) return;
      await Audio.setAudioModeAsync({ allowsRecordingIOS:true, playsInSilentModeIOS:true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      recordingRef.current = recording;
      setIsRecording(true);
      setMicTimer(0);
      Animated.timing(micOverlayAnim, { toValue:1, duration:220, useNativeDriver:true }).start();
      micTimerRef.current = setInterval(() => setMicTimer(t => t+1), 1000);
      // Start waveform
      const loops = waveAnims.map((anim, i) =>
        Animated.loop(Animated.sequence([
          Animated.delay(i * 60),
          Animated.timing(anim, { toValue:1, duration:400+(i%4)*80, useNativeDriver:true }),
          Animated.timing(anim, { toValue:0.15, duration:400+(i%3)*80, useNativeDriver:true }),
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
      Animated.timing(micOverlayAnim, { toValue:0, duration:180, useNativeDriver:true }).start();
      if (!recordingRef.current) return;
      const status = await recordingRef.current.getStatusAsync();
      const durationSec = (status as any)?.durationMillis ? (status as any).durationMillis / 1000 : 10;
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      if (!uri || cancel) return;
      // Show thinking dots immediately while Whisper transcribes
      const voiceThinkId = uid();
      setMessages(prev => [...prev, { id:voiceThinkId, role:'zaeli', text:'', isLoading:true, ts:nowTs() }]);
      isAtBottom.current = true;
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated:false }), 50);
      const key = process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? '';
      if (!key) { setMessages(prev => prev.filter(m => m.id !== voiceThinkId)); return; }
      logWhisper(durationSec);
      const form = new FormData();
      form.append('file', { uri, type:'audio/m4a', name:'audio.m4a' } as any);
      form.append('model', 'whisper-1');
      const resp = await fetch(WHISPER_URL, { method:'POST', headers:{ Authorization:`Bearer ${key}` }, body:form });
      const data = await resp.json();
      const rawTranscript = data?.text?.trim() ?? '';
      const transcript = fixZaeliSpelling(rawTranscript);
      // Remove the voice thinking dots
      setMessages(prev => prev.filter(m => m.id !== voiceThinkId));
      if (!transcript) return;
      // If triggered from shop sheet mic button — parse and add as item
      if (shopMicMode.current) {
        shopMicMode.current = false;
        // Strip polite prefixes: "can you please add 7 apples" → "7 apples"
        const cleaned = transcript
          .replace(/^(can you (please )?|please |could you (please )?|add |I need |we need )/i, '')
          .replace(/^(to the (shopping |grocery )?list[,.]?\s*)/i, '')
          .trim();
        await shopAddItem(cleaned);
        setShopSheetOpen(true);
        return;
      }
      if (screen !== 'chat') { enterChat(transcript); } else { send(transcript); }
    } catch (e) { console.error('stopRecording:', e); }
  }
  function handleMicPress() { if (isRecording) stopRecording(); else startRecording(); }

  // ── Sheet ─────────────────────────────────────────────────────────────────
  // ── Calendar sheet open/data ──────────────────────────────────────────────
  async function openCalSheet(tab: 'today'|'tomorrow'|'month' = 'today') {
    const now = new Date();
    const today = localDateStr();
    const tomorrow = localDatePlusDays(1);
    // Reset state and open sheet IMMEDIATELY — don't wait for data
    setCalSheetMonthYear({ month: now.getMonth(), year: now.getFullYear() });
    setCalSheetSelDay(today);
    setCalSheetTab(tab);
    setCalSheetEditEv(null);
    setCalSheetOpen(true);

    // Fetch data in background — sheet shows loading state while this runs
    const [todRes, tomRes] = await Promise.all([
      supabase.from('events').select('id,title,date,start_time,end_time,assignees,notes,repeat_rule,reminder_minutes').eq('family_id', FAMILY_ID).eq('date', today).order('start_time').limit(20),
      supabase.from('events').select('id,title,date,start_time,end_time,assignees,notes,repeat_rule,reminder_minutes').eq('family_id', FAMILY_ID).eq('date', tomorrow).order('start_time').limit(20),
    ]);
    setCalSheetEvents(todRes.data ?? []);
    setCalSheetTomEvents(tomRes.data ?? []);
    setCalSheetDayEvs(todRes.data ?? []);

    // Fetch month dots separately (non-blocking)
    const monthStart = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`;
    const monthEnd   = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${new Date(now.getFullYear(), now.getMonth()+1, 0).getDate()}`;
    supabase.from('events').select('id,date,assignees').eq('family_id', FAMILY_ID).gte('date', monthStart).lte('date', monthEnd).limit(200)
      .then(({ data }) => setCalSheetMonthEvs(data ?? []));
  }

  async function fetchMonthDayEvents(dateStr: string) {
    setCalSheetSelDay(dateStr);
    const { data } = await supabase.from('events').select('id,title,date,start_time,end_time,assignees,notes').eq('family_id', FAMILY_ID).eq('date', dateStr).order('start_time').limit(20);
    setCalSheetDayEvs(data ?? []);
  }

  async function fetchMonthDots(month: number, year: number) {
    const monthStart = `${year}-${String(month+1).padStart(2,'0')}-01`;
    const monthEnd   = `${year}-${String(month+1).padStart(2,'0')}-${new Date(year, month+1, 0).getDate()}`;
    const { data } = await supabase.from('events').select('id,date,assignees').eq('family_id', FAMILY_ID).gte('date', monthStart).lte('date', monthEnd).limit(200);
    setCalSheetMonthEvs(data ?? []);
  }

  // ── Shopping sheet open / data ────────────────────────────────────────────
  async function openShopSheet(tab: 'list'|'pantry'|'spend' = 'list') {
    setShopSheetTab(tab);
    setShopSearchOpen(false);
    setShopSearchText('');
    setShopAisleMode(false);
    setShopPantryAisle(false);
    setShopDelConfirmId(null);
    setShopExpandedId(null);
    setShopSheetOpen(true); // open immediately

    // Fetch all data in background
    const today = localDateStr();
    const monthStart = today.slice(0, 7) + '-01';
    const [listRes, boughtRes, pantryRes, receiptsRes] = await Promise.all([
      supabase.from('shopping_items').select('id,name,item,category,checked,meal_source').eq('family_id', FAMILY_ID).neq('checked', true).order('created_at', { ascending: false }).limit(100),
      supabase.from('shopping_items').select('id,name,item,category,checked,meal_source,created_at').eq('family_id', FAMILY_ID).eq('checked', true).order('created_at', { ascending: false }).limit(30),
      supabase.from('pantry_items').select('id,name,emoji,last_bought,family_id').eq('family_id', FAMILY_ID).order('name').limit(100),
      supabase.from('receipts').select('id,store,purchase_date,total_amount,item_count,items').eq('family_id', FAMILY_ID).order('purchase_date', { ascending: false }).limit(20),
    ]);
    setShopSheetItems(listRes.data ?? []);
    setShopSheetBought(boughtRes.data ?? []);
    setShopSheetPantry(pantryRes.data ?? []);
    setShopSheetReceipts(receiptsRes.data ?? []);

    // Month spend totals
    const monthReceipts = (receiptsRes.data ?? []).filter((r: any) => (r.purchase_date || '') >= monthStart);
    setShopSheetMonthSpend(monthReceipts.reduce((sum: number, r: any) => sum + (r.total_amount || 0), 0));
    setShopSheetMonthShops(monthReceipts.length);
    setShopSheetMonthItems(monthReceipts.reduce((sum: number, r: any) => sum + (r.item_count || 0), 0));
  }

  async function openShopSheetToEdit(item: any) {
    // Open sheet list tab with that item already in edit mode
    await openShopSheet('list');
    setTimeout(() => {
      setShopEditText(item.name || item.item || '');
      setShopEditQty(item.meal_source || '');
      setShopEditingId(item.id);
      setShopExpandedId(null);
    }, 400); // wait for sheet data to load
  }

  async function refreshShopList() {
    const [listRes, boughtRes] = await Promise.all([
      supabase.from('shopping_items').select('id,name,item,category,checked,meal_source').eq('family_id', FAMILY_ID).neq('checked', true).order('created_at', { ascending: false }).limit(100),
      supabase.from('shopping_items').select('id,name,item,category,checked,meal_source,created_at').eq('family_id', FAMILY_ID).eq('checked', true).order('created_at', { ascending: false }).limit(30),
    ]);
    setShopSheetItems(listRes.data ?? []);
    setShopSheetBought(boughtRes.data ?? []);
    // Refresh inline card data too
    loadCardData();
  }

  async function shopMarkBought(item: any) {
    await supabase.from('shopping_items').update({ checked: true }).eq('id', item.id);
    // Sync food items to pantry last_bought
    const cat = item.category || guessCategory(item.name || item.item || '');
    if (FOOD_CATS.includes(cat)) {
      const name = (item.name || item.item || '').toLowerCase().trim();
      const { data: existing } = await supabase.from('pantry_items').select('id').eq('family_id', FAMILY_ID).ilike('name', name).limit(1);
      if (existing && existing.length > 0) {
        await supabase.from('pantry_items').update({ last_bought: localDateStr() }).eq('id', existing[0].id);
      } else {
        await supabase.from('pantry_items').insert({ family_id: FAMILY_ID, name: item.name || item.item, emoji: '🛒', last_bought: localDateStr() });
      }
    }
    refreshShopList();
  }

  async function shopAddItem(rawName: string, qty?: string) {
    if (!rawName.trim()) return;
    // Strip common qty prefix patterns: "3 apples" → name="Apples", qty="3"
    let itemName = rawName.trim();
    let itemQty  = qty || '';
    const qtyMatch = itemName.match(/^(\d+(?:\.\d+)?\s*(?:kg|g|L|ml|l|litre|litres|pack|packs|bag|bags|box|boxes|can|cans|loaf|loaves|bunch|bunches|bottle|bottles|tub|tubs|dozen|roll|rolls|sheet|sheets|x)?\s+)(.+)/i);
    if (qtyMatch && !itemQty) {
      itemQty  = qtyMatch[1].trim();
      itemName = qtyMatch[2].trim();
    }
    // Capitalise first letter
    itemName = itemName.charAt(0).toUpperCase() + itemName.slice(1);
    const cat = guessCategory(itemName);
    await supabase.from('shopping_items').insert({ family_id: FAMILY_ID, name: itemName, item: itemName, category: cat, meal_source: itemQty || null, checked: false });
    setShopAddInput('');
    refreshShopList();
  }

  async function shopDeleteItem(id: string) {
    await supabase.from('shopping_items').delete().eq('id', id);
    setShopDelConfirmId(null);
    setShopExpandedId(null);
    refreshShopList();
  }

  async function shopReAdd(item: any) {
    // Un-check an item from recently bought → moves back to active list
    await supabase.from('shopping_items').update({ checked: false }).eq('id', item.id);
    refreshShopList();
  }

  // Render a single shopping list item in the sheet (with expand/delete)
  function renderShopItem(item: any) {
    const isExpanded  = shopExpandedId === item.id;
    const isConfirm   = shopDelConfirmId === item.id;
    const isEditing   = shopEditingId === item.id;
    const cat = item.category || guessCategory(item.name || item.item || '');
    const emoji = getItemEmoji(item.name || item.item || '');

    return (
      <View key={item.id} style={{ backgroundColor:'#fff', borderRadius:14, marginBottom:8, overflow:'hidden' }}>
        {/* Main row */}
        <TouchableOpacity
          style={{ flexDirection:'row', alignItems:'center', gap:12, padding:14 }}
          onPress={() => {
            if (isEditing) return;
            setShopExpandedId(isExpanded ? null : item.id);
            setShopDelConfirmId(null);
            setShopEditingId(null);
          }}
          activeOpacity={0.75}
        >
          {/* Circle tick */}
          <TouchableOpacity
            onPress={() => shopMarkBought(item)}
            hitSlop={{ top:10, bottom:10, left:10, right:10 }}
            style={{ width:26, height:26, borderRadius:13, borderWidth:1.5, borderColor:'rgba(0,0,0,0.22)', flexShrink:0, alignItems:'center', justifyContent:'center' }}
            activeOpacity={0.75}
          />
          {/* Emoji */}
          <Text style={{ fontSize:22, flexShrink:0 }}>{emoji}</Text>
          {/* Name + category */}
          <View style={{ flex:1, minWidth:0 }}>
            <Text style={{ fontFamily:'Poppins_600SemiBold', fontSize:17, color:'#0A0A0A', lineHeight:22 }} numberOfLines={1}>{item.name || item.item}</Text>
            <Text style={{ fontFamily:'Poppins_400Regular', fontSize:13, color:'rgba(0,0,0,0.40)', marginTop:2 }}>{cat}</Text>
          </View>
          {/* Qty badge from meal_source */}
          {!!item.meal_source && (
            <View style={{ backgroundColor:'rgba(0,0,0,0.05)', borderRadius:8, paddingVertical:4, paddingHorizontal:10, flexShrink:0 }}>
              <Text style={{ fontFamily:'Poppins_600SemiBold', fontSize:12, color:'rgba(0,0,0,0.45)' }}>{item.meal_source}</Text>
            </View>
          )}
          {/* Bin icon */}
          <TouchableOpacity
            onPress={() => {
              if (isConfirm) { shopDeleteItem(item.id); }
              else { setShopDelConfirmId(item.id); setShopExpandedId(null); setShopEditingId(null); }
            }}
            style={{ width:34, height:34, alignItems:'center', justifyContent:'center', borderRadius:9, backgroundColor: isConfirm ? 'rgba(255,59,59,0.12)' : 'transparent', flexShrink:0 }}
            hitSlop={{ top:6, bottom:6, left:6, right:6 }}
            activeOpacity={0.75}
          >
            <Svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={isConfirm ? '#FF3B3B' : 'rgba(0,0,0,0.28)'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <Path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
            </Svg>
          </TouchableOpacity>
        </TouchableOpacity>

        {/* Inline edit form */}
        {isEditing && (
          <View style={{ backgroundColor:'rgba(80,32,192,0.04)', borderTopWidth:1, borderTopColor:'rgba(80,32,192,0.12)', padding:12, flexDirection:'row', alignItems:'center', gap:8 }}>
            <View style={{ flex:1, gap:6 }}>
              <TextInput
                autoFocus
                style={{ fontFamily:'Poppins_400Regular', fontSize:15, color:'#0A0A0A', backgroundColor:'#fff', borderRadius:10, borderWidth:1, borderColor:'rgba(80,32,192,0.25)', paddingHorizontal:12, paddingVertical:8 }}
                value={shopEditText}
                onChangeText={setShopEditText}
                placeholder="Item name"
                placeholderTextColor="rgba(0,0,0,0.28)"
                returnKeyType="next"
              />
              <TextInput
                style={{ fontFamily:'Poppins_400Regular', fontSize:13, color:'#0A0A0A', backgroundColor:'#fff', borderRadius:10, borderWidth:1, borderColor:'rgba(80,32,192,0.15)', paddingHorizontal:12, paddingVertical:7 }}
                value={shopEditQty}
                onChangeText={setShopEditQty}
                placeholder="Qty (e.g. 2L, 500g, 1 bunch)"
                placeholderTextColor="rgba(0,0,0,0.28)"
                returnKeyType="done"
                onSubmitEditing={async () => {
                  if (!shopEditText.trim()) return;
                  await supabase.from('shopping_items').update({ name: shopEditText.trim(), item: shopEditText.trim(), meal_source: shopEditQty.trim() || null }).eq('id', item.id);
                  setShopEditingId(null); setShopEditText(''); setShopEditQty(''); refreshShopList();
                }}
              />
            </View>
            <View style={{ gap:6 }}>
              <TouchableOpacity
                onPress={async () => {
                  if (!shopEditText.trim()) return;
                  await supabase.from('shopping_items').update({ name: shopEditText.trim(), item: shopEditText.trim(), meal_source: shopEditQty.trim() || null }).eq('id', item.id);
                  setShopEditingId(null); setShopEditText(''); setShopEditQty(''); refreshShopList();
                }}
                style={{ backgroundColor: SHOP_ACCENT, borderRadius:10, paddingVertical:8, paddingHorizontal:14 }}
                activeOpacity={0.8}
              >
                <Text style={{ fontFamily:'Poppins_700Bold', fontSize:14, color:'#fff' }}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setShopEditingId(null); setShopEditText(''); setShopEditQty(''); }} style={{ paddingVertical:4, alignItems:'center' }} activeOpacity={0.7}>
                <Text style={{ fontFamily:'Poppins_600SemiBold', fontSize:13, color:'rgba(0,0,0,0.35)' }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Expanded panel */}
        {isExpanded && !isEditing && (
          <View style={{ backgroundColor:'rgba(0,0,0,0.025)', borderTopWidth:1, borderTopColor:'rgba(0,0,0,0.06)', padding:12, flexDirection:'row', alignItems:'center', justifyContent:'space-between' }}>
            <Text style={{ fontFamily:'Poppins_400Regular', fontSize:14, color:'rgba(0,0,0,0.45)' }}>{cat}</Text>
            <View style={{ flexDirection:'row', gap:8 }}>
              <TouchableOpacity
                onPress={() => { setShopEditText(item.name || item.item || ''); setShopEditQty(item.meal_source || ''); setShopEditingId(item.id); setShopExpandedId(null); }}
                style={{ backgroundColor:'rgba(80,32,192,0.08)', borderRadius:10, paddingVertical:8, paddingHorizontal:14 }}
                activeOpacity={0.75}
              >
                <Text style={{ fontFamily:'Poppins_600SemiBold', fontSize:14, color: SHOP_ACCENT }}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { setShopDelConfirmId(item.id); setShopExpandedId(null); }}
                style={{ backgroundColor:'rgba(255,59,59,0.08)', borderRadius:10, paddingVertical:8, paddingHorizontal:14 }}
                activeOpacity={0.75}
              >
                <Text style={{ fontFamily:'Poppins_600SemiBold', fontSize:14, color:'#FF3B3B' }}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Delete confirm */}
        {isConfirm && (
          <View style={{ backgroundColor:'rgba(255,59,59,0.04)', borderTopWidth:1, borderTopColor:'rgba(255,59,59,0.12)', padding:12, flexDirection:'row', alignItems:'center', justifyContent:'space-between' }}>
            <Text style={{ fontFamily:'Poppins_400Regular', fontSize:12, color:'#FF3B3B' }}>Tap 🗑 again to confirm</Text>
            <TouchableOpacity onPress={() => setShopDelConfirmId(null)} style={{ backgroundColor:'rgba(0,0,0,0.06)', borderRadius:9, paddingVertical:6, paddingHorizontal:13 }} activeOpacity={0.75}>
              <Text style={{ fontFamily:'Poppins_600SemiBold', fontSize:12, color:'rgba(0,0,0,0.45)' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  function handleSheetEditWithZaeli(ev: any) {
    setCalSheetOpen(false);
    setTimeout(() => {
      pendingCalendarAdd.current = true;
      const focusedCard: Msg = {
        id: uid(), role: 'zaeli', text: '', ts: nowTs(),
        inlineData: { type: 'calendar', items: [ev], tomorrowItems: [] },
      };
      const dayName = ev.date ? new Date(ev.date+'T00:00:00').toLocaleDateString('en-AU', { weekday:'long' }) : '';
      const zaeliPrompt: Msg = {
        id: uid(), role: 'zaeli',
        text: `${ev.title} — ${dayName} at ${fmtTime(ev.start_time)}. What would you like to change?`,
        ts: nowTs(), isLoading: false,
        quickReplies: ['Move the time', 'Add someone', 'Change location', 'Cancel it'],
      };
      setMessages(prev => [...prev, focusedCard, zaeliPrompt]);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated:true }), 150);
    }, 350);
  }

  function handleSheetAddWithZaeli() {
    setCalSheetOpen(false);
    setTimeout(() => {
      pendingCalendarAdd.current = true;
      const zaeliPrompt: Msg = {
        id: uid(), role: 'zaeli',
        text: "Love it — what's the event? Just tell me what, when, and who's going.",
        ts: nowTs(), isLoading: false,
        quickReplies: ["Dentist tomorrow 10am", "Duke's sports day Fri", "Date night Saturday"],
      };
      setMessages(prev => [...prev, zaeliPrompt]);
      setTimeout(() => { scrollRef.current?.scrollToEnd({ animated:true }); inputRef.current?.focus(); }, 150);
    }, 350);
  }

  function openSheet() {
    setShowAddSheet(true);
    Animated.spring(sheetAnim, { toValue:0, useNativeDriver:true, tension:65, friction:11 }).start();
  }
  function closeSheet(cb?: () => void) {
    Animated.timing(sheetAnim, { toValue:320, duration:200, useNativeDriver:true }).start(() => {
      setShowAddSheet(false); if (cb) setTimeout(cb, 350);
    });
  }
  async function openCamera() {
    closeSheet(async () => {
      try {
        const { granted } = await ImagePicker.requestCameraPermissionsAsync(); if (!granted) return;
        const r = await ImagePicker.launchCameraAsync({ mediaTypes:ImagePicker.MediaTypeOptions.Images, quality:0.85 });
        if (!r.canceled && r.assets?.[0]) setPendingImage(r.assets[0].uri);
      } catch {}
    });
  }
  async function openPhotos() {
    closeSheet(async () => {
      try {
        const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync(); if (!granted) return;
        const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes:ImagePicker.MediaTypeOptions.Images, quality:0.85 });
        if (!r.canceled && r.assets?.[0]) setPendingImage(r.assets[0].uri);
      } catch {}
    });
  }

  // ── Entry handlers ─────────────────────────────────────────────────────────
  const greeting = h < 12 ? 'Morning' : h < 17 ? 'Hey' : h < 21 ? 'Evening' : 'Hey';
  const greetingSub = h < 12 ? 'How can I help you today?'
    : h < 17 ? 'How can I help you this afternoon?'
    : h < 21 ? 'How can I help you tonight?'
    : 'What do you need before tomorrow?';

  async function handleEntryMicStart() {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) return;
      await Audio.setAudioModeAsync({ allowsRecordingIOS:true, playsInSilentModeIOS:true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      recordingRef.current = recording;
      setEntryRecording(true);
      const loops = waveAnims.map((anim, i) =>
        Animated.loop(Animated.sequence([
          Animated.delay(i * 60),
          Animated.timing(anim, { toValue:1, duration:400+(i%4)*80, useNativeDriver:true }),
          Animated.timing(anim, { toValue:0.15, duration:400+(i%3)*80, useNativeDriver:true }),
        ]))
      );
      waveLoopRef.current = Animated.parallel(loops);
      waveLoopRef.current.start();
    } catch (e) { console.error('entry mic start:', e); }
  }

  async function handleEntryMicStop() {
    waveLoopRef.current?.stop();
    waveAnims.forEach(a => a.setValue(0.3));
    setEntryProcessing(true);
    try {
      if (!recordingRef.current) { _finishEntry(); return; }
      const status = await recordingRef.current.getStatusAsync();
      const durationSec = (status as any)?.durationMillis ? (status as any).durationMillis / 1000 : 10;
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      if (!uri) { _finishEntry(); return; }
      const key = process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? '';
      if (!key) { _finishEntry(); return; }
      logWhisper(durationSec);
      const form = new FormData();
      form.append('file', { uri, type:'audio/m4a', name:'audio.m4a' } as any);
      form.append('model', 'whisper-1');
      const resp = await fetch(WHISPER_URL, { method:'POST', headers:{ Authorization:`Bearer ${key}` }, body:form });
      const data = await resp.json();
      const transcript = fixZaeliSpelling(data?.text?.trim() ?? '');
      _finishEntry(transcript);
    } catch (e) { console.error('entry mic stop:', e); _finishEntry(); }
  }

  function _finishEntry(transcript?: string) {
    Animated.parallel([
      Animated.timing(entryOpacity, { toValue:0, duration:300, useNativeDriver:true }),
      Animated.timing(chatOpacity,  { toValue:1, duration:400, useNativeDriver:true }),
    ]).start(() => {
      setEntryRecording(false); setEntryProcessing(false); setScreen('chat');
      if (transcript) {
        setTimeout(() => {
          const voiceMsg: Msg = { id:uid(), role:'user', text:transcript, isVoice:true, ts:nowTs() };
          setMessages([voiceMsg]);
          isAtBottom.current = true;
          const replyId = uid();
          setMessages(prev => [...prev, { id:replyId, role:'zaeli', text:'', isLoading:true, ts:nowTs() }]);
          setLoading(true);
          buildContext().then(({ system }) => {
            callGPT(system, [{ role:'user', content:transcript }], 500)
              .then(reply => { setMessages(prev => prev.map(m => m.id===replyId ? { ...m, text:reply, isLoading:false } : m)); })
              .catch(() => { setMessages(prev => prev.map(m => m.id===replyId ? { ...m, text:"Something went wrong — try that again?", isLoading:false } : m)); })
              .finally(() => setLoading(false));
          });
        }, 100);
      } else { generateBrief(true); }
    });
  }

  // ── renderMessages ─────────────────────────────────────────────────────────
  function renderMessages() {
    // Deduplicate by id before rendering — prevents React key collision warnings
    const seen = new Set<string>();
    const uniqueMessages = messages.filter(m => {
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });
    return uniqueMessages.map((msg, i) => {
      if (msg.role === 'user') {
        return (
          <View key={msg.id} style={[s.userMsgWrap, { marginTop:18 }]}>
            {msg.isVoice && (
              <View style={s.voiceLabel}>
                <IcoMic color={T.ink3}/>
                <Text style={[s.voiceLabelTxt, { color:T.ink3 }]}>Voice message</Text>
              </View>
            )}
            {msg.imageUri && <Image source={{ uri:msg.imageUri }} style={s.msgImage} resizeMode="cover"/>}
            {!!msg.text && (
              <View style={[s.userBubble, { backgroundColor:T.userBubble }]}>
                <Text style={[s.userMsgText, { color:T.userText }]}>{msg.text}</Text>
              </View>
            )}
            <View style={s.userIconRow}>
              <Text style={[s.msgTime, { color:T.ink3 }]}>{msg.ts}</Text>
              <TouchableOpacity style={s.iconBtn} onPress={() => handleCopy(msg.text)} activeOpacity={0.6}><IcoCopy color={T.ink3}/></TouchableOpacity>
              <TouchableOpacity style={s.iconBtn} onPress={() => handleForward(msg.text)} activeOpacity={0.6}><IcoForward color={T.ink3}/></TouchableOpacity>
            </View>
          </View>
        );
      }

      const prevMsg = i > 0 ? messages[i-1] : null;
      const showEyebrow = !prevMsg || prevMsg.role === 'user';
      const thumbState = thumbs[msg.id] || null;
      const hasCalendarInline = !msg.isLoading && msg.inlineData?.type === 'calendar';
      const hasShoppingInline = !msg.isLoading && msg.inlineData?.type === 'shopping';
      const hasOtherInline = !msg.isLoading && msg.inlineData?.type && msg.inlineData.type !== 'calendar' && msg.inlineData.type !== 'shopping' && ((msg.inlineData.items?.length ?? 0) > 0 || !!msg.inlineData.showPortalPill);
      const cleanText = msg.text ? msg.text.replace(/\[([^\]]+)\]/g, '$1') : '';
      const paragraphs = cleanText ? cleanText.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean) : [];
      const introText = msg.inlineData?.intro ?? '';
      const followUpText = msg.inlineData?.followUp ?? '';
      const introParagraphs = introText ? introText.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean) : [];
      const followUpParagraphs = followUpText ? followUpText.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean) : [];

      return (
        <View key={msg.id} style={[s.zaeliMsgWrap, !showEyebrow && { marginTop:6 }]}>
          {showEyebrow ? (
            <View style={s.zEyebrow}>
              <View style={[s.zStar, { backgroundColor:HOME_AI }]}>
                <Svg width="9" height="9" viewBox="0 0 16 16" fill={INK}><Path d="M8 1L9.5 6.5L15 8L9.5 9.5L8 15L6.5 9.5L1 8L6.5 6.5L8 1Z"/></Svg>
              </View>
              <Text style={[s.zName, { color:INK }]}>Zaeli</Text>
              <Text style={[s.zTs, { color:T.ink3 }]}>{msg.ts}</Text>
            </View>
          ) : (
            <Text style={[s.zTsOnly, { color:T.ink3 }]}>{msg.ts}</Text>
          )}

          {msg.isLoading ? (
            <TypingDots color={HOME_AI}/>
          ) : hasCalendarInline ? (
            <>
              {!!msg.text && paragraphs.map((p, pi) => (
                <Text key={pi} style={[s.zaeliMsgText, { color:T.ink, marginBottom:8 }]}>{p}</Text>
              ))}
              <InlineCalendarCard
                msgId={msg.id}
                todayEvents={msg.inlineData!.items ?? []}
                tomorrowEvents={msg.inlineData!.tomorrowItems ?? []}
                onExpandingCard={() => {
                  isExpandingCard.current = true;
                  setTimeout(() => { isExpandingCard.current = false; }, 400);
                }}
                onEditWithZaeli={(ev) => {
                  pendingCalendarAdd.current = true;
                  const focusedCard: Msg = {
                    id: uid(), role: 'zaeli', text: '', ts: nowTs(),
                    inlineData: { type: 'calendar', items: [ev], tomorrowItems: [] },
                  };
                  const dayName = ev.date
                    ? new Date(ev.date+'T00:00:00').toLocaleDateString('en-AU', { weekday:'long' })
                    : '';
                  const zaeliPrompt: Msg = {
                    id: uid(), role: 'zaeli',
                    text: `${ev.title} — ${dayName} at ${fmtTime(ev.start_time)}. What would you like to change?`,
                    ts: nowTs(), isLoading: false,
                    quickReplies: ['Move the time', 'Add someone', 'Change location', 'Cancel it'],
                  };
                  setMessages(prev => [...prev, focusedCard, zaeliPrompt]);
                  setTimeout(() => scrollRef.current?.scrollToEnd({ animated:true }), 120);
                }}
                onAddWithZaeli={() => {
                  pendingCalendarAdd.current = true;
                  const zaeliPrompt: Msg = {
                    id: uid(), role: 'zaeli',
                    text: "Love it — what's the event? Just tell me what, when, and who's going.",
                    ts: nowTs(), isLoading: false,
                    quickReplies: ["Dentist tomorrow 10am", "Duke's sports day Fri", "Date night Saturday"],
                  };
                  setMessages(prev => [...prev, zaeliPrompt]);
                  setTimeout(() => {
                    scrollRef.current?.scrollToEnd({ animated:true });
                    inputRef.current?.focus();
                  }, 120);
                }}
                onFullSheet={() => {
                  openCalSheet('today');
                }}
                onTomorrowSheet={() => {
                  openCalSheet('month');
                }}
                onManualEdit={(ev) => {
                  setCalSheetEditEv(ev);
                  setCalSheetOpen(true);
                }}
                onDeleteEvent={async (ev) => {
                  await supabase.from('events').delete().eq('id', ev.id);
                  refreshCalendarEvents();
                  loadCardData();
                }}
              />
            </>
          ) : hasShoppingInline ? (
            <>
              {!!msg.text && paragraphs.map((p, pi) => (
                <Text key={pi} style={[s.zaeliMsgText, { color:T.ink, marginBottom:8 }]}>{p}</Text>
              ))}
              <InlineShoppingCard
                items={msg.inlineData!.items ?? []}
                totalCount={msg.inlineData!.tomorrowItems?.[0]?._count ?? (msg.inlineData!.items?.length ?? 0)}
                onOpenSheet={() => openShopSheet('list')}
                onAddWithZaeli={() => {
                  const zaeliPrompt: Msg = {
                    id: uid(), role: 'zaeli',
                    text: "What do you need to add to the list?",
                    ts: nowTs(), isLoading: false,
                    quickReplies: ['Milk and eggs', 'What do we need?', 'Clear the list'],
                  };
                  setMessages(prev => [...prev, zaeliPrompt]);
                  setTimeout(() => { scrollRef.current?.scrollToEnd({ animated: true }); inputRef.current?.focus(); }, 120);
                }}
                onMarkBought={(item) => shopMarkBought(item)}
                onEditItem={(item) => openShopSheetToEdit(item)}
              />
            </>
          ) : hasOtherInline ? (
            <>
              {introParagraphs.map((p, pi) => (
                <Text key={pi} style={[s.zaeliMsgText, { color:T.ink, marginBottom:8 }]}>{p}</Text>
              ))}
              <View style={s.calCardsWrap}>
                {(msg.inlineData!.items || []).map((ev:any) => (
                  <EventCard key={ev.id} ev={ev} onPress={() => setSelectedEvent(ev)}/>
                ))}
              </View>
              {followUpParagraphs.map((p, pi) => (
                <Text key={pi} style={[s.zaeliMsgText, { color:T.ink, marginTop:8 }]}>{p}</Text>
              ))}
              {msg.inlineData!.showPortalPill && (
                <View style={s.quickRepliesWrap}>
                  <View style={s.qrChips}>
                    <TouchableOpacity style={s.calPortalChip} onPress={() => openCalSheet('month')} activeOpacity={0.75}>
                      <Text style={s.calPortalChipTxt}>Open Calendar →</Text>
                    </TouchableOpacity>
                    {(msg.quickReplies||[]).map((chip, ci) => (
                      <TouchableOpacity key={ci} style={[s.qrChip, { borderColor:'rgba(10,10,10,0.18)' }]} onPress={() => handleQuickReply(chip)} activeOpacity={0.7}>
                        <Text style={s.qrChipTxt}>{chip}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </>
          ) : msg.isBrief ? (
            <>
              {paragraphs.map((p, pi) => (
                <Text key={pi} style={[s.zaeliMsgText, { color:T.ink, marginBottom:8 }]}>{p}</Text>
              ))}
            </>
          ) : (
            <>
              {paragraphs.map((p, pi) => (
                <Text key={pi} style={[s.zaeliMsgText, { color:T.ink, marginBottom:8 }]}>{p}</Text>
              ))}
            </>
          )}

          {!msg.isLoading && !hasCalendarInline && !hasOtherInline && (msg.quickReplies??[]).length > 0 && (
            <View style={s.quickRepliesWrap}>
              <View style={s.qrChips}>
                {(msg.quickReplies??[]).map((chip, ci) => (
                  <TouchableOpacity key={ci} style={[s.qrChip, { borderColor:'rgba(10,10,10,0.18)' }]} onPress={() => handleQuickReply(chip)} activeOpacity={0.7}>
                    <Text style={s.qrChipTxt}>{chip}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {!msg.isLoading && !msg.isBrief && !hasCalendarInline && (
            <View style={s.zaeliIconRow}>
              <TouchableOpacity style={s.iconBtn} activeOpacity={0.6}><IcoPlay color={T.ink3}/></TouchableOpacity>
              <TouchableOpacity style={s.iconBtn} onPress={() => handleCopy(msg.text)} activeOpacity={0.6}><IcoCopy color={T.ink3}/></TouchableOpacity>
              <TouchableOpacity style={s.iconBtn} onPress={() => handleForward(msg.text)} activeOpacity={0.6}><IcoForward color={T.ink3}/></TouchableOpacity>
              <TouchableOpacity style={s.iconBtn} onPress={() => handleThumb(msg.id,'up')} activeOpacity={0.6}><IcoThumbUp color={thumbState==='up' ? HOME_AI : T.ink3}/></TouchableOpacity>
              <TouchableOpacity style={s.iconBtn} onPress={() => handleThumb(msg.id,'down')} activeOpacity={0.6}><IcoThumbDown color={thumbState==='down' ? T.ink2 : T.ink3}/></TouchableOpacity>
            </View>
          )}
        </View>
      );
    });
  }

  // ── Card order by time state ──────────────────────────────────────────────
  const isEvening = timeState === 'evening';
  const calEvents = isEvening ? cardData.tomorrowEvents : cardData.todayEvents;

  // Tomorrow morning events = tomorrow events before 10am
  const tomorrowMorningEvents = cardData.tomorrowEvents.filter(e => {
    const st = e.start_time || '';
    const timePart = st.includes('T') ? st.split('T')[1] : '';
    if (!timePart) return false;
    const hr = parseInt(timePart.split(':')[0], 10);
    return hr < 10;
  });

  // ── Render card stack — with stagger animations ──────────────────────────
  function renderCardStack() {
    const wrapCard = (node: React.ReactNode, idx: number) => (
      <Animated.View
        key={idx}
        style={{
          opacity: cardAnims[idx].opacity,
          transform: [{ translateY: cardAnims[idx].translateY }],
        }}
      >
        {node}
      </Animated.View>
    );

    const calCard = (
      <CalendarCard
        events={calEvents}
        isEvening={isEvening}
        onAdd={() => handleCardAdd('calendar')}
        onFullCalendar={() => openCalSheet('month')}
        onEventPress={ev => setSelectedEvent(ev)}
      />
    );
    const wxShopRow = (
      <View style={{ flexDirection:'row', gap:10 }}>
        <WeatherCard weather={cardData.weather} isEvening={isEvening}/>
        <ShoppingCard
          items={cardData.shopItems}
          count={cardData.shopCount}
          onAdd={() => handleCardAdd('shopping')}
          onFull={() => openShopSheet('list')}
        />
      </View>
    );
    const actCard = (
      <ActionsCard
        todos={cardData.todos}
        timeState={timeState}
        tomorrowMorningEvents={tomorrowMorningEvents}
        onAdd={() => handleCardAdd('actions')}
        onFull={() => { /* TODO: open Family Tasks sheet */ }}
        onTick={handleTodoTick}
      />
    );
    const dinCard = (
      <DinnerCard
        meals={cardData.meals}
        timeState={timeState}
        onPlanMeals={() => { /* TODO: open Meal Planner sheet */ }}
      />
    );

    // Order by time state, wrap each in stagger anim
    let cards: React.ReactNode[];
    if (timeState === 'am')      cards = [calCard, wxShopRow, actCard, dinCard];
    else if (timeState === 'pm') cards = [dinCard, calCard, actCard, wxShopRow];
    else                         cards = [calCard, actCard, wxShopRow, dinCard];

    return cards.map((card, idx) => wrapCard(card, idx));
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={[s.root, { backgroundColor: T.bannerBg }]}>
      <ExpoStatusBar style={T.statusBar} animated/>

      <EventDetailModal
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        onDeleted={() => { setSelectedEvent(null); refreshCalendarEvents(); }}
        onReload={() => { setSelectedEvent(null); refreshCalendarEvents(); }}
      />

      {/* ── SPLASH ── */}
      {screen !== 'chat' && (
        <Animated.View style={[s.splashWrap, { opacity:splashOpacity, zIndex:screen==='splash'?20:10 }]} pointerEvents={screen==='splash'?'auto':'none'}>
          <SafeAreaView style={{ flex:1, alignItems:'center', justifyContent:'center' }} edges={['top']}>
            <View style={s.splashOrb1}/>
            <View style={s.splashOrb2}/>
            <Animated.View style={{ opacity:wordmarkOpacity, alignItems:'center', gap:10 }}>
              <Text style={s.splashGreeting}>{h<12?'Good morning':h<17?'Good afternoon':'Good evening'}, {MEMBER_NAME} 👋</Text>
            </Animated.View>
            <Animated.View style={[{ transform:[{ scale:starScale }], alignItems:'center', marginTop:8 }]}>
              <Text style={s.splashWordmark}>
                z<Text style={{ color:'#FAC8A8' }}>a</Text>el<Text style={{ color:'#FAC8A8' }}>i</Text>
              </Text>
            </Animated.View>
            <Animated.View style={{ opacity:wordmarkOpacity, alignItems:'center', gap:20, marginTop:16 }}>
              <Text style={s.splashTagline}>LESS CHAOS. MORE FAMILY.</Text>
              <View style={s.splashDots}><TypingDots color="#FAC8A8"/></View>
            </Animated.View>
          </SafeAreaView>
        </Animated.View>
      )}

      {/* ── ENTRY ── */}
      {screen !== 'chat' && (
        <Animated.View style={[s.entryWrap, { opacity:entryOpacity, zIndex:screen==='entry'?20:5 }]} pointerEvents={screen==='entry'?'auto':'none'}>
          <SafeAreaView style={{ flex:1, flexDirection:'column' }} edges={['top','bottom']}>
            <View style={s.splashOrb1}/>
            <View style={s.entryOrb2}/>
            {(entryRecording || entryProcessing) ? (
              <View style={s.entryRecordingWrap}>
                <Text style={s.entryListeningLbl}>{entryProcessing ? 'Got it —' : 'Listening…'}</Text>
                <Text style={s.entryListeningSub}>{entryProcessing ? 'Just a second…' : 'Speak naturally — take your time.'}</Text>
                <View style={s.entryMicRingWrap}>
                  <View style={[s.entryMicRing1, entryProcessing && { borderColor:'rgba(255,255,255,0.2)' }]}/>
                  <View style={[s.entryMicRing2, entryProcessing && { borderColor:'rgba(255,255,255,0.1)' }]}/>
                  <TouchableOpacity style={s.entryMicBig} onPress={handleEntryMicStop} activeOpacity={0.85}>
                    <IcoMic color="#fff" size={36}/>
                  </TouchableOpacity>
                </View>
                <View style={s.entryWaveWrap}>
                  {waveAnims.map((anim, i) => (
                    <Animated.View key={i} style={[s.entryWaveBar, { transform:[{ scaleY:anim }] }]}/>
                  ))}
                </View>
                {!entryProcessing && (
                  <Text style={s.entryStopHint}>
                    <Text style={{ color:'#fff', fontFamily:'Poppins_600SemiBold' }}>Tap the mic</Text>{" "}when you're done.
                  </Text>
                )}
                {entryProcessing && <View style={{ flexDirection:'row', gap:6, alignItems:'center' }}><TypingDots color="rgba(255,255,255,0.6)"/></View>}
              </View>
            ) : (
              <>
                <View style={s.entryContent}>
                  <View style={s.entryStarBox}>
                    <Svg width="22" height="22" viewBox="0 0 16 16" fill="white"><Path d="M8 1L9.5 6.5L15 8L9.5 9.5L8 15L6.5 9.5L1 8L6.5 6.5L8 1Z"/></Svg>
                  </View>
                  <Text style={s.entryGreeting1}>{greeting}, {MEMBER_NAME}!</Text>
                  <Text style={s.entryGreeting2}>{greetingSub}</Text>
                  <Text style={s.entrySub}>Speak or tap a topic below.</Text>
                  <TouchableOpacity style={s.entryMicCard} onPress={handleEntryMicStart} activeOpacity={0.85}>
                    <View style={s.entryMicIcon}><IcoMic color="#fff"/></View>
                    <View style={{ flex:1 }}>
                      <Text style={s.entryMicTitle}>Speak to Zaeli</Text>
                      <Text style={s.entryMicSub}>"What's on today?" · "What's for dinner?"</Text>
                    </View>
                    <View style={s.entryWaveStatic}>
                      {[7,13,9,17,11].map((ht, i) => <View key={i} style={[s.entryWaveBarStatic, { height:ht }]}/>)}
                    </View>
                  </TouchableOpacity>
                  <View style={s.entryDivider}>
                    <View style={s.entryDivLine}/>
                    <Text style={s.entryDivTxt}>or tap a topic</Text>
                    <View style={s.entryDivLine}/>
                  </View>
                  <View style={s.entryChips}>
                    {FOCUS_CHIPS.map(chip => (
                      <TouchableOpacity key={chip.label} style={s.entryChip} onPress={() => enterChat(chip.seed)} activeOpacity={0.75}>
                        <Text style={s.entryChipEmoji}>{chip.emoji}</Text>
                        <Text style={s.entryChipTxt}>{chip.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <View style={[s.inputArea, { position:'relative', bottom:'auto' as any, paddingBottom:Platform.OS==='ios'?24:16 }]}>
                  <View style={[s.barPill, { backgroundColor:'#fff', borderColor:'rgba(10,10,10,0.09)' }]}>
                    <TouchableOpacity style={s.barBtn} onPress={() => {}} activeOpacity={0.75}><IcoPlus/></TouchableOpacity>
                    <View style={[s.barSep, { backgroundColor:'rgba(10,10,10,0.1)' }]}/>
                    <TextInput
                      style={[s.barInput, { color:INK }]}
                      placeholder="Ask Zaeli anything…"
                      placeholderTextColor="rgba(10,10,10,0.5)"
                      keyboardAppearance="light"
                      selectionColor={HOME_AI}
                      onSubmitEditing={e => { const txt = e.nativeEvent.text.trim(); if (txt) enterChat(txt); }}
                    />
                    <TouchableOpacity style={s.barBtn} onPress={handleEntryMicStart} activeOpacity={0.75}><IcoMic color={INK3}/></TouchableOpacity>
                    <TouchableOpacity style={s.barSend} onPress={() => enterChat()} activeOpacity={0.85}><IcoSend/></TouchableOpacity>
                  </View>
                </View>
              </>
            )}
          </SafeAreaView>
        </Animated.View>
      )}

      {/* ── MAIN CHAT ── */}
      <Animated.View style={[{ flex:1 }, screen==='chat' ? {} : { opacity:chatOpacity }]} pointerEvents={screen==='chat'?'auto':'none'}>

        {/* FIXED BANNER — wordmark + nav only, hero scrolls with content */}
        <SafeAreaView style={[s.topBar, { backgroundColor: T.bg }]} edges={['top']}>
          {/* ← Dashboard back pill — shown when arrived from Dashboard card tap */}
          {returnToDashboard && (
            <TouchableOpacity
              style={{ flexDirection:'row', alignItems:'center', gap:6, paddingHorizontal:20, paddingTop:6, paddingBottom:2 }}
              onPress={() => { setReturnToDashboard(false); router.navigate('/(tabs)/dashboard' as any); }}
              activeOpacity={0.75}
            >
              <Text style={{ fontFamily:'Poppins_600SemiBold', fontSize:12, color:'rgba(10,10,10,0.38)' }}>← Dashboard</Text>
            </TouchableOpacity>
          )}
          <View style={s.topBarRow}>
            <TouchableOpacity onPress={() => router.navigate('/(tabs)/')} activeOpacity={0.8}>
              <Text style={s.logoWord}>
                z<Text style={{ color:'#C4B4FF' }}>a</Text>el<Text style={{ color:'#C4B4FF' }}>i</Text>
              </Text>
            </TouchableOpacity>
            <Text style={s.topBarChannelName}>Chat</Text>
          </View>
          <View style={s.topBarDivider}/>
        </SafeAreaView>

        {/* CHAT */}
        <KeyboardAvoidingView
          style={s.kavWrap}
          behavior={Platform.OS==='ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? -16 : 0}
        >
          <View style={{ flex:1, position:'relative' }}>
            <ScrollView
              ref={scrollRef}
              style={[s.scroll, { backgroundColor:T.bg }]}
              contentContainerStyle={{ paddingHorizontal:0, paddingTop:14, paddingBottom:200 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="none"
              nestedScrollEnabled={true}
              directionalLockEnabled={true}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              onContentSizeChange={() => {
                if (isAtBottom.current && !isExpandingCard.current) {
                  scrollRef.current?.scrollToEnd({ animated:false });
                }
              }}
            >
              {/* ── DATE DIVIDER ── */}
              <View style={s.cardChatDivider}>
                <View style={[s.dateLine2, { backgroundColor:T.dateLine }]}/>
                <Text style={[s.dateLabel2, { color:T.ink3 }]}>{dateLabel.toUpperCase()}</Text>
                <View style={[s.dateLine2, { backgroundColor:T.dateLine }]}/>
              </View>

              {/* ── LAVENDER BRIEF CARD ── */}
              {chatBriefText ? (
                <View style={{ marginHorizontal:12, marginBottom:12, borderRadius:18, backgroundColor:'#D8CCFF', padding:16, paddingHorizontal:18 }}>
                  <Text style={{ fontFamily:'Poppins_700Bold', fontSize:10, letterSpacing:1, textTransform:'uppercase' as any, color:'rgba(60,20,140,0.4)', marginBottom:8 }}>{'\u2726'} ZAELI</Text>
                  <Text style={{ fontFamily:'Poppins_500Medium', fontSize:17, color:'#1A0A40', lineHeight:26, marginBottom:12 }}>{chatBriefText.replace(/\[([^\]]+)\]/g, '$1')}</Text>
                  <View style={{ flexDirection:'row', flexWrap:'wrap', gap:6 }}>
                    {chatBriefChips.map((chip, i) => (
                      <TouchableOpacity key={i} onPress={() => handleQuickReply(chip)} activeOpacity={0.7}
                        style={{ backgroundColor:'#fff', borderWidth:1, borderColor:'rgba(10,10,10,0.1)', borderRadius:20, paddingVertical:6, paddingHorizontal:13 }}>
                        <Text style={{ fontFamily:'Poppins_400Regular', fontSize:13, color:'rgba(10,10,10,0.65)' }}>{chip}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ) : null}

              {/* ── CHAT THREAD ── */}
              {renderMessages()}
            </ScrollView>

            {/* ── Mic recording — floating pill (exact match of FAB micPill) ── */}
            {isRecording && (
              <Animated.View style={{
                position:'absolute',
                bottom:Platform.OS==='ios'?124:110,
                left:16, right:16, zIndex:60,
                flexDirection:'column', alignItems:'center', justifyContent:'center',
                gap:12,
                backgroundColor:'rgba(255,255,255,0.97)',
                borderRadius:28,
                paddingVertical:24, paddingHorizontal:24,
                shadowColor:'#000', shadowOpacity:0.16, shadowRadius:32, shadowOffset:{width:0,height:12},
                elevation:16,
                borderWidth:1, borderColor:'rgba(255,255,255,0.98)',
                opacity:micOverlayAnim,
              }}>
                {/* Waveform bars — 7 bars, exact FAB heights */}
                <View style={{ flexDirection:'row', alignItems:'center', gap:3 }}>
                  {[10,18,28,36,28,18,10].map((h, i) => (
                    <Animated.View key={i} style={{ width:4, height:h, borderRadius:2, backgroundColor:'#FF4545', transform:[{ scaleY:waveAnims[i] }] }}/>
                  ))}
                </View>
                {/* Label */}
                <Text style={{ fontFamily:'Poppins_600SemiBold', fontSize:15, color:'rgba(10,10,10,0.45)' }}>{`Listening\u2026`}</Text>
                {/* Cancel / Send buttons */}
                <View style={{ flexDirection:'row', gap:12, marginTop:4 }}>
                  <TouchableOpacity onPress={() => stopRecording(true)} activeOpacity={0.75} style={{ flex:1, backgroundColor:'rgba(255,69,69,0.09)', borderRadius:14, paddingVertical:12, alignItems:'center' }}>
                    <Text style={{ fontFamily:'Poppins_700Bold', fontSize:14, color:'#FF4545' }}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => stopRecording()} activeOpacity={0.75} style={{ flex:1, backgroundColor:'#FF4545', borderRadius:14, paddingVertical:12, alignItems:'center' }}>
                    <Text style={{ fontFamily:'Poppins_700Bold', fontSize:14, color:'#fff' }}>{`Send \u2192`}</Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            )}

            {/* ── UP/DOWN scroll arrows — side by side ── */}
            <View style={{ position:'absolute', right:14, bottom:Platform.OS==='ios'?110:96, zIndex:50, flexDirection:'row', gap:8 }}>
              <TouchableOpacity
                onPress={() => scrollRef.current?.scrollTo({ y:0, animated:true })}
                activeOpacity={0.7}
                style={{ width:38, height:38, borderRadius:19, backgroundColor:'#FFFFFF', alignItems:'center', justifyContent:'center', shadowColor:'#000', shadowOpacity:0.12, shadowRadius:10, shadowOffset:{width:0,height:3}, elevation:5, borderWidth:1, borderColor:'rgba(220,220,220,0.4)' }}
              >
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="rgba(10,10,10,0.45)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><Line x1="12" y1="19" x2="12" y2="5"/><Polyline points="5 12 12 5 19 12"/></Svg>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => scrollRef.current?.scrollToEnd({ animated:true })}
                activeOpacity={0.7}
                style={{ width:38, height:38, borderRadius:19, backgroundColor:'#FFFFFF', alignItems:'center', justifyContent:'center', shadowColor:'#000', shadowOpacity:0.12, shadowRadius:10, shadowOffset:{width:0,height:3}, elevation:5, borderWidth:1, borderColor:'rgba(220,220,220,0.4)' }}
              >
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="rgba(10,10,10,0.45)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><Line x1="12" y1="5" x2="12" y2="19"/><Polyline points="19 12 12 19 5 12"/></Svg>
              </TouchableOpacity>
            </View>

            {/* ── BAR — absolute over scroll, KAV moves parent View above keyboard ── */}
            <View style={s.barFloat}>
              <View style={s.barPill}>
                <TouchableOpacity
                  style={s.barBtn}
                  onPress={() => { isRecording ? stopRecording() : startRecording(); }}
                  activeOpacity={0.75}
                >
                  <Svg width={26} height={26} viewBox="0 0 24 24" fill="none"
                    stroke={isRecording ? '#FF4545' : 'rgba(10,10,10,0.48)'} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
                    <Path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/>
                    <Path d="M19 10v2a7 7 0 01-14 0v-2"/>
                    <Line x1="12" y1="19" x2="12" y2="23"/>
                    <Line x1="8" y1="23" x2="16" y2="23"/>
                  </Svg>
                </TouchableOpacity>
                <TextInput
                  ref={inputRef}
                  style={s.barInput}
                  value={input}
                  onChangeText={setInput}
                  placeholder="Ask Zaeli anything..."
                  placeholderTextColor="rgba(10,10,10,0.48)"
                  multiline
                  keyboardAppearance="light"
                  selectionColor={HOME_AI}
                  blurOnSubmit={false}
                  onSubmitEditing={() => { if (input.trim()) send(input); }}
                />
                <View
                  style={[s.barBtn, { backgroundColor:'#FF4545' }, !input.trim() && { opacity:0.3 }]}
                  onTouchStart={() => { if (input.trim()) { const t = input; setInput(''); send(t); } }}
                >
                  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none"
                    stroke="#fff" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                    <Line x1="12" y1="19" x2="12" y2="5"/>
                    <Polyline points="5 12 12 5 19 12"/>
                  </Svg>
                </View>
              </View>
            </View>
          </View>

            {/* ── v5 FAB — hidden when embedded in swipe-world (which renders its own FAB) ── */}
            {!isEmbedded && (
              <ZaeliFAB
                ref={fabRef}
                activeButton={fabActive}
                userInitial="R"
                userColor="#4D8BFF"
                onDashboard={() => {
                  setFabActive('dashboard');
                  onNavigateDashboard?.();
                }}
                onChat={() => {
                  if (screen === 'chat') {
                    setFabActive('keyboard');
                    setTimeout(() => inputRef.current?.focus(), 100);
                  } else {
                    setFabActive('chat');
                  }
                }}
                onMySpace={() => {}}
                onChatKeyboard={() => {
                  setFabActive('keyboard');
                  setTimeout(() => inputRef.current?.focus(), 100);
                }}
                onMoreItem={(key) => {
                  const sheetKeys = ['calendar','shopping','meals','todos','notes','travel'];
                  if (key === 'calendar') { setCalSheetOpen(true); return; }
                  if (key === 'shopping') { setShopSheetOpen(true); return; }
                  if (sheetKeys.includes(key)) { return; }
                  const routes: Record<string, string> = {
                    tutor:    '/(tabs)/tutor',
                    kids:     '/(tabs)/kids',
                    family:   '/(tabs)/family',
                    settings: '/(tabs)/settings',
                  };
                  if (routes[key]) router.navigate(routes[key] as any);
                }}
                onMicResult={(text) => {
                  if (text) send(text);
                }}
              />
            )}
        </KeyboardAvoidingView>

        {/* CALENDAR SHEET */}
        <Modal
          visible={calSheetOpen}
          transparent
          animationType="slide"
          onRequestClose={() => setCalSheetOpen(false)}
        >
          <View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.40)', justifyContent:'flex-end' }}>
            <TouchableOpacity style={{ flex:1 }} onPress={() => setCalSheetOpen(false)} activeOpacity={1}/>
            <View style={{ backgroundColor:'#FAF8F5', borderTopLeftRadius:24, borderTopRightRadius:24, height:'92%', display:'flex', flexDirection:'column' }}>
              <SafeAreaView style={{ flex:1, display:'flex', flexDirection:'column' }} edges={['bottom']}>

                {/* Handle */}
                <View style={{ width:36, height:4, borderRadius:2, backgroundColor:'rgba(0,0,0,0.12)', alignSelf:'center', marginTop:10 }}/>

                {/* Header — changes between list and edit form */}
                <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:16, paddingVertical:12, borderBottomWidth:1, borderBottomColor:'rgba(0,0,0,0.08)' }}>
                  {calSheetEditEv ? (
                    <Text style={{ fontFamily:'Poppins_700Bold', fontSize:22, color:'#0A0A0A', letterSpacing:-0.3 }}>{calSheetEditEv?.id ? 'Edit Event' : 'Add Event'}</Text>
                  ) : (
                    <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
                      <PilIcoCal color="rgba(58,61,74,0.80)"/>
                      <Text style={{ fontFamily:'Poppins_700Bold', fontSize:22, color:'#0A0A0A', letterSpacing:-0.3 }}>Calendar</Text>
                    </View>
                  )}
                  <TouchableOpacity
                    onPress={() => calSheetEditEv ? setCalSheetEditEv(null) : setCalSheetOpen(false)}
                    style={{ width:36, height:36, borderRadius:10, backgroundColor:'rgba(0,0,0,0.07)', alignItems:'center', justifyContent:'center' }}
                    activeOpacity={0.7}
                  >
                    <Text style={{ fontSize:16, color:'rgba(0,0,0,0.5)' }}>{calSheetEditEv ? '‹' : '✕'}</Text>
                  </TouchableOpacity>
                </View>

                {calSheetEditEv ? (
                  /* ── EDIT FORM VIEW ── */
                  <CalSheetEditForm
                    ev={calSheetEditEv}
                    onBack={() => setCalSheetEditEv(null)}
                    onClose={() => setCalSheetOpen(false)}
                    onEditWithZaeli={handleSheetEditWithZaeli}
                    onSaved={async () => {
                      setCalSheetEditEv(null);
                      // Stay in sheet — refresh the event list
                      await openCalSheet(calSheetTab);
                      loadCardData();
                    }}
                    onDeleted={() => {
                      setCalSheetEditEv(null);
                      setCalSheetOpen(false);
                      loadCardData();
                    }}
                  />
                ) : (
                  <View style={{ flex:1 }}>
                    {/* Tabs */}
                    <View style={{ flexDirection:'row', backgroundColor:'rgba(0,0,0,0.06)', borderRadius:22, padding:4, marginHorizontal:14, marginTop:12, marginBottom:8 }}>
                      {(['today','tomorrow','month'] as const).map(tab => (
                        <TouchableOpacity
                          key={tab}
                          style={{ flex:1, alignItems:'center', paddingVertical:13, borderRadius:19, backgroundColor: calSheetTab===tab ? '#0A0A0A' : 'transparent' }}
                          onPress={() => setCalSheetTab(tab)} activeOpacity={0.75}
                        >
                          <Text style={{ fontFamily:'Poppins_700Bold', fontSize:15, color: calSheetTab===tab ? '#fff' : 'rgba(0,0,0,0.40)', textTransform:'capitalize' }}>{tab}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* Sheet body — scrollable, fills remaining height */}
                    <ScrollView
                      style={{ flex:1 }}
                      contentContainerStyle={{ padding:16, paddingBottom:50 }}
                      showsVerticalScrollIndicator={false}
                      keyboardShouldPersistTaps="handled"
                    >

                      {/* TODAY / TOMORROW TAB */}
                      {(calSheetTab === 'today' || calSheetTab === 'tomorrow') && (() => {
                        const evs = calSheetTab === 'today' ? calSheetEvents : calSheetTomEvents;
                        const dateStr = calSheetTab === 'today' ? localDateStr() : localDatePlusDays(1);
                        const dateLabel2 = new Date(dateStr+'T00:00:00').toLocaleDateString('en-AU', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
                        return (
                          <>
                            <Text style={{ fontFamily:'Poppins_700Bold', fontSize:17, color:'rgba(0,0,0,0.50)', marginBottom:16 }}>{dateLabel2}</Text>
                            {evs.length === 0 ? (
                              <Text style={{ fontFamily:'Poppins_400Regular', fontSize:17, color:'rgba(0,0,0,0.35)', fontStyle:'italic', marginBottom:16 }}>Nothing on {calSheetTab}</Text>
                            ) : evs.map((ev:any) => (
                              <CalSheetEventCard
                                key={ev.id} ev={ev}
                                onEditWithZaeli={handleSheetEditWithZaeli}
                                onManualEdit={() => setCalSheetEditEv(ev)}
                                onDeleted={() => openCalSheet(calSheetTab)}
                              />
                            ))}
                            {/* Add row */}
                            <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', borderWidth:1.5, borderStyle:'dashed', borderColor:'rgba(0,0,0,0.12)', borderRadius:14, padding:14, marginTop:4 }}>
                              <TouchableOpacity
                                onPress={() => setCalSheetEditEv({ date: calSheetTab === 'today' ? localDateStr() : localDatePlusDays(1), title:'', assignees:['2'], start_time:'', end_time:'' })}
                                activeOpacity={0.75}
                                style={{ flexDirection:'row', alignItems:'center', gap:10, flex:1 }}
                              >
                                <Text style={{ fontSize:20, color:'rgba(0,0,0,0.22)' }}>+</Text>
                                <Text style={{ fontFamily:'Poppins_600SemiBold', fontSize:16, color:'rgba(0,0,0,0.35)' }}>Add event for {calSheetTab}</Text>
                              </TouchableOpacity>
                              <TouchableOpacity onPress={handleSheetAddWithZaeli} activeOpacity={0.75}
                                style={{ flexDirection:'row', alignItems:'center', gap:4, backgroundColor:'rgba(168,216,240,0.18)', borderWidth:1, borderColor:'rgba(168,216,240,0.45)', borderRadius:10, paddingVertical:7, paddingHorizontal:12 }}>
                                <Text style={{ fontFamily:'Poppins_600SemiBold', fontSize:13, color:'rgba(0,0,0,0.50)' }}>✦ Add with Zaeli</Text>
                              </TouchableOpacity>
                            </View>
                          </>
                        );
                      })()}

                      {/* MONTH TAB */}
                      {calSheetTab === 'month' && (
                        <CalSheetMonthView
                          monthYear={calSheetMonthYear}
                          onMonthChange={(v) => {
                            setCalSheetMonthYear(v);
                            setCalSheetSelDay(null);
                            setCalSheetDayEvs([]);
                            fetchMonthDots(v.month, v.year);
                          }}
                          selectedDay={calSheetSelDay}
                          dayEvents={calSheetDayEvs}
                          allEvents={calSheetMonthEvs}
                          onDaySelect={fetchMonthDayEvents}
                          onEditWithZaeli={handleSheetEditWithZaeli}
                          onManualEdit={(ev) => setCalSheetEditEv(ev)}
                          onAddWithZaeli={handleSheetAddWithZaeli}
                          onManualAdd={(dateStr) => setCalSheetEditEv({ date: dateStr, title:'', assignees:['2'], start_time:'', end_time:'' })}
                          onDeleted={() => { fetchMonthDayEvents(calSheetSelDay ?? localDateStr()); fetchMonthDots(calSheetMonthYear.month, calSheetMonthYear.year); }}
                        />
                      )}

                    </ScrollView>
                  </View>
                )}
              </SafeAreaView>
            </View>
          </View>
        </Modal>

        {/* ── SHOPPING SHEET ── */}
        <Modal
          visible={shopSheetOpen}
          transparent
          animationType="slide"
          onRequestClose={() => setShopSheetOpen(false)}
        >
          <View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.40)', justifyContent:'flex-end' }}>
            <TouchableOpacity style={{ flex:1 }} onPress={() => setShopSheetOpen(false)} activeOpacity={1}/>
            <View style={{ backgroundColor:'#FAF8F5', borderTopLeftRadius:24, borderTopRightRadius:24, height:'92%', flexDirection:'column', display:'flex' }}>
              <SafeAreaView style={{ flex:1, flexDirection:'column', display:'flex' }} edges={['bottom']}>

                {/* Handle */}
                <View style={{ width:36, height:4, borderRadius:2, backgroundColor:'rgba(0,0,0,0.12)', alignSelf:'center', marginTop:10 }}/>

                {/* Header */}
                <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:16, paddingVertical:12, borderBottomWidth:1, borderBottomColor:'rgba(0,0,0,0.08)' }}>
                  <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
                    <Text style={{ fontSize:20 }}>🛒</Text>
                    <Text style={{ fontFamily:'Poppins_700Bold', fontSize:22, color:'#0A0A0A', letterSpacing:-0.3 }}>Shopping</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setShopSheetOpen(false)}
                    style={{ width:36, height:36, borderRadius:10, backgroundColor:'rgba(0,0,0,0.07)', alignItems:'center', justifyContent:'center' }}
                    activeOpacity={0.7}
                  >
                    <Text style={{ fontSize:16, color:'rgba(0,0,0,0.5)' }}>✕</Text>
                  </TouchableOpacity>
                </View>

                {/* Tab switcher */}
                <View style={{ flexDirection:'row', backgroundColor:'rgba(0,0,0,0.06)', borderRadius:22, padding:4, marginHorizontal:14, marginTop:12, marginBottom:8, flexShrink:0 }}>
                  {(['list','pantry','spend'] as const).map(tab => (
                    <TouchableOpacity
                      key={tab}
                      style={{ flex:1, alignItems:'center', paddingVertical:13, borderRadius:19, backgroundColor: shopSheetTab===tab ? '#0A0A0A' : 'transparent' }}
                      onPress={() => setShopSheetTab(tab)} activeOpacity={0.75}
                    >
                      <Text style={{ fontFamily:'Poppins_700Bold', fontSize:15, color: shopSheetTab===tab ? '#fff' : 'rgba(0,0,0,0.40)', textTransform:'capitalize' }}>
                        {tab === 'list' ? 'List' : tab === 'pantry' ? 'Pantry' : 'Spend'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* ── Tab content ── */}
                <View style={{ flex:1, position:'relative' }}>

                  {/* ════ LIST TAB ════ */}
                  {shopSheetTab === 'list' && (() => {
                    // Filter by search
                    const filtered = shopSearchText.trim()
                      ? shopSheetItems.filter(i => (i.name || i.item || '').toLowerCase().includes(shopSearchText.toLowerCase()))
                      : shopSheetItems;

                    // Group by category for aisle mode
                    const byAisle: Record<string, any[]> = {};
                    if (shopAisleMode) {
                      filtered.forEach((item: any) => {
                        const cat = item.category || guessCategory(item.name || item.item || '');
                        if (!byAisle[cat]) byAisle[cat] = [];
                        byAisle[cat].push(item);
                      });
                    }

                    return (
                      <>
                        <ScrollView
                          ref={shopListScrollRef}
                          style={{ flex:1 }}
                          contentContainerStyle={{ padding:16, paddingBottom:110 }}
                          showsVerticalScrollIndicator={false}
                          keyboardShouldPersistTaps="handled"
                        >
                          {/* Toolbar: search + aisle toggle */}
                          <View style={{ flexDirection:'row', alignItems:'center', gap:8, marginBottom:14 }}>
                            <TouchableOpacity
                              style={{ flex:1, flexDirection:'row', alignItems:'center', gap:8, backgroundColor:'#fff', borderWidth:1.5, borderColor: shopSearchOpen ? 'rgba(80,32,192,0.30)' : 'rgba(0,0,0,0.09)', borderRadius:20, paddingVertical:8, paddingHorizontal:12 }}
                              onPress={() => { setShopSearchOpen(true); }}
                              activeOpacity={0.8}
                            >
                              <Svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={shopSearchOpen ? SHOP_ACCENT : 'rgba(0,0,0,0.35)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <Circle cx="11" cy="11" r="8"/><Line x1="21" y1="21" x2="16.65" y2="16.65"/>
                              </Svg>
                              {shopSearchOpen ? (
                                <TextInput
                                  autoFocus
                                  style={{ flex:1, fontFamily:'Poppins_400Regular', fontSize:13, color:'#0A0A0A', paddingVertical:0 }}
                                  value={shopSearchText}
                                  onChangeText={setShopSearchText}
                                  placeholder="Search items…"
                                  placeholderTextColor="rgba(0,0,0,0.30)"
                                  onBlur={() => { if (!shopSearchText) setShopSearchOpen(false); }}
                                />
                              ) : (
                                <Text style={{ fontFamily:'Poppins_400Regular', fontSize:14, color:'rgba(0,0,0,0.30)', flex:1 }}>Search items…</Text>
                              )}
                            </TouchableOpacity>
                            <View style={{ flexDirection:'row', backgroundColor:'rgba(0,0,0,0.06)', borderRadius:14, padding:2, flexShrink:0 }}>
                              {(['List','Aisle'] as const).map(mode => {
                                const isOn = mode === 'Aisle' ? shopAisleMode : !shopAisleMode;
                                return (
                                  <TouchableOpacity key={mode} onPress={() => setShopAisleMode(mode === 'Aisle')} activeOpacity={0.75}
                                    style={{ paddingVertical:5, paddingHorizontal:11, borderRadius:12, backgroundColor: isOn ? '#fff' : 'transparent' }}>
                                    <Text style={{ fontFamily:'Poppins_600SemiBold', fontSize:13, color: isOn ? '#0A0A0A' : 'rgba(0,0,0,0.40)' }}>{mode}</Text>
                                  </TouchableOpacity>
                                );
                              })}
                            </View>
                          </View>

                          {/* TO GET header */}
                          {!shopAisleMode && !shopSearchText && filtered.length > 0 && (
                            <Text style={{ fontFamily:'Poppins_700Bold', fontSize:11, letterSpacing:0.8, textTransform:'uppercase', color:'rgba(0,0,0,0.30)', marginBottom:10 }}>
                              TO GET · {filtered.length} {filtered.length === 1 ? 'item' : 'items'}
                            </Text>
                          )}

                          {/* Search results / normal list */}
                          {shopSearchText.trim() && filtered.length === 0 ? (
                            <View style={{ paddingVertical:20, alignItems:'center' }}>
                              <Text style={{ fontFamily:'Poppins_400Regular', fontSize:14, color:'rgba(0,0,0,0.35)' }}>No matches for "{shopSearchText}"</Text>
                            </View>
                          ) : shopAisleMode ? (
                            // Aisle grouped view
                            Object.entries(byAisle).map(([cat, catItems]) => (
                              <View key={cat}>
                                <Text style={{ fontFamily:'Poppins_700Bold', fontSize:11, letterSpacing:0.8, textTransform:'uppercase', color:'rgba(0,0,0,0.30)', paddingBottom:6, borderBottomWidth:1, borderBottomColor:'rgba(0,0,0,0.06)', marginTop:12, marginBottom:0 }}>{cat}</Text>
                                {catItems.map((item: any) => renderShopItem(item))}
                              </View>
                            ))
                          ) : (
                            // List view — all items
                            <>
                              {filtered.length === 0 && !shopSearchText && (
                                <Text style={{ fontFamily:'Poppins_400Regular', fontSize:15, color:'rgba(0,0,0,0.35)', fontStyle:'italic', paddingVertical:8 }}>List is clear 🎉</Text>
                              )}
                              {filtered.map((item: any) => renderShopItem(item))}
                            </>
                          )}

                          {/* Recently Bought */}
                          {!shopSearchText && shopSheetBought.length > 0 && (
                            <View style={{ marginTop:24 }}>
                              <Text style={{ fontFamily:'Poppins_700Bold', fontSize:11, letterSpacing:0.8, textTransform:'uppercase', color:'rgba(0,0,0,0.30)', marginBottom:10 }}>Recently Bought</Text>
                              {shopSheetBought.slice(0,10).map((item: any) => {
                                const boughtEmoji = getItemEmoji(item.name || item.item || '');
                                const boughtDate  = item.created_at
                                  ? new Date(item.created_at).toLocaleDateString('en-AU', { weekday:'short' })
                                  : '';
                                const isDelConfirm = shopDelConfirmId === ('rb-' + item.id);
                                return (
                                  <View key={item.id} style={{ flexDirection:'row', alignItems:'center', gap:10, paddingVertical:12, borderBottomWidth:1, borderBottomColor:'rgba(0,0,0,0.06)' }}>
                                    <Text style={{ fontSize:22, flexShrink:0 }}>{boughtEmoji}</Text>
                                    <Text style={{ fontFamily:'Poppins_700Bold', fontSize:16, color: SHOP_MAG, flex:1, lineHeight:21 }} numberOfLines={1}>{item.name || item.item}</Text>
                                    {!!boughtDate && (
                                      <Text style={{ fontFamily:'Poppins_400Regular', fontSize:11, color:'rgba(0,0,0,0.35)', flexShrink:0 }}>{boughtDate}</Text>
                                    )}
                                    <TouchableOpacity
                                      onPress={() => shopReAdd(item)}
                                      style={{ backgroundColor:'rgba(224,0,124,0.12)', borderRadius:14, paddingVertical:6, paddingHorizontal:13, flexShrink:0 }}
                                      activeOpacity={0.75}
                                    >
                                      <Text style={{ fontFamily:'Poppins_700Bold', fontSize:12, color: SHOP_MAG }}>+ Add</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                      onPress={() => {
                                        if (isDelConfirm) { shopDeleteItem(item.id); }
                                        else { setShopDelConfirmId('rb-' + item.id); }
                                      }}
                                      style={{ width:30, height:30, alignItems:'center', justifyContent:'center', borderRadius:8, backgroundColor: isDelConfirm ? 'rgba(255,59,59,0.12)' : 'transparent', flexShrink:0 }}
                                      hitSlop={{ top:6, bottom:6, left:6, right:6 }}
                                      activeOpacity={0.75}
                                    >
                                      <Svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={isDelConfirm ? '#FF3B3B' : 'rgba(0,0,0,0.28)'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                        <Path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
                                      </Svg>
                                    </TouchableOpacity>
                                  </View>
                                );
                              })}
                            </View>
                          )}
                        </ScrollView>

                        {/* Scroll arrows — top/bottom */}
                        <View style={{ position:'absolute', right:10, bottom:90, gap:6 }} pointerEvents="box-none">
                          <TouchableOpacity
                            style={{ width:32, height:32, borderRadius:16, backgroundColor:'rgba(0,0,0,0.10)', alignItems:'center', justifyContent:'center' }}
                            onPress={() => shopListScrollRef.current?.scrollTo({ y:0, animated:true })}
                            activeOpacity={0.75}
                          >
                            <Svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(0,0,0,0.55)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <Line x1="12" y1="19" x2="12" y2="5"/><Polyline points="5 12 12 5 19 12"/>
                            </Svg>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={{ width:32, height:32, borderRadius:16, backgroundColor:'rgba(0,0,0,0.10)', alignItems:'center', justifyContent:'center' }}
                            onPress={() => shopListScrollRef.current?.scrollToEnd({ animated:true })}
                            activeOpacity={0.75}
                          >
                            <Svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(0,0,0,0.55)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <Line x1="12" y1="5" x2="12" y2="19"/><Polyline points="19 12 12 19 5 12"/>
                            </Svg>
                          </TouchableOpacity>
                        </View>

                        {/* Sticky add row — absolute bottom */}
                        <View style={{ position:'absolute', bottom:0, left:0, right:0, backgroundColor:'#FAF8F5', borderTopWidth:1, borderTopColor:'rgba(0,0,0,0.08)', padding:14, paddingBottom: Platform.OS === 'ios' ? 20 : 14 }}>
                          <View style={{ flexDirection:'row', alignItems:'center', gap:8, borderWidth:1.5, borderStyle:'dashed', borderColor:'rgba(0,0,0,0.14)', borderRadius:14, paddingHorizontal:14, paddingVertical:10, backgroundColor:'rgba(255,255,255,0.7)' }}>
                            <Svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(0,0,0,0.28)" strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink:0 }}>
                              <Line x1="12" y1="5" x2="12" y2="19"/><Line x1="5" y1="12" x2="19" y2="12"/>
                            </Svg>
                            <TextInput
                              style={{ fontFamily:'Poppins_400Regular', fontSize:15, color:'#0A0A0A', flex:1, paddingVertical:0 }}
                              placeholder="Add an item…"
                              placeholderTextColor="rgba(0,0,0,0.30)"
                              value={shopAddInput}
                              onChangeText={setShopAddInput}
                              onSubmitEditing={() => { if (shopAddInput.trim()) shopAddItem(shopAddInput); }}
                              returnKeyType="done"
                              blurOnSubmit={false}
                            />
                            {/* Mic button */}
                            <TouchableOpacity
                              onPress={async () => {
                                setShopSheetOpen(false);
                                await new Promise(r => setTimeout(r, 300));
                                shopMicMode.current = true;
                                startRecording();
                              }}
                              style={{ width:34, height:34, borderRadius:17, backgroundColor:'rgba(0,0,0,0.05)', alignItems:'center', justifyContent:'center', flexShrink:0 }}
                              activeOpacity={0.75}
                            >
                              <IcoMic color="rgba(0,0,0,0.45)" size={18}/>
                            </TouchableOpacity>
                            {shopAddInput.trim() ? (
                              <TouchableOpacity
                                onPress={() => shopAddItem(shopAddInput)}
                                style={{ width:34, height:34, borderRadius:17, backgroundColor:'#FF4545', alignItems:'center', justifyContent:'center', flexShrink:0 }}
                                activeOpacity={0.8}
                              >
                                <Svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <Line x1="12" y1="19" x2="12" y2="5"/><Polyline points="5 12 12 5 19 12"/>
                                </Svg>
                              </TouchableOpacity>
                            ) : (
                              <TouchableOpacity
                                onPress={() => {
                                  const zMsg: Msg = { id:uid(), role:'zaeli', text:"What do you need to add to the list?", ts:nowTs(), isLoading:false, quickReplies:['Milk and eggs','Fruit and veg','What do we need?'] };
                                  setMessages(prev => [...prev, zMsg]);
                                  setShopSheetOpen(false);
                                  setTimeout(() => inputRef.current?.focus(), 400);
                                }}
                                style={{ backgroundColor:'rgba(168,216,240,0.18)', borderWidth:1, borderColor:'rgba(168,216,240,0.45)', borderRadius:10, paddingVertical:6, paddingHorizontal:10, flexShrink:0 }}
                                activeOpacity={0.75}
                              >
                                <Text style={{ fontFamily:'Poppins_600SemiBold', fontSize:12, color:'rgba(0,0,0,0.50)' }}>✦ Zaeli</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>
                      </>
                    );
                  })()}

                  {/* ════ PANTRY TAB ════ */}
                  {shopSheetTab === 'pantry' && (() => {
                    const filtered = shopSearchText.trim()
                      ? shopSheetPantry.filter((i: any) => i.name.toLowerCase().includes(shopSearchText.toLowerCase()))
                      : shopSheetPantry;

                    const byAisle: Record<string, any[]> = {};
                    if (shopPantryAisle) {
                      filtered.forEach((item: any) => {
                        const cat = guessCategory(item.name || '');
                        if (!byAisle[cat]) byAisle[cat] = [];
                        byAisle[cat].push(item);
                      });
                    }

                    function fmtLastBought(dateStr: string | null): string {
                      if (!dateStr) return 'Not recorded';
                      const d = new Date(dateStr + 'T00:00:00');
                      const diff = Math.round((Date.now() - d.getTime()) / 86400000);
                      if (diff === 0) return 'Today';
                      if (diff === 1) return 'Yesterday';
                      if (diff < 7)  return `${diff} days ago`;
                      return d.toLocaleDateString('en-AU', { day:'numeric', month:'short' });
                    }

                    function renderPantryItem(item: any) {
                      const onList = shopSheetItems.some((s: any) => (s.name||s.item||''  ).toLowerCase() === (item.name||''  ).toLowerCase());
                      const emoji  = item.emoji && item.emoji !== '🛒' ? item.emoji : getItemEmoji(item.name || '');
                      return (
                        <TouchableOpacity key={item.id} style={{ backgroundColor:'#fff', borderRadius:14, marginBottom:8, padding:14, flexDirection:'row', alignItems:'center', gap:12 }} onPress={() => {}} activeOpacity={0.75}>
                          <Text style={{ fontSize:22, flexShrink:0 }}>{emoji}</Text>
                          <View style={{ flex:1 }}>
                            <Text style={{ fontFamily:'Poppins_600SemiBold', fontSize:16, color:'#0A0A0A', lineHeight:21 }}>{item.name}</Text>
                            <Text style={{ fontFamily:'Poppins_400Regular', fontSize:13, color:'rgba(0,0,0,0.40)', marginTop:2 }}>Last bought {fmtLastBought(item.last_bought)}</Text>
                          </View>
                          {onList ? (
                            <View style={{ backgroundColor:'rgba(26,122,69,0.08)', borderRadius:12, paddingVertical:8, paddingHorizontal:14 }}>
                              <Text style={{ fontFamily:'Poppins_700Bold', fontSize:14, color: SHOP_GREEN }}>On list ✓</Text>
                            </View>
                          ) : (
                            <TouchableOpacity
                              onPress={async () => {
                                const cat = guessCategory(item.name);
                                // Optimistic update
                                setShopSheetItems(prev => [...prev, { id: 'p-' + item.id, name: item.name, item: item.name, category: cat, checked: false }]);
                                const { error } = await supabase.from('shopping_items').insert({ family_id: FAMILY_ID, name: item.name, item: item.name, category: cat, checked: false });
                                if (error) { console.log('Pantry +List error:', error.message); }
                                refreshShopList();
                              }}
                              style={{ backgroundColor:'rgba(80,32,192,0.09)', borderRadius:12, paddingVertical:8, paddingHorizontal:14 }}
                              activeOpacity={0.75}
                            >
                              <Text style={{ fontFamily:'Poppins_700Bold', fontSize:14, color: SHOP_ACCENT }}>+ List</Text>
                            </TouchableOpacity>
                          )}
                        </TouchableOpacity>
                      );
                    }

                    return (
                      <>
                        <ScrollView style={{ flex:1 }} contentContainerStyle={{ padding:16, paddingBottom:110 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                          {/* Scan buttons */}
                          <View style={{ flexDirection:'row', gap:8, marginBottom:14 }}>
                            {['📷 Scan receipt', '🥦 Scan pantry'].map(lbl => (
                              <TouchableOpacity key={lbl}
                                style={{ flex:1, flexDirection:'row', alignItems:'center', justifyContent:'center', gap:5, backgroundColor:'#fff', borderWidth:1.5, borderColor:'rgba(0,0,0,0.09)', borderRadius:12, paddingVertical:11 }}
                                onPress={() => {}} activeOpacity={0.75}
                              >
                                <Text style={{ fontFamily:'Poppins_600SemiBold', fontSize:11, color:'rgba(0,0,0,0.50)' }}>{lbl}</Text>
                              </TouchableOpacity>
                            ))}
                          </View>

                          {/* Toolbar: search + aisle toggle */}
                          <View style={{ flexDirection:'row', alignItems:'center', gap:8, marginBottom:14 }}>
                            <TouchableOpacity
                              style={{ flex:1, flexDirection:'row', alignItems:'center', gap:8, backgroundColor:'#fff', borderWidth:1.5, borderColor: shopSearchOpen ? 'rgba(80,32,192,0.30)' : 'rgba(0,0,0,0.09)', borderRadius:20, paddingVertical:8, paddingHorizontal:12 }}
                              onPress={() => setShopSearchOpen(true)} activeOpacity={0.8}
                            >
                              <Svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={shopSearchOpen ? SHOP_ACCENT : 'rgba(0,0,0,0.35)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <Circle cx="11" cy="11" r="8"/><Line x1="21" y1="21" x2="16.65" y2="16.65"/>
                              </Svg>
                              {shopSearchOpen ? (
                                <TextInput autoFocus style={{ flex:1, fontFamily:'Poppins_400Regular', fontSize:14, color:'#0A0A0A', paddingVertical:0 }} value={shopSearchText} onChangeText={setShopSearchText} placeholder="Search pantry…" placeholderTextColor="rgba(0,0,0,0.30)" onBlur={() => { if (!shopSearchText) setShopSearchOpen(false); }}/>
                              ) : (
                                <Text style={{ fontFamily:'Poppins_400Regular', fontSize:14, color:'rgba(0,0,0,0.30)', flex:1 }}>Search pantry…</Text>
                              )}
                            </TouchableOpacity>
                            <View style={{ flexDirection:'row', backgroundColor:'rgba(0,0,0,0.06)', borderRadius:14, padding:2, flexShrink:0 }}>
                              {(['List','Aisle'] as const).map(mode => {
                                const isOn = mode === 'Aisle' ? shopPantryAisle : !shopPantryAisle;
                                return (
                                  <TouchableOpacity key={mode} onPress={() => setShopPantryAisle(mode === 'Aisle')} activeOpacity={0.75}
                                    style={{ paddingVertical:5, paddingHorizontal:11, borderRadius:12, backgroundColor: isOn ? '#fff' : 'transparent' }}>
                                    <Text style={{ fontFamily:'Poppins_600SemiBold', fontSize:13, color: isOn ? '#0A0A0A' : 'rgba(0,0,0,0.40)' }}>{mode}</Text>
                                  </TouchableOpacity>
                                );
                              })}
                            </View>
                          </View>

                          <Text style={{ fontFamily:'Poppins_700Bold', fontSize:11, letterSpacing:0.8, textTransform:'uppercase', color:'rgba(0,0,0,0.30)', marginBottom:8 }}>Your Pantry · {filtered.length} items</Text>

                          {shopPantryAisle
                            ? Object.entries(byAisle).map(([cat, catItems]) => (
                              <View key={cat}>
                                <Text style={{ fontFamily:'Poppins_700Bold', fontSize:11, letterSpacing:0.8, textTransform:'uppercase', color:'rgba(0,0,0,0.30)', paddingBottom:6, borderBottomWidth:1, borderBottomColor:'rgba(0,0,0,0.06)', marginTop:12 }}>{cat}</Text>
                                {catItems.map(renderPantryItem)}
                              </View>
                            ))
                            : filtered.map(renderPantryItem)
                          }
                        </ScrollView>

                        {/* Sticky add row */}
                        <View style={{ position:'absolute', bottom:0, left:0, right:0, backgroundColor:'#FAF8F5', borderTopWidth:1, borderTopColor:'rgba(0,0,0,0.08)', padding:14, paddingBottom: Platform.OS === 'ios' ? 20 : 14 }}>
                          <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', borderWidth:1.5, borderStyle:'dashed', borderColor:'rgba(0,0,0,0.14)', borderRadius:14, padding:12, backgroundColor:'rgba(255,255,255,0.6)' }}>
                            <Text style={{ fontFamily:'Poppins_600SemiBold', fontSize:16, color:'rgba(0,0,0,0.32)', flex:1 }}>+ Add an item</Text>
                            <TouchableOpacity style={{ backgroundColor:'rgba(168,216,240,0.18)', borderWidth:1, borderColor:'rgba(168,216,240,0.45)', borderRadius:10, paddingVertical:7, paddingHorizontal:12 }} activeOpacity={0.75}>
                              <Text style={{ fontFamily:'Poppins_600SemiBold', fontSize:15, color:'rgba(0,0,0,0.50)' }}>✦ Add with Zaeli</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </>
                    );
                  })()}

                  {/* ════ SPEND TAB ════ */}
                  {shopSheetTab === 'spend' && (
                    <ScrollView style={{ flex:1 }} contentContainerStyle={{ padding:16, paddingBottom:50 }} showsVerticalScrollIndicator={false}>
                      {/* Monthly hero */}
                      <View style={{ backgroundColor:'#A8E8CC', borderRadius:20, padding:18, marginBottom:14 }}>
                        <Text style={{ fontFamily:'DMSerifDisplay_400Regular', fontSize:38, color:'#0A0A0A', letterSpacing:-0.5, lineHeight:42 }}>
                          ${shopSheetMonthSpend.toFixed(2)}
                        </Text>
                        <Text style={{ fontFamily:'Poppins_400Regular', fontSize:13, color:'rgba(0,0,0,0.50)', marginTop:3 }}>
                          {new Date().toLocaleDateString('en-AU', { month:'long', year:'numeric' })} · {shopSheetMonthShops} shop{shopSheetMonthShops !== 1 ? 's' : ''} · {shopSheetMonthItems} items
                        </Text>
                      </View>

                      <Text style={{ fontFamily:'Poppins_700Bold', fontSize:11, letterSpacing:0.8, textTransform:'uppercase', color:'rgba(0,0,0,0.30)', marginBottom:10 }}>Recent Receipts</Text>

                      {shopSheetReceipts.length === 0 ? (
                        <Text style={{ fontFamily:'Poppins_400Regular', fontSize:14, color:'rgba(0,0,0,0.35)', fontStyle:'italic' }}>No receipts scanned yet — scan one in the Pantry tab.</Text>
                      ) : shopSheetReceipts.map((receipt: any) => (
                        <ReceiptCard key={receipt.id} receipt={receipt}/>
                      ))}
                    </ScrollView>
                  )}

                </View>{/* end tab content */}
              </SafeAreaView>
            </View>
          </View>
        </Modal>

        {/* ADD SHEET */}
        <Modal visible={showAddSheet} transparent animationType="none" onRequestClose={() => closeSheet()}>
          <Pressable style={s.sheetOverlay} onPress={() => closeSheet()}>
            <Animated.View style={[s.sheet, { transform:[{ translateY:sheetAnim }] }]}>
              <Pressable onPress={() => {}}>
                <View style={s.sheetHandle}/>
                <View style={s.sheetHeader}>
                  <TouchableOpacity style={s.sheetCloseBtn} onPress={() => closeSheet()} activeOpacity={0.7}><IcoClose/></TouchableOpacity>
                  <Text style={s.sheetTitle}>Add to Chat</Text>
                  <View style={{ width:44 }}/>
                </View>
                <View style={s.sheetTiles}>
                  <TouchableOpacity style={s.sheetTile} onPress={openCamera} activeOpacity={0.75}><IcoCamera/><Text style={s.sheetTileLabel}>Camera</Text></TouchableOpacity>
                  <TouchableOpacity style={s.sheetTile} onPress={openPhotos} activeOpacity={0.75}><IcoPhotos/><Text style={s.sheetTileLabel}>Photos</Text></TouchableOpacity>
                  <TouchableOpacity style={s.sheetTile} onPress={() => { closeSheet(() => setLiveCamera(true)); }} activeOpacity={0.75}>
                    <Svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={INK} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <Circle cx="12" cy="12" r="3"/>
                      <Path d="M2 12C2 12 5 5 12 5s10 7 10 7-3 7-10 7S2 12 2 12z"/>
                    </Svg>
                    <Text style={s.sheetTileLabel}>Live</Text>
                  </TouchableOpacity>
                </View>
                <View style={{ height:Platform.OS==='ios'?32:20 }}/>
              </Pressable>
            </Animated.View>
          </Pressable>
        </Modal>

        {/* LIVE CAMERA OVERLAY */}
        {liveCamera && (
          <View style={s.liveCameraOverlay}>
            <SafeAreaView style={{ flex:1 }} edges={['top']}>
              <View style={s.liveCameraTop}>
                <TouchableOpacity style={s.liveCameraClose} onPress={() => setLiveCamera(false)} activeOpacity={0.8}><IcoClose/></TouchableOpacity>
                <Text style={s.liveCameraTitle}>Live · Point & Ask</Text>
                <View style={{ width:44 }}/>
              </View>
              <View style={s.liveCameraBody}>
                <Text style={s.liveCameraHint}>Open your camera and ask Zaeli about anything you see</Text>
                <TouchableOpacity style={s.liveCameraBtn} onPress={async () => {
                  setLiveCamera(false);
                  await new Promise(r => setTimeout(r, 300));
                  openCamera();
                }} activeOpacity={0.85}>
                  <Text style={s.liveCameraBtnTxt}>Open Camera</Text>
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </View>
        )}

        {/* MIC OVERLAY removed in v5 — ZaeliFAB handles mic pill internally */}
      </Animated.View>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// ── LANDING OVERLAY COMPONENT ──────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════

const LANDING_FLAGS_FILE = (FileSystem.documentDirectory ?? '') + 'landing_flags.json';
type LandingWindow = 'morning' | 'midday' | 'evening';

const LANDING_GRADIENTS: Record<LandingWindow, string> = {
  morning: '#FFF6EC',
  midday:  '#EDF6FF',
  evening: '#F5EEFF',
};
const LANDING_AI_COLOURS: Record<LandingWindow, string> = {
  morning: '#F0C8C0',
  midday:  '#F0C8C0',
  evening: '#F0C8C0',
};
const LANDING_HIGHLIGHT: Record<LandingWindow, string> = {
  morning: '#0096C7',
  midday:  '#0096C7',
  evening: '#0096C7',
};
const LANDING_GREETING: Record<LandingWindow, string> = {
  morning: 'GOOD MORNING, RICH',
  midday:  'GOOD AFTERNOON, RICH',
  evening: 'GOOD EVENING, RICH',
};

const LANDING_TEST_WINDOW: LandingWindow = 'morning';
const OPENAI_BRIEF_URL = 'https://api.openai.com/v1/chat/completions';

async function writeLandingDismiss(win: LandingWindow) {
  try {
    const d = new Date();
    const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    let flags: Record<string, boolean> = {};
    try { flags = JSON.parse(await FileSystem.readAsStringAsync(LANDING_FLAGS_FILE)); } catch {}
    flags[`${dateStr}-${win}`] = true;
    await FileSystem.writeAsStringAsync(LANDING_FLAGS_FILE, JSON.stringify(flags));
  } catch {}
}

function LandingOverlay({ onDismiss }: { onDismiss: () => void }) {
  const h = new Date().getHours();
  const win: LandingWindow = LANDING_TEST_MODE
    ? LANDING_TEST_WINDOW
    : h >= 6 && h < 9 ? 'morning' : h >= 12 && h < 14 ? 'midday' : 'evening';

  const [briefText, setBriefText] = React.useState('');
  const [loading,   setLoading]   = React.useState(true);
  const fadeAnim  = React.useRef(new Animated.Value(1)).current;
  const briefAnim = React.useRef(new Animated.Value(0)).current;
  const dismissed = React.useRef(false);

  // Generate brief on mount
  React.useEffect(() => {
    async function generate() {
      try {
        const key = process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? '';
        if (!key) { setBriefText('Morning. Here\'s the day ahead.'); setLoading(false); return; }
        const today = localDateStr();
        const [evRes, tdRes, mlRes] = await Promise.all([
          supabase.from('events').select('title,date,start_time').eq('family_id', FAMILY_ID).eq('date', today).order('start_time').limit(4),
          supabase.from('todos').select('title,priority').eq('family_id', FAMILY_ID).eq('status','active').limit(3),
          supabase.from('meal_plans').select('meal_name').eq('family_id', FAMILY_ID).eq('day_key', today).limit(1),
        ]);
        const ctx: string[] = [];
        if (evRes.data?.length) ctx.push(`Today: ${evRes.data.map((e:any) => e.title).join(', ')}.`);
        else ctx.push('Calendar clear today.');
        if (tdRes.data?.length) ctx.push(`Todos: ${tdRes.data.map((t:any) => t.title).join(', ')}.`);
        if (mlRes.data?.length) ctx.push(`Tonight: ${mlRes.data[0].meal_name}.`);

        const tod = win === 'morning' ? 'morning' : win === 'midday' ? 'afternoon' : 'evening';
        const system = `You are Zaeli — sharp, warm AI for Rich's Australian family (Anna, Poppy 12, Gab 10, Duke 8).
Write the ${tod} brief. EXACTLY 3 sentences. Max 180 characters TOTAL.
Sentence 1: Most urgent thing. Specific. No waffle.
Sentence 2: One win or clear gap. Short.
Sentence 3: ONE warm Zaeli observation — dry wit, specific to this family. NOT generic motivation.
Rules: Don't open with name. Wrap key facts in [square brackets]. Never start with "I". No emojis.
Banned: "sorted", "chaos", "locked in", "quick wins", "you've got this", "make it count"
Context: ${ctx.join(' ')}`;

        const res = await fetch(OPENAI_BRIEF_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
          body: JSON.stringify({ model: 'gpt-5.4-mini', max_completion_tokens: 200, messages: [{ role: 'system', content: system }, { role: 'user', content: 'Generate.' }] }),
        });
        const json = await res.json();
        const text = json?.choices?.[0]?.message?.content?.trim() ?? '';
        setBriefText(text || 'Here\'s the day.');
        Animated.timing(briefAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
      } catch {
        setBriefText('Here\'s the day ahead.');
      } finally {
        setLoading(false);
      }
    }
    generate();
  }, []);

  const dismiss = React.useCallback(async () => {
    if (dismissed.current) return;
    dismissed.current = true;
    if (!LANDING_TEST_MODE) await writeLandingDismiss(win);
    Animated.timing(fadeAnim, { toValue: 0, duration: 280, useNativeDriver: true })
      .start(() => onDismiss());
  }, [win, onDismiss]);

  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > 12 || Math.abs(gs.dy) > 12,
      onMoveShouldSetPanResponderCapture: () => false,
      onPanResponderRelease: (_, gs) => {
        if (Math.abs(gs.dx) > 50 || Math.abs(gs.dy) > 50) dismiss();
      },
    })
  ).current;

  function renderBrief(text: string) {
    const highlight = LANDING_HIGHLIGHT[win];
    return text.split(/(\[[^\]]+\])/g).map((part, i) => {
      if (part.startsWith('[') && part.endsWith(']')) {
        return <Text key={i} style={{ color: highlight }}>{part.slice(1,-1)}</Text>;
      }
      return <Text key={i}>{part}</Text>;
    });
  }

  const STATUS_H = Platform.OS === 'ios' ? 54 : (StatusBar.currentHeight ?? 24) + 8;

  return (
    <Animated.View style={{
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: LANDING_GRADIENTS[win],
      opacity: fadeAnim, zIndex: 100,
    }}>
      <View style={{ flex: 1 }} {...panResponder.panHandlers}>

        <View style={{ flex: 1, paddingTop: STATUS_H + 8, paddingHorizontal: 28 }}>

          {/* Logo */}
          <Text style={{ fontFamily: 'DMSerifDisplay_400Regular', fontSize: 36, letterSpacing: -0.8, color: '#0A0A0A', lineHeight: 42 }}>
            z<Text style={{ color: LANDING_AI_COLOURS[win] }}>a</Text>el<Text style={{ color: LANDING_AI_COLOURS[win] }}>i</Text>
          </Text>

          {/* Brief centred */}
          <View style={{ flex: 1, justifyContent: 'center', paddingBottom: 24 }}>
            <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 13, letterSpacing: 0.8, color: 'rgba(10,10,10,0.35)', marginBottom: 18 }}>
              {LANDING_GREETING[win]}
            </Text>
            {loading ? (
              <LandingDots colour={LANDING_HIGHLIGHT[win]}/>
            ) : (
              <Animated.View style={{ opacity: briefAnim }}>
                <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 26, lineHeight: 38, letterSpacing: -0.5, color: '#0A0A0A' }}>
                  {renderBrief(briefText)}
                </Text>
              </Animated.View>
            )}
          </View>
        </View>

        {/* Dots */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, paddingBottom: 28 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(10,10,10,0.16)' }}/>
          <View style={{ width: 20, height: 6, borderRadius: 3, backgroundColor: 'rgba(10,10,10,0.38)' }}/>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(10,10,10,0.16)' }}/>
        </View>

        <View style={{ height: Platform.OS === 'ios' ? 96 : 82 }}/>
      </View>

      {/* FAB — taps dismiss landing */}
      <ZaeliFAB
        activeButton={null}
        onDashboard={dismiss}
        onChat={dismiss}
        onChatKeyboard={dismiss}
        onMoreItem={dismiss}
        onMicResult={dismiss}
      />
    </Animated.View>
  );
}

function LandingDots({ colour }: { colour: string }) {
  const dots = React.useRef([0,1,2].map(() => new Animated.Value(0.25))).current;
  React.useEffect(() => {
    const anims = dots.map((dot, i) =>
      Animated.loop(Animated.sequence([
        Animated.delay(i * 160),
        Animated.timing(dot, { toValue: 1, duration: 300, easing: Easing.ease, useNativeDriver: true }),
        Animated.timing(dot, { toValue: 0.25, duration: 300, easing: Easing.ease, useNativeDriver: true }),
        Animated.delay(500 - i * 160),
      ]))
    );
    anims.forEach(a => a.start());
    return () => anims.forEach(a => a.stop());
  }, []);
  return (
    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', paddingVertical: 8 }}>
      {dots.map((op, i) => (
        <Animated.View key={i} style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colour, opacity: op }}/>
      ))}
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// ── CARD STYLES ────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════
const cardS = StyleSheet.create({
  // Calendar — slate
  cal: { backgroundColor:'#3A3D4A', borderRadius:18, padding:20 },
  // Weather
  wx:  { backgroundColor:'#A8D8F0', borderRadius:18, padding:16, width:115, flexShrink:0 },
  // Shopping
  shop:{ backgroundColor:'#D8CCFF', borderRadius:18, padding:16, flex:1 },
  // Actions
  act: { backgroundColor:'#F0DC80', borderRadius:18, padding:20 },
  // Dinner
  din: { backgroundColor:'#FAC8A8', borderRadius:18, padding:20 },

  // Shared header
  hdr:       { flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:12 },
  hdrActions:{ flexDirection:'row', alignItems:'center', gap:8 },

  // Eye labels
  eyeLt:   { fontFamily:'Poppins_700Bold', fontSize:12, letterSpacing:0.1, textTransform:'uppercase' as const, color:'rgba(255,255,255,0.5)', flex:1 },
  eyeDk:   { fontFamily:'Poppins_700Bold', fontSize:12, letterSpacing:0.1, textTransform:'uppercase' as const, color:'rgba(0,0,0,0.42)', flex:1 },
  eyeDkSm: { fontFamily:'Poppins_700Bold', fontSize:11, letterSpacing:0.1, textTransform:'uppercase' as const, color:'rgba(0,0,0,0.35)', marginBottom:6 },

  // Add buttons
  addBtnLt:    { backgroundColor:'rgba(255,255,255,0.2)', borderRadius:10, paddingVertical:6, paddingHorizontal:12 },
  addBtnTxtLt: { fontFamily:'Poppins_700Bold', fontSize:12, color:'rgba(255,255,255,0.85)' },
  addBtnDk:    { backgroundColor:'rgba(0,0,0,0.1)', borderRadius:10, paddingVertical:6, paddingHorizontal:12 },
  addBtnTxtDk: { fontFamily:'Poppins_700Bold', fontSize:12, color:'rgba(0,0,0,0.55)' },
  seeAllLt:    { fontFamily:'Poppins_600SemiBold', fontSize:12, color:'rgba(255,255,255,0.45)' },
  seeAllDk:    { fontFamily:'Poppins_600SemiBold', fontSize:12, color:'rgba(0,0,0,0.4)' },

  // Empty states
  emptyLt:   { fontFamily:'Poppins_400Regular', fontSize:16, color:'rgba(255,255,255,0.5)', fontStyle:'italic' as const, paddingVertical:10 },
  emptyDk:   { fontFamily:'Poppins_400Regular', fontSize:16, color:'rgba(0,0,0,0.38)', fontStyle:'italic' as const, paddingVertical:8 },
  emptyDkSm: { fontFamily:'Poppins_400Regular', fontSize:13, color:'rgba(0,0,0,0.38)', fontStyle:'italic' as const },

  // Calendar event rows
  tRow:    { flexDirection:'row', alignItems:'center', gap:10, marginBottom:13 },
  tTime:   { fontFamily:'Poppins_500Medium', fontSize:13, color:'rgba(255,255,255,0.65)', width:58, textAlign:'left' as const, flexShrink:0 },
  tDot:    { width:8, height:8, borderRadius:4, flexShrink:0 },
  tEv:     { fontFamily:'Poppins_400Regular', fontSize:17, color:'rgba(255,255,255,0.92)', flex:1 },
  tAv:     { width:30, height:30, borderRadius:15, alignItems:'center', justifyContent:'center', flexShrink:0 },
  tAvTxt:  { fontFamily:'Poppins_700Bold', fontSize:11, color:'#fff' },

  // Weather
  wxTemp:  { fontFamily:'DMSerifDisplay_400Regular', fontSize:34, color:'#1A1A1A', letterSpacing:-1, lineHeight:38, marginTop:4 },
  wxCond:  { fontFamily:'Poppins_400Regular', fontSize:13, color:'rgba(0,0,0,0.5)', marginTop:3 },
  wxExtra: { fontFamily:'Poppins_400Regular', fontSize:12, color:'rgba(0,0,0,0.42)', marginTop:6, lineHeight:16 },

  // Shopping
  shopItem:    { flexDirection:'row', alignItems:'center', gap:10, marginBottom:12 },
  shopDot:     { width:7, height:7, borderRadius:4, backgroundColor:'rgba(0,0,0,0.28)', flexShrink:0 },
  shopTxt:     { fontFamily:'Poppins_400Regular', fontSize:17, color:'#1A1A1A', flex:1 },
  shopFooter:  { flexDirection:'row', alignItems:'flex-end', justifyContent:'flex-end', marginTop:8 },
  shopCountLbl:{ fontFamily:'Poppins_400Regular', fontSize:11, color:'rgba(0,0,0,0.42)', marginRight:4, alignSelf:'flex-end', marginBottom:4 },
  shopCount:   { fontFamily:'Poppins_800ExtraBold', fontSize:32, color:'rgba(0,0,0,0.35)', letterSpacing:-1, lineHeight:36 },

  // Actions
  actCount:    { backgroundColor:'#806000', borderRadius:11, paddingHorizontal:9, paddingVertical:2 },
  actCountTxt: { fontFamily:'Poppins_700Bold', fontSize:12, color:'#fff' },
  actRow:      { flexDirection:'row', alignItems:'center', gap:10, marginBottom:12 },
  actChk:      { width:26, height:26, borderRadius:13, borderWidth:1.5, borderColor:'rgba(0,0,0,0.22)', flexShrink:0, alignItems:'center', justifyContent:'center' },
  actChkDone:  { backgroundColor:'rgba(0,0,0,0.18)', borderColor:'transparent' },
  actDot:      { width:8, height:8, borderRadius:4, flexShrink:0 },
  actTxt:      { fontFamily:'Poppins_400Regular', fontSize:17, color:'#1A1A1A', flex:1, lineHeight:23 },
  actWho:      { width:28, height:28, borderRadius:14, alignItems:'center', justifyContent:'center', flexShrink:0 },
  actWhoTxt:   { fontFamily:'Poppins_700Bold', fontSize:11, color:'#fff' },
  bdg:         { borderRadius:5, paddingVertical:3, paddingHorizontal:7, flexShrink:0 },
  bdgRem:      { backgroundColor:'rgba(255,69,69,0.12)' },
  bdgOvd:      { backgroundColor:'rgba(220,38,38,0.12)' },
  bdgTd:       { backgroundColor:'rgba(128,96,0,0.1)' },
  bdgTxt:      { fontFamily:'Poppins_700Bold', fontSize:9, textTransform:'uppercase' as const, letterSpacing:0.06 },
  actDivider:  { flexDirection:'row', alignItems:'center', gap:8, marginVertical:10 },
  actDivLine:  { flex:1, height:1, backgroundColor:'rgba(0,0,0,0.1)' },
  actDivLbl:   { fontFamily:'Poppins_700Bold', fontSize:10, letterSpacing:0.1, textTransform:'uppercase' as const, color:'rgba(0,0,0,0.38)' },

  // Dinner
  dinRow:      { flexDirection:'row', alignItems:'center', gap:12 },
  tOverflow:   { marginTop:4, paddingVertical:6 },
  tOverflowTxt:{ fontFamily:'Poppins_600SemiBold', fontSize:13, color:'rgba(255,255,255,0.55)' },
  dinIcon:     { fontSize:32, flexShrink:0, lineHeight:38 },
  dinName:     { fontFamily:'Poppins_800ExtraBold', fontSize:19, color:'#1A1A1A', letterSpacing:-0.4, lineHeight:24 },
  dinSub:      { fontFamily:'Poppins_400Regular', fontSize:14, color:'rgba(0,0,0,0.45)', marginTop:4 },
  dinTick:     { backgroundColor:'rgba(0,0,0,0.1)', borderRadius:8, paddingVertical:5, paddingHorizontal:10, flexShrink:0 },
  dinTickTxt:  { fontFamily:'Poppins_700Bold', fontSize:11, color:'rgba(0,0,0,0.5)' },
  dinNudge:    { backgroundColor:'rgba(0,0,0,0.07)', borderRadius:12, padding:14, marginBottom:2 },
  dinNudgeTxt: { fontFamily:'Poppins_400Regular', fontSize:16, color:'rgba(0,0,0,0.55)', textAlign:'center' as const },
  calOverflow: { fontFamily:'Poppins_600SemiBold', fontSize:13, color:'rgba(255,255,255,0.55)', paddingVertical:2 },
  dinFooter:   { marginTop:12, paddingTop:10, borderTopWidth:1, borderTopColor:'rgba(0,0,0,0.09)', flexDirection:'row', alignItems:'center', justifyContent:'space-between' },
  dinExpanded: { marginTop:10, paddingTop:8, borderTopWidth:1, borderTopColor:'rgba(0,0,0,0.09)', gap:8 },
  dinDayRow:   { flexDirection:'row', alignItems:'center', gap:8 },
  dinDayLbl:   { fontFamily:'Poppins_600SemiBold', fontSize:14, color:'rgba(0,0,0,0.42)', width:76, flexShrink:0 },
  dinDayMeal:  { fontFamily:'Poppins_400Regular', fontSize:15, color:'#1A1A1A', flex:1 },
  dinDayTick:  { fontFamily:'Poppins_700Bold', fontSize:12, color:'#0A7A3A', flexShrink:0 },
  dinDayBlank: { fontFamily:'Poppins_400Regular', fontSize:15, color:'rgba(0,0,0,0.3)', fontStyle:'italic' as const, flex:1 },
  dinDayWarn:  { fontSize:12, flexShrink:0 },
  dinFooterLbl:{ fontFamily:'Poppins_400Regular', fontSize:11, color:'rgba(0,0,0,0.38)' },
  dinFooterTap:{ fontFamily:'Poppins_700Bold', fontSize:12, color:'rgba(0,0,0,0.55)' },
});

// ── Main styles ────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex:1 },

  // Splash
  splashWrap:    { position:'absolute', top:0, left:0, right:0, bottom:0, backgroundColor:'#A8E8CC', alignItems:'center', justifyContent:'center' },
  splashOrb1:    { position:'absolute', width:420, height:420, borderRadius:210, backgroundColor:'rgba(255,255,255,0.18)', top:-140, right:-120 },
  splashOrb2:    { position:'absolute', width:300, height:300, borderRadius:150, backgroundColor:'rgba(255,255,255,0.12)', bottom:-100, left:-100 },
  splashGreeting:{ fontFamily:'Poppins_400Regular', fontSize:18, color:'rgba(10,10,10,0.55)', letterSpacing:0.1 },
  splashWordmark:{ fontFamily:'DMSerifDisplay_400Regular', fontSize:96, color:'#0A0A0A', letterSpacing:-4, lineHeight:100 },
  splashTagline: { fontFamily:'Poppins_500Medium', fontSize:12, color:'rgba(10,10,10,0.45)', letterSpacing:3, textTransform:'uppercase' as const },
  splashDots:    { alignItems:'center' },

  // Entry
  entryWrap:          { position:'absolute', top:0, left:0, right:0, bottom:0, backgroundColor:'#4D8BFF' },
  entryOrb2:          { position:'absolute', width:180, height:180, borderRadius:90, backgroundColor:'rgba(255,69,69,0.1)', bottom:160, left:-50, pointerEvents:'none' as any },
  entryContent:       { flex:1, paddingHorizontal:24, paddingTop:16, gap:10 },
  entryStarBox:       { width:44, height:44, borderRadius:13, backgroundColor:'rgba(255,255,255,0.18)', alignItems:'center', justifyContent:'center', alignSelf:'center', marginBottom:4 },
  entryGreeting1:     { fontFamily:'DMSerifDisplay_400Regular', fontSize:34, color:'#fff', letterSpacing:-0.5, lineHeight:40, textAlign:'center' as const },
  entryGreeting2:     { fontFamily:'DMSerifDisplay_400Regular', fontSize:28, color:'rgba(255,255,255,0.85)', letterSpacing:-0.4, lineHeight:34, textAlign:'center' as const, marginBottom:2 },
  entrySub:           { fontFamily:'Poppins_400Regular', fontSize:14, color:'rgba(255,255,255,0.55)', textAlign:'center' as const, marginBottom:4 },
  entryMicCard:       { flexDirection:'row', alignItems:'center', gap:14, backgroundColor:'rgba(255,123,107,0.22)', borderWidth:1.5, borderColor:'rgba(255,123,107,0.45)', borderRadius:20, padding:18 },
  entryMicIcon:       { width:52, height:52, borderRadius:26, alignItems:'center', justifyContent:'center', backgroundColor:'#FF4545', shadowColor:'#FF4545', shadowOpacity:0.45, shadowRadius:14, shadowOffset:{ width:0, height:4 }, flexShrink:0 },
  entryMicTitle:      { fontFamily:'Poppins_700Bold', fontSize:16, color:'#fff', marginBottom:3 },
  entryMicSub:        { fontFamily:'Poppins_400Regular', fontSize:12, color:'rgba(255,255,255,0.6)', lineHeight:18 },
  entryWaveStatic:    { flexDirection:'row', alignItems:'center', gap:3 },
  entryWaveBarStatic: { width:3.5, borderRadius:2, backgroundColor:'rgba(255,255,255,0.45)' },
  entryDivider:       { flexDirection:'row', alignItems:'center', gap:10 },
  entryDivLine:       { flex:1, height:1, backgroundColor:'rgba(255,255,255,0.15)' },
  entryDivTxt:        { fontFamily:'Poppins_400Regular', fontSize:11, color:'rgba(255,255,255,0.35)' },
  entryChips:         { flexDirection:'row', flexWrap:'wrap', gap:8 },
  entryChip:          { flexDirection:'row', alignItems:'center', gap:7, backgroundColor:'rgba(255,255,255,0.13)', borderWidth:1.5, borderColor:'rgba(255,255,255,0.22)', borderRadius:24, paddingVertical:10, paddingHorizontal:15 },
  entryChipEmoji:     { fontSize:15 },
  entryChipTxt:       { fontFamily:'Poppins_600SemiBold', fontSize:13, color:'rgba(255,255,255,0.92)' },
  entryRecordingWrap: { flex:1, alignItems:'center', justifyContent:'center', gap:18, paddingHorizontal:28 },
  entryListeningLbl:  { fontFamily:'DMSerifDisplay_400Regular', fontSize:34, color:'#fff', fontStyle:'italic' as const, textAlign:'center' as const },
  entryListeningSub:  { fontFamily:'Poppins_400Regular', fontSize:14, color:'rgba(255,255,255,0.5)', textAlign:'center' as const },
  entryMicRingWrap:   { position:'relative', width:110, height:110, alignItems:'center', justifyContent:'center' },
  entryMicRing1:      { position:'absolute', width:110, height:110, borderRadius:55, borderWidth:2, borderColor:'rgba(255,123,107,0.4)' },
  entryMicRing2:      { position:'absolute', width:110, height:110, borderRadius:55, borderWidth:2, borderColor:'rgba(255,123,107,0.22)' },
  entryMicBig:        { width:88, height:88, borderRadius:44, backgroundColor:'#FF4545', alignItems:'center', justifyContent:'center', shadowColor:'#FF4545', shadowOpacity:0.5, shadowRadius:20, shadowOffset:{ width:0, height:6 }, zIndex:2 },
  entryWaveWrap:      { flexDirection:'row', alignItems:'center', gap:5, height:60, width:'100%' as any, justifyContent:'center' },
  entryWaveBar:       { width:5, borderRadius:3, backgroundColor:'rgba(255,255,255,0.7)' },
  entryStopHint:      { fontFamily:'Poppins_400Regular', fontSize:14, color:'rgba(255,255,255,0.55)', textAlign:'center' as const },

  // Voice label
  voiceLabel:    { flexDirection:'row', alignItems:'center', gap:4, justifyContent:'flex-end', marginBottom:4 },
  voiceLabelTxt: { fontFamily:'Poppins_400Regular', fontSize:10 },

  // Top bar
  topBar:            { backgroundColor:'#FAF8F5' },
  topBarRow:         { flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingHorizontal:20, paddingTop:4, paddingBottom:10 },
  topBarDivider:     { height:1, backgroundColor:'rgba(10,10,10,0.08)' },
  topBarRight:       { flexDirection:'row', alignItems:'center', gap:10 },
  topBarChannelName: { fontFamily:'Poppins_700Bold', fontSize:18, color:'rgba(10,10,10,0.35)' },
  logoWord:          { fontFamily:'Poppins_800ExtraBold', fontSize:40, color:'#0A0A0A', letterSpacing:-1.5, lineHeight:46 },
  avatar:            { width:34, height:34, borderRadius:17, backgroundColor:'#4D8BFF', alignItems:'center', justifyContent:'center' },
  avatarTxt:         { fontFamily:'Poppins_700Bold', fontSize:13, color:'#fff' },
  heroLine:          { fontFamily:'DMSerifDisplay_400Regular', fontSize:26, color:'#0A0A0A', lineHeight:36, letterSpacing:-0.4 },

  // Hero (scrollable) + card stack
  heroSection:    { backgroundColor:'#FAF8F5', paddingHorizontal:18, paddingTop:16, paddingBottom:14 },
  overviewToggle: { flexDirection:'row', alignItems:'center', gap:10, paddingHorizontal:18, paddingVertical:8, marginTop:4 },
  overviewLine:   { flex:1, height:1, backgroundColor:'rgba(0,0,0,0.10)' },
  overviewBtn:    { flexDirection:'row', alignItems:'center', gap:5, backgroundColor:'rgba(0,0,0,0.055)', borderRadius:20, paddingVertical:5, paddingHorizontal:12 },
  overviewBtnTxt: { fontFamily:'Poppins_700Bold', fontSize:11, color:'rgba(0,0,0,0.45)' },
  overviewChevron:{ fontFamily:'Poppins_700Bold', fontSize:10, color:'rgba(0,0,0,0.38)' },
  // Brief chips — exact match to zaeli-home-cold-open-v1.html spec
  briefChipsRow:     { flexDirection:'row', flexWrap:'wrap', gap:6, marginTop:14 },
  briefChip:         { borderWidth:1.5, borderColor:'rgba(0,0,0,0.12)', borderRadius:20, paddingVertical:5, paddingHorizontal:12, backgroundColor:'#fff' },
  briefChipAccent:   { backgroundColor:'#A8D8F0', borderColor:'transparent' },
  briefChipTxt:      { fontFamily:'Poppins_600SemiBold', fontSize:11, color:'rgba(0,0,0,0.55)' },
  briefChipAccentTxt:{ color:'rgba(0,0,0,0.70)' },
  cardStack:      { paddingHorizontal:14, paddingTop:4, paddingBottom:4, gap:10 },
  cardChatDivider:{ flexDirection:'row', alignItems:'center', marginHorizontal:18, marginTop:4, marginBottom:14, gap:10 },
  dateLine2:      { flex:1, height:1 },
  dateLabel2:     { fontFamily:'Poppins_600SemiBold', fontSize:9, letterSpacing:1.2, textTransform:'uppercase' as const },

  // KAV + scroll
  kavWrap:       { flex:1 },
  scrollWrap:    { flex:1, position:'relative' },
  scroll:        { flex:1 },
  scrollContent: { paddingBottom:150 },

  // Scroll arrows (locked spec)
  scrollArrowPair:{ position:'absolute', bottom:110, right:16, flexDirection:'row', gap:8, zIndex:50 },
  scrollArrowBtn: { width:38, height:38, borderRadius:19, backgroundColor:'rgba(10,10,10,0.40)', alignItems:'center', justifyContent:'center' },

  // Zaeli message
  zaeliMsgWrap: { marginBottom:6, paddingHorizontal:18 },
  zEyebrow:     { flexDirection:'row', alignItems:'center', gap:5, marginBottom:6, marginTop:0 },
  zStar:        { width:16, height:16, borderRadius:5, alignItems:'center', justifyContent:'center', flexShrink:0 },
  zName:        { fontFamily:'Poppins_700Bold', fontSize:10, letterSpacing:0.2 },
  zTs:          { fontFamily:'Poppins_400Regular', fontSize:9, marginLeft:'auto' as any },
  zTsOnly:      { fontFamily:'Poppins_400Regular', fontSize:10, marginBottom:5 },
  zaeliMsgText: { fontFamily:'Poppins_400Regular', fontSize:17, lineHeight:27, letterSpacing:-0.1 },
  zaeliIconRow: { flexDirection:'row', alignItems:'center', marginTop:7, gap:2 },

  // Dots
  dotsRow: { flexDirection:'row', gap:5, alignItems:'center', paddingVertical:4 },
  dot:     { width:7, height:7, borderRadius:4 },

  // Quick replies
  quickRepliesWrap: { marginTop:10 },
  qrChips:          { flexDirection:'row', flexWrap:'wrap', gap:6 },
  qrChip:           { borderWidth:1.5, borderRadius:20, paddingVertical:6, paddingHorizontal:12, backgroundColor:'white' },
  qrChipTxt:        { fontFamily:'Poppins_400Regular', fontSize:13, color:'rgba(10,10,10,0.65)' },

  // Calendar portal chip
  calPortalChip:    { borderWidth:1.5, borderRadius:20, paddingVertical:6, paddingHorizontal:12, backgroundColor:CAL_BG, borderColor:CAL_BG },
  calPortalChipTxt: { fontFamily:'Poppins_600SemiBold', fontSize:13, color:'#0A0A0A' },

  // User bubble
  userMsgWrap: { alignItems:'flex-end', marginBottom:6, paddingHorizontal:18 },
  userBubble:  { borderRadius:16, borderBottomRightRadius:3, paddingHorizontal:13, paddingVertical:9, maxWidth:'82%' as any },
  userMsgText: { fontFamily:'Poppins_400Regular', fontSize:17, lineHeight:27 },
  msgImage:    { width:'100%' as any, height:180, borderRadius:12, marginBottom:6 },
  msgTime:     { fontFamily:'Poppins_400Regular', fontSize:10 },
  userIconRow: { flexDirection:'row', alignItems:'center', marginTop:4, gap:2, justifyContent:'flex-end' },
  iconBtn:     { width:26, height:26, alignItems:'center', justifyContent:'center', borderRadius:6 },

  // Input area
  // Domain pill bar styles
  // domainPillRow: replaced by horizontal ScrollView inline
  // Domain pill — Option D: padding 5/10/5/8, gap 5, borderRadius 20
  pillScroll:         { marginBottom:8 },
  pillScrollContent:  { flexDirection:'row', gap:6 },
  domainPill:         { flexDirection:'row', alignItems:'center', gap:6, borderRadius:20, paddingTop:9, paddingBottom:9, paddingLeft:11, paddingRight:13, backgroundColor:'#fff', borderWidth:1, borderColor:'rgba(0,0,0,0.10)', flexShrink:0 },
  domainPillLbl:      { fontFamily:'Poppins_600SemiBold', fontSize:11, color:'rgba(0,0,0,0.45)' },

  inputArea:   {
    position:'absolute', bottom:0, left:0, right:0,
    paddingHorizontal:14,
    paddingBottom:Platform.OS==='ios'?16:8,
    paddingTop:10,
  },
  inputAreaKb: { paddingBottom:Platform.OS==='ios'?6:4 },

  // ── Floating chat input bar — replaces FAB when keyboard up ──
  chatInputWrap: {
    position:'absolute',
    bottom:0,
    left:0,
    right:0,
    paddingHorizontal:14,
    paddingBottom:Platform.OS==='ios'?24:14,
    paddingTop:8,
    backgroundColor:'transparent',   // no banner — content visible behind
  },
  chatInputPill: {
    flexDirection:'row',
    alignItems:'center',
    gap:4,
    backgroundColor:'#FFFFFF',
    borderRadius:36,
    padding:10,
    borderWidth:1,
    borderColor:'rgba(220,220,220,0.6)',
    shadowColor:'#000',
    shadowOpacity:0.14,
    shadowRadius:28,
    shadowOffset:{ width:0, height:10 },
    elevation:14,
    minHeight:78,
  },
  chatInputMicBtn: {
    width:36,
    height:36,
    borderRadius:18,
    alignItems:'center' as const,
    justifyContent:'center' as const,
    backgroundColor:'rgba(10,10,10,0.06)',
    flexShrink:0,
  },

  // Image preview
  imagePreviewWrap:   { marginBottom:8, alignSelf:'flex-start', position:'relative' },
  imagePreview:       { width:80, height:80, borderRadius:10 },
  imagePreviewRemove: { position:'absolute', top:-6, right:-6, width:22, height:22, borderRadius:11, backgroundColor:'#0A0A0A', alignItems:'center', justifyContent:'center' },

  // Input bar
  barPill:    { flexDirection:'row', alignItems:'center', gap:8, borderRadius:30, paddingVertical:14, paddingHorizontal:16, borderWidth:1, shadowColor:'#000', shadowOpacity:0.07, shadowRadius:16, shadowOffset:{ width:0, height:-2 }, elevation:4 },
  barBtn:     { width:34, height:34, alignItems:'center', justifyContent:'center' },
  barMicBtn:  { width:32, height:32, alignItems:'center', justifyContent:'center', flexShrink:0 },
  barSep:     { width:1, height:18, flexShrink:0 },
  // Bar — absolute inside flex View, floats over scroll, no background
  barFloat: {
    position:'absolute',
    bottom:0, left:0, right:0,
    paddingHorizontal:14,
    paddingBottom:Platform.OS === 'ios' ? 24 : 14,
  },
  barPill: {
    flexDirection:'row',
    alignItems:'center',
    width:'100%' as any,                      // full width within paddingHorizontal
    gap:4,                                    // FAB_GAP
    backgroundColor:'#FFFFFF',                 // solid white — no transparency
    borderRadius:36,                          // FAB borderRadius
    padding:10,                               // FAB_PAD
    borderWidth:1,
    borderColor:'rgba(220,220,220,0.6)',
    shadowColor:'#000',
    shadowOpacity:0.14,
    shadowRadius:28,
    shadowOffset:{ width:0, height:10 },
    elevation:14,
  },
  barBtn:     { width:58, height:58, borderRadius:22, alignItems:'center', justifyContent:'center', flexShrink:0 },
  barInput:   { flex:1, fontFamily:'Poppins_400Regular', fontSize:17, color:'#0A0A0A', maxHeight:100, paddingVertical:0 },
  barWaveBtn: { width:40, height:40, borderRadius:20, alignItems:'center', justifyContent:'center' },
  waveRow:    { flexDirection:'row', alignItems:'center', gap:3 },
  waveBar:    { width:3.5, height:18, borderRadius:2, backgroundColor:'#fff' },
  barSend:    { width:58, height:58, borderRadius:22, backgroundColor:'#FF4545', alignItems:'center', justifyContent:'center', flexShrink:0 }, // legacy — using barBtn now

  // Sheet
  sheetOverlay:   { flex:1, backgroundColor:'rgba(0,0,0,0.4)', justifyContent:'flex-end' },
  sheet:          { backgroundColor:'#FAF8F5', borderTopLeftRadius:26, borderTopRightRadius:26, paddingHorizontal:20, shadowColor:'#000', shadowOpacity:0.2, shadowRadius:20, shadowOffset:{ width:0, height:-4 } },
  sheetHandle:    { width:36, height:4, borderRadius:2, backgroundColor:'rgba(10,10,10,0.14)', alignSelf:'center', marginTop:12, marginBottom:4 },
  sheetHeader:    { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingVertical:18 },
  sheetCloseBtn:  { width:44, height:44, borderRadius:22, backgroundColor:'rgba(10,10,10,0.07)', alignItems:'center', justifyContent:'center' },
  sheetTitle:     { fontFamily:'Poppins_700Bold', fontSize:17, color:'#0A0A0A' },
  sheetTiles:     { flexDirection:'row', gap:12, marginBottom:10 },
  sheetTile:      { flex:1, backgroundColor:'rgba(10,10,10,0.05)', borderRadius:20, paddingVertical:30, alignItems:'center', justifyContent:'center', gap:12 },
  sheetTileLabel: { fontFamily:'Poppins_500Medium', fontSize:14, color:'#0A0A0A' },

  // Live camera
  liveCameraOverlay: { position:'absolute', top:0, left:0, right:0, bottom:0, backgroundColor:'#111', zIndex:200 },
  liveCameraTop:     { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:16, paddingVertical:12 },
  liveCameraClose:   { width:36, height:36, borderRadius:18, backgroundColor:'rgba(255,255,255,0.15)', alignItems:'center', justifyContent:'center' },
  liveCameraTitle:   { fontFamily:'Poppins_700Bold', fontSize:15, color:'#fff' },
  liveCameraBody:    { flex:1, alignItems:'center', justifyContent:'center', padding:32, gap:24 },
  liveCameraHint:    { fontFamily:'Poppins_400Regular', fontSize:15, color:'rgba(255,255,255,0.55)', textAlign:'center' as const, lineHeight:25 },
  liveCameraBtn:     { backgroundColor:HOME_AI, borderRadius:16, paddingVertical:15, paddingHorizontal:30 },
  liveCameraBtnTxt:  { fontFamily:'Poppins_700Bold', fontSize:15, color:INK },

  // Mic overlay
  micOverlay:    { position:'absolute', top:0, left:0, right:0, bottom:0, backgroundColor:'rgba(245,234,216,0.88)', alignItems:'center', justifyContent:'center', zIndex:100 },
  micCard:       { backgroundColor:'#fff', borderRadius:28, paddingVertical:32, paddingHorizontal:36, alignItems:'center', gap:18, shadowColor:'#000', shadowOpacity:0.10, shadowRadius:24, shadowOffset:{ width:0, height:8 }, borderWidth:1, borderColor:'rgba(10,10,10,0.06)' },
  micTimer:      { fontFamily:'Poppins_600SemiBold', fontSize:30, color:'#0A0A0A', letterSpacing:1 },
  micLabel:      { fontFamily:'Poppins_400Regular', fontSize:13, color:'rgba(10,10,10,0.40)' },
  micStopBtn:    { width:60, height:60, borderRadius:30, backgroundColor:'#FF4545', alignItems:'center', justifyContent:'center', shadowColor:'#FF4545', shadowOpacity:0.35, shadowRadius:14, shadowOffset:{ width:0, height:4 } },
  micStopSquare: { width:20, height:20, borderRadius:4, backgroundColor:'#fff' },
  micCancel:     { fontFamily:'Poppins_400Regular', fontSize:13, color:'rgba(10,10,10,0.35)' },

  // EventCard
  calCardsWrap: { gap:8, marginTop:10, marginBottom:4 },
  evCard:       { borderRadius:14, padding:14, marginBottom:0 },
  evCardInner:  { flexDirection:'row', alignItems:'flex-start', gap:10 },
  evTitle:      { fontFamily:'Poppins_600SemiBold', fontSize:15, color:'#0A0A0A', letterSpacing:-0.2, marginBottom:3 },
  evTime:       { fontFamily:'Poppins_500Medium', fontSize:13, marginBottom:2 },
  evLocation:   { fontFamily:'Poppins_400Regular', fontSize:12, color:'rgba(0,0,0,0.5)', marginTop:2 },
  evAvatarCol:  { flexDirection:'column', gap:4, alignItems:'center', justifyContent:'flex-start', flexShrink:0 },
  evAvatarGrid: { flexDirection:'row', flexWrap:'wrap', gap:3, width:44, justifyContent:'flex-end' },
  evAv:         { alignItems:'center', justifyContent:'center' },
  evAvTxt:      { fontFamily:'Poppins_700Bold', color:'#fff' },

  // EventDetailModal
  modalHdr:      { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:20, paddingVertical:14, borderBottomWidth:1, borderBottomColor:'rgba(0,0,0,0.07)' },
  modalCancel:   { fontFamily:'Poppins_400Regular', fontSize:15, color:'rgba(10,10,10,0.5)' },
  modalTitle:    { fontFamily:'Poppins_700Bold', fontSize:16, color:'#0A0A0A' },
  modalSave:     { fontFamily:'Poppins_600SemiBold', fontSize:15, color:HOME_AI },
  detailRow:     { flexDirection:'row', alignItems:'flex-start', gap:12, paddingHorizontal:20, paddingVertical:12, borderBottomWidth:1, borderBottomColor:'rgba(0,0,0,0.06)' },
  detailIcon:    { fontSize:18, width:26, textAlign:'center' as const },
  detailTxt:     { fontFamily:'Poppins_400Regular', fontSize:15, color:'#0A0A0A', flex:1, lineHeight:22 },
  deleteBtn:     { backgroundColor:'rgba(232,55,75,0.08)', borderRadius:14, paddingVertical:14, alignItems:'center' },
  deleteBtnConfirm:{ backgroundColor:'rgba(232,55,75,0.18)' },
  deleteBtnTxt:  { fontFamily:'Poppins_600SemiBold', fontSize:15, color:'#E8374B' },
  gcBlock:       { backgroundColor:'rgba(0,0,0,0.03)', borderRadius:14, marginHorizontal:20, marginBottom:2, overflow:'hidden' },
  gcRow:         { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:16, paddingVertical:14 },
  gcRowLbl:      { fontFamily:'Poppins_400Regular', fontSize:15, color:'#0A0A0A' },
  gcRowRight:    { flexDirection:'row', alignItems:'center' },
  gcRowRightTxt: { fontFamily:'Poppins_500Medium', fontSize:15, color:'rgba(10,10,10,0.5)' },
  gcSep:         { height:1, backgroundColor:'rgba(0,0,0,0.06)', marginHorizontal:16 },
  gcPill:        { backgroundColor:'rgba(0,0,0,0.06)', borderRadius:10, paddingVertical:6, paddingHorizontal:12 },
  gcPillTxt:     { fontFamily:'Poppins_500Medium', fontSize:14, color:'#0A0A0A' },
  gcSubInput:    { fontFamily:'Poppins_400Regular', fontSize:15, color:'#0A0A0A', paddingHorizontal:16, paddingVertical:12 },
  gcTitleInput:  { fontFamily:'Poppins_600SemiBold', fontSize:18, color:'#0A0A0A', paddingHorizontal:16, paddingVertical:16 },
  memberRow:     { flexDirection:'row', alignItems:'center', gap:12, padding:14, borderRadius:12, borderWidth:1.5, borderColor:'rgba(0,0,0,0.07)', backgroundColor:'#fff' },
  memberDot:     { width:12, height:12, borderRadius:6 },
  memberName:    { fontFamily:'Poppins_500Medium', fontSize:15, color:'#0A0A0A', flex:1 },
  memberCheck:   { width:22, height:22, borderRadius:11, borderWidth:1.5, borderColor:'rgba(0,0,0,0.2)', alignItems:'center', justifyContent:'center' },
});
