# ZAELI-PRODUCT.md — Product Vision & Decisions
*Last updated: 10 April 2026 (evening) — Sessions 7+8 ✅ · All My Space sheets · Wordle · Calendar/Shopping sheets fixed · Navigation unified*

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

### What's complete
- ✅ ZaeliFAB — 5 buttons, ✦ My Space, forwardRef mic, user colour
- ✅ Landing overlay — in swipe-world.tsx, user likes it, stays
- ✅ swipe-world.tsx — horizontal container, dots, FAB, landing
- ✅ Dashboard — all cards, peach brand, Zaeli brief, Zaeli Noticed AI
- ✅ AI Zaeli Noticed — GPT mini, wttr.in weather, fires independently
- ✅ All Dashboard → Chat context injection wired
- ✅ Wordmark updated — Poppins_800ExtraBold, sky blue a+i
- ✅ Brand pack — zaeli-brand-pack-2026.html
- ✅ My Space — Phase 3b complete, all 7 cards, shell sheets
- ✅ Chat v5 — splash removed, fixed input bar, send via onTouchStart
- ✅ Dashboard↔Chat context flow — isActive prop, auto-refresh on swipe back
- ✅ Full CRUD tools — calendar, todos, shopping, meals (add/update/delete via chat)
- ✅ Meal clash detection — warns user before swapping existing meals
- ✅ Chat mic + waveform — direct recording with floating pill
- ✅ FAB mic → chat pipeline — transcript passes via pendingMicText prop
- ✅ Design refresh — peach dashboard, lavender chat, My Space 6-card grid, briefs on all pages
- ✅ **Session 6 — Design architecture session:**
  - Dashboard card order revised and locked
  - "Todos" renamed "Family Tasks" everywhere
  - My Space Budget card removed
  - Goals promoted to full width in My Space
  - "Notes" renamed "Notes & Tasks" — dual tab sheet designed
  - Our Budget module — full design complete (9 screen states, Claude Code spec)
  - What If mode — sandbox income scenario modelling designed
  - Naming conventions locked: Family Tasks · Notes & Tasks · Our Budget · Tasks

### Session 7 (10 April 2026) — all My Space sheets built:
- ✅ Dashboard polish — text sizes, card labels 13px, tap hints 15px, Budget peach, Noticed "changes"
- ✅ My Space polish — Fitness full-width, Goals inline, text consistency
- ✅ Notes sheet — full editor, share toggle, send, lock/share icons, Supabase
- ✅ Tasks tab — dual-tab Notes & Tasks, due date pills, checkboxes, Supabase
- ✅ Goals module — 6 types, 5-step wizard, type-specific logging, milestones, Supabase
- ✅ Fitness sheet — SVG progress ring, 3 metric pills, weekly bar chart, workouts, goal editor
- ✅ Stretch sheet — duration + instructor picker, 6 verified YouTube videos, movements, mark done
- ✅ Zen sheet — 4 mood tabs (amber/blue/green/purple), 12 sessions, hero with time-of-day, YouTube
- ✅ Wordle — full playable game, 2309 words, date-seeded, Zaeli colour tiles, family leaderboard, Supabase

### Session 8 (10 April 2026 evening):
- ✅ Calendar sheet — collapsible cards, manual add stays in sheet, end time auto-fill, text sizes
- ✅ Shopping sheet — crash fix, data loading fix, text size increase
- ✅ Navigation unified — all router.navigate to dedicated pages removed, everything uses sheets/context
- ✅ FAB More menu — Calendar + Shopping open sheets directly
- ✅ Whisper "Zaeli" spelling correction
- ✅ Meal/calendar clash awareness
- ✅ Wordle — expanded word list (12,966), clean share format, bigger delete key

### Next priorities
- 🔨 Test shopping sheet (items loading, add, check off, pantry)
- 🔨 Meal Planner sheet (new build — 92% sheet over chat)
- 🔨 Our Budget module (zaeli-budget-final.html — dedicated screen, big build)
- 🔨 Dedicated pages (Kids Hub, Tutor, Our Family, Settings)
- 🔨 EAS Build + HealthKit + embedded YouTube player
- 🔨 Dashboard sheets (Family Tasks, Shopping, Calendar, Meals)

---

## ══════════════════════════════════
## SCREEN ARCHITECTURE (LOCKED ✅)
## ══════════════════════════════════

**Three navigable screens:**
```
Dashboard (0)  →  Chat (1)  →  My Space (2)
```

**92% SHEETS over Chat:**
Calendar · Shopping · Meal Planner · Family Tasks · Notes & Tasks · Travel

**Dedicated full screens:**
Tutor · Kids Hub · Our Family · Settings · **Our Budget** (new)

---

## ══════════════════════════════════
## DASHBOARD — CARD ORDER (LOCKED Session 6 ✅)
## ══════════════════════════════════

1. Calendar — slate `#3A3D4A` · full width
2. Dinner/Meals — mint `#B8EDD0` · full width
3. **2-col bento:** Weather + Our Budget (`#ECFDF5` emerald card)
4. Shopping — lavender `#D8CCFF` · full width
5. **2-col bento:** Zaeli Noticed (sage) + Family Tasks (gold `#F0DC80`)

**Removed from previous design:** Todos as full-width card at bottom
**Added:** Our Budget summary tile next to Weather

---

## ══════════════════════════════════
## MY SPACE — CARD ORDER (LOCKED Session 6 ✅)
## ══════════════════════════════════

1. Zaeli brief + quote (dark slate)
2. Word of the Day (sage — inline expand only)
3. **Goals — FULL WIDTH** (gold — promoted from 2-col)
4. **2-col:** Fitness (slate) + Notes & Tasks (peach)
5. **2-col:** Daily Stretch (sage) + Zen (light blue)
6. Wordle — full width (lavender)

**Removed:** Budget card (Budget lives only in Our Budget module)
**Renamed:** Notes → Notes & Tasks (count shows `3 · 4` format)

---

## ══════════════════════════════════
## WORDMARK & BRAND IDENTITY (LOCKED ✅)
## ══════════════════════════════════

**The wordmark:** `zaeli` — Poppins_800ExtraBold
**Per-screen tints:**
- Dashboard: 'a' + 'i' = peach `#FAC8A8`
- Chat: 'a' + 'i' = lavender `#C4B4FF`
- My Space: 'a' + 'i' = sky blue `#A8D8F0`
- Our Budget: 'a' + 'i' = emerald `#059669` (new)

---

## ══════════════════════════════════
## LANDING PAGE (LOCKED ✅ — keep as-is)
## ══════════════════════════════════

Lives in `swipe-world.tsx`. Rich likes it — stays.
`LANDING_TEST_MODE = true` — set false before launch.

---

## ══════════════════════════════════
## OUR BUDGET MODULE (Design complete — Session 6)
## ══════════════════════════════════

**The most compelling daily-use module after Calendar.** Designed to give Australian families a real picture of their finances without the friction of traditional budgeting apps.

**Colour identity:** Emerald `#059669` throughout.

**Three tabs:** Overview · Categories · Savings Goals

**Key differentiators vs other budget apps:**
- Four upload methods — Share from bank app (iOS share extension), Paste from clipboard, Photo/screenshot, CSV/PDF. Priority is Share → Paste → Photo (not CSV-first like most apps)
- Claude Vision reads statement screenshots — user just takes screenshots, no file management
- Australian family template — includes school fees, childcare, HECS which generic templates miss
- **What If mode** — sandbox scenario modelling: "What if I went part time?" "What if we paid off the car?" Instant recalculation, nothing saved, amber banner always visible
- Savings Goals with Zaeli projections — honest about at-risk goals, constructive not alarming

**Upload method priority (most → least friction):**
1. Share from bank app (iOS share sheet → Zaeli)
2. Paste from clipboard (copy statement → paste)
3. Photo/screenshot (select from camera roll)
4. CSV or PDF file (via Files app)

**Statement review flow:**
- Claude Sonnet categorises all transactions
- Confident (≥80%) → auto-categorised list
- Uncertain (<80%) → human picks category from tap-to-select
- User confirms → saved to `budget_transactions`
- Raw statement content never stored — privacy

**What If mode:**
- Income sliders per person
- Toggle to remove fixed expenses
- Instant recalculation of all budget ratios + goal projections
- Zaeli summary from local templates — no API call
- Amber banner always visible, zero Supabase writes

**Build order:** Tables → Setup → Categories → Overview → Goals → Paste/Photo upload → Statement review → Income/What If → Share extension (last, needs EAS)

**Reference:** `zaeli-budget-final.html` — full Claude Code handover with all 9 screen states + technical spec

---

## ══════════════════════════════════
## NOTES & TASKS (Design complete — Session 6)
## ══════════════════════════════════

**Context:** My Space personal card. Dual-tab sheet.

**Notes tab:** Completely unchanged from current build.

**Tasks tab (new):**
- Personal tasks (member-scoped, not family-wide)
- Sections: Today & overdue → Upcoming → Done
- Circular checkboxes, due date pills (colour-coded), "from note" cross-reference tags
- Zaeli nudge: scans note bodies for action keywords locally (no API), suggests creating task

**Cross-reference magic:** Tasks can be linked to notes (linked_note_id FK). Notes tab shows nudge if action keyword found. Tasks tab shows "from note" tag. This is the AI bridging behaviour that makes it genuinely useful.

**New Supabase table:** `personal_tasks` (member-scoped)

**Reference:** `zaeli-restructure.html` — Claude Code modification brief included

---

## ══════════════════════════════════
## FAMILY TASKS vs NOTES & TASKS
## ══════════════════════════════════

Two distinct task contexts — this distinction is locked:

| | Family Tasks | Notes & Tasks |
|---|---|---|
| Location | Dashboard bento tile | My Space card |
| Scope | Family-wide (everyone sees) | Personal (Anna only) |
| Examples | "Sign Duke's permission slip" "Call the plumber" | "Book dentist" "Order bathroom tiles" |
| Colour | Gold `#F0DC80` | Peach `#FAC8A8` |
| Supabase | Existing todos table | New `personal_tasks` table |

The word "Tasks" is consistent across both. "Todos" is retired everywhere.

---

## ══════════════════════════════════
## FULL PROJECT PLAN (Updated 9 April 2026)
## ══════════════════════════════════

### Phase A — Make it solid
1. ✅ Fix Dashboard load speed + Zaeli Noticed AI
2. ✅ Fix weather (wttr.in)
3. ✅ Fix Chat interface — context flow, CRUD tools, mic, UI
4. ✅ Design refresh — all 3 pages, briefs, 6-card grid
5. ✅ Design architecture session — Dashboard restructure, My Space reshuffle, Notes & Tasks, Our Budget
6. 🔨 Dashboard restructure (Claude Code — zaeli-restructure.html)
7. 🔨 My Space reshuffle (Claude Code — zaeli-restructure.html)
8. 🔨 Notes & Tasks dual-tab sheet (Claude Code — zaeli-restructure.html)
9. 🔨 My Space sheet content (Fitness, Goals, Notes, Stretch, Zen, Wordle)

### Phase B — Make it testable
10. 🔨 Our Budget module — full build (zaeli-budget-final.html)
11. 🔨 Real authentication (replace DUMMY_FAMILY_ID)
12. 🔨 EAS build + TestFlight
13. 🔨 `LANDING_TEST_MODE = false`
14. 🔨 Kids Hub — dedicated screen
15. 🔨 Tutor rebuild — dedicated screen
16. 🔨 Our Family module
17. 🔨 Settings (account, family members, subscription)
18. 🔨 Dashboard sheets (Family Tasks, Shopping, Calendar, Meals)

### Phase C — Make it launchable
19. 🔨 Zaeli Voice (ElevenLabs)
20. 🔨 Push notifications
21. 🔨 Gmail + Outlook Calendar integration
22. 🔨 Spoonacular integration (meals data)
23. 🔨 Zaeli Persona review + memory
24. 🔨 Interactive onboarding module
25. 🔨 Website + Stripe + web signup flow
26. 🔨 Admin console updates + billing

### Phase D — Scale
27. 🔨 Live testing with 10 families
28. 🔨 Analytics
29. 🔨 Data export / GDPR compliance
30. 🔨 Multi-user real-time sync
31. 🔨 App Store submission
32. 🔨 Offline mode (post-launch)
33. 🔨 Backup / restore

---

## Pre-Launch Checklist

- [x] v5 architecture locked ✅
- [x] ZaeliFAB ✅
- [x] Landing overlay ✅
- [x] Dashboard — all cards ✅
- [x] Dashboard stress testing ✅
- [x] Dashboard → Chat context injection ✅
- [x] swipe-world.tsx container ✅
- [x] Wordmark updated ✅
- [x] Brand pack ✅
- [x] My Space — all 7 cards, shell sheets ✅
- [x] AI Zaeli Noticed (GPT mini) ✅
- [x] Weather switched to wttr.in ✅
- [x] Chat interface — context flow, CRUD tools, mic, UI ✅
- [x] Design refresh — all 3 pages ✅
- [x] Dashboard restructure — design locked ✅
- [x] My Space reshuffle — design locked ✅
- [x] Notes & Tasks — design locked ✅
- [x] Our Budget — full design + Claude Code spec ✅
- [ ] Dashboard restructure — build
- [ ] My Space reshuffle — build
- [ ] Notes & Tasks dual-tab — build (personal_tasks table)
- [ ] My Space sheet content (Fitness, Goals, Stretch, Zen, Wordle)
- [ ] Our Budget module — full build (5 Supabase tables + 9 screens)
- [ ] Family Tasks sheet (renamed from Todos)
- [ ] Shopping sheet
- [ ] Calendar sheet
- [ ] Meals sheet
- [ ] Travel sheet
- [ ] Real authentication
- [ ] EAS build · TestFlight
- [ ] `LANDING_TEST_MODE = false`
- [ ] Kids Hub
- [ ] Tutor rebuild
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
- [ ] HealthKit (My Space Fitness card)
- [ ] WotD rotating word list (My Space)
- [ ] expo-audio for Zen card
- [ ] Supabase `goals` table
- [ ] personal_tasks table (session 6 ✅ designed)
- [ ] budget_settings / income_streams / budget_categories / budget_transactions / savings_goals tables (session 6 ✅ designed)
- [ ] Wordle game logic
- [ ] Live testing with 10 families
- [ ] Analytics
- [ ] GDPR / data export
- [ ] Multi-user sync
- [ ] App Store submission
- [ ] Offline mode

---

## Key Product Moments

**The landing** — Dark overlay, wordmark, tap to continue. Earns its moment 3x/day.
**The dashboard** — One sentence per card. Tap to reveal. Editorial, not widget-like.
**Zaeli noticed** — "Poppy's assignment is due tomorrow." Zaeli knew before you asked.
**My Space** — Anna's world. Steps, goals, word, tasks, calm, Wordle. One swipe right.
**Dashboard → Chat** — Tap a card, Zaeli has context, keyboard ready. Seamless.
**The sheet** — Slides up over Chat. Data without leaving the conversation.
**Our Budget What If** — "What if I went part time?" Instant honest answer. No judgment.
**The all-done moment** — Everything handled. "Enjoy the evening."
