# CLAUDE.md — Zaeli Project Context
*Last updated: 30 March 2026 — Session 23 complete (Home inline calendar, mic overlay, tool-calling fixes)*

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
- GPT-5.4 mini chat: ~A$0.003/msg
- Tutor hybrid (GPT mini chat + Sonnet vision): ~A$2.00/child/month at 500 turns
- Tutor margin at 500 turns/month: ~80% gross — healthy even at 1,000 turns (~60%)
- Only Home generates a brief on cold open — no brief on channel transitions (cost saving)

---

## Zaeli Persona

Core: Anne Hathaway energy — smart, warm, magnetic.
- Australian warmth. NEVER "mate" or "guys"
- Never start with "I"
- No asterisks or markdown bold in spoken responses — plain text only
- NEVER sound like a push notification or task manager
- Never ends on a bare open question — always offers something specific first

---

## Stack
- React Native + Expo (iOS-first), dev build on iPhone 11 Pro Max (bundle ID com.zaeli.app)
- Supabase (Postgres, Sydney ap-southeast-2, ID: rsvbzakyyrftezthlhtd)
- Claude Sonnet (`claude-sonnet-4-20250514`) — vision/scan + Tutor photo checking
- OpenAI GPT-5.4 mini (`gpt-5.4-mini`) — all chat/briefs/Tutor conversation
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

## API Logging (FIXED 26 Mar 2026)
```
Table: api_logs
Columns: family_id, feature, model, input_tokens, output_tokens, cost_usd, created_at
CRITICAL: column is input_tokens / output_tokens — NOT prompt_tokens / completion_tokens
CRITICAL: total_tokens column does NOT exist — never insert it
```

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
**Quick reply chips:** White bg, ink border `rgba(0,0,0,0.15)`. Conversation only.

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
Channel bg colour lives ONLY in the status bar and banner. All list/chat body areas use warm white `#FAF8F5`. Channel colour used as tint for specific highlight moments only (brief strips, recording state, Zaeli suggestion cards). Never full bleed on scrollable content.

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
- Quick reply chips below every Zaeli message that invites response
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

## Home Inline Calendar Render (LOCKED — Session 23)

When user asks a calendar question in Home chat, Zaeli renders EventCards inline.

### Flow
1. `isCalendarQuery(text)` detects calendar questions (keyword list)
2. `isActionQuery(text)` checked FIRST — action messages always bypass to Anthropic tool-calling
3. `fetchEventsForContext(days)` fetches from Supabase (14 days default, 60-120 for month queries)
4. Midnight/all-day events filtered OUT — these are reminder pills in Calendar, not timed events
5. GPT returns `{intro, events, followUp, replies}` — no portal pill, no showCalendarPill
6. EventCards render inline: intro text → cards → followUp → chips

### GPT calendar response format
```json
{
  "intro": "1-2 sentence Zaeli lead-in",
  "events": [...full event objects from Supabase...],
  "followUp": "1 sentence specific offer or observation — never a bare question",
  "replies": ["chip 1", "chip 2", "chip 3"]
}
```

### Chip philosophy (LOCKED)
Chips are ALWAYS conversation continuations — never navigation, never restate visible info.
Context-appropriate: after busy day → "Move something around" / "Any clashes?" / "Add to this day"
After single event → "Change the time" / "Add someone" / "What's nearby?"
NO "See full calendar" portal chip — Zaeli can offer Calendar channel conversationally in followUp text.

### Brief pill colours (LOCKED)
Brief reply chips in the hero section are colour-matched to their topic:
- Calendar/schedule → `#B8EDD0` mint
- Shopping/grocery → `#F0E880` yellow
- Meals/food/dinner → `#FAC8A8` peach
- Todos/tasks → `#F0DC80` gold
- Kids/family → `#A8E8CC` aqua
- Default → `#A8D8F0` sky blue

### Refresh on focus (LOCKED)
`refreshCalendarEvents()` fires on every `useFocusEffect` return to Home.
- Collects all event IDs from messages with `calEvents`
- Single Supabase `.in('id', allIds)` fetch
- Patches messages state silently — no GPT call, no flicker
- Also called on `EventDetailModal` onReload and onDeleted
- Handles deleted events (removes from calEvents if not returned)

### Avatar layout in EventCard
- 1: 28px single · 2: 26px column · 3: 22px column
- 4+: 2×2 grid — first 3 avatars (20px) + grey "+N" overflow chip (20px)
  Shows "+2" for 5 people, "+5" for 8 people, etc.

---

## Tool-Calling System (Home + Calendar)

### Home (index.tsx) — Anthropic Claude tool-calling
**Tools:** `add_calendar_event`, `update_calendar_event` (with `new_assignees`), `delete_calendar_event`, `add_todo`, `add_shopping_item`

**CRITICAL routing rule:**
- `isActionQuery()` runs BEFORE `isCalendarQuery()`
- Action keywords: `add`, `remove`, `delete`, `change`, `move`, `update`, `edit`, `reschedule`, `cancel`, `rename`, `assign`, `invite` etc.
- Action messages ALWAYS go to Anthropic tool-calling path — NEVER to calendar GPT path
- This was the root cause of fake success confirmations from GPT

**Assignee handling (LOCKED):**
- `add_calendar_event`: accepts `assignee` (string) or `assignees` (array of names)
- `update_calendar_event`: accepts `new_assignees` (array of names)
- Name→ID mapping: `anna→1, rich→2, richard→2, poppy→3, gab→4, gabriel→4, duke→5`
- Always merges with existing assignees (no accidental removals)
- Assignees column fallback: if Supabase rejects with column error, retries without assignees

**TOOL_FAILED signal:**
- Catch block returns `TOOL_FAILED: ...` prefix
- CAPABILITY_RULES instructs Claude to report failure honestly — never fake success
- Empty update guard: if `u` has no fields after processing, returns TOOL_FAILED

**Calendar GPT response:**
- Max tokens: 2000 (gpt-5.4-mini reasoning model needs headroom)
- Feature: `home_calendar`

### Calendar (calendar.tsx) — also has new_assignees
- `update_calendar_event` schema includes `new_assignees` (array of IDs — calendar uses IDs directly)
- Same assignees merge logic and fallback retry pattern
- Same TOOL_FAILED catch block

### Conversation history fix (LOCKED)
Calendar messages with `calEvents` were rendering as `"(message)"` in the history sent to Claude.
Fixed: history now reconstructs calendar messages as readable context:
`"[Events shown: "Gym session" on 2026-03-31 at 07:00 (assignees: ["2"])]"`
This gives Claude full context for follow-up actions like "add Anna to that".

---

## Inline Data Render Architecture (LOCKED — Session 23)

EventCard is the first inline render type. All future inline renders (shopping, todos, meals, kids jobs) follow the same pattern.

### Msg interface fields for inline renders
```typescript
// Calendar (current)
calIntro?: string;
calEvents?: any[];
calFollowUp?: string;
showCalendarPill?: boolean; // deprecated — always false now

// Future refactor target (before next inline type):
// inlineData?: {
//   type: 'calendar' | 'shopping' | 'todos' | 'meals' | 'kids';
//   intro?: string;
//   followUp?: string;
//   items?: any[];
//   showPortalPill?: boolean;
// }
```

**Note:** Refactor Msg to use generic `inlineData` field before building the next inline render type (todos or shopping). This keeps the interface clean as channels multiply.

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
**Inline render in Home:** Todo cards render in chat thread (same EventCard pattern). Tappable to tick from Home.
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
- Always npx expo start --dev-client after changes
- Image picker: `['images'] as any`
- Date: local construction only — NEVER toISOString()
- KAV backgroundColor: `#fff`
- Send button: `#FF4545` always
- Our Family: no chat bar, no KAV needed
- Channel colour: banner/status bar only — body always `#FAF8F5` warm white
- No left border stripes on any cards — use dots, icons, badges instead

---

## Screen / Channel Status

| File | Status | Notes |
|---|---|---|
| index.tsx | ✅ Complete | Home + inline calendar + mic overlay + tool-calling fixes |
| calendar.tsx | ✅ Complete | Mic overlay + new_assignees fix |
| shopping.tsx | Needs colour refactor | |
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

## Next Priorities

**Immediate build (next session):**
1. Refactor `Msg` interface to generic `inlineData` field before next inline render type
2. Home inline todos render (same EventCard pattern — second inline type)
3. Shopping channel colour refactor (`#F0E880` / `#D8CCFF` lavender)
4. Meals channel colour refactor

**Proactive awareness (prompt work — quick win):**
5. Add "proactive awareness" instruction to Home brief prompt — scan next 7 days, flag upcoming things needing prep (2-3 days away: dinner plans, packed bags, early starts, school photos)

**New channels (design → build in order):**
6. Kids Hub (kids.tsx)
7. Our Family (family.tsx)
8. Todos (todos.tsx)
9. Notes (notes.tsx)
10. Tutor rebuild to new 11-screen spec
11. Travel (design session first)

**Pre-launch:**
- Remove AI toggle + DEV button
- Real Supabase auth + child login model
- EAS build, TestFlight for Anna
- Website + Stripe + onboarding
- Settings module (design + build — deferred)
