# CLAUDE.md — Zaeli Project Context
*Last updated: 19 March 2026 — Session 10 complete*

---

## Who You Are Talking To
- **Richard** — beginner developer. Always give **full file rewrites**, easy copy-paste PowerShell commands, one step at a time
- Never give partial diffs or targeted edits unless it's a single truly isolated line
- Always explain what you're doing and why in plain English before diving into code
- Richard responds well to clear structure, bullet points for decisions, and knowing what's coming next
- Family: Anna (logged-in user), Richard, Poppy (12), Gab (10), Duke (8)
- Local path: `C:\Users\richa\zaeli` (Windows, PowerShell — no `&&` chaining)
- Repo: https://github.com/RDK1981/zaeli (private)
- **PowerShell rule:** `(tabs)` folder needs backtick escaping: `app\`(tabs`)\filename.tsx`
- **Full file rewrites only** — never partial diffs
- **Design before code** — always discuss/mockup new screens before writing code

---

## The Business

Zaeli is an iOS-first AI family life platform for Australian families with children. Target market: dual-income couples with primary school-aged children in metro areas.

**Revenue model:**
- Family plan: A$14.99/month
- Homework add-on: A$9.99/child/month
- 100% web sales (no App Store cut)
- Stripe payment processing

**Unit economics (real-world, verified 19 Mar 2026):**
- GPT-5.4 mini chat: A$0.0037/msg actual avg
- GPT-5.4 mini brief: A$0.002/call actual avg
- Claude Sonnet scan: A$0.03/receipt
- Homework blend (Sonnet 70%/Haiku 30%): A$0.0154/msg
- Homework GPT (if quality sufficient): A$0.0037/msg — 4x cheaper
- Realistic family (300 msgs, 120 briefs, 15 scans): ~A$1.50/month API cost
- Margin at A$14.99 plan: ~85%+ on base plan

**The ROI principle:** Every feature decision should be weighed against its impact on retention and revenue. Zaeli's value is best understood through lived experience — retaining active subscribers past the first few days is the real challenge. The homework module (A$9.99/child) is the single biggest revenue lever.

**Growth strategy:**
- Phase 1: Seed via personal networks (0–500 families)
- Phase 2: Referral engine + short-form content (500–3,000)
- Phase 3: Micro-influencer, press, school partnerships (3,000–10,000)
- 10,000 families = ~0.3% of Australian addressable market

---

## Zaeli Persona — THE MOST IMPORTANT THING

The persona IS the product. Everything Zaeli says must feel like a switched-on friend who genuinely knows your family — not a chatbot, not an assistant, not a task manager.

**Core persona:** Anne Hathaway energy — smart, warm, magnetic. Cheeky opener always backed by substance.

**Voice rules:**
- Australian warmth — "Love", "brilliant" natural. **NEVER "mate" or "guys"**
- Never start with "I"
- Short by default, expand when useful
- Dry wit when earned, never forced
- 1-2 emojis naturally, never forced
- Encouragement earned and specific, never generic
- Hard moments = fewest words
- **NEVER sound like a push notification or task manager**

**Signature lines:**
- "I thrive on chaos"
- "The obligations, I'm afraid, persist"
- "Tonight is completely yours — just breathe"
- "She needs her person. Go be her hero"

Reference: `zaeli-persona-v9.html` in Downloads

---

## Stack
- React Native + Expo (iOS-first)
- Supabase (Postgres, Sydney ap-southeast-2, ID: rsvbzakyyrftezthlhtd)
- Claude API — vision/scan calls only (Sonnet)
- OpenAI API — GPT-5.4 mini (all chat/briefs/greetings), Whisper (voice)
- expo-router (file-based routing)
- expo-av — audio recording
- Poppins font (all UI), DMSerifDisplay (hero titles only)
- No bottom tab bar — hamburger menu only

---

## Key Constants
```ts
DUMMY_FAMILY_ID   = '00000000-0000-0000-0000-000000000001'
DUMMY_MEMBER_NAME = 'Anna'
SONNET    = 'claude-sonnet-4-20250514'
HAIKU     = 'claude-haiku-4-5-20251001'
GPT5_MINI = 'gpt-5.4-mini'
// CRITICAL: OpenAI uses max_completion_tokens (NOT max_tokens)
// Claude uses max_tokens — never mix these up
```

---

## AI Provider Architecture

### Default: GPT-5.4 mini for everything
`lib/zaeli-provider.ts` — default = `'openai'`

| Feature | Engine |
|---|---|
| All briefs (home/calendar/shopping/meals) | GPT-5.4 mini |
| All zaeli_chat conversations | GPT-5.4 mini |
| Channel greetings + continuations | GPT-5.4 mini |
| Receipt/pantry scanning | Claude Sonnet vision |
| Whisper transcription | OpenAI Whisper-1 |
| Homework (current) | Sonnet 70% / Haiku 30% blend |
| Homework (testing) | GPT-5.4 mini — quality TBD |

### API Logging (all 8 points covered)
Every GPT and Claude call logs to `api_logs` table:
- zaeli_chat, chat_greeting, home_brief, calendar_brief, shopping_brief, meal_brief, receipt_scan, whisper_transcription

---

## Brief Architecture — CRITICAL PATTERNS

### Always fetch data directly inside generateBrief()
NEVER rely on component state — it may not be loaded yet when brief fires.

### Date handling (AEST safe)
```ts
// ALWAYS use this:
const td = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
// NEVER use: now.toISOString().split('T')[0] — UTC shifts date in AEST
```

### Event labelling for GPT
All events must be labelled (TODAY), (TOMORROW), or (DayName YYYY-MM-DD).
GPT instruction: "NEVER calculate dates yourself — use labels exactly as provided"

### Meal brief window
7-day window = today + 6 days (`new Date(y, m, d+6)`) — NOT +7 (gives 8 days)
Pass exact unplanned day names — never let GPT calculate the count itself

---

## zaeli-chat.tsx Architecture

### Render structure (DO NOT change)
```
<View flex:1 white>             ← root
  <StatusBar dark animated/>
  <SafeAreaView edges=['top']>  ← header ONLY
    <View hdr/>
  </SafeAreaView>
  <View flex:1>                 ← chat content
    <ScrollView/>
  </View>
  <KeyboardAvoidingView/>       ← input at bottom
</View>
```

### useEffect ordering (critical)
- useEffect3: channel sync from params
- useEffect5 (deps=[]): seedMessage handler — uses `params.channel` directly
- useEffect6 (deps=[activeCtx]): greeting — **skips entirely if seedMessage set**
- autoMic useFocusEffect: AFTER `startRecording` is defined (arrow fn, not hoisted)
- Status bar useFocusEffect: `RNStatusBar.setBarStyle('dark-content', true)`

### Shopping data
- Query limit: 100 items, fmtShop slice: 100 items
- `ns=true` always — shopping always loaded regardless of keywords

---

## Screen Status

| File | Status | Notes |
|---|---|---|
| `index.tsx` | ✅ Complete | Brief, mic, GPT logging |
| `calendar.tsx` | ✅ Complete | Brief fetches own events, mic, GPT logging |
| `shopping.tsx` | ✅ Complete | Both mics wired, 100 items, GPT logging |
| `zaeli-chat.tsx` | ✅ Complete | Full GPT, status bar, autoMic, no "mate", logging |
| `mealplanner.tsx` | ✅ Complete | GPT brief, mic, correct count, GPT logging |
| `more.tsx` | ✅ Complete | AI engine toggle (remove pre-launch) |
| `lib/zaeli-provider.ts` | ✅ Complete | Default = 'openai' |

---

## Supabase Tables
```
events, todos, missions, shopping_items, pantry_items, receipts,
meal_plans, recipes, menus, family_members, api_logs
```

---

## Colours
```ts
blue:  '#0057FF'   mag:   '#E0007C'   orange: '#FF8C00'
gold:  '#B8A400'   green: '#00C97A'   ink:    '#0A0A0A'
bg:    '#F7F7F7'   chatBg:'#F4F6FA'
```

---

## Coding Rules
- SafeAreaView `edges={['top']}` always
- zaeli-chat: SafeAreaView wraps HEADER ONLY
- No floating FAB anywhere
- Logo taps → `router.replace('/(tabs)/')`
- PowerShell: no `&&` — separate lines
- Always `npx expo start --clear` after changes
- Import paths from `app/(tabs)/`: `../../lib/supabase`, `../../lib/api-logger`, `../../lib/zaeli-provider`

---

## Admin Dashboard
- **URL:** https://incomparable-gumdrop-32e4ba.netlify.app
- **File:** `C:\Users\richa\Downloads\zaeli-admin\index.html`
- Redeploy: drag `zaeli-admin` folder to Netlify
- Real-world costs loaded: verified 19 Mar 2026
- Homework engine toggle: Sonnet/Haiku blend vs GPT-5.4 mini

---

## Next Priorities (in order)

### 1. Homework / Tutoring AI module (HIGHEST PRIORITY)
- Biggest revenue lever: A$9.99/child/month
- Architecture decision pending: standalone Tutoring screen OR part of Kids Hub?
- Richard's preference: possibly bold standalone "Tutoring AI" — discuss in new chat
- Socratic method — guide without giving answers
- Grade-aware (Poppy Yr 7, Gab Yr 5, Duke Yr 3)
- Test GPT-5.4 mini quality vs Sonnet blend — huge cost impact
- If GPT sufficient: saves ~A$4,200/month at 1,000 families
- Always Claude Sonnet if quality isn't there

### 2. Kids Hub redesign
- Jobs, rewards, homework (if homework lives here)
- Depends on architecture decision above

### 3. GPT logging for Whisper
- Voice transcriptions not yet logged to api_logs

### 4. Home brief quality pass
- Implement full zaeli-brief-logic-spec.md (callbacks, dinner logic, time windows)
- Now that architecture is solid, refine the content quality

### 5. To-dos screen
- Currently a stub in more.tsx
- Needs its own dedicated screen

### 6. Website + Stripe + onboarding
- zaeli.app domain
- Payment processing
- Family onboarding flow

### 7. Multi-user / family sync
- All family members on same account
- Push notifications

### 8. Remove AI toggle before launch
- Settings AI engine toggle is for testing only
