/**
 * dashboard.tsx — Zaeli Dashboard Screen
 * Phase 4 · 4 April 2026
 *
 * Fixed card order (never rearranges):
 *   1. Calendar  — Today normally · Tomorrow when all today done or after 8pm
 *   2. Weather + Shopping — side by side
 *   3. Actions   — todos + reminders
 *   4. Dinner    — tonight · tomorrow after 8pm
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Animated, Easing, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { useFocusEffect, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import ZaeliFAB from '../components/ZaeliFAB';
import { setPendingChatContext, clearPendingChatContext } from '../../lib/navigation-store';

// ── Constants ─────────────────────────────────────────────────────────────────
const FAMILY_ID   = '00000000-0000-0000-0000-000000000001';
const WEATHER_LAT = -26.39;
const WEATHER_LON = 153.03;

const FAMILY_MEMBERS = [
  { id:'1', name:'Anna',  color:'#FF7B6B' },
  { id:'2', name:'Rich',  color:'#4D8BFF' },
  { id:'3', name:'Poppy', color:'#A855F7' },
  { id:'4', name:'Gab',   color:'#22C55E' },
  { id:'5', name:'Duke',  color:'#F59E0B' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function localDateStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function localDatePlusDays(n: number) {
  const d = new Date(); d.setDate(d.getDate() + n); return localDateStr(d);
}
function fmtTime(t?: string | null): string {
  if (!t) return '';
  const timePart = t.includes('T') ? t.split('T')[1] : t.split(' ')[1] || '';
  if (!timePart) return '';
  const [hStr, mStr] = timePart.split(':');
  const h = parseInt(hStr, 10); const m = parseInt(mStr, 10);
  if (isNaN(h) || isNaN(m)) return '';
  const ampm = h >= 12 ? 'pm' : 'am';
  const h12  = h === 0 ? 12 : h > 12 ? h-12 : h;
  return `${h12}:${String(m).padStart(2,'0')} ${ampm}`;
}
function weatherCondition(code: number): string {
  if (code === 0) return 'Clear';
  if (code <= 3)  return 'Partly cloudy';
  if (code <= 48) return 'Foggy';
  if (code <= 67) return 'Rain';
  if (code <= 82) return 'Showers';
  return 'Stormy';
}
function weatherType(code: number): 'sunny'|'partly'|'cloudy'|'rain'|'storm' {
  if (code === 0) return 'sunny';
  if (code <= 2)  return 'partly';
  if (code <= 48) return 'cloudy';
  if (code <= 82) return 'rain';
  return 'storm';
}
function weatherExtra(code: number, windspeed: number): string {
  if (code === 0 && windspeed > 15) return 'Breezy · good beach day';
  if (code === 0) return 'Perfect day';
  if (code <= 2)  return windspeed > 20 ? 'Windy · jacket handy' : 'Nice day';
  if (code <= 48) return 'May need a jacket';
  if (code <= 67) return 'Umbrella recommended';
  return 'Stay dry';
}
function getMealEmoji(name: string): string {
  const n = (name || '').toLowerCase();
  if (/pasta|bolognese|spaghetti/.test(n)) return '🍝';
  if (/pizza/.test(n)) return '🍕';
  if (/burger/.test(n)) return '🍔';
  if (/taco|mexican|burrito/.test(n)) return '🌮';
  if (/sushi|japanese/.test(n)) return '🍣';
  if (/stir.?fry|noodle|fried rice/.test(n)) return '🍜';
  if (/roast|lamb|chicken|pork/.test(n)) return '🍗';
  if (/salad|veg/.test(n)) return '🥗';
  if (/fish|salmon|tuna/.test(n)) return '🐟';
  if (/curry/.test(n)) return '🍛';
  if (/soup|stew/.test(n)) return '🍲';
  if (/bbq|grill/.test(n)) return '🍖';
  return '🍽';
}
function getEventEmoji(title: string): string {
  const t = title.toLowerCase();
  if (/soccer|football|footy/.test(t)) return '⚽';
  if (/danc|ballet/.test(t)) return '💃';
  if (/swim|pool/.test(t)) return '🏊';
  if (/gym|workout/.test(t)) return '🏋️';
  if (/tennis/.test(t)) return '🎾';
  if (/netball|basket/.test(t)) return '🏀';
  if (/school|class|tutor/.test(t)) return '🏫';
  if (/run|jog/.test(t)) return '🏃';
  return '';
}
function todoPriorityColor(todo: any): string {
  const today = localDateStr();
  const due = todo.due_date || null;
  if (todo.priority === 'urgent' || (due && due < today)) return '#FF4545';
  if (due && due === today) return '#F59E0B';
  if (todo.priority === 'high') return '#F59E0B';
  return 'rgba(0,0,0,0.15)';
}
function todoBadge(todo: any): { label:string; style:'rem'|'ovd' } | null {
  const today = localDateStr();
  const due = todo.due_date || null;
  if (due && due < today) return { label:'Overdue', style:'ovd' };
  if (todo.reminder_type === 'reminder') return { label:'Reminder', style:'rem' };
  return null;
}

// ── Interfaces ────────────────────────────────────────────────────────────────
interface WeatherData { temp:number; condition:string; code:number; windspeed:number; }
interface CardData {
  todayEvents:    any[];
  tomorrowEvents: any[];
  shopItems:      any[];
  shopCount:      number;
  todos:          any[];
  meals:          any[];
  weather:        WeatherData | null;
}

// ── Weather Icon ──────────────────────────────────────────────────────────────
function WeatherIcon({ type }: { type:'sunny'|'partly'|'cloudy'|'rain'|'storm' }) {
  const pulse = useRef(new Animated.Value(1)).current;
  const drift = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let anim: Animated.CompositeAnimation | null = null;
    if (type === 'sunny') {
      anim = Animated.loop(Animated.sequence([
        Animated.timing(pulse, { toValue:1.15, duration:1800, easing:Easing.inOut(Easing.ease), useNativeDriver:true }),
        Animated.timing(pulse, { toValue:1,    duration:1800, easing:Easing.inOut(Easing.ease), useNativeDriver:true }),
      ]));
    } else if (type === 'partly' || type === 'cloudy') {
      anim = Animated.loop(Animated.sequence([
        Animated.timing(drift, { toValue:3,  duration:2200, easing:Easing.inOut(Easing.ease), useNativeDriver:true }),
        Animated.timing(drift, { toValue:-3, duration:2200, easing:Easing.inOut(Easing.ease), useNativeDriver:true }),
      ]));
    }
    anim?.start();
    return () => anim?.stop();
  }, [type]);
  if (type === 'sunny') return <Animated.Text style={{ fontSize:28, transform:[{scale:pulse}] }}>☀️</Animated.Text>;
  if (type === 'partly') return <Animated.Text style={{ fontSize:28, transform:[{translateX:drift}] }}>⛅</Animated.Text>;
  if (type === 'cloudy') return <Animated.Text style={{ fontSize:28, transform:[{translateX:drift}] }}>☁️</Animated.Text>;
  if (type === 'rain')   return <Text style={{ fontSize:28 }}>🌧</Text>;
  return <Text style={{ fontSize:28 }}>⛈</Text>;
}

// ── Loading Dots ──────────────────────────────────────────────────────────────
function TypingDots({ color = 'rgba(0,0,0,0.3)' }: { color?: string }) {
  const dots = useRef([0,1,2].map(() => new Animated.Value(0.25))).current;
  useEffect(() => {
    const anims = dots.map((dot, i) =>
      Animated.loop(Animated.sequence([
        Animated.delay(i * 160),
        Animated.timing(dot, { toValue:1,    duration:300, easing:Easing.ease, useNativeDriver:true }),
        Animated.timing(dot, { toValue:0.25, duration:300, easing:Easing.ease, useNativeDriver:true }),
        Animated.delay(500 - i * 160),
      ]))
    );
    anims.forEach(a => a.start());
    return () => anims.forEach(a => a.stop());
  }, []);
  return (
    <View style={{ flexDirection:'row', gap:5, alignItems:'center', paddingVertical:4 }}>
      {dots.map((op, i) => <Animated.View key={i} style={{ width:7, height:7, borderRadius:4, backgroundColor:color, opacity:op }}/>)}
    </View>
  );
}

// ── CalendarCard ──────────────────────────────────────────────────────────────
function CalendarCard({ events, showTomorrow, onAdd, onEditEvent, onFullCalendar }: {
  events: any[]; showTomorrow: boolean;
  onAdd: () => void;
  onEditEvent: (ev: any) => void;
  onFullCalendar: () => void;
}) {
  const INITIAL = 3;
  const [expanded,    setExpanded]    = useState(false);
  const [selectedId,  setSelectedId]  = useState<string|null>(null);
  const [confirmDelId,setConfirmDelId]= useState<string|null>(null);

  const now = new Date();
  const todayLabel    = now.toLocaleDateString('en-AU', { weekday:'short', day:'numeric', month:'short' });
  const tomorrowLabel = new Date(localDatePlusDays(1)+'T00:00:00').toLocaleDateString('en-AU', { weekday:'short', day:'numeric', month:'short' });
  const eyeLabel      = showTomorrow ? `📅 Tomorrow · ${tomorrowLabel}` : `📅 Today · ${todayLabel}`;
  const shown         = expanded ? events : events.slice(0, INITIAL);
  const hiddenCount   = events.length - INITIAL;

  async function deleteEvent(ev: any) {
    await supabase.from('events').delete().eq('id', ev.id);
    setSelectedId(null);
    setConfirmDelId(null);
  }

  return (
    <View style={cS.cal}>
      {/* Header — label left, + Add right */}
      <View style={cS.hdr}>
        <Text style={cS.eyeLt}>{eyeLabel}</Text>
        <TouchableOpacity style={cS.addBtnLt} onPress={onAdd} activeOpacity={0.75}>
          <Text style={cS.addBtnTxtLt}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {/* Event rows */}
      {events.length === 0 ? (
        <Text style={cS.emptyLt}>Nothing on {showTomorrow ? 'tomorrow' : 'today'}</Text>
      ) : (
        <>
          {shown.map((ev: any, i: number) => {
            const members  = (ev.assignees||[]).map((id:string) => FAMILY_MEMBERS.find(m=>m.id===id)).filter(Boolean) as any[];
            const dotColor = members.length > 0 ? members[0].color : 'rgba(255,255,255,0.45)';
            const isSelected = selectedId === ev.id;
            const isConfirm  = confirmDelId === ev.id;

            return (
              <View key={ev.id||i}>
                {/* Main event row */}
                <TouchableOpacity
                  style={[cS.tRow, isSelected && { backgroundColor:'rgba(255,255,255,0.08)', borderRadius:10, marginHorizontal:-8, paddingHorizontal:8 }]}
                  onPress={() => {
                    setSelectedId(isSelected ? null : ev.id);
                    setConfirmDelId(null);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={cS.tTime} numberOfLines={1}>{fmtTime(ev.start_time)}</Text>
                  <View style={[cS.tDot, { backgroundColor:dotColor }]}/>
                  <Text style={cS.tEv} numberOfLines={1}>{ev.title} {getEventEmoji(ev.title)}</Text>
                  {members.slice(0,2).map((m:any) => (
                    <View key={m.id} style={[cS.tAv, { backgroundColor:m.color }]}>
                      <Text style={cS.tAvTxt}>{m.name[0]}</Text>
                    </View>
                  ))}
                  {members.length > 2 && (
                    <View style={[cS.tAv, { backgroundColor:'rgba(255,255,255,0.2)' }]}>
                      <Text style={[cS.tAvTxt, { fontSize:9 }]}>+{members.length-2}</Text>
                    </View>
                  )}
                  <Text style={{ color:'rgba(255,255,255,0.35)', fontSize:12, marginLeft:2 }}>
                    {isSelected ? '∧' : '›'}
                  </Text>
                </TouchableOpacity>

                {/* Expanded event detail */}
                {isSelected && (
                  <View style={cS.evExpanded}>
                    {/* Detail lines */}
                    {ev.notes ? (
                      <Text style={cS.evExpandedNote} numberOfLines={2}>{ev.notes}</Text>
                    ) : null}
                    {members.length > 0 && (
                      <Text style={cS.evExpandedWho}>
                        {members.map((m:any) => m.name).join(', ')}
                      </Text>
                    )}

                    {/* Action buttons */}
                    {!isConfirm ? (
                      <View style={cS.evExpandedActions}>
                        <TouchableOpacity
                          style={cS.evActionBtn}
                          onPress={() => onEditEvent(ev)}
                          activeOpacity={0.75}
                        >
                          <Text style={cS.evActionBtnTxt}>✦ Edit with Zaeli</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={cS.evDeleteBtn}
                          onPress={() => setConfirmDelId(ev.id)}
                          activeOpacity={0.75}
                        >
                          <Text style={cS.evDeleteBtnTxt}>Delete</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={cS.evExpandedActions}>
                        <TouchableOpacity
                          style={cS.evDeleteConfirmBtn}
                          onPress={() => deleteEvent(ev)}
                          activeOpacity={0.75}
                        >
                          <Text style={cS.evDeleteConfirmTxt}>Yes, delete</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={cS.evActionBtn}
                          onPress={() => setConfirmDelId(null)}
                          activeOpacity={0.75}
                        >
                          <Text style={cS.evActionBtnTxt}>Keep it</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                )}
              </View>
            );
          })}

          {/* Expand / collapse footer */}
          <View style={cS.calFooter}>
            {!expanded && hiddenCount > 0 ? (
              <TouchableOpacity onPress={() => setExpanded(true)} activeOpacity={0.7} style={cS.calExpandBtn}>
                <Text style={cS.calExpandTxt}>
                  {hiddenCount} more event{hiddenCount > 1 ? 's' : ''} ∨
                </Text>
              </TouchableOpacity>
            ) : expanded ? (
              <TouchableOpacity onPress={() => setExpanded(false)} activeOpacity={0.7} style={cS.calExpandBtn}>
                <Text style={cS.calExpandTxt}>Show less ∧</Text>
              </TouchableOpacity>
            ) : (
              <View style={cS.calExpandBtn}/>
            )}
            <TouchableOpacity onPress={onFullCalendar} activeOpacity={0.75}>
              <Text style={cS.calFullLink}>Full calendar →</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Empty state footer */}
      {events.length === 0 && (
        <TouchableOpacity onPress={onFullCalendar} activeOpacity={0.75} style={{ marginTop:8 }}>
          <Text style={cS.calFullLink}>Full calendar →</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── WeatherCard ───────────────────────────────────────────────────────────────
function WeatherCard({ weather }: { weather:WeatherData|null }) {
  if (!weather) {
    return (
      <View style={[cS.wx, { justifyContent:'center', alignItems:'center' }]}>
        <Text style={cS.eyeDkSm}>Weather</Text>
        <TypingDots/>
      </View>
    );
  }
  return (
    <View style={cS.wx}>
      <Text style={cS.eyeDkSm}>Weather</Text>
      <Text style={cS.wxTemp}>{Math.round(weather.temp)}°</Text>
      <Text style={cS.wxCond}>{weatherCondition(weather.code)}</Text>
      <View style={{ marginVertical:6 }}><WeatherIcon type={weatherType(weather.code)}/></View>
      <Text style={cS.wxExtra}>{weatherExtra(weather.code, weather.windspeed)}</Text>
    </View>
  );
}

// ── ShoppingCard ──────────────────────────────────────────────────────────────
function ShoppingCard({ items, count, onAdd, onFull }: {
  items:any[]; count:number; onAdd:()=>void; onFull:()=>void;
}) {
  const shown = items.filter((i:any) => i.checked !== true).slice(0,3);
  return (
    <View style={cS.shop}>
      <View style={cS.hdr}>
        <Text style={cS.eyeDk}>🛒 Shopping</Text>
        <View style={cS.hdrActions}>
          <TouchableOpacity style={cS.addBtnDk} onPress={onAdd} activeOpacity={0.75}>
            <Text style={cS.addBtnTxtDk}>+ Add</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onFull} activeOpacity={0.75}>
            <Text style={cS.seeAllDk}>Full →</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={{ flex:1 }}>
        {shown.map((item:any, i:number) => (
          <View key={item.id||i} style={cS.shopItem}>
            <View style={cS.shopDot}/>
            <Text style={cS.shopTxt} numberOfLines={1}>{item.name||item.item}</Text>
          </View>
        ))}
        {shown.length === 0 && <Text style={cS.emptyDkSm}>List is clear</Text>}
      </View>
      <View style={cS.shopFooter}>
        <Text style={cS.shopCountLbl}>items</Text>
        <Text style={cS.shopCount}>{count}</Text>
      </View>
    </View>
  );
}

// ── ActionsCard ───────────────────────────────────────────────────────────────
function ActionsCard({ todos, isEvening, tomorrowMorningEvents, onAdd, onFull, onTick }: {
  todos:any[]; isEvening:boolean; tomorrowMorningEvents:any[];
  onAdd:()=>void; onFull:()=>void; onTick:(todo:any)=>void;
}) {
  const shownTodos  = todos.slice(0,5);
  const activeCount = todos.filter(t => t.status !== 'done' && t.status !== 'acknowledged').length;
  return (
    <View style={cS.act}>
      <View style={cS.hdr}>
        <Text style={cS.eyeDk}>{isEvening ? '🌙 Put out tonight' : "🎯 Today's actions"}</Text>
        <View style={cS.hdrActions}>
          {activeCount > 0 && (
            <View style={cS.actCount}><Text style={cS.actCountTxt}>{activeCount}</Text></View>
          )}
          <TouchableOpacity style={cS.addBtnDk} onPress={onAdd} activeOpacity={0.75}>
            <Text style={cS.addBtnTxtDk}>+ Add</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onFull} activeOpacity={0.75}>
            <Text style={cS.seeAllDk}>Full →</Text>
          </TouchableOpacity>
        </View>
      </View>
      {shownTodos.length === 0 ? (
        <Text style={cS.emptyDk}>Nothing pending — enjoy the day 🎉</Text>
      ) : shownTodos.map((todo:any, i:number) => {
        const isDone   = todo.status === 'done' || todo.status === 'acknowledged';
        const dotColor = isDone ? 'rgba(0,0,0,0.12)' : todoPriorityColor(todo);
        const badge    = todoBadge(todo);
        const memberIds: string[] = Array.isArray(todo.assigned_to) ? todo.assigned_to : todo.assigned_to ? [todo.assigned_to] : [];
        const members  = memberIds.map((id:string) => FAMILY_MEMBERS.find(m=>m.id===id)).filter(Boolean) as any[];
        return (
          <View key={todo.id||i} style={[cS.actRow, isDone && { opacity:0.45 }]}>
            <TouchableOpacity
              style={[cS.actChk, isDone && cS.actChkDone]}
              onPress={() => onTick(todo)}
              activeOpacity={0.7}
              hitSlop={{ top:8, bottom:8, left:8, right:8 }}
            >
              {isDone && <Text style={{ fontSize:10, color:'rgba(0,0,0,0.5)' }}>✓</Text>}
            </TouchableOpacity>
            <View style={[cS.actDot, { backgroundColor:dotColor }]}/>
            <Text style={[cS.actTxt, isDone && { textDecorationLine:'line-through', color:'rgba(0,0,0,0.32)', fontFamily:'Poppins_400Regular' }]} numberOfLines={1}>{todo.title}</Text>
            {members.slice(0,1).map((m:any) => (
              <View key={m.id} style={[cS.actWho, { backgroundColor:m.color }]}>
                <Text style={cS.actWhoTxt}>{m.name[0]}</Text>
              </View>
            ))}
            {badge && !isDone && (
              <View style={[cS.bdg, badge.style==='ovd' ? cS.bdgOvd : cS.bdgRem]}>
                <Text style={[cS.bdgTxt, { color: badge.style==='ovd' ? '#B91C1C' : '#CC2020' }]}>{badge.label}</Text>
              </View>
            )}
          </View>
        );
      })}
      {isEvening && tomorrowMorningEvents.length > 0 && (
        <>
          <View style={cS.actDivider}>
            <View style={cS.actDivLine}/>
            <Text style={cS.actDivLbl}>🌅 Tomorrow morning</Text>
            <View style={cS.actDivLine}/>
          </View>
          {tomorrowMorningEvents.slice(0,3).map((ev:any, i:number) => {
            const members = (ev.assignees||[]).map((id:string) => FAMILY_MEMBERS.find(m=>m.id===id)).filter(Boolean) as any[];
            const dotColor = members.length > 0 ? members[0].color : 'rgba(0,0,0,0.2)';
            return (
              <View key={ev.id||i} style={[cS.actRow, { marginLeft:6 }]}>
                <View style={[cS.actDot, { backgroundColor:dotColor }]}/>
                <Text style={[cS.actTxt, { color:'rgba(0,0,0,0.65)' }]} numberOfLines={1}>
                  {ev.title}{fmtTime(ev.start_time) ? ` · ${fmtTime(ev.start_time)}` : ''}
                </Text>
                {members.slice(0,1).map((m:any) => (
                  <View key={m.id} style={[cS.actWho, { backgroundColor:m.color }]}>
                    <Text style={cS.actWhoTxt}>{m.name[0]}</Text>
                  </View>
                ))}
              </View>
            );
          })}
        </>
      )}
    </View>
  );
}

// ── DinnerCard ────────────────────────────────────────────────────────────────
function DinnerCard({ meals, showTomorrow, onPlanMeals }: {
  meals:any[]; showTomorrow:boolean; onPlanMeals:()=>void;
}) {
  const [expanded, setExpanded] = useState(false);
  const today       = localDateStr();
  const tomorrow    = localDatePlusDays(1);
  const targetDate  = showTomorrow ? tomorrow : today;
  const eyeLabel    = showTomorrow ? "🍽️ Tomorrow's dinner" : "🍽️ Tonight's dinner";
  const tonightMeal = meals.find(m => m.day_key === targetDate || m.planned_date === targetDate);
  const sevenDays   = Array.from({ length:7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i);
    const key = localDateStr(d);
    const meal = meals.find(m => m.day_key === key || m.planned_date === key);
    const dayAbbr = i === 0 ? 'Tonight' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-AU', { weekday:'short' });
    return { key, meal, isTonight:i===0, dayAbbr };
  });
  const unplannedCount = sevenDays.filter(d => !d.meal).length;
  return (
    <View style={cS.din}>
      <View style={[cS.hdr, { marginBottom:10 }]}>
        <Text style={cS.eyeDk}>{eyeLabel}</Text>
        {expanded && (
          <TouchableOpacity onPress={() => setExpanded(false)} activeOpacity={0.75}>
            <Text style={cS.seeAllDk}>Close ∧</Text>
          </TouchableOpacity>
        )}
      </View>
      {tonightMeal ? (
        <View style={cS.dinRow}>
          <Text style={cS.dinIcon}>{getMealEmoji(tonightMeal.meal_name)}</Text>
          <View style={{ flex:1 }}>
            <Text style={cS.dinName}>{tonightMeal.meal_name}</Text>
            {tonightMeal.prep_mins > 0 && <Text style={cS.dinSub}>{tonightMeal.prep_mins} min prep</Text>}
          </View>
          <View style={cS.dinTick}><Text style={cS.dinTickTxt}>✓ Planned</Text></View>
        </View>
      ) : (
        <TouchableOpacity style={cS.dinNudge} onPress={onPlanMeals} activeOpacity={0.75}>
          <Text style={cS.dinNudgeTxt}>Nothing planned {showTomorrow ? 'for tomorrow' : 'for tonight'} — Quick idea? 💡</Text>
        </TouchableOpacity>
      )}
      {expanded && (
        <View style={cS.dinExpanded}>
          {sevenDays.map(({ key, meal, isTonight, dayAbbr }) => (
            <View key={key} style={cS.dinDayRow}>
              <Text style={[cS.dinDayLbl, isTonight && { color:'#C84010', fontFamily:'Poppins_700Bold' }]}>{dayAbbr}</Text>
              {meal ? (
                <>
                  <Text style={cS.dinDayMeal} numberOfLines={1}>{getMealEmoji(meal.meal_name)} {meal.meal_name}</Text>
                  <Text style={cS.dinDayTick}>✓</Text>
                </>
              ) : (
                <>
                  <Text style={cS.dinDayBlank}>Nothing yet</Text>
                  <Text style={{ fontSize:12 }}>⚠</Text>
                </>
              )}
            </View>
          ))}
        </View>
      )}
      <View style={cS.dinFooter}>
        {expanded
          ? <Text style={cS.dinFooterLbl}>{unplannedCount > 0 ? `${unplannedCount} nights unplanned` : 'Week looking good'}</Text>
          : <Text style={cS.dinFooterLbl}>Meal plan</Text>
        }
        {expanded ? (
          <TouchableOpacity onPress={onPlanMeals} activeOpacity={0.75}>
            <Text style={cS.dinFooterTap}>Open meal planner ›</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => setExpanded(true)} activeOpacity={0.75}>
            <Text style={cS.dinFooterTap}>Next 7 days ›</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── MAIN SCREEN ───────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
export default function DashboardScreen() {
  const router = useRouter();
  const h      = new Date().getHours();
  const isAfter8pm = h >= 20;

  const [cardData, setCardData] = useState<CardData>({
    todayEvents:[], tomorrowEvents:[], shopItems:[], shopCount:0, todos:[], meals:[], weather:null,
  });
  const [cardLoading, setCardLoading] = useState(true);

  const cardAnims = useRef([0,1,2,3].map(() => ({
    opacity:    new Animated.Value(0),
    translateY: new Animated.Value(16),
  }))).current;

  const loadData = useCallback(async () => {
    setCardLoading(true);
    try {
      const today    = localDateStr();
      const tomorrow = localDatePlusDays(1);
      const in7days  = localDatePlusDays(7);
      const nowMs    = Date.now() - 15 * 60 * 1000;

      const [evRes, shopRes, shopCountRes, todosRes, remindersRes, mealsRes] = await Promise.all([
        supabase.from('events')
          .select('id,title,date,start_time,end_time,assignees,all_day')
          .eq('family_id', FAMILY_ID).gte('date', today).lte('date', tomorrow)
          .order('date').order('start_time').limit(30),
        supabase.from('shopping_items')
          .select('id,name,item,category,checked').eq('family_id', FAMILY_ID).limit(10),
        supabase.from('shopping_items')
          .select('*', { count:'exact', head:true }).eq('family_id', FAMILY_ID).neq('checked', true),
        supabase.from('todos')
          .select('id,title,priority,status,due_date,assigned_to')
          .eq('family_id', FAMILY_ID).eq('status','active')
          .order('created_at', { ascending:false }).limit(8),
        supabase.from('reminders')
          .select('id,title,remind_at,member_id,status')
          .eq('family_id', FAMILY_ID).eq('status','active')
          .lte('remind_at', new Date(Date.now()+24*60*60*1000).toISOString())
          .order('remind_at').limit(5),
        supabase.from('meal_plans')
          .select('id,meal_name,planned_date,day_key,prep_mins')
          .eq('family_id', FAMILY_ID).gte('planned_date', today).lte('planned_date', in7days)
          .order('planned_date').limit(7),
      ]);

      const allEvents      = (evRes.data ?? []).filter((e:any) => !e.all_day);
      const todayEvents    = allEvents.filter((e:any) => {
        if (e.date !== today) return false;
        if (!e.start_time) return true;
        return new Date(e.start_time).getTime() >= nowMs;
      });
      const tomorrowEvents = allEvents.filter((e:any) => e.date === tomorrow);

      let weather: WeatherData | null = null;
      try {
        const wxRes  = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${WEATHER_LAT}&longitude=${WEATHER_LON}&current=temperature_2m,weather_code,windspeed_10m&timezone=Australia%2FBrisbane`);
        const wxJson = await wxRes.json();
        const curr   = wxJson?.current;
        if (curr) weather = { temp:curr.temperature_2m??22, code:curr.weather_code??0, windspeed:curr.windspeed_10m??0, condition:weatherCondition(curr.weather_code??0) };
      } catch {}

      const reminders = (remindersRes.data ?? []).map((r:any) => ({
        id:r.id, title:r.title, priority:'normal', status:'active',
        due_date:r.remind_at?.slice(0,10), assigned_to:r.member_id||null, reminder_type:'reminder',
      }));

      setCardData({
        todayEvents, tomorrowEvents,
        shopItems:  shopRes.data ?? [],
        shopCount:  shopCountRes.count ?? 0,
        todos:      [...(todosRes.data ?? []), ...reminders],
        meals:      mealsRes.data ?? [],
        weather,
      });
    } catch (e) {
      console.error('[Dashboard] loadData:', e);
    } finally {
      setCardLoading(false);
      cardAnims.forEach((anim, i) => {
        Animated.parallel([
          Animated.timing(anim.opacity,    { toValue:1, duration:380, delay:i*120, useNativeDriver:true }),
          Animated.timing(anim.translateY, { toValue:0, duration:380, delay:i*120, easing:Easing.out(Easing.cubic), useNativeDriver:true }),
        ]).start();
      });
    }
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  // Calendar: show Tomorrow if after 8pm OR no today events remaining
  const showCalTomorrow     = isAfter8pm || cardData.todayEvents.length === 0;
  const showDinnerTomorrow  = isAfter8pm;
  const isEvening           = isAfter8pm;
  const tomorrowMorningEvs  = cardData.tomorrowEvents.filter(e => {
    const tp = (e.start_time||'').includes('T') ? (e.start_time||'').split('T')[1] : '';
    return tp ? parseInt(tp.split(':')[0],10) < 10 : false;
  });

  async function handleTodoTick(todo: any) {
    const isReminder = todo.reminder_type === 'reminder';
    const newStatus  = isReminder ? 'acknowledged' : 'done';
    setCardData(prev => ({ ...prev, todos:prev.todos.map(t => t.id===todo.id ? {...t, status:newStatus} : t) }));
    try {
      if (isReminder) {
        await supabase.from('reminders').update({ status:newStatus }).eq('id', todo.id);
      } else {
        await supabase.from('todos').update({ status:newStatus, updated_at:new Date().toISOString() }).eq('id', todo.id);
      }
    } catch {
      setCardData(prev => ({ ...prev, todos:prev.todos.map(t => t.id===todo.id ? {...t, status:todo.status} : t) }));
    }
  }

  function goToChat() {
    clearPendingContextOnArrival();
    router.navigate('/(tabs)/' as any);
  }

  function goToEditEvent(ev: any) {
    setPendingChatContext({ type:'edit_event', event:ev, returnTo:'dashboard' });
    router.navigate('/(tabs)/' as any);
  }

  function goToAddEvent() {
    setPendingChatContext({ type:'add_event', returnTo:'dashboard' });
    router.navigate('/(tabs)/' as any);
  }

  function clearPendingContextOnArrival() {
    // Just navigate — index.tsx will read and clear the store
  }

  return (
    <View style={s.root}>
      <ExpoStatusBar style="dark" animated/>

      {/* Top bar */}
      <SafeAreaView style={s.topBar} edges={['top']}>
        <View style={s.topBarRow}>
          <TouchableOpacity onPress={goToChat} activeOpacity={0.8}>
            <Text style={s.logoWord}>
              z<Text style={{ color:'#A8D8F0' }}>a</Text>el<Text style={{ color:'#A8D8F0' }}>i</Text>
            </Text>
          </TouchableOpacity>
          <Text style={s.channelLabel}>Dashboard</Text>
        </View>
        <View style={s.topBarDivider}/>
      </SafeAreaView>

      {/* Card stack */}
      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

        {/* 1. Calendar */}
        <Animated.View style={{ opacity:cardAnims[0].opacity, transform:[{translateY:cardAnims[0].translateY}] }}>
          <CalendarCard
            events={showCalTomorrow ? cardData.tomorrowEvents : cardData.todayEvents}
            showTomorrow={showCalTomorrow}
            onAdd={goToAddEvent}
            onEditEvent={goToEditEvent}
            onFullCalendar={() => router.navigate('/(tabs)/calendar')}
          />
        </Animated.View>

        {/* 2. Weather + Shopping */}
        <Animated.View style={{ opacity:cardAnims[1].opacity, transform:[{translateY:cardAnims[1].translateY}] }}>
          <View style={{ flexDirection:'row', gap:10 }}>
            <WeatherCard weather={cardData.weather}/>
            <ShoppingCard
              items={cardData.shopItems}
              count={cardData.shopCount}
              onAdd={goToChat}
              onFull={() => router.navigate('/(tabs)/shopping')}
            />
          </View>
        </Animated.View>

        {/* 3. Actions */}
        <Animated.View style={{ opacity:cardAnims[2].opacity, transform:[{translateY:cardAnims[2].translateY}] }}>
          <ActionsCard
            todos={cardData.todos}
            isEvening={isEvening}
            tomorrowMorningEvents={tomorrowMorningEvs}
            onAdd={goToChat}
            onFull={() => router.navigate('/(tabs)/todos')}
            onTick={handleTodoTick}
          />
        </Animated.View>

        {/* 4. Dinner */}
        <Animated.View style={{ opacity:cardAnims[3].opacity, transform:[{translateY:cardAnims[3].translateY}] }}>
          <DinnerCard
            meals={cardData.meals}
            showTomorrow={showDinnerTomorrow}
            onPlanMeals={() => router.navigate('/(tabs)/mealplanner')}
          />
        </Animated.View>

        <View style={{ height:120 }}/>
      </ScrollView>

      {/* ZaeliFAB — Dashboard button active */}
      <ZaeliFAB
        activeButton="dashboard"
        onDashboard={() => {}}
        onChat={goToChat}
        onChatKeyboard={goToChat}
        onMoreItem={(key) => {
          const routes: Record<string, string> = {
            notes:'/(tabs)/notes', kids:'/(tabs)/kids', tutor:'/(tabs)/tutor',
            travel:'/(tabs)/travel', family:'/(tabs)/family', meals:'/(tabs)/mealplanner',
            settings:'/(tabs)/settings',
          };
          if (routes[key]) router.navigate(routes[key] as any);
        }}
        onMicResult={goToChat}
      />
    </View>
  );
}

// ── Screen styles ──────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:          { flex:1, backgroundColor:'#FAF8F5' },
  topBar:        { backgroundColor:'#FAF8F5' },
  topBarRow:     { flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingHorizontal:20, paddingTop:4, paddingBottom:10 },
  topBarDivider: { height:1, backgroundColor:'rgba(10,10,10,0.08)' },
  logoWord:      { fontFamily:'DMSerifDisplay_400Regular', fontSize:40, color:'#0A0A0A', letterSpacing:-1.5, lineHeight:44 },
  channelLabel:  { fontFamily:'Poppins_600SemiBold', fontSize:16, color:'rgba(10,10,10,0.45)' },
  scroll:        { flex:1 },
  scrollContent: { paddingHorizontal:14, paddingTop:14, gap:10 },
});

// ── Card styles (identical to index.tsx) ──────────────────────────────────────
const cS = StyleSheet.create({
  cal:         { backgroundColor:'#3A3D4A', borderRadius:18, padding:20 },
  wx:          { backgroundColor:'#A8D8F0', borderRadius:18, padding:16, width:115, flexShrink:0 },
  shop:        { backgroundColor:'#D8CCFF', borderRadius:18, padding:16, flex:1 },
  act:         { backgroundColor:'#F0DC80', borderRadius:18, padding:20 },
  din:         { backgroundColor:'#FAC8A8', borderRadius:18, padding:20 },
  hdr:         { flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:12 },
  hdrActions:  { flexDirection:'row', alignItems:'center', gap:8 },
  eyeLt:       { fontFamily:'Poppins_700Bold', fontSize:12, letterSpacing:0.1, textTransform:'uppercase' as const, color:'rgba(255,255,255,0.5)', flex:1 },
  eyeDk:       { fontFamily:'Poppins_700Bold', fontSize:12, letterSpacing:0.1, textTransform:'uppercase' as const, color:'rgba(0,0,0,0.42)', flex:1 },
  eyeDkSm:     { fontFamily:'Poppins_700Bold', fontSize:11, letterSpacing:0.1, textTransform:'uppercase' as const, color:'rgba(0,0,0,0.35)', marginBottom:6 },
  addBtnLt:    { backgroundColor:'rgba(255,255,255,0.2)', borderRadius:10, paddingVertical:6, paddingHorizontal:12 },
  addBtnTxtLt: { fontFamily:'Poppins_700Bold', fontSize:12, color:'rgba(255,255,255,0.85)' },
  addBtnDk:    { backgroundColor:'rgba(0,0,0,0.1)', borderRadius:10, paddingVertical:6, paddingHorizontal:12 },
  addBtnTxtDk: { fontFamily:'Poppins_700Bold', fontSize:12, color:'rgba(0,0,0,0.55)' },
  seeAllLt:    { fontFamily:'Poppins_600SemiBold', fontSize:12, color:'rgba(255,255,255,0.45)' },
  seeAllDk:    { fontFamily:'Poppins_600SemiBold', fontSize:12, color:'rgba(0,0,0,0.4)' },
  emptyLt:     { fontFamily:'Poppins_400Regular', fontSize:16, color:'rgba(255,255,255,0.5)', fontStyle:'italic' as const, paddingVertical:10 },
  emptyDk:     { fontFamily:'Poppins_400Regular', fontSize:16, color:'rgba(0,0,0,0.38)', fontStyle:'italic' as const, paddingVertical:8 },
  emptyDkSm:   { fontFamily:'Poppins_400Regular', fontSize:13, color:'rgba(0,0,0,0.38)', fontStyle:'italic' as const },
  tRow:        { flexDirection:'row', alignItems:'center', gap:10, marginBottom:13 },
  tTime:       { fontFamily:'Poppins_500Medium', fontSize:13, color:'rgba(255,255,255,0.65)', width:58, flexShrink:0 },
  tDot:        { width:8, height:8, borderRadius:4, flexShrink:0 },
  tEv:         { fontFamily:'Poppins_400Regular', fontSize:17, color:'rgba(255,255,255,0.92)', flex:1 },
  tAv:         { width:30, height:30, borderRadius:15, alignItems:'center', justifyContent:'center', flexShrink:0 },
  tAvTxt:      { fontFamily:'Poppins_700Bold', fontSize:11, color:'#fff' },
  calOverflow: { fontFamily:'Poppins_600SemiBold', fontSize:13, color:'rgba(255,255,255,0.55)', paddingVertical:2 },

  // Calendar footer — expand + full link
  calFooter:      { flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginTop:8, paddingTop:8, borderTopWidth:1, borderTopColor:'rgba(255,255,255,0.1)' },
  calExpandBtn:   { flex:1 },
  calExpandTxt:   { fontFamily:'Poppins_600SemiBold', fontSize:12, color:'rgba(255,255,255,0.50)' },
  calFullLink:    { fontFamily:'Poppins_600SemiBold', fontSize:12, color:'rgba(255,255,255,0.38)', textAlign:'right' as const },

  // Expanded event detail
  evExpanded:         { backgroundColor:'rgba(255,255,255,0.07)', borderRadius:12, padding:12, marginBottom:10, marginTop:2 },
  evExpandedNote:     { fontFamily:'Poppins_400Regular', fontSize:13, color:'rgba(255,255,255,0.60)', marginBottom:6, lineHeight:18 },
  evExpandedWho:      { fontFamily:'Poppins_500Medium', fontSize:12, color:'rgba(255,255,255,0.45)', marginBottom:10 },
  evExpandedActions:  { flexDirection:'row', gap:8 },
  evActionBtn:        { flex:1, backgroundColor:'rgba(255,255,255,0.15)', borderRadius:10, paddingVertical:9, alignItems:'center' as const },
  evActionBtnTxt:     { fontFamily:'Poppins_600SemiBold', fontSize:12, color:'rgba(255,255,255,0.85)' },
  evDeleteBtn:        { backgroundColor:'rgba(255,69,69,0.18)', borderRadius:10, paddingVertical:9, paddingHorizontal:16, alignItems:'center' as const },
  evDeleteBtnTxt:     { fontFamily:'Poppins_600SemiBold', fontSize:12, color:'rgba(255,120,120,0.90)' },
  evDeleteConfirmBtn: { flex:1, backgroundColor:'rgba(255,69,69,0.35)', borderRadius:10, paddingVertical:9, alignItems:'center' as const },
  evDeleteConfirmTxt: { fontFamily:'Poppins_700Bold', fontSize:12, color:'#FF9090' },
  wxTemp:      { fontFamily:'DMSerifDisplay_400Regular', fontSize:34, color:'#1A1A1A', letterSpacing:-1, lineHeight:38, marginTop:4 },
  wxCond:      { fontFamily:'Poppins_400Regular', fontSize:13, color:'rgba(0,0,0,0.5)', marginTop:3 },
  wxExtra:     { fontFamily:'Poppins_400Regular', fontSize:12, color:'rgba(0,0,0,0.42)', marginTop:6, lineHeight:16 },
  shopItem:    { flexDirection:'row', alignItems:'center', gap:10, marginBottom:12 },
  shopDot:     { width:7, height:7, borderRadius:4, backgroundColor:'rgba(0,0,0,0.28)', flexShrink:0 },
  shopTxt:     { fontFamily:'Poppins_400Regular', fontSize:17, color:'#1A1A1A', flex:1 },
  shopFooter:  { flexDirection:'row', alignItems:'flex-end', justifyContent:'flex-end', marginTop:8 },
  shopCountLbl:{ fontFamily:'Poppins_400Regular', fontSize:11, color:'rgba(0,0,0,0.42)', marginRight:4, alignSelf:'flex-end', marginBottom:4 },
  shopCount:   { fontFamily:'Poppins_800ExtraBold', fontSize:32, color:'rgba(0,0,0,0.35)', letterSpacing:-1, lineHeight:36 },
  actCount:    { backgroundColor:'#806000', borderRadius:11, paddingHorizontal:9, paddingVertical:2 },
  actCountTxt: { fontFamily:'Poppins_700Bold', fontSize:12, color:'#fff' },
  actRow:      { flexDirection:'row', alignItems:'center', gap:10, marginBottom:12 },
  actChk:      { width:26, height:26, borderRadius:13, borderWidth:1.5, borderColor:'rgba(0,0,0,0.22)', flexShrink:0, alignItems:'center', justifyContent:'center' },
  actChkDone:  { backgroundColor:'rgba(0,0,0,0.18)', borderColor:'transparent' },
  actDot:      { width:8, height:8, borderRadius:4, flexShrink:0 },
  actTxt:      { fontFamily:'Poppins_400Regular', fontSize:17, color:'#1A1A1A', flex:1, lineHeight:23 },
  actWho:      { width:28, height:28, borderRadius:14, alignItems:'center', justifyContent:'center', flexShrink:0 },
  actWhoTxt:   { fontFamily:'Poppins_700Bold', fontSize:11, color:'#fff' },
  bdg:         { borderRadius:5, paddingVertical:3, paddingHorizontal:7, flexShrink:0 },
  bdgRem:      { backgroundColor:'rgba(255,69,69,0.12)' },
  bdgOvd:      { backgroundColor:'rgba(220,38,38,0.12)' },
  bdgTxt:      { fontFamily:'Poppins_700Bold', fontSize:9, textTransform:'uppercase' as const, letterSpacing:0.06 },
  actDivider:  { flexDirection:'row', alignItems:'center', gap:8, marginVertical:10 },
  actDivLine:  { flex:1, height:1, backgroundColor:'rgba(0,0,0,0.1)' },
  actDivLbl:   { fontFamily:'Poppins_700Bold', fontSize:10, letterSpacing:0.1, textTransform:'uppercase' as const, color:'rgba(0,0,0,0.38)' },
  dinRow:      { flexDirection:'row', alignItems:'center', gap:12 },
  dinIcon:     { fontSize:32, flexShrink:0, lineHeight:38 },
  dinName:     { fontFamily:'Poppins_800ExtraBold', fontSize:19, color:'#1A1A1A', letterSpacing:-0.4, lineHeight:24 },
  dinSub:      { fontFamily:'Poppins_400Regular', fontSize:14, color:'rgba(0,0,0,0.45)', marginTop:4 },
  dinTick:     { backgroundColor:'rgba(0,0,0,0.1)', borderRadius:8, paddingVertical:5, paddingHorizontal:10, flexShrink:0 },
  dinTickTxt:  { fontFamily:'Poppins_700Bold', fontSize:11, color:'rgba(0,0,0,0.5)' },
  dinNudge:    { backgroundColor:'rgba(0,0,0,0.07)', borderRadius:12, padding:14, marginBottom:2 },
  dinNudgeTxt: { fontFamily:'Poppins_400Regular', fontSize:16, color:'rgba(0,0,0,0.55)', textAlign:'center' as const },
  dinFooter:   { marginTop:12, paddingTop:10, borderTopWidth:1, borderTopColor:'rgba(0,0,0,0.09)', flexDirection:'row', alignItems:'center', justifyContent:'space-between' },
  dinExpanded: { marginTop:10, paddingTop:8, borderTopWidth:1, borderTopColor:'rgba(0,0,0,0.09)', gap:8 },
  dinDayRow:   { flexDirection:'row', alignItems:'center', gap:8 },
  dinDayLbl:   { fontFamily:'Poppins_600SemiBold', fontSize:14, color:'rgba(0,0,0,0.42)', width:76, flexShrink:0 },
  dinDayMeal:  { fontFamily:'Poppins_400Regular', fontSize:15, color:'#1A1A1A', flex:1 },
  dinDayTick:  { fontFamily:'Poppins_700Bold', fontSize:12, color:'#0A7A3A', flexShrink:0 },
  dinDayBlank: { fontFamily:'Poppins_400Regular', fontSize:15, color:'rgba(0,0,0,0.3)', fontStyle:'italic' as const, flex:1 },
  dinFooterLbl:{ fontFamily:'Poppins_400Regular', fontSize:11, color:'rgba(0,0,0,0.38)' },
  dinFooterTap:{ fontFamily:'Poppins_700Bold', fontSize:12, color:'rgba(0,0,0,0.55)' },
});
