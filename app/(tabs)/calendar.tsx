/**
 * Calendar Screen - V7
 * app/(tabs)/calendar.tsx
 */

import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Line, Path, Polyline, Rect } from 'react-native-svg';
import { supabase } from '../../lib/supabase';
import { HamburgerButton, NavMenu } from '../components/NavMenu';

const DUMMY_FAMILY_ID = '00000000-0000-0000-0000-000000000001';
const ANTHROPIC_API_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY || '';

function IcoMic({ color = 'rgba(0,0,0,0.45)' }: { color?: string }) {
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

const C = {
  blue:   '#0057FF', mag:    '#E0007C', ink:    '#0A0A0A',
  ink2:   'rgba(0,0,0,0.50)', ink3:   'rgba(0,0,0,0.28)',
  border: 'rgba(0,0,0,0.07)', bg:     '#F7F7F7',
  card:   '#FFFFFF', green:  '#00C97A', orange: '#FF8C00',
  yellow: '#FFE500',
};

const DAYS_SHORT = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const DAYS_HDR   = ['M','T','W','T','F','S','S'];
const MONTHS     = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const EV_COLORS  = [C.mag, C.blue, C.orange, C.green, '#9B6DD6', '#00B4D8'];

const DURATION_OPTIONS = [
  '15 min','30 min','45 min',
  '1 hr','1.5 hr','2 hr','2.5 hr','3 hr','3.5 hr','4 hr',
  '5 hr','6 hr','8 hr','All day',
];
const DURATION_MINS = [
  15,30,45,
  60,90,120,150,180,210,240,
  300,360,480,1439,
];

const FAMILY_MEMBERS = [
  { id:'1', name:'Anna',    color:C.blue },
  { id:'2', name:'Richard', color:C.orange },
  { id:'3', name:'Poppy',   color:'#9B6DD6' },
  { id:'4', name:'Gab',     color:'#00B4D8' },
  { id:'5', name:'Duke',    color:'#4A90E2' },
];

const HOURS   = Array.from({ length:12 }, (_, i) => i + 1);
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

// ── Brief session state (module-level — persists across tab switches) ──
let lastBriefTime: number | null = null;
let cachedBriefText: string | null = null;
let cachedBriefCta: string | null = null;
let briefDismissed = false;

function evColor(i: number) { return EV_COLORS[i % EV_COLORS.length]; }
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}
function fmtTime(iso: string) {
  const timePart = iso ? iso.replace('T',' ').split(' ')[1] || '' : '';
  if (!timePart) return '';
  const [hStr, mStr] = timePart.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  const ampm = h >= 12 ? 'pm' : 'am';
  const h12  = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2,'0')} ${ampm}`;
}
function getDaysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
function getFirstDayOfMonth(y: number, m: number) { return (new Date(y, m, 1).getDay() + 6) % 7; }
function addDays(date: Date, n: number) { const d = new Date(date); d.setDate(d.getDate() + n); return d; }

function getTimeFrame(hour: number): string {
  if (hour >= 6  && hour < 12) return 'morning';
  if (hour >= 12 && hour < 16) return 'afternoon';
  if (hour >= 16 && hour < 19) return 'evening';
  if (hour >= 19 && hour < 21) return 'winding down';
  if (hour >= 21 && hour < 23) return 'night';
  return 'late night';
}

function BoldText({ text, style, boldStyle }: { text: string; style: any; boldStyle: any }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <Text style={style}>
      {parts.map((part, i) =>
        part.startsWith('**') && part.endsWith('**')
          ? <Text key={i} style={boldStyle}>{part.slice(2,-2)}</Text>
          : <Text key={i}>{part}</Text>
      )}
    </Text>
  );
}

// ── PULSING AVATAR ────────────────────────────────────────────
function PulsingAvatar({ color = C.mag }: { color?: string }) {
  const scale   = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.55)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.parallel([
        Animated.timing(scale,   { toValue:1.18, duration:900, easing:Easing.inOut(Easing.ease), useNativeDriver:true }),
        Animated.timing(opacity, { toValue:0,    duration:900, easing:Easing.in(Easing.ease),    useNativeDriver:true }),
      ]),
      Animated.parallel([
        Animated.timing(scale,   { toValue:1,    duration:0, useNativeDriver:true }),
        Animated.timing(opacity, { toValue:0.55, duration:0, useNativeDriver:true }),
      ]),
      Animated.delay(700),
    ])).start();
  }, []);
  return (
    <View style={{ width:30, height:30, alignItems:'center', justifyContent:'center' }}>
      <Animated.View style={{ position:'absolute', width:30, height:30, borderRadius:10, backgroundColor:color, transform:[{scale}], opacity }}/>
      <View style={{ width:30, height:30, borderRadius:10, backgroundColor:color, alignItems:'center', justifyContent:'center' }}>
        <Text style={{ fontSize:15, color:'#fff' }}>{'✦'}</Text>
      </View>
    </View>
  );
}

// ── TYPING DOTS ───────────────────────────────────────────────
function TypingDots() {
  const d0 = useRef(new Animated.Value(0)).current;
  const d1 = useRef(new Animated.Value(0)).current;
  const d2 = useRef(new Animated.Value(0)).current;
  const dots = [d0, d1, d2];
  useEffect(() => {
    const anims = dots.map((dot, i) =>
      Animated.loop(Animated.sequence([
        Animated.delay(i * 180),
        Animated.timing(dot, { toValue:1, duration:300, useNativeDriver:true }),
        Animated.timing(dot, { toValue:0, duration:300, useNativeDriver:true }),
        Animated.delay((2 - i) * 180),
      ]))
    );
    anims.forEach(a => a.start());
    return () => anims.forEach(a => a.stop());
  }, []);
  return (
    <View style={{ flexDirection:'row', gap:5, paddingVertical:8 }}>
      {dots.map((dot, i) => (
        <Animated.View key={i} style={{
          width:7, height:7, borderRadius:4, backgroundColor:C.mag,
          opacity: dot,
          transform: [{ scale: dot.interpolate({ inputRange:[0,1], outputRange:[0.7,1] }) }],
        }}/>
      ))}
    </View>
  );
}

// ── BRIEF CARD ────────────────────────────────────────────────
function BriefCard({ events, todos, onDismiss }: {
  events: any[]; todos: any[]; onDismiss: () => void;
}) {
  const [loading,   setLoading]   = useState(true);
  const [briefText, setBriefText] = useState('');
  const [ctaLabel,  setCtaLabel]  = useState("Let's talk it through");
  const cardFade  = useRef(new Animated.Value(0)).current;
  const cardSlide = useRef(new Animated.Value(0)).current;
  const router    = useRouter();

  useEffect(() => {
    Animated.timing(cardFade, { toValue:1, duration:400, useNativeDriver:true }).start();
    const now = Date.now();
    if (cachedBriefText && lastBriefTime && (now - lastBriefTime) < 30 * 60 * 1000) {
      setBriefText(cachedBriefText);
      setCtaLabel(cachedBriefCta || "Let's talk it through");
      setLoading(false);
      return;
    }
    generateBrief();
  }, []);

  const generateBrief = async () => {
    try {
      const now       = new Date();
      const hour      = now.getHours();
      const timeFrame = getTimeFrame(hour);
      const timeStr   = now.toLocaleTimeString('en-AU', { hour:'2-digit', minute:'2-digit', hour12:true });
      const dateStr   = now.toLocaleDateString('en-AU', { weekday:'long', day:'numeric', month:'long' });
      const todayStr  = now.toISOString().split('T')[0];
      const in48h     = new Date(now.getTime() + 48*60*60*1000);
      const in48hStr  = in48h.toISOString().split('T')[0];

      const upcomingEvs = events.filter(e => e.date >= todayStr && e.date <= in48hStr);
      const recentPast  = events.filter(e => {
        if (!e.start_time) return false;
        const evTime = new Date(e.start_time.replace(' ','T'));
        const diff   = now.getTime() - evTime.getTime();
        return diff > 0 && diff < 6 * 60 * 60 * 1000;
      });
      const urgentTodos = todos.filter(t =>
        t.status !== 'done' && (t.priority === 'urgent' || (t.due_date && t.due_date <= todayStr))
      ).slice(0, 2);

      const toneMap: Record<string, string> = {
        morning: 'energetic and practical',
        afternoon: 'steady and helpful',
        evening: 'warm, slightly urgent',
        'winding down': 'warm and forward-looking',
        night: 'calm and settling',
        'late night': 'minimal and gentle',
      };

      const contextStr = [
        `Current time: ${timeStr} on ${dateStr}`,
        `Time frame: ${timeFrame}`,
        upcomingEvs.length ? `Upcoming events (next 48h): ${upcomingEvs.map(e => `${e.title} at ${fmtTime(e.start_time)} on ${e.date}`).join(', ')}` : 'No upcoming events in next 48h',
        recentPast.length  ? `Recent past events (last 6h): ${recentPast.map(e => e.title).join(', ')}` : '',
        urgentTodos.length ? `Urgent/overdue todos: ${urgentTodos.map(t => t.title).join(', ')}` : 'No urgent todos',
      ].filter(Boolean).join('\n');

      const prompt = `You are Zaeli, a warm and witty AI family assistant. Generate a calendar screen brief for Anna.

RULES:
- Max 3-4 sentences total
- Structure: [optional warm callback if recent event] + [most important upcoming thing] + [one thing slipping if relevant] + [specific contextual question]
- Never start with "I"
- Never sound like a push notification or status report
- Be specific — name events, times, people
- End with ONE question offering something concrete Zaeli can do right now
- Bold key names/times using **bold** syntax (max 3 bolds)
- Tone: ${toneMap[timeFrame] || 'warm and helpful'}
- If calendar is empty, still say something real and useful — don't just state the obvious

CONTEXT:
${contextStr}

Respond ONLY in this exact JSON format with no extra text:
{"brief": "The brief text here.", "cta": "Short CTA label (3-5 words)"}`;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 200,
          messages: [{ role:'user', content: prompt }],
        }),
      });

      const data   = await response.json();
      const raw    = data?.content?.[0]?.text || '';
      const clean  = raw.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(clean);

      cachedBriefText = parsed.brief || '';
      cachedBriefCta  = parsed.cta   || "Let's talk it through";
      lastBriefTime   = Date.now();

      setBriefText(cachedBriefText!);
      setCtaLabel(cachedBriefCta!);
    } catch (e) {
      console.log('Brief error:', e);
      setBriefText("Calendar's looking clear — a good moment to get ahead of the week. Want me to take a look at what's coming up?");
      setCtaLabel("Let's take a look");
    } finally {
      setLoading(false);
    }
  };

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(cardFade,  { toValue:0,   duration:300, useNativeDriver:true }),
      Animated.timing(cardSlide, { toValue:-12, duration:300, easing:Easing.in(Easing.ease), useNativeDriver:true }),
    ]).start(() => {
      briefDismissed = true;
      onDismiss();
    });
  };

  const handleCta = () => {
    router.push({
      pathname: '/(tabs)/zaeli-chat',
      params: { channel:'Calendar', returnTo:'/(tabs)/calendar', seedMessage: briefText },
    });
  };

  const now     = new Date();
  const timeStr = (now.getHours() % 12 || 12) + ':' + String(now.getMinutes()).padStart(2,'0') + ' ' + (now.getHours() < 12 ? 'am' : 'pm');

  return (
    <Animated.View style={[s.briefCard, { opacity:cardFade, transform:[{ translateY:cardSlide }] }]}>
      <View style={s.briefHeader}>
        <PulsingAvatar color={C.mag}/>
        <Text style={s.briefName}>
          {'Z'}<Text style={{ color:C.mag }}>{'a'}</Text>{'el'}<Text style={{ color:C.mag }}>{'i'}</Text>
        </Text>
        <View style={s.briefLiveDot}/>
        <Text style={s.briefTime}>{timeStr}</Text>
      </View>
      <View style={s.briefBody}>
        {loading ? (
          <TypingDots/>
        ) : (
          <BoldText
            text={briefText}
            style={s.briefMsg}
            boldStyle={[s.briefMsg, { fontFamily:'Poppins_700Bold' }]}
          />
        )}
        {!loading && (
          <View style={s.briefBtns}>
            <TouchableOpacity style={s.btnPrimary} onPress={handleCta} activeOpacity={0.85}>
              <Text style={s.btnPrimaryTxt}>{ctaLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.btnGhost} onPress={dismiss} activeOpacity={0.7}>
              <Text style={s.btnGhostTxt}>{"I'm sorted, thanks"}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

// ── RELAXED CARD ──────────────────────────────────────────────
const CAL_ACK_MSGS = ['No worries! 😊', 'Sorted! 🗓️', 'Got it! ✓', 'All good! 👍'];

function RelaxedCard() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const router = useRouter();
  const ackMsg = useRef(CAL_ACK_MSGS[Math.floor(Math.random() * CAL_ACK_MSGS.length)]).current;

  useEffect(() => {
    setTimeout(() => {
      Animated.timing(fadeAnim, { toValue:1, duration:350, useNativeDriver:true }).start();
    }, 350);
  }, []);

  return (
    <Animated.View style={[s.relaxedCard, { opacity:fadeAnim }]}>
      <View style={s.relaxedHeader}>
        <View style={s.relaxedAv}>
          <Text style={{ fontSize:14, color:'#fff' }}>{'✦'}</Text>
        </View>
        <Text style={s.relaxedAck}>{ackMsg}</Text>
      </View>
      <View style={s.relaxedBody}>
        <Text style={s.relaxedTitle}>{'Ask Zaeli anything'}</Text>
        <Text style={s.relaxedMsg}>
          {'Did you know I can set up recurring events for you? School pickup, footy training, piano lessons — tell me once and I\'ll remember every week. ♻️'}
        </Text>
        <TouchableOpacity
          style={s.relaxedBtn}
          onPress={() => router.push({ pathname:'/(tabs)/zaeli-chat', params:{ channel:'Calendar', returnTo:'/(tabs)/calendar' } })}
          activeOpacity={0.8}
        >
          <Text style={s.relaxedBtnTxt}>{'Open Zaeli →'}</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

// ── ADD EVENT (sheet + form — single modal) ──────────────────
const REPEAT_OPTIONS = ['Never','Every day','Every week','Every fortnight','Every month','Every year'];
const ALERT_OPTIONS  = ['None','At time of event','5 min before','15 min before','30 min before','1 hour before','2 hours before','1 day before','1 week before'];

function MiniCalPicker({ dateStr, onChange }: {
  dateStr: string; onChange: (s: string) => void;
}) {
  const toLocalDateStr = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const [open, setOpen] = useState(false);
  const [navDate, setNavDate] = useState(() => new Date(dateStr + 'T12:00:00'));

  const calFirstDay = getFirstDayOfMonth(navDate.getFullYear(), navDate.getMonth());
  const calDim      = getDaysInMonth(navDate.getFullYear(), navDate.getMonth());
  const calPrevDim  = getDaysInMonth(navDate.getFullYear(), navDate.getMonth() - 1);
  const cells: { day:number; cur:boolean; date:Date }[] = [];
  for (let i = calFirstDay-1; i >= 0; i--)
    cells.push({ day:calPrevDim-i, cur:false, date:new Date(navDate.getFullYear(), navDate.getMonth()-1, calPrevDim-i) });
  for (let d = 1; d <= calDim; d++)
    cells.push({ day:d, cur:true, date:new Date(navDate.getFullYear(), navDate.getMonth(), d) });
  while (cells.length % 7 !== 0) {
    const n = cells.length - calFirstDay - calDim + 1;
    cells.push({ day:n, cur:false, date:new Date(navDate.getFullYear(), navDate.getMonth()+1, n) });
  }

  const display = new Date(dateStr + 'T12:00:00').toLocaleDateString('en-AU', { day:'numeric', month:'short', year:'numeric' });

  return (
    <>
      <TouchableOpacity style={s.gcPill} onPress={() => setOpen(true)} activeOpacity={0.7}>
        <Text style={[s.gcPillTxt, open && { color: C.mag }]}>{display}</Text>
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.45)', justifyContent:'center', alignItems:'center', padding:24 }}>
          <View style={{ backgroundColor:'#fff', borderRadius:20, width:'100%', padding:16,
            shadowColor:'#000', shadowOpacity:0.15, shadowRadius:20, shadowOffset:{ width:0, height:8 } }}>
            {/* Nav */}
            <View style={s.miniCalNav}>
              <TouchableOpacity style={s.miniCalArrBtn} onPress={() => setNavDate(d => { const n=new Date(d); n.setMonth(n.getMonth()-1); return n; })}>
                <Text style={s.miniCalArr}>{'‹'}</Text>
              </TouchableOpacity>
              <Text style={s.miniCalLbl}>{MONTHS[navDate.getMonth()]} {navDate.getFullYear()}</Text>
              <TouchableOpacity style={s.miniCalArrBtn} onPress={() => setNavDate(d => { const n=new Date(d); n.setMonth(n.getMonth()+1); return n; })}>
                <Text style={s.miniCalArr}>{'›'}</Text>
              </TouchableOpacity>
            </View>
            {/* Grid */}
            <View style={s.miniCalGrid}>
              {DAYS_HDR.map((d,i) => <Text key={i} style={s.miniCalHdr}>{d}</Text>)}
              {cells.map((cell,i) => {
                const isSel = dateStr === toLocalDateStr(cell.date);
                const isToday = toLocalDateStr(cell.date) === toLocalDateStr(new Date());
                return (
                  <TouchableOpacity key={i} style={s.miniCalDay}
                    onPress={() => { onChange(toLocalDateStr(cell.date)); setOpen(false); }} activeOpacity={0.7}>
                    <View style={[s.miniCalDayInner, isSel && { backgroundColor: C.mag }, isToday && !isSel && { backgroundColor: 'rgba(224,0,124,0.12)' }]}>
                      <Text style={[s.miniCalDayTxt, !cell.cur && { color:C.ink3 }, isSel && { color:'#fff' }, isToday && !isSel && { color: C.mag, fontFamily:'Poppins_700Bold' }]}>{cell.day}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
            {/* Cancel */}
            <TouchableOpacity onPress={() => setOpen(false)} style={{ alignItems:'center', paddingTop:12, paddingBottom:4 }} activeOpacity={0.7}>
              <Text style={{ fontFamily:'Poppins_600SemiBold', fontSize:15, color:C.ink2 }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

// ── TIME PICKER MODAL ────────────────────────────────────────
const ROW_H = 52;

function SnapCol({ items, selected, onSelect, fmtItem }: {
  items: (string|number)[];
  selected: string|number;
  onSelect: (v: string|number) => void;
  fmtItem?: (v: string|number) => string;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const selIdx = items.indexOf(selected);

  useEffect(() => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: selIdx * ROW_H, animated: false });
    }, 50);
  }, []);

  return (
    <View style={{ flex:1, height: ROW_H * 5, overflow:'hidden' }}>
      {/* centre highlight */}
      <View pointerEvents="none" style={{
        position:'absolute', top: ROW_H * 2, left:4, right:4, height: ROW_H,
        backgroundColor:'rgba(224,0,124,0.08)',
        borderRadius:12,
        borderTopWidth:1.5, borderBottomWidth:1.5,
        borderColor:'rgba(224,0,124,0.20)',
        zIndex:2,
      }}/>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ROW_H}
        decelerationRate="fast"
        contentContainerStyle={{ paddingVertical: ROW_H * 2 }}
        onMomentumScrollEnd={e => {
          const idx = Math.round(e.nativeEvent.contentOffset.y / ROW_H);
          const clamped = Math.max(0, Math.min(idx, items.length - 1));
          onSelect(items[clamped]);
        }}
        onScrollEndDrag={e => {
          const idx = Math.round(e.nativeEvent.contentOffset.y / ROW_H);
          const clamped = Math.max(0, Math.min(idx, items.length - 1));
          onSelect(items[clamped]);
        }}
      >
        {items.map((item, i) => {
          const isSel = item === selected;
          const label = fmtItem ? fmtItem(item) : (
            typeof item === 'number' ? String(item).padStart(2,'0') : String(item).toUpperCase()
          );
          return (
            <TouchableOpacity
              key={i}
              style={{ height: ROW_H, alignItems:'center', justifyContent:'center' }}
              onPress={() => {
                scrollRef.current?.scrollTo({ y: i * ROW_H, animated: true });
                onSelect(item);
              }}
              activeOpacity={0.7}
            >
              <Text style={{
                fontFamily: isSel ? 'Poppins_700Bold' : 'Poppins_400Regular',
                fontSize: isSel ? 26 : 18,
                color: isSel ? C.ink : C.ink3,
              }}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

function TimePickerModal({ visible, hour, minute, ampm, onConfirm, onClose }: {
  visible: boolean;
  hour: number; minute: number; ampm: 'am'|'pm';
  onConfirm: (h:number, m:number, ap:'am'|'pm') => void;
  onClose: () => void;
}) {
  const [h, setH] = useState(hour);
  const [m, setM] = useState(minute);
  const [ap, setAp] = useState<'am'|'pm'>(ampm);

  useEffect(() => {
    if (visible) { setH(hour); setM(minute); setAp(ampm); }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.45)', justifyContent:'center', alignItems:'center', padding:32 }}>
        <View style={{ backgroundColor:'#fff', borderRadius:24, width:'100%', padding:24,
          shadowColor:'#000', shadowOpacity:0.18, shadowRadius:24, shadowOffset:{ width:0, height:8 } }}>
          <Text style={{ fontFamily:'Poppins_700Bold', fontSize:16, color:C.ink, textAlign:'center', marginBottom:16 }}>Select time</Text>
          <View style={{ flexDirection:'row', alignItems:'center', gap:0 }}>
            <SnapCol items={HOURS}            selected={h}  onSelect={v => setH(v as number)}/>
            <Text style={{ fontFamily:'Poppins_700Bold', fontSize:28, color:C.ink3, paddingHorizontal:4, marginBottom:4 }}>:</Text>
            <SnapCol items={MINUTES}          selected={m}  onSelect={v => setM(v as number)}/>
            <View style={{ width:1, backgroundColor:C.border, alignSelf:'stretch', marginHorizontal:8, marginVertical:8 }}/>
            <SnapCol items={['am','pm']}       selected={ap} onSelect={v => setAp(v as 'am'|'pm')}/>
          </View>
          <View style={{ flexDirection:'row', gap:12, marginTop:20 }}>
            <TouchableOpacity style={{ flex:1, paddingVertical:14, borderRadius:14, borderWidth:1.5, borderColor:C.border, alignItems:'center' }}
              onPress={onClose} activeOpacity={0.8}>
              <Text style={{ fontFamily:'Poppins_600SemiBold', fontSize:15, color:C.ink2 }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ flex:1, paddingVertical:14, borderRadius:14, backgroundColor:C.mag, alignItems:'center' }}
              onPress={() => { onConfirm(h, m, ap); onClose(); }} activeOpacity={0.85}>
              <Text style={{ fontFamily:'Poppins_700Bold', fontSize:15, color:'#fff' }}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function TimePill({ hour, minute, ampm, onHour, onMinute, onAmpm }: {
  hour:number; minute:number; ampm:'am'|'pm';
  onHour:(h:number)=>void; onMinute:(m:number)=>void; onAmpm:(a:'am'|'pm')=>void;
}) {
  const [open, setOpen] = useState(false);
  const display = `${hour}:${String(minute).padStart(2,'0')} ${ampm.toUpperCase()}`;
  return (
    <>
      <TouchableOpacity style={s.gcPill} onPress={() => setOpen(true)} activeOpacity={0.7}>
        <Text style={[s.gcPillTxt, open && { color: C.mag }]}>{display}</Text>
      </TouchableOpacity>
      <TimePickerModal
        visible={open}
        hour={hour} minute={minute} ampm={ampm}
        onConfirm={(h, m, ap) => { onHour(h); onMinute(m); onAmpm(ap); }}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

function DropdownPicker({ options, value, onChange }: {
  options: string[]; value: string; onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View>
      <TouchableOpacity style={s.gcRowRight} onPress={() => setOpen(true)} activeOpacity={0.7}>
        <Text style={s.gcRowRightTxt}>{value}</Text>
        <Text style={{ color: C.ink3, fontSize: 14, marginLeft: 4 }}>{'⌄'}</Text>
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={{ flex:1, backgroundColor:'rgba(0,0,0,0.35)', justifyContent:'center', alignItems:'center', padding:32 }}
          onPress={() => setOpen(false)} activeOpacity={1}>
          <View style={{ backgroundColor:'#fff', borderRadius:18, width:'100%', overflow:'hidden',
            shadowColor:'#000', shadowOpacity:0.15, shadowRadius:20, shadowOffset:{ width:0, height:8 } }}>
            {options.map((opt, i) => (
              <TouchableOpacity key={opt}
                style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between',
                  paddingHorizontal:20, paddingVertical:16,
                  borderBottomWidth: i < options.length-1 ? 1 : 0, borderBottomColor:C.border }}
                onPress={() => { onChange(opt); setOpen(false); }} activeOpacity={0.7}>
                <Text style={{ fontFamily: opt===value ? 'Poppins_600SemiBold' : 'Poppins_400Regular',
                  fontSize:16, color: opt===value ? C.mag : C.ink }}>{opt}</Text>
                {opt === value && <Text style={{ color: C.mag, fontSize: 16, fontFamily:'Poppins_700Bold' }}>{'✓'}</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

function AddEventFlow({ visible, onClose, onSaved, selectedDate }: {
  visible: boolean; onClose: () => void; onSaved: () => void; selectedDate: Date;
}) {
  const router = useRouter();
  const toLocalDateStr = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

  const todayStr = toLocalDateStr(new Date());

  const [step,      setStep]      = useState<'sheet'|'form'>('sheet');
  const [title,     setTitle]     = useState('');
  const [location,  setLocation]  = useState('');
  const [notes,     setNotes]     = useState('');
  const [allDay,    setAllDay]    = useState(false);
  const [startDate, setStartDate] = useState(toLocalDateStr(selectedDate));
  const [endDate,   setEndDate]   = useState(toLocalDateStr(selectedDate));
  const [startHour, setStartHour] = useState(9);
  const [startMin,  setStartMin]  = useState(0);
  const [startAmpm, setStartAmpm] = useState<'am'|'pm'>('am');
  const [endHour,   setEndHour]   = useState(10);
  const [endMin,    setEndMin]    = useState(0);
  const [endAmpm,   setEndAmpm]   = useState<'am'|'pm'>('am');
  const [repeat,    setRepeat]    = useState('Never');
  const [alert,     setAlert]     = useState('None');
  const [assignees, setAssignees] = useState<string[]>(['1']);
  const [saving,    setSaving]    = useState(false);
  const [tab,       setTab]       = useState<'details'|'people'>('details');

  useEffect(() => {
    if (visible) {
      setStep('sheet'); setTitle(''); setLocation(''); setNotes('');
      setAllDay(false);
      setStartDate(toLocalDateStr(selectedDate)); setEndDate(toLocalDateStr(selectedDate));
      setStartHour(9); setStartMin(0); setStartAmpm('am');
      setEndHour(10);  setEndMin(0);   setEndAmpm('am');
      setRepeat('Never'); setAlert('None');
      setAssignees(['1']); setSaving(false); setTab('details');
    }
  }, [visible]);

  const toggleAssignee = (id: string) =>
    setAssignees(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const toH24 = (h: number, ap: 'am'|'pm') =>
    ap === 'pm' ? (h===12 ? 12 : h+12) : (h===12 ? 0 : h);

  const save = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const pad   = (n: number) => String(n).padStart(2,'0');
      const sh24  = toH24(startHour, startAmpm);
      const eh24  = toH24(endHour, endAmpm);
      // duration in minutes (handles multi-day via dates)
      const startMs = new Date(startDate + 'T' + pad(sh24) + ':' + pad(startMin) + ':00').getTime();
      const endMs   = new Date(endDate   + 'T' + pad(eh24) + ':' + pad(endMin)   + ':00').getTime();
      const durMs   = endMs - startMs;

      // build repeat dates — 52 weeks / 12 months max
      const repeatDates: Date[] = [];
      const base = new Date(startDate + 'T12:00:00');
      const addDays  = (d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
      const addMonths= (d: Date, n: number) => { const r = new Date(d); r.setMonth(r.getMonth() + n); return r; };
      if (repeat === 'Never') {
        repeatDates.push(base);
      } else if (repeat === 'Every day') {
        for (let i = 0; i < 60; i++) repeatDates.push(addDays(base, i));
      } else if (repeat === 'Every week') {
        for (let i = 0; i < 52; i++) repeatDates.push(addDays(base, i * 7));
      } else if (repeat === 'Every fortnight') {
        for (let i = 0; i < 26; i++) repeatDates.push(addDays(base, i * 14));
      } else if (repeat === 'Every month') {
        for (let i = 0; i < 12; i++) repeatDates.push(addMonths(base, i));
      } else if (repeat === 'Every year') {
        for (let i = 0; i < 3; i++) repeatDates.push(addMonths(base, i * 12));
      }

      const toStr = (d: Date) =>
        `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;

      const rows = repeatDates.map(d => {
        const dStr    = toStr(d);
        const sTime   = allDay ? `${dStr}T00:00:00` : `${dStr}T${pad(sh24)}:${pad(startMin)}:00`;
        const eMs     = new Date(sTime).getTime() + (allDay ? 0 : durMs);
        const eDate   = new Date(eMs);
        const eDStr   = toStr(eDate);
        const eTime   = allDay ? `${eDStr}T23:59:00` : `${eDStr}T${pad(eDate.getHours())}:${pad(eDate.getMinutes())}:00`;
        return {
          family_id:   DUMMY_FAMILY_ID,
          title:       title.trim(),
          notes:       [notes.trim(), location.trim()].filter(Boolean).join(' | '),
          date:        dStr,
          start_time:  sTime,
          end_time:    eTime,
          timezone:    'Australia/Brisbane',
          repeat_rule: repeat,
          alert_rule:  alert,
          assignees,
        };
      });

      // insert in batches of 20 to avoid payload limits
      for (let i = 0; i < rows.length; i += 20) {
        const batch = rows.slice(i, i + 20);
        let { error } = await supabase.from('events').insert(batch);
        if (error && (error.message?.includes('assignees') || error.code === '42703')) {
          const slim = batch.map(({ assignees: _a, ...r }) => r);
          const r2 = await supabase.from('events').insert(slim);
          error = r2.error;
        }
        if (error) { setSaving(false); return; }
      }

      lastBriefTime = null; cachedBriefText = null;
      onSaved();
    } catch (e: any) {
      console.log('Save error:', e?.message);
      setSaving(false);
    }
  };

  const dateLabel = selectedDate.toLocaleDateString('en-AU', { weekday:'long', day:'numeric', month:'long' });

  const openZaeli = () => {
    onClose();
    const isoDate = selectedDate.toISOString().split('T')[0];
    router.push({
      pathname: '/(tabs)/zaeli-chat',
      params: {
        channel: 'Calendar',
        returnTo: '/(tabs)/calendar',
        seedMessage: `I want to add a new event on ${dateLabel} (${isoDate}). Help me book it.`,
      },
    });
  };

  return (
    <>
      {/* ── SHEET MODAL: transparent overlay ── */}
      <Modal visible={visible && step === 'sheet'} transparent animationType="slide" onRequestClose={onClose}>
        <TouchableOpacity style={{ flex:1, backgroundColor:'rgba(0,0,0,0.4)' }} onPress={onClose} activeOpacity={1}/>
        <View style={{ backgroundColor:'#fff', borderTopLeftRadius:24, borderTopRightRadius:24, paddingHorizontal:20, paddingTop:14, paddingBottom:Platform.OS==='ios' ? 40 : 24, gap:16 }}>
          <View style={{ width:36, height:4, borderRadius:2, backgroundColor:C.border, alignSelf:'center', marginBottom:4 }}/>
          <View style={{ flexDirection:'row', alignItems:'center', gap:12 }}>
            <View style={s.sheetAv}><Text style={{ fontSize:16, color:'#fff' }}>✦</Text></View>
            <View style={{ flex:1 }}>
              <Text style={s.sheetTitle}>Add an event</Text>
              <Text style={s.sheetSub}>{dateLabel}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={s.sheetClose} activeOpacity={0.7}>
              <Text style={s.sheetCloseTxt}>✕</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={s.sheetPrimary} onPress={openZaeli} activeOpacity={0.85}>
            <View style={s.sheetPrimaryIcon}><Text style={{ fontSize:18 }}>✦</Text></View>
            <View style={{ flex:1 }}>
              <Text style={s.sheetPrimaryTitle}>Ask Zaeli to add it</Text>
              <Text style={s.sheetPrimaryDesc}>Just tell her what it is — she'll handle the details</Text>
            </View>
            <Text style={s.sheetPrimaryArrow}>→</Text>
          </TouchableOpacity>
          <View style={s.sheetDivider}>
            <View style={s.sheetDividerLine}/>
            <Text style={s.sheetDividerTxt}>or</Text>
            <View style={s.sheetDividerLine}/>
          </View>
          <TouchableOpacity style={s.sheetSecondary} onPress={() => setStep('form')} activeOpacity={0.8}>
            <Text style={s.sheetSecondaryTxt}>Fill in manually</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* ── FORM MODAL: full pageSheet ── */}
      <Modal visible={visible && step === 'form'} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
        <SafeAreaView style={{ flex:1, backgroundColor:'#fff' }} edges={['top']}>
          <KeyboardAvoidingView style={{ flex:1 }} behavior={Platform.OS==='ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>
            {/* Header */}
            <View style={s.modalHdr}>
              <TouchableOpacity onPress={onClose} hitSlop={{ top:12,bottom:12,left:12,right:12 }}>
                <Text style={s.modalCancel}>← Back</Text>
              </TouchableOpacity>
              <Text style={s.modalTitle}>New Event</Text>
              <TouchableOpacity onPress={save} disabled={!title.trim() || saving}>
                <Text style={[s.modalSave, (!title.trim()||saving) && { opacity:0.35 }]}>{saving ? 'Saving…' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
            {/* Tabs */}
            <View style={s.modalTabs}>
              {(['details','people'] as const).map(t => (
                <TouchableOpacity key={t} style={[s.modalTab, tab===t && s.modalTabOn]} onPress={() => setTab(t)} activeOpacity={0.8}>
                  <Text style={[s.modalTabTxt, tab===t && s.modalTabTxtOn]}>{t==='details' ? 'Details' : 'People'}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom:48 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {tab === 'details' ? (
                <View>
                  {/* Title + Location block */}
                  <View style={s.gcBlock}>
                    <TextInput style={s.gcTitleInput} value={title} onChangeText={setTitle}
                      placeholder="Title" placeholderTextColor={C.ink3} autoFocus/>
                    <View style={s.gcSep}/>
                    <TextInput style={s.gcSubInput} value={location} onChangeText={setLocation}
                      placeholder="Location or video call" placeholderTextColor={C.ink3}/>
                  </View>

                  {/* Date / Time block */}
                  <View style={s.gcBlock}>
                    {/* All-day toggle */}
                    <View style={s.gcRow}>
                      <Text style={s.gcRowLbl}>All day</Text>
                      <TouchableOpacity onPress={() => setAllDay(v => !v)} activeOpacity={0.8}>
                        <View style={[s.gcToggle, allDay && s.gcToggleOn]}>
                          <View style={[s.gcToggleThumb, allDay && s.gcToggleThumbOn]}/>
                        </View>
                      </TouchableOpacity>
                    </View>
                    <View style={s.gcSep}/>
                    {/* Start row */}
                    <View style={s.gcRow}>
                      <Text style={s.gcRowLbl}>Starts</Text>
                      <View style={{ flexDirection:'row', gap:8, alignItems:'center' }}>
                        <MiniCalPicker dateStr={startDate} onChange={d => { setStartDate(d); if (d > endDate) setEndDate(d); }}/>
                        {!allDay && <TimePill hour={startHour} minute={startMin} ampm={startAmpm} onHour={setStartHour} onMinute={setStartMin} onAmpm={setStartAmpm}/>}
                      </View>
                    </View>
                    <View style={s.gcSep}/>
                    {/* End row */}
                    <View style={s.gcRow}>
                      <Text style={s.gcRowLbl}>Ends</Text>
                      <View style={{ flexDirection:'row', gap:8, alignItems:'center' }}>
                        <MiniCalPicker dateStr={endDate} onChange={d => { if (d >= startDate) setEndDate(d); }}/>
                        {!allDay && <TimePill hour={endHour} minute={endMin} ampm={endAmpm} onHour={setEndHour} onMinute={setEndMin} onAmpm={setEndAmpm}/>}
                      </View>
                    </View>
                  </View>

                  {/* Repeat + Alert block */}
                  <View style={s.gcBlock}>
                    <View style={s.gcRow}>
                      <Text style={s.gcRowLbl}>Repeat</Text>
                      <DropdownPicker options={REPEAT_OPTIONS} value={repeat} onChange={setRepeat}/>
                    </View>
                    <View style={s.gcSep}/>
                    <View style={s.gcRow}>
                      <Text style={s.gcRowLbl}>Alert</Text>
                      <DropdownPicker options={ALERT_OPTIONS} value={alert} onChange={setAlert}/>
                    </View>
                  </View>

                  {/* Notes block */}
                  <View style={s.gcBlock}>
                    <TextInput style={s.gcSubInput} value={notes} onChangeText={setNotes}
                      placeholder="Notes" placeholderTextColor={C.ink3}
                      multiline numberOfLines={3} textAlignVertical="top"/>
                  </View>
                </View>
              ) : (
                /* People tab */
                <View style={{ padding:20, gap:12 }}>
                  <Text style={{ fontFamily:'Poppins_400Regular', fontSize:13, color:C.ink2, lineHeight:20 }}>Who is this event for?</Text>
                  {FAMILY_MEMBERS.map(m => {
                    const on = assignees.includes(m.id);
                    return (
                      <TouchableOpacity key={m.id} style={[s.memberRow, on && { borderColor:m.color+'40', backgroundColor:m.color+'08' }]}
                        onPress={() => toggleAssignee(m.id)} activeOpacity={0.8}>
                        <View style={[s.memberDot, { backgroundColor:m.color }]}/>
                        <Text style={s.memberName}>{m.name}</Text>
                        <View style={[s.memberCheck, on && { backgroundColor:m.color, borderColor:m.color }]}>
                          {on && <Text style={{ color:'#fff', fontSize:12, fontFamily:'Poppins_700Bold' }}>{'✓'}</Text>}
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
    </>
  );
}

// ── EVENT DETAIL MODAL ────────────────────────────────────────
function EventDetailModal({ event, onClose, onDeleted }: {
  event: any | null; onClose: () => void; onDeleted: () => void;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (event) { setDeleting(false); setConfirmDelete(false); }
  }, [event?.id]);

  if (!event) return null;

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    try {
      await supabase.from('events').delete().eq('id', event.id);
      onDeleted();
    } catch (e) { console.log('Delete error:', e); setDeleting(false); }
  };

  const handleEditWithZaeli = () => {
    onClose();
    router.push({
      pathname: '/(tabs)/zaeli-chat',
      params: {
        channel: 'Calendar',
        returnTo: '/(tabs)/calendar',
        seedMessage: `I want to edit the "${event.title}" event on ${event.date}. Help me update it.`,
      },
    });
  };

  return (
    <Modal visible={!!event} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex:1, backgroundColor:'#fff' }} edges={['top']}>
        <View style={s.modalHdr}>
          <TouchableOpacity onPress={onClose}><Text style={s.modalCancel}>Close</Text></TouchableOpacity>
          <Text style={s.modalTitle}>Event</Text>
          <View style={{ width:60 }}/>
        </View>
        <ScrollView contentContainerStyle={{ padding:22, gap:18 }}>
          <Text style={{ fontFamily:'Poppins_700Bold', fontSize:22, color:C.ink, lineHeight:30 }}>{event.title}</Text>

          {/* Date */}
          {event.date && (
            <View style={s.detailRow}>
              <Text style={s.detailIcon}>📅</Text>
              <View>
                <Text style={s.detailTxt}>{new Date(event.date+'T12:00:00').toLocaleDateString('en-AU', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}</Text>
                {event.end_time && (() => {
                  const endDate = event.end_time.split('T')[0];
                  return endDate !== event.date
                    ? <Text style={[s.detailTxt, { color:C.ink2 }]}>{'→ ' + new Date(endDate+'T12:00:00').toLocaleDateString('en-AU', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}</Text>
                    : null;
                })()}
              </View>
            </View>
          )}

          {/* Time */}
          {event.start_time && (
            <View style={s.detailRow}>
              <Text style={s.detailIcon}>🕐</Text>
              <Text style={s.detailTxt}>{fmtTime(event.start_time)}{event.end_time ? ` → ${fmtTime(event.end_time)}` : ''}</Text>
            </View>
          )}

          {/* Repeat */}
          {event.repeat_rule && event.repeat_rule !== 'Never' && (
            <View style={s.detailRow}>
              <Text style={s.detailIcon}>🔁</Text>
              <Text style={s.detailTxt}>{event.repeat_rule}</Text>
            </View>
          )}

          {/* Alert */}
          {event.alert_rule && event.alert_rule !== 'None' && (
            <View style={s.detailRow}>
              <Text style={s.detailIcon}>🔔</Text>
              <Text style={s.detailTxt}>{event.alert_rule}</Text>
            </View>
          )}

          {/* Notes */}
          {event.notes ? (
            <View style={s.detailRow}>
              <Text style={s.detailIcon}>📝</Text>
              <Text style={s.detailTxt}>{event.notes}</Text>
            </View>
          ) : null}

          <View style={{ height:12 }}/>

          {/* Edit with Zaeli */}
          <TouchableOpacity style={s.editBtn} onPress={handleEditWithZaeli} activeOpacity={0.8}>
            <Text style={s.editBtnTxt}>✨  Edit with Zaeli</Text>
          </TouchableOpacity>

          <View style={{ height:4 }}/>

          {/* Delete */}
          <TouchableOpacity
            style={[s.deleteBtn, confirmDelete && s.deleteBtnConfirm]}
            onPress={handleDelete}
            disabled={deleting}
            activeOpacity={0.8}
          >
            <Text style={s.deleteBtnTxt}>
              {deleting ? 'Deleting...' : confirmDelete ? '⚠️ Confirm delete' : '🗑  Delete event'}
            </Text>
          </TouchableOpacity>
          {confirmDelete && (
            <TouchableOpacity onPress={() => setConfirmDelete(false)} style={{ alignItems:'center', paddingVertical:8 }}>
              <Text style={{ fontFamily:'Poppins_500Medium', fontSize:13, color:C.ink2 }}>Cancel</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ── TIME PICKER ───────────────────────────────────────────────
// ── MAIN SCREEN ───────────────────────────────────────────────
export default function CalendarScreen() {
  const today  = new Date();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const openChat = (seed?: string) => router.push({
    pathname: '/(tabs)/zaeli-chat',
    params: { channel:'Calendar', returnTo:'/(tabs)/calendar', ...(seed ? { seedMessage: seed } : {}) },
  });

  const [view,         setView]         = useState<'day'|'week'|'month'>('day');
  const [selectedDate, setSelectedDate] = useState(new Date(today));
  const [calMonth,     setCalMonth]     = useState(today.getMonth());
  const [calYear,      setCalYear]      = useState(today.getFullYear());
  const [events,       setEvents]       = useState<any[]>([]);
  const [todos,        setTodos]        = useState<any[]>([]);
  const [dismissed,    setDismissed]    = useState(briefDismissed);
  const [showRelaxed,  setShowRelaxed]  = useState(briefDismissed);
  const [menuOpen,     setMenuOpen]     = useState(false);
  const [showSheet,    setShowSheet]    = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null); // ← event detail

  // ── Deep-link: open specific event from home radar ──────────────────────────
  const params = useLocalSearchParams<{ eventId?: string }>();
  const handledEventId = useRef<string | null>(null);

  useEffect(() => {
    const id = params.eventId;
    if (!id || id === handledEventId.current) return;
    // events may not be loaded yet — wait until they are
    if (events.length === 0) return;
    const found = events.find((e: any) => String(e.id) === String(id));
    if (found) {
      handledEventId.current = id;
      setSelectedEvent(found);
    }
  }, [params.eventId, events]);

  const STRIP_BEFORE = 60;
  const PILL_W       = 56;
  const stripDays    = Array.from({ length:180 }, (_, i) => addDays(today, i - STRIP_BEFORE));
  const weekStripRef = useRef<ScrollView>(null);

  useEffect(() => {
    const t = setTimeout(() => weekStripRef.current?.scrollTo({ x: STRIP_BEFORE * PILL_W, animated:false }), 400);
    return () => clearTimeout(t);
  }, []);

  const loadEvents = useCallback(async () => {
    try {
      const fromDate = `${calYear}-${String(calMonth+1).padStart(2,'0')}-01`;
      const toYear   = calMonth===11 ? calYear+1 : calYear;
      const toMonth  = calMonth===11 ? 1 : calMonth+2;
      const toDate   = `${toYear}-${String(toMonth).padStart(2,'0')}-01`;
      const { data, error } = await supabase.from('events').select('*')
        .eq('family_id', DUMMY_FAMILY_ID).gte('date', fromDate).lt('date', toDate).order('start_time');
      if (!error) setEvents(data || []);
    } catch (e) { console.log('loadEvents error:', e); }
  }, [calMonth, calYear]);

  const loadTodos = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('todos').select('*')
        .eq('family_id', DUMMY_FAMILY_ID).neq('status', 'done').order('due_date');
      if (!error) setTodos(data || []);
    } catch (e) { console.log('loadTodos error:', e); }
  }, []);

  useEffect(() => { loadEvents(); }, [loadEvents]);
  useEffect(() => { loadTodos();  }, [loadTodos]);

  useFocusEffect(useCallback(() => {
    loadEvents();
    loadTodos();
    if (briefDismissed && lastBriefTime && (Date.now() - lastBriefTime) > 2*60*60*1000) {
      briefDismissed = false; lastBriefTime = null; cachedBriefText = null;
      setDismissed(false); setShowRelaxed(false);
    }
  }, [loadEvents, loadTodos]));

  useEffect(() => {
    setCalMonth(selectedDate.getMonth());
    setCalYear(selectedDate.getFullYear());
  }, [selectedDate]);

  const toLocalDateStr = (d: Date) =>
    d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');

  const selectedDateStr = toLocalDateStr(selectedDate);
  const todayStr        = toLocalDateStr(today);
  const dayEvents       = events.filter(e => (e.date||'') === selectedDateStr);
  const daysWithEvSet   = new Set(events.map(e => e.date||''));

  const handleDismiss = () => {
    setDismissed(true);
    setTimeout(() => setShowRelaxed(true), 350);
  };

  const scrollToToday = () => {
    setSelectedDate(new Date(today));
    weekStripRef.current?.scrollTo({ x: STRIP_BEFORE * PILL_W, animated:true });
  };

  const weekStart = new Date(selectedDate);
  weekStart.setDate(selectedDate.getDate() - ((selectedDate.getDay()+6) % 7));
  const weekDays7 = Array.from({ length:7 }, (_, i) => addDays(weekStart, i));

  const renderEvent = (ev: any, i: number, allEventsForDay: any[]) => {
    const isClash = allEventsForDay.some((f, j) =>
      i!==j && new Date(ev.start_time) < new Date(f.end_time||f.start_time) && new Date(f.start_time) < new Date(ev.end_time||ev.start_time)
    );
    const timeStr = fmtTime(ev.start_time);
    const tp      = timeStr.match(/(\d+:\d+)\s*(am|pm)/i);
    return (
      <TouchableOpacity key={ev.id} style={[s.eventItem, isClash && s.eventClash]} activeOpacity={0.7}
        onPress={() => setSelectedEvent(ev)}>
        <View style={s.evTimeCol}>
          <Text style={s.evT}>{tp ? tp[1] : timeStr}</Text>
          <Text style={s.evD}>{tp ? tp[2] : ''}</Text>
        </View>
        <View style={[s.evLine, { backgroundColor: isClash ? C.mag : evColor(i) }]}/>
        <View style={s.evBody}>
          <Text style={s.evName}>{ev.title}</Text>
          {ev.notes ? <Text style={[s.evMeta, isClash && { color:C.mag }]} numberOfLines={1}>{isClash ? 'Zaeli flagged — clash detected' : ev.notes}</Text> : null}
        </View>
        <Text style={{ fontSize:16, color:C.ink3, paddingRight:2 }}>›</Text>
      </TouchableOpacity>
    );
  };

  const buildMonthCells = () => {
    const dim=getDaysInMonth(calYear,calMonth), firstDay=getFirstDayOfMonth(calYear,calMonth), prevDim=getDaysInMonth(calYear,calMonth-1);
    const cells: { day:number; cur:boolean; date:Date }[] = [];
    for (let i=firstDay-1; i>=0; i--) cells.push({ day:prevDim-i, cur:false, date:new Date(calYear,calMonth-1,prevDim-i) });
    for (let d=1; d<=dim; d++)        cells.push({ day:d, cur:true, date:new Date(calYear,calMonth,d) });
    while (cells.length%7!==0) { const n=cells.length-firstDay-dim+1; cells.push({ day:n, cur:false, date:new Date(calYear,calMonth+1,n) }); }
    return cells;
  };

  // Add event button — always opens the Zaeli-first sheet
  const handleAddEvent = () => setShowSheet(true);

  const briefNode = !dismissed
    ? <BriefCard events={events} todos={todos} onDismiss={handleDismiss}/>
    : showRelaxed ? <RelaxedCard/> : null;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar style="light"/>

      <View style={s.hero}>
        <View style={s.heroOrbOuter}/>
        <View style={s.heroOrbInner}/>
        <View style={s.heroOrb2}/>
        <View style={s.heroRow}>
          <View style={s.logoMark}>
            <View style={s.logoStarBox}><Text style={s.logoStarTxt}>{'✦'}</Text></View>
            <Text style={s.logoWord}>{'z'}<Text style={{ color:C.yellow }}>{'a'}</Text>{'el'}<Text style={{ color:C.yellow }}>{'i'}</Text></Text>
          </View>
          <View style={s.heroRight}>
            <Text style={s.heroTitle}>Calendar</Text>
            <HamburgerButton onPress={() => setMenuOpen(true)}/>
          </View>
        </View>
        <NavMenu visible={menuOpen} onClose={() => setMenuOpen(false)}/>
        <View style={s.viewTog}>
          {(['day','week','month'] as const).map(v => (
            <TouchableOpacity key={v} style={[s.vt, view===v && s.vtOn]} onPress={() => setView(v)} activeOpacity={0.8}>
              <Text style={[s.vtTxt, view===v && s.vtTxtOn]}>{v.charAt(0).toUpperCase()+v.slice(1)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {view !== 'month' && (
        <View style={s.stripBar}>
          <ScrollView ref={weekStripRef} horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal:10, paddingVertical:8, gap:4 }}>
            {stripDays.map((d, i) => {
              const isToday=sameDay(d,today), isSelected=sameDay(d,selectedDate);
              const key=toLocalDateStr(d), hasEv=daysWithEvSet.has(key), showMonth=d.getDate()===1;
              return (
                <View key={i} style={{ alignItems:'center' }}>
                  {showMonth ? <Text style={s.stripMonthLabel}>{MONTHS_SHORT[d.getMonth()]}</Text> : <View style={{ height:14 }}/>}
                  <TouchableOpacity style={[s.dayPill, isToday && s.dayPillToday, isSelected && !isToday && s.dayPillSelected]}
                    onPress={() => setSelectedDate(new Date(d))} activeOpacity={0.8}>
                    <Text style={[s.dpDay, (isToday||isSelected) && { color:'#fff', opacity:1 }]}>{DAYS_SHORT[(d.getDay()+6)%7]}</Text>
                    <Text style={[s.dpNum, (isToday||isSelected) && { color:'#fff' }]}>{d.getDate()}</Text>
                    <View style={[s.dpDot, hasEv && s.dpDotHas]}/>
                  </TouchableOpacity>
                </View>
              );
            })}
          </ScrollView>
          {!sameDay(selectedDate,today) && (
            <TouchableOpacity style={s.todayBtn} onPress={scrollToToday} activeOpacity={0.8}>
              <Text style={s.todayBtnTxt}>Back to Today</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <View style={s.content}>
        {view === 'day' && (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom:140 }}>
            {briefNode}
            <Text style={s.slbl}>{selectedDate.toLocaleDateString('en-AU', { weekday:'long', day:'numeric', month:'long' }).toUpperCase()}</Text>
            {dayEvents.map((ev,i) => renderEvent(ev,i,dayEvents))}
            <TouchableOpacity style={s.addBtn} onPress={handleAddEvent} activeOpacity={0.7}>
              <Text style={s.addPlus}>{'+  Add event'}</Text>
            </TouchableOpacity>
          </ScrollView>
        )}

        {view === 'week' && (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom:120 }}>
            {briefNode}
            {weekDays7.map((d,di) => {
              const devs=events.filter(e => (e.date||'')===toLocalDateStr(d)), isTod=sameDay(d,today);
              return (
                <TouchableOpacity key={di} activeOpacity={0.85} onPress={() => { setSelectedDate(new Date(d)); setView('day'); }}>
                  <View style={[s.weekRow, isTod && { borderLeftColor:C.mag, borderLeftWidth:3 }]}>
                    <View style={s.weekDayCol}>
                      <Text style={[s.weekDayName, isTod && { color:C.mag }]}>{DAYS_SHORT[(d.getDay()+6)%7]}</Text>
                      <View style={[s.weekDayNum, isTod && { backgroundColor:C.mag }]}>
                        <Text style={[s.weekDayNumTxt, isTod && { color:'#fff' }]}>{d.getDate()}</Text>
                      </View>
                    </View>
                    <View style={s.weekEvCol}>
                      {devs.length===0 ? <Text style={s.weekEmpty}>Free</Text>
                        : devs.map((ev,i) => (
                          <View key={ev.id} style={[s.weekEvChip, { backgroundColor:evColor(i)+'18', borderLeftColor:evColor(i) }]}>
                            <Text style={[s.weekEvTxt, { color:evColor(i) }]} numberOfLines={1}>{ev.title}</Text>
                            <Text style={s.weekEvTime}>{fmtTime(ev.start_time)}</Text>
                          </View>
                        ))
                      }
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity style={s.addBtn} onPress={handleAddEvent} activeOpacity={0.7}>
              <Text style={s.addPlus}>{'+  Add event'}</Text>
            </TouchableOpacity>
          </ScrollView>
        )}

        {view === 'month' && (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom:120 }}>
            {briefNode}
            <View style={s.monthNav}>
              <TouchableOpacity style={s.monthArr} onPress={() => { if(calMonth===0){setCalMonth(11);setCalYear(y=>y-1);}else setCalMonth(m=>m-1); }}>
                <Text style={s.monthArrTxt}>{'<'}</Text>
              </TouchableOpacity>
              <Text style={s.monthLbl}>{MONTHS[calMonth]} {calYear}</Text>
              <TouchableOpacity style={s.monthArr} onPress={() => { if(calMonth===11){setCalMonth(0);setCalYear(y=>y+1);}else setCalMonth(m=>m+1); }}>
                <Text style={s.monthArrTxt}>{'>'}</Text>
              </TouchableOpacity>
            </View>
            <View style={s.calGrid}>{DAYS_HDR.map((d,i) => <View key={i} style={s.calCell}><Text style={s.calHdr}>{d}</Text></View>)}</View>
            <View style={s.calGrid}>
              {buildMonthCells().map((cell,i) => {
                const isToday=cell.cur && cell.day===today.getDate() && calMonth===today.getMonth() && calYear===today.getFullYear();
                const isSel=toLocalDateStr(cell.date)===selectedDateStr;
                const hasEv=cell.cur && daysWithEvSet.has(toLocalDateStr(cell.date));
                return (
                  <TouchableOpacity key={i} style={s.calCell} onPress={() => { setSelectedDate(new Date(cell.date)); setView('day'); }} activeOpacity={0.7}>
                    <View style={[s.calDayInner, isToday && s.calDayToday, isSel && !isToday && s.calDaySel]}>
                      <Text style={[s.calDayTxt, !cell.cur && s.calDayOther, isToday && { color:'#fff', fontFamily:'Poppins_700Bold' }]}>{cell.day}</Text>
                      {hasEv && <View style={[s.calDot, isToday && { backgroundColor:'#fff' }]}/>}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
            {(() => {
              const sel=events.filter(e => (e.date||'')===selectedDateStr);
              if (!sel.length) return null;
              return (
                <View style={s.csdCard}>
                  <Text style={s.csdTitle}>{selectedDate.toLocaleDateString('en-AU', { weekday:'long', day:'numeric', month:'long' })}</Text>
                  {sel.map((ev,i) => (
                    <TouchableOpacity key={ev.id} style={[s.csdRow, i===sel.length-1 && { borderBottomWidth:0 }]}
                      onPress={() => setView('day')} activeOpacity={0.7}>
                      <View style={[s.csdDot, { backgroundColor:evColor(i) }]}/>
                      <Text style={s.csdName}>{ev.title}</Text>
                      <Text style={s.csdTime}>{fmtTime(ev.start_time)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              );
            })()}
            <TouchableOpacity style={s.addBtn} onPress={handleAddEvent} activeOpacity={0.7}>
              <Text style={s.addPlus}>{'+  Add event'}</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </View>

      {/* ── Event detail/delete modal ── */}
      <EventDetailModal
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        onDeleted={() => { setSelectedEvent(null); loadEvents(); }}
      />

      {/* ── Add event flow (sheet → form, single modal) ── */}
      <AddEventFlow
        visible={showSheet}
        onClose={() => setShowSheet(false)}
        onSaved={() => { setShowSheet(false); loadEvents(); }}
        selectedDate={selectedDate}
      />

      {/* ── Ask Zaeli bar — sticky bottom ── */}
      <View style={[s.askBarWrap, { paddingBottom: insets.bottom + 4 }]}>
        <TouchableOpacity style={s.askBar} onPress={() => openChat()} activeOpacity={0.85}>
          <View style={s.askDiamondWrap}>
            <Text style={s.askDiamond}>{'\u2726'}</Text>
          </View>
          <Text style={s.askText}>Ask Zaeli anything...</Text>
          <TouchableOpacity style={s.askMic} onPress={() => {}} activeOpacity={0.7}>
            <IcoMic/>
          </TouchableOpacity>
          <TouchableOpacity style={s.askSend} onPress={() => openChat()} activeOpacity={0.85}>
            <IcoSend/>
          </TouchableOpacity>
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
}

// ── STYLES ───────────────────────────────────────────────────
const CELL_SIZE = 44;

const s = StyleSheet.create({
  safe:    { flex:1, backgroundColor:C.mag },
  content: { flex:1, backgroundColor:C.bg },

  hero:         { backgroundColor:C.mag, paddingHorizontal:22, paddingTop:14, paddingBottom:16, flexShrink:0, position:'relative', overflow:'hidden' },
  heroOrbOuter: { position:'absolute', width:260, height:260, borderRadius:130, top:-80, right:-60, backgroundColor:'rgba(255,255,255,0.06)' },
  heroOrbInner: { position:'absolute', width:160, height:160, borderRadius:80, top:-20, right:20, backgroundColor:'rgba(255,255,255,0.08)' },
  heroOrb2:     { position:'absolute', width:100, height:100, borderRadius:50, bottom:10, left:-20, backgroundColor:'rgba(255,255,255,0.04)' },
  heroRow:      { flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:12 },
  heroRight:    { flexDirection:'row', alignItems:'center', gap:10 },
  logoMark:     { flexDirection:'row', alignItems:'center', gap:8 },
  logoStarBox:  { width:32, height:32, backgroundColor:'rgba(255,255,255,0.2)', borderRadius:10, alignItems:'center', justifyContent:'center' },
  logoStarTxt:  { fontSize:17, color:'#fff' },
  logoWord:     { fontFamily:'DMSerifDisplay_400Regular', fontSize:22, color:'#fff', letterSpacing:-0.5 },
  heroTitle:    { fontFamily:'DMSerifDisplay_400Regular', fontSize:34, color:'#fff', letterSpacing:-1 },

  viewTog: { flexDirection:'row', backgroundColor:'rgba(255,255,255,0.15)', borderRadius:14, padding:4, gap:3, marginBottom:4 },
  vt:      { flex:1, paddingVertical:10, borderRadius:11, alignItems:'center' },
  vtOn:    { backgroundColor:'#fff' },
  vtTxt:   { fontFamily:'Poppins_600SemiBold', fontSize:13, color:'rgba(255,255,255,0.6)' },
  vtTxtOn: { color:C.ink },

  stripBar:        { backgroundColor:'#fff', borderBottomWidth:1, borderBottomColor:C.border },
  stripMonthLabel: { fontFamily:'Poppins_700Bold', fontSize:9, color:C.mag, textTransform:'uppercase', letterSpacing:1, textAlign:'center', height:14, paddingTop:1 },
  dayPill:         { width:52, alignItems:'center', gap:2, paddingVertical:8, borderRadius:14 },
  dayPillToday:    { backgroundColor:C.mag },
  dayPillSelected: { backgroundColor:'rgba(224,0,124,0.15)' },
  dpDay:           { fontFamily:'Poppins_700Bold', fontSize:9, textTransform:'uppercase', letterSpacing:0.3, color:C.ink3 },
  dpNum:           { fontFamily:'Poppins_800ExtraBold', fontSize:17, color:C.ink },
  dpDot:           { width:4, height:4, borderRadius:2, backgroundColor:'transparent' },
  dpDotHas:        { backgroundColor:C.mag },

  todayBtn:    { alignSelf:'center', marginBottom:6, paddingHorizontal:16, paddingVertical:5, backgroundColor:C.mag, borderRadius:20 },
  todayBtnTxt: { fontFamily:'Poppins_600SemiBold', fontSize:11, color:'#fff' },

  // ── Brief card
  briefCard: {
    marginHorizontal:18, marginTop:14, marginBottom:6,
    backgroundColor:'#fff', borderRadius:20,
    borderWidth:1.5, borderColor:'rgba(224,0,124,0.15)',
    shadowColor:C.mag, shadowOpacity:0.08, shadowRadius:16,
    shadowOffset:{ width:0, height:4 }, elevation:3, overflow:'hidden',
  },
  briefHeader: {
    flexDirection:'row', alignItems:'center', gap:10,
    paddingHorizontal:16, paddingTop:14, paddingBottom:11,
    borderBottomWidth:1, borderBottomColor:'rgba(224,0,124,0.08)',
    backgroundColor:'rgba(224,0,124,0.03)',
  },
  briefName:    { fontFamily:'Poppins_700Bold', fontSize:13, color:C.ink, flex:1 },
  briefLiveDot: { width:6, height:6, borderRadius:3, backgroundColor:C.green },
  briefTime:    { fontFamily:'Poppins_400Regular', fontSize:10, color:C.ink3 },
  briefBody:    { padding:16, paddingTop:14 },
  briefMsg:     { fontFamily:'Poppins_400Regular', fontSize:14, color:C.ink, lineHeight:22, marginBottom:14 },
  briefBtns:    { flexDirection:'row', gap:8 },
  btnPrimary:    { flex:1, backgroundColor:C.mag, borderRadius:12, paddingVertical:11, alignItems:'center', justifyContent:'center' },
  btnPrimaryTxt: { fontFamily:'Poppins_600SemiBold', fontSize:13, color:'#fff', textAlign:'center' },
  btnGhost:      { flex:1, backgroundColor:'rgba(0,0,0,0.055)', borderRadius:12, paddingVertical:11, alignItems:'center', justifyContent:'center', borderWidth:1.5, borderColor:'rgba(0,0,0,0.09)' },
  btnGhostTxt:   { fontFamily:'Poppins_600SemiBold', fontSize:13, color:C.ink2, textAlign:'center' },

  // ── Relaxed card
  relaxedCard:   { marginHorizontal:18, marginTop:14, marginBottom:6, borderRadius:20, borderWidth:1.5, borderColor:'rgba(0,87,255,0.14)', backgroundColor:'rgba(0,87,255,0.04)', overflow:'hidden' },
  relaxedHeader: { flexDirection:'row', alignItems:'center', gap:10, paddingTop:11, paddingHorizontal:16, paddingBottom:10, borderBottomWidth:1, borderBottomColor:'rgba(0,0,0,0.05)' },
  relaxedAv:     { width:28, height:28, borderRadius:9, backgroundColor:C.blue, alignItems:'center', justifyContent:'center', flexShrink:0 },
  relaxedAck:    { fontFamily:'Poppins_700Bold', fontSize:12, color:C.blue, flex:1 },
  relaxedBody:   { padding:12, paddingHorizontal:16, paddingBottom:14 },
  relaxedTitle:  { fontFamily:'Poppins_700Bold', fontSize:13, color:C.ink, marginBottom:5 },
  relaxedMsg:    { fontFamily:'Poppins_400Regular', fontSize:13, color:C.ink2, lineHeight:21, marginBottom:12 },
  relaxedBtn:    { width:'100%', paddingVertical:10, borderRadius:12, backgroundColor:'rgba(0,87,255,0.08)', alignItems:'center' },
  relaxedBtnTxt: { fontFamily:'Poppins_600SemiBold', fontSize:12, color:C.blue },

  // ── Add event sheet
  sheetBackdrop:     { ...StyleSheet.absoluteFillObject, backgroundColor:'rgba(0,0,0,0.45)' },
  sheet:             { position:'absolute', bottom:0, left:0, right:0, backgroundColor:'#fff', borderTopLeftRadius:24, borderTopRightRadius:24, paddingHorizontal:20, paddingTop:10 },
  sheetHandle:       { width:36, height:4, borderRadius:2, backgroundColor:'rgba(0,0,0,0.12)', alignSelf:'center', marginBottom:16 },
  sheetHdr:          { flexDirection:'row', alignItems:'center', gap:12, marginBottom:20 },
  sheetAv:           { width:40, height:40, borderRadius:13, backgroundColor:C.mag, alignItems:'center', justifyContent:'center', flexShrink:0 },
  sheetTitle:        { fontFamily:'Poppins_700Bold', fontSize:16, color:C.ink },
  sheetSub:          { fontFamily:'Poppins_400Regular', fontSize:12, color:C.ink2, marginTop:1 },
  sheetClose:        { width:32, height:32, borderRadius:10, backgroundColor:'rgba(0,0,0,0.06)', alignItems:'center', justifyContent:'center' },
  sheetCloseTxt:     { fontFamily:'Poppins_600SemiBold', fontSize:13, color:C.ink2 },
  sheetPrimary:      { flexDirection:'row', alignItems:'center', gap:14, backgroundColor:'rgba(224,0,124,0.05)', borderWidth:1.5, borderColor:'rgba(224,0,124,0.18)', borderRadius:18, padding:16, marginBottom:16 },
  sheetPrimaryIcon:  { width:44, height:44, borderRadius:14, backgroundColor:C.mag, alignItems:'center', justifyContent:'center', flexShrink:0 },
  sheetPrimaryTitle: { fontFamily:'Poppins_700Bold', fontSize:15, color:C.ink, marginBottom:2 },
  sheetPrimaryDesc:  { fontFamily:'Poppins_400Regular', fontSize:12, color:C.ink2, lineHeight:18 },
  sheetPrimaryArrow: { fontFamily:'Poppins_700Bold', fontSize:18, color:C.mag, flexShrink:0 },
  sheetDivider:      { flexDirection:'row', alignItems:'center', gap:10, marginBottom:14 },
  sheetDividerLine:  { flex:1, height:1, backgroundColor:'rgba(0,0,0,0.07)' },
  sheetDividerTxt:   { fontFamily:'Poppins_400Regular', fontSize:12, color:C.ink3 },
  sheetSecondary:    { paddingVertical:13, borderRadius:14, borderWidth:1.5, borderColor:C.border, alignItems:'center', backgroundColor:C.bg },
  sheetSecondaryTxt: { fontFamily:'Poppins_600SemiBold', fontSize:14, color:C.ink2 },

  slbl:       { fontFamily:'Poppins_700Bold', fontSize:10, textTransform:'uppercase', letterSpacing:1.5, color:C.ink3, paddingHorizontal:22, paddingTop:12, paddingBottom:8 },
  eventItem:  { backgroundColor:C.card, borderRadius:16, padding:14, marginHorizontal:18, marginBottom:8, borderWidth:1.5, borderColor:C.border, flexDirection:'row', alignItems:'center', gap:14 },
  eventClash: { borderColor:'rgba(224,0,124,0.25)', backgroundColor:'rgba(224,0,124,0.02)' },
  evTimeCol:  { flexShrink:0, alignItems:'flex-end', minWidth:38 },
  evT:        { fontFamily:'Poppins_700Bold', fontSize:13, color:C.ink },
  evD:        { fontFamily:'Poppins_400Regular', fontSize:10, color:C.ink2 },
  evLine:     { width:3, height:36, borderRadius:2, flexShrink:0 },
  evBody:     { flex:1 },
  evName:     { fontFamily:'Poppins_600SemiBold', fontSize:14, color:C.ink },
  evMeta:     { fontFamily:'Poppins_400Regular', fontSize:11, color:C.ink2, marginTop:2 },
  addBtn:     { marginHorizontal:18, marginTop:8, marginBottom:16, backgroundColor:C.card, borderRadius:16, padding:16, borderWidth:1.5, borderColor:C.border, alignItems:'center', opacity:0.55, borderStyle:'dashed' },
  addPlus:    { fontFamily:'Poppins_600SemiBold', fontSize:14, color:C.ink2 },

  weekRow:       { flexDirection:'row', borderBottomWidth:1, borderBottomColor:C.border, paddingVertical:12, paddingHorizontal:18, gap:14, backgroundColor:C.card, marginBottom:1 },
  weekDayCol:    { width:44, alignItems:'center', gap:4 },
  weekDayName:   { fontFamily:'Poppins_700Bold', fontSize:10, textTransform:'uppercase', color:C.ink3 },
  weekDayNum:    { width:30, height:30, borderRadius:9, alignItems:'center', justifyContent:'center' },
  weekDayNumTxt: { fontFamily:'Poppins_700Bold', fontSize:15, color:C.ink },
  weekEvCol:     { flex:1, gap:4, justifyContent:'center' },
  weekEmpty:     { fontFamily:'Poppins_400Regular', fontSize:13, color:C.ink3 },
  weekEvChip:    { borderRadius:8, borderLeftWidth:3, paddingHorizontal:8, paddingVertical:5, flexDirection:'row', justifyContent:'space-between', alignItems:'center' },
  weekEvTxt:     { fontFamily:'Poppins_600SemiBold', fontSize:12, flex:1 },
  weekEvTime:    { fontFamily:'Poppins_400Regular', fontSize:11, color:C.ink2 },

  monthNav:    { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:18, paddingTop:10, paddingBottom:6 },
  monthArr:    { padding:8 },
  monthArrTxt: { fontSize:22, color:C.ink2, fontFamily:'Poppins_400Regular' },
  monthLbl:    { fontFamily:'Poppins_700Bold', fontSize:16, color:C.ink },
  calGrid:     { flexDirection:'row', flexWrap:'wrap', paddingHorizontal:10 },
  calCell:     { width:`${100/7}%` as any, aspectRatio:1, alignItems:'center', justifyContent:'center' },
  calHdr:      { fontFamily:'Poppins_700Bold', fontSize:9, textTransform:'uppercase', color:C.ink3 },
  calDayInner: { width:CELL_SIZE, height:CELL_SIZE, borderRadius:CELL_SIZE/2, alignItems:'center', justifyContent:'center', position:'relative' },
  calDayToday: { backgroundColor:C.mag },
  calDaySel:   { backgroundColor:'rgba(224,0,124,0.12)' },
  calDayTxt:   { fontFamily:'Poppins_500Medium', fontSize:13, color:C.ink },
  calDayOther: { color:C.ink3 },
  calDot:      { position:'absolute', bottom:4, width:4, height:4, borderRadius:2, backgroundColor:C.mag },
  csdCard:     { marginHorizontal:18, marginTop:10, backgroundColor:C.card, borderRadius:16, borderWidth:1.5, borderColor:C.border, padding:14, marginBottom:10 },
  csdTitle:    { fontFamily:'Poppins_700Bold', fontSize:13, color:C.ink, marginBottom:10 },
  csdRow:      { flexDirection:'row', alignItems:'center', gap:10, paddingVertical:6, borderBottomWidth:1, borderBottomColor:C.border },
  csdDot:      { width:8, height:8, borderRadius:4, flexShrink:0 },
  csdName:     { fontFamily:'Poppins_500Medium', fontSize:13, color:C.ink, flex:1 },
  csdTime:     { fontFamily:'Poppins_400Regular', fontSize:11, color:C.ink2 },

  modalHdr:      { flexDirection:'row', alignItems:'center', justifyContent:'space-between', padding:16, borderBottomWidth:1, borderBottomColor:C.border },
  modalCancel:   { fontFamily:'Poppins_500Medium', fontSize:15, color:C.ink2 },
  modalTitle:    { fontFamily:'Poppins_700Bold', fontSize:16, color:C.ink },
  modalSave:     { fontFamily:'Poppins_700Bold', fontSize:15, color:C.mag },
  modalTabs:     { flexDirection:'row', paddingHorizontal:16, paddingTop:10, borderBottomWidth:1, borderBottomColor:C.border },
  modalTab:      { flex:1, paddingVertical:10, alignItems:'center', borderBottomWidth:2, borderBottomColor:'transparent', marginBottom:-1 },
  modalTabOn:    { borderBottomColor:C.mag },
  modalTabTxt:   { fontFamily:'Poppins_600SemiBold', fontSize:13, color:C.ink2 },
  modalTabTxtOn: { color:C.mag },
  formField:     { gap:6 },
  formLabel:     { fontFamily:'Poppins_600SemiBold', fontSize:11, color:C.ink2, textTransform:'uppercase', letterSpacing:0.5 },
  formInput:     { backgroundColor:C.bg, borderRadius:12, borderWidth:1.5, borderColor:C.border, paddingHorizontal:14, paddingVertical:13, fontFamily:'Poppins_400Regular', fontSize:15, color:C.ink, justifyContent:'center' },

  miniCal:       { backgroundColor:C.bg, borderRadius:16, padding:12, borderWidth:1.5, borderColor:C.border },
  miniCalNav:    { flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:8 },
  miniCalArrBtn: { padding:4 },
  miniCalArr:    { fontSize:20, color:C.ink2, fontFamily:'Poppins_400Regular' },
  miniCalLbl:    { fontFamily:'Poppins_700Bold', fontSize:14, color:C.ink },
  miniCalGrid:     { flexDirection:'row', flexWrap:'wrap' },
  miniCalHdr:      { width:`${100/7}%` as any, textAlign:'center', fontFamily:'Poppins_700Bold', fontSize:9, color:C.ink3, paddingVertical:4 },
  miniCalDay:      { width:`${100/7}%` as any, aspectRatio:1, alignItems:'center', justifyContent:'center' },
  miniCalDayInner: { width:32, height:32, borderRadius:16, alignItems:'center', justifyContent:'center' },
  miniCalDayTxt:   { fontFamily:'Poppins_500Medium', fontSize:13, color:C.ink },

  // time drum (gesture-based scroll shown below pill)
  timeColon:    { fontFamily:'Poppins_700Bold', fontSize:26, color:C.ink3, marginBottom:0 },
  // Google Calendar-style form
  gcBlock:        { marginHorizontal:16, marginTop:14, backgroundColor:'#fff', borderRadius:16, borderWidth:1.5, borderColor:C.border, overflow:'hidden' },
  gcRow:          { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:16, paddingVertical:14 },
  gcRowLbl:       { fontFamily:'Poppins_500Medium', fontSize:15, color:C.ink },
  gcRowRight:     { flexDirection:'row', alignItems:'center' },
  gcRowRightTxt:  { fontFamily:'Poppins_500Medium', fontSize:15, color:C.ink2 },
  gcSep:          { height:1, backgroundColor:C.border, marginLeft:16 },
  gcTitleInput:   { paddingHorizontal:16, paddingVertical:16, fontFamily:'Poppins_600SemiBold', fontSize:17, color:C.ink },
  gcSubInput:     { paddingHorizontal:16, paddingVertical:14, fontFamily:'Poppins_400Regular', fontSize:15, color:C.ink },
  gcPill:         { backgroundColor:C.bg, borderRadius:10, paddingHorizontal:12, paddingVertical:7, borderWidth:1.5, borderColor:C.border },
  gcPillTxt:      { fontFamily:'Poppins_500Medium', fontSize:13, color:C.ink },
  gcToggle:       { width:44, height:26, borderRadius:13, backgroundColor:C.border, justifyContent:'center', paddingHorizontal:2 },
  gcToggleOn:     { backgroundColor:C.mag },
  gcToggleThumb:  { width:22, height:22, borderRadius:11, backgroundColor:'#fff', shadowColor:'#000', shadowOpacity:0.15, shadowRadius:2, shadowOffset:{ width:0, height:1 } },
  gcToggleThumbOn:{ transform:[{ translateX:18 }] },
  dropdown:       { position:'absolute', right:0, top:36, backgroundColor:'#fff', borderRadius:14, borderWidth:1.5, borderColor:C.border, zIndex:100, minWidth:200, shadowColor:'#000', shadowOpacity:0.1, shadowRadius:12, shadowOffset:{ width:0, height:4 } },
  dropdownItem:   { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:16, paddingVertical:13, borderBottomWidth:1, borderBottomColor:C.border },
  dropdownItemTxt:{ fontFamily:'Poppins_400Regular', fontSize:15, color:C.ink },

  durGrid:      { flexDirection:'row', flexWrap:'wrap', gap:8 },
  durChip:      { paddingHorizontal:14, paddingVertical:8, borderRadius:20, backgroundColor:C.card, borderWidth:1.5, borderColor:C.border },
  durChipOn:    { backgroundColor:C.mag, borderColor:C.mag },
  durChipTxt:   { fontFamily:'Poppins_600SemiBold', fontSize:13, color:C.ink2 },
  durChipTxtOn: { color:'#fff' },

  memberRow:   { flexDirection:'row', alignItems:'center', gap:12, padding:14, backgroundColor:C.bg, borderRadius:14, borderWidth:1.5, borderColor:C.border },
  memberDot:   { width:12, height:12, borderRadius:6, flexShrink:0 },
  memberName:  { fontFamily:'Poppins_500Medium', fontSize:15, color:C.ink, flex:1 },
  memberCheck: { width:24, height:24, borderRadius:7, borderWidth:2, borderColor:C.ink3, alignItems:'center', justifyContent:'center' },

  detailRow:       { flexDirection:'row', alignItems:'flex-start', gap:12 },
  detailIcon:      { fontSize:18, width:26, textAlign:'center' as any, marginTop:1 },
  detailTxt:       { fontFamily:'Poppins_400Regular', fontSize:15, color:C.ink, flex:1, lineHeight:22 },
  deleteBtn:       { backgroundColor:'rgba(255,59,59,0.08)', borderRadius:14, paddingVertical:14, alignItems:'center', borderWidth:1.5, borderColor:'rgba(255,59,59,0.18)' },
  deleteBtnConfirm:{ backgroundColor:'rgba(255,59,59,0.15)', borderColor:'rgba(255,59,59,0.4)' },
  deleteBtnTxt:    { fontFamily:'Poppins_600SemiBold', fontSize:14, color:'#FF3B3B' },
  editBtn:         { backgroundColor:'rgba(224,0,124,0.08)', borderRadius:14, paddingVertical:14, alignItems:'center', borderWidth:1.5, borderColor:'rgba(224,0,124,0.25)' },
  editBtnTxt:      { fontFamily:'Poppins_600SemiBold', fontSize:14, color:C.mag },

  askBarWrap:      { position:'absolute', bottom:0, left:0, right:0, paddingHorizontal:16, paddingTop:10, backgroundColor:'#F7F7F7', borderTopWidth:1, borderTopColor:'rgba(0,0,0,0.07)' },
  askBar:          { backgroundColor:'#fff', borderRadius:22, paddingVertical:11, paddingHorizontal:14, flexDirection:'row', alignItems:'center', gap:8, borderWidth:1.5, borderColor:'rgba(0,0,0,0.10)', shadowColor:'#000', shadowOpacity:0.06, shadowRadius:12, shadowOffset:{width:0,height:2}, elevation:2 },
  askDiamondWrap:  { width:20, alignItems:'center', justifyContent:'center' },
  askDiamond:      { fontSize:15, color:C.mag },
  askText:         { flex:1, fontFamily:'Poppins_400Regular', fontSize:15, color:'rgba(0,0,0,0.28)' },
  askMic:          { width:36, height:36, alignItems:'center', justifyContent:'center', backgroundColor:'rgba(0,0,0,0.06)', borderRadius:11, flexShrink:0 },
  askSend:         { width:36, height:36, borderRadius:11, backgroundColor:C.mag, alignItems:'center', justifyContent:'center', flexShrink:0, shadowColor:C.mag, shadowOpacity:0.3, shadowRadius:6, shadowOffset:{width:0,height:2} },
});