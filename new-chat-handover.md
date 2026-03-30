# Zaeli — New Chat Handover
*30 March 2026 — Design session complete. Tutor ✅ Kids Hub ✅ Our Family ✅ Todos ✅ Notes ✅. Copy this entire file to start a new chat.*

---

## Hi! Continuing development of Zaeli.

Zaeli is an iOS-first AI family life platform built in React Native / Expo. Please read **CLAUDE.md** before we start — full stack, architecture, colours, coding rules. Then **ZAELI-PRODUCT.md** for product vision and all module specs.

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

## Key constants (CRITICAL)
```
DUMMY_FAMILY_ID = '00000000-0000-0000-0000-000000000001'
SONNET          = 'claude-sonnet-4-20250514'  ← NOT claude-sonnet-4-6
GPT_MINI        = 'gpt-5.4-mini'             ← NOT gpt-4.1-mini (retired)
WHISPER_URL     = 'https://api.openai.com/v1/audio/transcriptions'
OpenAI = max_completion_tokens · Claude = max_tokens
api_logs = input_tokens / output_tokens (NO total_tokens column)
KAV must have backgroundColor:'#fff'
always await supabase inserts
Send button = #FF4545 coral ALWAYS
Our Family = NO chat bar
Channel body bg = #FAF8F5 warm white — never full channel colour bleed
No left-border accent strips on cards
```

---

## What's built (30 Mar 2026)

### index.tsx — Home ✅ COMPLETE
Splash → Home. DM Serif brief + Poppins follow-up. Tool-calling (events/todos/shopping). Whisper. API logging working.

### calendar.tsx — Calendar ✅ COMPLETE (Session 22)
Two-row mint banner. Day strip. Event cards. Month view. Tool-calling. Whisper. API logging confirmed.

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

## Supabase schema additions needed
```sql
-- family_members additions:
alter table family_members add column dob date;
alter table family_members add column year_level integer;
alter table family_members add column has_own_login boolean default false;

-- New tables:
-- todos: family_id, title, assigned_to, due_date, priority, status,
--   recurrence, calendar_event_id, shared_with (jsonb), created_by
-- notes: family_id, created_by, title, body, emoji, colour_tint,
--   pinned (bool), shared_with (jsonb), is_voice (bool), created_at, updated_at
-- tutor_sessions, kids_jobs, kids_rewards, kids_points — see CLAUDE.md
```

---

## Architecture (LOCKED)
No navigation UI. Zaeli is the only navigation.
Avatar → Our Family · Tutor (premium) · Settings · Sign out.
Portal pills = channel bg + accent chevron. Quick reply chips = white bg.
**Our Family** = NO chat bar. **Tutor** = premium. **Kids Hub** = family plan.

---

## Module decisions — quick reference

### Todos
- 2 tabs: Mine · Family
- 5 features: Smart due dates · Priority in Home brief · Recurring · Shared handoff · Calendar block
- Inline render in Home (EventCard pattern)
- Priority dots: red/amber/grey. Badges: ↻ Shared 📅
- Completed: collapsible divider, recurring shows next date

### Notes
- Simple and beautiful — not AI-connected in v1
- Instant capture, DM Serif titles, pinned (📌 icon, no left border), 6 colour tints
- Voice → Whisper transcribes → Zaeli tidies → option to save as todo
- Share with family: view-only default, edit toggle
- Zaeli suggests todos from note content — never rewrites or summarises
- Full channel colour only on recording screen — rest on #FAF8F5

### Tutor, Kids Hub, Our Family — see CLAUDE.md or ZAELI-PRODUCT.md

---

## Immediate build priorities

1. Home inline calendar render (EventCards + "See full calendar →" portal pill)
2. Shopping colour refactor (`#F0E880` / `#D8CCFF` lavender)
3. Meals colour refactor
4. Kids Hub (kids.tsx)
5. Our Family (family.tsx)
6. Todos (todos.tsx)
7. Notes (notes.tsx)
8. Tutor rebuild
9. Travel (design session first)

---

## Critical coding rules
- `router.navigate()` only
- Local date construction — NEVER toISOString()
- `start_time` column NOT `time`
- SafeAreaView `edges={['top']}` always
- Image picker: `['images'] as any`
- KAV → `backgroundColor:'#fff'`
- Full file rewrites only
- Always await supabase inserts
- Send = `#FF4545` always
- Body bg = `#FAF8F5` warm white
- No left-border accent strips on cards

---

## Tech reminders
- `npx expo start --dev-client` after every change
- Imports from `app/(tabs)/`: `../../lib/supabase`
- Supabase: `rsvbzakyyrftezthlhtd` (Sydney)
- Admin deploy: drag `C:\Users\richa\Downloads\index.html` to Netlify

---

**Read CLAUDE.md and ZAELI-PRODUCT.md first. Upload the file before editing.**
