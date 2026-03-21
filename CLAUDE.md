# CLAUDE.md — Zaeli Project Context
*Last updated: 21 March 2026 — Session 13 complete*

---

## Who You Are Talking To
- **Richard** — beginner developer. Always give **full file rewrites**, easy copy-paste PowerShell commands, one step at a time
- Never give partial diffs or targeted edits unless it's a single truly isolated line
- Always explain what you're doing and why in plain English before diving into code
- Family: Anna (logged-in user), Richard, Poppy (Yr6, age 11, girl), Gab (Yr4, age 9, BOY — Gabriel, always he/him), Duke (Yr1, age 6, boy)
- Local path: `C:\Users\richa\zaeli` (Windows, PowerShell — no && chaining)
- Repo: https://github.com/RDK1981/zaeli (private)
- PowerShell rule: (tabs) folder needs backtick escaping: app\`(tabs`)\filename.tsx
- Full file rewrites only — never partial diffs
- Design before code — always discuss/mockup new screens before writing code

---

## The Business

Zaeli is an iOS-first AI family life platform for Australian families with children. Target: dual-income couples with primary school-aged children in metro areas.

**Revenue model:**
- Family plan: A$14.99/month
- Homework add-on: A$9.99/child/month
- 100% web sales (no App Store cut)

**Unit economics (verified 21 Mar 2026):**
- GPT-5.4 mini chat: A$0.0037/msg
- GPT-5.4 mini brief: A$0.002/call
- Claude Sonnet scan: A$0.03/receipt
- Homework GPT-5.4 mini: A$0.0037/msg
- Realistic family monthly API cost: ~A$1.50 → ~85% margin
- MTD cost 21 Mar: A$2.55 (admin console, aggregate query fix applied)

**Competitive landscape (March 2026):**
- OpenClaw — viral open-source AI agent (250K GitHub stars). Technical users only. Not direct threat but signals appetite.
- Claude Dispatch — Anthropic remote desktop agent. Professional focus, not families.
- Real threat: Apple. When agentic Siri ships (18-30 months), casual coordination gets absorbed.
- Strategy: build deep family-specific features (Tutor, brief intelligence, Zaeli noticed) that generic OS agents cannot replicate.

---

## Zaeli Persona

Core: Anne Hathaway energy — smart, warm, magnetic.
- Australian warmth. NEVER "mate" or "guys"
- Never start with "I"
- No asterisks or markdown bold in spoken responses — plain text only
- NEVER sound like a push notification or task manager

---

## Stack
- React Native + Expo (iOS-first)
- Supabase (Postgres, Sydney ap-southeast-2, ID: rsvbzakyyrftezthlhtd)
- Claude Sonnet 4.6 — vision/scan only
- OpenAI GPT-5.4 mini — all chat/briefs/homework/greetings
- OpenAI Whisper-1 — voice transcription
- expo-router, expo-av, react-native-svg
- Poppins font (UI), DMSerifDisplay (hero titles)
- No bottom tab bar — hamburger menu only

---

## Key Constants
```
DUMMY_FAMILY_ID = '00000000-0000-0000-0000-000000000001'
SONNET    = 'claude-sonnet-4-6'
GPT5_MINI = 'gpt-5.4-mini'
CRITICAL: OpenAI = max_completion_tokens. Claude = max_tokens. Never mix.
```

---

## Screen Status

| File | Status | Notes |
|---|---|---|
| index.tsx | Complete | Brief, mic, GPT logging |
| calendar.tsx | Complete | Brief fetches own events, mic, logging |
| shopping.tsx | Complete | Both mics, 100 items, logging |
| zaeli-chat.tsx | Complete | Full GPT, autoMic, logging |
| mealplanner.tsx | Complete | GPT brief, mic, correct count |
| more.tsx | Complete | AI toggle (remove pre-launch) |
| tutor.tsx | Complete | Hub, kids list, Zaeli noticed (kid-directed) |
| tutor-child.tsx | Complete | Child zone, full-width mode cards, recent sessions tappable |
| tutor-session.tsx | Complete | Homework Help — full-width layout, vision+GPT, all icons wired |
| tutor-practice.tsx | Built | Camera fixes applied, needs UX review |
| tutor-reading.tsx | Built | Camera fixes applied, needs UX review |

---

## Supabase Tables
```
events, todos, missions, shopping_items, pantry_items, receipts,
meal_plans, recipes, menus, family_members, api_logs, tutor_sessions
```

IMPORTANT: tutor_sessions needs messages column:
ALTER TABLE tutor_sessions ADD COLUMN IF NOT EXISTS messages jsonb DEFAULT '[]'::jsonb;

---

## Tutor Module

### Colour palette
```
T_DARK    = '#1A1A2E'  — Tutor hub hero
T_GOLD    = '#C9A84C'  — Practice mode
HW_INDIGO = '#1A5F7A'  — Homework Help deep teal
MAG       = '#E0007C'  — Reading & Speaking
```

### Homework Help rules (ABSOLUTE)
- NEVER give the answer to any calculation
- NEVER complete a step for the child
- Correct answer: confirm warmly, move to next step
- Wrong answer: hint only, no answer
- One step at a time, always end with a question
- Max 2-3 sentences, plain text (no asterisks/bold)

### Vision pipeline
1. Claude Sonnet 4.6 extracts SUBJECT/QUESTIONS/STUDENT_WORK/CLARITY at quality 0.9
2. GPT receives extraction, told NOT to show labels, restates question naturally then guides

### Session management
- resumeSessionId param present = load that session (loadSession)
- No resumeSessionId = fresh greeting (new session)
- useFocusEffect resets ALL state on every focus
- Save = silent save, stay in session, fade toast
- Back = mark complete, navigate to tutor-child
- Mode card buttons = always new session (no resumeSessionId)
- Recent session cards = pass their own resumeSessionId

### Full-width chat layout
Not bubbles — document style:
- Zaeli: left teal accent bar + full-width text
- Child: teal-tint background block, full width
- Photos: full-width 220px
- Icons: Play (placeholder/ElevenLabs), Copy (clipboard), Forward (Share sheet), ThumbUp/Down (colour state), Retry (regenerate last response)

---

## Admin Dashboard
- URL: https://incomparable-gumdrop-32e4ba.netlify.app
- File: C:\Users\richa\Downloads\zaeli-admin\index.html
- Redeploy: drag zaeli-admin folder to Netlify
- MTD fix: aggregate query + row limit raised to 2000

---

## Coding Rules
- SafeAreaView edges={['top']} always — handle bottom with paddingBottom:28
- No floating FAB anywhere
- Logo taps = router.replace('/(tabs)/')
- PowerShell: no && — separate lines
- Always npx expo start --clear after changes
- Keyboard: KeyboardAvoidingView behavior=padding + paddingBottom:28. NEVER use automaticallyAdjustKeyboardInsets alongside KAV.
- SVG icons: always react-native-svg components — never emoji for UI icons

---

## Next Priorities

1. Tutor module remaining:
   - tutor-practice.tsx UX review
   - tutor-reading.tsx UX review
   - Pass 4: Parent analytics (Zaeli noticed to Home screen, tutor summary to Our Family)
   - ElevenLabs Play button
   - Whisper logging to api_logs

2. Home brief quality pass — implement zaeli-brief-logic-spec.md

3. To-dos screen — currently stub in more.tsx

4. Website + Stripe + onboarding

5. Multi-user / family sync

6. Pre-launch: remove AI toggle, replace DUMMY_FAMILY_ID with real auth
