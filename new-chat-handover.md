# Zaeli — New Chat Handover
*5 April 2026 — Dashboard Option A ✅ WotD ✅ Chat input bar ✅ Screen architecture clarified ✅*
*Copy this entire message to start a new chat.*

---

## Hi! Continuing development of Zaeli.

Zaeli is an iOS-first AI family life platform built in React Native / Expo.
Please read **CLAUDE.md** before we start — full stack, architecture, colours, ALL sizing specs.
Then **ZAELI-PRODUCT.md** for product vision and all module decisions.

---

## ══════════════════════════════════
## SCREEN ARCHITECTURE — READ THIS FIRST (LOCKED ✅)
## ══════════════════════════════════

**There are only THREE navigable screens:**
```
Pulse  ←  Dashboard  →  Chat
```

**These open as 92% SHEETS over Chat — NEVER dedicated screens, NEVER router.navigate():**
- Calendar · Shopping · Meal Planner · Todos / Reminders · Notes · Travel

**These are the ONLY dedicated full screens (router.navigate() ok):**
- Tutor · Kids Hub · Zen · Our Family · Settings

**The More overlay routes:**
- Calendar/Shopping/Meals/Todos/Notes/Travel → open as sheet over Chat (via state)
- Tutor/Kids Hub/Zen/Our Family/Settings → router.navigate() to screen

**Important:** `shopping.tsx`, `mealplanner.tsx`, `calendar.tsx` exist as tab files — temporary scaffolding from before v5. They will become sheets inside Chat. Do NOT treat them as navigable screens or build new features assuming they are.

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

---

## Key constants (CRITICAL)
```
DUMMY_FAMILY_ID = '00000000-0000-0000-0000-000000000001'
SONNET          = 'claude-sonnet-4-20250514'
GPT_MINI        = 'gpt-5.4-mini'
OPENAI env var  = EXPO_PUBLIC_OPENAI_API_KEY  ← exact name, both ZaeliFAB AND index.tsx
Send button     = #FF4545 coral ALWAYS
Body bg         = #FAF8F5 warm white always
KAV must have backgroundColor:'#fff'
always await supabase inserts
expo-file-system: 'expo-file-system/legacy'
NEVER toISOString() for dates · NEVER +10:00 for times
router.navigate() only for dedicated screens
Calendar/Shopping/Meals/Todos/Notes/Travel = sheets via state, never navigate()
ZaeliFAB = forwardRef — import ZaeliFABHandle alongside default import
fabRef = useRef<ZaeliFABHandle>(null) · ref={fabRef} on ZaeliFAB
FAB hides when activeButton === 'keyboard' · restores on blur only
LANDING_TEST_MODE = true — set false before launch
Dashboard card order: Calendar → Dinner → Weather+WotD → Shopping → Actions
Delete = optimistic UI first (instant), Supabase in background
```

---

## What's built (5 April 2026)

### ✅ Screen architecture (LOCKED)
Three navigable screens: Pulse ← Dashboard → Chat
All domain channels (Calendar, Shopping, Meals, Todos, Notes, Travel) = 92% sheets over Chat
Dedicated screens only: Tutor, Kids Hub, Zen, Our Family, Settings

### ✅ app/components/ZaeliFAB.tsx
- `forwardRef` exposing `startMic()` via `useImperativeHandle`
- FAB bar hides when `activeButton === 'keyboard'`
- Mic pill: full width, vertical, waveform · Listening · Cancel + Send →
- Whisper via `EXPO_PUBLIC_OPENAI_API_KEY`

### ✅ app/(tabs)/index.tsx
- `fabRef = useRef<ZaeliFABHandle>(null)` + `ref={fabRef}` on ZaeliFAB
- Floating chat input pill (transparent bg, same height as FAB)
  - Mic button → `fabRef.current?.startMic()`
  - TextInput `ref={inputRef}` · Send (coral)
  - Styles: `chatInputWrap` · `chatInputPill` · `chatInputMicBtn`
- FAB restores only on `onBlur` (keyboard dismiss), NOT on send
- Navigation store: edit_event + add_event contexts wired → Chat injection
- "← Dashboard" back pill working

### ✅ app/(tabs)/dashboard.tsx — Option A
Card order: Calendar → Dinner → Weather+WotD → Shopping → Actions

**Headlines (formula-driven):**
- Calendar: "3 things on today." · "All clear today."
- Dinner: "Pasta Carbonara for dinner tonight." · "Nothing planned for dinner."
- Shopping: "23 items on the shopping list." · "Shopping list is clear."
- Actions: "8 things on your plate." · "Nothing on your plate."
- WotD: word in 26px `#6B35D9` purple

**Tap:** header toggles expand/collapse · one card at a time · no collapse text
**Ghost numbers:** Calendar only (others removed)
**Shopping:** white font on lavender · no ghost number
**Actions:** no ghost number
**Auto-refresh:** 5-min interval · optimistic delete
**Date** in top bar (replaces "Dashboard" label)

**Word of the Day:**
- `#E8F4E8` sage · `#6B35D9` purple · 26px Poppins 700
- 400 curated words (`WOTD_LIST`), seeded by day-of-year
- Definition: `dictionaryapi.dev` (free) · Audio: expo-av
- Update annually: swap `WOTD_LIST`

### ✅ lib/navigation-store.ts
Types: `edit_event` · `add_event` · `shopping` · `actions` · `meals`

---

## Dashboard stress testing status
- [x] Calendar card — expand, inline event, Edit/Add/Delete ✅
- [ ] Dinner card — expand, 7-day strip, Plan it →
- [ ] Shopping card — expand, list shows, + Add → Chat
- [ ] Actions card — expand, todos show, tick works
- [ ] Word of the Day — expand, definition loads, audio plays

---

## Immediate next steps

### 1. Finish Dashboard stress testing
Upload `dashboard.tsx` and `index.tsx` before touching anything. Test:
- Dinner: expand → 7-day strip
- Shopping: expand → items → + Add → Chat
- Actions: expand → todos → tick → saves to Supabase
- WotD: expand → definition → play button

### 2. Phase 3 — Horizontal swipe navigation
Pulse ← Dashboard → Chat with 3-dot indicator.
Dashboard = centre anchor. Swipe gesture, dot animates. Feels native iOS.
Build AFTER Dashboard fully stress-tested.

### 3. Phase 5 — Chat v5 updates
Full-width Zaeli messages (no bubble). Two entry states (Fresh vs Card-triggered).

---

## Build priority
```
Phase 1: ZaeliFAB              ✅ COMPLETE
Phase 2: Landing overlay       ✅ COMPLETE
Phase 4: Dashboard Option A    ✅ COMPLETE
Phase 4b: Chat input bar       ✅ COMPLETE
Dashboard stress testing       🔨 IN PROGRESS
Phase 3: Swipe navigation      🔨 NEXT after stress test
Phase 5: Chat v5               🔨
Phase 6: Pulse                 🔨
Phase 8: Zen                   🔨
```

---

## Screen status

| File | Status | Notes |
|---|---|---|
| components/ZaeliFAB.tsx | ✅ Complete | forwardRef, startMic |
| index.tsx | ✅ Complete | chat bar, mic, nav store |
| dashboard.tsx | ✅ Complete | Option A, 5 cards, WotD |
| lib/navigation-store.ts | ✅ Complete | |
| settings.tsx | ✅ Stub | |
| pulse.tsx | 🔨 Phase 6 | |
| zen.tsx | 🔨 Phase 8 | Dedicated screen |
| Tutor | 🔨 Rebuild | Dedicated screen |
| Kids Hub | 🔨 Build | Dedicated screen |
| Our Family | 🔨 Build | Dedicated screen |
| Calendar sheet | ✅ Exists in index.tsx | |
| Shopping sheet | ✅ Exists in index.tsx | |
| Meals sheet | ✅ Exists in index.tsx | |
| Todos sheet | 🔨 Build inside Chat | Sheet only |
| Notes sheet | 🔨 Build inside Chat | Sheet only |
| Travel sheet | 🔨 Build inside Chat | Sheet only |

---

**Read CLAUDE.md and ZAELI-PRODUCT.md first. Always upload current files before editing.**
