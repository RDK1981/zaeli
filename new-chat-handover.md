## Zaeli App — New Chat Handover Brief
*17 March 2026 — copy this entire message to start a new chat*

---

Hi! I'm continuing development of the **Zaeli app** — a React Native / Expo iOS-first family life platform with AI (Claude API) at its core. We've been building this together across many sessions and I need you to pick up exactly where we left off.

---

### Who you are talking to
- My name is Richard. The app's logged-in user is Anna (my family: Anna, Richard, Poppy age 12, Gab age 10, Duke age 8)
- I'm a beginner developer — always give me **full file rewrites** with easy copy-paste PowerShell commands, step by step
- Local path: `C:\Users\richa\zaeli` (Windows, PowerShell — no `&&` chaining)
- Repo: https://github.com/RDK1981/zaeli (private)

---

### Where to find everything
**Master brief (CLAUDE.md):** `C:\Users\richa\zaeli\CLAUDE.md` — full stack, colours, family members, coding rules, all screen statuses. **Always read this first.**

**Transcripts:** `/mnt/transcripts/` — full session history. See `journal.txt` for catalog.

**Output files:** `/mnt/user-data/outputs/` — latest versions of all built files.

**Key constants:**
- `DUMMY_FAMILY_ID = '00000000-0000-0000-0000-000000000001'`
- `DUMMY_MEMBER_NAME = 'Anna'`
- AI model: always `claude-sonnet-4-20250514`

---

### What's been built (as of 17 March 2026)

✅ `index.tsx` — Home screen
- Blue hero, Zaeli brief card (thinking dots → fade in bold text, no typewriter)
- 2×2 Option C tiles (coloured footer bars), radar section, Ask Zaeli bar
- Brief: dismiss → relaxed card → Ask Zaeli bar handles re-entry

✅ `calendar.tsx` — Calendar
- Magenta hero, Day/Week/Month views, recurring events
- Zaeli brief card + dismissed card pattern

✅ `shopping.tsx` — Shopping
- **List tab:** sticky toolbar, Recently Bought (magenta, no strikethrough), food tick → auto-syncs to Pantry
- **Pantry tab:** List/Aisle toggle, auto-detect receipt vs pantry scan
- **Spend tab:** receipt history, expandable items, monthly spend summary
- Item rows: meal_source shows as small orange pill tag below name (no squash)

✅ `zaeli-chat.tsx` — AI Chat
- Multi-channel: General, Calendar, Shopping, Meals, Kids, Travel
- **Meals channel:** fetches full 7-day plan + recipes + menus for context-aware greeting
- Meals greeting references actual plan state (empty nights, tonight's meal)
- Zaeli generates recipes from training knowledge (does NOT say she can't search)
- `add_meal_plan`: checks for day conflicts, asks user what to do — never silently moves
- `replace_meal_plan`: replaces existing meal after user confirms
- `save_recipe`: stores ingredients + method as separate fields (not a blob)
- Date: uses `dayNames[now.getDay()]` array — avoids UTC/AEST day-name mismatch

✅ `mealplanner.tsx` — Meals (v4.1 fully implemented + full bug fix pass)
- **Dinners tab:** Option A layout (left accent bar, DM Serif date), smart emoji icons via `getMealEmoji()`, heart shown when meal name matches any saved recipe (substring match + parallel fetch), dessert slot, kit card saves to Favourites, edit lifted to DinnersTab level (survives modal unmount), blue Zaeli brief
- **Recipes tab:** blue brief card ("Find me a recipe" + "Browse manually"), browse section revealed on tap, `openDayPicker` wired through — "+ Add to dinner plan" works, edit pre-populated via `useEffect` watching `editingRecipe?.id`
- **Favourites tab:** all rows show heart (tappable remove for DB entries, static for dummies), DB recipes deduplicated by name, `FavouriteDetailModal` has delete button, tags include Thermomix/Slow cooker/Air fryer
- **Shared day picker:** `dayPickerCtx` in `MealPlannerScreen` — single Modal used by both Recipes and Favourites flows
- iOS nested modal fix: all edit/assign modals lifted to parent component level

✅ `more.tsx` — Hub + Settings + Permissions + To-dos

✅ `NavMenu.tsx` + `HamburgerButton`

✅ `_layout.tsx` — Tab layout (all hidden, hamburger nav only)

---

### Supabase tables (all created)
```sql
meal_plans    — id, family_id, day_key, planned_date, meal_name, meal_type,
                source, image_url, prep_mins, cook_ids, ingredients (jsonb),
                notes (text)
                -- run if missing: alter table meal_plans add column if not exists notes text;
recipes       — id, family_id, name, source_type, image_url, prep_mins, tags, notes, created_at
menus         — id, family_id, venue_name, venue_type, image_url, items (jsonb), notes, created_at
receipts      — id, family_id, store, purchase_date, total_amount, item_count, items (jsonb), raw_text, created_at
pantry_items  — id, family_id, name, emoji, category, stock_level, last_updated
shopping_items — id, family_id, name, item, category, checked, completed, meal_source
```

---

### Immediate next tasks (in priority order)
1. **API usage logging** — Supabase table + wrapper on all Claude API calls (per-family cost tracking)
2. **Travel screen** — stub screen with basic layout
3. **Kids Hub** — homework helper (Socratic method), kid task overview
4. **Lunchbox screen** — `lunchbox-v1.html` mockup ready to build (teal #00B8D4)
5. **Spoonacular API** — replace dummy recipe data with live search (deferred)

---

### Key design decisions (don't revisit without reason)
- No floating FAB anywhere
- Hamburger menu only navigation
- Brief cards: blue on Home/Shopping/Meals, magenta on Calendar
- `btnPrimary` style: blue not orange
- Meal overview: NO images — smart emoji icon only via getMealEmoji()
- Meal images: detail modals only
- Edit modals: always lifted OUT of parent Modal (iOS pageSheet stacking)
- `getMediaType()` always used for base64 API calls
- Date context for AI: always use dayNames array, never toDateString()
- `.single()` throws on no result — use `.limit(1)` + `data?.[0]`
- React 18 batches async state updates — use useEffect for post-modal data loading

---

### Tech reminders
- Import paths from `app/(tabs)/`: `../../lib/supabase`, `../components/NavMenu`
- SafeAreaView always `edges={['top']}`
- Poppins font for all UI, DMSerifDisplay for hero titles only
- Always `npx expo start --clear` after copying files
- PowerShell: no `&&` — use separate lines

---

Please confirm you've read CLAUDE.md and are ready to continue. First priority is **API usage logging**.
