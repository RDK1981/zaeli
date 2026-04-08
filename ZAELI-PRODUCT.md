# ZAELI-PRODUCT.md — Product Vision & Decisions
*Last updated: 8 April 2026 (evening) — Session 4 ✅ · Dashboard↔Chat context flow · Full CRUD tools · Mic waveform · Chat UI refined*

---

## What Zaeli Is

Zaeli is an iOS-first AI family life platform for Australian families with children. A switched-on family assistant that knows your family's life — through conversation, not data entry.

**Tagline:** Less chaos. More family.

---

## Zaeli's Voice (LOCKED)

Sharp, warm, genuinely enthusiastic about this family. Finds the funny angle through delight, not detachment. Energy matches the moment: get-up-and-go in the morning, calm and settled at night.

**Hard rules:** Never 'mate'. Never starts with 'I'. Plain text only. Always ends on a confident offer.
**Banned:** 'queued up', 'sorted', 'tidy', 'chaos', 'ambush', 'sprint', 'locked in', 'breathing room', 'quick wins', 'you've got this', 'make it count'.

---

## Target Market

Australian families with children. Priority: dual-income metro couples with primary school-aged kids.
**Revenue:** A$14.99/month family · A$9.99/child/month Tutor · 100% web sales.

---

## ══════════════════════════════════
## V5 INTERFACE PHILOSOPHY (LOCKED ✅)
## ══════════════════════════════════

**Three screens. One FAB. No clutter.**

```
Dashboard (0)  →  Chat (1)  →  My Space (2)
```

**Core UX principle:** Dashboard = read. Chat = do. My Space = me. 90% of activity stays in Chat.

### What's complete in v5
- ✅ ZaeliFAB — 5 buttons, ✦ My Space, forwardRef mic, user colour
- ✅ Landing overlay — in swipe-world.tsx, user likes it, stays
- ✅ swipe-world.tsx — horizontal container, dots, FAB, landing
- ✅ Dashboard Option A — all 5 cards stress tested
- ✅ AI Zaeli Noticed — GPT mini, wttr.in weather, fires independently
- ✅ All Dashboard → Chat context injection wired
- ✅ Wordmark updated — Poppins_800ExtraBold, sky blue a+i
- ✅ Brand pack — zaeli-brand-pack-2026.html
- ✅ My Space — Phase 3b complete, all 7 cards, 4 sheets

- ✅ Chat v5 — splash removed, fixed input bar, send via onTouchStart
- ✅ Dashboard↔Chat context flow — isActive prop, auto-refresh on swipe back
- ✅ Full CRUD tools — calendar, todos, shopping, meals (add/update/delete via chat)
- ✅ Meal clash detection — warns user before swapping existing meals
- ✅ Chat mic + waveform — direct recording with floating pill (matches FAB design)
- ✅ FAB mic → chat pipeline — transcript passes via pendingMicText prop
- ✅ Chat UI refined — solid white bar, full width, scroll arrows, keyboard gap
- ✅ Our Family screen — dedicated, 4 sub-views, dummy data
- ✅ Kids Hub screen — dedicated, jobs/rewards/games/leaderboard

### In progress / next
- 🔨 Design changes across all 3 pages (next session)
- 🔨 Todos sheet
- 🔨 Complete Shopping sheet

---

## ══════════════════════════════════
## SCREEN ARCHITECTURE (LOCKED ✅)
## ══════════════════════════════════

**Three navigable screens:**
```
Dashboard (0)  →  Chat (1)  →  My Space (2)
```

**92% SHEETS over Chat:**
Calendar · Shopping · Meal Planner · Todos / Reminders · Notes · Travel

**Dedicated full screens:**
Tutor · Kids Hub · Our Family · Settings

---

## ══════════════════════════════════
## WORDMARK & BRAND IDENTITY (LOCKED ✅)
## ══════════════════════════════════

**The wordmark:** `zaeli` — Poppins_800ExtraBold, `a` and `i` in sky blue `#A8D8F0`.
**Brand pack:** `zaeli-brand-pack-2026.html` — committed to repo root.

---

## ══════════════════════════════════
## LANDING PAGE (LOCKED ✅ — keep as-is)
## ══════════════════════════════════

Lives in `swipe-world.tsx`. Rich likes it — stays.
Dark overlay · wordmark in white + sky · tap anywhere to dismiss.
`LANDING_TEST_MODE = true` — set false before launch.
Time windows: Morning 6–9am · Midday 12–2pm · Evening 5–8pm

---

## ══════════════════════════════════
## DASHBOARD (✅ COMPLETE)
## ══════════════════════════════════

**Card order (FIXED):**
1. Calendar — `#3A3D4A` slate
2. Dinner — `#FAC8A8` peach
3. Weather `#A8D8F0` + Zaeli Noticed `#E8F4E8` — side by side
4. Shopping — `#D8CCFF` lavender
5. Actions — `#F0DC80` gold

**Zaeli Noticed (AI — Phase 6 ✅):**
- GPT mini (`gpt-4o-mini`) generates 2–3 notices after data loads
- Fires once per session, completely independent — never blocks card animations
- Family-aware, time-sensitive, Zaeli voice, max 12 words each
- Falls back to shopping count notice if API fails
- Shows "looking…" while generating, "all quiet." if nothing notable

**Weather (wttr.in ✅):**
- Switched from Open-Meteo (was timing out) to wttr.in
- 8s AbortController timeout
- Fires independently — never blocks cards
- `mapWttrCode()` translates wttr.in codes to internal WeatherIcon codes

---

## ══════════════════════════════════
## MY SPACE (✅ Phase 3b complete)
## ══════════════════════════════════

Rich's personal world. All 7 cards built, all dummy data.

| Card | Colour | Interaction | Future data source |
|------|--------|-------------|-------------------|
| Health | slate | Inline expand | HealthKit |
| Goals | gold | Inline → 92% sheet per goal | Supabase `goals` table |
| Word of the Day | sage | Inline expand + SVG play | Rotating word list (already in dashboard.tsx) |
| NASA APOD | slate | Inline expand | NASA APOD API |
| Zen | peach | Inline expand + SVG play/pause | expo-audio |
| Notes | lavender | → 92% sheet | Supabase `personal_notes` |
| Wordle | gold | → 92% sheet, grid + keyboard | Game logic |

---

## ══════════════════════════════════
## CHAT — FULLY WORKING ✅ (sessions 3+4)
## ══════════════════════════════════

**Resolved:** Chat opens directly (no splash/cards), fixed input bar, context flow working, full CRUD tools.

**What works:**
- Chat opens directly with Zaeli greeting — no splash, no card stack
- Dashboard card taps → context flows to chat via isActive + getPendingChatContext()
- Full CRUD from chat: calendar, todos, shopping, meals (add/update/delete)
- Meal planner clash detection — warns before swapping
- Mic recording with waveform overlay (matches FAB design)
- FAB mic from dashboard/myspace → transcript passes to chat
- Thinking dots appear immediately (before Whisper transcription for voice)
- Scroll arrows (UP/DOWN) floating above bar
- Dashboard refreshes card data when swiping back from chat

**Tool list (all save to Supabase):**
add_calendar_event · update_calendar_event · delete_calendar_event
add_todo · update_todo · delete_todo
add_shopping_item · update_shopping_item · delete_shopping_item
add_meal · update_meal · delete_meal

---

## ══════════════════════════════════
## FULL PROJECT PLAN (7 April 2026)
## ══════════════════════════════════

### Phase A — Make it solid (do now)
1. ✅ Fix Dashboard load speed + Zaeli Noticed AI
2. ✅ Fix weather (wttr.in)
3. ✅ Fix Chat interface — context flow, CRUD tools, mic, UI (sessions 3+4)
4. 🔨 Complete Shopping sheet — half done, finish it
5. 🔨 Build Todos sheet — three tabs (Mine · Family · Reminders), gold accent
6. 🔨 Build Notes sheet (family) — quick win, similar pattern to Todos
7. 🔨 Build Meals sheet — needs Spoonacular decision first
8. 🔨 Build Travel sheet

### Phase B — Make it testable
9. 🔨 Real authentication (replace DUMMY_FAMILY_ID)
10. 🔨 EAS build + TestFlight (prerequisite for any external testing)
11. 🔨 `LANDING_TEST_MODE = false`
12. 🔨 Kids Hub — dedicated screen, build on iPad also
13. 🔨 Tutor rebuild — dedicated screen, build on iPad also
14. 🔨 Our Family module
15. 🔨 Basic Settings (account, family members, subscription status)

### Phase C — Make it launchable
16. 🔨 Zaeli Voice (ElevenLabs)
17. 🔨 Push notifications
18. 🔨 Gmail + Outlook Calendar integration
19. 🔨 Spoonacular integration (meals data)
20. 🔨 Zaeli Persona review + memory
21. 🔨 Interactive onboarding module
22. 🔨 Website + Stripe + web signup flow
23. 🔨 Admin console updates + billing

### Phase D — Scale
24. 🔨 Live testing with 10 families (needs EAS + auth + Stripe first)
25. 🔨 Analytics (spending trends, meal variety, task completion)
26. 🔨 Data export / GDPR compliance (Australian privacy law)
27. 🔨 Multi-user real-time sync
28. 🔨 App Store submission (TestFlight → review → compliance)
29. 🔨 Offline mode (post-launch, read-only)
30. 🔨 Backup / restore (Supabase handles most automatically)

### Items not yet on roadmap (identified 7 April)
- Notes sheet (family) — not previously listed, needed before testing
- EAS build — prerequisite for Phase B, wasn't explicitly listed
- Real auth — prerequisite for Phase B, wasn't explicitly listed
- Stripe + web signup — needed before any paying users
- `LANDING_TEST_MODE = false` — small but critical pre-launch step
- Phase 5 ChatPage.tsx extraction — deprioritised (require cycle is a warning not an error, app works fine)

---

## Pre-Launch Checklist

- [x] v5 architecture locked ✅
- [x] ZaeliFAB — 5 buttons, ✦, userColor ✅
- [x] Landing overlay ✅
- [x] Dashboard Option A — all 5 cards ✅
- [x] Dashboard stress testing ✅
- [x] All Dashboard → Chat context injection ✅
- [x] swipe-world.tsx container ✅
- [x] Wordmark updated ✅
- [x] Brand pack ✅
- [x] My Space — all 7 cards, 4 sheets ✅
- [x] AI Zaeli Noticed (GPT mini) ✅
- [x] Weather switched to wttr.in ✅
- [x] Fix Chat interface — context flow, CRUD tools, mic, UI ✅
- [ ] Complete Shopping sheet
- [ ] Todos sheet
- [ ] Notes sheet (family)
- [ ] Meals sheet
- [ ] Travel sheet
- [ ] Real authentication
- [ ] EAS build · TestFlight
- [ ] `LANDING_TEST_MODE = false`
- [ ] Kids Hub (+ iPad)
- [ ] Tutor rebuild (+ iPad)
- [ ] Our Family
- [ ] Settings
- [ ] Zaeli Voice (ElevenLabs)
- [ ] Push notifications
- [ ] Gmail + Outlook Calendar integration
- [ ] Spoonacular integration
- [ ] Zaeli Persona review + memory
- [ ] Interactive onboarding
- [ ] Website + Stripe + web signup
- [ ] Admin console updates + billing
- [ ] HealthKit (My Space Health card)
- [ ] NASA APOD (My Space NASA card)
- [ ] WotD rotating word list (My Space)
- [ ] expo-audio for Zen card
- [ ] Supabase `goals` table
- [ ] Supabase `personal_notes` table
- [ ] Wordle game logic
- [ ] Live testing with 10 families
- [ ] Analytics
- [ ] GDPR / data export
- [ ] Multi-user sync
- [ ] App Store submission
- [ ] Offline mode (post-launch)

---

## Key Product Moments

**The landing** — Dark overlay, wordmark, tap to continue. Earns its moment 3x/day.
**The dashboard** — One sentence per card. Tap to reveal. Editorial, not widget-like.
**Zaeli noticed** — "Poppy's assignment is due tomorrow." Zaeli knew before you asked.
**My Space** — Rich's world. Steps, goals, word, astronomy, calm, notes, Wordle. One swipe right.
**Dashboard → Chat** — Tap a card, Zaeli has context, keyboard ready. Seamless.
**The sheet** — Slides up over Chat. Data without leaving the conversation.
**The all-done moment** — Everything handled. "Enjoy the evening."
