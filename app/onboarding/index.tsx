import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { router } from 'expo-router'

export default function OnboardingWelcome() {
  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <View style={styles.logo}>
          <Text style={styles.logoMark}>◝</Text>
        </View>
        <Text style={styles.logoText}>Zaeli</Text>
      </View>

      <View style={styles.bottom}>
        <Text style={styles.headline}>The family app{'\n'}that <Text style={styles.italic}>thinks ahead.</Text></Text>
        <Text style={styles.sub}>AI-powered. Voice-first.{'\n'}Built for how families actually live.</Text>

        <TouchableOpacity style={styles.btn} onPress={() => router.push('/onboarding/signup')}>
          <Text style={styles.btnText}>Get started</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.btnSecondary}>
          <Text style={styles.btnSecondaryText}>I already have an account</Text>
        </TouchableOpacity>

        <Text style={styles.fine}>Free 14-day trial · No credit card</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0F1E', justifyContent: 'space-between', padding: 32, paddingTop: 80 },
  logoContainer: { alignItems: 'center' },
  logo: { width: 64, height: 64, borderRadius: 16, backgroundColor: '#141929', borderWidth: 1, borderColor: 'rgba(74,144,217,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  logoMark: { fontSize: 28, color: '#4A90D9' },
  logoText: { fontSize: 20, color: '#FFFFFF', fontFamily: 'DMSerifDisplay_400Regular' },
  bottom: { paddingBottom: 20 },
  headline: { fontSize: 38, color: '#FFFFFF', fontFamily: 'DMSans_300Light', lineHeight: 46, marginBottom: 16 },
  italic: { fontStyle: 'italic', color: '#4A90D9' },
  sub: { fontSize: 15, color: 'rgba(255,255,255,0.5)', fontFamily: 'DMSans_300Light', lineHeight: 24, marginBottom: 40 },
  btn: { backgroundColor: '#4A90D9', borderRadius: 16, padding: 18, alignItems: 'center', marginBottom: 12 },
  btnText: { color: '#FFFFFF', fontSize: 16, fontFamily: 'DMSans_700Bold' },
  btnSecondary: { backgroundColor: '#141929', borderRadius: 16, padding: 18, alignItems: 'center', marginBottom: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  btnSecondaryText: { color: 'rgba(255,255,255,0.6)', fontSize: 16, fontFamily: 'DMSans_400Regular' },
  fine: { textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.25)', fontFamily: 'DMSans_400Regular' },
})