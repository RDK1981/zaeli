# CLAUDE.md — Zaeli Project Context
*Last updated: 26 March 2026 — Session 21 complete (Calendar channel v3 build)*

---

## Who You Are Talking To
- **Richard** — beginner developer. Always give **full file rewrites**, easy copy-paste PowerShell commands, one step at a time
- Never give partial diffs or targeted edits unless it's a single truly isolated line
- Always explain what you're doing in plain English before diving into code
- Family: Rich (logged-in user), Anna, Poppy (Yr6, age 12, girl), Gab (Yr4, age 10, BOY — Gabriel, always he/him), Duke (Yr1, age 8, boy)
- Local path: `C:\Users\richa\zaeli` (Windows, PowerShell — no && chaining)
- Repo: https://github.com/RDK1981/zaeli (private)
- PowerShell rule: (tabs) folder needs backtick escaping: app\`(tabs`)\filename.tsx
- Full file rewrites only — never partial diffs
- Design before code — always discuss/mockup new screens before writing code
- **Two fixes at a time max** — bulk changes create too many variables when something breaks

---

## The Business

Zaeli is an iOS-first AI family life platform for Australian families with children.

**Revenue model:**
- Family plan: A$14.99/month
- Homework add-on: A$9.99/child/month
- 100% web sales (no App Store cut)

**Unit economics (updated 26 Mar 2026):**
- GPT-5.4 mini chat: ~A$0.003/msg (~250 in / 750 out tokens avg)
- Realistic family monthly API cost: ~A$1.50–2.00 → ~85% margin
- Only Home generates a brief on cold open — no brief on channel transitions

---

## Zaeli Persona

Core: Anne Hathaway energy — smart, warm, magnetic.
- Australian warmth. NEVER "mate" or "guys"
- Never start with "I"
- No asterisks or markdown bold in spoken responses — plain text only
- NEVER sound like a push notification or task manager
- Never ends on a bare open question — always offers something specific first

---

## Stack
- React Native + Expo (iOS-first), dev build on iPhone 11 Pro Max (bundle ID com.zaeli.app)
- Supabase (Postgres, Sydney ap-southeast-2, ID: rsvbzakyyrftezthlhtd)
- Claude Sonnet (`claude-sonnet-4-20250514`) — vision/scan only
- OpenAI GPT-5.4 mini (`gpt-5.4-mini`) — all chat/briefs/homework
- OpenAI Whisper-1 — voice transcription
- expo-router, expo-image-picker, react-native-svg
- Poppins font (UI), DMSerifDisplay (hero titles)
- No bottom tab bar — no channel nav UI — Zaeli is the only navigation

---

## Key Constants
```
DUMMY_FAMILY_ID = '00000000-0000-0000-0000-000000000001'
FAMILY_ID       = '00000000-0000-0000-0000-000000000001'
SONNET          = 'claude-sonnet-4-20250514'  ← CORRECT (NOT claude-sonnet-4-6)
GPT_MINI        = 'gpt-5.4-mini'             ← CORRECT (NOT gpt-4.1-mini — retired Feb 2026)
CRITICAL: OpenAI = max_completion_tokens. Claude = max_tokens. Never mix.
```

---

## API Logging (FIXED 26 Mar 2026)
```
Table: api_logs
Columns: family_id, feature, model, input_tokens, output_tokens, cost_usd, created_at
CRITICAL: column is input_tokens / output_tokens — NOT prompt_tokens / completion_tokens
CRITICAL: total_tokens column does NOT exist — never insert it

Feature names in use:
  home_brief            → Home cold-open brief
  chat_response         → Home chat messages
  calendar_chat         → Calendar channel Zaeli conversation
  chat_vision           → Claude vision (photo scan)
  whisper_transcription → Voice recording transcription
```

---

## Navigation Model (LOCKED)

**There is no channel navigation UI anywhere in the app.**
- No hamburger menu, no grid, no tab bar, no channel switcher
- Zaeli is the only navigation mechanism
- Avatar (top right) opens: Settings, Billing, Our Family, Tutor (premium badge)
- Always `router.navigate()` — never `router.push()` or `router.replace()`
- DEV ONLY: 📅 button next to Home avatar navigates to Calendar for testing (remove pre-launch)

---

## Channel Architecture (LOCKED)

```
app/(tabs)/index.tsx       → Home channel          ✅ Complete (Session 20)
app/(tabs)/calendar.tsx    → Calendar channel       ✅ Complete (Session 21)
app/(tabs)/shopping.tsx    → Shopping channel       Needs colour refactor
app/(tabs)/mealplanner.tsx → Meals channel          Needs colour refactor
app/(tabs)/kids.tsx        → Kids Hub channel       Not built
app/(tabs)/todos.tsx       → To-dos channel         Not built
app/(tabs)/notes.tsx       → Notes channel          Not built
app/(tabs)/travel.tsx      → Travel channel         Not built
app/(tabs)/family.tsx      → Our Family channel     Not built
app/(tabs)/tutor.tsx       → Tutor (standalone premium — NOT a channel)
```

---

## Pill System (LOCKED)

**Portal pills:** Filled bg = destination channel bg colour. Chevron in accent colour. Max 3.
**Quick reply chips:** White bg, ink border `rgba(0,0,0,0.15)`. Never navigate.

---

## Per-Channel Colour System (LOCKED)

| Channel | Banner bg | AI colour (letters/eyebrow/send/pills) | Accent dark |
|---------|-----------|----------------------------------------|-------------|
| Home | `#F5EAD8` | `#A8D8F0` Sky Blue | `#0A7A3A` |
| Calendar | `#B8EDD0` | `#F0C8C0` Warm Blush | `#0A7A3A` |
| Shopping | `#F0E880` | `#D8CCFF` Lavender | `#6A6000` |
| Meals | `#FAC8A8` | `#A8E8CC` Fresh Green | `#C84010` |
| Kids Hub | `#A8E8CC` | `#FAC8A8` Warm Peach | `#0A6040` |
| Tutor | `#D8CCFF` | `#A8E8CC` Fresh Green | `#5020C0` |
| To-dos | `#F0DC80` | `#D8CCFF` Lavender | `#806000` |
| Notes | `#C8E8A8` | `#F0C8C0` Warm Blush | `#2A6010` |
| Travel | `#A8D8F0` | `#B8EDD0` Soft Mint | `#0060A0` |
| Our Family | `#F0C8C0` | `#D8CCFF` Lavender | `#A01830` |

**The rule:** AI colour = eyebrow dot = send button bg = portal pill bg. Send button arrow always ink `#0A0A0A`. Wordmark body always ink.

**Exception:** Calendar send button uses `#B8EDD0` mint (matches page bg) not blush.

---

## Family Member Colours (LOCKED)
```
Rich:  #4D8BFF  ← logged-in user
Anna:  #FF7B6B
Poppy: #A855F7
Gab:   #22C55E
Duke:  #F59E0B
```

---

## Splash Screen (LOCKED)
- Bg: `#A8E8CC` Aqua Green, hold 3s → Home channel
- Wordmark: DM Serif 96px, ink + `#FAC8A8` peach on 'a' and 'i', bounces in
- Greeting: "Good morning/afternoon/evening, Rich 👋" Poppins 400 18px
- Tagline: "LESS CHAOS. MORE FAMILY." Poppins 500 12px uppercase
- Dots: 3 × 6px `#FAC8A8` peach, orbs top-right and bottom-left

---

## Home Channel — Design (LOCKED Session 20)

### Fixed top bar
- Wordmark: DM Serif 40px, ink + sky blue ai letters
- Right: "Home" Poppins 600 16px + Rich avatar 36×36 blue circle
- DEV: 📅 calendar shortcut between label and avatar (remove pre-launch)
- Divider `rgba(10,10,10,0.08)` below

### Brief
- GPT returns `{"hero":"[bracketed] key words","detail":"prose","replies":["..."]}`
- Hero: DM Serif 28px, [brackets] → italic DM Serif spans
- Detail: Poppins 15px chat message, brackets stripped
- Placeholder cycles 4s: "Chat with Zaeli…" → "Or just speak…" → "Ask anything…"
- Mic: `#F5C8C8` blush 26px, 32×32 touch target, no bubble
- Send: `#A8D8F0` sky blue, ink arrow

---

## Calendar Channel — Design (LOCKED Session 21)

### Banner — two rows, mint `#B8EDD0` bg
- Row 1: zaeli 40px (blush ai letters) + "Calendar" 15px + Rich avatar 36×36
- Row 2: full-width Day/Month toggle

### Day strip — white bg, PINNED above fixed divider
- Starts from today — no past days. 120 days forward.
- Today anchors LEFT always
- ACC red today pill, family colour dots under dates

### Fixed divider — permanent scroll boundary
- Everything above never scrolls

### Event Card spec (ONE component — used in Day view, Month preview, Home inline)
- Tinted bg: primary assignee colour at 9% opacity, no left accent bar
- Title: Poppins 600 18px
- Time: Poppins 500 14px
- Avatars: RIGHT side, column layout, 32×32, 12px initials
- Conflict: red tinted panel with dot, below time on left side
- Tap → EventDetailModal

### Zaeli opening prompt (client-side, no API call)
- 0 events: "Nothing locked in — want to add something?"
- 1 event: "Quiet one — just [title]. Anything to add or change?"
- 3+ events: "[X] things on today. Need anything added, moved, or flagged?"
- Conflict detected: leads with the conflict + fix chips

### Month view
- No day strip — banner → divider → scrollable content
- Tap date → events appear below grid (no view switch to Day)
- Toggle Month→Day: jumps to selected date in Day view

### Chat
- Self-contained Anthropic tool-calling (Option A)
- Tools: add/update/delete calendar_event
- One shared thread across Day and Month views
- Photo scan handled locally (no navigation to Home)

### Known issues (fix in Session 22)
- Past-date scheduling not flagged by Zaeli
- Photo scan past-date not flagged
- Location field missing from cards and forms
- Mic button dead (no handler)
- calendar_chat not appearing in admin logs
- "View events" shortcut pill not yet built

---

## CANONICAL CHAT BAR SPEC

```
barPill (borderRadius:30, paddingVertical:14, paddingHorizontal:16, borderWidth:1, shadow)
  ├── barBtn 34×34 → IcoPlus 20×20 stroke rgba(0,0,0,0.4)
  ├── barSep 1×18px rgba(10,10,10,0.1)
  ├── TextInput fontSize:15 Poppins_400Regular
  ├── barMicBtn 32×32 → IcoMic 26px #F5C8C8
  └── barSend 32×32 borderRadius:16 bg=channel send colour → IcoSend 16×16 ink #0A0A0A
```

KAV → contentWrap (relative) → ScrollView + inputArea (absolute bottom:0)

---

## Tool-Calling

**index.tsx:** add_calendar_event, update_calendar_event, delete_calendar_event, add_todo, add_shopping_item
**calendar.tsx:** add_calendar_event, update_calendar_event, delete_calendar_event (self-contained Option A)

**Critical rules:**
- search_date (YYYY-MM-DD) narrows update/delete to right occurrence
- New events default assignees: ['2'] (Rich)
- NEVER schedule to past — flag and ask user to confirm

---

## Supabase Tables
```
events         → date, start_time (ISO local), end_time, assignees (jsonb), notes
todos          → family_id, title, priority, status, due_date
shopping_items → family_id, name, category, quantity, checked
pantry_items   → family_id, name, category, stock_level
receipts       → family_id, store, purchase_date, total_amount, items (jsonb)
meal_plans     → family_id, date, meal_name, recipe_id
recipes        → family_id, name, ingredients, instructions
family_members → family_id, name, colour, role
api_logs       → family_id, feature, model, input_tokens, output_tokens, cost_usd, created_at
tutor_sessions → family_id, child_id, subject, messages (jsonb)
```

---

## Admin Dashboard
- URL: https://incomparable-gumdrop-32e4ba.netlify.app
- Deploy: drag `index.html` onto Netlify site dashboard
- Session 21: feature badge colours updated — green=calendar, gold=shopping, pink=vision, orange=whisper

---

## Coding Rules
- SafeAreaView edges={['top']} always
- No floating FAB
- Logo taps = router.navigate('/(tabs)/')
- PowerShell: no && — separate lines
- Always npx expo start --dev-client after changes
- Image picker: use `['images'] as any`
- Date: always local construction — NEVER toISOString() (UTC/AEST shift)
- renderHeroText(text, colour) — parses [brackets] → italic DM Serif spans

---

## Next Priorities (Session 22)

1. Verify Session 21 calendar fixes on device (strip anchor, fonts, avatars)
2. Past-date prompt rule — Zaeli flags if scheduling to past
3. Photo scan past-date rule — flag when scanned date is past
4. Location field — show in EventCard + Add/Edit forms
5. Mic wiring — connect calendar mic to voice recording
6. Admin logging — investigate calendar_chat not appearing
7. "View events" pill — shortcut when scrolled into chat
8. Shopping channel colour refactor (`#F0E880` / `#D8CCFF`)
