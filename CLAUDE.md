# CLAUDE.md — Zaeli Project Context
*Last updated: 19 March 2026 — Session 11 complete*

---

## Who You Are Talking To
- **Richard** — beginner developer. Always give **full file rewrites**, easy copy-paste PowerShell commands, one step at a time
- Never give partial diffs or targeted edits unless it's a single truly isolated line
- Always explain what you're doing and why in plain English before diving into code
- Richard responds well to clear structure, bullet points for decisions, and knowing what's coming next
- Family: Anna (logged-in user), Richard, Poppy (12, Yr 6), Gab (10, Yr 4), Duke (8, Yr 1)
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
- Tutor add-on: A$9.99/child/month
- 100% web sales (no App Store cut)
- Stripe payment processing

**Unit economics (verified 19 Mar 2026):**
- GPT-5.4 mini practice call: ~A$0.0007/call avg (question gen)
- GPT-5.4 mini feedback call: ~A$0.0008/call avg
- Full 10-question practice session: ~A$0.01 total
- Full month tutor (50 sessions/child): ~A$0.50/child API cost
- Margin at A$9.99/child Tutor: ~95% gross
- At 500 families (50% tutor uptake, 2 kids): ~A$12,490 revenue, ~A$4,250 API costs
- Break-even: 8 paying families

**Financial model projections (at 1,000 families):**
- Revenue: A$25k/month (base + tutor)
- API bill: A$9.3k/month
- Profit: ~A$13k/month (54% margin)
- Real-world margin likely higher (~66%) due to conservative usage assumptions

**Key insight — photo scan costs:** Model assumes 90 scans/family/month (too high). Real usage likely 15-20 scans. This alone moves margin from 54% to ~66%.

**The ROI principle:** Every feature decision weighed against retention impact. Tutor (A$9.99/child) is the single biggest revenue lever. Retaining active subscribers past the first few days is the real challenge.

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
- Claude API — vision/scan calls only (Sonnet) via `callClaude()` from `lib/api-logger`
- OpenAI API — GPT-5.4 mini (all chat/briefs/tutor), Whisper (voice input)
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
// CRITICAL: OpenAI key = EXPO_PUBLIC_OPENAI_API_KEY (NOT EXPO_PUBLIC_OPENAI_KEY)
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
| Tutor practice questions + feedback | GPT-5.4 mini ✅ confirmed working |
| Tutor homework help (Socratic chat) | GPT-5.4 mini ✅ confirmed working |
| Tutor vision (photo of work) | Claude Sonnet |
| Tutor reading feedback | GPT-5.4 mini |

### API Logging pattern for GPT calls (no wrapper — inline)
```ts
// GPT calls log directly to Supabase — no callClaude wrapper
async function logGpt(feature: string, usage: any) {
  const i = usage?.prompt_tokens ?? 0;
  const o = usage?.completion_tokens ?? 0;
  supabase.from('api_logs').insert({
    family_id: FAMILY_ID, feature, model: GPT_MODEL,
    input_tokens: i, output_tokens: o,
    cost_usd: parseFloat(((i * 0.75 + o * 4.50) / 1_000_000).toFixed(6)),
  });
}
// Claude vision calls use callClaude() from lib/api-logger — logs automatically
```

---

## Tutor Module — COMPLETE (Session 11)

### Architecture
Standalone premium module. Midnight + Gold theme (`#1A1A2E` / `#C9A84C`).
Three age tiers: Little Learner (K-Yr2), Middle Years (Yr3-6), Senior (Yr7-12).

### Screen files
| File | Status | Notes |
|---|---|---|
| `tutor.tsx` | ✅ Complete | Parent hub — child cards, Zaeli noticed, active/locked |
| `tutor-child.tsx` | ✅ Complete | Child home — mode selector, recent sessions with scores |
| `tutor-session.tsx` | ✅ Complete | Homework Help — Socratic chat, photo, voice |
| `tutor-practice.tsx` | ✅ Complete | Practice Mode — MC questions, adaptive difficulty, Socratic sheet |
| `tutor-reading.tsx` | ✅ Complete | Reading Mode — photo page, record, feedback scores |

### Tutor palette
```ts
T_DARK  = '#1A1A2E'
T_GOLD  = '#C9A84C'
T_GOLD2 = '#B8963E'
T_GOLDL = 'rgba(201,168,76,0.08)'
```

### Supabase tables added
```sql
-- family_members: year_level integer, tutor_active boolean added
-- tutor_sessions: id, family_id, child_name, year_level, mode, subject, topic,
--   messages jsonb, questions_answered integer, questions_correct integer,
--   duration_seconds integer, status text, created_at, updated_at
```

### Family data (correct as of Session 11)
```
Anna    — parent, tutor_active: false
Richard — parent, tutor_active: false
Poppy   — child, Year 6, tutor_active: true
Gab     — child, Year 4, tutor_active: true
Duke    — child, Year 1, tutor_active: false (locked)
```

### Key tutor features
- **Adaptive difficulty** — getDifficultyInstruction() from live success rate
- **No repeated questions** — askedQs[] passed to GPT each load
- **Session saving** — saves on first answer, completes on Back press
- **Subject change = new session** — setSessionId(null) on subject switch
- **Socratic bottom sheet** — `🧠 Talk me through it` always visible on practice
  - Smooth Animated.timing slide-up (380ms open, 320ms close)
  - Full screen with voice + camera
  - Logs to session record
  - [READY_TO_TRY] token triggers "Yes, let's go!" close button
- **Wrong answer flow** — Stage 1: redirect → Stage 2: hint → Stage 3: whiteboard workings
- **Next button** — disabled until GPT feedback loads (no race condition)
- **Photo** — always offers camera OR library (Alert with two options)
- **Keyboard** — TouchableWithoutFeedback on chat scroll dismisses keyboard
- **Header** — compact single row (Back + badge), no tall hero on practice screen

### Navigation pattern
- tutor.tsx → tutor-child.tsx (tap child card)
- tutor-child.tsx → tutor-session/practice/reading (tap mode)
- All Back buttons → router.replace() back to parent screen (not router.back())

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
| `tutor.tsx` | ✅ Complete | Parent hub, child cards, Zaeli noticed |
| `tutor-child.tsx` | ✅ Complete | Child home, mode selector, session history |
| `tutor-session.tsx` | ✅ Complete | Homework help, Socratic, photo+voice |
| `tutor-practice.tsx` | ✅ Complete | Practice, adaptive, Socratic sheet, wrong-answer flow |
| `tutor-reading.tsx` | ✅ Complete | Reading mode, record, feedback |
| `lib/zaeli-provider.ts` | ✅ Complete | Default = 'openai' |

---

## Supabase Tables
```
events, todos, missions, shopping_items, pantry_items, receipts,
meal_plans, recipes, menus, family_members, api_logs, tutor_sessions
```

---

## Colours
```ts
// App palette
blue:  '#0057FF'   mag:   '#E0007C'   orange: '#FF8C00'
gold:  '#B8A400'   green: '#00C97A'   ink:    '#0A0A0A'
bg:    '#F7F7F7'   chatBg:'#F4F6FA'

// Tutor palette
T_DARK:  '#1A1A2E'   T_GOLD:  '#C9A84C'   T_GOLD2: '#B8963E'
T_GOLDL: 'rgba(201,168,76,0.08)'
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
- **Keyboard in chat/modal:** TouchableWithoutFeedback on ScrollView only (NOT whole screen)
- **SafeAreaView inside Modal:** Don't use — use paddingTop:52 on inner view instead
- **Photo pickers:** Always offer camera OR library via Alert.alert with two options
- **Back buttons:** Always router.replace() with explicit params — never router.back()

---

## Admin Dashboard
- **URL:** https://incomparable-gumdrop-32e4ba.netlify.app
- **File:** `C:\Users\richa\Downloads\zaeli-admin\index.html`
- Redeploy: drag `zaeli-admin` folder to Netlify
- Real-world costs loaded: verified 19 Mar 2026
- Homework engine toggle: Sonnet/Haiku blend vs GPT-5.4 mini

---

## Next Priorities (in order)

### 1. Voice recording UI — tutor screens (NEXT SESSION)
- All three tutor screens need same visual recording indicator as home/calendar
- Pulsing red dot + "Recording…" label when active
- Consistent across tutor-session, tutor-practice (Socratic sheet), tutor-reading

### 2. Prompt audit / token optimisation
- Input tokens are 15x output tokens — system prompts are verbose
- Trim tutor system prompts by 20-30% without losing quality
- Estimated saving: meaningful at scale

### 3. Home brief quality pass
- Implement full zaeli-brief-logic-spec.md
- Callbacks, dinner logic, time windows, dismissed state

### 4. Tutor Activity tab
- Build once real session data exists
- Show sessions, time spent, subjects, streaks per child

### 5. Tutor Settings tab
- Manage licences per child
- Eventually connect Stripe

### 6. To-dos screen
- Currently a stub in more.tsx
- Needs dedicated screen

### 7. Website + Stripe + onboarding
- zaeli.app domain
- Payment processing
- Family onboarding flow

### 8. Remove AI toggle before launch
- Settings AI engine toggle is for testing only
