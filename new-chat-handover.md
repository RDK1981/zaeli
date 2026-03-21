## Zaeli App — New Chat Handover
*21 March 2026 — Session 13 complete. Copy this entire message to start a new chat.*

---

Hi! I'm continuing development of **Zaeli** — an iOS-first AI family life platform built in React Native / Expo. We've been building this together across many sessions. Please read this carefully before we start.

---

### How I like to work
- I'm a **beginner developer** — always give me **full file rewrites** I can copy-paste, never partial diffs
- One PowerShell command at a time, never chained with &&
- Explain what you're doing in plain English before diving into code
- **Design before code** — for any new screen, discuss and show an HTML mockup first
- The **Zaeli persona is the most important thing** — every response must feel like a switched-on friend, never a chatbot
- **ROI matters** — every feature decision should consider retention and revenue impact

---

### Who I am
- My name is Richard. Logged-in user is Anna
- Family: Anna, Richard, Poppy (Yr6, age 11, girl), Gab (Yr4, age 9, BOY — Gabriel, he/him), Duke (Yr1, age 6, boy)
- Local path: C:\Users\richa\zaeli (Windows, PowerShell)
- PowerShell escape: app\`(tabs`)\filename.tsx
- Repo: https://github.com/RDK1981/zaeli (private)
- Admin: https://incomparable-gumdrop-32e4ba.netlify.app

---

### Key constants
```
DUMMY_FAMILY_ID = '00000000-0000-0000-0000-000000000001'
SONNET    = 'claude-sonnet-4-6'
GPT5_MINI = 'gpt-5.4-mini'
CRITICAL: OpenAI = max_completion_tokens. Claude = max_tokens. Never mix.
```

---

### What's been built (all working as of 21 Mar 2026)

**Core screens — all complete:**
- index.tsx — Home brief, mic, GPT logging
- calendar.tsx — Calendar brief, mic, logging
- shopping.tsx — Shopping + Pantry + Spend tabs, both mics, logging
- zaeli-chat.tsx — Full multi-channel chat, GPT, autoMic, logging
- mealplanner.tsx — Meal planner, GPT brief, mic, logging
- more.tsx — Hub + Settings + AI toggle (remove pre-launch)

**Tutor module — built this session:**
- tutor.tsx — Hub: kids list, Zaeli noticed card (speaks TO kids not about them)
- tutor-child.tsx — Child zone: 3 full-width mode cards, recent sessions (tappable)
- tutor-session.tsx — Homework Help: full-width layout, vision+GPT pipeline, all icons
- tutor-practice.tsx — Practice quiz (camera fixes applied, needs UX review)
- tutor-reading.tsx — Reading & Speaking (camera fixes applied, needs UX review)

**Admin console:**
- URL: https://incomparable-gumdrop-32e4ba.netlify.app
- MTD cost tracking fixed: aggregate query + limit 2000 (was 500 — caused wrong totals)
- Verified cost 21 Mar: A$2.55 MTD

---

### Tutor module — detailed state

**Colours:**
- Tutor hub hero: T_DARK #1A1A2E
- Practice: T_GOLD #C9A84C
- Homework Help: HW_INDIGO #1A5F7A (deep teal)
- Reading: MAG #E0007C

**Homework Help chat (tutor-session.tsx):**
- Full-width document layout (not bubbles) — matches Claude/GPT chat style
- Zaeli messages: left teal accent bar, full width
- Child messages: teal-tint background block, full width
- Photos: full-width 220px
- Input bar: exact match to zaeli-chat (F7F7F7 box, borderRadius:18, mic in grey square, blue rounded-square send)
- 3 action buttons below input: Camera (direct), Upload (direct), Save (silent save + toast, stay in session)
- Back button: saves session as complete, navigates to child hub

**Vision pipeline:**
1. Claude Sonnet 4.6 at quality:0.9 extracts SUBJECT/QUESTIONS/STUDENT_WORK/CLARITY
2. GPT receives extraction, told NOT to show labels to child, restates question naturally, guides Socratically
3. Errors: Vision fail = specific retry message. GPT fail = shows raw extraction as fallback.
4. Both steps log to console for debugging

**Session management:**
- resumeSessionId param = load that session's messages from Supabase
- No resumeSessionId = fresh greeting (new session)
- useFocusEffect resets ALL state on every focus (messages, sessionId, subject, topic, feedback)
- Mode card buttons always create new sessions
- Recent session cards pass their own resumeSessionId
- IMPORTANT: tutor_sessions table needs messages column:
  ALTER TABLE tutor_sessions ADD COLUMN IF NOT EXISTS messages jsonb DEFAULT '[]'::jsonb;

**Tutor system prompt rules (ABSOLUTE):**
- NEVER give the answer to any calculation — not even as an example
- NEVER complete a step for the child
- Correct answer: confirm warmly, next step
- Wrong answer: hint only, redirect with question
- One step at a time, always end with a question
- Max 2-3 sentences, plain text (no asterisks/bold)

**Icons (all wired except Play):**
- Play: placeholder — will connect to ElevenLabs
- Copy: Clipboard.setString
- Forward: Share.share (iOS share sheet)
- ThumbUp/Down: colour state feedback (teal/magenta)
- Retry: removes last Zaeli message, regenerates
- IcoCamera, IcoUpload, IcoSaveSession: SVG line icons in action row

---

### What we discussed (off-topic but important)

**OpenClaw / NemoClaw:**
- OpenClaw = viral open-source AI agent, 250K GitHub stars, runs on messaging apps
- NemoClaw = NVIDIA enterprise stack on OpenClaw
- Claude Dispatch = Anthropic's remote Mac agent via phone (professional focus)
- None are direct Zaeli threats TODAY — all require technical setup families won't do
- Real threat: Apple shipping a proper agentic Siri in 18-30 months
- Strategy: build deep family features (Tutor, brief intelligence, Zaeli noticed) that generic agents can't replicate. Window is open now.

---

### Critical architecture reminders

**Brief data fetching:** Always fetch inside generateBrief() — never rely on component state.

**Date handling:** Always local date construction — NEVER toISOString().split('T')[0] (UTC shifts in AEST).

**Keyboard:** KeyboardAvoidingView behavior='padding' + paddingBottom:28 on input bar. NEVER use automaticallyAdjustKeyboardInsets alongside KAV — they conflict and cause gaps.

**SafeAreaView:** edges={['top']} only — handle bottom with paddingBottom:28 in input bar.

**zaeli-chat render structure (do not change):**
```
<View flex:1 white>
  <StatusBar dark animated/>
  <SafeAreaView edges=['top']>  ← header ONLY
    <View hdr/>
  </SafeAreaView>
  <View flex:1><ScrollView/></View>
  <KeyboardAvoidingView/>
</View>
```

---

### Immediate next priorities

1. **tutor-practice.tsx UX review** — same UX pass as homework (full-width layout, input bar, icons)
2. **tutor-reading.tsx UX review** — same pass
3. **Pass 4: Parent analytics** — Zaeli noticed card moves to Home screen as parent insight; tutor summary/activity/settings move to Our Family (parent-only)
4. **ElevenLabs Play button** — wire up voice playback for Zaeli responses
5. **Whisper logging** — voice transcriptions not yet logged to api_logs
6. **Home brief quality pass** — implement zaeli-brief-logic-spec.md fully
7. **To-dos screen** — currently stub in more.tsx
8. **Website + Stripe + onboarding**
9. **Multi-user / family sync**
10. **Pre-launch cleanup** — remove AI toggle, replace DUMMY_FAMILY_ID with real auth

---

### Tech reminders
- Always npx expo start --clear after changes
- Import paths from app/(tabs)/: ../../lib/supabase, ../../lib/api-logger, ../../lib/zaeli-provider
- Supabase: rsvbzakyyrftezthlhtd (Sydney, ap-southeast-2)
- Admin file: C:\Users\richa\Downloads\zaeli-admin\index.html → drag to Netlify to redeploy

---

**Please confirm you've read this. First priority: tutor-practice.tsx UX review, or tell me what you'd like to tackle first.**
