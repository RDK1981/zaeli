import { useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated, Easing,
  ScrollView,
  StyleSheet, Text, TouchableOpacity, View, useWindowDimensions
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Line, Path, Polyline, Rect } from 'react-native-svg';
import { supabase } from '../../lib/supabase';
import { buildMemoryContext } from '../../lib/zaeli-memory';
import { HamburgerButton, NavMenu } from '../components/NavMenu';
import { callClaude } from '../../lib/api-logger';

// ── ASK BAR ICONS ────────────────────────────────────────────
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

// ── TILE ICONS ───────────────────────────────────────────────
function IcoCalendar({ size=24 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="4" width="18" height="17" rx="4" fill="#fff" stroke="#F9A8D4" strokeWidth={1.5}/>
      <Rect x="3" y="4" width="18" height="7" rx="4" fill="#EC4899"/>
      <Rect x="3" y="8" width="18" height="3" fill="#EC4899"/>
      <Line x1="8" y1="2" x2="8" y2="6" stroke="#DB2777" strokeWidth={2} strokeLinecap="round"/>
      <Line x1="16" y1="2" x2="16" y2="6" stroke="#DB2777" strokeWidth={2} strokeLinecap="round"/>
      <Circle cx="8" cy="14" r="1.5" fill="#F9A8D4"/>
      <Circle cx="12" cy="14" r="1.5" fill="#F9A8D4"/>
      <Circle cx="16" cy="14" r="1.5" fill="#F9A8D4"/>
      <Circle cx="8" cy="18" r="1.5" fill="#F9A8D4"/>
      <Circle cx="12" cy="18" r="1.5" fill="#F9A8D4"/>
      <Circle cx="16" cy="18" r="1.5" fill="#FBCFE8"/>
    </Svg>
  );
}
function IcoDinner({ size=24 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="9" fill="#FED7AA" stroke="#FB923C" strokeWidth={1.8}/>
      <Circle cx="12" cy="12" r="6" fill="#fff" stroke="#FED7AA" strokeWidth={1.2}/>
      <Line x1="9" y1="8" x2="9" y2="10" stroke="#FB923C" strokeWidth={1.8} strokeLinecap="round"/>
      <Line x1="7.5" y1="8" x2="7.5" y2="10" stroke="#FB923C" strokeWidth={1.8} strokeLinecap="round"/>
      <Line x1="10.5" y1="8" x2="10.5" y2="10" stroke="#FB923C" strokeWidth={1.8} strokeLinecap="round"/>
      <Path d="M7.5 10 Q9 12 10.5 10" stroke="#FB923C" strokeWidth={1.8} fill="none" strokeLinecap="round"/>
      <Line x1="9" y1="12" x2="9" y2="16" stroke="#FB923C" strokeWidth={1.8} strokeLinecap="round"/>
      <Path d="M14 8 C15 9 15 11 14 12 L14 16" stroke="#FB923C" strokeWidth={1.8} fill="none" strokeLinecap="round"/>
    </Svg>
  );
}
function IcoShopping({ size=24 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9 22C9.55228 22 10 21.5523 10 21C10 20.4477 9.55228 20 9 20C8.44772 20 8 20.4477 8 21C8 21.5523 8.44772 22 9 22Z" fill="#9CA3AF"/>
      <Path d="M20 22C20.5523 22 21 21.5523 21 21C21 20.4477 20.5523 20 20 20C19.4477 20 19 20.4477 19 21C19 21.5523 19.4477 22 20 22Z" fill="#9CA3AF"/>
      <Path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 001.99-1.69L23 6H6" stroke="#9CA3AF" strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    </Svg>
  );
}
function IcoTodoBig({ size=24 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="2" y="2" width="20" height="20" rx="5" fill="#22C55E"/>
      <Path d="M7 12l3.5 3.5L17 8.5" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"/>
    </Svg>
  );
}

function IcoReminder({ size=24 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 4C8.5 4 6 6.5 6 10v5l-1.5 2h15L18 15v-5c0-3.5-2.5-6-6-6z" fill="none" stroke="#00BFBF" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"/>
      <Line x1="12" y1="2" x2="12" y2="4" stroke="#00BFBF" strokeWidth={1.8} strokeLinecap="round"/>
      <Path d="M9.5 17a2.5 2.5 0 005 0" fill="none" stroke="#00BFBF" strokeWidth={1.8} strokeLinecap="round"/>
      <Circle cx="18" cy="6" r="4" fill="#FF3B3B"/>
      <Line x1="18" y1="4.5" x2="18" y2="6.5" stroke="#fff" strokeWidth={1.8} strokeLinecap="round"/>
      <Circle cx="18" cy="8" r="1" fill="#fff"/>
    </Svg>
  );
}

const DUMMY_FAMILY_ID   = '00000000-0000-0000-0000-000000000001';
const DUMMY_MEMBER_NAME = 'Anna';
const LATITUDE          = -27.4698;
const LONGITUDE         = 153.0251;
const DAYS_SHORT   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function getTimeFrame(h:number):'morning'|'afternoon'|'evening'|'night' {
  if(h>=6&&h<12) return 'morning';
  if(h>=12&&h<17) return 'afternoon';
  if(h>=17&&h<21) return 'evening';
  return 'night';
}
function getDinnerInstruction(h:number,tm:any,tmr:any):string {
  if(h>=21){
    if(tmr) return 'Do NOT mention dinner at all.';
    return 'Do NOT mention dinner tonight — it is too late. If other content is light, one gentle mention is acceptable: "Worth thinking about tomorrow\'s dinner before the morning rush."';
  }
  if(h>=19){
    if(tm) return 'Tonight\'s dinner is done or sorted. Do not mention it.';
    if(tmr) return 'Tonight\'s dinner window has passed. Reference tomorrow\'s dinner is sorted if relevant.';
    return 'Tonight\'s dinner window is passing. Shift to tomorrow: mention tomorrow night\'s dinner is not planned yet — keep it light.';
  }
  if(h>=16){
    if(tm) return 'Tonight\'s dinner is planned. Do not mention it unless it requires prep that hasn\'t started.';
    return 'PRIORITY: Tonight\'s dinner is NOT planned — urgency window. Mention it, offer ideas. CTA should be meal suggestions.';
  }
  if(tm) return 'Tonight\'s dinner is planned. Do not mention it in the brief.';
  return 'Tonight\'s dinner is not yet planned — mention it if relevant. CTA can be meal suggestions.';
}
function getGreeting(h:number):string { return h<12?'Good Morning':h<17?'Good Afternoon':'Good Evening'; }
function getGreetingIcon(h:number):string { return h<12?'☀️':h<17?'👋':'🌙'; }
function fmtRadarTime(startTime:string):string {
  if(!startTime) return '';
  const tp=startTime.replace('T',' ').split(' ')[1]||'';
  const [hh,mm]=tp.split(':').map(Number);
  if(isNaN(hh)) return '';
  return `${hh===0?12:hh>12?hh-12:hh}:${String(mm).padStart(2,'0')} ${hh>=12?'pm':'am'}`;
}

function TypingDot({delay}:{delay:number}) {
  const a=useRef(new Animated.Value(0)).current;
  useEffect(()=>{
    Animated.loop(Animated.sequence([
      Animated.delay(delay),
      Animated.timing(a,{toValue:-5,duration:300,useNativeDriver:true}),
      Animated.timing(a,{toValue:0,duration:300,useNativeDriver:true}),
      Animated.delay(600),
    ])).start();
  },[]);
  return <Animated.View style={{width:7,height:7,borderRadius:3.5,backgroundColor:'rgba(0,0,0,0.2)',transform:[{translateY:a}]}}/>;
}

function PulsingAvatar({size=30}:{size?:number}) {
  const scale=useRef(new Animated.Value(1)).current;
  const opacity=useRef(new Animated.Value(0.55)).current;
  useEffect(()=>{
    Animated.loop(Animated.sequence([
      Animated.parallel([
        Animated.timing(scale,{toValue:1.18,duration:900,easing:Easing.inOut(Easing.ease),useNativeDriver:true}),
        Animated.timing(opacity,{toValue:0,duration:900,easing:Easing.in(Easing.ease),useNativeDriver:true}),
      ]),
      Animated.parallel([
        Animated.timing(scale,{toValue:1,duration:0,useNativeDriver:true}),
        Animated.timing(opacity,{toValue:0.55,duration:0,useNativeDriver:true}),
      ]),
      Animated.delay(700),
    ])).start();
  },[]);
  const br=Math.round(size*0.32);
  return (
    <View style={{width:size,height:size,alignItems:'center',justifyContent:'center'}}>
      <Animated.View style={{position:'absolute',width:size,height:size,borderRadius:br,backgroundColor:'#0057FF',transform:[{scale}],opacity}}/>
      <View style={{width:size,height:size,borderRadius:br,backgroundColor:'#0057FF',alignItems:'center',justifyContent:'center'}}>
        <Text style={{fontSize:Math.round(size*0.5),color:'#fff'}}>{'\u2726'}</Text>
      </View>
    </View>
  );
}

function AnimSentence({sentence,delay,isLast,sentenceStyle,sentenceLastStyle,boldStyle}:{
  sentence:string;delay:number;isLast:boolean;
  sentenceStyle:any;sentenceLastStyle:any;boldStyle:any;
}) {
  const opacity=useRef(new Animated.Value(0)).current;
  const slide=useRef(new Animated.Value(10)).current;
  useEffect(()=>{
    const t=setTimeout(()=>{
      Animated.parallel([
        Animated.timing(opacity,{toValue:1,duration:380,easing:Easing.out(Easing.quad),useNativeDriver:true}),
        Animated.timing(slide,{toValue:0,duration:380,easing:Easing.out(Easing.quad),useNativeDriver:true}),
      ]).start();
    },delay);
    return ()=>clearTimeout(t);
  },[]);
  const parts=sentence.split(/\*\*(.*?)\*\*/g);
  return (
    <Animated.Text style={[isLast?sentenceLastStyle:sentenceStyle,{opacity,transform:[{translateY:slide}]}]}>
      {parts.map((p,j)=>j%2===1?<Text key={j} style={boldStyle}>{p}</Text>:<Text key={j}>{p}</Text>)}
    </Animated.Text>
  );
}

function AnimatedBriefSentences({text,sentenceStyle,sentenceLastStyle,boldStyle}:{
  text:string;sentenceStyle:any;sentenceLastStyle:any;boldStyle:any;
}) {
  const sentences=text.split(/\n+/).filter(s=>s.trim().length>0);
  if(sentences.length===0) return null;
  return (
    <>
      {sentences.map((sentence,i)=>(
        <AnimSentence key={`${text.slice(0,20)}-${i}`} sentence={sentence} delay={i*230} isLast={i===sentences.length-1}
          sentenceStyle={sentenceStyle} sentenceLastStyle={sentenceLastStyle} boldStyle={boldStyle}/>
      ))}
    </>
  );
}

// ── BRIEF TEXT — fade in once fully ready, bold already applied ──────
function TypewriterBrief({text,sentenceStyle,sentenceLastStyle,boldStyle}:{
  text:string;sentenceStyle:any;sentenceLastStyle:any;boldStyle:any;
}) {
  const fadeAnim=useRef(new Animated.Value(0)).current;
  useEffect(()=>{
    if(!text) return;
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim,{toValue:1,duration:500,easing:Easing.out(Easing.ease),useNativeDriver:true}).start();
  },[text]);
  const sentences=text.split(/\n+/).filter(s=>s.trim().length>0);
  return (
    <Animated.View style={{opacity:fadeAnim}}>
      {sentences.map((sentence,i)=>{
        const isLast=i===sentences.length-1;
        const parts=sentence.split(/\*\*(.*?)\*\*/g);
        return (
          <Text key={i} style={isLast?sentenceLastStyle:sentenceStyle}>
            {parts.map((p,j)=>j%2===1?<Text key={j} style={boldStyle}>{p}</Text>:<Text key={j}>{p}</Text>)}
          </Text>
        );
      })}
    </Animated.View>
  );
}

function RadarRow({barColor,icon,title,meta,badge,badgeBg,badgeColor,isReminder,onDismiss}:{
  barColor:string;icon:React.ReactElement;title:string;meta:string;
  badge:string;badgeBg:string;badgeColor:string;
  isReminder?:boolean;onDismiss?:()=>void;
}) {
  return (
    <View style={s.radarRow}>
      <View style={[s.radarBar,{backgroundColor:barColor}]}/>
      <View style={s.radarIconWrap}>{icon}</View>
      <View style={s.radarContent}>
        <Text style={s.radarRowTitle} numberOfLines={1}>{title}</Text>
        <Text style={s.radarMeta}>{meta}</Text>
      </View>
      <View style={[s.radarBadge,{backgroundColor:badgeBg}]}>
        <Text style={[s.radarBadgeTxt,{color:badgeColor}]}>{badge}</Text>
      </View>
      {isReminder&&(
        <TouchableOpacity style={s.dismissBtn} onPress={onDismiss} activeOpacity={0.7} hitSlop={{top:8,bottom:8,left:8,right:8}}>
          <Text style={s.dismissBtnTxt}>{'×'}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function HomeScreen() {
  const insets=useSafeAreaInsets();
  const router=useRouter();
  const [menuOpen,setMenuOpen]=useState(false);

  const now=new Date();
  const hour=now.getHours();
  const mins=String(now.getMinutes()).padStart(2,'0');
  const ampm=hour<12?'am':'pm';
  const h12=hour===0?12:hour>12?hour-12:hour;
  const timeStr=`${h12}:${mins} ${ampm}`;
  const dateStr=`${DAYS_SHORT[now.getDay()]} ${now.getDate()} ${MONTHS_SHORT[now.getMonth()]}`;
  const localDateStr=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  const tomorrowDate=new Date(now); tomorrowDate.setDate(now.getDate()+1);
  const tomorrowStr=`${tomorrowDate.getFullYear()}-${String(tomorrowDate.getMonth()+1).padStart(2,'0')}-${String(tomorrowDate.getDate()).padStart(2,'0')}`;
  const timeFrame=getTimeFrame(hour);

  const [events,setEvents]=useState<any[]>([]);
  const [todos,setTodos]=useState<any[]>([]);
  const [reminders,setReminders]=useState<any[]>([]);
  const [shopping,setShopping]=useState<any[]>([]);
  const [todayMeal,setTodayMeal]=useState<any>(null);
  const [tomorrowMeal,setTomorrowMeal]=useState<any>(null);
  const [dismissedReminders,setDismissedReminders]=useState<Set<string>>(new Set());
  const [briefText,setBriefText]=useState('');
  const [briefCta,setBriefCta]=useState('');
  const [briefSignoff,setBriefSignoff]=useState('');
  const [loadingBrief,setLoadingBrief]=useState(true);
  const [cardDismissed,setCardDismissed]=useState(false);
  const [showRelaxed,setShowRelaxed]=useState(false);

  const heroFade=useRef(new Animated.Value(0)).current;
  const heroSlide=useRef(new Animated.Value(-10)).current;
  const bodyFade=useRef(new Animated.Value(0)).current;
  const bodySlide=useRef(new Animated.Value(14)).current;
  const cardFade=useRef(new Animated.Value(1)).current; // starts visible
  const relaxedFade=useRef(new Animated.Value(0)).current;
  const lastBriefAt=useRef<number>(0);

  useEffect(()=>{
    Animated.sequence([
      Animated.parallel([
        Animated.timing(heroFade,{toValue:1,duration:400,easing:Easing.out(Easing.quad),useNativeDriver:true}),
        Animated.timing(heroSlide,{toValue:0,duration:400,easing:Easing.out(Easing.quad),useNativeDriver:true}),
      ]),
      Animated.parallel([
        Animated.timing(bodyFade,{toValue:1,duration:350,easing:Easing.out(Easing.quad),useNativeDriver:true}),
        Animated.timing(bodySlide,{toValue:0,duration:350,easing:Easing.out(Easing.quad),useNativeDriver:true}),
      ]),
    ]).start();
    fetchData();
    const sub=supabase.channel('home-todos')
      .on('postgres_changes',{event:'*',schema:'public',table:'todos',filter:`family_id=eq.${DUMMY_FAMILY_ID}`},
        ()=>{supabase.from('todos').select('*').eq('family_id',DUMMY_FAMILY_ID).eq('status','active').order('priority',{ascending:false}).limit(10).then(({data})=>{if(data)setTodos(data);});})
      .subscribe();
    return ()=>{supabase.removeChannel(sub);};
  },[]);

  const dismissedAt=useRef<number>(0);

  useFocusEffect(useCallback(()=>{
    const elapsed=Date.now()-lastBriefAt.current;
    const dismissedElapsed=Date.now()-dismissedAt.current;
    if(cardDismissed){
      if(dismissedAt.current>0 && dismissedElapsed>2*60*60*1000){
        setCardDismissed(false); setShowRelaxed(false);
        Animated.timing(cardFade,{toValue:1,duration:0,useNativeDriver:true}).start();
        fetchData();
      }
    } else if(elapsed>30*60*1000){
      fetchData();
    }
  },[cardDismissed]));

  const fetchData=async()=>{
    try{
      const yesterdayDate=new Date(now); yesterdayDate.setDate(now.getDate()-1);
      const yesterdayStr=`${yesterdayDate.getFullYear()}-${String(yesterdayDate.getMonth()+1).padStart(2,'0')}-${String(yesterdayDate.getDate()).padStart(2,'0')}`;
      const[evR,pastEvR,shR,mlR,tmR,tdR,doneR,ystMlR]=await Promise.all([
        supabase.from('events').select('*').eq('family_id',DUMMY_FAMILY_ID).gte('date',localDateStr).order('date').order('start_time').limit(15),
        supabase.from('events').select('*').eq('family_id',DUMMY_FAMILY_ID).gte('date',yesterdayStr).lte('date',localDateStr).order('date',{ascending:false}).order('start_time',{ascending:false}).limit(12),
        supabase.from('shopping_items').select('*').eq('family_id',DUMMY_FAMILY_ID).eq('checked',false).limit(30),
        supabase.from('meal_plans').select('*').eq('family_id',DUMMY_FAMILY_ID).eq('day_key',localDateStr).limit(1),
        supabase.from('meal_plans').select('*').eq('family_id',DUMMY_FAMILY_ID).eq('day_key',tomorrowStr).limit(1),
        supabase.from('todos').select('*').eq('family_id',DUMMY_FAMILY_ID).eq('status','active').order('priority',{ascending:false}).limit(10),
        supabase.from('todos').select('*').eq('family_id',DUMMY_FAMILY_ID).eq('status','done').order('created_at',{ascending:false}).limit(3),
        supabase.from('meal_plans').select('*').eq('family_id',DUMMY_FAMILY_ID).eq('day_key',yesterdayStr).limit(1),
      ]);
      const evs=evR.data||[]; const pastEvs=pastEvR.data||[]; const tdos=tdR.data||[];
      const doneTodos=doneR.data||[]; const tm=mlR.data?.[0]||null; const tmr=tmR.data?.[0]||null;
      const ystMeal=ystMlR.data?.[0]||null; const sh=shR.data||[];
      const cals=evs.filter((e:any)=>{ const type=(e.event_type||'').toLowerCase(); return type !== 'reminder'; });
      const rems=evs.filter((e:any)=>{ const type=(e.event_type||'').toLowerCase(); return type === 'reminder'; });
      setEvents(cals); setReminders(rems); setShopping(sh);
      setTodayMeal(tm); setTomorrowMeal(tmr); setTodos(tdos);
      generateBrief(evs,tdos,tm,tmr,sh,pastEvs,doneTodos,ystMeal);
      lastBriefAt.current=Date.now();
    }catch(e){console.log('fetchData:',e);}
  };

  const generateBrief=async(evs:any[],tdos:any[],tm:any,tmr:any,sh:any[]=[],pastEvs:any[]=[],doneTodos:any[]=[],ystMeal:any=null)=>{
    setLoadingBrief(true); setBriefText('');
    const fallbacks:Record<string,{text:string;cta:string}>={
      morning:{text:`Right, let's have a look at your morning.\nNothing alarming on the radar — which is actually a lovely way to start.\nWant me to cast an eye over the week and flag anything worth knowing about?`,cta:"Yes, take a look"},
      afternoon:{text:`Hope the morning treated you well.\nAfternoon's looking fairly civilised from where I'm standing.\nWant me to check what's still on the list and sort anything before the evening rush?`,cta:"Yes, let's sort it"},
      evening:{text:`Evening — the hard part of the day is nearly done.\nWant me to take a quick look at tomorrow so you're not surprised by anything in the morning?`,cta:"Yes, check tomorrow"},
      night:{text:`Getting late — you've earned the rest.\nWant me to quietly line up anything that needs to be ready for the morning?`,cta:"Yes, set it up"},
    };
    const fallback=fallbacks[timeFrame];
    try{
      const memCtx=await buildMemoryContext(DUMMY_FAMILY_ID);
      const dinnerRule=getDinnerInstruction(hour,tm,tmr);
      const urgentTodos=tdos.filter((t:any)=>t.priority==='high'||t.priority==='urgent');
      const systemPrompt=`You are Zaeli — warm, brilliant, completely magnetic. Australian warmth — real and unpretentious. The switched-on friend who noticed three things before anyone asked.

You are writing ${DUMMY_MEMBER_NAME}'s home screen brief. STRUCTURE:

SENTENCE 1 — CALLBACK (optional): If something notable is in the data (recent past event, yesterday's dinner, completed task, dismissed reminder), open with one warm alive sentence that connects — not a recap. Examples: "Hope the tacos went down well last night!" / "Great that Jack's soccer registration is done — one less thing." / "Hope Poppy had a brilliant time at dance tonight." BAD examples: "I see you completed 2 tasks" (robotic) / "You had pasta for dinner" (stating facts) / "Good morning!" (greeting, not callback). SKIP THIS SENTENCE ENTIRELY if nothing notable is in the data — go straight to sentence 2.

SENTENCE 2 — WHAT'S COMING: The single most important upcoming event or deadline in the current time window. Must include name, time, and person where known. Do NOT say "you have a meeting" — say "accountant call at 9am". One item only.

SENTENCE 3 — WHAT'S QUIETLY SLIPPING: 1–2 things overdue, approaching deadline, or at risk of being forgotten. Urgent/overdue first, then items due within 72 hours. Deliver like a friend flagging it over coffee — not a task manager list. If nothing is slipping, fold this into sentence 2 or skip.

SENTENCE 4 — THE OFFER (required): One warm specific question offering one concrete thing you can do right now. This drives the CTA button. Match the CTA label to your question:
- "Want me to throw together a few dinner ideas?" → CTA: "Yes, show me ideas"
- "Want me to draft a quick note to the school?" → CTA: "Draft it for me"
- "Want me to check the meal plan and top up the list?" → CTA: "Yes, sort the list"
- "Should I find a time for the dentist this week?" → CTA: "Find a time"
- "Want me to sort the calendar for the weekend?" → CTA: "Sort the weekend"
- "Want me to help prioritise what's most urgent?" → CTA: "Help me prioritise"
- No clear action → CTA: "Let's talk it through"

HARD RULES:
- Max 4 sentences total. Min 2.
- NEVER start with "I"
- NEVER be vague — "a few things need attention" is not acceptable. Name them.
- NEVER sound like a push notification — no "You have 3 tasks due"
- NEVER nag — no "you need to", "you should", "don't forget"
- Bold **names, times, deadlines** only — max 3 bold elements
- ALWAYS use 12-hour time (e.g. "9:30 am", "7:00 pm") — NEVER 24-hour format
- Current time is ${timeStr}. If an event has already passed today, do NOT mention it as upcoming
- CAPABILITY: Can draft messages/notes. CANNOT make calls or send messages.

DINNER RULE: ${dinnerRule}
TIME FRAME: ${timeStr} on ${dateStr}. Frame: ${timeFrame}.

RESPOND WITH JSON ONLY — no markdown, no backticks:
{"brief":"sentences separated by newlines","cta":"button label max 4 words","signoff":"1 warm sentence stepping back, references 1 specific thing from the brief"}`;
      const fmt12 = (iso:string) => {
        if(!iso) return '';
        const tp = iso.replace('T',' ').split(' ')[1]||'';
        const [hh,mm] = tp.split(':').map(Number);
        if(isNaN(hh)) return iso;
        return `${hh===0?12:hh>12?hh-12:hh}:${String(mm).padStart(2,'0')} ${hh>=12?'pm':'am'}`;
      };
      const fmtEv = (e:any) => ({ ...e, start_time: fmt12(e.start_time), end_time: fmt12(e.end_time) });
      const labelledPastEvs = pastEvs.map((e:any) => {
        if(!e.start_time) return { ...e, _hoursAgo: '?' };
        const timeStr2 = e.start_time.includes('T') ? e.start_time : `${e.date}T${e.start_time}`;
        const evDate = new Date(timeStr2);
        const hoursAgo = Math.round((now.getTime() - evDate.getTime()) / (1000*60*60));
        return { ...fmtEv(e), _hoursAgo: hoursAgo };
      }).filter((e:any) => e._hoursAgo !== '?' && e._hoursAgo <= 24);
      const ctx=`Family: ${DUMMY_MEMBER_NAME}. Today: ${localDateStr} (${dateStr}). Tomorrow: ${tomorrowStr}. Time: ${timeStr}. Time frame: ${timeFrame}.
CALLBACK SOURCES (pick the most recent AND notable for sentence 1 — prefer events within 6hrs, fall back to 24hrs if nothing recent):
1. Past events with recency label: ${labelledPastEvs.length>0?JSON.stringify(labelledPastEvs):'none'}.
2. Yesterday's dinner: ${ystMeal?ystMeal.title:'none'}.
3. Completed tasks (today/yesterday): ${doneTodos.length>0?JSON.stringify(doneTodos):'none'}.
UPCOMING EVENTS: ${JSON.stringify(evs.slice(0,6).map(fmtEv))}.
URGENT/OVERDUE TODOS: ${JSON.stringify(urgentTodos.slice(0,4))}.
ALL ACTIVE TODOS: ${JSON.stringify(tdos.slice(0,5))}.
Tonight meal: ${tm?.title||'not planned'}. Tomorrow meal: ${tmr?.title||'not planned'}. Shopping items pending: ${sh.length}.${memCtx}`;
      const d=await callClaude({
        feature:'home_brief',
        familyId:DUMMY_FAMILY_ID,
        body:{model:'claude-sonnet-4-20250514',max_tokens:500,system:systemPrompt,messages:[{role:'user',content:ctx}]},
      });
      const raw=d.content?.[0]?.text||'';
      const clean=raw.replace(/```json|```/g,'').trim();
      try{
        const parsed=JSON.parse(clean);
        if(parsed.brief){
          setBriefCta(parsed.cta||"Let's talk it through");
          setBriefSignoff(parsed.signoff||'');
          setTimeout(()=>setBriefText(parsed.brief),100); return;
        }
      }catch{
        if(raw){ setBriefCta("Let's talk it through"); setTimeout(()=>setBriefText(raw),100); return; }
      }
      setBriefCta(fallback.cta); setTimeout(()=>setBriefText(fallback.text),100);
    }catch(e){
      console.log('generateBrief:',e);
      setBriefCta(fallback.cta); setTimeout(()=>setBriefText(fallback.text),100);
    }finally{setLoadingBrief(false);}
  };

  const handleDismiss=()=>{
    Animated.timing(cardFade,{toValue:0,duration:300,useNativeDriver:true}).start(()=>{
      setCardDismissed(true); setShowRelaxed(true);
      dismissedAt.current=Date.now();
      Animated.timing(relaxedFade,{toValue:1,duration:350,useNativeDriver:true}).start();
    });
  };
  const handleDismissReminder=(id:string)=>setDismissedReminders(prev=>new Set([...prev,id]));
  const openChat=(channel='General',seed?:string)=>router.push({pathname:'/(tabs)/zaeli-chat',params:{channel,returnTo:'/(tabs)/',seedMessage:seed||''}});

  const {width:screenWidth}=useWindowDimensions();
  const TILE_PAD=18; const TILE_GAP=12;
  const tileSize=Math.floor((screenWidth-TILE_PAD*2-TILE_GAP)/2);
  const tileHeight=Math.floor(tileSize*0.95);
  const urgentCount=todos.filter((t:any)=>t.priority==='high'||t.priority==='urgent').length;
  const visibleRemindersRaw=reminders.filter((r:any)=>!dismissedReminders.has(r.id));
  const seenReminderTitles=new Set<string>();
  const visibleReminders:any[]=[];
  for(const r of visibleRemindersRaw){
    const key=(r.title||'').toLowerCase().trim();
    if(!seenReminderTitles.has(key)){seenReminderTitles.add(key);visibleReminders.push(r);}
  }
  const radarEventsRaw=events.filter((e:any)=>(e.date||'')>=localDateStr);
  const seenTitles=new Set<string>();
  const radarEvents:any[]=[];
  for(const e of radarEventsRaw){
    const key=(e.title||'').toLowerCase().trim();
    if(!seenTitles.has(key)){seenTitles.add(key);radarEvents.push(e);}
    if(radarEvents.length>=3) break;
  }
  const radarTodos=todos.filter((t:any)=>t.priority==='high'||t.priority==='urgent').slice(0,2);
  const mealDisplay=(timeFrame==='night'||hour>=21)?tomorrowMeal:todayMeal;
  const mealLabel=(timeFrame==='night'||hour>=21)?'Tomorrow':'Tonight';

  const ASK_BAR_H = 64;
  const bottomPad = insets.bottom + ASK_BAR_H + 16;

  return (
    <SafeAreaView style={{flex:1,backgroundColor:'#0057FF'}} edges={['top']}>
      <StatusBar style="light"/>
      <NavMenu visible={menuOpen} onClose={()=>setMenuOpen(false)}/>

      <ScrollView
        style={{flex:1,backgroundColor:'#0057FF'}}
        showsVerticalScrollIndicator={false}
        bounces
        contentContainerStyle={{paddingBottom: bottomPad}}
      >
        {/* HERO */}
        <Animated.View style={[s.hero,{opacity:heroFade,transform:[{translateY:heroSlide}]}]}>
          <View style={s.heroOrbOuter}/><View style={s.heroOrbInner}/><View style={s.heroOrb2}/>

          <View style={s.topRow}>
            <TouchableOpacity style={s.logoWrap} onPress={()=>router.replace('/(tabs)/')} activeOpacity={0.75}>
              <View style={s.logoMark}><Text style={{fontSize:22,color:'#fff'}}>{'\u2726'}</Text></View>
              <Text style={s.logoWord}>{'z'}<Text style={{color:'#FFE500'}}>{'a'}</Text>{'el'}<Text style={{color:'#FFE500'}}>{'i'}</Text></Text>
            </TouchableOpacity>
            <View style={s.topRight}>
              <View style={s.datePill}>
                <View style={s.liveDotPill}/>
                <Text style={s.datePillTxt}>{dateStr}</Text>
              </View>
              <HamburgerButton onPress={()=>setMenuOpen(true)}/>
            </View>
          </View>

          <Text style={s.greetLine}>{getGreeting(hour)}</Text>
          <Text style={s.nameLine}>{DUMMY_MEMBER_NAME} <Text style={s.nameIcon}>{getGreetingIcon(hour)}</Text></Text>

          {/* Brief card — always visible immediately, thinking state shown inside */}
          {!cardDismissed?(
            <Animated.View style={[s.zaeliCard,{opacity:cardFade}]}>
              <View style={s.zaeliHead}>
                <PulsingAvatar size={28}/>
                <Text style={s.zaeliName}>{'Z'}<Text style={{color:'#E0007C'}}>{'a'}</Text>{'el'}<Text style={{color:'#E0007C'}}>{'i'}</Text></Text>
                <View style={s.cardLiveDot}/>
                <Text style={s.zaeliTime}>{timeStr}</Text>
              </View>
              {loadingBrief?(
                <View style={s.loadingRow}>
                  <Text style={s.loadingTxt}>Zaeli is thinking…</Text>
                  <View style={{flexDirection:'row',gap:3,alignItems:'center'}}>{[0,1,2].map(i=><TypingDot key={i} delay={i*200}/>)}</View>
                </View>
              ):(
                <>
                  <View style={s.briefWrap}>
                    <TypewriterBrief text={briefText||''} sentenceStyle={s.briefSentence} sentenceLastStyle={s.briefSentenceLast} boldStyle={{fontFamily:'Poppins_700Bold',color:'#0A0A0A'}}/>
                  </View>
                  <View style={s.zaeliActions}>
                    <TouchableOpacity style={s.ctaPrimary} onPress={()=>openChat('General',briefText)} activeOpacity={0.85}>
                      <Text style={s.ctaPrimaryTxt}>{briefCta||"Let's talk it through"}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.ctaGhost} onPress={handleDismiss} activeOpacity={0.7}>
                      <Text style={s.ctaGhostTxt}>{"I'm sorted, thanks"}</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </Animated.View>
          ):showRelaxed?(
            <Animated.View style={[s.relaxedCard,{opacity:relaxedFade}]}>
              <View style={s.relaxedInner}>
                <View style={s.relaxedAvatar}><Text style={{fontSize:13,color:'#0057FF'}}>{'\u2726'}</Text></View>
                <Text style={s.relaxedSignoff}>{briefSignoff||"No worries! I'm here whenever you need me. 💛"}</Text>
              </View>
              <TouchableOpacity style={s.relaxedBtn} onPress={()=>openChat('General',briefText)} activeOpacity={0.85}>
                <Text style={s.relaxedBtnTxt}>{"Let's chat \u2726"}</Text>
              </TouchableOpacity>
            </Animated.View>
          ):null}
        </Animated.View>

        {/* BODY */}
        <Animated.View style={[s.body,{opacity:bodyFade,transform:[{translateY:bodySlide}]}]}>

          {/* Tiles 2×2 — Option C: coloured footer bar */}
          <View style={s.tilesGrid}>

            {/* Top-left: Calendar — magenta */}
            <TouchableOpacity style={[s.tile,{width:tileSize,height:tileHeight}]} onPress={()=>router.push('/(tabs)/calendar')} activeOpacity={0.8}>
              <View style={s.tileTopArea}>
                <View style={[s.tileIconBox,{backgroundColor:'rgba(224,0,124,0.08)'}]}><IcoCalendar size={24}/></View>
                <View style={s.tileBottom}>
                  <Text style={s.tileLabel}>NEXT UP</Text>
                  {radarEvents.length>0?(<><Text style={s.tileVal} numberOfLines={2}>{radarEvents[0].title}</Text><Text style={s.tileSub} numberOfLines={1}>{fmtRadarTime(radarEvents[0].start_time)||'Today'}</Text></>):(<><Text style={s.tileVal}>All clear</Text><Text style={s.tileSub}>nothing scheduled</Text></>)}
                </View>
              </View>
              <View style={[s.tileFooter,{backgroundColor:'rgba(224,0,124,0.07)'}]}>
                <Text style={[s.tileFooterTxt,{color:'#E0007C'}]}>Calendar</Text>
                <Text style={[s.tileFooterArr,{color:'#E0007C'}]}>→</Text>
              </View>
            </TouchableOpacity>

            {/* Top-right: Shopping — black */}
            <TouchableOpacity style={[s.tile,{width:tileSize,height:tileHeight}]} onPress={()=>router.push('/(tabs)/shopping')} activeOpacity={0.8}>
              <View style={s.tileTopArea}>
                <View style={[s.tileIconBox,{backgroundColor:'rgba(0,0,0,0.05)'}]}><IcoShopping size={24}/></View>
                <View style={s.tileBottom}>
                  <Text style={s.tileLabel}>SHOPPING</Text>
                  <Text style={[s.tileVal,shopping.length>0&&{color:'#0057FF'}]}>{shopping.length>0?`${shopping.length} item${shopping.length>1?'s':''}`:'All clear'}</Text>
                  <Text style={[s.tileSub,shopping.length>0&&s.tileSubCta]}>{shopping.length>0?'Woolies run needed':'nothing pending'}</Text>
                </View>
              </View>
              <View style={[s.tileFooter,{backgroundColor:'rgba(0,0,0,0.04)'}]}>
                <Text style={[s.tileFooterTxt,{color:'#444'}]}>Shopping</Text>
                <Text style={[s.tileFooterArr,{color:'#444'}]}>→</Text>
              </View>
            </TouchableOpacity>

            {/* Bottom-left: Meals — orange */}
            <TouchableOpacity style={[s.tile,{width:tileSize,height:tileHeight}]} onPress={()=>router.push('/(tabs)/mealplanner')} activeOpacity={0.8}>
              <View style={s.tileTopArea}>
                <View style={[s.tileIconBox,{backgroundColor:'rgba(255,140,0,0.09)'}]}><IcoDinner size={24}/></View>
                <View style={s.tileBottom}>
                  <Text style={s.tileLabel}>{mealLabel.toUpperCase()}</Text>
                  <Text style={[s.tileVal,!mealDisplay&&s.tileValWarn]} numberOfLines={2}>{mealDisplay?mealDisplay.title:'Not planned'}</Text>
                  <Text style={[s.tileSub,!mealDisplay&&s.tileSubCta]}>{mealDisplay?'planned \u2713':'Tap to sort \u2192'}</Text>
                </View>
              </View>
              <View style={[s.tileFooter,{backgroundColor:'rgba(255,140,0,0.07)'}]}>
                <Text style={[s.tileFooterTxt,{color:'#FF8C00'}]}>Meals</Text>
                <Text style={[s.tileFooterArr,{color:'#FF8C00'}]}>→</Text>
              </View>
            </TouchableOpacity>

            {/* Bottom-right: To-dos — gold */}
            <TouchableOpacity style={[s.tile,{width:tileSize,height:tileHeight}]} onPress={()=>router.push({pathname:'/(tabs)/more',params:{initialPage:'todo'}})} activeOpacity={0.8}>
              {urgentCount>0&&<View style={s.tilePip}/>}
              <View style={s.tileTopArea}>
                <View style={[s.tileIconBox,{backgroundColor:'rgba(184,164,0,0.10)'}]}><IcoTodoBig size={24}/></View>
                <View style={s.tileBottom}>
                  <Text style={s.tileLabel}>TO-DOS</Text>
                  <Text style={[s.tileVal,urgentCount>0&&{color:'#B8A400'}]}>{urgentCount>0?`${urgentCount} urgent`:todos.length>0?`${todos.length} items`:'All clear'}</Text>
                  <Text style={s.tileSub}>{todos.length>0?`${todos.length} total`:'nice work 🎉'}</Text>
                </View>
              </View>
              <View style={[s.tileFooter,{backgroundColor:'rgba(184,164,0,0.08)'}]}>
                <Text style={[s.tileFooterTxt,{color:'#B8A400'}]}>To-dos</Text>
                <Text style={[s.tileFooterArr,{color:'#B8A400'}]}>→</Text>
              </View>
            </TouchableOpacity>

          </View>

          {/* On the radar */}
          <View style={s.radarSection}>
            <View style={s.radarHead}>
              <Text style={s.radarTitle}>On the radar</Text>
              <TouchableOpacity onPress={()=>router.push('/(tabs)/calendar')}><Text style={s.radarLink}>See all</Text></TouchableOpacity>
            </View>
            <View style={s.radarBand}>
              {radarEvents.length>0&&(<>
                <View style={s.radarSection2Hdr}><Text style={s.radarSection2Label}>Coming up</Text></View>
                {radarEvents.map((e:any)=>{
                  const t=fmtRadarTime(e.start_time); const isToday=e.date===localDateStr; const isTmrw=e.date===tomorrowStr;
                  const dayLabel=isToday?'Today':isTmrw?'Tomorrow':e.date;
                  return (
                    <TouchableOpacity key={e.id} activeOpacity={0.8} onPress={()=>router.push({pathname:'/(tabs)/calendar',params:{eventId:e.id}})}>
                      <RadarRow barColor="#7C3AED" icon={<IcoCalendar size={20}/>} title={e.title} meta={`${dayLabel}${t?' \u00B7 '+t:''}`} badge={t||'Soon'} badgeBg="rgba(0,87,255,0.08)" badgeColor="#0057FF"/>
                    </TouchableOpacity>
                  );
                })}
              </>)}
              {visibleReminders.length>0&&(<>
                {radarEvents.length===0&&<View style={s.radarSection2Hdr}><Text style={s.radarSection2Label}>Coming up</Text></View>}
                {visibleReminders.slice(0,4).map((r:any)=>{
                  const t=fmtRadarTime(r.start_time); const isToday=r.date===localDateStr;
                  return (<TouchableOpacity key={r.id} activeOpacity={0.8} onPress={()=>router.push('/(tabs)/calendar')}>
                    <RadarRow barColor="#00BFBF" icon={<IcoReminder size={20}/>} title={r.title} meta={`Reminder \u00B7 ${isToday?'today':'tomorrow'}${t?' '+t:''}`} badge={t||'Today'} badgeBg="rgba(0,191,191,0.10)" badgeColor="#00BFBF" isReminder onDismiss={()=>handleDismissReminder(r.id)}/>
                  </TouchableOpacity>);
                })}
              </>)}
              {radarTodos.length>0&&(<>
                <View style={s.radarSection2Hdr}><Text style={s.radarSection2Label}>Needs attention</Text></View>
                {radarTodos.map((t:any)=>(
                  <TouchableOpacity key={t.id} onPress={()=>router.push({pathname:'/(tabs)/more',params:{initialPage:'todo',todoId:t.id}})} activeOpacity={0.8}>
                    <RadarRow barColor="#22C55E" icon={<IcoTodoBig size={20}/>} title={t.title} meta={t.due_label||'Overdue'} badge="urgent" badgeBg="rgba(224,0,124,0.08)" badgeColor="#E0007C"/>
                  </TouchableOpacity>
                ))}
              </>)}
              {radarEvents.length===0&&visibleReminders.length===0&&radarTodos.length===0&&(
                <View style={s.radarEmpty}><Text style={s.radarEmptyTxt}>All clear — nothing urgent on the radar {'\u2728'}</Text></View>
              )}
            </View>
          </View>

        </Animated.View>
      </ScrollView>

      {/* ASK ZAELI BAR — sticky */}
      <View style={[s.askBarWrap,{paddingBottom: insets.bottom + 4}]}>
        <TouchableOpacity style={s.askBar} onPress={()=>openChat('General')} activeOpacity={0.85}>
          <View style={s.askDiamondWrap}>
            <Text style={s.askDiamond}>{'\u2726'}</Text>
          </View>
          <Text style={s.askText}>Ask Zaeli anything...</Text>
          <TouchableOpacity style={s.askMic} onPress={()=>{}} activeOpacity={0.7}>
            <IcoMic/>
          </TouchableOpacity>
          <TouchableOpacity style={s.askSend} onPress={()=>openChat('General')} activeOpacity={0.85}>
            <IcoSend/>
          </TouchableOpacity>
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
}

const s=StyleSheet.create({
  hero:{backgroundColor:'#0057FF',paddingHorizontal:18,paddingTop:6,paddingBottom:20},
  heroOrbOuter:{position:'absolute',right:-70,top:-70,width:270,height:270,borderRadius:135,backgroundColor:'rgba(255,255,255,0.12)'},
  heroOrbInner:{position:'absolute',right:-30,top:-30,width:190,height:190,borderRadius:95,backgroundColor:'rgba(255,255,255,0.22)'},
  heroOrb2:{position:'absolute',right:32,top:68,width:105,height:105,borderRadius:52,backgroundColor:'rgba(255,255,255,0.14)'},
  topRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:4},
  logoWrap:{flexDirection:'row',alignItems:'center',gap:8},
  logoMark:{width:44,height:44,backgroundColor:'rgba(255,255,255,0.2)',borderRadius:14,alignItems:'center',justifyContent:'center'},
  logoWord:{fontFamily:'DMSerifDisplay_400Regular',fontSize:30,color:'#fff',letterSpacing:-0.5},
  topRight:{flexDirection:'row',alignItems:'center',gap:10},
  datePill:{flexDirection:'row',alignItems:'center',gap:6,backgroundColor:'rgba(255,255,255,0.12)',borderWidth:1,borderColor:'rgba(255,255,255,0.16)',borderRadius:14,paddingHorizontal:14,height:44},
  liveDotPill:{width:6,height:6,borderRadius:3,backgroundColor:'#00C97A'},
  datePillTxt:{fontFamily:'Poppins_600SemiBold',fontSize:13,color:'rgba(255,255,255,0.9)'},
  greetLine:{fontFamily:'DMSerifDisplay_400Regular',fontSize:24,color:'rgba(255,255,255,0.72)',letterSpacing:-0.5,lineHeight:28,marginTop:14,marginBottom:0},
  nameLine:{fontFamily:'DMSerifDisplay_400Regular',fontSize:36,color:'#fff',letterSpacing:-1.5,lineHeight:42,marginBottom:18},
  nameIcon:{fontSize:32},
  body:{backgroundColor:'#F7F7F7',flex:1,minHeight:600},
  zaeliCard:{backgroundColor:'#fff',borderRadius:22,shadowColor:'#000',shadowOpacity:0.10,shadowRadius:20,shadowOffset:{width:0,height:4},elevation:4,paddingHorizontal:16,paddingTop:14,paddingBottom:16,marginBottom:20},
  zaeliHead:{flexDirection:'row',alignItems:'center',gap:8,marginBottom:12},
  zaeliName:{fontFamily:'DMSerifDisplay_400Regular',fontSize:16,color:'#0A0A0A'},
  cardLiveDot:{width:6,height:6,borderRadius:3,backgroundColor:'#00C97A',marginLeft:1},
  zaeliTime:{marginLeft:'auto' as any,fontFamily:'Poppins_400Regular',fontSize:11,color:'rgba(0,0,0,0.3)'},
  briefSentence:{fontFamily:'Poppins_400Regular',fontSize:14,color:'#1A1A2E',lineHeight:22,marginBottom:7},
  briefSentenceLast:{fontFamily:'Poppins_400Regular',fontSize:14,color:'#1A1A2E',lineHeight:22,marginBottom:0},
  briefWrap:{marginBottom:16},
  loadingRow:{flexDirection:'row',alignItems:'center',gap:8,paddingVertical:10},
  loadingTxt:{fontFamily:'Poppins_400Regular',fontSize:13,color:'rgba(0,0,0,0.38)'},
  zaeliActions:{flexDirection:'row',gap:10},
  ctaPrimary:{flex:1,backgroundColor:'#E0007C',borderRadius:14,paddingVertical:13,alignItems:'center',justifyContent:'center'},
  ctaPrimaryTxt:{fontFamily:'Poppins_600SemiBold',fontSize:13,color:'#fff',textAlign:'center'},
  ctaGhost:{flex:1,backgroundColor:'rgba(0,0,0,0.055)',borderRadius:14,paddingVertical:13,alignItems:'center',justifyContent:'center',borderWidth:1.5,borderColor:'rgba(0,0,0,0.09)'},
  ctaGhostTxt:{fontFamily:'Poppins_500Medium',fontSize:13,color:'rgba(0,0,0,0.45)',textAlign:'center'},
  relaxedCard:{backgroundColor:'#fff',borderRadius:22,paddingHorizontal:16,paddingTop:14,paddingBottom:14,marginBottom:20,shadowColor:'#000',shadowOpacity:0.06,shadowRadius:12,shadowOffset:{width:0,height:3},elevation:2,gap:12},
  relaxedInner:{flexDirection:'row',alignItems:'flex-start',gap:10},
  relaxedAvatar:{width:28,height:28,borderRadius:9,backgroundColor:'#E8ECFF',alignItems:'center',justifyContent:'center',flexShrink:0,marginTop:1},
  relaxedSignoff:{fontFamily:'Poppins_400Regular',fontSize:13.5,color:'rgba(0,0,0,0.55)',lineHeight:21,flex:1},
  relaxedBtn:{backgroundColor:'rgba(0,87,255,0.08)',borderRadius:13,paddingVertical:12,alignItems:'center',justifyContent:'center'},
  relaxedBtnTxt:{fontFamily:'Poppins_600SemiBold',fontSize:13,color:'#0057FF',textAlign:'center' as any},

  // Tiles — Option C with footer bar
  tilesGrid:{flexDirection:'row',flexWrap:'wrap',gap:12,paddingHorizontal:18,paddingTop:20},
  tile:{backgroundColor:'#fff',borderRadius:18,borderWidth:1.5,borderColor:'rgba(0,0,0,0.06)',shadowColor:'#000',shadowOpacity:0.04,shadowRadius:8,shadowOffset:{width:0,height:2},elevation:1,position:'relative',overflow:'hidden',justifyContent:'space-between'},
  tilePip:{position:'absolute',top:10,right:10,width:8,height:8,borderRadius:4,backgroundColor:'#E0007C',zIndex:2},
  tileIconBox:{width:42,height:42,borderRadius:12,alignItems:'center',justifyContent:'center'},
  tileTopArea:{padding:14,flex:1,justifyContent:'space-between'},
  tileBottom:{gap:2,marginTop:8},
  tileLabel:{fontFamily:'Poppins_700Bold',fontSize:9,letterSpacing:1.2,textTransform:'uppercase',color:'rgba(0,0,0,0.28)'},
  tileVal:{fontFamily:'Poppins_700Bold',fontSize:17,color:'#0A0A0A',lineHeight:22},
  tileValWarn:{color:'#E0007C'},
  tileSub:{fontFamily:'Poppins_400Regular',fontSize:11,color:'rgba(0,0,0,0.38)'},
  tileSubCta:{color:'#0057FF',fontFamily:'Poppins_600SemiBold'},
  tileFooter:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:14,paddingVertical:8},
  tileFooterTxt:{fontFamily:'Poppins_700Bold',fontSize:10,letterSpacing:0.8,textTransform:'uppercase'},
  tileFooterArr:{fontFamily:'Poppins_700Bold',fontSize:12},

  // Radar
  radarSection:{paddingHorizontal:18,paddingTop:20,paddingBottom:24},
  radarHead:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:12},
  radarTitle:{fontFamily:'Poppins_700Bold',fontSize:16,color:'#0A0A0A'},
  radarLink:{fontFamily:'Poppins_600SemiBold',fontSize:13,color:'#0057FF'},
  radarBand:{backgroundColor:'#fff',borderRadius:20,overflow:'hidden',borderWidth:1.5,borderColor:'rgba(0,0,0,0.06)',shadowColor:'#000',shadowOpacity:0.04,shadowRadius:8,shadowOffset:{width:0,height:2},elevation:1},
  radarSection2Hdr:{paddingHorizontal:16,paddingTop:14,paddingBottom:6},
  radarSection2Label:{fontFamily:'Poppins_700Bold',fontSize:10,letterSpacing:1.5,textTransform:'uppercase',color:'rgba(0,0,0,0.28)'},
  radarRow:{flexDirection:'row',alignItems:'center',gap:14,paddingHorizontal:16,paddingVertical:14,borderBottomWidth:1,borderBottomColor:'rgba(0,0,0,0.05)'},
  radarBar:{width:3,borderRadius:2,alignSelf:'stretch',minHeight:36,flexShrink:0},
  radarIconWrap:{width:26,height:26,alignItems:'center',justifyContent:'center',flexShrink:0},
  radarContent:{flex:1,minWidth:0},
  radarRowTitle:{fontFamily:'Poppins_600SemiBold',fontSize:14,color:'#0A0A0A',lineHeight:20},
  radarMeta:{fontFamily:'Poppins_400Regular',fontSize:11,color:'rgba(0,0,0,0.50)',marginTop:2},
  radarBadge:{borderRadius:100,paddingHorizontal:10,paddingVertical:4,flexShrink:0},
  radarBadgeTxt:{fontFamily:'Poppins_700Bold',fontSize:11},
  dismissBtn:{width:24,height:24,borderRadius:12,backgroundColor:'rgba(0,0,0,0.07)',alignItems:'center',justifyContent:'center',flexShrink:0},
  dismissBtnTxt:{fontFamily:'Poppins_700Bold',fontSize:14,color:'rgba(0,0,0,0.32)',lineHeight:17},
  radarEmpty:{padding:22,alignItems:'center'},
  radarEmptyTxt:{fontFamily:'Poppins_400Regular',fontSize:14,color:'rgba(0,0,0,0.35)',textAlign:'center' as any},

  askBarWrap:{position:'absolute',bottom:0,left:0,right:0,paddingHorizontal:16,paddingTop:10,backgroundColor:'#F7F7F7',borderTopWidth:1,borderTopColor:'rgba(0,0,0,0.07)'},
  askBar:{backgroundColor:'#fff',borderRadius:22,paddingVertical:11,paddingHorizontal:14,flexDirection:'row',alignItems:'center',gap:8,borderWidth:1.5,borderColor:'rgba(0,0,0,0.10)',shadowColor:'#000',shadowOpacity:0.06,shadowRadius:12,shadowOffset:{width:0,height:2},elevation:2},
  askDiamondWrap:{width:20,alignItems:'center',justifyContent:'center'},
  askDiamond:{fontSize:15,color:'#0057FF'},
  askText:{flex:1,fontFamily:'Poppins_400Regular',fontSize:15,color:'rgba(0,0,0,0.28)'},
  askMic:{width:36,height:36,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(0,0,0,0.06)',borderRadius:11,flexShrink:0},
  askSend:{width:36,height:36,borderRadius:11,backgroundColor:'#0057FF',alignItems:'center',justifyContent:'center',flexShrink:0,shadowColor:'#0057FF',shadowOpacity:0.3,shadowRadius:6,shadowOffset:{width:0,height:2}},
});
