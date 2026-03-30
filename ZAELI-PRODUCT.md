# ZAELI-PRODUCT.md — Product Vision & Decisions
*Last updated: 30 March 2026 — Tutor ✅ Kids Hub ✅ Our Family in progress*

---

## What Zaeli Is

Zaeli is an iOS-first AI family life platform for Australian families with children. Not a task manager, not a calendar app. A switched-on family assistant that knows your family's life and helps you stay on top of it — through conversation.

**The core insight:** Most family coordination tools are data entry systems. Zaeli is a conversation. Channels are data surfaces Zaeli pulls from and renders inline — not screens you navigate to.

**Tagline:** Less chaos. More family.

---

## Zaeli's Voice

Anne Hathaway energy — smart, warm, magnetic, a little witty. Australian warmth without "mate" or "guys". Never starts with "I". Never sounds like a push notification. Plain text only.

Never ends on a bare open question. Always offers something specific first. Matches user energy all the way through.

---

## Target Market

Australian families with children. Highest-priority: dual-income metro couples with primary school-aged kids.

**Revenue:**
- Family plan: A$14.99/month
- Tutor add-on: A$9.99/child/month
- 100% web sales — no App Store cut

---

## The Interface Philosophy

Everything is a channel. No dedicated screens. Channels are persistent chats where data renders inline. Zaeli is the only navigation. No hamburger, no grid, no tab bar.

Avatar tap → Settings, Billing, Our Family, Tutor.

**Portal pills** — destination channel bg + accent chevron. Max 3.
**Quick reply chips** — white bg, ink border. Conversation only.

**Tutor** — standalone premium module. A$9.99/child/month. Avatar menu only.
**Kids Hub** — family plan channel. NOT premium.

Channel transitions: no new brief. Conversation flows continuously. Only Home generates a brief on cold open.

---

## Brand & Colour System (LOCKED)

Wordmark: DM Serif Display, always lowercase `zaeli`. 'a' and 'i' carry a complementary colour — the AI easter egg.

### Per-channel colours (LOCKED)
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

Chat bar send button = `#FF4545` coral always — never channel AI colour.

### Family member colours (LOCKED)
```
Rich:  #4D8BFF · Anna: #FF7B6B · Poppy: #A855F7 · Gab: #22C55E · Duke: #F59E0B
```

---

## Splash Screen (LOCKED)
- Bg: `#A8E8CC` Aqua Green, 3s hold
- Wordmark: DM Serif 96px, ink + `#FAC8A8` peach on 'a' and 'i', bounces in
- Greeting: "Good morning/afternoon/evening, Rich 👋" Poppins 400 18px
- Tagline: "LESS CHAOS. MORE FAMILY." Poppins 500 12px uppercase
- Peach loading dots, radial glow orbs

---

## Home Channel (LOCKED Session 20)
- Two-part brief: DM Serif 28px hero [italic highlights] + Poppins 17px follow-up
- GPT returns `{"hero":"[brackets]","detail":"prose","replies":["..."]}`
- Tool-calling: add/update/delete events, todos, shopping items
- **Next:** Home inline calendar render — EventCards inline in chat thread, portal pill "See full calendar →"

---

## Calendar Channel (LOCKED Session 22)
- Two-row mint banner, pinned day strip, event cards (auto-emoji, dynamic avatars)
- Month view, tool-calling, voice → Whisper, "View events" frosted pill
- No time grid — event cards only

---

## ══════════════════════════════════
## TUTOR MODULE — FULL SPEC (LOCKED ✅ 30 Mar 2026)
## ══════════════════════════════════

### What it is
Personal AI tutor for Australian children Kindergarten to Year 12. Premium A$9.99/child/month. Standalone — not a channel. Avatar menu only. Socratic method.

### Access model
- Family account = one login
- `tutor_enabled: boolean` per child in family_members
- Older kids with own phone: same family credentials, land directly in their profile
- Locked profiles show inline upsell — no cost next to premium badge

### AI architecture
- GPT-5.4-mini → all conversation turns
- Claude Sonnet → any turn with a photo
- Whisper-1 → all voice input including Read Aloud

### The six pillars
| Pillar | What it does |
|--------|-------------|
| Homework | Photo/voice/text — Sonnet reads worksheet, GPT guides |
| Practice | Curriculum sets — MC + working questions — adaptive difficulty |
| Read Aloud | Voice-first — Whisper transcribes, Zaeli analyses fluency |
| Write & Review | Submit writing, structured before/after feedback. Never rewrites the whole piece |
| Comprehension | Passage inline, literal → inferential → analytical. NAPLAN-aligned |
| Money & Life | Australian financial literacy — 4 progressive levels |

### Difficulty bands (LOCKED)
Three per year level. Zaeli adjusts silently — kids never see the label.
- **Foundation** — below standard. More scaffolding, shorter questions.
- **Core** — at achievement standard. Default start.
- **Extension** — above standard. Overlaps next year level. Triggered after 3 correct with no hints.

Adaptive rules:
- 3 correct, no hints → move up
- Wrong twice → auto Hint 2
- Wrong three times → Hint 3, drop one level next question
- 5 correct at Extension → flag "working above year level"

### Hint system (LOCKED)
25/75 split pill pinned above chat bar always.
- **Hint 1/3** — technique on a DIFFERENT equation
- **Hint 2/3** — first step of their equation only
- **Hint 3/3** — full worked example, framed as "let's look at this together"
Hint count per question logged for parent review.

### Maths technique cards
Monospace formatting inline in Zaeli's open-text message. Full screen width — columns are legible. Child does working on paper → photos it → Sonnet checks method.

### Session saving
Auto-generated descriptive title. Timestamp, duration, pillar, subject, difficulty band, hints per question, full transcript.

### Parent vs child view (LOCKED)
- Child in Tutor: simple summary only ("18 min, 6 questions")
- Parent authenticated in Tutor: full transcript + hints per question
- Full progress (subject bars, bands, Zaeli observations) → Our Family only

### Curriculum
Australian Curriculum v9.0 (ACARA). Full Foundation–Year 12 map in `zaeli-tutor-curriculum-map-v1.html`.
- Foundation ≠ Year 1 — different content descriptors
- NAPLAN years: 3, 5, 7, 9
- All examples: Australian contexts, AUD currency

### Money & Life
4 progressive levels unlocking sequentially:
1. Earning & Spending (Yrs 3–5)
2. Saving & Banking (Yrs 5–8)
3. Investing & Super (Yrs 8–12)
4. Big Life Decisions (Yrs 10–12)

Amber `#F59E0B` session colour. Real Australian examples: ANZ, ASX, super. Based on ASIC MoneySmart.

### 11-screen architecture
Mocked in `zaeli-tutor-final-mockup-v4.html`:
1. Child Selector
2. Child Home (6 pillars + sessions)
3. Pillar Select (Zaeli's orienting questions)
4. Homework Session
5. Practice Session
6. Read Aloud Session
7. Write & Review Session
8. Comprehension Session
9. Money & Life Session
10. Parent Review (auth-gated)
11. Parent Progress (→ Our Family)

---

## ══════════════════════════════════
## KIDS HUB — FULL SPEC (LOCKED ✅ 30 Mar 2026)
## ══════════════════════════════════

### What it is
The kids' own space within the family plan. NOT premium. NOT AI tutoring. Jobs → earn points → choose rewards. Plus games for fun.

### Age tiers (driven by year_level in family_members)
| Tier | Years | Feel |
|------|-------|------|
| Little | Foundation–Yr 3 | Big emoji, huge text, very visual, playful |
| Middle | Yr 4–Yr 7 | Cleaner, stats strip, more density |
| Older | Yr 8–Yr 12 | Near-adult personal dashboard, mature layout |

### Jobs (LOCKED)
**Three cadences (parent sets per job):**
- Daily → resets at midnight automatically
- Weekly → resets on chosen day
- One-off → stays until ticked, then moves to archive

**Creation:** Name → auto-emoji suggestion → who → cadence → points. Under 20 seconds. Add to all kids simultaneously or per child. Emoji auto-suggested from job name keywords.

**Kid-initiated jobs:** Child taps +Add → proposes job name + suggested points + note → lands in Our Family for parent approval/edit/decline.

**Job states:**
- Active pending: full colour, at top of list
- Completed today: greyed, "Done today ✓" divider separates from pending
- All done: dark green hero card + Zaeli warm message

**GIPHY celebration (LOCKED):**
Fires on every job tick. Full-screen overlay. Curated GIPHY tags ("you rock", "congratulations", "nailed it", "celebration"). Always different. Zaeli message + points earned shown. Tap anywhere to dismiss.

**Archive:** Completed one-offs stored. Re-add with one tap — no re-typing. Auto-clears after 3 months.

**Pause toggle:** Parent can hide a job temporarily without deleting it.

### Points system (LOCKED — Philosophy B: currency)
- Points accumulate into one pool per child
- Points SPEND on redemption — balance drops
- Points never deduct until parent approves
- History tab: earnings (green) + redemptions (red)
- Games earn ZERO points — keeps points meaningful (jobs only)

### Rewards (LOCKED)
**Parent sets:** Name + emoji + point cost per child. Completely flexible — cash, screen time, privileges, experiences. No constraints.

**Design principle:** Always at least one affordable now + one to save toward. Parent nudged on first setup.

**Three states always visible:**
- Green border: can afford → active Redeem button
- Amber: almost there → points needed shown
- Grey: saving toward → locked

**Redemption flow:**
1. Child taps Redeem → confirm sheet shows current balance, cost, balance after
2. Zaeli contextual nudge ("you'll still have X pts — only Y away from the sleepover!")
3. Sent to parent for approval in Our Family
4. Parent approves → points deduct immediately, Zaeli warm message
5. Parent declines → optional note back to child

Rewards can be child-specific or shared across siblings.

### Games (LOCKED — 5 at launch)
All purely for fun. Zero points. Keeps points meaningful.

| Game | Cadence | Notes |
|------|---------|-------|
| Zaeli's Wordle | Daily | Same word for whole family — hero game |
| Word Scramble | Anytime | Difficulty adapts to year level |
| Maths Sprint | Anytime | 60 seconds, beat your high score |
| Aussie Trivia | Anytime | Australian animals, places, sport, culture |
| Mini Crossword | Weekly (Monday) | 5×5 grid |

### Family Leaderboard (LOCKED)
- Parent-toggleable on/off in Our Family settings
- Monthly reset — fresh competition each month
- Toggle note visible to kids ("Mum or Dad controls this")

### Parent management (lives in Our Family)
- Pending reward requests — approve (deducts points) / decline
- Pending job proposals from kids — approve / edit points / decline
- Per-child summary: jobs done today, balance
- Add/edit/pause/delete jobs
- Add/edit rewards per child
- Leaderboard toggle

### Mockup files
- `zaeli-kids-hub-mockup-v1.html` — 8 screens
- `zaeli-kids-hub-parent-management-v1.html` — 5 screens
- `zaeli-kids-hub-rewards-v2.html` — 5 screens (Philosophy B, full flow)

---

## ══════════════════════════════════
## OUR FAMILY — SPEC (IN PROGRESS 30 Mar 2026)
## ══════════════════════════════════

### What it is
The parent-facing hub. Avatar menu entry. Colour: `#F0C8C0` bg / `#D8CCFF` lavender / `#A01830` accent.

### Known content
- **Family profiles** — members, colours, roles, year levels
- **Tutor progress** — full per-child progress view (lives here, not in Tutor — keeps Tutor feeling like child's space)
- **Tutor session transcripts** — parent-authenticated full reviews
- **Kids Hub management** — all job and reward management, pending approvals, leaderboard toggle
- **Settings and billing** — subscription, add/remove Tutor per child

*Full design session active.*

---

## Key Product Moments

**"Zaeli noticed"** — flags things unprompted: conflicts, upcoming deadlines, swimmers needed. Builds trust, drives word of mouth.

**The brief** — Home cold open only. Never on channel transitions.

**Instant action** — When Zaeli says she did it, she did it. Real Supabase write, confirmed immediately.

---

## Competitive Position
- Not threatened by generic AI — they don't know your family
- Not threatened by calendar apps — they don't talk to you
- Real threat: Apple agentic Siri (18–30 months)
- Zaeli's moat: family context, memory, shared live experience, Tutor + Kids Hub ecosystem

---

## Pre-Launch Checklist
- [x] Splash — new brand spec
- [x] Home channel — complete
- [x] API logging — working
- [x] Calendar channel — complete (Session 22)
- [x] Admin dashboard — working
- [x] Tutor module — fully designed (30 Mar 2026)
- [x] Kids Hub — fully designed (30 Mar 2026)
- [ ] Our Family — design in progress
- [ ] Home inline calendar render
- [ ] Shopping channel colour refactor
- [ ] Meals channel colour refactor
- [ ] Kids Hub build (kids.tsx)
- [ ] Our Family build (family.tsx)
- [ ] Tutor rebuild to new 11-screen spec
- [ ] New channels: todos, notes, travel
- [ ] EAS build (keyboard tint fix)
- [ ] TestFlight build for Anna
- [ ] Remove AI toggle + DEV button
- [ ] Real Supabase auth
- [ ] Website + Stripe + onboarding
