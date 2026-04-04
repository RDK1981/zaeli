# CLAUDE.md — Zaeli Project Context
*Last updated: 4 April 2026 — ZaeliFAB Phase 1 complete ✅ v5 architecture locked ✅*

---

## Who You Are Talking To
- **Richard** — beginner developer. Always give **full file rewrites**, easy copy-paste PowerShell commands, one step at a time
- Never give partial diffs or targeted edits unless it is a single truly isolated line
- Always explain what you are doing in plain English before diving into code
- Family: Rich (logged-in user), Anna, Poppy (Yr6, age 12, girl), Gab (Yr4, age 10, BOY — Gabriel, always he/him), Duke (Yr1, age 8, boy)
- Local path: `C:\Users\richa\zaeli` (Windows, PowerShell — no && chaining)
- Repo: https://github.com/RDK1981/zaeli (private)
- PowerShell screen copy: `Copy-Item "C:\Users\richa\Downloads\file.tsx" "C:\Users\richa\zaeli\app\`(tabs`)\file.tsx"`
- PowerShell component copy: `Copy-Item "C:\Users\richa\Downloads\ZaeliFAB.tsx" "C:\Users\richa\zaeli\app\components\ZaeliFAB.tsx"`
- Full file rewrites only — never partial diffs
- Design before code — always discuss/mockup new screens before writing code
- **Two fixes at a time** — bulk changes create too many debugging variables

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
- OpenAI GPT-5.4 mini (`gpt-5.4-mini`) — home_brief, home_post_card, Pulse notices, Tutor chat
- OpenAI Whisper-1 — voice transcription (Mic button in ZaeliFAB)
- expo-router, expo-image-picker, react-native-svg, expo-file-system (chat persistence)
- Poppins font (ALL UI including brief), DMSerifDisplay (wordmark + large card numbers only)
- No bottom tab bar — ZaeliFAB is the only navigation

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
NEVER use literal newlines inside JSX strings or regex — use \n escape
stopPropagation on nested TouchableOpacity inside tappable parent rows
Modal stacking iOS: close modal 1 → setTimeout 350ms → open modal 2
NEVER append +10:00 or any timezone suffix to stored event times
ZaeliFAB is the ONLY navigation — no pill bar, no hamburger, no tab bar
No persistent chat input bar anywhere — keyboard via Chat FAB second tap
Brief font = Poppins_700Bold (NOT DM Serif)
DM Serif = wordmark and large card numbers only
Zaeli messages = full width, no bubble (v5)
```

---

## ══════════════════════════════════
## V5 NAVIGATION ARCHITECTURE (LOCKED ✅ 4 Apr 2026)
## ══════════════════════════════════

### The Three-Screen World

After Landing dismisses, the app lives as a **horizontal three-screen strip:**

```
Pulse  ←  Dashboard  →  Chat
```

- **Dashboard** is the permanent anchor — centre after Landing dismisses
- **Swipe left** from Dashboard → Chat
- **Swipe right** from Dashboard → Pulse
- Dots indicator always shows position (3 dots, active pill expands)
- No pill bar. No hamburger. No tab bar. ZaeliFAB is the only navigation.

### Landing Screen (time-window only)

Landing appears during three daily time windows:
- Morning: 6:00am – 9:00am
- Midday: 12:00pm – 2:00pm
- Evening: 5:00pm – 8:00pm

**Behaviour:**
- Brief pre-generated and waiting — no load delay on open
- Full-screen gradient bleeds behind status bar
- **First swipe dismisses Landing for that time window**
- After dismiss: world collapses to Dashboard ↔ Chat ↔ Pulse
- Outside windows: app opens directly to Dashboard

### Landing Visual Spec (LOCKED ✅)
```
Background: full-screen gradient, bleeds behind status bar
  Morning:  linear gradient #FFF6EC → #FFDEB8 (warm amber)
  Midday:   linear gradient #EDF6FF → #C4DFFF (cool blue)
  Evening:  linear gradient #F5EEFF → #D8C8F8 (soft purple)

Logo: DM Serif Display, top-left, 22px
  'a' and 'i' colour COMPLEMENTS background — never matches:
  Morning (warm)  → ai colour: #0096C7 cyan
  Midday (cool)   → ai colour: #D4006A magenta
  Evening (purple)→ ai colour: #E8601A terracotta

Greeting: Poppins 600, 10px, uppercase, letterSpacing 0.8, rgba(10,10,10,0.28)
Brief: Poppins 700Bold, 21px, letterSpacing -0.6, lineHeight 1.38
  Coral #FF4545 highlights on key facts
Sub-line: Poppins 400, 12px, rgba(10,10,10,0.32)

Dots: 3 dots, active = 20px wide pill, rgba(10,10,10,0.36)
NO swipe hint text — dots only

ZaeliFAB present on Landing as on all screens
Status bar: dark text on all gradients
```

---

## ══════════════════════════════════
## ZAELIFAX — LOCKED SPEC (✅ Phase 1 Complete — 4 Apr 2026)
## ══════════════════════════════════

**File:** `app/components/ZaeliFAB.tsx`
**Status:** Built ✅ — live in index.tsx, sizing locked on device

The ONLY navigation element in the app. Present on every screen always.

### Sizing Constants (LOCKED — device tested ✅)
```
FAB_BTN    = 58px   button squares
FAB_PAD    = 10px   internal padding each side
FAB_SEP_W  = 1px    separator width
FAB_SEP_MX = 8px    separator margin each side
FAB_GAP    = 4px    gap between buttons
FAB_WIDTH  = 318px  total (auto-calculated)

FAB bar:   borderRadius 36px · bg rgba(255,255,255,0.88) · blur backdrop
Mic pill:  borderRadius 36px · width FAB_WIDTH · bottom 124px iOS / 110px Android
More card: borderRadius 36px · width FAB_WIDTH · bottom 124px iOS / 110px Android
Root:      paddingBottom 24px iOS / 14px Android
```

### Button Layout
```
[ Dashboard ] | [ Chat ][ Mic ] | [ More ]
```

### Button States (LOCKED ✅)
```
Dashboard: dark #0A0A0A bg + white icon when active
Chat:      dark #0A0A0A bg at rest on chat screen
           coral #FF4545 bg when keyboard open (activeButton='keyboard')
Mic:       coral #FF4545 bg when recording
More:      coral #FF4545 bg + white icon when overlay open
           no active state at rest
```

### Mic v2 Pill (LOCKED ✅)
```
Same width + borderRadius as FAB bar — symmetrical pair
Waveform: 7 bars heights [10,18,28,36,28,18,10]px, coral, staggered animation
Contents: waveform | "Listening…" Poppins 600 14px | Cancel button coral
Appears above FAB with clean gap — no overlap
```

### More Overlay 3×3 (LOCKED ✅)
```
Same width + borderRadius as FAB bar
Full backdrop blur rgba(10,10,10,0.36) — taps behind blocked
Grid: justifyContent:'space-between', each item width:'31%'
Icon tiles: 58×58px, borderRadius 20, 10% channel bg opacity, 26px SVG icons

Row 1: Notes · Kids Hub · Tutor
Row 2: Travel · Family · Meals
Row 3: Pulse · Zen · Settings  ← Settings always bottom-right

More button goes coral when overlay open — visual toggle feedback
Grows from More button upward: scale 0.90→1 + opacity spring
```

### More Item Channel Colours (LOCKED ✅)
```
Notes: #5C8A3C · Kids Hub: #0A8A5A · Tutor: #6B35D9
Travel: #0096C7 · Family: #D4006A · Meals: #E8601A
Pulse: #FF4545 · Zen: #5C8A3C · Settings: #6B7280
```

### Props Interface
```typescript
interface ZaeliFABProps {
  activeButton:     'dashboard' | 'chat' | 'keyboard' | null;
  onDashboard:      () => void;
  onChat:           () => void;
  onChatKeyboard?:  () => void;   // second tap = open keyboard
  onMoreItem?:      (itemKey: string) => void;
  onMicResult?:     (text: string) => void;
}
```

---

## ══════════════════════════════════
## DASHBOARD SCREEN (LOCKED ✅ 4 Apr 2026)
## ══════════════════════════════════

Dedicated screen. Background `#FAF8F5`. ZaeliFAB only. No chat bar.

Card stack (top to bottom):
1. Calendar — dark slate `#3A3D4A`
2. Weather `#E6F1FF` + Shopping `#E8F5EE` — 50/50 side by side
3. Today's Actions — `#FFFCE6` gold tint
4. Dinner tonight — `#FFF1E8` peach tint

Card tap → Chat with that domain's context injected.
Middle dot active (Dashboard = permanent anchor).

---

## ══════════════════════════════════
## CHAT SCREEN (LOCKED ✅ 4 Apr 2026)
## ══════════════════════════════════

### Two entry states
- **Fresh** (Chat FAB tap): "Hey Rich. How can I help?" + 3 chips
- **Card-triggered** (Dashboard card tap): inline card + contextual Zaeli message

### Zaeli message style (v5 LOCKED ✅)
```
Full width — NO bubble
Label: "Zaeli" — Poppins 700, 9px, uppercase, rgba(10,10,10,0.22)
Text: Poppins 400, 13–17px, lineHeight 1.62, full width
No background, no border, no avatar bubble
```

User replies: right-aligned dark bubble, #0A0A0A, borderRadius 16/16/3/16.

Keyboard = second tap Chat FAB (activeButton → 'keyboard', coral).
Voice = Mic FAB. No persistent input bar. Locked.

---

## ══════════════════════════════════
## PULSE SCREEN (LOCKED ✅ 4 Apr 2026)
## ══════════════════════════════════

Family awareness layer — calm scroll, not a notification feed.
Three zones: Zaeli Noticed · Family Activity · On the Horizon.
Live pulsing coral dot in header. Reads existing Supabase tables.

---

## ══════════════════════════════════
## ZEN SCREEN (LOCKED ✅ 4 Apr 2026)
## ══════════════════════════════════

5-min breathing tool. More overlay → Zen. Full screen, no ZaeliFAB.
Breathing circle animation + countdown. Tap start/pause. Back button exits.

---

## ══════════════════════════════════
## INLINE CALENDAR CARD SPEC (LOCKED ✅ 2 Apr 2026)
## ══════════════════════════════════

```
backgroundColor: '#3A3D4A', borderRadius: 16, marginHorizontal: -4
Event rows: time col width:58, dot 8×8, title 16px, avatars 26×26
Expand: spring tension:80 friction:10, scaleY 0.85→1
Action chips: ✦ Edit with Zaeli · Move time · Add someone · Manual edit · Delete (two-tap)
Footer: Today · Tomorrow · Month view ›
```

---

## ══════════════════════════════════
## SHEET DESIGN SYSTEM (LOCKED ✅ 2 Apr 2026)
## ══════════════════════════════════

92% height, `#FAF8F5` bg, borderTopRadius 24px.
Open INSTANTLY (setSheetOpen true BEFORE any await). Fetch async after.
Backdrop: TouchableOpacity (NOT Pressable). Panel: plain View (NOT Pressable).
Sheets completely unchanged in v5.

---

## ══════════════════════════════════
## EVENT TIME CONTRACT (CRITICAL ✅ LOCKED)
## ══════════════════════════════════
```
✅ Store: "2026-04-01T16:00:00"  → displays 4:00 pm ✓
❌ Never: "2026-04-01T16:00:00+10:00" → Supabase converts → wrong ✗
fmtTime() and isoToMinutes(): raw string parse. Never new Date() for display.
```

---

## Per-Channel Colour System (LOCKED)

| Channel | Banner bg | Accent |
|---------|-----------|--------|
| Home/Chat | `#FAF8F5` cream | `#FF4545` coral |
| Calendar | `#B8EDD0` | `#0A7A3A` |
| Shopping | `#EDE8FF` Lavender | `#5020C0` |
| Meals | `#FAC8A8` | `#C84010` |
| Kids Hub | `#A8E8CC` | `#0A6040` |
| Tutor | `#D8CCFF` | `#5020C0` |
| To-dos | `#F0DC80` | `#806000` |
| Notes | `#C8E8A8` | `#2A6010` |
| Travel | `#A8D8F0` | `#0060A0` |
| Our Family | `#F0C8C0` | `#A01830` |

**CRITICAL:** Send = `#FF4545` coral always. Body bg = `#FAF8F5` always.
No left-border accent strips on cards. Sheets = clean black/grey.

## Family Member Colours (LOCKED)
```
Rich: #4D8BFF · Anna: #FF7B6B · Poppy: #A855F7 · Gab: #22C55E · Duke: #F59E0B
```

---

## Channel Architecture (v5)
```
app/(tabs)/index.tsx          → Chat ✅ v5 updated (FAB in, pills/input bar out)
app/(tabs)/dashboard.tsx      → Dashboard 🔨 Phase 4 NEXT
app/(tabs)/landing.tsx        → Landing 🔨 Phase 2 NEXT
app/(tabs)/pulse.tsx          → Pulse 🔨 Phase 6
app/(tabs)/zen.tsx            → Zen 🔨 Phase 8
app/(tabs)/calendar.tsx       → Calendar ✅ COMPLETE (unchanged)
app/(tabs)/shopping.tsx       → Shopping ✅ COMPLETE (unchanged)
app/(tabs)/mealplanner.tsx    → Meals ✅ COMPLETE (unchanged)
app/(tabs)/todos.tsx          → Todos (not yet built)
app/(tabs)/kids.tsx           → Kids Hub (not yet built)
app/(tabs)/notes.tsx          → Notes (not yet built)
app/(tabs)/travel.tsx         → Travel (not yet built)
app/(tabs)/family.tsx         → Our Family (not yet built)
app/(tabs)/tutor.tsx          → Tutor (needs rebuild)
app/components/ZaeliFAB.tsx   → ZaeliFAB ✅ COMPLETE Phase 1
lib/use-chat-persistence.ts   → ✅ Keys: home | shopping | calendar | meals
```

---

## Build Phase Plan (v5)
```
Phase 1: ZaeliFAB component       ✅ COMPLETE
Phase 2: Landing screen           🔨 NEXT — app/(tabs)/landing.tsx
Phase 3: Navigation architecture  🔨 — _layout.tsx (horizontal scroll + dots)
Phase 4: Dashboard screen         🔨 — app/(tabs)/dashboard.tsx
Phase 5: Chat screen v5 updates   🔨 — index.tsx (full-width Zaeli, two entry states)
Phase 6: Pulse screen             🔨 — app/(tabs)/pulse.tsx
Phase 7: Sheets unchanged         ✅ confirmed
Phase 8: Zen screen               🔨 — app/(tabs)/zen.tsx
```

---

## Coding Rules
- SafeAreaView edges={['top']} always
- PowerShell: no && — separate lines always
- Always npx expo start --dev-client (--clear for bundle issues)
- Date: local construction — NEVER toISOString()
- Time: NEVER append +10:00 — store bare local datetime string
- KAV backgroundColor: '#fff' · Send button: '#FF4545' always
- Channel body bg: '#FAF8F5' — never full colour bleed
- No left-border accent strips · Apostrophes in JSX: double-quoted strings
- expo-file-system: 'expo-file-system/legacy'
- No literal newlines in JSX strings or regex — use \n
- stopPropagation on nested tappable inside tappable row
- Modal stacking: close → setTimeout 350ms → open
- Delete patterns: always two-tap to prevent accidents
- Sheet opens BEFORE awaiting data — open instantly, populate async
- router.navigate() always — never push() or replace()
- ZaeliFAB import: `../components/ZaeliFAB` from app/(tabs)/
