# CLAUDE.md — Zaeli Project Context
*Last updated: 31 March 2026 — Home card stack ✅ Reminders ✅ design session complete.*

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
- GPT-5.4 mini chat: ~A$0.003–0.004/msg average
- home_brief: ~A$0.0004/call · home_calendar: ~A$0.0008/call · home_chat (Sonnet): ~A$0.01/call
- calendar_chat (Sonnet): ~A$0.009/call · whisper: ~A$0.0007/call
- Real MTD cost March 2026: A$3.17 / 1,048 calls
- Tutor hybrid: ~A$2.00/child/month at 500 turns (~80% gross margin)
- Only Home generates a brief on cold open — no brief on channel transitions

---

## Zaeli Persona (LOCKED Session 24)

Sharp, warm, genuinely enthusiastic about this family. Finds the funny angle through delight, not detachment. Celebrates small wins. Spots chaos before it arrives.

**Hard rules:**
- NEVER "mate", "guys" — Never start with "I" — Plain text only
- Always ends on a confident offer ("Say the word and I'll...") — never a bare open question
- BE PROPORTIONATE — never manufacture drama
- **Banned words:** "queued up", "locked in", "tidy", "sorted", "lined up", "all set", "stacked neatly", "ambush", "sprint", "chaos", "chaotic"

---

## Stack
- React Native + Expo (iOS-first), dev build on iPhone 11 Pro Max (bundle ID com.zaeli.app)
- Supabase (Postgres, Sydney ap-southeast-2, ID: rsvbzakyyrftezthlhtd)
- Claude Sonnet (`claude-sonnet-4-20250514`) — vision/scan + Tutor + home_chat tool-calling + calendar_chat
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
SONNET          = 'claude-sonnet-4-20250514'  ← NOT claude-sonnet-4-6
GPT_MINI        = 'gpt-5.4-mini'             ← NOT gpt-4.1-mini (retired Feb 2026)
CRITICAL: OpenAI = max_completion_tokens. Claude = max_tokens. Never mix.
CRITICAL: KAV must have backgroundColor:'#fff'
CRITICAL: always await supabase inserts
CRITICAL: Send button is #FF4545 coral across ALL channels
CRITICAL: isActionQuery() runs BEFORE isCalendarQuery()
CRITICAL: Apostrophes in JSX: always double-quoted strings e.g. "What's on today"
```

---

## API Logging
```
Table: api_logs
Columns: family_id, feature, model, input_tokens, output_tokens, cost_usd, created_at
CRITICAL: input_tokens / output_tokens — NOT prompt_tokens / completion_tokens
CRITICAL: total_tokens column does NOT exist
CRITICAL: always await supabase inserts
```
Admin dashboard: https://incomparable-gumdrop-32e4ba.netlify.app

---

## Navigation Model (LOCKED)
- No channel navigation UI — Zaeli is the only navigation mechanism
- **Avatar (top right):** Our Family · Tutor (premium) · Settings · Sign out
- Always `router.navigate()` — never push() or replace()

---

## Channel Architecture (LOCKED)
```
app/(tabs)/index.tsx       → Home channel ✅ COMPLETE (Sessions 20–24)
app/(tabs)/calendar.tsx    → Calendar channel ✅ COMPLETE
app/(tabs)/shopping.tsx    → Shopping (needs colour refactor)
app/(tabs)/mealplanner.tsx → Meals (needs colour refactor)
app/(tabs)/kids.tsx        → Kids Hub (design ✅ — not yet built)
app/(tabs)/todos.tsx       → To-dos + Reminders (design ✅ — not yet built)
app/(tabs)/notes.tsx       → Notes (design ✅ — not yet built)
app/(tabs)/travel.tsx      → Travel (not built, no design yet)
app/(tabs)/family.tsx      → Our Family (design ✅ — not yet built)
app/(tabs)/tutor.tsx       → Tutor (standalone premium — NOT a channel)
```

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

**CRITICAL:** Chat bar send button = `#FF4545` coral always.
**Colour bleed rule:** Channel bg = banner + status bar ONLY. Body = `#FAF8F5` warm white.
No left-border accent strips on cards — use dots, icons, badges instead.

---

## Family Member Colours (LOCKED)
```
Rich: #4D8BFF · Anna: #FF7B6B · Poppy: #A855F7 · Gab: #22C55E · Duke: #F59E0B
```

---

## Splash Screen (LOCKED)
- Bg: `#A8E8CC`, 3s · Wordmark: DM Serif 96px, ink + `#FAC8A8` peach on 'a' and 'i'
- Greeting: Poppins 400 18px · Tagline: "LESS CHAOS. MORE FAMILY." Poppins 500 12px uppercase

---

## Banner Spec (LOCKED)
- Wordmark: DM Serif 34px, letter-spacing -1.5px, ink body, ai letters in channel colour
- Channel name: Poppins 600, 13px, `rgba(0,0,0,0.5)`
- Avatar: 32×32px, Rich's `#4D8BFF`
- Bg: always channel bg colour · Divider: 1px `rgba(0,0,0,0.08)`

---

## ══════════════════════════════════
## HOME CHANNEL — CARD STACK (LOCKED ✅ 31 Mar 2026)
## ══════════════════════════════════

Home is a hybrid: glanceable card stack at top, Zaeli conversation below.

### Banner hero line
Row 1: wordmark left, avatar right. Row 2: DM Serif 16px, ink black, italic emphasis. No sub-label. Tappable — expands Zaeli in chat.

**AM (5–12):** Yesterday acknowledged + today flagged.
*"Hope the soccer went well, Gab. Big morning ahead, Rich."*

**PM (12–8):** Check-in + dinner/afternoon nudge.
*"Hope the surf ski was good. Nothing sorted for dinner yet — worth a thought."*

**Evening (8–5):** Positive day snapshot + tomorrow flag.
*"Gab scored the winner. Poppy's swimming at 8am — early one."*

### Card order by time
- **AM:** Calendar → Weather+Shopping → Actions → Dinner
- **PM:** Dinner (leads if unplanned) → Calendar → Actions → Weather+Shopping
- **Evening:** Tomorrow calendar → Actions (with tomorrow AM section) → Weather+Shopping → Dinner (tomorrow)

### Card specs (ALL LOCKED)

**Calendar — slate `#3A3D4A` (full width)**
Header: eye label + weather · + Add · Full → top right
Timeline: time · colour dot · event · family avatar
Footer: context left · "Full calendar →" right

**Weather — sky blue `#A8D8F0` (two-col, flex 0 0 88px)**
DM Serif temp · condition · icon · extra detail. Read only.

**Shopping — lavender `#D8CCFF` (two-col, flex 1)**
Header: + Add · Full → top right (matching calendar)
Top 3 items. **Item count BIG bottom right** (large number + small "items" label)
+ Add → Zaeli inline: "What do you need to pick up?"

**Today's actions — gold `#F0DC80` (full width)**
Header: count badge · + Add · Full → top right
Rows: **circle tick left** (ONLY mechanism) · urgency dot · text · avatar · badge
Ticking: circle fills, text greys + strikethrough, count drops
Zaeli quiet acknowledgement in chat: one warm specific line
Badges: Reminder (red) · Overdue (dark red) · Todo (gold) — remain visible when done
**Evening — two sections in one card:**
- "🌙 Put out tonight" — circle ticks, actionable
- "🌅 Tomorrow morning" — NO circles, FYI awareness (e.g. "Anna on school run 8:30")
Separated by a labelled divider
+ Add → Zaeli inline: "What do you need to remember or do?"

**Dinner — terracotta `#FAC8A8` (full width)**
Planned: emoji · name · prep note · "✓ Planned"
Unplanned: nudge + "Quick idea 💡" · "Plan the week"
**Footer: "Next 7 days ›"** — expands inline 7-day meal strip within card
Evening: shows tomorrow's dinner

### + Add interaction
Tap + Add → Zaeli inline prompt in chat. No modal, no new screen. Never leaves Home.
- Calendar: "What would you like to add to the calendar?"
- Shopping: "What do you need to pick up?"
- Actions: "What do you need to remember or do?"

### Mockup files
`zaeli-home-card-tweaks-v2.html` — final cards (4 screens)
`zaeli-home-three-states-v1.html` — AM/PM/Evening states
`zaeli-home-refined-interactions-v1.html` — interactions

---

## Chat Interface Spec (LOCKED)
- Zaeli messages: NO bubble — open text, Poppins 15px/400, line-height 1.6
- User bubble: right-aligned, `#EDE8FF` bg, `border-radius: 16px 2px 16px 16px`

## CANONICAL CHAT BAR SPEC
```
barPill: borderRadius:30, paddingV:14, paddingH:16, borderWidth:1
  ├── barBtn 34×34 → IcoPlus
  ├── barSep 1×18px
  ├── TextInput fontSize:15 Poppins_400Regular
  ├── barBtn 34×34 → IcoMic
  └── barSend 32×32 bg=#FF4545
KAV behavior=padding offset=0 backgroundColor='#fff'
  └── contentWrap flex:1 position:relative
        ├── ScrollView
        └── inputArea position:absolute bottom:0
```
**Our Family has NO chat bar.**

---

## inlineData Architecture (LOCKED Session 24)
```typescript
inlineData?: {
  type: 'calendar' | 'todos' | 'shopping' | 'meals' | 'kids';
  intro?: string; followUp?: string; items?: any[]; showPortalPill?: boolean;
}
```
Old calIntro/calEvents/calFollowUp/showCalendarPill fields GONE.

---

## Tool-Calling System (LOCKED)
**Tools:** `add_calendar_event`, `update_calendar_event` (with `new_assignees`), `delete_calendar_event`, `add_todo`, `add_shopping_item`
- `isActionQuery()` BEFORE `isCalendarQuery()`
- `isFullCalendarRequest()` → today's events + Open Calendar pill
- Brief chips: hero banner ONLY — never in chat thread
- TOOL_FAILED: honest error, never fake success

---

## Supabase Tables
```
events          → date, start_time (ISO local), end_time, assignees (jsonb), all_day (bool)
todos           → family_id, title, assigned_to, shared_with (jsonb), due_date, priority,
                  status, recurrence, recurrence_day, calendar_event_id, created_by
reminders       → family_id, title, about_member_id, remind_at (timestamptz),
                  recurrence (none/daily/weekly/monthly), recurrence_day,
                  two_touch (bool), evening_sent (bool), acknowledged (bool),
                  acknowledged_at, created_by, created_at
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

## Todos + Reminders Channel (DESIGNED ✅ — not yet built)
Colour: `#F0DC80` / `#D8CCFF` lavender / `#806000`.

### Three tabs (LOCKED)
**Mine** — personal todos · **Family** — shared todos · **Reminders** — things to remember

### Todos (Mine + Family tabs)
- Priority dots: Red (overdue) · Amber (today/soon) · Grey (someday)
- Badges: ↻ Recurring · Shared · 📅 Calendar-linked
- Circle tick left — ONLY completion mechanism
- Zaeli brief strip at top (most urgent item)
- Completed: "Done this week" collapsible divider
- Five features: smart due dates · priority in Home brief · recurring · shared handoff · calendar integration

### Reminders tab (LOCKED ✅ 31 Mar 2026)
**Todos = things you DO. Reminders = things you REMEMBER.**

**Visual distinction:**
- Bell icon (🔔) instead of circle tick
- Urgency shown by time label (today/tonight/tomorrow/upcoming) not dot colour
- Two-touch nudge note visible under each reminder: "Evening nudge sent · morning nudge at 7am if not done"

**Bell states:**
- Active (red tint) — due today, unacknowledged
- Upcoming (amber tint) — due future
- Recurring (gold tint) — weekly/monthly repeating
- Done (grey) — acknowledged, sinks below divider

**Two-touch nudge system (LOCKED):**
- First nudge: evening before (e.g. Tuesday night for Wednesday reminder)
- Second nudge: morning of, only if not yet acknowledged
- Toggle on/off per reminder (default ON)
- If acknowledged before morning nudge fires, morning nudge is cancelled

**Recurrence:** None / Daily / Weekly (choose day) / Monthly. Auto-reappears. No re-adding.

**Creating reminders:**
1. Tell Zaeli in conversation: "Remind me Gab needs a gold coin Wednesday" → confirmed, done
2. Tap + Add in Reminders tab → sheet: what · who (family member chips) · when · two-touch toggle

**Acknowledging:** Tap the bell circle → acknowledged, greys below divider.

**How reminders surface in Home:**
- Today's reminders appear in the gold actions card with "Reminder" badge (red)
- Evening state: tomorrow's reminders show in "🌅 Tomorrow morning" section (no circles — FYI only)
- This is how "Anna on school run 8:30" appears at 9pm so Rich can check in tonight

**Mockup:** `zaeli-todos-reminders-v2.html` — 5 screens

---

## Kids Hub Channel (DESIGNED ✅ — not yet built)
Family plan. `#A8E8CC` / `#FAC8A8` / `#0A6040`.
Age tiers: Little / Middle / Older. Jobs: Daily/Weekly/One-off. Points: Philosophy B. Games: 5 (no points). Leaderboard: parent-toggleable.

---

## Our Family Channel (DESIGNED ✅ — not yet built)
`#F0C8C0` / `#D8CCFF` / `#A01830`. Avatar menu. NO chat bar.
Brief: DM Serif hero. Sections: Pending Actions · Our Kids · Family Profiles.

---

## Notes Channel (DESIGNED ✅ — not yet built)
`#C8E8A8` / `#F0C8C0` / `#2A6010`. Simple and beautiful — not AI-connected v1.
Instant capture · DM Serif titles · pinned (📌) · 6 colour tints · voice notes.

---

## Tutor Module (DESIGNED ✅ — not yet built)
Premium A$9.99/child/month. GPT-5.4-mini + Sonnet + Whisper. 6 pillars. 3 difficulty bands.

---

## Coding Rules
- SafeAreaView edges={['top']} always · No floating FAB
- Logo taps = router.navigate('/(tabs)/')
- PowerShell: no && — separate lines
- Always npx expo start --dev-client (--clear for bundle issues)
- Image picker: `['images'] as any`
- Date: local construction — NEVER toISOString()
- KAV backgroundColor: `#fff`
- Send button: `#FF4545` always
- Channel body bg: `#FAF8F5` — never full colour bleed
- No left-border accent strips on cards
- Apostrophes in JSX: double-quoted strings

---

## Screen Status

| File | Status | Notes |
|---|---|---|
| index.tsx | ✅ Complete | Home card stack redesign spec locked 31 Mar |
| calendar.tsx | ✅ Complete | |
| shopping.tsx | Needs colour refactor | `#F0E880` / `#D8CCFF` |
| mealplanner.tsx | Needs colour refactor | |
| todos.tsx | ✅ Design complete | Includes Reminders tab |
| kids.tsx | ✅ Design complete | |
| family.tsx | ✅ Design complete | |
| notes.tsx | ✅ Design complete | |
| travel.tsx | No design | |
| tutor/* | ✅ Design complete | Needs rebuild |

---

## Next Priorities

**Build chat — in order:**
1. Shopping colour refactor
2. Meals colour refactor
3. **Home card stack rebuild** (full spec above + mockup `zaeli-home-card-tweaks-v2.html`)
4. Todos + Reminders channel (`todos.tsx`) — spec above + `zaeli-todos-reminders-v2.html`
5. Kids Hub (`kids.tsx`)
6. Our Family (`family.tsx`)
7. Notes (`notes.tsx`)
8. Tutor rebuild
9. Travel (design session first)

**Deferred:**
- Home inline todos/reminders render (inlineData pattern)
- Model cost review
- Real auth, EAS build, TestFlight, website, Stripe, Settings
