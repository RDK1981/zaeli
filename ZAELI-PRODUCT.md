# ZAELI-PRODUCT.md — Product Vision & Decisions
*Last updated: 6 April 2026 — Dashboard stress testing complete ✅ All cards working ✅*

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

**Core UX principle:** Dashboard = read. Chat = do. My Space = me. 90% of activity stays in Chat.

### What's gone in v5
- ❌ Domain pill bar · ❌ Hamburger menu · ❌ Persistent chat input bar
- ❌ Pulse as a dedicated swipe screen
- ❌ Zen as a dedicated screen
- ❌ WotD on Dashboard

### What's new/complete in v5
- ✅ ZaeliFAB — forwardRef, mic exposed
- ✅ Landing overlay — time-window moment
- ✅ Dashboard Option A — all 5 cards stress tested
- ✅ Chat input bar — floating pill, FAB hides on keyboard
- ✅ Mic pill — Whisper transcription
- ✅ Zaeli Noticed card — replaces WotD in Dashboard
- ✅ All dashboard → Chat context injection wired
- ✅ Full-width bottom buttons on every expanded card
- 🔨 Phase 3 — swipe-world.tsx horizontal container
- 🔨 Phase 3b — My Space screen
- 🔨 Phase 5 — Chat v5
- 🔨 Phase 6 — AI-generated Zaeli Noticed

---

## ══════════════════════════════════
## SCREEN ARCHITECTURE (LOCKED ✅)
## ══════════════════════════════════

**Three navigable screens:**
```
My Space  ←  Dashboard  →  Chat
```

**92% SHEETS over Chat:**
Calendar · Shopping · Meal Planner · Todos / Reminders · Notes · Travel

**Dedicated full screens:**
Tutor · Kids Hub · Our Family · Settings

---

## ══════════════════════════════════
## LANDING PAGE (LOCKED ✅)
## ══════════════════════════════════

Embedded in index.tsx. Moves to swipe-world.tsx container in Phase 3 (shows over all 3 screens).

**Time windows:** Morning 6–9am · Midday 12–2pm · Evening 5–8pm
**Visual:** `#FFF6EC/EDF6FF/F5EEFF` · Logo blush `#F0C8C0` · Highlights cyan `#0096C7`
**Brief:** Poppins 600SemiBold 26px · 3 sentences · max 180 chars
`LANDING_TEST_MODE = true` — set false before launch.

Zaeli brief now pulls from both family data AND My Space data:
- Family: calendar, dinner, shopping, actions
- Personal: steps vs goal, goal milestones, notes
- Example: "Your Noosa Run is 4 weeks away — want a training plan?"

---

## ══════════════════════════════════
## DASHBOARD — OPTION A (LOCKED + STRESS TESTED ✅)
## ══════════════════════════════════

**The visual language of the whole app:**
> Every surface leads with one bold Poppins statement. Data lives behind the tap.

### Card order (FIXED)
1. **Calendar** — `#3A3D4A` slate
2. **Dinner** — `#FAC8A8` peach
3. **Weather** `#A8D8F0` + **Zaeli Noticed** `#E8F4E8` — side by side
4. **Shopping** — `#D8CCFF` lavender (white font)
5. **Actions** — `#F0DC80` gold

### Calendar card (LOCKED ✅)
- Past events stay visible — muted 45% opacity, struck-through title, still tappable
- Headline counts upcoming events only, not past
- "All clear for the afternoon/evening" when all events are done for today
- `showCalTomorrow` flips only after 8pm OR zero events today
- Tap row → inline expand: Edit/Reschedule with Zaeli · Delete (two-tap)
- Full-width "View Full Calendar →" at bottom of expanded state

### Dinner card (LOCKED ✅)
- No duplicate header block in expanded state
- Day column 92px — "Tomorrow" never wraps
- Tap any day → inline expand: Edit with Zaeli · Delete · Move · More options
- Empty night → "✦ Plan [Tonight/Tomorrow/Wed] with Zaeli" — full width
- Full-width "Open Meal Planner →" at bottom
- Edit with Zaeli → Chat with day-specific dinner prompt + chips

### Shopping card (LOCKED ✅)
- "Tap to see →" hint bright at `rgba(255,255,255,0.70)`
- "+N more" 17px Poppins_600SemiBold
- "+ Add" always visible in collapsed and expanded header
- Full-width "Open Shopping List →" at bottom → opens sheet directly (no chat message)
- "+ Add" → Chat: "What needs to go on the list?" + chips

### Actions card (LOCKED ✅)
- Todos AND done items fetched (`in('status',['active','done'])`)
- Checkbox toggles both ways — ticking done item restores to active
- Done items stay visible through refreshes (struck through, muted, sorted to bottom)
- Tap row → inline expand: Edit with Zaeli · Delete (two-tap) · More options
- Full-width "Open All To-dos and Reminders →" at bottom
- Edit with Zaeli → Chat: todo-specific prompt referencing title + due date

### Zaeli Noticed card (LOCKED ✅ — Phase 1 hardcoded)
- Replaces WotD in the side-by-side slot with Weather
- Same `#E8F4E8` / `#6B35D9` visual palette — intentional continuity
- "ZAELI NOTICED" label 13px · Count headline ("three things.") · Tag summary 13px
- Expanded: notice rows 14px — tap any → Chat with that notice as context
- **Phase 1 (current):** 3 hardcoded notices (Poppy assignment, weather/soccer, shopping)
- **Phase 6:** GPT mini generated, family-aware, refreshed on load

### Full-width bottom buttons (consistent design across all cards)
Every expanded card has a prominent full-width navigation button:
- Calendar: "View Full Calendar →"
- Dinner: "Open Meal Planner →"
- Shopping: "Open Shopping List →"
- Actions: "Open All To-dos and Reminders →"
All: `borderRadius:14`, `paddingVertical:14`, `Poppins_700Bold` 15px

### Smart time logic (LOCKED ✅)
- Calendar → Tomorrow: after 8pm OR zero events today
- Dinner → Tomorrow: after 8pm
- Actions → evening mode: after 8pm
- Auto-refresh: 5-minute interval

---

## ══════════════════════════════════
## ZAELI NOTICED (NEW ✅)
## ══════════════════════════════════

**What it is:** Zaeli surfaces things worth your attention — without you having to ask.

**Why it exists:** Every other family app shows you a dashboard. Zaeli notices. The card creates a product moment: "Zaeli already knew." No other family app does this.

**Where it lives:** Side-by-side with Weather, in the slot where WotD used to be.

**Design:** Same `#E8F4E8` sage background, `#6B35D9` violet text as WotD — visual continuity. Users don't feel something was removed, they feel something was upgraded.

**Phase 1 (current):** 3 hardcoded notices drawn from real family data context.
**Phase 6:** GPT mini generates notices on load. Family-aware. Time-sensitive. Sharp Zaeli voice.

Example notices:
- "Poppy's assignment is due tomorrow." (Poppy's colour dot)
- "Rain from 3pm — Duke's soccer may be affected." (sky blue dot)
- "23 items on the shopping list." (lavender dot)

---

## ══════════════════════════════════
## MY SPACE (DESIGNED ✅ — Phase 3b to build)
## ══════════════════════════════════

**Rich's personal world. Swipe left from Dashboard.**

Same card language as Dashboard: big Poppins headline, coloured card, tap to expand, one at a time.

### Card order (FIXED)
| Card | Colour | Collapsed headline |
|------|--------|--------------------|
| Health | `#3A3D4A` slate | "6,842 steps so far today." |
| Goals | `#F0DC80` gold | "Three things to work toward." |
| Word of the Day | `#E8F4E8` sage | "ephemeral." *(italic violet)* |
| NASA APOD | `#3A3D4A` slate | "Saturn's rings, today." |
| Zen | `#FAC8A8` peach | "Four meditations ready for you." |
| Notes | `#D8CCFF` lavender | "Three notes on the go." |
| Wordle | `#F0DC80` gold | "12-day streak. Keep it going." 🔥 |

### Health card
- HealthKit: steps + % goal + progress bar (collapsed)
- Expanded: walk/run distance · active calories · last 2 workout sessions
- v1: steps, distance, active calories, workouts · v2: sleep, heart rate

### Goals card
- 3-5 goals with mini progress bars
- Tap % → detail sheet: full progress, Zaeli coaching, "Build a training plan" CTA → Chat
- Goals live here permanently — card = overview, sheet = workspace
- + Add → text field, keyboard, KAV

### Word of the Day (moved from Dashboard)
- Same sage/violet design, same 400-word list, same Dictionary API, same expo-av audio
- Collapsed: word + phonetic · Expanded: definition + example + play button

### NASA APOD
- Free API: api.nasa.gov/planetary/apod
- Collapsed: small image + headline · Expanded: big image + full description + link
- Cached daily in FileSystem

### Zen
- 4–5 GPT mini meditations per day. expo-av inline playback.
- Collapsed: headline + mood hints · Expanded: track list, playing track shows pause + progress

### Notes (personal)
- Tap → 92% sheet over My Space. Keyboard + KAV same as Chat.
- Zaeli reads notes for brief: "Your reno note hasn't been updated in a week."

### Wordle
- Date-seeded, same as NYT. Inline grid + keyboard when expanded. Streak tracking.

### Zaeli brief integration
generateBrief() pulls My Space data alongside family data for the landing brief.

---

## ══════════════════════════════════
## ZAELIFAX + CHAT INPUT BAR (LOCKED ✅)
## ══════════════════════════════════

```
[ My Space ] | [ Chat ][ Mic ] | [ More ]
FAB_BTN=58px · borderRadius=36px
```
- forwardRef · exposes startMic()
- FAB hides on keyboard · floating pill input bar takes over
- Mic pill: full width, waveform + Listening + Cancel/Send →
- FAB restores only on blur, NOT on send

---

## ══════════════════════════════════
## SHEETS DESIGN SYSTEM (LOCKED ✅)
## ══════════════════════════════════

All domain channels open as 92% sheets over Chat.
- 92% height · `#FAF8F5` bg · borderTopRadius 24px
- Open INSTANTLY · fetch async · backdrop dismisses

---

## ══════════════════════════════════
## EVENT TIME CONTRACT (LOCKED ✅)
## ══════════════════════════════════

Store bare local datetime. Raw string parse. No timezone suffix. Ever.
✅ `"2026-04-01T16:00:00"` · ❌ Never `"...+10:00"`

---

## Pre-Launch Checklist

- [x] v5 architecture locked
- [x] My Space designed — mockup complete
- [x] ZaeliFAB Phase 1 ✅
- [x] Landing Phase 2 ✅
- [x] Dashboard Phase 4 ✅
- [x] Chat input bar ✅
- [x] **Dashboard stress testing — ALL 5 CARDS ✅**
  - [x] Calendar — past events, toggle, headline, full-width button
  - [x] Dinner — no duplicate, 92px column, tap-expand, full-width button
  - [x] Shopping — bright hint, +N, always-visible add, open sheet button
  - [x] Actions — toggle tick, done persist, inline expand, full-width button
  - [x] Zaeli Noticed — sage/violet, count headline, tap → Chat
- [x] All Dashboard → Chat context injection wired ✅
- [x] Quick reply chip intercepts wired ✅
- [ ] **Phase 3 — swipe-world.tsx container** ← NEXT
- [ ] **Phase 3b — My Space screen**
- [ ] Phase 5 — Chat v5
- [ ] Phase 6 — AI Zaeli Noticed (GPT mini)
- [ ] Todos sheet
- [ ] Notes sheet (family + personal)
- [ ] Travel sheet
- [ ] Tutor rebuild
- [ ] Kids Hub
- [ ] Our Family
- [ ] HealthKit integration
- [ ] NASA APOD integration
- [ ] Landing: LANDING_TEST_MODE = false
- [ ] EAS build · TestFlight for Anna
- [ ] Real auth
- [ ] Website + Stripe + onboarding

---

## Key Product Moments

**The brief** — 3 sentences, Poppins 600 26px. Earns its moment 3x/day. Reads family + personal data.
**The dashboard** — One sentence per card. Tap to reveal. Editorial, not widget-like.
**Zaeli noticed** — "Poppy's assignment is due tomorrow." Zaeli knew before you asked.
**My Space** — Rich's world. Steps, goals, word, astronomy, calm, notes, Wordle. One swipe left.
**Dashboard → Chat** — Tap a card, Zaeli has context, keyboard ready. Seamless.
**The sheet** — Slides up over Chat. Data accessible without leaving the conversation.
**Goal coaching** — "Your Noosa Run is 4 weeks away — want a training plan?"
**The all-done moment** — Everything handled. "Enjoy the evening."
