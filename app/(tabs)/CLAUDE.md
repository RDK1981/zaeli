# CLAUDE.md — Zaeli Project Context
*Last updated: 19 March 2026 — Session 10 (GPT-5.4 mini live, brief context flow, mic, status bar, shopping fixes)*

---

## Who You Are Talking To
- **Richard** — beginner developer. Always give **full file rewrites**, easy copy-paste PowerShell commands, step by step
- Family: Anna (logged-in user), Richard, Poppy (12), Gab (10), Duke (8)
- Local path: `C:\Users\richa\zaeli` (Windows, PowerShell — no `&&` chaining)
- Repo: https://github.com/RDK1981/zaeli (private)
- **PowerShell rule:** `(tabs)` folder needs backtick escaping: `app\`(tabs`)\filename.tsx`
- **Full file rewrites only** — never partial diffs

---

## Stack
- React Native + Expo (iOS-first)
- Supabase (Postgres, Sydney ap-southeast-2, project ID: rsvbzakyyrftezthlhtd)
- Claude API — vision/scan calls only (Sonnet)
- OpenAI API — GPT-5.4 mini (all chat/briefs), Whisper (voice)
- expo-router (file-based routing)
- expo-av — audio recording for Whisper
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
// OpenAI uses max_completion_tokens (NOT max_tokens)
// Claude uses max_tokens
```

---

## AI Provider Architecture (CRITICAL)

### Default: GPT-5.4 mini for everything
`lib/zaeli-provider.ts` — default is `'openai'`

### Model routing
| Feature | Engine |
|---|---|
| All briefs (home/calendar/shopping/meals) | GPT-5.4 mini |
| All zaeli_chat conversations | GPT-5.4 mini |
| Channel greetings | GPT-5.4 mini |
| Brief-to-chat continuation | GPT-5.4 mini |
| Receipt/pantry scanning | Claude Sonnet vision |
| Whisper transcription | OpenAI Whisper-1 |
| Homework (future) | Claude Sonnet always |

### CRITICAL: OpenAI uses `max_completion_tokens` not `max_tokens`
Claude API still uses `max_tokens`. Never mix these up.

### Toggle
Settings → AI Engine — for testing only, remove pre-launch

---

## Zaeli Persona v9 (GPT-Optimised)
- Anne Hathaway energy — smart, warm, magnetic, cheeky opener always backed by smart/thoughtful
- Australian warmth — "Love", "brilliant" natural. **NEVER "mate" or "guys"**
- Dry wit when earned, never forced
- Short by default, expand when useful
- Never start with "I"
- Hard moments = fewest words
- Encouragement earned and specific, never generic
- 1-2 emojis naturally, never forced
- Signature lines: "I thrive on chaos" / "The obligations, I'm afraid, persist" / "Tonight is completely yours — just breathe" / "She needs her person. Go be her hero"
- Reference doc: `zaeli-persona-v9.html` (Downloads folder)

---

## Brief Architecture

### All briefs fetch their own data directly
Do NOT rely on component state — it may not be loaded yet when brief fires.
Calendar, Shopping, Meals briefs all fetch from Supabase inside generateBrief().

### Brief firing
| Screen | Fires when | Cache |
|---|---|---|
| Home | Cold start / 2hr threshold | briefGenRef |
| Calendar | useFocusEffect, once per day | module-level cache |
| Shopping | useFocusEffect, 30min or count change | module-level cache |
| Meals (DinnersTab) | useFocusEffect, always regenerates | mealBriefCache |

### Date handling in briefs (CRITICAL)
- Always use local date construction: `` `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}` ``
- NEVER use `now.toISOString().split('T')[0]` — UTC shifts date by 1 day in AEST
- Events passed to GPT must be labelled (TODAY), (TOMORROW), or (DayName YYYY-MM-DD)
- GPT instruction: "NEVER calculate dates yourself — use labels exactly as provided"
- Callbacks (past events): only reference events where start_time < now

### Meal brief count
- Window: today + 6 days (NOT +7, that gives 8 days)
- Always fetch from Supabase directly, not from meals state
- Pass exact unplanned day names to GPT — never let GPT calculate count

---

## Brief-to-Chat Context Flow

### How it works
1. Brief CTA taps → `router.push` with `seedMessage: briefText`
2. `zaeli-chat.tsx` useEffect5 detects seedMessage → calls `loadBriefContinuation`
3. `loadBriefContinuation` uses `params.channel` directly (not `activeCtx`) to avoid timing issues
4. GPT picks up exactly where the brief left off

### Critical: useEffect ordering in zaeli-chat
- useEffect5 (seedMessage): `deps=[]` — fires on mount, uses params.channel
- useEffect6 (greeting): `deps=[activeCtx]` — skips entirely if seedMessage is set
- autoMic useEffect: `useFocusEffect` — AFTER startRecording is defined

---

## zaeli-chat.tsx Architecture

### Channel system
Channels: General, Calendar, Shopping, Meals, Kids, Travel
- Channel is passed as `params.channel` from each screen
- `activeCtx` synced from params via useEffect3
- Each channel has its own system prompt + seeds
- Tabs removed from UI but architecture intact

### Blank screen fix
useEffect6 checks `channelMessages[activeCtx].length === 0` — reloads greeting even if loadedChans has the channel (fixes re-navigation blank)

### Shopping data
- Query limit: 100 items (was 30 — caused "item not found" errors)
- fmtShop slice: 100 items (was 20)
- `ns=true` always — shopping data always loaded regardless of message keywords

### Status bar
- Root `<View style={{flex:1,backgroundColor:'#fff'}}>` wraps everything
- `<StatusBar style="dark"/>` inside root View
- `<SafeAreaView edges={['top']}>` wraps ONLY the header
- Chat content and KeyboardAvoidingView are siblings to SafeAreaView
- `useFocusEffect` with `RNStatusBar.setBarStyle('dark-content', true)` forces dark on focus

### Render structure (CORRECT pattern)
```
<View flex:1 white>           ← root
  <StatusBar dark/>
  <SafeAreaView edges=['top']>  ← header ONLY
    <View hdr/>
  </SafeAreaView>
  <View flex:1>               ← chat content
    <ScrollView/>
  </View>
  <KeyboardAvoidingView/>     ← input
</View>
```

### Mic (autoMic)
- All screen mic buttons navigate to chat with `autoMic:'true'` param
- `useFocusEffect` in zaeli-chat auto-starts recording (800ms delay)
- MUST be placed AFTER `startRecording` is defined (arrow function, not hoisted)

---

## Screen Status

| File | Status | Notes |
|---|---|---|
| `app/(tabs)/index.tsx` | ✅ | Home, brief, mic → chat with autoMic |
| `app/(tabs)/calendar.tsx` | ✅ | Brief fetches own events (UTC fix), mic |
| `app/(tabs)/shopping.tsx` | ✅ | Both mic buttons wired, 100 item limit |
| `app/(tabs)/zaeli-chat.tsx` | ✅ | Full GPT, blank fix, status bar, autoMic, no "mate" |
| `app/(tabs)/mealplanner.tsx` | ✅ | GPT brief, mic, correct unplanned count |
| `app/(tabs)/more.tsx` | ✅ | AI Engine toggle |
| `lib/zaeli-provider.ts` | ✅ | Default = 'openai' |

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
- SafeAreaView `edges={['top']}` for all screens
- zaeli-chat: SafeAreaView wraps HEADER ONLY — not full screen
- No floating FAB anywhere
- Logo taps → home (`router.replace('/(tabs)/')`)
- PowerShell: no `&&` — use separate lines
- Always `npx expo start --clear` after copying files
- Full file rewrites only

---

## Admin Dashboard
- **URL:** https://incomparable-gumdrop-32e4ba.netlify.app
- **Known issues:** USD/AUD mix, AI toggle buttons not clicking, brief costs using wrong model
- Redeploy: drag `Downloads/zaeli-admin/index.html` to Netlify

---

## Pricing (confirmed viable)
| Plan | Price AUD |
|---|---|
| Family plan | A$14.99/month |
| Homework add-on | A$9.99/child |

GPT-5.4 mini economics:
- Realistic family (300 chat, 15 scans): A$6.43 cost → 74% margin
- Heavy use (1000 chat, 90 scans): A$12.80 cost → 49% margin

---

## What's Next (priority order)
1. **Admin console fixes** — USD/AUD, toggle buttons, brief cost model
2. **Homework module** — Socratic method, grade-aware, Sonnet, biggest revenue lever
3. **Kids Hub redesign** — jobs, rewards, homework
4. **Multi-user / family sync**
5. **Website** (zaeli.app)
6. **Stripe + onboarding**
7. **Push notifications**
8. **Remove AI toggle** before launch

---

## Known Working / Verified
- GPT-5.4 mini live for all briefs and chat ✓
- Shopping list loads 100 items to Zaeli ✓
- Calendar brief fetches own events (no state timing issue) ✓
- Meal brief fetches own meals + explicit unplanned count ✓
- Brief-to-chat context flow from all screens ✓
- Mic auto-starts recording from all screens ✓
- Status bar visible in zaeli-chat ✓
- No "mate" in persona ✓
- TODAY/TOMORROW event labels prevent date hallucination ✓
- Past events only shown as callbacks if start_time < now ✓
