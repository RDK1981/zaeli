# ZAELI-PRODUCT.md — Product Vision & Decisions
*Last updated: 25 March 2026 — Session 18*

---

## What Zaeli Is

Zaeli is an iOS-first AI family life platform for Australian families with children. It is not a task manager, not a calendar app, not a shopping list. It is a switched-on family assistant that knows your family's life and helps you stay on top of it — through conversation.

**The core insight:** Most family coordination tools are data entry systems. Zaeli is a conversation. You talk to Zaeli, Zaeli acts. The screens (Calendar, Shopping, Meals, Todos) are data surfaces that Zaeli pulls from — not primary interfaces.

---

## Zaeli's Voice

Anne Hathaway energy — smart, warm, magnetic, a little witty. Never try-hard. Australian warmth without "mate" or "guys". Never starts with "I". Never sounds like a push notification. Plain text only — no asterisks or markdown.

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

### Chat is home
The home screen IS a chat with Zaeli. No dashboard, no overview. You open the app, Zaeli greets you, you're in conversation. Everything else is accessible through conversation or the hamburger menu.

### Screens are data tools
Calendar, Shopping, Meals, Todos — these screens exist for deep editing and management. For reading and quick actions, Zaeli handles everything in chat. Over time, users will rarely need to visit dedicated screens.

### Rich rendering in chat
When Zaeli surfaces data (calendar events, shopping list, meal plan), it renders **full-width, borderless, pixel-identical to the dedicated screen** — as if the screen extended into the conversation. No card wrappers, no borders added. Same component, same design, same code.

### Conversational first, form as fallback
Every action that can be done conversationally should be done conversationally. Forms exist as safety nets for edge cases. Calendar edits take 3 taps through Zaeli's questions — the edit form only opens if explicitly requested via "Manual edit".

### V1 principle — ship clean, listen to users
Do not over-engineer v1. Ship something clean and functional, get it in front of real families, and let actual behaviour tell you what to build next. Specific things deferred to post-v1 based on this principle:
- Nested scroll in chat calendar grid
- Date strip in chat calendar
- Real-time Supabase subscriptions
- Week view in calendar

---

## Calendar — Full Design System (Locked Session 18)

### The fundamental change from v1 design
Moved from a **flat event list** to a **true time grid**. This was a foundational UX decision — a flat list makes a 15-minute task look identical to a 2-hour block. The time grid makes duration, overlap, and free time immediately readable without reading any text.

### Time grid rules
- 48px = 1 hour. Proportional height always.
- Grid start: `max(6am, currentTime - 2 hours)` — shows recent past for context (running events, recent pickups) plus present and future
- Now-line always visible near top third of grid
- Empty hours are genuinely empty — free time is instantly readable

### Overlap handling — progressive disclosure
- 1-2 overlapping: side by side, full text
- 3-4 overlapping: quarter columns, colour + avatar only (no text) — tap for detail
- 5+ overlapping: show 3 + "+N more" pill
- Conflict indicator: red ! badge at overlap point
- **The key insight:** with the family colour system, you don't need to read event titles to understand the shape of the day. Colour does the work. Text is secondary information, available on tap.

### Three-layer reminder system
This was a key product decision in Session 18. Not everything belongs as a calendar event:
- **Layer 1 — Events:** timed commitments. Dentist at 9am. Soccer pickup at 3:15.
- **Layer 2 — Reminders:** day-attached but not time-blocked. "Poppy's swimmers — Thursdays." "Bins out Monday." Shown as chips above the time grid and surfaced in the brief.
- **Layer 3 — Zaeli's knowledge:** things Zaeli knows and factors into reasoning without surfacing constantly. "Duke has library Wednesdays." Zaeli mentions these when relevant in the brief.

### All-day / multi-day events
Banner lane above the time grid. Anna's 4-day Melbourne trip = coral pill spanning all 4 days — unavailability is instantly obvious without reading anything.

### Chat render philosophy
The calendar in Zaeli chat is a **preview, not a replacement**. Fixed height with a bottom fade — honest UI that communicates "there's more." The conversational interface handles navigation ("What's tomorrow", "Show me Wednesday") rather than UI controls. The dedicated screen is where you get full control.

---

## Screen-by-Screen Design Decisions

### Home (index.tsx) — Complete
- AI-first chat interface
- Brief generates on open, thinking dots → fade in complete text
- Calendar events render inline in chat — full width, no border

### Calendar (calendar.tsx) — Being rebuilt
See Calendar section above. Accent: Electric Red Coral #E8374B.

### Shopping (shopping.tsx) — Complete
- List / Pantry / Spend tabs
- Ticking food items → auto-syncs to Pantry
- Receipt scan → saves to receipts table

### Tutor Module — Complete
- Socratic method — NEVER give the answer
- Vision pipeline: Claude reads image → GPT responds

---

## Family Colour System (LOCKED)
```
Rich:  #4D8BFF  Anna: #FF7B6B  Poppy: #A855F7  Gab: #22C55E  Duke: #F59E0B
```
Person-first. External calendar events follow the person's colour.

---

## Key Product Moments

### "Zaeli noticed"
The most powerful moments are when Zaeli flags something the user didn't ask about. Conflict between Run with Ferg and Poppy's dance pickup. Library books due for Gab today. Swimmers needed for Poppy on Thursdays. These moments build trust and generate word of mouth.

### The brief
Four parts: callback → what's coming → what's slipping → contextual question. See zaeli-brief-logic-spec.md for full rules. The brief is the most important piece of communication in the app.

---

## Competitive Position
- Not threatened by generic AI tools — they don't know your family
- Not threatened by calendar apps — they don't talk to you
- Real threat: Apple agentic Siri (18-30 months)
- Strategy: build deep family-specific features (Tutor, brief intelligence, Zaeli noticed) that generic OS agents cannot replicate
- Zaeli's moat: family context, memory, shared live experience

---

## Pre-Launch Checklist
- [ ] calendar.tsx rewrite complete (time grid)
- [ ] reminders Supabase table created
- [ ] New EAS build (keyboard tint fix)
- [ ] TestFlight build for Anna
- [ ] Remove AI toggle from more.tsx
- [ ] Replace DUMMY_FAMILY_ID with real Supabase auth
- [ ] Website + Stripe + onboarding flow
