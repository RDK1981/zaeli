# Zaeli — New Chat Handover
*6 April 2026 — Dashboard stress testing COMPLETE ✅ All 5 cards working ✅*
*Copy this entire message to start a new chat.*

---

## Hi! Continuing development of Zaeli.

Zaeli is an iOS-first AI family life platform built in React Native / Expo.
Please read **CLAUDE.md** before we start — full stack, architecture, colours, ALL specs.
Then **ZAELI-PRODUCT.md** for product vision and all module decisions.

---

## ══════════════════════════════════
## SCREEN ARCHITECTURE — READ THIS FIRST (LOCKED ✅)
## ══════════════════════════════════

**Three navigable screens (swipe world):**
```
My Space  ←  Dashboard  →  Chat
```

**Pulse as dedicated screen = SCRAPPED. My Space replaces it.**
**Zen = content card inside My Space, NOT a dedicated screen.**
**WotD = moved from Dashboard to My Space.**

**92% SHEETS over Chat (never router.navigate()):**
Calendar · Shopping · Meal Planner · Todos / Reminders · Notes · Travel

**Dedicated full screens (router.navigate() ok):**
Tutor · Kids Hub · Our Family · Settings

---

## How I like to work
- **Beginner developer** — always full file rewrites, never partial diffs
- **Two fixes at a time** — bulk changes = too many variables
- One PowerShell command at a time, never chained with &&
- Plain English before code · Design before code
- **CRITICAL:** Always upload files from `C:\Users\richa\zaeli\app\(tabs)\` — NEVER from Downloads. Stale downloads lose all previous session edits and cause regressions.

---

## Who I am
- Richard. **Logged-in user = Rich**
- Family: Rich, Anna, Poppy (Yr6, 12, girl), Gab (Yr4, 10, BOY — Gabriel, he/him), Duke (Yr1, 8, boy)
- Local path: `C:\Users\richa\zaeli` (Windows, PowerShell)
- Screen copy: `Copy-Item "C:\Users\richa\Downloads\file.tsx" "C:\Users\richa\zaeli\app\`(tabs`)\file.tsx"`
- Component copy: `Copy-Item "C:\Users\richa\Downloads\ZaeliFAB.tsx" "C:\Users\richa\zaeli\app\components\ZaeliFAB.tsx"`
- Repo: https://github.com/RDK1981/zaeli (private)

---

## Key constants (CRITICAL)
```
DUMMY_FAMILY_ID = '00000000-0000-0000-0000-000000000001'
SONNET          = 'claude-sonnet-4-20250514'
GPT_MINI        = 'gpt-5.4-mini'
OPENAI env var  = EXPO_PUBLIC_OPENAI_API_KEY  ← exact name, both files
Send button     = #FF4545 coral ALWAYS
Body bg         = #FAF8F5 warm white always
KAV must have backgroundColor:'#fff'
always await supabase inserts
expo-file-system: 'expo-file-system/legacy'
NEVER toISOString() · NEVER +10:00
router.navigate() only for dedicated screens
ZaeliFAB = forwardRef — import ZaeliFABHandle alongside default import
FAB hides when activeButton === 'keyboard' · restores on blur only
LANDING_TEST_MODE = true — set false before launch
Dashboard card order: Calendar → Dinner → Weather+ZaeliNoticed → Shopping → Actions
WotD NOT on Dashboard — lives in My Space
My Space card order: Health → Goals → WotD → NASA → Zen → Notes → Wordle
Delete = optimistic UI first, Supabase background
Todos: fetch IN ['active','done'] — NEVER eq('status','active') alone
Tick handler: TOGGLE — done→active, active→done. Never one-directional.
Card bottom buttons: full-width, borderRadius:14, paddingVertical:14, Poppins_700Bold 15px
Nav store types: edit_event · add_event · shopping · shopping_sheet · actions · meals · noticed
Chip intercepts in handleQuickReply: 'Open Meal Planner' · 'Open Shopping List' · 'Open To-dos'
SafeAreaView: swipe-world.tsx ONLY — not in individual page files
```

---

## What's built (6 April 2026)

### ✅ Dashboard — ALL 5 CARDS STRESS TESTED

**Calendar card:**
- Past events stay visible — muted 45% opacity, struck-through, still tappable
- Headline forward-looking — counts upcoming only, "All clear for afternoon/evening" when done
- `showCalTomorrow` flips only after 8pm OR zero events today
- Tap row → inline expand: Edit/Reschedule with Zaeli · Delete (two-tap)
- Full-width "View Full Calendar →" button

**Dinner card:**
- No duplicate header in expanded state
- Day column 92px — "Tomorrow" never wraps
- Tap day → inline expand: Edit with Zaeli · Delete · Move · More options
- Empty day → "✦ Plan [day] with Zaeli" (full width)
- Full-width "Open Meal Planner →" button
- Context: `meals` type with meal + dateKey + dayAbbr

**Shopping card:**
- "Tap to see →" bright: `rgba(255,255,255,0.70)`
- "+N more": 17px Poppins_600SemiBold, visible
- "+ Add" always visible in header
- Full-width "Open Shopping List →" → opens sheet directly
- Context: `shopping` → chat, `shopping_sheet` → sheet direct

**Actions card:**
- Todos fetched: `in('status',['active','done'])` — done items persist through refresh
- Checkbox TOGGLES — tapping done item restores to active
- Done sorted below active, muted, struck through
- Tap row → inline expand: Edit with Zaeli · Delete · More options
- Full-width "Open All To-dos and Reminders →" button
- Context: `actions` with todo as event (title-specific) or general

**Zaeli Noticed card (replaces WotD):**
- Same `#E8F4E8` sage / `#6B35D9` violet palette
- "ZAELI NOTICED" label 13px · count headline ("three things.") · tag summary 13px
- Expanded: notice rows 14px, coloured dot, tap → Chat with notice
- Currently hardcoded (Poppy assignment, weather/soccer, shopping count)
- Phase 6: GPT mini generated

### ✅ All Dashboard → Chat context injection wired (index.tsx)

Every card tap navigates to Chat with the right Zaeli message and chips:
- Calendar edit → inline card + "What would you like to change?" + chips
- Calendar add → "What's the event?"
- Dinner edit → "[Meal] is on for [Tonight] — what would you like to do with it?"
- Dinner plan empty → "[Tomorrow] is wide open — what are you thinking?"
- Shopping add → "What needs to go on the list?"
- Shopping open → sheet opens directly, no chat message
- Todo edit → "[Todo title] · due [date] — what would you like to do?"
- Todo add → "What needs to go on the list?"
- Noticed tap → surfaces that notice as Zaeli's opening

### ✅ Quick reply chip intercepts (handleQuickReply)
- "Open Meal Planner" → router.navigate mealplanner
- "Open Shopping List" → setShopSheetOpen(true)
- "Open To-dos" → router.navigate todos

### ✅ ZaeliFAB, Chat input bar, Landing overlay — unchanged, working

---

## Immediate next steps

### 1. Phase 3 — swipe-world.tsx container (HIGHEST PRIORITY)
Upload: `index.tsx`, `dashboard.tsx`, `ZaeliFAB.tsx`, `_layout.tsx`

New container file owns:
- Horizontal ScrollView (pagingEnabled) — 3 pages
- Page 0: My Space · Page 1: Dashboard · Page 2: Chat
- SafeAreaView (one place only)
- ZaeliFAB (renders once, above scroll)
- Landing overlay (above all three screens)
- 3-dot indicator (active = coral pill)
- `activePage` state — drives FAB + chat bar visibility
- App opens on page 1 (Dashboard) via scrollTo on mount

Build steps:
1. Create swipe-world.tsx with 3 placeholder pages + dots + FAB
2. Wire FAB buttons → scrollTo instead of router.navigate()
3. Remove FAB, SafeAreaView, landing overlay from index.tsx and dashboard.tsx
4. Register swipe-world.tsx as app entry in _layout.tsx
5. Wire Dashboard card taps → scrollTo(2) then open sheet

### 2. Phase 3b — My Space screen
Build `my-space.tsx` as page 0 component in swipe-world.tsx.
Follow zaeli-myspace-v4.html mockup exactly.
Start: Health + Goals + WotD (reuse WotD code from old dashboard.tsx).
Then: NASA, Zen, Notes, Wordle as separate passes.

### 3. Phase 6 — AI Zaeli Noticed
Replace hardcoded notices with GPT mini generated ones.
Family-aware, time-sensitive, Zaeli voice.
Runs on Dashboard load, cached for the session.

### 4. Phase 5 — Chat v5
Full-width Zaeli messages (no bubble). Two entry states (Fresh vs Card-triggered).

---

## Build priority
```
Phase 1: ZaeliFAB              ✅ COMPLETE
Phase 2: Landing overlay       ✅ COMPLETE
Phase 4: Dashboard Option A    ✅ COMPLETE
Phase 4b: Chat input bar       ✅ COMPLETE
Dashboard stress testing       ✅ COMPLETE — all 5 cards
Phase 3: swipe-world.tsx       🔨 NEXT
Phase 3b: My Space             🔨 after container
Phase 5: Chat v5               🔨
Phase 6: Zaeli Noticed (AI)    🔨
Phase 7: Todos sheet           🔨
Phase 8: Kids Hub              🔨
Phase 9: Tutor rebuild         🔨
```

---

## Screen status

| File | Status | Notes |
|---|---|---|
| components/ZaeliFAB.tsx | ✅ Complete | forwardRef, startMic |
| index.tsx | ✅ Complete | all context handlers, chip intercepts |
| dashboard.tsx | ✅ Complete | all 5 cards stress tested |
| lib/navigation-store.ts | ✅ Complete | all types wired |
| settings.tsx | ✅ Stub | |
| swipe-world.tsx | 🔨 Phase 3 | New container |
| my-space.tsx | 🔨 Phase 3b | Designed, mockup done |
| Calendar sheet | ✅ In index.tsx | |
| Shopping sheet | ✅ In index.tsx | Partial test |
| Meals sheet | ✅ In index.tsx | |
| Todos sheet | 🔨 Build in Chat | |
| Notes (family) | 🔨 Build in Chat | |
| Notes (personal) | 🔨 Build in My Space | |
| Travel sheet | 🔨 Build in Chat | |
| Tutor | 🔨 Rebuild | Dedicated screen |
| Kids Hub | 🔨 Build | Dedicated screen |
| Our Family | 🔨 Build | Dedicated screen |

---

## Key decisions locked this session (6 April 2026 — stress testing session)

- **Dashboard stress testing complete** — all 5 cards fully tested and working
- **Past calendar events** stay visible, muted/struck through, never disappear mid-session
- **Calendar headline** is forward-looking — counts upcoming, time-aware "All clear" phrasing
- **Dinner card** — no duplicate header, 92px day column, full tap-expand, full-width button
- **Shopping "+ Add"** always visible in header (not just when expanded)
- **Shopping "Open Shopping List"** opens sheet directly, bypasses chat entirely
- **Todos toggle tick** — ticking a done item restores it to active (bidirectional)
- **Todos persist done state** — fetched with `in('status',['active','done'])`, survive 5-min refresh
- **All cards have full-width bottom buttons** — consistent design language
- **Zaeli Noticed card** built — same sage/violet palette as old WotD, hardcoded Phase 1
- **All Chat context injection wired** — every card tap gives Zaeli the right opening
- **Chip intercepts** — Open Meal Planner / Shopping List / To-dos navigate instead of chat
- **WotD removed from Dashboard** — lives in My Space only
- **Upload discipline** — always upload from zaeli folder not Downloads to prevent regressions

---

**Read CLAUDE.md and ZAELI-PRODUCT.md first. Always upload current files from the zaeli folder.**
