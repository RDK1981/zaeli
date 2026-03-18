# CLAUDE.md — Zaeli Project Context
*Last updated: 18 March 2026 — Session 9 (Whisper, GPT-5.4 mini toggle, brief caching, shopping search, usage cap)*

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
- OpenAI API — GPT-5.4 mini test mode + Whisper voice input
- expo-router (file-based routing)
- expo-av (~16.0.8) — audio recording for Whisper
- Poppins font (all UI), DMSerifDisplay (hero titles only)
- No bottom tab bar — hamburger menu only navigation

---

## Key Constants
```ts
DUMMY_FAMILY_ID   = '00000000-0000-0000-0000-000000000001'
DUMMY_MEMBER_NAME = 'Anna'
SONNET    = 'claude-sonnet-4-20250514'
HAIKU     = 'claude-haiku-4-5-20251001'
GPT5_MINI = 'gpt-5.4-mini'
AUD_TO_USD = 0.65
USD_TO_AUD = ~1.538
```

---

## AI Provider Toggle Architecture (CRITICAL)

### lib/zaeli-provider.ts
Shared state file — both `zaeli-chat.tsx` and `more.tsx` import from here.
```ts
export function getZaeliProvider(): 'claude' | 'openai'
export function setZaeliProvider(p: 'claude' | 'openai')
```
**Never import provider state from zaeli-chat.tsx directly — causes circular import errors.**

### Toggle behaviour
- **OFF (Claude mode):** Sonnet/Haiku blend for chat, Haiku for briefs
- **ON (GPT mode):** GPT-5.4 mini for ALL calls — chat AND briefs
- **Homework:** Always Claude Sonnet regardless of toggle (not yet built)
- Toggle lives in: More → Settings → scroll to bottom → AI Engine toggle

### callBrief() helper pattern
All three brief screens (index.tsx, calendar.tsx, shopping.tsx) use a `callBrief()` helper that checks `getZaeliProvider()` and routes to either `callClaude()` or OpenAI fetch.

### Known issues with GPT mode (to fix next session)
1. **Home brief JSON parse error** — GPT returns plain text but home brief expects JSON `{brief, cta, signoff}` format. Need to either prompt GPT to return JSON or update parser to handle plain text
2. **Chat 400 error** — OpenAI message format slightly wrong, needs debugging
3. **Shopping brief** — not working in GPT mode
4. **Brief-to-chat continuation** — not wired up for OpenAI path
5. **Persona tuning** — GPT sounds more corporate/American, needs stronger Zaeli persona prompting

---

## Model Routing
All Claude calls go through `callClaude()` in `lib/api-logger.ts`.
OpenAI calls use direct `fetch()` to `api.openai.com/v1/chat/completions`.

| Feature | Claude mode | GPT mode |
|---|---|---|
| home_brief | Haiku | GPT-5.4 mini |
| calendar_brief | Haiku | GPT-5.4 mini |
| shopping_brief | Haiku | GPT-5.4 mini |
| chat_greeting | Haiku | GPT-5.4 mini |
| zaeli_chat | Sonnet/Haiku blend | GPT-5.4 mini |
| receipt_scan | Sonnet vision | Sonnet vision (always) |
| whisper_transcription | OpenAI Whisper-1 | OpenAI Whisper-1 |
| Homework (future) | Sonnet always | Sonnet always |

**max_tokens:** Sonnet turn 0 = 1024, others = 600, greetings = 50

---

## Cost Comparison
| Model | Per msg (AUD) | 300 msgs/month | 1,000 msgs/month |
|---|---|---|---|
| Claude blend | A$0.022 | A$6.60 | A$22.00 |
| GPT-5.4 mini | A$0.003 | A$0.90 | A$3.00 |

**GPT-5.4 mini is ~7× cheaper.** At that cost, message caps are unnecessary and response length can be increased significantly.

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
| `app/(tabs)/index.tsx` | ✅ Live | Home, brief card (2hr cache), GPT/Claude routing |
| `app/(tabs)/calendar.tsx` | ✅ Live | Full calendar, brief (once/day 2am reset), GPT/Claude routing |
| `app/(tabs)/shopping.tsx` | ✅ Live | List/Pantry/Spend, search bars, 30-day Recently Bought, GPT/Claude routing |
| `app/(tabs)/zaeli-chat.tsx` | ✅ Live | Multi-channel, Whisper, usage cap, GPT/Claude toggle |
| `app/(tabs)/mealplanner.tsx` | ✅ Live | Dinners/Recipes/Favourites v4.2, no brief |
| `app/(tabs)/more.tsx` | ✅ Live | Hub + Settings + AI Engine toggle |
| `app/components/NavMenu.tsx` | ✅ Live | Hamburger nav |
| `lib/zaeli-provider.ts` | ✅ Live | Shared provider toggle state |

**Files that must NOT be in `app/(tabs)/`:**
- `api-logger.ts`, `zaeli-memory.ts`, `notifications.ts`, `zaeli-provider.ts` → all in `lib/`

---

## Brief Firing Architecture
| Screen | Fires when | Cache | GPT support |
|---|---|---|---|
| Home | Cold start / 2hr away | briefGenRef + 2hr threshold | ✅ via callBrief() |
| Calendar | Once per day | Module-level, 2am reset | ✅ via callBrief() |
| Shopping | Once per day | Module-level, 2am reset | ✅ via callBrief() |
| Meals | REMOVED | — | — |

---

## Usage Cap
- Soft warning at 450 zaeli_chat msgs/month
- Hard limit at 500 msgs/month (friendly message + reset date)
- Counts `zaeli_chat` rows in `api_logs` — briefs/greetings excluded
- If count fails → message goes through (never block on failed check)
- **Note:** At GPT-5.4 mini pricing, cap is less critical — consider raising to 2,000 or removing

---

## Whisper Voice Input
- Tap mic → magenta banner + pulsing dot
- Tap again → OpenAI Whisper transcription → text in input field
- Name correction: Xaeli/Zeily etc → "Zaeli"
- Key: `EXPO_PUBLIC_OPENAI_API_KEY` in `.env` — single unbroken line
- Cost: A$0.003 fixed per transcription

---

## Shopping Screen
- Search bars on List tab (above toolbar) + Pantry tab
- Both use `marginHorizontal: 16` to align with toolbar
- Recently Bought: last 30 days only, "+ X older items" toggle
- Pantry scan → Pantry only (not Recently Bought)
- Receipt scan → Pantry + Recently Bought

---

## Supabase Tables
```
events, todos, missions, shopping_items, pantry_items, receipts,
meal_plans, recipes, menus, family_members, api_logs
```

---

## Coding Rules
- SafeAreaView `edges={['top']}` for ALL screens EXCEPT `zaeli-chat.tsx`
- `zaeli-chat.tsx`: `edges={[]}` + `useSafeAreaInsets()` + `paddingTop: insets.top+8`
- No floating FAB anywhere
- Logo taps → home (`router.replace('/(tabs)/')`)
- Edit modals lifted out of parent Modal (iOS pageSheet stacking bug)
- PowerShell: no `&&` — use separate lines
- Always `npx expo start --clear` after copying files
- Full file rewrites only — never partial diffs for Richard

---

## Admin Dashboard
- **URL:** https://incomparable-gumdrop-32e4ba.netlify.app
- All costs in AUD — `fmt$()` converts USD→AUD
- Financial model: Claude blend vs GPT-5.4 mini toggle in Financial Model tab
- Redeploy: drag `zaeli-admin/index.html` (in Downloads/zaeli-admin/) to Netlify

---

## Pricing (under review)
| Plan | Price AUD | Notes |
|---|---|---|
| Family plan | TBD ($14.99 or $19.99) | Pending GPT test results |
| Homework add-on | $10/child/month | Always Claude Sonnet |

- If GPT-5.4 mini passes quality test → A$14.99 with no message cap
- If staying Claude → A$19.99 with no message cap (A$14.99 with cap)
- Goldee competitor charges A$8.99 but has very shallow AI

---

## What's Next (priority order)
1. **Fix GPT mode bugs** — JSON parse, 400 error, shopping brief, chat continuation
2. **Test GPT-5.4 mini properly** — 30min real use with toggle ON
3. **Tune Zaeli persona for GPT** — more enthusiastic, warmer, longer responses
4. **Finalise pricing decision** based on GPT test
5. **Homework module** — Socratic method, grade-aware, Sonnet, biggest revenue lever
6. **Kids Hub redesign** — jobs, rewards, homework
7. **Multi-user / family sync** — core retention requirement
8. **Website** (zaeli.app) — needed for trial signups
9. **Stripe + onboarding** — trial → paid conversion
10. **Push notifications**

---

## Known Issues / Watch List
- GPT mode: JSON parse on home brief, 400 on chat, shopping brief broken
- Date bug: substantially fixed — monitor in testing
- Usage cap: not easily testable without 450+ messages
- Whisper key must be single unbroken line in `.env`
