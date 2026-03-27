# Zaeli — New Chat Handover
*27 March 2026 — Session 22 complete. Copy this entire file to start a new chat.*

---

## Hi! Continuing development of Zaeli.

Zaeli is an iOS-first AI family life platform built in React Native / Expo. Please read **CLAUDE.md** before we start — full stack, architecture, colours, chat bar spec, coding rules. Then **ZAELI-PRODUCT.md** for product vision and design decisions.

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
```

---

## What's been built (as of 27 Mar 2026)

### index.tsx — Home channel ✅ COMPLETE (Session 20)
- Splash (3s aqua bg) → Home channel
- Fixed top bar: zaeli 40px (sky blue ai letters) + "Home" + Rich avatar
- DEV: 📅 button → Calendar (remove pre-launch)
- DM Serif 28px hero with [italic highlights] + Poppins 17px follow-up chat message
- GPT returns `{"hero":"[brackets]","detail":"prose","replies":["..."]}`
- Cycling placeholder. Mic 26px blush → WaveformBars when recording. Send sky blue.
- Tool-calling: add/update/delete events, todos, shopping items
- Whisper voice → auto-send. API logging working.
- Chat render: star eyebrow (sky blue square), 17px text, Play/Copy/Forward/ThumbUp/ThumbDown icon row

### calendar.tsx — Calendar channel ✅ COMPLETE (Session 22)
- **Banner**: two-row mint `#B8EDD0` — Row 1: wordmark + Calendar + avatar, Row 2: Day/Month toggle
- **Day strip**: 7 days back + 120 forward, auto-scrolls to today left edge, Poppins 700 Bold numbers
- **Fixed divider**: banner + strip always pinned
- **Event cards**: 18% tint, auto-emoji (40+ keywords), coloured time text, right-side dynamic avatars (1-2: 28px col, 3: 24px col, 4+: 22px 2-col wrap), location "📍" below time
- **Month view**: Poppins numbers, tap date → events below grid, month name Poppins Bold
- **EventDetailModal**: view shows location + notes separately; edit has location field
- **Zaeli opening prompt**: seeded as real message on mount — context-aware (0/1/3+ events, conflict)
- **Tool-calling**: Sonnet, self-contained Option A, assignees array with family shortcuts
- **Past-date rules**: Zaeli flags scheduling to past, photo scans flagged if date passed
- **Mic**: fully wired — record → Whisper → auto-send → logged as whisper_transcription
- **Chat render**: matches Home exactly — star eyebrow (blush), 17px text, icon rows
- **Scroll-down arrow**: dark circle, animated fade (replicated from Home)
- **"View events" pill**: white frosted, bottom-right, keyboard-aware position
- **API logging**: calendar_chat + whisper_transcription confirmed working in admin dashboard

### Admin dashboard (index.html) ✅ Working
- URL: https://incomparable-gumdrop-32e4ba.netlify.app
- Shows: home_brief, calendar_chat, whisper_transcription all confirmed logging
- Feature colours: blue=home, green=calendar, orange=whisper, pink=vision

### Other channels — functional, need colour refactor
- shopping.tsx, mealplanner.tsx

### Tutor — needs UX review
- tutor.tsx, tutor-child.tsx, tutor-session.tsx, tutor-practice.tsx, tutor-reading.tsx

### Not yet built
- kids.tsx, todos.tsx, notes.tsx, travel.tsx, family.tsx

---

## Supabase schema notes
```sql
-- all_day column added Session 22:
alter table events add column all_day boolean default false;

-- notes stores both notes and location:
-- format: "notes text | location text"
-- split on ' | ' to separate them
```

---

## Architecture (LOCKED)
**No navigation UI.** Zaeli is the only navigation. Avatar → Settings/Billing/Our Family/Tutor.
**Portal pills:** Destination channel bg colour + accent chevron → renders data inline.
**Quick reply chips:** White bg, ink border — conversation only.
**Tutor:** Premium. Avatar menu only. A$9.99/child/month.

---

## Immediate next steps (Session 23)

**1. Home inline calendar render — discuss approach first:**
- When Zaeli in Home chat returns calendar data, EventCards render inline in the thread
- Same EventCard component as Calendar channel
- Portal pill "See full calendar →" below cards (mint bg `#B8EDD0`)
- Trigger: GPT detects calendar query → returns structured response with event data
- Scope: today + next 2-3 days max inline

**2. Shopping channel colour refactor** — `#F0E880` bg / `#D8CCFF` Lavender ai colour

**3. Meals channel colour refactor**

**4. New channels** — kids, todos, notes, travel, family (design before code each one)

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

---

## Tech reminders
- `npx expo start --dev-client` after every change
- Import paths from `app/(tabs)/`: `../../lib/supabase`
- Supabase: `rsvbzakyyrftezthlhtd` (Sydney, ap-southeast-2)
- Admin: drag `C:\Users\richa\Downloads\index.html` to Netlify

---

**Start by confirming you've read CLAUDE.md and ZAELI-PRODUCT.md. Then ask me to upload the file we're editing before making any changes.**
