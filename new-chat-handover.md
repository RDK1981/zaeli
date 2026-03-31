# Zaeli — New Chat Handover
*31 March 2026 — Home card stack ✅ Reminders tab ✅ design session complete. Copy this entire file to start a new chat.*

---

## Hi! Continuing development of Zaeli.

Zaeli is an iOS-first AI family life platform built in React Native / Expo. Please read **CLAUDE.md** before we start — full stack, architecture, colours, Home card stack spec, Reminders spec, coding rules. Then **ZAELI-PRODUCT.md** for product vision and all module specs.

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
OpenAI = max_completion_tokens · Claude = max_tokens
api_logs = input_tokens / output_tokens (NO total_tokens column)
KAV must have backgroundColor:'#fff'
always await supabase inserts
Send button = #FF4545 coral ALWAYS
Our Family = NO chat bar
Channel body bg = #FAF8F5 warm white — never full colour bleed
No left-border accent strips on cards — dots, icons, badges only
isActionQuery() runs BEFORE isCalendarQuery()
Apostrophes in JSX: always double-quoted strings
```

---

## What's built (31 Mar 2026)

### index.tsx — Home ✅ COMPLETE (Sessions 20–24)
- inlineData pattern for all inline renders
- Tool-calling: add/update/delete events, todos, shopping items
- isActionQuery() before isCalendarQuery() routing
- isFullCalendarRequest() — renders today's events + Open Calendar portal pill
- Brief chips in hero banner ONLY
- Whisper voice. API logging working.
- **HOME CARD STACK REDESIGN LOCKED (31 Mar 2026)** — full spec in CLAUDE.md

### calendar.tsx — Calendar ✅ COMPLETE
Two-row mint banner. Day strip. Event cards. Month view. Tool-calling. Whisper. Mic overlay.

### Admin dashboard ✅
https://incomparable-gumdrop-32e4ba.netlify.app · March 2026: A$3.17 / 1,048 calls.

### shopping.tsx, mealplanner.tsx
Functional — need colour refactor (`#F0E880` / `#D8CCFF` lavender for shopping).

### All designed, not yet built
- Home card stack: `zaeli-home-card-tweaks-v2.html` (final — 4 screens)
- Todos + Reminders: `zaeli-todos-reminders-v2.html` (5 screens — includes Reminders tab)
- Tutor: `zaeli-tutor-final-mockup-v4.html` (11 screens)
- Kids Hub: `zaeli-kids-hub-rewards-v2.html`
- Our Family: `zaeli-our-family-mockup-v1.html` (6 screens)
- Notes: `zaeli-notes-mockup-v1.html` (5 screens)

### Travel — no design yet

---

## HOME CARD STACK — locked decisions summary

### Banner hero line
DM Serif 16px, ink black, italic emphasis. One or two sentences. NO sub-label. No greeting text.
Tappable — Zaeli expands in chat.

- **AM (5–12):** *"Hope the soccer went well, Gab. Big morning ahead, Rich."*
- **PM (12–8):** *"Hope the surf ski was good. Nothing sorted for dinner yet — worth a thought."*
- **Evening (8–5):** *"Gab scored the winner. Poppy's swimming at 8am — early one."*

### Card stack on `#FAF8F5` warm white body

**Card order:**
- AM: Calendar → Weather+Shopping → Actions → Dinner
- PM: Dinner (leads if unplanned) → Calendar → Actions → Weather+Shopping
- Evening: Tomorrow calendar → Actions (with tomorrow AM section) → Weather+Shopping → Dinner tomorrow

**Calendar — slate `#3A3D4A` (full width)**
Header: eye label + weather · + Add · Full → top right
Timeline rows · footer: context left · "Full calendar →" right

**Weather — sky blue `#A8D8F0` (two-col, flex 0 0 88px)**
DM Serif temp · condition · icon · extra. Read only.

**Shopping — lavender `#D8CCFF` (two-col, flex 1)**
Header: + Add · Full → top right (identical to calendar pattern)
Top 3 items · **item count BIG bottom right** (large number + small "items" label)
+ Add → Zaeli: "What do you need to pick up?"

**Today's actions — gold `#F0DC80` (full width)**
Header: count badge · + Add · Full → top right
**Circle tick LEFT = ONLY completion mechanism.** No swipe labels. No "done" text.
Rows: circle · urgency dot · text · avatar · badge
Ticking: circle fills, text greys + strikethrough, count drops, Zaeli one-line acknowledgement
Badges: Reminder (red) · Overdue (dark red) · Todo (gold) — remain visible when ticked
**Evening: two sections in one card:**
- "🌙 Put out tonight" — circle ticks, actionable
- "🌅 Tomorrow morning" — NO circles, FYI awareness items
Separated by labelled divider
+ Add → Zaeli: "What do you need to remember or do?"

**Dinner — terracotta `#FAC8A8` (full width)**
Planned: emoji · name · prep note · "✓ Planned"
Unplanned: nudge + "Quick idea 💡" · "Plan the week"
**Footer: "Next 7 days ›"** — expands inline 7-day meal strip within the card
Evening: shows tomorrow's dinner

### + Add interaction (LOCKED)
Tap + Add on any card → Zaeli opens inline prompt in chat below. No modal. No new screen. Cursor live immediately. Zaeli confirms, card updates. Never leaves Home.

---

## TODOS + REMINDERS CHANNEL — locked decisions summary

Channel: `#F0DC80` banner · `#D8CCFF` AI colour · `#806000` accent

### Three tabs (LOCKED)
```
Mine  |  Family  |  Reminders
```
**Mine** — personal todos only
**Family** — shared todos, Anna's todos Rich can see, assigned to Rich
**Reminders** — things to REMEMBER (distinct from todos = things to DO)

### Todos (Mine + Family tabs) — unchanged from previous design
- Priority dots: Red (overdue) · Amber (today/soon) · Grey (someday)
- Badges: ↻ Recurring · Shared · 📅 Calendar-linked
- Circle tick left — completion mechanism
- Zaeli brief strip at top: most urgent item
- "Done this week" collapsible divider
- Features: smart due dates · priority in Home brief · recurring · shared handoff · calendar integration

### Reminders tab (LOCKED ✅ 31 Mar 2026)

**The distinction:** Todos = things you DO. Reminders = things you REMEMBER.

**Visual language:**
- Bell icon (🔔) instead of circle tick — same satisfying tap, different mental model
- Urgency shown by time label colour: today (gold bold) · tonight (purple) · tomorrow (amber) · upcoming (muted)
- Recurring badge: ↻ Weekly / Monthly

**Bell states:**
- 🔔 Active red tint — due today, unacknowledged
- 🔔 Upcoming amber tint — due in future
- 🔔 Recurring gold tint — auto-repeating
- ✓ Done grey — acknowledged, below divider

**Two-touch nudge system (LOCKED):**
- Nudge 1: evening before the reminder date
- Nudge 2: morning of (7am), only if not yet acknowledged
- If acknowledged before morning fires → morning cancelled
- Toggle per reminder (default ON)
- Visible under each reminder: "Evening nudge sent · morning nudge at 7am if not done"

**Recurrence:** None / Daily / Weekly (choose day) / Monthly. Auto-reappears.

**Creating reminders:**
1. Tell Zaeli: "Remind me Gab needs a gold coin Wednesday" → confirmed in chat with card
2. Tap + Add → sheet: what · who (family member chips) · when chips · two-touch toggle

**Acknowledging:** Tap the bell → greys, sinks below "Acknowledged" divider.

**How reminders surface in Home actions card:**
- Today's reminders: appear with "Reminder" badge (red)
- Evening state: tomorrow's reminders in "🌅 Tomorrow morning" section — NO circles, FYI only

### New Supabase table needed
```sql
create table reminders (
  id uuid default gen_random_uuid() primary key,
  family_id uuid not null,
  title text not null,
  about_member_id uuid,
  remind_at timestamptz not null,
  recurrence text default 'none', -- none/daily/weekly/monthly
  recurrence_day integer,          -- 0=Sun, 1=Mon etc for weekly
  two_touch bool default true,
  evening_sent bool default false,
  acknowledged bool default false,
  acknowledged_at timestamptz,
  created_by uuid,
  created_at timestamptz default now()
);
```

**Mockup:** `zaeli-todos-reminders-v2.html` — 5 screens

---

## Session 24 locked decisions (still current)

### inlineData (LOCKED)
```typescript
inlineData?: {
  type: 'calendar' | 'todos' | 'shopping' | 'meals' | 'kids';
  intro?: string; followUp?: string; items?: any[]; showPortalPill?: boolean;
}
```

### Zaeli persona (LOCKED)
Warm + enthusiastic. Proportionate. Confident offers: "Say the word and I'll..."
Banned: "queued up", "sorted", "tidy", "chaos", "ambush", "sprint", "stacked neatly", "locked in".

---

## Build priorities — in order

1. **Shopping colour refactor** — `#F0E880` bg / `#D8CCFF` lavender AI colour
2. **Meals colour refactor**
3. **Home card stack rebuild** — spec in CLAUDE.md + `zaeli-home-card-tweaks-v2.html`
4. **Todos + Reminders** (`todos.tsx`) — spec above + `zaeli-todos-reminders-v2.html`
5. **Kids Hub** (`kids.tsx`)
6. **Our Family** (`family.tsx`)
7. **Notes** (`notes.tsx`)
8. **Tutor rebuild**
9. **Travel** (design session first)

**Deferred:** Home inline todos/reminders render · model cost review · real auth · EAS build · Stripe · Settings

---

## Critical coding rules
- `router.navigate()` only — NEVER push() or replace()
- Local date construction — NEVER toISOString()
- `start_time` NOT `time` in events table
- SafeAreaView `edges={['top']}` always
- Image picker: `['images'] as any`
- KAV → `backgroundColor:'#fff'`
- Full file rewrites only
- Always await supabase inserts
- Send = `#FF4545` always · Body bg = `#FAF8F5` · No left-border accent strips
- Apostrophes in JSX: double-quoted strings

---

## Tech reminders
- `npx expo start --dev-client` after every change (--clear for bundle issues)
- Import paths from `app/(tabs)/`: `../../lib/supabase`
- Supabase: `rsvbzakyyrftezthlhtd` (Sydney)
- Admin deploy: drag `C:\Users\richa\Downloads\index.html` to Netlify

---

**Read CLAUDE.md and ZAELI-PRODUCT.md first. Upload the current file before editing.**
