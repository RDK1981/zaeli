# CLAUDE.md — Zaeli Project Context
*Last updated: 30 March 2026 — Design Session (Tutor, Kids Hub, Our Family strategy)*

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
- **Two fixes at a time** — bulk changes create too many variables when something breaks

---

## The Business

Zaeli is an iOS-first AI family life platform for Australian families with children.

**Revenue model:**
- Family plan: A$14.99/month
- Tutor add-on: A$9.99/child/month
- 100% web sales (no App Store cut)

**Unit economics (confirmed 30 Mar 2026):**
- GPT-5.4 mini chat: ~A$0.003/msg
- Tutor hybrid (GPT mini chat + Sonnet vision): ~A$2.00/child/month at 500 turns
- Tutor margin at 500 turns/month: ~80% gross margin — healthy even at 1,000 turns (~60%)
- Only Home generates a brief on cold open — no brief on channel transitions (cost saving)

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
- Claude Sonnet (`claude-sonnet-4-20250514`) — vision/scan + Tutor photo checking
- OpenAI GPT-5.4 mini (`gpt-5.4-mini`) — all chat/briefs/Tutor conversation
- OpenAI Whisper-1 — voice transcription (all channels + Tutor Read Aloud)
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
CRITICAL: KAV must have backgroundColor:'#fff' — prevents channel colour bleeding behind keyboard
CRITICAL: always await supabase inserts — silent failures are the #1 logging bug
```

---

## API Logging (FIXED 26 Mar 2026)
```
Table: api_logs
Columns: family_id, feature, model, input_tokens, output_tokens, cost_usd, created_at
CRITICAL: column is input_tokens / output_tokens — NOT prompt_tokens / completion_tokens
CRITICAL: total_tokens column does NOT exist — never insert it
Logging confirmed working as of 26 March 2026
```

---

## Navigation Model (LOCKED 26 Mar 2026)

**There is no channel navigation UI anywhere in the app.**
- No hamburger menu listing channels
- No grid, no tab bar, no channel switcher
- **Zaeli is the only navigation mechanism** — she transitions channels based on conversation
- **Avatar (top right)** opens: Settings, Billing, Our Family, Tutor (premium badge)
- Always `router.navigate()` — never `router.push()` or `router.replace()`

---

## Channel Architecture (LOCKED 26 Mar 2026)

Everything is a channel. There are no dedicated screens. Each channel is a persistent chat with Zaeli where data renders inline.

```
app/(tabs)/index.tsx       → Home channel
app/(tabs)/calendar.tsx    → Calendar channel ✅ COMPLETE
app/(tabs)/shopping.tsx    → Shopping channel
app/(tabs)/mealplanner.tsx → Meals channel
app/(tabs)/kids.tsx        → Kids Hub channel (NEW — design complete, not built)
app/(tabs)/todos.tsx       → To-dos channel (NEW)
app/(tabs)/notes.tsx       → Notes channel (NEW)
app/(tabs)/travel.tsx      → Travel channel (NEW)
app/(tabs)/family.tsx      → Our Family channel (NEW — design in progress)
app/(tabs)/tutor.tsx       → Tutor (standalone premium module — NOT a channel)
```

**Tutor is separate** — premium add-on, own dedicated pages, accessible from avatar menu only.

---

## Pill System (LOCKED 26 Mar 2026)

Two distinct types — users learn the difference instinctively:

**Portal pills** (navigate to a channel / render data inline):
- Filled bg = destination channel's bg colour
- Arrow in channel's accent colour (dark)
- Max 3 shown at once
- Tap → data renders inline in current conversation

**Quick reply chips** (continue conversation only):
- White bg, ink border `rgba(0,0,0,0.15)`, ink text
- Do not navigate anywhere

---

## Per-Channel Colour System (LOCKED)

| Channel | Banner bg | AI letter / eyebrow / send / portal pills | Accent (dark) |
|---------|-----------|------------------------------------------|---------------|
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

**The rule:** AI letter colour = eyebrow colour = send button bg = portal pill bg. Send button arrow is always ink `#0A0A0A`. Wordmark body always ink.
**Exception:** Calendar send button uses `#B8EDD0` mint for visual harmony with the two-row banner.

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

## Splash Screen Spec (LOCKED — updated ZAELI-PRODUCT.md for latest values)
- Background: `#A8E8CC` Aqua Green, 3 second hold
- Wordmark: DM Serif Display 96px, ink body + `#FAC8A8` peach on 'a' and 'i', bounces in
- Greeting: "Good morning/afternoon/evening, Rich 👋" — Poppins 400, 18px
- Tagline: "LESS CHAOS. MORE FAMILY." — Poppins 500, 12px uppercase
- Loading dots: peach, animated pulse
- Radial glow orbs top-right and bottom-left for depth

---

## Banner Spec (all channels, LOCKED)
- Wordmark: DM Serif Display 34px, letter-spacing -1.5px, ink body, ai letters in channel colour
- Channel name: Poppins 600, 13px, `rgba(0,0,0,0.5)`, right of wordmark
- Avatar: 32×32px circle, Rich's colour `#4D8BFF` (logged-in user)
- Background: always channel bg colour — does NOT go white on scroll
- Divider: 1px `rgba(0,0,0,0.08)`

---

## Chat Interface Spec (LOCKED)
- Zaeli message text: Poppins 15px/400, line-height 1.6
- **Zaeli messages have NO bubble** — open text, full width. Only user messages are in bubbles.
- User bubble: right-aligned, `#EDE8FF` bg, `border-radius: 16px 2px 16px 16px`
- Message actions on Zaeli: Play + Copy + Forward + Thumbs Up + Thumbs Down (26px, opacity 0.35)
- Message actions on user: Copy + Forward (right-aligned)
- Quick reply chips below every Zaeli message that invites response

---

## CANONICAL CHAT BAR SPEC
*Apply identically to every channel. Full detail in ZAELI-CHAT-BAR-SPEC.md*

```
inputArea (position:absolute, bottom:0, transparent bg)
  paddingH:14, paddingBottom: iOS?30:18, paddingTop:10

barPill (borderRadius:30, paddingV:14, paddingH:16, borderWidth:1, shadow)
  ├── barBtn 34×34 → IcoPlus 20×20 SVG stroke rgba(0,0,0,0.4)
  ├── barSep 1×18px rgba(10,10,10,0.1)
  ├── TextInput fontSize:15, Poppins_400Regular
  ├── barBtn 34×34 → IcoMic 20×20 SVG
  └── barSend 32×32, borderRadius:16, bg=#FF4545 coral, arrow=white
```

**CRITICAL:** Send button is ALWAYS `#FF4545` coral across all channels — never the channel AI colour.

KAV structure (do not deviate):
```
KAV behavior=padding offset=0 backgroundColor='#fff'
  └── contentWrap flex:1 position:relative
        ├── ScrollView
        └── inputArea position:absolute bottom:0
```

---

## Tool-Calling System (index.tsx)

**Tools:** `add_calendar_event`, `update_calendar_event` (with `search_date`), `delete_calendar_event`, `add_todo`, `add_shopping_item`

**Critical rules:**
- `search_date` (YYYY-MM-DD) narrows update/delete to right occurrence
- New events default to assignees: ['2'] (Rich, blue)
- System prompt contains today's date as `${td}` for "tomorrow" calculations
- Events context query uses `start_time` column (NOT `time`)
- Context fetches 20 events across 7-day window

---

## Supabase Tables
```
events          → date, start_time (ISO local), end_time, assignees (jsonb), all_day (bool)
todos           → family_id, title, priority, status, due_date
shopping_items  → family_id, name, category, quantity, checked
pantry_items    → family_id, name, category, stock_level
receipts        → family_id, store, purchase_date, total_amount, items (jsonb)
meal_plans      → family_id, date, meal_name, recipe_id
recipes         → family_id, name, ingredients, instructions
family_members  → family_id, name, colour, role
api_logs        → family_id, feature, model, input_tokens, output_tokens, cost_usd, created_at
tutor_sessions  → family_id, child_id, subject, messages (jsonb), pillar, difficulty_band, duration_seconds, hints_used, title, created_at
kids_jobs       → family_id, child_id, title, status, reward_points, due_date (for Kids Hub)
```

---

## Tutor Module (DESIGNED 30 Mar 2026 — not yet built)

Full design spec in ZAELI-PRODUCT.md. Key technical notes for build:

**AI model split:**
- GPT-5.4-mini → all conversational turns (hints, encouragement, questions, feedback)
- Claude Sonnet → any turn involving a photo (homework sheet, writing sample, book cover)
- Whisper-1 → all voice input including Read Aloud sessions

**Tutor screen files (to be built):**
```
app/tutor/index.tsx          → Child selector screen
app/tutor/[child]/index.tsx  → Child home (6 pillars + sessions)
app/tutor/[child]/session.tsx → Active session (all pillars)
app/tutor/[child]/progress.tsx → Parent progress view
```

**Session UX — critical rules:**
- Zaeli messages are open text (NO bubble) — same as all channels
- Persistent 25/75 split pill above chat bar: `[💡 Hint (1/3)] [Next question →]`
- Hint pill greys out after Hint 3 used — Next pill always stays active
- Question progress bar below session header (coloured dots, Q3 of 6 label)
- Money & Life sessions use amber `#F59E0B` for Next pill and progress dots instead of purple

**Parent review split (LOCKED 30 Mar 2026):**
- Child sees: session list + simple summary only ("18 min, 6 questions, great session")
- Parent sees (authenticated): full transcript + hints used per question
- Full progress view (subject bars, difficulty bands, Zaeli observations) → Our Family only

**Curriculum source:** Australian Curriculum v9.0 (ACARA). All questions verified against official content descriptors. See zaeli-tutor-curriculum-map-v1.html for full Foundation–Year 12 mapping.

---

## Kids Hub Channel (DESIGNED 30 Mar 2026 — not yet built)

Part of the family plan (NOT premium). Channel colour: `#A8E8CC` bg / `#FAC8A8` peach AI colour.

Kids Hub is where children go for:
- **Jobs/Chores** — assigned tasks with reward points
- **Rewards** — redeem points, see progress toward goals
- **Fun educational games** — crosswords, Wordle-style word games, other light games

Kids Hub is completely separate from Tutor. No AI tutoring here — it's the kids' own space within the family plan.

*Full design to be completed in next design session.*

---

## Our Family Channel (DESIGNED 30 Mar 2026 — not yet built)

Channel colour: `#F0C8C0` bg / `#D8CCFF` lavender AI colour. Avatar menu entry.

Our Family is the parent-facing hub containing:
- **Family profiles** — members, colours, roles
- **Tutor progress** — full subject progress view per child (difficulty bands, Zaeli observations, time spent)
- **Session transcripts** — parent-authenticated full session review
- **Settings / Billing** — subscription management

*Full design to be completed in next design session.*

---

## Coding Rules
- SafeAreaView edges={['top']} always
- No floating FAB
- Logo taps = router.navigate('/(tabs)/')
- PowerShell: no && — separate lines
- Always npx expo start --dev-client after changes
- Image picker: use `['images'] as any` not deprecated MediaTypeOptions.Images
- Date: always local date construction — NEVER toISOString() (UTC shifts in AEST)
- KAV backgroundColor must be `#fff` — prevents channel bg bleeding behind keyboard

---

## Screen / Channel Status

| File | Status | Notes |
|---|---|---|
| index.tsx | ✅ Complete | Home channel — brief, mic, tool-calling, logging |
| calendar.tsx | ✅ Complete | Calendar channel — Session 22 |
| shopping.tsx | Needs colour refactor | Complete functionality |
| mealplanner.tsx | Needs colour refactor | |
| more.tsx | Deprecating | Settings moving to avatar menu |
| tutor/* | Design complete, needs rebuild | Full 11-screen spec designed 30 Mar |
| kids.tsx | Design pending | Next design session |
| todos.tsx | Not built | |
| notes.tsx | Not built | |
| travel.tsx | Not built | |
| family.tsx | Design pending | Next design session — holds Tutor progress |
| zaeli-chat.tsx | DEPRECATED | Replaced by index.tsx |

---

## Next Priorities

**Phase 1 — Stabilise:**
1. ✅ API logging fixed
2. ✅ Console.log cleanup
3. ✅ Calendar channel complete (Session 22)
4. Home inline calendar render (EventCards in Home chat thread)
5. Shopping channel colour refactor
6. Meals channel colour refactor

**Phase 2 — Design sessions (complete before building):**
7. Kids Hub design session → mockup → brief
8. Our Family design session → mockup → brief

**Phase 3 — New channel builds (after design):**
9. Kids Hub channel
10. Our Family channel
11. Todos channel
12. Notes channel
13. Travel channel

**Phase 4 — Tutor rebuild:**
14. Rebuild all tutor/* screens to new 11-screen spec
15. New Supabase tutor_sessions schema
16. Adaptive difficulty system
17. Parent review auth gate

**Pre-launch:**
- Remove AI toggle from more.tsx
- Remove DEV 📅 button from Home
- Replace DUMMY_FAMILY_ID with real Supabase auth
- New EAS build (keyboard tint fix)
- TestFlight build for Anna
- Website + Stripe + onboarding
