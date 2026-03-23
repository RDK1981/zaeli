/**
 * Calendar Screen - V8
 * Visual redesign: cobalt blue · inline serif brief · floating pill bar
 * Day + Month views only · all logic preserved from V7
 */

import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated, Easing, KeyboardAvoidingView, Modal, Platform,
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Line, Path, Polyline, Rect, Circle } from 'react-native-svg';
import { supabase } from '../../lib/supabase';
import { HamburgerButton, NavMenu } from '../components/NavMenu';
import { callClaude } from '../../lib/api-logger';
import { getZaeliProvider } from '../../lib/zaeli-provider';

const DUMMY_FAMILY_ID = '00000000-0000-0000-0000-000000000001';

// ── Colour system — Calendar is Cobalt Blue #2055F0 ───────────
const CAL   = '#2055F0';   // primary hero colour
const CORAL = '#FF4545';   // accent for brief / CTA
const INK   = '#0A0A0A';
const INK2  = 'rgba(10,10,10,0.5)';
const INK3  = 'rgba(10,10,10,0.32)';
const BORDER = 'rgba(10,10,10,0.08)';
const BG    = '#FAF8F5';
const YELLOW = '#FFE500';
const GREEN  = '#00C97A';

// Event accent colours (cycle)
const EV_COLORS = [CAL, CORAL, '#E8601A', GREEN, '#9B6DD6', '#00B4D8'];

// ── SVG Icons ─────────────────────────────────────────────────
function IcoPlus({ color = '#fff', size = 20 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Line x1="12" y1="5" x2="12" y2="19" stroke={color} strokeWidth={2.2} strokeLinecap="round"/>
      <Line x1="5" y1="12" x2="19" y2="12" stroke={color} strokeWidth={2.2} strokeLinecap="round"/>
    </Svg>
  );
}
function IcoMic({ color = INK3 }: { color?: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Rect x="9" y="2" width="6" height="11" rx="3" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"/>
      <Path d="M5 10a7 7 0 0014 0" stroke={color} strokeWidth={1.8} fill="none" strokeLinecap="round"/>
      <Line x1="12" y1="19" x2="12" y2="23" stroke={color} strokeWidth={1.8} strokeLinecap="round"/>
      <Line x1="8" y1="23" x2="16" y2="23" stroke={color} strokeWidth={1.8} strokeLinecap="round"/>
    </Svg>
  );
}
function IcoSend() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Line x1="12" y1="19" x2="12" y2="5" stroke="#fff" strokeWidth={2.5} strokeLinecap="round"/>
      <Polyline points="5 12 12 5 19 12" stroke="#fff" strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    </Svg>
  );
}
function IcoChevronLeft() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Polyline points="15 18 9 12 15 6" stroke="rgba(255,255,255,0.7)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/>
    </Svg>
  );
}
function IcoChevronRight() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Polyline points="9 18 15 12 9 6" stroke="rgba(255,255,255,0.7)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/>
    </Svg>
  );
}

// ── Constants ─────────────────────────────────────────────────
const DAYS_HDR     = ['M','T','W','T','F','S','S'];
const DAYS_SHORT   = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const MONTHS       = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const DURATION_OPTIONS = ['15 min','30 min','45 min','1 hr','1.5 hr','2 hr','2.5 hr','3 hr','3.5 hr','4 hr','5 hr','6 hr','8 hr','All day'];
const DURATION_MINS    = [15,30,45,60,90,120,150,180,210,240,300,360,480,1439];
const REPEAT_OPTIONS   = ['Never','Every day','Every week','Every fortnight','Every month','Every year'];
const ALERT_OPTIONS    = ['None','At time of event','5 min before','15 min before','30 min before','1 hour before','2 hours before','1 day before','1 week before'];

const FAMILY_MEMBERS = [
  { id:'1', name:'Anna',    color: CAL },
  { id:'2', name:'Richard', color:'#E8601A' },
  { id:'3', name:'Poppy',   color:'#9B6DD6' },
  { id:'4', name:'Gab',     color:'#00B4D8' },
  { id:'5', name:'Duke',    color:'#4A90E2' },
];

const HOURS   = Array.from({ length:12 }, (_, i) => i + 1);
const MINUTES = [0,5,10,15,20,25,30,35,40,45,50,55];
const ROW_H   = 52;

// ── Brief session state (module-level) ────────────────────────
let lastBriefTime:    number | null = null;
let cachedBriefTokens: { text: string; isAccent: boolean }[] | null = null;
let cachedBriefSub:   string | null = null;
let cachedBriefCta:   string | null = null;
let cachedBriefSeed:  string | null = null;
let briefDismissed = false;

// ── Helpers ───────────────────────────────────────────────────
function evColor(i: number) { return EV_COLORS[i % EV_COLORS.length]; }
function sameDay(a: Date, b: Date) {
  return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
}
function addDays(date: Date, n: number) { const d = new Date(date); d.setDate(d.getDate() + n); return d; }
function getDaysInMonth(y: number, m: number) { return new Date(y, m+1, 0).getDate(); }
function getFirstDayOfMonth(y: number, m: number) { return (new Date(y, m, 1).getDay() + 6) % 7; }
function toLocalDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function naturalDate(dateStr: string, todayStr: string): string {
  const today  = new Date(todayStr + 'T00:00:00');
  const target = new Date(dateStr + 'T00:00:00');
  const diff   = Math.round((target.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return 'today';
  if (diff === 1) return 'tomorrow';
  if (diff <= 6)  return target.toLocaleDateString('en-AU', { weekday: 'long' });
  return target.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' });
}
function fmtTime(iso: string) {
  const timePart = iso ? iso.replace('T',' ').split(' ')[1] || '' : '';
  if (!timePart) return '';
  const [hStr, mStr] = timePart.split(':');
  const h = parseInt(hStr, 10), m = parseInt(mStr, 10);
  const ampm = h >= 12 ? 'pm' : 'am';
  const h12  = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2,'0')} ${ampm}`;
}
function getTimeFrame(hour: number): string {
  if (hour >= 6  && hour < 12) return 'morning';
  if (hour >= 12 && hour < 16) return 'afternoon';
  if (hour >= 16 && hour < 19) return 'evening';
  if (hour >= 19 && hour < 21) return 'winding down';
  if (hour >= 21 && hour < 23) return 'night';
  return 'late night';
}

// ── callBrief — GPT-5.4-mini or Claude ───────────────────────
async function callBrief({ feature, system, userContent, maxTokens = 200 }: {
  feature: string; system: string; userContent: string; maxTokens?: number;
}): Promise<string> {
  if (getZaeliProvider() === 'openai') {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.EXPO_PUBLIC_OPENAI_API_KEY || ''}` },
      body: JSON.stringify({ model: 'gpt-5.4-mini', max_completion_tokens: maxTokens,
        messages: [{ role: 'system', content: system }, { role: 'user', content: userContent }] }),
    });
    const d = await res.json();
    try {
      const u = d.usage || {};
      const costUsd = ((u.prompt_tokens||0)/1000000)*0.75 + ((u.completion_tokens||0)/1000000)*4.50;
      supabase.from('api_logs').insert({ family_id: DUMMY_FAMILY_ID, feature, model: 'gpt-5.4-mini',
        input_tokens: u.prompt_tokens||0, output_tokens: u.completion_tokens||0, cost_usd: costUsd });
    } catch {}
    return d.choices?.[0]?.message?.content || '';
  } else {
    const d = await callClaude({ feature, familyId: DUMMY_FAMILY_ID,
      body: { model: 'claude-haiku-4-5-20251001', max_tokens: maxTokens,
        system, messages: [{ role: 'user', content: userContent }] } });
    return d.content?.[0]?.text || '';
  }
}

// ── Brief token parser — [ACCENT1] and [ACCENT2] ─────────────
interface BriefToken { text: string; isAccent: boolean; }
function parseBriefTokens(text: string): BriefToken[] {
  const tokens: BriefToken[] = [];
  const parts = text.split(/(\[ACCENT[12]\].*?\[\/ACCENT[12]\])/gs);
  for (const part of parts) {
    const m = part.match(/\[ACCENT[12]\](.*?)\[\/ACCENT[12]\]/s);
    if (m) {
      tokens.push({ text: (tokens.length > 0 ? ' ' : '') + m[1].trim(), isAccent: true });
    } else if (part.trim()) {
      const needsSpace = tokens.length > 0 && tokens[tokens.length-1].isAccent && !part.startsWith(' ');
      tokens.push({ text: needsSpace ? ' ' + part : part, isAccent: false });
    }
  }
  return tokens;
}

// ── Split tokens into sentences for spacing ───────────────────
interface BriefSentence { parts: BriefToken[]; }
function splitBriefSentences(tokens: BriefToken[]): BriefSentence[] {
  const sentences: BriefSentence[] = [];
  let current: BriefToken[] = [];
  for (const token of tokens) {
    current.push(token);
    if (/[.!?]\s*$/.test(token.text.trimEnd())) {
      sentences.push({ parts: current });
      current = [];
    }
  }
  if (current.length > 0) sentences.push({ parts: current });
  return sentences.length > 0 ? sentences : [{ parts: tokens }];
}

// ── Animated inline brief — sentence-split with cross-fade ────
function AnimatedCalBrief({ tokens, sub, placeholder }: {
  tokens: BriefToken[]; sub: string; placeholder: string;
}) {
  const placeholderAnim = useRef(new Animated.Value(1)).current;
  const realAnim        = useRef(new Animated.Value(0)).current;
  const subAnim         = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (tokens.length === 0) return;
    Animated.sequence([
      Animated.delay(100),
      Animated.parallel([
        Animated.timing(placeholderAnim, { toValue: 0, duration: 300, easing: Easing.in(Easing.ease), useNativeDriver: true }),
        Animated.timing(realAnim, { toValue: 1, duration: 500, delay: 150, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      ]),
      Animated.timing(subAnim, { toValue: 1, duration: 400, delay: 60, easing: Easing.out(Easing.ease), useNativeDriver: true }),
    ]).start();
  }, [tokens.length]);

  const sentences = splitBriefSentences(tokens);

  return (
    <View style={s.briefBlock}>
      {/* Placeholder */}
      <Animated.View style={[s.briefPlaceholderWrap, { opacity: placeholderAnim }]} pointerEvents="none">
        <Text style={s.briefPlaceholder}>{placeholder}</Text>
      </Animated.View>
      {/* Real brief — sentences with spacing between them */}
      <Animated.View style={{ opacity: realAnim }}>
        {sentences.map((sentence, si) => (
          <Text key={si} style={[s.briefMain, si < sentences.length - 1 && { marginBottom: 10 }]}>
            {sentence.parts.map((t, ti) => (
              <Text key={ti} style={t.isAccent ? s.briefAccent : undefined}>{t.text}</Text>
            ))}
          </Text>
        ))}
        {sub ? (
          <Animated.View style={{ opacity: subAnim }}>
            <Text style={s.briefSub}>{sub}</Text>
          </Animated.View>
        ) : null}
      </Animated.View>
    </View>
  );
}

// ── MINI CAL PICKER (unchanged logic) ────────────────────────
function MiniCalPicker({ dateStr, onChange }: { dateStr: string; onChange: (s: string) => void }) {
  const [open, setOpen] = useState(false);
  const [navDate, setNavDate] = useState(() => new Date(dateStr + 'T12:00:00'));
  const calFirstDay = getFirstDayOfMonth(navDate.getFullYear(), navDate.getMonth());
  const calDim      = getDaysInMonth(navDate.getFullYear(), navDate.getMonth());
  const calPrevDim  = getDaysInMonth(navDate.getFullYear(), navDate.getMonth() - 1);
  const cells: { day:number; cur:boolean; date:Date }[] = [];
  for (let i=calFirstDay-1; i>=0; i--) cells.push({ day:calPrevDim-i, cur:false, date:new Date(navDate.getFullYear(), navDate.getMonth()-1, calPrevDim-i) });
  for (let d=1; d<=calDim; d++)        cells.push({ day:d, cur:true,  date:new Date(navDate.getFullYear(), navDate.getMonth(), d) });
  while (cells.length%7!==0) { const n=cells.length-calFirstDay-calDim+1; cells.push({ day:n, cur:false, date:new Date(navDate.getFullYear(), navDate.getMonth()+1, n) }); }
  const display = new Date(dateStr+'T12:00:00').toLocaleDateString('en-AU', { day:'numeric', month:'short', year:'numeric' });
  return (
    <>
      <TouchableOpacity style={s.gcPill} onPress={() => setOpen(true)} activeOpacity={0.7}>
        <Text style={[s.gcPillTxt, open && { color: CAL }]}>{display}</Text>
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.45)', justifyContent:'center', alignItems:'center', padding:24 }}>
          <View style={{ backgroundColor:'#fff', borderRadius:20, width:'100%', padding:16, shadowColor:'#000', shadowOpacity:0.15, shadowRadius:20, shadowOffset:{ width:0, height:8 } }}>
            <View style={s.miniCalNav}>
              <TouchableOpacity style={s.miniCalArrBtn} onPress={() => setNavDate(d => { const n=new Date(d); n.setMonth(n.getMonth()-1); return n; })}>
                <Text style={s.miniCalArr}>{'‹'}</Text>
              </TouchableOpacity>
              <Text style={s.miniCalLbl}>{MONTHS[navDate.getMonth()]} {navDate.getFullYear()}</Text>
              <TouchableOpacity style={s.miniCalArrBtn} onPress={() => setNavDate(d => { const n=new Date(d); n.setMonth(n.getMonth()+1); return n; })}>
                <Text style={s.miniCalArr}>{'›'}</Text>
              </TouchableOpacity>
            </View>
            <View style={s.miniCalGrid}>
              {DAYS_HDR.map((d,i) => <Text key={i} style={s.miniCalHdr}>{d}</Text>)}
              {cells.map((cell,i) => {
                const isSel = dateStr === toLocalDateStr(cell.date);
                const isToday = toLocalDateStr(cell.date) === toLocalDateStr(new Date());
                return (
                  <TouchableOpacity key={i} style={s.miniCalDay}
                    onPress={() => { onChange(toLocalDateStr(cell.date)); setOpen(false); }} activeOpacity={0.7}>
                    <View style={[s.miniCalDayInner, isSel && { backgroundColor: CAL }, isToday && !isSel && { backgroundColor: `${CAL}20` }]}>
                      <Text style={[s.miniCalDayTxt, !cell.cur && { color:INK3 }, isSel && { color:'#fff' }, isToday && !isSel && { color: CAL, fontFamily:'Poppins_700Bold' }]}>{cell.day}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity onPress={() => setOpen(false)} style={{ alignItems:'center', paddingTop:12, paddingBottom:4 }} activeOpacity={0.7}>
              <Text style={{ fontFamily:'Poppins_600SemiBold', fontSize:15, color:INK2 }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

// ── SNAP COL (unchanged logic) ────────────────────────────────
function SnapCol({ items, selected, onSelect, fmtItem }: {
  items: (string|number)[]; selected: string|number;
  onSelect: (v: string|number) => void; fmtItem?: (v: string|number) => string;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const selIdx = items.indexOf(selected);
  useEffect(() => { setTimeout(() => scrollRef.current?.scrollTo({ y: selIdx * ROW_H, animated: false }), 50); }, []);
  return (
    <View style={{ flex:1, height: ROW_H*5, overflow:'hidden' }}>
      <View pointerEvents="none" style={{ position:'absolute', top:ROW_H*2, left:4, right:4, height:ROW_H, backgroundColor:`${CAL}12`, borderRadius:12, borderTopWidth:1.5, borderBottomWidth:1.5, borderColor:`${CAL}30`, zIndex:2 }}/>
      <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} snapToInterval={ROW_H} decelerationRate="fast"
        contentContainerStyle={{ paddingVertical: ROW_H*2 }}
        onMomentumScrollEnd={e => { const idx=Math.round(e.nativeEvent.contentOffset.y/ROW_H); onSelect(items[Math.max(0,Math.min(idx,items.length-1))]); }}
        onScrollEndDrag={e => { const idx=Math.round(e.nativeEvent.contentOffset.y/ROW_H); onSelect(items[Math.max(0,Math.min(idx,items.length-1))]); }}>
        {items.map((item, i) => {
          const isSel = item === selected;
          const label = fmtItem ? fmtItem(item) : (typeof item==='number' ? String(item).padStart(2,'0') : String(item).toUpperCase());
          return (
            <TouchableOpacity key={i} style={{ height:ROW_H, alignItems:'center', justifyContent:'center' }}
              onPress={() => { scrollRef.current?.scrollTo({ y:i*ROW_H, animated:true }); onSelect(item); }} activeOpacity={0.7}>
              <Text style={{ fontFamily:isSel?'Poppins_700Bold':'Poppins_400Regular', fontSize:isSel?26:18, color:isSel?INK:INK3 }}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ── TIME PICKER MODAL (unchanged logic, blue accent) ──────────
function TimePickerModal({ visible, hour, minute, ampm, onConfirm, onClose }: {
  visible:boolean; hour:number; minute:number; ampm:'am'|'pm';
  onConfirm:(h:number,m:number,ap:'am'|'pm')=>void; onClose:()=>void;
}) {
  const [h, setH] = useState(hour);
  const [m, setM] = useState(minute);
  const [ap, setAp] = useState<'am'|'pm'>(ampm);
  useEffect(() => { if (visible) { setH(hour); setM(minute); setAp(ampm); } }, [visible]);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.45)', justifyContent:'center', alignItems:'center', padding:32 }}>
        <View style={{ backgroundColor:'#fff', borderRadius:24, width:'100%', padding:24, shadowColor:'#000', shadowOpacity:0.18, shadowRadius:24, shadowOffset:{ width:0, height:8 } }}>
          <Text style={{ fontFamily:'Poppins_700Bold', fontSize:16, color:INK, textAlign:'center', marginBottom:16 }}>Select time</Text>
          <View style={{ flexDirection:'row', alignItems:'center' }}>
            <SnapCol items={HOURS}      selected={h}  onSelect={v => setH(v as number)}/>
            <Text style={{ fontFamily:'Poppins_700Bold', fontSize:28, color:INK3, paddingHorizontal:4 }}>:</Text>
            <SnapCol items={MINUTES}    selected={m}  onSelect={v => setM(v as number)}/>
            <View style={{ width:1, backgroundColor:BORDER, alignSelf:'stretch', marginHorizontal:8, marginVertical:8 }}/>
            <SnapCol items={['am','pm']} selected={ap} onSelect={v => setAp(v as 'am'|'pm')}/>
          </View>
          <View style={{ flexDirection:'row', gap:12, marginTop:20 }}>
            <TouchableOpacity style={{ flex:1, paddingVertical:14, borderRadius:14, borderWidth:1.5, borderColor:BORDER, alignItems:'center' }} onPress={onClose} activeOpacity={0.8}>
              <Text style={{ fontFamily:'Poppins_600SemiBold', fontSize:15, color:INK2 }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ flex:1, paddingVertical:14, borderRadius:14, backgroundColor: CAL, alignItems:'center' }}
              onPress={() => { onConfirm(h,m,ap); onClose(); }} activeOpacity={0.85}>
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
  return (
    <>
      <TouchableOpacity style={s.gcPill} onPress={() => setOpen(true)} activeOpacity={0.7}>
        <Text style={[s.gcPillTxt, open && { color: CAL }]}>{`${hour}:${String(minute).padStart(2,'0')} ${ampm.toUpperCase()}`}</Text>
      </TouchableOpacity>
      <TimePickerModal visible={open} hour={hour} minute={minute} ampm={ampm}
        onConfirm={(h,m,ap) => { onHour(h); onMinute(m); onAmpm(ap); }} onClose={() => setOpen(false)}/>
    </>
  );
}

function DropdownPicker({ options, value, onChange }: { options:string[]; value:string; onChange:(v:string)=>void }) {
  const [open, setOpen] = useState(false);
  return (
    <View>
      <TouchableOpacity style={s.gcRowRight} onPress={() => setOpen(true)} activeOpacity={0.7}>
        <Text style={s.gcRowRightTxt}>{value}</Text>
        <Text style={{ color:INK3, fontSize:14, marginLeft:4 }}>{'⌄'}</Text>
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={{ flex:1, backgroundColor:'rgba(0,0,0,0.35)', justifyContent:'center', alignItems:'center', padding:32 }}
          onPress={() => setOpen(false)} activeOpacity={1}>
          <View style={{ backgroundColor:'#fff', borderRadius:18, width:'100%', overflow:'hidden', shadowColor:'#000', shadowOpacity:0.15, shadowRadius:20, shadowOffset:{ width:0, height:8 } }}>
            {options.map((opt, i) => (
              <TouchableOpacity key={opt}
                style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:20, paddingVertical:16,
                  borderBottomWidth: i<options.length-1 ? 1 : 0, borderBottomColor:BORDER }}
                onPress={() => { onChange(opt); setOpen(false); }} activeOpacity={0.7}>
                <Text style={{ fontFamily: opt===value?'Poppins_600SemiBold':'Poppins_400Regular', fontSize:16, color:opt===value?CAL:INK }}>{opt}</Text>
                {opt===value && <Text style={{ color:CAL, fontSize:16, fontFamily:'Poppins_700Bold' }}>{'✓'}</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// ── ADD EVENT FLOW (logic unchanged, blue accent) ─────────────
function AddEventFlow({ visible, onClose, onSaved, selectedDate }: {
  visible:boolean; onClose:()=>void; onSaved:()=>void; selectedDate:Date;
}) {
  const router = useRouter();
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
      setStep('sheet'); setTitle(''); setLocation(''); setNotes(''); setAllDay(false);
      setStartDate(toLocalDateStr(selectedDate)); setEndDate(toLocalDateStr(selectedDate));
      setStartHour(9); setStartMin(0); setStartAmpm('am');
      setEndHour(10); setEndMin(0); setEndAmpm('am');
      setRepeat('Never'); setAlert('None'); setAssignees(['1']); setSaving(false); setTab('details');
    }
  }, [visible]);

  const toggleAssignee = (id: string) => setAssignees(prev => prev.includes(id) ? prev.filter(x=>x!==id) : [...prev, id]);
  const toH24 = (h:number, ap:'am'|'pm') => ap==='pm' ? (h===12?12:h+12) : (h===12?0:h);

  const save = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const pad = (n:number) => String(n).padStart(2,'0');
      const sh24=toH24(startHour,startAmpm), eh24=toH24(endHour,endAmpm);
      const startMs=new Date(startDate+'T'+pad(sh24)+':'+pad(startMin)+':00').getTime();
      const endMs  =new Date(endDate  +'T'+pad(eh24)+':'+pad(endMin)  +':00').getTime();
      const durMs  =endMs-startMs;
      const base=new Date(startDate+'T12:00:00');
      const addDaysLocal=(d:Date,n:number)=>{ const r=new Date(d); r.setDate(r.getDate()+n); return r; };
      const addMonths=(d:Date,n:number)=>{ const r=new Date(d); r.setMonth(r.getMonth()+n); return r; };
      const repeatDates:Date[]=[];
      if      (repeat==='Never')        repeatDates.push(base);
      else if (repeat==='Every day')    for(let i=0;i<60;i++) repeatDates.push(addDaysLocal(base,i));
      else if (repeat==='Every week')   for(let i=0;i<52;i++) repeatDates.push(addDaysLocal(base,i*7));
      else if (repeat==='Every fortnight') for(let i=0;i<26;i++) repeatDates.push(addDaysLocal(base,i*14));
      else if (repeat==='Every month')  for(let i=0;i<12;i++) repeatDates.push(addMonths(base,i));
      else if (repeat==='Every year')   for(let i=0;i<3;i++) repeatDates.push(addMonths(base,i*12));
      const toStr=(d:Date)=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
      const rows=repeatDates.map(d => {
        const dStr=toStr(d), sTime=allDay?`${dStr}T00:00:00`:`${dStr}T${pad(sh24)}:${pad(startMin)}:00`;
        const eMs=new Date(sTime).getTime()+(allDay?0:durMs), eDate=new Date(eMs), eDStr=toStr(eDate);
        const eTime=allDay?`${eDStr}T23:59:00`:`${eDStr}T${pad(eDate.getHours())}:${pad(eDate.getMinutes())}:00`;
        return { family_id:DUMMY_FAMILY_ID, title:title.trim(), notes:[notes.trim(),location.trim()].filter(Boolean).join(' | '),
          date:dStr, start_time:sTime, end_time:eTime, timezone:'Australia/Brisbane', repeat_rule:repeat, alert_rule:alert, assignees };
      });
      for (let i=0; i<rows.length; i+=20) {
        const batch=rows.slice(i,i+20);
        let { error }=await supabase.from('events').insert(batch);
        if (error && (error.message?.includes('assignees')||error.code==='42703')) {
          const slim=batch.map(({ assignees:_a,...r })=>r);
          const r2=await supabase.from('events').insert(slim); error=r2.error;
        }
        if (error) { setSaving(false); return; }
      }
      lastBriefTime=null; cachedBriefTokens=null; onSaved();
    } catch (e:any) { console.log('Save error:',e?.message); setSaving(false); }
  };

  const dateLabel = selectedDate.toLocaleDateString('en-AU', { weekday:'long', day:'numeric', month:'long' });
  const openZaeli = () => {
    onClose();
    router.push({ pathname:'/(tabs)/zaeli-chat', params: { channel:'Calendar', returnTo:'/(tabs)/calendar',
      seedMessage:`I want to add a new event on ${dateLabel}. Help me book it.` } });
  };

  return (
    <>
      <Modal visible={visible && step==='sheet'} transparent animationType="slide" onRequestClose={onClose}>
        <TouchableOpacity style={{ flex:1, backgroundColor:'rgba(0,0,0,0.4)' }} onPress={onClose} activeOpacity={1}/>
        <View style={{ backgroundColor:'#fff', borderTopLeftRadius:24, borderTopRightRadius:24, paddingHorizontal:20, paddingTop:14, paddingBottom:Platform.OS==='ios'?40:24, gap:16 }}>
          <View style={{ width:36, height:4, borderRadius:2, backgroundColor:BORDER, alignSelf:'center', marginBottom:4 }}/>
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
            <View style={s.sheetDividerLine}/><Text style={s.sheetDividerTxt}>or</Text><View style={s.sheetDividerLine}/>
          </View>
          <TouchableOpacity style={s.sheetSecondary} onPress={() => setStep('form')} activeOpacity={0.8}>
            <Text style={s.sheetSecondaryTxt}>Fill in manually</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      <Modal visible={visible && step==='form'} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
        <SafeAreaView style={{ flex:1, backgroundColor:'#fff' }} edges={['top']}>
          <KeyboardAvoidingView style={{ flex:1 }} behavior={Platform.OS==='ios'?'padding':'height'} keyboardVerticalOffset={0}>
            <View style={s.modalHdr}>
              <TouchableOpacity onPress={onClose}><Text style={s.modalCancel}>← Back</Text></TouchableOpacity>
              <Text style={s.modalTitle}>New Event</Text>
              <TouchableOpacity onPress={save} disabled={!title.trim()||saving}>
                <Text style={[s.modalSave, (!title.trim()||saving) && { opacity:0.35 }]}>{saving?'Saving…':'Save'}</Text>
              </TouchableOpacity>
            </View>
            <View style={s.modalTabs}>
              {(['details','people'] as const).map(t => (
                <TouchableOpacity key={t} style={[s.modalTab, tab===t && s.modalTabOn]} onPress={() => setTab(t)} activeOpacity={0.8}>
                  <Text style={[s.modalTabTxt, tab===t && s.modalTabTxtOn]}>{t==='details'?'Details':'People'}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <ScrollView contentContainerStyle={{ paddingBottom:48 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {tab==='details' ? (
                <View>
                  <View style={s.gcBlock}>
                    <TextInput style={s.gcTitleInput} value={title} onChangeText={setTitle} placeholder="Title" placeholderTextColor={INK3} autoFocus/>
                    <View style={s.gcSep}/>
                    <TextInput style={s.gcSubInput} value={location} onChangeText={setLocation} placeholder="Location or video call" placeholderTextColor={INK3}/>
                  </View>
                  <View style={s.gcBlock}>
                    <View style={s.gcRow}>
                      <Text style={s.gcRowLbl}>All day</Text>
                      <TouchableOpacity onPress={() => setAllDay(v=>!v)} activeOpacity={0.8}>
                        <View style={[s.gcToggle, allDay && s.gcToggleOn]}>
                          <View style={[s.gcToggleThumb, allDay && s.gcToggleThumbOn]}/>
                        </View>
                      </TouchableOpacity>
                    </View>
                    <View style={s.gcSep}/>
                    <View style={s.gcRow}>
                      <Text style={s.gcRowLbl}>Starts</Text>
                      <View style={{ flexDirection:'row', gap:8, alignItems:'center' }}>
                        <MiniCalPicker dateStr={startDate} onChange={d => { setStartDate(d); if(d>endDate) setEndDate(d); }}/>
                        {!allDay && <TimePill hour={startHour} minute={startMin} ampm={startAmpm} onHour={setStartHour} onMinute={setStartMin} onAmpm={setStartAmpm}/>}
                      </View>
                    </View>
                    <View style={s.gcSep}/>
                    <View style={s.gcRow}>
                      <Text style={s.gcRowLbl}>Ends</Text>
                      <View style={{ flexDirection:'row', gap:8, alignItems:'center' }}>
                        <MiniCalPicker dateStr={endDate} onChange={d => { if(d>=startDate) setEndDate(d); }}/>
                        {!allDay && <TimePill hour={endHour} minute={endMin} ampm={endAmpm} onHour={setEndHour} onMinute={setEndMin} onAmpm={setEndAmpm}/>}
                      </View>
                    </View>
                  </View>
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
                  <View style={s.gcBlock}>
                    <TextInput style={s.gcSubInput} value={notes} onChangeText={setNotes} placeholder="Notes" placeholderTextColor={INK3} multiline numberOfLines={3} textAlignVertical="top"/>
                  </View>
                </View>
              ) : (
                <View style={{ padding:20, gap:12 }}>
                  <Text style={{ fontFamily:'Poppins_400Regular', fontSize:13, color:INK2, lineHeight:20 }}>Who is this event for?</Text>
                  {FAMILY_MEMBERS.map(m => {
                    const on=assignees.includes(m.id);
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

// ── EVENT DETAIL MODAL (logic unchanged, blue accent) ─────────
function EventDetailModal({ event, onClose, onDeleted }: { event:any|null; onClose:()=>void; onDeleted:()=>void }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  useEffect(() => { if (event) { setDeleting(false); setConfirmDelete(false); } }, [event?.id]);
  if (!event) return null;

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    try { await supabase.from('events').delete().eq('id', event.id); onDeleted(); }
    catch (e) { console.log('Delete error:', e); setDeleting(false); }
  };
  const handleEditWithZaeli = () => {
    onClose();
    router.push({ pathname:'/(tabs)/zaeli-chat', params: { channel:'Calendar', returnTo:'/(tabs)/calendar',
      seedMessage:`I want to edit the "${event.title}" event on ${event.date}. Help me update it.` } });
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
          <Text style={{ fontFamily:'Poppins_700Bold', fontSize:22, color:INK, lineHeight:30 }}>{event.title}</Text>
          {event.date && (
            <View style={s.detailRow}>
              <Text style={s.detailIcon}>📅</Text>
              <View>
                <Text style={s.detailTxt}>{new Date(event.date+'T12:00:00').toLocaleDateString('en-AU', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}</Text>
                {event.end_time && (() => { const ed=event.end_time.split('T')[0]; return ed!==event.date ? <Text style={[s.detailTxt,{color:INK2}]}>{'→ '+new Date(ed+'T12:00:00').toLocaleDateString('en-AU',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</Text> : null; })()}
              </View>
            </View>
          )}
          {event.start_time && <View style={s.detailRow}><Text style={s.detailIcon}>🕐</Text><Text style={s.detailTxt}>{fmtTime(event.start_time)}{event.end_time?` → ${fmtTime(event.end_time)}`:''}</Text></View>}
          {event.repeat_rule && event.repeat_rule!=='Never' && <View style={s.detailRow}><Text style={s.detailIcon}>🔁</Text><Text style={s.detailTxt}>{event.repeat_rule}</Text></View>}
          {event.alert_rule && event.alert_rule!=='None' && <View style={s.detailRow}><Text style={s.detailIcon}>🔔</Text><Text style={s.detailTxt}>{event.alert_rule}</Text></View>}
          {event.notes ? <View style={s.detailRow}><Text style={s.detailIcon}>📝</Text><Text style={s.detailTxt}>{event.notes}</Text></View> : null}
          <View style={{ height:12 }}/>
          <TouchableOpacity style={s.editBtn} onPress={handleEditWithZaeli} activeOpacity={0.8}>
            <Text style={s.editBtnTxt}>✨  Edit with Zaeli</Text>
          </TouchableOpacity>
          <View style={{ height:4 }}/>
          <TouchableOpacity style={[s.deleteBtn, confirmDelete && s.deleteBtnConfirm]} onPress={handleDelete} disabled={deleting} activeOpacity={0.8}>
            <Text style={s.deleteBtnTxt}>{deleting?'Deleting…':confirmDelete?'⚠️ Confirm delete':'🗑  Delete event'}</Text>
          </TouchableOpacity>
          {confirmDelete && (
            <TouchableOpacity onPress={() => setConfirmDelete(false)} style={{ alignItems:'center', paddingVertical:8 }}>
              <Text style={{ fontFamily:'Poppins_500Medium', fontSize:13, color:INK2 }}>Cancel</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ── MAIN SCREEN ───────────────────────────────────────────────
export default function CalendarScreen() {
  const today  = new Date();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const openChat = (seed?: string) => router.push({
    pathname: '/(tabs)/zaeli-chat',
    params: { channel:'Calendar', returnTo:'/(tabs)/calendar', ...(seed ? { seedMessage: seed } : {}) },
  });

  const [view,          setView]          = useState<'day'|'month'>('day');
  const [selectedDate,  setSelectedDate]  = useState(new Date(today));
  const [calMonth,      setCalMonth]      = useState(today.getMonth());
  const [calYear,       setCalYear]       = useState(today.getFullYear());
  const [events,        setEvents]        = useState<any[]>([]);
  const [todos,         setTodos]         = useState<any[]>([]);
  const [menuOpen,      setMenuOpen]      = useState(false);
  const [showSheet,     setShowSheet]     = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  // Brief state
  const [briefLoading,        setBriefLoading]        = useState(true);
  const [briefTokens,         setBriefTokens]         = useState<BriefToken[]>([]);
  const [briefSub,            setBriefSub]            = useState('');
  const [briefCta,            setBriefCta]            = useState('Yes please');
  const [briefSeed,           setBriefSeed]           = useState('');
  const [briefDismissedLocal, setBriefDismissedLocal] = useState(false);
  const [showRelaxed,         setShowRelaxed]         = useState(false);
  const briefFadeAnim   = useRef(new Animated.Value(1)).current;
  const relaxedFadeAnim = useRef(new Animated.Value(0)).current;
  const lastBriefRef = useRef<number | null>(lastBriefTime);

  const params = useLocalSearchParams<{ eventId?: string }>();
  const handledEventId = useRef<string | null>(null);

  // Week strip
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

  // Generate brief — 30-min refresh (matches home screen pattern)
  const generateBrief = useCallback(async (force = false) => {
    const now30 = Date.now();
    const msSinceLast = lastBriefRef.current ? now30 - lastBriefRef.current : Infinity;
    if (!force && msSinceLast < 30 * 60 * 1000 && cachedBriefTokens) {
      setBriefTokens(cachedBriefTokens);
      setBriefSub(cachedBriefSub || '');
      setBriefCta(cachedBriefCta || 'Yes please');
      setBriefSeed(cachedBriefSeed || '');
      setBriefLoading(false);
      return;
    }
    lastBriefRef.current = now30;
    lastBriefTime = now30;
    setBriefLoading(true);

    try {
      const now2    = new Date();
      const td      = toLocalDateStr(now2);
      const h       = now2.getHours();
      const frame   = getTimeFrame(h);
      const isLate  = h >= 21 || h < 6;
      const greeting = h < 12 ? 'Morning' : h < 17 ? 'Afternoon' : h < 21 ? 'Evening' : 'Hey';
      const dateCtx = now2.toLocaleDateString('en-AU', { weekday:'long', day:'numeric', month:'long' });
      const timeStr = now2.toLocaleTimeString('en-AU', { hour:'2-digit', minute:'2-digit' });

      // Fetch fresh events for brief
      const in48hStr = toLocalDateStr(addDays(now2, 2));
      const evFetch = await supabase.from('events').select('*').eq('family_id', DUMMY_FAMILY_ID)
        .gte('date', td).lte('date', in48hStr).order('date').order('start_time').limit(8);
      const freshEvents = evFetch.data || [];

      const evStr = freshEvents.length > 0
        ? freshEvents.map(e => `${e.title} (${naturalDate(e.date, td)}${e.start_time ? ' at ' + fmtTime(e.start_time) : ''})`).join(', ')
        : 'Nothing on calendar';

      const sys = `You are Zaeli — warm, switched-on, slightly witty Australian family assistant. Anne Hathaway energy. Writing the calendar brief for Anna. This is NOT a greeting — jump straight into what matters.

CONTEXT:
- Date: ${dateCtx} (${frame})
- Time: ${timeStr}
- Events next 48h: ${evStr}
${isLate ? '- It is late — keep it calm, focus on tomorrow.' : ''}

BRIEF RULES:
1. Do NOT start with "Morning Anna" or any greeting
2. Write exactly 3 sentences. Each MUST end with a full stop. No em-dashes joining sentences, no run-ons.
3. Make them feel alive and warm — switched-on friend noticing things, not a status report
4. Reference the ACTUAL day name (today, tomorrow, Monday etc) — never raw dates like "2026-03-23"
5. Reference times naturally (this morning, tonight, at 9) — never "at 9:00 AM"
6. Wrap ONE key fact in [ACCENT1]phrase[/ACCENT1] — the most important event
7. Third sentence: flag something slipping, note a gap, or offer a warm observation
8. Never invent events — only use data provided above

CTA LABEL (the button Anna taps):
- 3-5 words that make grammatical sense STANDALONE — something Anna would say
- Good: "Yes, keep an eye", "Yes please!", "Sounds good", "Flag anything urgent"
- Bad: "Want me to keep?", "Yes, nudge me for" — do NOT truncate a question

SUB QUESTION (small italic text below brief):
- A warm specific question Zaeli asks Anna — ends with ?

SEED MESSAGE (what Anna says when she taps the CTA):
- First-person, conversational, natural — NOT Zaeli's question repeated back
- e.g. "Yes please, keep an eye out for anything that needs sorting"

Return ONLY valid JSON (no markdown, no backticks):
{"main":"[3 sentences each ending with full stop]","sub":"Warm question ending with ?","cta":"3-5 word label","seed":"What Anna says when tapping"}`;

      const raw    = await callBrief({ feature:'calendar_brief', system:'You are Zaeli writing a tight calendar brief. Follow JSON format exactly.', userContent:sys, maxTokens:350 });
      const clean  = raw.replace(/```json|```/g,'').trim();
      const parsed = JSON.parse(clean);
      const tokens = parseBriefTokens(parsed.main || '');
      cachedBriefTokens = tokens;
      cachedBriefSub    = parsed.sub || '';
      cachedBriefCta    = parsed.cta || 'Yes please';
      cachedBriefSeed   = parsed.seed || parsed.sub || '';
      setBriefTokens(tokens);
      setBriefSub(parsed.sub || '');
      setBriefCta(parsed.cta || 'Yes please');
      setBriefSeed(parsed.seed || parsed.sub || '');
    } catch (e) {
      console.log('Calendar brief error:', e);
      const fb = parseBriefTokens("Calendar's looking clear right now. A good moment to get ahead of anything coming up. Nothing urgent is screaming for attention.");
      setBriefTokens(fb);
      setBriefSub("Want me to check what's coming up this week?");
      setBriefCta('Yes please');
      setBriefSeed("Yes please, pull up what's coming up this week.");
    } finally {
      setBriefLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    // Reset any stale modal/sheet state when returning to screen
    setSelectedEvent(null);
    setShowSheet(false);
    setMenuOpen(false);
    // Reset dismissed state if it's been 2+ hours
    if (briefDismissed && lastBriefTime && (Date.now() - lastBriefTime) > 2 * 60 * 60 * 1000) {
      briefDismissed = false;
      lastBriefTime = null;
      cachedBriefTokens = null;
      setBriefDismissedLocal(false);
      setShowRelaxed(false);
      briefFadeAnim.setValue(1);
      relaxedFadeAnim.setValue(0);
    }
    loadEvents();
    loadTodos();
    generateBrief();
    return () => {};
  }, [loadEvents, loadTodos, generateBrief]));

  const handleDismissBrief = () => {
    Animated.timing(briefFadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
      briefDismissed = true;
      setBriefDismissedLocal(true);
      setTimeout(() => {
        setShowRelaxed(true);
        Animated.timing(relaxedFadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
      }, 350);
    });
  };

  useEffect(() => {
    const id = params.eventId;
    if (!id || id === handledEventId.current) return;
    if (events.length === 0) return;
    const found = events.find((e: any) => String(e.id) === String(id));
    if (found) { handledEventId.current = id; setSelectedEvent(found); }
  }, [params.eventId, events]);

  useEffect(() => { setCalMonth(selectedDate.getMonth()); setCalYear(selectedDate.getFullYear()); }, [selectedDate]);

  const selectedDateStr = toLocalDateStr(selectedDate);
  const todayStr        = toLocalDateStr(today);
  const dayEvents       = events.filter(e => (e.date||'') === selectedDateStr);
  const daysWithEvSet   = new Set(events.map(e => e.date||''));

  const scrollToToday = () => {
    setSelectedDate(new Date(today));
    weekStripRef.current?.scrollTo({ x: STRIP_BEFORE * PILL_W, animated:true });
  };

  // ── Render event row ─────────────────────────────────────────
  const renderEvent = (ev: any, i: number, allEventsForDay: any[]) => {
    const isClash = allEventsForDay.some((f, j) =>
      i!==j && new Date(ev.start_time) < new Date(f.end_time||f.start_time) && new Date(f.start_time) < new Date(ev.end_time||ev.start_time)
    );
    const timeStr = fmtTime(ev.start_time);
    const tp = timeStr.match(/(\d+:\d+)\s*(am|pm)/i);
    const color = isClash ? CORAL : evColor(i);
    return (
      <TouchableOpacity key={ev.id} style={s.eventItem} activeOpacity={0.7} onPress={() => setSelectedEvent(ev)}>
        <View style={s.evTimeCol}>
          <Text style={s.evT}>{tp ? tp[1] : timeStr}</Text>
          <Text style={s.evD}>{tp ? tp[2] : ''}</Text>
        </View>
        <View style={[s.evLine, { backgroundColor: color }]}/>
        <View style={s.evBody}>
          <Text style={s.evName}>{ev.title}</Text>
          {ev.notes ? <Text style={[s.evMeta, isClash && { color: CORAL }]} numberOfLines={1}>{isClash ? '⚡ Zaeli flagged — clash detected' : ev.notes}</Text> : null}
        </View>
        <Text style={{ fontSize:16, color:INK3, paddingRight:4 }}>›</Text>
      </TouchableOpacity>
    );
  };

  // ── Build month cells ────────────────────────────────────────
  const buildMonthCells = () => {
    const dim=getDaysInMonth(calYear,calMonth), firstDay=getFirstDayOfMonth(calYear,calMonth), prevDim=getDaysInMonth(calYear,calMonth-1);
    const cells: { day:number; cur:boolean; date:Date }[] = [];
    for (let i=firstDay-1; i>=0; i--) cells.push({ day:prevDim-i, cur:false, date:new Date(calYear,calMonth-1,prevDim-i) });
    for (let d=1; d<=dim; d++)        cells.push({ day:d, cur:true, date:new Date(calYear,calMonth,d) });
    while (cells.length%7!==0) { const n=cells.length-firstDay-dim+1; cells.push({ day:n, cur:false, date:new Date(calYear,calMonth+1,n) }); }
    return cells;
  };

  const briefPlaceholder = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Checking your morning…';
    if (h < 17) return 'Pulling up your afternoon…';
    if (h < 21) return 'Seeing what\'s on tonight…';
    return 'Getting tomorrow together…';
  })();

  // ── Random relaxed card content — chosen on dismiss ──────────
  const CAL_RELAXED_VARS = [
    { ack: 'Sorted! 📅', title: 'Ask Zaeli anything', msg: "Did you know I can set up recurring events? School pickup, footy training, piano lessons — tell me once and I'll remember every week." },
    { ack: 'No worries! ✌️', title: 'Planning a trip?', msg: "I can block out a holiday, suggest what to pack for the kids, and build a day-by-day itinerary. Just tell me where and when." },
    { ack: 'All good! 👍', title: 'Ask Zaeli anything', msg: "School holidays are coming up — want me to start thinking about activities and care arrangements before things book up?" },
    { ack: 'Got it! 🙌', title: 'A little breathing room?', msg: "I noticed today is looking quite full. Want me to protect some buffer time so you're not running between everything?" },
  ];
  const relaxedVar = useRef(CAL_RELAXED_VARS[Math.floor(Math.random() * CAL_RELAXED_VARS.length)]).current;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar style="light"/>
      <NavMenu visible={menuOpen} onClose={() => setMenuOpen(false)}/>

      {/* ══ HERO BANNER ══ */}
      <View style={s.hero}>
        <View style={s.heroOrb1}/>
        <View style={s.heroOrb2}/>

        {/* Row 1: logo (left) · Calendar title (centre) · hamburger (right) */}
        <View style={s.heroRow}>
          <TouchableOpacity style={s.logoMark} onPress={() => router.replace('/(tabs)/')} activeOpacity={0.75}>
            <View style={s.logoStarBox}><Text style={s.logoStarTxt}>✦</Text></View>
            <Text style={s.logoWord}>z<Text style={{ color:YELLOW }}>a</Text>el<Text style={{ color:YELLOW }}>i</Text></Text>
          </TouchableOpacity>
          <Text style={s.heroTitle}>Calendar</Text>
          <HamburgerButton onPress={() => setMenuOpen(true)} tint="#fff"/>
        </View>

        {/* Row 2: toggle (centre) · + add (right, aligned with hamburger above) */}
        <View style={s.heroRow2}>
          <View style={{ width: 44 }}/>
          <View style={s.viewToggle}>
            {(['day','month'] as const).map(v => (
              <TouchableOpacity key={v} style={[s.vt, view===v && s.vtOn]} onPress={() => setView(v)} activeOpacity={0.8}>
                <Text style={[s.vtTxt, view===v && s.vtTxtOn]}>{v.charAt(0).toUpperCase()+v.slice(1)}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={s.addBtnHero} onPress={() => setShowSheet(true)} activeOpacity={0.8}>
            <IcoPlus color="#fff" size={16}/>
          </TouchableOpacity>
        </View>
      </View>

      {/* ══ WEEK STRIP ══ */}
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
                  onPress={() => { setSelectedDate(new Date(d)); if(view==='month') setView('day'); }} activeOpacity={0.8}>
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
            <Text style={s.todayBtnTxt}>↑ Today</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ══ MAIN CONTENT ══ */}
      <View style={s.content}>

        {/* ── DAY VIEW ── */}
        {view === 'day' && (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom:140 }}>

            {/* Brief — fades out on dismiss */}
            {!briefDismissedLocal && (
              <Animated.View style={{ opacity: briefFadeAnim }}>
                <AnimatedCalBrief tokens={briefTokens} sub={briefSub} placeholder={briefPlaceholder}/>
                {!briefLoading && briefTokens.length > 0 && (
                  <View style={s.briefBtns}>
                    <TouchableOpacity style={s.btnPrimary}
                      onPress={() => openChat(briefSeed)} activeOpacity={0.85}>
                      <Text style={s.btnPrimaryTxt} numberOfLines={1} adjustsFontSizeToFit>{briefCta}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.btnGhost} onPress={handleDismissBrief} activeOpacity={0.7}>
                      <Text style={s.btnGhostTxt} numberOfLines={1}>I'm sorted, thanks</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </Animated.View>
            )}

            {/* Relaxed card — fades in after dismiss */}
            {showRelaxed && (
              <Animated.View style={[s.relaxedCard, { opacity: relaxedFadeAnim }]}>
                <View style={s.relaxedHeader}>
                  <View style={s.relaxedAv}><Text style={{ fontSize:13, color:'#fff' }}>✦</Text></View>
                  <Text style={s.relaxedAck}>{relaxedVar.ack}</Text>
                </View>
                <View style={s.relaxedBody}>
                  <Text style={s.relaxedTitle}>{relaxedVar.title}</Text>
                  <Text style={s.relaxedMsg}>{relaxedVar.msg}</Text>
                  <TouchableOpacity style={s.relaxedBtn} onPress={() => openChat()} activeOpacity={0.8}>
                    <Text style={s.relaxedBtnTxt}>Open Zaeli ✦</Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            )}

            {/* Date label */}
            <Text style={s.slbl}>{selectedDate.toLocaleDateString('en-AU', { weekday:'long', day:'numeric', month:'long' }).toUpperCase()}</Text>
            {/* Events */}
            {dayEvents.length === 0 ? (
              <Text style={s.emptyTxt}>Nothing on for this day</Text>
            ) : (
              dayEvents.map((ev,i) => renderEvent(ev,i,dayEvents))
            )}
          </ScrollView>
        )}

        {/* ── MONTH VIEW — no brief, just grid + day events ── */}
        {view === 'month' && (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom:140 }}>

            {/* Month navigation header */}
            <View style={s.monthNavBar}>
              <TouchableOpacity style={s.monthNavBtn}
                onPress={() => { if(calMonth===0){setCalMonth(11);setCalYear(y=>y-1);}else setCalMonth(m=>m-1); }}
                activeOpacity={0.7}>
                <Text style={s.monthNavArrow}>‹</Text>
              </TouchableOpacity>
              <Text style={s.monthNavLabel}>{MONTHS[calMonth]} {calYear}</Text>
              <TouchableOpacity style={s.monthNavBtn}
                onPress={() => { if(calMonth===11){setCalMonth(0);setCalYear(y=>y+1);}else setCalMonth(m=>m+1); }}
                activeOpacity={0.7}>
                <Text style={s.monthNavArrow}>›</Text>
              </TouchableOpacity>
            </View>

            {/* Day headers */}
            <View style={s.calGrid}>
              {DAYS_HDR.map((d,i) => <View key={i} style={s.calCell}><Text style={s.calHdr}>{d}</Text></View>)}
            </View>

            {/* Month cells */}
            <View style={s.calGrid}>
              {buildMonthCells().map((cell,i) => {
                const isToday=cell.cur && cell.day===today.getDate() && calMonth===today.getMonth() && calYear===today.getFullYear();
                const isSel=toLocalDateStr(cell.date)===selectedDateStr;
                const hasEv=cell.cur && daysWithEvSet.has(toLocalDateStr(cell.date));
                return (
                  <TouchableOpacity key={i} style={s.calCell}
                    onPress={() => setSelectedDate(new Date(cell.date))} activeOpacity={0.7}>
                    <View style={[s.calDayInner, isToday && s.calDayToday, isSel && !isToday && s.calDaySel]}>
                      <Text style={[s.calDayTxt, !cell.cur && s.calDayOther, isToday && { color:'#fff', fontFamily:'Poppins_700Bold' }]}>{cell.day}</Text>
                      {hasEv && <View style={[s.calDot, isToday && { backgroundColor:'#fff' }]}/>}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Selected day events — identical format to day view */}
            <Text style={[s.slbl, { marginTop:16 }]}>{selectedDate.toLocaleDateString('en-AU', { weekday:'long', day:'numeric', month:'long' }).toUpperCase()}</Text>
            {(() => {
              const sel = events.filter(e => (e.date||'') === selectedDateStr);
              if (!sel.length) return <Text style={s.emptyTxt}>Nothing on for this day</Text>;
              return sel.map((ev,i) => renderEvent(ev, i, sel));
            })()}
          </ScrollView>
        )}
      </View>

      {/* ── MODALS ── */}
      <EventDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} onDeleted={() => { setSelectedEvent(null); loadEvents(); }}/>
      <AddEventFlow visible={showSheet} onClose={() => setShowSheet(false)} onSaved={() => { setShowSheet(false); loadEvents(); }} selectedDate={selectedDate}/>

      {/* ══ FLOATING BAR ══ */}
      <View style={s.floatingBar}>
        <View style={s.floatingBarInner}>
          <TouchableOpacity style={s.barIconBtn} onPress={() => setShowSheet(true)} activeOpacity={0.75}>
            <IcoPlus color={INK3} size={20}/>
          </TouchableOpacity>
          <View style={s.barSep}/>
          <TouchableOpacity style={{ flex:1, paddingVertical:4 }} onPress={() => openChat()} activeOpacity={0.6}>
            <Text style={s.barPlaceholder}>Ask about your calendar…</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.barMicBtn}
            onPress={() => router.push({ pathname:'/(tabs)/zaeli-chat', params:{ channel:'Calendar', returnTo:'/(tabs)/calendar', autoMic:'true' } })}
            activeOpacity={0.85}>
            <IcoMic color="#fff"/>
          </TouchableOpacity>
        </View>
      </View>

    </SafeAreaView>
  );
}

// ── STYLES ────────────────────────────────────────────────────
const CELL_SIZE = 42;

const s = StyleSheet.create({
  safe:    { flex:1, backgroundColor: CAL },
  content: { flex:1, backgroundColor: BG },

  // Hero — two clean rows
  hero:          { backgroundColor: CAL, paddingHorizontal:20, paddingTop:10, paddingBottom:12, position:'relative', overflow:'hidden' },
  heroOrb1:      { position:'absolute', width:200, height:200, borderRadius:100, top:-70, right:-50, backgroundColor:'rgba(255,255,255,0.07)' },
  heroOrb2:      { position:'absolute', width:120, height:120, borderRadius:60, bottom:-30, left:-20, backgroundColor:'rgba(255,255,255,0.05)' },
  // Row 1: logo | title | hamburger — all same height, title centred via flex
  heroRow:       { flexDirection:'row', alignItems:'center', marginBottom:10 },
  logoMark:      { flexDirection:'row', alignItems:'center', gap:8, zIndex:2 },
  logoStarBox:   { width:36, height:36, backgroundColor:'rgba(255,255,255,0.2)', borderRadius:11, alignItems:'center', justifyContent:'center' },
  logoStarTxt:   { fontSize:18, color:'#fff' },
  logoWord:      { fontFamily:'DMSerifDisplay_400Regular', fontSize:24, color:'#fff', letterSpacing:-0.5 },
  heroTitle:     { flex:1, fontFamily:'DMSerifDisplay_400Regular', fontSize:32, color:'#fff', letterSpacing:-0.8, textAlign:'center' },
  // Row 2: spacer | toggle | + button — toggle centred, + right-aligned with hamburger
  heroRow2:      { flexDirection:'row', alignItems:'center', justifyContent:'space-between' },
  heroToggleRow: { alignItems:'center' }, // kept for safety
  heroRight:     { flexDirection:'row', alignItems:'center', gap:8 },
  addBtnHero:    { width:36, height:36, borderRadius:10, backgroundColor:'rgba(255,255,255,0.2)', alignItems:'center', justifyContent:'center' },

  // Toggle — fixed width, symmetric, centred on own row
  viewToggle: { flexDirection:'row', backgroundColor:'rgba(255,255,255,0.18)', borderRadius:10, padding:3, width:160 },
  vt:         { flex:1, paddingVertical:7, borderRadius:8, alignItems:'center', justifyContent:'center' },
  vtOn:       { backgroundColor:'#fff' },
  vtTxt:      { fontFamily:'Poppins_600SemiBold', fontSize:12, color:'rgba(255,255,255,0.65)', textAlign:'center' },
  vtTxtOn:    { color: INK },

  // Week strip
  stripBar:        { backgroundColor:'#fff', borderBottomWidth:1, borderBottomColor:BORDER },
  stripMonthLabel: { fontFamily:'Poppins_700Bold', fontSize:9, color:CAL, textTransform:'uppercase', letterSpacing:1, textAlign:'center', height:14, paddingTop:1 },
  dayPill:         { width:52, alignItems:'center', gap:2, paddingVertical:8, borderRadius:14 },
  dayPillToday:    { backgroundColor: CAL },
  dayPillSelected: { backgroundColor:`${CAL}18` },
  dpDay:           { fontFamily:'Poppins_700Bold', fontSize:9, textTransform:'uppercase', letterSpacing:0.3, color:INK3 },
  dpNum:           { fontFamily:'Poppins_800ExtraBold', fontSize:17, color:INK },
  dpDot:           { width:4, height:4, borderRadius:2, backgroundColor:'transparent' },
  dpDotHas:        { backgroundColor: CAL },
  todayBtn:        { alignSelf:'center', marginBottom:6, paddingHorizontal:14, paddingVertical:4, backgroundColor:CAL, borderRadius:20 },
  todayBtnTxt:     { fontFamily:'Poppins_600SemiBold', fontSize:11, color:'#fff' },

  // Brief — 26px with good sentence spacing
  briefBlock:           { paddingHorizontal:22, paddingTop:24, paddingBottom:4, minHeight:110 },
  briefPlaceholderWrap: { position:'absolute', top:24, left:22, right:22 },
  briefPlaceholder:     { fontFamily:'DMSerifDisplay_400Italic', fontSize:26, color:INK3, lineHeight:34, letterSpacing:-0.8 },
  briefMain:            { fontFamily:'DMSerifDisplay_400Regular', fontSize:26, color:INK, lineHeight:34, letterSpacing:-0.8 },
  briefAccent:          { fontFamily:'DMSerifDisplay_400Regular', fontSize:26, color:CORAL },
  briefSub:             { fontFamily:'DMSerifDisplay_400Italic', fontSize:15, color:INK2, lineHeight:22, letterSpacing:-0.2, marginTop:10, marginBottom:2 },

  // CTA buttons — text centered, proper padding
  briefBtns:    { flexDirection:'row', gap:10, paddingHorizontal:22, marginTop:16, marginBottom:22 },
  btnPrimary:   { flex:1, backgroundColor:CAL, borderRadius:12, paddingVertical:13, paddingHorizontal:10, alignItems:'center', justifyContent:'center' },
  btnPrimaryTxt:{ fontFamily:'Poppins_600SemiBold', fontSize:13, color:'#fff', textAlign:'center' },
  btnGhost:     { flex:1, backgroundColor:'rgba(0,0,0,0.05)', borderRadius:12, paddingVertical:13, paddingHorizontal:10, alignItems:'center', justifyContent:'center', borderWidth:1.5, borderColor:BORDER },
  btnGhostTxt:  { fontFamily:'Poppins_600SemiBold', fontSize:13, color:INK2, textAlign:'center' },

  // Relaxed card after dismiss — matches dismissed card spec
  relaxedCard:   { marginHorizontal:22, marginTop:14, marginBottom:6, borderRadius:16, borderWidth:1.5, borderColor:`${CAL}20`, backgroundColor:`${CAL}06`, overflow:'hidden' },
  relaxedHeader: { flexDirection:'row', alignItems:'center', gap:10, paddingTop:12, paddingHorizontal:14, paddingBottom:10, borderBottomWidth:1, borderBottomColor:'rgba(0,0,0,0.05)' },
  relaxedAv:     { width:28, height:28, borderRadius:9, backgroundColor:CAL, alignItems:'center', justifyContent:'center', flexShrink:0 },
  relaxedAck:    { fontFamily:'Poppins_700Bold', fontSize:12, color:CAL, flex:1 },
  relaxedBody:   { padding:14, paddingTop:12 },
  relaxedTitle:  { fontFamily:'Poppins_700Bold', fontSize:13, color:INK, marginBottom:5 },
  relaxedMsg:    { fontFamily:'Poppins_400Regular', fontSize:13, color:INK2, lineHeight:20, marginBottom:12 },
  relaxedBtn:    { paddingVertical:10, borderRadius:12, backgroundColor:`${CAL}10`, alignItems:'center' },
  relaxedBtnTxt: { fontFamily:'Poppins_600SemiBold', fontSize:12, color:CAL },

  // Day label + events — identical in day view and month view
  slbl:      { fontFamily:'Poppins_700Bold', fontSize:10, color:INK3, letterSpacing:1.2, textTransform:'uppercase', paddingHorizontal:22, paddingTop:4, paddingBottom:10 },
  emptyTxt:  { fontFamily:'Poppins_400Regular', fontSize:14, color:INK3, paddingHorizontal:22, paddingTop:4, paddingBottom:16 },
  eventItem: { flexDirection:'row', alignItems:'center', paddingHorizontal:22, paddingVertical:14, borderBottomWidth:1, borderBottomColor:BORDER, gap:12, backgroundColor:'#fff' },
  evTimeCol: { width:36, alignItems:'flex-end' },
  evT:       { fontFamily:'Poppins_600SemiBold', fontSize:13, color:INK },
  evD:       { fontFamily:'Poppins_400Regular', fontSize:10, color:INK3 },
  evLine:    { width:3, height:36, borderRadius:2, flexShrink:0 },
  evBody:    { flex:1 },
  evName:    { fontFamily:'Poppins_600SemiBold', fontSize:14, color:INK },
  evMeta:    { fontFamily:'Poppins_400Regular', fontSize:12, color:INK3, marginTop:2 },

  // Month view nav + grid
  monthNavBar:   { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:16, paddingTop:14, paddingBottom:8 },
  monthNavBtn:   { width:40, height:40, alignItems:'center', justifyContent:'center' },
  monthNavArrow: { fontFamily:'Poppins_400Regular', fontSize:28, color:INK2 },
  monthNavLabel: { fontFamily:'Poppins_700Bold', fontSize:16, color:INK },
  calGrid:       { flexDirection:'row', flexWrap:'wrap', paddingHorizontal:10 },
  calCell:       { width:`${100/7}%` as any, aspectRatio:1, alignItems:'center', justifyContent:'center' },
  calHdr:        { fontFamily:'Poppins_700Bold', fontSize:9, textTransform:'uppercase', color:INK3 },
  calDayInner:   { width:CELL_SIZE, height:CELL_SIZE, borderRadius:CELL_SIZE/2, alignItems:'center', justifyContent:'center', position:'relative' },
  calDayToday:   { backgroundColor: CAL },
  calDaySel:     { backgroundColor:`${CAL}18` },
  calDayTxt:     { fontFamily:'Poppins_500Medium', fontSize:13, color:INK },
  calDayOther:   { color:INK3 },
  calDot:        { position:'absolute', bottom:3, width:4, height:4, borderRadius:2, backgroundColor:CAL },

  // Floating bar — matches home screen exactly
  floatingBar:      { position:'absolute', bottom:0, left:0, right:0, paddingHorizontal:16, paddingBottom:Platform.OS==='ios' ? 32 : 20, paddingTop:12 },
  floatingBarInner: { flexDirection:'row', alignItems:'center', gap:8, backgroundColor:'#fff', borderRadius:32, paddingVertical:16, paddingHorizontal:18, borderWidth:1, borderColor:BORDER, shadowColor:'#000', shadowOpacity:0.08, shadowRadius:18, shadowOffset:{ width:0, height:-2 }, elevation:6 },
  barIconBtn:       { width:36, height:36, alignItems:'center', justifyContent:'center' },
  barSep:           { width:1, height:20, backgroundColor:'rgba(10,10,10,0.1)' },
  barPlaceholder:   { fontFamily:'Poppins_400Regular', fontSize:16, color:INK3, flex:1 },
  barMicBtn:        { width:38, height:38, borderRadius:19, backgroundColor:CORAL, alignItems:'center', justifyContent:'center' },

  // Add event sheet
  sheetAv:           { width:40, height:40, borderRadius:13, backgroundColor:CAL, alignItems:'center', justifyContent:'center', flexShrink:0 },
  sheetTitle:        { fontFamily:'Poppins_700Bold', fontSize:16, color:INK },
  sheetSub:          { fontFamily:'Poppins_400Regular', fontSize:12, color:INK2, marginTop:1 },
  sheetClose:        { width:32, height:32, borderRadius:10, backgroundColor:'rgba(0,0,0,0.06)', alignItems:'center', justifyContent:'center' },
  sheetCloseTxt:     { fontFamily:'Poppins_600SemiBold', fontSize:13, color:INK2 },
  sheetPrimary:      { flexDirection:'row', alignItems:'center', gap:14, backgroundColor:`${CAL}08`, borderWidth:1.5, borderColor:`${CAL}25`, borderRadius:18, padding:16, marginBottom:16 },
  sheetPrimaryIcon:  { width:44, height:44, borderRadius:14, backgroundColor:CAL, alignItems:'center', justifyContent:'center', flexShrink:0 },
  sheetPrimaryTitle: { fontFamily:'Poppins_700Bold', fontSize:15, color:INK, marginBottom:2 },
  sheetPrimaryDesc:  { fontFamily:'Poppins_400Regular', fontSize:12, color:INK2, lineHeight:18 },
  sheetPrimaryArrow: { fontFamily:'Poppins_700Bold', fontSize:18, color:CAL, flexShrink:0 },
  sheetDivider:      { flexDirection:'row', alignItems:'center', gap:10, marginBottom:14 },
  sheetDividerLine:  { flex:1, height:1, backgroundColor:'rgba(0,0,0,0.07)' },
  sheetDividerTxt:   { fontFamily:'Poppins_400Regular', fontSize:12, color:INK3 },
  sheetSecondary:    { paddingVertical:13, borderRadius:14, borderWidth:1.5, borderColor:BORDER, alignItems:'center', backgroundColor:BG },
  sheetSecondaryTxt: { fontFamily:'Poppins_600SemiBold', fontSize:14, color:INK2 },

  // Form modal
  modalHdr:      { flexDirection:'row', alignItems:'center', justifyContent:'space-between', padding:16, borderBottomWidth:1, borderBottomColor:BORDER },
  modalCancel:   { fontFamily:'Poppins_500Medium', fontSize:15, color:INK2 },
  modalTitle:    { fontFamily:'Poppins_700Bold', fontSize:16, color:INK },
  modalSave:     { fontFamily:'Poppins_700Bold', fontSize:15, color:CAL },
  modalTabs:     { flexDirection:'row', paddingHorizontal:16, paddingTop:10, borderBottomWidth:1, borderBottomColor:BORDER },
  modalTab:      { flex:1, paddingVertical:10, alignItems:'center', borderBottomWidth:2, borderBottomColor:'transparent', marginBottom:-1 },
  modalTabOn:    { borderBottomColor:CAL },
  modalTabTxt:   { fontFamily:'Poppins_600SemiBold', fontSize:13, color:INK2 },
  modalTabTxtOn: { color:CAL },

  // Mini cal picker
  miniCalNav:      { flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:8 },
  miniCalArrBtn:   { padding:4 },
  miniCalArr:      { fontSize:20, color:INK2, fontFamily:'Poppins_400Regular' },
  miniCalLbl:      { fontFamily:'Poppins_700Bold', fontSize:14, color:INK },
  miniCalGrid:     { flexDirection:'row', flexWrap:'wrap' },
  miniCalHdr:      { width:`${100/7}%` as any, textAlign:'center', fontFamily:'Poppins_700Bold', fontSize:9, color:INK3, paddingVertical:4 },
  miniCalDay:      { width:`${100/7}%` as any, aspectRatio:1, alignItems:'center', justifyContent:'center' },
  miniCalDayInner: { width:32, height:32, borderRadius:16, alignItems:'center', justifyContent:'center' },
  miniCalDayTxt:   { fontFamily:'Poppins_500Medium', fontSize:13, color:INK },

  // Form fields
  gcBlock:         { marginHorizontal:16, marginTop:14, backgroundColor:'#fff', borderRadius:16, borderWidth:1.5, borderColor:BORDER, overflow:'hidden' },
  gcRow:           { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:16, paddingVertical:14 },
  gcRowLbl:        { fontFamily:'Poppins_500Medium', fontSize:15, color:INK },
  gcRowRight:      { flexDirection:'row', alignItems:'center' },
  gcRowRightTxt:   { fontFamily:'Poppins_500Medium', fontSize:15, color:INK2 },
  gcSep:           { height:1, backgroundColor:BORDER, marginLeft:16 },
  gcTitleInput:    { paddingHorizontal:16, paddingVertical:16, fontFamily:'Poppins_600SemiBold', fontSize:17, color:INK },
  gcSubInput:      { paddingHorizontal:16, paddingVertical:14, fontFamily:'Poppins_400Regular', fontSize:15, color:INK },
  gcPill:          { backgroundColor:BG, borderRadius:10, paddingHorizontal:12, paddingVertical:7, borderWidth:1.5, borderColor:BORDER },
  gcPillTxt:       { fontFamily:'Poppins_500Medium', fontSize:13, color:INK },
  gcToggle:        { width:44, height:26, borderRadius:13, backgroundColor:BORDER, justifyContent:'center', paddingHorizontal:2 },
  gcToggleOn:      { backgroundColor:CAL },
  gcToggleThumb:   { width:22, height:22, borderRadius:11, backgroundColor:'#fff', shadowColor:'#000', shadowOpacity:0.15, shadowRadius:2, shadowOffset:{ width:0, height:1 } },
  gcToggleThumbOn: { transform:[{ translateX:18 }] },

  // People picker
  memberRow:   { flexDirection:'row', alignItems:'center', gap:12, padding:14, backgroundColor:BG, borderRadius:14, borderWidth:1.5, borderColor:BORDER },
  memberDot:   { width:12, height:12, borderRadius:6, flexShrink:0 },
  memberName:  { fontFamily:'Poppins_500Medium', fontSize:15, color:INK, flex:1 },
  memberCheck: { width:24, height:24, borderRadius:7, borderWidth:2, borderColor:INK3, alignItems:'center', justifyContent:'center' },

  // Event detail modal
  detailRow:        { flexDirection:'row', alignItems:'flex-start', gap:12 },
  detailIcon:       { fontSize:18, width:26, textAlign:'center' as any, marginTop:1 },
  detailTxt:        { fontFamily:'Poppins_400Regular', fontSize:15, color:INK, flex:1, lineHeight:22 },
  deleteBtn:        { backgroundColor:'rgba(255,59,59,0.08)', borderRadius:14, paddingVertical:14, alignItems:'center', borderWidth:1.5, borderColor:'rgba(255,59,59,0.18)' },
  deleteBtnConfirm: { backgroundColor:'rgba(255,59,59,0.15)', borderColor:'rgba(255,59,59,0.4)' },
  deleteBtnTxt:     { fontFamily:'Poppins_600SemiBold', fontSize:14, color:'#FF3B3B' },
  editBtn:          { backgroundColor:`${CAL}10`, borderRadius:14, paddingVertical:14, alignItems:'center', borderWidth:1.5, borderColor:`${CAL}30` },
  editBtnTxt:       { fontFamily:'Poppins_600SemiBold', fontSize:14, color:CAL },
});
