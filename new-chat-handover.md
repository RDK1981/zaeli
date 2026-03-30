# Zaeli — New Chat Handover
*30 March 2026 — Design session complete. Tutor ✅ Kids Hub ✅ Our Family ✅. Copy this entire file to start a new chat.*

---

## Hi! Continuing development of Zaeli.

Zaeli is an iOS-first AI family life platform built in React Native / Expo. Please read **CLAUDE.md** before we start — full stack, architecture, colours, chat bar spec, coding rules. Then **ZAELI-PRODUCT.md** for product vision and all module specs (Tutor, Kids Hub, Our Family are fully designed).

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
Send button = #FF4545 coral ALWAYS — never channel AI colour
Our Family = NO chat bar (only channel without one)
```

---

## What's built (30 Mar 2026)

### index.tsx — Home ✅ COMPLETE
Splash → Home. DM Serif brief + Poppins follow-up. Tool-calling (events/todos/shopping). Whisper. API logging working.

### calendar.tsx — Calendar ✅ COMPLETE (Session 22)
Two-row mint banner. Day strip (7 back + 120 forward). Event cards (auto-emoji, dynamic avatars). Month view. Tool-calling. Whisper. "View events" pill. API logging confirmed.

### Admin dashboard ✅
https://incomparable-gumdrop-32e4ba.netlify.app — home_brief, calendar_chat, whisper all confirmed.

### shopping.tsx, mealplanner.tsx
Functional — need colour refactor to new channel colour system.

### Tutor ✅ FULLY DESIGNED — needs rebuild
Old tutor.tsx files are outdated — full rebuild to new 11-screen spec required.
- Mockup: `zaeli-tutor-final-mockup-v4.html`
- Curriculum: `zaeli-tutor-curriculum-map-v1.html`

### Kids Hub ✅ FULLY DESIGNED — not built
- `zaeli-kids-hub-mockup-v1.html` (8 screens)
- `zaeli-kids-hub-parent-management-v1.html` (5 screens)
- `zaeli-kids-hub-rewards-v2.html` (5 screens)

### Our Family ✅ FULLY DESIGNED — not built
- `zaeli-our-family-mockup-v1.html` (6 screens)

### Not yet built
kids.tsx, family.tsx, todos.tsx, notes.tsx, travel.tsx

---

## Supabase schema
```sql
-- Session 22 addition:
alter table events add column all_day boolean default false;

-- notes field format: "notes text | location text" (split on ' | ')

-- family_members needs new columns (not yet added):
alter table family_members add column dob date;
alter table family_members add column year_level integer;
alter table family_members add column has_own_login boolean default false;

-- New tables needed (not yet created):
-- tutor_sessions: family_id, child_id, subject, pillar, messages (jsonb),
--   difficulty_band, duration_seconds, hints_used (jsonb), title, created_at
-- kids_jobs: family_id, child_id, title, emoji, cadence (daily/weekly/oneoff),
--   reward_points, created_by, approved (bool), paused (bool), created_at
-- kids_rewards: family_id, child_id, name, emoji, points_cost,
--   redeemed_at, approved_by, created_at
-- kids_points: family_id, child_id, balance, lifetime_earned, updated_at
```

---

## Architecture (LOCKED)
No navigation UI. Zaeli is the only navigation.
Avatar → Our Family · Tutor (premium) · Settings · Sign out.
Portal pills = channel bg + accent chevron. Quick reply chips = white bg.
**Our Family** = NO chat bar. Functional-first with Zaeli brief.
**Tutor** = premium A$9.99/child/month. **Kids Hub** = family plan (not premium).

---

## Module decisions locked — quick reference

### Tutor
- AI: GPT-5.4-mini (chat) · Sonnet (photos) · Whisper (voice)
- 6 pillars: Homework · Practice · Read Aloud · Write & Review · Comprehension · Money & Life
- Difficulty: Foundation/Core/Extension — silent adaptive — kids never see label
- Hints: 3 levels, 25/75 split pill pinned above bar always
- Parent review: summary in Tutor · full transcript auth-gated · progress → Our Family only
- Curriculum: AC v9.0. Foundation ≠ Year 1. NAPLAN: Yrs 3,5,7,9.
- Money & Life: 4 levels, amber #F59E0B, real Australian examples

### Kids Hub
- Age tiers: Little (Fn–Yr3) · Middle (Yr4–7) · Older (Yr8–12)
- Jobs: Daily/Weekly/One-off · GIPHY on every tick · Archive · Pause toggle
- Points: Philosophy B (currency) · spent on redemption · parent approves
- Rewards: parent sets name+cost · green/amber/grey states · redemption confirm shows balance
- Games (5, no points): Wordle · Word Scramble · Maths Sprint · Aussie Trivia · Mini Crossword
- Leaderboard: parent-toggleable, monthly reset
- Parent management: all in Our Family

### Our Family
- No chat bar
- Opening brief: DM Serif hero + Poppins detail (active day vs quiet day variants)
- 4 sections: Pending Actions · Our Kids · Family Profiles · (Settings moved out)
- Pending types: Job proposals (green) · Reward requests (red) · Zaeli insights (purple)
- Child detail: Tutor progress bars + Kids Hub summary
- Profiles: DOB, age/year auto-calculated, colour swatches, login status
- Login model: Parents = full account · Older kids = own login (parent enables) · Young kids = profile only
- Avatar badge: red dot with count when actions pending
- Settings: separate avatar destination, deferred until billing/auth ready

---

## Immediate build priorities

**Build chat:**
1. Home inline calendar render (EventCards inline + "See full calendar →" portal pill)
2. Shopping colour refactor (`#F0E880` bg / `#D8CCFF` lavender)
3. Meals colour refactor

**Then new channels (design first if not in docs):**
4. Kids Hub (kids.tsx) — full design in mockup files
5. Our Family (family.tsx) — full design in mockup file
6. Tutor rebuild — full design in mockup files
7. Todos, Notes, Travel (design sessions needed)

---

## Critical coding rules
- `router.navigate()` only — never push() or replace()
- Local date construction — NEVER toISOString()
- `start_time` column NOT `time`
- SafeAreaView `edges={['top']}` always
- Image picker: `['images'] as any`
- KAV → `backgroundColor:'#fff'` → contentWrap → ScrollView + inputArea (absolute)
- Full file rewrites only — never partial diffs
- Always await supabase inserts
- Send button = `#FF4545` always
- Our Family: no chat bar, no KAV needed

---

## Tech reminders
- `npx expo start --dev-client` after every change
- Imports from `app/(tabs)/`: `../../lib/supabase`
- Supabase: `rsvbzakyyrftezthlhtd` (Sydney)
- Admin deploy: drag `C:\Users\richa\Downloads\index.html` to Netlify

---

**Read CLAUDE.md and ZAELI-PRODUCT.md first. Upload the file before editing.**
