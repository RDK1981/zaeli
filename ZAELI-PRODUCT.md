# ZAELI-PRODUCT.md — Product Vision & Decisions
*Last updated: 26 March 2026 — Session 21 complete*

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
DM Serif Display, always lowercase `zaeli`. The 'a' and 'i' carry a complementary colour — the AI easter egg.

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

AI colour = eyebrow = send button bg = portal pill bg. Send arrow always ink `#0A0A0A`.
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

- Two-row brief: DM Serif 28px hero with [italic highlights] + Poppins 15px follow-up
- GPT returns `{"hero":"[bracketed] key words","detail":"prose","replies":["..."]}`
- Placeholder cycles 4s: "Chat with Zaeli…" → "Or just speak…" → "Ask anything…"
- Mic: `#F5C8C8` blush 26px, Send: `#A8D8F0` sky blue ink arrow

---

## Calendar Channel (LOCKED Session 21)

### The key design decision: no time grid
Full 24-hour grid tested and abandoned — too dense, unusable on mobile. Replaced with clean event cards. This was the right call and the design is stronger for it.

### Layout
```
Banner (mint #B8EDD0)
  Row 1: zaeli wordmark | Calendar + avatar
  Row 2: Day / Month toggle (full width)
Day strip (white bg — DAY VIEW ONLY, pinned above divider)
  Today anchors LEFT. 120 days forward. No past days.
Fixed divider (permanent scroll boundary)
Scrollable content:
  Notes/all-day chips strip
  Date label
  Event cards
  Zaeli opening prompt (client-side) + chips
  Chat divider
  Chat messages
Chat bar (absolute bottom)
```

### Event Card (ONE component — used everywhere)
- Tinted bg: primary member colour at 9% opacity. No left accent bar.
- Title: Poppins 600 18px
- Time: Poppins 500 14px
- Avatars: RIGHT side, column, 32×32, 12px initials
- Conflict: red tinted panel + dot, inline on card
- Tap → EventDetailModal
- Used identically in Calendar Day, Calendar Month preview, Home inline render

### Day view
- Events then Zaeli opening prompt (no API call — smart client-side logic)
- 0 events: warm empty state + "want to add something?"
- Conflict detected: leads with the conflict
- Scroll down into full chat window, banner + strip always pinned

### Month view
- No day strip
- Tap date → same EventCards below grid (no view switch)
- Toggle → Day jumps to selected date

### Chat
- One shared thread (Day and Month share same conversation)
- Self-contained Anthropic tool-calling (Option A — duplicated from index.tsx)
- Photo scan handled locally — no navigation to Home

### Key product moments
- **"Zaeli noticed"** — proactive conflict flagging on load
- **Conflict card** — inline red warning on overlapping events
- **Photo scan** — scan invite, Zaeli reads and adds event

---

## Key Product Moments

### "Zaeli noticed"
Zaeli flags things the user didn't ask about. Conflict detection, library books due, swimmers needed. These build trust and drive word of mouth.

### The brief
Only on Home cold open. Never on channel transitions.

### Instant action
When Zaeli says she's done something — she did it. Real Supabase write, confirmed immediately.

---

## Architecture Decisions (Locked)

**No time grid.** Event cards only. Cleaner, readable, kid-friendly.
**One EventCard component.** Calendar Day, Month, Home inline — identical. One fix fixes all.
**One shared chat thread.** Day and Month views share conversation. No split history.
**Scroll-to-chat model.** Events above chat in one ScrollView. "View events" pill shortcut pending.
**Client-side opening prompt.** No API call on Calendar load. Cost saving.

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
- [x] API logging fixed
- [x] Calendar channel — card design, day/month, self-contained chat
- [x] Admin dashboard — feature badge colours
- [ ] Calendar remaining fixes (past-date rules, location, mic, view-events pill)
- [ ] Shopping channel colour refactor (`#F0E880` / `#D8CCFF`)
- [ ] Meals channel colour refactor
- [ ] New channels: kids, todos, notes, travel, family
- [ ] New EAS build (keyboard tint fix)
- [ ] TestFlight build for Anna
- [ ] Remove AI toggle from more.tsx
- [ ] Replace DUMMY_FAMILY_ID with real auth
- [ ] Website + Stripe + onboarding
- [ ] Tutor UX review (tutor-practice.tsx, tutor-reading.tsx)
