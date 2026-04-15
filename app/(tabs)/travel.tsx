/**
 * travel.tsx — Zaeli Travel Channel
 * Ocean Cyan #A8D8F0 banner · Soft Mint #B8EDD0 AI colour · #0060A0 accent
 * Built: 31 March 2026
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, Animated, Modal, ActivityIndicator,
  SafeAreaView, StatusBar, Alert,
} from 'react-native';
import { router } from 'expo-router';
import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';
import { DMSerifDisplay_400Regular } from '@expo-google-fonts/dm-serif-display';
import { supabase } from '../../lib/supabase';
import { useChatPersistence } from '../../lib/use-chat-persistence';

// ─── Constants ────────────────────────────────────────────────────────────────

const FAMILY_ID   = '00000000-0000-0000-0000-000000000001';
const SONNET      = 'claude-sonnet-4-6';
const ANTHROPIC_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? '';

const TRAVEL_BANNER = '#A8D8F0';
const TRAVEL_AI     = '#B8EDD0';
const TRAVEL_ACCENT = '#0060A0';
const BODY_BG       = '#FAF8F5';
const CORAL         = '#FF4545';
const INK           = '#1A1A1A';
const INK2          = 'rgba(26,26,26,0.6)';
const INK3          = 'rgba(26,26,26,0.4)';
const INK4          = 'rgba(26,26,26,0.12)';

const FAMILY_COLOURS: Record<string, string> = {
  Rich:  '#4D8BFF',
  Anna:  '#FF7B6B',
  Poppy: '#A855F7',
  Gab:   '#22C55E',
  Duke:  '#F59E0B',
};
const FAMILY_MEMBERS = ['Rich', 'Anna', 'Poppy', 'Gab', 'Duke'];

// ─── Types ────────────────────────────────────────────────────────────────────

interface Trip {
  id: string;
  destination: string;
  country_emoji: string;
  depart_date: string;
  return_date: string;
  status: 'planning' | 'confirmed' | 'travelling' | 'done';
  members: string[];
  budget_set: number | null;
  budget_spent: number;
}

interface Booking {
  id: string;
  trip_id: string;
  category: 'flights' | 'accommodation' | 'transport' | 'activities' | 'other';
  title: string;
  booking_date: string | null;
  confirmation_number: string | null;
  provider: string | null;
  amount: number | null;
  notes: string | null;
}

interface PackingItem {
  id: string;
  trip_id: string;
  section: string; // 'shared' or member name
  name: string;
  quantity: number | null;
  packed: boolean;
}

interface TripNote {
  id: string;
  trip_id: string;
  content: string;
  tag: 'important' | 'idea' | 'question' | null;
  created_by: string | null;
  created_at: string;
}

interface Msg {
  id: string;
  role: 'user' | 'zaeli';
  text: string;
  ts?: string;
  isLoading?: boolean;
  quickReplies?: string[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid() { return Math.random().toString(36).slice(2); }

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T00:00:00');
  return Math.ceil((target.getTime() - today.getTime()) / 86400000);
}

function parseChips(text: string): { clean: string; chips: string[] } {
  const match = text.match(/\[chips:\s*([^\]]+)\]/i);
  if (!match) return { clean: text.trim(), chips: [] };
  const chips = match[1].split('|').map(c => c.trim()).filter(Boolean);
  return { clean: text.replace(match[0], '').trim(), chips };
}

function nowTs() {
  return new Date().toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function gradientForStatus(status: string): string[] {
  switch (status) {
    case 'confirmed':   return ['#A8D8F0', '#B8EDD0'];
    case 'planning':    return ['#FAC8A8', '#F0DC80'];
    case 'travelling':  return ['#A8E8CC', '#A8D8F0'];
    default:            return ['#D8CCFF', '#F0C8C0'];
  }
}

function statusLabel(status: string) {
  switch (status) {
    case 'planning':   return 'Planning';
    case 'confirmed':  return 'Confirmed';
    case 'travelling': return 'Travelling';
    default:           return 'Done';
  }
}

function statusBadgeStyle(status: string) {
  switch (status) {
    case 'confirmed':
    case 'travelling': return { bg: '#A8E8CC', color: '#0A6040' };
    case 'planning':   return { bg: '#F0DC80', color: '#806000' };
    default:           return { bg: INK4,      color: INK3 };
  }
}

// ─── Typing dots ──────────────────────────────────────────────────────────────

function TypingDots() {
  const anims = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];
  useEffect(() => {
    const loop = Animated.loop(Animated.stagger(180, anims.map(a =>
      Animated.sequence([
        Animated.timing(a, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(a, { toValue: 0, duration: 300, useNativeDriver: true }),
      ])
    )));
    loop.start();
    return () => loop.stop();
  }, []);
  return (
    <View style={{ flexDirection: 'row', gap: 4, paddingVertical: 4 }}>
      {anims.map((a, i) => (
        <Animated.View key={i} style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: TRAVEL_AI, opacity: a }} />
      ))}
    </View>
  );
}

// ─── Category config ──────────────────────────────────────────────────────────

const BOOKING_CATEGORIES = [
  { key: 'flights',       emoji: '✈️', label: 'Flights' },
  { key: 'accommodation', emoji: '🏨', label: 'Accommodation' },
  { key: 'transport',     emoji: '🚗', label: 'Transport' },
  { key: 'activities',    emoji: '🎯', label: 'Activities' },
  { key: 'other',         emoji: '📄', label: 'Other' },
];

const NOTE_TAG_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  important: { bg: 'rgba(240,200,192,0.5)', color: '#A01830', label: 'Important' },
  idea:      { bg: 'rgba(240,220,128,0.5)', color: '#806000', label: 'Idea' },
  question:  { bg: 'rgba(216,204,255,0.5)', color: '#5020C0', label: 'Question' },
};

// ─── Claude tool-calling ─────────────────────────────────────────────────────

const TRAVEL_TOOLS = [
  {
    name: 'add_packing_item',
    description: 'Add an item to the packing list for the current trip',
    input_schema: {
      type: 'object',
      properties: {
        section:  { type: 'string', description: "Either 'shared' or a family member name (Rich/Anna/Poppy/Gab/Duke)" },
        name:     { type: 'string', description: 'Item name' },
        quantity: { type: 'number', description: 'Optional quantity' },
      },
      required: ['section', 'name'],
    },
  },
  {
    name: 'tick_packing_item',
    description: 'Mark a packing item as packed or unpacked',
    input_schema: {
      type: 'object',
      properties: {
        item_id: { type: 'string', description: 'The UUID of the packing item' },
        packed:  { type: 'boolean', description: 'true to mark packed, false to unpack' },
      },
      required: ['item_id', 'packed'],
    },
  },
  {
    name: 'clear_packed_items',
    description: 'Remove all packed items from the packing list',
    input_schema: {
      type: 'object',
      properties: {
        trip_id: { type: 'string', description: 'The trip UUID' },
      },
      required: ['trip_id'],
    },
  },
  {
    name: 'add_trip_note',
    description: 'Add a note to the current trip',
    input_schema: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'Note content' },
        tag:     { type: 'string', enum: ['important', 'idea', 'question'], description: 'Optional tag' },
      },
      required: ['content'],
    },
  },
];

// ─── Main component ──────────────────────────────────────────────────────────

export default function TravelScreen() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold,
    DMSerifDisplay_400Regular,
  });

  // Chat persistence
  const { messages, setMessages, loaded: chatLoaded } = useChatPersistence('travel');

  // Data
  const [trips, setTrips] = useState<Trip[]>([]);
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [activeTripTab, setActiveTripTab] = useState<'overview' | 'bookings' | 'packing' | 'notes'>('overview');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [packingItems, setPackingItems] = useState<PackingItem[]>([]);
  const [tripNotes, setTripNotes] = useState<TripNote[]>([]);

  // Chat
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  // Scroll arrows
  const arrowOpacity = useRef(new Animated.Value(0)).current;
  const [showArrows, setShowArrows] = useState(false);

  // New trip sheet
  const [showNewTripSheet, setShowNewTripSheet] = useState(false);
  const [newDest, setNewDest] = useState('');
  const [newDepart, setNewDepart] = useState('');
  const [newReturn, setNewReturn] = useState('');
  const [newMembers, setNewMembers] = useState<string[]>(FAMILY_MEMBERS);
  const [newBudget, setNewBudget] = useState('');
  const [creatingTrip, setCreatingTrip] = useState(false);

  // Note quick-add
  const [noteInput, setNoteInput] = useState('');
  const [noteTag, setNoteTag] = useState<'important' | 'idea' | 'question' | null>(null);

  // Booking quick-add
  const [showAddBooking, setShowAddBooking] = useState(false);
  const [newBookingCat, setNewBookingCat] = useState<Booking['category']>('flights');
  const [newBookingTitle, setNewBookingTitle] = useState('');
  const [newBookingAmount, setNewBookingAmount] = useState('');
  const [newBookingConf, setNewBookingConf] = useState('');

  // ── Load trips ──────────────────────────────────────────────────────────────

  const loadTrips = useCallback(async () => {
    const { data } = await supabase
      .from('trips')
      .select('*')
      .eq('family_id', FAMILY_ID)
      .order('depart_date', { ascending: true });
    if (data) setTrips(data as Trip[]);
  }, []);

  const loadTripData = useCallback(async (tripId: string) => {
    const [bRes, pRes, nRes] = await Promise.all([
      supabase.from('trip_bookings').select('*').eq('trip_id', tripId).order('created_at'),
      supabase.from('trip_packing_items').select('*').eq('trip_id', tripId).order('created_at'),
      supabase.from('trip_notes').select('*').eq('trip_id', tripId).order('created_at', { ascending: false }),
    ]);
    if (bRes.data) setBookings(bRes.data as Booking[]);
    if (pRes.data) setPackingItems(pRes.data as PackingItem[]);
    if (nRes.data) setTripNotes(nRes.data as TripNote[]);
  }, []);

  useEffect(() => { loadTrips(); }, []);
  useEffect(() => { if (activeTrip) loadTripData(activeTrip.id); }, [activeTrip]);

  // ── Greeting ────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!chatLoaded || messages.length > 0) return;
    const upcoming = trips.filter(t => t.status !== 'done' && daysUntil(t.depart_date) > 0);
    let text = "No trips planned yet. Say the word and I'll help you start one.";
    if (upcoming.length > 0) {
      const next = upcoming[0];
      const days = daysUntil(next.depart_date);
      text = `${next.destination} is ${days} day${days !== 1 ? 's' : ''} away. Say the word and I'll help you get everything ready.`;
    }
    setMessages([{ id: uid(), role: 'zaeli', text, ts: nowTs(), quickReplies: ['New trip', 'Add a booking', 'Packing list'] }]);
  }, [chatLoaded, trips]);

  // ── Scroll arrows ───────────────────────────────────────────────────────────

  const showScrollArrows = useCallback(() => {
    setShowArrows(true);
    Animated.timing(arrowOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
  }, []);

  const hideScrollArrows = useCallback(() => {
    Animated.timing(arrowOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => setShowArrows(false));
  }, []);

  const handleScroll = useCallback((e: any) => {
    const { contentSize, layoutMeasurement, contentOffset } = e.nativeEvent;
    if (contentSize.height > layoutMeasurement.height + 50) showScrollArrows();
    else hideScrollArrows();
  }, []);

  // ── Claude tool execution ────────────────────────────────────────────────────

  async function executeTool(name: string, input: any): Promise<string> {
    if (!activeTrip) return 'No active trip selected.';

    if (name === 'add_packing_item') {
      const item: Partial<PackingItem> = {
        trip_id: activeTrip.id,
        section: input.section,
        name: input.name,
        quantity: input.quantity ?? null,
        packed: false,
      };
      const { data, error } = await supabase.from('trip_packing_items').insert({ ...item, family_id: FAMILY_ID }).select().single();
      if (error) return `Error: ${error.message}`;
      setPackingItems(prev => [...prev, data as PackingItem]);
      return `Added "${input.name}" to ${input.section === 'shared' ? 'the shared list' : `${input.section}'s list`}.`;
    }

    if (name === 'tick_packing_item') {
      const { error } = await supabase.from('trip_packing_items').update({ packed: input.packed }).eq('id', input.item_id);
      if (error) return `Error: ${error.message}`;
      setPackingItems(prev => prev.map(p => p.id === input.item_id ? { ...p, packed: input.packed } : p));
      return input.packed ? 'Marked as packed.' : 'Unmarked.';
    }

    if (name === 'clear_packed_items') {
      const { error } = await supabase.from('trip_packing_items').delete().eq('trip_id', activeTrip.id).eq('packed', true);
      if (error) return `Error: ${error.message}`;
      setPackingItems(prev => prev.filter(p => !p.packed));
      return 'Cleared all packed items.';
    }

    if (name === 'add_trip_note') {
      const note = { trip_id: activeTrip.id, family_id: FAMILY_ID, content: input.content, tag: input.tag ?? null, created_by: 'Rich' };
      const { data, error } = await supabase.from('trip_notes').insert(note).select().single();
      if (error) return `Error: ${error.message}`;
      setTripNotes(prev => [data as TripNote, ...prev]);
      return `Note added.`;
    }

    return 'Unknown tool.';
  }

  // ── Send message ─────────────────────────────────────────────────────────────

  async function sendMessage(text: string) {
    if (!text.trim() || isSending) return;
    setInputText('');
    setIsSending(true);

    const userMsg: Msg = { id: uid(), role: 'user', text: text.trim(), ts: nowTs() };
    const loadingMsg: Msg = { id: uid(), role: 'zaeli', text: '', isLoading: true };
    setMessages(prev => [...prev, userMsg, loadingMsg]);

    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      // Build context
      let context = `You are Zaeli, a warm and sharp AI assistant for an Australian family (Rich, Anna, Poppy age 12, Gab age 10, Duke age 8).
You are in the Travel channel. Never say "mate". Never start with "I". Plain text only. Always end on a confident offer.
Banned words: queued up, locked in, tidy, sorted, chaos.

Family member colours: Rich=#4D8BFF, Anna=#FF7B6B, Poppy=#A855F7, Gab=#22C55E, Duke=#F59E0B.

After your response, optionally append [chips: action1 | action2 | action3] for 2-3 relevant action chips.
Chips must be ACTIONS only — things you can DO. Never suggest displaying data already on screen.
Good chips: "Add a booking", "Add to packing", "Add a note", "Set budget".`;

      if (activeTrip) {
        const days = daysUntil(activeTrip.depart_date);
        context += `\n\nCurrent trip: ${activeTrip.destination}, departing ${formatDate(activeTrip.depart_date)}, returning ${formatDate(activeTrip.return_date)}. ${days > 0 ? `${days} days away.` : 'Currently travelling.'} Status: ${activeTrip.status}. Going: ${activeTrip.members.join(', ')}.`;
        if (activeTrip.budget_set) context += ` Budget: $${activeTrip.budget_set} set, $${activeTrip.budget_spent} spent.`;
        if (packingItems.length > 0) {
          const packed = packingItems.filter(p => p.packed).length;
          context += `\n\nPacking: ${packed}/${packingItems.length} items packed.`;
          const unpacked = packingItems.filter(p => !p.packed).map(p => `${p.name} (${p.section})`).slice(0, 10);
          if (unpacked.length) context += ` Still to pack: ${unpacked.join(', ')}.`;
        }
        if (bookings.length > 0) {
          context += `\n\nBookings: ${bookings.map(b => `${b.title} (${b.category}${b.amount ? `, $${b.amount}` : ''})`).join('; ')}.`;
        }
      } else if (trips.length > 0) {
        context += `\n\nTrips: ${trips.map(t => `${t.destination} (${t.status}, ${formatDate(t.depart_date)})`).join('; ')}.`;
      }

      const history = messages.filter(m => !m.isLoading).slice(-8).map(m => ({
        role: m.role === 'zaeli' ? 'assistant' : 'user',
        content: m.text,
      }));

      const body: any = {
        model: SONNET,
        max_tokens: 1024,
        system: context,
        messages: [...history, { role: 'user', content: text.trim() }],
      };

      if (activeTrip) body.tools = TRAVEL_TOOLS;

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      // Log tokens
      if (data.usage) {
        await supabase.from('api_logs').insert({
          family_id: FAMILY_ID,
          feature: 'travel_chat',
          model: SONNET,
          input_tokens: data.usage.input_tokens,
          output_tokens: data.usage.output_tokens,
          cost_usd: (data.usage.input_tokens / 1_000_000) * 3 + (data.usage.output_tokens / 1_000_000) * 15,
        });
      }

      // Handle tool calls
      let toolResults: string[] = [];
      let finalText = '';

      for (const block of data.content ?? []) {
        if (block.type === 'tool_use') {
          const result = await executeTool(block.name, block.input);
          toolResults.push(result);
        }
        if (block.type === 'text') {
          finalText += block.text;
        }
      }

      // If there were tool calls, do follow-up
      if (toolResults.length > 0 && !finalText) {
        const followUp = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': ANTHROPIC_KEY,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: SONNET,
            max_tokens: 512,
            system: context,
            messages: [
              ...history,
              { role: 'user', content: text.trim() },
              { role: 'assistant', content: data.content },
              { role: 'user', content: toolResults.map(r => ({ type: 'tool_result', content: r })) },
            ],
          }),
        });
        const followData = await followUp.json();
        for (const block of followData.content ?? []) {
          if (block.type === 'text') finalText += block.text;
        }
      }

      if (!finalText) finalText = toolResults.join(' ') || "Done.";

      const { clean, chips } = parseChips(finalText);

      setMessages(prev => prev.map(m =>
        m.isLoading ? { ...m, text: clean, isLoading: false, ts: nowTs(), quickReplies: chips.length ? chips : undefined } : m
      ));

    } catch (err) {
      setMessages(prev => prev.map(m =>
        m.isLoading ? { ...m, text: "Something went wrong. Try again.", isLoading: false, ts: nowTs() } : m
      ));
    } finally {
      setIsSending(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }

  // ── Create trip ──────────────────────────────────────────────────────────────

  async function createTrip() {
    if (!newDest.trim() || !newDepart.trim() || !newReturn.trim()) {
      Alert.alert('Missing info', 'Please fill in destination and dates.');
      return;
    }
    setCreatingTrip(true);
    try {
      const { data, error } = await supabase.from('trips').insert({
        family_id: FAMILY_ID,
        destination: newDest.trim(),
        country_emoji: '✈️',
        depart_date: newDepart.trim(),
        return_date: newReturn.trim(),
        status: 'planning',
        members: newMembers,
        budget_set: newBudget ? parseFloat(newBudget) : null,
        budget_spent: 0,
      }).select().single();

      if (error) throw error;
      setTrips(prev => [...prev, data as Trip]);
      setActiveTrip(data as Trip);
      setActiveTripTab('overview');
      setShowNewTripSheet(false);
      setNewDest(''); setNewDepart(''); setNewReturn(''); setNewBudget('');
      setNewMembers(FAMILY_MEMBERS);

      // Warm greeting for new trip
      setMessages(prev => [...prev, {
        id: uid(), role: 'zaeli',
        text: `${data.destination} is on. ${newMembers.length > 1 ? `${newMembers.length} of you going` : 'Just you'} — ${daysUntil(data.depart_date)} days away. Let's build this out. Add bookings, start the packing list, or jot down any ideas. Say the word.`,
        ts: nowTs(),
        quickReplies: ['Add a booking', 'Start packing list', 'Add a note'],
      }]);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setCreatingTrip(false);
    }
  }

  // ── Add booking ──────────────────────────────────────────────────────────────

  async function addBooking() {
    if (!activeTrip || !newBookingTitle.trim()) return;
    const { data, error } = await supabase.from('trip_bookings').insert({
      trip_id: activeTrip.id,
      family_id: FAMILY_ID,
      category: newBookingCat,
      title: newBookingTitle.trim(),
      amount: newBookingAmount ? parseFloat(newBookingAmount) : null,
      confirmation_number: newBookingConf.trim() || null,
    }).select().single();
    if (!error && data) {
      setBookings(prev => [...prev, data as Booking]);
      setNewBookingTitle(''); setNewBookingAmount(''); setNewBookingConf('');
      setShowAddBooking(false);
    }
  }

  // ── Add note (quick strip) ───────────────────────────────────────────────────

  async function addNote() {
    if (!activeTrip || !noteInput.trim()) return;
    const { data, error } = await supabase.from('trip_notes').insert({
      trip_id: activeTrip.id,
      family_id: FAMILY_ID,
      content: noteInput.trim(),
      tag: noteTag,
      created_by: 'Rich',
    }).select().single();
    if (!error && data) {
      setTripNotes(prev => [data as TripNote, ...prev]);
      setNoteInput(''); setNoteTag(null);
    }
  }

  // ── Toggle packing item ──────────────────────────────────────────────────────

  async function togglePacked(item: PackingItem) {
    const { error } = await supabase.from('trip_packing_items').update({ packed: !item.packed }).eq('id', item.id);
    if (!error) setPackingItems(prev => prev.map(p => p.id === item.id ? { ...p, packed: !p.packed } : p));
  }

  if (!fontsLoaded) return null;

  // ─── Render helpers ──────────────────────────────────────────────────────────

  function renderTripCard(trip: Trip) {
    const days = daysUntil(trip.depart_date);
    const badge = statusBadgeStyle(trip.status);
    const [c1, c2] = gradientForStatus(trip.status);
    const packedCount = trip.status !== 'done' ? packingItems.filter(p => p.trip_id === trip.id && p.packed).length : 0;
    const totalCount  = trip.status !== 'done' ? packingItems.filter(p => p.trip_id === trip.id).length : 0;

    return (
      <TouchableOpacity key={trip.id} style={s.tripCard} onPress={() => { setActiveTrip(trip); setActiveTripTab('overview'); }}>
        {/* Header gradient */}
        <View style={[s.tripCardHeader, { backgroundColor: c1 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={{ fontSize: 26 }}>{trip.country_emoji}</Text>
            <View>
              <Text style={s.tripDest}>{trip.destination}</Text>
              <Text style={s.tripDestSub}>{trip.members.join(', ')}</Text>
            </View>
          </View>
          <View style={[s.statusBadge, { backgroundColor: badge.bg }]}>
            <Text style={[s.statusBadgeText, { color: badge.color }]}>{statusLabel(trip.status)}</Text>
          </View>
        </View>
        {/* Footer */}
        <View style={s.tripCardFooter}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={s.tripDates}>{formatDate(trip.depart_date)} – {formatDate(trip.return_date)}</Text>
            <View style={{ flexDirection: 'row' }}>
              {trip.members.slice(0, 5).map((m, i) => (
                <View key={m} style={[s.miniAvatar, { backgroundColor: FAMILY_COLOURS[m] ?? '#888', marginLeft: i === 0 ? 0 : -5 }]}>
                  <Text style={s.miniAvatarText}>{m[0]}</Text>
                </View>
              ))}
            </View>
          </View>
          {trip.status !== 'done' && days > 0 && (
            <Text style={s.tripCountdown}>🗓 {days} day{days !== 1 ? 's' : ''} to go</Text>
          )}
          {totalCount > 0 && (
            <View style={s.progressRow}>
              <View style={s.progressTrack}><View style={[s.progressFill, { width: `${Math.round((packedCount / totalCount) * 100)}%` as any }]} /></View>
              <Text style={s.progressLabel}>Packing {Math.round((packedCount / totalCount) * 100)}%</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  function renderMsg(msg: Msg) {
    if (msg.role === 'user') {
      return (
        <View key={msg.id} style={s.userMsgWrap}>
          <View style={s.userBubble}><Text style={s.userText}>{msg.text}</Text></View>
          <Text style={s.msgTime}>{msg.ts}</Text>
        </View>
      );
    }
    return (
      <View key={msg.id} style={s.zaeliMsgWrap}>
        <View style={s.zaeliEyebrow}>
          <View style={s.zaeliStar}><Text style={{ fontSize: 9, color: INK }}>✦</Text></View>
          <Text style={s.zaeliName}>Zaeli</Text>
          {msg.ts && <Text style={s.zaeliTime}>{msg.ts}</Text>}
        </View>
        {msg.isLoading ? <TypingDots /> : <Text style={s.zaeliBody}>{msg.text}</Text>}
        {!msg.isLoading && msg.quickReplies && msg.quickReplies.length > 0 && (
          <View style={s.chipsRow}>
            {msg.quickReplies.map(c => (
              <TouchableOpacity key={c} style={s.chip} onPress={() => sendMessage(c)}>
                <Text style={s.chipText}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  }

  function renderPackingSection(section: string) {
    const items = packingItems.filter(p => p.section === section);
    const packed = items.filter(i => i.packed).length;
    const emoji = section === 'shared' ? '🌍' : undefined;
    const color = section === 'shared' ? TRAVEL_AI : (FAMILY_COLOURS[section] ?? '#888');

    return (
      <View key={section}>
        <View style={s.packingSectionHeader}>
          {emoji ? (
            <View style={[s.packingSectionIcon, { backgroundColor: 'rgba(168,216,240,0.3)' }]}>
              <Text style={{ fontSize: 13 }}>{emoji}</Text>
            </View>
          ) : (
            <View style={[s.packingMemberDot, { backgroundColor: color }]} />
          )}
          <Text style={s.packingSectionTitle}>{section === 'shared' ? 'Shared' : section}</Text>
          <Text style={s.packingSectionCount}>{packed} / {items.length} packed</Text>
        </View>
        <View style={s.packingCard}>
          {items.map((item, idx) => (
            <TouchableOpacity key={item.id} style={[s.packItem, idx === items.length - 1 && { borderBottomWidth: 0 }]} onPress={() => togglePacked(item)}>
              <View style={[s.packCircle, item.packed && s.packCircleTicked]}>
                {item.packed && <Text style={{ fontSize: 10, color: '#0A6040' }}>✓</Text>}
              </View>
              <Text style={[s.packName, item.packed && s.packNameTicked]}>{item.name}</Text>
              {item.quantity && <View style={s.packQtyBadge}><Text style={s.packQtyText}>×{item.quantity}</Text></View>}
            </TouchableOpacity>
          ))}
          {items.length === 0 && (
            <Text style={{ padding: 12, fontSize: 13, color: INK3, fontFamily: 'Poppins_400Regular' }}>Nothing added yet</Text>
          )}
        </View>
      </View>
    );
  }

  // ── Upcoming / past split ────────────────────────────────────────────────────

  const upcomingTrips = trips.filter(t => t.status !== 'done' || daysUntil(t.return_date) >= 0);
  const pastTrips     = trips.filter(t => t.status === 'done' && daysUntil(t.return_date) < 0);

  // ─── Main render ──────────────────────────────────────────────────────────────

  return (
    <View style={{ flex: 1, backgroundColor: TRAVEL_BANNER }}>
      <StatusBar barStyle="dark-content" backgroundColor={TRAVEL_BANNER} />
      <SafeAreaView edges={['top']} style={{ backgroundColor: TRAVEL_BANNER }}>

        {/* Banner */}
        <View style={s.banner}>
          <View style={s.bannerRow}>
            <TouchableOpacity onPress={() => { if (activeTrip) { setActiveTrip(null); } else { router.navigate('/(tabs)/'); } }}>
              <Text style={s.wordmark}>
                Z<Text style={s.aiLetter}>a</Text>el<Text style={s.aiLetter}>i</Text>
              </Text>
            </TouchableOpacity>
            <View style={s.avatarCircle}><Text style={s.avatarText}>R</Text></View>
          </View>
          {activeTrip ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TouchableOpacity onPress={() => setActiveTrip(null)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={{ fontSize: 16 }}>←</Text>
                <Text style={[s.channelLabel, { color: TRAVEL_ACCENT }]}>Travel</Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 22 }}>{activeTrip.country_emoji}</Text>
              <Text style={s.wordmarkSmall}>{activeTrip.destination}</Text>
            </View>
          ) : (
            <Text style={s.channelLabel}>Travel</Text>
          )}
        </View>

      </SafeAreaView>

      {/* Trip tabs (inside trip only) */}
      {activeTrip && (
        <View style={s.tripTabs}>
          {(['overview', 'bookings', 'packing', 'notes'] as const).map(tab => (
            <TouchableOpacity key={tab} style={s.tripTabBtn} onPress={() => setActiveTripTab(tab)}>
              <Text style={[s.tripTabText, activeTripTab === tab && s.tripTabActive]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
              {activeTripTab === tab && <View style={s.tripTabUnderline} />}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Body */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }} keyboardVerticalOffset={0}>
        <View style={{ flex: 1, position: 'relative' }}>

          {/* ── Main channel / trip stack ── */}
          {!activeTrip && (
            <ScrollView
              ref={scrollRef}
              style={{ flex: 1, backgroundColor: BODY_BG }}
              contentContainerStyle={{ paddingBottom: 120 }}
              onScroll={handleScroll}
              scrollEventThrottle={16}
            >
              {/* Zaeli chat messages */}
              <View style={{ paddingTop: 4 }}>
                {messages.map(renderMsg)}
              </View>

              {/* Upcoming trips */}
              {upcomingTrips.length > 0 && (
                <View style={s.stackSection}>
                  <Text style={s.sectionEyebrow}>✈️  Upcoming</Text>
                  {upcomingTrips.map(renderTripCard)}
                </View>
              )}

              {/* New trip button */}
              <TouchableOpacity style={s.newTripBtn} onPress={() => setShowNewTripSheet(true)}>
                <Text style={s.newTripPlus}>+</Text>
                <Text style={s.newTripLabel}>Plan a new trip</Text>
              </TouchableOpacity>

              {/* Past trips */}
              {pastTrips.length > 0 && (
                <View style={s.stackSection}>
                  <Text style={s.sectionEyebrow}>📷  Past trips</Text>
                  {pastTrips.map(renderTripCard)}
                </View>
              )}

              {trips.length === 0 && (
                <View style={{ padding: 32, alignItems: 'center' }}>
                  <Text style={{ fontSize: 40, marginBottom: 12 }}>✈️</Text>
                  <Text style={{ fontFamily: 'DMSerifDisplay_400Regular', fontSize: 22, color: INK, marginBottom: 6 }}>No trips yet</Text>
                  <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 14, color: INK3, textAlign: 'center' }}>Tap the button above to start planning your first trip.</Text>
                </View>
              )}
            </ScrollView>
          )}

          {/* ── Inside trip ── */}
          {activeTrip && (
            <ScrollView
              ref={scrollRef}
              style={{ flex: 1, backgroundColor: BODY_BG }}
              contentContainerStyle={{ paddingBottom: 120 }}
              onScroll={handleScroll}
              scrollEventThrottle={16}
            >

              {/* ── Overview tab ── */}
              {activeTripTab === 'overview' && (
                <View>
                  {/* Who's going */}
                  <View style={s.sectionCard}>
                    <Text style={s.sectionCardTitle}>Who's going</Text>
                    <View style={{ flexDirection: 'row', gap: 14 }}>
                      {activeTrip.members.map(m => (
                        <View key={m} style={{ alignItems: 'center', gap: 4 }}>
                          <View style={[s.memberAvatar, { backgroundColor: FAMILY_COLOURS[m] ?? '#888' }]}>
                            <Text style={s.memberAvatarText}>{m[0]}</Text>
                          </View>
                          <Text style={s.memberName}>{m}</Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  {/* Budget card */}
                  {activeTrip.budget_set && (
                    <View style={s.budgetCard}>
                      <Text style={s.budgetTitle}>💰 Budget</Text>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                        <View>
                          <Text style={s.budgetAmount}>${activeTrip.budget_set.toLocaleString()}</Text>
                          <Text style={s.budgetLabel}>total budget</Text>
                        </View>
                        <View style={[s.statusBadge, { backgroundColor: '#A8E8CC', position: 'relative', top: 0, right: 0 }]}>
                          <Text style={[s.statusBadgeText, { color: '#0A6040' }]}>On track</Text>
                        </View>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 24, marginTop: 10 }}>
                        <View>
                          <Text style={[s.budgetColVal]}>${activeTrip.budget_spent.toLocaleString()}</Text>
                          <Text style={s.budgetColLbl}>Spent / booked</Text>
                        </View>
                        <View>
                          <Text style={[s.budgetColVal, { color: '#0A6040' }]}>${(activeTrip.budget_set - activeTrip.budget_spent).toLocaleString()}</Text>
                          <Text style={s.budgetColLbl}>Remaining</Text>
                        </View>
                      </View>
                      <View style={s.budgetTrack}>
                        <View style={[s.budgetFill, { width: `${Math.min(100, Math.round((activeTrip.budget_spent / activeTrip.budget_set) * 100))}%` as any }]} />
                      </View>
                    </View>
                  )}

                  {/* Bookings quick view */}
                  <View style={s.sectionCard}>
                    <Text style={s.sectionCardTitle}>Bookings</Text>
                    {BOOKING_CATEGORIES.map(cat => {
                      const catBookings = bookings.filter(b => b.category === cat.key);
                      return (
                        <View key={cat.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                          <Text style={{ fontSize: 16 }}>{cat.emoji}</Text>
                          <Text style={{ flex: 1, fontFamily: 'Poppins_500Medium', fontSize: 14, color: INK }}>{cat.label}</Text>
                          {catBookings.length > 0
                            ? <View style={[s.statusBadge, { backgroundColor: '#A8E8CC', position: 'relative', top: 0, right: 0 }]}><Text style={[s.statusBadgeText, { color: '#0A6040' }]}>✓ {catBookings.length}</Text></View>
                            : <View style={[s.statusBadge, { backgroundColor: 'rgba(240,200,192,0.5)', position: 'relative', top: 0, right: 0 }]}><Text style={[s.statusBadgeText, { color: '#A01830' }]}>Needed</Text></View>
                          }
                        </View>
                      );
                    })}
                  </View>

                  {/* Zaeli insight */}
                  {messages.length > 0 && (
                    <View style={s.insightCard}>
                      <View style={s.insightStar}><Text style={{ fontSize: 9 }}>✦</Text></View>
                      <Text style={s.insightText}>
                        {(() => {
                          const unbooked = BOOKING_CATEGORIES.filter(c => bookings.filter(b => b.category === c.key).length === 0);
                          if (unbooked.length === 0) return "All booking categories covered. Looking solid.";
                          return `${unbooked.map(c => c.label).join(' and ')} ${unbooked.length === 1 ? 'is' : 'are'} still open — say the word and I'll help fill those in.`;
                        })()}
                      </Text>
                    </View>
                  )}

                  {/* Chat thread */}
                  <View style={{ paddingTop: 8 }}>
                    {messages.map(renderMsg)}
                  </View>
                </View>
              )}

              {/* ── Bookings tab ── */}
              {activeTripTab === 'bookings' && (
                <View style={{ padding: 16 }}>
                  {BOOKING_CATEGORIES.map(cat => {
                    const catBookings = bookings.filter(b => b.category === cat.key);
                    return (
                      <View key={cat.key}>
                        <View style={s.bookingCatHeader}>
                          <Text style={{ fontSize: 16 }}>{cat.emoji}</Text>
                          <Text style={s.bookingCatLabel}>{cat.label}</Text>
                          {catBookings.length === 0
                            ? <View style={[s.statusBadge, { backgroundColor: 'rgba(240,200,192,0.4)', position: 'relative', top: 0, right: 0, marginLeft: 'auto' }]}><Text style={[s.statusBadgeText, { color: '#A01830' }]}>Needed</Text></View>
                            : <Text style={s.bookingCatCount}>{catBookings.length} booking{catBookings.length !== 1 ? 's' : ''}</Text>
                          }
                        </View>
                        {catBookings.map(b => (
                          <View key={b.id} style={s.bookingCard}>
                            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                              <View style={{ flex: 1 }}>
                                <Text style={s.bookingTitle}>{b.title}</Text>
                                {b.booking_date && <Text style={s.bookingDetail}>{formatDate(b.booking_date)}</Text>}
                                {b.notes && <Text style={s.bookingDetail}>{b.notes}</Text>}
                                {b.confirmation_number && (
                                  <View style={s.confBadge}><Text style={s.confBadgeText}>✓ {b.confirmation_number}</Text></View>
                                )}
                              </View>
                              {b.amount && <Text style={s.bookingAmount}>${b.amount.toLocaleString()}</Text>}
                            </View>
                          </View>
                        ))}
                        <TouchableOpacity style={s.addBookingBtn} onPress={() => { setNewBookingCat(cat.key as Booking['category']); setShowAddBooking(true); }}>
                          <Text style={{ fontSize: 16, color: INK3 }}>+</Text>
                          <Text style={s.addBookingLabel}>Add {cat.label.toLowerCase()} booking</Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })}

                  {/* Scan / paste strip */}
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                    <View style={s.scanBtn}>
                      <Text style={{ fontSize: 14 }}>📷</Text>
                      <Text style={[s.scanBtnText, { color: TRAVEL_ACCENT }]}>Scan confirmation</Text>
                    </View>
                    <View style={[s.scanBtn, { backgroundColor: 'rgba(184,237,208,0.3)' }]}>
                      <Text style={{ fontSize: 14 }}>📋</Text>
                      <Text style={[s.scanBtnText, { color: '#0A6040' }]}>Paste text</Text>
                    </View>
                  </View>

                  {/* Chat */}
                  <View style={{ paddingTop: 8 }}>
                    {messages.map(renderMsg)}
                  </View>
                </View>
              )}

              {/* ── Packing tab ── */}
              {activeTripTab === 'packing' && (
                <View>
                  <View style={s.packingHeader}>
                    <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: INK }}>Packing list</Text>
                    <View style={s.packingProgressPill}>
                      <Text style={s.packingProgressText}>
                        {packingItems.filter(p => p.packed).length} / {packingItems.length} packed
                      </Text>
                    </View>
                  </View>

                  {renderPackingSection('shared')}
                  {activeTrip.members.map(m => renderPackingSection(m))}

                  {/* Chat */}
                  <View style={{ paddingTop: 8 }}>
                    {messages.map(renderMsg)}
                  </View>
                </View>
              )}

              {/* ── Notes tab ── */}
              {activeTripTab === 'notes' && (
                <View>
                  {/* Quick add strip */}
                  <View style={s.noteAddStrip}>
                    <TextInput
                      style={s.noteAddInput}
                      placeholder="Jot something down..."
                      placeholderTextColor={INK3}
                      value={noteInput}
                      onChangeText={setNoteInput}
                      multiline
                    />
                    <TouchableOpacity style={s.noteAddSend} onPress={addNote}>
                      <Text style={{ fontSize: 12, color: 'white' }}>↑</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Tag selector */}
                  <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 12 }}>
                    {(['important', 'idea', 'question'] as const).map(tag => {
                      const ts = NOTE_TAG_STYLES[tag];
                      return (
                        <TouchableOpacity
                          key={tag}
                          style={[s.noteTagPill, { backgroundColor: ts.bg }, noteTag === tag && { borderWidth: 1.5, borderColor: ts.color }]}
                          onPress={() => setNoteTag(noteTag === tag ? null : tag)}
                        >
                          <Text style={[s.noteTagText, { color: ts.color }]}>{ts.label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Notes list */}
                  {tripNotes.map(note => {
                    const ts = note.tag ? NOTE_TAG_STYLES[note.tag] : null;
                    const authorColor = note.created_by ? FAMILY_COLOURS[note.created_by] : INK3;
                    return (
                      <View key={note.id} style={s.noteCard}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                          {ts && (
                            <View style={[s.noteTag, { backgroundColor: ts.bg }]}>
                              <Text style={[s.noteTagText, { color: ts.color }]}>{ts.label}</Text>
                            </View>
                          )}
                          <Text style={[s.noteTime, { marginLeft: ts ? 'auto' : 0 }]}>
                            {new Date(note.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                          </Text>
                        </View>
                        <Text style={s.noteBody}>{note.content}</Text>
                        {note.created_by && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 7 }}>
                            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: authorColor }} />
                            <Text style={s.noteAuthor}>{note.created_by} added</Text>
                          </View>
                        )}
                      </View>
                    );
                  })}

                  {tripNotes.length === 0 && (
                    <Text style={{ padding: 24, textAlign: 'center', fontFamily: 'Poppins_400Regular', fontSize: 14, color: INK3 }}>
                      No notes yet. Jot down ideas, important details, or questions above.
                    </Text>
                  )}

                  {/* Chat */}
                  <View style={{ paddingTop: 8 }}>
                    {messages.map(renderMsg)}
                  </View>
                </View>
              )}

            </ScrollView>
          )}

          {/* Scroll arrows */}
          {showArrows && (
            <Animated.View style={[s.scrollArrowPair, { opacity: arrowOpacity }]}>
              <TouchableOpacity style={s.scrollArrowBtn} onPress={() => scrollRef.current?.scrollTo({ y: 0, animated: true })}>
                <Text style={{ color: 'white', fontSize: 16 }}>↑</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.scrollArrowBtn} onPress={() => scrollRef.current?.scrollToEnd({ animated: true })}>
                <Text style={{ color: 'white', fontSize: 16 }}>↓</Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* Chat bar */}
          <View style={s.inputArea}>
            <View style={s.barPill}>
              <TouchableOpacity style={s.barBtn} onPress={() => setShowNewTripSheet(true)}>
                <Text style={{ fontSize: 20, color: 'rgba(0,0,0,0.4)' }}>+</Text>
              </TouchableOpacity>
              <View style={s.barSep} />
              <TextInput
                style={s.barInput}
                placeholder={activeTrip ? "Ask about this trip..." : "Ask Zaeli about your trips..."}
                placeholderTextColor={INK3}
                value={inputText}
                onChangeText={setInputText}
                onSubmitEditing={() => sendMessage(inputText)}
                multiline
                maxHeight={100}
              />
              <TouchableOpacity style={s.barMic}>
                <Text style={{ fontSize: 16 }}>🎤</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.barSend} onPress={() => sendMessage(inputText)} disabled={isSending}>
                {isSending
                  ? <ActivityIndicator size="small" color="white" />
                  : <Text style={{ color: 'white', fontSize: 14 }}>↑</Text>
                }
              </TouchableOpacity>
            </View>
          </View>

        </View>
      </KeyboardAvoidingView>

      {/* ── New trip sheet ── */}
      <Modal visible={showNewTripSheet} transparent animationType="slide">
        <View style={s.sheetOverlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowNewTripSheet(false)} />
          <View style={s.sheet}>
            <View style={s.sheetHandle} />
            <Text style={s.sheetTitle}>Plan a new trip ✈️</Text>
            <Text style={s.sheetSub}>Where are you heading?</Text>

            <Text style={s.fieldLabel}>Destination</Text>
            <TextInput style={s.fieldInput} placeholder="e.g. Bali, Indonesia" placeholderTextColor={INK3} value={newDest} onChangeText={setNewDest} />

            <Text style={s.fieldLabel}>Dates</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
              <View style={{ flex: 1 }}>
                <Text style={[s.fieldLabel, { marginBottom: 3 }]}>Depart (YYYY-MM-DD)</Text>
                <TextInput style={s.fieldInput} placeholder="2026-04-18" placeholderTextColor={INK3} value={newDepart} onChangeText={setNewDepart} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.fieldLabel, { marginBottom: 3 }]}>Return</Text>
                <TextInput style={s.fieldInput} placeholder="2026-04-28" placeholderTextColor={INK3} value={newReturn} onChangeText={setNewReturn} />
              </View>
            </View>

            <Text style={s.fieldLabel}>Budget (optional)</Text>
            <TextInput style={[s.fieldInput, { marginBottom: 14 }]} placeholder="e.g. 8500" placeholderTextColor={INK3} value={newBudget} onChangeText={setNewBudget} keyboardType="numeric" />

            <Text style={s.fieldLabel}>Who's going?</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
              {FAMILY_MEMBERS.map(m => {
                const selected = newMembers.includes(m);
                const color = FAMILY_COLOURS[m];
                return (
                  <TouchableOpacity
                    key={m}
                    style={[s.whoPill, selected && { borderColor: color, borderWidth: 2, backgroundColor: `${color}18` }]}
                    onPress={() => setNewMembers(prev => selected ? prev.filter(x => x !== m) : [...prev, m])}
                  >
                    <View style={[s.whoPip, { backgroundColor: color }]} />
                    <Text style={[s.whoName, { color: selected ? color : INK3 }]}>{m}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity style={s.sheetBtn} onPress={createTrip} disabled={creatingTrip}>
              {creatingTrip
                ? <ActivityIndicator color="white" />
                : <Text style={s.sheetBtnText}>Create trip</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Add booking modal ── */}
      <Modal visible={showAddBooking} transparent animationType="slide">
        <View style={s.sheetOverlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowAddBooking(false)} />
          <View style={s.sheet}>
            <View style={s.sheetHandle} />
            <Text style={s.sheetTitle}>Add booking</Text>

            <Text style={s.fieldLabel}>Category</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
              {BOOKING_CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat.key}
                  style={[s.whoPill, newBookingCat === cat.key && { borderWidth: 2, borderColor: TRAVEL_ACCENT, backgroundColor: 'rgba(0,96,160,0.08)' }]}
                  onPress={() => setNewBookingCat(cat.key as Booking['category'])}
                >
                  <Text style={{ fontSize: 14 }}>{cat.emoji}</Text>
                  <Text style={[s.whoName, { color: newBookingCat === cat.key ? TRAVEL_ACCENT : INK3 }]}>{cat.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.fieldLabel}>Title</Text>
            <TextInput style={s.fieldInput} placeholder="e.g. Jetstar JQ107 BNE→DPS" placeholderTextColor={INK3} value={newBookingTitle} onChangeText={setNewBookingTitle} />

            <Text style={s.fieldLabel}>Amount (optional)</Text>
            <TextInput style={s.fieldInput} placeholder="e.g. 2140" placeholderTextColor={INK3} value={newBookingAmount} onChangeText={setNewBookingAmount} keyboardType="numeric" />

            <Text style={s.fieldLabel}>Confirmation number (optional)</Text>
            <TextInput style={[s.fieldInput, { marginBottom: 20 }]} placeholder="e.g. QF-JQ-884921" placeholderTextColor={INK3} value={newBookingConf} onChangeText={setNewBookingConf} />

            <TouchableOpacity style={s.sheetBtn} onPress={addBooking}>
              <Text style={s.sheetBtnText}>Add booking</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  // Banner
  banner:        { paddingHorizontal: 16, paddingBottom: 14, paddingTop: 10 },
  bannerRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  wordmark:      { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 40, letterSpacing: -1.5, lineHeight: 44, color: INK },
  wordmarkSmall: { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 22, letterSpacing: -0.8, color: INK },
  aiLetter:      { color: TRAVEL_AI },
  channelLabel:  { fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: 'rgba(0,0,0,0.45)' },
  avatarCircle:  { width: 32, height: 32, borderRadius: 16, backgroundColor: '#4D8BFF', justifyContent: 'center', alignItems: 'center' },
  avatarText:    { fontFamily: 'Poppins_700Bold', fontSize: 12, color: 'white' },

  // Trip tabs (inside trip)
  tripTabs:       { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: INK4, backgroundColor: 'white' },
  tripTabBtn:     { flex: 1, paddingVertical: 11, alignItems: 'center', position: 'relative' },
  tripTabText:    { fontFamily: 'Poppins_600SemiBold', fontSize: 12, color: INK3 },
  tripTabActive:  { color: TRAVEL_ACCENT },
  tripTabUnderline: { position: 'absolute', bottom: 0, left: 8, right: 8, height: 2, backgroundColor: TRAVEL_ACCENT, borderRadius: 1 },

  // Chat
  zaeliMsgWrap:  { padding: 12, paddingHorizontal: 16 },
  zaeliEyebrow:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 5 },
  zaeliStar:     { width: 16, height: 16, borderRadius: 5, backgroundColor: TRAVEL_AI, justifyContent: 'center', alignItems: 'center' },
  zaeliName:     { fontFamily: 'Poppins_700Bold', fontSize: 10, color: '#3AA870' },
  zaeliTime:     { fontFamily: 'Poppins_400Regular', fontSize: 9, color: INK3, marginLeft: 'auto' },
  zaeliBody:     { fontFamily: 'Poppins_400Regular', fontSize: 17, lineHeight: 27, letterSpacing: -0.1, color: INK },
  chipsRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  chip:          { borderWidth: 1.5, borderColor: INK4, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, backgroundColor: 'white' },
  chipText:      { fontFamily: 'Poppins_400Regular', fontSize: 12, color: INK2 },
  userMsgWrap:   { paddingHorizontal: 16, paddingVertical: 8, alignItems: 'flex-end' },
  userBubble:    { backgroundColor: '#F2F2F2', borderRadius: 18, borderBottomRightRadius: 2, paddingHorizontal: 14, paddingVertical: 10, maxWidth: '80%' },
  userText:      { fontFamily: 'Poppins_400Regular', fontSize: 15, color: INK },
  msgTime:       { fontFamily: 'Poppins_400Regular', fontSize: 9, color: INK3, marginTop: 3 },

  // Trip stack
  stackSection:  { paddingHorizontal: 16, paddingTop: 16 },
  sectionEyebrow:{ fontFamily: 'Poppins_700Bold', fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', color: INK3, marginBottom: 10 },
  tripCard:      { borderRadius: 18, overflow: 'hidden', marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  tripCardHeader:{ padding: 14, position: 'relative' },
  tripDest:      { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 24, color: INK, lineHeight: 28 },
  tripDestSub:   { fontFamily: 'Poppins_500Medium', fontSize: 11, color: INK2, marginTop: 1 },
  statusBadge:   { position: 'absolute', top: 14, right: 14, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  statusBadgeText:{ fontFamily: 'Poppins_700Bold', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  tripCardFooter:{ backgroundColor: 'white', padding: 12, paddingHorizontal: 14 },
  tripDates:     { fontFamily: 'Poppins_500Medium', fontSize: 12, color: INK2 },
  miniAvatar:    { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: 'white', justifyContent: 'center', alignItems: 'center' },
  miniAvatarText:{ fontFamily: 'Poppins_700Bold', fontSize: 9, color: 'white' },
  tripCountdown: { fontFamily: 'Poppins_600SemiBold', fontSize: 11, color: TRAVEL_ACCENT, marginTop: 4 },
  progressRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  progressTrack: { flex: 1, height: 4, backgroundColor: INK4, borderRadius: 2, overflow: 'hidden' },
  progressFill:  { height: '100%', borderRadius: 2, backgroundColor: TRAVEL_AI },
  progressLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 10, color: INK3 },
  newTripBtn:    { margin: 16, marginTop: 4, borderWidth: 1.5, borderStyle: 'dashed', borderColor: 'rgba(0,96,160,0.3)', borderRadius: 18, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(168,216,240,0.12)' },
  newTripPlus:   { fontSize: 18, color: TRAVEL_ACCENT },
  newTripLabel:  { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: TRAVEL_ACCENT },

  // Overview
  sectionCard:   { margin: 12, marginHorizontal: 16, backgroundColor: 'white', borderRadius: 16, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  sectionCardTitle:{ fontFamily: 'Poppins_700Bold', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: INK3, marginBottom: 10 },
  memberAvatar:  { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  memberAvatarText:{ fontFamily: 'Poppins_700Bold', fontSize: 13, color: 'white' },
  memberName:    { fontFamily: 'Poppins_600SemiBold', fontSize: 10, color: INK2 },
  budgetCard:    { margin: 12, marginHorizontal: 16, backgroundColor: TRAVEL_BANNER, borderRadius: 16, padding: 14 },
  budgetTitle:   { fontFamily: 'Poppins_700Bold', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: 'rgba(0,0,0,0.45)', marginBottom: 8 },
  budgetAmount:  { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 30, color: INK, lineHeight: 32 },
  budgetLabel:   { fontFamily: 'Poppins_500Medium', fontSize: 11, color: INK2 },
  budgetColVal:  { fontFamily: 'Poppins_700Bold', fontSize: 16, color: INK },
  budgetColLbl:  { fontFamily: 'Poppins_500Medium', fontSize: 10, color: INK2 },
  budgetTrack:   { marginTop: 10, height: 6, backgroundColor: 'rgba(0,0,0,0.12)', borderRadius: 3, overflow: 'hidden' },
  budgetFill:    { height: '100%', borderRadius: 3, backgroundColor: TRAVEL_ACCENT },
  insightCard:   { margin: 12, marginHorizontal: 16, backgroundColor: 'rgba(184,237,208,0.3)', borderRadius: 12, padding: 10, flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  insightStar:   { width: 20, height: 20, borderRadius: 6, backgroundColor: TRAVEL_AI, justifyContent: 'center', alignItems: 'center', flexShrink: 0, marginTop: 1 },
  insightText:   { fontFamily: 'Poppins_400Regular', fontSize: 13, lineHeight: 19, color: INK2, flex: 1 },

  // Bookings
  bookingCatHeader:{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8, marginTop: 12 },
  bookingCatLabel: { fontFamily: 'Poppins_700Bold', fontSize: 12, color: INK2, textTransform: 'uppercase', letterSpacing: 0.8 },
  bookingCatCount: { fontFamily: 'Poppins_600SemiBold', fontSize: 10, color: INK3, marginLeft: 'auto' },
  bookingCard:   { backgroundColor: 'white', borderRadius: 14, padding: 12, marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 },
  bookingTitle:  { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: INK, lineHeight: 20 },
  bookingDetail: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: INK3, marginTop: 2 },
  bookingAmount: { fontFamily: 'Poppins_700Bold', fontSize: 14, color: TRAVEL_ACCENT, marginLeft: 8 },
  confBadge:     { backgroundColor: 'rgba(168,232,204,0.3)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start', marginTop: 6 },
  confBadgeText: { fontFamily: 'Poppins_600SemiBold', fontSize: 10, color: '#0A6040' },
  addBookingBtn: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: INK4, borderRadius: 14, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8, backgroundColor: 'rgba(0,0,0,0.02)' },
  addBookingLabel:{ fontFamily: 'Poppins_500Medium', fontSize: 13, color: INK3 },
  scanBtn:       { flex: 1, backgroundColor: 'rgba(168,216,240,0.25)', borderRadius: 12, padding: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  scanBtnText:   { fontFamily: 'Poppins_600SemiBold', fontSize: 12 },

  // Packing
  packingHeader:       { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  packingProgressPill: { backgroundColor: TRAVEL_AI, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  packingProgressText: { fontFamily: 'Poppins_700Bold', fontSize: 12, color: '#0A6040' },
  packingSectionHeader:{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6, flexDirection: 'row', alignItems: 'center', gap: 8 },
  packingSectionIcon:  { width: 26, height: 26, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  packingMemberDot:    { width: 10, height: 10, borderRadius: 5 },
  packingSectionTitle: { fontFamily: 'Poppins_700Bold', fontSize: 13, color: INK },
  packingSectionCount: { fontFamily: 'Poppins_600SemiBold', fontSize: 11, color: INK3, marginLeft: 'auto' },
  packingCard:   { marginHorizontal: 16, backgroundColor: 'white', borderRadius: 14, overflow: 'hidden', marginBottom: 8 },
  packItem:      { paddingVertical: 9, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.04)' },
  packCircle:    { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: 'rgba(0,0,0,0.18)', justifyContent: 'center', alignItems: 'center' },
  packCircleTicked:{ backgroundColor: TRAVEL_AI, borderColor: TRAVEL_AI },
  packName:      { fontFamily: 'Poppins_400Regular', fontSize: 15, color: INK, flex: 1 },
  packNameTicked:{ textDecorationLine: 'line-through', color: INK3 },
  packQtyBadge:  { backgroundColor: INK4, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 },
  packQtyText:   { fontFamily: 'Poppins_600SemiBold', fontSize: 11, color: INK3 },

  // Notes
  noteAddStrip:  { margin: 14, marginHorizontal: 16, marginBottom: 8, backgroundColor: 'white', borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 },
  noteAddInput:  { flex: 1, fontFamily: 'Poppins_400Regular', fontSize: 14, color: INK, maxHeight: 80 },
  noteAddSend:   { width: 28, height: 28, borderRadius: 14, backgroundColor: CORAL, justifyContent: 'center', alignItems: 'center' },
  noteTagPill:   { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  noteTagText:   { fontFamily: 'Poppins_700Bold', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.8 },
  noteCard:      { marginHorizontal: 16, marginBottom: 10, backgroundColor: 'white', borderRadius: 14, padding: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 },
  noteTag:       { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  noteTime:      { fontFamily: 'Poppins_400Regular', fontSize: 10, color: INK3 },
  noteBody:      { fontFamily: 'Poppins_400Regular', fontSize: 14, lineHeight: 21, color: INK },
  noteAuthor:    { fontFamily: 'Poppins_600SemiBold', fontSize: 10, color: INK3 },

  // Scroll arrows
  scrollArrowPair:{ position: 'absolute', bottom: 110, right: 16, flexDirection: 'row', gap: 8, zIndex: 50 },
  scrollArrowBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(10,10,10,0.40)', justifyContent: 'center', alignItems: 'center' },

  // Chat bar
  inputArea:     { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 14, paddingBottom: Platform.OS === 'ios' ? 30 : 18, paddingTop: 10, backgroundColor: 'white' },
  barPill:       { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'white', borderWidth: 1, borderColor: 'rgba(10,10,10,0.09)', borderRadius: 30, paddingHorizontal: 14, paddingVertical: 10 },
  barBtn:        { width: 34, height: 34, justifyContent: 'center', alignItems: 'center' },
  barSep:        { width: 1, height: 18, backgroundColor: 'rgba(10,10,10,0.1)' },
  barInput:      { flex: 1, fontFamily: 'Poppins_400Regular', fontSize: 15, color: INK },
  barMic:        { width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
  barSend:       { width: 32, height: 32, borderRadius: 16, backgroundColor: CORAL, justifyContent: 'center', alignItems: 'center' },

  // New trip sheet
  sheetOverlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet:         { backgroundColor: 'white', borderRadius: 24, paddingHorizontal: 20, paddingBottom: 34 },
  sheetHandle:   { width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(0,0,0,0.15)', alignSelf: 'center', marginTop: 12, marginBottom: 16 },
  sheetTitle:    { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 22, color: INK, marginBottom: 4 },
  sheetSub:      { fontFamily: 'Poppins_400Regular', fontSize: 13, color: INK3, marginBottom: 20 },
  fieldLabel:    { fontFamily: 'Poppins_700Bold', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8, color: INK3, marginBottom: 6 },
  fieldInput:    { backgroundColor: BODY_BG, borderRadius: 12, padding: 12, fontFamily: 'Poppins_400Regular', fontSize: 15, color: INK, marginBottom: 14 },
  whoPill:       { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: 'rgba(0,0,0,0.04)' },
  whoPip:        { width: 10, height: 10, borderRadius: 5 },
  whoName:       { fontFamily: 'Poppins_600SemiBold', fontSize: 13 },
  sheetBtn:      { backgroundColor: TRAVEL_ACCENT, borderRadius: 16, padding: 15, alignItems: 'center' },
  sheetBtnText:  { fontFamily: 'Poppins_700Bold', fontSize: 16, color: 'white' },
});
