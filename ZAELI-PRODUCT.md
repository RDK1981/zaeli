# ZAELI-PRODUCT.md — Product Vision & Decisions
*Last updated: 30 March 2026 — Session 24 complete (inlineData refactor, persona rewrite, full calendar routing, admin fixes)*

---

## What Zaeli Is

Zaeli is an iOS-first AI family life platform for Australian families with children. A switched-on family assistant that knows your family's life and helps you stay on top of it — through conversation.

**Core insight:** Most family tools are data entry systems. Zaeli is a conversation. Channels are data surfaces Zaeli pulls from and renders inline — not screens you navigate to.

**Tagline:** Less chaos. More family.

---

## Zaeli's Voice (UPDATED Session 24)

Zaeli is sharp, warm, and genuinely enthusiastic about this family. She notices things others miss and finds the funny angle through delight, not detachment. She celebrates small wins, spots the chaos before it arrives, and feels right in it with the family — never observing from a distance.

Her energy matches the moment: get-up-and-go in the morning, calm and settled at night. A touch of sass — through timing and observation, never forced, never at the user's expense. Funny because she pays attention, not because she's trying to be clever.

**Hard rules:** Never 'mate' or 'guys'. Never starts with 'I'. Plain text only. Always ends on a confident offer ('Say the word and I'll...') — never a bare open question. Be proportionate — never manufacture drama. Banned words: 'queued up', 'sorted', 'tidy', 'chaos', 'ambush', 'sprint', 'stacked neatly'.

---

## Target Market

Australian families with children. Highest-priority: dual-income metro couples with primary school-aged kids.

**Revenue:** Family plan A$14.99/month · Tutor add-on A$9.99/child/month · 100% web sales.

---

## The Interface Philosophy

Everything is a channel. No dedicated screens. Channels are persistent chats where data renders inline. Zaeli is the only navigation. No hamburger, no grid, no tab bar.

**Avatar tap →** Our Family · Tutor · Settings · Sign out.

**Portal pills** — destination channel bg + accent chevron. Max 3.
**Quick reply chips** — white bg, ink border. Conversation only.

**Tutor** — standalone premium module. A$9.99/child/month. Avatar menu only.
**Kids Hub** — family plan channel. NOT premium.
**Our Family** — parent hub. Avatar menu. No chat bar.

Channel transitions: no new brief. Only Home generates a brief on cold open.

---

## Design Rules (LOCKED)

**Colour bleed:** Channel bg colour lives ONLY in the status bar and banner. All scrollable body content sits on warm white `#FAF8F5`. Channel colour used as tint only for specific highlight moments (brief strips, recording states, Zaeli suggestion cards).

**Card borders:** No left border stripes on any cards anywhere in the app. Priority, pinned status, and categories communicated via dots, icons, and badges only.

**Send button:** Always `#FF4545` coral — never the channel AI colour.

---

## Brand & Colour System (LOCKED)

### Per-channel colours
| Channel | Banner bg | AI colour | Accent dark |
|---------|-----------|-----------|-------------|
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

### Family member colours
```
Rich: #4D8BFF · Anna: #FF7B6B · Poppy: #A855F7 · Gab: #22C55E · Duke: #F59E0B
```

---

## Splash Screen (LOCKED)
- Bg: `#A8E8CC` Aqua Green, 3s hold
- Wordmark: DM Serif 96px, ink + `#FAC8A8` peach on 'a' and 'i', bounces in
- Greeting: "Good morning/afternoon/evening, Rich 👋" Poppins 400 18px
- Tagline: "LESS CHAOS. MORE FAMILY." Poppins 500 12px uppercase

---

## Home Channel (LOCKED — Session 23)

- Two-part brief: DM Serif 28px hero with [italic highlights] + Poppins 17px follow-up
- GPT returns `{"hero":"...","detail":"...","replies":["..."],"seed":"..."}`
- **Brief pill colours:** matched to topic — calendar→mint, shopping→yellow, meals→peach, todos→gold, kids→aqua, default→sky blue
- Tool-calling: add/update/delete events, todos, shopping items
- **Inline calendar render:** EventCards appear in chat thread when Zaeli answers calendar questions
- **Proactive awareness (next):** Brief to flag upcoming events needing prep — school photos, early starts, dinner plans

### Home inline calendar render (LOCKED)

**Flow:** keyword detection → Supabase fetch → GPT picks relevant events → renders inline

**Key rules:**
- Action messages (`add`, `change`, `move` etc.) ALWAYS bypass to Anthropic tool-calling — never GPT path
- Midnight/all-day events filtered out (reminder pills only)
- GPT calendar prompt: max 2000 tokens (reasoning model needs headroom)
- NO "See full calendar" portal chip — Zaeli offers Calendar conversationally in followUp text
- Chips are always conversation continuations — context-appropriate, forward-looking
- `refreshCalendarEvents()` fires silently on focus return — patches calEvents from Supabase

**EventCard avatars:** 1-3 = column, 4+ = 2×2 grid with "+N" overflow chip

---

## Calendar Channel (LOCKED — Session 23)

- Two-row mint banner, day strip (7 back + 120 forward), event cards, month view
- Self-contained tool-calling with `new_assignees` support
- Whisper voice → mic recording overlay
- API logging confirmed working

### Mic recording overlay (LOCKED — both Home and Calendar)
Frosted channel-tinted overlay (banner bg at 88% opacity) with centred white card:
- 13-bar animated waveform in channel AI colour
- Poppins 600 timer counting up (0:00)
- Red stop button (coral, white square) / Cancel text link (discards)
- Fades in/out smoothly — chat visible underneath

---

## ══════════════════════════════════
## TUTOR MODULE (LOCKED ✅)
## ══════════════════════════════════

Premium A$9.99/child/month. Standalone. Avatar menu. Socratic method.

**AI:** GPT-5.4-mini (chat) · Sonnet (photos) · Whisper (voice)

**6 pillars:** Homework · Practice · Read Aloud · Write & Review · Comprehension · Money & Life

**Difficulty:** Foundation/Core/Extension — silent adaptive. Kids never see label.
- 3 correct no hints → up · Wrong twice → auto Hint 2 · Wrong 3× → Hint 3 + drop level

**Hints:** 25/75 split pill always above bar.
- Hint 1: technique on different equation · Hint 2: first step only · Hint 3: full worked example

**Parent review:** Simple summary in Tutor · full transcript auth-gated · progress → Our Family only

**Curriculum:** AC v9.0 ACARA. Foundation ≠ Year 1. NAPLAN: Yrs 3,5,7,9.

**Money & Life:** 4 levels. Amber `#F59E0B`. Real Australian examples (ANZ, ASX, super).

**Mockups:** `zaeli-tutor-final-mockup-v4.html` (11 screens) · `zaeli-tutor-curriculum-map-v1.html`

---

## ══════════════════════════════════
## KIDS HUB (LOCKED ✅)
## ══════════════════════════════════

Family plan (NOT premium). Colour: `#A8E8CC` / `#FAC8A8` peach / `#0A6040`.

**Age tiers:** Little (Fn–Yr3) · Middle (Yr4–7) · Older (Yr8–12) — driven by year_level.

**Jobs:** Daily/Weekly/One-off · under 20 seconds to create · kids can propose · GIPHY on every tick · archive · pause toggle.

**Points (Philosophy B — currency):** Single pool, spent on redemption, parent approves, games earn zero.

**Rewards:** Parent sets name + cost. Always: affordable-now (green) + saving-toward (amber/grey). Confirm sheet shows before/after balance.

**Games (5, no points):** Wordle (daily family word) · Word Scramble · Maths Sprint · Aussie Trivia · Mini Crossword.

**Leaderboard:** Parent-toggleable. Monthly reset.

**Mockups:** `zaeli-kids-hub-mockup-v1.html` · `zaeli-kids-hub-parent-management-v1.html` · `zaeli-kids-hub-rewards-v2.html`

---

## ══════════════════════════════════
## OUR FAMILY (LOCKED ✅)
## ══════════════════════════════════

`#F0C8C0` / `#D8CCFF` lavender / `#A01830`. Avatar menu. **NO chat bar.**

**Brief (LOCKED):** DM Serif hero + Poppins detail. Active day: "3 things need your attention." Quiet day: subtle green strip.

**4 sections:** Pending Actions (job proposals/reward requests/Zaeli insights) · Our Kids (per-child cards → child detail) · Family Profiles (DOB, colours, login status) · Settings (separate avatar destination).

**Child detail:** Tutor subject bars + difficulty bands + recent sessions + Kids Hub stats.

**Login model:** Parents = full account · Older kids (parent enables) = own login · Young kids = profile only.

**Avatar badge:** Red dot with count when actions pending.

**Settings:** Separate avatar destination. Deferred until billing/auth ready.

**Mockup:** `zaeli-our-family-mockup-v1.html` (6 screens)

---

## ══════════════════════════════════
## TODOS CHANNEL (LOCKED ✅)
## ══════════════════════════════════

`#F0DC80` gold / `#D8CCFF` lavender / `#806000`. Body on `#FAF8F5` warm white.

### What makes it different
Not a list — an assistant that manages the list. Zaeli infers due dates, surfaces the right one at the right moment, blocks time in the calendar, and handles the "I thought you were doing that" problem with real shared handoffs.

### Five core features (all locked)
1. **Smart due dates** — Zaeli infers from context ("before Easter" → checks calendar → sets Apr 10)
2. **Priority surfacing** — one most urgent todo in Home morning brief, not a list
3. **Recurring todos** — Daily/Weekly/Monthly/Custom · auto-reappear · no re-adding
4. **Shared handoff** — assign to Anna with optional "make her primary owner" · "from Rich · new" tag on arrival
5. **Todo → Calendar integration** — Zaeli finds a gap, suggests a specific slot, blocks 30 min, links todo to event

### Two views
- **Mine tab** — personal todos only. Clean, focused.
- **Family tab** — shared + Anna's todos Rich can see + todos assigned to Rich by Anna.

### Todo structure
- Priority dots: Red (overdue) · Amber (today/soon) · Grey (someday)
- Badges: ↻ Recurring · Shared · 📅 Calendar-linked
- No left border stripes — dots and badges only
- Zaeli brief strip at top: most urgent item, warm white tint card

### Inline render in Home (LOCKED)
Same EventCard pattern as calendar. Todo cards render in Home chat thread when Zaeli mentions them. Tappable to tick from Home. Portal pill "See all todos →" below cards.

### Completed
Greyed below "Done this week" collapsible divider. Recurring shows "↻ back next Tue".

### Mockup
`zaeli-todos-mockup-v1.html` — 8 screens

---

## ══════════════════════════════════
## NOTES CHANNEL (LOCKED ✅)
## ══════════════════════════════════

`#C8E8A8` sage / `#F0C8C0` blush / `#2A6010`. Body on `#FAF8F5` warm white.

### What it is
Simple and beautiful. A family notepad. Not AI-connected — Zaeli only makes one light suggestion (todo offer). The design job is purely aesthetic: make note-taking feel like using a high-quality physical notepad.

### Features (locked)
- **Instant capture** — tap +, cursor immediately in title field, auto-saves
- **DM Serif titles** — beautiful typography, generous line-height
- **Pinned notes** — 📌 icon top-right, always first in list. No left border stripe.
- **Colour tints** — 6 options (white/yellow/blue/green/pink/purple) on note body, not card border
- **Emoji tag** — auto-suggested, one per note, shown in list
- **Minimal formatting** — Bold · Italic · Bullets · Numbered · Pin · Share only
- **Voice notes** — Whisper transcribes, Zaeli tidies filler words only, offers to save as todo
- **Share with family** — view-only by default, optional edit toggle per note
- **Zaeli suggestion** — one card at bottom of note detail: "Want me to add X to your todos?"

### Deliberately excluded
Folders · nested notes · rich formatting · attachments · collaborative editing · AI-connected notes.

### Mockup
`zaeli-notes-mockup-v1.html` — 5 screens

---

## Key Product Moments

**"Zaeli noticed"** — flags things unprompted. Builds trust, drives word of mouth.
**The brief** — Home cold open + Our Family opening. Never on other channel transitions.
**Instant action** — Real Supabase write, confirmed immediately.
**Birthday awareness** — DOB stored, Zaeli mentions upcoming birthdays in Home brief.

### Proactive awareness (PLANNED — next session)
Zaeli's Home brief to actively scan next 7 days and flag things needing prep:
- 2-3 days out: dinner plans, early starts, packed bags needed
- First-occurrence events: school photos, excursions, sport registrations
- Conflicts or gaps worth mentioning
This is a prompt change only — no architecture change needed.

---

## Home Chat Philosophy (LOCKED — Session 23)

The Home channel is a **conversation**, not a calendar viewer. Users should never feel pushed to leave it.

**Calendar conversation flow:** Zaeli text → inline EventCards → follow-up remark/offer → contextual chips

**Chips are always conversational continuations** — never navigation prompts, never restate visible info:
- After busy day: "Move something around" / "Any clashes?" / "Add to this day"
- After single event: "Change the time" / "Add someone" / "What's nearby?"
- After week view: "Zoom into a day" / "Any gaps?" / "What needs prep?"

**No portal chip** — Calendar channel offered conversationally in followUp text when appropriate, not as a UI button.

**Zaeli leads every calendar response:** intro → cards → follow-up → chips. Always.

---

## Inline Data Render — Future Roadmap

The `calEvents` pattern established in Session 23 is the template for all future inline renders:

| Type | Trigger keywords | Component | Portal pill |
|------|-----------------|-----------|-------------|
| Calendar | today, tomorrow, week, schedule | EventCard | None (conversational) |
| Todos | tasks, to-do, what needs doing | TodoCard | "See all todos →" |
| Shopping | shopping, list, groceries | ShoppingCard | "See full list →" |
| Meals | dinner, meal, recipe | MealCard | "See meal plan →" |

**Before building the next inline type:** refactor `Msg` interface to generic `inlineData` field.

---

## Competitive Position
- Not threatened by generic AI — they don't know your family
- Not threatened by calendar apps — they don't talk to you
- Real threat: Apple agentic Siri (18–30 months)
- Zaeli's moat: family context, memory, Tutor + Kids Hub ecosystem

---

## Pre-Launch Checklist
- [x] Home channel complete
- [x] Calendar channel complete
- [x] API logging working
- [x] Admin dashboard live
- [x] Tutor designed (11 screens)
- [x] Kids Hub designed (3 files)
- [x] Our Family designed (6 screens)
- [x] Todos designed (8 screens)
- [x] Notes designed (5 screens)
- [x] Home inline calendar render
- [x] Mic recording overlay (Home + Calendar)
- [x] Tool-calling assignee fixes (Home + Calendar)
- [x] Brief pill colours by topic
- [ ] Refactor Msg → inlineData (before next inline render)
- [ ] Home inline todos render
- [ ] Shopping + Meals colour refactor
- [ ] Kids Hub build
- [ ] Our Family build
- [ ] Todos build
- [ ] Notes build
- [ ] Tutor rebuild to 11-screen spec
- [ ] Travel channel (design session first)
- [ ] Proactive awareness in Home brief prompt
- [ ] family_members: dob, year_level, has_own_login columns
- [ ] New Supabase tables: kids_jobs, kids_rewards, kids_points, notes
- [ ] todos table: shared_with, recurrence, calendar_event_id columns
- [ ] EAS build · TestFlight for Anna
- [ ] Remove AI toggle + DEV button · Real auth
- [ ] Website + Stripe + onboarding
- [ ] Settings module (design + build — deferred)
