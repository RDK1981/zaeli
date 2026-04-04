# ZAELI-PRODUCT.md — Product Vision & Decisions
*Last updated: 4 April 2026 — ZaeliFAB Phase 1 complete ✅ v5 architecture locked ✅*

---

## What Zaeli Is

Zaeli is an iOS-first AI family life platform for Australian families with children. A switched-on family assistant that knows your family's life — through conversation, not data entry.

**Tagline:** Less chaos. More family.

---

## Zaeli's Voice (LOCKED)

Sharp, warm, genuinely enthusiastic about this family. Finds the funny angle through delight, not detachment. Energy matches the moment: get-up-and-go in the morning, calm and settled at night.

**Hard rules:** Never 'mate'. Never starts with 'I'. Plain text only. Always ends on a confident offer. Be proportionate. Banned: 'queued up', 'sorted', 'tidy', 'chaos', 'ambush', 'sprint', 'locked in', 'breathing room'.

---

## Target Market

Australian families with children. Priority: dual-income metro couples with primary school-aged kids.
**Revenue:** A$14.99/month family · A$9.99/child/month Tutor · 100% web sales.

---

## ══════════════════════════════════
## V5 INTERFACE PHILOSOPHY (LOCKED ✅ 4 Apr 2026)
## ══════════════════════════════════

**Three screens. One FAB. No clutter.**

The app revolves around three screens connected by smooth horizontal swipe:

```
Pulse  ←  Dashboard  →  Chat
```

- **Dashboard** is the operational hub — your day at a glance
- **Chat** is how you talk to Zaeli — swipe left or tap Chat in FAB
- **Pulse** is family awareness — what everyone's doing, swipe right
- **Landing** appears three times a day as an emotional anchor, then steps aside
- **ZaeliFAB** is the only navigation — always present, always the same
- **More overlay** gives access to all other channels and tools
- **Sheets** are workspaces — 92% height, open from cards and chat, unchanged

### What's gone in v5
- ❌ Domain pill bar (9 pills above chat)
- ❌ Hamburger menu + NavMenu component
- ❌ Persistent chat input bar
- ❌ DM Serif for the brief (now Poppins 700Bold)
- ❌ Zaeli message bubbles (now full-width editorial text)

### What's new in v5
- ✅ ZaeliFAB — four buttons, device-tested, locked sizing
- ✅ Landing — time-window moment, full gradient, Poppins brief
- ✅ Dashboard — dedicated screen, cards only, no chat bar
- ✅ Pulse — family awareness third tab
- ✅ Zen — 5 min breathing tool in More
- ✅ Mic v2 pill — floating waveform above FAB, matches FAB width
- ✅ More overlay — 3×3 grid, SVG icons, channel colours, matches FAB width

---

## ══════════════════════════════════
## HOME LAYOUT DESIGN JOURNEY (LOCKED ✅ 4 Apr 2026)
## ══════════════════════════════════

This section documents the design exploration and decisions made during the v5 workshop.

### Problem identified
Original home screen had too many competing heroes: banner + brief + card stack + Zaeli follow-up + floating pill bar. Anna's feedback: "too busy."

### Inspiration
Sync (task app), Blank Spaces (journaling), Linear/Notion — all share: generous whitespace, confident typography, restraint as a design choice.

### Key insight: brief font
DM Serif Italic was "borrowed elegance." Poppins 700Bold IS Zaeli — the same font as every button and label, now given full weight at display size. More confident. More consistent. **Locked: brief = Poppins 700Bold.**

### Key insight: no chat input bar
Removing the persistent input bar gives Zaeli's messages more breathing room and makes the interface feel like an ambient intelligence rather than a chat app. Keyboard triggered by second tap on Chat FAB button. **Locked: no persistent input bar.**

### Key insight: FAB replaces all navigation
One consistent floating element replaces pill bar + hamburger + send button. Learnable in one use. Four buttons: Dashboard · Chat · Mic · More. **Locked: ZaeliFAB is the only navigation.**

### Key insight: Pulse as third tab
Family awareness deserves tab-level prominence, not a More submenu. Swipe right from Dashboard. Three zones: Zaeli Noticed · Family Activity · On the Horizon. **Locked: Pulse = third screen.**

---

## ══════════════════════════════════
## LANDING PAGE (LOCKED ✅ 4 Apr 2026)
## ══════════════════════════════════

Landing is a **timed emotional moment**, not a permanent screen.

**Appears during:**
- Morning window: 6:00am – 9:00am
- Midday window: 12:00pm – 2:00pm
- Evening window: 5:00pm – 8:00pm

**Dismisses:** on first swipe. Gone for that window.
**Outside windows:** app opens directly to Dashboard.
**Brief:** pre-generated, waiting. No load delay. Max 2 sentences, Poppins 700Bold 21px.

**Three gradient states:**
- Morning: warm amber `#FFF6EC → #FFDEB8`
- Midday: cool blue `#EDF6FF → #C4DFFF`
- Evening: soft purple `#F5EEFF → #D8C8F8`

**Logo AI letter colour complements gradient:**
- Morning (warm) → cyan `#0096C7`
- Midday (cool) → magenta `#D4006A`
- Evening (purple) → terracotta `#E8601A`

**No swipe hint text.** Dots are the only navigation signal.

---

## ══════════════════════════════════
## DASHBOARD (LOCKED ✅ 4 Apr 2026)
## ══════════════════════════════════

Dedicated screen. Background `#FAF8F5`. ZaeliFAB only — no chat bar, no pills.

**Card stack (top to bottom):**
1. Calendar — dark slate `#3A3D4A`
2. Weather + Shopping — 50/50 side by side
3. Today's Actions — gold tint `#FFFCE6`
4. Dinner tonight — peach tint `#FFF1E8`

**Card tap:** navigates to Chat screen with that domain's context injected.
Different cards = different inline cards + Zaeli opening messages.

---

## ══════════════════════════════════
## CHAT (LOCKED ✅ 4 Apr 2026)
## ══════════════════════════════════

**Two entry states:**
1. **Fresh** (Chat FAB tap) — "Hey Rich. How can I help?" + 3 chips
2. **Card-triggered** (Dashboard card tap) — inline card at top + contextual Zaeli message

**Zaeli message style (v5):**
Full width. No bubble. Small "Zaeli" label above. Poppins 400, full width.
User replies: right-aligned dark bubble as before.

**Keyboard:** second tap on Chat FAB (button goes coral).
**Voice:** Mic FAB button.
**No persistent input bar.** Locked.

**All existing chat functionality unchanged:**
- Tool-calling via Sonnet
- Inline card renders (calendar slate card etc)
- Chat persistence (24hr, 30 message cap)
- Quick reply chips
- Sheets opening from chat actions

---

## ══════════════════════════════════
## ZAELIFAX SYSTEM (LOCKED ✅ Phase 1 Complete — 4 Apr 2026)
## ══════════════════════════════════

```
[ Dashboard ] | [ Chat ][ Mic ] | [ More ]
```

Always present. Same on every screen. Never changes.

**Sizing locked on device (tested ✅):**
- Button size: 58×58px
- Bar: borderRadius 36px, glass blur backdrop
- Mic pill + More card: same width as FAB, same borderRadius, floats above with clean gap

**Button states:**
- Dashboard: dark when active
- Chat: dark at rest · coral when keyboard open
- Mic: coral when listening · waveform pill appears above FAB
- More: coral when overlay open · goes dark when closed

**More overlay — 3×3 grid (LOCKED ✅):**
```
Notes     · Kids Hub · Tutor
Travel    · Family   · Meals
Pulse     · Zen      · Settings  ← always bottom-right
```
SVG icons, thin stroke, channel colours, 10% opacity bg tiles.
Grows from More button. Backdrop blur. Full gap above FAB — no overlap.

---

## ══════════════════════════════════
## PULSE (LOCKED ✅ 4 Apr 2026)
## ══════════════════════════════════

Family awareness layer. Access via swipe right from Dashboard or Pulse in More.

**Three zones:**
1. **Zaeli Noticed** — aqua-tinted cards, unprompted observations
2. **Family Activity** — white cards, what each person completed/added
3. **On the Horizon** — cobalt-tinted, countdown days to upcoming events

---

## ══════════════════════════════════
## ZEN (LOCKED ✅ 4 Apr 2026)
## ══════════════════════════════════

5-minute breathing/meditation tool. Accessed from More overlay.
Full screen, standalone. No ZaeliFAB (Zen = break from the app).
Breathing animation + countdown. Tap to start/pause. Back button exits.

---

## ══════════════════════════════════
## MIC V2 (LOCKED ✅ 4 Apr 2026)
## ══════════════════════════════════

Floating pill grows above FAB — same width, same borderRadius as FAB bar.
Animated waveform (7 coral bars), "Listening…" label, Cancel button.
Clean gap between pill and FAB — no overlap.
Cancel → dismisses. Successful input → injected into chat via send().

---

## ══════════════════════════════════
## SHEETS (UNCHANGED ✅)
## ══════════════════════════════════

All existing 92% sheets completely unchanged in v5.
Calendar, Shopping, Meals sheets — same design and behaviour.
Sheet design system applies to all future sheets (Todos, Kids, Family etc).

---

## ══════════════════════════════════
## CALENDAR MODULE (LOCKED ✅ 2 Apr 2026)
## ══════════════════════════════════

### Inline card (COMPLETE ✅)
Dark slate `#3A3D4A`. Expand in-place spring animation. Never opens sheet.
Action chips: ✦ Edit with Zaeli · Move time · Add someone · Manual edit · Delete (two-tap)

### Sheet (COMPLETE ✅ 2 Apr 2026)
92% height, opens instantly. Three tabs: Today · Tomorrow · Month. Unchanged in v5.

### v5 trigger change
Calendar card triggered from Dashboard card tap (not pill tap).
Chat opens with calendar inline card injected at top.

---

## ══════════════════════════════════
## SHEET DESIGN SYSTEM (LOCKED ✅ 2 Apr 2026)
## ══════════════════════════════════

```
Height: 92%, bg: #FAF8F5, borderTopRadius: 24
Open INSTANTLY → fetch async
Backdrop: TouchableOpacity (NOT Pressable)
Sheets = clean black/grey (no channel colour)
```

---

## ══════════════════════════════════
## DELETE PATTERNS (LOCKED ✅ 2 Apr 2026)
## ══════════════════════════════════

Always two-tap. Three locations:
1. Inline card expanded chip: Delete → Confirm delete (chip turns red)
2. Sheet event card: Delete → Confirm delete inline
3. Sheet edit form: "Delete event" → "Keep it" / "Yes, delete event"

---

## ══════════════════════════════════
## EVENT TIME CONTRACT (LOCKED ✅)
## ══════════════════════════════════

**Store bare local datetime. Raw string parse. No timezone suffix. Ever.**
✅ `"2026-04-01T16:00:00"` · ❌ Never `"...+10:00"`

---

## ══════════════════════════════════
## SHOPPING / PANTRY (LOCKED ✅)
## ══════════════════════════════════

Three tabs: List · Pantry · Spend. Pantry = Last Bought model. Receipts = primary source.

---

## Pre-Launch Checklist

- [x] Calendar inline card + sheet complete
- [x] Shopping rebuild complete
- [x] Meals rebuild complete
- [x] API logging + admin dashboard
- [x] Chat persistence (home, shopping, calendar, meals)
- [x] Event time contract locked
- [x] Inline card interaction patterns locked
- [x] Delete patterns locked
- [x] Sheet design system locked
- [x] v5 architecture designed + prototyped (HTML mockups) — 4 Apr 2026
- [x] **ZaeliFAB Phase 1 — built, device tested, sizing locked** ✅ — 4 Apr 2026
- [x] index.tsx v5 updated (pills removed, FAB added, mic overlay removed)
- [ ] **Landing screen** ← Phase 2 NEXT — `app/(tabs)/landing.tsx`
- [ ] **Navigation architecture** ← Phase 3 — `_layout.tsx`
- [ ] **Dashboard screen** ← Phase 4 — `app/(tabs)/dashboard.tsx`
- [ ] **Chat screen v5 updates** ← Phase 5 — full-width Zaeli, two entry states
- [ ] **Pulse screen** ← Phase 6 — `app/(tabs)/pulse.tsx`
- [ ] **Zen screen** ← Phase 8 — `app/(tabs)/zen.tsx`
- [ ] Shopping sheet (List · Pantry · Spend tabs)
- [ ] Meals sheet (Dinners · Recipes · Favourites tabs)
- [ ] Create reminders Supabase table
- [ ] Todos + Reminders build
- [ ] Kids Hub build
- [ ] Our Family build
- [ ] Notes build
- [ ] Tutor rebuild
- [ ] Travel design + build
- [ ] EAS build · TestFlight for Anna
- [ ] Real auth · Remove dev toggle
- [ ] Website + Stripe + onboarding
- [ ] Settings module
- [ ] Timezone full fix
- [ ] Wire weather to real user location

---

## Key Product Moments

**The brief** — Poppins bold, 21px, full-screen gradient. Earns its moment three times a day then steps aside.
**The swipe** — One gesture reveals your day. Left for conversation, right for family.
**The FAB** — Four buttons. Always there. Always the same. Learnable in one use.
**Pulse** — Zaeli noticed. The thing you didn't ask about. Word of mouth.
**The all-done moment** — Everything sorted. "Enjoy the evening." Feels like a reward.
**Sheets as workspaces** — Deeper work without losing the conversation underneath.
**Persistent conversation** — Leave and come back, brief restores. 24hr memory.
