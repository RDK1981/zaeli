/**
 * lib/zaeli-calendar.tsx
 * Shared calendar components used in both the dedicated screen and Zaeli chat.
 * Same component, compact={true} for chat, compact={false} for full screen.
 */

import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
} from 'react-native';

// ── Family colour system (locked) ────────────────────────────────────────────
export const FAMILY_MEMBERS = [
  { id: '1', name: 'Anna',   initial: 'A', color: '#FF7B6B' },
  { id: '2', name: 'Rich',   initial: 'R', color: '#4D8BFF' },
  { id: '3', name: 'Poppy',  initial: 'P', color: '#A855F7' },
  { id: '4', name: 'Gab',    initial: 'G', color: '#22C55E' },
  { id: '5', name: 'Duke',   initial: 'D', color: '#F59E0B' },
];

export function getMemberColor(assignees?: string[]): string {
  if (!assignees || assignees.length === 0) return '#4D8BFF';
  const member = FAMILY_MEMBERS.find(m => assignees.includes(m.id));
  return member?.color ?? '#4D8BFF';
}

export function getMemberInitial(id: string): string {
  return FAMILY_MEMBERS.find(m => m.id === id)?.initial ?? '?';
}

export function getMemberColorById(id: string): string {
  return FAMILY_MEMBERS.find(m => m.id === id)?.color ?? '#4D8BFF';
}

// ── Helpers ───────────────────────────────────────────────────────────────────
export function toLocalDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

export function fmtTime(iso: string): string {
  if (!iso) return '';
  const timePart = iso.replace('T', ' ').split(' ')[1] || '';
  if (!timePart) return '';
  const [hStr, mStr] = timePart.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  const ampm = h >= 12 ? 'pm' : 'am';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function fmtTimeShort(iso: string): string {
  if (!iso) return '';
  const timePart = iso.replace('T', ' ').split(' ')[1] || '';
  if (!timePart) return '';
  const [hStr, mStr] = timePart.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  const ampm = h >= 12 ? 'pm' : 'am';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  const mStr2 = m === 0 ? '' : `:${String(m).padStart(2, '0')}`;
  return `${h12}${mStr2}${ampm}`;
}

function getDaysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
function getFirstDayOfMonth(y: number, m: number) { return (new Date(y, m, 1).getDay() + 6) % 7; }

function hasConflict(ev: any, allEvs: any[]): boolean {
  if (!ev.start_time || !ev.end_time) return false;
  const s = new Date(ev.start_time).getTime();
  const e = new Date(ev.end_time).getTime();
  return allEvs.some(f =>
    f.id !== ev.id && f.start_time && f.end_time &&
    s < new Date(f.end_time).getTime() &&
    new Date(f.start_time).getTime() < e
  );
}

// ── Person avatar dots ────────────────────────────────────────────────────────
function PersonDots({ assignees, size = 16 }: { assignees?: string[]; size?: number }) {
  if (!assignees || assignees.length === 0) return null;
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {assignees.slice(0, 3).map(id => (
        <View key={id} style={{
          width: size, height: size, borderRadius: size / 2,
          backgroundColor: getMemberColorById(id),
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Text style={{ fontSize: size * 0.45, fontFamily: 'Poppins_700Bold', color: '#fff' }}>
            {getMemberInitial(id)}
          </Text>
        </View>
      ))}
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MONTH VIEW
// ══════════════════════════════════════════════════════════════════════════════
interface MonthViewProps {
  compact?: boolean;
  events: any[];
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  onOpenFull?: () => void;
}

export function ZaeliCalendarMonth({
  compact = false,
  events,
  selectedDate,
  onSelectDate,
  onOpenFull,
}: MonthViewProps) {
  const today = new Date();
  const [calMonth, setCalMonth] = useState(selectedDate.getMonth());
  const [calYear,  setCalYear]  = useState(selectedDate.getFullYear());

  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const DAYS_HDR = ['S','M','T','W','T','F','S'];

  const selectedDateStr = toLocalDateStr(selectedDate);
  const todayStr = toLocalDateStr(today);

  // Build cells
  const dim = getDaysInMonth(calYear, calMonth);
  const firstDay = getFirstDayOfMonth(calYear, calMonth);
  const prevDim = getDaysInMonth(calYear, calMonth - 1);
  const cells: { day: number; cur: boolean; date: Date }[] = [];
  for (let i = firstDay - 1; i >= 0; i--)
    cells.push({ day: prevDim - i, cur: false, date: new Date(calYear, calMonth - 1, prevDim - i) });
  for (let d = 1; d <= dim; d++)
    cells.push({ day: d, cur: true, date: new Date(calYear, calMonth, d) });
  while (cells.length % 7 !== 0) {
    const n = cells.length - firstDay - dim + 1;
    cells.push({ day: n, cur: false, date: new Date(calYear, calMonth + 1, n) });
  }

  // Compute dots per day (by family member colour)
  const dotMap: Record<string, string[]> = {};
  events.forEach(ev => {
    if (!ev.date) return;
    if (!dotMap[ev.date]) dotMap[ev.date] = [];
    const color = getMemberColor(ev.assignees);
    if (!dotMap[ev.date].includes(color)) dotMap[ev.date].push(color);
  });

  const cellSize = compact ? 34 : 42;
  const fontSize = compact ? 11 : 14;
  const dotSize  = compact ? 4  : 5;

  const selectedDayEvents = events.filter(e => (e.date || '') === selectedDateStr);

  return (
    <View style={{ backgroundColor: '#fff' }}>
      {/* Header */}
      <View style={[ms.navRow, compact && { paddingHorizontal: 12, paddingVertical: 8 }]}>
        <TouchableOpacity
          onPress={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); } else setCalMonth(m => m - 1); }}
          style={ms.navBtn}
        >
          <Text style={ms.navArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={[ms.monthLbl, compact && { fontSize: 14 }]}>
          {MONTHS[calMonth]} {calYear}
        </Text>
        <TouchableOpacity
          onPress={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); } else setCalMonth(m => m + 1); }}
          style={ms.navBtn}
        >
          <Text style={ms.navArrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Day headers */}
      <View style={[ms.daysHdr, compact && { paddingHorizontal: 10 }]}>
        {DAYS_HDR.map((d, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center' }}>
            <Text style={[ms.dayHdrTxt, compact && { fontSize: 9 }]}>{d}</Text>
          </View>
        ))}
      </View>

      {/* Grid */}
      <View style={[ms.grid, compact && { paddingHorizontal: 8, paddingBottom: 8 }]}>
        {cells.map((cell, i) => {
          const dateStr = toLocalDateStr(cell.date);
          const isToday = dateStr === todayStr && cell.cur;
          const isSel = dateStr === selectedDateStr && cell.cur;
          const dots = cell.cur ? (dotMap[dateStr] || []) : [];
          return (
            <TouchableOpacity
              key={i}
              style={{ width: `${100/7}%`, alignItems: 'center', paddingVertical: 3 }}
              onPress={() => { if (cell.cur) onSelectDate(new Date(cell.date)); }}
              activeOpacity={0.7}
            >
              <View style={[
                { width: cellSize, height: cellSize, borderRadius: cellSize / 2, alignItems: 'center', justifyContent: 'center', gap: 2 },
                isToday && { backgroundColor: '#4D8BFF' },
                isSel && !isToday && { backgroundColor: 'rgba(77,139,255,0.12)' },
              ]}>
                <Text style={[
                  { fontFamily: 'Poppins_500Medium', fontSize, color: '#0a0a0a', lineHeight: fontSize + 2 },
                  !cell.cur && { color: 'rgba(10,10,10,0.2)' },
                  isToday && { color: '#fff', fontFamily: 'Poppins_700Bold' },
                ]}>
                  {cell.day}
                </Text>
                {dots.length > 0 && (
                  <View style={{ flexDirection: 'row', gap: 2, flexWrap: 'wrap', justifyContent: 'center', maxWidth: cellSize - 4 }}>
                    {dots.slice(0, 3).map((color, di) => (
                      <View key={di} style={{
                        width: isToday ? dotSize + 1 : dotSize,
                        height: isToday ? dotSize + 1 : dotSize,
                        borderRadius: (isToday ? dotSize + 1 : dotSize) / 2,
                        backgroundColor: isToday ? 'rgba(255,255,255,0.8)' : color,
                      }}/>
                    ))}
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Family legend */}
      <View style={[ms.legend, compact && { paddingHorizontal: 12, paddingBottom: 8 }]}>
        {FAMILY_MEMBERS.map(m => (
          <View key={m.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: m.color }}/>
            <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: compact ? 9 : 10, color: 'rgba(10,10,10,0.4)' }}>
              {m.name}
            </Text>
          </View>
        ))}
      </View>

      {/* Selected day preview */}
      {selectedDayEvents.length > 0 && (
        <View style={[ms.preview, compact && { marginHorizontal: 10, marginBottom: 10 }]}>
          <Text style={[ms.previewDate, compact && { fontSize: 9 }]}>
            {selectedDate.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()}
            {selectedDateStr === todayStr ? ' — TODAY' : ''}
          </Text>
          {selectedDayEvents.map((ev, i) => {
            const color = getMemberColor(ev.assignees);
            return (
              <View key={ev.id} style={[ms.previewRow, i === selectedDayEvents.length - 1 && { borderBottomWidth: 0 }]}>
                <View style={[ms.previewBar, { backgroundColor: color }]}/>
                <View style={{ flex: 1 }}>
                  <Text style={[ms.previewName, compact && { fontSize: 12 }]}>{ev.title}</Text>
                  <Text style={[ms.previewTime, compact && { fontSize: 10 }]}>{fmtTime(ev.start_time)}</Text>
                </View>
                <PersonDots assignees={ev.assignees} size={compact ? 16 : 18}/>
              </View>
            );
          })}
        </View>
      )}

      {/* Open full link (chat only) */}
      {compact && onOpenFull && (
        <TouchableOpacity
          onPress={onOpenFull}
          style={{ paddingHorizontal: 14, paddingBottom: 12, alignItems: 'flex-end' }}
          activeOpacity={0.7}
        >
          <Text style={{ fontFamily: 'Poppins_500Medium', fontSize: 11, color: '#4D8BFF' }}>
            Open full calendar →
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// DAY VIEW
// ══════════════════════════════════════════════════════════════════════════════
interface DayViewProps {
  compact?: boolean;
  date: Date;
  events: any[];
  onEventPress?: (event: any) => void;
  onAddEvent?: () => void;
  onOpenFull?: () => void;
}

export function ZaeliCalendarDay({
  compact = false,
  date,
  events,
  onEventPress,
  onAddEvent,
  onOpenFull,
}: DayViewProps) {
  const today = new Date();
  const isToday = toLocalDateStr(date) === toLocalDateStr(today);
  const dateLabel = date.toLocaleDateString('en-AU', {
    weekday: 'long', day: 'numeric', month: 'long',
  }) + (isToday ? ' — Today' : '');

  const sortedEvents = [...events].sort((a, b) => {
    if (!a.start_time) return 1;
    if (!b.start_time) return -1;
    return a.start_time.localeCompare(b.start_time);
  });

  if (sortedEvents.length === 0) {
    return (
      <View style={{ padding: compact ? 14 : 20 }}>
        <Text style={[ds.dateLabel, compact && { fontSize: 10 }]}>{dateLabel.toUpperCase()}</Text>
        <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 14, color: 'rgba(10,10,10,0.35)', marginTop: 8 }}>
          Nothing on — a free day. ✨
        </Text>
        {compact && onOpenFull && (
          <TouchableOpacity onPress={onOpenFull} style={{ marginTop: 10 }} activeOpacity={0.7}>
            <Text style={{ fontFamily: 'Poppins_500Medium', fontSize: 11, color: '#4D8BFF' }}>
              Open calendar →
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  const conflictSet = new Set(
    sortedEvents.filter(ev => hasConflict(ev, sortedEvents)).map(ev => ev.id)
  );

  return (
    <View style={{ backgroundColor: '#fff' }}>
      <View style={[ds.headerRow, compact && { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 6 }]}>
        <Text style={[ds.dateLabel, compact && { fontSize: 10 }]}>{dateLabel.toUpperCase()}</Text>
        {!compact && onAddEvent && (
          <TouchableOpacity onPress={onAddEvent} style={ds.addBtn} activeOpacity={0.7}>
            <Text style={ds.addBtnTxt}>+ Add</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={compact ? { paddingHorizontal: 2, paddingBottom: 4 } : {}}>
        {sortedEvents.map((ev, i) => {
          const color = getMemberColor(ev.assignees);
          const isClash = conflictSet.has(ev.id);
          const evColor = isClash ? '#E53935' : color;

          return (
            <TouchableOpacity
              key={ev.id}
              style={[ds.eventRow, compact && { paddingHorizontal: 12, paddingVertical: 8 },
                i === sortedEvents.length - 1 && { borderBottomWidth: 0 },
                isClash && { backgroundColor: 'rgba(229,57,53,0.04)' },
              ]}
              onPress={() => onEventPress?.(ev)}
              activeOpacity={0.7}
            >
              <View style={[ds.eventAccent, { backgroundColor: evColor }]}/>
              <View style={{ flex: 1, paddingLeft: compact ? 8 : 10 }}>
                <Text style={[ds.eventTitle, compact && { fontSize: 13 }]}>{ev.title}</Text>
                <Text style={[ds.eventTime, compact && { fontSize: 10 }]}>
                  {fmtTimeShort(ev.start_time)}
                  {ev.end_time && ev.end_time !== ev.start_time
                    ? ` – ${fmtTimeShort(ev.end_time)}`
                    : ''
                  }
                </Text>
                {isClash && (
                  <View style={ds.clashRow}>
                    <View style={ds.clashDot}/>
                    <Text style={[ds.clashTxt, compact && { fontSize: 9 }]}>
                      Conflict detected
                    </Text>
                  </View>
                )}
              </View>
              <PersonDots assignees={ev.assignees} size={compact ? 16 : 18}/>
            </TouchableOpacity>
          );
        })}
      </View>

      {compact && onOpenFull && (
        <TouchableOpacity
          onPress={onOpenFull}
          style={{ paddingHorizontal: 14, paddingTop: 4, paddingBottom: 12, alignItems: 'flex-end' }}
          activeOpacity={0.7}
        >
          <Text style={{ fontFamily: 'Poppins_500Medium', fontSize: 11, color: '#4D8BFF' }}>
            Open full calendar →
          </Text>
        </TouchableOpacity>
      )}

      {!compact && onAddEvent && (
        <TouchableOpacity onPress={onAddEvent} style={ds.addRowBtn} activeOpacity={0.7}>
          <Text style={ds.addRowBtnTxt}>+  Add event</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const ms = StyleSheet.create({
  navRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 12 },
  navBtn:    { width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(10,10,10,0.06)', alignItems: 'center', justifyContent: 'center' },
  navArrow:  { fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: 'rgba(10,10,10,0.5)' },
  monthLbl:  { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 20, color: '#0a0a0a', letterSpacing: -0.3 },
  daysHdr:   { flexDirection: 'row', paddingHorizontal: 14, marginBottom: 4 },
  dayHdrTxt: { fontFamily: 'Poppins_600SemiBold', fontSize: 10, color: 'rgba(10,10,10,0.3)', letterSpacing: 0.3, textAlign: 'center' },
  grid:      { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 14 },
  legend:    { flexDirection: 'row', gap: 10, flexWrap: 'wrap', paddingHorizontal: 16, paddingBottom: 10, borderTopWidth: 1, borderTopColor: 'rgba(10,10,10,0.06)', paddingTop: 8 },
  preview:   { margin: 12, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(10,10,10,0.08)', overflow: 'hidden' },
  previewDate: { fontFamily: 'Poppins_700Bold', fontSize: 10, color: 'rgba(10,10,10,0.4)', letterSpacing: 0.5, padding: 10, paddingBottom: 6 },
  previewRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(10,10,10,0.05)' },
  previewBar:  { width: 3, height: 32, borderRadius: 2, flexShrink: 0 },
  previewName: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: '#0a0a0a' },
  previewTime: { fontFamily: 'Poppins_400Regular', fontSize: 11, color: 'rgba(10,10,10,0.4)', marginTop: 1 },
});

const ds = StyleSheet.create({
  headerRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 16, paddingBottom: 8 },
  dateLabel:  { fontFamily: 'Poppins_700Bold', fontSize: 11, color: 'rgba(10,10,10,0.4)', letterSpacing: 0.8 },
  addBtn:     { backgroundColor: 'rgba(77,139,255,0.1)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  addBtnTxt:  { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: '#4D8BFF' },
  eventRow:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(10,10,10,0.05)', backgroundColor: '#fff' },
  eventAccent:{ width: 3, height: 44, borderRadius: 2, flexShrink: 0 },
  eventTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: '#0a0a0a', marginBottom: 2 },
  eventTime:  { fontFamily: 'Poppins_400Regular', fontSize: 11, color: 'rgba(10,10,10,0.45)' },
  clashRow:   { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  clashDot:   { width: 5, height: 5, borderRadius: 3, backgroundColor: '#E53935' },
  clashTxt:   { fontFamily: 'Poppins_500Medium', fontSize: 10, color: '#E53935' },
  addRowBtn:  { paddingHorizontal: 18, paddingVertical: 14, borderTopWidth: 1, borderTopColor: 'rgba(10,10,10,0.06)' },
  addRowBtnTxt: { fontFamily: 'Poppins_500Medium', fontSize: 14, color: 'rgba(10,10,10,0.4)' },
});
