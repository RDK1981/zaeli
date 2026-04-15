## Zaeli App — New Chat Handover
*19 March 2026 — Session 10 complete. Copy this entire message to start a new chat.*

---

Hi! I'm continuing development of **Zaeli** — an iOS-first AI family life platform built in React Native / Expo. We've been building this together across many sessions. Please read this carefully before we start.

---

### How I like to work (important)
- I'm a **beginner developer** — always give me **full file rewrites** I can copy-paste, never partial diffs
- One PowerShell command at a time, never chained with `&&`
- Explain what you're doing in plain English before diving into code
- **Design before code** — for any new screen, discuss and show an HTML mockup first
- The **Zaeli persona is the most important thing** in the entire product — every response Zaeli gives must feel like a switched-on friend, never a chatbot. See persona rules in CLAUDE.md
- **ROI matters** — every feature decision should consider retention impact and revenue potential

---

### Who I am
- My name is Richard. Logged-in user is Anna (family: Anna, Richard, Poppy 12, Gab 10, Duke 8)
- Local path: `C:\Users\richa\zaeli` (Windows, PowerShell)
- PowerShell escape: `app\`(tabs`)\filename.tsx`
- Repo: https://github.com/RDK1981/zaeli (private)
- Admin: https://incomparable-gumdrop-32e4ba.netlify.app

---

### Key constants
```
DUMMY_FAMILY_ID = '00000000-0000-0000-0000-000000000001'
DUMMY_MEMBER_NAME = 'Anna'
GPT5_MINI = 'gpt-5.4-mini'
SONNET = 'claude-sonnet-4-6'
HAIKU  = 'claude-haiku-4-5-20251001'
```
**CRITICAL:** OpenAI = `max_completion_tokens`. Claude = `max_tokens`. Never mix.

---

### What's been built (all working as of 19 Mar 2026)

**AI engine:** GPT-5.4 mini is live as the default for everything — all briefs, chat, greetings, continuations. Claude Sonnet only for receipt/pantry vision scans.

**All screens complete:**
- ✅ Home (`index.tsx`) — brief, mic, GPT logging
- ✅ Calendar (`calendar.tsx`) — brief fetches own events, mic, GPT logging
- ✅ Shopping (`shopping.tsx`) — both mics wired, 100-item list, GPT logging
- ✅ Zaeli Chat (`zaeli-chat.tsx`) — full GPT, status bar, autoMic, no "mate", all logging
- ✅ Meal Planner (`mealplanner.tsx`) — GPT brief, mic, correct unplanned count, GPT logging
- ✅ More (`more.tsx`) — AI engine toggle (remove pre-launch)
- ✅ Admin console — real-world costs, AUD throughout, homework engine toggle

**Real-world costs verified today:**
- Chat: A$0.0037/msg avg (with tool calls)
- Brief: A$0.002/call avg
- 216 calls this month total cost: A$2.14
- At 300 msgs/month realistic family: ~A$1.50 API cost → ~85% margin

---

### Critical architecture (don't break these)

**Brief data fetching:** All briefs fetch their own data inside generateBrief() — never rely on component state (it won't be loaded yet).

**Date handling:** Always use local date construction — NEVER `toISOString().split('T')[0]` (UTC shifts in AEST).

**zaeli-chat render structure:**
```
<View flex:1 white>
  <StatusBar dark animated/>
  <SafeAreaView edges=['top']>   ← header ONLY
    <View hdr/>
  </SafeAreaView>
  <View flex:1><ScrollView/></View>
  <KeyboardAvoidingView/>
</View>
```

**autoMic:** Uses `useFocusEffect` — MUST be placed after `startRecording` is defined (arrow fn, not hoisted).

**Shopping:** `ns=true` always, query limit 100, fmtShop slice 100 — previous limits caused "item not found" errors.

**Persona:** NEVER "mate" or "guys". Anne Hathaway energy. Australian warmth. Reference: `zaeli-persona-v9.html` in Downloads.

---

### What we did in Session 10

1. **GPT-5.4 mini fully live** — all screens switched from Claude to GPT as default
2. **Brief-to-chat context flow** — CTA from any brief now opens chat in context (seedMessage)
3. **Mic auto-start** — all screen mic buttons navigate with `autoMic:'true'`, useFocusEffect fires recording
4. **Status bar fixed** — `RNStatusBar.setBarStyle` via useFocusEffect on every focus
5. **Shopping list** — increased to 100 items (was 20-30, causing "item not found" errors)
6. **Calendar brief** — fixed UTC date bug, now fetches own events directly
7. **Meal brief** — fixed 8-day window bug (+6 not +7), explicit unplanned day names to GPT
8. **No "mate"** — blocked in ZAELI_PERSONA and tone rules
9. **GPT logging** — all 8 call types now log to api_logs with real costs
10. **Admin console** — full AUD conversion, real-world GPT costs, homework engine toggle (Blend vs GPT)
11. **Brief continuation** — useEffect5 uses params.channel directly to avoid timing race
12. **Blank chat fix** — useEffect6 skips entirely when seedMessage is set

---

### The big decision for this session: Homework/Tutoring AI

This is the highest-priority feature and biggest revenue lever (A$9.99/child/month).

**Architecture question to discuss:**

**Option A — Tutoring AI as standalone module**
- Bold, premium feel
- Own screen with dedicated UX
- "Zaeli Tutor" or "Homework Helper" — feels like a product in itself
- Easier to market as a distinct add-on

**Option B — Inside Kids Hub**
- Kids Hub contains: jobs, rewards, homework helper
- More cohesive family view
- Kids Hub needs to be built first
- Homework is one tab among several

**Richard's lean:** Possibly bold standalone — discuss at start of new chat.

**The GPT question:** If GPT-5.4 mini can tutor as well as Sonnet/Haiku blend, saves A$4,200/month at 1,000 families. Need to test this in the new session — build with a toggle so we can compare quality live.

**Homework spec:**
- Socratic method — guide without giving answers
- Grade-aware (Poppy Yr 7, Gab Yr 5, Duke Yr 3)
- Subject detection (maths, English, science etc.)
- Step-by-step prompting
- Praise specific progress, never generic

---

### Remaining priorities after homework

1. GPT logging for Whisper (minor, completeness)
2. Home brief quality pass — implement full zaeli-brief-logic-spec.md
3. To-dos screen (currently stub in more.tsx)
4. Website (zaeli.app) + Stripe + onboarding
5. Multi-user / family sync
6. Remove AI toggle before launch

---

### Tech reminders
- Always `npx expo start --clear` after changes
- Import paths from `app/(tabs)/`: `../../lib/supabase`, `../../lib/api-logger`, `../../lib/zaeli-provider`
- Supabase: rsvbzakyyrftezthlhtd (Sydney, ap-southeast-2)
- Admin file: `C:\Users\richa\Downloads\zaeli-admin\index.html` → drag to Netlify to redeploy

---

**Please confirm you've read this and are ready to continue. First thing to discuss: standalone Tutoring AI screen vs part of Kids Hub — what's your recommendation and why?**
