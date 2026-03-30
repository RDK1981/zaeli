# CLAUDE.md — Zaeli Project Context
*Last updated: 30 March 2026 — Design Session complete (Tutor ✅ Kids Hub ✅ Our Family ✅)*

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
- Tutor margin at 500 turns/month: ~80% gross — healthy even at 1,000 turns (~60%)
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
CRITICAL: Send button is #FF4545 coral across ALL channels — never the channel AI colour
```

---

## API Logging (FIXED 26 Mar 2026)
```
Table: api_logs
Columns: family_id, feature, model, input_tokens, output_tokens, cost_usd, created_at
CRITICAL: column is input_tokens / output_tokens — NOT prompt_tokens / completion_tokens
CRITICAL: total_tokens column does NOT exist — never insert it
```

---

## Navigation Model (LOCKED)

**There is no channel navigation UI anywhere in the app.**
- Zaeli is the only navigation mechanism
- **Avatar (top right)** opens: Our Family, Tutor (premium badge), Settings, Sign out
- Always `router.navigate()` — never `router.push()` or `router.replace()`

---

## Channel Architecture (LOCKED)

```
app/(tabs)/index.tsx       → Home channel ✅ COMPLETE
app/(tabs)/calendar.tsx    → Calendar channel ✅ COMPLETE
app/(tabs)/shopping.tsx    → Shopping channel (needs colour refactor)
app/(tabs)/mealplanner.tsx → Meals channel (needs colour refactor)
app/(tabs)/kids.tsx        → Kids Hub channel (design ✅ — not yet built)
app/(tabs)/todos.tsx       → To-dos channel (not built)
app/(tabs)/notes.tsx       → Notes channel (not built)
app/(tabs)/travel.tsx      → Travel channel (not built)
app/(tabs)/family.tsx      → Our Family channel (design ✅ — not yet built)
app/(tabs)/tutor.tsx       → Tutor (standalone premium module — NOT a channel)
```

---

## Pill System (LOCKED)

**Portal pills:** Filled bg = destination channel bg. Arrow = accent colour. Max 3.
**Quick reply chips:** White bg, ink border `rgba(0,0,0,0.15)`. Conversation only.

---

## Per-Channel Colour System (LOCKED)

| Channel | Banner bg | AI colour | Accent (dark) |
|---------|-----------|-----------|---------------|
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

AI colour = eyebrow = send pill bg = portal pill bg. Send arrow always ink `#0A0A0A`.
**CRITICAL:** Chat bar send button = `#FF4545` coral always — never channel AI colour.
**Exception:** Calendar send uses `#B8EDD0` mint for two-row banner visual harmony.

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
- Bg: `#A8E8CC` Aqua Green, 3s hold
- Wordmark: DM Serif 96px, ink + `#FAC8A8` peach on 'a' and 'i', bounces in
- Greeting: "Good morning/afternoon/evening, Rich 👋" Poppins 400 18px
- Tagline: "LESS CHAOS. MORE FAMILY." Poppins 500 12px uppercase
- Peach loading dots, radial glow orbs

---

## Banner Spec (LOCKED)
- Wordmark: DM Serif 34px, letter-spacing -1.5px, ink body, ai letters in channel colour
- Channel name: Poppins 600, 13px, `rgba(0,0,0,0.5)`, right of wordmark
- Avatar: 32×32px, Rich's `#4D8BFF`
- Bg: always channel bg colour, does NOT go white on scroll
- Divider: 1px `rgba(0,0,0,0.08)`

---

## Chat Interface Spec (LOCKED)
- Zaeli messages: **NO bubble** — open text, full width, Poppins 15px/400, line-height 1.6
- User bubble: right-aligned, `#EDE8FF` bg, `border-radius: 16px 2px 16px 16px`
- Message actions on Zaeli: Play + Copy + Forward + ThumbUp + ThumbDown (26px, opacity 0.35)
- Quick reply chips below every Zaeli message that invites response

---

## CANONICAL CHAT BAR SPEC
```
inputArea: position:absolute, bottom:0, transparent bg
  paddingH:14, paddingBottom: iOS?30:18, paddingTop:10

barPill: borderRadius:30, paddingV:14, paddingH:16, borderWidth:1, shadow
  ├── barBtn 34×34 → IcoPlus 20×20 SVG stroke rgba(0,0,0,0.4)
  ├── barSep 1×18px rgba(10,10,10,0.1)
  ├── TextInput fontSize:15 Poppins_400Regular
  ├── barBtn 34×34 → IcoMic 20×20 SVG
  └── barSend 32×32 borderRadius:16 bg=#FF4545 arrow=white
```

KAV structure:
```
KAV behavior=padding offset=0 backgroundColor='#fff'
  └── contentWrap flex:1 position:relative
        ├── ScrollView
        └── inputArea position:absolute bottom:0
```

**Our Family has NO chat bar** — the only channel without one.

---

## Tool-Calling System (index.tsx)
**Tools:** `add_calendar_event`, `update_calendar_event`, `delete_calendar_event`, `add_todo`, `add_shopping_item`
- `search_date` (YYYY-MM-DD) narrows update/delete
- New events default assignees: ['2'] (Rich)
- Events table: `start_time` column (NOT `time`)
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
family_members  → family_id, name, colour, role, dob, year_level, email, has_own_login (bool)
api_logs        → family_id, feature, model, input_tokens, output_tokens, cost_usd, created_at
tutor_sessions  → family_id, child_id, subject, pillar, messages (jsonb), difficulty_band, duration_seconds, hints_used (jsonb), title, created_at
kids_jobs       → family_id, child_id, title, emoji, cadence, reward_points, created_by, approved (bool), paused (bool), created_at
kids_rewards    → family_id, child_id, name, emoji, points_cost, redeemed_at, approved_by, created_at
kids_points     → family_id, child_id, balance, lifetime_earned, updated_at
```

---

## Tutor Module (DESIGNED ✅ — not yet built)
Full spec in ZAELI-PRODUCT.md. Key build notes:
- GPT-5.4-mini: conversation · Sonnet: photos · Whisper: voice
- Zaeli messages: open text, NO bubble
- Persistent 25/75 split pill: `[💡 Hint (1/3)] [Next question →]`
- Parent review: summary in Tutor, full transcript auth-gated, progress → Our Family only
- Curriculum: AC v9.0 ACARA · Foundation ≠ Year 1

---

## Kids Hub Channel (DESIGNED ✅ — not yet built)
Family plan. Colour: `#A8E8CC` / `#FAC8A8` peach / `#0A6040`.
- Age tiers: Little (Fn–Yr3) / Middle (Yr4–7) / Older (Yr8–12)
- Jobs: Daily/Weekly/One-off · GIPHY on every tick · Archive for one-offs
- Points: Philosophy B (currency) — spent on redemption, parent approves
- Rewards: parent sets name + cost · always affordable-now + saving-toward visible
- Games: Wordle · Word Scramble · Maths Sprint · Aussie Trivia · Mini Crossword (no points)
- Leaderboard: parent-toggleable, monthly reset
- Parent management: lives in Our Family

---

## Our Family Channel (DESIGNED ✅ — not yet built)
Colour: `#F0C8C0` / `#D8CCFF` lavender / `#A01830`. Avatar menu entry. **NO chat bar.**

**Opening brief (LOCKED):** DM Serif hero + Poppins detail. Active day: "3 things need your attention." Quiet day: subtle green "all good" strip. Brief is always present — content adapts.

**Four sections:**
1. **Pending Actions** — job proposals + reward requests. Collapses when empty.
2. **Our Kids** — per-child cards: name, age, year level, streak, balance, jobs done today, Tutor band. Tap → child detail.
3. **Family Profiles** — members with DOB, age auto-calculated, colour swatches, login status.
4. *(Settings moved to separate avatar destination)*

**Child detail view:** Tutor subject bars + difficulty bands + Zaeli written observation + recent sessions. Kids Hub stats + today's jobs mini-list.

**Pending action types:**
- Job proposals (green tag) — approve/edit points/decline
- Reward requests (red tag) — approve (deducts points)/decline
- Zaeli insights (purple tag) — occasional, actionable ("Poppy ready for Yr 7 Maths")

**Avatar notification badge:** Red dot with count on avatar when actions pending. Count shown on Our Family in the menu.

**Family member login model:**
- Parents: full email + password account
- Older kids (parent enables): own login, child-scoped view (Kids Hub + Tutor only)
- Young kids: profile only, use parent's device

**Settings:** Separate avatar menu destination (deferred — design when billing/auth ready).

**Mockup:** `zaeli-our-family-mockup-v1.html` — 6 screens.

---

## Coding Rules
- SafeAreaView edges={['top']} always
- No floating FAB
- Logo taps = router.navigate('/(tabs)/')
- PowerShell: no && — separate lines
- Always npx expo start --dev-client after changes
- Image picker: `['images'] as any`
- Date: local construction only — NEVER toISOString()
- KAV backgroundColor: `#fff`
- Send button: `#FF4545` always
- Our Family: no chat bar, no KAV needed

---

## Screen / Channel Status

| File | Status | Notes |
|---|---|---|
| index.tsx | ✅ Complete | Home channel |
| calendar.tsx | ✅ Complete | Session 22 |
| shopping.tsx | Needs colour refactor | |
| mealplanner.tsx | Needs colour refactor | |
| more.tsx | Deprecating | Settings → avatar menu |
| tutor/* | ✅ Design complete | Needs full rebuild |
| kids.tsx | ✅ Design complete | Not yet built |
| family.tsx | ✅ Design complete | Not yet built |
| todos.tsx | Not built | |
| notes.tsx | Not built | |
| travel.tsx | Not built | |
| zaeli-chat.tsx | DEPRECATED | |

---

## Next Priorities

**Design sessions — COMPLETE for this session:**
1. ✅ Tutor
2. ✅ Kids Hub
3. ✅ Our Family
4. 🔜 Settings (deferred — design when billing/auth ready)

**Build chat — immediate:**
1. Home inline calendar render
2. Shopping colour refactor
3. Meals colour refactor

**Build chat — new channels:**
4. Kids Hub (kids.tsx)
5. Our Family (family.tsx)
6. Tutor rebuild to new 11-screen spec
7. Todos, Notes, Travel

**Pre-launch:**
- Remove AI toggle + DEV button
- Real Supabase auth + family member login model
- EAS build, TestFlight for Anna
- Website + Stripe + onboarding
- Settings module (design + build)
