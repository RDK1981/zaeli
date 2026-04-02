# Zaeli — New Chat Handover
*2 April 2026 — Calendar sheet full build ✅ Inline card polish ✅ Delete flows ✅ Persistence fixed ✅*
*Copy this entire message to start a new chat.*

---

## Hi! Continuing development of Zaeli.

Zaeli is an iOS-first AI family life platform built in React Native / Expo.
Please read **CLAUDE.md** before we start — full stack, architecture, colours, ALL sizing specs.
Then **ZAELI-PRODUCT.md** for product vision and all module decisions.

---

## How I like to work
- **Beginner developer** — always full file rewrites, never partial diffs
- **Two fixes at a time** — bulk changes = too many variables
- One PowerShell command at a time, never chained with &&
- Plain English before code
- **Design before code** — mockup first for any new channel
- Always ask me to upload the current working file before editing

---

## Who I am
- Richard. **Logged-in user = Rich**
- Family: Rich, Anna, Poppy (Yr6, 12, girl), Gab (Yr4, 10, BOY — Gabriel, he/him), Duke (Yr1, 8, boy)
- Local path: `C:\Users\richa\zaeli` (Windows, PowerShell)
- PowerShell: `Copy-Item "C:\Users\richa\Downloads\file.tsx" "C:\Users\richa\zaeli\app\`(tabs`)\file.tsx"`
- Repo: https://github.com/RDK1981/zaeli (private)
- Admin: https://incomparable-gumdrop-32e4ba.netlify.app

---

## Key constants (CRITICAL — never get these wrong)
```
DUMMY_FAMILY_ID = '00000000-0000-0000-0000-000000000001'
SONNET          = 'claude-sonnet-4-20250514'
GPT_MINI        = 'gpt-5.4-mini'
OpenAI = max_completion_tokens · Claude = max_tokens
Send button = #FF4545 coral ALWAYS
Body bg = #FAF8F5 warm white — never full colour bleed
No left-border accent strips on cards
Sheets = clean black/grey (no channel colour)
KAV must have backgroundColor:'#fff'
always await supabase inserts
isActionQuery() runs BEFORE isCalendarQuery()
Apostrophes in JSX: always double-quoted strings
expo-file-system: import as 'expo-file-system/legacy'
NEVER literal newlines inside JSX strings or regex — use \n escape
stopPropagation on nested TouchableOpacity inside tappable parent row
Modal stacking iOS: close modal → setTimeout 350ms → open next modal
NEVER append +10:00 or any timezone suffix to stored event times
fmtTime() and isoToMinutes() use RAW STRING PARSE — never new Date()
paddingBottom on inputArea: INCREASE = bar moves UP, DECREASE = bar moves lower
Sheet opens BEFORE awaiting data (open instantly, populate async)
Always two-tap delete pattern to prevent accidents
```

---

## What's built (2 Apr 2026)

### index.tsx — Home ✅ COMPLETE (single interface + full calendar sheet)

**The big shift:**
Home is the only interface. 9 domain pills always visible. Everything inline or via 92% sheets.

**Cold open:**
1. Zaeli brief (DM Serif 26px) — fetches own live Supabase data, EXACTLY 2 sentences
2. Card stagger: Calendar 0ms → Weather+Shopping 150ms → Actions 300ms → Dinner 450ms
3. 900ms → GPT-mini follow-up in chat thread

**Inline Calendar Card (LOCKED ✅):**
- Dark slate `#3A3D4A`, marginHorizontal: -4 (aligns with chat bar edge)
- Header: date label 12px, `+ Add` button (paddingV:6 paddingH:13), `Full ›` (extra hit area), gap:14
- Event rows: time col width:58 numberOfLines:1, dot 8×8, title 16px, avatars 26×26
- Expand in-place: spring animation (tension:80 friction:10), scaleY 0.85→1
- Action chips: borderRadius:16, paddingV:6 paddingH:12, fontSize:12
  - ✦ Edit with Zaeli (sky blue tint) · Move time · Add someone · Manual edit · Delete (two-tap)
- Footer tabs: Poppins_700Bold 11px, Today · Tomorrow · Month view ›

**Pill tap behaviour:**
- Removes ALL calendar cards → appends fresh full-day at bottom
- Replaces `_isPillFollowUp` Zaeli message with fresh one
- `activePill` clears after 800ms (re-tap enabled)
- Always fires follow-up (no stale-closure guards)

**Calendar Sheet (LOCKED ✅ 2 Apr 2026):**
- 92% height, opens INSTANTLY (data loads async)
- Three tabs: Today · Tomorrow · Month
- Tabs: rgba(0,0,0,0.06) bg, borderRadius:22, padding:3, paddingVertical:10 per tab, Poppins_700Bold 13px
- Content: `<View flex:1>` wrapping tabs + ScrollView (critical for no void area)
- Header X = close sheet · ‹ = back to list from form

Day/Tomorrow tab:
- Date header: Poppins_700Bold 15px rgba(0,0,0,0.50)
- Event cards: white, borderRadius:14, padding:14, borderLeft:3px family colour
  - Time: 14px · Title: 17px · Meta: 13px · Avatars: 26×26
  - Buttons: ✦ Edit with Zaeli · Edit · Delete (two-tap inline confirm)
- Add row: dashed border, left = manual form, right = Zaeli chat

Month tab:
- Day circles: 34×34, borderRadius:17. Today=slate, Selected=coral, font:15px
- Event dots: 5×5, up to 3 per day, family colours
- Tap day → events appear below
- Auto-opens on today with today's events

Edit/Add form:
- Zaeli hint bar top (rgba(168,216,240,0.14), padding:14)
- Inputs: borderRadius:12, paddingH:14 paddingV:12, fontSize:17
- Attendees: 44×44 avatars, selected=border ring, name label 11px
- Pills (Repeat/Reminder): borderRadius:22, paddingV:8 paddingH:16, fontSize:14
- Save: flex:2, paddingV:16, borderRadius:14, #3A3D4A bg
- Delete (edit mode): two-tap, "Yes, delete event" #DC2626 bg
- onSaved: closes sheet → fetches event → injects card + confirmation into chat

**Persistence (LOCKED ✅):**
- `persistenceHasLoaded` ref — load fires once only
- Restores only `isBrief` messages on reload (no cards, no conversation)
- `generateBrief` skips if persisted messages exist

**Chat bar position:**
- `inputArea.paddingBottom`: iOS:16, Android:8 (lower than before)
- Increasing paddingBottom moves bar UP — decrease to move lower
- `scrollContent.paddingBottom: 150`

---

## The Sheet Design System (apply to all future sheets)

```
Height: 92%, bg: #FAF8F5, borderTopRadius: 24
Handle: 36×4px, marginTop:10
Header: paddingH:16 paddingV:12, icon + title 18px, X/‹ button 32×32
Tabs: rgba(0,0,0,0.06), borderRadius:22, padding:3, marginH:14
  Each tab: paddingVertical:10, borderRadius:19, font:13px
  WRAP IN View flex:1 — critical for no void area below
ScrollView: flex:1, padding:16, paddingBottom:50
Backdrop: TouchableOpacity (NOT Pressable)
Panel: plain View (NOT Pressable)
Open INSTANTLY → fetch async
```

Cards in sheets:
```
white bg, borderRadius:14, padding:14, borderLeft:3px domain colour
Title 17px · Meta 13px · Avatars 26×26
Primary CTA (Zaeli): sky blue tint bg, borderRadius:10, pV:7 pH:12, 13px
Secondary: rgba(0,0,0,0.06) bg, same sizing
Delete: two-tap always
```

Form fields:
```
Labels: 11px uppercase, letterSpacing:0.8
Inputs: borderRadius:12, pH:14 pV:12, font:17px
Toggle pills: borderRadius:22, pV:8 pH:16, font:14px. Active:#0A0A0A bg
Attendees: 44×44, selected has border ring
Save: flex:2 pV:16 borderRadius:14 #3A3D4A · Cancel: flex:1 rgba(0,0,0,0.06)
```

---

## CANONICAL CHAT BAR SPEC (LOCKED ✅)
```
barPill: borderRadius:30, paddingVertical:14, paddingHorizontal:16, borderWidth:1
  bg:#fff, borderColor:rgba(10,10,10,0.09)
inputArea: position:absolute bottom:0
  paddingBottom: iOS?16:8  ← LOWER = bar moves down. HIGHER = bar moves up.
  paddingHorizontal:14
  NO backgroundColor on inputArea
KAV: behavior=padding backgroundColor='#fff'
scrollContent paddingBottom: 150
```

---

## DOMAIN PILL BAR SPEC (LOCKED ✅)
```
Pills: borderRadius:20, paddingVertical:9, paddingLeft:11, paddingRight:13
       backgroundColor:#fff, borderWidth:1, borderColor:rgba(0,0,0,0.10)
Icons: 18×18 SVG · Label: Poppins_600SemiBold 11px
activePill clears after 800ms (re-tap works immediately)
```

---

## EVENT TIME CONTRACT (CRITICAL ✅ LOCKED)
```
✅ Store: "2026-04-01T16:00:00" → raw parse reads 16 → 4:00 pm ✓
❌ Never: "...+10:00" → Supabase converts → wrong time ✗
```

---

## Immediate next tasks (priority order)

1. **Shopping sheet** — List · Pantry · Spend tabs. Follow sheet design system above.
2. **Meals sheet** — Dinners · Recipes · Favourites tabs.
3. **Create reminders Supabase table** (SQL in ZAELI-PRODUCT.md)
4. **Todos + Reminders** (todos.tsx)
5. **Kids Hub** (kids.tsx)
6. **Our Family** (family.tsx) — sheet-based
7. **Notes** (notes.tsx)
8. **Tutor rebuild**
9. **Travel** — design session first

---

## Key decisions locked this session (2 Apr 2026)
- Calendar sheet: 92% height, opens instantly, data async
- All future sheets follow the locked design system above
- Inline card: marginHorizontal:-4, pill tap removes ALL calendar cards then appends fresh
- Persistence: brief-only restore on reload, no stacking
- Delete: always two-tap in all three locations
- Manual edit chip → opens sheet directly to edit form for that specific event
- After manual save → closes sheet + injects confirmation card + Zaeli message into chat
- paddingBottom on inputArea: lower value = lower bar position
- `<View flex:1>` wrapping tabs+ScrollView is critical — prevents void area in sheets

---

## Tech reminders
- `npx expo start --dev-client` after copying (`--clear` for bundle issues)
- Import paths from `app/(tabs)/`: `../../lib/supabase`
- expo-file-system: `import * as FileSystem from 'expo-file-system/legacy'`
- Supabase: `rsvbzakyyrftezthlhtd` (Sydney)
- Admin deploy: drag `C:\Users\richa\Downloads\index.html` to Netlify
- Windows dev — no && chaining in PowerShell

---

**Read CLAUDE.md and ZAELI-PRODUCT.md first. Always ask Richard to upload the current file before editing.**
