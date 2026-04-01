# Zaeli — New Chat Handover
*1 April 2026 — Single interface ✅ Domain pills ✅ Brief + stagger ✅ Time fixes ✅*
*Copy this entire message to start a new chat.*

---

## Hi! Continuing development of Zaeli.

Zaeli is an iOS-first AI family life platform built in React Native / Expo.
Please read **CLAUDE.md** before we start — full stack, architecture, colours, all specs.
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
SONNET          = 'claude-sonnet-4-20250514'  ← NOT claude-sonnet-4-6
GPT_MINI        = 'gpt-5.4-mini'             ← NOT gpt-4.1-mini (retired)
OpenAI = max_completion_tokens · Claude = max_tokens
api_logs = input_tokens / output_tokens (NO total_tokens column)
KAV must have backgroundColor:'#fff'
always await supabase inserts
Send button = #FF4545 coral ALWAYS
Our Family = NO chat bar
Channel body bg = #FAF8F5 warm white — never full colour bleed
No left-border accent strips on cards — dots, icons, badges only
isActionQuery() runs BEFORE isCalendarQuery()
Apostrophes in JSX: always double-quoted strings
expo-file-system: import as 'expo-file-system/legacy'
Do NOT use @react-native-async-storage — requires native rebuild
NEVER literal newlines inside JSX strings or regex — use \n escape
stopPropagation on nested TouchableOpacity inside tappable parent row
Modal stacking iOS: close modal → setTimeout 350ms → open next modal
NEVER append +10:00 or any timezone suffix to stored event times
fmtTime() and isoToMinutes() use RAW STRING PARSE — never new Date()
```

---

## What's built (1 Apr 2026)

### index.tsx — Home ✅ SINGLE INTERFACE COMPLETE

**The big shift this session:**
Home is now the only interface. 9 domain pills always visible. Everything inline or via 80% sheets.

**Cold open sequence:**
1. Zaeli brief (DM Serif 26px) — fetches own live Supabase data, formula-driven, EXACTLY 2 sentences max
2. "Today's overview" toggle — auto-opens 200ms after brief, collapses/expands card stack
3. Cards stagger: Calendar 0ms → Weather+Shopping 150ms → Actions 300ms → Dinner 450ms (fadeIn + translateY)
4. 900ms after brief → `generatePostCardPrompt()` → targeted GPT-mini follow-up in chat thread

**Domain pill bar (Option D SVG — LOCKED):**
- 9 horizontal pills above chat bar, inside `inputArea` (position:absolute)
- inputArea has NO background — KAV #fff creates floating effect
- Pills: white solid bg, thin border, 18×18 SVG icons, ~80% of chat bar height
- Inactive: muted icon in channel accent colour
- Active: channel palette bg + deeper icon + label (Calendar = dark slate #3A3D4A)
- Pill tap → inline card drops immediately + GPT-mini follow-up 400ms later

**Brief formula (enforced — 160 max tokens):**
- EXACTLY 2 SHORT sentences. Name the person. Most urgent first. Confirm one win.
- [brackets] = DM Serif italic. Banned: "breathing room" + all persona banned words.
- Tone shifts: morning=direct, afternoon=practical, evening=calm, all-done=reward.

**Pill tap behaviour:**
- Home → scroll to top · Notes/Travel/Family → router.navigate() · More → nav menu
- Calendar/Shopping/Meals/Todos → fetch live data → drop inline card → GPT-mini follow-up

### calendar.tsx — Calendar ✅ COMPLETE + TIME FIX

**Critical time fix applied 1 Apr:**
- `fmtTime()` and `isoToMinutes()` use raw string parse (not new Date())
- All save paths store bare local datetime: `"2026-04-01T16:00:00"` (NO +10:00)
- 5 paths fixed: tool-calling add, tool-calling update, manual create, edit modal, move-date

### shopping.tsx — Shopping ✅ COMPLETE

### mealplanner.tsx — Meals ✅ COMPLETE

### lib/use-chat-persistence.ts ✅ COMPLETE
Keys: 'home' | 'shopping' | 'calendar' | 'meals'. Next: 'todos'.

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
inputArea: position:absolute bottom:0 paddingBottom:iOS?30:18 paddingHorizontal:14
  NO backgroundColor on inputArea — KAV #fff shows through = floating effect
KAV: behavior=padding backgroundColor='#fff'
```

---

## DOMAIN PILL BAR SPEC (LOCKED ✅)
```
Sits inside inputArea, ABOVE chat bar pill.
Pills: flexDirection:row, gap:6, borderRadius:20, paddingVertical:9, paddingLeft:11, paddingRight:13
       backgroundColor:#fff, borderWidth:1, borderColor:rgba(0,0,0,0.10)
SVG icons: 18×18, channel accent colour (inactive)
Label: Poppins_600SemiBold, fontSize:11
Pill row: ScrollView horizontal, gap:6, marginBottom:8

Active colours (channel palette bg + deeper icon):
  Home: #F5EAD8 · Calendar: #3A3D4A (white icon) · Shopping: #EDE8FF
  Meals: #FAC8A8 · Todos: #F0DC80 · Notes: #C8E8A8
  Travel: #A8D8F0 · Family: #F0C8C0 · More: rgba(0,0,0,0.10)
```

---

## SCROLL ARROWS SPEC (LOCKED ✅)
```
scrollArrowPair: position:absolute, bottom:110, right:16, flexDirection:row, gap:8, zIndex:50
scrollArrowBtn:  width:38, height:38, borderRadius:19, bg:rgba(10,10,10,0.40)
```
Implemented: Shopping ✅ · Calendar ✅ · Meals ✅ · Home ✅

---

## EVENT TIME CONTRACT (CRITICAL — LOCKED ✅)
```
✅ Store:  "2026-04-01T16:00:00"      → raw parse reads 16 → 4:00 pm ✓
❌ Never:  "2026-04-01T16:00:00+10:00" → Supabase converts to UTC → raw parse reads 06 → 6:00 am ✗
```
fmtTime() and isoToMinutes() in BOTH files: raw string parse. Never new Date() for display.

---

## PANTRY — LAST BOUGHT MODEL (LOCKED ✅)
Stock bars removed. Shows "last bought [date]" per item.
Photo scan = logs as purchased. Receipts = primary source.

---

## SHEETS — 80% BOTTOM SHEETS (NEXT BUILD)
"Full ›" on any inline card → 80% sheet.
Clean black/grey UI — no channel colour. Workspaces, not destinations.
Reference: `zaeli-single-interface-v1.html` (7 screens).

Sheet tabs:
- Calendar: Today · Tomorrow · Month
- Shopping: List · Pantry · Spend
- Meals: Dinners · Recipes · Favourites
- Todos: Actions · Family
- Travel: Trips · Itinerary · Packing
- Family: overview sheet
- Notes: flat list

---

## Immediate next tasks (in priority order)

1. **80% sheets** — build sheet components for all 7 domains. Follow `zaeli-single-interface-v1.html` exactly.
2. **Create reminders Supabase table** (SQL in ZAELI-PRODUCT.md)
3. **Todos + Reminders** (todos.tsx)
4. **Kids Hub** (kids.tsx)
5. **Our Family** (family.tsx) — sheet-based
6. **Notes** (notes.tsx)
7. **Tutor rebuild**
8. **Travel** — design session first

---

## Key decisions locked this session (don't revisit)
- Single interface: everything in Home, pills + sheets
- No dedicated channel navigation for users
- Option D SVG pills: white solid, channel palette active, Calendar = dark slate
- Pills at ~80% chat bar height (paddingVertical:9)
- Colour in inline cards only, sheets = black/grey
- Pantry = last bought dates, no stock bars
- Time: bare local datetime, raw parse, no +10:00 ever
- Kids Hub + Tutor remain standalone
- Travel + Our Family now accessed via pills → sheets
- Brief: EXACTLY 2 sentences, 160 max tokens, fetches own live data

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
