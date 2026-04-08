/**
 * dashboard.tsx — Zaeli Dashboard · Option A
 * 7 April 2026 — Phase 6 v3: wttr.in weather API
 *
 * Changes this pass:
 * - Weather switched from Open-Meteo to wttr.in (faster, more reliable)
 * - mapWttrCode() translates wttr.in codes to existing WeatherIcon logic
 * - All other Phase 6 fixes retained (timeout, cards animate independently)
 *
 * Card order (FIXED):
 *   1. Calendar    — full width
 *   2. Dinner      — full width
 *   3. Weather | Zaeli Noticed — side by side
 *   4. Shopping    — full width
 *   5. Actions     — full width
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Animated, Easing,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { useFocusEffect, useRouter } from 'expo-router';
import { Audio } from 'expo-av';
import { supabase } from '../../lib/supabase';
import ZaeliFAB from '../components/ZaeliFAB';
import { setPendingChatContext } from '../../lib/navigation-store';
import Svg, { Polygon } from 'react-native-svg';

// ── Constants ─────────────────────────────────────────────────────────────────
const FAMILY_ID   = '00000000-0000-0000-0000-000000000001';
const WEATHER_LAT = -26.39;
const WEATHER_LON = 153.03;
const GPT_MINI    = 'gpt-4o-mini';
const OPENAI_KEY  = process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? '';

const FAMILY_MEMBERS = [
  { id:'1', name:'Anna',  color:'#FF7B6B' },
  { id:'2', name:'Rich',  color:'#4D8BFF' },
  { id:'3', name:'Poppy', color:'#A855F7' },
  { id:'4', name:'Gab',   color:'#22C55E' },
  { id:'5', name:'Duke',  color:'#F59E0B' },
];

// ── Word of the Day ───────────────────────────────────────────────────────────
const WOTD_LIST = [
  'ephemeral','luminous','serendipity','melancholy','ineffable','solitude','resilience',
  'wanderlust','ethereal','eloquent','tenacity','labyrinth','vivacious','sanguine',
  'eloquence','zenith','halcyon','petrichor','sonder','hiraeth','vellichor',
  'fernweh','meraki','hygge','ubuntu','lagom','ikigai','yugen','komorebi',
  'psithurism','eunoia','chrysalism','liberosis','onism','ellipsism','occhiolism',
  'altruistic','benevolent','candour','dauntless','ebullient','fastidious','gregarious',
  'idyllic','jubilant','loquacious','magnanimous','nuanced','opulent',
  'perspicacious','quixotic','radiant','sagacious','tenacious','ubiquitous','valiant',
  'whimsical','xenial','zealous','abscond','bellicose','cacophony','debonair',
  'effervescent','fatuous','garrulous','hapless','impetuous','jocular','kinetic','lithe',
  'maverick','nebulous','obstinate','pensive','querulous','raucous','sycophant','turbulent',
  'umbrage','verbose','wistful','xenophile','zephyr','aplomb','bucolic','cadence',
  'diffident','facetious','galvanise','hubris','incandescent','jejune','kaleidoscope',
  'languid','maudlin','nonchalant','oblivion','palatial','quintessential','rapturous','stoic',
  'transcendent','unfettered','visceral','whimsy','zeitgeist','acumen',
  'blithe','cogent','deft','eerie','flamboyant','glib','haughty','iridescent','jubilee',
  'kinship','laconic','mercurial','nascent','ominous','paragon','quaint','reverie','serene',
  'tranquil','verdant','wondrous','exquisite','ardour',
  'bliss','clarity','daring','empathy','fervour','grace','harmony','integrity',
  'kindness','meaning','nurture','optimism','passion','renewal','strength',
  'trust','unity','vigour','wisdom','courage','dignity','elegance','freedom','grit',
  'honour','imagination','justice','knowledge','legacy','mindfulness','novelty','openness',
  'patience','quality','rigour','sincerity','truth','understanding','virtue','wonder',
  'excellence','abundance','beauty','creativity','depth','enthusiasm',
  'flourish','gratitude','humility','insight','liberty','mastery',
  'nobility','originality','purpose','quietude','simplicity',
  'unwavering','vibrant','warmth','ambitious','boldness','curiosity',
  'dedication','empowerment','focus','generosity','honesty','inspiration',
  'luminance','momentum','observant','persevere','reflective','steadfast',
  'uplifting','versatile','wholesome','exuberant','zestful','accomplish',
  'cherish','discover','evolve','kindle','manifest','overcome','prevail',
  'radiate','strive','thrive','venture','explore','awaken','blossom',
  'cultivate','dream','embrace','forge','guide','harmonise','illuminate','innovate',
  'lead','motivate','navigate','pioneer','quest','rise','soar',
  'transform','uplift','validate','achieve','build',
  'connect','develop','energise','fulfil','generate','heal','inspire',
  'lift','move','nourish','prosper','restore','spark','teach',
  'unite','welcome','adapt','breathe','create',
  'define','engage','ground','invest','journey','listen',
  'make','notice','offer','protect','renew','serve',
  'use','voice','weave','express','begin','choose','expand','flow','give','hold',
  'ignite','love','marvel','name','observe','play','reach','share','tell',
  'pellucid','susurrus','lambent','sempiternal','palimpsest','susurration',
  'apricity','sillage','kenopsia','jouissance','flaneur','bricolage',
  'denouement','leitmotif','limerence','numinous','ennui','schadenfreude','weltanschauung',
  'saudade','toska','cafune','litost','sobremesa',
  'gigil','forelsket','jayus','iktsuarpok','wabi','kintsugi','kokoro',
  'aware','shokunin','gaman','amae','komorebi','haiku','yugen',
  'frisson','retrouvailles','kairos','eudaimonia','ataraxia','aponia',
  'dialectic','phenomenal','noumenal','liminal',
  'apocryphal','byzantine','labyrinthine','mercurial','protean','chimerical',
  'gossamer','iridescent','diaphanous','translucent',
  'mellifluous','euphonious','dulcet','sonorous','plangent','resonant',
  'epiphany','revelation','illumination','awakening','enlightenment',
  'serenity','equanimity','composure','aplomb','sangfroid',
  'perspicacious','sagacious','sapient','discerning','astute','shrewd',
  'ebullient','exuberant','vivacious','buoyant','blithe',
  'melancholy','elegiac','lachrymose','plaintive','dolorous','lugubrious',
  'quixotic','chivalrous','gallant','valiant','intrepid','dauntless',
  'magnanimous','munificent','philanthropic','beneficent','noble',
  'recondite','esoteric','arcane','abstruse','cryptic','enigmatic',
  'propitious','auspicious','felicitous','fortuitous','serendipitous',
  'incandescent','resplendent','lustrous','gleaming','scintillating',
  'halcyon','idyllic','pastoral','arcadian','elysian','paradisiacal',
];

function getWordOfTheDay(): string {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return WOTD_LIST[dayOfYear % WOTD_LIST.length];
}

// ── Date helpers ──────────────────────────────────────────────────────────────
function getTodayLabel(): string {
  return new Date().toLocaleDateString('en-AU', { weekday:'short', day:'numeric', month:'short' });
}

// ── Time helpers ──────────────────────────────────────────────────────────────
function isoToMinutes(t?: string | null): number {
  if (!t) return -1;
  const timePart = t.includes('T') ? t.split('T')[1] : t.split(' ')[1] || '';
  if (!timePart) return -1;
  const [hStr, mStr] = timePart.split(':');
  const h = parseInt(hStr, 10); const m = parseInt(mStr, 10);
  if (isNaN(h) || isNaN(m)) return -1;
  return h * 60 + m;
}
function nowMinutes(): number {
  const n = new Date(); return n.getHours() * 60 + n.getMinutes();
}
function isEventPast(ev: any): boolean {
  if (!ev.start_time) return false;
  const evMins = isoToMinutes(ev.start_time);
  if (evMins < 0) return false;
  return evMins < nowMinutes();
}

// ── Zaeli voice headlines ─────────────────────────────────────────────────────
function calHeadline(upcomingCount: number, showTomorrow: boolean, hadPastEvents: boolean): string {
  if (showTomorrow) {
    if (upcomingCount === 0) return 'All clear tomorrow.';
    if (upcomingCount === 1) return 'One thing on tomorrow.';
    if (upcomingCount === 2) return 'Two things on tomorrow.';
    return `${upcomingCount} things on tomorrow.`;
  }
  if (upcomingCount === 0) {
    if (hadPastEvents) return new Date().getHours() < 17 ? 'All clear for the afternoon.' : 'All clear for the evening.';
    return 'All clear today.';
  }
  if (upcomingCount === 1) return 'One thing still to go.';
  if (upcomingCount === 2) return 'Two things still to go.';
  return `${upcomingCount} things on today.`;
}
function shopHeadline(count: number): string {
  if (count === 0) return 'Shopping list is clear.';
  if (count === 1) return 'One item on the shopping list.';
  if (count === 2) return 'Two items on the shopping list.';
  return `${count} items on the shopping list.`;
}
function actionsHeadline(count: number, isEvening: boolean): string {
  if (isEvening) {
    if (count === 0) return 'Clear plate tonight.';
    if (count === 1) return 'One thing still on your plate.';
    return `${count} things still on your plate.`;
  }
  if (count === 0) return 'Nothing on your plate.';
  if (count === 1) return 'One thing on your plate.';
  return `${count} things on your plate.`;
}
function dinnerHeadline(mealName: string | null, showTomorrow: boolean): string {
  if (!mealName) return showTomorrow ? 'Nothing planned for dinner tomorrow.' : 'Nothing planned for dinner.';
  return showTomorrow ? `${mealName} for dinner tomorrow.` : `${mealName} for dinner tonight.`;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function localDateStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function localDatePlusDays(n: number) {
  const d = new Date(); d.setDate(d.getDate() + n); return localDateStr(d);
}
function fmtTime(t?: string | null): string {
  if (!t) return '';
  const timePart = t.includes('T') ? t.split('T')[1] : t.split(' ')[1] || '';
  if (!timePart) return '';
  const [hStr, mStr] = timePart.split(':');
  const h = parseInt(hStr, 10); const m = parseInt(mStr, 10);
  if (isNaN(h) || isNaN(m)) return '';
  const ampm = h >= 12 ? 'pm' : 'am';
  const h12  = h === 0 ? 12 : h > 12 ? h-12 : h;
  return `${h12}:${String(m).padStart(2,'0')} ${ampm}`;
}

// ── Weather helpers ───────────────────────────────────────────────────────────
function weatherCondition(code: number): string {
  if (code === 0) return 'Clear';
  if (code <= 3)  return 'Partly cloudy';
  if (code <= 48) return 'Foggy';
  if (code <= 67) return 'Rain';
  if (code <= 82) return 'Showers';
  return 'Stormy';
}
function weatherType(code: number): 'sunny'|'partly'|'cloudy'|'rain'|'storm' {
  if (code === 0) return 'sunny';
  if (code <= 2)  return 'partly';
  if (code <= 48) return 'cloudy';
  if (code <= 82) return 'rain';
  return 'storm';
}
function weatherExtra(code: number, windspeed: number): string {
  if (code === 0 && windspeed > 15) return 'Breezy';
  if (code === 0) return 'Perfect day';
  if (code <= 2)  return windspeed > 20 ? 'Windy' : 'Nice day';
  if (code <= 48) return 'Jacket handy';
  if (code <= 67) return 'Umbrella needed';
  return 'Stay dry';
}

// ── wttr.in code → internal code for WeatherIcon/weatherExtra ────────────────
function mapWttrCode(code: number): number {
  if (code === 113) return 0;          // Sunny → clear
  if (code === 116) return 2;          // Partly cloudy
  if (code === 119 || code === 122) return 3;  // Cloudy/overcast
  if (code >= 143 && code <= 248) return 45;   // Fog/mist
  if (code >= 263 && code <= 299) return 61;   // Light rain/drizzle
  if (code >= 302 && code <= 321) return 65;   // Moderate/heavy rain
  if (code >= 323 && code <= 377) return 71;   // Snow/sleet
  if (code >= 386 && code <= 395) return 95;   // Thunderstorm
  return 0;
}

function getMealEmoji(name: string): string {
  const n = (name || '').toLowerCase();
  if (/pasta|bolognese|spaghetti/.test(n)) return '🍝';
  if (/pizza/.test(n)) return '🍕';
  if (/burger/.test(n)) return '🍔';
  if (/taco|mexican|burrito/.test(n)) return '🌮';
  if (/sushi|japanese/.test(n)) return '🍣';
  if (/stir.?fry|noodle|fried rice/.test(n)) return '🍜';
  if (/roast|lamb|chicken|pork/.test(n)) return '🍗';
  if (/salad|veg/.test(n)) return '🥗';
  if (/fish|salmon|tuna/.test(n)) return '🐟';
  if (/curry/.test(n)) return '🍛';
  if (/soup|stew/.test(n)) return '🍲';
  if (/bbq|grill/.test(n)) return '🍖';
  return '🍽';
}
function getEventEmoji(title: string): string {
  const t = title.toLowerCase();
  if (/soccer|football|footy/.test(t)) return '⚽';
  if (/danc|ballet/.test(t)) return '💃';
  if (/swim|pool/.test(t)) return '🏊';
  if (/gym|workout/.test(t)) return '🏋️';
  if (/tennis/.test(t)) return '🎾';
  if (/netball|basket/.test(t)) return '🏀';
  if (/school|class|tutor/.test(t)) return '🏫';
  if (/run|jog/.test(t)) return '🏃';
  return '';
}
function todoPriorityColor(todo: any): string {
  const today = localDateStr();
  const due = todo.due_date || null;
  if (todo.priority === 'urgent' || (due && due < today)) return '#FF4545';
  if (due && due === today) return '#F59E0B';
  if (todo.priority === 'high') return '#F59E0B';
  return 'rgba(0,0,0,0.18)';
}
function todoBadge(todo: any): { label:string; style:'rem'|'ovd' } | null {
  const today = localDateStr();
  const due = todo.due_date || null;
  if (due && due < today) return { label:'Overdue', style:'ovd' };
  if (todo.reminder_type === 'reminder') return { label:'Reminder', style:'rem' };
  return null;
}

// ── Interfaces ────────────────────────────────────────────────────────────────
interface WeatherData { temp:number; condition:string; code:number; windspeed:number; }
interface CardData {
  todayEvents:any[]; tomorrowEvents:any[];
  shopItems:any[]; shopCount:number;
  todos:any[]; meals:any[]; weather:WeatherData|null;
}
interface Notice { text:string; tag:string; color:string; }
type CardKey = 'calendar'|'dinner'|'weather'|'wotd'|'shopping'|'actions'|null;

// ── SVG Play icon ─────────────────────────────────────────────────────────────
function PlayIcon({ size = 22, color = '#FF4545' }: { size?:number; color?:string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Polygon points="5,3 19,12 5,21" fill={color}/>
    </Svg>
  );
}

// ── Animated weather icon ─────────────────────────────────────────────────────
function WeatherIcon({ type }: { type:'sunny'|'partly'|'cloudy'|'rain'|'storm' }) {
  const pulse = useRef(new Animated.Value(1)).current;
  const drift = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let anim: Animated.CompositeAnimation | null = null;
    if (type === 'sunny') {
      anim = Animated.loop(Animated.sequence([
        Animated.timing(pulse, { toValue:1.15, duration:1800, easing:Easing.inOut(Easing.ease), useNativeDriver:true }),
        Animated.timing(pulse, { toValue:1,    duration:1800, easing:Easing.inOut(Easing.ease), useNativeDriver:true }),
      ]));
    } else if (type === 'partly' || type === 'cloudy') {
      anim = Animated.loop(Animated.sequence([
        Animated.timing(drift, { toValue:3,  duration:2200, easing:Easing.inOut(Easing.ease), useNativeDriver:true }),
        Animated.timing(drift, { toValue:-3, duration:2200, easing:Easing.inOut(Easing.ease), useNativeDriver:true }),
      ]));
    }
    anim?.start();
    return () => anim?.stop();
  }, [type]);
  if (type === 'sunny') return <Animated.Text style={{ fontSize:28, transform:[{scale:pulse}] }}>☀️</Animated.Text>;
  if (type === 'partly') return <Animated.Text style={{ fontSize:28, transform:[{translateX:drift}] }}>⛅</Animated.Text>;
  if (type === 'cloudy') return <Animated.Text style={{ fontSize:28, transform:[{translateX:drift}] }}>☁️</Animated.Text>;
  if (type === 'rain')   return <Text style={{ fontSize:28 }}>🌧</Text>;
  return <Text style={{ fontSize:28 }}>⛈</Text>;
}

// ── Weather fetch — wttr.in, 8s timeout ──────────────────────────────────────
async function fetchWeather(): Promise<WeatherData | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const lat = Math.abs(WEATHER_LAT);
    const res = await fetch(
      `https://wttr.in/${WEATHER_LAT},${WEATHER_LON}?format=j1`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);
    const json = await res.json();
    const curr = json?.current_condition?.[0];
    if (!curr) {
      console.log('[Weather] unexpected wttr.in shape:', JSON.stringify(json).slice(0, 200));
      return null;
    }
    const rawCode  = parseInt(curr.weatherCode ?? '113', 10);
    const mappedCode = mapWttrCode(rawCode);
    const tempC    = parseFloat(curr.temp_C ?? '22');
    const windKmh  = parseFloat(curr.windspeedKmph ?? '0');
    const desc     = curr.weatherDesc?.[0]?.value ?? weatherCondition(mappedCode);
    console.log(`[Weather] ${tempC}° ${desc} (wttr code ${rawCode} → ${mappedCode})`);
    return {
      temp:      tempC,
      code:      mappedCode,
      windspeed: windKmh,
      condition: desc,
    };
  } catch (e: any) {
    clearTimeout(timeout);
    if (e?.name === 'AbortError') {
      console.log('[Weather] timed out after 8s');
    } else {
      console.log('[Weather] fetch error:', e?.message ?? e);
    }
    return null;
  }
}

// ── AI Zaeli Noticed — GPT mini ───────────────────────────────────────────────
async function generateNotices(data: CardData): Promise<Notice[]> {
  const todayEvts = data.todayEvents.map(e => `${fmtTime(e.start_time)} ${e.title}`).join(', ') || 'none';
  const tomEvts   = data.tomorrowEvents.map(e => `${fmtTime(e.start_time)} ${e.title}`).join(', ') || 'none';
  const todos     = data.todos.filter(t => t.status !== 'done').slice(0,5).map(t => t.title).join(', ') || 'none';
  const shop      = data.shopCount > 0 ? `${data.shopCount} items on list` : 'list clear';
  const weather   = data.weather ? `${Math.round(data.weather.temp)}° ${data.weather.condition}` : 'unknown';
  const meals     = data.meals.slice(0,2).map(m => `${m.day_key}: ${m.meal_name}`).join(', ') || 'nothing planned';
  const ctx = `Today: ${localDateStr()}. Events today: ${todayEvts}. Tomorrow: ${tomEvts}. Todos: ${todos}. Shopping: ${shop}. Weather: ${weather}. Meals: ${meals}. Family: Rich (dad), Anna (mum), Poppy (girl 12), Gab (boy 10), Duke (boy 8).`;
  const system = `You are Zaeli, a sharp warm AI for an Australian family. Generate 2-3 short notices about things worth attention right now. Each under 12 words, plain text, no emoji, specific to the data. Never start with I. End with a period. Return ONLY a JSON array, no markdown. Format: [{"text":"...","tag":"Anna","color":"#FF7B6B"}]. Tag/color pairs: Rich #4D8BFF, Anna #FF7B6B, Poppy #A855F7, Gab #22C55E, Duke #F59E0B, Weather #A8D8F0, Shopping #D8CCFF, Calendar #3A3D4A, Meals #E8601A, Todos #C9A820.`;
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type':'application/json', 'Authorization':`Bearer ${OPENAI_KEY}` },
      body: JSON.stringify({
        model: GPT_MINI,
        max_completion_tokens: 200,
        messages: [{ role:'system', content:system }, { role:'user', content:ctx }],
      }),
    });
    const json    = await res.json();
    const raw     = json.choices?.[0]?.message?.content ?? '';
    const cleaned = raw.replace(/```json|```/g, '').trim();
    const parsed  = JSON.parse(cleaned);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed.slice(0, 3);
  } catch (e) {
    console.log('[Zaeli Noticed] error:', e);
  }
  return [{ text: data.shopCount > 0 ? `${data.shopCount} items on the shopping list.` : 'All clear today.', tag:'Shopping', color:'#D8CCFF' }];
}

// ══════════════════════════════════════════════════════════════════════════════
// ── CARD COMPONENTS ───────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

// ── 1. CalendarCard ───────────────────────────────────────────────────────────
function CalendarCard({ events, showTomorrow, expanded, onToggleExpand, onAdd, onEditEvent, onFullCalendar, onDeleted }: {
  events:any[]; showTomorrow:boolean; expanded:boolean;
  onToggleExpand:()=>void; onAdd:()=>void;
  onEditEvent:(ev:any)=>void; onFullCalendar:()=>void;
  onDeleted:(eventId:string)=>void;
}) {
  const [selectedId,   setSelectedId]   = useState<string|null>(null);
  const [confirmDelId, setConfirmDelId] = useState<string|null>(null);
  useEffect(() => { if (!expanded) { setSelectedId(null); setConfirmDelId(null); } }, [expanded]);

  const pastEvents     = showTomorrow ? [] : events.filter(ev => isEventPast(ev));
  const upcomingEvents = showTomorrow ? events : events.filter(ev => !isEventPast(ev));
  const headline = calHeadline(upcomingEvents.length, showTomorrow, pastEvents.length > 0);

  async function deleteEvent(ev: any) {
    setSelectedId(null); setConfirmDelId(null); onDeleted(ev.id);
    try { await supabase.from('events').delete().eq('id', ev.id); }
    catch (e) { console.error('[CalendarCard] deleteEvent:', e); }
  }

  function renderEventRow(ev: any, i: number, isPast: boolean) {
    const members  = (ev.assignees||[]).map((id:string) => FAMILY_MEMBERS.find(m=>m.id===id)).filter(Boolean) as any[];
    const dotColor = isPast ? 'rgba(255,255,255,0.20)' : (members.length > 0 ? members[0].color : 'rgba(255,255,255,0.45)');
    const isSel    = selectedId === ev.id;
    const isConf   = confirmDelId === ev.id;
    return (
      <View key={ev.id||i}>
        <TouchableOpacity
          style={[cS.tRow, isSel && { backgroundColor:'rgba(255,255,255,0.07)', borderRadius:10, marginHorizontal:-6, paddingHorizontal:6 }]}
          onPress={() => { setSelectedId(isSel ? null : ev.id); setConfirmDelId(null); }}
          activeOpacity={0.75}
        >
          <Text style={[cS.tTime, isPast && { color:'rgba(255,255,255,0.35)' }]}>{fmtTime(ev.start_time)}</Text>
          <View style={[cS.tDot, { backgroundColor:dotColor }]}/>
          <Text style={[cS.tEv, isPast && { textDecorationLine:'line-through', color:'rgba(255,255,255,0.50)' }]} numberOfLines={1}>
            {ev.title} {getEventEmoji(ev.title)}
          </Text>
          {!isPast && members.slice(0,2).map((m:any) => (
            <View key={m.id} style={[cS.tAv, { backgroundColor:m.color }]}>
              <Text style={cS.tAvTxt}>{m.name[0]}</Text>
            </View>
          ))}
          {!isPast && members.length > 2 && (
            <View style={[cS.tAv, { backgroundColor:'rgba(255,255,255,0.2)' }]}>
              <Text style={[cS.tAvTxt, { fontSize:9 }]}>+{members.length-2}</Text>
            </View>
          )}
          <Text style={{ color:'rgba(255,255,255,0.28)', fontSize:11 }}>{isSel ? '∧' : '›'}</Text>
        </TouchableOpacity>
        {isSel && (
          <View style={cS.evExpanded}>
            {ev.notes ? <Text style={cS.evNote}>{ev.notes}</Text> : null}
            {members.length > 0 && <Text style={cS.evWho}>{members.map((m:any) => m.name).join(', ')}</Text>}
            {!isConf ? (
              <View style={cS.evActions}>
                <TouchableOpacity style={cS.evEditBtn} onPress={() => onEditEvent(ev)} activeOpacity={0.75}>
                  <Text style={cS.evEditTxt}>{isPast ? '✦ Reschedule with Zaeli' : '✦ Edit with Zaeli'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={cS.evDelBtn} onPress={() => setConfirmDelId(ev.id)} activeOpacity={0.75}>
                  <Text style={cS.evDelTxt}>Delete</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={cS.evActions}>
                <TouchableOpacity style={cS.evDelConfirmBtn} onPress={() => deleteEvent(ev)} activeOpacity={0.75}>
                  <Text style={cS.evDelConfirmTxt}>Yes, delete</Text>
                </TouchableOpacity>
                <TouchableOpacity style={cS.evEditBtn} onPress={() => setConfirmDelId(null)} activeOpacity={0.75}>
                  <Text style={cS.evEditTxt}>Keep it</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={[cS.card, cS.cardCal, { overflow:'hidden' }]}>
      <TouchableOpacity style={cS.cardHeader} onPress={onToggleExpand} activeOpacity={0.82}>
        <Text style={cS.headlineLt}>{headline}</Text>
        <TouchableOpacity style={cS.addBtnLt} onPress={(e) => { e.stopPropagation(); onAdd(); }} activeOpacity={0.75}>
          <Text style={cS.addBtnTxtLt}>+ Add</Text>
        </TouchableOpacity>
      </TouchableOpacity>
      {!expanded && <Text style={cS.tapHintLt}>Tap to see →</Text>}
      {expanded && (
        <View style={{ marginTop:6 }}>
          {events.length === 0 ? (
            <Text style={cS.emptyLt}>Nothing on {showTomorrow ? 'tomorrow' : 'today'}</Text>
          ) : (
            <>
              {upcomingEvents.map((ev, i) => renderEventRow(ev, i, false))}
              {pastEvents.length > 0 && (
                <View style={{ marginTop: upcomingEvents.length > 0 ? 6 : 0, opacity:0.45 }}>
                  {upcomingEvents.length > 0 && <View style={{ height:1, backgroundColor:'rgba(255,255,255,0.10)', marginBottom:10 }}/>}
                  {pastEvents.map((ev, i) => renderEventRow(ev, i, true))}
                </View>
              )}
            </>
          )}
          <TouchableOpacity onPress={onFullCalendar} activeOpacity={0.78} style={calBtnS.openBtn}>
            <Text style={calBtnS.openBtnTxt}>View Full Calendar →</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ── 2. DinnerCard ─────────────────────────────────────────────────────────────
function DinnerCard({ meals, showTomorrow, expanded, onToggleExpand, onPlanMeals, onEditMeal }: {
  meals:any[]; showTomorrow:boolean; expanded:boolean;
  onToggleExpand:()=>void; onPlanMeals:()=>void;
  onEditMeal:(meal:any|null, dateKey:string, dayAbbr:string)=>void;
}) {
  const today       = localDateStr();
  const tomorrow    = localDatePlusDays(1);
  const targetDate  = showTomorrow ? tomorrow : today;
  const tonightMeal = meals.find(m => m.day_key === targetDate || m.planned_date === targetDate);
  const headline    = dinnerHeadline(tonightMeal?.meal_name ?? null, showTomorrow);
  const [selectedKey,   setSelectedKey]   = useState<string|null>(null);
  const [confirmDelKey, setConfirmDelKey] = useState<string|null>(null);
  useEffect(() => { if (!expanded) { setSelectedKey(null); setConfirmDelKey(null); } }, [expanded]);

  const sevenDays = Array.from({ length:7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i);
    const key     = localDateStr(d);
    const meal    = meals.find(m => m.day_key === key || m.planned_date === key);
    const dayAbbr = i === 0 ? 'Tonight' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-AU', { weekday:'short' });
    return { key, meal, isTonight:i===0, dayAbbr };
  });

  async function deleteMeal(meal: any) {
    setSelectedKey(null); setConfirmDelKey(null);
    try { await supabase.from('meal_plans').delete().eq('id', meal.id); }
    catch (e) { console.error('[DinnerCard] deleteMeal:', e); }
  }

  return (
    <View style={[cS.card, cS.cardDin, { overflow:'hidden' }]}>
      <TouchableOpacity style={cS.cardHeader} onPress={onToggleExpand} activeOpacity={0.82}>
        <Text style={cS.headlineDk}>{headline}</Text>
      </TouchableOpacity>
      {!expanded && (
        tonightMeal
          ? <Text style={cS.tapHintDk}>Tap to see the week →</Text>
          : <TouchableOpacity onPress={(e) => { e.stopPropagation(); onPlanMeals(); }} activeOpacity={0.75} style={{ marginTop:10 }}>
              <Text style={{ fontFamily:'Poppins_600SemiBold', fontSize:14, color:'rgba(180,60,10,0.65)' }}>Plan it →</Text>
            </TouchableOpacity>
      )}
      {expanded && (
        <View style={{ marginTop:10 }}>
          {sevenDays.map(({ key, meal, isTonight, dayAbbr }) => {
            const isSel  = selectedKey === key;
            const isConf = confirmDelKey === key;
            return (
              <View key={key}>
                <TouchableOpacity
                  style={[dinS.dayRow, isSel && { backgroundColor:'rgba(0,0,0,0.05)', borderRadius:10, marginHorizontal:-6, paddingHorizontal:6 }]}
                  onPress={() => { setSelectedKey(isSel ? null : key); setConfirmDelKey(null); }}
                  activeOpacity={0.75}
                >
                  <Text style={[dinS.dayLabel, isTonight && { color:'#C84010' }]}>{dayAbbr}</Text>
                  {meal ? <Text style={dinS.mealName} numberOfLines={1}>{getMealEmoji(meal.meal_name)} {meal.meal_name}</Text>
                        : <Text style={dinS.mealEmpty}>Nothing yet</Text>}
                  <Text style={dinS.dayChevron}>{isSel ? '∧' : '›'}</Text>
                </TouchableOpacity>
                {isSel && (
                  <View style={dinS.dayExpanded}>
                    {meal ? (
                      !isConf ? (
                        <>
                          {meal.prep_mins > 0 && <Text style={dinS.dayNote}>{meal.prep_mins} min prep</Text>}
                          <View style={dinS.dayActions}>
                            <TouchableOpacity style={[dinS.dayBtn, { flex:2 }]} onPress={() => onEditMeal(meal, key, dayAbbr)} activeOpacity={0.75}>
                              <Text style={dinS.dayBtnTxt}>✦ Edit with Zaeli</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={dinS.dayBtnDel} onPress={() => setConfirmDelKey(key)} activeOpacity={0.75}>
                              <Text style={dinS.dayBtnDelTxt}>Delete</Text>
                            </TouchableOpacity>
                          </View>
                          <View style={[dinS.dayActions, { marginTop:8 }]}>
                            <TouchableOpacity style={[dinS.dayBtn, { flex:1 }]} onPress={onPlanMeals} activeOpacity={0.75}>
                              <Text style={dinS.dayBtnTxt}>Move</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[dinS.dayBtn, { flex:1 }]} onPress={onPlanMeals} activeOpacity={0.75}>
                              <Text style={dinS.dayBtnTxt}>More options</Text>
                            </TouchableOpacity>
                          </View>
                        </>
                      ) : (
                        <View style={dinS.dayActions}>
                          <TouchableOpacity style={cS.evDelConfirmBtn} onPress={() => deleteMeal(meal)} activeOpacity={0.75}>
                            <Text style={cS.evDelConfirmTxt}>Yes, delete</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={cS.evEditBtn} onPress={() => setConfirmDelKey(null)} activeOpacity={0.75}>
                            <Text style={cS.evEditTxt}>Keep it</Text>
                          </TouchableOpacity>
                        </View>
                      )
                    ) : (
                      <TouchableOpacity style={[dinS.dayBtn, { alignSelf:'stretch' }]} onPress={() => onEditMeal(null, key, dayAbbr)} activeOpacity={0.75}>
                        <Text style={dinS.dayBtnTxt}>✦ Plan {dayAbbr} with Zaeli</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            );
          })}
          <TouchableOpacity onPress={onPlanMeals} activeOpacity={0.78} style={dinS.openPlanner}>
            <Text style={dinS.openPlannerTxt}>Open Meal Planner →</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const dinS = StyleSheet.create({
  dayRow:        { flexDirection:'row', alignItems:'center', gap:10, paddingVertical:11, borderTopWidth:1, borderTopColor:'rgba(0,0,0,0.07)' },
  dayLabel:      { fontFamily:'Poppins_600SemiBold', fontSize:15, color:'rgba(0,0,0,0.38)', width:92, flexShrink:0 },
  mealName:      { fontFamily:'Poppins_400Regular', fontSize:17, color:'#1A1A1A', flex:1 },
  mealEmpty:     { fontFamily:'Poppins_400Regular', fontSize:17, color:'rgba(0,0,0,0.22)', fontStyle:'italic', flex:1 },
  dayChevron:    { color:'rgba(0,0,0,0.25)', fontSize:13 },
  dayExpanded:   { backgroundColor:'rgba(0,0,0,0.05)', borderRadius:12, padding:12, marginBottom:4, marginTop:2 },
  dayNote:       { fontFamily:'Poppins_400Regular', fontSize:13, color:'rgba(0,0,0,0.45)', marginBottom:8 },
  dayActions:    { flexDirection:'row', gap:8 },
  dayBtn:        { backgroundColor:'rgba(0,0,0,0.10)', borderRadius:10, paddingVertical:11, alignItems:'center' },
  dayBtnTxt:     { fontFamily:'Poppins_600SemiBold', fontSize:13, color:'rgba(0,0,0,0.65)' },
  dayBtnDel:     { backgroundColor:'rgba(255,69,69,0.12)', borderRadius:10, paddingVertical:11, paddingHorizontal:16, alignItems:'center' },
  dayBtnDelTxt:  { fontFamily:'Poppins_600SemiBold', fontSize:13, color:'rgba(200,10,10,0.75)' },
  openPlanner:   { marginTop:16, backgroundColor:'rgba(0,0,0,0.10)', borderRadius:14, paddingVertical:14, alignItems:'center' },
  openPlannerTxt:{ fontFamily:'Poppins_700Bold', fontSize:15, color:'rgba(140,50,0,0.80)' },
});

// ── 3a. WeatherCard ───────────────────────────────────────────────────────────
function WeatherCard({ weather, expanded, onToggleExpand }: {
  weather:WeatherData|null; expanded:boolean; onToggleExpand:()=>void;
}) {
  if (!weather) {
    return (
      <TouchableOpacity style={[cS.card, cS.cardWx, { justifyContent:'center', alignItems:'center' }]} onPress={onToggleExpand} activeOpacity={0.82}>
        <Text style={cS.cardLabel}>Weather</Text>
        <Text style={{ fontFamily:'Poppins_400Regular', fontSize:13, color:'rgba(0,0,0,0.30)', fontStyle:'italic', marginTop:8 }}>–</Text>
      </TouchableOpacity>
    );
  }
  return (
    <TouchableOpacity style={[cS.card, cS.cardWx]} onPress={onToggleExpand} activeOpacity={0.82}>
      <Text style={cS.cardLabel}>Weather</Text>
      <Text style={{ fontFamily:'Poppins_600SemiBold', fontSize:42, color:'#1A1A1A', letterSpacing:-1.5, lineHeight:48, marginTop:4 }}>{Math.round(weather.temp)}°</Text>
      <Text style={{ fontFamily:'Poppins_400Regular', fontSize:13, color:'rgba(0,0,0,0.50)', marginTop:2 }}>{weather.condition}</Text>
      <View style={{ marginVertical:10 }}><WeatherIcon type={weatherType(weather.code)}/></View>
      {expanded && (
        <Text style={{ fontFamily:'Poppins_400Regular', fontSize:12, color:'rgba(0,0,0,0.42)', lineHeight:18, marginBottom:8 }}>{weatherExtra(weather.code, weather.windspeed)}</Text>
      )}
    </TouchableOpacity>
  );
}

// ── 3b. Zaeli Noticed card ────────────────────────────────────────────────────
function ZaeliNoticedCard({ notices, noticesLoading, expanded, onToggleExpand, onChat }: {
  notices:Notice[]; noticesLoading:boolean;
  expanded:boolean; onToggleExpand:()=>void; onChat:(notice:string)=>void;
}) {
  const count = notices.length;
  const countWord = noticesLoading ? 'looking…'
    : count === 0 ? 'all quiet.'
    : count === 1 ? 'one thing.'
    : count === 2 ? 'two things.'
    : `${count} things.`;

  return (
    <TouchableOpacity style={[cS.card, cS.cardWotd, { flex:1 }]} onPress={onToggleExpand} activeOpacity={0.82}>
      <Text style={[cS.cardLabel, { color:'rgba(107,53,217,0.55)', fontSize:13, letterSpacing:0.4 }]}>Zaeli{'\n'}noticed</Text>
      {!expanded && (
        <View style={{ marginTop:4 }}>
          <Text style={[cS.headlineWotd, { fontSize:28, lineHeight:32 }]}>{countWord}</Text>
          {!noticesLoading && count > 0 && (
            <Text style={{ fontFamily:'Poppins_500Medium', fontSize:13, color:'rgba(107,53,217,0.55)', marginTop:6, lineHeight:18 }}>
              {notices.slice(0,3).map(n => n.tag).join(' · ')}
            </Text>
          )}
        </View>
      )}
      {expanded && (
        <View style={{ marginTop:8 }}>
          {noticesLoading ? (
            <Text style={{ fontFamily:'Poppins_400Regular', fontSize:14, color:'rgba(107,53,217,0.45)', fontStyle:'italic' }}>Zaeli is looking…</Text>
          ) : count === 0 ? (
            <Text style={{ fontFamily:'Poppins_400Regular', fontSize:14, color:'rgba(107,53,217,0.45)', fontStyle:'italic' }}>Nothing unusual today.</Text>
          ) : (
            notices.map((n, i) => (
              <TouchableOpacity key={i} style={noticedS.row} onPress={(e) => { e.stopPropagation(); onChat(n.text); }} activeOpacity={0.75}>
                <View style={[noticedS.dot, { backgroundColor:n.color }]}/>
                <Text style={noticedS.txt}>{n.text}</Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const noticedS = StyleSheet.create({
  row: { flexDirection:'row', alignItems:'flex-start', gap:8, paddingVertical:7, borderBottomWidth:1, borderBottomColor:'rgba(107,53,217,0.10)' },
  dot: { width:7, height:7, borderRadius:4, flexShrink:0, marginTop:6 },
  txt: { fontFamily:'Poppins_400Regular', fontSize:14, color:'rgba(10,10,10,0.70)', lineHeight:20, flex:1 },
});

// ── 4. ShoppingCard ───────────────────────────────────────────────────────────
function ShoppingCard({ items, count, expanded, onToggleExpand, onAdd, onOpenSheet }: {
  items:any[]; count:number; expanded:boolean;
  onToggleExpand:()=>void; onAdd:()=>void; onOpenSheet:()=>void;
}) {
  const headline  = shopHeadline(count);
  const unchecked = items.filter((i:any) => i.checked !== true);
  return (
    <View style={[cS.card, cS.cardShop, { overflow:'hidden' }]}>
      <TouchableOpacity style={cS.cardHeader} onPress={onToggleExpand} activeOpacity={0.82}>
        <Text style={cS.headlineShop}>{headline}</Text>
        <TouchableOpacity style={cS.addBtnLt} onPress={(e) => { e.stopPropagation(); onAdd(); }} activeOpacity={0.75}>
          <Text style={cS.addBtnTxtLt}>+ Add</Text>
        </TouchableOpacity>
      </TouchableOpacity>
      {!expanded && <Text style={shopS.tapHint}>{count > 0 ? 'Tap to see →' : ''}</Text>}
      {expanded && (
        <View style={{ marginTop:8 }}>
          {unchecked.length === 0
            ? <Text style={cS.emptyShop}>List is clear</Text>
            : unchecked.slice(0,8).map((item:any, i:number) => (
                <View key={item.id||i} style={{ flexDirection:'row', alignItems:'center', gap:10, marginBottom:11 }}>
                  <View style={{ width:7, height:7, borderRadius:4, backgroundColor:'rgba(255,255,255,0.40)', flexShrink:0 }}/>
                  <Text style={{ fontFamily:'Poppins_400Regular', fontSize:17, color:'rgba(255,255,255,0.92)', flex:1 }} numberOfLines={1}>{item.name||item.item}</Text>
                </View>
              ))
          }
          {unchecked.length > 8 && <Text style={shopS.moreCount}>+{unchecked.length - 8} more</Text>}
          <TouchableOpacity onPress={onOpenSheet} activeOpacity={0.78} style={shopS.openBtn}>
            <Text style={shopS.openBtnTxt}>Open Shopping List →</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const shopS = StyleSheet.create({
  tapHint:    { fontFamily:'Poppins_500Medium', fontSize:13, color:'rgba(255,255,255,0.70)', marginTop:10 },
  moreCount:  { fontFamily:'Poppins_600SemiBold', fontSize:17, color:'rgba(255,255,255,0.70)', marginBottom:10 },
  openBtn:    { marginTop:10, backgroundColor:'rgba(255,255,255,0.15)', borderRadius:14, paddingVertical:14, alignItems:'center' },
  openBtnTxt: { fontFamily:'Poppins_700Bold', fontSize:15, color:'rgba(255,255,255,0.90)' },
});
const calBtnS = StyleSheet.create({
  openBtn:    { marginTop:14, backgroundColor:'rgba(255,255,255,0.12)', borderRadius:14, paddingVertical:14, alignItems:'center' },
  openBtnTxt: { fontFamily:'Poppins_700Bold', fontSize:15, color:'rgba(255,255,255,0.80)' },
});
const actS = StyleSheet.create({
  openBtn:    { marginTop:14, backgroundColor:'rgba(0,0,0,0.10)', borderRadius:14, paddingVertical:14, alignItems:'center' },
  openBtnTxt: { fontFamily:'Poppins_700Bold', fontSize:15, color:'rgba(100,70,0,0.80)' },
});

// ── 5. ActionsCard ────────────────────────────────────────────────────────────
function ActionsCard({ todos, isEvening, tomorrowMorningEvents, expanded, onToggleExpand, onAdd, onFull, onTick, onEditTodo, onDeleteTodo }: {
  todos:any[]; isEvening:boolean; tomorrowMorningEvents:any[];
  expanded:boolean; onToggleExpand:()=>void;
  onAdd:()=>void; onFull:()=>void; onTick:(todo:any)=>void;
  onEditTodo:(todo:any)=>void; onDeleteTodo:(todo:any)=>void;
}) {
  const activeCount = todos.filter(t => t.status !== 'done' && t.status !== 'acknowledged').length;
  const headline    = actionsHeadline(activeCount, isEvening);
  return (
    <View style={[cS.card, cS.cardAct, { overflow:'hidden' }]}>
      <TouchableOpacity style={cS.cardHeader} onPress={onToggleExpand} activeOpacity={0.82}>
        <Text style={cS.headlineDk}>{headline}</Text>
        {expanded && (
          <TouchableOpacity style={cS.addBtnDk} onPress={(e) => { e.stopPropagation(); onAdd(); }} activeOpacity={0.75}>
            <Text style={cS.addBtnTxtDk}>+ Add</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
      {!expanded && <Text style={cS.tapHintDk}>{activeCount > 0 ? 'Tap to see →' : ''}</Text>}
      {expanded && (
        <View style={{ marginTop:8 }}>
          {todos.length === 0
            ? <Text style={cS.emptyDk}>Enjoy the day 🎉</Text>
            : todos.slice(0,6).map((todo:any, i:number) => {
                const isDone   = todo.status === 'done' || todo.status === 'acknowledged';
                const dotColor = isDone ? 'rgba(0,0,0,0.12)' : todoPriorityColor(todo);
                const badge    = todoBadge(todo);
                const memberIds: string[] = Array.isArray(todo.assigned_to) ? todo.assigned_to : todo.assigned_to ? [todo.assigned_to] : [];
                const members  = memberIds.map((id:string) => FAMILY_MEMBERS.find(m=>m.id===id)).filter(Boolean) as any[];
                return (
                  <View key={todo.id||i} style={[cS.actRow, isDone && { opacity:0.40 }]}>
                    <TouchableOpacity style={[cS.actChk, isDone && cS.actChkDone]} onPress={() => onTick(todo)} activeOpacity={0.7} hitSlop={{ top:8, bottom:8, left:8, right:8 }}>
                      {isDone && <Text style={{ fontSize:10, color:'rgba(0,0,0,0.5)' }}>✓</Text>}
                    </TouchableOpacity>
                    <View style={[cS.actDot, { backgroundColor:dotColor }]}/>
                    <Text style={[cS.actTxt, isDone && { textDecorationLine:'line-through', color:'rgba(0,0,0,0.32)' }]} numberOfLines={1}>{todo.title}</Text>
                    {members.slice(0,1).map((m:any) => (
                      <View key={m.id} style={[cS.actWho, { backgroundColor:m.color }]}>
                        <Text style={cS.actWhoTxt}>{m.name[0]}</Text>
                      </View>
                    ))}
                    {badge && !isDone && (
                      <View style={[cS.bdg, badge.style==='ovd' ? cS.bdgOvd : cS.bdgRem]}>
                        <Text style={[cS.bdgTxt, { color:badge.style==='ovd' ? '#B91C1C' : '#CC2020' }]}>{badge.label}</Text>
                      </View>
                    )}
                  </View>
                );
              })
          }
          {isEvening && tomorrowMorningEvents.length > 0 && (
            <>
              <View style={cS.actDivider}>
                <View style={cS.actDivLine}/>
                <Text style={cS.actDivLbl}>🌅 Tomorrow morning</Text>
                <View style={cS.actDivLine}/>
              </View>
              {tomorrowMorningEvents.slice(0,3).map((ev:any, i:number) => (
                <View key={ev.id||i} style={cS.actRow}>
                  <View style={[cS.actDot, { backgroundColor:'rgba(0,0,0,0.18)' }]}/>
                  <Text style={[cS.actTxt, { color:'rgba(0,0,0,0.55)' }]} numberOfLines={1}>{ev.title}{fmtTime(ev.start_time) ? ` · ${fmtTime(ev.start_time)}` : ''}</Text>
                </View>
              ))}
            </>
          )}
          <TouchableOpacity onPress={onFull} activeOpacity={0.78} style={actS.openBtn}>
            <Text style={actS.openBtnTxt}>Open All To-dos and Reminders →</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── MAIN SCREEN ───────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
export default function DashboardScreen({ onNavigateChat, isActive = false }: { onNavigateChat?: () => void; isActive?: boolean }) {
  const insets     = useSafeAreaInsets();
  const router     = useRouter();
  const isAfter8pm = new Date().getHours() >= 20;

  const [expandedCard,   setExpandedCard]   = useState<CardKey>(null);
  const [cardData,       setCardData]       = useState<CardData>({
    todayEvents:[], tomorrowEvents:[], shopItems:[], shopCount:0, todos:[], meals:[], weather:null,
  });
  const [cardLoading,    setCardLoading]    = useState(true);
  const [notices,        setNotices]        = useState<Notice[]>([]);
  const [noticesLoading, setNoticesLoading] = useState(true);
  const noticesGeneratedRef = useRef(false);

  function toggleCard(key: CardKey) {
    setExpandedCard(prev => prev === key ? null : key);
  }

  const cardAnims = useRef([0,1,2,3,4].map(() => ({
    opacity:    new Animated.Value(0),
    translateY: new Animated.Value(20),
  }))).current;

  function animateCards() {
    cardAnims.forEach((anim, i) => {
      Animated.parallel([
        Animated.timing(anim.opacity,    { toValue:1, duration:420, delay:i*90, useNativeDriver:true }),
        Animated.timing(anim.translateY, { toValue:0, duration:420, delay:i*90, easing:Easing.out(Easing.cubic), useNativeDriver:true }),
      ]).start();
    });
  }

  const loadData = useCallback(async () => {
    setCardLoading(true);
    try {
      const today   = localDateStr();
      const tomorrow = localDatePlusDays(1);
      const in7days  = localDatePlusDays(7);

      const [evRes, shopRes, shopCountRes, todosRes, remindersRes, mealsRes] = await Promise.all([
        supabase.from('events')
          .select('id,title,date,start_time,end_time,assignees,all_day,notes')
          .eq('family_id', FAMILY_ID).gte('date', today).lte('date', tomorrow)
          .order('date').order('start_time').limit(30),
        supabase.from('shopping_items')
          .select('id,name,item,category,checked').eq('family_id', FAMILY_ID).limit(30),
        supabase.from('shopping_items')
          .select('*', { count:'exact', head:true }).eq('family_id', FAMILY_ID).neq('checked', true),
        supabase.from('todos')
          .select('id,title,priority,status,due_date,assigned_to')
          .eq('family_id', FAMILY_ID).eq('status','active')
          .order('created_at', { ascending:false }).limit(10),
        supabase.from('reminders')
          .select('id,title,remind_at,member_id,status')
          .eq('family_id', FAMILY_ID).eq('status','active')
          .lte('remind_at', new Date(Date.now()+24*60*60*1000).toISOString())
          .order('remind_at').limit(5),
        supabase.from('meal_plans')
          .select('id,meal_name,planned_date,day_key,prep_mins')
          .eq('family_id', FAMILY_ID).gte('planned_date', today).lte('planned_date', in7days)
          .order('planned_date').limit(7),
      ]);

      const allEvents      = (evRes.data ?? []).filter((e:any) => !e.all_day);
      const todayEvents    = allEvents.filter((e:any) => e.date === today);
      const tomorrowEvents = allEvents.filter((e:any) => e.date === tomorrow);
      const reminders      = (remindersRes.data ?? []).map((r:any) => ({
        id:r.id, title:r.title, priority:'normal', status:'active',
        due_date:r.remind_at?.slice(0,10), assigned_to:r.member_id||null, reminder_type:'reminder',
      }));

      const freshData: CardData = {
        todayEvents, tomorrowEvents,
        shopItems:  shopRes.data ?? [],
        shopCount:  shopCountRes.count ?? 0,
        todos:      [...(todosRes.data ?? []), ...reminders],
        meals:      mealsRes.data ?? [],
        weather:    null,
      };

      setCardData(freshData);

      // Weather fires independently — never blocks cards
      fetchWeather().then(weather => {
        if (weather) setCardData(prev => ({ ...prev, weather }));
      });

      // Notices fire once per session — never blocks cards
      if (!noticesGeneratedRef.current) {
        noticesGeneratedRef.current = true;
        generateNotices(freshData).then(result => {
          setNotices(result);
          setNoticesLoading(false);
        });
      }

    } catch (e) {
      console.error('[Dashboard] loadData:', e);
    } finally {
      setCardLoading(false);
      animateCards();
    }
  }, []);

  useFocusEffect(useCallback(() => {
    loadData();
    const interval = setInterval(() => { loadData(); }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadData]));

  // Refresh card data when swiping back to dashboard from chat
  const prevDashActive = useRef(false);
  useEffect(() => {
    const justBecameActive = isActive && !prevDashActive.current;
    prevDashActive.current = isActive;
    if (justBecameActive) {
      console.log('DASH: became active, refreshing data');
      loadData();
    }
  }, [isActive, loadData]);

  const showCalTomorrow    = isAfter8pm || (cardData.todayEvents.length === 0 && cardData.tomorrowEvents.length > 0);
  const showDinnerTomorrow = isAfter8pm;
  const isEvening          = isAfter8pm;
  const tomorrowMorningEvs = cardData.tomorrowEvents.filter(e => {
    const tp = (e.start_time||'').includes('T') ? (e.start_time||'').split('T')[1] : '';
    return tp ? parseInt(tp.split(':')[0],10) < 10 : false;
  });

  async function handleTodoTick(todo: any) {
    const isReminder = todo.reminder_type === 'reminder';
    const isDone     = todo.status === 'done' || todo.status === 'acknowledged';
    const newStatus  = isDone ? 'active' : (isReminder ? 'acknowledged' : 'done');
    setCardData(prev => ({ ...prev, todos:prev.todos.map(t => t.id===todo.id ? {...t, status:newStatus} : t) }));
    try {
      if (isReminder) await supabase.from('reminders').update({ status:newStatus }).eq('id', todo.id);
      else await supabase.from('todos').update({ status:newStatus, updated_at:new Date().toISOString() }).eq('id', todo.id);
    } catch {
      setCardData(prev => ({ ...prev, todos:prev.todos.map(t => t.id===todo.id ? {...t, status:todo.status} : t) }));
    }
  }

  function goToEditEvent(ev: any)   { console.log('DASH: setPending edit_event'); setPendingChatContext({ type:'edit_event', event:ev, returnTo:'dashboard' }); onNavigateChat?.(); }
  function goToAddEvent()           { console.log('DASH: setPending add_event'); setPendingChatContext({ type:'add_event',  returnTo:'dashboard' }); onNavigateChat?.(); }
  function goToAddShopping()        { console.log('DASH: setPending shopping'); setPendingChatContext({ type:'shopping',   returnTo:'dashboard' }); onNavigateChat?.(); }
  function goToAddTodo()            { console.log('DASH: setPending actions'); setPendingChatContext({ type:'actions',    returnTo:'dashboard' }); onNavigateChat?.(); }
  function goToEditMeal(meal: any|null, dateKey: string, dayAbbr: string) {
    setPendingChatContext({ type:'meals', event:{ meal, dateKey, dayAbbr }, returnTo:'dashboard' });
    onNavigateChat?.();
  }
  function goToEditTodo(todo: any)  { setPendingChatContext({ type:'actions', event:todo, returnTo:'dashboard' }); onNavigateChat?.(); }

  const topDateLabel = new Date().toLocaleDateString('en-AU', { weekday:'short', day:'numeric', month:'short' });

  return (
    <View style={s.root}>
      <ExpoStatusBar style="dark" animated/>
      <View style={[s.topBar, { paddingTop: insets.top }]}>
        <View style={s.topBarRow}>
          <TouchableOpacity onPress={() => onNavigateChat?.()} activeOpacity={0.8}>
            <Text style={s.logoWord}>
              z<Text style={{ color:'#A8D8F0' }}>a</Text>el<Text style={{ color:'#A8D8F0' }}>i</Text>
            </Text>
          </TouchableOpacity>
          <Text style={s.dateLabel}>{topDateLabel}</Text>
        </View>
        <View style={s.topBarDivider}/>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

        <Animated.View style={{ opacity:cardAnims[0].opacity, transform:[{translateY:cardAnims[0].translateY}] }}>
          <CalendarCard
            events={showCalTomorrow ? cardData.tomorrowEvents : cardData.todayEvents}
            showTomorrow={showCalTomorrow}
            expanded={expandedCard === 'calendar'}
            onToggleExpand={() => toggleCard('calendar')}
            onAdd={goToAddEvent}
            onEditEvent={goToEditEvent}
            onFullCalendar={() => router.navigate('/(tabs)/calendar')}
            onDeleted={(eventId) => setCardData(prev => ({
              ...prev,
              todayEvents:    prev.todayEvents.filter(e => e.id !== eventId),
              tomorrowEvents: prev.tomorrowEvents.filter(e => e.id !== eventId),
            }))}
          />
        </Animated.View>

        <Animated.View style={{ opacity:cardAnims[1].opacity, transform:[{translateY:cardAnims[1].translateY}] }}>
          <DinnerCard
            meals={cardData.meals}
            showTomorrow={showDinnerTomorrow}
            expanded={expandedCard === 'dinner'}
            onToggleExpand={() => toggleCard('dinner')}
            onPlanMeals={() => router.navigate('/(tabs)/mealplanner')}
            onEditMeal={goToEditMeal}
          />
        </Animated.View>

        <Animated.View style={{ opacity:cardAnims[2].opacity, transform:[{translateY:cardAnims[2].translateY}] }}>
          <View style={{ flexDirection:'row', gap:10 }}>
            <WeatherCard
              weather={cardData.weather}
              expanded={expandedCard === 'weather'}
              onToggleExpand={() => toggleCard('weather')}
            />
            <ZaeliNoticedCard
              notices={notices}
              noticesLoading={noticesLoading}
              expanded={expandedCard === 'wotd'}
              onToggleExpand={() => toggleCard('wotd')}
              onChat={(notice) => {
                setPendingChatContext({ type:'noticed' as any, event:{ title: notice }, returnTo:'dashboard' });
                onNavigateChat?.();
              }}
            />
          </View>
        </Animated.View>

        <Animated.View style={{ opacity:cardAnims[3].opacity, transform:[{translateY:cardAnims[3].translateY}] }}>
          <ShoppingCard
            items={cardData.shopItems}
            count={cardData.shopCount}
            expanded={expandedCard === 'shopping'}
            onToggleExpand={() => toggleCard('shopping')}
            onAdd={goToAddShopping}
            onOpenSheet={() => {
              setPendingChatContext({ type:'shopping_sheet' as any, returnTo:'dashboard' });
              onNavigateChat?.();
            }}
          />
        </Animated.View>

        <Animated.View style={{ opacity:cardAnims[4].opacity, transform:[{translateY:cardAnims[4].translateY}] }}>
          <ActionsCard
            todos={cardData.todos}
            isEvening={isEvening}
            tomorrowMorningEvents={tomorrowMorningEvs}
            expanded={expandedCard === 'actions'}
            onToggleExpand={() => toggleCard('actions')}
            onAdd={goToAddTodo}
            onFull={() => router.navigate('/(tabs)/todos')}
            onTick={handleTodoTick}
            onEditTodo={goToEditTodo}
            onDeleteTodo={async (todo) => {
              setCardData(prev => ({ ...prev, todos:prev.todos.filter(t => t.id !== todo.id) }));
              try {
                if (todo.reminder_type === 'reminder') await supabase.from('reminders').delete().eq('id', todo.id);
                else await supabase.from('todos').delete().eq('id', todo.id);
              } catch {
                setCardData(prev => ({ ...prev, todos:[...prev.todos, todo] }));
              }
            }}
          />
        </Animated.View>

        <View style={{ height:130 }}/>
      </ScrollView>
    </View>
  );
}

// ── Screen styles ─────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:          { flex:1, backgroundColor:'#FAF8F5' },
  topBar:        { backgroundColor:'#FAF8F5' },
  topBarRow:     { flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingHorizontal:20, paddingTop:4, paddingBottom:10 },
  topBarDivider: { height:1, backgroundColor:'rgba(10,10,10,0.08)' },
  logoWord:      { fontFamily:'Poppins_800ExtraBold', fontSize:36, color:'#0A0A0A', letterSpacing:-1.5, lineHeight:42 },
  dateLabel:     { fontFamily:'Poppins_600SemiBold', fontSize:15, color:'rgba(10,10,10,0.42)' },
  scroll:        { flex:1 },
  scrollContent: { paddingHorizontal:14, paddingTop:14, gap:10 },
});

// ── Card styles ───────────────────────────────────────────────────────────────
const cS = StyleSheet.create({
  card:      { borderRadius:22, padding:22 },
  cardCal:   { backgroundColor:'#3A3D4A' },
  cardDin:   { backgroundColor:'#FAC8A8' },
  cardWx:    { backgroundColor:'#A8D8F0', width:120, flexShrink:0 },
  cardWotd:  { backgroundColor:'#E8F4E8' },
  cardShop:  { backgroundColor:'#D8CCFF' },
  cardAct:   { backgroundColor:'#F0DC80' },

  cardLabel:    { fontFamily:'Poppins_700Bold', fontSize:10, textTransform:'uppercase', letterSpacing:0.8, color:'rgba(0,0,0,0.35)', marginBottom:4 },
  cardHeader:   { flexDirection:'row', alignItems:'flex-start', justifyContent:'space-between' },
  headlineLt:   { fontFamily:'Poppins_700Bold', fontSize:24, letterSpacing:-0.5, lineHeight:30, color:'#fff', flex:1 },
  headlineDk:   { fontFamily:'Poppins_700Bold', fontSize:24, letterSpacing:-0.5, lineHeight:30, color:'#1A1A1A', flex:1 },
  headlineShop: { fontFamily:'Poppins_700Bold', fontSize:24, letterSpacing:-0.5, lineHeight:30, color:'#fff', flex:1 },
  headlineWotd: { fontFamily:'Poppins_700Bold', fontSize:26, letterSpacing:-0.5, lineHeight:32, color:'#6B35D9', flex:1 },

  ghostLt:      { fontFamily:'DMSerifDisplay_400Regular', fontSize:88, color:'rgba(255,255,255,0.07)', position:'absolute', right:-8, top:-18, lineHeight:96 },
  tapHintLt:    { fontFamily:'Poppins_500Medium', fontSize:13, color:'rgba(255,255,255,0.30)', marginTop:10 },
  tapHintDk:    { fontFamily:'Poppins_500Medium', fontSize:13, color:'rgba(0,0,0,0.22)', marginTop:10 },
  tapHintShop:  { fontFamily:'Poppins_500Medium', fontSize:13, color:'rgba(255,255,255,0.35)', marginTop:10 },

  addBtnLt:     { backgroundColor:'rgba(255,255,255,0.18)', borderRadius:10, paddingVertical:7, paddingHorizontal:14, flexShrink:0 },
  addBtnTxtLt:  { fontFamily:'Poppins_700Bold', fontSize:13, color:'rgba(255,255,255,0.85)' },
  addBtnDk:     { backgroundColor:'rgba(0,0,0,0.10)', borderRadius:10, paddingVertical:7, paddingHorizontal:14, flexShrink:0 },
  addBtnTxtDk:  { fontFamily:'Poppins_700Bold', fontSize:13, color:'rgba(0,0,0,0.55)' },

  emptyLt:      { fontFamily:'Poppins_400Regular', fontSize:16, color:'rgba(255,255,255,0.40)', fontStyle:'italic' as const, paddingVertical:8 },
  emptyDk:      { fontFamily:'Poppins_400Regular', fontSize:16, color:'rgba(0,0,0,0.32)', fontStyle:'italic' as const, paddingVertical:8 },
  emptyShop:    { fontFamily:'Poppins_400Regular', fontSize:16, color:'rgba(255,255,255,0.50)', fontStyle:'italic' as const, paddingVertical:8 },

  tRow:         { flexDirection:'row', alignItems:'center', gap:10, marginBottom:12 },
  tTime:        { fontFamily:'Poppins_500Medium', fontSize:13, color:'rgba(255,255,255,0.52)', width:60, flexShrink:0 },
  tDot:         { width:7, height:7, borderRadius:4, flexShrink:0 },
  tEv:          { fontFamily:'Poppins_400Regular', fontSize:17, color:'rgba(255,255,255,0.90)', flex:1 },
  tAv:          { width:28, height:28, borderRadius:14, alignItems:'center' as const, justifyContent:'center' as const, flexShrink:0 },
  tAvTxt:       { fontFamily:'Poppins_700Bold', fontSize:10, color:'#fff' },

  calFooter:    { flexDirection:'row', justifyContent:'flex-end', marginTop:14, paddingTop:12, borderTopWidth:1, borderTopColor:'rgba(255,255,255,0.09)' },
  calFullLink:  { fontFamily:'Poppins_600SemiBold', fontSize:13, color:'rgba(255,255,255,0.40)' },

  evExpanded:      { backgroundColor:'rgba(255,255,255,0.07)', borderRadius:12, padding:12, marginBottom:10, marginTop:2 },
  evNote:          { fontFamily:'Poppins_400Regular', fontSize:13, color:'rgba(255,255,255,0.52)', marginBottom:6, lineHeight:18 },
  evWho:           { fontFamily:'Poppins_500Medium', fontSize:12, color:'rgba(255,255,255,0.38)', marginBottom:10 },
  evActions:       { flexDirection:'row', gap:8 },
  evEditBtn:       { flex:1, backgroundColor:'rgba(255,255,255,0.14)', borderRadius:10, paddingVertical:10, alignItems:'center' as const },
  evEditTxt:       { fontFamily:'Poppins_600SemiBold', fontSize:13, color:'rgba(255,255,255,0.82)' },
  evDelBtn:        { backgroundColor:'rgba(255,69,69,0.18)', borderRadius:10, paddingVertical:10, paddingHorizontal:14, alignItems:'center' as const },
  evDelTxt:        { fontFamily:'Poppins_600SemiBold', fontSize:13, color:'rgba(255,120,120,0.90)' },
  evDelConfirmBtn: { flex:1, backgroundColor:'rgba(255,69,69,0.30)', borderRadius:10, paddingVertical:10, alignItems:'center' as const },
  evDelConfirmTxt: { fontFamily:'Poppins_700Bold', fontSize:13, color:'#FF9090' },

  actRow:     { flexDirection:'row', alignItems:'center', gap:10, marginBottom:11 },
  actChk:     { width:26, height:26, borderRadius:13, borderWidth:1.5, borderColor:'rgba(0,0,0,0.20)', flexShrink:0, alignItems:'center' as const, justifyContent:'center' as const },
  actChkDone: { backgroundColor:'rgba(0,0,0,0.14)', borderColor:'transparent' },
  actDot:     { width:7, height:7, borderRadius:4, flexShrink:0 },
  actTxt:     { fontFamily:'Poppins_400Regular', fontSize:16, color:'#1A1A1A', flex:1, lineHeight:21 },
  actWho:     { width:26, height:26, borderRadius:13, alignItems:'center' as const, justifyContent:'center' as const, flexShrink:0 },
  actWhoTxt:  { fontFamily:'Poppins_700Bold', fontSize:10, color:'#fff' },
  bdg:        { borderRadius:5, paddingVertical:3, paddingHorizontal:7, flexShrink:0 },
  bdgRem:     { backgroundColor:'rgba(255,69,69,0.12)' },
  bdgOvd:     { backgroundColor:'rgba(220,38,38,0.12)' },
  bdgTxt:     { fontFamily:'Poppins_700Bold', fontSize:9, textTransform:'uppercase' as const, letterSpacing:0.5 },
  actDivider: { flexDirection:'row', alignItems:'center', gap:8, marginVertical:10 },
  actDivLine: { flex:1, height:1, backgroundColor:'rgba(0,0,0,0.10)' },
  actDivLbl:  { fontFamily:'Poppins_700Bold', fontSize:10, letterSpacing:0.4, textTransform:'uppercase' as const, color:'rgba(0,0,0,0.35)' },
});
