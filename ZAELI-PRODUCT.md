# ZAELI-PRODUCT.md — Product Vision & Decisions
*Last updated: 5 April 2026 — Dashboard Option A ✅ Word of the Day ✅ Chat input bar ✅*

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
Pulse  ←  Dashboard  →  Chat
```

**Core UX principle (LOCKED ✅):**
Dashboard = read. Chat = do. Keep users in Chat for 90% of activity.

### What's gone in v5
- ❌ Domain pill bar · ❌ Hamburger menu · ❌ Persistent chat input bar
- ❌ DM Serif brief · ❌ Zaeli message bubbles (full-width pending Phase 5)

### What's new in v5
- ✅ ZaeliFAB — four buttons, forwardRef, mic exposed
- ✅ Landing overlay — time-window moment, swipe dismiss
- ✅ Dashboard Option A — editorial headlines, bento layout, tap to expand
- ✅ Word of the Day card — curated 400 words + Dictionary API
- ✅ Chat input bar — floating pill, replaces FAB when keyboard up
- ✅ Mic pill — full-width, Cancel + Send →, Whisper transcription
- 🔨 Pulse — Phase 6 · 🔨 Zen — Phase 8

---

## ══════════════════════════════════
## LANDING PAGE (LOCKED ✅)
## ══════════════════════════════════

Embedded as `LandingOverlay` in index.tsx. NOT a separate route.

**Time windows:** Morning 6–9am · Midday 12–2pm · Evening 5–8pm
**Dismiss:** swipe >50px OR FAB tap → fades out
**Brief:** 3 sentences, GPT-mini, max 180 chars, key facts in [brackets] → cyan

**Visual (LOCKED ✅):**
```
Background: #FFF6EC · #EDF6FF · #F5EEFF
Logo 'a'+'i': #F0C8C0 blush · Highlights: #0096C7 cyan
Brief: Poppins 600SemiBold 26px
```
`LANDING_TEST_MODE = true` — set false before launch.

---

## ══════════════════════════════════
## DASHBOARD — OPTION A (LOCKED ✅ 5 Apr 2026)
## ══════════════════════════════════

**The visual language of the whole app:**
> Every surface leads with one bold Poppins statement. Data lives behind the tap.

This is the differentiator. Every other family app shows you a grid of information. Zaeli shows you a sentence. It feels like someone who knows your family wrote it.

### Card order (FIXED — never rearranges)
1. **Calendar** — full width, dark slate `#3A3D4A`
2. **Dinner** — full width, peach `#FAC8A8`
3. **Weather** `#A8D8F0` + **Word of the Day** `#E8F4E8` — side by side
4. **Shopping** — full width, lavender `#D8CCFF` (white font)
5. **Actions** — full width, gold `#F0DC80`

### Zaeli voice headlines (formula-driven, zero AI cost)
```
Calendar: "3 things on today." / "All clear today." / "One thing on today."
Dinner:   "Pasta Carbonara for dinner tonight." / "Nothing planned for dinner."
Shopping: "23 things on the list." / "Shopping list is clear."
Actions:  "8 things on your plate." / "Nothing on your plate."
WotD:     the word itself — "ephemeral." in 26px purple
```

### Tap behaviour (LOCKED ✅)
- Tap card header → expands
- Tap header again → collapses
- One card expanded at a time — second tap collapses first
- No "Collapse" text — users learn by tapping
- Ghost numbers: Calendar only (clipped, barely visible, dark slate works)
- Shopping: white font on lavender (not dark), no ghost number
- Actions: no ghost number

### Smart time logic (LOCKED ✅)
- Calendar → Tomorrow: after 8pm OR all today's events past
- Dinner → Tomorrow: after 8pm
- Actions → evening mode: after 8pm ("on your plate tonight")
- Auto-refresh every 5 minutes (past events drop off automatically)

### Calendar card (LOCKED ✅)
- `+ Add` top right · event tap → inline expand
- Inline: notes, attendees, "✦ Edit with Zaeli" + Delete (two-tap)
- Delete: optimistic UI (instant) + Supabase background
- Footer: "Month view →" (navigates to calendar.tsx)
- `← Dashboard` back pill in Chat after any card-tap navigation

### Other cards — stress testing pending
Shopping, Actions, Dinner card taps → Chat context injection not yet wired for full prompts (Phase 5).

---

## ══════════════════════════════════
## WORD OF THE DAY (NEW ✅ 5 Apr 2026)
## ══════════════════════════════════

**Why it exists:** Something enjoyable for adults. Creates a product moment beyond family logistics. Conversation starter at dinner.

**Card:** `#E8F4E8` sage green · `#6B35D9` rich purple text
**Word selection:** 400 curated words in app code, seeded by day-of-year
- Same word all day, advances daily
- No repeats for 400+ days
- Never boring — all words hand-picked
- Update annually: swap `WOTD_LIST` in `dashboard.tsx`

**Collapsed:** Just the word. "ephemeral." Big, purple, full stop.
**Expanded:** Phonetic · part of speech · definition · example sentence · play button
**Audio:** Dictionary API MP3, expo-av playback. Play icon coral when playing.
**Definition:** `dictionaryapi.dev` — free, no API key needed, fetched on expand

**Two mics — design decision (LOCKED ✅):**
- **iOS system mic** (keyboard bottom right) — real-time dictation into text field, free, short messages
- **ZaeliFAB mic** — Whisper transcription, better for longer commands and family names, slight delay
- Both kept — different use cases, different users. Our mic is coral and prominent. iOS mic is system UI.

---

## ══════════════════════════════════
## ZAELIFAX + CHAT INPUT BAR (LOCKED ✅)
## ══════════════════════════════════

```
[ Dashboard ] | [ Chat ][ Mic ] | [ More ]
FAB_BTN=58px · borderRadius=36px
```

**FAB hides when keyboard active** → floating pill input bar takes its place.
**Mic pill** (above input bar): full width, waveform + Listening + Cancel/Send →.

**Chat input bar:**
- Same visual weight as FAB (same radius, shadow, height)
- `backgroundColor:transparent` — content visible behind (no banner)
- Mic button → triggers ZaeliFAB mic pill via `fabRef.current?.startMic()`
- FAB restores only when keyboard dismisses (onBlur), NOT on send

---

## ══════════════════════════════════
## NAVIGATION STORE (✅)
## ══════════════════════════════════

`lib/navigation-store.ts` — module-level, production ready.
Types: `edit_event` · `add_event` · `shopping` · `actions` · `meals`

---

## ══════════════════════════════════
## SHEETS (UNCHANGED ✅)
## ══════════════════════════════════

All 92% sheets unchanged. Calendar, Shopping, Meals — same design and behaviour.

---

## ══════════════════════════════════
## EVENT TIME CONTRACT (LOCKED ✅)
## ══════════════════════════════════

Store bare local datetime. Raw string parse. No timezone suffix. Ever.
✅ `"2026-04-01T16:00:00"` · ❌ Never `"...+10:00"`

---

## Pre-Launch Checklist

- [x] Calendar inline card + sheet complete
- [x] Shopping rebuild complete
- [x] Meals rebuild complete
- [x] API logging + admin dashboard
- [x] Chat persistence (home, shopping, calendar, meals)
- [x] Event time contract locked
- [x] Sheet design system locked
- [x] v5 architecture designed + prototyped
- [x] **ZaeliFAB Phase 1** ✅ (forwardRef, startMic exposed)
- [x] **Landing Phase 2** ✅
- [x] **Dashboard Phase 4 — Option A** ✅
  - [x] All 5 cards with Zaeli voice headlines
  - [x] Word of the Day (curated list + API)
  - [x] Calendar card full interaction
  - [x] Optimistic delete
  - [x] 5-minute auto-refresh
  - [x] Date in top bar
  - [x] Navigation store + Chat injection (calendar)
  - [x] "← Dashboard" back pill
- [x] **Chat input bar** ✅ (floating pill, FAB hides, mic wired)
- [x] **Mic pill** ✅ (full width, Cancel + Send →, Whisper)
- [ ] **Dashboard stress testing** ← IN PROGRESS
  - [x] Calendar card ✅
  - [ ] Dinner card
  - [ ] Shopping card
  - [ ] Actions card (todos tick)
  - [ ] Word of the Day (expand + audio)
- [ ] **Shopping/Actions/Dinner → Chat injection** (full prompts — Phase 5)
- [ ] **Navigation architecture Phase 3** — horizontal swipe + dots
- [ ] **Chat v5 updates Phase 5** — full-width Zaeli, two entry states
- [ ] **Pulse screen Phase 6**
- [ ] **Zen screen Phase 8**
- [ ] Landing: LANDING_TEST_MODE = false before launch
- [ ] Todos + Reminders build
- [ ] Kids Hub build
- [ ] Our Family build
- [ ] Notes build
- [ ] Tutor rebuild
- [ ] Travel build
- [ ] EAS build · TestFlight for Anna
- [ ] Real auth · Remove dev toggle
- [ ] Website + Stripe + onboarding
- [ ] Settings module
- [ ] Wire weather to real user location

---

## Key Product Moments

**The brief** — 3 sentences, Poppins 600 26px, warm cream. Earns its moment 3x/day.
**The dashboard** — One sentence per card. Tap to reveal. Editorial, not widget-like.
**The word** — "ephemeral." Something for the adults. Conversation at dinner.
**Dashboard → Chat** — Tap a card, Zaeli has context, keyboard ready. Seamless.
**The mic** — Speak to Zaeli. Whisper transcription. Family names handled.
**Pulse** — Zaeli noticed. The thing you didn't ask about.
**The all-done moment** — Everything handled. "Enjoy the evening."
