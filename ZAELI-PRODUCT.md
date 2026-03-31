# ZAELI-PRODUCT.md — Product Vision & Decisions
*Last updated: 31 March 2026 — Shopping rebuild ✅ Chat persistence ✅ Calendar arrows ✅*

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

**Note — Shopping updated 31 Mar:** banner changed from `#F0E880` yellow to `#EDE8FF` lavender (yellow looked mustard on iPhone).
**Shopping 'a' and 'i':** `#A8E8CC` mint (not lavender — would clash on lavender banner).

Family: Rich `#4D8BFF` · Anna `#FF7B6B` · Poppy `#A855F7` · Gab `#22C55E` · Duke `#F59E0B`

---

## Splash Screen (LOCKED)
Bg: `#A8E8CC` · Wordmark: DM Serif 96px, ink + `#FAC8A8` peach on 'a' and 'i'
Greeting: Poppins 400 18px · Tagline: "LESS CHAOS. MORE FAMILY." Poppins 500 12px uppercase

---

## ══════════════════════════════════
## CHAT EXPERIENCE PRINCIPLES (LOCKED ✅ 31 Mar 2026)
## ══════════════════════════════════

### Single chat per channel (Calendar model)
Each channel has ONE shared chat thread across all its views/tabs. Shopping's List, Pantry and Spend tabs share one conversation. Calendar's Day and Month views share one conversation. The chat persists as you switch views within a channel.

### Chat persistence (24hr TTL)
Conversations persist across navigation using `lib/use-chat-persistence.ts`. Leave shopping to check the calendar, come back — conversation is still there. TTL: 24 hours. Cap: 30 messages rolling. Storage: expo-file-system (no native rebuild needed).

### Quick reply chips — actions only
Chips must only suggest things Zaeli can actually DO. Never suggest displaying or listing data that's already visible on screen. Calendar: never "Show tomorrow" — only add/edit/move/delete. Shopping: never "Check the pantry" — Zaeli already has pantry data in context.

### Claude Sonnet for tool-calling channels
Shopping and Calendar both use Claude Sonnet with proper two-pass tool-calling. GPT-mini is for briefs and lightweight summaries only. Quality and accuracy matter more than marginal cost savings for agentic actions.

### Up/down scroll arrows
All scrollable channels use side-by-side floating up/down arrows (bottom-right, above chat bar). Up → top of content. Down → bottom of chat thread. Implemented: Shopping, Calendar. Planned: Home, Meals, Todos during their respective builds.

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

**AM (5–12):** *"Hope the soccer went well, Gab. Big morning ahead, Rich."*
**PM (12–8):** *"Hope the surf ski was good. Nothing sorted for dinner yet — worth a thought."*
**Evening (8–5):** *"Gab scored the winner. Poppy's swimming at 8am — early one."*
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

### Mockup files
- `zaeli-home-card-tweaks-v2.html` — final card designs (4 screens)
- `zaeli-home-three-states-v1.html` — AM/PM/Evening states
- `zaeli-home-refined-interactions-v1.html` — + Add, tick, evening reminders

---

## Calendar Channel (LOCKED ✅)
Two-row mint banner. Day strip. Event cards. Month view. Tool-calling. Whisper mic overlay. API logging.
**31 Mar 2026 additions:** Chat persistence (24hr) · Up/down scroll arrows · Greeting guard (skips if returning user) · Chip rules (action-only, never display chips).

---

## ══════════════════════════════════
## SHOPPING CHANNEL (REBUILT ✅ 31 Mar 2026)
## ══════════════════════════════════

### What changed from old design
- **Colour:** Yellow `#F0E880` → Lavender `#EDE8FF` (looked mustard on iPhone)
- **AI model:** GPT mini JSON hack → Claude Sonnet with proper tool-calling
- **Chat:** Three separate chats → One shared chat (Calendar model)
- **Context:** None → Full live context (list + pantry + receipts) every call
- **Category guessing:** 5 Sonnet API calls per add → Local keyword lookup (zero cost)
- **Persistence:** Session-only → 24hr via expo-file-system

### Three tabs, one chat
List · Pantry · Spend — all share one conversation. Chat bar always visible. Single ScrollView per tab contains content + chat thread.

### Tools
`add_shopping_item` · `remove_shopping_item` · `tick_shopping_item` · `clear_shopping_list`
Two-pass: Claude calls tool → Supabase executes → Claude confirms in natural language.

### Pantry tab
Flat rows (no white card bubbles). 4 ascending stock bars. Scan (camera/library) auto-detects receipt vs pantry photo. Receipt scan → saves to `receipts` table + syncs to Pantry + adds to Recently Bought.

### Spend tab
Mint `#A8E8CC` monthly summary card (DM Serif total). Receipt list with expandable items. Zaeli has live receipt data in context — can answer spend questions accurately.

---

## ══════════════════════════════════
## TODOS + REMINDERS CHANNEL (LOCKED ✅ 31 Mar 2026 — not yet built)
## ══════════════════════════════════

`#F0DC80` gold banner · `#D8CCFF` lavender AI colour · `#806000` accent · `#FAF8F5` body.

### Core principle
**Todos = things you DO. Reminders = things you REMEMBER.**

### Three tabs: Mine | Family | Reminders

### Mine tab — personal todos
- Priority dots: Red (overdue) · Amber (today/soon) · Grey (someday)
- Badges: ↻ Recurring · Shared · 📅 Calendar-linked
- Circle tick left — completion mechanism
- Zaeli brief strip at top
- "Done this week" collapsible divider

### Family tab
- Anna's todos Rich can see + todos assigned to Rich by Anna
- "from Anna · new" tag on arrival

### Reminders tab (LOCKED ✅)

**Bell states:**
- 🔔 Active (red tint) — due today, unacknowledged
- 🔔 Upcoming (amber tint) — due future
- 🔔 Recurring (gold tint) — repeating
- ✓ Acknowledged (grey) — sinks below divider

**Two-touch nudge system:**
- Nudge 1: evening before
- Nudge 2: morning of (7am), only if not yet acknowledged
- Toggle per reminder (default ON)

**Recurrence:** None / Daily / Weekly (choose day) / Monthly. Auto-reappears.

**Creating:** Tell Zaeli in chat, or tap + Add → sheet with what/who/when/two-touch toggle.

**How reminders surface in Home:**
- Today's → gold actions card with "Reminder" badge (red)
- Evening → "🌅 Tomorrow morning" section (no circles — FYI only)

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
Rewards: green (can afford) · amber (saving toward) · grey.
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
**Instant action** — Real Supabase write, confirmed immediately. Zaeli never lies about what she did.
**The all-done moment** — Evening state, everything sorted. "Enjoy the evening." Should feel like a reward.
**The tomorrow morning section** — Seeing "Anna on school run 8:30" at 9pm. Zaeli knows what matters before you wake up.
**Persistent conversation** — Leave a channel and come back, your conversation is still there. 24hr memory.

---

## Competitive Position
Real threat: Apple agentic Siri (18–30 months).
Moat: family context, persistent memory, Tutor + Kids Hub ecosystem, card stack experience.

---

## Pre-Launch Checklist
- [x] Home channel complete
- [x] Calendar channel complete + persistence + arrows
- [x] Shopping channel major rebuild complete (lavender, Sonnet, persistence, Calendar-style)
- [x] API logging working
- [x] Admin dashboard live
- [x] Chat persistence hook (lib/use-chat-persistence.ts)
- [x] Up/down scroll arrows (Shopping + Calendar)
- [x] Mic recording overlay (Home + Calendar + Shopping)
- [x] Tool-calling (Home + Calendar + Shopping)
- [x] Chat message Calendar-style rendering (Shopping)
- [x] Quick reply chips from Claude (Shopping)
- [x] guessCategory → local lookup (zero API cost)
- [x] Home card stack redesign locked
- [x] Todos + Reminders designed (5 screens)
- [x] Tutor designed (11 screens)
- [x] Kids Hub designed
- [x] Our Family designed (6 screens)
- [x] Notes designed (5 screens)
- [ ] Meals colour refactor + persistence
- [ ] Home card stack rebuild (index.tsx)
- [ ] Wire useChatPersistence to Home + Meals
- [ ] Todos + Reminders build — create reminders table first
- [ ] Kids Hub build
- [ ] Our Family build
- [ ] Notes build
- [ ] Tutor rebuild to 11-screen spec
- [ ] Travel (design + build)
- [ ] EAS build · TestFlight for Anna
- [ ] Real auth · Remove dev toggle
- [ ] Website + Stripe + onboarding
- [ ] Settings module
