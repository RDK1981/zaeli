# CLAUDE.md — Zaeli Project Context
*Last updated: 7 April 2026 (evening) — Chat fix FAILED again (session 2) 🔴 · Root causes narrowed · Next session plan updated*

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
## WHAT HAPPENED — SESSIONS 1 & 2 (READ THIS FIRST)
## ══════════════════════════════════

**Goal:** Remove the splash/entry/card stack from Chat and replace with a simple Zaeli greeting. Send button must work.

**Result:** FAILED across two sessions (~12+ hours total). Chat send button still does not work.

### Three root causes identified (session 2 confirmed):

**Problem 1: ScrollView touch interception on send button**
The send button (TouchableOpacity) inside chatInputWrap gets its taps stolen by the vertical ScrollView. TextInput works (RN special-cases focus), but TouchableOpacity does not. Moving the input bar outside scrollWrap (as a flex child of KAV) did NOT fix the send button.

**Problem 2: onBlur unmounts the input bar before onPress fires**
React Native fires TextInput.onBlur BEFORE TouchableOpacity.onPress. When user taps send:
1. TextInput blurs → onBlur sets fabActive='chat', keyboardOpen=false
2. Condition `(fabActive === 'keyboard' || keyboardOpen)` becomes false
3. Input bar unmounts → send button's onPress NEVER fires
Even a 250ms setTimeout in onBlur did not fix this — suggests a deeper issue.

**Problem 3: Re-render cascades between swipe-world and HomeScreen**
When onFocus calls setFabActive('keyboard') (swipe-world's state), swipe-world re-renders, which re-renders ChatScreen. This can cause TextInput to lose focus → onBlur fires → re-render loop → app freezes. Attempting to fix with Keyboard.addListener broke everything (no chat, no mic, no dashboard context).

### What was tried across both sessions (ALL FAILED):
- Moving input bar inside/outside KAV (session 1)
- display:none / opacity:0 / height:0 patterns (session 1)
- Passing fabActive as external props (session 1) — re-render cascades
- Moving input bar outside scrollWrap as flex child of KAV (session 2) — send still broken
- Making input bar position:absolute inside KAV (session 2) — bar went behind keyboard
- Always-rendered input bar + Keyboard listeners replacing onFocus/onBlur (session 2) — broke everything
- setTimeout(250ms) in onBlur to delay unmount (session 2) — send still broken
- Auto-focus useEffect when fabActive='keyboard' (session 2) — focus worked, send didn't

### Current state of files on disk:
- `index.tsx` — TRUE ORIGINAL from last git commit `419589f` (reverted and confirmed clean)
- `swipe-world.tsx` — Original from last git commit (reverted and confirmed clean)

### What is safe:
ALL work from previous sessions (dashboard context flows, sheets, inline cards, event booking, shopping, Zaeli Noticed, weather) is preserved in git commit `419589f`.

---

## ══════════════════════════════════
## CHAT FIX — SESSION 3 PLAN (CRITICAL)
## ══════════════════════════════════

**DO NOT repeat any of the approaches listed above.** Two sessions of attempting incremental fixes to the existing input bar have failed. The core problem is that conditional rendering + onBlur/onPress ordering + cross-component state = unresolvable in this architecture.

### Approaches NOT yet tried (try these):

**Option A — onTouchEnd instead of onPress on send button**
TouchableOpacity.onPress fires AFTER blur. But `onTouchEnd` on a raw `<View>` fires immediately on touch release, before blur propagates. Replace the send TouchableOpacity with a `<View onTouchEnd={...}>`. This bypasses the responder system entirely. SMALLEST CHANGE — try this first.

**Option B — Pressable instead of TouchableOpacity**
React Native's `Pressable` component uses a different touch system. May not have the same onBlur-before-onPress ordering issue.

**Option C — Always-mounted input bar (never unmount)**
Remove `{(fabActive === 'keyboard' || keyboardOpen) && ...}` conditional entirely. Always render the input bar. Use a separate mechanism to show/hide the FAB (e.g. track keyboard state with Keyboard.addListener, separate from fabActive). This eliminates the unmount-before-onPress race condition. WARNING: a previous attempt at this broke everything — the failure was likely because Keyboard listeners also called setFabActive which caused the same re-render cascade. Use a SEPARATE local state for keyboard visibility instead.

**Option D — Minimal test first**
Create a dead-simple test: just a TextInput + TouchableOpacity send button inside HomeScreen, outside any ScrollView/KAV, with console.log on both onPress and inside send(). Strip everything else. Confirm basic touch works in swipe-world. Then build back up.

**Option E — Add console.log INSIDE send() function (line ~3464)**
We never confirmed whether send() is actually called. The console.log on the button onPress may fire but send() may bail early (e.g. `loading` stuck at true, or `lastSendRef.current === sendKey` dedup). Add `console.log('SEND CALLED', text, loading, lastSendRef.current)` as the first line of send().

### Key rules:
- ONE change at a time. Test on device. If broken, revert immediately.
- Do NOT stack multiple fixes — this caused both sessions to fail
- Do NOT change swipe-world.tsx unless absolutely necessary
- Do NOT replace Keyboard/onFocus/onBlur patterns without testing each in isolation
- Always verify files are clean with `git diff` before and after each change
- Maximum 20 minutes on any single approach before stepping back

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
## SWIPE WORLD (✅ complete)
## ══════════════════════════════════

**`app/(tabs)/swipe-world.tsx`** — owns all 3 pages, FAB, dots, landing overlay.

- Page 0: DashboardScreen ✅
- Page 1: HomeScreen (named export from index.tsx) ✅
- Page 2: MySpaceScreen ✅
- fabActive + setFabActive passed into ChatScreen ✅

**Landing overlay:** Stays as-is. `LANDING_TEST_MODE = true` — flip before launch.

---

## ══════════════════════════════════
## MY SPACE (✅ Phase 3b complete)
## ══════════════════════════════════

All 7 cards built, 4 × 92% sheets. All dummy data.

---

## ══════════════════════════════════
## CHAT — BROKEN 🔴 (session 3 must fix)
## ══════════════════════════════════

**Current state:** index.tsx is the ORIGINAL from commit `419589f` — has splash/entry/card stack on load. Chat works via the entry screen only. Send button in the main chat input bar does NOT work when embedded in swipe-world.

**Target state:** Chat opens directly with Zaeli greeting. No splash. No card stack. Input bar receives taps reliably. Send button works. Dashboard context flows preserved.

**All context injection paths are working in the original** — edit_event, add_event, shopping, shopping_sheet, actions, meals, noticed. Do not touch these.

**The skip-splash changes are safe and tested:**
- `screen` initial state: `'splash'` → `'chat'`
- `chatOpacity` initial value: `0` → `1`
- Mount useEffect: `generateBrief(true); loadCardData();` (replace splash animation)
These three edits work — the chat loads. The ONLY remaining issue is the send button.

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
Phase 5: Chat v5 / fix         🔴 FAILED sessions 1+2 — retry session 3 with new approaches
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
