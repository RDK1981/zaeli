# ZAELI-PRODUCT.md — Product Vision & Decisions
*Last updated: 4 April 2026 — v5 architecture locked ✅ Three-screen world ✅ FAB ✅ Pulse ✅ Landing ✅*

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

The app revolves around three screens connected by a smooth horizontal swipe:

```
Pulse  ←  Dashboard  →  Chat
```

- **Dashboard** is the operational hub — your day at a glance
- **Chat** is how you talk to Zaeli — swipe left or tap Chat in FAB
- **Pulse** is family awareness — what everyone's doing, swipe right from Dashboard
- **Landing** appears three times a day as an emotional anchor moment, then steps aside
- **FAB** (floating action bar) is the only navigation — always present, always the same
- **More** overlay gives access to all other channels and tools
- **Sheets** are workspaces — 92% height, open from cards and chat, unchanged from v4

### What's gone in v5
- ❌ Domain pill bar (9 pills above chat)
- ❌ Hamburger menu
- ❌ Persistent chat input bar
- ❌ DM Serif for the brief (now Poppins 700Bold)
- ❌ Zaeli message bubbles (now full-width editorial text)

### What's new in v5
- ✅ FAB — four buttons, always visible, every screen
- ✅ Landing — time-window moment screen, full gradient, Poppins brief
- ✅ Dashboard — dedicated screen, cards only, no chat bar
- ✅ Pulse — family awareness third tab
- ✅ Zen — 5 min breathing tool in More
- ✅ Mic v2 pill — floating waveform above FAB
- ✅ More overlay — 3×3 floating card, SVG icons, channel colours

---

## ══════════════════════════════════
## LANDING PAGE (LOCKED ✅ 4 Apr 2026)
## ══════════════════════════════════

Landing is a **timed emotional moment**, not a permanent screen.

**Appears during:**
- Morning window: 6:00am – 9:00am
- Midday window: 12:00pm – 2:00pm
- Evening window: 5:00pm – 8:00pm

**Dismisses:** on first swipe in any direction. Gone for that window.
**Outside windows:** app opens directly to Dashboard. Landing not shown.
**Brief:** pre-generated and waiting. No load delay. Max 2 sentences, Poppins 700Bold 21px.

**Three gradient states:**
- Morning: warm amber `#FFF6EC → #FFDEB8`
- Midday: cool blue `#EDF6FF → #C4DFFF`
- Evening: soft purple `#F5EEFF → #D8C8F8`

**Logo AI letter colour complements gradient (never matches):**
- Morning (warm bg) → cyan `#0096C7`
- Midday (cool bg) → magenta `#D4006A`
- Evening (purple bg) → terracotta `#E8601A`

**No swipe hint text.** Dots are the only navigation signal.

---

## ══════════════════════════════════
## DASHBOARD (LOCKED ✅ 4 Apr 2026)
## ══════════════════════════════════

Dedicated screen. Background `#FAF8F5`. FAB only — no chat bar, no pills.

**Card stack (top to bottom):**
1. Calendar — dark slate `#3A3D4A`
2. Weather + Shopping — 50/50 side by side
3. Today's Actions — gold tint `#FFFCE6`
4. Dinner tonight — peach tint `#FFF1E8`

**Card tap:** navigates to Chat screen with that domain's context injected.
Different cards inject different inline cards and Zaeli opening messages.

---

## ══════════════════════════════════
## CHAT (LOCKED ✅ 4 Apr 2026)
## ══════════════════════════════════

**Two entry states:**

1. **Fresh** (Chat FAB button tap) — Zaeli intro only: "Hey Rich. How can I help?" + 3 chips
2. **Card-triggered** (Dashboard card tap) — inline card at top + contextual Zaeli message

**Zaeli message style (v5):**
Full width. No bubble. Small "Zaeli" label above. Poppins 400, 13px, full width.
User replies: right-aligned dark bubble as before.

**Keyboard:** opened by tapping Chat FAB button a second time.
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
## PULSE (LOCKED ✅ 4 Apr 2026)
## ══════════════════════════════════

**Pulse is the family awareness layer** — a calm scroll of what is happening across the whole family. Not a notification feed. More like a noticeboard.

**Access:** swipe right from Dashboard, or tap Pulse in More overlay.

**Three zones:**

### 1. Zaeli Noticed
Aqua-tinted cards. Zaeli's unprompted observations.
- Missed pickups, missing ingredients, overdue tasks, upcoming conflicts
- Generated by GPT-mini on screen open or on schedule
- Tone: calm observation, never alarm

### 2. Family Activity
White cards. What each family member has done.
- Completed todos, added events, ticked shopping, finished homework
- Avatar in family colour, domain badge on right
- Reads from events, todos, shopping_items tables

### 3. On the Horizon
Cobalt-tinted cards. Upcoming dates worth knowing.
- Birthdays, school holidays, travel dates, events 7–30 days away
- Large countdown number (DM Serif, cobalt), event name, status note

---

## ══════════════════════════════════
## FAB SYSTEM (LOCKED ✅ 4 Apr 2026)
## ══════════════════════════════════

```
[ Dashboard ]  |  [ Chat ]  [ Mic ]  |  [ More ]
```

Always present. Same on every screen. Never changes shape or position.

**Dashboard:** dark when active. Navigates to Dashboard.
**Chat:** dark when on Chat at rest. Coral when keyboard open. Second tap = keyboard.
**Mic:** coral when recording. Opens Mic v2 pill above FAB.
**More:** no active state. Opens/closes More overlay card.

**More overlay — 3×3 grid (LOCKED):**
```
Notes     · Kids Hub · Tutor
Travel    · Family   · Meals
Pulse     · Zen      · Settings
```
Settings always bottom-right. Zen always bottom-centre.
SVG icons, thin stroke, channel colours, 10% opacity bg tiles.
Floats above FAB. Full backdrop blur. Grows from More button upward.

---

## ══════════════════════════════════
## MIC V2 (LOCKED ✅ 4 Apr 2026)
## ══════════════════════════════════

Floating pill grows above FAB when Mic is tapped.
Animated waveform bars (coral), "Listening…" text, Cancel button.
No full-screen overlay. Minimal. Purposeful.
Cancel → pill dismisses. Successful input → Chat opens with message injected.

---

## ══════════════════════════════════
## ZEN (NEW ✅ 4 Apr 2026)
## ══════════════════════════════════

5-minute breathing/meditation tool. Accessed from More overlay.
Full screen, standalone. No FAB (Zen is a break from the app).
Breathing animation + countdown. Single tap start/pause. Back button exits.

---

## ══════════════════════════════════
## SHEETS (UNCHANGED ✅)
## ══════════════════════════════════

All existing 92% sheets are completely unchanged in v5.
Calendar sheet, Shopping sheet, Meals sheet — all same design and behaviour.
They open from card taps and chat actions exactly as before.
Sheet design system still applies to all future sheets (Todos, Kids, Family etc).

---

## ══════════════════════════════════
## CALENDAR MODULE (LOCKED ✅ 2 Apr 2026)
## ══════════════════════════════════

### Inline card (COMPLETE ✅)
Dark slate `#3A3D4A` card in chat thread. Shows today/tomorrow events.
Event rows → tap to expand in-place (spring animation). Never opens sheet.
Expanded: title, time, location, avatars, action chips.
Action chips: ✦ Edit with Zaeli · Move time · Add someone · Manual edit · Delete (two-tap)

### Sheet (COMPLETE ✅ 2 Apr 2026)
92% height, opens instantly (data populates async after open).
Three tabs: Today · Tomorrow · Month.
Header: SVG calendar icon + "Calendar" title. X closes sheet, ‹ backs from form.
Unchanged in v5.

### Card/pill tap behaviour (LOCKED ✅)
In v5: calendar card is triggered from Dashboard card tap, not pill.
Behaviour after tap: Chat opens with calendar inline card injected at top.

---

## ══════════════════════════════════
## SHEET DESIGN SYSTEM (LOCKED ✅ 2 Apr 2026)
## ══════════════════════════════════

Apply this pattern to ALL future domain sheets (Shopping, Meals, Todos, Notes, Travel, Family).
Unchanged from v4. See CLAUDE.md for full spec.

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

✅ `"2026-04-01T16:00:00"` stored → raw parse reads 16 → shows 4:00 pm
❌ `"2026-04-01T16:00:00+10:00"` stored → Supabase converts to UTC → wrong time

---

## ══════════════════════════════════
## SHOPPING / PANTRY (LOCKED ✅)
## ══════════════════════════════════

Three tabs: List · Pantry · Spend — one shared chat.

### Pantry — Last Bought model (LOCKED ✅)
Stock bars removed. Shows "last bought [date]" per item.
Photo scan logs items as purchased (not stock levels).
Receipts = primary data source.

---

## Pre-Launch Checklist

- [x] Calendar inline card complete + polish
- [x] Calendar sheet complete (Today/Tomorrow/Month, edit, delete, add)
- [x] Shopping rebuild complete
- [x] Meals rebuild complete
- [x] API logging + admin dashboard
- [x] Chat persistence (home, shopping, calendar, meals)
- [x] Event time contract locked
- [x] Inline card interaction patterns locked
- [x] Delete patterns locked
- [x] Sheet design system locked
- [x] v5 architecture designed + prototype locked (4 Apr 2026)
- [ ] **ZaeliFAB component** ← Phase 1 NEXT
- [ ] **Landing screen** ← Phase 2
- [ ] **Navigation architecture** ← Phase 3
- [ ] **Dashboard screen** ← Phase 4
- [ ] **Chat screen v5 updates** ← Phase 5
- [ ] **Pulse screen** ← Phase 6
- [ ] **Zen screen** ← Phase 8
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
**Pulse** — Zaeli noticed. The thing you didn't ask about that she flagged anyway. Word of mouth.
**The all-done moment** — Everything sorted. "Enjoy the evening." Feels like a reward.
**Sheets as workspaces** — Deeper work without losing the conversation underneath.
**Persistent conversation** — Leave and come back, brief restores. 24hr memory.
