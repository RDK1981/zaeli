# CLAUDE.md — Zaeli Project Context
*Last updated: 14 April 2026 — Session 11 ✅ · Meal Planner polished + locked · Recipe photos · Rolling 10-day planner · Search Recipes with day context*

---

## ══════════════════════════════════
## SCREEN ARCHITECTURE — CRITICAL (LOCKED ✅)
## ══════════════════════════════════

**Three screens, swipe world:**
```
Dashboard (0)  →  Chat (1)  →  My Space (2)
```
App opens on Dashboard (page 0). Swipe right for Chat, right again for My Space.

**PHILOSOPHY B — LOCKED (Session 9):**
Zaeli is an AI companion that also manages family life — NOT a family dashboard with AI bolted on. Chat is the product's beating heart. Dashboard is a reference layer. Everything flows from Zaeli's relationship with the family.

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
- Navigation architecture review = Phase 2 decision (after real usage data)

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
SONNET   = 'claude-sonnet-4-20250514'    — $3.00/$15.00 per M tokens
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
- Claude Sonnet (`claude-sonnet-4-20250514`) — briefs, tool-calling, vision
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
SONNET             = 'claude-sonnet-4-20250514'
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
ZaeliFAB           = forwardRef, exposes startMic() + openMore()
FAB hides          = activeButton === 'keyboard' OR hideFabBar prop
FAB on chat page   = HIDDEN via activePage !== PAGE_CHAT in swipe-world
Chat bar           = fixed [Mic][TextInput][Send] — NEVER conditional render
Chat bar camera    = SVG camera icon inside right of input field (coral #FF4545 stroke)
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
Phase 9a: Dashboard redesign   🔨 ← Claude Code next (zaeli-dashboard-redesign.html)
Phase 9b: Meal Planner sheet   🔨 ← Claude Code next (zaeli-meals-mockup.html)
Phase 9c: Camera/Upload        🔨 ← Claude Code next (zaeli-camera-upload.html)
Phase 9d: AI Brief system      🔨 ← implement Sonnet briefs, GPT-5.4 mini routing
Phase 10: Our Budget module    🔨 ← Phase 2 (after Basiq response)
Phase 11: Dedicated pages      🔨 (Kids Hub, Tutor, Our Family, Settings)
Phase 12: Travel sheet         🔨
Phase 13: Nav architecture     🔨 ← Phase 2 (after real usage data)
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
