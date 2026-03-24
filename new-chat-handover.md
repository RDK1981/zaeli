## Zaeli App — New Chat Handover
*24 March 2026 — Session 17 complete. Copy this entire message to start a new chat.*

---

Hi! I'm continuing development of **Zaeli** — an iOS-first AI family life platform built in React Native / Expo. We've been building this together across many sessions. Please read this carefully before we start.

---

### How I like to work
- I'm a **beginner developer** — always give me **full file rewrites** I can copy-paste, never partial diffs
- One PowerShell command at a time, never chained with &&
- Copy files with: `Copy-Item "C:\Users\richa\Downloads\file.tsx" "C:\Users\richa\zaeli\app\(tabs)\file.tsx"`
- **HTML mockup first, always** — agree on exact design in HTML before writing any React Native code
- Explain what you're doing in plain English before diving into code
- The **Zaeli persona is the most important thing** — every response must feel like a switched-on friend, never a chatbot
- After every file copy: `npx expo start --dev-client` (R alone is not sufficient in dev build)

---

### Who I am
- My name is Richard, goes by **Rich**. Logged-in user in app is also **Rich**
- Family: Anna, Rich, Poppy (Yr6, age 12, girl), Gab (Yr4, age 10, BOY — Gabriel, he/him), Duke (Yr1, age 8, boy)
- Local path: C:\Users\richa\zaeli (Windows, PowerShell)
- Repo: https://github.com/RDK1981/zaeli (private)
- Admin: https://incomparable-gumdrop-32e4ba.netlify.app

---

### Key constants
```
DUMMY_FAMILY_ID = '00000000-0000-0000-0000-000000000001'
SONNET    = 'claude-sonnet-4-6'
GPT_MODEL = 'gpt-5.4-mini'
MEMBER_NAME = 'Rich'
expo-file-system: always import from 'expo-file-system/legacy' (SDK 54)
api_logs columns: input_tokens / output_tokens (NOT prompt_tokens/completion_tokens)
```

---

### Family colour system (LOCKED — used everywhere)
```
Rich:  #4D8BFF  Anna: #FF7B6B  Poppy: #A855F7  Gab: #22C55E  Duke: #F59E0B
```

---

### What was accomplished in Session 17 (24 March 2026)

**Apple Developer + Dev Build:**
- Apple Developer account approved, Bundle ID com.zaeli.app registered
- EAS build configured, dev build installed on iPhone 11 Pro Max
- App runs via `npx expo start --dev-client` — hot reload, no reinstall needed
- After every file copy restart is needed: Ctrl+C then `npx expo start --dev-client`

**API Logging Fixed:**
- Root cause: `api_logs` table uses `input_tokens`/`output_tokens` not `prompt_tokens`/`completion_tokens`
- All inserts were silently failing — now fixed in index.tsx
- Feature keys: `home_brief`, `chat_response`, `whisper_transcription`, `chat_vision`
- Admin dashboard restored and working with correct Supabase key

**Admin Dashboard:**
- Old Operations Centre dashboard restored to Netlify
- New Supabase anon key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...9ssTEwSxgY4B7nXxTEyKB3QDIoeCLh8yMo9jO-m5i-w`

**Persona fixes (index.tsx):**
- MEMBER_NAME changed from Anna → Rich
- Added rule: never end on bare question ("What do you need?" is explicitly forbidden)
- Must always offer something specific before leaving door open
- Match energy of what user sent all the way through

**Calendar screen — design fully locked in HTML mockup:**
- Colour: **Electric Red Coral #E8374B** — warm, electric, not pink, not magenta
- 4-version HTML mockup built (zaeli-calendar-v4.html) — this is gospel for the rewrite
- Day view: tinted background per person, no left border, person avatars, darker time text
- Month view: multi-colour family dots, legend, tinted bubble preview (same style as day view)
- Day/Month toggle only (Week removed)
- Floating chat bar: `+` · divider · "Chat with Zaeli…" · mic · send
- No brief card — removed entirely
- **Chat render: zero wrapper, full width, pixel-identical to dedicated screen**
- **Conversational edit flow**: tap event in chat → Zaeli responds → edit in 3 taps → no form
  - Quick replies: Time · Day · Who's coming · Title · Delete · Manual edit (last, faded)
  - "Manual edit" opens edit sheet as last resort only
- **Month tap in chat**: tap date → Zaeli responds → day events appear inline below month grid
- Supabase: `assignees` jsonb column added to events table (24 March 2026)
- Mock events inserted for all 5 family members across the week

**What's still broken / pending:**
- calendar.tsx needs full rewrite from scratch against zaeli-calendar-v4.html
- Blue keyboard tint — needs new EAS build (tintColor already set in app.json)
- zaeli-chat.tsx will become redundant once index.tsx handles everything

---

### Immediate next step
**Rewrite calendar.tsx from scratch** against `zaeli-calendar-v4.html` mockup. This is a clean rewrite — not a patch. All existing logic (Supabase queries, AddEventFlow, EventDetailModal, time picker, repeat rules) stays intact. Only the visual layer is replaced.

---

### Key design decisions locked (do not revisit)
- No floating FAB anywhere
- Hamburger menu only navigation  
- Tiles on home: Option C coloured footer bars
- To-dos: Gold `#B8A400`
- Logo on every screen taps → home (`router.replace('/(tabs)/')`)
- Chat bar: `+` · divider · placeholder · mic · send — matches home screen exactly
- Calendar accent: Electric Red Coral `#E8374B`
- Family colours locked (see above)
- Calendar event blocks: tinted bg only, NO left border, person avatars
- Chat renders: zero wrapper, full width, identical to dedicated screen
- Conversational edit preferred; form is last resort

---

### Tech reminders
- `npx expo start --dev-client` (not --clear) for dev build
- After EVERY file copy: Ctrl+C then restart
- Supabase: rsvbzakyyrftezthlhtd (Sydney ap-southeast-2)
- Admin file: C:\Users\richa\Downloads\zaeli-admin\index.html → drag to Netlify
- KAV pattern: KAV (behavior='padding') → View (flex:1, position:relative) → [ScrollView + absolute inputArea]
- SafeAreaView edges={['top']} always
- events table needs assignees column (already added)

---

**First priority: calendar.tsx full rewrite against zaeli-calendar-v4.html mockup.**
