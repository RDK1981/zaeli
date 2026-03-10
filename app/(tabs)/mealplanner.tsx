import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator, Modal, ScrollView, StyleSheet,
    Text, TextInput, TouchableOpacity, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { SwipeToDelete } from '../components/SwipeToDelete';

const DUMMY_FAMILY_ID = '00000000-0000-0000-0000-000000000001';

const C = {
  bg:          '#F7F7F7',
  card:        '#FFFFFF',
  card2:       '#F0F0F0',
  border:      '#E0E0E0',
  text:        '#0A0A0A',
  text2:       'rgba(0,0,0,0.50)',
  text3:       'rgba(0,0,0,0.28)',
  accent:      '#FF8C00',
  accentLight: 'rgba(255,140,0,0.10)',
  accentBorder:'rgba(255,140,0,0.28)',
  accentBg:    '#FFF5EB',
  yellow:      '#FFE500',
  yellowDark:  '#B8A400',
  yellowLight: 'rgba(255,229,0,0.12)',
  yellowBorder:'rgba(255,229,0,0.40)',
  yellowBg:    '#FFF9E0',
  green:       '#00C97A',
  greenL:      'rgba(0,201,122,0.10)',
  greenB:      'rgba(0,201,122,0.28)',
  magenta:     '#E0007C',
  magentaL:    'rgba(224,0,124,0.10)',
  blue:        '#0057FF',
  blueL:       'rgba(0,87,255,0.08)',
  purple:      '#9B7FD4',
  purpleL:     'rgba(155,127,212,0.10)',
  purpleB:     'rgba(155,127,212,0.28)',
};

type SubView = 'week' | 'library';
type MealType = 'breakfast' | 'lunch' | 'dinner';
type PlannedMeal = {
  id: string;
  day_key: string;
  meal_type: MealType;
  meal_name: string;
  emoji: string;
  prep_mins: number;
  tags: string[];
  ingredients?: Ingredient[];
  notes?: string;
};
type Ingredient = { name: string; emoji: string; in_pantry: boolean };
type LibraryMeal = {
  id: string;
  name: string;
  emoji: string;
  prep_mins: number;
  tags: string[];
  favourite: boolean;
  ingredients: Ingredient[];
  last_cooked?: string;
};

// ── HELPERS ───────────────────────────────────────────────────────────
const DAYS_SHORT  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTHS_SHORT= ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function pad(n:number){ return n<10?'0'+n:''+n; }
function dayKey(d:Date){ return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
function addDays(d:Date,n:number){ const r=new Date(d); r.setDate(r.getDate()+n); return r; }

// ── DUMMY DATA ────────────────────────────────────────────────────────
const today     = new Date();
const todayKey  = dayKey(today);
const tomorrowKey = dayKey(addDays(today,1));

const DUMMY_MEALS: PlannedMeal[] = [
  {
    id:'m1', day_key:todayKey, meal_type:'lunch',
    meal_name:'Chicken Caesar Wrap', emoji:'🥗', prep_mins:5,
    tags:['quick','leftovers'],
    ingredients:[
      {name:'Chicken (leftover)',emoji:'🍗',in_pantry:true},
      {name:'Wraps',            emoji:'🫓',in_pantry:true},
      {name:'Cos lettuce',      emoji:'🥬',in_pantry:false},
    ],
  },
  {
    id:'m2', day_key:todayKey, meal_type:'dinner',
    meal_name:'Pasta Bake', emoji:'🍝', prep_mins:25,
    tags:['kids','popular'],
    ingredients:[
      {name:'Penne pasta 500g',  emoji:'🍝',in_pantry:true},
      {name:'Chicken thighs 500g',emoji:'🍗',in_pantry:false},
      {name:'Tomato sauce 2 cans',emoji:'🥫',in_pantry:true},
      {name:'Mozzarella 200g',   emoji:'🧀',in_pantry:false},
      {name:'Onion 1 large',     emoji:'🧅',in_pantry:true},
    ],
  },
  {
    id:'m3', day_key:tomorrowKey, meal_type:'dinner',
    meal_name:'Honey Soy Chicken', emoji:'🍗', prep_mins:25,
    tags:['kids','quick'],
    ingredients:[
      {name:'Chicken thighs 1kg',emoji:'🍗',in_pantry:false},
      {name:'Soy sauce',         emoji:'🫙',in_pantry:true},
      {name:'Honey',             emoji:'🍯',in_pantry:true},
      {name:'Garlic',            emoji:'🧄',in_pantry:true},
      {name:'Rice 2 cups',       emoji:'🍚',in_pantry:true},
    ],
  },
];

const LIBRARY: LibraryMeal[] = [
  {id:'l1',name:'Pasta Bolognese',    emoji:'🍝',prep_mins:35,favourite:true, tags:['popular','kids'], last_cooked:'Mon', ingredients:[{name:'Mince 500g',emoji:'🥩',in_pantry:false},{name:'Pasta',emoji:'🍝',in_pantry:true},{name:'Tomato sauce',emoji:'🥫',in_pantry:true},{name:'Onion',emoji:'🧅',in_pantry:true}]},
  {id:'l2',name:'Honey Soy Chicken',  emoji:'🍗',prep_mins:25,favourite:true, tags:['kids','quick'],  last_cooked:'3 days ago', ingredients:[{name:'Chicken thighs',emoji:'🍗',in_pantry:false},{name:'Soy sauce',emoji:'🫙',in_pantry:true},{name:'Honey',emoji:'🍯',in_pantry:true}]},
  {id:'l3',name:'Taco Tuesday',       emoji:'🌮',prep_mins:20,favourite:false,tags:['family','quick'], ingredients:[{name:'Mince 400g',emoji:'🥩',in_pantry:false},{name:'Taco shells',emoji:'🌮',in_pantry:false},{name:'Cheese',emoji:'🧀',in_pantry:true}]},
  {id:'l4',name:'Slow Cooker Stew',   emoji:'🥘',prep_mins:480,favourite:false,tags:['batch','hearty'],ingredients:[{name:'Beef chuck 1kg',emoji:'🥩',in_pantry:false},{name:'Potato',emoji:'🥔',in_pantry:true},{name:'Carrot',emoji:'🥕',in_pantry:true}]},
  {id:'l5',name:'Scrambled Eggs & Toast',emoji:'🍳',prep_mins:8,favourite:false,tags:['breakfast','quick'],ingredients:[{name:'Eggs 4',emoji:'🥚',in_pantry:true},{name:'Bread',emoji:'🍞',in_pantry:false},{name:'Butter',emoji:'🧈',in_pantry:true}]},
  {id:'l6',name:'Chicken Stir-Fry',   emoji:'🥡',prep_mins:18,favourite:false,tags:['quick','healthy'],ingredients:[{name:'Chicken breast',emoji:'🍗',in_pantry:false},{name:'Baby spinach',emoji:'🥬',in_pantry:true},{name:'Soy sauce',emoji:'🫙',in_pantry:true},{name:'Rice',emoji:'🍚',in_pantry:true}]},
];

const TAG_CONFIG: Record<string,{label:string;bg:string;color:string}> = {
  quick:     {label:'⚡ Quick',  bg:C.greenL, color:C.green},
  leftovers: {label:'♻️ Leftovers', bg:C.accentLight, color:C.accent},
  kids:      {label:'👧 Kids love', bg:C.purpleL, color:C.purple},
  popular:   {label:'⭐ Popular',   bg:C.yellowLight, color:C.yellowDark},
  family:    {label:'👨‍👩‍👧 Family',  bg:C.blueL, color:C.blue},
  batch:     {label:'🍱 Batch cook',bg:C.greenL, color:C.green},
  hearty:    {label:'💪 Hearty',   bg:C.accentLight, color:C.accent},
  breakfast: {label:'☀️ Breakfast', bg:C.yellowLight, color:C.yellowDark},
  healthy:   {label:'🥗 Healthy',  bg:C.greenL, color:C.green},
};

const MEAL_LABEL: Record<MealType,string> = { breakfast:'Breakfast', lunch:'Lunch', dinner:'Dinner' };

// ── MEAL DETAIL MODAL ─────────────────────────────────────────────────
function MealDetailModal({ meal, visible, onClose, onAddToShopping }:
  { meal:PlannedMeal|null; visible:boolean; onClose:()=>void; onAddToShopping:(items:Ingredient[])=>void }) {
  if (!meal) return null;
  const missing   = meal.ingredients?.filter(i => !i.in_pantry) || [];
  const inPantry  = meal.ingredients?.filter(i =>  i.in_pantry) || [];
  const dinnerHour= 18;
  const prepStart = dinnerHour - Math.ceil(meal.prep_mins / 60);
  const prepMins  = dinnerHour * 60 - meal.prep_mins;
  const startH    = Math.floor(prepMins / 60);
  const startM    = prepMins % 60;
  const prepTime  = `${startH}:${pad(startM)} PM`;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={{flex:1,backgroundColor:C.bg}}>
        <View style={dm.header}>
          <TouchableOpacity onPress={onClose}><Text style={dm.close}>← Back</Text></TouchableOpacity>
          <Text style={dm.title}>{meal.emoji} {meal.meal_name}</Text>
          <View style={{width:60}} />
        </View>
        <ScrollView contentContainerStyle={{padding:20,paddingBottom:60}} showsVerticalScrollIndicator={false}>

          {/* Tags */}
          <View style={{flexDirection:'row',flexWrap:'wrap',gap:6,marginBottom:18}}>
            {meal.tags.map(t=>{
              const cfg=TAG_CONFIG[t]||{label:t,bg:C.card2,color:C.text2};
              return <View key={t} style={[dm.tag,{backgroundColor:cfg.bg}]}><Text style={[dm.tagTxt,{color:cfg.color}]}>{cfg.label}</Text></View>;
            })}
            <View style={[dm.tag,{backgroundColor:C.blueL}]}><Text style={[dm.tagTxt,{color:C.blue}]}>⏱ {meal.prep_mins} min</Text></View>
          </View>

          {/* Prep timer */}
          {meal.meal_type==='dinner' && (
            <View style={dm.prepBanner}>
              <Text style={{fontSize:20}}>⏰</Text>
              <View style={{flex:1}}>
                <Text style={dm.prepBannerTxt}>Dinner at 6 PM — start prep at <Text style={{fontWeight:'700'}}>{prepTime}</Text></Text>
              </View>
              <TouchableOpacity style={dm.prepSetBtn}><Text style={dm.prepSetTxt}>Set Reminder</Text></TouchableOpacity>
            </View>
          )}

          {/* Ingredients */}
          <Text style={dm.sectionLbl}>Ingredients · Serves 4</Text>
          <View style={dm.ingredientCard}>
            {meal.ingredients?.map((ing,i)=>(
              <View key={i} style={[dm.ingRow,i===meal.ingredients!.length-1&&{borderBottomWidth:0}]}>
                <Text style={{fontSize:14,flex:1}}>{ing.emoji} {ing.name}</Text>
                <View style={[dm.ingBadge,{backgroundColor:ing.in_pantry?C.greenL:C.accentLight}]}>
                  <Text style={[dm.ingBadgeTxt,{color:ing.in_pantry?C.green:C.accent}]}>
                    {ing.in_pantry?'In pantry':'Need to buy'}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* Add missing to shopping */}
          {missing.length > 0 && (
            <View style={dm.shopBox}>
              <Text style={dm.shopBoxTitle}>✦ {missing.length} item{missing.length!==1?'s':''} missing from pantry</Text>
              <Text style={dm.shopBoxSub}>{missing.map(i=>i.name).join(', ')} will be added to your shopping list.</Text>
              <TouchableOpacity style={dm.shopBoxBtn} onPress={()=>{onAddToShopping(missing);onClose();}}>
                <Text style={dm.shopBoxBtnTxt}>🛒 Add Missing to Shopping List</Text>
              </TouchableOpacity>
            </View>
          )}
          {missing.length === 0 && (
            <View style={[dm.shopBox,{backgroundColor:C.greenL,borderColor:C.greenB}]}>
              <Text style={{fontSize:14,fontWeight:'700',color:C.green,fontFamily:'Poppins_700Bold'}}>✅ All ingredients in pantry!</Text>
              <Text style={{fontSize:13,color:C.green,marginTop:4}}>You're all set for this meal.</Text>
            </View>
          )}

          {/* Kids chore assignment */}
          <Text style={dm.sectionLbl}>👧 Assign Prep Tasks</Text>
          <View style={dm.choreBox}>
            <Text style={dm.choreBoxSub}>Let kids help and earn reward points!</Text>
            <View style={{flexDirection:'row',gap:10,marginTop:12}}>
              <TouchableOpacity style={dm.choreBtn}>
                <Text style={dm.choreBtnTxt}>🥣 Set Table (5pts)</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[dm.choreBtn,dm.choreBtnSec]}>
                <Text style={[dm.choreBtnTxt,{color:C.purple}]}>🧹 Clean Up (10pts)</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ── ADD MEAL MODAL ────────────────────────────────────────────────────
function AddMealModal({ visible, onClose, onAdd, dayKey: targetDay, mealType }:
  { visible:boolean; onClose:()=>void; onAdd:(meal:PlannedMeal)=>void; dayKey:string; mealType:MealType }) {
  const [name,setName]     = useState('');
  const [emoji,setEmoji]   = useState('🍽️');
  const [prep,setPrep]     = useState('20');
  const EMOJIS = ['🍝','🍗','🥗','🌮','🥘','🍳','🍞','🥡','🍲','🍛','🥙','🫕'];

  const save = () => {
    if (!name.trim()) return;
    onAdd({ id:Date.now().toString(), day_key:targetDay, meal_type:mealType,
      meal_name:name.trim(), emoji, prep_mins:parseInt(prep)||20, tags:[], ingredients:[] });
    setName(''); setEmoji('🍽️'); setPrep('20');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={{flex:1,backgroundColor:C.bg}}>
        <View style={dm.header}>
          <TouchableOpacity onPress={onClose}><Text style={dm.close}>Cancel</Text></TouchableOpacity>
          <Text style={dm.title}>Add Meal</Text>
          <TouchableOpacity onPress={save} disabled={!name.trim()}>
            <Text style={[{fontSize:17,fontWeight:'700',color:C.accent,fontFamily:'Poppins_700Bold'},!name.trim()&&{opacity:0.3}]}>Save</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={{padding:22}} keyboardShouldPersistTaps="handled">
          <Text style={dm.sectionLbl}>Meal Name</Text>
          <TextInput style={dm.input} value={name} onChangeText={setName} placeholder="e.g. Pasta Bolognese" placeholderTextColor={C.text3} autoFocus />
          <Text style={dm.sectionLbl}>Prep Time (minutes)</Text>
          <TextInput style={dm.input} value={prep} onChangeText={setPrep} keyboardType="number-pad" placeholder="20" placeholderTextColor={C.text3} />
          <Text style={dm.sectionLbl}>Pick an Emoji</Text>
          <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>
            {EMOJIS.map(e=>(
              <TouchableOpacity key={e} style={[{width:46,height:46,borderRadius:13,backgroundColor:C.card,borderWidth:1.5,borderColor:C.border,alignItems:'center',justifyContent:'center'},emoji===e&&{backgroundColor:C.accentLight,borderColor:C.accentBorder}]}
                onPress={()=>setEmoji(e)}>
                <Text style={{fontSize:22}}>{e}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {/* Quick add from library */}
          <Text style={[dm.sectionLbl,{marginTop:24}]}>Or choose from library</Text>
          {LIBRARY.slice(0,4).map(meal=>(
            <TouchableOpacity key={meal.id} style={dm.libQuickRow}
              onPress={()=>{onAdd({id:Date.now().toString(),day_key:targetDay,meal_type:mealType,meal_name:meal.name,emoji:meal.emoji,prep_mins:meal.prep_mins,tags:meal.tags,ingredients:meal.ingredients});onClose();}}>
              <Text style={{fontSize:26,width:40,textAlign:'center'}}>{meal.emoji}</Text>
              <View style={{flex:1}}>
                <Text style={{fontSize:15,fontWeight:'600',color:C.text}}>{meal.name}</Text>
                <Text style={{fontSize:12,color:C.text3}}>⏱ {meal.prep_mins} min</Text>
              </View>
              <Text style={{fontSize:20,color:C.text3}}>+</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ── WEEK VIEW ─────────────────────────────────────────────────────────
function WeekView({ meals, onMealTap, onAddMeal, onRemoveMeal, aiInsight, aiLoading }:
  { meals:PlannedMeal[]; onMealTap:(m:PlannedMeal)=>void; onAddMeal:(day:string,type:MealType)=>void; onRemoveMeal:(id:string)=>void; aiInsight:string; aiLoading:boolean }) {

  const [selectedDayKey, setSelectedDayKey] = useState(todayKey);
  const weekDays = Array.from({length:7},(_,i)=>addDays(today,i-today.getDay()===0?0:-(today.getDay()-1)+i));

  // normalise to Mon start
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay()+6)%7));
  const strip  = Array.from({length:7},(_,i)=>addDays(monday,i));

  const plannedDays    = [...new Set(meals.map(m=>m.day_key))];
  const selDay         = strip.find(d=>dayKey(d)===selectedDayKey) || strip[0];
  const dayMeals       = meals.filter(m=>m.day_key===selectedDayKey);
  const MEAL_TYPES: MealType[] = ['breakfast','lunch','dinner'];

  const busyDays = [dayKey(strip[1]), dayKey(strip[3])]; // Tue + Thu as examples
  const isBusy   = busyDays.includes(selectedDayKey);

  const plannedCount = plannedDays.length;

  return (
    <ScrollView style={{flex:1}} showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom:40}}>

      {/* Quick plan hero */}
      <View style={s.qpHero}>
        <View style={s.qpHeroGlow} />
        <Text style={s.qpHeroLbl}>THIS WEEK</Text>
        <Text style={s.qpHeroTitle}>{plannedCount} of 7 days{'\n'}planned 🍽️</Text>
        <View style={{flexDirection:'row',gap:8}}>
          <TouchableOpacity style={s.qpBtnPrim}><Text style={s.qpBtnPrimTxt}>⚡ Quick Plan Week</Text></TouchableOpacity>
          <TouchableOpacity style={s.qpBtnSec}><Text style={s.qpBtnSecTxt}>+ Add Day</Text></TouchableOpacity>
        </View>
      </View>

      {/* Week strip */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{flexGrow:0}} contentContainerStyle={{paddingHorizontal:16,paddingVertical:12,gap:5}}>
        {strip.map(d=>{
          const k      = dayKey(d);
          const isSel  = k === selectedDayKey;
          const isToday= k === todayKey;
          const hasMeals= plannedDays.includes(k);
          return (
            <TouchableOpacity key={k} style={[s.wDay, isSel&&s.wDayOn]} onPress={()=>setSelectedDayKey(k)}>
              <Text style={[s.wDayLbl, isSel&&s.wDayLblOn]}>{DAYS_SHORT[(d.getDay()+7)%7].toUpperCase()}</Text>
              <View style={[s.wDayNum, isToday&&!isSel&&s.wDayNumToday, isSel&&s.wDayNumOn]}>
                <Text style={[s.wDayNumTxt, isToday&&!isSel&&s.wDayNumTodayTxt, isSel&&s.wDayNumOnTxt]}>{d.getDate()}</Text>
              </View>
              <View style={{height:5,justifyContent:'center'}}>
                {hasMeals && <View style={[s.wDot, isSel&&s.wDotOn]} />}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* AI bar */}
      <View style={s.aiBar}>
        <View style={s.aiBarTop}>
          <View style={s.aiOrb}><Text style={{fontSize:16}}>🍽️</Text></View>
          <Text style={s.aiBarTitle}>MEAL AI</Text>
        </View>
        {aiLoading
          ? <ActivityIndicator size="small" color={C.accent} style={{alignSelf:'flex-start',marginBottom:8}} />
          : <Text style={s.aiInsight}>{aiInsight}</Text>
        }
        <View style={s.aiBarBtns}>
          <TouchableOpacity style={s.aiBtnPrim}><Text style={s.aiBtnPrimTxt}>See Quick Meals</Text></TouchableOpacity>
          <TouchableOpacity style={s.aiBtnSec}><Text style={s.aiBtnSecTxt}>Ignore</Text></TouchableOpacity>
        </View>
      </View>

      {/* Selected day meal slots */}
      <View style={s.daySection}>
        <View style={s.dayHdr}>
          <View style={{flexDirection:'row',alignItems:'center',gap:10}}>
            <Text style={s.dayName}>{DAYS_SHORT[(selDay.getDay()+7)%7]} {selDay.getDate()} {MONTHS_SHORT[selDay.getMonth()]}</Text>
            {isBusy && <View style={s.busyBadge}><Text style={s.busyBadgeTxt}>⚽ Busy</Text></View>}
          </View>
          <TouchableOpacity style={s.aiSuggestBtn}><Text style={s.aiSuggestTxt}>✦ AI Suggest</Text></TouchableOpacity>
        </View>

        {MEAL_TYPES.map(type=>{
          const meal = dayMeals.find(m=>m.meal_type===type);
          return (
            <View key={type} style={s.mealSlot}>
              <Text style={s.mealSlotLbl}>{MEAL_LABEL[type]}</Text>
              {meal ? (
                <SwipeToDelete
                  onDelete={() => onRemoveMeal(meal.id)}
                  accentColour={C.accent}
                  deleteLabel="Remove"
                  deleteEmoji="🗑️">
                  <TouchableOpacity style={[s.mealCard, type==='dinner'&&s.mealCardHighlight]} onPress={()=>onMealTap(meal)} activeOpacity={0.8}>
                    <Text style={{fontSize:30,flexShrink:0}}>{meal.emoji}</Text>
                    <View style={{flex:1,minWidth:0}}>
                      <Text style={s.mealName} numberOfLines={1}>{meal.meal_name}</Text>
                      <Text style={s.mealSub}>⏱ {meal.prep_mins} min</Text>
                      <View style={{flexDirection:'row',flexWrap:'wrap',gap:5,marginTop:5}}>
                        {meal.tags.slice(0,2).map(t=>{
                          const cfg=TAG_CONFIG[t]||{label:t,bg:C.card2,color:C.text2};
                          return <View key={t} style={[s.mealTag,{backgroundColor:cfg.bg}]}><Text style={[s.mealTagTxt,{color:cfg.color}]}>{cfg.label}</Text></View>;
                        })}
                      </View>
                    </View>
                    <View style={{gap:6}}>
                      <TouchableOpacity style={[s.mealActBtn,{backgroundColor:C.yellowLight}]} onPress={()=>onMealTap(meal)}><Text style={{fontSize:14}}>🛒</Text></TouchableOpacity>
                      <TouchableOpacity style={[s.mealActBtn,{backgroundColor:C.card2}]}><Text style={{fontSize:14}}>✏️</Text></TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                </SwipeToDelete>
              ) : (
                <TouchableOpacity style={s.mealEmpty} onPress={()=>onAddMeal(selectedDayKey,type)} activeOpacity={0.8}>
                  <View style={s.mealEmptyIcon}><Text style={{fontSize:16}}>+</Text></View>
                  <View>
                    <Text style={s.mealEmptyTxt}>Nothing planned</Text>
                    <Text style={s.mealEmptyAi}>✦ Tap to add or let AI suggest</Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>
          );
        })}

        {/* Prep reminder if dinner is planned */}
        {dayMeals.find(m=>m.meal_type==='dinner') && (
          <View style={s.prepBanner}>
            <Text style={{fontSize:16}}>⏰</Text>
            <Text style={s.prepBannerTxt}>
              {dayMeals.find(m=>m.meal_type==='dinner')!.meal_name} at 6 PM — start prep at{' '}
              <Text style={{fontWeight:'700'}}>
                {(()=>{const p=dayMeals.find(m=>m.meal_type==='dinner')!.prep_mins; const h=Math.floor((18*60-p)/60); const m=(18*60-p)%60; return `${h}:${pad(m)} PM`;})()}
              </Text>
            </Text>
            <TouchableOpacity><Text style={s.prepSet}>Set ›</Text></TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

// ── LIBRARY VIEW ──────────────────────────────────────────────────────
function LibraryView({ onPlanMeal }:{ onPlanMeal:(m:LibraryMeal)=>void }) {
  const [search,  setSearch]  = useState('');
  const [activeTag,setActiveTag]= useState<string|null>(null);
  const FILTER_TAGS = [{k:null,l:'All'},{k:'quick',l:'⚡ Quick'},{k:'kids',l:'👧 Kids'},{k:'healthy',l:'🥗 Healthy'},{k:'batch',l:'🍱 Batch'}];

  const filtered = LIBRARY.filter(m => {
    const matchSearch = !search || m.name.toLowerCase().includes(search.toLowerCase());
    const matchTag    = !activeTag || m.tags.includes(activeTag);
    return matchSearch && matchTag;
  });

  const pantryMatches = LIBRARY.filter(m =>
    m.ingredients.filter(i=>i.in_pantry).length >= m.ingredients.length * 0.6
  );

  return (
    <ScrollView style={{flex:1}} showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom:40}}>
      {/* Pantry-powered AI suggestion */}
      <View style={s.aiBar}>
        <View style={s.aiBarTop}>
          <View style={s.aiOrb}><Text style={{fontSize:16}}>🛒</Text></View>
          <Text style={s.aiBarTitle}>FROM YOUR PANTRY</Text>
        </View>
        <Text style={s.aiInsight}>You have <Text style={{fontWeight:'700'}}>pasta, cream & mushrooms</Text> — {pantryMatches.length} meals you can make tonight</Text>
        <View style={s.aiBarBtns}>
          <TouchableOpacity style={s.aiBtnPrim}><Text style={s.aiBtnPrimTxt}>Show Recipes</Text></TouchableOpacity>
          <TouchableOpacity style={s.aiBtnSec}><Text style={s.aiBtnSecTxt}>Later</Text></TouchableOpacity>
        </View>
      </View>

      {/* Search */}
      <TextInput style={s.searchBar} value={search} onChangeText={setSearch}
        placeholder="🔍  Search meals…" placeholderTextColor={C.text3} />

      {/* Filter tags */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{flexGrow:0}} contentContainerStyle={{paddingHorizontal:16,paddingBottom:12,gap:8}}>
        {FILTER_TAGS.map(t=>(
          <TouchableOpacity key={t.l} style={[s.libTag, activeTag===t.k&&s.libTagOn]} onPress={()=>setActiveTag(t.k)}>
            <Text style={[s.libTagTxt, activeTag===t.k&&s.libTagTxtOn]}>{t.l}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Meal cards */}
      {filtered.map(meal=>(
        <SwipeToDelete key={meal.id} onDelete={() => {/* library delete — future */}}
          accentColour={C.accent} deleteLabel="Remove" deleteEmoji="🗑️"
          style={{marginHorizontal:16, marginBottom:10}}>
          <TouchableOpacity style={[s.libCard,{marginHorizontal:0,marginBottom:0}]} activeOpacity={0.8}>
            <View style={s.libEmoji}><Text style={{fontSize:28}}>{meal.emoji}</Text></View>
            <View style={{flex:1}}>
              <Text style={s.libName}>{meal.name}</Text>
              <Text style={s.libMeta}>
                ⏱ {meal.prep_mins<60?`${meal.prep_mins} min`:`${Math.round(meal.prep_mins/60)}h`}
                {meal.last_cooked?`  ·  Last: ${meal.last_cooked}`:''}
              </Text>
              <View style={{flexDirection:'row',gap:4,marginTop:5,flexWrap:'wrap'}}>
                {meal.tags.slice(0,2).map(t=>{
                  const cfg=TAG_CONFIG[t]||{label:t,bg:C.card2,color:C.text2};
                  return <View key={t} style={[s.mealTag,{backgroundColor:cfg.bg}]}><Text style={[s.mealTagTxt,{color:cfg.color}]}>{cfg.label}</Text></View>;
                })}
              </View>
            </View>
            <Text style={{fontSize:18,marginRight:4}}>{meal.favourite?'⭐':'☆'}</Text>
            <TouchableOpacity style={s.libAddBtn} onPress={()=>onPlanMeal(meal)}>
              <Text style={s.libAddBtnTxt}>+ Plan</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </SwipeToDelete>
      ))}
    </ScrollView>
  );
}

// ══════════════════════════════════════════════════════════════════════
// MAIN MEAL PLANNER SCREEN
// ══════════════════════════════════════════════════════════════════════
export default function MealPlannerScreen() {
  const [subView, setSubView]         = useState<SubView>('week');
  const [meals, setMeals]             = useState<PlannedMeal[]>(DUMMY_MEALS);
  const [detailMeal, setDetailMeal]   = useState<PlannedMeal|null>(null);
  const [addDay, setAddDay]           = useState('');
  const [addType, setAddType]         = useState<MealType>('dinner');
  const [addVisible, setAddVisible]   = useState(false);
  const [aiInsight, setAiInsight]     = useState('');
  const [aiLoading, setAiLoading]     = useState(false);

  useEffect(()=>{ loadMeals(); generateInsight(); },[]);

  const loadMeals = async () => {
    const { data } = await supabase.from('meal_plans').select('*').eq('family_id',DUMMY_FAMILY_ID);
    if (data && data.length > 0) setMeals(data as PlannedMeal[]);
  };

  const generateInsight = async () => {
    setAiLoading(true);
    const hour = new Date().getHours();
    // Time-aware meal AI insight
    if (hour < 12) {
      setAiInsight("📅 Today looks busy — Pasta Bake is on for tonight. Start prep at 5:20 PM.");
    } else if (hour < 17) {
      setAiInsight("🥬 Spinach expires today — perfect for a stir-fry tonight. Want the recipe?");
    } else {
      setAiInsight("⏰ It's nearly dinner time! Pasta Bake needs 25 min — get started soon.");
    }
    setAiLoading(false);
  };

  const openAddMeal = (day:string, type:MealType) => {
    setAddDay(day); setAddType(type); setAddVisible(true);
  };

  const addMeal = async (meal:PlannedMeal) => {
    setMeals(p => [...p, meal]);
    await supabase.from('meal_plans').insert({
      family_id: DUMMY_FAMILY_ID,
      day_key: meal.day_key,
      meal_type: meal.meal_type,
      meal_name: meal.meal_name,
      emoji: meal.emoji,
      prep_mins: meal.prep_mins,
    });
  };

  const removeMeal = async (id:string) => {
    setMeals(p => p.filter(m => m.id !== id));
    await supabase.from('meal_plans').delete().eq('id', id);
  };

  const planFromLibrary = (libMeal:LibraryMeal) => {
    // Default to tonight's dinner if nothing planned
    const plannedTonight = meals.find(m=>m.day_key===todayKey&&m.meal_type==='dinner');
    const targetDay  = plannedTonight ? dayKey(addDays(today,1)) : todayKey;
    const targetType : MealType = 'dinner';
    const newMeal: PlannedMeal = {
      id: Date.now().toString(), day_key:targetDay, meal_type:targetType,
      meal_name:libMeal.name, emoji:libMeal.emoji, prep_mins:libMeal.prep_mins,
      tags:libMeal.tags, ingredients:libMeal.ingredients,
    };
    addMeal(newMeal);
    setSubView('week');
  };

  const addMissingToShopping = async (ingredients:Ingredient[]) => {
    for (const ing of ingredients) {
      await supabase.from('shopping_items').insert({ family_id:DUMMY_FAMILY_ID, name:ing.name, checked:false, meal_source:'Meal Plan' });
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>Meals</Text>
        <View style={{flexDirection:'row',gap:8,marginTop:6}}>
          <TouchableOpacity style={[s.headerBtn,subView==='week'&&{backgroundColor:C.accentLight,borderColor:C.accentBorder}]} onPress={()=>setSubView('week')}>
            <Text style={[s.headerBtnTxt,subView==='week'&&{color:C.accent}]}>📅 Week</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.headerBtn,subView==='library'&&{backgroundColor:C.accentLight,borderColor:C.accentBorder}]} onPress={()=>setSubView('library')}>
            <Text style={[s.headerBtnTxt,subView==='library'&&{color:C.accent}]}>📚 Library</Text>
          </TouchableOpacity>
        </View>
      </View>

      {subView==='week' && (
        <WeekView
          meals={meals}
          onMealTap={setDetailMeal}
          onAddMeal={openAddMeal}
          onRemoveMeal={removeMeal}
          aiInsight={aiInsight}
          aiLoading={aiLoading}
        />
      )}

      {subView==='library' && (
        <LibraryView onPlanMeal={planFromLibrary} />
      )}

      <MealDetailModal
        meal={detailMeal}
        visible={!!detailMeal}
        onClose={()=>setDetailMeal(null)}
        onAddToShopping={addMissingToShopping}
      />

      <AddMealModal
        visible={addVisible}
        onClose={()=>setAddVisible(false)}
        onAdd={addMeal}
        dayKey={addDay}
        mealType={addType}
      />
    </SafeAreaView>
  );
}

// ── STYLES ────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:   { flex:1, backgroundColor:C.bg },
  header: { flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start', paddingHorizontal:22, paddingTop:16, paddingBottom:10 },
  title:  { fontFamily:'DMSerifDisplay_400Regular', fontSize:34, color:C.text },
  headerBtn:    { backgroundColor:C.card, borderWidth:1.5, borderColor:C.border, borderRadius:22, paddingHorizontal:14, paddingVertical:9 },
  headerBtnTxt: { fontSize:13, fontWeight:'700', color:C.text2, fontFamily:'Poppins_700Bold' },

  // quick plan hero
  qpHero:      { margin:16, marginTop:4, borderRadius:22, padding:22, backgroundColor:C.accent, overflow:'hidden', position:'relative' },
  qpHeroGlow:  { position:'absolute', top:-40, right:-40, width:140, height:140, borderRadius:70, backgroundColor:'rgba(255,255,255,0.08)' },
  qpHeroLbl:   { fontSize:10, fontWeight:'700', color:'rgba(255,255,255,0.65)', textTransform:'uppercase', letterSpacing:1.5, marginBottom:6, fontFamily:'Poppins_700Bold' },
  qpHeroTitle: { fontFamily:'DMSerifDisplay_400Regular', fontSize:24, color:'#fff', marginBottom:16, lineHeight:28 },
  qpBtnPrim:   { backgroundColor:'#fff', borderRadius:14, paddingHorizontal:16, paddingVertical:11 },
  qpBtnPrimTxt:{ fontSize:13, fontWeight:'700', color:C.accent, fontFamily:'Poppins_700Bold' },
  qpBtnSec:    { backgroundColor:'rgba(255,255,255,0.18)', borderRadius:14, paddingHorizontal:16, paddingVertical:11 },
  qpBtnSecTxt: { fontSize:13, fontWeight:'700', color:'#fff', fontFamily:'Poppins_700Bold' },

  // week strip
  wDay:        { alignItems:'center', paddingHorizontal:7, paddingVertical:5, borderRadius:14, minWidth:42, gap:3 },
  wDayOn:      { backgroundColor:C.accent },
  wDayLbl:     { fontSize:9, fontWeight:'700', color:C.text3, textTransform:'uppercase', fontFamily:'Poppins_700Bold' },
  wDayLblOn:   { color:'rgba(255,255,255,0.75)' },
  wDayNum:     { width:28, height:28, borderRadius:14, alignItems:'center', justifyContent:'center' },
  wDayNumToday:{ borderWidth:2, borderColor:C.accent },
  wDayNumOn:   { backgroundColor:'rgba(255,255,255,0.22)' },
  wDayNumTxt:  { fontSize:14, fontWeight:'700', color:C.text },
  wDayNumTodayTxt:{ color:C.accent },
  wDayNumOnTxt:{ color:'#fff' },
  wDot:        { width:5, height:5, borderRadius:3, backgroundColor:C.accent, opacity:0.65 },
  wDotOn:      { backgroundColor:'rgba(255,255,255,0.85)', opacity:1 },

  // AI bar
  aiBar:       { marginHorizontal:16, marginBottom:0, backgroundColor:C.accentBg, borderWidth:1.5, borderColor:C.accentBorder, borderRadius:18, padding:14, marginTop:4 },
  aiBarTop:    { flexDirection:'row', alignItems:'center', gap:10, marginBottom:8 },
  aiOrb:       { width:34, height:34, borderRadius:11, backgroundColor:C.accent, alignItems:'center', justifyContent:'center', flexShrink:0 },
  aiBarTitle:  { fontSize:10, fontWeight:'700', color:C.accent, letterSpacing:1.2, fontFamily:'Poppins_700Bold', flex:1 },
  aiInsight:   { fontSize:13, color:'#6b3d00', fontWeight:'600', lineHeight:20, marginBottom:10 },
  aiBarBtns:   { flexDirection:'row', gap:8 },
  aiBtnPrim:   { backgroundColor:C.accent, borderRadius:22, paddingHorizontal:16, paddingVertical:9 },
  aiBtnPrimTxt:{ fontSize:13, fontWeight:'700', color:'#fff', fontFamily:'Poppins_700Bold' },
  aiBtnSec:    { backgroundColor:C.accentLight, borderRadius:22, paddingHorizontal:16, paddingVertical:9 },
  aiBtnSecTxt: { fontSize:13, fontWeight:'700', color:C.accent, fontFamily:'Poppins_700Bold' },

  // day section
  daySection:  { paddingHorizontal:16, paddingTop:14 },
  dayHdr:      { flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:12 },
  dayName:     { fontFamily:'DMSerifDisplay_400Regular', fontSize:20, color:C.text },
  busyBadge:   { backgroundColor:C.magentaL, borderRadius:8, paddingHorizontal:8, paddingVertical:3 },
  busyBadgeTxt:{ fontSize:11, fontWeight:'700', color:C.magenta, fontFamily:'Poppins_700Bold' },
  aiSuggestBtn:{ backgroundColor:C.accentLight, borderRadius:10, paddingHorizontal:11, paddingVertical:6 },
  aiSuggestTxt:{ fontSize:12, fontWeight:'700', color:C.accent, fontFamily:'Poppins_700Bold' },

  // meal slots
  mealSlot:    { marginBottom:10 },
  mealSlotLbl: { fontSize:10, fontWeight:'700', color:C.text3, textTransform:'uppercase', letterSpacing:0.8, marginBottom:5, fontFamily:'Poppins_700Bold' },
  mealCard:    { flexDirection:'row', alignItems:'flex-start', gap:12, backgroundColor:C.card, borderWidth:1.5, borderColor:C.border, borderRadius:18, padding:14 },
  mealCardHighlight: { borderColor:C.accentBorder, backgroundColor:C.accentBg },
  mealName:    { fontSize:15, fontWeight:'700', color:C.text, fontFamily:'Poppins_700Bold' },
  mealSub:     { fontSize:12, color:C.text3, marginTop:2 },
  mealTag:     { borderRadius:6, paddingHorizontal:7, paddingVertical:2 },
  mealTagTxt:  { fontSize:10, fontWeight:'700', fontFamily:'Poppins_700Bold' },
  mealActBtn:  { width:32, height:32, borderRadius:10, alignItems:'center', justifyContent:'center' },
  mealEmpty:   { flexDirection:'row', alignItems:'center', gap:12, backgroundColor:C.card2, borderWidth:1.5, borderStyle:'dashed' as const, borderColor:C.border, borderRadius:18, padding:14 },
  mealEmptyIcon:{ width:38, height:38, borderRadius:12, backgroundColor:C.border, alignItems:'center', justifyContent:'center', flexShrink:0 },
  mealEmptyTxt: { fontSize:13, color:C.text3 },
  mealEmptyAi:  { fontSize:11, fontWeight:'700', color:C.accent, marginTop:2, fontFamily:'Poppins_700Bold' },

  // prep banner
  prepBanner:    { flexDirection:'row', alignItems:'center', gap:10, backgroundColor:C.greenL, borderWidth:1.5, borderColor:C.greenB, borderRadius:14, padding:12, marginTop:4 },
  prepBannerTxt: { flex:1, fontSize:13, color:'#00834f', fontWeight:'500' },
  prepSet:       { fontSize:13, fontWeight:'700', color:C.green, fontFamily:'Poppins_700Bold' },

  // library
  searchBar:   { margin:16, marginBottom:8, backgroundColor:C.card, borderWidth:1.5, borderColor:C.border, borderRadius:14, paddingHorizontal:18, paddingVertical:13, fontSize:15, color:C.text },
  libTag:      { paddingHorizontal:14, paddingVertical:8, borderRadius:22, borderWidth:1.5, borderColor:C.border, backgroundColor:C.card },
  libTagOn:    { backgroundColor:C.accent, borderColor:C.accent },
  libTagTxt:   { fontSize:12, fontWeight:'700', color:C.text2, fontFamily:'Poppins_700Bold' },
  libTagTxtOn: { color:'#fff' },
  libCard:     { flexDirection:'row', alignItems:'center', gap:12, backgroundColor:C.card, borderWidth:1.5, borderColor:C.border, borderRadius:18, padding:14, marginHorizontal:16, marginBottom:10 },
  libEmoji:    { width:52, height:52, borderRadius:16, backgroundColor:C.card2, alignItems:'center', justifyContent:'center', flexShrink:0 },
  libName:     { fontSize:15, fontWeight:'700', color:C.text, fontFamily:'Poppins_700Bold' },
  libMeta:     { fontSize:12, color:C.text3, marginTop:2 },
  libAddBtn:   { backgroundColor:C.accentLight, borderRadius:14, paddingHorizontal:14, paddingVertical:10, flexShrink:0 },
  libAddBtnTxt:{ fontSize:13, fontWeight:'700', color:C.accent, fontFamily:'Poppins_700Bold' },
});

// ── DETAIL + ADD MODAL STYLES ─────────────────────────────────────────
const dm = StyleSheet.create({
  header:      { flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingHorizontal:22, paddingVertical:18, borderBottomWidth:1.5, borderBottomColor:C.border, backgroundColor:C.card },
  title:       { fontSize:17, fontWeight:'700', color:C.text, fontFamily:'Poppins_700Bold', flex:1, textAlign:'center' },
  close:       { fontSize:16, color:C.text2 },
  tag:         { borderRadius:8, paddingHorizontal:10, paddingVertical:4 },
  tagTxt:      { fontSize:12, fontWeight:'700', fontFamily:'Poppins_700Bold' },
  sectionLbl:  { fontSize:12, fontWeight:'700', color:C.text2, textTransform:'uppercase', letterSpacing:1, marginBottom:10, marginTop:20, fontFamily:'Poppins_700Bold' },
  input:       { backgroundColor:C.card, borderWidth:1.5, borderColor:C.border, borderRadius:14, padding:16, fontSize:17, color:C.text, marginBottom:4 },

  prepBanner:    { flexDirection:'row', alignItems:'center', gap:10, backgroundColor:C.greenL, borderWidth:1.5, borderColor:C.greenB, borderRadius:14, padding:14, marginBottom:4 },
  prepBannerTxt: { flex:1, fontSize:13, color:'#00834f', fontWeight:'500' },
  prepSetBtn:    { backgroundColor:C.green, borderRadius:10, paddingHorizontal:12, paddingVertical:7 },
  prepSetTxt:    { fontSize:12, fontWeight:'700', color:'#fff', fontFamily:'Poppins_700Bold' },

  ingredientCard:{ backgroundColor:C.card, borderWidth:1.5, borderColor:C.border, borderRadius:18, overflow:'hidden' },
  ingRow:        { flexDirection:'row', alignItems:'center', justifyContent:'space-between', padding:14, borderBottomWidth:1, borderBottomColor:C.border },
  ingBadge:      { borderRadius:8, paddingHorizontal:10, paddingVertical:4 },
  ingBadgeTxt:   { fontSize:11, fontWeight:'700', fontFamily:'Poppins_700Bold' },

  shopBox:       { backgroundColor:C.yellowBg, borderWidth:1.5, borderColor:C.yellowBorder, borderRadius:18, padding:16, marginTop:16 },
  shopBoxTitle:  { fontSize:13, fontWeight:'700', color:C.yellowDark, marginBottom:6, fontFamily:'Poppins_700Bold' },
  shopBoxSub:    { fontSize:13, color:'#5a4800', marginBottom:14 },
  shopBoxBtn:    { backgroundColor:C.yellow, borderRadius:14, padding:14, alignItems:'center' },
  shopBoxBtnTxt: { fontSize:15, fontWeight:'700', color:'#000', fontFamily:'Poppins_700Bold' },

  choreBox:      { backgroundColor:C.purpleL, borderWidth:1.5, borderColor:C.purpleB, borderRadius:18, padding:16 },
  choreBoxSub:   { fontSize:13, color:C.text2 },
  choreBtn:      { flex:1, backgroundColor:C.purple, borderRadius:12, padding:11, alignItems:'center' },
  choreBtnSec:   { backgroundColor:C.purpleL, borderWidth:1.5, borderColor:C.purpleB },
  choreBtnTxt:   { fontSize:12, fontWeight:'700', color:'#fff', fontFamily:'Poppins_700Bold' },

  libQuickRow:   { flexDirection:'row', alignItems:'center', gap:12, backgroundColor:C.card, borderWidth:1.5, borderColor:C.border, borderRadius:16, padding:14, marginBottom:10 },
});
