# CLAUDE.md — Zaeli Project Context
*Last updated: 25 March 2026 — Session 18*

---

## Who You Are Talking To
- **Richard** (goes by Rich) — beginner developer
- Always give **full file rewrites** — never partial diffs or targeted edits unless a single truly isolated line
- One PowerShell command at a time, no && chaining
- Copy files: `Copy-Item "C:\Users\richa\Downloads\file.tsx" "C:\Users\richa\zaeli\app\(tabs)\file.tsx"`
- **HTML mockup first, always** — agree on exact design in HTML before writing React Native
- Explain what you're doing in plain English before code
- After every file copy: `npx expo start --dev-client` (R alone is not sufficient in dev build)
- New chat sessions don't have file access — always ask Rich to paste the relevant file before editing

---

## The Business
Zaeli is an iOS-first AI family life platform for Australian families with children.

**Revenue:**
- Family plan: A$14.99/month
- Homework add-on: A$9.99/child/month
- 100% web sales — no App Store cut

**Unit economics (verified):**
- GPT-4.1 mini chat: ~A$0.0037/msg
- GPT-4.1 mini brief: ~A$0.002/call
- Claude Sonnet 4.6 vision: ~A$0.03/receipt
- Realistic family monthly API cost: ~A$1.50 → ~85% margin

---

## Zaeli Persona
Anne Hathaway energy — smart, warm, magnetic, a little witty.
- Australian warmth. NEVER "mate" or "guys"
- Never start with "I"
- No asterisks or markdown in spoken responses — plain text only
- NEVER sound like a push notification or task manager
- Always time-aware — knows exact date, day, time
- **NEVER end on a bare open question** — always offer something specific first
- Match the energy of what the user sent all the way through
- Never pivot to transactional mid-response

---

## Stack
- React Native + Expo SDK 54 (iOS-first)
- Supabase (Postgres, Sydney ap-southeast-2, ID: rsvbzakyyrftezthlhtd)
- Claude Sonnet 4.6 (`claude-sonnet-4-6`) — vision/scan only
- OpenAI GPT-4.1 mini (`gpt-4.1-mini`) — all chat/briefs/homework
- OpenAI Whisper-1 — voice transcription
- expo-router, expo-av, react-native-svg
- Poppins font (UI), DMSerifDisplay (hero titles)
- No bottom tab bar — hamburger menu only
- `expo-file-system`: always import from `expo-file-system/legacy` (SDK 54)

---

## Key Constants
```
DUMMY_FAMILY_ID = '00000000-0000-0000-0000-000000000001'
SONNET    = 'claude-sonnet-4-6'
GPT_MODEL = 'gpt-4.1-mini'
MEMBER_NAME = 'Rich'
api_logs columns: input_tokens / output_tokens (NOT prompt_tokens/completion_tokens)
```

---

## Family Colour System (LOCKED)
```
Rich:  #4D8BFF  Anna: #FF7B6B  Poppy: #A855F7  Gab: #22C55E  Duke: #F59E0B
```

---

## Screen Accent Colours (LOCKED)
```
Home/Chat:    #0057FF  (Zaeli blue — send button #FF4545 coral)
Calendar:     #E8374B  (Electric Red Coral)
Shopping:     #000000  (black)
Meals:        #FF8C00  (orange)
Todos:        #B8A400  (gold)
Tutor:        #1A1A2E  (dark navy)
```

---

## Screen Status

| File | Status | Notes |
|---|---|---|
| index.tsx | Complete | AI-first chat home, entry flow, mic, brief |
| calendar.tsx | NEXT — full rewrite | Design locked in HTML mockups (see below) |
| shopping.tsx | Complete | List, Pantry, Spend tabs |
| mealplanner.tsx | Complete | GPT brief, mic, logging |
| more.tsx | Complete | Hub + Settings |
| tutor.tsx | Complete | Hub, kids list |
| tutor-child.tsx | Complete | Child zone |
| tutor-session.tsx | Complete | Homework Help |

---

## Supabase Tables
```
events, todos, missions, shopping_items, pantry_items, receipts,
meal_plans, recipes, menus, family_members, api_logs, tutor_sessions
```

**events table — assignees column added 24 March 2026:**
```sql
ALTER TABLE events ADD COLUMN IF NOT EXISTS assignees jsonb DEFAULT '[]'::jsonb;
```
Mock events inserted for all 5 family members across the week (25 March 2026).

**reminders table — needed for Layer 2 reminder system (not yet created):**
```sql
create table reminders (
  id uuid default gen_random_uuid() primary key,
  family_id uuid not null,
  title text not null,
  date date,
  recurrence text default 'never',
  assignee_id text,
  created_at timestamptz default now()
);
```

---

## Calendar Screen — Design Fully Locked (Sessions 17-18)

### Definitive mockup files (gospel — build from these)
- `zaeli-calendar-v4.html` — day view, month view, chat renders, add event flow, conversational edit
- `zaeli-timegrid-v2.html` — time grid specifics, overlap handling, all-day banners, reminder chips

### Colour
**Electric Red Coral `#E8374B`** — warm, electric, not pink, not magenta.

### Time Grid Architecture
- **48px per hour** — true proportional height (not a list)
- 1 hour = 48px, 30 min = 24px, 15 min = 12px
- Hour rows: flex layout — label (38px fixed width) + body (flex:1)
- Events: absolutely positioned within grid container using `top` and `height` calculated from hours/minutes
- Grid start: `max(6am, currentTime - 2 hours)` — always shows recent past + present + future
- Now-line: Electric Red Coral, dot on left, always visible near top third
- Dedicated screen: full scrollable grid. Chat render: fixed height with bottom fade

### Overlap Rules (LOCKED)
- **1–2 overlapping:** side by side, full text (title + time + avatars)
- **3–4 overlapping:** quarter columns, colour tint + avatar ONLY, no text — tap for detail
- **3 simultaneous short events:** thirds, short label only
- **Conflict indicator:** red ! badge at the overlap point between clashing events
- Always tappable for full detail regardless of overlap level

### All-day / Multi-day Events
- Dedicated banner lane ABOVE the time grid
- Coloured pill spanning relevant days with avatar + title + date range
- Anna's 4-day trip = coral banner "Anna — Melbourne trip · Tue–Fri" — unavailability instantly obvious

### Three-Layer Reminder System
- **Layer 1 — Events:** timed blocks in the time grid
- **Layer 2 — Reminders:** day-attached chips in the all-day lane (dedicated screen) or inline in chat. NOT time blocks. Tagged to person, show their family colour
- **Layer 3 — Zaeli's knowledge:** invisible to UI, surfaces contextually in brief ("Thursday means Poppy's swimmers")

### Chat Render (LOCKED)
- **Pixel-identical to dedicated screen** — same component, full width, zero wrapper or border
- Fixed height with bottom fade (gradient) indicating scrollability
- NO nested scroll — chat scrolls as one unit, calendar block scrolls with it
- NO date strip in chat — navigation handled conversationally ("What's tomorrow", "Show me Wednesday")
- Grid starts at `max(6am, currentTime - 2 hours)` same as dedicated screen
- All-day banner and reminder chips appear above the grid, same as dedicated screen
- Bottom fade + "Open full calendar →" link

### Event tap in chat (conversational edit flow)
1. Tap event → injects as user message → Zaeli responds with summary + "What would you like to change?"
2. Quick replies: Time · Day · Who's coming · Title · Delete · Manual edit (last, faded)
3. Zaeli asks one question at a time, user answers in 1-2 taps
4. Updated event block appears inline after change
5. "Manual edit" only opens the edit sheet as last resort

### Event tap on dedicated screen
Tap → edit sheet slides up immediately (no conversational step)

### Month View
- Multi-colour family dots per day (max 3 dots)
- Family legend: Rich · Anna · Poppy · Gab · Duke
- Selected day preview uses same tinted bubble style as day view
- Day/Month toggle only (Week removed)

### Add Event Flow
1. Sheet opens with 3 options: Ask Zaeli · Scan photo (birthday invite/fixture) · Fill in manually
2. Manual form: title, date, start/end time, all-day toggle, location, Who (person pills), repeat, alert, notes
3. Form header: Cancel left · New Event centre · Save (yellow) right
4. Save button: Electric Red Coral

### V1 decisions (don't add until user testing)
- No nested scroll in chat grid
- No date strip in chat
- No real-time Supabase subscriptions (add post-launch)

---

## Admin Dashboard
- URL: https://incomparable-gumdrop-32e4ba.netlify.app
- Supabase anon key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...9ssTEwSxgY4B7nXxTEyKB3QDIoeCLh8yMo9jO-m5i-w`

---

## Dev Build
- Bundle ID: com.zaeli.app
- Device: iPhone 11 Pro Max (UDID: 00008030-0019116E1AC1802E)
- Run: `npx expo start --dev-client`
- After every file copy: Ctrl+C then `npx expo start --dev-client`

---

## Coding Rules
- SafeAreaView edges={['top']} always
- Floating bars: `position:absolute`, `paddingBottom: Platform.OS==='ios' ? 32 : 20`, transparent bg, white pill + shadow
- ScrollView paddingBottom ≥ 110 to clear floating bar
- No floating FAB anywhere
- Logo taps = `router.replace('/(tabs)/')`
- PowerShell: no && — separate commands
- KAV: behavior='padding'. NEVER use automaticallyAdjustKeyboardInsets alongside KAV
- SVG icons: always react-native-svg — never emoji for UI icons
- expo-file-system: import from `expo-file-system/legacy`

---

## Next Priorities (as of 25 March 2026)

1. **calendar.tsx full rewrite** — from scratch against zaeli-calendar-v4.html + zaeli-timegrid-v2.html
2. **reminders Supabase table** — create table, wire up to calendar
3. **New EAS build** — fix keyboard tint
4. **TestFlight build for Anna**
5. **Real-time Supabase subscriptions** (post-v1)
6. **Pre-launch cleanup** — remove AI toggle, replace DUMMY_FAMILY_ID with real auth
