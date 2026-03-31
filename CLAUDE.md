# CLAUDE.md — Zaeli Project Context
*Last updated: 1 April 2026 — Meals channel full rebuild ✅ Recipe/Favourites detail modals ✅ Shopping ingredient review ✅*

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
app/(tabs)/index.tsx          → Home ✅ COMPLETE
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
**Implemented:** Shopping ✅ · Calendar ✅ · Meals ✅
**Next:** Home · Todos

---

## CHAT PERSISTENCE SPEC (LOCKED ✅)

`lib/use-chat-persistence.ts` — expo-file-system/legacy, 24hr TTL, 30-msg cap, debounced saves.
**Greeting guard:** `if (!chatLoaded || messages.length > 0) return;`
```typescript
const { messages, setMessages, clearMessages, loaded } = useChatPersistence('meals');
// Keys in use: 'shopping' | 'calendar' | 'meals'
// Next: 'home' | 'todos'
```
**Wired:** Shopping ✅ · Calendar ✅ · Meals ✅

---

## MEALS CHANNEL — REBUILD COMPLETE (✅ 1 Apr 2026)

### Architecture
- Three tabs inside banner: Dinners · Recipes · Favourites
- One shared chat across all tabs (Calendar/Shopping model)
- Claude Sonnet tool-calling: `plan_dinner`, `remove_dinner`, `add_to_favourites`
- Chat persistence via `useChatPersistence('meals')`

### Dinners tab — LOCKED decisions
- **All 7 nights identical** — no special tonight hero. Tonight is a normal row.
- **Date label above each card** — outside the card. Tonight: "Tonight · Tuesday 1 Apr" Poppins 700 terracotta. Others: "Wednesday 2 Apr" Poppins 400 muted.
- **Planned rows** — `rgba(168,232,204,0.18)` green tint, mint border
- **Unplanned rows** — dashed terracotta border
- **Cook avatars** — right side, `CookAvatarsGrid` 30px, 1-2 stacked · 3-4 in 2×2 grid
- **Prep badge** — inline left under meal name (not on right column)
- **Heart** — `🩷` emoji no box, 22px, absolute on emoji box corner
- **Move night** — lifted to main screen level to prevent iOS nested modal crash; uses `dinnersRefreshKey` counter to refresh DinnersTab after move

### MealDetailModal (any night tap)
- Green "See full recipe →" primary
- "Done" neutral dark
- "+ Shopping" · "Move night" · "Remove" ghost row
- Heart in header → saves to Favourites
- `onSeeRecipe` → recipe view modal | `onShopping` → ShoppingReviewModal

### ShoppingReviewModal
- Spoonacular meal → Claude generates ingredient list
- Manual meal → blank empty state
- Tick/untick ingredients → confirm pushes ticked items to shopping list

### RecipeDetailModal — hardcoded data for 8 Spoonacular recipes (keyed by ID)
### FavouriteDetailModal — Detail / Edit / Plan modes in one modal

### cook_ids parsing (CRITICAL)
```typescript
const parsedMeals = meals.map(m => ({
  ...m,
  cook_ids: Array.isArray(m.cook_ids) ? m.cook_ids
    : typeof m.cook_ids === 'string'
      ? (() => { try { return JSON.parse(m.cook_ids as any); } catch { return []; } })()
      : [],
}));
```

---

## HOME CHANNEL — CARD STACK (LOCKED ✅ 31 Mar 2026)
[Full spec in ZAELI-PRODUCT.md]

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
events, todos, shopping_items, pantry_items, receipts, family_members, api_logs, tutor_sessions
meal_plans  → family_id, day_key, planned_date, meal_name, meal_type, source,
              prep_mins, cook_ids (jsonb), notes, ingredients (jsonb)
recipes     → family_id, name, source_type, prep_mins, tags (jsonb), notes, ingredients (jsonb)
reminders   → NOT YET CREATED (SQL in ZAELI-PRODUCT.md)
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
| index.tsx | ✅ Complete | Card stack spec locked 31 Mar |
| calendar.tsx | ✅ Complete | Persistence + arrows 31 Mar |
| shopping.tsx | ✅ Rebuild complete | Lavender, Sonnet, persistence |
| mealplanner.tsx | ✅ Rebuild complete | Full spec above — 1 Apr 2026 |
| lib/use-chat-persistence.ts | ✅ Complete | expo-file-system, 24hr, 30-msg |
| todos.tsx | ✅ Design complete | Not built — create reminders table first |
| kids.tsx | ✅ Design complete | Not built |
| family.tsx | ✅ Design complete | Not built |
| notes.tsx | ✅ Design complete | Not built |
| travel.tsx | No design | Design session needed |
| tutor/* | ✅ Design complete | Needs rebuild |

---

## Next Priorities

1. **Home card stack rebuild** (index.tsx) — `useChatPersistence('home')` + up/down arrows
2. **Create reminders Supabase table** (SQL in ZAELI-PRODUCT.md)
3. **Todos + Reminders** (todos.tsx) — `zaeli-todos-reminders-v2.html`
4. **Kids Hub** (kids.tsx)
5. **Our Family** (family.tsx)
6. **Notes** (notes.tsx)
7. **Tutor rebuild** — `zaeli-tutor-final-mockup-v4.html`
8. **Travel** — design session first

**Deferred:** model cost review · real auth · EAS · Stripe · Settings
