# CLAUDE.md — Zaeli Project Context
*Last updated: 30 March 2026 — Session 24 complete*

---

## Who You Are Talking To
- **Richard** — beginner developer. Always give **full file rewrites**, easy copy-paste PowerShell commands, one step at a time
- Never give partial diffs or targeted edits unless it's a single truly isolated line
- Always explain what you're doing in plain English before diving into code
- Family: Rich (logged-in user), Anna, Poppy (Yr6, age 12, girl), Gab (Yr4, age 10, BOY — Gabriel, always he/him), Duke (Yr1, age 8, boy)
- Local path: `C:\Users\richa\zaeli` (Windows, PowerShell — no && chaining)
- Repo: https://github.com/RDK1981/zaeli (private)
- PowerShell rule: (tabs) folder needs backtick escaping: app\`(tabs`)\filename.tsx
- Full file rewrites only — never partial diffs
- Design before code — always discuss/mockup new screens before writing code
- **Two fixes at a time** — bulk changes create too many variables when something breaks

---

## The Business

Zaeli is an iOS-first AI family life platform for Australian families with children.

**Revenue model:**
- Family plan: A$14.99/month
- Tutor add-on: A$9.99/child/month
- 100% web sales (no App Store cut)

**Unit economics (confirmed 30 Mar 2026):**
- GPT-5.4 mini chat: ~A$0.003–0.004/msg average across all features
- home_brief: ~A$0.0004/call · home_calendar: ~A$0.0008/call · home_chat (Sonnet): ~A$0.01/call
- calendar_chat (Sonnet): ~A$0.009/call · whisper: ~A$0.0007/call
- Real MTD cost (March 2026): A$3.17 across 1,048 calls — well within margin
- Tutor hybrid (GPT mini chat + Sonnet vision): ~A$2.00/child/month at 500 turns
- Tutor margin at 500 turns/month: ~80% gross — healthy even at 1,000 turns (~60%)
- Only Home generates a brief on cold open — no brief on channel transitions (cost saving)
- **Model review deferred:** home_chat + calendar_chat use Sonnet — evaluate switching to GPT mini after full load testing

---

## Zaeli Persona (UPDATED Session 24)

Zaeli is sharp, warm, and genuinely enthusiastic about this family. She notices things others miss and finds the funny angle through delight, not detachment. She celebrates small wins, spots the chaos before it arrives, and feels right in it with the family — never observing from a distance.

Her energy matches the moment: get-up-and-go in the morning, calm and settled at night. A touch of sass — through timing and observation, never forced, never at the user's expense. Funny because she pays attention, not because she's trying to be clever.

**Hard rules:**
- NEVER "mate", "guys", "dry", or detached humour
- Never start with "I"
- No asterisks or markdown in spoken responses — plain text only
- NEVER sound like a push notification or task manager
- Always ends on a confident offer ("Say the word and I'll...") — never a bare open question
- **BE PROPORTIONATE** — a normal day should feel normal, not dramatic. Never manufacture stress.
- **Banned words:** "queued up", "locked in", "tidy", "sorted", "lined up", "on the cards", "all set", "stacked neatly", "ambush", "sprint", "chaos", "chaotic"

---

## Stack
- React Native + Expo (iOS-first), dev build on iPhone 11 Pro Max (bundle ID com.zaeli.app)
- Supabase (Postgres, Sydney ap-southeast-2, ID: rsvbzakyyrftezthlhtd)
- Claude Sonnet (`claude-sonnet-4-20250514`) — vision/scan + Tutor photo checking + home_chat tool-calling + calendar_chat tool-calling
- OpenAI GPT-5.4 mini (`gpt-5.4-mini`) — home_brief, home_calendar, Tutor conversation
- OpenAI Whisper-1 — voice transcription (all channels + Tutor Read Aloud)
- expo-router, expo-image-picker, react-native-svg
- Poppins font (UI), DMSerifDisplay (hero titles)
- No bottom tab bar — no channel nav UI — Zaeli is the only navigation

---

## Key Constants
```
DUMMY_FAMILY_ID = '00000000-0000-0000-0000-000000000001'
FAMILY_ID       = '00000000-0000-0000-0000-000000000001'
SONNET          = 'claude-sonnet-4-20250514'  ← CORRECT (NOT claude-sonnet-4-6)
GPT_MINI        = 'gpt-5.4-mini'             ← CORRECT (NOT gpt-4.1-mini — retired Feb 2026)
CRITICAL: OpenAI = max_completion_tokens. Claude = max_tokens. Never mix.
CRITICAL: KAV must have backgroundColor:'#fff' — prevents channel colour bleeding behind keyboard
CRITICAL: always await supabase inserts — silent failures are the #1 logging bug
CRITICAL: Send button is #FF4545 coral across ALL channels — never the channel AI colour
```

---

## API Logging
```
Table: api_logs
Columns: family_id, feature, model, input_tokens, output_tokens, cost_usd, created_at
CRITICAL: column is input_tokens / output_tokens — NOT prompt_tokens / completion_tokens
CRITICAL: total_tokens column does NOT exist — never insert it
CRITICAL: always await supabase inserts or logs silently fail
```

**Admin dashboard:** https://incomparable-gumdrop-32e4ba.netlify.app
- Fixed Session 24: UTC bug in `thisMonthStart()` — now uses local date construction
- Fixed Session 24: Supabase 1000-row cap — now paginates to fetch all logs
- To deploy: drag `index.html` from Downloads to Netlify

---

## Navigation Model (LOCKED)

**There is no channel navigation UI anywhere in the app.**
- Zaeli is the only navigation mechanism
- **Avatar (top right)** opens: Our Family, Tutor (premium badge), Settings, Sign out
- Always `router.navigate()` — never `router.push()` or `router.replace()`

---

## Channel Architecture (LOCKED)

```
app/(tabs)/index.tsx       → Home channel ✅ COMPLETE
app/(tabs)/calendar.tsx    → Calendar channel ✅ COMPLETE
app/(tabs)/shopping.tsx    → Shopping channel (needs colour refactor)
app/(tabs)/mealplanner.tsx → Meals channel (needs colour refactor)
app/(tabs)/kids.tsx        → Kids Hub channel (design ✅ — not yet built)
app/(tabs)/todos.tsx       → To-dos channel (design ✅ — not yet built)
app/(tabs)/notes.tsx       → Notes channel (design ✅ — not yet built)
app/(tabs)/travel.tsx      → Travel channel (not built, no design yet)
app/(tabs)/family.tsx      → Our Family channel (design ✅ — not yet built)
app/(tabs)/tutor.tsx       → Tutor (standalone premium module — NOT a channel)
```

---

## Pill System (LOCKED)

**Portal pills:** Filled bg = destination channel bg. Arrow = accent colour. Max 3.
**Quick reply chips:** White bg, ink border `rgba(0,0,0,0.15)`. Conversation only. Never navigation labels.
**Brief pills:** Coloured by topic — see Brief Pill Colours below.

---

## Per-Channel Colour System (LOCKED)

| Channel | Banner bg | AI colour | Accent (dark) |
|---------|-----------|-----------|---------------|
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

AI colour = eyebrow = send pill bg = portal pill bg. Send arrow always ink `#0A0A0A`.
**CRITICAL:** Chat bar send button = `#FF4545` coral always — never channel AI colour.

**Channel colour bleed rule (LOCKED):**
Channel bg colour lives ONLY in the status bar and banner. All list/chat body areas use warm white `#FAF8F5`. Channel colour used as tint for specific highlight moments only. Never full bleed on scrollable content.

---

## Family Member Colours (LOCKED)
```
Rich:  #4D8BFF  ← logged-in user
Anna:  #FF7B6B
Poppy: #A855F7
Gab:   #22C55E
Duke:  #F59E0B
```

---

## Splash Screen (LOCKED)
- Bg: `#A8E8CC` Aqua Green, 3s hold
- Wordmark: DM Serif 96px, ink + `#FAC8A8` peach on 'a' and 'i', bounces in
- Greeting: "Good morning/afternoon/evening, Rich 👋" Poppins 400 18px
- Tagline: "LESS CHAOS. MORE FAMILY." Poppins 500 12px uppercase
- Peach loading dots, radial glow orbs

---

## Banner Spec (LOCKED)
- Wordmark: DM Serif 34px, letter-spacing -1.5px, ink body, ai letters in channel colour
- Channel name: Poppins 600, 13px, `rgba(0,0,0,0.5)`, right of wordmark
- Avatar: 32×32px, Rich's `#4D8BFF`
- Bg: always channel bg colour, does NOT go white on scroll
- Divider: 1px `rgba(0,0,0,0.08)`

---

## Chat Interface Spec (LOCKED)
- Zaeli messages: **NO bubble** — open text, full width, Poppins 15px/400, line-height 1.6
- User bubble: right-aligned, `#EDE8FF` bg, `border-radius: 16px 2px 16px 16px`
- Message actions on Zaeli: Play + Copy + Forward + ThumbUp + ThumbDown (26px, opacity 0.35)
- Quick reply chips below Zaeli messages — conversation continuations, never navigation labels
- **No left border stripes on cards** — priority communicated via dot, pin icon, or badge only

---

## CANONICAL CHAT BAR SPEC
```
inputArea: position:absolute, bottom:0, transparent bg
  paddingH:14, paddingBottom: iOS?30:18, paddingTop:10

barPill: borderRadius:30, paddingV:14, paddingH:16, borderWidth:1, shadow
  ├── barBtn 34×34 → IcoPlus 20×20 SVG stroke rgba(0,0,0,0.4)
  ├── barSep 1×18px rgba(10,10,10,0.1)
  ├── TextInput fontSize:15 Poppins_400Regular
  ├── barBtn 34×34 → IcoMic 20×20 SVG (blush colour #F5C8C8)
  └── barSend 32×32 borderRadius:16 bg=#FF4545 arrow=white
```

KAV structure:
```
KAV behavior=padding offset=0 backgroundColor='#fff'
  └── contentWrap flex:1 position:relative
        ├── ScrollView
        └── inputArea position:absolute bottom:0
```

**Our Family has NO chat bar** — the only channel without one.

---

## Mic Recording Overlay (LOCKED — Session 23)

Both Home and Calendar now have a floating mic overlay when recording. Apply to all future channels.

```
Trigger: user taps mic button in chat bar → isRecording = true
Overlay: position:absolute, top:0, left:0, right:0, bottom:0
  backgroundColor: channel banner bg at 0.88 opacity (frosted tint)
  Animated.Value fade in (220ms) / fade out (180ms)
  zIndex: 100

White card (centred):
  borderRadius:28, paddingV:32, paddingH:36
  MicWaveform (13 bars, channel AI colour, staggered animation)
  Timer: Poppins_600SemiBold 30px, letterSpacing:1 — "0:00" counting up
  Label: "Listening…" Poppins_400Regular 13px, ink 40%
  Stop button: 60px circle, #FF4545, white 20px square icon, coral shadow
  Cancel: Poppins_400Regular 13px, ink 35% — discards recording (cancel=true)

State: micTimer (int, seconds), micTimerRef (setInterval), micOverlayAnim (Animated.Value)
stopRecording(cancel = false) — cancel=true discards, cancel=false sends to Whisper
```

---

## Home Inline Calendar Render (LOCKED — Sessions 23 + 24)

When user asks a calendar question in Home chat, Zaeli renders EventCards inline.

### Flow
1. `isActionQuery(text)` checked FIRST — action messages always bypass to Anthropic tool-calling
2. `isFullCalendarRequest(text)` checked SECOND — "show full calendar", "all events" etc → renders today/tomorrow events + Open Calendar portal pill
3. `isCalendarQuery(text)` — fetches Supabase events → GPT renders inline cards (max 5)
4. Midnight/all-day events filtered OUT — these are reminder pills in Calendar, not timed events
5. GPT returns `{intro, events, followUp, replies}` — max 5 events
6. EventCards render inline: intro text → cards → Open Calendar pill → followUp → chips

### Open Calendar portal pill (LOCKED — Session 24)
- Appears on ALL inline calendar renders (showPortalPill: true always)
- Mint green `#B8EDD0` bg, full width, "Open Calendar →"
- Sits between event cards and followUp text
- Taps → `router.navigate('/(tabs)/calendar')`

### Msg interface — inlineData (REFACTORED Session 24)
The old `calIntro / calEvents / calFollowUp / showCalendarPill` fields are GONE.
All inline renders now use the generic `inlineData` field:
```typescript
inlineData?: {
  type: 'calendar' | 'todos' | 'shopping' | 'meals' | 'kids';
  intro?: string;
  followUp?: string;
  items?: any[];
  showPortalPill?: boolean;
}
```
`hasCalendarEvents` = `inlineData?.type === 'calendar' && (items.length > 0 || showPortalPill === true)`

### GPT calendar response format
```json
{
  "intro": "1 sentence Zaeli lead-in — find the angle, not just a list",
  "events": [...max 5 event objects from Supabase...],
  "followUp": "1 sentence confident offer — Say the word and I'll...",
  "replies": ["chip 1", "chip 2", "chip 3"]
}
```

### Chip philosophy (LOCKED)
Chips = conversation continuations, never navigation labels. Sound like things a person would say.
- "How tight is the afternoon?" not "Check afternoon"
- "Anything clashing?" not "View clashes"
- After 9pm: one warm sentence about tomorrow only. followUp = "".

### Brief pill colours (LOCKED + EXPANDED Session 24)
Brief reply chips in the hero section are colour-matched to their topic via `getPillColor()`:
- Calendar/schedule/tomorrow/prep/morning/week → `#B8EDD0` mint
- Shopping/grocery/receipt/spend/stock → `#F0E880` yellow
- Meals/food/dinner → `#FAC8A8` peach
- Todos/tasks/what needs doing → `#F0DC80` gold
- Kids/family/homework/jobs → `#A8E8CC` aqua
- Default → `#A8D8F0` sky blue
**Note:** Brief chips render ONLY in hero banner — NOT duplicated in chat thread below.

### Greeting + scroll on load (FIXED Session 24)
- `briefGreeting` style: Poppins_500Medium, fontSize:17, opacity 0.62
- After brief loads, scroll to y:0 so greeting is visible — not scrolled to bottom

### Refresh on focus (LOCKED)
`refreshCalendarEvents()` fires on every `useFocusEffect` return to Home.
Reads/writes `inlineData.items` (not calEvents). Handles deleted events.

### Avatar layout in EventCard
- 1: 28px single · 2: 26px column · 3: 22px column
- 4+: 2×2 grid — first 3 avatars (20px) + grey "+N" overflow chip (20px)

---

## Home Brief Prompt (UPDATED Session 24)

Two-sentence hero + two-sentence detail. Full persona baked in.

**Hero (2 sentences):**
- Sentence 1: Find the ANGLE or IRONY — not a list. The observation that makes Rich see the day differently.
- Sentence 2: One warm personal detail — a name, a time, a specific thing.
- Max 30 words total. Wrap 2-3 key words in [square brackets] for italic emphasis.
- Must make Rich smile or feel genuinely seen.

**Detail (2 sentences):**
- Sentence 1: Colour or Zaeli moment — light humour or insight, never a repeat of hero.
- Sentence 2: Confident specific offer — "Say the word and I'll..." never "Want me to...?"

**Proactive awareness:** Scans next 7 days, surfaces ONE upcoming thing needing prep — tight turnarounds, unusual events, things 2-3 days away. Never lists them all.

**Chips:** Sound like things Rich would say out loud, not navigation labels.

**Late night (after 9pm):** Calm, settled. One warm observation about tomorrow. Nothing about tonight.

---

## Tool-Calling System (Home + Calendar)

### Home (index.tsx) — Anthropic Claude tool-calling
**Tools:** `add_calendar_event`, `update_calendar_event` (with `new_assignees`), `delete_calendar_event`, `add_todo`, `add_shopping_item`

**CRITICAL routing rule:**
- `isActionQuery()` runs BEFORE `isCalendarQuery()`
- Action keywords: `add`, `remove`, `delete`, `change`, `move`, `update`, `edit`, `reschedule`, `cancel`, `rename`, `assign`, `invite` etc.
- Action messages ALWAYS go to Anthropic tool-calling path — NEVER to calendar GPT path

### Calendar (calendar.tsx) — Anthropic Claude tool-calling
**Tools:** `add_calendar_event`, `update_calendar_event` (with `new_assignees`), `delete_calendar_event`
- Assignees fallback: retries without assignees column if Supabase rejects (error code 42703)
- TOOL_FAILED signal: honest error reporting, never fake success

### Conversation history fix (LOCKED)
Calendar messages now reconstruct readable context for Claude:
`"[Events shown: "Gym session" on 2026-03-31 at 07:00 (assignees: ["2"])]"`

---

## Supabase Tables
```
events          → date, start_time (ISO local), end_time, assignees (jsonb), all_day (bool)
todos           → family_id, title, assigned_to, shared_with (jsonb), due_date, priority,
                  status, recurrence, recurrence_day, calendar_event_id, created_by
shopping_items  → family_id, name, category, quantity, checked
pantry_items    → family_id, name, category, stock_level
receipts        → family_id, store, purchase_date, total_amount, items (jsonb)
meal_plans      → family_id, date, meal_name, recipe_id
recipes         → family_id, name, ingredients, instructions
family_members  → family_id, name, colour, role, dob, year_level, email, has_own_login (bool)
api_logs        → family_id, feature, model, input_tokens, output_tokens, cost_usd, created_at
tutor_sessions  → family_id, child_id, subject, pillar, messages (jsonb), difficulty_band,
                  duration_seconds, hints_used (jsonb), title, created_at
kids_jobs       → family_id, child_id, title, emoji, cadence, reward_points, created_by,
                  approved (bool), paused (bool), created_at
kids_rewards    → family_id, child_id, name, emoji, points_cost, redeemed_at, approved_by, created_at
kids_points     → family_id, child_id, balance, lifetime_earned, updated_at
notes           → family_id, created_by, title, body, emoji, colour_tint, pinned (bool),
                  shared_with (jsonb), shared_editable (bool), is_voice (bool), created_at, updated_at
```

---

## Tutor Module (DESIGNED ✅ — not yet built)
Full spec in ZAELI-PRODUCT.md. Key build notes:
- GPT-5.4-mini: conversation · Sonnet: photos · Whisper: voice
- Zaeli messages: open text, NO bubble
- Persistent 25/75 split pill: `[💡 Hint (1/3)] [Next question →]`
- Parent review: summary in Tutor, full transcript auth-gated, progress → Our Family only
- Curriculum: AC v9.0 ACARA · Foundation ≠ Year 1

---

## Kids Hub Channel (DESIGNED ✅ — not yet built)
Family plan. Colour: `#A8E8CC` / `#FAC8A8` peach / `#0A6040`.
- Age tiers: Little (Fn–Yr3) / Middle (Yr4–7) / Older (Yr8–12)
- Jobs: Daily/Weekly/One-off · GIPHY on every tick · Archive · Pause toggle
- Points: Philosophy B (currency) — spent on redemption, parent approves
- Rewards: parent sets name + cost · green/amber/grey states
- Games: Wordle · Word Scramble · Maths Sprint · Aussie Trivia · Mini Crossword (no points)
- Leaderboard: parent-toggleable, monthly reset

---

## Our Family Channel (DESIGNED ✅ — not yet built)
Colour: `#F0C8C0` / `#D8CCFF` lavender / `#A01830`. Avatar menu. **NO chat bar.**
- Opening brief: DM Serif hero + Poppins detail · active vs quiet day variants
- 4 sections: Pending Actions · Our Kids · Family Profiles · (Settings separate)
- Child detail: Tutor progress bars + Kids Hub summary
- Profiles: DOB, age/year auto-calculated, colour swatches, login status
- Avatar badge: red dot with count when actions pending

---

## Todos Channel (DESIGNED ✅ — not yet built)
Colour: `#F0DC80` / `#D8CCFF` lavender / `#806000`.

**Core features (all locked):**
- Smart due dates — Zaeli infers from conversation context ("before Easter" → checks calendar)
- Priority surfacing — one most urgent todo in Home morning brief
- Recurring todos — Daily/Weekly/Monthly/Custom · auto-reappear, no re-adding
- Shared tasks — proper handoff with "from Rich · new" tag on Anna's side
- Todo → Calendar integration — Zaeli finds a gap, blocks time, links todo to event

**Two views:** Mine tab (personal) · Family tab (shared + others' todos)
**Zaeli brief strip** at top — most urgent item only, warm white bg tint.
**Priority dots:** Red (overdue/urgent) · Amber (today/soon) · Grey (someday). No left border stripes.
**Badges:** ↻ Recurring · Shared · 📅 Calendar-linked.
**Inline render in Home:** Todo cards render in chat thread (same inlineData pattern). Tappable to tick from Home.
**Mockup:** `zaeli-todos-mockup-v1.html` — 8 screens.

---

## Notes Channel (DESIGNED ✅ — not yet built)
Colour: `#C8E8A8` / `#F0C8C0` blush / `#2A6010`. Simple and beautiful — not AI-connected.

**Features (locked):**
- Instant capture — tap +, cursor immediately in title field, auto-saves
- DM Serif titles, generous line-height, beautiful typography
- Pinned notes (📌 pin icon top-right, always first in list) — no left border stripes
- Subtle colour tints (6 options: white/yellow/blue/green/pink/purple) on note body only
- Emoji tag per note (suggested from keyword matching)
- Minimal formatting: Bold · Italic · Bullets · Numbered · Pin · Share
- Voice notes: Whisper transcribes, Zaeli tidies filler words, offers to save as todo
- Share with family member: view-only by default, optional edit toggle
- Zaeli suggestion card on note detail: "Want me to add X to your todos?"

**Deliberately excluded:** Folders, nested notes, rich formatting, attachments, collaborative editing.
**Mockup:** `zaeli-notes-mockup-v1.html` — 5 screens.

---

## Coding Rules
- SafeAreaView edges={['top']} always
- No floating FAB
- Logo taps = router.navigate('/(tabs)/')
- PowerShell: no && — separate lines
- Always npx expo start --dev-client after changes (use --clear when fixing bundle issues)
- Image picker: `['images'] as any`
- Date: local construction only — NEVER toISOString() (UTC/AEST shift)
- KAV backgroundColor: `#fff`
- Send button: `#FF4545` always
- Our Family: no chat bar, no KAV needed
- Channel colour: banner/status bar only — body always `#FAF8F5` warm white
- No left border stripes on any cards — use dots, icons, badges instead
- Apostrophes in JSX strings: use double-quoted strings e.g. `"What's on today"` not `'What's on today'`

---

## Screen / Channel Status

| File | Status | Notes |
|---|---|---|
| index.tsx | ✅ Complete | Session 24: inlineData refactor, pill colours, full calendar routing, persona/prompt rewrite, proactive awareness, greeting fix |
| calendar.tsx | ✅ Complete | Mic overlay + new_assignees fix |
| shopping.tsx | Needs colour refactor | `#F0E880` / `#D8CCFF` lavender |
| mealplanner.tsx | Needs colour refactor | |
| more.tsx | Deprecating | Settings → avatar menu |
| tutor/* | ✅ Design complete | Needs full rebuild to 11-screen spec |
| kids.tsx | ✅ Design complete | Not yet built |
| family.tsx | ✅ Design complete | Not yet built |
| todos.tsx | ✅ Design complete | Not yet built |
| notes.tsx | ✅ Design complete | Not yet built |
| travel.tsx | Not built | No design yet |
| zaeli-chat.tsx | DEPRECATED | |

---

## Admin Dashboard Fixes (Session 24)
- `thisMonthStart()` — fixed UTC bug, now uses local date string `YYYY-MM-01T00:00:00`
- Supabase 1000-row cap — now paginates with `.range()` to fetch all logs correctly
- Both fixes deployed to Netlify

---

## Next Priorities (Session 25)

**Immediate:**
1. Shopping colour refactor (`shopping.tsx`) — `#F0E880` bg / `#D8CCFF` lavender AI colour
2. Meals colour refactor (`mealplanner.tsx`)

**Then new channels (design → build in order):**
3. Todos channel (`todos.tsx`) — discuss + mockup review first
4. Kids Hub (`kids.tsx`)
5. Our Family (`family.tsx`)
6. Notes (`notes.tsx`)
7. Tutor rebuild to 11-screen spec
8. Travel (design session first)

**Deferred / pre-launch:**
- Home inline todos render (same inlineData pattern as calendar)
- Model cost review: evaluate home_chat + calendar_chat switching from Sonnet to GPT mini after load testing
- Remove AI toggle + DEV button
- Real Supabase auth + child login model
- EAS build, TestFlight for Anna
- Website + Stripe + onboarding
- Settings module (design + build)
