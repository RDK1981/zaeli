import { useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated, Easing, Platform, ScrollView,
  StyleSheet, Text, TouchableOpacity, View, useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { buildMemoryContext } from '../../lib/zaeli-memory';

const DUMMY_FAMILY_ID   = '00000000-0000-0000-0000-000000000001';
const DUMMY_MEMBER_NAME = 'Natalie';
const LATITUDE          = -27.4698;
const LONGITUDE         = 153.0251;
const DAYS_SHORT   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const WMO: Record<number,string> = {0:'☀️',1:'🌤',2:'⛅',3:'☁️',45:'🌫',51:'🌦',61:'🌧',65:'🌧',80:'🌦',95:'⛈'};

// ── TIME-FRAME & DINNER LOGIC ──────────────────────────────────
function getTimeFrame(h:number):'morning'|'afternoon'|'evening'|'night' {
  if(h>=6&&h<12) return 'morning';
  if(h>=12&&h<17) return 'afternoon';
  if(h>=17&&h<21) return 'evening';
  return 'night';
}
function getDinnerInstruction(h:number,tm:any,tmr:any):string {
  if(h>=21) return tmr?'Do NOT mention dinner at all.':'Do NOT mention dinner tonight. If content is light, one gentle mention of tomorrow\'s dinner is acceptable.';
  if(h>=19) return tmr?'Tonight dinner window passed. Do not mention dinner.':'Tonight dinner window passed. Mention tomorrow\'s dinner is not planned if relevant.';
  if(h>=16) return tm?'Tonight\'s dinner is planned. Do not mention it.':'PRIORITY: Tonight\'s dinner is NOT planned — mention it, offer ideas. CTA = meal suggestions.';
  return tm?'Tonight\'s dinner is planned. Do not mention it.':'Mention tonight\'s dinner is not yet planned if relevant.';
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

// ── ANIMATED WEATHER ICON ──────────────────────────────────────
function WeatherIcon({icon}:{icon:string}) {
  const float=useRef(new Animated.Value(0)).current;
  const spin=useRef(new Animated.Value(0)).current;
  const isSun=icon==='☀️';
  useEffect(()=>{
    Animated.loop(Animated.sequence([
      Animated.timing(float,{toValue:-4,duration:1800,easing:Easing.inOut(Easing.sin),useNativeDriver:true}),
      Animated.timing(float,{toValue:0,duration:1800,easing:Easing.inOut(Easing.sin),useNativeDriver:true}),
    ])).start();
    if(isSun) Animated.loop(Animated.timing(spin,{toValue:1,duration:8000,easing:Easing.linear,useNativeDriver:true})).start();
  },[]);
  const rotate=spin.interpolate({inputRange:[0,1],outputRange:['0deg','360deg']});
  return <Animated.Text style={[s.weatherIcon,{transform:isSun?[{translateY:float},{rotate}]:[{translateY:float}]}]}>{icon}</Animated.Text>;
}

// ── TYPING DOTS (loading state) ────────────────────────────────
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

// ── PULSING AVATAR ─────────────────────────────────────────────
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

// ── STREAMING BRIEF TEXT (typewriter effect) ───────────────────
function StreamingBriefText({text,style,boldStyle}:{text:string;style?:any;boldStyle?:any}) {
  const [displayed,setDisplayed]=useState('');
  const [cursor,setCursor]=useState(true);
  useEffect(()=>{
    if(!text){setDisplayed('');return;}
    setDisplayed('');
    setCursor(true);
    let i=0;
    const iv=setInterval(()=>{
      i++;
      setDisplayed(text.slice(0,i));
      if(i>=text.length){clearInterval(iv);setTimeout(()=>setCursor(false),1200);}
    },18);
    return ()=>clearInterval(iv);
  },[text]);
  // Render with bold support
  const parts=displayed.split(/\*\*(.*?)\*\*/g);
  return (
    <Text style={style}>
      {parts.map((p,i)=>i%2===1?<Text key={i} style={boldStyle}>{p}</Text>:<Text key={i}>{p}</Text>)}
      {cursor&&displayed.length<(text?.length??0)&&<Text style={{color:'rgba(0,0,0,0.35)'}}>{'▋'}</Text>}
    </Text>
  );
}

// ── ONE ANIMATED SENTENCE — mounts fresh each time ──
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
      {parts.map((p,j)=>j%2===1
        ?<Text key={j} style={boldStyle}>{p}</Text>
        :<Text key={j}>{p}</Text>
      )}
    </Animated.Text>
  );
}

// ── ANIMATED BRIEF SENTENCES — remounts each child when text changes ──
function AnimatedBriefSentences({text,sentenceStyle,sentenceLastStyle,boldStyle}:{
  text:string;sentenceStyle:any;sentenceLastStyle:any;boldStyle:any;
}) {
  const sentences=text.split(/\n+/).filter(s=>s.trim().length>0);
  if(sentences.length===0) return null;
  return (
    <>
      {sentences.map((sentence,i)=>(
        <AnimSentence
          key={`${text.slice(0,20)}-${i}`}
          sentence={sentence}
          delay={i*230}
          isLast={i===sentences.length-1}
          sentenceStyle={sentenceStyle}
          sentenceLastStyle={sentenceLastStyle}
          boldStyle={boldStyle}
        />
      ))}
    </>
  );
}


function RadarRow({barColor,icon,title,meta,badge,badgeBg,badgeColor,isReminder,onDismiss}:{
  barColor:string;icon:string;title:string;meta:string;
  badge:string;badgeBg:string;badgeColor:string;
  isReminder?:boolean;onDismiss?:()=>void;
}) {
  return (
    <View style={s.radarRow}>
      <View style={[s.radarBar,{backgroundColor:barColor}]}/>
      <Text style={s.radarIcon}>{icon}</Text>
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

// ── MAIN SCREEN ────────────────────────────────────────────────
export default function HomeScreen() {
  const insets=useSafeAreaInsets();
  const router=useRouter();

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

  const [weather,setWeather]=useState<{temp:number;icon:string}|null>(null);
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
  const [loadingBrief,setLoadingBrief]=useState(false);
  const [cardDismissed,setCardDismissed]=useState(false);
  const [showRelaxed,setShowRelaxed]=useState(false);

  const heroFade=useRef(new Animated.Value(0)).current;
  const heroSlide=useRef(new Animated.Value(-10)).current;
  const bodyFade=useRef(new Animated.Value(0)).current;
  const bodySlide=useRef(new Animated.Value(14)).current;
  const cardFade=useRef(new Animated.Value(0)).current;
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
    fetchWeather();
    fetchData();
    const sub=supabase.channel('home-todos')
      .on('postgres_changes',{event:'*',schema:'public',table:'todos',filter:`family_id=eq.${DUMMY_FAMILY_ID}`},
        ()=>{supabase.from('todos').select('*').eq('family_id',DUMMY_FAMILY_ID).eq('status','active').order('priority',{ascending:false}).limit(10).then(({data})=>{if(data)setTodos(data);});})
      .subscribe();
    return ()=>{supabase.removeChannel(sub);};
  },[]);

  useFocusEffect(useCallback(()=>{
    const elapsed=Date.now()-lastBriefAt.current;
    if(elapsed>30*60*1000&&!cardDismissed) fetchData();
  },[cardDismissed]));

  const fetchWeather=async()=>{
    try{
      const r=await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${LATITUDE}&longitude=${LONGITUDE}&current_weather=true`);
      const d=await r.json();
      setWeather({temp:Math.round(d.current_weather.temperature),icon:WMO[d.current_weather.weathercode]||'🌤'});
    }catch{setWeather({temp:22,icon:'🌤'});}
  };

  const fetchData=async()=>{
    try{
      // Compute yesterday for callback context
      const yesterdayDate=new Date(now); yesterdayDate.setDate(now.getDate()-1);
      const yesterdayStr=`${yesterdayDate.getFullYear()}-${String(yesterdayDate.getMonth()+1).padStart(2,'0')}-${String(yesterdayDate.getDate()).padStart(2,'0')}`;

      const[evR,pastEvR,shR,mlR,tmR,tdR,doneR,ystMlR]=await Promise.all([
        supabase.from('events').select('*').eq('family_id',DUMMY_FAMILY_ID).gte('date',localDateStr).order('date').order('start_time').limit(15),
        supabase.from('events').select('*').eq('family_id',DUMMY_FAMILY_ID).gte('date',yesterdayStr).lt('date',localDateStr).order('start_time',{ascending:true}).limit(5),
        supabase.from('shopping_items').select('*').eq('family_id',DUMMY_FAMILY_ID).eq('checked',false).limit(30),
        supabase.from('meal_plans').select('*').eq('family_id',DUMMY_FAMILY_ID).eq('day_key',localDateStr).limit(1),
        supabase.from('meal_plans').select('*').eq('family_id',DUMMY_FAMILY_ID).eq('day_key',tomorrowStr).limit(1),
        supabase.from('todos').select('*').eq('family_id',DUMMY_FAMILY_ID).eq('status','active').order('priority',{ascending:false}).limit(10),
        supabase.from('todos').select('*').eq('family_id',DUMMY_FAMILY_ID).eq('status','done').order('created_at',{ascending:false}).limit(3),
        supabase.from('meal_plans').select('*').eq('family_id',DUMMY_FAMILY_ID).eq('day_key',yesterdayStr).limit(1),
      ]);
      const evs=evR.data||[];
      const pastEvs=pastEvR.data||[];
      const tdos=tdR.data||[];
      const doneTodos=doneR.data||[];
      const tm=mlR.data?.[0]||null;
      const tmr=tmR.data?.[0]||null;
      const ystMeal=ystMlR.data?.[0]||null;

      // FIX #6: Reminders detection — check event_type field OR notes OR title
      // "Test 1" was being filtered as a calendar event because its title doesn't say "reminder"
      // Now we check event_type column first, then fall back to title/notes heuristic
      const cals=evs.filter((e:any)=>{
        const type=(e.event_type||'').toLowerCase();
        if(type==='reminder') return false;
        if(type&&type!=='reminder') return true;
        // No event_type — fall back to title/notes heuristic
        const titleLower=(e.title||'').toLowerCase();
        const notesLower=(e.notes||'').toLowerCase();
        return !notesLower.includes('reminder')&&!titleLower.includes('reminder');
      });
      const rems=evs.filter((e:any)=>{
        const type=(e.event_type||'').toLowerCase();
        if(type==='reminder') return true;
        if(type&&type!=='reminder') return false;
        const titleLower=(e.title||'').toLowerCase();
        const notesLower=(e.notes||'').toLowerCase();
        return notesLower.includes('reminder')||titleLower.includes('reminder');
      });

      const sh=shR.data||[];
      setEvents(cals);
      setReminders(rems);
      setShopping(sh);
      setTodayMeal(tm);
      setTomorrowMeal(tmr);
      setTodos(tdos);
      generateBrief(evs,tdos,tm,tmr,sh,pastEvs,doneTodos,ystMeal);
      lastBriefAt.current=Date.now();
    }catch(e){console.log('fetchData:',e);}
  };

  const generateBrief=async(evs:any[],tdos:any[],tm:any,tmr:any,sh:any[]=[],pastEvs:any[]=[],doneTodos:any[]=[],ystMeal:any=null)=>{
    setLoadingBrief(true);
    // Reset streaming text so typewriter re-runs on each generation
    setBriefText('');
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

      const systemPrompt=`You are Zaeli — warm, brilliant, and completely magnetic. Think Anne Hathaway energy: funny, glamorous, caring, utterly charming. Australian warmth — real and unpretentious, never performative. You are the switched-on sister who lights up every room and has quietly already sorted three things before anyone else noticed there was a problem. Families brag about you to their neighbours. That is the bar.

You are writing the home screen brief for ${DUMMY_MEMBER_NAME}. This is the first thing she sees when she opens the app. It should make her smile before she's finished reading it. It should make her feel seen, supported, and like someone brilliant has quietly got her back.

You are a HELPER and SUPPORTER first. You notice things warmly — you never nag, never alarm, never demand. When something needs attention, you offer to handle it like a brilliant friend would: lightly, specifically, with a wink.

── BRIEF STRUCTURE (max 4 sentences, minimum 2) ──

SENTENCE 1 — CALLBACK (optional but powerful):
Reference something real that just happened or was in the data. A meal, an event, a completed task. One warm, alive sentence that proves you were paying attention — not a status report, a human moment.
GREAT: "Hope the lasagne went down a treat last night!" / "So glad Jack's soccer registration is finally ticked off — that one had been lurking." / "Hope Poppy had the best time at dance tonight."
AVOID: "I see you completed 2 tasks." (robotic) / "You had pasta." (just stating facts) / "Good morning!" (that's a greeting, not a callback)
If there is genuinely nothing recent to reference — SKIP and open with sentence 2. Do not fabricate.

SENTENCE 2 — WHAT'S COMING THAT MATTERS:
The single most important upcoming event or deadline. Be specific: name, time, person. Warm and light — she's in capable hands.
GREAT: "Poppy's swimming lesson is at **4pm** today — plenty of time." / "Big one tomorrow — **accountant call at 9am**."
AVOID: "You have a meeting." / "There are some upcoming events." / vague generalities.

SENTENCE 3 — WHAT'S QUIETLY SLIPPING:
1–2 things that are overdue, at risk, or quietly being forgotten. This is where you earn deep trust — you noticed so she didn't have to. Deliver it like a brilliant friend flagging it over coffee, not a productivity app issuing a warning.
GREAT: "The school excursion slip has been sitting there a little while — worth a quick signature today." / "**Calling Mum** has been on the list since Monday — she'd love to hear from you."
AVOID: "You have overdue tasks." / "Several things need attention." / anything that sounds like a task manager.

SENTENCE 4 — THE OFFER (always ends the brief):
One warm, specific question offering concrete help — right now, effortlessly. This is the offer, not a CTA.
GREAT: "Want me to sort dinner ideas while you have your coffee?" / "Want me to draft that school note so it's ready to send?" / "Shall I help knock these two off the list before the morning rush?"
AVOID: Anything sequential, demanding, or that sounds like a checklist.

── TONE ──
- Warm, alive, a little sparkly. Like a message from someone you genuinely love hearing from.
- Her cheekiness surfaces occasionally — a slightly grand word, a deadpan aside, a light mock-formality. Use it once if the moment genuinely calls for it. Never forced.
- Bold key info **like this**: names, times, specific items. Max 3 bolds.
- Never start with "I".
- Never nag. Never alarm. Never list problems — offer solutions.
- Never vague. "A few things need attention" is not Zaeli.
- No hollow filler. Every word earns its place.

── CAPABILITY RULES — CRITICAL ──
- Zaeli CAN: draft messages, emails, notes, texts, suggest dinner ideas, add to shopping lists, find calendar gaps, draft letters or school notes.
- Zaeli CANNOT make phone calls. NEVER say "I'll call..." or "calling the school". NEVER show [initiating call...]. This is not possible.
- Zaeli CANNOT send messages autonomously. She drafts them for the user to send.
- If something requires a phone call, offer to draft a message or help the user know what to say instead.

── DINNER RULE ──
${dinnerRule}

── TIME ──
${timeStr} on ${dateStr}. Frame: ${timeFrame}. Tomorrow: ${tomorrowStr}.

── CTA LABEL ──
The button label is the natural answer to the question you just asked. Max 4 words. Human and warm.
"Want me to sort dinner ideas?" → "Yes please, sort it"
"Want me to draft that school note?" → "Draft it for me"
"Shall I help knock these off?" → "Yes, let's do it"
"Want me to check what's needed?" → "Let's sort the week"
Fallback: "Let's talk it through"

── DISMISSED SIGN-OFF ──
1–2 sentences. Zaeli warmly steps back, references 1–2 specific things from the brief she just wrote, leaves the door open. Like a friend saying "no worries — shout if you need me to sort X or Y!"
GREAT: "No worries! Shout if you need help drafting that school note or sorting dinner tomorrow — I've got you! 💛"
AVOID: "Still here if you need me." (too generic)

RESPOND WITH JSON ONLY — no markdown, no backticks, no preamble:
{"brief":"full brief text with sentences separated by newlines","cta":"button label","signoff":"dismissed card text"}`;

      const ctx=`Family member: ${DUMMY_MEMBER_NAME}. Today: ${localDateStr} (${dateStr}). Tomorrow: ${tomorrowStr}. Current time: ${timeStr}.
RECENT PAST EVENTS (last 24h — use for callback sentence): ${pastEvs.length>0?JSON.stringify(pastEvs):'none'}.
RECENTLY COMPLETED TASKS (use for callback sentence): ${doneTodos.length>0?JSON.stringify(doneTodos):'none'}.
YESTERDAY'S DINNER (ideal callback if present): ${ystMeal?ystMeal.title:'none'}.
Upcoming events today+future: ${JSON.stringify(evs.slice(0,6))}.
Urgent todos: ${JSON.stringify(urgentTodos.slice(0,4))}.
All active todos: ${JSON.stringify(tdos.slice(0,5))}.
Tonight meal: ${tm?.title||'not planned'}. Tomorrow meal: ${tmr?.title||'not planned'}. Shopping items pending: ${sh.length}.${memCtx}`;

      const res=await fetch('https://api.anthropic.com/v1/messages',{
        method:'POST',
        headers:{'Content-Type':'application/json','x-api-key':process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY||'','anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
        body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:500,system:systemPrompt,messages:[{role:'user',content:ctx}]}),
      });
      const d=await res.json();
      const raw=d.content?.[0]?.text||'';
      const clean=raw.replace(/```json|```/g,'').trim();
      try{
        const parsed=JSON.parse(clean);
        if(parsed.brief){
          Animated.timing(cardFade,{toValue:1,duration:400,useNativeDriver:true}).start();
          setBriefCta(parsed.cta||"Let's talk it through");
          setBriefSignoff(parsed.signoff||'');
          // Small delay so card fades in before typewriter starts
          setTimeout(()=>setBriefText(parsed.brief),200);
          return;
        }
      }catch{
        if(raw){
          Animated.timing(cardFade,{toValue:1,duration:400,useNativeDriver:true}).start();
          setBriefCta("Let's talk it through");
          setTimeout(()=>setBriefText(raw),200);
          return;
        }
      }
      Animated.timing(cardFade,{toValue:1,duration:400,useNativeDriver:true}).start();
      setBriefCta(fallback.cta);
      setTimeout(()=>setBriefText(fallback.text),200);
    }catch(e){
      console.log('generateBrief:',e);
      Animated.timing(cardFade,{toValue:1,duration:400,useNativeDriver:true}).start();
      setBriefCta(fallback.cta);
      setTimeout(()=>setBriefText(fallback.text),200);
    }finally{setLoadingBrief(false);}
  };

  const handleDismiss=()=>{
    Animated.timing(cardFade,{toValue:0,duration:300,useNativeDriver:true}).start(()=>{
      setCardDismissed(true);
      setShowRelaxed(true);
      Animated.timing(relaxedFade,{toValue:1,duration:350,useNativeDriver:true}).start();
    });
  };
  const handleDismissReminder=(id:string)=>setDismissedReminders(prev=>new Set([...prev,id]));
  const openChat=(channel='General',seed?:string)=>router.push({
    pathname:'/(tabs)/zaeli-chat',
    params:{channel,returnTo:'/(tabs)/',seedMessage:seed||''},
  });

  const TAB_H=Platform.OS==='ios'?82:64;
  const {width:screenWidth}=useWindowDimensions();
  // Exact square tile: full width minus horizontal padding on both sides, minus gap between tiles, divided by 2
  const TILE_PAD=18; const TILE_GAP=12;
  const tileSize=Math.floor((screenWidth-TILE_PAD*2-TILE_GAP)/2);
  const urgentCount=todos.filter((t:any)=>t.priority==='high'||t.priority==='urgent').length;
  const visibleReminders=reminders.filter((r:any)=>!dismissedReminders.has(r.id));
  const radarEvents=events.filter((e:any)=>(e.date||'')>=localDateStr).slice(0,3);
  const radarTodos=todos.filter((t:any)=>t.priority==='high'||t.priority==='urgent').slice(0,2);
  const mealDisplay=(timeFrame==='night'||hour>=21)?tomorrowMeal:todayMeal;
  const mealLabel=(timeFrame==='night'||hour>=21)?'Tomorrow':'Tonight';

  return (
    <SafeAreaView style={{flex:1,backgroundColor:'#0057FF'}} edges={['top']}>
      <StatusBar style="light"/>
      <ScrollView style={{flex:1}} showsVerticalScrollIndicator={false} bounces>

        {/* ── HERO ── */}
        <Animated.View style={[s.hero,{opacity:heroFade,transform:[{translateY:heroSlide}]}]}>
          <View style={s.heroOrbOuter}/>
          <View style={s.heroOrbInner}/>
          <View style={s.heroOrb2}/>
          {/* Logo + weather row */}
          <View style={s.topRow}>
            <View style={s.logoWrap}>
              <View style={s.logoMark}><Text style={{fontSize:22,color:'#fff'}}>{'\u2726'}</Text></View>
              <Text style={s.logoWord}>{'z'}<Text style={{color:'#FFE500'}}>{'a'}</Text>{'el'}<Text style={{color:'#FFE500'}}>{'i'}</Text></Text>
            </View>
            {weather&&(
              <View style={s.weatherWrap}>
                <WeatherIcon icon={weather.icon}/>
                <Text style={s.weatherTemp}>{weather.temp}{'\u00B0'}C</Text>
                <Text style={s.weatherDate}>{dateStr}</Text>
              </View>
            )}
          </View>
          {/* Greeting — matches original V6 spacing */}
          <Text style={s.greetLine}>{getGreeting(hour)}</Text>
          <Text style={s.nameLine}>{DUMMY_MEMBER_NAME} <Text style={s.nameIcon}>{getGreetingIcon(hour)}</Text></Text>

          {/* ── ZAELI BRIEF CARD — inside hero, white, fully rounded ── */}
          {!cardDismissed?(
            <Animated.View style={[s.zaeliCard,{opacity:cardFade}]}>
              <View style={s.zaeliHead}>
                <PulsingAvatar size={28}/>
                <Text style={s.zaeliName}>
                  {'Z'}<Text style={{color:'#E0007C'}}>{'a'}</Text>{'el'}<Text style={{color:'#E0007C'}}>{'i'}</Text>
                </Text>
                <View style={s.liveDot}/>
                <Text style={s.zaeliTime}>{timeStr}</Text>
              </View>
              {loadingBrief?(
                <View style={s.loadingRow}>
                  <Text style={s.loadingTxt}>Zaeli is thinking</Text>
                  <View style={{flexDirection:'row',gap:3,alignItems:'center'}}>
                    {[0,1,2].map(i=><TypingDot key={i} delay={i*200}/>)}
                  </View>
                </View>
              ):(
                <>
                  {/* Sentence-per-line rendering with stagger animation */}
                  <View style={s.briefWrap}>
                    <AnimatedBriefSentences
                      text={briefText||'Loading your day\u2026'}
                      sentenceStyle={s.briefSentence}
                      sentenceLastStyle={s.briefSentenceLast}
                      boldStyle={{fontFamily:'Poppins_700Bold',color:'#0A0A0A'}}
                    />
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
                <Text style={s.relaxedSignoff}>
                  {briefSignoff||"No worries! I'm here whenever you need me. 💛"}
                </Text>
              </View>
              <TouchableOpacity style={s.relaxedBtn} onPress={()=>openChat('General',briefText)} activeOpacity={0.85}>
                <Text style={s.relaxedBtnTxt}>{"Let's chat \u2726"}</Text>
              </TouchableOpacity>
            </Animated.View>
          ):null}
        </Animated.View>

        {/* ── BODY ── */}
        <Animated.View style={[s.body,{opacity:bodyFade,transform:[{translateY:bodySlide}]}]}>

          {/* ── FOUR TILES — 2×2 grid ── */}
          <View style={s.tilesGrid}>
            {/* Top left: Next Up */}
            <TouchableOpacity style={[s.tile,{width:tileSize,height:tileSize}]} onPress={()=>router.push('/(tabs)/calendar')} activeOpacity={0.8}>
              <Text style={s.tileIcon}>{'📅'}</Text>
              <Text style={s.tileLabel}>NEXT UP</Text>
              {radarEvents.length>0?(
                <>
                  <Text style={s.tileVal} numberOfLines={2}>{radarEvents[0].title}</Text>
                  <Text style={s.tileSub}>{fmtRadarTime(radarEvents[0].start_time)||'Today'}</Text>
                </>
              ):(
                <>
                  <Text style={s.tileVal}>All clear</Text>
                  <Text style={s.tileSub}>nothing scheduled</Text>
                </>
              )}
            </TouchableOpacity>
            {/* Top right: Tonight/Tomorrow meal */}
            <TouchableOpacity style={[s.tile,{width:tileSize,height:tileSize}]} onPress={()=>router.push('/(tabs)/mealplanner')} activeOpacity={0.8}>
              <Text style={s.tileIcon}>{'🍽️'}</Text>
              <Text style={s.tileLabel}>{mealLabel.toUpperCase()}</Text>
              <Text style={[s.tileVal,!mealDisplay&&s.tileValWarn]} numberOfLines={2}>{mealDisplay?mealDisplay.title:'Not planned'}</Text>
              <Text style={[s.tileSub,!mealDisplay&&s.tileSubCta]}>{mealDisplay?'planned \u2713':'Tap to sort \u2192'}</Text>
            </TouchableOpacity>
            {/* Bottom left: Shopping */}
            <TouchableOpacity style={[s.tile,{width:tileSize,height:tileSize}]} onPress={()=>router.push('/(tabs)/shopping')} activeOpacity={0.8}>
              <Text style={s.tileIcon}>{'🛒'}</Text>
              <Text style={s.tileLabel}>SHOPPING</Text>
              <Text style={[s.tileVal,shopping.length>0&&s.tileValWarn]}>{shopping.length>0?`${shopping.length} item${shopping.length>1?'s':''}`:'All clear'}</Text>
              <Text style={[s.tileSub,shopping.length>0&&s.tileSubCta]}>{shopping.length>0?'run needed':'nothing pending'}</Text>
            </TouchableOpacity>
            {/* Bottom right: To-do */}
            <TouchableOpacity style={[s.tile,{width:tileSize,height:tileSize}]} onPress={()=>router.push({pathname:'/(tabs)/more',params:{initialPage:'todo'}})} activeOpacity={0.8}>
              {urgentCount>0&&<View style={s.tilePip}/>}
              <Text style={s.tileIcon}>{'✅'}</Text>
              <Text style={s.tileLabel}>TO-DO</Text>
              <Text style={[s.tileVal,urgentCount>0&&s.tileValWarn]}>{urgentCount>0?`${urgentCount} urgent`:todos.length>0?`${todos.length} items`:'All clear'}</Text>
              <Text style={s.tileSub}>{todos.length>0?`${todos.length} total`:'nice work \uD83C\uDF89'}</Text>
            </TouchableOpacity>
          </View>

          {/* ── ON THE RADAR — FIX #7: larger headers, more generous row spacing ── */}
          <View style={s.radarSection}>
            <View style={s.radarHead}>
              <Text style={s.radarTitle}>On the radar</Text>
              <TouchableOpacity onPress={()=>router.push('/(tabs)/calendar')}>
                <Text style={s.radarLink}>See all</Text>
              </TouchableOpacity>
            </View>
            <View style={s.radarBand}>

              {/* Coming up — calendar events */}
              {radarEvents.length>0&&(
                <>
                  <View style={s.radarSection2Hdr}>
                    <Text style={s.radarSection2Label}>Coming up</Text>
                  </View>
                  {radarEvents.map((e:any)=>{
                    const t=fmtRadarTime(e.start_time);
                    const isToday=e.date===localDateStr;
                    const isTmrw=e.date===tomorrowStr;
                    const dayLabel=isToday?'Today':isTmrw?'Tomorrow':e.date;
                    return <RadarRow key={e.id} barColor="#0057FF" icon="📅" title={e.title} meta={`${dayLabel}${t?' \u00B7 '+t:''}`} badge={t||'Soon'} badgeBg="rgba(0,87,255,0.08)" badgeColor="#0057FF"/>;
                  })}
                </>
              )}

              {/* Reminders — dismissable */}
              {visibleReminders.length>0&&(
                <>
                  {radarEvents.length===0&&(
                    <View style={s.radarSection2Hdr}><Text style={s.radarSection2Label}>Coming up</Text></View>
                  )}
                  {visibleReminders.slice(0,4).map((r:any)=>{
                    const t=fmtRadarTime(r.start_time);
                    const isToday=r.date===localDateStr;
                    return (
                      <TouchableOpacity key={r.id} activeOpacity={0.8} onPress={()=>router.push('/(tabs)/calendar')}>
                        <RadarRow barColor="#FF8C00" icon="🔔" title={r.title} meta={`Reminder \u00B7 ${isToday?'today':'tomorrow'}${t?' '+t:''}`} badge={t||'Today'} badgeBg="rgba(255,140,0,0.10)" badgeColor="#FF8C00" isReminder onDismiss={()=>handleDismissReminder(r.id)}/>
                      </TouchableOpacity>
                    );
                  })}
                </>
              )}

              {/* Needs attention — urgent todos */}
              {radarTodos.length>0&&(
                <>
                  <View style={s.radarSection2Hdr}><Text style={s.radarSection2Label}>Needs attention</Text></View>
                  {radarTodos.map((t:any)=>(
                    <TouchableOpacity key={t.id} onPress={()=>router.push({pathname:'/(tabs)/more',params:{initialPage:'todo'}})} activeOpacity={0.8}>
                      <RadarRow barColor="#E0007C" icon="📋" title={t.title} meta={t.due_label||'Overdue'} badge="urgent" badgeBg="rgba(224,0,124,0.08)" badgeColor="#E0007C"/>
                    </TouchableOpacity>
                  ))}
                </>
              )}

              {radarEvents.length===0&&visibleReminders.length===0&&radarTodos.length===0&&(
                <View style={s.radarEmpty}><Text style={s.radarEmptyTxt}>All clear — nothing urgent on the radar {'\u2728'}</Text></View>
              )}
            </View>
          </View>

          {/* ── ASK ZAELI BAR — FIX #8: no extra space below, just tab clearance ── */}
          <TouchableOpacity style={s.askBar} onPress={()=>openChat('General')} activeOpacity={0.85}>
            <View style={s.askAvatar}><Text style={{fontSize:13,color:'#fff'}}>{'\u2726'}</Text></View>
            <Text style={s.askText}>Ask Zaeli anything...</Text>
            <View style={s.askSend}><Text style={{fontSize:17,color:'#fff',lineHeight:20}}>{'\u2191'}</Text></View>
          </TouchableOpacity>

          <View style={{height:TAB_H+insets.bottom+12}}/>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── STYLES ─────────────────────────────────────────────────────
const s=StyleSheet.create({
  // ── HERO
  hero:{backgroundColor:'#0057FF',paddingHorizontal:18,paddingTop:6,paddingBottom:20,overflow:'hidden'},
  // Orb glow — two rings layered to simulate radial gradient
  heroOrbOuter:{position:'absolute',right:-70,top:-70,width:270,height:270,borderRadius:135,backgroundColor:'rgba(255,255,255,0.12)'},
  heroOrbInner:{position:'absolute',right:-30,top:-30,width:190,height:190,borderRadius:95,backgroundColor:'rgba(255,255,255,0.22)'},
  heroOrb2:{position:'absolute',right:32,top:68,width:105,height:105,borderRadius:52,backgroundColor:'rgba(255,255,255,0.14)'},
  topRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start',marginBottom:4},
  logoWrap:{flexDirection:'row',alignItems:'center',gap:8},
  logoMark:{width:44,height:44,backgroundColor:'rgba(255,255,255,0.2)',borderRadius:14,alignItems:'center',justifyContent:'center'},
  logoWord:{fontFamily:'DMSerifDisplay_400Regular',fontSize:30,color:'#fff',letterSpacing:-0.5},
  weatherWrap:{alignItems:'flex-end',gap:2},
  weatherIcon:{fontSize:30},
  weatherTemp:{fontSize:15,fontFamily:'Poppins_600SemiBold',color:'rgba(255,255,255,0.85)'},
  weatherDate:{fontSize:12,fontFamily:'Poppins_400Regular',color:'rgba(255,255,255,0.55)'},
  greetLine:{fontFamily:'DMSerifDisplay_400Regular',fontSize:34,color:'rgba(255,255,255,0.75)',letterSpacing:-0.5,lineHeight:38,marginBottom:0},
  nameLine:{fontFamily:'DMSerifDisplay_400Regular',fontSize:44,color:'#fff',letterSpacing:-1.5,lineHeight:50,marginBottom:18},
  nameIcon:{fontSize:32},

  // ── BODY
  body:{backgroundColor:'#F7F7F7'},

  // ── ZAELI BRIEF CARD — white, fully rounded, floats inside hero with gap below
  zaeliWrap:{paddingHorizontal:18},
  zaeliCard:{
    backgroundColor:'#fff',
    borderRadius:22,
    shadowColor:'#000',shadowOpacity:0.10,shadowRadius:20,shadowOffset:{width:0,height:4},
    elevation:4,
    paddingHorizontal:16,paddingTop:14,paddingBottom:16,
    marginBottom:20,
  },
  zaeliHead:{flexDirection:'row',alignItems:'center',gap:8,marginBottom:12},
  zaeliName:{fontFamily:'DMSerifDisplay_400Regular',fontSize:16,color:'#0A0A0A'},
  liveDot:{width:6,height:6,borderRadius:3,backgroundColor:'#00C97A',marginLeft:1},
  zaeliTime:{marginLeft:'auto' as any,fontFamily:'Poppins_400Regular',fontSize:11,color:'rgba(0,0,0,0.3)'},
  // Each sentence rendered as its own block — see SentenceBrief component
  briefSentence:{fontFamily:'Poppins_400Regular',fontSize:14,color:'#1A1A2E',lineHeight:22,marginBottom:7},
  briefSentenceLast:{fontFamily:'Poppins_400Regular',fontSize:14,color:'#1A1A2E',lineHeight:22,marginBottom:0},
  briefWrap:{marginBottom:16},
  loadingRow:{flexDirection:'row',alignItems:'center',gap:8,paddingVertical:10},
  loadingTxt:{fontFamily:'Poppins_400Regular',fontSize:13,color:'rgba(0,0,0,0.38)'},

  // CTA buttons
  zaeliActions:{flexDirection:'row',gap:10},
  ctaPrimary:{flex:1,backgroundColor:'#E0007C',borderRadius:14,paddingVertical:13,alignItems:'center',justifyContent:'center'},
  ctaPrimaryTxt:{fontFamily:'Poppins_600SemiBold',fontSize:13,color:'#fff',textAlign:'center'},
  ctaGhost:{flex:1,backgroundColor:'rgba(0,0,0,0.055)',borderRadius:14,paddingVertical:13,alignItems:'center',justifyContent:'center',borderWidth:1.5,borderColor:'rgba(0,0,0,0.09)'},
  ctaGhostTxt:{fontFamily:'Poppins_500Medium',fontSize:13,color:'rgba(0,0,0,0.45)',textAlign:'center'},

  // Relaxed card
  relaxedCard:{backgroundColor:'#fff',borderRadius:22,paddingHorizontal:16,paddingTop:14,paddingBottom:14,marginBottom:20,shadowColor:'#000',shadowOpacity:0.06,shadowRadius:12,shadowOffset:{width:0,height:3},elevation:2,gap:12},
  relaxedInner:{flexDirection:'row',alignItems:'flex-start',gap:10},
  relaxedAvatar:{width:28,height:28,borderRadius:9,backgroundColor:'#E8ECFF',alignItems:'center',justifyContent:'center',flexShrink:0,marginTop:1},
  relaxedSignoff:{fontFamily:'Poppins_400Regular',fontSize:13.5,color:'rgba(0,0,0,0.55)',lineHeight:21,flex:1},
  relaxedBtn:{backgroundColor:'rgba(0,87,255,0.08)',borderRadius:13,paddingVertical:12,alignItems:'center',justifyContent:'center'},
  relaxedBtnTxt:{fontFamily:'Poppins_600SemiBold',fontSize:13,color:'#0057FF',textAlign:'center' as any},

  // ── FOUR TILES — 2×2 grid
  tilesGrid:{flexDirection:'row',flexWrap:'wrap',gap:12,paddingHorizontal:18,paddingTop:20},
  tile:{backgroundColor:'#fff',borderRadius:18,paddingHorizontal:14,paddingVertical:16,borderWidth:1.5,borderColor:'rgba(0,0,0,0.06)',shadowColor:'#000',shadowOpacity:0.04,shadowRadius:8,shadowOffset:{width:0,height:2},elevation:1,position:'relative',overflow:'hidden',justifyContent:'flex-end'},
  tilePip:{position:'absolute',top:10,right:10,width:8,height:8,borderRadius:4,backgroundColor:'#E0007C'},
  tileIcon:{fontSize:28,marginBottom:6},
  tileLabel:{fontFamily:'Poppins_700Bold',fontSize:10,letterSpacing:1.2,textTransform:'uppercase',color:'rgba(0,0,0,0.28)',marginBottom:6},
  tileVal:{fontFamily:'Poppins_700Bold',fontSize:20,color:'#0A0A0A',lineHeight:26},
  tileValWarn:{color:'#E0007C'},
  tileSub:{fontFamily:'Poppins_400Regular',fontSize:12,color:'rgba(0,0,0,0.38)',marginTop:4},
  tileSubCta:{color:'#0057FF',fontFamily:'Poppins_600SemiBold'},

  // ── ON THE RADAR — FIX #7: bigger headers and more generous spacing
  radarSection:{paddingHorizontal:18,paddingTop:20},
  radarHead:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:12},
  radarTitle:{fontFamily:'Poppins_700Bold',fontSize:16,color:'#0A0A0A'},   // was 12, now 16
  radarLink:{fontFamily:'Poppins_600SemiBold',fontSize:13,color:'#0057FF'},
  radarBand:{backgroundColor:'#fff',borderRadius:20,overflow:'hidden',borderWidth:1.5,borderColor:'rgba(0,0,0,0.06)',shadowColor:'#000',shadowOpacity:0.04,shadowRadius:8,shadowOffset:{width:0,height:2},elevation:1},

  // Section sub-headers — matched to calendar slbl
  radarSection2Hdr:{paddingHorizontal:16,paddingTop:14,paddingBottom:6},
  radarSection2Label:{fontFamily:'Poppins_700Bold',fontSize:10,letterSpacing:1.5,textTransform:'uppercase',color:'rgba(0,0,0,0.28)'},

  // Radar rows — matched to calendar day view (eventItem/evName/evMeta)
  radarRow:{flexDirection:'row',alignItems:'center',gap:14,paddingHorizontal:16,paddingVertical:14,borderBottomWidth:1,borderBottomColor:'rgba(0,0,0,0.05)'},
  radarBar:{width:3,borderRadius:2,alignSelf:'stretch',minHeight:36,flexShrink:0},
  radarIcon:{fontSize:18,width:26,textAlign:'center' as any},
  radarContent:{flex:1,minWidth:0},
  radarRowTitle:{fontFamily:'Poppins_600SemiBold',fontSize:14,color:'#0A0A0A',lineHeight:20},  // matches evName exactly
  radarMeta:{fontFamily:'Poppins_400Regular',fontSize:11,color:'rgba(0,0,0,0.50)',marginTop:2},  // matches evMeta exactly
  radarBadge:{borderRadius:100,paddingHorizontal:10,paddingVertical:4,flexShrink:0},
  radarBadgeTxt:{fontFamily:'Poppins_700Bold',fontSize:11},
  dismissBtn:{width:24,height:24,borderRadius:12,backgroundColor:'rgba(0,0,0,0.07)',alignItems:'center',justifyContent:'center',flexShrink:0},
  dismissBtnTxt:{fontFamily:'Poppins_700Bold',fontSize:14,color:'rgba(0,0,0,0.32)',lineHeight:17},
  radarEmpty:{padding:22,alignItems:'center'},
  radarEmptyTxt:{fontFamily:'Poppins_400Regular',fontSize:14,color:'rgba(0,0,0,0.35)',textAlign:'center' as any},

  // ── ASK ZAELI BAR — FIX #8: tight bottom clearance, no extra whitespace
  askBar:{marginHorizontal:18,marginTop:14,marginBottom:0,backgroundColor:'#fff',borderRadius:18,paddingVertical:12,paddingHorizontal:12,flexDirection:'row',alignItems:'center',gap:10,borderWidth:1.5,borderColor:'rgba(0,87,255,0.18)',shadowColor:'#0057FF',shadowOpacity:0.07,shadowRadius:16,shadowOffset:{width:0,height:2},elevation:2},
  askAvatar:{width:32,height:32,borderRadius:10,backgroundColor:'#0057FF',alignItems:'center',justifyContent:'center',flexShrink:0},
  askText:{flex:1,fontFamily:'Poppins_400Regular',fontSize:14,color:'rgba(0,0,0,0.28)'},
  askSend:{width:32,height:32,borderRadius:10,backgroundColor:'#0057FF',alignItems:'center',justifyContent:'center',flexShrink:0},
});