/**
 * Calendar Screen - V6 Final
 * app/(tabs)/calendar.tsx
 */

import { useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';

const DUMMY_FAMILY_ID = '00000000-0000-0000-0000-000000000001';

const C = {
  blue:   '#0057FF', mag:    '#E0007C', ink:    '#0A0A0A',
  ink2:   'rgba(0,0,0,0.50)', ink3:   'rgba(0,0,0,0.28)',
  border: 'rgba(0,0,0,0.07)', bg:     '#F7F7F7',
  card:   '#FFFFFF', green:  '#00C97A', orange: '#FF8C00',
  yellow: '#FFE500',
};

const DAYS_SHORT = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const DAYS_HDR   = ['M','T','W','T','F','S','S'];
const MONTHS     = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const EV_COLORS  = [C.mag, C.blue, C.orange, C.green, '#9B6DD6', '#00B4D8'];

// Duration options — extended to cover full day events
const DURATION_OPTIONS = [
  '15 min','30 min','45 min',
  '1 hr','1.5 hr','2 hr','2.5 hr','3 hr','3.5 hr','4 hr',
  '5 hr','6 hr','8 hr','All day',
];
const DURATION_MINS = [
  15,30,45,
  60,90,120,150,180,210,240,
  300,360,480,1439,
];

const FAMILY_MEMBERS = [
  { id:'1', name:'Natalie', color:C.blue },
  { id:'2', name:'Mark',    color:C.orange },
  { id:'3', name:'Duke',    color:'#4A90E2' },
  { id:'4', name:'Poppy',   color:'#9B6DD6' },
  { id:'5', name:'Gab',     color:'#00B4D8' },
];

// Hour/minute options for time picker
const HOURS   = Array.from({ length:12 }, (_, i) => i + 1);
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

function evColor(i: number) { return EV_COLORS[i % EV_COLORS.length]; }
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}
function fmtTime(iso: string) {
  // Extract time directly from the string — never use new Date() which shifts timezone
  // Format: "2026-03-11T20:55:00" or "2026-03-11 20:55:00"
  const timePart = iso ? iso.replace('T',' ').split(' ')[1] || '' : '';
  if (!timePart) return '';
  const [hStr, mStr] = timePart.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  const ampm = h >= 12 ? 'pm' : 'am';
  const h12  = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2,'0')} ${ampm}`;
}
function getDaysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
function getFirstDayOfMonth(y: number, m: number) { return (new Date(y, m, 1).getDay() + 6) % 7; }
function addDays(date: Date, n: number) { const d = new Date(date); d.setDate(d.getDate() + n); return d; }

// ── PULSING AVATAR ────────────────────────────────────────────
function PulsingAvatar({ color = C.blue }: { color?: string }) {
  const scale   = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.55)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.parallel([
        Animated.timing(scale,   { toValue:1.18, duration:900, easing:Easing.inOut(Easing.ease), useNativeDriver:true }),
        Animated.timing(opacity, { toValue:0,    duration:900, easing:Easing.in(Easing.ease),    useNativeDriver:true }),
      ]),
      Animated.parallel([
        Animated.timing(scale,   { toValue:1, duration:0, useNativeDriver:true }),
        Animated.timing(opacity, { toValue:0.55, duration:0, useNativeDriver:true }),
      ]),
      Animated.delay(700),
    ])).start();
  }, []);
  return (
    <View style={{ width:30, height:30, alignItems:'center', justifyContent:'center' }}>
      <Animated.View style={{
        position:'absolute', width:30, height:30, borderRadius:10,
        backgroundColor:color, transform:[{ scale }], opacity,
      }}/>
      <View style={{ width:30, height:30, borderRadius:10, backgroundColor:color, alignItems:'center', justifyContent:'center' }}>
        <Text style={{ fontSize:15, color:'#fff' }}>{'✦'}</Text>
      </View>
    </View>
  );
}

// ── PULSING FAB ───────────────────────────────────────────────
function PulsingFAB({ onPress }: { onPress: () => void }) {
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const pulse = (ring: Animated.Value, delay: number) =>
      Animated.loop(Animated.sequence([
        Animated.delay(delay),
        Animated.timing(ring, { toValue:1, duration:1200, easing:Easing.out(Easing.quad), useNativeDriver:true }),
        Animated.timing(ring, { toValue:0, duration:0, useNativeDriver:true }),
      ])).start();
    pulse(ring1, 0);
    pulse(ring2, 600);
  }, []);
  const ringStyle = (r: Animated.Value) => ({
    position: 'absolute' as const,
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: C.blue,
    opacity: r.interpolate({ inputRange:[0,0.3,1], outputRange:[0,0.35,0] }),
    transform: [{ scale: r.interpolate({ inputRange:[0,1], outputRange:[1,1.7] }) }],
  });
  return (
    <View style={s.fabWrap}>
      <Animated.View style={ringStyle(ring1)}/>
      <Animated.View style={ringStyle(ring2)}/>
      <TouchableOpacity style={s.fab} onPress={onPress} activeOpacity={0.85}>
        <Text style={{ fontSize:22, color:'#fff' }}>{'✦'}</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── BRIEFING CARD ─────────────────────────────────────────────
function BriefingCard({
  events, onDismiss, onChat,
}: {
  events: any[]; onDismiss: () => void; onChat: () => void;
}) {
  const cardFade = useRef(new Animated.Value(0)).current;
  const [gone, setGone] = useState(false);

  useEffect(() => {
    Animated.timing(cardFade, { toValue:1, duration:400, useNativeDriver:true }).start();
  }, []);

  const dismiss = () => {
    Animated.timing(cardFade, { toValue:0, duration:200, useNativeDriver:true }).start(() => {
      setGone(true);
      onDismiss();
    });
  };

  const clashes = events.filter((e, i) =>
    events.some((f, j) =>
      i !== j
      && new Date(e.start_time) < new Date(f.end_time || f.start_time)
      && new Date(f.start_time) < new Date(e.end_time || e.start_time)
    )
  );
  const hasClash = clashes.length > 0;

  const now = new Date();
  const timeStr = now.getHours() % 12 + ':' + String(now.getMinutes()).padStart(2,'0') + ' ' + (now.getHours() < 12 ? 'am' : 'pm');

  let msg = '';
  let btn1 = '';
  let btn2 = '';

  if (hasClash) {
    msg  = "Ooh, bit of a scheduling clash coming up. Want me to take a look and help sort it out?";
    btn1 = 'Yes please, help me sort it';
    btn2 = "I will handle it";
  } else if (events.length === 0) {
    msg  = "Nothing in the calendar yet — a blank slate! Want me to help fill it with something good?";
    btn1 = 'Let me know';
    btn2 = 'All good for now';
  } else {
    msg  = "Looking good so far! Anything new coming up I should know about?";
    btn1 = 'Add something';
    btn2 = 'All sorted, thanks';
  }

  if (gone) return null;

  return (
    <Animated.View style={[s.briefingCard, { opacity:cardFade }]}>
      <View style={s.briefingHeader}>
        <PulsingAvatar color={C.blue}/>
        <Text style={s.briefingName}>
          {'Z'}<Text style={{ color:C.mag }}>{'a'}</Text>{'el'}<Text style={{ color:C.mag }}>{'i'}</Text>
        </Text>
        <Text style={s.briefingTime}>{timeStr}</Text>
      </View>
      <View style={s.briefingBody}>
        <Text style={s.briefingMsg}>{msg}</Text>
        <View style={s.briefingBtns}>
          <TouchableOpacity style={s.btnPrimary} onPress={onChat} activeOpacity={0.85}>
            <Text style={s.btnPrimaryTxt}>{btn1}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.btnGhost} onPress={dismiss} activeOpacity={0.7}>
            <Text style={s.btnGhostTxt}>{btn2}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

// ── RELAXED CARD ──────────────────────────────────────────────
function RelaxedCard({ onChat }: { onChat: () => void }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeAnim, { toValue:1, duration:350, useNativeDriver:true }).start();
  }, []);

  const now     = new Date();
  const timeStr = now.getHours() % 12 + ':' + String(now.getMinutes()).padStart(2,'0') + ' ' + (now.getHours() < 12 ? 'am' : 'pm');

  return (
    <Animated.View style={[s.briefingCard, { opacity:fadeAnim, borderColor:'rgba(0,87,255,0.08)' }]}>
      <View style={[s.briefingHeader, { backgroundColor:'rgba(0,87,255,0.02)' }]}>
        <View style={{ width:30, height:30, borderRadius:10, backgroundColor:C.blue, alignItems:'center', justifyContent:'center' }}>
          <Text style={{ fontSize:14, color:'#fff' }}>{'✦'}</Text>
        </View>
        <Text style={s.briefingName}>
          {'Z'}<Text style={{ color:C.mag }}>{'a'}</Text>{'el'}<Text style={{ color:C.mag }}>{'i'}</Text>
        </Text>
        <Text style={s.briefingTime}>{timeStr}</Text>
      </View>
      <View style={s.briefingBody}>
        <Text style={s.briefingMsg}>
          Still here, still paying attention. Tap to chat, add something new, or just see what is coming up.
        </Text>
        <TouchableOpacity style={s.btnPrimary} onPress={onChat} activeOpacity={0.85}>
          <Text style={s.btnPrimaryTxt}>Open Zaeli</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

// ── TIME PICKER ───────────────────────────────────────────────
function TimePicker({
  hour, minute, ampm, onHour, onMinute, onAmpm,
}: {
  hour: number; minute: number; ampm: 'am'|'pm';
  onHour: (h: number) => void; onMinute: (m: number) => void; onAmpm: (a: 'am'|'pm') => void;
}) {
  return (
    <View style={s.timePicker}>
      {/* Hours */}
      <ScrollView style={s.timeCol} showsVerticalScrollIndicator={false}>
        {HOURS.map(h => (
          <TouchableOpacity key={h} style={[s.timeCell, hour === h && s.timeCellOn]}
            onPress={() => onHour(h)} activeOpacity={0.7}>
            <Text style={[s.timeCellTxt, hour === h && s.timeCellTxtOn]}>{h}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <Text style={s.timeColon}>{':'}</Text>
      {/* Minutes */}
      <ScrollView style={s.timeCol} showsVerticalScrollIndicator={false}>
        {MINUTES.map(m => (
          <TouchableOpacity key={m} style={[s.timeCell, minute === m && s.timeCellOn]}
            onPress={() => onMinute(m)} activeOpacity={0.7}>
            <Text style={[s.timeCellTxt, minute === m && s.timeCellTxtOn]}>
              {String(m).padStart(2, '0')}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      {/* AM/PM */}
      <View style={s.ampmCol}>
        {(['am', 'pm'] as const).map(a => (
          <TouchableOpacity key={a} style={[s.timeCell, s.ampmCell, ampm === a && s.timeCellOn]}
            onPress={() => onAmpm(a)} activeOpacity={0.7}>
            <Text style={[s.timeCellTxt, ampm === a && s.timeCellTxtOn]}>
              {a.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// ── ADD EVENT MODAL ───────────────────────────────────────────
function AddEventModal({ visible, onClose, onSaved, defaultDate }: {
  visible: boolean; onClose: () => void; onSaved: () => void; defaultDate: Date;
}) {
  const toLocalDateStr = (d: Date) => {
    const y  = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${mo}-${dd}`;
  };

  const [tab,      setTab]      = useState<'details'|'people'>('details');
  const [title,    setTitle]    = useState('');
  const [notes,    setNotes]    = useState('');
  const [location, setLocation] = useState('');
  const [dateStr,  setDateStr]  = useState(toLocalDateStr(defaultDate));
  const [hour,     setHour]     = useState(9);
  const [minute,   setMinute]   = useState(0);
  const [ampm,     setAmpm]     = useState<'am'|'pm'>('am');
  const [durIdx,   setDurIdx]   = useState(3);
  const [assignees,setAssignees]= useState<string[]>(['1']);
  const [saving,   setSaving]   = useState(false);
  const [showCal,  setShowCal]  = useState(false);
  const [calDate,  setCalDate]  = useState(defaultDate);

  const toggleAssignee = (id: string) => {
    setAssignees(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  // Build mini calendar days
  const calFirstDay = getFirstDayOfMonth(calDate.getFullYear(), calDate.getMonth());
  const calDim      = getDaysInMonth(calDate.getFullYear(), calDate.getMonth());
  const calPrevDim  = getDaysInMonth(calDate.getFullYear(), calDate.getMonth() - 1);
  const calCells: { day: number; cur: boolean; date: Date }[] = [];
  for (let i = calFirstDay - 1; i >= 0; i--) {
    calCells.push({ day: calPrevDim - i, cur: false, date: new Date(calDate.getFullYear(), calDate.getMonth() - 1, calPrevDim - i) });
  }
  for (let d = 1; d <= calDim; d++) {
    calCells.push({ day: d, cur: true, date: new Date(calDate.getFullYear(), calDate.getMonth(), d) });
  }
  while (calCells.length % 7 !== 0) {
    const n = calCells.length - calFirstDay - calDim + 1;
    calCells.push({ day: n, cur: false, date: new Date(calDate.getFullYear(), calDate.getMonth() + 1, n) });
  }

  const save = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const h24 = ampm === 'pm'
        ? (hour === 12 ? 12 : hour + 12)
        : (hour === 12 ? 0 : hour);

      const [y, mo, dd] = dateStr.split('-').map(Number);
      const endMins  = DURATION_MINS[durIdx];
      const endH     = durMins === 1439 ? 23 : Math.floor((h24 * 60 + minute + endMins) / 60) % 24;
      const endM     = durMins === 1439 ? 59 : (h24 * 60 + minute + endMins) % 60;
      const durMins  = endMins;

      // Store as naive local datetime string — no timezone conversion
      const pad = (n: number) => String(n).padStart(2,'0');
      const startStr = `${dateStr}T${pad(h24)}:${pad(minute)}:00`;
      const endStr   = durMins === 1439
        ? `${dateStr}T23:59:00`
        : `${dateStr}T${pad(endH)}:${pad(endM)}:00`;

      const notesVal = [notes.trim(), location.trim()].filter(Boolean).join(' | ');

      const payload: any = {
        family_id:  DUMMY_FAMILY_ID,
        title:      title.trim(),
        notes:      notesVal,
        date:       dateStr,
        start_time: startStr,
        end_time:   endStr,
        assignees:  assignees,
      };

      console.log('=== SAVE EVENT ===', JSON.stringify(payload));
      let { error } = await supabase.from('events').insert(payload);

      // Retry without assignees if that column causes schema error
      if (error && (error.message?.includes('assignees') || error.code === '42703')) {
        console.log('Retrying without assignees...');
        const { assignees: _a, ...slim } = payload;
        const r2 = await supabase.from('events').insert(slim);
        error = r2.error;
      }

      if (error) {
        console.log('=== INSERT FAILED ===', JSON.stringify(error));
        setSaving(false);
        return;
      }

      console.log('=== SAVED OK ===');
      setTitle(''); setNotes(''); setLocation('');
      onSaved();
    } catch (e: any) {
      console.log('=== SAVE EXCEPTION ===', e?.message || String(e));
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex:1, backgroundColor:'#fff' }} edges={['top']}>
        <KeyboardAvoidingView
          style={{ flex:1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}>

          {/* Header */}
          <View style={s.modalHdr}>
            <TouchableOpacity onPress={onClose}>
              <Text style={s.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={s.modalTitle}>New Event</Text>
            <TouchableOpacity onPress={save} disabled={!title.trim() || saving}>
              <Text style={[s.modalSave, (!title.trim() || saving) && { opacity:0.35 }]}>
                {saving ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          <View style={s.modalTabs}>
            {(['details', 'people'] as const).map(t => (
              <TouchableOpacity key={t} style={[s.modalTab, tab === t && s.modalTabOn]}
                onPress={() => setTab(t)} activeOpacity={0.8}>
                <Text style={[s.modalTabTxt, tab === t && s.modalTabTxtOn]}>
                  {t === 'details' ? 'Details' : 'People'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView
            contentContainerStyle={{ padding:20, paddingBottom:40 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">
          {tab === 'details' ? (
            <View style={{ gap:16 }}>

              {/* Title */}
              <View style={s.formField}>
                <Text style={s.formLabel}>Title *</Text>
                <TextInput style={s.formInput} value={title} onChangeText={setTitle}
                  placeholder="What is the event?" placeholderTextColor={C.ink3} autoFocus/>
              </View>

              {/* Notes */}
              <View style={s.formField}>
                <Text style={s.formLabel}>Notes</Text>
                <TextInput style={[s.formInput, { height:72, textAlignVertical:'top', paddingTop:12 }]}
                  value={notes} onChangeText={setNotes} multiline
                  placeholder="Details, reminders..." placeholderTextColor={C.ink3}/>
              </View>

              {/* Location */}
              <View style={s.formField}>
                <Text style={s.formLabel}>Location</Text>
                <TextInput style={s.formInput} value={location} onChangeText={setLocation}
                  placeholder="Address or place name" placeholderTextColor={C.ink3}/>
              </View>

              {/* Date */}
              <View style={s.formField}>
                <Text style={s.formLabel}>Date</Text>
                <TouchableOpacity style={s.formInput} onPress={() => setShowCal(v => !v)} activeOpacity={0.8}>
                  <Text style={{ fontFamily:'Poppins_500Medium', fontSize:15, color:C.ink }}>
                    {new Date(dateStr + 'T12:00:00').toLocaleDateString('en-AU', {
                      weekday:'long', day:'numeric', month:'long', year:'numeric',
                    })}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Mini calendar */}
              {showCal && (
                <View style={s.miniCal}>
                  <View style={s.miniCalNav}>
                    <TouchableOpacity style={s.miniCalArrBtn} onPress={() => {
                      setCalDate(d => {
                        const n = new Date(d);
                        n.setMonth(n.getMonth() - 1);
                        return n;
                      });
                    }}>
                      <Text style={s.miniCalArr}>{'<'}</Text>
                    </TouchableOpacity>
                    <Text style={s.miniCalLbl}>
                      {MONTHS[calDate.getMonth()]} {calDate.getFullYear()}
                    </Text>
                    <TouchableOpacity style={s.miniCalArrBtn} onPress={() => {
                      setCalDate(d => {
                        const n = new Date(d);
                        n.setMonth(n.getMonth() + 1);
                        return n;
                      });
                    }}>
                      <Text style={s.miniCalArr}>{'>'}</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={s.miniCalGrid}>
                    {DAYS_HDR.map((d, i) => (
                      <Text key={i} style={s.miniCalHdr}>{d}</Text>
                    ))}
                    {calCells.map((cell, i) => {
                      const isSel = dateStr === toLocalDateStr(cell.date);
                      return (
                        <TouchableOpacity key={i} style={[s.miniCalDay, isSel && s.miniCalDaySel]}
                          onPress={() => {
                            setDateStr(toLocalDateStr(cell.date));
                            setShowCal(false);
                          }} activeOpacity={0.7}>
                          <Text style={[
                            s.miniCalDayTxt,
                            !cell.cur && { color:C.ink3 },
                            isSel && { color:'#fff' },
                          ]}>
                            {cell.day}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Time */}
              <View style={s.formField}>
                <Text style={s.formLabel}>Time</Text>
                <TimePicker
                  hour={hour} minute={minute} ampm={ampm}
                  onHour={setHour} onMinute={setMinute} onAmpm={setAmpm}
                />
              </View>

              {/* Duration */}
              <View style={s.formField}>
                <Text style={s.formLabel}>Duration</Text>
                <View style={s.durGrid}>
                  {DURATION_OPTIONS.map((d, i) => (
                    <TouchableOpacity key={i} style={[s.durChip, durIdx === i && s.durChipOn]}
                      onPress={() => setDurIdx(i)} activeOpacity={0.8}>
                      <Text style={[s.durChipTxt, durIdx === i && s.durChipTxtOn]}>{d}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

            </View>
          ) : (
            <View style={{ gap:12 }}>
              <Text style={s.formLabel}>Assign to</Text>
              <Text style={{ fontFamily:'Poppins_400Regular', fontSize:13, color:C.ink2, lineHeight:20 }}>
                Tick who this event is for. Untick yourself to assign it to someone else only.
              </Text>
              {FAMILY_MEMBERS.map(m => {
                const on = assignees.includes(m.id);
                return (
                  <TouchableOpacity
                    key={m.id}
                    style={[s.memberRow, on && { borderColor: m.color + '40', backgroundColor: m.color + '08' }]}
                    onPress={() => toggleAssignee(m.id)} activeOpacity={0.8}>
                    <View style={[s.memberDot, { backgroundColor:m.color }]}/>
                    <Text style={s.memberName}>{m.name}</Text>
                    <View style={[s.memberCheck, on && { backgroundColor:m.color, borderColor:m.color }]}>
                      {on && <Text style={{ color:'#fff', fontSize:12, fontFamily:'Poppins_700Bold' }}>{'v'}</Text>}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

// ── MAIN SCREEN ───────────────────────────────────────────────
export default function CalendarScreen() {
  const router = useRouter();
  const today  = new Date();

  const [view,          setView]          = useState<'day'|'week'|'month'>('day');
  const [selectedDate,  setSelectedDate]  = useState(new Date(today));
  const [calMonth,      setCalMonth]      = useState(today.getMonth());
  const [calYear,       setCalYear]       = useState(today.getFullYear());
  const [events,        setEvents]        = useState<any[]>([]);
  const [cardDismissed, setCardDismissed] = useState(false);
  const [showRelaxed,   setShowRelaxed]   = useState(false);
  const [showAddModal,  setShowAddModal]  = useState(false);

  // Strip: 180 days centred on today (index 60 = today)
  const STRIP_BEFORE = 60;
  const PILL_W       = 56; // 52px pill + 4px gap
  const stripDays    = Array.from({ length:180 }, (_, i) => addDays(today, i - STRIP_BEFORE));
  const weekStripRef = useRef<ScrollView>(null);

  useEffect(() => {
    // Delay to ensure ScrollView is fully mounted and laid out
    const t = setTimeout(() => {
      weekStripRef.current?.scrollTo({ x: STRIP_BEFORE * PILL_W, animated:false });
    }, 400);
    return () => clearTimeout(t);
  }, []);

  const loadEvents = useCallback(async () => {
    try {
      const fromDate = `${calYear}-${String(calMonth + 1).padStart(2,'0')}-01`;
      const toYear   = calMonth === 11 ? calYear + 1 : calYear;
      const toMonth  = calMonth === 11 ? 1 : calMonth + 2;
      const toDate   = `${toYear}-${String(toMonth).padStart(2,'0')}-01`;
      const { data, error } = await supabase
        .from('events').select('*')
        .eq('family_id', DUMMY_FAMILY_ID)
        .gte('date', fromDate)
        .lt('date', toDate)
        .order('start_time');
      if (!error) setEvents(data || []);
      else console.log('loadEvents error:', error);
    } catch (e) { console.log('loadEvents exception:', e); }
  }, [calMonth, calYear]);

  // Reload when month changes
  useEffect(() => { loadEvents(); }, [loadEvents]);

  // Reload every time the screen comes into focus (e.g. returning from chat)
  useFocusEffect(useCallback(() => { loadEvents(); }, [loadEvents]));

  useEffect(() => {
    setCalMonth(selectedDate.getMonth());
    setCalYear(selectedDate.getFullYear());
  }, [selectedDate]);

  // Use the date column (YYYY-MM-DD local) for day comparisons — avoids UTC parse issues
  const toLocalDateStr = (d: Date) =>
    d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');

  const selectedDateStr = toLocalDateStr(selectedDate);
  const todayStr        = toLocalDateStr(today);

  const dayEvents     = events.filter(e => (e.date || '') === selectedDateStr);
  const upcomingEvs   = events.filter(e => (e.date || '') >= todayStr);
  const daysWithEvSet = new Set(events.map(e => e.date || ''));

  const handleDismiss = () => {
    setCardDismissed(true);
    setTimeout(() => setShowRelaxed(true), 300);
  };

  const openChat = () => router.push({ pathname:'/(tabs)/zaeli-chat', params:{ channel:'Calendar', returnTo:'/(tabs)/calendar' } });

  const scrollToToday = () => {
    setSelectedDate(new Date(today));
    // Snap today (index STRIP_BEFORE) to the left edge of the scroll
    weekStripRef.current?.scrollTo({ x: STRIP_BEFORE * PILL_W, animated:true });
  };

  // Week view
  const weekStart = new Date(selectedDate);
  weekStart.setDate(selectedDate.getDate() - ((selectedDate.getDay() + 6) % 7));
  const weekDays7 = Array.from({ length:7 }, (_, i) => addDays(weekStart, i));

  // Render a single event row (used in day + week views)
  const renderEvent = (ev: any, i: number, allEventsForDay: any[]) => {
    const isClash = allEventsForDay.some((f, j) =>
      i !== j
      && new Date(ev.start_time) < new Date(f.end_time || f.start_time)
      && new Date(f.start_time) < new Date(ev.end_time || ev.start_time)
    );
    const timeStr = fmtTime(ev.start_time);
    const tp      = timeStr.match(/(\d+:\d+)\s*(am|pm)/i);

    return (
      <TouchableOpacity key={ev.id} style={[s.eventItem, isClash && s.eventClash]} activeOpacity={0.7}>
        <View style={s.evTimeCol}>
          <Text style={s.evT}>{tp ? tp[1] : timeStr}</Text>
          <Text style={s.evD}>{tp ? tp[2] : ''}</Text>
        </View>
        <View style={[s.evLine, { backgroundColor: isClash ? C.mag : evColor(i) }]}/>
        <View style={s.evBody}>
          <Text style={s.evName}>{ev.title}</Text>
          {ev.notes ? (
            <Text style={[s.evMeta, isClash && { color:C.mag }]} numberOfLines={1}>
              {isClash ? 'Zaeli flagged - clash detected' : ev.notes}
            </Text>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  // Month grid cells
  const buildMonthCells = () => {
    const dim      = getDaysInMonth(calYear, calMonth);
    const firstDay = getFirstDayOfMonth(calYear, calMonth);
    const prevDim  = getDaysInMonth(calYear, calMonth - 1);
    const cells: { day:number; cur:boolean; date:Date }[] = [];
    for (let i = firstDay - 1; i >= 0; i--) {
      cells.push({ day: prevDim - i, cur:false, date: new Date(calYear, calMonth - 1, prevDim - i) });
    }
    for (let d = 1; d <= dim; d++) {
      cells.push({ day: d, cur:true, date: new Date(calYear, calMonth, d) });
    }
    while (cells.length % 7 !== 0) {
      const n = cells.length - firstDay - dim + 1;
      cells.push({ day: n, cur:false, date: new Date(calYear, calMonth + 1, n) });
    }
    return cells;
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar style="light"/>

      {/* ── HERO — logo + toggle only ── */}
      <View style={s.hero}>
        <View style={s.heroCircle}/>

        {/* Logo row */}
        <View style={s.heroRow}>
          <View style={s.logoMark}>
            <View style={s.logoStarBox}>
              <Text style={s.logoStarTxt}>{'✦'}</Text>
            </View>
            <Text style={s.logoWord}>
              {'z'}<Text style={{ color:C.yellow }}>{'a'}</Text>{'el'}<Text style={{ color:C.yellow }}>{'i'}</Text>
            </Text>
          </View>
          <Text style={s.heroTitle}>Calendar</Text>
        </View>

        {/* Day | Week | Month toggle — bigger */}
        <View style={s.viewTog}>
          {(['day','week','month'] as const).map(v => (
            <TouchableOpacity key={v} style={[s.vt, view === v && s.vtOn]}
              onPress={() => setView(v)} activeOpacity={0.8}>
              <Text style={[s.vtTxt, view === v && s.vtTxtOn]}>
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── DATE STRIP — white bar below hero, Day + Week views ── */}
      {view !== 'month' && (
        <View style={s.stripBar}>
          <ScrollView
            ref={weekStripRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal:10, paddingVertical:8, gap:4 }}>
            {stripDays.map((d, i) => {
              const isToday    = sameDay(d, today);
              const isSelected = sameDay(d, selectedDate);
              const key        = toLocalDateStr(d);
              const hasEv      = daysWithEvSet.has(key);
              const showMonth  = d.getDate() === 1;
              return (
                <View key={i} style={{ alignItems:'center' }}>
                  {showMonth
                    ? <Text style={s.stripMonthLabel}>{MONTHS_SHORT[d.getMonth()]}</Text>
                    : <View style={{ height:14 }}/>
                  }
                  <TouchableOpacity
                    style={[
                      s.dayPill,
                      isToday    && s.dayPillToday,
                      isSelected && !isToday && s.dayPillSelected,
                    ]}
                    onPress={() => setSelectedDate(new Date(d))}
                    activeOpacity={0.8}>
                    <Text style={[s.dpDay, (isToday || isSelected) && { color:'#fff', opacity:1 }]}>
                      {DAYS_SHORT[(d.getDay() + 6) % 7]}
                    </Text>
                    <Text style={[s.dpNum, (isToday || isSelected) && { color:'#fff' }]}>
                      {d.getDate()}
                    </Text>
                    <View style={[s.dpDot, hasEv && s.dpDotHas]}/>
                  </TouchableOpacity>
                </View>
              );
            })}
          </ScrollView>
          {/* Jump to today — appears when today not selected */}
          {!sameDay(selectedDate, today) && (
            <TouchableOpacity style={s.todayBtn} onPress={scrollToToday} activeOpacity={0.8}>
              <Text style={s.todayBtnTxt}>Back to Today</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ── CONTENT ── */}
      <View style={s.content}>

        {/* DAY VIEW */}
        {view === 'day' && (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom:120 }}>
            {!cardDismissed
              ? <BriefingCard events={upcomingEvs} onDismiss={handleDismiss} onChat={openChat}/>
              : showRelaxed && <RelaxedCard onChat={openChat}/>
            }
            <Text style={s.slbl}>
              {selectedDate.toLocaleDateString('en-AU', {
                weekday:'long', day:'numeric', month:'long',
              }).toUpperCase()}
            </Text>
            {dayEvents.map((ev, i) => renderEvent(ev, i, dayEvents))}
            <TouchableOpacity style={s.addBtn} onPress={() => setShowAddModal(true)} activeOpacity={0.7}>
              <Text style={s.addPlus}>{'+  Add event'}</Text>
            </TouchableOpacity>
          </ScrollView>
        )}

        {/* WEEK VIEW */}
        {view === 'week' && (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom:120 }}>
            {!cardDismissed
              ? <BriefingCard events={upcomingEvs} onDismiss={handleDismiss} onChat={openChat}/>
              : showRelaxed && <RelaxedCard onChat={openChat}/>
            }
            {weekDays7.map((d, di) => {
              const devs    = events.filter(e => (e.date || '') === toLocalDateStr(d));
              const isTod   = sameDay(d, today);
              const isSel   = sameDay(d, selectedDate);
              return (
                <TouchableOpacity key={di} activeOpacity={0.85}
                  onPress={() => { setSelectedDate(new Date(d)); setView('day'); }}>
                  <View style={[s.weekRow, isTod && { borderLeftColor:C.blue, borderLeftWidth:3 }]}>
                    <View style={s.weekDayCol}>
                      <Text style={[s.weekDayName, isTod && { color:C.blue }]}>
                        {DAYS_SHORT[(d.getDay() + 6) % 7]}
                      </Text>
                      <View style={[s.weekDayNum, isTod && { backgroundColor:C.mag }]}>
                        <Text style={[s.weekDayNumTxt, isTod && { color:'#fff' }]}>{d.getDate()}</Text>
                      </View>
                    </View>
                    <View style={s.weekEvCol}>
                      {devs.length === 0
                        ? <Text style={s.weekEmpty}>Free</Text>
                        : devs.map((ev, i) => (
                          <View key={ev.id} style={[s.weekEvChip, { backgroundColor: evColor(i) + '18', borderLeftColor: evColor(i) }]}>
                            <Text style={[s.weekEvTxt, { color: evColor(i) }]} numberOfLines={1}>{ev.title}</Text>
                            <Text style={s.weekEvTime}>{fmtTime(ev.start_time)}</Text>
                          </View>
                        ))
                      }
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* MONTH VIEW */}
        {view === 'month' && (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom:120 }}>
            {!cardDismissed
              ? <BriefingCard events={upcomingEvs} onDismiss={handleDismiss} onChat={openChat}/>
              : showRelaxed && <RelaxedCard onChat={openChat}/>
            }

            {/* Month nav */}
            <View style={s.monthNav}>
              <TouchableOpacity style={s.monthArr} onPress={() => {
                if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
                else setCalMonth(m => m - 1);
              }}>
                <Text style={s.monthArrTxt}>{'<'}</Text>
              </TouchableOpacity>
              <Text style={s.monthLbl}>{MONTHS[calMonth]} {calYear}</Text>
              <TouchableOpacity style={s.monthArr} onPress={() => {
                if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
                else setCalMonth(m => m + 1);
              }}>
                <Text style={s.monthArrTxt}>{'>'}</Text>
              </TouchableOpacity>
            </View>

            {/* Grid header */}
            <View style={s.calGrid}>
              {DAYS_HDR.map((d, i) => (
                <View key={i} style={s.calCell}>
                  <Text style={s.calHdr}>{d}</Text>
                </View>
              ))}
            </View>

            {/* Day cells — fixed size for alignment */}
            <View style={s.calGrid}>
              {buildMonthCells().map((cell, i) => {
                const isToday = cell.cur
                  && cell.day === today.getDate()
                  && calMonth === today.getMonth()
                  && calYear === today.getFullYear();
                const isSel   = toLocalDateStr(cell.date) === selectedDateStr;
                const key     = toLocalDateStr(cell.date);
                const hasEv   = cell.cur && daysWithEvSet.has(key);
                return (
                  <TouchableOpacity
                    key={i}
                    style={s.calCell}
                    onPress={() => { setSelectedDate(new Date(cell.date)); setView('day'); }}
                    activeOpacity={0.7}>
                    <View style={[
                      s.calDayInner,
                      isToday && s.calDayToday,
                      isSel && !isToday && s.calDaySel,
                    ]}>
                      <Text style={[
                        s.calDayTxt,
                        !cell.cur && s.calDayOther,
                        isToday && { color:'#fff', fontFamily:'Poppins_700Bold' },
                      ]}>
                        {cell.day}
                      </Text>
                      {hasEv && <View style={[s.calDot, isToday && { backgroundColor:'#fff' }]}/>}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Selected day summary */}
            {(() => {
              const sel = events.filter(e => (e.date || '') === selectedDateStr);
              if (!sel.length) return null;
              return (
                <View style={s.csdCard}>
                  <Text style={s.csdTitle}>
                    {selectedDate.toLocaleDateString('en-AU', { weekday:'long', day:'numeric', month:'long' })}
                  </Text>
                  {sel.map((ev, i) => (
                    <TouchableOpacity key={ev.id}
                      style={[s.csdRow, i === sel.length - 1 && { borderBottomWidth:0 }]}
                      onPress={() => setView('day')} activeOpacity={0.7}>
                      <View style={[s.csdDot, { backgroundColor: evColor(i) }]}/>
                      <Text style={s.csdName}>{ev.title}</Text>
                      <Text style={s.csdTime}>{fmtTime(ev.start_time)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              );
            })()}
          </ScrollView>
        )}
      </View>

      <AddEventModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSaved={() => { setShowAddModal(false); loadEvents(); }}
        defaultDate={selectedDate}
      />

      <PulsingFAB onPress={openChat}/>
    </SafeAreaView>
  );
}

// ── STYLES ───────────────────────────────────────────────────
const CELL_SIZE = 44;

const s = StyleSheet.create({
  safe:    { flex:1, backgroundColor:C.blue },
  content: { flex:1, backgroundColor:C.bg },

  // Hero — logo + toggle only, no strip
  hero:        { backgroundColor:C.blue, paddingHorizontal:22, paddingTop:14, paddingBottom:16, flexShrink:0, position:'relative', overflow:'hidden' },
  heroCircle:  { position:'absolute', right:-30, top:-30, width:140, height:140, borderRadius:70, backgroundColor:'rgba(255,255,255,0.06)' },
  heroRow:     { flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:12 },
  logoMark:    { flexDirection:'row', alignItems:'center', gap:8 },
  logoStarBox: { width:32, height:32, backgroundColor:'rgba(255,255,255,0.2)', borderRadius:10, alignItems:'center', justifyContent:'center' },
  logoStarTxt: { fontSize:17, color:'#fff' },
  logoWord:    { fontFamily:'DMSerifDisplay_400Regular', fontSize:22, color:'#fff', letterSpacing:-0.5 },
  heroTitle:   { fontFamily:'DMSerifDisplay_400Regular', fontSize:34, color:'#fff', letterSpacing:-1 },

  // View toggle — bigger
  viewTog: { flexDirection:'row', backgroundColor:'rgba(255,255,255,0.15)', borderRadius:14, padding:4, gap:3, marginBottom:4 },
  vt:      { flex:1, paddingVertical:10, borderRadius:11, alignItems:'center' },
  vtOn:    { backgroundColor:'#fff' },
  vtTxt:   { fontFamily:'Poppins_600SemiBold', fontSize:13, color:'rgba(255,255,255,0.6)' },
  vtTxtOn: { color:C.ink },

  // Date strip — white bar below hero
  stripBar:        { backgroundColor:'#fff', borderBottomWidth:1, borderBottomColor:C.border },
  stripMonthLabel: { fontFamily:'Poppins_700Bold', fontSize:9, color:C.blue, textTransform:'uppercase', letterSpacing:1, textAlign:'center', height:14, paddingTop:1 },
  dayPill:         { width:52, alignItems:'center', gap:2, paddingVertical:8, borderRadius:14 },
  dayPillToday:    { backgroundColor:C.blue },
  dayPillSelected: { backgroundColor:C.mag },
  dpDay:           { fontFamily:'Poppins_700Bold', fontSize:9, textTransform:'uppercase', letterSpacing:0.3, color:C.ink3 },
  dpNum:           { fontFamily:'Poppins_800ExtraBold', fontSize:17, color:C.ink },
  dpDot:           { width:4, height:4, borderRadius:2, backgroundColor:'transparent' },
  dpDotHas:        { backgroundColor:C.blue },

  // Today button
  todayBtn:    { alignSelf:'center', marginBottom:6, paddingHorizontal:16, paddingVertical:5, backgroundColor:C.blue, borderRadius:20 },
  todayBtnTxt: { fontFamily:'Poppins_600SemiBold', fontSize:11, color:'#fff' },

  // Briefing card — exact home screen
  briefingCard: {
    marginHorizontal:18, marginTop:14, marginBottom:6,
    backgroundColor:'#fff', borderRadius:20,
    borderWidth:1.5, borderColor:'rgba(0,87,255,0.15)',
    shadowColor:'#0057FF', shadowOpacity:0.08, shadowRadius:16,
    shadowOffset:{ width:0, height:4 }, elevation:3, overflow:'hidden',
  },
  briefingHeader: {
    flexDirection:'row', alignItems:'center', gap:10,
    paddingHorizontal:16, paddingTop:14, paddingBottom:11,
    borderBottomWidth:1, borderBottomColor:'rgba(0,87,255,0.08)',
    backgroundColor:'rgba(0,87,255,0.03)',
  },
  briefingName: { fontFamily:'Poppins_700Bold', fontSize:13, color:C.ink, flex:1 },
  briefingTime: { fontFamily:'Poppins_400Regular', fontSize:10, color:C.ink3 },
  briefingBody: { padding:16, paddingTop:14 },
  briefingMsg:  { fontFamily:'Poppins_400Regular', fontSize:14, color:C.ink, lineHeight:22, marginBottom:14 },
  briefingBtns: { flexDirection:'row', gap:8 },
  btnPrimary:    { flex:1, backgroundColor:C.blue, borderRadius:12, paddingVertical:11, alignItems:'center' },
  btnPrimaryTxt: { fontFamily:'Poppins_600SemiBold', fontSize:13, color:'#fff' },
  btnGhost:      { flex:1, backgroundColor:'rgba(0,0,0,0.05)', borderRadius:12, paddingVertical:11, alignItems:'center' },
  btnGhostTxt:   { fontFamily:'Poppins_600SemiBold', fontSize:13, color:C.ink2 },

  // (relaxed card reuses briefingCard styles)

  // Day view
  slbl:      { fontFamily:'Poppins_700Bold', fontSize:10, textTransform:'uppercase', letterSpacing:1.5, color:C.ink3, paddingHorizontal:22, paddingTop:12, paddingBottom:8 },
  eventItem: { backgroundColor:C.card, borderRadius:16, padding:14, marginHorizontal:18, marginBottom:8, borderWidth:1.5, borderColor:C.border, flexDirection:'row', alignItems:'center', gap:14 },
  eventClash:{ borderColor:'rgba(224,0,124,0.25)', backgroundColor:'rgba(224,0,124,0.02)' },
  evTimeCol: { flexShrink:0, alignItems:'flex-end', minWidth:38 },
  evT:       { fontFamily:'Poppins_700Bold', fontSize:13, color:C.ink },
  evD:       { fontFamily:'Poppins_400Regular', fontSize:10, color:C.ink2 },
  evLine:    { width:3, height:36, borderRadius:2, flexShrink:0 },
  evBody:    { flex:1 },
  evName:    { fontFamily:'Poppins_600SemiBold', fontSize:14, color:C.ink },
  evMeta:    { fontFamily:'Poppins_400Regular', fontSize:11, color:C.ink2, marginTop:2 },
  addBtn:    { marginHorizontal:18, marginTop:8, marginBottom:16, backgroundColor:C.card, borderRadius:16, padding:16, borderWidth:1.5, borderColor:C.border, alignItems:'center', opacity:0.55, borderStyle:'dashed' },
  addPlus:   { fontFamily:'Poppins_600SemiBold', fontSize:14, color:C.ink2 },

  // Week view
  weekRow:       { flexDirection:'row', borderBottomWidth:1, borderBottomColor:C.border, paddingVertical:12, paddingHorizontal:18, gap:14, backgroundColor:C.card, marginBottom:1 },
  weekDayCol:    { width:44, alignItems:'center', gap:4 },
  weekDayName:   { fontFamily:'Poppins_700Bold', fontSize:10, textTransform:'uppercase', color:C.ink3 },
  weekDayNum:    { width:30, height:30, borderRadius:9, alignItems:'center', justifyContent:'center' },
  weekDayNumTxt: { fontFamily:'Poppins_700Bold', fontSize:15, color:C.ink },
  weekEvCol:     { flex:1, gap:4, justifyContent:'center' },
  weekEmpty:     { fontFamily:'Poppins_400Regular', fontSize:13, color:C.ink3 },
  weekEvChip:    { borderRadius:8, borderLeftWidth:3, paddingHorizontal:8, paddingVertical:5, flexDirection:'row', justifyContent:'space-between', alignItems:'center' },
  weekEvTxt:     { fontFamily:'Poppins_600SemiBold', fontSize:12, flex:1 },
  weekEvTime:    { fontFamily:'Poppins_400Regular', fontSize:11, color:C.ink2 },

  // Month view — fixed cell size for alignment
  monthNav:    { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:18, paddingTop:10, paddingBottom:6 },
  monthArr:    { padding:8 },
  monthArrTxt: { fontSize:22, color:C.ink2, fontFamily:'Poppins_400Regular' },
  monthLbl:    { fontFamily:'Poppins_700Bold', fontSize:16, color:C.ink },
  calGrid:     { flexDirection:'row', flexWrap:'wrap', paddingHorizontal:10 },
  calCell:     { width:`${100/7}%` as any, aspectRatio:1, alignItems:'center', justifyContent:'center' },
  calHdr:      { fontFamily:'Poppins_700Bold', fontSize:9, textTransform:'uppercase', color:C.ink3 },
  calDayInner: { width:CELL_SIZE, height:CELL_SIZE, borderRadius:CELL_SIZE/2, alignItems:'center', justifyContent:'center', position:'relative' },
  calDayToday: { backgroundColor:C.mag },
  calDaySel:   { backgroundColor:'rgba(0,87,255,0.12)' },
  calDayTxt:   { fontFamily:'Poppins_500Medium', fontSize:13, color:C.ink },
  calDayOther: { color:C.ink3 },
  calDot:      { position:'absolute', bottom:4, width:4, height:4, borderRadius:2, backgroundColor:C.yellow },
  csdCard:     { marginHorizontal:18, marginTop:10, backgroundColor:C.card, borderRadius:16, borderWidth:1.5, borderColor:C.border, padding:14, marginBottom:10 },
  csdTitle:    { fontFamily:'Poppins_700Bold', fontSize:13, color:C.ink, marginBottom:10 },
  csdRow:      { flexDirection:'row', alignItems:'center', gap:10, paddingVertical:6, borderBottomWidth:1, borderBottomColor:C.border },
  csdDot:      { width:8, height:8, borderRadius:4, flexShrink:0 },
  csdName:     { fontFamily:'Poppins_500Medium', fontSize:13, color:C.ink, flex:1 },
  csdTime:     { fontFamily:'Poppins_400Regular', fontSize:11, color:C.ink2 },

  // Modal
  modalHdr:      { flexDirection:'row', alignItems:'center', justifyContent:'space-between', padding:16, borderBottomWidth:1, borderBottomColor:C.border },
  modalCancel:   { fontFamily:'Poppins_500Medium', fontSize:15, color:C.ink2 },
  modalTitle:    { fontFamily:'Poppins_700Bold', fontSize:16, color:C.ink },
  modalSave:     { fontFamily:'Poppins_700Bold', fontSize:15, color:C.blue },
  modalTabs:     { flexDirection:'row', paddingHorizontal:16, paddingTop:10, borderBottomWidth:1, borderBottomColor:C.border },
  modalTab:      { flex:1, paddingVertical:10, alignItems:'center', borderBottomWidth:2, borderBottomColor:'transparent', marginBottom:-1 },
  modalTabOn:    { borderBottomColor:C.blue },
  modalTabTxt:   { fontFamily:'Poppins_600SemiBold', fontSize:13, color:C.ink2 },
  modalTabTxtOn: { color:C.blue },
  formField:     { gap:6 },
  formLabel:     { fontFamily:'Poppins_600SemiBold', fontSize:11, color:C.ink2, textTransform:'uppercase', letterSpacing:0.5 },
  formInput:     { backgroundColor:C.bg, borderRadius:12, borderWidth:1.5, borderColor:C.border, paddingHorizontal:14, paddingVertical:13, fontFamily:'Poppins_400Regular', fontSize:15, color:C.ink, justifyContent:'center' },

  // Mini calendar
  miniCal:       { backgroundColor:C.bg, borderRadius:16, padding:12, borderWidth:1.5, borderColor:C.border },
  miniCalNav:    { flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:8 },
  miniCalArrBtn: { padding:4 },
  miniCalArr:    { fontSize:20, color:C.ink2, fontFamily:'Poppins_400Regular' },
  miniCalLbl:    { fontFamily:'Poppins_700Bold', fontSize:14, color:C.ink },
  miniCalGrid:   { flexDirection:'row', flexWrap:'wrap' },
  miniCalHdr:    { width:`${100/7}%` as any, textAlign:'center', fontFamily:'Poppins_700Bold', fontSize:9, color:C.ink3, paddingVertical:4 },
  miniCalDay:    { width:`${100/7}%` as any, aspectRatio:1, alignItems:'center', justifyContent:'center', borderRadius:8 },
  miniCalDaySel: { backgroundColor:C.blue },
  miniCalDayTxt: { fontFamily:'Poppins_500Medium', fontSize:13, color:C.ink },

  // Time picker
  timePicker: { flexDirection:'row', gap:6, backgroundColor:C.bg, borderRadius:12, padding:10, borderWidth:1.5, borderColor:C.border, height:160 },
  timeCol:    { flex:1 },
  ampmCol:    { justifyContent:'center', gap:6 },
  timeCell:   { paddingVertical:9, paddingHorizontal:8, borderRadius:8, alignItems:'center', minWidth:44 },
  timeCellOn: { backgroundColor:C.blue },
  timeCellTxt:    { fontFamily:'Poppins_600SemiBold', fontSize:15, color:C.ink },
  timeCellTxtOn:  { color:'#fff' },
  timeColon: { fontFamily:'Poppins_700Bold', fontSize:22, color:C.ink2, alignSelf:'center', paddingHorizontal:2 },
  ampmCell:  { paddingHorizontal:10 },

  // Duration grid
  durGrid:       { flexDirection:'row', flexWrap:'wrap', gap:8 },
  durChip:       { paddingHorizontal:14, paddingVertical:8, borderRadius:20, backgroundColor:C.card, borderWidth:1.5, borderColor:C.border },
  durChipOn:     { backgroundColor:C.blue, borderColor:C.blue },
  durChipTxt:    { fontFamily:'Poppins_600SemiBold', fontSize:13, color:C.ink2 },
  durChipTxtOn:  { color:'#fff' },

  // People
  memberRow:   { flexDirection:'row', alignItems:'center', gap:12, padding:14, backgroundColor:C.bg, borderRadius:14, borderWidth:1.5, borderColor:C.border },
  memberDot:   { width:12, height:12, borderRadius:6, flexShrink:0 },
  memberName:  { fontFamily:'Poppins_500Medium', fontSize:15, color:C.ink, flex:1 },
  memberCheck: { width:24, height:24, borderRadius:7, borderWidth:2, borderColor:C.ink3, alignItems:'center', justifyContent:'center' },

  // FAB
  fabWrap: { position:'absolute', right:18, bottom:100, width:52, height:52, alignItems:'center', justifyContent:'center', zIndex:99 },
  fab:     { width:52, height:52, borderRadius:16, backgroundColor:C.blue, alignItems:'center', justifyContent:'center', shadowColor:C.blue, shadowOpacity:0.5, shadowRadius:16, shadowOffset:{ width:0, height:6 }, elevation:10 },
});