# ZAELI-PRODUCT.md — Product Vision & Decisions
*Last updated: 1 April 2026 — Home card stack rebuild ✅ Pass 1 + Pass 2 complete ✅*

---

## What Zaeli Is

Zaeli is an iOS-first AI family life platform for Australian families with children. A switched-on family assistant that knows your family's life — through conversation, not data entry.

**Tagline:** Less chaos. More family.

---

## Zaeli's Voice (LOCKED)

Sharp, warm, genuinely enthusiastic about this family. Finds the funny angle through delight, not detachment. Energy matches the moment: get-up-and-go in the morning, calm and settled at night.

**Hard rules:** Never 'mate'. Never starts with 'I'. Plain text only. Always ends on a confident offer. Be proportionate. Banned: 'queued up', 'sorted', 'tidy', 'chaos', 'ambush', 'sprint', 'locked in'.

---

## Target Market

Australian families with children. Priority: dual-income metro couples with primary school-aged kids.
**Revenue:** A$14.99/month family · A$9.99/child/month Tutor · 100% web sales.

---

## Interface Philosophy

Everything is a channel. Channels are persistent chats where data renders inline. Zaeli is the only navigation — no hamburger, no grid, no tab bar.

**Avatar tap →** Our Family · Tutor · Settings · Sign out.

Only Home generates a brief on cold open. No brief on channel transitions.

---

## Design Rules (LOCKED)

- Channel bg = banner + status bar ONLY. Body = `#FAF8F5` warm white.
- No left-border accent strips on any cards — dots, icons, badges only.
- Send button = `#FF4545` coral always.
- Our Family = the only channel with no chat bar.
- Wordmark: DM Serif 40px, letterSpacing -1.5, lineHeight 44. 'a' and 'i' in channel AI colour.
- Channel name label: Poppins 600 16px rgba(0,0,0,0.45) — right of logo row.

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

**Note — Shopping updated 31 Mar:** banner changed from `#F0E880` yellow to `#EDE8FF` lavender.
**Shopping 'a' and 'i':** `#A8E8CC` mint.

Family: Rich `#4D8BFF` · Anna `#FF7B6B` · Poppy `#A855F7` · Gab `#22C55E` · Duke `#F59E0B`

---

## Splash Screen (LOCKED)
Bg: `#A8E8CC` · Wordmark: DM Serif 96px, ink + `#FAC8A8` peach on 'a' and 'i'
Greeting: Poppins 400 18px · Tagline: "LESS CHAOS. MORE FAMILY." Poppins 500 12px uppercase

---

## CHAT EXPERIENCE PRINCIPLES (LOCKED ✅ 31 Mar 2026)

### Single chat per channel (Calendar model)
Each channel has ONE shared chat thread across all its views/tabs.

### Chat persistence (24hr TTL)
`lib/use-chat-persistence.ts` — expo-file-system, 24hr TTL, 30-msg cap, debounced saves.
Keys in use: `'home'` | `'shopping'` | `'calendar'` | `'meals'`

### Quick reply chips — actions only
Chips must only suggest things Zaeli can actually DO. Never suggest displaying data already visible.

### Claude Sonnet for tool-calling channels
Shopping, Calendar, Meals, Home chat all use Claude Sonnet. GPT-mini for briefs only.

### Up/down scroll arrows
All scrollable channels: side-by-side floating up/down arrows (bottom-right, above chat bar).
Implemented: Shopping ✅ · Calendar ✅ · Meals ✅ · Home ✅

---

## ══════════════════════════════════
## HOME CHANNEL — CARD STACK (LOCKED ✅ 1 Apr 2026)
## ══════════════════════════════════

### The shift
Home is a hybrid: glanceable card stack scrolls away, Zaeli conversation below.

### Layout (scrollable — hero no longer fixed)
1. **Fixed banner** — slim warm bar, wordmark + nav only
2. **Date divider** — thin line + date label
3. **Zaeli eyebrow** — ✦ Zaeli + timestamp (Option B)
4. **Hero text** — DM Serif italic, brief opener
5. **Card stack** — time-state ordered
6. **"Earlier today" divider**
7. **Chat thread** — brief detail + messages

### Banner hero line (LOCKED — in scrollable section, not fixed banner)
DM Serif 22px. Rendered with `renderHeroText()` — [bracketed] words render italic.

**AM:** *"Hope the soccer went well, Gab. [Big morning ahead], Rich."*
**PM:** *"Hope the surf ski was good. [Nothing sorted for dinner yet] — worth a thought."*
**Evening:** *"Gab scored the winner. [Poppy's swimming at 8am] — early one."*

### Card order by time state
**AM (5am–12pm):** Calendar → Weather+Shopping → Actions → Dinner
**PM (12pm–8pm):** Dinner (leads if unplanned) → Calendar → Actions → Weather+Shopping
**Evening (8pm–5am):** Tomorrow calendar → Actions (tonight + tomorrow AM sections) → Weather+Shopping → Tomorrow dinner

### Card specs (ALL LOCKED)

**Calendar — slate `#3A3D4A` (full width, padding 20)**
- Eye label: "📅 Today · Tue 1 Apr" + weather inline
- 4 events default. "X more ›" expands inline. "Show less ∧" collapses.
- Rows: time left-aligned (Poppins 500 13px muted) · colour dot · event title + emoji AFTER (Poppins 400 17px) · member avatars (30px)
- + Add → Zaeli inline. Full → Calendar channel.
- AM = today full · PM = rest of today · Evening = tomorrow

**Weather — sky blue `#A8D8F0` (two-col, fixed 115px)**
- Open-Meteo, Tewantin coords until real location wired
- Animated icons: sun pulses, cloud drifts, rain drops, storm flashes
- Read only, no + Add.

**Shopping — lavender `#D8CCFF` (two-col, flex 1)**
- Header: + Add · Full → top right
- Up to 3 items (Poppins 400 17px). Render: `item.name || item.item`
- **Item count BIG bottom right** — large Poppins 800 number + "items" label
- + Add → Zaeli inline: "What do you need to pick up?"

**Today's actions — gold `#F0DC80` (full width, padding 20)**
- Header: count badge · + Add · Full → top right
- Circle tick LEFT — tapping writes `done:true` to Supabase, optimistic UI, Zaeli quiet ack in chat
- Ticked: circle fills dark, text greys + strikethrough, 0.45 opacity — stays visible
- Content text: Poppins 400 17px
- Badges: Reminder (red) · Overdue (dark red) · Todo (gold)
- **Evening state — two sections:**
  - "🌙 Put out tonight" — circle ticks, actionable
  - "🌅 Tomorrow morning" — NO circles, FYI only (pulled from early tomorrow calendar events)
- + Add → Zaeli inline: "What do you need to remember or do?"

**Dinner — terracotta `#FAC8A8` (full width, padding 20)**
- Planned: emoji · meal name (Poppins 800 19px) · prep note · "✓ Planned" right
- Unplanned: gentle nudge + "Quick idea 💡"
- **Footer: "Next 7 days ›"** — expands inline 7-day meal strip within the card (zero extra API calls)
- 7-day strip: day label · meal + emoji · ✓ or "Nothing yet ⚠" · unplanned count in footer
- "Open meal planner ›" → Meals channel. "Close ∧" collapses.
- Evening: shows tomorrow's dinner

### + Add interaction (LOCKED)
Tap + Add → Zaeli opens inline prompt in chat thread. Scrolls to bottom. Focuses input.
Never opens a modal, never navigates away.

### Font sizes in cards (LOCKED)
- Content text: Poppins 400 17px (matches chat thread text size)
- Dinner meal name: Poppins 800 19px (hero)
- Eye labels / times / buttons: 11–13px (UI chrome, smaller by design)
- Empty states: 16px italic

### Live data
- All cards fetch fresh on mount + every `useFocusEffect` via `loadCardData()`
- After any tool action: `setTimeout(loadCardData, 1200)`
- Weather: Open-Meteo free API, no key, Tewantin coords

### Deferred / next Home session
- Wire weather to real user location
- Actions circle un-tick (Todos channel handles for now)
- "All done" evening state — green card
- Review individual card UX based on device usage

---

## Calendar Channel (LOCKED ✅)
Two-row mint banner. Day strip. Event cards. Month view. Tool-calling. Whisper mic overlay. API logging.
Chat persistence (24hr) · Up/down scroll arrows · Greeting guard · Action-only chips.

---

## SHOPPING CHANNEL (REBUILT ✅ 31 Mar 2026)

### Critical column names
```
shopping_items: id, family_id, name, item, checked, completed, category, meal_source, created_at
NO 'quantity' column. Render: item.name || item.item
Query unchecked: .neq('checked', true)
```

### Three tabs, one chat
List · Pantry · Spend — all share one conversation.

### Tools
`add_shopping_item` · `remove_shopping_item` · `tick_shopping_item` · `clear_shopping_list`

---

## TODOS + REMINDERS CHANNEL (LOCKED ✅ — not yet built)

`#F0DC80` gold banner · `#D8CCFF` lavender AI colour · `#806000` accent · `#FAF8F5` body.

### Core principle
**Todos = things you DO. Reminders = things you REMEMBER.**

### Three tabs: Mine | Family | Reminders

### Reminders tab (LOCKED ✅)
Bell states: 🔔 Active (red) · 🔔 Upcoming (amber) · 🔔 Recurring (gold) · ✓ Acknowledged (grey)
Two-touch nudge: evening before + morning of (7am) if not acknowledged.
Recurrence: None / Daily / Weekly / Monthly.

### Supabase table (NOT YET CREATED)
```sql
create table reminders (
  id uuid default gen_random_uuid() primary key,
  family_id uuid not null,
  title text not null,
  about_member_id uuid,
  remind_at timestamptz not null,
  recurrence text default 'none',
  recurrence_day integer,
  two_touch bool default true,
  evening_sent bool default false,
  acknowledged bool default false,
  acknowledged_at timestamptz,
  created_by uuid,
  created_at timestamptz default now()
);
```

**Mockup:** `zaeli-todos-reminders-v2.html` — 5 screens

### Connection to Home card
- Today's reminders → gold Actions card with "Reminder" badge (red)
- Evening → "🌅 Tomorrow morning" section (no circles — FYI only)
- Tomorrow morning events currently pulled from calendar events before 10am as a proxy until reminders table is built

---

## TUTOR MODULE (LOCKED ✅)
Premium A$9.99/child/month. Standalone. Socratic method. Foundation–Year 12.
GPT-5.4-mini (chat) · Sonnet (photos) · Whisper (voice). 6 pillars. 3 difficulty bands.
Mockup: `zaeli-tutor-final-mockup-v4.html` (11 screens).

---

## KIDS HUB (LOCKED ✅)
Family plan. `#A8E8CC` / `#FAC8A8` / `#0A6040`.
Jobs: Daily/Weekly/One-off · GIPHY on every tick · archive · pause.
Points (Philosophy B): spent on redemption, parent approves, games earn zero.
Mockup: `zaeli-kids-hub-rewards-v2.html`.

---

## OUR FAMILY (LOCKED ✅)
`#F0C8C0` / `#D8CCFF` / `#A01830`. Avatar menu. **NO chat bar.**
Mockup: `zaeli-our-family-mockup-v1.html` (6 screens).

---

## NOTES CHANNEL (LOCKED ✅)
`#C8E8A8` / `#F0C8C0` / `#2A6010`. Simple and beautiful — not AI-connected v1.
Mockup: `zaeli-notes-mockup-v1.html` (5 screens).

---

## Key Product Moments

**"Zaeli noticed"** — flags things unprompted. Builds trust, drives word of mouth.
**The brief** — Home cold open. Only here. Never on channel transitions.
**Instant action** — Real Supabase write, confirmed immediately. Zaeli never lies about what she did.
**The all-done moment** — Evening state, everything sorted. "Enjoy the evening." Should feel like a reward.
**The tomorrow morning section** — Seeing "Anna on school run 8:30" at 9pm. Zaeli knows what matters before you wake up.
**Persistent conversation** — Leave a channel and come back, your conversation is still there. 24hr memory.
**Card overflow** — "3 more ›" on calendar. Dinner accordion. Keeps cards glanceable but data accessible.

---

## Competitive Position
Real threat: Apple agentic Siri (18–30 months).
Moat: family context, persistent memory, Tutor + Kids Hub ecosystem, card stack experience.

---

## Pre-Launch Checklist
- [x] Home channel — card stack complete (Pass 1 + Pass 2)
- [x] Calendar channel complete + persistence + arrows
- [x] Shopping channel major rebuild complete (lavender, Sonnet, persistence)
- [x] Meals channel full rebuild complete
- [x] API logging working
- [x] Admin dashboard live
- [x] Chat persistence hook (lib/use-chat-persistence.ts) — wired to all 4 main channels
- [x] Up/down scroll arrows (Shopping + Calendar + Meals + Home)
- [x] Mic recording overlay (Home + Calendar + Shopping)
- [x] Tool-calling (Home + Calendar + Shopping + Meals)
- [x] Weather card — Open-Meteo live, animated icons
- [x] Calendar card overflow expand/collapse
- [x] Dinner 7-day accordion inline
- [x] Actions card circle tick → Supabase + Zaeli ack
- [x] Home card data refresh after tool actions
- [x] Todos + Reminders designed (5 screens)
- [x] Tutor designed (11 screens)
- [x] Kids Hub designed
- [x] Our Family designed (6 screens)
- [x] Notes designed (5 screens)
- [ ] Create reminders Supabase table (SQL above)
- [ ] Todos + Reminders build (todos.tsx)
- [ ] Kids Hub build (kids.tsx)
- [ ] Our Family build (family.tsx)
- [ ] Notes build (notes.tsx)
- [ ] Tutor rebuild to 11-screen spec
- [ ] Travel (design + build)
- [ ] EAS build · TestFlight for Anna
- [ ] Real auth · Remove dev toggle
- [ ] Website + Stripe + onboarding
- [ ] Settings module
- [ ] Wire weather to real user location
