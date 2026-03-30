# ZAELI-PRODUCT.md — Product Vision & Decisions
*Last updated: 30 March 2026 — Design session complete. Tutor ✅ Kids Hub ✅ Our Family ✅*

---

## What Zaeli Is

Zaeli is an iOS-first AI family life platform for Australian families with children. A switched-on family assistant that knows your family's life and helps you stay on top of it — through conversation.

**Core insight:** Most family tools are data entry systems. Zaeli is a conversation. Channels are data surfaces Zaeli pulls from and renders inline — not screens you navigate to.

**Tagline:** Less chaos. More family.

---

## Zaeli's Voice

Anne Hathaway energy — smart, warm, magnetic, a little witty. Australian warmth without "mate" or "guys". Never starts with "I". Never sounds like a push notification. Plain text only.

Never ends on a bare open question. Always offers something specific first. Matches user energy throughout.

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

**Avatar tap →** Our Family, Tutor, Settings, Sign out.

**Portal pills** — destination channel bg + accent chevron. Max 3.
**Quick reply chips** — white bg, ink border. Conversation only.

**Tutor** — standalone premium module. A$9.99/child/month. Avatar menu only.
**Kids Hub** — family plan channel. NOT premium.
**Our Family** — parent hub. Avatar menu. No chat bar.

Channel transitions: no new brief. Only Home generates a brief on cold open.

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
Rich: #4D8BFF · Anna: #FF7B6B · Poppy: #A855F7 · Gab: #22C55E · Duke: #F59E0B
```

---

## Splash Screen (LOCKED)
- Bg: `#A8E8CC` Aqua Green, 3s hold
- Wordmark: DM Serif 96px, ink + `#FAC8A8` peach on 'a' and 'i', bounces in
- Greeting: "Good morning/afternoon/evening, Rich 👋" Poppins 400 18px
- Tagline: "LESS CHAOS. MORE FAMILY." Poppins 500 12px uppercase
- Peach loading dots, radial glow orbs

---

## Home Channel (LOCKED)
- Two-part brief: DM Serif 28px hero [italic highlights] + Poppins 17px follow-up
- GPT returns `{"hero":"[brackets]","detail":"prose","replies":["..."]}`
- Tool-calling: add/update/delete events, todos, shopping items
- **Next build task:** Home inline calendar render — EventCards inline in chat, "See full calendar →" portal pill

---

## Calendar Channel (LOCKED Session 22)
- Two-row mint banner, pinned day strip, event cards (auto-emoji, dynamic avatars)
- Month view, tool-calling, Whisper voice, "View events" frosted pill
- No time grid — event cards only

---

## ══════════════════════════════════
## TUTOR MODULE (LOCKED ✅ 30 Mar 2026)
## ══════════════════════════════════

### What it is
Personal AI tutor. Foundation to Year 12. Premium A$9.99/child/month. Standalone — not a channel. Avatar menu only. Socratic method — guides without giving the answer directly.

### AI architecture
- GPT-5.4-mini → all conversation turns
- Claude Sonnet → any turn with a photo (homework sheets, writing, book covers)
- Whisper-1 → all voice including Read Aloud

### The six pillars
| Pillar | Description |
|--------|-------------|
| Homework | Photo/voice/text — Sonnet reads worksheet, GPT guides Socratically |
| Practice | Curriculum sets — MC + working questions — adaptive difficulty |
| Read Aloud | Voice-first — Whisper transcribes, Zaeli analyses fluency + presentation |
| Write & Review | Submit writing, structured before/after feedback. Never rewrites whole piece |
| Comprehension | Passage inline → literal → inferential → analytical. NAPLAN-aligned |
| Money & Life | Australian financial literacy — 4 progressive levels |

### Difficulty bands (LOCKED)
Foundation / Core / Extension — three per year level. Silent adaptive adjustment. Kids never see the label.
- 3 correct, no hints → move up one band
- Wrong twice → auto Hint 2
- Wrong three times → Hint 3, drop one level next question
- 5 correct at Extension → flag "working above year level"

### Hint system (LOCKED)
25/75 split pill pinned above chat bar at all times.
- **Hint 1/3** — technique on a DIFFERENT equation. Never touches child's question.
- **Hint 2/3** — first step of their equation only.
- **Hint 3/3** — full worked example, framed as "let's look at this together".
Hint count per question logged for parent review.

### Parent vs child view (LOCKED)
- Child in Tutor: simple summary only
- Parent authenticated in Tutor: full transcript + hints per question
- Full progress (subject bars, bands, Zaeli observations) → Our Family only

### Curriculum
Australian Curriculum v9.0 (ACARA). Full map in `zaeli-tutor-curriculum-map-v1.html`.
Foundation ≠ Year 1. NAPLAN years: 3, 5, 7, 9. All examples: Australian contexts, AUD.

### Money & Life
4 progressive levels: Earning & Spending · Saving & Banking · Investing & Super · Big Life Decisions.
Amber `#F59E0B` session colour. Real Australian examples: ANZ, ASX, super. Based on ASIC MoneySmart.

### Mockup
`zaeli-tutor-final-mockup-v4.html` — 11 screens.
`zaeli-tutor-curriculum-map-v1.html` — Foundation to Year 12 content map.

---

## ══════════════════════════════════
## KIDS HUB (LOCKED ✅ 30 Mar 2026)
## ══════════════════════════════════

### What it is
Kids' own space. Family plan (NOT premium). Jobs → earn points → choose rewards. Games for fun. No AI tutoring.

### Age tiers
Little (Fn–Yr3): big emoji, visual-heavy · Middle (Yr4–7): stats strip, cleaner · Older (Yr8–12): near-adult dashboard.

### Jobs (LOCKED)
- **Cadences:** Daily (midnight reset) / Weekly (chosen day) / One-off (archives on completion)
- Parents create jobs from Our Family: name → auto-emoji → who → cadence → points. Under 20 seconds.
- Kids can propose jobs → parent approves/edits/declines from Our Family
- **GIPHY celebration** on every tick: full-screen, curated tags, always different, tap to dismiss
- Completed jobs grey below "Done today ✓" divider — stay visible as achievement record
- All-done state: dark green hero card + Zaeli warm message
- **Archive:** completed one-offs stored, re-add with one tap
- **Pause toggle:** hide job temporarily without deleting

### Points (LOCKED — Philosophy B: currency)
- Single pool per child
- Spent on redemption — balance drops
- Never deduct until parent approves
- History tab: earnings (green) + redemptions (red)
- Games earn ZERO points — keeps points meaningful (jobs only)

### Rewards (LOCKED)
- Parents set name + emoji + point cost — completely flexible
- **Always show:** one affordable now + one to save toward
- Parent nudged on first setup with age-appropriate suggestions
- **Three visible states:** Green (can afford) · Amber (almost) · Grey (saving toward)
- Redemption confirm: current balance, cost, balance after, contextual nudge
- Points only deduct after parent approves in Our Family
- History tab shows full record

### Games (LOCKED — 5 at launch, no points)
| Game | Cadence |
|------|---------|
| Zaeli's Wordle | Daily — same word for whole family |
| Word Scramble | Anytime |
| Maths Sprint | Anytime — 60s, beat your score |
| Aussie Trivia | Anytime |
| Mini Crossword | Weekly (Monday) |

### Leaderboard
Parent-toggleable. Monthly reset. Toggle note visible to kids.

### Mockups
`zaeli-kids-hub-mockup-v1.html` — 8 screens
`zaeli-kids-hub-parent-management-v1.html` — 5 screens
`zaeli-kids-hub-rewards-v2.html` — 5 screens (Philosophy B, full redemption flow)

---

## ══════════════════════════════════
## OUR FAMILY (LOCKED ✅ 30 Mar 2026)
## ══════════════════════════════════

### What it is
The parent control centre. Avatar menu entry. `#F0C8C0` bg / `#D8CCFF` lavender / `#A01830` accent.
**No chat bar** — the only channel without one. Functional-first with a Zaeli brief.

### Opening brief (LOCKED)
DM Serif hero + Poppins detail card. Always present, content adapts:
- **Active day:** "3 things need your attention today." + quick reply chips per action
- **Quiet day:** Subtle green strip — "All good today. Everyone's on top of their jobs."

### Four sections

**1. Pending Actions** (always first, collapses when empty)
Three action types, each with a colour tag:
- 🟢 Job proposals (green) — child-initiated, approve/edit points/decline
- 🔴 Reward requests (red) — approve (deducts points instantly) / decline
- 🟣 Zaeli insights (purple) — occasional, actionable ("Poppy ready for Yr 7 Maths")

**2. Our Kids**
Per-child cards showing: name, age, year level, streak, points balance, jobs done today, Tutor band.
Tap → child detail view containing:
- Tutor: subject bars, difficulty bands, Zaeli written observation, recent sessions with View links
- Kids Hub: stats strip, today's jobs mini-list, balance, progress to next reward
- Upsell card if Tutor not enrolled

**3. Family Profiles**
Each member: name, DOB, age (auto-calculated), year level (auto-calculated from DOB), colour swatch (tappable to change), role, login status.

**Login model (LOCKED):**
- Parents: full email + password account
- Older kids (parent enables via toggle): own login → child-scoped view (Kids Hub + Tutor only)
- Young kids: profile only, use parent's device — "Invite to Zaeli" button appears when appropriate

**4. *(Settings moved out)***
Settings is a separate avatar menu destination — keeps Our Family focused on people and actions.

### Avatar notification badge
Red dot with count on avatar when actions pending. Count surfaced on Our Family row in menu.

### Settings (DEFERRED)
Own avatar menu destination. Design when billing/auth is ready. Known contents: account, notifications, billing/plan, Tutor add-ons per child, sign out.

### Mockup
`zaeli-our-family-mockup-v1.html` — 6 screens.

---

## Key Product Moments

**"Zaeli noticed"** — flags things unprompted: conflicts, upcoming deadlines, swimmers needed. Builds trust, drives word of mouth.

**The brief** — Home cold open only + Our Family opening. Never on other channel transitions.

**Instant action** — When Zaeli says she did it, she did it. Real Supabase write, confirmed immediately.

**Birthday awareness** — DOB stored per member. Zaeli mentions upcoming birthdays in Home brief. Birthday reminders as notification option in Settings.

---

## Competitive Position
- Not threatened by generic AI — they don't know your family
- Not threatened by calendar apps — they don't talk to you
- Real threat: Apple agentic Siri (18–30 months)
- Zaeli's moat: family context, memory, Tutor + Kids Hub ecosystem, lived experience

---

## Pre-Launch Checklist
- [x] Splash — new brand spec
- [x] Home channel — complete
- [x] API logging — working
- [x] Calendar channel — complete (Session 22)
- [x] Admin dashboard — working
- [x] Tutor module — fully designed
- [x] Kids Hub — fully designed
- [x] Our Family — fully designed
- [ ] Home inline calendar render
- [ ] Shopping colour refactor
- [ ] Meals colour refactor
- [ ] Kids Hub build (kids.tsx)
- [ ] Our Family build (family.tsx)
- [ ] Tutor rebuild to 11-screen spec
- [ ] New channels: todos, notes, travel
- [ ] family_members table: add dob, year_level, has_own_login columns
- [ ] EAS build (keyboard tint fix)
- [ ] TestFlight for Anna
- [ ] Remove AI toggle + DEV button
- [ ] Real Supabase auth + child login model
- [ ] Website + Stripe + onboarding
- [ ] Settings module (design + build — deferred)
