## Zaeli App — New Chat Handover
*22 March 2026 — Session 14 complete. Copy this entire message to start a new chat.*

---

Hi! I'm continuing development of **Zaeli** — an iOS-first AI family life platform built in React Native / Expo. We've been building this together across many sessions. Please read this carefully before we start.

---

### How I like to work
- I'm a **beginner developer** — always give me **full file rewrites** I can copy-paste, never partial diffs
- One PowerShell command at a time, never chained with &&
- Copy files with: `Copy-Item "C:\Users\richa\Downloads\file.tsx" "C:\Users\richa\zaeli\app\(tabs)\file.tsx"`
- Explain what you're doing in plain English before diving into code
- **Design before code** — for any new screen, discuss and show an HTML mockup first
- The **Zaeli persona is the most important thing** — every response must feel like a switched-on friend, never a chatbot
- **ROI matters** — every feature decision should consider retention and revenue impact

---

### Who I am
- My name is Richard. Logged-in user is Anna
- Family: Anna, Richard, Poppy (Yr6, age 11, girl), Gab (Yr4, age 9, BOY — Gabriel, he/him), Duke (Yr1, age 6, boy)
- Local path: C:\Users\richa\zaeli (Windows, PowerShell)
- Repo: https://github.com/RDK1981/zaeli (private)
- Admin: https://incomparable-gumdrop-32e4ba.netlify.app

---

### Key constants
```
DUMMY_FAMILY_ID = '00000000-0000-0000-0000-000000000001'
SONNET    = 'claude-sonnet-4-6'
GPT_MODEL = 'gpt-4o-mini'
CRITICAL: zaeli-chat.tsx calls OpenAI directly via fetch — does NOT use callGPT from zaeli-provider.
expo-file-system: always import from 'expo-file-system/legacy' (SDK 54)
```

---

### What's been built (all working as of 22 Mar 2026)

**Core screens — all complete:**
- index.tsx — Home brief, floating bar, scroll arrow, mic, GPT
- calendar.tsx — Calendar brief, mic, logging
- shopping.tsx — Shopping + Pantry + Spend tabs, both mics, logging
- zaeli-chat.tsx — Major rewrite Session 14 (see below)
- mealplanner.tsx — Meal planner, GPT brief, mic, logging
- more.tsx — Hub + Settings + AI toggle (remove pre-launch)
- voice-overlay.tsx — First-session mic → Whisper → zaeli-chat seedMessage

**Tutor module:**
- tutor.tsx — Hub: kids list, Zaeli noticed card (speaks TO kids)
- tutor-child.tsx — Child zone: 3 full-width mode cards, recent sessions tappable
- tutor-session.tsx — Homework Help: full-width layout, vision+GPT pipeline, all icons
- tutor-practice.tsx — Built, camera fixes applied, **needs UX review**
- tutor-reading.tsx — Built, camera fixes applied, **needs UX review**

---

### zaeli-chat.tsx — Session 14 full rewrite (22 Mar 2026)

Everything below was fixed or built this session:

**1. SVG icon rows under every message (exact replica of previous design):**
- Zaeli: timestamp · Play ▷ · Copy · Forward/Share · Thumb Up · Thumb Down
- User: timestamp · Copy · Forward (right-aligned)
- Thumbs toggle colour state (teal = up, coral = down)
- Play is placeholder — ElevenLabs integration to come

**2. Image vision — now matches Homework Help pipeline:**
- Claude Sonnet 4.6 reads the image first (2–4 sentence description)
- Description passed to GPT as IMAGE CONTEXT in system prompt
- GPT-4o-mini responds with full awareness of image content
- `expo-file-system/legacy` used (SDK 54 deprecation fix)

**3. Standard messages fixed:**
- Removed broken dependency on `callGPT` from zaeli-provider (was undefined)
- Now uses `callOpenAI()` helper — direct fetch to OpenAI inside the file

**4. User message bubble:**
- Blue (#0057FF) rounded bubble, white text, squared bottom-right corner
- Zaeli messages remain full-width, no bubble

**5. Keyboard push-up fixed:**
- Input bar moved inside KAV as normal flow (was absolute — broke keyboard)
- Then restored to floating absolute + KAV wraps the whole scroll+input container
- Final structure: KAV → scrollWrap (flex:1, relative) → [ScrollView + absolute inputArea]

**6. Time-aware system prompt (`buildSystemPrompt()`):**
- Injects exact real date, time, day name, time-of-day frame into every call
- Late night flag (9pm–6am): focuses on tomorrow, acknowledges the hour
- Zaeli never guesses the day or calls it "typical"

**7. Zaeli can take platform actions:**
- System prompt tells her she CAN add calendar events, shopping items, todos
- Supabase table names + fields included in prompt
- She confirms and acts — never redirects user to do it themselves

**8. Scroll-down arrow:** fades in/out when scrolled up, same style as home screen

**9. Logo:** blue star box (#0057FF), white ✦, yellow a and i (#FFE500) — matches home screen

**10. Header symmetry:** 16px spacer between Online pill and hamburger — matches back button left gap

**11. Floating input bar:** `position: absolute`, transparent bg, white pill with shadow, matches home screen exactly

---

### Known issues / watch points
- `ImagePicker.MediaTypeOptions` is deprecated in SDK 54 — still works, will need updating eventually
- `expo-av` is deprecated — will need migration to `expo-audio` / `expo-video` before SDK 54 cutoff
- AI toggle in more.tsx should be removed before launch
- DUMMY_FAMILY_ID hardcoded — needs real auth before launch

---

### Immediate next priorities (in order)

1. **tutor-practice.tsx UX review** — full-width layout, input bar, icons (same pass as tutor-session)
2. **tutor-reading.tsx UX review** — same pass
3. **ElevenLabs Play button** — wire up voice playback for Zaeli responses in zaeli-chat + tutor-session
4. **Whisper logging** — voice transcriptions not yet logged to api_logs
5. **Home brief quality pass** — implement zaeli-brief-logic-spec.md fully
6. **To-dos screen** — currently stub in more.tsx
7. **Floating bar rollout** — roll the floating pill input bar across Calendar, Shopping, Mealplanner, More
8. **Website + Stripe + onboarding**
9. **Multi-user / family sync**
10. **Pre-launch cleanup** — remove AI toggle, replace DUMMY_FAMILY_ID with real auth

---

### Tech reminders
- Always `npx expo start --clear` after changes
- Import paths from app/(tabs)/: `../../lib/supabase`, `../../lib/api-logger`, `../../lib/zaeli-provider`
- Supabase: rsvbzakyyrftezthlhtd (Sydney, ap-southeast-2)
- Admin file: C:\Users\richa\Downloads\zaeli-admin\index.html → drag to Netlify to redeploy
- expo-file-system: import from `expo-file-system/legacy`
- KAV pattern for chat screens: KAV (behavior='padding') → View (flex:1, position:relative) → [ScrollView + absolute inputArea]. scrollContent paddingBottom ≥ 110.

---

**Please confirm you've read this. First priority next session: tutor-practice.tsx UX review — or tell me what you'd like to tackle first.**
