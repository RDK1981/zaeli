# CLAUDE.md — Zaeli Project Context
*Last updated: 17 March 2026 — Session 7 (Cost Optimisation)*

---

## Who You Are Talking To
- **Richard** — beginner developer. Always give **full file rewrites**, easy copy-paste PowerShell commands, step by step. No partial diffs.
- Family: Anna (logged-in user), Richard, Poppy (12), Gab (10), Duke (8)
- Local path: `C:\Users\richa\zaeli` (Windows, PowerShell — no `&&` chaining)
- Repo: https://github.com/RDK1981/zaeli (private)

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
DUMMY_FAMILY_ID  = '00000000-0000-0000-0000-000000000001'
DUMMY_MEMBER_NAME = 'Anna'
SONNET = 'claude-sonnet-4-20250514'
HAIKU  = 'claude-haiku-4-5-20251001'
```

---

## Model Routing (CRITICAL — cost architecture)
All API calls go through `callClaude()` in `lib/api-logger.ts`.

| Feature | Model | Why |
|---|---|---|
| `home_brief` | Haiku | Simple structured output |
| `chat_greeting` | Haiku | Short, low-stakes |
| `zaeli_chat` turn 0 — pure action msg | Haiku | Add/book/complete only |
| `zaeli_chat` turn 0 — conversational | Sonnet | Needs warmth/reasoning |
| `zaeli_chat` turns 1+ (tool loop) | Haiku | Stripped prompt, cheap |
| `calendar_brief` | Haiku | Simple structured output |
| `shopping_brief` | Haiku | Simple structured output |
| `receipt_scan` | Sonnet | Vision + structured extraction |
| Homework (future) | Sonnet always | Reasoning quality critical |

**selectModel() logic** in `zaeli-chat.tsx`:
- ≤2 words → Haiku
- Emotional/planning/recipe/advice keywords → Sonnet
- Short pure action phrases ("add milk", "book soccer", "yes") → Haiku
- Ambiguous → Sonnet (safety default)

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
| `app/(tabs)/zaeli-chat.tsx` | ✅ Live | Single chat, smart model routing, history cap 12 |
| `app/(tabs)/mealplanner.tsx` | ✅ Live | Dinners/Recipes/Favourites v4.1 |
| `app/(tabs)/more.tsx` | ✅ Live | Hub + Settings + To-dos |
| `app/components/NavMenu.tsx` | ✅ Live | Hamburger nav, all screens |

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
- SafeAreaView always `edges={['top']}`
- No floating FAB anywhere
- Logo on every screen taps → home (`router.replace('/(tabs)/')`)
- Edit modals lifted out of parent Modal (iOS pageSheet stacking bug)
- PowerShell: no `&&` — use separate lines
- Always `npx expo start --clear` after copying files
- Full file rewrites only — never partial diffs for Richard

---

## API Cost Architecture (Session 7 fixes applied)

**Achieved cost per family/month at typical usage (~150 msgs):**
- Before Session 7: ~$10–15/month (unsustainable)
- After Session 7: ~$2–3/month (76% margin at $15 AUD plan)

**Three fixes applied this session:**
1. **Context compression** — replaced `JSON.stringify` blobs with compact named summaries (~60% token reduction per call)
2. **Tool loop stripped prompt** — turns 2+ use 150-token system prompt instead of 8,000 token full context
3. **home_brief double-fire guard** — `briefGenRef` boolean prevents duplicate API calls on mount

**Smart context loading** (already in place from Session 6):
- Events/tasks always loaded
- Shopping only loaded if `shopKw` matches
- Pantry only loaded if `pantryKw` or shopping matches
- Meals/recipes/menus only loaded if `mealKw` matches

**History cap:** 12 messages (6 exchanges). Was 6 — increased to prevent mid-conversation context loss.

**Observed token counts after fixes:**
- Chat turn avg: ~3,640 input (was 8,000–16,000)
- home_brief: ~1,337 input (was 4,305, now fires once)
- Cost per chat call: ~$0.013 (was $0.033)

---

## Admin Dashboard
- **URL:** https://incomparable-gumdrop-32e4ba.netlify.app
- Shows real-time API usage, costs by feature, financial model
- Supabase `api_logs` table active
- Redeploy: PowerShell key injection → drag `zaeli-admin` folder to Netlify

---

## Pricing (locked)
| Plan | Price AUD | Notes |
|---|---|---|
| Family plan | $15/month | Calendar, shopping, meals, todos, notes, kids jobs |
| Homework add-on | $10/child/month | Socratic method, Grade-aware |
| Lunchboxes | SCRAPPED | — |
| Travel | Deferred v2 | — |

- Distribution: web-first (bypass App Store 15% cut), app free to download
- Trial: 7 days free, payment at zaeli.app
- At 1,000 families (60% homework): ~$7.6k USD/month profit, 51% margin

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
- NEVER say "I don't see any previous conversation" — ask warmly instead if context missing
- Editing events: always `update_calendar_event`, never add duplicate
- Recurring: weekly/fortnightly/monthly → `add_recurring_event`

---

## What's Next (priority order)
1. **Test Session 7 cost fixes** — run test session in AM, check dashboard vs $0.013/call baseline
2. **Homework platform** — Socratic method, Haiku quality test, Grade 6 maths confirmed working concept. Needs: subject detection, grade-aware prompting, 20-message history cap, always Sonnet
3. **Onboarding flow** — email capture, 7-day trial, zaeli.app signup
4. **Usage cap** — 500 AI interactions/month soft limit, throttle beyond (protects margin from power users)
5. **Batch API** — 50% discount for async calls (briefs, summaries) — Anthropic Batch API
6. **GitHub Actions** — auto-deploy admin dashboard
7. **Travel screen** stub

---

## Known Issues / Watch List
- Zaeli occasionally forgets context mid-session if conversation exceeds 12 messages — acceptable tradeoff, history cap raised from 6 to mitigate
- `selectModel()` keyword detection — monitor in prod for misroutes (Haiku getting conversational turns)
- home_brief double-fire — guarded with `briefGenRef` boolean, verify in dashboard after next session
