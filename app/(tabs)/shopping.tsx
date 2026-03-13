import { DMSerifDisplay_400Regular } from '@expo-google-fonts/dm-serif-display';
import {
  Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold,
  Poppins_700Bold, Poppins_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/poppins';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
  Modal, Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Line, Path, Polyline, Rect } from 'react-native-svg';
import { supabase } from '../../lib/supabase';
import { HamburgerButton, NavMenu } from '../components/NavMenu';

const DUMMY_FAMILY_ID = '00000000-0000-0000-0000-000000000001';
const DUMMY_USER_NAME = 'Anna';
const IS_PARENT = true; // Anna and Richard can delete; kids cannot
const ANTHROPIC_API_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY || '';

const C = {
  bg: '#F7F7F7', card: '#FFFFFF', border: '#E0E0E0',
  ink: '#0A0A0A', ink2: 'rgba(0,0,0,0.50)', ink3: 'rgba(0,0,0,0.28)',
  dark: '#0A0A0A',
  blue: '#0057FF', blueL: 'rgba(0,87,255,0.08)', blueB: 'rgba(0,87,255,0.22)',
  green: '#00C97A', greenL: 'rgba(0,201,122,0.10)', greenB: 'rgba(0,201,122,0.28)',
  orange: '#FF8C00', orangeL: 'rgba(255,140,0,0.10)',
  red: '#FF3B3B', redL: 'rgba(255,59,59,0.08)',
  yellow: '#FFE500', yellowD: '#B8A400',
  mag: '#E0007C',
  shopTick: '#B8A400',
};

// Stock colours
const STOCK_META: Record<string, { label: string; color: string; bg: string; bars: number }> = {
  critical: { label: 'Critical',    color: C.red,    bg: C.redL,    bars: 1 },
  low:      { label: 'Low',         color: C.orange, bg: C.orangeL, bars: 2 },
  medium:   { label: 'Medium',      color: C.yellowD, bg: 'rgba(255,229,0,0.12)', bars: 3 },
  good:     { label: 'Good',        color: C.green,  bg: C.greenL,  bars: 4 },
};

type ShopItem = {
  id: string; name: string; category: string;
  checked: boolean; meal_source: string | null;
};

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

// ── Icons ────────────────────────────────────────────────────────────────────
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
function IcoTrash({ color = 'rgba(0,0,0,0.25)' }: { color?: string }) {
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
      <Path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"/>
    </Svg>
  );
}
function IcoShare({ color = 'rgba(255,255,255,0.8)' }: { color?: string }) {
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

// ── Pulsing avatar ──────────────────────────────────────────────────────────
function PulsingAvatar() {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 0.75, duration: 1200, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1,    duration: 1200, useNativeDriver: true }),
    ])).start();
  }, []);
  return (
    <View style={{ width: 30, height: 30 }}>
      <Animated.View style={[s.briefAv, { opacity: pulse }]} />
      <View style={[s.briefAv, { position: 'absolute' }]}>
        <Text style={s.briefAvTxt}>✦</Text>
      </View>
    </View>
  );
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

// ── AI helpers ───────────────────────────────────────────────────────────────
async function guessCategory(itemName: string): Promise<string> {
  const categories = ['Fruit & Veg', 'Dairy & Eggs', 'Meat & Seafood', 'Bakery', 'Pantry', 'Frozen', 'Drinks', 'Snacks', 'Household', 'Other'];
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true', 'x-api-key': ANTHROPIC_API_KEY },
      body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 20, messages: [{ role: 'user', content: `Which single category does "${itemName}" belong to? Reply with ONLY the category name. Categories: ${categories.join(', ')}` }] }),
    });
    const data = await res.json();
    const guess = data?.content?.[0]?.text?.trim();
    return categories.find(c => c.toLowerCase() === guess?.toLowerCase()) || 'Other';
  } catch { return 'Other'; }
}

async function scanPantryImage(base64: string): Promise<ScannedPantryItem[]> {
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true', 'x-api-key': ANTHROPIC_API_KEY },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 600,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64 } },
            { type: 'text', text: `You are scanning a fridge or pantry shelf photo. List every distinct food/product item you can see.

For each item, estimate how much is left:
- critical = almost empty / nearly gone
- low = less than 25% remaining  
- medium = roughly half
- good = well stocked / full / new

Respond ONLY as a JSON array, no markdown:
[{"name":"Full cream milk","emoji":"🥛","stock":"low","quantity":"1L remaining"},...]

Rules:
- Use common household names (not brand names unless quantity matters)
- If quantity is obvious (e.g. "2 apples left"), include it
- If unclear, set quantity to null
- Max 20 items` }
          ]
        }],
      }),
    });
    const data = await res.json();
    const raw = data?.content?.[0]?.text || '[]';
    return JSON.parse(raw.replace(/```json|```/g, '').trim()) as ScannedPantryItem[];
  } catch { return []; }
}

const CAT_EMOJI: Record<string, string> = {
  'Fruit & Veg': '🥦', 'Dairy & Eggs': '🥛', 'Meat & Seafood': '🥩',
  'Bakery': '🍞', 'Pantry': '🫙', 'Frozen': '🧊',
  'Drinks': '🥤', 'Snacks': '🍪', 'Household': '🧹', 'Other': '🛒',
};
const CATEGORIES = Object.keys(CAT_EMOJI);

// ── Brief card ───────────────────────────────────────────────────────────────
let briefDismissed = false;
let cachedBrief = '';
let lastBriefCount = -1;
let lastBriefTime: number | null = null;

function ShoppingBriefCard({ itemCount, onDismiss }: { itemCount: number; onDismiss: () => void }) {
  const [loading, setLoading]     = useState(true);
  const [briefText, setBriefText] = useState('');
  const [ctaLabel, setCtaLabel]   = useState("Here's what we need…");
  const cardFade  = useRef(new Animated.Value(0)).current;
  const cardSlide = useRef(new Animated.Value(8)).current;
  const router = useRouter();

  useEffect(() => {
    Animated.parallel([
      Animated.timing(cardFade,  { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(cardSlide, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
    const now = Date.now();
    const countChanged = Math.abs(itemCount - lastBriefCount) >= 3;
    if (cachedBrief && lastBriefTime && (now - lastBriefTime) < 30 * 60 * 1000 && !countChanged) {
      setBriefText(cachedBrief); setLoading(false); return;
    }
    generateBrief();
  }, []);

  const generateBrief = async () => {
    try {
      const prompt = `You are Zaeli, a warm and witty AI family assistant. Generate a brief shopping screen message for ${DUMMY_USER_NAME}. Max 2 sentences. The list has ${itemCount} item${itemCount !== 1 ? 's' : ''}. If empty, invite her to build it. If has items, offer to help fill gaps. End with something concrete. Respond ONLY as JSON: {"brief": "text", "cta": "3-5 words"}`;
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
        body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 120, messages: [{ role: 'user', content: prompt }] }),
      });
      const data = await res.json();
      const parsed = JSON.parse(data?.content?.[0]?.text?.replace(/```json|```/g, '').trim() || '{}');
      cachedBrief = parsed.brief || '';
      lastBriefCount = itemCount;
      lastBriefTime = Date.now();
      setBriefText(cachedBrief);
      setCtaLabel(parsed.cta || "Here's what we need…");
    } catch {
      setBriefText("Can I help build the list this week? Tell me what's on for dinners — or just do a brain dump and I'll sort it. Typos are my problem, not yours 😄");
      setCtaLabel("Here's what we need…");
    } finally { setLoading(false); }
  };

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(cardFade,  { toValue: 0, duration: 280, useNativeDriver: true }),
      Animated.timing(cardSlide, { toValue: -8, duration: 280, useNativeDriver: true }),
    ]).start(() => { briefDismissed = true; onDismiss(); });
  };

  const now = new Date();
  const timeStr = (now.getHours() % 12 || 12) + ':' + String(now.getMinutes()).padStart(2, '0') + ' ' + (now.getHours() < 12 ? 'am' : 'pm');

  return (
    <Animated.View style={[s.briefCard, { opacity: cardFade, transform: [{ translateY: cardSlide }] }]}>
      <View style={s.briefHeader}>
        <PulsingAvatar />
        <Text style={s.briefName}>{'Z'}<Text style={{ color: C.blue }}>{'a'}</Text>{'el'}<Text style={{ color: C.blue }}>{'i'}</Text></Text>
        <View style={s.briefLiveDot} />
        <Text style={s.briefTime}>{timeStr}</Text>
      </View>
      <View style={s.briefBody}>
        {loading ? <TypingDots /> : <Text style={s.briefMsg}>{briefText}</Text>}
        {!loading && (
          <View style={s.briefBtns}>
            <TouchableOpacity style={s.btnPrimary} activeOpacity={0.85} onPress={() =>
              router.push({ pathname: '/(tabs)/zaeli-chat', params: { channel: 'Shopping', returnTo: '/(tabs)/shopping', seedMessage: briefText } })}>
              <Text style={s.btnPrimaryTxt}>{ctaLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.btnGhost} onPress={dismiss} activeOpacity={0.7}>
              <Text style={s.btnGhostTxt}>List is sorted, thanks</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

// ── Stock bars component ─────────────────────────────────────────────────────
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

// ── Pantry item row ──────────────────────────────────────────────────────────
function PantryRow({ item, shoppingItems, onEdit, onDelete, onAddToList }: {
  item: PantryItem;
  shoppingItems: ShopItem[];
  onEdit: () => void;
  onDelete: () => void;
  onAddToList: () => void;
}) {
  const meta = STOCK_META[item.stock] || STOCK_META.good;
  const onList = shoppingItems.some(s => s.name.toLowerCase() === item.name.toLowerCase() && !s.checked);
  // bar fill: critical=15%, low=35%, medium=65%, good=100%
  const barPct = { critical: 0.15, low: 0.38, medium: 0.65, good: 1 }[item.stock] ?? 1;

  return (
    <TouchableOpacity style={s.pantryRow} onPress={onEdit} activeOpacity={0.7}>
      {/* Top row: emoji + name + +List badge */}
      <View style={s.pantryRowTop}>
        <Text style={s.pantryEmoji}>{item.emoji}</Text>
        <View style={{ flex: 1 }}>
          <Text style={s.pantryName}>{item.name}</Text>
          {item.quantity ? <Text style={s.pantryQty}>{item.quantity}</Text> : null}
        </View>
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
      </View>
      {/* Bottom row: stock bar + label */}
      <View style={s.pantryBarRow}>
        <View style={s.pantryBarTrack}>
          <View style={[s.pantryBarFill, { width: `${barPct * 100}%` as any, backgroundColor: meta.color }]} />
        </View>
        <Text style={[s.pantryStockLbl, { color: meta.color }]}>{meta.label}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ── Pantry Scan Review Modal ─────────────────────────────────────────────────
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

  // Classify into updated vs new
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

// ── Edit Pantry Item Modal ───────────────────────────────────────────────────
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
            {/* Emoji + name row */}
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
            {/* Quantity */}
            <View style={s.fieldBlock}>
              <Text style={s.fieldLabel}>QUANTITY (optional)</Text>
              <TextInput style={s.fieldInput} placeholder="e.g. 2L, half full, 3 left" placeholderTextColor={C.ink3} value={qty} onChangeText={setQty} />
            </View>
            {/* Stock level */}
            <View style={s.fieldBlock}>
              <Text style={s.fieldLabel}>STOCK LEVEL</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                {stockOptions.map(opt => {
                  const meta = STOCK_META[opt];
                  const active = stock === opt;
                  return (
                    <TouchableOpacity
                      key={opt}
                      onPress={() => setStock(opt)}
                      style={[s.stockPill, active && { backgroundColor: meta.color, borderColor: meta.color }]}
                      activeOpacity={0.8}
                    >
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

// ── Add Pantry Item Modal ────────────────────────────────────────────────────
function AddPantryModal({ visible, onClose, onSaved }: {
  visible: boolean; onClose: () => void; onSaved: () => void;
}) {
  const [name, setName]     = useState('');
  const [emoji, setEmoji]   = useState('🛒');
  const [stock, setStock]   = useState<'critical' | 'low' | 'medium' | 'good'>('good');
  const [qty, setQty]       = useState('');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) { setName(''); setEmoji('🛒'); setStock('good'); setQty(''); setSaving(false); setTimeout(() => inputRef.current?.focus(), 350); }
  }, [visible]);

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await supabase.from('pantry_items').insert({
        family_id: DUMMY_FAMILY_ID, name: name.trim(), emoji, stock, quantity: qty.trim() || null,
      });
      onSaved();
      onClose();
    } catch (e) { console.log('Pantry add error:', e); }
    setSaving(false);
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
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={s.fieldBlock}>
                <Text style={s.fieldLabel}>EMOJI</Text>
                <TextInput style={[s.fieldInput, { width: 64, textAlign: 'center', fontSize: 24 }]} value={emoji} onChangeText={setEmoji} maxLength={2} />
              </View>
              <View style={[s.fieldBlock, { flex: 1 }]}>
                <Text style={s.fieldLabel}>ITEM NAME</Text>
                <TextInput ref={inputRef} style={s.fieldInput} placeholder="e.g. Milk, Eggs, Pasta" placeholderTextColor={C.ink3} value={name} onChangeText={setName} />
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

// ── Pantry Tab ───────────────────────────────────────────────────────────────
function PantryTab({ shoppingItems, onShoppingUpdate }: { shoppingItems: ShopItem[]; onShoppingUpdate: () => void }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [items, setItems]             = useState<PantryItem[]>([]);
  const [loading, setLoading]         = useState(true);
  const [scanning, setScanning]       = useState(false);
  const [scannedItems, setScannedItems] = useState<ScannedPantryItem[]>([]);
  const [showReview, setShowReview]   = useState(false);
  const [editItem, setEditItem]       = useState<PantryItem | null>(null);
  const [addVisible, setAddVisible]   = useState(false);
  const [addingToList, setAddingToList] = useState<string | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const fetchItems = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('pantry_items').select('*')
        .eq('family_id', DUMMY_FAMILY_ID)
        .order('name', { ascending: true });
      if (isMounted.current) {
        setItems((data || []) as PantryItem[]);
        setLoading(false);
      }
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

  // Image picker (uses expo-image-picker if available, fallback to base64 placeholder for testing)
  const handleScan = async (source: 'camera' | 'library') => {
    try {
      let ImagePicker: any;
      try { ImagePicker = require('expo-image-picker'); } catch { ImagePicker = null; }
      if (!ImagePicker) { Alert.alert('Scanner not available', 'expo-image-picker is not installed.'); return; }

      const perm = source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) { Alert.alert('Permission required', `Please allow ${source === 'camera' ? 'camera' : 'photo library'} access in Settings.`); return; }

      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync({ base64: true, quality: 0.7 })
        : await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.7, mediaTypes: ImagePicker.MediaTypeOptions.Images });

      if (result.canceled || !result.assets?.[0]?.base64) return;

      setScanning(true);
      const found = await scanPantryImage(result.assets[0].base64!);
      setScanning(false);

      if (!found.length) { Alert.alert('Nothing found', "Zaeli couldn't identify any items. Try a clearer photo with better lighting."); return; }
      setScannedItems(found);
      setShowReview(true);
    } catch (e) {
      setScanning(false);
      console.log('Scan error:', e);
      Alert.alert('Scan failed', 'Something went wrong. Please try again.');
    }
  };

  const confirmScan = async (confirmed: ScannedPantryItem[]) => {
    setShowReview(false);
    try {
      for (const item of confirmed) {
        const existing = items.find(e => e.name.toLowerCase() === item.name.toLowerCase());
        if (existing) {
          // Update stock only
          await supabase.from('pantry_items').update({
            stock: item.stock,
            quantity: item.quantity,
            emoji: item.emoji,
          }).eq('id', existing.id);
        } else {
          // New item
          await supabase.from('pantry_items').insert({
            family_id: DUMMY_FAMILY_ID,
            name: item.name, emoji: item.emoji,
            stock: item.stock, quantity: item.quantity,
          });
        }
      }
      await fetchItems();
    } catch (e) { console.log('Confirm scan error:', e); }
  };

  // Split into sections
  const runningLow = items.filter(i => i.stock === 'critical' || i.stock === 'low');
  const wellStocked = items.filter(i => i.stock === 'medium' || i.stock === 'good');

  // Zaeli insight — only show if there are low items
  const lowNames = runningLow.map(i => i.name);

  const addAllToList = async () => {
    const notOnList = runningLow.filter(i => !shoppingItems.some(s => s.name.toLowerCase() === i.name.toLowerCase() && !s.checked));
    for (const item of notOnList) {
      const category = await guessCategory(item.name);
      await supabase.from('shopping_items').insert({
        family_id: DUMMY_FAMILY_ID, name: item.name, item: item.name,
        category, checked: false, completed: false, meal_source: null,
      });
    }
    onShoppingUpdate();
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 160 }} showsVerticalScrollIndicator={false}>

        {/* Zaeli insight card — only when items are low */}
        {!loading && lowNames.length > 0 && (
          <View style={s.pantryInsightCard}>
            <View style={{ padding: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <View style={s.pantryInsightAv}>
                <Text style={{ color: '#fff', fontSize: 13 }}>✦</Text>
              </View>
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

        {/* Scan buttons — two equal white cards */}
        <View style={s.pantryToolRow}>
          <TouchableOpacity style={[s.pantryScanCard, scanning && { opacity: 0.55 }]} onPress={() => handleScan('camera')} disabled={scanning} activeOpacity={0.8}>
            <IcoCamera color={C.ink2} />
            <Text style={s.pantryScanLbl}>{scanning ? 'Scanning…' : 'Scan Fridge'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.pantryScanCard, scanning && { opacity: 0.55 }]} onPress={() => handleScan('library')} disabled={scanning} activeOpacity={0.8}>
            <Text style={{ fontSize: 22, marginBottom: 6 }}>🖼️</Text>
            <Text style={s.pantryScanLbl}>Scan Pantry</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <Text style={s.emptyTxt}>Loading…</Text>
        ) : items.length === 0 ? (
          <View style={s.emptyState}>
            <Text style={s.emptyEmoji}>🫙</Text>
            <Text style={s.emptyTitle}>Pantry is empty</Text>
            <Text style={s.emptyBody}>Scan your fridge or shelves to add items, or tap the button below to add manually.</Text>
          </View>
        ) : (
          <>
            {runningLow.length > 0 && (
              <View>
                <Text style={s.sectionLbl}>Running Low</Text>
                {runningLow.map(item => (
                  <PantryRow
                    key={item.id} item={item} shoppingItems={shoppingItems}
                    onEdit={() => setEditItem(item)}
                    onDelete={() => deleteItem(item.id)}
                    onAddToList={() => addToShoppingList(item)}
                  />
                ))}
              </View>
            )}
            {wellStocked.length > 0 && (
              <View>
                <Text style={s.sectionLbl}>Well Stocked</Text>
                {wellStocked.map(item => (
                  <PantryRow
                    key={item.id} item={item} shoppingItems={shoppingItems}
                    onEdit={() => setEditItem(item)}
                    onDelete={() => deleteItem(item.id)}
                    onAddToList={() => addToShoppingList(item)}
                  />
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Bottom bar: Add manually + Ask Zaeli */}
      <View style={[s.pantryBottomBar, { paddingBottom: insets.bottom + 4 }]}>
        <TouchableOpacity style={s.pantryAddManualBtn} onPress={() => setAddVisible(true)} activeOpacity={0.85}>
          <IcoPlus color={C.blue} />
          <Text style={s.pantryAddManualTxt}>Add manually</Text>
        </TouchableOpacity>
        <View style={s.pantryAskDivider} />
        <TouchableOpacity style={s.pantryAskBtn}
          onPress={() => router.push({ pathname: '/(tabs)/zaeli-chat', params: { channel: 'Shopping', returnTo: '/(tabs)/shopping' } })}
          activeOpacity={0.85}>
          <View style={s.pantryAskDiamond}><Text style={{ fontSize: 13, color: C.blue }}>✦</Text></View>
          <Text style={s.pantryAskTxt}>Ask Zaeli anything…</Text>
          <View style={s.pantryAskSendBtn}><IcoSend /></View>
        </TouchableOpacity>
      </View>

      <PantryScanReviewModal
        visible={showReview}
        scanned={scannedItems}
        existing={items}
        onConfirm={confirmScan}
        onCancel={() => setShowReview(false)}
      />
      <EditPantryModal
        item={editItem}
        visible={!!editItem}
        onClose={() => setEditItem(null)}
        onSaved={() => { setEditItem(null); fetchItems(); }}
      />
      <AddPantryModal
        visible={addVisible}
        onClose={() => setAddVisible(false)}
        onSaved={fetchItems}
      />
    </View>
  );
}

// ── Add Item Flow ────────────────────────────────────────────────────────────
function AddItemFlow({ visible, onClose, onSaved }: {
  visible: boolean; onClose: () => void; onSaved: () => void;
}) {
  const router = useRouter();
  const [step, setStep] = useState<'sheet' | 'form'>('sheet');
  const [name, setName]   = useState('');
  const [qty, setQty]     = useState('');
  const [note, setNote]   = useState('');
  const [saving, setSaving] = useState(false);
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

  const saveAndMore = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      const category = await guessCategory(name.trim());
      const noteStr = [qty.trim(), note.trim()].filter(Boolean).join(' · ') || null;
      await supabase.from('shopping_items').insert({ family_id: DUMMY_FAMILY_ID, name: name.trim(), item: name.trim(), category, checked: false, completed: false, meal_source: noteStr });
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
              <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 12, color: C.ink3, marginTop: -4 }}>
                ✦ Zaeli will sort the category automatically
              </Text>
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

// ── Edit Item Modal ──────────────────────────────────────────────────────────
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

// ── Item Row ─────────────────────────────────────────────────────────────────
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
    <Animated.View style={[s.itemRow, item.checked && s.itemRowDone, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity style={s.chkWrap} onPress={handleToggle} activeOpacity={0.7}>
        <View style={[s.chk, item.checked && s.chkDone]}>
          {item.checked && <Text style={s.chkTick}>✓</Text>}
        </View>
      </TouchableOpacity>
      <TouchableOpacity style={s.itemBody} onPress={onEdit} activeOpacity={0.7}>
        <Text style={s.itemEmoji}>{CAT_EMOJI[item.category] || '🛒'}</Text>
        <View style={{ flex: 1 }}>
          <Text style={[s.itemName, item.checked && s.itemNameDone]}>{item.name}</Text>
          {note ? <Text style={s.itemSub}>{note}</Text> : null}
        </View>
        {qty ? <Text style={s.itemQty}>{qty}</Text> : null}
      </TouchableOpacity>
      <TouchableOpacity style={s.delBtn} onPress={onDelete} activeOpacity={0.7}>
        <IcoTrash />
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Main Screen ──────────────────────────────────────────────────────────────
export default function ShoppingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [fontsLoaded] = useFonts({
    Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold,
    Poppins_700Bold, Poppins_800ExtraBold, DMSerifDisplay_400Regular,
  });

  const [activeTab, setActiveTab]   = useState<'list' | 'pantry' | 'receipts'>('list');
  const [items, setItems]           = useState<ShopItem[]>([]);
  const [loading, setLoading]       = useState(true);
  const [addVisible, setAddVisible] = useState(false);
  const [editItem, setEditItem]     = useState<ShopItem | null>(null);
  const [viewMode, setViewMode]     = useState<'list' | 'aisle'>('list');
  const [showBrief, setShowBrief]   = useState(!briefDismissed);
  const [navOpen, setNavOpen]       = useState(false);

  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const fetchItems = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('shopping_items').select('*')
        .eq('family_id', DUMMY_FAMILY_ID)
        .order('created_at', { ascending: true });
      if (isMounted.current) {
        setItems((data || []) as ShopItem[]);
        setLoading(false);
      }
    } catch (e) { console.log('Fetch error:', e); }
  }, []);

  useFocusEffect(useCallback(() => { fetchItems(); }, [fetchItems]));

  const toggleItem = async (item: ShopItem) => {
    const next = !item.checked;
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, checked: next } : i));
    await supabase.from('shopping_items').update({ checked: next, completed: next }).eq('id', item.id);
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

  const unchecked = items.filter(i => !i.checked);
  const checked   = items.filter(i => i.checked);
  const byCategory = CATEGORIES.reduce<Record<string, ShopItem[]>>((acc, cat) => {
    const ci = unchecked.filter(i => i.category === cat);
    if (ci.length) acc[cat] = ci;
    return acc;
  }, {});

  if (!fontsLoaded) return null;

  const renderItems = (list: ShopItem[]) => list.map(item => (
    <ItemRow key={item.id} item={item} onToggle={() => toggleItem(item)} onDelete={() => deleteItem(item.id)} onEdit={() => setEditItem(item)} />
  ));

  const renderPurchased = () => checked.length > 0 ? (
    <>
      <View style={s.purchasedBanner}>
        <View style={s.purchasedLine} />
        <Text style={s.purchasedTxt}>Purchased</Text>
        <View style={s.purchasedLine} />
      </View>
      {renderItems(checked)}
    </>
  ) : null;

  return (
    <View style={{ flex: 1, backgroundColor: C.dark }}>
      <StatusBar style="light" />

      {/* Hero */}
      <SafeAreaView edges={['top']} style={{ backgroundColor: C.dark }}>
        <View style={s.hero}>
          <View style={s.heroRow}>
            <View style={s.logoWrap}>
              <View style={s.logoMark}>
                <Text style={{ fontSize: 18, color: '#fff' }}>✦</Text>
              </View>
              <Text style={s.logoWord}>
                {'z'}<Text style={{ color: '#FFE500' }}>{'a'}</Text>{'el'}<Text style={{ color: '#FFE500' }}>{'i'}</Text>
              </Text>
            </View>
            <Text style={s.heroTitle}>Shopping</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, zIndex: 1 }}>
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
            {(['list', 'pantry', 'receipts'] as const).map(tab => (
              <TouchableOpacity
                key={tab}
                style={[s.subTab, activeTab === tab && s.subTabOn]}
                onPress={() => setActiveTab(tab)}
                activeOpacity={0.8}
              >
                <Text style={[s.subTabTxt, activeTab === tab && s.subTabTxtOn]}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </SafeAreaView>

      {/* Body */}
      <View style={{ flex: 1, backgroundColor: C.bg }}>

        {/* ── List tab ── */}
        {activeTab === 'list' && (
          <ScrollView contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {showBrief && !loading && (
              <ShoppingBriefCard itemCount={unchecked.length} onDismiss={() => setShowBrief(false)} />
            )}
            <View style={s.toolRow}>
              <TouchableOpacity style={s.addBar} onPress={() => setAddVisible(true)} activeOpacity={0.7}>
                <Text style={s.addBarPlus}>＋</Text>
                <Text style={s.addBarTxt}>Add item…</Text>
                <TouchableOpacity style={s.micBtn} onPress={() => {}} activeOpacity={0.7}>
                  <IcoMic color="rgba(0,0,0,0.40)" />
                </TouchableOpacity>
              </TouchableOpacity>
              <View style={s.viewToggle}>
                <TouchableOpacity style={[s.viewBtn, viewMode === 'list' && s.viewBtnOn]} onPress={() => setViewMode('list')} activeOpacity={0.8}>
                  <Text style={[s.viewBtnTxt, viewMode === 'list' && s.viewBtnTxtOn]}>List</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.viewBtn, viewMode === 'aisle' && s.viewBtnOn]} onPress={() => setViewMode('aisle')} activeOpacity={0.8}>
                  <Text style={[s.viewBtnTxt, viewMode === 'aisle' && s.viewBtnTxtOn]}>Aisle</Text>
                </TouchableOpacity>
              </View>
            </View>
            {loading ? (
              <Text style={s.emptyTxt}>Loading…</Text>
            ) : items.length === 0 ? (
              <View style={s.emptyState}>
                <Text style={s.emptyEmoji}>🛒</Text>
                <Text style={s.emptyTitle}>List is empty</Text>
                <Text style={s.emptyBody}>Tap "Add item" above or ask Zaeli to build the list for you.</Text>
              </View>
            ) : viewMode === 'list' ? (
              <>{renderItems(unchecked)}{renderPurchased()}</>
            ) : (
              <>
                {Object.entries(byCategory).map(([cat, ci]) => (
                  <View key={cat}>
                    <Text style={s.sectionLbl}>{cat}</Text>
                    {renderItems(ci)}
                  </View>
                ))}
                {renderPurchased()}
              </>
            )}
          </ScrollView>
        )}

        {/* ── Pantry tab ── */}
        {activeTab === 'pantry' && (
          <PantryTab shoppingItems={items} onShoppingUpdate={fetchItems} />
        )}

        {/* ── Receipts tab ── */}
        {activeTab === 'receipts' && (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingBottom: 120 }}>
            <Text style={{ fontSize: 44 }}>🧾</Text>
            <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 16, color: C.ink }}>Receipts</Text>
            <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 13, color: C.ink2 }}>Coming soon</Text>
          </View>
        )}

        {/* Ask Zaeli bar — all tabs */}
        {activeTab !== 'pantry' && (
          <View style={[s.askBarWrap, { paddingBottom: insets.bottom + 4 }]}>
            <TouchableOpacity style={s.askBar2}
              onPress={() => router.push({ pathname: '/(tabs)/zaeli-chat', params: { channel: 'Shopping', returnTo: '/(tabs)/shopping' } })}
              activeOpacity={0.85}>
              <View style={s.askDiamondWrap}><Text style={s.askDiamond}>✦</Text></View>
              <Text style={s.askText}>Ask Zaeli anything…</Text>
              <TouchableOpacity style={s.askMic} onPress={() => {}} activeOpacity={0.7}>
                <IcoMic color="rgba(0,0,0,0.45)" />
              </TouchableOpacity>
              <TouchableOpacity style={s.askSend}
                onPress={() => router.push({ pathname: '/(tabs)/zaeli-chat', params: { channel: 'Shopping', returnTo: '/(tabs)/shopping' } })}
                activeOpacity={0.85}>
                <IcoSend />
              </TouchableOpacity>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <AddItemFlow visible={addVisible} onClose={() => setAddVisible(false)} onSaved={fetchItems} />
      <EditItemModal item={editItem} visible={!!editItem} onClose={() => setEditItem(null)} onSaved={() => { setEditItem(null); fetchItems(); }} />
      <NavMenu visible={navOpen} onClose={() => setNavOpen(false)} />
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  hero:           { paddingHorizontal: 22, paddingBottom: 16 },
  heroRow:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4, marginBottom: 14 },
  heroTitle:      { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 34, color: '#fff', letterSpacing: -0.5, position: 'absolute', left: 0, right: 0, textAlign: 'center' },
  logoWrap:       { flexDirection: 'row', alignItems: 'center', gap: 8, zIndex: 1 },
  logoMark:       { width: 34, height: 34, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  logoWord:       { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 24, color: '#fff', letterSpacing: -0.5 },
  shareBtn:       { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.20)', alignItems: 'center', justifyContent: 'center' },

  subTabs:        { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 22, padding: 3, gap: 2 },
  subTab:         { flex: 1, paddingVertical: 8, borderRadius: 19, alignItems: 'center' },
  subTabOn:       { backgroundColor: '#fff' },
  subTabTxt:      { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: 'rgba(255,255,255,0.60)' },
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

  itemRow:        { backgroundColor: C.card, borderRadius: 14, marginHorizontal: 16, marginBottom: 7, borderWidth: 1.5, borderColor: C.border, flexDirection: 'row', alignItems: 'center', overflow: 'hidden' },
  itemRowDone:    { opacity: 0.5 },
  chkWrap:        { width: 52, alignSelf: 'stretch', justifyContent: 'center', alignItems: 'center' },
  chk:            { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: C.ink3, justifyContent: 'center', alignItems: 'center' },
  chkDone:        { backgroundColor: '#B8A400', borderColor: '#B8A400' },
  chkTick:        { color: '#fff', fontSize: 11, fontFamily: 'Poppins_700Bold' },
  itemBody:       { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 13, paddingRight: 12 },
  itemEmoji:      { fontSize: 20, flexShrink: 0 },
  itemName:       { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: C.ink },
  itemNameDone:   { textDecorationLine: 'line-through', color: C.ink2 },
  itemSub:        { fontFamily: 'Poppins_400Regular', fontSize: 11, color: C.ink3, marginTop: 2 },
  itemQty:        { fontFamily: 'Poppins_500Medium', fontSize: 13, color: C.ink2, flexShrink: 0 },
  delBtn:         { width: 44, alignSelf: 'stretch', justifyContent: 'center', alignItems: 'center', borderLeftWidth: 1, borderLeftColor: C.border },

  purchasedBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 10 },
  purchasedLine:   { flex: 1, height: 1, backgroundColor: C.border },
  purchasedTxt:    { fontFamily: 'Poppins_700Bold', fontSize: 10, color: C.ink3, letterSpacing: 1.5, textTransform: 'uppercase' },

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
  askSend:        { width: 36, height: 36, borderRadius: 11, backgroundColor: C.blue, alignItems: 'center', justifyContent: 'center', flexShrink: 0, shadowColor: C.blue, shadowOpacity: 0.3, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },

  // Pantry — insight card (matches briefing-card style, orange theme)
  pantryInsightCard:    { marginHorizontal: 18, marginTop: 14, marginBottom: 4, backgroundColor: '#fff', borderRadius: 20, borderWidth: 1.5, borderColor: 'rgba(255,140,0,0.18)', shadowColor: C.orange, shadowOpacity: 0.07, shadowRadius: 14, shadowOffset: { width: 0, height: 3 }, overflow: 'hidden' },
  pantryInsightAv:      { width: 28, height: 28, borderRadius: 9, backgroundColor: C.orange, alignItems: 'center', justifyContent: 'center' },
  pantryInsightTitle:   { fontFamily: 'Poppins_700Bold', fontSize: 14, color: C.ink },
  pantryInsightBody:    { fontFamily: 'Poppins_400Regular', fontSize: 13, color: C.ink2, lineHeight: 20, marginBottom: 12 },
  pantryInsightBtn:     { backgroundColor: C.orange, borderRadius: 11, paddingVertical: 11, alignItems: 'center' },
  pantryInsightBtnTxt:  { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: '#fff' },

  // Pantry — scan cards (two equal white cards side by side)
  pantryToolRow:        { flexDirection: 'row', gap: 10, marginHorizontal: 18, marginTop: 14, marginBottom: 4 },
  pantryScanCard:       { flex: 1, backgroundColor: C.card, borderRadius: 16, borderWidth: 1.5, borderColor: C.border, paddingVertical: 18, alignItems: 'center', justifyContent: 'center', gap: 8 },
  pantryScanLbl:        { fontFamily: 'Poppins_600SemiBold', fontSize: 12, color: C.ink2 },

  // Pantry — item rows (reference list-item style + stock bar)
  pantryRow:            { backgroundColor: C.card, borderRadius: 14, marginHorizontal: 18, marginBottom: 7, borderWidth: 1.5, borderColor: C.border, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 10 },
  pantryRowTop:         { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  pantryEmoji:          { fontSize: 22, flexShrink: 0 },
  pantryName:           { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: C.ink },
  pantryQty:            { fontFamily: 'Poppins_400Regular', fontSize: 11, color: C.ink3, marginTop: 2 },
  pantryListBtn:        { paddingHorizontal: 10, paddingVertical: 5, backgroundColor: C.blueL, borderRadius: 9, borderWidth: 1.5, borderColor: C.blueB, flexShrink: 0 },
  pantryListBtnTxt:     { fontFamily: 'Poppins_700Bold', fontSize: 11, color: C.blue },
  pantryOnListBadge:    { paddingHorizontal: 10, paddingVertical: 5, backgroundColor: 'rgba(0,0,0,0.04)', borderRadius: 9, borderWidth: 1.5, borderColor: C.border, flexShrink: 0 },
  pantryOnListTxt:      { fontFamily: 'Poppins_600SemiBold', fontSize: 11, color: C.ink3 },
  pantryDelBtn:         { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', marginLeft: 4, flexShrink: 0 },
  pantryBarRow:         { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pantryBarTrack:       { flex: 1, height: 4, backgroundColor: C.border, borderRadius: 2, overflow: 'hidden' },
  pantryBarFill:        { height: 4, borderRadius: 2 },
  pantryStockLbl:       { fontFamily: 'Poppins_600SemiBold', fontSize: 11, width: 52, textAlign: 'right' },

  // Pantry bottom bar: Add manually + Ask Zaeli
  pantryBottomBar:      { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 16, paddingTop: 10, backgroundColor: C.bg, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.07)', gap: 8 },
  pantryAddManualBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 10, backgroundColor: C.blueL, borderRadius: 12, borderWidth: 1.5, borderColor: C.blueB },
  pantryAddManualTxt:   { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: C.blue },
  pantryAskDivider:     { height: 1, backgroundColor: 'rgba(0,0,0,0.06)' },
  pantryAskBtn:         { backgroundColor: '#fff', borderRadius: 22, paddingVertical: 11, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.10)', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 2 } },
  pantryAskDiamond:     { width: 20, alignItems: 'center', justifyContent: 'center' },
  pantryAskTxt:         { flex: 1, fontFamily: 'Poppins_400Regular', fontSize: 15, color: 'rgba(0,0,0,0.28)' },
  pantryAskSendBtn:     { width: 36, height: 36, borderRadius: 11, backgroundColor: C.blue, alignItems: 'center', justifyContent: 'center', flexShrink: 0, shadowColor: C.blue, shadowOpacity: 0.3, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },

  // Scan review
  reviewSectionTitle:   { fontFamily: 'Poppins_700Bold', fontSize: 12, color: C.ink3, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 },
  reviewRow:            { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.bg, borderRadius: 12, padding: 12, marginBottom: 7 },
  reviewEmoji:          { fontSize: 20 },
  reviewName:           { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: C.ink },
  reviewQty:            { fontFamily: 'Poppins_400Regular', fontSize: 11, color: C.ink3 },
  reviewRemove:         { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,59,59,0.08)', borderRadius: 8 },
  reviewRemoveTxt:      { fontFamily: 'Poppins_700Bold', fontSize: 12, color: C.red },

  // Stock pills
  stockPill:            { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: C.border, alignItems: 'center', gap: 4, backgroundColor: C.bg },
  stockPillTxt:         { fontFamily: 'Poppins_600SemiBold', fontSize: 10, color: C.ink2 },

  // Sheets / modals
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
});