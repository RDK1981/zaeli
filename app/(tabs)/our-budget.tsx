/**
 * our-budget.tsx — Zaeli Our Budget · v2 Pure Planner
 *
 * No live tracking. Three surfaces:
 *  1. Monthly plan — income, fixed categories (with line items), variable
 *     categories (with target), surplus/savings calculated.
 *  2. Savings goals — forward-looking, manual progress.
 *  3. One-off AI helper — upload statement → Zaeli suggests realistic
 *     budget amounts. Suggestions are ephemeral; only accepted changes
 *     apply. No transactions stored.
 *
 * All state is local for this session — Supabase wiring in backend pass.
 */

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal,
  Dimensions, Alert, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform,
  Clipboard,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import DateTimePicker from '@react-native-community/datetimepicker';
import MoreSheet from '../components/MoreSheet';

const { height: H } = Dimensions.get('window');

// ── Colour tokens ──────────────────────────────────────────────────────────
const BG        = '#FAF8F5';
const CARD      = '#FFFFFF';
const INK       = '#0A0A0A';
const INK2      = 'rgba(10,10,10,0.72)';
const INK3      = 'rgba(10,10,10,0.55)';
const INK4      = 'rgba(10,10,10,0.42)';
const INK5      = 'rgba(10,10,10,0.30)';
const BORDER    = 'rgba(10,10,10,0.06)';

// Budget palette — mint-based (matches Meals palette + Zaeli language)
const BUD       = '#2D7A52';  // primary (deep green) — fills, primary text
const BUD_DARK  = '#1F5E3F';  // darker text on light backgrounds
const BUD_MID   = '#B8EDD0';  // mint — wordmark a+i, surplus accents
const BUD_CARD  = '#E6F7EF';  // mint tint for cards
const BUD_LIGHT = '#C8F0DA';  // light border tone

// Savings — sky from My Space palette (softer than hard blue)
const SKY_BG    = '#E8F4FD';  // pale sky tint
const SKY_MID   = '#A8D8F0';  // sky (My Space palette)
const SKY_DARK  = '#0A4A6A';  // readable sky text

// Over / warm warning — peach from Notes palette (not alarm red)
const PEACH_BG  = '#F5EDE3';
const PEACH_MID = '#FAC8A8';
const PEACH_DARK= '#8A3A00';

const NEUT_BG   = '#F0EDE8';  // warmer neutral
const NEUT_TXT  = '#5A5D56';

const SLATE     = '#2D3748';
const DANGER    = '#C53030';  // destructive action only (delete buttons)

// ── Types ──────────────────────────────────────────────────────────────────
type Tab = 'overview' | 'categories' | 'goals';

interface IncomeStream {
  id: string;
  label: string;
  type: string;
  monthlyAmount: number;
  memberId?: string;
}

interface Category {
  id: string;
  name: string;
  emoji: string;
  type: 'fixed' | 'variable';
  monthlyTarget?: number; // variable only
  sortOrder: number;
}

interface LineItem {
  id: string;
  categoryId: string;
  label: string;
  monthlyAmount: number;
}

interface Goal {
  id: string;
  name: string;
  emoji: string;
  saved: number;
  target: number;
  targetDate: string;
  monthlyContribution: number;
}

// ── Seed data ──────────────────────────────────────────────────────────────
const SEED_STREAMS: IncomeStream[] = [
  { id: 's1', label: 'Anna',           type: 'Salary',   monthlyAmount: 5800, memberId: 'anna' },
  { id: 's2', label: 'Richard',        type: 'Salary',   monthlyAmount: 3200, memberId: 'richard' },
  { id: 's3', label: 'Rental income',  type: 'Property', monthlyAmount: 200 },
];

const SEED_CATEGORIES: Category[] = [
  { id: 'f1', name: 'Mortgage',          emoji: '🏠', type: 'fixed',    sortOrder: 1 },
  { id: 'f2', name: 'Mobile & Internet', emoji: '📱', type: 'fixed',    sortOrder: 2 },
  { id: 'f3', name: 'Subscriptions',     emoji: '📺', type: 'fixed',    sortOrder: 3 },
  { id: 'f4', name: 'Insurance',         emoji: '🏥', type: 'fixed',    sortOrder: 4 },
  { id: 'v1', name: 'Groceries',         emoji: '🛒', type: 'variable', monthlyTarget: 450, sortOrder: 5 },
  { id: 'v2', name: 'Dining out',        emoji: '🍽️', type: 'variable', monthlyTarget: 250, sortOrder: 6 },
  { id: 'v3', name: 'Kids activities',   emoji: '🎽', type: 'variable', monthlyTarget: 300, sortOrder: 7 },
  { id: 'v4', name: 'Health & medical',  emoji: '💊', type: 'variable', monthlyTarget: 150, sortOrder: 8 },
  { id: 'v5', name: 'Clothing',          emoji: '👗', type: 'variable', monthlyTarget: 120, sortOrder: 9 },
];

const SEED_LINE_ITEMS: LineItem[] = [
  { id: 'li1', categoryId: 'f1', label: 'Home loan',         monthlyAmount: 2800 },
  { id: 'li2', categoryId: 'f2', label: 'Rich phone',        monthlyAmount: 70 },
  { id: 'li3', categoryId: 'f2', label: 'Anna phone',        monthlyAmount: 70 },
  { id: 'li4', categoryId: 'f2', label: 'Home internet',     monthlyAmount: 80 },
  { id: 'li5', categoryId: 'f3', label: 'Netflix',           monthlyAmount: 22 },
  { id: 'li6', categoryId: 'f3', label: 'Spotify Family',    monthlyAmount: 12 },
  { id: 'li7', categoryId: 'f3', label: 'iCloud 200GB',      monthlyAmount: 5 },
  { id: 'li8', categoryId: 'f3', label: 'Apple One',         monthlyAmount: 10 },
  { id: 'li9', categoryId: 'f4', label: 'Health insurance',  monthlyAmount: 380 },
  { id: 'li10',categoryId: 'f4', label: 'Car insurance',     monthlyAmount: 28 },
  { id: 'li11',categoryId: 'f4', label: 'Contents insurance',monthlyAmount: 10 },
];

const SEED_GOALS: Goal[] = [
  { id: 'g1', name: 'Noosa holiday',    emoji: '✈️', saved: 3400, target: 5000,  targetDate: 'Oct \'25', monthlyContribution: 500 },
  { id: 'g2', name: 'School fees 2026', emoji: '🏫', saved: 3720, target: 12000, targetDate: 'Jan \'26', monthlyContribution: 700 },
  { id: 'g3', name: 'Home reno',        emoji: '🏠', saved: 2400, target: 20000, targetDate: 'Flexible',  monthlyContribution: 200 },
];

const EMOJI_OPTIONS = ['🏠','🛒','🍽️','📱','📺','🏥','🎽','💊','👗','🚗','⛽','☕','🎬','💼','✈️','🎁','🐕','💡','📚','🌱','🎨','💰','🏫','🛠️'];
const GOAL_EMOJI_OPTIONS = ['✈️','🏫','🏠','💰','🎁','🚗','🛠️','🏖️','🎓','💼'];

// ── Helpers ────────────────────────────────────────────────────────────────
function fmtAud(n: number): string { return `$${Math.round(n).toLocaleString('en-AU')}`; }
function pct(a: number, b: number): number { return b === 0 ? 0 : Math.round((a / b) * 100); }

function categoryBudget(cat: Category, lineItems: LineItem[]): number {
  if (cat.type === 'variable') return cat.monthlyTarget ?? 0;
  return lineItems.filter(li => li.categoryId === cat.id).reduce((a, li) => a + li.monthlyAmount, 0);
}

// ── SVG atoms ──────────────────────────────────────────────────────────────
function BackArrow() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M15 18l-6-6 6-6" stroke={INK2} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"/>
    </Svg>
  );
}
function Hamburger() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M3 6h18M3 12h18M3 18h18" stroke={INK} strokeWidth={2.2} strokeLinecap="round"/>
    </Svg>
  );
}
function IcoEdit({ color = BUD_MID }: { color?: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4z" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"/>
    </Svg>
  );
}
function IcoPlus({ color = INK }: { color?: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="M12 5v14M5 12h14" stroke={color} strokeWidth={2.4} strokeLinecap="round"/>
    </Svg>
  );
}
function IcoChevron() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path d="M9 6l6 6-6 6" stroke={INK5} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"/>
    </Svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ═══════════════════════════════════════════════════════════════════════════
export default function OurBudgetScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [moreOpen, setMoreOpen]   = useState(false);

  // Data state
  const [streams, setStreams]         = useState<IncomeStream[]>(SEED_STREAMS);
  const [categories, setCategories]   = useState<Category[]>(SEED_CATEGORIES);
  const [lineItems, setLineItems]     = useState<LineItem[]>(SEED_LINE_ITEMS);
  const [goals, setGoals]             = useState<Goal[]>(SEED_GOALS);

  // Sheet state
  const [catDetail, setCatDetail]           = useState<Category | null>(null);
  const [incomeOpen, setIncomeOpen]         = useState(false);
  const [editCatPayload, setEditCatPayload] = useState<Category | 'new-fixed' | 'new-variable' | null>(null);
  const [editGoalPayload, setEditGoalPayload] = useState<Goal | 'new' | null>(null);
  const [aiHelperOpen, setAiHelperOpen]     = useState(false);
  const [aiSuggestions, setAiSuggestions]   = useState<null | AISuggestions>(null);
  const [scanning, setScanning]             = useState(false);

  // Derived totals
  const monthlyIncome = streams.reduce((a, s) => a + s.monthlyAmount, 0);
  const fixedBudget   = categories.filter(c => c.type === 'fixed').reduce((a, c) => a + categoryBudget(c, lineItems), 0);
  const variableBudget= categories.filter(c => c.type === 'variable').reduce((a, c) => a + categoryBudget(c, lineItems), 0);
  const totalBudgeted = fixedBudget + variableBudget;
  const totalSavings  = goals.reduce((a, g) => a + g.monthlyContribution, 0);
  const totalSurplus  = monthlyIncome - totalBudgeted - totalSavings; // can be negative when over-allocated
  const fixedCount    = categories.filter(c => c.type === 'fixed').length;
  const varCount      = categories.filter(c => c.type === 'variable').length;

  // ── Save helpers ────────────────────────────────────────────────────────
  function saveStream(u: IncomeStream) {
    setStreams(prev => prev.some(s => s.id === u.id) ? prev.map(s => s.id === u.id ? u : s) : [...prev, u]);
  }
  function removeStream(id: string) {
    setStreams(prev => prev.filter(s => s.id !== id));
  }
  function saveCategory(u: Category) {
    setCategories(prev => prev.some(c => c.id === u.id) ? prev.map(c => c.id === u.id ? u : c) : [...prev, u]);
  }
  function removeCategory(id: string) {
    setCategories(prev => prev.filter(c => c.id !== id));
    setLineItems(prev => prev.filter(li => li.categoryId !== id));
  }
  function saveLineItem(u: LineItem) {
    setLineItems(prev => prev.some(li => li.id === u.id) ? prev.map(li => li.id === u.id ? u : li) : [...prev, u]);
  }
  function removeLineItem(id: string) {
    setLineItems(prev => prev.filter(li => li.id !== id));
  }
  function saveGoal(u: Goal) {
    setGoals(prev => prev.some(g => g.id === u.id) ? prev.map(g => g.id === u.id ? u : g) : [...prev, u]);
  }
  function removeGoal(id: string) {
    setGoals(prev => prev.filter(g => g.id !== id));
  }

  // ── AI helper: build prompt + call Claude + parse suggestions ─────────
  function buildAnalysisPrompt(): string {
    const variableCatList = categories.filter(c => c.type === 'variable').map(c => c.name).join(', ');
    return `You are helping an Australian family PLAN their monthly budget from recent bank statements.

IMPORTANT: You are NOT tracking specific transactions. You are producing AVERAGES and detecting RECURRING commitments to help the family set realistic budgets. Raw transactions are not stored.

Analyze the input and produce:

1. VARIABLE SPENDING AVERAGES — for categories like groceries, dining, fuel, activities, etc:
   - Calculate monthly average across all months visible (sum all detected / number of months)
   - Skip one-off expenses (holidays, big-ticket items) — focus on routine patterns
   - Only map to these EXISTING variable categories: ${variableCatList}
   - If a pattern clearly doesn't fit any existing category, propose a new one (e.g. "Fuel" seeing repeated BP/Shell/Ampol)

2. RECURRING FIXED SUBSCRIPTIONS — same merchant, similar monthly amount, occurring ≥ 2 months:
   - These are likely subscriptions or services (Netflix, Spotify, gym, iCloud)
   - Return merchant + monthly amount

Return ONLY valid JSON, no markdown fences, no prose:
{
  "variable_suggestions": [
    { "category_name": "Groceries", "avg_monthly_amount": 518, "months_analysed": 3, "reason": "Woolworths + Coles + IGA averaged $518 across 3 months" }
  ],
  "new_variable_categories": [
    { "name": "Fuel", "emoji": "⛽", "avg_monthly_amount": 220, "months_analysed": 3, "reason": "BP + Shell + Ampol" }
  ],
  "subscription_detections": [
    { "merchant": "Netflix", "monthly_amount": 22, "months_detected": 3 }
  ]
}

Never invent variable category names outside the existing list — put those in new_variable_categories instead. Keep each reason under 90 characters.`;
  }

  // Single shared analysis call — takes Claude content blocks (images and/or text)
  async function analyseStatement(contentBlocks: any[]) {
    try {
      setScanning(true);
      const claudeKey = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? '';
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': claudeKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 3000,
          messages: [{ role: 'user', content: contentBlocks }],
        }),
      });
      const data = await res.json();
      const raw = (Array.isArray(data?.content) ? data.content.find((b: any) => b?.type === 'text')?.text : '') || '';
      const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '');
      setScanning(false);

      let parsed: AISuggestions;
      try { parsed = JSON.parse(cleaned); } catch {
        Alert.alert('Could not read statement', 'Try again with clearer data.');
        return;
      }
      setAiSuggestions(parsed);
    } catch (e) {
      console.error('[budget ai]', e);
      setScanning(false);
      Alert.alert('Something went wrong', 'Try again.');
    }
  }

  // Photo flow: multi-select screenshots, convert to image blocks, analyse
  async function runAIHelperPhoto() {
    setAiHelperOpen(false);
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) { Alert.alert('Photos permission', 'Enable photo access in Settings to upload statements.'); return; }
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 6,
      quality: 0.85,
    });
    if (r.canceled || !r.assets?.length) return;

    try {
      setScanning(true);
      const imageBlocks: any[] = [];
      for (const asset of r.assets) {
        const ext = asset.uri.split('.').pop()?.toLowerCase() || 'jpg';
        let readUri = asset.uri;
        if (ext === 'heic' || ext === 'heif') {
          const converted = await manipulateAsync(asset.uri, [], { compress: 0.85, format: SaveFormat.JPEG });
          readUri = converted.uri;
        }
        const resized = await manipulateAsync(readUri, [{ resize: { width: 1400 } }], { compress: 0.85, format: SaveFormat.JPEG });
        const b64 = await FileSystem.readAsStringAsync(resized.uri, { encoding: 'base64' as any });
        imageBlocks.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: b64 } });
      }
      setScanning(false); // analyseStatement will flip back on
      await analyseStatement([...imageBlocks, { type: 'text', text: buildAnalysisPrompt() }]);
    } catch (e) {
      console.error('[budget ai photo]', e);
      setScanning(false);
      Alert.alert('Image error', "Couldn't read one of those images. Try different screenshots.");
    }
  }

  // Paste flow: read clipboard text, analyse as text input
  async function runAIHelperPaste() {
    setAiHelperOpen(false);
    let text: string = '';
    try { text = await (Clipboard as any).getString(); } catch { text = ''; }
    if (!text || text.trim().length < 60) {
      Alert.alert('Nothing to paste', 'Copy your statement text from your bank app first, then tap Paste statement.');
      return;
    }
    await analyseStatement([{ type: 'text', text: `${buildAnalysisPrompt()}\n\n──── STATEMENT TEXT ────\n${text.slice(0, 60000)}` }]);
  }

  // CSV/PDF flow: requires expo-document-picker (not installed). Graceful instruction.
  async function runAIHelperCsvPdf() {
    setAiHelperOpen(false);
    Alert.alert(
      'Needs a dev client rebuild',
      'CSV/PDF uploads need the expo-document-picker module, which isn\'t installed yet.\n\nTo enable:\n1. Run: npx expo install expo-document-picker\n2. Rebuild the dev client\n\nPaste and Photo work today — try those in the meantime.',
    );
  }

  // Apply accepted AI suggestions
  function applyAISuggestions(accepted: AIAccepted) {
    // 1. Variable category target updates
    setCategories(prev => prev.map(c => {
      const upd = accepted.variableUpdates.find(v => v.categoryId === c.id);
      return upd ? { ...c, monthlyTarget: upd.amount } : c;
    }));

    // 2. New variable categories
    const newCats: Category[] = accepted.newVariableCategories.map((nc, i) => ({
      id: `c-${Date.now()}-${i}`,
      name: nc.name,
      emoji: nc.emoji,
      type: 'variable',
      monthlyTarget: nc.amount,
      sortOrder: Date.now() + i,
    }));
    if (newCats.length > 0) setCategories(prev => [...prev, ...newCats]);

    // 3. New subscription line items — go into Subscriptions category (find or create)
    if (accepted.newSubscriptions.length > 0) {
      let subCatId = categories.find(c => c.type === 'fixed' && /subscription/i.test(c.name))?.id;
      if (!subCatId) {
        const newSubCat: Category = {
          id: `c-sub-${Date.now()}`,
          name: 'Subscriptions',
          emoji: '📺',
          type: 'fixed',
          sortOrder: Date.now(),
        };
        setCategories(prev => [...prev, newSubCat]);
        subCatId = newSubCat.id;
      }
      const newLIs: LineItem[] = accepted.newSubscriptions.map((sub, i) => ({
        id: `li-${Date.now()}-${i}`,
        categoryId: subCatId!,
        label: sub.merchant,
        monthlyAmount: sub.amount,
      }));
      setLineItems(prev => [...prev, ...newLIs]);
    }

    setAiSuggestions(null);
    Alert.alert('Budget updated', 'Your accepted suggestions have been applied to your plan.');
  }

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: BG, paddingTop: insets.top }}>
      <StatusBar style="dark"/>

      {/* Header */}
      <View style={s.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TouchableOpacity onPress={() => router.back()} style={s.back} activeOpacity={0.7}><BackArrow/></TouchableOpacity>
          <Text style={s.wordmark}>z<Text style={{ color: BUD_MID }}>a</Text>el<Text style={{ color: BUD_MID }}>i</Text></Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={s.pageLabel}>Our Budget</Text>
          <TouchableOpacity onPress={() => setMoreOpen(true)} style={s.hamburger} activeOpacity={0.7}><Hamburger/></TouchableOpacity>
        </View>
      </View>

      {/* Tab switcher */}
      <View style={s.tabRow}>
        {(['overview', 'categories', 'goals'] as Tab[]).map(t => (
          <TouchableOpacity key={t} style={[s.tab, activeTab === t && s.tabOn]} onPress={() => setActiveTab(t)} activeOpacity={0.7}>
            <Text style={[s.tabTxt, activeTab === t && s.tabTxtOn]}>{t === 'overview' ? 'Overview' : t === 'categories' ? 'Categories' : 'Savings'}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Active tab */}
      {activeTab === 'overview' && (
        <OverviewTab
          income={monthlyIncome}
          budgeted={totalBudgeted}
          savings={totalSavings}
          surplus={totalSurplus}
          fixedBudget={fixedBudget}
          variableBudget={variableBudget}
          fixedCount={fixedCount}
          varCount={varCount}
          goalCount={goals.length}
          onEditIncome={() => setIncomeOpen(true)}
          onOpenFixed={() => setActiveTab('categories')}
          onOpenVariable={() => setActiveTab('categories')}
          onOpenGoals={() => setActiveTab('goals')}
          onAIHelper={() => setAiHelperOpen(true)}
        />
      )}
      {activeTab === 'categories' && (
        <CategoriesTab
          categories={categories}
          lineItems={lineItems}
          onOpenCategory={setCatDetail}
          onAddFixed={() => setEditCatPayload('new-fixed')}
          onAddVariable={() => setEditCatPayload('new-variable')}
        />
      )}
      {activeTab === 'goals' && (
        <GoalsTab
          goals={goals}
          onEditGoal={g => setEditGoalPayload(g)}
          onAddGoal={() => setEditGoalPayload('new')}
        />
      )}

      {/* Sheets */}
      <CategoryDetailSheet
        category={catDetail}
        lineItems={lineItems}
        onClose={() => setCatDetail(null)}
        onSaveLineItem={saveLineItem}
        onRemoveLineItem={removeLineItem}
        onEditCategory={() => { if (catDetail) { setEditCatPayload(catDetail); setCatDetail(null); } }}
        onSaveCategory={saveCategory}
        onAIHelper={() => { setCatDetail(null); setAiHelperOpen(true); }}
      />
      <IncomeEditorSheet
        visible={incomeOpen}
        streams={streams}
        onClose={() => setIncomeOpen(false)}
        onSaveStream={saveStream}
        onRemoveStream={removeStream}
      />
      <EditCategorySheet
        visible={!!editCatPayload}
        payload={editCatPayload}
        onClose={() => setEditCatPayload(null)}
        onSave={c => { saveCategory(c); setEditCatPayload(null); }}
        onRemove={id => { removeCategory(id); setEditCatPayload(null); }}
      />
      <EditGoalSheet
        visible={!!editGoalPayload}
        payload={editGoalPayload}
        onClose={() => setEditGoalPayload(null)}
        onSave={g => { saveGoal(g); setEditGoalPayload(null); }}
        onRemove={id => { removeGoal(id); setEditGoalPayload(null); }}
      />
      <AIHelperIntroSheet
        visible={aiHelperOpen}
        onClose={() => setAiHelperOpen(false)}
        onUploadPhoto={runAIHelperPhoto}
        onPaste={runAIHelperPaste}
        onCsvPdf={runAIHelperCsvPdf}
      />
      <AISuggestionsSheet
        suggestions={aiSuggestions}
        categories={categories}
        onClose={() => setAiSuggestions(null)}
        onApply={applyAISuggestions}
      />

      {/* Scanning overlay */}
      {scanning && (
        <View style={s.scanOverlay}>
          <View style={s.scanCard}>
            <ActivityIndicator size="large" color={BUD}/>
            <Text style={s.scanTxt}>Reading statement...</Text>
            <Text style={s.scanSub}>Zaeli is working out realistic budget amounts.</Text>
          </View>
        </View>
      )}

      <MoreSheet visible={moreOpen} onClose={() => setMoreOpen(false)}/>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// OVERVIEW TAB
// ═══════════════════════════════════════════════════════════════════════════
function OverviewTab(p: {
  income: number; budgeted: number; savings: number; surplus: number;
  fixedBudget: number; variableBudget: number;
  fixedCount: number; varCount: number; goalCount: number;
  onEditIncome: () => void;
  onOpenFixed: () => void;
  onOpenVariable: () => void;
  onOpenGoals: () => void;
  onAIHelper: () => void;
}) {
  const over = p.surplus < 0;
  const overAmt = Math.abs(p.surplus);
  return (
    <ScrollView contentContainerStyle={{ paddingTop: 14, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>

      {/* INCOME HERO */}
      <View style={s.incomeCard}>
        <View style={s.incomeTop}>
          <View style={{ flex: 1 }}>
            <Text style={s.incomeLbl}>Monthly income</Text>
            <Text style={s.incomeHuge}>{fmtAud(p.income)}</Text>
          </View>
          <TouchableOpacity style={s.incomeEdit} activeOpacity={0.7} onPress={p.onEditIncome}>
            <IcoEdit color={BUD_MID}/>
            <Text style={s.incomeEditTxt}>Edit</Text>
          </TouchableOpacity>
        </View>

        <View style={s.incomeDivider}/>

        <View style={s.incomeGrid}>
          <View style={{ flex: 1 }}>
            <Text style={s.incomeSub}>Expenses</Text>
            <Text style={s.incomeBig}>{fmtAud(p.budgeted)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.incomeSub}>Savings</Text>
            <Text style={s.incomeBig}>{fmtAud(p.savings)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.incomeSub, over && { color: PEACH_MID }]}>{over ? 'Over' : 'Surplus'}</Text>
            <Text style={[s.incomeBig, over ? { color: PEACH_MID } : { color: BUD_MID }]}>
              {over ? '−' : ''}{fmtAud(overAmt)}
            </Text>
          </View>
        </View>
      </View>

      {/* ALLOCATION CARD — stacked bar + labels */}
      <AllocationCard
        income={p.income}
        expenses={p.budgeted}
        savings={p.savings}
        surplus={p.surplus}
      />

      {/* YOUR EXPENSES */}
      <Text style={s.secLabel}>Your expenses</Text>

      <PlanRow
        ico="🏠" bg={BUD_CARD}
        title="Fixed"
        sub={`Mortgage, insurance, subscriptions · ${p.fixedCount} ${p.fixedCount === 1 ? 'category' : 'categories'}`}
        val={fmtAud(p.fixedBudget)} valSub="per month"
        onPress={p.onOpenFixed}
      />
      <PlanRow
        ico="🛒" bg={PEACH_BG}
        title="Variable"
        sub={`Groceries, dining, activities · ${p.varCount} ${p.varCount === 1 ? 'category' : 'categories'}`}
        val={fmtAud(p.variableBudget)} valSub="per month"
        onPress={p.onOpenVariable}
      />

      {/* YOUR SAVINGS */}
      <Text style={s.secLabel}>Your savings</Text>

      <PlanRow
        ico="🎯" bg={SKY_BG}
        title="Savings goals"
        sub={`${p.goalCount} ${p.goalCount === 1 ? 'goal' : 'goals'} · ${fmtAud(p.savings)} per month`}
        val={fmtAud(p.savings)} valSub="contrib/mo"
        onPress={p.onOpenGoals}
      />

      {/* AI HELPER */}
      <TouchableOpacity style={s.aiBtn} activeOpacity={0.8} onPress={p.onAIHelper}>
        <View style={s.aiIco}><Text style={{ color: '#fff', fontSize: 22 }}>✦</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={s.aiTitle}>Help me set realistic budgets</Text>
          <Text style={s.aiSub}>Upload a recent statement · Zaeli suggests amounts</Text>
        </View>
        <Text style={{ color: BUD, fontSize: 20 }}>›</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

// Allocation card — Option D: labelled stacked bar + breakdown chips.
// Segment % labels live inside the bar (fastest read), dollar amounts in
// tinted chips below. Peach warm-warning state when over-allocated.
function AllocationCard(p: { income: number; expenses: number; savings: number; surplus: number }) {
  const income = Math.max(1, p.income);
  const over = p.surplus < 0;

  // Actual % of income (what labels display — always "real" proportions)
  const expPctOfIncome = Math.round((p.expenses / income) * 100);
  const savPctOfIncome = Math.round((p.savings / income) * 100);
  const surPctOfIncome = Math.max(0, 100 - expPctOfIncome - savPctOfIncome);

  // Bar widths sum to 100 — if over, expenses+savings fill the bar scaled
  let expBarW: number, savBarW: number, surBarW: number;
  if (over) {
    const total = p.expenses + p.savings;
    expBarW = total > 0 ? (p.expenses / total) * 100 : 100;
    savBarW = total > 0 ? (p.savings / total) * 100 : 0;
    surBarW = 0;
  } else {
    expBarW = expPctOfIncome;
    savBarW = savPctOfIncome;
    surBarW = surPctOfIncome;
  }

  return (
    <View style={s.allocCard}>
      <Text style={s.allocTitle}>Where your {fmtAud(p.income)} goes</Text>

      <View style={s.allocBar}>
        {expBarW > 0 && (
          <View style={[s.allocSeg, { width: `${expBarW}%`, backgroundColor: BUD }]}>
            {expBarW >= 10 && <Text style={[s.allocSegTxt, { color: '#fff' }]}>{expPctOfIncome}%</Text>}
          </View>
        )}
        {savBarW > 0 && (
          <View style={[s.allocSeg, { width: `${savBarW}%`, backgroundColor: SKY_MID }]}>
            {savBarW >= 10 && <Text style={[s.allocSegTxt, { color: SKY_DARK }]}>{savPctOfIncome}%</Text>}
          </View>
        )}
        {surBarW > 0 && (
          <View style={[s.allocSeg, { width: `${surBarW}%`, backgroundColor: BUD_MID }]}>
            {surBarW >= 10 && <Text style={[s.allocSegTxt, { color: BUD }]}>{surPctOfIncome}%</Text>}
          </View>
        )}
      </View>

      <View style={s.allocChips}>
        <View style={[s.allocChip, { backgroundColor: BUD_CARD }]}>
          <Text style={[s.allocChipLbl, { color: BUD }]}>Expenses</Text>
          <Text style={[s.allocChipVal, { color: BUD }]}>{fmtAud(p.expenses)}</Text>
        </View>
        <View style={[s.allocChip, { backgroundColor: SKY_BG }]}>
          <Text style={[s.allocChipLbl, { color: SKY_DARK }]}>Savings</Text>
          <Text style={[s.allocChipVal, { color: SKY_DARK }]}>{fmtAud(p.savings)}</Text>
        </View>
        {over ? (
          <View style={[s.allocChip, { backgroundColor: PEACH_BG, borderWidth: 1, borderColor: PEACH_MID }]}>
            <Text style={[s.allocChipLbl, { color: PEACH_DARK }]}>Over</Text>
            <Text style={[s.allocChipVal, { color: PEACH_DARK }]}>−{fmtAud(Math.abs(p.surplus))}</Text>
          </View>
        ) : (
          <View style={[s.allocChip, { backgroundColor: BUD_CARD }]}>
            <Text style={[s.allocChipLbl, { color: BUD }]}>Surplus</Text>
            <Text style={[s.allocChipVal, { color: BUD }]}>{fmtAud(p.surplus)}</Text>
          </View>
        )}
      </View>

      {over && (
        <Text style={s.allocNote}>
          You're <Text style={{ fontFamily: 'Poppins_700Bold', color: PEACH_DARK }}>{fmtAud(Math.abs(p.surplus))} over</Text> your income — trim expenses or reduce savings to balance.
        </Text>
      )}
    </View>
  );
}

function PlanRow(p: { ico: string; bg: string; title: string; sub: string; val: string; valSub: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={s.planRow} activeOpacity={0.8} onPress={p.onPress}>
      <View style={[s.planIco, { backgroundColor: p.bg }]}><Text style={{ fontSize: 20 }}>{p.ico}</Text></View>
      <View style={{ flex: 1 }}>
        <Text style={s.planTitle}>{p.title}</Text>
        <Text style={s.planSub}>{p.sub}</Text>
      </View>
      <View style={{ alignItems: 'flex-end', marginRight: 4 }}>
        <Text style={s.planVal}>{p.val}</Text>
        <Text style={s.planValSub}>{p.valSub}</Text>
      </View>
      <IcoChevron/>
    </TouchableOpacity>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// CATEGORIES TAB
// ═══════════════════════════════════════════════════════════════════════════
function CategoriesTab(p: {
  categories: Category[];
  lineItems: LineItem[];
  onOpenCategory: (c: Category) => void;
  onAddFixed: () => void;
  onAddVariable: () => void;
}) {
  const fixed = p.categories.filter(c => c.type === 'fixed').sort((a, b) => a.sortOrder - b.sortOrder);
  const variable = p.categories.filter(c => c.type === 'variable').sort((a, b) => a.sortOrder - b.sortOrder);
  return (
    <ScrollView contentContainerStyle={{ paddingTop: 12, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
      <Text style={s.secLabel}>Fixed · {fixed.length} {fixed.length === 1 ? 'category' : 'categories'}</Text>
      {fixed.length === 0 && <Text style={s.empty}>No fixed categories yet.</Text>}
      {fixed.map(c => (
        <CategoryCard key={c.id} cat={c} lineItems={p.lineItems} onPress={() => p.onOpenCategory(c)}/>
      ))}
      <TouchableOpacity style={s.addCard} activeOpacity={0.8} onPress={p.onAddFixed}>
        <IcoPlus color={INK5}/>
        <Text style={s.addCardTxt}>Add fixed category</Text>
      </TouchableOpacity>

      <Text style={[s.secLabel, { marginTop: 14 }]}>Variable · {variable.length} {variable.length === 1 ? 'category' : 'categories'}</Text>
      {variable.length === 0 && <Text style={s.empty}>No variable categories yet.</Text>}
      {variable.map(c => (
        <CategoryCard key={c.id} cat={c} lineItems={p.lineItems} onPress={() => p.onOpenCategory(c)}/>
      ))}
      <TouchableOpacity style={s.addCard} activeOpacity={0.8} onPress={p.onAddVariable}>
        <IcoPlus color={INK5}/>
        <Text style={s.addCardTxt}>Add variable category</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function CategoryCard(p: { cat: Category; lineItems: LineItem[]; onPress: () => void }) {
  const { cat } = p;
  const budget = categoryBudget(cat, p.lineItems);
  const itemCount = cat.type === 'fixed' ? p.lineItems.filter(li => li.categoryId === cat.id).length : 0;
  const sub = cat.type === 'fixed'
    ? `${itemCount} ${itemCount === 1 ? 'item' : 'items'}`
    : 'Monthly target';
  return (
    <TouchableOpacity style={s.catCard} activeOpacity={0.8} onPress={p.onPress}>
      <Text style={{ fontSize: 22 }}>{cat.emoji}</Text>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={s.catName}>{cat.name}</Text>
        <Text style={s.catSub}>{sub}</Text>
      </View>
      <View style={{ alignItems: 'flex-end', marginRight: 4 }}>
        <Text style={s.catVal}>{fmtAud(budget)}</Text>
        <Text style={s.catValSub}>per month</Text>
      </View>
      <IcoChevron/>
    </TouchableOpacity>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// GOALS TAB
// ═══════════════════════════════════════════════════════════════════════════
function GoalsTab(p: { goals: Goal[]; onEditGoal: (g: Goal) => void; onAddGoal: () => void }) {
  return (
    <ScrollView contentContainerStyle={{ paddingTop: 12, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
      {p.goals.map(g => <GoalCard key={g.id} goal={g} onPress={() => p.onEditGoal(g)}/>)}
      <TouchableOpacity style={s.addGoal} activeOpacity={0.8} onPress={p.onAddGoal}>
        <IcoPlus color={INK5}/>
        <View>
          <Text style={s.addGoalTitle}>Add savings goal</Text>
          <Text style={s.addGoalSub}>Holiday · school fees · emergency fund</Text>
        </View>
      </TouchableOpacity>
    </ScrollView>
  );
}

function GoalCard(p: { goal: Goal; onPress: () => void }) {
  const { goal } = p;
  const pctVal = Math.min(100, pct(goal.saved, goal.target));
  return (
    <TouchableOpacity style={s.goalCard} activeOpacity={0.8} onPress={p.onPress}>
      <View style={s.goalHdr}>
        <Text style={s.goalName}>{goal.emoji}  {goal.name}</Text>
        <Text style={s.goalPct}>{pctVal}%</Text>
      </View>
      <View style={s.goalBar}>
        <View style={[s.goalFill, { width: `${pctVal}%` }]}/>
      </View>
      <View style={s.goalStats}>
        <View style={s.goalStat}><Text style={s.goalStatN}>{fmtAud(goal.saved)}</Text><Text style={s.goalStatL}>Saved</Text></View>
        <View style={s.goalStat}><Text style={s.goalStatN}>{fmtAud(goal.target)}</Text><Text style={s.goalStatL}>Target</Text></View>
        <View style={s.goalStat}><Text style={s.goalStatN}>{fmtAud(goal.monthlyContribution)}/mo</Text><Text style={s.goalStatL}>Contribution</Text></View>
      </View>
      <Text style={s.goalTarget}>Target: {goal.targetDate}</Text>
    </TouchableOpacity>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// GENERIC SHEET SHELL
// ═══════════════════════════════════════════════════════════════════════════
function SheetShell(p: { visible: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!p.visible) return null;
  // KAV inside the card so keyboard padding shrinks the body, not the whole card.
  return (
    <Modal visible transparent animationType="slide" onRequestClose={p.onClose}>
      <View style={s.sheetBackdrop}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={p.onClose}/>
        <View style={s.sheetCard}>
          <View style={s.sheetHandle}/>
          <View style={s.sheetHdr}>
            <Text style={s.sheetTitle}>{p.title}</Text>
            <TouchableOpacity onPress={p.onClose} activeOpacity={0.7} style={s.sheetX}>
              <Text style={s.sheetXTxt}>Close</Text>
            </TouchableOpacity>
          </View>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1 }}
            keyboardVerticalOffset={0}
          >
            {p.children}
          </KeyboardAvoidingView>
        </View>
      </View>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// CATEGORY DETAIL SHEET — fixed (line items) vs variable (single target)
// ═══════════════════════════════════════════════════════════════════════════
function CategoryDetailSheet(p: {
  category: Category | null;
  lineItems: LineItem[];
  onClose: () => void;
  onSaveLineItem: (li: LineItem) => void;
  onRemoveLineItem: (id: string) => void;
  onEditCategory: () => void;
  onSaveCategory: (c: Category) => void;
  onAIHelper: () => void;
}) {
  if (!p.category) return null;
  const c = p.category;
  const isFixed = c.type === 'fixed';
  return (
    <SheetShell visible onClose={p.onClose} title={`${c.emoji}  ${c.name}`}>
      <ScrollView style={s.sheetBody} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {isFixed
          ? <FixedCategoryBody category={c} lineItems={p.lineItems} onSaveLineItem={p.onSaveLineItem} onRemoveLineItem={p.onRemoveLineItem} onEditCategory={p.onEditCategory}/>
          : <VariableCategoryBody category={c} onSaveCategory={p.onSaveCategory} onAIHelper={p.onAIHelper} onEditCategory={p.onEditCategory}/>
        }
      </ScrollView>
    </SheetShell>
  );
}

function FixedCategoryBody(p: {
  category: Category;
  lineItems: LineItem[];
  onSaveLineItem: (li: LineItem) => void;
  onRemoveLineItem: (id: string) => void;
  onEditCategory: () => void;
}) {
  const items = p.lineItems.filter(li => li.categoryId === p.category.id);
  const total = items.reduce((a, li) => a + li.monthlyAmount, 0);
  const [editingLI, setEditingLI] = useState<LineItem | null>(null);
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newAmt, setNewAmt] = useState('');

  function commitAdd() {
    const amt = parseFloat(newAmt.replace(/[^0-9.]/g, '')) || 0;
    if (!newLabel.trim() || amt <= 0) { Alert.alert('Missing fields', 'Add a label and amount.'); return; }
    p.onSaveLineItem({ id: `li-${Date.now()}`, categoryId: p.category.id, label: newLabel.trim(), monthlyAmount: amt });
    setNewLabel(''); setNewAmt(''); setAdding(false);
  }

  return (
    <>
      <View style={s.totalCard}>
        <Text style={s.totalLbl}>Monthly budget · auto-calculated</Text>
        <Text style={s.totalVal}>{fmtAud(total)}</Text>
        <Text style={s.totalSub}>Sum of {items.length} line {items.length === 1 ? 'item' : 'items'} · edit any to update</Text>
      </View>

      <Text style={s.sheetSecLbl}>Line items</Text>

      {items.map(li => (
        editingLI?.id === li.id
          ? <LineItemForm key={li.id} initial={li} onCancel={() => setEditingLI(null)} onSave={u => { p.onSaveLineItem(u); setEditingLI(null); }} onRemove={() => { p.onRemoveLineItem(li.id); setEditingLI(null); }}/>
          : (
            <TouchableOpacity key={li.id} style={s.liRow} activeOpacity={0.75} onPress={() => setEditingLI(li)}>
              <View style={{ flex: 1 }}>
                <Text style={s.liName}>{li.label}</Text>
              </View>
              <Text style={s.liAmt}>{fmtAud(li.monthlyAmount)}</Text>
              <Text style={s.liChev}>›</Text>
            </TouchableOpacity>
          )
      ))}

      {adding ? (
        <View style={s.inlineAdd}>
          <TextInput style={[s.input, { marginTop: 0, marginBottom: 8 }]} value={newLabel} onChangeText={setNewLabel} placeholder="e.g. Netflix" placeholderTextColor={INK4}/>
          <TextInput style={s.input} value={newAmt} onChangeText={setNewAmt} placeholder="Monthly $" placeholderTextColor={INK4} keyboardType="decimal-pad"/>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
            <TouchableOpacity style={[s.btnGhost, { flex: 1 }]} onPress={() => { setAdding(false); setNewLabel(''); setNewAmt(''); }} activeOpacity={0.85}>
              <Text style={s.btnGhostTxt}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.btnPrimary, { flex: 1 }]} onPress={commitAdd} activeOpacity={0.85}>
              <Text style={s.btnPrimaryTxt}>Add</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity style={s.addCardInline} activeOpacity={0.8} onPress={() => setAdding(true)}>
          <IcoPlus color={INK5}/>
          <Text style={s.addCardTxt}>Add line item</Text>
        </TouchableOpacity>
      )}

      <Text style={s.tipTxt}>
        <Text style={{ fontFamily: 'Poppins_700Bold', color: INK }}>Fixed category: </Text>
        line items represent actual commitments. Budget is their sum, so it updates automatically when life changes.
      </Text>

      <TouchableOpacity style={[s.btnGhost, { marginTop: 12 }]} onPress={p.onEditCategory} activeOpacity={0.85}>
        <Text style={s.btnGhostTxt}>Edit category name / emoji</Text>
      </TouchableOpacity>
    </>
  );
}

function LineItemForm(p: { initial: LineItem; onCancel: () => void; onSave: (li: LineItem) => void; onRemove: () => void }) {
  const [label, setLabel] = useState(p.initial.label);
  const [amt, setAmt]     = useState(String(p.initial.monthlyAmount));
  return (
    <View style={s.inlineAdd}>
      <TextInput style={[s.input, { marginTop: 0, marginBottom: 8 }]} value={label} onChangeText={setLabel} placeholder="Label" placeholderTextColor={INK4}/>
      <TextInput style={s.input} value={amt} onChangeText={setAmt} placeholder="Monthly $" placeholderTextColor={INK4} keyboardType="decimal-pad"/>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
        <TouchableOpacity style={[s.btnGhost, { flex: 1 }]} onPress={p.onCancel} activeOpacity={0.85}>
          <Text style={s.btnGhostTxt}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.btnPrimary, { flex: 1 }]} onPress={() => {
          const n = parseFloat(amt.replace(/[^0-9.]/g, '')) || 0;
          if (!label.trim() || n <= 0) { Alert.alert('Missing fields', 'Add a label and amount.'); return; }
          p.onSave({ ...p.initial, label: label.trim(), monthlyAmount: n });
        }} activeOpacity={0.85}>
          <Text style={s.btnPrimaryTxt}>Save</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity onPress={() => Alert.alert('Remove line item', 'Are you sure?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: p.onRemove },
      ])} activeOpacity={0.7} style={{ marginTop: 12, alignItems: 'center' }}>
        <Text style={{ fontFamily: 'Poppins_600SemiBold', color: DANGER, fontSize: 14 }}>Remove line item</Text>
      </TouchableOpacity>
    </View>
  );
}

function VariableCategoryBody(p: {
  category: Category;
  onSaveCategory: (c: Category) => void;
  onAIHelper: () => void;
  onEditCategory: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [amt, setAmt] = useState(String(p.category.monthlyTarget ?? ''));
  const current = p.category.monthlyTarget ?? 0;
  return (
    <>
      <View style={s.varTargetCard}>
        <Text style={s.totalLbl}>Monthly target</Text>
        {editing ? (
          <TextInput
            style={s.varTargetInput}
            value={amt}
            onChangeText={setAmt}
            placeholder="0"
            placeholderTextColor={INK4}
            keyboardType="decimal-pad"
            autoFocus
          />
        ) : (
          <TouchableOpacity onPress={() => setEditing(true)} activeOpacity={0.75}>
            <Text style={s.varTargetVal}>{fmtAud(current)}</Text>
          </TouchableOpacity>
        )}
        <Text style={s.varTargetHint}>Tap to {editing ? 'edit amount' : 'change'}</Text>
        {editing && (
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
            <TouchableOpacity style={[s.btnGhost, { flex: 1 }]} onPress={() => { setAmt(String(current)); setEditing(false); }} activeOpacity={0.85}>
              <Text style={s.btnGhostTxt}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.btnPrimary, { flex: 1 }]} onPress={() => {
              const n = parseFloat(amt.replace(/[^0-9.]/g, '')) || 0;
              p.onSaveCategory({ ...p.category, monthlyTarget: n });
              setEditing(false);
            }} activeOpacity={0.85}>
              <Text style={s.btnPrimaryTxt}>Save target</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <TouchableOpacity style={s.aiBtnInline} activeOpacity={0.8} onPress={p.onAIHelper}>
        <View style={s.aiIco}><Text style={{ color: '#fff', fontSize: 22 }}>✦</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={s.aiTitle}>Suggest amount from statement</Text>
          <Text style={s.aiSub}>One-off upload · Zaeli reads and suggests · not saved</Text>
        </View>
        <Text style={{ color: BUD, fontSize: 20 }}>›</Text>
      </TouchableOpacity>

      <Text style={s.tipTxt}>
        <Text style={{ fontFamily: 'Poppins_700Bold', color: INK }}>Variable category: </Text>
        you set a target. Without a live bank feed, we don't pretend to track "spent this month" — that number can't be honest without full data.
      </Text>

      <TouchableOpacity style={[s.btnGhost, { marginTop: 12 }]} onPress={p.onEditCategory} activeOpacity={0.85}>
        <Text style={s.btnGhostTxt}>Edit category name / emoji</Text>
      </TouchableOpacity>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// INCOME EDITOR SHEET
// ═══════════════════════════════════════════════════════════════════════════
function IncomeEditorSheet(p: {
  visible: boolean;
  streams: IncomeStream[];
  onClose: () => void;
  onSaveStream: (s: IncomeStream) => void;
  onRemoveStream: (id: string) => void;
}) {
  const [editing, setEditing] = useState<IncomeStream | null>(null);
  const total = p.streams.reduce((a, s) => a + s.monthlyAmount, 0);

  function startAdd() {
    setEditing({ id: `s-${Date.now()}`, label: '', type: 'Salary', monthlyAmount: 0 });
  }

  return (
    <SheetShell visible={p.visible} onClose={p.onClose} title="Income & settings">
      <ScrollView style={s.sheetBody} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {!editing && (
          <>
            <View style={s.incomeTotal}>
              <Text style={s.incomeTotalLbl}>Combined monthly income</Text>
              <Text style={s.incomeTotalVal}>{fmtAud(total)}</Text>
              <Text style={s.incomeTotalSub}>After tax · all streams</Text>
            </View>

            <Text style={s.sheetSecLbl}>Income streams</Text>
            {p.streams.map(str => (
              <TouchableOpacity key={str.id} style={s.streamCard} activeOpacity={0.75} onPress={() => setEditing(str)}>
                <View style={s.streamHdr}>
                  <Text style={s.streamName}>{str.label}</Text>
                  <Text style={s.streamType}>{str.type}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <Text style={s.streamVal}>{fmtAud(str.monthlyAmount)}</Text>
                  <Text style={s.streamEdit}>Edit</Text>
                </View>
              </TouchableOpacity>
            ))}

            <TouchableOpacity style={s.addCardInline} activeOpacity={0.8} onPress={startAdd}>
              <IcoPlus color={INK5}/>
              <Text style={s.addCardTxt}>Add income stream</Text>
            </TouchableOpacity>
          </>
        )}

        {editing && (
          <IncomeStreamForm
            stream={editing}
            onCancel={() => setEditing(null)}
            onSave={u => { p.onSaveStream(u); setEditing(null); }}
            onRemove={p.streams.some(s => s.id === editing.id) ? () => { p.onRemoveStream(editing.id); setEditing(null); } : undefined}
          />
        )}
      </ScrollView>
    </SheetShell>
  );
}

function IncomeStreamForm(p: {
  stream: IncomeStream;
  onCancel: () => void;
  onSave: (s: IncomeStream) => void;
  onRemove?: () => void;
}) {
  const [label, setLabel]   = useState(p.stream.label);
  const [type, setType]     = useState(p.stream.type);
  const [amount, setAmount] = useState(String(p.stream.monthlyAmount || ''));

  return (
    <View>
      <Text style={s.fieldLbl}>Name</Text>
      <TextInput style={s.input} value={label} onChangeText={setLabel} placeholder="e.g. Anna" placeholderTextColor={INK4}/>
      <Text style={s.fieldLbl}>Type</Text>
      <TextInput style={s.input} value={type} onChangeText={setType} placeholder="Salary · Freelance · Rental" placeholderTextColor={INK4}/>
      <Text style={s.fieldLbl}>Monthly amount (AUD)</Text>
      <TextInput style={s.input} value={amount} onChangeText={setAmount} placeholder="0" placeholderTextColor={INK4} keyboardType="decimal-pad"/>

      <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
        <TouchableOpacity style={[s.btnGhost, { flex: 1 }]} activeOpacity={0.85} onPress={p.onCancel}>
          <Text style={s.btnGhostTxt}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.btnPrimary, { flex: 1 }]} activeOpacity={0.85} onPress={() => {
          const n = parseFloat(amount.replace(/[^0-9.]/g, '')) || 0;
          p.onSave({ ...p.stream, label: label.trim() || 'Income', type: type.trim() || 'Salary', monthlyAmount: n });
        }}>
          <Text style={s.btnPrimaryTxt}>Save</Text>
        </TouchableOpacity>
      </View>
      {p.onRemove && (
        <TouchableOpacity onPress={p.onRemove} activeOpacity={0.7} style={{ marginTop: 14, alignItems: 'center' }}>
          <Text style={{ fontFamily: 'Poppins_600SemiBold', color: DANGER, fontSize: 14 }}>Remove this income stream</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// EDIT / ADD CATEGORY SHEET — v2: no spent field, no limit field for variable
// ═══════════════════════════════════════════════════════════════════════════
function EditCategorySheet(p: {
  visible: boolean;
  payload: Category | 'new-fixed' | 'new-variable' | null;
  onClose: () => void;
  onSave: (c: Category) => void;
  onRemove: (id: string) => void;
}) {
  const isNew = p.payload === 'new-fixed' || p.payload === 'new-variable';
  const existing = isNew ? null : (p.payload as Category | null);
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🛒');
  const [type, setType] = useState<'fixed' | 'variable'>('variable');
  const [target, setTarget] = useState('');

  React.useEffect(() => {
    if (!p.visible) return;
    if (existing) {
      setName(existing.name); setEmoji(existing.emoji); setType(existing.type);
      setTarget(String(existing.monthlyTarget ?? ''));
    } else {
      setName(''); setEmoji('🛒'); setType(p.payload === 'new-fixed' ? 'fixed' : 'variable'); setTarget('');
    }
  }, [p.visible, p.payload]);

  function save() {
    if (!name.trim()) { Alert.alert('Missing name', 'Give this category a name.'); return; }
    const n = parseFloat(target.replace(/[^0-9.]/g, '')) || 0;
    p.onSave({
      id: existing?.id ?? `c-${Date.now()}`,
      name: name.trim(),
      emoji,
      type,
      monthlyTarget: type === 'variable' ? n : undefined,
      sortOrder: existing?.sortOrder ?? Date.now(),
    });
  }

  if (!p.visible) return null;
  return (
    <SheetShell visible onClose={p.onClose} title={existing ? 'Edit category' : 'New category'}>
      <ScrollView style={s.sheetBody} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

        <Text style={s.fieldLbl}>Name</Text>
        <TextInput style={s.input} value={name} onChangeText={setName} placeholder="e.g. Groceries" placeholderTextColor={INK4}/>

        <Text style={s.fieldLbl}>Emoji</Text>
        <View style={s.emojiGrid}>
          {EMOJI_OPTIONS.map(e => (
            <TouchableOpacity key={e} style={[s.emojiOpt, emoji === e && s.emojiOptOn]} onPress={() => setEmoji(e)} activeOpacity={0.75}>
              <Text style={{ fontSize: 22 }}>{e}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.fieldLbl}>Type</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity style={[s.tog, type === 'fixed' && s.togOn]} onPress={() => setType('fixed')} activeOpacity={0.75}>
            <Text style={[s.togTxt, type === 'fixed' && s.togTxtOn]}>Fixed</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.tog, type === 'variable' && s.togOn]} onPress={() => setType('variable')} activeOpacity={0.75}>
            <Text style={[s.togTxt, type === 'variable' && s.togTxtOn]}>Variable</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.tipTxt}>
          {type === 'fixed'
            ? 'Fixed categories hold line items (e.g. Netflix, Spotify). Budget = sum of items.'
            : 'Variable categories use a single monthly target you set.'}
        </Text>

        {type === 'variable' && (
          <>
            <Text style={s.fieldLbl}>Monthly target (AUD)</Text>
            <TextInput style={s.input} value={target} onChangeText={setTarget} placeholder="0" placeholderTextColor={INK4} keyboardType="decimal-pad"/>
          </>
        )}

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
          <TouchableOpacity style={[s.btnGhost, { flex: 1 }]} activeOpacity={0.85} onPress={p.onClose}>
            <Text style={s.btnGhostTxt}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.btnPrimary, { flex: 1 }]} activeOpacity={0.85} onPress={save}>
            <Text style={s.btnPrimaryTxt}>Save category</Text>
          </TouchableOpacity>
        </View>

        {existing && (
          <TouchableOpacity onPress={() => Alert.alert('Delete category', `Remove ${existing.name}? This also removes its line items.`, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => p.onRemove(existing.id) },
          ])} activeOpacity={0.7} style={{ marginTop: 14, alignItems: 'center' }}>
            <Text style={{ fontFamily: 'Poppins_600SemiBold', color: DANGER, fontSize: 14 }}>Delete category</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SheetShell>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// EDIT / ADD GOAL SHEET
// ═══════════════════════════════════════════════════════════════════════════
function EditGoalSheet(p: {
  visible: boolean;
  payload: Goal | 'new' | null;
  onClose: () => void;
  onSave: (g: Goal) => void;
  onRemove: (id: string) => void;
}) {
  const isNew = p.payload === 'new';
  const existing = isNew ? null : (p.payload as Goal | null);
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('✈️');
  const [target, setTarget] = useState('');
  const [saved, setSaved] = useState('');
  const [contribution, setContribution] = useState('');
  const [flexible, setFlexible] = useState(false);
  const [dateValue, setDateValue] = useState<Date>(new Date(new Date().getFullYear() + 1, 0, 1));
  const [showDatePicker, setShowDatePicker] = useState(false);

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  function fmtMonthYr(d: Date) { return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`; }

  React.useEffect(() => {
    if (!p.visible) return;
    if (existing) {
      setName(existing.name); setEmoji(existing.emoji);
      setTarget(String(existing.target)); setSaved(String(existing.saved));
      setContribution(String(existing.monthlyContribution));
      if (!existing.targetDate || existing.targetDate === 'Flexible') {
        setFlexible(true);
      } else {
        // Try: "Mon 'YY", "Mon YYYY", YYYY-MM-DD
        const shortM = existing.targetDate.match(/^([A-Z][a-z]{2})\s'?(\d{2,4})$/);
        const isoM = existing.targetDate.match(/^(\d{4})-(\d{2})(?:-\d{2})?$/);
        if (shortM) {
          const mon = MONTHS.indexOf(shortM[1]);
          const yr = shortM[2].length === 2 ? 2000 + parseInt(shortM[2]) : parseInt(shortM[2]);
          setDateValue(new Date(yr, mon, 1));
          setFlexible(false);
        } else if (isoM) {
          setDateValue(new Date(parseInt(isoM[1]), parseInt(isoM[2]) - 1, 1));
          setFlexible(false);
        } else {
          setFlexible(true);
        }
      }
    } else {
      setName(''); setEmoji('✈️'); setTarget(''); setSaved(''); setContribution('');
      setFlexible(false);
      setDateValue(new Date(new Date().getFullYear() + 1, 0, 1));
    }
    setShowDatePicker(false);
  }, [p.visible, p.payload]);

  function save() {
    const t = parseFloat(target.replace(/[^0-9.]/g, '')) || 0;
    const sv = parseFloat(saved.replace(/[^0-9.]/g, '')) || 0;
    const c = parseFloat(contribution.replace(/[^0-9.]/g, '')) || 0;
    if (!name.trim()) { Alert.alert('Missing name', 'Give this goal a name.'); return; }
    if (t <= 0) { Alert.alert('Missing target', 'Set a target amount to save towards.'); return; }
    p.onSave({
      id: existing?.id ?? `g-${Date.now()}`,
      name: name.trim(),
      emoji,
      target: t,
      saved: sv,
      monthlyContribution: c,
      targetDate: flexible ? 'Flexible' : fmtMonthYr(dateValue),
    });
  }

  if (!p.visible) return null;
  return (
    <SheetShell visible onClose={p.onClose} title={existing ? 'Edit goal' : 'New savings goal'}>
      <ScrollView style={s.sheetBody} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

        <Text style={s.fieldLbl}>Name</Text>
        <TextInput style={s.input} value={name} onChangeText={setName} placeholder="e.g. Noosa holiday" placeholderTextColor={INK4}/>

        <Text style={s.fieldLbl}>Emoji</Text>
        <View style={s.emojiGrid}>
          {GOAL_EMOJI_OPTIONS.map(e => (
            <TouchableOpacity key={e} style={[s.emojiOpt, emoji === e && s.emojiOptOn]} onPress={() => setEmoji(e)} activeOpacity={0.75}>
              <Text style={{ fontSize: 22 }}>{e}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.fieldLbl}>Target amount (AUD)</Text>
        <TextInput style={s.input} value={target} onChangeText={setTarget} placeholder="0" placeholderTextColor={INK4} keyboardType="decimal-pad"/>

        <Text style={s.fieldLbl}>Already saved (AUD)</Text>
        <TextInput style={s.input} value={saved} onChangeText={setSaved} placeholder="0" placeholderTextColor={INK4} keyboardType="decimal-pad"/>

        <Text style={s.fieldLbl}>Monthly contribution (AUD)</Text>
        <TextInput style={s.input} value={contribution} onChangeText={setContribution} placeholder="0" placeholderTextColor={INK4} keyboardType="decimal-pad"/>

        <Text style={s.fieldLbl}>Target date</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
          <TouchableOpacity style={[s.tog, !flexible && s.togOn]} onPress={() => setFlexible(false)} activeOpacity={0.75}>
            <Text style={[s.togTxt, !flexible && s.togTxtOn]}>Pick a month</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.tog, flexible && s.togOn]} onPress={() => setFlexible(true)} activeOpacity={0.75}>
            <Text style={[s.togTxt, flexible && s.togTxtOn]}>Flexible · no date</Text>
          </TouchableOpacity>
        </View>
        {!flexible && (
          <>
            <TouchableOpacity style={s.input} onPress={() => setShowDatePicker(true)} activeOpacity={0.75}>
              <Text style={{ fontFamily: 'Poppins_500Medium', fontSize: 15, color: INK }}>{fmtMonthYr(dateValue)}</Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={dateValue}
                mode="date"
                display="spinner"
                onChange={(_: any, d?: Date) => {
                  setShowDatePicker(Platform.OS === 'ios');
                  if (d) setDateValue(d);
                }}
              />
            )}
          </>
        )}

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
          <TouchableOpacity style={[s.btnGhost, { flex: 1 }]} activeOpacity={0.85} onPress={p.onClose}>
            <Text style={s.btnGhostTxt}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.btnPrimary, { flex: 1 }]} activeOpacity={0.85} onPress={save}>
            <Text style={s.btnPrimaryTxt}>Save goal</Text>
          </TouchableOpacity>
        </View>

        {existing && (
          <TouchableOpacity onPress={() => Alert.alert('Delete goal', `Remove ${existing.name}?`, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => p.onRemove(existing.id) },
          ])} activeOpacity={0.7} style={{ marginTop: 14, alignItems: 'center' }}>
            <Text style={{ fontFamily: 'Poppins_600SemiBold', color: DANGER, fontSize: 14 }}>Delete goal</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SheetShell>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// AI HELPER — INTRO SHEET (pick upload method)
// ═══════════════════════════════════════════════════════════════════════════
function AIHelperIntroSheet(p: { visible: boolean; onClose: () => void; onUploadPhoto: () => void; onPaste: () => void; onCsvPdf: () => void }) {
  if (!p.visible) return null;
  return (
    <SheetShell visible onClose={p.onClose} title="Help me set realistic budgets">
      <ScrollView style={s.sheetBody} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <Text style={s.uploadIntro}>
          Zaeli reads a recent statement and works out averages — so your budget reflects what you actually spend, not a guess. Nothing is stored.
        </Text>

        <TouchableOpacity style={[s.uploadMethod, s.uploadMethodOn]} activeOpacity={0.85} onPress={p.onUploadPhoto}>
          <Text style={{ fontSize: 26 }}>📸</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.uploadMethodTitle}>Photo or screenshot</Text>
            <Text style={s.uploadMethodSub}>Pick statement screenshots from your camera roll · up to 6.</Text>
          </View>
          <View style={s.uploadMethodBadge}><Text style={s.uploadMethodBadgeTxt}>Try it</Text></View>
        </TouchableOpacity>

        <TouchableOpacity style={[s.uploadMethod, s.uploadMethodOn]} activeOpacity={0.85} onPress={p.onPaste}>
          <Text style={{ fontSize: 26 }}>📋</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.uploadMethodTitle}>Paste statement</Text>
            <Text style={s.uploadMethodSub}>Copy text from your bank app, then tap here. Works with any bank.</Text>
          </View>
          <View style={s.uploadMethodBadge}><Text style={s.uploadMethodBadgeTxt}>Try it</Text></View>
        </TouchableOpacity>

        <TouchableOpacity style={s.uploadMethod} activeOpacity={0.85} onPress={p.onCsvPdf}>
          <Text style={{ fontSize: 26 }}>📄</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.uploadMethodTitle}>CSV or PDF</Text>
            <Text style={s.uploadMethodSub}>From Files app or bank website. Needs a dev client update first.</Text>
          </View>
        </TouchableOpacity>

        <Text style={s.uploadNote}>Your data is private — raw statement content is never stored. Only the amounts you accept are saved to your plan.</Text>
      </ScrollView>
    </SheetShell>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// AI SUGGESTIONS SHEET — Accept/Edit/Skip per suggestion
// ═══════════════════════════════════════════════════════════════════════════
interface AISuggestions {
  variable_suggestions: Array<{ category_name: string; avg_monthly_amount: number; months_analysed: number; reason: string }>;
  new_variable_categories: Array<{ name: string; emoji: string; avg_monthly_amount: number; months_analysed: number; reason: string }>;
  subscription_detections: Array<{ merchant: string; monthly_amount: number; months_detected: number }>;
}

interface AIAccepted {
  variableUpdates: Array<{ categoryId: string; amount: number }>;
  newVariableCategories: Array<{ name: string; emoji: string; amount: number }>;
  newSubscriptions: Array<{ merchant: string; amount: number }>;
}

function AISuggestionsSheet(p: {
  suggestions: AISuggestions | null;
  categories: Category[];
  onClose: () => void;
  onApply: (accepted: AIAccepted) => void;
}) {
  const [varDecisions, setVarDecisions]       = useState<Record<number, { action: 'accept' | 'skip'; amount: number }>>({});
  const [newCatDecisions, setNewCatDecisions] = useState<Record<number, 'accept' | 'skip'>>({});
  const [subDecisions, setSubDecisions]       = useState<Record<number, 'accept' | 'skip'>>({});

  React.useEffect(() => {
    if (p.suggestions) {
      const v: Record<number, { action: 'accept' | 'skip'; amount: number }> = {};
      p.suggestions.variable_suggestions.forEach((sg, i) => { v[i] = { action: 'accept', amount: sg.avg_monthly_amount }; });
      setVarDecisions(v);
      setNewCatDecisions({});
      setSubDecisions({});
    }
  }, [p.suggestions]);

  if (!p.suggestions) return null;
  const { variable_suggestions, new_variable_categories, subscription_detections } = p.suggestions;

  const acceptedCount =
    Object.values(varDecisions).filter(d => d.action === 'accept').length +
    Object.values(newCatDecisions).filter(d => d === 'accept').length +
    Object.values(subDecisions).filter(d => d === 'accept').length;

  function apply() {
    const variableUpdates: AIAccepted['variableUpdates'] = [];
    variable_suggestions.forEach((sg, i) => {
      if (varDecisions[i]?.action === 'accept') {
        const match = p.categories.find(c => c.type === 'variable' && c.name.toLowerCase() === sg.category_name.toLowerCase());
        if (match) variableUpdates.push({ categoryId: match.id, amount: varDecisions[i].amount });
      }
    });
    const newVariableCategories = new_variable_categories
      .map((nc, i) => ({ i, nc }))
      .filter(({ i }) => newCatDecisions[i] === 'accept')
      .map(({ nc }) => ({ name: nc.name, emoji: nc.emoji, amount: nc.avg_monthly_amount }));
    const newSubscriptions = subscription_detections
      .map((sub, i) => ({ i, sub }))
      .filter(({ i }) => subDecisions[i] === 'accept')
      .map(({ sub }) => ({ merchant: sub.merchant, amount: sub.monthly_amount }));

    p.onApply({ variableUpdates, newVariableCategories, newSubscriptions });
  }

  return (
    <SheetShell visible onClose={p.onClose} title="✦  Suggested budgets">
      <ScrollView style={s.sheetBody} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

        <View style={s.aiBanner}>
          <View style={s.aiBannerIco}><Text style={{ color: '#fff', fontSize: 20 }}>✦</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={s.aiBannerT}>Based on your statement</Text>
            <Text style={s.aiBannerS}>Averages and recurring detections · not saved. Review each and accept what feels right.</Text>
          </View>
        </View>

        {variable_suggestions.length > 0 && (
          <>
            <Text style={s.sheetSecLbl}>Variable categories</Text>
            {variable_suggestions.map((sg, i) => {
              const existing = p.categories.find(c => c.type === 'variable' && c.name.toLowerCase() === sg.category_name.toLowerCase());
              const oldAmt = existing?.monthlyTarget ?? 0;
              const action = varDecisions[i]?.action ?? 'accept';
              const amt    = varDecisions[i]?.amount ?? sg.avg_monthly_amount;
              return (
                <View key={i} style={s.suggCard}>
                  <View style={s.suggHdr}>
                    <Text style={s.suggName}>{existing?.emoji ?? '📊'}  {sg.category_name}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                      {oldAmt > 0 && <Text style={s.suggOld}>{fmtAud(oldAmt)}</Text>}
                      <Text style={s.suggNew}>{fmtAud(amt)}</Text>
                    </View>
                  </View>
                  <Text style={s.suggWhy}>{sg.reason}</Text>
                  <View style={s.suggActions}>
                    <TouchableOpacity style={[s.suggBtn, action === 'accept' ? s.suggBtnAcceptOn : s.suggBtnAccept]} onPress={() => setVarDecisions(d => ({ ...d, [i]: { action: 'accept', amount: sg.avg_monthly_amount } }))} activeOpacity={0.8}>
                      <Text style={[s.suggBtnTxt, { color: action === 'accept' ? '#fff' : BUD }]}>Accept {fmtAud(sg.avg_monthly_amount)}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.suggBtn, s.suggBtnSkip]} onPress={() => setVarDecisions(d => ({ ...d, [i]: { action: 'skip', amount: oldAmt } }))} activeOpacity={0.8}>
                      <Text style={[s.suggBtnTxt, { color: action === 'skip' ? INK : INK4 }]}>Keep {fmtAud(oldAmt)}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </>
        )}

        {new_variable_categories.length > 0 && (
          <>
            <Text style={[s.sheetSecLbl, { marginTop: 14 }]}>New variable categories</Text>
            {new_variable_categories.map((nc, i) => {
              const action = newCatDecisions[i] ?? 'skip';
              return (
                <View key={i} style={s.suggCard}>
                  <View style={s.suggHdr}>
                    <Text style={s.suggName}>{nc.emoji}  {nc.name}</Text>
                    <Text style={s.suggNew}>{fmtAud(nc.avg_monthly_amount)}/mo</Text>
                  </View>
                  <Text style={s.suggWhy}>{nc.reason}</Text>
                  <View style={s.suggActions}>
                    <TouchableOpacity style={[s.suggBtn, action === 'accept' ? s.suggBtnAcceptOn : s.suggBtnAccept]} onPress={() => setNewCatDecisions(d => ({ ...d, [i]: 'accept' }))} activeOpacity={0.8}>
                      <Text style={[s.suggBtnTxt, { color: action === 'accept' ? '#fff' : BUD }]}>Add & budget</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.suggBtn, action === 'skip' ? s.suggBtnSkipOn : s.suggBtnSkip]} onPress={() => setNewCatDecisions(d => ({ ...d, [i]: 'skip' }))} activeOpacity={0.8}>
                      <Text style={[s.suggBtnTxt, { color: action === 'skip' ? INK : INK4 }]}>Skip</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </>
        )}

        {subscription_detections.length > 0 && (
          <>
            <Text style={[s.sheetSecLbl, { marginTop: 14 }]}>Recurring subscriptions detected</Text>
            {subscription_detections.map((sub, i) => {
              const action = subDecisions[i] ?? 'skip';
              return (
                <View key={i} style={s.suggCard}>
                  <View style={s.suggHdr}>
                    <Text style={s.suggName}>📺  {sub.merchant}</Text>
                    <Text style={s.suggNew}>{fmtAud(sub.monthly_amount)}/mo</Text>
                  </View>
                  <Text style={s.suggWhy}>Seen {sub.months_detected} {sub.months_detected === 1 ? 'month' : 'months'} in a row · consistent debit.</Text>
                  <View style={s.suggActions}>
                    <TouchableOpacity style={[s.suggBtn, action === 'accept' ? s.suggBtnAcceptOn : s.suggBtnAccept]} onPress={() => setSubDecisions(d => ({ ...d, [i]: 'accept' }))} activeOpacity={0.8}>
                      <Text style={[s.suggBtnTxt, { color: action === 'accept' ? '#fff' : BUD }]}>Add to Subscriptions</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.suggBtn, action === 'skip' ? s.suggBtnSkipOn : s.suggBtnSkip]} onPress={() => setSubDecisions(d => ({ ...d, [i]: 'skip' }))} activeOpacity={0.8}>
                      <Text style={[s.suggBtnTxt, { color: action === 'skip' ? INK : INK4 }]}>Skip</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </>
        )}

        {(variable_suggestions.length + new_variable_categories.length + subscription_detections.length === 0) && (
          <Text style={s.empty}>Zaeli couldn't find any recurring patterns. Try another statement with more months of activity.</Text>
        )}

        <TouchableOpacity style={[s.btnPrimary, { marginTop: 18 }]} activeOpacity={0.85} onPress={apply} disabled={acceptedCount === 0}>
          <Text style={s.btnPrimaryTxt}>{acceptedCount === 0 ? 'Nothing accepted' : `Apply ${acceptedCount} ${acceptedCount === 1 ? 'change' : 'changes'}`}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SheetShell>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════════════════════════════════
const s = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: BORDER },
  back: { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(10,10,10,0.06)', alignItems: 'center', justifyContent: 'center' },
  wordmark: { fontFamily: 'Poppins_800ExtraBold', fontSize: 40, letterSpacing: -1.5, lineHeight: 46, color: INK },
  pageLabel: { fontFamily: 'Poppins_700Bold', fontSize: 17, color: INK2 },
  hamburger: { width: 42, height: 42, borderRadius: 12, backgroundColor: 'rgba(10,10,10,0.06)', alignItems: 'center', justifyContent: 'center' },

  tabRow: { flexDirection: 'row', backgroundColor: 'rgba(10,10,10,0.05)', borderRadius: 14, marginHorizontal: 14, marginTop: 14, padding: 4 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 11 },
  tabOn: { backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
  tabTxt: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: INK4 },
  tabTxtOn: { color: BUD_DARK, fontFamily: 'Poppins_700Bold' },

  secLabel: { fontFamily: 'Poppins_700Bold', fontSize: 12, letterSpacing: 1.2, color: INK4, textTransform: 'uppercase', paddingHorizontal: 22, paddingTop: 14, paddingBottom: 10 },
  empty: { fontFamily: 'Poppins_400Regular', fontSize: 14, color: INK4, textAlign: 'center', paddingVertical: 18 },

  // Income hero
  incomeCard: { marginHorizontal: 14, marginBottom: 14, borderRadius: 22, padding: 22, paddingTop: 24, backgroundColor: SLATE },
  incomeTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  incomeLbl: { fontFamily: 'Poppins_700Bold', fontSize: 11, letterSpacing: 1.1, textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: 8 },
  incomeHuge: { fontFamily: 'Poppins_800ExtraBold', fontSize: 48, color: '#FFFFFF', letterSpacing: -1.4, lineHeight: 56, paddingTop: 4 },
  incomeEdit: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(52,211,153,0.18)', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, marginTop: 22 },
  incomeEditTxt: { fontFamily: 'Poppins_700Bold', fontSize: 13, color: BUD_MID },
  incomeDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.12)', marginTop: 18, marginBottom: 16 },
  incomeGrid: { flexDirection: 'row', gap: 14 },
  incomeSub: { fontFamily: 'Poppins_700Bold', fontSize: 10, letterSpacing: 0.8, textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)', marginBottom: 6 },
  incomeBig: { fontFamily: 'Poppins_800ExtraBold', fontSize: 22, color: '#FFFFFF', letterSpacing: -0.5, lineHeight: 28, paddingTop: 2 },

  // Budget health tiles
  // Allocation card — Option D: labelled bar + breakdown chips
  allocCard: { marginHorizontal: 14, marginBottom: 10, backgroundColor: CARD, borderRadius: 18, borderWidth: 1, borderColor: BORDER, padding: 18 },
  allocTitle: { fontFamily: 'Poppins_700Bold', fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase', color: INK4, marginBottom: 14 },
  allocBar: { flexDirection: 'row', height: 22, borderRadius: 11, overflow: 'hidden', backgroundColor: NEUT_BG, marginBottom: 12 },
  allocSeg: { alignItems: 'center', justifyContent: 'center', height: '100%' },
  allocSegTxt: { fontFamily: 'Poppins_700Bold', fontSize: 11, letterSpacing: 0.3 },
  allocChips: { flexDirection: 'row', gap: 6 },
  allocChip: { flex: 1, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 10 },
  allocChipLbl: { fontFamily: 'Poppins_700Bold', fontSize: 10, letterSpacing: 0.5, textTransform: 'uppercase', opacity: 0.85 },
  allocChipVal: { fontFamily: 'Poppins_800ExtraBold', fontSize: 17, marginTop: 3, letterSpacing: -0.3 },
  allocNote: { fontFamily: 'Poppins_500Medium', fontSize: 13, color: PEACH_DARK, marginTop: 12, lineHeight: 19, backgroundColor: PEACH_BG, padding: 12, borderRadius: 10 },

  // Plan summary rows
  planRow: { marginHorizontal: 14, marginBottom: 8, backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 },
  planIco: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  planTitle: { fontFamily: 'Poppins_700Bold', fontSize: 15, color: INK },
  planSub: { fontFamily: 'Poppins_500Medium', fontSize: 13, color: INK3, marginTop: 2 },
  planVal: { fontFamily: 'Poppins_800ExtraBold', fontSize: 17, color: INK },
  planValSub: { fontFamily: 'Poppins_500Medium', fontSize: 11, color: INK4, marginTop: 1 },

  // AI helper buttons
  aiBtn: { marginHorizontal: 14, marginTop: 18, borderRadius: 18, borderWidth: 1.5, borderStyle: 'dashed', borderColor: BUD, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: BUD_CARD },
  aiBtnInline: { marginTop: 0, marginBottom: 12, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: BUD_CARD, borderWidth: 1, borderColor: BUD_LIGHT },
  aiIco: { width: 44, height: 44, borderRadius: 14, backgroundColor: BUD, alignItems: 'center', justifyContent: 'center' },
  aiTitle: { fontFamily: 'Poppins_700Bold', fontSize: 15, color: BUD_DARK },
  aiSub: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: 'rgba(5,150,105,0.7)', marginTop: 2 },

  // Category card
  catCard: { marginHorizontal: 14, marginBottom: 8, backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center' },
  catName: { fontFamily: 'Poppins_700Bold', fontSize: 16, color: INK },
  catSub: { fontFamily: 'Poppins_500Medium', fontSize: 12, color: INK3, marginTop: 3 },
  catVal: { fontFamily: 'Poppins_800ExtraBold', fontSize: 19, color: INK, letterSpacing: -0.3 },
  catValSub: { fontFamily: 'Poppins_500Medium', fontSize: 11, color: INK4, marginTop: 1 },

  addCard: { marginHorizontal: 14, marginTop: 2, marginBottom: 6, borderRadius: 14, borderWidth: 1.5, borderColor: 'rgba(10,10,10,0.15)', borderStyle: 'dashed', padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  addCardInline: { marginTop: 4, borderRadius: 14, borderWidth: 1.5, borderColor: 'rgba(10,10,10,0.15)', borderStyle: 'dashed', padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  addCardTxt: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: INK4 },

  // Goal card
  goalCard: { marginHorizontal: 14, marginBottom: 10, borderRadius: 18, backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, padding: 16 },
  goalHdr: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  goalName: { fontFamily: 'Poppins_700Bold', fontSize: 16, color: INK },
  goalPct: { fontFamily: 'Poppins_800ExtraBold', fontSize: 18, color: BUD },
  goalBar: { height: 6, borderRadius: 3, backgroundColor: 'rgba(10,10,10,0.07)', overflow: 'hidden', marginBottom: 10 },
  goalFill: { height: '100%', borderRadius: 3, backgroundColor: BUD },
  goalStats: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  goalStat: { flex: 1, backgroundColor: BUD_CARD, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 8, alignItems: 'center' },
  goalStatN: { fontFamily: 'Poppins_700Bold', fontSize: 13, color: BUD_DARK },
  goalStatL: { fontFamily: 'Poppins_700Bold', fontSize: 10, letterSpacing: 0.6, textTransform: 'uppercase', color: 'rgba(5,150,105,0.6)', marginTop: 2 },
  goalTarget: { fontFamily: 'Poppins_500Medium', fontSize: 12, color: INK4 },
  addGoal: { marginHorizontal: 14, marginTop: 2, marginBottom: 6, borderRadius: 16, borderWidth: 1.5, borderColor: 'rgba(10,10,10,0.15)', borderStyle: 'dashed', padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  addGoalTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: INK4 },
  addGoalSub: { fontFamily: 'Poppins_400Regular', fontSize: 11, color: INK5, marginTop: 2 },

  // Sheet
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheetCard: { height: H * 0.92, backgroundColor: BG, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(10,10,10,0.14)', alignSelf: 'center', marginTop: 12 },
  sheetHdr: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: BORDER },
  sheetTitle: { fontFamily: 'Poppins_700Bold', fontSize: 17, color: INK },
  sheetX: { paddingHorizontal: 10, paddingVertical: 5, backgroundColor: 'rgba(10,10,10,0.06)', borderRadius: 8 },
  sheetXTxt: { fontFamily: 'Poppins_600SemiBold', fontSize: 12, color: INK3 },
  sheetBody: { flex: 1, paddingHorizontal: 14, paddingTop: 14 },
  sheetSecLbl: { fontFamily: 'Poppins_700Bold', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: INK4, marginBottom: 8 },

  // Total card (fixed category)
  totalCard: { backgroundColor: BUD_CARD, borderRadius: 16, padding: 16, marginBottom: 14 },
  totalLbl: { fontFamily: 'Poppins_700Bold', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(5,150,105,0.65)', marginBottom: 4 },
  totalVal: { fontFamily: 'Poppins_800ExtraBold', fontSize: 40, color: BUD_DARK, letterSpacing: -1.2, lineHeight: 46, paddingTop: 4 },
  totalSub: { fontFamily: 'Poppins_500Medium', fontSize: 12, color: BUD_DARK, marginTop: 6 },

  // Line item row
  liRow: { backgroundColor: CARD, borderRadius: 12, borderWidth: 1, borderColor: BORDER, padding: 12, paddingHorizontal: 14, marginBottom: 6, flexDirection: 'row', alignItems: 'center' },
  liName: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: INK },
  liAmt: { fontFamily: 'Poppins_700Bold', fontSize: 15, color: INK, marginRight: 8 },
  liChev: { fontFamily: 'Poppins_400Regular', fontSize: 18, color: INK5 },
  inlineAdd: { backgroundColor: CARD, borderRadius: 12, borderWidth: 1, borderColor: BUD_LIGHT, padding: 14, marginTop: 4, marginBottom: 4 },

  // Variable target card
  varTargetCard: { backgroundColor: CARD, borderRadius: 16, borderWidth: 1.5, borderColor: BUD_LIGHT, padding: 18, marginBottom: 12 },
  varTargetVal: { fontFamily: 'Poppins_800ExtraBold', fontSize: 44, color: INK, letterSpacing: -1.3, lineHeight: 50, paddingTop: 4 },
  varTargetInput: { fontFamily: 'Poppins_800ExtraBold', fontSize: 44, color: INK, letterSpacing: -1.3, lineHeight: 50, padding: 0, paddingTop: 4 },
  varTargetHint: { fontFamily: 'Poppins_500Medium', fontSize: 12, color: INK3, marginTop: 6 },

  // Tip text
  tipTxt: { fontFamily: 'Poppins_500Medium', fontSize: 13, color: INK3, lineHeight: 19, padding: 12, paddingHorizontal: 14, backgroundColor: CARD, borderRadius: 10, borderWidth: 1, borderColor: BORDER, marginTop: 12 },

  // Buttons
  btnPrimary: { backgroundColor: BUD, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  btnPrimaryTxt: { fontFamily: 'Poppins_700Bold', fontSize: 14, color: '#FFFFFF' },
  btnGhost: { backgroundColor: '#FFFFFF', borderRadius: 12, paddingVertical: 13, alignItems: 'center', borderWidth: 1, borderColor: BORDER },
  btnGhostTxt: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: INK2 },

  // Income editor
  incomeTotal: { backgroundColor: SLATE, borderRadius: 14, padding: 16, marginBottom: 14 },
  incomeTotalLbl: { fontFamily: 'Poppins_700Bold', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: 6 },
  incomeTotalVal: { fontFamily: 'Poppins_800ExtraBold', fontSize: 32, color: '#FFFFFF', letterSpacing: -1, lineHeight: 38, paddingTop: 2 },
  incomeTotalSub: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 4 },
  streamCard: { backgroundColor: CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER, padding: 14, marginBottom: 8 },
  streamHdr: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  streamName: { fontFamily: 'Poppins_700Bold', fontSize: 15, color: INK },
  streamType: { fontFamily: 'Poppins_600SemiBold', fontSize: 11, color: INK4, backgroundColor: 'rgba(10,10,10,0.06)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  streamVal: { fontFamily: 'Poppins_800ExtraBold', fontSize: 22, color: INK, letterSpacing: -0.5, lineHeight: 28, paddingTop: 2 },
  streamEdit: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: BUD },

  // Fields
  fieldLbl: { fontFamily: 'Poppins_700Bold', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: INK4, marginTop: 12, marginBottom: 6 },
  input: { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: BORDER, paddingHorizontal: 14, paddingVertical: 12, fontFamily: 'Poppins_500Medium', fontSize: 15, color: INK },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  emojiOpt: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: BORDER, alignItems: 'center', justifyContent: 'center' },
  emojiOptOn: { borderColor: BUD, backgroundColor: BUD_CARD, borderWidth: 2 },
  tog: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10, borderWidth: 1.5, borderColor: BORDER, backgroundColor: '#FFFFFF' },
  togOn: { borderColor: BUD, backgroundColor: BUD_CARD },
  togTxt: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: INK4 },
  togTxtOn: { color: BUD_DARK, fontFamily: 'Poppins_700Bold' },

  // AI intro sheet
  uploadIntro: { fontFamily: 'Poppins_400Regular', fontSize: 14, color: INK3, lineHeight: 21, marginBottom: 16 },
  uploadMethod: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER, padding: 14, marginBottom: 8 },
  uploadMethodOn: { borderColor: BUD, backgroundColor: BUD_CARD, borderWidth: 1.5 },
  uploadMethodTitle: { fontFamily: 'Poppins_700Bold', fontSize: 15, color: INK },
  uploadMethodSub: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: INK4, marginTop: 3, lineHeight: 17 },
  uploadMethodBadge: { backgroundColor: BUD, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  uploadMethodBadgeTxt: { fontFamily: 'Poppins_700Bold', fontSize: 11, color: '#FFFFFF', letterSpacing: 0.3 },
  uploadNote: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: INK4, marginTop: 14, lineHeight: 18 },

  // AI suggestions sheet
  aiBanner: { backgroundColor: SLATE, borderRadius: 14, padding: 14, marginBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  aiBannerIco: { width: 42, height: 42, borderRadius: 12, backgroundColor: BUD, alignItems: 'center', justifyContent: 'center' },
  aiBannerT: { fontFamily: 'Poppins_700Bold', fontSize: 14, color: '#FFFFFF' },
  aiBannerS: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 3, lineHeight: 17 },
  suggCard: { backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, borderRadius: 12, padding: 12, paddingHorizontal: 14, marginBottom: 6 },
  suggHdr: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  suggName: { fontFamily: 'Poppins_700Bold', fontSize: 14, color: INK },
  suggOld: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: INK4, textDecorationLine: 'line-through', marginRight: 6 },
  suggNew: { fontFamily: 'Poppins_800ExtraBold', fontSize: 17, color: BUD_DARK, letterSpacing: -0.2 },
  suggWhy: { fontFamily: 'Poppins_500Medium', fontSize: 12, color: INK3, lineHeight: 17, marginBottom: 8 },
  suggActions: { flexDirection: 'row', gap: 6 },
  suggBtn: { flex: 1, borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  suggBtnAccept: { backgroundColor: BUD_CARD, borderWidth: 1, borderColor: BUD_LIGHT },
  suggBtnAcceptOn: { backgroundColor: BUD, borderWidth: 1, borderColor: BUD },
  suggBtnSkip: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: BORDER },
  suggBtnSkipOn: { backgroundColor: 'rgba(10,10,10,0.08)', borderWidth: 1, borderColor: 'rgba(10,10,10,0.25)' },
  suggBtnTxt: { fontFamily: 'Poppins_700Bold', fontSize: 12 },

  // Scan overlay
  scanOverlay: { position: 'absolute', inset: 0 as any, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', zIndex: 500 },
  scanCard: { backgroundColor: '#FFFFFF', borderRadius: 20, paddingVertical: 28, paddingHorizontal: 36, alignItems: 'center', minWidth: 240 },
  scanTxt: { fontFamily: 'Poppins_700Bold', fontSize: 16, color: INK, marginTop: 14 },
  scanSub: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: INK3, marginTop: 4, textAlign: 'center' },
});
