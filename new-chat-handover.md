# Zaeli — New Chat Handover
*1 April 2026 — Meals full rebuild ✅ Recipe/Fav modals ✅ Shopping ingredient review ✅ Copy this entire message to start a new chat.*

---

## Hi! Continuing development of Zaeli.

Zaeli is an iOS-first AI family life platform built in React Native / Expo. Please read **CLAUDE.md** before we start — full stack, architecture, colours, coding rules. Then **ZAELI-PRODUCT.md** for product vision and all module specs.

---

## How I like to work
- **Beginner developer** — always full file rewrites, never partial diffs
- **Two fixes at a time** — bulk changes = too many variables
- One PowerShell command at a time, never chained with &&
- Plain English before code
- **Design before code** — mockup first for any new channel
- Always ask me to upload the current working file before editing — never build from memory

---

## Who I am
- Richard. **Logged-in user = Rich**
- Family: Rich, Anna, Poppy (Yr6, 12, girl), Gab (Yr4, 10, BOY — Gabriel, he/him), Duke (Yr1, 8, boy)
- Local path: `C:\Users\richa\zaeli` (Windows, PowerShell)
- PowerShell escape: `app\`(tabs`)\filename.tsx`
- Repo: https://github.com/RDK1981/zaeli (private)
- Admin: https://incomparable-gumdrop-32e4ba.netlify.app

---

## Key constants (CRITICAL — never get these wrong)
```
DUMMY_FAMILY_ID = '00000000-0000-0000-0000-000000000001'
SONNET          = 'claude-sonnet-4-20250514'  ← NOT claude-sonnet-4-6
GPT_MINI        = 'gpt-5.4-mini'             ← NOT gpt-4.1-mini (retired)
OpenAI = max_completion_tokens · Claude = max_tokens
api_logs = input_tokens / output_tokens (NO total_tokens column)
KAV must have backgroundColor:'#fff'
always await supabase inserts
Send button = #FF4545 coral ALWAYS
Our Family = NO chat bar
Channel body bg = #FAF8F5 warm white — never full colour bleed
No left-border accent strips on cards — dots, icons, badges only
isActionQuery() runs BEFORE isCalendarQuery()
Apostrophes in JSX: always double-quoted strings
expo-file-system: import as 'expo-file-system/legacy'
Do NOT use @react-native-async-storage — requires native rebuild
NEVER literal newlines inside JSX strings or regex — use \n escape
stopPropagation on nested TouchableOpacity inside tappable parent row
Modal stacking iOS: close modal → setTimeout 350ms → open next modal
```

---

## What's built (1 Apr 2026)

### index.tsx — Home ✅ COMPLETE
- inlineData pattern for all inline renders
- Tool-calling: add/update/delete events, todos, shopping items
- isActionQuery() before isCalendarQuery() routing
- Whisper voice. API logging working.
- **HOME CARD STACK REDESIGN LOCKED** — full spec in CLAUDE.md

### calendar.tsx — Calendar ✅ COMPLETE
Two-row mint banner. Day strip. Event cards. Month view. Tool-calling. Whisper. Mic overlay.
Chat persistence (24hr) · Up/down scroll arrows · Greeting guard · Action-only chips.

### shopping.tsx — Shopping ✅ COMPLETE
Lavender `#EDE8FF` banner. Claude Sonnet tool-calling. Single shared chat across List/Pantry/Spend.
Full context every call. guessCategory = local keyword lookup (zero cost). 24hr persistence.
Calendar-style chat rendering. Scroll arrows. Chips from Claude via parseChips().

### mealplanner.tsx — Meals ✅ MAJOR REBUILD COMPLETE (1 Apr)
**Full rebuild this session. Key decisions LOCKED:**
- **Three tabs** (Dinners · Recipes · Favourites) inside terracotta banner — Shopping pattern
- **"Meals" label on right** next to hamburger (same as Shopping/Calendar)
- **All 7 nights identical** — no special "tonight hero". Date label above each card.
- **Date label format:** Tonight = "Tonight · Tuesday 1 Apr" (Poppins 700 terracotta). Others = "Wednesday 2 Apr" (Poppins 400 muted)
- **Planned rows** = green tint `rgba(168,232,204,0.18)` + mint border
- **Unplanned rows** = dashed terracotta border
- **Cook avatars** = right side of row. `CookAvatarsGrid` component: 1-2 stacked · 3-4 in 2×2 grid · 30px
- **Prep badge** = inline left under meal name (not right column — was causing height inconsistency)
- **Heart** = `🩷` emoji, no box, 22px, absolute on emoji box corner
- **Move night** = lifted to main screen to avoid iOS nested modal crash
- **MealDetailModal** (any night): "See full recipe" green · "Done" neutral · "+ Shopping" · "Move night" · "Remove" · heart header → Favourites
- **ShoppingReviewModal**: Spoonacular → Claude generates ingredients · manual → empty state · tick/untick → push to shopping list
- **RecipeDetailModal**: ingredients + method for 8 Spoonacular recipes (hardcoded by ID)
- **FavouriteDetailModal**: Detail / Edit / Plan three-mode modal. Tapping row = Detail. "Plan it" pill = Plan mode only (stopPropagation)
- **Claude Sonnet tool-calling**: plan_dinner · remove_dinner · add_to_favourites
- **Chat persistence**: `useChatPersistence('meals')` — 24hr
- **Scroll arrows**: up/down side-by-side bottom-right
- **cook_ids**: always parse via parsedMeals (Supabase jsonb sometimes returns as string)

### lib/use-chat-persistence.ts ✅ COMPLETE
Keys in use: 'shopping' | 'calendar' | 'meals'. Next: 'home' | 'todos'.

### Admin dashboard ✅
https://incomparable-gumdrop-32e4ba.netlify.app · March 2026: A$3.17 / 1,048 calls.

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
inputArea: position:absolute bottom:0 paddingBottom: iOS?30:18 paddingHorizontal:14
KAV: behavior=padding backgroundColor='#fff'
```

---

## SCROLL ARROWS SPEC (LOCKED ✅)
```
scrollArrowPair: position:absolute, bottom:110, right:16, flexDirection:row, gap:8, zIndex:50
scrollArrowBtn:  width:38, height:38, borderRadius:19, bg:rgba(10,10,10,0.40)
```
**Implemented:** Shopping ✅ · Calendar ✅ · Meals ✅ · **Next:** Home · Todos

---

## CHAT PERSISTENCE SPEC (LOCKED ✅)
`lib/use-chat-persistence.ts` — 24hr TTL · 30-msg cap · debounced saves.
**Wired:** Shopping ✅ · Calendar ✅ · Meals ✅ · **Next:** Home · Todos

---

## BANNER SPEC (LOCKED ✅ — all channels match Shopping)
- Wordmark left · Channel name + hamburger right
- Tab pills inside banner: `rgba(0,0,0,0.08)` bg · borderRadius 22 · fontSize 13 · paddingVertical 8
- Divider 1px `rgba(0,0,0,0.08)` below banner

---

## Immediate next tasks (in priority order)

1. **Home card stack rebuild** — `index.tsx` · wire `useChatPersistence('home')` · up/down arrows · full spec in CLAUDE.md
2. **Create reminders Supabase table** (SQL in ZAELI-PRODUCT.md)
3. **Todos + Reminders** — `todos.tsx` · `zaeli-todos-reminders-v2.html`
4. **Kids Hub** — `kids.tsx`
5. **Our Family** — `family.tsx`
6. **Notes** — `notes.tsx`
7. **Tutor rebuild** — `zaeli-tutor-final-mockup-v4.html`
8. **Travel** — design session first

---

## Key design decisions (don't revisit without reason)

### All channels
- Shopping banner: `#EDE8FF` lavender · logo 'a' and 'i': `#A8E8CC` mint
- Claude Sonnet for all tool-calling (not GPT mini — hallucination risk)
- expo-file-system for persistence (not AsyncStorage — native rebuild)
- Scroll arrows: side-by-side up/down bottom-right
- Chips = actions only, never display verbs
- No floating FAB · Hamburger menu only navigation
- Body bg = `#FAF8F5` warm white always
- Send button = `#FF4545` coral always

### Meals specific
- All 7 nights identical card style (no special tonight hero)
- Date label above each card, outside the card
- Cook avatars right side only · prep badge left inline
- Heart = `🩷` emoji, no background box
- Green "Plan it" buttons (`#A8E8CC` bg, `#1A7A45` text)
- "Done" button = neutral dark (not terracotta — terracotta = commit action only)
- FavouriteDetailModal: row tap = Detail mode · Plan it pill = Plan mode only

---

## Tech reminders
- `npx expo start --dev-client` after copying (`--clear` for bundle issues)
- Import paths from `app/(tabs)/`: `../../lib/supabase`
- expo-file-system: `import * as FileSystem from 'expo-file-system/legacy'`
- Supabase: `rsvbzakyyrftezthlhtd` (Sydney)
- Admin deploy: drag `C:\Users\richa\Downloads\index.html` to Netlify
- Windows dev — no && chaining in PowerShell

---

**Read CLAUDE.md and ZAELI-PRODUCT.md first. Always ask Richard to upload the current file before editing.**
