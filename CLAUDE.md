# CLAUDE.md — Zaeli Project Context
*Last updated: 31 March 2026 — Shopping channel rebuild ✅ Chat persistence ✅ Calendar arrows + persistence ✅*

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
- shopping_chat (Sonnet): ~A$0.01–0.03/call (high input tokens — full context injection)
- home_brief: ~A$0.0004/call · home_calendar: ~A$0.0008/call · home_chat (Sonnet): ~A$0.01/call
- calendar_chat (Sonnet): ~A$0.009/call · whisper: ~A$0.0007/call
- shopping_category: A$0 (now local keyword lookup — was A$0.0005 × 5 per add)
- Real MTD cost March 2026: A$3.17 / 1,048 calls
- Only Home generates a brief on cold open — no brief on channel transitions

---

## Zaeli Persona (LOCKED Session 24)

Sharp, warm, genuinely enthusiastic about this family. Finds the funny angle through delight, not detachment. Celebrates small wins. Spots chaos before it arrives.

**Hard rules:**
- NEVER "mate", "guys" — Never start with "I" — Plain text only
- Always ends on a confident offer ("Say the word and I'll...") — never a bare open question
- BE PROPORTIONATE — never manufacture drama
- **Banned words:** "queued up", "locked in", "tidy", "sorted", "lined up", "all set", "stacked neatly", "ambush", "sprint", "chaos", "chaotic"

---

## Stack
- React Native + Expo (iOS-first), dev build on iPhone 11 Pro Max (bundle ID com.zaeli.app)
- Supabase (Postgres, Sydney ap-southeast-2, ID: rsvbzakyyrftezthlhtd)
- Claude Sonnet (`claude-sonnet-4-20250514`) — vision/scan + Tutor + home_chat + calendar_chat + shopping_chat
- OpenAI GPT-5.4 mini (`gpt-5.4-mini`) — home_brief, home_calendar, Tutor conversation
- OpenAI Whisper-1 — voice transcription (all channels + Tutor Read Aloud)
- expo-router, expo-image-picker, react-native-svg, expo-file-system (chat persistence)
- Poppins font (UI), DMSerifDisplay (hero titles)
- No bottom tab bar — no channel nav UI — Zaeli is the only navigation

---

## Key Constants
```
DUMMY_FAMILY_ID = '00000000-0000-0000-0000-000000000001'
SONNET          = 'claude-sonnet-4-20250514'  ← NOT claude-sonnet-4-6
GPT_MINI        = 'gpt-5.4-mini'             ← NOT gpt-4.1-mini (retired Feb 2026)
CRITICAL: OpenAI = max_completion_tokens. Claude = max_tokens. Never mix.
CRITICAL: KAV must have backgroundColor:'#fff'
CRITICAL: always await supabase inserts
CRITICAL: Send button is #FF4545 coral across ALL channels
CRITICAL: isActionQuery() runs BEFORE isCalendarQuery()
CRITICAL: Apostrophes in JSX: always double-quoted strings e.g. "What's on today"
CRITICAL: expo-file-system import = 'expo-file-system/legacy' (not 'expo-file-system')
```

---

## API Logging
```
Table: api_logs
Columns: family_id, feature, model, input_tokens, output_tokens, cost_usd, created_at
CRITICAL: input_tokens / output_tokens — NOT prompt_tokens / completion_tokens
CRITICAL: total_tokens column does NOT exist
CRITICAL: always await supabase inserts
```
Admin dashboard: https://incomparable-gumdrop-32e4ba.netlify.app

---

## Navigation Model (LOCKED)
- No channel navigation UI — Zaeli is the only navigation mechanism
- **Avatar (top right):** Our Family · Tutor (premium) · Settings · Sign out
- Always `router.navigate()` — never push() or replace()

---

## Channel Architecture
```
app/(tabs)/index.tsx          → Home channel ✅ COMPLETE
app/(tabs)/calendar.tsx       → Calendar ✅ COMPLETE + persistence + up/down arrows
app/(tabs)/shopping.tsx       → Shopping ✅ MAJOR REBUILD COMPLETE (31 Mar 2026)
app/(tabs)/mealplanner.tsx    → Meals (needs colour refactor)
app/(tabs)/kids.tsx           → Kids Hub (design ✅ — not yet built)
app/(tabs)/todos.tsx          → To-dos + Reminders (design ✅ — not yet built)
app/(tabs)/notes.tsx          → Notes (design ✅ — not yet built)
app/(tabs)/travel.tsx         → Travel (not built, no design yet)
app/(tabs)/family.tsx         → Our Family (design ✅ — not yet built)
app/(tabs)/tutor.tsx          → Tutor (standalone premium — NOT a channel)
lib/use-chat-persistence.ts   → ✅ Shared chat persistence hook
```

---

## Per-Channel Colour System (LOCKED)

| Channel | Banner bg | AI colour | Accent (dark) |
|---------|-----------|-----------|---------------|
| Home | `#F5EAD8` | `#A8D8F0` Sky Blue | `#0A7A3A` |
| Calendar | `#B8EDD0` | `#F0C8C0` Warm Blush | `#0A7A3A` |
| Shopping | `#EDE8FF` Lavender | `#D8CCFF` Deeper Lavender | `#5020C0` Deep Purple |
| Meals | `#FAC8A8` | `#A8E8CC` Fresh Green | `#C84010` |
| Kids Hub | `#A8E8CC` | `#FAC8A8` Warm Peach | `#0A6040` |
| Tutor | `#D8CCFF` | `#A8E8CC` Fresh Green | `#5020C0` |
| To-dos | `#F0DC80` | `#D8CCFF` Lavender | `#806000` |
| Notes | `#C8E8A8` | `#F0C8C0` Warm Blush | `#2A6010` |
| Travel | `#A8D8F0` | `#B8EDD0` Soft Mint | `#0060A0` |
| Our Family | `#F0C8C0` | `#D8CCFF` Lavender | `#A01830` |

**CRITICAL:** Chat bar send button = `#FF4545` coral always.
**Shopping logo 'a' and 'i':** `#A8E8CC` mint (not lavender — clashes on lavender banner).
**Colour bleed rule:** Channel bg = banner + status bar ONLY. Body = `#FAF8F5` warm white.
No left-border accent strips on cards — use dots, icons, badges instead.

---

## Family Member Colours (LOCKED)
```
Rich: #4D8BFF · Anna: #FF7B6B · Poppy: #A855F7 · Gab: #22C55E · Duke: #F59E0B
```

---

## Splash Screen (LOCKED)
- Bg: `#A8E8CC`, 3s · Wordmark: DM Serif 96px, ink + `#FAC8A8` peach on 'a' and 'i'
- Greeting: Poppins 400 18px · Tagline: "LESS CHAOS. MORE FAMILY." Poppins 500 12px uppercase

---

## Banner Spec (LOCKED)
- Wordmark: DM Serif **40px**, letter-spacing -1.5px, lineHeight 44, ink body, channel AI colour letters
- Channel name: Poppins 600, **16px**, `rgba(0,0,0,0.45)`
- Avatar: 32×32px, Rich's `#4D8BFF`
- Bg: always channel bg colour · Divider: 1px `rgba(0,0,0,0.08)`

---

## ══════════════════════════════════
## CANONICAL CHAT BAR SPEC (LOCKED ✅ 31 Mar 2026)
## ══════════════════════════════════

```
barPill: borderRadius:30, paddingVertical:14, paddingHorizontal:16, borderWidth:1
  bg:#fff, borderColor:rgba(10,10,10,0.09)
  ├── barBtn 34×34 → IcoPlus color="rgba(0,0,0,0.4)"
  ├── barSep 1×18px rgba(10,10,10,0.1)
  ├── TextInput fontSize:15 Poppins_400Regular maxHeight:100 multiline
  ├── barMicBtn 32×32 → IcoMic color="#F5C8C8" size={26}   ← blush, NOT default
  │     OR barWaveBtn 40×40 borderRadius:20 bg=channel AI colour (when recording)
  └── barSend 32×32 borderRadius:16 bg=#FF4545              ← CORAL ALWAYS
```

**Mic state (recording):**
- Mic button swaps to WaveformBars inside barWaveBtn (channel AI colour bg)
- Full-screen mic overlay appears: channel-tinted bg, white card, waveform, timer, stop/cancel
- Whisper-1 on stop → routes to active channel sendMessage

**inputArea:** `position:absolute bottom:0 paddingHorizontal:14 paddingBottom:Platform.OS==='ios'?30:18 paddingTop:10`
**KAV:** `behavior=padding backgroundColor='#fff'`
**Our Family:** NO chat bar.

---

## ══════════════════════════════════
## SCROLL ARROWS SPEC (LOCKED ✅ 31 Mar 2026)
## ══════════════════════════════════

All scrollable channels: **side-by-side up/down arrow pair**, floating bottom-right above chat bar.

```
scrollArrowPair: position:absolute, bottom:110, right:16, flexDirection:row, gap:8, zIndex:50
scrollArrowBtn:  width:38, height:38, borderRadius:19, bg:rgba(10,10,10,0.40)
  Up arrow:   scrollRef.current?.scrollTo({ y:0, animated:true })
  Down arrow: scrollRef.current?.scrollToEnd({ animated:true })
```

- Show when content height > viewport + 50px
- Animated fade in/out using Animated.Value
- **Currently implemented:** Shopping ✅ · Calendar ✅
- **To add during builds:** Home · Meals · Todos

---

## ══════════════════════════════════
## CHAT PERSISTENCE SPEC (LOCKED ✅ 31 Mar 2026)
## ══════════════════════════════════

**Hook:** `lib/use-chat-persistence.ts`
**Storage:** `expo-file-system/legacy` — no native rebuild, works in Expo Go
**TTL:** 24 hours per channel
**Cap:** 30 messages rolling
**File:** `{documentDirectory}zaeli_chat_{channelKey}.json`
**Saves:** debounced 500ms, strips isLoading states before writing
**Greeting guard:** check `chatLoaded && messages.length === 0` before firing opening brief

```typescript
const { messages, setMessages, clearMessages, loaded } = useChatPersistence('shopping');
// Channel keys in use: 'shopping' | 'calendar'
// Next: 'home' | 'meals' | 'todos'
```

**Wired:** Shopping ✅ · Calendar ✅
**Next:** Home (card stack rebuild) · Meals (colour refactor) · Todos (build)

---

## ══════════════════════════════════
## CHAT MESSAGE RENDERING SPEC (Calendar-style — all channels)
## ══════════════════════════════════

**Zaeli messages:**
- Eyebrow row: star badge (16×16, borderRadius:5, channel AI colour bg) + "Zaeli" (Poppins 700 10px, channel AI colour) + timestamp right-aligned (Poppins 400 9px, ink3)
- Body: Poppins 400 17px, lineHeight 27, letterSpacing -0.1, paragraph splitting on `.?!`
- Typing state: TypingDots (channel AI colour)
- Quick reply chips below: borderWidth:1.5, white bg, Poppins 400 12px
- Icon row: copy · forward · thumbUp · thumbDown (26×26 hit targets)

**User messages:**
- Right-aligned, #F2F2F2 grey bubble, borderBottomRightRadius:2
- Timestamp + copy + forward icons below, right-aligned

**Quick reply chip rules (ALL channels):**
- Only suggest actions Zaeli can actually perform
- NEVER: "Show tomorrow", "Show this week", "Any conflicts?" — user can see these on screen
- Calendar: action chips only (Add/Edit/Move/Delete an event)
- Shopping: add/remove/check/clear items
- Generated by Claude via `[chips: a | b | c]` suffix → parsed by `parseChips()`

---

## ══════════════════════════════════
## SHOPPING CHANNEL — REBUILD COMPLETE (✅ 31 Mar 2026)
## ══════════════════════════════════

### Architecture (Calendar pattern)
- **One chat thread** across List · Pantry · Spend tabs — single conversation, persisted
- **Claude Sonnet tool-calling** — real Supabase operations, two-pass (tool → follow-up)
- **Full context every call:** shopping list + pantry stock (live fetch) + receipts (live fetch)
- **Tools:** `add_shopping_item`, `remove_shopping_item`, `tick_shopping_item`, `clear_shopping_list`
- **guessCategory:** local keyword lookup (zero API calls)
- **Chips:** Claude appends `[chips: a | b | c]`, `parseChips()` strips before display

### Three tabs (one scroll, one chat)
- **List:** item count pill (mint) + search + List/Aisle toggle · Add item · list items · Recently Bought (collapsible)
- **Pantry:** search + add + List/Aisle toggle · Running Low insight card · scan buttons · flat pantry rows
- **Spend:** mint monthly card · receipt list with expand

### Pantry rows (flat — matches list)
4 stock bars left · emoji · name · qty · +List or "On list ✓" · trash
No card bubble — flat rows with bottom divider

---

## HOME CHANNEL — CARD STACK (LOCKED ✅ 31 Mar 2026)
[Full spec unchanged — see ZAELI-PRODUCT.md]

---

## inlineData Architecture (LOCKED Session 24)
```typescript
inlineData?: {
  type: 'calendar' | 'todos' | 'shopping' | 'meals' | 'kids';
  intro?: string; followUp?: string; items?: any[]; showPortalPill?: boolean;
}
```

---

## Tool-Calling — Chip Rules (ALL channels — LOCKED)
Never suggest chips implying Zaeli can DISPLAY or LIST data the user sees on screen.
Chips = actions only: add / edit / delete / move / clear.

---

## Supabase Tables
```
events          → date, start_time (ISO local), end_time, assignees (jsonb), all_day (bool)
todos           → family_id, title, assigned_to, shared_with (jsonb), due_date, priority,
                  status, recurrence, recurrence_day, calendar_event_id, created_by
reminders       → family_id, title, about_member_id, remind_at (timestamptz),
                  recurrence (none/daily/weekly/monthly), recurrence_day,
                  two_touch (bool), evening_sent (bool), acknowledged (bool),
                  acknowledged_at, created_by, created_at  ← NOT YET CREATED
shopping_items  → family_id, name, category, quantity, checked
pantry_items    → family_id, name, emoji, stock (critical/low/medium/good), quantity
receipts        → family_id, store, purchase_date, total_amount, items (jsonb), item_count
meal_plans      → family_id, date, meal_name, recipe_id
recipes         → family_id, name, ingredients, instructions
family_members  → family_id, name, colour, role, dob, year_level, email, has_own_login (bool)
api_logs        → family_id, feature, model, input_tokens, output_tokens, cost_usd, created_at
tutor_sessions  → family_id, child_id, subject, pillar, messages (jsonb), difficulty_band,
                  duration_seconds, hints_used (jsonb), title, created_at
kids_jobs, kids_rewards, kids_points, notes (see ZAELI-PRODUCT.md for full schema)
```

---

## Coding Rules
- SafeAreaView edges={['top']} always · No floating FAB
- Logo taps = router.navigate('/(tabs)/')
- PowerShell: no && — separate lines
- Always npx expo start --dev-client (--clear for bundle issues)
- Image picker: `['images'] as any`
- Date: local construction — NEVER toISOString()
- KAV backgroundColor: `#fff`
- Send button: `#FF4545` always
- Channel body bg: `#FAF8F5` — never full colour bleed
- No left-border accent strips on cards
- Apostrophes in JSX: double-quoted strings
- expo-file-system: import as `'expo-file-system/legacy'`
- Do NOT use @react-native-async-storage/async-storage — requires native rebuild

---

## Screen Status

| File | Status | Notes |
|---|---|---|
| index.tsx | ✅ Complete | Card stack spec locked 31 Mar |
| calendar.tsx | ✅ Complete | Chat persistence + up/down arrows 31 Mar |
| shopping.tsx | ✅ Rebuild complete | Lavender, Sonnet tools, persistence, Calendar-style chat |
| lib/use-chat-persistence.ts | ✅ Complete | expo-file-system, 24hr, 30-msg |
| mealplanner.tsx | Needs colour refactor + persistence | Next after Home |
| todos.tsx | ✅ Design complete | Not yet built — create reminders table first |
| kids.tsx | ✅ Design complete | Not yet built |
| family.tsx | ✅ Design complete | Not yet built |
| notes.tsx | ✅ Design complete | Not yet built |
| travel.tsx | No design | |
| tutor/* | ✅ Design complete | Needs rebuild |

---

## Next Priorities

1. **Meals colour refactor** — wire persistence during refactor
2. **Home card stack rebuild** (index.tsx) — wire persistence + upgrade to up/down arrows
3. **Todos + Reminders** (todos.tsx) — create `reminders` Supabase table first
4. **Kids Hub** (kids.tsx)
5. **Our Family** (family.tsx)
6. **Notes** (notes.tsx)
7. **Tutor rebuild**
8. **Travel** (design session first)

**Deferred:** Home inline todos/reminders · model cost review · real auth · EAS · Stripe · Settings
