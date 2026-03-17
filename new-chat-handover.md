## Zaeli App — New Chat Handover Brief
*18 March 2026 (Session 8) — copy this entire message to start a new chat*

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

✅ `index.tsx` — Home screen, brief card (Haiku), hardened double-fire guard (`briefGenRef` boolean)
✅ `calendar.tsx` — Full calendar, add/edit/recurring events, brief card
✅ `shopping.tsx` — List/Pantry/Spend tabs, receipt scan, pantry sync
✅ `zaeli-chat.tsx` — Single chat, smart Sonnet/Haiku routing, history cap 12, no "previous conversation" bug
✅ `mealplanner.tsx` — Dinners/Recipes/Favourites v4.1
✅ `more.tsx` — Hub + Settings + To-dos
✅ `lib/api-logger.ts` — callClaude() wrapper, model-aware pricing

---

### Admin Dashboard (LIVE)
- **URL:** https://incomparable-gumdrop-32e4ba.netlify.app
- Shows real-time API usage, costs by feature, financial model with sliders
- Supabase `api_logs` table active ✅

---

### CRITICAL — What we did in Session 7 (cost optimisation)

This was a full cost analysis and optimisation session. **Always check CLAUDE.md for the full cost architecture.**

**Problem identified from dashboard:**
- Session 1 (before fixes): 5 chat calls × ~16,000 input tokens = $0.27
- Root cause: `JSON.stringify` of entire DB sent in system prompt every turn
- Tool loop turns (turns 2+) were re-sending full 8,000+ token context unnecessarily
- home_brief was double-firing on every app open (~$0.02 wasted per launch)

**Three fixes applied to `zaeli-chat.tsx` and `index.tsx`:**

**Fix 1 — Context compression (biggest win, ~60% token reduction):**
Replaced all `JSON.stringify(data)` blobs in the context string with compact human-readable summaries:
- Events: `"Soccer pickup 3:30pm (2026-03-18)"` instead of full JSON objects
- Recipes: names only instead of full notes
- Pantry: `"milk:good, eggs:low"` format
- Result: avg input per chat call dropped from ~8,000–16,000 → ~3,640 tokens

**Fix 2 — Stripped tool loop system prompt:**
Tool loop turns 2+ now use a 150-token system prompt instead of full 8,000-token context.
- Before: 9,966 and 9,576 token tool-loop calls
- After: ~800–1,200 token tool-loop calls

**Fix 3 — home_brief double-fire guard:**
`briefGenRef` is now a boolean ref set to `true` at the very start of `generateBrief()` — before any async work. `useFocusEffect` also checks `!briefGenRef.current` before triggering 30-min refresh.

**Results after fixes (from dashboard):**
- Avg input/call: 3,640 (was 8,000–16,000) ✅
- Avg cost/call: $0.013 (was $0.033) ✅
- home_brief: 1,337 tokens, fired once per session ✅
- Typical family/month cost: ~$2.25 (150 msgs) — 76% margin at $15 AUD plan ✅

**Smart model routing added to `zaeli-chat.tsx`:**
New `selectModel()` function routes each message to Sonnet or Haiku before the API call:
- ≤2 words → Haiku
- Emotional/planning/recipe/advice keywords → Sonnet
- Short pure action phrases ("add milk", "book soccer") → Haiku
- Ambiguous → Sonnet (safety default — never risk quality to save $0.01)
- Tool loop turns 2+ → always Haiku regardless

**History cap increased 6 → 12:**
Prevents mid-conversation context loss (Zaeli was forgetting context after 3 exchanges).
Also added to `CAPABILITY_RULES`: Zaeli must never say "I don't see any previous conversation."

---

### Observed cost benchmarks (use these for comparison)
| Metric | Before Session 7 | After Session 7 |
|---|---|---|
| Avg input tokens/chat call | 8,000–16,000 | ~3,640 |
| Avg cost/chat call | $0.033 | $0.013 |
| home_brief tokens | 4,305 (×2 fires) | 1,337 (×1 fire) |
| Typical session cost (12 msgs) | $0.30+ | ~$0.16 |
| Light family/month (45 msgs) | ~$4+ | ~$0.89 |
| Medium family/month (150 msgs) | ~$10+ | ~$2.25 |

---

### Immediate next tasks (priority order)
1. **Test Session 7 cost fixes** — run a test session in the morning, check dashboard, compare vs $0.013/call baseline. Target: similar session to last night's 12-call test should come in under $0.10.
2. **Monitor selectModel() routing** — check dashboard to see if Haiku is firing on expected turns. Look for any quality issues with Haiku responses in action.
3. **Homework platform build** — Socratic method, Grade-aware prompting. Architecture: 20-message history cap, always Sonnet, subject + grade passed as compact `homework_ctx` string separate from family context.
4. **Onboarding flow** — email capture, 7-day trial, zaeli.app signup
5. **Usage cap** — 500 AI interactions/month soft limit, throttle beyond
6. **Batch API** — 50% discount for async calls (briefs, summaries)
7. **GitHub Actions** — auto-deploy admin dashboard
8. **Travel screen** stub

---

### Key design decisions (locked — don't revisit without reason)
- No floating FAB anywhere
- Hamburger menu only navigation
- Brief: Haiku model, thinking dots → fade in (no typewriter)
- Tiles: Option C (coloured footer bar)
- To-dos: Gold `#B8A400`
- Logo on every screen taps → home
- Recently Bought: magenta text, no strikethrough
- Receipt capture: lives in Pantry tab (not Spend tab)
- Food items ticked off → auto-sync to Pantry
- Household/Other → do NOT sync to Pantry
- All API calls through `callClaude()` — never raw fetch
- Edit modals lifted out of parent Modal (iOS pageSheet stacking)

---

### Tech reminders
- Import paths from `app/(tabs)/`: `../../lib/supabase`, `../components/NavMenu`, `../../lib/api-logger`
- SafeAreaView always `edges={['top']}`
- Poppins font for all UI, DMSerifDisplay for hero titles only
- Always `npx expo start --clear` after copying files
- PowerShell: no `&&` — use separate lines
- `.single()` throws on no result — always use `.limit(1)` + `data?.[0]`

---

### Note on code files
The new chat won't have direct access to code files from previous sessions. To work on a specific file:
1. Ask me to paste the current file contents, OR
2. Read it from the repo at `C:\Users\richa\zaeli\app\(tabs)\filename.tsx`

The latest versions of all files are in GitHub. **Always ask me to paste the relevant file before making changes.**

---

Please confirm you've read this and are ready to continue. First priority is checking the dashboard after a morning test session to verify the Session 7 cost fixes are holding up in practice.
