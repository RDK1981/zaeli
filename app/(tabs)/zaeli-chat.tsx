/**
 * Zaeli AI Chat Screen
 * app/(tabs)/zaeli-chat.tsx
 */

import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Clipboard,
  Easing,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  ToastAndroid,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Line, Path, Polygon, Polyline, Rect } from 'react-native-svg';
import { detectReminderIntent, scheduleReminder } from '../../lib/notifications';
import { supabase } from '../../lib/supabase';
import { buildMemoryContext, saveConversation } from '../../lib/zaeli-memory';

const DUMMY_FAMILY_ID   = '00000000-0000-0000-0000-000000000001';
const DUMMY_MEMBER_NAME = 'Anna';

const C = {
  blue:   '#0057FF', mag:    '#E0007C', ink:    '#0A0A0A',
  ink2:   'rgba(0,0,0,0.50)', ink3:   'rgba(0,0,0,0.28)',
  border: 'rgba(0,0,0,0.07)', bg:     '#F7F7F7',
  chatBg: '#F4F6FA', green:  '#00C97A', orange: '#FF8C00',
};

// ── SVG ICON COMPONENTS ──────────────────────────────────────
const ICON_SIZE = 15;
const ICON_COLOR = 'rgba(0,0,0,0.28)';
const ICON_STROKE = 1.8;

function IcoPlay({ color = ICON_COLOR }: { color?: string }) {
  return (
    <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24">
      <Polygon points="5 3 19 12 5 21 5 3" stroke={color} strokeWidth={ICON_STROKE} fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    </Svg>
  );
}

function IcoCopy({ color = ICON_COLOR }: { color?: string }) {
  return (
    <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24">
      <Rect x="9" y="9" width="13" height="13" rx="2" stroke={color} strokeWidth={ICON_STROKE} fill="none"/>
      <Path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke={color} strokeWidth={ICON_STROKE} fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    </Svg>
  );
}

function IcoForward({ color = ICON_COLOR }: { color?: string }) {
  return (
    <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24">
      <Path d="M22 2L15 22l-3-7-7-3 17-10z" stroke={color} strokeWidth={ICON_STROKE} fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    </Svg>
  );
}

function IcoThumbUp({ color = ICON_COLOR }: { color?: string }) {
  return (
    <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24">
      <Path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z" stroke={color} strokeWidth={ICON_STROKE} fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      <Path d="M7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" stroke={color} strokeWidth={ICON_STROKE} fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    </Svg>
  );
}

function IcoThumbDown({ color = ICON_COLOR }: { color?: string }) {
  return (
    <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24">
      <Path d="M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3H10z" stroke={color} strokeWidth={ICON_STROKE} fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      <Path d="M17 2h2.67A2.31 2.31 0 0122 4v7a2.31 2.31 0 01-2.33 2H17" stroke={color} strokeWidth={ICON_STROKE} fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    </Svg>
  );
}

function IcoRetry({ color = ICON_COLOR }: { color?: string }) {
  return (
    <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24">
      <Polyline points="1 4 1 10 7 10" stroke={color} strokeWidth={ICON_STROKE} fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      <Path d="M3.51 15a9 9 0 102.13-9.36L1 10" stroke={color} strokeWidth={ICON_STROKE} fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    </Svg>
  );
}

function IcoCheck({ color = C.green }: { color?: string }) {
  return (
    <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24">
      <Polyline points="20 6 9 17 4 12" stroke={color} strokeWidth={ICON_STROKE} fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    </Svg>
  );
}

function IcoBack() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <Polyline points="15 18 9 12 15 6" stroke={C.blue} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    </Svg>
  );
}

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

function IcoDown() {
  return (
    <Svg width={11} height={11} viewBox="0 0 24 24">
      <Polyline points="6 9 12 15 18 9" stroke={C.blue} strokeWidth={2.2} fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    </Svg>
  );
}

// ── TYPING DOT ───────────────────────────────────────────────
function TypingDot({ delay }: { delay: number }) {
  const y = useRef(new Animated.Value(0)).current;
  const o = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(y, { toValue:-5, duration:300, easing:Easing.inOut(Easing.sin), useNativeDriver:true }),
        Animated.timing(o, { toValue:1,  duration:300, useNativeDriver:true }),
      ]),
      Animated.parallel([
        Animated.timing(y, { toValue:0,  duration:300, easing:Easing.inOut(Easing.sin), useNativeDriver:true }),
        Animated.timing(o, { toValue:0.3,duration:300, useNativeDriver:true }),
      ]),
      Animated.delay(300),
    ])).start();
  }, []);
  return <Animated.View style={{ width:7, height:7, borderRadius:4, backgroundColor:C.ink3, transform:[{translateY:y}], opacity:o }}/>;
}

// ── PULSING AVATAR ───────────────────────────────────────────
function PulsingAvatar() {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(scale, { toValue:1.08, duration:1200, easing:Easing.inOut(Easing.sin), useNativeDriver:true }),
      Animated.timing(scale, { toValue:1,    duration:1300, easing:Easing.inOut(Easing.sin), useNativeDriver:true }),
    ])).start();
  }, []);
  return (
    <Animated.View style={[s.av, { transform:[{scale}] }]}>
      <Text style={s.avStar}>✦</Text>
    </Animated.View>
  );
}

// ── TYPES ────────────────────────────────────────────────────
type Message = {
  id:          string;
  role:        'user' | 'assistant';
  content:     string;
  time:        string;
  recipeData?: { title: string; content: string };
  isToolMsg?:  boolean;
};
type FeedbackState = Record<string, 'up' | 'down' | null>;

function getTime() {
  const n = new Date();
  const h = n.getHours(), m = n.getMinutes().toString().padStart(2,'0');
  return `${h % 12 || 12}:${m} ${h >= 12 ? 'pm' : 'am'}`;
}

function BoldText({ text, style }: { text:string; style?:any }) {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return (
    <Text style={style}>
      {parts.map((p,i) => i % 2 === 1
        ? <Text key={i} style={{ fontFamily:'Poppins_700Bold' }}>{p}</Text>
        : <Text key={i}>{p}</Text>)}
    </Text>
  );
}

function extractRecipes(text: string): { title: string; content: string }[] {
  const recipes: { title: string; content: string }[] = [];
  const blocks = text.split(/\n(?=#{1,3}\s|\*\*[A-Z])/g);
  for (const block of blocks) {
    const m = block.match(/^#{1,3}\s+(.+)|^\*\*(.+?)\*\*/);
    if (m && (block.includes('ingredient') || block.includes('cup') || block.includes('tbsp') || block.match(/\d+\s*(g|kg|ml|cup|tbsp|tsp)/i))) {
      recipes.push({ title:(m[1]||m[2]).trim(), content:block.trim() });
    }
  }
  return recipes;
}

// ── TOOL DEFINITIONS ─────────────────────────────────────────
const TOOL_DEFINITIONS = [
  { name:'add_calendar_event', description:'Add an event to the family calendar',
    input_schema:{ type:'object', properties:{ title:{type:'string'}, start_time:{type:'string',description:'ISO 8601'}, end_time:{type:'string'}, notes:{type:'string'} }, required:['title','start_time'] } },
  { name:'add_shopping_item', description:'Add one or more items to the family shopping list. Always call this immediately when the user mentions items to buy — do not ask for confirmation first.',
    input_schema:{ type:'object', properties:{ items:{ type:'array', items:{ type:'object', properties:{
      name:{type:'string', description:'Item name e.g. "Full cream milk"'},
      qty:{type:'string', description:'Quantity or size e.g. "2L", "×3", "500g" — optional'},
      category:{type:'string', enum:['Fruit & Veg','Dairy & Eggs','Meat & Seafood','Bakery','Pantry','Frozen','Drinks','Snacks','Household','Other']}
    }, required:['name'] } } }, required:['items'] } },
  { name:'add_todo', description:'Add a task for the family',
    input_schema:{ type:'object', properties:{ title:{type:'string'}, due_label:{type:'string'}, priority:{type:'string',enum:['high','medium','low']}, assignee:{type:'string'} }, required:['title'] } },
  { name:'save_recipe', description:'Save a recipe to the family collection',
    input_schema:{ type:'object', properties:{ title:{type:'string'}, content:{type:'string'} }, required:['title','content'] } },
  { name:'add_meal_plan', description:'Add a meal to the meal planner',
    input_schema:{ type:'object', properties:{ day_key:{type:'string',description:'YYYY-MM-DD'}, meal_type:{type:'string',enum:['breakfast','lunch','dinner','snack']}, title:{type:'string'}, notes:{type:'string'} }, required:['day_key','meal_type','title'] } },
  { name:'complete_todo', description:'Mark a task as complete',
    input_schema:{ type:'object', properties:{ title:{type:'string'} }, required:['title'] } },
  { name:'update_calendar_event', description:'Update an existing calendar event — change time, date, duration, or title. Use this instead of adding a new event when the user wants to reschedule or edit.',
    input_schema:{ type:'object', properties:{
      search_title: { type:'string', description:'Title to search for (partial match ok)' },
      new_title:    { type:'string', description:'New title if changing' },
      new_start_time:{ type:'string', description:'New start time ISO 8601 local e.g. 2026-03-15T12:00:00' },
      new_end_time:  { type:'string', description:'New end time ISO 8601 local' },
      new_date:     { type:'string', description:'New date YYYY-MM-DD if moving to different day' },
      new_notes:    { type:'string' },
    }, required:['search_title'] } },
  { name:'delete_calendar_event', description:'Delete a specific calendar event by title and optionally date',
    input_schema:{ type:'object', properties:{
      search_title: { type:'string', description:'Title to search for (partial match ok)' },
      date:         { type:'string', description:'YYYY-MM-DD to narrow to specific occurrence — use this for recurring events' },
    }, required:['search_title'] } },
  { name:'add_recurring_event', description:'Add a recurring event (weekly, fortnightly, monthly) — books individual rows from today until end of current year',
    input_schema:{ type:'object', properties:{
      title:     { type:'string' },
      frequency: { type:'string', enum:['weekly','fortnightly','monthly'], description:'How often the event repeats' },
      start_time:{ type:'string', description:'ISO 8601 local time for first occurrence e.g. 2026-03-12T21:00:00' },
      duration_minutes: { type:'number', description:'Duration in minutes, default 60' },
      notes:     { type:'string' },
    }, required:['title','frequency','start_time'] } },
];

// ── TOOL EXECUTOR ─────────────────────────────────────────────
async function executeTool(name: string, input: any): Promise<string> {
  try {
    if (name === 'add_calendar_event') {
      const localDt  = (input.start_time || '').replace('Z','').split('+')[0];
      const dateOnly = localDt.replace('T',' ').split(' ')[0] || new Date().toISOString().split('T')[0];
      const { error } = await supabase.from('events').insert({
        family_id:  DUMMY_FAMILY_ID,
        title:      input.title,
        date:       dateOnly,
        start_time: localDt,
        end_time:   (input.end_time || input.start_time).replace('Z','').split('+')[0],
        notes:      input.notes || '',
        timezone:   'Australia/Brisbane',  // ← timezone column added
      });
      if (error) throw error;
      return `✅ **${input.title}** added to the calendar.`;
    }
    if (name === 'add_shopping_item') {
      const validCats = ['Fruit & Veg','Dairy & Eggs','Meat & Seafood','Bakery','Pantry','Frozen','Drinks','Snacks','Household','Other'];

      // Duplicate check — fetch existing unchecked items first
      const { data: existing } = await supabase.from('shopping_items').select('name')
        .eq('family_id', DUMMY_FAMILY_ID).eq('checked', false);
      const existingNames: string[] = (existing || []).map((r:any) => r.name.toLowerCase().trim());

      const fuzzy = (a: string, b: string) => {
        const clean = (s: string) => s.toLowerCase()
          .replace(/[^a-z0-9 ]/g, '')
          .replace(/\b(x|pack|kg|g|ml|l|litre|brand|home|organic|fresh|free|range|whole|full|cream|reduced|fat|low|no|barista|original|light)\b/g, '')
          .trim();
        const ca = clean(a); const cb = clean(b);
        if (!ca || !cb) return false;
        if (ca === cb || ca.includes(cb) || cb.includes(ca)) return true;
        const wa = new Set(ca.split(' ').filter((w:string) => w.length > 2));
        const wb = cb.split(' ').filter((w:string) => w.length > 2);
        return wb.filter((w:string) => wa.has(w)).length >= Math.min(2, Math.min(wa.size, wb.length));
      };

      const dupes: string[] = [];
      const newRows: any[] = [];
      for (const i of input.items) {
        const isDupe = existingNames.some(e => fuzzy(e, i.name));
        if (isDupe) dupes.push(i.name);
        else newRows.push({
          family_id: DUMMY_FAMILY_ID,
          name: i.name, item: i.name,
          category: validCats.includes(i.category) ? i.category : 'Other',
          checked: false, completed: false,
          meal_source: i.qty ? i.qty : null,
        });
      }

      let result = '';
      if (newRows.length > 0) {
        console.log('🛒 INSERT rows:', JSON.stringify(newRows));
        const { data: insData, error } = await supabase.from('shopping_items').insert(newRows).select();
        console.log('🛒 INSERT result:', JSON.stringify(insData), 'error:', JSON.stringify(error));
        if (error) return `❌ Failed to add items: ${error.message} (code: ${error.code})`;
        result += `✅ Added: ${newRows.map((r:any)=>`**${r.name}**`).join(', ')}.`;

        // Pantry nudge — check if any added items exist in pantry
        try {
          const addedNames = newRows.map((r:any) => r.name.toLowerCase());
          const { data: pantryData } = await supabase
            .from('pantry_items')
            .select('name, stock')
            .eq('family_id', DUMMY_FAMILY_ID);
          if (pantryData && pantryData.length > 0) {
            const inPantryGood = pantryData.filter((p:any) =>
              addedNames.some((n:string) => p.name.toLowerCase().includes(n) || n.includes(p.name.toLowerCase())) &&
              (p.stock === 'good' || p.stock === 'medium')
            );
            const inPantryLow = pantryData.filter((p:any) =>
              addedNames.some((n:string) => p.name.toLowerCase().includes(n) || n.includes(p.name.toLowerCase())) &&
              (p.stock === 'critical' || p.stock === 'low')
            );
            if (inPantryGood.length > 0) {
              const names = inPantryGood.map((p:any) => `**${p.name}**`).join(', ');
              result += `\n\nHeads up — looks like you've already got ${names} in the pantry.`;
            }
            if (inPantryLow.length > 0) {
              const names = inPantryLow.map((p:any) => `**${p.name}**`).join(', ');
              result += `\n\nGood timing on ${names} — looks like you're running low on that anyway.`;
            }
          }
        } catch (e) { /* pantry check is best-effort, never block */ }
      }
      if (dupes.length > 0) {
        result += `${newRows.length > 0 ? ' ' : ''}⚠️ Already on the list (skipped): ${dupes.map(d=>`**${d}**`).join(', ')}.`;
      }
      return result || '✅ Done.';
    }
    if (name === 'add_todo') {
      const { error } = await supabase.from('todos').insert({ family_id:DUMMY_FAMILY_ID, title:input.title, due_label:input.due_label||'', priority:input.priority||'medium', status:'active', assignee:input.assignee||null });
      if (error) throw error;
      return `✅ Task added: **${input.title}**${input.assignee ? ` for ${input.assignee}` : ''}.`;
    }
    if (name === 'save_recipe') {
      const { error } = await supabase.from('recipes').insert({ family_id:DUMMY_FAMILY_ID, title:input.title, content:input.content, source:'zaeli-chat', created_at:new Date().toISOString() });
      if (error) {
        await supabase.from('shopping_items').insert({ family_id:DUMMY_FAMILY_ID, name:`📋 Recipe: ${input.title}`, category:'Recipes', checked:false });
      }
      return `✅ **${input.title}** saved to your recipe collection! Find it in Meals → Recipes.`;
    }
    if (name === 'add_meal_plan') {
      const { error } = await supabase.from('meal_plans').insert({ family_id:DUMMY_FAMILY_ID, day_key:input.day_key, meal_type:input.meal_type, title:input.title, notes:input.notes||'' });
      if (error) throw error;
      return `✅ **${input.title}** added to meal planner for ${input.day_key}.`;
    }
    if (name === 'update_calendar_event') {
      const { data } = await supabase.from('events').select('id,title,date,start_time,end_time')
        .eq('family_id', DUMMY_FAMILY_ID)
        .ilike('title', `%${input.search_title}%`)
        .order('date')
        .limit(5);
      if (!data || data.length === 0) return `Couldn't find an event matching "${input.search_title}".`;
      // Pick best match — prefer upcoming, or closest to provided date
      const target = data[0];
      const updates: any = {};
      if (input.new_title)      updates.title      = input.new_title;
      if (input.new_notes)      updates.notes      = input.new_notes;
      if (input.new_start_time) updates.start_time = input.new_start_time.replace('Z','').split('+')[0];
      if (input.new_end_time)   updates.end_time   = input.new_end_time.replace('Z','').split('+')[0];
      if (input.new_date) {
        updates.date = input.new_date;
        // Shift start/end times to new date if only date changed
        if (!input.new_start_time && target.start_time) {
          const timePart = target.start_time.split('T')[1] || '12:00:00';
          updates.start_time = `${input.new_date}T${timePart}`;
        }
        if (!input.new_end_time && target.end_time) {
          const timePart = target.end_time.split('T')[1] || '13:00:00';
          updates.end_time = `${input.new_date}T${timePart}`;
        }
      }
      const { error } = await supabase.from('events').update(updates).eq('id', target.id);
      if (error) throw error;
      return `✅ **${input.new_title || target.title}** updated successfully.`;
    }
    if (name === 'delete_calendar_event') {
      let query = supabase.from('events').select('id,title,date')
        .eq('family_id', DUMMY_FAMILY_ID)
        .ilike('title', `%${input.search_title}%`);
      if (input.date) query = query.eq('date', input.date);
      query = query.order('date').limit(1);
      const { data } = await query;
      if (!data || data.length === 0) return `Couldn't find an event matching "${input.search_title}"${input.date ? ` on ${input.date}` : ''}.`;
      const { error } = await supabase.from('events').delete().eq('id', data[0].id);
      if (error) throw error;
      return `✅ **${data[0].title}** on ${data[0].date} deleted.`;
    }
    if (name === 'complete_todo') {
      const { data } = await supabase.from('todos').select('id,title').eq('family_id',DUMMY_FAMILY_ID).eq('status','active').ilike('title',`%${input.title}%`).limit(1);
      if (data && data.length > 0) {
        await supabase.from('todos').update({ status:'done' }).eq('id',data[0].id);
        return `✅ Marked **${data[0].title}** as complete!`;
      }
      return `Couldn't find a task matching "${input.title}".`;
    }
    if (name === 'add_recurring_event') {
      const localDt   = (input.start_time || '').replace('Z','').split('+')[0];
      const durMins   = input.duration_minutes || 60;
      const frequency = input.frequency || 'weekly';
      // Step interval in days
      const stepDays  = frequency === 'weekly' ? 7 : frequency === 'fortnightly' ? 14 : null;
      const stepMonths = frequency === 'monthly' ? 1 : null;

      // Parse first occurrence date/time
      const firstDate = new Date(localDt);
      const endOfYear = new Date(firstDate.getFullYear(), 11, 31, 23, 59, 59);

      const rows: any[] = [];
      let cur = new Date(firstDate);

      while (cur <= endOfYear) {
        const pad = (n: number) => String(n).padStart(2,'0');
        const dateOnly  = `${cur.getFullYear()}-${pad(cur.getMonth()+1)}-${pad(cur.getDate())}`;
        const startISO  = `${dateOnly}T${pad(cur.getHours())}:${pad(cur.getMinutes())}:00`;
        const endDate   = new Date(cur.getTime() + durMins * 60000);
        const endISO    = `${endDate.getFullYear()}-${pad(endDate.getMonth()+1)}-${pad(endDate.getDate())}T${pad(endDate.getHours())}:${pad(endDate.getMinutes())}:00`;

        rows.push({
          family_id:  DUMMY_FAMILY_ID,
          title:      input.title,
          date:       dateOnly,
          start_time: startISO,
          end_time:   endISO,
          notes:      input.notes || `Recurring ${frequency}`,
          timezone:   'Australia/Brisbane',
        });

        // Advance to next occurrence
        if (stepDays) {
          cur = new Date(cur.getTime() + stepDays * 24 * 60 * 60 * 1000);
        } else if (stepMonths) {
          cur = new Date(cur);
          cur.setMonth(cur.getMonth() + 1);
        } else {
          break;
        }
      }

      // Bulk insert in batches of 50 to avoid request size limits
      const BATCH = 50;
      let insertedCount = 0;
      for (let i = 0; i < rows.length; i += BATCH) {
        const { error } = await supabase.from('events').insert(rows.slice(i, i + BATCH));
        if (error) throw error;
        insertedCount += Math.min(BATCH, rows.length - i);
      }

      const endYearStr = `31 Dec ${firstDate.getFullYear()}`;
      return `✅ **${input.title}** booked ${frequency} — **${insertedCount} occurrences** added through ${endYearStr}. I'll remind you near year-end to renew for next year.`;
    }
    return `Tool ${name} not yet implemented.`;
  } catch (e:any) {
    console.log(`Tool error [${name}]:`, e?.message);
    return `I tried but hit a snag — you may need to add it manually for now.`;
  }
}

const CAPABILITY_RULES = `CRITICAL CAPABILITY RULES — never violate:
- Zaeli CANNOT make phone calls. NEVER say "I'll call...", "calling...", or show [initiating call...].
- Zaeli CANNOT send messages, emails or texts autonomously. She can DRAFT them for the user to send.
- Zaeli CANNOT set phone reminders or notification alerts. Do NOT offer to "draft a reminder", "set a reminder", or "send a reminder" about calendar events — the calendar entry IS the reminder. Never use the word "reminder" when referring to a calendar event.
- Zaeli CAN take these autonomous actions: add/update/delete calendar events, add todos/tasks, add shopping items, add meal plans.
- EDITING EVENTS: When the user wants to reschedule, change time/duration, or rename an event — use update_calendar_event. NEVER add a new event and leave the old one. Always update in place.
- RESCHEDULING: If user says "make it Saturday" or "change to 2 hours" — use update_calendar_event, not add_calendar_event.
- If something requires a phone call, offer to help the user know what to say or draft a note/email instead.`;

// ── CHANNEL CONFIG ───────────────────────────────────────────
const CHANNELS: Record<string,{ icon:string; prompt:string; seeds:string[] }> = {
  General:  { icon:'✦',  prompt:`You are Zaeli, a warm family assistant. Help with anything. You can take real actions using tools: add events, tasks, shopping items, recipes and meals. When adding calendar events, use ISO 8601 format for start_time (e.g. 2026-03-11T18:45:00) and always include the date field as YYYY-MM-DD. When the user mentions items to buy, call add_shopping_item IMMEDIATELY with all items — do not ask for confirmation first. Book and save immediately when you have enough info. ${CAPABILITY_RULES}`,
    seeds:["What's on this week?","Help me plan the weekend","Any reminders I should set?"] },
  Calendar: { icon:'📅', prompt:`You are Zaeli, focused on the family calendar. You can add events directly using the add_calendar_event tool. IMPORTANT: When the user gives you enough info to book (a title and rough time), use the tool immediately — do not ask follow-up questions first. Make reasonable assumptions for missing details (default 1hr duration, use today's date if no date given). Always use ISO 8601 format for start_time e.g. 2026-03-11T18:45:00. Confirm what you booked after. ${CAPABILITY_RULES}`,
    seeds:["Any clashes this week?","What's on this weekend?","Schedule something for me"] },
  Shopping: { icon:'🛒', prompt:`You are Zaeli, focused on shopping. CRITICAL RULES — never violate:
1. When the user mentions ANY item to buy, call add_shopping_item IMMEDIATELY — do not ask for confirmation first.
2. ALWAYS call the tool for every new item mentioned, even if it sounds similar to something discussed earlier in the conversation. Each item needs its own tool call result.
3. NEVER tell the user an item is already on the list unless the tool explicitly returned a duplicate warning for that exact item in this response. Do not infer duplicates from conversation context.
4. After the tool responds, report exactly what it said — added items and any duplicates it flagged. Do not add your own assumptions.
${CAPABILITY_RULES}`,
    seeds:["What do we need this week?","Add milk and eggs","What am I missing for dinners?"] },
  Meals:    { icon:'🍽️', prompt:`You are Zaeli, focused on meal planning. You can save recipes and add meals to the planner using tools. ${CAPABILITY_RULES}`,
    seeds:["What should we have tonight?","Plan dinners for the week","Give me a quick Tuesday recipe"] },
  Kids:     { icon:'🌟', prompt:`You are Zaeli, focused on the kids — tasks, activities, school and routines. You can add tasks and events using tools. ${CAPABILITY_RULES}`,
    seeds:["How are the kids tracking?","What jobs are left today?","Ideas for the weekend with kids"] },
  Travel:   { icon:'✈️', prompt:`You are Zaeli, focused on travel. You can add trip events to the calendar using tools. ${CAPABILITY_RULES}`,
    seeds:["Plan a weekend away","What should we pack?","Kid-friendly things to do nearby"] },
};
const CHANNEL_KEYS = Object.keys(CHANNELS);

// ── MAIN SCREEN ──────────────────────────────────────────────
export default function ZaeliChatScreen() {
  const router    = useRouter();
  const params    = useLocalSearchParams<{ channel?: string; returnTo?: string; seedMessage?: string }>();
  const returnTo  = params.returnTo || '/(tabs)/';
  const seedMessage = params.seedMessage || '';
  const scrollRef = useRef<ScrollView>(null);
  const inputRef  = useRef<TextInput>(null);

  const [channelMessages,  setChannelMessages]  = useState<Record<string,Message[]>>({});
  const [input,            setInput]            = useState('');
  const [loading,          setLoading]          = useState(false);
  const [activeCtx,        setActiveCtx]        = useState(params.channel && CHANNEL_KEYS.includes(params.channel) ? params.channel : 'General');
  const [showHints,        setShowHints]        = useState(true);
  const [loadedChans,      setLoadedChans]      = useState<Set<string>>(new Set());
  const [copiedId,         setCopiedId]         = useState<string|null>(null);
  const [feedback,         setFeedback]         = useState<FeedbackState>({});
  const [showScrollBtn,    setShowScrollBtn]    = useState(false);

  const messages = channelMessages[activeCtx] || [];
  const setMessages = (updater: Message[] | ((p:Message[])=>Message[])) => {
    setChannelMessages(prev => {
      const cur = prev[activeCtx] || [];
      const next = typeof updater === 'function' ? updater(cur) : updater;
      // Cap at 60 messages per channel to prevent memory bloat
      const capped = next.length > 60 ? next.slice(next.length - 60) : next;
      return { ...prev, [activeCtx]:capped };
    });
  };

  useEffect(() => {
    if (seedMessage) {
      setChannelMessages(prev => ({ ...prev, [activeCtx]: [] }));
      setLoadedChans(prev => { const n = new Set(prev); n.delete(activeCtx); return n; });
      loadBriefContinuation(activeCtx, seedMessage);
    } else if (loadedChans.has(activeCtx)) {
      const opts = [
        'Hey, back again! What else can I help with? 😊',
        'Hey! What can I do for you? ✨',
        "I'm here — what's on your mind?",
        'Back! What do you need?',
        'Hey, what else can I sort for you?',
      ];
      const note = opts[Math.floor(Math.random() * opts.length)];
      setChannelMessages(prev => ({ ...prev, [activeCtx]: [...(prev[activeCtx]||[]), { id:'re-'+Date.now(), role:'assistant', content:note, time:new Date().toLocaleTimeString('en-AU',{hour:'numeric',minute:'2-digit',hour12:true}).toLowerCase() }] }));
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated:true }), 100);
    } else {
      loadChannelGreeting(activeCtx);
    }
  }, []);

  useEffect(() => {
    if (!loadedChans.has(activeCtx) && !seedMessage) loadChannelGreeting(activeCtx);
    else setTimeout(() => scrollRef.current?.scrollToEnd({ animated:false }), 50);
  }, [activeCtx]);
  // ── BRIEF CONTINUATION ────────────────────────────────────
  const loadBriefContinuation = async (channel: string, brief: string) => {
    setLoadedChans(prev => new Set([...prev, channel]));
    setLoading(true);
    try {
      const now     = new Date();
      const timeStr = now.toLocaleTimeString('en-AU', { hour:'numeric', minute:'2-digit', hour12:true });
      const tod     = now.getHours() < 12 ? 'morning' : now.getHours() < 17 ? 'afternoon' : 'evening';
      const todayStr = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-' + String(now.getDate()).padStart(2,'0');

      const [evR, miR, shR, mlR] = await Promise.all([
        supabase.from('events').select('*').eq('family_id',DUMMY_FAMILY_ID).gte('start_time',todayStr).order('start_time').limit(5),
        supabase.from('missions').select('*').eq('family_id',DUMMY_FAMILY_ID).limit(10),
        supabase.from('shopping_items').select('*').eq('family_id',DUMMY_FAMILY_ID).eq('checked',false).limit(10),
        supabase.from('meal_plans').select('*').eq('family_id',DUMMY_FAMILY_ID).eq('day_key',todayStr).limit(1),
      ]);
      const memCtx = await buildMemoryContext(DUMMY_FAMILY_ID);
      const ctx = `Today: ${now.toDateString()}. Time: ${timeStr}. Events: ${JSON.stringify(evR.data||[])}. Tasks: ${JSON.stringify(miR.data||[])}. Shopping: ${JSON.stringify(shR.data||[])}. Meal: ${JSON.stringify(mlR.data?.[0]||null)}.${memCtx}`;

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method:'POST',
        headers:{ 'Content-Type':'application/json','x-api-key':process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY||'','anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true' },
        body:JSON.stringify({
          model:'claude-sonnet-4-20250514', max_tokens:200,
          system:`You are Zaeli — warm, brilliant, sparkling family assistant. Anne Hathaway energy. Australian warmth. The user has opened the calendar to book a new event. Get straight into it — friendly, warm, and ask what they'd like to book. Keep it to 1-2 sentences max.

IMPORTANT DATE RULE: The seed message contains the exact date the user wants. Use THAT date — do not assume today's date.

RECURRING EVENTS: If the user wants something weekly, fortnightly, or monthly — use add_recurring_event. This books all occurrences through 31 Dec of the current year. Proactively offer this for routines (bins, school pickup, sport, etc).

EDITING EVENTS: If the user wants to change time/duration/date of an existing event — use update_calendar_event. Never create a duplicate. Never leave the old entry.

${CAPABILITY_RULES}

Context: ${ctx}`,
          messages:[{ role:'user', content:`Here is the brief I just showed her:\n\n${brief}\n\nShe tapped yes to get my help. Continue the conversation from here.` }],
        }),
      });
      const d = await res.json();
      const reply = d.content?.[0]?.text || `Right, let's get into it! What would you like to tackle first?`;
      setChannelMessages(prev => ({ ...prev, [channel]:[{ id:'seed-'+channel, role:'assistant', content:reply, time:getTime() }] }));
    } catch {
      setChannelMessages(prev => ({ ...prev, [channel]:[{ id:'seed-'+channel, role:'assistant', content:`Right, let's sort this — where do you want to start?`, time:getTime() }] }));
    } finally { setLoading(false); }
  };

  // ── CHANNEL GREETING ──────────────────────────────────────
  const loadChannelGreeting = async (channel: string) => {
    setLoadedChans(prev => new Set([...prev, channel]));
    setLoading(true);
    try {
      const now      = new Date();
      const hour     = now.getHours();
      const tod      = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
      const todayStr = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-' + String(now.getDate()).padStart(2,'0');
      const timeStr  = now.toLocaleTimeString('en-AU', { hour:'numeric', minute:'2-digit', hour12:true });

      const [evR, miR, mlR] = await Promise.all([
        supabase.from('events').select('*').eq('family_id',DUMMY_FAMILY_ID).gte('start_time',todayStr).order('start_time').limit(5),
        supabase.from('missions').select('*').eq('family_id',DUMMY_FAMILY_ID).limit(10),
        supabase.from('meal_plans').select('*').eq('family_id',DUMMY_FAMILY_ID).eq('day_key',todayStr).limit(1),
      ]);
      const memCtx = await buildMemoryContext(DUMMY_FAMILY_ID);
      const ctx = `Today: ${now.toDateString()}. Current time: ${timeStr} (${tod}). Events: ${JSON.stringify(evR.data||[])}. Tasks: ${JSON.stringify(miR.data||[])}. Meal: ${JSON.stringify(mlR.data?.[0]||null)}.${memCtx}`;
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method:'POST',
        headers:{ 'Content-Type':'application/json','x-api-key':process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY||'','anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true' },
        body:JSON.stringify({ model:'claude-sonnet-4-20250514', max_tokens:120,
          system:`${CHANNELS[channel].prompt} Write a warm greeting for ${DUMMY_MEMBER_NAME} in the ${channel} channel. It is currently ${tod} (${timeStr}), so open with "Good ${tod}" naturally woven in — not robotically. Mention 1-2 things from context if relevant. Max 30 words. One emoji at start only.`,
          messages:[{ role:'user', content:ctx }] }),
      });
      const d = await res.json();
      const greeting = d.content?.[0]?.text || `Good ${tod}, ${DUMMY_MEMBER_NAME}! What can I help with?`;
      setChannelMessages(prev => ({ ...prev, [channel]:[{ id:'g-'+channel, role:'assistant', content:greeting, time:getTime() }] }));
    } catch {
      const tod = new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening';
      setChannelMessages(prev => ({ ...prev, [channel]:[{ id:'g-'+channel, role:'assistant', content:`Good ${tod}, ${DUMMY_MEMBER_NAME}! What can I help with?`, time:getTime() }] }));
    } finally { setLoading(false); }
  };

  // ── SEND + TOOL USE ──────────────────────────────────────────
  const send = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput(''); setShowHints(false); Keyboard.dismiss();

    const userMsg: Message = { id:Date.now().toString(), role:'user', content:msg, time:getTime() };
    const next = [...messages, userMsg];
    setMessages(next);
    setLoading(true);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated:true }), 100);

    try {
      const [evR, miR, shR, memR] = await Promise.all([
        supabase.from('events').select('*').eq('family_id',DUMMY_FAMILY_ID).limit(20),
        supabase.from('missions').select('*').eq('family_id',DUMMY_FAMILY_ID).limit(20),
        supabase.from('shopping_items').select('*').eq('family_id',DUMMY_FAMILY_ID).limit(30),
        supabase.from('family_members').select('*').eq('family_id',DUMMY_FAMILY_ID),
      ]);
      const memCtx = await buildMemoryContext(DUMMY_FAMILY_ID);
      const now        = new Date();
      const localDateStr = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-' + String(now.getDate()).padStart(2,'0');
      const localTimeStr = now.toLocaleTimeString('en-AU', { hour:'numeric', minute:'2-digit', hour12:true });
      const tzOffset   = 'UTC+10 (AEST, Sydney/Brisbane/Melbourne)';
      const ctx = `Family:${JSON.stringify(memR.data)}. Events:${JSON.stringify(evR.data)}. Tasks:${JSON.stringify(miR.data)}. Shopping:${JSON.stringify(shR.data)}. Today local date: ${localDateStr}. Current local time: ${localTimeStr}. Timezone: ${tzOffset}.${memCtx}`;
      const history = next.slice(-10).map(m => ({ role:m.role, content:m.content }));

      const systemPrompt = `${CHANNELS[activeCtx].prompt} Be warm, specific, concise — 1-3 sentences unless more is needed. Bold key info with **word**. If the user asks for MULTIPLE things, use tools for ALL of them — do not stop after the first.

EDITING RULES (critical): When the user wants to reschedule, change time, change duration, or rename an existing event — ALWAYS use update_calendar_event. Never add a duplicate. Never leave the original event. One event per booking.

RECURRING EVENTS: If the user mentions anything weekly, fortnightly, or monthly — use add_recurring_event. This books all occurrences from the first date through 31 Dec of the current year.

CRITICAL: The user is in ${tzOffset}. Always generate start_time/end_time as LOCAL time in ISO 8601 WITHOUT any timezone suffix — e.g. 2026-03-15T12:00:00. Context: ${ctx}`;

      let loopMessages = history.map((m: any) => ({ role: m.role, content: m.content }));
      let finalReply = '';
      const toolResults: string[] = [];

      for (let turn = 0; turn < 6; turn++) {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type':'application/json', 'x-api-key':process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY||'', 'anthropic-version':'2023-06-01', 'anthropic-dangerous-direct-browser-access':'true' },
          body: JSON.stringify({ model:'claude-sonnet-4-20250514', max_tokens:600, system:systemPrompt, tools:TOOL_DEFINITIONS, messages:loopMessages }),
        });
        const d = await res.json();

        if (d.stop_reason === 'tool_use') {
          const textBlock = d.content.find((b:any) => b.type === 'text');
          if (textBlock?.text) {
            setMessages(prev => [...prev, { id:(Date.now()+turn).toString(), role:'assistant', content:textBlock.text, time:getTime() }]);
          }

          const toolBlocks = d.content.filter((b:any) => b.type === 'tool_use');
          const toolResultContents: any[] = [];

          for (const toolBlock of toolBlocks) {
            const result = await executeTool(toolBlock.name, toolBlock.input);
            toolResults.push(result);
            // Don't setMessages per tool — batched below with followUps
            toolResultContents.push({ type:'tool_result', tool_use_id:toolBlock.id, content:result });
          }

          loopMessages = [...loopMessages,
            { role:'assistant', content: d.content },
            { role:'user',      content: toolResultContents },
          ];

        } else {
          finalReply = d.content?.[0]?.text || '';
          break;
        }
      }

      // Batch all follow-up messages into one state update to avoid cascade re-renders
      const followUps: Message[] = [];

      // Add tool result messages
      toolResults.forEach((result, i) => {
        followUps.push({ id:(Date.now()+i+Math.random()).toString(), role:'assistant', content:result, time:getTime(), isToolMsg:true });
      });

      if (finalReply) {
        followUps.push({ id:(Date.now()+10).toString(), role:'assistant', content:finalReply, time:getTime() });
      }
      saveConversation(DUMMY_FAMILY_ID, msg, toolResults.join(' | ') || finalReply);

      for (const recipe of extractRecipes(finalReply)) {
        followUps.push({ id:(Date.now()+15+Math.random()).toString(), role:'assistant',
          content:`💾 Want me to save **${recipe.title}** to your recipes?`, time:getTime(), recipeData:recipe });
      }

      try {
        const reminder = await detectReminderIntent(msg, finalReply, DUMMY_FAMILY_ID);
        if (reminder) {
          const notifId = await scheduleReminder(reminder);
          await supabase.from('todos').insert({ family_id:DUMMY_FAMILY_ID, title:reminder.title, priority:'high', status:'active',
            due_label:`Today at ${reminder.remindAt.toLocaleTimeString('en-AU',{hour:'numeric',minute:'2-digit',hour12:true})}`,
            reminder_time:reminder.remindAt.toISOString(), notif_id:notifId });
          followUps.push({ id:(Date.now()+20).toString(), role:'assistant', isToolMsg:true, time:getTime(),
            content: notifId
              ? `✅ Reminder set for **${reminder.remindAt.toLocaleTimeString('en-AU',{hour:'numeric',minute:'2-digit',hour12:true})}** — added to Today's Focus.`
              : `📝 Added "${reminder.title}" to Today's Focus.` });
        }
      } catch(e) { console.log('Reminder error:', e); }

      // Single batched state update for all follow-up messages
      if (followUps.length > 0) {
        setMessages(prev => [...prev, ...followUps]);
      }
    } catch {
      setMessages(prev => [...prev, { id:(Date.now()+1).toString(), role:'assistant', content:"I'm having trouble connecting. Please try again.", time:getTime() }]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated:true }), 200);
    }
  };

  const retry = async () => {
    const lastUser = [...messages].reverse().find(m => m.role==='user');
    if (!lastUser) {
      setMessages([]);
      setLoadedChans(prev => { const s = new Set(prev); s.delete(activeCtx); return s; });
      loadChannelGreeting(activeCtx);
      return;
    }
    setMessages(prev => {
      const i = [...prev].reverse().findIndex(m => m.role==='assistant');
      return i===-1 ? prev : prev.slice(0, prev.length-1-i);
    });
    await send(lastUser.content);
  };

  const copyMessage = (id:string, text:string) => {
    Clipboard.setString(text.replace(/\*\*(.*?)\*\*/g,'$1'));
    setCopiedId(id);
    if (Platform.OS==='android') ToastAndroid.show('Copied!',ToastAndroid.SHORT);
    setTimeout(()=>setCopiedId(null), 2000);
  };

  const forwardMessage = async (text:string) => {
    try { await Share.share({ message:text.replace(/\*\*(.*?)\*\*/g,'$1') }); } catch{}
  };

  const giveFeedback = (id:string, val:'up'|'down') => {
    setFeedback(prev => ({ ...prev, [id]: prev[id]===val ? null : val }));
  };

  // ── RENDER ────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar style="dark"/>

      {/* ── HEADER ── */}
      <View style={s.hdr}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.push(returnTo as any)} activeOpacity={0.7}>
          <IcoBack/>
        </TouchableOpacity>
        <PulsingAvatar/>
        <View style={{ flex:1, gap:2 }}>
          <Text style={s.hdrName}>
            {'z'}<Text style={{color:C.mag}}>{'a'}</Text>{'el'}<Text style={{color:C.mag}}>{'i'}</Text>
          </Text>
          <Text style={s.hdrStatus}>● Here for your family</Text>
        </View>
      </View>

      {/* ── CHANNEL BAR ── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.ctxBar}
        contentContainerStyle={{ paddingHorizontal:16, paddingVertical:9, gap:6 }}>
        {CHANNEL_KEYS.map(c => (
          <TouchableOpacity key={c} style={[s.ctxChip, activeCtx===c && s.ctxChipOn]}
            onPress={()=>{ setActiveCtx(c); setShowHints(true); }} activeOpacity={0.8}>
            <Text style={[s.ctxChipTxt, activeCtx===c && s.ctxChipTxtOn]}>
              {CHANNELS[c].icon} {c}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── CHAT AREA ── */}
      <View style={{ flex:1 }}>
        <ScrollView ref={scrollRef} style={s.chatScroll}
          contentContainerStyle={{ padding:16, paddingBottom:24 }}
          showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"
          removeClippedSubviews={true}
          onScroll={e=>{
            const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
            setShowScrollBtn(contentSize.height - contentOffset.y - layoutMeasurement.height > 120);
          }} scrollEventThrottle={100}>

          <Text style={s.dateSep}>
            {new Date().toLocaleDateString('en-AU',{weekday:'long',day:'numeric',month:'short'}).toUpperCase()}
          </Text>

          {messages.map((m, idx) => {
            const isZaeli  = m.role === 'assistant';
            const showTime = idx===messages.length-1 || messages[idx+1]?.role!==m.role;
            const fb       = feedback[m.id];
            const isCopied = copiedId===m.id;
            const isLast   = idx===messages.length-1;

            return (
              <View key={m.id} style={{ marginBottom:2 }}>
                <View style={[s.bubbleRow, !isZaeli && s.bubbleRowRight]}>
                  {isZaeli && (
                    <View style={[s.bubbleAv, m.isToolMsg && {backgroundColor:'rgba(0,201,122,0.15)'}]}>
                      <Text style={s.bubbleAvStar}>{m.isToolMsg ? '✓' : '✦'}</Text>
                    </View>
                  )}
                  <View style={{ maxWidth:'76%' }}>
                    <BoldText text={m.content}
                      style={[s.bubble, isZaeli ? s.bubbleZaeli : s.bubbleUser, m.isToolMsg && s.bubbleTool]}/>
                    {m.recipeData && (
                      <TouchableOpacity style={s.recipeBtn} activeOpacity={0.8}
                        onPress={()=>send(`Save the recipe for ${m.recipeData!.title}`)}>
                        <Text style={s.recipeBtnTxt}>💾 Save to recipes</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {isZaeli && !m.isToolMsg && (
                  <View style={s.actRow}>
                    <TouchableOpacity style={s.actBtn} onPress={()=>{}} activeOpacity={0.6}>
                      <IcoPlay/>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.actBtn} onPress={()=>copyMessage(m.id,m.content)} activeOpacity={0.6}>
                      {isCopied ? <IcoCheck/> : <IcoCopy/>}
                    </TouchableOpacity>
                    <TouchableOpacity style={s.actBtn} onPress={()=>forwardMessage(m.content)} activeOpacity={0.6}>
                      <IcoForward/>
                    </TouchableOpacity>
                    <View style={s.actSep}/>
                    <TouchableOpacity style={s.actBtn} onPress={()=>giveFeedback(m.id,'up')} activeOpacity={0.6}>
                      <IcoThumbUp color={fb==='up' ? C.blue : ICON_COLOR}/>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.actBtn} onPress={()=>giveFeedback(m.id,'down')} activeOpacity={0.6}>
                      <IcoThumbDown color={fb==='down' ? C.mag : ICON_COLOR}/>
                    </TouchableOpacity>
                    {isLast && (
                      <TouchableOpacity style={s.actBtn} onPress={retry} activeOpacity={0.6}>
                        <IcoRetry/>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {!isZaeli && (
                  <View style={[s.actRow, {justifyContent:'flex-end'}]}>
                    <TouchableOpacity style={s.actBtn} onPress={()=>copyMessage(m.id,m.content)} activeOpacity={0.6}>
                      {isCopied ? <IcoCheck/> : <IcoCopy/>}
                    </TouchableOpacity>
                    <TouchableOpacity style={s.actBtn} onPress={()=>forwardMessage(m.content)} activeOpacity={0.6}>
                      <IcoForward/>
                    </TouchableOpacity>
                  </View>
                )}

                {showTime && (
                  <Text style={[s.bubbleTime,
                    !isZaeli && {textAlign:'right', marginRight:2},
                    isZaeli && {marginLeft:41}]}>
                    {m.time}
                  </Text>
                )}
              </View>
            );
          })}

          {loading && (
            <View style={s.bubbleRow}>
              <View style={s.bubbleAv}><Text style={s.bubbleAvStar}>✦</Text></View>
              <View style={s.typingBubble}>
                <Text style={s.typingLabel}>Thinking…</Text>
                <View style={{ flexDirection:'row', gap:5, alignItems:'center' }}>
                  {[0,200,400].map(d=><TypingDot key={d} delay={d}/>)}
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {showScrollBtn && (
          <TouchableOpacity style={s.scrollBtn} activeOpacity={0.8}
            onPress={()=>scrollRef.current?.scrollToEnd({animated:true})}>
            <View style={s.scrollDot}/>
            <Text style={s.scrollTxt}>New message</Text>
            <IcoDown/>
          </TouchableOpacity>
        )}
      </View>

      {/* ── INPUT ── */}
      <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':'height'} keyboardVerticalOffset={0}>
        <View style={s.inputArea}>
          <View style={s.inputBox}>
            <TextInput ref={inputRef} style={s.inputField} value={input} onChangeText={setInput}
              placeholder="Ask Zaeli anything…" placeholderTextColor={C.ink3} multiline
              returnKeyType="send" onSubmitEditing={()=>send()}
              onFocus={()=>{ setShowHints(false); setTimeout(()=>scrollRef.current?.scrollToEnd({animated:true}),350); }}/>
            <TouchableOpacity style={s.micBtn} activeOpacity={0.7} onPress={()=>{}}>
              <IcoMic/>
            </TouchableOpacity>
            <TouchableOpacity style={[s.sendBtn, (!input.trim()||loading)&&{opacity:0.4}]}
              onPress={()=>send()} disabled={!input.trim()||loading} activeOpacity={0.8}>
              <IcoSend/>
            </TouchableOpacity>
          </View>
          {showHints && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={{gap:6, paddingTop:10}}>
              {CHANNELS[activeCtx].seeds.map(h=>(
                <TouchableOpacity key={h} style={s.hintChip} onPress={()=>send(h)} activeOpacity={0.8}>
                  <Text style={s.hintTxt}>{h}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── STYLES ───────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:    { flex:1, backgroundColor:'#fff' },

  hdr:      { flexDirection:'row', alignItems:'center', gap:12, paddingHorizontal:16, paddingVertical:12, backgroundColor:'#fff', borderBottomWidth:1, borderBottomColor:C.border },
  backBtn:  { width:34, height:34, alignItems:'center', justifyContent:'center', backgroundColor:'rgba(0,87,255,0.07)', borderRadius:11 },
  av:       { width:42, height:42, borderRadius:13, backgroundColor:C.blue, alignItems:'center', justifyContent:'center', shadowColor:C.blue, shadowOpacity:0.35, shadowRadius:10, shadowOffset:{width:0,height:4} },
  avStar:   { fontSize:20, color:'#fff' },
  hdrName:  { fontFamily:'DMSerifDisplay_400Regular', fontSize:24, color:C.ink, lineHeight:28 },
  hdrStatus:{ fontFamily:'Poppins_600SemiBold', fontSize:11, color:C.green },

  ctxBar:       { backgroundColor:'rgba(0,87,255,0.04)', borderBottomWidth:1, borderBottomColor:C.border, flexGrow:0 },
  ctxChip:      { paddingHorizontal:11, paddingVertical:5, borderRadius:20, backgroundColor:'#fff', borderWidth:1.5, borderColor:'rgba(0,0,0,0.10)' },
  ctxChipOn:    { backgroundColor:C.blue, borderColor:C.blue },
  ctxChipTxt:   { fontFamily:'Poppins_600SemiBold', fontSize:11, color:C.ink2 },
  ctxChipTxtOn: { color:'#fff' },

  chatScroll: { flex:1, backgroundColor:C.chatBg },
  dateSep:    { fontFamily:'Poppins_700Bold', fontSize:10, color:C.ink3, textTransform:'uppercase', letterSpacing:1.2, textAlign:'center', marginBottom:16 },

  bubbleRow:      { flexDirection:'row', gap:9, alignItems:'flex-end' },
  bubbleRowRight: { flexDirection:'row-reverse' },
  bubbleAv:       { width:32, height:32, borderRadius:10, backgroundColor:C.blue, alignItems:'center', justifyContent:'center', flexShrink:0, shadowColor:C.blue, shadowOpacity:0.2, shadowRadius:6, shadowOffset:{width:0,height:2} },
  bubbleAvStar:   { fontSize:14, color:'#fff' },
  bubble:         { paddingHorizontal:14, paddingVertical:11, fontFamily:'Poppins_400Regular', fontSize:15, lineHeight:24 },
  bubbleZaeli:    { backgroundColor:'#fff', borderRadius:4, borderTopRightRadius:18, borderBottomLeftRadius:18, borderBottomRightRadius:18, color:C.ink, shadowColor:'#000', shadowOpacity:0.07, shadowRadius:8, shadowOffset:{width:0,height:2} },
  bubbleUser:     { backgroundColor:C.blue, borderRadius:18, borderTopRightRadius:4, color:'#fff' },
  bubbleTool:     { backgroundColor:'rgba(0,201,122,0.06)', borderWidth:1, borderColor:'rgba(0,201,122,0.2)', color:C.ink, fontSize:14 },
  bubbleTime:     { fontFamily:'Poppins_400Regular', fontSize:10, color:C.ink3, marginTop:3, marginBottom:4 },

  recipeBtn:    { marginTop:6, marginLeft:41, alignSelf:'flex-start', backgroundColor:'rgba(0,87,255,0.07)', borderRadius:20, paddingHorizontal:12, paddingVertical:6, borderWidth:1, borderColor:'rgba(0,87,255,0.15)' },
  recipeBtnTxt: { fontFamily:'Poppins_600SemiBold', fontSize:12, color:C.blue },

  actRow: { flexDirection:'row', alignItems:'center', marginLeft:41, marginTop:3, marginBottom:8 },
  actBtn: { width:30, height:30, alignItems:'center', justifyContent:'center', borderRadius:8 },
  actSep: { width:1, height:10, backgroundColor:'rgba(0,0,0,0.10)', marginHorizontal:4 },

  typingBubble: { backgroundColor:'rgba(0,87,255,0.05)', borderWidth:1.5, borderColor:'rgba(0,87,255,0.12)', borderRadius:4, borderTopRightRadius:18, borderBottomLeftRadius:18, borderBottomRightRadius:18, paddingHorizontal:14, paddingVertical:11 },
  typingLabel:  { fontFamily:'Poppins_700Bold', fontSize:10, textTransform:'uppercase', letterSpacing:1, color:C.blue, marginBottom:8 },

  scrollBtn: { position:'absolute', bottom:10, right:12, flexDirection:'row', alignItems:'center', gap:5, backgroundColor:'#fff', borderRadius:20, paddingHorizontal:12, paddingVertical:6, borderWidth:1.5, borderColor:'rgba(0,0,0,0.08)', shadowColor:'#000', shadowOpacity:0.1, shadowRadius:8, shadowOffset:{width:0,height:2} },
  scrollDot: { width:7, height:7, borderRadius:4, backgroundColor:C.mag },
  scrollTxt: { fontFamily:'Poppins_700Bold', fontSize:11, color:C.blue },

  inputArea:  { backgroundColor:'#fff', borderTopWidth:1, borderTopColor:C.border, paddingHorizontal:14, paddingTop:10, paddingBottom:Platform.OS==='ios' ? 28 : 12 },
  inputBox:   { flexDirection:'row', alignItems:'center', gap:8, backgroundColor:C.bg, borderWidth:1.5, borderColor:'rgba(0,0,0,0.10)', borderRadius:18, paddingHorizontal:14, paddingVertical:10 },
  inputField: { flex:1, fontFamily:'Poppins_400Regular', fontSize:15, color:C.ink, maxHeight:100 },
  micBtn:     { width:36, height:36, alignItems:'center', justifyContent:'center', backgroundColor:'rgba(0,0,0,0.06)', borderRadius:11 },
  sendBtn:    { width:36, height:36, borderRadius:11, backgroundColor:C.blue, alignItems:'center', justifyContent:'center', shadowColor:C.blue, shadowOpacity:0.3, shadowRadius:6, shadowOffset:{width:0,height:2} },
  hintChip:   { paddingHorizontal:14, paddingVertical:7, borderRadius:20, backgroundColor:C.bg, borderWidth:1.5, borderColor:'rgba(0,0,0,0.10)' },
  hintTxt:    { fontFamily:'Poppins_500Medium', fontSize:12, color:C.ink2 },
});
