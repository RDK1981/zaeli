# Zaeli — New Chat Handover
*30 March 2026 — Design session complete (Tutor fully designed, Kids Hub + Our Family queued). Copy this entire file to start a new chat.*

---

## Hi! Continuing development of Zaeli.

Zaeli is an iOS-first AI family life platform built in React Native / Expo. Please read **CLAUDE.md** before we start — full stack, architecture, colours, chat bar spec, coding rules. Then **ZAELI-PRODUCT.md** for product vision, design decisions, and the full Tutor module spec.

---

## How I like to work
- **Beginner developer** — always give full file rewrites I can copy-paste, never partial diffs
- **Two fixes at a time** — bulk changes cause too many variables
- One PowerShell command at a time, never chained with &&
- Plain English before code
- **Design before code** — for any new channel, discuss and mockup first
- Always ask me to upload the current working file before editing — never build from memory

---

## Who I am
- My name is Richard. **Logged-in user in the app is Rich**
- Family: Rich (logged in), Anna, Poppy (Yr6, 12, girl), Gab (Yr4, 10, BOY — Gabriel, he/him), Duke (Yr1, 8, boy)
- Local path: `C:\Users\richa\zaeli` (Windows, PowerShell)
- PowerShell escape: `app\`(tabs`)\filename.tsx`
- Repo: https://github.com/RDK1981/zaeli (private)
- Admin dashboard: https://incomparable-gumdrop-32e4ba.netlify.app

---

## Key constants (CRITICAL — never get these wrong)
```
DUMMY_FAMILY_ID = '00000000-0000-0000-0000-000000000001'
FAMILY_ID       = '00000000-0000-0000-0000-000000000001'
SONNET          = 'claude-sonnet-4-20250514'  ← NOT claude-sonnet-4-6
GPT_MINI        = 'gpt-5.4-mini'             ← NOT gpt-4.1-mini (retired Feb 2026)
WHISPER_URL     = 'https://api.openai.com/v1/audio/transcriptions'
OpenAI          = max_completion_tokens
Claude          = max_tokens
api_logs        = input_tokens / output_tokens (NOT prompt/completion, NO total_tokens column)
CRITICAL: always await supabase inserts — silent failures are the #1 logging bug
CRITICAL: KAV must have backgroundColor:'#fff' — prevents channel colour bleeding behind keyboard
CRITICAL: Send button is #FF4545 coral across ALL channels — never the channel AI colour
```

---

## What's been built (as of 30 Mar 2026)

### index.tsx — Home channel ✅ COMPLETE
- Splash (3s aqua bg) → Home channel
- Fixed top bar: zaeli 40px (sky blue ai letters) + "Home" + Rich avatar
- DEV: 📅 button → Calendar (remove pre-launch)
- DM Serif 28px hero with [italic highlights] + Poppins 17px follow-up
- GPT returns `{"hero":"[brackets]","detail":"prose","replies":["..."]}`
- Cycling placeholder. Mic 26px blush → WaveformBars recording. Send coral #FF4545.
- Tool-calling: add/update/delete events, todos, shopping items
- Whisper voice → auto-send. API logging working.
- Chat render: star eyebrow (sky blue square), 17px text, Play/Copy/Forward/ThumbUp/ThumbDown

### calendar.tsx — Calendar channel ✅ COMPLETE (Session 22)
- **Banner**: two-row mint `#B8EDD0` — Row 1: wordmark + Calendar + avatar, Row 2: Day/Month toggle
- **Day strip**: 7 days back + 120 forward, auto-scrolls today left, Poppins 700 Bold numbers
- **Event cards**: 18% tint, auto-emoji (40+ keywords), coloured time, dynamic avatars
- **Month view**: tap date → events below grid
- **Tool-calling**: Sonnet, self-contained, assignees array with family shortcuts
- **Mic**: wired — record → Whisper → auto-send → logged
- **"View events" pill**: white frosted, bottom-right, keyboard-aware
- **API logging**: confirmed working in admin dashboard

### Admin dashboard ✅ Working
- URL: https://incomparable-gumdrop-32e4ba.netlify.app
- Shows: home_brief, calendar_chat, whisper_transcription all confirmed

### Other channels — functional, need colour refactor
- shopping.tsx, mealplanner.tsx

### Tutor — ✅ FULLY DESIGNED 30 Mar 2026 (needs rebuild to new spec)
- Complete 11-screen design in `zaeli-tutor-final-mockup-v4.html`
- Curriculum map in `zaeli-tutor-curriculum-map-v1.html`
- Existing tutor.tsx / tutor-child.tsx / tutor-session.tsx / tutor-practice.tsx / tutor-reading.tsx are OLD — need full rebuild

### Not yet built
- kids.tsx (design session needed first)
- todos.tsx, notes.tsx, travel.tsx
- family.tsx (design session needed first — holds Tutor progress view)

---

## Supabase schema notes
```sql
-- all_day column added Session 22:
alter table events add column all_day boolean default false;

-- notes stores both notes and location:
-- format: "notes text | location text"
-- split on ' | ' to separate them

-- Tutor sessions table (new — to be created):
-- tutor_sessions: family_id, child_id, subject, pillar, messages (jsonb),
--   difficulty_band, duration_seconds, hints_used (jsonb), title, created_at
```

---

## Architecture (LOCKED)
**No navigation UI.** Zaeli is the only navigation. Avatar → Settings/Billing/Our Family/Tutor.
**Portal pills:** Destination channel bg colour + accent chevron → renders data inline.
**Quick reply chips:** White bg, ink border — conversation only.
**Tutor:** Premium. Avatar menu only. A$9.99/child/month.
**Kids Hub:** Family plan (NOT premium). Kids' space for jobs, rewards, games.
**Our Family:** Avatar menu. Parent hub. Holds Tutor progress view.

---

## Immediate next steps (build chat)

**1. Home inline calendar render — discuss approach first:**
- When Zaeli in Home chat returns calendar data, EventCards render inline in the thread
- Same EventCard component as Calendar channel
- Portal pill "See full calendar →" below cards (mint bg `#B8EDD0`)
- Trigger: GPT detects calendar query → returns structured response with event data

**2. Shopping channel colour refactor** — `#F0E880` bg / `#D8CCFF` Lavender ai colour

**3. Meals channel colour refactor**

---

## Design sessions queued (this design chat)

**Kids Hub channel:**
- Jobs/chores with reward points
- Rewards redemption
- Fun educational games (crossword, Wordle-style)
- NOT AI tutoring — completely separate from Tutor
- Colour: `#A8E8CC` bg / `#FAC8A8` peach

**Our Family channel:**
- Family profiles and member management
- Tutor progress per child (lives here, not in Tutor — keeps Tutor feeling like child's space)
- Parent-authenticated session transcripts
- Settings and billing
- Colour: `#F0C8C0` bg / `#D8CCFF` lavender

---

## Tutor module — key decisions locked 30 Mar 2026

Full spec in ZAELI-PRODUCT.md. For build context:

**AI split:** GPT-5.4-mini for conversation, Sonnet for photos, Whisper for voice.

**6 pillars:** Homework, Practice, Read Aloud, Write & Review, Comprehension, Money & Life.

**Adaptive difficulty:** Foundation / Core / Extension bands. Silent adjustment. Kids never see the label.

**Hint system:** 3 levels. 25/75 split pill pinned above chat bar. Hint 1 = different equation technique. Hint 2 = first step only. Hint 3 = full worked example.

**Parent review split:**
- In Tutor (child accessible): simple session summary only
- In Tutor (parent authenticated): full transcript + hints per question
- Full progress view → Our Family only

**Curriculum:** Australian Curriculum v9.0. See curriculum map file. Year 1 ≠ Foundation — they have different content.

**Money & Life:** 4 progressive levels. Amber `#F59E0B` session colour. Real Australian examples (ANZ, ASX, super).

---

## Critical coding rules
- `router.navigate()` only — NEVER push() or replace()
- Date: local construction only — NEVER toISOString() (UTC/AEST shift)
- Events table: `start_time` NOT `time`
- SafeAreaView: `edges={['top']}` always
- Image picker: `['images'] as any`
- KAV → `backgroundColor:'#fff'` → contentWrap (relative) → ScrollView + inputArea (absolute)
- Full file rewrites only — never partial diffs
- Always await supabase inserts
- Send button = `#FF4545` coral always — never channel AI colour

---

## Tech reminders
- `npx expo start --dev-client` after every change
- Import paths from `app/(tabs)/`: `../../lib/supabase`
- Supabase: `rsvbzakyyrftezthlhtd` (Sydney, ap-southeast-2)
- Admin: drag `C:\Users\richa\Downloads\index.html` to Netlify

---

**Start by confirming you've read CLAUDE.md and ZAELI-PRODUCT.md. Then ask me to upload the file we're editing before making any changes.**
