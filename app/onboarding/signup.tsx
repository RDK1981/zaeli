import { View, Text, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, TouchableWithoutFeedback, Keyboard, Platform } from 'react-native'
import { router } from 'expo-router'
import { useState } from 'react'

export default function SignupScreen() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const ready = name && email && password

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.inner}>
          <View style={styles.progress}>
            {[1,2,3,4,5,6,7,8].map(i => (
              <View key={i} style={[styles.dot, i === 1 && styles.dotActive]} />
            ))}
          </View>

          <Text style={styles.step}>STEP 1 OF 8</Text>
          <Text style={styles.title}>Let's get{'\n'}you set up</Text>
          <Text style={styles.sub}>You're the family organiser. We'll add everyone else next.</Text>

          <View style={styles.fields}>
            <TextInput
              style={styles.input}
              placeholder="Your first name"
              placeholderTextColor="rgba(255,255,255,0.2)"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              returnKeyType="next"
            />
            <TextInput
              style={styles.input}
              placeholder="Email address"
              placeholderTextColor="rgba(255,255,255,0.2)"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType="next"
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="rgba(255,255,255,0.2)"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={Keyboard.dismiss}
            />
          </View>

          <TouchableOpacity
            style={[styles.btn, !ready && styles.btnDisabled]}
            disabled={!ready}
            onPress={() => router.push('/onboarding/family')}
          >
            <Text style={styles.btnText}>Create account →</Text>
          </TouchableOpacity>

          <Text style={styles.legal}>By continuing you agree to our Terms and Privacy Policy.</Text>
        </View>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0F1E' },
  inner: { flex: 1, padding: 32, paddingTop: 64 },
  progress: { flexDirection: 'row', gap: 6, marginBottom: 32 },
  dot: { flex: 1, height: 3, borderRadius: 2, backgroundColor: 'rgba(74,144,217,0.2)' },
  dotActive: { backgroundColor: '#4A90D9' },
  step: { fontSize: 11, letterSpacing: 1.5, color: '#4A90D9', marginBottom: 12, fontFamily: 'DMSans_700Bold' },
  title: { fontSize: 36, color: '#FFFFFF', fontFamily: 'DMSans_300Light', lineHeight: 42, marginBottom: 8 },
  sub: { fontSize: 14, color: 'rgba(255,255,255,0.4)', fontFamily: 'DMSans_300Light', marginBottom: 32, lineHeight: 22 },
  fields: { gap: 12, marginBottom: 24 },
  input: { backgroundColor: '#141929', borderRadius: 12, padding: 16, color: '#FFFFFF', fontSize: 15, borderWidth: 1, borderColor: 'rgba(74,144,217,0.15)', fontFamily: 'DMSans_400Regular' },
  btn: { backgroundColor: '#4A90D9', borderRadius: 16, padding: 18, alignItems: 'center', marginBottom: 16 },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: '#FFFFFF', fontSize: 16, fontFamily: 'DMSans_700Bold' },
  legal: { fontSize: 11, color: 'rgba(255,255,255,0.2)', fontFamily: 'DMSans_400Regular', textAlign: 'center', lineHeight: 18 },
})