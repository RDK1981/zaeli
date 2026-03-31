# ZAELI-PRODUCT.md — Product Vision & Decisions
*Last updated: 31 March 2026 — Home card stack ✅ Reminders tab ✅ locked.*

---

## What Zaeli Is

Zaeli is an iOS-first AI family life platform for Australian families with children. A switched-on family assistant that knows your family's life — through conversation, not data entry.

**Tagline:** Less chaos. More family.

---

## Zaeli's Voice (LOCKED Session 24)

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

---

## Brand & Colour System (LOCKED)

| Channel | Banner bg | AI colour | Accent |
|---------|-----------|-----------|--------|
| Home | `#F5EAD8` | `#A8D8F0` Sky Blue | `#0A7A3A` |
| Calendar | `#B8EDD0` | `#F0C8C0` Warm Blush | `#0A7A3A` |
| Shopping | `#F0E880` | `#D8CCFF` Lavender | `#6A6000` |
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
## HOME CHANNEL — CARD STACK (LOCKED ✅ 31 Mar 2026)
## ══════════════════════════════════

### The shift
Home is a hybrid: glanceable card stack at top, Zaeli conversation below. Two layers:
- **Layer 1 — The Glance:** Card stack. 0–4 seconds. What's happening, what do I need to do, is dinner sorted.
- **Layer 2 — The Engage:** Zaeli brief + chat. Short. Cards do the heavy lifting.

### Banner hero line (LOCKED)
Row 1: wordmark left, avatar right. Row 2: DM Serif 16px, ink black, italic emphasis. No sub-label. Tappable.

**AM (5–12):** Yesterday acknowledged + today flagged.
*"Hope the soccer went well, Gab. Big morning ahead, Rich."*

**PM (12–8):** Check-in on morning + dinner/afternoon nudge.
*"Hope the surf ski was good. Nothing sorted for dinner yet — worth a thought."*

**Evening (8–5):** Positive day snapshot + tomorrow flag.
*"Gab scored the winner. Poppy's swimming at 8am — early one."*
All done: *"Everything sorted. Nothing left to do — enjoy the evening."*

### Card order by time state

**AM (5am–12pm):** Calendar → Weather+Shopping → Actions → Dinner
**PM (12pm–8pm):** Dinner (leads if unplanned) → Calendar → Actions → Weather+Shopping
**Evening (8pm–5am):** Tomorrow calendar → Actions (tonight + tomorrow AM sections) → Weather+Shopping → Tomorrow dinner

### Card specs (ALL LOCKED)

**Calendar — slate `#3A3D4A` (full width)**
Header: eye label + weather inline · + Add · Full → top right
Timeline: time (muted) · colour dot · event · family member avatar
Footer: context note left · "Full calendar →" right
AM = today full · PM = rest of today · Evening = tomorrow

**Weather — sky blue `#A8D8F0` (two-col, flex 0 0 88px)**
DM Serif temp large · condition · icon · extra detail. Read only, no + Add.

**Shopping — lavender `#D8CCFF` (two-col, flex 1)**
Header: + Add · Full → top right (identical pattern to calendar)
Top 3 items listed
**Item count BIG bottom right** — large DM Serif number + small "items" label
+ Add → Zaeli inline: "What do you need to pick up?"

**Today's actions — gold `#F0DC80` (full width)**
Header: count badge · + Add · Full → top right
Rows: **circle tick LEFT** (ONLY completion mechanism) · urgency dot · text · family avatar · badge
Ticking: circle fills, text greys + strikethrough, avatar/badge fade, count drops
Zaeli quietly acknowledges: one warm specific line in chat thread
Badges: Reminder (red) · Overdue (dark red) · Todo (gold) — remain visible when ticked
No swipe labels. No "done" text anywhere.
**Evening state — two sections in one card, separated by labelled divider:**
- "🌙 Put out tonight" — circle ticks, actionable
- "🌅 Tomorrow morning" — NO circles, FYI awareness items only (e.g. "Anna on school run 8:30")
+ Add → Zaeli inline: "What do you need to remember or do?"

**Dinner — terracotta `#FAC8A8` (full width)**
Planned: emoji · meal name · prep note · "✓ Planned" right
Unplanned: gentle nudge + "Quick idea 💡" (Zaeli suggests) · "Plan the week"
**Footer: "Next 7 days ›"** — expands inline 7-day meal strip within the card (no navigation away)
7-day strip: day label · meal + emoji · ✓ planned or ⚠ unplanned · Zaeli notices gaps in chat
Evening: shows tomorrow's dinner

### + Add interaction (LOCKED)
Tap + Add on any card → Zaeli opens inline prompt in chat thread. No modal, no new screen.
Cursor live immediately. Chips: context-relevant suggestions + Cancel.
Zaeli confirms and card updates. User never leaves Home.

### Zaeli in-chat (below cards)
Short — 1–2 sentences. Cards do the heavy lifting.
Tapping hero line → Zaeli expands in chat with more detail.
Ticking an action → Zaeli one-line acknowledgement ("Gold coin — sorted. Duke's bag still to go.")

### Mockup files
- `zaeli-home-card-tweaks-v2.html` — final card designs (4 screens)
- `zaeli-home-three-states-v1.html` — AM/PM/Evening states
- `zaeli-home-refined-interactions-v1.html` — + Add, tick, evening reminders

---

## Calendar Channel (LOCKED Sessions 22–23)
Two-row mint banner. Day strip. Event cards. Month view. Tool-calling with `new_assignees`. Whisper mic overlay. API logging confirmed.

---

## ══════════════════════════════════
## TODOS + REMINDERS CHANNEL (LOCKED ✅ 31 Mar 2026)
## ══════════════════════════════════

`#F0DC80` gold banner · `#D8CCFF` lavender AI colour · `#806000` accent · `#FAF8F5` body.

### Core principle
**Todos = things you DO. Reminders = things you REMEMBER.**
Same channel, three tabs. One place for everything you need to stay on top of.

### Three tabs (LOCKED)
`Mine | Family | Reminders`

### Mine tab — personal todos
- Priority dots: Red (overdue) · Amber (today/soon) · Grey (someday)
- Badges: ↻ Recurring · Shared · 📅 Calendar-linked
- Circle tick left — completion mechanism
- Zaeli brief strip at top (most urgent item, warm white tint)
- "Done this week" collapsible divider
- Recurring: shows "↻ back next Tue" when acknowledged

### Family tab — shared todos
- Anna's todos Rich can see + todos assigned to Rich by Anna
- Shared todos: both avatars shown
- "from Anna · new" tag on arrival
- Assigned-to-Rich highlighted with coloured border

### Five todo features (LOCKED)
1. **Smart due dates** — Zaeli infers from context ("before Easter" → checks calendar → Apr 10)
2. **Priority in Home brief** — one most urgent todo in morning hero, not a list
3. **Recurring** — Daily/Weekly/Monthly/Custom · auto-reappear · no re-adding
4. **Shared handoff** — assign to Anna with proper ownership transfer
5. **Calendar integration** — Zaeli finds a gap, suggests slot, blocks 30 min, links todo to event

### Reminders tab (LOCKED ✅ 31 Mar 2026)

**Visual distinction from todos:**
- Bell icon 🔔 instead of circle tick — same satisfying tap gesture, different mental model
- Urgency shown by time label (today/tonight/tomorrow/upcoming)
- No priority dots — urgency is purely time-based

**Bell states:**
- 🔔 Active (red tint bg) — due today, not yet acknowledged
- 🔔 Upcoming (amber tint bg) — due in future
- 🔔 Recurring (gold tint bg) — repeating reminder
- ✓ Acknowledged (grey) — done, sinks below divider

**Two-touch nudge system (LOCKED):**
- Nudge 1: evening before the reminder date
- Nudge 2: morning of (7am), only if not yet acknowledged
- Acknowledged before morning fires → morning cancelled automatically
- Toggle per reminder (default ON)
- Visible label: "Evening nudge sent · morning nudge at 7am if not done"

**Recurrence:** None / Daily / Weekly (choose day) / Monthly. Auto-reappears.

**Creating reminders (two ways):**
1. Tell Zaeli: *"Remind me Gab needs a gold coin Wednesday"* → Zaeli confirms with a card showing title, timing, family member, two-touch status
2. Tap + Add → sheet: what · who (family member chips) · when (Tonight/Tomorrow morning/In 2 days/Pick a date) · two-touch toggle

**Acknowledging:** Tap the bell circle → acknowledged state, sinks below "Acknowledged" divider.

**How reminders surface in Home:**
- Today's reminders → gold actions card with "Reminder" badge (red)
- Evening state → "🌅 Tomorrow morning" section in actions card — NO circles, FYI only
- This is the critical flow: seeing "Anna on school run 8:30" at 9pm means Rich can check in tonight

### Inline render in Home
Same inlineData pattern as calendar. Todo/reminder cards render in Home chat thread when Zaeli mentions them. Portal pill: "See all todos →".

### Mockup
`zaeli-todos-reminders-v2.html` — 5 screens:
1. Mine tab
2. Family tab
3. Reminders tab (active + Zaeli adding from voice)
4. Add reminder sheet
5. Reminders surfacing in Home (AM actions card + evening tomorrow morning section)

### Supabase table (new — not yet created)
```sql
create table reminders (
  id uuid default gen_random_uuid() primary key,
  family_id uuid not null,
  title text not null,
  about_member_id uuid,
  remind_at timestamptz not null,
  recurrence text default 'none',  -- none/daily/weekly/monthly
  recurrence_day integer,           -- 0=Sun…6=Sat for weekly
  two_touch bool default true,
  evening_sent bool default false,
  acknowledged bool default false,
  acknowledged_at timestamptz,
  created_by uuid,
  created_at timestamptz default now()
);
```

---

## ══════════════════════════════════
## TUTOR MODULE (LOCKED ✅)
## ══════════════════════════════════

Premium A$9.99/child/month. Standalone. Avatar menu. Socratic method. Foundation–Year 12.
GPT-5.4-mini (chat) · Sonnet (photos) · Whisper (voice). 6 pillars. 3 difficulty bands.
Hints: 25/75 split pill. Parent review: summary in Tutor · full transcript auth-gated.
Curriculum: AC v9.0 ACARA. Mockup: `zaeli-tutor-final-mockup-v4.html` (11 screens).

---

## ══════════════════════════════════
## KIDS HUB (LOCKED ✅)
## ══════════════════════════════════

Family plan. `#A8E8CC` / `#FAC8A8` / `#0A6040`.
Age tiers: Little (Fn–Yr3) · Middle (Yr4–7) · Older (Yr8–12).
Jobs: Daily/Weekly/One-off · GIPHY on every tick · archive · pause.
Points (Philosophy B): spent on redemption, parent approves, games earn zero.
Rewards: green (can afford) · amber (saving toward) · grey. Confirm shows before/after balance.
Games: Wordle · Word Scramble · Maths Sprint · Aussie Trivia · Mini Crossword (no points).
Mockup: `zaeli-kids-hub-rewards-v2.html`.

---

## ══════════════════════════════════
## OUR FAMILY (LOCKED ✅)
## ══════════════════════════════════

`#F0C8C0` / `#D8CCFF` / `#A01830`. Avatar menu. **NO chat bar.**
Opening brief: DM Serif hero. 4 sections: Pending Actions · Our Kids · Family Profiles · (Settings separate).
Child detail: Tutor progress bars + Kids Hub stats. DOB stored, age/year auto-calculated.
Mockup: `zaeli-our-family-mockup-v1.html` (6 screens).

---

## ══════════════════════════════════
## NOTES CHANNEL (LOCKED ✅)
## ══════════════════════════════════

`#C8E8A8` / `#F0C8C0` / `#2A6010`. Simple and beautiful — not AI-connected v1.
Instant capture · DM Serif titles · pinned (📌 icon, no left stripe) · 6 colour tints · emoji tag.
Minimal formatting: Bold · Italic · Bullets · Numbered · Pin · Share.
Voice notes: Whisper · Zaeli tidies filler words · offers to save as todo.
Mockup: `zaeli-notes-mockup-v1.html` (5 screens).

---

## Key Product Moments

**"Zaeli noticed"** — flags things unprompted. Builds trust, drives word of mouth.
**The brief** — Home cold open. Only here. Never on channel transitions.
**Instant action** — Real Supabase write, confirmed immediately.
**The all-done moment** — Evening state, everything sorted. Green card. "Enjoy the evening." Should feel like a reward.
**The tomorrow morning section** — Seeing "Anna on school run 8:30" at 9pm. Zaeli knows what matters before you wake up.

---

## Competitive Position
Real threat: Apple agentic Siri (18–30 months).
Moat: family context, memory, Tutor + Kids Hub ecosystem, the card stack experience.

---

## Pre-Launch Checklist
- [x] Home channel complete (Sessions 20–24)
- [x] Calendar channel complete
- [x] API logging working
- [x] Admin dashboard live
- [x] Home inline calendar render
- [x] Mic recording overlay (Home + Calendar)
- [x] Tool-calling assignee fixes
- [x] Brief pill colours by topic
- [x] Home card stack redesign locked (31 Mar 2026)
- [x] Todos + Reminders channel designed (31 Mar 2026)
- [x] Tutor designed (11 screens)
- [x] Kids Hub designed
- [x] Our Family designed (6 screens)
- [x] Notes designed (5 screens)
- [ ] Home card stack rebuild (index.tsx)
- [ ] Shopping colour refactor
- [ ] Meals colour refactor
- [ ] Todos + Reminders build (todos.tsx) — create reminders table first
- [ ] Home inline todos/reminders render (inlineData pattern)
- [ ] Kids Hub build (kids.tsx)
- [ ] Our Family build (family.tsx)
- [ ] Notes build (notes.tsx)
- [ ] Tutor rebuild to 11-screen spec
- [ ] Travel (design + build)
- [ ] family_members: dob, year_level, has_own_login
- [ ] EAS build · TestFlight for Anna
- [ ] Remove AI toggle + DEV button · Real auth
- [ ] Website + Stripe + onboarding
- [ ] Settings module (deferred)
