# Zaeli — Master Project Brief
*Last updated: 15 March 2026 — Chat 3*

---

## Who You Are Talking To
- **Richard** — beginner developer, needs full file rewrites (no partial diffs), easy copy-paste PowerShell commands, step-by-step instructions
- Family: Anna (logged-in user), Richard, Poppy (12), Gab (10), Duke (8)
- Local path: `C:\Users\richa\zaeli` (Windows, PowerShell — no `&&` chaining)
- Repo: https://github.com/RDK1981/zaeli (private)

---

## Stack
- React Native + Expo (iOS-first)
- Supabase (Postgres) — auth, database, realtime
- Claude API (`claude-sonnet-4-20250514`) — AI throughout
- expo-router (file-based routing)
- Poppins font family (all UI), DMSerifDisplay (hero titles only)
- No bottom tab bar visible — hamburger menu only navigation

---

## Key Constants
```ts
DUMMY_FAMILY_ID = '00000000-0000-0000-0000-000000000001'
DUMMY_MEMBER_NAME = 'Anna'
AI model: claude-sonnet-4-20250514
```

---

## Colours
```ts
blue:    '#0057FF'   // Home hero, primary actions
mag:     '#E0007C'   // Calendar hero, Zaeli name accent
orange:  '#FF8C00'   // Meals
gold:    '#B8A400'   // To-dos
green:   '#00C97A'   // Live dot, success
yellow:  '#FFE500'   // Logo accent
dark:    '#0A0A0A'   // Shopping hero
bg:      '#F7F7F7'   // Body background
```

---

## Family Members
```ts
{ id:'1', name:'Anna',    color:'#0057FF' }
{ id:'2', name:'Richard', color:'#FF8C00' }
{ id:'3', name:'Poppy',   color:'#9B6DD6' }
{ id:'4', name:'Gab',     color:'#00B4D8' }
{ id:'5', name:'Duke',    color:'#4A90E2' }
```

---

## File Structure
```
app/
  (tabs)/
    index.tsx          ✅ Home screen
    calendar.tsx       ✅ Calendar
    shopping.tsx       ✅ Shopping (List + Pantry + Spend)
    zaeli-chat.tsx     ✅ AI chat (multi-channel)
    more.tsx           ✅ Hub + Settings + Permissions + To-dos
    mealplanner.tsx    ✅ Meal planner (dummy data)
    _layout.tsx        ✅ Tab layout (all hidden, hamburger nav)
  components/
    NavMenu.tsx        ✅ Hamburger menu + HamburgerButton
lib/
  supabase.ts          ✅
  zaeli-memory.ts      ✅
  notifications.ts     ✅
  useProductScanner.ts ✅
```

---

## Screens Status

### index.tsx — Home ✅
- Blue hero (#0057FF), orb glows, logo, greeting
- Zaeli brief card: shows "thinking…" dots while API call runs, then fades in full formatted text (bold already applied, no typewriter)
- Brief dismissed → relaxed card → "Still here if you need me"
- 2×2 tile grid — Option C design (coloured footer bar):
  - Calendar (magenta) | Shopping (black) — top row
  - Meals (orange) | To-dos (gold) — bottom row
- On the radar section (events, reminders, urgent todos)
- Ask Zaeli bar sticky bottom
- Logo taps → navigate home (router.replace)

### calendar.tsx — Calendar ✅
- Magenta hero (#E0007C)
- Day/Week/Month views with scrollable date strip
- Add event flow: Zaeli-first sheet → manual form fallback
- Event detail modal (edit with Zaeli, delete with confirm)
- Recurring events support
- Brief card + dismissed/relaxed state
- Logo taps → navigate home

### shopping.tsx — Shopping ✅ (major update this session)

**List tab:**
- Sticky toolbar: `+ Add item…` bar + List/Aisle toggle
- List mode: active items → Recently Bought section
- Aisle mode: grouped by category (active) + grouped by category (Recently Bought)
- Recently Bought: items show in MAGENTA (no strikethrough, no opacity fade) — easy to re-tap and re-add
- Ticking off a food category item → auto-syncs to Pantry (stock = good)
- Recently Bought logic: if item exists in checked list → uncheck and move back to active (no duplicate). Zaeli says "Moved back from Recently Bought"
- Brief card (blue theme) + dismissed state

**Pantry tab:**
- Sticky toolbar: `+ Add item…` + List/Aisle toggle (matches List tab)
- List mode: Running Low / Well Stocked sections
- Aisle mode: grouped by food category (keyword matching on item name)
- Scan buttons: "Fridge, pantry or receipt" — auto-detects image type
- Receipt scan → saves to `receipts` table + syncs all items to Pantry (good) + adds to Recently Bought
- Pantry scan → existing review flow unchanged
- Ask Zaeli bar at bottom (no separate "Add manually" button)

**Spend tab** (was "Receipts"):
- Monthly spend summary card at top (Poppins_700Bold for dollar amount)
- Recent receipts list: store emoji + name + date + item count + total
- Tap receipt to expand → shows items with prices (up to 8, then "tap to show all" button)
- Data sourced from `receipts` Supabase table

### zaeli-chat.tsx — AI Chat ✅
- Multi-channel: General, Calendar, Shopping, Meals, Kids, Travel
- Tool use: add_calendar_event, add_shopping_item, add_todo, save_recipe, add_meal_plan, complete_todo, update_calendar_event, delete_calendar_event, add_recurring_event
- Shopping duplicate check: fetches ALL items (active + recently bought). Active dupe → skip. Recently bought dupe → uncheck existing row and move back to active list
- Pantry nudge after adding items
- Memory context via zaeli-memory.ts
- Message cap: 60 per channel

### more.tsx — More/Hub ✅
- Hub screen, Settings, Permissions, To-do list

### mealplanner.tsx ✅
- Week view + Library view (dummy data, not yet Supabase-connected)

---

## Supabase Tables
- `events` — calendar events
- `todos` — tasks/to-dos
- `shopping_items` — shopping list (checked=true = Recently Bought)
- `pantry_items` — pantry inventory
- `meal_plans` — meal planner
- `family_members` — family roster
- `receipts` — receipt history (store, purchase_date, total_amount, item_count, items JSONB) ← NEW this session
- `missions` — used in chat context
- `recipes` — saved recipes

---

## Key Design Decisions (don't revisit without reason)
- No floating FAB anywhere
- Hamburger menu only — no visible bottom tab bar
- Tiles: Option C design (coloured footer bar)
- To-dos colour: Gold `#B8A400`
- Logo on every screen taps → home (router.replace('/(tabs)/'))
- Brief card: thinking dots → fade in complete text (no typewriter, no asterisk flash)
- Recently Bought: magenta text, no strikethrough — functions as a "recents" list for quick re-add
- Pantry scan: always adds/updates, never deletes; review screen before saving; anyone can scan, only parents can delete
- Shopping List toolbar: sticky (outside ScrollView)
- Receipt capture lives in Pantry tab scan buttons (not Spend tab)
- Spend tab = read-only history view
- Food items ticked off shopping list → auto-sync to Pantry (stock=good)
- Household/Other category items do NOT sync to Pantry

---

## Import Paths (from app/(tabs)/)
```ts
import { supabase } from '../../lib/supabase';
import { NavMenu, HamburgerButton } from '../components/NavMenu';
import { buildMemoryContext } from '../../lib/zaeli-memory';
```

---

## Tech Reminders
- SafeAreaView always `edges={['top']}`
- Always `npx expo start --clear` after copying files
- PowerShell: no `&&` chaining — use separate commands
- Never use `&&` in PowerShell copy commands

---

## Next Priority Tasks (in order)
1. **Receipts/Spend tab** — Polish and test with real receipt photos
2. **API usage logging** — Supabase table + wrapper on all API calls (per-family cost tracking)
3. **Meal Planner screen** — Connect to Supabase, replace dummy data
4. **Travel screen** stub
5. **Kids Hub redesign** — including homework helper feature (see below)

---

## Kids Hub — Homework Helper Feature Spec
Zaeli acts as a tutor, not an answer machine. Key behaviour:
- Zaeli reads the question and the child's answer
- If wrong: identifies the specific mistake without naming it as failure
- Asks a guiding question to get the child thinking
- Shows a scaffold/hint (e.g. lined up columns with zero placeholders for decimal addition)
- Ends with a question that keeps the child in the driving seat
- NEVER gives the answer directly

**Example interaction tested (Grade 6 decimals):**
- Q: 8.73 + 4.85 + 7.932
- Zaeli's approach: "Notice anything different about 7.932? Count the decimal places… now try writing them lined up with a zero placeholder…"
- Tone: warm, encouraging, Socratic

Grade levels will be set per child in family profile. Homework checker should adapt difficulty of hints to grade level.

---

## Deferred / Future Features
- Price tracking across shops (data structure ready via receipts table, insights deferred)
- Store preference learning (needs receipt volume first)
- Expiry predictions (receipt date + pantry inventory)
- "You normally buy X every N days" suggestions
- Marketing site
- Rebuild HTML mockup to match final product
- Knowledge base / help centre
- API key move server-side before launch
