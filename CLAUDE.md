# CLAUDE.md — Zaeli Project Context
*Last updated: 2 April 2026 — Calendar sheet full build ✅ Inline card Polish ✅ Delete flows ✅ Persistence fixed ✅*

---

## Who You Are Talking To
- **Richard** — beginner developer. Always give **full file rewrites**, easy copy-paste PowerShell commands, one step at a time
- Never give partial diffs or targeted edits unless it's a single truly isolated line
- Always explain what you're doing in plain English before diving into code
- Family: Rich (logged-in user), Anna, Poppy (Yr6, age 12, girl), Gab (Yr4, age 10, BOY — Gabriel, always he/him), Duke (Yr1, age 8, boy)
- Local path: `C:\Users\richa\zaeli` (Windows, PowerShell — no && chaining)
- Repo: https://github.com/RDK1981/zaeli (private)
- PowerShell: `Copy-Item "C:\Users\richa\Downloads\file.tsx" "C:\Users\richa\zaeli\app\`(tabs`)\file.tsx"`
- Full file rewrites only — never partial diffs
- Design before code — always discuss/mockup new screens before writing code
- **Two fixes at a time** — bulk changes create too many variables when something breaks

---

## The Business

Zaeli is an iOS-first AI family life platform for Australian families with children.

**Revenue model:**
- Family plan: A$14.99/month
- Tutor add-on: A$9.99/child/month
- 100% web sales (no App Store cut)

---

## Zaeli Persona (LOCKED)

Sharp, warm, genuinely enthusiastic about this family. Finds the funny angle through delight, not detachment. Celebrates small wins. Spots chaos before it arrives.

**Hard rules:**
- NEVER "mate", "guys" — Never start with "I" — Plain text only
- Always ends on a confident offer — never a bare open question
- BE PROPORTIONATE — never manufacture drama
- **Banned words:** "queued up", "locked in", "tidy", "sorted", "lined up", "all set", "stacked neatly", "ambush", "sprint", "chaos", "chaotic", "breathing room"

---

## Stack
- React Native + Expo (iOS-first), dev build on iPhone 11 Pro Max
- Supabase (Postgres, Sydney ap-southeast-2, ID: rsvbzakyyrftezthlhtd)
- Claude Sonnet (`claude-sonnet-4-20250514`) — all tool-calling channels + vision
- OpenAI GPT-5.4 mini (`gpt-5.4-mini`) — home_brief, home_post_card, home_pill_tap, Tutor chat
- OpenAI Whisper-1 — voice transcription
- expo-router, expo-image-picker, react-native-svg, expo-file-system (chat persistence)
- Poppins font (UI), DMSerifDisplay (hero titles)
- No bottom tab bar — Zaeli is the only navigation

---

## Key Constants
```
DUMMY_FAMILY_ID = '00000000-0000-0000-0000-000000000001'
SONNET          = 'claude-sonnet-4-20250514'  ← NOT claude-sonnet-4-6
GPT_MINI        = 'gpt-5.4-mini'             ← NOT gpt-4.1-mini (retired)
OpenAI = max_completion_tokens · Claude = max_tokens. Never mix.
KAV must have backgroundColor:'#fff'
always await supabase inserts
Send button = #FF4545 coral ALWAYS
isActionQuery() runs BEFORE isCalendarQuery()
Apostrophes in JSX: always double-quoted strings
expo-file-system import = 'expo-file-system/legacy'
Do NOT use @react-native-async-storage — requires native rebuild
NEVER use literal newlines inside JSX strings {"..."} or regex /.../  — use \n escape
stopPropagation on nested TouchableOpacity inside tappable parent rows
Modal stacking iOS: close modal 1 → setTimeout 350ms → open modal 2
NEVER append +10:00 or any timezone suffix to stored event times (see Time Contract below)
```

---

## Navigation Model (LOCKED ✅ 1 Apr 2026)

**Single interface — Home is the only screen users ever need.**

- **9 domain pills** always visible above chat bar: Home · Calendar · Shopping · Meals · To-dos · Notes · Travel · Family · More
- Pill tap → inline card drops immediately + GPT-mini follow-up 400ms later
- "Full ›" on any inline card → 80% bottom sheet (clean black/grey UI)
- Dedicated channel pages still exist but hidden from users
- Kids Hub + Tutor remain standalone (sustained attention use cases)
- **Avatar tap:** Kids Hub · Tutor · Settings · Sign out
- Always `router.navigate()` — never push() or replace()

---

## Channel Architecture
```
app/(tabs)/index.tsx          → Home ✅ SINGLE INTERFACE COMPLETE + CALENDAR SHEET COMPLETE (2 Apr 2026)
app/(tabs)/calendar.tsx       → Calendar ✅ COMPLETE
app/(tabs)/shopping.tsx       → Shopping ✅ REBUILD COMPLETE
app/(tabs)/mealplanner.tsx    → Meals ✅ REBUILD COMPLETE
app/(tabs)/todos.tsx          → Todos + Reminders (design ✅ — not yet built)
app/(tabs)/kids.tsx           → Kids Hub (design ✅ — not yet built)
app/(tabs)/notes.tsx          → Notes (design ✅ — not yet built)
app/(tabs)/travel.tsx         → Travel (no design yet)
app/(tabs)/family.tsx         → Our Family (design ✅ — not yet built)
app/(tabs)/tutor.tsx          → Tutor (design ✅ — needs rebuild)
lib/use-chat-persistence.ts   → ✅ Keys: home | shopping | calendar | meals
```

---

## Per-Channel Colour System (LOCKED)

| Channel | Banner bg | AI colour | Accent (dark) |
|---------|-----------|-----------|---------------|
| Home | `#F5EAD8` | `#A8D8F0` Sky Blue | `#0A7A3A` |
| Calendar | `#B8EDD0` | `#F0C8C0` Warm Blush | `#0A7A3A` |
| Shopping | `#EDE8FF` Lavender | `#D8CCFF` Deeper Lavender | `#5020C0` |
| Meals | `#FAC8A8` | `#A8E8CC` Fresh Green | `#C84010` |
| Kids Hub | `#A8E8CC` | `#FAC8A8` Warm Peach | `#0A6040` |
| Tutor | `#D8CCFF` | `#A8E8CC` Fresh Green | `#5020C0` |
| To-dos | `#F0DC80` | `#D8CCFF` Lavender | `#806000` |
| Notes | `#C8E8A8` | `#F0C8C0` Warm Blush | `#2A6010` |
| Travel | `#A8D8F0` | `#B8EDD0` Soft Mint | `#0060A0` |
| Our Family | `#F0C8C0` | `#D8CCFF` Lavender | `#A01830` |

**CRITICAL:** Send button = `#FF4545` coral always. Body bg = `#FAF8F5` warm white always.
No left-border accent strips. Colour lives ONLY in inline chat card renders. Sheets = clean black/grey.

---

## Family Member Colours (LOCKED)
```
Rich: #4D8BFF · Anna: #FF7B6B · Poppy: #A855F7 · Gab: #22C55E · Duke: #F59E0B
```

---

## ══════════════════════════════════
## INLINE CALENDAR CARD SPEC (LOCKED ✅ 2 Apr 2026)
## ══════════════════════════════════

```
Outer container:
  backgroundColor: '#3A3D4A' (CAL_SLATE)
  borderRadius: 16
  marginHorizontal: -4   ← escapes 18px parent padding, aligns with chat bar edge
  marginTop: 8, marginBottom: 2
  overflow: 'hidden'

Header row:
  paddingHorizontal: 14, paddingTop: 12, paddingBottom: 10
  Date label: Poppins_700Bold 12px, letterSpacing: 0.10, uppercase, rgba(255,255,255,0.65)
  + Add button: rgba(255,255,255,0.18) bg, borderRadius: 9, paddingVertical: 6, paddingHorizontal: 13
    font: Poppins_700Bold 12px white
  Full › button: paddingVertical: 6, paddingHorizontal: 4 (extra hit area)
    font: Poppins_600SemiBold 12px rgba(255,255,255,0.55)
  Gap between buttons: 14

Event rows (collapsed):
  paddingHorizontal: 14, paddingVertical: 8
  Time column: width: 58, Poppins_500Medium 12px rgba(255,255,255,0.50), numberOfLines: 1
  Dot: width: 8, height: 8, borderRadius: 4, first assignee colour
  Title: Poppins_400Regular 16px rgba(255,255,255,0.92), flex: 1, numberOfLines: 1
  Avatars: width: 26, height: 26, borderRadius: 13
  Dimmed events (when one expanded): opacity 0.38

Expanded event (ExpandedEventDetail):
  Container: rgba(255,255,255,0.09) bg, borderRadius: 12, margin: 6, padding: 14
  Animation: Animated.spring, tension: 80, friction: 10, scaleY 0.85→1 + opacity
  Emoji: fontSize 22
  Title: Poppins_700Bold 16px rgba(255,255,255,0.95)
  Close: Poppins_400Regular 11px rgba(255,255,255,0.40) '▲ close'
  Meta: Poppins_400Regular 13px rgba(255,255,255,0.55) lineHeight: 20
  Avatars: width: 28, height: 28, borderRadius: 14

Action chips (inside expanded):
  borderRadius: 16, paddingVertical: 6, paddingHorizontal: 12
  ✦ Edit with Zaeli: rgba(168,216,240,0.22) bg, border rgba(168,216,240,0.45)
    font: Poppins_600SemiBold 12px rgba(168,216,240,0.95)
  Move time / Add someone / Manual edit: rgba(255,255,255,0.10) bg, border rgba(255,255,255,0.18)
    font: Poppins_600SemiBold 12px rgba(255,255,255,0.78)
  Delete (inactive): rgba(255,255,255,0.07) bg, border rgba(255,255,255,0.14)
    font: Poppins_600SemiBold 12px rgba(255,100,100,0.70)
  Delete (confirm): rgba(220,38,38,0.25) bg, border rgba(220,38,38,0.55)
    font: Poppins_700Bold 12px #ff6b6b

Footer:
  paddingHorizontal: 14, paddingTop: 10, paddingBottom: 12
  borderTopWidth: 1, borderTopColor: rgba(255,255,255,0.10), marginTop: 4
  Today / Tomorrow tabs: Poppins_700Bold 11px, active=rgba(255,255,255,0.85) inactive=rgba(255,255,255,0.35)
  Month view ›: Poppins_600SemiBold 11px rgba(255,255,255,0.35)
```

**Pill tap card behaviour (LOCKED ✅ 2 Apr 2026):**
- On tap: removes ALL existing calendar inline cards, appends fresh full-day card at bottom
- Follow-up: removes previous `_isPillFollowUp` message, appends fresh loading one
- Always fires follow-up — no stale-closure guards that could block it
- `activePill` clears after 800ms so re-tapping works immediately
- Card always appears at bottom of feed (never buried in history)

**Persistence behaviour (LOCKED ✅ 2 Apr 2026):**
- On reload: restores brief only (`isBrief: true` messages) — NO inline cards, NO conversation
- `persistenceHasLoaded` ref prevents double-load
- `generateBrief` skips if persistence already has messages (no stacking)
- Scroll content `paddingBottom: 150` keeps last message close to pill bar

---

## ══════════════════════════════════
## CALENDAR SHEET SPEC (LOCKED ✅ 2 Apr 2026)
## ══════════════════════════════════

```
Sheet container:
  height: '92%'
  backgroundColor: '#FAF8F5'
  borderTopLeftRadius: 24, borderTopRightRadius: 24
  display: 'flex', flexDirection: 'column'
  SafeAreaView: flex: 1, edges: ['bottom']

Handle: width: 36, height: 4, borderRadius: 2, rgba(0,0,0,0.12), alignSelf: center, marginTop: 10

Header:
  paddingHorizontal: 16, paddingVertical: 12
  borderBottomWidth: 1, borderBottomColor: rgba(0,0,0,0.08)
  Title: Poppins_700Bold 18px #0A0A0A
  SVG calendar icon (PilIcoCal) + title in list mode
  X/‹ button: 32×32, borderRadius: 9, rgba(0,0,0,0.07) bg
    Shows '✕' in list mode (closes sheet) · '‹' in edit/add form (back to list)
    fontSize: 14, rgba(0,0,0,0.5)

Tab switcher (Today / Tomorrow / Month):
  Container: rgba(0,0,0,0.06) bg, borderRadius: 22, padding: 3
  marginHorizontal: 14, marginTop: 12, marginBottom: 6
  Each tab: flex: 1, paddingVertical: 10, borderRadius: 19
  Active: #0A0A0A bg, white text
  Inactive: transparent bg, rgba(0,0,0,0.40) text
  Font: Poppins_700Bold 13px

Body (tabs + scrollview wrapper):
  View flex: 1 (critical — fixes void area at bottom)
  ScrollView: flex: 1, padding: 16, paddingBottom: 50
  keyboardShouldPersistTaps: 'handled'

Backdrop dismiss: TouchableOpacity flex: 1 above sheet
```

**Day / Tomorrow tab content:**
```
Date header: Poppins_700Bold 15px rgba(0,0,0,0.50), marginBottom: 16

Event card (CalSheetEventCard):
  backgroundColor: '#fff', borderRadius: 14, marginBottom: 10, padding: 14
  borderLeftWidth: 3, borderLeftColor: first assignee colour (or rgba(0,0,0,0.15))
  Time col: width: 56, Poppins_700Bold 14px rgba(0,0,0,0.45), right-aligned, numberOfLines: 1
  Title: Poppins_700Bold 17px #0A0A0A
  Meta (time range + location): Poppins_400Regular 13px rgba(0,0,0,0.45) lineHeight: 19
  Avatars: width: 26, height: 26, borderRadius: 13, marginTop: 8, marginBottom: 10
  Buttons:
    ✦ Edit with Zaeli: rgba(168,216,240,0.18) bg, border rgba(168,216,240,0.45)
      borderRadius: 10, paddingVertical: 7, paddingHorizontal: 12
      font: Poppins_600SemiBold 13px rgba(0,0,0,0.55)
    Edit (manual): rgba(0,0,0,0.06) bg, borderRadius: 10, pV:7 pH:12
      font: Poppins_600SemiBold 13px rgba(0,0,0,0.45)
    Delete: rgba(0,0,0,0.04) bg · Confirm delete: rgba(220,38,38,0.12) bg red border
      font: Poppins_600SemiBold/700Bold 13px

Add event row:
  borderWidth: 1.5, borderStyle: dashed, borderColor: rgba(0,0,0,0.12)
  borderRadius: 14, padding: 14, marginTop: 4
  Left side (TouchableOpacity): opens manual add form for that day's date
    font: Poppins_600SemiBold 15px rgba(0,0,0,0.35)
  Right button (✦ Add with Zaeli): rgba(168,216,240,0.18) bg, border rgba(168,216,240,0.45)
    borderRadius: 10, paddingVertical: 7, paddingHorizontal: 12
    font: Poppins_600SemiBold 13px rgba(0,0,0,0.50) → closes sheet, Zaeli chat
```

**Month tab content:**
```
Month nav: Poppins_700Bold 18px, ‹ › at fontSize: 22, padding: 8
Day header letters: Poppins_700Bold 12px rgba(0,0,0,0.35)
Grid cells: width: '14.28%', paddingVertical: 4
  Day circle: width: 34, height: 34, borderRadius: 17
    Today: #3A3D4A (slate) bg, white text
    Selected: #FF4545 (coral) bg, white text
    Other month: rgba(0,0,0,0.22) text
  Day number: Poppins_600SemiBold 15px
  Event dots: width: 5, height: 5, borderRadius: 2.5, gap: 2, marginTop: 2
    Up to 3 dots per day, first assignee colour per event

Selected day section:
  Divider: height: 1, rgba(0,0,0,0.08), marginBottom: 14
  Day label: Poppins_700Bold 13px rgba(0,0,0,0.45) uppercase letterSpacing: 0.5
  Same CalSheetEventCard as day view
  Add event row: same as day view, left side uses selected day date

Auto-opens on today: setCalSheetSelDay(today) + populates dayEvs from todRes
Month dots fetch: non-blocking .then() after sheet opens
Sheet opens IMMEDIATELY: setCalSheetOpen(true) before any await
```

**Edit / Add form (CalSheetEditForm):**
```
Zaeli hint bar: rgba(168,216,240,0.14) bg, border rgba(168,216,240,0.35)
  borderRadius: 14, padding: 14, marginBottom: 20
  Text: Poppins_400Regular 14px rgba(0,0,0,0.55)
  CTA: Poppins_700Bold 13px rgba(58,61,74,0.75) 'Edit ›'

Section labels: Poppins_700Bold 11px rgba(0,0,0,0.40) uppercase letterSpacing: 0.8

Text inputs: backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, rgba(0,0,0,0.10)
  paddingHorizontal: 14, paddingVertical: 12, marginBottom: 18
  font: Poppins_400Regular 17px #0A0A0A

Time boxes (Start / End):
  flex: 1, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, padding: 12, gap: 10
  Sub-label: Poppins_700Bold 10px rgba(0,0,0,0.38) uppercase, marginBottom: 6

Attendees row: gap: 16, flexWrap: wrap, marginBottom: 20
  Avatar: width: 44, height: 44, borderRadius: 22
  Selected: opacity 1, borderWidth: 2.5, borderColor: #0A0A0A
  Unselected: opacity 0.28, no border
  Avatar letter: Poppins_700Bold 16px white
  Name label: Poppins_500Medium 11px

Repeat / Reminder pills: gap: 8, flexWrap: wrap
  borderWidth: 1.5, borderRadius: 22, paddingVertical: 8, paddingHorizontal: 16
  Active: #0A0A0A bg, white text
  Inactive: '#fff' bg, rgba(0,0,0,0.12) border, rgba(0,0,0,0.55) text
  font: Poppins_600SemiBold 14px

Save / Cancel buttons:
  Cancel: flex:1, paddingVertical:16, borderRadius:14, rgba(0,0,0,0.06) bg
    font: Poppins_700Bold 15px rgba(0,0,0,0.45)
  Save: flex:2, paddingVertical:16, borderRadius:14, #3A3D4A bg
    font: Poppins_700Bold 15px white
    Label: 'Save changes' (edit) / 'Add event' (new)

Delete event section (edit mode only):
  'Delete event': Poppins_600SemiBold 14px rgba(220,38,38,0.60), paddingVertical: 14
  Confirmation row: 'Keep it' + 'Yes, delete event' (#DC2626 bg)
  Two-tap pattern prevents accidental deletes

Header: 'Edit Event' or 'Add Event', Poppins_700Bold 18px
X button: back to list (not close sheet) when in form · ✕ closes sheet in list mode

onSaved flow:
  1. setCalSheetEditEv(null) + setCalSheetOpen(false)
  2. Fetches saved event from Supabase
  3. Injects single-event inline card + confirmation text into chat
  4. Scrolls to bottom
onDeleted flow: closes sheet, clears edit state, calls loadCardData()
```

---

## CANONICAL CHAT BAR SPEC (LOCKED ✅)

```
barPill: borderRadius:30, paddingVertical:14, paddingHorizontal:16, borderWidth:1
  bg:#fff, borderColor:rgba(10,10,10,0.09)
  ├── barBtn 34×34 → IcoPlus
  ├── barSep 1×18px rgba(10,10,10,0.1)
  ├── TextInput fontSize:15 Poppins_400Regular maxHeight:100 multiline
  ├── barMicBtn 32×32 → IcoMic color="#F5C8C8" size={26}
  └── barSend 32×32 borderRadius:16 bg=#FF4545

inputArea: position:absolute bottom:0
  paddingBottom: iOS?16:8   ← lowered 2 Apr (was 30:18, higher = bar goes UP)
  paddingHorizontal:14
  NO backgroundColor on inputArea — KAV #fff shows through = floating effect

KAV: behavior=padding backgroundColor='#fff'
scrollContent: paddingBottom: 150
```

**IMPORTANT:** `paddingBottom` on `inputArea` pushes bar UP. Reduce to move bar lower.

---

## DOMAIN PILL BAR SPEC (LOCKED ✅)
```
Sits inside inputArea, ABOVE chat bar pill.
Pills: flexDirection:row, gap:6, borderRadius:20, paddingVertical:9, paddingLeft:11, paddingRight:13
       backgroundColor:#fff, borderWidth:1, borderColor:rgba(0,0,0,0.10)
SVG icons: 18×18, channel accent colour (inactive)
Label: Poppins_600SemiBold, fontSize:11
Pill row: ScrollView horizontal, gap:6, marginBottom:8

Active colours:
  Home: #F5EAD8 · Calendar: #3A3D4A (white icon) · Shopping: #EDE8FF
  Meals: #FAC8A8 · Todos: #F0DC80 · Notes: #C8E8A8
  Travel: #A8D8F0 · Family: #F0C8C0 · More: rgba(0,0,0,0.10)

activePill cleared after 800ms so re-tapping works immediately
```

---

## EVENT TIME CONTRACT (CRITICAL ✅ LOCKED)
```
✅ Store: "2026-04-01T16:00:00"  → displays 4:00 pm ✓
❌ Never: "2026-04-01T16:00:00+10:00" → Supabase converts to UTC → displays 6:00 am ✗
```
fmtTime() and isoToMinutes() in BOTH files: raw string parse. Never new Date() for display.

---

## PANTRY — LAST BOUGHT MODEL (LOCKED ✅)
Stock bars removed. Shows "last bought" date per item.
Photo scan = logs as purchased. Receipts = primary source.

---

## Inline Card Interaction Patterns (LOCKED ✅ 2 Apr 2026)

### Calendar pill tap
1. Removes ALL existing calendar inline cards from messages
2. Appends fresh full-day card at bottom of feed
3. Removes previous `_isPillFollowUp` Zaeli message
4. Appends fresh loading Zaeli message, fires GPT-mini follow-up
5. `activePill` clears after 800ms

### After adding event via chat (Sonnet tool-call)
1. Fetches newly created event from Supabase by title + date
2. Injects single-event inline card above Zaeli confirmation text

### After saving event via manual edit form
1. Closes sheet immediately
2. Fetches saved event from Supabase
3. Injects single-event inline card + warm confirmation Zaeli message at bottom

### Manual edit from inline card expanded view
1. Tap "Manual edit" chip in expanded event
2. Opens calendar sheet directly to edit form for that specific event
3. Sheet header shows "Edit Event", no list view shown

### Delete from inline card
1. Tap "Delete" chip (first tap — soft red)
2. Chip changes to "Confirm delete" (bright red)
3. Confirm → deletes from Supabase → refreshes card + card stack

### Delete from sheet event card
1. "Delete" button at bottom of event card
2. Confirm → refreshes sheet list for current tab

### Delete from manual edit form (existing events only)
1. "Delete event" text button at bottom (soft red)
2. Expands to "Keep it" / "Yes, delete event" row
3. Confirm → closes sheet, refreshes card data

---

## Chat Persistence (LOCKED ✅ 2 Apr 2026)

```
persistenceHasLoaded ref — load fires exactly once, never re-fires
On load: restore isBrief messages ONLY (no inline cards, no conversation)
On messages change: save to persistence (debounced by hook)
generateBrief: skips if persistedMessages.length > 0 (no stacking on reload)
```

---

## Screen Status

| File | Status | Notes |
|---|---|---|
| index.tsx | ✅ Complete | Single interface + Calendar sheet full build — 2 Apr |
| calendar.tsx | ✅ Complete | Time fix applied |
| shopping.tsx | ✅ Rebuild complete | Lavender, Sonnet, persistence |
| mealplanner.tsx | ✅ Rebuild complete | Full spec |
| lib/use-chat-persistence.ts | ✅ Complete | Keys: home, shopping, calendar, meals |
| todos.tsx | ✅ Design complete | Not built — create reminders table first |
| kids.tsx | ✅ Design complete | Not built |
| family.tsx | ✅ Design complete | Not built |
| notes.tsx | ✅ Design complete | Not built |
| travel.tsx | No design | Design session needed |
| tutor/* | ✅ Design complete | Needs rebuild |

---

## Next Priorities

1. **Shopping sheet** — apply same sheet pattern as Calendar (List · Pantry · Spend tabs)
2. **Meals sheet** — Dinners · Recipes · Favourites tabs
3. **Create reminders Supabase table** (SQL in ZAELI-PRODUCT.md)
4. **Todos + Reminders** (todos.tsx)
5. **Kids Hub** (kids.tsx)
6. **Our Family** (family.tsx) — sheet-based
7. **Notes** (notes.tsx)
8. **Tutor rebuild**
9. **Travel** — design session first

**Deferred:** timezone full fix · real auth · EAS · Stripe · Settings · weather to real location

---

## Coding Rules
- SafeAreaView edges={['top']} always · No floating FAB
- Logo taps = router.navigate('/(tabs)/')
- PowerShell: no && — separate lines
- Always npx expo start --dev-client (--clear for bundle issues)
- Date: local construction — NEVER toISOString()
- Time: NEVER append +10:00 — store bare local datetime string
- KAV backgroundColor: `#fff` · Send button: `#FF4545` always
- Channel body bg: `#FAF8F5` — never full colour bleed
- No left-border accent strips · Apostrophes in JSX: double-quoted strings
- expo-file-system: `'expo-file-system/legacy'`
- No literal newlines in JSX strings or regex — use `\n`
- stopPropagation on nested tappable inside tappable row
- Modal stacking: close → setTimeout 350ms → open
- `paddingBottom` on `inputArea` increases = bar moves UP (reduce to move lower)
- Delete patterns: always two-tap (tap → confirm) to prevent accidents
- Sheet opens BEFORE awaiting data — open instantly, populate async
