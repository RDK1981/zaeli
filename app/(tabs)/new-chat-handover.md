## Zaeli App — New Chat Handover Brief
*19 March 2026 (Session 10) — copy this entire message to start a new chat*

---

Hi! I'm continuing development of the **Zaeli app** — a React Native / Expo iOS-first family life platform with GPT-5.4 mini AI at its core.

---

### Who you are talking to
- My name is Richard. Logged-in user is Anna (family: Anna, Richard, Poppy 12, Gab 10, Duke 8)
- Beginner developer — always **full file rewrites**, one copy-paste step at a time
- PowerShell: backtick escape `(tabs)`: `app\`(tabs`)\filename.tsx`
- Local path: `C:\Users\richa\zaeli` (Windows, PowerShell — no `&&`)
- Repo: https://github.com/RDK1981/zaeli (private)

---

### Key constants
```
DUMMY_FAMILY_ID = '00000000-0000-0000-0000-000000000001'
SONNET = 'claude-sonnet-4-20250514'
HAIKU  = 'claude-haiku-4-5-20251001'
GPT5_MINI = 'gpt-5.4-mini'
```
**CRITICAL:** OpenAI uses `max_completion_tokens`. Claude uses `max_tokens`. Never mix.

---

### Current state (Session 10 — 19 March 2026)

**GPT-5.4 mini is live as the default engine for everything:**
- All briefs (home/calendar/shopping/meals)
- All zaeli_chat conversations and greetings
- Brief-to-chat continuation
- Whisper voice input (unchanged)
- Claude Sonnet still used for receipt/pantry vision scans

**All screens working:**
- ✅ `index.tsx` — Home brief, mic → autoMic chat
- ✅ `calendar.tsx` — Brief fetches own events (UTC date fix), mic
- ✅ `shopping.tsx` — Both mic buttons wired, 100-item shopping list
- ✅ `zaeli-chat.tsx` — Full GPT, correct layout, status bar visible
- ✅ `mealplanner.tsx` — GPT brief, mic, correct unplanned night count
- ✅ `more.tsx` — AI Engine toggle (testing only, remove pre-launch)
- ✅ `lib/zaeli-provider.ts` — Default = 'openai'

---

### CRITICAL architecture notes

**Brief-to-chat context flow:**
- All screen brief CTAs pass `seedMessage: briefText` to zaeli-chat
- zaeli-chat useEffect5 detects seedMessage → `loadBriefContinuation(params.channel, seedMessage)`
- useEffect5 uses `params.channel` directly (NOT `activeCtx`) to avoid timing race
- useEffect6 (greeting) skips entirely when seedMessage is set

**zaeli-chat render structure (DO NOT change):**
```
<View flex:1 white>            ← root
  <StatusBar dark/>
  <SafeAreaView edges=['top']>  ← header ONLY
    <View hdr/>
  </SafeAreaView>
  <View flex:1>                ← chat content
    <ScrollView/>
  </View>
  <KeyboardAvoidingView/>      ← input at bottom
</View>
```

**Mic (autoMic):**
- All screen mic buttons navigate with `params.autoMic='true'`
- zaeli-chat uses `useFocusEffect` to auto-start recording (800ms delay)
- MUST be placed AFTER `const startRecording = async()=>{}` (arrow fn, not hoisted)

**Shopping data:**
- Query limit: 100 items, fmtShop slice: 100 items
- `ns=true` always — shopping always loaded regardless of keywords
- Previous limit of 20-30 caused "item not found" errors

**Date handling:**
- ALWAYS use local date: `` `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}` ``
- NEVER `now.toISOString().split('T')[0]` — UTC shifts date in AEST
- Events labelled (TODAY)/(TOMORROW)/(DayName YYYY-MM-DD) for GPT

**Brief data fetching:**
- All briefs fetch their own data inside generateBrief() — don't use component state
- Meal brief: 7-day window = today + 6 days (NOT +7, gives 8 days)
- Pass exact unplanned day names to GPT, not just a count

**Persona:**
- NEVER "mate" or "guys" — blocked in ZAELI_PERSONA
- 1-2 emojis naturally, never forced
- Reference: `zaeli-persona-v9.html` in Downloads

---

### Immediate next priorities
1. **Admin console fixes:**
   - USD/AUD mix — all costs should be AUD
   - AI engine toggle buttons not clicking (onclick issue)
   - Brief costs should use GPT pricing when GPT selected
   - File: `Downloads/zaeli-admin/index.html` → drag to Netlify to redeploy
   - URL: https://incomparable-gumdrop-32e4ba.netlify.app

2. **Homework module** — biggest revenue lever (A$9.99/child add-on)
   - Socratic method (guide without giving answers)
   - Grade-aware
   - Always Claude Sonnet regardless of provider toggle

3. **Kids Hub redesign** — jobs, rewards, homework

4. **Multi-user / family sync**

5. **Website** (zaeli.app) + **Stripe + onboarding**

---

### Pricing confirmed viable
- GPT-5.4 mini at A$0.003/msg
- Realistic family: A$6.43/month cost → **74% margin at A$14.99+A$9.99**
- Heavy use: A$12.80/month cost → **49% margin**

---

### Tech reminders
- Import paths from `app/(tabs)/`: `../../lib/supabase`, `../../lib/api-logger`, `../../lib/zaeli-provider`
- Always `npx expo start --clear` after changes
- Upload files directly into chat before editing

---

Please confirm you've read this. **First priority is admin console fixes** — ask Richard to share the current `zaeli-admin/index.html` from his Downloads folder.
