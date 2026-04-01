# ZAELI-PRODUCT.md — Product Vision & Decisions
*Last updated: 1 April 2026 — Single interface concept ✅ Domain pill bar ✅ Sheets concept ✅ Time fixes ✅*

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

## Interface Philosophy (UPDATED ✅ 1 Apr 2026)

**Everything lives in Home. One conversation. One interface.**

Zaeli is the only navigation. No hamburger, no grid, no tab bar, no channel pages visible to users.

**9 domain pills** always float above chat input: Home · Calendar · Shopping · Meals · To-dos · Notes · Travel · Family · More

**Pill tap** → inline coloured card drops into chat thread + GPT-mini follow-up 400ms later.
**"Full ›"** on any card → 80% bottom sheet for deeper interaction.
**Sheets** = workspaces, not destinations. Max 2 levels. Close on confirm.

Kids Hub + Tutor remain standalone — sustained attention use cases requiring full screen focus.
Avatar tap → Kids Hub · Tutor · Settings · Sign out.

---

## Design Rules (LOCKED)

- Channel bg = banner + status bar ONLY. Body = `#FAF8F5` warm white.
- No left-border accent strips on any cards — dots, icons, badges only.
- Send button = `#FF4545` coral always.
- Our Family = the only channel with no chat bar.
- Wordmark: DM Serif 40px, letterSpacing -1.5, lineHeight 44. 'a' and 'i' in channel AI colour.
- **NEW: Colour lives ONLY in inline chat card renders. 80% sheets = clean black/grey.**

---

## Brand & Colour System (LOCKED)

| Channel | Banner bg | AI colour | Accent |
|---------|-----------|-----------|--------|
| Home | `#F5EAD8` | `#A8D8F0` Sky Blue | `#0A7A3A` |
| Calendar | `#B8EDD0` | `#F0C8C0` Warm Blush | `#0A7A3A` |
| Shopping | `#EDE8FF` Lavender | `#D8CCFF` Deeper Lavender | `#5020C0` |
| Meals | `#FAC8A8` | `#A8E8CC` Fresh Green | `#C84010` |
| Kids Hub | `#A8E8CC` | `#FAC8A8` Warm Peach | `#0A6040` |
| Tutor | `#D8CCFF` | `#A8E8CC` Fresh Green | `#5020C0` |
| To-dos | `#F0DC80` | `#D8CCFF` Lavender | `#806000` |
| Notes | `#C8E8A8` | `#F0C8C0` Warm Blush | `#2A6010` |
| Travel | `#A8D8F0` | `#B8EDD0` Soft Mint | `#0060A0` |
| Our Family | `#F0C8C0` | `#D8CCFF` Lavender | `#A01830` |

Family: Rich `#4D8BFF` · Anna `#FF7B6B` · Poppy `#A855F7` · Gab `#22C55E` · Duke `#F59E0B`

---

## Splash Screen (LOCKED)
Bg: `#A8E8CC` · Wordmark: DM Serif 96px, ink + `#FAC8A8` peach on 'a' and 'i'
Greeting: Poppins 400 18px · Tagline: "LESS CHAOS. MORE FAMILY." Poppins 500 12px uppercase

---

## ══════════════════════════════════
## SINGLE INTERFACE CONCEPT (LOCKED ✅ 1 Apr 2026)
## ══════════════════════════════════

### The vision
Everything in one conversation. No navigating away. No separate chat that gets lost.
Dedicated channel pages still exist in code but are hidden from users — accessible via "Full ›" sheets only.

### Inline vs Sheet rule
**Inline** (no sheet needed): seeing events, ticking todos/shopping, meal plan glance, quick add via chat.
**Sheet** (needs deeper work): browse favourites, edit event, full list, recipe detail, full todo history.
Rule: one tap or one message → inline. Browse/compare/multi-field → sheet.

### Sheet design (LOCKED)
- Clean black/grey — no channel colour
- Handle bar + title + close button
- Tab pills for sub-views
- Confirm button (channel accent) + ghost cancel at bottom
- Chat thread always underneath

### Domain pills (Option D SVG — LOCKED)
Horizontal, 18×18 SVG icon + label. Solid white pill, thin border.
~80% of chat bar height. Channel palette bg when active. Calendar = dark slate active.
Reference: `zaeli-svg-pills-v1.html`

### Mockup reference
`zaeli-single-interface-v1.html` — 7 screens. Build from this exactly.

---

## ══════════════════════════════════
## HOME CHANNEL (LOCKED ✅ 1 Apr 2026)
## ══════════════════════════════════

### Cold open sequence
1. Zaeli brief (DM Serif 26px) — live data fetch, formula-driven, max 2 sentences
2. "Today's overview" toggle — auto-opens 200ms after brief
3. Card stagger: Calendar 0ms → Weather+Shopping 150ms → Actions 300ms → Dinner 450ms
4. 900ms after brief → post-card Zaeli follow-up + 3 chips in chat thread
5. Domain pill bar always floating

### Brief formula (NON-NEGOTIABLE — 160 max tokens)
EXACTLY 2 SHORT sentences. Name the person. Most urgent first. Confirm one win.
[brackets] = italic. Morning=direct. Evening=calm. All-done=reward moment.
Banned: "breathing room" + all persona banned words.

### Card order (time state)
AM: Calendar → Weather+Shopping → Actions → Dinner
PM: Dinner → Calendar → Actions → Weather+Shopping
Evening: Calendar(tomorrow) → Actions → Weather+Shopping → Dinner(tomorrow)

### Card font sizes (LOCKED)
- Content: Poppins 400 17px (event titles, items, actions)
- Dinner name: Poppins 800 19px
- Eye labels/times/buttons: 11–13px
- Empty states: 16px italic

---

## ══════════════════════════════════
## EVENT TIME CONTRACT (LOCKED ✅ 1 Apr 2026)
## ══════════════════════════════════

**Store bare local datetime. Raw string parse. No timezone suffix. Ever.**

✅ `"2026-04-01T16:00:00"` stored → raw parse reads 16 → shows 4:00 pm
❌ `"2026-04-01T16:00:00+10:00"` stored → Supabase converts to UTC → raw parse reads 06 → shows 6:00 am

`fmtTime()` and `isoToMinutes()` in both files: raw string parse only.
All 5 save paths in calendar.tsx + EventDetailModal in index.tsx: bare local datetime.

**Pre-launch timezone task:** Full fix needed before multi-timezone commercial launch.
Store true UTC, display via `Intl.DateTimeFormat` with stored `timezone` field.

---

## ══════════════════════════════════
## SHOPPING / PANTRY (LOCKED ✅)
## ══════════════════════════════════

Three tabs: List · Pantry · Spend — one shared chat.
```
shopping_items: id, family_id, name, item, checked, completed, category, meal_source
NO 'quantity' column. Render: item.name || item.item. Query: .neq('checked', true)
```

### Pantry — Last Bought model (LOCKED ✅ 1 Apr 2026)
Stock bars removed. Shows "last bought [date]" per item.
Photo scan logs items as purchased (not stock levels).
Receipts = primary data source. Zaeli reasons from purchase frequency.

---

## ══════════════════════════════════
## TODOS + REMINDERS (LOCKED ✅ — not yet built)
## ══════════════════════════════════

`#F0DC80` / `#D8CCFF` / `#806000`. Todos = DO. Reminders = REMEMBER.
Three tabs: Mine | Family | Reminders.
Two-touch nudge system. Recurrence support.

### Supabase table (NOT YET CREATED)
```sql
create table reminders (
  id uuid default gen_random_uuid() primary key,
  family_id uuid not null, title text not null,
  about_member_id uuid, remind_at timestamptz not null,
  recurrence text default 'none', recurrence_day integer,
  two_touch bool default true, evening_sent bool default false,
  acknowledged bool default false, acknowledged_at timestamptz,
  created_by uuid, created_at timestamptz default now()
);
```
Mockup: `zaeli-todos-reminders-v2.html` (5 screens)

---

## ══════════════════════════════════
## MEALS (LOCKED ✅ 1 Apr 2026)
## ══════════════════════════════════

Three tabs: Dinners · Recipes · Favourites. Sonnet tool-calling. `useChatPersistence('meals')`.
Primary date field: `day_key`. cook_ids always parsed via parsedMeals.

---

## ══════════════════════════════════
## TUTOR MODULE (LOCKED ✅)
## ══════════════════════════════════

Premium A$9.99/child/month. Standalone. Socratic method. Foundation–Year 12.
Mockup: `zaeli-tutor-final-mockup-v4.html` (11 screens).

---

## ══════════════════════════════════
## KIDS HUB (LOCKED ✅)
## ══════════════════════════════════

Family plan. `#A8E8CC` / `#FAC8A8` / `#0A6040`. Standalone.
Mockup: `zaeli-kids-hub-rewards-v2.html`.

---

## ══════════════════════════════════
## OUR FAMILY (LOCKED ✅)
## ══════════════════════════════════

`#F0C8C0` / `#D8CCFF` / `#A01830`. NO chat bar.
Single interface: Family pill → 80% sheet.
Mockup: `zaeli-our-family-mockup-v1.html` (6 screens).

---

## ══════════════════════════════════
## TRAVEL (NOT YET DESIGNED)
## ══════════════════════════════════

Travel pill → 80% sheet: Trips · Itinerary · Packing · Notes.
Design session needed before build.

---

## ══════════════════════════════════
## NOTES (LOCKED ✅)
## ══════════════════════════════════

`#C8E8A8` / `#F0C8C0` / `#2A6010`. Not AI-connected v1.
Mockup: `zaeli-notes-mockup-v1.html` (5 screens).

---

## Key Product Moments

**The brief** — Two sentences. Specific. Named. Earns its place every morning.
**The pill tap** — One tap, live data, Zaeli follows up. Never navigated away.
**The all-done moment** — Everything sorted. "Enjoy the evening." Feels like a reward.
**"Zaeli noticed"** — Unprompted flags. Trust. Word of mouth.
**Sheets as workspaces** — Deeper work without losing conversation underneath.
**Persistent conversation** — Leave and come back, still there. 24hr memory.

---

## Pre-Launch Checklist
- [x] Home — single interface complete (brief + stagger + pills + post-card)
- [x] Calendar complete + time fix
- [x] Shopping rebuild complete
- [x] Meals rebuild complete
- [x] Domain pill bar (SVG Option D, 9 pills, palette active colours)
- [x] Pantry last-bought model
- [x] API logging + admin dashboard
- [x] Chat persistence (home, shopping, calendar, meals)
- [x] Event time contract locked (raw parse, no +10:00)
- [x] Single interface HTML mockups complete
- [x] All channels designed (Todos, Tutor, Kids, Family, Notes)
- [ ] **80% sheets build** ← NEXT PRIORITY
- [ ] Create reminders Supabase table
- [ ] Todos + Reminders build
- [ ] Kids Hub build
- [ ] Our Family build (sheet-based)
- [ ] Notes build
- [ ] Tutor rebuild
- [ ] Travel design + build
- [ ] EAS build · TestFlight for Anna
- [ ] Real auth · Remove dev toggle
- [ ] Website + Stripe + onboarding
- [ ] Settings module
- [ ] Timezone full fix (pre-launch requirement)
- [ ] Wire weather to real user location
