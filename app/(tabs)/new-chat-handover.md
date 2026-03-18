## Zaeli App — New Chat Handover Brief
*18 March 2026 (Session 9) — copy this entire message to start a new chat*

---

Hi! I'm continuing development of the **Zaeli app** — a React Native / Expo iOS-first family life platform with AI (Claude API + OpenAI) at its core.

---

### Who you are talking to
- My name is Richard. The app's logged-in user is Anna (family: Anna, Richard, Poppy 12, Gab 10, Duke 8)
- Beginner developer — always **full file rewrites**, one copy-paste step at a time
- Every PowerShell command and Cursor find/replace in its own separate copy-paste box
- PowerShell: backtick escape `(tabs)`: `app\`(tabs`)\filename.tsx`
- Local path: `C:\Users\richa\zaeli` (Windows, PowerShell — no `&&`)
- Repo: https://github.com/RDK1981/zaeli (private)

---

### Key constants
- `DUMMY_FAMILY_ID = '00000000-0000-0000-0000-000000000001'`
- `SONNET = 'claude-sonnet-4-20250514'`
- `HAIKU = 'claude-haiku-4-5-20251001'`
- `GPT5_MINI = 'gpt-5.4-mini'`

---

### What's been built (Session 9 — 18 March 2026)

✅ `index.tsx` — Home, brief card (2hr cache), GPT/Claude routing via callBrief()
✅ `calendar.tsx` — Full calendar, brief (once/day 2am reset), GPT/Claude routing
✅ `shopping.tsx` — List/Pantry/Spend, search bars, 30-day Recently Bought, GPT/Claude routing
✅ `zaeli-chat.tsx` — Multi-channel, Whisper voice, usage cap (500/month), GPT-5.4 mini toggle
✅ `mealplanner.tsx` — Dinners/Recipes/Favourites v4.2, no brief
✅ `more.tsx` — Settings with AI Engine toggle (Claude vs GPT-5.4 mini)
✅ `lib/zaeli-provider.ts` — Shared provider state (NEW — both zaeli-chat and more import from here)

---

### Admin Dashboard
- **URL:** https://incomparable-gumdrop-32e4ba.netlify.app
- Financial model has Claude blend vs GPT-5.4 mini cost toggle
- Admin HTML is in `Downloads/zaeli-admin/index.html` — drag to Netlify to redeploy

---

### CRITICAL — GPT Toggle Architecture

**lib/zaeli-provider.ts** is the shared state file:
```ts
export function getZaeliProvider(): 'claude' | 'openai'
export function setZaeliProvider(p: 'claude' | 'openai')
```
**NEVER import provider state from zaeli-chat.tsx** — causes circular import crash.

**Toggle location:** More → Settings → scroll to bottom → AI Engine switch

**When toggle is ON (GPT mode):**
- All briefs → GPT-5.4 mini via callBrief() helper
- All chat → GPT-5.4 mini
- Whisper, receipt scans → unchanged (still OpenAI/Sonnet)
- Homework → always Claude Sonnet (when built)

**callBrief() pattern** (same in index.tsx, calendar.tsx, shopping.tsx):
```ts
async function callBrief({feature, system, userContent, maxTokens}) {
  if (getZaeliProvider() === 'openai') {
    // fetch to api.openai.com/v1/chat/completions with gpt-5.4-mini
  } else {
    // callClaude() with Haiku
  }
}
```

---

### IMMEDIATE NEXT TASK — Fix GPT mode bugs

**Bug 1 — Home brief JSON parse error:**
- Home brief expects JSON response: `{brief: "...", cta: "...", signoff: "..."}`
- GPT returns plain text, not JSON
- Fix: either add JSON instruction to GPT system prompt OR update parser to handle plain text fallback

**Bug 2 — Chat 400 error on OpenAI:**
- `callOpenAI()` in zaeli-chat.tsx is sending wrong message format
- Check the message history format — OpenAI tool result messages use `{role:'tool', tool_call_id, content}` not `{type:'tool_result'}`
- Also check loopMessages format when tool calls are involved

**Bug 3 — Shopping brief not working in GPT mode:**
- Needs investigation — likely same JSON/format issue as home brief

**Bug 4 — Brief-to-chat continuation not wired for OpenAI:**
- `loadBriefContinuation()` in zaeli-chat.tsx always uses Haiku
- Need to add GPT path when toggle is ON

**After fixing bugs:**
- Do a proper 30-min test with GPT toggle ON
- Tune Zaeli persona prompt for GPT — more enthusiastic, warmer, longer responses
- GPT naturally sounds more corporate/American — needs stronger Australian warmth instructions
- Decide on pricing: GPT → A$14.99 no cap; Claude → A$19.99 no cap

---

### Cost comparison (why this matters)
| Engine | Per msg | 1,000 msgs/month | Margin at A$14.99 |
|---|---|---|---|
| Claude blend | A$0.022 | A$22.00 | Negative |
| GPT-5.4 mini | A$0.003 | A$3.00 | **80%** |

GPT-5.4 mini at 7× cheaper changes the entire economics. At that cost: no message cap needed, longer responses affordable, A$14.99 pricing works comfortably.

---

### Whisper voice input
- Tap mic → magenta recording banner
- Tap again → transcribes → text in input field
- Name correction: Xaeli → Zaeli automatically
- `EXPO_PUBLIC_OPENAI_API_KEY` in `.env` — must be single unbroken line

---

### Brief firing (once per day, resets 2am)
- Home: cold start + 2hr threshold
- Calendar + Shopping: once per day module-level cache
- Meals: NO brief (removed)

---

### Supabase tables
```
events, todos, missions, shopping_items, pantry_items, receipts,
meal_plans, recipes, menus, family_members, api_logs
```

---

### Tech reminders
- Import paths from `app/(tabs)/`: `../../lib/supabase`, `../../lib/api-logger`, `../../lib/zaeli-provider`
- Files in `app/(tabs)/` = screen .tsx files only
- Always `npx expo start --clear` after changes
- Upload files directly into chat before editing

---

### Priority order after GPT fixes
1. Fix GPT mode bugs (JSON, 400, shopping, continuation)
2. Test + tune GPT persona
3. Finalise pricing decision
4. **Homework module** — biggest revenue lever (A$15 → A$35/family)
5. Kids Hub redesign
6. Multi-user / family sync
7. Website (zaeli.app)
8. Stripe + onboarding

---

Please confirm you've read this. First priority is fixing the GPT mode bugs listed above — start by asking Richard to upload `zaeli-chat.tsx` and `index.tsx`.
