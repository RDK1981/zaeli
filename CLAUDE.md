# CLAUDE.md — Zaeli Project Context
*Last updated: 4 April 2026 — ZaeliFAB Phase 1 ✅ Landing Phase 2 ✅ v5 architecture locked ✅*

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
- **Banned words:** "queued up", "locked in", "tidy", "sorted", "lined up", "all set", "stacked neatly", "ambush", "sprint", "chaos", "chaotic", "breathing room", "quick wins", "you've got this", "make it count"

---

## Stack
- React Native + Expo (iOS-first), dev build on iPhone 11 Pro Max
- Supabase (Postgres, Sydney ap-southeast-2, ID: rsvbzakyyrftezthlhtd)
- Claude Sonnet (`claude-sonnet-4-20250514`) — all tool-calling channels + vision
- OpenAI GPT-5.4 mini (`gpt-5.4-mini`) — home_brief, landing_brief, Pulse notices, Tutor chat
- OpenAI Whisper-1 — voice transcription (Mic button in ZaeliFAB)
- expo-router, expo-image-picker, react-native-svg, expo-file-system (chat persistence + landing flags)
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
Body bg = #FAF8F5 warm white always
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
PanResponder and StatusBar must be explicitly imported from 'react-native'
Landing is an overlay component in index.tsx — NOT a separate route
router.navigate() always — never router.replace() or router.push()
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

### Landing (time-window overlay)

Landing appears as an **absolute-positioned overlay on top of index.tsx (Chat)** during three daily windows:
- Morning: 6:00am – 9:00am
- Midday: 12:00pm – 2:00pm
- Evening: 5:00pm – 8:00pm

**Implementation (LOCKED ✅):**
- `LandingGate` is the default export from `index.tsx` — wraps `HomeScreen`
- `LandingOverlay` component renders absolutely on top of `HomeScreen`
- No separate route — no navigation needed — overlay just fades out on dismiss
- Dismiss flag stored in FileSystem: `landing_flags.json` — key = `YYYY-MM-DD-[morning|midday|evening]`
- First swipe (dx or dy > 50px) → writes dismiss flag → fades out → `HomeScreen` visible beneath
- FAB taps on Landing also call `onDismiss` directly
- Outside windows or already dismissed → `LandingOverlay` never mounts, `HomeScreen` renders directly

### Landing Visual Spec (LOCKED ✅)
```
Background: solid colour (LinearGradient needs EAS build — use gradient[0] for now)
  Morning:  #FFF6EC (warm amber)
  Midday:   #EDF6FF (cool blue)
  Evening:  #F5EEFF (soft purple)

Logo: DM Serif Display, 36px, letterSpacing -0.8
  'a' and 'i': #F0C8C0 warm blush — on all windows
  (contrasts with cyan highlights on cream)

Greeting: Poppins 600SemiBold, 13px, uppercase, letterSpacing 0.8, rgba(10,10,10,0.35)
Brief: Poppins 600SemiBold, 26px, lineHeight 38, letterSpacing -0.5
  Key fact highlights: #0096C7 cyan — [square bracket] syntax in GPT output
  (cyan chosen: cool against warm cream, not alarming, distinct from blush logo)

Sub-line: Poppins 400, 13px, rgba(10,10,10,0.34)

Dots: 3 dots · active = 20px wide pill · rgba(10,10,10,0.38) · paddingBottom 28
NO swipe hint text — dots only

ZaeliFAB present (activeButton=null) — all buttons call onDismiss
Status bar: dark on all gradients
```

### Landing Brief Prompt (LOCKED ✅)
```
3 sentences. Max 180 characters TOTAL.
Sentence 1: Most urgent/time-sensitive thing. Specific.
Sentence 2: One win or clear gap. Short.
Sentence 3: ONE warm Zaeli observation — dry wit, specific to THIS family. NOT generic.
Key facts in [square brackets] → cyan highlight.
Never open with name. No "I". No "Rich:" prefix.
Banned: "sorted", "chaos", "quick wins", "you've got this", "make it count"
```

---

## ══════════════════════════════════
## ZAELIFAX — LOCKED SPEC (✅ Phase 1 Complete — 4 Apr 2026)
## ══════════════════════════════════

**File:** `app/components/ZaeliFAB.tsx`
**Status:** Built ✅ — live in index.tsx, sizing locked on device

### Sizing Constants (LOCKED — device tested ✅)
```
FAB_BTN    = 58px
FAB_PAD    = 10px
FAB_SEP_MX = 8px
FAB_GAP    = 4px
FAB_WIDTH  = 318px (auto-calculated)
borderRadius: 36px on FAB, mic pill, more card
Root paddingBottom: 24px iOS / 14px Android
Mic pill + More card: bottom 124px iOS / 110px Android
```

### Button Layout
```
[ Dashboard ] | [ Chat ][ Mic ] | [ More ]
```

### Button States (LOCKED ✅)
```
Dashboard: dark #0A0A0A bg + white icon when active
Chat:      dark at rest · coral #FF4545 when keyboard open
Mic:       coral when recording
More:      coral bg + white icon when overlay open · returns dark when closed
```

### Mic v2 Pill (LOCKED ✅)
```
Same width + borderRadius as FAB — symmetrical
7 waveform bars, heights [10,18,28,36,28,18,10]px, coral
"Listening…" Poppins 600, 14px · Cancel button coral
Clean gap above FAB — no overlap
```

### More Overlay 3×3 (LOCKED ✅)
```
Same width + borderRadius as FAB
Full backdrop rgba(10,10,10,0.36)
Grid: justifyContent:'space-between', width:'31%' per item
Icon tiles: 58×58px, borderRadius 20, 26px SVG icons
Row 1: Notes · Kids Hub · Tutor
Row 2: Travel · Family · Meals
Row 3: Pulse · Zen · Settings  ← Settings always bottom-right
```

### Props Interface
```typescript
interface ZaeliFABProps {
  activeButton:     'dashboard' | 'chat' | 'keyboard' | null;
  onDashboard:      () => void;
  onChat:           () => void;
  onChatKeyboard?:  () => void;
  onMoreItem?:      (itemKey: string) => void;
  onMicResult?:     (text: string) => void;
}
```

---

## ══════════════════════════════════
## LANDING OVERLAY — IMPLEMENTATION (LOCKED ✅ Phase 2 — 4 Apr 2026)
## ══════════════════════════════════

**Architecture decision:** Landing is NOT a separate expo-router route.
It is a component (`LandingOverlay`) rendered inside `index.tsx` as an absolute overlay.
This avoids all expo-router navigation issues (blank screens, unmatched routes).

**Structure in index.tsx:**
```typescript
// Default export — checks time window + dismiss flag
export default function LandingGate() {
  const [showLanding, setShowLanding] = useState<boolean | null>(null);
  // null = still checking, false = skip, true = show
  useEffect(() => { /* check window + FileSystem flag */ }, []);
  return (
    <View style={{ flex: 1 }}>
      <HomeScreen/>
      {showLanding === true && (
        <LandingOverlay onDismiss={() => setShowLanding(false)}/>
      )}
    </View>
  );
}

// Landing overlay — absolute positioned, fades out on dismiss
function LandingOverlay({ onDismiss }) { ... }

// Main chat screen — always mounted beneath overlay
function HomeScreen() { ... }
```

**Test mode:**
```typescript
const LANDING_TEST_MODE = true; // ← set false before launch
// When true: always shows landing, clears dismiss flags on mount
```

**Key learnings from Phase 2:**
- `router.replace()` from a tab causes blank screens — use overlay instead
- `PanResponder` must be explicitly imported from 'react-native'
- `onStartShouldSetPanResponder: () => false` — let taps pass through to FAB
- `onMoveShouldSetPanResponder` threshold 12px to claim swipe
- Release threshold 50px to dismiss — prevents accidental dismiss on light tap
- `expo-linear-gradient` not available in dev client — use solid `backgroundColor: gradient[0]`
- Real gradient available after EAS build

---

## ══════════════════════════════════
## DASHBOARD SCREEN (LOCKED ✅ 4 Apr 2026)
## ══════════════════════════════════

**Phase 4 — next major build.**
Dedicated screen. Background `#FAF8F5`. ZaeliFAB only. No chat bar.

Card stack (top to bottom):
1. Calendar — dark slate `#3A3D4A`
2. Weather `#E6F1FF` + Shopping `#E8F5EE` — 50/50 side by side
3. Today's Actions — `#FFFCE6` gold tint
4. Dinner tonight — `#FFF1E8` peach tint

Card tap → Chat with that domain's context injected.

---

## ══════════════════════════════════
## CHAT SCREEN (LOCKED ✅ 4 Apr 2026)
## ══════════════════════════════════

### Two entry states (Phase 5 — not yet built)
- **Fresh** (Chat FAB tap): "Hey Rich. How can I help?" + 3 chips
- **Card-triggered** (Dashboard card tap): inline card + contextual Zaeli message

### Zaeli message style (v5 — Phase 5 pending)
Full width, no bubble. "Zaeli" small label. Poppins 400.
User replies: right-aligned dark bubble.

---

## ══════════════════════════════════
## SHEET DESIGN SYSTEM (LOCKED ✅ 2 Apr 2026)
## ══════════════════════════════════

92% height, `#FAF8F5` bg, borderTopRadius 24px.
Open INSTANTLY. Fetch async after. Backdrop: TouchableOpacity. Unchanged in v5.

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

**Landing colours (LOCKED ✅):**
- Logo 'a' and 'i': `#F0C8C0` warm blush (all windows)
- Brief highlights: `#0096C7` cyan (all windows)
- Background: morning `#FFF6EC` · midday `#EDF6FF` · evening `#F5EEFF`

## Family Member Colours (LOCKED)
```
Rich: #4D8BFF · Anna: #FF7B6B · Poppy: #A855F7 · Gab: #22C55E · Duke: #F59E0B
```

---

## Channel Architecture (v5)
```
app/(tabs)/index.tsx          → Chat + LandingGate + LandingOverlay ✅ v5 complete
app/(tabs)/dashboard.tsx      → Dashboard 🔨 Phase 4 NEXT
app/(tabs)/landing.tsx        → DEPRECATED — landing is now overlay in index.tsx
app/(tabs)/pulse.tsx          → Pulse 🔨 Phase 6
app/(tabs)/zen.tsx            → Zen 🔨 Phase 8
app/(tabs)/calendar.tsx       → Calendar ✅ COMPLETE (unchanged)
app/(tabs)/shopping.tsx       → Shopping ✅ COMPLETE (unchanged)
app/(tabs)/mealplanner.tsx    → Meals ✅ COMPLETE (unchanged)
app/(tabs)/dashboard.tsx      → Dashboard stub ✅ (full build Phase 4)
app/(tabs)/settings.tsx       → Settings stub ✅ (full build later)
app/(tabs)/todos.tsx          → Todos (not yet built)
app/(tabs)/kids.tsx           → Kids Hub (not yet built)
app/components/ZaeliFAB.tsx   → ZaeliFAB ✅ COMPLETE Phase 1
lib/use-chat-persistence.ts   → ✅ Keys: home | shopping | calendar | meals
```

---

## Build Phase Plan (v5)
```
Phase 1: ZaeliFAB component       ✅ COMPLETE
Phase 2: Landing overlay          ✅ COMPLETE — embedded in index.tsx as LandingOverlay
Phase 3: Navigation architecture  🔨 NEXT — horizontal swipe world + dots
Phase 4: Dashboard screen         🔨 — app/(tabs)/dashboard.tsx
Phase 5: Chat screen v5 updates   🔨 — full-width Zaeli, two entry states
Phase 6: Pulse screen             🔨 — app/(tabs)/pulse.tsx
Phase 7: Sheets unchanged         ✅ confirmed
Phase 8: Zen screen               🔨 — app/(tabs)/zen.tsx
```

**Phase 3 vs Phase 4 decision:** Build Dashboard (Phase 4) before navigation architecture (Phase 3) — swipe world is more satisfying once both destination screens have real content. Build order: Phase 4 → Phase 3 → Phase 5 → Phase 6 → Phase 8.

---

## Coding Rules
- SafeAreaView edges={['top']} always
- PowerShell: no && — separate lines always
- Always npx expo start --dev-client (--clear for bundle issues)
- Date: local construction — NEVER toISOString()
- Time: NEVER append +10:00 — store bare local datetime string
- KAV backgroundColor: '#fff' · Send button: '#FF4545' always
- Body bg: '#FAF8F5' — never full colour bleed on channel screens
- No left-border accent strips · Apostrophes in JSX: double-quoted strings
- expo-file-system: 'expo-file-system/legacy'
- No literal newlines in JSX strings or regex — use \n
- stopPropagation on nested tappable inside tappable row
- Modal stacking: close → setTimeout 350ms → open
- Delete patterns: always two-tap to prevent accidents
- Sheet opens BEFORE awaiting data — open instantly, populate async
- router.navigate() always — never replace() or push()
- ZaeliFAB import: `../components/ZaeliFAB` from app/(tabs)/
- PanResponder + StatusBar must be explicitly imported from 'react-native'
- Landing flags file: `FileSystem.documentDirectory + 'landing_flags.json'`
