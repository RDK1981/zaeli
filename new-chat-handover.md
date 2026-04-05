# Zaeli — New Chat Handover
*5 April 2026 — Dashboard Option A ✅ WotD ✅ Chat input bar ✅ Mic ✅*
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
- **Design before code** — mockup first for any new screen
- Always ask me to upload the current working file before editing

---

## Who I am
- Richard. **Logged-in user = Rich**
- Family: Rich, Anna, Poppy (Yr6, 12, girl), Gab (Yr4, 10, BOY — Gabriel, he/him), Duke (Yr1, 8, boy)
- Local path: `C:\Users\richa\zaeli` (Windows, PowerShell)
- Screen copy: `Copy-Item "C:\Users\richa\Downloads\file.tsx" "C:\Users\richa\zaeli\app\`(tabs`)\file.tsx"`
- Component copy: `Copy-Item "C:\Users\richa\Downloads\ZaeliFAB.tsx" "C:\Users\richa\zaeli\app\components\ZaeliFAB.tsx"`
- Lib copy: `Copy-Item "C:\Users\richa\Downloads\file.ts" "C:\Users\richa\zaeli\lib\file.ts"`
- Repo: https://github.com/RDK1981/zaeli (private)
- Admin: https://incomparable-gumdrop-32e4ba.netlify.app

---

## Key constants (CRITICAL — never get these wrong)
```
DUMMY_FAMILY_ID = '00000000-0000-0000-0000-000000000001'
SONNET          = 'claude-sonnet-4-20250514'
GPT_MINI        = 'gpt-5.4-mini'
OpenAI env var  = EXPO_PUBLIC_OPENAI_API_KEY  ← exact name in BOTH ZaeliFAB.tsx AND index.tsx
OpenAI = max_completion_tokens · Claude = max_tokens
Send button = #FF4545 coral ALWAYS
Body bg = #FAF8F5 warm white always
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
ZaeliFAB is the ONLY navigation — no pill bar, no hamburger, no tab bar
ZaeliFAB = forwardRef — import ZaeliFABHandle alongside default import
fabRef = useRef<ZaeliFABHandle>(null) in index.tsx — ref={fabRef} on ZaeliFAB
Keyboard = Chat FAB tap when in chat → floating pill input bar, FAB hides
FAB restores only on keyboard dismiss (onBlur), NOT on send
Brief font = Poppins_600SemiBold 26px (NOT DM Serif)
DM Serif = wordmark and ghost numbers only
Landing = LandingOverlay in index.tsx — NOT a separate route
LANDING_TEST_MODE = true — set false before launch
router.navigate() always — NEVER router.replace() or router.push()
Navigation store: lib/navigation-store.ts — set before navigate, read+clear in useFocusEffect
Dashboard card order FIXED: Calendar → Dinner → Weather+WotD → Shopping → Actions
Delete = optimistic UI first (instant), Supabase background
Dashboard auto-refresh: 5-min interval in useFocusEffect
```

---

## V5 ARCHITECTURE (LOCKED ✅)

```
Pulse  ←  Dashboard  →  Chat
```
Dashboard = read. Chat = do. ZaeliFAB is the ONLY navigation.

### ZaeliFAB (COMPLETE ✅)
```
[ Dashboard ] | [ Chat ][ Mic ] | [ More ]
FAB_BTN=58 · borderRadius=36 · FAB_WIDTH=318px
forwardRef → exposes startMic() via useImperativeHandle
FAB bar hides when activeButton === 'keyboard'
Mic pill: full width, vertical, waveform + Listening + Cancel/Send →
```

### Chat input bar (COMPLETE ✅)
- Floating pill, `position:absolute bottom:0`, transparent bg
- Appears when `fabActive === 'keyboard'` or `keyboardOpen`
- Layout: Mic · TextInput (ref={inputRef}) · Send
- Mic → `inputRef.current?.blur()` → 150ms → `fabRef.current?.startMic()`
- Styles: `chatInputWrap`, `chatInputPill`, `chatInputMicBtn`

---

## What's built (5 April 2026)

### ✅ app/(tabs)/dashboard.tsx — Option A COMPLETE
**Visual language locked:** One bold Poppins headline per card. Data behind the tap.

**Card order (FIXED):**
1. Calendar — full width, dark slate `#3A3D4A`
2. Dinner — full width, peach `#FAC8A8`
3. Weather `#A8D8F0` + Word of the Day `#E8F4E8` — side by side
4. Shopping — full width, lavender `#D8CCFF` (WHITE font, no ghost number)
5. Actions — full width, gold `#F0DC80` (no ghost number)

**Headlines (formula-driven):**
- Calendar: "3 things on today." · "All clear today."
- Dinner: "Pasta Carbonara for dinner tonight." · "Nothing planned for dinner."
- Shopping: "23 things on the list." · "Shopping list is clear."
- Actions: "8 things on your plate." · "Nothing on your plate."
- WotD: the word in 26px #6B35D9 purple

**Tap behaviour:** header tap toggles. One expanded at a time. No collapse text.

**Calendar card stress tested ✅:**
- Expand/collapse works
- Event inline expand works
- Edit with Zaeli → Chat injection works
- Delete (two-tap, optimistic) works
- + Add → Chat injection works
- ← Dashboard back pill works

**Word of the Day:**
- Collapsed: just the word
- Expanded: Dictionary API definition + audio play button (expo-av)
- 400 curated words in `WOTD_LIST`, seeded by day-of-year

**Other:**
- Date in top bar (replaces "Dashboard" label)
- 5-minute auto-refresh interval
- Optimistic delete (instant UI, background Supabase)

### ✅ app/components/ZaeliFAB.tsx — forwardRef COMPLETE
- Exposes `startMic()` via `useImperativeHandle`
- FAB bar hides when `activeButton === 'keyboard'`
- Mic pill: full width, vertical layout, Cancel + Send →
- `EXPO_PUBLIC_OPENAI_API_KEY` for Whisper (matches index.tsx)

### ✅ app/(tabs)/index.tsx — Chat input bar COMPLETE
- `fabRef = useRef<ZaeliFABHandle>(null)` + `ref={fabRef}` on ZaeliFAB
- `chatInputWrap/chatInputPill/chatInputMicBtn` styles
- Mic button in pill → `fabRef.current?.startMic()`
- Send does NOT restore FAB — only keyboard dismiss does
- Navigation store: edit_event + add_event contexts wired
- ← Dashboard back pill working

### ✅ lib/navigation-store.ts — COMPLETE
### ✅ calendar.tsx · shopping.tsx · mealplanner.tsx — unchanged

---

## Dashboard stress testing status
- [x] Calendar card — expand, inline event, Edit/Add/Delete ✅
- [ ] Dinner card — expand, 7-day strip, Plan it →
- [ ] Shopping card — expand, list visible, + Add → Chat
- [ ] Actions card — expand, todos visible, tick works
- [ ] Word of the Day — expand, definition loads, audio plays
- [ ] Mic in chat input bar — end-to-end test

---

## Immediate next steps

### 1. Continue Dashboard stress testing
Upload current `dashboard.tsx` and `index.tsx` before touching anything.

Test remaining cards:
- Dinner: tap to expand → 7-day strip shows
- Shopping: tap to expand → items show, + Add → Chat
- Actions: tap to expand → todos show, tick works
- WotD: tap → definition loads → play button works

### 2. Fix any issues found in stress testing

### 3. Wire Shopping + Actions → Chat with full prompts (Phase 5 prep)
Same navigation store pattern. Add prompt injection for `shopping` and `actions` context types.

### 4. Phase 3 — Navigation architecture
Horizontal swipe world. Dashboard centre anchor. Dot indicator (3 dots).
Build AFTER Dashboard fully stress-tested and locked.

### 5. Phase 5 — Chat v5 updates
Full-width Zaeli messages (no bubble). Two entry states (Fresh vs Card-triggered).

---

## Build priority order
```
Phase 1: ZaeliFAB              ✅ COMPLETE
Phase 2: Landing overlay       ✅ COMPLETE
Phase 4: Dashboard Option A    ✅ COMPLETE
Phase 4b: Chat input bar       ✅ COMPLETE
Dashboard stress testing       🔨 IN PROGRESS (calendar done, 4 cards remain)
Phase 3: Navigation (swipe)    🔨 After stress testing complete
Phase 5: Chat v5 updates       🔨
Phase 6: Pulse screen          🔨
Phase 8: Zen screen            🔨
```

---

## Screen status table

| File | Status | Notes |
|---|---|---|
| components/ZaeliFAB.tsx | ✅ Complete | forwardRef, startMic exposed |
| index.tsx | ✅ Complete | Chat bar, mic wired, nav store |
| dashboard.tsx | ✅ Complete | Option A, all 5 cards + WotD |
| lib/navigation-store.ts | ✅ Complete | edit_event, add_event wired |
| _layout.tsx | ✅ Updated | All routes registered |
| settings.tsx | ✅ Stub | — |
| calendar.tsx | ✅ Complete | Unchanged |
| shopping.tsx | ✅ Complete | Unchanged |
| mealplanner.tsx | ✅ Complete | Unchanged |
| pulse.tsx | 🔨 Phase 6 | Not started |
| zen.tsx | 🔨 Phase 8 | Not started |
| todos.tsx | Not built | — |
| kids.tsx | Not built | — |
| notes.tsx | Not built | — |
| travel.tsx | Not built | — |
| tutor.tsx | Needs rebuild | — |

---

## Key decisions locked this session

- **Dashboard = Option A** — editorial headlines, bento layout, tap to expand
- **Card order locked** — Calendar → Dinner → Weather+WotD → Shopping → Actions
- **Shopping: white font** on lavender (not dark), no ghost number
- **Actions: no ghost number** (full width, clean)
- **Calendar: ghost number only** (dark slate makes it barely visible, looks good)
- **WotD card** — `#E8F4E8` sage, `#6B35D9` purple, 26px, curated list + Dictionary API + audio
- **Two mics kept** — iOS system (real-time dictation) + ZaeliFAB (Whisper). Different use cases.
- **FAB hides on keyboard** — input bar takes over. Restores on keyboard dismiss only.
- **Optimistic delete** — UI updates instantly, Supabase fires in background
- **Date in top bar** — replaces "Dashboard" label, always visible
- **5-min auto-refresh** — past events drop off without manual pull-to-refresh
- **Env var name** — `EXPO_PUBLIC_OPENAI_API_KEY` (not OPENAI_KEY) — must match in both files

---

## Tech reminders
- `npx expo start --dev-client` after copying (`--clear` for bundle issues)
- Import ZaeliFAB: `import ZaeliFAB, { ZaeliFABHandle } from '../components/ZaeliFAB'`
- Import navigation store: `import { setPendingChatContext } from '../../lib/navigation-store'`
- Import paths from `app/(tabs)/`: `../../lib/supabase`
- expo-file-system: `import * as FileSystem from 'expo-file-system/legacy'`
- Supabase: `rsvbzakyyrftezthlhtd` (Sydney)
- Windows dev — no && chaining in PowerShell
- router.navigate() always — never replace() or push()

---

**Read CLAUDE.md and ZAELI-PRODUCT.md first. Always ask Richard to upload current files before editing.**
