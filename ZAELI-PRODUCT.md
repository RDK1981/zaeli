# ZAELI-PRODUCT.md — Product Vision & Decisions
*Last updated: 5 April 2026 — Dashboard Phase 4 ✅ Calendar card interaction ✅ Chat injection ✅*

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
## V5 INTERFACE PHILOSOPHY (LOCKED ✅ 4 Apr 2026)
## ══════════════════════════════════

**Three screens. One FAB. No clutter.**

```
Pulse  ←  Dashboard  →  Chat
```

- **Dashboard** is the read surface — glance at your day
- **Chat** is the do surface — Zaeli handles everything
- **Pulse** is family awareness — swipe right
- **Landing** appears three times a day, then steps aside
- **ZaeliFAB** is the only navigation

### Core UX principle (LOCKED ✅ 5 Apr 2026)
**Dashboard = read. Chat = do. Keep users in Chat for 90% of activity.**

The flow: Dashboard (read) → Chat (do) → back to Dashboard (confirm).
Every card action routes to Chat so Zaeli can use full tool-calling.
Sheets still available for users who want direct field editing.

### What's gone in v5
- ❌ Domain pill bar
- ❌ Hamburger menu
- ❌ Persistent chat input bar
- ❌ DM Serif brief (now Poppins 600SemiBold 26px)
- ❌ Zaeli message bubbles (full-width, Phase 5 pending)

### What's new in v5
- ✅ ZaeliFAB — four buttons, device-tested
- ✅ Landing overlay — time-window moment, swipe dismiss
- ✅ Dashboard — fixed card stack, smart time logic
- ✅ Calendar card interaction — expand inline, Edit/Add → Chat injection
- ✅ Navigation store — production-ready Dashboard→Chat context passing
- ✅ "← Dashboard" back pill in Chat
- 🔨 Pulse — Phase 6
- 🔨 Zen — Phase 8

---

## ══════════════════════════════════
## LANDING PAGE (LOCKED ✅ Phase 2 Complete)
## ══════════════════════════════════

Embedded as `LandingOverlay` in index.tsx. NOT a separate route.

**Time windows:** Morning 6–9am · Midday 12–2pm · Evening 5–8pm
**Dismiss:** swipe >50px OR FAB tap → fades out
**Brief:** 3 sentences, GPT-mini, max 180 chars, key facts in [brackets] → cyan highlight

**Visual (LOCKED ✅):**
```
Background: #FFF6EC · #EDF6FF · #F5EEFF (solid for dev, gradient after EAS)
Logo 'a'+'i': #F0C8C0 warm blush
Highlights: #0096C7 cyan
Brief: Poppins 600SemiBold 26px
```

**Test mode:** `LANDING_TEST_MODE = true` in index.tsx — set false before launch.

---

## ══════════════════════════════════
## DASHBOARD (LOCKED ✅ Phase 4 Complete — 5 Apr 2026)
## ══════════════════════════════════

**File:** `app/(tabs)/dashboard.tsx`
Background `#FAF8F5`. ZaeliFAB only. No chat bar. No pills.

### Fixed card order (NEVER rearranges)
1. **Calendar** — dark slate `#3A3D4A`
2. **Weather + Shopping** — side by side
3. **Actions** — gold `#F0DC80`
4. **Dinner** — peach `#FAC8A8`

### Smart time logic (LOCKED ✅)
- **Calendar:** shows Today · switches to Tomorrow when all today done OR after 8pm
- **Dinner:** shows Tonight · switches to Tomorrow after 8pm
- **Actions:** evening mode after 8pm ("Put out tonight" + tomorrow morning preview)
- Card ORDER never changes — only the content inside adapts

### CalendarCard interaction (LOCKED ✅ 5 Apr 2026)

**Layout:**
- 3 events shown (not 4)
- `+ Add` button top right only
- Footer: "N more events ∨" left · "Full calendar →" right

**Event tap → inline expand:**
- Shows notes + attendees
- Two buttons: **✦ Edit with Zaeli** · **Delete** (two-tap confirm)

**Edit with Zaeli → Chat:**
- Sets navigation store context
- Chat injects: inline slate card (single event) + Zaeli prompt + chips
- Chips: Move the time · Add someone · Change location · Cancel it · Manual edit
- Keyboard pre-loads automatically

**+ Add → Chat:**
- Chat injects: Zaeli prompt + chips: Today · Tomorrow · This week · For the kids
- Keyboard pre-loads

**Full calendar →:**
- Opens calendar.tsx directly (existing sheet)

### Back to Dashboard from Chat
- "← Dashboard" back pill at top of Chat
- Appears when arrived from Dashboard card tap
- Disappears after user sends first message
- Grid FAB button always available as fallback

---

## ══════════════════════════════════
## NAVIGATION STORE (NEW ✅ 5 Apr 2026)
## ══════════════════════════════════

**File:** `lib/navigation-store.ts`

Production-ready module store for passing context between screens.
Same pattern as `getPendingCalendarImage` — already proven in codebase.

```typescript
setPendingChatContext({ type, event?, returnTo? })
getPendingChatContext()
clearPendingChatContext()
```

Types: `edit_event` · `add_event` · `shopping` · `actions` · `meals`
Extend this as other cards get wired up.

---

## ══════════════════════════════════
## CHAT (index.tsx) — PHASE 5 PENDING
## ══════════════════════════════════

**Currently working:** full tool-calling, persistence, inline cards, sheets.

**New in this session:**
- Reads navigation store on `useFocusEffect`
- Injects inline calendar card + Zaeli prompt + keyboard for edit/add flows
- `returnToDashboard` state drives "← Dashboard" back pill

**Phase 5 still to build:**
- Full-width Zaeli messages (no bubble)
- Fresh entry state: "Hey Rich. How can I help?" + chips
- Card-triggered entry state: inline card at top + contextual prompt

---

## ══════════════════════════════════
## ZAELIFAX SYSTEM (LOCKED ✅ Phase 1)
## ══════════════════════════════════

```
[ Dashboard ] | [ Chat ][ Mic ] | [ More ]
FAB_BTN=58px · borderRadius=36px · FAB_WIDTH=318px
```

More overlay 3×3: Notes · Kids Hub · Tutor / Travel · Family · Meals / Pulse · Zen · Settings

---

## ══════════════════════════════════
## SHEETS (UNCHANGED ✅)
## ══════════════════════════════════

All 92% sheets unchanged. Calendar, Shopping, Meals — same design.
Manual edit still available via "Manual edit" chip in Chat.

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
- [x] **ZaeliFAB Phase 1** ✅
- [x] index.tsx v5 updated (pills removed, FAB added)
- [x] **Landing Phase 2** ✅ — overlay, swipe dismiss working
- [x] **Dashboard Phase 4** ✅ — live cards, fixed order, smart time logic
- [x] **Calendar card interaction** ✅ — expand, Edit/Add → Chat, delete two-tap
- [x] **Navigation store** ✅ — `lib/navigation-store.ts`
- [x] **Chat injection** ✅ — inline card + prompt + keyboard on Dashboard entry
- [x] **"← Dashboard" back pill** ✅ — appears on Dashboard-triggered Chat entry
- [ ] **Navigation architecture Phase 3** ← NEXT — horizontal swipe + dots
- [ ] **Chat v5 updates Phase 5** — full-width Zaeli, two entry states
- [ ] **Pulse screen Phase 6** — `app/(tabs)/pulse.tsx`
- [ ] **Zen screen Phase 8** — `app/(tabs)/zen.tsx`
- [ ] Landing: real LinearGradient (needs EAS build)
- [ ] Landing: LANDING_TEST_MODE = false before launch
- [ ] Other cards → Chat injection (Shopping, Actions, Dinner)
- [ ] Shopping sheet tabs
- [ ] Meals sheet tabs
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
- [ ] Timezone full fix
- [ ] Wire weather to real user location

---

## Key Product Moments

**The brief** — 3 sentences, Poppins 600 26px, warm cream. Earns its moment 3x/day.
**The swipe** — One gesture. Left for conversation, right for family.
**The FAB** — Four buttons. Always there. Learnable in one use.
**Dashboard → Chat** — Tap a card, Zaeli has context, keyboard ready. Seamless.
**Pulse** — Zaeli noticed. The thing you didn't ask about. Word of mouth.
**The all-done moment** — Everything handled. "Enjoy the evening."
