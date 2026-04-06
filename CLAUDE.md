# CLAUDE.md — Zaeli Project Context
*Last updated: 6 April 2026 — My Space designed ✅ Navigation architecture locked ✅ Swipe world updated ✅*

---

## ══════════════════════════════════
## SCREEN ARCHITECTURE — CRITICAL (LOCKED ✅)
## ══════════════════════════════════

**There are only THREE screens in the swipe world:**
```
My Space  ←  Dashboard  →  Chat
```

**These open as 92% SHEETS over Chat — NEVER dedicated screens:**
- Calendar · Shopping · Meal Planner · Todos / Reminders · Notes · Travel

**These are the ONLY dedicated full screens (besides the three above):**
- Tutor · Kids Hub · Our Family · Settings

**The More overlay routes:**
- Calendar / Shopping / Meals / Todos / Notes / Travel → open as 92% sheet over Chat (via state)
- Tutor / Kids Hub / Our Family / Settings → router.navigate() to dedicated screen

**NOTE:** `shopping.tsx`, `mealplanner.tsx`, `calendar.tsx` etc. currently exist as tab screens — temporary scaffolding from before v5. They will become sheets launched from Chat. Do NOT build new features assuming these are navigable full screens.

**IMPORTANT ARCHITECTURE CHANGE FROM PREVIOUS DOCS:**
- Pulse as a dedicated swipe screen = SCRAPPED
- My Space replaces Pulse as the third swipe screen (left of Dashboard)
- Pulse notices = embedded as a card in the Dashboard instead
- Zen = content lives inside My Space, NOT a dedicated screen

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
- OpenAI GPT-5.4 mini (`gpt-5.4-mini`) — landing brief, home brief, My Space notices
- OpenAI Whisper-1 — voice transcription
- expo-router, expo-image-picker, react-native-svg, expo-file-system, expo-av
- Poppins font (ALL UI), DMSerifDisplay (wordmark + ghost numbers only)
- No bottom tab bar — ZaeliFAB is the only navigation
- HealthKit — steps, distance, active calories, workout sessions (expo-health or react-native-health)
- NASA APOD API — free, api.nasa.gov/planetary/apod
- Dictionary API — dictionaryapi.dev — free, no key needed

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
Dashboard card order = FIXED: Calendar → Dinner → Weather+Notifications → Shopping → Actions
LANDING_TEST_MODE = true in index.tsx — must be set false before launch
ZaeliFAB = forwardRef — import ZaeliFABHandle type alongside default import
fabRef = useRef<ZaeliFABHandle>(null) in index.tsx — ref={fabRef} on ZaeliFAB
Delete = always optimistic UI first, Supabase in background
Calendar/Shopping/Meals/Todos/Notes/Travel = 92% SHEETS — never router.navigate()
Tutor/Kids Hub/Our Family/Settings = dedicated screens — router.navigate() ok
My Space cards follow same Poppins headline language as Dashboard cards
WotD moves from Dashboard to My Space — sage card stays identical
```

---

## ══════════════════════════════════
## V5 NAVIGATION ARCHITECTURE (LOCKED ✅)
## ══════════════════════════════════

```
My Space  ←  Dashboard  →  Chat
```
Dashboard = permanent anchor. ZaeliFAB is the ONLY navigation.
Swipe world lives in a single `swipe-world.tsx` container file (Phase 3 — to build).

**Domain channels open as sheets over Chat — never as navigated screens:**
Calendar · Shopping · Meal Planner · Todos · Notes · Travel → 92% sheets

**Dedicated screens (router.navigate ok):**
Tutor · Kids Hub · Our Family · Settings

### Landing (COMPLETE ✅)
- `LandingOverlay` in index.tsx — NOT a separate route
- `LANDING_TEST_MODE = true` — set false before launch
- Overlay sits at container level in swipe-world.tsx — shows over all three screens

### ZaeliFAB (COMPLETE ✅)
```
[ My Space ] | [ Chat ][ Mic ] | [ More ]
FAB_BTN=58 · borderRadius=36 · FAB_WIDTH=318px
forwardRef → exposes startMic() via useImperativeHandle
FAB bar hides when activeButton === 'keyboard'
Mic pill: full width, vertical, waveform + Listening + Cancel/Send →
```
- My Space button → scroll to page 0
- Dashboard button → scroll to page 1 (centre anchor)
- Chat button → scroll to page 2 (or open keyboard if already there)

### Chat input bar (COMPLETE ✅)
- Floating pill, transparent bg, appears when keyboard active
- Mic → `fabRef.current?.startMic()` · TextInput (ref={inputRef}) · Send
- FAB restores only on keyboard dismiss (onBlur), NOT on send
- Only visible when activePage === 2 (Chat page)

### Phase 3 — swipe-world.tsx (TO BUILD)
New container file. Holds:
- Horizontal ScrollView (pagingEnabled, 3 pages)
- Page 0: My Space · Page 1: Dashboard · Page 2: Chat
- 3-dot indicator (active dot = pill shape, coral)
- ZaeliFAB (renders once, above scroll)
- Landing overlay (renders once, above all)
- activePage state drives FAB behaviour + chat input bar visibility
- SafeAreaView wraps everything (removed from individual pages)
- App opens on page 1 (Dashboard) via scrollTo on mount

---

## ══════════════════════════════════
## DASHBOARD — OPTION A (✅ Complete)
## ══════════════════════════════════

**Design principle:** One bold Poppins statement per card. Data behind the tap.

### Card order (FIXED)
1. Calendar — full width, `#3A3D4A` slate
2. Dinner — full width, `#FAC8A8` peach
3. Weather `#A8D8F0` + **Zaeli Noticed** `#E8F4E8` sage — side by side (WotD slot)
4. Shopping — full width, `#D8CCFF` lavender (white font)
5. Actions — full width, `#F0DC80` gold

**NOTE: WotD has moved to My Space. Its slot is now the Zaeli Noticed notification card.**

### Zaeli Noticed card (replaces WotD in side-by-side slot)
- Background: `#E8F4E8` sage · text: `#6B35D9` violet — same WotD palette
- Collapsed headline: "3 things Zaeli noticed." · live dot animates
- Tap → expands inline (no sheet) with notice rows + action chips
- One card expanded at a time — same behaviour as all other cards
- Notices generated by GPT mini — family-aware, proactive observations

### Headlines (formula-driven, zero AI cost)
- Calendar: "3 things on today." / "All clear today."
- Dinner: "Pasta Carbonara for dinner tonight." / "Nothing planned for dinner."
- Shopping: "23 items on the shopping list." / "Shopping list is clear."
- Actions: "8 things on your plate." / "Nothing on your plate."
- Zaeli Noticed: "3 things Zaeli noticed." / "All quiet today."

### Behaviour
- Tap header → expand · tap again → collapse · one card at a time
- No "Collapse" text · ghost number Calendar only
- Auto-refresh: 5-min interval · optimistic delete
- Date in top bar replaces "Dashboard" label

---

## ══════════════════════════════════
## MY SPACE (NEW — TO BUILD)
## ══════════════════════════════════

**Rich's personal world. Swipe left from Dashboard.**
Same card language as Dashboard — big Poppins headline, coloured card, tap to expand.

### Card order (FIXED)
1. **Health** — `#3A3D4A` slate — "6,842 steps so far today."
2. **Goals** — `#F0DC80` gold — "Three things to work toward."
3. **Word of the Day** — `#E8F4E8` sage — "ephemeral." (locked design ✅)
4. **NASA APOD** — `#3A3D4A` slate — "Saturn's rings, today."
5. **Zen** — `#FAC8A8` peach — "Four meditations ready for you."
6. **Notes** — `#D8CCFF` lavender (white font) — "Three notes on the go."
7. **Wordle** — `#F0DC80` gold — "12-day streak. Keep it going."

### Health card (expanded)
- HealthKit data: steps + progress bar toward daily goal
- Walk/Run distance (km today)
- Active energy burned (calories)
- Last 2 individual workout sessions (type, duration, distance, calories)
- Collapsed: big step count + % of goal. Expanded: all stats + workouts.

### Goals card
- 3-5 personal goals with mini progress bars
- Tap any goal → detail sheet (progress, history, Zaeli coaching, CTA)
- "Build a training plan with Zaeli" → Chat injection with goal context
- + Add goal → text field in sheet, keyboard, KAV

### Word of the Day card (LOCKED ✅ — moved from Dashboard)
- `#E8F4E8` sage · `#6B35D9` violet · italic 28px headline
- Same 400-word curated list, same Dictionary API, same expo-av audio
- Collapsed: word + phonetic. Expanded: definition + example + play button.

### NASA APOD card
- Free API: api.nasa.gov/planetary/apod (free key)
- Collapsed: small image + headline. Expanded: larger image + full NASA description + credit + link.
- Fetched fresh daily

### Zen card
- 4-5 AI-generated meditations per day (GPT mini, fresh each morning)
- expo-av inline playback. Play/pause. Progress bar.
- Expanded: track list with play buttons. Currently playing shows pause + progress.
- Moods: calm · focus · evening · sleep

### Notes card
- Collapsed: "Three notes on the go." + note titles preview
- Tap → 92% sheet slides up over My Space (same sheet system as Chat sheets)
- Sheet: note list, tap to expand to editor, keyboard appears, KAV handles it
- Zaeli reads notes for the brief: "Your reno note hasn't been updated in a week."

### Wordle card
- Daily word seeded by date — same answer as NYT Wordle
- Collapsed: streak headline. Expanded: 5×6 grid + keyboard inline.
- Streak tracking. No external links or accounts required.

### Zaeli brief integration
Zaeli pulls My Space data inside generateBrief() for the landing brief:
- Steps vs daily goal
- Upcoming goal milestones (e.g. "Noosa Run is 4 weeks away")
- Goal progress
- Notes with no recent updates
- WotD (already there)
Smart context loading — only fetch what's relevant per message.

---

## ══════════════════════════════════
## WORD OF THE DAY (MOVED TO MY SPACE ✅)
## ══════════════════════════════════

Card `#E8F4E8` sage · text `#6B35D9` violet · italic 28px Poppins 700
400 curated words in `WOTD_LIST`, seeded by day-of-year
Definition: `dictionaryapi.dev` (free, no key) · Audio: expo-av MP3
Now lives in My Space card stack — removed from Dashboard side-by-side slot.
Dashboard slot replaced by Zaeli Noticed card (same palette).

---

## ══════════════════════════════════
## NAVIGATION STORE (✅)
## ══════════════════════════════════

`lib/navigation-store.ts`
Types: `edit_event` · `add_event` · `shopping` · `actions` · `meals`
Will add: `my_space_goal` for Goal → Chat injection

---

## Per-Channel Colour System (LOCKED)

| Channel / Card | Colour | Text |
|----------------|--------|------|
| Calendar | `#3A3D4A` slate | white |
| Dinner | `#FAC8A8` peach | dark |
| Weather | `#A8D8F0` sky | dark |
| Zaeli Noticed | `#E8F4E8` sage | `#6B35D9` violet |
| Shopping | `#D8CCFF` lavender | white |
| Actions / Todos | `#F0DC80` gold | dark |
| MS: Health | `#3A3D4A` slate | white |
| MS: Goals | `#F0DC80` gold | dark |
| MS: Word of Day | `#E8F4E8` sage | `#6B35D9` violet |
| MS: NASA APOD | `#3A3D4A` slate | white |
| MS: Zen | `#FAC8A8` peach | dark |
| MS: Notes | `#D8CCFF` lavender | white |
| MS: Wordle | `#F0DC80` gold | dark |
| Tutor | `#6B35D9` violet | — |
| Kids Hub | `#0A8A5A` green | — |
| Travel | `#0096C7` cyan | — |
| Our Family | `#D4006A` magenta | — |
| Settings | `#6B7280` grey | — |

Family colours: Rich `#4D8BFF` · Anna `#FF7B6B` · Poppy `#A855F7` · Gab `#22C55E` · Duke `#F59E0B`

---

## Channel Architecture (v5)
```
── THREE SWIPE SCREENS ────────────────────────────────────
app/(tabs)/my-space.tsx    → My Space (Page 0) 🔨 Phase 3
app/(tabs)/dashboard.tsx   → Dashboard (Page 1) ✅ complete
app/(tabs)/index.tsx       → Chat (Page 2) + LandingGate + LandingOverlay ✅
app/swipe-world.tsx        → Container: scroll, dots, FAB, landing 🔨 Phase 3

── 92% SHEETS (open over Chat, never navigated to) ────────
Calendar sheet             → inside index.tsx ✅
Shopping sheet             → inside index.tsx ✅
Meal Planner sheet         → inside index.tsx ✅
Todos sheet                → 🔨 to build
Notes sheet (family)       → 🔨 to build (separate from My Space Notes)
Travel sheet               → 🔨 to build
Notes sheet (personal)     → inside my-space.tsx 🔨

── DEDICATED SCREENS (router.navigate ok) ─────────────────
app/(tabs)/settings.tsx    → Stub ✅
Tutor                      → 🔨 to build/rebuild
Kids Hub                   → 🔨 to build
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
Dashboard stress testing       🔨 IN PROGRESS (Calendar done, 4 cards remain)
Phase 3: swipe-world.tsx       🔨 NEXT — container + swipe + dots
Phase 3b: My Space             🔨 NEXT — after swipe container built
Phase 5: Chat v5 updates       🔨 full-width Zaeli, two entry states
Phase 6: Zaeli Noticed card    🔨 in Dashboard (replaces WotD slot)
Phase 7: Todos + Reminders     🔨
Phase 8: Kids Hub              🔨
Phase 9: Tutor rebuild         🔨
```

---

## Coding Rules
- SafeAreaView edges={['top']} always — but in swipe-world.tsx ONLY, not in individual pages
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
- My Space cards: same Poppins headline pattern as Dashboard (formula-driven, zero AI cost)
- HealthKit: request permissions on My Space first load only
- NASA APOD: fetch once daily, cache result in FileSystem
