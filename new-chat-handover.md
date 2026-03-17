## Zaeli App — New Chat Handover Brief
*17 March 2026 — copy this entire message to start a new chat*

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

**Transcripts:** `/mnt/transcripts/` — full session history. See `journal.txt` for catalog.

**Output files:** `/mnt/user-data/outputs/` — latest versions of all built files.

**Key constants:**
- `DUMMY_FAMILY_ID = '00000000-0000-0000-0000-000000000001'`
- `DUMMY_MEMBER_NAME = 'Anna'`
- AI model: `claude-sonnet-4-20250514` (Sonnet) and `claude-haiku-4-5-20251001` (Haiku — for cheap tasks)

---

### What's been built (as of 17 March 2026)

✅ `index.tsx` — Home screen (blue hero, brief card, tiles, radar, Ask Zaeli bar)

✅ `calendar.tsx` — Calendar (magenta hero, Day/Week/Month, recurring events, brief card)

✅ `shopping.tsx` — Shopping (List/Pantry/Spend tabs, receipt scan, pantry sync)

✅ `zaeli-chat.tsx` — AI Chat (multi-channel, Meals context-aware, conflict detection)

✅ `mealplanner.tsx` — Meals v4.1 (Dinners/Recipes/Favourites, smart emoji icons, day picker, edit flows)

✅ `more.tsx` — Hub + Settings + To-dos

✅ `lib/api-logger.ts` — Central API logging wrapper (callClaude function)

✅ `NavMenu.tsx`, `_layout.tsx`

---

### Supabase tables
```sql
-- All created and working:
meal_plans, recipes, menus, receipts, pantry_items, shopping_items, api_logs

-- api_logs schema:
create table api_logs (
  id uuid default gen_random_uuid() primary key,
  family_id uuid not null,
  account_id integer,
  feature text not null,
  model text not null default 'claude-sonnet-4-20250514',
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  cost_usd numeric(10,6) not null default 0,
  created_at timestamptz not null default now()
);
```

---

### Admin Dashboard (LIVE)
- **URL:** https://incomparable-gumdrop-32e4ba.netlify.app
- Hosted on Netlify (richarddekretser@gmail.com account)
- Shows real-time API usage, costs by feature, per-family breakdown
- To redeploy: drag `C:\Users\richa\Downloads\zaeli-admin\index.html` folder onto Netlify project overview
- Connected to Supabase — shows live data, hit Refresh to update

---

### CRITICAL — Cost Problem (must fix before building more features)

**Current cost per family at realistic usage: ~$109/month**
Root cause: each zaeli_chat message sends ~16,000 input tokens (loads ALL data every time)

Real usage estimate for family of 4 with homework helper:
- ~2,520 API calls/month
- Homework helper alone: 45 messages/day × 3 kids = 1,350 calls/month
- At current rates: $109/family/month → $109,000/month at 1,000 families = catastrophic

**Three fixes needed (do these FIRST next session):**

**Fix 1 — Smart context loading (75% saving)**
- Currently loads ALL recipes, menus, shopping, events on EVERY message
- Fix: detect what user is asking about, load only relevant data
- Chat about meals → load meal data only
- Chat about shopping → load shopping only
- General chat → load events + todos only
- Expected: 16,000 tokens → ~4,000 per message

**Fix 2 — Haiku for simple tasks (80% saving on eligible calls)**
- Haiku costs $0.25/$1.25 per million vs Sonnet $3/$15 (20x cheaper)
- Move to Haiku: ALL briefs (home/calendar/shopping/meals), greetings, homework helper, category guessing
- Keep Sonnet: only real conversation chat
- Model strings: `claude-sonnet-4-20250514` and `claude-haiku-4-5-20251001`

**Fix 3 — History cap at 6 messages (saves ~1,500 tokens/message)**
- Currently keeping 10 messages of history
- Drop to 6 — enough for natural conversation flow

**Fix 4 — Single chat (remove channels)**
- Decision made: remove channel tabs, use one General chat
- Zaeli detects context from message content
- Simpler UX, same capability

**Target after all fixes:**
- Per chat message: $0.013 (down from $0.050)
- Per brief: $0.002 (down from $0.015)
- Per family/month at heavy use: ~$12 (down from $109)
- At 1,000 families: ~$12,000/month (down from $109,000)

---

### Pricing implications
- Even optimised, heavy users (homework daily) cost $8-15/month in AI
- Subscription needs to be $19.99/month minimum to be profitable
- Consider: basic plan ($9.99 no homework), family plan ($19.99 everything)
- Or: homework helper as $4.99/month add-on
- Fair use cap: 500 AI interactions/month included, then throttle

---

### Immediate next tasks (in priority order)
1. **Cost fixes** — smart context + Haiku + history cap + single chat (CRITICAL, do first)
2. **Homework platform** — build it to test real rates after cost fixes
3. **Travel screen** — stub
4. **Lunchbox screen** — mockup ready (`lunchbox-v1.html`)

---

### Key design decisions (locked)
- No floating FAB anywhere
- Hamburger menu only navigation
- Brief cards: blue on Home/Shopping/Meals, magenta on Calendar
- btnPrimary: blue not orange
- Meal overview: NO images — smart emoji icons via getMealEmoji()
- Edit modals: always lifted OUT of parent Modal (iOS pageSheet stacking)
- getMediaType() always used for base64 API calls
- Date context for AI: always use dayNames array, never toDateString()
- .single() throws on no result — use .limit(1) + data?.[0]
- React 18 batches async state updates — use useEffect for post-modal data loading
- All API calls go through callClaude() in lib/api-logger.ts — never raw fetch

---

### Tech reminders
- Import paths from `app/(tabs)/`: `../../lib/supabase`, `../components/NavMenu`, `../../lib/api-logger`
- SafeAreaView always `edges={['top']}`
- Poppins font for all UI, DMSerifDisplay for hero titles only
- Always `npx expo start --clear` after copying files
- PowerShell: no `&&` — use separate lines

---

Please read CLAUDE.md first, then confirm you're ready. **First priority is the cost fixes** — smart context loading, Haiku for simple tasks, 6-message history cap, and single chat. Do not build any new features until these are done.
