import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  Modal, Platform, KeyboardAvoidingView, Animated, Easing,
  StyleSheet, Share, Alert,
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
import Svg, { Rect, Path, Line, Polyline, Circle, Polygon } from 'react-native-svg';
import { Audio } from 'expo-av';
import { NavMenu, HamburgerButton } from '../components/NavMenu';
import { useChatPersistence, type PersistedMsg } from '../../lib/use-chat-persistence';
import { supabase } from '../../lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import { callClaude } from '../../lib/api-logger';
import { getZaeliProvider } from '../../lib/zaeli-provider';

const DUMMY_FAMILY_ID = '00000000-0000-0000-0000-000000000001';
const DUMMY_USER_NAME = 'Anna';
const IS_PARENT = true;
const ANTHROPIC_API_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY || '';

const C = {
  bg: '#FAF8F5', card: '#FFFFFF', border: '#E0E0E0',
  ink: '#0A0A0A', ink2: 'rgba(0,0,0,0.50)', ink3: 'rgba(0,0,0,0.28)',
  dark: '#0A0A0A',
  // Shopping channel colours
  bannerBg: '#EDE8FF',      // light lavender banner
  ai:  '#D8CCFF',           // lavender — Zaeli/AI accent
  aiL: 'rgba(216,204,255,0.12)', // lavender light bg
  aiB: 'rgba(216,204,255,0.35)', // lavender border
  accent: '#5020C0',        // deep purple — accent text
  // Keep blue alias pointing to ai colour for Zaeli elements
  blue: '#D8CCFF', blueL: 'rgba(216,204,255,0.12)', blueB: 'rgba(216,204,255,0.35)',
  green: '#00C97A', greenL: 'rgba(0,201,122,0.10)', greenB: 'rgba(0,201,122,0.28)',
  orange: '#FF8C00', orangeL: 'rgba(255,140,0,0.10)',
  red: '#FF3B3B', redL: 'rgba(255,59,59,0.08)',
  yellow: '#FFE500', yellowD: '#B8A400',
  mag: '#E0007C',
  shopTick: '#5020C0',
};

const STOCK_META: Record<string, { label: string; color: string; bg: string; bars: number }> = {
  critical: { label: 'Critical',    color: C.red,    bg: C.redL,    bars: 1 },
  low:      { label: 'Low',         color: C.orange, bg: C.orangeL, bars: 2 },
  medium:   { label: 'Medium',      color: C.yellowD, bg: 'rgba(255,229,0,0.12)', bars: 3 },
  good:     { label: 'Good',        color: C.green,  bg: C.greenL,  bars: 4 },
};

type ShopItem = {
  id: string; name: string; category: string;
  checked: boolean; meal_source: string | null;
  created_at?: string;
};

// ChatMsg matches PersistedMsg from useChatPersistence
type ChatMsg = PersistedMsg;

type PantryItem = {
  id: string; name: string; emoji: string;
  stock: 'critical' | 'low' | 'medium' | 'good';
  quantity: string | null;
  family_id: string;
};

type ScannedPantryItem = {
  name: string; emoji: string;
  stock: 'critical' | 'low' | 'medium' | 'good';
  quantity: string | null;
};

type ReceiptItem = {
  name: string; emoji: string; qty: string | null; price: number | null; category: string;
};

type Receipt = {
  id: string; store: string; purchase_date: string;
  total_amount: number | null; item_count: number; items: ReceiptItem[];
};

// Food categories that sync to Pantry when ticked
const FOOD_CATEGORIES = ['Fruit & Veg','Dairy & Eggs','Meat & Seafood','Bakery','Pantry','Frozen','Drinks','Snacks'];

// ── Icons ─────────────────────────────────────────────────────────────────────
function IcoMic({ color = 'rgba(0,0,0,0.45)', size = 18 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
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
function IcoTrash({ color = 'rgba(0,0,0,0.25)' }: { color?: string }) {
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
      <Path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"/>
    </Svg>
  );
}
function IcoShare({ color = 'rgba(0,0,0,0.55)' }: { color?: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/>
      <Polyline points="16 6 12 2 8 6" stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      <Line x1="12" y1="2" x2="12" y2="15" stroke={color} strokeWidth={2} strokeLinecap="round"/>
    </Svg>
  );
}
function IcoCamera({ color = '#fff' }: { color?: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"/>
      <Circle cx="12" cy="13" r="4" stroke={color} strokeWidth={1.8}/>
    </Svg>
  );
}
function IcoPlus({ color = C.blue }: { color?: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Line x1="12" y1="5" x2="12" y2="19" stroke={color} strokeWidth={2.5} strokeLinecap="round"/>
      <Line x1="5" y1="12" x2="19" y2="12" stroke={color} strokeWidth={2.5} strokeLinecap="round"/>
    </Svg>
  );
}
function IcoPencil({ color = C.ink2 }: { color?: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"/>
      <Path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"/>
    </Svg>
  );
}

// PulsingAvatar removed — Option B design uses ambient strip instead

// ── Chat message icons (matching Calendar) ───────────────────────────────────
const INK3_SHOP = 'rgba(0,0,0,0.28)';
function IcoCopy() {
  return <Svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={INK3_SHOP} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><Rect x="9" y="9" width="13" height="13" rx="2"/><Path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></Svg>;
}
function IcoForward() {
  return <Svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={INK3_SHOP} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><Line x1="22" y1="2" x2="11" y2="13"/><Polygon points="22 2 15 22 11 13 2 9 22 2"/></Svg>;
}
function IcoThumbUp({ active }: { active: boolean }) {
  const col = active ? C.accent : INK3_SHOP;
  return <Svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><Path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z"/><Path d="M7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"/></Svg>;
}
function IcoThumbDown({ active }: { active: boolean }) {
  const col = active ? C.ink2 : INK3_SHOP;
  return <Svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><Path d="M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3H10z"/><Path d="M17 2h2.67A2.31 2.31 0 0122 4v7a2.31 2.31 0 01-2.33 2H17"/></Svg>;
}

function TypingDots() {
  const anims = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];
  useEffect(() => {
    const makeSeq = (a: Animated.Value, delay: number) =>
      Animated.loop(Animated.sequence([
        Animated.delay(delay),
        Animated.timing(a, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(a, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.delay(600),
      ]));
    const anim = Animated.parallel(anims.map((a, i) => makeSeq(a, i * 160)));
    anim.start();
    return () => anim.stop();
  }, []);
  return (
    <View style={{ flexDirection: 'row', gap: 6, paddingVertical: 8 }}>
      {anims.map((a, i) => (
        <Animated.View key={i} style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: C.blue, opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0,1], outputRange: [0,-4] }) }] }} />
      ))}
    </View>
  );
}

// ── Scanning bottom sheet ──────────────────────────────────────────────────────
function ScanningSheet({ visible }: { visible: boolean }) {
  const slideAnim = useRef(new Animated.Value(200)).current;
  const [step, setStep] = useState(0);
  const steps = ['Reading your photo…', 'Identifying items…', 'Almost done…'];
  const dotAnims = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];

  useEffect(() => {
    if (visible) {
      setStep(0);
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }).start();
      const t1 = setTimeout(() => setStep(1), 2000);
      const t2 = setTimeout(() => setStep(2), 4500);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    } else {
      Animated.timing(slideAnim, { toValue: 200, duration: 250, useNativeDriver: true }).start();
    }
  }, [visible]);

  useEffect(() => {
    const makeSeq = (a: Animated.Value, delay: number) =>
      Animated.loop(Animated.sequence([
        Animated.delay(delay),
        Animated.timing(a, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.timing(a, { toValue: 0, duration: 350, useNativeDriver: true }),
        Animated.delay(700),
      ]));
    const anim = Animated.parallel(dotAnims.map((a, i) => makeSeq(a, i * 180)));
    if (visible) anim.start();
    return () => anim.stop();
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={s.scanSheetOverlay} pointerEvents="none">
      <Animated.View style={[s.scanSheet, { transform: [{ translateY: slideAnim }] }]}>
        <View style={s.scanSheetHandle} />
        <View style={s.scanSheetRow}>
          <View style={s.scanSheetAv}>
            <Text style={{ color: '#fff', fontSize: 15 }}>✦</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.scanSheetTitle}>Scanning…</Text>
            <Text style={s.scanSheetStep}>{steps[step]}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 5, alignItems: 'center' }}>
            {dotAnims.map((a, i) => (
              <Animated.View key={i} style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: C.blue, opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0,1], outputRange: [0,-4] }) }] }} />
            ))}
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

// ── AI helpers ────────────────────────────────────────────────────────────────
function guessCategory(itemName: string): Promise<string> {
  const n = itemName.toLowerCase();
  const rules: [string[], string][] = [
    [['apple','banana','orange','grape','berry','mango','avocado','tomato','potato','carrot','onion','garlic','lettuce','spinach','broccoli','zucchini','capsicum','cucumber','lemon','lime','pear','peach','melon','kiwi','pineapple','strawberry','mushroom','celery','corn','pea','bean','herb','ginger','rocket','leek','cauliflower','pumpkin','sweet potato','blueberry','raspberry','cherry','fig','nectarine','plum','fennel','beetroot','radish','silverbeet'], 'Fruit & Veg'],
    [['milk','cheese','yoghurt','yogurt','butter','cream','egg','feta','mozzarella','parmesan','ricotta','sour cream','custard','dairy','cheddar','brie','haloumi'], 'Dairy & Eggs'],
    [['chicken','beef','lamb','pork','mince','steak','sausage','bacon','ham','turkey','fish','salmon','tuna','prawn','shrimp','seafood','salami','pepperoni','chorizo','veal','duck','venison'], 'Meat & Seafood'],
    [['bread','roll','bun','croissant','muffin','cake','pastry','bagel','wrap','pita','sourdough','loaf','toast','brioche','focaccia','crumpet'], 'Bakery'],
    [['ice cream','frozen','edamame','gelato'], 'Frozen'],
    [['water','juice','soft drink','soda','coffee','tea','kombucha','energy drink','wine','beer','alcohol','drink','beverage','cordial','coconut water','sparkling'], 'Drinks'],
    [['chip','crisp','cracker','biscuit','chocolate','lolly','candy','nut','almond','cashew','popcorn','muesli bar','tim tam','snack','pretzel','rice cake'], 'Snacks'],
    [['detergent','soap','shampoo','conditioner','toothpaste','toilet paper','tissue','cleaner','spray','sponge','bin bag','foil','wrap','nappy','pad','tampon','razor','deodorant','sunscreen','dishwasher','laundry','bleach','disinfectant'], 'Household'],
    [['pasta','rice','flour','sugar','salt','pepper','oil','sauce','vinegar','stock','broth','can','tin','jar','cereal','oat','honey','jam','spread','mayonnaise','ketchup','mustard','soy','curry','spice','noodle','lentil','chickpea','quinoa','couscous','polenta','breadcrumb','coconut milk','tomato paste','peanut butter','vegemite'], 'Pantry'],
  ];
  for (const [keywords, cat] of rules) {
    if (keywords.some(k => n.includes(k))) return Promise.resolve(cat);
  }
  return Promise.resolve('Other');
}

async function scanPantryImage(base64: string): Promise<ScannedPantryItem[]> {
  try {
    if (!base64 || base64.length < 100) return [];
    const data = await callClaude({
      feature: 'pantry_scan',
      familyId: DUMMY_FAMILY_ID,
      body: {
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64 } },
            { type: 'text', text: `You are scanning a fridge or pantry shelf photo. List every distinct food/product item you can see.\n\nFor each item, estimate how much is left:\n- critical = almost empty\n- low = less than 25% remaining\n- medium = roughly half\n- good = well stocked\n\nRespond ONLY as a JSON array, no markdown:\n[{"name":"Full cream milk","emoji":"🥛","stock":"low","quantity":"1L remaining"},...]\n\nRules:\n- Use common household names\n- Max 20 items\n- If no food items visible, return []` }
          ]
        }],
      },
    });
    const raw = data?.content?.[0]?.text || '[]';
    return JSON.parse(raw.replace(/```json|```/g, '').trim()) as ScannedPantryItem[];
  } catch { return []; }
}

// ── Scan image — auto-detects pantry vs receipt ───────────────────────────────
async function scanAnyImage(base64: string): Promise<{ type: 'pantry'; items: ScannedPantryItem[] } | { type: 'receipt'; data: Omit<Receipt,'id'> }> {
  try {
    if (!base64 || base64.length < 100) return { type: 'pantry', items: [] };
    const data = await callClaude({
      feature: 'receipt_scan',
      familyId: DUMMY_FAMILY_ID,
      body: {
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64 } },
            { type: 'text', text: `Look at this image carefully. Determine if it is:
A) A receipt or docket (printed paper with itemised purchases and prices)
B) A fridge, pantry, or shelf photo showing food/products

If A — RECEIPT: Extract the purchase data.
Respond ONLY as JSON (no markdown):
{"imageType":"receipt","store":"Woolworths","purchase_date":"2026-03-15","total_amount":124.50,"items":[{"name":"Full cream milk 2L","emoji":"🥛","qty":"1","price":3.50,"category":"Dairy & Eggs"},...],"item_count":14}

Categories must be one of: Fruit & Veg, Dairy & Eggs, Meat & Seafood, Bakery, Pantry, Frozen, Drinks, Snacks, Household, Other
If store name is unclear write "Unknown store". If total is unclear set null. Max 30 items.

If B — PANTRY SCAN: List every distinct food/product visible. Estimate stock level.
Respond ONLY as JSON (no markdown):
{"imageType":"pantry","items":[{"name":"Full cream milk","emoji":"🥛","stock":"low","quantity":"1L remaining"},...]}`}
          ]
        }],
      },
    });
    const raw = data?.content?.[0]?.text || '{}';
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
    if (parsed.imageType === 'receipt') {
      return {
        type: 'receipt',
        data: {
          store: parsed.store || 'Unknown store',
          purchase_date: parsed.purchase_date || new Date().toISOString().split('T')[0],
          total_amount: parsed.total_amount ?? null,
          item_count: parsed.item_count || (parsed.items?.length ?? 0),
          items: parsed.items || [],
        },
      };
    }
    return { type: 'pantry', items: parsed.items || [] };
  } catch { return { type: 'pantry', items: [] }; }
}

// ── Sync food items to Pantry (used after ticking off or receipt scan) ────────
async function syncItemsToPantry(itemNames: { name: string; emoji?: string; qty?: string | null }[]) {
  for (const item of itemNames) {
    const { data: existing } = await supabase.from('pantry_items').select('id')
      .eq('family_id', DUMMY_FAMILY_ID).ilike('name', item.name).limit(1);
    if (existing && existing.length > 0) {
      await supabase.from('pantry_items').update({ stock: 'good', quantity: item.qty || null }).eq('id', existing[0].id);
    } else {
      await supabase.from('pantry_items').insert({
        family_id: DUMMY_FAMILY_ID, name: item.name,
        emoji: item.emoji || '🛒', stock: 'good', quantity: item.qty || null,
      });
    }
  }
}

const CAT_EMOJI: Record<string, string> = {
  'Fruit & Veg': '🥦', 'Dairy & Eggs': '🥛', 'Meat & Seafood': '🥩',
  'Bakery': '🍞', 'Pantry': '🫙', 'Frozen': '🧊',
  'Drinks': '🥤', 'Snacks': '🍪', 'Household': '🧹', 'Other': '🛒',
};
const CATEGORIES = Object.keys(CAT_EMOJI);

// ── Shopping Msg type ────────────────────────────────────────────────────────
interface ShopMsg {
  id: string; role: 'user' | 'zaeli'; text: string;
  isLoading?: boolean; quickReplies?: string[];
}

// ── Shopping Tools (Claude Sonnet) ────────────────────────────────────────────
const SHOP_TOOLS = [
  { name: 'add_shopping_item',
    description: 'Add one or more items to the shopping list.',
    input_schema: { type: 'object', properties: {
      items: { type: 'array', items: { type: 'string' }, description: 'Item names to add' },
    }, required: ['items'] } },
  { name: 'remove_shopping_item',
    description: 'Remove an item from the shopping list by name.',
    input_schema: { type: 'object', properties: {
      name: { type: 'string', description: 'Item name to remove (partial match ok)' },
    }, required: ['name'] } },
  { name: 'tick_shopping_item',
    description: 'Mark a shopping item as bought/checked.',
    input_schema: { type: 'object', properties: {
      name: { type: 'string', description: 'Item name to tick (partial match ok)' },
    }, required: ['name'] } },
  { name: 'clear_shopping_list',
    description: 'Mark all unchecked shopping items as bought.',
    input_schema: { type: 'object', properties: {} } },
];

async function executeShopTool(
  name: string, input: any,
  shopItems: ShopItem[],
  onRefresh: () => void,
  guesscat: (n: string) => Promise<string>,
): Promise<string> {
  try {
    if (name === 'add_shopping_item') {
      const toAdd: string[] = input.items || [];
      for (const itemName of toAdd) {
        const already = shopItems.find(i => i.name.toLowerCase() === itemName.toLowerCase() && !i.checked);
        if (already) continue;
        const category = await guesscat(itemName);
        await supabase.from('shopping_items').insert({
          family_id: DUMMY_FAMILY_ID, name: itemName, item: itemName,
          category, checked: false, completed: false, meal_source: null,
        });
      }
      onRefresh();
      return toAdd.length === 1 ? `Added ${toAdd[0]}.` : `Added ${toAdd.join(', ')}.`;
    }
    if (name === 'remove_shopping_item') {
      const match = shopItems.find(i => i.name.toLowerCase().includes(input.name.toLowerCase()));
      if (!match) return `Could not find "${input.name}" on the list.`;
      await supabase.from('shopping_items').delete().eq('id', match.id);
      onRefresh();
      return `Removed ${match.name}.`;
    }
    if (name === 'tick_shopping_item') {
      const match = shopItems.find(i => i.name.toLowerCase().includes(input.name.toLowerCase()) && !i.checked);
      if (!match) return `Could not find "${input.name}" on the list.`;
      await supabase.from('shopping_items').update({ checked: true, completed: true }).eq('id', match.id);
      if (FOOD_CATEGORIES.includes(match.category)) {
        syncItemsToPantry([{ name: match.name }]).catch(() => {});
      }
      onRefresh();
      return `Ticked off ${match.name}.`;
    }
    if (name === 'clear_shopping_list') {
      await supabase.from('shopping_items')
        .update({ checked: true, completed: true })
        .eq('family_id', DUMMY_FAMILY_ID).eq('checked', false);
      onRefresh();
      return 'All items marked as bought.';
    }
    return `Unknown tool: ${name}`;
  } catch (e: any) {
    return `Tool failed: ${e?.message ?? 'unknown error'}`;
  }
}

// ── Inline chat GPT call ─────────────────────────────────────────────────────
const OPENAI_URL_SHOP = 'https://api.openai.com/v1/chat/completions';
const GPT_MINI = 'gpt-5.4-mini';

async function callShopGPT(system: string, userMsg: string, maxTokens = 200): Promise<string> {
  const key = process.env.EXPO_PUBLIC_OPENAI_API_KEY || '';
  if (!key) return '';
  const res = await fetch(OPENAI_URL_SHOP, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
    body: JSON.stringify({ model: GPT_MINI, max_completion_tokens: maxTokens,
      messages: [{ role: 'system', content: system }, { role: 'user', content: userMsg }] }),
  });
  const d = await res.json();
  try {
    const u = d.usage || {};
    const cost = ((u.prompt_tokens || 0) / 1e6 * 0.15) + ((u.completion_tokens || 0) / 1e6 * 0.60);
    supabase.from('api_logs').insert({ family_id: DUMMY_FAMILY_ID, feature: 'shopping_chat',
      model: GPT_MINI, input_tokens: u.prompt_tokens || 0, output_tokens: u.completion_tokens || 0, cost_usd: cost });
  } catch {}
  return d.choices?.[0]?.message?.content || '';
}

// ── Ambient strip text — pure local calculation, no API ───────────────────
function getAmbientText(uncheckedItems: ShopItem[], lowItems: string[]): string {
  const count = uncheckedItems.length;
  if (count === 0) return 'List is clear — nothing needed right now.';
  const lowPart = lowItems.length > 0
    ? ` · ${lowItems.slice(0, 2).join(', ')}${lowItems.length > 2 ? ` +${lowItems.length - 2} more` : ''} flagged low`
    : '';
  return `${count} item${count !== 1 ? 's' : ''} on the list${lowPart}.`;
}

// ── WaveformBars (for bar mic active state) ──────────────────────────────────
function WaveformBars() {
  const anims = useRef(Array.from({ length: 5 }, (_, i) => new Animated.Value(0.3 + i * 0.1))).current;
  useEffect(() => {
    const loops = anims.map((anim, i) => {
      const min = 0.2 + i * 0.05, max = 0.7 + (i % 3) * 0.15, spd = 180 + i * 55;
      return Animated.loop(Animated.sequence([
        Animated.timing(anim, { toValue: max, duration: spd, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(anim, { toValue: min, duration: spd + 40, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]));
    });
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, []);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
      {anims.map((anim, i) => <Animated.View key={i} style={{ width: 3.5, height: 18, borderRadius: 2, backgroundColor: '#fff', transform: [{ scaleY: anim }] }} />)}
    </View>
  );
}

// ── MicWaveform (large overlay bars) ─────────────────────────────────────────
function MicWaveform() {
  const anims = useRef(Array.from({ length: 13 }, (_, i) => new Animated.Value(0.15 + (i % 3) * 0.1))).current;
  useEffect(() => {
    const loops = anims.map((anim, i) => {
      const min = 0.1 + (i % 4) * 0.05, max = 0.6 + (i % 5) * 0.08, spd = 280 + (i % 6) * 60;
      return Animated.loop(Animated.sequence([
        Animated.delay(i * 55),
        Animated.timing(anim, { toValue: max, duration: spd, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(anim, { toValue: min, duration: spd + 40, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]));
    });
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, []);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, height: 52 }}>
      {anims.map((anim, i) => (
        <Animated.View key={i} style={{ width: 4, borderRadius: 3, backgroundColor: C.ai, transform: [{ scaleY: anim }], height: 52 }} />
      ))}
    </View>
  );
}

function IcoArrowDown() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Line x1="12" y1="5" x2="12" y2="19" stroke="#fff" strokeWidth={2.5} strokeLinecap="round"/>
      <Polyline points="19 12 12 19 5 12" stroke="#fff" strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    </Svg>
  );
}

// ── Stock bars ────────────────────────────────────────────────────────────────
function StockBars({ stock, size = 'md' }: { stock: string; size?: 'sm' | 'md' }) {
  const meta = STOCK_META[stock] || STOCK_META.good;
  const h = size === 'sm' ? 8 : 10;
  const w = size === 'sm' ? 5 : 6;
  return (
    <View style={{ flexDirection: 'row', gap: 2, alignItems: 'flex-end' }}>
      {[1,2,3,4].map(n => (
        <View key={n} style={{ width: w, height: h * (n / 4) + (h * 0.5), borderRadius: 2, backgroundColor: n <= meta.bars ? meta.color : C.border }} />
      ))}
    </View>
  );
}

// ── Pantry item row ───────────────────────────────────────────────────────────
function PantryRow({ item, shoppingItems, onEdit, onDelete, onAddToList }: {
  item: PantryItem;
  shoppingItems: ShopItem[];
  onEdit: () => void;
  onDelete: () => void;
  onAddToList: () => void;
}) {
  const meta = STOCK_META[item.stock] || STOCK_META.good;
  const onList = shoppingItems.some(s => s.name.toLowerCase() === item.name.toLowerCase() && !s.checked);
  const barPct = { critical: 0.15, low: 0.38, medium: 0.65, good: 1 }[item.stock] ?? 1;

  return (
    <TouchableOpacity style={s.pantryRow} onPress={onEdit} activeOpacity={0.7}>
      {/* Stock level indicator — 4 small bars, left side */}
      <View style={{ flexDirection: 'row', gap: 2, alignItems: 'flex-end', flexShrink: 0, marginRight: 10 }}>
        {[1,2,3,4].map(n => (
          <View key={n} style={{ width: 4, height: 6 + n * 3, borderRadius: 2, backgroundColor: n <= meta.bars ? meta.color : C.border }} />
        ))}
      </View>
      {/* Emoji */}
      <Text style={s.pantryEmoji}>{item.emoji}</Text>
      {/* Name + qty */}
      <View style={{ flex: 1 }}>
        <Text style={s.pantryName}>{item.name}</Text>
        {item.quantity ? <Text style={s.pantryQty}>{item.quantity}</Text> : null}
      </View>
      {/* On list badge or + List button */}
      {onList ? (
        <View style={s.pantryOnListBadge}>
          <Text style={s.pantryOnListTxt}>On list ✓</Text>
        </View>
      ) : (
        <TouchableOpacity style={s.pantryListBtn} onPress={onAddToList} activeOpacity={0.8}>
          <Text style={s.pantryListBtnTxt}>+ List</Text>
        </TouchableOpacity>
      )}
      {IS_PARENT && (
        <TouchableOpacity style={s.pantryDelBtn} onPress={onDelete} activeOpacity={0.7}>
          <IcoTrash />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

// ── Pantry Scan Review Modal ──────────────────────────────────────────────────
function PantryScanReviewModal({ visible, scanned, existing, onConfirm, onCancel }: {
  visible: boolean;
  scanned: ScannedPantryItem[];
  existing: PantryItem[];
  onConfirm: (items: ScannedPantryItem[]) => void;
  onCancel: () => void;
}) {
  const [items, setItems] = useState<ScannedPantryItem[]>([]);

  useEffect(() => {
    if (visible) setItems(scanned);
  }, [visible, scanned]);

  const remove = (i: number) => setItems(prev => prev.filter((_, idx) => idx !== i));

  const updated = items.filter(i => existing.some(e => e.name.toLowerCase() === i.name.toLowerCase()));
  const added   = items.filter(i => !existing.some(e => e.name.toLowerCase() === i.name.toLowerCase()));

  const Section = ({ title, color, data }: { title: string; color: string; data: ScannedPantryItem[] }) => {
    if (!data.length) return null;
    return (
      <View style={{ marginBottom: 16 }}>
        <Text style={[s.reviewSectionTitle, { color }]}>{title}</Text>
        {data.map((item, i) => {
          const globalIdx = items.indexOf(item);
          const meta = STOCK_META[item.stock] || STOCK_META.good;
          return (
            <View key={i} style={s.reviewRow}>
              <Text style={s.reviewEmoji}>{item.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.reviewName}>{item.name}</Text>
                {item.quantity ? <Text style={s.reviewQty}>{item.quantity}</Text> : null}
              </View>
              <View style={[s.pantryBadge, { backgroundColor: meta.bg }]}>
                <Text style={[s.pantryBadgeTxt, { color: meta.color }]}>{meta.label}</Text>
              </View>
              <TouchableOpacity onPress={() => remove(globalIdx)} style={s.reviewRemove} activeOpacity={0.7}>
                <Text style={s.reviewRemoveTxt}>✕</Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onCancel}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top']}>
        <View style={s.modalHdr}>
          <TouchableOpacity onPress={onCancel}><Text style={s.modalCancel}>Cancel</Text></TouchableOpacity>
          <View style={{ alignItems: 'center' }}>
            <Text style={s.modalTitle}>Review Scan</Text>
            <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 11, color: C.ink3 }}>{items.length} item{items.length !== 1 ? 's' : ''} found</Text>
          </View>
          <TouchableOpacity onPress={() => onConfirm(items)} disabled={!items.length}>
            <Text style={[s.modalSave, !items.length && { opacity: 0.35 }]}>Save {items.length}</Text>
          </TouchableOpacity>
        </View>
        {items.length === 0 ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <Text style={{ fontSize: 36 }}>🔍</Text>
            <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: C.ink }}>Nothing left to save</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
            <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 13, color: C.ink2, marginBottom: 18, lineHeight: 20 }}>
              Tap ✕ to remove any items you don't want to save. Items already in your pantry will have their stock level updated.
            </Text>
            <Section title="✏️  Will update stock level" color={C.orange} data={updated} />
            <Section title="➕  New to your pantry"     color={C.green}  data={added}   />
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
}

// ── Edit Pantry Item Modal ────────────────────────────────────────────────────
function EditPantryModal({ item, visible, onClose, onSaved }: {
  item: PantryItem | null; visible: boolean; onClose: () => void; onSaved: () => void;
}) {
  const [name, setName]     = useState('');
  const [emoji, setEmoji]   = useState('🛒');
  const [stock, setStock]   = useState<'critical' | 'low' | 'medium' | 'good'>('good');
  const [qty, setQty]       = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (item && visible) {
      setName(item.name); setEmoji(item.emoji);
      setStock(item.stock); setQty(item.quantity || '');
      setSaving(false);
    }
  }, [item, visible]);

  const save = async () => {
    if (!item || !name.trim()) return;
    setSaving(true);
    try {
      await supabase.from('pantry_items').update({
        name: name.trim(), emoji, stock, quantity: qty.trim() || null,
      }).eq('id', item.id);
      onSaved();
    } catch (e) { console.log('Pantry edit error:', e); }
    setSaving(false);
  };

  const stockOptions: Array<'critical' | 'low' | 'medium' | 'good'> = ['critical', 'low', 'medium', 'good'];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top']}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={s.modalHdr}>
            <TouchableOpacity onPress={onClose}><Text style={s.modalCancel}>Cancel</Text></TouchableOpacity>
            <Text style={s.modalTitle}>Edit Item</Text>
            <TouchableOpacity onPress={save} disabled={saving || !name.trim()}>
              <Text style={[s.modalSave, (!name.trim() || saving) && { opacity: 0.35 }]}>{saving ? 'Saving…' : 'Save'}</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20, gap: 18 }} keyboardShouldPersistTaps="handled">
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={s.fieldBlock}>
                <Text style={s.fieldLabel}>EMOJI</Text>
                <TextInput style={[s.fieldInput, { width: 64, textAlign: 'center', fontSize: 24 }]} value={emoji} onChangeText={setEmoji} maxLength={2} />
              </View>
              <View style={[s.fieldBlock, { flex: 1 }]}>
                <Text style={s.fieldLabel}>ITEM NAME</Text>
                <TextInput style={s.fieldInput} placeholderTextColor={C.ink3} value={name} onChangeText={setName} />
              </View>
            </View>
            <View style={s.fieldBlock}>
              <Text style={s.fieldLabel}>QUANTITY (optional)</Text>
              <TextInput style={s.fieldInput} placeholder="e.g. 2L, half full, 3 left" placeholderTextColor={C.ink3} value={qty} onChangeText={setQty} />
            </View>
            <View style={s.fieldBlock}>
              <Text style={s.fieldLabel}>STOCK LEVEL</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                {stockOptions.map(opt => {
                  const meta = STOCK_META[opt];
                  const active = stock === opt;
                  return (
                    <TouchableOpacity key={opt} onPress={() => setStock(opt)}
                      style={[s.stockPill, active && { backgroundColor: meta.color, borderColor: meta.color }]} activeOpacity={0.8}>
                      <StockBars stock={opt} size="sm" />
                      <Text style={[s.stockPillTxt, active && { color: '#fff' }]}>{meta.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

// ── Add Pantry Item Modal ─────────────────────────────────────────────────────
function AddPantryModal({ visible, onClose, onSaved }: {
  visible: boolean; onClose: () => void; onSaved: () => void;
}) {
  const [name, setName]     = useState('');
  const [stock, setStock]   = useState<'critical' | 'low' | 'medium' | 'good'>('good');
  const [qty, setQty]       = useState('');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) { setName(''); setStock('good'); setQty(''); setSaving(false); setTimeout(() => inputRef.current?.focus(), 350); }
  }, [visible]);

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('pantry_items').insert({
      family_id: DUMMY_FAMILY_ID, name: name.trim(), emoji: '🛒', stock, quantity: qty.trim() || null,
    });
    if (error) {
      Alert.alert('Could not save', error.message);
      setSaving(false);
      return;
    }
    setSaving(false);
    onSaved();
    onClose();
  };

  const stockOptions: Array<'critical' | 'low' | 'medium' | 'good'> = ['critical', 'low', 'medium', 'good'];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top']}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={s.modalHdr}>
            <TouchableOpacity onPress={onClose}><Text style={s.modalCancel}>Cancel</Text></TouchableOpacity>
            <Text style={s.modalTitle}>Add to Pantry</Text>
            <TouchableOpacity onPress={save} disabled={saving || !name.trim()}>
              <Text style={[s.modalSave, (!name.trim() || saving) && { opacity: 0.35 }]}>{saving ? 'Saving…' : 'Add'}</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20, gap: 18 }} keyboardShouldPersistTaps="handled">
            <View style={s.fieldBlock}>
              <Text style={s.fieldLabel}>ITEM NAME</Text>
              <TextInput ref={inputRef} style={s.fieldInput} placeholder="e.g. Milk, Eggs, Pasta" placeholderTextColor={C.ink3} value={name} onChangeText={setName} />
            </View>
            <View style={s.fieldBlock}>
              <Text style={s.fieldLabel}>QUANTITY (optional)</Text>
              <TextInput style={s.fieldInput} placeholder="e.g. 2L, half full, 3 left" placeholderTextColor={C.ink3} value={qty} onChangeText={setQty} />
            </View>
            <View style={s.fieldBlock}>
              <Text style={s.fieldLabel}>STOCK LEVEL</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                {stockOptions.map(opt => {
                  const meta = STOCK_META[opt];
                  const active = stock === opt;
                  return (
                    <TouchableOpacity key={opt} onPress={() => setStock(opt)} style={[s.stockPill, active && { backgroundColor: meta.color, borderColor: meta.color }]} activeOpacity={0.8}>
                      <StockBars stock={opt} size="sm" />
                      <Text style={[s.stockPillTxt, active && { color: '#fff' }]}>{meta.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

// ── Pantry Tab ────────────────────────────────────────────────────────────────
function PantryTab({ shoppingItems, onShoppingUpdate }: {
  shoppingItems: ShopItem[]; onShoppingUpdate: () => void;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [items, setItems]               = useState<PantryItem[]>([]);
  const [loading, setLoading]           = useState(true);
  const [scanning, setScanning]         = useState(false);
  const [scannedItems, setScannedItems] = useState<ScannedPantryItem[]>([]);
  const [showReview, setShowReview]     = useState(false);
  const [editItem, setEditItem]         = useState<PantryItem | null>(null);
  const [addVisible, setAddVisible]     = useState(false);
  const [addingToList, setAddingToList] = useState<string | null>(null);
  const [pantryView, setPantryView]     = useState<'list' | 'aisle'>('list');
  const isMounted = useRef(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showOlderBought, setShowOlderBought] = useState(false);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const fetchItems = useCallback(async () => {
    try {
      const { data } = await supabase.from('pantry_items').select('*')
        .eq('family_id', DUMMY_FAMILY_ID).order('name', { ascending: true });
      if (isMounted.current) { setItems((data || []) as PantryItem[]); setLoading(false); }
    } catch (e) { console.log('Pantry fetch error:', e); }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const deleteItem = async (id: string) => {
    Alert.alert('Remove item', 'Remove this from your pantry?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        setItems(prev => prev.filter(i => i.id !== id));
        await supabase.from('pantry_items').delete().eq('id', id);
      }},
    ]);
  };

  const addToShoppingList = async (item: PantryItem) => {
    setAddingToList(item.id);
    try {
      const category = await guessCategory(item.name);
      await supabase.from('shopping_items').insert({
        family_id: DUMMY_FAMILY_ID, name: item.name, item: item.name,
        category, checked: false, completed: false, meal_source: null,
      });
      onShoppingUpdate();
    } catch (e) { console.log('Add to list error:', e); }
    setAddingToList(null);
  };

  const handleScan = async (source: 'camera' | 'library') => {
    try {
      const perm = source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission required', `Please allow ${source === 'camera' ? 'camera' : 'photo library'} access in Settings.`);
        return;
      }
      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync({ base64: true, quality: 0.8, allowsEditing: false })
        : await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.8, mediaTypes: ImagePicker.MediaTypeOptions.Images });
      if (result.canceled) return;
      if (!result.assets?.[0]?.base64) {
        Alert.alert('Photo error', 'Could not read photo data. Please try again.');
        return;
      }
      setScanning(true);
      const outcome = await scanAnyImage(result.assets[0].base64);
      setScanning(false);

      if (outcome.type === 'receipt') {
        // Save receipt record
        await supabase.from('receipts').insert({
          family_id: DUMMY_FAMILY_ID,
          store: outcome.data.store,
          purchase_date: outcome.data.purchase_date,
          total_amount: outcome.data.total_amount,
          item_count: outcome.data.item_count,
          items: outcome.data.items,
        });
        // Sync all items to Pantry (stock = good, just bought)
        const pantryItems = outcome.data.items.map((i: ReceiptItem) => ({ name: i.name, emoji: i.emoji, qty: i.qty }));
        await syncItemsToPantry(pantryItems);
        // Add all items to Recently Bought (checked = true)
        for (const i of outcome.data.items) {
          const { data: existing } = await supabase.from('shopping_items').select('id, checked')
            .eq('family_id', DUMMY_FAMILY_ID).ilike('name', i.name).limit(1);
          if (existing && existing.length > 0) {
            await supabase.from('shopping_items').update({ checked: true, completed: true }).eq('id', existing[0].id);
          } else {
            await supabase.from('shopping_items').insert({
              family_id: DUMMY_FAMILY_ID, name: i.name, item: i.name,
              category: i.category || 'Other', checked: true, completed: true,
              meal_source: i.qty || null,
            });
          }
        }
        onShoppingUpdate();
        await fetchItems();
        Alert.alert(
          `${outcome.data.store} receipt scanned ✓`,
          `${outcome.data.item_count} items added to your Pantry and Recently Bought.${outcome.data.total_amount ? `\nTotal: $${outcome.data.total_amount.toFixed(2)}` : ''}`
        );
      } else {
        // Pantry scan — existing flow
        if (!outcome.items.length) {
          Alert.alert('Nothing found', "Zaeli couldn't identify any items — try a clearer photo.");
          return;
        }
        setScannedItems(outcome.items);
        setShowReview(true);
      }
    } catch (e) {
      setScanning(false);
      Alert.alert('Scan failed', String(e));
    }
  };

  const confirmScan = async (confirmed: ScannedPantryItem[]) => {
    setShowReview(false);
    for (const item of confirmed) {
      const existing = items.find(e => e.name.toLowerCase() === item.name.toLowerCase());
      if (existing) {
        await supabase.from('pantry_items').update({ stock: item.stock, quantity: item.quantity, emoji: item.emoji }).eq('id', existing.id);
      } else {
        await supabase.from('pantry_items').insert({ family_id: DUMMY_FAMILY_ID, name: item.name, emoji: item.emoji, stock: item.stock, quantity: item.quantity });
      }
    }
    await fetchItems();
  };

  const pq = searchQuery.toLowerCase().trim();
  const filteredItems = pq ? items.filter(i => i.name.toLowerCase().includes(pq)) : items;
  const runningLow  = filteredItems.filter(i => i.stock === 'critical' || i.stock === 'low');
  const wellStocked = filteredItems.filter(i => i.stock === 'medium'   || i.stock === 'good');
  const lowNames    = runningLow.map(i => i.name);

  const addAllToList = async () => {
    const notOnList = runningLow.filter(i => !shoppingItems.some(s => s.name.toLowerCase() === i.name.toLowerCase() && !s.checked));
    for (const item of notOnList) {
      const category = await guessCategory(item.name);
      await supabase.from('shopping_items').insert({ family_id: DUMMY_FAMILY_ID, name: item.name, item: item.name, category, checked: false, completed: false, meal_source: null });
    }
    onShoppingUpdate();
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Search bar */}
      <View style={s.searchRow}>
        <View style={s.searchBox}>
          <Text style={s.searchIco}>⌕</Text>
          <TextInput
            style={s.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search list…"
            placeholderTextColor={C.ink3}
            clearButtonMode="while-editing"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} activeOpacity={0.7}>
              <Text style={s.searchClear}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Sticky toolbar — matches List tab style */}
      <View style={s.stickyToolRow}>
        <View style={s.toolRow}>
          <TouchableOpacity style={s.addBar} onPress={() => setAddVisible(true)} activeOpacity={0.7}>
            <Text style={s.addBarPlus}>＋</Text>
            <Text style={s.addBarTxt}>Add item…</Text>
          </TouchableOpacity>
          <View style={s.viewToggle}>
            <TouchableOpacity style={[s.viewBtn, pantryView === 'list' && s.viewBtnOn]} onPress={() => setPantryView('list')} activeOpacity={0.8}>
              <Text style={[s.viewBtnTxt, pantryView === 'list' && s.viewBtnTxtOn]}>List</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.viewBtn, pantryView === 'aisle' && s.viewBtnOn]} onPress={() => setPantryView('aisle')} activeOpacity={0.8}>
              <Text style={[s.viewBtnTxt, pantryView === 'aisle' && s.viewBtnTxtOn]}>Aisle</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 8 }} showsVerticalScrollIndicator={false}>
        {!loading && lowNames.length > 0 && (
          <View style={s.pantryInsightCard}>
            <View style={{ padding: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <View style={s.pantryInsightAv}><Text style={{ color: '#fff', fontSize: 13 }}>✦</Text></View>
                <Text style={s.pantryInsightTitle}>Running low</Text>
              </View>
              <Text style={s.pantryInsightBody}>
                {lowNames.length === 1
                  ? `${lowNames[0]} is getting low.`
                  : lowNames.length <= 3
                    ? `${lowNames.slice(0, -1).join(', ')} and ${lowNames[lowNames.length - 1]} are running low.`
                    : `${lowNames[0]}, ${lowNames[1]} and ${lowNames.length - 2} more are running low.`}
              </Text>
            </View>
            <TouchableOpacity style={s.pantryInsightBtn} onPress={addAllToList} activeOpacity={0.85}>
              <Text style={s.pantryInsightBtnTxt}>Add all to shopping list</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={s.pantryToolRow}>
          <TouchableOpacity style={[s.pantryScanCard, scanning && { opacity: 0.55 }]} onPress={() => handleScan('camera')} disabled={scanning} activeOpacity={0.8}>
            <IcoCamera color={C.ink2} />
            <Text style={s.pantryScanLbl}>{scanning ? 'Scanning…' : 'Take Photo'}</Text>
            <Text style={s.pantryScanSub}>Fridge, pantry or receipt</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.pantryScanCard, scanning && { opacity: 0.55 }]} onPress={() => handleScan('library')} disabled={scanning} activeOpacity={0.8}>
            <Text style={{ fontSize: 22, marginBottom: 2 }}>🖼️</Text>
            <Text style={s.pantryScanLbl}>Upload Photo</Text>
            <Text style={s.pantryScanSub}>Fridge, pantry or receipt</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <Text style={s.emptyTxt}>Loading…</Text>
        ) : items.length === 0 ? (
          <View style={s.emptyState}>
            <Text style={s.emptyEmoji}>🫙</Text>
            <Text style={s.emptyTitle}>Pantry is empty</Text>
            <Text style={s.emptyBody}>Scan your fridge or shelves to add items, or tap + Add item above.</Text>
          </View>
        ) : pantryView === 'list' ? (
          <>
            {runningLow.length > 0 && (
              <View>
                <Text style={s.sectionLbl}>Running Low</Text>
                {runningLow.map(item => (
                  <PantryRow key={item.id} item={item} shoppingItems={shoppingItems}
                    onEdit={() => setEditItem(item)} onDelete={() => deleteItem(item.id)} onAddToList={() => addToShoppingList(item)} />
                ))}
              </View>
            )}
            {wellStocked.length > 0 && (
              <View>
                <Text style={s.sectionLbl}>Well Stocked</Text>
                {wellStocked.map(item => (
                  <PantryRow key={item.id} item={item} shoppingItems={shoppingItems}
                    onEdit={() => setEditItem(item)} onDelete={() => deleteItem(item.id)} onAddToList={() => addToShoppingList(item)} />
                ))}
              </View>
            )}
          </>
        ) : (
          // Aisle mode — group by food category using keyword matching
          (() => {
            const PANTRY_CAT_KEYWORDS: Record<string, string[]> = {
              'Fruit & Veg':    ['apple','banana','orange','grape','berry','mango','avocado','tomato','potato','carrot','onion','garlic','lettuce','spinach','broccoli','zucchini','capsicum','cucumber','lemon','lime','pear','peach','plum','melon','kiwi','pineapple','strawberry','mushroom','celery','corn','pea','bean','herb','basil','parsley','coriander','mint','ginger'],
              'Dairy & Eggs':   ['milk','cheese','yoghurt','yogurt','butter','cream','egg','feta','mozzarella','parmesan','ricotta','sour cream','custard','ice cream','dairy'],
              'Meat & Seafood': ['chicken','beef','lamb','pork','mince','steak','sausage','bacon','ham','turkey','fish','salmon','tuna','prawn','shrimp','seafood','meat','salami','pepperoni'],
              'Bakery':         ['bread','roll','bun','croissant','muffin','cake','pastry','bagel','wrap','pita','sourdough','loaf','toast'],
              'Frozen':         ['frozen','ice cream','gelato','chips frozen','edamame'],
              'Drinks':         ['water','juice','soft drink','soda','coffee','tea','milk drink','coconut water','kombucha','energy drink','wine','beer','alcohol','drink','beverage'],
              'Snacks':         ['chip','crisp','cracker','biscuit','chocolate','lolly','candy','nut','almond','cashew','popcorn','bar','snack','muesli bar','tim tam'],
              'Pantry':         ['pasta','rice','flour','sugar','salt','pepper','oil','sauce','vinegar','stock','broth','can','tin','jar','cereal','oat','honey','jam','spread','mayonnaise','ketchup','mustard','soy','curry','spice','herb dried','noodle','lentil','chickpea','bean dried'],
              'Household':      ['detergent','soap','shampoo','conditioner','toothpaste','toilet paper','tissue','cleaner','spray','sponge','bin bag','foil','wrap','bag','nappy','pad','tampon','razor','deodorant','sunscreen'],
            };

            const catForItem = (name: string): string => {
              const lower = name.toLowerCase();
              for (const [cat, keywords] of Object.entries(PANTRY_CAT_KEYWORDS)) {
                if (keywords.some(kw => lower.includes(kw))) return cat;
              }
              return 'Other';
            };

            const grouped = CATEGORIES.reduce<Record<string, PantryItem[]>>((acc, cat) => {
              const ci = items.filter(i => catForItem(i.name) === cat);
              if (ci.length) acc[cat] = ci;
              return acc;
            }, {});
            const uncategorised = items.filter(i => catForItem(i.name) === 'Other');
            if (uncategorised.length) grouped['Other'] = uncategorised;

            return (
              <>
                {Object.entries(grouped).map(([cat, catItems]) => (
                  <View key={cat}>
                    <Text style={s.sectionLbl}>{cat}</Text>
                    {catItems.map(item => (
                      <PantryRow key={item.id} item={item} shoppingItems={shoppingItems}
                        onEdit={() => setEditItem(item)} onDelete={() => deleteItem(item.id)} onAddToList={() => addToShoppingList(item)} />
                    ))}
                  </View>
                ))}
              </>
            );
          })()
        )}

        {/* Chat thread rendered by parent — pantry content only here */}
      </ScrollView>

      <ScanningSheet visible={scanning} />
      <PantryScanReviewModal visible={showReview} scanned={scannedItems} existing={items} onConfirm={confirmScan} onCancel={() => setShowReview(false)} />
      <EditPantryModal item={editItem} visible={!!editItem} onClose={() => setEditItem(null)} onSaved={() => { setEditItem(null); fetchItems(); }} />
      <AddPantryModal visible={addVisible} onClose={() => setAddVisible(false)} onSaved={fetchItems} />
    </View>
  );
}

// ── Add Item Flow ─────────────────────────────────────────────────────────────
function AddItemFlow({ visible, onClose, onSaved, onNudge }: {
  visible: boolean; onClose: () => void; onSaved: () => void; onNudge?: (name: string) => void;
}) {
  const router = useRouter();
  const [step, setStep]       = useState<'sheet' | 'form'>('sheet');
  const [name, setName]       = useState('');
  const [qty, setQty]         = useState('');
  const [note, setNote]       = useState('');
  const [saving, setSaving]   = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) { setStep('sheet'); resetForm(); setSavedCount(0); }
  }, [visible]);

  const resetForm = () => { setName(''); setQty(''); setNote(''); setSaving(false); };
  const openManual = () => { setStep('form'); setTimeout(() => inputRef.current?.focus(), 350); };
  const openZaeli = () => {
    onClose();
    router.push({ pathname: '/(tabs)/zaeli-chat', params: { channel: 'Shopping', returnTo: '/(tabs)/shopping', seedMessage: 'I want to add items to the shopping list.' } });
  };

  const checkPantryNudge = async (itemName: string) => {
    try {
      const { data } = await supabase.from('pantry_items').select('name, stock').eq('family_id', DUMMY_FAMILY_ID);
      if (!data) return;
      const match = data.find((p: any) =>
        p.name.toLowerCase().includes(itemName.toLowerCase()) || itemName.toLowerCase().includes(p.name.toLowerCase())
      );
      if (match) onNudge?.(match.name);
    } catch (e) { /* best-effort */ }
  };

  const saveAndMore = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      const category = await guessCategory(name.trim());
      const noteStr = [qty.trim(), note.trim()].filter(Boolean).join(' · ') || null;
      await supabase.from('shopping_items').insert({ family_id: DUMMY_FAMILY_ID, name: name.trim(), item: name.trim(), category, checked: false, completed: false, meal_source: noteStr });
      checkPantryNudge(name.trim());
      setSavedCount(c => c + 1); resetForm(); onSaved();
      setTimeout(() => inputRef.current?.focus(), 100);
    } catch (e) { console.log('Save error:', e); }
    setSaving(false);
  };

  const saveAndClose = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      const category = await guessCategory(name.trim());
      const noteStr = [qty.trim(), note.trim()].filter(Boolean).join(' · ') || null;
      await supabase.from('shopping_items').insert({ family_id: DUMMY_FAMILY_ID, name: name.trim(), item: name.trim(), category, checked: false, completed: false, meal_source: noteStr });
      checkPantryNudge(name.trim());
      onSaved(); onClose();
    } catch (e) { console.log('Save error:', e); }
    setSaving(false);
  };

  return (
    <>
      <Modal visible={visible && step === 'sheet'} transparent animationType="slide" onRequestClose={onClose}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} onPress={onClose} activeOpacity={1} />
        <View style={s.sheetWrap}>
          <View style={s.sheetHandle} />
          <View style={s.sheetTopRow}>
            <View style={s.sheetAv}><Text style={{ fontSize: 16, color: '#fff' }}>✦</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={s.sheetTitle}>Add to list</Text>
              <Text style={s.sheetSub}>How would you like to add items?</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={s.sheetClose} activeOpacity={0.7}>
              <Text style={s.sheetCloseTxt}>✕</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={s.sheetPrimary} onPress={openZaeli} activeOpacity={0.85}>
            <View style={s.sheetPrimaryIcon}><Text style={{ fontSize: 18 }}>✦</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={s.sheetPrimaryTitle}>Ask Zaeli to add items</Text>
              <Text style={s.sheetPrimaryDesc}>Brain dump, dinner plans, anything — she'll sort it</Text>
            </View>
            <Text style={s.sheetPrimaryArrow}>→</Text>
          </TouchableOpacity>
          <View style={s.sheetDivider}>
            <View style={s.sheetDividerLine} />
            <Text style={s.sheetDividerTxt}>or</Text>
            <View style={s.sheetDividerLine} />
          </View>
          <TouchableOpacity style={s.sheetSecondary} onPress={openManual} activeOpacity={0.8}>
            <Text style={s.sheetSecondaryTxt}>Add manually</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      <Modal visible={visible && step === 'form'} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top']}>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={s.modalHdr}>
              <TouchableOpacity onPress={onClose}><Text style={s.modalCancel}>Done</Text></TouchableOpacity>
              <View style={{ alignItems: 'center' }}>
                <Text style={s.modalTitle}>Add Items</Text>
                {savedCount > 0 && <Text style={{ fontFamily: 'Poppins_500Medium', fontSize: 11, color: C.green }}>{savedCount} saved ✓</Text>}
              </View>
              <TouchableOpacity onPress={saveAndClose} disabled={saving || !name.trim()}>
                <Text style={[s.modalSave, (!name.trim() || saving) && { opacity: 0.35 }]}>Add</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }} keyboardShouldPersistTaps="handled">
              <View style={s.fieldBlock}>
                <Text style={s.fieldLabel}>ITEM</Text>
                <TextInput ref={inputRef} style={s.fieldInput} placeholder="e.g. Full cream milk" placeholderTextColor={C.ink3} value={name} onChangeText={setName} returnKeyType="next" autoFocus />
              </View>
              <View style={s.fieldBlock}>
                <Text style={s.fieldLabel}>QUANTITY</Text>
                <TextInput style={s.fieldInput} placeholder="e.g. 2L, × 3, 500g" placeholderTextColor={C.ink3} value={qty} onChangeText={setQty} returnKeyType="next" />
              </View>
              <View style={s.fieldBlock}>
                <Text style={s.fieldLabel}>NOTE</Text>
                <TextInput style={[s.fieldInput, { minHeight: 64, textAlignVertical: 'top' }]} placeholder="e.g. Home brand if cheaper" placeholderTextColor={C.ink3} value={note} onChangeText={setNote} multiline />
              </View>
              <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 12, color: C.ink3, marginTop: -4 }}>✦ Zaeli will sort the category automatically</Text>
              <View style={{ gap: 10, marginTop: 8 }}>
                <TouchableOpacity style={[s.saveMoreBtn, (!name.trim() || saving) && { opacity: 0.4 }]} onPress={saveAndMore} disabled={saving || !name.trim()} activeOpacity={0.85}>
                  <Text style={s.saveMoreTxt}>{saving ? 'Saving…' : '+ Add another item'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.saveDoneBtn, (!name.trim() || saving) && { opacity: 0.4 }]} onPress={saveAndClose} disabled={saving || !name.trim()} activeOpacity={0.85}>
                  <Text style={s.saveDoneTxt}>Add to list</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </>
  );
}

// ── Edit Item Modal ───────────────────────────────────────────────────────────
function EditItemModal({ item, visible, onClose, onSaved }: {
  item: ShopItem | null; visible: boolean; onClose: () => void; onSaved: () => void;
}) {
  const [name, setName] = useState('');
  const [qty, setQty]   = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (item && visible) {
      setName(item.name);
      const parts = item.meal_source?.split(' · ') || [];
      setQty(parts[0] || ''); setNote(parts.slice(1).join(' · ') || '');
      setSaving(false);
    }
  }, [item, visible]);

  const save = async () => {
    if (!item || !name.trim()) return;
    setSaving(true);
    try {
      await supabase.from('shopping_items').update({ name: name.trim(), item: name.trim(), meal_source: [qty.trim(), note.trim()].filter(Boolean).join(' · ') || null }).eq('id', item.id);
      onSaved();
    } catch (e) { console.log('Edit error:', e); }
    setSaving(false);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top']}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={s.modalHdr}>
            <TouchableOpacity onPress={onClose}><Text style={s.modalCancel}>Cancel</Text></TouchableOpacity>
            <Text style={s.modalTitle}>Edit Item</Text>
            <TouchableOpacity onPress={save} disabled={saving || !name.trim()}>
              <Text style={[s.modalSave, (!name.trim() || saving) && { opacity: 0.35 }]}>{saving ? 'Saving…' : 'Save'}</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }} keyboardShouldPersistTaps="handled">
            <View style={s.fieldBlock}>
              <Text style={s.fieldLabel}>ITEM</Text>
              <TextInput style={s.fieldInput} placeholderTextColor={C.ink3} value={name} onChangeText={setName} />
            </View>
            <View style={s.fieldBlock}>
              <Text style={s.fieldLabel}>QUANTITY</Text>
              <TextInput style={s.fieldInput} placeholder="e.g. 2L, × 3, 500g" placeholderTextColor={C.ink3} value={qty} onChangeText={setQty} />
            </View>
            <View style={s.fieldBlock}>
              <Text style={s.fieldLabel}>NOTE</Text>
              <TextInput style={[s.fieldInput, { minHeight: 72, textAlignVertical: 'top' }]} placeholder="e.g. Home brand if cheaper" placeholderTextColor={C.ink3} value={note} onChangeText={setNote} multiline />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

// ── Item Row ──────────────────────────────────────────────────────────────────
function ItemRow({ item, onToggle, onDelete, onEdit }: {
  item: ShopItem; onToggle: () => void; onDelete: () => void; onEdit: () => void;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const handleToggle = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.97, duration: 70, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1,    duration: 70, useNativeDriver: true }),
    ]).start(onToggle);
  };
  const parts = item.meal_source?.split(' · ') || [];
  const qty  = parts[0] || '';
  const note = parts.slice(1).join(' · ');

  return (
    <Animated.View style={[s.itemRow, { transform: [{ scale: scaleAnim }] }]}>
      {/* Circle tick */}
      <TouchableOpacity style={s.chkWrap} onPress={handleToggle} activeOpacity={0.7}>
        <View style={[s.chk, item.checked && s.chkDone]}>
          {item.checked && <Text style={s.chkTick}>✓</Text>}
        </View>
      </TouchableOpacity>
      {/* Emoji */}
      <Text style={s.itemEmoji}>{CAT_EMOJI[item.category] || '🛒'}</Text>
      {/* Name + detail */}
      <TouchableOpacity style={s.itemBody} onPress={onEdit} activeOpacity={0.7}>
        <Text style={[s.itemName, item.checked && s.itemNameBought]}>{item.name}</Text>
        {item.meal_source && !item.meal_source.includes(' · ') ? (
          <View style={{ flexDirection: 'row', marginTop: 2 }}>
            <View style={{ backgroundColor: 'rgba(216,204,255,0.3)', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 1 }}>
              <Text style={{ fontFamily: 'Poppins_500Medium', fontSize: 10, color: '#5A4800' }}>Meal</Text>
            </View>
          </View>
        ) : null}
      </TouchableOpacity>
      {/* Qty badge right */}
      {qty ? <Text style={s.itemQtyRight}>{qty}</Text> : null}
      {/* Delete */}
      <TouchableOpacity style={s.delBtn} onPress={onDelete} activeOpacity={0.7}>
        <IcoTrash />
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Spend Tab ─────────────────────────────────────────────────────────────────
function SpendTab() {
  const [receipts, setReceipts]         = useState<Receipt[]>([]);
  const [loading, setLoading]           = useState(true);
  const [expanded, setExpanded]         = useState<string | null>(null);
  const [showAllItems, setShowAllItems] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from('receipts').select('*')
        .eq('family_id', DUMMY_FAMILY_ID).order('purchase_date', { ascending: false }).limit(20);
      setReceipts((data || []) as Receipt[]);
      setLoading(false);
    };
    fetch();
  }, []);

  // Monthly spend summary
  const now = new Date();
  const n = new Date();
  const thisMonthKey = `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}`;
  const thisMonthTotal = receipts
    .filter(r => r.purchase_date?.startsWith(thisMonthKey) && r.total_amount)
    .reduce((sum, r) => sum + (r.total_amount || 0), 0);
  const thisMonthCount = receipts.filter(r => r.purchase_date?.startsWith(thisMonthKey)).length;

  const fmtDate = (d: string) => {
    if (!d) return '';
    const dt = new Date(d + 'T12:00:00');
    return dt.toLocaleDateString('en-AU', { weekday:'short', day:'numeric', month:'short' });
  };

  const STORE_EMOJI: Record<string, string> = {
    woolworths: '🛒', coles: '🛒', aldi: '🛒', iga: '🛒', costco: '🛒',
  };
  const storeEmoji = (store: string) => {
    const key = store.toLowerCase().split(' ')[0];
    return STORE_EMOJI[key] || '🧾';
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 20 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* Monthly insight card */}
        {!loading && thisMonthTotal > 0 && (
          <View style={s.spendInsightCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <View style={s.pantryInsightAv}><Text style={{ color: '#fff', fontSize: 13 }}>✦</Text></View>
              <Text style={s.pantryInsightTitle}>
                {now.toLocaleString('en-AU', { month: 'long' })} spend
              </Text>
            </View>
            <Text style={s.spendTotal}>${thisMonthTotal.toFixed(2)}</Text>
            <Text style={s.spendSubtitle}>{thisMonthCount} shop{thisMonthCount !== 1 ? 's' : ''} this month</Text>
          </View>
        )}

        {/* Empty state */}
        {!loading && receipts.length === 0 && (
          <View style={s.emptyState}>
            <Text style={s.emptyEmoji}>🧾</Text>
            <Text style={s.emptyTitle}>No receipts yet</Text>
            <Text style={s.emptyBody}>Scan a receipt from the Pantry tab — Zaeli will read it and save it here automatically.</Text>
          </View>
        )}

        {/* Receipts list */}
        {receipts.length > 0 && (
          <View style={{ paddingHorizontal: 18, paddingTop: 14 }}>
            <Text style={s.sectionLbl}>Recent Receipts</Text>
            {receipts.map(r => {
              const isOpen = expanded === r.id;
              return (
                <TouchableOpacity key={r.id} style={s.receiptCard} onPress={() => setExpanded(isOpen ? null : r.id)} activeOpacity={0.8}>
                  {/* Receipt header */}
                  <View style={s.receiptHdr}>
                    <Text style={s.receiptEmoji}>{storeEmoji(r.store)}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={s.receiptStore}>{r.store}</Text>
                      <Text style={s.receiptMeta}>{fmtDate(r.purchase_date)} · {r.item_count} item{r.item_count !== 1 ? 's' : ''}</Text>
                    </View>
                    {r.total_amount != null && (
                      <Text style={s.receiptTotal}>${r.total_amount.toFixed(2)}</Text>
                    )}
                    <Text style={[s.receiptChevron, isOpen && { transform: [{ rotate: '180deg' }] }]}>›</Text>
                  </View>

                  {/* Expanded item list */}
                  {isOpen && r.items?.length > 0 && (
                    <View style={s.receiptItems}>
                      {(showAllItems[r.id] ? r.items : r.items.slice(0, 8)).map((item: ReceiptItem, i: number) => {
                        const displayCount = showAllItems[r.id] ? r.items.length : Math.min(8, r.items.length);
                        return (
                          <View key={i} style={[s.receiptItemRow, i === displayCount - 1 && !(!showAllItems[r.id] && r.items.length > 8) && { borderBottomWidth: 0 }]}>
                            <Text style={s.receiptItemEmoji}>{item.emoji || '🛒'}</Text>
                            <Text style={s.receiptItemName} numberOfLines={1}>{item.name}</Text>
                            {item.price != null && <Text style={s.receiptItemPrice}>${item.price.toFixed(2)}</Text>}
                          </View>
                        );
                      })}
                      {!showAllItems[r.id] && r.items.length > 8 && (
                        <TouchableOpacity
                          onPress={() => setShowAllItems(prev => ({ ...prev, [r.id]: true }))}
                          style={{ paddingVertical: 12, alignItems: 'center' }}
                          activeOpacity={0.7}
                        >
                          <Text style={[s.receiptMoreTxt, { color: C.blue, fontFamily: 'Poppins_600SemiBold' }]}>
                            + {r.items.length - 8} more items — tap to show all
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

      {/* Chat thread and bar rendered by parent */}
      </ScrollView>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function ShoppingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [fontsLoaded] = useFonts({
    Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold,
    Poppins_700Bold, Poppins_800ExtraBold, DMSerifDisplay_400Regular,
  });

  const [activeTab, setActiveTab]   = useState<'list' | 'pantry' | 'spend'>('list');
  const [items, setItems]           = useState<ShopItem[]>([]);
  const [loading, setLoading]       = useState(true);
  const [addVisible, setAddVisible] = useState(false);
  const [editItem, setEditItem]     = useState<ShopItem | null>(null);
  const [nudgeItemName, setNudgeItemName] = useState<string | null>(null);
  const [viewMode, setViewMode]     = useState<'list' | 'aisle'>('list');
  const [navOpen, setNavOpen]       = useState(false);
  const [rbExpanded, setRbExpanded] = useState(false);       // Recently Bought collapsed by default
  // ── Single shared chat state — persisted 24hr via AsyncStorage ──────────────
  const { messages, setMessages, clearMessages } = useChatPersistence('shopping');
  const [chatInput,    setChatInput]    = useState('');
  const [chatLoading,  setChatLoading]  = useState(false);
  const mainScrollRef  = useRef<ScrollView>(null);
  const chatInputRef   = useRef<TextInput>(null);
  const [thumbs, setThumbs] = useState<Record<string, 'up'|'down'|null>>({});
  const [isRecording,    setIsRecording]    = useState(false);
  const [micTimer,       setMicTimer]       = useState(0);
  const micTimerRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const micOverlayAnim   = useRef(new Animated.Value(0)).current;
  const recordingRef     = useRef<Audio.Recording | null>(null);
  const [showScrollDown, setShowScrollDown] = useState(false);

  const isMounted = useRef(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showOlderBought, setShowOlderBought] = useState(false);
  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const fetchItems = useCallback(async () => {
    try {
      const { data } = await supabase.from('shopping_items').select('*')
        .eq('family_id', DUMMY_FAMILY_ID).order('created_at', { ascending: true });
      if (isMounted.current) { setItems((data || []) as ShopItem[]); setLoading(false); }
    } catch (e) { console.log('Fetch error:', e); }
  }, []);

  useFocusEffect(useCallback(() => { fetchItems(); }, [fetchItems]));

  const toggleItem = async (item: ShopItem) => {
    const next = !item.checked;
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, checked: next } : i));
    await supabase.from('shopping_items').update({ checked: next, completed: next }).eq('id', item.id);
    // When ticking off a food item, sync it to Pantry as 'good' stock
    if (next && FOOD_CATEGORIES.includes(item.category)) {
      syncItemsToPantry([{ name: item.name }]).catch(() => {});
    }
  };

  const deleteItem = async (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
    await supabase.from('shopping_items').delete().eq('id', id);
  };

  const shareList = async () => {
    const list = items.filter(i => !i.checked);
    if (!list.length) return;
    const text = list.map(i => `• ${i.name}${i.meal_source ? ' (' + i.meal_source.split(' · ')[0] + ')' : ''}`).join('\n');
    await Share.share({ message: `Shopping list:\n\n${text}` });
  };

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const sq = searchQuery.toLowerCase().trim();
  const unchecked = items.filter(i => !i.checked && (!sq || i.name.toLowerCase().includes(sq)));
  const allChecked = items.filter(i => i.checked);
  const recentChecked = allChecked.filter(i => {
    if (!i.created_at) return true;
    return new Date(i.created_at) >= thirtyDaysAgo;
  });
  const olderChecked = allChecked.filter(i => {
    if (!i.created_at) return false;
    return new Date(i.created_at) < thirtyDaysAgo;
  });
  const checked = (showOlderBought ? allChecked : recentChecked)
    .filter(i => !sq || i.name.toLowerCase().includes(sq));
  const byCategory = CATEGORIES.reduce<Record<string, ShopItem[]>>((acc, cat) => {
    const ci = unchecked.filter(i => i.category === cat);
    if (ci.length) acc[cat] = ci;
    return acc;
  }, {});

  if (!fontsLoaded) return null;

  const nowTs = () => { const d = new Date(); return `${d.getHours() % 12 || 12}:${String(d.getMinutes()).padStart(2,'0')} ${d.getHours() < 12 ? 'am' : 'pm'}`; };

  function handleScroll(e: any) {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    const dist = contentSize.height - contentOffset.y - layoutMeasurement.height;
    setShowScrollDown(dist > 50);
  }

  // ── Mic recording — matches Home ─────────────────────────────────────────────
  async function startRecording() {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) return;
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      recordingRef.current = recording;
      setIsRecording(true);
      setMicTimer(0);
      Animated.timing(micOverlayAnim, { toValue: 1, duration: 220, useNativeDriver: true }).start();
      micTimerRef.current = setInterval(() => setMicTimer(t => t + 1), 1000);
    } catch (e) { console.error('startRecording:', e); }
  }

  async function stopRecording(cancel = false) {
    try {
      setIsRecording(false);
      if (micTimerRef.current) { clearInterval(micTimerRef.current); micTimerRef.current = null; }
      Animated.timing(micOverlayAnim, { toValue: 0, duration: 180, useNativeDriver: true }).start();
      if (!recordingRef.current) return;
      const status = await recordingRef.current.getStatusAsync();
      const durationSec = (status as any)?.durationMillis ? (status as any).durationMillis / 1000 : 10;
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      if (!uri || cancel) return;
      const key = process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? '';
      if (!key) return;
      const form = new FormData();
      form.append('file', { uri, type: 'audio/m4a', name: 'audio.m4a' } as any);
      form.append('model', 'whisper-1');
      const resp = await fetch('https://api.openai.com/v1/audio/transcriptions', { method: 'POST', headers: { Authorization: `Bearer ${key}` }, body: form });
      const data = await resp.json();
      const transcript = data?.text?.trim() ?? '';
      if (transcript) sendMessage(transcript);
    } catch (e) { console.error('stopRecording:', e); }
  }

  // ── Ambient strip text ──────────────────────────────────────────────────────
  // Reads pantry low items from items state — we need pantry data too
  // For now derive lowFlags from item names that match pantry logic
  const ambientText = getAmbientText(unchecked, []);

  // ── Parse chips from Claude reply — strips [chips: a | b | c] suffix ─────────
  function parseChips(raw: string): { text: string; chips: string[] } {
    const match = raw.match(/\[chips:\s*([^\]]+)\]/i);
    if (!match) return { text: raw.trim(), chips: [] };
    const chips = match[1].split('|').map(s => s.trim()).filter(Boolean).slice(0, 4);
    const text = raw.replace(match[0], '').trim();
    return { text, chips };
  }

  // ── Single sendMessage — Claude Sonnet with real tools ──────────────────────
  const sendMessage = async (overrideText?: string) => {
    const text = (overrideText ?? chatInput).trim();
    if (!text || chatLoading) return;
    setChatInput('');
    const uidFn = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const replyId = uidFn();
    const ts = nowTs();
    setMessages(prev => [...prev,
      { id: uidFn(), role: 'user', text, ts },
      { id: replyId, role: 'zaeli', text: '', isLoading: true, ts },
    ]);
    setChatLoading(true);
    setTimeout(() => mainScrollRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const anthropicKey = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? '';

      // ── Build full context — all data injected so Zaeli always knows everything
      const uncheckedItems = items.filter(i => !i.checked);
      const checkedItems   = items.filter(i => i.checked);
      const listCtx = uncheckedItems.length === 0
        ? 'Shopping list: empty.'
        : `Shopping list (${uncheckedItems.length} items): ${uncheckedItems.map(i => i.name).join(', ')}.`;
      const boughtCtx = checkedItems.length > 0
        ? `Recently bought: ${checkedItems.slice(0, 8).map(i => i.name).join(', ')}.`
        : '';

      // Fetch pantry items fresh
      const { data: pantryData } = await supabase.from('pantry_items')
        .select('name,stock,quantity').eq('family_id', DUMMY_FAMILY_ID).order('name');
      const pantryCtx = pantryData && pantryData.length > 0
        ? `Pantry stock: ${pantryData.map((p: any) => `${p.name} (${p.stock}${p.quantity ? ', ' + p.quantity : ''})`).join(', ')}.`
        : 'Pantry: no items recorded yet.';

      // Fetch receipts fresh
      const now = new Date();
      const monthKey = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
      const { data: receiptData } = await supabase.from('receipts')
        .select('store,purchase_date,total_amount,item_count')
        .eq('family_id', DUMMY_FAMILY_ID)
        .order('purchase_date', { ascending: false }).limit(10);
      const thisMonthReceipts = (receiptData || []).filter((r: any) => r.purchase_date?.startsWith(monthKey));
      const monthTotal = thisMonthReceipts.reduce((s: number, r: any) => s + (r.total_amount || 0), 0);
      const receiptCtx = receiptData && receiptData.length > 0
        ? `Receipts this month (${thisMonthReceipts.length} shops, $${monthTotal.toFixed(2)} total): ${thisMonthReceipts.map((r: any) => `${r.store} $${r.total_amount?.toFixed(2)} on ${r.purchase_date}`).join('; ')}. All receipts: ${(receiptData || []).map((r: any) => `${r.store} $${r.total_amount?.toFixed(2) || '?'} (${r.purchase_date})`).join(', ')}.`
        : 'No receipts scanned yet.';

      const activeTabCtx = activeTab === 'list'
        ? 'User is on the List tab viewing the shopping list.'
        : activeTab === 'pantry'
        ? 'User is on the Pantry tab viewing pantry stock.'
        : 'User is on the Spend tab reviewing grocery spending.';

      const systemPrompt = `You are Zaeli — warm, sharp, slightly cheeky AI heart of a family app. You have FULL visibility across the entire shopping module.

CURRENT CONTEXT:
${activeTabCtx}
${listCtx}
${boughtCtx}
${pantryCtx}
${receiptCtx}

TOOLS — use them immediately when the intent is clear, never say "I'll do that":
- add_shopping_item: add items to shopping list
- remove_shopping_item: remove an item from shopping list
- tick_shopping_item: mark an item as bought
- clear_shopping_list: clear the whole list

PERSONALITY:
- Warm, specific, punchy — 1-2 sentences max
- Vary openers: "Done!", "On it!", "Added!", "Sorted!", "Got it —"
- Never start with "I". Never say "mate". Never be sycophantic.
- Reference actual item names in your reply
- For pantry questions: answer from the pantry data above — never say you can't see it
- For spend questions: calculate from the receipt data above — give real numbers

QUICK REPLY CHIPS: End EVERY reply with [chips: chip1 | chip2 | chip3] — 2-4 short contextual follow-up suggestions (3-6 words each). These are stripped from displayed text. Examples: [chips: Add more items | Clear the list | What's running low?]`;

      const histMsgs = messages.slice(-8).map(m => ({
        role: m.role === 'zaeli' ? 'assistant' as const : 'user' as const,
        content: m.text || '(message)',
      }));
      const apiMessages = [
        ...histMsgs.filter(m => m.content !== '(message)'),
        { role: 'user' as const, content: text },
      ];

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1024,
          system: systemPrompt,
          tools: SHOP_TOOLS,
          messages: apiMessages,
        }),
      });
      const data = await res.json();

      if (data.stop_reason === 'tool_use') {
        const toolUses = data.content.filter((b: any) => b.type === 'tool_use');
        const toolResults: string[] = [];
        for (const tu of toolUses) {
          const result = await executeShopTool(tu.name, tu.input, items, fetchItems, guessCategory);
          toolResults.push(result);
        }
        const toolResultContent = toolUses.map((tu: any, i: number) => ({
          type: 'tool_result', tool_use_id: tu.id, content: toolResults[i],
        }));
        const followUp = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': anthropicKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514', max_tokens: 300,
            system: systemPrompt, tools: SHOP_TOOLS,
            messages: [
              ...apiMessages,
              { role: 'assistant', content: data.content },
              { role: 'user', content: toolResultContent },
            ],
          }),
        });
        const followData = await followUp.json();
        const rawFollow = followData.content?.find((b: any) => b.type === 'text')?.text
          ?? toolResults.join(' ');
        const { text: followText, chips: followChips } = parseChips(rawFollow);
        setMessages(prev => prev.map(m => m.id === replyId
          ? { ...m, text: followText, isLoading: false, quickReplies: followChips }
          : m
        ));
        // Log both calls
        try {
          const it = (data.usage?.input_tokens ?? 0) + (followData.usage?.input_tokens ?? 0);
          const ot = (data.usage?.output_tokens ?? 0) + (followData.usage?.output_tokens ?? 0);
          const cost = (it / 1_000_000) * 3.0 + (ot / 1_000_000) * 15.0;
          await supabase.from('api_logs').insert({
            family_id: DUMMY_FAMILY_ID, feature: 'shopping_chat',
            model: 'claude-sonnet-4-20250514', input_tokens: it, output_tokens: ot, cost_usd: cost,
          });
        } catch {}
      } else {
        const rawReply = data.content?.find((b: any) => b.type === 'text')?.text
          ?? 'Something went wrong — try again?';
        const { text: reply, chips: replyChips } = parseChips(rawReply);
        setMessages(prev => prev.map(m => m.id === replyId
          ? { ...m, text: reply, isLoading: false, quickReplies: replyChips }
          : m
        ));
        try {
          const it = data.usage?.input_tokens ?? 0;
          const ot = data.usage?.output_tokens ?? 0;
          const cost = (it / 1_000_000) * 3.0 + (ot / 1_000_000) * 15.0;
          await supabase.from('api_logs').insert({
            family_id: DUMMY_FAMILY_ID, feature: 'shopping_chat',
            model: 'claude-sonnet-4-20250514', input_tokens: it, output_tokens: ot, cost_usd: cost,
          });
        } catch {}
      }
    } catch (e) {
      console.error('sendMessage error:', e);
      setMessages(prev => prev.map(m => m.id === replyId
        ? { ...m, text: 'Something went wrong — try again?', isLoading: false }
        : m
      ));
    } finally {
      setChatLoading(false);
      setTimeout(() => mainScrollRef.current?.scrollToEnd({ animated: true }), 150);
    }
  };

  const renderItems = (list: ShopItem[]) => list.map(item => (

    <ItemRow key={item.id} item={item} onToggle={() => toggleItem(item)} onDelete={() => deleteItem(item.id)} onEdit={() => setEditItem(item)} />
  ));

  const renderPurchased = () => checked.length > 0 ? (
    <>
      <View style={s.purchasedBanner}>
        <View style={s.purchasedLine} />
        <Text style={s.purchasedTxt}>Recently Bought</Text>
        <View style={s.purchasedLine} />
      </View>
      {olderChecked.length > 0 && (
        <TouchableOpacity
          style={s.showOlderBtn}
          onPress={() => setShowOlderBought(v => !v)}
          activeOpacity={0.7}>
          <Text style={s.showOlderTxt}>
            {showOlderBought ? `Hide older items` : `+ ${olderChecked.length} older item${olderChecked.length !== 1 ? 's' : ''}`}
          </Text>
        </TouchableOpacity>
      )}
      {viewMode === 'aisle' ? (
        // Aisle mode — group recently bought by category too
        (() => {
          const byCat = CATEGORIES.reduce<Record<string, ShopItem[]>>((acc, cat) => {
            const ci = checked.filter(i => i.category === cat);
            if (ci.length) acc[cat] = ci;
            return acc;
          }, {});
          return (
            <>
              {Object.entries(byCat).map(([cat, ci]) => (
                <View key={cat}>
                  <Text style={s.sectionLbl}>{cat}</Text>
                  {renderItems(ci)}
                </View>
              ))}
            </>
          );
        })()
      ) : (
        renderItems(checked)
      )}
    </>
  ) : null;

  return (
    <View style={{ flex: 1, backgroundColor: C.bannerBg }}>
      <StatusBar style="dark" />

      {/* ── Banner ── */}
      <SafeAreaView edges={['top']} style={{ backgroundColor: C.bannerBg }}>
        <View style={s.hero}>
          <View style={s.heroRow}>
            <TouchableOpacity style={s.logoWrap} onPress={() => router.navigate('/(tabs)/')} activeOpacity={0.75}>
              <Text style={s.logoWord}>
                {'z'}<Text style={{ color: '#A8E8CC' }}>{'a'}</Text>{'el'}<Text style={{ color: '#A8E8CC' }}>{'i'}</Text>
              </Text>
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, zIndex: 1 }}>
              <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: 'rgba(0,0,0,0.45)' }}>Shopping</Text>
              {activeTab === 'list' && (
                <TouchableOpacity style={s.shareBtn} onPress={shareList} activeOpacity={0.8}>
                  <IcoShare />
                </TouchableOpacity>
              )}
              <HamburgerButton onPress={() => setNavOpen(true)} />
            </View>
          </View>


          {/* Sub-tabs */}
          <View style={s.subTabs}>
            {(['list', 'pantry', 'spend'] as const).map(tab => (
              <TouchableOpacity key={tab} style={[s.subTab, activeTab === tab && s.subTabOn]} onPress={() => setActiveTab(tab)} activeOpacity={0.8}>
                <Text style={[s.subTabTxt, activeTab === tab && s.subTabTxtOn]}>
                  {tab === 'list' ? 'List' : tab === 'pantry' ? 'Pantry' : 'Spend'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </SafeAreaView>

      {/* ── Body — single KAV wrapping all tabs + shared chat ── */}
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={{ flex: 1, position: 'relative' }}>

          {/* ── Per-tab toolbar (List only) ── */}
          {activeTab === 'list' && (
            <View style={s.stickyToolRow}>
              {nudgeItemName && (
                <View style={s.pantryNudgeBanner}>
                  <Text style={s.pantryNudgeTxt}>✦  <Text style={{ fontFamily: 'Poppins_600SemiBold' }}>{nudgeItemName}</Text> is already in your pantry</Text>
                </View>
              )}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginTop: 8, marginBottom: 4 }}>
                <View style={{ backgroundColor: '#A8E8CC', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 4, flexShrink: 0 }}>
                  <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 13, color: '#0A3A2A' }}>
                    {unchecked.length} item{unchecked.length !== 1 ? 's' : ''}
                  </Text>
                </View>
                <View style={[s.listSearchBox, { flex: 1, marginBottom: 0 }]}>
                  <Text style={s.searchIco}>⌕</Text>
                  <TextInput
                    style={s.searchInput}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Search…"
                    placeholderTextColor={C.ink3}
                    clearButtonMode="while-editing"
                    autoCorrect={false}
                  />
                </View>
                <View style={s.viewToggle}>
                  <TouchableOpacity style={[s.viewBtn, viewMode === 'list' && s.viewBtnOn]} onPress={() => setViewMode('list')} activeOpacity={0.8}>
                    <Text style={[s.viewBtnTxt, viewMode === 'list' && s.viewBtnTxtOn]}>List</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.viewBtn, viewMode === 'aisle' && s.viewBtnOn]} onPress={() => setViewMode('aisle')} activeOpacity={0.8}>
                    <Text style={[s.viewBtnTxt, viewMode === 'aisle' && s.viewBtnTxtOn]}>Aisle</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={s.toolRow}>
                <TouchableOpacity style={s.addBar} onPress={() => setAddVisible(true)} activeOpacity={0.7}>
                  <Text style={s.addBarPlus}>＋</Text>
                  <Text style={s.addBarTxt}>Add item…</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ── Single scrollable area — tab content + shared chat thread ── */}
          <ScrollView
            ref={mainScrollRef}
            contentContainerStyle={{ paddingBottom: 120 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            onScroll={handleScroll}
            scrollEventThrottle={16}
          >
            {/* Tab content */}
            {activeTab === 'list' && (
              <>
                {loading ? (
                  <Text style={s.emptyTxt}>Loading…</Text>
                ) : items.length === 0 ? (
                  <View style={s.emptyState}>
                    <Text style={s.emptyEmoji}>🛒</Text>
                    <Text style={s.emptyTitle}>List is empty</Text>
                    <Text style={s.emptyBody}>Tap "Add item" above or ask Zaeli below.</Text>
                  </View>
                ) : viewMode === 'list' ? (
                  renderItems(unchecked)
                ) : (
                  Object.entries(byCategory).map(([cat, ci]) => (
                    <View key={cat}>
                      <Text style={s.sectionLbl}>{cat}</Text>
                      {renderItems(ci)}
                    </View>
                  ))
                )}
                {checked.length > 0 && (
                  <View style={{ marginTop: 8 }}>
                    <TouchableOpacity style={s.rbHeader} onPress={() => setRbExpanded(v => !v)} activeOpacity={0.7}>
                      <View style={s.purchasedLine} />
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={s.purchasedTxt}>Recently Bought</Text>
                        <Text style={{ fontSize: 11, color: C.mag, fontFamily: 'Poppins_600SemiBold' }}>({checked.length})</Text>
                      </View>
                      <Text style={{ fontSize: 13, color: C.mag, fontFamily: 'Poppins_600SemiBold' }}>{rbExpanded ? '▲' : '▼'}</Text>
                      <View style={s.purchasedLine} />
                    </TouchableOpacity>
                    {rbExpanded && (
                      viewMode === 'aisle' ? (
                        (() => {
                          const byCat = CATEGORIES.reduce<Record<string, ShopItem[]>>((acc, cat) => {
                            const ci = checked.filter(i => i.category === cat);
                            if (ci.length) acc[cat] = ci;
                            return acc;
                          }, {});
                          return Object.entries(byCat).map(([cat, ci]) => (
                            <View key={cat}><Text style={s.sectionLbl}>{cat}</Text>{renderItems(ci)}</View>
                          ));
                        })()
                      ) : renderItems(checked)
                    )}
                  </View>
                )}
              </>
            )}
            {activeTab === 'pantry' && <PantryTab shoppingItems={items} onShoppingUpdate={fetchItems} />}
            {activeTab === 'spend'  && <SpendTab />}

            {/* Shared chat thread — Calendar-style with eyebrow, timestamps, icons */}
            {messages.length > 0 && (
              <View style={{ marginTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.06)', paddingTop: 4 }}>
                {messages.map((msg, i) => {
                  if (msg.role === 'user') {
                    return (
                      <View key={msg.id} style={s.shopUserMsgWrap}>
                        <View style={s.shopUserBubble}>
                          <Text style={s.shopUserMsgText}>{msg.text}</Text>
                        </View>
                        <View style={s.shopUserIconRow}>
                          <Text style={s.shopMsgTime}>{msg.ts || ''}</Text>
                          <TouchableOpacity style={s.shopIconBtn} activeOpacity={0.6}><IcoCopy /></TouchableOpacity>
                          <TouchableOpacity style={s.shopIconBtn} activeOpacity={0.6}><IcoForward /></TouchableOpacity>
                        </View>
                      </View>
                    );
                  }
                  const prevMsg = i > 0 ? messages[i-1] : null;
                  const showEyebrow = !prevMsg || prevMsg.role === 'user';
                  const thumbState = thumbs[msg.id] || null;
                  const paragraphs = msg.text
                    ? msg.text.split(/(?<=[.!?])\s+/).map((s: string) => s.trim()).filter(Boolean)
                    : [];
                  return (
                    <View key={msg.id} style={[s.shopZaeliMsgWrap, !showEyebrow && { marginTop: 6 }]}>
                      {showEyebrow ? (
                        <View style={s.shopZEyebrow}>
                          <View style={[s.shopZStar, { backgroundColor: C.ai }]}>
                            <Svg width="9" height="9" viewBox="0 0 16 16" fill="white"><Path d="M8 1L9.5 6.5L15 8L9.5 9.5L8 15L6.5 9.5L1 8L6.5 6.5L8 1Z"/></Svg>
                          </View>
                          <Text style={[s.shopZName, { color: C.ai }]}>Zaeli</Text>
                          <Text style={s.shopZTs}>{msg.ts || ''}</Text>
                        </View>
                      ) : (
                        <Text style={s.shopZTsOnly}>{msg.ts || ''}</Text>
                      )}
                      {msg.isLoading ? (
                        <TypingDots />
                      ) : (
                        <View>
                          {paragraphs.map((para: string, pi: number) => (
                            <Text key={pi} style={[s.shopZaeliMsgText, pi < paragraphs.length - 1 && { marginBottom: 10 }]}>{para}</Text>
                          ))}
                        </View>
                      )}
                      {(msg.quickReplies || []).length > 0 && !msg.isLoading && (
                        <View style={s.shopChipsRow}>
                          {(msg.quickReplies || []).map((chip: string, ci: number) => (
                            <TouchableOpacity key={ci} style={s.shopChip} onPress={() => sendMessage(chip)} activeOpacity={0.7}>
                              <Text style={s.shopChipTxt}>{chip}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                      {!msg.isLoading && (
                        <View style={s.shopZaeliIconRow}>
                          <TouchableOpacity style={s.shopIconBtn} activeOpacity={0.6}><IcoCopy /></TouchableOpacity>
                          <TouchableOpacity style={s.shopIconBtn} activeOpacity={0.6}><IcoForward /></TouchableOpacity>
                          <TouchableOpacity style={s.shopIconBtn} onPress={() => setThumbs(prev => ({ ...prev, [msg.id]: 'up' }))} activeOpacity={0.6}><IcoThumbUp active={thumbState === 'up'} /></TouchableOpacity>
                          <TouchableOpacity style={s.shopIconBtn} onPress={() => setThumbs(prev => ({ ...prev, [msg.id]: 'down' }))} activeOpacity={0.6}><IcoThumbDown active={thumbState === 'down'} /></TouchableOpacity>
                        </View>
                      )}
                    </View>
                  );
                })}
                <View style={{ height: 16 }} />
              </View>
            )}
          </ScrollView>

          {/* Up/down scroll arrows — side by side, show when content is scrollable */}
          {showScrollDown && (
            <View style={s.scrollArrowPair} pointerEvents="box-none">
              <TouchableOpacity style={s.scrollArrowBtn} onPress={() => mainScrollRef.current?.scrollTo({ y: 0, animated: true })} activeOpacity={0.8}>
                <Svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <Line x1="12" y1="19" x2="12" y2="5" stroke="#fff" strokeWidth={2.5} strokeLinecap="round"/>
                  <Polyline points="5 12 12 5 19 12" stroke="#fff" strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                </Svg>
              </TouchableOpacity>
              <TouchableOpacity style={s.scrollArrowBtn} onPress={() => mainScrollRef.current?.scrollToEnd({ animated: true })} activeOpacity={0.8}>
                <IcoArrowDown />
              </TouchableOpacity>
            </View>
          )}

          {/* ── Single chat bar — always visible across all tabs ── */}
          <View style={s.inputArea}>
            <View style={[s.barPill, { backgroundColor: '#fff', borderColor: 'rgba(10,10,10,0.09)' }]}>
              <TouchableOpacity style={s.barBtn} onPress={() => setAddVisible(true)} activeOpacity={0.75}>
                <IcoPlus color="rgba(0,0,0,0.4)" />
              </TouchableOpacity>
              <View style={[s.barSep, { backgroundColor: 'rgba(10,10,10,0.1)' }]} />
              <TextInput
                ref={chatInputRef}
                style={[s.barInput, { color: C.ink }]}
                value={chatInput}
                onChangeText={setChatInput}
                placeholder={activeTab === 'spend' ? 'Ask Zaeli about your spend…' : activeTab === 'pantry' ? 'Ask Zaeli about your pantry…' : 'Ask Zaeli…'}
                placeholderTextColor="rgba(0,0,0,0.5)"
                multiline
                returnKeyType="default"
                keyboardAppearance="light"
                onFocus={() => setTimeout(() => mainScrollRef.current?.scrollToEnd({ animated: true }), 350)}
              />
              {isRecording ? (
                <TouchableOpacity style={[s.barWaveBtn, { backgroundColor: C.ai }]} onPress={() => stopRecording(false)} activeOpacity={0.85}>
                  <WaveformBars />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={s.barMicBtn} onPress={startRecording} activeOpacity={0.75}>
                  <IcoMic color="#F5C8C8" size={26} />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[s.barSend, { backgroundColor: C.ai }, (!chatInput.trim() || chatLoading) && { opacity: 0.4 }]}
                onPress={() => sendMessage()}
                disabled={!chatInput.trim() || chatLoading}
                activeOpacity={0.85}
              >
                <IcoSend />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Mic overlay — root level, works across all tabs */}
      {isRecording && (
        <Animated.View style={[s.micOverlay, { opacity: micOverlayAnim }]}>
          <View style={s.micCard}>
            <MicWaveform />
            <Text style={s.micTimer}>{`${Math.floor(micTimer/60)}:${String(micTimer%60).padStart(2,'0')}`}</Text>
            <Text style={s.micLabel}>Listening…</Text>
            <TouchableOpacity style={s.micStopBtn} onPress={() => stopRecording(false)} activeOpacity={0.85}>
              <View style={s.micStopSquare} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => stopRecording(true)} activeOpacity={0.7}>
              <Text style={s.micCancel}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      <AddItemFlow visible={addVisible} onClose={() => setAddVisible(false)} onSaved={fetchItems}
        onNudge={(name) => { setNudgeItemName(name); setTimeout(() => setNudgeItemName(null), 4000); }} />
      <EditItemModal item={editItem} visible={!!editItem} onClose={() => setEditItem(null)} onSaved={() => { setEditItem(null); fetchItems(); }} />
      <NavMenu visible={navOpen} onClose={() => setNavOpen(false)} />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  hero:           { paddingHorizontal: 22, paddingBottom: 16 },
  heroRow:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4, marginBottom: 14 },
  heroTitle:      { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 34, color: '#0A0A0A', letterSpacing: -0.5, position: 'absolute', left: 0, right: 0, textAlign: 'center' },
  logoWrap:       { flexDirection: 'row', alignItems: 'center', gap: 8, zIndex: 1 },
  logoMark:       { width: 34, height: 34, backgroundColor: 'rgba(0,0,0,0.10)', borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  logoWord:       { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 40, color: '#0A0A0A', letterSpacing: -1.5, lineHeight: 44 },
  shareBtn:       { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.08)', borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.12)', alignItems: 'center', justifyContent: 'center' },

  subTabs:        { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.08)', borderRadius: 22, padding: 3, gap: 2 },
  subTab:         { flex: 1, paddingVertical: 8, borderRadius: 19, alignItems: 'center' },
  subTabOn:       { backgroundColor: '#fff' },
  subTabTxt:      { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: 'rgba(0,0,0,0.40)' },
  subTabTxtOn:    { color: C.dark },

  briefCard:      { marginHorizontal: 18, marginTop: 14, marginBottom: 6, backgroundColor: '#fff', borderRadius: 20, borderWidth: 1.5, borderColor: 'rgba(0,87,255,0.15)', shadowColor: C.blue, shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, overflow: 'hidden' },
  briefHeader:    { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 11, borderBottomWidth: 1, borderBottomColor: 'rgba(0,87,255,0.08)', backgroundColor: 'rgba(0,87,255,0.03)' },
  briefAv:        { width: 30, height: 30, borderRadius: 10, backgroundColor: C.blue, alignItems: 'center', justifyContent: 'center' },
  briefAvTxt:     { color: '#fff', fontSize: 15, fontFamily: 'Poppins_700Bold' },
  briefName:      { fontFamily: 'Poppins_700Bold', fontSize: 13, color: C.ink, flex: 1 },
  briefLiveDot:   { width: 6, height: 6, borderRadius: 3, backgroundColor: C.green },
  briefTime:      { fontFamily: 'Poppins_400Regular', fontSize: 10, color: C.ink3 },
  briefBody:      { padding: 16, paddingTop: 14 },
  briefMsg:       { fontFamily: 'Poppins_400Regular', fontSize: 14, color: C.ink, lineHeight: 22, marginBottom: 14 },
  briefBtns:      { flexDirection: 'row', gap: 8 },
  btnPrimary:     { flex: 1, backgroundColor: C.blue, borderRadius: 12, paddingVertical: 11, alignItems: 'center', justifyContent: 'center' },
  btnPrimaryTxt:  { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: '#fff', textAlign: 'center' },
  btnGhost:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.055)', borderRadius: 12, paddingVertical: 11, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.09)' },
  btnGhostTxt:    { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: C.ink2, textAlign: 'center' },

  stickyToolRow:   { backgroundColor: C.bg, paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)' },
  toolRow:        { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginTop: 8, marginBottom: 4 },
  addBar:         { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.card, borderWidth: 1.5, borderColor: C.border, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10 },
  addBarPlus:     { fontSize: 15, color: C.blue, lineHeight: 20 },
  addBarTxt:      { flex: 1, fontFamily: 'Poppins_400Regular', fontSize: 13, color: C.ink3 },
  micBtn:         { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: 9 },
  viewToggle:     { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: 12, padding: 3, gap: 2 },
  viewBtn:        { width: 52, paddingVertical: 6, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  viewBtnOn:      { backgroundColor: '#fff' },
  viewBtnTxt:     { fontFamily: 'Poppins_600SemiBold', fontSize: 11, color: C.ink2 },
  viewBtnTxtOn:   { color: C.ink },

  sectionLbl:     { fontFamily: 'Poppins_700Bold', fontSize: 10, color: C.ink3, letterSpacing: 1.5, textTransform: 'uppercase', paddingHorizontal: 22, paddingTop: 14, paddingBottom: 6 },

  itemRow:        { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.055)' },
  itemRowDone:    { opacity: 0.5 },
  chkWrap:        { width: 52, alignSelf: 'stretch', justifyContent: 'center', alignItems: 'center' },
  chk:            { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: C.ink3, justifyContent: 'center', alignItems: 'center' },
  chkDone:        { backgroundColor: '#B8A400', borderColor: '#B8A400' },
  chkTick:        { color: '#fff', fontSize: 11, fontFamily: 'Poppins_700Bold' },
  itemBody:       { flex: 1, paddingRight: 8 },
  itemEmoji:      { fontSize: 18, flexShrink: 0, marginRight: 10 },
  itemName:       { fontFamily: 'Poppins_500Medium', fontSize: 14, color: C.ink },
  itemNameDone:   { textDecorationLine: 'line-through', color: C.ink2 },
  itemNameBought: { color: C.mag },
  itemSub:        { fontFamily: 'Poppins_400Regular', fontSize: 11, color: C.ink3, marginTop: 2 },
  itemQty:        { fontFamily: 'Poppins_400Regular', fontSize: 12, color: C.ink3, marginTop: 1 },
  itemQtyRight:   { fontFamily: 'Poppins_400Regular', fontSize: 13, color: C.ink3, flexShrink: 0, marginRight: 6 },
  delBtn:         { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },

  purchasedBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 10 },
  purchasedLine:   { flex: 1, height: 1, backgroundColor: C.border },
  purchasedTxt:    { fontFamily: 'Poppins_700Bold', fontSize: 10, color: C.ink3, letterSpacing: 1.5, textTransform: 'uppercase' },
  showOlderBtn:    { alignSelf: 'center', marginBottom: 10, paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: C.border, backgroundColor: C.card },
  showOlderTxt:    { fontFamily: 'Poppins_600SemiBold', fontSize: 12, color: C.ink2 },
  searchRow:       { marginHorizontal: 16, marginTop: 8, marginBottom: 4 },
  listSearchRow:   { marginHorizontal: 16, marginTop: 8, marginBottom: 4 },
  listSearchBox:   { flexDirection: 'row', alignItems: 'center', backgroundColor: C.bg, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: C.border },
  searchBox:       { flexDirection: 'row', alignItems: 'center', backgroundColor: C.bg, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: C.border },
  searchIco:       { fontSize: 16, color: C.ink3, marginRight: 6 },
  searchInput:     { flex: 1, fontFamily: 'Poppins_400Regular', fontSize: 14, color: C.ink, padding: 0 },
  searchClear:     { fontSize: 14, color: C.ink3, paddingHorizontal: 4 },

  emptyState:     { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyEmoji:     { fontSize: 42, marginBottom: 12 },
  emptyTitle:     { fontFamily: 'Poppins_700Bold', fontSize: 17, color: C.ink, marginBottom: 6 },
  emptyBody:      { fontFamily: 'Poppins_400Regular', fontSize: 14, color: C.ink2, textAlign: 'center', lineHeight: 21 },
  emptyTxt:       { fontFamily: 'Poppins_400Regular', fontSize: 14, color: C.ink3, textAlign: 'center', marginTop: 40 },

  askBarWrap:     { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 16, paddingTop: 10, backgroundColor: C.bg, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.07)' },
  askBar2:        { backgroundColor: '#fff', borderRadius: 22, paddingVertical: 11, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.10)', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 2 } },
  askDiamondWrap: { width: 20, alignItems: 'center', justifyContent: 'center' },
  askDiamond:     { fontSize: 15, color: C.blue },
  askText:        { flex: 1, fontFamily: 'Poppins_400Regular', fontSize: 15, color: 'rgba(0,0,0,0.28)' },
  askMic:         { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: 11, flexShrink: 0 },
  askSend:        { width: 36, height: 36, borderRadius: 11, backgroundColor: '#FF4545', alignItems: 'center', justifyContent: 'center', flexShrink: 0, shadowColor: '#FF4545', shadowOpacity: 0.3, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },

  pantryInsightCard:    { marginHorizontal: 18, marginTop: 14, marginBottom: 4, backgroundColor: '#fff', borderRadius: 20, borderWidth: 1.5, borderColor: 'rgba(255,140,0,0.18)', shadowColor: C.orange, shadowOpacity: 0.07, shadowRadius: 14, shadowOffset: { width: 0, height: 3 }, overflow: 'hidden' },
  pantryInsightAv:      { width: 28, height: 28, borderRadius: 9, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' },
  pantryInsightTitle:   { fontFamily: 'Poppins_700Bold', fontSize: 14, color: C.ink },
  pantryInsightBody:    { fontFamily: 'Poppins_400Regular', fontSize: 13, color: C.ink2, lineHeight: 20, marginBottom: 12 },
  pantryInsightBtn:     { backgroundColor: C.orange, borderRadius: 11, paddingVertical: 11, alignItems: 'center' },
  pantryInsightBtnTxt:  { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: '#fff' },

  pantryToolRow:        { flexDirection: 'row', gap: 10, marginHorizontal: 18, marginTop: 14, marginBottom: 4 },
  pantryScanCard:       { flex: 1, backgroundColor: C.card, borderRadius: 16, borderWidth: 1.5, borderColor: C.border, paddingVertical: 18, alignItems: 'center', justifyContent: 'center', gap: 8 },
  pantryScanLbl:        { fontFamily: 'Poppins_600SemiBold', fontSize: 12, color: C.ink2 },
  pantryScanSub:        { fontFamily: 'Poppins_400Regular', fontSize: 11, color: C.ink3, marginTop: 1 },

  pantryRow:            { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.055)' },
  pantryRowTop:         { flexDirection: 'row', alignItems: 'center', gap: 10 }, /* legacy — row is now flat */
  pantryEmoji:          { fontSize: 18, flexShrink: 0, marginRight: 10 },
  pantryName:           { fontFamily: 'Poppins_500Medium', fontSize: 14, color: C.ink },
  pantryQty:            { fontFamily: 'Poppins_400Regular', fontSize: 11, color: C.ink3, marginTop: 2 },
  pantryListBtn:        { paddingHorizontal: 10, paddingVertical: 5, backgroundColor: C.blueL, borderRadius: 9, borderWidth: 1.5, borderColor: C.blueB, flexShrink: 0 },
  pantryListBtnTxt:     { fontFamily: 'Poppins_700Bold', fontSize: 11, color: C.blue },
  pantryOnListBadge:    { paddingHorizontal: 10, paddingVertical: 5, backgroundColor: 'rgba(0,0,0,0.04)', borderRadius: 9, borderWidth: 1.5, borderColor: C.border, flexShrink: 0 },
  pantryOnListTxt:      { fontFamily: 'Poppins_600SemiBold', fontSize: 11, color: C.ink3 },
  pantryDelBtn:         { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  pantryBarRow:         { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pantryBarTrack:       { flex: 1, height: 4, backgroundColor: C.border, borderRadius: 2, overflow: 'hidden' },
  pantryBarFill:        { height: 4, borderRadius: 2 },
  pantryStockLbl:       { fontFamily: 'Poppins_600SemiBold', fontSize: 11, width: 52, textAlign: 'right' },
  pantryBadge:          { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  pantryBadgeTxt:       { fontFamily: 'Poppins_700Bold', fontSize: 11 },

  pantryBottomBar:      { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 16, paddingTop: 10, backgroundColor: C.bg, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.07)', gap: 8 },
  pantryAddManualBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 10, backgroundColor: C.blueL, borderRadius: 12, borderWidth: 1.5, borderColor: C.blueB },
  pantryAddManualTxt:   { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: C.blue },
  pantryAskDivider:     { height: 1, backgroundColor: 'rgba(0,0,0,0.06)' },
  pantryAskBtn:         { backgroundColor: '#fff', borderRadius: 22, paddingVertical: 11, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.10)', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 2 } },
  pantryAskDiamond:     { width: 20, alignItems: 'center', justifyContent: 'center' },
  pantryAskTxt:         { flex: 1, fontFamily: 'Poppins_400Regular', fontSize: 15, color: 'rgba(0,0,0,0.28)' },
  pantryAskSendBtn:     { width: 36, height: 36, borderRadius: 11, backgroundColor: '#FF4545', alignItems: 'center', justifyContent: 'center', flexShrink: 0, shadowColor: '#FF4545', shadowOpacity: 0.3, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },

  reviewSectionTitle:   { fontFamily: 'Poppins_700Bold', fontSize: 12, color: C.ink3, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 },
  reviewRow:            { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.bg, borderRadius: 12, padding: 12, marginBottom: 7 },
  reviewEmoji:          { fontSize: 20 },
  reviewName:           { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: C.ink },
  reviewQty:            { fontFamily: 'Poppins_400Regular', fontSize: 11, color: C.ink3 },
  reviewRemove:         { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,59,59,0.08)', borderRadius: 8 },
  reviewRemoveTxt:      { fontFamily: 'Poppins_700Bold', fontSize: 12, color: C.red },

  stockPill:            { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: C.border, alignItems: 'center', gap: 4, backgroundColor: C.bg },
  stockPillTxt:         { fontFamily: 'Poppins_600SemiBold', fontSize: 10, color: C.ink2 },

  sheetWrap:        { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 14, paddingBottom: Platform.OS === 'ios' ? 40 : 24, gap: 16 },
  sheetHandle:      { width: 36, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginBottom: 4 },
  sheetTopRow:      { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sheetAv:          { width: 40, height: 40, borderRadius: 13, backgroundColor: C.blue, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  sheetTitle:       { fontFamily: 'Poppins_700Bold', fontSize: 16, color: C.ink },
  sheetSub:         { fontFamily: 'Poppins_400Regular', fontSize: 12, color: C.ink2, marginTop: 1 },
  sheetClose:       { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.06)', alignItems: 'center', justifyContent: 'center' },
  sheetCloseTxt:    { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: C.ink2 },
  sheetPrimary:     { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: 'rgba(0,87,255,0.05)', borderWidth: 1.5, borderColor: 'rgba(0,87,255,0.18)', borderRadius: 18, padding: 16 },
  sheetPrimaryIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: C.blue, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  sheetPrimaryTitle:{ fontFamily: 'Poppins_700Bold', fontSize: 15, color: C.ink, marginBottom: 2 },
  sheetPrimaryDesc: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: C.ink2, lineHeight: 18 },
  sheetPrimaryArrow:{ fontFamily: 'Poppins_700Bold', fontSize: 18, color: C.blue, flexShrink: 0 },
  sheetDivider:     { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sheetDividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(0,0,0,0.07)' },
  sheetDividerTxt:  { fontFamily: 'Poppins_400Regular', fontSize: 12, color: C.ink3 },
  sheetSecondary:   { paddingVertical: 13, borderRadius: 14, borderWidth: 1.5, borderColor: C.border, alignItems: 'center', backgroundColor: C.bg },
  sheetSecondaryTxt:{ fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: C.ink2 },

  modalHdr:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: C.border },
  modalCancel:    { fontFamily: 'Poppins_500Medium', fontSize: 15, color: C.ink2 },
  modalTitle:     { fontFamily: 'Poppins_700Bold', fontSize: 16, color: C.ink },
  modalSave:      { fontFamily: 'Poppins_700Bold', fontSize: 15, color: C.blue },
  fieldBlock:     { gap: 6 },
  fieldLabel:     { fontFamily: 'Poppins_700Bold', fontSize: 10, color: C.ink3, letterSpacing: 1.5 },
  fieldInput:     { backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontFamily: 'Poppins_400Regular', fontSize: 15, color: C.ink },
  saveMoreBtn:    { borderWidth: 1.5, borderColor: C.blue, borderRadius: 12, paddingVertical: 13, alignItems: 'center', backgroundColor: C.blueL },
  saveMoreTxt:    { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: C.blue },
  saveDoneBtn:    { backgroundColor: C.blue, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  saveDoneTxt:    { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: '#fff' },

  pantryNudgeBanner: { marginHorizontal: 18, marginTop: 10, marginBottom: 2, backgroundColor: 'rgba(0,87,255,0.07)', borderRadius: 12, borderWidth: 1.5, borderColor: 'rgba(0,87,255,0.15)', paddingHorizontal: 14, paddingVertical: 10 },
  pantryNudgeTxt:    { fontFamily: 'Poppins_400Regular', fontSize: 13, color: C.blue, lineHeight: 19 },

  // Spend tab
  spendInsightCard:  { marginHorizontal: 18, marginTop: 14, marginBottom: 4, backgroundColor: '#A8E8CC', borderRadius: 20, padding: 18 },
  spendTotal:        { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 38, color: C.ink, marginBottom: 2, letterSpacing: -0.5 },
  spendSubtitle:     { fontFamily: 'Poppins_400Regular', fontSize: 13, color: C.ink2 },
  receiptCard:       { backgroundColor: C.card, borderRadius: 16, borderWidth: 1.5, borderColor: 'rgba(216,204,255,0.4)', marginBottom: 10, overflow: 'hidden' },
  receiptHdr:        { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  receiptEmoji:      { fontSize: 26, flexShrink: 0 },
  receiptStore:      { fontFamily: 'Poppins_700Bold', fontSize: 15, color: C.ink },
  receiptMeta:       { fontFamily: 'Poppins_400Regular', fontSize: 12, color: C.ink2, marginTop: 2 },
  receiptTotal:      { fontFamily: 'Poppins_700Bold', fontSize: 17, color: C.ink, flexShrink: 0 },
  receiptChevron:    { fontFamily: 'Poppins_700Bold', fontSize: 18, color: C.ink3, marginLeft: 4 },
  receiptItems:      { borderTopWidth: 1, borderTopColor: C.border, paddingHorizontal: 16, paddingBottom: 8 },
  receiptItemRow:    { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  receiptItemEmoji:  { fontSize: 16, flexShrink: 0 },
  receiptItemName:   { fontFamily: 'Poppins_400Regular', fontSize: 13, color: C.ink, flex: 1 },
  receiptItemPrice:  { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: C.ink2, flexShrink: 0 },
  receiptMoreTxt:    { fontFamily: 'Poppins_400Regular', fontSize: 12, color: C.ink3, paddingVertical: 10, textAlign: 'center' },

  scanSheetOverlay:  { position: 'absolute', bottom: 0, left: 0, right: 0, top: 0, justifyContent: 'flex-end', zIndex: 100 },
  scanSheet:         { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 36, borderWidth: 1.5, borderColor: C.border, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 20, shadowOffset: { width: 0, height: -4 } },
  scanSheetHandle:   { width: 36, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginBottom: 16 },
  scanSheetRow:      { flexDirection: 'row', alignItems: 'center', gap: 14 },
  scanSheetAv:       { width: 42, height: 42, borderRadius: 13, backgroundColor: C.blue, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  scanSheetTitle:    { fontFamily: 'Poppins_700Bold', fontSize: 16, color: C.ink, marginBottom: 3 },
  scanSheetStep:     { fontFamily: 'Poppins_400Regular', fontSize: 13, color: C.ink2 },

  // ── Calendar-style chat message styles ─────────────────────────────────────
  shopUserMsgWrap:  { alignItems: 'flex-end', marginBottom: 6, paddingHorizontal: 16, marginTop: 18 },
  shopUserBubble:   { backgroundColor: '#F2F2F2', borderRadius: 16, borderBottomRightRadius: 3, paddingHorizontal: 13, paddingVertical: 9, maxWidth: '82%' as any },
  shopUserMsgText:  { fontFamily: 'Poppins_400Regular', fontSize: 17, lineHeight: 27, letterSpacing: -0.1, color: '#0A0A0A' },
  shopUserIconRow:  { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 2, justifyContent: 'flex-end' },
  shopZaeliMsgWrap: { marginBottom: 6, paddingHorizontal: 16, marginTop: 18 },
  shopZEyebrow:     { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 6 },
  shopZStar:        { width: 16, height: 16, borderRadius: 5, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  shopZName:        { fontFamily: 'Poppins_700Bold', fontSize: 10, letterSpacing: 0.2 },
  shopZTs:          { fontFamily: 'Poppins_400Regular', fontSize: 9, color: 'rgba(0,0,0,0.28)', marginLeft: 'auto' as any },
  shopZTsOnly:      { fontFamily: 'Poppins_400Regular', fontSize: 10, color: 'rgba(0,0,0,0.28)', marginBottom: 5 },
  shopZaeliMsgText: { fontFamily: 'Poppins_400Regular', fontSize: 17, lineHeight: 27, letterSpacing: -0.1, color: '#0A0A0A' },
  shopZaeliIconRow: { flexDirection: 'row', alignItems: 'center', marginTop: 7, gap: 2 },
  shopMsgTime:      { fontFamily: 'Poppins_400Regular', fontSize: 10, color: 'rgba(0,0,0,0.28)' },
  shopIconBtn:      { width: 26, height: 26, alignItems: 'center', justifyContent: 'center', borderRadius: 6 },
  shopChipsRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  shopChip:         { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.15)', backgroundColor: '#fff' },
  shopChipTxt:      { fontFamily: 'Poppins_400Regular', fontSize: 12, color: 'rgba(10,10,10,0.65)' },

  // ── Up/down scroll arrows ─────────────────────────────────────────────────
  scrollArrowPair:  { position: 'absolute', bottom: 110, right: 16, flexDirection: 'row', gap: 8, zIndex: 50 },
  scrollArrowBtn:   { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(10,10,10,0.40)', alignItems: 'center', justifyContent: 'center' },

  // ── Mic overlay — matches Home ───────────────────────────────────────────────
  micOverlay:    { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(237,232,255,0.92)', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  micCard:       { backgroundColor: '#fff', borderRadius: 28, paddingVertical: 32, paddingHorizontal: 36, alignItems: 'center', gap: 18, shadowColor: '#000', shadowOpacity: 0.10, shadowRadius: 24, shadowOffset: { width: 0, height: 8 }, borderWidth: 1, borderColor: 'rgba(10,10,10,0.06)' },
  micTimer:      { fontFamily: 'Poppins_600SemiBold', fontSize: 30, color: '#0A0A0A', letterSpacing: 1 },
  micLabel:      { fontFamily: 'Poppins_400Regular', fontSize: 13, color: 'rgba(10,10,10,0.40)' },
  micStopBtn:    { width: 60, height: 60, borderRadius: 30, backgroundColor: '#FF4545', alignItems: 'center', justifyContent: 'center', shadowColor: '#FF4545', shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 4 } },
  micStopSquare: { width: 20, height: 20, borderRadius: 4, backgroundColor: '#fff' },
  micCancel:     { fontFamily: 'Poppins_400Regular', fontSize: 13, color: 'rgba(10,10,10,0.35)' },

  // ── Scroll-down button ────────────────────────────────────────────────────
  scrollDownBtn:   { position: 'absolute', bottom: 100, left: 0, right: 0, alignItems: 'center', zIndex: 50 },
  scrollDownInner: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(10,10,10,0.45)', alignItems: 'center', justifyContent: 'center' },

  // ── Waveform bar (active mic in pill) ────────────────────────────────────
  barWaveBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },

  // ── Ambient strip ─────────────────────────────────────────────────────────
  ambientStrip:   { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 11, backgroundColor: 'rgba(216,204,255,0.12)', borderBottomWidth: 1, borderBottomColor: 'rgba(216,204,255,0.22)', flexShrink: 0 },
  ambientStar:    { width: 22, height: 22, borderRadius: 6, backgroundColor: 'rgba(216,204,255,0.25)', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  ambientTxt:     { fontFamily: 'Poppins_400Regular', fontSize: 13, color: C.ink, flex: 1 },
  ambientChip:    { backgroundColor: C.ai, borderRadius: 14, paddingVertical: 5, paddingHorizontal: 12, flexShrink: 0 },
  ambientChipTxt: { fontFamily: 'Poppins_600SemiBold', fontSize: 11, color: C.ink },

  // ── Recently Bought header ────────────────────────────────────────────────
  rbHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10 },

  // ── Inline chat bar — matches Home exactly ──────────────────────────────────
  inputArea: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 14, paddingBottom: Platform.OS === 'ios' ? 30 : 18, paddingTop: 10, backgroundColor: 'transparent' },
  barPill:   { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 30, paddingVertical: 14, paddingHorizontal: 16, borderWidth: 1, backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 16, shadowOffset: { width: 0, height: -2 }, elevation: 4 },
  barBtn:    { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  barSep:    { width: 1, height: 18, backgroundColor: 'rgba(10,10,10,0.1)', flexShrink: 0 },
  barInput:  { flex: 1, fontFamily: 'Poppins_400Regular', fontSize: 15, color: C.ink, paddingVertical: 0, maxHeight: 100 },
  barMicBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  barSend:   { width: 32, height: 32, borderRadius: 16, backgroundColor: '#FF4545', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
});
