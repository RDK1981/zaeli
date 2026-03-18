# CLAUDE.md — Zaeli Project Context
*Last updated: 18 March 2026 — Session 9 (Whisper, Brief Caching, Shopping Search, Usage Cap)*

---

## Who You Are Talking To
- **Richard** — beginner developer. Always give **full file rewrites**, easy copy-paste PowerShell commands, step by step. No partial diffs.
- Family: Anna (logged-in user), Richard, Poppy (12), Gab (10), Duke (8)
- Local path: `C:\Users\richa\zaeli` (Windows, PowerShell — no `&&` chaining)
- Repo: https://github.com/RDK1981/zaeli (private)
- **PowerShell rule:** `(tabs)` folder needs backtick escaping: `app\`(tabs`)\filename.tsx`
- **Copy-paste rule:** Every PowerShell command and every Cursor find/replace block must be in its own separate copy-paste box

---

## Stack
- React Native + Expo (iOS-first)
- Supabase (Postgres) — auth, database, realtime
- Claude API — AI throughout (see model routing below)
- OpenAI Whisper API — voice input (`EXPO_PUBLIC_OPENAI_API_KEY` in `.env`, single line, no line breaks)
- expo-router (file-based routing)
- expo-av (~16.0.8) — audio recording for Whisper
- expo-file-system — NOT used (deprecated getInfoAsync removed)
- Poppins font (all UI), DMSerifDisplay (hero titles only)
- No bottom tab bar — hamburger menu only navigation

---

## Key Constants
```ts
DUMMY_FAMILY_ID   = '00000000-0000-0000-0000-000000000001'
DUMMY_MEMBER_NAME = 'Anna'
SONNET = 'claude-sonnet-4-20250514'
HAIKU  = 'claude-haiku-4-5-20251001'
AUD_TO_USD = 0.65
USD_TO_AUD = 1 / 0.65  // ~1.538
```

---

## Model Routing (CRITICAL — cost architecture)
All API calls go through `callClaude()` in `lib/api-logger.ts`.

| Feature | Model | Why |
|---|---|---|
| `home_brief` | Haiku | Simple structured output |
| `chat_greeting` | Haiku | Short, 50 token / 12 word limit |
| `zaeli_chat` turn 0 — pure action | Haiku | Add/book/complete only |
| `zaeli_chat` turn 0 — conversational | Sonnet | Needs warmth/reasoning |
| `zaeli_chat` turns 1+ (tool loop) | Haiku | Stripped prompt, cheap |
| `calendar_brief` | Haiku | Once per day, 2am reset |
| `shopping_brief` | Haiku | Once per day, 2am reset |
| `receipt_scan` | Sonnet | Vision + structured extraction |
| `whisper_transcription` | OpenAI Whisper-1 | Voice input, ~A$0.009/min |
| Homework (future) | Sonnet 70% + Haiku 30% | Reasoning quality critical |

**selectModel() logic** in `zaeli-chat.tsx`:
- ≤2 words → Haiku
- Emotional/planning/recipe/advice keywords → Sonnet
- Short pure action phrases → Haiku
- Ambiguous → Sonnet (safety default)

**max_tokens:**
- Sonnet turn 0: 1024
- All other turns: 600
- Greetings/brief continuation: 50

---

## Colours
```ts
blue:    '#0057FF'   // Home hero, primary CTA, Zaeli brief
mag:     '#E0007C'   // Calendar hero, Zaeli name accent, urgent
orange:  '#FF8C00'   // Meals hero
gold:    '#B8A400'   // To-dos
green:   '#00C97A'   // Success states
ink:     '#0A0A0A'   // Primary text
bg:      '#F7F7F7'   // App background
chatBg:  '#F4F6FA'   // Chat background
```

---

## Screens (all built)
| File | Status | Notes |
|---|---|---|
| `app/(tabs)/index.tsx` | ✅ Live | Home, brief card (2hr cache), tiles, radar, Ask Zaeli bar |
| `app/(tabs)/calendar.tsx` | ✅ Live | Full calendar, add/edit/recurring, brief (once/day 2am reset) |
| `app/(tabs)/shopping.tsx` | ✅ Live | List/Pantry/Spend, search bars, 30-day Recently Bought, brief (once/day) |
| `app/(tabs)/zaeli-chat.tsx` | ✅ Live | Multi-channel, Whisper voice, usage cap, week dates fix |
| `app/(tabs)/mealplanner.tsx` | ✅ Live | Dinners/Recipes/Favourites v4.2, NO brief (removed) |
| `app/(tabs)/more.tsx` | ✅ Live | Hub + Settings + To-dos, no brief |
| `app/components/NavMenu.tsx` | ✅ Live | Hamburger nav |

**IMPORTANT — files that must NOT be in `app/(tabs)/`:**
- `api-logger.ts` → lives in `lib/`
- `zaeli-memory.ts` → lives in `lib/`
- `notifications.ts` → lives in `lib/`
- `.md` files, `.html` files → never in `app/(tabs)/`

---

## Brief Firing Architecture (CRITICAL — cost control)

| Screen | Fires when | Cache |
|---|---|---|
| Home | Cold start / 2hr away | `briefGenRef` boolean, 2hr threshold |
| Calendar | Once per day | Module-level cache, resets at 2am |
| Shopping | Once per day | Module-level cache, resets at 2am |
| Meals | **REMOVED** | No API call on Meals screen open |
| More/To-dos | No brief | Never had one |
| Zaeli Chat | Greeting on channel open | Very cheap (A$0.0001), not cached |

**Cost impact:** Scenario of 15 app opens = 1 brief (not 15). Saves ~A$0.10/day for heavy users.

---

## Usage Cap (CRITICAL — margin protection)
Implemented in `zaeli-chat.tsx` `send()` function:
- Counts `zaeli_chat` rows in `api_logs` for current family + current month
- **Soft warning at 450:** tool-style banner shown above message, message still goes through
- **Hard limit at 500:** Zaeli blocks message, shows friendly reset date + hello@zaeli.app
- Briefs, greetings, receipt scans — do NOT count toward cap
- If count query fails → message goes through (never block on failed check)
- Reset: 1st of each month (count by `created_at >= first day of month`)

---

## Whisper Voice Input
Implemented in `zaeli-chat.tsx`:
- Tap mic → magenta banner + pulsing dot, solid magenta mic button
- Tap again → sends to OpenAI Whisper API → transcribed text drops into input field
- User reviews and taps send manually
- Name correction: Xaeli/Zeily/Zaily/Zeli/Saeli → corrected to "Zaeli" via regex
- Cost: fixed A$0.003 per transcription logged to `api_logs` as `whisper_transcription`
- Key: `EXPO_PUBLIC_OPENAI_API_KEY` in `.env` — MUST be single line, no line breaks
- Uses `expo-av` for recording — do NOT use `expo-file-system` (deprecated)

---

## Shopping Screen — Key Architecture
- **Search bars:** List tab (above toolbar) + Pantry tab (above toolbar), both use `marginHorizontal: 16` to align with toolbar
- **Recently Bought:** limited to last 30 days, older items hidden behind "+ X older items" button
- **Pantry scan → Pantry only** (not Recently Bought)
- **Receipt scan → Pantry + Recently Bought**
- **Food item ticked → auto-syncs to Pantry** (FOOD_CATEGORIES only, not Household/Other)

---

## Supabase Tables (all active)
```
events          — calendar events (recurring supported)
todos           — tasks / to-dos
missions        — kids tasks / chores
shopping_items  — shopping list (checked = Recently Bought, created_at used for 30-day filter)
pantry_items    — pantry inventory with stock levels
receipts        — scanned receipts with items JSON
meal_plans      — dinner plan by day_key (YYYY-MM-DD)
recipes         — saved recipes / favourites
menus           — saved venue menus with dishes
family_members  — family roster
api_logs        — API usage tracking (cost dashboard + usage cap source)
```

**Critical Supabase rules:**
- `.single()` throws on no result — always use `.limit(1)` + `data?.[0]`
- Date: always build as `YYYY-MM-DD` string from `new Date()`, never `toDateString()`
- Day names: always use `dayNames[now.getDay()]` array, never `toDateString()`

---

## Import Paths (from `app/(tabs)/`)
```ts
import { supabase } from '../../lib/supabase'
import { callClaude } from '../../lib/api-logger'
import { buildMemoryContext, saveConversation } from '../../lib/zaeli-memory'
import { HamburgerButton, NavMenu } from '../components/NavMenu'
```

---

## Coding Rules
- SafeAreaView `edges={['top']}` for ALL screens EXCEPT `zaeli-chat.tsx`
- `zaeli-chat.tsx`: `edges={[]}` + `useSafeAreaInsets()` + `paddingTop: insets.top+8` on header View
- No floating FAB anywhere
- Logo on every screen taps → home (`router.replace('/(tabs)/')`)
- Edit modals lifted out of parent Modal (iOS pageSheet stacking bug)
- PowerShell: no `&&` — use separate lines
- Always `npx expo start --clear` after copying files
- Full file rewrites only — never partial diffs for Richard

---

## API Cost Architecture (Verified Session 8/9)

| Metric | Value |
|---|---|
| Avg input tokens/chat call | ~3,000 |
| Avg cost/chat call | A$0.022 |
| Full test day (146 calls) | A$1.97 |
| home_brief | A$0.007 each |
| 300 msgs/month projected | A$6.60 API cost |
| Margin at A$15 plan | **56%** |
| Families to A$10k/month | **1,046** |

---

## Date Bug — Root Cause + Fix (CRITICAL)

**Root causes:**
1. `new Date('YYYY-MM-DD')` parses UTC midnight → AEST shifts day back by 1
2. Zaeli generating ISO timestamps herself instead of using context dates
3. `loopSystem` didn't include week dates

**Fix in `zaeli-chat.tsx`:**
- Week map built with `new Date(y, m-1, d)` constructor
- Format: `Sunday=2026-03-22, Monday=2026-03-23...`
- Injected into BOTH `systemPrompt` (as `CRITICAL DATES` block) AND `loopSystem`
- CAPABILITY_RULES: "copy date from WEEK DATES verbatim — never add or subtract days"

**Fix in `index.tsx`:**
- `DAY_NAMES` array declared BEFORE `evSummary` (was undefined — caused TypeError)
- `evSummary` includes day name with each event: `Sunday 2026-03-22`
- `weekDates` injected into brief context

---

## Mealplanner — Architecture Notes (v4.2)

**Dessert handling:**
- Dessert slot: existing → `setDetailMeal`, empty → `setAddDay({mealType:'dessert'})`
- Tool: always `meal_type:'dessert'`

**Ingredients/method:**
- `MealDetailModal` uses `effectiveNotes = meal.notes || recipeNotes`
- `recipeNotes` fetched from `recipes` table by name as fallback

**Brief:** REMOVED from Meals screen entirely.

---

## Admin Dashboard
- **URL:** https://incomparable-gumdrop-32e4ba.netlify.app
- All costs in AUD — `fmt$()` converts USD→AUD
- Alert thresholds: warn A$3, flag A$8 per family/month
- Redeploy: drag `zaeli-admin/index.html` to Netlify drop

---

## Pricing (locked)
| Plan | Price AUD | Notes |
|---|---|---|
| Family plan | $15/month | 500 AI msgs/month included |
| Homework add-on | $10/child/month | Socratic method, grade-aware |
| Lunchboxes | SCRAPPED | — |
| Travel | Deferred v2 | — |

---

## Zaeli Persona
- Warm, brilliant, Australian. Never robotic, vague, or naggy.
- Brief: Callback → Coming → Slipping → The offer
- Bold names/times/deadlines only — max 3. Never starts with "I". Max 4 sentences.
- 12-hour time (9:30 am not 09:30)

Full spec: `/mnt/project/zaeli-brief-logic-spec.md`

---

## Capability Rules (hard limits)
- CANNOT call/text/email autonomously — DRAFT only
- CANNOT set phone reminders — calendar IS the reminder
- DATES: copy EXACTLY from WEEK DATES — never calculate
- DESSERTS: always `meal_type:'dessert'`

---

## What's Next (priority order)
1. **Homework module** — Socratic method, grade-aware, Sonnet, biggest revenue lever
2. **Kids Hub redesign** — jobs, rewards, homework in one place
3. **Multi-user / family sync** — core retention requirement
4. **Website** (zaeli.app) — needed for trial signups
5. **Stripe + onboarding** — trial → paid conversion
6. **Push notifications** — reminders, meal prep, kids job nudges
7. **Privacy policy + T&Cs** — App Store + payment requirement

---

## Known Issues / Watch List
- Date bug: substantially fixed — monitor in testing
- Usage cap: not easily testable without 450+ messages — logic is simple, monitor via dashboard
- Whisper: key must be single line in `.env` — 401 error = key split or wrong key
- `selectModel()` — monitor for misroutes (Haiku getting conversational turns)
