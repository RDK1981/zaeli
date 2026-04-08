# Zaeli — New Chat Handover
*8 April 2026 (evening) — Session 4 ✅ · Context flow + CRUD tools + Mic + Chat UI all working*
*Copy this entire message to start a new chat.*

---

## Hi! Continuing development of Zaeli.

Zaeli is an iOS-first AI family life platform built in React Native / Expo.
Read **CLAUDE.md** before starting — full stack, architecture, colours, ALL specs.
Then **ZAELI-PRODUCT.md** for product vision and full project plan.

---

## ══════════════════════════════════
## CURRENT STATE — EVERYTHING WORKING ✅
## ══════════════════════════════════

### What's built and fully working:
- **Dashboard** — 5 cards, AI Zaeli Noticed (GPT mini), wttr.in weather, all context injection to chat
- **Chat** — sends via onTouchStart, fixed [Mic][TextInput][Send] bar, context flow from dashboard
- **My Space** — 7 cards, 4 sheets, dummy data
- **swipe-world** — 3-page container, FAB, dots, landing overlay
- **Context flow** — Dashboard card taps set context → chat picks it up via isActive + useEffect
- **Dashboard refresh** — cards reload from Supabase when swiping back from chat
- **Full CRUD tools** — all save to Supabase, triggered by Zaeli via Claude Sonnet tool-calling:
  - Calendar: add / update / delete
  - Todos: add / update / delete (supports mark_done)
  - Shopping: add / update / delete
  - Meals: add / update / delete (clash detection warns before swapping)
- **Mic** — works in chat bar (startRecording/stopRecording directly), floating waveform pill overlay
- **FAB mic** — Dashboard/MySpace mic passes transcript to chat via pendingMicText prop
- **Chat UI** — solid white bar, full width, scroll arrows (UP/DOWN side-by-side), keyboard gap tuned
- **Our Family + Kids Hub** — dedicated screens, dummy data

### Key files:
- `app/(tabs)/index.tsx` — Chat (exports SwipeWorld default + HomeScreen named)
- `app/(tabs)/swipe-world.tsx` — Container (FAB, dots, landing, isActive props)
- `app/(tabs)/dashboard.tsx` — Dashboard (5 cards, isActive refresh)
- `app/(tabs)/my-space.tsx` — My Space (7 cards)
- `app/components/ZaeliFAB.tsx` — FAB with mic waveform
- `lib/navigation-store.ts` — Context passing between dashboard↔chat

---

## ══════════════════════════════════
## SCREEN ARCHITECTURE — LOCKED ✅
## ══════════════════════════════════

**Three navigable screens:**
```
Dashboard (0)  →  Chat (1)  →  My Space (2)
```

**92% SHEETS over Chat (never router.navigate()):**
Calendar · Shopping · Meal Planner · Todos / Reminders · Notes · Travel

**Dedicated full screens (router.navigate() ok):**
Tutor · Kids Hub · Our Family · Settings

---

## How I like to work
- **Beginner developer** — full file rewrites always, never partial diffs
- **Two fixes at a time maximum** — any more = too many variables
- One PowerShell command at a time, never chained with &&
- Plain English before code · Design before code
- **CRITICAL:** All edits to `C:\Users\richa\zaeli` (NOT any worktree folder) — Expo runs from main folder
- **CRITICAL:** Always `Remove-Item` old file before `Copy-Item` new one
- **CRITICAL:** Always verify with `Get-Content ... | Select-Object -First 5` before running Expo

---

## Who I am
- Richard. **Logged-in user = Rich**
- Family: Rich, Anna, Poppy (Yr6, 12, girl), Gab (Yr4, 10, BOY — Gabriel, he/him), Duke (Yr1, 8, boy)
- Local: `C:\Users\richa\zaeli` (Windows, PowerShell)
- Repo: https://github.com/RDK1981/zaeli (private)

---

## Key constants
```
DUMMY_FAMILY_ID = '00000000-0000-0000-0000-000000000001'
SONNET          = 'claude-sonnet-4-20250514'
GPT_MINI        = 'gpt-5.4-mini'
OPENAI env var  = EXPO_PUBLIC_OPENAI_API_KEY
Send button     = #FF4545 coral ALWAYS
Body bg         = #FAF8F5 warm white ALWAYS
KAV             = backgroundColor:'#fff' always
Chat bar bg     = #FFFFFF solid white (NOT transparent)
Chat bar border = rgba(220,220,220,0.6)
Wordmark font   = Poppins_800ExtraBold (NOT DM Serif)
Wordmark a+i    = #A8D8F0 sky blue (light and dark)
DM Serif        = ghost numbers ONLY — never readable text
SafeAreaView    = swipe-world.tsx ONLY
expo-file-system = 'expo-file-system/legacy'
NEVER toISOString() · NEVER +10:00
router.navigate() only for dedicated screens
Swipe pages     = Dashboard(0) · Chat(1) · My Space(2) LOCKED
LANDING_TEST_MODE = true (swipe-world.tsx) — set false before launch
Family colours  = Rich:#4D8BFF · Anna:#FF7B6B · Poppy:#A855F7 · Gab:#22C55E · Duke:#F59E0B
92% sheets      = height: H * 0.92 (NOT maxHeight) · borderTopRadius:24
Weather API     = wttr.in (NOT Open-Meteo — times out in dev client)
```

---

## CRITICAL RULES (learned from 15+ hours debugging)
- Chat bar = ALWAYS [Mic][TextInput][Send] — NEVER conditional render
- Send button = `<View onTouchStart>` — NEVER onPress/onPressIn/TouchableOpacity
- Clear input BEFORE calling send() — `setInput(''); send(text);`
- NO onBlur handler on TextInput — causes unmount race
- NO Keyboard.addListener setState — causes keyboard glitch loop
- useFocusEffect does NOT fire on swipe in swipe-world — use isActive prop + useEffect
- Chat mic = startRecording()/stopRecording() directly (FAB is unmounted on chat page)
- FAB mic transcript = pendingMicText prop from swipe-world → chat useEffect sends it
- swipe-world keyboardShouldPersistTaps = "handled" (NOT "always")
- barPill must NOT have onTouchEnd focus handler (steals mic taps)
- All edits to main zaeli folder, NOT worktree — Expo reads from main

---

## Next priorities
1. 🔨 Design changes across all 3 pages (scheduled for next session)
2. 🔨 Complete Shopping sheet
3. 🔨 Todos sheet
4. 🔨 Notes sheet (family)
5. 🔨 Meals sheet
6. 🔨 Travel sheet

---

**Read CLAUDE.md fully before starting. All session 4 changes are documented there.**
