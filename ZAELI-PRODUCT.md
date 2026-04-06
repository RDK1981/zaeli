# ZAELI-PRODUCT.md — Product Vision & Decisions
*Last updated: 6 April 2026 — My Space designed ✅ Swipe world updated ✅ Zaeli Noticed card ✅*

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
My Space  ←  Dashboard  →  Chat
```

**Core UX principle (LOCKED ✅):**
Dashboard = read. Chat = do. My Space = me. Keep users in Chat for 90% of activity.

The flow: My Space (personal glance) → Dashboard (family glance) → Chat (act via Zaeli) → sheet if needed → back to Chat.

### What's gone in v5
- ❌ Domain pill bar · ❌ Hamburger menu · ❌ Persistent chat input bar
- ❌ Pulse as a dedicated swipe screen (was planned, now scrapped)
- ❌ Zen as a dedicated screen (content lives inside My Space)
- ❌ Navigating to Calendar/Shopping/Meals as full screens

### What's new in v5
- ✅ ZaeliFAB — four buttons, forwardRef, mic exposed
- ✅ Landing overlay — time-window moment, three times a day
- ✅ Dashboard Option A — editorial headlines, bento layout, tap to expand
- ✅ Chat input bar — floating pill, replaces FAB when keyboard up
- ✅ Mic pill — full-width, Cancel + Send →, Whisper transcription
- 🔨 Phase 3 — swipe-world.tsx container + horizontal swipe + dots
- 🔨 Phase 3b — My Space screen (Rich's personal world)
- 🔨 Phase 5 — Chat v5 (full-width Zaeli, two entry states)
- 🔨 Phase 6 — Zaeli Noticed card in Dashboard
- 🔨 Phase 7 — Todos + Reminders sheet

---

## ══════════════════════════════════
## SCREEN ARCHITECTURE (LOCKED ✅ — CRITICAL)
## ══════════════════════════════════

**Three navigable screens (swipe world):**
```
My Space  ←  Dashboard  →  Chat
```

**These are 92% SHEETS that open over Chat — NEVER dedicated screens:**
- Calendar · Shopping · Meal Planner · Todos / Reminders · Notes · Travel

**These are the ONLY dedicated full screens (besides the three above):**
- Tutor · Kids Hub · Our Family · Settings

**More overlay routing:**
- Calendar / Shopping / Meals / Todos / Notes / Travel → open as sheet over Chat
- Tutor / Kids Hub / Our Family / Settings → router.navigate() to full screen

**Current tab files** (`shopping.tsx`, `mealplanner.tsx`, `calendar.tsx`) exist as temporary scaffolding from before v5. They will be dissolved into sheets inside Chat. Do not build new navigation assuming they are screens.

---

## ══════════════════════════════════
## LANDING PAGE (LOCKED ✅)
## ══════════════════════════════════

Embedded as `LandingOverlay` in swipe-world.tsx (container level). NOT a separate route.
Shows over the entire screen including Dashboard — not just Chat.

**Time windows:** Morning 6–9am · Midday 12–2pm · Evening 5–8pm
**Dismiss:** swipe >50px OR FAB tap → fades out
**Brief:** 3 sentences, GPT-mini, max 180 chars, key facts in [brackets] → cyan

**Visual (LOCKED ✅):**
```
Background: #FFF6EC morning · #EDF6FF midday · #F5EEFF evening
Logo 'a'+'i': #F0C8C0 blush · Highlights: #0096C7 cyan
Brief: Poppins 600SemiBold 26px
```
`LANDING_TEST_MODE = true` — set false before launch.

**Zaeli brief pulls from both family data AND My Space data:**
- Family: calendar events, dinner, shopping, actions
- Personal: steps vs goal, upcoming milestones, goal progress, notes
- Example: "Your 10km Noosa Run is 4 weeks away — want a dedicated training plan?"

---

## ══════════════════════════════════
## DASHBOARD — OPTION A (LOCKED ✅)
## ══════════════════════════════════

**The visual language of the whole app:**
> Every surface leads with one bold Poppins statement. Data lives behind the tap.

### Card order (FIXED — never rearranges)
1. **Calendar** — full width, dark slate `#3A3D4A`
2. **Dinner** — full width, peach `#FAC8A8`
3. **Weather** `#A8D8F0` + **Zaeli Noticed** `#E8F4E8` — side by side
4. **Shopping** — full width, lavender `#D8CCFF` (white font)
5. **Actions** — full width, gold `#F0DC80`

**WotD has moved to My Space. Its Dashboard slot is now Zaeli Noticed.**

### Zaeli Noticed card (NEW — replaces WotD slot)
- Background: `#E8F4E8` sage · text: `#6B35D9` violet (same WotD palette — intentional)
- Collapsed: "3 things Zaeli noticed." with animated live dot
- Expanded inline: notice rows (avatar/icon + text + category tag) + action chips
- No sheet needed — expands in place like Calendar card
- Notices: AI-generated by GPT mini, family-aware, updated on load
- Example notices: "Poppy's assignment due tomorrow", "Rain at 3pm — soccer risk", "Shopping list at 28 items"

### Zaeli voice headlines (formula-driven, zero AI cost)
- Calendar: "3 things on today." / "All clear today." / "One thing on today."
- Dinner: "Pasta Carbonara for dinner tonight." / "Nothing planned for dinner."
- Shopping: "23 items on the shopping list." / "Shopping list is clear."
- Actions: "8 things on your plate." / "Nothing on your plate."
- Zaeli Noticed: "3 things Zaeli noticed." / "All quiet today."

### Tap behaviour (LOCKED ✅)
- Tap card header → expands
- Tap header again → collapses
- One card expanded at a time
- No "Collapse" text
- Ghost numbers: Calendar only

### Smart time logic (LOCKED ✅)
- Calendar → Tomorrow: after 8pm OR all today's events past
- Dinner → Tomorrow: after 8pm
- Actions → evening mode: after 8pm
- Auto-refresh every 5 minutes

### Calendar card (stress tested ✅)
- Expand → inline event rows → tap event → notes/attendees/Edit/Delete
- "✦ Edit with Zaeli" → Chat injection
- "+ Add" → Chat injection
- Delete: two-tap, optimistic
- "Month view →" → calendar sheet

---

## ══════════════════════════════════
## MY SPACE (NEW ✅ — DESIGNED, TO BUILD)
## ══════════════════════════════════

**Rich's personal world. Swipe left from Dashboard.**

### Why it exists
Every other family app is 100% about the family unit. Zaeli is the first that also knows the individual. My Space is where Rich's personal life lives — fitness, goals, curiosity, calm, creative notes. And Zaeli reads all of it to write a brief that actually feels personal.

### Design language (LOCKED ✅)
Same card language as Dashboard throughout:
- Big bold Poppins 700 headline (~22px)
- Coloured card background (Dashboard palette — no new colours)
- Tap to expand — data lives behind the headline
- One card expanded at a time

### Card order (FIXED)
1. **Health** — `#3A3D4A` slate — "6,842 steps so far today."
2. **Goals** — `#F0DC80` gold — "Three things to work toward."
3. **Word of the Day** — `#E8F4E8` sage — "ephemeral." *(moved from Dashboard)*
4. **NASA APOD** — `#3A3D4A` slate — "Saturn's rings, today."
5. **Zen** — `#FAC8A8` peach — "Four meditations ready for you."
6. **Notes** — `#D8CCFF` lavender (white font) — "Three notes on the go."
7. **Wordle** — `#F0DC80` gold — "12-day streak. Keep it going." 🔥

### Health card detail
- **Collapsed:** Big step count + % of daily goal + progress bar
- **Expanded:** Walk/Run distance (km) · Active calories burned · Last 2 workout sessions (type, distance, duration, calories)
- Data source: HealthKit (expo-health or react-native-health)
- Permissions requested on first load of My Space
- v1 metrics: steps, distance, active calories, workouts
- v2 (later): sleep, heart rate (requires Apple Watch)

### Goals card detail
- **Collapsed:** Headline + category hints ("Running · reading · hydration")
- **Expanded:** Goal rows with mini progress bars. Tap % → detail sheet.
- **Goal detail sheet:** Full progress bar, target date, last activity, weekly target, Zaeli coaching note, "Build a training plan with Zaeli" CTA → Chat injection with full goal context
- + Add goal → text field in sheet, keyboard, KAV handles it
- Goals live here permanently — the card is the overview, the sheet is the workspace

### Word of the Day detail (LOCKED ✅ — moved from Dashboard)
- `#E8F4E8` sage · `#6B35D9` violet · italic 28px Poppins 700
- Same 400-word curated list, same Dictionary API, same expo-av audio
- **Collapsed:** word + phonetic
- **Expanded:** definition + example sentence + play button
- No change to the design — just moved from Dashboard to My Space

### NASA APOD detail
- Free API: api.nasa.gov/planetary/apod
- **Collapsed:** Small image preview + headline ("Saturn's rings, today.")
- **Expanded:** Larger image + full NASA description + image credit + "View full image →" link
- Fetched once daily, cached in FileSystem

### Zen detail
- 4–5 AI-generated meditations per day (GPT mini, fresh each morning)
- **Collapsed:** Headline + mood hints ("Calm · focus · evening · sleep")
- **Expanded:** Track list with play buttons. Playing track shows pause + progress bar.
- expo-av inline playback. No external app needed.

### Notes detail
- **Collapsed:** Headline + preview of note titles
- **Tap → 92% sheet slides up** (same sheet system as Chat sheets)
- Sheet: note list, tap to open editor, keyboard appears, KAV handles it
- Personal notes only (separate from any family Notes sheet in Chat)
- Zaeli reads notes for the brief

### Wordle detail
- Daily word seeded by date — same answer as NYT Wordle
- **Collapsed:** Streak headline + "Today's Wordle · N tries left"
- **Expanded:** Full 5×6 grid + keyboard with colour-coded letters (green/yellow/grey)
- Streak tracking stored in FileSystem or Supabase
- No external links or accounts required

### Zaeli brief integration
generateBrief() pulls My Space data alongside family data:
- Steps vs daily goal → "You're at 6,842 steps — 3,158 to go today."
- Upcoming goal milestones → "Your Noosa Run is 4 weeks away."
- Goal progress → "You've read 4 of your 12 book goal."
- Notes with no recent updates → "Your reno note hasn't been touched in a week."
Smart context loading — only fetch relevant data per message to control API cost.

---

## ══════════════════════════════════
## ZAELIFAX + CHAT INPUT BAR (LOCKED ✅)
## ══════════════════════════════════

```
[ My Space ] | [ Chat ][ Mic ] | [ More ]
FAB_BTN=58px · borderRadius=36px · FAB_WIDTH=318px
```

- `forwardRef` — exposes `startMic()` to parent
- FAB hides when keyboard active → floating pill input bar takes its place
- Input bar: Mic · TextInput · Send — transparent bg, same height as FAB
- Mic pill: full width, waveform + Listening + Cancel/Send →
- FAB restores only on keyboard dismiss, NOT on send
- My Space button → scrollTo page 0
- Dashboard button → scrollTo page 1
- Chat button → scrollTo page 2 (or open keyboard if already on Chat)

---

## ══════════════════════════════════
## SHEETS DESIGN SYSTEM (LOCKED ✅)
## ══════════════════════════════════

All domain channels open as 92% sheets over Chat (or My Space for personal Notes).
- 92% height · `#FAF8F5` bg · borderTopRadius 24px
- Open INSTANTLY · fetch async · backdrop dismisses
- No channel colour in sheet — clean black/grey inside

---

## ══════════════════════════════════
## NAVIGATION STORE (✅)
## ══════════════════════════════════

`lib/navigation-store.ts` — module-level, production ready.
Current types: `edit_event` · `add_event` · `shopping` · `actions` · `meals`
To add: `my_space_goal` — for Goal detail → Chat injection with training plan context

---

## ══════════════════════════════════
## EVENT TIME CONTRACT (LOCKED ✅)
## ══════════════════════════════════

Store bare local datetime. Raw string parse. No timezone suffix. Ever.
✅ `"2026-04-01T16:00:00"` · ❌ Never `"...+10:00"`

---

## Pre-Launch Checklist

- [x] v5 architecture locked — three screens + sheets
- [x] Screen architecture clarified — Calendar/Shopping/Meals/Todos/Notes/Travel = sheets only
- [x] Swipe world updated — My Space replaces Pulse as third screen
- [x] ZaeliFAB Phase 1 ✅ (forwardRef, startMic)
- [x] Landing Phase 2 ✅
- [x] Dashboard Phase 4 — Option A ✅
- [x] Chat input bar ✅ (floating pill, mic wired)
- [x] Calendar card — full interaction stress tested ✅
- [x] My Space — fully designed, mockup complete ✅
- [x] Zaeli Noticed card — designed, replaces WotD in Dashboard ✅
- [x] WotD moved to My Space — design locked ✅
- [ ] Dashboard stress testing — Dinner, Shopping, Actions, WotD remaining
- [ ] **Phase 3 — swipe-world.tsx container** ← NEXT
- [ ] **Phase 3b — My Space screen** ← NEXT AFTER CONTAINER
- [ ] Phase 5 — Chat v5 (full-width Zaeli, two entry states)
- [ ] Phase 6 — Zaeli Noticed card in Dashboard (GPT mini notices)
- [ ] Phase 7 — Todos + Reminders sheet
- [ ] Notes sheet (personal, in My Space)
- [ ] Notes sheet (family, in Chat)
- [ ] Travel sheet — build inside Chat
- [ ] Tutor — dedicated screen rebuild
- [ ] Kids Hub — dedicated screen
- [ ] Our Family — dedicated screen
- [ ] Landing: LANDING_TEST_MODE = false before launch
- [ ] HealthKit integration (expo-health)
- [ ] NASA APOD API integration + daily cache
- [ ] Wordle — date-seeded daily word + streak tracking
- [ ] Zen meditations — GPT mini generation + expo-av
- [ ] Goal → Chat injection (navigation store type: my_space_goal)
- [ ] EAS build · TestFlight for Anna
- [ ] Real auth · Remove dev toggle
- [ ] Website + Stripe + onboarding
- [ ] Wire weather to real user location

---

## Key Product Moments

**The brief** — 3 sentences, Poppins 600 26px. Earns its moment 3x/day. Now reads family AND personal data.
**The dashboard** — One sentence per card. Tap to reveal. Editorial, not widget-like.
**My Space** — Rich's world. Steps, goals, word, astronomy, calm, notes, Wordle. One swipe left.
**The word** — "ephemeral." Something for the adults. Now lives where it belongs — personal space.
**The notice** — "Poppy's assignment is due tomorrow." Zaeli noticed so you don't have to.
**Dashboard → Chat** — Tap a card, Zaeli has context, keyboard ready. Seamless.
**The sheet** — Slides up over Chat. Data accessible without leaving the conversation.
**Goal coaching** — "Your Noosa Run is 4 weeks away — want a training plan?" Zaeli knows Rich personally.
**The all-done moment** — Everything handled. "Enjoy the evening."
