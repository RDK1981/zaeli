# Zaeli — New Chat Handover
*5 April 2026 — Dashboard Phase 4 ✅ Calendar card interaction ✅ Chat injection ✅*
*Copy this entire message to start a new chat.*

---

## Hi! Continuing development of Zaeli.

Zaeli is an iOS-first AI family life platform built in React Native / Expo.
Please read **CLAUDE.md** before we start — full stack, architecture, colours, ALL sizing specs.
Then **ZAELI-PRODUCT.md** for product vision and all module decisions.

---

## How I like to work
- **Beginner developer** — always full file rewrites, never partial diffs
- **Two fixes at a time** — bulk changes = too many variables
- One PowerShell command at a time, never chained with &&
- Plain English before code
- **Design before code** — mockup first for any new screen
- Always ask me to upload the current working file before editing

---

## Who I am
- Richard. **Logged-in user = Rich**
- Family: Rich, Anna, Poppy (Yr6, 12, girl), Gab (Yr4, 10, BOY — Gabriel, he/him), Duke (Yr1, 8, boy)
- Local path: `C:\Users\richa\zaeli` (Windows, PowerShell)
- Screen copy: `Copy-Item "C:\Users\richa\Downloads\file.tsx" "C:\Users\richa\zaeli\app\`(tabs`)\file.tsx"`
- Component copy: `Copy-Item "C:\Users\richa\Downloads\ZaeliFAB.tsx" "C:\Users\richa\zaeli\app\components\ZaeliFAB.tsx"`
- Lib copy: `Copy-Item "C:\Users\richa\Downloads\file.ts" "C:\Users\richa\zaeli\lib\file.ts"`
- Repo: https://github.com/RDK1981/zaeli (private)
- Admin: https://incomparable-gumdrop-32e4ba.netlify.app

---

## Key constants (CRITICAL — never get these wrong)
```
DUMMY_FAMILY_ID = '00000000-0000-0000-0000-000000000001'
SONNET          = 'claude-sonnet-4-20250514'
GPT_MINI        = 'gpt-5.4-mini'
OpenAI = max_completion_tokens · Claude = max_tokens
Send button = #FF4545 coral ALWAYS
Body bg = #FAF8F5 warm white always
No left-border accent strips on cards
Sheets = clean black/grey (no channel colour)
KAV must have backgroundColor:'#fff'
always await supabase inserts
isActionQuery() runs BEFORE isCalendarQuery()
Apostrophes in JSX: always double-quoted strings
expo-file-system: import as 'expo-file-system/legacy'
NEVER literal newlines inside JSX strings or regex — use \n escape
stopPropagation on nested TouchableOpacity inside tappable parent row
Modal stacking iOS: close modal → setTimeout 350ms → open next modal
NEVER append +10:00 or any timezone suffix to stored event times
fmtTime() and isoToMinutes() use RAW STRING PARSE — never new Date()
ZaeliFAB is the ONLY navigation — no pill bar, no hamburger, no tab bar
No persistent chat input bar — keyboard via Chat FAB second tap
Brief font = Poppins_600SemiBold 26px (NOT DM Serif, NOT 700Bold)
DM Serif = wordmark and large card numbers only
Zaeli messages = full width, no bubble (v5 — Phase 5 pending)
PanResponder and StatusBar must be explicitly imported from 'react-native'
Landing = LandingOverlay in index.tsx — NOT a separate route
router.navigate() always — NEVER router.replace() or router.push()
Navigation store: lib/navigation-store.ts — set before navigate, read+clear in useFocusEffect
Dashboard card order FIXED: Calendar → Weather+Shopping → Actions → Dinner (never rearranges)
LANDING_TEST_MODE = true in index.tsx — must be set false before launch
```

---

## V5 ARCHITECTURE (LOCKED ✅)

### Three-screen world
```
Pulse  ←  Dashboard  →  Chat
```
ZaeliFAB is the ONLY navigation. Dashboard = permanent anchor.

### Core UX principle
**Dashboard = read. Chat = do.** Every action routes to Chat so Zaeli has full tool-calling.

### Landing (COMPLETE ✅)
- `LandingOverlay` embedded in index.tsx, NOT a separate route
- `LandingGate` default export checks time window + FileSystem dismiss flag
- Swipe >50px or FAB → dismisses. Flags in `landing_flags.json`

### ZaeliFAB (COMPLETE ✅)
```
[ Dashboard ] | [ Chat ][ Mic ] | [ More ]
FAB_BTN=58 · borderRadius=36 · FAB_WIDTH=318px · bottom=124px iOS
More: Notes/Kids/Tutor · Travel/Family/Meals · Pulse/Zen/Settings
```

---

## What's built (5 April 2026)

### ✅ lib/navigation-store.ts — NEW
Module-level store for Dashboard→Chat context. Production ready.
```typescript
setPendingChatContext({ type:'edit_event'|'add_event'|..., event?, returnTo?:'dashboard' })
getPendingChatContext()   // read in useFocusEffect
clearPendingChatContext() // clear after consuming
```

### ✅ app/(tabs)/dashboard.tsx — Phase 4 COMPLETE
- Fixed card order: Calendar → Weather+Shopping → Actions → Dinner
- Smart time logic: calendar/dinner switch to tomorrow after 8pm or when today's events done
- **CalendarCard fully rebuilt:**
  - 3 events shown, expand chevron at bottom
  - `+ Add` top right only (no Full button in header)
  - Footer: "N more ∨" left · "Full calendar →" right
  - Event tap → inline expand: notes, attendees, Edit/Delete buttons
  - Delete = two-tap confirm inline
  - "✦ Edit with Zaeli" → sets navigation store → navigates to Chat
  - "+ Add" → sets navigation store → navigates to Chat

### ✅ app/(tabs)/index.tsx — Chat injection wired
- `useFocusEffect` reads navigation store on every focus
- `edit_event` context → injects inline calendar card + Zaeli prompt + chips + keyboard
- `add_event` context → injects Zaeli prompt + chips + keyboard
- `returnToDashboard` state → shows "← Dashboard" back pill at top
- Pill disappears after first message send
- Chips for edit: Move the time · Add someone · Change location · Cancel it · Manual edit
- Chips for add: Today · Tomorrow · This week · For the kids

### ✅ app/components/ZaeliFAB.tsx — Phase 1 complete
### ✅ index.tsx — LandingGate + LandingOverlay + HomeScreen
### ✅ calendar.tsx · shopping.tsx · mealplanner.tsx — unchanged
### ✅ settings.tsx · dashboard.tsx stubs registered in _layout.tsx

---

## Files NOT yet tested this session
The following were built but not tested on device (Richard went to bed):
- `lib/navigation-store.ts` — new file
- `dashboard.tsx` — rebuilt CalendarCard
- `index.tsx` — Chat injection + back pill

**Test these first in the next session before building anything new.**

---

## Immediate next steps

### 1. Test the three new files (first priority)
Copy and test:
```
lib/navigation-store.ts → C:\Users\richa\zaeli\lib\navigation-store.ts
dashboard.tsx → app/(tabs)/dashboard.tsx
index.tsx → app/(tabs)/index.tsx
```
Then verify:
- Dashboard calendar card shows 3 events, expand works
- Tap event → inline expand → "✦ Edit with Zaeli" → Chat opens with card + prompt + keyboard
- "+ Add" → Chat opens with add prompt + keyboard
- "← Dashboard" pill appears, disappears after first message
- Delete two-tap works inline

### 2. Once tested — Phase 3: Navigation architecture
Horizontal swipe world. Three screens connected by swipe gesture.
Dot indicator (3 dots, active expands). Dashboard = centre anchor.

### 3. Wire remaining Dashboard cards → Chat
Shopping card → Chat with shopping context
Actions card → Chat with actions context
Dinner card → Chat with meals context
(Same navigation store pattern, just add more context types)

---

## Build priority order
```
Phase 1: ZaeliFAB              ✅ COMPLETE
Phase 2: Landing overlay       ✅ COMPLETE
Phase 4: Dashboard             ✅ COMPLETE
  └─ Calendar card interaction ✅ COMPLETE
  └─ Navigation store          ✅ COMPLETE
  └─ Chat injection            ✅ COMPLETE (untested)
  └─ Other cards → Chat        🔨 Next after testing
Phase 3: Navigation (swipe)    🔨 After other cards wired
Phase 5: Chat v5 updates       🔨 Full-width Zaeli, two entry states
Phase 6: Pulse screen          🔨
Phase 8: Zen screen            🔨
```

---

## Screen status table

| File | Status | Notes |
|---|---|---|
| lib/navigation-store.ts | ✅ Built (untested) | New file — test first |
| components/ZaeliFAB.tsx | ✅ Complete | Sizing locked |
| index.tsx | ✅ Built (untested) | Chat injection + back pill added |
| dashboard.tsx | ✅ Built (untested) | Full CalendarCard interaction |
| _layout.tsx | ✅ Updated | All routes registered |
| settings.tsx | ✅ Stub | — |
| calendar.tsx | ✅ Complete | Unchanged |
| shopping.tsx | ✅ Complete | Unchanged |
| mealplanner.tsx | ✅ Complete | Unchanged |
| pulse.tsx | 🔨 Phase 6 | Not started |
| zen.tsx | 🔨 Phase 8 | Not started |
| todos.tsx | Not built | — |
| kids.tsx | Not built | — |
| notes.tsx | Not built | — |
| travel.tsx | Not built | — |
| tutor.tsx | Needs rebuild | — |

---

## Key decisions locked this session (5 Apr 2026)

- **Dashboard = read, Chat = do** — 90% of activity stays in Chat
- **Card order fixed** — never rearranges by time of day, only content inside adapts
- **Calendar card rebuilt** — 3 events, expand inline, two-tap delete, Edit/Add → Chat
- **Navigation store** — `lib/navigation-store.ts`, module-level, production ready
- **Chat injection pattern** — useFocusEffect reads store, clears it, injects context
- **"← Dashboard" back pill** — appears on Dashboard-triggered entry, clears on first send
- **Keyboard pre-loads** — 350ms delay after navigation to allow screen to settle
- **Full calendar link** — moved from header button to footer text link
- **Delete = two-tap inline** — confirm row appears within expanded event, no modal

---

## Tech reminders
- `npx expo start --dev-client` after copying (`--clear` for bundle issues)
- Import ZaeliFAB: `import ZaeliFAB from '../components/ZaeliFAB'`
- Import navigation store: `import { setPendingChatContext } from '../../lib/navigation-store'`
- Import paths from `app/(tabs)/`: `../../lib/supabase`
- expo-file-system: `import * as FileSystem from 'expo-file-system/legacy'`
- Supabase: `rsvbzakyyrftezthlhtd` (Sydney)
- Windows dev — no && chaining in PowerShell
- router.navigate() always — never replace() or push()

---

**Read CLAUDE.md and ZAELI-PRODUCT.md first. Always ask Richard to upload the current file before editing.**
