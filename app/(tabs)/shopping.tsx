import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert,
  Platform, ScrollView, StyleSheet, Text,
  TextInput, TouchableOpacity, View
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
  accent:      '#FFE500',
  accentDark:  '#B8A400',
  accentLight: 'rgba(255,229,0,0.12)',
  accentBorder:'rgba(255,229,0,0.40)',
  accentBg:    '#FFF9E0',
  green:       '#00C97A',
  greenL:      'rgba(0,201,122,0.10)',
  greenB:      'rgba(0,201,122,0.30)',
  orange:      '#FF8C00',
  orangeL:     'rgba(255,140,0,0.10)',
  orangeB:     'rgba(255,140,0,0.30)',
  magenta:     '#E0007C',
  magentaL:    'rgba(224,0,124,0.10)',
  blue:        '#0057FF',
  blueL:       'rgba(0,87,255,0.08)',
  red:         '#FF3B3B',
};

type SubView = 'list' | 'pantry' | 'recent' | 'receipt';
type ShopItem = { id:string; name:string; quantity?:string; checked:boolean; category?:string; meal_source?:string };
type PantryItem = { id:string; name:string; quantity?:string; status:'ok'|'low'|'expiring'; emoji?:string };
type RecentItem = { id:string; name:string; days_ago:number; emoji?:string };

// ── CATEGORY CONFIG ───────────────────────────────────────────────────
const CATEGORIES: Record<string,{label:string;emoji:string;bg:string}> = {
  produce:   { label:'Produce',   emoji:'🥦', bg:C.greenL  },
  dairy:     { label:'Dairy',     emoji:'🥛', bg:C.blueL   },
  meat:      { label:'Meat',      emoji:'🥩', bg:'rgba(255,59,59,0.08)' },
  pantry:    { label:'Pantry',    emoji:'🥫', bg:C.orangeL },
  frozen:    { label:'Frozen',    emoji:'🧊', bg:'rgba(155,127,212,0.08)' },
  bakery:    { label:'Bakery',    emoji:'🍞', bg:C.magentaL },
  household: { label:'Household', emoji:'🧹', bg:C.accentLight },
  other:     { label:'Other',     emoji:'🛒', bg:C.card2   },
};

const CAT_ORDER = ['produce','dairy','meat','bakery','frozen','pantry','household','other'];

// dummy data so screen looks great even with empty DB
const DUMMY_ITEMS: ShopItem[] = [
  {id:'1',name:'Broccoli',       category:'produce', checked:false},
  {id:'2',name:'Baby Spinach',   category:'produce', checked:false},
  {id:'3',name:'Bananas',        category:'produce', checked:true},
  {id:'4',name:'Whole Milk 2L',  category:'dairy',   checked:false,meal_source:'Pasta Bake – Mon'},
  {id:'5',name:'Greek Yoghurt',  category:'dairy',   checked:false},
  {id:'6',name:'Chicken Thighs 1kg',category:'meat', checked:false,meal_source:'Pasta Bake – Mon'},
  {id:'7',name:'Sourdough Bread',category:'bakery',  checked:false},
  {id:'8',name:'Penne Pasta 500g',category:'pantry', checked:false,meal_source:'Pasta Bake – Mon'},
];
const DUMMY_PANTRY: PantryItem[] = [
  {id:'p1',name:'Baby Spinach',  quantity:'120g',    status:'expiring', emoji:'🥬'},
  {id:'p2',name:'Free Range Eggs',quantity:'6 left', status:'ok',       emoji:'🥚'},
  {id:'p3',name:'Full Cream Milk',quantity:'~300ml', status:'low',      emoji:'🥛'},
  {id:'p4',name:'Cheddar Cheese',quantity:'half block',status:'ok',     emoji:'🧀'},
  {id:'p5',name:'Lemons',        quantity:'3 left',  status:'ok',       emoji:'🍋'},
  {id:'p6',name:'Greek Yoghurt', quantity:'200g',    status:'low',      emoji:'🫙'},
  {id:'p7',name:'Pasta',         quantity:'2 × 500g',status:'ok',       emoji:'🍝'},
  {id:'p8',name:'Tomato Sauce',  quantity:'2 cans',  status:'ok',       emoji:'🥫'},
];
const DUMMY_RECENT: RecentItem[] = [
  {id:'r1',name:'Whole Milk 2L',    days_ago:2,emoji:'🥛'},
  {id:'r2',name:'Sourdough Bread',  days_ago:2,emoji:'🍞'},
  {id:'r3',name:'Chicken Thighs 1kg',days_ago:2,emoji:'🍗'},
  {id:'r4',name:'Free Range Eggs',  days_ago:4,emoji:'🥚'},
  {id:'r5',name:'Greek Yoghurt',    days_ago:4,emoji:'🫙'},
  {id:'r6',name:'Orange Juice',     days_ago:7,emoji:'🍊'},
  {id:'r7',name:'Pasta Penne',      days_ago:7,emoji:'🍝'},
];
const DUMMY_PATTERNS = ['Bananas','Dishwashing Liquid','Weet-Bix'];
const DUMMY_RECEIPT = [
  {name:'Full Cream Milk 2L',price:'$2.40'},
  {name:'Chicken Thighs 1kg',price:'$11.00'},
  {name:'Baby Spinach 120g', price:'$3.50'},
  {name:'Greek Yoghurt 500g',price:'$5.00'},
  {name:'Sourdough Bread',   price:'$4.50'},
];

// ── AI INSIGHT BAR ────────────────────────────────────────────────────
function AIBar({ insights, onAddBoth, loading }:
  { insights:string[]; onAddBoth?:()=>void; loading:boolean }) {
  const [expanded, setExpanded] = useState(true);
  return (
    <TouchableOpacity style={s.aiBar} onPress={() => setExpanded(e=>!e)} activeOpacity={0.9}>
      <View style={s.aiBarTop}>
        <View style={s.aiOrb}><Text style={{fontSize:16}}>✦</Text></View>
        <View style={{flex:1}}>
          <Text style={s.aiBarTitle}>ZAELI SHOPPING AI</Text>
        </View>
        <Text style={{fontSize:12,color:C.accentDark,fontWeight:'700'}}>{expanded?'▲':'▼'}</Text>
      </View>
      {expanded && (
        <>
          {loading ? (
            <ActivityIndicator size="small" color={C.accentDark} style={{alignSelf:'flex-start',marginBottom:8}} />
          ) : insights.map((ins,i) => (
            <Text key={i} style={s.aiInsight}>{ins}</Text>
          ))}
          <View style={s.aiBarBtns}>
            {onAddBoth && <TouchableOpacity style={s.aiBtnPrim} onPress={onAddBoth}><Text style={s.aiBtnPrimTxt}>Add Suggestions</Text></TouchableOpacity>}
            <TouchableOpacity style={s.aiBtnSec}><Text style={s.aiBtnSecTxt}>View Habits</Text></TouchableOpacity>
          </View>
        </>
      )}
    </TouchableOpacity>
  );
}

// ── SUB-NAV ───────────────────────────────────────────────────────────
function SubNav({ active, onSwitch }:{ active:SubView; onSwitch:(v:SubView)=>void }) {
  const TABS: {k:SubView;l:string}[] = [
    {k:'list',  l:'List'},
    {k:'pantry',l:'Pantry'},
    {k:'recent',l:'Recent'},
    {k:'receipt',l:'Receipt'},
  ];
  return (
    <View style={s.subNav}>
      {TABS.map(t => (
        <TouchableOpacity key={t.k} style={[s.subBtn, active===t.k && s.subBtnOn]} onPress={() => onSwitch(t.k)}>
          <Text style={[s.subBtnTxt, active===t.k && s.subBtnTxtOn]}>{t.l}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════════
// SHOPPING LIST VIEW
// ══════════════════════════════════════════════════════════════════════
function ListView({ items, onToggle, onDelete, layoutMode, onToggleLayout }:
  { items:ShopItem[]; onToggle:(i:ShopItem)=>void; onDelete:(id:string)=>void; layoutMode:boolean; onToggleLayout:()=>void }) {

  const active   = items.filter(i => !i.checked);
  const purchased= items.filter(i =>  i.checked);

  // group active by category when layout mode on
  const grouped = layoutMode
    ? CAT_ORDER.map(cat => ({
        cat,
        items: active.filter(i => (i.category||'other') === cat),
      })).filter(g => g.items.length > 0)
    : [{ cat:'all', items: active }];

  const CatConfig = (cat:string) => CATEGORIES[cat] || CATEGORIES.other;

  return (
    <ScrollView style={{flex:1}} showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom:120}}>
      {/* Layout mode banner */}
      {layoutMode && (
        <View style={s.layoutBanner}>
          <Text style={{fontSize:16}}>🗺️</Text>
          <Text style={s.layoutBannerTxt}>Supermarket Layout Mode — sorted by aisle</Text>
          <TouchableOpacity onPress={onToggleLayout}><Text style={s.layoutOff}>Off ×</Text></TouchableOpacity>
        </View>
      )}

      {/* Active items */}
      {grouped.map(({ cat, items: catItems }) => (
        catItems.length === 0 ? null : (
          <View key={cat} style={s.shopSection}>
            {layoutMode && (
              <View style={s.shopSectionHdr}>
                <Text style={s.shopSectionLbl}>{CatConfig(cat).emoji} {CatConfig(cat).label}</Text>
                <View style={[s.shopSectionCount,{backgroundColor:C.accentLight}]}>
                  <Text style={[s.shopSectionCountTxt,{color:C.accentDark}]}>{catItems.length}</Text>
                </View>
              </View>
            )}
            {catItems.map(item => (
              <SwipeToDelete key={item.id} onDelete={() => onDelete(item.id)}
                accentColour={C.accentDark} deleteLabel="Remove" deleteEmoji="✕"
                style={{marginHorizontal:16, marginBottom:8}}>
                <TouchableOpacity style={[s.shopItem,{marginHorizontal:0,marginBottom:0}]}
                  onPress={() => onToggle(item)} activeOpacity={0.75}>
                  <View style={s.sCheck} />
                  <View style={{flex:1}}>
                    <Text style={s.sName}>{item.name}</Text>
                    {item.quantity && <Text style={s.sMeta}>{item.quantity}</Text>}
                    {item.meal_source && <Text style={[s.sMeta,{color:C.orange}]}>🍽 {item.meal_source}</Text>}
                  </View>
                  <View style={[s.sCat,{backgroundColor:CatConfig(item.category||'other').bg}]}>
                    <Text style={{fontSize:13}}>{CatConfig(item.category||'other').emoji}</Text>
                  </View>
                </TouchableOpacity>
              </SwipeToDelete>
            ))}
          </View>
        )
      ))}

      {active.length === 0 && purchased.length === 0 && (
        <Text style={s.emptyTxt}>Your list is empty · add something below</Text>
      )}

      {/* Purchased divider */}
      {purchased.length > 0 && (
        <>
          <View style={s.divider}>
            <View style={{flex:1,height:1.5,backgroundColor:C.border}} />
            <Text style={s.divTxt}>Purchased</Text>
            <View style={{flex:1,height:1.5,backgroundColor:C.border}} />
          </View>
          {purchased.map(item => (
            <SwipeToDelete key={item.id} onDelete={() => onDelete(item.id)}
              accentColour={C.accentDark} deleteLabel="Remove" deleteEmoji="✕"
              style={{marginHorizontal:16, marginBottom:8}}>
              <TouchableOpacity style={[s.shopItem,{marginHorizontal:0,marginBottom:0}]}
                onPress={() => onToggle(item)} activeOpacity={0.75}>
                <View style={[s.sCheck, s.sCheckDone]}>
                  <Text style={{color:'#fff',fontSize:13,fontWeight:'700'}}>✓</Text>
                </View>
                <View style={{flex:1}}>
                  <Text style={[s.sName,s.sNameDone]}>{item.name}</Text>
                </View>
              </TouchableOpacity>
            </SwipeToDelete>
          ))}
          <TouchableOpacity style={s.clearBtn} onPress={()=>{}}>
            <Text style={s.clearBtnTxt}>Clear purchased</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

// ══════════════════════════════════════════════════════════════════════
// PANTRY VIEW
// ══════════════════════════════════════════════════════════════════════
function PantryView({ items }:{ items:PantryItem[] }) {
  const statusBadge = (s:string) => {
    if (s==='expiring') return {bg:C.magentaL, color:C.magenta, label:'Expires Soon'};
    if (s==='low')      return {bg:C.orangeL,  color:C.orange,  label:'Running Low'};
    return               {bg:C.greenL,  color:C.green,   label:'Good'};
  };

  return (
    <ScrollView style={{flex:1}} showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom:40}}>
      {/* Scan buttons */}
      <View style={{flexDirection:'row',gap:10,margin:14,marginBottom:0}}>
        <TouchableOpacity style={[s.scanBtn,{backgroundColor:C.accent}]}>
          <Text style={{fontSize:13,fontWeight:'700',color:'#000',fontFamily:'Poppins_700Bold'}}>📷 Scan Fridge</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.scanBtn,{backgroundColor:C.card,borderWidth:1.5,borderColor:C.border}]}>
          <Text style={{fontSize:13,fontWeight:'700',color:C.text2}}>📷 Scan Pantry</Text>
        </TouchableOpacity>
      </View>

      <Text style={s.pantrySection}>Fridge · Last scanned 2h ago</Text>

      <View style={s.pantryGrid}>
        {items.filter(i=>['expiring','low','ok'].includes(i.status)).map(item => {
          const badge = statusBadge(item.status);
          return (
            <View key={item.id} style={[s.pantryCard, item.status!=='ok' && s.pantryCardAlert]}>
              <Text style={{fontSize:26}}>{item.emoji||'🛒'}</Text>
              <Text style={s.pantryName}>{item.name}</Text>
              <Text style={s.pantryQty}>{item.quantity}</Text>
              <View style={[s.pantryBadge,{backgroundColor:badge.bg}]}>
                <Text style={[s.pantryBadgeTxt,{color:badge.color}]}>{badge.label}</Text>
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

// ══════════════════════════════════════════════════════════════════════
// RECENTLY PURCHASED VIEW
// ══════════════════════════════════════════════════════════════════════
function RecentView({ items, patterns, onAddToList }:
  { items:RecentItem[]; patterns:string[]; onAddToList:(name:string)=>void }) {

  const thisWeek = items.filter(i => i.days_ago <= 7);
  const older    = items.filter(i => i.days_ago  >  7);

  return (
    <ScrollView style={{flex:1}} showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom:40}}>
      {/* Pattern AI box */}
      <View style={s.patternBox}>
        <Text style={s.patternBoxTitle}>✦ You usually buy these weekly</Text>
        {patterns.map((p,i) => (
          <View key={i} style={[s.recItem,{paddingVertical:10,borderBottomColor:C.border,borderBottomWidth:i<patterns.length-1?1:0}]}>
            <Text style={s.recName}>{p}</Text>
            <TouchableOpacity style={s.recAdd} onPress={() => onAddToList(p)}>
              <Text style={s.recAddTxt}>+ Add</Text>
            </TouchableOpacity>
          </View>
        ))}
        <TouchableOpacity style={[s.aiBtnPrim,{marginTop:12,paddingVertical:12}]}>
          <Text style={s.aiBtnPrimTxt}>Add All Regulars</Text>
        </TouchableOpacity>
      </View>

      <Text style={[s.pantrySection,{marginTop:16}]}>Bought this week</Text>
      {thisWeek.map(item => (
        <View key={item.id} style={s.recItem}>
          <Text style={s.recDays}>{item.days_ago}d</Text>
          <Text style={s.recName}>{item.emoji} {item.name}</Text>
          <TouchableOpacity style={s.recAdd} onPress={() => onAddToList(item.name)}>
            <Text style={s.recAddTxt}>+ Add</Text>
          </TouchableOpacity>
        </View>
      ))}

      {older.length > 0 && (
        <>
          <Text style={[s.pantrySection,{marginTop:16}]}>Earlier</Text>
          {older.map(item => (
            <View key={item.id} style={s.recItem}>
              <Text style={s.recDays}>{item.days_ago}d</Text>
              <Text style={s.recName}>{item.emoji} {item.name}</Text>
              <TouchableOpacity style={s.recAdd} onPress={() => onAddToList(item.name)}>
                <Text style={s.recAddTxt}>+ Add</Text>
              </TouchableOpacity>
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}

// ══════════════════════════════════════════════════════════════════════
// RECEIPT SCANNER VIEW
// ══════════════════════════════════════════════════════════════════════
function ReceiptView() {
  const [scanned, setScanned] = useState(true); // show parsed example by default

  return (
    <ScrollView style={{flex:1}} showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom:40}}>
      {!scanned ? (
        <View style={s.receiptArea}>
          <Text style={{fontSize:44}}>🧾</Text>
          <Text style={s.receiptTitle}>Scan a Receipt</Text>
          <Text style={s.receiptSub}>AI reads item names, quantities and prices, then updates your pantry and purchase history automatically.</Text>
          <TouchableOpacity style={s.receiptScanBtn} onPress={() => setScanned(true)}>
            <Text style={{fontSize:14,fontWeight:'700',color:'#000',fontFamily:'Poppins_700Bold'}}>📷 Scan Receipt</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{margin:16}}>
          <View style={s.receiptParsed}>
            <View style={s.receiptParsedHdr}>
              <Text style={{fontSize:16}}>✅</Text>
              <Text style={s.receiptParsedTitle}>Woolworths · 7 Mar · $94.60</Text>
            </View>
            {DUMMY_RECEIPT.map((row,i) => (
              <View key={i} style={[s.receiptRow,i===DUMMY_RECEIPT.length-1&&{borderBottomWidth:0}]}>
                <Text style={s.receiptItemName}>{row.name}</Text>
                <Text style={s.receiptPrice}>{row.price}</Text>
              </View>
            ))}
            <View style={[s.receiptRow,{backgroundColor:C.greenL,borderBottomWidth:0}]}>
              <Text style={{fontSize:12,color:C.green,fontWeight:'700'}}>✓ Pantry updated automatically</Text>
            </View>
          </View>
          <TouchableOpacity style={[s.receiptScanBtn,{marginTop:14,width:'100%'}]} onPress={() => setScanned(false)}>
            <Text style={{fontSize:14,fontWeight:'700',color:'#000',fontFamily:'Poppins_700Bold'}}>📷 Scan New Receipt</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

// ══════════════════════════════════════════════════════════════════════
// MAIN SHOPPING SCREEN
// ══════════════════════════════════════════════════════════════════════
export default function ShoppingScreen() {
  const [subView, setSubView]       = useState<SubView>('list');
  const [items, setItems]           = useState<ShopItem[]>(DUMMY_ITEMS);
  const [pantryItems]               = useState<PantryItem[]>(DUMMY_PANTRY);
  const [recentItems]               = useState<RecentItem[]>(DUMMY_RECENT);
  const [newItem, setNewItem]       = useState('');
  const [layoutMode, setLayoutMode] = useState(false);
  const [aiInsights, setAiInsights] = useState<string[]>([]);
  const [aiLoading, setAiLoading]   = useState(false);
  const inputRef                    = useRef<TextInput>(null);

  useEffect(() => { loadItems(); generateInsights(); }, []);

  const loadItems = async () => {
    const { data } = await supabase.from('shopping_items').select('*')
      .eq('family_id', DUMMY_FAMILY_ID).order('created_at',{ascending:false});
    if (data && data.length > 0) setItems(data as ShopItem[]);
  };

  const generateInsights = async () => {
    setAiLoading(true);
    // Build context from pantry + shopping
    const expiring = DUMMY_PANTRY.filter(p => p.status === 'expiring').map(p => p.name);
    const low      = DUMMY_PANTRY.filter(p => p.status === 'low').map(p => p.name);
    const insights: string[] = [];
    if (expiring.length) insights.push(`🥬 ${expiring.join(', ')} expires soon — meal idea: stir-fry tonight?`);
    if (low.length)      insights.push(`🥛 ${low[0]} is running low — add to list?`);
    insights.push('🍌 You usually buy Bananas every week. Add them?');
    setAiInsights(insights);
    setAiLoading(false);
  };

  const addItem = async () => {
    const name = newItem.trim();
    if (!name) return;
    setNewItem('');
    const existing = items.find(i => i.name.toLowerCase() === name.toLowerCase() && !i.checked);
    if (existing) { Alert.alert('Already on list', `"${name}" is already in your list.`); return; }
    const newEntry: ShopItem = { id: Date.now().toString(), name, checked: false, category: 'other' };
    setItems(p => [newEntry, ...p]);
    await supabase.from('shopping_items').insert({ family_id:DUMMY_FAMILY_ID, name, checked:false });
  };

  const toggleItem = async (item: ShopItem) => {
    setItems(p => p.map(i => i.id === item.id ? {...i, checked:!i.checked} : i));
    await supabase.from('shopping_items').update({ checked:!item.checked }).eq('id', item.id);
  };

  const deleteItem = async (id: string) => {
    Alert.alert('Remove item?', '', [
      { text:'Cancel', style:'cancel' },
      { text:'Remove', style:'destructive', onPress: async () => {
        setItems(p => p.filter(i => i.id !== id));
        await supabase.from('shopping_items').delete().eq('id', id);
      }},
    ]);
  };

  const addToList = (name: string) => {
    const newEntry: ShopItem = { id: Date.now().toString(), name, checked: false, category: 'other' };
    setItems(p => [newEntry, ...p]);
    setSubView('list');
  };

  const activeCount = items.filter(i => !i.checked).length;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.title}>Shopping</Text>
          <Text style={s.sub}>{activeCount > 0 ? `${activeCount} item${activeCount!==1?'s':''} to get` : 'All done! 🎉'}</Text>
        </View>
        <View style={{flexDirection:'row',gap:8,marginTop:6}}>
          <TouchableOpacity style={[s.headerBtn,layoutMode&&{backgroundColor:C.accentLight,borderColor:C.accentBorder}]}
            onPress={() => setLayoutMode(m => !m)}>
            <Text style={[s.headerBtnTxt, layoutMode&&{color:C.accentDark}]}>🗺️ Aisle</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.headerBtn}>
            <Text style={s.headerBtnTxt}>📦 Stock</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* AI Bar — shown on list + pantry */}
      {(subView === 'list' || subView === 'pantry') && (
        <AIBar insights={aiInsights} loading={aiLoading} onAddBoth={() => addToList('Milk')} />
      )}

      {/* Sub-nav */}
      <SubNav active={subView} onSwitch={setSubView} />

      {/* Views */}
      {subView === 'list' && (
        <ListView
          items={items}
          onToggle={toggleItem}
          onDelete={deleteItem}
          layoutMode={layoutMode}
          onToggleLayout={() => setLayoutMode(false)}
        />
      )}
      {subView === 'pantry' && <PantryView items={pantryItems} />}
      {subView === 'recent' && <RecentView items={recentItems} patterns={DUMMY_PATTERNS} onAddToList={addToList} />}
      {subView === 'receipt' && <ReceiptView />}

      {/* Input bar — list view only */}
      {subView === 'list' && (
        <View style={s.inputBar}>
          <TextInput
            ref={inputRef}
            style={s.input}
            value={newItem}
            onChangeText={setNewItem}
            placeholder="Add item or speak…"
            placeholderTextColor={C.text3}
            onSubmitEditing={addItem}
            returnKeyType="done"
          />
          <TouchableOpacity
            style={[s.addBtn, !newItem.trim() && {opacity:0.4}]}
            onPress={addItem}
            disabled={!newItem.trim()}>
            <Text style={s.addBtnTxt}>+</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

// ── STYLES ────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:    { flex:1, backgroundColor:C.bg },
  header:  { flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start', paddingHorizontal:22, paddingTop:16, paddingBottom:10 },
  title:   { fontFamily:'DMSerifDisplay_400Regular', fontSize:34, color:C.text },
  sub:     { fontSize:15, color:C.text2, marginTop:3 },
  headerBtn: { backgroundColor:C.card, borderWidth:1.5, borderColor:C.border, borderRadius:22, paddingHorizontal:14, paddingVertical:9 },
  headerBtnTxt:{ fontSize:13, fontWeight:'700', color:C.text2, fontFamily:'Poppins_700Bold' },

  // AI bar
  aiBar:       { margin:14, marginBottom:0, backgroundColor:C.accentBg, borderWidth:1.5, borderColor:C.accentBorder, borderRadius:18, padding:14 },
  aiBarTop:    { flexDirection:'row', alignItems:'center', gap:10, marginBottom:8 },
  aiOrb:       { width:34, height:34, borderRadius:11, backgroundColor:C.accent, alignItems:'center', justifyContent:'center', flexShrink:0 },
  aiBarTitle:  { fontSize:10, fontWeight:'700', color:C.accentDark, letterSpacing:1.2, fontFamily:'Poppins_700Bold' },
  aiInsight:   { fontSize:13, color:'#5a4800', fontWeight:'600', lineHeight:20, marginBottom:5 },
  aiBarBtns:   { flexDirection:'row', gap:8, marginTop:4 },
  aiBtnPrim:   { backgroundColor:C.accent, borderRadius:22, paddingHorizontal:16, paddingVertical:9, alignItems:'center' },
  aiBtnPrimTxt:{ fontSize:13, fontWeight:'700', color:'#000', fontFamily:'Poppins_700Bold' },
  aiBtnSec:    { backgroundColor:C.accentLight, borderRadius:22, paddingHorizontal:16, paddingVertical:9 },
  aiBtnSecTxt: { fontSize:13, fontWeight:'700', color:C.accentDark, fontFamily:'Poppins_700Bold' },

  // sub-nav
  subNav:    { flexDirection:'row', margin:14, marginBottom:0, backgroundColor:C.card2, borderRadius:14, padding:3 },
  subBtn:    { flex:1, paddingVertical:10, borderRadius:11, alignItems:'center' },
  subBtnOn:  { backgroundColor:C.accent },
  subBtnTxt: { fontSize:12, fontWeight:'700', color:C.text2, fontFamily:'Poppins_700Bold' },
  subBtnTxtOn:{ color:'#000' },

  // layout mode banner
  layoutBanner:    { flexDirection:'row', alignItems:'center', gap:10, marginHorizontal:16, marginTop:12, backgroundColor:C.blueL, borderWidth:1.5, borderColor:'rgba(0,87,255,0.2)', borderRadius:14, padding:12 },
  layoutBannerTxt: { flex:1, fontSize:12, color:C.blue, fontWeight:'600' },
  layoutOff:       { fontSize:12, fontWeight:'700', color:C.blue },

  // shop items
  shopSection:    { marginTop:12 },
  shopSectionHdr: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:18, paddingBottom:8 },
  shopSectionLbl: { fontSize:11, fontWeight:'700', color:C.text3, textTransform:'uppercase', letterSpacing:1, fontFamily:'Poppins_700Bold' },
  shopSectionCount:{ borderRadius:8, paddingHorizontal:8, paddingVertical:2 },
  shopSectionCountTxt:{ fontSize:11, fontWeight:'700', fontFamily:'Poppins_700Bold' },
  shopItem:   { flexDirection:'row', alignItems:'center', gap:12, backgroundColor:C.card, borderWidth:1.5, borderColor:C.border, borderRadius:14, paddingVertical:14, paddingHorizontal:16 },
  sCheck:     { width:26, height:26, borderRadius:8, borderWidth:1.5, borderColor:C.border, flexShrink:0, alignItems:'center', justifyContent:'center' },
  sCheckDone: { backgroundColor:C.green, borderColor:C.green },
  sName:      { fontSize:16, fontWeight:'600', color:C.text },
  sNameDone:  { color:C.text3, textDecorationLine:'line-through', fontWeight:'400' },
  sMeta:      { fontSize:12, color:C.text3, marginTop:2 },
  sCat:       { width:30, height:30, borderRadius:9, alignItems:'center', justifyContent:'center', flexShrink:0 },

  divider: { flexDirection:'row', alignItems:'center', gap:12, paddingHorizontal:18, marginVertical:10 },
  divTxt:  { fontSize:12, fontWeight:'700', color:C.text3, textTransform:'uppercase', letterSpacing:0.8, fontFamily:'Poppins_700Bold' },

  clearBtn:    { alignSelf:'center', marginVertical:10, paddingHorizontal:20, paddingVertical:10, borderRadius:22, backgroundColor:C.card, borderWidth:1.5, borderColor:C.border },
  clearBtnTxt: { fontSize:14, fontWeight:'700', color:C.text3, fontFamily:'Poppins_700Bold' },

  emptyTxt: { fontSize:16, color:C.text3, textAlign:'center', marginTop:60, fontStyle:'italic' },

  // pantry
  scanBtn:        { flex:1, padding:14, borderRadius:14, alignItems:'center' },
  pantrySection:  { fontSize:11, fontWeight:'700', color:C.text3, textTransform:'uppercase', letterSpacing:1, paddingHorizontal:18, paddingTop:14, paddingBottom:8, fontFamily:'Poppins_700Bold' },
  pantryGrid:     { flexDirection:'row', flexWrap:'wrap', paddingHorizontal:12, gap:8 },
  pantryCard:     { width:'46%', backgroundColor:C.card, borderWidth:1.5, borderColor:C.border, borderRadius:16, padding:14, gap:5 },
  pantryCardAlert:{ borderColor:'rgba(255,140,0,0.4)', backgroundColor:'rgba(255,140,0,0.03)' },
  pantryName:     { fontSize:13, fontWeight:'700', color:C.text },
  pantryQty:      { fontSize:11, color:C.text3 },
  pantryBadge:    { borderRadius:6, paddingHorizontal:8, paddingVertical:3, alignSelf:'flex-start' },
  pantryBadgeTxt: { fontSize:10, fontWeight:'700', fontFamily:'Poppins_700Bold' },

  // recent
  patternBox:     { margin:16, marginBottom:0, backgroundColor:C.accentBg, borderWidth:1.5, borderColor:C.accentBorder, borderRadius:18, padding:16 },
  patternBoxTitle:{ fontSize:12, fontWeight:'700', color:C.accentDark, marginBottom:10, fontFamily:'Poppins_700Bold' },
  recItem:        { flexDirection:'row', alignItems:'center', paddingHorizontal:16, paddingVertical:13, borderBottomWidth:1, borderBottomColor:C.border },
  recDays:        { fontSize:11, fontWeight:'700', color:C.text3, width:32, textAlign:'right', marginRight:4 },
  recName:        { flex:1, fontSize:15, fontWeight:'600', color:C.text },
  recAdd:         { backgroundColor:C.accentLight, borderRadius:8, paddingHorizontal:12, paddingVertical:6 },
  recAddTxt:      { fontSize:12, fontWeight:'700', color:C.accentDark, fontFamily:'Poppins_700Bold' },

  // receipt
  receiptArea:      { margin:20, borderWidth:2, borderColor:C.accentBorder, borderStyle:'dashed', borderRadius:20, padding:36, alignItems:'center', gap:14, backgroundColor:C.accentLight },
  receiptTitle:     { fontSize:18, fontWeight:'700', color:C.text, fontFamily:'Poppins_700Bold' },
  receiptSub:       { fontSize:13, color:C.text3, textAlign:'center', lineHeight:20 },
  receiptScanBtn:   { backgroundColor:C.accent, borderRadius:14, paddingVertical:14, paddingHorizontal:24, alignItems:'center' },
  receiptParsed:    { backgroundColor:C.card, borderWidth:1.5, borderColor:C.border, borderRadius:18, overflow:'hidden' },
  receiptParsedHdr: { backgroundColor:C.greenL, borderBottomWidth:1.5, borderBottomColor:C.greenB, padding:14, flexDirection:'row', alignItems:'center', gap:8 },
  receiptParsedTitle:{ fontSize:13, fontWeight:'700', color:C.green, fontFamily:'Poppins_700Bold' },
  receiptRow:       { flexDirection:'row', justifyContent:'space-between', paddingHorizontal:16, paddingVertical:11, borderBottomWidth:1, borderBottomColor:C.border },
  receiptItemName:  { fontSize:13, color:C.text, fontWeight:'500' },
  receiptPrice:     { fontSize:13, color:C.text3, fontWeight:'600' },

  // input bar
  inputBar: { position:'absolute', bottom:0, left:0, right:0, flexDirection:'row', alignItems:'center', gap:10, paddingHorizontal:18, paddingVertical:14, paddingBottom:Platform.OS==='ios'?30:18, borderTopWidth:1.5, borderTopColor:C.border, backgroundColor:C.card },
  input:    { flex:1, backgroundColor:C.bg, borderWidth:1.5, borderColor:C.border, borderRadius:16, paddingHorizontal:18, paddingVertical:13, fontSize:16, color:C.text },
  addBtn:   { width:52, height:52, borderRadius:16, backgroundColor:C.accent, alignItems:'center', justifyContent:'center' },
  addBtnTxt:{ fontSize:28, color:'#000', fontWeight:'300', lineHeight:32 },
});
