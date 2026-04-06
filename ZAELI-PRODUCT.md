# ZAELI-PRODUCT.md — Product Vision & Decisions
*Last updated: 6 April 2026 — Swipe world built ✅ Brand pack ✅ Wordmark updated ✅*

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

### In progress / next
- 🔨 Phase 3b — My Space screen
- 🔨 Phase 5 — extract ChatPage.tsx + Chat v5
- 🔨 Phase 6 — AI Zaeli Noticed (GPT mini)

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
## WORDMARK & BRAND IDENTITY (LOCKED ✅ — updated this session)
## ══════════════════════════════════

**The wordmark:** `zaeli` — Poppins_800ExtraBold, `a` and `i` in sky blue `#A8D8F0`.

Previously used DM Serif Display — now locked as Poppins 800. The landing splash screen's font looked so much better that it became the new permanent standard.

**On light backgrounds:** `#0A0A0A` ink + `#A8D8F0` sky highlights
**On dark backgrounds:** `#ffffff` white + `#A8D8F0` sky highlights

**The ✦ mark (U+2756 — Black Four Pointed Star):**
- FAB button for My Space navigation only
- Active: `#A8D8F0` sky · Resting: `rgba(10,10,10,0.42)`
- Never used decoratively elsewhere

**Brand pack:** `zaeli-brand-pack-2026.html` — full reference document committed to repo root. Contains all colours, fonts, sizes, component specs, rules.

---

## ══════════════════════════════════
## LANDING PAGE (LOCKED ✅)
## ══════════════════════════════════

Lives in `swipe-world.tsx` — shows over all 3 pages (position:absolute, zIndex:1000).

**Visual:** Dark overlay `rgba(10,10,10,0.60)` · wordmark in white + sky `#A8D8F0` · tap anywhere to dismiss
**Brief:** Poppins 600SemiBold 26px · 3 sentences · max 180 chars
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

**3-dot indicator:**
- Dashboard/Chat active: `#FF4545` coral
- My Space active: `#A8D8F0` sky
- Inactive: `rgba(10,10,10,0.14)` · 5×5px
- Active: 16×5px pill · position:absolute bottom:112px iOS

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

### Calendar card (LOCKED ✅)
- Past events: muted 45% opacity, struck through, still tappable
- Headline forward-looking — "All clear for afternoon/evening" when all done
- `showCalTomorrow` flips after 8pm OR zero events today
- Tap row → inline expand: Edit/Reschedule with Zaeli · Delete (two-tap)
- Full-width "View Full Calendar →"

### Dinner card (LOCKED ✅)
- No duplicate header in expanded state
- Day column 92px — "Tomorrow" never wraps
- Tap day → inline expand: Edit with Zaeli · Delete · Move · More options
- Empty night → "✦ Plan [day] with Zaeli" full-width
- Full-width "Open Meal Planner →"
- `onEditMeal` → nav store `meals` type with meal + dateKey + dayAbbr

### Shopping card (LOCKED ✅)
- "Tap to see →" bright: `rgba(255,255,255,0.70)`
- "+N more" 17px Poppins_600SemiBold
- "+ Add" always visible in header
- Full-width "Open Shopping List →" → opens sheet directly
- `onOpenSheet` → nav store `shopping_sheet`

### Actions card (LOCKED ✅)
- Todos: `in('status',['active','done'])` — done items persist
- Checkbox = toggle (done↔active)
- Active sorted to top, done muted/struck below
- Tap row → inline expand: Edit with Zaeli · Delete · More options
- Full-width "Open All To-dos and Reminders →"

### Zaeli Noticed card (LOCKED ✅ — Phase 1 hardcoded)
- `#E8F4E8` sage · `#6B35D9` violet throughout
- Collapsed: label + count headline ("three things.") + tag summary
- Expanded: notice rows 14px + coloured dot → tap → Chat
- Phase 6: GPT mini generated, family-aware

### Full-width bottom buttons (all cards)
`borderRadius:14` · `paddingVertical:14` · `Poppins_700Bold` 15px

---

## ══════════════════════════════════
## ZAELI NOTICED (✅ — Phase 1 hardcoded)
## ══════════════════════════════════

**What it is:** Zaeli surfaces things worth your attention — without you having to ask.
**Phase 1:** 3 hardcoded notices drawn from real family data context
**Phase 6:** GPT mini generated, family-aware, time-sensitive, Zaeli voice

---

## ══════════════════════════════════
## MY SPACE (DESIGNED ✅ — Phase 3b to build)
## ══════════════════════════════════

Rich's personal world. Swipe right from Chat (page 2).
Same card language as Dashboard. Mockup: `zaeli-myspace-v4.html`.

| Card | Colour | Collapsed headline |
|------|--------|--------------------|
| Health | `#3A3D4A` slate | "6,842 steps so far today." |
| Goals | `#F0DC80` gold | "Three things to work toward." |
| Word of the Day | `#E8F4E8` sage | "ephemeral." *(italic violet)* |
| NASA APOD | `#3A3D4A` slate | "Saturn's rings, today." |
| Zen | `#FAC8A8` peach | "Four meditations ready for you." |
| Notes | `#D8CCFF` lavender | "Three notes on the go." |
| Wordle | `#F0DC80` gold | "12-day streak. Keep it going." 🔥 |

Build approach: extract `HomeScreen` from `index.tsx` into `app/components/ChatPage.tsx` first, then build `my-space.tsx` as page 2 in swipe-world.tsx.

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
- [x] ZaeliFAB Phase 1 — 4 buttons ✅
- [x] ZaeliFAB updated — 5 buttons, ✦ My Space, user colour ✅
- [x] Landing Phase 2 ✅
- [x] Dashboard Phase 4 ✅
- [x] Chat input bar ✅
- [x] Dashboard stress testing — ALL 5 CARDS ✅
- [x] All Dashboard → Chat context injection wired ✅
- [x] Quick reply chip intercepts ✅
- [x] **Phase 3 — swipe-world.tsx container** ✅ (Chat is placeholder)
- [x] Wordmark updated — Poppins 800, sky blue a+i ✅
- [x] Brand pack — zaeli-brand-pack-2026.html ✅
- [ ] **Phase 3b — My Space screen** ← NEXT
- [ ] **Phase 5 — extract ChatPage.tsx + Chat v5**
- [ ] Phase 6 — AI Zaeli Noticed (GPT mini)
- [ ] Todos sheet
- [ ] Notes sheet (family + personal)
- [ ] Travel sheet
- [ ] Tutor rebuild
- [ ] Kids Hub
- [ ] Our Family
- [ ] HealthKit integration
- [ ] NASA APOD integration
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
