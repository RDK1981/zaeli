import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { router } from 'expo-router'

const EVENTS = [
  { time: '3:30pm', title: 'Jack · Soccer training Chermside', color: '#4A90D9' },
  { time: '5:00pm', title: 'Emma · Science project due', color: '#E8922A' },
  { time: '7:00pm', title: 'Family · Dad\'s birthday dinner', color: '#1E8A5E' },
]

export default function BriefingScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.progress}>
        {[1,2,3,4,5,6,7,8].map(i => (
          <View key={i} style={[styles.dot, i === 4 && styles.dotActive]} />
        ))}
      </View>

      <Text style={styles.step}>STEP 4 OF 8</Text>
      <Text style={styles.title}>Here's what's{'\n'}ahead, <Text style={styles.accent}>Sarah</Text></Text>
      <Text style={styles.sub}>Your first Zaeli briefing — based on your real week.</Text>

      <View style={styles.card}>
        <Text style={styles.cardBadge}>✦ TOMORROW'S BRIEFING</Text>
        {EVENTS.map((e, i) => (
          <View key={i} style={styles.event}>
            <View style={[styles.dot2, { backgroundColor: e.color }]} />
            <View>
              <Text style={styles.eventTitle}>{e.title}</Text>
              <Text style={styles.eventTime}>{e.time}</Text>
            </View>
          </View>
        ))}
        <Text style={styles.cardClose}>Big day tomorrow — you've got everything covered.</Text>
      </View>

      <View style={styles.bottom}>
        <TouchableOpacity style={styles.btn} onPress={() => router.push('/onboarding/time')}>
          <Text style={styles.btnText}>Yes please →</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/onboarding/time')}>
          <Text style={styles.skip}>Maybe later</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0F1E', padding: 32, paddingTop: 64 },
  progress: { flexDirection: 'row', gap: 6, marginBottom: 32 },
  dot: { flex: 1, height: 3, borderRadius: 2, backgroundColor: 'rgba(74,144,217,0.2)' },
  dotActive: { backgroundColor: '#4A90D9' },
  step: { fontSize: 11, letterSpacing: 1.5, color: '#4A90D9', marginBottom: 12, fontFamily: 'DMSans_700Bold' },
  title: { fontSize: 36, color: '#FFFFFF', fontFamily: 'DMSans_300Light', lineHeight: 42, marginBottom: 8 },
  accent: { color: '#4A90D9', fontFamily: 'DMSerifDisplay_400Regular' },
  sub: { fontSize: 14, color: 'rgba(255,255,255,0.4)', fontFamily: 'DMSans_300Light', marginBottom: 28 },
  card: { backgroundColor: '#141929', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: 'rgba(74,144,217,0.15)', flex: 1 },
  cardBadge: { fontSize: 10, letterSpacing: 1.5, color: '#4A90D9', fontFamily: 'DMSans_700Bold', marginBottom: 16 },
  event: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  dot2: { width: 8, height: 8, borderRadius: 4, marginTop: 4, flexShrink: 0 },
  eventTitle: { fontSize: 14, color: '#FFFFFF', fontFamily: 'DMSans_400Regular' },
  eventTime: { fontSize: 12, color: 'rgba(255,255,255,0.35)', fontFamily: 'DMSans_400Regular', marginTop: 2 },
  cardClose: { fontSize: 13, color: 'rgba(255,255,255,0.35)', fontFamily: 'DMSans_400Regular', fontStyle: 'italic', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)', paddingTop: 14, marginTop: 4 },
  bottom: { position: 'absolute', bottom: 48, left: 32, right: 32, gap: 12 },
  btn: { backgroundColor: '#4A90D9', borderRadius: 16, padding: 18, alignItems: 'center' },
  btnText: { color: '#FFFFFF', fontSize: 16, fontFamily: 'DMSans_700Bold' },
  skip: { textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 14, fontFamily: 'DMSans_400Regular' },
})