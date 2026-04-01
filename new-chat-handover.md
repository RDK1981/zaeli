# Zaeli — New Chat Handover
*1 April 2026 — Home card stack rebuild ✅ Pass 1 + Pass 2 complete ✅*

---

## Hi! Continuing development of Zaeli.

Zaeli is an iOS-first AI family life platform built in React Native / Expo. Please read **CLAUDE.md** before we start — full stack, architecture, colours, coding rules. Then **ZAELI-PRODUCT.md** for product vision and all module specs.

---

## How I like to work
- **Beginner developer** — always full file rewrites, never partial diffs
- **Two fixes at a time** — bulk changes = too many variables
- One PowerShell command at a time, never chained with &&
- Plain English before code
- **Design before code** — mockup first for any new channel
- Always ask me to upload the current working file before editing — never build from memory

---

## Who I am
- Richard. **Logged-in user = Rich**
- Family: Rich, Anna, Poppy (Yr6, 12, girl), Gab (Yr4, 10, BOY — Gabriel, he/him), Duke (Yr1, 8, boy)
- Local path: `C:\Users\richa\zaeli` (Windows, PowerShell)
- PowerShell copy: `Copy-Item "C:\Users\richa\Downloads\file.tsx" "C:\Users\richa\zaeli\app\(tabs)\file.tsx"`
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
```

---

## What's built (1 Apr 2026)

### index.tsx — Home ✅ CARD STACK REBUILD COMPLETE

**Pass 1:**
- Card stack: Calendar, Weather+Shopping, Actions, Dinner — all live Supabase data
- Open-Meteo weather (Tewantin lat/lon, free, no key) with animated icons
- Time-state driven card order (AM/PM/Evening)
- Fixed banner: slim warm bar, wordmark + nav only (hero NOT in banner)
- Scrollable hero: date divider → Zaeli eyebrow (✦ + timestamp) → DM Serif hero text
- + Add on each card → seeds Zaeli chat inline
- useChatPersistence('home') + greeting guard
- Up/down scroll arrows

**Pass 2:**
- Circle tick → optimistic UI + Supabase write (done:true, status:'done', done_at) + Zaeli quiet ack
- Ticked items stay visible (struck through 0.45 opacity)
- Dinner "Next 7 days ›" accordion — inline, zero extra API calls, uses day_key
- Calendar "X more ›" overflow — expand/collapse inline

**Font sizes (LOCKED):**
- Card content text: Poppins 400 17px (matches chat)
- Dinner meal name: Poppins 800 19px
- Eye labels / times / buttons: 11–13px

**Critical gotchas:**
```
shopping_items: NO 'quantity' column
  Query: .select('id,name,item,category,checked').neq('checked', true)
  Render: item.name || item.item

meal_plans: primary date field = day_key (YYYY-MM-DD)
  planned_date set to same value — both exist, use day_key
```

### calendar.tsx — Calendar ✅ COMPLETE
Mint banner. Day strip. Event cards. Month view. Tool-calling. Whisper. Persistence. Arrows.

### shopping.tsx — Shopping ✅ COMPLETE
Lavender banner. Sonnet tool-calling. Single shared chat. Local category lookup. Persistence. Arrows.

### mealplanner.tsx — Meals ✅ COMPLETE
Three tabs. Sonnet tool-calling. Persistence. Scroll arrows. Cook avatars. Full modal suite.

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
  │     OR barWaveBtn 40×40 borderRadius:20 bg=channel AI colour (recording)
  └── barSend 32×32 borderRadius:16 bg=#FF4545
inputArea: position:absolute bottom:0 paddingBottom: iOS?30:18 paddingHorizontal:14
KAV: behavior=padding backgroundColor='#fff'
```

---

## SCROLL ARROWS SPEC (LOCKED ✅)
```
scrollArrowPair: position:absolute, bottom:110, right:16, flexDirection:row, gap:8, zIndex:50
scrollArrowBtn:  width:38, height:38, borderRadius:19, bg:rgba(10,10,10,0.40)
```
Implemented: Shopping ✅ · Calendar ✅ · Meals ✅ · Home ✅ · Next: Todos

---

## CHAT PERSISTENCE SPEC (LOCKED ✅)
`lib/use-chat-persistence.ts` — 24hr TTL · 30-msg cap · debounced saves.
Wired: Shopping ✅ · Calendar ✅ · Meals ✅ · Home ✅ · Next: Todos

---

## HOME BANNER (LOCKED ✅)
- Fixed banner: wordmark + Home label + hamburger + avatar ONLY
- No hero in banner — hero lives in ScrollView below banner
- Layout: date divider → Zaeli eyebrow → DM Serif hero → cards → "Earlier today" divider → chat

---

## Immediate next tasks (in priority order)

1. **Create reminders Supabase table** — SQL in ZAELI-PRODUCT.md
2. **Todos + Reminders** (todos.tsx) — `zaeli-todos-reminders-v2.html`
3. **Kids Hub** (kids.tsx)
4. **Our Family** (family.tsx)
5. **Notes** (notes.tsx)
6. **Tutor rebuild** — `zaeli-tutor-final-mockup-v4.html`
7. **Travel** — design session first

---

## Home — deferred for next Home session
- Review card UX based on device usage feedback
- Wire weather to real user location (currently Tewantin/Noosa hardcoded)
- Actions circle un-tick support
- "All done" evening state green card

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
