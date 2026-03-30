# Zaeli — New Chat Handover
*30 March 2026 — Session 23 complete. Copy this entire file to start a new chat.*

---

## Hi! Continuing development of Zaeli.

Zaeli is an iOS-first AI family life platform built in React Native / Expo. Please read **CLAUDE.md** before we start — full stack, architecture, colours, coding rules, all locked decisions. Then **ZAELI-PRODUCT.md** for product vision and all module specs.

---

## How I like to work
- **Beginner developer** — always full file rewrites, never partial diffs
- **Two fixes at a time** — bulk changes = too many variables
- One PowerShell command at a time, never chained with &&
- Plain English before code
- **Design before code** — mockup first for any new channel
- Always ask me to upload the current working file before editing — never build from memory

---

## Who I am
- Richard. **Logged-in user = Rich**
- Family: Rich, Anna, Poppy (Yr6, 12, girl), Gab (Yr4, 10, BOY — Gabriel, he/him), Duke (Yr1, 8, boy)
- Local path: `C:\Users\richa\zaeli` (Windows, PowerShell)
- PowerShell escape: `app\`(tabs`)\filename.tsx`
- Repo: https://github.com/RDK1981/zaeli (private)
- Admin: https://incomparable-gumdrop-32e4ba.netlify.app

---

## Key constants (CRITICAL — never get these wrong)
```
DUMMY_FAMILY_ID = '00000000-0000-0000-0000-000000000001'
SONNET          = 'claude-sonnet-4-20250514'  ← NOT claude-sonnet-4-6
GPT_MINI        = 'gpt-5.4-mini'             ← NOT gpt-4.1-mini (retired)
WHISPER_URL     = 'https://api.openai.com/v1/audio/transcriptions'
OpenAI = max_completion_tokens · Claude = max_tokens
api_logs = input_tokens / output_tokens (NO total_tokens column)
KAV must have backgroundColor:'#fff'
always await supabase inserts
Send button = #FF4545 coral ALWAYS (never channel AI colour)
Our Family = NO chat bar
Channel body bg = #FAF8F5 warm white — never full channel colour bleed
No left-border accent strips on cards
isActionQuery() runs BEFORE isCalendarQuery() — action msgs go to Anthropic tool-calling
```

---

## What's built (30 Mar 2026)

### index.tsx — Home ✅ COMPLETE (Sessions 20 + 23)
- Splash → Home. DM Serif brief + Poppins follow-up
- **Brief pill colours** — matched to topic category (calendar→mint, shopping→yellow, meals→peach, todos→gold, kids→aqua)
- Tool-calling (events/todos/shopping) via Anthropic Claude
- **Inline calendar render** — EventCards in chat thread when Zaeli answers calendar questions
- **isActionQuery()** — action messages always bypass calendar GPT path to tool-calling
- **new_assignees** support — add Anna/Duke etc. to events from Home chat
- Name→ID mapping: `anna→1, rich→2, poppy→3, gab→4, duke→5`
- Calendar conversation history fix — calEvents messages reconstructed for Claude context
- **TOOL_FAILED signal** — honest error reporting, no fake successes
- **refreshCalendarEvents()** — silently patches calEvents on focus return (zero API cost)
- **Mic recording overlay** — frosted cream overlay, MicWaveform component, Poppins timer, stop/cancel
- Whisper voice. API logging working

### calendar.tsx — Calendar ✅ COMPLETE (Sessions 22 + 23)
- Two-row mint banner. Day strip. Event cards. Month view. Tool-calling. Whisper
- **new_assignees** in update_calendar_event schema + executor
- **Assignees fallback** — retries without assignees column if Supabase rejects
- **TOOL_FAILED catch block** — honest error reporting
- **Mic recording overlay** — mint-tinted, blush waveform bars
- API logging confirmed

### Admin dashboard ✅
https://incomparable-gumdrop-32e4ba.netlify.app

### shopping.tsx, mealplanner.tsx
Functional — need colour refactor.

### All designed, not yet built
- Tutor: `zaeli-tutor-final-mockup-v4.html` (11 screens) + curriculum map
- Kids Hub: `zaeli-kids-hub-mockup-v1.html` + parent management + rewards v2
- Our Family: `zaeli-our-family-mockup-v1.html` (6 screens)
- Todos: `zaeli-todos-mockup-v1.html` (8 screens)
- Notes: `zaeli-notes-mockup-v1.html` (5 screens)

### Travel — no design yet

---

## Critical architecture decisions locked in Session 23

### Home calendar flow
1. `isActionQuery(text)` checked FIRST — if true, goes to Anthropic tool-calling (never GPT)
2. `isCalendarQuery(text)` — if true, fetches Supabase events → GPT renders inline cards
3. Midnight/all-day events filtered OUT of inline render (they're reminder pills in Calendar)
4. GPT calendar call: max 2000 tokens (reasoning model needs headroom)
5. NO portal chip — Calendar offered conversationally in followUp text only
6. Chips = conversation continuations only, context-appropriate

### Mic overlay — apply to all future channels
See CLAUDE.md for full spec. Key: `stopRecording(cancel=false)` → Whisper, `stopRecording(true)` → discard.

### Msg interface — refactor before next inline type
Current: `calIntro`, `calEvents`, `calFollowUp`, `showCalendarPill` (deprecated)
Planned: generic `inlineData: { type, intro, followUp, items, showPortalPill }` — do this BEFORE building todos or shopping inline renders.

### EventCard avatar layout
- 1-3 people: single column (28/26/22px)
- 4+ people: 2×2 grid — first 3 avatars (20px) + grey "+N" overflow chip

---

## Supabase schema notes
```sql
-- all_day column (added Session 22):
alter table events add column all_day boolean default false;

-- notes stores both notes and location in events:
-- format: "notes text | location text" — split on ' | '

-- Needed (not yet created):
alter table family_members add column dob date;
alter table family_members add column year_level integer;
alter table family_members add column has_own_login boolean default false;
-- New tables: todos (full), notes, kids_jobs, kids_rewards, kids_points
-- See CLAUDE.md for full column specs
```

---

## Immediate next steps (Session 24)

**1. Refactor Msg → inlineData (do this first)**
Before building any new inline render type, refactor the `Msg` interface in index.tsx:
```typescript
inlineData?: {
  type: 'calendar' | 'shopping' | 'todos' | 'meals' | 'kids';
  intro?: string;
  followUp?: string;
  items?: any[];
  showPortalPill?: boolean;
}
```
This keeps the interface clean as more inline render types are added.

**2. Proactive awareness in Home brief**
Add instruction to `generateBrief()` prompt to scan next 7 days and flag:
- Things 2-3 days away that might need prep (dinner plans, early starts, packed bags)
- Conflicts worth mentioning
- First-occurrence or unusual events (school photos, excursions)
This is a prompt change only — no architecture change.

**3. Home inline todos render**
Same pattern as calendar. Todo cards appear in Home chat thread. Tappable to tick from Home.

**4. Shopping colour refactor** — `#F0E880` bg / `#D8CCFF` lavender AI colour

**5. Meals colour refactor**

**Then new channels in order:**
6. Kids Hub (kids.tsx)
7. Our Family (family.tsx)
8. Todos (todos.tsx)
9. Notes (notes.tsx)
10. Tutor rebuild

---

## Home chat philosophy (for context)
Home is a conversation, not a calendar viewer. Zaeli always: text → cards → follow-up → chips.
Chips = conversation continuations. No navigation chips. Calendar channel offered conversationally only.

---

## Critical coding rules
- `router.navigate()` only — NEVER push() or replace()
- Date: local construction only — NEVER toISOString() (UTC/AEST shift)
- Events table: `start_time` NOT `time`
- SafeAreaView: `edges={['top']}` always
- Image picker: `['images'] as any`
- KAV → `backgroundColor:'#fff'` → contentWrap (relative) → ScrollView + inputArea (absolute)
- Full file rewrites only
- Always await supabase inserts
- Send = `#FF4545` always
- Body bg = `#FAF8F5` warm white
- No left-border accent strips on cards

---

## Tech reminders
- `npx expo start --dev-client` after every change
- Import paths from `app/(tabs)/`: `../../lib/supabase`
- Supabase: `rsvbzakyyrftezthlhtd` (Sydney, ap-southeast-2)
- Admin: drag `C:\Users\richa\Downloads\index.html` to Netlify

---

**Read CLAUDE.md and ZAELI-PRODUCT.md first. Upload the file before editing.**
