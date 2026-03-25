# ZAELI-PRODUCT.md — Product Vision & Decisions
*Last updated: 25 March 2026 — Sessions 17-18 complete*

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

**Cold start flow (as of Sessions 17-18):** Splash → directly into chat. The intermediate "Hey Anna / Speak to Zaeli / tap a topic" entry screen has been removed — it was annoying and added no value. Zaeli's brief generates immediately on open.

### Screens are data tools
Calendar, Shopping, Meals, Todos — these screens exist for deep editing and management. For reading and quick actions, Zaeli handles everything in chat. Over time, users will rarely need to visit dedicated screens.

### Rich rendering in chat
When Zaeli surfaces data (calendar events, shopping list, meal plan), it renders **full-width, borderless, pixel-identical to the dedicated screen** — as if the screen extended into the conversation. No card wrappers, no borders added. Same component, same design, same code.

### Conversational first, form as fallback
Every action that can be done conversationally should be done conversationally. Forms exist as safety nets for edge cases. Calendar edits happen through Zaeli — the manual form only opens if explicitly requested.

### V1 principle — ship clean, listen to users
Do not over-engineer v1. Ship something clean and functional, get it in front of real families, and let actual behaviour tell you what to build next. Deferred to post-v1:
- Real-time Supabase subscriptions
- Week view in calendar
- Nested scroll in chat calendar grid

---

## Calendar — Full Design System (Locked Sessions 17-18)

### The fundamental change
Moved from a **flat event list** to a **true time grid**. A flat list makes a 15-minute task look identical to a 2-hour block. The time grid makes duration, overlap, and free time immediately readable without reading any text.

### Time grid rules
- 48px = 1 hour. Proportional height always.
- Full day rendered: 0am–midnight (24 hours). Auto-scrolls to `max(0, currentHour - 2)` on load.
- Now-line: Electric Red Coral dot + line, always visible.
- Half-hour dashed guidelines between hour lines.
- Empty hours are genuinely empty — free time is instantly readable.

### Overlap handling — progressive disclosure
- 1-2 overlapping: side by side, full text
- 3-4 overlapping: compact columns, colour + avatar only — tap for detail
- Conflict indicator: red `!` badge at overlap point
- The family colour system means you don't need to read event titles to understand the shape of the day

### All-day / multi-day events
Banner lane above the time grid. Unavailability is instantly obvious without reading anything.

### Three-layer reminder system
- **Layer 1 — Events:** timed commitments. Dentist at 9am. Soccer pickup at 3:15.
- **Layer 2 — Reminders:** day-attached but not time-blocked. Shown as chips above the grid.
- **Layer 3 — Zaeli's knowledge:** invisible context that surfaces in the brief when relevant.

### Calendar chat bar
- Identical structure to Zaeli home chat bar — see Chat Bar section below
- Only difference: `+` button opens Add Event sheet (not attachment sheet)
- Typed text navigates to Zaeli home with `seedMessage` param — Zaeli responds in context
- Mic navigates to Zaeli home with `autoMic:'true'` — recording starts automatically

### Calendar event CRUD via Zaeli
Zaeli in home chat (index.tsx) uses Anthropic Claude with tool-calling to write directly to Supabase:
- `add_calendar_event` — inserts with title, date, start_time, end_time, timezone
- `update_calendar_event` — searches by title + optional `search_date`, updates in place
- `delete_calendar_event` — deletes by title search
- Duration is preserved when only start time is changed
- Today's date is always passed to Claude so "tomorrow" calculations are correct

### Photo scan → event creation
1. User taps `+` → "Scan an invite or fixture"
2. Camera or photo library opens
3. Image URI stored in shared module variable
4. Navigates to Zaeli home with `calendarScan:'true'` param
5. Zaeli reads image via Anthropic vision (claude-sonnet-4-20250514)
6. Extracts event details, confirms with user, adds to calendar via tool call

---

## The Canonical Chat Bar (LOCKED — all screens identical)

This was a major focus of Sessions 17-18. Every screen must use exactly the same chat bar. See `ZAELI-CHAT-BAR-SPEC.md` for full detail.

**Structure:**
```
inputArea (position:absolute, bottom:0, transparent background)
└── barPill (borderRadius:30, paddingV:14, paddingH:16, border:1, shadow)
    ├── barBtn 34×34 → IcoPlus 20×20 SVG    ← only this changes per screen
    ├── barSep 1×18px
    ├── TextInput (fontSize:15, Poppins_400Regular)
    ├── barBtn 34×34 → IcoMic 20×20 SVG
    └── barSend 32×32 borderRadius:16 #FF4545 → IcoSend 16×16 white
```

**Keyboard handling:** KAV wraps `contentWrap` (position:relative) which contains ScrollView + inputArea (position:absolute). `keyboardWillShow/Hide` listeners switch `inputAreaKb` (paddingBottom: iOS 8px vs 30px at rest).

**Per-screen `+` action:**
| Screen | + action |
|--------|----------|
| Home (index) | Opens attachment/action sheet |
| Calendar | Opens Add Event sheet |
| Shopping | Opens Add Item |
| All others | Opens Zaeli attachment sheet |

---

## Screen-by-Screen Design Decisions

### Home (index.tsx) — Active development
- Zaeli IS the home screen — no separate chat screen
- Cold start: Splash (1.5s) → chat immediately (entry screen removed)
- Brief generates on open with thinking dots → fade in
- Tool-calling: Zaeli writes calendar events, todos, shopping items directly to Supabase
- Voice: Whisper transcribes → sends as first message → Zaeli responds
- Calendar context: fetches `start_time` (not `time`) across 7-day window, limit 20 events

### Calendar (calendar.tsx) — Active development
- Time grid (48px/hour, 0am–midnight)
- Day strip: multi-colour family dots, scrolls to today on load
- Month view: larger numbers, multi-colour dots, family legend, day preview
- Event detail: View mode + manual Edit mode + Edit with Zaeli
- Add event: Zaeli path (with context) + photo scan + manual form
- Accent: Electric Red Coral #E8374B

### Shopping (shopping.tsx) — Complete
- List / Pantry / Spend tabs
- Ticking food items → auto-syncs to Pantry
- Receipt scan → saves to receipts table

### Tutor Module — Complete
- Socratic method — NEVER give the answer
- Vision pipeline: Claude reads image → GPT guides
- Full-width document-style chat (not bubbles)

---

## Family Colour System (LOCKED)
```
Rich:  #4D8BFF  
Anna:  #FF7B6B  
Poppy: #A855F7  
Gab:   #22C55E  
Duke:  #F59E0B
```
Person-first. External calendar events follow the person's colour. Used for grid dots, event blocks, avatars throughout.

---

## Per-Screen Accent Colours (LOCKED)
```
Home & Chat:    Electric Coral  #FF4545   (send button, mic active)
Calendar:       Electric Red    #E8374B
Shopping:       Forest Green    #1A7A45
Meal Planner:   Terracotta      #E8601A
Tutor:          Deep Violet     #6B35D9
To-do List:     Zaeli Gold      #C9A820
Travel:         Ocean Cyan      #0096C7
Notes:          Sage Olive      #5C8A3C
Our Family:     Magenta Pink    #D4006A
Settings:       Slate Grey      #6B7280
```

---

## Key Product Moments

### "Zaeli noticed"
The most powerful moments are when Zaeli flags something the user didn't ask about. Conflict between Run with Ferg and Poppy's dance pickup. Library books due for Gab today. Swimmers needed for Poppy on Thursdays. These moments build trust and generate word of mouth.

### The brief
Four parts: callback → what's coming → what's slipping → contextual question. See zaeli-brief-logic-spec.md for full rules. The brief is the most important piece of communication in the app.

### Instant action
When Zaeli says she's done something — she actually did it. No "I'll remind you to do that" — she does it. Real writes to Supabase, confirmed immediately. This is the product's core promise.

---

## Competitive Position
- Not threatened by generic AI tools — they don't know your family
- Not threatened by calendar apps — they don't talk to you
- Real threat: Apple agentic Siri (18-30 months)
- Strategy: build deep family-specific features (Tutor, brief intelligence, Zaeli noticed) that generic OS agents cannot replicate
- Zaeli's moat: family context, memory, shared live experience

---

## Pre-Launch Checklist
- [ ] calendar.tsx rewrite complete (time grid) — in progress, mostly working
- [ ] Calendar event CRUD verified end-to-end (add/update/delete via Zaeli)
- [ ] Photo scan → event creation verified end-to-end
- [ ] Console.log cleanup from debugging
- [ ] New EAS build (keyboard tint fix)
- [ ] TestFlight build for Anna
- [ ] Remove AI toggle from more.tsx
- [ ] Replace DUMMY_FAMILY_ID with real Supabase auth
- [ ] Website + Stripe + onboarding flow
- [ ] tutor-practice.tsx UX review
- [ ] tutor-reading.tsx UX review
