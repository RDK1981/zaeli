# Zaeli — New Chat Handover
*7 April 2026 — My Space Phase 3b complete ✅*
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
- **CRITICAL:** Always `Remove-Item` old file before `Copy-Item` new one
- **CRITICAL:** Always verify file with `Get-Content ... | Select-Object -First 5` before running Expo

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
92% sheets      = height: H * 0.92 (NOT maxHeight) · borderTopRadius:24
IcoPlay SVG     = Polygon points="5 3 19 12 5 21 5 3" · 15×15 · stroke · strokeWidth 2
IcoPause SVG    = two Lines · 15×15 · stroke · strokeWidth 2.5
```

---

## What's built (7 April 2026)

### ✅ Phase 3b — My Space (completed this session)

**`app/(tabs)/my-space.tsx`** — all 7 cards built and working on device.

| Card | Colour | Interaction |
|------|--------|-------------|
| Health | slate | Inline expand — steps, bar, distance, calories, workouts |
| Goals | gold | Tap 1 = inline (3 goals + progress) · Tap goal = 92% sheet · + Add = 92% sheet |
| Word of the Day | sage | Inline expand — def, example, SVG play button (violet) |
| NASA APOD | slate | Inline expand — star placeholder, description, link |
| Zen | peach | Inline expand — 4 tracks with SVG play/pause icons |
| Notes | lavender | Tap → 92% sheet — note list + new note button |
| Wordle | gold | Tap → 92% sheet — full 6×5 grid + coloured keyboard |

**All data is hardcoded dummy data** — real APIs wired in later phases.
**Card sizing matches dashboard exactly:** borderRadius:22, padding:22, headlines 24px, body 17px, meta 13px.
**92% sheets:** `height: H * 0.92` — true height, not maxHeight.

### ✅ Phase 3 — swipe-world.tsx (previous session)
3-page horizontal container. FAB, dots, landing all owned here. Chat workaround: `HomeScreen` named export from `index.tsx` (require cycle warning — fix in Phase 5).

### ✅ ZaeliFAB — 5 buttons (previous session)
Dashboard · Chat · Mic · ✦ My Space · ··· More

### ✅ Dashboard — all 5 cards stress tested (previous session)
Calendar · Dinner · Weather+ZaeliNoticed · Shopping · Actions. All context injection wired.

### ✅ Wordmark + Brand pack (previous session)
Poppins_800ExtraBold, a+i = sky #A8D8F0. Brand pack at repo root.

---

## Immediate next steps

### 1. Phase 5 — Extract ChatPage.tsx + Chat v5 ← HIGHEST PRIORITY

Extract `HomeScreen` function from `index.tsx` into `app/components/ChatPage.tsx`.
Then swipe-world page 1 = `<ChatPage/>` — eliminates the require cycle warning.
**Before starting:** upload `index.tsx` and `swipe-world.tsx` from the zaeli folder.

Chat v5 goals:
- Full-width Zaeli messages (no bubble)
- Two entry states: Fresh (no context) vs Card-triggered (with context from nav store)
- `isEmbedded={true}` suppresses internal FAB (swipe-world owns it)

### 2. Phase 6 — AI Zaeli Noticed
Replace 3 hardcoded notices with GPT mini generated ones.
Family-aware, time-sensitive, Zaeli voice. Run on Dashboard load, cache for session.

### 3. Todos sheet
First of the remaining domain sheets. Gold accent. Three tabs: Mine · Family · Reminders.

---

## Build priority
```
Phase 1: ZaeliFAB              ✅
Phase 2: Landing overlay       ✅
Phase 4: Dashboard Option A    ✅ all 5 cards stress tested
Phase 4b: Chat input bar       ✅
Phase 3: swipe-world.tsx       ✅ container
Phase 3b: My Space             ✅ all 7 cards, 4 sheets
Phase 5: ChatPage.tsx + v5     🔨 NEXT
Phase 6: Zaeli Noticed (AI)    🔨
Phase 7: Todos sheet           🔨
Phase 8: Kids Hub              🔨
Phase 9: Tutor rebuild         🔨
```

---

## Screen status

| File | Status | Notes |
|---|---|---|
| app/(tabs)/swipe-world.tsx | ✅ Complete | 3 pages, FAB, dots, landing |
| app/(tabs)/index.tsx | ✅ Entry point | Re-exports SwipeWorld + named HomeScreen export |
| app/(tabs)/dashboard.tsx | ✅ Complete | All 5 cards, useSafeAreaInsets, Poppins 800 logo |
| app/(tabs)/my-space.tsx | ✅ Complete | All 7 cards, 4 × 92% sheets, dummy data |
| app/components/ZaeliFAB.tsx | ✅ Complete | 5 buttons, ✦, userInitial/userColor |
| lib/navigation-store.ts | ✅ Complete | All types wired |
| app/components/ChatPage.tsx | 🔨 Phase 5 | Extract from index.tsx |
| Calendar sheet | ✅ In index.tsx | |
| Shopping sheet | ✅ In index.tsx | |
| Meals sheet | ✅ In index.tsx | |
| Todos sheet | 🔨 Build | |
| Notes (family) | 🔨 Build | |
| Travel sheet | 🔨 Build | |
| Tutor | 🔨 Rebuild | Dedicated screen |
| Kids Hub | 🔨 Build | Dedicated screen |
| Our Family | 🔨 Build | Dedicated screen |
| zaeli-brand-pack-2026.html | ✅ Repo root | |

---

## Key decisions locked this session (7 April 2026 — My Space session)

- **My Space Phase 3b complete** — all 7 cards built and working on device
- **Goals two-tap flow locked** — tap card = inline expand, tap goal row = 92% detail sheet, + Add = 92% new goal sheet
- **Notes straight to 92% sheet** — no inline preview, direct to list
- **Wordle and Notes = 92% sheets** — Wordle needs full screen width for grid + keyboard
- **SVG play icons** — IcoPlay (Polygon) and IcoPause (two Lines) sourced from index.tsx, used in WotD and Zen
- **92% sheets = `height: H * 0.92`** — locked platform standard, never maxHeight
- **Card sizing locked to dashboard** — borderRadius:22, padding:22, headlines 24px, body 17px, meta 13px
- **File copy lesson** — always Remove-Item then Copy-Item, always verify with Get-Content before running Expo. Stale files won't update without explicit delete first.

---

**Read CLAUDE.md and ZAELI-PRODUCT.md first. Always upload from the zaeli folder, never Downloads. Always delete before copying.**
