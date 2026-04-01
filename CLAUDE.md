# CLAUDE.md — Zaeli Project Context
*Last updated: 1 April 2026 — Single interface concept ✅ Domain pill bar ✅ Time fixes ✅*

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

**Unit economics (confirmed 1 Apr 2026):**
- home_brief + detail + post_card: ~A$0.0012/cold open total
- home_pill_tap: ~A$0.0004/tap
- shopping/meals/calendar chat (Sonnet): ~A$0.01–0.03/call
- Real MTD cost March 2026: A$3.17 / 1,048 calls

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
- Pill tap → inline card drops into chat + GPT-mini follow-up 400ms later
- "Full ›" on any inline card → 80% bottom sheet (clean black/grey UI)
- Dedicated channel pages still exist but hidden from users — accessible via "Full ›" only
- Kids Hub + Tutor remain standalone (sustained attention use cases)
- **Avatar tap:** Kids Hub · Tutor · Settings · Sign out
- Always `router.navigate()` — never push() or replace()

---

## Channel Architecture
```
app/(tabs)/index.tsx          → Home ✅ SINGLE INTERFACE COMPLETE (1 Apr 2026)
app/(tabs)/calendar.tsx       → Calendar ✅ COMPLETE
app/(tabs)/shopping.tsx       → Shopping ✅ REBUILD COMPLETE (31 Mar)
app/(tabs)/mealplanner.tsx    → Meals ✅ REBUILD COMPLETE (1 Apr)
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
No left-border accent strips. Shopping 'a' and 'i' = `#A8E8CC` mint.

**Colour rule:** Channel colours live ONLY in inline chat card renders. Sheets are clean black/grey.

---

## Family Member Colours (LOCKED)
```
Rich: #4D8BFF · Anna: #FF7B6B · Poppy: #A855F7 · Gab: #22C55E · Duke: #F59E0B
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
  │     OR barWaveBtn 40×40 borderRadius:20 bg=channel AI colour (recording)
  └── barSend 32×32 borderRadius:16 bg=#FF4545
inputArea: position:absolute bottom:0 paddingBottom:iOS?30:18 paddingHorizontal:14
  NO backgroundColor on inputArea — KAV #fff shows through = floating effect
KAV: behavior=padding backgroundColor='#fff'
Our Family: NO chat bar.
```

---

## DOMAIN PILL BAR SPEC (LOCKED ✅ 1 Apr 2026)

```
Sits INSIDE inputArea, ABOVE the chat bar pill.
inputArea has NO background — KAV #fff creates the floating effect.
Pills row: ScrollView horizontal, gap:6, marginBottom:8

Option D SVG pills:
  pill: flexDirection:row, alignItems:center, gap:6, borderRadius:20
        paddingVertical:9, paddingLeft:11, paddingRight:13
        backgroundColor:#fff (solid white), borderWidth:1, borderColor:rgba(0,0,0,0.10)
        flexShrink:0  (never compress)
  SVG icons: 18×18 — channel accent colour as stroke (inactive)
  Label: Poppins_600SemiBold, fontSize:11, color:rgba(0,0,0,0.45)

Active pill: channel palette bg + deeper icon + label. Calendar = dark slate.
Active colours:
  Home     activeBg:#F5EAD8  activeIco:rgba(0,0,0,0.7)
  Calendar activeBg:#3A3D4A  activeIco:#fff           ← dark slate, white icon
  Shopping activeBg:#EDE8FF  activeIco:rgba(80,32,192,0.9)
  Meals    activeBg:#FAC8A8  activeIco:rgba(200,64,16,0.9)
  To-dos   activeBg:#F0DC80  activeIco:rgba(128,96,0,0.9)
  Notes    activeBg:#C8E8A8  activeIco:rgba(44,96,16,0.9)
  Travel   activeBg:#A8D8F0  activeIco:rgba(0,96,160,0.9)
  Family   activeBg:#F0C8C0  activeIco:rgba(160,24,48,0.9)
  More     activeBg:rgba(0,0,0,0.10) activeIco:rgba(0,0,0,0.7)
```

---

## SCROLL ARROWS SPEC (LOCKED ✅)

```
scrollArrowPair: position:absolute, bottom:110, right:16, flexDirection:row, gap:8, zIndex:50
scrollArrowBtn:  width:38, height:38, borderRadius:19, bg:rgba(10,10,10,0.40)
Up → scrollTo({y:0}) · Down → scrollToEnd()
```

---

## HOME COLD OPEN SEQUENCE (LOCKED ✅ 1 Apr 2026)

1. Brief hero arrives (DM Serif 26px, italic emphasis via `renderHeroText`)
2. "Today's overview" toggle auto-opens after 200ms
3. Cards stagger: Calendar 0ms → Weather+Shopping 150ms → Actions 300ms → Dinner 450ms
4. 900ms → `generatePostCardPrompt()` → targeted follow-up in chat thread

**Brief formula (ENFORCED — 160 max tokens):**
- EXACTLY 2 SHORT sentences. Name the person. Most urgent first. One confirmation.
- [square brackets] = italic in DM Serif.
- Never start with "I". Evening = calm tone. All-done = reward moment.

---

## EVENT TIME CONTRACT (CRITICAL ✅ LOCKED 1 Apr 2026)

**Store bare local datetime. Raw string parse for display. No timezone suffix. Ever.**

```
✅ Store: "2026-04-01T16:00:00"  → displays 4:00 pm ✓
❌ Never: "2026-04-01T16:00:00+10:00" → Supabase converts to UTC → displays 6:00 am ✗
```

`fmtTime()` and `isoToMinutes()` in BOTH `calendar.tsx` AND `index.tsx` use raw string parse.
All save paths store bare local datetime — no `new Date()` for display, no `+10:00` suffix.

**Pre-launch timezone task:** Full fix needed before multi-timezone users.
Store true UTC, display via `Intl.DateTimeFormat` with stored `timezone` field.

---

## PANTRY — LAST BOUGHT MODEL (LOCKED ✅ 1 Apr 2026)

Stock bars removed. Pantry shows "last bought" date per item.
Photo scan logs items as purchased (not stock levels).
Zaeli reasons from purchase frequency. Receipts = primary data source.

---

## SHEETS — 80% BOTTOM SHEETS (NEXT BUILD)

"Full ›" on any inline card → 80% sheet slides up.
Clean black/grey minimal UI — NO channel colour in sheets.
Colour lives ONLY in inline chat card renders.
Sheets are workspaces not destinations. Max 2 levels deep.

Sheet tabs per domain:
- Calendar: Today · Tomorrow · Month
- Shopping: List · Pantry · Spend
- Meals: Dinners · Recipes · Favourites
- Todos: Actions · Family
- Travel: Trips · Itinerary · Packing
- Family: overview (approve jobs, check progress)
- Notes: flat list

Reference: `zaeli-single-interface-v1.html` (7 screens)

---

## HTML Mockup Files (in /mnt/user-data/outputs/ and repo)
```
zaeli-single-interface-v1.html   → Single interface full concept (7 screens) — BUILD FROM THIS
zaeli-svg-pills-v1.html          → Option D SVG pills + frosted glass (LOCKED)
zaeli-home-cold-open-v1.html     → Brief V2 stagger + brief quality examples (LOCKED)
zaeli-pill-variations-v1.html    → Pill options A/B/C/D comparison
zaeli-todos-reminders-v2.html    → Todos + Reminders (5 screens)
zaeli-tutor-final-mockup-v4.html → Tutor (11 screens)
zaeli-kids-hub-rewards-v2.html   → Kids Hub
zaeli-our-family-mockup-v1.html  → Our Family (6 screens)
zaeli-notes-mockup-v1.html       → Notes (5 screens)
```

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

---

## Screen Status

| File | Status | Notes |
|---|---|---|
| index.tsx | ✅ Single interface complete | Brief + stagger + pills + post-card — 1 Apr |
| calendar.tsx | ✅ Complete | Time fix applied — 1 Apr |
| shopping.tsx | ✅ Rebuild complete | Lavender, Sonnet, persistence |
| mealplanner.tsx | ✅ Rebuild complete | Full spec — 1 Apr |
| lib/use-chat-persistence.ts | ✅ Complete | Keys: home, shopping, calendar, meals |
| todos.tsx | ✅ Design complete | Not built — create reminders table first |
| kids.tsx | ✅ Design complete | Not built |
| family.tsx | ✅ Design complete | Not built |
| notes.tsx | ✅ Design complete | Not built |
| travel.tsx | No design | Design session needed |
| tutor/* | ✅ Design complete | Needs rebuild |

---

## Next Priorities

1. **80% sheets** — Calendar, Shopping, Meals, Todos, Notes, Travel, Family sheets triggered by "Full ›". Follow `zaeli-single-interface-v1.html` exactly.
2. **Create reminders Supabase table** — SQL in ZAELI-PRODUCT.md
3. **Todos + Reminders** (todos.tsx)
4. **Kids Hub** (kids.tsx)
5. **Our Family** (family.tsx) — sheet-based
6. **Notes** (notes.tsx)
7. **Tutor rebuild**
8. **Travel** — design session first

**Deferred:** timezone full fix · real auth · EAS · Stripe · Settings · weather to real location
