## Zaeli App — New Chat Handover Brief
*17 March 2026 (Session 6) — copy this entire message to start a new chat*

---

Hi! I'm continuing development of the **Zaeli app** — a React Native / Expo iOS-first family life platform with AI (Claude API) at its core. We've been building this together across many sessions and I need you to pick up exactly where we left off.

---

### Who you are talking to
- My name is Richard. The app's logged-in user is Anna (my family: Anna, Richard, Poppy age 12, Gab age 10, Duke age 8)
- I'm a beginner developer — always give me **full file rewrites** with easy copy-paste PowerShell commands, step by step
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

---

### What's been built (as of 17 March 2026)

✅ `index.tsx` — Home screen, brief card (Haiku), double-fire fix applied
✅ `calendar.tsx` — Full calendar, add/edit/recurring events, brief card
✅ `shopping.tsx` — List/Pantry/Spend tabs, receipt scan, pantry sync
✅ `zaeli-chat.tsx` — Single general chat (channels removed), smart context loading, Haiku greetings, pantry fix, tool echo suppression
✅ `mealplanner.tsx` — Dinners/Recipes/Favourites v4.1
✅ `more.tsx` — Hub + Settings + To-dos
✅ `lib/api-logger.ts` — callClaude() wrapper, model-aware pricing (Haiku + Sonnet)

---

### Admin Dashboard (LIVE)
- **URL:** https://incomparable-gumdrop-32e4ba.netlify.app
- Shows real-time API usage, costs by feature, financial model with sliders
- Supabase `api_logs` table active ✅
- Redeploy: PowerShell key injection → drag `zaeli-admin` folder to Netlify

---

### CRITICAL — Cost Architecture (Richard's primary concern)

**This is an ongoing concern that must continue to be researched every session.**

Real usage for family of 4 with homework helper: ~2,500 API calls/month.

| State | Cost/family/month | At 1,000 families |
|---|---|---|
| Before any fixes | ~$109 USD | ~$109,000/month 🚨 |
| After Session 6 fixes | ~$8-10 USD (target) | ~$8,000-10,000/month |
| Still being verified | testing in progress | — |

**Cost fixes applied this session:**
1. Smart context loading (intent detection — mealKw, shopKw, pantryKw)
2. Haiku for all briefs and greetings (was Sonnet)
3. History cap at 6 messages (was 10)
4. Single chat — channels removed
5. Double home_brief fire fixed
6. Tool echo suppression — no "Perfect! Booked!" after ✅ confirmations
7. Pantry fix — data loads on pantry keywords, system prompt updated

**Still to explore (next session must address):**
- Session-level context caching (load recipes/family once, not per message)
- Prompt compression for long contexts
- Fair use cap — 500 AI interactions/month per family, throttle beyond
- Homework Haiku quality test — is it good enough?
- Tool-use loop: turns 2+ could use stripped context
- Anthropic Batch API (50% discount for async calls)
- Real usage monitoring — are families actually hitting 2,500 calls?

**One test session after cost fixes = ~$0.30 USD (meal search + calendar booking)**
Target after all fixes: $0.10-0.15 per typical session.

---

### Pricing (locked)
- **Family plan:** $15 AUD/month — calendar, shopping, meals, to-dos, notes, kids jobs
- **Homework add-on:** $10 AUD/child/month
- **Lunchboxes:** SCRAPPED
- **Travel:** deferred to v2
- **Distribution:** web-first (bypass App Store 15% cut), app free to download
- **Trial:** 7 days free, payment at zaeli.app
- **At 1,000 families (60% homework):** ~$7.6k USD/month profit, 51% margin

---

### Supabase tables (all active)
```
events, todos, missions, shopping_items, pantry_items, receipts,
meal_plans, recipes, menus, family_members, api_logs
```

---

### Key design decisions (locked)
- No floating FAB
- Hamburger menu only navigation
- Brief cards: Haiku model, blue colour
- All API calls through `callClaude()` in `lib/api-logger.ts` — never raw fetch
- Edit modals lifted out of parent Modal (iOS pageSheet stacking)
- `.single()` throws on no result — use `.limit(1)` + `data?.[0]`
- Date: `dayNames[now.getDay()]` array always, never `toDateString()`
- Smart context: only load data relevant to user's message intent
- Single chat (no channels) — CHANNELS object still in code but UI hidden

---

### Next session priority order
1. **Test cost fixes** — use app, check dashboard, compare vs $0.30 baseline
2. **Cost research** — explore caching, prompt compression, batch API, usage caps
3. **Homework platform build** — test Haiku quality at real rates
4. **Onboarding flow** — email capture, 7-day trial, zaeli.app signup
5. **GitHub Actions** — auto-deploy admin dashboard
6. **Travel screen** stub

---

### Tech reminders
- Import paths from `app/(tabs)/`: `../../lib/supabase`, `../components/NavMenu`, `../../lib/api-logger`
- SafeAreaView always `edges={['top']}`
- Poppins font for all UI, DMSerifDisplay for hero titles only
- Always `npx expo start --clear` after copying files
- PowerShell: no `&&` — use separate lines
- Haiku model: `claude-haiku-4-5-20251001`
- Sonnet model: `claude-sonnet-4-20250514`

---

### Note on code files
The new chat won't have direct access to code files from previous sessions. To work on a specific file:
1. Ask me to paste the current file contents, OR
2. I can read it from the repo at `C:\Users\richa\zaeli\app\(tabs)\filename.tsx`

The latest versions of all files are in the GitHub repo. Always ask me to paste the relevant file before making changes.

---

Please confirm you've read this and are ready to continue. Check the cost testing results on the admin dashboard first, then let's continue researching and implementing cost reductions before building new features.
