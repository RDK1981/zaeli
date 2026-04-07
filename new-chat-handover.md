# Zaeli — New Chat Handover
*7 April 2026 — Phase 6 AI Zaeli Noticed ✅ · Weather wttr.in ✅ · Chat fix identified 🔨*
*Copy this entire message to start a new chat.*

---

## Hi! Continuing development of Zaeli.

Zaeli is an iOS-first AI family life platform built in React Native / Expo.
Read **CLAUDE.md** before starting — full stack, architecture, colours, ALL specs.
Then **ZAELI-PRODUCT.md** for product vision, full project plan, and all module decisions.

---

## ══════════════════════════════════
## SCREEN ARCHITECTURE — READ FIRST (LOCKED ✅)
## ══════════════════════════════════

**Three navigable screens:**
```
Dashboard (0)  →  Chat (1)  →  My Space (2)
```
App opens on Dashboard. Swipe right → Chat. Swipe right again → My Space.

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
- **CRITICAL:** Always verify with `Get-Content ... | Select-Object -First 5` before running Expo

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
GPT_MINI        = 'gpt-4o-mini'
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
Weather API     = wttr.in (NOT Open-Meteo — times out in dev client)
```

---

## What's built (7 April 2026)

### ✅ Phase 6 — AI Zaeli Noticed + Weather fix (completed this session)

**dashboard.tsx** — two major additions:

**Zaeli Noticed (AI):**
- GPT mini (`gpt-4o-mini`) generates 2–3 real notices after Supabase data loads
- Prompt feeds: today's events, tomorrow's events, todos, shopping count, weather, meals
- Fires once per session via `noticesGeneratedRef` — never regenerates on 5-min refresh
- Completely independent of card animations — cards appear immediately, notices fill in behind
- Card shows "looking…" while generating · "all quiet." if nothing notable
- Falls back to shopping count notice if API fails
- Each notice tappable → jumps to Chat with notice as context

**Weather:**
- Switched from Open-Meteo (was returning HTML error pages) to wttr.in
- `fetchWeather()` has 8s AbortController timeout — fails fast
- `mapWttrCode()` translates wttr.in weather codes to internal WeatherIcon codes
- Fires independently via `.then()` — never blocks card animations
- Dashboard loads fast (Supabase only), weather pops in behind

### ✅ Phase 3b — My Space (previous session)
All 7 cards built. Health · Goals · WotD · NASA · Zen · Notes · Wordle.
Goals: two-tap flow (inline → 92% sheet per goal).
Notes + Wordle: tap → 92% sheet.
All dummy data — real APIs later.

### ✅ Dashboard — all 5 cards (previous sessions)
Calendar · Dinner · Weather+ZaeliNoticed · Shopping · Actions. Stress tested. All context injection wired.

### ✅ swipe-world.tsx — 3-page container
FAB, dots, landing overlay. Landing stays — Rich likes it.

---

## Immediate next steps

### 1. Fix Chat interface ← HIGHEST PRIORITY

**The problem:** Fresh Chat load shows old splash screen → entry screen → dashboard-style card stack (Calendar, Dinner, Shopping, Actions) inside the chat. This is the old v4 brief/overview system.

**What we want:**
- Chat opens directly, no splash, no card stack
- Fresh load: warm Zaeli greeting message ("Good morning Rich — what's on your mind?")
- Context-triggered: Zaeli already has context from Dashboard tap, keyboard ready
- ALL existing context injection paths stay exactly as they are

**What to remove from index.tsx:**
- `overviewOpen` state + "Today's overview" toggle
- `renderCardStack()` and the card stack render block (lines ~4414–4473, ~4683–4688)
- `generateBrief()` call on fresh load
- Splash/entry screen sequence (redundant — swipe-world owns navigation)

**Before starting:** Upload `index.tsx` from zaeli folder. index.tsx is 6,026 lines — do this as the sole focus of the session.

### 2. Complete Shopping sheet
Half built. Finish the remaining functionality.

### 3. Build Todos sheet
Gold accent. Three tabs: Mine · Family · Reminders.

### 4. Build Notes sheet (family)
Same pattern as Todos. Quick win.

### 5. Build Meals sheet
Needs Spoonacular decision first.

### 6. Build Travel sheet

---

## Full project plan (Phase A → D)

### Phase A — Make it solid
1. ✅ Dashboard AI Zaeli Noticed + weather
2. 🔨 Fix Chat interface
3. 🔨 Complete Shopping sheet
4. 🔨 Todos sheet
5. 🔨 Notes sheet (family)
6. 🔨 Meals sheet
7. 🔨 Travel sheet

### Phase B — Make it testable
8. 🔨 Real authentication (replace DUMMY_FAMILY_ID)
9. 🔨 EAS build + TestFlight
10. 🔨 `LANDING_TEST_MODE = false`
11. 🔨 Kids Hub (+ iPad)
12. 🔨 Tutor rebuild (+ iPad)
13. 🔨 Our Family module
14. 🔨 Basic Settings

### Phase C — Make it launchable
15. 🔨 Zaeli Voice (ElevenLabs)
16. 🔨 Push notifications
17. 🔨 Gmail + Outlook Calendar integration
18. 🔨 Spoonacular integration
19. 🔨 Zaeli Persona review + memory
20. 🔨 Interactive onboarding
21. 🔨 Website + Stripe + web signup
22. 🔨 Admin console updates + billing

### Phase D — Scale
23. 🔨 Live testing with 10 families
24. 🔨 Analytics
25. 🔨 GDPR / data export
26. 🔨 Multi-user real-time sync
27. 🔨 App Store submission
28. 🔨 Offline mode (post-launch)
29. 🔨 Backup / restore

---

## Build priority
```
Phase 1–4b:    ZaeliFAB · Landing · Dashboard · Chat bar    ✅
Phase 3:       swipe-world.tsx container                    ✅
Phase 3b:      My Space — all 7 cards, 4 sheets             ✅
Phase 6:       AI Zaeli Noticed · wttr.in weather           ✅
Chat fix:      Remove card stack · add Zaeli greeting       🔨 NEXT
Shopping:      Complete sheet                               🔨
Phase 7:       Todos sheet                                  🔨
Notes:         Family notes sheet                           🔨
Phase 8–9:     Meals · Travel sheets                        🔨
Phase B:       Auth · EAS · Kids Hub · Tutor · Settings     🔨
Phase C:       Voice · Notifications · Integrations         🔨
Phase D:       Scale · Store · Analytics                    🔨
```

---

## Screen status

| File | Status | Notes |
|---|---|---|
| app/(tabs)/swipe-world.tsx | ✅ Complete | 3 pages, FAB, dots, landing |
| app/(tabs)/index.tsx | ⚠️ Fix needed | Chat shows old card stack on fresh load |
| app/(tabs)/dashboard.tsx | ✅ Complete | AI Noticed, wttr.in weather, all 5 cards |
| app/(tabs)/my-space.tsx | ✅ Complete | All 7 cards, 4 × 92% sheets, dummy data |
| app/components/ZaeliFAB.tsx | ✅ Complete | 5 buttons, ✦, userInitial/userColor |
| lib/navigation-store.ts | ✅ Complete | All types wired |
| Calendar sheet | ✅ In index.tsx | Working |
| Shopping sheet | ⚠️ Partial | In index.tsx, not fully operational |
| Meals sheet | ⚠️ Stub | In index.tsx |
| Todos sheet | 🔨 Build | Not started |
| Notes (family) | 🔨 Build | Not started |
| Travel sheet | 🔨 Build | Not started |
| Tutor | 🔨 Rebuild | Dedicated screen, iPad too |
| Kids Hub | 🔨 Build | Dedicated screen, iPad too |
| Our Family | 🔨 Build | Dedicated screen |
| Settings | 🔨 Build | Dedicated screen |
| zaeli-brand-pack-2026.html | ✅ Repo root | Full brand reference |

---

## Key decisions locked this session (7 April 2026)

- **AI Zaeli Noticed locked** — GPT mini, fires once per session, independent of card animations
- **wttr.in locked** — replacing Open-Meteo permanently. Open-Meteo returns HTML errors in dev client.
- **GPT_MINI corrected** — `gpt-4o-mini` (not `gpt-5.4-mini` which was wrong in old docs)
- **Landing overlay stays** — Rich likes it. `LANDING_TEST_MODE = true` until launch.
- **Chat fix identified** — remove `overviewOpen`, `renderCardStack()`, `generateBrief()`, splash/entry. Add simple Zaeli greeting. Keep all context injection paths.
- **Phase 5 ChatPage extraction deprioritised** — require cycle is a warning not an error, app works fine. Fix Chat interface first, extraction later.
- **Full project plan agreed** — Phase A (solid) → B (testable) → C (launchable) → D (scale). See ZAELI-PRODUCT.md for full list.
- **Missing items identified** — Notes sheet (family), EAS build, real auth, Stripe/web signup were missing from original roadmap. Now added.

---

**Read CLAUDE.md and ZAELI-PRODUCT.md first. Always upload from the zaeli folder, never Downloads. Always delete before copying.**
