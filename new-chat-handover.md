# Zaeli — New Chat Handover
*4 April 2026 — ZaeliFAB Phase 1 complete ✅ v5 architecture locked ✅*
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
Brief font = Poppins_700Bold (NOT DM Serif)
DM Serif = wordmark and large card numbers only
Zaeli messages = full width, no bubble (v5)
```

---

## V5 ARCHITECTURE (LOCKED ✅ 4 Apr 2026)

### The three-screen world
```
Pulse  ←  Dashboard  →  Chat
```
Dashboard = permanent anchor after Landing dismisses.
Dots indicator (3 dots, active pill expands).
**ZaeliFAB is the only navigation** — present on every screen always.

### Landing (time-window only)
- Morning 6–9am · Midday 12–2pm · Evening 5–8pm
- Full-screen gradient bleeds behind status bar
- First swipe dismisses for that window
- Outside windows: opens directly to Dashboard

### ZaeliFAB buttons
```
[ Dashboard ] | [ Chat ][ Mic ] | [ More ]

Dashboard → navigates to Dashboard. Dark when active.
Chat      → first tap: go to Chat. Second tap: open keyboard. Coral when keyboard open.
Mic       → Mic v2 pill appears above FAB (same width, same radius). Coral when active.
More      → 3×3 overlay card above FAB. Coral when open.
```

### ZaeliFAB sizing (device-tested ✅ LOCKED)
```
FAB_BTN = 58px · FAB_PAD = 10px · borderRadius = 36px
Mic pill + More card: same width as FAB, same borderRadius, bottom 124px iOS
Clean gap between FAB and overlays — no overlap
```

### More overlay — 3×3 grid (LOCKED ✅)
```
Notes · Kids Hub · Tutor
Travel · Family · Meals
Pulse · Zen · Settings  ← Settings always bottom-right
```
SVG icons, channel palette colours, 10% bg opacity.

### No chat input bar
Keyboard = second tap Chat FAB button.
Voice = Mic FAB button.
No persistent bar anywhere. Locked.

### Zaeli messages (v5)
Full width, no bubble. "Zaeli" small label above. Poppins 400.
User replies: right-aligned dark bubbles.

---

## What's built (4 Apr 2026)

### ✅ app/components/ZaeliFAB.tsx — COMPLETE Phase 1
Shared FAB component. Four buttons. 3×3 More overlay with SVG icons. Mic v2 pill.
Sizing locked on device. More button goes coral when open. Overlays float above FAB with gap.
Drop this into every screen as Phases 2–6 are built.

### ✅ app/(tabs)/index.tsx — v5 updated
Pill bar removed. Old chat input bar removed. Old mic overlay removed.
ZaeliFAB dropped in and wired. NavMenu/HamburgerButton removed.
All existing functionality (brief, cards, sheets, persistence, tool-calling) unchanged.
**Still needs:** full-width Zaeli messages (Phase 5), two entry states (Phase 5).

### 🔨 Phase 2 NEXT — app/(tabs)/landing.tsx
### 🔨 Phase 3 — Navigation architecture (_layout.tsx)
### 🔨 Phase 4 — app/(tabs)/dashboard.tsx
### 🔨 Phase 5 — index.tsx Chat v5 updates
### 🔨 Phase 6 — app/(tabs)/pulse.tsx
### 🔨 Phase 8 — app/(tabs)/zen.tsx

### ✅ Unchanged and complete
```
calendar.tsx    — full sheet, inline cards, all interactions
shopping.tsx    — rebuild complete, lavender, persistence
mealplanner.tsx — rebuild complete, full spec
All 92% sheets — completely unchanged in v5
Inline card renders — unchanged (calendar dark slate card etc)
lib/use-chat-persistence.ts — keys: home, shopping, calendar, meals
```

---

## Immediate next task — Phase 2: Landing screen

**File to create:** `app/(tabs)/landing.tsx`

Key requirements:
- Full-screen gradient background (bleeds behind status bar — no SafeAreaView top padding, use absolute positioning)
- Time-window aware — reads current hour, shows correct gradient + AI letter colour
- Brief pre-generated via GPT-mini on mount (same system prompt as current home brief)
- Poppins 700Bold, 21px brief, coral `#FF4545` highlights
- Logo top-left, DM Serif, AI letters complement gradient
- Dots indicator (3 dots — Chat · Landing · Dashboard)
- No swipe hint text — dots only
- ZaeliFAB present (activeButton=null on Landing)
- First swipe in any direction → dismisses for this time window (AsyncStorage key per window)
- After dismiss → navigate to Dashboard

---

## Screen status table

| File | Status | Notes |
|---|---|---|
| components/ZaeliFAB.tsx | ✅ Phase 1 complete | Sizing locked on device |
| index.tsx | ✅ v5 updated | Needs Phase 5 chat updates |
| landing.tsx | 🔨 Phase 2 NEXT | New screen |
| _layout.tsx | 🔨 Phase 3 | Horizontal scroll world |
| dashboard.tsx | 🔨 Phase 4 | New screen |
| pulse.tsx | 🔨 Phase 6 | New screen |
| zen.tsx | 🔨 Phase 8 | New screen |
| calendar.tsx | ✅ Complete | Unchanged |
| shopping.tsx | ✅ Complete | Unchanged |
| mealplanner.tsx | ✅ Complete | Unchanged |
| todos.tsx | Not built | — |
| kids.tsx | Not built | — |
| family.tsx | Not built | — |
| notes.tsx | Not built | — |
| travel.tsx | Not built | — |
| tutor.tsx | Needs rebuild | — |
| lib/use-chat-persistence.ts | ✅ Complete | — |

---

## Key decisions locked this session (4 Apr 2026)

- ZaeliFAB Phase 1 complete and device-tested — sizing locked
- FAB_BTN=58 · FAB_PAD=10 · borderRadius=36 — these are the locked values
- Mic pill + More card: same width + borderRadius as FAB, bottom=124px iOS
- More button: coral bg + white icon when overlay open, dark when closed
- More grid: 3×3, `width:'31%'`, `justifyContent:'space-between'` — true 3 columns
- Pill bar completely removed from index.tsx
- Old full-screen mic overlay completely removed from index.tsx
- NavMenu + HamburgerButton completely removed from index.tsx
- No persistent chat input bar — this is final and locked
- Brief = Poppins 700Bold — DM Serif only for wordmark
- Zaeli messages = full width no bubble — Phase 5 implementation pending
- Pulse confirmed as third tab (not More submenu) — bigger than a submenu
- Zen confirmed in More grid bottom-centre

---

## Tech reminders
- `npx expo start --dev-client` after copying (`--clear` for bundle issues)
- Import ZaeliFAB: `import ZaeliFAB from '../components/ZaeliFAB'`
- Import paths from `app/(tabs)/`: `../../lib/supabase`
- expo-file-system: `import * as FileSystem from 'expo-file-system/legacy'`
- Supabase: `rsvbzakyyrftezthlhtd` (Sydney)
- Windows dev — no && chaining in PowerShell
- router.navigate() always — never push() or replace()

---

**Read CLAUDE.md and ZAELI-PRODUCT.md first. Always ask Richard to upload the current file before editing.**
