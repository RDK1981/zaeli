# Zaeli App — New Chat Handover Brief
*16 March 2026 — copy this entire message to start a new chat*

---

Hi! I'm continuing development of the **Zaeli app** — a React Native / Expo iOS-first family life platform with AI (Claude API) at its core. We've been building this together across many sessions and I need you to pick up exactly where we left off.

---

## Who you are talking to
- My name is Richard. The app's logged-in user is Anna (my family: Anna, Richard, Poppy age 12, Gab age 10, Duke age 8)
- I'm a beginner developer — always give me **full file rewrites** with easy copy-paste PowerShell commands, step by step
- Local path: `C:\Users\richa\zaeli` (Windows, PowerShell — no `&&` chaining)
- Repo: https://github.com/RDK1981/zaeli (private)

---

## Where to find everything
**Master brief (CLAUDE.md):** `C:\Users\richa\zaeli\CLAUDE.md` — full stack, colours, family members, coding rules, all screen statuses. Read this first.

**Key constants:**
- `DUMMY_FAMILY_ID = '00000000-0000-0000-0000-000000000001'`
- `DUMMY_MEMBER_NAME = 'Anna'`
- AI model: always `claude-sonnet-4-20250514`

---

## What's been built (as of 16 March 2026)

✅ `index.tsx` — Home screen
✅ `calendar.tsx` — Full calendar
✅ `shopping.tsx` — Shopping (List + Pantry + Spend)
✅ `zaeli-chat.tsx` — Multi-channel AI chat (updated this session — now includes recipes/menus/meal context)
✅ `more.tsx` — Hub + Settings + Permissions + To-dos
✅ `mealplanner.tsx` — **Major build this session** (see below)
✅ `NavMenu.tsx` + `HamburgerButton`
✅ `_layout.tsx`

---

## Supabase tables (all created and working)
- `events`, `todos`, `shopping_items`, `pantry_items`, `meal_plans`, `family_members`, `receipts`, `missions`, `recipes`, `menus` ← new this session

**Critical:** `meal_plans.planned_date` has `default current_date`. Always include `planned_date` in inserts.

---

## What we built this session (16 March — Chat 4, Meals Day)

### mealplanner.tsx — complete overhaul

**Dinners tab:**
- 7-day rolling feed, blue Zaeli brief card (Shopping-style), blue relaxed card on dismiss
- Meal cards with emoji icon (no images on overview), cook avatars, View · Move · 🗑 actions
- Move night: 7-night picker with override warning
- Add meal: 6 options all wired (Ask Zaeli / Browse / Favourites / Meal kit / Manual / Takeaway)
- Cook assignment: family picker, kid job creation with custom points, saves to `todos`

**Recipes tab:**
- Client-side search + filter (All/Quick/Kids love/Gut friendly/GF/Dairy free)
- Full RecipeDetailModal: ingredients with pantry status, method, add to plan → day picker → assign cook

**Favourites tab:**
- Family Picks / Saved Menus toggle
- FavouriteDetailModal: fully editable (name, tags, ingredients, method, photo), Save button in header
- Add to plan: day picker → assign cook (modals lifted outside parent for iOS stacking fix)
- **Save a menu**: photo → Claude extracts venue name + all dishes → `menus` table
- Saved Menus view: venue cards → dish list with editable venue name

**Photo extraction:**
- `getMediaType()` helper detects JPEG/PNG/WebP from base64 magic bytes — never hardcoded
- `max_tokens:4096` (was 1500, was truncating JSON)
- Single JSON object prompt (not array), triple-layer parse fallback
- `quality:0.15` for camera to stay under 5MB API limit

### zaeli-chat.tsx — context update
- Now fetches `recipes`, `menus` (formatted as venue→dish list), `meal_plans` (14 days) on every send
- Zaeli can answer questions about specific dishes at saved venues
- `extractRecipes()` tightened — no longer fires on shopping list answers

### meals-v4.html mockup — designed, pending implementation
Three screens redesigned:
- **Dinners:** blue brief card, no images, cleaner day/date layout
- **Recipes:** Zaeli hero card leads — "Find me a recipe" + "Browse manually"
- **Favourites:** purple Zaeli onboarding card explaining section, dismissable

---

## Immediate next tasks (in priority order)
1. **Meals v4** — implement `meals-v4.html` mockup into `mealplanner.tsx` once Richard confirms design
2. **API usage logging** — Supabase table + wrapper on all API calls
3. **Travel screen** stub
4. **Kids Hub redesign** — homework helper feature
5. **Lunchbox screen** — `lunchbox-v1.html` mockup already designed

---

## Key design decisions (don't revisit without reason)
- No floating FAB anywhere
- Hamburger menu only navigation
- Meals brief card: **BLUE** (not orange) — matches Shopping
- Ask Zaeli bar on Meals: **BLUE** send button
- Meal overview: **NO images** — emoji icon + text only
- Meal images only in detail modals
- Save a recipe CTA: dark `#2C2C2E`
- Favourite → Add to plan: day picker first (not auto-assign)
- Cook assignment modal always outside parent Modal (iOS stacking fix)
- `getMediaType()` always used for base64 images — never `image/jpeg` hardcoded
- `planned_date` always in meal_plans inserts

---

## Tech reminders
- Import paths from `app/(tabs)/`: `../../lib/supabase`, `../components/NavMenu`
- SafeAreaView always `edges={['top']}`
- Poppins for all UI, DMSerifDisplay for hero titles only
- Always `npx expo start --clear` after copying files
- PowerShell: no `&&` — use separate lines
- iOS: nested modals don't stack — always lift child modals outside parent `<Modal>`
