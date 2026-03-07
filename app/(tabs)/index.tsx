import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'
import { router } from 'expo-router'

export default function HomeScreen() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>ZAELI</Text>
        <Text style={styles.greeting}>Good morning,</Text>
        <Text style={styles.name}>Sarah.</Text>
        <Text style={styles.subtitle}>Here's what's ahead today</Text>
      </View>

      <TouchableOpacity style={styles.testBtn} onPress={() => router.push('/onboarding')}>
        <Text style={styles.testBtnText}>→ Preview onboarding</Text>
      </TouchableOpacity>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>📅  Today's Events</Text>
        <Text style={styles.empty}>No events yet</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>✅  Chores</Text>
        <Text style={styles.empty}>No chores assigned yet</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>🛒  Shopping List</Text>
        <Text style={styles.empty}>Your list is empty</Text>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0F1E' },
  header: { padding: 32, paddingTop: 72, marginBottom: 8 },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 2.5, color: '#4A90D9', marginBottom: 16, fontFamily: 'DMSans_400Regular' },
  greeting: { fontSize: 32, color: '#FFFFFF', marginBottom: 0, lineHeight: 40, fontFamily: 'DMSans_300Light' },
  name: { fontSize: 38, color: '#4A90D9', fontFamily: 'DMSerifDisplay_400Regular', marginBottom: 12 },
  subtitle: { fontSize: 15, color: 'rgba(255,255,255,0.45)', fontFamily: 'DMSans_300Light' },
  testBtn: { marginHorizontal: 16, marginBottom: 16, backgroundColor: 'rgba(74,144,217,0.1)', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: 'rgba(74,144,217,0.25)' },
  testBtnText: { color: '#4A90D9', fontSize: 14, fontFamily: 'DMSans_400Regular' },
  card: { backgroundColor: '#141929', marginHorizontal: 16, marginBottom: 10, borderRadius: 18, padding: 22, borderWidth: 1, borderColor: 'rgba(74,144,217,0.12)' },
  cardTitle: { fontSize: 15, color: '#FFFFFF', marginBottom: 10, fontFamily: 'DMSans_700Bold' },
  empty: { fontSize: 13, color: 'rgba(255,255,255,0.3)', fontFamily: 'DMSans_300Light' },
})