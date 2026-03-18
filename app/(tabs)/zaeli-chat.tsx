/**
 * Zaeli AI Chat Screen
 * app/(tabs)/zaeli-chat.tsx
 *
 * Fixes in this version:
 * - max_tokens raised to 1024 for Sonnet turn 0 (was 600 — caused crash at message 11-12)
 * - Error boundary in catch prevents screen crash on truncated/malformed response
 * - Day names included in meal plan context (fixes Zaeli saying wrong day of week)
 *   Root cause: new Date('YYYY-MM-DD') parses as UTC midnight, shifting day by 1 in AEST.
 *   Fix: use new Date(y, m-1, d) constructor which uses local time.
 */

import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated, Clipboard, Easing, Keyboard, KeyboardAvoidingView,
  Platform, ScrollView, Share, StyleSheet, Text, TextInput,
  ToastAndroid, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Line, Path, Polygon, Polyline, Rect } from 'react-native-svg';
import { detectReminderIntent, scheduleReminder } from '../../lib/notifications';
import { supabase } from '../../lib/supabase';
import { buildMemoryContext, saveConversation } from '../../lib/zaeli-memory';
import { callClaude } from '../../lib/api-logger';

const DUMMY_FAMILY_ID   = '00000000-0000-0000-0000-000000000001';
const DUMMY_MEMBER_NAME = 'Anna';

const SONNET = 'claude-sonnet-4-20250514';
const HAIKU  = 'claude-haiku-4-5-20251001';

const C = {
  blue:'#0057FF', mag:'#E0007C', ink:'#0A0A0A',
  ink2:'rgba(0,0,0,0.50)', ink3:'rgba(0,0,0,0.28)',
  border:'rgba(0,0,0,0.07)', bg:'#F7F7F7',
  chatBg:'#F4F6FA', green:'#00C97A', orange:'#FF8C00',
};

// ── SMART MODEL ROUTER ───────────────────────────────────────
function selectModel(msg: string): string {
  const m = msg.trim().toLowerCase();
  if (m.split(/\s+/).length <= 2) return HAIKU;
  const needsSonnet = [
    /\b(stressed|overwhelmed|anxious|worried|tired|exhausted|frustrated|upset|sad|happy|excited)\b/,
    /\b(what should|what do you think|help me (decide|choose|figure|plan|think)|any ideas|suggest|advice|recommend)\b/,
    /\b(recipe|meal|dinner|lunch|breakfast|cook|food idea|what('s| is) for)\b/,
    /\b(plan|planning|organise|organize|schedule|sort out|figure out)\b/,
    /\b(how do i|how should|why is|tell me about|explain|what('s| is) the best)\b/,
    /\b(can you draft|write|compose|help me write)\b/,
  ];
  if (needsSonnet.some(r => r.test(m))) return SONNET;
  const isPureAction = [
    /^(add|put|buy|get|pick up|grab)\s+\w/,
    /^(book|schedule|cancel|delete|remove|complete|done|finish|mark)\s+\w/,
    /^(yes|no|ok|okay|sure|thanks|thank you|great|perfect|sounds good|done|got it)\.?$/,
  ];
  if (isPureAction.some(r => r.test(m)) && m.split(/\s+/).length <= 8) return HAIKU;
  return SONNET;
}

// ── SVG ICONS ────────────────────────────────────────────────
const IS = 15, IC = 'rgba(0,0,0,0.28)', IW = 1.8;
function IcoPlay({color=IC}:{color?:string}){return<Svg width={IS} height={IS} viewBox="0 0 24 24"><Polygon points="5 3 19 12 5 21 5 3" stroke={color} strokeWidth={IW} fill="none" strokeLinecap="round" strokeLinejoin="round"/></Svg>;}
function IcoCopy({color=IC}:{color?:string}){return<Svg width={IS} height={IS} viewBox="0 0 24 24"><Rect x="9" y="9" width="13" height="13" rx="2" stroke={color} strokeWidth={IW} fill="none"/><Path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke={color} strokeWidth={IW} fill="none" strokeLinecap="round" strokeLinejoin="round"/></Svg>;}
function IcoForward({color=IC}:{color?:string}){return<Svg width={IS} height={IS} viewBox="0 0 24 24"><Path d="M22 2L15 22l-3-7-7-3 17-10z" stroke={color} strokeWidth={IW} fill="none" strokeLinecap="round" strokeLinejoin="round"/></Svg>;}
function IcoThumbUp({color=IC}:{color?:string}){return<Svg width={IS} height={IS} viewBox="0 0 24 24"><Path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z" stroke={color} strokeWidth={IW} fill="none" strokeLinecap="round" strokeLinejoin="round"/><Path d="M7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" stroke={color} strokeWidth={IW} fill="none" strokeLinecap="round" strokeLinejoin="round"/></Svg>;}
function IcoThumbDown({color=IC}:{color?:string}){return<Svg width={IS} height={IS} viewBox="0 0 24 24"><Path d="M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3H10z" stroke={color} strokeWidth={IW} fill="none" strokeLinecap="round" strokeLinejoin="round"/><Path d="M17 2h2.67A2.31 2.31 0 0122 4v7a2.31 2.31 0 01-2.33 2H17" stroke={color} strokeWidth={IW} fill="none" strokeLinecap="round" strokeLinejoin="round"/></Svg>;}
function IcoRetry({color=IC}:{color?:string}){return<Svg width={IS} height={IS} viewBox="0 0 24 24"><Polyline points="1 4 1 10 7 10" stroke={color} strokeWidth={IW} fill="none" strokeLinecap="round" strokeLinejoin="round"/><Path d="M3.51 15a9 9 0 102.13-9.36L1 10" stroke={color} strokeWidth={IW} fill="none" strokeLinecap="round" strokeLinejoin="round"/></Svg>;}
function IcoCheck({color=C.green}:{color?:string}){return<Svg width={IS} height={IS} viewBox="0 0 24 24"><Polyline points="20 6 9 17 4 12" stroke={color} strokeWidth={IW} fill="none" strokeLinecap="round" strokeLinejoin="round"/></Svg>;}
function IcoBack(){return<Svg width={20} height={20} viewBox="0 0 24 24"><Polyline points="15 18 9 12 15 6" stroke={C.blue} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round"/></Svg>;}
function IcoMic({color='rgba(0,0,0,0.45)'}:{color?:string}){return<Svg width={18} height={18} viewBox="0 0 24 24"><Rect x="9" y="2" width="6" height="11" rx="3" stroke={color} strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round"/><Path d="M5 10a7 7 0 0014 0" stroke={color} strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round"/><Line x1="12" y1="19" x2="12" y2="23" stroke={color} strokeWidth={1.8} strokeLinecap="round"/><Line x1="8" y1="23" x2="16" y2="23" stroke={color} strokeWidth={1.8} strokeLinecap="round"/></Svg>;}
function IcoSend(){return<Svg width={16} height={16} viewBox="0 0 24 24"><Line x1="12" y1="19" x2="12" y2="5" stroke="#fff" strokeWidth={2.5} strokeLinecap="round"/><Polyline points="5 12 12 5 19 12" stroke="#fff" strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round"/></Svg>;}
function IcoDown(){return<Svg width={11} height={11} viewBox="0 0 24 24"><Polyline points="6 9 12 15 18 9" stroke={C.blue} strokeWidth={2.2} fill="none" strokeLinecap="round" strokeLinejoin="round"/></Svg>;}

function TypingDot({delay}:{delay:number}){
  const y=useRef(new Animated.Value(0)).current;
  const o=useRef(new Animated.Value(0.3)).current;
  useEffect(()=>{
    Animated.loop(Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([Animated.timing(y,{toValue:-5,duration:300,easing:Easing.inOut(Easing.sin),useNativeDriver:true}),Animated.timing(o,{toValue:1,duration:300,useNativeDriver:true})]),
      Animated.parallel([Animated.timing(y,{toValue:0,duration:300,easing:Easing.inOut(Easing.sin),useNativeDriver:true}),Animated.timing(o,{toValue:0.3,duration:300,useNativeDriver:true})]),
      Animated.delay(300),
    ])).start();
  },[]);
  return <Animated.View style={{width:7,height:7,borderRadius:4,backgroundColor:C.ink3,transform:[{translateY:y}],opacity:o}}/>;
}

function PulsingAvatar(){
  const scale=useRef(new Animated.Value(1)).current;
  useEffect(()=>{
    Animated.loop(Animated.sequence([
      Animated.timing(scale,{toValue:1.08,duration:1200,easing:Easing.inOut(Easing.sin),useNativeDriver:true}),
      Animated.timing(scale,{toValue:1,duration:1300,easing:Easing.inOut(Easing.sin),useNativeDriver:true}),
    ])).start();
  },[]);
  return <Animated.View style={[s.av,{transform:[{scale}]}]}><Text style={s.avStar}>✦</Text></Animated.View>;
}

type Message = {
  id:string; role:'user'|'assistant'; content:string; time:string;
  recipeData?:{title:string;content:string}; isToolMsg?:boolean;
};
type FeedbackState = Record<string,'up'|'down'|null>;

function getTime(){
  const n=new Date();const h=n.getHours(),m=n.getMinutes().toString().padStart(2,'0');
  return `${h%12||12}:${m} ${h>=12?'pm':'am'}`;
}

function BoldText({text,style}:{text:string;style?:any}){
  const parts=text.split(/\*\*(.*?)\*\*/g);
  return <Text style={style}>{parts.map((p,i)=>i%2===1?<Text key={i} style={{fontFamily:'Poppins_700Bold'}}>{p}</Text>:<Text key={i}>{p}</Text>)}</Text>;
}

function extractRecipes(text:string):{title:string;content:string}[]{
  const recipes:{title:string;content:string}[]=[];
  const blocks=text.split(/\n(?=#{1,3}\s|\*\*[A-Z])/g);
  for(const block of blocks){
    const m=block.match(/^#{1,3}\s+(.+)|^\*\*(.+?)\*\*/);
    if(!m) continue;
    const title=(m[1]||m[2]).trim();
    if(/shopping|you.?d need|already on|add:|list:|ingredients?:/i.test(title)) continue;
    if(title.endsWith(':')||title.length<4) continue;
    const hasMeasurements=/\d+\s*(g|kg|ml|L|cup|tbsp|tsp|oz|lb)/i.test(block);
    const hasMethod=/\b(preheat|bake|cook|mix|stir|boil|fry|simmer|roast|whisk|combine|heat|add|season|serve)\b/i.test(block);
    if(hasMeasurements&&hasMethod) recipes.push({title,content:block.trim()});
  }
  return recipes;
}

// ── TOOL DEFINITIONS ─────────────────────────────────────────
const TOOL_DEFINITIONS = [
  {name:'add_calendar_event',description:'Add an event to the family calendar',input_schema:{type:'object',properties:{title:{type:'string'},start_time:{type:'string',description:'ISO 8601'},end_time:{type:'string'},notes:{type:'string'}},required:['title','start_time']}},
  {name:'add_shopping_item',description:'Add one or more items to the family shopping list. Always call immediately when user mentions items to buy.',input_schema:{type:'object',properties:{items:{type:'array',items:{type:'object',properties:{name:{type:'string'},qty:{type:'string'},category:{type:'string',enum:['Fruit & Veg','Dairy & Eggs','Meat & Seafood','Bakery','Pantry','Frozen','Drinks','Snacks','Household','Other']}},required:['name']}}},required:['items']}},
  {name:'add_todo',description:'Add a task for the family',input_schema:{type:'object',properties:{title:{type:'string'},due_label:{type:'string'},priority:{type:'string',enum:['high','medium','low']},assignee:{type:'string'}},required:['title']}},
  {name:'save_recipe',description:'Save a recipe to Favourites. Use separate ingredients and method fields.',input_schema:{type:'object',properties:{title:{type:'string'},ingredients:{type:'string'},method:{type:'string'},notes:{type:'string'}},required:['title','ingredients']}},
  {name:'add_meal_plan',description:'Add a meal to the meal planner. ALWAYS include ingredients and method fields — never leave them empty. Check MEAL PLAN context first — if day has a meal of the same type, return conflict message instead. For desserts, always use meal_type:"dessert". Never default desserts to "dinner".',input_schema:{type:'object',properties:{day_key:{type:'string',description:'YYYY-MM-DD'},meal_type:{type:'string',enum:['breakfast','lunch','dinner','snack','dessert']},title:{type:'string'},ingredients:{type:'string'},method:{type:'string'},notes:{type:'string'}},required:['day_key','meal_type','title']}},
  {name:'replace_meal_plan',description:'Replace an existing meal. Use only after user confirms.',input_schema:{type:'object',properties:{day_key:{type:'string'},title:{type:'string'},meal_type:{type:'string',enum:['breakfast','lunch','dinner','snack']}},required:['day_key','title']}},
  {name:'complete_todo',description:'Mark a task as complete',input_schema:{type:'object',properties:{title:{type:'string'}},required:['title']}},
  {name:'update_calendar_event',description:'Update an existing calendar event.',input_schema:{type:'object',properties:{search_title:{type:'string'},new_title:{type:'string'},new_start_time:{type:'string'},new_end_time:{type:'string'},new_date:{type:'string'},new_notes:{type:'string'}},required:['search_title']}},
  {name:'delete_calendar_event',description:'Delete a calendar event',input_schema:{type:'object',properties:{search_title:{type:'string'},date:{type:'string',description:'YYYY-MM-DD'}},required:['search_title']}},
  {name:'add_recurring_event',description:'Add a recurring event (weekly, fortnightly, monthly)',input_schema:{type:'object',properties:{title:{type:'string'},frequency:{type:'string',enum:['weekly','fortnightly','monthly']},start_time:{type:'string'},duration_minutes:{type:'number'},notes:{type:'string'}},required:['title','frequency','start_time']}},
];

// ── TOOL EXECUTOR ─────────────────────────────────────────────
async function executeTool(name:string,input:any):Promise<string>{
  try{
    if(name==='add_calendar_event'){
      const ld=(input.start_time||'').replace('Z','').split('+')[0];
      const do_=ld.replace('T',' ').split(' ')[0]||new Date().toISOString().split('T')[0];
      const{error}=await supabase.from('events').insert({family_id:DUMMY_FAMILY_ID,title:input.title,date:do_,start_time:ld,end_time:(input.end_time||input.start_time).replace('Z','').split('+')[0],notes:input.notes||'',timezone:'Australia/Brisbane'});
      if(error) throw error;
      return `✅ **${input.title}** added to the calendar.`;
    }
    if(name==='add_shopping_item'){
      const vc=['Fruit & Veg','Dairy & Eggs','Meat & Seafood','Bakery','Pantry','Frozen','Drinks','Snacks','Household','Other'];
      const{data:ea}=await supabase.from('shopping_items').select('id,name,checked').eq('family_id',DUMMY_FAMILY_ID);
      const ai=(ea||[]).filter((r:any)=>!r.checked),pi=(ea||[]).filter((r:any)=>r.checked);
      const an=ai.map((r:any)=>r.name.toLowerCase().trim());
      const fz=(a:string,b:string)=>{
        const cl=(s:string)=>s.toLowerCase().replace(/[^a-z0-9 ]/g,'').replace(/\b(x|pack|kg|g|ml|l|litre|brand|home|organic|fresh|free|range|whole|full|cream|reduced|fat|low|no|barista|original|light)\b/g,'').trim();
        const ca=cl(a),cb=cl(b);
        if(!ca||!cb) return false;
        if(ca===cb||ca.includes(cb)||cb.includes(ca)) return true;
        const wa=new Set(ca.split(' ').filter((w:string)=>w.length>2));
        const wb=cb.split(' ').filter((w:string)=>w.length>2);
        return wb.filter((w:string)=>wa.has(w)).length>=Math.min(2,Math.min(wa.size,wb.length));
      };
      const ad:string[]=[],mb:string[]=[],nr:any[]=[];
      for(const i of input.items){
        if(an.some((e:string)=>fz(e,i.name))){ad.push(i.name);continue;}
        const pm=pi.find((p:any)=>fz(p.name.toLowerCase().trim(),i.name));
        if(pm){await supabase.from('shopping_items').update({checked:false,completed:false}).eq('id',pm.id);mb.push(pm.name);continue;}
        nr.push({family_id:DUMMY_FAMILY_ID,name:i.name,item:i.name,category:vc.includes(i.category)?i.category:'Other',checked:false,completed:false,meal_source:i.qty||null});
      }
      let res='';
      if(mb.length>0) res+=`✅ Moved back from Recently Bought: ${mb.map((d:string)=>`**${d}**`).join(', ')}.`;
      if(nr.length>0){
        const{error}=await supabase.from('shopping_items').insert(nr).select();
        if(error) return `❌ Failed: ${error.message}`;
        res+=`${mb.length>0?' ':''}✅ Added: ${nr.map((r:any)=>`**${r.name}**`).join(', ')}.`;
        try{
          const ns=nr.map((r:any)=>r.name.toLowerCase());
          const{data:pd}=await supabase.from('pantry_items').select('name,stock').eq('family_id',DUMMY_FAMILY_ID);
          if(pd?.length){
            const g=pd.filter((p:any)=>ns.some((n:string)=>p.name.toLowerCase().includes(n)||n.includes(p.name.toLowerCase()))&&(p.stock==='good'||p.stock==='medium'));
            const l=pd.filter((p:any)=>ns.some((n:string)=>p.name.toLowerCase().includes(n)||n.includes(p.name.toLowerCase()))&&(p.stock==='critical'||p.stock==='low'));
            if(g.length>0) res+=`\n\nHeads up — looks like you've already got ${g.map((p:any)=>`**${p.name}**`).join(', ')} in the pantry.`;
            if(l.length>0) res+=`\n\nGood timing on ${l.map((p:any)=>`**${p.name}**`).join(', ')} — running low anyway.`;
          }
        }catch{}
      }
      if(ad.length>0) res+=`${(mb.length>0||nr.length>0)?' ':''}⚠️ Already on the list (skipped): ${ad.map((d:string)=>`**${d}**`).join(', ')}.`;
      return res||'✅ Done.';
    }
    if(name==='add_todo'){
      const{error}=await supabase.from('todos').insert({family_id:DUMMY_FAMILY_ID,title:input.title,due_label:input.due_label||'',priority:input.priority||'medium',status:'active',assignee:input.assignee||null});
      if(error) throw error;
      return `✅ Task added: **${input.title}**${input.assignee?` for ${input.assignee}`:''}. `;
    }
    if(name==='save_recipe'){
      const np=[input.ingredients?`Ingredients:\n${input.ingredients}`:null,input.method?`\nMethod:\n${input.method}`:null,input.notes?`\nNotes:\n${input.notes}`:null,(!input.ingredients&&input.content)?input.content:null].filter(Boolean);
      const{error}=await supabase.from('recipes').insert({family_id:DUMMY_FAMILY_ID,name:input.title,notes:np.join('')||null,source_type:'zaeli',tags:[],created_at:new Date().toISOString()});
      if(error) return `I tried to save **${input.title}** but hit an error: ${error.message}.`;
      return `✅ **${input.title}** saved to Favourites!`;
    }
    if(name==='add_meal_plan'){
      const today=new Date();
      const ld=today.getFullYear()+'-'+String(today.getMonth()+1).padStart(2,'0')+'-'+String(today.getDate()).padStart(2,'0');
      const td=input.day_key||ld;
      const mealType=input.meal_type||'dinner';
      // Only check for conflicts on non-dessert meal types
      if(mealType!=='dessert'){
        const{data:ex}=await supabase.from('meal_plans').select('meal_name').eq('family_id',DUMMY_FAMILY_ID).eq('day_key',td).eq('meal_type',mealType).limit(1);
        if(ex&&ex.length>0) return `⚠️ **${td}** already has **${ex[0].meal_name}** planned. Replace it, move it, or pick a different night?`;
      }
      const il=input.ingredients?input.ingredients.split('\n').filter((l:string)=>l.trim()).map((l:string)=>({name:l.trim(),qty:'',emoji:'🍴',in_pantry:false})):null;
      // Save method + notes into the notes field so MealDetailModal can display them
      // Format must match what MealDetailModal expects: "Ingredients:\n...\nMethod:\n..."
      const noteParts=[
        input.ingredients?`Ingredients:\n${input.ingredients}`:null,
        input.method?`\nMethod:\n${input.method}`:null,
        input.notes?`\nNotes:\n${input.notes}`:null,
      ].filter(Boolean);
      const notesStr=noteParts.join('')||null;
      const{error}=await supabase.from('meal_plans').insert({family_id:DUMMY_FAMILY_ID,day_key:td,planned_date:td,meal_name:input.title,meal_type:mealType,source:'zaeli',notes:notesStr,ingredients:il});
      if(error) return `Couldn't add **${input.title}**: ${error.message}`;
      return `✅ **${input.title}** added for ${td} as ${mealType}${il?` with ${il.length} ingredients`:''}. Open Meals to view it.`;
    }
    if(name==='replace_meal_plan'){
      const mt=input.meal_type||'dinner';
      await supabase.from('meal_plans').delete().eq('family_id',DUMMY_FAMILY_ID).eq('day_key',input.day_key).eq('meal_type',mt);
      const{error}=await supabase.from('meal_plans').insert({family_id:DUMMY_FAMILY_ID,day_key:input.day_key,planned_date:input.day_key,meal_name:input.title,meal_type:mt,source:'zaeli'});
      if(error) return `Couldn't replace: ${error.message}`;
      return `✅ Done — **${input.title}** is now planned for ${input.day_key}.`;
    }
    if(name==='update_calendar_event'){
      const{data}=await supabase.from('events').select('id,title,date,start_time,end_time').eq('family_id',DUMMY_FAMILY_ID).ilike('title',`%${input.search_title}%`).order('date').limit(5);
      if(!data||data.length===0) return `Couldn't find an event matching "${input.search_title}".`;
      const t=data[0];const u:any={};
      if(input.new_title) u.title=input.new_title;
      if(input.new_notes) u.notes=input.new_notes;
      if(input.new_start_time) u.start_time=input.new_start_time.replace('Z','').split('+')[0];
      if(input.new_end_time)   u.end_time=input.new_end_time.replace('Z','').split('+')[0];
      if(input.new_date){
        u.date=input.new_date;
        if(!input.new_start_time&&t.start_time) u.start_time=`${input.new_date}T${t.start_time.split('T')[1]||'12:00:00'}`;
        if(!input.new_end_time&&t.end_time)     u.end_time=`${input.new_date}T${t.end_time.split('T')[1]||'13:00:00'}`;
      }
      const{error}=await supabase.from('events').update(u).eq('id',t.id);
      if(error) throw error;
      return `✅ **${input.new_title||t.title}** updated successfully.`;
    }
    if(name==='delete_calendar_event'){
      let q=supabase.from('events').select('id,title,date').eq('family_id',DUMMY_FAMILY_ID).ilike('title',`%${input.search_title}%`);
      if(input.date) q=q.eq('date',input.date);
      const{data}=await q.order('date').limit(1);
      if(!data||data.length===0) return `Couldn't find "${input.search_title}".`;
      const{error}=await supabase.from('events').delete().eq('id',data[0].id);
      if(error) throw error;
      return `✅ **${data[0].title}** on ${data[0].date} deleted.`;
    }
    if(name==='complete_todo'){
      const{data}=await supabase.from('todos').select('id,title').eq('family_id',DUMMY_FAMILY_ID).eq('status','active').ilike('title',`%${input.title}%`).limit(1);
      if(data&&data.length>0){await supabase.from('todos').update({status:'done'}).eq('id',data[0].id);return `✅ Marked **${data[0].title}** as complete!`;}
      return `Couldn't find a task matching "${input.title}".`;
    }
    if(name==='add_recurring_event'){
      const ld=(input.start_time||'').replace('Z','').split('+')[0];
      const dm=input.duration_minutes||60,fr=input.frequency||'weekly';
      const sd=fr==='weekly'?7:fr==='fortnightly'?14:null,sm=fr==='monthly'?1:null;
      const fd=new Date(ld),ey=new Date(fd.getFullYear(),11,31,23,59,59);
      const rows:any[]=[]; let cur=new Date(fd);
      while(cur<=ey){
        const p=(n:number)=>String(n).padStart(2,'0');
        const d=`${cur.getFullYear()}-${p(cur.getMonth()+1)}-${p(cur.getDate())}`;
        const si=`${d}T${p(cur.getHours())}:${p(cur.getMinutes())}:00`;
        const ed=new Date(cur.getTime()+dm*60000);
        const ei=`${ed.getFullYear()}-${p(ed.getMonth()+1)}-${p(ed.getDate())}T${p(ed.getHours())}:${p(ed.getMinutes())}:00`;
        rows.push({family_id:DUMMY_FAMILY_ID,title:input.title,date:d,start_time:si,end_time:ei,notes:input.notes||`Recurring ${fr}`,timezone:'Australia/Brisbane'});
        if(sd) cur=new Date(cur.getTime()+sd*24*60*60*1000);
        else if(sm){cur=new Date(cur);cur.setMonth(cur.getMonth()+1);}
        else break;
      }
      const B=50; let ic=0;
      for(let i=0;i<rows.length;i+=B){const{error}=await supabase.from('events').insert(rows.slice(i,i+B));if(error)throw error;ic+=Math.min(B,rows.length-i);}
      return `✅ **${input.title}** booked ${fr} — **${ic} occurrences** added through 31 Dec ${fd.getFullYear()}.`;
    }
    return `Tool ${name} not yet implemented.`;
  }catch(e:any){
    console.log(`Tool error [${name}]:`,e?.message);
    return `I tried but hit a snag — you may need to add it manually for now.`;
  }
}

const CAPABILITY_RULES=`CRITICAL CAPABILITY RULES — never violate:
- Zaeli CANNOT make phone calls, send messages/emails/texts autonomously. She can DRAFT them.
- Zaeli CANNOT set phone reminders. The calendar entry IS the reminder.
- Zaeli CAN: add/update/delete calendar events, todos, shopping items, meal plans.
- EDITING EVENTS: Always use update_calendar_event when rescheduling or renaming. NEVER add a duplicate.
- RECURRING: weekly/fortnightly/monthly → add_recurring_event.
- NEVER say "I don't see any previous conversation" or reference chat history limitations. If context is missing, ask warmly — e.g. "Which recipes did you have in mind?"
- DATES: The WEEK DATES section lists the EXACT YYYY-MM-DD for each day name. You MUST copy the date string from WEEK DATES verbatim — e.g. if Saturday=2026-03-21 then use 2026-03-21 exactly. NEVER add or subtract days. NEVER compute dates from today.
- CALENDAR EVENTS: For start_time, use format YYYY-MM-DDThh:mm:ss where the date part is copied EXACTLY from WEEK DATES. Example: if user says "Saturday 7am" and WEEK DATES shows Saturday=2026-03-21, the start_time is 2026-03-21T07:00:00.
- DESSERTS: When adding a dessert to the meal plan, ALWAYS use meal_type:"dessert". Never use meal_type:"dinner" for a dessert item.`;

const CHANNELS:Record<string,{icon:string;prompt:string;seeds:string[]}>={
  General:{icon:'✦',prompt:`You are Zaeli, a warm family assistant. Help with anything. You know thousands of recipes from your training — provide them directly without mentioning search limitations. You have access to saved recipes, menus, and pantry in context. Use tools for real actions. Add shopping items IMMEDIATELY when mentioned. ${CAPABILITY_RULES}`,seeds:["What's on this week?","Help me plan the weekend","What's for dinner tonight?"]},
  Calendar:{icon:'📅',prompt:`You are Zaeli, focused on the family calendar. Book immediately when you have enough info. Default 1hr duration. ISO 8601 local format. ${CAPABILITY_RULES}`,seeds:["Any clashes this week?","What's on this weekend?","Schedule something for me"]},
  Shopping:{icon:'🛒',prompt:`You are Zaeli, focused on shopping. Call add_shopping_item IMMEDIATELY for any item mentioned. Relay tool responses naturally. ${CAPABILITY_RULES}`,seeds:["What do we need this week?","Add milk and eggs","What am I missing for dinners?"]},
  Meals:{icon:'🍽️',prompt:`You are Zaeli, focused on meal planning. You know thousands of recipes from your training — provide them directly and confidently without mentioning search limitations or the internet. Check MEAL PLAN context before adding to any day. Use separate ingredients/method fields when saving. ${CAPABILITY_RULES}`,seeds:["What should we have tonight?","Give me a butter chicken recipe","Plan dinners for the week"]},
  Kids:{icon:'🌟',prompt:`You are Zaeli, focused on the kids — tasks, activities, school and routines. ${CAPABILITY_RULES}`,seeds:["How are the kids tracking?","What jobs are left today?","Ideas for the weekend with kids"]},
  Travel:{icon:'✈️',prompt:`You are Zaeli, focused on travel. Add trip events to calendar using tools. ${CAPABILITY_RULES}`,seeds:["Plan a weekend away","What should we pack?","Kid-friendly things to do nearby"]},
};
const CHANNEL_KEYS=Object.keys(CHANNELS);

export default function ZaeliChatScreen(){
  const insets=useSafeAreaInsets();
  const router=useRouter();
  const params=useLocalSearchParams<{channel?:string;returnTo?:string;seedMessage?:string}>();
  const returnTo=params.returnTo||'/(tabs)/';
  const seedMessage=params.seedMessage||'';
  const scrollRef=useRef<ScrollView>(null);
  const inputRef=useRef<TextInput>(null);

  const[channelMessages,setChannelMessages]=useState<Record<string,Message[]>>({});
  const[input,setInput]=useState('');
  const[loading,setLoading]=useState(false);
  const[activeCtx,setActiveCtx]=useState(params.channel&&CHANNEL_KEYS.includes(params.channel)?params.channel:'General');
  const[showHints,setShowHints]=useState(true);
  const[loadedChans,setLoadedChans]=useState<Set<string>>(new Set());
  const[copiedId,setCopiedId]=useState<string|null>(null);
  const[feedback,setFeedback]=useState<FeedbackState>({});
  const[showScrollBtn,setShowScrollBtn]=useState(false);

  const messages=channelMessages[activeCtx]||[];
  const setMessages=(updater:Message[]|((p:Message[])=>Message[]))=>{
    setChannelMessages(prev=>{
      const cur=prev[activeCtx]||[];
      const next=typeof updater==='function'?updater(cur):updater;
      const capped=next.length>12?next.slice(next.length-12):next;
      return{...prev,[activeCtx]:capped};
    });
  };

  useEffect(()=>{
    if(seedMessage){
      setChannelMessages(prev=>({...prev,[activeCtx]:[]}));
      setLoadedChans(prev=>{const n=new Set(prev);n.delete(activeCtx);return n;});
      loadBriefContinuation(activeCtx,seedMessage);
    }else if(loadedChans.has(activeCtx)){
      const opts=['Hey, back again! What else can I help with? 😊','Hey! What can I do for you? ✨',"I'm here — what's on your mind?",'Back! What do you need?','Hey, what else can I sort for you?'];
      const note=opts[Math.floor(Math.random()*opts.length)];
      setChannelMessages(prev=>({...prev,[activeCtx]:[...(prev[activeCtx]||[]),{id:'re-'+Date.now(),role:'assistant',content:note,time:new Date().toLocaleTimeString('en-AU',{hour:'numeric',minute:'2-digit',hour12:true}).toLowerCase()}]}));
      setTimeout(()=>scrollRef.current?.scrollToEnd({animated:true}),100);
    }else{
      loadChannelGreeting(activeCtx);
    }
  },[]);

  useEffect(()=>{
    if(!loadedChans.has(activeCtx)&&!seedMessage) loadChannelGreeting(activeCtx);
    else setTimeout(()=>scrollRef.current?.scrollToEnd({animated:false}),50);
  },[activeCtx]);

  const loadBriefContinuation=async(channel:string,brief:string)=>{
    setLoadedChans(prev=>new Set([...prev,channel]));setLoading(true);
    try{
      const now=new Date();
      const ts=now.toLocaleTimeString('en-AU',{hour:'numeric',minute:'2-digit',hour12:true});
      const td=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-'+String(now.getDate()).padStart(2,'0');
      const[evR,mlR]=await Promise.all([
        supabase.from('events').select('title,start_time').eq('family_id',DUMMY_FAMILY_ID).gte('start_time',td).order('start_time').limit(4),
        supabase.from('meal_plans').select('meal_name').eq('family_id',DUMMY_FAMILY_ID).eq('day_key',td).limit(1),
      ]);
      const et=(evR.data||[]).map((e:any)=>`${e.title} (${e.start_time?.substring(11,16)||''})`).join(', ')||'none';
      const ctx=`Today: ${td}. Time: ${ts}. Events: ${et}. Tonight: ${mlR.data?.[0]?.meal_name||'not planned'}.`;
      const d=await callClaude({feature:'chat_greeting',familyId:DUMMY_FAMILY_ID,
        body:{model:HAIKU,max_tokens:120,system:`You are Zaeli — warm Australian family assistant. User tapped brief CTA. Continue naturally, 1-2 sentences. ${CAPABILITY_RULES} Context: ${ctx}`,
          messages:[{role:'user',content:`Brief:\n\n${brief}\n\nUser tapped yes. Continue.`}]}});
      const reply=d.content?.[0]?.text||`Right, let's get into it! What would you like to tackle first?`;
      setChannelMessages(prev=>({...prev,[channel]:[{id:'seed-'+channel,role:'assistant',content:reply,time:getTime()}]}));
    }catch{
      setChannelMessages(prev=>({...prev,[channel]:[{id:'seed-'+channel,role:'assistant',content:`Right, let's sort this — where do you want to start?`,time:getTime()}]}));
    }finally{setLoading(false);}
  };

  const loadChannelGreeting=async(channel:string)=>{
    setLoadedChans(prev=>new Set([...prev,channel]));setLoading(true);
    try{
      const now=new Date();const hour=now.getHours();
      const tod=hour<12?'morning':hour<17?'afternoon':'evening';
      const td=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-'+String(now.getDate()).padStart(2,'0');
      const dn=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
      const dayName=dn[now.getDay()];
      const ts=now.toLocaleTimeString('en-AU',{hour:'numeric',minute:'2-digit',hour12:true});
      let ctx='';
      if(channel==='Meals'){
        const[mlW,recR]=await Promise.all([
          supabase.from('meal_plans').select('day_key,meal_name,meal_type').eq('family_id',DUMMY_FAMILY_ID).gte('day_key',td).order('day_key').limit(7),
          supabase.from('recipes').select('name').eq('family_id',DUMMY_FAMILY_ID).limit(10),
        ]);
        const pl=mlW.data||[];const en=7-pl.filter((m:any)=>m.meal_type!=='dessert').length;
        const tm=pl.find((m:any)=>m.day_key===td&&m.meal_type!=='dessert');
        ctx=`Today: ${dayName} ${td}. Time: ${ts}. Tonight: ${tm?tm.meal_name:'not planned'}. Week: ${pl.map((m:any)=>`${m.day_key}: ${m.meal_name}`).join(', ')||'nothing planned'}. Empty nights: ${en}. Saved recipes: ${(recR.data||[]).map((r:any)=>r.name).join(', ')||'none'}.`;
      }else{
        const[evR,mlR]=await Promise.all([
          supabase.from('events').select('title,start_time').eq('family_id',DUMMY_FAMILY_ID).gte('start_time',td).order('start_time').limit(4),
          supabase.from('meal_plans').select('meal_name').eq('family_id',DUMMY_FAMILY_ID).eq('day_key',td).limit(1),
        ]);
        ctx=`Today: ${dayName} ${td}. Time: ${ts}. Events: ${(evR.data||[]).map((e:any)=>`${e.title} (${e.start_time?.substring(11,16)||''})`).join(', ')||'nothing'}. Tonight: ${mlR.data?.[0]?.meal_name||'not planned'}.`;
      }
      const se=channel==='Meals'?` Focus on unplanned nights and tonight. Don't start with "Good ${tod}".`:` Open with "Good ${tod}" naturally. Mention 1-2 context details.`;
      const d=await callClaude({feature:'chat_greeting',familyId:DUMMY_FAMILY_ID,
        body:{model:HAIKU,max_tokens:120,system:`${CHANNELS[channel].prompt} Write a warm greeting for ${DUMMY_MEMBER_NAME}.${se} Max 30 words. Be warm and specific. One emoji at start only.`,messages:[{role:'user',content:ctx}]}});
      const greeting=d.content?.[0]?.text||`Good ${tod}, ${DUMMY_MEMBER_NAME}! What can I help with?`;
      setChannelMessages(prev=>({...prev,[channel]:[{id:'g-'+channel,role:'assistant',content:greeting,time:getTime()}]}));
    }catch{
      const tod=new Date().getHours()<12?'morning':new Date().getHours()<17?'afternoon':'evening';
      setChannelMessages(prev=>({...prev,[channel]:[{id:'g-'+channel,role:'assistant',content:`Good ${tod}, ${DUMMY_MEMBER_NAME}! What can I help with?`,time:getTime()}]}));
    }finally{setLoading(false);}
  };

  const send=async(text?:string)=>{
    const msg=(text||input).trim();
    if(!msg||loading) return;
    setInput('');setShowHints(false);Keyboard.dismiss();
    const userMsg:Message={id:Date.now().toString(),role:'user',content:msg,time:getTime()};
    const next=[...messages,userMsg];
    setMessages(next);setLoading(true);
    setTimeout(()=>scrollRef.current?.scrollToEnd({animated:true}),100);

    try{
      const chosenModel=selectModel(msg);
      const mealKw=/\b(meal|dinner|recipe|cook|eat|food|lunch|breakfast|ingredient|menu|dish|cuisine|restaurant|cafe|snack|plan)\b/i;
      const shopKw=/\b(shop|shopping|buy|need|list|groceries|supermarket|woolies|coles|milk|bread|egg)\b/i;
      const pantryKw=/\b(pantry|stock|fridge|cupboard|have we got|do we have|do i have|have i got|running low|out of|inventory)\b/i;
      const nm=mealKw.test(msg),ns=shopKw.test(msg),np=pantryKw.test(msg)||ns;

      const now=new Date();
      const lds=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-'+String(now.getDate()).padStart(2,'0');
      const dayNames=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
      const monthNames=['January','February','March','April','May','June','July','August','September','October','November','December'];
      const lfd=`${dayNames[now.getDay()]} ${now.getDate()} ${monthNames[now.getMonth()]} ${now.getFullYear()}`;
      const lts=now.toLocaleTimeString('en-AU',{hour:'numeric',minute:'2-digit',hour12:true});
      const tz='UTC+10 (AEST, Sydney/Brisbane/Melbourne)';

      // Build explicit 7-day date lookup so Zaeli NEVER calculates dates herself.
      // Critical: use new Date(y,m,d) not new Date('YYYY-MM-DD') to avoid UTC day-shift in AEST.
      const weekMap:string[]=[];
      for(let i=0;i<7;i++){
        const d=new Date(now.getFullYear(),now.getMonth(),now.getDate()+i);
        const dk=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
        weekMap.push(`${dayNames[d.getDay()]}=${dk}`);
      }
      const weekDates=weekMap.join(', ');

      const[memR]=await Promise.all([supabase.from('family_members').select('name').eq('family_id',DUMMY_FAMILY_ID)]);
      let evR:any={data:[]},miR:any={data:[]},shR:any={data:[]},recR:any={data:[]},menuR:any={data:[]},mealR:any={data:[]},pantryR:any={data:[]};

      const loads:Promise<void>[]=[
        supabase.from('events').select('title,date,start_time').eq('family_id',DUMMY_FAMILY_ID).gte('start_time',lds).order('start_time').limit(10).then(r=>{evR=r;}),
        supabase.from('missions').select('title,priority,due_label,status').eq('family_id',DUMMY_FAMILY_ID).limit(10).then(r=>{miR=r;}),
      ];
      if(ns) loads.push(supabase.from('shopping_items').select('name,category,checked').eq('family_id',DUMMY_FAMILY_ID).limit(30).then(r=>{shR=r;}));
      if(np) loads.push(supabase.from('pantry_items').select('name,stock').eq('family_id',DUMMY_FAMILY_ID).limit(50).then(r=>{pantryR=r;}));
      // Always load meal_plans — needed for date conflict checking and dessert type detection
      // even when message doesn't contain meal keywords (e.g. "add lasagna to Saturday")
      loads.push(
        supabase.from('meal_plans').select('day_key,meal_name,meal_type').eq('family_id',DUMMY_FAMILY_ID).order('day_key',{ascending:true}).limit(14).then(r=>{mealR=r;})
      );
      if(nm){
        loads.push(
          supabase.from('recipes').select('name,tags,prep_mins').eq('family_id',DUMMY_FAMILY_ID).order('created_at',{ascending:false}).limit(30).then(r=>{recR=r;}),
          supabase.from('menus').select('venue_name,venue_type,items').eq('family_id',DUMMY_FAMILY_ID).limit(10).then(r=>{menuR=r;})
        );
      }
      await Promise.all(loads);
      const memCtx=await buildMemoryContext(DUMMY_FAMILY_ID);

      const fmtEvents=(evR.data||[]).slice(0,8).map((e:any)=>{
        const tp=(e.start_time||'').substring(11,16);const h=parseInt(tp.split(':')[0]||'0');const m=tp.split(':')[1]||'00';
        return `${e.title}${tp?` ${h===0?12:h>12?h-12:h}:${m}${h>=12?'pm':'am'}`:''} (${e.date||''})`;
      }).join(', ')||'none';
      const fmtTasks=(miR.data||[]).slice(0,6).map((t:any)=>`${t.title}${t.priority==='high'?' [urgent]':''}${t.due_label?' due '+t.due_label:''}`).join(', ')||'none';
      const fmtShop=ns?(shR.data||[]).filter((i:any)=>!i.checked).slice(0,20).map((i:any)=>i.name).join(', ')||'empty':'(not loaded)';
      const fmtPantry=np&&(pantryR.data||[]).length?pantryR.data.slice(0,30).map((p:any)=>`${p.name}:${p.stock}`).join(', '):np?'empty':'(not loaded)';

      // ── FIX: Include day name with each meal date to prevent day-of-week miscalculation ──
      // new Date('YYYY-MM-DD') parses as UTC midnight — in AEST (UTC+10) this shifts the day back by 1.
      // new Date(y, m-1, d) uses local time and returns the correct day name.
      const dayNamesCtx=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
      // Always format meal plan — now always loaded regardless of nm
      const fmtMeals=(mealR.data||[]).map((m:any)=>{
            const[y,mo,d]=m.day_key.split('-').map(Number);
            const dt=new Date(y,mo-1,d);
            return `${dayNamesCtx[dt.getDay()]} ${m.day_key} ${m.meal_type}: ${m.meal_name}`;
          }).join(' | ')||'none planned';

      const fmtRecipes=nm?(recR.data||[]).slice(0,20).map((r:any)=>r.name+(r.tags?.length?` [${r.tags.join(',')}]`:'')).join(', ')||'none':'(not loaded)';
      const fmtMenus=nm?(menuR.data||[]).map((m:any)=>`${m.venue_name}: ${(m.items||[]).slice(0,6).map((d:any)=>d.name).join(', ')||'no dishes'}`).join(' | ')||'none':'(not loaded)';
      const fmtFamily=(memR.data||[]).map((f:any)=>f.name).join(', ')||'Anna';

      const ctx=`Date: ${lfd} (${lds}). Time: ${lts}. Timezone: ${tz}.
WEEK DATES (use EXACTLY these — never calculate dates yourself): ${weekDates}.
Family: ${fmtFamily}.
Events: ${fmtEvents}.
Tasks: ${fmtTasks}.
Shopping: ${fmtShop}.
Pantry: ${fmtPantry}.
Meal plan: ${fmtMeals}.
SAVED RECIPES: ${fmtRecipes}.
SAVED MENUS: ${fmtMenus}.
${memCtx}`;

      const history=next.slice(-12).map((m:any)=>({role:m.role,content:m.content}));

      const systemPrompt=`${CHANNELS[activeCtx].prompt} Be warm, specific, concise — 1-3 sentences unless more is needed. Bold key info. Handle MULTIPLE requests — use all relevant tools in one go.

AFTER TOOL USE: When a tool returns ✅, do NOT repeat confirmation. Only respond if you have something new to add.
EDITING: Rescheduling/renaming → update_calendar_event always. Never add duplicates.
RECURRING: weekly/fortnightly/monthly → add_recurring_event.
CRITICAL DATES — copy EXACTLY from this lookup, never compute: ${weekDates}
CRITICAL TIMEZONE: ${tz}. Times as LOCAL ISO 8601 e.g. 2026-03-21T07:00:00 (date from lookup above).

CONTEXT:
${ctx}`;

      const loopSystem=`You are Zaeli, warm Australian family assistant. Complete the tool actions and respond naturally. ${CAPABILITY_RULES} Date: ${lds}. Time: ${lts}. Timezone: ${tz}. WEEK DATES (use EXACTLY these — never calculate): ${weekDates}.`;

      let loopMessages=history.map((m:any)=>({role:m.role,content:m.content}));
      let finalReply='';const toolResults:string[]=[];

      for(let turn=0;turn<6;turn++){
        const d=await callClaude({feature:'zaeli_chat',familyId:DUMMY_FAMILY_ID,
          body:{
            model:turn===0?chosenModel:HAIKU,
            // Raised to 1024 for Sonnet turn 0 — complex multi-tool responses need more room.
            // 600 caused truncation crash at message 11-12 in long sessions.
            max_tokens:turn===0&&chosenModel===SONNET?1024:600,
            system:turn===0?systemPrompt:loopSystem,
            tools:TOOL_DEFINITIONS,messages:loopMessages,
          }});

        if(d.stop_reason==='tool_use'){
          const tb=d.content.find((b:any)=>b.type==='text');
          if(tb?.text) setMessages(prev=>[...prev,{id:(Date.now()+turn).toString(),role:'assistant',content:tb.text,time:getTime()}]);
          const tbs=d.content.filter((b:any)=>b.type==='tool_use');
          const trc:any[]=[];
          for(const tb of tbs){const r=await executeTool(tb.name,tb.input);toolResults.push(r);trc.push({type:'tool_result',tool_use_id:tb.id,content:r});}
          loopMessages=[...loopMessages,{role:'assistant',content:d.content},{role:'user',content:trc}];
        }else{
          finalReply=d.content?.[0]?.text||'';break;
        }
      }

      const fu:Message[]=[];
      toolResults.forEach((r,i)=>fu.push({id:(Date.now()+i+Math.random()).toString(),role:'assistant',content:r,time:getTime(),isToolMsg:true}));
      if(finalReply) fu.push({id:(Date.now()+10).toString(),role:'assistant',content:finalReply,time:getTime()});
      saveConversation(DUMMY_FAMILY_ID,msg,toolResults.join(' | ')||finalReply);

      for(const recipe of extractRecipes(finalReply)){
        fu.push({id:(Date.now()+15+Math.random()).toString(),role:'assistant',content:`💾 Want me to save **${recipe.title}** to your recipes?`,time:getTime(),recipeData:recipe});
      }
      try{
        const reminder=await detectReminderIntent(msg,finalReply,DUMMY_FAMILY_ID);
        if(reminder){
          const nid=await scheduleReminder(reminder);
          await supabase.from('todos').insert({family_id:DUMMY_FAMILY_ID,title:reminder.title,priority:'high',status:'active',due_label:`Today at ${reminder.remindAt.toLocaleTimeString('en-AU',{hour:'numeric',minute:'2-digit',hour12:true})}`,reminder_time:reminder.remindAt.toISOString(),notif_id:nid});
          fu.push({id:(Date.now()+20).toString(),role:'assistant',isToolMsg:true,time:getTime(),content:nid?`✅ Reminder set for **${reminder.remindAt.toLocaleTimeString('en-AU',{hour:'numeric',minute:'2-digit',hour12:true})}** — added to Today's Focus.`:`📝 Added "${reminder.title}" to Today's Focus.`});
        }
      }catch(e){console.log('Reminder error:',e);}

      if(fu.length>0) setMessages(prev=>[...prev,...fu]);

    }catch(e:any){
      console.log('Chat error:',e?.message);
      // Graceful degradation — never crash the screen on a truncated or malformed response
      try{
        setMessages(prev=>[...prev,{id:(Date.now()+1).toString(),role:'assistant',content:"I hit a snag there — want to try that again?",time:getTime()}]);
      }catch{/* state update failed — screen unmounted, ignore */}
    }finally{
      setLoading(false);
      setTimeout(()=>scrollRef.current?.scrollToEnd({animated:true}),200);
    }
  };

  const retry=async()=>{
    const lu=[...messages].reverse().find(m=>m.role==='user');
    if(!lu){setMessages([]);setLoadedChans(prev=>{const s=new Set(prev);s.delete(activeCtx);return s;});loadChannelGreeting(activeCtx);return;}
    setMessages(prev=>{const i=[...prev].reverse().findIndex(m=>m.role==='assistant');return i===-1?prev:prev.slice(0,prev.length-1-i);});
    await send(lu.content);
  };

  const copyMessage=(id:string,text:string)=>{
    Clipboard.setString(text.replace(/\*\*(.*?)\*\*/g,'$1'));setCopiedId(id);
    if(Platform.OS==='android') ToastAndroid.show('Copied!',ToastAndroid.SHORT);
    setTimeout(()=>setCopiedId(null),2000);
  };
  const forwardMessage=async(text:string)=>{try{await Share.share({message:text.replace(/\*\*(.*?)\*\*/g,'$1')});}catch{}};
  const giveFeedback=(id:string,val:'up'|'down')=>{setFeedback(prev=>({...prev,[id]:prev[id]===val?null:val}));};

  return(
    <SafeAreaView style={s.safe} edges={[]}>
      <StatusBar style="dark"/>
      <View style={[s.hdr,{paddingTop:insets.top+8}]}>
        <TouchableOpacity style={s.backBtn} onPress={()=>router.push(returnTo as any)} activeOpacity={0.7}><IcoBack/></TouchableOpacity>
        <PulsingAvatar/>
        <View style={{flex:1,gap:2}}>
          <Text style={s.hdrName}>{'z'}<Text style={{color:C.mag}}>{'a'}</Text>{'el'}<Text style={{color:C.mag}}>{'i'}</Text></Text>
          <Text style={s.hdrStatus}>● Here for your family</Text>
        </View>
      </View>

      <View style={{flex:1}}>
        <ScrollView ref={scrollRef} style={s.chatScroll} contentContainerStyle={{padding:16,paddingBottom:24}}
          showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" removeClippedSubviews={true}
          onScroll={e=>{const{contentOffset,contentSize,layoutMeasurement}=e.nativeEvent;setShowScrollBtn(contentSize.height-contentOffset.y-layoutMeasurement.height>120);}} scrollEventThrottle={100}>

          <Text style={s.dateSep}>{new Date().toLocaleDateString('en-AU',{weekday:'long',day:'numeric',month:'short'}).toUpperCase()}</Text>

          {messages.map((m,idx)=>{
            const iz=m.role==='assistant';
            const st=idx===messages.length-1||messages[idx+1]?.role!==m.role;
            const fb=feedback[m.id];const ic=copiedId===m.id;const il=idx===messages.length-1;
            return(
              <View key={m.id} style={{marginBottom:2}}>
                <View style={[s.bubbleRow,!iz&&s.bubbleRowRight]}>
                  {iz&&<View style={[s.bubbleAv,m.isToolMsg&&{backgroundColor:'rgba(0,201,122,0.15)'}]}><Text style={s.bubbleAvStar}>{m.isToolMsg?'✓':'✦'}</Text></View>}
                  <View style={{maxWidth:'76%'}}>
                    <BoldText text={m.content} style={[s.bubble,iz?s.bubbleZaeli:s.bubbleUser,m.isToolMsg&&s.bubbleTool]}/>
                    {m.recipeData&&<TouchableOpacity style={s.recipeBtn} activeOpacity={0.8} onPress={()=>send(`Save the recipe for ${m.recipeData!.title}`)}><Text style={s.recipeBtnTxt}>💾 Save to recipes</Text></TouchableOpacity>}
                  </View>
                </View>
                {iz&&!m.isToolMsg&&(
                  <View style={s.actRow}>
                    <TouchableOpacity style={s.actBtn} onPress={()=>{}} activeOpacity={0.6}><IcoPlay/></TouchableOpacity>
                    <TouchableOpacity style={s.actBtn} onPress={()=>copyMessage(m.id,m.content)} activeOpacity={0.6}>{ic?<IcoCheck/>:<IcoCopy/>}</TouchableOpacity>
                    <TouchableOpacity style={s.actBtn} onPress={()=>forwardMessage(m.content)} activeOpacity={0.6}><IcoForward/></TouchableOpacity>
                    <View style={s.actSep}/>
                    <TouchableOpacity style={s.actBtn} onPress={()=>giveFeedback(m.id,'up')} activeOpacity={0.6}><IcoThumbUp color={fb==='up'?C.blue:IC}/></TouchableOpacity>
                    <TouchableOpacity style={s.actBtn} onPress={()=>giveFeedback(m.id,'down')} activeOpacity={0.6}><IcoThumbDown color={fb==='down'?C.mag:IC}/></TouchableOpacity>
                    {il&&<TouchableOpacity style={s.actBtn} onPress={retry} activeOpacity={0.6}><IcoRetry/></TouchableOpacity>}
                  </View>
                )}
                {!iz&&(
                  <View style={[s.actRow,{justifyContent:'flex-end'}]}>
                    <TouchableOpacity style={s.actBtn} onPress={()=>copyMessage(m.id,m.content)} activeOpacity={0.6}>{ic?<IcoCheck/>:<IcoCopy/>}</TouchableOpacity>
                    <TouchableOpacity style={s.actBtn} onPress={()=>forwardMessage(m.content)} activeOpacity={0.6}><IcoForward/></TouchableOpacity>
                  </View>
                )}
                {st&&<Text style={[s.bubbleTime,!iz&&{textAlign:'right',marginRight:2},iz&&{marginLeft:41}]}>{m.time}</Text>}
              </View>
            );
          })}

          {loading&&(
            <View style={s.bubbleRow}>
              <View style={s.bubbleAv}><Text style={s.bubbleAvStar}>✦</Text></View>
              <View style={s.typingBubble}>
                <Text style={s.typingLabel}>Thinking…</Text>
                <View style={{flexDirection:'row',gap:5,alignItems:'center'}}>{[0,200,400].map(d=><TypingDot key={d} delay={d}/>)}</View>
              </View>
            </View>
          )}
        </ScrollView>

        {showScrollBtn&&(
          <TouchableOpacity style={s.scrollBtn} activeOpacity={0.8} onPress={()=>scrollRef.current?.scrollToEnd({animated:true})}>
            <View style={s.scrollDot}/><Text style={s.scrollTxt}>New message</Text><IcoDown/>
          </TouchableOpacity>
        )}
      </View>

      <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':'height'} keyboardVerticalOffset={0}>
        <View style={s.inputArea}>
          <View style={s.inputBox}>
            <TextInput ref={inputRef} style={s.inputField} value={input} onChangeText={setInput}
              placeholder="Ask Zaeli anything…" placeholderTextColor={C.ink3} multiline
              returnKeyType="send" onSubmitEditing={()=>send()}
              onFocus={()=>{setShowHints(false);setTimeout(()=>scrollRef.current?.scrollToEnd({animated:true}),350);}}/>
            <TouchableOpacity style={s.micBtn} activeOpacity={0.7} onPress={()=>{}}><IcoMic/></TouchableOpacity>
            <TouchableOpacity style={[s.sendBtn,(!input.trim()||loading)&&{opacity:0.4}]} onPress={()=>send()} disabled={!input.trim()||loading} activeOpacity={0.8}><IcoSend/></TouchableOpacity>
          </View>
          {showHints&&(
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:6,paddingTop:10}}>
              {(CHANNELS[activeCtx]?.seeds||CHANNELS["General"].seeds).map(h=>(
                <TouchableOpacity key={h} style={s.hintChip} onPress={()=>send(h)} activeOpacity={0.8}><Text style={s.hintTxt}>{h}</Text></TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s=StyleSheet.create({
  safe:{flex:1,backgroundColor:C.chatBg},
  hdr:{flexDirection:'row',alignItems:'center',gap:12,paddingHorizontal:16,paddingVertical:10,paddingBottom:12,backgroundColor:'#fff',borderBottomWidth:1,borderBottomColor:C.border},
  backBtn:{width:34,height:34,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(0,87,255,0.07)',borderRadius:11},
  av:{width:42,height:42,borderRadius:13,backgroundColor:C.blue,alignItems:'center',justifyContent:'center',shadowColor:C.blue,shadowOpacity:0.35,shadowRadius:10,shadowOffset:{width:0,height:4}},
  avStar:{fontSize:20,color:'#fff'},
  hdrName:{fontFamily:'DMSerifDisplay_400Regular',fontSize:24,color:C.ink,lineHeight:28},
  hdrStatus:{fontFamily:'Poppins_600SemiBold',fontSize:11,color:C.green},
  chatScroll:{flex:1,backgroundColor:C.chatBg},
  dateSep:{fontFamily:'Poppins_700Bold',fontSize:10,color:C.ink3,textTransform:'uppercase',letterSpacing:1.2,textAlign:'center',marginBottom:16},
  bubbleRow:{flexDirection:'row',gap:9,alignItems:'flex-end'},
  bubbleRowRight:{flexDirection:'row-reverse'},
  bubbleAv:{width:32,height:32,borderRadius:10,backgroundColor:C.blue,alignItems:'center',justifyContent:'center',flexShrink:0,shadowColor:C.blue,shadowOpacity:0.2,shadowRadius:6,shadowOffset:{width:0,height:2}},
  bubbleAvStar:{fontSize:14,color:'#fff'},
  bubble:{paddingHorizontal:14,paddingVertical:11,fontFamily:'Poppins_400Regular',fontSize:15,lineHeight:24},
  bubbleZaeli:{backgroundColor:'#fff',borderRadius:4,borderTopRightRadius:18,borderBottomLeftRadius:18,borderBottomRightRadius:18,color:C.ink,shadowColor:'#000',shadowOpacity:0.07,shadowRadius:8,shadowOffset:{width:0,height:2}},
  bubbleUser:{backgroundColor:C.blue,borderRadius:18,borderTopRightRadius:4,color:'#fff'},
  bubbleTool:{backgroundColor:'rgba(0,201,122,0.06)',borderWidth:1,borderColor:'rgba(0,201,122,0.2)',color:C.ink,fontSize:14},
  bubbleTime:{fontFamily:'Poppins_400Regular',fontSize:10,color:C.ink3,marginTop:3,marginBottom:4},
  recipeBtn:{marginTop:6,marginLeft:41,alignSelf:'flex-start',backgroundColor:'rgba(0,87,255,0.07)',borderRadius:20,paddingHorizontal:12,paddingVertical:6,borderWidth:1,borderColor:'rgba(0,87,255,0.15)'},
  recipeBtnTxt:{fontFamily:'Poppins_600SemiBold',fontSize:12,color:C.blue},
  actRow:{flexDirection:'row',alignItems:'center',marginLeft:41,marginTop:3,marginBottom:8},
  actBtn:{width:30,height:30,alignItems:'center',justifyContent:'center',borderRadius:8},
  actSep:{width:1,height:10,backgroundColor:'rgba(0,0,0,0.10)',marginHorizontal:4},
  typingBubble:{backgroundColor:'rgba(0,87,255,0.05)',borderWidth:1.5,borderColor:'rgba(0,87,255,0.12)',borderRadius:4,borderTopRightRadius:18,borderBottomLeftRadius:18,borderBottomRightRadius:18,paddingHorizontal:14,paddingVertical:11},
  typingLabel:{fontFamily:'Poppins_700Bold',fontSize:10,textTransform:'uppercase',letterSpacing:1,color:C.blue,marginBottom:8},
  scrollBtn:{position:'absolute',bottom:10,right:12,flexDirection:'row',alignItems:'center',gap:5,backgroundColor:'#fff',borderRadius:20,paddingHorizontal:12,paddingVertical:6,borderWidth:1.5,borderColor:'rgba(0,0,0,0.08)',shadowColor:'#000',shadowOpacity:0.1,shadowRadius:8,shadowOffset:{width:0,height:2}},
  scrollDot:{width:7,height:7,borderRadius:4,backgroundColor:C.mag},
  scrollTxt:{fontFamily:'Poppins_700Bold',fontSize:11,color:C.blue},
  inputArea:{backgroundColor:'#fff',borderTopWidth:1,borderTopColor:C.border,paddingHorizontal:14,paddingTop:10,paddingBottom:Platform.OS==='ios'?28:12},
  inputBox:{flexDirection:'row',alignItems:'center',gap:8,backgroundColor:C.bg,borderWidth:1.5,borderColor:'rgba(0,0,0,0.10)',borderRadius:18,paddingHorizontal:14,paddingVertical:10},
  inputField:{flex:1,fontFamily:'Poppins_400Regular',fontSize:15,color:C.ink,maxHeight:100},
  micBtn:{width:36,height:36,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(0,0,0,0.06)',borderRadius:11},
  sendBtn:{width:36,height:36,borderRadius:11,backgroundColor:C.blue,alignItems:'center',justifyContent:'center',shadowColor:C.blue,shadowOpacity:0.3,shadowRadius:6,shadowOffset:{width:0,height:2}},
  hintChip:{paddingHorizontal:14,paddingVertical:7,borderRadius:20,backgroundColor:C.bg,borderWidth:1.5,borderColor:'rgba(0,0,0,0.10)'},
  hintTxt:{fontFamily:'Poppins_500Medium',fontSize:12,color:C.ink2},
});
