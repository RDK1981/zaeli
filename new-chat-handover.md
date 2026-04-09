# Zaeli — New Chat Handover
*10 April 2026 — Session 7 ✅ · All My Space sheets built · Wordle full game · Supabase wired*
*Copy this entire message to start a new chat.*

---

## Hi! Continuing development of Zaeli.

Zaeli is an iOS-first AI family life platform built in React Native / Expo.
Read **CLAUDE.md** before starting — full stack, architecture, colours, ALL specs.
Then **ZAELI-PRODUCT.md** for product vision and full project plan.

---

## ══════════════════════════════════
## CURRENT STATE — ALL WORKING ✅
## ══════════════════════════════════

### Pages:
- **Dashboard** — peach-branded. Cards + peach Zaeli brief (GPT mini). Logo a+i peach `#FAC8A8`. Dinner card mint `#B8EDD0`. FAB icon peach when active.
- **Chat** — lavender-branded. Fixed [Mic][TextInput][Send] bar. Lavender brief card. Logo a+i lavender `#C4B4FF`. Full CRUD tools. Context flow from dashboard. Mic with waveform.
- **My Space** — sky-branded. Fixed header. WotD inline expand. Fitness full-width. 4-card grid (Goals, Notes & Tasks, Stretch, Zen) + Wordle. ALL sheets fully built with real content + Supabase persistence.

### Infrastructure:
- Context flow: isActive prop from swipe-world + useEffect checks getPendingChatContext()
- Dashboard refresh: isActive triggers loadData() on swipe back
- Full CRUD tools: calendar, todos, shopping, meals (add/update/delete)
- Meal clash detection: warns before swapping
- Mic: direct startRecording/stopRecording in chat + FAB mic pipeline via pendingMicText
- 3-dot indicators: peach(0) · lavender(1) · sky(2)

---

## ══════════════════════════════════
## SESSION 7 — ALL MY SPACE SHEETS BUILT ✅
## ══════════════════════════════════

### What was built:
- Notes sheet (full editor, share toggle, send, Supabase)
- Tasks tab (dual-tab, due dates, checkboxes, Supabase)
- Goals module (6 types, 5-step wizard, logging, milestones, Supabase)
- Fitness sheet (SVG ring, metrics, weekly chart, workouts, goal editor)
- Stretch sheet (Adriene + MadFit videos, movements, mark done)
- Zen sheet (4 moods, 12 sessions, time-of-day hero)
- Wordle (full playable game, 2309 words, family leaderboard, Supabase)
- Dashboard polish (text sizes, Budget peach, Noticed "changes")

### Supabase tables created this session:
- `personal_notes` — notes with share toggle
- `goals` — full goal data with JSONB milestones + logs
- `personal_tasks` — tasks with due dates
- `wordle_results` — game state + streak + leaderboard

### EAS Build reminders (parked for Phase B):
- HealthKit: needs expo-health + Apple entitlements — currently dummy data in Fitness
- YouTube embed: needs react-native-webview compiled — currently uses in-app Safari
- Wordle challenges: needs real auth — currently family-only

### Decisions locked this session:

**Dashboard restructure:**
- New card order: Calendar → Dinner → Weather+Our Budget (2-col) → Shopping → Zaeli Noticed+Family Tasks (2-col)
- "Todos" renamed **"Family Tasks"** everywhere — card, sheet, strings
- New Our Budget tile (emerald `#ECFDF5`) sits beside Weather in bento row

**My Space reshuffle:**
- Budget card **removed** entirely from My Space (Budget = its own module)
- Goals **promoted to full width** below WotD (shows goal name pills)
- Card order: Brief → WotD → Goals (full width) → Fitness+Notes&Tasks → Stretch+Zen → Wordle (full width)
- "Notes" renamed **"Notes & Tasks"** — count shows `3 · 4` (notes · open tasks)

**Notes & Tasks sheet (dual tab):**
- Notes tab: zero changes from current build
- Tasks tab: new — personal tasks, sections (Today/Upcoming/Done), due date pills, "from note" tags
- Zaeli nudge: scans note bodies locally (regex) for action keywords, suggests tasks
- New Supabase table: `personal_tasks` (member-scoped, not family-scoped)

**Our Budget module (full design):**
- New full-screen module, emerald green identity
- Three tabs: Overview · Categories · Savings Goals
- Four upload methods: Share from bank app → Paste → Photo → CSV/PDF
- Claude Sonnet (vision) parses statements, review flow for uncertain transactions
- Income editor: multiple streams per person (salary, rental, freelance)
- What If mode: sandbox scenario modelling, amber banner, zero Supabase writes
- First-time setup: 3-step flow (income → template → first upload)
- Australian family template seeds ~40 categories inc school fees, childcare, HECS
- 5 new Supabase tables: budget_settings, income_streams, budget_categories, budget_transactions, savings_goals

### Handover files (in repo root — give to Claude Code):
- **`zaeli-restructure.html`** — Dashboard before/after · My Space before/after · Notes & Tasks sheet · Full Claude Code modification brief
- **`zaeli-budget-final.html`** — Our Budget module 9 screen states (Overview, Categories, Goals, Upload ×4, Setup ×3, Income editor, What If ×2) + full Claude Code technical spec + Supabase schema + build order

---

## ══════════════════════════════════
## NEXT PRIORITIES (in order)
## ══════════════════════════════════

1. 🔨 **Our Budget module** — dedicated screen, 5 Supabase tables, setup flow, categories, overview, goals, upload, What If (zaeli-budget-final.html)
2. 🔨 **Dashboard sheets** — Family Tasks, Shopping, Calendar, Meals (92% sheets over Chat)
3. 🔨 **Dedicated pages** — Kids Hub, Tutor, Our Family, Settings
4. 🔨 **EAS Build** — HealthKit, embedded YouTube, real auth, TestFlight

---

## Key files:
- `app/(tabs)/index.tsx` — Chat (exports SwipeWorld default + HomeScreen named)
- `app/(tabs)/swipe-world.tsx` — Container (FAB, dots, landing, isActive props, pendingMicText)
- `app/(tabs)/dashboard.tsx` — Dashboard (cards + brief, isActive refresh)
- `app/(tabs)/my-space.tsx` — My Space (brief + WotD + 6-grid + Wordle + shell sheets)
- `app/components/ZaeliFAB.tsx` — FAB with mic waveform, peach dashboard active
- `lib/navigation-store.ts` — Context passing between dashboard↔chat

---

## Key constants
```
Dashboard logo a+i  = #FAC8A8 peach
Chat logo a+i       = #C4B4FF lavender
My Space logo a+i   = #A8D8F0 sky blue
Our Budget logo a+i = #059669 emerald (new)
Dinner card         = #B8EDD0 mint
Family Tasks card   = #F0DC80 gold (renamed from Todos)
Notes & Tasks card  = #FAC8A8 peach (My Space personal)
Our Budget tile     = #ECFDF5 emerald card (Dashboard summary)
Our Budget module   = #059669 emerald primary (full screen)
FAB dash active     = #FAC8A8 bg, #8A3A00 icon
3-dot colours       = peach(0) · lavender(1) · sky(2)
All logos           = 40px Poppins_800ExtraBold
All page labels     = 18px Poppins_700Bold
Brief text          = Poppins 17px on all 3 pages
Send button         = #FF4545 coral ALWAYS
Body bg             = #FAF8F5 warm white
GPT_MINI            = gpt-4o-mini
SONNET              = claude-sonnet-4-20250514
DUMMY_FAMILY_ID     = 00000000-0000-0000-0000-000000000001
92% sheets          = height: H * 0.92 (NEVER maxHeight)
Date rule           = bare local YYYY-MM-DD, NEVER toISOString()
```

---

## Naming conventions (LOCKED session 6)
```
Dashboard card/sheet  →  "Family Tasks"   (NOT Todos)
My Space card/sheet   →  "Notes & Tasks"  (NOT Notes)
Full-screen module    →  "Our Budget"     (NOT Budget)
Supabase (personal)   →  personal_tasks   (member-scoped)
Supabase (family)     →  budget_transactions, budget_categories (family-scoped)
```

---

## CRITICAL RULES (learned from 15+ hours debugging)
- Chat bar = ALWAYS [Mic][TextInput][Send] — NEVER conditional render
- Send button = `<View onTouchStart>` — NEVER onPress/onPressIn/TouchableOpacity
- Clear input BEFORE calling send()
- NO onBlur handler on TextInput
- NO Keyboard.addListener setState
- useFocusEffect does NOT fire on swipe in swipe-world — use isActive prop + useEffect
- Chat mic = startRecording()/stopRecording() directly (FAB unmounted on chat page)
- swipe-world keyboardShouldPersistTaps = "handled" (NOT "always")
- barPill must NOT have onTouchEnd focus handler
- All edits to C:\Users\richa\zaeli (NOT worktree) — Expo reads from main
- personal_tasks = member-scoped (NOT family-scoped)
- What If mode = zero Supabase writes, amber banner always visible
- Budget raw statement data = never stored (privacy)

---

**Read CLAUDE.md fully before starting any code work.**
**For restructure work: read zaeli-restructure.html first.**
**For Budget build: read zaeli-budget-final.html first.**
