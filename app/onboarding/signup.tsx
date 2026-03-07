import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native'
import { router } from 'expo-router'
import { useState } from 'react'

export default function SignupScreen() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  return (
    <View style={styles.container}>
      <View style={styles.progress}>
        {[1,2,3,4,5,6,7,8].map(i => (
          <View key={i} style={[styles.dot, i === 1 && styles.dotActive]} />
        ))}
      </View>

      <Text style={styles.step}>STEP 1 OF 8</Text>
      <Text style={styles.title}>Create your{'\n'}account</Text>
      <Text style={styles.wave}>👋</Text>

      <View style={styles.form}>
        <Text style={styles.fieldLabel}>FIRST NAME</Text>
        <TextInput
          style={styles.input}
          placeholder="Sarah"
          placeholderTextColor="rgba(255,255,255,0.2)"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />

        <Text style={styles.fieldLabel}>EMAIL</Text>
        <TextInput
          style={styles.input}
          placeholder="sarah@example.com"
          placeholderTextColor="rgba(255,255,255,0.2)"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={styles.fieldLabel}>PASSWORD</Text>
        <TextInput
          style={styles.input}
          placeholder="Create a password"
          placeholderTextColor="rgba(255,255,255,0.2)"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
      </View>

      <TouchableOpacity
        style={[styles.btn, (!name || !email || !password) && styles.btnDisabled]}
        onPress={() => router.push('/onboarding/family')}
        disabled={!name || !email || !password}
      >
        <Text style={styles.btnText}>Create account →</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0F1E', padding: 32, paddingTop: 64 },
  progress: { flexDirection: 'row', gap: 6, marginBottom: 32 },
  dot: { flex: 1, height: 3, borderRadius: 2, backgroundColor: 'rgba(74,144,217,0.2)' },
  dotActive: { backgroundColor: '#4A90D9' },
  step: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, color: '#4A90D9', marginBottom: 12, fontFamily: 'DMSans_700Bold' },
  title: { fontSize: 36, color: '#FFFFFF', fontFamily: 'DMSans_300Light', lineHeight: 42, marginBottom: 8 },
  wave: { fontSize: 28, marginBottom: 32 },
  form: { gap: 8, marginBottom: 32 },
  fieldLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, color: 'rgba(255,255,255,0.4)', marginBottom: 6, marginTop: 8, fontFamily: 'DMSans_700Bold' },
  input: { backgroundColor: '#141929', borderRadius: 12, padding: 16, color: '#FFFFFF', fontSize: 15, borderWidth: 1, borderColor: 'rgba(74,144,217,0.15)', fontFamily: 'DMSans_400Regular' },
  btn: { backgroundColor: '#4A90D9', borderRadius: 16, padding: 18, alignItems: 'center' },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: '#FFFFFF', fontSize: 16, fontFamily: 'DMSans_700Bold' },
})