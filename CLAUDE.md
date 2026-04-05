# CLAUDE.md — Zaeli Project Context
*Last updated: 5 April 2026 — Dashboard Option A ✅ Word of the Day ✅ Chat input bar ✅ ZaeliFAB mic ✅*

---

## ══════════════════════════════════
## SCREEN ARCHITECTURE — CRITICAL (LOCKED ✅)
## ══════════════════════════════════

**There are only THREE screens in the swipe world:**
```
Pulse  ←  Dashboard  →  Chat
```

**These open as 92% SHEETS over Chat — NEVER dedicated screens:**
- Calendar
- Shopping
- Meal Planner
- Todos / Reminders
- Notes
- Travel

**These are the ONLY dedicated full screens (besides the three above):**
- Tutor
- Kids Hub
- Zen
- Our Family
- Settings

**The More overlay routes:**
- Calendar / Shopping / Meals / Todos / Notes / Travel → open as 92% sheet over Chat
- Tutor / Kids Hub / Zen / Our Family / Settings → router.navigate() to dedicated screen

**NOTE:** `shopping.tsx`, `mealplanner.tsx`, `calendar.tsx` etc. currently exist as tab screens — this is temporary scaffolding from before v5 was locked. They will become sheets launched from Chat. Do NOT build new features assuming these are navigable full screens.

---

## Who You Are Talking To
- **Richard** — beginner developer. Always give **full file rewrites**, easy copy-paste PowerShell commands, one step at a time
- Never give partial diffs or targeted edits unless it is a single truly isolated line
- Always explain what you are doing in plain English before diving into code
- Family: Rich (logged-in user), Anna, Poppy (Yr6, age 12, girl), Gab (Yr4, age 10, BOY — Gabriel, always he/him), Duke (Yr1, age 8, boy)
- Local path: `C:\Users\richa\zaeli` (Windows, PowerShell — no && chaining)
- Repo: https://github.com/RDK1981/zaeli (private)
- PowerShell screen copy: `Copy-Item "C:\Users\richa\Downloads\file.tsx" "C:\Users\richa\zaeli\app\`(tabs`)\file.tsx"`
- PowerShell component copy: `Copy-Item "C:\Users\richa\Downloads\ZaeliFAB.tsx" "C:\Users\richa\zaeli\app\components\ZaeliFAB.tsx"`
- PowerShell lib copy: `Copy-Item "C:\Users\richa\Downloads\file.ts" "C:\Users\richa\zaeli\lib\file.ts"`
- Full file rewrites only — never partial diffs
- Design before code — always discuss/mockup new screens before writing code
- **Two fixes at a time** — bulk changes create too many debugging variables

---

## The Business

Zaeli is an iOS-first AI family life platform for Australian families with children.

**Revenue model:**
- Family plan: A$14.99/month
- Tutor add-on: A$9.99/child/month
- 100% web sales (no App Store cut)

---

## Zaeli Persona (LOCKED)

Sharp, warm, genuinely enthusiastic about this family. Finds the funny angle through delight, not detachment.

**Hard rules:**
- NEVER "mate", "guys" — Never start with "I" — Plain text only
- Always ends on a confident offer — never a bare open question
- **Banned words:** "queued up", "locked in", "tidy", "sorted", "ambush", "sprint", "chaos", "breathing room", "quick wins", "you've got this", "make it count"

---

## Stack
- React Native + Expo (iOS-first), dev build on iPhone 11 Pro Max
- Supabase (Postgres, Sydney ap-southeast-2, ID: rsvbzakyyrftezthlhtd)
- Claude Sonnet (`claude-sonnet-4-20250514`) — all tool-calling channels + vision
- OpenAI GPT-5.4 mini (`gpt-5.4-mini`) — landing brief, home brief, Pulse notices
- OpenAI Whisper-1 — voice transcription
- expo-router, expo-image-picker, react-native-svg, expo-file-system, expo-av
- Poppins font (ALL UI), DMSerifDisplay (wordmark + ghost numbers only)
- No bottom tab bar — ZaeliFAB is the only navigation

---

## Key Constants
```
DUMMY_FAMILY_ID = '00000000-0000-0000-0000-000000000001'
SONNET          = 'claude-sonnet-4-20250514'
GPT_MINI        = 'gpt-5.4-mini'
OPENAI env var  = EXPO_PUBLIC_OPENAI_API_KEY  ← exact name, both ZaeliFAB AND index.tsx
OpenAI = max_completion_tokens · Claude = max_tokens. Never mix.
KAV must have backgroundColor:'#fff'
always await supabase inserts
Send button = #FF4545 coral ALWAYS
Body bg = #FAF8F5 warm white always
isActionQuery() runs BEFORE isCalendarQuery()
Apostrophes in JSX: always double-quoted strings
expo-file-system import = 'expo-file-system/legacy'
Do NOT use @react-native-async-storage — requires native rebuild
NEVER literal newlines inside JSX strings or regex — use \n escape
stopPropagation on nested TouchableOpacity inside tappable parent rows
Modal stacking iOS: close modal 1 → setTimeout 350ms → open modal 2
NEVER append +10:00 or any timezone suffix to stored event times
ZaeliFAB is the ONLY navigation — no pill bar, no hamburger, no tab bar
Keyboard = Chat FAB tap when in chat → floating pill input bar, FAB hides
Brief font = Poppins_600SemiBold 26px (NOT DM Serif, NOT 700Bold)
DM Serif = wordmark and ghost numbers only
Zaeli messages = full width, no bubble (v5 — Phase 5 pending)
PanResponder and StatusBar must be explicitly imported from 'react-native'
Landing = LandingOverlay component in index.tsx — NOT a separate route
router.navigate() always — NEVER router.replace() or router.push()
Navigation store: lib/navigation-store.ts — set before navigate, read+clear in useFocusEffect
Dashboard card order = FIXED: Calendar → Dinner → Weather+WotD → Shopping → Actions
LANDING_TEST_MODE = true in index.tsx — must be set false before launch
ZaeliFAB = forwardRef — import ZaeliFABHandle type alongside default import
fabRef = useRef<ZaeliFABHandle>(null) in index.tsx — ref={fabRef} on ZaeliFAB
Delete = always optimistic UI first, Supabase in background
Calendar/Shopping/Meals/Todos/Notes/Travel = 92% SHEETS — never router.navigate()
Tutor/Kids Hub/Zen/Our Family/Settings = dedicated screens — router.navigate() ok
```

---

## ══════════════════════════════════
## V5 NAVIGATION ARCHITECTURE (LOCKED ✅)
## ══════════════════════════════════

```
Pulse  ←  Dashboard  →  Chat
```
Dashboard = permanent anchor. ZaeliFAB is the ONLY navigation.

**Domain channels open as sheets over Chat — never as navigated screens:**
Calendar · Shopping · Meal Planner · Todos · Notes · Travel → 92% sheets

**Dedicated screens (router.navigate ok):**
Tutor · Kids Hub · Zen · Our Family · Settings

### Landing (COMPLETE ✅)
- `LandingOverlay` in index.tsx — NOT a separate route
- `LANDING_TEST_MODE = true` — set false before launch

### ZaeliFAB (COMPLETE ✅)
```
[ Dashboard ] | [ Chat ][ Mic ] | [ More ]
FAB_BTN=58 · borderRadius=36 · FAB_WIDTH=318px
forwardRef → exposes startMic() via useImperativeHandle
FAB bar hides when activeButton === 'keyboard'
Mic pill: full width, vertical, waveform + Listening + Cancel/Send →
```

### Chat input bar (COMPLETE ✅)
- Floating pill, transparent bg, appears when keyboard active
- Mic → `fabRef.current?.startMic()` · TextInput (ref={inputRef}) · Send
- FAB restores only on keyboard dismiss (onBlur), NOT on send

---

## ══════════════════════════════════
## DASHBOARD — OPTION A (✅ Complete)
## ══════════════════════════════════

**Design principle:** One bold Poppins statement per card. Data behind the tap.

### Card order (FIXED)
1. Calendar — full width, `#3A3D4A`
2. Dinner — full width, `#FAC8A8`
3. Weather `#A8D8F0` + Word of the Day `#E8F4E8` — side by side
4. Shopping — full width, `#D8CCFF` (white font, no ghost number)
5. Actions — full width, `#F0DC80` (no ghost number)

### Headlines (formula-driven, zero AI cost)
- Calendar: "3 things on today." / "All clear today."
- Dinner: "Pasta Carbonara for dinner tonight." / "Nothing planned for dinner."
- Shopping: "23 items on the shopping list." / "Shopping list is clear."
- Actions: "8 things on your plate." / "Nothing on your plate."
- WotD: the word itself — 26px, `#6B35D9` purple

### Behaviour
- Tap header → expand · tap again → collapse · one card at a time
- No "Collapse" text · ghost number Calendar only
- Auto-refresh: 5-min interval · optimistic delete
- Date in top bar replaces "Dashboard" label

---

## ══════════════════════════════════
## WORD OF THE DAY (NEW ✅)
## ══════════════════════════════════

Card `#E8F4E8` sage · text `#6B35D9` purple · 26px Poppins 700
400 curated words in `WOTD_LIST` (dashboard.tsx), seeded by day-of-year
Definition: `dictionaryapi.dev` (free, no key) · Audio: expo-av MP3
Update annually: swap `WOTD_LIST` array

---

## ══════════════════════════════════
## NAVIGATION STORE (✅)
## ══════════════════════════════════

`lib/navigation-store.ts`
Types: `edit_event` · `add_event` · `shopping` · `actions` · `meals`

---

## Per-Channel Colour System (LOCKED)

| Channel | Card/Sheet bg | Text |
|---------|--------------|------|
| Calendar | `#3A3D4A` | white |
| Dinner | `#FAC8A8` | dark |
| Weather | `#A8D8F0` | dark |
| Word of Day | `#E8F4E8` | `#6B35D9` |
| Shopping | `#D8CCFF` | white |
| Actions/Todos | `#F0DC80` | dark |
| Notes | `#5C8A3C` sage | — |
| Travel | `#0096C7` cyan | — |
| Our Family | `#D4006A` magenta | — |
| Tutor | `#6B35D9` violet | — |
| Kids Hub | `#0A8A5A` green | — |

Family colours: Rich `#4D8BFF` · Anna `#FF7B6B` · Poppy `#A855F7` · Gab `#22C55E` · Duke `#F59E0B`

---

## Channel Architecture (v5)
```
── THREE SCREENS ──────────────────────────────────────────
app/(tabs)/index.tsx       → Chat + LandingGate + LandingOverlay ✅
app/(tabs)/dashboard.tsx   → Dashboard Option A ✅
app/(tabs)/pulse.tsx       → 🔨 Phase 6

── 92% SHEETS (open over Chat, never navigated to) ────────
Calendar sheet             → inside index.tsx (calSheetOpen state) ✅
Shopping sheet             → inside index.tsx (shopSheetOpen state) ✅
Meal Planner sheet         → inside index.tsx ✅
Todos sheet                → 🔨 to build
Notes sheet                → 🔨 to build
Travel sheet               → 🔨 to build

── DEDICATED SCREENS (router.navigate ok) ─────────────────
app/(tabs)/settings.tsx    → Stub ✅
Tutor                      → 🔨 to build/rebuild
Kids Hub                   → 🔨 to build
Zen                        → 🔨 Phase 8
Our Family                 → 🔨 to build

── SUPPORT FILES ───────────────────────────────────────────
app/components/ZaeliFAB.tsx   → ✅ forwardRef, mic pill
lib/navigation-store.ts       → ✅ Dashboard→Chat context
lib/use-chat-persistence.ts   → ✅ home|shopping|calendar|meals
```

---

## Build Phase Plan (v5)
```
Phase 1: ZaeliFAB              ✅ COMPLETE
Phase 2: Landing overlay       ✅ COMPLETE
Phase 4: Dashboard Option A    ✅ COMPLETE
Phase 4b: Chat input bar       ✅ COMPLETE
Dashboard stress testing       🔨 IN PROGRESS
Phase 3: Navigation swipe      🔨 NEXT (Pulse ← Dashboard → Chat)
Phase 5: Chat v5 updates       🔨
Phase 6: Pulse screen          🔨
Phase 8: Zen screen            🔨
```

---

## Coding Rules
- SafeAreaView edges={['top']} always
- PowerShell: no && — separate lines
- Always `npx expo start --dev-client` (`--clear` for bundle issues)
- Date: local construction — NEVER toISOString()
- Time: NEVER +10:00 — store bare local datetime string
- KAV backgroundColor:'#fff' · Send: '#FF4545' always
- Body bg: '#FAF8F5' always · No left-border accent strips
- expo-file-system: 'expo-file-system/legacy'
- No literal newlines in JSX — use \n
- stopPropagation on nested tappable rows
- Modal stacking: close → setTimeout 350ms → open
- Delete: optimistic UI first, Supabase background
- Sheet opens BEFORE awaiting data
- router.navigate() only for dedicated screens — sheets open via state
- PanResponder + StatusBar: explicitly import from 'react-native'
- EXPO_PUBLIC_OPENAI_API_KEY exact name everywhere
