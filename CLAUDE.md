# CLAUDE.md — Zaeli Project Context
*Last updated: 10 April 2026 — Session 7 ✅ · All My Space sheets built · Wordle full game · Supabase persistence · HealthKit reminder*

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
Calendar · Shopping · Meal Planner · Family Tasks · Notes & Tasks · Travel

**Dedicated full screens only:**
Tutor · Kids Hub · Our Family · Settings · Our Budget

**More overlay routes:**
- Family channels → 92% sheet over Chat
- Tutor / Kids Hub / Our Family / Settings / Our Budget → router.navigate()

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
Wordmark a+i       = Dashboard:#FAC8A8 peach · Chat:#C4B4FF lavender · MySpace:#A8D8F0 sky · OurBudget:#059669 emerald
ZaeliFAB           = forwardRef, exposes startMic() + openMore()
FAB hides          = activeButton === 'keyboard' OR hideFabBar prop
FAB on chat page   = HIDDEN via activePage !== PAGE_CHAT in swipe-world
Chat bar           = fixed [Mic][TextInput][Send] — NEVER conditional render
Chat send          = onTouchStart on raw <View> — NEVER onPress/onPressIn (blur race)
Chat send button   = clear input BEFORE calling send() — setInput('') then send(text)
Chat bar position  = position:absolute inside flex View inside KAV
Chat bar width     = 100% with paddingHorizontal:14 on barFloat wrapper
Chat bar bg        = solid #FFFFFF (NOT transparent/semi-transparent)
Chat bar border    = rgba(220,220,220,0.6) — subtle grey not white
Chat KAV offset    = keyboardVerticalOffset={-16} on iOS (tighter to keyboard)
Chat paddingBottom = 200 on ScrollView contentContainer (clears bar + arrows)
Chat scroll arrows = UP/DOWN side-by-side, 38px white circles, right:14, bottom:110
Chat mic overlay   = floating pill above bar — exact copy of FAB micPill design
Chat mic           = calls startRecording()/stopRecording() directly (NOT fabRef)
Keyboard dismiss   = Keyboard.dismiss() on mic start
Mic waveform       = 7 bars [10,18,28,36,28,18,10] width:4 coral, Cancel+Send buttons
swipe-world scroll = keyboardShouldPersistTaps="handled" (dismiss on feed tap, keep on buttons)
LANDING_TEST_MODE  = true (in swipe-world.tsx) — set false before launch
Swipe pages        = Dashboard(0) · Chat(1) · My Space(2) — LOCKED
3-dot colours      = peach #FAC8A8(0) · lavender #D8CCFF(1) · sky #A8D8F0(2)
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

## Channel Accent Colours (LOCKED)
```
Home/Chat          = Electric Coral #FF4545
Calendar           = Cobalt Blue #2055F0
Shopping           = Lavender #D8CCFF / deep purple #5020C0
Meals              = Terracotta #E8601A
Tutor              = Deep Violet #6B35D9
Family Tasks       = Zaeli Gold #F0DC80 (renamed from Todos)
Travel             = Ocean Cyan #0096C7 / #A8D8F0
Notes & Tasks      = Peach #FAC8A8 (My Space — personal)
Our Family         = Magenta Pink #D4006A
Our Budget         = Emerald #059669
Settings           = Slate Grey #6B7280
```

---

## Naming Conventions (LOCKED — session 6)
```
"Family Tasks"     = Dashboard card + sheet (NOT Todos, NOT To-Dos)
"Notes & Tasks"    = My Space card + sheet (personal — dual tab)
"Our Budget"       = Full-screen module + Dashboard tile
"Tasks"            = The consistent noun across both contexts
personal_tasks     = Supabase table (member-scoped, NOT family-scoped)
budget_transactions = Supabase table (family-scoped)
budget_categories  = Supabase table (family-scoped)
```

---

## ══════════════════════════════════
## DASHBOARD — LOCKED CARD ORDER (Session 6 ✅)
## ══════════════════════════════════

**Card order (top to bottom):**
1. Calendar — `#3A3D4A` slate · full width
2. Dinner/Meals — `#B8EDD0` mint · full width
3. **2-col bento:** Weather (left) + Our Budget (right, `#ECFDF5` emerald card)
4. Shopping — `#D8CCFF` lavender · full width
5. **2-col bento:** Zaeli Noticed (left, `#E8F4E8` sage) + Family Tasks (right, `#F0DC80` gold)

**Our Budget tile** (new — Dashboard summary only):
- Background `#ECFDF5` · label "Our Budget" in `rgba(5,150,105,0.6)`
- Headline: remaining budget in Poppins 800 `#047857` · sub "left this month"
- Thin progress bar (spend ÷ total budget)
- Tap → `router.navigate('/(tabs)/our-budget')`
- If no budget set up: show "Set up Our Budget →" in muted text

**Family Tasks tile** (renamed from Todos):
- Same gold `#F0DC80` background · label "Family Tasks"
- Count number Poppins 800 `#3A2A00` · sub "on your plate"
- Tap opens existing Todos/Family Tasks sheet (logic unchanged)

---

## ══════════════════════════════════
## MY SPACE — LOCKED CARD ORDER (Session 6 ✅)
## ══════════════════════════════════

**Card order (top to bottom):**
1. Zaeli brief (dark slate `#3A3D4A`) + DM Serif quote — unchanged
2. Word of the Day — sage `#E8F4E8` — inline expand only (unchanged)
3. **Goals — FULL WIDTH** — gold `#F0DC80` (promoted from 2-col grid)
   - Shows goal count + active goal name pills (up to 2) on right side
   - Same sheet, same logic
4. **2-col:** Fitness (slate) + Notes & Tasks (peach `#FAC8A8`)
5. **2-col:** Daily Stretch (sage) + Zen (light blue `#E0F3FC`)
6. Wordle — full width lavender `#D8CCFF`

**Budget card REMOVED** from My Space entirely. Budget lives only in Our Budget module.

**Notes & Tasks card** (renamed from Notes):
- Label: "Notes & Tasks" · Count: `3 · 4` format (notes · open tasks) · Sub: "notes · tasks"
- Colour stays peach `#FAC8A8` · Tap opens modified Notes & Tasks sheet (dual tab)

---

## ══════════════════════════════════
## NOTES & TASKS SHEET (Session 6 — new dual tab)
## ══════════════════════════════════

Sheet title: "Notes & Tasks". Dual tab at top: **Notes | Tasks**.

**Notes tab:** Zero changes from current build. Exact same layout.

**Tasks tab (new):**
- Sections: "Today & overdue" → "Upcoming" → "Done"
- Task row: circular checkbox (22×22) · title · due date pill · optional "from note" tag
- Checkbox: empty = border only · done = `#059669` green fill + white tick ✓
- Tap checkbox → optimistic update → mark is_complete = true in Supabase
- Due date pill colours:
  - Overdue/Today: `#FEE2E2` bg · `#991B1B` text
  - This week: `#FEF3C7` bg · `#92400E` text
  - Next week+: `#D1FAE5` bg · `#047857` text
  - No date: `rgba(10,10,10,0.06)` bg · `rgba(10,10,10,0.4)` text
- "from note" tag: shown when linked_note_id is not null · muted `rgba(10,10,10,0.3)` 9px
- "+ Add a task…" row at bottom · tap opens add-task sub-sheet (350ms delay)

**Add task sub-sheet:** title input (auto-focus) · due date quick picks (Today/Tomorrow/This week/Pick…) · optional note link · Save button peach

**Zaeli nudge (Notes tab):** After loading notes, run local regex scan for action keywords ("call", "book", "order", "email", "check", "pick up", "remind", "schedule", "pay", "send"). If keyword found and no matching task exists → show nudge card. Max one nudge per session. No Claude API call — regex only.

**personal_tasks Supabase table (new):**
```sql
id uuid PK
family_id uuid FK
member_id uuid  -- task owner, member-scoped NOT family-scoped
title text
due_date date nullable  -- bare local date YYYY-MM-DD, NEVER toISOString()
is_complete bool default false
completed_at timestamptz nullable
linked_note_id uuid nullable FK to notes
created_at timestamptz auto
```

**My Space card count query:** Fetch notes.length + personal_tasks count (is_complete = false) for currentMember. Display as `${noteCount} · ${taskCount}`.

---

## ══════════════════════════════════
## OUR BUDGET MODULE (Session 6 — full design complete)
## ══════════════════════════════════

**File:** `app/(tabs)/our-budget.tsx`
**Type:** Full screen (not a sheet) — like Calendar, Shopping
**Colour:** Emerald `#059669` primary · `#047857` dark · `#34D399` mid · `#ECFDF5` card · `#D1FAE5` border
**Logo tint:** 'a' + 'i' in `#059669` on this screen

**Three tabs:** Overview · Categories · Goals

### Overview tab
- Zaeli brief (emerald green card) — cached once per day in `budget_brief_cache` table
- Four upload methods (2×2 grid, Share and Paste as primary/bordered, Photo and File as secondary):
  1. **Share from bank app** — iOS share extension, Zaeli registered as share target
  2. **Paste statement** — `Clipboard.getString()`, step-by-step guide for CommBank/ANZ/Westpac/NAB
  3. **Photo / screenshot** — `expo-image-picker`, multi-page, Claude Vision reads images
  4. **CSV or PDF file** — `expo-document-picker`
- "Last upload · N days ago · Bank name" below grid
- Income card (dark slate): monthly income · Edit income button · budgeted amount · progress bar · spent/remaining/% stats
- 3-bucket status row: On track (green) · Watch out (amber) · Over (red)
- "Needs attention" — top 2 flagged categories only

### Categories tab
- Fixed expenses section (mortgage, phones, insurance etc — recur monthly)
- Variable expenses section (groceries, dining, kids activities etc)
- Progress bars: green on track · amber ≥80% used · red over
- Status text per category
- + Add custom category at bottom

### Goals tab (Savings Goals)
- Goal cards: name · % complete · progress bar · 3-stat row (saved/target/date) · Zaeli projection
- On track: green Zaeli note · At risk: amber warning with specific increase suggestion
- + Add savings goal at bottom

### Income editor sheet
- Combined total (dark slate card at top)
- Per-person income streams (Anna salary / Richard salary / rental etc)
- Each stream: name · type badge · amount · Edit ✎ link · sub-label (pay cycle)
- + Add income stream (freelance / investments / side income)
- What If… mode toggle at bottom (off by default)
- Save button

### What If mode
- Amber banner: "What If mode — exploring only. Nothing is saved." + Exit button
- Sliders for income adjustment per person
- Toggle for removing fixed expenses (e.g. car loan)
- Live results panel: income / unallocated / savings potential / goal dates — all recalculate instantly
- Zaeli summary from local template strings — NO Claude API call
- **Nothing saved while What If is active.** Zero Supabase writes.
- Amber banner always visible — user must never mistake What If for real data

### Setup flow (first time only, 3 steps)
1. **Income entry:** After-tax amount · pay cycle toggle · income earners toggle · privacy note
2. **Template selection:** Australian family (recommended) · Barefoot buckets · 50/30/20 · From scratch
3. **First upload:** Optional bank statement · bank-specific export instructions · privacy note · skip option

### Statement parsing (Claude Sonnet + vision)
- Model: `claude-sonnet-4-20250514` with vision for photo/PDF
- Extracts: date, description, amount (debit only) per transaction
- Maps to family's existing category names only — never invents categories
- Returns JSON: `[{date, description, amount, category, confidence}]`
- Confident items (≥80%) → auto-categorised list
- Uncertain items (<80%) → human review with tap-to-select category
- User confirms → saved to `budget_transactions`
- Privacy: raw statement content never stored — only confirmed totals

### Supabase tables (all new)
```
budget_settings    (family_id, monthly_income, pay_cycle, setup_complete)
income_streams     (id, family_id, member_id nullable, label, type, monthly_amount, is_active)
budget_categories  (id, family_id, name, emoji, type fixed/variable, monthly_limit, is_active, sort_order)
budget_transactions (id, family_id, category_id, amount, description, transaction_date local date, source, created_by, created_at)
savings_goals      (id, family_id, name, emoji, target_amount, current_amount, monthly_contribution, target_date nullable, is_active)
budget_brief_cache (family_id, date, brief_text)
```

### Australian family template seed categories
**Fixed:** Mortgage/Rent · Council rates · Home/Contents/Car/Health/Life insurance · Car registration · Mobile phones · Internet · Netflix · Stan · Disney+ · Spotify · Apple One · iCloud · Amazon Prime · Gym membership · School fees · Childcare · Car loan

**Variable:** Groceries · Dining out · Coffee & snacks · Fuel · Tolls · Kids activities · Kids pocket money · Clothing · Health & medical · Personal care · Entertainment · Holidays & travel · Home maintenance · Gifts · Education · Pet care · Charity · Miscellaneous

All seeded with `monthly_limit = 0` — user sets amounts during setup.

### Build order (recommended)
1. Create all 5 Supabase tables + budget_brief_cache
2. Setup flow (income, template, first upload stub)
3. Categories tab (seed data, manual add transaction, budget edit)
4. Overview tab (income card, status tiles, flagged categories, brief stub)
5. Savings Goals tab (goal cards, add goal, projections)
6. Paste + Photo upload (no native modules — ship these first)
7. Statement review flow (Claude Sonnet parsing, uncertain item UI, confirm)
8. Income editor + What If mode
9. Share extension (native module — last, requires EAS build step)

---

## ══════════════════════════════════
## CHAT FIX — RESOLVED ✅ (session 3, 8 April 2026)
## ══════════════════════════════════

**Commit:** `590fb35` — working chat with fixed input bar

### The problem (sessions 1–3, ~15+ hours)
React Native fires TextInput.onBlur BEFORE sibling TouchableOpacity.onPress. The old input bar was conditionally rendered: `{(fabActive === 'keyboard' || keyboardOpen) && ...}`. Tapping Send blurred the TextInput, which set the condition to false, which UNMOUNTED the bar before onPress could fire.

### What FAILED (do NOT repeat):
- onTouchEnd, onPressIn, Pressable — all still subject to blur ordering
- Delayed onBlur (setTimeout) — caused keyboard flashing loop
- Always-mounted with opacity:0 / height:0 — keyboard glitch from layout change in KAV
- Two bars (overlay + hidden pill) — duplicates, touch confusion
- Content swapping based on kbVisible or inputFocused — blur swaps before press fires
- Keyboard.addListener setState — re-render during keyboard animation = glitch

### What WORKS:
- Fixed bar, always mounted, never conditionally rendered
- `onTouchStart` on raw `<View>` (not TouchableOpacity) — fires before blur
- `setInput('')` BEFORE `send(text)` — bar clears instantly
- No onBlur handler at all
- No Keyboard.addListener that triggers setState

---

## ══════════════════════════════════
## CHAT — FULLY WORKING ✅ (sessions 3+4, 8 April 2026)
## ══════════════════════════════════

**Session 3 commit:** `590fb35` — chat sends, keyboard works, bar floats
**Session 4:** Context flow, full CRUD tools, mic, UI refinements

### Session 3 (send fix):
- `screen` starts as `'chat'` (splash/entry skipped)
- `chatOpacity` starts at `1`
- Mount useEffect: `generateBrief(true); loadCardData();`
- DM Serif hero + card stack + overview toggle REMOVED from chat scroll
- Banner: Poppins_800ExtraBold 36px, warm white `#FAF8F5`
- Old conditional input bar REPLACED with fixed [Mic][TextInput][Send]
- Send uses `onTouchStart` (bypasses blur race condition)
- FAB hidden on chat page in swipe-world

### Session 4 (context flow + tools + UI):
- **Context flow WORKING:** `isActive` prop from swipe-world + useEffect checks `getPendingChatContext()`
- **Dashboard refresh on swipe back:** `isActive` prop on DashboardScreen triggers `loadData()` when becoming active
- **Full CRUD tools (all save to Supabase, dashboard refreshes on swipe back):**
  - Calendar: add / update / delete ✅
  - Todos: add / update / delete ✅ (update supports mark_done)
  - Shopping: add / update / delete ✅
  - Meals: add / update / delete ✅ (add checks for date clashes, warns user)
- **CAPABILITY_RULES expanded:** update vs add distinction, meal vs calendar distinction, day accuracy, no hallucinated confirmations
- **Mic in chat bar:** calls startRecording()/stopRecording() directly (FAB is unmounted on chat page)
- **Mic overlay:** floating pill above bar — exact copy of FAB micPill
- **Mic from Dashboard/MySpace:** FAB onMicResult passes transcript via pendingMicText prop
- **Thinking dots:** appear immediately when mic stops (before Whisper transcription)
- **Chat bar:** solid white #FFFFFF, full width with paddingHorizontal:14
- **Keyboard gap:** keyboardVerticalOffset={-16} on iOS
- **Scroll arrows:** UP/DOWN side-by-side, 38px, right-aligned, above bar
- **Input clearing:** setInput('') called BEFORE send()

---

## ══════════════════════════════════
## SESSION 5 — DESIGN REFRESH (9 April 2026) ✅
## ══════════════════════════════════

**All 3 pages redesigned to match new brand specs.**

### Dashboard changes:
- Logo a+i tinted peach `#FAC8A8`
- Logo 40px · Date header 17px/700
- NEW peach Zaeli brief card above all cards
- Dinner card → mint `#B8EDD0`
- FAB dashboard icon: peach `#FAC8A8` bg when active
- 3-dot page indicator: peach for dashboard

### Chat changes:
- Avatar removed from header
- Header label "Home" → "Chat"
- Logo a+i tinted lavender `#C4B4FF`
- NEW lavender brief card above chat thread
- 3-dot page indicator: lavender for chat

### My Space changes:
- Header now FIXED (doesn't scroll with content)
- NEW dark slate Zaeli brief card with DM Serif italic quote
- NEW 6-card grid (2×3): Fitness(slate) | Goals(gold) | Budget(blue) | Notes(peach) | Stretch(sage) | Zen(light blue)
- Wordle card: full width below grid (lavender)
- NASA APOD card: REMOVED from layout
- All grid cards + Wordle open 92% shell sheets

---

## ══════════════════════════════════
## SESSION 6 — DESIGN SESSION (9 April 2026) ✅
## ══════════════════════════════════

No code written this session — full design/architecture session producing Claude Code handover HTML mockups.

### Decisions locked:
- **Dashboard card order** revised — see DASHBOARD section above
- **"Todos" renamed "Family Tasks"** everywhere on Dashboard
- **My Space Budget card removed** — Budget is its own module
- **Goals promoted to full width** in My Space
- **"Notes" renamed "Notes & Tasks"** — dual tab sheet (Notes unchanged + new Tasks tab)
- **Wordle stays full width** at bottom of My Space
- **Our Budget** = new dedicated full-screen module, emerald green identity
- **What If mode** = sandbox income/expense scenario modelling, nothing saved
- **Upload methods** priority order: Share from bank → Paste → Photo → CSV/PDF
- **Australian family template** seeds ~40 budget categories on first setup

### Handover documents produced:
- `zaeli-restructure.html` — Dashboard before/after · My Space before/after · Notes & Tasks sheet (3 states) + Claude Code modification brief
- `zaeli-budget-final.html` — Our Budget module all 9 screen states (Overview, Categories, Goals, Upload ×4, Setup ×3, Income editor, What If ×2) + full Claude Code technical spec

### Open questions / not yet decided:
- Whether to add Budget detail view to My Space (currently: no — Budget is module only)
- Share extension exact implementation (blocked on EAS build — build last)

---

## Build Phase Plan
```
Phase 1: ZaeliFAB              ✅
Phase 2: Landing overlay       ✅
Phase 4: Dashboard Option A    ✅ all 5 cards
Phase 4b: Chat input bar       ✅
Dashboard stress testing       ✅
Phase 3: swipe-world.tsx       ✅
Phase 3b: My Space             ✅ redesigned — 6-card grid + brief + shell sheets
Phase 6: Zaeli Noticed (AI)    ✅ GPT mini, wttr.in weather
Phase 5: Chat v5 / fix         ✅ RESOLVED sessions 3+4
Phase 5b: Design refresh       ✅ Session 5 — all 3 pages, briefs, new brand colours
Phase 7a: Dashboard restructure ✅ Weather+Budget bento, Noticed+FamilyTasks bento
Phase 7b: My Space reshuffle   ✅ Fitness full-width, Goals small, Budget removed
Phase 7c: Notes & Tasks sheet  ✅ Dual tab, tasks with due dates, Supabase persistence
Phase 8a: Notes sheet           ✅ Full editor, share toggle, send, Supabase
Phase 8b: Goals module          ✅ 6 types, 5-step wizard, logging, milestones, Supabase
Phase 8c: Fitness sheet         ✅ SVG ring, metrics, weekly chart, workouts, goal editor
Phase 8d: Stretch sheet         ✅ Session picker, 6 YouTube videos, movements, mark done
Phase 8e: Zen sheet             ✅ 4 moods, 12 sessions, hero, YouTube links
Phase 8f: Wordle                ✅ Full playable game, 2309 words, Supabase persistence, family leaderboard
Phase 9: Our Budget module     🔨 ← NEXT big build (zaeli-budget-final.html)
Phase 10: Dashboard sheets     🔨 (Family Tasks, Shopping, Calendar, Meals)
Phase 11: Dedicated pages      🔨 (Kids Hub, Tutor, Our Family, Settings)
Phase 12: Travel sheet         🔨
```

---

## ══════════════════════════════════
## EAS BUILD REMINDERS (do when ready for TestFlight)
## ══════════════════════════════════

**HealthKit (Fitness sheet):**
- Needs `expo-health` or `react-native-health` package
- Needs HealthKit entitlement in `app.json` (`NSHealthShareUsageDescription`)
- Needs Apple Developer account with HealthKit capability
- Needs EAS Build → TestFlight install
- Currently using dummy data — swap constants for real HealthKit reads
- Read fresh on each sheet open (never cache fitness data)

**YouTube embedded player (Stretch + Zen sheets):**
- Currently uses `expo-web-browser` (in-app Safari overlay)
- `react-native-youtube-iframe` + `react-native-webview` already in package.json
- Needs EAS Build to compile native WebView module
- Swap `WebBrowser.openBrowserAsync()` for `<YoutubePlayer>` component

**Wordle cross-family challenges:**
- Needs real authentication first (no more DUMMY_FAMILY_ID)
- Challenge link system: `wordle_challenges` table linking two family IDs
- Push notifications for challenges
- Phase C feature — after auth + TestFlight

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
- NEVER pass fabActive/setFabActive as props from swipe-world unless certain input bar is outside ScrollView
- ALWAYS add console.log before attempting any touch/send fix
- useFocusEffect does NOT fire on swipe in swipe-world — use isActive prop + useEffect instead
- Dashboard + Chat both need isActive prop from swipe-world for data refresh
- Chat bar must NOT have onTouchEnd focus handler on barPill
- Mic in chat = startRecording()/stopRecording() directly (FAB is unmounted on chat page)
- FAB mic transcript passes via pendingMicText prop through swipe-world to chat
- swipe-world keyboardShouldPersistTaps = "handled" (NOT "always")
- Tool CAPABILITY_RULES must explicitly say update vs add, meal vs calendar
- Meal add_meal tool checks for date clashes — returns CLASH: warning, never auto-swaps
- All edits go to C:\Users\richa\zaeli (NOT the worktree) — Expo runs from main folder
- personal_tasks table = member-scoped (NOT family-scoped)
- budget_transactions table = family-scoped
- Date rule for budget dates: bare local YYYY-MM-DD, never toISOString()
- What If mode = zero Supabase writes, nothing persisted, amber banner always visible
- Our Budget upload: privacy rule — raw statement content never stored
