/**
 * Calendar Screen — V8 (Time Grid)
 * app/(tabs)/calendar.tsx
 *
 * Design spec: zaeli-calendar-v4.html + zaeli-timegrid-v2.html
 * Accent: Electric Red Coral #E8374B
 * Grid: 48px per hour, starts at max(6am, now-2hrs)
 */

import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Line, Path, Polyline, Rect } from 'react-native-svg';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../lib/supabase';
import { HamburgerButton, NavMenu } from '../components/NavMenu';
import { callClaude } from '../../lib/api-logger';
import { getZaeliProvider } from '../../lib/zaeli-provider';

// ── Constants ─────────────────────────────────────────────────
const DUMMY_FAMILY_ID = '00000000-0000-0000-0000-000000000001';

// Module-level pending image — shared with index.tsx via import
// index.tsx reads this on focus to pick up scanned images
let _pendingCalendarImage: string | null = null;
export function getPendingCalendarImage(): string | null { return _pendingCalendarImage; }
export function setPendingCalendarImage(uri: string | null) { _pendingCalendarImage = uri; }
const HR_PX = 48; // pixels per hour in the time grid

const ACC   = '#E8374B'; // Electric Red Coral — calendar accent
const ACCL  = 'rgba(232,55,75,0.10)';

const C = {
  ink:    '#0A0A0A',
  ink2:   'rgba(0,0,0,0.50)',
  ink3:   'rgba(0,0,0,0.28)',
  border: 'rgba(0,0,0,0.07)',
  bg:     '#F7F7F7',
  card:   '#FFFFFF',
  red:    '#E53935',
  blue:   '#0057FF',
  yellow: '#FFE500',
};

const FAMILY_MEMBERS = [
  { id:'1', name:'Anna',  color:'#FF7B6B' },
  { id:'2', name:'Rich',  color:'#4D8BFF' },
  { id:'3', name:'Poppy', color:'#A855F7' },
  { id:'4', name:'Gab',   color:'#22C55E' },
  { id:'5', name:'Duke',  color:'#F59E0B' },
];

// Default assignees when assignees array is empty/null
function getEvAssignees(ev: any): any[] {
  if (!ev.assignees || ev.assignees.length === 0) return [];
  return (ev.assignees as string[])
    .map((id: string) => FAMILY_MEMBERS.find(m => m.id === id))
    .filter(Boolean) as any[];
}

const DAYS_SHORT  = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const DAYS_HDR    = ['M','T','W','T','F','S','S'];
const MONTHS      = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const REPEAT_OPTIONS = ['Never','Every day','Every week','Every fortnight','Every month','Every year'];
const ALERT_OPTIONS  = ['None','At time of event','5 min before','15 min before','30 min before','1 hour before','2 hours before','1 day before','1 week before'];
const HOURS   = Array.from({ length:12 }, (_, i) => i + 1);
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

// ── Helpers ───────────────────────────────────────────────────
function toLocalDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function sameDay(a: Date, b: Date) {
  return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
}
function addDays(date: Date, n: number) {
  const d = new Date(date); d.setDate(d.getDate() + n); return d;
}
function getDaysInMonth(y: number, m: number) { return new Date(y, m+1, 0).getDate(); }
function getFirstDayOfMonth(y: number, m: number) { return (new Date(y, m, 1).getDay()+6)%7; }

function fmtTime(iso: string): string {
  if (!iso) return '';
  const timePart = iso.includes('T') ? iso.split('T')[1] : iso.split(' ')[1] || '';
  if (!timePart) return '';
  const [hStr, mStr] = timePart.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  const ampm = h >= 12 ? 'pm' : 'am';
  const h12  = h === 0 ? 12 : h > 12 ? h-12 : h;
  return `${h12}:${String(m).padStart(2,'0')} ${ampm}`;
}

function getMemberColor(assignees?: string[]): string {
  if (!assignees || assignees.length === 0) return ACC;
  const m = FAMILY_MEMBERS.find(m => assignees.includes(m.id));
  return m?.color ?? ACC;
}

// Convert ISO time string to minutes-from-midnight
function isoToMinutes(iso: string): number {
  if (!iso) return 0;
  const timePart = iso.includes('T') ? iso.split('T')[1] : iso.split(' ')[1] || '';
  if (!timePart) return 0;
  const [h, m] = timePart.split(':').map(Number);
  return h * 60 + m;
}

// grid start hour = max(6am, now - 2hrs), clamped to 6am minimum
function getGridStartHour(): number {
  const now = new Date();
  const twoHrsAgo = now.getHours() - 2;
  return Math.max(6, twoHrsAgo);
}

// ── SVG Icons ─────────────────────────────────────────────────
function IcoMic({ color = 'rgba(10,10,10,0.32)' }: { color?: string }) {
  return <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><Rect x="9" y="2" width="6" height="11" rx="3"/><Path d="M5 10a7 7 0 0014 0"/><Line x1="12" y1="19" x2="12" y2="23"/><Line x1="8" y1="23" x2="16" y2="23"/></Svg>;
}
function IcoPlus() {
  return <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(0,0,0,0.4)" strokeWidth={2} strokeLinecap="round"><Line x1="12" y1="5" x2="12" y2="19"/><Line x1="5" y1="12" x2="19" y2="12"/></Svg>;
}
function IcoSend() {
  return <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><Line x1="12" y1="19" x2="12" y2="5"/><Polyline points="5 12 12 5 19 12"/></Svg>;
}

// ── SnapCol (time picker) ─────────────────────────────────────
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
    setTimeout(() => scrollRef.current?.scrollTo({ y: selIdx * ROW_H, animated: false }), 50);
  }, []);
  return (
    <View style={{ flex:1, height: ROW_H * 5, overflow:'hidden' }}>
      <View pointerEvents="none" style={{
        position:'absolute', top: ROW_H * 2, left:4, right:4, height: ROW_H,
        backgroundColor:'rgba(232,55,75,0.08)', borderRadius:12,
        borderTopWidth:1.5, borderBottomWidth:1.5, borderColor:'rgba(232,55,75,0.20)', zIndex:2,
      }}/>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ROW_H}
        decelerationRate="fast"
        contentContainerStyle={{ paddingVertical: ROW_H * 2 }}
        onMomentumScrollEnd={e => {
          const idx = Math.round(e.nativeEvent.contentOffset.y / ROW_H);
          onSelect(items[Math.max(0, Math.min(idx, items.length-1))]);
        }}
        onScrollEndDrag={e => {
          const idx = Math.round(e.nativeEvent.contentOffset.y / ROW_H);
          onSelect(items[Math.max(0, Math.min(idx, items.length-1))]);
        }}
      >
        {items.map((item, i) => {
          const isSel = item === selected;
          const label = fmtItem ? fmtItem(item) : (
            typeof item === 'number' ? String(item).padStart(2,'0') : String(item).toUpperCase()
          );
          return (
            <TouchableOpacity key={i}
              style={{ height: ROW_H, alignItems:'center', justifyContent:'center' }}
              onPress={() => { scrollRef.current?.scrollTo({ y: i * ROW_H, animated: true }); onSelect(item); }}
              activeOpacity={0.7}>
              <Text style={{
                fontFamily: isSel ? 'Poppins_700Bold' : 'Poppins_400Regular',
                fontSize: isSel ? 26 : 18, color: isSel ? C.ink : C.ink3,
              }}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

function TimePickerModal({ visible, hour, minute, ampm, onConfirm, onClose }: {
  visible: boolean; hour: number; minute: number; ampm: 'am'|'pm';
  onConfirm: (h:number, m:number, ap:'am'|'pm') => void; onClose: () => void;
}) {
  const [h, setH] = useState(hour);
  const [m, setM] = useState(minute);
  const [ap, setAp] = useState<'am'|'pm'>(ampm);
  useEffect(() => { if (visible) { setH(hour); setM(minute); setAp(ampm); } }, [visible]);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.45)', justifyContent:'center', alignItems:'center', padding:32 }}>
        <View style={{ backgroundColor:'#fff', borderRadius:24, width:'100%', padding:24,
          shadowColor:'#000', shadowOpacity:0.18, shadowRadius:24, shadowOffset:{ width:0, height:8 } }}>
          <Text style={{ fontFamily:'Poppins_700Bold', fontSize:16, color:C.ink, textAlign:'center', marginBottom:16 }}>Select time</Text>
          <View style={{ flexDirection:'row', alignItems:'center' }}>
            <SnapCol items={HOURS}       selected={h}  onSelect={v => setH(v as number)}/>
            <Text style={{ fontFamily:'Poppins_700Bold', fontSize:28, color:C.ink3, paddingHorizontal:4 }}>:</Text>
            <SnapCol items={MINUTES}     selected={m}  onSelect={v => setM(v as number)}/>
            <View style={{ width:1, backgroundColor:C.border, alignSelf:'stretch', marginHorizontal:8, marginVertical:8 }}/>
            <SnapCol items={['am','pm']} selected={ap} onSelect={v => setAp(v as 'am'|'pm')}/>
          </View>
          <View style={{ flexDirection:'row', gap:12, marginTop:20 }}>
            <TouchableOpacity style={{ flex:1, paddingVertical:14, borderRadius:14, borderWidth:1.5, borderColor:C.border, alignItems:'center' }}
              onPress={onClose} activeOpacity={0.8}>
              <Text style={{ fontFamily:'Poppins_600SemiBold', fontSize:15, color:C.ink2 }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ flex:1, paddingVertical:14, borderRadius:14, backgroundColor:ACC, alignItems:'center' }}
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
        <Text style={[s.gcPillTxt, open && { color: ACC }]}>{display}</Text>
      </TouchableOpacity>
      <TimePickerModal visible={open} hour={hour} minute={minute} ampm={ampm}
        onConfirm={(h,m,ap) => { onHour(h); onMinute(m); onAmpm(ap); }}
        onClose={() => setOpen(false)}/>
    </>
  );
}

function MiniCalPicker({ dateStr, onChange }: { dateStr: string; onChange: (s: string) => void }) {
  const [open, setOpen] = useState(false);
  const [navDate, setNavDate] = useState(() => new Date(dateStr + 'T12:00:00'));
  const firstDay = getFirstDayOfMonth(navDate.getFullYear(), navDate.getMonth());
  const dim      = getDaysInMonth(navDate.getFullYear(), navDate.getMonth());
  const prevDim  = getDaysInMonth(navDate.getFullYear(), navDate.getMonth()-1);
  const cells: { day:number; cur:boolean; date:Date }[] = [];
  for (let i=firstDay-1; i>=0; i--) cells.push({ day:prevDim-i, cur:false, date:new Date(navDate.getFullYear(), navDate.getMonth()-1, prevDim-i) });
  for (let d=1; d<=dim; d++) cells.push({ day:d, cur:true, date:new Date(navDate.getFullYear(), navDate.getMonth(), d) });
  while (cells.length%7!==0) { const n=cells.length-firstDay-dim+1; cells.push({ day:n, cur:false, date:new Date(navDate.getFullYear(), navDate.getMonth()+1, n) }); }
  const display = new Date(dateStr + 'T12:00:00').toLocaleDateString('en-AU', { day:'numeric', month:'short', year:'numeric' });
  return (
    <>
      <TouchableOpacity style={s.gcPill} onPress={() => setOpen(true)} activeOpacity={0.7}>
        <Text style={[s.gcPillTxt, open && { color: ACC }]}>{display}</Text>
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.45)', justifyContent:'center', alignItems:'center', padding:24 }}>
          <View style={{ backgroundColor:'#fff', borderRadius:20, width:'100%', padding:16,
            shadowColor:'#000', shadowOpacity:0.15, shadowRadius:20, shadowOffset:{ width:0, height:8 } }}>
            <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
              <TouchableOpacity style={{ padding:4 }} onPress={() => setNavDate(d => { const n=new Date(d); n.setMonth(n.getMonth()-1); return n; })}>
                <Text style={{ fontSize:20, color:C.ink2, fontFamily:'Poppins_400Regular' }}>‹</Text>
              </TouchableOpacity>
              <Text style={{ fontFamily:'Poppins_700Bold', fontSize:14, color:C.ink }}>{MONTHS[navDate.getMonth()]} {navDate.getFullYear()}</Text>
              <TouchableOpacity style={{ padding:4 }} onPress={() => setNavDate(d => { const n=new Date(d); n.setMonth(n.getMonth()+1); return n; })}>
                <Text style={{ fontSize:20, color:C.ink2, fontFamily:'Poppins_400Regular' }}>›</Text>
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection:'row', flexWrap:'wrap' }}>
              {DAYS_HDR.map((d,i) => <Text key={i} style={{ width:`${100/7}%` as any, textAlign:'center', fontFamily:'Poppins_700Bold', fontSize:9, color:C.ink3, paddingVertical:4 }}>{d}</Text>)}
              {cells.map((cell,i) => {
                const isSel = dateStr === toLocalDateStr(cell.date);
                const isToday = toLocalDateStr(cell.date) === toLocalDateStr(new Date());
                return (
                  <TouchableOpacity key={i} style={{ width:`${100/7}%` as any, aspectRatio:1, alignItems:'center', justifyContent:'center' }}
                    onPress={() => { onChange(toLocalDateStr(cell.date)); setOpen(false); }} activeOpacity={0.7}>
                    <View style={{ width:32, height:32, borderRadius:16, alignItems:'center', justifyContent:'center',
                      backgroundColor: isSel ? ACC : isToday && !isSel ? 'rgba(232,55,75,0.12)' : 'transparent' }}>
                      <Text style={{ fontFamily:'Poppins_500Medium', fontSize:13,
                        color: isSel ? '#fff' : isToday && !isSel ? ACC : !cell.cur ? C.ink3 : C.ink }}>{cell.day}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity onPress={() => setOpen(false)} style={{ alignItems:'center', paddingTop:12, paddingBottom:4 }}>
              <Text style={{ fontFamily:'Poppins_600SemiBold', fontSize:15, color:C.ink2 }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

function DropdownPicker({ options, value, onChange }: { options:string[]; value:string; onChange:(v:string)=>void }) {
  const [open, setOpen] = useState(false);
  return (
    <View>
      <TouchableOpacity style={s.gcRowRight} onPress={() => setOpen(true)} activeOpacity={0.7}>
        <Text style={s.gcRowRightTxt}>{value}</Text>
        <Text style={{ color:C.ink3, fontSize:14, marginLeft:4 }}>⌄</Text>
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
                  fontSize:16, color: opt===value ? ACC : C.ink }}>{opt}</Text>
                {opt === value && <Text style={{ color:ACC, fontSize:16, fontFamily:'Poppins_700Bold' }}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// ── Safe router navigation (avoids freeze when called from within Modal) ──
function safeNavigateHome(router: any, delay: number = 350) {
  setTimeout(() => {
    try { router.navigate('/(tabs)/'); } catch(e) { console.log('nav error', e); }
  }, delay);
}


// ── Calendar chat input — lets user type before going to Zaeli ──────────────
// Shared ref so send button can trigger submit from outside the input component
const calendarChatSubmitRef = { current: (() => {}) as () => void };

function CalendarChatBar({ router }: { router: any }) {
  const [text, setText] = useState('');
  const textRef = useRef('');

  const submit = () => {
    const msg = textRef.current.trim();
    if (!msg) return;
    textRef.current = '';
    setText('');
    router.navigate({ pathname:'/(tabs)/', params:{ seedMessage: msg } });
  };

  // Expose submit so the send button (outside this component) can call it
  calendarChatSubmitRef.current = submit;

  return (
    <TextInput
      style={{ flex:1, fontFamily:'Poppins_400Regular', fontSize:15, color:'#0A0A0A', paddingVertical:0 }}
      value={text}
      onChangeText={v => { setText(v); textRef.current = v; }}
      placeholder="Chat with Zaeli…"
      placeholderTextColor="rgba(10,10,10,0.35)"
      returnKeyType="send"
      onSubmitEditing={submit}
      blurOnSubmit={false}
    />
  );
}

// ── ADD EVENT FLOW ────────────────────────────────────────────
function AddEventFlow({ visible, onClose, onSaved, selectedDate, onScanPress }: {
  visible: boolean; onClose: () => void; onSaved: () => void; selectedDate: Date; onScanPress: () => void;
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
  const [assignees, setAssignees] = useState<string[]>(['2']); // default to Rich
  const [saving,    setSaving]    = useState(false);
  const [tab,       setTab]       = useState<'details'|'people'>('details');

  useEffect(() => {
    if (visible) {
      setStep('sheet'); setTitle(''); setLocation(''); setNotes(''); setAllDay(false);
      setStartDate(toLocalDateStr(selectedDate)); setEndDate(toLocalDateStr(selectedDate));
      setStartHour(9); setStartMin(0); setStartAmpm('am');
      setEndHour(10);  setEndMin(0);   setEndAmpm('am');
      setRepeat('Never'); setAlert('None'); setAssignees(['2']); setSaving(false); setTab('details');
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
      const startMs = new Date(startDate + 'T' + pad(sh24) + ':' + pad(startMin) + ':00').getTime();
      const endMs   = new Date(endDate   + 'T' + pad(eh24) + ':' + pad(endMin)   + ':00').getTime();
      const durMs   = endMs - startMs;

      const repeatDates: Date[] = [];
      const base = new Date(startDate + 'T12:00:00');
      const addDaysLocal = (d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate()+n); return r; };
      const addMonths    = (d: Date, n: number) => { const r = new Date(d); r.setMonth(r.getMonth()+n); return r; };
      if      (repeat==='Never')          repeatDates.push(base);
      else if (repeat==='Every day')      for(let i=0;i<60;i++) repeatDates.push(addDaysLocal(base,i));
      else if (repeat==='Every week')     for(let i=0;i<52;i++) repeatDates.push(addDaysLocal(base,i*7));
      else if (repeat==='Every fortnight')for(let i=0;i<26;i++) repeatDates.push(addDaysLocal(base,i*14));
      else if (repeat==='Every month')    for(let i=0;i<12;i++) repeatDates.push(addMonths(base,i));
      else if (repeat==='Every year')     for(let i=0;i<3;i++)  repeatDates.push(addMonths(base,i*12));

      const toStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
      const rows = repeatDates.map(d => {
        const dStr  = toStr(d);
        const sTime = allDay ? `${dStr}T00:00:00` : `${dStr}T${pad(sh24)}:${pad(startMin)}:00`;
        const eMs   = new Date(sTime).getTime() + (allDay ? 0 : durMs);
        const eDate = new Date(eMs);
        const eDStr = toStr(eDate);
        const eTime = allDay ? `${eDStr}T23:59:00` : `${eDStr}T${pad(eDate.getHours())}:${pad(eDate.getMinutes())}:00`;
        return {
          family_id: DUMMY_FAMILY_ID,
          title: title.trim(),
          notes: [notes.trim(), location.trim()].filter(Boolean).join(' | '),
          date: dStr, start_time: sTime, end_time: eTime,
          timezone: 'Australia/Brisbane',
          repeat_rule: repeat, alert_rule: alert, assignees,
        };
      });

      for (let i=0; i<rows.length; i+=20) {
        const batch = rows.slice(i, i+20);
        let { error } = await supabase.from('events').insert(batch);
        if (error && (error.message?.includes('assignees') || error.code==='42703')) {
          const slim = batch.map(({ assignees: _a, ...r }) => r);
          const r2 = await supabase.from('events').insert(slim);
          error = r2.error;
        }
        if (error) { setSaving(false); return; }
      }
      onSaved();
    } catch (e: any) {
      console.log('Save error:', e?.message);
      setSaving(false);
    }
  };

  const dateLabel = selectedDate.toLocaleDateString('en-AU', { weekday:'long', day:'numeric', month:'long' });
  const openZaeli = () => {
    const dateLabel = selectedDate.toLocaleDateString('en-AU', { weekday:'long', day:'numeric', month:'long' });
    onClose();
    setTimeout(() => {
      router.navigate({ pathname:'/(tabs)/', params:{ seedMessage: `I'd like to add a new event on ${dateLabel}. Can you help me add it to the calendar?` } });
    }, 300);
  };

  const openScanner = () => { onClose(); onScanPress(); };

  return (
    <>
      {/* Sheet — Step 1 */}
      <Modal visible={visible && step==='sheet'} transparent animationType="slide" onRequestClose={onClose}>
        <TouchableOpacity style={{ flex:1, backgroundColor:'rgba(0,0,0,0.4)' }} onPress={onClose} activeOpacity={1}/>
        <View style={{
          backgroundColor:'#fff', borderTopLeftRadius:24, borderTopRightRadius:24,
          paddingHorizontal:20, paddingTop:14,
          paddingBottom: Platform.OS==='ios' ? 40 : 24, gap:12,
        }}>
          {/* Handle */}
          <View style={{ width:36, height:4, borderRadius:2, backgroundColor:C.border, alignSelf:'center', marginBottom:4 }}/>
          {/* Header */}
          <View style={{ paddingBottom:12, borderBottomWidth:1, borderBottomColor:C.border }}>
            <Text style={{ fontFamily:'DMSerifDisplay_400Regular', fontSize:20, color:C.ink }}>Add an event</Text>
            <Text style={{ fontFamily:'Poppins_400Regular', fontSize:12, color:C.ink2, marginTop:2 }}>{dateLabel}</Text>
          </View>
          {/* Ask Zaeli CTA */}
          <TouchableOpacity style={s.sheetPrimary} onPress={openZaeli} activeOpacity={0.85}>
            <View style={s.sheetPrimaryIcon}><Text style={{ fontSize:18 }}>✦</Text></View>
            <View style={{ flex:1 }}>
              <Text style={s.sheetPrimaryTitle}>Ask Zaeli to add it</Text>
              <Text style={s.sheetPrimaryDesc}>Just tell her what it is — she'll handle the details</Text>
            </View>
            <Text style={s.sheetPrimaryArrow}>→</Text>
          </TouchableOpacity>
          {/* Photo scan option */}
          <TouchableOpacity style={s.sheetScan} onPress={openScanner} activeOpacity={0.85}>
            <View style={s.sheetScanIcon}><Text style={{ fontSize:20 }}>📷</Text></View>
            <View style={{ flex:1 }}>
              <Text style={s.sheetScanTitle}>Scan an invite or fixture</Text>
              <Text style={s.sheetScanDesc}>Birthday invite, sport schedule — Zaeli reads it</Text>
            </View>
            <Text style={{ fontSize:16, color:C.ink3 }}>→</Text>
          </TouchableOpacity>
          {/* Divider */}
          <View style={{ flexDirection:'row', alignItems:'center', gap:10 }}>
            <View style={{ flex:1, height:1, backgroundColor:C.border }}/>
            <Text style={{ fontFamily:'Poppins_400Regular', fontSize:12, color:C.ink3 }}>or</Text>
            <View style={{ flex:1, height:1, backgroundColor:C.border }}/>
          </View>
          {/* Manual */}
          <TouchableOpacity style={s.sheetManual} onPress={() => setStep('form')} activeOpacity={0.8}>
            <Text style={s.sheetManualTxt}>Fill in manually</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Form — Step 2 */}
      <Modal visible={visible && step==='form'} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
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
                  {/* Title + Location */}
                  <View style={s.gcBlock}>
                    <TextInput style={s.gcTitleInput} value={title} onChangeText={setTitle}
                      placeholder="Event title" placeholderTextColor={C.ink3} autoFocus/>
                    <View style={s.gcSep}/>
                    <View style={{ flexDirection:'row', alignItems:'center', paddingHorizontal:16, paddingVertical:14, gap:10 }}>
                      <Text style={{ fontSize:16, width:22, textAlign:'center' }}>📍</Text>
                      <TextInput style={[s.gcSubInput, { flex:1, paddingHorizontal:0, paddingVertical:0 }]}
                        value={location} onChangeText={setLocation}
                        placeholder="Location (optional)" placeholderTextColor={C.ink3}/>
                    </View>
                  </View>
                  {/* Dates + Times */}
                  <View style={s.gcBlock}>
                    <View style={s.gcRow}>
                      <Text style={s.gcRowLbl}>All day</Text>
                      <TouchableOpacity onPress={() => setAllDay(v => !v)} activeOpacity={0.8}>
                        <View style={[s.gcToggle, allDay && s.gcToggleOn]}>
                          <View style={[s.gcToggleThumb, allDay && s.gcToggleThumbOn]}/>
                        </View>
                      </TouchableOpacity>
                    </View>
                    <View style={s.gcSep}/>
                    <View style={s.gcRow}>
                      <Text style={s.gcRowLbl}>Starts</Text>
                      <View style={{ flexDirection:'row', gap:8, alignItems:'center' }}>
                        <MiniCalPicker dateStr={startDate} onChange={d => { setStartDate(d); if (d > endDate) setEndDate(d); }}/>
                        {!allDay && <TimePill hour={startHour} minute={startMin} ampm={startAmpm} onHour={setStartHour} onMinute={setStartMin} onAmpm={setStartAmpm}/>}
                      </View>
                    </View>
                    <View style={s.gcSep}/>
                    <View style={s.gcRow}>
                      <Text style={s.gcRowLbl}>Ends</Text>
                      <View style={{ flexDirection:'row', gap:8, alignItems:'center' }}>
                        <MiniCalPicker dateStr={endDate} onChange={d => { if (d >= startDate) setEndDate(d); }}/>
                        {!allDay && <TimePill hour={endHour} minute={endMin} ampm={endAmpm} onHour={setEndHour} onMinute={setEndMin} onAmpm={setEndAmpm}/>}
                      </View>
                    </View>
                  </View>
                  {/* Repeat + Alert */}
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
                  {/* Notes */}
                  <View style={s.gcBlock}>
                    <TextInput style={s.gcSubInput} value={notes} onChangeText={setNotes}
                      placeholder="Notes" placeholderTextColor={C.ink3}
                      multiline numberOfLines={3} textAlignVertical="top"/>
                  </View>
                </View>
              ) : (
                <View style={{ padding:20, gap:12 }}>
                  <Text style={{ fontFamily:'Poppins_400Regular', fontSize:13, color:C.ink2, lineHeight:20 }}>Who is this event for?</Text>
                  {FAMILY_MEMBERS.map(m => {
                    const on = assignees.includes(m.id);
                    return (
                      <TouchableOpacity key={m.id}
                        style={[s.memberRow, on && { borderColor:m.color+'40', backgroundColor:m.color+'08' }]}
                        onPress={() => toggleAssignee(m.id)} activeOpacity={0.8}>
                        <View style={[s.memberDot, { backgroundColor:m.color }]}/>
                        <Text style={s.memberName}>{m.name}</Text>
                        <View style={[s.memberCheck, on && { backgroundColor:m.color, borderColor:m.color }]}>
                          {on && <Text style={{ color:'#fff', fontSize:12, fontFamily:'Poppins_700Bold' }}>✓</Text>}
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
function EventDetailModal({ event, onClose, onDeleted, onReload }: {
  event: any | null; onClose: () => void; onDeleted: () => void; onReload: () => void;
}) {
  const router = useRouter();
  const [mode,          setMode]          = useState<'view'|'edit'>('view');
  const [deleting,      setDeleting]      = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving,        setSaving]        = useState(false);
  const [editTitle,     setEditTitle]     = useState('');
  const [editNotes,     setEditNotes]     = useState('');
  const [editRepeat,    setEditRepeat]    = useState('Never');
  const [editAlert,     setEditAlert]     = useState('None');
  const [editAssignees, setEditAssignees] = useState<string[]>([]);
  const [editStartH,    setEditStartH]    = useState(9);
  const [editStartM,    setEditStartM]    = useState(0);
  const [editStartAp,   setEditStartAp]   = useState<'am'|'pm'>('am');
  const [editEndH,      setEditEndH]      = useState(10);
  const [editEndM,      setEditEndM]      = useState(0);
  const [editEndAp,     setEditEndAp]     = useState<'am'|'pm'>('am');

  useEffect(() => {
    if (event) {
      setMode('view'); setDeleting(false); setConfirmDelete(false); setSaving(false);
      setEditTitle(event.title || '');
      setEditNotes(event.notes || '');
      setEditRepeat(event.repeat_rule || 'Never');
      setEditAlert(event.alert_rule || 'None');
      setEditAssignees(event.assignees || []);
      if (event.start_time) {
        const mins = isoToMinutes(event.start_time);
        const h24 = Math.floor(mins / 60); const m = mins % 60;
        const ap: 'am'|'pm' = h24 >= 12 ? 'pm' : 'am';
        const h12 = h24 === 0 ? 12 : h24 > 12 ? h24-12 : h24;
        setEditStartH(h12); setEditStartM(m); setEditStartAp(ap);
      }
      if (event.end_time) {
        const mins = isoToMinutes(event.end_time);
        const h24 = Math.floor(mins / 60); const m = mins % 60;
        const ap: 'am'|'pm' = h24 >= 12 ? 'pm' : 'am';
        const h12 = h24 === 0 ? 12 : h24 > 12 ? h24-12 : h24;
        setEditEndH(h12); setEditEndM(m); setEditEndAp(ap);
      }
    }
  }, [event?.id]);

  if (!event) return null;

  const toH24 = (h: number, ap: 'am'|'pm') =>
    ap === 'pm' ? (h===12 ? 12 : h+12) : (h===12 ? 0 : h);

  const handleSave = async () => {
    if (!editTitle.trim()) return;
    setSaving(true);
    try {
      const pad = (n: number) => String(n).padStart(2,'0');
      const sh24 = toH24(editStartH, editStartAp);
      const eh24 = toH24(editEndH, editEndAp);
      const dStr = event.date;
      const sTime = `${dStr}T${pad(sh24)}:${pad(editStartM)}:00`;
      const eTime = `${dStr}T${pad(eh24)}:${pad(editEndM)}:00`;
      const { error } = await supabase.from('events').update({
        title: editTitle.trim(), notes: editNotes.trim(),
        start_time: sTime, end_time: eTime,
        repeat_rule: editRepeat, alert_rule: editAlert, assignees: editAssignees,
      }).eq('id', event.id);
      if (!error) { onReload(); onClose(); } else setSaving(false);
    } catch(e) { console.log('Save error:', e); setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    try { await supabase.from('events').delete().eq('id', event.id); onDeleted(); }
    catch (e) { console.log('Delete error:', e); setDeleting(false); }
  };

  const toggleAssignee = (id: string) =>
    setEditAssignees(prev => prev.includes(id) ? prev.filter(x => x!==id) : [...prev, id]);

  const evCol = getMemberColor(event.assignees);
  const assignedMembers = getEvAssignees(event);

  return (
    <Modal visible={!!event} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex:1, backgroundColor:'#fff' }} edges={['top']}>
        <View style={s.modalHdr}>
          <TouchableOpacity onPress={onClose}>
            <Text style={s.modalCancel}>← Back</Text>
          </TouchableOpacity>
          <Text style={s.modalTitle}>{mode==='view' ? 'Event' : 'Edit Event'}</Text>
          {mode==='view'
            ? <TouchableOpacity onPress={() => setMode('edit')}><Text style={s.modalSave}>Edit</Text></TouchableOpacity>
            : <TouchableOpacity onPress={handleSave} disabled={saving || !editTitle.trim()}>
                <Text style={[s.modalSave, (saving||!editTitle.trim()) && { opacity:0.35 }]}>{saving ? 'Saving…' : 'Save'}</Text>
              </TouchableOpacity>
          }
        </View>

        {mode==='view' ? (
          <ScrollView contentContainerStyle={{ padding:20, gap:14 }} showsVerticalScrollIndicator={false}>
            <View style={{ flexDirection:'row', alignItems:'flex-start', gap:10 }}>
              <View style={{ width:10, height:10, borderRadius:5, backgroundColor:evCol, marginTop:10, flexShrink:0 }}/>
              <Text style={{ fontFamily:'DMSerifDisplay_400Regular', fontSize:26, color:C.ink, flex:1, lineHeight:34 }}>{event.title}</Text>
            </View>
            <View style={s.gcBlock}>
              {event.date && (
                <View style={s.detailRow}>
                  <Text style={s.detailIcon}>📅</Text>
                  <Text style={s.detailTxt}>{new Date(event.date+'T12:00:00').toLocaleDateString('en-AU', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}</Text>
                </View>
              )}
              {event.start_time && (<><View style={s.gcSep}/>
                <View style={s.detailRow}>
                  <Text style={s.detailIcon}>🕐</Text>
                  <Text style={s.detailTxt}>{fmtTime(event.start_time)}{event.end_time ? ` → ${fmtTime(event.end_time)}` : ''}</Text>
                </View></>
              )}
              {assignedMembers.length > 0 && (<><View style={s.gcSep}/>
                <View style={s.detailRow}>
                  <Text style={s.detailIcon}>👤</Text>
                  <View style={{ flexDirection:'row', flexWrap:'wrap', gap:8, flex:1 }}>
                    {assignedMembers.map((m: any) => (
                      <View key={m.id} style={{ flexDirection:'row', alignItems:'center', gap:5 }}>
                        <View style={{ width:24, height:24, borderRadius:12, backgroundColor:m.color, alignItems:'center', justifyContent:'center' }}>
                          <Text style={{ fontFamily:'Poppins_700Bold', fontSize:10, color:'#fff' }}>{m.name[0]}</Text>
                        </View>
                        <Text style={{ fontFamily:'Poppins_500Medium', fontSize:14, color:C.ink }}>{m.name}</Text>
                      </View>
                    ))}
                  </View>
                </View></>
              )}
              {event.repeat_rule && event.repeat_rule!=='Never' && (<><View style={s.gcSep}/>
                <View style={s.detailRow}>
                  <Text style={s.detailIcon}>🔁</Text>
                  <Text style={s.detailTxt}>{event.repeat_rule}</Text>
                </View></>
              )}
              {event.alert_rule && event.alert_rule!=='None' && (<><View style={s.gcSep}/>
                <View style={s.detailRow}>
                  <Text style={s.detailIcon}>🔔</Text>
                  <Text style={s.detailTxt}>{event.alert_rule}</Text>
                </View></>
              )}
              {event.notes ? (<><View style={s.gcSep}/>
                <View style={s.detailRow}>
                  <Text style={s.detailIcon}>📝</Text>
                  <Text style={s.detailTxt}>{event.notes}</Text>
                </View></>) : null}
            </View>
            <TouchableOpacity style={s.editBtn}
              onPress={() => { onClose(); safeNavigateHome(router); }} activeOpacity={0.8}>
              <Text style={{ fontSize:18, color:ACC }}>✦</Text>
              <View style={{ flex:1 }}>
                <Text style={{ fontFamily:'Poppins_700Bold', fontSize:14, color:C.ink }}>Edit with Zaeli</Text>
                <Text style={{ fontFamily:'Poppins_400Regular', fontSize:12, color:C.ink2, marginTop:2 }}>Tell Zaeli what to change — she'll handle it</Text>
              </View>
              <Text style={{ fontSize:16, color:ACC }}>→</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.deleteBtn, confirmDelete && s.deleteBtnConfirm]}
              onPress={handleDelete} disabled={deleting} activeOpacity={0.8}>
              <Text style={s.deleteBtnTxt}>{deleting ? 'Deleting...' : confirmDelete ? '⚠️ Confirm delete' : '🗑  Delete event'}</Text>
            </TouchableOpacity>
            {confirmDelete && (
              <TouchableOpacity onPress={() => setConfirmDelete(false)} style={{ alignItems:'center', paddingVertical:8 }}>
                <Text style={{ fontFamily:'Poppins_500Medium', fontSize:13, color:C.ink2 }}>Cancel</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        ) : (
          <KeyboardAvoidingView style={{ flex:1 }} behavior={Platform.OS==='ios' ? 'padding' : 'height'}>
            <ScrollView contentContainerStyle={{ paddingBottom:48 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={s.gcBlock}>
                <TextInput style={s.gcTitleInput} value={editTitle} onChangeText={setEditTitle}
                  placeholder="Event title" placeholderTextColor={C.ink3} autoFocus/>
              </View>
              <View style={s.gcBlock}>
                <TextInput style={[s.gcSubInput, { borderBottomWidth:1, borderBottomColor:C.border }]}
                  value={editNotes.split(' | ')[1] || ''}
                  onChangeText={loc => {
                    const note = editNotes.split(' | ')[0] || '';
                    setEditNotes(loc ? `${note} | ${loc}` : note);
                  }}
                  placeholder="Location (optional)" placeholderTextColor={C.ink3}/>
              </View>
              <View style={s.gcBlock}>
                <View style={s.gcRow}>
                  <Text style={s.gcRowLbl}>Date</Text>
                  <Text style={s.gcRowRightTxt}>{event.date ? new Date(event.date+'T12:00:00').toLocaleDateString('en-AU', { day:'numeric', month:'short', year:'numeric' }) : ''}</Text>
                </View>
                <View style={s.gcSep}/>
                <View style={s.gcRow}>
                  <Text style={s.gcRowLbl}>Starts</Text>
                  <TimePill hour={editStartH} minute={editStartM} ampm={editStartAp}
                    onHour={setEditStartH} onMinute={setEditStartM} onAmpm={setEditStartAp}/>
                </View>
                <View style={s.gcSep}/>
                <View style={s.gcRow}>
                  <Text style={s.gcRowLbl}>Ends</Text>
                  <TimePill hour={editEndH} minute={editEndM} ampm={editEndAp}
                    onHour={setEditEndH} onMinute={setEditEndM} onAmpm={setEditEndAp}/>
                </View>
              </View>
              <View style={s.gcBlock}>
                <View style={{ paddingHorizontal:14, paddingTop:10, paddingBottom:6 }}>
                  <Text style={{ fontFamily:'Poppins_700Bold', fontSize:11, color:C.ink3, textTransform:'uppercase', letterSpacing:0.8 }}>Who</Text>
                </View>
                <View style={{ flexDirection:'row', flexWrap:'wrap', gap:7, padding:12, paddingTop:4 }}>
                  {FAMILY_MEMBERS.map(m => {
                    const on = editAssignees.includes(m.id);
                    return (
                      <TouchableOpacity key={m.id}
                        style={{ flexDirection:'row', alignItems:'center', gap:6,
                          backgroundColor: on ? m.color+'14' : '#f7f7f7',
                          borderWidth:2, borderColor: on ? m.color : 'rgba(0,0,0,0.1)',
                          borderRadius:22, paddingVertical:6, paddingLeft:6, paddingRight:12 }}
                        onPress={() => toggleAssignee(m.id)} activeOpacity={0.8}>
                        <View style={{ width:22, height:22, borderRadius:11, backgroundColor:m.color, alignItems:'center', justifyContent:'center' }}>
                          <Text style={{ fontFamily:'Poppins_700Bold', fontSize:9, color:'#fff' }}>{m.name[0]}</Text>
                        </View>
                        <Text style={{ fontFamily:'Poppins_500Medium', fontSize:13, color:C.ink }}>{m.name}</Text>
                      </TouchableOpacity>
                    );
                  })}
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
                <TextInput style={s.gcSubInput} value={editNotes} onChangeText={setEditNotes}
                  placeholder="Notes" placeholderTextColor={C.ink3}
                  multiline numberOfLines={3} textAlignVertical="top"/>
              </View>
              <TouchableOpacity onPress={() => setMode('view')} style={{ alignItems:'center', paddingVertical:14 }}>
                <Text style={{ fontFamily:'Poppins_500Medium', fontSize:14, color:C.ink2 }}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        )}
      </SafeAreaView>
    </Modal>
  );
}


// ── callBrief ─────────────────────────────────────────────────
async function callBrief({ feature, system, userContent, maxTokens=200 }: {
  feature:string; system:string; userContent:string; maxTokens?:number;
}): Promise<string> {
  if (getZaeliProvider() === 'openai') {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method:'POST',
      headers:{ 'Content-Type':'application/json', 'Authorization':`Bearer ${process.env.EXPO_PUBLIC_OPENAI_API_KEY||''}` },
      body:JSON.stringify({ model:'gpt-4.1-mini', max_completion_tokens:maxTokens,
        messages:[{ role:'system', content:system }, { role:'user', content:userContent }] }),
    });
    const d = await res.json();
    try {
      const u = d.usage||{};
      const costUsd = ((u.prompt_tokens||0)/1000000)*0.75 + ((u.completion_tokens||0)/1000000)*4.50;
      supabase.from('api_logs').insert({ family_id:DUMMY_FAMILY_ID, feature, model:'gpt-4.1-mini',
        input_tokens:u.prompt_tokens||0, output_tokens:u.completion_tokens||0, cost_usd:costUsd });
    } catch {}
    return d.choices?.[0]?.message?.content || '';
  } else {
    const d = await callClaude({ feature, familyId:DUMMY_FAMILY_ID,
      body:{ model:'claude-haiku-4-5-20251001', max_tokens:maxTokens,
        system, messages:[{ role:'user', content:userContent }] } });
    return d.content?.[0]?.text || '';
  }
}

// ── TIME GRID COMPONENT ───────────────────────────────────────
function TimeGrid({
  events,
  selectedDate,
  onEventPress,
  onAddPress,
}: {
  events: any[];
  selectedDate: Date;
  onEventPress: (ev: any) => void;
  onAddPress: () => void;
}) {
  const now = new Date();
  const isToday = sameDay(selectedDate, now);

  // Grid start: max(6am, now-2hrs) for today; 6am for other days
  // Full day: always 0am-midnight, auto-scroll to now-2hrs
  const gridStartHour = 0;
  const gridEndHour   = 24;
  const totalHours    = 24;
  const gridHeight    = totalHours * HR_PX;
  const scrollToHour  = isToday ? Math.max(0, now.getHours() - 2) : 6;
  const gridScrollRef = useRef<ScrollView>(null);
  const gridScrolled  = useRef(false);
  const scrollGridToNow = () => {
    if (gridScrolled.current) return;
    gridScrolled.current = true;
    gridScrollRef.current?.scrollTo({ y: scrollToHour * HR_PX, animated: false });
  };
  // Now-line position
  const nowMinutes   = now.getHours() * 60 + now.getMinutes();
  const nowTopPx     = nowMinutes * (HR_PX / 60); // absolute from midnight
  const showNowLine  = isToday;

  // Hours to render
  const hours = Array.from({ length: totalHours + 1 }, (_, i) => gridStartHour + i);

  // Compute event layout (position + overlap)
  const positionedEvents = computeEventLayout(events, gridStartHour);

  function formatHour(h: number): string {
    if (h === 0)  return '12am';
    if (h === 12) return '12pm';
    if (h < 12)   return `${h}am`;
    return `${h-12}pm`;
  }

  return (
    <View style={{ flex:1, position:'relative' }}>
      <ScrollView ref={gridScrollRef} onLayout={scrollGridToNow} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom:110 }}>
        <TouchableOpacity
          activeOpacity={1}
          onLongPress={onAddPress}
          delayLongPress={500}
          style={{ height:gridHeight, position:'relative' }}
        >
          {/* Hour lines + labels */}
          {hours.map((h, i) => (
            <View key={h} style={{
              position:'absolute', top:i * HR_PX, left:0, right:0,
              flexDirection:'row', alignItems:'flex-start',
            }}>
              {/* Label */}
              <Text style={{
                width:40, textAlign:'right', paddingRight:8,
                fontFamily:'Poppins_700Bold', fontSize:13,
                color:'rgba(0,0,0,0.6)', marginTop:-8, lineHeight:16,
              }}>{formatHour(h)}</Text>
              {/* Hour line */}
              <View style={{ flex:1, height:1, backgroundColor:'rgba(0,0,0,0.07)', marginTop:0 }}/>
            </View>
          ))}
          {/* Half-hour dashed lines */}
          {hours.slice(0, -1).map((h, i) => (
            <View key={`half-${h}`} style={{
              position:'absolute', top: i * HR_PX + 24, left:40, right:0,
              height:1, borderTopWidth:1, borderColor:'rgba(0,0,0,0.04)',
              borderStyle:'dashed',
            }}/>
          ))}
          {/* Now line */}
          {showNowLine && (
            <View style={{ position:'absolute', top:nowTopPx, left:0, right:0, flexDirection:'row', alignItems:'center', zIndex:20 }}>
              <View style={{ width:40, alignItems:'flex-end', paddingRight:4 }}>
                <View style={{ width:8, height:8, borderRadius:4, backgroundColor:ACC }}/>
              </View>
              <View style={{ flex:1, height:2, backgroundColor:ACC }}/>
            </View>
          )}
          {/* Event blocks */}
          {positionedEvents.map(({ ev, topPx, heightPx, leftFrac, widthFrac, isCompact, clashWith }) => {
            const accent = getMemberColor(ev.assignees);
            const bgColor = accent + '14';
            const assignedMembers = (ev.assignees||[]).map((id: string) => FAMILY_MEMBERS.find(m => m.id===id)).filter(Boolean);
            return (
              <TouchableOpacity
                key={ev.id}
                style={{
                  position:'absolute',
                  top: topPx,
                  height: Math.max(heightPx, 12),
                  left: `${40 + leftFrac * (100-40)}%` as any,
                  width: `${widthFrac * (100-40)}%` as any,
                  backgroundColor: bgColor,
                  borderRadius:8,
                  padding: isCompact ? 0 : 5,
                  paddingLeft: isCompact ? 0 : 7,
                  overflow:'hidden',
                  marginHorizontal:2,
                  alignItems: isCompact ? 'center' : 'flex-start',
                  justifyContent: isCompact ? 'center' : 'flex-start',
                  zIndex: 10,
                }}
                activeOpacity={0.75}
                onPress={() => onEventPress(ev)}
              >
                {isCompact ? (
                  /* Compact: avatar only */
                  assignedMembers.slice(0,1).map((m: any) => (
                    <View key={m.id} style={{ width:20, height:20, borderRadius:10, backgroundColor:m.color, alignItems:'center', justifyContent:'center' }}>
                      <Text style={{ fontFamily:'Poppins_700Bold', fontSize:9, color:'#fff' }}>{m.name[0]}</Text>
                    </View>
                  ))
                ) : heightPx < 20 ? (
                  /* Tiny: inline row */
                  <View style={{ flexDirection:'row', alignItems:'center', gap:4, flex:1 }}>
                    {assignedMembers.slice(0,1).map((m: any) => (
                      <View key={m.id} style={{ width:10, height:10, borderRadius:5, backgroundColor:m.color }}/>
                    ))}
                    <Text style={{ fontFamily:'Poppins_600SemiBold', fontSize:11, color:C.ink, flex:1 }} numberOfLines={1}>{ev.title}</Text>
                  </View>
                ) : (
                  /* Full: title + time + avatars */
                  <>
                    <Text style={{ fontFamily:'Poppins_600SemiBold', fontSize:14, color:C.ink, lineHeight:19, marginBottom:2, textAlign:'left' }} numberOfLines={2}>{ev.title}</Text>
                    {heightPx >= 34 && (
                      <Text style={{ fontFamily:'Poppins_500Medium', fontSize:12, color:'rgba(0,0,0,0.55)', textAlign:'left' }}>
                        {fmtTime(ev.start_time)}{ev.end_time ? ` – ${fmtTime(ev.end_time)}` : ''}
                      </Text>
                    )}
                    {heightPx >= 52 && assignedMembers.length > 0 && (
                      <View style={{ flexDirection:'row', gap:2, marginTop:4 }}>
                        {assignedMembers.slice(0,3).map((m: any) => (
                          <View key={m.id} style={{ width:14, height:14, borderRadius:7, backgroundColor:m.color, alignItems:'center', justifyContent:'center' }}>
                            <Text style={{ fontFamily:'Poppins_700Bold', fontSize:6, color:'#fff' }}>{m.name[0]}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </>
                )}
              </TouchableOpacity>
            );
          })}
          {/* Conflict badges */}
          {positionedEvents.filter(p => p.clashWith !== null).map(({ ev, topPx, leftFrac }) => (
            <View key={`clash-${ev.id}`} style={{
              position:'absolute', top:topPx+2, left:`${40 + leftFrac * (100-40) - 1}%` as any,
              width:14, height:14, borderRadius:7, backgroundColor:C.red,
              alignItems:'center', justifyContent:'center', zIndex:30,
            }}>
              <Text style={{ fontFamily:'Poppins_700Bold', fontSize:8, color:'#fff' }}>!</Text>
            </View>
          ))}
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

// Layout algorithm for overlapping events
function computeEventLayout(events: any[], gridStartHour: number) {
  // Sort by start time
  const sorted = [...events].filter(e => e.start_time).sort((a, b) => {
    const am = isoToMinutes(a.start_time);
    const bm = isoToMinutes(b.start_time);
    return am - bm;
  });

  const result: {
    ev: any; topPx: number; heightPx: number;
    leftFrac: number; widthFrac: number;
    isCompact: boolean; clashWith: any;
  }[] = [];

  // Find overlapping groups
  const groups: any[][] = [];
  for (const ev of sorted) {
    const evStart = isoToMinutes(ev.start_time);
    const evEnd   = ev.end_time ? isoToMinutes(ev.end_time) : evStart + 60;
    let placed = false;
    for (const g of groups) {
      const gEnd = Math.max(...g.map(e => e.end_time ? isoToMinutes(e.end_time) : isoToMinutes(e.start_time) + 60));
      if (evStart < gEnd) { g.push(ev); placed = true; break; }
    }
    if (!placed) groups.push([ev]);
  }

  for (const group of groups) {
    const n = group.length;
    const isCompact = n >= 3;

    group.forEach((ev, idx) => {
      const startMin  = isoToMinutes(ev.start_time);
      const endMin    = ev.end_time ? isoToMinutes(ev.end_time) : startMin + 60;
      const topPx     = (startMin - gridStartHour * 60) * (HR_PX / 60);
      const heightPx  = Math.max((endMin - startMin) * (HR_PX / 60), 12);
      const colW      = 1 / n;
      const leftFrac  = idx * colW;
      const widthFrac = colW;

      // Find clash partner
      let clashWith = null;
      if (n >= 2) {
        clashWith = group.find((other, oi) => oi !== idx);
      }

      result.push({ ev, topPx, heightPx, leftFrac, widthFrac, isCompact, clashWith });
    });
  }

  return result;
}

// ── MAIN SCREEN ───────────────────────────────────────────────
export default function CalendarScreen() {
  const today  = new Date();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [view,          setView]          = useState<'day'|'month'>('day');
  const [selectedDate,  setSelectedDate]  = useState(new Date(today));
  const [calMonth,      setCalMonth]      = useState(today.getMonth());
  const [calYear,       setCalYear]       = useState(today.getFullYear());
  const [events,        setEvents]        = useState<any[]>([]);
  const [menuOpen,      setMenuOpen]      = useState(false);
  const [showSheet,     setShowSheet]     = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [showScanSheet, setShowScanSheet] = useState(false);
  const [keyboardOpen,  setKeyboardOpen]  = useState(false);

  const params = useLocalSearchParams<{ eventId?: string }>();
  const handledEventId = useRef<string | null>(null);

  // Strip — 180 days centred on today
  const STRIP_BEFORE = 60;
  const PILL_W       = 54; // 50px pill + 2px gap on each side = ~54px per slot
  const stripDays    = Array.from({ length:180 }, (_, i) => addDays(today, i - STRIP_BEFORE));
  const stripRef      = useRef<ScrollView>(null);
  const stripScrolled = useRef(false);

  const scrollStripToToday = () => {
    if (stripScrolled.current) return;
    stripScrolled.current = true;
    // PILL_W=54 (50px pill + 2px gap each side), minus half screen to centre today
    stripRef.current?.scrollTo({ x: Math.max(0, STRIP_BEFORE * PILL_W - 100), animated:false });
  };

  // Load events for the visible month
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

  useEffect(() => { loadEvents(); }, [loadEvents]);

  useFocusEffect(useCallback(() => { loadEvents(); }, [loadEvents]));

  // Keyboard listeners — same as index.tsx
  useEffect(() => {
    const show = Keyboard.addListener('keyboardWillShow', () => setKeyboardOpen(true));
    const hide = Keyboard.addListener('keyboardWillHide', () => setKeyboardOpen(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  useEffect(() => {
    setCalMonth(selectedDate.getMonth());
    setCalYear(selectedDate.getFullYear());
  }, [selectedDate]);

  // Handle deep-link to specific event
  useEffect(() => {
    const id = params.eventId;
    if (!id || id === handledEventId.current || events.length === 0) return;
    const found = events.find((e: any) => String(e.id) === String(id));
    if (found) { handledEventId.current = id; setSelectedEvent(found); }
  }, [params.eventId, events]);

  const selectedDateStr = toLocalDateStr(selectedDate);
  const todayStr        = toLocalDateStr(today);
  const dayEvents       = events.filter(e => (e.date||'') === selectedDateStr);
  const daysWithEvSet   = new Set(events.map(e => e.date||''));

  const scrollToToday = () => {
    setSelectedDate(new Date(today));
    stripRef.current?.scrollTo({ x: STRIP_BEFORE * PILL_W, animated:true });
  };

  // Month grid cells
  const buildMonthCells = () => {
    const dim=getDaysInMonth(calYear,calMonth), firstDay=getFirstDayOfMonth(calYear,calMonth), prevDim=getDaysInMonth(calYear,calMonth-1);
    const cells: { day:number; cur:boolean; date:Date }[] = [];
    for (let i=firstDay-1; i>=0; i--) cells.push({ day:prevDim-i, cur:false, date:new Date(calYear,calMonth-1,prevDim-i) });
    for (let d=1; d<=dim; d++) cells.push({ day:d, cur:true, date:new Date(calYear,calMonth,d) });
    while (cells.length%7!==0) { const n=cells.length-firstDay-dim+1; cells.push({ day:n, cur:false, date:new Date(calYear,calMonth+1,n) }); }
    return cells;
  };

  // Day events for month cell
  const getCellDots = (dateStr: string): string[] => {
    const cellEvs = events.filter(e => (e.date||'') === dateStr);
    const cols: string[] = [];
    cellEvs.forEach(ev => {
      const col = getMemberColor(ev.assignees);
      if (!cols.includes(col)) cols.push(col);
    });
    return cols.slice(0, 3);
  };

  const launchCamera = async () => {
    setShowScanSheet(false);
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') { alert('Camera permission needed'); return; }
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'] as any, quality: 0.8 });
      if (!result.canceled && result.assets?.[0]) {
        setPendingCalendarImage(result.assets[0].uri);
        router.navigate({ pathname:'/(tabs)/', params:{ calendarScan:'true' } });
      }
    } catch(e) { console.log('Camera error:', e); }
  };

  const launchLibrary = async () => {
    setShowScanSheet(false);
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') { alert('Photo library permission needed'); return; }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'] as any, quality: 0.8 });
      if (!result.canceled && result.assets?.[0]) {
        setPendingCalendarImage(result.assets[0].uri);
        router.navigate({ pathname:'/(tabs)/', params:{ calendarScan:'true' } });
      }
    } catch(e) { console.log('Library error:', e); }
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar style="light"/>

      {/* ── HERO BANNER ── */}
      <View style={s.hero}>
        <View style={s.heroOrb1}/>
        <View style={s.heroOrb2}/>
        <View style={s.heroOrb3}/>
        {/* Row: logo · Calendar (centred) · hamburger */}
        <View style={s.heroRow}>
          <TouchableOpacity style={s.logo} onPress={() => router.navigate('/(tabs)/')} activeOpacity={0.75}>
            <View style={s.logoBox}>
              <Svg width="14" height="14" viewBox="0 0 16 16" fill="white"><Path d="M8 1L9.5 6.5L15 8L9.5 9.5L8 15L6.5 9.5L1 8L6.5 6.5L8 1Z"/></Svg>
            </View>
            <Text style={s.logoWord}>z<Text style={{ color:C.yellow }}>a</Text>el<Text style={{ color:C.yellow }}>i</Text></Text>
          </TouchableOpacity>
          <Text style={s.heroTitle}>Calendar</Text>
          <HamburgerButton onPress={() => setMenuOpen(true)}/>
        </View>
        <NavMenu visible={menuOpen} onClose={() => setMenuOpen(false)}/>
        {/* Toggle: Day / Month only */}
        <View style={s.viewTog}>
          {(['day','month'] as const).map(v => (
            <TouchableOpacity key={v} style={[s.vt, view===v && s.vtOn]} onPress={() => setView(v)} activeOpacity={0.8}>
              <Text style={[s.vtTxt, view===v && s.vtTxtOn]}>{v==='day' ? 'Day' : 'Month'}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── DAY STRIP (day view only) ── */}
      {view === 'day' && (
        <View style={s.stripBar}>
          <ScrollView ref={stripRef} horizontal showsHorizontalScrollIndicator={false}
            onLayout={scrollStripToToday}
            contentContainerStyle={{ paddingHorizontal:8, paddingVertical:6, gap:2 }}>
            {stripDays.map((d, i) => {
              const isToday    = sameDay(d, today);
              const isSelected = sameDay(d, selectedDate);
              const key        = toLocalDateStr(d);
              const showMonth  = d.getDate() === 1;
              const dots       = getCellDots(key);
              return (
                <View key={i} style={{ alignItems:'center' }}>
                  {showMonth
                    ? <Text style={s.stripMonthLabel}>{MONTHS_SHORT[d.getMonth()]}</Text>
                    : <View style={{ height:13 }}/>
                  }
                  <TouchableOpacity
                    style={[s.dayPill, isToday && s.dayPillToday, isSelected && !isToday && s.dayPillSelected]}
                    onPress={() => setSelectedDate(new Date(d))} activeOpacity={0.8}>
                    <Text style={[s.dpDay, (isToday||isSelected) && { color:'#fff', opacity:1 }]}>
                      {DAYS_SHORT[(d.getDay()+6)%7]}
                    </Text>
                    <Text style={[s.dpNum, (isToday||isSelected) && { color:'#fff' }]}>{d.getDate()}</Text>
                    {/* Multi-colour family dots */}
                    <View style={{ flexDirection:'row', gap:2, height:5, alignItems:'center', justifyContent:'center' }}>
                      {dots.length > 0
                        ? dots.map((col, di) => (
                            <View key={di} style={{ width:4, height:4, borderRadius:2, backgroundColor:(isToday||isSelected) ? 'rgba(255,255,255,0.8)' : col }}/>
                          ))
                        : <View style={{ width:4, height:4 }}/>
                      }
                    </View>
                  </TouchableOpacity>
                </View>
              );
            })}
          </ScrollView>
          {!sameDay(selectedDate, today) && (
            <TouchableOpacity style={s.todayBtn} onPress={scrollToToday} activeOpacity={0.8}>
              <Text style={s.todayBtnTxt}>Today</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ── CONTENT AREA — KAV + relative wrapper matches index.tsx exactly ── */}
      <KeyboardAvoidingView
        style={{ flex:1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
      <View style={s.contentWrap}>
      <View style={s.content}>

        {/* ── DAY VIEW ── */}
        {view === 'day' && (
          <>
            {/* All-day / reminders lane */}
            <View style={s.alldayLane}>
              {/* Placeholder for all-day events — future: query events with all_day=true */}
              {dayEvents.filter(e => e.all_day).map(ev => {
                const col = getMemberColor(ev.assignees);
                return (
                  <View key={ev.id} style={[s.alldayPill, { backgroundColor:col }]}>
                    <View style={s.alldayAv}>
                      <Text style={{ fontFamily:'Poppins_700Bold', fontSize:7, color:'#fff' }}>
                        {(ev.assignees||[]).map((id: string) => FAMILY_MEMBERS.find(m => m.id===id)?.name[0]).filter(Boolean).join('')}
                      </Text>
                    </View>
                    <Text style={s.alldayTxt} numberOfLines={1}>{ev.title}</Text>
                  </View>
                );
              })}
            </View>
            {/* Time grid */}
            <TimeGrid
              events={dayEvents.filter(e => !e.all_day)}
              selectedDate={selectedDate}
              onEventPress={(ev) => setSelectedEvent(ev)}
              onAddPress={() => setShowSheet(true)}
            />
          </>
        )}

        {/* ── MONTH VIEW ── */}
        {view === 'month' && (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom:110 }}>
            {/* Month nav */}
            <View style={s.monthNav}>
              <TouchableOpacity style={s.monthArr} onPress={() => { if(calMonth===0){setCalMonth(11);setCalYear(y=>y-1);}else setCalMonth(m=>m-1); }}>
                <Text style={s.monthArrTxt}>‹</Text>
              </TouchableOpacity>
              <Text style={s.monthLbl}>{MONTHS[calMonth]} {calYear}</Text>
              <TouchableOpacity style={s.monthArr} onPress={() => { if(calMonth===11){setCalMonth(0);setCalYear(y=>y+1);}else setCalMonth(m=>m+1); }}>
                <Text style={s.monthArrTxt}>›</Text>
              </TouchableOpacity>
            </View>
            {/* Day headers: S M T W T F S */}
            <View style={s.calGrid}>
              {['S','M','T','W','T','F','S'].map((d,i) => (
                <View key={i} style={s.calCell}><Text style={s.calHdr}>{d}</Text></View>
              ))}
            </View>
            {/* Month cells */}
            <View style={s.calGrid}>
              {buildMonthCells().map((cell, i) => {
                const dateStr = toLocalDateStr(cell.date);
                const isToday = cell.cur && cell.day===today.getDate() && calMonth===today.getMonth() && calYear===today.getFullYear();
                const isSel   = dateStr === selectedDateStr && cell.cur;
                const dots    = cell.cur ? getCellDots(dateStr) : [];
                return (
                  <TouchableOpacity key={i} style={[s.calCell, { paddingBottom:4 }]}
                    onPress={() => { if (cell.cur) setSelectedDate(new Date(cell.date)); }} activeOpacity={0.7}>
                    <View style={[s.calDayInner, isToday && s.calDayToday, isSel && !isToday && s.calDaySel]}>
                      <Text style={[s.calDayTxt, !cell.cur && s.calDayOther, isToday && { color:'#fff', fontFamily:'Poppins_700Bold' }]}>
                        {cell.day}
                      </Text>
                    </View>
                    {/* Multi-colour dots */}
                    <View style={{ flexDirection:'row', gap:2, justifyContent:'center', marginTop:2, height:5 }}>
                      {dots.map((col, di) => (
                        <View key={di} style={{ width:4, height:4, borderRadius:2, backgroundColor: isToday ? 'rgba(255,255,255,0.85)' : col }}/>
                      ))}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
            {/* Family legend */}
            <View style={s.legend}>
              {FAMILY_MEMBERS.map(m => (
                <View key={m.id} style={{ flexDirection:'row', alignItems:'center', gap:4 }}>
                  <View style={{ width:10, height:10, borderRadius:5, backgroundColor:m.color }}/>
                  <Text style={{ fontFamily:'Poppins_500Medium', fontSize:12, color:C.ink2 }}>{m.name}</Text>
                </View>
              ))}
            </View>
            {/* Selected day preview — same tinted bubble style as day view */}
            {(() => {
              const sel = events.filter(e => (e.date||'') === selectedDateStr);
              const isToday = selectedDateStr === todayStr;
              const dateLabel = selectedDate.toLocaleDateString('en-AU', {
                weekday:'long', day:'numeric', month:'long'
              }).toUpperCase() + (isToday ? ' — TODAY' : '');
              return (
                <View style={s.csdCard}>
                  <Text style={s.csdTitle}>{dateLabel}</Text>
                  {sel.length === 0 ? (
                    <Text style={{ fontFamily:'Poppins_400Regular', fontSize:13, color:C.ink3, padding:14, paddingTop:4 }}>Nothing on — free day ✨</Text>
                  ) : sel.map((ev, i) => {
                    const evColor = getMemberColor(ev.assignees);
                    const assignedMembers = (ev.assignees||[]).map((id: string) => FAMILY_MEMBERS.find(m => m.id===id)).filter(Boolean);
                    return (
                      <TouchableOpacity key={ev.id}
                        style={[s.csdRow, i===sel.length-1 && { borderBottomWidth:0 }]}
                        onPress={() => setSelectedEvent(ev)} activeOpacity={0.7}>
                        {/* Tinted bubble — same as day view */}
                        <View style={{ flex:1, backgroundColor:evColor+'14', borderRadius:10, padding:10 }}>
                          <Text style={{ fontFamily:'Poppins_600SemiBold', fontSize:14, color:C.ink, marginBottom:3 }}>{ev.title}</Text>
                          <Text style={{ fontFamily:'Poppins_500Medium', fontSize:12, color:'rgba(0,0,0,0.5)' }}>{fmtTime(ev.start_time)}</Text>
                          {assignedMembers.length > 0 && (
                            <View style={{ flexDirection:'row', gap:3, marginTop:6 }}>
                              {assignedMembers.slice(0,3).map((m: any) => (
                                <View key={m.id} style={{ width:18, height:18, borderRadius:9, backgroundColor:m.color, alignItems:'center', justifyContent:'center' }}>
                                  <Text style={{ fontFamily:'Poppins_700Bold', fontSize:7, color:'#fff' }}>{m.name[0]}</Text>
                                </View>
                              ))}
                            </View>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              );
            })()}
            {/* Add event */}
            <TouchableOpacity style={s.addBtn} onPress={() => setShowSheet(true)} activeOpacity={0.7}>
              <Text style={{ fontSize:16, color:'rgba(232,55,75,0.4)' }}>+</Text>
              <Text style={s.addPlus}>Add event</Text>
            </TouchableOpacity>
          </ScrollView>
        )}

      </View>
      {/* inputArea is absolute inside contentWrap — same as index.tsx scrollWrap */}
      <View style={[s.inputArea, keyboardOpen && s.inputAreaKb]}>
        <View style={[s.barPill, { backgroundColor:'#fff', borderColor:'rgba(10,10,10,0.09)' }]}>
          <TouchableOpacity style={s.barBtn} onPress={() => setShowSheet(true)} activeOpacity={0.75}>
            <IcoPlus/>
          </TouchableOpacity>
          <View style={[s.barSep, { backgroundColor:'rgba(10,10,10,0.1)' }]}/>
          <CalendarChatBar router={router}/>
          <TouchableOpacity style={s.barBtn} onPress={() => {
            router.navigate({ pathname:'/(tabs)/', params:{ autoMic:'true' } });
          }} activeOpacity={0.75}>
            <IcoMic/>
          </TouchableOpacity>
          <TouchableOpacity style={s.barSend} onPress={() => {
            // If user has typed something, submit it. Otherwise go to home chat.
            if (calendarChatSubmitRef.current) {
              calendarChatSubmitRef.current();
            } else {
              router.navigate({ pathname:'/(tabs)/' });
            }
          }} activeOpacity={0.85}>
            <IcoSend/>
          </TouchableOpacity>
        </View>
      </View>

      </View>
      </KeyboardAvoidingView>

      {/* ── MODALS ── */}
      <EventDetailModal
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        onDeleted={() => { setSelectedEvent(null); loadEvents(); }}
        onReload={() => loadEvents()}
      />
      <AddEventFlow
        visible={showSheet}
        onClose={() => setShowSheet(false)}
        onSaved={() => { setShowSheet(false); loadEvents(); }}
        selectedDate={selectedDate}
        onScanPress={() => { setShowSheet(false); setTimeout(() => setShowScanSheet(true), 300); }}
      />

      {/* Scan sheet — at screen level so it's not inside another modal */}
      <Modal visible={showScanSheet} transparent animationType="fade" onRequestClose={() => setShowScanSheet(false)}>
        <TouchableOpacity style={{ flex:1, backgroundColor:'rgba(0,0,0,0.5)', justifyContent:'flex-end' }}
          onPress={() => setShowScanSheet(false)} activeOpacity={1}>
          <View style={{ backgroundColor:'#fff', borderTopLeftRadius:24, borderTopRightRadius:24, padding:20, paddingBottom: Platform.OS==='ios' ? 44 : 24 }}>
            <View style={{ width:36, height:4, borderRadius:2, backgroundColor:'rgba(0,0,0,0.12)', alignSelf:'center', marginBottom:18 }}/>
            <Text style={{ fontFamily:'Poppins_700Bold', fontSize:17, color:'#0A0A0A', marginBottom:16, textAlign:'center' }}>Scan an invite or fixture</Text>
            <TouchableOpacity
              style={{ flexDirection:'row', alignItems:'center', gap:14, padding:16, backgroundColor:'#f7f7f7', borderRadius:14, marginBottom:10 }}
              onPress={launchCamera} activeOpacity={0.8}>
              <Text style={{ fontSize:26 }}>📷</Text>
              <View style={{ flex:1 }}>
                <Text style={{ fontFamily:'Poppins_600SemiBold', fontSize:15, color:'#0A0A0A' }}>Take a photo</Text>
                <Text style={{ fontFamily:'Poppins_400Regular', fontSize:12, color:'rgba(0,0,0,0.5)', marginTop:2 }}>Open camera and photograph the invite</Text>
              </View>
              <Text style={{ fontSize:16, color:'rgba(0,0,0,0.3)' }}>›</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ flexDirection:'row', alignItems:'center', gap:14, padding:16, backgroundColor:'#f7f7f7', borderRadius:14 }}
              onPress={launchLibrary} activeOpacity={0.8}>
              <Text style={{ fontSize:26 }}>🖼️</Text>
              <View style={{ flex:1 }}>
                <Text style={{ fontFamily:'Poppins_600SemiBold', fontSize:15, color:'#0A0A0A' }}>Choose from library</Text>
                <Text style={{ fontFamily:'Poppins_400Regular', fontSize:12, color:'rgba(0,0,0,0.5)', marginTop:2 }}>Upload a photo already on your phone</Text>
              </View>
              <Text style={{ fontSize:16, color:'rgba(0,0,0,0.3)' }}>›</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

// ── STYLES ────────────────────────────────────────────────────
const CELL_SIZE = 42;

const s = StyleSheet.create({
  safe:    { flex:1, backgroundColor:ACC },
  content: { flex:1, backgroundColor:C.bg },

  // Hero
  hero:     { backgroundColor:ACC, paddingHorizontal:18, paddingTop:10, paddingBottom:14, flexShrink:0, position:'relative', overflow:'hidden' },
  heroOrb1: { position:'absolute', width:240, height:240, borderRadius:120, top:-80, right:-55, backgroundColor:'rgba(255,255,255,0.07)' },
  heroOrb2: { position:'absolute', width:130, height:130, borderRadius:65, top:-15, right:35, backgroundColor:'rgba(255,255,255,0.05)' },
  heroOrb3: { position:'absolute', width:90, height:90, borderRadius:45, bottom:-25, left:-18, backgroundColor:'rgba(255,255,255,0.04)' },
  heroRow:  { flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:8, position:'relative', zIndex:1 },

  // Logo
  logo:    { flexDirection:'row', alignItems:'center', gap:8, position:'relative', zIndex:1 },
  logoBox: { width:32, height:32, backgroundColor:'rgba(255,255,255,0.2)', borderRadius:9, alignItems:'center', justifyContent:'center' },
  logoWord:{ fontFamily:'DMSerifDisplay_400Regular', fontSize:22, color:'#fff', letterSpacing:-0.4 },

  // Centred title
  heroTitle: { fontFamily:'DMSerifDisplay_400Regular', fontSize:28, color:'#fff', letterSpacing:-0.5, position:'absolute', left:0, right:0, textAlign:'center', zIndex:0 },

  // Toggle
  viewTog: { flexDirection:'row', alignSelf:'center', backgroundColor:'rgba(255,255,255,0.15)', borderRadius:11, padding:3, gap:2, position:'relative', zIndex:1, marginTop:2 },
  vt:      { paddingVertical:9, paddingHorizontal:28, borderRadius:9, alignItems:'center' },
  vtOn:    { backgroundColor:'#fff' },
  vtTxt:   { fontFamily:'Poppins_600SemiBold', fontSize:14, color:'rgba(255,255,255,0.5)' },
  vtTxtOn: { color:C.ink },

  // Day strip
  stripBar:        { backgroundColor:'#fff', borderBottomWidth:1, borderBottomColor:C.border, flexShrink:0 },
  stripMonthLabel: { fontFamily:'Poppins_700Bold', fontSize:8, color:ACC, textTransform:'uppercase', letterSpacing:1, textAlign:'center', height:13, paddingTop:1 },
  dayPill:         { width:52, alignItems:'center', gap:1, paddingVertical:8, borderRadius:13 },
  dayPillToday:    { backgroundColor:ACC },
  dayPillSelected: { backgroundColor:'rgba(232,55,75,0.12)' },
  dpDay:           { fontFamily:'Poppins_700Bold', fontSize:10, textTransform:'uppercase', letterSpacing:0.3, color:C.ink3 },
  dpNum:           { fontFamily:'Poppins_800ExtraBold', fontSize:20, color:C.ink, lineHeight:24 },
  todayBtn:        { alignSelf:'center', marginBottom:5, paddingHorizontal:14, paddingVertical:4, backgroundColor:ACC, borderRadius:20 },
  todayBtnTxt:     { fontFamily:'Poppins_600SemiBold', fontSize:10, color:'#fff' },

  // All-day lane
  alldayLane: { backgroundColor:'#fafafa', borderBottomWidth:1, borderBottomColor:'rgba(0,0,0,0.08)', paddingLeft:46, paddingRight:8, paddingVertical:5, flexShrink:0, minHeight:0 },
  alldayPill: { flexDirection:'row', alignItems:'center', gap:5, borderRadius:5, paddingHorizontal:8, paddingVertical:3, marginBottom:3 },
  alldayAv:   { width:14, height:14, borderRadius:7, backgroundColor:'rgba(255,255,255,0.3)', alignItems:'center', justifyContent:'center' },
  alldayTxt:  { fontFamily:'Poppins_600SemiBold', fontSize:10, color:'#fff', flex:1 },

  // Month view
  monthNav:    { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:18, paddingTop:14, paddingBottom:8 },
  monthArr:    { width:30, height:30, borderRadius:9, backgroundColor:'rgba(0,0,0,0.06)', alignItems:'center', justifyContent:'center' },
  monthArrTxt: { fontSize:18, color:C.ink2, fontFamily:'Poppins_400Regular' },
  monthLbl:    { fontFamily:'DMSerifDisplay_400Regular', fontSize:22, color:C.ink, letterSpacing:-0.3 },
  calGrid:     { flexDirection:'row', flexWrap:'wrap', paddingHorizontal:10 },
  calCell:     { width:`${100/7}%` as any, alignItems:'center', justifyContent:'center' },
  calHdr:      { fontFamily:'Poppins_700Bold', fontSize:9, textTransform:'uppercase', color:C.ink3, paddingBottom:5 },
  calDayInner: { width:CELL_SIZE, height:CELL_SIZE, borderRadius:CELL_SIZE/2, alignItems:'center', justifyContent:'center' },
  calDayToday: { backgroundColor:ACC },
  calDaySel:   { backgroundColor:'rgba(232,55,75,0.12)' },
  calDayTxt:   { fontFamily:'Poppins_500Medium', fontSize:18, color:C.ink },
  calDayOther: { color:C.ink3, fontFamily:'Poppins_400Regular' },

  // Legend
  legend: { flexDirection:'row', flexWrap:'wrap', justifyContent:'space-around', paddingHorizontal:10, paddingTop:12, paddingBottom:10, borderTopWidth:1, borderTopColor:C.border },

  // Month day preview
  csdCard:  { marginHorizontal:14, marginTop:8, backgroundColor:C.card, borderRadius:16, borderWidth:1, borderColor:C.border, overflow:'hidden', marginBottom:10 },
  csdTitle: { fontFamily:'Poppins_700Bold', fontSize:9, color:C.ink3, letterSpacing:0.8, padding:12, paddingBottom:6, textTransform:'uppercase' as const },
  csdRow:   { paddingHorizontal:12, paddingVertical:5, borderBottomWidth:1, borderBottomColor:C.border },

  // Add event button
  addBtn:  { flexDirection:'row', alignItems:'center', justifyContent:'center', gap:8, marginHorizontal:18, marginTop:8, marginBottom:16, backgroundColor:C.card, borderRadius:14, padding:16, borderWidth:2, borderColor:'rgba(232,55,75,0.2)', borderStyle:'dashed' },
  addPlus: { fontFamily:'Poppins_500Medium', fontSize:14, color:'rgba(0,0,0,0.4)' },

  contentWrap: { flex:1, position:'relative' },
  inputArea:   { position:'absolute', bottom:0, left:0, right:0, paddingHorizontal:14, paddingBottom: Platform.OS==='ios' ? 30 : 18, paddingTop:10, backgroundColor:'transparent' },
  inputAreaKb: { paddingBottom: Platform.OS==='ios' ? 8 : 6 },

  barPill:   { flexDirection:'row', alignItems:'center', gap:8, borderRadius:30, paddingVertical:14, paddingHorizontal:16, borderWidth:1, shadowColor:'#000', shadowOpacity:0.07, shadowRadius:16, shadowOffset:{ width:0, height:-2 }, elevation:4 },
  barBtn:    { width:34, height:34, alignItems:'center', justifyContent:'center' },
  barSep:    { width:1, height:18, flexShrink:0 },
  barSend:   { width:32, height:32, borderRadius:16, backgroundColor:'#FF4545', alignItems:'center', justifyContent:'center', flexShrink:0 },

  // Add event sheet
  sheetPrimary:      { flexDirection:'row', alignItems:'center', gap:14, backgroundColor:'rgba(232,55,75,0.07)', borderWidth:1.5, borderColor:'rgba(232,55,75,0.22)', borderRadius:16, padding:14 },
  sheetPrimaryIcon:  { width:42, height:42, borderRadius:13, backgroundColor:ACC, alignItems:'center', justifyContent:'center', flexShrink:0 },
  sheetPrimaryTitle: { fontFamily:'Poppins_700Bold', fontSize:14, color:C.ink, marginBottom:2 },
  sheetPrimaryDesc:  { fontFamily:'Poppins_400Regular', fontSize:12, color:C.ink2, lineHeight:18 },
  sheetPrimaryArrow: { fontFamily:'Poppins_700Bold', fontSize:16, color:ACC, flexShrink:0 },
  sheetScan:         { flexDirection:'row', alignItems:'center', gap:14, backgroundColor:'rgba(0,0,0,0.04)', borderWidth:1.5, borderColor:'rgba(0,0,0,0.1)', borderRadius:16, padding:14 },
  sheetScanIcon:     { width:42, height:42, borderRadius:13, backgroundColor:'rgba(0,0,0,0.07)', alignItems:'center', justifyContent:'center', flexShrink:0 },
  sheetScanTitle:    { fontFamily:'Poppins_600SemiBold', fontSize:14, color:C.ink, marginBottom:2 },
  sheetScanDesc:     { fontFamily:'Poppins_400Regular', fontSize:12, color:C.ink2, lineHeight:18 },
  sheetManual:       { paddingVertical:14, borderRadius:14, borderWidth:1.5, borderColor:C.border, alignItems:'center', backgroundColor:C.bg },
  sheetManualTxt:    { fontFamily:'Poppins_600SemiBold', fontSize:14, color:C.ink2 },

  // Modal shared
  modalHdr:      { flexDirection:'row', alignItems:'center', justifyContent:'space-between', padding:16, borderBottomWidth:1, borderBottomColor:C.border },
  modalCancel:   { fontFamily:'Poppins_500Medium', fontSize:15, color:C.ink2 },
  modalTitle:    { fontFamily:'Poppins_700Bold', fontSize:16, color:C.ink },
  modalSave:     { fontFamily:'Poppins_700Bold', fontSize:15, color:ACC },
  modalTabs:     { flexDirection:'row', paddingHorizontal:16, paddingTop:10, borderBottomWidth:1, borderBottomColor:C.border },
  modalTab:      { flex:1, paddingVertical:10, alignItems:'center', borderBottomWidth:2, borderBottomColor:'transparent', marginBottom:-1 },
  modalTabOn:    { borderBottomColor:ACC },
  modalTabTxt:   { fontFamily:'Poppins_600SemiBold', fontSize:13, color:C.ink2 },
  modalTabTxtOn: { color:ACC },

  // Form blocks
  gcBlock:         { marginHorizontal:16, marginTop:14, backgroundColor:'#fff', borderRadius:16, borderWidth:1.5, borderColor:C.border, overflow:'hidden' },
  gcRow:           { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:16, paddingVertical:14 },
  gcRowLbl:        { fontFamily:'Poppins_500Medium', fontSize:15, color:C.ink },
  gcRowRight:      { flexDirection:'row', alignItems:'center' },
  gcRowRightTxt:   { fontFamily:'Poppins_500Medium', fontSize:15, color:C.ink2 },
  gcSep:           { height:1, backgroundColor:C.border, marginLeft:16 },
  gcTitleInput:    { paddingHorizontal:16, paddingVertical:16, fontFamily:'Poppins_600SemiBold', fontSize:17, color:C.ink },
  gcSubInput:      { paddingHorizontal:16, paddingVertical:14, fontFamily:'Poppins_400Regular', fontSize:15, color:C.ink },
  gcPill:          { backgroundColor:C.bg, borderRadius:10, paddingHorizontal:12, paddingVertical:7, borderWidth:1.5, borderColor:C.border },
  gcPillTxt:       { fontFamily:'Poppins_500Medium', fontSize:13, color:C.ink },
  gcToggle:        { width:44, height:26, borderRadius:13, backgroundColor:C.border, justifyContent:'center', paddingHorizontal:2 },
  gcToggleOn:      { backgroundColor:ACC },
  gcToggleThumb:   { width:22, height:22, borderRadius:11, backgroundColor:'#fff', shadowColor:'#000', shadowOpacity:0.15, shadowRadius:2, shadowOffset:{ width:0, height:1 } },
  gcToggleThumbOn: { transform:[{ translateX:18 }] },

  // People selector
  memberRow:   { flexDirection:'row', alignItems:'center', gap:12, padding:14, backgroundColor:C.bg, borderRadius:14, borderWidth:1.5, borderColor:C.border },
  memberDot:   { width:12, height:12, borderRadius:6, flexShrink:0 },
  memberName:  { fontFamily:'Poppins_500Medium', fontSize:15, color:C.ink, flex:1 },
  memberCheck: { width:24, height:24, borderRadius:7, borderWidth:2, borderColor:C.ink3, alignItems:'center', justifyContent:'center' },

  // Event detail
  detailRow:  { flexDirection:'row', alignItems:'flex-start', gap:12, paddingHorizontal:16, paddingVertical:14 },
  detailIcon: { fontSize:18, width:26, textAlign:'center' as any, marginTop:1 },
  detailTxt:  { fontFamily:'Poppins_400Regular', fontSize:15, color:C.ink, flex:1, lineHeight:22 },
  editBtn:    { flexDirection:'row', alignItems:'center', gap:14, backgroundColor:'rgba(232,55,75,0.07)', borderWidth:1.5, borderColor:'rgba(232,55,75,0.2)', borderRadius:16, padding:16 },
  deleteBtn:        { backgroundColor:'rgba(255,59,59,0.08)', borderRadius:14, paddingVertical:14, alignItems:'center', borderWidth:1.5, borderColor:'rgba(255,59,59,0.18)' },
  deleteBtnConfirm: { backgroundColor:'rgba(255,59,59,0.15)', borderColor:'rgba(255,59,59,0.4)' },
  deleteBtnTxt:     { fontFamily:'Poppins_600SemiBold', fontSize:14, color:'#FF3B3B' },
});
