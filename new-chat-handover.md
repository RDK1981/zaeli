# Zaeli — New Chat Handover
*6 April 2026 — My Space designed ✅ Swipe world updated ✅ Zaeli Noticed card ✅*
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

**There are only THREE navigable screens (swipe world):**
```
My Space  ←  Dashboard  →  Chat
```

**IMPORTANT: Pulse as a dedicated screen is SCRAPPED. My Space replaces it.**
**Zen is NOT a dedicated screen — Zen content lives inside My Space.**

**These open as 92% SHEETS over Chat — NEVER dedicated screens, NEVER router.navigate():**
- Calendar · Shopping · Meal Planner · Todos / Reminders · Notes (family) · Travel

**These are the ONLY dedicated full screens (router.navigate() ok):**
- Tutor · Kids Hub · Our Family · Settings

**More overlay routing:**
- Calendar/Shopping/Meals/Todos/Notes/Travel → sheet over Chat (via state)
- Tutor/Kids Hub/Our Family/Settings → router.navigate() to screen

**Important:** `shopping.tsx`, `mealplanner.tsx`, `calendar.tsx` exist as tab files — temporary scaffolding from before v5. They will become sheets inside Chat. Do NOT treat them as navigable screens.

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

## Key constants (CRITICAL — never get these wrong)
```
DUMMY_FAMILY_ID = '00000000-0000-0000-0000-000000000001'
SONNET          = 'claude-sonnet-4-20250514'
GPT_MINI        = 'gpt-5.4-mini'
OPENAI env var  = EXPO_PUBLIC_OPENAI_API_KEY  ← exact name, both ZaeliFAB AND index.tsx
OpenAI = max_completion_tokens · Claude = max_tokens. Never mix.
Send button     = #FF4545 coral ALWAYS
Body bg         = #FAF8F5 warm white always
KAV must have backgroundColor:'#fff'
always await supabase inserts
expo-file-system: 'expo-file-system/legacy'
NEVER toISOString() for dates · NEVER +10:00 for times
router.navigate() only for dedicated screens (Tutor/Kids Hub/Our Family/Settings)
Calendar/Shopping/Meals/Todos/Notes/Travel = sheets via state, never navigate()
ZaeliFAB = forwardRef — import ZaeliFABHandle alongside default import
fabRef = useRef<ZaeliFABHandle>(null) · ref={fabRef} on ZaeliFAB
FAB hides when activeButton === 'keyboard' · restores on blur only
LANDING_TEST_MODE = true — set false before launch
Dashboard card order: Calendar → Dinner → Weather+ZaeliNoticed → Shopping → Actions
WotD moved to My Space — no longer on Dashboard
My Space card order: Health → Goals → WotD → NASA → Zen → Notes → Wordle
Delete = optimistic UI first (instant), Supabase in background
My Space uses same Poppins headline card language as Dashboard
SafeAreaView goes in swipe-world.tsx ONLY — not in individual page files
```

---

## What's built (6 April 2026)

### ✅ Screen architecture (LOCKED — UPDATED)
Three navigable screens: **My Space ← Dashboard → Chat**
- Pulse as dedicated screen = SCRAPPED
- My Space = new third screen (Rich's personal world)
- Zen = content card inside My Space, NOT a dedicated screen
- All domain channels = 92% sheets over Chat
- Dedicated screens: Tutor, Kids Hub, Our Family, Settings

### ✅ app/components/ZaeliFAB.tsx
- `forwardRef` exposing `startMic()` via `useImperativeHandle`
- FAB bar hides when `activeButton === 'keyboard'`
- Mic pill: full width, vertical, waveform · Listening · Cancel + Send →
- Whisper via `EXPO_PUBLIC_OPENAI_API_KEY`
- My Space / Dashboard / Chat buttons → will scroll to correct page in swipe-world.tsx

### ✅ app/(tabs)/index.tsx — Chat
- `fabRef = useRef<ZaeliFABHandle>(null)` + `ref={fabRef}` on ZaeliFAB
- Floating chat input pill (transparent bg, same height as FAB)
- FAB restores only on `onBlur`, NOT on send
- Navigation store: edit_event + add_event contexts wired → Chat injection
- "← Dashboard" back pill working
- Calendar, Shopping, Meals sheets exist inside here

### ✅ app/(tabs)/dashboard.tsx — Option A
**Card order (FIXED):** Calendar → Dinner → Weather+ZaeliNoticed → Shopping → Actions

**Card colours:**
- Calendar: `#3A3D4A` slate (white text)
- Dinner: `#FAC8A8` peach (dark text)
- Weather: `#A8D8F0` sky (dark text)
- Zaeli Noticed: `#E8F4E8` sage / `#6B35D9` violet (same palette as old WotD)
- Shopping: `#D8CCFF` lavender (WHITE text)
- Actions: `#F0DC80` gold (dark text)

**Headlines (formula-driven):**
- Calendar: "3 things on today." · "All clear today."
- Dinner: "Pasta Carbonara for dinner tonight."
- Shopping: "23 items on the shopping list."
- Actions: "8 things on your plate."
- Zaeli Noticed: "3 things Zaeli noticed." (collapsed) → expands inline with notices + chips

**Tap:** header toggles expand/collapse · one card at a time · no collapse text
**Auto-refresh:** 5-min interval · optimistic delete · date in top bar

### ✅ lib/navigation-store.ts
Types: `edit_event` · `add_event` · `shopping` · `actions` · `meals`
To add: `my_space_goal` for Goal → Chat injection

---

## Dashboard stress testing status
- [x] Calendar card — expand, inline event, Edit/Add/Delete ✅
- [ ] Dinner card — expand, 7-day strip, Plan it →
- [ ] Shopping card — expand, list shows, + Add → Chat
- [ ] Actions card — expand, todos show, tick works
- [ ] Zaeli Noticed card — needs to be built (replaces WotD)

---

## My Space — designed, not yet built

**Full interactive mockup produced: `zaeli-myspace-v4.html`**

### Card stack (FIXED ORDER)
| Card | Colour | Collapsed headline |
|------|--------|--------------------|
| Health | `#3A3D4A` slate | "6,842 steps so far today." |
| Goals | `#F0DC80` gold | "Three things to work toward." |
| Word of the Day | `#E8F4E8` sage | "ephemeral." *(italic violet)* |
| NASA APOD | `#3A3D4A` slate | "Saturn's rings, today." |
| Zen | `#FAC8A8` peach | "Four meditations ready for you." |
| Notes | `#D8CCFF` lavender | "Three notes on the go." |
| Wordle | `#F0DC80` gold | "12-day streak. Keep it going." 🔥 |

### Health card (expanded)
- Steps + % of goal + progress bar (collapsed)
- Expanded: walk/run distance · active calories · last 2 workouts (type/distance/duration/cal)
- Source: HealthKit (expo-health or react-native-health)

### Goals card (expanded)
- Goal rows with mini progress bars
- Tap % → detail sheet with Zaeli coaching + "Build a training plan" CTA → Chat injection
- Goals live here permanently

### WotD (LOCKED ✅ — moved from Dashboard)
- Same sage/violet design, same 400-word list, same Dictionary API audio
- Collapsed: word + phonetic. Expanded: definition + example + play button.

### NASA APOD
- Free API. Collapsed: small image + headline. Expanded: big image + description + link.
- Cached daily in FileSystem.

### Zen
- 4–5 GPT mini meditations daily. expo-av playback inline.
- Expanded: track list. Playing track shows pause + progress bar.

### Notes (personal)
- Collapsed: title preview. Tap → 92% sheet slides up over My Space.
- Keyboard works same as Chat — KAV, type normally.

### Wordle
- Date-seeded daily word (same as NYT). Inline grid + keyboard when expanded.
- Streak tracked in FileSystem or Supabase.

### Zaeli brief integration
generateBrief() now pulls My Space data alongside family data:
- Steps vs goal, upcoming milestones, goal progress, notes with no recent updates
- "Your Noosa Run is 4 weeks away — want a dedicated training plan?"

---

## Phase 3 — swipe-world.tsx (NEXT TO BUILD)

New container file that replaces individual tab routes as entry point.

### What it owns
- Horizontal ScrollView (pagingEnabled, 3 pages: My Space / Dashboard / Chat)
- SafeAreaView (one place only — removed from individual page files)
- ZaeliFAB (renders once, floating above everything)
- Landing overlay (renders once, above all three pages)
- 3-dot indicator (active dot = coral pill, reads scroll position)
- `activePage` state (0=My Space, 1=Dashboard, 2=Chat)
- App opens on page 1 (Dashboard) via scrollTo on mount

### FAB button behaviour in swipe world
- My Space button → scrollTo page 0
- Dashboard button → scrollTo page 1 (or no-op if already there)
- Chat button → scrollTo page 2 (or open keyboard if already on Chat)
- Mic → fabRef.current?.startMic() as before

### Chat input bar
- Only visible when activePage === 2
- Passed as prop from container

### Build steps (in order)
1. Create swipe-world.tsx with 3 placeholder pages + dots + FAB
2. Wire FAB buttons to scrollTo instead of router.navigate()
3. Slim index.tsx — remove FAB, SafeAreaView, landing overlay
4. Remove SafeAreaView from dashboard.tsx
5. Wire Dashboard card taps → scrollTo(2) then open sheet
6. Register swipe-world.tsx as app entry point in _layout.tsx

---

## Immediate next steps (in order)

### 1. Finish Dashboard stress testing
Upload `dashboard.tsx` and `index.tsx` before touching anything. Test remaining 4 cards:
- Dinner: expand → 7-day strip shows
- Shopping: expand → items show, + Add → Chat
- Actions: expand → todos show, tick → Supabase
- WotD: expand → definition loads, play button works

### 2. Phase 3 — swipe-world.tsx container
Build the horizontal swipe world. See build steps above.
Upload current `index.tsx`, `dashboard.tsx`, `ZaeliFAB.tsx`, `_layout.tsx` before starting.

### 3. Phase 3b — My Space screen
Build `my-space.tsx` as a component rendered inside swipe-world.tsx page 0.
Follow the locked design from `zaeli-myspace-v4.html` mockup exactly.
Start with Health + Goals + WotD (use existing WotD code from dashboard.tsx).
Add NASA, Zen, Notes, Wordle as separate passes.

### 4. Zaeli Noticed card
Replace WotD slot in Dashboard with the Zaeli Noticed card.
Same sage/violet palette. Collapsed headline. Expands inline with GPT mini notices.

### 5. Phase 5 — Chat v5
Full-width Zaeli messages (no bubble). Two entry states (Fresh vs Card-triggered).

---

## Build priority
```
Phase 1: ZaeliFAB              ✅ COMPLETE
Phase 2: Landing overlay       ✅ COMPLETE
Phase 4: Dashboard Option A    ✅ COMPLETE
Phase 4b: Chat input bar       ✅ COMPLETE
Dashboard stress testing       🔨 IN PROGRESS (Calendar done, 4 cards remain)
Phase 3: swipe-world.tsx       🔨 NEXT — horizontal swipe + dots + container
Phase 3b: My Space             🔨 NEXT — after swipe container built
Phase 5: Chat v5               🔨
Phase 6: Zaeli Noticed card    🔨 in Dashboard
Phase 7: Todos + Reminders     🔨
Phase 8: Kids Hub              🔨
Phase 9: Tutor rebuild         🔨
```

---

## Screen status

| File | Status | Notes |
|---|---|---|
| components/ZaeliFAB.tsx | ✅ Complete | forwardRef, startMic, scroll buttons to wire |
| index.tsx | ✅ Complete | chat bar, mic, nav store — will slim in Phase 3 |
| dashboard.tsx | ✅ Complete | Option A, 5 cards — WotD to be replaced by Zaeli Noticed |
| lib/navigation-store.ts | ✅ Complete | add my_space_goal type later |
| settings.tsx | ✅ Stub | |
| swipe-world.tsx | 🔨 Phase 3 | New container file |
| my-space.tsx | 🔨 Phase 3b | Rich's personal world — fully designed |
| Calendar sheet | ✅ In index.tsx | |
| Shopping sheet | ✅ In index.tsx | |
| Meals sheet | ✅ In index.tsx | |
| Todos sheet | 🔨 Build in Chat | Sheet only |
| Notes sheet (family) | 🔨 Build in Chat | Sheet only |
| Notes sheet (personal) | 🔨 Build in My Space | Sheet only |
| Travel sheet | 🔨 Build in Chat | Sheet only |
| Tutor | 🔨 Rebuild | Dedicated screen |
| Kids Hub | 🔨 Build | Dedicated screen |
| Our Family | 🔨 Build | Dedicated screen |

---

## Key decisions locked this session (6 April 2026)

- **Pulse scrapped as dedicated screen** — was too niche as a standalone feed
- **My Space** replaces Pulse — Rich's personal world: health, goals, word, NASA, zen, notes, Wordle
- **Zaeli Noticed card** replaces WotD in Dashboard (same sage/violet palette — intentional visual continuity)
- **WotD moves to My Space** — design unchanged, just new home
- **Zen is not a dedicated screen** — lives as a card in My Space
- **My Space card language = Dashboard language** — same Poppins headlines, same colour palette, one continuous product feel
- **My Space colour mapping:** Health/NASA = slate · Goals/Wordle = gold · WotD = sage (locked) · Zen = peach · Notes = lavender
- **HealthKit v1 scope:** steps, distance, active calories, individual workout sessions
- **NASA APOD:** tap to expand — image grows + full description + link · cached daily
- **Goals:** permanent home on My Space card · detail sheet with Zaeli coaching + Chat CTA
- **Notes (personal):** 92% sheet over My Space · keyboard + KAV works same as Chat
- **Wordle:** date-seeded, same as NYT, inline grid + keyboard, no external links
- **Zaeli brief:** now pulls My Space data (steps, goals, notes) alongside family data
- **swipe-world.tsx:** new container file, single SafeAreaView, ZaeliFAB above scroll, landing overlay above all
- **Landing overlay:** promotes to container level — shows over all three screens not just Chat

---

**Read CLAUDE.md and ZAELI-PRODUCT.md first. Always upload current files before editing.**
