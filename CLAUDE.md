# CLAUDE.md — Zaeli Project Context
*Last updated: 1 April 2026 — Home card stack rebuild ✅ Pass 1 + Pass 2 complete ✅*

---

## Who You Are Talking To
- **Richard** — beginner developer. Always give **full file rewrites**, easy copy-paste PowerShell commands, one step at a time
- Never give partial diffs or targeted edits unless it's a single truly isolated line
- Always explain what you're doing in plain English before diving into code
- Family: Rich (logged-in user), Anna, Poppy (Yr6, age 12, girl), Gab (Yr4, age 10, BOY — Gabriel, always he/him), Duke (Yr1, age 8, boy)
- Local path: `C:\Users\richa\zaeli` (Windows, PowerShell — no && chaining)
- Repo: https://github.com/RDK1981/zaeli (private)
- PowerShell escape for (tabs) folder: `Copy-Item "C:\Users\richa\Downloads\file.tsx" "C:\Users\richa\zaeli\app\(tabs)\file.tsx"`
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

**Unit economics (confirmed 31 Mar 2026):**
- shopping_chat / meals_chat (Sonnet): ~A$0.01–0.03/call
- home_brief: ~A$0.0004/call · home_calendar: ~A$0.0008/call · home_chat (Sonnet): ~A$0.01/call
- calendar_chat (Sonnet): ~A$0.009/call · whisper: ~A$0.0007/call
- shopping_category: A$0 (local keyword lookup)
- Real MTD cost March 2026: A$3.17 / 1,048 calls
- Only Home generates a brief on cold open — no brief on channel transitions

---

## Zaeli Persona (LOCKED)

Sharp, warm, genuinely enthusiastic about this family. Finds the funny angle through delight, not detachment. Celebrates small wins. Spots chaos before it arrives.

**Hard rules:**
- NEVER "mate", "guys" — Never start with "I" — Plain text only
- Always ends on a confident offer — never a bare open question
- BE PROPORTIONATE — never manufacture drama
- **Banned words:** "queued up", "locked in", "tidy", "sorted", "lined up", "all set", "stacked neatly", "ambush", "sprint", "chaos", "chaotic"

---

## Stack
- React Native + Expo (iOS-first), dev build on iPhone 11 Pro Max
- Supabase (Postgres, Sydney ap-southeast-2, ID: rsvbzakyyrftezthlhtd)
- Claude Sonnet (`claude-sonnet-4-20250514`) — all tool-calling channels + vision
- OpenAI GPT-5.4 mini (`gpt-5.4-mini`) — home_brief, home_calendar, Tutor conversation
- OpenAI Whisper-1 — voice transcription
- expo-router, expo-image-picker, react-native-svg, expo-file-system (chat persistence)
- Poppins font (UI), DMSerifDisplay (hero titles)
- No bottom tab bar — Zaeli is the only navigation

---

## Key Constants
```
DUMMY_FAMILY_ID = '00000000-0000-0000-0000-000000000001'
SONNET          = 'claude-sonnet-4-20250514'  ← NOT claude-sonnet-4-6
GPT_MINI        = 'gpt-5.4-mini'             ← NOT gpt-4.1-mini (retired)
OpenAI = max_completion_tokens · Claude = max_tokens. Never mix.
KAV must have backgroundColor:'#fff'
always await supabase inserts
Send button = #FF4545 coral ALWAYS
isActionQuery() runs BEFORE isCalendarQuery()
Apostrophes in JSX: always double-quoted strings
expo-file-system import = 'expo-file-system/legacy'
Do NOT use @react-native-async-storage — requires native rebuild
NEVER use literal newlines inside JSX strings {"..."} or regex /.../  — use \n escape
stopPropagation on nested TouchableOpacity inside tappable parent rows
Modal stacking iOS: close modal 1 → setTimeout 350ms → open modal 2
```

---

## API Logging
```
Table: api_logs
Columns: family_id, feature, model, input_tokens, output_tokens, cost_usd, created_at
CRITICAL: input_tokens / output_tokens — NOT prompt_tokens / completion_tokens
CRITICAL: total_tokens column does NOT exist
```
Admin: https://incomparable-gumdrop-32e4ba.netlify.app

---

## Navigation Model (LOCKED)
- No channel navigation UI — Zaeli is the only navigation
- **Avatar tap:** Our Family · Tutor · Settings · Sign out
- Always `router.navigate()` — never push() or replace()

---

## Channel Architecture
```
app/(tabs)/index.tsx          → Home ✅ REBUILD COMPLETE (1 Apr 2026)
app/(tabs)/calendar.tsx       → Calendar ✅ COMPLETE
app/(tabs)/shopping.tsx       → Shopping ✅ REBUILD COMPLETE (31 Mar)
app/(tabs)/mealplanner.tsx    → Meals ✅ REBUILD COMPLETE (1 Apr)
app/(tabs)/todos.tsx          → Todos + Reminders (design ✅ — not yet built)
app/(tabs)/kids.tsx           → Kids Hub (design ✅ — not yet built)
app/(tabs)/notes.tsx          → Notes (design ✅ — not yet built)
app/(tabs)/travel.tsx         → Travel (no design yet)
app/(tabs)/family.tsx         → Our Family (design ✅ — not yet built)
app/(tabs)/tutor.tsx          → Tutor (design ✅ — needs rebuild)
lib/use-chat-persistence.ts   → ✅ Shared persistence hook
```

---

## Per-Channel Colour System (LOCKED)

| Channel | Banner bg | AI colour | Accent (dark) |
|---------|-----------|-----------|---------------|
| Home | `#F5EAD8` | `#A8D8F0` Sky Blue | `#0A7A3A` |
| Calendar | `#B8EDD0` | `#F0C8C0` Warm Blush | `#0A7A3A` |
| Shopping | `#EDE8FF` Lavender | `#D8CCFF` Deeper Lavender | `#5020C0` |
| Meals | `#FAC8A8` | `#A8E8CC` Fresh Green | `#C84010` |
| Kids Hub | `#A8E8CC` | `#FAC8A8` Warm Peach | `#0A6040` |
| Tutor | `#D8CCFF` | `#A8E8CC` Fresh Green | `#5020C0` |
| To-dos | `#F0DC80` | `#D8CCFF` Lavender | `#806000` |
| Notes | `#C8E8A8` | `#F0C8C0` Warm Blush | `#2A6010` |
| Travel | `#A8D8F0` | `#B8EDD0` Soft Mint | `#0060A0` |
| Our Family | `#F0C8C0` | `#D8CCFF` Lavender | `#A01830` |

**CRITICAL:** Send button = `#FF4545` coral always. Body bg = `#FAF8F5` warm white always.
No left-border accent strips. Shopping 'a' and 'i' = `#A8E8CC` mint.

---

## Family Member Colours (LOCKED)
```
Rich: #4D8BFF · Anna: #FF7B6B · Poppy: #A855F7 · Gab: #22C55E · Duke: #F59E0B
```

---

## Banner Spec (LOCKED — matches Shopping)
- Wordmark: DM Serif 40px, letter-spacing -1.5, lineHeight 44, ink body, channel AI colour on 'a' and 'i'
- Channel name: Poppins 600 16px `rgba(0,0,0,0.45)` — **RIGHT side** next to hamburger
- Tab pills **inside banner**: `rgba(0,0,0,0.08)` bg, borderRadius 22, padding 3, fontSize 13, paddingVertical 8
- Divider: 1px `rgba(0,0,0,0.08)` below banner

---

## CANONICAL CHAT BAR SPEC (LOCKED ✅)

```
barPill: borderRadius:30, paddingVertical:14, paddingHorizontal:16, borderWidth:1
  bg:#fff, borderColor:rgba(10,10,10,0.09)
  ├── barBtn 34×34 → IcoPlus
  ├── barSep 1×18px rgba(10,10,10,0.1)
  ├── TextInput fontSize:15 Poppins_400Regular maxHeight:100 multiline
  ├── barMicBtn 32×32 → IcoMic color="#F5C8C8" size={26}
  │     OR barWaveBtn 40×40 borderRadius:20 bg=channel AI colour (recording)
  └── barSend 32×32 borderRadius:16 bg=#FF4545
inputArea: position:absolute bottom:0 paddingBottom:iOS?30:18 paddingHorizontal:14
KAV: behavior=padding backgroundColor='#fff'
Our Family: NO chat bar.
```

---

## SCROLL ARROWS SPEC (LOCKED ✅)

```
scrollArrowPair: position:absolute, bottom:110, right:16, flexDirection:row, gap:8, zIndex:50
scrollArrowBtn:  width:38, height:38, borderRadius:19, bg:rgba(10,10,10,0.40)
Up → scrollTo({y:0}) · Down → scrollToEnd()
```
**Implemented:** Shopping ✅ · Calendar ✅ · Meals ✅ · Home ✅
**Next:** Todos

---

## CHAT PERSISTENCE SPEC (LOCKED ✅)

`lib/use-chat-persistence.ts` — expo-file-system/legacy, 24hr TTL, 30-msg cap, debounced saves.
**Greeting guard:** `if (!chatLoaded || messages.length > 0) return;`
```typescript
const { messages, setMessages, clearMessages, loaded } = useChatPersistence('home');
// Keys in use: 'shopping' | 'calendar' | 'meals' | 'home'
// Next: 'todos'
```
**Wired:** Shopping ✅ · Calendar ✅ · Meals ✅ · Home ✅

---

## HOME CHANNEL — CARD STACK (LOCKED ✅ 1 Apr 2026)

### Architecture
- **Hybrid screen:** Card stack (glanceable) at top → Zaeli chat below, all in one ScrollView
- **Fixed banner:** Slim warm `#F5EAD8` bar — wordmark + Home label + hamburger + avatar only
- **Scrollable hero:** Date divider → Zaeli eyebrow (✦ Zaeli + timestamp) → DM Serif hero text → cards → "Earlier today" divider → chat thread

### Time state (computed fresh on mount)
- **AM (5–12):** Calendar → Weather+Shopping → Actions → Dinner
- **PM (12–20):** Dinner → Calendar → Actions → Weather+Shopping
- **Evening (20–5):** Calendar(tomorrow) → Actions(2-section) → Weather+Shopping → Dinner(tomorrow)

### Live data (fetched on mount + every useFocusEffect)
- `events` — today + tomorrow, filtered (no all-day, no midnight-anchored)
- `shopping_items` — `.neq('checked', true)`, select `id,name,item,category,checked`
- `todos` — `.or('status.eq.active,done.eq.false')`
- `meal_plans` — 7 days via `day_key` field (primary date field)
- Open-Meteo API — weather, Tewantin lat -26.39, lon 153.03, free no key needed

### shopping_items — CRITICAL column names
```
Columns: id, family_id, item, completed, created_at, name, checked, category, meal_source
NO 'quantity' column — it does not exist
Query: .select('id,name,item,category,checked').neq('checked', true)
Render: item.name || item.item
```

### Card specs

**CalendarCard** — slate `#3A3D4A`, padding 20
- 4 events default. Overflow: "X more ›" expands inline. "Show less ∧" collapses.
- Rows: time (13px) · dot · title+emoji (Poppins 400 17px) · avatars (30px)
- + Add → seeds chat. Full → Calendar channel.

**WeatherCard** — sky blue `#A8D8F0`, width 115px
- Open-Meteo live. Animated icons (pulse/drift/drip/flash).

**ShoppingCard** — lavender `#D8CCFF`, flex 1
- Up to 3 items (Poppins 400 17px). Big count bottom right.
- + Add → seeds chat. Full → Shopping channel.

**ActionsCard** — gold `#F0DC80`, padding 20
- Circle tick: optimistic UI → Supabase write → Zaeli chat acknowledgement
- Ticked items stay visible (struck through, 0.45 opacity)
- Evening: "🌙 Put out tonight" + "🌅 Tomorrow morning" sections
- + Add → seeds chat. Full → Todos channel.

**DinnerCard** — peach `#FAC8A8`, padding 20
- Tonight/tomorrow meal. "Next 7 days ›" expands inline 7-day strip.
- Expanded: emoji + name + ✓ or "Nothing yet ⚠". Unplanned count in footer.
- "Open meal planner ›" → Meals channel.

### Font sizes in cards (LOCKED)
- Content text: Poppins 400 17px (event titles, shopping items, action items)
- Dinner meal name: Poppins 800 19px
- Times / eye labels / buttons: 11–13px (UI chrome)
- Empty states: 16px italic

### Card data refresh
- On mount + useFocusEffect → `loadCardData()`
- After any tool action → `setTimeout(loadCardData, 1200)`

---

## MEALS CHANNEL — REBUILD COMPLETE (✅ 1 Apr 2026)

- Three tabs: Dinners · Recipes · Favourites
- One shared chat, Claude Sonnet tool-calling, `useChatPersistence('meals')`
- **meal_plans primary date field: `day_key`** (YYYY-MM-DD) — planned_date set to same value on insert
- cook_ids: always parse via parsedMeals (Supabase jsonb sometimes returns as string)

---

## inlineData Architecture (LOCKED)
```typescript
inlineData?: {
  type: 'calendar' | 'todos' | 'shopping' | 'meals' | 'kids';
  intro?: string; followUp?: string; items?: any[]; showPortalPill?: boolean;
}
```

---

## Supabase Tables
```
events         → id, family_id, title, date, start_time, end_time, notes, assignees, all_day, repeat_rule, alert_rule, timezone
todos          → id, family_id, title, priority, status, done, done_at, due_date, assigned_to, reminder_type, created_at
shopping_items → id, family_id, name, item, checked, completed, category, meal_source, created_at (NO quantity column)
pantry_items   → family_id, ...
receipts       → family_id, store, purchase_date, total_amount, item_count, items (jsonb), raw_text, created_at
family_members → ...
api_logs       → family_id, feature, model, input_tokens, output_tokens, cost_usd, created_at
meal_plans     → family_id, day_key, planned_date, meal_name, meal_type, source, prep_mins, cook_ids (jsonb), notes, ingredients (jsonb)
recipes        → family_id, name, source_type, prep_mins, tags (jsonb), notes, ingredients (jsonb)
reminders      → NOT YET CREATED (SQL in ZAELI-PRODUCT.md)
```

---

## Coding Rules
- SafeAreaView edges={['top']} always · No floating FAB
- Logo taps = router.navigate('/(tabs)/')
- PowerShell: no && — separate lines
- Always npx expo start --dev-client (--clear for bundle issues)
- Date: local construction — NEVER toISOString()
- KAV backgroundColor: `#fff` · Send button: `#FF4545` always
- Channel body bg: `#FAF8F5` — never full colour bleed
- No left-border accent strips · Apostrophes in JSX: double-quoted strings
- expo-file-system: `'expo-file-system/legacy'`
- No literal newlines in JSX strings or regex — use `\n`
- stopPropagation on nested tappable inside tappable row
- Modal stacking: close → setTimeout 350ms → open

---

## Screen Status

| File | Status | Notes |
|---|---|---|
| index.tsx | ✅ Rebuild complete | Card stack Pass 1+2 — 1 Apr 2026 |
| calendar.tsx | ✅ Complete | Persistence + arrows 31 Mar |
| shopping.tsx | ✅ Rebuild complete | Lavender, Sonnet, persistence |
| mealplanner.tsx | ✅ Rebuild complete | Full spec — 1 Apr 2026 |
| lib/use-chat-persistence.ts | ✅ Complete | expo-file-system, 24hr, 30-msg |
| todos.tsx | ✅ Design complete | Not built — create reminders table first |
| kids.tsx | ✅ Design complete | Not built |
| family.tsx | ✅ Design complete | Not built |
| notes.tsx | ✅ Design complete | Not built |
| travel.tsx | No design | Design session needed |
| tutor/* | ✅ Design complete | Needs rebuild |

---

## Next Priorities

1. **Create reminders Supabase table** (SQL in ZAELI-PRODUCT.md)
2. **Todos + Reminders** (todos.tsx) — `zaeli-todos-reminders-v2.html`
3. **Kids Hub** (kids.tsx)
4. **Our Family** (family.tsx)
5. **Notes** (notes.tsx)
6. **Tutor rebuild** — `zaeli-tutor-final-mockup-v4.html`
7. **Travel** — design session first

### Home — deferred items (next Home session)
- Review card UX based on real device usage feedback
- Weather: wire to real user location (currently hardcoded Tewantin/Noosa)
- Actions circle un-tick (currently one-way — Todos channel handles this for now)
- "All done" evening state — green card, Zaeli celebration

**Deferred:** model cost review · real auth · EAS · Stripe · Settings
