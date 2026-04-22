/**
 * travel.tsx — Zaeli Travel Channel
 *
 * Standalone full-screen route. Two views: Trip Stack (upcoming + past)
 * and Trip Detail (4 tabs — Overview · Bookings · Packing · Notes).
 *
 * Accent: Ocean Cyan · sky #A8D8F0 primary · #0060A0 deep
 * Wordmark a+i = sky #A8D8F0
 *
 * v1 scope: full UI, local state only. Supabase wiring + AI brief + vision
 * for booking confirmations live with the backend pass.
 */

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal,
  Dimensions, Alert, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
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

// Travel accent — sky (My Space palette) + ocean deep for primary actions
const TRAVEL       = '#A8D8F0';
const TRAVEL_DEEP  = '#0060A0';
const TRAVEL_SOFT  = '#E4F4FF';
const TRAVEL_MED   = '#C8E8FF';
const TRAVEL_TXT   = '#0A4A6A';

// Status colours
const STATUS_CONF_BG   = '#D1FAE5';
const STATUS_CONF_TXT  = '#065F46';
const STATUS_PLAN_BG   = '#FFEAD8';
const STATUS_PLAN_TXT  = '#8A3A00';
const STATUS_DONE_BG   = '#E8E8E8';
const STATUS_DONE_TXT  = '#5A5D56';

// Note tag colours
const TAG_IMP_BG  = '#FEE2E2';
const TAG_IMP_TXT = '#B91C1C';
const TAG_IDEA_BG = '#E6F7EF';
const TAG_IDEA_TXT= '#2D7A52';
const TAG_INFO_BG = '#E4F4FF';
const TAG_INFO_TXT= '#0060A0';
const TAG_Q_BG    = '#FEF3C7';
const TAG_Q_TXT   = '#92400E';

const DANGER = '#C53030';

// ── Family members ─────────────────────────────────────────────────────────
interface Member { id: string; name: string; colour: string; initial: string; }
const FAMILY: Member[] = [
  { id: 'rich',  name: 'Rich',  colour: '#4D8BFF', initial: 'R' },
  { id: 'anna',  name: 'Anna',  colour: '#FF7B6B', initial: 'A' },
  { id: 'poppy', name: 'Poppy', colour: '#A855F7', initial: 'P' },
  { id: 'gab',   name: 'Gab',   colour: '#22C55E', initial: 'G' },
  { id: 'duke',  name: 'Duke',  colour: '#F59E0B', initial: 'D' },
];
const memberById = (id: string) => FAMILY.find(m => m.id === id);

// ── Types ──────────────────────────────────────────────────────────────────
type TripStatus = 'planning' | 'confirmed' | 'done';
type BookingCat = 'flights' | 'accommodation' | 'transport' | 'activities';
type NoteTag    = 'important' | 'idea' | 'info' | 'question';
type DetailTab  = 'overview' | 'bookings' | 'packing' | 'notes';

interface Trip {
  id: string;
  destination: string;
  country: string;
  flag: string;
  bgFrom: string;
  bgTo: string;
  startDate: string | null;   // YYYY-MM-DD
  endDate: string | null;
  datesLabel: string;          // human label including nights
  status: TripStatus;
  organiserId: string;
  memberIds: string[];
  totalBudget?: number;
}

interface Booking {
  id: string;
  tripId: string;
  category: BookingCat;
  emoji: string;
  title: string;
  detail: string;
  confRef?: string;
  amount?: number;
}

interface PackingItem {
  id: string;
  tripId: string;
  ownerId: string | 'shared';
  name: string;
  qty?: number;
  packed: boolean;
}

interface TripNote {
  id: string;
  tripId: string;
  tag: NoteTag;
  text: string;
  authorId: string;
  createdAt: string;
}

// ── Seed data ──────────────────────────────────────────────────────────────
const SEED_TRIPS: Trip[] = [
  {
    id: 't-bali', destination: 'Bali', country: 'Indonesia', flag: '🌴',
    bgFrom: '#E4F4FF', bgTo: '#C8E8FF',
    startDate: '2026-04-18', endDate: '2026-04-28',
    datesLabel: '18 Apr – 28 Apr 2026 · 10 nights',
    status: 'confirmed', organiserId: 'rich',
    memberIds: ['rich','anna','poppy','gab','duke'],
    totalBudget: 8000,
  },
  {
    id: 't-tokyo', destination: 'Tokyo', country: 'Japan', flag: '🗾',
    bgFrom: '#FFF0EE', bgTo: '#FAD8D0',
    startDate: null, endDate: null,
    datesLabel: 'Dates TBC · ~14 nights',
    status: 'planning', organiserId: 'rich',
    memberIds: ['rich','anna','poppy','gab','duke'],
  },
  {
    id: 't-qt', destination: 'Queenstown', country: 'New Zealand', flag: '🏔️',
    bgFrom: '#F2F2F2', bgTo: '#E8E8E8',
    startDate: '2026-01-05', endDate: '2026-01-15',
    datesLabel: '5 Jan – 15 Jan 2026 · 10 nights',
    status: 'done', organiserId: 'rich',
    memberIds: ['rich','anna','poppy','gab','duke'],
  },
];

const SEED_BOOKINGS: Booking[] = [
  { id: 'b1', tripId: 't-bali', category: 'flights',       emoji: '✈️', title: 'JQ 516 · BNE → DPS',       detail: '18 Apr · Departs 10:40am · Jetstar', confRef: 'JQ-8841-RD', amount: 2140 },
  { id: 'b2', tripId: 't-bali', category: 'flights',       emoji: '✈️', title: 'JQ 517 · DPS → BNE',       detail: '28 Apr · Departs 2:15pm · Jetstar',  confRef: 'JQ-8841-RD' },
  { id: 'b3', tripId: 't-bali', category: 'accommodation', emoji: '🏨', title: 'Alaya Resort Seminyak',     detail: '18 Apr – 21 Apr · 3 nights',         confRef: 'ALY-20948', amount: 680 },
  { id: 'b4', tripId: 't-bali', category: 'transport',     emoji: '🚗', title: 'Airport pickup · Ngurah Rai', detail: '18 Apr 1:30pm · Bali Driver Pro',  confRef: 'BDP-5512',  amount: 45 },
];

const SEED_PACKING: PackingItem[] = [
  // Shared
  { id: 'p1', tripId: 't-bali', ownerId: 'shared', name: 'Passports',          qty: 5, packed: true  },
  { id: 'p2', tripId: 't-bali', ownerId: 'shared', name: 'Travel insurance docs',       packed: true  },
  { id: 'p3', tripId: 't-bali', ownerId: 'shared', name: 'Sunscreen SPF50+',   qty: 3, packed: true  },
  { id: 'p4', tripId: 't-bali', ownerId: 'shared', name: 'Travel adapters',    qty: 2, packed: false },
  { id: 'p5', tripId: 't-bali', ownerId: 'shared', name: 'First aid kit',              packed: false },
  { id: 'p6', tripId: 't-bali', ownerId: 'shared', name: 'Snacks for flight',          packed: false },
  // Anna
  { id: 'p7', tripId: 't-bali', ownerId: 'anna',   name: 'Swimmers',           qty: 3, packed: true  },
  { id: 'p8', tripId: 't-bali', ownerId: 'anna',   name: 'Sun hat',                    packed: true  },
  { id: 'p9', tripId: 't-bali', ownerId: 'anna',   name: 'Sarong',                     packed: false },
  { id: 'p10',tripId: 't-bali', ownerId: 'anna',   name: 'Sandals',                    packed: false },
  // Rich
  { id: 'p11',tripId: 't-bali', ownerId: 'rich',   name: 'Camera',                     packed: true  },
  { id: 'p12',tripId: 't-bali', ownerId: 'rich',   name: 'Plug adapters',      qty: 2, packed: true  },
  { id: 'p13',tripId: 't-bali', ownerId: 'rich',   name: 'Snorkelling gear',           packed: false },
  { id: 'p14',tripId: 't-bali', ownerId: 'rich',   name: 'Swim shorts',        qty: 2, packed: false },
  { id: 'p15',tripId: 't-bali', ownerId: 'rich',   name: 'Beach towel',                packed: false },
  // Duke
  { id: 'p16',tripId: 't-bali', ownerId: 'duke',   name: 'Goggles',                    packed: false },
  { id: 'p17',tripId: 't-bali', ownerId: 'duke',   name: 'Rashie',             qty: 2, packed: false },
  { id: 'p18',tripId: 't-bali', ownerId: 'duke',   name: 'Thongs',                     packed: false },
  { id: 'p19',tripId: 't-bali', ownerId: 'duke',   name: 'Water toys',                 packed: false },
  { id: 'p20',tripId: 't-bali', ownerId: 'duke',   name: 'Hat',                        packed: false },
];

const SEED_NOTES: TripNote[] = [
  { id: 'n1', tripId: 't-bali', tag: 'important', text: 'Duke had a bad stomach last Bali trip — pack probiotics and electrolytes. Ask pharmacist about kids\' Imodium before we leave.', authorId: 'anna', createdAt: '2026-03-28' },
  { id: 'n2', tripId: 't-bali', tag: 'idea',      text: 'Cooking class in Ubud — kids might love it. Saw a good one near the rice terraces. Check if they do family sessions.',           authorId: 'rich', createdAt: '2026-03-25' },
  { id: 'n3', tripId: 't-bali', tag: 'info',      text: 'Visa on arrival for Australians — $35 USD per person. Bring USD cash. ATMs unreliable at Ngurah Rai.',                             authorId: 'rich', createdAt: '2026-03-22' },
  { id: 'n4', tripId: 't-bali', tag: 'question',  text: 'Does Alaya have a pool? Poppy will ask on arrival. Email them before we go.',                                                       authorId: 'anna', createdAt: '2026-03-19' },
  { id: 'n5', tripId: 't-bali', tag: 'idea',      text: 'Tegalalang Rice Terraces day 4 — early morning, 7am, before crowds. Bring the camera.',                                             authorId: 'rich', createdAt: '2026-03-15' },
];

// Manual "spent" was removed Session 18 — Booked total now auto-sums from bookings.

// ── Helpers ────────────────────────────────────────────────────────────────
function fmtAud(n: number): string { return `$${Math.round(n).toLocaleString('en-AU')}`; }
function pct(a: number, b: number): number { return b === 0 ? 0 : Math.round((a / b) * 100); }
function localDateStr(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function fmtDayMonth(iso: string): string {
  try {
    const [y, m, d] = iso.split('-').map(Number);
    return `${d} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m-1]}`;
  } catch { return iso; }
}
function daysBetween(aIso: string, bIso: string): number {
  const a = new Date(aIso + 'T00:00:00');
  const b = new Date(bIso + 'T00:00:00');
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / 86400000));
}
function daysTo(iso: string | null): number | null {
  if (!iso) return null;
  return daysBetween(localDateStr(), iso);
}

function statusMeta(s: TripStatus) {
  if (s === 'confirmed') return { label: 'Confirmed', bg: STATUS_CONF_BG, fg: STATUS_CONF_TXT };
  if (s === 'planning')  return { label: 'Planning',  bg: STATUS_PLAN_BG, fg: STATUS_PLAN_TXT };
  return { label: 'Done', bg: STATUS_DONE_BG, fg: STATUS_DONE_TXT };
}

function tagMeta(t: NoteTag) {
  if (t === 'important') return { label: 'Important', bg: TAG_IMP_BG, fg: TAG_IMP_TXT };
  if (t === 'idea')      return { label: 'Idea',      bg: TAG_IDEA_BG, fg: TAG_IDEA_TXT };
  if (t === 'info')      return { label: 'Info',      bg: TAG_INFO_BG, fg: TAG_INFO_TXT };
  return { label: 'Question', bg: TAG_Q_BG, fg: TAG_Q_TXT };
}

function bookingCatMeta(c: BookingCat) {
  if (c === 'flights')       return { label: 'Flights',       emoji: '✈️', tint: '#E4F4FF' };
  if (c === 'accommodation') return { label: 'Accommodation', emoji: '🏨', tint: '#FFF0E8' };
  if (c === 'transport')     return { label: 'Transport',     emoji: '🚗', tint: '#EFFFEE' };
  return { label: 'Activities', emoji: '🎢', tint: '#F3E8FF' };
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
function IcoPlus({ color = INK, size = 16 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
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
function IcoCheck({ color = '#fff' }: { color?: string }) {
  return (
    <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
      <Path d="M5 12l5 5 9-11" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"/>
    </Svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════
export default function TravelScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [trips, setTrips]             = useState<Trip[]>(SEED_TRIPS);
  const [bookings, setBookings]       = useState<Booking[]>(SEED_BOOKINGS);
  const [packing, setPacking]         = useState<PackingItem[]>(SEED_PACKING);
  const [notes, setNotes]             = useState<TripNote[]>(SEED_NOTES);

  const [currentTripId, setCurrentTripId] = useState<string | null>(null);
  const [activeTab, setActiveTab]     = useState<DetailTab>('overview');
  const [moreOpen, setMoreOpen]       = useState(false);
  const [newTripOpen, setNewTripOpen] = useState(false);
  const [bookingEdit, setBookingEdit] = useState<Booking | 'new' | null>(null);
  const [newPackingOpen, setNewPackingOpen] = useState(false);
  const [newNoteOpen, setNewNoteOpen] = useState(false);
  const [editBudgetOpen, setEditBudgetOpen] = useState(false);
  const [editMembersOpen, setEditMembersOpen] = useState(false);

  const currentTrip = trips.find(t => t.id === currentTripId) ?? null;

  // ── Save helpers ────────────────────────────────────────────────────────
  function addTrip(t: Trip) { setTrips(prev => [t, ...prev]); }
  function removeTrip(id: string) {
    setTrips(prev => prev.filter(t => t.id !== id));
    setBookings(prev => prev.filter(b => b.tripId !== id));
    setPacking(prev => prev.filter(p => p.tripId !== id));
    setNotes(prev => prev.filter(n => n.tripId !== id));
  }
  function saveBooking(b: Booking) {
    setBookings(prev => prev.some(x => x.id === b.id) ? prev.map(x => x.id === b.id ? b : x) : [b, ...prev]);
  }
  function removeBooking(id: string) { setBookings(prev => prev.filter(b => b.id !== id)); }
  function addPacking(p: PackingItem) { setPacking(prev => [...prev, p]); }
  function togglePacking(id: string) {
    setPacking(prev => prev.map(p => p.id === id ? { ...p, packed: !p.packed } : p));
  }
  function removePacking(id: string) { setPacking(prev => prev.filter(p => p.id !== id)); }
  function addNote(n: TripNote) { setNotes(prev => [n, ...prev]); }
  function removeNote(id: string) { setNotes(prev => prev.filter(n => n.id !== id)); }
  function updateTripMembers(tripId: string, memberIds: string[]) {
    setTrips(prev => prev.map(t => t.id === tripId ? { ...t, memberIds } : t));
  }
  function updateTripBudget(tripId: string, totalBudget: number) {
    setTrips(prev => prev.map(t => t.id === tripId ? { ...t, totalBudget: totalBudget > 0 ? totalBudget : undefined } : t));
  }

  // ── Back behaviour ──────────────────────────────────────────────────────
  function handleBack() {
    if (currentTripId) {
      setCurrentTripId(null);
      setActiveTab('overview');
    } else {
      router.back();
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: BG, paddingTop: insets.top }}>
      <StatusBar style="dark"/>

      {/* Header */}
      <View style={s.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TouchableOpacity onPress={handleBack} style={s.back} activeOpacity={0.7}><BackArrow/></TouchableOpacity>
          <Text style={s.wordmark}>
            z<Text style={{ color: TRAVEL }}>a</Text>el<Text style={{ color: TRAVEL }}>i</Text>
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={s.pageLabel}>Travel</Text>
          <TouchableOpacity onPress={() => setMoreOpen(true)} style={s.hamburger} activeOpacity={0.7}>
            <Hamburger/>
          </TouchableOpacity>
        </View>
      </View>

      {/* Trip stack vs Trip detail */}
      {!currentTrip && (
        <TripStackView
          trips={trips}
          bookings={bookings}
          packing={packing}
          onOpenTrip={id => { setCurrentTripId(id); setActiveTab('overview'); }}
          onAddTrip={() => setNewTripOpen(true)}
        />
      )}

      {currentTrip && (
        <TripDetailView
          trip={currentTrip}
          bookings={bookings.filter(b => b.tripId === currentTrip.id)}
          packing={packing.filter(p => p.tripId === currentTrip.id)}
          notes={notes.filter(n => n.tripId === currentTrip.id)}
          activeTab={activeTab}
          onChangeTab={setActiveTab}
          onTogglePacking={togglePacking}
          onRemovePacking={removePacking}
          onRemoveNote={removeNote}
          onOpenBooking={b => setBookingEdit(b)}
          onAddBooking={() => setBookingEdit('new')}
          onAddPacking={() => setNewPackingOpen(true)}
          onAddNote={() => setNewNoteOpen(true)}
          onEditBudget={() => setEditBudgetOpen(true)}
          onEditMembers={() => setEditMembersOpen(true)}
          onDeleteTrip={() => {
            Alert.alert('Delete trip', `Remove ${currentTrip.destination}?`, [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete', style: 'destructive', onPress: () => { removeTrip(currentTrip.id); setCurrentTripId(null); } },
            ]);
          }}
        />
      )}

      <NewTripSheet
        visible={newTripOpen}
        onClose={() => setNewTripOpen(false)}
        onSave={t => { addTrip(t); setNewTripOpen(false); setCurrentTripId(t.id); setActiveTab('overview'); }}
      />
      {currentTrip && (
        <>
          <BookingSheet
            payload={bookingEdit}
            tripId={currentTrip.id}
            onClose={() => setBookingEdit(null)}
            onSave={b => { saveBooking(b); setBookingEdit(null); }}
            onRemove={id => { removeBooking(id); setBookingEdit(null); }}
          />
          <NewPackingSheet
            visible={newPackingOpen}
            tripId={currentTrip.id}
            tripMembers={currentTrip.memberIds}
            onClose={() => setNewPackingOpen(false)}
            onSave={p => { addPacking(p); setNewPackingOpen(false); }}
          />
          <NewNoteSheet
            visible={newNoteOpen}
            tripId={currentTrip.id}
            onClose={() => setNewNoteOpen(false)}
            onSave={n => { addNote(n); setNewNoteOpen(false); }}
          />
          <EditTotalBudgetSheet
            visible={editBudgetOpen}
            trip={currentTrip}
            onClose={() => setEditBudgetOpen(false)}
            onSave={total => { updateTripBudget(currentTrip.id, total); setEditBudgetOpen(false); }}
          />
          <EditMembersSheet
            visible={editMembersOpen}
            trip={currentTrip}
            onClose={() => setEditMembersOpen(false)}
            onSave={memberIds => { updateTripMembers(currentTrip.id, memberIds); setEditMembersOpen(false); }}
          />
        </>
      )}

      <MoreSheet visible={moreOpen} onClose={() => setMoreOpen(false)}/>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TRIP STACK VIEW
// ═══════════════════════════════════════════════════════════════════════════
function TripStackView(p: {
  trips: Trip[];
  bookings: Booking[];
  packing: PackingItem[];
  onOpenTrip: (id: string) => void;
  onAddTrip: () => void;
}) {
  const upcoming = p.trips.filter(t => t.status !== 'done');
  const past     = p.trips.filter(t => t.status === 'done');

  // Zaeli insight — computed from the nearest upcoming trip
  const nearest = upcoming.sort((a, b) => {
    if (!a.startDate) return 1;
    if (!b.startDate) return -1;
    return a.startDate.localeCompare(b.startDate);
  })[0];

  let insight = 'All quiet on the travel front — want to start planning something?';
  if (nearest) {
    const d = daysTo(nearest.startDate);
    const pack = p.packing.filter(i => i.tripId === nearest.id);
    const packedPct = pct(pack.filter(i => i.packed).length, pack.length);
    if (d !== null && d >= 0) {
      insight = `${nearest.destination} in ${d} days — packing is ${packedPct}% done.`;
    } else if (nearest.status === 'planning') {
      insight = `${nearest.destination} is in planning mode. Want to lock in dates or start researching?`;
    }
  }

  return (
    <ScrollView contentContainerStyle={{ paddingTop: 14, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>

      {upcoming.length > 0 && <Text style={s.secLabel}>Upcoming · {upcoming.length}</Text>}
      {upcoming.map(t => <TripCard key={t.id} trip={t} onPress={() => p.onOpenTrip(t.id)}/>)}

      <TouchableOpacity style={s.addTripCard} activeOpacity={0.8} onPress={p.onAddTrip}>
        <View style={s.addTripIco}><IcoPlus color={TRAVEL_DEEP}/></View>
        <View style={{ flex: 1 }}>
          <Text style={s.addTripTitle}>Plan a trip</Text>
          <Text style={s.addTripSub}>Destination, dates, who's going</Text>
        </View>
      </TouchableOpacity>

      {past.length > 0 && <Text style={[s.secLabel, { marginTop: 10 }]}>Past · {past.length}</Text>}
      {past.map(t => <TripCard key={t.id} trip={t} onPress={() => p.onOpenTrip(t.id)} past/>)}

      {/* Zaeli insight */}
      <View style={s.insightCard}>
        <View style={s.insightEye}>
          <View style={s.insightStar}>
            <Svg width={10} height={10} viewBox="0 0 24 24" fill={INK}>
              <Path d="M12 2L14.09 8.26L20 10L14.09 11.74L12 18L9.91 11.74L4 10L9.91 8.26L12 2Z"/>
            </Svg>
          </View>
          <Text style={s.insightLbl}>Zaeli</Text>
        </View>
        <Text style={s.insightTxt}>{insight}</Text>
      </View>

    </ScrollView>
  );
}

function TripCard(p: { trip: Trip; onPress: () => void; past?: boolean }) {
  const { trip } = p;
  const meta = statusMeta(trip.status);
  const d = daysTo(trip.startDate);
  const members = trip.memberIds.map(memberById).filter(Boolean) as Member[];

  return (
    <TouchableOpacity
      style={[s.tripCard, { backgroundColor: trip.bgTo }, p.past && { opacity: 0.75 }]}
      activeOpacity={0.88}
      onPress={p.onPress}
    >
      <View style={s.tripHead}>
        <View style={{ flex: 1 }}>
          <Text style={s.tripDest}>{trip.destination}</Text>
          <Text style={s.tripCountry}>{trip.country}</Text>
          <View style={[s.tripBadge, { backgroundColor: meta.bg }]}>
            <Text style={[s.tripBadgeTxt, { color: meta.fg }]}>{meta.label}</Text>
          </View>
        </View>
        <Text style={s.tripFlag}>{trip.flag}</Text>
      </View>

      {trip.status !== 'done' && (
        <View style={s.tripStrip}>
          <View style={[s.tripStripDot, { backgroundColor: TRAVEL_DEEP }]}/>
          <Text style={s.tripStripTxt}>
            {d !== null && d >= 0 ? `${d} days to go` : trip.status === 'planning' ? 'Planning · no dates' : 'Starts soon'}
          </Text>
          <View style={s.tripAvatars}>
            {members.slice(0, 5).map((m, i) => (
              <View key={m.id} style={[s.tripAv, { backgroundColor: m.colour, marginLeft: i === 0 ? 0 : -6 }]}>
                <Text style={s.tripAvTxt}>{m.initial}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={s.tripFoot}>
        <Text style={s.tripDates}>{trip.datesLabel}</Text>
        {trip.status === 'done' && (
          <View style={s.tripAvatars}>
            {members.slice(0, 5).map((m, i) => (
              <View key={m.id} style={[s.tripAv, { backgroundColor: m.colour, marginLeft: i === 0 ? 0 : -6 }]}>
                <Text style={s.tripAvTxt}>{m.initial}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TRIP DETAIL VIEW
// ═══════════════════════════════════════════════════════════════════════════
function TripDetailView(p: {
  trip: Trip;
  bookings: Booking[];
  packing: PackingItem[];
  notes: TripNote[];
  activeTab: DetailTab;
  onChangeTab: (t: DetailTab) => void;
  onTogglePacking: (id: string) => void;
  onRemovePacking: (id: string) => void;
  onRemoveNote: (id: string) => void;
  onOpenBooking: (b: Booking) => void;
  onAddBooking: () => void;
  onAddPacking: () => void;
  onAddNote: () => void;
  onEditBudget: () => void;
  onEditMembers: () => void;
  onDeleteTrip: () => void;
}) {
  return (
    <>
      <View style={s.tabRow}>
        {(['overview','bookings','packing','notes'] as DetailTab[]).map(t => (
          <TouchableOpacity key={t} style={[s.tab, p.activeTab === t && s.tabOn]} onPress={() => p.onChangeTab(t)} activeOpacity={0.7}>
            <Text style={[s.tabTxt, p.activeTab === t && s.tabTxtOn]}>
              {t === 'overview' ? 'Overview' : t === 'bookings' ? 'Bookings' : t === 'packing' ? 'Packing' : 'Notes'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {p.activeTab === 'overview' && (
        <OverviewTab trip={p.trip} bookings={p.bookings} packing={p.packing}
          onEditBudget={p.onEditBudget} onEditMembers={p.onEditMembers} onDeleteTrip={p.onDeleteTrip}/>
      )}
      {p.activeTab === 'bookings' && (
        <BookingsTab bookings={p.bookings} onOpenBooking={p.onOpenBooking} onAddBooking={p.onAddBooking}/>
      )}
      {p.activeTab === 'packing' && (
        <PackingTab trip={p.trip} packing={p.packing} onToggle={p.onTogglePacking} onRemove={p.onRemovePacking} onAdd={p.onAddPacking}/>
      )}
      {p.activeTab === 'notes' && (
        <NotesTab notes={p.notes} onAdd={p.onAddNote} onRemove={p.onRemoveNote}/>
      )}
    </>
  );
}

// ── Overview tab ──────────────────────────────────────────────────────────
function OverviewTab(p: {
  trip: Trip;
  bookings: Booking[];
  packing: PackingItem[];
  onEditBudget: () => void;
  onEditMembers: () => void;
  onDeleteTrip: () => void;
}) {
  const { trip } = p;
  const d = daysTo(trip.startDate);
  const members = trip.memberIds.map(memberById).filter(Boolean) as Member[];
  const totalBudget = trip.totalBudget ?? 0;
  // Booked = auto-sum of booking amounts. Honest "committed" figure without
  // pretending we know the actual spent (would need bank feed).
  const booked = p.bookings.reduce((sum, b) => sum + (b.amount ?? 0), 0);
  const unbooked = Math.max(0, totalBudget - booked);
  const bookedPct = pct(booked, totalBudget);

  const packedCount = p.packing.filter(i => i.packed).length;
  const totalPacking = p.packing.length;
  const packedPct = pct(packedCount, totalPacking);

  // Quick Zaeli insight derived from state
  const missingAcc = p.bookings.filter(b => b.category === 'accommodation').length === 0;
  const insightText = missingAcc
    ? 'Accommodation isn\'t booked yet — worth sorting soon if you want the good options.'
    : packedPct < 50 && d !== null && d < 14
      ? `Packing is ${packedPct}% done with ${d} days to go — might be worth a stocktake this weekend.`
      : `Flights are confirmed and the trip is shaping up. Anything you want me to help with?`;

  return (
    <ScrollView contentContainerStyle={{ paddingTop: 14, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>

      {/* Hero */}
      <View style={[s.heroCard, { backgroundColor: trip.bgTo }]}>
        <View style={{ flex: 1 }}>
          <Text style={s.heroDest}>{trip.destination}</Text>
          <Text style={s.heroCountry}>{trip.country} {trip.flag}</Text>
          <Text style={s.heroDates}>{trip.datesLabel}</Text>
          {d !== null && d >= 0 && (
            <View style={s.heroCd}>
              <Text style={s.heroCdTxt}>{d} days to go</Text>
            </View>
          )}
        </View>
        <Text style={s.heroFlag}>{trip.flag}</Text>
      </View>

      {/* Who's going — tap to edit members */}
      <Text style={s.secLabel}>Who's going</Text>
      <TouchableOpacity style={s.card} activeOpacity={0.85} onPress={p.onEditMembers}>
        {members.map((m, i) => (
          <View key={m.id} style={[s.memberRow, i === members.length - 1 && { borderBottomWidth: 0 }]}>
            <View style={[s.memberDot, { backgroundColor: m.colour }]}>
              <Text style={s.memberInitial}>{m.initial}</Text>
            </View>
            <Text style={s.memberName}>{m.name}</Text>
            {m.id === trip.organiserId && <View style={s.organiserTag}><Text style={s.organiserTxt}>Organiser</Text></View>}
          </View>
        ))}
        <Text style={s.budgetEdit}>Tap to edit</Text>
      </TouchableOpacity>

      {/* Budget — total set by user, Booked auto-sums booking amounts.
          No manual "spent" — without a bank feed that number drifts. */}
      <Text style={s.secLabel}>Budget</Text>
      <TouchableOpacity style={s.budgetCard} activeOpacity={0.85} onPress={p.onEditBudget}>
        <View>
          <Text style={s.budgetLbl}>Total budget</Text>
          <Text style={s.budgetBig}>{totalBudget > 0 ? fmtAud(totalBudget) : 'Not set'}</Text>
        </View>
        {totalBudget > 0 ? (
          <>
            <View style={[s.budgetBar, { marginTop: 12 }]}>
              <View style={[s.budgetFill, { width: `${Math.min(100, bookedPct)}%` }]}/>
            </View>
            <View style={s.budgetSplit}>
              <View style={{ flex: 1 }}>
                <Text style={s.budgetSplitLbl}>Booked</Text>
                <Text style={s.budgetSplitVal}>{fmtAud(booked)}</Text>
                <Text style={s.budgetSplitSub}>{bookedPct}% of budget</Text>
              </View>
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Text style={s.budgetSplitLbl}>Still to plan</Text>
                <Text style={s.budgetSplitVal}>{fmtAud(unbooked)}</Text>
                <Text style={s.budgetSplitSub}>food · activities · etc</Text>
              </View>
            </View>
          </>
        ) : (
          <Text style={[s.budgetSub, { marginTop: 8 }]}>Set a total so Zaeli can track your commitments.</Text>
        )}
        <Text style={s.budgetEdit}>Tap to edit total</Text>
      </TouchableOpacity>

      {/* Packing quick progress */}
      {totalPacking > 0 && (
        <>
          <Text style={s.secLabel}>Packing</Text>
          <View style={s.card}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
              <Text style={s.packingInlineLbl}>{packedCount} of {totalPacking} packed</Text>
              <Text style={s.packingInlinePct}>{packedPct}%</Text>
            </View>
            <View style={s.budgetBar}>
              <View style={[s.budgetFill, { width: `${packedPct}%` }]}/>
            </View>
          </View>
        </>
      )}

      {/* Zaeli insight */}
      <View style={[s.insightCard, { marginTop: 14 }]}>
        <View style={s.insightEye}>
          <View style={s.insightStar}>
            <Svg width={10} height={10} viewBox="0 0 24 24" fill={INK}>
              <Path d="M12 2L14.09 8.26L20 10L14.09 11.74L12 18L9.91 11.74L4 10L9.91 8.26L12 2Z"/>
            </Svg>
          </View>
          <Text style={s.insightLbl}>Zaeli</Text>
        </View>
        <Text style={s.insightTxt}>{insightText}</Text>
      </View>

      {/* Delete */}
      {trip.status !== 'done' && (
        <TouchableOpacity onPress={p.onDeleteTrip} activeOpacity={0.7} style={{ marginTop: 20, alignItems: 'center', paddingVertical: 14 }}>
          <Text style={{ fontFamily: 'Poppins_600SemiBold', color: DANGER, fontSize: 14 }}>Delete trip</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

// ── Bookings tab ──────────────────────────────────────────────────────────
function BookingsTab(p: {
  bookings: Booking[];
  onOpenBooking: (b: Booking) => void;
  onAddBooking: () => void;
}) {
  const cats: BookingCat[] = ['flights','accommodation','transport','activities'];

  return (
    <ScrollView contentContainerStyle={{ paddingTop: 14, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
      {cats.map(cat => {
        const items = p.bookings.filter(b => b.category === cat);
        const meta = bookingCatMeta(cat);
        if (items.length === 0) return null;
        return (
          <View key={cat} style={{ marginBottom: 14 }}>
            <View style={s.bkCatHead}>
              <Text style={s.bkCatEmoji}>{meta.emoji}</Text>
              <Text style={s.bkCatName}>{meta.label}</Text>
              <Text style={s.bkCatCount}>{items.length} {items.length === 1 ? 'booking' : 'bookings'}</Text>
            </View>
            {items.map(b => (
              <TouchableOpacity
                key={b.id}
                style={s.bkItem}
                activeOpacity={0.75}
                onPress={() => p.onOpenBooking(b)}
              >
                <View style={[s.bkEmojiBox, { backgroundColor: meta.tint }]}><Text style={{ fontSize: 22 }}>{b.emoji}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={s.bkTitle}>{b.title}</Text>
                  <Text style={s.bkDetail}>{b.detail}</Text>
                  {b.confRef && <Text style={s.bkConf}>REF: {b.confRef}</Text>}
                </View>
                <Text style={s.bkAmt}>{b.amount ? fmtAud(b.amount) : '—'}</Text>
              </TouchableOpacity>
            ))}
          </View>
        );
      })}

      {p.bookings.length === 0 && (
        <Text style={s.empty}>No bookings yet. Add flights, accommodation, transport or activities below.</Text>
      )}

      <TouchableOpacity style={s.addCard} activeOpacity={0.8} onPress={p.onAddBooking}>
        <IcoPlus color={INK5}/>
        <Text style={s.addCardTxt}>Add booking — type or paste</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ── Packing tab ───────────────────────────────────────────────────────────
function PackingTab(p: {
  trip: Trip;
  packing: PackingItem[];
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onAdd: () => void;
}) {
  const totalPacked = p.packing.filter(i => i.packed).length;
  const total = p.packing.length;

  // Build sections: shared first, then one per trip member
  const sections: Array<{ id: string; label: string; ownerId: string | 'shared'; colour: string; items: PackingItem[] }> = [
    {
      id: 'shared', label: 'Shared', ownerId: 'shared', colour: '#888',
      items: p.packing.filter(i => i.ownerId === 'shared'),
    },
    ...p.trip.memberIds.map(mid => {
      const m = memberById(mid);
      return {
        id: mid, label: m?.name ?? mid, ownerId: mid, colour: m?.colour ?? '#888',
        items: p.packing.filter(i => i.ownerId === mid),
      };
    }),
  ];

  return (
    <ScrollView contentContainerStyle={{ paddingTop: 14, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>

      {/* Progress pill */}
      <View style={s.packingPill}>
        <Text style={s.packingPillLbl}>Packed</Text>
        <View style={s.packingPillBar}>
          <View style={[s.packingPillFill, { width: `${pct(totalPacked, total)}%` }]}/>
        </View>
        <Text style={s.packingPillFrac}>{totalPacked} / {total}</Text>
      </View>

      {sections.map(sec => (
        sec.items.length === 0 && sec.ownerId === 'shared' ? null : sec.items.length === 0 ? null : (
          <View key={sec.id} style={s.packSec}>
            <View style={s.packSecHead}>
              <View style={[s.packSecAv, { backgroundColor: sec.colour }]}>
                {sec.ownerId === 'shared'
                  ? <Text style={{ fontSize: 14 }}>🌐</Text>
                  : <Text style={s.packSecAvTxt}>{memberById(sec.ownerId)?.initial ?? '?'}</Text>
                }
              </View>
              <Text style={s.packSecName}>{sec.label}</Text>
              <Text style={s.packSecCount}>{sec.items.filter(i => i.packed).length} / {sec.items.length}</Text>
            </View>
            {sec.items.map(it => (
              <TouchableOpacity
                key={it.id}
                style={s.packItem}
                activeOpacity={0.7}
                onPress={() => p.onToggle(it.id)}
                onLongPress={() => Alert.alert('Remove item', `Remove ${it.name}?`, [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Remove', style: 'destructive', onPress: () => p.onRemove(it.id) },
                ])}
              >
                <View style={[s.packCircle, it.packed && s.packCircleOn]}>
                  {it.packed && <IcoCheck/>}
                </View>
                <Text style={[s.packName, it.packed && s.packNameDone]}>{it.name}</Text>
                {it.qty ? <Text style={s.packQty}>×{it.qty}</Text> : null}
              </TouchableOpacity>
            ))}
          </View>
        )
      ))}

      <TouchableOpacity style={s.addCard} activeOpacity={0.8} onPress={p.onAdd}>
        <IcoPlus color={INK5}/>
        <Text style={s.addCardTxt}>Add packing item</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ── Notes tab ─────────────────────────────────────────────────────────────
function NotesTab(p: { notes: TripNote[]; onAdd: () => void; onRemove: (id: string) => void }) {
  return (
    <ScrollView contentContainerStyle={{ paddingTop: 14, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
      {p.notes.length === 0 && (
        <Text style={s.empty}>No notes yet. Capture ideas, info and questions as you plan.</Text>
      )}
      {p.notes.map(n => {
        const meta = tagMeta(n.tag);
        const author = memberById(n.authorId);
        return (
          <TouchableOpacity
            key={n.id}
            style={s.noteCard}
            activeOpacity={0.9}
            onLongPress={() => Alert.alert('Remove note', 'Are you sure?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Remove', style: 'destructive', onPress: () => p.onRemove(n.id) },
            ])}
          >
            <View style={s.noteHead}>
              <View style={[s.noteTag, { backgroundColor: meta.bg }]}>
                <Text style={[s.noteTagTxt, { color: meta.fg }]}>{meta.label}</Text>
              </View>
              <Text style={s.noteTime}>{fmtDayMonth(n.createdAt)}</Text>
            </View>
            <Text style={s.noteTxt}>{n.text}</Text>
            {author && (
              <View style={s.noteAuthor}>
                <View style={[s.noteAuthorDot, { backgroundColor: author.colour }]}/>
                <Text style={s.noteAuthorName}>{author.name}</Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}

      <TouchableOpacity style={s.addCard} activeOpacity={0.8} onPress={p.onAdd}>
        <IcoPlus color={INK5}/>
        <Text style={s.addCardTxt}>Add a note</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// GENERIC SHEET SHELL
// ═══════════════════════════════════════════════════════════════════════════
function SheetShell(p: { visible: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!p.visible) return null;
  // KAV inside the card (not wrapping the modal) so keyboard padding shrinks
  // the body instead of shoving the whole fixed-height card off-screen.
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
// NEW TRIP SHEET
// ═══════════════════════════════════════════════════════════════════════════
const FLAG_OPTIONS = ['🌴','🗾','🏔️','🏖️','🗽','🎡','🗼','🏛️','🏝️','🌋','🏕️','🎿','🏜️','🌉'];
const BG_OPTIONS = [
  { from: '#E4F4FF', to: '#C8E8FF', label: 'Sky' },
  { from: '#FFF0EE', to: '#FAD8D0', label: 'Warm' },
  { from: '#E6F7EF', to: '#C8F0DA', label: 'Mint' },
  { from: '#F5EDE3', to: '#FAC8A8', label: 'Peach' },
  { from: '#EDE8FF', to: '#D8CCFF', label: 'Lavender' },
];

function NewTripSheet(p: { visible: boolean; onClose: () => void; onSave: (t: Trip) => void }) {
  const [destination, setDestination] = useState('');
  const [country, setCountry] = useState('');
  const [flag, setFlag] = useState('🌴');
  const [bgIdx, setBgIdx] = useState(0);
  const [status, setStatus] = useState<TripStatus>('planning');
  const [memberIds, setMemberIds] = useState<string[]>(['rich','anna','poppy','gab','duke']);
  const [datesKnown, setDatesKnown] = useState(false);
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date(Date.now() + 7 * 86400000));
  const [pickerTarget, setPickerTarget] = useState<null | 'start' | 'end'>(null);
  const [budget, setBudget] = useState('');

  React.useEffect(() => {
    if (p.visible) {
      setDestination(''); setCountry(''); setFlag('🌴'); setBgIdx(0);
      setStatus('planning'); setMemberIds(['rich','anna','poppy','gab','duke']);
      setDatesKnown(false);
      setStartDate(new Date()); setEndDate(new Date(Date.now() + 7 * 86400000));
      setBudget('');
    }
  }, [p.visible]);

  function toggleMember(id: string) {
    setMemberIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  function save() {
    if (!destination.trim()) { Alert.alert('Missing destination', 'Where are you going?'); return; }
    const bg = BG_OPTIONS[bgIdx];
    const startIso = datesKnown ? localDateStr(startDate) : null;
    const endIso   = datesKnown ? localDateStr(endDate)   : null;
    let datesLabel = 'Dates TBC';
    if (datesKnown && startIso && endIso) {
      const nights = daysBetween(startIso, endIso);
      datesLabel = `${fmtDayMonth(startIso)} – ${fmtDayMonth(endIso)} ${endDate.getFullYear()} · ${nights} ${nights === 1 ? 'night' : 'nights'}`;
    }
    const b = parseFloat(budget.replace(/[^0-9.]/g, ''));
    p.onSave({
      id: `t-${Date.now()}`,
      destination: destination.trim(),
      country: country.trim(),
      flag, bgFrom: bg.from, bgTo: bg.to,
      startDate: startIso, endDate: endIso,
      datesLabel,
      status,
      organiserId: 'rich',
      memberIds,
      totalBudget: isNaN(b) || b <= 0 ? undefined : b,
    });
  }

  return (
    <SheetShell visible={p.visible} onClose={p.onClose} title="Plan a trip">
      <ScrollView style={s.sheetBody} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        <Text style={s.fieldLbl}>Destination</Text>
        <TextInput style={s.input} value={destination} onChangeText={setDestination} placeholder="e.g. Bali" placeholderTextColor={INK4}/>

        <Text style={s.fieldLbl}>Country</Text>
        <TextInput style={s.input} value={country} onChangeText={setCountry} placeholder="e.g. Indonesia" placeholderTextColor={INK4}/>

        <Text style={s.fieldLbl}>Icon</Text>
        <View style={s.emojiGrid}>
          {FLAG_OPTIONS.map(e => (
            <TouchableOpacity key={e} style={[s.emojiOpt, flag === e && s.emojiOptOn]} onPress={() => setFlag(e)} activeOpacity={0.75}>
              <Text style={{ fontSize: 22 }}>{e}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.fieldLbl}>Card colour</Text>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {BG_OPTIONS.map((bg, i) => (
            <TouchableOpacity key={bg.label}
              style={[s.bgOpt, { backgroundColor: bg.to }, bgIdx === i && s.bgOptOn]}
              onPress={() => setBgIdx(i)} activeOpacity={0.75}>
              <Text style={s.bgOptTxt}>{bg.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.fieldLbl}>Status</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {(['planning','confirmed'] as TripStatus[]).map(st => (
            <TouchableOpacity key={st} style={[s.tog, status === st && s.togOn]} onPress={() => setStatus(st)} activeOpacity={0.75}>
              <Text style={[s.togTxt, status === st && s.togTxtOn]}>{st === 'planning' ? 'Planning' : 'Confirmed'}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.fieldLbl}>Who's going</Text>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {FAMILY.map(m => {
            const on = memberIds.includes(m.id);
            return (
              <TouchableOpacity key={m.id} style={[s.memberPill, on && { backgroundColor: m.colour, borderColor: m.colour }]} onPress={() => toggleMember(m.id)} activeOpacity={0.75}>
                <View style={[s.memberPillDot, { backgroundColor: on ? '#FFFFFF' : m.colour }]}/>
                <Text style={[s.memberPillTxt, on && { color: '#FFFFFF' }]}>{m.name}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={s.fieldLbl}>Dates</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
          <TouchableOpacity style={[s.tog, datesKnown && s.togOn]} onPress={() => setDatesKnown(true)} activeOpacity={0.75}>
            <Text style={[s.togTxt, datesKnown && s.togTxtOn]}>Pick dates</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.tog, !datesKnown && s.togOn]} onPress={() => setDatesKnown(false)} activeOpacity={0.75}>
            <Text style={[s.togTxt, !datesKnown && s.togTxtOn]}>TBC</Text>
          </TouchableOpacity>
        </View>
        {datesKnown && (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={[s.input, { flex: 1 }]} onPress={() => setPickerTarget('start')} activeOpacity={0.75}>
              <Text style={s.inputTxt}>{fmtDayMonth(localDateStr(startDate))} {startDate.getFullYear()}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.input, { flex: 1 }]} onPress={() => setPickerTarget('end')} activeOpacity={0.75}>
              <Text style={s.inputTxt}>{fmtDayMonth(localDateStr(endDate))} {endDate.getFullYear()}</Text>
            </TouchableOpacity>
          </View>
        )}
        {pickerTarget && (
          <DateTimePicker
            value={pickerTarget === 'start' ? startDate : endDate}
            mode="date" display="spinner"
            onChange={(_: any, d?: Date) => {
              setPickerTarget(Platform.OS === 'ios' ? pickerTarget : null);
              if (d) { if (pickerTarget === 'start') setStartDate(d); else setEndDate(d); }
            }}
          />
        )}

        <Text style={s.fieldLbl}>Total budget (optional, AUD)</Text>
        <TextInput style={s.input} value={budget} onChangeText={setBudget} placeholder="e.g. 8000" placeholderTextColor={INK4} keyboardType="decimal-pad"/>

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
          <TouchableOpacity style={[s.btnGhost, { flex: 1 }]} onPress={p.onClose} activeOpacity={0.85}>
            <Text style={s.btnGhostTxt}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.btnPrimary, { flex: 1 }]} onPress={save} activeOpacity={0.85}>
            <Text style={s.btnPrimaryTxt}>Save trip</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SheetShell>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// BOOKING SHEET — handles both add (payload='new') and edit (payload=Booking)
// ═══════════════════════════════════════════════════════════════════════════
function BookingSheet(p: {
  payload: Booking | 'new' | null;
  tripId: string;
  onClose: () => void;
  onSave: (b: Booking) => void;
  onRemove: (id: string) => void;
}) {
  const isNew = p.payload === 'new';
  const existing = isNew ? null : (p.payload as Booking | null);
  const visible = p.payload !== null;

  const [category, setCategory] = useState<BookingCat>('flights');
  const [title, setTitle] = useState('');
  const [detail, setDetail] = useState('');
  const [confRef, setConfRef] = useState('');
  const [amount, setAmount] = useState('');

  React.useEffect(() => {
    if (!visible) return;
    if (existing) {
      setCategory(existing.category);
      setTitle(existing.title);
      setDetail(existing.detail);
      setConfRef(existing.confRef ?? '');
      setAmount(existing.amount ? String(existing.amount) : '');
    } else {
      setCategory('flights'); setTitle(''); setDetail(''); setConfRef(''); setAmount('');
    }
  }, [visible, p.payload]);

  function save() {
    if (!title.trim()) { Alert.alert('Missing title', 'What is this booking?'); return; }
    const meta = bookingCatMeta(category);
    const n = parseFloat(amount.replace(/[^0-9.]/g, ''));
    p.onSave({
      id: existing?.id ?? `b-${Date.now()}`,
      tripId: p.tripId,
      category,
      emoji: meta.emoji,
      title: title.trim(),
      detail: detail.trim(),
      confRef: confRef.trim() || undefined,
      amount: isNaN(n) || n <= 0 ? undefined : n,
    });
  }

  if (!visible) return null;
  return (
    <SheetShell visible onClose={p.onClose} title={existing ? 'Edit booking' : 'Add booking'}>
      <ScrollView style={s.sheetBody} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        <Text style={s.fieldLbl}>Category</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
          {(['flights','accommodation','transport','activities'] as BookingCat[]).map(c => {
            const meta = bookingCatMeta(c);
            const on = category === c;
            return (
              <TouchableOpacity key={c} style={[s.chip, on && s.chipOn]} onPress={() => setCategory(c)} activeOpacity={0.75}>
                <Text style={[s.chipTxt, on && s.chipTxtOn]}>{meta.emoji} {meta.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={s.fieldLbl}>Title</Text>
        <TextInput style={s.input} value={title} onChangeText={setTitle} placeholder="e.g. Alaya Resort Seminyak" placeholderTextColor={INK4}/>

        <Text style={s.fieldLbl}>Detail</Text>
        <TextInput style={s.input} value={detail} onChangeText={setDetail} placeholder="e.g. 18 Apr – 21 Apr · 3 nights" placeholderTextColor={INK4}/>

        <Text style={s.fieldLbl}>Confirmation reference (optional)</Text>
        <TextInput style={s.input} value={confRef} onChangeText={setConfRef} placeholder="e.g. ALY-20948" placeholderTextColor={INK4} autoCapitalize="characters"/>

        <Text style={s.fieldLbl}>Amount (AUD, optional)</Text>
        <TextInput style={s.input} value={amount} onChangeText={setAmount} placeholder="0" placeholderTextColor={INK4} keyboardType="decimal-pad"/>

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
          <TouchableOpacity style={[s.btnGhost, { flex: 1 }]} onPress={p.onClose} activeOpacity={0.85}>
            <Text style={s.btnGhostTxt}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.btnPrimary, { flex: 1 }]} onPress={save} activeOpacity={0.85}>
            <Text style={s.btnPrimaryTxt}>{existing ? 'Save changes' : 'Save booking'}</Text>
          </TouchableOpacity>
        </View>

        {existing && (
          <TouchableOpacity
            onPress={() => Alert.alert('Remove booking', `Remove ${existing.title}?`, [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Remove', style: 'destructive', onPress: () => p.onRemove(existing.id) },
            ])}
            activeOpacity={0.7}
            style={{ marginTop: 14, alignItems: 'center' }}
          >
            <Text style={{ fontFamily: 'Poppins_600SemiBold', color: DANGER, fontSize: 14 }}>Remove booking</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SheetShell>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// NEW PACKING SHEET
// ═══════════════════════════════════════════════════════════════════════════
function NewPackingSheet(p: { visible: boolean; tripId: string; tripMembers: string[]; onClose: () => void; onSave: (item: PackingItem) => void }) {
  const [name, setName] = useState('');
  const [qty, setQty] = useState('');
  const [ownerId, setOwnerId] = useState<string | 'shared'>('shared');

  React.useEffect(() => {
    if (p.visible) { setName(''); setQty(''); setOwnerId('shared'); }
  }, [p.visible]);

  function save() {
    if (!name.trim()) { Alert.alert('Missing item', 'What do you need to pack?'); return; }
    const q = parseInt(qty.replace(/[^0-9]/g, ''), 10);
    p.onSave({
      id: `p-${Date.now()}`,
      tripId: p.tripId,
      ownerId,
      name: name.trim(),
      qty: isNaN(q) || q <= 1 ? undefined : q,
      packed: false,
    });
  }

  return (
    <SheetShell visible={p.visible} onClose={p.onClose} title="Add packing item">
      <ScrollView style={s.sheetBody} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        <Text style={s.fieldLbl}>Item</Text>
        <TextInput style={s.input} value={name} onChangeText={setName} placeholder="e.g. Swimmers" placeholderTextColor={INK4}/>

        <Text style={s.fieldLbl}>Quantity (optional)</Text>
        <TextInput style={s.input} value={qty} onChangeText={setQty} placeholder="e.g. 3" placeholderTextColor={INK4} keyboardType="number-pad"/>

        <Text style={s.fieldLbl}>Who's it for</Text>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          <TouchableOpacity style={[s.memberPill, ownerId === 'shared' && { backgroundColor: INK, borderColor: INK }]} onPress={() => setOwnerId('shared')} activeOpacity={0.75}>
            <Text style={[s.memberPillTxt, ownerId === 'shared' && { color: '#FFFFFF' }]}>🌐 Shared</Text>
          </TouchableOpacity>
          {p.tripMembers.map(mid => {
            const m = memberById(mid);
            if (!m) return null;
            const on = ownerId === mid;
            return (
              <TouchableOpacity key={m.id} style={[s.memberPill, on && { backgroundColor: m.colour, borderColor: m.colour }]} onPress={() => setOwnerId(m.id)} activeOpacity={0.75}>
                <View style={[s.memberPillDot, { backgroundColor: on ? '#FFFFFF' : m.colour }]}/>
                <Text style={[s.memberPillTxt, on && { color: '#FFFFFF' }]}>{m.name}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
          <TouchableOpacity style={[s.btnGhost, { flex: 1 }]} onPress={p.onClose} activeOpacity={0.85}>
            <Text style={s.btnGhostTxt}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.btnPrimary, { flex: 1 }]} onPress={save} activeOpacity={0.85}>
            <Text style={s.btnPrimaryTxt}>Add to list</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SheetShell>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// NEW NOTE SHEET
// ═══════════════════════════════════════════════════════════════════════════
function NewNoteSheet(p: { visible: boolean; tripId: string; onClose: () => void; onSave: (n: TripNote) => void }) {
  const [tag, setTag] = useState<NoteTag>('idea');
  const [text, setText] = useState('');
  const [authorId, setAuthorId] = useState<string>('rich');

  React.useEffect(() => {
    if (p.visible) { setTag('idea'); setText(''); setAuthorId('rich'); }
  }, [p.visible]);

  function save() {
    if (!text.trim()) { Alert.alert('Empty note', 'Add a note first.'); return; }
    p.onSave({
      id: `n-${Date.now()}`,
      tripId: p.tripId,
      tag,
      text: text.trim(),
      authorId,
      createdAt: localDateStr(),
    });
  }

  return (
    <SheetShell visible={p.visible} onClose={p.onClose} title="Add a note">
      <ScrollView style={s.sheetBody} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        <Text style={s.fieldLbl}>Tag</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {(['important','idea','info','question'] as NoteTag[]).map(t => {
            const meta = tagMeta(t);
            const on = tag === t;
            return (
              <TouchableOpacity key={t} style={[s.chip, on && { backgroundColor: meta.fg, borderColor: meta.fg }]} onPress={() => setTag(t)} activeOpacity={0.75}>
                <Text style={[s.chipTxt, on && { color: '#FFFFFF' }]}>{meta.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={s.fieldLbl}>Note</Text>
        <TextInput
          style={[s.input, { minHeight: 120, textAlignVertical: 'top' }]}
          value={text} onChangeText={setText}
          placeholder="Something to remember, an idea, info, a question..."
          placeholderTextColor={INK4} multiline
        />

        <Text style={s.fieldLbl}>Author</Text>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {FAMILY.filter(m => m.id === 'rich' || m.id === 'anna').map(m => {
            const on = authorId === m.id;
            return (
              <TouchableOpacity key={m.id} style={[s.memberPill, on && { backgroundColor: m.colour, borderColor: m.colour }]} onPress={() => setAuthorId(m.id)} activeOpacity={0.75}>
                <View style={[s.memberPillDot, { backgroundColor: on ? '#FFFFFF' : m.colour }]}/>
                <Text style={[s.memberPillTxt, on && { color: '#FFFFFF' }]}>{m.name}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
          <TouchableOpacity style={[s.btnGhost, { flex: 1 }]} onPress={p.onClose} activeOpacity={0.85}>
            <Text style={s.btnGhostTxt}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.btnPrimary, { flex: 1 }]} onPress={save} activeOpacity={0.85}>
            <Text style={s.btnPrimaryTxt}>Save note</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SheetShell>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// EDIT TOTAL BUDGET SHEET — just a total. "Booked" auto-sums bookings.
// ═══════════════════════════════════════════════════════════════════════════
function EditTotalBudgetSheet(p: { visible: boolean; trip: Trip; onClose: () => void; onSave: (total: number) => void }) {
  const [total, setTotal] = useState(String(p.trip.totalBudget ?? ''));

  React.useEffect(() => {
    if (p.visible) setTotal(String(p.trip.totalBudget ?? ''));
  }, [p.visible, p.trip.id]);

  function save() {
    const t = parseFloat(total.replace(/[^0-9.]/g, '')) || 0;
    p.onSave(t);
  }

  return (
    <SheetShell visible={p.visible} onClose={p.onClose} title={`Budget · ${p.trip.destination}`}>
      <ScrollView style={s.sheetBody} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={s.fieldLbl}>Total budget (AUD)</Text>
        <TextInput style={s.input} value={total} onChangeText={setTotal} placeholder="0" placeholderTextColor={INK4} keyboardType="decimal-pad"/>

        <Text style={s.tipTxt}>
          <Text style={{ fontFamily: 'Poppins_700Bold', color: INK }}>How this works: </Text>
          Your <Text style={{ fontFamily: 'Poppins_700Bold', color: INK }}>Booked</Text> total is auto-summed from bookings with amounts. <Text style={{ fontFamily: 'Poppins_700Bold', color: INK }}>Still to plan</Text> is what's left for food, activities and anything you haven't booked yet.
        </Text>

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
          <TouchableOpacity style={[s.btnGhost, { flex: 1 }]} onPress={p.onClose} activeOpacity={0.85}>
            <Text style={s.btnGhostTxt}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.btnPrimary, { flex: 1 }]} onPress={save} activeOpacity={0.85}>
            <Text style={s.btnPrimaryTxt}>Save</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SheetShell>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// EDIT MEMBERS SHEET — who's going
// ═══════════════════════════════════════════════════════════════════════════
function EditMembersSheet(p: { visible: boolean; trip: Trip; onClose: () => void; onSave: (memberIds: string[]) => void }) {
  const [memberIds, setMemberIds] = useState<string[]>(p.trip.memberIds);

  React.useEffect(() => {
    if (p.visible) setMemberIds(p.trip.memberIds);
  }, [p.visible, p.trip.id]);

  function toggle(id: string) {
    setMemberIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  function save() {
    if (memberIds.length === 0) { Alert.alert('Pick at least one', 'Someone has to be going.'); return; }
    p.onSave(memberIds);
  }

  return (
    <SheetShell visible={p.visible} onClose={p.onClose} title={`Who's going · ${p.trip.destination}`}>
      <ScrollView style={s.sheetBody} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={s.fieldLbl}>Tap to add or remove</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {FAMILY.map(m => {
            const on = memberIds.includes(m.id);
            return (
              <TouchableOpacity key={m.id} style={[s.memberPill, on && { backgroundColor: m.colour, borderColor: m.colour }]} onPress={() => toggle(m.id)} activeOpacity={0.75}>
                <View style={[s.memberPillDot, { backgroundColor: on ? '#FFFFFF' : m.colour }]}/>
                <Text style={[s.memberPillTxt, on && { color: '#FFFFFF' }]}>{m.name}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[s.tipTxt, { marginTop: 14 }]}>
          Organiser can't be removed here — change them in trip settings (coming soon).
        </Text>

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
          <TouchableOpacity style={[s.btnGhost, { flex: 1 }]} onPress={p.onClose} activeOpacity={0.85}>
            <Text style={s.btnGhostTxt}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.btnPrimary, { flex: 1 }]} onPress={save} activeOpacity={0.85}>
            <Text style={s.btnPrimaryTxt}>Save</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SheetShell>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════════════════════════════════
const s = StyleSheet.create({
  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: BORDER },
  back: { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(10,10,10,0.06)', alignItems: 'center', justifyContent: 'center' },
  wordmark: { fontFamily: 'Poppins_800ExtraBold', fontSize: 40, letterSpacing: -1.5, lineHeight: 46, color: INK },
  pageLabel: { fontFamily: 'Poppins_700Bold', fontSize: 17, color: INK2 },
  hamburger: { width: 42, height: 42, borderRadius: 12, backgroundColor: 'rgba(10,10,10,0.06)', alignItems: 'center', justifyContent: 'center' },

  // Tab switcher
  tabRow: { flexDirection: 'row', backgroundColor: 'rgba(10,10,10,0.05)', borderRadius: 14, marginHorizontal: 14, marginTop: 14, padding: 4 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 11 },
  tabOn: { backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
  tabTxt: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: INK4 },
  tabTxtOn: { color: TRAVEL_DEEP, fontFamily: 'Poppins_700Bold' },

  // Section label
  secLabel: { fontFamily: 'Poppins_700Bold', fontSize: 12, letterSpacing: 1.2, color: INK4, textTransform: 'uppercase', paddingHorizontal: 22, paddingTop: 14, paddingBottom: 10 },
  empty: { fontFamily: 'Poppins_400Regular', fontSize: 14, color: INK4, textAlign: 'center', paddingVertical: 18 },

  // Trip cards (stack)
  tripCard: { marginHorizontal: 14, marginBottom: 10, borderRadius: 22, overflow: 'hidden' },
  tripHead: { padding: 18, paddingBottom: 10, flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  tripDest: { fontFamily: 'Poppins_800ExtraBold', fontSize: 30, color: INK, letterSpacing: -1, lineHeight: 34 },
  tripCountry: { fontFamily: 'Poppins_500Medium', fontSize: 14, color: INK2, marginTop: 2 },
  tripBadge: { alignSelf: 'flex-start', marginTop: 10, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  tripBadgeTxt: { fontFamily: 'Poppins_700Bold', fontSize: 11, letterSpacing: 0.5 },
  tripFlag: { fontSize: 44, lineHeight: 44 },
  tripStrip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 18, paddingVertical: 10, borderTopWidth: 1, borderTopColor: 'rgba(10,10,10,0.06)' },
  tripStripDot: { width: 8, height: 8, borderRadius: 4 },
  tripStripTxt: { fontFamily: 'Poppins_700Bold', fontSize: 13, color: TRAVEL_DEEP },
  tripFoot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 18, paddingTop: 8, paddingBottom: 16, borderTopWidth: 1, borderTopColor: 'rgba(10,10,10,0.04)' },
  tripDates: { fontFamily: 'Poppins_500Medium', fontSize: 13, color: INK2 },
  tripAvatars: { flexDirection: 'row', alignItems: 'center' },
  tripAv: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.7)' },
  tripAvTxt: { fontFamily: 'Poppins_700Bold', fontSize: 10, color: '#FFFFFF' },

  // Add trip
  addTripCard: { marginHorizontal: 14, marginTop: 2, marginBottom: 14, borderRadius: 18, borderWidth: 1.5, borderStyle: 'dashed', borderColor: TRAVEL_DEEP, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: TRAVEL_SOFT },
  addTripIco: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  addTripTitle: { fontFamily: 'Poppins_700Bold', fontSize: 15, color: TRAVEL_DEEP },
  addTripSub: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: TRAVEL_TXT, marginTop: 2 },

  // Zaeli insight
  insightCard: { marginHorizontal: 14, marginBottom: 10, borderRadius: 18, backgroundColor: '#FAC8A8', padding: 18 },
  insightEye: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  insightStar: { width: 16, height: 16, borderRadius: 5, backgroundColor: TRAVEL, alignItems: 'center', justifyContent: 'center' },
  insightLbl: { fontFamily: 'Poppins_700Bold', fontSize: 10, letterSpacing: 0.8, color: 'rgba(10,10,10,0.42)', textTransform: 'uppercase' },
  insightTxt: { fontFamily: 'Poppins_400Regular', fontSize: 17, color: INK, lineHeight: 26 },

  // Overview hero
  heroCard: { marginHorizontal: 14, marginBottom: 14, borderRadius: 22, padding: 22, flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  heroDest: { fontFamily: 'Poppins_800ExtraBold', fontSize: 38, color: INK, letterSpacing: -1.2, lineHeight: 44 },
  heroCountry: { fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: INK2, marginTop: 2 },
  heroDates: { fontFamily: 'Poppins_500Medium', fontSize: 14, color: INK3, marginTop: 12 },
  heroCd: { backgroundColor: TRAVEL_DEEP, alignSelf: 'flex-start', marginTop: 12, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  heroCdTxt: { fontFamily: 'Poppins_700Bold', fontSize: 13, color: '#FFFFFF', letterSpacing: 0.3 },
  heroFlag: { fontSize: 56, lineHeight: 60 },

  // Generic card
  card: { marginHorizontal: 14, marginBottom: 10, backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, borderRadius: 16, padding: 4 },

  // Members list
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: BORDER },
  memberDot: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  memberInitial: { fontFamily: 'Poppins_700Bold', fontSize: 14, color: '#FFFFFF' },
  memberName: { fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: INK, flex: 1 },
  organiserTag: { backgroundColor: TRAVEL_SOFT, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  organiserTxt: { fontFamily: 'Poppins_700Bold', fontSize: 11, color: TRAVEL_DEEP, letterSpacing: 0.3 },

  // Budget card
  budgetCard: { marginHorizontal: 14, marginBottom: 10, backgroundColor: TRAVEL_SOFT, borderRadius: 18, padding: 18 },
  budgetLbl: { fontFamily: 'Poppins_700Bold', fontSize: 11, letterSpacing: 1.1, color: TRAVEL_DEEP, textTransform: 'uppercase', marginBottom: 4, opacity: 0.7 },
  budgetBig: { fontFamily: 'Poppins_800ExtraBold', fontSize: 34, color: TRAVEL_DEEP, letterSpacing: -1, lineHeight: 40, paddingTop: 2 },
  budgetMid: { fontFamily: 'Poppins_800ExtraBold', fontSize: 24, color: TRAVEL_DEEP, letterSpacing: -0.6, lineHeight: 30, paddingTop: 2 },
  budgetBar: { height: 8, borderRadius: 4, backgroundColor: 'rgba(0,96,160,0.15)', overflow: 'hidden' },
  budgetFill: { height: '100%', borderRadius: 4, backgroundColor: TRAVEL_DEEP },
  budgetSub: { fontFamily: 'Poppins_500Medium', fontSize: 13, color: TRAVEL_DEEP, opacity: 0.8 },
  budgetEdit: { fontFamily: 'Poppins_600SemiBold', fontSize: 12, color: TRAVEL_DEEP, opacity: 0.65, marginTop: 10, textAlign: 'right' },
  budgetSplit: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  budgetSplitLbl: { fontFamily: 'Poppins_700Bold', fontSize: 10, letterSpacing: 0.8, color: TRAVEL_DEEP, textTransform: 'uppercase', opacity: 0.7 },
  budgetSplitVal: { fontFamily: 'Poppins_800ExtraBold', fontSize: 22, color: TRAVEL_DEEP, letterSpacing: -0.5, lineHeight: 28, paddingTop: 2 },
  budgetSplitSub: { fontFamily: 'Poppins_500Medium', fontSize: 11, color: TRAVEL_DEEP, opacity: 0.65, marginTop: 2 },
  packingInlineLbl: { fontFamily: 'Poppins_700Bold', fontSize: 14, color: INK },
  packingInlinePct: { fontFamily: 'Poppins_800ExtraBold', fontSize: 18, color: TRAVEL_DEEP },

  // Bookings
  bkCatHead: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 22, paddingTop: 6, paddingBottom: 10 },
  bkCatEmoji: { fontSize: 20 },
  bkCatName: { fontFamily: 'Poppins_700Bold', fontSize: 16, color: INK, flex: 1 },
  bkCatCount: { fontFamily: 'Poppins_500Medium', fontSize: 12, color: INK4 },
  bkItem: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 14, marginBottom: 6, padding: 12, backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, borderRadius: 14 },
  bkEmojiBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  bkTitle: { fontFamily: 'Poppins_700Bold', fontSize: 15, color: INK },
  bkDetail: { fontFamily: 'Poppins_500Medium', fontSize: 12, color: INK3, marginTop: 2 },
  bkConf: { fontFamily: 'Poppins_500Medium', fontSize: 11, color: INK5, marginTop: 2 },
  bkAmt: { fontFamily: 'Poppins_800ExtraBold', fontSize: 16, color: INK, marginLeft: 6 },

  // Packing
  packingPill: { marginHorizontal: 14, marginBottom: 14, backgroundColor: TRAVEL_SOFT, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  packingPillLbl: { fontFamily: 'Poppins_700Bold', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: TRAVEL_DEEP },
  packingPillBar: { flex: 1, height: 8, borderRadius: 4, backgroundColor: 'rgba(0,96,160,0.15)', overflow: 'hidden' },
  packingPillFill: { height: '100%', borderRadius: 4, backgroundColor: TRAVEL_DEEP },
  packingPillFrac: { fontFamily: 'Poppins_800ExtraBold', fontSize: 14, color: TRAVEL_DEEP },
  packSec: { marginBottom: 14 },
  packSecHead: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 22, paddingBottom: 8 },
  packSecAv: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  packSecAvTxt: { fontFamily: 'Poppins_700Bold', fontSize: 12, color: '#FFFFFF' },
  packSecName: { fontFamily: 'Poppins_700Bold', fontSize: 15, color: INK, flex: 1 },
  packSecCount: { fontFamily: 'Poppins_500Medium', fontSize: 12, color: INK4 },
  packItem: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 14, marginBottom: 6, padding: 14, backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, borderRadius: 14 },
  packCircle: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: 'rgba(10,10,10,0.2)', alignItems: 'center', justifyContent: 'center' },
  packCircleOn: { backgroundColor: TRAVEL_DEEP, borderColor: TRAVEL_DEEP },
  packName: { flex: 1, fontFamily: 'Poppins_500Medium', fontSize: 15, color: INK },
  packNameDone: { color: INK4, textDecorationLine: 'line-through' },
  packQty: { fontFamily: 'Poppins_700Bold', fontSize: 13, color: INK3 },

  // Notes
  noteCard: { marginHorizontal: 14, marginBottom: 8, backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, borderRadius: 16, padding: 16 },
  noteHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  noteTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  noteTagTxt: { fontFamily: 'Poppins_700Bold', fontSize: 11, letterSpacing: 0.3 },
  noteTime: { fontFamily: 'Poppins_500Medium', fontSize: 12, color: INK4 },
  noteTxt: { fontFamily: 'Poppins_400Regular', fontSize: 15, color: INK, lineHeight: 22 },
  noteAuthor: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  noteAuthorDot: { width: 8, height: 8, borderRadius: 4 },
  noteAuthorName: { fontFamily: 'Poppins_600SemiBold', fontSize: 12, color: INK3 },

  // Add card
  addCard: { marginHorizontal: 14, marginTop: 2, marginBottom: 6, borderRadius: 14, borderWidth: 1.5, borderColor: 'rgba(10,10,10,0.15)', borderStyle: 'dashed', padding: 14, flexDirection: 'row', alignItems: 'center', gap: 8 },
  addCardTxt: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: INK4 },

  // Sheet shell
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheetCard: { height: H * 0.92, backgroundColor: BG, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(10,10,10,0.14)', alignSelf: 'center', marginTop: 12 },
  sheetHdr: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: BORDER },
  sheetTitle: { fontFamily: 'Poppins_700Bold', fontSize: 17, color: INK },
  sheetX: { paddingHorizontal: 10, paddingVertical: 5, backgroundColor: 'rgba(10,10,10,0.06)', borderRadius: 8 },
  sheetXTxt: { fontFamily: 'Poppins_600SemiBold', fontSize: 12, color: INK3 },
  sheetBody: { flex: 1, paddingHorizontal: 14, paddingTop: 14 },

  // Form fields
  fieldLbl: { fontFamily: 'Poppins_700Bold', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: INK4, marginTop: 12, marginBottom: 6 },
  input: { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: BORDER, paddingHorizontal: 14, paddingVertical: 12, fontFamily: 'Poppins_500Medium', fontSize: 15, color: INK },
  inputTxt: { fontFamily: 'Poppins_500Medium', fontSize: 15, color: INK },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(10,10,10,0.1)' },
  chipOn: { backgroundColor: TRAVEL_DEEP, borderColor: TRAVEL_DEEP },
  chipTxt: { fontFamily: 'Poppins_600SemiBold', fontSize: 12, color: INK3 },
  chipTxtOn: { color: '#FFFFFF' },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  emojiOpt: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: BORDER, alignItems: 'center', justifyContent: 'center' },
  emojiOptOn: { borderColor: TRAVEL_DEEP, backgroundColor: TRAVEL_SOFT, borderWidth: 2 },
  bgOpt: { minWidth: 72, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: BORDER },
  bgOptOn: { borderWidth: 2, borderColor: TRAVEL_DEEP },
  bgOptTxt: { fontFamily: 'Poppins_700Bold', fontSize: 12, color: INK2 },
  tog: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10, borderWidth: 1.5, borderColor: BORDER, backgroundColor: '#FFFFFF' },
  togOn: { borderColor: TRAVEL_DEEP, backgroundColor: TRAVEL_SOFT },
  togTxt: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: INK4 },
  togTxtOn: { color: TRAVEL_DEEP, fontFamily: 'Poppins_700Bold' },

  memberPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: 'rgba(10,10,10,0.12)', backgroundColor: '#FFFFFF' },
  memberPillDot: { width: 10, height: 10, borderRadius: 5 },
  memberPillTxt: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: INK2 },

  tipTxt: { fontFamily: 'Poppins_500Medium', fontSize: 13, color: INK3, lineHeight: 19, padding: 12, paddingHorizontal: 14, backgroundColor: CARD, borderRadius: 10, borderWidth: 1, borderColor: BORDER, marginTop: 14 },

  btnPrimary: { backgroundColor: TRAVEL_DEEP, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  btnPrimaryTxt: { fontFamily: 'Poppins_700Bold', fontSize: 14, color: '#FFFFFF' },
  btnGhost: { backgroundColor: '#FFFFFF', borderRadius: 12, paddingVertical: 13, alignItems: 'center', borderWidth: 1, borderColor: BORDER },
  btnGhostTxt: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: INK2 },
});
