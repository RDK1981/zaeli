# CLAUDE.md — Zaeli Project Context
*Last updated: 4 April 2026 — v5 architecture locked ✅ Three-screen world ✅ FAB system ✅ Pulse ✅ Landing ✅*

---

## Who You Are Talking To
- **Richard** — beginner developer. Always give **full file rewrites**, easy copy-paste PowerShell commands, one step at a time
- Never give partial diffs or targeted edits unless it is a single truly isolated line
- Always explain what you are doing in plain English before diving into code
- Family: Rich (logged-in user), Anna, Poppy (Yr6, age 12, girl), Gab (Yr4, age 10, BOY — Gabriel, always he/him), Duke (Yr1, age 8, boy)
- Local path: `C:\Users\richa\zaeli` (Windows, PowerShell — no && chaining)
- Repo: https://github.com/RDK1981/zaeli (private)
- PowerShell copy: `Copy-Item "C:\Users\richa\Downloads\file.tsx" "C:\Users\richa\zaeli\app\`(tabs`)\file.tsx"`
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
- OpenAI Whisper-1 — voice transcription (Mic button)
- expo-router, expo-image-picker, react-native-svg, expo-file-system (chat persistence)
- Poppins font (ALL UI including brief), DMSerifDisplay (wordmark + card titles only)
- No bottom tab bar — FAB is the only navigation

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
FAB is the ONLY navigation — no pill bar, no hamburger, no tab bar
```

---

## ══════════════════════════════════
## V5 NAVIGATION ARCHITECTURE (LOCKED ✅ 4 Apr 2026)
## ══════════════════════════════════

### The Three-Screen World

After the Landing moment passes, the app lives as a **horizontal three-screen strip:**

```
Pulse  ←  Dashboard  →  Chat
```

- **Dashboard** is the permanent anchor — centre after Landing dismisses
- **Swipe left** from Dashboard → Chat
- **Swipe right** from Dashboard → Pulse
- Dots indicator always shows position (3 dots, active pill expands)
- No pill bar. No hamburger. No tab bar. FAB is the only navigation.

### Landing Screen (time-window only)

Landing appears as a **fourth screen** (centre position) during three daily time windows:
- Morning: 6:00am – 9:00am
- Midday: 12:00pm – 2:00pm
- Evening: 5:00pm – 8:00pm

**Behaviour:**
- Brief is pre-generated and waiting — no load delay on open
- Full-screen gradient background (bleeds behind status bar — no status bar bg)
- **First swipe in any direction dismisses Landing for that time window**
- After dismiss: Landing screen removed, world collapses to Dashboard ↔ Chat ↔ Pulse
- Re-appears at next time window automatically
- Outside time windows: app opens directly to Dashboard

### Landing Visual Spec (LOCKED ✅)
```
Background: full-screen gradient, bleeds behind status bar
  Morning:  linear gradient #FFF6EC → #FFDEB8 (warm amber)
  Midday:   linear gradient #EDF6FF → #C4DFFF (cool blue)
  Evening:  linear gradient #F5EEFF → #D8C8F8 (soft purple)

Logo: DM Serif Display, top-left, 22px
  'a' and 'i' colour COMPLEMENTS background (never matches):
  Morning bg (warm) → ai colour: #0096C7 cyan
  Midday bg (cool)  → ai colour: #D4006A magenta
  Evening bg (purple)→ ai colour: #E8601A terracotta

Greeting: Poppins 600, 10px, uppercase, letterSpacing 0.8, rgba(10,10,10,0.28)
Brief: Poppins 700Bold, 21px, letterSpacing -0.6, lineHeight 1.38
  Coral #FF4545 highlights on key facts (time, name)
Sub-line: Poppins 400, 12px, rgba(10,10,10,0.32)

Dots: 3 dots (Chat · Landing · Dashboard · Pulse)
  Active dot: width 20px pill, rgba(10,10,10,0.36)
  Inactive: 5px circle, rgba(10,10,10,0.14)
  NO swipe hint text — dots are the only signal

FAB: present on Landing (same as all screens)
Status bar text: dark (ink) on all Landing gradients
```

---

## ══════════════════════════════════
## FAB — FLOATING ACTION BAR (LOCKED ✅ 4 Apr 2026)
## ══════════════════════════════════

**The FAB replaces ALL previous navigation (pill bar, hamburger, chat input bar).**
It is present on EVERY screen, always, in the same position.

### Layout
```
Position: absolute, bottom: 18px, horizontally centred
Background: rgba(255,255,255,0.80), blur backdrop
Border: 1px rgba(255,255,255,0.96)
Border radius: 26px
Shadow: 0 8px 32px rgba(0,0,0,0.13)
Padding: 5px 7px

Four buttons + two separators:
[ Dashboard ]  |  [ Chat ]  [ Mic ]  |  [ More ]

Each button: 44×44px, borderRadius 18px
Active state: background #0A0A0A, icon white
Inactive: transparent bg, icon rgba(10,10,10,0.48)
Hover: rgba(10,10,10,0.05) bg
```

### Button Behaviours
- **Dashboard** → navigates to Dashboard screen. Active (dark) when on Dashboard.
- **Chat** → first tap: navigates to Chat screen. Second tap (already on Chat): opens keyboard. Active (dark) when on Chat at rest. **Coral #FF4545** when keyboard is open.
- **Mic** → opens Mic v2 pill (see below). Coral when active.
- **More** → opens More overlay (see below). No active state — toggles only.

### No Chat Input Bar
There is NO persistent chat input bar anywhere in the app.
Keyboard is triggered by tapping Chat button a second time.
Voice is triggered by the Mic button.
This is locked and intentional.

---

## ══════════════════════════════════
## MIC V2 — VOICE INPUT (LOCKED ✅ 4 Apr 2026)
## ══════════════════════════════════

```
Trigger: Mic button in FAB
Animation: floating pill grows above FAB from bottom-centre
  scale 0.92→1, opacity 0→1, cubic-bezier(0.16,1,0.3,1), 200ms

Pill spec:
  background: rgba(255,255,255,0.94), blur backdrop
  border: 1px rgba(255,255,255,0.98)
  border-radius: 22px
  padding: 11px 16px
  position: 64px above FAB bottom

Contents (left to right):
  Waveform: 7 animated bars, coral #FF4545
    Heights: 7, 13, 20, 26, 20, 13, 7px
    Animation: scaleY 0.35→1→0.35, each bar staggered 100ms, 0.9s loop
  "Listening…" label: Poppins 600, 11px, rgba(10,10,10,0.50)
  "Cancel" button: Poppins 700, 10px, coral, rgba(255,69,69,0.08) bg

Dismiss: Cancel tap closes pill. Mic button returns to inactive.
After processing: pill closes → Chat screen opens → message injected
```

---

## ══════════════════════════════════
## MORE OVERLAY (LOCKED ✅ 4 Apr 2026)
## ══════════════════════════════════

```
Trigger: More (···) button in FAB
Animation: card grows above FAB, scale 0.90→1, opacity 0→1, 220ms
  transform-origin: bottom centre

Backdrop: full screen, rgba(10,10,10,0.38), blur(5px)
  Tap backdrop → closes overlay

Card spec:
  position: 76px above FAB
  width: 236px, centred
  background: rgba(255,255,255,0.97), blur backdrop
  border-radius: 28px
  padding: 22px 18px 18px
  shadow: 0 24px 64px rgba(0,0,0,0.18)

Label: "MORE" — Poppins 700, 9px, uppercase, letterSpacing 1.3, rgba(10,10,10,0.18)

Grid: 3×3 — 9 items
  Each item: 48×48px icon tile, borderRadius 16px, channel bg colour (10% opacity)
  Icon: SVG, 21px, same thin stroke weight as FAB icons, channel colour
  Label: Poppins 600, 9.5px, rgba(10,10,10,0.40)

Grid order (left→right, top→bottom):
  Row 1: Notes · Kids Hub · Tutor
  Row 2: Travel · Family · Meals
  Row 3: Pulse · Zen · Settings  ← Settings always bottom-right

Channel colours for More icons:
  Notes:    #5C8A3C sage
  Kids Hub: #0A8A5A green
  Tutor:    #6B35D9 violet
  Travel:   #0096C7 cyan
  Family:   #D4006A magenta
  Meals:    #E8601A terracotta
  Pulse:    #FF4545 coral
  Zen:      #5C8A3C sage (soft)
  Settings: #6B7280 grey
```

---

## ══════════════════════════════════
## PULSE SCREEN (LOCKED ✅ 4 Apr 2026)
## ══════════════════════════════════

**Pulse is the family awareness layer** — a calm, beautiful scroll of what is happening across the whole family. Not a notification feed. More like a family noticeboard.

```
Background: #FAF8F5 warm white (same as Dashboard and Chat)
Header: zaeli wordmark left, "Pulse" label right with live coral dot (pulsing animation)
FAB: present as always

Three zones (top to bottom):

1. ZAELI NOTICED
   Aqua-tinted cards (rgba(168,232,204,0.18) bg, rgba(168,232,204,0.38) border)
   Zaeli avatar (aqua bg, 'z' label)
   Timestamp label + plain text observation
   Examples: missed pickup, missing ingredient, overdue task

2. FAMILY ACTIVITY
   White cards with family member avatar (family colour)
   Shows: what they completed, added, or changed
   Domain badge (small icon) shows which channel the action came from
   Examples: Poppy added event, Anna ticked off shopping, Duke finished homework

3. ON THE HORIZON
   Cobalt-tinted cards (rgba(32,85,240,0.05) bg)
   Large countdown number (DM Serif, cobalt) + "days" label
   Event name + date + status note
   Examples: birthdays, school holidays, travel dates

Data sources: reads from existing Supabase tables
  (events, shopping_items, todos, pantry_items, family_members)
Pulse notices generated by GPT-mini on a schedule or on open
```

---

## ══════════════════════════════════
## DASHBOARD SCREEN (LOCKED ✅ 4 Apr 2026)
## ══════════════════════════════════

**Dashboard is a dedicated screen** — not embedded in Chat.
Background: `#FAF8F5`. FAB only at bottom. No chat bar.

Cards (top to bottom):
1. **Calendar** — dark slate `#3A3D4A`, today's events, avatar initials
2. **Weather + Shopping** — side by side 50/50
   - Weather: `#E6F1FF` blue tint, large temp number, DM Serif
   - Shopping: `#E8F5EE` green tint, item count, top 2 items
3. **Today's Actions** — `#FFFCE6` gold tint, todo rows with Reminder/Overdue tags
4. **Dinner tonight** — `#FFF1E8` peach tint, meal name DM Serif, meta line

**Card tap behaviour:** any card tap → navigates to Chat screen with context injected.
Card type determines which inline card and opening Zaeli message appears.

Dot position: middle dot active (Dashboard is centre of 3-screen world post-Landing)

---

## ══════════════════════════════════
## CHAT SCREEN (LOCKED ✅ 4 Apr 2026)
## ══════════════════════════════════

### Two entry states

**Fresh entry** (tapping Chat button in FAB):
- No inline card
- Zaeli message: "Hey [name]. How can I help?" — full width, no bubble
- 3 contextual quick reply chips

**Card-triggered entry** (tapping a Dashboard card):
- Relevant inline card injected at top of messages
- Zaeli opening message addresses that domain specifically
- Contextual quick replies for that domain

### Zaeli message style (UPDATED v5)
```
Full width — NO bubble wrapper
Label: "Zaeli" — Poppins 700, 9px, uppercase, rgba(10,10,10,0.22)
Text: Poppins 400, 13px, lineHeight 1.62, full width
NO background, NO border, NO avatar bubble
```

### User message style (unchanged)
```
Right-aligned bubble
Background: #0A0A0A ink
Border radius: 16px 16px 3px 16px
Poppins 500, 12px, white
Max width: 76%
```

### Context pill (top right of Chat header)
Shows which domain the conversation is about.
Coloured dot + domain label. Updates when card-triggered.

### No chat input bar
Keyboard opens via second tap on Chat FAB button.
Voice input via Mic FAB button.
Quick reply chips are the primary interaction surface.

---

## ══════════════════════════════════
## ZEN SCREEN (NEW ✅ 4 Apr 2026)
## ══════════════════════════════════

Simple 5-minute breathing/meditation tool. Accessible from More overlay.

```
Full screen, minimal
Background: soft gradient (sage-tinted)
Breathing animation: expanding/contracting circle
5-minute countdown timer
Poppins text: "Breathe in" / "Hold" / "Breathe out"
Single tap to start/pause
No chat, no FAB (zen is a standalone moment)
Exit: back button top-left
```

---

## ══════════════════════════════════
## BRIEF — POPPINS (LOCKED ✅ 4 Apr 2026)
## ══════════════════════════════════

**Brief is now Poppins 700Bold, NOT DM Serif.**
DM Serif is reserved for the wordmark and large card title numbers only.

```
Brief font: Poppins_700Bold
Brief size: 21px
Letter spacing: -0.6
Line height: 1.38
Coral em highlights: #FF4545, font-weight 800
```

This applies to Landing screen brief only.
Chat messages from Zaeli remain Poppins 400 (no change).

---

## Per-Channel Colour System (LOCKED)

| Channel | Banner bg | AI colour | Accent (dark) |
|---------|-----------|-----------|---------------|
| Home/Chat | `#FAF8F5` cream | `#A8E8CC` Aqua | `#FF4545` coral |
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
No left-border accent strips. Sheets = clean black/grey. Colour in inline cards only.

---

## Family Member Colours (LOCKED)
```
Rich: #4D8BFF · Anna: #FF7B6B · Poppy: #A855F7 · Gab: #22C55E · Duke: #F59E0B
```

---

## Channel Architecture (v5)
```
app/(tabs)/index.tsx          → Chat screen ✅ (updating: remove pills, add FAB, Zaeli full-width)
app/(tabs)/dashboard.tsx      → Dashboard screen 🔨 NEW (Phase 4)
app/(tabs)/landing.tsx        → Landing screen 🔨 NEW (Phase 2)
app/(tabs)/pulse.tsx          → Pulse screen 🔨 NEW (Phase 6)
app/(tabs)/calendar.tsx       → Calendar ✅ COMPLETE (sheets unchanged)
app/(tabs)/shopping.tsx       → Shopping ✅ REBUILD COMPLETE
app/(tabs)/mealplanner.tsx    → Meals ✅ REBUILD COMPLETE
app/(tabs)/todos.tsx          → Todos + Reminders (design ✅ — not yet built)
app/(tabs)/kids.tsx           → Kids Hub (design ✅ — not yet built)
app/(tabs)/notes.tsx          → Notes (not yet built)
app/(tabs)/travel.tsx         → Travel (not yet built)
app/(tabs)/family.tsx         → Our Family (not yet built)
app/(tabs)/tutor.tsx          → Tutor (needs rebuild)
app/(tabs)/zen.tsx            → Zen 🔨 NEW (Phase 8)
components/ZaeliFAB.tsx       → FAB component 🔨 NEW (Phase 1)
lib/use-chat-persistence.ts   → ✅ Keys: home | shopping | calendar | meals
```

---

## Build Phase Plan (v5)

```
Phase 1: ZaeliFAB component       → components/ZaeliFAB.tsx
Phase 2: Landing screen           → app/(tabs)/landing.tsx
Phase 3: Navigation architecture  → _layout.tsx (horizontal scroll world + dots)
Phase 4: Dashboard screen         → app/(tabs)/dashboard.tsx
Phase 5: Chat screen updates      → app/(tabs)/index.tsx (remove pills, add FAB, full-width Zaeli)
Phase 6: Pulse screen             → app/(tabs)/pulse.tsx
Phase 7: Sheets unchanged         → no changes to calendar/shopping/meals sheets
Phase 8: Zen screen               → app/(tabs)/zen.tsx
```

---

## ══════════════════════════════════
## INLINE CALENDAR CARD SPEC (LOCKED ✅ 2 Apr 2026)
## ══════════════════════════════════

```
Outer container:
  backgroundColor: '#3A3D4A' (CAL_SLATE)
  borderRadius: 16
  marginHorizontal: -4
  marginTop: 8, marginBottom: 2
  overflow: 'hidden'

Header row:
  paddingHorizontal: 14, paddingTop: 12, paddingBottom: 10
  Date label: Poppins_700Bold 12px, uppercase, rgba(255,255,255,0.65)
  + Add button: rgba(255,255,255,0.18) bg, borderRadius: 9, pV:6 pH:13
  Full › button: pV:6 pH:4, Poppins_600SemiBold 12px rgba(255,255,255,0.55)

Event rows (collapsed):
  pH:14 pV:8
  Time col: width:58, Poppins_500Medium 12px rgba(255,255,255,0.50), numberOfLines:1
  Dot: 8×8 borderRadius:4, first assignee colour
  Title: Poppins_400Regular 16px rgba(255,255,255,0.92), flex:1, numberOfLines:1
  Avatars: 26×26 borderRadius:13

Expanded event:
  rgba(255,255,255,0.09) bg, borderRadius:12, margin:6, padding:14
  Spring animation: tension:80 friction:10, scaleY 0.85→1

Action chips:
  ✦ Edit with Zaeli: rgba(168,216,240,0.22) bg, Poppins_600SemiBold 12px
  Others: rgba(255,255,255,0.10) bg
  Delete: two-tap pattern always

Footer:
  Today · Tomorrow tabs: Poppins_700Bold 11px
  Month view ›: Poppins_600SemiBold 11px
```

---

## ══════════════════════════════════
## SHEET DESIGN SYSTEM (LOCKED ✅ 2 Apr 2026)
## ══════════════════════════════════

All sheets: 92% height, `#FAF8F5` bg, borderTopRadius 24px.
Open INSTANTLY (setSheetOpen true BEFORE any await).
Fetch data async after open.
Backdrop: TouchableOpacity (NOT Pressable).
Panel: plain View (NOT Pressable).

Sheets are completely unchanged in v5. They open from card taps and chat actions as before.

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

## Chat Persistence (LOCKED ✅)
```
persistenceHasLoaded ref — fires exactly once
On load: restore isBrief messages ONLY (no inline cards, no conversation)
generateBrief: skips if persistedMessages.length > 0
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
