# Zaeli — New Chat Handover
*26 March 2026 — Session 21 complete. Copy this entire file to start a new chat.*

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

## Key constants (CRITICAL)
```
DUMMY_FAMILY_ID = '00000000-0000-0000-0000-000000000001'
FAMILY_ID       = '00000000-0000-0000-0000-000000000001'
SONNET          = 'claude-sonnet-4-20250514'  ← NOT claude-sonnet-4-6
GPT_MINI        = 'gpt-5.4-mini'             ← NOT gpt-4.1-mini (retired Feb 2026)
OpenAI          = max_completion_tokens
Claude          = max_tokens
api_logs        = input_tokens / output_tokens (NOT prompt/completion, NO total_tokens column)
```

---

## What's been built (as of 26 Mar 2026)

### index.tsx — Home channel ✅ COMPLETE (Session 20)
- Splash (3s aqua bg, 96px wordmark, peach dots) → Home
- Fixed top bar: zaeli 40px (sky blue ai letters) + "Home" + Rich avatar 36×36
- DEV: 📅 button between label and avatar → navigates to Calendar (remove pre-launch)
- Scrollable brief: greeting + DM Serif 28px hero with [italic highlights] + sky blue pills
- GPT returns `{"hero":"[brackets]","detail":"prose","replies":["..."]}`
- Hero [brackets] → italic DM Serif. Brackets stripped from detail.
- Placeholder cycles 4s. Mic 26px blush. Send sky blue ink arrow.
- Tool-calling: add/update/delete events, todos, shopping items
- Whisper voice transcription. API logging working. Double-send guard.

### calendar.tsx — Calendar channel ✅ COMPLETE (Session 21)
- **Two-row banner** (mint `#B8EDD0`): Row 1 = wordmark + Calendar + avatar. Row 2 = Day/Month toggle
- **Day strip** (white bg, pinned): starts from TODAY, anchors left, 120 days forward
- **Fixed divider** — permanent scroll boundary, banner+strip never scroll
- **Event cards** (no time grid): clean tinted bg, title 18px, time 14px, avatars RIGHT 32×32
- **Conflict detection**: red tinted panel inline on card
- **Month view**: tap date → events below grid (no view switch). Toggle → Day jumps to date.
- **Zaeli opening prompt** on load (client-side, no API call):
  - 0 events: "Nothing locked in…"
  - 1 event: "Quiet one — just [title]…"
  - 3+ events: "[X] things on today…"
  - Conflict detected: leads with conflict + chips
- **One shared chat thread** across Day and Month views
- **Self-contained tool-calling** (Option A): add/update/delete calendar events
- **Photo scan** handled locally — no navigation to Home
- **"Ask Zaeli"** from + sheet: focuses chat bar with context prompt
- Send button: `#B8EDD0` mint, ink arrow. Mic: 26px blush pink.

### Admin dashboard (index.html) — Updated Session 21
- Feature badge colours: green=calendar, gold=shopping, pink=vision, orange=whisper
- Feature names recognised: home_brief, chat_response, calendar_chat, chat_vision, whisper_transcription

### Other channels — functional, need colour refactor
- shopping.tsx, mealplanner.tsx

### Tutor — needs UX review
- tutor.tsx, tutor-child.tsx, tutor-session.tsx, tutor-practice.tsx, tutor-reading.tsx

### Not yet built
- kids.tsx, todos.tsx, notes.tsx, travel.tsx, family.tsx

---

## Architecture (LOCKED — do not change without discussion)

**No navigation UI.** Zaeli is the only navigation. Avatar → Settings/Billing/Our Family/Tutor.
**Channel transitions:** No brief. Conversation flows. Background colour shifts.
**Portal pills:** Destination channel bg colour + accent chevron → renders data inline.
**Quick reply chips:** White bg, ink border — conversation only.
**Tutor:** Premium add-on. Avatar menu only. A$9.99/child/month.

---

## Immediate next steps (Session 22)

1. **Verify Session 21 fixes on device** — strip anchoring, font sizes, avatar right-side position
2. **Past-date prompt rule** — Zaeli must flag and confirm before scheduling/moving to past
3. **Photo scan past-date rule** — flag when scanned image date is in the past
4. **Location field** — display in EventCard + Add/Edit form fields
5. **Mic wiring** — connect calendar mic button to voice recording flow
6. **Admin logging** — investigate why calendar_chat not appearing in dashboard
7. **"View events" pill** — appears above chat bar when scrolled into chat; taps to scroll back up
8. **Shopping channel refactor** — apply `#F0E880` / `#D8CCFF` colour system

---

## Critical coding rules
- `router.navigate()` only — NEVER push() or replace()
- Date: local construction only — NEVER toISOString() (UTC/AEST shift)
- Events table: `start_time` NOT `time`
- SafeAreaView: `edges={['top']}` always
- Image picker: `['images'] as any`
- KAV → contentWrap (relative) → ScrollView + inputArea (absolute)
- Full file rewrites only — never partial diffs

---

## Tech reminders
- `npx expo start --dev-client` after every change
- Import paths from `app/(tabs)/`: `../../lib/supabase`
- Supabase: `rsvbzakyyrftezthlhtd` (Sydney, ap-southeast-2)
- Admin: drag `C:\Users\richa\Downloads\index.html` to Netlify

---

**Start by confirming you've read CLAUDE.md and ZAELI-PRODUCT.md. Then ask me to upload the file we're editing before making any changes.**
