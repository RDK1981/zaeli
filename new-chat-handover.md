# Zaeli — New Chat Handover
*30 March 2026 — Session 24 complete. Copy this entire file to start a new chat.*

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
Apostrophes in JSX: always use double-quoted strings e.g. "What's on today"
```

---

## What's built (30 Mar 2026)

### index.tsx — Home ✅ COMPLETE (Sessions 20–24)
- Splash → Home. DM Serif brief + Poppins follow-up
- **Msg → inlineData refactor (Session 24)** — old `calIntro/calEvents/calFollowUp/showCalendarPill` fields replaced with generic `inlineData: { type, intro, items, followUp, showPortalPill }`
- **Brief pill colours** — matched to topic via `getPillColor()`, expanded patterns (tomorrow/prep/morning/week all → mint). Brief chips render in hero banner ONLY — not duplicated in chat thread.
- **Brief prompt rewrite (Session 24)** — 2-sentence hero (angle/irony + warm detail), 2-sentence detail, confident offers ("Say the word and I'll..."), banned words list, proactive awareness (scans 7 days), time-of-day awareness
- **Persona update (Session 24)** — warm + enthusiastic, not dry. Finds funny angle through delight not detachment. Proportionate — never manufactures drama.
- **Full calendar routing** — "show full calendar" → renders today/tomorrow events + mint "Open Calendar →" portal pill. All inline calendar renders show portal pill.
- **Inline calendar render** — EventCards in chat thread (max 5), inlineData pattern
- **Greeting fix (Session 24)** — fontSize:17, Poppins_500Medium, scrolls to top on brief load
- **isActionQuery()** — action messages always bypass calendar GPT path to tool-calling
- **new_assignees** support — add Anna/Duke etc. to events from Home chat
- **TOOL_FAILED signal** — honest error reporting, no fake successes
- **refreshCalendarEvents()** — silently patches inlineData.items on focus return (zero API cost)
- **Mic recording overlay** — frosted cream overlay, MicWaveform, Poppins timer, stop/cancel
- Whisper voice. API logging working.

### calendar.tsx — Calendar ✅ COMPLETE (Sessions 22 + 23)
- Two-row mint banner. Day strip. Event cards. Month view. Tool-calling. Whisper
- **new_assignees** in update_calendar_event schema + executor
- **Assignees fallback** — retries without assignees column if Supabase rejects
- **TOOL_FAILED catch block** — honest error reporting
- **Mic recording overlay** — mint-tinted, blush waveform bars
- API logging confirmed

### Admin dashboard ✅ (Session 24 fixes)
https://incomparable-gumdrop-32e4ba.netlify.app
- Fixed: `thisMonthStart()` UTC bug → now local date construction
- Fixed: Supabase 1000-row cap → now paginates to fetch all logs
- Real MTD cost confirmed: A$3.17 / 1,048 calls for March 2026

### shopping.tsx, mealplanner.tsx
Functional — need colour refactor (`#F0E880` / `#D8CCFF` lavender for shopping).

### All designed, not yet built
- Tutor: `zaeli-tutor-final-mockup-v4.html` (11 screens) + curriculum map
- Kids Hub: `zaeli-kids-hub-mockup-v1.html` + parent management + rewards v2
- Our Family: `zaeli-our-family-mockup-v1.html` (6 screens)
- Todos: `zaeli-todos-mockup-v1.html` (8 screens)
- Notes: `zaeli-notes-mockup-v1.html` (5 screens)

### Travel — no design yet

---

## Session 24 — Key decisions locked

### inlineData architecture (LOCKED)
Old `calIntro/calEvents/calFollowUp/showCalendarPill` fields are GONE from Msg interface.
All inline renders use:
```typescript
inlineData?: {
  type: 'calendar' | 'todos' | 'shopping' | 'meals' | 'kids';
  intro?: string;
  followUp?: string;
  items?: any[];
  showPortalPill?: boolean;
}
```
`hasCalendarEvents` = true when `type === 'calendar'` AND (`items.length > 0` OR `showPortalPill === true`)

### Open Calendar portal pill (LOCKED)
- `showPortalPill: true` on ALL calendar inline renders
- Mint `#B8EDD0`, full width, between cards and followUp text
- Taps → `router.navigate('/(tabs)/calendar')`

### Full calendar requests (LOCKED)
`isFullCalendarRequest()` detects "show full calendar", "all events", "open calendar" etc.
Response: renders today's events (or tomorrow's if today empty), max 5, + Open Calendar pill.

### Brief chips — no duplication (LOCKED)
Brief chips render ONLY in hero banner (`briefReplies`).
Chat thread chips (`!msg.isBrief && msg.quickReplies`) are for conversational responses only.

### Zaeli persona (LOCKED)
Warm + enthusiastic. Finds funny angle through delight not detachment. Proportionate.
Banned: "queued up", "sorted", "tidy", "chaos", "ambush", "sprint", "stacked neatly".
Confident offers: "Say the word and I'll..." never "Want me to...?"
After 9pm: calm, one warm sentence about tomorrow only.

### Admin dashboard (LOCKED)
`thisMonthStart()` uses local date: `` `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-01T00:00:00` ``
Fetch paginates with `.range()` to bypass Supabase 1000-row cap.

---

## Immediate next steps (Session 25)

1. **Shopping colour refactor** — `shopping.tsx` onto `#F0E880` bg / `#D8CCFF` lavender AI colour
2. **Meals colour refactor** — `mealplanner.tsx`
3. **Todos channel** (`todos.tsx`) — design discussion + mockup review first, then build
4. **Kids Hub** (`kids.tsx`) — after todos
5. **Our Family** (`family.tsx`) — after kids hub
6. **Notes** (`notes.tsx`)
7. **Tutor rebuild** — 11-screen spec
8. **Travel** — design session first

**Deferred:**
- Home inline todos render (same inlineData pattern)
- Model cost review: home_chat + calendar_chat on Sonnet — evaluate GPT mini after load testing
- Real auth, EAS build, TestFlight, website, Stripe

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
- Apostrophes in JSX strings: double-quoted e.g. `"What's on today"` not `'What's on today'`

---

## Tech reminders
- `npx expo start --dev-client` after every change
- Use `--clear` when fixing bundle/cache issues
- Import paths from `app/(tabs)/`: `../../lib/supabase`
- Supabase: `rsvbzakyyrftezthlhtd` (Sydney, ap-southeast-2)
- Admin: drag `C:\Users\richa\Downloads\index.html` to Netlify

---

**Read CLAUDE.md and ZAELI-PRODUCT.md first. Upload the file before editing.**
