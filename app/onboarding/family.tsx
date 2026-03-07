import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView } from 'react-native'
import { router } from 'expo-router'
import { useState } from 'react'

const ROLES = ['Mum', 'Dad', 'Child', 'Pet', 'Other']
const AVATARS_ADULT = ['👩', '👨', '👴', '👵']
const AVATARS_CHILD = ['👧', '👦', '🧒']
const AVATARS_PET = ['🐕', '🐈', '🐇', '🐠']

export default function FamilyScreen() {
  const [members, setMembers] = useState([
    { name: 'Sarah', role: 'Mum', avatar: '👩' },
  ])
  const [newName, setNewName] = useState('')
  const [newRole, setNewRole] = useState('Child')
  const [newAvatar, setNewAvatar] = useState('👧')
  const [showForm, setShowForm] = useState(false)

  const getAvatars = () => {
    if (newRole === 'Pet') return AVATARS_PET
    if (newRole === 'Child') return AVATARS_CHILD
    return AVATARS_ADULT
  }

  const addMember = () => {
    if (!newName.trim()) return
    setMembers([...members, { name: newName.trim(), role: newRole, avatar: newAvatar }])
    setNewName('')
    setNewRole('Child')
    setNewAvatar('👧')
    setShowForm(false)
  }

  const removeMember = (i: number) => {
    if (i === 0) return
    setMembers(prev => prev.filter((_, idx) => idx !== i))
  }

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.progress}>
        {[1,2,3,4,5,6,7,8].map(i => (
          <View key={i} style={[styles.dot, i === 2 && styles.dotActive]} />
        ))}
      </View>

      <Text style={styles.step}>STEP 2 OF 8</Text>
      <Text style={styles.title}>Meet your{'\n'}family</Text>
      <Text style={styles.sub}>Zaeli personalises for each person.</Text>

      <View style={styles.members}>
        {members.map((m, i) => (
          <TouchableOpacity key={i} style={styles.memberChip} onLongPress={() => removeMember(i)}>
            <Text style={styles.memberAvatar}>{m.avatar}</Text>
            <View>
              <Text style={styles.memberName}>{m.name}</Text>
              <Text style={styles.memberRole}>{m.role}</Text>
            </View>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={styles.addChip} onPress={() => setShowForm(true)}>
          <Text style={styles.addChipText}>+</Text>
        </TouchableOpacity>
      </View>

      {members.length > 1 && (
        <Text style={styles.hint}>Long press a member to remove them</Text>
      )}

      {showForm && (
        <View style={styles.form}>
          <Text style={styles.formLabel}>ADDING MEMBER</Text>
          <TextInput
            style={styles.input}
            placeholder="Name"
            placeholderTextColor="rgba(255,255,255,0.2)"
            value={newName}
            onChangeText={setNewName}
            autoCapitalize="words"
            autoFocus
          />
          <Text style={styles.fieldLabel}>ROLE</Text>
          <View style={styles.roles}>
            {ROLES.map(r => (
              <TouchableOpacity
                key={r}
                style={[styles.roleBtn, newRole === r && styles.roleBtnActive]}
                onPress={() => {
                  setNewRole(r)
                  const avatars = r === 'Pet' ? AVATARS_PET : r === 'Child' ? AVATARS_CHILD : AVATARS_ADULT
                  setNewAvatar(avatars[0])
                }}
              >
                <Text style={[styles.roleBtnText, newRole === r && styles.roleBtnTextActive]}>{r}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.fieldLabel}>AVATAR</Text>
          <View style={styles.avatars}>
            {getAvatars().map(a => (
              <TouchableOpacity
                key={a}
                style={[styles.avatarBtn, newAvatar === a && styles.avatarBtnActive]}
                onPress={() => setNewAvatar(a)}
              >
                <Text style={styles.avatarEmoji}>{a}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.formBtns}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowForm(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.addBtn, !newName && styles.addBtnDisabled]} onPress={addMember} disabled={!newName}>
              <Text style={styles.addBtnText}>Add member</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <Text style={styles.aiNote}>✦ Beautiful family, {members[0].name}</Text>

      <TouchableOpacity style={styles.btn} onPress={() => router.push('/onboarding/calendar')}>
        <Text style={styles.btnText}>That's everyone →</Text>
      </TouchableOpacity>
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
  sub: { fontSize: 14, color: 'rgba(255,255,255,0.4)', fontFamily: 'DMSans_300Light', marginBottom: 28 },
  members: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  memberChip: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#141929', borderRadius: 12, padding: 10, borderWidth: 1, borderColor: 'rgba(74,144,217,0.15)' },
  memberAvatar: { fontSize: 22 },
  memberName: { fontSize: 13, color: '#FFFFFF', fontFamily: 'DMSans_700Bold' },
  memberRole: { fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: 'DMSans_400Regular' },
  addChip: { width: 48, height: 48, borderRadius: 12, borderWidth: 1.5, borderColor: 'rgba(74,144,217,0.3)', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  addChipText: { color: '#4A90D9', fontSize: 22 },
  hint: { fontSize: 11, color: 'rgba(255,255,255,0.2)', fontFamily: 'DMSans_400Regular', marginBottom: 16, fontStyle: 'italic' },
  form: { backgroundColor: '#141929', borderRadius: 16, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: 'rgba(74,144,217,0.1)' },
  formLabel: { fontSize: 10, letterSpacing: 1.5, color: 'rgba(255,255,255,0.3)', marginBottom: 12, fontFamily: 'DMSans_700Bold' },
  fieldLabel: { fontSize: 10, letterSpacing: 1.5, color: 'rgba(255,255,255,0.3)', marginBottom: 8, marginTop: 4, fontFamily: 'DMSans_700Bold' },
  input: { backgroundColor: '#0A0F1E', borderRadius: 10, padding: 14, color: '#FFFFFF', fontSize: 15, borderWidth: 1, borderColor: 'rgba(74,144,217,0.15)', marginBottom: 12, fontFamily: 'DMSans_400Regular' },
  roles: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  roleBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  roleBtnActive: { borderColor: '#4A90D9', backgroundColor: 'rgba(74,144,217,0.1)' },
  roleBtnText: { color: 'rgba(255,255,255,0.5)', fontSize: 13, fontFamily: 'DMSans_400Regular' },
  roleBtnTextActive: { color: '#4A90D9' },
  avatars: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  avatarBtn: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  avatarBtnActive: { borderColor: '#4A90D9', backgroundColor: 'rgba(74,144,217,0.1)' },
  avatarEmoji: { fontSize: 22 },
  formBtns: { flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: 12, alignItems: 'center' },
  cancelText: { color: 'rgba(255,255,255,0.4)', fontSize: 14, fontFamily: 'DMSans_400Regular' },
  addBtn: { flex: 2, backgroundColor: '#4A90D9', borderRadius: 10, padding: 12, alignItems: 'center' },
  addBtnDisabled: { opacity: 0.4 },
  addBtnText: { color: '#FFFFFF', fontSize: 14, fontFamily: 'DMSans_700Bold' },
  aiNote: { fontSize: 13, color: 'rgba(255,255,255,0.25)', fontFamily: 'DMSans_400Regular', fontStyle: 'italic', textAlign: 'center', marginBottom: 24, marginTop: 8 },
  btn: { backgroundColor: '#4A90D9', borderRadius: 16, padding: 18, alignItems: 'center', marginBottom: 48 },
  btnText: { color: '#FFFFFF', fontSize: 16, fontFamily: 'DMSans_700Bold' },
})