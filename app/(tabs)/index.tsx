import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { buildMemoryContext } from '../../lib/zaeli-memory';
import { generateBriefingInsight } from '../../lib/zaeli-persona';
import TodoCard, { Todo } from '../components/TodoCard';

const DUMMY_FAMILY_ID   = '00000000-0000-0000-0000-000000000001';
const DUMMY_MEMBER_NAME = 'Natalie';
const LATITUDE          = -27.4698;
const LONGITUDE         = 153.0251;

const DAYS_SHORT   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function getGreeting(h: number): string {
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}
function getGreetingIcon(h: number): string {
  if (h < 12) return '👋';
  if (h < 17) return '☀️';
  return '🌙';
}

const WMO: Record<number, string> = {
  0:'☀️',1:'🌤',2:'⛅',3:'☁️',45:'🌫',51:'🌦',61:'🌧',65:'🌧',80:'🌦',95:'⛈',
};

// ── ANIMATED WEATHER ICON ─────────────────────────────────────
function WeatherIcon({ icon }: { icon: string }) {
  const float = useRef(new Animated.Value(0)).current;
  const spin  = useRef(new Animated.Value(0)).current;
  const isSun = icon === '☀️';

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(float, { toValue:-4, duration:1800, easing:Easing.inOut(Easing.sin), useNativeDriver:true }),
      Animated.timing(float, { toValue:0,  duration:1800, easing:Easing.inOut(Easing.sin), useNativeDriver:true }),
    ])).start();
    if (isSun) {
      Animated.loop(Animated.timing(spin, { toValue:1, duration:8000, easing:Easing.linear, useNativeDriver:true })).start();
    }
  }, []);

  const rotate = spin.interpolate({ inputRange:[0,1], outputRange:['0deg','360deg'] });
  return (
    <Animated.Text style={[s.weatherIcon, { transform: isSun ? [{translateY:float},{rotate}] : [{translateY:float}] }]}>
      {icon}
    </Animated.Text>
  );
}

// ── STREAMING BRIEF ───────────────────────────────────────────
function StreamingText({ text, style }: { text:string; style?:any }) {
  const [displayed, setDisplayed] = useState('');
  const [cursor,    setCursor]    = useState(true);

  useEffect(() => {
    if (!text) return;
    setDisplayed('');
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(interval);
        setTimeout(() => setCursor(false), 1200);
      }
    }, 22);
    return () => clearInterval(interval);
  }, [text]);

  const renderParts = (str: string) => {
    const parts = str.split(/\*\*(.*?)\*\*/g);
    return parts.map((p, i) =>
      i % 2 === 1
        ? <Text key={i} style={{ color:'#fff', fontFamily:'Poppins_700Bold' }}>{p}</Text>
        : <Text key={i}>{p}</Text>
    );
  };

  return (
    <Text style={style}>
      {renderParts(displayed)}
      {cursor && displayed.length < (text?.length ?? 0) && (
        <Text style={{ color:'rgba(255,255,255,0.7)' }}>▋</Text>
      )}
    </Text>
  );
}

// ── TYPING DOT ────────────────────────────────────────────────
function TypingDot({ delay }: { delay:number }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.delay(delay),
      Animated.timing(a,{toValue:-5,duration:300,useNativeDriver:true}),
      Animated.timing(a,{toValue:0, duration:300,useNativeDriver:true}),
      Animated.delay(600),
    ])).start();
  },[]);
  return <Animated.View style={{width:7,height:7,borderRadius:3.5,backgroundColor:'rgba(0,0,0,0.2)',transform:[{translateY:a}]}}/>;
}

// ── PULSING AVATAR (briefing card) ───────────────────────────
function PulsingAvatar() {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.55)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.parallel([
        Animated.timing(scale,   {toValue:1.18, duration:900, easing:Easing.inOut(Easing.ease), useNativeDriver:true}),
        Animated.timing(opacity, {toValue:0,    duration:900, easing:Easing.in(Easing.ease),    useNativeDriver:true}),
      ]),
      Animated.parallel([
        Animated.timing(scale,   {toValue:1,    duration:0,   useNativeDriver:true}),
        Animated.timing(opacity, {toValue:0.55, duration:0,   useNativeDriver:true}),
      ]),
      Animated.delay(700),
    ])).start();
  }, []);
  return (
    <View style={{width:30,height:30,alignItems:'center',justifyContent:'center'}}>
      {/* Pulsing ring */}
      <Animated.View style={{
        position:'absolute', width:30, height:30, borderRadius:10,
        backgroundColor:'#0057FF',
        transform:[{scale}], opacity,
      }}/>
      {/* Static avatar */}
      <View style={{width:30,height:30,borderRadius:10,backgroundColor:'#0057FF',alignItems:'center',justifyContent:'center'}}>
        <Text style={{fontSize:15,color:'#fff'}}>✦</Text>
      </View>
    </View>
  );
}


function PulsingFAB({ onPress, bottom }: { onPress:()=>void; bottom:number }) {
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulse = (ring: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(ring, { toValue:1, duration:1200, easing:Easing.out(Easing.quad), useNativeDriver:true }),
          Animated.timing(ring, { toValue:0, duration:0,    useNativeDriver:true }),
        ])
      ).start();
    pulse(ring1, 0);
    pulse(ring2, 600);
  }, []);

  const ringStyle = (ring: Animated.Value) => ({
    position: 'absolute' as const,
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: '#0057FF',
    opacity: ring.interpolate({ inputRange:[0,0.3,1], outputRange:[0,0.35,0] }),
    transform: [{ scale: ring.interpolate({ inputRange:[0,1], outputRange:[1,1.7] }) }],
  });

  return (
    <View style={[s.fabWrap, { bottom }]}>
      <Animated.View style={ringStyle(ring1)} />
      <Animated.View style={ringStyle(ring2)} />
      <TouchableOpacity style={s.fab} onPress={onPress} activeOpacity={0.85}>
        <Text style={{ fontSize:22, color:'#fff' }}>✦</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── MAIN SCREEN ───────────────────────────────────────────────
export default function HomeScreen() {
  const insets  = useSafeAreaInsets();
  const router  = useRouter();
  const now     = new Date();
  const hour    = now.getHours();
  const dateStr = `${DAYS_SHORT[now.getDay()]} ${now.getDate()} ${MONTHS_SHORT[now.getMonth()]}`;

  const [weather,       setWeather]       = useState<{temp:number;icon:string}|null>(null);
  const [briefing,      setBriefing]      = useState('');
  const [loadingBrief,  setLoadingBrief]  = useState(false);
  const [briefingCard,  setBriefingCard]  = useState('');
  const [cardDismissed, setCardDismissed] = useState(false);
  const [events,        setEvents]        = useState<any[]>([]);
  const [missions,      setMissions]      = useState<any[]>([]);
  const [shopping,      setShopping]      = useState<any[]>([]);
  const [meal,          setMeal]          = useState<any|null>(null);
  const [todos,         setTodos]         = useState<any[]>([]);

  const heroFade  = useRef(new Animated.Value(0)).current;
  const heroSlide = useRef(new Animated.Value(-10)).current;
  const bodyFade  = useRef(new Animated.Value(0)).current;
  const bodySlide = useRef(new Animated.Value(14)).current;
  const cardFade  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(heroFade,  {toValue:1,duration:400,easing:Easing.out(Easing.quad),useNativeDriver:true}),
        Animated.timing(heroSlide, {toValue:0,duration:400,easing:Easing.out(Easing.quad),useNativeDriver:true}),
      ]),
      Animated.parallel([
        Animated.timing(bodyFade,  {toValue:1,duration:350,easing:Easing.out(Easing.quad),useNativeDriver:true}),
        Animated.timing(bodySlide, {toValue:0,duration:350,easing:Easing.out(Easing.quad),useNativeDriver:true}),
      ]),
    ]).start();
    fetchWeather();
    fetchData();

    const subscription = supabase
      .channel('todos-home')
      .on('postgres_changes', {
        event:'*', schema:'public', table:'todos',
        filter:`family_id=eq.${DUMMY_FAMILY_ID}`,
      }, () => {
        supabase.from('todos').select('*')
          .eq('family_id',DUMMY_FAMILY_ID).eq('status','active')
          .order('priority',{ascending:false}).limit(5)
          .then(({data}) => { if (data) setTodos(data); });
      })
      .subscribe();

    return () => { supabase.removeChannel(subscription); };
  }, []);

  const fetchWeather = async () => {
    try {
      const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${LATITUDE}&longitude=${LONGITUDE}&current_weather=true`);
      const d = await r.json();
      setWeather({temp:Math.round(d.current_weather.temperature), icon:WMO[d.current_weather.weathercode]||'🌤'});
    } catch { setWeather({temp:22,icon:'🌤'}); }
  };

  const fetchData = async () => {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const [evR,miR,shR,mlR,tdR] = await Promise.all([
        supabase.from('events').select('*').eq('family_id',DUMMY_FAMILY_ID).gte('start_time',todayStr).order('start_time').limit(5),
        supabase.from('missions').select('*').eq('family_id',DUMMY_FAMILY_ID).limit(20),
        supabase.from('shopping_items').select('*').eq('family_id',DUMMY_FAMILY_ID).eq('checked',false).limit(20),
        supabase.from('meal_plans').select('*').eq('family_id',DUMMY_FAMILY_ID).eq('day_key',todayStr).limit(1),
        supabase.from('todos').select('*').eq('family_id',DUMMY_FAMILY_ID).eq('status','active').order('priority',{ascending:false}).limit(5),
      ]);
      const evs = evR.data||[], mis = miR.data||[], m = mlR.data?.[0]||null;
      setEvents(evs); setMissions(mis); setShopping(shR.data||[]); setMeal(m); setTodos(tdR.data||[]);
      generateHeroBriefing(evs, mis, m);
      generateCard(evs, mis, m);
    } catch(e){ console.log(e); }
  };

  const generateHeroBriefing = async (evs:any[], mis:any[], m:any) => {
    setLoadingBrief(true);
    try {
      const ctx = `Today:${dateStr}. Events:${evs.map(e=>`${e.title} at ${e.start_time?.slice(11,16)}`).join(', ')||'none'}. Kids tasks remaining:${mis.filter((x:any)=>!x.completed_today).length}. Tonight:${m?.title||'not planned'}.`;
      const res = await fetch('https://api.anthropic.com/v1/messages',{
        method:'POST',
        headers:{'Content-Type':'application/json','x-api-key':process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY||'','anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
        body:JSON.stringify({
          model:'claude-sonnet-4-20250514',max_tokens:80,
          system:"You are Zaeli — warm, brilliant, sparkling. Anne Hathaway energy. Write 1-2 sentences (max 30 words) summarising the family's day in your voice. Be specific. Bold key info using **word**. No emojis. Sound alive, not like a notification.",
          messages:[{role:'user',content:ctx}],
        }),
      });
      const d = await res.json();
      setBriefing(d.content?.[0]?.text||'Have a wonderful day ahead!');
    } catch { setBriefing('Have a wonderful day ahead!'); }
    finally   { setLoadingBrief(false); }
  };

  const generateCard = async (evs:any[], mis:any[], m:any) => {
    try {
      const memoryCtx = await buildMemoryContext(DUMMY_FAMILY_ID);
      const ctx = `Today:${dateStr}. Events:${JSON.stringify(evs)}. Kids tasks:${JSON.stringify(mis)}. Tonight:${m?.title||'not planned'}. Member:${DUMMY_MEMBER_NAME}.${memoryCtx}`;
      const text = await generateBriefingInsight(ctx, 'home', 'mum');
      if (text) {
        setBriefingCard(text);
        Animated.timing(cardFade,{toValue:1,duration:400,useNativeDriver:true}).start();
      }
    } catch { /* silently skip */ }
  };

  const nextEvent = events[0];
  const jobsDone  = missions.filter((m:any)=>m.completed_today).length;
  const jobsTotal = missions.length||8;

  const DEMO_TODOS: Todo[] = [
    {id:'1',title:'Call school re: excursion forms',priority:'high',  status:'active',due_label:'Due today'},
    {id:'2',title:'Book dentist appointment',       priority:'normal',status:'active',due_label:'This week'},
    {id:'3',title:'Pick up dry cleaning',           priority:'med',   status:'active',due_label:'Today'},
    {id:'4',title:'Renew car rego',                 priority:'normal',status:'done',  due_label:'Done 8 Mar'},
  ];

  const focusItems: Todo[] = todos.length > 0
    ? todos.map((t:any)=>({id:t.id,title:t.title,priority:t.priority||'normal',status:t.status,due_label:t.due_label||t.due_date||''}))
    : DEMO_TODOS;

  const handleToggle = (id:string, newStatus:'active'|'done') => {
    setTodos(prev=>prev.map((t:any)=>t.id===id?{...t,status:newStatus}:t));
  };

  const TAB_H = Platform.OS==='ios'?82:64;

  return (
    <SafeAreaView style={{flex:1,backgroundColor:'#E0007C'}} edges={['top']}>
      <StatusBar style="light"/>

      <ScrollView style={{flex:1}} showsVerticalScrollIndicator={false} bounces>

        {/* ══ HERO — magenta ══════════════════════════════════ */}
        <Animated.View style={[s.hero,{opacity:heroFade,transform:[{translateY:heroSlide}]}]}>
          <View style={s.heroOrb}/>

          <View style={s.topRow}>
            <View style={s.logoWrap}>
              <View style={s.logoStar}>
                <Text style={{fontSize:24,color:'#fff'}}>✦</Text>
              </View>
              <Text style={s.logoWord}>
                z<Text style={{color:'#FFE500'}}>a</Text>el<Text style={{color:'#FFE500'}}>i</Text>
              </Text>
            </View>
            {weather && (
              <View style={s.weatherWrap}>
                <WeatherIcon icon={weather.icon}/>
                <Text style={s.weatherTemp}>{weather.temp}°C</Text>
                <Text style={s.weatherDate}>{dateStr}</Text>
              </View>
            )}
          </View>

          <Text style={s.greetLine}>{getGreeting(hour)}</Text>
          <Text style={s.nameLine}>
            {DUMMY_MEMBER_NAME} <Text style={s.nameIcon}>{getGreetingIcon(hour)}</Text>
          </Text>

          <View style={{minHeight:52,marginTop:10}}>
            {loadingBrief ? (
              <View style={{flexDirection:'row',alignItems:'center',gap:8,marginTop:4}}>
                <Text style={{fontSize:13,fontFamily:'Poppins_400Regular',color:'rgba(255,255,255,0.5)'}}>Zaeli is thinking</Text>
                <View style={{flexDirection:'row',gap:3}}>{[0,1,2].map(i=><TypingDot key={i} delay={i*200}/>)}</View>
              </View>
            ) : (
              <StreamingText text={briefing||'Loading your day…'} style={s.brief}/>
            )}
          </View>
        </Animated.View>

        {/* ══ BODY ════════════════════════════════════════════ */}
        <Animated.View style={[s.body,{opacity:bodyFade,transform:[{translateY:bodySlide}]}]}>

          {/* ── Direction B Briefing Card — blue ── */}
          {!cardDismissed && briefingCard ? (
            <Animated.View style={[s.briefingCard,{opacity:cardFade}]}>
              <View style={s.briefingHeader}>
                <PulsingAvatar/>
                <Text style={s.briefingName}>Zaeli</Text>
                <Text style={s.briefingTime}>
                  {hour}:{String(now.getMinutes()).padStart(2,'0')} {hour<12?'am':'pm'}
                </Text>
              </View>
              <View style={s.briefingBody}>
                <Text style={s.briefingMsg}>{briefingCard}</Text>
                <View style={s.briefingBtns}>
                  <TouchableOpacity style={s.btnPrimary} onPress={()=>router.push('/zaeli-chat')} activeOpacity={0.85}>
                    <Text style={s.btnPrimaryTxt}>Let's talk it through</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.btnGhost} onPress={()=>setCardDismissed(true)} activeOpacity={0.7}>
                    <Text style={s.btnGhostTxt}>I'm sorted, thanks</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Animated.View>
          ) : null}

          {/* 4-tile grid */}
          <View style={s.grid}>
            <TouchableOpacity style={s.block} onPress={()=>router.push('/(tabs)/calendar')} activeOpacity={0.8}>
              <Text style={s.bEmoji}>📅</Text>
              <Text style={s.bLbl}>NEXT UP</Text>
              <Text style={s.bVal} numberOfLines={1}>{nextEvent?nextEvent.title:'Free day'}</Text>
              <Text style={s.bSub}>{nextEvent?(nextEvent.start_time?.slice(11,16)||'Today'):'Nothing scheduled'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={s.block} onPress={()=>router.push('/(tabs)/chores')} activeOpacity={0.8}>
              <Text style={s.bEmoji}>🌟</Text>
              <Text style={s.bLbl}>KIDS TODAY</Text>
              <Text style={s.bVal}>{jobsDone} of {jobsTotal}</Text>
              <Text style={s.bSub}>jobs done</Text>
            </TouchableOpacity>

            <TouchableOpacity style={s.block} onPress={()=>router.push('/(tabs)/shopping')} activeOpacity={0.8}>
              <Text style={s.bEmoji}>🛒</Text>
              <Text style={s.bLbl}>SHOPPING</Text>
              <Text style={s.bVal}>{shopping.length||0} items</Text>
              <Text style={s.bSub}>{shopping.length>0?'Shop run needed':'All good!'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={s.block} onPress={()=>router.push('/(tabs)/mealplanner')} activeOpacity={0.8}>
              <Text style={s.bEmoji}>🍽</Text>
              <Text style={s.bLbl}>TONIGHT</Text>
              <Text style={s.bVal} numberOfLines={1}>{meal?meal.title:'Not planned'}</Text>
              <Text style={[s.bSub,!meal&&{color:'#FF8C00'}]}>{meal?`${meal.prep_mins||30} min`:'Tap to plan'}</Text>
            </TouchableOpacity>
          </View>

          {/* Today's Focus */}
          <View style={s.focusSection}>
            <View style={s.focusHdr}>
              <Text style={s.focusTitle}>Today's Focus</Text>
              <TouchableOpacity onPress={()=>router.push('/(tabs)/more')}>
                <Text style={s.focusAdd}>+ Add</Text>
              </TouchableOpacity>
            </View>
            {focusItems.map((t:Todo)=>(
              <TouchableOpacity key={t.id} onPress={()=>router.push('/(tabs)/more')} activeOpacity={0.85}>
                <TodoCard todo={t} onToggle={handleToggle}/>
              </TouchableOpacity>
            ))}
          </View>

          <View style={{height:TAB_H+insets.bottom+24}}/>
        </Animated.View>
      </ScrollView>

      <PulsingFAB onPress={()=>router.push('/zaeli-chat')} bottom={TAB_H+10}/>
    </SafeAreaView>
  );
}

// ── STYLES ────────────────────────────────────────────────────
const s = StyleSheet.create({

  hero:    {backgroundColor:'#E0007C',paddingHorizontal:18,paddingTop:6,paddingBottom:24,overflow:'hidden'},
  heroOrb: {position:'absolute',right:-40,top:-40,width:180,height:180,borderRadius:90,backgroundColor:'rgba(255,255,255,0.06)'},

  topRow:     {flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start',marginBottom:4},
  logoWrap:   {flexDirection:'row',alignItems:'center',gap:8},
  logoStar:   {width:44,height:44,backgroundColor:'rgba(255,255,255,0.2)',borderRadius:14,alignItems:'center',justifyContent:'center'},
  logoWord:   {fontFamily:'DMSerifDisplay_400Regular',fontSize:30,color:'#fff',letterSpacing:-0.5},

  weatherWrap:{alignItems:'flex-end',gap:2},
  weatherIcon:{fontSize:30},
  weatherTemp:{fontSize:15,fontFamily:'Poppins_600SemiBold',color:'rgba(255,255,255,0.85)'},
  weatherDate:{fontSize:12,fontFamily:'Poppins_400Regular', color:'rgba(255,255,255,0.55)'},

  greetLine:{fontFamily:'DMSerifDisplay_400Regular',fontSize:34,color:'rgba(255,255,255,0.75)',letterSpacing:-0.5,lineHeight:38,marginBottom:0},
  nameLine: {fontFamily:'DMSerifDisplay_400Regular',fontSize:44,color:'#fff',letterSpacing:-1.5,lineHeight:50},
  nameIcon: {fontSize:32},
  brief:    {fontFamily:'Poppins_400Regular',fontSize:15,color:'rgba(255,255,255,0.85)',lineHeight:25},

  body:{backgroundColor:'#F7F7F7'},

  /* Direction B Briefing Card */
  briefingCard:{
    margin:18,marginBottom:6,
    backgroundColor:'#fff',borderRadius:20,
    borderWidth:1.5,borderColor:'rgba(0,87,255,0.15)',
    shadowColor:'#0057FF',shadowOpacity:0.08,shadowRadius:16,shadowOffset:{width:0,height:4},elevation:3,
    overflow:'hidden',
  },
  briefingHeader:{
    flexDirection:'row',alignItems:'center',gap:10,
    paddingHorizontal:16,paddingTop:14,paddingBottom:11,
    borderBottomWidth:1,borderBottomColor:'rgba(0,87,255,0.08)',
    backgroundColor:'rgba(0,87,255,0.03)',
  },
  briefingName:{fontFamily:'Poppins_700Bold',fontSize:13,color:'#0A0A0A',flex:1},
  briefingTime:{fontFamily:'Poppins_400Regular',fontSize:10,color:'rgba(0,0,0,0.28)'},
  briefingBody:{padding:16,paddingTop:14},
  briefingMsg: {fontFamily:'Poppins_400Regular',fontSize:14,color:'#0A0A0A',lineHeight:22,marginBottom:14},
  briefingBtns:{flexDirection:'row',gap:8},

  btnPrimary:   {flex:1,backgroundColor:'#0057FF',borderRadius:12,paddingVertical:11,alignItems:'center',justifyContent:'center'},
  btnPrimaryTxt:{fontFamily:'Poppins_600SemiBold',fontSize:13,color:'#fff',textAlign:'center'},
  btnGhost:     {flex:1,backgroundColor:'rgba(0,0,0,0.05)',borderRadius:12,paddingVertical:11,alignItems:'center',justifyContent:'center'},
  btnGhostTxt:  {fontFamily:'Poppins_600SemiBold',fontSize:13,color:'rgba(0,0,0,0.45)',textAlign:'center'},

  grid: {flexDirection:'row',flexWrap:'wrap',gap:12,paddingHorizontal:18,paddingTop:16,paddingBottom:4},
  block:{width:'47.5%',backgroundColor:'#fff',borderRadius:18,borderWidth:1.5,borderColor:'rgba(0,0,0,0.07)',padding:20,shadowColor:'#000',shadowOpacity:0.04,shadowRadius:8,shadowOffset:{width:0,height:2},elevation:1},
  bEmoji:{fontSize:24,marginBottom:8},
  bLbl:  {fontFamily:'Poppins_700Bold',fontSize:10,textTransform:'uppercase',letterSpacing:1,color:'rgba(0,0,0,0.20)',marginBottom:5},
  bVal:  {fontFamily:'Poppins_700Bold',fontSize:19,color:'#0A0A0A',lineHeight:24},
  bSub:  {fontFamily:'Poppins_400Regular',fontSize:12,color:'rgba(0,0,0,0.45)',marginTop:4},

  focusSection:{paddingHorizontal:18,paddingTop:18},
  focusHdr:    {flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:12},
  focusTitle:  {fontFamily:'Poppins_700Bold',fontSize:16,color:'#0A0A0A'},
  focusAdd:    {fontFamily:'Poppins_600SemiBold',fontSize:14,color:'#0057FF'},

  fabWrap:{position:'absolute',right:18,width:52,height:52,alignItems:'center',justifyContent:'center',zIndex:99},
  fab:    {width:52,height:52,borderRadius:16,backgroundColor:'#0057FF',alignItems:'center',justifyContent:'center',shadowColor:'#0057FF',shadowOpacity:0.5,shadowRadius:16,shadowOffset:{width:0,height:6},elevation:10},
});