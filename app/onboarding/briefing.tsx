import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native'
import { router } from 'expo-router'

export default function BriefingScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.progress}>
        {[1,2,3,4,5,6,7,8].map(i => (
          <View key={i} style={[styles.dot, i === 4 && styles.dotActive]} />
        ))}
      </View>

      <Text style={styles.step}>YOUR FIRST BRIEFING</Text>
      <Text style={styles.title}>Here's what's{'\n'}<Text style={styles.accent}>ahead, Sarah</Text></Text>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>THIS WEEK</Text>

        <View style={styles.event}>
          <View style={[styles.dot2, { backgroundColor: '#4A90D9' }]} />
          <View>
            <Text style={styles.eventWho}>JACK · TOMORROW</Text>
            <Text style={styles.eventTitle}>Soccer training — Chermside</Text>
            <Text style={styles.eventDetail}>4:00pm · Leave by 3:25pm</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.event}>
          <View style={[styles.dot2, { backgroundColor: '#E8922A' }]} />
          <View>
            <Text style={styles.eventWho}>EMMA · THURSDAY</Text>
            <Text style={styles.eventTitle}>Science project due</Text>
            <Text style={styles.eventDetail}>Year 4 · Mrs Campbell</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.event}>
          <View style={[styles.dot2, { backgroundColor: '#1E8A5E' }]} />
          <View>
            <Text style={styles.eventWho}>FAMILY · SATURDAY</Text>
            <Text style={styles.eventTitle}>Dad's birthday dinner</Text>
            <Text style={styles.eventDetail}>7:00pm · Restaurant booked ✓</Text>
          </View>
        </View>
      </View>

      <View style={styles.askCard}>
        <Text style={styles.askText}>"Want me to send a briefing like this every morning?"</Text>
        <View style={styles.askBtns}>
          <TouchableOpacity style={styles.yesBtn} onPress={() => router.push('/onboarding/time')}>
            <Text style={styles.yesBtnText}>Yes please</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.maybeBtn} onPress={() => router.push('/onboarding/time')}>
            <Text style={styles.maybeBtnText}>Maybe later</Text>
          </TouchableOpacity>
        </View>
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
  title: { fontSize: 36, color: '#FFFFFF', fontFamily: 'DMSans_300Light', lineHeight: 42, marginBottom: 24 },
  accent: { color: '#4A90D9', fontStyle: 'italic' },
  card: { backgroundColor: '#141929', borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(74,144,217,0.1)' },
  cardLabel: { fontSize: 10, letterSpacing: 1.5, color: 'rgba(255,255,255,0.3)', marginBottom: 16, fontFamily: 'DMSans_700Bold' },
  event: { flexDirection: 'row', gap: 14, alignItems: 'flex-start', paddingVertical: 8 },
  dot2: { width: 8, height: 8, borderRadius: 4, marginTop: 5, flexShrink: 0 },
  eventWho: { fontSize: 10, letterSpacing: 1.2, color: 'rgba(255,255,255,0.35)', marginBottom: 3, fontFamily: 'DMSans_700Bold' },
  eventTitle: { fontSize: 15, color: '#FFFFFF', fontFamily: 'DMSans_700Bold', marginBottom: 2 },
  eventDetail: { fontSize: 12, color: 'rgba(255,255,255,0.4)', fontFamily: 'DMSans_400Regular' },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginVertical: 4 },
  askCard: { backgroundColor: '#141929', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: 'rgba(74,144,217,0.1)' },
  askText: { fontSize: 14, color: 'rgba(255,255,255,0.6)', fontFamily: 'DMSans_400Regular', fontStyle: 'italic', lineHeight: 22, marginBottom: 16 },
  askBtns: { flexDirection: 'row', gap: 10 },
  yesBtn: { flex: 1, backgroundColor: '#4A90D9', borderRadius: 12, padding: 14, alignItems: 'center' },
  yesBtnText: { color: '#FFFFFF', fontSize: 14, fontFamily: 'DMSans_700Bold' },
  maybeBtn: { flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: 14, alignItems: 'center' },
  maybeBtnText: { color: 'rgba(255,255,255,0.4)', fontSize: 14, fontFamily: 'DMSans_400Regular' },
})