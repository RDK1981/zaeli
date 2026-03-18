## Zaeli App — New Chat Handover Brief
*18 March 2026 (Session 9) — copy this entire message to start a new chat*

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
**Master brief (CLAUDE.md):** `C:\Users\richa\zaeli\app\(tabs)\CLAUDE.md` — full stack, colours, coding rules, all screen statuses. **Always read this first.**

**Key constants:**
- `DUMMY_FAMILY_ID = '00000000-0000-0000-0000-000000000001'`
- `DUMMY_MEMBER_NAME = 'Anna'`
- `SONNET = 'claude-sonnet-4-20250514'`
- `HAIKU  = 'claude-haiku-4-5-20251001'`
- `AUD_TO_USD = 0.65` / `USD_TO_AUD = ~1.538`

---

### What's been built (as of 18 March 2026 — Session 9)

✅ `index.tsx` — Home screen, brief card (2hr cache), Option C tiles, date fix
✅ `calendar.tsx` — Full calendar, add/edit/recurring, brief (once/day, 2am reset)
✅ `shopping.tsx` — List/Pantry/Spend, search bars on List+Pantry, 30-day Recently Bought, brief (once/day)
✅ `zaeli-chat.tsx` — Multi-channel chat, Whisper voice input, usage cap (500/month), week dates fix
✅ `mealplanner.tsx` — Dinners/Recipes/Favourites v4.2, dessert fix, ingredients fallback, NO brief
✅ `more.tsx` — Hub + Settings + To-dos
✅ `lib/api-logger.ts` — callClaude() wrapper, model-aware pricing
✅ `lib/zaeli-memory.ts` — conversation memory
✅ `lib/notifications.ts` — reminder intent detection

---

### Admin Dashboard (LIVE)
- **URL:** https://incomparable-gumdrop-32e4ba.netlify.app
- All costs in AUD, Kids Hub + Whisper sliders, break-even to A$10k milestone
- Redeploy: drag `zaeli-admin/index.html` to Netlify drop

---

### Cost Architecture — VERIFIED STABLE
- Avg cost/chat call: A$0.022 | Full test day (146 calls): A$1.97
- 300 msgs/month → A$6.60 API cost | Margin at A$15: **56%**
- Families to A$10k/month profit: **1,046**

---

### Session 9 — What was built

**Whisper voice input (zaeli-chat.tsx):**
- Tap mic → magenta recording banner + pulsing dot
- Tap again → transcribes via OpenAI Whisper → text drops into input
- Name correction: Xaeli/Zeily etc → "Zaeli" via regex
- Key: `EXPO_PUBLIC_OPENAI_API_KEY` in `.env` — MUST be single unbroken line
- Uses `expo-av` — do NOT import `expo-file-system` (deprecated, causes crash)
- Cost: A$0.003 fixed per transcription, logged to api_logs

**Brief firing overhaul:**
- Home: regenerates after 2hr away (was 30min)
- Calendar + Shopping: once per day, resets at 2am (was every 30min)
- Meals brief: REMOVED entirely — no API call on Meals screen open
- More/To-dos: never had a brief
- Cost impact: 15 app opens = 1 brief fire, not 15

**Shopping search bars:**
- List tab: search bar above `+ Add item` toolbar, filters active + Recently Bought
- Pantry tab: search bar above toolbar, filters pantry items in real time
- Both use `marginHorizontal: 16` to align with toolbar buttons
- Recently Bought: limited to last 30 days, "+ X older items" button for older

**Usage cap (zaeli-chat.tsx):**
- Soft warning at 450 msgs/month: banner shown, message still goes through
- Hard limit at 500 msgs/month: Zaeli blocks, shows reset date + hello@zaeli.app
- Counts `zaeli_chat` rows in `api_logs` — briefs/greetings excluded
- If count query fails → message goes through (never block on failed check)
- Not easily testable without 450+ messages — monitor via admin dashboard

**Date bug fixes (index.tsx + zaeli-chat.tsx):**
- `DAY_NAMES` array now declared BEFORE `evSummary` in index.tsx (was causing TypeError)
- `evSummary` now includes day name with each event: `Sunday 2026-03-22 5:00pm`
- `weekDates` injected into brief context in index.tsx
- `loopSystem` includes `weekDates` (was losing date context on tool loop turns)

---

### Key architecture notes

**zaeli-chat.tsx send() flow:**
1. Usage cap check (Supabase count query)
2. Build week dates map
3. Load context (events, todos, meal_plans always, shopping/pantry if keywords match)
4. Build systemPrompt with CRITICAL DATES block at top
5. Tool loop (turn 0 = chosen model, turns 1+ = Haiku with loopSystem including weekDates)

**Brief cache pattern (calendar.tsx + shopping.tsx):**
- Module-level variables: `cachedBriefText`, `lastBriefTime`
- On mount: compute today's "brief day key" (2am-reset YYYY-MM-DD)
- If cached key === today key → use cache, no API call
- Uses `new Date()` directly (NOT a `now` variable — causes undefined error)

**Shopping recently bought:**
- `ShopItem` type includes `created_at?: string`
- Filter: `new Date(i.created_at) >= thirtyDaysAgo`
- Older items: `olderChecked` array, shown via `showOlderBought` state toggle

---

### Supabase tables (all active)
```
events, todos, missions, shopping_items, pantry_items, receipts,
meal_plans, recipes, menus, family_members, api_logs
```

---

### Key design decisions (locked)
- No floating FAB · Hamburger menu only
- Brief cards: Haiku, once per day per screen (2am reset), home = 2hr cache
- Meals screen: NO brief card
- All API calls through `callClaude()` in `lib/api-logger.ts`
- SafeAreaView: `edges={['top']}` everywhere EXCEPT zaeli-chat (`edges={[]}` + insets)
- Recipes: Zaeli provides from training knowledge — no Spoonacular yet
- Usage cap: 500 zaeli_chat msgs/month, soft warn at 450
- `.env` OpenAI key: single unbroken line, no wrapping

---

### Next session priority order
1. **Homework module** — Socratic method, grade-aware, Sonnet, biggest revenue lever (A$15→A$35)
2. **Kids Hub redesign** — jobs, rewards, homework in one place
3. **Multi-user / family sync** — core retention requirement before launch
4. **Website** (zaeli.app) — needed for trial signups
5. **Stripe + onboarding** — trial → paid conversion
6. **Push notifications** — reminders, meal prep alerts, kids jobs
7. **Privacy policy + T&Cs** — required for App Store + payments

---

### Tech reminders
- Import paths from `app/(tabs)/`: `../../lib/supabase`, `../../lib/api-logger`
- Files in `app/(tabs)/` must be `.tsx` screen files only
- PowerShell: backtick escape `(tabs)`: `app\`(tabs`)\file.tsx`
- Always `npx expo start --clear` after file changes
- Upload files directly into chat before making changes — don't rely on memory

---

Please confirm you've read this and are ready to continue. Ask Richard what he'd like to tackle and suggest the homework module as the priority — it's the single biggest revenue lever remaining.
