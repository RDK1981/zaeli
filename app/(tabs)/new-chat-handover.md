## Zaeli App — New Chat Handover Brief
*18 March 2026 (Session 8) — copy this entire message to start a new chat*

---

Hi! I'm continuing development of the **Zaeli app** — a React Native / Expo iOS-first family life platform with AI (Claude API) at its core. We've been building this together across many sessions and I need you to pick up exactly where we left off.

---

### Who you are talking to
- My name is Richard. The app's logged-in user is Anna (my family: Anna, Richard, Poppy age 12, Gab age 10, Duke age 8)
- I'm a beginner developer — always give me **full file rewrites** with easy copy-paste PowerShell commands, one step at a time
- Always put PowerShell commands and Cursor find/replace blocks in their own separate copy-paste boxes
- PowerShell paths with `(tabs)` need backtick escaping: `app\`(tabs`)\filename.tsx`
- Local path: `C:\Users\richa\zaeli` (Windows, PowerShell — no `&&` chaining)
- Repo: https://github.com/RDK1981/zaeli (private)

---

### Where to find everything
**Master brief (CLAUDE.md):** `C:\Users\richa\zaeli\CLAUDE.md` — full stack, colours, family members, coding rules, all screen statuses. **Always read this first.**

**Key constants:**
- `DUMMY_FAMILY_ID = '00000000-0000-0000-0000-000000000001'`
- `DUMMY_MEMBER_NAME = 'Anna'`
- `SONNET = 'claude-sonnet-4-20250514'`
- `HAIKU  = 'claude-haiku-4-5-20251001'`
- `AUD_TO_USD = 0.65` / `USD_TO_AUD = 1/0.65 (~1.538)`

---

### What's been built (as of 18 March 2026)

✅ `index.tsx` — Home screen, brief card (Haiku), double-fire fix, Option C tiles
✅ `calendar.tsx` — Full calendar, add/edit/recurring events, brief card
✅ `shopping.tsx` — List/Pantry/Spend tabs, receipt scan, pantry sync
✅ `zaeli-chat.tsx` — Multi-channel chat, smart model routing, week dates map, status bar fix, recipe knowledge prompt
✅ `mealplanner.tsx` — Dinners/Recipes/Favourites v4.2 — dessert fix, recipe fallback for ingredients/method
✅ `more.tsx` — Hub + Settings + To-dos
✅ `lib/api-logger.ts` — callClaude() wrapper, model-aware pricing (lives in lib/ NOT app/(tabs)/)
✅ `lib/zaeli-memory.ts` — conversation memory
✅ `lib/notifications.ts` — reminder intent detection

---

### Admin Dashboard (LIVE)
- **URL:** https://incomparable-gumdrop-32e4ba.netlify.app
- All costs displayed in AUD throughout (`fmt$` helper converts USD→AUD)
- Financial model: all sliders, Kids Hub, Whisper, break-even to A$10k milestone
- Redeploy: drag `zaeli-admin/index.html` to Netlify drop

---

### Cost Architecture — VERIFIED STABLE (Session 8)

| Metric | Value |
|---|---|
| Avg input tokens/chat call | ~3,000 (was 8,000–16,000) |
| Avg cost/chat call | A$0.022 |
| Full test day (119 calls) | A$1.93 |
| home_brief cost | A$0.007 each |
| Projected 300 msgs/month | A$6.60 API cost |
| Revenue at A$15 plan | **56% margin** |
| Families to A$10k/month profit | **1,046** |

**Financial model assumptions:**
- Chat: 300 msgs/month · Homework: 150 msgs/child (Sonnet 70%/Haiku 30% = $0.0094/msg)
- Kids Hub: 50 interactions/child (Haiku) · Whisper: 10 mins/month
- Alert thresholds: warn A$3, flag A$8 per family/month

---

### Zaeli Chat — Critical Architecture Notes

**Week dates fix (date bug history — CRITICAL):**
- Root cause: `new Date('YYYY-MM-DD')` parses UTC midnight → shifts day -1 in AEST
- Fix: build week map using `new Date(y, m-1, d)` constructor (local time)
- Format: `Sunday=2026-03-22, Monday=2026-03-23...` for next 7 days
- Injected into BOTH `systemPrompt` (as `CRITICAL DATES` block at top) AND `loopSystem`
- CAPABILITY_RULES: "copy date from WEEK DATES verbatim — never calculate"
- `meal_plans` always loaded (not gated on keywords) so Zaeli sees current week

**Model routing (selectModel):**
- ≤2 words → Haiku · Emotional/planning/recipe → Sonnet · Pure action ≤8 words → Haiku · Default → Sonnet
- Tool loop turns 2+ → always Haiku with loopSystem (stripped prompt)
- max_tokens: Sonnet turn 0 = 1024, all others = 600

**Status bar fix:**
- `zaeli-chat.tsx` uses `edges={[]}` + `useSafeAreaInsets()` + `paddingTop: insets.top+8` on header
- All other screens use `edges={['top']}` as normal

---

### Mealplanner — Key Architecture Notes

**Dessert handling (v4.2):**
- `AddMealModal` has `targetMealType?:string` prop → `saveToDb` uses `targetMealType || 'dinner'`
- Dessert slot: if dessert exists → `setDetailMeal` (view detail), else → `setAddDay` with `mealType:'dessert'`
- Tool description: always use `meal_type:'dessert'` for desserts

**Ingredients/method in Dinners view (v4.2):**
- `MealDetailModal` uses `effectiveNotes = meal.notes || recipeNotes`
- `recipeNotes`: fetched from `recipes` table by meal name when `meal.ingredients` empty and `meal.notes` empty
- `add_meal_plan` tool saves `Ingredients:\n...\nMethod:\n...` to notes field

---

### Supabase tables (all active)
```
events, todos, missions, shopping_items, pantry_items, receipts,
meal_plans, recipes, menus, family_members, api_logs
```

---

### Key design decisions (locked)
- No floating FAB · Hamburger menu only navigation
- Brief cards: Haiku model, blue colour
- All API calls through `callClaude()` in `lib/api-logger.ts` — never raw fetch
- Edit modals lifted out of parent Modal (iOS pageSheet stacking)
- `.limit(1)` + `data?.[0]` — never `.single()` (throws on no result)
- Smart context: only load data relevant to intent (except meal_plans — always load)
- Multi-channel chat: General/Calendar/Shopping/Meals/Kids/Travel
- Recipes: Zaeli provides from training knowledge — no Spoonacular yet
- Files in `app/(tabs)/` must be `.tsx` screen files only

---

### IMPORTANT — PowerShell file copy reminder
Always escape `(tabs)` with backticks in PowerShell:
```powershell
copy "C:\Users\richa\Downloads\filename.tsx" "C:\Users\richa\zaeli\app\`(tabs`)\filename.tsx"
```
Never drag non-screen files into `app/(tabs)/` — `api-logger.ts`, `.md`, `.html` all belong elsewhere.

---

### Next session priority order
1. **Continue testing** — date fix, dessert detail, ingredients/method for new Zaeli meals
2. **Home brief wrong context** — brief mentions wrong day/meal (same date bug root cause, may now be fixed)
3. **Homework helper (Kids Hub)** — Socratic method, grade-aware responses, Sonnet model
4. **Kids Hub redesign** — jobs, rewards, homework in one place
5. **Usage cap** — 500 msgs/month soft limit with friendly UI
6. **Onboarding flow** — email capture, 7-day trial, zaeli.app signup
7. **Spoonacular** — pantry matching, nutritional data
8. **Travel screen** stub

---

### Note on code files
Upload files directly into the chat when changes are needed — do not rely on pasted content. Always ask Richard to upload the relevant `.tsx` before making changes. Latest versions are in the GitHub repo.

---

Please confirm you've read this and are ready to continue. Ask Richard what he'd like to tackle and suggest a priority order based on the outstanding items above.
