import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import {
  Modal, Platform, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';

const DUMMY_FAMILY_ID = '00000000-0000-0000-0000-000000000001';

const C = {
  bg:           '#F7F7F7',
  card:         '#FFFFFF',
  border:       '#E8E8E8',
  text:         '#0A0A0A',
  text2:        'rgba(0,0,0,0.50)',
  text3:        'rgba(0,0,0,0.28)',
  accent:       '#E0007C',
  accentLight:  'rgba(224,0,124,0.10)',
  accentBorder: 'rgba(224,0,124,0.30)',
  blue:         '#0057FF',
  green:        '#00C97A',
  orange:       '#FF8C00',
  purple:       '#9B7FD4',
};

type CalView = 'Day' | 'Week' | 'Month';
type Member  = { id:string; name:string; colour?:string; avatar_emoji?:string };
type CalEvent= { id:string; title:string; start_time:string; end_time?:string; location?:string; colour?:string; member_id?:string; assigned_to?:string };

const DAYS_SHORT   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTHS_FULL  = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const EV_COLOURS   = [C.accent, C.blue, C.purple, C.orange, C.green];
const HOUR_H       = 64;

function pad(n:number){ return n<10?'0'+n:''+n; }
function dateKey(d:Date){ return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
function fmtTime(iso:string){ return new Date(iso).toLocaleTimeString('en-AU',{hour:'numeric',minute:'2-digit',hour12:true}); }
function hourLabel(h:number){ if(h===0)return'12am'; if(h===12)return'12pm'; return h<12?`${h}am`:`${h-12}pm`; }
function evColour(ev:CalEvent,members:Member[],idx:number){
  if(ev.colour) return ev.colour;
  const m=members.find(m=>m.id===ev.member_id||m.id===ev.assigned_to);
  if(m?.colour) return m.colour;
  return EV_COLOURS[idx%EV_COLOURS.length];
}

// ── ADD EVENT MODAL ───────────────────────────────────────────────────
function AddModal({ visible, onClose, onSaved, selDate, members }:
  { visible:boolean; onClose:()=>void; onSaved:()=>void; selDate:Date; members:Member[] }) {
  const [title,setTitle]=useState(''); const [loc,setLoc]=useState('');
  const [start,setStart]=useState('09:00'); const [end,setEnd]=useState('10:00');
  const [mem,setMem]=useState(''); const [saving,setSaving]=useState(false);

  const reset=()=>{setTitle('');setLoc('');setStart('09:00');setEnd('10:00');setMem('');};
  const save=async()=>{
    if(!title.trim())return; setSaving(true);
    const ds=dateKey(selDate);
    await supabase.from('events').insert({ family_id:DUMMY_FAMILY_ID, title:title.trim(),
      start_time:`${ds}T${start}:00`, end_time:`${ds}T${end}:00`,
      location:loc.trim()||null, member_id:mem||null,
      colour:members.find(m=>m.id===mem)?.colour||C.accent });
    setSaving(false); onSaved(); onClose(); reset();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={{flex:1,backgroundColor:C.bg}}>
        <View style={am.header}>
          <TouchableOpacity onPress={()=>{onClose();reset();}}><Text style={am.cancel}>Cancel</Text></TouchableOpacity>
          <Text style={am.title}>Add Event</Text>
          <TouchableOpacity onPress={save} disabled={!title.trim()||saving}>
            <Text style={[am.save,!title.trim()&&{opacity:0.3}]}>{saving?'Saving…':'Save'}</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={{padding:22}} keyboardShouldPersistTaps="handled">
          <Text style={am.label}>Event Name</Text>
          <TextInput style={am.input} value={title} onChangeText={setTitle} placeholder="e.g. Soccer practice" placeholderTextColor={C.text3} autoFocus />
          <Text style={am.label}>Location</Text>
          <TextInput style={am.input} value={loc} onChangeText={setLoc} placeholder="e.g. Clem Jones Centre" placeholderTextColor={C.text3} />
          <View style={{flexDirection:'row',gap:14}}>
            <View style={{flex:1}}><Text style={am.label}>Start</Text><TextInput style={am.input} value={start} onChangeText={setStart} placeholder="09:00" placeholderTextColor={C.text3}/></View>
            <View style={{flex:1}}><Text style={am.label}>End</Text><TextInput style={am.input} value={end} onChangeText={setEnd} placeholder="10:00" placeholderTextColor={C.text3}/></View>
          </View>
          <Text style={am.label}>Who's it for?</Text>
          <View style={am.chipRow}>
            <TouchableOpacity style={[am.chip,!mem&&am.chipOn]} onPress={()=>setMem('')}>
              <Text style={[am.chipTxt,!mem&&am.chipTxtOn]}>👨‍👩‍👧‍👦 All</Text>
            </TouchableOpacity>
            {members.map(m=>(
              <TouchableOpacity key={m.id} style={[am.chip,mem===m.id&&am.chipOn]} onPress={()=>setMem(m.id)}>
                <Text style={[am.chipTxt,mem===m.id&&am.chipTxtOn]}>{m.avatar_emoji||'👤'} {m.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ── MAIN SCREEN ───────────────────────────────────────────────────────
export default function CalendarScreen() {
  const [view,setView]             = useState<CalView>('Day');
  const [selDate,setSelDate]       = useState(new Date());
  const [events,setEvents]         = useState<CalEvent[]>([]);
  const [members,setMembers]       = useState<Member[]>([]);
  const [filterMem,setFilterMem]   = useState<string|null>(null);
  const [addVisible,setAddVisible] = useState(false);
  const timelineRef                = useRef<ScrollView>(null);

  const today    = new Date();
  const todayKey = dateKey(today);
  const selKey   = dateKey(selDate);

  useEffect(()=>{ loadMembers(); },[]);
  useEffect(()=>{ loadEvents(); },[selDate]);
  useEffect(()=>{ setTimeout(()=>timelineRef.current?.scrollTo({y:8*HOUR_H-10,animated:false}),250); },[]);

  const loadMembers=async()=>{
    const{data}=await supabase.from('family_members').select('*').eq('family_id',DUMMY_FAMILY_ID);
    if(data) setMembers(data);
  };
  const loadEvents=async()=>{
    const from=new Date(selDate); from.setDate(from.getDate()-10);
    const to=new Date(selDate);   to.setDate(to.getDate()+20);
    const{data}=await supabase.from('events').select('*').eq('family_id',DUMMY_FAMILY_ID)
      .gte('start_time',from.toISOString()).lte('start_time',to.toISOString()).order('start_time');
    if(data) setEvents(data);
  };

  const stripDates=Array.from({length:7},(_,i)=>{ const d=new Date(selDate); d.setDate(d.getDate()-3+i); return d; });

  const visibleEvents=events.filter(ev=>{
    if(filterMem&&ev.member_id!==filterMem&&ev.assigned_to!==filterMem) return false;
    if(view==='Day') return dateKey(new Date(ev.start_time))===selKey;
    if(view==='Week'){
      const base=new Date(selDate); const ws=new Date(base); ws.setDate(base.getDate()-base.getDay()); const we=new Date(ws); we.setDate(ws.getDate()+6);
      const d=new Date(ev.start_time); return d>=ws&&d<=we;
    }
    const d=new Date(ev.start_time); return d.getMonth()===selDate.getMonth()&&d.getFullYear()===selDate.getFullYear();
  });

  const HOURS=Array.from({length:19},(_,i)=>i+6); // 6am → midnight

  const DAYS_FULL = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar style="dark" />

      {/* TOP BAR */}
      <View style={s.topBar}>
        <View>
          <Text style={s.monthLbl}>{MONTHS_FULL[selDate.getMonth()].toUpperCase()} {selDate.getFullYear()}</Text>
          <Text style={s.dateLbl}>{DAYS_FULL[selDate.getDay()]}, {selDate.getDate()} {MONTHS_FULL[selDate.getMonth()]}</Text>
        </View>
        <View style={s.topRight}>
          <TouchableOpacity style={s.todayBtn} onPress={()=>setSelDate(new Date())}>
            <Text style={s.todayTxt}>Today</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.addBtn} onPress={()=>setAddVisible(true)}>
            <Text style={s.addTxt}>+ Add</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* VIEW TOGGLE — pill buttons exactly like mockup */}
      <View style={s.viewToggle}>
        {(['Day','Week','Month'] as CalView[]).map(v=>(
          <TouchableOpacity key={v} style={[s.vtBtn,view===v&&s.vtActive]} onPress={()=>setView(v)}>
            <Text style={[s.vtTxt,view===v&&s.vtTxtActive]}>{v}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* DATE STRIP */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{flexGrow:0,paddingBottom:6}} contentContainerStyle={{paddingHorizontal:10,gap:2}}>
        {stripDates.map((d,i)=>{
          const k=dateKey(d); const isSel=k===selKey; const isToday=k===todayKey;
          const hasEvs=events.some(ev=>dateKey(new Date(ev.start_time))===k);
          return (
            <TouchableOpacity key={i} style={[s.dateCell,isSel&&s.dateCellOn]} onPress={()=>setSelDate(new Date(d))}>
              <Text style={[s.dcDay,isSel&&s.dcDayOn]}>{DAYS_SHORT[d.getDay()].toUpperCase()}</Text>
              <View style={[s.dcNum,isToday&&!isSel&&s.dcNumToday,isSel&&s.dcNumOn]}>
                <Text style={[s.dcNumTxt,isToday&&!isSel&&s.dcNumTodayTxt,isSel&&s.dcNumOnTxt]}>{d.getDate()}</Text>
              </View>
              <View style={{flexDirection:'row',gap:2,minHeight:5}}>
                {hasEvs&&<View style={[s.dcDot,isSel&&s.dcDotOn]}/>}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* FILTER PILLS */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{flexGrow:0,paddingBottom:8}} contentContainerStyle={{paddingHorizontal:14,gap:8}}>
        <TouchableOpacity style={[s.fChip,!filterMem&&s.fChipOn]} onPress={()=>setFilterMem(null)}>
          <Text style={[s.fChipTxt,!filterMem&&s.fChipTxtOn]}>👨‍👩‍👧‍👦 All</Text>
        </TouchableOpacity>
        {members.map(m=>(
          <TouchableOpacity key={m.id} style={[s.fChip,filterMem===m.id&&s.fChipOn]} onPress={()=>setFilterMem(filterMem===m.id?null:m.id)}>
            <Text style={[s.fChipTxt,filterMem===m.id&&s.fChipTxtOn]}>{m.avatar_emoji||'👤'} {m.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── DAY TIMELINE — always-visible hours ── */}
      {view==='Day'&&(
        <ScrollView ref={timelineRef} style={{flex:1}} showsVerticalScrollIndicator={false}>
          {HOURS.map(hour=>{
            const evs=visibleEvents.filter(ev=>new Date(ev.start_time).getHours()===hour);
            const isNow=today.getHours()===hour&&selKey===todayKey;
            return (
              <View key={hour} style={[s.hourRow,{minHeight:HOUR_H}]}>
                <View style={s.hourLblWrap}>
                  <Text style={[s.hourLbl,evs.length>0&&{color:C.accent,fontWeight:'700'},isNow&&{color:C.blue,fontWeight:'700'}]}>
                    {hourLabel(hour)}
                  </Text>
                </View>
                <View style={s.hourLine}/>
                <View style={s.hourEvts}>
                  {evs.map((ev,idx)=>{
                    const col=evColour(ev,members,idx);
                    const memName=members.find(m=>m.id===ev.member_id||m.id===ev.assigned_to)?.name;
                    return (
                      <View key={ev.id} style={[s.evCard,{borderLeftColor:col,backgroundColor:col+'15'}]}>
                        <Text style={[s.evCardTitle,{color:col}]}>{ev.title}</Text>
                        <Text style={s.evCardTime}>{fmtTime(ev.start_time)}{ev.end_time?` – ${fmtTime(ev.end_time)}`:''}</Text>
                        {ev.location&&<Text style={s.evCardMeta}>📍 {ev.location}</Text>}
                        {memName&&<Text style={s.evCardMeta}>👤 {memName}</Text>}
                      </View>
                    );
                  })}
                </View>
              </View>
            );
          })}
          <View style={{height:100}}/>
        </ScrollView>
      )}

      {/* ── WEEK / MONTH — scrollable event list ── */}
      {(view==='Week'||view==='Month')&&(
        <ScrollView style={{flex:1}} showsVerticalScrollIndicator={false} contentContainerStyle={{padding:16,gap:10,paddingBottom:100}}>
          {visibleEvents.length===0&&(
            <Text style={{fontSize:16,color:C.text3,textAlign:'center',marginTop:60,fontStyle:'italic'}}>
              {view==='Week'?'No events this week':'No events this month'}
            </Text>
          )}
          {visibleEvents.map((ev,idx)=>{
            const col=evColour(ev,members,idx);
            const memName=members.find(m=>m.id===ev.member_id||m.id===ev.assigned_to)?.name;
            const evDate=new Date(ev.start_time);
            return (
              <View key={ev.id} style={[s.evCard,{borderLeftColor:col,backgroundColor:col+'15'}]}>
                <Text style={{fontSize:11,color:C.text3,marginBottom:3,fontWeight:'600'}}>{evDate.getDate()} {MONTHS_SHORT[evDate.getMonth()]}</Text>
                <Text style={[s.evCardTitle,{color:col}]}>{ev.title}</Text>
                <Text style={s.evCardTime}>{fmtTime(ev.start_time)}</Text>
                {ev.location&&<Text style={s.evCardMeta}>📍 {ev.location}</Text>}
                {memName&&<Text style={s.evCardMeta}>👤 {memName}</Text>}
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* FAB */}
      <TouchableOpacity style={s.fab} onPress={()=>setAddVisible(true)}>
        <Text style={s.fabTxt}>+</Text>
      </TouchableOpacity>

      <AddModal visible={addVisible} onClose={()=>setAddVisible(false)} onSaved={loadEvents} selDate={selDate} members={members}/>
    </SafeAreaView>
  );
}

// ── STYLES ────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex:1, backgroundColor:C.bg },

  topBar:    { flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start', paddingHorizontal:20, paddingTop:16, paddingBottom:10 },
  monthLbl:  { fontSize:11, fontWeight:'700', color:C.accent, letterSpacing:1.5, fontFamily:'Poppins_700Bold' },
  dateLbl:   { fontFamily:'DMSerifDisplay_400Regular', fontSize:22, color:C.text, marginTop:2 },
  topRight:  { flexDirection:'row', gap:8, alignItems:'center', marginTop:6 },
  todayBtn:  { backgroundColor:C.accentLight, borderWidth:1.5, borderColor:C.accentBorder, borderRadius:12, paddingHorizontal:14, paddingVertical:8 },
  todayTxt:  { color:C.accent, fontSize:13, fontWeight:'700', fontFamily:'Poppins_700Bold' },
  addBtn:    { backgroundColor:C.accent, borderRadius:12, paddingHorizontal:16, paddingVertical:8 },
  addTxt:    { color:'#fff', fontSize:13, fontWeight:'700', fontFamily:'Poppins_700Bold' },

  viewToggle:  { flexDirection:'row', marginHorizontal:16, marginBottom:10, backgroundColor:C.card, borderRadius:14, padding:3, borderWidth:1.5, borderColor:C.border },
  vtBtn:       { flex:1, paddingVertical:10, borderRadius:11, alignItems:'center' },
  vtActive:    { backgroundColor:C.accent },
  vtTxt:       { fontSize:14, fontWeight:'700', color:C.text2, fontFamily:'Poppins_700Bold' },
  vtTxtActive: { color:'#fff' },

  dateCell:       { alignItems:'center', paddingHorizontal:8, paddingVertical:5, borderRadius:14, minWidth:44, gap:3 },
  dateCellOn:     { backgroundColor:C.accent },
  dcDay:          { fontSize:9, fontWeight:'700', color:C.text3, textTransform:'uppercase', letterSpacing:0.3, fontFamily:'Poppins_700Bold' },
  dcDayOn:        { color:'rgba(255,255,255,0.75)' },
  dcNum:          { width:28, height:28, borderRadius:14, alignItems:'center', justifyContent:'center' },
  dcNumToday:     { borderWidth:2, borderColor:C.accent },
  dcNumOn:        { backgroundColor:'rgba(255,255,255,0.22)' },
  dcNumTxt:       { fontSize:14, fontWeight:'700', color:C.text },
  dcNumTodayTxt:  { color:C.accent },
  dcNumOnTxt:     { color:'#fff' },
  dcDot:          { width:5, height:5, borderRadius:3, backgroundColor:C.accent, opacity:0.7 },
  dcDotOn:        { backgroundColor:'rgba(255,255,255,0.85)', opacity:1 },

  fChip:       { backgroundColor:C.card, borderWidth:1.5, borderColor:C.border, borderRadius:22, paddingHorizontal:14, paddingVertical:8 },
  fChipOn:     { backgroundColor:C.accent, borderColor:C.accent },
  fChipTxt:    { fontSize:13, fontWeight:'600', color:C.text2 },
  fChipTxtOn:  { color:'#fff', fontWeight:'700' },

  // hour timeline
  hourRow:    { flexDirection:'row', borderTopWidth:1, borderTopColor:'rgba(0,0,0,0.05)' },
  hourLblWrap:{ width:52, paddingTop:9, paddingRight:8, alignItems:'flex-end', flexShrink:0 },
  hourLbl:    { fontSize:11, color:C.text3, fontWeight:'500' },
  hourLine:   { width:1, backgroundColor:'rgba(0,0,0,0.05)', flexShrink:0 },
  hourEvts:   { flex:1, paddingHorizontal:8, paddingVertical:5, gap:5 },

  evCard:         { borderLeftWidth:4, borderRadius:12, padding:12, marginBottom:3 },
  evCardTitle:    { fontSize:15, fontWeight:'700', fontFamily:'Poppins_700Bold' },
  evCardTime:     { fontSize:12, color:C.text3, marginTop:2 },
  evCardMeta:     { fontSize:12, color:C.text3, marginTop:1 },

  fab:    { position:'absolute', bottom:Platform.OS==='ios'?30:20, right:20, width:58, height:58, borderRadius:29, backgroundColor:C.accent, alignItems:'center', justifyContent:'center', shadowColor:C.accent, shadowOffset:{width:0,height:6}, shadowOpacity:0.4, shadowRadius:12, elevation:10 },
  fabTxt: { fontSize:32, color:'#fff', fontWeight:'300', lineHeight:36 },
});

const am = StyleSheet.create({
  header:   { flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingHorizontal:22, paddingVertical:18, borderBottomWidth:1.5, borderBottomColor:C.border, backgroundColor:C.card },
  title:    { fontSize:18, fontWeight:'700', color:C.text, fontFamily:'Poppins_700Bold' },
  cancel:   { fontSize:17, color:C.text2 },
  save:     { fontSize:17, fontWeight:'700', color:C.accent, fontFamily:'Poppins_700Bold' },
  label:    { fontSize:13, fontWeight:'700', color:C.text2, textTransform:'uppercase', letterSpacing:0.8, marginBottom:10, marginTop:20, fontFamily:'Poppins_700Bold' },
  input:    { backgroundColor:C.card, borderWidth:1.5, borderColor:C.border, borderRadius:14, padding:16, fontSize:17, color:C.text, marginBottom:4 },
  chipRow:  { flexDirection:'row', flexWrap:'wrap', gap:10 },
  chip:     { backgroundColor:C.card, borderWidth:1.5, borderColor:C.border, borderRadius:22, paddingHorizontal:16, paddingVertical:10 },
  chipOn:   { backgroundColor:C.accentLight, borderColor:C.accentBorder },
  chipTxt:  { fontSize:15, color:C.text2, fontWeight:'500' },
  chipTxtOn:{ color:C.accent, fontWeight:'700' },
});