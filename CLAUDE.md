# Zaeli — Master Project Brief
*Last updated: 17 March 2026 — Chat 5 (Meals polish, bug fixes)*

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
blue:    '#0057FF'   // Home hero, primary actions, Zaeli brief cards
mag:     '#E0007C'   // Calendar hero, Zaeli name accent, magenta
orange:  '#FF8C00'   // Meals hero, primary CTA
gold:    '#B8A400'   // To-dos
green:   '#00C97A'   // Live dot, success states
yellow:  '#FFE500'   // Logo accent
dark:    '#0A0A0A'   // Shopping hero
bg:      '#F7F7F7'   // Body background
card:    '#FFFFFF'   // Card background
ink:     '#0A0A0A'   // Primary text
ink2:    '#555'      // Secondary text
ink3:    '#999'      // Tertiary/placeholder text
border:  '#EBEBEB'   // Card borders
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
    zaeli-chat.tsx     ✅ AI chat — Meals channel fully context-aware
    more.tsx           ✅ Hub + Settings + Permissions + To-dos
    mealplanner.tsx    ✅ Meal Planner — v4.1 + full bug fix pass
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

## Supabase Tables (key ones)
```sql
meal_plans    — id, family_id, day_key, planned_date, meal_name, meal_type,
                source, image_url, prep_mins, cook_ids, ingredients (jsonb),
                notes (text) ← ADD THIS IF MISSING: alter table meal_plans add column if not exists notes text;
recipes       — id, family_id, name, source_type, image_url, prep_mins, tags, notes, created_at
menus         — id, family_id, venue_name, venue_type, image_url, items (jsonb), notes, created_at
receipts      — id, family_id, store, purchase_date, total_amount, item_count, items (jsonb), raw_text, created_at
pantry_items  — id, family_id, name, emoji, category, stock_level, last_updated
shopping_items — id, family_id, name, item, category, checked, completed, meal_source
```

---

## Screen Status

### ✅ index.tsx — Home
- Blue hero, Zaeli brief card (thinking dots → fade in bold text)
- 2×2 tile grid Option C (coloured footer bars), radar, Ask Zaeli bar
- Brief: dismisses → relaxed card → Ask Zaeli bar handles re-entry

### ✅ calendar.tsx — Calendar
- Magenta hero, Day/Week/Month views, recurring events
- Zaeli brief card, dismissed card pattern

### ✅ shopping.tsx — Shopping
- List tab: food tick → pantry sync, Recently Bought (magenta)
- Pantry tab: List/Aisle toggle, receipt vs pantry scan auto-detect
- Spend tab: receipt history, expandable items
- Item rows: meal_source shows as orange pill tag below name (no squash)

### ✅ zaeli-chat.tsx — AI Chat
- Multi-channel: General, Calendar, Shopping, Meals, Kids, Travel
- Meals channel: fetches full 7-day plan + recipes + menus for greeting
- Meals greeting references actual plan state (empty nights, tonight's meal)
- Zaeli generates recipes from training knowledge — does NOT claim inability
- add_meal_plan: checks for day conflicts before inserting, asks user what to do
- replace_meal_plan: replaces existing meal after user confirms
- save_recipe: stores ingredients/method in separate fields, not a blob
- Date: uses localDayName array (not toDateString) to avoid UTC/AEST mismatch

### ✅ mealplanner.tsx — Meals (v4.1 + full bug fix pass)

**Architecture:**
- `MealPlannerScreen` — manages tabs, dayPickerCtx (shared day picker), edit state
- Shared `openDayPicker` function passed to RecipesTab and FavouritesTab
- `DinnersTab` — owns editingMeal state (lifted so edit survives modal unmount)
- `RecipesTab` — owns editingRecipe + useEffect-driven pre-population
- `FavouritesTab` — self-contained with own pickingDay modal in FavouriteDetailModal

**Dinners tab:**
- Option A layout: left accent bar (orange tonight / grey empty), DM Serif date
- `getMealEmoji()` — 20-pattern keyword matcher for smart icons
- ❤️ shown when `meal.source==='favourites'` OR name matches any saved recipe (substring)
- `favouritedNames` Set fetched in parallel with `fetchMeals`
- Dessert slot: dashed rose row beneath each planned dinner
- Meal detail: shows structured ingredients + parsed notes (Ingredients/Method sections)
- Edit: lifted to DinnersTab level — survives MealDetailModal unmount
- Kit card: ❤️ save to Favourites with toggle state (🤍 → ❤️ after save)
- Blue Zaeli brief + blue relaxed card

**Recipes tab:**
- Blue brief card (matches Dinners) — "✦ Find me a recipe" + "Browse manually"
- Browse section revealed on tap — filter chips + search + recipe rows
- Recipe rows: smart emoji icon, no images
- RecipeDetailModal: ✏️ edit + 🤍/❤️ heart in header
- `openDayPicker` passed through — "+ Add to dinner plan" works
- Edit: `useEffect` watches `editingRecipe?.id` and pre-populates fields from Supabase
- Edit modal at `RecipesTab` level (never nested inside RecipeDetailModal)

**Favourites tab:**
- All rows show ❤️ — tappable remove for DB entries, static for dummy placeholders
- DB recipes deduplicated by name before display (no duplicates)
- `FavouriteDetailModal`: 🗑 delete in header for real DB entries
- `FavouriteDetailModal`: pickingDay modal self-contained (no shared openDayPicker needed)
- Tags include: Thermomix, Slow cooker, Air fryer
- Save a menu: photo → Zaeli extracts venue + all dishes → `menus` table

### ✅ more.tsx — More/Hub

---

## Key Design Decisions (locked)
- No floating FAB anywhere
- Hamburger menu only navigation
- Brief cards: blue on Home, Shopping, Meals — magenta on Calendar
- btnPrimary: **blue** (`C.blue`) not orange
- Meal overview: NO images — smart emoji icon only
- Meal images: detail modals only
- Save a recipe CTA: dark `#2C2C2E`
- Favourite → Add to plan: day picker first (not auto-assign)
- Edit modals: always lifted OUT of parent Modal (iOS stacking fix)
- `getMediaType()` always used for base64 API calls
- Date context: always use `dayNames[now.getDay()]` array, never `toDateString()`

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
- PowerShell: no `&&` — use separate lines
- iOS nested modals don't stack — always lift child modals to parent component level
- `.single()` throws on no result — use `.limit(1)` + `data?.[0]` for existence checks
- React 18 batches async state updates — use `useEffect` for post-modal data loading
- `select('*')` in fetchMeals — all columns including `notes` and `ingredients` come through

---

## Next Priority Tasks
1. **API usage logging** — Supabase table + wrapper on all Claude API calls (per-family cost tracking)
2. **Travel screen** — stub screen with basic layout
3. **Kids Hub** — homework helper (Socratic method), kid task overview
4. **Lunchbox screen** — `lunchbox-v1.html` mockup ready to build
5. **Spoonacular API** — replace dummy recipe data with live search (deferred)

---

## Kids Hub — Homework Helper Spec
- Socratic method — guides without giving answers directly
- Grade level per child (Poppy: Grade 6, Gab: Grade 4, Duke: Grade 2)
- Subject detection (maths, literacy, science)
- Tested pattern: "What do you think comes next?" style prompting

## Lunchbox — Design Ready, Not Built
- Mockup: `lunchbox-v1.html`
- Teal `#00B8D4` hero colour
- Child tabs (Poppy / Gab / Duke)
- Quick mode, tuck shop days, photo onboarding
- Weekly lunchbox planner with nutrition nudges

## Deferred
- Spoonacular API integration (currently dummy data in mealplanner.tsx)
- Price tracking, expiry predictions in pantry
- API key server-side proxy before launch
- Marketing site

---

## Admin Dashboard
- Live URL: https://incomparable-gumdrop-32e4ba.netlify.app
- Hosted on Netlify (richarddekretser account)
- Connects to Supabase api_logs table
- Redeploy: drag `zaeli-admin` folder onto Netlify project overview drop zone
- File location: `C:\Users\richa\Downloads\zaeli-admin\index.html`
- To update credentials: run PowerShell key injection then redeploy

## API Logging
- Table: `api_logs` — created in Supabase ✅
- Wrapper: `lib/api-logger.ts` — all 11 call sites wired ✅
- Features tracked: home_brief, calendar_brief, shopping_brief, shopping_category,
  pantry_scan, receipt_scan, chat_greeting, zaeli_chat, menu_photo, recipe_photo

## CRITICAL — Cost Problem Identified
Current cost per family at realistic usage (~2,520 calls/month): ~$109/month
Root cause: zaeli_chat sends ~16,000 input tokens per message (all data loaded every time)

### Three fixes needed BEFORE building more features:
1. **Smart context loading** — detect what user is asking, load only relevant data
   - Chat: don't load recipes/menus/shopping unless asked about them
   - Estimated saving: 75% token reduction (16,000 → 4,000 per message)
2. **Haiku for simple tasks** — briefs, greetings, homework helper, category guessing
   - Haiku: $0.25/$1.25 per million vs Sonnet $3/$15 (20x cheaper)
   - Estimated saving: 87% on eligible calls
3. **History cap at 6 messages** — currently 10, saves ~1,500 tokens per message

### Target after fixes:
- Per chat message: $0.013 (down from $0.050)
- Per brief: $0.002 (down from $0.015)
- Per family/month at heavy use: ~$12 (down from $109)
- At 1,000 families: ~$12,000/month (down from $109,000)

### Pricing implications:
- Need $15-20/month subscription to be profitable at heavy usage
- Homework helper is most expensive feature — consider as premium add-on
- Options: usage tiers, fair use cap (500 interactions/month), or premium plan

## Single Chat (replacing channels)
- Decision made: remove channel tabs, use one General chat
- Zaeli detects context from message content and loads relevant data
- Simpler UX, same capability, lower cost

## Next Session Priority Order:
1. Cost fixes (smart context + Haiku + history cap + single chat)
2. Homework platform build (to test real rates)
3. Travel screen stub
4. Lunchbox screen
