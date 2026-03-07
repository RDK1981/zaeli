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
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '../../lib/supabase';

interface ShoppingItem {
  id: string;
  text: string;
  completed: boolean;
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
  red: '#D64F3E',
  orange: '#E8922A',
  orangeLight: 'rgba(232,146,42,0.12)',
};

const DUMMY_FAMILY_ID = '00000000-0000-0000-0000-000000000001';

export default function ShoppingScreen() {
  const [items, setItems]               = useState<ShoppingItem[]>([]);
  const [inputText, setInputText]       = useState('');
  const [loading, setLoading]           = useState(true);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [stockModalVisible, setStockModalVisible] = useState(false);
  const inputRef                        = useRef<TextInput>(null);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  useEffect(() => {
    fetchItems();
    const subscription = supabase
      .channel('shopping_items')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'list_items',
        filter: `family_id=eq.${DUMMY_FAMILY_ID}`,
      }, () => { fetchItems(); })
      .subscribe();
    return () => { supabase.removeChannel(subscription); };
  }, []);

  const fetchItems = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('list_items')
      .select('*')
      .eq('family_id', DUMMY_FAMILY_ID)
      .eq('list_type', 'shopping')
      .order('completed', { ascending: true })
      .order('created_at', { ascending: false });
    if (!error && data) setItems(data);
    setLoading(false);
  };

  const addItem = async () => {
    const text = inputText.trim();
    if (!text) return;

    // Check if item exists in purchased (completed) list
    const existing = items.find(
      i => i.text.toLowerCase() === text.toLowerCase() && i.completed
    );

    if (existing) {
      // Un-strike and move to top
      setInputText('');
      Keyboard.dismiss();
      await supabase
        .from('list_items')
        .update({ completed: false, created_at: new Date().toISOString() })
        .eq('id', existing.id);
      fetchItems();
      return;
    }

    setInputText('');
    Keyboard.dismiss();
    const { error } = await supabase.from('list_items').insert({
      text,
      completed: false,
      list_type: 'shopping',
      family_id: DUMMY_FAMILY_ID,
    });
    if (error) Alert.alert('Oops', 'Could not add item. Please try again.');
  };

  const toggleItem = async (item: ShoppingItem) => {
    await supabase
      .from('list_items')
      .update({ completed: !item.completed })
      .eq('id', item.id);
    fetchItems();
  };

  const deleteItem = async (id: string) => {
    await supabase.from('list_items').delete().eq('id', id);
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const activeItems    = items.filter(i => !i.completed);
  const purchasedItems = items.filter(i => i.completed);

  const renderItem = ({ item }: { item: ShoppingItem }) => (
    <SwipeableItem
      item={item}
      onToggle={() => toggleItem(item)}
      onDelete={() => deleteItem(item.id)}
    />
  );

  const listData = [
    ...activeItems,
    ...(purchasedItems.length > 0 ? [{ id: 'divider', text: 'divider', completed: false, family_id: '', created_at: '' } as ShoppingItem] : []),
    ...purchasedItems,
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Shopping</Text>
          <Text style={styles.headerSub}>{activeItems.length} item{activeItems.length !== 1 ? 's' : ''} to get</Text>
        </View>
        <View style={styles.headerRight}>
          {keyboardVisible && (
            <TouchableOpacity onPress={() => Keyboard.dismiss()} style={styles.doneBtn}>
              <Text style={styles.doneBtnText}>Done</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.stockBtn}
            onPress={() => setStockModalVisible(true)}
          >
            <Text style={styles.stockBtnIcon}>📦</Text>
            <Text style={styles.stockBtnText}>Stock</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.centred}>
          <ActivityIndicator color={COLORS.green} />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.centred}>
          <Text style={styles.emptyIcon}>🛒</Text>
          <Text style={styles.emptyTitle}>Nothing on the list</Text>
          <Text style={styles.emptySubtitle}>Add your first item below</Text>
        </View>
      ) : (
        <FlatList
          data={listData}
          keyExtractor={item => item.id}
          renderItem={({ item }) => {
            if (item.id === 'divider') {
              return (
                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>Purchased</Text>
                  <View style={styles.dividerLine} />
                </View>
              );
            }
            return (
              <SwipeableItem
                item={item}
                onToggle={() => toggleItem(item)}
                onDelete={() => deleteItem(item.id)}
              />
            );
          }}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onScrollBeginDrag={() => Keyboard.dismiss()}
        />
      )}

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.inputBar}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Add to shopping list…"
            placeholderTextColor={COLORS.textTertiary}
            returnKeyType="done"
            onSubmitEditing={addItem}
          />
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: inputText.trim() ? COLORS.green : COLORS.cardBorder }]}
            onPress={addItem}
            activeOpacity={0.8}
          >
            <Text style={styles.addBtnText}>+</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Stock List Modal */}
      {stockModalVisible && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Stock List</Text>
              <TouchableOpacity onPress={() => setStockModalVisible(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.modalEmoji}>📸</Text>
              <Text style={styles.modalHeading}>Photo scanning coming in Phase 4</Text>
              <Text style={styles.modalSub}>
                Take a photo of your fridge or pantry and Zaeli's AI will automatically build your stock list. Available when we add the AI features.
              </Text>
              <TouchableOpacity
                style={styles.modalBtn}
                onPress={() => setStockModalVisible(false)}
              >
                <Text style={styles.modalBtnText}>Got it</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

function SwipeableItem({ item, onToggle, onDelete }: {
  item: ShoppingItem; onToggle: () => void; onDelete: () => void;
}) {
  const translateX = useRef(new Animated.Value(0)).current;
  const [swiped, setSwiped] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handleSwipe = () => {
    if (swiped) {
      // Reset
      Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
      setSwiped(false);
    } else {
      // Reveal delete
      Animated.spring(translateX, { toValue: -80, useNativeDriver: true }).start();
      setSwiped(true);
    }
  };

  const handleToggle = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.94, duration: 80, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
    onToggle();
  };

  return (
    <View style={styles.swipeContainer}>
      <View style={styles.deleteBackground}>
        <TouchableOpacity onPress={onDelete} style={styles.deleteAction}>
          <Text style={styles.deleteActionIcon}>🗑️</Text>
          <Text style={styles.deleteActionText}>Delete</Text>
        </TouchableOpacity>
      </View>
      <Animated.View style={[styles.itemRow, { transform: [{ translateX }, { scale: scaleAnim }] }]}>
        <TouchableOpacity onPress={handleToggle} style={styles.itemLeft} activeOpacity={0.7}>
          <View style={[styles.checkbox, item.completed && { backgroundColor: COLORS.green, borderColor: COLORS.green }]}>
            {item.completed && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={[styles.itemText, item.completed && styles.itemTextDone]}>{item.text}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleSwipe} style={styles.swipeHint} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.swipeHintIcon}>{swiped ? '←' : '←'}</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe:              { flex: 1, backgroundColor: COLORS.bg },
  header:            { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 16, paddingBottom: 12 },
  headerTitle:       { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 32, color: COLORS.text, letterSpacing: -0.5 },
  headerSub:         { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  headerRight:       { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  doneBtn:           { backgroundColor: COLORS.blueLight, borderWidth: 1, borderColor: COLORS.blueBorder, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  doneBtnText:       { fontSize: 12, color: COLORS.blue, fontWeight: '500' },
  stockBtn:          { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: COLORS.orangeLight, borderWidth: 1, borderColor: 'rgba(232,146,42,0.25)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  stockBtnIcon:      { fontSize: 13 },
  stockBtnText:      { fontSize: 12, color: COLORS.orange, fontWeight: '500' },
  centred:           { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyIcon:         { fontSize: 44, marginBottom: 4 },
  emptyTitle:        { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 20, color: COLORS.text },
  emptySubtitle:     { fontSize: 14, color: COLORS.textSecondary },
  listContent:       { paddingHorizontal: 20, paddingBottom: 8, gap: 8 },
  dividerRow:        { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  dividerLine:       { flex: 1, height: 1, backgroundColor: COLORS.cardBorder },
  dividerText:       { fontSize: 11, color: COLORS.textTertiary, fontWeight: '500', letterSpacing: 0.8, textTransform: 'uppercase' },
  swipeContainer:    { position: 'relative', marginBottom: 8 },
  deleteBackground:  { position: 'absolute', right: 0, top: 0, bottom: 0, width: 80, backgroundColor: COLORS.red, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  deleteAction:      { alignItems: 'center', gap: 2 },
  deleteActionIcon:  { fontSize: 18 },
  deleteActionText:  { fontSize: 10, color: '#fff', fontWeight: '600' },
  itemRow:           { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderWidth: 1.5, borderColor: COLORS.cardBorder, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14 },
  itemLeft:          { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  checkbox:          { width: 22, height: 22, borderRadius: 7, borderWidth: 1.5, borderColor: COLORS.cardBorder, alignItems: 'center', justifyContent: 'center' },
  checkmark:         { fontSize: 12, color: '#fff', fontWeight: '700' },
  itemText:          { fontSize: 15, color: COLORS.text, flex: 1 },
  itemTextDone:      { color: COLORS.textTertiary, textDecorationLine: 'line-through' },
  swipeHint:         { paddingLeft: 8 },
  swipeHintIcon:     { fontSize: 14, color: COLORS.textTertiary },
  inputBar:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, paddingBottom: 24, gap: 10, backgroundColor: COLORS.bg, borderTopWidth: 1, borderTopColor: COLORS.cardBorder },
  input:             { flex: 1, backgroundColor: COLORS.card, borderWidth: 1.5, borderColor: COLORS.cardBorder, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 13, fontSize: 15, color: COLORS.text },
  addBtn:            { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  addBtnText:        { fontSize: 24, color: '#fff', lineHeight: 28, fontWeight: '300' },
  modalOverlay:      { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'flex-end' },
  modalCard:         { backgroundColor: COLORS.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1.5, borderColor: COLORS.cardBorder, width: '100%', paddingBottom: 40 },
  modalHeader:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 24, paddingBottom: 16 },
  modalTitle:        { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 24, color: COLORS.text },
  modalClose:        { fontSize: 18, color: COLORS.textTertiary, padding: 4 },
  modalBody:         { alignItems: 'center', paddingHorizontal: 32, gap: 12 },
  modalEmoji:        { fontSize: 48 },
  modalHeading:      { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 20, color: COLORS.text, textAlign: 'center' },
  modalSub:          { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22 },
  modalBtn:          { backgroundColor: COLORS.blueLight, borderWidth: 1.5, borderColor: COLORS.blueBorder, borderRadius: 14, paddingHorizontal: 32, paddingVertical: 14, marginTop: 8 },
  modalBtnText:      { fontSize: 15, color: COLORS.blue, fontWeight: '600' },
});