# CLAUDE.md — Zaeli Project Context
*Last updated: 5 April 2026 — ZaeliFAB ✅ Landing ✅ Dashboard Phase 4 ✅ Calendar card + Chat injection ✅*

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
- PowerShell lib copy: `Copy-Item "C:\Users\richa\Downloads\file.ts" "C:\Users\richa\zaeli\lib\file.ts"`
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

Sharp, warm, genuinely enthusiastic about this family. Finds the funny angle through delight, not detachment.

**Hard rules:**
- NEVER "mate", "guys" — Never start with "I" — Plain text only
- Always ends on a confident offer — never a bare open question
- **Banned words:** "queued up", "locked in", "tidy", "sorted", "ambush", "sprint", "chaos", "breathing room", "quick wins", "you've got this", "make it count"

---

## Stack
- React Native + Expo (iOS-first), dev build on iPhone 11 Pro Max
- Supabase (Postgres, Sydney ap-southeast-2, ID: rsvbzakyyrftezthlhtd)
- Claude Sonnet (`claude-sonnet-4-20250514`) — all tool-calling channels + vision
- OpenAI GPT-5.4 mini (`gpt-5.4-mini`) — landing brief, home brief, Pulse notices
- OpenAI Whisper-1 — voice transcription
- expo-router, expo-image-picker, react-native-svg, expo-file-system
- Poppins font (ALL UI), DMSerifDisplay (wordmark + large card numbers only)
- No bottom tab bar — ZaeliFAB is the only navigation

---

## Key Constants
```
DUMMY_FAMILY_ID = '00000000-0000-0000-0000-000000000001'
SONNET          = 'claude-sonnet-4-20250514'
GPT_MINI        = 'gpt-5.4-mini'
OpenAI = max_completion_tokens · Claude = max_tokens. Never mix.
KAV must have backgroundColor:'#fff'
always await supabase inserts
Send button = #FF4545 coral ALWAYS
Body bg = #FAF8F5 warm white always
isActionQuery() runs BEFORE isCalendarQuery()
Apostrophes in JSX: always double-quoted strings
expo-file-system import = 'expo-file-system/legacy'
Do NOT use @react-native-async-storage — requires native rebuild
NEVER literal newlines inside JSX strings or regex — use \n escape
stopPropagation on nested TouchableOpacity inside tappable parent rows
Modal stacking iOS: close modal 1 → setTimeout 350ms → open modal 2
NEVER append +10:00 or any timezone suffix to stored event times
ZaeliFAB is the ONLY navigation — no pill bar, no hamburger, no tab bar
No persistent chat input bar anywhere — keyboard via Chat FAB second tap
Brief font = Poppins_600SemiBold 26px (NOT DM Serif, NOT 700Bold)
DM Serif = wordmark and large card numbers only
Zaeli messages = full width, no bubble (v5 — Phase 5 pending)
PanResponder and StatusBar must be explicitly imported from 'react-native'
Landing = LandingOverlay component in index.tsx — NOT a separate route
router.navigate() always — NEVER router.replace() or router.push()
Navigation store: lib/navigation-store.ts — module-level, same pattern as getPendingCalendarImage
Dashboard card order = FIXED: Calendar → Weather+Shopping → Actions → Dinner (never rearranges)
```

---

## ══════════════════════════════════
## V5 NAVIGATION ARCHITECTURE (LOCKED ✅ 4 Apr 2026)
## ══════════════════════════════════

```
Pulse  ←  Dashboard  →  Chat
```

- Dashboard = permanent anchor
- ZaeliFAB is the ONLY navigation
- No pill bar, no hamburger, no tab bar

### Landing (overlay — COMPLETE ✅)
- Embedded as `LandingOverlay` in index.tsx — NOT a separate route
- `LandingGate` is default export, checks time window + FileSystem dismiss flag
- Swipe >50px or FAB tap → fades out → HomeScreen beneath
- `LANDING_TEST_MODE = true` in index.tsx — **set false before launch**

### Landing Visual (LOCKED ✅)
```
Background: #FFF6EC morning · #EDF6FF midday · #F5EEFF evening
Logo 'a'+'i': #F0C8C0 warm blush (all windows)
Brief highlights: #0096C7 cyan (all windows)
Brief: Poppins 600SemiBold 26px, 3 sentences, max 180 chars
Greeting: Poppins 600, 13px, uppercase
Dots: paddingBottom 28, active = 20px pill
```

---

## ══════════════════════════════════
## ZAELIFAX — LOCKED SPEC (✅ Phase 1 Complete)
## ══════════════════════════════════

**File:** `app/components/ZaeliFAB.tsx`

```
FAB_BTN=58px · FAB_PAD=10px · borderRadius=36px · FAB_WIDTH=318px
Mic pill + More card: same width, same radius, bottom=124px iOS
Root paddingBottom: 24px iOS / 14px Android
```

Button layout: `[ Dashboard ] | [ Chat ][ Mic ] | [ More ]`

Button states:
- Dashboard: dark #0A0A0A when active
- Chat: dark at rest · coral when keyboard open
- Mic: coral when recording
- More: coral bg + white icon when open

More overlay 3×3:
```
Notes · Kids Hub · Tutor
Travel · Family · Meals
Pulse · Zen · Settings  ← always bottom-right
```

---

## ══════════════════════════════════
## DASHBOARD — PHASE 4 (✅ Complete — 5 Apr 2026)
## ══════════════════════════════════

**File:** `app/(tabs)/dashboard.tsx`

Fixed card order (NEVER rearranges):
1. Calendar — dark slate `#3A3D4A`
2. Weather `#A8D8F0` + Shopping `#D8CCFF` — side by side
3. Actions — gold `#F0DC80`
4. Dinner — peach `#FAC8A8`

### Calendar card smart switching (LOCKED ✅)
- Shows Today normally
- Switches to Tomorrow automatically when: all today's events are past OR after 8pm
- Dinner also switches to tomorrow after 8pm
- Actions shows evening mode after 8pm

### CalendarCard — new interaction spec (LOCKED ✅ 5 Apr 2026)
```
Shows 3 events (not 4)
+ Add button: top right only (Full → removed from header)
Event tap: expands inline within card showing:
  - Notes (if any)
  - Attendees
  - Two action buttons: "✦ Edit with Zaeli" · "Delete"
  - Delete is two-tap (Delete → "Yes, delete" / "Keep it")
Expand footer: "N more events ∨" on left · "Full calendar →" on right
  (Full calendar link replaces old Full button)
```

### Dashboard → Chat injection (LOCKED ✅ 5 Apr 2026)
Uses `lib/navigation-store.ts` module store (production-ready pattern).

**Edit event flow:**
1. Tap event in Dashboard CalendarCard → tap "✦ Edit with Zaeli"
2. `setPendingChatContext({ type:'edit_event', event:ev, returnTo:'dashboard' })`
3. `router.navigate('/(tabs)/')` 
4. Chat reads store on `useFocusEffect`, clears it, injects:
   - Inline dark slate calendar card (single event)
   - Zaeli prompt: "[Title] — [Day] at [Time]. What would you like to change?"
   - Quick reply chips: Move the time · Add someone · Change location · Cancel it · Manual edit
   - Keyboard pre-loads (350ms delay)
5. "← Dashboard" back pill shown at top of Chat
6. Pill disappears after user sends first message

**Add event flow:**
1. Tap "+ Add" on CalendarCard
2. `setPendingChatContext({ type:'add_event', returnTo:'dashboard' })`
3. Chat injects: Zaeli prompt + chips: Today · Tomorrow · This week · For the kids
4. Keyboard pre-loads

### Dashboard back navigation
- "← Dashboard" back pill at top of Chat when `returnToDashboard === true`
- Tap pill → `router.navigate('/(tabs)/dashboard')`
- Pill cleared on first message send
- Grid FAB button always available as alternative

---

## ══════════════════════════════════
## NAVIGATION STORE (NEW ✅ 5 Apr 2026)
## ══════════════════════════════════

**File:** `lib/navigation-store.ts`

Module-level store for Dashboard→Chat context passing.
Same pattern as `getPendingCalendarImage` in calendar.tsx — production ready.

```typescript
type ChatEntryContext = {
  type: 'edit_event' | 'add_event' | 'shopping' | 'actions' | 'meals' | null;
  event?:    any;        // full event object for edit_event
  returnTo?: 'dashboard';
};

setPendingChatContext(ctx)   // set before navigating
getPendingChatContext()      // read in useFocusEffect
clearPendingChatContext()    // clear after consuming
hasPendingChatContext()      // boolean check
```

---

## ══════════════════════════════════
## CHAT SCREEN (index.tsx) — PHASE 5 PENDING
## ══════════════════════════════════

**Currently:** full chat working, cards, persistence, tool-calling all intact.

**Phase 5 still to build:**
- Full-width Zaeli messages (no bubble)
- Two entry states: Fresh (Chat FAB) vs Card-triggered (Dashboard)
- `returnToDashboard` state + "← Dashboard" back pill ← DONE in this session

**useFocusEffect now handles:**
1. Dashboard → edit_event context → inject inline card + prompt + keyboard
2. Dashboard → add_event context → inject prompt + keyboard
3. Existing: autoMic, calendarScan, seedMessage params

---

## ══════════════════════════════════
## SHEET DESIGN SYSTEM (LOCKED ✅)
## ══════════════════════════════════

92% height, `#FAF8F5` bg, borderTopRadius 24px.
Open INSTANTLY. Fetch async. Backdrop: TouchableOpacity. Unchanged in v5.

---

## ══════════════════════════════════
## EVENT TIME CONTRACT (CRITICAL ✅ LOCKED)
## ══════════════════════════════════
```
✅ Store: "2026-04-01T16:00:00" → displays 4:00 pm ✓
❌ Never: "...+10:00" → Supabase converts → wrong ✗
fmtTime() and isoToMinutes(): raw string parse. Never new Date() for display.
```

---

## Per-Channel Colour System (LOCKED)

| Channel | Card bg | Accent |
|---------|---------|--------|
| Calendar | `#3A3D4A` slate | white text |
| Weather | `#A8D8F0` sky blue | — |
| Shopping | `#D8CCFF` lavender | `#5020C0` |
| Actions | `#F0DC80` gold | `#806000` |
| Dinner | `#FAC8A8` peach | `#C84010` |

**Landing colours (LOCKED ✅):**
- Logo 'a'+'i': `#F0C8C0` warm blush
- Highlights: `#0096C7` cyan
- Backgrounds: `#FFF6EC` · `#EDF6FF` · `#F5EEFF`

## Family Member Colours (LOCKED)
```
Rich: #4D8BFF · Anna: #FF7B6B · Poppy: #A855F7 · Gab: #22C55E · Duke: #F59E0B
```

---

## Channel Architecture (v5)
```
app/(tabs)/index.tsx          → Chat + LandingGate + LandingOverlay ✅
app/(tabs)/dashboard.tsx      → Dashboard ✅ Phase 4 complete
app/(tabs)/calendar.tsx       → Calendar ✅ unchanged
app/(tabs)/shopping.tsx       → Shopping ✅ unchanged
app/(tabs)/mealplanner.tsx    → Meals ✅ unchanged
app/(tabs)/settings.tsx       → Stub ✅
app/(tabs)/pulse.tsx          → 🔨 Phase 6
app/(tabs)/zen.tsx            → 🔨 Phase 8
app/components/ZaeliFAB.tsx   → ✅ Phase 1 complete
lib/navigation-store.ts       → ✅ NEW — Dashboard→Chat context store
lib/use-chat-persistence.ts   → ✅ Keys: home | shopping | calendar | meals
```

---

## Build Phase Plan (v5)
```
Phase 1: ZaeliFAB                    ✅ COMPLETE
Phase 2: Landing overlay             ✅ COMPLETE
Phase 4: Dashboard screen            ✅ COMPLETE (built before Phase 3)
  └─ Calendar card interaction       ✅ COMPLETE (expand, Edit/Add → Chat)
  └─ Navigation store                ✅ COMPLETE
Phase 3: Navigation architecture     🔨 NEXT — swipe world + dots
Phase 5: Chat v5 updates             🔨 — full-width Zaeli, two entry states
Phase 6: Pulse screen                🔨
Phase 8: Zen screen                  🔨
```

---

## Coding Rules
- SafeAreaView edges={['top']} always
- PowerShell: no && — separate lines always
- Always npx expo start --dev-client (--clear for bundle issues)
- Date: local construction — NEVER toISOString()
- Time: NEVER append +10:00 — store bare local datetime string
- KAV backgroundColor: '#fff' · Send button: '#FF4545' always
- Body bg: '#FAF8F5' — never full colour bleed
- No left-border accent strips · Apostrophes in JSX: double-quoted strings
- expo-file-system: 'expo-file-system/legacy'
- No literal newlines in JSX strings or regex — use \n
- stopPropagation on nested tappable rows
- Modal stacking: close → setTimeout 350ms → open
- Delete patterns: always two-tap
- Sheet opens BEFORE awaiting data
- router.navigate() always — never replace() or push()
- PanResponder + StatusBar: explicitly import from 'react-native'
- Navigation store: set before navigate, read+clear in useFocusEffect
