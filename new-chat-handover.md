# Zaeli — New Chat Handover
*30 March 2026 — Tutor ✅ Kids Hub ✅ Our Family design active. Copy this entire file to start a new chat.*

---

## Hi! Continuing development of Zaeli.

Zaeli is an iOS-first AI family life platform built in React Native / Expo. Please read **CLAUDE.md** before we start — full stack, architecture, colours, chat bar spec, coding rules. Then **ZAELI-PRODUCT.md** for product vision and all module specs.

---

## How I like to work
- **Beginner developer** — always full file rewrites, never partial diffs
- **Two fixes at a time** — bulk changes cause too many variables
- One PowerShell command at a time, never chained with &&
- Plain English before code
- **Design before code** — mockup first for any new channel
- Always ask me to upload current working file before editing — never build from memory

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
Send button = #FF4545 coral ALWAYS — never channel AI colour
```

---

## What's built (30 Mar 2026)

### index.tsx — Home ✅ COMPLETE
Splash → Home. DM Serif brief + Poppins follow-up. Tool-calling (events/todos/shopping). Whisper voice. API logging working.

### calendar.tsx — Calendar ✅ COMPLETE (Session 22)
Two-row mint banner. Day strip. Event cards (auto-emoji, dynamic avatars). Month view. Tool-calling. Whisper mic. "View events" pill. API logging confirmed.

### Admin dashboard ✅
https://incomparable-gumdrop-32e4ba.netlify.app — home_brief, calendar_chat, whisper confirmed.

### Channels needing colour refactor
shopping.tsx, mealplanner.tsx — functional, need new colour system applied.

### Tutor ✅ FULLY DESIGNED — needs rebuild
- 11-screen spec: `zaeli-tutor-final-mockup-v4.html`
- Curriculum map: `zaeli-tutor-curriculum-map-v1.html`
- Old tutor.tsx files → full rebuild required

### Kids Hub ✅ FULLY DESIGNED — not built
- Main mockup: `zaeli-kids-hub-mockup-v1.html` (8 screens)
- Parent management: `zaeli-kids-hub-parent-management-v1.html` (5 screens)
- Rewards v2: `zaeli-kids-hub-rewards-v2.html` (5 screens — Philosophy B)

### Not yet built
- kids.tsx, family.tsx, todos.tsx, notes.tsx, travel.tsx

---

## Supabase schema
```sql
-- Session 22 addition:
alter table events add column all_day boolean default false;

-- notes field format: "notes text | location text" (split on ' | ')

-- New tables needed (not yet created):
-- tutor_sessions: family_id, child_id, subject, pillar, messages (jsonb),
--   difficulty_band, duration_seconds, hints_used (jsonb), title, created_at
-- kids_jobs: family_id, child_id, title, emoji, cadence, reward_points,
--   created_by, approved (bool), paused (bool), created_at
-- kids_rewards: family_id, child_id, name, emoji, points_cost,
--   redeemed_at, approved_by, created_at
-- kids_points: family_id, child_id, balance, lifetime_earned, updated_at
```

---

## Architecture (LOCKED)
No navigation UI. Zaeli is the only navigation. Avatar → Settings / Billing / Our Family / Tutor.
Portal pills = channel bg colour + accent chevron. Quick reply chips = white bg.
**Tutor** = premium A$9.99/child/month. **Kids Hub** = family plan (not premium).

---

## Kids Hub — key decisions locked

**Jobs:** Daily/Weekly/One-off cadences. Kids can propose jobs → parent approves. GIPHY on every tick. Completed jobs grey (stay visible). Archive for one-offs. Pause toggle.

**Points (Philosophy B — currency):** Single pool, spent on redemption, balance drops. Never deduct until parent approves. No points from games — jobs only.

**Rewards:** Parent sets name + cost. Always show affordable-now + saving-toward. Redemption confirm shows full before/after balance. Parent approves in Our Family.

**Games (5 — no points):** Wordle (daily family word) · Word Scramble · Maths Sprint · Aussie Trivia · Mini Crossword.

**Leaderboard:** Parent-toggleable. Monthly reset.

---

## Tutor — key decisions locked

**AI split:** GPT-5.4-mini (chat) · Sonnet (photos) · Whisper (voice).

**6 pillars:** Homework · Practice · Read Aloud · Write & Review · Comprehension · Money & Life.

**Difficulty:** Foundation / Core / Extension. Silent adaptive. Kids never see label.

**Hints:** 3 levels. 25/75 split pill pinned above bar. Hint 1 = different equation. Hint 2 = first step only. Hint 3 = full worked example.

**Parent review:** Simple summary in Tutor (child accessible). Full transcript auth-gated. Progress view → Our Family only.

**Curriculum:** AC v9.0 ACARA. Foundation ≠ Year 1. NAPLAN years: 3,5,7,9.

**Money & Life:** 4 levels. Amber `#F59E0B`. Real Australian examples.

---

## Immediate build chat priorities
1. Home inline calendar render (EventCards inline + "See full calendar →" portal pill)
2. Shopping colour refactor (`#F0E880` bg / `#D8CCFF` lavender)
3. Meals colour refactor

## Design chat priorities (this session)
1. ✅ Tutor
2. ✅ Kids Hub
3. 🔄 Our Family — active now

---

## Critical coding rules
- `router.navigate()` only
- Local date construction — NEVER toISOString()
- `start_time` column (NOT `time`)
- SafeAreaView `edges={['top']}` always
- Image picker: `['images'] as any`
- KAV → `backgroundColor:'#fff'` → contentWrap → ScrollView + inputArea
- Full file rewrites only
- Always await supabase inserts
- Send button = `#FF4545` always

---

## Tech reminders
- `npx expo start --dev-client` after every change
- Imports from `app/(tabs)/`: `../../lib/supabase`
- Supabase: `rsvbzakyyrftezthlhtd` (Sydney)
- Admin deploy: drag `C:\Users\richa\Downloads\index.html` to Netlify

---

**Read CLAUDE.md and ZAELI-PRODUCT.md first. Ask me to upload the file before editing.**
