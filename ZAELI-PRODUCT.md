# ZAELI-PRODUCT.md — Product Vision & Decisions
*Last updated: 4 April 2026 — ZaeliFAB Phase 1 ✅ Landing Phase 2 ✅ v5 architecture locked ✅*

---

## What Zaeli Is

Zaeli is an iOS-first AI family life platform for Australian families with children. A switched-on family assistant that knows your family's life — through conversation, not data entry.

**Tagline:** Less chaos. More family.

---

## Zaeli's Voice (LOCKED)

Sharp, warm, genuinely enthusiastic about this family. Finds the funny angle through delight, not detachment. Energy matches the moment: get-up-and-go in the morning, calm and settled at night.

**Hard rules:** Never 'mate'. Never starts with 'I'. Plain text only. Always ends on a confident offer. Be proportionate.
**Banned:** 'queued up', 'sorted', 'tidy', 'chaos', 'ambush', 'sprint', 'locked in', 'breathing room', 'quick wins', 'you've got this', 'make it count'.

---

## Target Market

Australian families with children. Priority: dual-income metro couples with primary school-aged kids.
**Revenue:** A$14.99/month family · A$9.99/child/month Tutor · 100% web sales.

---

## ══════════════════════════════════
## V5 INTERFACE PHILOSOPHY (LOCKED ✅ 4 Apr 2026)
## ══════════════════════════════════

**Three screens. One FAB. No clutter.**

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
- ❌ DM Serif for the brief (now Poppins 600SemiBold at 26px)
- ❌ Zaeli message bubbles (now full-width editorial text)

### What's new in v5
- ✅ ZaeliFAB — four buttons, device-tested, sizing locked
- ✅ Landing overlay — time-window moment, embedded in index.tsx, swipe dismiss
- ✅ Dashboard — dedicated screen (Phase 4)
- ✅ Pulse — family awareness third tab (Phase 6)
- ✅ Zen — 5 min breathing tool in More (Phase 8)
- ✅ Mic v2 pill — floating waveform above FAB
- ✅ More overlay — 3×3 grid, SVG icons, channel colours

---

## ══════════════════════════════════
## LANDING PAGE (LOCKED ✅ Phase 2 Complete — 4 Apr 2026)
## ══════════════════════════════════

Landing is a **timed emotional moment**, not a permanent screen.

**Implementation:** Embedded as `LandingOverlay` component inside `index.tsx`.
NOT a separate expo-router route — this avoids all navigation blank screen issues.
`LandingGate` is the default export and checks time window + dismiss flag before mounting overlay.

**Appears during:**
- Morning window: 6:00am – 9:00am
- Midday window: 12:00pm – 2:00pm
- Evening window: 5:00pm – 8:00pm

**Dismisses:** swipe (dx or dy > 50px) OR any FAB button tap. Fades out, HomeScreen visible beneath.
**Outside windows:** `LandingOverlay` never mounts, HomeScreen renders directly.
**Dismiss persistence:** FileSystem `landing_flags.json`, key = `YYYY-MM-DD-[morning|midday|evening]`.
**Brief:** 3 sentences, GPT-mini, max 180 chars. Key facts in [square brackets] → cyan `#0096C7` highlight.

**Visual spec (LOCKED ✅):**
```
Background:  Morning #FFF6EC · Midday #EDF6FF · Evening #F5EEFF (solid, gradient needs EAS)
Logo:        DM Serif 36px · 'a' and 'i' → #F0C8C0 warm blush (all windows)
Greeting:    Poppins 600, 13px, uppercase, rgba(10,10,10,0.35)
Brief:       Poppins 600SemiBold, 26px, lineHeight 38, letterSpacing -0.5
Highlights:  #0096C7 cyan (all windows) — cool against warm cream, not alarming
Dots:        3 dots, active = 20px pill, paddingBottom 28 — no swipe hint text
ZaeliFAB:   present, all buttons call onDismiss()
```

**Colour decisions and rationale (documented for future reference):**
- Tried `#FF4545` coral → too alarming on morning cream
- Tried `#E8601A` terracotta → blends into warm background, looks meh
- Tried `#D8CCFF` lavender → too pale, disappears on cream
- Tried `#A8D8F0` sky blue for logo → too much blue with cyan highlights
- **Settled:** `#F0C8C0` blush logo + `#0096C7` cyan highlights — warm/cool contrast works

---

## ══════════════════════════════════
## DASHBOARD (LOCKED ✅ Phase 4 — 4 Apr 2026)
## ══════════════════════════════════

**Phase 4 NEXT after navigation architecture.**
Dedicated screen. Background `#FAF8F5`. ZaeliFAB only — no chat bar, no pills.

**Card stack (top to bottom):**
1. Calendar — dark slate `#3A3D4A`
2. Weather + Shopping — 50/50 side by side
3. Today's Actions — gold tint `#FFFCE6`
4. Dinner tonight — peach tint `#FFF1E8`

**Card tap:** navigates to Chat with that domain's context injected.

---

## ══════════════════════════════════
## CHAT (LOCKED ✅ 4 Apr 2026)
## ══════════════════════════════════

**Two entry states (Phase 5):**
1. **Fresh** (Chat FAB tap) — "Hey Rich. How can I help?" + 3 chips
2. **Card-triggered** (Dashboard card tap) — inline card + contextual Zaeli message

**Zaeli message style (v5 — Phase 5 pending):**
Full width. No bubble. Small "Zaeli" label above. Poppins 400, full width.
User replies: right-aligned dark bubble as before.

**Keyboard:** second tap on Chat FAB (button goes coral).
**Voice:** Mic FAB button.
**No persistent input bar.** Locked.

---

## ══════════════════════════════════
## ZAELIFAX SYSTEM (LOCKED ✅ Phase 1 Complete — 4 Apr 2026)
## ══════════════════════════════════

```
[ Dashboard ] | [ Chat ][ Mic ] | [ More ]
```

Sizing locked on device. Button size 58×58px. BorderRadius 36px. FAB_WIDTH 318px.

**More overlay — 3×3 grid (LOCKED ✅):**
```
Notes     · Kids Hub · Tutor
Travel    · Family   · Meals
Pulse     · Zen      · Settings  ← always bottom-right
```

---

## ══════════════════════════════════
## NAVIGATION ARCHITECTURE (Phase 3 — to build)
## ══════════════════════════════════

Horizontal three-screen swipe world. Dot indicator (3 dots).
Build order revised: **Phase 4 (Dashboard) first, then Phase 3 (navigation).**
Reason: swipe architecture is more satisfying once destination screens have real content.

---

## ══════════════════════════════════
## PULSE (LOCKED ✅ 4 Apr 2026)
## ══════════════════════════════════

Family awareness layer. Access via swipe right from Dashboard or Pulse in More.
Three zones: Zaeli Noticed · Family Activity · On the Horizon.
Live pulsing coral dot in header.

---

## ══════════════════════════════════
## ZEN (LOCKED ✅ 4 Apr 2026)
## ══════════════════════════════════

5-minute breathing/meditation tool. More overlay → Zen.
Full screen, standalone. No ZaeliFAB. Tap to start/pause. Back button exits.

---

## ══════════════════════════════════
## MIC V2 (LOCKED ✅ 4 Apr 2026)
## ══════════════════════════════════

Floating pill above FAB — same width, same borderRadius. 7 coral waveform bars.
Cancel → dismisses. Successful input → injected into chat via send().

---

## ══════════════════════════════════
## SHEETS (UNCHANGED ✅)
## ══════════════════════════════════

All 92% sheets completely unchanged in v5.
Calendar, Shopping, Meals — same design and behaviour.

---

## ══════════════════════════════════
## CALENDAR MODULE (LOCKED ✅ 2 Apr 2026)
## ══════════════════════════════════

Inline card: dark slate `#3A3D4A`, expand in-place spring animation.
Sheet: 92% height, today/tomorrow/month tabs. Unchanged in v5.

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
- [x] v5 architecture designed + prototyped — 4 Apr 2026
- [x] **ZaeliFAB Phase 1** — built, device tested, sizing locked ✅
- [x] index.tsx v5 updated (pills removed, FAB added)
- [x] **Landing Phase 2** — overlay in index.tsx, swipe dismiss working ✅
- [x] dashboard.tsx stub created (route warning silenced)
- [x] settings.tsx stub created (route warning silenced)
- [ ] **Dashboard screen Phase 4** ← NEXT (building before Phase 3)
- [ ] **Navigation architecture Phase 3** — horizontal swipe + dots
- [ ] **Chat screen v5 updates Phase 5** — full-width Zaeli, two entry states
- [ ] **Pulse screen Phase 6** — `app/(tabs)/pulse.tsx`
- [ ] **Zen screen Phase 8** — `app/(tabs)/zen.tsx`
- [ ] Landing: real LinearGradient (needs EAS build)
- [ ] Landing: LANDING_TEST_MODE = false before launch
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

**The brief** — Poppins 600, 26px, warm cream background. 3 sentences. Personality in sentence 3. Earns its moment three times a day then steps aside.
**The swipe** — One gesture reveals your day. Left for conversation, right for family.
**The FAB** — Four buttons. Always there. Always the same. Learnable in one use.
**Pulse** — Zaeli noticed. The thing you didn't ask about. Word of mouth.
**The all-done moment** — Everything handled. "Enjoy the evening." Feels like a reward.
**Sheets as workspaces** — Deeper work without losing the conversation underneath.
**Persistent conversation** — Leave and come back, brief restores. 24hr memory.
