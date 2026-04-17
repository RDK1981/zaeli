# Zaeli — New Chat Handover
*17 April 2026 — Session 14 ✅ · Major architectural rebuild · Chat-first 2-page · FAB killed · Hamburger + MoreSheet · Splash Option C · Kids Hub AI trivia · Tutor difficulty bands · Prompt caching*
*Copy this entire message to start a new chat.*

---

## Hi! Continuing development of Zaeli.

Zaeli is an iOS-first AI family life platform built in React Native / Expo.
Read **CLAUDE.md** before starting — full stack, architecture, colours, ALL specs.
Then **ZAELI-PRODUCT.md** for product vision and full project plan.

**Session 14 was a MAJOR rebuild.** The navigation architecture, chrome, splash screen, and Kids Hub/Tutor internals all changed significantly. Details below.

---

## ══════════════════════════════════
## CURRENT STATE — ALL WORKING ✅ (Session 14)
## ══════════════════════════════════

### Architecture — 2-page swipe, Chat-first, no FAB

```
CHAT (page 0, opens here) ← → DASHBOARD (page 1)
```

- App **opens on Chat** (lavender wordmark identity). Swipe right for Dashboard (peach).
- **My Space moved to standalone route** (`/(tabs)/my-space`), accessed via MoreSheet (has back arrow).
- **FAB entirely killed** — `ZaeliFAB.tsx` component exists but isn't rendered anywhere.
- **Universal hamburger ☰** top-right of every header opens `<MoreSheet />` (app/components/MoreSheet.tsx).
- **2-dot indicator** — lavender `#A890FF` (Chat) + peach `#FAC8A8` (Dashboard).
- **Splash** — Deep Slate `#1C2330` with mint `#B8EDD0` accents. Fires ONCE per app session (module-level `_splashShownThisSession` flag).

### MoreSheet (universal menu)

Opens from hamburger ☰ on every screen. 92% bottom sheet with Option 1 refined tiles:
- **Family Channels** (6 tiles): Calendar · Shopping · Meals · Tasks · Notes · Travel
- **Personal**: My Space (full-width tile)
- **Modules** (2x2): Tutor · Kids Hub · Our Family · Our Budget (Alert "coming soon")
- **Navigation** (3): Chat · Dashboard · Settings

**Parent passes onAction callback** to handle nav from inside swipe-world (scrollToPage for Chat/Dashboard). My Space (standalone) uses default router.navigate.

### Pages:
- **Chat** — header: [zaeli wordmark] + "Home" label + hamburger ☰. Chat bar at bottom: [Mic][Input+placeholder][Camera][Send]. Camera opens Add-to-Chat picker (Camera/Photos/Live).
- **Dashboard** — header: [back arrow + zaeli wordmark] + [date + "Dashboard" label + hamburger ☰]. 5 clean cards: Calendar · Meal Planner · Weather+Zaeli Noticed (bento) · Shopping · On the Radar.
- **My Space** — header: [back arrow + zaeli wordmark] + ["My Space" label + hamburger ☰]. 6-card grid + Wordle. All sheets working with Supabase persistence.

### Back arrows added Session 14 to:
Tutor · Kids Hub · Our Family · My Space · Dashboard (next to zaeli wordmark, matches My Space pattern)

---

## ══════════════════════════════════
## SESSION 14 — WHAT WAS BUILT
## ══════════════════════════════════

### Kids Hub AI Trivia (done)
- GPT-5.4 mini generates 10 fresh questions per session based on child's age tier
- Prompt includes last 200 asked questions to avoid repeats
- Stored in new `kids_trivia_history` Supabase table (see `supabase-kids-trivia-history.sql`)
- Static arrays kept as offline fallback (shuffled)
- Cost: ~A$0.001 per game session
- **100-puzzle crossword expansion PARKED** — content task, pickup anytime

### Tutor difficulty band system (done)
- **Topic chips reworked** for ALL year levels (Foundation–Year 12) across ALL 4 subjects (Maths/English/Science/HASS)
- **Principle:** Core-first (what kids are actually doing), not Extension-first (what advanced kids might do)
- Example: Year 4 Maths now `Times tables · Multiplication · Division · Zaeli picks` (was `Long multiplication · Decimals · Fractions`)
- **Difficulty band wired:**
  - Loads prior band from `tutor_progress` on subject selection (new default = Foundation, not Core)
  - React state tracks `consecutiveCorrect` (no hints), `consecutiveWrong`
  - Injected into Sonnet system prompt each turn
  - 3 correct in a row (no hints) → UPGRADE (foundation→core→extension)
  - 3 wrong in a row → DOWNGRADE
  - Band persists to `tutor_sessions.difficulty_band` AND `tutor_progress.difficulty_band` on exit
- **Prompt caching**: Anthropic's `anthropic-beta: prompt-caching-2024-07-31` header auto-added via api-logger when system prompt array contains `cache_control`. Static system prompt cached, dynamic state NOT cached. ~30-40% cost saving.
- **Conversation summarisation**: After 8 exchanges, older turns compressed to 1-line summaries. Keeps input tokens ~1,500 (was growing to 3,000+ by turn 14).
- **Hint thinking indicator**: `handleHint` now calls `setSending(true)` immediately (was silent 3-4s delay). Added matching `setSending(false)` at end of `generateAIResponse`.
- **Floating mic pill**: Tutor now uses the same waveform pill overlay as chat (Cancel/Send buttons).

### Dashboard redesign (done — Session 9 spec built)
- 5 clean rows: Calendar (dark slate) · Meal Planner (mint) · Weather+Zaeli Noticed (bento, Zaeli Noticed promoted from bottom) · Shopping (lavender) · On the Radar (gold)
- **On the Radar** — new card. Queries `personal_tasks` for Rich or shared, due in 7 days. Two sections (Today & overdue / Coming up). Inline + Add task, View full list → My Space Tasks tab.
- **Supabase migration**: `supabase-personal-tasks-sharing.sql` adds `is_shared` + `member_name` columns.
- **Our Budget** — removed from Dashboard, now in MoreSheet as "Coming soon" (Alert).
- **Header** matches My Space exactly: wordmark + date + "Dashboard" label + hamburger. Also has back arrow left of wordmark (tap = return to Chat).
- Card specs bumped to match My Space (padding 22, radius 22, label 13px, headline 24px).

### Architectural rebuild (done)
- **Swipe-world rebuilt** to 2-page (Chat=0, Dashboard=1). My Space extracted to standalone route.
- **FAB killed** across all screens (swipe-world, chat, dashboard, legacy landing). Component file kept for potential future use.
- **Hamburger ☰ button** (42×42) added top-right of Chat, Dashboard, My Space headers. Opens MoreSheet.
- **Chat heading label changed** from "Chat" → "Home".
- **Chat bar camera** now opens Add-to-Chat picker sheet (Camera/Photos/Live) — was camera-only.
- **Legacy "← Dashboard" pill** bug fixed — removed `returnTo: 'dashboard'` from MoreSheet contexts (was triggering on every MORE nav).
- **MORE Calendar/Shopping/Meals** now correctly open their sheets when pressed from Chat (was setting context but not triggering).
- **MORE Tasks/Notes** navigate to My Space with Notes & Tasks sheet auto-open on the correct tab.

### Splash Option C — Deep Slate + Mint (done)
- Background `#1C2330` (deep slate)
- 96px wordmark white, "a" and "i" in mint `#B8EDD0`
- Tagline: "**Less Chaos.** More Family." (bold mint + soft white)
- 40px mint divider below
- "TAP TO CONTINUE" uppercase at bottom
- Mint glow ring (520×520 radial, 12% opacity) behind wordmark
- **Fires once per session** via module-level flag (was firing on every swipe-world mount)
- `app.json` native splash backgroundColor set to `#1C2330` for seamless transition — **REQUIRES `npx expo prebuild --clean` + dev-client rebuild** to take effect

### Design mockup HTMLs produced Session 14 (in repo root):
- `zaeli-fab-options.html` — 4 FAB options (killed in favour of hamburger)
- `zaeli-chatbar-options.html` — 3 chat bar layouts (hamburger top-right chosen)
- `zaeli-more-sheet-options.html` — 4 MoreSheet designs (Option 1 chosen)
- `zaeli-splash-options.html` — 3 splash designs (Option C chosen)

---

## ══════════════════════════════════
## KEY FILES (Session 14 state)
## ══════════════════════════════════

### Core screens:
- `app/(tabs)/swipe-world.tsx` — 2-page container, Chat-first, splash, 2-dot indicator
- `app/(tabs)/index.tsx` — Chat (exports SwipeWorld default + HomeScreen named)
- `app/(tabs)/dashboard.tsx` — Dashboard redesign with 5 rows, OnTheRadarCard, DashChatBar removed
- `app/(tabs)/my-space.tsx` — standalone route with back button, hamburger, MoreSheet
- `app/(tabs)/tutor.tsx` — back arrow added to banner
- `app/(tabs)/tutor-session.tsx` — difficulty bands, prompt caching, conv summarisation, floating mic pill
- `app/(tabs)/tutor-curriculum.ts` — all topic chips reworked Foundation–Year 12
- `app/(tabs)/kids.tsx` — AI trivia, crossword selection, back arrow
- `app/(tabs)/family.tsx` — back arrow

### New components:
- `app/components/MoreSheet.tsx` — universal menu sheet
- `app/components/ChatBarFacade.tsx` — kept but currently unused (for future)

### Infrastructure:
- `lib/api-logger.ts` — prompt caching support, cache metric logging
- `lib/navigation-store.ts` — added `notes_tasks_sheet` context type with `tab` field

### Config:
- `app.json` — splash backgroundColor `#1C2330`, userInterfaceStyle 'light'

### Supabase migrations (run in SQL Editor):
- `supabase-kids-trivia-history.sql` — kids_trivia_history table
- `supabase-personal-tasks-sharing.sql` — personal_tasks ADD is_shared + member_name

---

## ══════════════════════════════════
## KEY CONSTANTS
## ══════════════════════════════════

```
Dashboard logo a+i  = #FAC8A8 peach
Chat logo a+i       = #C4B4FF lavender (Chat is home, primary identity)
My Space logo a+i   = #A8D8F0 sky blue
Our Budget logo a+i = #059669 emerald
Splash bg           = #1C2330 (Deep Slate — Option C)
Splash accent       = #B8EDD0 (mint)
Meal card           = #B8EDD0 mint
On the Radar card   = #F0DC80 gold (renamed from Family Tasks on Dashboard)
Notes & Tasks card  = #FAC8A8 peach (My Space personal)
2-dot colours       = lavender #A890FF(0=Chat) · peach #FAC8A8(1=Dashboard)
All logos           = 40px Poppins_800ExtraBold
Send button         = #FF4545 coral ALWAYS
Body bg             = #FAF8F5 warm white
SONNET              = claude-sonnet-4-6
CHAT_MODEL          = gpt-5.4-mini
NOTICED_MODEL       = gpt-4o-mini  (Zaeli Noticed only)
DUMMY_FAMILY_ID     = 00000000-0000-0000-0000-000000000001
92% sheets          = height: H * 0.92 (NEVER maxHeight)
Date rule           = bare local YYYY-MM-DD, NEVER toISOString()
Hamburger ☰         = 42×42 button, SVG 22px, lines y=6,12,18 (symmetric), strokeWidth 2.2
```

---

## ══════════════════════════════════
## NAMING CONVENTIONS
## ══════════════════════════════════

```
Dashboard card       →  "On the Radar"    (Session 9 rename)
MoreSheet tile       →  "Tasks"            (Session 14 — more natural label)
My Space card/sheet  →  "Notes & Tasks"
Full-screen module   →  "Our Budget"
Chat header label    →  "Home"             (Session 14 — was "Chat")
Supabase (personal)  →  personal_tasks     (now has is_shared + member_name cols)
Supabase (briefs)    →  zaeli_briefs       (not yet built)
Supabase (recipes)   →  recipes
Supabase (meals)     →  meal_plans
Supabase (tutor)     →  tutor_sessions · tutor_messages · tutor_progress · tutor_subject_summaries
Supabase (kids)      →  kids_jobs · kids_rewards · kids_points_log · kids_pending_approvals · kids_trivia_history (NEW Session 14)
```

---

## ══════════════════════════════════
## NEXT PRIORITIES (in order)
## ══════════════════════════════════

**Immediate — outstanding Session 14 feedback:**
1. **Dev-client rebuild** — `npx expo prebuild --clean && npx expo run:ios` to pick up app.json splash changes. Until then the native splash will still flash the old colour before landing overlay shows.
2. **Test MoreSheet navigation thoroughly** on device — especially Tasks/Notes → My Space, Dashboard from standalone routes (goes via swipe-world `pendingChatContext`).
3. **Splash final polish** — user mentioned the "i" dot might cut off on some devices, worth checking viewports.

**Phase 4 — The AI Brief System (BIGGEST remaining piece)**

This is Philosophy B's centrepiece. Locked design from Session 9, 4 time windows updated Session 14:

- **4 time windows:**
  - Morning 04:00–10:59
  - Lunch 11:00–14:59
  - Afternoon 15:00–19:59
  - Evening 20:00–03:59
- **Each brief** generated by Sonnet with prompt caching (cheap after first fire)
- **Time-relevant rule** — system prompt includes current exact time; only mentions upcoming events (never recaps 9am if fired at 10:45am)
- **Cached in Supabase** `zaeli_briefs` table (family_id + date + time_window unique)
- **Firing rules:**
  - On app open: check current window, if no brief for this window today → generate, display in Chat feed
  - If brief exists for window → just scroll to it
  - Background-to-foreground within 5 min: do nothing (user returns to where they were)
  - Window transitions while app is open: don't auto-fire (next cold launch)
- **Copy spec** from Session 9 (CLAUDE.md Zaeli Persona section) — winning mantra, active credit, win banner max once per brief, chip rules.

**Other pending work:**
- Tutor stress testing with real kids (difficulty bands, all 6 pillars)
- Tutor session resume (reload conversation from `tutor_messages`)
- 100 crossword pool (content task)
- Settings screen
- Our Budget (pending Basiq pricing)
- EAS Build + TestFlight (for HealthKit, embedded YouTube, real auth)

---

## ══════════════════════════════════
## CRITICAL RULES (learned from battle scars)
## ══════════════════════════════════

- Chat bar = ALWAYS [Mic][TextInput][Camera][Send] — NEVER conditional render
- Send button = `<View onTouchStart>` — NEVER onPress/onPressIn/TouchableOpacity
- Clear input BEFORE calling send() — `setInput('') + inputRef.current?.clear()` (both, as backup)
- NO onBlur handler on TextInput
- NO Keyboard.addListener setState (causes race conditions that killed 10+ hours once)
- useFocusEffect does NOT fire on swipe in swipe-world — use isActive prop + useEffect instead
- barPill must NOT have onTouchEnd focus handler
- Chat mic = startRecording()/stopRecording() directly (FAB unmounted on chat page)
- swipe-world keyboardShouldPersistTaps = "handled" (NOT "always")
- All edits to C:\Users\richa\zaeli (NOT worktree) — Expo reads from main
- personal_tasks = member-scoped (NOT family-scoped)
- zaeli_briefs = family-scoped (one per family per time window per day)
- What If mode = zero Supabase writes, amber banner always visible
- Budget raw statement data = never stored (privacy)
- CHAT_MODEL = gpt-5.4-mini · NOTICED_MODEL = gpt-4o-mini · NEVER swap these
- Brief model = SONNET always — never downgrade briefs to mini
- Camera icon = inside right of TextInput wrapper, opens Add-to-Chat picker (NOT camera-only)
- KAV doesn't work in Modals on iOS — use Keyboard listener + shopKbHeight marginBottom instead
- contextTrigger counter for reliable sheet opening (not just isActive transitions)
- Receipt scan = single Sonnet call, structured JSON, local cross-check (not general send() pipeline)
- Receipt tick-off = only if item.created_at < receipt_date (protects re-added items)
- HEIC → JPEG via expo-image-manipulator before any API call
- Currency = A$ always (system prompt CURRENCY rule)
- Pantry limit = 500 (not 100)
- recipes table = prep_mins (NOT cook_time), notes (stores ingredients+method as text), tags (array)
- meal_plans table = NO cook_ids or is_favourite columns. Cooks stored in source field as JSON.
- kids_jobs table = family_id, child_name, title, points, source, linked_date, is_complete
- kids_trivia_history table = family_id, child_name, question, correct_answer, was_correct, tier
- Meal sheet entry = meals_sheet context type (same pattern as shopping_sheet/calendar_sheet)
- Tutor sessions: expo-router reuses component — must reset ALL state when params change (useEffect on [childId, pillar])
- Tutor message keys: use incrementing counter (nextMsgId()) not Date.now() — prevents duplicate key errors
- Unicode escapes (\u00B7 etc) in JSX text must be wrapped in {'·'} expressions — raw escapes show as text
- Whisper spelling: fixZaeliSpelling() catches xaeli/zeli/zayli etc — add to both index.tsx AND tutor-session.tsx
- tutor_sessions table has legacy `mode` column (NOT NULL) — must include `mode: pillar` in inserts
- Session 14: Prompt caching requires `anthropic-beta: prompt-caching-2024-07-31` header (auto-added by api-logger when cache_control present)
- Session 14: MoreSheet onAction callback pattern — parent handles in-swipe-world nav; fallback default does router.navigate for standalone routes
- Session 14: `_splashShownThisSession` module-level flag prevents splash re-trigger when returning to swipe-world from standalone routes
- Session 14: MoreSheet contexts must NOT set `returnTo: 'dashboard'` — would trigger legacy "← Dashboard" pill in Chat

---

**Read CLAUDE.md fully before starting any code work.**
**For design HTMLs: `zaeli-splash-options.html` (C chosen), `zaeli-more-sheet-options.html` (1 chosen), `zaeli-chatbar-options.html` (C chosen), `zaeli-fab-options.html` (all killed).**
**For brief system build: read `zaeli-brief-examples (1).html` first (in Downloads).**
**For budget build (when ready): read `zaeli-budget-final.html` first.**
