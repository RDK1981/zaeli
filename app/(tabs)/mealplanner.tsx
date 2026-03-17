import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  Modal, Platform, KeyboardAvoidingView, Animated, Easing,
  StyleSheet, Alert, Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import {
  useFonts,
  Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold,
  Poppins_700Bold, Poppins_800ExtraBold,
} from '@expo-google-fonts/poppins';
import { DMSerifDisplay_400Regular } from '@expo-google-fonts/dm-serif-display';
import Svg, { Line, Polyline, Circle } from 'react-native-svg';
import { NavMenu, HamburgerButton } from '../components/NavMenu';
import { supabase } from '../../lib/supabase';
import * as ImagePicker from 'expo-image-picker';

// ── Constants ─────────────────────────────────────────────────────────────────
const DUMMY_FAMILY_ID = '00000000-0000-0000-0000-000000000001';
const ANTHROPIC_API_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY || '';

// ── Colours — matching shopping.tsx exactly ───────────────────────────────────
const C = {
  bg: '#F7F7F7', card: '#FFFFFF', border: '#E0E0E0',
  ink: '#0A0A0A', ink2: 'rgba(0,0,0,0.50)', ink3: 'rgba(0,0,0,0.28)',
  dark: '#0A0A0A',
  orange: '#FF8C00', orangeL: 'rgba(255,140,0,0.10)', orangeB: 'rgba(255,140,0,0.22)',
  blue:   '#0057FF', blueL:  'rgba(0,87,255,0.08)',   blueB:  'rgba(0,87,255,0.22)',
  green:  '#00C97A', greenL: 'rgba(0,201,122,0.10)',  greenB: 'rgba(0,201,122,0.28)',
  mag: '#E0007C', yellow: '#FFE500', gold: '#B8A400',
  purple: '#9B6DD6', purpleL: 'rgba(155,127,212,0.10)',
  red: '#FF3B3B', redL: 'rgba(255,59,59,0.08)',
  kit: '#007a55', kitL: 'rgba(0,150,100,0.07)',
};

const FAMILY = [
  { id:'1', name:'Anna',    initial:'A', color:'#0057FF' },
  { id:'2', name:'Richard', initial:'R', color:'#FF8C00' },
  { id:'3', name:'Poppy',   initial:'P', color:'#9B6DD6' },
  { id:'4', name:'Gab',     initial:'G', color:'#00B4D8' },
  { id:'5', name:'Duke',    initial:'D', color:'#4A90E2' },
];
const KIDS = FAMILY.filter(m => ['3','4','5'].includes(m.id));

// ── Types ─────────────────────────────────────────────────────────────────────
type TabType = 'dinners' | 'recipes' | 'favourites';
type MealSource = 'library'|'favourites'|'zaeli'|'manual'|'kit'|'takeaway';
type MealPlan = {
  id:string; day_key:string; meal_name:string; meal_type:string;
  source:MealSource; image_url?:string; prep_mins?:number;
  cook_ids?:string[]; ingredients?:Ingredient[]; notes?:string; family_id:string;
};
type Ingredient = { name:string; emoji:string; qty:string; in_pantry:boolean };
type SavedRecipe = {
  id:string; name:string; source_type:'photo'|'url'|'manual'|'spoonacular';
  image_url?:string; prep_mins?:number; tags?:string[]; notes?:string; family_id:string;
};
type SavedMenu = {
  id:string; venue_name:string; venue_type?:string;
  notes?:string; image_url?:string; family_id:string; created_at?:string;
  items?:{name:string;description:string;price:string;dietary:string[]}[];
};
type SpoonRecipe = {
  id:number; title:string; image:string; readyInMinutes:number;
  servings:number; glutenFree:boolean; dairyFree:boolean; lowFodmap:boolean;
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function pad(n:number){return n<10?'0'+n:''+n;}
function dayKey(d:Date){return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;}
function addDays(d:Date,n:number){const r=new Date(d);r.setDate(r.getDate()+n);return r;}
function fmtDay(d:Date){
  const days=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
}
function isToday(d:Date){return dayKey(d)===dayKey(new Date());}
function isTomorrow(d:Date){return dayKey(d)===dayKey(addDays(new Date(),1));}
function dayLabel(d:Date){
  if(isToday(d)) return 'TONIGHT';
  if(isTomorrow(d)) return 'TOMORROW';
  return fmtDay(d).toUpperCase();
}
function get7Days():Date[]{return Array.from({length:7},(_,i)=>addDays(new Date(),i));}
function getTimeStr(){
  const n=new Date();
  return `${(n.getHours()%12)||12}:${String(n.getMinutes()).padStart(2,'0')} ${n.getHours()<12?'am':'pm'}`;
}

// Smart emoji based on meal name keywords
function getMealEmoji(name:string):string{
  const n=name.toLowerCase();
  if(/pasta|spag|carb|lasag|penne|fettucc|rigatoni|gnocchi/.test(n)) return '🍝';
  if(/pizza/.test(n)) return '🍕';
  if(/taco|burrito|nacho|mexican|fajita/.test(n)) return '🌮';
  if(/curry|butter chicken|tikka|masala|korma|dahl|lentil/.test(n)) return '🍛';
  if(/salad|slaw|bowl/.test(n)) return '🥗';
  if(/salmon|fish|prawn|shrimp|seafood|tuna|cod/.test(n)) return '🐟';
  if(/soup|broth|stew|casserole|chowder/.test(n)) return '🍲';
  if(/stir.fry|fried rice|noodle|pad thai|ramen|laksa/.test(n)) return '🍜';
  if(/burger|patty|mince/.test(n)) return '🍔';
  if(/sausage|snag|frank|hot dog/.test(n)) return '🌭';
  if(/chicken|schnitzel|wing|drumstick|kyiv/.test(n)) return '🍗';
  if(/steak|beef|lamb|roast|brisket/.test(n)) return '🥩';
  if(/egg|omelette|frittata|quiche/.test(n)) return '🥚';
  if(/veg|veggie|tofu|tempeh|plant/.test(n)) return '🥦';
  if(/sandwich|wrap|sub|roll|toast/.test(n)) return '🥪';
  if(/dessert|cake|cookie|brownie|pudding|tart|ice cream/.test(n)) return '🍰';
  if(/breakfast|pancake|waffle|muesli|porridge/.test(n)) return '🥞';
  if(/takeaway|pizza|delivery/.test(n)) return '🍕';
  // Default — rotate through a set based on string hash for variety
  const emojis=['🍽','🍴','🥘','🫕','🥣','🧆','🫔'];
  return emojis[name.length%emojis.length];
}
// Detect real image format from base64 magic bytes
function getMediaType(base64:string):'image/jpeg'|'image/png'|'image/gif'|'image/webp'{
  if(base64.startsWith('/9j/'))      return 'image/jpeg';
  if(base64.startsWith('iVBORw0K')) return 'image/png';
  if(base64.startsWith('R0lGOD'))   return 'image/gif';
  if(base64.startsWith('UklGR'))    return 'image/webp';
  return 'image/jpeg'; // safe fallback
}

// ── Dummy data ────────────────────────────────────────────────────────────────
const DUMMY_RECIPES:SpoonRecipe[]=[
  {id:654959,title:'Pasta Carbonara',    image:'https://spoonacular.com/recipeImages/654959-312x231.jpg', readyInMinutes:20,servings:4,glutenFree:false,dairyFree:false,lowFodmap:false},
  {id:715538,title:'Honey Soy Chicken',  image:'https://spoonacular.com/recipeImages/715538-312x231.jpg', readyInMinutes:25,servings:4,glutenFree:true, dairyFree:true, lowFodmap:false},
  {id:644387,title:'Minestrone Soup',    image:'https://spoonacular.com/recipeImages/644387-312x231.jpg', readyInMinutes:35,servings:6,glutenFree:false,dairyFree:true, lowFodmap:false},
  {id:716406,title:'Lemon Baked Salmon', image:'https://spoonacular.com/recipeImages/716406-312x231.jpg', readyInMinutes:25,servings:4,glutenFree:true, dairyFree:true, lowFodmap:true },
  {id:665613,title:'Chicken Stir-Fry',   image:'https://spoonacular.com/recipeImages/665613-312x231.jpg', readyInMinutes:20,servings:4,glutenFree:true, dairyFree:true, lowFodmap:false},
  {id:632660,title:'Beef Tacos',          image:'https://spoonacular.com/recipeImages/632660-312x231.jpg', readyInMinutes:20,servings:4,glutenFree:false,dairyFree:true, lowFodmap:false},
  {id:715769,title:'Greek Salad Bowl',   image:'https://spoonacular.com/recipeImages/715769-312x231.jpg', readyInMinutes:10,servings:2,glutenFree:true, dairyFree:false,lowFodmap:false},
  {id:664147,title:'Butter Chicken',     image:'https://spoonacular.com/recipeImages/664147-312x231.jpg', readyInMinutes:40,servings:4,glutenFree:true, dairyFree:false,lowFodmap:false},
];
const DUMMY_FAVS:SavedRecipe[]=[
  {id:'f1',name:'Honey Soy Chicken',    source_type:'spoonacular',image_url:'https://spoonacular.com/recipeImages/715538-312x231.jpg',prep_mins:25,tags:['Kids love','Quick'],          family_id:DUMMY_FAMILY_ID},
  {id:'f2',name:'Pasta Bake',           source_type:'spoonacular',image_url:'https://spoonacular.com/recipeImages/654959-312x231.jpg',prep_mins:30,tags:['Family','Kids love'],         family_id:DUMMY_FAMILY_ID},
  {id:'f3',name:"Mum's Slow Cooker Stew",source_type:'photo',                                                                          tags:['Comfort','Slow cook'],           family_id:DUMMY_FAMILY_ID},
  {id:'f4',name:"Dr Joanna's Gut Soup", source_type:'url',                                                                              tags:['Gut health','Low FODMAP'],        family_id:DUMMY_FAMILY_ID},
];

// ── Icons ─────────────────────────────────────────────────────────────────────
function IcoSend(){
  return(
    <Svg width={16} height={16} viewBox="0 0 24 24">
      <Line x1="12" y1="19" x2="12" y2="5" stroke="#fff" strokeWidth={2.5} strokeLinecap="round"/>
      <Polyline points="5 12 12 5 19 12" stroke="#fff" strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    </Svg>
  );
}
function IcoSearch({color=C.ink3}:{color?:string}){
  return(
    <Svg width={18} height={18} viewBox="0 0 24 24">
      <Circle cx="11" cy="11" r="8" stroke={color} strokeWidth={2} fill="none"/>
      <Line x1="21" y1="21" x2="16.65" y2="16.65" stroke={color} strokeWidth={2} strokeLinecap="round"/>
    </Svg>
  );
}

// ── Typing dots — matching home/shopping pattern ──────────────────────────────
function TypingDot({delay}:{delay:number}){
  const a=useRef(new Animated.Value(0)).current;
  useEffect(()=>{
    const anim=Animated.loop(Animated.sequence([
      Animated.delay(delay),
      Animated.timing(a,{toValue:1,duration:350,useNativeDriver:true}),
      Animated.timing(a,{toValue:0,duration:350,useNativeDriver:true}),
      Animated.delay(700-delay),
    ]));
    anim.start(); return()=>anim.stop();
  },[]);
  return <Animated.View style={{width:7,height:7,borderRadius:3.5,backgroundColor:C.orange,opacity:a,transform:[{translateY:a.interpolate({inputRange:[0,1],outputRange:[0,-4]})}]}}/>;
}

// ── Cook Avatars ──────────────────────────────────────────────────────────────
function CookAvatars({cookIds,size=20}:{cookIds:string[];size?:number}){
  if(!cookIds?.length) return null;
  return(
    <View style={{flexDirection:'row',gap:3}}>
      {FAMILY.filter(m=>cookIds.includes(m.id)).map(c=>(
        <View key={c.id} style={{width:size,height:size,borderRadius:size/4,backgroundColor:c.color,alignItems:'center',justifyContent:'center'}}>
          <Text style={{color:'#fff',fontSize:size*0.45,fontFamily:'Poppins_700Bold'}}>{c.initial}</Text>
        </View>
      ))}
    </View>
  );
}

// ── Assign Cook + Job Modal ───────────────────────────────────────────────────
function AssignCookModal({visible,dayLbl,mealName,onClose,onSave}:{
  visible:boolean;dayLbl:string;mealName:string;
  onClose:()=>void;
  onSave:(cookIds:string[],jobKidIds:string[],points:Record<string,number>)=>void;
}){
  const [selected,setSelected]=useState<string[]>([]);
  const [jobKids, setJobKids] =useState<string[]>([]);
  const [points,  setPoints]  =useState<Record<string,number>>({});
  const [custom,  setCustom]  =useState<Record<string,string>>({});
  useEffect(()=>{if(visible){setSelected([]);setJobKids([]);setPoints({});setCustom({});}},[ visible]);
  const toggle=(id:string)=>setSelected(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id]);
  const toggleJob=(id:string)=>setJobKids(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id]);
  const sugPts=(id:string)=>id==='3'?30:id==='4'?25:id==='5'?20:30;
  const handleSave=()=>{
    const fp:Record<string,number>={};
    KIDS.filter(k=>selected.includes(k.id)&&jobKids.includes(k.id)).forEach(k=>{
      const cv=parseInt(custom[k.id]||'0');
      fp[k.id]=cv>0?cv:(points[k.id]||sugPts(k.id));
    });
    onSave(selected,jobKids,fp); onClose();
  };
  const selKids=KIDS.filter(k=>selected.includes(k.id));
  return(
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{flex:1,backgroundColor:'#fff'}} edges={['top']}>
        <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':'height'}>
          <View style={s.modalHdr}>
            <TouchableOpacity onPress={onClose}><Text style={s.modalCancel}>Cancel</Text></TouchableOpacity>
            <Text style={s.modalTitle}>Who's cooking?</Text>
            <TouchableOpacity onPress={handleSave}><Text style={s.modalSave}>Done</Text></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{padding:20,gap:16}} keyboardShouldPersistTaps="handled">
            <Text style={s.modalSub}>{dayLbl}{mealName?` · ${mealName}`:''}</Text>
            <Text style={s.fieldLbl}>SELECT FAMILY MEMBERS</Text>
            <View style={{flexDirection:'row',flexWrap:'wrap',gap:10}}>
              {FAMILY.map(m=>{
                const on=selected.includes(m.id);
                return(
                  <TouchableOpacity key={m.id} style={[s.memberTile,on&&{borderColor:C.orange,backgroundColor:C.orangeL}]}
                    onPress={()=>toggle(m.id)} activeOpacity={0.8}>
                    <View style={[s.memberAv,{backgroundColor:m.color}]}>
                      <Text style={{color:'#fff',fontSize:16,fontFamily:'Poppins_700Bold'}}>{m.initial}</Text>
                    </View>
                    <Text style={[s.memberName,on&&{color:C.ink,fontFamily:'Poppins_700Bold'}]}>{m.name}</Text>
                    {on&&<Text style={{fontSize:14,color:C.orange}}>✓</Text>}
                  </TouchableOpacity>
                );
              })}
            </View>
            {selKids.map(kid=>(
              <View key={kid.id} style={s.jobPrompt}>
                <View style={{flexDirection:'row',alignItems:'center',gap:8,marginBottom:8}}>
                  <View style={{width:26,height:26,borderRadius:8,backgroundColor:C.orange,alignItems:'center',justifyContent:'center'}}>
                    <Text style={{color:'#fff',fontSize:11}}>✦</Text>
                  </View>
                  <Text style={s.jpTitle}>Add a cooking job for {kid.name}?</Text>
                </View>
                <Text style={s.jpBody}>Add <Text style={{fontFamily:'Poppins_700Bold'}}>"Help cook dinner — {dayLbl}"</Text> to {kid.name}'s jobs list so they can tick it off and earn points.</Text>
                <TouchableOpacity style={[s.jpBtn,jobKids.includes(kid.id)&&{backgroundColor:C.purple,borderColor:C.purple}]}
                  onPress={()=>toggleJob(kid.id)} activeOpacity={0.8}>
                  <Text style={[s.jpBtnTxt,jobKids.includes(kid.id)&&{color:'#fff'}]}>
                    {jobKids.includes(kid.id)?'✓ Job added':'+ Add job for '+kid.name}
                  </Text>
                </TouchableOpacity>
                {jobKids.includes(kid.id)&&(
                  <View style={{marginTop:12}}>
                    <Text style={[s.fieldLbl,{marginBottom:8}]}>POINTS · Zaeli suggests {sugPts(kid.id)} based on age</Text>
                    <View style={{flexDirection:'row',gap:6,flexWrap:'wrap'}}>
                      {[15,25,35].map(p=>{
                        const on=points[kid.id]===p&&!custom[kid.id];
                        return(
                          <TouchableOpacity key={p} style={[s.ptsOpt,on&&s.ptsOptOn]}
                            onPress={()=>{setPoints(prev=>({...prev,[kid.id]:p}));setCustom(prev=>({...prev,[kid.id]:''}));}}
                            activeOpacity={0.8}>
                            <Text style={[s.ptsOptTxt,on&&{color:'#fff'}]}>{p}</Text>
                          </TouchableOpacity>
                        );
                      })}
                      <TouchableOpacity style={[s.ptsOpt,(points[kid.id]===-1||!!custom[kid.id])?s.ptsOptOn:{}]}
                        onPress={()=>setPoints(prev=>({...prev,[kid.id]:-1}))} activeOpacity={0.8}>
                        <Text style={[s.ptsOptTxt,(points[kid.id]===-1||!!custom[kid.id])&&{color:'#fff'}]}>Custom</Text>
                      </TouchableOpacity>
                    </View>
                    {points[kid.id]===-1&&(
                      <View style={{flexDirection:'row',alignItems:'center',gap:8,marginTop:10}}>
                        <TextInput style={s.customPtsInput} keyboardType="numeric" placeholder="e.g. 50"
                          placeholderTextColor={C.ink3} value={custom[kid.id]||''}
                          onChangeText={v=>setCustom(prev=>({...prev,[kid.id]:v}))} maxLength={4}/>
                        <Text style={{fontSize:13,color:C.ink2,fontFamily:'Poppins_600SemiBold'}}>pts</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            ))}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

// ── Add Meal Modal — all options wired ───────────────────────────────────────
function AddMealModal({visible,targetDayKey,targetDayLabel,onClose,onSaved,onBrowseRecipes,onFavourites}:{
  visible:boolean;targetDayKey:string;targetDayLabel:string;
  onClose:()=>void;onSaved:()=>void;
  onBrowseRecipes:()=>void;onFavourites:()=>void;
}){
  const router=useRouter();
  const [mode,setMode]=useState<'menu'|'manual'|'kit'>('menu');
  const [name,setName]=useState('');
  const [saving,setSaving]=useState(false);
  const reset=()=>{setMode('menu');setName('');setSaving(false);};

  const saveToDb=async(mealName:string,source:MealSource)=>{
    setSaving(true);
    const{error}=await supabase.from('meal_plans').insert({
      family_id:DUMMY_FAMILY_ID,
      day_key:targetDayKey,
      planned_date:targetDayKey,
      meal_name:mealName||'Dinner',
      meal_type:'dinner',
      source,
    });
    if(error) Alert.alert('Could not save',error.message);
    setSaving(false); reset(); onSaved(); onClose();
  };

  const opts=[
    {icon:'✦', label:'Ask Zaeli for ideas',    sub:'She\'ll ask a couple of quick questions', bg:C.orangeL,
      onPress:()=>{onClose();reset();router.push({pathname:'/(tabs)/zaeli-chat',params:{channel:'Meals',returnTo:'/(tabs)/mealplanner'}});}},
    {icon:'🔍',label:'Browse recipes',          sub:'Search 5,000+ with pantry matching',      bg:C.blueL,
      onPress:()=>{onClose();reset();onBrowseRecipes();}},
    {icon:'❤️',label:'Pick from favourites',    sub:'Your family\'s saved meals',              bg:C.purpleL,
      onPress:()=>{onClose();reset();onFavourites();}},
    {icon:'📦',label:'Meal kit night',          sub:'Ingredients included — skips pantry sync',bg:C.kitL,
      onPress:()=>setMode('kit')},
    {icon:'✏️',label:'Add manually',            sub:'Just the name — no ingredients needed',  bg:'rgba(0,0,0,0.04)',
      onPress:()=>setMode('manual')},
    {icon:'🍕',label:'Takeaway / eating out',   sub:'Mark the night as sorted',               bg:C.redL,
      onPress:()=>saveToDb('Takeaway / Eating out','takeaway')},
  ];

  return(
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet"
      onRequestClose={()=>{onClose();reset();}}>
      <SafeAreaView style={{flex:1,backgroundColor:'#fff'}} edges={['top']}>
        <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':'height'}>
          <View style={s.modalHdr}>
            <TouchableOpacity onPress={()=>{if(mode!=='menu')setMode('menu');else{onClose();reset();}}}>
              <Text style={s.modalCancel}>{mode!=='menu'?'← Back':'Cancel'}</Text>
            </TouchableOpacity>
            <Text style={s.modalTitle}>{targetDayLabel}</Text>
            <View style={{width:60}}/>
          </View>
          {mode==='menu'&&(
            <ScrollView contentContainerStyle={{padding:20,gap:0}}>
              <Text style={[s.fieldLbl,{marginBottom:16}]}>WHAT'S FOR DINNER?</Text>
              {opts.map((opt,i)=>(
                <TouchableOpacity key={i} style={s.addOpt} onPress={opt.onPress} activeOpacity={0.8}>
                  <View style={[s.addOptIcon,{backgroundColor:opt.bg}]}><Text style={{fontSize:22}}>{opt.icon}</Text></View>
                  <View style={{flex:1}}>
                    <Text style={s.addOptTitle}>{opt.label}</Text>
                    <Text style={s.addOptSub}>{opt.sub}</Text>
                  </View>
                  <Text style={{fontSize:20,color:C.ink3}}>›</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
          {(mode==='manual'||mode==='kit')&&(
            <ScrollView contentContainerStyle={{padding:20,gap:14}} keyboardShouldPersistTaps="handled">
              <Text style={s.fieldLbl}>{mode==='kit'?'MEAL KIT NAME (optional)':'WHAT\'S THE MEAL CALLED?'}</Text>
              <TextInput style={s.fieldInput}
                placeholder={mode==='kit'?'e.g. Thai Beef Salad':'e.g. Spaghetti Bolognese'}
                placeholderTextColor={C.ink3} value={name} onChangeText={setName}
                autoFocus returnKeyType="done"
                onSubmitEditing={()=>saveToDb(name,mode==='kit'?'kit':'manual')}/>
              {mode==='kit'&&(
                <View style={{backgroundColor:C.kitL,borderRadius:12,padding:13,borderWidth:1.5,borderColor:'rgba(0,150,100,0.2)'}}>
                  <Text style={{fontFamily:'Poppins_700Bold',fontSize:13,color:C.kit,marginBottom:4}}>💡 Worth saving to Favourites?</Text>
                  <Text style={{fontFamily:'Poppins_400Regular',fontSize:12,color:C.ink2,lineHeight:18}}>
                    Meal kits are often meals you can recreate yourself. After adding tonight, you can save the recipe to Favourites from the Dinners tab.
                  </Text>
                </View>
              )}
              <TouchableOpacity style={[s.bigBtnOr,saving&&{opacity:0.5}]}
                onPress={()=>saveToDb(name,mode==='kit'?'kit':'manual')}
                disabled={saving} activeOpacity={0.85}>
                <Text style={s.bigBtnTxt}>{saving?'Saving…':mode==='kit'?'Add meal kit night':'Add to plan'}</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

// ── Meal Detail Modal ─────────────────────────────────────────────────────────
function MealDetailModal({visible,meal,dayLbl,onClose,onRequestAssign,onMove,onEdit}:{
  visible:boolean;meal:MealPlan|null;dayLbl:string;
  onClose:()=>void;onRequestAssign:()=>void;onMove?:()=>void;
  onEdit?:(meal:MealPlan)=>void;
}){
  if(!meal) return null;
  const missing=meal.ingredients?.filter(i=>!i.in_pantry)??[];
  const allOk=missing.length===0&&(meal.ingredients?.length??0)>0;
  const cookNames=meal.cook_ids?.length
    ?FAMILY.filter(m=>meal.cook_ids!.includes(m.id)).map(m=>m.name).join(' + ')
    :null;

  // Parse method from notes if ingredients are in structured notes field
  const parsedIngredients = meal.notes?.includes('Ingredients:')
    ? (meal.notes.split(/\n(?=Method:)/)[0]?.replace(/^Ingredients:\n?/,'').trim()||'')
    : null;
  const parsedMethod = meal.notes?.includes('Method:')
    ? (meal.notes.split(/\n(?=Method:)/)[1]?.replace(/^Method:\n?/,'').trim()||'')
    : null;

  const addMissing=async()=>{
    for(const ing of missing){
      await supabase.from('shopping_items').insert({
        family_id:DUMMY_FAMILY_ID,name:ing.name,item:ing.name,
        category:'Other',checked:false,completed:false,meal_source:meal.meal_name,
      });
    }
    Alert.alert('Done!',`${missing.length} item${missing.length!==1?'s':''} added to your shopping list.`);
  };

  return(
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{flex:1,backgroundColor:'#fff'}} edges={['top']}>
        <View style={s.detailHdr}>
          <TouchableOpacity style={s.detailBack} onPress={onClose}>
            <Text style={{fontSize:22,color:C.blue,lineHeight:24}}>‹</Text>
          </TouchableOpacity>
          <Text style={[s.modalTitle,{textAlign:'left',flex:1}]} numberOfLines={1}>{meal.meal_name}</Text>
          {/* Edit — calls parent handler which keeps state alive after modal closes */}
          <TouchableOpacity onPress={()=>{onClose();onEdit&&onEdit(meal);}} activeOpacity={0.7}
            style={{width:34,height:34,borderRadius:10,backgroundColor:'rgba(0,0,0,.06)',alignItems:'center',justifyContent:'center'}}>
            <Text style={{fontSize:15}}>✏️</Text>
          </TouchableOpacity>
        </View>
        <ScrollView showsVerticalScrollIndicator={false}>
          {meal.image_url?(
            <Image source={{uri:meal.image_url}} style={s.detailImg} resizeMode="cover"/>
          ):(
            <View style={[s.detailImg,{backgroundColor:'#f8f5f0',alignItems:'center',justifyContent:'center'}]}>
              <Text style={{fontSize:64}}>{getMealEmoji(meal.meal_name)}</Text>
            </View>
          )}
          <View style={{padding:18}}>
            <Text style={s.detailTitle}>{meal.meal_name}</Text>
            <View style={{flexDirection:'row',gap:8,flexWrap:'wrap',marginBottom:16}}>
              {meal.prep_mins&&<View style={s.pillOr}><Text style={s.pillOrTxt}>⏱ {meal.prep_mins} min</Text></View>}
              <View style={s.pillGr}><Text style={s.pillGrTxt}>Serves 4</Text></View>
            </View>
            {/* Cook assignment */}
            <View style={s.cookAssignBox}>
              <Text style={[s.fieldLbl,{marginBottom:10}]}>WHO'S COOKING?</Text>
              <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
                {cookNames?(
                  <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
                    <CookAvatars cookIds={meal.cook_ids!} size={30}/>
                    <Text style={s.cookNameTxt}>{cookNames}</Text>
                  </View>
                ):(
                  <Text style={{fontSize:13,color:C.ink3,fontFamily:'Poppins_400Regular'}}>No one assigned yet</Text>
                )}
                <TouchableOpacity style={s.assignBtn} onPress={()=>{onClose();onRequestAssign();}} activeOpacity={0.8}>
                  <Text style={s.assignBtnTxt}>{cookNames?'Change':'+ Assign'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Structured ingredients (from RecipeDetailModal add flow) */}
            {meal.ingredients?.length>0&&(
              <>
                <Text style={s.sectionHdr}>Ingredients</Text>
                {(meal.ingredients??[]).map((ing,i)=>(
                  <View key={i} style={s.ingRow}>
                    <Text style={{fontSize:18}}>{ing.emoji||'🍴'}</Text>
                    <Text style={[s.ingName,{flex:1}]}>{ing.name}</Text>
                    {ing.qty?<Text style={s.ingQty}>{ing.qty}</Text>:null}
                    {ing.in_pantry?(
                      <View style={s.ingOk}><Text style={s.ingOkTxt}>In pantry</Text></View>
                    ):(
                      <><View style={s.ingMiss}><Text style={s.ingMissTxt}>Needed</Text></View>
                      <TouchableOpacity style={s.ingAddBtn} onPress={addMissing} activeOpacity={0.8}>
                        <Text style={s.ingAddTxt}>+ List</Text>
                      </TouchableOpacity></>
                    )}
                  </View>
                ))}
              </>
            )}

            {/* Text ingredients from notes (Zaeli-added recipes) */}
            {(!meal.ingredients?.length)&&parsedIngredients&&(
              <>
                <Text style={s.sectionHdr}>Ingredients</Text>
                <View style={s.notesBox}>
                  <Text style={s.notesTxt}>{parsedIngredients}</Text>
                </View>
              </>
            )}

            {/* Method */}
            {parsedMethod&&(
              <>
                <Text style={[s.sectionHdr,{marginTop:12}]}>Method</Text>
                <View style={s.notesBox}>
                  <Text style={s.notesTxt}>{parsedMethod}</Text>
                </View>
              </>
            )}

            {/* Plain notes (no structure) */}
            {(!parsedIngredients)&&meal.notes&&(
              <>
                <Text style={[s.sectionHdr,{marginTop:12}]}>Notes</Text>
                <View style={s.notesBox}>
                  <Text style={s.notesTxt}>{meal.notes}</Text>
                </View>
              </>
            )}

            {/* Pantry status */}
            {(meal.ingredients?.length??0)>0&&(
              allOk?(
                <View style={[s.pantryAllOk,{marginTop:12}]}>
                  <View style={{width:26,height:26,borderRadius:8,backgroundColor:C.green,alignItems:'center',justifyContent:'center'}}>
                    <Text style={{color:'#fff',fontSize:11}}>✦</Text>
                  </View>
                  <Text style={{fontSize:13,color:C.ink,lineHeight:20,flex:1}}>
                    <Text style={{fontFamily:'Poppins_700Bold'}}>All ingredients in pantry</Text> — ready to cook!
                  </Text>
                </View>
              ):(
                <TouchableOpacity style={[s.bigBtnOr,{marginTop:12}]} onPress={addMissing} activeOpacity={0.85}>
                  <Text style={s.bigBtnTxt}>🛒 Add {missing.length} missing item{missing.length!==1?'s':''} to list</Text>
                </TouchableOpacity>
              )
            )}

            <TouchableOpacity style={[s.bigBtnGhost,{marginTop:12}]} activeOpacity={0.85}
              onPress={()=>{onClose();onMove&&onMove();}}>
              <Text style={s.bigBtnGhostTxt}>Move to a different night</Text>
            </TouchableOpacity>
            <View style={{height:40}}/>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ── Save Recipe Modal ─────────────────────────────────────────────────────────
function SaveRecipeModal({visible,onClose,onSaved,router}:{visible:boolean;onClose:()=>void;onSaved:()=>void;router:ReturnType<typeof useRouter>;}){
  const [mode,setMode]=useState<'menu'|'url'|'manual'|'describe'|'savemenu'>('menu');
  const [url,setUrl]=useState('');
  const [name,setName]=useState('');
  const [ingredients,setIngredients]=useState('');
  const [method,setMethod]=useState('');
  const [tags,setTags]=useState<string[]>([]);
  const [saving,setSaving]=useState(false);
  const ALL_TAGS=['Family','Kids love','Quick','Healthy','Comfort','Gut health','Low FODMAP','Gluten free','Dairy free','Thermomix','Slow cooker','Air fryer'];
  const reset=()=>{setMode('menu');setUrl('');setName('');setIngredients('');setMethod('');setTags([]);setSaving(false);setExtractedPhotos([]);setMenuExtracting(false);};

  const [extracting,setExtracting]=useState(false);
  const [extractedPhotos,setExtractedPhotos]=useState<string[]>([]);
  const [menuExtracting,setMenuExtracting]=useState(false);

  const extractMenuFromPhoto=async(base64:string)=>{
    setMenuExtracting(true);
    try{
      const res=await fetch('https://api.anthropic.com/v1/messages',{
        method:'POST',
        headers:{'Content-Type':'application/json','x-api-key':ANTHROPIC_API_KEY,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
        body:JSON.stringify({
          model:'claude-sonnet-4-20250514',
          max_tokens:4096,
          messages:[{role:'user',content:[
            {type:'image',source:{type:'base64',media_type:getMediaType(base64),data:base64}},
            {type:'text',text:`This is a cafe or restaurant menu. Extract all the information you can see.
Reply ONLY with this JSON object, nothing else:
{"venue_name":"Name of the cafe or restaurant","venue_type":"cafe or restaurant or takeaway","items":[{"name":"Dish name","description":"description if visible","price":"$12 or empty string","dietary":["GF","V","VG","DF"]}]}

Rules:
- venue_name: best guess from logo, header, or branding visible. Use "Menu" if unclear.
- venue_type: "cafe", "restaurant", or "takeaway"
- items: every dish/item you can read. Include all sections (breakfast, lunch, dinner, drinks, desserts).
- dietary: only include tags visible on the menu (GF=gluten free, V=vegetarian, VG=vegan, DF=dairy free). Empty array if none shown.
- price: include currency symbol if visible, empty string if not shown.
- Output ONLY the JSON. No markdown. No explanation.`},
          ]}],
        }),
      });
      if(!res.ok){const e=await res.text();throw new Error(`API ${res.status}: ${e.substring(0,200)}`);}
      const data=await res.json();
      const textBlock=data?.content?.find((b:any)=>b.type==='text');
      const raw=(textBlock?.text||'').trim();
      const cleaned=raw.replace(/^```json?\s*/,'').replace(/\s*```$/,'').trim();
      let parsed:any;
      try{parsed=JSON.parse(cleaned);}catch{
        const m=cleaned.match(/\{[\s\S]*\}/);
        if(m) parsed=JSON.parse(m[0]);
        else throw new Error('Could not parse menu response');
      }
      // Save to menus table
      const{data:menuRow,error:menuErr}=await supabase.from('menus').insert({
        family_id:DUMMY_FAMILY_ID,
        venue_name:parsed.venue_name||'Saved Menu',
        venue_type:parsed.venue_type||'restaurant',
        items:parsed.items||[],
        notes:`${parsed.items?.length||0} items extracted`,
      }).select('id').single();
      if(menuErr) throw new Error('Database error: '+menuErr.message);
      Alert.alert(
        '✓ Menu saved!',
        `"${parsed.venue_name||'Menu'}" saved with ${parsed.items?.length||0} dishes. Find it in Favourites → Saved Menus.`,
        [{text:'Done',onPress:()=>{onSaved();onClose();reset();}}]
      );
    }catch(e:any){
      Alert.alert('Menu extraction failed',`${e?.message||'Unknown error'}\n\nTry saving the venue manually instead.`);
    }finally{setMenuExtracting(false);}
  };

  const takeMenuPhoto=async()=>{
    const perm=await ImagePicker.requestCameraPermissionsAsync();
    if(!perm.granted){Alert.alert('Permission required','Please allow camera access in Settings.');return;}
    const result=await ImagePicker.launchCameraAsync({base64:true,quality:0.15,allowsEditing:true,exif:false});
    if(result.canceled||!result.assets?.[0]?.base64) return;
    const b64=result.assets[0].base64!;
    if(b64.length>3800000){Alert.alert('Photo too large','Please try a lower resolution photo.');return;}
    await extractMenuFromPhoto(b64);
  };

  const uploadMenuPhoto=async()=>{
    const perm=await ImagePicker.requestMediaLibraryPermissionsAsync();
    if(!perm.granted){Alert.alert('Permission required','Please allow photo library access in Settings.');return;}
    const result=await ImagePicker.launchImageLibraryAsync({base64:true,quality:0.2,mediaTypes:ImagePicker.MediaTypeOptions.Images});
    if(result.canceled||!result.assets?.[0]?.base64) return;
    const b64=result.assets[0].base64!;
    if(b64.length>3800000){Alert.alert('Photo too large','Please choose a smaller image.');return;}
    await extractMenuFromPhoto(b64);
  };

  const extractRecipesFromPhotos=async(base64Images:string[])=>{
    if(!base64Images||base64Images.length===0){
      Alert.alert('No photos','Please take or upload a photo first.');
      return;
    }
    setExtracting(true);
    try{
      const imgs=base64Images.slice(0,2); // max 2 to keep response size manageable
      const imageContent=imgs.map(b=>({
        type:'image' as const,
        source:{type:'base64' as const,media_type:getMediaType(b),data:b},
      }));
      const res=await fetch('https://api.anthropic.com/v1/messages',{
        method:'POST',
        headers:{
          'Content-Type':'application/json',
          'x-api-key':ANTHROPIC_API_KEY,
          'anthropic-version':'2023-06-01',
          'anthropic-dangerous-direct-browser-access':'true',
        },
        body:JSON.stringify({
          model:'claude-sonnet-4-20250514',
          max_tokens:4096,
          messages:[{role:'user',content:[
            ...imageContent,
            {type:'text',text:`Look at this image and extract the recipe. Reply with ONLY this JSON object — nothing else before or after it:
{"name":"Recipe name here","ingredients":"Each ingredient on its own line","method":"Step 1 here\\nStep 2 here","tags":[],"prep_mins":null}

Rules:
- name: the recipe name, or "Photo Recipe" if unclear
- ingredients: all ingredients you can read, each on a new line. Empty string if not visible.
- method: numbered steps each on a new line. Empty string if not visible.
- tags: array of applicable strings from: ["Family","Kids love","Quick","Healthy","Comfort","Gut health","Low FODMAP","Gluten free","Dairy free"]
- prep_mins: number or null
- Output ONLY the JSON object. No explanation. No markdown. No extra text.`},
          ]}],
        }),
      });

      if(!res.ok){
        const errBody=await res.text();
        let msg=`API error ${res.status}`;
        try{const j=JSON.parse(errBody);msg=j?.error?.message||msg;}catch{}
        throw new Error(msg);
      }

      const data=await res.json();
      const textBlock=data?.content?.find((b:any)=>b.type==='text');
      const raw=(textBlock?.text||'').trim();
      if(!raw) throw new Error('No response from Claude');

      // Try to parse as JSON object
      let recipe:{name:string;ingredients:string;method:string;tags:string[];prep_mins:number|null};
      try{
        // Strip any accidental markdown fences
        const cleaned=raw.replace(/^```json?\s*/,'').replace(/\s*```$/,'').trim();
        recipe=JSON.parse(cleaned);
      }catch(parseErr){
        // If full parse fails, try extracting just the object with regex
        const objMatch=raw.match(/\{[\s\S]*\}/);
        if(objMatch){
          try{
            recipe=JSON.parse(objMatch[0]);
          }catch{
            // Last resort: save a placeholder so the user at least gets something
            recipe={name:'Photo Recipe',ingredients:'',method:'',tags:[],prep_mins:null};
          }
        }else{
          recipe={name:'Photo Recipe',ingredients:'',method:'',tags:[],prep_mins:null};
        }
      }

      const noteParts=[
        recipe.ingredients?`Ingredients:\n${recipe.ingredients}`:null,
        recipe.method?`\nMethod:\n${recipe.method}`:null,
      ].filter(Boolean);

      const{error:dbErr}=await supabase.from('recipes').insert({
        family_id:DUMMY_FAMILY_ID,
        name:recipe.name||'Photo Recipe',
        source_type:'photo',
        tags:Array.isArray(recipe.tags)?recipe.tags:[],
        prep_mins:recipe.prep_mins||null,
        notes:noteParts.join('')||'Saved from photo — tap to add details',
      });

      if(dbErr) throw new Error('Database error: '+dbErr.message);

      Alert.alert(
        '✓ Recipe saved!',
        `"${recipe.name||'Photo Recipe'}" has been added to your Favourites${recipe.ingredients?'. Ingredients and method included.':' — tap it to add ingredients and method.'}`,
        [{text:'Done',onPress:()=>{onSaved();onClose();reset();}}]
      );
    }catch(e:any){
      Alert.alert('Extraction failed',`${e?.message||'Unknown error'}\n\nTap "Add manually" to save by name and add details yourself.`);
    }finally{setExtracting(false);}
  };

  const takePhoto=async()=>{
    const perm=await ImagePicker.requestCameraPermissionsAsync();
    if(!perm.granted){Alert.alert('Permission required','Please allow camera access in Settings.');return;}
    // Use low quality to stay under Claude's 5MB base64 limit
    const result=await ImagePicker.launchCameraAsync({
      base64:true,quality:0.15,allowsEditing:true,exif:false,
    });
    if(result.canceled||!result.assets?.[0]?.base64) return;
    const b64=result.assets[0].base64!;
    if(b64.length>3800000){
      Alert.alert('Photo too large','The photo is too large for recipe extraction. Please try with a lower-resolution photo or use Upload Photos from your camera roll.');
      return;
    }
    const updated=[...extractedPhotos,b64];
    setExtractedPhotos(updated);
    Alert.alert(
      `${updated.length} photo${updated.length!==1?'s':''} ready`,
      'Add more pages if needed, or extract now.',
      [{text:'Add another page',onPress:takePhoto},{text:'Extract recipe',onPress:()=>extractRecipesFromPhotos(updated)}]
    );
  };

  const uploadPhoto=async()=>{
    const perm=await ImagePicker.requestMediaLibraryPermissionsAsync();
    if(!perm.granted){Alert.alert('Permission required','Please allow photo library access in Settings.');return;}
    const result=await ImagePicker.launchImageLibraryAsync({
      base64:true,quality:0.2,mediaTypes:ImagePicker.MediaTypeOptions.Images,allowsMultipleSelection:true,
    });
    if(result.canceled||!result.assets?.length) return;
    const images=result.assets.map(a=>a.base64!).filter(b=>b&&b.length<3800000);
    if(images.length===0){
      Alert.alert('Photos too large','The photos exceed size limits. Please choose smaller photos or use lower quality settings.');
      return;
    }
    const updated=[...extractedPhotos,...images];
    setExtractedPhotos(updated);
    await extractRecipesFromPhotos(updated);
  };

  const saveRecipe=async(n:string,st:'url'|'manual')=>{
    if(!n.trim()&&st==='manual'){Alert.alert('Name required','Please enter a recipe name.');return;}
    setSaving(true);
    await supabase.from('recipes').insert({
      family_id:DUMMY_FAMILY_ID,name:(n.trim()||'New Recipe'),source_type:st,tags,
      notes:st==='url'?url.trim():(ingredients||method?`Ingredients:\n${ingredients}\n\nMethod:\n${method}`:undefined),
    });
    setSaving(false); onSaved(); onClose(); reset();
  };

  const opts=[
    {icon:'📷',label:'Take a photo',    sub:extractedPhotos.length>0?`${extractedPhotos.length} photo${extractedPhotos.length!==1?'s':''} ready — tap to add more`:'Dish, recipe card or cookbook page',bg:C.orangeL, onPress:takePhoto},
    {icon:'🖼️',label:'Upload photos',   sub:'Select one or more — multi-page recipes supported',bg:C.blueL,   onPress:uploadPhoto},
    {icon:'🔗',label:'Paste a URL',     sub:'Any recipe website, blog or health chef',  bg:C.greenL,  onPress:()=>setMode('url')},
    {icon:'✏️',label:'Add manually',    sub:'Name, ingredients, method — all optional', bg:'rgba(0,0,0,0.04)',onPress:()=>setMode('manual')},
    {icon:'✦', label:'Describe to Zaeli',sub:'"That pasta we had in Rome last year"',  bg:C.purpleL, onPress:()=>setMode('describe')},
    {icon:'🍽️',label:'Save a menu',     sub:'Restaurant or cafe — Zaeli extracts all dishes',bg:'rgba(0,180,120,0.1)', onPress:()=>setMode('savemenu')},
  ];

  return(
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet"
      onRequestClose={()=>{onClose();reset();}}>
      <SafeAreaView style={{flex:1,backgroundColor:'#fff'}} edges={['top']}>
        <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':'height'}>
          <View style={s.modalHdr}>
            <TouchableOpacity onPress={()=>{if(mode!=='menu')setMode('menu');else{onClose();reset();}}}>
              <Text style={s.modalCancel}>{mode!=='menu'?'← Back':'Cancel'}</Text>
            </TouchableOpacity>
            <Text style={s.modalTitle}>Save a Recipe</Text>
            <View style={{width:60}}/>
          </View>
          {mode==='menu'&&(
            <ScrollView contentContainerStyle={{padding:20,gap:0}}>
              {extracting&&(
                <View style={{backgroundColor:C.orangeL,borderRadius:12,padding:12,flexDirection:'row',alignItems:'center',gap:10,marginBottom:14}}>
                  <Text style={{fontSize:18}}>⏳</Text>
                  <Text style={{fontFamily:'Poppins_600SemiBold',fontSize:13,color:C.orange,flex:1}}>Extracting recipes from photos…</Text>
                </View>
              )}
              {extractedPhotos.length>0&&!extracting&&(
                <View style={{backgroundColor:C.greenL,borderRadius:12,padding:12,flexDirection:'row',alignItems:'center',gap:10,marginBottom:14,borderWidth:1.5,borderColor:C.greenB}}>
                  <Text style={{fontSize:16}}>✓</Text>
                  <Text style={{fontFamily:'Poppins_600SemiBold',fontSize:13,color:C.green,flex:1}}>{extractedPhotos.length} photo{extractedPhotos.length!==1?'s':''} ready — tap "Take a photo" to add more pages</Text>
                  <TouchableOpacity onPress={()=>extractRecipesFromPhotos(extractedPhotos)} activeOpacity={0.8}
                    style={{backgroundColor:C.green,borderRadius:8,paddingHorizontal:10,paddingVertical:5}}>
                    <Text style={{color:'#fff',fontFamily:'Poppins_700Bold',fontSize:11}}>Extract</Text>
                  </TouchableOpacity>
                </View>
              )}
              <Text style={[s.fieldLbl,{marginBottom:16}]}>HOW DO YOU WANT TO SAVE IT?</Text>
              {opts.map((opt,i)=>(
                <TouchableOpacity key={i} style={s.addOpt} onPress={opt.onPress} activeOpacity={0.8}>
                  <View style={[s.addOptIcon,{backgroundColor:opt.bg}]}><Text style={{fontSize:22}}>{opt.icon}</Text></View>
                  <View style={{flex:1}}>
                    <Text style={s.addOptTitle}>{opt.label}</Text>
                    <Text style={s.addOptSub}>{opt.sub}</Text>
                  </View>
                  <Text style={{fontSize:20,color:C.ink3}}>›</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
          {(mode==='url'||mode==='manual')&&(
            <ScrollView contentContainerStyle={{padding:20,gap:14}} keyboardShouldPersistTaps="handled">
              <Text style={s.fieldLbl}>{mode==='url'?'RECIPE URL':'RECIPE NAME'}</Text>
              <TextInput style={s.fieldInput}
                placeholder={mode==='url'?'https://…':'e.g. Mum\'s Bolognese (required)'}
                placeholderTextColor={C.ink3} value={mode==='url'?url:name}
                onChangeText={mode==='url'?setUrl:setName}
                autoFocus keyboardType={mode==='url'?'url':'default'}
                autoCapitalize={mode==='url'?'none':'words'}/>
              {mode==='manual'&&(
                <>
                  <Text style={s.fieldLbl}>INGREDIENTS (optional)</Text>
                  <TextInput style={[s.fieldInput,{minHeight:80,textAlignVertical:'top'}]}
                    placeholder={'e.g.\n2 cups flour\n3 eggs\n1 cup milk'}
                    placeholderTextColor={C.ink3} value={ingredients} onChangeText={setIngredients}
                    multiline numberOfLines={4}/>
                  <Text style={s.fieldLbl}>METHOD (optional)</Text>
                  <TextInput style={[s.fieldInput,{minHeight:80,textAlignVertical:'top'}]}
                    placeholder={'e.g.\n1. Mix dry ingredients\n2. Add wet ingredients\n3. Bake at 180°C'}
                    placeholderTextColor={C.ink3} value={method} onChangeText={setMethod}
                    multiline numberOfLines={4}/>
                  <View style={{flexDirection:'row',gap:10}}>
                    <TouchableOpacity style={[s.addOpt,{flex:1,padding:12}]} onPress={takePhoto} activeOpacity={0.8}>
                      <View style={[s.addOptIcon,{backgroundColor:C.orangeL,width:36,height:36}]}><Text style={{fontSize:18}}>📷</Text></View>
                      <Text style={[s.addOptSub,{flex:1}]}>Add a photo</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.addOpt,{flex:1,padding:12}]} onPress={uploadPhoto} activeOpacity={0.8}>
                      <View style={[s.addOptIcon,{backgroundColor:C.blueL,width:36,height:36}]}><Text style={{fontSize:18}}>🖼️</Text></View>
                      <Text style={[s.addOptSub,{flex:1}]}>Upload photo</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
              <Text style={s.fieldLbl}>TAGS</Text>
              <View style={{flexDirection:'row',flexWrap:'wrap',gap:7}}>
                {ALL_TAGS.map(t=>{
                  const on=tags.includes(t);
                  return(
                    <TouchableOpacity key={t} style={[s.tagChip,on&&s.tagChipOn]}
                      onPress={()=>setTags(p=>on?p.filter(x=>x!==t):[...p,t])} activeOpacity={0.8}>
                      <Text style={[s.tagChipTxt,on&&{color:'#fff'}]}>{t}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <TouchableOpacity style={[s.bigBtnOr,saving&&{opacity:0.5}]}
                onPress={()=>saveRecipe(mode==='url'?url:name,mode as 'url'|'manual')} disabled={saving} activeOpacity={0.85}>
                <Text style={s.bigBtnTxt}>{saving?'Saving…':'Save to Favourites'}</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
          {mode==='describe'&&(
            <View style={{flex:1,padding:20,justifyContent:'center',alignItems:'center',gap:16}}>
              <Text style={{fontSize:40}}>✦</Text>
              <Text style={{fontFamily:'Poppins_700Bold',fontSize:16,color:C.ink,textAlign:'center'}}>Describe it to Zaeli</Text>
              <Text style={{fontFamily:'Poppins_400Regular',fontSize:13,color:C.ink2,textAlign:'center',lineHeight:20}}>
                Use the chat below to describe the recipe. Say something like "that lemon pasta we had in Rome" or "a quick chicken dish under 30 minutes, low FODMAP" and Zaeli will find or build it for you.
              </Text>
              <TouchableOpacity style={s.bigBtnOr} activeOpacity={0.85}
                onPress={()=>{onClose();reset();router.push({pathname:'/(tabs)/zaeli-chat',params:{channel:'Meals',returnTo:'/(tabs)/mealplanner',seedMessage:'I want to save a recipe to my favourites — '}});}}>
                <Text style={s.bigBtnTxt}>Open Zaeli chat ✦</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={()=>setMode('menu')} activeOpacity={0.7}>
                <Text style={{fontFamily:'Poppins_600SemiBold',fontSize:13,color:C.ink2}}>← Back</Text>
              </TouchableOpacity>
            </View>
          )}
          {mode==='savemenu'&&(
            <View style={{flex:1,padding:20,gap:16}}>
              <View style={{backgroundColor:'rgba(0,180,120,0.08)',borderRadius:14,padding:14,borderWidth:1.5,borderColor:'rgba(0,180,120,0.2)'}}>
                <Text style={{fontFamily:'Poppins_700Bold',fontSize:14,color:C.ink,marginBottom:4}}>How it works</Text>
                <Text style={{fontFamily:'Poppins_400Regular',fontSize:13,color:C.ink2,lineHeight:20}}>
                  Take or upload a photo of a cafe or restaurant menu. Zaeli will read the venue name and extract every dish into a Saved Menu — kept separate from your family recipes so your Favourites stay clean.
                </Text>
              </View>
              {menuExtracting&&(
                <View style={{backgroundColor:C.orangeL,borderRadius:12,padding:12,flexDirection:'row',alignItems:'center',gap:10}}>
                  <Text style={{fontSize:16}}>⏳</Text>
                  <Text style={{fontFamily:'Poppins_600SemiBold',fontSize:13,color:C.orange,flex:1}}>Reading menu…</Text>
                </View>
              )}
              <TouchableOpacity style={[s.addOpt,{marginBottom:0}]} onPress={takeMenuPhoto} activeOpacity={0.8} disabled={menuExtracting}>
                <View style={[s.addOptIcon,{backgroundColor:C.orangeL}]}><Text style={{fontSize:22}}>📷</Text></View>
                <View style={{flex:1}}>
                  <Text style={s.addOptTitle}>Take a photo</Text>
                  <Text style={s.addOptSub}>Point at the menu — Zaeli reads it</Text>
                </View>
                <Text style={{fontSize:20,color:C.ink3}}>›</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.addOpt,{marginBottom:0}]} onPress={uploadMenuPhoto} activeOpacity={0.8} disabled={menuExtracting}>
                <View style={[s.addOptIcon,{backgroundColor:C.blueL}]}><Text style={{fontSize:22}}>🖼️</Text></View>
                <View style={{flex:1}}>
                  <Text style={s.addOptTitle}>Upload a photo</Text>
                  <Text style={s.addOptSub}>Screenshot or camera roll</Text>
                </View>
                <Text style={{fontSize:20,color:C.ink3}}>›</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={()=>setMode('menu')} activeOpacity={0.7} style={{alignSelf:'center',marginTop:8}}>
                <Text style={{fontFamily:'Poppins_600SemiBold',fontSize:13,color:C.ink2}}>← Back</Text>
              </TouchableOpacity>
            </View>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

// ── Favourite Detail + Add to Plan Modal ──────────────────────────────────────
function FavouriteDetailModal({visible,recipe,onClose,onAdded,onSaved}:{
  visible:boolean;recipe:SavedRecipe|null;
  onClose:()=>void;onAdded:(dayKey:string,dayLabel:string)=>void;
  onSaved?:()=>void;
}){
  const [saving,setSaving]=useState(false);
  const [editName,setEditName]=useState('');
  const [editTags,setEditTags]=useState<string[]>([]);
  const [editIngredients,setEditIngredients]=useState('');
  const [editMethod,setEditMethod]=useState('');
  const [showAssign,setShowAssign]=useState(false);
  const [addedDay,setAddedDay]=useState<{key:string;label:string;id:string}|null>(null);
  const [saveError,setSaveError]=useState('');
  const [editImageUrl,setEditImageUrl]=useState<string|null|undefined>(undefined);
  const [savedOk,setSavedOk]=useState(false);
  const [pickingDay,setPickingDay]=useState(false);

  // Reset ALL state every time the modal opens or recipe changes
  useEffect(()=>{
    if(visible&&recipe){
      setEditName(recipe.name);
      setEditTags(recipe.tags||[]);
      setAddedDay(null);
      setSaveError('');
      setSaving(false);
      setShowAssign(false);
      setSavedOk(false);
      setPickingDay(false);
      setEditImageUrl(recipe.image_url);
      // Parse existing notes into ingredients/method if available
      if(recipe.notes?.includes('Ingredients:')){
        const parts=recipe.notes.split(/\n(?=Method:)/);
        const ingPart=parts[0]?.replace(/^Ingredients:\n?/,'').trim()||'';
        const methPart=parts[1]?.replace(/^Method:\n?/,'').trim()||'';
        setEditIngredients(ingPart);
        setEditMethod(methPart);
      } else {
        setEditIngredients('');
        setEditMethod(recipe.notes||'');
      }
    }
  },[visible,recipe?.id]);

  if(!recipe) return null;

  const ALL_TAGS=['Family','Kids love','Quick','Healthy','Comfort','Gut health','Low FODMAP','Gluten free','Dairy free','Thermomix','Slow cooker','Air fryer'];

  // Determine if this is a dummy recipe (not in DB) — dummy IDs are 'f1','f2' etc.
  const isDummy=recipe.id.startsWith('f')&&recipe.id.length<=3;

  const changePhoto=async()=>{
    const perm=await ImagePicker.requestMediaLibraryPermissionsAsync();
    if(!perm.granted){Alert.alert('Permission required','Please allow photo library access in Settings.');return;}
    const result=await ImagePicker.launchImageLibraryAsync({quality:0.8,mediaTypes:ImagePicker.MediaTypeOptions.Images,allowsEditing:true,aspect:[4,3]});
    if(result.canceled||!result.assets?.[0]?.uri) return;
    setEditImageUrl(result.assets[0].uri);
  };

  const saveDetails=async()=>{
    if(!editName.trim()){Alert.alert('Name required','Please enter a recipe name.');return;}
    setSavedOk(false);
    const noteParts=[editIngredients?`Ingredients:\n${editIngredients}`:null,editMethod?`\nMethod:\n${editMethod}`:null].filter(Boolean);
    const payload={
      family_id:DUMMY_FAMILY_ID,
      name:editName.trim(),
      tags:editTags,
      notes:noteParts.join('')||null,
      image_url:editImageUrl||null,
      source_type:recipe.source_type,
    };
    if(isDummy){
      // Dummy recipe — INSERT a real row
      const{error}=await supabase.from('recipes').insert({...payload,prep_mins:recipe.prep_mins||null});
      if(error){Alert.alert('Save failed',error.message);return;}
    } else {
      // Real recipe — UPDATE existing row
      const{error}=await supabase.from('recipes').update(payload).eq('id',recipe.id);
      if(error){Alert.alert('Save failed',error.message);return;}
    }
    setSavedOk(true);
    setTimeout(()=>setSavedOk(false),2500);
    onSaved?.(); // tell parent to re-fetch so list updates immediately
  };

  const addToPlan=async(targetDk:string)=>{
    setSaving(true);
    setSaveError('');
    try{
      const days=get7Days();
      const targetDay=days.find(d=>dayKey(d)===targetDk)||days[0];
      const{data:inserted,error:insertErr}=await supabase.from('meal_plans').insert({
        family_id:DUMMY_FAMILY_ID,
        day_key:dayKey(targetDay),
        planned_date:dayKey(targetDay),
        meal_name:editName.trim()||recipe.name,
        meal_type:'dinner',
        source:'favourites',
        image_url:(editImageUrl||recipe.image_url)||null,
        prep_mins:recipe.prep_mins||null,
      }).select('id').single();
      if(insertErr) throw insertErr;
      const dl=dayLabel(targetDay);
      setAddedDay({key:dayKey(targetDay),label:dl,id:inserted?.id||''});
    }catch(e:any){
      setSaveError('Could not save — '+(e?.message||'unknown error'));
    }finally{
      setSaving(false);
    }
  };

  const handleAssignSave=async(cookIds:string[],jobKidIds:string[],pts:Record<string,number>)=>{
    if(!addedDay) return;
    if(addedDay.id){
      await supabase.from('meal_plans').update({cook_ids:cookIds}).eq('id',addedDay.id);
    }
    for(const kidId of jobKidIds){
      const kid=FAMILY.find(m=>m.id===kidId);
      if(!kid) continue;
      await supabase.from('todos').insert({
        family_id:DUMMY_FAMILY_ID,
        title:`Help cook dinner — ${addedDay.label}`,
        assigned_to:kidId,points:pts[kidId]||25,status:'pending',
        due_date:addedDay.key,source:'meals',
      });
    }
    setShowAssign(false);
    onAdded(addedDay.key,addedDay.label);
    onClose();
  };

  return(
    <>
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
        <SafeAreaView style={{flex:1,backgroundColor:'#fff'}} edges={['top']}>
          <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':'height'}>
          <View style={s.detailHdr}>
            <TouchableOpacity style={s.detailBack} onPress={onClose}>
              <Text style={{fontSize:22,color:C.blue,lineHeight:24}}>‹</Text>
            </TouchableOpacity>
            <Text style={[s.modalTitle,{textAlign:'left',flex:1}]} numberOfLines={1}>{recipe.name}</Text>
            {/* Delete recipe */}
            {!isDummy&&(
              <TouchableOpacity activeOpacity={0.7} style={{width:34,height:34,borderRadius:10,backgroundColor:'rgba(255,59,59,0.08)',alignItems:'center',justifyContent:'center',marginRight:6}}
                onPress={()=>Alert.alert('Remove favourite','Remove "'+recipe.name+'" from your Favourites?',[
                  {text:'Cancel',style:'cancel'},
                  {text:'Remove',style:'destructive',onPress:async()=>{
                    await supabase.from('recipes').delete().eq('id',recipe.id);
                    onSaved?.();
                    onClose();
                  }},
                ])}>
                <Text style={{fontSize:15}}>🗑</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={saveDetails} activeOpacity={0.8}>
              <Text style={{fontFamily:'Poppins_700Bold',fontSize:14,color:savedOk?C.green:C.orange}}>
                {savedOk?'Saved ✓':'Save'}
              </Text>
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Tappable image — tap to change */}
            <TouchableOpacity onPress={changePhoto} activeOpacity={0.85} style={{position:'relative'}}>
              {(editImageUrl||recipe.image_url)?(
                <Image source={{uri:editImageUrl||recipe.image_url||''}} style={s.detailImg} resizeMode="cover"/>
              ):(
                <View style={[s.detailImg,{backgroundColor:recipe.source_type==='url'?'#f0fff4':'#f0f4ff',alignItems:'center',justifyContent:'center'}]}>
                  <Text style={{fontSize:64}}>{recipe.source_type==='url'?'🌿':recipe.source_type==='photo'?'📸':'🍽'}</Text>
                </View>
              )}
              {/* Edit photo overlay */}
              <View style={{position:'absolute',bottom:10,right:10,backgroundColor:'rgba(0,0,0,0.55)',borderRadius:8,paddingHorizontal:10,paddingVertical:5,flexDirection:'row',alignItems:'center',gap:5}}>
                <Text style={{fontSize:13}}>📷</Text>
                <Text style={{color:'#fff',fontFamily:'Poppins_600SemiBold',fontSize:11}}>Change photo</Text>
              </View>
            </TouchableOpacity>
            <View style={{padding:18}}>
              <Text style={s.fieldLbl}>RECIPE NAME</Text>
              <TextInput style={[s.fieldInput,{marginTop:6,marginBottom:14}]}
                value={editName} onChangeText={setEditName} placeholder="Recipe name"
                placeholderTextColor={C.ink3}/>

              <Text style={s.fieldLbl}>TAGS</Text>
              <View style={{flexDirection:'row',flexWrap:'wrap',gap:7,marginTop:6,marginBottom:14}}>
                {ALL_TAGS.map(t=>{
                  const on=editTags.includes(t);
                  return(
                    <TouchableOpacity key={t} style={[s.tagChip,on&&s.tagChipOn]}
                      onPress={()=>setEditTags(p=>on?p.filter(x=>x!==t):[...p,t])} activeOpacity={0.8}>
                      <Text style={[s.tagChipTxt,on&&{color:'#fff'}]}>{t}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {recipe.prep_mins&&(
                <View style={{flexDirection:'row',marginBottom:14}}>
                  <View style={s.pillOr}><Text style={s.pillOrTxt}>⏱ {recipe.prep_mins} min</Text></View>
                </View>
              )}

              <Text style={s.fieldLbl}>INGREDIENTS (optional)</Text>
              <TextInput
                style={[s.fieldInput,{marginTop:6,marginBottom:14,minHeight:100,textAlignVertical:'top'}]}
                value={editIngredients}
                onChangeText={setEditIngredients}
                placeholder={'e.g.\n500g chicken thighs\n3 tbsp soy sauce\n2 tbsp honey\n2 cloves garlic'}
                placeholderTextColor={C.ink3}
                multiline
                numberOfLines={5}
              />

              <Text style={s.fieldLbl}>METHOD (optional)</Text>
              <TextInput
                style={[s.fieldInput,{marginTop:6,marginBottom:14,minHeight:120,textAlignVertical:'top'}]}
                value={editMethod}
                onChangeText={setEditMethod}
                placeholder={'e.g.\n1. Marinate chicken in soy sauce and honey\n2. Bake at 200°C for 25 mins\n3. Serve over rice'}
                placeholderTextColor={C.ink3}
                multiline
                numberOfLines={6}
              />

              {saveError?(
                <View style={{backgroundColor:C.redL,borderRadius:10,padding:10,marginBottom:12,borderWidth:1,borderColor:'rgba(255,59,59,0.2)'}}>
                  <Text style={{fontFamily:'Poppins_400Regular',fontSize:12,color:C.red}}>{saveError}</Text>
                </View>
              ):null}

              {/* Status after adding to plan */}
              {addedDay?(
                <View style={[s.pantryAllOk,{marginBottom:10}]}>
                  <View style={{width:26,height:26,borderRadius:8,backgroundColor:C.green,alignItems:'center',justifyContent:'center'}}>
                    <Text style={{color:'#fff',fontSize:11}}>✓</Text>
                  </View>
                  <Text style={{fontSize:13,color:C.ink,lineHeight:20,flex:1}}>
                    Added to <Text style={{fontFamily:'Poppins_700Bold'}}>{addedDay.label}</Text>!
                  </Text>
                </View>
              ):null}

              {!addedDay?(
                <TouchableOpacity style={[s.bigBtnOr,saving&&{opacity:0.5}]} onPress={()=>setPickingDay(true)} disabled={saving} activeOpacity={0.85}>
                  <Text style={s.bigBtnTxt}>{saving?'Saving…':'+ Add to dinner plan'}</Text>
                </TouchableOpacity>
              ):(
                <TouchableOpacity style={s.bigBtnOr} onPress={()=>setShowAssign(true)} activeOpacity={0.85}>
                  <Text style={s.bigBtnTxt}>👨‍👩‍👧 Assign who's cooking</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={s.bigBtnGhost} onPress={onClose} activeOpacity={0.85}>
                <Text style={s.bigBtnGhostTxt}>Back to favourites</Text>
              </TouchableOpacity>
              <View style={{height:40}}/>
            </View>
          </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Day picker — outside the main Modal so it stacks properly on iOS */}
      <Modal visible={pickingDay} animationType="slide" presentationStyle="pageSheet" onRequestClose={()=>setPickingDay(false)}>
        <SafeAreaView style={{flex:1,backgroundColor:'#fff'}} edges={['top']}>
          <View style={s.modalHdr}>
            <TouchableOpacity onPress={()=>setPickingDay(false)}><Text style={s.modalCancel}>Cancel</Text></TouchableOpacity>
            <Text style={s.modalTitle}>Which night?</Text>
            <View style={{width:60}}/>
          </View>
          <ScrollView contentContainerStyle={{padding:16,gap:8}}>
            <Text style={[s.modalSub,{marginBottom:4}]}>Adding: <Text style={{fontFamily:'Poppins_700Bold',color:C.ink}}>{editName||recipe?.name}</Text></Text>
            {get7Days().map(d=>{
              const dk=dayKey(d);
              const dl=dayLabel(d);
              const taken=false; // will check live
              return(
                <TouchableOpacity key={dk}
                  style={{borderRadius:14,borderWidth:1.5,padding:14,flexDirection:'row',alignItems:'center',gap:12,
                    borderColor:isToday(d)?C.orange:C.border,
                    backgroundColor:isToday(d)?C.orangeL:'#fff',
                  }}
                  activeOpacity={0.8}
                  onPress={async()=>{
                    setPickingDay(false);
                    await addToPlan(dk);
                  }}>
                  <View style={{flex:1}}>
                    <Text style={{fontFamily:'Poppins_700Bold',fontSize:14,color:isToday(d)?C.orange:C.ink}}>{dl}</Text>
                    <Text style={{fontFamily:'Poppins_400Regular',fontSize:11,color:C.ink3,marginTop:2}}>{fmtDay(d)}</Text>
                  </View>
                  <Text style={{fontSize:18,color:isToday(d)?C.orange:C.ink3}}>→</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Assign cook — outside main Modal so it stacks on iOS */}
      <AssignCookModal
        visible={showAssign}
        dayLbl={addedDay?.label||''}
        mealName={recipe?.name||''}
        onClose={()=>setShowAssign(false)}
        onSave={handleAssignSave}
      />
    </>
  );
}

// ── Recipe Detail Modal (from Recipes tab) ────────────────────────────────────
function RecipeDetailModal({visible,recipe,onClose,onAdded,onEdit,openDayPicker}:{
  visible:boolean;recipe:SpoonRecipe|null;
  onClose:()=>void;onAdded:(dayKey:string,dayLabel:string)=>void;
  onEdit?:(recipe:SpoonRecipe)=>void;
  openDayPicker?:(ctx:any)=>void;
}){
  const [saving,setSaving]=useState(false);
  const [addedDay,setAddedDay]=useState<{key:string;label:string;id:string}|null>(null);
  const [showAssign,setShowAssign]=useState(false);
  const [saveError,setSaveError]=useState('');
  const [isFav,setIsFav]=useState(false);
  const [savingFav,setSavingFav]=useState(false);

  useEffect(()=>{
    if(visible&&recipe){
      setAddedDay(null); setSaveError(''); setSaving(false);
      setShowAssign(false);
      // Check if already favourited
      supabase.from('recipes').select('id').eq('family_id',DUMMY_FAMILY_ID)
        .ilike('name',recipe.title).single()
        .then(({data})=>setIsFav(!!data));
    }
  },[visible,recipe?.id]);

  if(!recipe) return null;

  const toggleFav=async()=>{
    setSavingFav(true);
    if(isFav){
      // Remove from favourites
      await supabase.from('recipes').delete().eq('family_id',DUMMY_FAMILY_ID).ilike('name',recipe.title);
      setIsFav(false);
    } else {
      // Save to favourites
      const RECIPE_ING_TEXT:Record<number,string>={
        654959:'400g spaghetti\n150g pancetta or bacon\n4 large eggs\n80g parmesan, grated\nBlack pepper to taste',
        715538:'1kg chicken thighs\n4 tbsp soy sauce\n3 tbsp honey\n3 garlic cloves\n1 tbsp sesame oil\nSteamed rice to serve',
        644387:'500g mixed vegetables\n2 cans tinned tomatoes\n1 can cannellini beans\n150g small pasta\n1L vegetable stock',
        716406:'4 salmon fillets\n2 lemons\n2 tbsp olive oil\n2 garlic cloves\nFresh dill or parsley',
        665613:'500g chicken breast\n400g mixed stir-fry veg\n3 tbsp soy sauce\n2 tbsp oyster sauce\nGarlic & ginger, noodles or rice',
        632660:'500g beef mince\n12 taco shells\n1 pkt taco seasoning\n1 cup shredded cheese\nSalsa, sour cream, lettuce',
        715769:'250g cherry tomatoes\n1 cucumber\n100g kalamata olives\n150g feta\n½ red onion\nOlive oil & oregano',
        664147:'1kg chicken thighs\n500ml butter chicken sauce\n100ml cream\n2 cups basmati rice\nNaan bread, coriander',
      };
      const noteParts=[
        RECIPE_ING_TEXT[recipe.id]?`Ingredients:\n${RECIPE_ING_TEXT[recipe.id]}`:null,
      ].filter(Boolean);
      await supabase.from('recipes').insert({
        family_id:DUMMY_FAMILY_ID, name:recipe.title,
        source_type:'spoonacular', tags:[],
        prep_mins:recipe.readyInMinutes, image_url:recipe.image,
        notes:noteParts.join('')||null,
      });
      setIsFav(true);
    }
    setSavingFav(false);
  };

  // Hardcoded ingredient sets for dummy recipes
  const RECIPE_INGREDIENTS:Record<number,{name:string;qty:string;emoji:string;in_pantry:boolean}[]>={
    654959:[
      {name:'Spaghetti 400g',       qty:'400g',  emoji:'🍝', in_pantry:true},
      {name:'Pancetta or bacon',     qty:'150g',  emoji:'🥩', in_pantry:false},
      {name:'Eggs',                  qty:'4 large',emoji:'🥚', in_pantry:true},
      {name:'Parmesan, grated',      qty:'80g',   emoji:'🧀', in_pantry:true},
      {name:'Black pepper',          qty:'to taste',emoji:'🫙',in_pantry:true},
    ],
    715538:[
      {name:'Chicken thighs',        qty:'1kg',   emoji:'🍗', in_pantry:false},
      {name:'Soy sauce',             qty:'4 tbsp', emoji:'🫙', in_pantry:true},
      {name:'Honey',                 qty:'3 tbsp', emoji:'🍯', in_pantry:true},
      {name:'Garlic cloves',         qty:'3 cloves',emoji:'🧄',in_pantry:true},
      {name:'Sesame oil',            qty:'1 tbsp', emoji:'🫙', in_pantry:false},
      {name:'Steamed rice',          qty:'2 cups', emoji:'🍚', in_pantry:true},
    ],
    644387:[
      {name:'Mixed vegetables',      qty:'500g',  emoji:'🥦', in_pantry:false},
      {name:'Tinned tomatoes',       qty:'2 cans', emoji:'🥫', in_pantry:true},
      {name:'Cannellini beans',      qty:'1 can',  emoji:'🫘', in_pantry:true},
      {name:'Pasta (small)',         qty:'150g',   emoji:'🍝', in_pantry:true},
      {name:'Vegetable stock',       qty:'1L',     emoji:'🫙', in_pantry:false},
      {name:'Parmesan rind',         qty:'optional',emoji:'🧀',in_pantry:false},
    ],
    716406:[
      {name:'Salmon fillets',        qty:'4 fillets',emoji:'🐟',in_pantry:false},
      {name:'Lemon',                 qty:'2',      emoji:'🍋', in_pantry:true},
      {name:'Olive oil',             qty:'2 tbsp', emoji:'🫙', in_pantry:true},
      {name:'Garlic',                qty:'2 cloves',emoji:'🧄',in_pantry:true},
      {name:'Fresh dill or parsley', qty:'small bunch',emoji:'🌿',in_pantry:false},
    ],
    665613:[
      {name:'Chicken breast',        qty:'500g',  emoji:'🍗', in_pantry:false},
      {name:'Mixed stir-fry veg',    qty:'400g',  emoji:'🥦', in_pantry:false},
      {name:'Soy sauce',             qty:'3 tbsp', emoji:'🫙', in_pantry:true},
      {name:'Oyster sauce',          qty:'2 tbsp', emoji:'🫙', in_pantry:false},
      {name:'Garlic & ginger',       qty:'1 tsp each',emoji:'🧄',in_pantry:true},
      {name:'Noodles or rice',       qty:'2 cups', emoji:'🍜', in_pantry:true},
    ],
    632660:[
      {name:'Beef mince',            qty:'500g',  emoji:'🥩', in_pantry:false},
      {name:'Taco shells',           qty:'12',    emoji:'🌮', in_pantry:false},
      {name:'Taco seasoning',        qty:'1 pkt',  emoji:'🫙', in_pantry:true},
      {name:'Cheese, shredded',      qty:'1 cup',  emoji:'🧀', in_pantry:true},
      {name:'Salsa',                 qty:'1 jar',  emoji:'🥫', in_pantry:true},
      {name:'Sour cream & lettuce',  qty:'to serve',emoji:'🥬',in_pantry:false},
    ],
    715769:[
      {name:'Cherry tomatoes',       qty:'250g',  emoji:'🍅', in_pantry:true},
      {name:'Cucumber',              qty:'1 large',emoji:'🥒', in_pantry:false},
      {name:'Kalamata olives',       qty:'100g',  emoji:'🫒', in_pantry:true},
      {name:'Feta cheese',           qty:'150g',  emoji:'🧀', in_pantry:false},
      {name:'Red onion',             qty:'½',     emoji:'🧅', in_pantry:true},
      {name:'Olive oil & oregano',   qty:'to dress',emoji:'🫙',in_pantry:true},
    ],
    664147:[
      {name:'Chicken thighs',        qty:'1kg',   emoji:'🍗', in_pantry:false},
      {name:'Butter chicken sauce',  qty:'500ml jar',emoji:'🥫',in_pantry:false},
      {name:'Cream',                 qty:'100ml',  emoji:'🥛', in_pantry:false},
      {name:'Basmati rice',          qty:'2 cups', emoji:'🍚', in_pantry:true},
      {name:'Fresh coriander',       qty:'to serve',emoji:'🌿',in_pantry:false},
      {name:'Naan bread',            qty:'4',     emoji:'🫓', in_pantry:false},
    ],
  };
  const ingredients=RECIPE_INGREDIENTS[recipe.id]||[];
  const missing=ingredients.filter(i=>!i.in_pantry);

  const addToPlan=async(targetDk?:string)=>{
    setSaving(true);
    setSaveError('');
    try{
      const days=get7Days();
      let targetDay:Date;
      if(targetDk){
        targetDay=days.find(d=>dayKey(d)===targetDk)||days[0];
      } else {
        const{data:existing,error:fetchErr}=await supabase.from('meal_plans').select('day_key')
          .eq('family_id',DUMMY_FAMILY_ID).in('day_key',days.map(dayKey));
        if(fetchErr) throw fetchErr;
        const planned=(existing||[]).map((x:any)=>x.day_key);
        targetDay=days.find(d=>!planned.includes(dayKey(d)))||days[0];
      }
      const{data:inserted,error:insertErr}=await supabase.from('meal_plans').insert({
        family_id:DUMMY_FAMILY_ID,
        day_key:dayKey(targetDay),
        planned_date:dayKey(targetDay),
        meal_name:recipe.title,
        meal_type:'dinner',
        source:'library',
        image_url:recipe.image,
        prep_mins:recipe.readyInMinutes,
        ingredients:ingredients,
      }).select('id').single();
      if(insertErr) throw insertErr;
      const dl=dayLabel(targetDay);
      setAddedDay({key:dayKey(targetDay),label:dl,id:inserted?.id||''});
    }catch(e:any){
      setSaveError('Could not save — '+(e?.message||'please try again'));
    }finally{
      setSaving(false);
    }
  };

  const addMissingToList=async()=>{
    for(const ing of missing){
      await supabase.from('shopping_items').insert({
        family_id:DUMMY_FAMILY_ID,name:ing.name,item:ing.name,
        category:'Other',checked:false,completed:false,meal_source:recipe.title,
      });
    }
    Alert.alert('Added!',`${missing.length} ingredient${missing.length!==1?'s':''} added to your shopping list.`);
  };

  const handleAssignSave=async(cookIds:string[],jobKidIds:string[],pts:Record<string,number>)=>{
    if(!addedDay) return;
    if(addedDay.id){
      await supabase.from('meal_plans').update({cook_ids:cookIds}).eq('id',addedDay.id);
    }
    for(const kidId of jobKidIds){
      const kid=FAMILY.find(m=>m.id===kidId);
      if(!kid) continue;
      await supabase.from('todos').insert({
        family_id:DUMMY_FAMILY_ID,
        title:`Help cook dinner — ${addedDay.label}`,
        assigned_to:kidId,points:pts[kidId]||25,status:'pending',
        due_date:addedDay.key,source:'meals',
      });
    }
    setShowAssign(false);
    onAdded(addedDay.key,addedDay.label);
    onClose();
  };

  return(
    <>
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
        <SafeAreaView style={{flex:1,backgroundColor:'#fff'}} edges={['top']}>
          <View style={s.detailHdr}>
            <TouchableOpacity style={s.detailBack} onPress={()=>{onClose();}}>
              <Text style={{fontSize:22,color:C.blue,lineHeight:24}}>‹</Text>
            </TouchableOpacity>
            <Text style={[s.modalTitle,{textAlign:'left',flex:1}]} numberOfLines={1}>{recipe.title}</Text>
            {/* Edit button — calls parent-level handler, avoids iOS nested modal */}
            <TouchableOpacity onPress={()=>{onClose();setTimeout(()=>onEdit&&onEdit(recipe),350);}} activeOpacity={0.7}
              style={{width:34,height:34,borderRadius:10,backgroundColor:'rgba(0,0,0,.06)',alignItems:'center',justifyContent:'center',marginRight:6}}>
              <Text style={{fontSize:15}}>✏️</Text>
            </TouchableOpacity>
            {/* Heart / favourite */}
            <TouchableOpacity onPress={toggleFav} activeOpacity={0.7} disabled={savingFav}
              style={{width:34,height:34,borderRadius:10,backgroundColor:isFav?'rgba(224,0,124,.1)':'rgba(0,0,0,.06)',alignItems:'center',justifyContent:'center'}}>
              <Text style={{fontSize:16}}>{isFav?'❤️':'🤍'}</Text>
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Image source={{uri:recipe.image}} style={{width:'100%',height:220}} resizeMode="cover"/>
            <View style={{padding:18}}>
              <Text style={s.detailTitle}>{recipe.title}</Text>
              <View style={{flexDirection:'row',gap:8,flexWrap:'wrap',marginBottom:16}}>
                <View style={s.pillOr}><Text style={s.pillOrTxt}>⏱ {recipe.readyInMinutes} min</Text></View>
                <View style={s.pillGr}><Text style={s.pillGrTxt}>Serves {recipe.servings}</Text></View>
                {recipe.glutenFree&&<View style={s.pillGr}><Text style={s.pillGrTxt}>GF</Text></View>}
                {recipe.lowFodmap&&<View style={s.pillGr}><Text style={s.pillGrTxt}>Low FODMAP</Text></View>}
                {recipe.dairyFree&&<View style={s.pillGr}><Text style={s.pillGrTxt}>Dairy free</Text></View>}
              </View>

              {/* Ingredients */}
              {ingredients.length>0&&(
                <>
                  <Text style={s.sectionHdr}>Ingredients · Serves {recipe.servings}</Text>
                  {ingredients.map((ing,i)=>(
                    <View key={i} style={s.ingRow}>
                      <Text style={{fontSize:20}}>{ing.emoji}</Text>
                      <Text style={[s.ingName,{flex:1}]}>{ing.name}</Text>
                      <Text style={s.ingQty}>{ing.qty}</Text>
                      {ing.in_pantry?(
                        <View style={s.ingOk}><Text style={s.ingOkTxt}>✓ Pantry</Text></View>
                      ):(
                        <View style={s.ingMiss}><Text style={s.ingMissTxt}>Need to buy</Text></View>
                      )}
                    </View>
                  ))}
                  {missing.length===0?(
                    <View style={[s.pantryAllOk,{marginTop:8}]}>
                      <View style={{width:24,height:24,borderRadius:7,backgroundColor:C.green,alignItems:'center',justifyContent:'center'}}>
                        <Text style={{color:'#fff',fontSize:10}}>✦</Text>
                      </View>
                      <Text style={{fontSize:13,color:C.ink,flex:1}}>
                        <Text style={{fontFamily:'Poppins_700Bold'}}>All ingredients in pantry</Text> — ready to cook tonight!
                      </Text>
                    </View>
                  ):(
                    <TouchableOpacity style={[s.pantryMissing,{marginTop:8}]} onPress={addMissingToList} activeOpacity={0.8}>
                      <Text style={{fontSize:16}}>🛒</Text>
                      <Text style={{fontSize:13,color:C.ink,flex:1}}>
                        <Text style={{fontFamily:'Poppins_700Bold'}}>{missing.length} item{missing.length!==1?'s':''} needed</Text> — tap to add all to shopping list
                      </Text>
                    </TouchableOpacity>
                  )}
                </>
              )}

              {/* Method */}
              {(()=>{
                const METHODS:Record<number,string>={
                  654959:'1. Boil pasta in salted water until al dente.\n2. Fry pancetta until crispy. Remove from heat.\n3. Whisk eggs, parmesan, and black pepper in a bowl.\n4. Drain pasta, reserving ½ cup pasta water.\n5. Toss hot pasta with pancetta, then quickly stir in egg mixture off the heat.\n6. Add pasta water a splash at a time until silky. Serve immediately.',
                  715538:'1. Mix soy sauce, honey, garlic, and sesame oil.\n2. Marinate chicken for 30+ minutes (or overnight).\n3. Bake at 200°C for 25–30 min, basting halfway through.\n4. Rest 5 mins before serving over steamed rice.',
                  644387:'1. Sauté onion and garlic in olive oil until soft.\n2. Add chopped vegetables, cook 5 mins.\n3. Add tinned tomatoes, stock, and beans. Bring to boil.\n4. Add pasta, simmer 10–12 mins until tender.\n5. Season well. Serve with parmesan.',
                  716406:'1. Preheat oven to 200°C.\n2. Place salmon on a lined baking tray.\n3. Drizzle with olive oil, lemon juice, garlic, salt and pepper.\n4. Bake 12–15 mins until just cooked through.\n5. Top with fresh dill or parsley. Serve with greens or rice.',
                  665613:'1. Slice chicken and vegetables into even pieces.\n2. Mix soy sauce, oyster sauce, garlic, and ginger.\n3. Stir-fry chicken in hot wok until cooked. Remove.\n4. Stir-fry vegetables 3–4 mins.\n5. Return chicken, add sauce. Toss and serve over noodles or rice.',
                  632660:'1. Brown beef mince with taco seasoning until cooked through.\n2. Warm taco shells in oven for 3–4 mins.\n3. Load shells with beef, shredded cheese, salsa, sour cream, and lettuce.\n4. Serve immediately.',
                  715769:'1. Halve tomatoes, dice cucumber, slice red onion.\n2. Combine vegetables with olives and feta in a large bowl.\n3. Drizzle with olive oil, lemon juice, and dried oregano.\n4. Toss gently and serve.',
                  664147:'1. Cut chicken into bite-sized pieces.\n2. Cook chicken in a pan until sealed.\n3. Pour in butter chicken sauce and cream. Simmer 15 mins.\n4. Serve over basmati rice with naan and fresh coriander.',
                };
                const method=METHODS[recipe.id];
                if(!method) return null;
                return(
                  <>
                    <Text style={[s.sectionHdr,{marginTop:4}]}>Method</Text>
                    <View style={s.notesBox}>
                      <Text style={s.notesTxt}>{method}</Text>
                    </View>
                  </>
                );
              })()}

              <View style={{height:16}}/>

              {saveError?(
                <View style={{backgroundColor:C.redL,borderRadius:10,padding:10,marginBottom:12,borderWidth:1,borderColor:'rgba(255,59,59,0.2)'}}>
                  <Text style={{fontFamily:'Poppins_400Regular',fontSize:12,color:C.red}}>{saveError}</Text>
                </View>
              ):null}
              {addedDay?(
                <View style={s.pantryAllOk}>
                  <View style={{width:26,height:26,borderRadius:8,backgroundColor:C.green,alignItems:'center',justifyContent:'center'}}>
                    <Text style={{color:'#fff',fontSize:11}}>✓</Text>
                  </View>
                  <Text style={{fontSize:13,color:C.ink,lineHeight:20,flex:1}}>
                    Added to <Text style={{fontFamily:'Poppins_700Bold'}}>{addedDay.label}</Text>! Now assign who's cooking.
                  </Text>
                </View>
              ):null}
              {!addedDay?(
                <TouchableOpacity style={[s.bigBtnOr,saving&&{opacity:0.5}]}
                  onPress={()=>{
                    if(!recipe||!openDayPicker) return;
                    onClose();
                    setTimeout(()=>openDayPicker({
                      name:recipe.title,
                      source:'library',
                      image_url:recipe.image,
                      prep_mins:recipe.readyInMinutes,
                      ingredients:ingredients,
                      onAdded:(dk:string,dl:string)=>{ setAddedDay({key:dk,label:dl,id:''}); onAdded(dk,dl); },
                    }),350);
                  }}
                  disabled={saving} activeOpacity={0.85}>
                  <Text style={s.bigBtnTxt}>{saving?'Saving…':'+ Add to dinner plan'}</Text>
                </TouchableOpacity>
              ):(
                <TouchableOpacity style={s.bigBtnOr} onPress={()=>setShowAssign(true)} activeOpacity={0.85}>
                  <Text style={s.bigBtnTxt}>👨‍👩‍👧 Assign who's cooking</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={s.bigBtnGhost} onPress={()=>{onClose();}} activeOpacity={0.85}>
                <Text style={s.bigBtnGhostTxt}>Back to recipes</Text>
              </TouchableOpacity>
              <View style={{height:40}}/>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <AssignCookModal visible={showAssign} dayLbl={addedDay?.label||''}
        mealName={recipe.title} onClose={()=>setShowAssign(false)} onSave={handleAssignSave}/>
    </>
  );
}

// ── Dinners Tab ───────────────────────────────────────────────────────────────
function DinnersTab({showBrief,onDismissBrief,onTabChange}:{
  showBrief:boolean;onDismissBrief:()=>void;onTabChange:(t:TabType)=>void;
}){
  const router=useRouter();
  const [meals,setMeals]=useState<MealPlan[]>([]);
  const [loading,setLoading]=useState(true);
  const [addDay,setAddDay]=useState<{key:string;label:string}|null>(null);
  const [detailMeal,setDetailMeal]=useState<{meal:MealPlan;label:string}|null>(null);
  const [assignState,setAssignState]=useState<{key:string;label:string;meal:MealPlan}|null>(null);
  const [moveState,setMoveState]=useState<{meal:MealPlan;fromLabel:string}|null>(null);
  const [savedKits,setSavedKits]=useState<Set<string>>(new Set());
  const [favouritedNames,setFavouritedNames]=useState<Set<string>>(new Set());
  // Edit state lifted to DinnersTab so it survives MealDetailModal unmount
  const [editingMeal,setEditingMeal]=useState<MealPlan|null>(null);
  const [editName,setEditName]=useState('');
  const [editIngredients,setEditIngredients]=useState('');
  const [editMethod,setEditMethod]=useState('');
  const [editNotes,setEditNotes]=useState('');
  const [savingEdit,setSavingEdit]=useState(false);
  // Brief animation — same as home screen
  const cardFade=useRef(new Animated.Value(1)).current;
  const relaxedFade=useRef(new Animated.Value(0)).current;
  const briefText=useRef('');

  const fetchMeals=useCallback(async()=>{
    const days=get7Days();
    const keys=days.map(dayKey);
    const [{data,error}, {data:favData}] = await Promise.all([
      supabase.from('meal_plans').select('*')
        .eq('family_id',DUMMY_FAMILY_ID).in('day_key',keys).order('created_at',{ascending:true}),
      supabase.from('recipes').select('name')
        .eq('family_id',DUMMY_FAMILY_ID),
    ]);
    if(error) console.error('fetchMeals error:',error);
    setMeals((data||[]) as MealPlan[]);
    setFavouritedNames(new Set((favData||[]).map((r:any)=>r.name.toLowerCase())));
    setLoading(false);
  },[]);

  // Fetch on mount AND every time tab is focused
  useEffect(()=>{fetchMeals();},[]);
  useFocusEffect(useCallback(()=>{fetchMeals();},[fetchMeals]));

  // Dismiss — fade card out, fade relaxed in — matches home/shopping exactly
  const handleDismiss=()=>{
    Animated.timing(cardFade,{toValue:0,duration:300,useNativeDriver:true}).start(()=>{
      onDismissBrief();
      setTimeout(()=>Animated.timing(relaxedFade,{toValue:1,duration:350,useNativeDriver:true}).start(),50);
    });
  };

  const handleAssignSave=async(cookIds:string[],jobKidIds:string[],pts:Record<string,number>)=>{
    if(!assignState) return;
    await supabase.from('meal_plans').update({cook_ids:cookIds}).eq('id',assignState.meal.id);
    for(const kidId of jobKidIds){
      const kid=FAMILY.find(m=>m.id===kidId);
      if(!kid) continue;
      await supabase.from('todos').insert({
        family_id:DUMMY_FAMILY_ID,title:`Help cook dinner — ${assignState.label}`,
        assigned_to:kidId,points:pts[kidId]||25,status:'pending',
        due_date:assignState.key,source:'meals',
      });
    }
    setAssignState(null); fetchMeals();
  };

  // Build brief text — recompute days fresh
  const briefDays=get7Days();
  const todayMeal=meals.find(m=>m.day_key===dayKey(briefDays[0]));
  const emptyCount=briefDays.filter(d=>!meals.find(m=>m.day_key===dayKey(d))).length;
  if(!briefText.current){
    briefText.current=todayMeal
      ?`Tonight's sorted — ${todayMeal.meal_name}. ${emptyCount>0?`${emptyCount} night${emptyCount!==1?'s':''} still open — want me to throw some ideas together?`:''}`
      :`Nothing planned for tonight yet. Want me to suggest something quick based on what's in the pantry?`;
  }

  return(
    <View style={{flex:1}}>
      <ScrollView contentContainerStyle={{paddingBottom:130,paddingTop:6}} showsVerticalScrollIndicator={false}>

        {/* Brief card — BLUE (Shopping style) */}
        {showBrief&&!loading?(
          <Animated.View style={{opacity:cardFade}}>
            <View style={s.briefCard}>
              <View style={s.briefHeader}>
                <View style={s.briefAv}><Text style={{color:'#fff',fontSize:15,fontFamily:'Poppins_700Bold'}}>✦</Text></View>
                <Text style={s.briefName}>Z<Text style={{color:C.mag}}>a</Text>el<Text style={{color:C.mag}}>i</Text></Text>
                <View style={s.briefLiveDot}/>
                <Text style={s.briefTime}>{getTimeStr()}</Text>
              </View>
              <View style={s.briefBody}>
                <Text style={s.briefMsg}>{briefText.current}</Text>
                <View style={s.briefBtns}>
                  <TouchableOpacity style={s.btnPrimary} activeOpacity={0.85}
                    onPress={()=>router.push({pathname:'/(tabs)/zaeli-chat',params:{channel:'Meals',returnTo:'/(tabs)/mealplanner'}})}>
                    <Text style={s.btnPrimaryTxt}>Yes, sort the week</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.btnGhost} onPress={handleDismiss} activeOpacity={0.7}>
                    <Text style={s.btnGhostTxt}>All sorted, thanks</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Animated.View>
        ):!showBrief?(
          /* Relaxed card — blue theme */
          <Animated.View style={[s.relaxedCard,{opacity:relaxedFade}]}>
            <View style={s.relaxedHeader}>
              <View style={s.relaxedAv}><Text style={{color:'#fff',fontSize:13}}>✦</Text></View>
              <Text style={s.relaxedAck}>Sounds good! 🍳</Text>
            </View>
            <View style={s.relaxedBody}>
              <Text style={s.relaxedTitle}>Ask Zaeli anything</Text>
              <Text style={s.relaxedMsg}>Still a few nights open this week — want me to suggest something easy that works with what's already in the pantry?</Text>
              <TouchableOpacity style={s.relaxedBtn} activeOpacity={0.85}
                onPress={()=>router.push({pathname:'/(tabs)/zaeli-chat',params:{channel:'Meals',returnTo:'/(tabs)/mealplanner'}})}>
                <Text style={s.relaxedBtnTxt}>Let's cook something ✦</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        ):null}

        {briefDays.map(d=>{
          const dk=dayKey(d);
          const meal=meals.find(m=>m.day_key===dk&&m.meal_type!=='dessert');
          const dessert=meals.find(m=>m.day_key===dk&&m.meal_type==='dessert');
          const dl=dayLabel(d);
          const isKit=meal?.source==='kit';
          const isTakeaway=meal?.source==='takeaway';
          const tonight=isToday(d);
          const tomorrow=isTomorrow(d);
          const cookNames=meal?.cook_ids?.length
            ?FAMILY.filter(m=>meal.cook_ids!.includes(m.id)).map(m=>m.name).join(' + ')
            :null;

          return(
            <View key={dk} style={s.daySec}>

              {/* Option A day header — coloured accent bar + serif date */}
              <View style={s.dayRowA}>
                <View style={[s.dayAccentA,tonight&&{backgroundColor:C.orange},!meal&&!tonight&&{backgroundColor:C.border}]}/>
                <View style={{flex:1}}>
                  <Text style={[s.dayNameA,tonight&&{color:C.orange}]}>
                    {tonight?'TONIGHT':tomorrow?'TOMORROW':fmtDay(d).toUpperCase().split(' ')[0]}
                  </Text>
                  <Text style={[s.dayDateA,tonight&&{color:C.orange},!tonight&&{color:C.ink2}]}>
                    {fmtDay(d)}
                  </Text>
                  {/* Cook avatars inline under date */}
                  {meal&&(
                    <TouchableOpacity style={s.cookRow} activeOpacity={0.8}
                      onPress={()=>setAssignState({key:dk,label:dl,meal})}>
                      {cookNames?(
                        <><CookAvatars cookIds={meal.cook_ids!} size={20}/><Text style={s.cookNameTxt}>{cookNames}</Text></>
                      ):(
                        <View style={s.assignDayBtn}><Text style={s.assignDayTxt}>+ Who's cooking?</Text></View>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Meal content */}
              {!meal?(
                <TouchableOpacity style={s.emptyCard} onPress={()=>setAddDay({key:dk,label:dl})} activeOpacity={0.8}>
                  <View style={s.emptyIcon}><Text style={{fontSize:22}}>🍽</Text></View>
                  <View style={{flex:1}}>
                    <Text style={s.emptyLbl}>{tonight?'Nothing planned for tonight':'Not planned yet'}</Text>
                    <Text style={s.emptySub}>Tap to add or ask Zaeli</Text>
                  </View>
                  <View style={s.emptyAdd}><Text style={s.emptyAddTxt}>+ Add</Text></View>
                </TouchableOpacity>
              ):isKit?(
                <View style={s.kitCard}>
                  <View style={s.kitTop}>
                    <Text style={{fontSize:20}}>📦</Text>
                    <Text style={s.kitLabel}>Meal Kit</Text>
                    <View style={s.kitBadge}><Text style={s.kitBadgeTxt}>Ingredients included</Text></View>
                  </View>
                  <View style={{padding:12}}>
                    <Text style={s.mealName}>{meal.meal_name}</Text>
                    <Text style={s.mealMeta}>No pantry sync needed</Text>
                    <TouchableOpacity
                      style={{marginTop:8,flexDirection:'row',alignItems:'center',gap:6,backgroundColor:'rgba(0,150,100,0.07)',borderRadius:10,padding:9,borderWidth:1.5,borderColor:'rgba(0,150,100,0.18)'}}
                      activeOpacity={savedKits.has(meal.id)?1:0.85}
                      onPress={()=>{
                        if(savedKits.has(meal.id)) return;
                        Alert.alert(
                          'Save to Favourites?',
                          'Meal kit meals are great to recreate at home. Save "'+meal.meal_name+'" to your Favourites?',
                          [
                            {text:'Cancel',style:'cancel'},
                            {text:'Save',onPress:async()=>{
                              await supabase.from('recipes').insert({
                                family_id:DUMMY_FAMILY_ID,
                                name:meal.meal_name||'Meal Kit Recipe',
                                source_type:'manual',
                                tags:['Meal kit'],
                                notes:'Originally a meal kit — add ingredients and method to recreate at home.',
                              });
                              setSavedKits(prev=>new Set([...prev,meal.id]));
                            }},
                          ]
                        );
                      }}>
                      <Text style={{fontSize:14}}>{savedKits.has(meal.id)?'❤️':'🤍'}</Text>
                      <Text style={{fontFamily:'Poppins_600SemiBold',fontSize:12,color:savedKits.has(meal.id)?C.mag:C.kit}}>
                        {savedKits.has(meal.id)?'Saved to Favourites':'Save recipe to Favourites'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ):isTakeaway?(
                <View style={[s.kitCard,{borderColor:'rgba(255,59,59,0.2)'}]}>
                  <View style={[s.kitTop,{backgroundColor:C.redL}]}>
                    <Text style={{fontSize:20}}>🍕</Text>
                    <Text style={[s.kitLabel,{color:C.red}]}>{meal.meal_name}</Text>
                  </View>
                </View>
              ):(
                <View style={s.mealCard}>
                  <View style={s.mealCardTop}>
                    {/* Emoji icon — no image */}
                    {/* Show heart if this meal is saved in Favourites (regardless of source) */}
                    {(()=>{
                      const mealLower=meal.meal_name.toLowerCase();
                      const isFav=meal.source==='favourites'||
                        [...favouritedNames].some(fn=>fn.includes(mealLower)||mealLower.includes(fn));
                      return(
                        <View style={[s.mealIconBox,
                          isFav&&{backgroundColor:'rgba(224,0,124,0.1)'},
                          !isFav&&tonight&&{backgroundColor:C.orangeL},
                        ]}>
                          <Text style={{fontSize:22}}>{isFav?'❤️':getMealEmoji(meal.meal_name)}</Text>
                        </View>
                      );
                    })()}
                    <View style={{flex:1}}>
                      <View style={s.badgeRow}>
                        {meal.source==='library'&&<View style={s.badgeLib}><Text style={s.badgeLibTxt}>📚 Library</Text></View>}
                        {meal.source==='favourites'&&<View style={s.badgeFav}><Text style={s.badgeFavTxt}>❤️ Favourite</Text></View>}
                        {meal.source==='zaeli'&&<View style={s.badgeZ}><Text style={s.badgeZTxt}>✦ Zaeli</Text></View>}
                        {meal.source==='manual'&&<View style={s.badgeZ}><Text style={s.badgeZTxt}>✏️ Manual</Text></View>}
                      </View>
                      <Text style={s.mealName}>{meal.meal_name}</Text>
                      <Text style={s.mealMeta}>{meal.prep_mins?`⏱ ${meal.prep_mins} min · `:''}Serves 4</Text>
                    </View>
                  </View>
                  <View style={{flexDirection:'row',gap:8,alignItems:'center'}}>
                    <TouchableOpacity style={[s.maBtn,{backgroundColor:C.orange}]}
                      onPress={()=>setDetailMeal({meal,label:dl})} activeOpacity={0.85}>
                      <Text style={{color:'#fff',fontSize:12,fontFamily:'Poppins_600SemiBold'}}>View recipe</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.maBtnG} activeOpacity={0.85}
                      onPress={()=>setMoveState({meal,fromLabel:dl})}>
                      <Text style={{color:C.ink2,fontSize:12,fontFamily:'Poppins_600SemiBold'}}>Move</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{width:34,height:34,borderRadius:10,backgroundColor:'rgba(255,59,59,0.08)',alignItems:'center',justifyContent:'center',borderWidth:1.5,borderColor:'rgba(255,59,59,0.18)'}}
                      activeOpacity={0.85}
                      onPress={()=>Alert.alert('Remove meal','Remove '+meal.meal_name+' from the plan?',[
                        {text:'Cancel',style:'cancel'},
                        {text:'Remove',style:'destructive',onPress:async()=>{
                          await supabase.from('meal_plans').delete().eq('id',meal.id);
                          fetchMeals();
                        }},
                      ])}>
                      <Text style={{fontSize:16}}>🗑</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Dessert slot — shown for all days that have a dinner */}
              {meal&&!isKit&&!isTakeaway&&(
                <TouchableOpacity
                  style={[s.dessertSlot,dessert&&s.dessertSlotFilled]}
                  activeOpacity={0.8}
                  onPress={()=>setAddDay({key:dk,label:dl+(dessert?' (dessert)':' dessert')})}>
                  <Text style={{fontSize:15}}>🍮</Text>
                  {dessert?(
                    <>
                      <Text style={[s.dessertTxt,{color:C.ink,fontFamily:'Poppins_600SemiBold'}]}>{dessert.meal_name}</Text>
                      <Text style={s.dessertMeta}>Dessert · Edit</Text>
                    </>
                  ):(
                    <>
                      <Text style={s.dessertTxt}>Add a dessert</Text>
                      <Text style={s.dessertMeta}>optional</Text>
                      <View style={s.dessertAdd}><Text style={s.dessertAddTxt}>+ Add</Text></View>
                    </>
                  )}
                </TouchableOpacity>
              )}

            </View>
          );
        })}
      </ScrollView>

      <AddMealModal
        visible={!!addDay} targetDayKey={addDay?.key||''} targetDayLabel={addDay?.label||''}
        onClose={()=>setAddDay(null)}
        onSaved={()=>{setAddDay(null);fetchMeals();}}
        onBrowseRecipes={()=>{setAddDay(null);onTabChange('recipes');}}
        onFavourites={()=>{setAddDay(null);onTabChange('favourites');}}
      />

      <MealDetailModal
        visible={!!detailMeal} meal={detailMeal?.meal||null} dayLbl={detailMeal?.label||''}
        onClose={()=>setDetailMeal(null)}
        onRequestAssign={()=>detailMeal&&setAssignState({key:detailMeal.meal.day_key,label:detailMeal.label,meal:detailMeal.meal})}
        onMove={()=>detailMeal&&setMoveState({meal:detailMeal.meal,fromLabel:detailMeal.label})}
        onEdit={(meal)=>{
          // Populate edit fields from meal data before opening modal
          setEditName(meal.meal_name);
          if(meal.notes?.includes('Ingredients:')){
            const parts=meal.notes.split(/\n(?=Method:)/);
            setEditIngredients(parts[0]?.replace(/^Ingredients:\n?/,'').trim()||'');
            setEditMethod(parts[1]?.replace(/^Method:\n?/,'').trim()||'');
            setEditNotes('');
          } else {
            setEditIngredients('');
            setEditMethod('');
            setEditNotes(meal.notes||'');
          }
          setEditingMeal(meal);
        }}
      />

      {/* Edit modal — lives in DinnersTab so it survives MealDetailModal unmount */}
      <Modal visible={!!editingMeal} animationType="slide" presentationStyle="pageSheet" onRequestClose={()=>setEditingMeal(null)}>
        <SafeAreaView style={{flex:1,backgroundColor:'#fff'}} edges={['top']}>
          <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':'height'}>
          <View style={s.modalHdr}>
            <TouchableOpacity onPress={()=>setEditingMeal(null)}><Text style={s.modalCancel}>Cancel</Text></TouchableOpacity>
            <Text style={s.modalTitle} numberOfLines={1}>{editName}</Text>
            <TouchableOpacity disabled={savingEdit} activeOpacity={0.8} onPress={async()=>{
              if(!editingMeal) return;
              setSavingEdit(true);
              const noteParts=[
                editIngredients?`Ingredients:\n${editIngredients}`:null,
                editMethod?`\nMethod:\n${editMethod}`:null,
                editNotes?`\nNotes:\n${editNotes}`:null,
              ].filter(Boolean);
              await supabase.from('meal_plans').update({
                meal_name:editName.trim()||editingMeal.meal_name,
                notes:noteParts.join('')||null,
              }).eq('id',editingMeal.id);
              setSavingEdit(false);
              setEditingMeal(null);
              fetchMeals();
            }}>
              <Text style={{fontFamily:'Poppins_700Bold',fontSize:14,color:savingEdit?C.ink3:C.orange}}>{savingEdit?'Saving…':'Save'}</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{padding:18,gap:14}} keyboardShouldPersistTaps="handled">
            <Text style={s.fieldLbl}>MEAL NAME</Text>
            <TextInput style={[s.fieldInput,{marginTop:6}]} value={editName} onChangeText={setEditName}
              placeholder="Meal name" placeholderTextColor={C.ink3} autoCapitalize="words"/>
            <Text style={s.fieldLbl}>INGREDIENTS</Text>
            <TextInput style={[s.fieldInput,{minHeight:110,textAlignVertical:'top',marginTop:6}]}
              value={editIngredients} onChangeText={setEditIngredients}
              placeholder={'e.g.\n500g chicken thighs\n3 tbsp soy sauce\n2 tbsp honey'}
              placeholderTextColor={C.ink3} multiline/>
            <Text style={s.fieldLbl}>METHOD</Text>
            <TextInput style={[s.fieldInput,{minHeight:110,textAlignVertical:'top',marginTop:6}]}
              value={editMethod} onChangeText={setEditMethod}
              placeholder={'e.g.\n1. Marinate chicken for 30 mins\n2. Bake at 200°C for 25 mins'}
              placeholderTextColor={C.ink3} multiline/>
            <Text style={s.fieldLbl}>NOTES (optional)</Text>
            <TextInput style={[s.fieldInput,{minHeight:80,textAlignVertical:'top',marginTop:6}]}
              value={editNotes} onChangeText={setEditNotes}
              placeholder="e.g. Double the sauce, skip chilli for the kids…"
              placeholderTextColor={C.ink3} multiline/>
          </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {assignState&&(
        <AssignCookModal visible={!!assignState} dayLbl={assignState.label} mealName={assignState.meal.meal_name}
          onClose={()=>setAssignState(null)} onSave={handleAssignSave}/>
      )}

      {/* Move Night Modal */}
      <Modal visible={!!moveState} animationType="slide" presentationStyle="pageSheet" onRequestClose={()=>setMoveState(null)}>
        <SafeAreaView style={{flex:1,backgroundColor:'#fff'}} edges={['top']}>
          <View style={s.modalHdr}>
            <TouchableOpacity onPress={()=>setMoveState(null)}><Text style={s.modalCancel}>Cancel</Text></TouchableOpacity>
            <Text style={s.modalTitle}>Move to another night</Text>
            <View style={{width:60}}/>
          </View>
          <ScrollView contentContainerStyle={{padding:16,gap:8}}>
            <Text style={[s.modalSub,{marginBottom:8}]}>Moving: <Text style={{fontFamily:'Poppins_700Bold',color:C.ink}}>{moveState?.meal.meal_name}</Text></Text>
            {briefDays.map(d=>{
              const dk=dayKey(d);
              const dl=dayLabel(d);
              const existing=meals.find(m=>m.day_key===dk&&m.id!==moveState?.meal.id);
              const isCurrent=dk===moveState?.meal.day_key;
              return(
                <TouchableOpacity key={dk}
                  style={[{borderRadius:14,borderWidth:1.5,padding:14,flexDirection:'row',alignItems:'center',gap:12,
                    borderColor:isCurrent?C.ink3:existing?'rgba(255,140,0,0.3)':C.greenB,
                    backgroundColor:isCurrent?'rgba(0,0,0,0.04)':existing?C.orangeL:C.greenL,
                    opacity:isCurrent?0.4:1,
                  }]}
                  disabled={isCurrent}
                  activeOpacity={0.8}
                  onPress={async()=>{
                    if(!moveState) return;
                    const doMove=async()=>{
                      await supabase.from('meal_plans').update({
                        day_key:dk,planned_date:dk,
                      }).eq('id',moveState.meal.id);
                      setMoveState(null);
                      fetchMeals();
                    };
                    if(existing){
                      Alert.alert(
                        `${dl} already has ${existing.meal_name}`,
                        'Moving here will replace it. Continue?',
                        [
                          {text:'Cancel',style:'cancel'},
                          {text:'Replace & move',style:'destructive',onPress:async()=>{
                            await supabase.from('meal_plans').delete().eq('id',existing.id);
                            await doMove();
                          }},
                        ]
                      );
                    } else {
                      await doMove();
                    }
                  }}>
                  <View style={{flex:1}}>
                    <Text style={{fontFamily:'Poppins_700Bold',fontSize:13,color:C.ink}}>{dl}</Text>
                    {existing&&<Text style={{fontFamily:'Poppins_400Regular',fontSize:11,color:C.orange,marginTop:2}}>{existing.meal_name} — will be replaced</Text>}
                    {!existing&&!isCurrent&&<Text style={{fontFamily:'Poppins_400Regular',fontSize:11,color:C.green,marginTop:2}}>Free — move here</Text>}
                    {isCurrent&&<Text style={{fontFamily:'Poppins_400Regular',fontSize:11,color:C.ink3,marginTop:2}}>Current night</Text>}
                  </View>
                  {!isCurrent&&<Text style={{fontSize:18,color:isCurrent?C.ink3:existing?C.orange:C.green}}>{existing?'⚠️':'→'}</Text>}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

// ── Recipes Tab ───────────────────────────────────────────────────────────────
function RecipesTab({onPlanAdded,openDayPicker}:{
  onPlanAdded:()=>void;
  openDayPicker:(ctx:any)=>void;
}){
  const router=useRouter();
  const [query,setQuery]=useState('');
  const [filter,setFilter]=useState('All');
  const [selected,setSelected]=useState<SpoonRecipe|null>(null);
  const [browseOpen,setBrowseOpen]=useState(false);
  const [editingRecipe,setEditingRecipe]=useState<SpoonRecipe|null>(null);
  const [editIngredients,setEditIngredients]=useState('');
  const [editMethod,setEditMethod]=useState('');
  const [editNotes,setEditNotes]=useState('');
  const [savingEdit,setSavingEdit]=useState(false);

  // When editingRecipe is set, look up any saved notes and pre-populate fields
  useEffect(()=>{
    if(!editingRecipe) return;
    let cancelled=false;
    supabase.from('recipes').select('notes')
      .eq('family_id',DUMMY_FAMILY_ID).ilike('name',editingRecipe.title).limit(1)
      .then(({data})=>{
        if(cancelled) return;
        const notes=data?.[0]?.notes||'';
        if(notes.includes('Ingredients:')){
          const parts=notes.split(/\n(?=Method:)/);
          setEditIngredients(parts[0]?.replace(/^Ingredients:\n?/,'').trim()||'');
          setEditMethod(parts[1]?.replace(/^Method:\n?/,'').trim()||'');
          setEditNotes('');
        } else {
          setEditIngredients('');
          setEditMethod('');
          setEditNotes(notes);
        }
      });
    return ()=>{cancelled=true;};
  },[editingRecipe?.id]);
  const FILTERS=['All','Quick','Kids love','Gut friendly','Gluten free','Dairy free'];

  const filtered=DUMMY_RECIPES.filter(r=>{
    const mq=!query.trim()||r.title.toLowerCase().includes(query.toLowerCase());
    const mf=filter==='All'?true
      :filter==='Quick'?r.readyInMinutes<=25
      :filter==='Kids love'?[715538,654959,632660,665613].includes(r.id)
      :(filter==='Gut friendly'||filter==='Gluten free')?r.glutenFree
      :filter==='Dairy free'?r.dairyFree:true;
    return mq&&mf;
  });

  return(
    <View style={{flex:1}}>
      <ScrollView contentContainerStyle={{paddingBottom:130}} showsVerticalScrollIndicator={false}>

      {/* Zaeli brief — blue card (matching Dinners/Shopping style) */}
        <View style={s.briefCard}>
          <View style={s.briefHeader}>
            <View style={s.briefAv}><Text style={{color:'#fff',fontSize:15,fontFamily:'Poppins_700Bold'}}>✦</Text></View>
            <Text style={s.briefName}>Z<Text style={{color:C.mag}}>a</Text>el<Text style={{color:C.mag}}>i</Text></Text>
            <View style={s.briefLiveDot}/>
            <Text style={s.briefTime}>{getTimeStr()}</Text>
          </View>
          <View style={s.briefBody}>
            <Text style={s.briefMsg}>
              Tell me what you're in the mood for — I'll find something from 5,000+ recipes that works with your pantry and the family's tastes. Or browse the library yourself below.
            </Text>
            <View style={s.briefBtns}>
              <TouchableOpacity style={s.btnPrimary} activeOpacity={0.85}
                onPress={()=>router.push({pathname:'/(tabs)/zaeli-chat',params:{channel:'Meals',returnTo:'/(tabs)/mealplanner',seedMessage:"I'm looking for a recipe idea — "}})}>
                <Text style={s.btnPrimaryTxt}>✦ Find me a recipe</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.btnGhost} onPress={()=>setBrowseOpen(true)} activeOpacity={0.7}>
                <Text style={s.btnGhostTxt}>Browse manually</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>


        {/* Browse section — revealed when user taps "Browse manually" */}
        {browseOpen&&(
          <>
            {/* Filter chips */}
            <View style={{backgroundColor:C.bg}}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}
                contentContainerStyle={{paddingHorizontal:16,paddingVertical:10,gap:8}}
                style={{flexShrink:0}}>
                {FILTERS.map(f=>(
                  <TouchableOpacity key={f} style={[s.filterChip,filter===f&&s.filterChipOn]}
                    onPress={()=>setFilter(f)} activeOpacity={0.8}>
                    <Text style={[s.filterChipTxt,filter===f&&{color:'#fff'}]}>{f}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Search bar */}
            <View style={s.searchWrap}>
              <View style={s.searchBar}>
                <IcoSearch color={C.ink3}/>
                <TextInput style={s.searchInput} placeholder="Search 5,000+ recipes…"
                  placeholderTextColor={C.ink3} value={query} onChangeText={setQuery}/>
                {query.length>0&&(
                  <TouchableOpacity onPress={()=>setQuery('')} activeOpacity={0.7}>
                    <Text style={{fontSize:18,color:C.ink3,lineHeight:22}}>×</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Pantry insight */}
            <View style={s.pantryInsightCard}>
              <View style={s.pantryInsightAv}><Text style={{color:'#fff',fontSize:13}}>✦</Text></View>
              <View style={{flex:1,paddingLeft:2}}>
                <Text style={s.pantryInsightTitle}>Meals you can cook tonight</Text>
                <Text style={s.pantryInsightBody}>Using what's already in your pantry</Text>
              </View>
            </View>

            {filtered.length===0?(
              <View style={{alignItems:'center',paddingTop:40}}>
                <Text style={{fontSize:36,marginBottom:12}}>🔍</Text>
                <Text style={{fontFamily:'Poppins_700Bold',fontSize:17,color:C.ink,marginBottom:6}}>No results</Text>
                <Text style={{fontFamily:'Poppins_400Regular',fontSize:14,color:C.ink2}}>Try a different search or filter</Text>
              </View>
            ):(
              <>
                <Text style={s.slbl}>{query?`Results for "${query}"`:filter==='All'?'All recipes':filter}</Text>
                {filtered.map(r=>(
                  <TouchableOpacity key={r.id} style={s.recipeRow} onPress={()=>setSelected(r)} activeOpacity={0.8}>
                    {/* Smart emoji icon based on recipe name */}
                    <View style={[s.recipeRowImg,{alignItems:'center',justifyContent:'center',backgroundColor:C.orangeL}]}>
                      <Text style={{fontSize:26}}>{getMealEmoji(r.title)}</Text>
                    </View>
                    <View style={s.recipeRowBody}>
                      <Text style={s.recipeRowName} numberOfLines={2}>{r.title}</Text>
                      <Text style={s.recipeRowMeta}>⏱ {r.readyInMinutes} min · Serves {r.servings}</Text>
                      <View style={{flexDirection:'row',gap:5,flexWrap:'wrap'}}>
                        {r.glutenFree&&<View style={s.rtGr}><Text style={s.rtGrTxt}>GF</Text></View>}
                        {r.lowFodmap&&<View style={s.rtGr}><Text style={s.rtGrTxt}>Low FODMAP</Text></View>}
                        {r.dairyFree&&<View style={s.rtBl}><Text style={s.rtBlTxt}>Dairy free</Text></View>}
                      </View>
                    </View>
                    <TouchableOpacity style={s.recipeAdd} onPress={()=>setSelected(r)} activeOpacity={0.8}>
                      <Text style={s.recipeAddTxt}>+ Plan</Text>
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}
              </>
            )}
          </>
        )}
      </ScrollView>

      <RecipeDetailModal
        visible={!!selected} recipe={selected}
        onClose={()=>setSelected(null)}
        onAdded={(dk,dl)=>{setSelected(null);onPlanAdded();}}
        openDayPicker={openDayPicker}
        onEdit={(r)=>{
          setEditingRecipe(r);
          setSelected(null);
        }}
      />

      {/* Edit modal — at RecipesTab level, never nested */}
      <Modal visible={!!editingRecipe} animationType="slide" presentationStyle="pageSheet" onRequestClose={()=>setEditingRecipe(null)}>
        <SafeAreaView style={{flex:1,backgroundColor:'#fff'}} edges={['top']}>
          <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':'height'}>
          <View style={s.modalHdr}>
            <TouchableOpacity onPress={()=>setEditingRecipe(null)}><Text style={s.modalCancel}>Cancel</Text></TouchableOpacity>
            <Text style={s.modalTitle} numberOfLines={1}>{editingRecipe?.title}</Text>
            <TouchableOpacity disabled={savingEdit} activeOpacity={0.8} onPress={async()=>{
              if(!editingRecipe) return;
              setSavingEdit(true);
              const noteParts=[
                editIngredients?`Ingredients:\n${editIngredients}`:null,
                editMethod?`\nMethod:\n${editMethod}`:null,
                editNotes?`\nNotes:\n${editNotes}`:null,
              ].filter(Boolean);
              // Upsert to recipes table
              const{data:existing}=await supabase.from('recipes').select('id').eq('family_id',DUMMY_FAMILY_ID).ilike('name',editingRecipe.title).single();
              if(existing?.id){
                await supabase.from('recipes').update({notes:noteParts.join('')||null}).eq('id',existing.id);
              } else {
                await supabase.from('recipes').insert({
                  family_id:DUMMY_FAMILY_ID,name:editingRecipe.title,source_type:'spoonacular',
                  tags:[],prep_mins:editingRecipe.readyInMinutes,image_url:editingRecipe.image,
                  notes:noteParts.join('')||null,
                });
              }
              setSavingEdit(false);
              setEditingRecipe(null);
              Alert.alert('Saved','Your notes have been saved to Favourites.');
            }}>
              <Text style={{fontFamily:'Poppins_700Bold',fontSize:14,color:savingEdit?C.ink3:C.orange}}>{savingEdit?'Saving…':'Save'}</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{padding:18,gap:14}} keyboardShouldPersistTaps="handled">
            <Text style={s.fieldLbl}>INGREDIENTS (your overrides)</Text>
            <TextInput style={[s.fieldInput,{minHeight:100,textAlignVertical:'top'}]}
              value={editIngredients} onChangeText={setEditIngredients}
              placeholder="Add or override ingredients…" placeholderTextColor={C.ink3} multiline/>
            <Text style={s.fieldLbl}>METHOD (your overrides)</Text>
            <TextInput style={[s.fieldInput,{minHeight:100,textAlignVertical:'top'}]}
              value={editMethod} onChangeText={setEditMethod}
              placeholder="Add or override method…" placeholderTextColor={C.ink3} multiline/>
            <Text style={s.fieldLbl}>PERSONAL NOTES</Text>
            <TextInput style={[s.fieldInput,{minHeight:80,textAlignVertical:'top'}]}
              value={editNotes} onChangeText={setEditNotes}
              placeholder="e.g. Double the sauce, skip chilli for the kids" placeholderTextColor={C.ink3} multiline/>
            <Text style={{fontFamily:'Poppins_400Regular',fontSize:12,color:C.ink3,textAlign:'center'}}>
              Edits are saved to your Favourites alongside the original recipe
            </Text>
          </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

// ── Favourites Tab ────────────────────────────────────────────────────────────
function FavouritesTab({onPlanAdded}:{onPlanAdded:()=>void}){
  const router=useRouter();
  const [recipes,setRecipes]=useState<SavedRecipe[]>([]);
  const [menus,setMenus]=useState<SavedMenu[]>([]);
  const [loading,setLoading]=useState(true);
  const [saveVisible,setSaveVisible]=useState(false);
  const [selected,setSelected]=useState<SavedRecipe|null>(null);
  const [favView,setFavView]=useState<'picks'|'menus'>('picks');
  const [selectedMenu,setSelectedMenu]=useState<SavedMenu|null>(null);
  const [editMenuName,setEditMenuName]=useState('');
  const [savingMenuName,setSavingMenuName]=useState(false);

  const fetchRecipes=useCallback(async()=>{
    const{data}=await supabase.from('recipes').select('*')
      .eq('family_id',DUMMY_FAMILY_ID).order('created_at',{ascending:false});
    setRecipes((data||[]) as SavedRecipe[]);
    setLoading(false);
  },[]);

  const fetchMenus=useCallback(async()=>{
    const{data}=await supabase.from('menus').select('*')
      .eq('family_id',DUMMY_FAMILY_ID).order('created_at',{ascending:false});
    setMenus((data||[]) as SavedMenu[]);
  },[]);

  useFocusEffect(useCallback(()=>{fetchRecipes();fetchMenus();},[fetchRecipes,fetchMenus]));

  // Always show real DB recipes first, then dummy favourites that aren't duplicated by name
  // Deduplicate DB recipes by name (case-insensitive) — keep most recent
  const seenNames=new Set<string>();
  const dedupedRecipes=recipes.filter(r=>{
    const k=r.name.toLowerCase();
    if(seenNames.has(k)) return false;
    seenNames.add(k); return true;
  });
  const dbNames=new Set(dedupedRecipes.map(r=>r.name.toLowerCase()));
  const filteredDummies=DUMMY_FAVS.filter(d=>!dbNames.has(d.name.toLowerCase()));
  const display=[...dedupedRecipes,...filteredDummies];

  return(
    <View style={{flex:1}}>
      <ScrollView contentContainerStyle={{paddingBottom:130}} showsVerticalScrollIndicator={false}>
        {/* Save CTA */}
        <TouchableOpacity style={s.saveCta} onPress={()=>setSaveVisible(true)} activeOpacity={0.85}>
          <View style={s.saveCtaIcon}><Text style={{fontSize:28}}>📸</Text></View>
          <View style={{flex:1}}>
            <Text style={s.saveCtaTitle}>Save a recipe</Text>
            <Text style={s.saveCtaSub}>Photo, URL, menu or recipe card</Text>
          </View>
          <View style={s.saveCtaBtn}><Text style={s.saveCtaBtnTxt}>+ Save</Text></View>
        </TouchableOpacity>

        {/* Family Picks / Saved Menus toggle */}
        <View style={s.favToggleWrap}>
          <TouchableOpacity style={[s.favToggleBtn,favView==='picks'&&s.favToggleBtnOn]}
            onPress={()=>setFavView('picks')} activeOpacity={0.8}>
            <Text style={[s.favToggleTxt,favView==='picks'&&s.favToggleTxtOn]}>❤️ Family Picks</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.favToggleBtn,favView==='menus'&&s.favToggleBtnOn]}
            onPress={()=>setFavView('menus')} activeOpacity={0.8}>
            <Text style={[s.favToggleTxt,favView==='menus'&&s.favToggleTxtOn]}>🍽️ Saved Menus</Text>
            {menus.length>0&&<View style={s.favToggleBadge}><Text style={s.favToggleBadgeTxt}>{menus.length}</Text></View>}
          </TouchableOpacity>
        </View>

        {favView==='picks'&&(
          <>
            <Text style={s.slbl}>Your family favourites</Text>
            {display.map(r=>{
              // Pick an appropriate emoji based on source/tags
              const icon=getMealEmoji(r.name);
              const iconBg=
                r.tags?.some((t:string)=>['Dessert','Baking','Sweet'].includes(t))?'rgba(192,57,43,.08)':
                r.source_type==='url'?'rgba(0,201,122,.1)':
                r.source_type==='photo'?'rgba(155,127,212,.1)':
                C.orangeL;
              return(
                <TouchableOpacity key={r.id} style={s.favRow} onPress={()=>setSelected(r)} activeOpacity={0.8}>
                  <View style={[s.favRowIcon,{backgroundColor:iconBg}]}>
                    <Text style={{fontSize:20}}>{icon}</Text>
                  </View>
                  <View style={s.favRowInfo}>
                    <Text style={s.favRowName}>{r.name}</Text>
                    <Text style={s.favRowMeta}>
                      {r.source_type==='photo'?'Saved from photo':r.source_type==='url'?'Saved from URL':r.source_type==='zaeli'?'Added by Zaeli':'Family favourite'}
                      {r.prep_mins?` · ⏱ ${r.prep_mins} min`:''}
                    </Text>
                    {r.tags?.length>0&&(
                      <View style={{flexDirection:'row',gap:5,flexWrap:'wrap',marginTop:4}}>
                        {r.tags.slice(0,3).map((t:string)=>(
                          <View key={t} style={s.rtPu}><Text style={s.rtPuTxt}>{t}</Text></View>
                        ))}
                      </View>
                    )}
                  </View>
                  {/* Heart shown on ALL entries — tappable remove only for real DB rows */}
                  {r.id.startsWith('f')?(
                    <View style={{padding:6}}>
                      <Text style={{fontSize:18}}>❤️</Text>
                    </View>
                  ):(
                    <TouchableOpacity style={{padding:6}} activeOpacity={0.7}
                      onPress={()=>Alert.alert('Remove favourite','Remove "'+r.name+'" from your Favourites?',[
                        {text:'Cancel',style:'cancel'},
                        {text:'Remove',style:'destructive',onPress:async()=>{
                          await supabase.from('recipes').delete().eq('id',r.id);
                          fetchRecipes();
                        }},
                      ])}>
                      <Text style={{fontSize:18}}>❤️</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={s.favPlanBtn} onPress={()=>setSelected(r)} activeOpacity={0.8}>
                    <Text style={s.favPlanBtnTxt}>+ Plan</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })}
          </>
        )}

        {favView==='menus'&&(
          <>
            <Text style={s.slbl}>Saved menus</Text>
            {menus.length===0?(
              <View style={{alignItems:'center',paddingTop:32,paddingHorizontal:32}}>
                <Text style={{fontSize:40,marginBottom:12}}>🍽️</Text>
                <Text style={{fontFamily:'Poppins_700Bold',fontSize:16,color:C.ink,marginBottom:6,textAlign:'center'}}>No menus saved yet</Text>
                <Text style={{fontFamily:'Poppins_400Regular',fontSize:13,color:C.ink2,textAlign:'center',lineHeight:20}}>Tap "+ Save" above, then choose "Save a menu" and take a photo of any restaurant or cafe menu.</Text>
              </View>
            ):menus.map(m=>(
              <TouchableOpacity key={m.id} style={s.menuCard} onPress={()=>{setSelectedMenu(m);setEditMenuName(m.venue_name);}} activeOpacity={0.8}>
                <View style={s.menuCardTop}>
                  <View style={s.menuIcon}><Text style={{fontSize:22}}>🍽️</Text></View>
                  <View style={{flex:1}}>
                    <Text style={s.menuVenueName}>{m.venue_name}</Text>
                    <Text style={s.menuVenueType}>{m.venue_type||'Restaurant'} · {m.items?.length||0} dishes</Text>
                  </View>
                  <Text style={{fontSize:18,color:C.ink3}}>›</Text>
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}
      </ScrollView>

      <SaveRecipeModal visible={saveVisible} onClose={()=>setSaveVisible(false)}
        onSaved={()=>{setSaveVisible(false);fetchRecipes();fetchMenus();}} router={router}/>

      <FavouriteDetailModal
        visible={!!selected} recipe={selected}
        onClose={()=>{setSelected(null);fetchRecipes();}}
        onSaved={fetchRecipes}
        onAdded={(dk,dl)=>{setSelected(null);onPlanAdded();}}
      />

      {/* Menu Detail Sheet */}
      <Modal visible={!!selectedMenu} animationType="slide" presentationStyle="pageSheet" onRequestClose={()=>setSelectedMenu(null)}>
        <SafeAreaView style={{flex:1,backgroundColor:'#fff'}} edges={['top']}>
          <View style={s.modalHdr}>
            <TouchableOpacity onPress={()=>setSelectedMenu(null)}><Text style={s.modalCancel}>← Back</Text></TouchableOpacity>
            <Text style={s.modalTitle} numberOfLines={1}>{editMenuName||selectedMenu?.venue_name}</Text>
            <TouchableOpacity activeOpacity={0.8} disabled={savingMenuName}
              onPress={async()=>{
                if(!selectedMenu||!editMenuName.trim()) return;
                setSavingMenuName(true);
                await supabase.from('menus').update({venue_name:editMenuName.trim()}).eq('id',selectedMenu.id);
                setSavingMenuName(false);
                fetchMenus();
              }}>
              <Text style={{fontFamily:'Poppins_700Bold',fontSize:14,color:savingMenuName?C.ink3:C.orange}}>
                {savingMenuName?'Saving…':'Save'}
              </Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{paddingBottom:40}} keyboardShouldPersistTaps="handled">
            {/* Editable venue name */}
            <View style={{paddingHorizontal:16,paddingTop:14,paddingBottom:4}}>
              <Text style={s.fieldLbl}>VENUE NAME</Text>
              <TextInput
                style={[s.fieldInput,{marginTop:6,marginBottom:10}]}
                value={editMenuName}
                onChangeText={setEditMenuName}
                placeholder="e.g. The Depot Noosa"
                placeholderTextColor={C.ink3}
                autoCapitalize="words"
              />
              <Text style={[s.modalSub,{marginBottom:4}]}>
                {selectedMenu?.venue_type||'Restaurant'} · {selectedMenu?.items?.length||0} dishes
              </Text>
            </View>
            {(selectedMenu?.items||[]).map((item,i)=>(
              <View key={i} style={s.menuItemRow}>
                <View style={{flex:1}}>
                  <Text style={s.menuItemName}>{item.name}</Text>
                  {item.description?<Text style={s.menuItemDesc}>{item.description}</Text>:null}
                  {item.dietary?.length>0&&(
                    <View style={{flexDirection:'row',gap:5,marginTop:4,flexWrap:'wrap'}}>
                      {item.dietary.map((d:string)=>(
                        <View key={d} style={s.ingOk}><Text style={s.ingOkTxt}>{d}</Text></View>
                      ))}
                    </View>
                  )}
                </View>
                {item.price?<Text style={s.menuItemPrice}>{item.price}</Text>:null}
              </View>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function MealPlannerScreen(){
  const router=useRouter();
  const insets=useSafeAreaInsets();
  const [fontsLoaded]=useFonts({
    Poppins_400Regular,Poppins_500Medium,Poppins_600SemiBold,
    Poppins_700Bold,Poppins_800ExtraBold,DMSerifDisplay_400Regular,
  });
  const [activeTab,setActiveTab]=useState<TabType>('dinners');
  const [navOpen,setNavOpen]=useState(false);
  const [briefDismissed,setBriefDismissed]=useState(false);

  // ── Shared day picker — lifted here so it never nests inside another Modal ──
  const [dayPickerCtx,setDayPickerCtx]=useState<{
    name:string;
    source:'library'|'favourites'|'zaeli'|'manual';
    ingredients?:any[];
    notes?:string;
    image_url?:string;
    prep_mins?:number;
    onAdded:(dayKey:string,dayLabel:string)=>void;
  }|null>(null);
  const [dayPickerSaving,setDayPickerSaving]=useState(false);

  const openDayPicker=(ctx:typeof dayPickerCtx)=>setDayPickerCtx(ctx);

  const saveToPlan=async(dk:string)=>{
    if(!dayPickerCtx) return;
    setDayPickerSaving(true);
    try{
      const{data:inserted,error}=await supabase.from('meal_plans').insert({
        family_id:DUMMY_FAMILY_ID,
        day_key:dk,
        planned_date:dk,
        meal_name:dayPickerCtx.name,
        meal_type:'dinner',
        source:dayPickerCtx.source,
        image_url:dayPickerCtx.image_url||null,
        prep_mins:dayPickerCtx.prep_mins||null,
        ingredients:dayPickerCtx.ingredients||null,
        notes:dayPickerCtx.notes||null,
      }).select('id').single();
      if(error) throw error;
      const dl=dayLabel(get7Days().find(d=>dayKey(d)===dk)||new Date());
      dayPickerCtx.onAdded(dk,dl);
      setDayPickerCtx(null);
    }catch(e:any){
      Alert.alert('Could not save',e?.message||'Please try again');
    }finally{
      setDayPickerSaving(false);
    }
  };

  if(!fontsLoaded) return null;

  return(
    <View style={{flex:1,backgroundColor:C.dark}}>
      <StatusBar style="light"/>
      <SafeAreaView edges={['top']} style={{backgroundColor:C.orange}}>
        <View style={s.hero}>
          <View style={s.heroRow}>
            <TouchableOpacity style={s.logoWrap} onPress={()=>router.replace('/(tabs)/')} activeOpacity={0.75}>
              <View style={s.logoMark}><Text style={{fontSize:18,color:'#fff'}}>✦</Text></View>
              <Text style={s.logoWord}>{'z'}<Text style={{color:C.yellow}}>{'a'}</Text>{'el'}<Text style={{color:C.yellow}}>{'i'}</Text></Text>
            </TouchableOpacity>
            <Text style={s.heroTitle}>Meals</Text>
            <HamburgerButton onPress={()=>setNavOpen(true)}/>
          </View>
          {/* Sub-tabs — exact copy from shopping.tsx */}
          <View style={s.subTabs}>
            {(['dinners','recipes','favourites'] as TabType[]).map(tab=>(
              <TouchableOpacity key={tab} style={[s.subTab,activeTab===tab&&s.subTabOn]}
                onPress={()=>setActiveTab(tab)} activeOpacity={0.8}>
                <Text style={[s.subTabTxt,activeTab===tab&&s.subTabTxtOn]}>
                  {tab==='dinners'?'Dinners':tab==='recipes'?'Recipes':'Favourites'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </SafeAreaView>

      <View style={{flex:1,backgroundColor:C.bg}}>
        {activeTab==='dinners'&&(
          <DinnersTab
            showBrief={!briefDismissed}
            onDismissBrief={()=>setBriefDismissed(true)}
            onTabChange={setActiveTab}
          />
        )}
        {activeTab==='recipes'&&(
          <RecipesTab onPlanAdded={()=>setActiveTab('dinners')} openDayPicker={openDayPicker}/>
        )}
        {activeTab==='favourites'&&(
          <FavouritesTab onPlanAdded={()=>setActiveTab('dinners')} openDayPicker={openDayPicker}/>
        )}

        {/* Ask Zaeli bar — exact copy from shopping.tsx */}
        <View style={[s.askBarWrap,{paddingBottom:insets.bottom+4}]}>
          <TouchableOpacity style={s.askBar2}
            onPress={()=>router.push({pathname:'/(tabs)/zaeli-chat',params:{channel:'Meals',returnTo:'/(tabs)/mealplanner'}})}
            activeOpacity={0.85}>
            <View style={s.askDiamondWrap}><Text style={s.askDiamond}>✦</Text></View>
            <Text style={s.askText}>Ask Zaeli about meals…</Text>
            <TouchableOpacity style={s.askSend}
              onPress={()=>router.push({pathname:'/(tabs)/zaeli-chat',params:{channel:'Meals',returnTo:'/(tabs)/mealplanner'}})}
              activeOpacity={0.85}>
              <IcoSend/>
            </TouchableOpacity>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Shared day picker — never nested inside another modal ── */}
      <Modal visible={!!dayPickerCtx} animationType="slide" presentationStyle="pageSheet" onRequestClose={()=>setDayPickerCtx(null)}>
        <SafeAreaView style={{flex:1,backgroundColor:'#fff'}} edges={['top']}>
          <View style={s.modalHdr}>
            <TouchableOpacity onPress={()=>setDayPickerCtx(null)}><Text style={s.modalCancel}>Cancel</Text></TouchableOpacity>
            <Text style={s.modalTitle}>Which night?</Text>
            <View style={{width:60}}/>
          </View>
          <ScrollView contentContainerStyle={{padding:16,gap:8}}>
            <Text style={[s.modalSub,{marginBottom:4}]}>
              Adding: <Text style={{fontFamily:'Poppins_700Bold',color:C.ink}}>{dayPickerCtx?.name}</Text>
            </Text>
            {get7Days().map(d=>{
              const dk=dayKey(d);
              const tonight=isToday(d);
              return(
                <TouchableOpacity key={dk} disabled={dayPickerSaving}
                  style={{borderRadius:14,borderWidth:1.5,padding:14,flexDirection:'row',alignItems:'center',gap:12,
                    borderColor:tonight?C.orange:C.border,
                    backgroundColor:tonight?C.orangeL:'#fff',
                    opacity:dayPickerSaving?0.5:1}}
                  activeOpacity={0.8}
                  onPress={()=>saveToPlan(dk)}>
                  <View style={{flex:1}}>
                    <Text style={{fontFamily:'Poppins_700Bold',fontSize:14,color:tonight?C.orange:C.ink}}>{dayLabel(d)}</Text>
                    <Text style={{fontFamily:'Poppins_400Regular',fontSize:11,color:C.ink3,marginTop:2}}>{fmtDay(d)}</Text>
                  </View>
                  <Text style={{fontSize:18,color:tonight?C.orange:C.ink3}}>→</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <NavMenu visible={navOpen} onClose={()=>setNavOpen(false)}/>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s=StyleSheet.create({
  // Hero — exact from shopping.tsx
  hero:           {paddingHorizontal:22,paddingBottom:16},
  heroRow:        {flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingTop:4,marginBottom:14},
  heroTitle:      {fontFamily:'DMSerifDisplay_400Regular',fontSize:34,color:'#fff',letterSpacing:-0.5,position:'absolute',left:0,right:0,textAlign:'center'},
  logoWrap:       {flexDirection:'row',alignItems:'center',gap:8,zIndex:1},
  logoMark:       {width:34,height:34,backgroundColor:'rgba(255,255,255,0.2)',borderRadius:10,alignItems:'center',justifyContent:'center'},
  logoWord:       {fontFamily:'DMSerifDisplay_400Regular',fontSize:24,color:'#fff',letterSpacing:-0.5},
  // Sub-tabs — exact from shopping.tsx
  subTabs:        {flexDirection:'row',backgroundColor:'rgba(255,255,255,0.12)',borderRadius:22,padding:3,gap:2},
  subTab:         {flex:1,paddingVertical:8,borderRadius:19,alignItems:'center'},
  subTabOn:       {backgroundColor:'#fff'},
  subTabTxt:      {fontFamily:'Poppins_600SemiBold',fontSize:13,color:'rgba(255,255,255,0.60)'},
  subTabTxtOn:    {color:C.dark},
  // Brief card — exact from shopping.tsx with orange accent
  briefCard:      {marginHorizontal:18,marginTop:14,marginBottom:6,backgroundColor:'#fff',borderRadius:20,borderWidth:1.5,borderColor:'rgba(0,87,255,0.15)',shadowColor:C.blue,shadowOpacity:0.08,shadowRadius:16,shadowOffset:{width:0,height:4},overflow:'hidden'},
  briefHeader:    {flexDirection:'row',alignItems:'center',gap:10,paddingHorizontal:16,paddingTop:14,paddingBottom:11,borderBottomWidth:1,borderBottomColor:'rgba(0,87,255,0.08)',backgroundColor:'rgba(0,87,255,0.03)'},
  briefAv:        {width:30,height:30,borderRadius:10,backgroundColor:C.blue,alignItems:'center',justifyContent:'center'},
  briefName:      {fontFamily:'Poppins_700Bold',fontSize:13,color:C.ink,flex:1},
  briefLiveDot:   {width:6,height:6,borderRadius:3,backgroundColor:C.green},
  briefTime:      {fontFamily:'Poppins_400Regular',fontSize:10,color:C.ink3},
  briefBody:      {padding:16,paddingTop:14},
  briefMsg:       {fontFamily:'Poppins_400Regular',fontSize:14,color:C.ink,lineHeight:22,marginBottom:14},
  briefBtns:      {flexDirection:'row',gap:8},
  btnPrimary:     {flex:1,backgroundColor:C.blue,borderRadius:12,paddingVertical:11,alignItems:'center',justifyContent:'center'},
  btnPrimaryTxt:  {fontFamily:'Poppins_600SemiBold',fontSize:13,color:'#fff'},
  btnGhost:       {flex:1,backgroundColor:'rgba(0,0,0,0.055)',borderRadius:12,paddingVertical:11,alignItems:'center',justifyContent:'center',borderWidth:1.5,borderColor:'rgba(0,0,0,0.09)'},
  btnGhostTxt:    {fontFamily:'Poppins_600SemiBold',fontSize:13,color:C.ink2},
  // Relaxed card — blue theme
  relaxedCard:    {marginHorizontal:18,marginTop:14,marginBottom:6,borderRadius:20,borderWidth:1.5,borderColor:'rgba(0,87,255,0.18)',backgroundColor:'rgba(0,87,255,0.05)',overflow:'hidden'},
  relaxedHeader:  {flexDirection:'row',alignItems:'center',gap:10,paddingHorizontal:16,paddingVertical:11,borderBottomWidth:1,borderBottomColor:'rgba(0,0,0,0.05)'},
  relaxedAv:      {width:28,height:28,borderRadius:9,backgroundColor:C.blue,alignItems:'center',justifyContent:'center',flexShrink:0},
  relaxedAck:     {fontFamily:'Poppins_700Bold',fontSize:12,color:C.blue,flex:1},
  relaxedBody:    {padding:16,paddingTop:12,paddingBottom:14},
  relaxedTitle:   {fontFamily:'Poppins_700Bold',fontSize:13,color:C.ink,marginBottom:5},
  relaxedMsg:     {fontFamily:'Poppins_400Regular',fontSize:13,color:C.ink2,lineHeight:21,marginBottom:12},
  relaxedBtn:     {width:'100%',backgroundColor:'rgba(0,87,255,0.08)',borderRadius:12,paddingVertical:10,alignItems:'center'},
  relaxedBtnTxt:  {fontFamily:'Poppins_600SemiBold',fontSize:12,color:C.blue},
  // Pantry insight
  pantryInsightCard:  {marginHorizontal:18,marginTop:14,marginBottom:4,backgroundColor:'#fff',borderRadius:20,borderWidth:1.5,borderColor:'rgba(255,140,0,0.18)',shadowColor:C.orange,shadowOpacity:0.07,shadowRadius:14,shadowOffset:{width:0,height:3},overflow:'hidden',padding:14,flexDirection:'row',alignItems:'flex-start',gap:10},
  pantryInsightAv:    {width:28,height:28,borderRadius:9,backgroundColor:C.orange,alignItems:'center',justifyContent:'center'},
  pantryInsightTitle: {fontFamily:'Poppins_700Bold',fontSize:14,color:C.ink,marginBottom:2},
  pantryInsightBody:  {fontFamily:'Poppins_400Regular',fontSize:13,color:C.ink2,lineHeight:19},
  // Ask bar — blue send button
  askBarWrap:     {position:'absolute',bottom:0,left:0,right:0,paddingHorizontal:16,paddingTop:10,backgroundColor:C.bg,borderTopWidth:1,borderTopColor:'rgba(0,0,0,0.07)'},
  askBar2:        {backgroundColor:'#fff',borderRadius:22,paddingVertical:11,paddingHorizontal:14,flexDirection:'row',alignItems:'center',gap:8,borderWidth:1.5,borderColor:'rgba(0,0,0,0.10)',shadowColor:'#000',shadowOpacity:0.06,shadowRadius:12,shadowOffset:{width:0,height:2}},
  askDiamondWrap: {width:20,alignItems:'center',justifyContent:'center'},
  askDiamond:     {fontSize:15,color:C.blue},
  askText:        {flex:1,fontFamily:'Poppins_400Regular',fontSize:15,color:'rgba(0,0,0,0.28)'},
  askSend:        {width:36,height:36,borderRadius:11,backgroundColor:C.blue,alignItems:'center',justifyContent:'center',flexShrink:0,shadowColor:C.blue,shadowOpacity:0.3,shadowRadius:6,shadowOffset:{width:0,height:2}},
  // Recipes chat-bubble Zaeli card
  recBriefAv:     {width:36,height:36,borderRadius:12,backgroundColor:C.blue,alignItems:'center',justifyContent:'center',flexShrink:0,marginBottom:2},
  recBriefBubble: {flex:1,backgroundColor:'#fff',borderRadius:18,borderTopLeftRadius:4,padding:13,borderWidth:1.5,borderColor:C.blueL,shadowColor:C.blue,shadowOpacity:0.07,shadowRadius:12,shadowOffset:{width:0,height:2}},
  recBriefName:   {fontFamily:'Poppins_700Bold',fontSize:12,color:C.blue},
  recBriefMsg:    {fontFamily:'Poppins_400Regular',fontSize:14,color:C.ink,lineHeight:21},
  recBriefChipP:  {backgroundColor:C.blue,borderRadius:20,paddingVertical:7,paddingHorizontal:14,borderWidth:1,borderColor:C.blue},
  recBriefChipPTxt:{fontFamily:'Poppins_600SemiBold',fontSize:12,color:'#fff'},
  recBriefChip:   {backgroundColor:C.blueL,borderRadius:20,paddingVertical:7,paddingHorizontal:14,borderWidth:1,borderColor:C.blueB},
  recBriefChipTxt:{fontFamily:'Poppins_600SemiBold',fontSize:12,color:C.blue},
  // Search — matching shopping addBar
  searchWrap:     {backgroundColor:C.bg,paddingHorizontal:16,paddingTop:12,paddingBottom:0},
  searchBar:      {flexDirection:'row',alignItems:'center',gap:10,backgroundColor:C.card,borderWidth:1.5,borderColor:C.border,borderRadius:14,paddingHorizontal:14,paddingVertical:10},
  searchInput:    {flex:1,fontFamily:'Poppins_400Regular',fontSize:15,color:C.ink},
  // Filter chips — large
  filterChip:     {borderRadius:22,paddingVertical:8,paddingHorizontal:16,borderWidth:1.5,borderColor:'rgba(0,0,0,0.1)',backgroundColor:C.card},
  filterChipOn:   {backgroundColor:C.orange,borderColor:C.orange},
  filterChipTxt:  {fontFamily:'Poppins_600SemiBold',fontSize:13,color:C.ink2},
  slbl:           {fontFamily:'Poppins_700Bold',fontSize:10,color:C.ink3,letterSpacing:1.5,textTransform:'uppercase',paddingHorizontal:22,paddingTop:14,paddingBottom:6},
  // Day sections
  daySec:         {paddingTop:12,paddingBottom:4},
  dayHdr:         {flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:8},
  dayLbl:         {fontFamily:'Poppins_700Bold',fontSize:10,letterSpacing:1.2,color:C.ink3},
  cookRow:        {flexDirection:'row',alignItems:'center',gap:5},
  cookNameTxt:    {fontFamily:'Poppins_600SemiBold',fontSize:11,color:C.ink2},
  assignDayBtn:   {backgroundColor:C.orangeL,borderRadius:8,paddingHorizontal:9,paddingVertical:4,borderWidth:1,borderColor:C.orangeB},
  assignDayTxt:   {fontFamily:'Poppins_600SemiBold',fontSize:10,color:C.orange},
  // Meal card
  mealCard:       {backgroundColor:C.card,borderRadius:16,borderWidth:1.5,borderColor:C.border,marginHorizontal:16,marginBottom:8,padding:14},
  mealImg:        {width:'100%',height:120},
  mealBody:       {padding:12},
  badgeRow:       {flexDirection:'row',gap:5,marginBottom:7,flexWrap:'wrap'},
  badgeLib:       {backgroundColor:C.blueL,borderRadius:5,paddingHorizontal:7,paddingVertical:2},
  badgeLibTxt:    {fontFamily:'Poppins_700Bold',fontSize:9,color:C.blue},
  badgeFav:       {backgroundColor:'rgba(224,0,124,0.08)',borderRadius:5,paddingHorizontal:7,paddingVertical:2},
  badgeFavTxt:    {fontFamily:'Poppins_700Bold',fontSize:9,color:C.mag},
  badgeZ:         {backgroundColor:C.orangeL,borderRadius:5,paddingHorizontal:7,paddingVertical:2},
  badgeZTxt:      {fontFamily:'Poppins_700Bold',fontSize:9,color:C.orange},
  mealName:       {fontFamily:'Poppins_700Bold',fontSize:15,color:C.ink,marginBottom:3},
  mealMeta:       {fontFamily:'Poppins_400Regular',fontSize:11,color:C.ink2,marginBottom:6},
  mcCookRow:      {flexDirection:'row',alignItems:'center',gap:5,marginBottom:8},
  mcCookLbl:      {fontFamily:'Poppins_400Regular',fontSize:10,color:C.ink2},
  maBtn:          {flex:1,borderRadius:10,paddingVertical:9,alignItems:'center'},
  maBtnG:         {flex:1,borderRadius:10,paddingVertical:9,alignItems:'center',backgroundColor:'rgba(0,0,0,0.055)',borderWidth:1.5,borderColor:'rgba(0,0,0,0.09)'},
  // Empty card
  emptyCard:      {borderRadius:14,borderWidth:1.5,borderColor:'rgba(0,0,0,0.15)',borderStyle:'dashed',flexDirection:'row',alignItems:'center',padding:16,gap:12,marginHorizontal:16,marginBottom:8},
  emptyIcon:      {width:44,height:44,borderRadius:12,backgroundColor:C.orangeL,alignItems:'center',justifyContent:'center'},
  emptyLbl:       {fontFamily:'Poppins_600SemiBold',fontSize:14,color:C.ink3},
  emptySub:       {fontFamily:'Poppins_400Regular',fontSize:12,color:C.ink3,marginTop:2},
  emptyAdd:       {marginLeft:'auto',backgroundColor:C.orangeL,borderRadius:9,paddingHorizontal:12,paddingVertical:7,borderWidth:1.5,borderColor:C.orangeB},
  emptyAddTxt:    {fontFamily:'Poppins_700Bold',fontSize:12,color:C.orange},
  // Kit card
  kitCard:        {backgroundColor:C.card,borderRadius:14,borderWidth:1.5,borderColor:'rgba(0,150,100,0.25)',overflow:'hidden',marginHorizontal:16,marginBottom:8},
  kitTop:         {backgroundColor:C.kitL,padding:11,flexDirection:'row',alignItems:'center',gap:9},
  kitLabel:       {fontFamily:'Poppins_700Bold',fontSize:13,color:C.kit},
  kitBadge:       {backgroundColor:C.kit,borderRadius:4,paddingHorizontal:7,paddingVertical:2},
  kitBadgeTxt:    {fontFamily:'Poppins_700Bold',fontSize:9,color:'#fff'},
  // Recipe rows
  recipeRow:      {flexDirection:'row',alignItems:'center',backgroundColor:C.card,borderRadius:16,borderWidth:1.5,borderColor:C.border,marginHorizontal:16,marginBottom:8,overflow:'hidden'},
  recipeRowImg:   {width:80,height:80,backgroundColor:'#f8f5f0',overflow:'hidden'},
  recipeRowBody:  {flex:1,padding:11},
  recipeRowName:  {fontFamily:'Poppins_700Bold',fontSize:14,color:C.ink,marginBottom:3},
  recipeRowMeta:  {fontFamily:'Poppins_400Regular',fontSize:11,color:C.ink2,marginBottom:5},
  rtGr:           {backgroundColor:C.greenL,borderRadius:5,paddingHorizontal:6,paddingVertical:2},
  rtGrTxt:        {fontFamily:'Poppins_700Bold',fontSize:9,color:C.green},
  rtBl:           {backgroundColor:C.blueL,borderRadius:5,paddingHorizontal:6,paddingVertical:2},
  rtBlTxt:        {fontFamily:'Poppins_700Bold',fontSize:9,color:C.blue},
  rtPu:           {backgroundColor:C.purpleL,borderRadius:5,paddingHorizontal:6,paddingVertical:2},
  rtPuTxt:        {fontFamily:'Poppins_700Bold',fontSize:9,color:C.purple},
  recipeAdd:      {marginHorizontal:11,backgroundColor:C.orangeL,borderRadius:10,paddingHorizontal:12,paddingVertical:8,borderWidth:1.5,borderColor:C.orangeB},
  recipeAddTxt:   {fontFamily:'Poppins_700Bold',fontSize:12,color:C.orange},
  // Favourites
  saveCta:        {backgroundColor:'#2C2C2E',borderRadius:18,margin:16,marginBottom:6,padding:18,flexDirection:'row',alignItems:'center',gap:14},
  saveCtaIcon:    {width:52,height:52,borderRadius:14,backgroundColor:'rgba(255,255,255,0.12)',alignItems:'center',justifyContent:'center'},
  saveCtaTitle:   {fontFamily:'Poppins_700Bold',fontSize:16,color:'#fff',marginBottom:3},
  saveCtaSub:     {fontFamily:'Poppins_400Regular',fontSize:13,color:'rgba(255,255,255,0.65)'},
  saveCtaBtn:     {backgroundColor:'rgba(255,255,255,0.15)',borderWidth:1.5,borderColor:'rgba(255,255,255,0.25)',borderRadius:12,paddingHorizontal:14,paddingVertical:9},
  saveCtaBtnTxt:  {fontFamily:'Poppins_700Bold',fontSize:13,color:'#fff'},
  // Favourites toggle
  favToggleWrap:  {flexDirection:'row',marginHorizontal:16,marginTop:12,marginBottom:4,backgroundColor:'rgba(0,0,0,0.06)',borderRadius:14,padding:3,gap:2},
  favToggleBtn:   {flex:1,paddingVertical:9,borderRadius:11,alignItems:'center',flexDirection:'row',justifyContent:'center',gap:5},
  favToggleBtnOn: {backgroundColor:'#fff',shadowColor:'#000',shadowOpacity:0.08,shadowRadius:6,shadowOffset:{width:0,height:2}},
  favToggleTxt:   {fontFamily:'Poppins_600SemiBold',fontSize:12,color:C.ink3},
  favToggleTxtOn: {color:C.ink},
  favToggleBadge: {backgroundColor:C.orange,borderRadius:8,minWidth:16,height:16,alignItems:'center',justifyContent:'center',paddingHorizontal:4},
  favToggleBadgeTxt:{fontFamily:'Poppins_700Bold',fontSize:9,color:'#fff'},
  // Menu cards
  menuCard:       {backgroundColor:C.card,borderRadius:14,borderWidth:1.5,borderColor:C.border,marginHorizontal:16,marginBottom:8,overflow:'hidden'},
  menuCardTop:    {flexDirection:'row',alignItems:'center',gap:12,padding:14},
  menuIcon:       {width:44,height:44,borderRadius:12,backgroundColor:'rgba(0,180,120,0.1)',alignItems:'center',justifyContent:'center'},
  menuVenueName:  {fontFamily:'Poppins_700Bold',fontSize:15,color:C.ink,marginBottom:2},
  menuVenueType:  {fontFamily:'Poppins_400Regular',fontSize:12,color:C.ink2},
  menuItemRow:    {flexDirection:'row',alignItems:'flex-start',paddingHorizontal:16,paddingVertical:12,borderBottomWidth:1,borderBottomColor:'rgba(0,0,0,0.06)',gap:10},
  menuItemName:   {fontFamily:'Poppins_700Bold',fontSize:14,color:C.ink,marginBottom:2},
  menuItemDesc:   {fontFamily:'Poppins_400Regular',fontSize:12,color:C.ink2,lineHeight:18},
  menuItemPrice:  {fontFamily:'Poppins_700Bold',fontSize:13,color:C.ink2,flexShrink:0,marginTop:2},
  favCard:        {backgroundColor:C.card,borderRadius:16,borderWidth:1.5,borderColor:C.border,marginHorizontal:16,marginBottom:10,overflow:'hidden'},
  favImg:         {width:'100%',height:100},
  favBody:        {padding:12},
  favName:        {fontFamily:'Poppins_700Bold',fontSize:15,color:C.ink,marginBottom:3},
  favMeta:        {fontFamily:'Poppins_400Regular',fontSize:12,color:C.ink2,marginBottom:8},
  fadd:           {backgroundColor:C.orangeL,borderWidth:1.5,borderColor:C.orangeB,borderRadius:10,paddingHorizontal:12,paddingVertical:7},
  faddTxt:        {fontFamily:'Poppins_700Bold',fontSize:12,color:C.orange},
  // Modal shared
  modalHdr:       {flexDirection:'row',alignItems:'center',justifyContent:'space-between',padding:16,borderBottomWidth:1,borderBottomColor:'rgba(0,0,0,0.07)'},
  modalCancel:    {fontFamily:'Poppins_600SemiBold',fontSize:15,color:C.ink2},
  modalTitle:     {fontFamily:'Poppins_700Bold',fontSize:16,color:C.ink},
  modalSave:      {fontFamily:'Poppins_700Bold',fontSize:15,color:C.orange},
  modalSub:       {fontFamily:'Poppins_400Regular',fontSize:13,color:C.ink2},
  fieldLbl:       {fontFamily:'Poppins_700Bold',fontSize:10,letterSpacing:1,color:C.ink3,textTransform:'uppercase'},
  fieldInput:     {borderWidth:1.5,borderColor:C.border,borderRadius:12,paddingHorizontal:14,paddingVertical:12,fontSize:15,fontFamily:'Poppins_400Regular',color:C.ink,backgroundColor:C.card},
  // Member picker
  memberTile:     {flexDirection:'row',alignItems:'center',gap:10,padding:13,borderRadius:13,borderWidth:1.5,borderColor:'rgba(0,0,0,0.09)',backgroundColor:C.card,flex:1,minWidth:'45%'},
  memberAv:       {width:38,height:38,borderRadius:12,alignItems:'center',justifyContent:'center'},
  memberName:     {fontFamily:'Poppins_500Medium',fontSize:14,color:C.ink2,flex:1},
  // Job prompt
  jobPrompt:      {backgroundColor:C.card,borderRadius:16,borderWidth:1.5,borderColor:'rgba(155,127,212,0.25)',padding:16},
  jpTitle:        {fontFamily:'Poppins_700Bold',fontSize:14,color:C.ink,flex:1},
  jpBody:         {fontFamily:'Poppins_400Regular',fontSize:13,color:C.ink2,lineHeight:19,marginBottom:12},
  jpBtn:          {borderRadius:11,paddingVertical:10,paddingHorizontal:16,borderWidth:1.5,borderColor:'rgba(155,127,212,0.3)',backgroundColor:C.card,alignSelf:'flex-start'},
  jpBtnTxt:       {fontFamily:'Poppins_600SemiBold',fontSize:13,color:C.purple},
  ptsOpt:         {borderRadius:9,paddingVertical:7,paddingHorizontal:12,borderWidth:1.5,borderColor:'rgba(0,0,0,0.1)',backgroundColor:C.card},
  ptsOptOn:       {backgroundColor:C.purple,borderColor:C.purple},
  ptsOptTxt:      {fontFamily:'Poppins_700Bold',fontSize:12,color:C.ink2},
  customPtsInput: {borderWidth:1.5,borderColor:C.purple,borderRadius:9,paddingVertical:7,paddingHorizontal:12,fontSize:14,fontFamily:'Poppins_700Bold',color:C.ink,width:110,textAlign:'center'},
  // Add options
  addOpt:         {flexDirection:'row',alignItems:'center',gap:14,padding:15,borderRadius:16,borderWidth:1.5,borderColor:'rgba(0,0,0,0.09)',backgroundColor:C.card,marginBottom:10},
  addOptIcon:     {width:44,height:44,borderRadius:13,alignItems:'center',justifyContent:'center'},
  addOptTitle:    {fontFamily:'Poppins_700Bold',fontSize:14,color:C.ink,marginBottom:2},
  addOptSub:      {fontFamily:'Poppins_400Regular',fontSize:12,color:C.ink2},
  // Detail
  detailHdr:      {flexDirection:'row',alignItems:'center',gap:10,padding:12,paddingHorizontal:16,backgroundColor:C.card,borderBottomWidth:1,borderBottomColor:'rgba(0,0,0,0.07)'},
  detailBack:     {width:34,height:34,borderRadius:11,backgroundColor:C.blueL,alignItems:'center',justifyContent:'center'},
  detailImg:      {width:'100%',height:220},
  detailTitle:    {fontFamily:'DMSerifDisplay_400Regular',fontSize:26,color:C.ink,marginBottom:10},
  pillOr:         {backgroundColor:C.orangeL,borderRadius:20,paddingHorizontal:12,paddingVertical:5},
  pillOrTxt:      {fontFamily:'Poppins_600SemiBold',fontSize:12,color:C.orange},
  pillGr:         {backgroundColor:C.greenL,borderRadius:20,paddingHorizontal:12,paddingVertical:5},
  pillGrTxt:      {fontFamily:'Poppins_600SemiBold',fontSize:12,color:C.green},
  cookAssignBox:  {backgroundColor:C.card,borderRadius:14,borderWidth:1.5,borderColor:C.border,padding:14,marginBottom:14},
  assignBtn:      {backgroundColor:C.orangeL,borderRadius:9,paddingHorizontal:12,paddingVertical:6,borderWidth:1,borderColor:C.orangeB},
  assignBtnTxt:   {fontFamily:'Poppins_600SemiBold',fontSize:12,color:C.orange},
  pantryAllOk:    {backgroundColor:C.greenL,borderRadius:12,padding:12,flexDirection:'row',alignItems:'center',gap:10,marginBottom:14,borderWidth:1.5,borderColor:C.greenB},
  pantryMissing:  {backgroundColor:C.orangeL,borderRadius:12,padding:12,flexDirection:'row',alignItems:'center',gap:10,marginBottom:14,borderWidth:1.5,borderColor:C.orangeB},
  sectionHdr:     {fontFamily:'Poppins_700Bold',fontSize:11,letterSpacing:1,color:C.ink3,marginBottom:9,marginTop:6,textTransform:'uppercase'},
  ingRow:         {flexDirection:'row',alignItems:'center',gap:10,backgroundColor:C.card,borderRadius:13,borderWidth:1.5,borderColor:C.border,padding:11,marginBottom:7},
  ingName:        {fontFamily:'Poppins_400Regular',fontSize:14,color:C.ink},
  ingQty:         {fontFamily:'Poppins_400Regular',fontSize:12,color:C.ink2},
  ingOk:          {backgroundColor:C.greenL,borderRadius:6,paddingHorizontal:8,paddingVertical:3},
  ingOkTxt:       {fontFamily:'Poppins_700Bold',fontSize:10,color:C.green},
  ingMiss:        {backgroundColor:'rgba(255,140,0,0.1)',borderRadius:6,paddingHorizontal:8,paddingVertical:3},
  ingMissTxt:     {fontFamily:'Poppins_700Bold',fontSize:10,color:C.orange},
  ingAddBtn:      {backgroundColor:C.orangeL,borderRadius:8,paddingHorizontal:10,paddingVertical:4,borderWidth:1.5,borderColor:C.orangeB},
  ingAddTxt:      {fontFamily:'Poppins_700Bold',fontSize:11,color:C.orange},
  bigBtn:         {borderRadius:14,paddingVertical:14,alignItems:'center',marginBottom:9},
  bigBtnOr:       {backgroundColor:C.orange,borderRadius:14,paddingVertical:14,alignItems:'center',marginBottom:9},
  bigBtnTxt:      {fontFamily:'Poppins_700Bold',fontSize:15,color:'#fff'},
  bigBtnGhost:    {backgroundColor:'rgba(0,0,0,0.055)',borderWidth:1.5,borderColor:'rgba(0,0,0,0.09)',borderRadius:14,paddingVertical:14,alignItems:'center',marginBottom:9},
  bigBtnGhostTxt: {fontFamily:'Poppins_700Bold',fontSize:15,color:C.ink2},
  // ── Option A day header styles ─────────────────────────────────────
  dayRowA:        {flexDirection:'row',alignItems:'flex-start',gap:10,paddingHorizontal:16,paddingTop:12,marginBottom:8},
  dayAccentA:     {width:3,borderRadius:2,backgroundColor:C.orange,minHeight:52,flexShrink:0,marginTop:2},
  dayNameA:       {fontFamily:'Poppins_700Bold',fontSize:10,letterSpacing:1.4,color:C.ink3,textTransform:'uppercase',marginBottom:1},
  dayDateA:       {fontFamily:'DMSerifDisplay_400Regular',fontSize:22,color:C.ink,lineHeight:26,marginBottom:4},
  // ── Meal card v4 — no image ────────────────────────────────────────
  mealCardTop:    {flexDirection:'row',alignItems:'flex-start',gap:10,marginBottom:12},
  mealIconBox:    {width:44,height:44,borderRadius:12,backgroundColor:C.orangeL,alignItems:'center',justifyContent:'center',flexShrink:0},
  // ── Dessert slot ───────────────────────────────────────────────────
  dessertSlot:    {flexDirection:'row',alignItems:'center',gap:10,borderRadius:12,borderWidth:1.5,borderStyle:'dashed' as const,borderColor:'rgba(192,57,43,.25)',backgroundColor:'rgba(192,57,43,.04)',padding:10,marginHorizontal:16,marginBottom:8},
  dessertSlotFilled:{borderStyle:'solid' as const,borderColor:'rgba(192,57,43,.2)',backgroundColor:'rgba(192,57,43,.05)'},
  dessertTxt:     {flex:1,fontFamily:'Poppins_400Regular',fontSize:12,color:'#C0392B'},
  dessertMeta:    {fontFamily:'Poppins_400Regular',fontSize:11,color:'rgba(192,57,43,.65)'},
  dessertAdd:     {backgroundColor:'rgba(192,57,43,.1)',borderRadius:7,paddingHorizontal:9,paddingVertical:3,borderWidth:1,borderColor:'rgba(192,57,43,.2)'},
  dessertAddTxt:  {fontFamily:'Poppins_700Bold',fontSize:11,color:'#C0392B'},
  // ── Favourites list row — no image ────────────────────────────────
  favRow:         {backgroundColor:C.card,borderRadius:14,borderWidth:1.5,borderColor:C.border,marginHorizontal:16,marginBottom:8,padding:13,flexDirection:'row',alignItems:'center',gap:12},
  favRowIcon:     {width:44,height:44,borderRadius:12,alignItems:'center',justifyContent:'center',flexShrink:0},
  favRowInfo:     {flex:1},
  favRowName:     {fontFamily:'Poppins_700Bold',fontSize:14,color:C.ink,marginBottom:2},
  favRowMeta:     {fontFamily:'Poppins_400Regular',fontSize:11,color:C.ink2,marginBottom:0},
  favPlanBtn:     {backgroundColor:C.orangeL,borderWidth:1.5,borderColor:C.orangeB,borderRadius:10,paddingVertical:7,paddingHorizontal:12,flexShrink:0},
  favPlanBtnTxt:  {fontFamily:'Poppins_700Bold',fontSize:12,color:C.orange},
  tagChip:        {borderRadius:20,paddingVertical:6,paddingHorizontal:13,borderWidth:1.5,borderColor:'rgba(0,0,0,0.1)',backgroundColor:C.card},
  tagChipOn:      {backgroundColor:C.orange,borderColor:C.orange},
  tagChipTxt:     {fontFamily:'Poppins_600SemiBold',fontSize:12,color:C.ink2},
  notesBox:       {backgroundColor:'rgba(0,0,0,0.03)',borderRadius:12,padding:13,borderWidth:1,borderColor:'rgba(0,0,0,0.07)'},
  notesTxt:       {fontFamily:'Poppins_400Regular',fontSize:13,color:C.ink2,lineHeight:20},
});
