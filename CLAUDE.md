# CLAUDE.md — Zaeli Project Context
*Last updated: 20 May 2026 — Session 22 ✅ · Backend Phase 2d shipped: real auth at invite acceptance (handle_new_user trigger branches on invite_token; adult/kid invitees create real Supabase auth users + profiles linked to inviter's family) PLUS six multi-user safety fixes (inviter-only heads-up filter, per-user chat persistence, local messages reset on user switch, no-AsyncStorage-fallback when signed in for tour-state + user-prefs, all-cache invalidation on auth change, fresh-invitee welcome polish suppressing first-session brief) · Cross-device invite + signup now works end-to-end · Phase 2e (real second-device verification) + 2f (memory wiring) next*

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
Hamburger ☰        = Session 14+ — 42px square button top-right of every header (Chat, Dashboard, My Space, Tutor, Kids Hub, Family) AND in every 92% sheet header (Calendar, Shopping, Meals, Notes & Tasks — Session 15). Opens MoreSheet.
Hamburger SVG      = 22px icon, lines at y=6,12,18 (symmetric around y=12). strokeWidth 2.2
MoreSheet          = app/components/MoreSheet.tsx — 92% bottom sheet, Option 1 tiles (NO upload section)
MoreSheet sections = Session 15 restructure: NAVIGATE top (Chat+Dashboard 50/50) · FAMILY CHANNELS (6 tiles, 3x2) · PERSONAL (My Space + Our Budget 50/50) · MODULES (Tutor+Kids Hub 50/50) · ACCOUNT (Our Family+Settings 50/50)
MoreSheet onAction = parent passes callback from Chat/Dashboard to route in-swipe-world nav; My Space uses default
Chat bar           = Session 15 = SINGLE PILL (Tutor-style unified): [Mic | sep | TextInput | Camera | Send] in one white pill. 60px min height. 44×44 buttons. Font 17px. Still ONLY on Chat page (Dashboard and My Space have NO chat bar). NEVER conditional render.
Chat bar styles    = barPillV2 (borderRadius 32, paddingVertical 10), barBtnV2 (44×44), barSepV2 (24px vertical divider), barInputV2 (17px font), barSendV2 (44×44 coral circle)
Tutor bar          = Session 15 matches Chat V2 spec exactly (minHeight 60, 44×44 buttons, font 17, etc.)
Chat bar camera    = SVG camera icon between TextInput and Send, coral #FF4545 stroke. Opens Add-to-Chat picker (Camera/Photos — Live removed Session 15)
Chat bar alignment = alignItems:'flex-end' in pill so mic + send anchor to bottom as input grows (iMessage pattern)
MoreSheet → sheets = OPTION A hamburger cross-nav. Tap hamburger in Calendar/Shopping/Meals/Notes&Tasks → close current sheet → 600ms → open MoreSheet. X in MoreSheet → restore original sheet. Tap different tile → switch to that sheet.
Modal stacking     = CRITICAL Session 15 learning: iOS can't stack Modals reliably. Pattern: use Modal onDismiss callback + 600ms fallback timeout + MoreSheet backdrop tap guard (400ms after open). Never present Modal while another is dismissing.
MoreSheet handleItem = MUST call onAction SYNCHRONOUSLY BEFORE onClose (Session 15 fix). Prevents closeMoreSheet reading stale ref and restoring origin sheet over the nav target.
sheetBeforeMoreRef = React ref (NOT state) so onAction can clear it synchronously before closeMoreSheet reads it
Shopping/Cal/Meals open = use openShopSheet/openCalSheet/openMealSheet (NOT bare setters). Bare setters flip visibility but don't load data.
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
_splashShownThisSession = module-level flag — splash only fires ONCE per app session, not on every swipe-world re-mount
Splash design      = Option C (Deep Slate + Mint + Lavender orbs — Session 15 polish). bg #1C2330, wordmark 96px white with SKY BLUE #A8D8F0 "a+i" (My Space identity — Session 15 change from mint), "Less Chaos." bold MINT #B8EDD0 + "More Family." soft white, 40px mint divider, "TAP TO CONTINUE" uppercase bottom
Splash orbs        = Session 15 — lavender orbs at top-right + bottom-left using Shopping tile lavender #D8CCFF at 55-65% opacity (low opacity blended to grey on dark bg, needed high opacity to read as purple)
Splash wordmark    = lineHeight 128 + paddingTop 12 to prevent "i" dot clipping at top
Native splash      = app.json backgroundColor #1C2330 (matches landing). REQUIRES dev-client rebuild (npx expo prebuild --clean)
Swipe pages        = Chat(0) · Dashboard(1) — My Space moved to standalone route
2-dot indicator    = KILLED Session 15 (was floating mid-air on Dashboard without chat bar). Navigate via swipe or MoreSheet NAVIGATE section.
Chat wordmark a+i  = #A8D8F0 sky blue (Session 15 change from #C4B4FF lavender) — ties to My Space identity
Dashboard header   = wordmark + back arrow (left) · date + "Dashboard" label + hamburger (right) — Session 14
Chat header        = wordmark (sky blue a+i) · "Home" label + hamburger (right) — Session 15 "Chat"→"Home" rename
✦ active colour    = #A8D8F0 sky blue
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
Our Budget         = Mint #2D7A52 deep / #B8EDD0 mint / #E6F7EF tint (Session 17 — swapped from Emerald to match Meals palette)
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

---

## ══════════════════════════════════
## SESSION 15 — POLISH + UX REFINEMENT (18 April 2026) ✅
## ══════════════════════════════════

Follow-up to Session 14's big rebuild. Focus: make everything feel right through many small but meaningful fixes.

### MoreSheet restructure (Option B with ACCOUNT section):
- **NAVIGATE section promoted to TOP** of the sheet (Chat + Dashboard, 50/50 tiles) — makes primary nav first thing user sees
- **PERSONAL section** now has 2 tiles side-by-side: My Space + Our Budget (was My Space full-width)
- **MODULES section** reduced to 2-tile row: Tutor + Kids Hub (their premium modules)
- **ACCOUNT section** NEW — houses Our Family + Settings (50/50). Label "ACCOUNT" chosen (alternatives considered: MANAGE, HOUSEHOLD)
- Tiles: bigger icons (18→26px) and labels (15→17px), cards same size
- X close button: proper SVG (not × text char), bumped 14→18px
- Layout: MORE section at bottom removed (Settings now inline in ACCOUNT)

### Universal hamburger across 92% sheets (Option A stacked):
- Hamburger ☰ button added to: **Calendar, Shopping, Meals, Notes & Tasks** sheet headers
- Only shown in top-level view (not sub-views like recipe detail or event edit form)
- Cross-sheet nav: tap hamburger in Meals → Meals closes → MoreSheet opens → tap Shopping → switches to Shopping (Shopping's opener `openShopSheet` called so data loads)
- X on MoreSheet → restore origin sheet

### Modal stacking bug fixes (critical learnings):
1. **iOS Modal can't stack reliably** — presenting MoreSheet while Calendar's Modal is mid-dismiss silently fails
2. **onDismiss + fallback timeout pattern** — use `<Modal onDismiss={handler}>` to get guaranteed post-dismiss signal. 600ms setTimeout as fallback for iOS edge cases.
3. **Phantom backdrop tap** — when hamburger tapped, touch-up event falls through onto newly-opening MoreSheet's backdrop → closes it instantly. Fix: MoreSheet `canCloseRef` ignores backdrop taps for first 400ms after open.
4. **Tile-tap race** — `handleItem` fires `onClose()` BEFORE `onAction()` (180ms later). Parent couldn't clear `sheetBeforeMoreRef` in time, so closeMoreSheet read stale ref and restored origin over the new nav. Fix: MoreSheet now calls `onAction` SYNCHRONOUSLY first, then `onClose` — parent clears ref before close reads it.
5. **Ref instead of state** — `sheetBeforeMoreRef = useRef()` not useState, so synchronous updates.
6. **Use real openers** — `openShopSheet()`, `openCalSheet()`, `openMealSheet()` (NOT bare `setShopSheetOpen(true)`). Bare setters flip visibility but don't load data → "list is clear" bug.

### Chat bar unification (two rebuilds in one session):
- Tried 3-piece floating design (mic circle + input pill + send circle) — user preferred Tutor's single-pill style
- **Final: single pill (Tutor style, bumped taller)** — `[Mic | sep | TextInput | Camera | Send]`
- Specs: minHeight 60, paddingVertical 10, buttons 44×44, font 17px, borderRadius 32
- `alignItems: 'flex-end'` so mic + send anchor to bottom as input grows (iMessage pattern)
- **Applied identically to Tutor** — both bars now look/feel the same
- Tutor icon sizes bumped (IcoMic 18→24, IcoSend 13→20, attach +18→22)
- All safety rules preserved (TextInput ref untouched, Send uses onTouchStart raw View, no onBlur, no Keyboard.addListener)

### Splash screen polish:
- **Wordmark "a+i"** changed from mint → **sky blue `#A8D8F0`** (My Space identity — better signals "home")
- "Less Chaos." stays mint bold — mint is still the tagline accent
- **Lavender orbs added** — top-right + bottom-left, using Shopping tile lavender `#D8CCFF` at 55-65% opacity (low opacity blended to grey on dark bg, needed HIGH opacity to read as purple)
- **"i" dot cut-off fixed** — lineHeight 104→128 + paddingTop 12 so the i-dot doesn't clip
- **Splash re-trigger fixed** — module-level `_splashShownThisSession` flag prevents splash re-mount when returning from My Space standalone route

### Dashboard improvements:
- **Tap-anywhere-on-card to expand** — Calendar, Meal Planner, Shopping, On the Radar cards all now use outer TouchableOpacity. Inner buttons (+Add, View Full Calendar, etc.) still work — React Native's responder system gives inner touchables priority.
- **Weather/Zaeli Noticed bento split** — changed from 50/50 → 35/65 (flex: 35 vs 65). Weather gets compact column, Zaeli Noticed gets readable space for expanded content.
- **Back arrow added to Dashboard header** — next to zaeli wordmark, quick return to Chat
- **Chat bar facade attempted and removed** — decided Dashboard/MySpace don't need chat bars. Each screen has its own purpose (Dashboard=glance, Chat=conversation, MySpace=personal). ChatBarFacade.tsx component kept in `/components` for future use but not rendered.

### Camera picker (Add-to-Chat sheet):
- **Camera icon in chat bar** now opens existing Add-to-Chat sheet (not camera-only)
- Sheet offers: Camera · Photos (Live option removed Session 15)
- Proper picker UX: user chooses before OS permission prompt

### 2-dot indicator killed:
- Looked awkward floating on Dashboard without a chat bar
- Removed entirely from swipe-world.tsx. Swipe + MoreSheet NAVIGATE section handle nav.

### Legacy "← Dashboard" pill:
- Completely removed from Chat header (was appearing whenever pendingChatContext had returnTo:'dashboard', which triggered on every MoreSheet nav)
- Navigation now handled via swipe + hamburger

### Chat header:
- "Chat" label → **"Home"** (Session 15 rename — Chat is the home screen)
- Heading size 18px (matches My Space page label)

### Small but important fixes:
- Chat bar camera → picker sheet (Camera / Photos). Live removed.
- Hamburger icon: bigger (36→42 container, 18→22 icon), lines at y=6/12/18 (symmetric, was y=8/14/20)
- Tutor, Kids Hub, Our Family headers — back arrows next to wordmark (matches My Space pattern)
- Splash orbs properly lavender on dark slate bg (0.65/0.55 opacity)
- Removed `returnTo:'dashboard'` from all MoreSheet contexts (was triggering legacy pill)

### Files changed Session 15:
- `app/(tabs)/index.tsx` — chat bar V2 rebuild, camera picker (Live removed), onAction order fix, modal stacking guards, Home label, sky blue a+i, legacy pill removed
- `app/(tabs)/dashboard.tsx` — all 4 cards tap-anywhere, Weather/Noticed 35/65, back arrow, hamburger
- `app/(tabs)/my-space.tsx` — onDismiss support in Sheet component, hamburger cross-nav via NotesSheet, ref-based sheetBeforeMore
- `app/(tabs)/swipe-world.tsx` — 2-dot indicator killed, splash polish (sky blue a+i, lavender orbs, wordmark height)
- `app/(tabs)/tutor-session.tsx` — chat bar bumped to match Chat V2
- `app/components/MoreSheet.tsx` — section restructure (NAVIGATE top, ACCOUNT bottom), bigger icons/fonts, X as SVG, backdrop tap guard, onAction SYNC before onClose

### Still TO DO from Session 15:
- Settings screen
- Tutor session resume
- 100 crosswords (parked)

---

## ══════════════════════════════════
## SESSION 16 — AI BRIEF SYSTEM v2 + CALENDAR FIX (19 April 2026) ✅
## ══════════════════════════════════

### AI Brief System (Phase 16 — Philosophy B centrepiece)

**Architecture:**
- **3 time windows** (per CLAUDE.md Session 9): Morning 05:00–11:59 · Midday 12:00–16:59 · Evening 17:00–04:59
- **Firing logic** — `lib/brief-firing.ts` pure functions:
  - New day → always fire
  - Window changed → fire (unless mid-conversation, then HELD)
  - Same window already fired → skip
  - Held brief fires on next app open OR 15 min inactivity
- **Generation** — `lib/brief-generator.ts`:
  - Check `zaeli_briefs` cache first (family_id + date_key + time_window)
  - `data_signature` = hash of today/tomorrow events + meal + shop count + tasks. If changed → regen.
  - Sonnet with prompt caching on system prompt (`cache_control: ephemeral`)
  - Returns strict JSON: `{ text, chips, winBanner? }`
  - Persona + format rules baked into system prompt (winning mantra, active credit, banned words)
- **Chat integration** — briefs render INSIDE the chat feed as Zaeli messages (isBrief: true)
  - Dark slate bubble `#2D3748` with mint left-border win banner
  - Coral primary chip + outlined secondary chips + dismissal chip
  - Time divider ("Midday · 12:31pm") shown above brief ONLY when firing into existing thread
  - Auto-scroll to bottom on fire
- **Cost** — ~A$0.01-0.02 per brief with prompt caching. 3 briefs/day stress-tested = ~A$2.50-3.00/family/month

**New files:**
- `supabase-zaeli-briefs.sql` — migration for zaeli_briefs table (with data_signature + cost tracking)
- `lib/brief-firing.ts` — shouldFireBrief, currentWindow, windowLabel, hashString
- `lib/brief-generator.ts` — generateBrief (cache-first), FamilyContext, buildSystemPrompt per window

**Files modified (index.tsx):**
- Msg type extended with `briefWindow`, `briefChips`, `briefWinBanner`, `briefDividerLabel`
- `tryFireBrief()` function — unified entry point (called on mount, isActive, 60s timer)
- `buildBriefContext()` — live Supabase data aggregation
- `handleBriefChipTap()` — primary chip → send() as user message, dismissal silent
- Mount effect: 400ms delay then `tryFireBrief({ appJustOpened: true })` + 60s interval for held briefs
- isActive effect: `tryFireBrief({ appJustOpened: false })`
- `lastMessageAtRef` tracks user sends for inactivity check
- Old lavender brief card DISABLED (`false &&` gate) — new brief in feed only
- Brief bubble styles in StyleSheet (briefBubble, briefWinBanner, briefChip, briefTimeDivider, briefEyebrow, etc.)

**Old brief system:**
- LandingBrief overlay kept for now (tied to splash landing — separate concern)
- Old `generateBrief()` still exists but old lavender render gate removed
- Can fully clean up old brief code once new system proven stable

### Calendar month-view fix (Session 15 carryover)
- Bug: `null === null` matched spillover cells making every prev/next month day red
- Fix: explicit null guards on `isToday` + `isSelected`
- Bug: "Nothing on" section disappeared on month change (selectedDay set to null)
- Fix: auto-select today (current month) or day 1 (other months), with `userTapped` flag
- Red circle only shows on genuine user-tap, never on auto-select
- Today is permanent slate anchor (Option A) — never overridden to red even if tapped
- Arrow buttons: bigger circular containers (40×40), SVG chevrons, hitSlop 12px

---

## ══════════════════════════════════
## SESSION 17 — BRIEF POLISH · SETTINGS · KIDS HUB FIX · OUR BUDGET v2 PURE PLANNER (22 April 2026) ✅
## ══════════════════════════════════

Big session. Brief system polished and critical shadowing bug fixed. Settings shipped. Kids Hub keyboard flash resolved. Our Budget built v1 then pivoted to v2 Pure Planner (no live tracking). Mint palette + Option D allocation chart.

### AI Brief system polish
- **Quiet-day persona rewrite** ([brief-generator.ts:59](lib/brief-generator.ts:59)) — replaced rules-heavy "BE PROACTIVE" block with "QUIET DAYS — WHERE YOUR PERSONALITY LIVES". Zaeli leads with observation/character before offers. Per-window examples added to morning/midday/evening suffixes.
- **Eyebrow star** — was sky blue SVG on sky blue tile = invisible. Fill now `#0A0A0A` black.
- **Bubble colour** — `#F0EDE8` → Dashboard peach `#FAC8A8`.
- **Font sizing** — briefText 15/24 → 17/27. briefWinText 13/20 → 15/22. Win banner tint bumped to 0.55 alpha so mint stays readable on peach.
- **Primary chip softer** — `#FF4545` coral fill → `#FFE4E0` soft coral with `#B83333` deep coral text, border `#F5C2BA`.
- **Dismiss chip works** — was silent. Now sets `msg.briefDismissed = true`, chips hide, brief text stays as reference.

### Brief system CRITICAL bug (fixed Session 17)
- Root cause: local `async function generateBrief(force, focusHint)` in index.tsx was **shadowing the imported** `generateBrief` from `lib/brief-generator`. `tryFireBrief` was calling the old GPT brief the whole time.
- Symptoms: 10s blank screen on reload, "Nothing on today" cards appearing after unrelated responses, weird two-message briefs.
- Fix during investigation: imported as `generateBriefV2`. After deleting the old function entirely, renamed back to `generateBrief`.
- Also fixed: one orphan caller at `_finishEntry` (line 5379) that would crash with the renamed imported signature.

### Instant brief feedback
- `tryFireBrief` now pushes a **loading placeholder bubble** (peach bubble + `TypingDots`) immediately, updates in place when Sonnet returns.
- Dropped the 200ms mount delay — fires the moment chat is ready.
- On error, placeholder is removed (no stuck empty bubble).

### Old brief system FULL CLEANUP
- Removed ~380 lines: module-level cache vars · 8 dead state vars (`briefReplies`, `chatBriefText/Chips`, `briefHero`, `briefChips`, `activePill`, `overviewOpen`, `briefSeed`) · `cardAnims` ref + `briefHero` effect · old `generateBrief` function · `generatePostCardPrompt` · `renderCardStack` (never called) · dead lavender brief card JSX · stale-session 30-min splash-replay reset · dead style block (heroSection, overviewToggle, cardStack, shadowed brief chip duplicates).
- Renamed `generateBriefV2` import back to clean `generateBrief`.
- Patched orphan call at `_finishEntry` to use `tryFireBrief({ appJustOpened: true })` instead.

### Calendar keyword tightening (bug from chat hijacking bike-hire question)
- `CALENDAR_KEYWORDS` list narrowed from ~50 entries (including bare "next week", "today", day names, "school", "pickup") to ~20 intent-bearing phrases only.
- Now triggers only on: "what's on", "anything on", "when is", "coming up", "remind me", "am I busy", etc. Time refs only trigger when paired with intent.
- Narrative mentions of time no longer hijack chat responses with calendar cards.

### Settings screen built (Phase 18)
- New file [settings.tsx](app/(tabs)/settings.tsx) — replaces the 16-line stub with full implementation.
- 3 internal views: `main` / `notifications` / `memory` (no separate routes, state-driven).
- **Main**: account hero (slate gradient + peach avatar + plan tag), Subscription card (mint), Family row → `/family`, Preferences rows, Data & Privacy, About, Danger (Sign out / Delete).
- **Notifications**: brief times (Morning/Midday/Evening) — tappable rows open `DateTimePicker` modal. Display as exact time ("6 am", "7:15 am") — never "around". Toggles for reminders, kids activity, quiet hours (expands Start/End pickers when on), sound & vibration.
- **Memory**: dummy routines / preferences / milestones (Supabase wiring deferred), `×` delete per row, "Let Zaeli learn from chats" toggle, Clear all.
- Persistence: all toggles/times saved to AsyncStorage under `zaeli_settings_prefs_v1`. Supabase migration in backend pass.
- MoreSheet → Settings tile already wired in MoreSheet default handler.

### Settings → Our Family back navigation
- Problem: router params don't reliably survive tab-route navigation in expo-router.
- Fix: added `setFamilyFromSettings()` + `consumeFamilyFrom()` to [navigation-store.ts](lib/navigation-store.ts). Bulletproof module-level flag (same pattern as `pendingChatContext`).
- Settings calls `setFamilyFromSettings()` before `router.navigate('/family')`. family.tsx consumes on mount via `useState(() => consumeFamilyFrom())`. `goBack()` checks origin — Settings → `router.navigate('/settings')`, else default `swipe-world`.

### Kids Hub keyboard flash (classic React anti-pattern)
- Root cause: `JobsTab`, `RewardsTab`, `GamesTab`, `LeaderboardTab`, `Banner`, `ChildSelectView`, `HubHomeView` were functions declared inside `KidsHubScreen` but rendered as JSX elements `<JobsTab />`. Every parent re-render → new function identity → React unmounts/remounts the whole subtree → TextInput unmount → keyboard dismisses → mount → keyboard reopens. Cycle per keystroke.
- Fix: convert all 7 call sites to function expressions `{JobsTab()}`. JSX becomes plain render result, no remount on parent re-render.
- Applies any time you declare sub-components inside a parent — either hoist out, or call as function.

### Standard header rule (Session 17 — now locked)
- **Page label standard**: `Poppins_700Bold · fontSize 17 · color rgba(10,10,10,0.72)` — replaces the mixed 14/18/17 and varying alpha across screens.
- **Wordmark standard**: `Poppins_800ExtraBold · fontSize 40 · letterSpacing -1.5 · lineHeight 46` — confirmed across family/kids/my-space, now applied to settings (was 26).
- Applied to: [dashboard.tsx:1433](app/(tabs)/dashboard.tsx:1433), [my-space.tsx:2583](app/(tabs)/my-space.tsx:2583), [index.tsx:8415](app/(tabs)/index.tsx:8415) (`topBarChannelName`), [tutor.tsx:324](app/(tabs)/tutor.tsx:324), [kids.tsx:1555](app/(tabs)/kids.tsx:1555).

### Our Budget v1 built then v2 PIVOT ✅

**v1 build (then superseded)**:
- Built full 3-tab UI shell (Overview / Categories / Goals) with static seed data, then wired CRUD sheets for income editor, add transaction, add/edit category, add/edit goal.
- Screenshot upload with Claude Sonnet vision → statement review sheet with confidence thresholds, accept/edit/skip per transaction.

**Strategic pivot — Option B Pure Planner (LOCKED Session 17)**:
- Richard observed: uploaded November ATM withdrawals got imported as "this month" spend — structural failure of the live-tracking premise without a bank feed (Basiq).
- Discussed and agreed: without a bank feed, "live spend tracking" lies to users the moment data is stale. Shifted positioning: **Zaeli Our Budget = a family budget PLANNER, not a tracker.**
- **What's IN**: monthly income streams, fixed categories with line items (auto-sum), variable categories with single target, savings goals (manual, forward-looking), one-off AI helper for budget suggestions (data not persisted).
- **What's OUT**: live "spent this month" numbers, transaction ledger, status tiles (on track/watch/over), persisted monthly review rows, reality-check banner, add-transaction UI.

**v2 implementation**:
- Fixed categories hold line items — budget = `SUM(line_items.monthlyAmount)`, auto-calculated. Variable categories have a single `monthlyTarget` field.
- AI helper produces 3 kinds of suggestions: variable averages (map to existing cats), new variable categories (if pattern doesn't fit), recurring subscription detections (auto-added as line items to Subscriptions category).
- Paste statement works via Clipboard API. Photo works via ImagePicker + Claude Sonnet vision. CSV/PDF shows install instructions (needs `expo-document-picker` + EAS rebuild).
- Tab rename: **Goals → Savings**. (Internal items still called "goals".)
- Hero label: **Spare → Surplus**. Over-budget: shows `−$X`, label becomes "Over", peach coloring.
- **Target date picker** in EditGoalSheet — Pick-a-month / Flexible toggle. `DateTimePicker` in date mode, stored as "Oct 2025".
- Mint palette swap (match Meals): `#2D7A52` deep / `#B8EDD0` mint / `#E6F7EF` tint / `#C8F0DA` border. Savings = `#A8D8F0` sky. Over = `#FAC8A8` peach with `#8A3A00` warm brown text.
- **Allocation chart Option D** — single labelled stacked bar with `%` inside each segment + 3 tinted chips below with dollar amounts. Over state: scales to fit 100%, 3rd chip turns peach with `−$X`. Warm warning note below.

**Budget access fix**: "Coming soon" alert lived in 3 places — [MoreSheet.tsx:213](app/components/MoreSheet.tsx:213), [dashboard.tsx:1395](app/(tabs)/dashboard.tsx:1395), [index.tsx:5997](app/(tabs)/index.tsx:5997). All now route to `/our-budget`.

### HTML mockups produced this session
- `zaeli-settings-mockup.html` — Settings main + Notifications + Memory detail
- `zaeli-budget-v2-mockup.html` — Pure Planner redesign (5 frames)
- `zaeli-budget-v2-theming.html` — mint palette + 4 chart options (Option D picked)

### Files touched this session
- `app/(tabs)/index.tsx` — brief polish, old brief cleanup, standard page label, calendar keyword tightening, budget access, brief loading placeholder
- `app/(tabs)/settings.tsx` — full rewrite (~740 lines)
- `app/(tabs)/family.tsx` — back-to-settings origin detection
- `app/(tabs)/our-budget.tsx` — NEW (~1700 lines, v2)
- `app/(tabs)/dashboard.tsx` — standard page label + budget route
- `app/(tabs)/my-space.tsx` — standard page label
- `app/(tabs)/tutor.tsx` — standard page label
- `app/(tabs)/kids.tsx` — standard page label + keyboard flash fix (call-as-function pattern)
- `app/components/MoreSheet.tsx` — budget tile routes to `/our-budget`
- `lib/navigation-store.ts` — added `setFamilyFromSettings` / `consumeFamilyFrom`
- `lib/brief-generator.ts` — quiet-day persona rewrite + per-window examples

---

## ══════════════════════════════════
## SESSION 18 — TRAVEL MODULE · KEYBOARD FIX (22 April 2026) ✅
## ══════════════════════════════════

Follow-on to Session 17 same day. Travel module built from scratch against the new design system.

### Travel module ([travel.tsx](app/(tabs)/travel.tsx))
- Full rewrite — replaces the pre-Session-14 March 1382-line version
- **Standalone route** (not 92% sheet — too much depth for a sheet: Trip Stack → Trip Detail → 4 tabs)
- **Two views**: Trip Stack (Upcoming + Past sections + `Plan a trip` CTA + Zaeli insight) → Trip Detail
- **Trip Detail 4 tabs**: Overview / Bookings / Packing / Notes (segmented switcher)
- **Overview**: gradient hero card with destination (38px) + flag + dates + countdown pill, tap-to-edit Who's Going card, tap-to-edit Budget card, inline packing progress, Zaeli insight, Delete trip
- **Bookings**: grouped by category (Flights / Accommodation / Transport / Activities), **tap row to edit** (was long-press-to-delete — changed Session 18)
- **Packing**: sky progress pill, sections by person (Shared + each trip member), tap-to-tick with ocean-deep check, long-press to remove
- **Notes**: tagged cards (Important/Idea/Info/Question — each with own colour), author attribution, long-press to remove
- **Sheets**: unified BookingSheet (add+edit in one component), NewPackingSheet, NewNoteSheet, NewTripSheet (6 card-bg options, 14 icon emojis), EditTotalBudgetSheet, EditMembersSheet
- **Routing**: MoreSheet travel tile wired in all 3 onAction handlers ([MoreSheet.tsx:217](app/components/MoreSheet.tsx:217), [dashboard.tsx:1396](app/(tabs)/dashboard.tsx:1396), [index.tsx:5995](app/(tabs)/index.tsx:5995))
- **Design rules followed**: 40px wordmark, `a+i` sky `#A8D8F0` (Travel identity), 17/700Bold/0.72 page label, segmented tabs, big fonts (trip dest 30px stack / 38px detail, budget 34px, hero Zaeli text 17px), no in-module chat bar

### Travel Budget = Pure Planner (applied Session 18 pivot)
- **No manual "Spent so far"** — same reason we ripped it from Our Budget: without a bank feed, manual spend data is drift + lies
- **Booked** auto-sums booking amounts (committed dollars)
- **Still to plan** = Total − Booked (runway for food / activities / anything not booked yet)
- Edit button on Budget card opens EditTotalBudgetSheet — one field (total only)

### Keyboard glitch fix — root cause
- **Symptom**: typing in Travel's Add Booking / Add Note forms, screen went out of whack, couldn't see the focused input
- **Root cause**: `KeyboardAvoidingView` wrapping the entire Modal + `sheetCard: height: H * 0.92` fixed height. When keyboard opened, KAV pushed the whole fixed-height card up off the top of the screen.
- **Fix**: move KAV *inside* the sheet card, wrapping only the body. Card stays pinned to bottom, body shrinks to accommodate keyboard. Applied to [travel.tsx SheetShell](app/(tabs)/travel.tsx) and backported to [our-budget.tsx SheetShell](app/(tabs)/our-budget.tsx).
- **Also**: added `keyboardShouldPersistTaps="handled"` to all Travel + Our Budget sheet ScrollViews so tapping between fields while keyboard is up doesn't dismiss it.

### Session 18 polish round
- Who's Going card tappable → EditMembersSheet (family pill multi-select)
- Bookings tap-to-edit via unified BookingSheet (`payload: 'new' | Booking`), Delete button inside sheet (replaces long-press-to-delete)
- Budget card now shows Total / Booked auto-sum / Still to plan
- Same keyboard fix backported to Our Budget sheets

### Files touched this session
- `app/(tabs)/travel.tsx` — full rewrite (~1500 lines)
- `app/(tabs)/our-budget.tsx` — SheetShell KAV moved inside card
- `app/components/MoreSheet.tsx` — travel tile routes to /travel
- `app/(tabs)/dashboard.tsx` — same in onAction handler
- `app/(tabs)/index.tsx` — same in onAction handler (closes sheets first)

### Deferred to backend pass (Travel)
- 6 Supabase tables: `trips`, `trip_members`, `trip_bookings`, `trip_packing_items`, `trip_notes`, `trip_budget`
- AI brief per trip (Sonnet cached)
- Vision for booking confirmations (auto-extract REF / dates / amount from screenshot)
- Real family_members wiring (not seed data)

### Pending for backend pass (all together)
- Our Budget: 4 Supabase tables (`income_streams`, `budget_categories`, `category_line_items`, `savings_goals`) + AI helper persists accepted suggestions
- Settings: `user_preferences` table (migrate from AsyncStorage) + push notification scheduling tied to brief times / quiet hours
- Account / Auth: Supabase auth user, real name / email / family_members hookup
- Subscription: Stripe metadata + customer portal WebView
- Memory: wire Settings → Memory to real `family_insights` / `family_milestones` / `conversation_memory` data
- Push notification registration for brief times
- Export data, Clear chat history, Privacy/Terms WebViews
- Our Budget CSV/PDF: `expo-document-picker` install + dev client rebuild
- Our Budget share extension: native module, EAS build step

---

## ══════════════════════════════════
## SESSION 19 — BRIEF v3 · ONBOARDING POLISH · TOUR · INVITES (23–24 April 2026) ✅
## ══════════════════════════════════

The largest single body of work in the build so far. Five interlocking workstreams:

### A. Brief system v3 — 2 windows + structured prose

- **Reduced from 3 windows to 2** — morning (05:00–15:59) "here's your day" + evening (16:00–04:59) "today's wrap + tomorrow's shape". Midday killed; evening now carries tomorrow-morning prep so morning brief doesn't need to. Per [lib/brief-firing.ts](lib/brief-firing.ts) + the locked rule in this doc.
- **Render redesigned to Option B** ([app/(tabs)/index.tsx](app/(tabs)/index.tsx)):
  - Bubble shape matches standard chat bubble (radius 18, BBL 6, no border)
  - Soft tint per window — peach `#FDF1E5` morning, lavender `#F0EBFF` evening
  - Time-of-day pill at top of bubble — `☀️ MORNING` (peach pill) / `🌙 EVENING` (lavender pill)
  - Win banner KILLED entirely. Encouragement folds into the prose itself.
  - Eyebrow simplified to `Zaeli · 12:31pm` (window context lives in pill, no redundancy)
- **Generator prompt rewritten** ([lib/brief-generator.ts](lib/brief-generator.ts)):
  - Enforces 3-paragraph structure: `[OPENER]` (1 line + emoji) / `[BODY]` (2-3 sentences with specifics) / `[ONE THING]` (single nudge with emoji)
  - Max 100 words total; quiet-day mode collapses to opener + one thing only
  - 1 emoji per paragraph max (so 2-3 emoji across whole brief, never more)
  - `winBanner` field stripped from JSON spec, parser, BriefPayload type, and DB writes (column stays for migration safety, set null)
- **`briefWinBanner` Msg field also removed** from the chat code (state field, push site, render path)

### B. Onboarding polish

- **Splash WelcomeStep + ReadyStep** ([app/onboarding/index.tsx](app/onboarding/index.tsx)) — both got the new palette orb design (peach top-right, mint bottom-left, lavender mid-left, sky bottom-right) on warm BG. `wmHuge` lineHeight 96 → 120 + paddingTop 14 fixes the i-dot clip. "Less **chaos**." in coral. ReadyStep's ✦ → ✨, sub gets a 💬, `overflow:hidden` on wrap so orbs stay contained.
- **Step 2 (OpenerStep)** — opener changed `Hello — I'm Zaeli` → `Hey 👋 I'm Zaeli`. Forward-looking copy: *"Once we're set up, you'll be able to **message me**, **tap the mic**, or **show me a photo**…"* with sprinkled emoji 📸/📚/⏱️.
- **Duplicate "is this rash anything?"** — Step 2 line replaced with `"what's this homework asking?" 📚` (teases the Tutor demo coming up). Original kept in Step 10 LifeDemoStep where it's the headline demo.
- **Brentwood example (Step 10 LifeDemoStep)** — bigger fonts (body 11→14, answer 14→16), photo card → white with stronger border, answer card → sky-blue tint with sky-deep left border, `demoCard` padding 16→20.
- **Brief preview (Step 11 BriefPreviewStep)** — updated to match new live brief Option B exactly: peach bubble + ☀️ MORNING pill + structured 3-paragraph prose (☔/🥞/🍽). Win banner killed. Eyebrow simplified.
- **Chat bar removed from onboarding entirely** — `<ChatBar/>` instances stripped, component definition + styles deleted. Onboarding has no fake chat bar; CTAs land in-flow.
- **CTA rename** — `Go on then` → `Let's go` (both CTA + user-echo line in Step 3).
- **User text matched Zaeli text** — both `Poppins_400Regular`, `lineHeight: 26`. Onboarding `uText` updated for cross-surface consistency.

### C. Cold-start splash redesigned (matches onboarding)

- [app/(tabs)/swipe-world.tsx](app/(tabs)/swipe-world.tsx) — dark slate (Option C) **REPLACED** with warm bg `#FAF8F5` + palette orbs (peach/mint/lavender/sky)
- Wordmark now INK black with sky `a+i`, "Less **chaos**." in coral `#FF4545`, "More family." in INK
- TAP TO CONTINUE in INK4
- 40px mint divider killed
- Native splash bg in [app.json](app.json) updated `#1C2330` → `#FAF8F5` so cold-start transition is seamless. **REQUIRES `npx expo prebuild --clean` + dev-client rebuild.**

### D. Main chat bubble unification

- **Zaeli text** now wrapped in soft-grey bubble (`rgba(10,10,10,0.04)`, BBL 6, padding 13/16, alignSelf flex-start, maxWidth 90%)
- **User bubble** background: `#F2F2F2` → sky `#E8F4FD` (T.userBubble token), shape radius 18 / BBR 6 / padding 11/15, maxWidth 86%
- **Both texts** matched: `Poppins_400Regular` / 17px / `lineHeight: 26` (was Medium 27 for one, Regular 27 for the other)
- New `s.zaeliBubble` style added — wrapped 5 paragraph render points (calendar inline, shopping inline, other-inline intro+followUp, plain text path) plus typing-dots state plus dead-code brief render path

### E. TOUR SYSTEM — full build (Phase 30)

**State machine:** [lib/tour-state.ts](lib/tour-state.ts)
- `loadTourState()` / `getCurrentStop()` / `advanceStop()` / `goBackStop()` / `skipToFinale()` / `completeTour()` / `replayFromStart()` / `replayStop(n)` / `isCompleted()` / `isInProgress()` / `getProgressPct()` / `getStopById(n)`
- Inactivity helpers: `shouldShowResumePrompt()` / `markResumePromptShown()` (24h inactivity threshold + 24h prompt cooldown)
- `STOPS` array with all 11 stop definitions: id / emoji / pageH1 / pageSub / cardTitle / cardSub / trySaying / trySayingType / features[] / ctaLabel / ctaTarget (sheet|route|chat) / accent palette / isHero / trialBadge / priceLine / secondaryCtaLabel
- AsyncStorage key `tour_state_v1` — currentStop (1..11 or 'finale'), startedAt, completedAt, lastOpenedAt, lastResumePromptAt
- Progress formula `((cur-1)/(TOTAL-1))*100` so stop 1 = 0% and stop 11 = 100% (even 10% jumps per step)

**Route:** [app/tour/index.tsx](app/tour/index.tsx)
- Header (× close + Skip-to-end) / eyebrow / h1 / sub / **animated** progress bar (Animated.Value, 320ms cubic-out) / per-stop card / bottom nav (Back + Next-or-Finish)
- Tutor stop 7 = HERO — violet accent throughout (icon ring, eyebrow, h1 highlight, CTAs, progress fill), trial badge ✨ FREE FOR 14 DAYS at top of card (inline row, not absolute — was getting clipped), secondary CTA "Just have a look", price line below
- Finale celebration screen — 🎉 emoji, summary recap (Daily loop / Hero / Bonus), "Take me to chat ✨" → `completeTour()` + routes home
- 11 stops: Shopping → Meals → Calendar → Kids Hub → Tasks → Photos → **Tutor (HERO)** → Travel → Our Budget → My Space → Our Family
- Stop CTAs route via `pendingChatContext` (Shopping/Meals/Calendar/Tasks → swipe-world opens sheet) or direct `router.navigate` (Kids/Tutor/Travel/Budget/MySpace/Family)
- Photos stop CTA = "Open chat →" (camera lives in chat bar; trySayingType `'tap'` shows sky callout instead of mint)

**Chat integration:** [app/(tabs)/index.tsx](app/(tabs)/index.tsx)
- `🧭 Take the tour` chip → `replayFromStart()` (CRITICAL — wipes finale state from prior runs) then `router.navigate('/tour')`
- **Tour pill** floats bottom-LEFT (was right — collided with chat scroll arrows) when tour is mid-progress: `🧭 Resume tour` + mint badge `X/11`. Tap → /tour at saved stop. Refreshes on focus + on chat mount.
- **Inactivity prompt** — `maybeFireTourResume()` on mount + focus. Pushes Zaeli message *"We were on the [Stop] stop. Want to pick up where we left off, or skip ahead? You're 3 of 11 through 🧭"* with chips ▶ Continue / 🏁 Skip to end / Not right now. `markResumePromptShown()` runs synchronously to prevent double-fire.

**First-time mint banner inside live sheets:** [app/components/TourBanner.tsx](app/components/TourBanner.tsx)
- Reusable `<TourBanner sheetKey="..." message="..."/>` — renders only when tour-in-progress AND not previously dismissed for that sheet
- Per-sheet AsyncStorage flag `tour_banner_seen_<sheetKey>`; × dismiss persists
- Wired into 4 sheets: **Shopping**, **Meals**, **Calendar**, **Notes & Tasks** (Tasks tab specifically)

**Settings → Replay tour view:** [app/(tabs)/settings.tsx](app/(tabs)/settings.tsx)
- Added 'tour' to View union, page label handling, mint compass row in Preferences
- TourReplayView component — hero card "Run the whole tour" + "▶ Start full tour" CTA + "Last completed: <date>" + 11-row per-stop picker with palette-coloured icons matching tour route accents (Tutor row tagged "Hero feature")
- Wired `replayFromStart()` and `replayStop(n)` from parent

**Mockup:** [zaeli-tour-mockup.html](zaeli-tour-mockup.html) — v2, 18 frames across 5 acts (tour offer → daily loop → Tutor hero → bonus modules → finale + Settings replay + inactivity)

### F. INVITE SYSTEM — full build (Phase 31)

**State libs:**
- [lib/invite-state.ts](lib/invite-state.ts) — `loadInvites()` / `getPendingInvites()` / `getPendingForName()` / `findByToken()` / `createInvite()` (returns `{invite, link, sms}`) / `markAccepted()` / `resendInvite()` / `revokeInvite()` / `recentlyAcceptedInvites()` (heads-up windowing) / `clearJustAcceptedFlag()` / `relTime()`. Mock 6-char token. Per-role SMS composer. AsyncStorage key `invite_state_v1`.
- [lib/account-state.ts](lib/account-state.ts) — current account identity. Three kinds: `owner` (Rich, default) / `adult` (invited adult) / `kid` (invited kid with own device). `loadAccount()` / `getAccount()` / `isKidAccount()` / `isAdultAccount()` / `setAccount()` / `resetToOwner()`. AsyncStorage key `account_state_v1`. Used by MoreSheet for permission gating.

**Inviter side:**
- [app/invite/index.tsx](app/invite/index.tsx) — role picker (Adult sky / Kid lavender — **no emoji**, just color-coded names per Richard) + form (name + optional phone + live SMS preview) + iOS share sheet trigger via `Share.share({ message: sms, url: link })`. Returns to `/(tabs)/family` after share dismisses.
- Optional `?role=kid&name=Anna` query params — pre-set when launched from inline "+ Invite" tap on existing kid.
- [app/(tabs)/family.tsx](app/(tabs)/family.tsx) updates:
  - Per-member status grid: Rich = "You · Account owner" / Anna = "+ Invite to Zaeli" tap (mock changed `'full'` → `'invite'`) / Poppy = "Joined" / Gab = "+ Invite to Zaeli" tap / Duke = "Uses parent's device" + "+ Give them their own" outlined mint button
  - Status badges bumped — fontSize 9→11/12, padding 7×2→10×5/12×7, hitSlop 10px on all action chips, action chips promoted to filled mint pills
  - PendingInviteRow component (mint for adult / lavender for kid) with PENDING tag + Copy/Resend/Revoke chips
  - Mint dashed "+ Invite" CTA card replaces old "Add a family member" — bottom CTA stays for *new* people not in onboarding
  - Old "Add a member without a device" demoted to lighter dashed fallback
  - Back button on member profile bumped — was barely-visible grey `‹ Back`, now white pill with dark text + hitSlop, label expanded to "‹ Back to family"
- **Inviter heads-up message** in chat ([app/(tabs)/index.tsx](app/(tabs)/index.tsx)) — `maybeFireInviteHeadsUp()` on mount + focus. Tinted message: mint for adult acceptance / lavender for kid. **CRITICAL fix**: `clearJustAcceptedFlag()` runs SYNCHRONOUSLY before message-pushing setTimeout to prevent double-fire from concurrent mount+focus calls.

**Receiver side:**
- [app/invite/[token].tsx](app/invite/[token].tsx) — deep link route. Loads invite by token, branches:
  - **Adult flow** (4 steps): welcome splash (orbs) → confirm name+email+password → own brief times → preferences (skip-able) → `markAccepted()` + `setAccount({kind:'adult'})` + sets `onboarding_complete` + `onboarding_just_completed` → routes to `/(tabs)/swipe-world` → tour offer auto-fires
  - **Kid flow** (3 steps): welcome splash (lavender orbs) → pick avatar (8 options) + 4-digit PIN → capability intro tiles → `markAccepted()` + `setAccount({kind:'kid', name, avatar})` → routes to `/(tabs)/kids`
  - Invalid/revoked token → friendly 🤔 "This link doesn't work" screen

**Permission gating:**
- [app/components/MoreSheet.tsx](app/components/MoreSheet.tsx) — loads account on each open, hides **Budget** + **Family** tiles when `isKidAccount()` is true. (Direct route navigation NOT yet gated — kid could type `/our-budget` and reach it. Defer to backend pass.)

**Dev rows for testing on a single device** ([app/(tabs)/settings.tsx](app/(tabs)/settings.tsx) Developer section):
- 🧪 Re-do onboarding (existing)
- 📨 Simulate invite accepted — marks oldest pending as accepted, fires heads-up in chat
- 🔗 Open latest invite as receiver — navigates to `/invite/<token>` of newest pending invite for end-to-end testing
- ↩️ Reset to owner account — switch back to Rich after testing as kid/adult invitee

**Mockup:** [zaeli-invite-mockup.html](zaeli-invite-mockup.html) — 18 frames across 4 acts (inviter open + role/form → share sheet + pending state → adult stripped onboarding + chat landing + heads-up → kid stripped onboarding + Hub landing + heads-up)

### Locked decisions Session 19

- **Brief = 2 windows only**, never 3
- **Brief = structured 3-paragraph prose** (opener / body / one thing), 1 emoji per paragraph max, no win banner
- **Cold-start splash + onboarding splash = same warm-bg + palette-orbs design** (no more dark slate)
- **Tour = 11 stops**, Tutor as HERO at stop 7 with violet treatment + trial badge
- **Tour pill = bottom-LEFT** (right side reserved for chat scroll arrows)
- **Invites = Adult or Kid roles only** (no Helper / granular permissions for v1 — kid access = full app minus Budget + Family management)
- **Invite delivery = iOS share sheet only** (no backend in v1; backend pass adds real token validation)
- **Trust the link** — no approval flow on invite acceptance
- **Account state = local AsyncStorage** (`account_state_v1`) — backend pass migrates to Supabase auth user + JWT claims
- **Invitee onboarding stripped** — Adult 4 steps, Kid 3 steps. Adult lands in chat → tour fires. Kid lands in Kids Hub.

### Critical bugs fixed Session 19

- **Tour finale instead of stop 1** — `🧭 Take the tour` chip from post-onboarding offer was loading stale `currentStop = 'finale'` from AsyncStorage. Fix: chip handler calls `tourReplayFromStart()` first, wipes prior completion state.
- **Inviter heads-up double-fire** — mount + focus effects both calling `maybeFireInviteHeadsUp()` read the same unsurfaced invites before either could clear the flag. Fix: `clearJustAcceptedFlag()` now runs synchronously before the message-pushing setTimeout.
- **Tour progress bar inconsistent steps** — formula `(cur/TOTAL)*100` gave stop 1 = 9% which felt jumpy. Changed to `((cur-1)/(TOTAL-1))*100` so 0%/10%/20%/.../100%. Plus smooth Animated.Value timing.
- **Trial badge clipped at top** — was absolute `top:-10` getting clipped by ScrollView. Now inline at top of card content via right-aligned flexbox row.
- **Tour pill collision with chat scroll arrows** — moved from `right: 16` to `left: 16`.
- **Tour fonts too small** — bumped sizes throughout (eyebrow 12→13, h1 28→32, sub 14→16, cardTitle 22→26, cardSub 14→16+INK2, tryText 13→16, feature pills 11→13, primary CTA 14→16, finale h1 30→34, etc).
- **Family screen status badges hard to tap** — fontSize 9→11/12, padding 7×2→10×5/12×7, action chips promoted to filled mint pills with hitSlop 10.
- **Member profile back button barely visible** — was rgba(10,10,10,0.40) text. Now white pill with dark text + hitSlop, label "‹ Back to family".

### Files touched Session 19

- `lib/brief-firing.ts` — 2 windows only
- `lib/brief-generator.ts` — 3-paragraph prompt rewrite, winBanner stripped from spec/parser/payload/upsert
- `lib/tour-state.ts` — NEW
- `lib/invite-state.ts` — NEW
- `lib/account-state.ts` — NEW
- `app/onboarding/index.tsx` — splash orbs, ReadyStep orbs, Step 2 + Brentwood + brief preview updates, finale sets `onboarding_just_completed`, chat bar removed
- `app/(tabs)/swipe-world.tsx` — splash redesign (warm bg + palette orbs, INK wordmark, coral chaos)
- `app/(tabs)/index.tsx` — bubble unification (zaeliBubble wrap + sky user bubble), brief render Option B, tour offer + tour pill + tour resume + invite heads-up logic, chip handlers for tour/invite/resume
- `app/(tabs)/settings.tsx` — TourReplayView + Replay tour row + 3 dev rows (Simulate accepted, Open latest invite, Reset account)
- `app/(tabs)/family.tsx` — per-member invite status grid, PendingInviteRow, mint Invite CTA card, bigger badges + back button, Anna mock changed to 'invite'
- `app/components/MoreSheet.tsx` — kid account hides Budget + Family tiles
- `app/components/TourBanner.tsx` — NEW reusable
- `app/tour/index.tsx` — NEW route
- `app/invite/index.tsx` — NEW route (role picker + form + share sheet)
- `app/invite/[token].tsx` — NEW receiver route (Adult + Kid flows)
- `app.json` — native splash bg `#1C2330` → `#FAF8F5`

### Mockups produced

- [zaeli-tour-mockup.html](zaeli-tour-mockup.html) — v2, 18 frames, 5 acts
- [zaeli-brief-card-mockup.html](zaeli-brief-card-mockup.html) — 4 options (current + A/B/C/D); B picked
- [zaeli-invite-mockup.html](zaeli-invite-mockup.html) — 18 frames, 4 acts

### Deferred from Session 19 (small)

- **Kid tour = 9 stops** (skip Budget + Family) — ✅ shipped Session 19 quick-wins commit (28 April).
- **Welcome banner inside Kids Hub** for fresh kid invitees — ✅ shipped Session 19 quick-wins commit.
- **Direct-route gating** — ✅ shipped Session 19 quick-wins commit (Budget + Family redirect kid accounts to /kids on mount).
- **Trial-period pill countdown** (post-completion 14-day timer) — Richard explicitly skipped this as "too pushy". Note for future if Stripe integration changes the calculus.
- **Real cross-device invite** — current mock token only works on the inviting device. Backend pass adds Supabase invite tokens + real deep linking.

---

## ══════════════════════════════════
## SESSION 19 QUICK WINS (28 April 2026 — early) ✅
## ══════════════════════════════════

Closed the four small Session 19 deferred items in one commit ([`e22164d`](https://github.com/RDK1981/zaeli/commit/e22164d)):

### A. Kid tour = 9 stops
- New `KID_SKIP_IDS = [9, 11]` in [lib/tour-state.ts](lib/tour-state.ts) (Our Budget + Our Family)
- New `getEffectiveStops()` / `getEffectiveTotal()` helpers — filter by `isKidAccount()`
- `loadTourState()` now also calls `loadAccount()` so account kind is available
- `advanceStop` / `goBackStop` / `getProgressPct` / `replayStop` all step through the EFFECTIVE list
- Tour route eyebrow shows "STOP X OF 9" for kids; bottom-nav last-stop check uses effective index instead of fixed `position === TOTAL_STOPS`
- Chat tour pill shows `X/9`, post-onboarding offer text says "9 stops" (`stopWord = total === 11 ? 'eleven stops' : '${total} stops'`), inactivity prompt uses effective totals
- Settings → Replay tour picker hides Budget + Family rows for kid accounts via `getEffectiveStops()`

### B. Kids Hub welcome banner
- Receiver flow ([app/invite/[token].tsx](app/invite/[token].tsx)) `finishKid()` now sets `kid_just_joined = 'true'` AsyncStorage flag
- [app/(tabs)/kids.tsx](app/(tabs)/kids.tsx) reads + clears flag on mount → renders lavender welcome card with × dismiss above the 3-stat row
- Bonus: kid accounts now AUTO-jump straight into their hub (skipping the kid picker `view = 'select'`) and `selectedChild` is set to their name from `getAccount()`

### C. Direct-route gating
- [app/(tabs)/our-budget.tsx](app/(tabs)/our-budget.tsx) + [app/(tabs)/family.tsx](app/(tabs)/family.tsx) — both call `loadAccount()` on mount, redirect kid accounts to `/(tabs)/kids` via `router.replace`
- Belt-and-braces with MoreSheet's tile hiding — kid can't reach these via deep link, back button, or any other path
- Note: Settings + standalone routes (Tutor, Travel, MySpace) NOT gated — kids may legitimately want to use them with their own context

### D. Calendar month-view glitch fixed
- Root cause: `fetchMonthDayEvents` used `.eq('date', dateStr)` while `fetchMonthDots` used `.gte/.lte` range. If `events.date` column ever has a timestamp/timezone component (which the dots query tolerates), `eq` silently misses
- Fix: switched day query to `.gte(dateStr).lt(nextDayStr)` — same pattern as the dots query

### Plus: incidental config tidies
- `app.json` — Android RECORD_AUDIO permission + `package: com.zaeli.app`
- `package.json` — npm `ios`/`android` → `expo run:*` for native builds

---

## ══════════════════════════════════
## SESSION 20 — ON-DEVICE POLISH ROUND (28 April 2026 — late) ✅
## ══════════════════════════════════

Three bugs surfaced during real device testing — all fixed in one commit. Plus the voice timing decision locked.

### A. Tutor session resume — STUB → real implementation

**Bug:** Gab finished a Read Aloud session, returned to Tutor menu, tapped the "Recent sessions" row → nothing happened. Reason: `goSessionReview(sessionId)` in [app/(tabs)/tutor-child.tsx](app/(tabs)/tutor-child.tsx) was a `console.log` stub. Active sessions called `goPillar(sess.pillar)` which started a NEW session instead of resuming the original.

**Fix** ([app/(tabs)/tutor-session.tsx](app/(tabs)/tutor-session.tsx) + [app/(tabs)/tutor-child.tsx](app/(tabs)/tutor-child.tsx)):
- Tutor-session accepts new optional `resumeSessionId` query param
- New `loadExistingSession(sid)` function:
  1. Fetches session row from `tutor_sessions` (id, pillar, subject, topic, difficulty_band, duration_seconds, hints_used, question_count, status)
  2. Fetches all rows from `tutor_messages` for that session, ordered by `created_at`
  3. Converts each row to a `Message` object (role / content / timestamp) — photo rows show `[Photo uploaded]` placeholder
  4. Hydrates state: messages array, conversationHistory, sessionId, subject, topic, difficultyBand, questionNum, hintsUsed, timer
  5. Sets phase = 'active' if subject was already picked; else 'select'
  6. If session was 'completed', flips status back to 'active' so the exit-save logic on next back-button still works cleanly
- Reset `useEffect` dependency includes `resumeSessionId` so navigating between resume/fresh works
- `goSessionReview` removed entirely. Replaced by `goResumeSession(sess)` — same path for active OR completed sessions
- Row tap handler simplified: `onPress={() => goResumeSession(sess)}` (was `sess.status === 'active' ? goPillar(sess.pillar) : goSessionReview(sess.id)`)
- Works for ALL pillars (Practice, Homework, Read Aloud, Write & Review, Comprehension, Money & Life) since they all share `tutor-session.tsx`
- Falls back to `sendInitialMessage()` if the session row isn't found or load fails

### B. Chat VIEW-query inline cards (across the board)

**Bug:** Asking Zaeli "what's on the shopping list" returned a plain-text wall of 31 items. No `InlineShoppingCard` render. No quick-reply chips. Same problem for meals + tasks queries.

**Root cause:** `send()` only intercepted CALENDAR view queries (`isCalendarQuery`) before the GPT chat path. Shopping/Meals/Tasks fell through to plain GPT, which helpfully typed out everything.

**Fix** ([app/(tabs)/index.tsx](app/(tabs)/index.tsx)):
- Three new keyword arrays: `SHOPPING_VIEW_KEYWORDS` / `MEALS_VIEW_KEYWORDS` / `TASKS_VIEW_KEYWORDS`
- Three new detection functions: `isShoppingViewQuery` / `isMealsViewQuery` / `isTasksViewQuery` — all check `isActionQuery` first so action queries ("add milk to shopping") still go through the tool path
- Three new branches in `send()` after the calendar branch — each fetches data directly + updates the loading reply with intro text + inlineData + quickReplies, then `return`
- Shopping branch: fetches first 4 unchecked items + total count → intro that scales with size ("Just one thing on the list" / "8 items — tap any to tick off" / "31 items — that's a chunky one") → chips: `Open full list` / `Add an item` / `Got it`
- Meals branch: fetches next 7 days of meal_plans → tonight call-out + week count → chips: `Open Meal Planner` / `Plan tomorrow` (or `Plan tonight` if not planned) / `Got it`
- Tasks branch: fetches active todos sorted by due_date → overdue count + intro → chips: `Open Tasks` / `Add a task` / `Got it`
- Chip handlers wired in `handleQuickReply`:
  - `Open full list` → `openShopSheet('list')`
  - `Open Tasks` / `Open To-dos` / `Add a task` → `setPendingChatContext({ type: 'notes_tasks_sheet', tab: 'tasks' })` + `router.navigate('/(tabs)/my-space')`
  - `Add an item` (shopping) / `Add more items` → `startRecording()` (mic for voice add)
  - `Got it` / `All good` / `Thanks` / `Cheers` → just clears the chips on the originating message, leaves the text in feed
- Action queries unaffected — saying "add milk to shopping" still routes to the tool path (action keywords are checked first)

### C. Shopping sheet add-bar layout fix

**Bug:** First time the Shopping sheet opens, the "Add an item…" bar at the bottom is squashed against the bottom edge of the phone (mic + Zaeli buttons partially obscured). After the user taps the add bar to expand it and then closes it again, the layout corrects.

**Root cause:** The sheet wraps content in `<SafeAreaView edges={['bottom']}>`. react-native-safe-area-context's `SafeAreaView` doesn't reliably resolve the bottom inset on first render INSIDE a Modal. Layout settles correctly only after a state-triggered re-measure (which is what tapping expand/collapse triggers).

**Fix** ([app/(tabs)/index.tsx](app/(tabs)/index.tsx)):
- Imported `useSafeAreaInsets()` alongside `SafeAreaView` from `react-native-safe-area-context`
- Read `const insets = useSafeAreaInsets()` once at component mount
- Shopping sheet `SafeAreaView edges={['bottom']}` → `edges={[]}` — no automatic bottom padding application
- List + Pantry add-bar wrappers now own the bottom inset explicitly:
  - Keyboard CLOSED: `paddingBottom: Math.max(insets.bottom, 8)`, `marginBottom: 0`
  - Keyboard OPEN: `paddingBottom: 2 (iOS) / 4 (Android)`, `marginBottom: Math.max(shopKbHeight - insets.bottom, 0)`
- Spend tab ScrollView contentContainer `paddingBottom: 50` → `50 + insets.bottom` (no add bar, just receipts — needed explicit padding so last receipt isn't tucked under home indicator)

### D. Voice (ElevenLabs) timing — LOCKED

Locked decision: voice integration goes **AFTER backend pass**, not before. Reasons:
- Backend pass unlocks real users (auth, push, real cross-device invites). Voice on a single-device prototype demos well but can't actually go live yet
- Voice needs its own design conversation (when does it play, playback settings, cost controls) — that takes time
- Best reveal moment = TestFlight build with voice + real auth + real push all together
- Risk: if voice is wired now and chat UX shifts during backend work, we re-do the integration

Small exception: if voice gets wired pre-backend, it should be ONLY for the brief (already locked UX) — not chat replies or other surfaces.

### Locked decisions Session 20

- **Chat VIEW queries → inline render**, not text walls. Pattern: detect via keyword array → check `isActionQuery` first to exclude actions → fetch data directly → `updateMsg(replyId, { text, inlineData, quickReplies, isLoading: false })` → `return`. Apply this anywhere a query naturally maps to existing inline-card rendering.
- **SafeAreaView inside Modal is unreliable on first render** — for any element whose position depends on bottom safe area, OWN the inset via `useSafeAreaInsets()` and apply `paddingBottom` directly. Don't rely on `<SafeAreaView edges={['bottom']}>` alone.
- **Tutor session resume** = `resumeSessionId` query param to tutor-session route. Loads from `tutor_messages` ordered by created_at, hydrates state including conversationHistory. Always flips status 'completed' → 'active' on resume so exit-save logic stays clean.
- **Voice (ElevenLabs) AFTER backend pass.** Don't wire it now — would risk re-work when chat UX shifts. Only exception: brief-only voice (since brief render is locked).

### Files touched Session 20

- `lib/tour-state.ts` — Session 19 quick wins (kid skip IDs + effective stops/total + account-aware advance/back/progress/replay)
- `app/tour/index.tsx` — Session 19 quick wins (effective list for eyebrow + bottom nav)
- `app/(tabs)/our-budget.tsx` + `app/(tabs)/family.tsx` — Session 19 quick wins (kid account redirect)
- `app/(tabs)/kids.tsx` — Session 19 quick wins (welcome banner + auto-select kid's hub)
- `app/(tabs)/settings.tsx` — Session 19 quick wins (Replay tour view shows effective stops)
- `app/invite/[token].tsx` — Session 19 quick wins (sets kid_just_joined flag)
- `app/(tabs)/tutor-child.tsx` — Session 20 (goResumeSession replaces stub)
- `app/(tabs)/tutor-session.tsx` — Session 20 (loadExistingSession + resumeSessionId param)
- `app/(tabs)/index.tsx` — Session 20 (3 view-query branches in send + 3 keyword arrays + chip handlers + useSafeAreaInsets + Shopping sheet edges + add-bar paddings + Spend tab paddingBottom)

### Test paths

**Tutor resume:** Open Tutor → pick child → Read Aloud (or any pillar) → say a few things → back → see "Recent sessions" row → tap it → session reopens with all messages + timer in place. Continue talking, hit back → saves cleanly.

**Chat view-query inline cards:**
- "what's on shopping list" → soft intro + InlineShoppingCard + chips
- "what's for dinner" → tonight call-out + InlineMealsCard + chips
- "any tasks for me" → top-of-pile + overdue count + InlineTodos + chips
- "add milk to shopping" → still goes to tool path (action keyword wins)

**Shopping add-bar layout:** Open Shopping sheet → "Add an item…" bar should sit cleanly above home indicator on FIRST open (no need to expand-collapse to fix).

---

## ══════════════════════════════════
## SESSION 21 — BACKEND PASS KICKOFF (14–18 May 2026) ✅
## ══════════════════════════════════

Four-phase backend migration shipped + a chat bar photo bug fix. Largest single block of backend infrastructure work to date. All four phases verified end-to-end on device.

### A. Backend Phase 1 — Auth foundation (commit `91dbf1e`)

First real Supabase auth in the project. Sign-up + sign-in via DB trigger, atomic family + profile creation, AsyncStorage session persistence, polished sign-in UI with palette orbs matching onboarding.

**NEW SQL: `supabase-auth-tables.sql`** (idempotent)
- `public.families` table (id, name, created_at)
- `public.profiles` table (id PK = auth.users.id, family_id, kind ENUM 'owner'/'adult'/'kid', name, email, avatar, colour, year_level, brief_morning_at, brief_evening_at, created_at, updated_at)
- `handle_new_user()` SECURITY DEFINER trigger on `auth.users` INSERT — reads `name` + `family_name` from `raw_user_meta_data`, creates a families row + matching profile in one transaction. Avoids the classic Supabase RLS-vs-fresh-session chicken-and-egg.
- `public.current_family_id()` helper — single source of truth for "what family does this user belong to". Used by every RLS policy downstream.
- RLS policies: "Read own profile" (id = auth.uid()), "Read family profiles" (family_id = current_family_id()), "Update own profile".

**NEW `lib/auth.ts`** — public API: `signUpOwner({email, password, name, familyName?})` / `signInWithPassword({email, password})` / `signOut()` / `getSession()` / `getCurrentUserId()` / `loadProfile()` / `getProfile()` / `getCurrentFamilyId()` / `onAuthChange(cb)`. Module-level `_profile` cache for sync reads.

**NEW `app/(auth)/sign-in.tsx`** — three states: 'sign-in' | 'sign-up' | 'check-email'. Palette orb splash design (matches onboarding). Layout polish: explicit `lineHeight` on every text style to prevent 'y'/'g' descender clipping (was cutting off "family" and "Sign in"). Bottom-right sky orb removed (was overlapping Sign in button). `zIndex: 1` on ScrollView.

**`app/_layout.tsx`** — auth guard with session check on mount. `onAuthChange` listener calls `invalidateAccount()` + `loadProfile()` on SIGNED_IN. Returns blank `<View>` until `loaded && authed !== null`.

**Critical setup**: Disable "Confirm email" in Supabase dashboard for dev (otherwise sign-up sends confirmation email and stalls).

### B. Backend Phase 2a — RLS on data tables + DUMMY_FAMILY_ID swap (commit `24aa73c` then fixes in `4884290`)

The big lift. Move from the hardcoded `DUMMY_FAMILY_ID = '00000000-0000-0000-0000-000000000001'` constant scattered across 12 files to dynamic `getFamilyId()` resolving at query time via the authenticated profile.

**NEW SQL: `supabase-data-rls.sql`**
- Standard RLS policies (SELECT/INSERT/UPDATE/DELETE) added via DO-block iterating 19 family-scoped tables: events, todos, shopping_items, pantry_items, receipts, meal_plans, recipes, family_members, zaeli_briefs, personal_tasks, kids_jobs, kids_rewards, kids_points_log, kids_pending_approvals, kids_trivia_history, tutor_sessions, tutor_progress, reminders, notes
- All policies: `family_id = public.current_family_id()`
- `tutor_messages` gets session-aware policy: `session_id IN (SELECT id FROM tutor_sessions WHERE family_id = current_family_id())`
- `claim_legacy_data()` helper RPC — reassigns rows on DUMMY_FAMILY_ID to caller's real family (returns per-table counts for verification)

**NEW `lib/family.ts`** — `getFamilyId()` calls `getCurrentFamilyId()` from auth.ts. If profile not loaded yet (race condition), falls back to DUMMY_FAMILY_ID + logs once + auto-triggers `loadProfile()` to self-heal.

**99 swaps across 12 files** — perl word-boundary regex `\bFAMILY_ID\b` → `getFamilyId()`. Files: `app/(tabs)/index.tsx` (99 refs — the bulk), `dashboard.tsx` (9), `my-space.tsx` (11), `family.tsx` (11), `kids.tsx` (11), `tutor.tsx` (2), `tutor-child.tsx` (3), `tutor-session.tsx` (5), `calendar.tsx` (9 — DUMMY_FAMILY_ID variant), `lib/tutor-summaries.ts` (6). `lib/zaeli-memory.ts` and `lib/notifications.ts` kept DUMMY_FAMILY_ID as imported constant for default-parameter fallback.

**Three NEW view-query branches added to `send()` in index.tsx** (Shopping/Meals/Tasks "what's on…" queries). These had to go BEFORE the calendar branch — otherwise CALENDAR_KEYWORDS' "what's on" matched first and intercepted shopping queries with a calendar render.

### C. Backend Phase 2a follow-up fixes (commit `4884290`) — session persistence + RLS finally working

After initial Phase 2a, three issues surfaced during on-device testing:

**Issue 1: User signed out on every reload.** Root cause: Supabase auth defaulted to `window.localStorage` which doesn't exist in RN. Fix in `lib/supabase.ts`:
- Wire `AsyncStorage` as `auth.storage`
- `react-native-url-polyfill/auto` import (required for RN auth — Supabase tokens don't serialize properly without it)
- `AppState` listener to call `supabase.auth.startAutoRefresh()` / `stopAutoRefresh()` on foreground / background
- Required `npx expo start --dev-client --clear` after install

**Issue 2: `lib/family.ts` warned-once fallback hardening.** When `getFamilyId()` called before profile cache populated, log once + auto-trigger `loadProfile()`. Surfaces race conditions cleanly + self-heals.

**Issue 3 (the big one): Shopping list still returned 0 rows despite all auth context correct.**

Diagnosed end-to-end:
- ✅ JWT working (`auth_uid: 700edaa4-...`)
- ✅ Function returns right family (`family_id_from_fn: 51dff810-...`)
- ✅ Profile row exists
- ❌ Query returned `rows: 0`

Cause: `current_family_id()` SECURITY DEFINER function was created without `SET search_path = public, auth`. Inside SECURITY DEFINER context running as `postgres` role, `auth.uid()` didn't resolve and the function silently returned NULL. Then `family_id = NULL` was always false → zero rows.

Compounded by a SECOND silent failure: original `supabase-data-rls.sql` DO-block had rolled back during its first run (probably because the function existed at the wrong moment) — so RLS was ON with ZERO policies, which is Postgres' deny-everything default.

**Fix:**
1. `CREATE OR REPLACE FUNCTION public.current_family_id() ... SET search_path = public, auth ...` — auth.uid() resolves cleanly inside SECURITY DEFINER
2. Re-ran the policy DO-block (idempotent DROP IF EXISTS + CREATE) — all 19 tables got their 4 policies
3. Verified end-to-end: shopping list, calendar, meals, tasks, kids hub, tutor — all rendered correctly under signed-in auth

**Lesson locked**: any SECURITY DEFINER function that calls `auth.uid()` MUST have `SET search_path = public, auth`. No exceptions.

### D. Backend Phase 2b — invite tokens + tour state to Supabase (commit `a632852`)

Two state libs migrated from AsyncStorage to Supabase so they work cross-device. Public API surface preserved on both libs so call sites in chat, family, tour route, and settings replay didn't change.

**NEW SQL: `supabase-invites-tour.sql`**
- `public.invite_tokens` table (token PK + family_id + role + name + phone + status + surfaced_heads_up + accepted_user_id + inviter_user_id + timestamps)
- 4 RLS policies on invite_tokens scoped by `family_id = current_family_id()` — inviters only see their own family's invites
- SECURITY DEFINER RPC `public.get_invite_by_token(text)` → returns jsonb. **GRANT EXECUTE TO anon** so receivers without a session can lookup by token without RLS visibility. Token IS the secret — same security model as Stripe idempotency keys / password reset links.
- SECURITY DEFINER RPC `public.accept_invite(text, uuid)` → marks invite accepted + records timestamp. Also anon-callable.
- `profiles.tour_state JSONB` column for tour state persistence

**`lib/invite-state.ts` rewrite**
- Inviter side: `loadInvites/getInvites/getPendingInvites/findByToken/createInvite/markAccepted/resendInvite/revokeInvite` all preserved but now backed by Supabase (RLS-scoped SELECT to hydrate the module cache, mutations write through to DB)
- `createInvite` resolves family_id from current user's profile, INSERTs to invite_tokens with retry-on-token-collision (5x for unique violation)
- NEW `lookupInviteByToken(token)` and `acceptInviteRemote(token, userId)` for the receiver-side flow — both go through the SECURITY DEFINER RPCs so no session required

**`lib/tour-state.ts` rewrite**
- Source of truth: `profiles.tour_state` JSONB when signed in. AsyncStorage stays as offline fallback + pre-auth path (kid receivers don't have a Supabase user yet — Phase 2d)
- `persist()` is write-through: AsyncStorage fire-and-forget + `profiles.tour_state` UPDATE if signed in. Cache is authoritative locally between persist() and next loadTourState()
- All 16 public exports unchanged so /tour route + chat tour pill + settings replay picker work as-is
- Inline emoji unicode escape sequences (`📅` etc) replaced with literal emoji characters since they were rendering literally in some JSX text contexts — no functional change

**`app/invite/[token].tsx`** — receiver flow updated: `loadInvites + findByToken` → `lookupInviteByToken` (one RPC, no AsyncStorage), `markAccepted` → `acceptInviteRemote`

### E. Backend Phase 2c — Settings preferences to Supabase (commit `8b7d543`)

Smallest of the four phases. Same write-through pattern as tour-state.

**NEW SQL: `supabase-user-prefs.sql`** — `ALTER TABLE profiles ADD COLUMN user_preferences jsonb`. No new RLS — profiles already has the right policies.

**NEW `lib/user-prefs.ts`** — same shape as `lib/tour-state.ts`: module-level cache, `sanitise()` for forward-compat (extra keys ignored, missing keys filled from DEFAULT_PREFS), `persist()` write-through to AsyncStorage + `profiles.user_preferences` UPDATE if signed in. Public API: `loadPrefs / getPrefs / updatePref / savePrefs / invalidateCache + DEFAULT_PREFS + Prefs` type. All 15 settings fields preserved (briefMorningTime, briefEveningTime, brief on/off, notification toggles, quiet hours, sound + vibration, memory learning).

**`app/(tabs)/settings.tsx`** — removed the inline `Prefs` interface, `DEFAULT_PREFS`, `PREFS_KEY`, and inline `loadPrefs/savePrefs` functions (now in lib). Imports from `lib/user-prefs`. `updatePref()` still updates local React state for immediate re-render, then fire-and-forgets the write-through via `persistUpdatePref()`.

### F. Chat bar photo upload bug (commit `7b125d4`)

Surfaced during testing after Phase 2c. User taps camera icon → picker opens → user selects → nothing visible happens.

**Root cause — three combined issues:**
1. **Missing thumbnail preview.** `pendingImage` state set on photo selection but never rendered. User had zero feedback that anything happened.
2. **Send button disabled with photo-only.** Opacity check was `!input.trim()` — stayed at 30% even when pendingImage was present.
3. **Send tap blocked with photo-only.** `onTouchStart` guard was `if (input.trim())` which rejected photo-only attempts.

**Fix:**
- 64px thumbnail above chat bar pill with "Photo ready — tap send" label + small ✕ dismiss
- Opacity check: `!input.trim() && !pendingImage`
- Tap guard: `if (t.trim() || pendingImage)` — calls `send('')` when no text but photo pending. The existing `send()` guard already accepts empty text + image (line 4185 `if ((!text && !imageUri) || loading) return`).

### Locked decisions Session 21

- **SECURITY DEFINER functions calling `auth.uid()` MUST have `SET search_path = public, auth`.** Otherwise auth.uid() silently returns NULL inside the function's role context. Single biggest lesson of this whole backend pass.
- **State lib pattern is locked**: module-level cache for sync render reads + `loadX()` hydrates from profile JSONB (or table) when signed in / AsyncStorage when not + `persist()` write-through to both. Used in `lib/tour-state.ts` and `lib/user-prefs.ts`. Future state libs should follow this exact pattern.
- **Receiver-side data lookups via anon-callable SECURITY DEFINER RPCs**, not direct table queries. RLS would otherwise hide every row from anon. Token IS the secret.
- **Supabase SQL editor only shows the LAST query result** when running multiple queries together — known UX quirk. Run verification queries individually if you want all results.
- **`pg_class.relrowsecurity = true` with no policies = deny-everything** by default. Always verify both RLS-on AND policies-exist when debugging "everything's empty" symptoms.
- **For SQL backfills that need to bypass RLS during dev**: `ALTER TABLE x DISABLE ROW LEVEL SECURITY` → `UPDATE x SET ...` → `ALTER TABLE x ENABLE ROW LEVEL SECURITY`. `SET LOCAL row_security = off` does NOT work for non-postgres roles.
- **Voice (ElevenLabs) stays deferred to after Phase 2 backend pass.** Session 20 decision still holds.

### Files touched Session 21

**NEW files:**
- `supabase-auth-tables.sql`
- `supabase-data-rls.sql`
- `supabase-invites-tour.sql`
- `supabase-user-prefs.sql`
- `lib/auth.ts`
- `lib/family.ts`
- `lib/user-prefs.ts`
- `app/(auth)/sign-in.tsx`

**MODIFIED:**
- `app/_layout.tsx` — auth guard + onAuthChange listener
- `lib/supabase.ts` — AsyncStorage storage + url-polyfill + AppState refresh
- `lib/invite-state.ts` — full rewrite to use Supabase + new receiver RPC functions
- `lib/tour-state.ts` — full rewrite to use profile JSONB + AsyncStorage fallback
- `lib/zaeli-memory.ts` + `lib/notifications.ts` — DUMMY_FAMILY_ID kept as imported default-parameter fallback
- `app/invite/[token].tsx` — receiver flow uses new RPC functions
- `app/(tabs)/settings.tsx` — inline prefs removed, uses lib
- `app/(tabs)/index.tsx` — 99 getFamilyId() swaps + chat bar photo fix (thumbnail + photo-only send) + 3 view-query branches added earlier same phase
- `app/(tabs)/dashboard.tsx`, `my-space.tsx`, `family.tsx`, `kids.tsx`, `tutor.tsx`, `tutor-child.tsx`, `tutor-session.tsx`, `calendar.tsx` — getFamilyId() swaps
- `lib/tutor-summaries.ts` — getFamilyId() swaps

### What's next — Phase 2d

The remaining backend piece: **real auth wiring at invite acceptance.** Adult/kid invitees should actually create Supabase auth users, get profiles linked to the inviter's family_id, and sign in on a real second device. Modifies `handle_new_user()` trigger to detect `invite_token` in `raw_user_meta_data` and create profile linked to inviter's family_id (instead of new family). Updates `signUpFromInvite()` helper in `lib/auth.ts`. Updates `app/invite/[token].tsx` to do real signup + auto-mark invite accepted with new user id.

After Phase 2d: cross-device verification on a real second device. Then memory wiring (Phase 2f), then external integrations (Push, Stripe, deep links — Phase 3), then ship-ready cleanup (Phase 4).

---

## ══════════════════════════════════
## SESSION 22 — BACKEND PHASE 2d + MULTI-USER SAFETY (20 May 2026) ✅
## ══════════════════════════════════

Phase 2d done. Real auth at invite acceptance is wired and verified end-to-end. Six combined multi-user safety fixes surfaced during testing, plus a fresh-invitee welcome polish — all shipped in one commit.

### A. Real auth at invite acceptance (the headline)

**NEW SQL: `supabase-invite-signup.sql`** (idempotent)
- `handle_new_user()` trigger now branches on whether `raw_user_meta_data` includes an `invite_token`:
  - **No token** (original owner flow): create fresh families row + matching owner profile.
  - **With token** (NEW invitee flow): validate token (must exist, not revoked, not already accepted). Create profile linked to the INVITE's `family_id` (not a new one). Use `invite.role` as the new profile's `kind` ('adult' or 'kid'). Mark the invite_tokens row accepted with the new user's id — all in one transaction.
- Bad tokens (missing/revoked/already-accepted) raise an exception → Postgres rolls back the `auth.users` INSERT → no orphan users.
- `SET search_path = public, auth` preserved (the Phase 2a lesson lives on).

**`lib/auth.ts`** — NEW `signUpFromInvite({inviteToken, email, password, name})` helper. Wraps `supabase.auth.signUp` with `invite_token` in `raw_user_meta_data` so the trigger can branch on it. Same 250ms post-signup wait as `signUpOwner()` for trigger settle.

**`app/invite/[token].tsx`**:
- `finishAdult` now collects email + password from the form and calls `signUpFromInvite` + `loadProfile` so `getCurrentFamilyId()` resolves on the next screen. Real auth, real session.
- `finishKid` generates a synthetic email (`kid-<token>@invitees.zaeli.app`) + uses `<token>-<PIN>` as the password (Supabase requires 6+ chars; 4-digit PIN alone is too short). Kid sign-IN ergonomics for separate device use come in a later phase — they just stay signed in via AsyncStorage session persistence for now.
- `AdultAccountStep` validates email (`/^\S+@\S+\.\S+$/`) + password length (≥ 6) client-side. Continue button greys out + disabled until valid so we don't fail 3 steps later with a confusing alert.
- Signup errors wrap in user-friendly `Alert.alert` — "An account already exists with that email. Try a different one, or sign in." if duplicate, else raw message.

### B. Multi-user safety — six fixes surfaced during testing

Once we could actually switch users mid-session, six leak bugs surfaced. All fixed in the same commit:

**1. Heads-up filter is inviter-only.** Previous filter used `accepted_user_id !== currentUserId` which correctly hid the heads-up from the accepter themselves, BUT still surfaced it to other family members (e.g. GMa would see "Test3 just joined" even though she didn't send the invite). Now uses `inviter_user_id === currentUserId` — only the actual sender of the invite sees it. Added `inviter_user_id` to the `Invite` type + cache SELECT + `rowToInvite()` mapping. Plus `getProfile()?.id ?? null` resolved sync via the auth module cache. Fail-closed: returns `[]` if profile not loaded yet (no false positives during the loading race window).

**2. Chat persistence per-user.** `useChatPersistence` was keyed by channel only (`zaeli_chat_home.json`) — globally shared across all users. After auth switch, the new user would load the PREVIOUS user's chat history from disk. Fix: hook now subscribes to `supabase.auth.onAuthStateChange`, tracks `userId` state, and scopes the filename with it (`zaeli_chat_home_<userId>.json` or `_anon` for no session). When user changes, scopedKey changes, load effect re-runs, state resets to empty, new file (if any) loads.

**3. Local chat messages state in index.tsx resets on user switch.** Even with the hook fixed, the local `messages` state array in chat still held the previous user's messages. Detect via the `chatLoaded` true→false transition (signal that the persistence hook is reloading because user changed). On that transition: clear local `messages`, reset `persistenceHasLoaded.current = false`, reset `lastBriefWindowRef` + `lastBriefDateRef` so the brief re-fires fresh for the new user.

**4. tour-state + user-prefs don't fall back to AsyncStorage when signed in.** Previously: if a fresh user's `profiles.tour_state` (or `user_preferences`) was null, the lib fell back to AsyncStorage — which still held the previous user's data. Silent leak. Now: when a session exists, profile is the ONLY source of truth (even if null → start fresh with DEFAULT_STATE). AsyncStorage fallback ONLY fires when no session (pre-auth flows like kid receivers mid-onboarding). Same pattern in both libs.

**5. All module caches invalidated on auth change.** `_layout.tsx`'s `onAuthChange` listener now also calls `invalidateTourCache()` + `invalidatePrefsCache()` + `resetCache()` (invites) alongside the existing `invalidateAccount()`, on BOTH `SIGNED_IN` and `SIGNED_OUT` events. NEW `invalidateCache()` exports added to `lib/tour-state.ts` and `lib/user-prefs.ts` (the others already had them). Each lib's next `loadX()` re-hydrates from the correct profile.

**6. Fresh-invitee welcome polish.** New invitees who land in chat for the first time would see the family brief (because brief is family-scoped — they're in the family). Mid-context: "One thing: bins go out tomorrow night…" Jarring as someone's first ever Zaeli message. Fix: in chat mount effect, check `onboarding_just_completed === 'true'` AND `getProfile()?.kind !== 'owner'`. If both true: suppress `tryFireBrief`, push a warm welcome message instead — "Hey <name> 👋 Welcome in. Family stuff is already wired up — you'll get your first proper brief tomorrow morning. Until then, ask me anything." Tour offer still fires below. The flag gets cleared by `maybeFireTourOffer` so subsequent sessions show the normal family brief.

### C. Debugging insights from testing

**The "nested invites" gotcha.** During testing Richard created multiple test invites in a row. Each time, the dev row "Open latest invite as receiver" signed him in as the PREVIOUS invitee, and then when he tapped "+ Invite" again, the new invite's `inviter_user_id` was that previous invitee's user id — not Rich's. So when Rich signed back in, he didn't see heads-ups for those chained invites (correctly — he wasn't the inviter). The inviter-only filter is functioning as designed; just need to be careful in the test workflow to STAY as Rich (or whoever you want as inviter) when creating each test invite.

**Brief leak vs family brief — important distinction.** When a new family member lands in chat, the family brief firing for them is NOT a leak — it's correct. The brief is keyed by `family_id + date + window` in `zaeli_briefs`. Different users in the same family see the same brief. That's the design. The welcome polish (fix #6) is a UX layer on top — first-session invitees don't get the brief because mid-context "bins go out tomorrow" is a bad first impression. Their second session onwards, they get the brief normally.

### Locked decisions Session 22

- **Real cross-device invite works end-to-end via DB trigger.** No app-side workaround needed — the trigger atomically validates + creates profile + marks invite accepted. If the trigger raises, the auth user creation rolls back. No orphans, no partial state.
- **Kid sign-up uses synthetic email + token+PIN password.** They stay signed in via AsyncStorage session persistence. Kid sign-IN ergonomics (separate device, lost PIN recovery, etc) come in a later phase.
- **Adult signup form validates client-side** before allowing Continue. Email regex + password length 6+. Otherwise sign-up failures land 3 steps later in a confusing alert.
- **Chat persistence is per-user** by Supabase user id. The old global file (`zaeli_chat_home.json`) becomes orphaned on first new-user load — that's one-time and acceptable for dev.
- **When signed in, profile JSONB is the ONLY source of truth** for tour state + user prefs. No AsyncStorage fallback in that path. AsyncStorage stays as offline / pre-auth fallback only.
- **All module caches MUST be invalidated on auth change.** `_layout.tsx` onAuthChange is the single place this happens. Future per-user state libs (memory wiring etc) should add their `invalidateCache()` to the list.
- **Heads-up filter = inviter-only.** `inviter_user_id === currentUserId`. Other family members don't get heads-ups for invites they didn't send.
- **Fresh invitees suppress the family brief on first session.** Warm welcome message instead. Triggered by `onboarding_just_completed` flag + `profile.kind !== 'owner'`. Flag cleared by `maybeFireTourOffer` so it's one-shot.

### Files touched Session 22

**NEW:**
- `supabase-invite-signup.sql` — updated handle_new_user trigger

**MODIFIED:**
- `lib/auth.ts` — NEW signUpFromInvite() + updated docstring
- `lib/invite-state.ts` — inviter_user_id field + cache SELECT + heads-up filter (inviter-only)
- `lib/tour-state.ts` — no-AsyncStorage-fallback when signed in + NEW invalidateCache()
- `lib/user-prefs.ts` — no-AsyncStorage-fallback when signed in (already had invalidateCache)
- `lib/use-chat-persistence.ts` — per-user scopedKey via auth.onAuthStateChange subscriber
- `app/_layout.tsx` — invalidate all module caches on SIGNED_IN/SIGNED_OUT
- `app/invite/[token].tsx` — finishAdult real signup, finishKid synthetic email signup, client-side form validation, error alerts
- `app/(tabs)/index.tsx` — local messages state reset on user switch + fresh-invitee welcome polish

### What's next — Phase 2e + beyond

- **Phase 2e:** Real cross-device verification — sign up an invitee on a SECOND physical device (not via the same-device dev row) and confirm everything works.
- **Phase 2f:** Memory wiring — Settings → Memory view connected to real `family_insights` / `family_milestones` / `conversation_memory` tables.
- **Phase 3:** External integrations — Push notifications scheduled to brief times, Stripe customer portal WebView, real cross-device deep links (`zaeli.app/i/<token>`).
- **Phase 4:** Cleanup + ship-ready — Remove dev rows, LANDING_TEST_MODE=false, expo-document-picker for Our Budget CSV (EAS rebuild), share extension (EAS), GDPR / export data / privacy WebViews.

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
Phase 14m: Camera picker       ✅ Session 14 — chat bar camera opens Add-to-Chat sheet (Camera/Photos)
Phase 15a: MoreSheet restructure ✅ Session 15 — NAVIGATE top, ACCOUNT section, bigger icons/fonts
Phase 15b: Cross-sheet hamburger ✅ Session 15 — Calendar/Shopping/Meals/Notes&Tasks headers + Option A stacked
Phase 15c: Modal stacking fixes ✅ Session 15 — onDismiss, fallback timeout, backdrop guard, sync onAction
Phase 15d: Chat bar V2         ✅ Session 15 — single pill Tutor-style, 60px tall, 44×44 buttons. Tutor matched.
Phase 15e: Splash polish       ✅ Session 15 — sky blue a+i, lavender orbs, i-dot fix, once-per-session flag
Phase 15f: Dashboard cards     ✅ Session 15 — tap-anywhere-to-expand, 35/65 bento, back arrow
Phase 15g: 2-dot indicator     ✅ Session 15 — killed entirely
Phase 15h: Legacy pill         ✅ Session 15 — "← Dashboard" removed from Chat header
Phase 15i: Chat "Home" label   ✅ Session 15 — renamed from "Chat"
Phase 15j: Live picker option  ✅ Session 15 — removed, only Camera/Photos now

Phase 16: AI Brief system      ✅ Session 16 — 3 windows, Sonnet + prompt caching, zaeli_briefs cache, dark slate bubble in chat feed, data_signature detects drift, held-brief during active chat
Phase 17a: Our Budget v1       ✅ Session 17 — full UI shell built (3 tabs, CRUD, screenshot vision)
Phase 17b: Our Budget v2 PIVOT ✅ Session 17 — PURE PLANNER (no live tracking), line items on fixed, single target on variable, AI helper for suggestions only, mint palette, Option D chart, Savings tab
Phase 18:  Settings            ✅ Session 17 — main/notifications/memory views, DateTimePicker for brief times, AsyncStorage persistence
Phase 19:  Travel sheet        🔨
Phase 20:  Tutor session resume 🔨 ← reload conversation from tutor_messages when resuming active session
Phase 21:  Calendar month glitch ✅ Session 16 — null guard + userTapped flag + today anchor + bigger arrows
Phase 22:  Brief polish        ✅ Session 17 — quiet-day persona, loading placeholder, black star, peach bubble, softer chip, dismiss works
Phase 23:  Old brief cleanup   ✅ Session 17 — ~380 lines removed (dead state, old fn, generatePostCardPrompt, renderCardStack, lavender card, stale-session reset)
Phase 24:  Standard header     ✅ Session 17 — 17px/700Bold/0.72 page label rule · 40px wordmark rule · applied across 5 screens
Phase 25:  Kids keyboard fix   ✅ Session 17 — component-as-JSX anti-pattern fixed (call as fn)
Phase 26:  Calendar keywords   ✅ Session 17 — narrowed to intent-bearing phrases, no more bare time-refs hijacking chat
Phase 27:  Backend pass        🔨 ← batched: Supabase migrations, push notifications, auth, Stripe, memory wiring, CSV document picker, share extension
Phase 28:  Travel module       ✅ Session 18 — standalone route, Trip Stack + Trip Detail (4 tabs), BookingSheet unified add/edit, Pure Planner budget (auto-sum Booked), tap-to-edit Who's Going, keyboard fix (KAV inside card), mint/sky palette per new design rules
Phase 29:  Keyboard fix        ✅ Session 18 — KAV moved inside SheetShell card + keyboardShouldPersistTaps='handled' on all sheet ScrollViews (travel + our-budget)

Phase 30a: Brief v3 (2 windows)  ✅ Session 19 — reduced from 3 to 2 (morning + evening). Evening covers tomorrow-prep so morning brief doesn't need to.
Phase 30b: Brief render Option B ✅ Session 19 — peach (morning) / lavender (evening) tinted bubble + time-of-day pill + structured 3-paragraph prose + win banner KILLED
Phase 30c: Brief generator v3   ✅ Session 19 — 3-paragraph structure prompt rewrite, 1 emoji per paragraph max, winBanner stripped from spec/parser/payload/upsert
Phase 31a: Onboarding polish    ✅ Session 19 — splash orbs (Welcome + Ready), wordmark i-dot fix, "Hey 👋 I'm Zaeli", emoji throughout, "homework" replacement, Brentwood example bigger, brief preview Option B, chat bar removed, "Let's go" CTA
Phase 31b: Cold-start splash    ✅ Session 19 — warm bg + palette orbs (matches onboarding), INK wordmark, coral "chaos", app.json native splash bg #FAF8F5
Phase 31c: Chat bubble unification ✅ Session 19 — Zaeli text wrapped in soft-grey bubble (BBL 6), user bubble sky #E8F4FD, both Regular 17/26
Phase 32a: Tour state machine   ✅ Session 19 — lib/tour-state.ts (11 STOPS data + load/advance/back/skip/complete/replay + inactivity helpers), AsyncStorage tour_state_v1
Phase 32b: Tour route           ✅ Session 19 — app/tour/index.tsx (header + animated progress + per-stop card + bottom nav + finale celebration). Tutor stop 7 = HERO (violet, trial badge, secondary CTA, price line)
Phase 32c: Tour pill + chip     ✅ Session 19 — bottom-LEFT pill on chat when mid-tour. 🧭 Take the tour chip → replayFromStart() + navigate
Phase 32d: First-time banner    ✅ Session 19 — TourBanner reusable + wired into Shopping/Meals/Calendar/Tasks. Per-sheet AsyncStorage flag
Phase 32e: Settings replay      ✅ Session 19 — Replay tour view + 11-row per-stop picker + last-completed date
Phase 32f: Inactivity prompt    ✅ Session 19 — 24h+ → "We were on [stop]" with Continue/Skip/Not now chips. Synchronous flag-clear prevents double-fire
Phase 33a: Invite state         ✅ Session 19 — lib/invite-state.ts (mock token + SMS composer + Copy/Resend/Revoke + heads-up windowing) + lib/account-state.ts (owner/adult/kid)
Phase 33b: Invite inviter       ✅ Session 19 — /invite role picker (no emoji) + form + iOS share sheet. Family screen per-member status grid + bigger badges + PendingInviteRow + mint CTA card
Phase 33c: Invite receiver      ✅ Session 19 — /invite/[token] with Adult flow (4 steps → chat → tour) and Kid flow (3 steps → Kids Hub). Invalid-link state included
Phase 33d: Inviter heads-up     ✅ Session 19 — chat pushes mint/lavender Zaeli message on invite acceptance. Synchronous flag-clear prevents double-fire
Phase 33e: Kid permission gating ✅ Session 19 — MoreSheet hides Budget + Family for kid accounts. (Direct route guards deferred)
Phase 34: Kid tour 9 stops     ✅ Session 19 quick wins (28 Apr) — KID_SKIP_IDS [9, 11], getEffectiveStops/Total, all nav/progress/replay account-aware. Settings picker + chat pill + inactivity prompt + post-onboarding offer all use effective totals
Phase 35: Kids Hub welcome     ✅ Session 19 quick wins (28 Apr) — kid_just_joined AsyncStorage flag set in finishKid, lavender welcome card with × dismiss above 3-stat row. Bonus: kid auto-jumps to their own hub
Phase 36: Direct-route gating  ✅ Session 19 quick wins (28 Apr) — Budget + Family screens loadAccount + redirect kid accounts to /kids on mount
Phase 37: Calendar month-view  ✅ Session 19 quick wins (28 Apr) — fetchMonthDayEvents .eq('date') → range query .gte/.lt to match fetchMonthDots' tolerance for timestamp/timezone column types

Phase 38a: Tutor session resume ✅ Session 20 (28 Apr) — Phase 20 from earlier sessions finally unblocked. resumeSessionId param to tutor-session, loadExistingSession hydrates from tutor_messages, status flips 'completed' → 'active' on resume so exit-save stays clean. Replaces goSessionReview stub. Works for all 6 pillars
Phase 38b: Chat view-query inline cards ✅ Session 20 — Shopping/Meals/Tasks "what's on..." queries intercepted before GPT chat path, render existing inline cards + chips. Action queries unaffected
Phase 38c: Shopping add-bar layout ✅ Session 20 — useSafeAreaInsets() for explicit bottom inset on add bar. SafeAreaView edges='bottom' was unreliable on first render inside Modal
Phase 38d: Voice (ElevenLabs)   🅿️ DEFERRED — explicit decision to do AFTER backend pass. Brief-only voice could go pre-backend if needed

Phase 39a: Backend Phase 1 (auth foundation) ✅ Session 21 (14 May) — supabase-auth-tables.sql (families + profiles + handle_new_user SECURITY DEFINER trigger + current_family_id helper + 3 RLS policies). lib/auth.ts (signUpOwner/signIn/signOut/loadProfile + module cache). app/(auth)/sign-in.tsx (3-state UI with palette orbs). app/_layout.tsx auth guard + onAuthChange listener. Disabled email confirmation in Supabase dashboard.
Phase 39b: Backend Phase 2a (RLS + DUMMY_FAMILY_ID swap) ✅ Session 21 (14-15 May) — supabase-data-rls.sql (19 tables × 4 policies + claim_legacy_data backfill RPC + tutor_messages session-aware policy). lib/family.ts (getFamilyId at query time, warned-once fallback). 99 swaps across 12 files via perl word-boundary regex. Plus 3 NEW view-query branches in send() (Shopping/Meals/Tasks) — must go BEFORE calendar branch.
Phase 39c: Backend Phase 2a fixes (session persistence + RLS unblocked) ✅ Session 21 (15 May) — lib/supabase.ts AsyncStorage + react-native-url-polyfill + AppState refresh. Critical SQL fix: current_family_id() SET search_path = public, auth (was silently returning NULL because auth.uid() didn't resolve in SECURITY DEFINER without search_path). Re-ran policy DO-block (had silently rolled back on first run — RLS was ON with ZERO policies).
Phase 39d: Backend Phase 2b (invite tokens + tour state to Supabase) ✅ Session 21 (15 May) — supabase-invites-tour.sql (invite_tokens + RLS + get_invite_by_token/accept_invite RPCs anon-callable + profiles.tour_state JSONB). lib/invite-state.ts rewrite (inviter side Supabase-backed, NEW receiver-side lookupInviteByToken/acceptInviteRemote via RPC). lib/tour-state.ts rewrite (profile JSONB source of truth, AsyncStorage offline fallback). app/invite/[token].tsx receiver uses new RPC functions.
Phase 39e: Backend Phase 2c (settings prefs to Supabase) ✅ Session 21 (15 May) — supabase-user-prefs.sql (profiles.user_preferences JSONB). NEW lib/user-prefs.ts (same write-through pattern as tour-state). settings.tsx removed inline Prefs/DEFAULT_PREFS/loadPrefs/savePrefs.
Phase 39f: Backend Phase 2d (real auth at invite acceptance) ✅ Session 22 (20 May) — handle_new_user trigger branches on invite_token in raw_user_meta_data, creates profile linked to inviter's family_id, marks invite accepted atomically. signUpFromInvite() helper in lib/auth.ts. AdultFlow: real signup with form email+password + client-side validation. KidFlow: synthetic email (kid-<token>@invitees.zaeli.app) + token+PIN password. Bad tokens raise → auth user rolled back. Verified end-to-end on device.
Phase 39g: Backend Phase 2e (cross-device verification) 🔨 NEXT — Test real invite + sign-up on a SECOND physical device (not same-device dev row).
Phase 39h: Backend Phase 2f (memory wiring) 🔨 — Wire Settings → Memory view to real family_insights / family_milestones / conversation_memory tables.
Phase 39i: Backend Phase 3 (external integrations) 🔨 — Push notifications scheduled to brief times. Stripe customer portal WebView. Real cross-device deep links (zaeli.app/i/<token>).
Phase 39j: Backend Phase 4 (cleanup + ship-ready) 🔨 — Remove dev rows, LANDING_TEST_MODE=false, expo-document-picker for Our Budget CSV (EAS rebuild), share extension (EAS), GDPR / export data / privacy WebViews.

Phase 40: Chat bar photo upload bug ✅ Session 21 (18 May) — 64px thumbnail above bar with "Photo ready — tap send" + ✕ dismiss. Send button opacity + tap guard updated to allow photo-only (send('') with imageUri). Three combined bugs presenting as one symptom (picker opens, select does nothing).
Phase 41: Multi-user safety patches ✅ Session 22 (20 May) — six combined fixes surfaced during 2d testing: (1) heads-up filter inviter-only via inviter_user_id === currentUserId, (2) chat persistence file scoped per user via auth.onAuthStateChange subscription in useChatPersistence, (3) local chat messages state resets on user switch via chatLoaded transition, (4) tour-state + user-prefs don't fall back to AsyncStorage when signed in (profile JSONB is sole source), (5) all module caches invalidated in _layout.tsx onAuthChange (tour, prefs, invites + existing account), (6) fresh-invitee welcome polish — suppress family brief on first session, show warm welcome instead.
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
- **Brief system = 2 windows** (Session 19 — reduced from 3). Morning 05:00–15:59 "here's your day" · Evening 16:00–04:59 "today's wrap + tomorrow's shape". Midday removed. Evening now carries tomorrow-morning prep (dinner plans, pack-ahead) so morning brief doesn't need to. Never add a third brief window — notification burden isn't justified.
- Our Budget = PURE PLANNER (Session 17) — NEVER live tracking. No "spent this month" numbers. No transaction ledger. Uploads produce suggestions (ephemeral) or line items (accepted), never a running spend total.
- Our Budget Fixed categories = line items (auto-sum). Variable categories = single `monthlyTarget`. Never mix.
- Our Budget tab = "Savings" NOT "Goals" (Session 17 rename). Individual items still called "goals".
- Our Budget accent = Mint (Meals palette): `#2D7A52` deep / `#B8EDD0` mint / `#E6F7EF` tint / `#C8F0DA` border. Savings cells = sky `#A8D8F0`. Over state = peach `#FAC8A8` + `#8A3A00` brown text. Never red/alarm.
- Standard page label rule: `Poppins_700Bold · 17px · rgba(10,10,10,0.72)`. Never 14/18 or 0.32/0.35.
- Wordmark rule: `Poppins_800ExtraBold · 40px · letterSpacing -1.5 · lineHeight 46`. Always.
- NEVER declare sub-components (JobsTab, etc) inside a parent and render as `<X />` — kills keyboards. Either hoist out OR call as function `{X()}`.
- Brief system has ONE generator now: `generateBrief` from `lib/brief-generator.ts`. NO local function by that name inside index.tsx — would shadow the import silently.
- `tryFireBrief` pushes a loading placeholder message IMMEDIATELY (peach bubble + TypingDots), updates in place on Sonnet return. Never a blank screen during brief generation.
- Calendar keyword trigger list = intent-bearing phrases only. Bare time refs ("next week", "today", day names) DO NOT trigger calendar routing on their own — narrative usage must pass through chat.
- Module-level nav flags pattern (for tab→tab back-routing): use `lib/navigation-store.ts` setters/consumers. Router params unreliable across tab routes.
- `@react-native-community/datetimepicker` used for time + date pickers (inline spinner on iOS, native dialog on Android).
- Settings prefs stored in AsyncStorage under `zaeli_settings_prefs_v1` (pre-backend pass).
- Travel = STANDALONE full-screen route (not 92% sheet — too much depth). Wordmark `a+i` = sky `#A8D8F0`, primary = ocean deep `#0060A0`. Segmented tabs (Overview/Bookings/Packing/Notes).
- Travel Budget = PURE PLANNER (Session 18) — total budget set by user, Booked auto-sums booking amounts, no manual "spent". Same reason as Our Budget.
- BookingSheet in Travel is unified — one component handles add (`payload: 'new'`) and edit (`payload: Booking`). Delete button lives inside edit mode.
- **SheetShell pattern** (use this for any 92% bottom sheet with text inputs): `Modal > View backdrop > View card > KAV inside card wrapping only body`. Never wrap the whole Modal with KAV — fixed-height card gets shoved off screen. Also add `keyboardShouldPersistTaps="handled"` to the body ScrollView.
- **Brief = 2 windows ONLY** (Session 19) — morning (05:00–15:59) + evening (16:00–04:59). Never reintroduce midday. Evening covers tomorrow-morning prep.
- **Brief render = Option B** (Session 19) — soft tinted bubble (peach morning #FDF1E5 / lavender evening #F0EBFF) + time-of-day pill (☀️ MORNING peach `#FAC8A8`/`#8A3A00` or 🌙 EVENING lavender `#D8CCFF`/`#5020C0`) + structured 3-paragraph prose. NO win banner. NO border on bubble. Eyebrow simplified to `Zaeli · time` (window context lives in pill, no redundancy).
- **Brief generator format** (Session 19) — strict 3-paragraph: `[OPENER]` (1 line + 1 emoji) / `[BODY]` (2-3 sentences with specifics + optional emoji) / `[ONE THING]` (single nudge + emoji). Max 100 words. 1 emoji per paragraph max (so 2-3 across whole brief). Quiet-day mode collapses to opener + one thing.
- **Splash = warm bg + palette orbs** (Session 19) — both onboarding (`WelcomeStep` + `ReadyStep`) and cold-start (`swipe-world.tsx`) use `#FAF8F5` bg with peach/mint/lavender/sky orbs. INK wordmark, sky `a+i`, "Less **chaos**." in coral. Native splash bg in `app.json` is `#FAF8F5` — requires `npx expo prebuild --clean` after change.
- **Wordmark lineHeight rule** — for sizes 92px+, set `lineHeight` to `fontSize + ~28` AND `paddingTop: 12-14` so the i-dot doesn't clip. (Original 96-on-96 chopped the dot.)
- **Chat bubble unification** (Session 19) — Zaeli text wrapped in `s.zaeliBubble` (bg `rgba(10,10,10,0.04)`, radius 18, BBL 6, padding 13/16, alignSelf flex-start, maxWidth 90%). User bubble bg `#E8F4FD` (sky), shape radius 18 / BBR 6 / padding 11/15. Both texts: `Poppins_400Regular` 17px lineHeight 26. Identical font weight + lineHeight is the rule.
- **Tour state machine** = `lib/tour-state.ts`. AsyncStorage key `tour_state_v1`. Stop list lives in `STOPS` array. **Tutor is stop 7 = HERO** (violet accent, trial badge, 2 CTAs, price line). 11 stops total. Progress formula `((cur-1)/(TOTAL-1))*100` so stop 1 = 0% and stop 11 = 100%.
- **Tour pill = bottom-LEFT** (`left: 16`). Right side reserved for chat scroll up/down arrows. Visible only when `isInProgress()`.
- **Tour offer chip handler** must call `replayFromStart()` BEFORE navigating to `/tour` — otherwise stale `currentStop = 'finale'` from prior runs lands the user on the finale screen.
- **First-time tour banner inside sheets** uses `<TourBanner sheetKey="..." message="..."/>` — per-sheet AsyncStorage flag `tour_banner_seen_<key>`. Only renders if `tourInProgress()` AND not previously dismissed.
- **Invite state** = `lib/invite-state.ts`. AsyncStorage key `invite_state_v1`. Mock 6-char token. Real Supabase-backed token validation comes with backend pass.
- **Account state** = `lib/account-state.ts`. Three kinds: `owner` (Rich, default) / `adult` / `kid`. AsyncStorage key `account_state_v1`. Used for permission gating in MoreSheet.
- **Invites = Adult or Kid only** (Session 19). Adult = full access. Kid = full access EXCEPT Our Budget + Our Family management. No granular roles for v1.
- **Invite delivery = iOS share sheet only** (`Share.share({ message, url })`). Recipient = any device. SMS link → App Store → deep-link. Backend pass adds real cross-device.
- **Trust the link** — accepting an invite = joined. No approval flow on inviter side.
- **Inviter heads-up message must clear flag SYNCHRONOUSLY** before message-pushing setTimeout — concurrent mount + focus calls would double-fire. Same pattern for `markResumePromptShown()` on tour inactivity.
- **Adult invitee onboarding** = 4 steps (welcome / account / rhythm / preferences). Sets `onboarding_complete` + `onboarding_just_completed` flags + `setAccount({kind:'adult'})` → routes to chat → tour offer auto-fires.
- **Kid invitee onboarding** = 3 steps (welcome / avatar+PIN / capability intro). Sets `onboarding_complete` + `setAccount({kind:'kid', name, avatar})` → routes to `/(tabs)/kids`. PIN instead of password.
- **MoreSheet kid gating** — `loadAccount()` on each visible-true, `isKidAccount()` hides Budget + Family tiles. NOTE: doesn't gate direct route navigation yet — kid could type `/our-budget`. Defer to Phase 36.
- **Status badge sizing rule** (Family screen) — `fontSize: 11px+`, `padding: 10×5+`, `borderRadius: 8+`, `letterSpacing: 0.2`. Action chips (tappable) bumped to `fontSize: 12`, `padding: 12×7`, `borderRadius: 10`, filled mint pill bg with white text, `hitSlop: { top: 10, bottom: 10, left: 10, right: 10 }`. Never use `fontSize: 9`.
- **Onboarding finale → tour handoff** — `finishOnboarding()` sets BOTH `onboarding_complete` AND `onboarding_just_completed`. Chat `maybeFireTourOffer()` reads + clears the latter on mount, pushes tour offer message with chips ['🧭 Take the tour', 'Maybe later'].
- **Kid tour skips Budget + Family** (Session 19 quick wins) — `lib/tour-state.ts` exports `getEffectiveStops()` / `getEffectiveTotal()` filtered by `isKidAccount()`. ALL tour navigation (advanceStop, goBackStop, getProgressPct, replayStop) and ALL surfaces showing tour totals (chat pill, post-onboarding offer text, inactivity prompt, Settings replay picker, tour route eyebrow + bottom nav) MUST use the effective list, not raw `STOPS`/`TOTAL_STOPS`. Stop IDs stay 1-11; kids just skip 9 + 11.
- **Kids Hub auto-jump for kid accounts** — on mount, if `isKidAccount()` and account name matches a known child, set `selectedChild` and `view = 'hub'` so kid skips the picker and lands directly in their hub.
- **Kid_just_joined welcome banner** — receiver flow `finishKid()` sets `kid_just_joined = 'true'` AsyncStorage flag. Kids Hub reads + clears on mount, shows lavender welcome card with × dismiss above the 3-stat row. One-shot only.
- **Kid account direct-route gating** — Budget + Family routes call `loadAccount()` on mount and `router.replace('/(tabs)/kids')` if `isKidAccount()`. Belt-and-braces with MoreSheet's tile hiding. NOT applied to Settings, Tutor, Travel, MySpace — kids may use those legitimately.
- **Supabase date queries — prefer range over eq** (Session 19 quick wins). If you write `.eq('date', dateStr)`, you'll silently miss any row where the column has a timestamp/timezone component. Always use `.gte(dateStr).lt(nextDayStr)` for single-day queries unless the column type is guaranteed bare DATE.
- **Tutor session resume** (Session 20) — pass `resumeSessionId` query param to `/tutor-session` route. `loadExistingSession(sid)` fetches session row + tutor_messages, hydrates state (messages, conversationHistory, sessionId, subject, topic, difficultyBand, questionNum, hintsUsed, timer), sets phase based on whether subject was picked, flips status 'completed' → 'active' so exit-save logic works on next back. Same pattern works for all 6 pillars.
- **Chat VIEW queries → inline cards** (Session 20) — for any data domain with an existing inline card render path (calendar/shopping/meals/todos), intercept "what's on..." queries in `send()` BEFORE the action path or GPT chat path. Pattern: keyword array → detection function (`isXxxViewQuery` — must check `isActionQuery` first to exclude actions) → branch in `send()` that fetches data + `updateMsg(replyId, { text, inlineData, quickReplies, isLoading: false })` + `return`. Never let GPT type out long lists.
- **SafeAreaView edges in Modal is unreliable on first render** (Session 20) — react-native-safe-area-context's `<SafeAreaView edges={['bottom']}>` doesn't always resolve insets on first render inside a Modal. For any element whose layout depends on bottom safe area, OWN the inset via `useSafeAreaInsets()` and apply `paddingBottom` directly. Don't rely on SafeAreaView alone.
- **Voice (ElevenLabs) AFTER backend pass** (Session 20 decision). Don't wire it now — would risk re-work when chat UX shifts. Only exception: brief-only voice (since brief render is locked).
- **SECURITY DEFINER functions calling `auth.uid()` MUST have `SET search_path = public, auth`** (Session 21 — single biggest lesson of the backend pass). Without it, `auth.uid()` silently returns NULL inside the function's `postgres` role context. Function appears to succeed but returns NULL/false from any policy that uses it. Cost us a half day of debugging "shopping list empty" when everything else looked correct.
- **State lib pattern is locked** (Session 21) — for any data that lives on a user-by-user basis (tour state, settings prefs, account state, etc): module-level cache for sync render reads + `loadX()` hydrates from `profiles.<col>` JSONB when signed in / AsyncStorage when not + `persist()` write-through to both. Used in `lib/tour-state.ts`, `lib/user-prefs.ts`. Future per-user state libs should follow this exact shape — public API matches what the lib used to do with pure AsyncStorage, so call sites don't change.
- **Receiver-side data lookups via anon-callable SECURITY DEFINER RPCs** (Session 21), not direct table queries. RLS would otherwise hide every row from `anon` role. Token IS the secret (same security model as Stripe idempotency keys / password reset links). Example: `lib/invite-state.ts` `lookupInviteByToken()` + `acceptInviteRemote()` both hit `get_invite_by_token` / `accept_invite` RPCs with `GRANT EXECUTE TO anon`.
- **Supabase SQL editor only shows the LAST query result** when running multiple queries together (Session 21). Run verification queries individually if you need to confirm each. Earlier queries DID execute — Postgres would error loudly if they failed.
- **`pg_class.relrowsecurity = true` with no policies = deny-everything** by default (Session 21). When debugging "everything's empty" symptoms, always verify both RLS-on AND policies-exist via `SELECT polname FROM pg_policy WHERE polrelid = 'public.<table>'::regclass`.
- **For SQL backfills that need to bypass RLS during dev** (Session 21): `ALTER TABLE x DISABLE ROW LEVEL SECURITY` → `UPDATE x SET ...` → `ALTER TABLE x ENABLE ROW LEVEL SECURITY`. `SET LOCAL row_security = off` does NOT work for non-postgres roles. SQL editor's own role enforces RLS on UPDATE, so silent zero-affected-rows is the silent failure mode.
- **Chat bar photo-only send must work** (Session 21) — `pendingImage` state has a thumbnail preview above the bar (64px + ✕ dismiss + "Photo ready — tap send"). Send button opacity check + tap guard must allow `pendingImage` alone (no text required). `send('')` with `pendingImage` triggers the existing image-handling path in send().
- **Trigger-based invitee signup** (Session 22) — `handle_new_user()` is the single place that branches on `invite_token` in `raw_user_meta_data`. Client just calls `signUpFromInvite()` with metadata; trigger validates + creates profile linked to inviter's family + marks invite accepted in one transaction. If token is invalid/revoked/already accepted, trigger raises → auth.users INSERT rolls back → no orphan users. Never bypass this — DON'T accept invites client-side then try to fix the family link after.
- **Kid invitee signup = synthetic email + token+PIN password** (Session 22) — kids don't have email. Format: `kid-<token>@invitees.zaeli.app` + password `<token>-<PIN>` (≥6 chars for Supabase). They stay signed in via AsyncStorage session persistence. Kid sign-IN ergonomics on separate devices come in a later phase.
- **All module caches MUST be invalidated on auth change** (Session 22) — `_layout.tsx` `onAuthChange` is the single place this happens. Currently calls `invalidateAccount()` + `invalidateTourCache()` + `invalidatePrefsCache()` + `resetCache()` (invites) on both SIGNED_IN AND SIGNED_OUT. Future per-user state libs (memory wiring etc) MUST add their `invalidateCache()` to this list — otherwise the previous user's data silently leaks to the new user.
- **When signed in, profile JSONB is the ONLY source of truth** for per-user state libs (Session 22) — tour-state + user-prefs do NOT fall back to AsyncStorage when there's a session, even if profile.X is null (fresh user = start clean with DEFAULT). AsyncStorage fallback ONLY fires when there's no session (pre-auth flows like kid receivers mid-onboarding). Without this, fresh user inherits previous user's data silently.
- **Chat persistence files are scoped per-user by Supabase user id** (Session 22) — `useChatPersistence` subscribes to `supabase.auth.onAuthStateChange`, includes userId in filename (`zaeli_chat_home_<userId>.json` or `_anon`). When user changes, scopedKey changes, state resets, new file loads. Previous user's file stays on disk but invisible to new user. Also: local `messages` state in index.tsx resets via `chatLoaded` true→false→true transition detection.
- **Heads-up filter = inviter-only** (Session 22) — `recentlyAcceptedInvites()` filters by `inviter_user_id === currentUserId` (NOT `accepted_user_id !== currentUserId`). Only the actual sender of the invite sees "X just joined". Other family members don't. Fail-closed: returns `[]` if profile not loaded yet.
- **Fresh invitees suppress the family brief on first session** (Session 22) — chat mount effect checks `onboarding_just_completed === 'true'` AND `getProfile()?.kind !== 'owner'`. If both: skip `tryFireBrief`, push warm welcome message ("Hey <name> 👋 Welcome in. Family stuff is already wired up — you'll get your first proper brief tomorrow morning."). Flag cleared by `maybeFireTourOffer` so subsequent sessions show normal brief. Mid-context family brief ("bins go out tomorrow") is jarring as someone's first-ever Zaeli message.
- **Adult invitee signup form validates client-side** (Session 22) — Continue button disabled until email matches `/^\S+@\S+\.\S+$/` AND password length ≥ 6. Otherwise sign-up fails 3 steps later in a confusing alert.
- **Family brief is family-scoped, not user-scoped** (Session 22 distinction) — when a new family member sees the family brief on second-session-onwards, that's NOT a leak. The brief is keyed by `family_id + date + window` in `zaeli_briefs`. All family members see the same brief. The Session 22 welcome polish is a UX layer on first session only.
- **Test workflow gotcha — "nested invites"** (Session 22) — the dev row "Open latest invite as receiver" signs you in as the new invitee. If you then create another invite WITHOUT signing back in as the owner, the new invite's `inviter_user_id` is that invitee's id (not yours). Heads-ups won't fire for the owner because the owner isn't the inviter. Always sign back in as the intended inviter before creating each test invite.
