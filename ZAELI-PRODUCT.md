# ZAELI-PRODUCT.md — Product Vision & Decisions
*Last updated: 30 March 2026 — Tutor module fully designed. Kids Hub + Our Family design sessions queued.*

---

## What Zaeli Is

Zaeli is an iOS-first AI family life platform for Australian families with children. Not a task manager, not a calendar app, not a shopping list. A switched-on family assistant that knows your family's life and helps you stay on top of it — through conversation.

**The core insight:** Most family coordination tools are data entry systems. Zaeli is a conversation. You talk to Zaeli, Zaeli acts. The channels (Calendar, Shopping, Meals, Todos) are data surfaces that Zaeli pulls from and renders inline — not screens you navigate to.

**Tagline:** Less chaos. More family.

---

## Zaeli's Voice

Anne Hathaway energy — smart, warm, magnetic, a little witty. Never try-hard. Australian warmth without "mate" or "guys". Never starts with "I". Never sounds like a push notification. Plain text only — no asterisks, no markdown, no bold.

**Critical rule:** Zaeli never ends on a bare open question. She always offers something specific before leaving the door open. She matches the user's energy all the way through. No pivot to transactional mid-response.

---

## Target Market

Australian families with children. Highest-priority segment: dual-income couples with primary school-aged children in metro areas.

**Revenue:**
- Family plan: A$14.99/month
- Tutor add-on: A$9.99/child/month
- 100% web sales — no App Store cut

**Tutor unit economics (verified 30 Mar 2026):**
- 500 message turns/month per child = realistic heavy usage
- Hybrid model cost: ~A$2.00/child/month (GPT-5.4-mini chat + Sonnet vision + Whisper)
- Gross margin at 500 turns: ~80%
- Margin stays above 60% even at 1,000 turns/month
- Fair use soft cap at ~600 turns recommended (soft warning, never hard cut)

---

## The Interface Philosophy

### Everything is a channel
No dedicated screens. Channels are persistent chats with Zaeli where relevant data renders inline. The user never leaves "chat". Zaeli takes them where they need to go.

### There is no navigation UI
No hamburger menu. No grid. No tab bar. No channel switcher. Zaeli is the only navigation mechanism. Only chrome: banner (wordmark + channel name + avatar) and avatar tap → Settings, Billing, Our Family, Tutor.

### Zaeli navigates via pills
**Portal pills** — destination channel's bg colour + accent chevron. Max 3 at once.
**Quick reply chips** — white bg, ink border. Continue conversation only.

### Tutor is a standalone premium module
NOT a channel. A$9.99/child/month. Own pages, avatar menu only. Socratic method — guides without giving the answer directly. Full 11-screen spec designed 30 Mar 2026.

### Kids Hub is a family plan channel
NOT premium. Part of the base A$14.99/month family plan. Completely separate from Tutor.

### Channel transitions — no new brief
Conversation flows continuously. Background colour shifts. Only Home generates a brief on cold open.

---

## Brand & Colour System (LOCKED)

### Wordmark rule
DM Serif Display, always lowercase `zaeli`. The 'a' and 'i' carry a complementary colour — the AI easter egg. Never explain it in marketing.

### Per-channel colour system (LOCKED)
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

AI colour = eyebrow star = send button bg = portal pill bg. Send arrow always ink `#0A0A0A`.
**CRITICAL:** Chat bar send button is `#FF4545` coral across ALL channels — never the channel AI colour.
**Exception:** Calendar send button uses `#B8EDD0` mint (the page bg) for visual harmony with its two-row banner.

### Family member colours (LOCKED)
```
Rich:  #4D8BFF  ← logged-in user
Anna:  #FF7B6B
Poppy: #A855F7
Gab:   #22C55E
Duke:  #F59E0B
```

---

## Splash Screen (LOCKED)
- Bg: `#A8E8CC` Aqua Green, 3 second hold
- Wordmark: DM Serif 96px, ink + `#FAC8A8` peach on 'a' and 'i', bounces in
- Greeting: "Good morning/afternoon/evening, Rich 👋" Poppins 400 18px
- Tagline: "LESS CHAOS. MORE FAMILY." Poppins 500 12px uppercase
- Peach loading dots, radial glow orbs

---

## Home Channel (LOCKED Session 20)

- Two-part brief: DM Serif 28px hero with [italic highlights] + Poppins 17px follow-up
- GPT returns `{"hero":"[bracketed] key words","detail":"prose","replies":["..."]}`
- Placeholder cycles 4s. Mic 26px blush. Send sky blue ink arrow.
- Tool-calling: add/update/delete events, todos, shopping items
- Chat render: star eyebrow, 17px text, icon row (Play/Copy/Forward/ThumbUp/ThumbDown)
- **Next:** Home inline calendar render — EventCards render inline in Home chat thread when Zaeli returns calendar data. Portal pill "See full calendar →" below cards (mint bg).

---

## Calendar Channel (LOCKED Session 22)

### What we built
Complete production-quality channel:
- Two-row mint banner (wordmark + Day/Month toggle)
- Pinned day strip (7 days back + 120 forward, today anchors left)
- Event cards: auto-emoji (40+ keywords), coloured time text, dynamic avatars
- Month view with tap-to-select dates
- Self-contained tool-calling: add/update/delete
- Voice → Whisper → auto-send
- Chat render matching Home exactly
- Scroll-down arrow + "View events" frosted pill
- All API calls logged

### Key design decisions (LOCKED)
No time grid. Event cards only. One EventCard component shared across Calendar Day, Month, Home inline. Shared chat thread across Day/Month views.

---

## ══════════════════════════════════
## TUTOR MODULE — FULL SPEC (LOCKED 30 Mar 2026)
## ══════════════════════════════════

### What Tutor Is
A personal AI tutor for Australian children from Kindergarten to Year 12. Premium add-on at A$9.99/child/month. Accessed from the avatar menu only — NOT a channel. Has its own dedicated screen architecture.

The Tutor experience is genuinely differentiated: it adapts its personality to the child's age, guides Socratically without being dogmatic (it will eventually give the answer, because real tutors do), and is fully transparent to parents.

### Tutor Persona
Warm, encouraging, age-adaptive. Playful for younger children (Duke, Year 1). More peer-level and direct for older kids (Poppy, Year 6+). Never condescending. Never gives the answer on the first attempt. Never says "mate".

### Access Model
- Family account = one Zaeli login (parent owns it)
- Each child profile has `tutor_enabled: boolean` in family_members table
- Older kids with their own phone log in with family account credentials — land directly in their profile
- Child selector shows locked profiles for unenrolled children with inline upsell
- **No subscription cost shown next to the premium badge** — lives in Settings/Billing only

### AI Architecture
- **GPT-5.4-mini** → all conversational turns (questions, hints, encouragement, feedback)
- **Claude Sonnet** → any turn involving a photo (homework sheets, writing samples, book covers, working photos)
- **Whisper-1** → all voice input including Read Aloud sessions

### The Six Pillars
Every child sees the same six pillars on their Child Home screen. Content inside adapts to year level.

| Pillar | What it does |
|--------|-------------|
| **Homework** | Photo/voice/type — Zaeli reads the worksheet via Sonnet vision and guides through it |
| **Practice** | Structured curriculum sets — MC + working-out questions — adaptive difficulty |
| **Read Aloud** | Voice-first — books, speeches, presentations. Whisper transcribes, Zaeli analyses fluency |
| **Write & Review** | Submit writing, get structured feedback with before/after rewrites. Never rewrites the whole piece |
| **Comprehension** | Passage renders inline, questions move literal → inferential → analytical. NAPLAN-aligned |
| **Money & Life** | Australian financial literacy — 4 progressive levels from coins (Yr 1) to mortgages (Yr 12) |

### Difficulty Band System (LOCKED)
Three bands per year level. Zaeli adjusts silently — children never see a band label.

- **Foundation** — below standard. More scaffolding, shorter questions, more visual aids.
- **Core** — at achievement standard. Default starting point for all children.
- **Extension** — above standard. Overlaps with next year level. Triggered after 3 consecutive correct answers with no hints.

**Adaptive rules:**
- Correct, no hints, 3× in a row → move up one band
- Wrong twice on same question → auto-provide Hint 2
- Wrong three times → full worked example (Hint 3), drop one band next question
- 5 correct at Extension → flag "working above year level" in session notes

### Hint System (LOCKED)
Three progressive levels. The 25/75 split pill is always visible above the chat bar.

- **Hint 1/3** — technique on a DIFFERENT equation. Never touches the child's actual question.
- **Hint 2/3** — first step of their actual equation only. Stops there.
- **Hint 3/3** — full worked example. Framed as "let's look at this together".

Hint pill label updates: `Hint (1/3)` → `Hint (2/3)` → `Hint (3/3)` → `Hint (used)` (greyed out).
Hint count per question is logged and shown in parent session review.

### Persistent Pill Layout (LOCKED)
Above the chat bar at all times — never requires scrolling to reach:
```
[💡 Hint (1/3)]  [      Next question →      ]
    25%                      75%
```
Money & Life sessions: amber `#F59E0B` Next pill instead of purple `#5020C0`.
Homework mode: NO hint/next pill — free-flowing conversation, not structured practice.

### Maths Technique Cards
Zaeli renders stacked multiplication and long division inline using monospace formatting. Because Zaeli messages are open text (no bubble), she has the full screen width — columns and spacing are legible.

After showing the technique, Zaeli asks the child to do their working on paper and upload a photo. Sonnet analyses the photo for method accuracy, not just the final answer.

### Session Saving
Every session is saved with: auto-generated title, timestamp, duration, pillar, subject, difficulty band reached, hints used per question, full message transcript.

Title is auto-generated by Zaeli at session end: descriptive, not generic. "Fractions — dividing by whole numbers" not "Session 14 March."

### Parent vs Child View (LOCKED 30 Mar 2026)
- **Child sees on Child Home:** Session list with simple summary only. "18 min, 6 questions."
- **Parent sees (authenticated):** Full transcript + hints used per question + Zaeli's technique cards shown.
- **Full progress view** (subject bars, difficulty bands, Zaeli written observations) → **Our Family channel only** — not in Tutor. This keeps the Tutor space feeling like the child's own space, not a surveillance system.

### Curriculum Alignment
All content verified against **Australian Curriculum v9.0 (ACARA)**. Full Foundation–Year 12 mapping in `zaeli-tutor-curriculum-map-v1.html`. Key notes:
- Foundation (Prep/Kinder) content is simpler than Year 1 — never confuse the two
- Year 1 maths: addition/subtraction to 20, skip counting, two-digit partitioning. NOT single CVC word matching (that's Foundation).
- NAPLAN years are 3, 5, 7, 9. Practice sets for these years include NAPLAN-style question formats.
- All word problems use Australian contexts: AUD, Australian geography, Australian cultural references.

### Money & Life Module
Four progressive levels that unlock sequentially:
1. **Earning & Spending** — wages, GST, budgeting (Yrs 3–5)
2. **Saving & Banking** — interest, compound growth, savings accounts (Yrs 5–8)
3. **Investing & Super** — ASX shares, superannuation, compound interest (Yrs 8–12)
4. **Big Life Decisions** — renting, mortgages, credit cards (Yrs 10–12)

Real Australian examples throughout: ANZ savings rates, Woolworths casual wages, ASX, super guarantee rate. Based on ASIC MoneySmart curriculum framework.

Money & Life sessions use warm amber tones `#FEF3C7` / `#F59E0B` to signal a different kind of learning from the standard Tutor lavender.

### Tutor Screen Architecture (11 screens)
Fully mocked up in `zaeli-tutor-final-mockup-v4.html`.

1. Child Selector — enrolled children with streaks, locked upsell state
2. Child Home — 6 pillars + week stats + recent sessions (resume/review)
3. Pillar Select — Zaeli asks 1–2 orienting questions before session starts
4. Homework Session — photo upload flow, free conversation, no hint/next pill
5. Practice Session — MC + technique cards + 25/75 hint/next pill + adaptive band
6. Read Aloud Session — voice-first, mic highlighted, fluency/presentation feedback
7. Write & Review Session — structured before/after feedback cards
8. Comprehension Session — passage inline card + layered questions + hint/next pill
9. Money & Life Session — level select (4 levels) + active amber session
10. Parent Review — session stats + Zaeli summary + full transcript (parent-authenticated)
11. Parent Progress — subject bars + difficulty bands + Zaeli observations → lives in Our Family

---

## Kids Hub Channel (DESIGN PENDING — 30 Mar 2026)

**What it is:** The kids' own space within the family plan. NOT premium. Part of base A$14.99/month.

**What it contains:**
- Jobs/Chores — tasks assigned by parents, reward points for completion
- Rewards — redeem points, track progress toward goals
- Fun educational games — crosswords, Wordle-style word games, other light games

**What it is NOT:** An AI tutoring tool. That's Tutor. Kids Hub is lighter — jobs, rewards, fun.

**Colour:** `#A8E8CC` bg / `#FAC8A8` peach AI colour / `#0A6040` accent dark.

*Full design session to be completed — mockup and spec before build.*

---

## Our Family Channel (DESIGN PENDING — 30 Mar 2026)

**What it is:** The parent-facing hub. Accessible from avatar menu.

**What it contains:**
- Family profiles — members, avatars, colours, roles
- **Tutor Progress** — the full progress view that lives here, not in Tutor (subject bars, difficulty bands, Zaeli written observations per child)
- **Session Review** — parent-authenticated full Tutor session transcripts
- Settings & Billing — subscription management, add/remove children from Tutor

**Why progress lives here:** Keeps Tutor feeling like the child's own space. A 12-year-old finding detailed session notes about her struggles would feel surveillance-y and discouraging.

**Colour:** `#F0C8C0` bg / `#D8CCFF` lavender AI colour / `#A01830` accent dark.

*Full design session to be completed — mockup and spec before build.*

---

## Key Product Moments

### "Zaeli noticed"
Zaeli flags things the user didn't ask about — conflict between events, library books due, swimmers needed. These build trust and drive word of mouth. Calendar conflict detection is live.

### The brief
Only on Home cold open. Never on channel transitions.

### Instant action
When Zaeli says she's done something — she did it. Real Supabase write, confirmed immediately.

---

## Competitive Position
- Not threatened by generic AI — they don't know your family
- Not threatened by calendar apps — they don't talk to you
- Real threat: Apple agentic Siri (18–30 months)
- Zaeli's moat: family context, memory, shared live experience, Tutor module, Kids Hub

---

## Pre-Launch Checklist
- [x] Splash — new brand spec
- [x] Home channel — complete
- [x] API logging — all features working
- [x] Calendar channel — complete (Session 22)
- [x] Admin dashboard — all feature types showing
- [x] Tutor module — fully designed (30 Mar 2026)
- [ ] Home inline calendar render (next build task)
- [ ] Shopping channel colour refactor
- [ ] Meals channel colour refactor
- [ ] Kids Hub — design session → mockup → build
- [ ] Our Family — design session → mockup → build
- [ ] New channels: todos, notes, travel
- [ ] Tutor rebuild to new 11-screen spec
- [ ] New EAS build (keyboard tint fix)
- [ ] TestFlight build for Anna
- [ ] Remove AI toggle from more.tsx
- [ ] Remove DEV 📅 button from Home
- [ ] Replace DUMMY_FAMILY_ID with real auth
- [ ] Website + Stripe + onboarding
