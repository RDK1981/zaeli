# CLAUDE.md — Zaeli Project Context
*Last updated: 24 March 2026 — Session 17 complete*

---

## Who You Are Talking To
- **Richard** (goes by Rich) — beginner developer. Always give **full file rewrites**, easy copy-paste PowerShell commands, one step at a time
- Never give partial diffs or targeted edits unless it's a single truly isolated line
- Always explain what you're doing and why in plain English before diving into code
- Family: Anna, Rich, Poppy (Yr6, age 12, girl), Gab (Yr4, age 10, BOY — Gabriel, always he/him), Duke (Yr1, age 8, boy)
- Local path: `C:\Users\richa\zaeli` (Windows, PowerShell — no && chaining)
- Repo: https://github.com/RDK1981/zaeli (private)
- Copy files using: `Copy-Item "C:\Users\richa\Downloads\file.tsx" "C:\Users\richa\zaeli\app\(tabs)\file.tsx"`
- Full file rewrites only — never partial diffs
- Design before code — always discuss/mockup new screens before writing code
- **HTML mockup first, always** — agree on design in HTML, then write React Native once against that target

---

## The Business

Zaeli is an iOS-first AI family life platform for Australian families with children. Target: dual-income couples with primary school-aged children in metro areas.

**Revenue model:**
- Family plan: A$14.99/month
- Homework add-on: A$9.99/child/month
- 100% web sales (no App Store cut)

**Unit economics (verified 21 Mar 2026):**
- GPT-5.4 mini chat: A$0.0037/msg
- GPT-5.4 mini brief: A$0.002/call
- Claude Sonnet 4.6 vision scan: A$0.03/receipt
- Realistic family monthly API cost: ~A$1.50 → ~85% margin

---

## Zaeli Persona

Core: Anne Hathaway energy — smart, warm, magnetic.
- Australian warmth. NEVER "mate" or "guys"
- Never start with "I"
- No asterisks or markdown bold in spoken responses — plain text only
- NEVER sound like a push notification or task manager
- Always time-aware — knows exact date, day, time
- Late night (9pm+): focus on tomorrow, acknowledge the hour naturally
- **NEVER end on a bare open question** like "What do you need?" — always offer something specific first, then leave the door open
- Match the energy of what the user sent — if they're light and playful, stay there all the way through
- Never pivot to transactional mid-response

---

## Stack
- React Native + Expo SDK 54 (iOS-first)
- Supabase (Postgres, Sydney ap-southeast-2, ID: rsvbzakyyrftezthlhtd)
- Claude Sonnet 4.6 (`claude-sonnet-4-6`) — vision/scan only
- OpenAI GPT-5.4 mini (`gpt-5.4-mini`) — all chat/briefs/homework/greetings
- OpenAI Whisper-1 — voice transcription
- expo-router, expo-av, react-native-svg
- Poppins font (UI), DMSerifDisplay (hero titles)
- No bottom tab bar — hamburger menu only

---

## Key Constants
```
DUMMY_FAMILY_ID = '00000000-0000-0000-0000-000000000001'
SONNET    = 'claude-sonnet-4-6'
GPT_MODEL = 'gpt-5.4-mini'
MEMBER_NAME = 'Rich' (logged-in user)
CRITICAL: OpenAI = max_tokens. Claude = max_tokens.
expo-file-system: always import from 'expo-file-system/legacy' (SDK 54)
```

---

## Family Colour System (LOCKED — used everywhere)
```
Rich:  #4D8BFF  (blue)
Anna:  #FF7B6B  (coral)
Poppy: #A855F7  (purple)
Gab:   #22C55E  (green)
Duke:  #F59E0B  (amber)
```

---

## Screen Status

| File | Status | Notes |
|---|---|---|
| index.tsx | Complete | AI-first chat home, entry flow, mic, brief, calendar inline rendering |
| calendar.tsx | In progress | Design finalised in HTML mockup v4, needs full rewrite |
| shopping.tsx | Complete | Both mics, 100 items, logging |
| zaeli-chat.tsx | Complete | Legacy — will be removed once index.tsx handles everything |
| mealplanner.tsx | Complete | GPT brief, mic, logging |
| more.tsx | Complete | Hub + Settings |
| tutor.tsx | Complete | Hub, kids list |
| tutor-child.tsx | Complete | Child zone |
| tutor-session.tsx | Complete | Homework Help |
| tutor-practice.tsx | Built | Needs UX review |
| tutor-reading.tsx | Built | Needs UX review |
| voice-overlay.tsx | Complete | Mic entry → Zaeli chat |

---

## Supabase Tables
```
events, todos, missions, shopping_items, pantry_items, receipts,
meal_plans, recipes, menus, family_members, api_logs, tutor_sessions
```

**IMPORTANT — events table:**
```sql
ALTER TABLE events ADD COLUMN IF NOT EXISTS assignees jsonb DEFAULT '[]'::jsonb;
```
This column was added 24 March 2026. Required for family colour dots and avatars.

**api_logs columns:** `family_id, feature, model, input_tokens, output_tokens, cost_usd, created_at`
(NOT prompt_tokens/completion_tokens — those don't exist)

---

## Calendar Screen — Design Locked (Session 17)

### Colour
**Electric Red Coral `#E8374B`** — warm, electric, not pink. Used for header, today pill, toggle active, add button border, form accents.

### Design principles
- No left border on event blocks — tinted background only
- Person avatar letters (R, A, P, G, D) bottom-left of each event
- Event time in darker text (rgba 0,0,0,0.55)
- Family colour dots on day strip under dates with events
- Month view: multi-colour dots, family legend, tinted bubble preview (same style as day view)
- Floating chat bar: `+` · divider · "Chat with Zaeli…" · mic · send
- No brief card — removed entirely, Zaeli chat handles that

### Chat render
Calendar renders **identically** in Zaeli chat — same component, full width, zero wrapper or border added. What appears on the dedicated screen appears pixel-identically in chat.

### Event tap in chat (conversational edit flow)
1. Tap event → injects as user message → Zaeli responds with event summary and "What would you like to change?"
2. Quick replies: Time · Day · Who's coming · Title · Delete · Manual edit (last, faded)
3. Zaeli asks one question at a time — user answers in 1-2 taps
4. Done — updated event block appears inline in chat
5. "Manual edit" only opens the edit sheet as a last resort

### Event tap on dedicated screen
Tap → edit sheet slides up immediately (no conversational step needed)

### Mockup files (gospel — build from these)
- `/mnt/user-data/outputs/zaeli-calendar-v4.html` — definitive design reference

---

## Admin Dashboard
- URL: https://incomparable-gumdrop-32e4ba.netlify.app
- File: C:\Users\richa\Downloads\zaeli-admin\index.html
- Redeploy: drag zaeli-admin folder to Netlify
- Supabase anon key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...9ssTEwSxgY4B7nXxTEyKB3QDIoeCLh8yMo9jO-m5i-w`

---

## Dev Build
- Bundle ID: com.zaeli.app
- Apple Developer: V37VPTPKQ8 (RICHARD ANTHONY DE KRETSER Individual)
- Device: iPhone 11 Pro Max (UDID: 00008030-0019116E1AC1802E)
- Run: `npx expo start --dev-client` (NOT --clear)
- After every file copy: Ctrl+C then `npx expo start --dev-client` (R alone is not sufficient)
- New EAS build needed for: native changes (app.json, new packages, keyboard tint fix)

---

## Coding Rules
- SafeAreaView edges={['top']} always
- Floating input bars: `position: absolute`, `paddingBottom: Platform.OS === 'ios' ? 32 : 20`, transparent background, white pill with shadow
- ScrollView `paddingBottom` must be ≥110 to clear floating bar
- No floating FAB anywhere
- Logo taps = router.replace('/(tabs)/')
- PowerShell: no && — separate lines
- Keyboard: KeyboardAvoidingView behavior='padding'. NEVER use automaticallyAdjustKeyboardInsets alongside KAV.
- SVG icons: always react-native-svg components — never emoji for UI icons
- expo-file-system: import from `expo-file-system/legacy`
- After EVERY file copy: restart dev server with `npx expo start --dev-client`

---

## Next Priorities (as of 24 Mar 2026)

1. **calendar.tsx full rewrite** — from scratch against zaeli-calendar-v4.html mockup
   - Electric Red Coral #E8374B
   - No left border on events, tinted bg, avatars
   - Conversational edit flow in chat
   - Full borderless chat render
   - Day + Month toggle only (no Week)
   - Floating chat bar matching home screen exactly
2. **Real-time Supabase subscriptions** — calendar events sync live across Rich + Anna's phones
3. **New EAS build** — fix keyboard tint (tintColor already set in app.json)
4. **TestFlight build for Anna** — separate EAS profile
5. **Shopping list rich rendering** — same approach as calendar after calendar done
6. **Meal Planner screen** — connect to Supabase
7. **Pre-launch cleanup** — remove AI toggle, replace DUMMY_FAMILY_ID with real auth
