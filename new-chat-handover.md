## Zaeli App — New Chat Handover
*25 March 2026 — Session 18. Copy this entire message to start a new chat.*

---

Hi! I'm continuing development of **Zaeli** — an iOS-first AI family life platform built in React Native / Expo. Please read this fully before we start.

---

### How I work
- I'm a **beginner developer** — always give me **full file rewrites**, never partial diffs
- One PowerShell command at a time, never chained with &&
- Copy files: `Copy-Item "C:\Users\richa\Downloads\file.tsx" "C:\Users\richa\zaeli\app\(tabs)\file.tsx"`
- **HTML mockup first, always** — agree on design in HTML before writing any React Native
- Explain what you're doing in plain English before code
- After every file copy: Ctrl+C then `npx expo start --dev-client`
- New chat sessions have no file access — ask me to paste the relevant file before editing

---

### Who I am
- **Richard**, goes by **Rich**. Logged-in user in app is **Rich**
- Family: Anna, Rich, Poppy (Yr6, age 12, girl), Gab (Yr4, age 10, BOY — Gabriel, he/him), Duke (Yr1, age 8, boy)
- Local path: `C:\Users\richa\zaeli` (Windows, PowerShell)
- Repo: https://github.com/RDK1981/zaeli (private)
- Admin: https://incomparable-gumdrop-32e4ba.netlify.app

---

### Key constants
```
DUMMY_FAMILY_ID = '00000000-0000-0000-0000-000000000001'
SONNET    = 'claude-sonnet-4-6'
GPT_MODEL = 'gpt-4.1-mini'
MEMBER_NAME = 'Rich'
expo-file-system: always import from 'expo-file-system/legacy'
api_logs columns: input_tokens / output_tokens (NOT prompt_tokens/completion_tokens)
```

---

### Family colours (LOCKED)
```
Rich: #4D8BFF  Anna: #FF7B6B  Poppy: #A855F7  Gab: #22C55E  Duke: #F59E0B
```

---

### Session 18 — What was accomplished (25 March 2026)

**Major design decision — Time Grid:**
Moved from flat event list to true time grid for calendar day view. This was a foundational UX decision discussed at length. Key principles locked:
- 48px per hour — true proportional height
- 1-2 overlaps: side by side, full text
- 3-4 overlaps: quarter columns, colour + avatar only, no text — tap for detail
- 5+: show 3 + "+N more" pill
- Conflict indicator: red ! badge at overlap point
- All-day/multi-day: banner lane ABOVE the time grid (not in the grid)
- Grid start: `max(6am, currentTime - 2 hours)` — shows 2 hours of past context (running events, recent pickups), then present + future
- Now-line always visible near top third

**Three-layer reminder system designed:**
- Layer 1 — Events: timed blocks in time grid
- Layer 2 — Reminders: day-attached chips above grid + in brief. NOT time blocks. Tagged to person.
- Layer 3 — Zaeli's knowledge: invisible, surfaces in brief contextually

**Chat render decisions locked:**
- Pixel-identical to dedicated screen — same component, full width, zero wrapper
- Fixed height with bottom fade — honest "more below" signal
- NO nested scroll (deferred to post-v1 based on user testing)
- NO date strip in chat (deferred to post-v1)
- Navigation handled conversationally: "What's tomorrow", "Show me Wednesday"
- Grid starts at same `max(6am, currentTime - 2 hours)` as dedicated screen

**V1 philosophy agreed:**
Ship clean, get in front of real users, listen to actual behaviour before over-engineering. Don't build nested scroll, date strip in chat, or real-time subscriptions until users ask for them.

**Mockup files created (gospel — build from these):**
- `zaeli-calendar-v4.html` — day view, month view, chat renders, add event, conversational edit
- `zaeli-timegrid-v2.html` — time grid architecture, overlap states, all-day banners, reminder chips, chat renders for all 3 scenarios

**Session 17 recap (24 March 2026):**
- Apple Developer account + dev build on iPhone 11 Pro Max
- API logging fixed (input_tokens/output_tokens)
- Admin dashboard restored
- Persona updated: MEMBER_NAME = Rich, no bare questions, match energy
- Calendar colour locked: Electric Red Coral #E8374B
- assignees jsonb column added to events table
- Mock events inserted for all 5 family members

---

### Immediate next step
**calendar.tsx full rewrite from scratch** against:
1. `zaeli-calendar-v4.html` — overall layout, colours, add event flow, conversational edit
2. `zaeli-timegrid-v2.html` — time grid specifics

This is a **clean rewrite, not a patch**. All existing logic (Supabase queries, AddEventFlow, EventDetailModal, time picker, repeat rules) stays intact. Only the visual layer is replaced with the time grid architecture.

Before starting the rewrite, ask Rich to:
1. Upload his current `calendar.tsx` so you have the latest version
2. Confirm the mockup files are in Downloads if needed

---

### All locked design decisions

**Calendar:**
- Accent: Electric Red Coral #E8374B
- True time grid (48px/hr), not flat list
- Grid start: max(6am, currentTime - 2 hours)
- No left border on event blocks — tinted background only
- Person avatars on each event
- Overlap: progressive disclosure (see above)
- All-day: banner lane above grid
- Reminders: chips, not time blocks
- Day/Month toggle only (Week removed permanently)
- No brief card
- Chat render: zero wrapper, full width, fixed height, bottom fade, no nested scroll, no date strip
- Conversational edit in chat (tap → Zaeli responds → 3 taps to done)
- Edit form on dedicated screen: opens immediately on tap

**General:**
- No floating FAB anywhere
- Hamburger menu only navigation
- Logo taps → home (router.replace('/(tabs)/'))
- Chat bar: + · divider · "Chat with Zaeli…" · mic · send
- Family colours locked (see above)
- SafeAreaView edges={['top']} always
- expo-file-system from 'expo-file-system/legacy'

---

### Supabase notes
- events table: `assignees` jsonb column added 24 March 2026
- reminders table: **needs to be created** (see CLAUDE.md for SQL)
- api_logs: input_tokens / output_tokens columns

---

### Tech reminders
- `npx expo start --dev-client` (not --clear)
- After EVERY file copy: Ctrl+C then restart
- Bundle ID: com.zaeli.app
- Device: iPhone 11 Pro Max (UDID: 00008030-0019116E1AC1802E)

---

**First priority: calendar.tsx full rewrite against zaeli-calendar-v4.html + zaeli-timegrid-v2.html**
