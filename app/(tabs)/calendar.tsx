import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';

const DUMMY_FAMILY_ID = '00000000-0000-0000-0000-000000000001';
const DUMMY_MEMBER_ID = '00000000-0000-0000-0000-000000000002';

const COLORS = {
  bg: '#0A0F1E', card: '#141929', card2: '#1A2235', border: '#1E2840',
  blue: '#4A90D9', blueLight: 'rgba(74,144,217,0.12)', blueBorder: 'rgba(74,144,217,0.25)',
  text: '#FFFFFF', text2: 'rgba(255,255,255,0.55)', text3: 'rgba(255,255,255,0.28)',
  green: '#1DB87A', orange: '#E8922A',
  purple: '#9B7FD4', red: '#D64F3E', redLight: 'rgba(214,79,62,0.12)', redBorder: 'rgba(214,79,62,0.25)',
};

const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

interface FamilyMember { id: string; name: string; avatar?: string; colour?: string; }
interface CalEvent {
  id: string; title: string; start_time: string; end_time?: string;
  colour?: string; member_id?: string; member_ids?: string[]; notes?: string; location?: string;
  all_day?: boolean; repeat?: string;
}
type ViewMode = 'day' | 'week' | 'month';

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true });
const getDurationMins = (start: string, end?: string) =>
  end ? (new Date(end).getTime() - new Date(start).getTime()) / 60000 : 60;

// Convert DD-MM-YYYY to YYYY-MM-DD
const toISODate = (val: string) => {
  const parts = val.split('-');
  if (parts.length === 3 && parts[0].length === 2) return `${parts[2]}-${parts[1]}-${parts[0]}`;
  return val;
};

// Convert YYYY-MM-DD to DD-MM-YYYY
const toDisplayDate = (d: Date) => {
  const dd = d.getDate().toString().padStart(2,'0');
  const mm = (d.getMonth()+1).toString().padStart(2,'0');
  return `${dd}-${mm}-${d.getFullYear()}`;
};

// ─── LOCATION SEARCH ──────────────────────────────────────────────────────────
function LocationSearch({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const timer = useRef<any>(null);

  const search = (text: string) => {
    setQuery(text);
    onChange(text);
    clearTimeout(timer.current);
    if (text.length < 3) { setResults([]); return; }
    timer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(text)}&format=json&limit=4&countrycodes=au`,
          { headers: { 'User-Agent': 'ZaeliApp/1.0' } }
        );
        const data = await res.json();
        setResults(data);
      } catch {}
      setSearching(false);
    }, 600);
  };

  const pick = (item: any) => {
    const label = item.display_name.split(',').slice(0,3).join(', ');
    setQuery(label); onChange(label); setResults([]);
  };

  return (
    <View>
      <TextInput style={styles.fieldInput} value={query} onChangeText={search}
        placeholder="Search address..." placeholderTextColor={COLORS.text3} />
      {searching && <Text style={{ color: COLORS.text3, fontSize: 12, marginTop: 6 }}>Searching...</Text>}
      {results.map((r, i) => (
        <TouchableOpacity key={i} style={styles.locationResult} onPress={() => pick(r)}>
          <Text style={styles.locationResultTxt} numberOfLines={2}>
            📍 {r.display_name.split(',').slice(0,3).join(', ')}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ─── EVENT MODAL ──────────────────────────────────────────────────────────────
function EventModal({ visible, onClose, onSaved, editEvent, members, defaultDate }: {
  visible: boolean; onClose: () => void; onSaved: () => void;
  editEvent?: CalEvent | null; members: FamilyMember[]; defaultDate?: Date;
}) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [allDay, setAllDay] = useState(false);
  const [repeat, setRepeat] = useState('none');
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set([DUMMY_MEMBER_ID]));
  const [saving, setSaving] = useState(false);
  const REPEATS = ['none', 'daily', 'weekly', 'fortnightly', 'monthly'];

  useEffect(() => {
    if (!visible) return;
    if (editEvent) {
      const d = new Date(editEvent.start_time);
      setTitle(editEvent.title);
      setDate(toDisplayDate(d));
      setStartTime(d.toTimeString().slice(0,5));
      setEndTime(editEvent.end_time ? new Date(editEvent.end_time).toTimeString().slice(0,5) : '');
      setLocation(editEvent.location || '');
      setNotes(editEvent.notes || '');
      setAllDay(editEvent.all_day || false);
      setRepeat(editEvent.repeat || 'none');
      const ids = editEvent.member_ids || (editEvent.member_id ? [editEvent.member_id] : [DUMMY_MEMBER_ID]);
      setSelectedMembers(new Set(ids));
    } else {
      const d = defaultDate || new Date();
      setTitle(''); setLocation(''); setNotes(''); setAllDay(false); setRepeat('none');
      setDate(toDisplayDate(d));
      const h = d.getHours();
      setStartTime(`${h.toString().padStart(2,'0')}:00`);
      setEndTime(`${(h+1).toString().padStart(2,'0')}:00`);
      setSelectedMembers(new Set([DUMMY_MEMBER_ID]));
    }
  }, [visible]);

  const toggleMember = (id: string) => {
    const next = new Set(selectedMembers);
    if (next.has(id)) { if (next.size > 1) next.delete(id); }
    else next.add(id);
    setSelectedMembers(next);
  };

  // Colour from first selected member
  const firstMember = members.find(m => selectedMembers.has(m.id));
  const colour = firstMember?.colour || COLORS.blue;

  const save = async () => {
    if (!title.trim()) { Alert.alert('Please add a title'); return; }
    if (!date.trim()) { Alert.alert('Please add a date'); return; }
    setSaving(true);
    try {
      const isoDate = toISODate(date);
      const startISO = `${isoDate}T${allDay ? '00:00' : startTime}:00`;
      const endISO = `${isoDate}T${allDay ? '23:59' : (endTime || startTime)}:00`;
      const memberIdsArr = Array.from(selectedMembers);
      const payload = {
        family_id: DUMMY_FAMILY_ID,
        member_id: memberIdsArr[0],
        title: title.trim(),
        date: isoDate,
        time: allDay ? '00:00:00' : `${startTime}:00`,
        start_time: startISO,
        end_time: endISO,
        colour,
        location: location || null,
        notes: notes || null,
        all_day: allDay,
        repeat: repeat === 'none' ? null : repeat,
      };
      if (editEvent) {
        const { error } = await supabase.from('events').update(payload).eq('id', editEvent.id);
        if (error) { Alert.alert('Error saving', error.message); setSaving(false); return; }
      } else {
        const { error } = await supabase.from('events').insert(payload);
        if (error) { Alert.alert('Error saving', error.message); setSaving(false); return; }
        await supabase.from('activity_log').insert({
          family_id: DUMMY_FAMILY_ID, member_id: memberIdsArr[0],
          activity_type: 'calendar', title: `📅 ${title.trim()} added`, icon: '📅', link_tab: 'calendar',
        });
      }
      onSaved(); onClose();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
    setSaving(false);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <StatusBar style="light" />
      <SafeAreaView style={[styles.modalSafe, { borderTopWidth: 3, borderTopColor: colour }]}>
        {/* Fixed header - always visible */}
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose} style={styles.modalCancelBtn}>
            <Text style={styles.modalCancel}>✕ Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>{editEvent ? 'Edit Event' : '✦ New Event'}</Text>
          <TouchableOpacity onPress={save} disabled={saving} style={[styles.modalSavePill, { backgroundColor: colour }]}>
            <Text style={styles.modalSaveText}>{saving ? '...' : 'Save'}</Text>
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }} keyboardVerticalOffset={0}>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

            <View style={styles.modalSection}>
              <TextInput style={styles.titleInput} value={title} onChangeText={setTitle}
                placeholder="What's happening?" placeholderTextColor={COLORS.text3} autoFocus={false} />
            </View>

            {/* Who - multi select */}
            <View style={styles.modalSection}>
              <Text style={styles.modalLabel}>👥 Who's involved</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {members.map(m => {
                    const active = selectedMembers.has(m.id);
                    return (
                      <TouchableOpacity key={m.id}
                        style={[styles.memberChip, active && {
                          backgroundColor: (m.colour || COLORS.blue) + '30',
                          borderColor: m.colour || COLORS.blue,
                        }]}
                        onPress={() => toggleMember(m.id)}>
                        <Text style={{ fontSize: 20 }}>{m.avatar || '👤'}</Text>
                        <Text style={[styles.memberChipName, active && { color: m.colour || COLORS.blue, fontWeight: '700' }]}>
                          {m.name}
                        </Text>
                        {active && <Text style={{ color: m.colour || COLORS.blue, fontSize: 12 }}>✓</Text>}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            </View>

            {/* All day */}
            <View style={styles.modalSection}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.modalLabel}>🌅 All day</Text>
                <Switch value={allDay} onValueChange={setAllDay}
                  trackColor={{ false: COLORS.border, true: colour }} thumbColor="#fff" />
              </View>
            </View>

            {/* Date & time */}
            <View style={styles.modalSection}>
              <Text style={styles.modalLabel}>📅 Date (DD-MM-YYYY)</Text>
              <TextInput style={styles.fieldInput} value={date} onChangeText={setDate}
                placeholder="08-03-2026" placeholderTextColor={COLORS.text3}
                keyboardType="numbers-and-punctuation" />
              {!allDay && (
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalLabelSm}>Start (HH:MM)</Text>
                    <TextInput style={styles.fieldInput} value={startTime} onChangeText={setStartTime}
                      placeholder="09:00" placeholderTextColor={COLORS.text3} keyboardType="numbers-and-punctuation" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalLabelSm}>End (HH:MM)</Text>
                    <TextInput style={styles.fieldInput} value={endTime} onChangeText={setEndTime}
                      placeholder="10:00" placeholderTextColor={COLORS.text3} keyboardType="numbers-and-punctuation" />
                  </View>
                </View>
              )}
            </View>

            {/* Repeat */}
            <View style={styles.modalSection}>
              <Text style={styles.modalLabel}>🔁 Repeat</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {REPEATS.map(r => (
                    <TouchableOpacity key={r}
                      style={[styles.repeatChip, repeat === r && { backgroundColor: colour + '25', borderColor: colour }]}
                      onPress={() => setRepeat(r)}>
                      <Text style={[styles.repeatChipText, repeat === r && { color: colour, fontWeight: '700' }]}>
                        {r.charAt(0).toUpperCase() + r.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Location with autocomplete */}
            <View style={styles.modalSection}>
              <Text style={styles.modalLabel}>📍 Location</Text>
              <LocationSearch value={location} onChange={setLocation} />
            </View>

            {/* Notes */}
            <View style={styles.modalSection}>
              <Text style={styles.modalLabel}>📝 Notes</Text>
              <TextInput style={[styles.fieldInput, { height: 80, textAlignVertical: 'top' }]}
                value={notes} onChangeText={setNotes}
                placeholder="Add notes" placeholderTextColor={COLORS.text3} multiline />
            </View>

            {editEvent && (
              <View style={styles.modalSection}>
                <TouchableOpacity style={styles.deleteBtn} onPress={() => {
                  Alert.alert('Delete Event', 'Remove this event?', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: async () => {
                      await supabase.from('events').delete().eq('id', editEvent.id);
                      onSaved(); onClose();
                    }},
                  ]);
                }}>
                  <Text style={styles.deleteBtnText}>🗑 Delete Event</Text>
                </TouchableOpacity>
              </View>
            )}
            <View style={{ height: 80 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

// ─── EVENT DETAIL ─────────────────────────────────────────────────────────────
function EventDetail({ event, visible, onClose, onEdit, onDelete }: {
  event: CalEvent | null; visible: boolean;
  onClose: () => void; onEdit: () => void; onDelete: () => void;
}) {
  if (!event) return null;
  const colour = event.colour || COLORS.blue;
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={[styles.modalSafe, { borderTopWidth: 4, borderTopColor: colour }]}>
        <View style={styles.detailTopBar}>
          <TouchableOpacity onPress={onClose} style={styles.detailCloseBtn}>
            <Text style={styles.detailCloseTxt}>✕</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onEdit} style={[styles.detailEditBtn, { borderColor: colour }]}>
            <Text style={[styles.detailEditTxt, { color: colour }]}>✏️ Edit</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={{ padding: 24 }}>
          <Text style={styles.detailTitle}>{event.title}</Text>
          <Text style={styles.detailTime}>
            {event.all_day ? '🌅 All day' : `⏰ ${formatTime(event.start_time)}${event.end_time ? ` — ${formatTime(event.end_time)}` : ''}`}
          </Text>
          {event.location ? <Text style={styles.detailMeta}>📍 {event.location}</Text> : null}
          {event.repeat ? <Text style={styles.detailMeta}>🔁 {event.repeat}</Text> : null}
          {event.notes ? <Text style={styles.detailMeta}>📝 {event.notes}</Text> : null}
          <TouchableOpacity style={[styles.deleteBtn, { marginTop: 32 }]} onPress={onDelete}>
            <Text style={styles.deleteBtnText}>🗑 Delete Event</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ─── MAIN SCREEN ──────────────────────────────────────────────────────────────
export default function CalendarScreen() {
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalEvent | null>(null);
  const [defaultEventDate, setDefaultEventDate] = useState(new Date());
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set(['all']));
  const dateStripRef = useRef<ScrollView>(null);
  const dayScrollRef = useRef<ScrollView>(null);

  useEffect(() => { loadData(); }, []);
  useEffect(() => {
    if (viewMode === 'day') {
      setTimeout(() => {
        const hour = new Date().getHours();
        dayScrollRef.current?.scrollTo({ y: Math.max(0, (hour - 1) * 72), animated: true });
      }, 400);
    }
  }, [viewMode]);

  const loadData = async () => {
    const [eventsRes, membersRes] = await Promise.all([
      supabase.from('events').select('*').eq('family_id', DUMMY_FAMILY_ID).order('start_time'),
      supabase.from('family_members').select('*').eq('family_id', DUMMY_FAMILY_ID),
    ]);
    if (eventsRes.data) setEvents(eventsRes.data);
    if (membersRes.data) setMembers(membersRes.data);
  };

  const getEventsForDay = (date: Date) => {
    const filtered = events.filter(e => isSameDay(new Date(e.start_time), date));
    if (activeFilters.has('all')) return filtered;
    return filtered.filter(e => e.member_id && activeFilters.has(e.member_id));
  };

  const openAdd = (date?: Date) => {
    setDefaultEventDate(date || currentDate);
    setSelectedEvent(null);
    setAddModalVisible(true);
  };
  const openDetail = (event: CalEvent) => { setSelectedEvent(event); setDetailVisible(true); };
  const openEdit = () => { setDetailVisible(false); setTimeout(() => setEditModalVisible(true), 300); };
  const handleDelete = async () => {
    if (!selectedEvent) return;
    Alert.alert('Delete Event', 'Remove this event?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await supabase.from('events').delete().eq('id', selectedEvent.id);
        setDetailVisible(false); loadData();
      }},
    ]);
  };

  // ── Date strip ────────────────────────────────────────────────────────────
  const renderDateStrip = () => {
    const today = new Date();
    const dates = Array.from({ length: 60 }, (_, i) => {
      const d = new Date(today); d.setDate(today.getDate() - 14 + i); return d;
    });
    return (
      <ScrollView ref={dateStripRef} horizontal showsHorizontalScrollIndicator={false}
        style={styles.dateStrip} contentContainerStyle={styles.dateStripContent}
        onLayout={() => setTimeout(() => dateStripRef.current?.scrollTo({ x: 14 * 56, animated: false }), 100)}>
        {dates.map((d, i) => {
          const isToday = isSameDay(d, today);
          const isSel = isSameDay(d, currentDate);
          const dayEvts = events.filter(e => isSameDay(new Date(e.start_time), d));
          return (
            <TouchableOpacity key={i} style={[styles.dateCell, isSel && styles.dateCellActive]}
              onPress={() => setCurrentDate(new Date(d))}>
              <Text style={[styles.dateCellDay, isToday && { color: COLORS.blue }, isSel && { color: '#fff' }]}>
                {DAY_NAMES[d.getDay()]}
              </Text>
              <View style={[styles.dateCellNum, isToday && !isSel && styles.dateCellNumToday, isSel && styles.dateCellNumSel]}>
                <Text style={[styles.dateCellNumTxt, isSel && { color: '#fff' }, isToday && !isSel && { color: COLORS.blue }]}>
                  {d.getDate()}
                </Text>
              </View>
              <View style={styles.dateCellDots}>
                {dayEvts.slice(0,3).map((e,j) => (
                  <View key={j} style={[styles.dateDot, { backgroundColor: e.colour || COLORS.blue }]} />
                ))}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    );
  };

  // ── Month strip ───────────────────────────────────────────────────────────
  const renderMonthStrip = () => {
    const months = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(); d.setMonth(d.getMonth() - 3 + i); return d;
    });
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={styles.dateStrip} contentContainerStyle={styles.dateStripContent}>
        {months.map((d, i) => {
          const isSel = d.getMonth() === currentDate.getMonth() && d.getFullYear() === currentDate.getFullYear();
          return (
            <TouchableOpacity key={i} style={[styles.monthChip, isSel && styles.monthChipActive]}
              onPress={() => setCurrentDate(new Date(d.getFullYear(), d.getMonth(), 1))}>
              <Text style={[styles.monthChipText, isSel && { color: COLORS.blue }]}>
                {MONTHS_SHORT[d.getMonth()]}{d.getFullYear() !== new Date().getFullYear() ? ` ${d.getFullYear()}` : ''}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    );
  };

  // ── Filter bar ────────────────────────────────────────────────────────────
  const renderFilterBar = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}
      style={styles.filterBar} contentContainerStyle={styles.filterContent}>
      <TouchableOpacity
        style={[styles.filterChip, activeFilters.has('all') && styles.filterChipAll]}
        onPress={() => setActiveFilters(new Set(['all']))}>
        <Text style={styles.filterChipTxt}>👨‍👩‍👧‍👦 All</Text>
      </TouchableOpacity>
      {members.map(m => {
        const active = activeFilters.has(m.id);
        return (
          <TouchableOpacity key={m.id}
            style={[styles.filterChip, active && { backgroundColor: (m.colour || COLORS.blue) + '22', borderColor: m.colour || COLORS.blue }]}
            onPress={() => {
              const next = new Set(activeFilters); next.delete('all');
              if (next.has(m.id)) { next.delete(m.id); if (next.size === 0) next.add('all'); }
              else next.add(m.id);
              setActiveFilters(next);
            }}>
            <Text style={styles.filterChipTxt}>{m.avatar || '👤'} {m.name}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  // ── Day view ──────────────────────────────────────────────────────────────
  const renderDayView = () => {
    const dayEvts = getEventsForDay(currentDate);
    const allDayEvts = dayEvts.filter(e => e.all_day);
    const timedEvts = dayEvts.filter(e => !e.all_day);
    return (
      <ScrollView ref={dayScrollRef} showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
        {allDayEvts.length > 0 && (
          <View style={styles.allDaySection}>
            {allDayEvts.map(e => (
              <TouchableOpacity key={e.id}
                style={[styles.allDayPill, { backgroundColor: (e.colour || COLORS.blue) + '22', borderColor: e.colour || COLORS.blue }]}
                onPress={() => openDetail(e)}>
                <Text style={[styles.allDayText, { color: e.colour || COLORS.blue }]}>🌅 {e.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        {HOURS.map(hour => {
          const hourEvts = timedEvts.filter(e => new Date(e.start_time).getHours() === hour);
          const label = hour === 0 ? '12am' : hour < 12 ? `${hour}am` : hour === 12 ? '12pm' : `${hour-12}pm`;
          const isNow = new Date().getHours() === hour && isSameDay(currentDate, new Date());
          return (
            <TouchableOpacity key={hour} style={styles.hourRow} activeOpacity={0.6}
              onPress={() => { const d = new Date(currentDate); d.setHours(hour,0,0,0); openAdd(d); }}>
              <View style={styles.hourLeft}>
                <Text style={[styles.hourLabel, isNow && { color: COLORS.blue, fontWeight: '700' }]}>{label}</Text>
                {isNow && <View style={styles.nowDot} />}
              </View>
              <View style={[styles.hourRight, isNow && styles.hourRightNow]}>
                {hourEvts.map(event => (
                  <TouchableOpacity key={event.id}
                    style={[styles.eventCard, {
                      backgroundColor: (event.colour || COLORS.blue) + '18',
                      borderLeftColor: event.colour || COLORS.blue,
                      minHeight: Math.max(56, getDurationMins(event.start_time, event.end_time) * 0.9),
                    }]}
                    onPress={ev => { ev.stopPropagation(); openDetail(event); }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={[styles.eventDot, { backgroundColor: event.colour || COLORS.blue }]} />
                      <Text style={[styles.eventCardTitle, { color: event.colour || COLORS.blue }]} numberOfLines={1}>
                        {event.title}
                      </Text>
                    </View>
                    <Text style={styles.eventCardTime}>
                      {formatTime(event.start_time)}{event.end_time ? ` — ${formatTime(event.end_time)}` : ''}
                    </Text>
                    {event.location ? <Text style={styles.eventCardLocation} numberOfLines={1}>📍 {event.location}</Text> : null}
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableOpacity>
          );
        })}
        <View style={{ height: 120 }} />
      </ScrollView>
    );
  };

  // ── Week view ─────────────────────────────────────────────────────────────
  const renderWeekView = () => {
    const start = new Date(currentDate);
    start.setDate(currentDate.getDate() - currentDate.getDay());
    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start); d.setDate(start.getDate() + i); return d;
    });
    return (
      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
        {weekDays.map((day, i) => {
          const dayEvts = getEventsForDay(day);
          const isToday = isSameDay(day, new Date());
          const isSel = isSameDay(day, currentDate);
          return (
            <View key={i} style={[styles.weekDayRow, isSel && styles.weekDayRowSel]}>
              <TouchableOpacity style={styles.weekDayRowLeft}
                onPress={() => { setCurrentDate(day); setViewMode('day'); }}>
                <Text style={[styles.weekDayRowDay, isToday && { color: COLORS.blue }]}>
                  {DAY_NAMES[day.getDay()]}
                </Text>
                <View style={[styles.weekDayRowNum, isToday && styles.weekDayRowNumToday]}>
                  <Text style={[styles.weekDayRowNumTxt, isToday && { color: '#fff' }]}>{day.getDate()}</Text>
                </View>
                {isToday && <View style={styles.weekTodayBadge}><Text style={styles.weekTodayBadgeTxt}>Today</Text></View>}
              </TouchableOpacity>
              <View style={styles.weekDayEvents}>
                {dayEvts.length === 0
                  ? <Text style={styles.weekDayEmpty}>Nothing on</Text>
                  : dayEvts.map((e, j) => (
                    <TouchableOpacity key={j}
                      style={[styles.weekEventCard, { borderLeftColor: e.colour || COLORS.blue, backgroundColor: (e.colour || COLORS.blue) + '18' }]}
                      onPress={() => openDetail(e)}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <View style={[styles.weekEventDot, { backgroundColor: e.colour || COLORS.blue }]} />
                        <Text style={[styles.weekEventTitle, { color: e.colour || COLORS.blue }]} numberOfLines={1}>{e.title}</Text>
                      </View>
                      <Text style={styles.weekEventTime}>{formatTime(e.start_time)}{e.end_time ? ` — ${formatTime(e.end_time)}` : ''}</Text>
                      {e.location ? <Text style={styles.weekEventLocation} numberOfLines={1}>📍 {e.location}</Text> : null}
                    </TouchableOpacity>
                  ))
                }
              </View>
            </View>
          );
        })}
        <View style={{ height: 100 }} />
      </ScrollView>
    );
  };

  // ── Month view ────────────────────────────────────────────────────────────
  const renderMonthView = () => {
    const y = currentDate.getFullYear(); const m = currentDate.getMonth();
    const firstDay = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m+1, 0).getDate();
    const cells = Array.from({ length: firstDay + daysInMonth }, (_, i) =>
      i < firstDay ? null : new Date(y, m, i - firstDay + 1));
    const selectedEvts = getEventsForDay(currentDate);
    return (
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.monthDayHeaders}>
          {DAY_NAMES.map(d => <Text key={d} style={styles.monthDayHeader}>{d}</Text>)}
        </View>
        <View style={styles.monthGrid}>
          {cells.map((day, i) => {
            if (!day) return <View key={i} style={styles.monthCell} />;
            const dayEvts = getEventsForDay(day);
            const isToday = isSameDay(day, new Date());
            const isSel = isSameDay(day, currentDate);
            return (
              <TouchableOpacity key={i} style={[styles.monthCell, isSel && styles.monthCellSel]}
                onPress={() => setCurrentDate(day)}>
                <View style={[styles.monthNum, isToday && styles.monthNumToday]}>
                  <Text style={[styles.monthNumTxt, isToday && { color: '#fff' }]}>{day.getDate()}</Text>
                </View>
                <View style={styles.monthDots}>
                  {dayEvts.slice(0,3).map((e,j) => (
                    <View key={j} style={[styles.monthDot, { backgroundColor: e.colour || COLORS.blue }]} />
                  ))}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
        {selectedEvts.length > 0 && (
          <View style={styles.monthEventList}>
            <Text style={styles.monthEventListTitle}>
              {DAY_NAMES[currentDate.getDay()]} {currentDate.getDate()} {MONTHS[currentDate.getMonth()]}
            </Text>
            {selectedEvts.map(e => (
              <TouchableOpacity key={e.id} style={styles.monthEventRow} onPress={() => openDetail(e)}>
                <View style={[styles.monthEventBar, { backgroundColor: e.colour || COLORS.blue }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.monthEventTitle}>{e.title}</Text>
                  <Text style={styles.monthEventTime}>{e.all_day ? 'All day' : formatTime(e.start_time)}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar style="light" />

      <EventModal visible={addModalVisible} onClose={() => setAddModalVisible(false)}
        onSaved={loadData} members={members} defaultDate={defaultEventDate} />
      <EventModal visible={editModalVisible} onClose={() => setEditModalVisible(false)}
        onSaved={loadData} editEvent={selectedEvent} members={members} />
      <EventDetail event={selectedEvent} visible={detailVisible}
        onClose={() => setDetailVisible(false)} onEdit={openEdit} onDelete={handleDelete} />

      <View style={styles.topBar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.topBarMonth}>{MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}</Text>
          <Text style={styles.topBarDate}>{DAY_NAMES[currentDate.getDay()]}, {currentDate.getDate()} {MONTHS[currentDate.getMonth()]}</Text>
        </View>
        <TouchableOpacity style={styles.todayBtn} onPress={() => setCurrentDate(new Date())}>
          <Text style={styles.todayBtnTxt}>Today</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.addBtn} onPress={() => openAdd()}>
          <Text style={styles.addBtnTxt}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.viewToggle}>
        {(['day','week','month'] as ViewMode[]).map(mode => (
          <TouchableOpacity key={mode}
            style={[styles.toggleBtn, viewMode === mode && styles.toggleBtnActive]}
            onPress={() => setViewMode(mode)}>
            <Text style={[styles.toggleBtnTxt, viewMode === mode && styles.toggleBtnTxtActive]}>
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {viewMode !== 'month' ? renderDateStrip() : renderMonthStrip()}
      {renderFilterBar()}

      <View style={{ flex: 1 }}>
        {viewMode === 'day' && renderDayView()}
        {viewMode === 'week' && renderWeekView()}
        {viewMode === 'month' && renderMonthView()}
      </View>

      <TouchableOpacity style={styles.fab} onPress={() => openAdd()}>
        <Text style={styles.fabTxt}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },

  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12, gap: 10 },
  topBarMonth: { fontSize: 11, fontWeight: '600', color: COLORS.blue, textTransform: 'uppercase', letterSpacing: 1 },
  topBarDate: { fontSize: 20, fontWeight: '700', color: COLORS.text, letterSpacing: -0.3, marginTop: 2 },
  todayBtn: { backgroundColor: COLORS.blueLight, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1.5, borderColor: COLORS.blueBorder },
  todayBtnTxt: { fontSize: 12, color: COLORS.blue, fontWeight: '600' },
  addBtn: { backgroundColor: COLORS.blue, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7 },
  addBtnTxt: { fontSize: 12, color: '#fff', fontWeight: '700' },

  viewToggle: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 10, backgroundColor: COLORS.card, borderRadius: 12, padding: 3, borderWidth: 1.5, borderColor: COLORS.border },
  toggleBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  toggleBtnActive: { backgroundColor: COLORS.blue },
  toggleBtnTxt: { fontSize: 13, fontWeight: '600', color: COLORS.text2 },
  toggleBtnTxtActive: { color: '#fff', fontWeight: '700' },

  dateStrip: { maxHeight: 82, marginBottom: 6 },
  dateStripContent: { paddingHorizontal: 12, gap: 4, alignItems: 'center' },
  dateCell: { alignItems: 'center', paddingHorizontal: 6, paddingVertical: 6, borderRadius: 14, minWidth: 48, gap: 3 },
  dateCellActive: { backgroundColor: COLORS.blue },
  dateCellDay: { fontSize: 10, fontWeight: '600', color: COLORS.text3, textTransform: 'uppercase', letterSpacing: 0.3 },
  dateCellNum: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  dateCellNumToday: { borderWidth: 2, borderColor: COLORS.blue },
  dateCellNumSel: { backgroundColor: 'rgba(255,255,255,0.2)' },
  dateCellNumTxt: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  dateCellDots: { flexDirection: 'row', gap: 2 },
  dateDot: { width: 4, height: 4, borderRadius: 2 },

  monthChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.card, borderWidth: 1.5, borderColor: COLORS.border },
  monthChipActive: { backgroundColor: COLORS.blueLight, borderColor: COLORS.blueBorder },
  monthChipText: { fontSize: 13, fontWeight: '600', color: COLORS.text2 },

  filterBar: { maxHeight: 44, marginBottom: 8 },
  filterContent: { paddingHorizontal: 16, gap: 8, alignItems: 'center' },
  filterChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  filterChipAll: { backgroundColor: COLORS.blueLight, borderColor: COLORS.blueBorder },
  filterChipTxt: { fontSize: 12, color: COLORS.text2, fontWeight: '500' },

  allDaySection: { paddingHorizontal: 16, paddingVertical: 8, gap: 6 },
  allDayPill: { borderRadius: 10, padding: 10, borderWidth: 1.5 },
  allDayText: { fontSize: 13, fontWeight: '600' },

  hourRow: { flexDirection: 'row', minHeight: 72 },
  hourLeft: { width: 56, alignItems: 'flex-end', paddingRight: 10, paddingTop: 10, position: 'relative' },
  hourLabel: { fontSize: 11, color: COLORS.text3, fontWeight: '500' },
  nowDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.blue, position: 'absolute', right: -4, top: 14 },
  hourRight: { flex: 1, borderTopWidth: 1, borderTopColor: COLORS.border + '40', paddingHorizontal: 10, paddingVertical: 6, gap: 6 },
  hourRightNow: { borderTopColor: COLORS.blue, borderTopWidth: 1.5 },
  eventCard: { borderLeftWidth: 4, borderRadius: 12, padding: 12, gap: 4 },
  eventDot: { width: 8, height: 8, borderRadius: 4 },
  eventCardTitle: { fontSize: 14, fontWeight: '700', flex: 1 },
  eventCardTime: { fontSize: 11, color: COLORS.text3, marginLeft: 16 },
  eventCardLocation: { fontSize: 11, color: COLORS.text3, marginLeft: 16 },

  weekDayRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 14, alignItems: 'flex-start' },
  weekDayRowSel: { backgroundColor: COLORS.blueLight },
  weekDayRowLeft: { width: 52, alignItems: 'center', gap: 4 },
  weekDayRowDay: { fontSize: 11, fontWeight: '700', color: COLORS.text3, textTransform: 'uppercase', letterSpacing: 0.5 },
  weekDayRowNum: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  weekDayRowNumToday: { backgroundColor: COLORS.blue },
  weekDayRowNumTxt: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  weekTodayBadge: { backgroundColor: COLORS.blue, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  weekTodayBadgeTxt: { fontSize: 9, color: '#fff', fontWeight: '700' },
  weekDayEmpty: { fontSize: 13, color: COLORS.text3, flex: 1, paddingTop: 8 },
  weekDayEvents: { flex: 1, gap: 8 },
  weekEventCard: { borderLeftWidth: 3, borderRadius: 10, padding: 10, gap: 3 },
  weekEventDot: { width: 7, height: 7, borderRadius: 4 },
  weekEventTitle: { fontSize: 13, fontWeight: '700', flex: 1 },
  weekEventTime: { fontSize: 11, color: COLORS.text3, marginLeft: 13 },
  weekEventLocation: { fontSize: 11, color: COLORS.text3, marginLeft: 13 },

  monthDayHeaders: { flexDirection: 'row', paddingHorizontal: 8, marginBottom: 4 },
  monthDayHeader: { flex: 1, textAlign: 'center', fontSize: 10, fontWeight: '700', color: COLORS.text3, textTransform: 'uppercase' },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8 },
  monthCell: { width: '14.28%', aspectRatio: 0.85, alignItems: 'center', paddingVertical: 4, borderRadius: 10 },
  monthCellSel: { backgroundColor: COLORS.blueLight },
  monthNum: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  monthNumToday: { backgroundColor: COLORS.blue },
  monthNumTxt: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  monthDots: { flexDirection: 'row', gap: 2, marginTop: 2 },
  monthDot: { width: 4, height: 4, borderRadius: 2 },
  monthEventList: { margin: 16, backgroundColor: COLORS.card, borderRadius: 16, padding: 16, borderWidth: 1.5, borderColor: COLORS.border },
  monthEventListTitle: { fontSize: 13, fontWeight: '700', color: COLORS.blue, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.8 },
  monthEventRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  monthEventBar: { width: 4, height: 36, borderRadius: 2 },
  monthEventTitle: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  monthEventTime: { fontSize: 12, color: COLORS.text2, marginTop: 2 },

  modalSafe: { flex: 1, backgroundColor: COLORS.bg },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalCancelBtn: { backgroundColor: COLORS.card2, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1.5, borderColor: COLORS.border },
  modalCancel: { fontSize: 13, color: COLORS.text2, fontWeight: '600' },
  modalTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  modalSavePill: { borderRadius: 10, paddingHorizontal: 18, paddingVertical: 8 },
  modalSaveText: { fontSize: 14, color: '#fff', fontWeight: '700' },
  modalSection: { paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalLabel: { fontSize: 13, fontWeight: '600', color: COLORS.text2, marginBottom: 10 },
  modalLabelSm: { fontSize: 11, color: COLORS.text3, marginBottom: 6 },
  titleInput: { fontSize: 22, fontWeight: '700', color: COLORS.text, paddingVertical: 8 },
  fieldInput: { backgroundColor: COLORS.card2, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12, padding: 14, fontSize: 15, color: COLORS.text },
  memberChip: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.card2, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  memberChipName: { fontSize: 13, color: COLORS.text2, fontWeight: '500' },
  repeatChip: { backgroundColor: COLORS.card2, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  repeatChipText: { fontSize: 13, color: COLORS.text2, fontWeight: '500' },
  locationResult: { backgroundColor: COLORS.card2, borderRadius: 10, padding: 12, marginTop: 6, borderWidth: 1, borderColor: COLORS.border },
  locationResultTxt: { fontSize: 13, color: COLORS.text2 },
  deleteBtn: { backgroundColor: COLORS.redLight, borderWidth: 1.5, borderColor: COLORS.redBorder, borderRadius: 14, padding: 16, alignItems: 'center' },
  deleteBtnText: { fontSize: 15, color: COLORS.red, fontWeight: '600' },

  detailTopBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  detailCloseBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.card2, alignItems: 'center', justifyContent: 'center' },
  detailCloseTxt: { fontSize: 14, color: COLORS.text2 },
  detailEditBtn: { borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 },
  detailEditTxt: { fontSize: 14, fontWeight: '600' },
  detailTitle: { fontSize: 26, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  detailTime: { fontSize: 15, color: COLORS.text2, marginBottom: 8 },
  detailMeta: { fontSize: 14, color: COLORS.text2, marginBottom: 8 },

  fab: { position: 'absolute', bottom: 24, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.blue, alignItems: 'center', justifyContent: 'center', shadowColor: COLORS.blue, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },
  fabTxt: { fontSize: 28, color: '#fff', fontWeight: '300', marginTop: -2 },
});