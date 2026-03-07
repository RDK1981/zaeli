import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { router } from 'expo-router'
import { useState } from 'react'
import DateTimePicker from '@react-native-community/datetimepicker'

export default function TimeScreen() {
  const [time, setTime] = useState(new Date(2026, 0, 1, 7, 0))
  const [showPicker, setShowPicker] = useState(false)
  const [morningOn, setMorningOn] = useState(true)
  const [eveningOn, setEveningOn] = useState(false)
  const [conflictsOn, setConflictsOn] = useState(true)

  const formatTime = (date: Date) => {
    let hours = date.getHours()
    const mins = date.getMinutes().toString().padStart(2, '0')
    const ampm = hours >= 12 ? 'pm' : 'am'
    hours = hours % 12 || 12
    return `${hours}:${mins} ${ampm}`
  }

  return (
    <View style={styles.container}>
      <View style={styles.progress}>
        {[1,2,3,4,5,6,7,8].map(i => (
          <View key={i} style={[styles.dot, i === 5 && styles.dotActive]} />
        ))}
      </View>
      <Text style={styles.step}>STEP 5 OF 8</Text>
      <Text style={styles.title}>Set your{'\n'}briefing time</Text>
      <Text style={styles.sub}>When do your mornings start?</Text>
      <TouchableOpacity style={styles.timeCard} onPress={() => setShowPicker(true)}>
        <Text style={styles.timeLabel}>DAILY BRIEFING · TAP TO CHANGE</Text>
        <Text style={styles.timeBig}>{formatTime(time)}</Text>
      </TouchableOpacity>
      {showPicker && (
        <View style={styles.pickerContainer}>
          <DateTimePicker
            value={time}
            mode="time"
            is24Hour={false}
            display="spinner"
            onChange={(event, date) => {
              if (date) setTime(date)
            }}
            themeVariant="dark"
          />
          <TouchableOpacity style={styles.doneBtn} onPress={() => setShowPicker(false)}>
            <Text style={styles.doneBtnText}>Done ✓</Text>
          </TouchableOpacity>
        </View>
      )}
      <View style={styles.toggles}>
        <View style={styles.toggleRow}>
          <View>
            <Text style={styles.toggleTitle}>Morning briefing</Text>
            <Text style={styles.toggleSub}>Daily family overview</Text>
          </View>
          <TouchableOpacity style={[styles.toggle, morningOn && styles.toggleOn]} onPress={() => setMorningOn(!morningOn)}>
            <View style={[styles.toggleThumb, morningOn && styles.toggleThumbOn]} />
          </TouchableOpacity>
        </View>
        <View style={styles.toggleRow}>
          <View>
            <Text style={styles.toggleTitle}>Evening recap</Text>
            <Text style={styles.toggleSub}>Tomorrow's plan at 8pm</Text>
          </View>
          <TouchableOpacity style={[styles.toggle, eveningOn && styles.toggleOn]} onPress={() => setEveningOn(!eveningOn)}>
            <View style={[styles.toggleThumb, eveningOn && styles.toggleThumbOn]} />
          </TouchableOpacity>
        </View>
        <View style={styles.toggleRow}>
          <View>
            <Text style={styles.toggleTitle}>Conflict alerts</Text>
            <Text style={styles.toggleSub}>When schedules clash</Text>
          </View>
          <TouchableOpacity style={[styles.toggle, conflictsOn && styles.toggleOn]} onPress={() => setConflictsOn(!conflictsOn)}>
            <View style={[styles.toggleThumb, conflictsOn && styles.toggleThumbOn]} />
          </TouchableOpacity>
        </View>
      </View>
      <TouchableOpacity style={styles.btn} onPress={() => router.push('/onboarding/voice')}>
        <Text style={styles.btnText}>Sounds good →</Text>
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
  sub: { fontSize: 14, color: 'rgba(255,255,255,0.4)', fontFamily: 'DMSans_300Light', marginBottom: 24 },
  timeCard: { backgroundColor: '#141929', borderRadius: 16, padding: 24, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(74,144,217,0.15)', alignItems: 'center' },
  timeLabel: { fontSize: 10, letterSpacing: 1.5, color: 'rgba(255,255,255,0.3)', marginBottom: 8, fontFamily: 'DMSans_700Bold' },
  timeBig: { fontSize: 52, color: '#FFFFFF', fontFamily: 'DMSans_300Light' },
  pickerContainer: { backgroundColor: '#141929', borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(74,144,217,0.15)', overflow: 'hidden' },
  doneBtn: { backgroundColor: '#4A90D9', margin: 12, borderRadius: 12, padding: 14, alignItems: 'center' },
  doneBtnText: { color: '#FFFFFF', fontSize: 15, fontFamily: 'DMSans_700Bold' },
  toggles: { gap: 2, marginBottom: 32 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#141929', borderRadius: 14, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(74,144,217,0.08)' },
  toggleTitle: { fontSize: 14, color: '#FFFFFF', fontFamily: 'DMSans_700Bold', marginBottom: 2 },
  toggleSub: { fontSize: 12, color: 'rgba(255,255,255,0.35)', fontFamily: 'DMSans_400Regular' },
  toggle: { width: 48, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', padding: 2 },
  toggleOn: { backgroundColor: '#4A90D9' },
  toggleThumb: { width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.4)' },
  toggleThumbOn: { backgroundColor: '#FFFFFF', alignSelf: 'flex-end' },
  btn: { backgroundColor: '#4A90D9', borderRadius: 16, padding: 18, alignItems: 'center' },
  btnText: { color: '#FFFFFF', fontSize: 16, fontFamily: 'DMSans_700Bold' },
})