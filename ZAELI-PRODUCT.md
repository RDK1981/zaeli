# ZAELI-PRODUCT.md — Product Vision & Decisions
*Last updated: 27 March 2026 — Session 22 complete*

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
- Homework add-on: A$9.99/child/month
- 100% web sales — no App Store cut

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
NOT a channel. A$9.99/child/month. Own pages, avatar menu only. Socratic method — never gives the answer directly.

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
**Exception:** Calendar send button uses `#B8EDD0` mint (the page bg) for visual harmony.

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

---

## Calendar Channel (LOCKED Session 22)

### What we built
The Calendar channel is a complete, production-quality channel with:
- Two-row mint banner (wordmark + Day/Month toggle)
- Pinned day strip (7 days back + 120 forward, today anchors left)
- Clean event cards with auto-emoji, coloured time text, right-side dynamic avatars
- Month view with Poppins numbers, tap-to-select dates
- Self-contained Anthropic tool-calling for add/update/delete
- Voice recording → Whisper → auto-send
- Full chat render matching Home (star eyebrow, icon rows, thumbs)
- Scroll-down arrow + "View events" frosted pill
- All API calls logged to admin dashboard

### Key design decisions (LOCKED)
**No time grid.** Event cards only — cleaner, more readable, kid-friendly.
**One EventCard component.** Calendar Day, Month, Home inline — identical.
**One shared chat thread.** Day and Month share conversation.
**Scroll-to-chat model.** Events above, chat below, all one ScrollView.
**Client-side opening prompt.** No API cost on load.
**7 days back in strip.** Month view is the escape hatch for older dates.
**Dynamic avatar sizing.** 1-2: 28px col, 3: 24px col, 4+: 22px 2-col wrap.

### Event Card
- 18% tint bg (family colour + '2E'), no accent bar
- Auto-emoji by keyword (40+ patterns: sushi→🍣, dog walk→🐕, t-ball→⚾ etc.)
- Time text coloured to primary assignee
- Location shown as "📍 location" below time
- Avatars right side, dynamic size by count

### Tool-calling critical details
- `assignees` is array — schema defines it as array type with family mapping
- "whole family" → `['1','2','3','4','5']`, "the kids" → `['3','4','5']`
- System prompt pre-computes next 7 days as exact YYYY-MM-DD dates
- Past-date rule: Zaeli flags and suggests future alternative
- Photo scan rule: flags past dates from images

---

## Next Major Feature: Home Inline Calendar Render

**The concept:** When Zaeli in Home chat shows calendar information, EventCards render inline in the conversation thread — the same component used in Calendar channel. Below the cards, a portal pill "See full calendar →" navigates to Calendar.

**Why this matters:** It's the first real demonstration of the channel philosophy — data comes to you, not the other way around. The user never has to leave Home to see what's on.

**Approach to discuss:**
- Trigger: GPT returns a structured calendar block in its response
- Render: EventCard components inline in the Home ScrollView
- Navigation: "See full calendar →" portal pill (mint bg, green chevron)
- Scope: today's events + next 2-3 days max inline; full calendar via pill

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
- Real threat: Apple agentic Siri (18-30 months)
- Zaeli's moat: family context, memory, shared live experience, Tutor module

---

## Pre-Launch Checklist
- [x] Splash — new brand spec
- [x] Home channel — complete
- [x] API logging — all features working
- [x] Calendar channel — complete (Session 22)
- [x] Admin dashboard — all feature types showing
- [ ] Home inline calendar render (next)
- [ ] Shopping channel colour refactor
- [ ] Meals channel colour refactor
- [ ] New channels: kids, todos, notes, travel, family
- [ ] New EAS build (keyboard tint fix)
- [ ] TestFlight build for Anna
- [ ] Remove AI toggle from more.tsx
- [ ] Remove DEV 📅 button from Home
- [ ] Replace DUMMY_FAMILY_ID with real auth
- [ ] Website + Stripe + onboarding
- [ ] Tutor UX review (tutor-practice.tsx, tutor-reading.tsx)
