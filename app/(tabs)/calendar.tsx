import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList } from 'react-native'
import { useState, useRef } from 'react'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const TODAY_DATE = 7
const TODAY_MONTH = 2
const TODAY_YEAR = 2026

const generateDays = (month: number, year: number) => {
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  return Array.from({ length: daysInMonth }, (_, i) => i + 1)
}

const DAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

const EVENTS = [
  { day: 7, time: '8:00am', title: 'School drop off', member: 'Jack', avatar: '🧒', color: '#4A90D9', duration: '30m' },
  { day: 7, time: '9:30am', title: 'Dentist — Emma', member: 'Emma', avatar: '👧', color: '#E8922A', duration: '1hr' },
  { day: 7, time: '3:30pm', title: 'Soccer training', member: 'Jack', avatar: '🧒', color: '#4A90D9', duration: '1.5hr' },
  { day: 7, time: '5:00pm', title: 'Science project due', member: 'Emma', avatar: '👧', color: '#E8922A', duration: '—' },
  { day: 7, time: '7:00pm', title: 'Family dinner', member: 'Everyone', avatar: '👨‍👩‍👧‍👦', color: '#1E8A5E', duration: '1hr' },
  { day: 8, time: '10:00am', title: 'Grocery run', member: 'Sarah', avatar: '👩', color: '#7C5CBF', duration: '1hr' },
  { day: 9, time: '2:00pm', title: 'Birthday party', member: 'Emma', avatar: '👧', color: '#E8922A', duration: '2hr' },
]

const MEMBER_FILTERS = [
  { name: 'All', avatar: '🏠' },
  { name: 'Sarah', avatar: '👩' },
  { name: 'Jack', avatar: '🧒' },
  { name: 'Emma', avatar: '👧' },
]

export default function CalendarScreen() {
  const [selectedDay, setSelectedDay] = useState(TODAY_DATE)
  const [selectedMonth, setSelectedMonth] = useState(TODAY_MONTH)
  const [selectedYear, setSelectedYear] = useState(TODAY_YEAR)
  const [selectedMember, setSelectedMember] = useState('All')
  const [view, setView] = useState<'day' | 'week' | 'month'>('day')

  const days = generateDays(selectedMonth, selectedYear)

  const getDayName = (day: number) => {
    const d = new Date(selectedYear, selectedMonth, day)
    return DAY_NAMES[d.getDay()]
  }

  const filteredEvents = EVENTS.filter(e => {
    const dayMatch = view === 'day' ? e.day === selectedDay : true
    const memberMatch = selectedMember === 'All' ? true : e.member === selectedMember
    return dayMatch && memberMatch
  })

  const prevMonth = () => {
    if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear(y => y - 1) }
    else setSelectedMonth(m => m - 1)
  }

  const nextMonth = () => {
    if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear(y => y + 1) }
    else setSelectedMonth(m => m + 1)
  }

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={prevMonth} style={styles.monthArrow}>
            <Text style={styles.monthArrowText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{MONTHS[selectedMonth]} {selectedYear}</Text>
          <TouchableOpacity onPress={nextMonth} style={styles.monthArrow}>
            <Text style={styles.monthArrowText}>›</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.addBtn}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {/* Day / Week / Month toggle */}
      <View style={styles.toggleRow}>
        {(['day', 'week', 'month'] as const).map(v => (
          <TouchableOpacity
            key={v}
            style={[styles.toggleBtn, view === v && styles.toggleBtnActive]}
            onPress={() => setView(v)}
          >
            <Text style={[styles.toggleBtnText, view === v && styles.toggleBtnTextActive]}>
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Scrollable day strip */}
      {(view === 'day' || view === 'week') && (
        <FlatList
          data={days}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={item => item.toString()}
          style={styles.dayStripList}
          contentContainerStyle={styles.dayStrip}
          initialScrollIndex={Math.max(0, selectedDay - 4)}
          getItemLayout={(_, index) => ({ length: 52, offset: 52 * index, index })}
          renderItem={({ item: day }) => {
            const isSelected = day === selectedDay
            const isToday = day === TODAY_DATE && selectedMonth === TODAY_MONTH
            const hasEvents = EVENTS.some(e => e.day === day)
            return (
              <TouchableOpacity
                style={[styles.dayBtn, isSelected && styles.dayBtnActive]}
                onPress={() => setSelectedDay(day)}
              >
                <Text style={[styles.dayName, isSelected && styles.dayNameActive]}>{getDayName(day)}</Text>
                <Text style={[styles.dayNum, isSelected && styles.dayNumActive]}>{day}</Text>
                {isToday && <View style={[styles.todayDot, isSelected && styles.todayDotActive]} />}
                {hasEvents && !isToday && <View style={[styles.eventIndicator, isSelected && styles.eventIndicatorActive]} />}
              </TouchableOpacity>
            )
          }}
        />
      )}

      {/* Member filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filters}
      >
        {MEMBER_FILTERS.map((m, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.filter, selectedMember === m.name && styles.filterActive]}
            onPress={() => setSelectedMember(m.name)}
          >
            <Text style={styles.filterAvatar}>{m.avatar}</Text>
            <Text style={[styles.filterName, selectedMember === m.name && styles.filterNameActive]}>{m.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Day view */}
      {view === 'day' && (
        <ScrollView style={styles.events} showsVerticalScrollIndicator={false}>
          {filteredEvents.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Nothing on {selectedDay} {MONTHS[selectedMonth]}</Text>
              <Text style={styles.emptyAdd}>Tap + Add to create an event</Text>
            </View>
          ) : (
            filteredEvents.map((event, i) => (
              <TouchableOpacity key={i} style={styles.event}>
                <View style={styles.eventTimeCol}>
                  <Text style={styles.eventTimeText}>{event.time}</Text>
                  <Text style={styles.eventDuration}>{event.duration}</Text>
                </View>
                <View style={[styles.eventBar, { backgroundColor: event.color }]} />
                <View style={styles.eventInfo}>
                  <Text style={styles.eventTitle}>{event.title}</Text>
                  <View style={styles.eventMemberRow}>
                    <Text style={styles.eventAvatarText}>{event.avatar}</Text>
                    <Text style={styles.eventMemberName}>{event.member}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* Week view */}
      {view === 'week' && (
        <ScrollView style={styles.events} showsVerticalScrollIndicator={false}>
          {days.slice(selectedDay - 1, selectedDay + 6).map((day, i) => {
            const dayEvents = EVENTS.filter(e => e.day === day && (selectedMember === 'All' || e.member === selectedMember))
            return (
              <View key={i} style={styles.weekDay}>
                <View style={styles.weekDayHeader}>
                  <Text style={styles.weekDayLabel}>{getDayName(day)} {day}</Text>
                  {day === TODAY_DATE && selectedMonth === TODAY_MONTH && (
                    <View style={styles.todayPill}><Text style={styles.todayPillText}>Today</Text></View>
                  )}
                </View>
                {dayEvents.length === 0 ? (
                  <Text style={styles.weekEmpty}>No events</Text>
                ) : dayEvents.map((e, ei) => (
                  <View key={ei} style={styles.weekEvent}>
                    <View style={[styles.weekEventDot, { backgroundColor: e.color }]} />
                    <Text style={styles.weekEventText}>{e.time} · {e.title}</Text>
                  </View>
                ))}
              </View>
            )
          })}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* Month view */}
      {view === 'month' && (
        <ScrollView style={styles.events} showsVerticalScrollIndicator={false}>
          <View style={styles.monthGrid}>
            {DAY_NAMES.map(d => (
              <Text key={d} style={styles.monthDayName}>{d}</Text>
            ))}
            {Array.from({ length: new Date(selectedYear, selectedMonth, 1).getDay() }).map((_, i) => (
              <View key={`empty-${i}`} style={styles.monthDayEmpty} />
            ))}
            {days.map(day => {
              const hasEvents = EVENTS.some(e => e.day === day)
              const isToday = day === TODAY_DATE && selectedMonth === TODAY_MONTH
              const isSelected = day === selectedDay
              return (
                <TouchableOpacity
                  key={day}
                  style={[styles.monthDay, isSelected && styles.monthDaySelected, isToday && !isSelected && styles.monthDayToday]}
                  onPress={() => { setSelectedDay(day); setView('day') }}
                >
                  <Text style={[styles.monthDayNum, isSelected && styles.monthDayNumSelected]}>{day}</Text>
                  {hasEvents && <View style={[styles.monthDot, isSelected && styles.monthDotSelected]} />}
                </TouchableOpacity>
              )
            })}
          </View>
          <View style={{ height: 100 }} />
        </ScrollView>
      )}

    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0F1E', paddingTop: 64 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, marginBottom: 14 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerTitle: { fontSize: 22, color: '#FFFFFF', fontFamily: 'DMSerifDisplay_400Regular' },
  monthArrow: { padding: 4 },
  monthArrowText: { fontSize: 24, color: '#4A90D9', lineHeight: 28 },
  addBtn: { backgroundColor: '#4A90D9', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  addBtnText: { color: '#FFFFFF', fontSize: 13, fontFamily: 'DMSans_700Bold' },
  toggleRow: { flexDirection: 'row', marginHorizontal: 24, marginBottom: 14, backgroundColor: '#141929', borderRadius: 12, padding: 3, borderWidth: 1, borderColor: 'rgba(74,144,217,0.1)' },
  toggleBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  toggleBtnActive: { backgroundColor: '#4A90D9' },
  toggleBtnText: { fontSize: 13, color: 'rgba(255,255,255,0.4)', fontFamily: 'DMSans_700Bold' },
  toggleBtnTextActive: { color: '#FFFFFF' },
  dayStripList: { height: 76, flexGrow: 0 },
  dayStrip: { paddingHorizontal: 16, gap: 6, alignItems: 'center' },
  dayBtn: { width: 46, height: 64, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#141929', borderWidth: 1, borderColor: 'rgba(74,144,217,0.08)' },
  dayBtnActive: { backgroundColor: '#4A90D9', borderColor: '#4A90D9' },
  dayName: { fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: 'DMSans_400Regular', marginBottom: 4 },
  dayNameActive: { color: 'rgba(255,255,255,0.9)' },
  dayNum: { fontSize: 16, color: '#FFFFFF', fontFamily: 'DMSans_700Bold' },
  dayNumActive: { color: '#FFFFFF' },
  todayDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#E8922A', marginTop: 3 },
  todayDotActive: { backgroundColor: '#FFFFFF' },
  eventIndicator: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#4A90D9', marginTop: 3 },
  eventIndicatorActive: { backgroundColor: '#FFFFFF' },
  filterScroll: { flexGrow: 0, marginBottom: 4 },
  filters: { paddingHorizontal: 24, gap: 8, paddingVertical: 10, flexDirection: 'row' },
  filter: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#141929', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(74,144,217,0.08)' },
  filterActive: { borderColor: '#4A90D9', backgroundColor: 'rgba(74,144,217,0.1)' },
  filterAvatar: { fontSize: 14 },
  filterName: { fontSize: 12, color: 'rgba(255,255,255,0.4)', fontFamily: 'DMSans_400Regular' },
  filterNameActive: { color: '#4A90D9' },
  events: { flex: 1, paddingHorizontal: 24, paddingTop: 4 },
  event: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  eventTimeCol: { width: 52, alignItems: 'flex-end' },
  eventTimeText: { fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: 'DMSans_400Regular' },
  eventDuration: { fontSize: 10, color: 'rgba(255,255,255,0.25)', fontFamily: 'DMSans_400Regular', marginTop: 2 },
  eventBar: { width: 3, height: 48, borderRadius: 2, flexShrink: 0 },
  eventInfo: { flex: 1, backgroundColor: '#141929', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: 'rgba(74,144,217,0.08)' },
  eventTitle: { fontSize: 13, color: '#FFFFFF', fontFamily: 'DMSans_400Regular', marginBottom: 5 },
  eventMemberRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  eventAvatarText: { fontSize: 11 },
  eventMemberName: { fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'DMSans_400Regular' },
  empty: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyText: { fontSize: 15, color: 'rgba(255,255,255,0.3)', fontFamily: 'DMSans_300Light' },
  emptyAdd: { fontSize: 13, color: '#4A90D9', fontFamily: 'DMSans_400Regular' },
  weekDay: { backgroundColor: '#141929', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(74,144,217,0.08)' },
  weekDayHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  weekDayLabel: { fontSize: 13, color: '#FFFFFF', fontFamily: 'DMSans_700Bold' },
  todayPill: { backgroundColor: '#4A90D9', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  todayPillText: { fontSize: 10, color: '#FFFFFF', fontFamily: 'DMSans_700Bold' },
  weekEmpty: { fontSize: 12, color: 'rgba(255,255,255,0.2)', fontFamily: 'DMSans_400Regular', fontStyle: 'italic' },
  weekEvent: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  weekEventDot: { width: 6, height: 6, borderRadius: 3, flexShrink: 0 },
  weekEventText: { fontSize: 12, color: 'rgba(255,255,255,0.6)', fontFamily: 'DMSans_400Regular' },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  monthDayName: { width: '14.28%', textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.3)', fontFamily: 'DMSans_700Bold', paddingBottom: 8 },
  monthDayEmpty: { width: '14.28%', aspectRatio: 1 },
  monthDay: { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  monthDaySelected: { backgroundColor: '#4A90D9' },
  monthDayToday: { borderWidth: 1.5, borderColor: '#4A90D9' },
  monthDayNum: { fontSize: 14, color: '#FFFFFF', fontFamily: 'DMSans_400Regular' },
  monthDayNumSelected: { fontFamily: 'DMSans_700Bold' },
  monthDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#4A90D9', marginTop: 2 },
  monthDotSelected: { backgroundColor: '#FFFFFF' },
})