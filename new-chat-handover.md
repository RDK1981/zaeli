# Zaeli — New Chat Handover
*4 April 2026 — ZaeliFAB Phase 1 ✅ Landing Phase 2 ✅ v5 architecture locked ✅*
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
Landing = LandingOverlay component in index.tsx — NOT a separate route
router.navigate() always — NEVER router.replace() or router.push()
```

---

## V5 ARCHITECTURE (LOCKED ✅ 4 Apr 2026)

### The three-screen world
```
Pulse  ←  Dashboard  →  Chat
```
Dashboard = permanent anchor. Dots indicator (3 dots, active expands).
ZaeliFAB is the ONLY navigation — present on every screen always.

### Landing (time-window overlay — COMPLETE ✅)
- Morning 6–9am · Midday 12–2pm · Evening 5–8pm
- Implemented as `LandingOverlay` absolute overlay inside index.tsx
- NOT a separate route — no navigation needed
- `LandingGate` default export checks window + dismiss flag
- Swipe (>50px) or FAB tap → calls onDismiss() → overlay fades out
- Flags stored: FileSystem `landing_flags.json`, key `YYYY-MM-DD-window`
- `LANDING_TEST_MODE = true` in index.tsx — set false before launch

### ZaeliFAB buttons (LOCKED ✅)
```
[ Dashboard ] | [ Chat ][ Mic ] | [ More ]
FAB_BTN=58px · borderRadius=36px · FAB_WIDTH=318px
Mic pill + More card: same width, same radius, bottom=124px iOS
More button: coral when open, dark when closed
```

### More overlay — 3×3 grid (LOCKED ✅)
```
Notes · Kids Hub · Tutor
Travel · Family · Meals
Pulse · Zen · Settings  ← Settings always bottom-right
```

### No chat input bar
Keyboard = second tap Chat FAB. Voice = Mic FAB. Locked.

---

## What's built (4 Apr 2026)

### ✅ app/components/ZaeliFAB.tsx — Phase 1 COMPLETE
Four buttons. 3×3 More overlay. Mic v2 pill. Sizing locked on device.

### ✅ app/(tabs)/index.tsx — Phase 2 COMPLETE
**Contains three components:**
1. `LandingGate` (default export) — checks time window + dismiss flag
2. `LandingOverlay` — full-screen overlay, swipe dismiss, GPT brief, ZaeliFAB
3. `HomeScreen` — existing chat screen (pill bar removed, FAB added)

**LandingOverlay visual spec (LOCKED):**
- Background: `#FFF6EC` morning · `#EDF6FF` midday · `#F5EEFF` evening (solid for dev, gradient needs EAS)
- Logo: DM Serif 36px, 'a' and 'i' = `#F0C8C0` warm blush
- Brief: Poppins 600SemiBold 26px, highlights `#0096C7` cyan
- Greeting: Poppins 600, 13px, uppercase
- 3 dots navigator, paddingBottom 28

**Still needs (Phase 5):** full-width Zaeli messages, two entry states.

### ✅ app/(tabs)/dashboard.tsx — stub (Phase 4 full build)
### ✅ app/(tabs)/settings.tsx — stub
### ✅ app/(tabs)/_layout.tsx — landing + dashboard + settings registered

### ✅ Unchanged and complete
```
calendar.tsx · shopping.tsx · mealplanner.tsx
All 92% sheets · Inline card renders · use-chat-persistence.ts
```

---

## Build priority order (revised)

**Phase 4 FIRST, then Phase 3:**
- Phase 4 (Dashboard) before Phase 3 (navigation architecture) — build real content first, then wire the swipe world once all three screens have substance
- Phase 3 (horizontal swipe + dots) after Dashboard exists

```
Phase 1: ZaeliFAB              ✅ COMPLETE
Phase 2: Landing overlay       ✅ COMPLETE
Phase 4: Dashboard screen      🔨 NEXT
Phase 3: Navigation (swipe)    🔨 after Dashboard
Phase 5: Chat v5 updates       🔨
Phase 6: Pulse screen          🔨
Phase 8: Zen screen            🔨
```

---

## Immediate next task — Phase 4: Dashboard screen

**File:** `app/(tabs)/dashboard.tsx` (currently a stub — full build needed)

Key requirements:
- Background `#FAF8F5`, ZaeliFAB only (activeButton='dashboard')
- No chat bar, no pills, no input
- Card stack — same cards as current index.tsx HomeScreen but standalone:
  1. Calendar card — dark slate `#3A3D4A`
  2. Weather + Shopping — 50/50 side by side
  3. Today's Actions — gold `#FFFCE6`
  4. Dinner tonight — peach `#FFF1E8`
- Card tap → navigates to Chat (index.tsx) with context injected
- Top bar: "zaeli" wordmark + "Dashboard" channel label (no hamburger)
- Dot indicator: middle dot active

Before building: upload current `dashboard.tsx` stub and `index.tsx` so card components can be extracted cleanly.

---

## Key decisions locked this session (Phase 2 — 4 Apr 2026)

- Landing is an overlay inside index.tsx — NOT a separate expo-router route
- `router.replace()` from a tab causes blank screens — overlay architecture avoids this entirely
- `PanResponder` must be explicitly imported from 'react-native'
- `onStartShouldSetPanResponder: () => false` so FAB taps pass through
- Swipe threshold 50px (not 30px) to prevent accidental dismiss
- `expo-linear-gradient` not available in dev client — solid colour for now, real gradient after EAS
- Landing colours locked: `#F0C8C0` blush logo + `#0096C7` cyan highlights (after testing terracotta, lavender, sky blue)
- Brief: Poppins 600SemiBold 26px (not 700Bold — less shouty, more readable)
- GPT prompt: 3 sentences max 180 chars, sentence 3 = Zaeli personality not generic motivation
- Build order revised: Phase 4 before Phase 3

---

## Screen status table

| File | Status | Notes |
|---|---|---|
| components/ZaeliFAB.tsx | ✅ Phase 1 complete | Sizing locked |
| index.tsx | ✅ Phase 2 complete | LandingGate + LandingOverlay + HomeScreen |
| dashboard.tsx | 🔨 Phase 4 NEXT | Stub exists, full build needed |
| _layout.tsx | ✅ Updated | landing + dashboard + settings registered |
| pulse.tsx | 🔨 Phase 6 | Not started |
| zen.tsx | 🔨 Phase 8 | Not started |
| calendar.tsx | ✅ Complete | Unchanged |
| shopping.tsx | ✅ Complete | Unchanged |
| mealplanner.tsx | ✅ Complete | Unchanged |
| settings.tsx | ✅ Stub | Route warning silenced |
| todos.tsx | Not built | — |
| kids.tsx | Not built | — |
| notes.tsx | Not built | — |
| travel.tsx | Not built | — |
| tutor.tsx | Needs rebuild | — |

---

## Tech reminders
- `npx expo start --dev-client` after copying (`--clear` for bundle issues)
- Import ZaeliFAB: `import ZaeliFAB from '../components/ZaeliFAB'`
- Import paths from `app/(tabs)/`: `../../lib/supabase`
- expo-file-system: `import * as FileSystem from 'expo-file-system/legacy'`
- Supabase: `rsvbzakyyrftezthlhtd` (Sydney)
- Windows dev — no && chaining in PowerShell
- router.navigate() always — never replace() or push()
- Always import PanResponder and StatusBar explicitly from 'react-native'

---

**Read CLAUDE.md and ZAELI-PRODUCT.md first. Always ask Richard to upload the current file before editing.**
