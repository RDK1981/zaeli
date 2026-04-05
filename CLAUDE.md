# CLAUDE.md — Zaeli Project Context
*Last updated: 5 April 2026 — Dashboard Option A ✅ Word of the Day ✅ Chat input bar ✅ ZaeliFAB mic ✅*

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
- expo-router, expo-image-picker, react-native-svg, expo-file-system, expo-av
- Poppins font (ALL UI), DMSerifDisplay (wordmark + ghost numbers only)
- No bottom tab bar — ZaeliFAB is the only navigation

---

## Key Constants
```
DUMMY_FAMILY_ID = '00000000-0000-0000-0000-000000000001'
SONNET          = 'claude-sonnet-4-20250514'
GPT_MINI        = 'gpt-5.4-mini'
OPENAI env var  = EXPO_PUBLIC_OPENAI_API_KEY  ← exact name, both ZaeliFAB AND index.tsx
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
Keyboard = Chat FAB tap when in chat → floating pill input bar appears, FAB hides
Brief font = Poppins_600SemiBold 26px (NOT DM Serif, NOT 700Bold)
DM Serif = wordmark and large ghost numbers only
Zaeli messages = full width, no bubble (v5 — Phase 5 pending)
PanResponder and StatusBar must be explicitly imported from 'react-native'
Landing = LandingOverlay component in index.tsx — NOT a separate route
router.navigate() always — NEVER router.replace() or router.push()
Navigation store: lib/navigation-store.ts — module-level, same pattern as getPendingCalendarImage
Dashboard card order = FIXED: Calendar → Dinner → Weather+WotD → Shopping → Actions
LANDING_TEST_MODE = true in index.tsx — must be set false before launch
ZaeliFAB = forwardRef — import ZaeliFABHandle type alongside default import
fabRef = useRef<ZaeliFABHandle>(null) in index.tsx — ref={fabRef} on ZaeliFAB
Delete = always optimistic UI first, Supabase in background
```

---

## ══════════════════════════════════
## V5 NAVIGATION ARCHITECTURE (LOCKED ✅)
## ══════════════════════════════════

```
Pulse  ←  Dashboard  →  Chat
```
Dashboard = permanent anchor. ZaeliFAB is the ONLY navigation.

### Landing (COMPLETE ✅)
- `LandingOverlay` in index.tsx — NOT a separate route
- `LandingGate` default export checks time window + FileSystem dismiss flag
- Swipe >50px or FAB tap → fades out
- `LANDING_TEST_MODE = true` — **set false before launch**

### Landing Visual (LOCKED ✅)
```
Background: #FFF6EC morning · #EDF6FF midday · #F5EEFF evening
Logo 'a'+'i': #F0C8C0 warm blush · Highlights: #0096C7 cyan
Brief: Poppins 600SemiBold 26px · Dots: paddingBottom 28
```

---

## ══════════════════════════════════
## ZAELIFAX — LOCKED SPEC (✅ Complete)
## ══════════════════════════════════

**File:** `app/components/ZaeliFAB.tsx`
**Pattern:** `forwardRef` — exposes `startMic()` via `useImperativeHandle`

```typescript
import ZaeliFAB, { ZaeliFABHandle } from '../components/ZaeliFAB';
const fabRef = useRef<ZaeliFABHandle>(null);
<ZaeliFAB ref={fabRef} ... />
fabRef.current?.startMic()  // call from input bar mic button
```

```
FAB_BTN=58px · borderRadius=36px · FAB_WIDTH=318px
paddingBottom: 24px iOS / 14px Android
```

**FAB hides when `activeButton === 'keyboard'`** — mic pill still renders above.

**Mic pill (LOCKED ✅):**
- Full screen width (left:16 right:16), vertical layout
- Waveform · "Listening…" · Cancel (outline) + Send → (solid coral)
- Whisper via `EXPO_PUBLIC_OPENAI_API_KEY`
- Result → `onMicResult(text)` → `send(text)` in chat

More overlay: Notes/Kids/Tutor · Travel/Family/Meals · Pulse/Zen/Settings

---

## ══════════════════════════════════
## CHAT INPUT BAR (LOCKED ✅)
## ══════════════════════════════════

Floating pill, appears when keyboard active, replaces FAB.
`position:absolute bottom:0`, `backgroundColor:'transparent'` (no banner).
Same height/radius/shadow as FAB. `borderRadius:36`.

Layout: **Mic** (→ fabRef.current?.startMic()) · **TextInput** (ref={inputRef}) · **Send** (coral)

Lifecycle:
- Chat FAB tap in chat → `setFabActive('keyboard')` → `inputRef.current?.focus()`  
- `onFocus` → `setFabActive('keyboard')` (FAB hides)
- `onBlur` → `setFabActive('chat')` (FAB returns)
- Send does NOT restore FAB — only keyboard dismiss does

Styles: `chatInputWrap` · `chatInputPill` · `chatInputMicBtn`

---

## ══════════════════════════════════
## DASHBOARD — OPTION A (✅ Complete)
## ══════════════════════════════════

**Design principle:** One bold Poppins statement per card. Data behind the tap. Tap header to toggle.

### Card order (FIXED ✅)
1. Calendar — full width, `#3A3D4A`
2. Dinner — full width, `#FAC8A8`
3. Weather `#A8D8F0` + Word of the Day `#E8F4E8` — side by side
4. Shopping — full width, `#D8CCFF` (**white font**)
5. Actions — full width, `#F0DC80`

### Headlines (formula-driven, zero AI cost)
- Calendar: "3 things on today." / "All clear today."
- Dinner: "Pasta Carbonara for dinner tonight." / "Nothing planned for dinner."
- Shopping: "23 things on the list." / "Shopping list is clear."
- Actions: "8 things on your plate." / "Nothing on your plate."
- WotD: the word itself, 26px, `#6B35D9` purple

### Smart time logic (LOCKED ✅)
- Calendar → Tomorrow: after 8pm OR all today events past
- Dinner → Tomorrow: after 8pm
- Actions → evening mode: after 8pm
- Auto-refresh: 5-minute interval while screen focused

### Tap behaviour (LOCKED ✅)
- One card expanded at a time
- Tap header → expand. Tap header again → collapse. No "Collapse" text.
- Ghost numbers: Calendar only (clipped via overflow:hidden)
- Shopping: white text on lavender, no ghost number
- Actions: no ghost number

### Optimistic delete (LOCKED ✅)
- UI updates instantly via `onDeleted(eventId)` → filters local state
- Supabase delete fires in background

### Dashboard → Chat injection
- `edit_event` → inline card + prompt + chips + keyboard (600ms delay)
- `add_event` → prompt + chips + keyboard
- `shopping` / `actions` → Chat (full prompt pending Phase 5)
- `setFabActive('keyboard')` on arrival so FAB hides and input bar shows

### Top bar
- Date label replaces "Dashboard": `toLocaleDateString('en-AU', { weekday:'short', day:'numeric', month:'short' })`

---

## ══════════════════════════════════
## WORD OF THE DAY (NEW ✅)
## ══════════════════════════════════

Card: `#E8F4E8` sage · Text: `#6B35D9` purple · 26px Poppins 700
Word list: 400 curated words in `dashboard.tsx` (`WOTD_LIST`), seeded by day-of-year
Definition: `dictionaryapi.dev` (free, no key) — fetched on expand
Audio: Dictionary API MP3, played via `expo-av` · Play icon = SVG polygon, coral when active
Expanded: word · phonetic · part of speech · definition · example sentence
Update annually: swap `WOTD_LIST` array contents

---

## ══════════════════════════════════
## NAVIGATION STORE (✅)
## ══════════════════════════════════

**File:** `lib/navigation-store.ts`
```typescript
type ChatEntryContext = {
  type: 'edit_event'|'add_event'|'shopping'|'actions'|'meals'|null;
  event?: any; returnTo?: 'dashboard';
};
setPendingChatContext(ctx) / getPendingChatContext() / clearPendingChatContext() / hasPendingChatContext()
```

---

## Per-Channel Colour System (LOCKED)

| Channel | Card bg | Text |
|---------|---------|------|
| Calendar | `#3A3D4A` | white |
| Dinner | `#FAC8A8` | dark |
| Weather | `#A8D8F0` | dark |
| Word of Day | `#E8F4E8` | `#6B35D9` purple |
| Shopping | `#D8CCFF` | **white** |
| Actions | `#F0DC80` | dark |

Family colours: Rich `#4D8BFF` · Anna `#FF7B6B` · Poppy `#A855F7` · Gab `#22C55E` · Duke `#F59E0B`

---

## Channel Architecture (v5)
```
app/(tabs)/index.tsx          → Chat + LandingGate + LandingOverlay ✅
app/(tabs)/dashboard.tsx      → Dashboard Option A ✅ complete
app/(tabs)/calendar.tsx       → Calendar ✅ unchanged
app/(tabs)/shopping.tsx       → Shopping ✅ unchanged
app/(tabs)/mealplanner.tsx    → Meals ✅ unchanged
app/(tabs)/settings.tsx       → Stub ✅
app/(tabs)/pulse.tsx          → 🔨 Phase 6
app/(tabs)/zen.tsx            → 🔨 Phase 8
app/components/ZaeliFAB.tsx   → ✅ forwardRef, mic pill, hides on keyboard
lib/navigation-store.ts       → ✅ Dashboard→Chat context store
lib/use-chat-persistence.ts   → ✅ Keys: home|shopping|calendar|meals
```

---

## Build Phase Plan (v5)
```
Phase 1: ZaeliFAB              ✅ COMPLETE (forwardRef + startMic)
Phase 2: Landing overlay       ✅ COMPLETE
Phase 4: Dashboard Option A    ✅ COMPLETE (all 5 cards + WotD + mic)
Phase 4b: Chat input bar       ✅ COMPLETE (floating pill, FAB hides)
Phase 3: Navigation (swipe)    🔨 NEXT — horizontal swipe + dots
Phase 5: Chat v5 updates       🔨 — full-width Zaeli, two entry states
Phase 6: Pulse screen          🔨
Phase 8: Zen screen            🔨
```

---

## Coding Rules
- SafeAreaView edges={['top']} always
- PowerShell: no && — separate lines
- Always `npx expo start --dev-client` (`--clear` for bundle issues)
- Date: local construction — NEVER toISOString()
- Time: NEVER +10:00 suffix — store bare local datetime string
- KAV backgroundColor:'#fff' · Send button: '#FF4545' always
- Body bg: '#FAF8F5' always
- No left-border accent strips · Apostrophes in JSX: double-quoted strings
- expo-file-system: 'expo-file-system/legacy'
- No literal newlines in JSX strings — use \n
- stopPropagation on nested tappable rows
- Modal stacking: close → setTimeout 350ms → open
- Delete: always optimistic UI first, Supabase background
- Sheet opens BEFORE awaiting data
- router.navigate() always — never replace() or push()
- PanResponder + StatusBar: explicitly import from 'react-native'
- Navigation store: set before navigate, read+clear in useFocusEffect
- EXPO_PUBLIC_OPENAI_API_KEY exact name everywhere
