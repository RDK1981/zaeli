# CLAUDE.md — Zaeli Project Context
*Last updated: 25 March 2026 — Sessions 17-18 complete (Calendar time grid + chat bar)*

---

## Who You Are Talking To
- **Richard** — beginner developer. Always give **full file rewrites**, easy copy-paste PowerShell commands, one step at a time
- Never give partial diffs or targeted edits unless it's a single truly isolated line
- Always explain what you're doing in plain English before diving into code
- Family: Anna (logged-in user), Richard, Poppy (Yr6, age 12, girl), Gab (Yr4, age 10, BOY — Gabriel, always he/him), Duke (Yr1, age 8, boy)
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
- Homework add-on: A$9.99/child/month
- 100% web sales (no App Store cut)

**Unit economics (verified 21 Mar 2026):**
- GPT-4.1 mini chat: A$0.0037/msg
- Realistic family monthly API cost: ~A$1.50 → ~85% margin

---

## Zaeli Persona

Core: Anne Hathaway energy — smart, warm, magnetic.
- Australian warmth. NEVER "mate" or "guys"
- Never start with "I"
- No asterisks or markdown bold in spoken responses — plain text only
- NEVER sound like a push notification or task manager

---

## Stack
- React Native + Expo (iOS-first), dev build on iPhone 11 Pro Max (bundle ID com.zaeli.app)
- Supabase (Postgres, Sydney ap-southeast-2, ID: rsvbzakyyrftezthlhtd)
- Claude Sonnet 4.6 (`claude-sonnet-4-20250514`) — vision/scan only
- OpenAI GPT-4.1 mini (`gpt-4.1-mini`) — all chat/briefs/homework
- OpenAI Whisper-1 — voice transcription
- expo-router, expo-image-picker, react-native-svg
- Poppins font (UI), DMSerifDisplay (hero titles)
- No bottom tab bar — hamburger menu only

---

## Key Constants
```
DUMMY_FAMILY_ID = '00000000-0000-0000-0000-000000000001'
SONNET    = 'claude-sonnet-4-20250514'   ← CORRECT model string (NOT claude-sonnet-4-6)
GPT_MINI  = 'gpt-4.1-mini'
CRITICAL: OpenAI = max_completion_tokens. Claude = max_tokens. Never mix.
```

---

## Screen Status

| File | Status | Notes |
|---|---|---|
| index.tsx | Active development | Home chat, brief, mic, Anthropic tool-calling, calendar integration |
| calendar.tsx | Active development | Time grid, event CRUD via chat, scan upload, chat bar |
| shopping.tsx | Complete | Both mics, logging |
| mealplanner.tsx | Complete | GPT brief, mic |
| more.tsx | Complete | AI toggle (remove pre-launch) |
| tutor.tsx | Complete | Hub, kids list |
| tutor-child.tsx | Complete | Child zone |
| tutor-session.tsx | Complete | Homework Help |
| tutor-practice.tsx | Needs UX review | |
| tutor-reading.tsx | Needs UX review | |
| zaeli-chat.tsx | DEPRECATED | Replaced by index.tsx |

---

## Supabase Tables
```
events, todos, missions, shopping_items, pantry_items, receipts,
meal_plans, recipes, menus, family_members, api_logs, tutor_sessions
```

**Events table columns (critical):**
- `date` (YYYY-MM-DD)
- `start_time` (ISO 8601 local e.g. 2026-03-25T09:00:00) — NOT `time`
- `end_time` (ISO 8601 local)
- `assignees` (jsonb array of family member IDs)

---

## CANONICAL CHAT BAR SPEC
*Apply identically to every screen. Full detail in ZAELI-CHAT-BAR-SPEC.md*

### Structure
```
inputArea wrapper (position:absolute, bottom:0, transparent bg)
└── barPill (borderRadius:30, paddingV:14, paddingH:16, border:1, shadow)
    ├── barBtn (34×34) → IcoPlus (20×20 SVG)  ← screen-specific
    ├── barSep (1×18px, rgba(10,10,10,0.1))
    ├── TextInput (fontSize:15, Poppins_400Regular)
    ├── barBtn (34×34) → IcoMic (20×20 SVG)
    └── barSend (32×32, borderRadius:16, #FF4545) → IcoSend (16×16)
```

### Keyboard handling pattern
```
KAV (flex:1, behavior=padding, offset=0)
  └── contentWrap (flex:1, position:relative)
        ├── ScrollView
        └── inputArea (position:absolute, bottom:0)  ← keyboardOpen → inputAreaKb

inputArea:   { position:'absolute', bottom:0, left:0, right:0, paddingH:14, paddingBottom: iOS?30:18, paddingTop:10, bg:transparent }
inputAreaKb: { paddingBottom: iOS?8:6 }
contentWrap: { flex:1, position:'relative' }
```

---

## Tool-Calling System (index.tsx)

index.tsx uses Anthropic Claude with tools for all calendar/todo/shopping actions.

**Tools:** `add_calendar_event`, `update_calendar_event` (with `search_date`), `delete_calendar_event`, `add_todo`, `add_shopping_item`

**Critical rules:**
- `search_date` (YYYY-MM-DD) narrows update/delete to right occurrence
- When user gives both start AND end → pass both. Start only → omit end (duration preserved)
- System prompt contains today's date as `${td}` for "tomorrow" calculations
- Events context query uses `start_time` column (NOT `time`)
- Context fetches 20 events across 7-day window

---

## Calendar Architecture

- Time grid: 48px/hour, 0am-midnight, auto-scrolls to now-2hrs
- Family colours: Anna #FF7B6B, Rich #4D8BFF, Poppy #A855F7, Gab #22C55E, Duke #F59E0B
- Calendar accent: Electric Red Coral #E8374B
- Navigation: `router.navigate()` only — never push (stacks) or replace (crashes modals)
- CalendarChatBar: module-level `calendarChatSubmitRef` links typed text to send button

---

## Coding Rules
- SafeAreaView edges={['top']} always
- No floating FAB
- Logo taps = router.navigate('/(tabs)/')
- PowerShell: no && — separate lines
- Always npx expo start --dev-client after changes
- Image picker: use `['images'] as any` not deprecated MediaTypeOptions.Images
- Date: always local date construction — NEVER toISOString() (UTC shifts in AEST)

---

## Next Priorities

**Immediate:**
1. Verify calendar CRUD all working (add/update/delete events via voice and text)
2. Verify photo scan → vision → event creation end-to-end
3. Day strip scroll position fix

**Short-term:**
4. tutor-practice.tsx UX review
5. tutor-reading.tsx UX review
6. Home brief quality pass (zaeli-brief-logic-spec.md)

**Medium-term:**
7. To-dos screen (stub in more.tsx)
8. ElevenLabs voice playback
9. Website + Stripe + onboarding

**Pre-launch:**
10. Remove AI toggle, replace DUMMY_FAMILY_ID with real auth
