# ZAELI-PRODUCT.md — Product Vision & Decisions
*Last updated: 7 April 2026 — My Space Phase 3b complete ✅*

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

### What's gone in v5
- ❌ Domain pill bar · ❌ Hamburger menu · ❌ Persistent chat input bar
- ❌ Pulse as a dedicated swipe screen · ❌ Zen as a dedicated screen · ❌ WotD on Dashboard

### What's complete in v5
- ✅ ZaeliFAB — 5 buttons, ✦ My Space, forwardRef mic, user colour
- ✅ Landing overlay — in swipe-world.tsx, time-window logic
- ✅ swipe-world.tsx — horizontal container, dots, FAB, landing
- ✅ Dashboard Option A — all 5 cards stress tested
- ✅ All Dashboard → Chat context injection wired
- ✅ Wordmark updated — Poppins_800ExtraBold, sky blue a+i
- ✅ Brand pack — zaeli-brand-pack-2026.html
- ✅ My Space — Phase 3b complete, all 7 cards, 4 sheets

### In progress / next
- 🔨 Phase 5 — extract ChatPage.tsx + Chat v5
- 🔨 Phase 6 — AI Zaeli Noticed (GPT mini)
- 🔨 Todos sheet

---

## ══════════════════════════════════
## SCREEN ARCHITECTURE (LOCKED ✅)
## ══════════════════════════════════

**Three navigable screens:**
```
Dashboard (0)  →  Chat (1)  →  My Space (2)
```
App opens on Dashboard. Swipe right → Chat. Swipe right again → My Space.

**92% SHEETS over Chat:**
Calendar · Shopping · Meal Planner · Todos / Reminders · Notes · Travel

**Dedicated full screens:**
Tutor · Kids Hub · Our Family · Settings

---

## ══════════════════════════════════
## WORDMARK & BRAND IDENTITY (LOCKED ✅)
## ══════════════════════════════════

**The wordmark:** `zaeli` — Poppins_800ExtraBold, `a` and `i` in sky blue `#A8D8F0`.

**On light backgrounds:** `#0A0A0A` ink + `#A8D8F0` sky highlights
**On dark backgrounds:** `#ffffff` white + `#A8D8F0` sky highlights

**The ✦ mark (U+2756 — Black Four Pointed Star):**
- FAB button for My Space navigation only
- Active: `#A8D8F0` sky · Resting: `rgba(10,10,10,0.42)`
- Never used decoratively elsewhere

**Brand pack:** `zaeli-brand-pack-2026.html` — committed to repo root.

---

## ══════════════════════════════════
## LANDING PAGE (LOCKED ✅)
## ══════════════════════════════════

Lives in `swipe-world.tsx` — shows over all 3 pages (position:absolute, zIndex:1000).

**Visual:** Dark overlay `rgba(10,10,10,0.60)` · wordmark in white + sky `#A8D8F0` · tap anywhere to dismiss
**`LANDING_TEST_MODE = true`** in swipe-world.tsx — set false before launch.

Time windows: Morning 6–9am · Midday 12–2pm · Evening 5–8pm

---

## ══════════════════════════════════
## ZAELIFAX — 5 BUTTONS (LOCKED ✅)
## ══════════════════════════════════

```
[ Grid ] | [ Chat ][ Mic ] | [ ✦ ][ ··· ]
```

**Navigation mapping:**
- Grid (Dashboard) → scrollTo page 0
- Chat → scrollTo page 1 (or keyboard if already on Chat)
- Mic → startMic() via fabRef
- ✦ (My Space) → scrollTo page 2
- ··· (More) → More overlay

**Active colours:** Dashboard/Chat = dark · Mic/More = coral · My Space ✦ = sky `#A8D8F0`

**More overlay — full app map:**
- Family section (sheets): Calendar · Shopping · Meals · Todos · Notes · Travel
- Screens section (navigate): Tutor · Kids Hub · Our Family
- Settings (quiet row)

---

## ══════════════════════════════════
## DASHBOARD — OPTION A (LOCKED + STRESS TESTED ✅)
## ══════════════════════════════════

**Card order (FIXED):**
1. Calendar — `#3A3D4A` slate
2. Dinner — `#FAC8A8` peach
3. Weather `#A8D8F0` + Zaeli Noticed `#E8F4E8` — side by side
4. Shopping — `#D8CCFF` lavender (white font)
5. Actions — `#F0DC80` gold

All 5 cards stress tested. Full interaction spec in CLAUDE.md.

---

## ══════════════════════════════════
## ZAELI NOTICED (✅ — Phase 1 hardcoded)
## ══════════════════════════════════

**What it is:** Zaeli surfaces things worth your attention — without you having to ask.
**Phase 1:** 3 hardcoded notices drawn from real family data context
**Phase 6:** GPT mini generated, family-aware, time-sensitive, Zaeli voice

---

## ══════════════════════════════════
## MY SPACE (✅ Phase 3b complete)
## ══════════════════════════════════

Rich's personal world. Swipe right from Chat (page 2).
Same card language and sizing as Dashboard. Built in `app/(tabs)/my-space.tsx`.

| Card | Colour | Interaction | Data |
|------|--------|-------------|------|
| Health | `#3A3D4A` slate | Inline expand | Hardcoded — HealthKit later |
| Goals | `#F0DC80` gold | Tap 1 = inline · Tap goal = 92% sheet · + Add = 92% sheet | Hardcoded — Supabase `goals` table later |
| Word of the Day | `#E8F4E8` sage | Inline expand + SVG play | Hardcoded — rotating word list later |
| NASA APOD | `#3A3D4A` slate | Inline expand | Hardcoded — NASA API later |
| Zen | `#FAC8A8` peach | Inline expand + SVG play/pause | Hardcoded — expo-audio later |
| Notes | `#D8CCFF` lavender | Tap → 92% sheet | Hardcoded — Supabase `personal_notes` later |
| Wordle | `#F0DC80` gold | Tap → 92% sheet, full grid + keyboard | Hardcoded — game logic later |

**Card sizing (locked — matches dashboard exactly):**
- `borderRadius: 22` · `padding: 22`
- Headlines: `Poppins_700Bold` 24px · letterSpacing -0.5 · lineHeight 30
- Body text: 17px (matches dashboard `tEv`) · Meta: 13px (matches `tTime`)
- Ghost numbers: DMSerifDisplay 88px · right -8 · top -18

**92% sheets pattern (locked — matches platform):**
- `height: H * 0.92` · `borderTopLeftRadius: 24` · `borderTopRightRadius: 24`
- Handle: 36×4px · `rgba(10,10,10,0.14)` · centred · marginTop 12
- Header: title 18px Poppins_700Bold + subtitle + ✕ close button
- Body: paddingHorizontal 20 · paddingTop 16 · flex 1

**Goals two-tap flow:**
1. Tap card → inline expand showing all 3 goals (icon, name, progress bar, %)
2. Tap individual goal row → 92% detail sheet (progress bar, detail text, Zaeli box, CTA)
3. "+ Add goal" in expanded card → 92% new goal sheet

---

## ══════════════════════════════════
## NAVIGATION STORE (✅)
## ══════════════════════════════════

`lib/navigation-store.ts`
Types: `edit_event` · `add_event` · `shopping` · `shopping_sheet` · `actions` · `meals` · `noticed`
To add: `my_space_goal` for Goal → Chat injection

---

## Pre-Launch Checklist

- [x] v5 architecture locked
- [x] ZaeliFAB — 5 buttons, ✦, userColor ✅
- [x] Landing overlay ✅
- [x] Dashboard Option A — all 5 cards ✅
- [x] Chat input bar ✅
- [x] Dashboard stress testing — ALL 5 CARDS ✅
- [x] All Dashboard → Chat context injection wired ✅
- [x] Quick reply chip intercepts ✅
- [x] swipe-world.tsx container ✅
- [x] Wordmark updated — Poppins 800, sky blue a+i ✅
- [x] Brand pack — zaeli-brand-pack-2026.html ✅
- [x] **My Space — Phase 3b — all 7 cards, 4 sheets ✅**
- [ ] **Phase 5 — extract ChatPage.tsx + Chat v5** ← NEXT
- [ ] Phase 6 — AI Zaeli Noticed (GPT mini)
- [ ] Todos sheet
- [ ] Notes sheet (family)
- [ ] Travel sheet
- [ ] Tutor rebuild
- [ ] Kids Hub
- [ ] Our Family
- [ ] HealthKit integration (My Space Health card)
- [ ] NASA APOD integration (My Space NASA card)
- [ ] WotD rotating word list (My Space WotD card)
- [ ] expo-audio for Zen card
- [ ] Supabase `goals` table (My Space Goals)
- [ ] Supabase `personal_notes` table (My Space Notes)
- [ ] Wordle game logic (My Space Wordle)
- [ ] `LANDING_TEST_MODE = false` before launch
- [ ] EAS build · TestFlight for Anna
- [ ] Real auth
- [ ] Website + Stripe + onboarding

---

## Key Product Moments

**The brief** — 3 sentences, Poppins 600 26px. Earns its moment 3x/day.
**The dashboard** — One sentence per card. Tap to reveal. Editorial, not widget-like.
**Zaeli noticed** — "Poppy's assignment is due tomorrow." Zaeli knew before you asked.
**My Space** — Rich's world. Steps, goals, word, astronomy, calm, notes, Wordle. One swipe right.
**Dashboard → Chat** — Tap a card, Zaeli has context, keyboard ready. Seamless.
**The sheet** — Slides up over Chat. Data without leaving the conversation.
**The all-done moment** — Everything handled. "Enjoy the evening."
