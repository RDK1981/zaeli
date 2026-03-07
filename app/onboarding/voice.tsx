import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { router } from 'expo-router'

export default function VoiceScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.progress}>
        {[1,2,3,4,5,6,7,8].map(i => (
          <View key={i} style={[styles.dot, i === 6 && styles.dotActive]} />
        ))}
      </View>

      <Text style={styles.step}>STEP 6 OF 8</Text>
      <Text style={styles.title}>Try voice{'\n'}<Text style={styles.accent}>capture</Text></Text>
      <Text style={styles.sub}>The fastest way to add anything</Text>

      <View style={styles.micContainer}>
        <TouchableOpacity style={styles.mic}>
          <Text style={styles.micIcon}>🎤</Text>
        </TouchableOpacity>
        <Text style={styles.micLabel}>Tap and say something</Text>
        <Text style={styles.micExample}>"Add milk to the shopping list"</Text>
        <Text style={styles.micExample}>"Jack has soccer Tuesday at 4pm"</Text>
      </View>

      <TouchableOpacity style={styles.btn} onPress={() => router.push('/onboarding/chores')}>
        <Text style={styles.btnText}>Love it →</Text>
      </TouchableOpacity>
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
  accent: { color: '#4A90D9', fontStyle: 'italic' },
  sub: { fontSize: 14, color: 'rgba(255,255,255,0.4)', fontFamily: 'DMSans_300Light', marginBottom: 48 },
  micContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  mic: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#141929', borderWidth: 1.5, borderColor: 'rgba(74,144,217,0.3)', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  micIcon: { fontSize: 40 },
  micLabel: { fontSize: 16, color: '#FFFFFF', fontFamily: 'DMSans_700Bold' },
  micExample: { fontSize: 13, color: 'rgba(255,255,255,0.35)', fontFamily: 'DMSans_400Regular', fontStyle: 'italic', textAlign: 'center' },
  btn: { backgroundColor: '#4A90D9', borderRadius: 16, padding: 18, alignItems: 'center' },
  btnText: { color: '#FFFFFF', fontSize: 16, fontFamily: 'DMSans_700Bold' },
})