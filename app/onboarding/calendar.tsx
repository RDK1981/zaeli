import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { router } from 'expo-router'
import { useState } from 'react'

const CALENDARS = [
  { id: 'google', icon: '📅', name: 'Google Calendar', desc: 'Tap to connect' },
  { id: 'apple', icon: '🍎', name: 'Apple Calendar', desc: 'Tap to connect' },
  { id: 'outlook', icon: '📧', name: 'Outlook', desc: 'Tap to connect' },
]

export default function CalendarScreen() {
  const [connected, setConnected] = useState<string[]>([])

  const toggle = (id: string) => {
    setConnected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  return (
    <View style={styles.container}>
      <View style={styles.progress}>
        {[1,2,3,4,5,6,7,8].map(i => (
          <View key={i} style={[styles.dot, i === 3 && styles.dotActive]} />
        ))}
      </View>

      <Text style={styles.step}>STEP 3 OF 8</Text>
      <Text style={styles.title}>Connect your{'\n'}calendars</Text>
      <Text style={styles.sub}>Two-way live sync. Nothing to re-enter.</Text>

      <View style={styles.options}>
        {CALENDARS.map(cal => {
          const isConnected = connected.includes(cal.id)
          return (
            <TouchableOpacity
              key={cal.id}
              style={[styles.option, isConnected && styles.optionConnected]}
              onPress={() => toggle(cal.id)}
            >
              <Text style={styles.optionIcon}>{cal.icon}</Text>
              <View style={styles.optionInfo}>
                <Text style={styles.optionName}>{cal.name}</Text>
                <Text style={styles.optionDesc}>{isConnected ? 'Connected ✓' : cal.desc}</Text>
              </View>
              {isConnected
                ? <View style={styles.check}><Text style={styles.checkText}>✓</Text></View>
                : <View style={styles.circle} />
              }
            </TouchableOpacity>
          )
        })}
      </View>

      <Text style={styles.hint}>Conflicts are flagged <Text style={styles.bold}>before</Text> they become problems.</Text>

      <View style={styles.bottom}>
        <TouchableOpacity style={styles.btn} onPress={() => router.push('/onboarding/briefing')}>
          <Text style={styles.btnText}>Continue →</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.skipBtn} onPress={() => router.push('/onboarding/briefing')}>
          <Text style={styles.skipBtnText}>I'll use Zaeli's built-in calendar</Text>
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
  sub: { fontSize: 14, color: 'rgba(255,255,255,0.4)', fontFamily: 'DMSans_300Light', marginBottom: 32 },
  options: { gap: 12, marginBottom: 24 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#141929', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: 'rgba(74,144,217,0.1)' },
  optionConnected: { borderColor: 'rgba(30,138,94,0.4)', backgroundColor: 'rgba(30,138,94,0.05)' },
  optionIcon: { fontSize: 24 },
  optionInfo: { flex: 1 },
  optionName: { fontSize: 15, color: '#FFFFFF', fontFamily: 'DMSans_700Bold', marginBottom: 2 },
  optionDesc: { fontSize: 12, color: 'rgba(255,255,255,0.35)', fontFamily: 'DMSans_400Regular' },
  check: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#1E8A5E', alignItems: 'center', justifyContent: 'center' },
  checkText: { color: '#FFFFFF', fontSize: 14 },
  circle: { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.2)' },
  hint: { fontSize: 13, color: 'rgba(255,255,255,0.35)', fontFamily: 'DMSans_400Regular', lineHeight: 20 },
  bold: { color: 'rgba(255,255,255,0.7)', fontFamily: 'DMSans_700Bold' },
  bottom: { position: 'absolute', bottom: 48, left: 32, right: 32, gap: 12 },
  btn: { backgroundColor: '#4A90D9', borderRadius: 16, padding: 18, alignItems: 'center' },
  btnText: { color: '#FFFFFF', fontSize: 16, fontFamily: 'DMSans_700Bold' },
  skipBtn: { backgroundColor: '#141929', borderRadius: 16, padding: 18, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  skipBtnText: { color: 'rgba(255,255,255,0.5)', fontSize: 15, fontFamily: 'DMSans_400Regular' },
})