## Zaeli App — New Chat Handover
*19 March 2026 — Session 11 complete. Copy this entire message to start a new chat.*

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
- My name is Richard. Logged-in user is Anna (family: Anna, Richard, Poppy 11 Yr6 girl, Gab 9 Yr4 BOY (Gabriel), Duke 6 Yr1 boy)
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
SONNET = 'claude-sonnet-4-20250514'
HAIKU  = 'claude-haiku-4-5-20251001'
```
**CRITICAL:** OpenAI = `max_completion_tokens`. Claude = `max_tokens`. Never mix.
**CRITICAL:** OpenAI env var = `EXPO_PUBLIC_OPENAI_API_KEY` (NOT `EXPO_PUBLIC_OPENAI_KEY` — this mistake cost us a session!)

---

### What's been built (all working as of 19 Mar 2026 Session 11)

**Core screens — all complete:**
- ✅ Home (`index.tsx`) — brief, mic, GPT logging
- ✅ Calendar (`calendar.tsx`) — brief, mic, GPT logging
- ✅ Shopping (`shopping.tsx`) — both mics, 100-item list, GPT logging
- ✅ Zaeli Chat (`zaeli-chat.tsx`) — full GPT, autoMic, logging
- ✅ Meal Planner (`mealplanner.tsx`) — GPT brief, mic, logging
- ✅ More (`more.tsx`) — AI engine toggle (remove pre-launch)

**Tutor module — fully built this session:**
- ✅ `tutor.tsx` — Parent hub. Dark midnight hero. Child cards (active/locked). Zaeli noticed card (gold, briefCard style). Session data drives noticed text.
- ✅ `tutor-child.tsx` — Child home. Mode selector (Homework/Practice/Reading cards). Recent sessions with score badges (8/11). useFocusEffect refetches on every return.
- ✅ `tutor-session.tsx` — Homework Help. Socratic GPT chat. Photo (camera or library). Voice (Whisper). Session saved and completed on Back.
- ✅ `tutor-practice.tsx` — Practice Mode. MC questions (Middle Years) or show-working (Senior). Adaptive difficulty. No repeated questions. Three-stage wrong answer flow. Socratic bottom sheet ("🧠 Talk me through it"). Session saving + completion on Back.
- ✅ `tutor-reading.tsx` — Reading Mode. Photo page (camera or library). Record reading (Whisper). GPT feedback with accuracy/pacing/confidence scores.

---

### Tutor module — key decisions made

**Architecture:** Standalone premium module. Parent hub → child home → mode. Not inside Kids Hub.

**Pricing:** A$9.99/child/month. Duke locked (Year 1 — parents' choice). Poppy + Gab active.

**AI engine:** GPT-5.4 mini confirmed working well for all tutor functions. Sonnet only for vision (photo of work).

**Session model:** One session per screen visit. Starts on first answer. Completes on Back press. Subject change always creates new session (never overwrites). Questions answered + correct saved.

**Socratic sheet:** Always-available `🧠 Talk me through it` button. Animated.timing slide-up (380ms). Full screen. Voice + camera wired. Logs to session. [READY_TO_TRY] token triggers close button.

**Wrong answer flow:** Stage 1 (Zaeli redirect) → Stage 2 (💡 hint button) → Stage 3 (📝 whiteboard workings with actual numbers and method).

**Adaptive difficulty:** getDifficultyInstruction() from live correct/answered ratio. Zaeli acknowledges shifts naturally.

**No repeats:** askedQs[] array passed to GPT each question load.

---

### Supabase — family_members correct data
```
Anna    — parent, tutor_active: false
Richard — parent, tutor_active: false
Poppy   — child, Year 6, age 11, GIRL, tutor_active: true  (id: 81b7d721...)
Gab     — child, Year 4, age 9, BOY (Gabriel), tutor_active: true  (id: d0d5fb7a...)
Duke    — child, Year 1, age 6, boy, tutor_active: false → run SQL below to unlock
```
**IMPORTANT: Gab is a BOY — Gabriel. Always use he/him. Several "her" references may exist in the app — fix on sight.**

**Unlock Duke for weekend testing:**
```sql
update family_members
set tutor_active = true
where name = 'Duke'
and family_id = '00000000-0000-0000-0000-000000000001';
```

Old test records (Emma, Jack, Sarah, Dad) deleted. New columns added:
```sql
-- family_members: year_level integer, tutor_active boolean
-- tutor_sessions: questions_answered integer, questions_correct integer, status text
```

---

### Weekend testing — suggested focus per child

| Child | Age | Focus | Watch for |
|---|---|---|---|
| Poppy | 11, Yr6, girl | English + Maths, Socratic sheet | Is difficulty right? Does she engage with hints? |
| Gab | 9, Yr4, boy | Maths practice, wrong answer flow | Does hint → workings flow help him? |
| Duke | 6, Yr1, boy | Simple Maths, **voice input critical** | Can he use it independently? Voice working? |

---

### Critical bugs fixed this session

1. **Wrong env var** — `EXPO_PUBLIC_OPENAI_KEY` doesn't exist. Correct: `EXPO_PUBLIC_OPENAI_API_KEY`. All tutor screens updated.
2. **logApiCall doesn't exist** — `api-logger` only exports `callClaude`. GPT calls log inline to Supabase directly.
3. **Session overwrite on subject change** — Fixed: `changeSubject()` resets sessionId to null so new subject always creates new row.
4. **Next button race** — Fixed: `feedbackLoading` state disables Next until GPT feedback arrives.
5. **Socratic sheet ✕ blocked** — Fixed: TouchableWithoutFeedback was wrapping the whole sheet, swallowing taps. Moved to wrap chat ScrollView only.
6. **Sheet header too tall** — Fixed: Removed SafeAreaView inside Modal (causes double padding). Use paddingTop:52 directly.
7. **Keyboard gap** — Fixed: Removed manual insets padding from KAV, use `insets.bottom || 16`.

---

### Unit economics confirmed tonight

| Metric | Value |
|---|---|
| 10-question practice session | ~A$0.01 total |
| 50 sessions/child/month | ~A$0.50 API cost |
| Gross margin on A$9.99 Tutor | ~95% |
| 500 families revenue (base + tutor) | ~A$12,490/month |
| 500 families API cost | ~A$4,250/month |
| Profit at 500 families | ~A$6,700/month |
| GPT-5.4 mini quality verdict | ✅ Working well — keep it |

---

### Next session priorities (in order)

**0. Before anything — run Duke unlock SQL (30 seconds)**
```sql
update family_members set tutor_active = true
where name = 'Duke' and family_id = '00000000-0000-0000-0000-000000000001';
```

**1. Voice recording UI — all tutor screens**
Same pulsing red dot + "Recording…" indicator as home/calendar.
Critical for Duke (age 6) — voice is his primary input method.
Apply to: tutor-session, tutor-practice (Socratic sheet), tutor-reading.

**2. iPad layout pass — all tutor screens**
Add `isTablet` detection + `maxWidth: 600` centred content wrapper.
Goal: kids can test on iPad over the weekend.
```ts
const { width } = Dimensions.get('window');
const isTablet = width >= 768;
const CONTENT_WIDTH = isTablet ? 600 : width;
```

**3. ElevenLabs voice output**
Zaeli speaks her responses aloud — huge for Duke (age 6, Year 1).
Also great for all kids — feels like a real tutor in the room.
Discuss implementation approach at start of session.

**4. Fix Gab gender references**
Gab is a BOY (Gabriel). Check tutor screens for any "her/she" references and fix.

**5. Prompt audit / token optimisation**
Input:output ratio is 15:1. Trim system prompts 20-30%. Easy margin win.

**6. Home brief quality pass**
Implement zaeli-brief-logic-spec.md — callbacks, dinner logic, time windows.

**7. Tutor Activity + Settings tabs**
Activity: build once real session data exists.
Settings: licence management, eventually Stripe.

**8. PWA / laptop support**
For older kids (high school) doing homework on laptops.
Discuss approach — Expo Web vs proper PWA build.

**9. Website + Stripe + onboarding**

---

### Critical architecture reminders

**SafeAreaView inside Modal:** Don't use. Use `paddingTop: 52` on inner view instead.

**Photo pickers:** Always `Alert.alert` with camera + library options. Never `launchCameraAsync` directly.

**Back buttons:** Always `router.replace()` with explicit params. Never `router.back()`.

**Keyboard in chat screens:** `TouchableWithoutFeedback` wraps the ScrollView only — NOT the whole screen or modal.

**Brief data:** Always fetched fresh inside generateBrief(). Never from component state.

**Date handling:** Never `toISOString().split('T')[0]` — UTC shifts date in AEST.

**GPT logging (tutor):** Inline Supabase insert — no wrapper function.

**Claude vision (tutor):** `callClaude({ feature: 'receipt_scan', ... })` — logs automatically.

---

### Tech reminders
- Always `npx expo start --clear` after changes
- Import paths from `app/(tabs)/`: `../../lib/supabase`, `../../lib/api-logger`, `../../lib/zaeli-provider`
- Supabase: rsvbzakyyrftezthlhtd (Sydney, ap-southeast-2)
- Admin file: `C:\Users\richa\Downloads\zaeli-admin\index.html` → drag to Netlify to redeploy

---

**Please confirm you've read this and are ready to continue. First priority: voice recording UI on all three tutor screens.**
