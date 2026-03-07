import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { router } from 'expo-router'

export default function ReadyScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.progress}>
        {[1,2,3,4,5,6,7,8].map(i => (
          <View key={i} style={[styles.dot, styles.dotActive]} />
        ))}
      </View>

      <View style={styles.center}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>✦</Text>
        </View>

        <Text style={styles.title}>You're all set,{'\n'}<Text style={styles.accent}>Sarah.</Text></Text>
        <Text style={styles.sub}>Your first morning briefing arrives{'\n'}tomorrow at 7:00am.</Text>

        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statNum}>23</Text>
            <Text style={styles.statLabel}>EVENTS</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNum}>4</Text>
            <Text style={styles.statLabel}>MEMBERS</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNum}>5</Text>
            <Text style={styles.statLabel}>CHORES</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity style={styles.btn} onPress={() => router.replace('/(tabs)')}>
        <Text style={styles.btnText}>Open dashboard →</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0F1E', padding: 32, paddingTop: 64 },
  progress: { flexDirection: 'row', gap: 6, marginBottom: 32 },
  dot: { flex: 1, height: 3, borderRadius: 2, backgroundColor: 'rgba(74,144,217,0.2)' },
  dotActive: { backgroundColor: '#4A90D9' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  iconContainer: { width: 80, height: 80, borderRadius: 40, borderWidth: 1.5, borderColor: 'rgba(74,144,217,0.3)', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  icon: { fontSize: 32, color: '#4A90D9' },
  title: { fontSize: 38, color: '#FFFFFF', fontFamily: 'DMSans_300Light', textAlign: 'center', lineHeight: 46 },
  accent: { color: '#4A90D9', fontFamily: 'DMSerifDisplay_400Regular' },
  sub: { fontSize: 15, color: 'rgba(255,255,255,0.4)', fontFamily: 'DMSans_300Light', textAlign: 'center', lineHeight: 24 },
  stats: { flexDirection: 'row', gap: 12, marginTop: 16 },
  stat: { backgroundColor: '#141929', borderRadius: 14, padding: 20, alignItems: 'center', flex: 1, borderWidth: 1, borderColor: 'rgba(74,144,217,0.1)' },
  statNum: { fontSize: 28, color: '#4A90D9', fontFamily: 'DMSerifDisplay_400Regular', marginBottom: 4 },
  statLabel: { fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: 'DMSans_700Bold', letterSpacing: 1.2 },
  btn: { backgroundColor: '#4A90D9', borderRadius: 16, padding: 18, alignItems: 'center', marginBottom: 16 },
  btnText: { color: '#FFFFFF', fontSize: 16, fontFamily: 'DMSans_700Bold' },
})