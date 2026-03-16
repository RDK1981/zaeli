# Zaeli — Master Project Brief
*Last updated: 16 March 2026 — Chat 4 (Meals Day)*

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
mag:     '#E0007C'   // Calendar hero, Zaeli name accent
orange:  '#FF8C00'   // Meals hero
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
    zaeli-chat.tsx     ✅ AI chat — updated with recipes/menus/meal context
    more.tsx           ✅ Hub + Settings + Permissions + To-dos
    mealplanner.tsx    ✅ Meal Planner — major build this session
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
- Blue hero, Zaeli brief card (thinking dots → fade in), dismissed → relaxed card
- 2×2 tile grid Option C, radar section, Ask Zaeli bar

### calendar.tsx — Calendar ✅
- Magenta hero, Day/Week/Month views, recurring events, brief card

### shopping.tsx — Shopping ✅
- List tab: Recently Bought (magenta), food tick → pantry sync
- Pantry tab: auto-detect receipt vs pantry scan
- Spend tab: receipt history

### zaeli-chat.tsx — AI Chat ✅ (updated Chat 4)
- Multi-channel: General, Calendar, Shopping, Meals, Kids, Travel
- **Now fetches on every send:** `recipes`, `menus` (formatted venue→dish list), `meal_plans` (14 days)
- Zaeli can answer questions about saved recipes and menu items (e.g. "what's in the X dish at The Depot Noosa?")
- `extractRecipes()` tightened — no false positives on shopping list responses
- Channel prompts updated: Meals + General explicitly reference saved data

### more.tsx — More/Hub ✅

### mealplanner.tsx ✅ — Major build Chat 4

**Dinners tab:**
- 7-day rolling feed
- Blue Zaeli brief card (Shopping-style) + blue relaxed card on dismiss
- Cook avatars per day, "+ Who's cooking?" chip
- Meal cards: emoji icon + text only — NO images on overview
- Actions: View recipe · Move · 🗑 (with confirmation)
- Move night: 7-night picker sheet, warns before replacing
- Add meal: Ask Zaeli / Browse / Favourites / Meal kit / Manual / Takeaway
- Cook assignment: family picker, kid job creation with points (15/25/35/Custom)

**Recipes tab:**
- Client-side search + filter chips
- Tap row or "+ Plan" → RecipeDetailModal with full ingredients + method
- Add to plan → day picker → assign cook

**Favourites tab:**
- Toggle: **Family Picks** | **Saved Menus**
- Save a recipe CTA (dark `#2C2C2E`)
- SaveRecipeModal: photo/upload/URL/manual/describe/save-a-menu
- Photo: `quality:0.15`, `getMediaType()` auto-detects format, `max_tokens:4096`, single object parse with triple fallback
- Save a menu: Claude extracts venue + all dishes → `menus` table
- FavouriteDetailModal: editable name/tags/ingredients/method, tappable photo, Save header button (insert for dummies, update for real)
- Add to plan: day picker → assign cook (both modals lifted outside parent for iOS)
- Saved Menus: venue cards → dish list with editable venue name

---

## Supabase Tables
```
events          — calendar events
todos           — tasks + cooking jobs (source='meals', assigned_to, points)
shopping_items  — shopping list
pantry_items    — pantry inventory
meal_plans      — dinner plan (planned_date NOT NULL, default current_date)
family_members  — family roster
receipts        — receipt history
missions        — chat context
recipes         — saved recipes (name, source_type, tags[], prep_mins, notes, image_url)
menus           — saved venue menus (venue_name, venue_type, items JSONB)  ← NEW Chat 4
```

**Critical: always include `planned_date` in meal_plans inserts**

---

## Key Design Decisions
- No floating FAB anywhere
- Hamburger menu only navigation
- Brief card: thinking dots → fade in (no typewriter)
- Recently Bought: magenta, no strikethrough
- Meals brief card: **BLUE** (not orange)
- Ask Zaeli bar on Meals: **BLUE** send button
- Meal overview: **NO images** — emoji icon + text only
- Meal images: detail modals only
- Save a recipe CTA: dark `#2C2C2E`
- Favourite → Add to plan: day picker first (not auto-assign)
- Cook assignment modal: always outside parent Modal (iOS stacking)
- `getMediaType()` always used for base64 API calls — never hardcode `image/jpeg`

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
- PowerShell: no `&&` chaining
- iOS nested modals don't stack — lift child modals outside parent `<Modal>`

---

## Meals v4 Mockup — Pending Implementation
`meals-v4.html` ready and reviewed. Key changes:
- Dinners: blue brief, no images, cleaner date layout
- Recipes: Zaeli card leads — "Find me a recipe" + "Browse manually"
- Favourites: purple Zaeli onboarding card, dismissable
- All tabs: blue Ask Zaeli bar

**Do not implement until Richard confirms.**

---

## Next Priority Tasks
1. **Meals v4** — implement once mockup confirmed
2. **API usage logging** — Supabase table + wrapper
3. **Travel screen** stub
4. **Kids Hub** — homework helper
5. **Lunchbox screen** — `lunchbox-v1.html` mockup ready

---

## Kids Hub — Homework Helper Spec
Socratic method — guides without giving answers. Grade level per child.

## Lunchbox — Design Complete, Not Built
`lunchbox-v1.html`. Teal `#00B8D4`. Child tabs, quick mode, tuck shop days, photo onboarding.

## Deferred
- Spoonacular API (currently dummy data)
- Price tracking, expiry predictions
- API key server-side before launch
- Marketing site
