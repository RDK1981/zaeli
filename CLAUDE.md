# CLAUDE.md — Zaeli Project Context
*Last updated: 17 April 2026 — Session 14 ✅ · Major architecture rebuild · Dashboard redesign · 2-page swipe · FAB killed · Hamburger + MoreSheet · Chat-first home · Option C splash · Kids Hub AI trivia · Tutor difficulty bands · Prompt caching*

---

## ══════════════════════════════════
## SCREEN ARCHITECTURE — CRITICAL (REBUILT Session 14 ✅)
## ══════════════════════════════════

**Two-page swipe world — Chat-first:**
```
Chat (0) ← OPENS HERE          Dashboard (1)
           ← swipe right →
```
App opens on Chat (page 0). Swipe right for Dashboard. **My Space moved to standalone route** (`/(tabs)/my-space`) accessed via MoreSheet.

**PHILOSOPHY B — LOCKED (Session 9, reinforced Session 14):**
Zaeli is an AI companion that also manages family life — NOT a family dashboard with AI bolted on. Chat is the product's beating heart. Dashboard is a reference layer. Everything flows from Zaeli's relationship with the family.

**92% SHEETS (opened via MoreSheet or in-app triggers):**
Calendar · Shopping · Meal Planner · Notes & Tasks · Travel (not built)

**Dedicated full screens (via MoreSheet or direct routes):**
My Space · Tutor · Kids Hub · Our Family · Settings · Our Budget (coming soon)

**FAB — KILLED entirely (Session 14):**
Replaced by hamburger ☰ button top-right of each screen's header. Opens the universal MoreSheet (92% bottom sheet).

**Chat bar — ONLY on Chat screen:**
Dashboard and My Space do NOT have chat bars. Each screen has a clear purpose. Chat = conversation, Dashboard = glance, My Space = personal zone. Chat bar lives in index.tsx only.

**LOCKED architecture decisions:**
- Pulse as swipe screen = SCRAPPED (pre-Session 9)
- My Space = standalone route, not a swipe page (Session 14)
- Zen = card inside My Space, NOT a screen
- WotD = My Space only, NOT on Dashboard
- swipe-world.tsx = 2-page container (Chat + Dashboard + 2-dot indicator + landing splash)
- index.tsx = re-exports SwipeWorld as default (expo-router entry point) + HomeScreen is Chat
- Landing splash (Option C Deep Slate + Mint) = in swipe-world.tsx, shows ONCE per app session via module-level flag `_splashShownThisSession`
- Hamburger ☰ universally accessed via `<MoreSheet />` component (app/components/MoreSheet.tsx)
- Back arrows on standalone routes (Tutor, Kids Hub, Family, My Space) next to zaeli wordmark
- Navigation architecture review = LOCKED, no longer deferred

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
- Core differentiator: Zaeli is an AI-first product. Not a better calendar app. A family companion.
- Word of mouth is the primary growth mechanism — Zaeli must consistently earn it.

---

## ══════════════════════════════════
## ZAELI PERSONA — FULL SPEC (LOCKED Session 9 ✅)
## ══════════════════════════════════

### Core character
Sharp, warm, genuinely enthusiastic about this family. Finds the funny angle through delight, not detachment. Energy matches the moment — get-up-and-go in the morning, calm and settled at night. Makes the user feel capable, in control, and like they're winning at family life.

### The winning mantra (CRITICAL)
Zaeli's job is to make Rich feel like he's on top of it — not overwhelmed by it. Every interaction should leave him feeling more in control than before he opened the app. This is not forced positivity. It's genuine acknowledgement of what's working, what's handled, what's ahead.

**How to apply it:**
- Notice and acknowledge progress — "Shopping's sorted, calendar's updated, you're ahead of this week"
- Take active credit for what Zaeli has done — "I've already moved Gab's soccer to Sunday"
- Reframe problems as solvable — "The plumber's the only thing hanging — five minutes and it's off your plate"
- On genuinely good days, say so — "That's a lot for a Thursday. Solid."
- Never manufacture positivity when it isn't earned — Zaeli is warm, not sycophantic

### Hard rules
- NEVER "mate"
- Never starts with "I"
- Plain text only — no markdown, no asterisks, no bullet points in conversational responses
- Always ends on a confident offer or a warm close
- Never lectures, never passive-aggressive, never counts down failures
- Matches the user's energy — jokes back when they joke, calm when they're stressed

### Banned words/phrases
"queued up", "locked in", "tidy", "sorted", "chaos", "sprint", "breathing room", "quick wins", "you've got this", "make it count", "absolutely", "certainly", "of course", "no problem"

### Active credit rule
Zaeli uses first person for actions SHE took. "I've updated Gab's soccer" not "Gab's soccer has been updated." She is an active participant, not a reporter.

### Tone by time of day
- **Morning:** Energising, forward-looking, sets up the day confidently
- **Midday:** Shorter, warmer check-in, acknowledges morning progress before new items
- **Evening:** Calm, reflective, wraps the day with genuine acknowledgement, looks to tomorrow

---

## ══════════════════════════════════
## AI BRIEF SYSTEM — FULL SPEC (Session 9 ✅)
## ══════════════════════════════════

### Overview
Three proactive briefs per day per family — morning, midday, evening. Generated by Claude Sonnet. Cached family-wide (not per member). Displayed as the opening message in Chat when Zaeli fires a brief.

### Brief firing logic
Brief fires on app open IF:
- The time window has changed since last brief (morning → midday → evening)
- AND there has been a natural break — app was closed, OR last message was >15 minutes ago

Brief is HELD if:
- User is actively mid-conversation (last message <15 minutes ago)
- Held brief fires on next app open or after 15-minute inactivity threshold

When a held brief fires mid-existing thread, it appears below a subtle time divider so Rich knows it's proactive, not a response.

### Time windows
- **Morning:** 05:00–11:59 · first open of the day
- **Midday:** 12:00–16:59 · first open after 12pm
- **Evening:** 17:00–23:59 · first open after 5pm

### Data inputs for each brief
- Calendar events (today + tomorrow)
- Tonight's meal + who's cooking
- Shopping list status + any flagged items
- Open family tasks + overdue tasks
- Weather (wttr.in)
- Zaeli Noticed changes since last brief
- Actions taken since last brief (don't re-surface resolved items)

### Brief format rules
- **Morning:** Max 120 words. Open with a positive framing if warranted. Cover today + overnight changes + tomorrow if relevant.
- **Midday:** Max 80 words. Always acknowledge morning progress before new items. Focus on afternoon + dinner.
- **Evening:** Max 90 words. NEVER open with a task. Open with genuine day acknowledgement. Look to tomorrow. Chips minimal — max 2.
- **Win banner:** Mint left-border highlight inside the brief bubble. Used MAX once per brief. Only when there is a genuine encouraging moment. Never forced.
- **Never repeat** information from a previous brief in the same day if already resolved.
- **Never invent** data not in the context.
- **If nothing notable:** one honest line, no padding — "Quiet one today — nothing urgent on the radar."

### Chips after brief
- Max 4 chips
- Only offer actions Zaeli can actually perform
- Primary chip (coral) = single most time-sensitive action
- Always include one dismissal chip ("Got it", "All good", "Night ✓")

### Brief caching
- Generated brief text saved to Supabase `zaeli_briefs` table with timestamp + time_window
- All family members read same cached brief (family-scoped, not member-scoped)
- Brief regenerates when: time window changes OR significant family data changes (new calendar event, meal change)
- Prompt caching (Anthropic API) used on input tokens — system prompt + family context cached, ~90% input cost reduction

---

## ══════════════════════════════════
## MODEL ROUTING — LOCKED (Session 9 ✅)
## ══════════════════════════════════

### Models in use
```
SONNET   = 'claude-sonnet-4-6'    — $3.00/$15.00 per M tokens
MINI     = 'gpt-5.4-mini'               — $0.75/$4.50 per M tokens  ← UPDATE from gpt-4o-mini
GPT_MINI = 'gpt-4o-mini'               — keep for Zaeli Noticed only (already working)
WHISPER  = 'whisper-1'                  — voice transcription (unchanged)
```

**Note:** GPT-4o-mini remains ONLY for Zaeli Noticed dashboard generation where it is already working. All new chat routing uses GPT-5.4 mini.

### Routing rules
**Use Sonnet for:**
- All three daily briefs (morning/midday/evening)
- Vision calls (receipt scan, recipe photo upload, camera uploads)
- Complex multi-tool requests (multiple CRUD actions in one message)
- Any response where Zaeli's personality is front and centre
- Calendar tool-calling (existing — unchanged)

**Use GPT-5.4 mini for:**
- General chat responses
- Simple CRUD — add item, update record, delete event
- Quick lookups and confirmations
- Any response where Zaeli is confirming an action rather than leading a conversation

**Why not Haiku:** GPT-5.4 mini benchmarks significantly higher than Claude Haiku 4.5 on reasoning and general knowledge, and produces noticeably better conversational quality. At $0.75/M input it sits between Haiku and Sonnet in cost but much closer to Sonnet in quality.

### Cost modelling (per family/month)
- Assume 1,500 calls/month (stress test — engaged family)
- 20% Sonnet (300 calls) + 80% GPT-5.4 mini (1,200 calls)
- ~1,500 input tokens + ~200 output tokens per call average
- Without caching: ~$4.68/family/month
- With prompt caching (90% discount on input): ~$2.67/family/month
- As % of $14.99 revenue: ~18% — acceptable
- Average family (750 calls/month with caching): ~$1.35/family/month — very comfortable

### Mini warmth rules (CRITICAL for Zaeli voice consistency)
GPT-5.4 mini must sound like Zaeli, not like a generic assistant. Apply these rules in the system prompt for mini:

1. **Never just confirm.** "Done" is cold. "Added — you're all set for tonight" is warm.
2. **Match the user's energy.** If Rich jokes, mini plays along briefly. If he's stressed, mini is calm.
3. **After a casual reply** ("haha", "cheers", "nice one") — mini closes with one warm line and stops. Never ignores a casual reply. Never over-responds.
4. **Occasional acknowledgement of effort** — "That's a lot for a Thursday" / "You've earned a quiet evening." Max one per conversation thread. Only when genuinely warranted.
5. **Never manufactured warmth** — mini warmth is earned by context, not sprayed on every message.

---

## Stack
- React Native + Expo (iOS-first), iPhone 11 Pro Max dev device
- Supabase (Sydney ap-southeast-2, ID: rsvbzakyyrftezthlhtd)
- Claude Sonnet (`claude-sonnet-4-6`) — briefs, tool-calling, vision
- OpenAI `gpt-5.4-mini` — general chat responses (NEW — replaces gpt-4o-mini for chat)
- OpenAI `gpt-4o-mini` — Zaeli Noticed notices only (keep as-is, already working)
- OpenAI Whisper-1 — voice transcription
- expo-router, expo-image-picker, expo-document-picker, react-native-svg, expo-file-system, expo-av
- Poppins (ALL UI text) · DMSerifDisplay (ghost numbers ONLY)
- Weather: wttr.in API (replaced Open-Meteo which was timing out)
- HealthKit · NASA APOD API · Dictionary API (My Space — future phases)

---

## Key Constants (NEVER get these wrong)
```
DUMMY_FAMILY_ID    = '00000000-0000-0000-0000-000000000001'
SONNET             = 'claude-sonnet-4-6'
CHAT_MODEL         = 'gpt-5.4-mini'                          ← NEW
NOTICED_MODEL      = 'gpt-4o-mini'                           ← Zaeli Noticed only
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
ZaeliFAB           = KILLED Session 14 — component file exists but not rendered anywhere
Hamburger ☰        = Session 14 replacement — 42px square button top-right of every header (Chat, Dashboard, My Space, Tutor, Kids Hub, Family). Opens MoreSheet.
Hamburger SVG      = 22px icon, lines at y=6,12,18 (symmetric around y=12). strokeWidth 2.2
MoreSheet          = app/components/MoreSheet.tsx — 92% bottom sheet, Option 1 tiles, no upload section
MoreSheet sections = Family Channels (6 tiles) · Personal (My Space full-width) · Modules (2x2) · Navigation (Chat · Dashboard · Settings)
MoreSheet onAction = parent passes callback from Chat/Dashboard to route in-swipe-world nav; My Space uses default
Chat bar           = fixed [Mic][TextInput][Camera][Send] — NEVER conditional render. Only on Chat page (not Dashboard or My Space)
Chat bar camera    = SVG icon between TextInput and Send, coral #FF4545 stroke, opens Add to Chat sheet (Camera/Photos/Live)
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
_splashShownThisSession = module-level flag (Session 14) — splash only fires ONCE per app session, not on every swipe-world re-mount
Splash design      = Option C (Deep Slate + Mint). bg #1C2330, wordmark 96px white with mint #B8EDD0 "a+i", "Less Chaos." bold mint + "More Family." soft white, 40px mint divider, "TAP TO CONTINUE" uppercase bottom
Native splash      = app.json backgroundColor #1C2330 (matches landing so transition is seamless). REQUIRES dev-client rebuild (npx expo prebuild --clean) to pick up
Swipe pages        = Chat(0) · Dashboard(1) — LOCKED Session 14 (My Space moved to standalone route)
2-dot colours      = lavender #A890FF(0=Chat) · peach #FAC8A8(1=Dashboard)
✦ active colour    = #C4B4FF lavender (Chat identity — app's home)
Delete             = optimistic UI first, Supabase background
Todos fetch        = IN ['active','done'] — NEVER eq('status','active')
Tick handler       = TOGGLE only — done↔active, never one-directional
Modal stacking     = close → setTimeout 350ms → open
Card buttons       = full-width, borderRadius:14, paddingVertical:14, Poppins_700Bold 15px
Nav store types    = edit_event · add_event · shopping · shopping_sheet · actions · meals · noticed · notes_tasks_sheet (NEW Session 14 — with tab:'notes'|'tasks' field)
Nav returnTo       = ONLY set when coming from Dashboard card. MoreSheet items must NOT set returnTo (was causing "← Dashboard" pill to appear on every MORE-triggered nav)
Chat header label  = 'Home' (Session 14 — was 'Chat')
Dashboard header   = wordmark + back arrow (to Chat) on left · date + "Dashboard" label + hamburger on right (Session 14)
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
Meals              = Mint #B8EDD0 / deep green #2D7A52   ← updated from Terracotta
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
Dashboard card/sheet  →  "Family Tasks"   (NOT Todos)
My Space card/sheet   →  "Notes & Tasks"  (NOT Notes)
Full-screen module    →  "Our Budget"     (NOT Budget)
Dashboard radar card  →  "On the Radar"   (NOT Family Tasks — see session 9)
Supabase (personal)   →  personal_tasks   (member-scoped)
Supabase (family)     →  budget_transactions, budget_categories (family-scoped)
Supabase (briefs)     →  zaeli_briefs     (family-scoped, new session 9)
```

---

## ══════════════════════════════════
## DASHBOARD — REDESIGNED (Session 9 ✅)
## ══════════════════════════════════

**New card order — LOCKED:**
1. **Calendar** — dark slate `#2D3748` · full width · collapsed shows headline · expands to today's events with family colour dots · + Add button always visible
2. **Meal Planner** — mint `#B8EDD0` · full width · collapsed shows tonight's dinner · expands to full week view · renamed from "Dinner"
3. **Weather + Zaeli Noticed** — bento row · Weather left `#E8F4FD` · Zaeli Noticed right `#F0EDE8` · both read-only · Zaeli Noticed PROMOTED from bottom row
4. **Shopping** — lavender `#D8CCFF` · full width · unchanged
5. **On the Radar** — gold `#F0DC80` · full width · RENAMED from "Family Tasks" · see spec below

**Removed from Dashboard:**
- Our Budget tile (moved to More sheet as "Coming soon" placeholder)
- Zaeli brief card (was on Dashboard previously — brief now lives in Chat)

**Our Budget in More sheet:**
- Navigation row in ZaeliFAB More sheet alongside Our Family, Tutor, Settings
- Shows "Coming soon — bank feed integration" placeholder screen
- Emerald identity preserved for when it's built properly

### On the Radar card spec
- **Collapsed:** "X things coming up." + "Your tasks + shared · next 7 days"
- **Expanded sections:** Today & overdue (coral dot) · Coming up (gold dot)
- **Data:** `personal_tasks` WHERE member_name = 'Rich' OR is_shared = true AND due within 7 days AND status = 'active'. Order: overdue first, then by due_date ASC.
- **View only** — no tick boxes. Ticking lives in My Space Notes & Tasks sheet only.
- **Two action buttons on expand:**
  - "+ Add task" (dark) — inline quick-add input, saves to personal_tasks, no navigation away
  - "View full list →" (gold tint) — router.navigate to My Space, opens Notes & Tasks sheet to Tasks tab

---

## ══════════════════════════════════
## CAMERA & UPLOAD — SPEC (Session 9 ✅)
## ══════════════════════════════════

### Chat bar camera icon
- SVG camera icon inside RIGHT side of the text input field
- Input becomes a row: TextInput (flex 1) + camera icon (right)
- No layout shift to the bar — mic stays left, send stays right
- Tapping icon opens 92% action sheet with THREE options:
  1. **Take a photo** — `ImagePicker.launchCameraAsync()` from expo-image-picker
  2. **Choose from library** — `ImagePicker.launchImageLibraryAsync()`
  3. **Upload a file** — `DocumentPicker` from expo-document-picker (PDF, doc, images)
- After selection: image/file goes into chat as attachment → sent to Sonnet vision
- Permissions: request on first use only (not on app launch)

### FAB More sheet — upload section
- Top section of More sheet: 3-column grid — Take photo · Choose photo · Upload file
- Same three options as chat bar
- After selection: navigate to Chat (router.navigate) with image pre-loaded as pending attachment
- Below divider: existing navigation rows (Our Family, Tutor, Our Budget, Settings)

### Sonnet vision system prompt addition
"The user has shared an image or file. Analyse it and respond helpfully. If it looks like a document, fixture, invitation, receipt, or list — identify what it is and offer relevant actions (add to calendar, add to shopping list, save note etc). Be specific and practical."

### Image display in chat
Thumbnail above user message text. width:180, height:120, borderRadius:12, right-aligned.

### Files to edit
- `app/(tabs)/index.tsx` — add camera icon to chat bar input wrapper
- `app/components/ZaeliFAB.tsx` — add upload grid to More sheet top section

---

## ══════════════════════════════════
## MEAL PLANNER SHEET — SPEC (Session 9 ✅)
## ══════════════════════════════════

Reference file: `zaeli-meals-mockup.html` (in repo root)

### Three tabs
1. **Meals** — 7 day planner
2. **Recipes** — recipe library
3. **Favourites** — hearted recipes

### Meals tab
- 7 day cards, one per day, mint `#B8EDD0` accent throughout
- Today card: mint border `#2D7A52`, mint background tint, "Tonight" badge
- Each day shows: meal name · family avatar(s) cooking · heart to favourite · Swap or + Add
- **Swap picker** (inline, below day card):
  - Two tabs: ❤️ Favourites · 📅 Move night
  - Favourites tab: shows hearted recipes as quick pick options + free-type field
  - Move night tab: shows all 7 days as destination buttons — empty nights highlighted in mint
- **Who's cooking** — tap avatar row or + to open picker. Family circles, tap to select. Same colour system as Calendar (Rich #4D8BFF · Anna #FF7B6B · Poppy #A855F7 · Gab #22C55E · Duke #F59E0B)
- **Heart on day card** — saves meal to Favourites directly from Meals tab

### Recipes tab
- "+ Add Recipe" (primary, mint deep) and "Upload Recipe" (secondary, mint light) buttons at top
- Search bar below
- 2-column recipe grid: emoji thumb · name · cook time · heart toggle
- Tap card → Recipe detail sheet

### Recipe detail
- Back button + heart toggle in header
- Emoji hero banner (mint background)
- Meta pills: cook time · serves · difficulty
- Two action buttons: "+ Meal plan" (pick day) · "🛒 Shopping list" (with pantry cross-check)
- Ingredients list: each shows pantry status (In pantry ✓ in mint · Need to buy in coral)
- Numbered method steps (mint circle numbers)

### Add recipe — manual
- Name · cook time · ingredients (one per line, Zaeli auto-splits) · method (free text, Zaeli numbers steps)

### Upload recipe — photo
- Two options: camera or library
- Sonnet vision reads recipe book page → pre-fills form for review before saving
- Same expo-image-picker as camera/upload feature

### Send to shopping list — pantry cross-check
- Shows all ingredients with pantry status
- Tap any "In pantry ✓" badge to override → flips to "Adding →" (in case pantry data stale)
- Confirm button count updates dynamically
- Only adds items not already in pantry/recently bought

### Supabase tables needed
- `recipes` — family-scoped, stores recipe data (name, cook_time, serves, ingredients JSONB, method JSONB, is_favourite bool)
- `meal_plan` — family-scoped, date + meal_name + cooks JSONB (array of member names)

---

## ══════════════════════════════════
## SESSIONS 7+8 — PREVIOUSLY LOCKED ✅
## ══════════════════════════════════

### Session 7 — all My Space sheets built:
- Notes sheet (full editor, share toggle, send, Supabase)
- Tasks tab (dual-tab, due dates, checkboxes, Supabase)
- Goals module (6 types, 5-step wizard, logging, milestones, Supabase)
- Fitness sheet (SVG ring, metrics, weekly chart, workouts, goal editor, Android splash)
- Stretch sheet (Adriene + MadFit videos, movements, mark done)
- Zen sheet (4 moods, 12 sessions, time-of-day hero, YouTube WebView)
- Wordle (full playable game, coral/gold/slate tiles, lavender design, family leaderboard, Supabase)

### Session 8 — Calendar/Shopping fix + polish:
- Calendar sheet: collapsible cards, manual add stays in sheet, end time auto-fill
- Shopping sheet: crash fix, data loading fix, text sizes
- Navigation unified: all router.navigate removed, everything uses sheets/context
- FAB More: Calendar + Shopping open sheets directly
- Whisper spelling correction, meal/calendar clash awareness, Wordle expanded

---

## ══════════════════════════════════
## SESSION 9 — DESIGN SESSION (13 April 2026) ✅
## ══════════════════════════════════

No code written — full design + strategy session.

### Decisions locked:
- **Philosophy B** — Zaeli is AI-first. Chat is home. Dashboard is reference layer.
- **Dashboard redesigned** — 5 clean rows, Our Budget removed, Zaeli Noticed promoted, Family Tasks → "On the Radar"
- **Meal Planner sheet** — full design with 3 tabs, swap/move, who's cooking, recipe upload, pantry cross-check
- **Camera/Upload** — chat bar icon + FAB More sheet, Sonnet vision
- **Model routing** — Sonnet for briefs/vision/complex, GPT-5.4 mini for general chat
- **AI Brief system** — 3 per day, family-scoped, firing logic, caching, format rules
- **Zaeli persona** — winning mantra, active credit, mini warmth rules all locked
- **Our Budget** — deferred to Phase 2. Upload-only approach acceptable for v1 but not compelling enough for Dashboard. Basiq enquiry sent.
- **Nav architecture** — leave as-is until real usage data. Review in Phase 2.

### Handover files produced this session:
- `zaeli-dashboard-redesign.html` — 5-card redesign with expanded states + build spec
- `zaeli-meals-mockup.html` — full meal planner 10 screens + build notes
- `zaeli-camera-upload.html` — chat bar + FAB More sheet mockups + build spec
- `zaeli-brief-examples.html` — 3 brief examples (morning/midday/evening) + prompt engineering spec
- `zaeli-fitness-sheet.html` — updated with goal editor + Android splash
- `zaeli-wordle.html` — rebuilt lavender design, coral/gold/slate tiles
- `zaeli-zen-sheet.html` — YouTube embed spec + 12 session library
- `zaeli-stretch-sheet.html` — YouTube embeds, instructor picker, mark done

---

## ══════════════════════════════════
## SESSION 10 — SHOPPING SHEET COMPLETE (13 April 2026) ✅
## ══════════════════════════════════

Full build session — Shopping sheet polished to production quality across all 3 tabs.

### Navigation fix:
- **contextTrigger** added to swipe-world → fixes race condition where `handleScroll` clobbered `activePage` during programmatic scroll
- Dashboard `onOpenSheet` + FAB `onMoreItem` both bump `contextTrigger` counter
- ChatScreen watches `contextTrigger` in dedicated useEffect — reliable sheet opening regardless of `isActive` timing
- **← Dashboard pill** fixed — was using `router.navigate()` (broken), now uses `onNavigateDashboard()` which calls `scrollToPage()` properly

### List tab:
- Trash bin icons removed from item rows — cleaner design
- Tap item → expand panel with Edit + Delete buttons
- Delete → red border card + "Tap bin again to delete" confirm row (matches screenshot pattern)
- **Tick/undo flow**: tap checkbox → green fill + strikethrough + "Undo" link, 5-second timer, then item disappears to Recently Bought. No flash on commit.
- **Structured add form**: collapsed "Add an item..." bar expands to Item name + Qty fields + "Add to list" coral button + Done. Green "✓ Added [name]" confirmation flash.
- **Duplicate checking**: manual add checks `shopSheetItems` locally, shows amber "⚠ already on the list" warning
- **Keyboard handling**: `shopKbHeight` state from Keyboard listener (KAV doesn't work in Modals), applied as `marginBottom` on add bar
- Recently Bought items: card-style layout, muted grey text (`rgba(0,0,0,0.38)`), tap to expand Edit/Delete, same red confirm pattern
- Share button in header — formats list as text, opens iOS share sheet

### Pantry tab:
- Same structured add form as List tab (Add to pantry + Zaeli button)
- Tap-to-expand on pantry items → Edit + Delete buttons
- Inline edit form (name field + Save/Cancel)
- Delete with red border confirm pattern
- "+ List" button adds to shopping list, "On list ✓" tappable to remove from list (toggle)
- Duplicate checking on add
- Scan/Upload buttons: "📷 Scan/Upload Receipt" + "🥦 Scan/Upload Pantry" → source picker overlay (Take photo / Choose from library)
- Pantry item limit increased from 100 → 500

### Spend tab:
- Monthly total font changed from DM Serif → Poppins_800ExtraBold
- All currency symbols changed to A$ (never £ or US$)
- Scan/Upload receipt button added
- Receipt cards: expand to see items, "Delete receipt" with confirm
- Deleting a receipt recalculates spend totals immediately
- Spend totals now calculated on sheet open AND after scan

### Receipt scan pipeline (dedicated — single Sonnet call):
- Image resized to 1200px wide JPEG via `expo-image-manipulator` (fixes HEIC from iOS camera)
- HEIC → JPEG conversion in both scan pipeline and general `send()` flow
- Single Sonnet call with receipt-specific prompt → structured JSON response
- Extracts: store, purchase date, items (name/qty/price), total
- **Pantry cross-check**: existing items → update `last_bought`, new items → add to pantry
- **Shopping list tick-off**: only ticks items where `created_at < receipt_date` (items added after receipt = left on list)
- Receipt saved to `receipts` table for Spend tab
- Post-scan refresh: pantry + spend data + shopping list all refresh
- Cost: ~A$0.02-0.04 per scan (single call vs old triple-call A$0.05)
- Receipt date extraction prompt insists on reading actual printed date, not defaulting to today

### Pantry scan pipeline (dedicated — single Sonnet call):
- Same image resize/HEIC conversion
- Extracts visible items → add/update pantry with today's date
- Summary: "Found X items. Y refreshed, Z new."

### AI shopping improvements:
- `add_shopping_item` tool now checks for duplicates (existing list + pantry stock level)
- Returns DUPLICATE: or PANTRY: warnings that AI relays naturally
- Shopping context detection: checks for "Back to Full List"/"Add more items" chips on last Zaeli message (not just inline cards)
- SHOPPING RULES in system prompt: one tool call per item, never write chips as markdown text
- CURRENCY rule added: "Always Australian dollars (A$). Never £, US$, or bare $."
- Inline shopping card removed after add actions — just text confirmation + chips
- Chip text stripping: AI's markdown chip text cleaned from response, proper chips injected
- Mic from shopping sheet routes through AI (not regex parsing) for smart multi-item parsing

### Scroll arrows:
- All 3 tabs have chat-style arrows: 38px white circles, side by side, shadow + border

### Key patterns established:
- `shopKbHeight` + `marginBottom` for keyboard in Modals (not KAV)
- `shopPendingBought` Set + timers for tick/undo flow
- `scanFromSheet()` dedicated pipeline pattern for vision tasks
- `contextTrigger` counter for reliable cross-component sheet opening
- Receipt date > item created_at comparison for smart tick-off

---

## ══════════════════════════════════
## SESSION 10b — MEAL PLANNER SHEET (13 April 2026 evening) ✅
## ══════════════════════════════════

Full Meal Planner 92% sheet built inside index.tsx. Same Modal pattern as Shopping.

### Meals tab (7-day planner):
- Day cards Mon–Sun with date label, meal name or "Nothing planned"
- Today: mint border + mint bg + "Tonight" badge (12px)
- Cook avatars: 28px family colour circles, tap to open cook picker
- Heart toggle on meals (persists via recipes tags)
- "Swap" button (open inline swap picker) or "+ Add" (same picker for empty days)
- Tap meal name → opens recipe detail

### Swap picker (inline below day card):
- Two sub-tabs: "❤️ Favourites" | "📅 Move night"
- Favourites: list favourite recipes as pick options + free-type input + "Set" button
- Move night: 7 day buttons, empty in mint, occupied show meal name. Tap to swap/move.

### Cook picker overlay:
- Family circles (56px, tap to toggle, green check on selected)
- Save → checks if kid selected → triggers kids job popup

### Kids job popup:
- "Create a job for [KidName]?" with point pills (5/10/15/Custom)
- Saves to `kids_jobs` Supabase table (family_id, child_name, title, points, source, linked_date)

### Recipes tab:
- "+ Add Recipe" (mint primary) + "Upload Recipe" (mint secondary) buttons
- Search bar, 2-column recipe grid (emoji thumb, name, cook time, heart)
- Tap recipe → recipe detail

### Favourites tab:
- Same grid filtered to `is_favourite` (via tags array containing 'favourite')
- Empty state with 🤍 icon

### Add recipe form:
- Name, cook time, ingredients (multiline, one per line), method (multiline)
- Save button → inserts to `recipes` table (stores ingredients/method in `notes` field)

### Upload recipe (multi-image):
- Camera + library buttons, multi-select from library (`allowsMultipleSelection: true`)
- Collect multiple photos (thumbnails with ✕ remove)
- "Scan X photos with Zaeli" → single Sonnet call with all images → pre-fills form

### Recipe detail:
- Emoji hero banner (120px, mint bg)
- Title, meta pills (time/serves/difficulty)
- Action buttons: "+ Meal plan" + "🛒 Shopping list"
- "Edit recipe" button → same form layout pre-filled, saves updates
- Ingredients with pantry status badges (In pantry ✓ / Need to buy)
- Numbered method steps with mint circle numbers
- Delete recipe option

### Send to list (pantry cross-check):
- Three-state badges — all tappable:
  - "In pantry ✓" (green) → "Adding →" (coral) → "Skipping" (grey, strikethrough)
- Dynamic confirm button count
- Batch insert to shopping_items

### Navigation:
- `meals_sheet` context type added to contextTrigger, isActive, and useFocusEffect handlers
- Dashboard dinner card → opens meal sheet directly
- FAB More "Meals" → opens meal sheet directly
- "Open Meal Planner" chip → opens meal sheet
- Dynamic header: back arrow ← on sub-views, heart toggle on recipe detail

### Supabase schema notes:
- `recipes` table: uses `prep_mins` (not cook_time), `notes` (stores ingredients + method as text), `tags` (array, 'favourite' tag for favourites)
- `meal_plans` table: uses `source` field to store cook_ids as JSON. No cook_ids or is_favourite columns.
- `kids_jobs` table: NEW — id, family_id, child_name, title, points, source, linked_date, is_complete, created_at

### Chat bar fix:
- Added `inputRef.current?.clear()` as native backup on send (onTouchStart + onSubmitEditing) to prevent text sticking

---

## ══════════════════════════════════
## SESSION 11 — MEAL PLANNER POLISH + LOCK (14 April 2026) ✅
## ══════════════════════════════════

Stress testing and polish session. Meal Planner now locked.

### Changes:
- **Rolling 10-day planner** — starts from today, no past days. Was Mon–Sun fixed week.
- **Today border = coral `#FF4545`** — distinct from mint swap border. Day number also coral.
- **Active swap border** wraps entire card + picker as one unit (parent View with overflow:hidden)
- **Unicode escapes fixed** — all remaining `\u2014`, `\u00b7`, `\u2026` replaced with actual characters
- **Swap placeholder** — "Add a meal..." (was "Type anything...")
- **Recipe photos** — tap hero to add photo (camera or library picker). Resized to 600px JPEG. Stored in `recipes.image_url`. Shows in grid thumbnails + detail hero. "Change photo" overlay when photo exists. Zero AI cost.
- **Move in recipe detail** — "Move to another night" button with inline move picker (same as Meals tab)
- **Search Recipes with day context** — "Search Recipes" button in swap picker Favourites tab. Routes to Recipes tab with mint banner showing selected day. Tapping a recipe assigns it and returns to Meals tab. `mealPendingRecipeDay` state tracks context.
- **Recipe detail from day card** — tapping meal name opens recipe detail with `mealDetailDayKey` set for move/context
- **Supabase schema** — `recipes.image_url` column used for photo storage
- **Tonight badge + cook avatars** — bumped sizes (badge 12px, avatars 28px)

---

## ══════════════════════════════════
## SESSION 11b — KIDS HUB COMPLETE (14 April 2026) ✅
## ══════════════════════════════════

Massive build — Kids Hub from dummy data to full Supabase-wired module with 5 games.

### Core Kids Hub:
- Child selector → unified hub layout for all kids (no more 3 tier variants)
- Hey [Name]! header + 3 stat row (Streak / Jobs today / To next reward)
- Child-themed backgrounds: Poppy lavender, Gab green, Duke yellow
- Wordmark a+i tints to child's colour in hub
- Points badge: child colour background, white text, 26px

### Jobs:
- Supabase-wired: kids_jobs, kids_points_log tables
- Active jobs with checkbox to complete → GIPHY celebration → points awarded
- Completed today: strikethrough + undo (tap checkbox reverts, removes points)
- Tap card body → expand for Repeat/Undo options
- Completed jobs history (previous days) expandable section with Repeat
- Suggest a Job form → kids_pending_approvals table → parent approval in Our Family

### Rewards:
- Supabase-wired: kids_rewards table
- Three affordability tiers (can afford / almost / saving)
- Redeem confirmation with balance breakdown
- Redemption → kids_pending_approvals → parent approval
- Suggest a Reward card

### Games (5 built, all with embedded keyboards):
- **Wordle**: age-tiered (4-letter Little, 5-letter Middle/Older), embedded QWERTY, key states, save/resume via AsyncStorage, info button with colour guide
- **Word Scramble**: embedded keyboard + input tiles, hint hidden (tap to reveal), celebration between rounds, Submit button below keyboard, save/resume
- **Maths Sprint**: custom number pad, 2-minute timer bar, green/red flash feedback
- **World Trivia**: 20 questions per tier (Aussie + World), celebration between questions
- **Mini Crossword**: interactive grid with clue numbers, tap to select, embedded keyboard, Check Answers

### Architecture:
- Games render as absolute overlay (not Modal — avoids re-render flicker)
- Celebration overlay: auto-dismiss 2.5s, tap to dismiss
- AsyncStorage for game save/resume (daily key per child)
- Our Family (family.tsx): pending approvals wired — approve/decline jobs + rewards

### Supabase tables created:
- kids_jobs, kids_rewards, kids_points_log, kids_pending_approvals
- All seeded with test data
- SQL in supabase-kids-hub-tables.sql

### Session 12 polish (all resolved):
- Game overlay changed from Modal to absolute View (fixes flicker)
- Wordle: active tile highlighted, Submit button below keyboard, key states for all word lengths
- Word Scramble: bigger Submit, hint hidden by default
- Maths Sprint: 2min timer, always coral, flashes last 10s, bigger responsive keypad, distinct answer box, Correct/Wrong text feedback
- World Trivia: renamed from Aussie Trivia, 20 questions per tier
- Crossword: grid+clues side by side, keyboard always visible, bigger cells (48px), Done button
- All DEL icons bumped to 22-24px across all games
- All unicode escapes fixed
- Kids Hub LOCKED

---

## ══════════════════════════════════
## SESSION 14 — ARCHITECTURAL REBUILD (17 April 2026) ✅
## ══════════════════════════════════

Massive session: Kids Hub AI trivia, Tutor difficulty bands, prompt caching, conversation summarisation, Dashboard redesign, Chat-first 2-page architecture, FAB killed, hamburger + MoreSheet, splash Option C, many polish fixes.

### Kids Hub improvements:
- **AI trivia via GPT-5.4 mini** — fresh questions every session, tracks history in `kids_trivia_history` Supabase table, prompt includes last 200 Q's to avoid repeats. Static arrays kept as offline fallback (shuffled).
- **Crossword selection** — per-child seen-tracking via AsyncStorage, daily rotation, siblings get different puzzles. Pool expansion to 100 crosswords PARKED (content task).
- **Supabase migration:** `supabase-kids-trivia-history.sql`

### Tutor improvements:
- **Topic chips reworked** — all 4 subjects (Maths/English/Science/HASS), Foundation–Year 12. Core-first (not Extension-first). E.g. Year 4 Maths now: Times tables · Multiplication · Division · Zaeli picks (was: Long multiplication · Decimals · Fractions).
- **Difficulty band system wired up:**
  - Loads prior band from `tutor_progress` when subject selected (new default = Foundation, not Core)
  - Tracks `consecutiveCorrect` (no hints), `consecutiveWrong` state
  - Injects structured state into Sonnet system prompt each call
  - 3 correct in a row (no hints) → UPGRADE (foundation→core→extension)
  - 3 wrong in a row → DOWNGRADE
  - Band persists to both `tutor_sessions.difficulty_band` AND `tutor_progress.difficulty_band` on session exit
- **Prompt caching** — `anthropic-beta: prompt-caching-2024-07-31` header auto-added when system prompt is array with `cache_control`. Static base + curriculum cached, dynamic state NOT cached. ~30-40% cost saving.
- **Conversation summarisation** — after 8 exchanges, older turns collapsed into 1-line summaries. Keeps input tokens bounded at ~1,500 (was growing to 3,000+ by turn 14).
- **Hint thinking indicator** — `handleHint` now calls `setSending(true)` immediately; also `setSending(false)` at end of `generateAIResponse` (was missing).
- **Floating mic pill** — tutor now uses the same waveform pill overlay as chat (Cancel/Send buttons), replacing inline recording indicator.
- **Cost analysis** — Poppy's Session 14 test: 18 turns, ~A$0.156. With caching + summarisation: estimated ~A$0.10-0.11 (~30% saving). Heavy use (30 sessions/month): A$3.00-3.30/child = 30% of A$9.99 revenue — comfortable.

### Dashboard redesign (Session 14 build of Session 9 spec):
- **New card order:** Calendar · Meal Planner (renamed from Dinner) · Weather+Zaeli Noticed (bento) · Shopping · On the Radar (renamed from Family Tasks)
- **Our Budget tile REMOVED** from Dashboard → MoreSheet
- **On the Radar** — new card using `personal_tasks` query for Rich + shared tasks due in 7 days. Inline + Add task input. View full list → navigates to My Space Notes & Tasks sheet (Tasks tab).
- **Header** — matches My Space (wordmark + date + Dashboard label + hamburger). Back arrow added to Dashboard header Session 14 (tap = go to Chat).
- **Card specs bumped to match My Space** — padding 22, borderRadius 22, cardLabel 13px letter 0.8, headline 24px, sub 13px.
- **Supabase migration:** `supabase-personal-tasks-sharing.sql` — adds `is_shared` + `member_name` columns to `personal_tasks`.

### Architecture rebuild (Session 14 radical):
- **Two-page swipe world** — Chat is page 0 (opens here), Dashboard is page 1. My Space moved to standalone route `/(tabs)/my-space`.
- **FAB KILLED** everywhere — `ZaeliFAB.tsx` component file still exists but not rendered.
- **Hamburger ☰ button** top-right of every screen's header — opens `MoreSheet` (92% bottom sheet with Family Channels, Personal, Modules, Navigation sections).
- **MoreSheet** (`app/components/MoreSheet.tsx`) — Option 1 refined tiles design. Uses `onAction` callback from parent (Chat/Dashboard) to handle in-swipe-world nav, or default router.navigate for standalone routes.
- **Back arrows** added to Tutor, Kids Hub, Our Family, Dashboard headers (next to zaeli wordmark, matching My Space pattern).
- **Chat bar camera** now opens Add-to-Chat sheet (Camera/Photos/Live) instead of camera-only.
- **Chat header label** — 'Home' (was 'Chat').
- **Legacy "← Dashboard" pill bug** — fixed by removing `returnTo: 'dashboard'` from all MoreSheet contexts (was appearing on every MORE-triggered nav).

### Splash screen:
- **Option C chosen — Deep Slate + Mint** — bg `#1C2330`, 96px wordmark white with mint `#B8EDD0` "a+i", "Less Chaos." bold mint + "More Family." soft white, 40px mint divider, "TAP TO CONTINUE" uppercase bottom.
- **Mint glow ring** behind wordmark (520×520 radial at 12% opacity).
- **Once per session** — module-level flag `_splashShownThisSession` prevents re-trigger when returning from standalone routes (My Space, Tutor, etc.).
- **Native splash updated** — `app.json` backgroundColor set to `#1C2330` for seamless transition. REQUIRES `npx expo prebuild --clean` + dev-client rebuild.

### Design mockup HTMLs produced this session (in repo root):
- `zaeli-fab-options.html` — 4 FAB option explorations
- `zaeli-chatbar-options.html` — 3 chat bar layouts (hamburger top-right chosen)
- `zaeli-more-sheet-options.html` — 4 MoreSheet designs (Option 1 chosen)
- `zaeli-splash-options.html` — 3 splash designs (Option C chosen)

### Files changed:
- `app/(tabs)/swipe-world.tsx` — rebuilt for 2-page, Chat-first, FAB removed, splash Option C, session flag
- `app/(tabs)/index.tsx` — hamburger added, MoreSheet render, camera picker, 'Home' label, legacy FAB removed
- `app/(tabs)/dashboard.tsx` — full redesign per Session 9 spec, hamburger + back arrow, MoreSheet, OnTheRadarCard
- `app/(tabs)/my-space.tsx` — standalone route, back button, hamburger, MoreSheet, initialTab prop for notes/tasks
- `app/(tabs)/tutor.tsx` — back arrow
- `app/(tabs)/tutor-session.tsx` — difficulty band system, prompt caching, conversation summarisation, hint thinking, floating mic pill
- `app/(tabs)/tutor-curriculum.ts` — all topic chips reworked Foundation–Year 12
- `app/(tabs)/kids.tsx` — AI trivia, crossword selection, back arrow
- `app/(tabs)/kids-games-data.ts` — no changes (fallback data preserved)
- `app/(tabs)/family.tsx` — back arrow
- `app/components/MoreSheet.tsx` — NEW component
- `app/components/ChatBarFacade.tsx` — NEW component (currently unused after revert, kept for future)
- `lib/api-logger.ts` — prompt caching support, cache metric logging, beta header auto-add
- `lib/navigation-store.ts` — added `notes_tasks_sheet` context type with `tab` field
- `app.json` — splash backgroundColor #1C2330, userInterfaceStyle 'light'

### Supabase migrations produced:
- `supabase-kids-trivia-history.sql` — kids_trivia_history table
- `supabase-personal-tasks-sharing.sql` — personal_tasks ADD is_shared + member_name columns

### Still TO DO from Session 14 feedback:
- Test on device once `app.json` rebuilt
- AI Brief system (4 time windows: morning/lunch/afternoon/evening, Sonnet, Supabase cache, time-relevant rule)
- Settings screen
- 100 crosswords (parked content task)
- Tutor session resume (reload from tutor_messages)
- Final splash polish if wordmark "i" dot cuts off on smaller devices

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
Phase 7a: Dashboard restructure ✅
Phase 7b: My Space reshuffle   ✅
Phase 7c: Notes & Tasks sheet  ✅
Phase 8a: Notes sheet          ✅
Phase 8b: Goals module         ✅
Phase 8c: Fitness sheet        ✅
Phase 8d: Stretch sheet        ✅
Phase 8e: Zen sheet            ✅
Phase 8f: Wordle               ✅
Phase 8g: Calendar/Shopping fix ✅
Phase 10a: Shopping sheet      ✅ Full rebuild — List/Pantry/Spend all polished
Phase 10b: Meal Planner sheet  ✅ 3 tabs, 7-day planner, recipes, favourites, cook picker, kids jobs
Phase 11:  Meal Planner polish ✅ Recipe photos, rolling 10-day, Search Recipes day context, move in detail
Phase 12:  Kids Hub wired      ✅ Supabase tables, job completion, GIPHY, rewards, suggest job, parent approvals
Phase 12b: Kids Hub games      ✅ 5 games rebuilt with embedded keyboards, age-tiered content, celebrations
Phase 12c: Kids Hub polish     ✅ Games polished, flicker fixed, crossword layout, all UX feedback addressed
Phase 12d: Our Family v2       ✅ 3-tab layout, member profiles, add member, jobs/rewards management
Phase 14a: Kids Hub AI Trivia  ✅ Session 14 — GPT-5.4 mini fresh questions, kids_trivia_history table, fallback to static
Phase 14b: Kids crossword pool 🅿️ PARKED — content task (100 puzzles), pickup anytime
Phase 14c: Tutor topic chips   ✅ Session 14 — reworked all 4 subjects Foundation–Year 12 (Core-first)
Phase 14d: Tutor difficulty    ✅ Session 14 — bands load from tutor_progress, consecutive tracking, upgrade/downgrade, persist
Phase 14e: Prompt caching      ✅ Session 14 — Anthropic cache_control on tutor system prompt, ~30-40% cost reduction
Phase 14f: Conversation summ   ✅ Session 14 — after 8 turns, older exchanges compressed to keep input bounded
Phase 14g: Dashboard redesign  ✅ Session 14 — 5-card layout, On the Radar, header match My Space, personal_tasks sharing
Phase 14h: Swipe-world v4      ✅ Session 14 — 2-page (Chat+Dashboard), open on Chat, My Space standalone, 2-dot indicator
Phase 14i: FAB killed          ✅ Session 14 — all FABs removed, hamburger ☰ top-right everywhere
Phase 14j: MoreSheet           ✅ Session 14 — Option 1 refined tiles, 92% sheet, Family Channels + Personal + Modules + Nav sections
Phase 14k: Splash Option C     ✅ Session 14 — Deep Slate #1C2330 + Mint accents, once-per-session fire
Phase 14l: Back arrows         ✅ Session 14 — added to Tutor, Kids Hub, Family, My Space, Dashboard headers
Phase 14m: Camera picker       ✅ Session 14 — chat bar camera opens Add-to-Chat sheet (Camera/Photos/Live)

Phase 15: AI Brief system      🔨 ← BIGGEST remaining piece — 4 time windows, Sonnet, Supabase cache, time-relevant rule
Phase 16: Our Budget module    🔨 ← Phase 2 (after Basiq response)
Phase 17: Settings             🔨 ← standalone screen with account, family members, subscription
Phase 18: Travel sheet         🔨
Phase 19: Tutor session resume 🔨 ← reload conversation from tutor_messages when resuming active session
```

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
- CHAT_MODEL = 'gpt-5.4-mini' · NOTICED_MODEL = 'gpt-4o-mini' (never swap these)
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
- zaeli_briefs table = family-scoped (one brief per family per time window per day)
- Date rule for all dates: bare local YYYY-MM-DD, never toISOString()
- What If mode = zero Supabase writes, nothing persisted, amber banner always visible
- Our Budget upload: privacy rule — raw statement content never stored
- Brief model = SONNET always · Chat model = gpt-5.4-mini · Noticed model = gpt-4o-mini
