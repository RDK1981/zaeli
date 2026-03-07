import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '../../lib/supabase';

type ListType = 'shopping' | 'todo' | 'ideas';

interface ListItem {
  id: string;
  text: string;
  completed: boolean;
  list_type: ListType;
  family_id: string;
  created_at: string;
}

const COLORS = {
  bg: '#0A0F1E',
  card: '#141929',
  cardBorder: '#1E2840',
  blue: '#4A90D9',
  blueLight: 'rgba(74,144,217,0.12)',
  blueBorder: 'rgba(74,144,217,0.25)',
  text: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.55)',
  textTertiary: 'rgba(255,255,255,0.28)',
  green: '#1DB87A',
  greenLight: 'rgba(29,184,122,0.12)',
  orange: '#E8922A',
  red: '#D64F3E',
  purple: '#9B7FD4',
  purpleLight: 'rgba(155,127,212,0.12)',
};

const LIST_TABS: { key: ListType; label: string; icon: string; color: string; bg: string }[] = [
  { key: 'shopping', label: 'Shopping', icon: '🛒', color: COLORS.green,  bg: COLORS.greenLight  },
  { key: 'todo',     label: 'To‑Do',   icon: '✅', color: COLORS.blue,   bg: COLORS.blueLight   },
  { key: 'ideas',    label: 'Ideas',   icon: '💡', color: COLORS.purple, bg: COLORS.purpleLight },
];

// Dummy family ID — matches what we inserted in Supabase
const DUMMY_FAMILY_ID = '00000000-0000-0000-0000-000000000001';

export default function ListsScreen() {
  const [activeTab, setActiveTab] = useState<ListType>('shopping');
  const [items, setItems]         = useState<ListItem[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading]     = useState(true);
  const inputRef                  = useRef<TextInput>(null);
  const slideAnim                 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchItems();
    const subscription = supabase
      .channel('list_items')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'list_items',
        filter: `family_id=eq.${DUMMY_FAMILY_ID}`,
      }, () => { fetchItems(); })
      .subscribe();
    return () => { supabase.removeChannel(subscription); };
  }, [activeTab]);

  const fetchItems = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('list_items')
      .select('*')
      .eq('family_id', DUMMY_FAMILY_ID)
      .eq('list_type', activeTab)
      .order('created_at', { ascending: true });
    if (!error && data) setItems(data);
    setLoading(false);
  };

  const switchTab = (tab: ListType) => {
    Animated.sequence([
      Animated.timing(slideAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
    ]).start();
    setActiveTab(tab);
  };

  const addItem = async () => {
    const text = inputText.trim();
    if (!text) return;
    setInputText('');
    const { error } = await supabase.from('list_items').insert({
      text,
      completed: false,
      list_type: activeTab,
      family_id: DUMMY_FAMILY_ID,
    });
    if (error) Alert.alert('Oops', 'Could not add item. Please try again.');
  };

  const toggleItem = async (item: ListItem) => {
    const { error } = await supabase
      .from('list_items')
      .update({ completed: !item.completed })
      .eq('id', item.id);
    if (!error) {
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, completed: !i.completed } : i));
    }
  };

  const deleteItem = async (id: string) => {
    await supabase.from('list_items').delete().eq('id', id);
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const clearCompleted = async () => {
    const completedIds = items.filter(i => i.completed).map(i => i.id);
    if (completedIds.length === 0) return;
    Alert.alert(
      'Clear completed?',
      `Remove ${completedIds.length} completed item${completedIds.length > 1 ? 's' : ''}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear', style: 'destructive',
          onPress: async () => {
            await supabase.from('list_items').delete().in('id', completedIds);
            setItems(prev => prev.filter(i => !i.completed));
          },
        },
      ]
    );
  };

  const activeTab_     = LIST_TABS.find(t => t.key === activeTab)!;
  const completedCount = items.filter(i => i.completed).length;
  const totalCount     = items.length;
  const allListData    = [...items.filter(i => !i.completed), ...items.filter(i => i.completed)];

  const renderItem = ({ item }: { item: ListItem }) => (
    <ItemRow
      item={item}
      accentColor={activeTab_.color}
      onToggle={() => toggleItem(item)}
      onDelete={() => deleteItem(item.id)}
    />
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Lists</Text>
        {completedCount > 0 && (
          <TouchableOpacity onPress={clearCompleted} style={styles.clearBtn}>
            <Text style={styles.clearBtnText}>Clear done</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.tabBar}>
        {LIST_TABS.map(tab => {
          const active = tab.key === activeTab;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabItem, active && { backgroundColor: tab.bg, borderColor: tab.color + '55' }]}
              onPress={() => switchTab(tab.key)}
              activeOpacity={0.7}
            >
              <Text style={styles.tabIcon}>{tab.icon}</Text>
              <Text style={[styles.tabLabel, active && { color: tab.color }]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {totalCount > 0 && (
        <View style={styles.progressWrap}>
          <View style={styles.progressBg}>
            <View
              style={[
                styles.progressFill,
                { backgroundColor: activeTab_.color, width: `${(completedCount / totalCount) * 100}%` as any },
              ]}
            />
          </View>
          <Text style={styles.progressText}>{completedCount}/{totalCount} done</Text>
        </View>
      )}

      {loading ? (
        <View style={styles.centred}>
          <ActivityIndicator color={activeTab_.color} />
        </View>
      ) : allListData.length === 0 ? (
        <View style={styles.centred}>
          <Text style={styles.emptyIcon}>{activeTab_.icon}</Text>
          <Text style={styles.emptyTitle}>
            {activeTab === 'shopping' ? 'Nothing on the list' : activeTab === 'todo' ? 'All clear!' : 'No ideas yet'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {activeTab === 'shopping' ? 'Add your first item below' : activeTab === 'todo' ? 'Add something to tackle' : 'Capture an idea below'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={allListData}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.inputBar}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder={
              activeTab === 'shopping' ? 'Add to shopping list…' :
              activeTab === 'todo'     ? 'Add a task…'           : 'Capture an idea…'
            }
            placeholderTextColor={COLORS.textTertiary}
            returnKeyType="done"
            onSubmitEditing={addItem}
          />
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: inputText.trim() ? activeTab_.color : COLORS.cardBorder }]}
            onPress={addItem}
            activeOpacity={0.8}
          >
            <Text style={styles.addBtnText}>+</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ItemRow({ item, accentColor, onToggle, onDelete }: {
  item: ListItem; accentColor: string; onToggle: () => void; onDelete: () => void;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handleToggle = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.94, duration: 80,  useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1,    duration: 120, useNativeDriver: true }),
    ]).start();
    onToggle();
  };

  return (
    <Animated.View style={[styles.itemRow, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity onPress={handleToggle} style={styles.itemLeft} activeOpacity={0.7}>
        <View style={[styles.checkbox, item.completed && { backgroundColor: accentColor, borderColor: accentColor }]}>
          {item.completed && <Text style={styles.checkmark}>✓</Text>}
        </View>
        <Text style={[styles.itemText, item.completed && styles.itemTextDone]}>{item.text}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onDelete} style={styles.deleteBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Text style={styles.deleteIcon}>×</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: COLORS.bg },
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
  headerTitle:   { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 32, color: COLORS.text, letterSpacing: -0.5 },
  clearBtn:      { backgroundColor: 'rgba(214,79,62,0.12)', borderWidth: 1, borderColor: 'rgba(214,79,62,0.25)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  clearBtnText:  { fontSize: 12, color: COLORS.red, fontWeight: '500' },
  tabBar:        { flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginTop: 8, marginBottom: 16 },
  tabItem:       { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 12, backgroundColor: COLORS.card, borderWidth: 1.5, borderColor: COLORS.cardBorder },
  tabIcon:       { fontSize: 15 },
  tabLabel:      { fontSize: 13, color: COLORS.textSecondary },
  progressWrap:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, gap: 10, marginBottom: 12 },
  progressBg:    { flex: 1, height: 4, backgroundColor: COLORS.cardBorder, borderRadius: 2, overflow: 'hidden' },
  progressFill:  { height: '100%', borderRadius: 2 },
  progressText:  { fontSize: 11, color: COLORS.textTertiary, width: 52, textAlign: 'right' },
  centred:       { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyIcon:     { fontSize: 44, marginBottom: 4 },
  emptyTitle:    { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 20, color: COLORS.text },
  emptySubtitle: { fontSize: 14, color: COLORS.textSecondary },
  listContent:   { paddingHorizontal: 20, paddingBottom: 8, gap: 8 },
  itemRow:       { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderWidth: 1.5, borderColor: COLORS.cardBorder, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14 },
  itemLeft:      { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  checkbox:      { width: 22, height: 22, borderRadius: 7, borderWidth: 1.5, borderColor: COLORS.cardBorder, alignItems: 'center', justifyContent: 'center' },
  checkmark:     { fontSize: 12, color: '#fff', fontWeight: '700' },
  itemText:      { fontSize: 15, color: COLORS.text, flex: 1 },
  itemTextDone:  { color: COLORS.textTertiary, textDecorationLine: 'line-through' },
  deleteBtn:     { marginLeft: 8, paddingLeft: 8 },
  deleteIcon:    { fontSize: 20, color: COLORS.textTertiary, lineHeight: 22 },
  inputBar:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, paddingBottom: 24, gap: 10, backgroundColor: COLORS.bg, borderTopWidth: 1, borderTopColor: COLORS.cardBorder },
  input:         { flex: 1, backgroundColor: COLORS.card, borderWidth: 1.5, borderColor: COLORS.cardBorder, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 13, fontSize: 15, color: COLORS.text },
  addBtn:        { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  addBtnText:    { fontSize: 24, color: '#fff', lineHeight: 28, fontWeight: '300' },
});