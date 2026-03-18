# CLAUDE.md — Zaeli Project Context
*Last updated: 18 March 2026 — Session 8 (Bug Fixes + Cost Verification)*

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
- expo-router (file-based routing)
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
| `chat_greeting` | Haiku | Short, low-stakes, 30 word limit |
| `zaeli_chat` turn 0 — pure action msg | Haiku | Add/book/complete only |
| `zaeli_chat` turn 0 — conversational | Sonnet | Needs warmth/reasoning |
| `zaeli_chat` turns 1+ (tool loop) | Haiku | Stripped prompt, cheap |
| `calendar_brief` | Haiku | Simple structured output |
| `shopping_brief` | Haiku | Simple structured output |
| `receipt_scan` | Sonnet | Vision + structured extraction |
| Homework (future) | Sonnet 70% + Haiku 30% | Reasoning quality critical |

**selectModel() logic** in `zaeli-chat.tsx`:
- ≤2 words → Haiku
- Emotional/planning/recipe/advice keywords → Sonnet
- Short pure action phrases ("add milk", "book soccer", "yes") → Haiku
- Ambiguous → Sonnet (safety default)

**max_tokens:**
- Sonnet turn 0: 1024 (was 600 — caused crash at message 11-12)
- All other turns: 600
- Greetings/briefs: 120

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
| `app/(tabs)/index.tsx` | ✅ Live | Home, brief card, tiles, radar, Ask Zaeli bar |
| `app/(tabs)/calendar.tsx` | ✅ Live | Full calendar, add/edit/recurring events, brief card |
| `app/(tabs)/shopping.tsx` | ✅ Live | List/Pantry/Spend tabs, receipt scan, pantry sync |
| `app/(tabs)/zaeli-chat.tsx` | ✅ Live | Multi-channel chat, smart routing, week dates map, status bar fix |
| `app/(tabs)/mealplanner.tsx` | ✅ Live | Dinners/Recipes/Favourites v4.2 — dessert + ingredients fixes |
| `app/(tabs)/more.tsx` | ✅ Live | Hub + Settings + To-dos |
| `app/components/NavMenu.tsx` | ✅ Live | Hamburger nav, all screens |

**IMPORTANT — files that must NOT be in `app/(tabs)/`:**
- `api-logger.ts` → lives in `lib/`
- `zaeli-memory.ts` → lives in `lib/`
- `notifications.ts` → lives in `lib/`
- `.md` files, `.html` files → never in `app/(tabs)/`

---

## Supabase Tables (all active)
```
events          — calendar events (recurring supported)
todos           — tasks / to-dos
missions        — kids tasks / chores
shopping_items  — shopping list (checked = Recently Bought)
pantry_items    — pantry inventory with stock levels
receipts        — scanned receipts with items JSON
meal_plans      — dinner plan by day_key (YYYY-MM-DD)
recipes         — saved recipes / favourites
menus           — saved venue menus with dishes
family_members  — family roster
api_logs        — API usage tracking (cost dashboard)
```

**Critical Supabase rules:**
- `.single()` throws on no result — always use `.limit(1)` + `data?.[0]`
- `meal_plans.planned_date` has `default current_date` — always include in inserts
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

## API Cost Architecture (Verified Session 8)

**Verified numbers (18 March 2026):**
| Metric | Value |
|---|---|
| Avg input tokens/chat call | ~3,000 |
| Avg cost/chat call | A$0.022 |
| Full test day (119 calls) | A$1.93 |
| home_brief | A$0.007 each |
| 300 msgs/month projected | A$6.60 API cost |
| Margin at A$15 plan | **56%** |
| Families to A$10k/month | **1,046** |

**All cost fixes applied:**
1. Smart context loading (mealKw/shopKw/pantryKw intent detection)
2. Haiku for all briefs and greetings
3. History cap at 12 messages
4. `meal_plans` always loaded regardless of keywords
5. home_brief double-fire fixed (`briefGenRef` guard)
6. Tool echo suppression
7. max_tokens raised to 1024 for Sonnet turn 0
8. Error boundary in catch
9. `loopSystem` includes `weekDates`
10. Greeting word limit: 30 words max

---

## Date Bug — Root Cause + Fix (CRITICAL)

**Root causes:**
1. `new Date('YYYY-MM-DD')` parses UTC midnight → AEST shifts day back by 1
2. Zaeli generating ISO timestamps herself instead of using context dates
3. `loopSystem` didn't include week dates (lost context on tool loop turns)

**Fix in `zaeli-chat.tsx`:**
- Week map: `new Date(y, m-1, d)` constructor, format `Sunday=2026-03-22, Monday=2026-03-23...`
- Injected into BOTH `systemPrompt` (as `CRITICAL DATES` block) AND `loopSystem`
- CAPABILITY_RULES: "copy date from WEEK DATES verbatim — never add or subtract days"
- `meal_plans` always loaded regardless of keywords

**Fix in `mealplanner.tsx`:**
- `fmtMeals` uses `new Date(y, mo-1, d)` not `new Date('YYYY-MM-DD')`

---

## Mealplanner — Architecture Notes (v4.2)

**Dessert handling:**
- `AddMealModal` has `targetMealType?:string` → `saveToDb` uses `targetMealType || 'dinner'`
- Dessert slot onPress: existing dessert → `setDetailMeal` (view detail), empty → `setAddDay({mealType:'dessert'})`
- Tool description: always `meal_type:'dessert'` for desserts, never 'dinner'

**Ingredients/method in Dinners view:**
- `MealDetailModal` uses `effectiveNotes = meal.notes || recipeNotes`
- `recipeNotes`: fetched from `recipes` table by name when `meal.ingredients` empty and `meal.notes` empty
- `add_meal_plan` tool saves `Ingredients:\n...\nMethod:\n...` to notes field

---

## Zaeli Chat — Channel Architecture
Channels: General / Calendar / Shopping / Meals / Kids / Travel

Each has dedicated system prompt + seed hints. Meals channel loads recipe context.

**Recipe knowledge:** Zaeli provides recipes from training knowledge — no Spoonacular yet. Prompts say "provide recipes directly and confidently without mentioning search limitations."

---

## Admin Dashboard
- **URL:** https://incomparable-gumdrop-32e4ba.netlify.app
- All costs in AUD — `fmt$()` converts USD→AUD, `fmtAUD()` for financial model
- Kids Hub + Whisper sliders, break-even to A$10k/month milestone
- Alert thresholds: warn A$3, flag A$8 per family/month
- Redeploy: drag `zaeli-admin/index.html` to Netlify drop

---

## Pricing (locked)
| Plan | Price AUD | Notes |
|---|---|---|
| Family plan | $15/month | Calendar, shopping, meals, todos, notes, kids jobs |
| Homework add-on | $10/child/month | Socratic method, grade-aware, Sonnet |
| Lunchboxes | SCRAPPED | — |
| Travel | Deferred v2 | — |

- Distribution: web-first (bypass App Store 15% cut), app free to download
- Trial: 7 days free, payment at zaeli.app
- At 1,046 families (60% homework): A$10k/month profit

---

## Zaeli Persona (brief summary)
- Warm, brilliant, Australian. The switched-on friend who noticed three things before anyone asked.
- Never robotic. Never vague. Never naggy.
- Brief structure: Callback → What's coming → What's slipping → The offer
- Always ends with one specific question + matching CTA button
- Bold **names, times, deadlines** only — max 3 per brief
- Never starts with "I". Max 4 sentences.
- 12-hour time always (9:30 am not 09:30)

Full brief logic spec: `/mnt/project/zaeli-brief-logic-spec.md`

---

## Capability Rules (Zaeli — hard limits)
- CANNOT make phone calls
- CANNOT send messages/emails/texts autonomously — can DRAFT only
- CANNOT set phone reminders — calendar entry IS the reminder
- CAN: add/update/delete calendar events, todos, shopping items, meal plans
- NEVER say "I don't see any previous conversation" — ask warmly instead
- Editing events: always `update_calendar_event`, never add duplicate
- Recurring: weekly/fortnightly/monthly → `add_recurring_event`
- DATES: copy EXACTLY from WEEK DATES lookup — never calculate or guess
- DESSERTS: always `meal_type:'dessert'` — never 'dinner' for a dessert

---

## What's Next (priority order)
1. **Test date fix** — add meals/events for specific named days, confirm correct dates
2. **Home brief wrong context** — may self-resolve after date fix
3. **Homework helper** — Socratic method, grade-aware, Sonnet 70%/Haiku 30%, 20-msg history
4. **Kids Hub redesign** — jobs, rewards, homework in one place
5. **Usage cap** — 500 msgs/month soft limit with friendly UI
6. **Onboarding flow** — email capture, 7-day trial, zaeli.app signup
7. **Spoonacular** — pantry matching, nutritional data
8. **Travel screen** stub

---

## Known Issues / Watch List
- Date bug: substantially fixed — monitor Saturday/Sunday events in testing
- Ingredients/method: `MealDetailModal` falls back to `recipes` table — verify with new Zaeli-added meals
- `selectModel()` keyword detection — monitor for misroutes
- home_brief double-fire — guarded with `briefGenRef`, stable in Session 8
