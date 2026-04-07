# CLAUDE.md — Zaeli Project Context
*Last updated: 7 April 2026 — Phase 6 AI Zaeli Noticed ✅ · Weather switched to wttr.in ✅ · Chat fix FAILED this session 🔴 · Next session plan documented*

---

## ══════════════════════════════════
## SCREEN ARCHITECTURE — CRITICAL (LOCKED ✅)
## ══════════════════════════════════

**Three screens, swipe world:**
```
Dashboard (0)  →  Chat (1)  →  My Space (2)
```
App opens on Dashboard (page 0). Swipe right for Chat, right again for My Space.

**92% SHEETS over Chat — NEVER dedicated screens:**
Calendar · Shopping · Meal Planner · Todos / Reminders · Notes · Travel

**Dedicated full screens only:**
Tutor · Kids Hub · Our Family · Settings

**More overlay routes:**
- Family channels → 92% sheet over Chat
- Tutor / Kids Hub / Our Family / Settings → router.navigate()

**LOCKED architecture decisions:**
- Pulse as swipe screen = SCRAPPED
- My Space = page 2 (right swipe from Chat)
- Zen = card inside My Space, NOT a screen
- WotD = My Space only, NOT on Dashboard
- swipe-world.tsx = container (owns FAB, dots, landing, all 3 pages)
- index.tsx = re-exports SwipeWorld as default (expo-router entry point)
- Landing overlay = stays (lives in swipe-world.tsx, user likes it)

---

## Who You Are Talking To
- **Richard** — beginner developer. Full file rewrites always. One PowerShell command at a time.
- Plain English before code. Design before build. Two fixes at a time max.
- Family: Rich (logged-in user), Anna, Poppy (Yr6, 12, girl), Gab (Yr4, 10, BOY — Gabriel, he/him), Duke (Yr1, 8, boy)
- Local: `C:\Users\richa\zaeli` (Windows, PowerShell — no && chaining)
- Repo: https://github.com/RDK1981/zaeli (private)
- Screen: `Copy-Item "C:\Users\richa\Downloads\file.tsx" "C:\Users\richa\zaeli\app\`(tabs`)\file.tsx"`
- Component: `Copy-Item "C:\Users\richa\Downloads\ZaeliFAB.tsx" "C:\Users\richa\zaeli\app\components\ZaeliFAB.tsx"`
- Lib: `Copy-Item "C:\Users\richa\Downloads\file.ts" "C:\Users\richa\zaeli\lib\file.ts"`
- **CRITICAL:** Upload files from `C:\Users\richa\zaeli\app\(tabs)\` — NEVER from Downloads.
- **CRITICAL:** Always `Remove-Item` old file before `Copy-Item` new one.
- **CRITICAL:** Always verify with `Get-Content ... | Select-Object -First 5` before running Expo.

---

## Business
- iOS-first AI family life platform · Australian families with kids
- Family plan: A$14.99/month · Tutor add-on: A$9.99/child/month · 100% web sales

---

## Zaeli Persona (LOCKED)
Sharp, warm, genuinely enthusiastic. Finds the funny angle through delight, not detachment.
- NEVER "mate" · Never starts with "I" · Plain text only · Always ends on a confident offer
- Banned: "queued up", "locked in", "tidy", "sorted", "chaos", "sprint", "breathing room", "quick wins", "you've got this", "make it count"

---

## Stack
- React Native + Expo (iOS-first), iPhone 11 Pro Max dev device
- Supabase (Sydney ap-southeast-2, ID: rsvbzakyyrftezthlhtd)
- Claude Sonnet (`claude-sonnet-4-20250514`) — tool-calling + vision
- OpenAI `gpt-4o-mini` — Zaeli Noticed notices (dashboard)
- OpenAI Whisper-1 — voice transcription
- expo-router, expo-image-picker, react-native-svg, expo-file-system, expo-av
- Poppins (ALL UI text) · DMSerifDisplay (ghost numbers ONLY)
- Weather: wttr.in API (replaced Open-Meteo which was timing out)
- HealthKit · NASA APOD API · Dictionary API (My Space — future phases)

---

## Key Constants (NEVER get these wrong)
```
DUMMY_FAMILY_ID    = '00000000-0000-0000-0000-000000000001'
SONNET             = 'claude-sonnet-4-20250514'
GPT_MINI           = 'gpt-4o-mini'
OPENAI env var     = EXPO_PUBLIC_OPENAI_API_KEY (exact, in both files)
OpenAI             = max_completion_tokens · Claude = max_tokens (never mix)
KAV                = backgroundColor:'#fff' always
Send button        = #FF4545 coral ALWAYS — no exceptions
Body bg            = #FAF8F5 warm white ALWAYS
expo-file-system   = 'expo-file-system/legacy'
NEVER toISOString() · NEVER +10:00 timezone suffix
NEVER router.replace() or router.push() — always router.navigate()
NEVER SafeAreaView in individual page files — swipe-world.tsx ONLY
Individual pages   = useSafeAreaInsets() for manual paddingTop
DM Serif           = ghost numbers ONLY (never readable UI text)
Wordmark font      = Poppins_800ExtraBold (NOT DM Serif)
Wordmark a+i       = #A8D8F0 sky blue — always, light and dark
ZaeliFAB           = forwardRef, exposes startMic()
FAB hides          = activeButton === 'keyboard' — restores on blur only
LANDING_TEST_MODE  = true (in swipe-world.tsx) — set false before launch
Swipe pages        = Dashboard(0) · Chat(1) · My Space(2) — LOCKED
3-dot colours      = coral(0) · coral(1) · sky #A8D8F0(2)
✦ active colour    = #A8D8F0 sky blue (userColor)
Delete             = optimistic UI first, Supabase background
Todos fetch        = IN ['active','done'] — NEVER eq('status','active')
Tick handler       = TOGGLE only — done↔active, never one-directional
Modal stacking     = close → setTimeout 350ms → open
Card buttons       = full-width, borderRadius:14, paddingVertical:14, Poppins_700Bold 15px
Nav store types    = edit_event · add_event · shopping · shopping_sheet · actions · meals · noticed
Chip intercepts    = 'Open Meal Planner' · 'Open Shopping List' · 'Open To-dos'
Family colours     = Rich:#4D8BFF · Anna:#FF7B6B · Poppy:#A855F7 · Gab:#22C55E · Duke:#F59E0B
92% sheets         = height: H * 0.92 (NOT maxHeight) · borderTopLeftRadius:24 · borderTopRightRadius:24
Sheet handle       = 36px wide · 4px tall · rgba(10,10,10,0.14) · alignSelf:center · marginTop:12
IcoPlay SVG        = Polygon points="5 3 19 12 5 21 5 3" · 15×15 · strokeWidth 2
IcoPause SVG       = two Lines x1=6/18 y1=4 x2=6/18 y2=20 · 15×15 · strokeWidth 2.5
Weather API        = wttr.in (NOT Open-Meteo — was timing out in dev client)
wttr.in URL        = https://wttr.in/{LAT},{LON}?format=j1
wttr.in codes      = mapWttrCode() in dashboard.tsx translates to internal codes
```

---

## ══════════════════════════════════
## WHAT HAPPENED THIS SESSION — READ THIS FIRST
## ══════════════════════════════════

**This session was supposed to:** Remove the splash/entry/card stack from Chat and replace with a simple Zaeli greeting.

**What went wrong:** 5+ hours wasted. Chat is still broken. Here is the honest post-mortem.

### Root cause — two separate problems discovered:

**Problem 1: The input bar was never receiving taps**
The chat input bar (`position:absolute`) sits inside a `ScrollView`. The ScrollView's touch handler intercepts all taps in that region — including the send button. This was always broken in the swipe-world architecture, even before this session. It was masked by the entry screen which had its own separate input.

**Problem 2: swipe-world never passed fabActive/setFabActive to ChatScreen**
Without these props, the FAB and keyboard state in HomeScreen are disconnected from swipe-world's state. Chat button sets fabActive in swipe-world but HomeScreen doesn't know about it.

### What was tried and failed:
- Moving input bar inside/outside KAV — bar went behind keyboard or taps still blocked
- display:none / opacity:0 / height:0 to keep TextInput mounted — focus() still didn't work
- Passing fabActive as external props — caused re-render cascades with stale closures
- openKeyboardRef, focusRef, sendRef patterns — too many moving parts
- Multiple git restores — cache issues made it impossible to confirm what was running

### Current state of files on disk:
- `index.tsx` — TRUE ORIGINAL from last git commit (confirmed). Has splash + entry + card stack. Everything works EXCEPT it's the old interface.
- `swipe-world.tsx` — Original + fabActive/setFabActive passed into ChatScreen (one addition).

### What is safe:
ALL work from the previous session (dashboard context flows, sheets, inline cards, event booking, shopping) is preserved in the current `index.tsx` on disk and in git commit `419589f`.

---

## ══════════════════════════════════
## CHAT FIX — NEXT SESSION PLAN
## ══════════════════════════════════

**DO NOT attempt the same approach again.** The fundamental issue is that the input bar inside index.tsx cannot receive taps reliably from swipe-world.

### The correct plan for next session:

**Step 1 — Understand before touching anything**
Upload `index.tsx`, `swipe-world.tsx`, and `ZaeliFAB.tsx` at session start. Read all three fully before writing a single line.

**Step 2 — Add one console.log first**
Before any code changes, add `console.log('SEND PRESSED')` to the send button. Confirm whether taps register. This single data point determines everything.

**Step 3 — The actual fix (if taps don't register)**
The input bar needs to move OUT of the ScrollView entirely. It should be a direct child of the main `<View style={{flex:1}}>` in HomeScreen — a sibling of the KeyboardAvoidingView, not inside it. Use `position:absolute, bottom:0` at that level. This removes it from the ScrollView's touch area completely.

**Step 4 — Wire swipe-world correctly**
swipe-world only needs to:
- Pass `fabActive` and `setFabActive` into ChatScreen (already done)
- Call `inputRef.current?.focus()` from `onChatKeyboard` — but ONLY after `setFabActive('keyboard')` has caused the input bar to mount

**Step 5 — useFocusEffect replacement**
`useFocusEffect` doesn't fire in a horizontal ScrollView. Replace with a `onPageFocus` callback prop that swipe-world calls whenever it scrolls to page 1. This re-runs the context check.

**Key rules for next session:**
- Maximum 2 changes at a time
- Test each change on device before the next
- If a change breaks something, revert immediately — don't compound
- Never spend more than 30 minutes on any single approach without stepping back

---

## ══════════════════════════════════
## DASHBOARD (✅ COMPLETE + STRESS TESTED)
## ══════════════════════════════════

**`app/(tabs)/dashboard.tsx`** — Phase 6 complete.

- All 5 cards: Calendar(slate) → Dinner(peach) → Weather+ZaeliNoticed → Shopping(lavender) → Actions(gold)
- **Zaeli Noticed:** AI-generated via GPT mini. Fires once per session after data loads.
- **Weather:** wttr.in API with 8s timeout. Fires independently.
- All context injection wired to Chat via navigation store.

---

## ══════════════════════════════════
## SWIPE WORLD (✅ complete — with one addition)
## ══════════════════════════════════

**`app/(tabs)/swipe-world.tsx`** — owns all 3 pages, FAB, dots, landing overlay.

- Page 0: DashboardScreen ✅
- Page 1: HomeScreen (named export from index.tsx) ✅
- Page 2: MySpaceScreen ✅
- fabActive + setFabActive now passed into ChatScreen ✅ (added this session)

**Landing overlay:** Stays as-is. `LANDING_TEST_MODE = true` — flip before launch.

---

## ══════════════════════════════════
## MY SPACE (✅ Phase 3b complete)
## ══════════════════════════════════

All 7 cards built, 4 × 92% sheets. All dummy data.

---

## ══════════════════════════════════
## CHAT — BROKEN 🔴 (fix next session)
## ══════════════════════════════════

**Current state:** index.tsx is the original — has splash/entry/card stack on load. Chat works via the entry screen. FAB chat button doesn't open keyboard directly.

**Target state:** Chat opens directly with Zaeli greeting. No splash. No card stack. Input bar receives taps reliably. Dashboard context flows work.

**All context injection paths are working in the original** — edit_event, add_event, shopping, shopping_sheet, actions, meals, noticed. Do not touch these.

---

## Build Phase Plan
```
Phase 1: ZaeliFAB              ✅
Phase 2: Landing overlay       ✅
Phase 4: Dashboard Option A    ✅ all 5 cards
Phase 4b: Chat input bar       ✅
Dashboard stress testing       ✅
Phase 3: swipe-world.tsx       ✅
Phase 3b: My Space             ✅ all 7 cards, 4 sheets
Phase 6: Zaeli Noticed (AI)    ✅ GPT mini, wttr.in weather
Phase 5: Chat v5 / fix         🔴 FAILED this session — retry next session with new plan
Phase 7: Todos sheet           🔨
Phase 8: Shopping complete     🔨
Phase 9: Meals sheet           🔨
Phase 10: Notes sheet (family) 🔨
Phase 11: Travel sheet         🔨
Phase 12: Kids Hub             🔨
Phase 13: Tutor rebuild        🔨
Phase 14: Our Family           🔨
Phase 15: Settings             🔨
```

---

## Coding Rules
- SafeAreaView = swipe-world.tsx ONLY · individual pages = useSafeAreaInsets()
- PowerShell: no && · separate lines
- Always `npx expo start --dev-client --clear`
- Always `Remove-Item` old file before `Copy-Item` new one
- Always verify with `Get-Content ... | Select-Object -First 5` before running Expo
- Date: local only — NEVER toISOString() · NEVER +10:00
- KAV: backgroundColor:'#fff' · Send: '#FF4545' · Body: '#FAF8F5'
- expo-file-system: 'expo-file-system/legacy'
- No literal newlines in JSX — use \n
- stopPropagation on nested tappable rows
- Modal stacking: close → 350ms → open
- Delete: optimistic first, Supabase background
- router.navigate() only for dedicated screens
- Upload from zaeli folder, never Downloads
- Wordmark = Poppins_800ExtraBold (never DM Serif for readable text)
- 92% sheets = height: H * 0.92 (never maxHeight)
- Weather = wttr.in only (Open-Meteo times out in dev client)
- GPT_MINI = 'gpt-4o-mini'
- NEVER pass fabActive/setFabActive as props from swipe-world unless you are certain the input bar is outside the ScrollView
- ALWAYS add console.log before attempting any touch/send fix — confirm the tap is registering first
