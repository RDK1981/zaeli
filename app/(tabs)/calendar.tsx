/**
 * calendar.tsx — Calendar Channel
 * Channel colour: #B8EDD0 mint bg · #F0C8C0 blush ai colour
 * ACC (#E8374B) used for now-line, today pill, form accents only
 * Self-contained Zaeli tool-calling — no navigation to index.tsx
 */

import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated, Easing, Keyboard, KeyboardAvoidingView, Modal,
  Platform, ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, View, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Line, Path, Polyline, Rect } from 'react-native-svg';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '../../lib/supabase';

// ── Constants ─────────────────────────────────────────────────
const DUMMY_FAMILY_ID = '00000000-0000-0000-0000-000000000001';
const CAL_BG  = '#B8EDD0';   // Calendar banner/day-strip bg
const CAL_AI  = '#F0C8C0';   // Blush — ai letters, send button, eyebrow
const ACC     = '#E8374B';   // Red — now-line, today pill, form accents
const INK     = '#0A0A0A';
const INK2    = 'rgba(0,0,0,0.50)';
const INK3    = 'rgba(0,0,0,0.28)';
const HR_PX   = 48;

// Module-level pending image — kept for compatibility if index.tsx ever needs it
let _pendingCalendarImage: string | null = null;
export function getPendingCalendarImage(): string | null { return _pendingCalendarImage; }
export function setPendingCalendarImage(uri: string | null) { _pendingCalendarImage = uri; }

const FAMILY_MEMBERS = [
  { id:'1', name:'Anna',  color:'#FF7B6B' },
  { id:'2', name:'Rich',  color:'#4D8BFF' },
  { id:'3', name:'Poppy', color:'#A855F7' },
  { id:'4', name:'Gab',   color:'#22C55E' },
  { id:'5', name:'Duke',  color:'#F59E0B' },
];

const DAYS_SHORT   = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const MONTHS       = ['January','February','March','April','May','June','July','August','September','October','November','December'];
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
function uid() { return `${Date.now()}-${Math.random().toString(36).slice(2)}`; }
function nowTs() { return new Date().toLocaleTimeString('en-AU', { hour:'2-digit', minute:'2-digit' }); }

function fmtTime(iso: string): string {
  if (!iso) return '';
  const timePart = iso.includes('T') ? iso.split('T')[1] : iso.split(' ')[1] || '';
  if (!timePart) return '';
  const [hStr, mStr] = timePart.split(':');
  const h = parseInt(hStr, 10); const m = parseInt(mStr, 10);
  const ampm = h >= 12 ? 'pm' : 'am';
  const h12  = h === 0 ? 12 : h > 12 ? h-12 : h;
  return `${h12}:${String(m).padStart(2,'0')} ${ampm}`;
}

function getMemberColor(assignees?: string[]): string {
  if (!assignees || assignees.length === 0) return ACC;
  const m = FAMILY_MEMBERS.find(m => assignees.includes(m.id));
  return m?.color ?? ACC;
}

function isoToMinutes(iso: string): number {
  if (!iso) return 0;
  const timePart = iso.includes('T') ? iso.split('T')[1] : iso.split(' ')[1] || '';
  if (!timePart) return 0;
  const [h, m] = timePart.split(':').map(Number);
  return h * 60 + m;
}

function getEvAssignees(ev: any): any[] {
  if (!ev.assignees || ev.assignees.length === 0) return [];
  return (ev.assignees as string[])
    .map((id: string) => FAMILY_MEMBERS.find(m => m.id === id))
    .filter(Boolean) as any[];
}

// ── Icons ─────────────────────────────────────────────────────
function IcoMic({ color = INK3, size = 20 }: { color?: string; size?: number }) {
  return <Svg width={size} height={size} viewBox="0 0 24 26" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><Rect x="9" y="2" width="6" height="11" rx="3"/><Path d="M5 10a7 7 0 0014 0"/><Line x1="12" y1="19" x2="12" y2="23"/><Line x1="8" y1="23" x2="16" y2="23"/></Svg>;
}
function IcoPlus() {
  return <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(0,0,0,0.4)" strokeWidth={2} strokeLinecap="round"><Line x1="12" y1="5" x2="12" y2="19"/><Line x1="5" y1="12" x2="19" y2="12"/></Svg>;
}
function IcoSend() {
  return <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={INK} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><Line x1="12" y1="19" x2="12" y2="5"/><Polyline points="5 12 12 5 19 12"/></Svg>;
}
function IcoClose() {
  return <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={INK} strokeWidth="2.2" strokeLinecap="round"><Line x1="18" y1="6" x2="6" y2="18"/><Line x1="6" y1="6" x2="18" y2="18"/></Svg>;
}
function IcoX() {
  return <Svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><Line x1="18" y1="6" x2="6" y2="18"/><Line x1="6" y1="6" x2="18" y2="18"/></Svg>;
}

// ── Typing dots ────────────────────────────────────────────────
function TypingDots({ color = CAL_AI }: { color?: string }) {
  const dots = useRef([0,1,2].map(() => new Animated.Value(0.25))).current;
  useEffect(() => {
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
    <View style={{ flexDirection:'row', gap:5, alignItems:'center', paddingVertical:4 }}>
      {dots.map((op, i) => <Animated.View key={i} style={{ width:7, height:7, borderRadius:4, opacity:op, backgroundColor:color }}/>)}
    </View>
  );
}

// ── Tool-calling (Option A — duplicated from index.tsx) ────────
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

const TOOLS = [
  { name:'add_calendar_event',
    description:'Add a single event to the family calendar.',
    input_schema:{ type:'object', properties:{
      title:      { type:'string' },
      start_time: { type:'string', description:'ISO 8601 local e.g. 2026-03-26T09:00:00' },
      end_time:   { type:'string' },
      notes:      { type:'string' },
      assignee:   { type:'string' },
    }, required:['title','start_time'] } },
  { name:'update_calendar_event',
    description:'Update/reschedule an existing event.',
    input_schema:{ type:'object', properties:{
      search_title:   { type:'string' },
      search_date:    { type:'string', description:'YYYY-MM-DD' },
      new_title:      { type:'string' },
      new_start_time: { type:'string', description:'ISO 8601 local' },
      new_end_time:   { type:'string' },
      new_date:       { type:'string', description:'YYYY-MM-DD' },
      new_notes:      { type:'string' },
    }, required:['search_title'] } },
  { name:'delete_calendar_event',
    description:'Delete a calendar event by title.',
    input_schema:{ type:'object', properties:{
      search_title:{ type:'string' },
      date:        { type:'string', description:'YYYY-MM-DD' },
    }, required:['search_title'] } },
];

async function executeTool(name: string, input: any, onReload: () => void): Promise<string> {
  try {
    if (name === 'add_calendar_event') {
      const localDt  = (input.start_time || '').replace('Z','').split('+')[0];
      const dateOnly = localDt.split('T')[0] || toLocalDateStr(new Date());
      const { error } = await supabase.from('events').insert({
        family_id: DUMMY_FAMILY_ID, title: input.title,
        date: dateOnly, start_time: localDt,
        end_time: (input.end_time || input.start_time).replace('Z','').split('+')[0],
        notes: input.notes || '', timezone: 'Australia/Brisbane', assignees: ['2'],
      });
      if (error) throw error;
      onReload();
      return `✅ ${input.title} added to the calendar.`;
    }
    if (name === 'update_calendar_event') {
      let q = supabase.from('events').select('id,title,date,start_time,end_time')
        .eq('family_id', DUMMY_FAMILY_ID).ilike('title', `%${input.search_title}%`);
      if (input.search_date) q = (q as any).eq('date', input.search_date);
      const { data } = await (q as any).order('date').limit(1);
      if (!data || data.length === 0) return `Couldn't find "${input.search_title}".`;
      const t = data[0]; const u: any = {};
      if (input.new_title) u.title = input.new_title;
      if (input.new_notes) u.notes = input.new_notes;
      if (input.new_start_time) {
        u.start_time = input.new_start_time.replace('Z','').split('+')[0];
        u.date = u.start_time.split('T')[0];
        if (!input.new_end_time && t.start_time && t.end_time) {
          const dur = new Date(t.end_time).getTime() - new Date(t.start_time).getTime();
          if (dur > 0) {
            const newEnd = new Date(new Date(u.start_time).getTime() + dur);
            const pad = (n: number) => String(n).padStart(2,'0');
            u.end_time = `${newEnd.getFullYear()}-${pad(newEnd.getMonth()+1)}-${pad(newEnd.getDate())}T${pad(newEnd.getHours())}:${pad(newEnd.getMinutes())}:00`;
          }
        }
      }
      if (input.new_date) {
        u.date = input.new_date;
        if (t.start_time) u.start_time = `${input.new_date}T${t.start_time.split('T')[1]||'09:00:00'}`;
        if (t.end_time)   u.end_time   = `${input.new_date}T${t.end_time.split('T')[1]||'10:00:00'}`;
      }
      if (input.new_end_time) u.end_time = input.new_end_time.replace('Z','').split('+')[0];
      const { error } = await supabase.from('events').update(u).eq('id', t.id);
      if (error) throw error;
      onReload();
      return `✅ ${input.new_title || t.title} updated.`;
    }
    if (name === 'delete_calendar_event') {
      let q = supabase.from('events').select('id,title,date')
        .eq('family_id', DUMMY_FAMILY_ID).ilike('title', `%${input.search_title}%`);
      if (input.date) q = (q as any).eq('date', input.date);
      const { data } = await (q as any).order('date').limit(1);
      if (!data || data.length === 0) return `Couldn't find "${input.search_title}".`;
      await supabase.from('events').delete().eq('id', data[0].id);
      onReload();
      return `✅ ${data[0].title} deleted.`;
    }
    return `Tool ${name} not implemented.`;
  } catch (e: any) {
    return `Something went wrong — try again?`;
  }
}

// ── Time picker components ─────────────────────────────────────
const ROW_H = 52;

function SnapCol({ items, selected, onSelect, fmtItem }: {
  items: (string|number)[]; selected: string|number;
  onSelect: (v: string|number) => void; fmtItem?: (v: string|number) => string;
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
      <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false}
        snapToInterval={ROW_H} decelerationRate="fast"
        contentContainerStyle={{ paddingVertical: ROW_H * 2 }}
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
            <TouchableOpacity key={i} style={{ height: ROW_H, alignItems:'center', justifyContent:'center' }}
              onPress={() => { scrollRef.current?.scrollTo({ y: i * ROW_H, animated: true }); onSelect(item); }}
              activeOpacity={0.7}>
              <Text style={{
                fontFamily: isSel ? 'Poppins_700Bold' : 'Poppins_400Regular',
                fontSize: isSel ? 26 : 18, color: isSel ? INK : INK3,
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
          <Text style={{ fontFamily:'Poppins_700Bold', fontSize:16, color:INK, textAlign:'center', marginBottom:16 }}>Select time</Text>
          <View style={{ flexDirection:'row', alignItems:'center' }}>
            <SnapCol items={HOURS} selected={h} onSelect={v => setH(v as number)}/>
            <Text style={{ fontFamily:'Poppins_700Bold', fontSize:28, color:INK3, paddingHorizontal:4 }}>:</Text>
            <SnapCol items={MINUTES} selected={m} onSelect={v => setM(v as number)}/>
            <View style={{ width:1, backgroundColor:'rgba(0,0,0,0.07)', alignSelf:'stretch', marginHorizontal:8, marginVertical:8 }}/>
            <SnapCol items={['am','pm']} selected={ap} onSelect={v => setAp(v as 'am'|'pm')}/>
          </View>
          <View style={{ flexDirection:'row', gap:12, marginTop:20 }}>
            <TouchableOpacity style={{ flex:1, paddingVertical:14, borderRadius:14, borderWidth:1.5, borderColor:'rgba(0,0,0,0.07)', alignItems:'center' }}
              onPress={onClose} activeOpacity={0.8}>
              <Text style={{ fontFamily:'Poppins_600SemiBold', fontSize:15, color:INK2 }}>Cancel</Text>
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
                <Text style={{ fontSize:20, color:INK2, fontFamily:'Poppins_400Regular' }}>‹</Text>
              </TouchableOpacity>
              <Text style={{ fontFamily:'Poppins_700Bold', fontSize:14, color:INK }}>{MONTHS[navDate.getMonth()]} {navDate.getFullYear()}</Text>
              <TouchableOpacity style={{ padding:4 }} onPress={() => setNavDate(d => { const n=new Date(d); n.setMonth(n.getMonth()+1); return n; })}>
                <Text style={{ fontSize:20, color:INK2, fontFamily:'Poppins_400Regular' }}>›</Text>
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection:'row', flexWrap:'wrap' }}>
              {['M','T','W','T','F','S','S'].map((d,i) => <Text key={i} style={{ width:`${100/7}%` as any, textAlign:'center', fontFamily:'Poppins_700Bold', fontSize:9, color:INK3, paddingVertical:4 }}>{d}</Text>)}
              {cells.map((cell,i) => {
                const isSel = dateStr === toLocalDateStr(cell.date);
                const isToday = toLocalDateStr(cell.date) === toLocalDateStr(new Date());
                return (
                  <TouchableOpacity key={i} style={{ width:`${100/7}%` as any, aspectRatio:1, alignItems:'center', justifyContent:'center' }}
                    onPress={() => { onChange(toLocalDateStr(cell.date)); setOpen(false); }} activeOpacity={0.7}>
                    <View style={{ width:32, height:32, borderRadius:16, alignItems:'center', justifyContent:'center',
                      backgroundColor: isSel ? ACC : isToday && !isSel ? 'rgba(232,55,75,0.12)' : 'transparent' }}>
                      <Text style={{ fontFamily:'Poppins_500Medium', fontSize:13,
                        color: isSel ? '#fff' : isToday && !isSel ? ACC : !cell.cur ? INK3 : INK }}>{cell.day}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity onPress={() => setOpen(false)} style={{ alignItems:'center', paddingTop:12, paddingBottom:4 }}>
              <Text style={{ fontFamily:'Poppins_600SemiBold', fontSize:15, color:INK2 }}>Cancel</Text>
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
        <Text style={{ color:INK3, fontSize:14, marginLeft:4 }}>⌄</Text>
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
                  borderBottomWidth: i < options.length-1 ? 1 : 0, borderBottomColor:'rgba(0,0,0,0.07)' }}
                onPress={() => { onChange(opt); setOpen(false); }} activeOpacity={0.7}>
                <Text style={{ fontFamily: opt===value ? 'Poppins_600SemiBold' : 'Poppins_400Regular',
                  fontSize:16, color: opt===value ? ACC : INK }}>{opt}</Text>
                {opt === value && <Text style={{ color:ACC, fontSize:16, fontFamily:'Poppins_700Bold' }}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// ── ADD EVENT FLOW ─────────────────────────────────────────────
function AddEventFlow({ visible, onClose, onSaved, selectedDate, onAskZaeli, onScanPress }: {
  visible: boolean; onClose: () => void; onSaved: () => void;
  selectedDate: Date; onAskZaeli: () => void; onScanPress: () => void;
}) {
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
  const [assignees, setAssignees] = useState<string[]>(['2']);
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
      const pad = (n: number) => String(n).padStart(2,'0');
      const sh24 = toH24(startHour, startAmpm);
      const eh24 = toH24(endHour, endAmpm);
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
          family_id: DUMMY_FAMILY_ID, title: title.trim(),
          notes: [notes.trim(), location.trim()].filter(Boolean).join(' | '),
          date: dStr, start_time: sTime, end_time: eTime,
          timezone: 'Australia/Brisbane', repeat_rule: repeat, alert_rule: alert, assignees,
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
    } catch (e: any) { setSaving(false); }
  };

  const dateLabel = selectedDate.toLocaleDateString('en-AU', { weekday:'long', day:'numeric', month:'long' });

  // "Ask Zaeli" — close sheet and focus chat bar with context prompt
  const handleAskZaeli = () => {
    onClose();
    setTimeout(() => onAskZaeli(), 300);
  };

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
          <View style={{ width:36, height:4, borderRadius:2, backgroundColor:'rgba(0,0,0,0.07)', alignSelf:'center', marginBottom:4 }}/>
          <View style={{ paddingBottom:12, borderBottomWidth:1, borderBottomColor:'rgba(0,0,0,0.07)' }}>
            <Text style={{ fontFamily:'DMSerifDisplay_400Regular', fontSize:20, color:INK }}>Add an event</Text>
            <Text style={{ fontFamily:'Poppins_400Regular', fontSize:12, color:INK2, marginTop:2 }}>{dateLabel}</Text>
          </View>
          {/* Ask Zaeli — stays in channel */}
          <TouchableOpacity style={s.sheetPrimary} onPress={handleAskZaeli} activeOpacity={0.85}>
            <View style={[s.sheetPrimaryIcon, { backgroundColor: CAL_AI }]}><Text style={{ fontSize:18 }}>✦</Text></View>
            <View style={{ flex:1 }}>
              <Text style={s.sheetPrimaryTitle}>Ask Zaeli to add it</Text>
              <Text style={s.sheetPrimaryDesc}>Just tell her what it is — she'll handle the details</Text>
            </View>
            <Text style={s.sheetPrimaryArrow}>→</Text>
          </TouchableOpacity>
          {/* Scan — handled locally now */}
          <TouchableOpacity style={s.sheetScan} onPress={() => { onClose(); onScanPress(); }} activeOpacity={0.85}>
            <View style={s.sheetScanIcon}><Text style={{ fontSize:20 }}>📷</Text></View>
            <View style={{ flex:1 }}>
              <Text style={s.sheetScanTitle}>Scan an invite or fixture</Text>
              <Text style={s.sheetScanDesc}>Birthday invite, sport schedule — Zaeli reads it</Text>
            </View>
            <Text style={{ fontSize:16, color:INK3 }}>→</Text>
          </TouchableOpacity>
          <View style={{ flexDirection:'row', alignItems:'center', gap:10 }}>
            <View style={{ flex:1, height:1, backgroundColor:'rgba(0,0,0,0.07)' }}/>
            <Text style={{ fontFamily:'Poppins_400Regular', fontSize:12, color:INK3 }}>or</Text>
            <View style={{ flex:1, height:1, backgroundColor:'rgba(0,0,0,0.07)' }}/>
          </View>
          <TouchableOpacity style={s.sheetManual} onPress={() => setStep('form')} activeOpacity={0.8}>
            <Text style={s.sheetManualTxt}>Fill in manually</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Form — Step 2 */}
      <Modal visible={visible && step==='form'} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
        <SafeAreaView style={{ flex:1, backgroundColor:'#fff' }} edges={['top']}>
          <KeyboardAvoidingView style={{ flex:1 }} behavior={Platform.OS==='ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>
            <View style={s.modalHdr}>
              <TouchableOpacity onPress={onClose} hitSlop={{ top:12,bottom:12,left:12,right:12 }}>
                <Text style={s.modalCancel}>← Back</Text>
              </TouchableOpacity>
              <Text style={s.modalTitle}>New Event</Text>
              <TouchableOpacity onPress={save} disabled={!title.trim()||saving} hitSlop={{ top:12,bottom:12,left:12,right:12 }}>
                <Text style={[s.modalSave, (!title.trim()||saving) && { opacity:0.35 }]}>{saving ? 'Saving…' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
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
                  <View style={s.gcBlock}>
                    <TextInput style={s.gcTitleInput} value={title} onChangeText={setTitle}
                      placeholder="Event title" placeholderTextColor={INK3} autoFocus/>
                    <View style={s.gcSep}/>
                    <View style={{ flexDirection:'row', alignItems:'center', paddingHorizontal:16, paddingVertical:14, gap:10 }}>
                      <Text style={{ fontSize:16, width:22, textAlign:'center' }}>📍</Text>
                      <TextInput style={[s.gcSubInput, { flex:1, paddingHorizontal:0, paddingVertical:0 }]}
                        value={location} onChangeText={setLocation}
                        placeholder="Location (optional)" placeholderTextColor={INK3}/>
                    </View>
                  </View>
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
                    <TextInput style={s.gcSubInput} value={notes} onChangeText={setNotes}
                      placeholder="Notes" placeholderTextColor={INK3} multiline numberOfLines={3} textAlignVertical="top"/>
                  </View>
                </View>
              ) : (
                <View style={{ padding:20, gap:12 }}>
                  <Text style={{ fontFamily:'Poppins_400Regular', fontSize:13, color:INK2, lineHeight:20 }}>Who is this event for?</Text>
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

// ── EVENT DETAIL MODAL ─────────────────────────────────────────
function EventDetailModal({ event, onClose, onDeleted, onReload }: {
  event: any | null; onClose: () => void; onDeleted: () => void; onReload: () => void;
}) {
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
      setEditTitle(event.title || ''); setEditNotes(event.notes || '');
      setEditRepeat(event.repeat_rule || 'Never'); setEditAlert(event.alert_rule || 'None');
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

  const saveEdit = async () => {
    setSaving(true);
    try {
      const pad = (n: number) => String(n).padStart(2,'0');
      const sh24 = toH24(editStartH, editStartAp);
      const eh24 = toH24(editEndH, editEndAp);
      const dateStr = event.date || toLocalDateStr(new Date());
      const updates: any = {
        title: editTitle.trim() || event.title,
        notes: editNotes.trim(),
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
            {/* Tinted header */}
            <View style={{ backgroundColor:accent+'14', padding:20, paddingTop:14 }}>
              {mode==='view'
                ? <Text style={{ fontFamily:'DMSerifDisplay_400Regular', fontSize:26, color:INK, letterSpacing:-0.3 }}>{event.title}</Text>
                : <TextInput style={{ fontFamily:'DMSerifDisplay_400Regular', fontSize:24, color:INK, borderBottomWidth:1.5, borderBottomColor:accent, paddingBottom:6 }}
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
                {event.notes && (
                  <View style={s.detailRow}>
                    <Text style={s.detailIcon}>📝</Text>
                    <Text style={s.detailTxt}>{event.notes}</Text>
                  </View>
                )}
                <View style={{ padding:20, gap:10 }}>
                  {!confirmDelete
                    ? <TouchableOpacity style={s.deleteBtn} onPress={() => setConfirmDelete(true)} activeOpacity={0.8}>
                        <Text style={s.deleteBtnTxt}>Delete event</Text>
                      </TouchableOpacity>
                    : <TouchableOpacity style={[s.deleteBtn, s.deleteBtnConfirm]} onPress={doDelete} disabled={deleting} activeOpacity={0.8}>
                        <Text style={s.deleteBtnTxt}>{deleting ? 'Deleting…' : 'Tap again to confirm delete'}</Text>
                      </TouchableOpacity>
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
                  <TextInput style={s.gcSubInput} value={editNotes} onChangeText={setEditNotes}
                    placeholder="Notes" placeholderTextColor={INK3} multiline numberOfLines={3} textAlignVertical="top"/>
                </View>
                <Text style={{ fontFamily:'Poppins_600SemiBold', fontSize:13, color:INK2 }}>Who is this for?</Text>
                {FAMILY_MEMBERS.map(m => {
                  const on = editAssignees.includes(m.id);
                  return (
                    <TouchableOpacity key={m.id}
                      style={[s.memberRow, on && { borderColor:m.color+'40', backgroundColor:m.color+'08' }]}
                      onPress={() => setEditAssignees(prev => prev.includes(m.id) ? prev.filter(x=>x!==m.id) : [...prev, m.id])}
                      activeOpacity={0.8}>
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
  );
}

// ── COMPUTE EVENT LAYOUT ───────────────────────────────────────
function computeEventLayout(events: any[], gridStartHour: number) {
  const sorted = [...events].filter(e => e.start_time).sort((a, b) =>
    isoToMinutes(a.start_time) - isoToMinutes(b.start_time));
  const result: { ev:any; topPx:number; heightPx:number; leftFrac:number; widthFrac:number; isCompact:boolean; clashWith:any; }[] = [];
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
    group.forEach((ev, idx) => {
      const startMin = isoToMinutes(ev.start_time);
      const endMin   = ev.end_time ? isoToMinutes(ev.end_time) : startMin + 60;
      const topPx    = (startMin - gridStartHour * 60) * (HR_PX / 60);
      const heightPx = Math.max((endMin - startMin) * (HR_PX / 60), 12);
      result.push({
        ev, topPx, heightPx,
        leftFrac: idx / n, widthFrac: 1 / n,
        isCompact: n >= 3,
        clashWith: n >= 2 ? group.find((_, oi) => oi !== idx) : null,
      });
    });
  }
  return result;
}

// ── TIME GRID ──────────────────────────────────────────────────
function TimeGrid({ events, selectedDate, onEventPress, onAddPress }: {
  events: any[]; selectedDate: Date; onEventPress: (ev: any) => void; onAddPress: () => void;
}) {
  const now = new Date();
  const isToday = sameDay(selectedDate, now);
  const totalHours = 24;
  const gridHeight = totalHours * HR_PX;
  const scrollToHour = isToday ? Math.max(0, now.getHours() - 2) : 6;
  const gridScrollRef = useRef<ScrollView>(null);
  const gridScrolled  = useRef(false);
  const scrollGridToNow = () => {
    if (gridScrolled.current) return;
    gridScrolled.current = true;
    gridScrollRef.current?.scrollTo({ y: scrollToHour * HR_PX, animated: false });
  };
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const nowTopPx   = nowMinutes * (HR_PX / 60);
  const hours = Array.from({ length: totalHours + 1 }, (_, i) => i);
  const positionedEvents = computeEventLayout(events, 0);

  function formatHour(h: number): string {
    if (h === 0)  return '12am';
    if (h === 12) return '12pm';
    if (h < 12)   return `${h}am`;
    return `${h-12}pm`;
  }

  return (
    <View style={{ flex:1, position:'relative' }}>
      <ScrollView ref={gridScrollRef} onLayout={scrollGridToNow} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom:110 }}>
        <TouchableOpacity activeOpacity={1} onLongPress={onAddPress} delayLongPress={500}
          style={{ height:gridHeight, position:'relative' }}>
          {hours.map((h, i) => (
            <View key={h} style={{ position:'absolute', top:i * HR_PX, left:0, right:0, flexDirection:'row', alignItems:'flex-start' }}>
              <Text style={{ width:40, textAlign:'right', paddingRight:8, fontFamily:'Poppins_700Bold', fontSize:13, color:'rgba(0,0,0,0.6)', marginTop:-8, lineHeight:16 }}>{formatHour(h)}</Text>
              <View style={{ flex:1, height:1, backgroundColor:'rgba(0,0,0,0.07)', marginTop:0 }}/>
            </View>
          ))}
          {hours.slice(0,-1).map((h, i) => (
            <View key={`half-${h}`} style={{ position:'absolute', top: i * HR_PX + 24, left:40, right:0, height:1, borderTopWidth:1, borderColor:'rgba(0,0,0,0.04)', borderStyle:'dashed' }}/>
          ))}
          {isToday && (
            <View style={{ position:'absolute', top:nowTopPx, left:0, right:0, flexDirection:'row', alignItems:'center', zIndex:20 }}>
              <View style={{ width:40, alignItems:'flex-end', paddingRight:4 }}>
                <View style={{ width:8, height:8, borderRadius:4, backgroundColor:ACC }}/>
              </View>
              <View style={{ flex:1, height:2, backgroundColor:ACC }}/>
            </View>
          )}
          {positionedEvents.map(({ ev, topPx, heightPx, leftFrac, widthFrac, isCompact }) => {
            const accent = getMemberColor(ev.assignees);
            const assignedMembers = (ev.assignees||[]).map((id: string) => FAMILY_MEMBERS.find(m => m.id===id)).filter(Boolean);
            return (
              <TouchableOpacity key={ev.id} style={{
                position:'absolute', top:topPx, height:Math.max(heightPx, 12),
                left:`${40 + leftFrac * (100-40)}%` as any,
                width:`${widthFrac * (100-40)}%` as any,
                backgroundColor:accent+'14', borderRadius:8,
                padding:isCompact ? 0 : 5, paddingLeft:isCompact ? 0 : 7,
                overflow:'hidden', marginHorizontal:2,
                alignItems:isCompact ? 'center' : 'flex-start',
                justifyContent:isCompact ? 'center' : 'flex-start', zIndex:10,
              }} activeOpacity={0.75} onPress={() => onEventPress(ev)}>
                {isCompact ? (
                  assignedMembers.slice(0,1).map((m: any) => (
                    <View key={m.id} style={{ width:20, height:20, borderRadius:10, backgroundColor:m.color, alignItems:'center', justifyContent:'center' }}>
                      <Text style={{ fontFamily:'Poppins_700Bold', fontSize:9, color:'#fff' }}>{m.name[0]}</Text>
                    </View>
                  ))
                ) : heightPx < 20 ? (
                  <View style={{ flexDirection:'row', alignItems:'center', gap:4, flex:1 }}>
                    {assignedMembers.slice(0,1).map((m: any) => (
                      <View key={m.id} style={{ width:10, height:10, borderRadius:5, backgroundColor:m.color }}/>
                    ))}
                    <Text style={{ fontFamily:'Poppins_600SemiBold', fontSize:11, color:INK, flex:1 }} numberOfLines={1}>{ev.title}</Text>
                  </View>
                ) : (
                  <>
                    <Text style={{ fontFamily:'Poppins_600SemiBold', fontSize:14, color:INK, lineHeight:19, marginBottom:2 }} numberOfLines={2}>{ev.title}</Text>
                    {heightPx >= 34 && <Text style={{ fontFamily:'Poppins_500Medium', fontSize:12, color:'rgba(0,0,0,0.55)' }}>{fmtTime(ev.start_time)}{ev.end_time ? ` – ${fmtTime(ev.end_time)}` : ''}</Text>}
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
          {positionedEvents.filter(p => p.clashWith !== null).map(({ ev, topPx, leftFrac }) => (
            <View key={`clash-${ev.id}`} style={{
              position:'absolute', top:topPx+2, left:`${40 + leftFrac * (100-40) - 1}%` as any,
              width:14, height:14, borderRadius:7, backgroundColor:'#E53935',
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

// ── Msg type ───────────────────────────────────────────────────
interface Msg {
  id: string; role: 'zaeli'|'user'; text: string;
  ts: string; isLoading?: boolean; imageUri?: string;
  quickReplies?: string[];
}

// ── EventCard component ────────────────────────────────────────
function EventCard({ ev, onPress }: { ev: any; onPress: () => void }) {
  const assignedMembers = (ev.assignees || [])
    .map((id: string) => FAMILY_MEMBERS.find(m => m.id === id))
    .filter(Boolean) as any[];
  const bgColor = assignedMembers.length > 0
    ? assignedMembers[0].color + '16'
    : 'rgba(0,0,0,0.04)';

  // Check for conflict stored in ev._conflict (set by caller)
  const conflict = ev._conflict;

  return (
    <TouchableOpacity style={[s.evCard, { backgroundColor: bgColor }]} onPress={onPress} activeOpacity={0.75}>
      <View style={s.evCardInner}>
        {/* Left: title + time + conflict */}
        <View style={{ flex: 1 }}>
          <Text style={s.evTitle}>{ev.title}</Text>
          <Text style={s.evTime}>
            {fmtTime(ev.start_time)}{ev.end_time && ev.end_time !== ev.start_time ? ` – ${fmtTime(ev.end_time)}` : ''}
          </Text>
          {conflict && (
            <View style={s.evConflict}>
              <View style={s.evConflictDot}/>
              <Text style={s.evConflictTxt}>{conflict}</Text>
            </View>
          )}
        </View>
        {/* Right: avatars — bigger, stacked vertically if needed */}
        {assignedMembers.length > 0 && (
          <View style={s.evAvatarCol}>
            {assignedMembers.slice(0, 3).map((m: any) => (
              <View key={m.id} style={[s.evAv, { backgroundColor: m.color }]}>
                <Text style={s.evAvTxt}>{m.name[0]}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ── Detect conflicts among a day's events ─────────────────────
function addConflicts(events: any[]): any[] {
  const sorted = [...events].filter(e => e.start_time && !e.all_day)
    .sort((a, b) => isoToMinutes(a.start_time) - isoToMinutes(b.start_time));
  const result = events.map(e => ({ ...e, _conflict: null as string | null }));
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const aEnd = sorted[i].end_time ? isoToMinutes(sorted[i].end_time) : isoToMinutes(sorted[i].start_time) + 60;
      const bStart = isoToMinutes(sorted[j].start_time);
      if (bStart < aEnd) {
        const aIdx = result.findIndex(e => e.id === sorted[i].id);
        const bIdx = result.findIndex(e => e.id === sorted[j].id);
        if (aIdx >= 0 && !result[aIdx]._conflict) {
          result[aIdx]._conflict = `Overlaps with ${sorted[j].title} at ${fmtTime(sorted[j].start_time)}`;
        }
        if (bIdx >= 0 && !result[bIdx]._conflict) {
          result[bIdx]._conflict = `Overlaps with ${sorted[i].title} at ${fmtTime(sorted[i].start_time)}`;
        }
      }
    }
  }
  return result;
}

// ── MAIN SCREEN ────────────────────────────────────────────────
export default function CalendarScreen() {
  const today  = new Date();
  const router = useRouter();
  const params = useLocalSearchParams<{ eventId?: string }>();

  // Calendar state
  const [view,          setView]          = useState<'day'|'month'>('day');
  const [selectedDate,  setSelectedDate]  = useState(new Date(today));
  const [calMonth,      setCalMonth]      = useState(today.getMonth());
  const [calYear,       setCalYear]       = useState(today.getFullYear());
  const [events,        setEvents]        = useState<any[]>([]);
  const [showSheet,     setShowSheet]     = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [showScanSheet, setShowScanSheet] = useState(false);
  const [keyboardOpen,  setKeyboardOpen]  = useState(false);
  const [pendingImage,  setPendingImage]  = useState<string | null>(null);

  // Chat state
  const [messages,    setMessages]    = useState<Msg[]>([]);
  const [chatInput,   setChatInput]   = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatInputRef  = useRef<TextInput>(null);
  const lastSendRef   = useRef<string>('');
  const mainScrollRef = useRef<ScrollView>(null);
  const handledEventId = useRef<string | null>(null);
  const [askZaeliPrompt, setAskZaeliPrompt] = useState('');

  // Day strip
  const STRIP_BEFORE = 0;
  const PILL_W       = 54;
  const stripDays    = Array.from({ length: 120 }, (_, i) => addDays(today, i));
  const stripRef      = useRef<ScrollView>(null);
  const stripScrolled = useRef(false);

  const scrollStripToToday = () => {
    if (stripScrolled.current) return;
    stripScrolled.current = true;
    stripRef.current?.scrollTo({ x: 0, animated: false });
  };

  // Load events
  const loadEvents = useCallback(async () => {
    try {
      // Load a wider window — 3 months centred on selected month
      const fromDate = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-01`;
      const toYear   = calMonth === 11 ? calYear + 1 : calYear;
      const toMonth  = calMonth === 11 ? 1 : calMonth + 2;
      const toDate   = `${toYear}-${String(toMonth).padStart(2, '0')}-01`;
      const { data, error } = await supabase.from('events').select('*')
        .eq('family_id', DUMMY_FAMILY_ID)
        .gte('date', fromDate).lt('date', toDate)
        .order('start_time');
      if (!error) setEvents(data || []);
    } catch {}
  }, [calMonth, calYear]);

  useEffect(() => { loadEvents(); }, [loadEvents]);
  useFocusEffect(useCallback(() => { loadEvents(); }, [loadEvents]));

  useEffect(() => {
    const show = Keyboard.addListener('keyboardWillShow', () => setKeyboardOpen(true));
    const hide  = Keyboard.addListener('keyboardWillHide', () => setKeyboardOpen(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  useEffect(() => {
    setCalMonth(selectedDate.getMonth());
    setCalYear(selectedDate.getFullYear());
  }, [selectedDate]);

  // Deep-link to specific event
  useEffect(() => {
    const id = params.eventId;
    if (!id || id === handledEventId.current || events.length === 0) return;
    const found = events.find((e: any) => String(e.id) === String(id));
    if (found) { handledEventId.current = id; setSelectedEvent(found); }
  }, [params.eventId, events]);

  // Ask Zaeli focus
  useEffect(() => {
    if (askZaeliPrompt) {
      setChatInput(askZaeliPrompt);
      setTimeout(() => chatInputRef.current?.focus(), 100);
      setAskZaeliPrompt('');
    }
  }, [askZaeliPrompt]);

  const selectedDateStr = toLocalDateStr(selectedDate);
  const todayStr        = toLocalDateStr(today);
  const dayEvents       = addConflicts(events.filter(e => (e.date || '') === selectedDateStr));
  const allDayEvents    = dayEvents.filter(e => e.all_day);
  const timedEvents     = dayEvents.filter(e => !e.all_day);

  const getCellDots = (dateStr: string): string[] => {
    const cellEvs = events.filter(e => (e.date || '') === dateStr);
    const cols: string[] = [];
    cellEvs.forEach(ev => {
      const col = getMemberColor(ev.assignees);
      if (!cols.includes(col)) cols.push(col);
    });
    return cols.slice(0, 3);
  };

  // Month grid
  const buildMonthCells = () => {
    const dim      = getDaysInMonth(calYear, calMonth);
    const firstDay = getFirstDayOfMonth(calYear, calMonth);
    const prevDim  = getDaysInMonth(calYear, calMonth - 1);
    const cells: { day: number; cur: boolean; date: Date }[] = [];
    for (let i = firstDay - 1; i >= 0; i--)
      cells.push({ day: prevDim - i, cur: false, date: new Date(calYear, calMonth - 1, prevDim - i) });
    for (let d = 1; d <= dim; d++)
      cells.push({ day: d, cur: true, date: new Date(calYear, calMonth, d) });
    while (cells.length % 7 !== 0) {
      const n = cells.length - firstDay - dim + 1;
      cells.push({ day: n, cur: false, date: new Date(calYear, calMonth + 1, n) });
    }
    return cells;
  };

  // Photo scan — local handling
  const launchCamera = async () => {
    setShowScanSheet(false);
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') { alert('Camera permission needed'); return; }
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'] as any, quality: 0.8 });
      if (!result.canceled && result.assets?.[0]) {
        setPendingImage(result.assets[0].uri);
        setTimeout(() => chatInputRef.current?.focus(), 300);
      }
    } catch {}
  };

  const launchLibrary = async () => {
    setShowScanSheet(false);
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') { alert('Photo library permission needed'); return; }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'] as any, quality: 0.8 });
      if (!result.canceled && result.assets?.[0]) {
        setPendingImage(result.assets[0].uri);
        setTimeout(() => chatInputRef.current?.focus(), 300);
      }
    } catch {}
  };

  // ── Send message ─────────────────────────────────────────────
  const td = toLocalDateStr(today);

  async function sendMessage(overrideText?: string, overrideImage?: string) {
    const text     = (overrideText ?? chatInput).trim();
    const imageUri = overrideImage || pendingImage || undefined;
    if ((!text && !imageUri) || chatLoading) return;

    const sendKey = `${text}|${Date.now().toString().slice(0, -3)}`;
    if (lastSendRef.current === sendKey) return;
    lastSendRef.current = sendKey;

    const uMsg: Msg = { id: uid(), role: 'user', text: text || '', imageUri, ts: nowTs() };
    const history   = [...messages, uMsg];
    setMessages(history);
    setChatInput('');
    setPendingImage(null);
    setTimeout(() => mainScrollRef.current?.scrollToEnd({ animated: true }), 100);

    const replyId = uid();
    setMessages(prev => [...prev, { id: replyId, role: 'zaeli', text: '', isLoading: true, ts: nowTs() }]);
    setChatLoading(true);

    try {
      const anthropicKey  = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? '';
      const selectedLabel = selectedDate.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' });

      const upcomingCtx = events
        .filter(e => e.date >= td)
        .slice(0, 20)
        .map(e => `${e.title} (${e.date}${e.start_time ? ' at ' + fmtTime(e.start_time) : ''}${e.assignees?.length ? ' · ' + e.assignees.map((id: string) => FAMILY_MEMBERS.find(m => m.id === id)?.name).filter(Boolean).join(', ') : ''})`)
        .join('\n');

      const systemPrompt = `You are Zaeli — a warm, smart AI managing a family calendar. You are in the Calendar channel. Today is ${td}. The user is viewing ${selectedLabel}.

UPCOMING EVENTS:\n${upcomingCtx || 'Nothing upcoming.'}

FAMILY: Anna (1), Rich (2), Poppy (3), Gab (4), Duke (5).

USE TOOLS IMMEDIATELY when you have enough info. Never say "I'll add that" — just add it. After a tool call, confirm briefly and naturally.
For time-only updates use update_calendar_event — never delete and re-add.
New events default to Rich's assignee ['2'] unless told otherwise.

Voice: warm, specific, Australian. Plain text only — no asterisks or markdown. 2-3 sentences max.`;

      // Handle image
      let imageBase64 = '';
      let imageMimeType = 'image/jpeg';
      if (imageUri) {
        try {
          const FileSystem = require('expo-file-system/legacy');
          const ext = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
          const mimeMap: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', heic: 'image/jpeg', heif: 'image/jpeg' };
          imageMimeType = mimeMap[ext] || 'image/jpeg';
          imageBase64   = await FileSystem.readAsStringAsync(imageUri, { encoding: 'base64' });
        } catch {}
      }

      const histMsgs = history.slice(-10).map(m => ({
        role:    m.role === 'zaeli' ? 'assistant' as const : 'user' as const,
        content: m.text || '(message)',
      }));

      const msgContent: any = imageUri && imageBase64
        ? [
            { type: 'image', source: { type: 'base64', media_type: imageMimeType, data: imageBase64 } },
            { type: 'text',  text: text || 'Please read this image and help add the event to the calendar.' },
          ]
        : text || '(message)';

      const apiMessages = [
        ...histMsgs.slice(0, -1).map(m => ({ role: m.role, content: m.content as string })),
        { role: 'user' as const, content: msgContent },
      ];

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514', max_tokens: 1024,
          system: systemPrompt, tools: TOOLS, messages: apiMessages,
        }),
      });
      const data = await res.json();

      if (data.stop_reason === 'tool_use') {
        const toolUses = data.content.filter((b: any) => b.type === 'tool_use');
        const toolResults: string[] = [];
        for (const tu of toolUses) {
          const result = await executeTool(tu.name, tu.input, loadEvents);
          toolResults.push(result);
        }
        const toolResultContent = toolUses.map((tu: any, i: number) => ({
          type: 'tool_result', tool_use_id: tu.id, content: toolResults[i],
        }));
        const followUp = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01' },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514', max_tokens: 300, system: systemPrompt, tools: TOOLS,
            messages: [...apiMessages, { role: 'assistant', content: data.content }, { role: 'user', content: toolResultContent }],
          }),
        });
        const followData = await followUp.json();
        const followText = followData.content?.find((b: any) => b.type === 'text')?.text ?? toolResults.join('\n');
        setMessages(prev => prev.map(m => m.id === replyId ? { ...m, text: followText, isLoading: false } : m));
      } else {
        const reply = data.content?.find((b: any) => b.type === 'text')?.text ?? 'Something went wrong — try again?';
        setMessages(prev => prev.map(m => m.id === replyId ? { ...m, text: reply, isLoading: false } : m));
      }

      // API logging
      try {
        const it   = data.usage?.input_tokens ?? 0;
        const ot   = data.usage?.output_tokens ?? 0;
        const cost = (it / 1000000) * 3.0 + (ot / 1000000) * 15.0;
        supabase.from('api_logs').insert({ family_id: DUMMY_FAMILY_ID, feature: 'calendar_chat', model: 'claude-sonnet-4-20250514', input_tokens: it, output_tokens: ot, cost_usd: cost });
      } catch {}

    } catch {
      setMessages(prev => prev.map(m => m.id === replyId ? { ...m, text: 'Something went wrong — try again?', isLoading: false } : m));
    } finally { setChatLoading(false); }
  }

  // ── Render messages ───────────────────────────────────────────
  const renderMessages = () => messages.map(msg => {
    if (msg.role === 'user') {
      return (
        <View key={msg.id} style={{ alignItems: 'flex-end', marginBottom: 8 }}>
          {msg.imageUri && (
            <Image source={{ uri: msg.imageUri }} style={{ width: 130, height: 130, borderRadius: 12, marginBottom: 4 }} resizeMode="cover"/>
          )}
          {msg.text ? (
            <View style={s.ubub}>
              <Text style={s.ububTxt}>{msg.text}</Text>
            </View>
          ) : null}
        </View>
      );
    }
    return (
      <View key={msg.id} style={{ marginBottom: 10 }}>
        <View style={s.zEyebrow}>
          <View style={[s.zDot, { backgroundColor: CAL_AI }]}/>
          <Text style={[s.zName, { color: CAL_AI }]}>Zaeli</Text>
          <Text style={s.zTs}>{msg.ts}</Text>
        </View>
        {msg.isLoading
          ? <TypingDots color={CAL_AI}/>
          : <Text style={s.zText}>{msg.text}</Text>
        }
        {!msg.isLoading && msg.quickReplies && msg.quickReplies.length > 0 && (
          <View style={s.chipsRow}>
            {msg.quickReplies.map((chip, ci) => (
              <TouchableOpacity key={ci} style={s.chip} onPress={() => sendMessage(chip)} activeOpacity={0.7}>
                <Text style={s.chipTxt}>{chip}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  });

  // ── MAIN RENDER ───────────────────────────────────────────────
  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar style="dark"/>

      {/* ── BANNER — TWO ROWS, mint bg ── */}
      <View style={s.banner}>
        {/* Row 1: wordmark + Calendar + avatar */}
        <View style={s.bannerR1}>
          <TouchableOpacity onPress={() => router.navigate('/(tabs)/')} activeOpacity={0.8}>
            <Text style={s.logoWord}>
              z<Text style={{ color: CAL_AI }}>a</Text>el<Text style={{ color: CAL_AI }}>i</Text>
            </Text>
          </TouchableOpacity>
          <View style={s.bannerR1Right}>
            <Text style={s.chanLbl}>Calendar</Text>
            <View style={s.avatar}><Text style={s.avatarTxt}>R</Text></View>
          </View>
        </View>
        {/* Row 2: Day/Month toggle — full width */}
        <View style={s.bannerR2}>
          <View style={s.tog}>
            {(['day', 'month'] as const).map(v => (
              <TouchableOpacity
                key={v}
                style={[s.togBtn, view === v && s.togBtnOn]}
                onPress={() => {
                  if (v === 'day' && view === 'month') {
                    // Jump day view to the month-selected date
                    setView('day');
                  } else {
                    setView(v);
                  }
                }}
                activeOpacity={0.8}>
                <Text style={[s.togTxt, view === v && s.togTxtOn]}>
                  {v === 'day' ? 'Day' : 'Month'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* ── DAY STRIP — white bg, pinned (day view only) ── */}
      {view === 'day' && (
        <View style={s.stripWrap}>
          <ScrollView
            ref={stripRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            onLayout={scrollStripToToday}
            contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8, gap: 4 }}>
            {stripDays.map((d, i) => {
              const isToday    = sameDay(d, today);
              const isSelected = sameDay(d, selectedDate);
              const key        = toLocalDateStr(d);
              const dots       = getCellDots(key);
              const showMonth  = d.getDate() === 1;
              return (
                <View key={i} style={{ alignItems: 'center' }}>
                  {showMonth
                    ? <Text style={s.stripMonthLbl}>{MONTHS_SHORT[d.getMonth()]}</Text>
                    : <View style={{ height: 12 }}/>
                  }
                  <TouchableOpacity
                    style={[s.dp, isToday && s.dpToday, isSelected && !isToday && s.dpSel]}
                    onPress={() => setSelectedDate(new Date(d))}
                    activeOpacity={0.8}>
                    <Text style={[s.dpName, (isToday || isSelected) && { color: '#fff', opacity: 1 }]}>
                      {DAYS_SHORT[(d.getDay() + 6) % 7]}
                    </Text>
                    <Text style={[s.dpNum, (isToday || isSelected) && { color: '#fff' }]}>
                      {d.getDate()}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 2, height: 5, alignItems: 'center', justifyContent: 'center' }}>
                      {dots.length > 0
                        ? dots.map((col, di) => (
                            <View key={di} style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: (isToday || isSelected) ? 'rgba(255,255,255,0.8)' : col }}/>
                          ))
                        : <View style={{ width: 4, height: 4 }}/>
                      }
                    </View>
                  </TouchableOpacity>
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* ── FIXED DIVIDER — scroll boundary ── */}
      <View style={s.fixedDivider}/>

      {/* ── CONTENT — KAV + single ScrollView ── */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>
        <View style={s.contentWrap}>
          <ScrollView
            ref={mainScrollRef}
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">

            {/* ── DAY VIEW CONTENT ── */}
            {view === 'day' && (
              <>
                {/* All-day / reminder chips */}
                {allDayEvents.length > 0 && (
                  <View style={s.notesStrip}>
                    {allDayEvents.map(ev => {
                      const col = getMemberColor(ev.assignees);
                      return (
                        <TouchableOpacity key={ev.id}
                          style={[s.noteChip, { backgroundColor: col + '18' }]}
                          onPress={() => setSelectedEvent(ev)} activeOpacity={0.7}>
                          <Text style={[s.noteChipTxt, { color: col }]}>{ev.title}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}

                {/* Date label */}
                <Text style={s.dateLbl}>
                  {selectedDate.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()}
                  {selectedDateStr === todayStr ? ' — TODAY' : ''}
                </Text>

                {/* Event cards */}
                {timedEvents.length === 0 && allDayEvents.length === 0 ? (
                  <View style={s.emptyWrap}>
                    <Text style={s.emptyEmoji}>☕</Text>
                    <Text style={s.emptyTitle}>Nothing on today</Text>
                    <Text style={s.emptySub}>Good day for a coffee.</Text>
                  </View>
                ) : (
                  timedEvents.map(ev => (
                    <EventCard key={ev.id} ev={ev} onPress={() => setSelectedEvent(ev)}/>
                  ))
                )}

                {/* Zaeli opening prompt — only shown when no chat yet */}
                {messages.length === 0 && (() => {
                  const conflicts = timedEvents.filter(e => e._conflict);
                  const count = timedEvents.length + allDayEvents.length;
                  let promptText = '';
                  let chips: string[] = [];
                  if (count === 0) {
                    promptText = 'Nothing locked in — want to add something, or shall I check what\'s coming up?';
                    chips = ['Add an event', 'Show tomorrow', 'Show this week'];
                  } else if (conflicts.length > 0) {
                    promptText = `There's a clash worth sorting — ${conflicts[0].title} overlaps with something else. Want me to fix it?`;
                    chips = ['Fix the clash', 'Add an event', 'That\'s fine'];
                  } else if (count === 1) {
                    promptText = `Quiet one — just ${timedEvents[0]?.title || allDayEvents[0]?.title}. Anything to add or change?`;
                    chips = ['Add an event', 'Edit this event', 'Show tomorrow'];
                  } else {
                    promptText = `${count} things on today. Need anything added, moved, or flagged?`;
                    chips = ['Add an event', 'Show tomorrow', 'Any conflicts?'];
                  }
                  return (
                    <>
                      <View style={s.chatDivider}>
                        <View style={s.chatDivLine}/>
                        <Text style={s.chatDivTxt}>Zaeli</Text>
                        <View style={s.chatDivLine}/>
                      </View>
                      <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
                        <View style={s.zEyebrow}>
                          <View style={[s.zDot, { backgroundColor: CAL_AI }]}/>
                          <Text style={[s.zName, { color: CAL_AI }]}>Zaeli</Text>
                        </View>
                        <Text style={s.zText}>{promptText}</Text>
                        <View style={[s.chipsRow, { marginTop: 10 }]}>
                          {chips.map((chip, ci) => (
                            <TouchableOpacity key={ci} style={s.chip} onPress={() => sendMessage(chip)} activeOpacity={0.7}>
                              <Text style={s.chipTxt}>{chip}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    </>
                  );
                })()}
              </>
            )}

            {/* ── MONTH VIEW CONTENT ── */}
            {view === 'month' && (
              <>
                {/* Month navigation */}
                <View style={s.monthNav}>
                  <TouchableOpacity style={s.monthArr}
                    onPress={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); } else setCalMonth(m => m - 1); }}>
                    <Text style={s.monthArrTxt}>‹</Text>
                  </TouchableOpacity>
                  <Text style={s.monthLbl}>{MONTHS[calMonth]} {calYear}</Text>
                  <TouchableOpacity style={s.monthArr}
                    onPress={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); } else setCalMonth(m => m + 1); }}>
                    <Text style={s.monthArrTxt}>›</Text>
                  </TouchableOpacity>
                </View>

                {/* Day headers */}
                <View style={s.calGrid}>
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                    <View key={i} style={s.calCell}>
                      <Text style={s.calHdr}>{d}</Text>
                    </View>
                  ))}
                </View>

                {/* Month cells */}
                <View style={s.calGrid}>
                  {buildMonthCells().map((cell, i) => {
                    const dateStr = toLocalDateStr(cell.date);
                    const isToday = cell.cur && dateStr === todayStr;
                    const isSel   = dateStr === selectedDateStr && cell.cur;
                    const dots    = cell.cur ? getCellDots(dateStr) : [];
                    return (
                      <TouchableOpacity key={i} style={s.calCell}
                        onPress={() => { if (cell.cur) setSelectedDate(new Date(cell.date)); }}
                        activeOpacity={0.7}>
                        <View style={[s.calInner, isToday && s.calToday, isSel && !isToday && s.calSel]}>
                          <Text style={[
                            s.calNum,
                            !cell.cur && s.calNumOther,
                            isToday && { color: '#fff', fontFamily: 'Poppins_700Bold' },
                            isSel && !isToday && { color: ACC },
                          ]}>
                            {cell.day}
                          </Text>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 2, justifyContent: 'center', height: 5, marginTop: 1 }}>
                          {dots.map((col, di) => (
                            <View key={di} style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: isToday ? 'rgba(255,255,255,0.85)' : col }}/>
                          ))}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Family legend */}
                <View style={s.legend}>
                  {FAMILY_MEMBERS.map(m => (
                    <View key={m.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: m.color }}/>
                      <Text style={{ fontFamily: 'Poppins_500Medium', fontSize: 11, color: INK2 }}>{m.name}</Text>
                    </View>
                  ))}
                </View>

                {/* Selected day events — same EventCard component */}
                <Text style={[s.dateLbl, { marginTop: 4 }]}>
                  {selectedDate.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()}
                  {selectedDateStr === todayStr ? ' — TODAY' : ''}
                </Text>

                {(() => {
                  const sel = addConflicts(events.filter(e => (e.date || '') === selectedDateStr && !e.all_day));
                  if (sel.length === 0) {
                    return (
                      <View style={{ padding: 16, paddingTop: 4 }}>
                        <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 13, color: INK3 }}>Nothing on — free day ✨</Text>
                      </View>
                    );
                  }
                  return sel.map(ev => (
                    <EventCard key={ev.id} ev={ev} onPress={() => setSelectedEvent(ev)}/>
                  ));
                })()}
              </>
            )}

            {/* ── CHAT DIVIDER — only shown when there are messages ── */}
            {messages.length > 0 && (
              <View style={s.chatDivider}>
                <View style={s.chatDivLine}/>
                <Text style={s.chatDivTxt}>Zaeli</Text>
                <View style={s.chatDivLine}/>
              </View>
            )}

            {/* ── CHAT MESSAGES ── */}
            <View style={{ paddingHorizontal: 16 }}>
              {renderMessages()}
            </View>

          </ScrollView>

          {/* ── CHAT BAR — absolute bottom ── */}
          <View style={[s.inputArea, keyboardOpen && s.inputAreaKb]}>
            {/* Pending image preview */}
            {pendingImage && (
              <View style={{ marginBottom: 8, alignSelf: 'flex-start', position: 'relative' }}>
                <Image source={{ uri: pendingImage }} style={{ width: 70, height: 70, borderRadius: 10 }} resizeMode="cover"/>
                <TouchableOpacity
                  style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: 10, backgroundColor: INK, alignItems: 'center', justifyContent: 'center' }}
                  onPress={() => setPendingImage(null)} activeOpacity={0.8}>
                  <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>✕</Text>
                </TouchableOpacity>
              </View>
            )}
            <View style={[s.barPill, { backgroundColor: '#fff', borderColor: 'rgba(10,10,10,0.09)' }]}>
              <TouchableOpacity style={s.barBtn} onPress={() => setShowSheet(true)} activeOpacity={0.75}>
                <IcoPlus/>
              </TouchableOpacity>
              <View style={[s.barSep, { backgroundColor: 'rgba(10,10,10,0.1)' }]}/>
              <TextInput
                ref={chatInputRef}
                style={s.barInput}
                value={chatInput}
                onChangeText={setChatInput}
                placeholder="Ask about calendar…"
                placeholderTextColor="rgba(10,10,10,0.35)"
                multiline
                returnKeyType="default"
                keyboardAppearance="light"
                selectionColor={CAL_AI}
              />
              <TouchableOpacity style={s.barMicBtn} activeOpacity={0.75}>
                <IcoMic color="#F5C8C8" size={26}/>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.barSend, ((!chatInput.trim() && !pendingImage) || chatLoading) && { opacity: 0.4 }]}
                onPress={() => sendMessage()}
                disabled={(!chatInput.trim() && !pendingImage) || chatLoading}
                activeOpacity={0.85}>
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
        onAskZaeli={() => {
          const label = selectedDate.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' });
          setAskZaeliPrompt(`I'd like to add an event on ${label}. What would you like to call it?`);
        }}
        onScanPress={() => setShowScanSheet(true)}
      />

      {/* Scan sheet */}
      <Modal visible={showScanSheet} transparent animationType="fade" onRequestClose={() => setShowScanSheet(false)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
          onPress={() => setShowScanSheet(false)} activeOpacity={1}>
          <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: Platform.OS === 'ios' ? 44 : 24 }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(0,0,0,0.12)', alignSelf: 'center', marginBottom: 18 }}/>
            <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 17, color: INK, marginBottom: 16, textAlign: 'center' }}>Scan an invite or fixture</Text>
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, backgroundColor: '#f7f7f7', borderRadius: 14, marginBottom: 10 }}
              onPress={launchCamera} activeOpacity={0.8}>
              <Text style={{ fontSize: 26 }}>📷</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: INK }}>Take a photo</Text>
                <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 13, color: INK2, marginTop: 2 }}>Use your camera to capture an invite</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, backgroundColor: '#f7f7f7', borderRadius: 14 }}
              onPress={launchLibrary} activeOpacity={0.8}>
              <Text style={{ fontSize: 26 }}>🖼️</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: INK }}>Choose from library</Text>
                <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 13, color: INK2, marginTop: 2 }}>Pick a photo from your camera roll</Text>
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

    </SafeAreaView>
  );
}

// ── STYLES ─────────────────────────────────────────────────────
const CELL_SIZE = 44;

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: CAL_BG },

  // Banner — two rows, mint bg
  banner:      { backgroundColor: CAL_BG },
  bannerR1:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 6, paddingBottom: 8 },
  bannerR1Right:{ flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoWord:    { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 40, color: INK, letterSpacing: -1.5, lineHeight: 40 },
  chanLbl:     { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: 'rgba(10,10,10,0.45)' },
  avatar:      { width: 36, height: 36, borderRadius: 18, backgroundColor: '#4D8BFF', alignItems: 'center', justifyContent: 'center' },
  avatarTxt:   { fontFamily: 'Poppins_700Bold', fontSize: 13, color: '#fff' },

  // Row 2 — toggle
  bannerR2:  { paddingHorizontal: 20, paddingBottom: 10 },
  tog:       { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.10)', borderRadius: 12, padding: 3, gap: 2 },
  togBtn:    { flex: 1, paddingVertical: 7, borderRadius: 10, alignItems: 'center' },
  togBtnOn:  { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  togTxt:    { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: 'rgba(0,0,0,0.38)' },
  togTxtOn:  { color: INK },

  // Day strip — white bg, pinned
  stripWrap:      { backgroundColor: '#fff' },
  stripMonthLbl:  { fontFamily: 'Poppins_700Bold', fontSize: 8, color: ACC, textTransform: 'uppercase', letterSpacing: 1, textAlign: 'center', height: 12, paddingTop: 1 },
  dp:             { width: 50, alignItems: 'center', gap: 2, paddingVertical: 7, borderRadius: 13 },
  dpToday:        { backgroundColor: ACC },
  dpSel:          { backgroundColor: 'rgba(232,55,75,0.1)' },
  dpName:         { fontFamily: 'Poppins_700Bold', fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.3, color: INK3 },
  dpNum:          { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 22, color: INK, lineHeight: 26 },

  // Fixed divider
  fixedDivider: { height: 1, backgroundColor: 'rgba(0,0,0,0.08)', flexShrink: 0 },

  // Content
  contentWrap: { flex: 1, position: 'relative', backgroundColor: '#fff' },

  // Notes strip
  notesStrip: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
  noteChip:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 11, paddingVertical: 5, borderRadius: 20 },
  noteChipTxt:{ fontFamily: 'Poppins_500Medium', fontSize: 12 },

  // Date label
  dateLbl: { fontFamily: 'Poppins_700Bold', fontSize: 9, letterSpacing: 0.15 * 9, color: 'rgba(0,0,0,0.28)', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6, textTransform: 'uppercase' as const },

  // Event cards — clean, no accent bar
  evCard:       { marginHorizontal: 16, marginBottom: 8, borderRadius: 14, padding: 14 },
  evCardInner:  { flexDirection: 'row', alignItems: 'center', gap: 12 },
  evTitle:      { fontFamily: 'Poppins_600SemiBold', fontSize: 18, color: INK, marginBottom: 4 },
  evTime:       { fontFamily: 'Poppins_500Medium', fontSize: 14, color: 'rgba(0,0,0,0.45)' },
  evAvatarRow:  { flexDirection: 'row', gap: 5, marginTop: 9 },
  evAvatarCol:  { flexDirection: 'column', gap: 5, alignItems: 'center', flexShrink: 0 },
  evAv:         { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  evAvTxt:      { fontFamily: 'Poppins_700Bold', fontSize: 12, color: '#fff' },
  evConflict:   { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 9, padding: 8, backgroundColor: 'rgba(232,55,75,0.07)', borderRadius: 9 },
  evConflictDot:{ width: 7, height: 7, borderRadius: 4, backgroundColor: ACC, flexShrink: 0, marginTop: 3 },
  evConflictTxt:{ fontFamily: 'Poppins_500Medium', fontSize: 11, color: ACC, lineHeight: 16, flex: 1 },

  // Empty state
  emptyWrap:  { paddingTop: 40, paddingBottom: 24, alignItems: 'center' },
  emptyEmoji: { fontSize: 36, marginBottom: 12 },
  emptyTitle: { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 22, color: 'rgba(0,0,0,0.45)', letterSpacing: -0.3 },
  emptySub:   { fontFamily: 'Poppins_400Regular', fontSize: 13, color: 'rgba(0,0,0,0.28)', marginTop: 5 },

  // Chat divider
  chatDivider: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  chatDivLine: { flex: 1, height: 1, backgroundColor: 'rgba(0,0,0,0.06)' },
  chatDivTxt:  { fontFamily: 'Poppins_700Bold', fontSize: 9, letterSpacing: 0.15 * 9, textTransform: 'uppercase' as const, color: 'rgba(0,0,0,0.2)' },

  // Chat messages
  ubub:    { backgroundColor: '#F2F2F2', borderRadius: 14, borderBottomRightRadius: 3, paddingHorizontal: 13, paddingVertical: 9, maxWidth: '76%' as any },
  ububTxt: { fontFamily: 'Poppins_400Regular', fontSize: 15, color: INK, lineHeight: 22 },
  zEyebrow:{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 },
  zDot:    { width: 8, height: 8, borderRadius: 3 },
  zName:   { fontFamily: 'Poppins_700Bold', fontSize: 9, letterSpacing: 0.08 * 9, textTransform: 'uppercase' as const },
  zTs:     { fontFamily: 'Poppins_400Regular', fontSize: 9, color: INK3, marginLeft: 'auto' as any },
  zText:   { fontFamily: 'Poppins_400Regular', fontSize: 15, color: INK, lineHeight: 24 },
  chipsRow:{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  chip:    { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.15)', backgroundColor: '#fff' },
  chipTxt: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: 'rgba(10,10,10,0.65)' },

  // Chat bar
  inputArea:   { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 14, paddingBottom: Platform.OS === 'ios' ? 30 : 18, paddingTop: 10, backgroundColor: 'transparent' },
  inputAreaKb: { paddingBottom: Platform.OS === 'ios' ? 8 : 6 },
  barPill:     { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 30, paddingVertical: 14, paddingHorizontal: 16, borderWidth: 1, shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 16, shadowOffset: { width: 0, height: -2 }, elevation: 4 },
  barBtn:      { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  barMicBtn:   { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  barSep:      { width: 1, height: 18, flexShrink: 0 },
  barInput:    { flex: 1, fontFamily: 'Poppins_400Regular', fontSize: 15, color: INK, paddingVertical: 0, maxHeight: 100 },
  barSend:     { width: 32, height: 32, borderRadius: 16, backgroundColor: CAL_BG, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },

  // Month view
  monthNav:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 14, paddingBottom: 8 },
  monthArr:    { width: 30, height: 30, borderRadius: 9, backgroundColor: 'rgba(0,0,0,0.06)', alignItems: 'center', justifyContent: 'center' },
  monthArrTxt: { fontSize: 18, color: INK2, fontFamily: 'Poppins_400Regular' },
  monthLbl:    { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 22, color: INK, letterSpacing: -0.3 },
  calGrid:     { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 4 },
  calCell:     { width: `${100 / 7}%` as any, alignItems: 'center', paddingBottom: 4 },
  calHdr:      { fontFamily: 'Poppins_700Bold', fontSize: 9, textTransform: 'uppercase' as const, color: INK3, paddingVertical: 5 },
  calInner:    { width: CELL_SIZE, height: CELL_SIZE, borderRadius: CELL_SIZE / 2, alignItems: 'center', justifyContent: 'center' },
  calToday:    { backgroundColor: ACC },
  calSel:      { backgroundColor: 'rgba(232,55,75,0.1)' },
  calNum:      { fontFamily: 'Poppins_500Medium', fontSize: 18, color: INK },
  calNumOther: { color: 'rgba(0,0,0,0.2)', fontFamily: 'Poppins_400Regular' },
  legend:      { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-around', paddingHorizontal: 4, paddingTop: 10, paddingBottom: 8, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.06)' },

  // Add event sheet
  sheetPrimary:      { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: 'rgba(240,200,192,0.12)', borderWidth: 1.5, borderColor: 'rgba(240,200,192,0.4)', borderRadius: 16, padding: 14 },
  sheetPrimaryIcon:  { width: 42, height: 42, borderRadius: 13, backgroundColor: CAL_AI, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  sheetPrimaryTitle: { fontFamily: 'Poppins_700Bold', fontSize: 14, color: INK, marginBottom: 2 },
  sheetPrimaryDesc:  { fontFamily: 'Poppins_400Regular', fontSize: 12, color: INK2, lineHeight: 18 },
  sheetPrimaryArrow: { fontFamily: 'Poppins_700Bold', fontSize: 16, color: CAL_AI, flexShrink: 0 },
  sheetScan:         { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: 'rgba(0,0,0,0.04)', borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.1)', borderRadius: 16, padding: 14 },
  sheetScanIcon:     { width: 42, height: 42, borderRadius: 13, backgroundColor: 'rgba(0,0,0,0.07)', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  sheetScanTitle:    { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: INK, marginBottom: 2 },
  sheetScanDesc:     { fontFamily: 'Poppins_400Regular', fontSize: 12, color: INK2, lineHeight: 18 },
  sheetManual:       { paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.07)', alignItems: 'center' },
  sheetManualTxt:    { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: INK2 },

  // Modals
  modalHdr:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.07)' },
  modalCancel:   { fontFamily: 'Poppins_500Medium', fontSize: 15, color: INK2 },
  modalTitle:    { fontFamily: 'Poppins_700Bold', fontSize: 16, color: INK },
  modalSave:     { fontFamily: 'Poppins_700Bold', fontSize: 15, color: ACC },
  modalTabs:     { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.07)' },
  modalTab:      { flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent', marginBottom: -1 },
  modalTabOn:    { borderBottomColor: ACC },
  modalTabTxt:   { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: INK2 },
  modalTabTxtOn: { color: ACC },

  // Form
  gcBlock:         { marginHorizontal: 16, marginTop: 14, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.07)', overflow: 'hidden' },
  gcRow:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  gcRowLbl:        { fontFamily: 'Poppins_500Medium', fontSize: 15, color: INK },
  gcRowRight:      { flexDirection: 'row', alignItems: 'center' },
  gcRowRightTxt:   { fontFamily: 'Poppins_500Medium', fontSize: 15, color: INK2 },
  gcSep:           { height: 1, backgroundColor: 'rgba(0,0,0,0.07)', marginLeft: 16 },
  gcTitleInput:    { paddingHorizontal: 16, paddingVertical: 16, fontFamily: 'Poppins_600SemiBold', fontSize: 17, color: INK },
  gcSubInput:      { paddingHorizontal: 16, paddingVertical: 14, fontFamily: 'Poppins_400Regular', fontSize: 15, color: INK },
  gcPill:          { backgroundColor: 'rgba(0,0,0,0.04)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.07)' },
  gcPillTxt:       { fontFamily: 'Poppins_500Medium', fontSize: 13, color: INK },
  gcToggle:        { width: 44, height: 26, borderRadius: 13, backgroundColor: 'rgba(0,0,0,0.07)', justifyContent: 'center', paddingHorizontal: 2 },
  gcToggleOn:      { backgroundColor: ACC },
  gcToggleThumb:   { width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 2, shadowOffset: { width: 0, height: 1 } },
  gcToggleThumbOn: { transform: [{ translateX: 18 }] },

  // People selector
  memberRow:   { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, backgroundColor: 'rgba(0,0,0,0.03)', borderRadius: 14, borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.07)' },
  memberDot:   { width: 12, height: 12, borderRadius: 6, flexShrink: 0 },
  memberName:  { fontFamily: 'Poppins_500Medium', fontSize: 15, color: INK, flex: 1 },
  memberCheck: { width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: INK3, alignItems: 'center', justifyContent: 'center' },

  // Event detail
  detailRow:        { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  detailIcon:       { fontSize: 18, width: 26, textAlign: 'center' as any, marginTop: 1 },
  detailTxt:        { fontFamily: 'Poppins_400Regular', fontSize: 15, color: INK, flex: 1, lineHeight: 22 },
  deleteBtn:        { backgroundColor: 'rgba(255,59,59,0.08)', borderRadius: 14, paddingVertical: 14, alignItems: 'center', borderWidth: 1.5, borderColor: 'rgba(255,59,59,0.18)' },
  deleteBtnConfirm: { backgroundColor: 'rgba(255,59,59,0.15)', borderColor: 'rgba(255,59,59,0.4)' },
  deleteBtnTxt:     { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: '#FF3B3B' },
});
