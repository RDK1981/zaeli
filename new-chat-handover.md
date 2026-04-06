# Zaeli — New Chat Handover
*6 April 2026 — Swipe world built ✅ Brand pack ✅ Wordmark updated ✅*
*Copy this entire message to start a new chat.*

---

## Hi! Continuing development of Zaeli.

Zaeli is an iOS-first AI family life platform built in React Native / Expo.
Read **CLAUDE.md** before starting — full stack, architecture, colours, ALL specs.
Then **ZAELI-PRODUCT.md** for product vision and all module decisions.

---

## ══════════════════════════════════
## SCREEN ARCHITECTURE — READ FIRST (LOCKED ✅)
## ══════════════════════════════════

**Three navigable screens:**
```
Dashboard (0)  →  Chat (1)  →  My Space (2)
```
App opens on Dashboard. Swipe right → Chat. Swipe right again → My Space.

**Pulse = SCRAPPED. Zen = card in My Space. WotD = My Space only.**

**92% SHEETS over Chat (never router.navigate()):**
Calendar · Shopping · Meal Planner · Todos / Reminders · Notes · Travel

**Dedicated full screens (router.navigate() ok):**
Tutor · Kids Hub · Our Family · Settings

---

## How I like to work
- **Beginner developer** — full file rewrites always, never partial diffs
- **Two fixes at a time** — bulk changes = too many variables
- One PowerShell command at a time, never chained with &&
- Plain English before code · Design before code
- **CRITICAL:** Upload files from `C:\Users\richa\zaeli\app\(tabs)\` — NEVER from Downloads

---

## Who I am
- Richard. **Logged-in user = Rich**
- Family: Rich, Anna, Poppy (Yr6, 12, girl), Gab (Yr4, 10, BOY — Gabriel, he/him), Duke (Yr1, 8, boy)
- Local: `C:\Users\richa\zaeli` (Windows, PowerShell)
- Screen: `Copy-Item "C:\Users\richa\Downloads\file.tsx" "C:\Users\richa\zaeli\app\`(tabs`)\file.tsx"`
- Component: `Copy-Item "C:\Users\richa\Downloads\ZaeliFAB.tsx" "C:\Users\richa\zaeli\app\components\ZaeliFAB.tsx"`
- Repo: https://github.com/RDK1981/zaeli (private)

---

## Key constants (CRITICAL — never get these wrong)
```
DUMMY_FAMILY_ID = '00000000-0000-0000-0000-000000000001'
SONNET          = 'claude-sonnet-4-20250514'
GPT_MINI        = 'gpt-5.4-mini'
OPENAI env var  = EXPO_PUBLIC_OPENAI_API_KEY (exact, both files)
Send button     = #FF4545 coral ALWAYS
Body bg         = #FAF8F5 warm white ALWAYS
KAV             = backgroundColor:'#fff' always
Wordmark font   = Poppins_800ExtraBold (NOT DM Serif)
Wordmark a+i    = #A8D8F0 sky blue (light and dark)
DM Serif        = ghost numbers ONLY — never readable text
SafeAreaView    = swipe-world.tsx ONLY
Individual pages = useSafeAreaInsets() for manual paddingTop
expo-file-system = 'expo-file-system/legacy'
NEVER toISOString() · NEVER +10:00
router.navigate() only for dedicated screens
Swipe pages     = Dashboard(0) · Chat(1) · My Space(2) LOCKED
3-dot colours   = coral for 0+1 · sky #A8D8F0 for 2
✦ active        = #A8D8F0 sky blue
LANDING_TEST_MODE = true (swipe-world.tsx) — set false before launch
Todos fetch     = IN ['active','done'] — NEVER eq alone
Tick handler    = TOGGLE — done↔active, never one-directional
Delete          = optimistic UI first, Supabase background
Card buttons    = full-width, borderRadius:14, paddingVertical:14, Poppins_700Bold 15px
Nav store types = edit_event · add_event · shopping · shopping_sheet · actions · meals · noticed
Chip intercepts = 'Open Meal Planner' · 'Open Shopping List' · 'Open To-dos'
Family colours  = Rich:#4D8BFF · Anna:#FF7B6B · Poppy:#A855F7 · Gab:#22C55E · Duke:#F59E0B
```

---

## What's built (6 April 2026)

### ✅ Phase 3 — swipe-world.tsx (built this session)

**`app/(tabs)/swipe-world.tsx`** — container file owns:
- Horizontal ScrollView, pagingEnabled, 3 pages (Dashboard / Chat placeholder / My Space placeholder)
- ZaeliFAB (position:absolute, zIndex:999, renders once)
- 3-dot indicator (position:absolute, bottom:112 iOS, zIndex:998)
- Landing overlay (position:absolute, zIndex:1000)
- `activePage` + `fabActive` state

**`app/(tabs)/index.tsx`** — re-exports SwipeWorld as default export (expo-router entry point)

**Known issue:** Chat page is a placeholder. `index.tsx` cannot be imported as a component because expo-router intercepts it. **Fix in Phase 5:** extract `HomeScreen` from `index.tsx` into `app/components/ChatPage.tsx`, then swipe-world imports `ChatPage` directly.

### ✅ ZaeliFAB — updated to 5 buttons (this session)

```
[ Grid(Dashboard) ] | [ Chat ][ Mic ] | [ ✦(My Space) ][ ···(More) ]
```
- ✦ = U+2756 Black Four Pointed Star — My Space button only
- Active states: Dashboard/Chat = dark · Mic/More = coral · ✦ = sky #A8D8F0
- `userInitial` + `userColor` props (currently hardcoded as 'R' + '#A8D8F0' in swipe-world)
- More overlay: Family section (sheets) + Screens section (navigate) + Settings row

### ✅ Wordmark updated (this session)

Previously: DMSerifDisplay_400Regular
Now: **Poppins_800ExtraBold** — matches landing splash (much better)
- Top bar: 36px · ls:-1.5px
- Landing: 56px · ls:-2px
- `a` and `i` always `#A8D8F0` sky — light and dark contexts

### ✅ Dashboard top bar fixed (this session)

Removed SafeAreaView (swipe-world owns it). Now uses `useSafeAreaInsets()` with `paddingTop: insets.top` applied directly to the top bar View. Logo and date now correctly positioned below the notch.

### ✅ Brand pack created (this session)

`zaeli-brand-pack-2026.html` — committed to repo root.
8 tabs: Wordmark · Palette · Typography · Dashboard · Navigation · Channels · Family · Specs · Rules

### ✅ Dashboard — all 5 cards stress tested (previous session)

- Calendar: past events visible/muted/struck, forward-looking headline, full-width button
- Dinner: no duplicate header, 92px day column, tap-expand, full-width button
- Shopping: bright hint, +N visible, always-visible + Add, Open Shopping List → sheet
- Actions: toggle tick, done persist through refresh, inline expand, full-width button
- Zaeli Noticed: sage/violet, count headline, tap → Chat with notice context

### ✅ All Dashboard → Chat context injection wired

Navigation store + useFocusEffect handlers for all types. Quick reply chip intercepts working.

---

## Immediate next steps

### 1. Phase 3b — My Space screen (HIGHEST PRIORITY)

Build `my-space.tsx` as page 2 component inside swipe-world.tsx.
Follow `zaeli-myspace-v4.html` mockup exactly.
Upload `swipe-world.tsx` before starting.

Card order: Health(slate) → Goals(gold) → WotD(sage) → NASA(slate) → Zen(peach) → Notes(lavender) → Wordle(gold)

Start with: Health + Goals + WotD (reuse WotD code from old dashboard.tsx)
Then: NASA, Zen, Notes, Wordle as separate passes

### 2. Phase 5 — Extract ChatPage.tsx + Chat v5

Extract `HomeScreen` function from `index.tsx` into `app/components/ChatPage.tsx`.
Then swipe-world page 1 = `<ChatPage/>` instead of placeholder.
Chat v5: full-width Zaeli messages (no bubble) · two entry states (Fresh vs Card-triggered)

### 3. Phase 6 — AI Zaeli Noticed

Replace 3 hardcoded notices with GPT mini generated ones.
Family-aware, time-sensitive, Zaeli voice. Run on Dashboard load, cache for session.

### 4. Todos sheet

First of the remaining domain sheets to build.

---

## Build priority
```
Phase 1: ZaeliFAB              ✅ 5 buttons, ✦, userColor
Phase 2: Landing overlay       ✅ in swipe-world.tsx
Phase 4: Dashboard Option A    ✅ all 5 cards
Phase 4b: Chat input bar       ✅
Dashboard stress testing       ✅ all 5 cards
Phase 3: swipe-world.tsx       ✅ container built (Chat = placeholder)
Phase 3b: My Space             🔨 NEXT
Phase 5: ChatPage.tsx + v5     🔨 after My Space
Phase 6: Zaeli Noticed (AI)    🔨
Phase 7: Todos sheet           🔨
Phase 8: Kids Hub              🔨
Phase 9: Tutor rebuild         🔨
```

---

## Screen status

| File | Status | Notes |
|---|---|---|
| app/(tabs)/swipe-world.tsx | ✅ Built | 3 pages, FAB, dots, landing — Chat is placeholder |
| app/(tabs)/index.tsx | ✅ Entry point | Re-exports SwipeWorld |
| app/(tabs)/dashboard.tsx | ✅ Complete | All 5 cards, useSafeAreaInsets, Poppins 800 logo |
| app/components/ZaeliFAB.tsx | ✅ Complete | 5 buttons, ✦, userInitial/userColor |
| lib/navigation-store.ts | ✅ Complete | All types wired |
| app/(tabs)/my-space.tsx | 🔨 Phase 3b | Designed, mockup done |
| app/components/ChatPage.tsx | 🔨 Phase 5 | Extract from index.tsx |
| Calendar sheet | ✅ In index.tsx | |
| Shopping sheet | ✅ In index.tsx | Partial test |
| Meals sheet | ✅ In index.tsx | |
| Todos sheet | 🔨 Build | |
| Notes (family) | 🔨 Build | |
| Notes (personal) | 🔨 In my-space.tsx | |
| Travel sheet | 🔨 Build | |
| Tutor | 🔨 Rebuild | Dedicated screen |
| Kids Hub | 🔨 Build | Dedicated screen |
| Our Family | 🔨 Build | Dedicated screen |
| zaeli-brand-pack-2026.html | ✅ Repo root | Full brand reference |

---

## Key decisions locked this session (6 April 2026 — swipe world session)

- **Swipe order locked:** Dashboard(0) → Chat(1) → My Space(2) — Chat in centre makes sense as heart of app
- **swipe-world.tsx built** — horizontal container with all three pages, FAB, dots, landing
- **Chat placeholder** — expo-router prevents importing index.tsx as a component; fix in Phase 5 by extracting ChatPage.tsx
- **Wordmark font changed** — Poppins_800ExtraBold replaces DM Serif Display for the wordmark
- **Logo colours updated** — `a` and `i` now sky blue `#A8D8F0` (previously tried violet, reverted)
- **3rd dot + ✦ star** = `#A8D8F0` sky blue (matches logo accents for visual consistency)
- **FAB expanded to 5 buttons** — added ✦ My Space between Mic and More
- **✦ mark locked** — U+2756 Black Four Pointed Star, FAB navigation only, never decorative
- **userInitial + userColor pattern** — FAB accepts these props; My Space button uses user's colour; easily extensible to all family members at auth
- **More overlay redesigned** — two sections (Family sheets + Screens) + Settings row; full app map
- **dashboard.tsx** — SafeAreaView replaced with useSafeAreaInsets(); logo/date now correctly positioned
- **Brand pack created** — zaeli-brand-pack-2026.html with 8 tabs covering all design decisions

---

**Read CLAUDE.md and ZAELI-PRODUCT.md first. Always upload from the zaeli folder, never Downloads.**
