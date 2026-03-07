import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'

const FAMILY = [
  { name: 'Sarah', avatar: '👩' },
  { name: 'Jack', avatar: '🧒' },
  { name: 'Emma', avatar: '👧' },
]

const EVENTS = [
  { time: '3:30pm', title: 'Jack — Soccer training', location: 'Chermside', color: '#4A90D9' },
  { time: '5:00pm', title: 'Emma — Science project due', location: 'School', color: '#E8922A' },
  { time: '7:00pm', title: 'Family dinner', location: 'Home', color: '#1E8A5E' },
]

const MISSIONS = [
  { name: 'Jack', avatar: '🧒', mission: 'Make bed', done: true },
  { name: 'Emma', avatar: '👧', mission: 'Tidy bedroom', done: false },
]

const SHOPPING = ['Milk', 'Bread', 'Apples', 'Pasta']

export default function HomeScreen() {
  const today = new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Good morning,</Text>
          <Text style={styles.name}>Sarah.</Text>
          <Text style={styles.date}>{today}</Text>
        </View>
        <View style={styles.avatars}>
          {FAMILY.map((m, i) => (
            <View key={i} style={styles.avatarWrap}>
              <Text style={styles.avatar}>{m.avatar}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.weather}>
        <View style={styles.weatherLeft}>
          <Text style={styles.weatherIcon}>⛅</Text>
          <View>
            <Text style={styles.weatherTemp}>24°</Text>
            <Text style={styles.weatherDesc}>Partly cloudy · Tewantin</Text>
          </View>
        </View>
        <View style={styles.weatherAlert}>
          <Text style={styles.weatherAlertText}>🌧 Rain at 3pm — Jack needs a jacket</Text>
        </View>
      </View>

      <View style={styles.briefing}>
        <Text style={styles.briefingBadge}>✦ MORNING BRIEFING</Text>
        <Text style={styles.briefingText}>
          Busy afternoon ahead — Jack has soccer at 3:30 and Emma's science project is due. Dinner's at 7. You've got this, Sarah.
        </Text>
        <Text style={styles.briefingClose}>
          Make today count — Jack's been working hard this week.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>TODAY</Text>
        {EVENTS.map((e, i) => (
          <View key={i} style={styles.event}>
            <View style={[styles.eventDot, { backgroundColor: e.color }]} />
            <View style={styles.eventInfo}>
              <Text style={styles.eventTitle}>{e.title}</Text>
              <Text style={styles.eventMeta}>{e.time} · {e.location}</Text>
            </View>
          </View>
        ))}
        <TouchableOpacity style={styles.addBtn}>
          <Text style={styles.addBtnText}>+ Add event</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>MISSIONS</Text>
        {MISSIONS.map((m, i) => (
          <View key={i} style={styles.mission}>
            <Text style={styles.missionAvatar}>{m.avatar}</Text>
            <View style={styles.missionInfo}>
              <Text style={styles.missionName}>{m.name}</Text>
              <Text style={styles.missionTask}>{m.mission}</Text>
            </View>
            <View style={[styles.missionStatus, m.done && styles.missionStatusDone]}>
              <Text style={styles.missionStatusText}>{m.done ? '✓ Done' : 'Pending'}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={[styles.section, { marginBottom: 48 }]}>
        <Text style={styles.sectionTitle}>SHOPPING LIST</Text>
        <View style={styles.shopping}>
          {SHOPPING.map((item, i) => (
            <View key={i} style={styles.shoppingItem}>
              <Text style={styles.shoppingText}>{item}</Text>
            </View>
          ))}
          <TouchableOpacity style={styles.shoppingAdd}>
            <Text style={styles.shoppingAddText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0F1E', padding: 24, paddingTop: 64 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  greeting: { fontSize: 14, color: 'rgba(255,255,255,0.4)', fontFamily: 'DMSans_300Light' },
  name: { fontSize: 36, color: '#FFFFFF', fontFamily: 'DMSerifDisplay_400Regular', lineHeight: 42 },
  date: { fontSize: 12, color: 'rgba(255,255,255,0.3)', fontFamily: 'DMSans_400Regular', marginTop: 4 },
  avatars: { flexDirection: 'row', gap: 6, marginTop: 4 },
  avatarWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#141929', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(74,144,217,0.15)' },
  avatar: { fontSize: 18 },
  weather: { backgroundColor: '#141929', borderRadius: 14, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(74,144,217,0.1)', gap: 10 },
  weatherLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  weatherIcon: { fontSize: 28 },
  weatherTemp: { fontSize: 22, color: '#FFFFFF', fontFamily: 'DMSans_300Light' },
  weatherDesc: { fontSize: 12, color: 'rgba(255,255,255,0.4)', fontFamily: 'DMSans_400Regular' },
  weatherAlert: { backgroundColor: 'rgba(74,144,217,0.08)', borderRadius: 8, padding: 8 },
  weatherAlertText: { fontSize: 12, color: 'rgba(255,255,255,0.6)', fontFamily: 'DMSans_400Regular' },
  briefing: { backgroundColor: '#141929', borderRadius: 16, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(74,144,217,0.15)' },
  briefingBadge: { fontSize: 10, letterSpacing: 1.5, color: '#4A90D9', fontFamily: 'DMSans_700Bold', marginBottom: 10 },
  briefingText: { fontSize: 14, color: 'rgba(255,255,255,0.8)', fontFamily: 'DMSans_300Light', lineHeight: 22, marginBottom: 12 },
  briefingClose: { fontSize: 13, color: 'rgba(255,255,255,0.35)', fontFamily: 'DMSans_400Regular', fontStyle: 'italic', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)', paddingTop: 10 },
  section: { backgroundColor: '#141929', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(74,144,217,0.08)' },
  sectionTitle: { fontSize: 10, letterSpacing: 1.5, color: 'rgba(255,255,255,0.3)', fontFamily: 'DMSans_700Bold', marginBottom: 12 },
  event: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  eventDot: { width: 8, height: 8, borderRadius: 4, marginTop: 2, flexShrink: 0 },
  eventInfo: { flex: 1 },
  eventTitle: { fontSize: 14, color: '#FFFFFF', fontFamily: 'DMSans_400Regular' },
  eventMeta: { fontSize: 12, color: 'rgba(255,255,255,0.35)', fontFamily: 'DMSans_400Regular', marginTop: 2 },
  addBtn: { marginTop: 4, paddingVertical: 8 },
  addBtnText: { fontSize: 13, color: '#4A90D9', fontFamily: 'DMSans_400Regular' },
  mission: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  missionAvatar: { fontSize: 22 },
  missionInfo: { flex: 1 },
  missionName: { fontSize: 13, color: '#FFFFFF', fontFamily: 'DMSans_700Bold' },
  missionTask: { fontSize: 12, color: 'rgba(255,255,255,0.4)', fontFamily: 'DMSans_400Regular' },
  missionStatus: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  missionStatusDone: { backgroundColor: 'rgba(30,138,94,0.15)' },
  missionStatusText: { fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: 'DMSans_700Bold' },
  shopping: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  shoppingItem: { backgroundColor: 'rgba(74,144,217,0.08)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(74,144,217,0.15)' },
  shoppingText: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontFamily: 'DMSans_400Regular' },
  shoppingAdd: { backgroundColor: 'rgba(74,144,217,0.1)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(74,144,217,0.2)' },
  shoppingAddText: { fontSize: 16, color: '#4A90D9' },
})