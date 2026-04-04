# Zaeli — New Chat Handover
*4 April 2026 — v5 architecture locked ✅ Three-screen world ✅ FAB ✅ Pulse ✅ Landing ✅*
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
- PowerShell: `Copy-Item "C:\Users\richa\Downloads\file.tsx" "C:\Users\richa\zaeli\app\`(tabs`)\file.tsx"`
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
FAB is the ONLY navigation — no pill bar, no hamburger, no tab bar
Zaeli messages = FULL WIDTH, no bubble (v5 change)
Brief font = Poppins_700Bold (NOT DM Serif — v5 change)
DM Serif = wordmark and large card numbers only
```

---

## V5 ARCHITECTURE (LOCKED ✅ 4 Apr 2026)

### The three-screen world

```
Pulse  ←  Dashboard  →  Chat
```

Dashboard is the permanent anchor after Landing dismisses.
Dots indicator always shows position (3 dots).
**FAB is the only navigation** — present on every screen always.

### Landing (time-window only)
Appears during: Morning 6–9am · Midday 12–2pm · Evening 5–8pm
Full-screen gradient bleeds behind status bar.
First swipe dismisses for that window → world collapses to Dashboard ↔ Chat ↔ Pulse.
Outside windows: app opens directly to Dashboard.

### FAB buttons
```
[ Dashboard ]  |  [ Chat ]  [ Mic ]  |  [ More ]

Dashboard → navigates to Dashboard. Active = dark bg.
Chat → first tap: go to Chat. Second tap: open keyboard. Coral when keyboard open.
Mic → opens Mic v2 pill (waveform + listening + cancel above FAB)
More → opens 3×3 More overlay card (floats above FAB, full backdrop blur)
```

### More overlay — 3×3 grid
```
Row 1: Notes · Kids Hub · Tutor
Row 2: Travel · Family · Meals
Row 3: Pulse · Zen · Settings  ← Settings always bottom-right
```
SVG icons, thin stroke, channel palette colours, 10% opacity backgrounds.

### No chat input bar
Keyboard = second tap on Chat FAB button.
Voice = Mic FAB button.
No persistent input bar anywhere. Locked and intentional.

### Zaeli messages (v5 change)
Full width, no bubble. Label "Zaeli" above text in small caps.
User replies remain right-aligned dark bubbles.

---

## What's built (4 Apr 2026)

### app/(tabs)/index.tsx — Chat ✅ (needs v5 updates)
Working chat interface with full calendar sheet, persistence, tool-calling.
**v5 changes needed:** remove pill bar, add FAB component, Zaeli full-width messages, two entry states (fresh vs card-triggered).

### components/ZaeliFAB.tsx — 🔨 Phase 1 NEXT
Shared FAB component. Four buttons. More overlay 3×3. Mic v2 pill.
Drop into every screen.

### app/(tabs)/landing.tsx — 🔨 Phase 2
New screen. Time-window aware. Gradient full bleed. Poppins bold brief. Dismiss on first swipe.

### Navigation architecture — 🔨 Phase 3
Horizontal scroll world. Dot system. Swipe dismiss for Landing.

### app/(tabs)/dashboard.tsx — 🔨 Phase 4
Dedicated screen. Cards already designed. FAB only. Card tap → Chat with context.

### app/(tabs)/pulse.tsx — 🔨 Phase 6
New screen. Three zones: Zaeli Noticed · Family Activity · On the Horizon.
Reads existing Supabase tables.

### app/(tabs)/zen.tsx — 🔨 Phase 8
Simple 5-min breathing tool. Standalone screen from More overlay.

### Unchanged and complete ✅
```
calendar.tsx    — full sheet, inline cards, all interactions
shopping.tsx    — rebuild complete, lavender, persistence
mealplanner.tsx — rebuild complete, full spec
lib/use-chat-persistence.ts — keys: home, shopping, calendar, meals
All 92% sheets — completely unchanged in v5
Inline card renders — unchanged (calendar dark slate card etc)
```

---

## Immediate build priority (Phase 1)

**ZaeliFAB component** — `components/ZaeliFAB.tsx`

Props needed:
- `activeButton`: 'dashboard' | 'chat' | 'keyboard' | 'mic' | null
- `onDashboard`: () => void
- `onChat`: () => void
- `onMic`: () => void
- `onMore`: () => void (internal — toggles overlay)

Contains:
- Four-button FAB bar (Dashboard · Chat · Mic · More)
- More overlay (3×3 grid, SVG icons, palette backgrounds, backdrop blur)
- Mic v2 pill (animated waveform, listening label, cancel)

Test it in index.tsx first (replacing the existing pill bar + chat bar).
Once confirmed working → drop into all other screens.

---

## Screen status table

| File | Status | Notes |
|---|---|---|
| index.tsx | ✅ Working — needs v5 | Remove pills, add FAB, full-width Zaeli |
| dashboard.tsx | 🔨 Phase 4 | New screen |
| landing.tsx | 🔨 Phase 2 | New screen |
| pulse.tsx | 🔨 Phase 6 | New screen |
| zen.tsx | 🔨 Phase 8 | New screen |
| components/ZaeliFAB.tsx | 🔨 Phase 1 NEXT | Shared component |
| calendar.tsx | ✅ Complete | Unchanged |
| shopping.tsx | ✅ Complete | Unchanged |
| mealplanner.tsx | ✅ Complete | Unchanged |
| todos.tsx | Design ✅ | Not built |
| kids.tsx | Design ✅ | Not built |
| family.tsx | Design ✅ | Not built |
| notes.tsx | — | Not designed |
| travel.tsx | — | Not designed |
| tutor.tsx | Design ✅ | Needs rebuild |
| lib/use-chat-persistence.ts | ✅ Complete | — |

---

## Key v5 decisions locked (4 Apr 2026)

- Three-screen world: Pulse ← Dashboard → Chat (Dashboard = permanent anchor)
- Landing: time-window only, full-screen gradient, first swipe dismisses
- FAB: four buttons only, always present, replaces ALL previous navigation
- No chat input bar anywhere — keyboard via Chat FAB second tap
- Mic v2: floating pill above FAB, waveform + cancel
- More: 3×3 floating card above FAB, full backdrop blur, Settings bottom-right, Zen added
- Brief font: Poppins 700Bold (NOT DM Serif) — DM Serif = wordmark only
- Zaeli messages: full width, no bubble — user replies remain right-aligned bubbles
- Dashboard: dedicated screen, no chat bar, card tap → Chat with context
- Pulse: third screen (swipe right from Dashboard), family awareness layer
- Sheets: completely unchanged — 92% sheets still open from cards and chat actions
- Inline card renders: unchanged — calendar slate card, shopping, dinner etc all same

---

## Tech reminders
- `npx expo start --dev-client` after copying (`--clear` for bundle issues)
- Import paths from `app/(tabs)/`: `../../lib/supabase`, `../components/ZaeliFAB`
- expo-file-system: `import * as FileSystem from 'expo-file-system/legacy'`
- Supabase: `rsvbzakyyrftezthlhtd` (Sydney)
- Windows dev — no && chaining in PowerShell
- router.navigate() always — never push() or replace()

---

**Read CLAUDE.md and ZAELI-PRODUCT.md first. Always ask Richard to upload the current file before editing.**
