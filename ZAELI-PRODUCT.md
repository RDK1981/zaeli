# ZAELI-PRODUCT.md — Product Vision & Decisions
*Last updated: 5 April 2026 — Dashboard Option A ✅ Word of the Day ✅ Screen architecture clarified ✅*

---

## What Zaeli Is

Zaeli is an iOS-first AI family life platform for Australian families with children. A switched-on family assistant that knows your family's life — through conversation, not data entry.

**Tagline:** Less chaos. More family.

---

## Zaeli's Voice (LOCKED)

Sharp, warm, genuinely enthusiastic about this family. Finds the funny angle through delight, not detachment.

**Hard rules:** Never 'mate'. Never starts with 'I'. Plain text only. Always ends on a confident offer.
**Banned:** 'queued up', 'sorted', 'tidy', 'chaos', 'ambush', 'sprint', 'locked in', 'breathing room', 'quick wins', 'you've got this', 'make it count'.

---

## Target Market

Australian families with children. Priority: dual-income metro couples with primary school-aged kids.
**Revenue:** A$14.99/month family · A$9.99/child/month Tutor · 100% web sales.

---

## ══════════════════════════════════
## SCREEN ARCHITECTURE (LOCKED ✅ — CRITICAL)
## ══════════════════════════════════

**There are only THREE navigable screens:**
```
Pulse  ←  Dashboard  →  Chat
```

**These are 92% SHEETS that open over Chat — NEVER dedicated screens:**
- Calendar
- Shopping
- Meal Planner
- Todos / Reminders
- Notes
- Travel

**These are the ONLY dedicated full screens (besides the three above):**
- Tutor
- Kids Hub
- Zen
- Our Family
- Settings

**Why this matters:**
The user never leaves Chat to "go to" Calendar. They stay in Chat and the sheet slides up. This keeps Zaeli in context, keeps conversation history visible, and means every domain action can feed back into Chat naturally. The sheet IS the interface — Chat is the container.

**More overlay routing:**
- Calendar / Shopping / Meals / Todos / Notes / Travel → open as sheet over Chat
- Tutor / Kids Hub / Zen / Our Family / Settings → router.navigate() to full screen

**Current state of .tsx files:**
`shopping.tsx`, `mealplanner.tsx`, `calendar.tsx` exist as tab screens — temporary scaffolding from before v5. They will be dissolved into sheets inside Chat. Do not build new navigation assuming they are screens.

---

## ══════════════════════════════════
## V5 INTERFACE PHILOSOPHY (LOCKED ✅)
## ══════════════════════════════════

**Three screens. One FAB. No clutter.**

**Core UX principle:** Dashboard = read. Chat = do. 90% of activity stays in Chat.

The flow: Dashboard (glance) → Chat (act via Zaeli) → sheet opens if needed → back to Chat.

### What's gone in v5
- ❌ Domain pill bar · ❌ Hamburger menu · ❌ Persistent chat input bar
- ❌ Navigating to Calendar/Shopping/Meals as full screens

### What's new in v5
- ✅ ZaeliFAB — four buttons, forwardRef, mic exposed
- ✅ Landing overlay — time-window moment, three times a day
- ✅ Dashboard Option A — editorial headlines, tap to expand
- ✅ Word of the Day — curated list + Dictionary API + audio
- ✅ Chat input bar — floating pill, replaces FAB when keyboard up
- ✅ Mic pill — Cancel + Send →, Whisper transcription
- 🔨 Phase 3 — horizontal swipe Pulse ← Dashboard → Chat
- 🔨 Phase 5 — Chat v5 (full-width Zaeli, two entry states)
- 🔨 Phase 6 — Pulse screen
- 🔨 Phase 8 — Zen screen

---

## ══════════════════════════════════
## LANDING PAGE (LOCKED ✅)
## ══════════════════════════════════

Embedded as `LandingOverlay` in index.tsx. NOT a separate route.

**Time windows:** Morning 6–9am · Midday 12–2pm · Evening 5–8pm
**Visual:** Background `#FFF6EC/EDF6FF/F5EEFF` · Logo blush `#F0C8C0` · Highlights cyan `#0096C7`
**Brief:** Poppins 600SemiBold 26px · 3 sentences · max 180 chars
`LANDING_TEST_MODE = true` — set false before launch.

---

## ══════════════════════════════════
## DASHBOARD — OPTION A (LOCKED ✅)
## ══════════════════════════════════

**The visual language of the whole app:**
> Every surface leads with one bold Poppins statement. Data lives behind the tap.

### Card order (FIXED — never rearranges)
1. **Calendar** — full width, dark slate `#3A3D4A`
2. **Dinner** — full width, peach `#FAC8A8`
3. **Weather** `#A8D8F0` + **Word of the Day** `#E8F4E8` — side by side
4. **Shopping** — full width, lavender `#D8CCFF` (white font)
5. **Actions** — full width, gold `#F0DC80`

### Zaeli voice headlines (formula-driven, zero AI cost)
- Calendar: "3 things on today." / "All clear today."
- Dinner: "Pasta Carbonara for dinner tonight." / "Nothing planned for dinner."
- Shopping: "23 items on the shopping list." / "Shopping list is clear."
- Actions: "8 things on your plate." / "Nothing on your plate."
- WotD: the word itself in 26px `#6B35D9` purple

### Card tap behaviour
- Tap header → expand · tap again → collapse
- One card expanded at a time
- No "Collapse" text — tap header to close
- Ghost numbers: Calendar only. Shopping and Actions: none.

### Smart time logic
- Calendar → Tomorrow: after 8pm OR all today's events past
- Dinner → Tomorrow: after 8pm · Actions → evening mode: after 8pm
- Auto-refresh every 5 minutes

### Calendar card (stress tested ✅)
- Expand → inline event rows → tap event → notes/attendees/Edit/Delete
- "✦ Edit with Zaeli" → Chat injection (inline card + prompt + chips + keyboard)
- "+ Add" → Chat injection (prompt + chips + keyboard)
- Delete: two-tap, optimistic (instant UI, background Supabase)
- "Month view →" → opens calendar sheet

---

## ══════════════════════════════════
## WORD OF THE DAY (NEW ✅)
## ══════════════════════════════════

Something enjoyable for adults. A product moment beyond family logistics.

- Card: `#E8F4E8` sage · text: `#6B35D9` purple · 26px Poppins 700
- 400 curated words in `WOTD_LIST` (dashboard.tsx), seeded by day-of-year
- No repeats for 400+ days · Update annually by swapping the list
- Expanded: phonetic · part of speech · definition · example · play button
- Audio: `dictionaryapi.dev` MP3 via expo-av · Play icon coral when active

---

## ══════════════════════════════════
## ZAELIFAX + CHAT INPUT BAR (LOCKED ✅)
## ══════════════════════════════════

```
[ Dashboard ] | [ Chat ][ Mic ] | [ More ]
```

- `forwardRef` — exposes `startMic()` to parent
- FAB hides when keyboard active → floating pill input bar takes its place
- Input bar: Mic · TextInput · Send — transparent bg, same height as FAB
- Mic pill: full width, waveform + Listening + Cancel/Send →
- FAB restores only on keyboard dismiss, NOT on send

---

## ══════════════════════════════════
## SHEETS DESIGN SYSTEM (LOCKED ✅)
## ══════════════════════════════════

All domain channels open as 92% sheets over Chat.
- 92% height · `#FAF8F5` bg · borderTopRadius 24px
- Open INSTANTLY · fetch async · backdrop dismisses
- No channel colour in sheet — clean black/grey

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
- [x] ZaeliFAB Phase 1 ✅ (forwardRef, startMic)
- [x] Landing Phase 2 ✅
- [x] Dashboard Phase 4 — Option A ✅
- [x] Chat input bar ✅ (floating pill, mic wired)
- [x] Word of the Day ✅
- [x] Calendar card — full interaction stress tested ✅
- [ ] Dashboard stress testing — Dinner, Shopping, Actions, WotD
- [ ] Phase 3 — horizontal swipe navigation ← NEXT AFTER STRESS TEST
- [ ] Phase 5 — Chat v5 (full-width Zaeli, two entry states)
- [ ] Phase 6 — Pulse screen
- [ ] Phase 8 — Zen screen
- [ ] Todos sheet — build inside Chat
- [ ] Notes sheet — build inside Chat
- [ ] Travel sheet — build inside Chat
- [ ] Tutor — dedicated screen rebuild
- [ ] Kids Hub — dedicated screen
- [ ] Our Family — dedicated screen
- [ ] Zen — dedicated screen (Phase 8)
- [ ] Landing: LANDING_TEST_MODE = false before launch
- [ ] EAS build · TestFlight for Anna
- [ ] Real auth · Remove dev toggle
- [ ] Website + Stripe + onboarding
- [ ] Wire weather to real user location

---

## Key Product Moments

**The brief** — 3 sentences, Poppins 600 26px. Earns its moment 3x/day.
**The dashboard** — One sentence per card. Tap to reveal. Editorial, not widget-like.
**The word** — "ephemeral." Something for the adults.
**Dashboard → Chat** — Tap a card, Zaeli has context, keyboard ready. Seamless.
**The sheet** — Slides up over Chat. Data accessible without leaving the conversation.
**Pulse** — Zaeli noticed. The thing you didn't ask about.
**The all-done moment** — Everything handled. "Enjoy the evening."
