# ZAELI-PRODUCT.md — Product Vision & Decisions
*Last updated: 24 March 2026 — Session 17*

---

## What Zaeli Is

Zaeli is an iOS-first AI family life platform for Australian families with children. It is not a task manager, not a calendar app, not a shopping list. It is a switched-on family assistant that knows your family's life and helps you stay on top of it — through conversation.

**The core insight:** Most family coordination tools are data entry systems. Zaeli is a conversation. You talk to Zaeli, Zaeli acts. The screens (Calendar, Shopping, Meals, Todos) are data surfaces that Zaeli pulls from — not primary interfaces.

---

## Zaeli's Voice

Anne Hathaway energy — smart, warm, magnetic, a little witty. Never try-hard. Australian warmth without "mate" or "guys". Never starts with "I". Never sounds like a push notification. Plain text only — no asterisks or markdown.

**Critical rule added Session 17:** Zaeli never ends on a bare open question. "What do you need?" is explicitly forbidden. She always offers something specific before leaving the door open. She matches the user's energy all the way through — if they're light and playful, she stays there. No pivot to transactional mid-response.

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
The home screen IS a chat with Zaeli. There is no dashboard, no overview, no status screen. You open the app, Zaeli greets you, and you're in conversation. Everything else is accessible through that conversation or through the hamburger menu.

### Screens are data tools
Calendar, Shopping, Meals, Todos — these screens exist for deep editing and management. For reading and quick actions, Zaeli handles everything in chat. Over time, users will rarely need to visit dedicated screens.

### Rich rendering in chat
When Zaeli surfaces data (calendar events, shopping list, meal plan), it renders **full-width, borderless, pixel-identical to the dedicated screen** — as if the screen extended into the conversation. No card wrappers, no borders added. Same component, same design, same code.

### Conversational first, form as fallback
Every action that can be done conversationally should be done conversationally. Forms exist as safety nets for edge cases. Example: editing a calendar event in chat takes 3 taps through Zaeli's questions — the edit form only opens if explicitly requested via "Manual edit".

---

## Screen-by-Screen Design Decisions

### Home (index.tsx)
- AI-first chat interface — chat IS the home screen
- Entry state: big centred greeting, coral mic card, topic chips, chat bar
- Brief generates on open (or return after 30+ min), fades in when ready
- Thinking dots → fade in complete text (no typewriter)
- Dismissed state: relaxed card, "Still here if you need me"
- Calendar events render inline in chat — full width, no border
- Month view renders inline in chat — tap date → day events appear below

### Calendar (calendar.tsx) — BEING REBUILT
- Accent colour: **Electric Red Coral #E8374B**
- Day view: tinted event blocks (no left border), person avatars, family colour dots on strip
- Month view: multi-colour dots per family member, legend, tinted bubble preview
- Toggle: Day / Month only (Week removed)
- No brief card — Zaeli chat handles that
- Chat render: zero wrapper, full width, identical to dedicated screen
- Event tap in chat: conversational edit flow (Time · Day · Who's coming · Title · Delete · Manual edit)
- Event tap on dedicated screen: edit sheet opens immediately
- Floating bar: `+` · divider · "Chat with Zaeli…" · mic · send

### Shopping (shopping.tsx)
- List tab: sticky toolbar, Recently Bought in magenta (no strikethrough)
- Pantry tab: scan buttons auto-detect receipt vs pantry photo
- Spend tab: monthly summary + receipt history
- Ticking food items → auto-syncs to Pantry
- Household/Other → do NOT sync to Pantry

### Tutor Module
- Hub: Zaeli noticed card speaks TO kids (not parents)
- Homework Help: Socratic method — NEVER give the answer
- Vision pipeline: Claude reads image → GPT responds with context

---

## Family Colour System (LOCKED)
```
Rich:  #4D8BFF  (blue)
Anna:  #FF7B6B  (coral)
Poppy: #A855F7  (purple)
Gab:   #22C55E  (green)
Duke:  #F59E0B  (amber)
```
Person-first, not calendar-first. External calendar events follow the person's colour, not the source calendar's colour.

---

## Screen Accent Colours
```
Home/Chat:    #0057FF  (Zaeli blue)
Calendar:     #E8374B  (Electric Red Coral)
Shopping:     #000000  (black)
Meals:        #FF8C00  (orange)
Todos:        #B8A400  (gold)
Tutor:        #1A1A2E  (dark navy)
```

---

## Key Product Moments

### "Zaeli noticed"
The most powerful moments in the product are when Zaeli flags something the user didn't ask about. Conflict between Run with Ferg and Poppy's dance pickup. Shopping list sitting at 6 items for 3 days. These moments build trust and generate word of mouth.

### The brief
Zaeli's brief is the most important piece of communication in the app. It runs on open (or return after 30+ min). Four parts: callback → what's coming → what's slipping → contextual question. See zaeli-brief-logic-spec.md for full rules.

### Real-time sync
Supabase real-time subscriptions mean changes from Rich's chat update Anna's screen live. Both phones share the same family data. This is the shared calendar experience — not a separate feature, just how the whole platform works.

---

## Growth Strategy (when ready to scale)
- Phase 1: Seed via personal networks and tight communities (0–500 families)
- Phase 2: Referral engine + short-form content (500–3,000 families)
- Phase 3: Micro-influencer + press + school/childcare partnerships (3,000–10,000)
- Key retention insight: Zaeli's value is best understood through lived experience. Retaining active subscribers past day 3 is the real challenge, not installs.
- 10,000 families = ~0.3% of Australian addressable market — achievable but retention-dependent

---

## Competitive Position
- Not threatened by generic AI tools (ChatGPT, Gemini) — they don't know your family
- Not threatened by calendar apps — they don't talk to you
- Real threat: Apple. When agentic Siri ships (18-30 months), casual coordination gets absorbed
- Strategy: build deep family-specific features (Tutor, brief intelligence, Zaeli noticed) that generic OS agents cannot replicate
- Zaeli's moat is family context, memory, and the shared live experience

---

## Pre-Launch Checklist
- [ ] Remove AI provider toggle from more.tsx
- [ ] Replace DUMMY_FAMILY_ID with real Supabase auth
- [ ] calendar.tsx rewrite complete
- [ ] New EAS build (keyboard tint fix)
- [ ] TestFlight build for Anna
- [ ] Website + Stripe + onboarding flow
- [ ] Real-time Supabase subscriptions wired up
