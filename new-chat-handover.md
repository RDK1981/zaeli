# Zaeli — New Chat Handover
*7 April 2026 — Phase 6 ✅ · Chat fix FAILED this session 🔴 · Next session: fix Chat properly*
*Copy this entire message to start a new chat.*

---

## Hi! Continuing development of Zaeli.

Zaeli is an iOS-first AI family life platform built in React Native / Expo.
Read **CLAUDE.md** before starting — full stack, architecture, colours, ALL specs.
Then **ZAELI-PRODUCT.md** for product vision and full project plan.

**CRITICAL: Read the "WHAT HAPPENED THIS SESSION" section in CLAUDE.md before touching any code.**

---

## ══════════════════════════════════
## CURRENT STATE OF FILES ON DISK
## ══════════════════════════════════

- `index.tsx` — TRUE ORIGINAL from git commit `419589f`. Has splash/entry/card stack. All context flows, sheets, inline cards, event booking WORK. Do not replace this file without reading CLAUDE.md first.
- `swipe-world.tsx` — Original + `fabActive` and `setFabActive` passed into ChatScreen.

**Git commit `419589f` is the safe baseline. Everything from the previous session's work is preserved here.**

---

## ══════════════════════════════════
## SCREEN ARCHITECTURE — READ FIRST (LOCKED ✅)
## ══════════════════════════════════

**Three navigable screens:**
```
Dashboard (0)  →  Chat (1)  →  My Space (2)
```
App opens on Dashboard. Swipe right → Chat. Swipe right again → My Space.

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
- **CRITICAL:** Upload files from `C:\Users\richa\zaeli\app\(tabs)\` — NEVER from Downloads
- **CRITICAL:** Always `Remove-Item` old file before `Copy-Item` new one
- **CRITICAL:** Always verify with `Get-Content ... | Select-Object -First 5` before running Expo
- **CRITICAL:** Always add console.log to confirm taps register BEFORE attempting any fix

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
GPT_MINI        = 'gpt-4o-mini'
OPENAI env var  = EXPO_PUBLIC_OPENAI_API_KEY
Send button     = #FF4545 coral ALWAYS
Body bg         = #FAF8F5 warm white ALWAYS
KAV             = backgroundColor:'#fff' always
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

## What's built and working

### ✅ Dashboard — Phase 6 complete
All 5 cards. AI Zaeli Noticed (GPT mini). wttr.in weather. All context injection to Chat wired.

### ✅ My Space — Phase 3b complete
All 7 cards, 4 × 92% sheets. Dummy data.

### ✅ swipe-world.tsx
3-page container, FAB, dots, landing overlay. fabActive/setFabActive now passed to ChatScreen.

### ✅ index.tsx — working but needs Chat interface fix
All context flows working: edit_event, add_event, shopping, shopping_sheet, actions, meals, noticed.
Calendar sheet, shopping sheet, inline cards, event booking, tool calling — all working.
**Known issue:** Shows old splash → entry → card stack on fresh load. Fix documented below.

---

## ══════════════════════════════════
## NEXT SESSION — FIX CHAT INTERFACE
## ══════════════════════════════════

**THIS IS THE ONLY PRIORITY FOR NEXT SESSION.**

### What the problem actually is:
1. The chat input bar is `position:absolute` inside a `ScrollView` — the ScrollView intercepts taps on the send button
2. `useFocusEffect` doesn't fire on swipe in a horizontal ScrollView
3. The old splash/entry screens masked problem 1 — they had their own input bar

### The correct fix plan — follow this exactly:

**Before writing any code:**
- Upload `index.tsx`, `swipe-world.tsx`, `ZaeliFAB.tsx` 
- Read all three
- Add `console.log('SEND PRESSED')` to send button, test, confirm whether taps register

**The fix (two parts only):**

Part A — Move the input bar outside the ScrollView:
- It should be a direct child of the main `<View style={{flex:1}}>` in HomeScreen
- Sibling of KeyboardAvoidingView, NOT inside it
- Keep `position:absolute, bottom:0` — this removes it from ScrollView touch area

Part B — Replace useFocusEffect with a prop callback:
- Add `onPageFocus` prop to HomeScreen
- swipe-world calls it when scrolling to page 1
- HomeScreen runs the context check inside `onPageFocus`

**What NOT to do:**
- Do not pass fabActive/setFabActive as props (causes re-render cascades)
- Do not use display:none or opacity:0 to hide the TextInput (focus() won't work)
- Do not use openKeyboardRef, focusRef, sendRef patterns (too complex)
- Do not spend more than 30 minutes on any single approach

### Also remove from index.tsx (safe, surgical):
- `overviewOpen` state + "Today's overview" toggle
- `renderCardStack()` and the card stack render
- `generateBrief()` and `generatePostCardPrompt()`
- Splash/entry screen render blocks
- Add simple time-aware Zaeli greeting on fresh load

---

## Full project plan

### Phase A — Make it solid
1. ✅ Dashboard AI Zaeli Noticed + weather
2. 🔴 Fix Chat interface — RETRY next session with new plan above
3. 🔨 Complete Shopping sheet
4. 🔨 Todos sheet
5. 🔨 Notes sheet (family)
6. 🔨 Meals sheet
7. 🔨 Travel sheet

### Phase B — Make it testable
8. 🔨 Real authentication
9. 🔨 EAS build + TestFlight
10. 🔨 Kids Hub · Tutor rebuild · Our Family · Settings

### Phase C — Make it launchable
11. 🔨 Zaeli Voice · Push notifications · Integrations · Stripe · Website

### Phase D — Scale
12. 🔨 Live testing · Analytics · App Store · Multi-user sync

---

**Read CLAUDE.md fully before starting. The "WHAT HAPPENED THIS SESSION" section is critical.**
