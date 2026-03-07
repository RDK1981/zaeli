import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput } from 'react-native'
import { router } from 'expo-router'
import { useState } from 'react'

type Chore = { emoji: string, title: string, points: number, member: string }

const INITIAL_CHORES: Chore[] = [
  { emoji: '🛏️', title: 'Make bed each morning', points: 5, member: 'Jack' },
  { emoji: '🎒', title: 'Pack school bag', points: 5, member: 'Jack' },
  { emoji: '🐕', title: 'Feed the dog', points: 10, member: 'Jack' },
  { emoji: '🧹', title: 'Tidy bedroom', points: 5, member: 'Emma' },
  { emoji: '🍽️', title: 'Set the dinner table', points: 5, member: 'Emma' },
  { emoji: '🌿', title: 'Water the plants', points: 5, member: 'Emma' },
]

const MEMBERS = [
  { name: 'Jack', age: 9, avatar: '🧒' },
  { name: 'Emma', age: 7, avatar: '👧' },
]

export default function ChoresScreen() {
  const [chores, setChores] = useState<Chore[]>(INITIAL_CHORES)
  const [selected, setSelected] = useState<number[]>([0, 1, 3])
  const [showAdd, setShowAdd] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newPoints, setNewPoints] = useState('5')
  const [newMembers, setNewMembers] = useState<string[]>(['Jack'])
  const [newEmoji, setNewEmoji] = useState('⭐')

  const toggleSelected = (i: number) => {
    setSelected(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i])
  }

  const toggleMember = (m: string) => {
    setNewMembers(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m])
  }

  const addCustom = () => {
    if (!newTitle || newMembers.length === 0) return
    const newChores: Chore[] = newMembers.map(m => ({
      emoji: newEmoji,
      title: newTitle,
      points: parseInt(newPoints) || 5,
      member: m,
    }))
    const newIndices = newChores.map((_, i) => chores.length + i)
    setChores(prev => [...prev, ...newChores])
    setSelected(prev => [...prev, ...newIndices])
    setNewTitle('')
    setNewPoints('5')
    setNewMembers(['Jack'])
    setNewEmoji('⭐')
    setShowAdd(false)
  }

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.progress}>
        {[1,2,3,4,5,6,7,8].map(i => (
          <View key={i} style={[styles.dot, i === 7 && styles.dotActive]} />
        ))}
      </View>

      <Text style={styles.step}>STEP 7 OF 8</Text>
      <Text style={styles.title}>Quick chore{'\n'}setup</Text>
      <Text style={styles.sub}>AI-suggested for your kids' ages.</Text>

      {MEMBERS.map(member => {
        const memberChores = chores.map((c, i) => ({ ...c, idx: i })).filter(c => c.member === member.name)
        return (
          <View key={member.name} style={styles.memberSection}>
            <View style={styles.memberHeader}>
              <Text style={styles.memberAvatar}>{member.avatar}</Text>
              <View>
                <Text style={styles.memberName}>{member.name}</Text>
                <Text style={styles.memberAge}>Age {member.age}</Text>
              </View>
            </View>
            {memberChores.map((chore) => {
              const isSelected = selected.includes(chore.idx)
              return (
                <TouchableOpacity
                  key={chore.idx}
                  style={[styles.chore, isSelected && styles.choreSelected]}
                  onPress={() => toggleSelected(chore.idx)}
                >
                  <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                    {isSelected && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={styles.choreEmoji}>{chore.emoji}</Text>
                  <Text style={styles.choreTitle}>{chore.title}</Text>
                  <View style={styles.points}>
                    <Text style={styles.pointsText}>{chore.points} pts</Text>
                  </View>
                </TouchableOpacity>
              )
            })}
          </View>
        )
      })}

      {showAdd ? (
        <View style={styles.addForm}>
          <Text style={styles.addFormTitle}>ADD CUSTOM CHORE</Text>
          <TextInput
            style={styles.input}
            placeholder="Chore name"
            placeholderTextColor="rgba(255,255,255,0.2)"
            value={newTitle}
            onChangeText={setNewTitle}
            autoFocus
          />
          <View style={styles.row}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Points"
              placeholderTextColor="rgba(255,255,255,0.2)"
              value={newPoints}
              onChangeText={setNewPoints}
              keyboardType="number-pad"
            />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Emoji"
              placeholderTextColor="rgba(255,255,255,0.2)"
              value={newEmoji}
              onChangeText={setNewEmoji}
            />
          </View>
          <Text style={styles.assignLabel}>ASSIGN TO</Text>
          <View style={styles.memberBtns}>
            {MEMBERS.map(m => (
              <TouchableOpacity
                key={m.name}
                style={[styles.memberBtn, newMembers.includes(m.name) && styles.memberBtnActive]}
                onPress={() => toggleMember(m.name)}
              >
                <Text style={styles.memberBtnAvatar}>{m.avatar}</Text>
                <Text style={[styles.memberBtnText, newMembers.includes(m.name) && styles.memberBtnTextActive]}>{m.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.row}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAdd(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, (!newTitle || newMembers.length === 0) && styles.saveBtnDisabled]}
              onPress={addCustom}
              disabled={!newTitle || newMembers.length === 0}
            >
              <Text style={styles.saveBtnText}>Add chore</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity style={styles.addChoreBtn} onPress={() => setShowAdd(true)}>
          <Text style={styles.addChoreBtnText}>+ Add custom chore</Text>
        </TouchableOpacity>
      )}

      <View style={styles.bottom}>
        <TouchableOpacity style={styles.laterBtn} onPress={() => router.push('/onboarding/ready')}>
          <Text style={styles.laterText}>Later</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btn} onPress={() => router.push('/onboarding/ready')}>
          <Text style={styles.btnText}>Add these ✓</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
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
  memberSection: { marginBottom: 24 },
  memberHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  memberAvatar: { fontSize: 28 },
  memberName: { fontSize: 15, color: '#FFFFFF', fontFamily: 'DMSans_700Bold' },
  memberAge: { fontSize: 12, color: 'rgba(255,255,255,0.35)', fontFamily: 'DMSans_400Regular' },
  chore: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#141929', borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(74,144,217,0.08)' },
  choreSelected: { borderColor: 'rgba(74,144,217,0.4)', backgroundColor: 'rgba(74,144,217,0.05)' },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  checkboxSelected: { backgroundColor: '#4A90D9', borderColor: '#4A90D9' },
  checkmark: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  choreEmoji: { fontSize: 18 },
  choreTitle: { flex: 1, fontSize: 13, color: '#FFFFFF', fontFamily: 'DMSans_400Regular' },
  points: { backgroundColor: 'rgba(232,146,42,0.15)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  pointsText: { fontSize: 11, color: '#E8922A', fontFamily: 'DMSans_700Bold' },
  addChoreBtn: { borderWidth: 1.5, borderColor: 'rgba(74,144,217,0.3)', borderRadius: 12, borderStyle: 'dashed', padding: 14, alignItems: 'center', marginBottom: 16 },
  addChoreBtnText: { color: '#4A90D9', fontSize: 14, fontFamily: 'DMSans_700Bold' },
  addForm: { backgroundColor: '#141929', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(74,144,217,0.2)' },
  addFormTitle: { fontSize: 10, letterSpacing: 1.5, color: 'rgba(255,255,255,0.3)', marginBottom: 12, fontFamily: 'DMSans_700Bold' },
  input: { backgroundColor: '#0A0F1E', borderRadius: 10, padding: 12, color: '#FFFFFF', fontSize: 14, borderWidth: 1, borderColor: 'rgba(74,144,217,0.15)', marginBottom: 10, fontFamily: 'DMSans_400Regular' },
  row: { flexDirection: 'row', gap: 10 },
  assignLabel: { fontSize: 10, letterSpacing: 1.5, color: 'rgba(255,255,255,0.3)', marginBottom: 8, fontFamily: 'DMSans_700Bold' },
  memberBtns: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  memberBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  memberBtnActive: { borderColor: '#4A90D9', backgroundColor: 'rgba(74,144,217,0.1)' },
  memberBtnAvatar: { fontSize: 16 },
  memberBtnText: { color: 'rgba(255,255,255,0.4)', fontSize: 13, fontFamily: 'DMSans_400Regular' },
  memberBtnTextActive: { color: '#4A90D9' },
  cancelBtn: { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: 12, alignItems: 'center' },
  cancelText: { color: 'rgba(255,255,255,0.4)', fontSize: 14, fontFamily: 'DMSans_400Regular' },
  saveBtn: { flex: 2, backgroundColor: '#4A90D9', borderRadius: 10, padding: 12, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { color: '#FFFFFF', fontSize: 14, fontFamily: 'DMSans_700Bold' },
  bottom: { flexDirection: 'row', gap: 10, marginTop: 8, marginBottom: 48 },
  laterBtn: { flex: 1, backgroundColor: '#141929', borderRadius: 16, padding: 18, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  laterText: { color: 'rgba(255,255,255,0.4)', fontSize: 16, fontFamily: 'DMSans_400Regular' },
  btn: { flex: 2, backgroundColor: '#4A90D9', borderRadius: 16, padding: 18, alignItems: 'center' },
  btnText: { color: '#FFFFFF', fontSize: 16, fontFamily: 'DMSans_700Bold' },
})