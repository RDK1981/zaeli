# Zaeli Chat Bar — Definitive Spec
*Apply identically to every screen. The only permitted difference is the function of the + button.*

---

## Structure

```
inputArea wrapper
└── barPill (the floating white pill)
    ├── barBtn → IcoPlus (20×20 SVG)     ← screen-specific action
    ├── barSep (1px divider)
    ├── TextInput OR TouchableOpacity     ← screen-specific
    ├── barBtn → IcoMic (20×20 SVG)      ← always mic
    └── barSend (coral circle) → IcoSend ← always send/navigate
```

---

## Exact Styles (copy verbatim)

```typescript
// Wrapper — absolute, transparent, sits above keyboard
inputArea:   {
  position: 'absolute',
  bottom: 0, left: 0, right: 0,
  paddingHorizontal: 14,
  paddingBottom: Platform.OS === 'ios' ? 30 : 18,
  paddingTop: 10,
  backgroundColor: 'transparent',
},
// When keyboard is open — hug keyboard, no extra gap
inputAreaKb: {
  paddingBottom: Platform.OS === 'ios' ? 8 : 6,
},

// The pill
barPill: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
  borderRadius: 30,
  paddingVertical: 14,
  paddingHorizontal: 16,
  borderWidth: 1,
  shadowColor: '#000',
  shadowOpacity: 0.07,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: -2 },
  elevation: 4,
},
// Applied to pill: backgroundColor:'#fff', borderColor:'rgba(10,10,10,0.09)'

// Touch targets for + and mic
barBtn:  { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },

// Separator
barSep:  { width: 1, height: 18, flexShrink: 0 },
// Applied to sep: backgroundColor:'rgba(10,10,10,0.1)'

// Text input (when editable)
barInput: {
  flex: 1,
  fontFamily: 'Poppins_400Regular',
  fontSize: 15,
  maxHeight: 100,
  paddingVertical: 0,
},

// Send button — coral circle, always #FF4545
barSend: {
  width: 32,
  height: 32,
  borderRadius: 16,
  backgroundColor: '#FF4545',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
},
```

---

## Icons (exact from index.tsx)

```typescript
function IcoPlus() {
  return <Svg width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="rgba(0,0,0,0.4)" strokeWidth={2} strokeLinecap="round">
    <Line x1="12" y1="5" x2="12" y2="19"/>
    <Line x1="5" y1="12" x2="19" y2="12"/>
  </Svg>;
}
function IcoMic({ color = 'rgba(0,0,0,0.32)' }: { color?: string }) {
  return <Svg width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <Rect x="9" y="2" width="6" height="11" rx="3"/>
    <Path d="M5 10a7 7 0 0014 0"/>
    <Line x1="12" y1="19" x2="12" y2="23"/>
    <Line x1="8" y1="23" x2="16" y2="23"/>
  </Svg>;
}
function IcoSend() {
  return <Svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="#fff" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <Line x1="12" y1="19" x2="12" y2="5"/>
    <Polyline points="5 12 12 5 19 12"/>
  </Svg>;
}
```

---

## Keyboard Handling

Every screen needs:

```typescript
const [keyboardOpen, setKeyboardOpen] = useState(false);

useEffect(() => {
  const show = Keyboard.addListener('keyboardWillShow', () => setKeyboardOpen(true));
  const hide  = Keyboard.addListener('keyboardWillHide',  () => setKeyboardOpen(false));
  return () => { show.remove(); hide.remove(); };
}, []);
```

Applied to the wrapper:
```tsx
<View style={[s.inputArea, keyboardOpen && s.inputAreaKb]}>
```

The screen's main content area must be wrapped in:
```tsx
<KeyboardAvoidingView
  style={{ flex: 1 }}
  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  keyboardVerticalOffset={0}
>
  {/* scrollable content */}
</KeyboardAvoidingView>
```

---

## Render (copy for each screen, change + action only)

```tsx
<View style={[s.inputArea, keyboardOpen && s.inputAreaKb]}>
  <View style={[s.barPill, { backgroundColor:'#fff', borderColor:'rgba(10,10,10,0.09)' }]}>

    {/* + button — ONLY this changes per screen */}
    <TouchableOpacity style={s.barBtn} onPress={onPlusPress} activeOpacity={0.75}>
      <IcoPlus/>
    </TouchableOpacity>

    <View style={[s.barSep, { backgroundColor:'rgba(10,10,10,0.1)' }]}/>

    {/* Text input or tappable placeholder */}
    <TextInput
      style={[s.barInput, { color: '#0A0A0A' }]}
      placeholder="Chat with Zaeli…"
      placeholderTextColor="rgba(10,10,10,0.35)"
      returnKeyType="send"
      onSubmitEditing={onSubmit}
    />

    {/* Mic */}
    <TouchableOpacity style={s.barBtn} onPress={onMicPress} activeOpacity={0.75}>
      <IcoMic/>
    </TouchableOpacity>

    {/* Send */}
    <TouchableOpacity style={s.barSend} onPress={onSendPress} activeOpacity={0.85}>
      <IcoSend/>
    </TouchableOpacity>

  </View>
</View>
```

---

## Per-screen + button behaviour

| Screen    | + action                        |
|-----------|---------------------------------|
| Home      | Opens attachment/action sheet   |
| Calendar  | Opens Add Event sheet           |
| Shopping  | Opens Add Item sheet            |
| Meals     | Opens Add Meal sheet            |
| To-dos    | Opens Add Task sheet            |
| Notes     | Opens New Note                  |
| All others | Opens Zaeli attachment sheet   |

---

## Checklist for every new screen

- [ ] `inputArea` is `position:'absolute'`, `backgroundColor:'transparent'`
- [ ] `inputAreaKb` override applied when `keyboardOpen === true`
- [ ] `keyboardOpen` state + `Keyboard.addListener` in `useEffect`
- [ ] `KeyboardAvoidingView` wraps scrollable content with `behavior='padding'`
- [ ] `barPill` has `borderRadius:30`, `paddingVertical:14`, `paddingHorizontal:16`
- [ ] `barBtn` is 34×34 for + and mic
- [ ] `barSend` is 32×32, `borderRadius:16`, `backgroundColor:'#FF4545'`
- [ ] `IcoPlus` is 20×20 SVG stroke `rgba(0,0,0,0.4)`
- [ ] `IcoMic` is 20×20 SVG
- [ ] `IcoSend` is 16×16 SVG white stroke
- [ ] Send button colour is `#FF4545` — never changes across screens
