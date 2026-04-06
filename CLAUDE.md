# CLAUDE.md — Zaeli Project Context
*Last updated: 6 April 2026 — Dashboard stress testing complete ✅ All 5 cards fully working ✅*

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

**ARCHITECTURE CHANGES — LOCKED:**
- Pulse as a dedicated swipe screen = SCRAPPED
- My Space replaces Pulse (swipe left from Dashboard)
- Pulse notices = Zaeli Noticed card embedded in Dashboard (replaces WotD slot)
- Zen = content card inside My Space, NOT a dedicated screen
- WotD = moved from Dashboard to My Space

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
- **CRITICAL FILE RULE:** Always upload files from `C:\Users\richa\zaeli\app\(tabs)\` — NEVER from Downloads. Downloads are stale and lose all previous session edits.

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
- OpenAI GPT-5.4 mini (`gpt-5.4-mini`) — landing brief, home brief, Zaeli Noticed notices
- OpenAI Whisper-1 — voice transcription
- expo-router, expo-image-picker, react-native-svg, expo-file-system, expo-av
- Poppins font (ALL UI), DMSerifDisplay (wordmark + ghost numbers only)
- No bottom tab bar — ZaeliFAB is the only navigation
- HealthKit — steps, distance, active calories, workout sessions (My Space — Phase 3b)
- NASA APOD API — free, api.nasa.gov/planetary/apod (My Space — Phase 3b)
- Dictionary API — dictionaryapi.dev — free, no key (WotD — My Space)

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
PanResponder and StatusBar must be explicitly imported from 'react-native'
Landing = LandingOverlay in index.tsx — moves to swipe-world.tsx in Phase 3
router.navigate() always — NEVER router.replace() or router.push()
Navigation store: lib/navigation-store.ts — set before navigate, read+clear in useFocusEffect
Dashboard card order = FIXED: Calendar → Dinner → Weather+ZaeliNoticed → Shopping → Actions
WotD moved to My Space — NOT on Dashboard
My Space card order: Health → Goals → WotD → NASA → Zen → Notes → Wordle
LANDING_TEST_MODE = true in index.tsx — must be set false before launch
ZaeliFAB = forwardRef — import ZaeliFABHandle type alongside default import
fabRef = useRef<ZaeliFABHandle>(null) in index.tsx — ref={fabRef} on ZaeliFAB
Delete = always optimistic UI first, Supabase in background
Calendar/Shopping/Meals/Todos/Notes/Travel = 92% SHEETS — never router.navigate()
Tutor/Kids Hub/Our Family/Settings = dedicated screens — router.navigate() ok
Todos: fetch IN ('status',['active','done']) — NEVER eq('status','active') alone
Reminders: fetch IN ('status',['active','acknowledged'])
handleTodoTick = TOGGLE: done→active, active→done. Never one-directional.
My Space cards = same Poppins headline language as Dashboard
SafeAreaView = swipe-world.tsx ONLY, not in individual page files
Card bottom buttons = full-width, borderRadius:14, paddingVertical:14, Poppins_700Bold 15px
Navigation store types wired: edit_event · add_event · shopping · shopping_sheet · actions · meals · noticed
Quick reply chip intercepts: 'Open Meal Planner' · 'Open Shopping List' · 'Open To-dos'
```

---

## ══════════════════════════════════
## DASHBOARD — OPTION A (✅ COMPLETE + FULLY STRESS TESTED)
## ══════════════════════════════════

### Card order (FIXED)
1. Calendar — `#3A3D4A` slate
2. Dinner — `#FAC8A8` peach
3. Weather `#A8D8F0` + Zaeli Noticed `#E8F4E8` — side by side
4. Shopping — `#D8CCFF` lavender (white font)
5. Actions — `#F0DC80` gold

### Calendar card (✅ stress tested)
- Past events: muted 45% opacity, struck through, still tappable
- Upcoming events: full colour
- Headline: forward-looking, counts upcoming only
- "All clear for the afternoon/evening" when all today's events are past
- `showCalTomorrow` only flips after 8pm OR zero events today at all
- Tap row → inline expand: Edit/Reschedule with Zaeli · Delete (two-tap)
- Full-width "View Full Calendar →" at bottom

### Dinner card (✅ stress tested)
- No duplicate header — headline only in expanded state
- Day column 92px — "Tomorrow" never wraps
- Tap day row → inline expand: Edit with Zaeli · Delete · Move · More options
- Empty day → full-width "✦ Plan [day] with Zaeli"
- Full-width "Open Meal Planner →" at bottom
- `onEditMeal` → navigation store `meals` type with meal + dateKey + dayAbbr

### Shopping card (✅ stress tested)
- "Tap to see →" hint: `rgba(255,255,255,0.70)` — bright
- "+N more": 17px Poppins_600SemiBold, `rgba(255,255,255,0.70)`
- "+ Add" always visible in header (not just when expanded)
- Full-width "Open Shopping List →" at bottom
- `onOpenSheet` → navigation store `shopping_sheet` → opens sheet directly

### Actions card (✅ stress tested)
- Todos fetched: `in('status',['active','done'])` — done items persist
- Checkbox = toggle — ticking done item restores to active
- Active todos sorted to top, done items below (muted, struck through)
- Tap row → inline expand: Edit with Zaeli · Delete (two-tap) · More options
- Full-width "Open All To-dos and Reminders →" at bottom
- `onEditTodo` → navigation store `actions` type with todo as event

### Zaeli Noticed card (✅ built — hardcoded notices for now)
- Same `#E8F4E8` / `#6B35D9` palette as WotD
- Collapsed: "ZAELI NOTICED" label (13px) + count headline + tag summary (13px)
- Expanded: notice rows 14px + coloured dot — tap → Chat with notice
- Phase 6: replace hardcoded with GPT mini generated notices

### Navigation store context types (ALL WIRED in index.tsx ✅)
- `edit_event` → calendar inline card + edit prompt
- `add_event` → "What's the event?" prompt
- `shopping` → "What needs to go on the list?" + chips
- `shopping_sheet` → opens shopping sheet directly, no chat message
- `meals` → day-specific dinner prompt (existing meal or empty night)
- `actions` → todo-specific edit OR general add prompt
- `noticed` → surfaces that notice as Zaeli's opening message

### Quick reply chip intercepts (handleQuickReply in index.tsx)
- "Open Meal Planner" → router.navigate mealplanner
- "Open Shopping List" → setShopSheetOpen(true)
- "Open To-dos" → router.navigate todos

---

## ══════════════════════════════════
## MY SPACE (DESIGNED ✅ — Phase 3b to build)
## ══════════════════════════════════

Rich's personal world. See ZAELI-PRODUCT.md for full spec. Mockup: zaeli-myspace-v4.html.

Card order: Health (slate) → Goals (gold) → WotD (sage) → NASA (slate) → Zen (peach) → Notes (lavender) → Wordle (gold)

---

## ══════════════════════════════════
## NAVIGATION STORE (✅)
## ══════════════════════════════════

`lib/navigation-store.ts`
Types: `edit_event` · `add_event` · `shopping` · `shopping_sheet` · `actions` · `meals` · `noticed`
To add: `my_space_goal` for Goal → Chat injection

---

## Build Phase Plan (v5)
```
Phase 1: ZaeliFAB              ✅ COMPLETE
Phase 2: Landing overlay       ✅ COMPLETE
Phase 4: Dashboard Option A    ✅ COMPLETE
Phase 4b: Chat input bar       ✅ COMPLETE
Dashboard stress testing       ✅ COMPLETE — all 5 cards
Phase 3: swipe-world.tsx       🔨 NEXT — horizontal swipe + dots + container
Phase 3b: My Space             🔨 after container
Phase 5: Chat v5               🔨 full-width Zaeli, two entry states
Phase 6: Zaeli Noticed (AI)    🔨 GPT mini notices
Phase 7: Todos sheet           🔨
Phase 8: Kids Hub              🔨
Phase 9: Tutor rebuild         🔨
```

---

## Channel Architecture (v5)
```
── THREE SWIPE SCREENS ────────────────────────────────────
app/(tabs)/my-space.tsx    → My Space (Page 0) 🔨 Phase 3b
app/(tabs)/dashboard.tsx   → Dashboard (Page 1) ✅ complete
app/(tabs)/index.tsx       → Chat (Page 2) ✅
app/swipe-world.tsx        → Container 🔨 Phase 3

── 92% SHEETS ─────────────────────────────────────────────
Calendar sheet             → index.tsx ✅
Shopping sheet             → index.tsx ✅ (partial test)
Meal Planner sheet         → index.tsx ✅
Todos sheet                → 🔨 build
Notes sheet (family)       → 🔨 build
Notes sheet (personal)     → my-space.tsx 🔨
Travel sheet               → 🔨 build

── DEDICATED SCREENS ──────────────────────────────────────
settings.tsx               → Stub ✅
Tutor / Kids Hub / Our Family → 🔨 build

── SUPPORT ────────────────────────────────────────────────
ZaeliFAB.tsx               → ✅ forwardRef, mic
navigation-store.ts        → ✅ all types wired
use-chat-persistence.ts    → ✅
```

---

## Coding Rules
- SafeAreaView edges={['top']} — swipe-world.tsx ONLY
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
- router.navigate() only for dedicated screens
- Todos query: IN ['active','done'] — never eq alone
- Tick handler: always toggle, never one-directional
- Upload files from zaeli folder, not Downloads
