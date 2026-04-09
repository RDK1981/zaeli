# Zaeli — New Chat Handover
*9 April 2026 — Session 5 ✅ · Design refresh complete · My Space sheets next*
*Copy this entire message to start a new chat.*

---

## Hi! Continuing development of Zaeli.

Zaeli is an iOS-first AI family life platform built in React Native / Expo.
Read **CLAUDE.md** before starting — full stack, architecture, colours, ALL specs.
Then **ZAELI-PRODUCT.md** for product vision and full project plan.

---

## ══════════════════════════════════
## CURRENT STATE — ALL WORKING ✅
## ══════════════════════════════════

### Pages:
- **Dashboard** — peach-branded. 5 cards + peach Zaeli brief (GPT mini). Logo a+i peach #FAC8A8. FAB icon peach when active. Dinner card mint #B8EDD0.
- **Chat** — lavender-branded. Fixed [Mic][TextInput][Send] bar. Lavender brief card. Logo a+i lavender #C4B4FF. Full CRUD tools (12 tools). Context flow from dashboard. Mic with waveform.
- **My Space** — sky-branded. Fixed header. Dark slate brief + DM Serif quote. WotD inline expand. 6-card grid (Fitness, Goals, Budget, Notes, Stretch, Zen) + Wordle. Shell sheets for all 7.

### Infrastructure:
- Context flow: isActive prop from swipe-world + useEffect checks getPendingChatContext()
- Dashboard refresh: isActive triggers loadData() on swipe back
- Full CRUD tools: calendar, todos, shopping, meals (add/update/delete)
- Meal clash detection: warns before swapping
- Mic: direct startRecording/stopRecording in chat + FAB mic pipeline via pendingMicText
- 3-dot indicators: peach(0) · lavender(1) · sky(2)

---

## ══════════════════════════════════
## NEXT PRIORITIES
## ══════════════════════════════════

1. **My Space sheets** — build content for Fitness, Goals, Budget, Notes, Stretch, Zen, Wordle (currently shell "Coming soon" placeholders)
2. **Dashboard sheets** — Todos, Shopping, Calendar, Meals
3. **Dedicated pages** — Kids Hub, Tutor, Our Family, Settings

---

## Key files:
- `app/(tabs)/index.tsx` — Chat (exports SwipeWorld default + HomeScreen named)
- `app/(tabs)/swipe-world.tsx` — Container (FAB, dots, landing, isActive props, pendingMicText)
- `app/(tabs)/dashboard.tsx` — Dashboard (5 cards + brief, isActive refresh)
- `app/(tabs)/my-space.tsx` — My Space (brief + WotD + 6-grid + Wordle + 7 shell sheets)
- `app/components/ZaeliFAB.tsx` — FAB with mic waveform, peach dashboard active
- `lib/navigation-store.ts` — Context passing between dashboard↔chat

---

## Key constants
```
Dashboard logo a+i  = #FAC8A8 peach
Chat logo a+i       = #C4B4FF lavender
My Space logo a+i   = #A8D8F0 sky blue
Dinner card         = #B8EDD0 mint
Budget card         = #E8F0FF blue
Zen card            = #E0F3FC light blue
FAB dash active     = #FAC8A8 bg, #8A3A00 icon
3-dot colours       = peach(0) · lavender(1) · sky(2)
All logos           = 40px Poppins_800ExtraBold
All page labels     = 18px Poppins_700Bold
Brief text          = Poppins 17px on all 3 pages
Send button         = #FF4545 coral ALWAYS
Body bg             = #FAF8F5 warm white
GPT_MINI            = gpt-5.4-mini
SONNET              = claude-sonnet-4-20250514
```

---

## CRITICAL RULES (learned from 15+ hours debugging)
- Chat bar = ALWAYS [Mic][TextInput][Send] — NEVER conditional render
- Send button = `<View onTouchStart>` — NEVER onPress/onPressIn/TouchableOpacity
- Clear input BEFORE calling send()
- NO onBlur handler on TextInput
- NO Keyboard.addListener setState
- useFocusEffect does NOT fire on swipe in swipe-world — use isActive prop + useEffect
- Chat mic = startRecording()/stopRecording() directly (FAB unmounted on chat page)
- swipe-world keyboardShouldPersistTaps = "handled" (NOT "always")
- barPill must NOT have onTouchEnd focus handler
- All edits to C:\Users\richa\zaeli (NOT worktree) — Expo reads from main

---

**Read CLAUDE.md fully before starting.**
