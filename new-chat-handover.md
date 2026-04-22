# Zaeli — New Chat Handover
*22 April 2026 — Session 17 ✅ · Our Budget v2 PURE PLANNER · Settings shipped · Brief polish · Kids Hub keyboard fix · Standard header rule · Old brief code ripped*
*Copy this entire message to start a new chat.*

---

## Hi! Continuing development of Zaeli.

Zaeli is an iOS-first AI family life platform built in React Native / Expo.
Read **CLAUDE.md** before starting — full stack, architecture, colours, ALL specs.
Then **ZAELI-PRODUCT.md** for product vision and full project plan.

Session 17 was a **big build + strategic pivot** session. Highlights: Settings screen shipped (main/notifications/memory with brief-time pickers), Kids Hub keyboard flash finally fixed, calendar keywords tightened, Our Budget built as v1 then pivoted to v2 **Pure Planner** (no live tracking, mint palette, Option D allocation chart), brief system polished with quiet-day persona + loading placeholder, and a major old-brief cleanup (~380 lines removed after a critical shadowing bug was fixed).

---

## ══════════════════════════════════
## CURRENT STATE — ALL WORKING ✅ (Session 17)
## ══════════════════════════════════

### NEW THIS SESSION (Session 17 summary)

**Our Budget v2 — Pure Planner (the big one)**
- Positioned as a budget PLANNER, not a tracker. Without a bank feed, live tracking lies to users the moment data is stale (confirmed with real test — Nov ATM withdrawals imported as "this month").
- Fixed categories hold line items (auto-sum). Variable categories have single target. Savings goals forward-looking, manual.
- AI helper: one-off statement upload (photo or paste) → Zaeli suggests variable averages + detects new categories + detects recurring subscriptions. Accept/Edit/Skip per suggestion. Raw data never stored.
- Mint palette (Meals-aligned). Option D allocation chart (labelled bar + chips). "Surplus" with peach over-state. Target date picker with Flexible toggle.
- Supabase wiring → backend pass.

**Settings screen shipped** — 3 views (main/notifications/memory). DateTimePicker modal for brief times. Persistence in AsyncStorage (`zaeli_settings_prefs_v1`). Our Family → back returns to Settings via module-level nav flag.

**AI Brief polish** — quiet-day persona rewrite, black star on sky-blue eyebrow, peach bubble, 17px text, softer coral primary chip, dismiss chip now hides chips.

**CRITICAL brief bug fixed** — a local `generateBrief` function in index.tsx was shadowing the imported one, so `tryFireBrief` was silently calling the OLD GPT brief. Explained the 10s blank screens, ghost calendar cards, and weird two-message briefs. Fixed + all old brief code ripped (~380 lines).

**Kids Hub keyboard flash** — fixed the classic React anti-pattern: JobsTab/etc declared inside KidsHubScreen but rendered as `<JobsTab />`. Every keystroke re-rendered parent → new function identity → subtree remount → keyboard dismisses. Fixed by calling as function expression `{JobsTab()}`.

**Standard header rule** — all pages now use `Poppins_700Bold · 17px · rgba(10,10,10,0.72)` page label and `Poppins_800ExtraBold · 40px` wordmark.

**Calendar keyword tightening** — was matching bare "next week", "today", day names → hijacked unrelated chat responses. Now only intent-bearing phrases ("what's on", "anything on", "when is", etc.) trigger calendar routing.

**Budget access unblocked** — "Coming soon" alert was in 3 places (MoreSheet, Dashboard onAction, Chat onAction). All now route to `/our-budget`.

### Architecture — 2-page swipe, Chat-first, unified chat bar

```
CHAT (page 0, opens here) ← → DASHBOARD (page 1)
                (no dot indicator — killed Session 15)
```

- App opens on Chat (sky blue wordmark `a+i`). Swipe right for Dashboard (peach).
- My Space is a standalone route (`/(tabs)/my-space`), accessed via MoreSheet.
- **FAB killed everywhere.** Hamburger ☰ top-right of every screen + every 92% sheet.
- **Chat bar** (Tutor-style single pill): only on Chat and Tutor sessions. Dashboard/My Space have NO chat bar.
- **Splash (Deep Slate + Mint + Sky + Lavender):** fires ONCE per session.

### MoreSheet — universal menu (Session 15 restructure)

Opens from hamburger ☰ on every screen AND inside every 92% sheet.

```
NAVIGATE          [Home] [Dashboard]         ← 50/50
FAMILY CHANNELS   [Calendar][Shopping][Meals]
                  [Tasks][Notes][Travel]     ← 3×2
PERSONAL          [My Space] [Our Budget]    ← 50/50
MODULES           [Tutor] [Kids Hub]         ← 50/50
ACCOUNT           [Our Family] [Settings]    ← 50/50 (NEW label Session 15)
```

**Cross-sheet nav:** User in Meals → hamburger → MoreSheet opens on top of Meals → tap Shopping → both close → Shopping opens. X on MoreSheet restores origin sheet.

### Chat bar (Session 15 V2 — unified with Tutor)

Single white pill: `[Mic | sep | TextInput | Camera | Send]`
- minHeight 60, borderRadius 32, paddingVertical 10
- Buttons 44×44, Send coral circle, font 17px
- alignItems: flex-end so mic+send anchor to bottom as input grows
- Camera → opens Add-to-Chat picker (Camera/Photos, NO Live)
- **Same bar on Tutor sessions** — identical specs

### Pages:
- **Chat** — header: zaeli wordmark (sky blue `a+i`) + "Home" label + hamburger ☰. Chat bar at bottom.
- **Dashboard** — header: back arrow + zaeli wordmark (peach `a+i`) + date + "Dashboard" label + hamburger ☰. 5 cards: Calendar / Meal Planner / Weather+Zaeli Noticed (35/65 bento) / Shopping / On the Radar. **Tap anywhere on a card to expand/collapse**.
- **My Space** — header: back arrow + zaeli wordmark (sky blue `a+i`) + "My Space" label + hamburger ☰. 6-card grid + Wordle + all sheets.

### Splash (Option C — Deep Slate + Mint + Sky + Lavender)
- Background: `#1C2330` deep slate
- Wordmark: 96px white, `a+i` in **sky blue `#A8D8F0`** (Session 15 change — was mint)
- Tagline: "**Less Chaos.**" bold mint `#B8EDD0` + "More Family." soft white
- 40px mint divider
- **Lavender orbs** top-right + bottom-left (Shopping tile lavender `#D8CCFF`, 55-65% opacity to be visible on dark bg)
- "TAP TO CONTINUE" uppercase bottom
- Fires once per app session via `_splashShownThisSession` flag

---

## ══════════════════════════════════
## SESSION 15 — WHAT WAS BUILT
## ══════════════════════════════════

### MoreSheet restructure (done)
- NAVIGATE section promoted to TOP (Chat + Dashboard 50/50)
- Our Budget moved into PERSONAL row with My Space (was in Modules)
- Modules reduced to 2-tile row (Tutor + Kids Hub)
- NEW "ACCOUNT" section with Our Family + Settings
- Bigger icons (20→26px) and labels (15→17px) — same card sizes
- X close button: proper SVG, bumped 14→18px

### Hamburger on every 92% sheet (done)
- Added to Calendar, Shopping, Meals, Notes & Tasks sheet headers
- Option A stacked with Modal sequencing:
  - User in Meals → tap hamburger → Meals dismisses → `onDismiss` fires → MoreSheet opens (or 600ms fallback)
  - Tap Shopping tile in MoreSheet → `onAction` fires synchronously, clears `sheetBeforeMoreRef` → `onClose` fires → no restore → Shopping opens via proper `openShopSheet()` (loads data)
  - X on MoreSheet → restores origin sheet (reads ref before clearing)

### Modal stacking bug fixes (critical Session 15 learnings)
1. **iOS Modal can't stack reliably** — if MoreSheet tries to present while another Modal is dismissing, iOS silently fails
2. **onDismiss callback + 600ms fallback** — `<Modal onDismiss={handler}>` gives guaranteed post-dismiss signal
3. **Phantom backdrop tap guard** — user's touch-up falls through onto new MoreSheet's backdrop → instant close. Fix: `canCloseRef` ignores backdrop for 400ms after open.
4. **Sync `onAction` before `onClose`** — was: `onClose()` then `setTimeout(onAction, 180)`. Parent couldn't clear `sheetBeforeMoreRef` in time, so `closeMoreSheet` read stale ref and restored origin over nav target. Fixed: MoreSheet calls `onAction` SYNCHRONOUSLY first, then `onClose`.
5. **Ref instead of state** — `sheetBeforeMoreRef = useRef()` so synchronous updates work.
6. **Use real openers** — `openShopSheet()`, `openCalSheet()`, `openMealSheet()` (not bare setters). Bare setters don't load data → "list is clear" bug.

### Chat bar unification (done, two iterations)
- First tried: 3-piece floating design (mic circle + input pill + send circle)
- User preferred Tutor's single-pill style → **final: single pill, bumped taller**
- Chat and Tutor bars now identical specs
- Icon sizes bumped (Tutor IcoMic 18→24, IcoSend 13→20, attach +18→22)
- All safety rules preserved (ref untouched, Send raw `<View onTouchStart>`, no onBlur, etc.)

### Splash polish (done)
- Wordmark `a+i` changed mint → sky blue `#A8D8F0` (My Space identity)
- Lavender orbs at high opacity (55-65% of `#D8CCFF`) so they're visible on dark slate
- `lineHeight 128 + paddingTop 12` so "i" dot doesn't clip
- `_splashShownThisSession` module-level flag prevents re-trigger when returning from standalone routes

### Dashboard improvements (done)
- All 4 expandable cards now tap-anywhere-to-expand (outer `TouchableOpacity`)
- Weather/Zaeli Noticed bento: 35/65 split (was 50/50) — gives Zaeli Noticed readable space
- Back arrow added to Dashboard header (quick return to Chat)
- Chat bar facade attempted and removed — decided Dashboard/MySpace don't need chat bars

### Other Session 15 wins
- Chat header "Chat" → "Home"
- Chat wordmark `a+i` → sky blue `#A8D8F0`
- 2-dot swipe indicator killed (no chat bar = floated mid-air)
- Legacy "← Dashboard" pill completely removed
- Camera picker sheet: Live option removed (Camera + Photos only)
- Back arrows on Tutor/Kids Hub/Our Family headers
- Hamburger bumped bigger (36→42px container, 18→22px icon, centered lines y=6/12/18)

---

## ══════════════════════════════════
## KEY FILES (Session 15 state)
## ══════════════════════════════════

### Core screens:
- `app/(tabs)/swipe-world.tsx` — 2-page container, splash, no dot indicator
- `app/(tabs)/index.tsx` — Chat (V2 single-pill bar, Home label, cross-sheet hamburger)
- `app/(tabs)/dashboard.tsx` — 5-card redesign with tap-anywhere, 35/65 bento, back arrow, hamburger
- `app/(tabs)/my-space.tsx` — standalone route, Sheet component with onDismiss, cross-sheet hamburger
- `app/(tabs)/tutor.tsx` — back arrow in banner
- `app/(tabs)/tutor-session.tsx` — chat bar matches Chat V2, difficulty bands, prompt caching
- `app/(tabs)/tutor-curriculum.ts` — topic chips reworked Foundation–Year 12
- `app/(tabs)/kids.tsx` — AI trivia, back arrow
- `app/(tabs)/family.tsx` — back arrow

### Components:
- `app/components/MoreSheet.tsx` — 5-section restructure, SYNC onAction before onClose, backdrop tap guard, SVG X button
- `app/components/ChatBarFacade.tsx` — kept but unused (potential future use)
- `app/components/ZaeliFAB.tsx` — kept but not rendered (killed Session 14)

### Infrastructure:
- `lib/api-logger.ts` — prompt caching support
- `lib/navigation-store.ts` — `notes_tasks_sheet` context type

### Config:
- `app.json` — splash bg `#1C2330`, userInterfaceStyle 'light'

### Supabase migrations (already run):
- `supabase-kids-trivia-history.sql`
- `supabase-personal-tasks-sharing.sql`

---

## ══════════════════════════════════
## KEY CONSTANTS
## ══════════════════════════════════

```
Dashboard logo a+i  = #FAC8A8 peach
Chat logo a+i       = #A8D8F0 sky blue (Session 15 — was lavender)
My Space logo a+i   = #A8D8F0 sky blue
Our Budget logo a+i = #059669 emerald
Splash a+i          = #A8D8F0 sky blue (Session 15 — was mint)
Splash tagline bold = #B8EDD0 mint
Splash orbs         = #D8CCFF lavender at 55-65% opacity
Splash bg           = #1C2330 deep slate
Meal card           = #B8EDD0 mint
On the Radar card   = #F0DC80 gold
Notes & Tasks card  = #FAC8A8 peach
All logos           = 40px Poppins_800ExtraBold (96px on splash)
Send button         = #FF4545 coral ALWAYS
Body bg             = #FAF8F5 warm white
SONNET              = claude-sonnet-4-6
CHAT_MODEL          = gpt-5.4-mini
NOTICED_MODEL       = gpt-4o-mini
DUMMY_FAMILY_ID     = 00000000-0000-0000-0000-000000000001
92% sheets          = height: H * 0.92
Date rule           = bare local YYYY-MM-DD, NEVER toISOString()
Hamburger ☰         = 42×42 button, SVG 22px, lines y=6,12,18 (symmetric)

Chat bar V2 specs:
  barPillV2         = borderRadius 32, paddingVertical 10, minHeight 60, alignItems flex-end
  barBtnV2          = 44×44
  barSepV2          = 1×24 divider
  barInputV2        = 17px, lineHeight 22, paddingVertical 10, maxHeight 140
  barSendV2         = 44×44 coral circle
```

---

## ══════════════════════════════════
## NAMING CONVENTIONS
## ══════════════════════════════════

```
Dashboard card       →  "On the Radar"
MoreSheet tile       →  "Tasks"
My Space sheet       →  "Notes & Tasks"
Full-screen module   →  "Our Budget"
Chat header label    →  "Home" (Session 15 — was "Chat")
MoreSheet sections   →  NAVIGATE · FAMILY CHANNELS · PERSONAL · MODULES · ACCOUNT
```

---

## ══════════════════════════════════
## NEXT PRIORITIES (in order)
## ══════════════════════════════════

### Immediate — outstanding Session 15 items
1. **Calendar month-view event glitch** — pre-existing bug. Days highlighted red (events present) but event list below is empty. Unrelated to Session 15 architecture work. Fix when revisiting Calendar.

### Phase 16 — The AI Brief System (BIGGEST remaining piece)

Philosophy B's centrepiece. Locked design from Session 9, updated Session 14 to 4 windows:

- **4 time windows:**
  - Morning 04:00–10:59
  - Lunch 11:00–14:59
  - Afternoon 15:00–19:59
  - Evening 20:00–03:59
- Each brief generated by Sonnet with prompt caching (cheap after first fire)
- Time-relevant rule — system prompt includes current exact time; only mentions upcoming events
- Cached in Supabase `zaeli_briefs` table (family_id + date + time_window unique)
- Firing rules:
  - On app open: check current window, if no brief for this window today → generate, display in Chat feed
  - If brief exists for window → just scroll to it
  - Background-to-foreground within 5 min: do nothing (user returns where they were)
  - Window transitions while app is open: don't auto-fire (next cold launch)
- Copy spec from Session 9 (CLAUDE.md Zaeli Persona section) — winning mantra, active credit, win banner max once per brief, chip rules

### Other pending work:
- Tutor stress testing with real kids (difficulty bands, all 6 pillars)
- Tutor session resume (reload from `tutor_messages`)
- 100 crosswords (content task, parked)
- Settings screen
- Our Budget (pending Basiq pricing)
- EAS Build + TestFlight (for HealthKit, embedded YouTube, real auth)

---

## ══════════════════════════════════
## CRITICAL RULES (learned from battle scars)
## ══════════════════════════════════

### Chat bar sanctity
- Chat bar = ALWAYS [Mic][TextInput][Camera][Send] — NEVER conditional render
- Send button = `<View onTouchStart>` — NEVER onPress/onPressIn/TouchableOpacity
- Clear input BEFORE calling send() — `setInput('') + inputRef.current?.clear()` both
- NO onBlur handler on TextInput
- NO Keyboard.addListener setState (causes render races)
- barPill must NOT have onTouchEnd focus handler
- Chat mic = startRecording()/stopRecording() directly
- swipe-world keyboardShouldPersistTaps = "handled"

### Modal stacking (Session 15 new learnings)
- iOS can't stack Modals reliably — present during dismiss silently fails
- Use `<Modal onDismiss={handler}>` for post-dismiss guaranteed signal
- Add 600ms fallback timeout in case onDismiss doesn't fire
- Add 400ms backdrop tap guard on newly-opened Modal (phantom taps from prior touch)
- If MoreSheet's `onAction` is set, it must fire SYNCHRONOUSLY BEFORE `onClose` (parent clears refs before close reads them)
- Use `useRef` not `useState` for values onAction must clear before onClose reads
- Always use real openers `openShopSheet()/openCalSheet()/openMealSheet()` — NOT bare setters

### Other rules
- useFocusEffect does NOT fire on swipe in swipe-world — use isActive prop + useEffect
- All edits to `C:\Users\richa\zaeli` (NOT worktree)
- personal_tasks = member-scoped (is_shared + member_name added Session 14)
- zaeli_briefs = family-scoped (one per family per time window per day)
- CHAT_MODEL = gpt-5.4-mini · NOTICED_MODEL = gpt-4o-mini · NEVER swap
- Brief model = SONNET always
- Camera icon opens Add-to-Chat picker (NOT camera-only) — Camera + Photos (Live removed)
- contextTrigger counter for reliable sheet opening
- Receipt scan = single Sonnet call, local cross-check
- Receipt tick-off = only if item.created_at < receipt_date
- HEIC → JPEG via expo-image-manipulator
- Currency = A$ always
- Pantry limit = 500
- recipes table = prep_mins (NOT cook_time), notes (ingredients+method as text)
- meal_plans = cooks stored in source field as JSON
- kids_trivia_history = NEW Session 14
- Tutor sessions: expo-router reuses component — reset ALL state on [childId, pillar]
- Tutor message keys: use incrementing counter (nextMsgId())
- Unicode escapes in JSX text must be wrapped in {'·'} expressions
- fixZaeliSpelling() needed in both index.tsx AND tutor-session.tsx
- Prompt caching requires `anthropic-beta: prompt-caching-2024-07-31` header (auto-added by api-logger)
- MoreSheet onAction pattern — parent handles in-swipe-world nav
- `_splashShownThisSession` module-level flag prevents splash re-trigger
- MoreSheet contexts must NOT set `returnTo: 'dashboard'` (was triggering legacy pill)

### New rules Session 17
- **Our Budget = PURE PLANNER.** Never live tracking. No "spent this month" surfaces. No transaction ledger. Uploads are ephemeral suggestion fuel — only accepted amounts persist.
- **Our Budget accent = mint** (Meals palette): `#2D7A52` / `#B8EDD0` / `#E6F7EF` / `#C8F0DA`. Savings = sky `#A8D8F0`. Over = peach `#FAC8A8` + `#8A3A00` brown. Never red/alarm.
- **Our Budget tab label = "Savings"** (not Goals). Individual items still called "goals".
- **Standard page label**: `Poppins_700Bold · 17px · rgba(10,10,10,0.72)`. Standard wordmark: `Poppins_800ExtraBold · 40px · letterSpacing -1.5 · lineHeight 46`. Applied across Chat / Dashboard / My Space / Tutor / Kids / Family / Settings / Our Budget.
- **Brief system** — ONLY one `generateBrief` (imported from `lib/brief-generator`). NEVER declare a local function by that name in index.tsx — would shadow silently.
- **tryFireBrief** pushes a loading placeholder bubble IMMEDIATELY on fire decision, updates in place on Sonnet return. Never blank screen during generation.
- **Dismiss brief chip** now sets `msg.briefDismissed = true`, chip row hides, text stays in thread.
- **Component-as-JSX anti-pattern** — NEVER declare sub-components inside a parent function and render as `<X />`. Either hoist out or call as function `{X()}`. Killed keyboards in Kids Hub.
- **Calendar keywords** — intent-bearing phrases only. Bare time refs (today, next week, Monday) do NOT trigger. Narrative mentions must pass through normal chat.
- **Settings back-to-settings from Family** — use module-level flag `setFamilyFromSettings()` / `consumeFamilyFrom()` in `lib/navigation-store.ts`. Router params flaky across tab routes.
- **Settings prefs** — AsyncStorage under `zaeli_settings_prefs_v1` (pre-backend pass).
- **DateTimePicker** (from `@react-native-community/datetimepicker`) used for both time (Settings brief times, quiet hours) and date (Our Budget goal target date). iOS = spinner in modal; Android = native dialog.
- **Fixed category budget** = `SUM(line_items.monthlyAmount)` auto-calculated. Variable budget = `monthlyTarget` field. Never mix.
- **Option D allocation chart** — stacked bar with % labels inside segments + 3 tinted chips below. When over-budget, bar scales to fit 100%, 3rd chip shows `−$X` in peach.

---

**Read CLAUDE.md fully before starting any code work.**
**Design HTMLs (in repo root)**: `zaeli-splash-options.html`, `zaeli-more-sheet-options.html`, `zaeli-chatbar-options.html`, `zaeli-fab-options.html`, `zaeli-dashboard-redesign.html`, `zaeli-settings-mockup.html`, `zaeli-budget-v2-mockup.html`, `zaeli-budget-v2-theming.html`.
**Brief system spec**: `zaeli-brief-examples (1).html` in Downloads.

### Open for next session
- **Backend pass** — batched: Supabase migrations for budget + settings, push notification scheduling, auth, Stripe, Memory wiring, CSV document picker install, share extension
- Travel sheet (Phase 19)
- Tutor session resume (Phase 20)
- 100 crosswords (parked content task)
