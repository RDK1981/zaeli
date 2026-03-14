# CLAUDE.md — Zaeli App Context
*Last updated: 13 March 2026*

---

## Project Overview
- **App**: Zaeli — AI-powered family life platform, React Native / Expo, iOS-first
- **Logged-in user**: Anna
- **Family members**: Anna, Richard, Poppy (12), Gab (10), Duke (8)
- **Parents** (can delete, full permissions): Anna, Richard
- **Kids** (restricted permissions): Poppy, Gab, Duke
- **DUMMY_FAMILY_ID**: `00000000-0000-0000-0000-000000000001`
- **Location**: Brisbane, Australia (AEST = UTC+10)
- **Repo**: https://github.com/RDK1981/zaeli (private)
- **Local path**: `C:\Users\richa\zaeli` (Windows, PowerShell)

---

## Stack
| Layer | Tech |
|-------|------|
| Framework | React Native + Expo (iOS-first) |
| Router | Expo Router (file-based, `app/(tabs)/`) |
| Backend | Supabase (direct client calls) |
| AI | Anthropic API direct (`claude-sonnet-4-20250514`) |
| Fonts | DMSerifDisplay_400Regular + Poppins (400/500/600/700/800) |

**Anthropic API headers (all calls):**
```
Content-Type: application/json
anthropic-version: 2023-06-01
anthropic-dangerous-direct-browser-access: true
x-api-key: EXPO_PUBLIC_ANTHROPIC_API_KEY
```

---

## Color Tokens
```ts
const C = {
  bg: '#F7F7F7', card: '#FFFFFF', card2: '#F0F0F0',
  border: '#E0E0E0', text: '#0A0A0A',
  text2: 'rgba(0,0,0,0.50)', text3: 'rgba(0,0,0,0.28)',
  green: '#00C97A', greenL: 'rgba(0,201,122,0.10)', greenB: 'rgba(0,201,122,0.28)',
  orange: '#FF8C00', orangeL: 'rgba(255,140,0,0.10)', orangeB: 'rgba(255,140,0,0.28)',
  yellow: '#FFE500', yellowD: '#B8A400', yellowL: 'rgba(255,229,0,0.14)', yellowB: 'rgba(255,229,0,0.35)',
  blue: '#0057FF', blueL: 'rgba(0,87,255,0.08)', blueB: 'rgba(0,87,255,0.22)',
  purple: '#9B7FD4', purpleL: 'rgba(155,127,212,0.10)', purpleB: 'rgba(155,127,212,0.28)',
  magenta: '#E0007C', magentaL: 'rgba(224,0,124,0.08)',
  red: '#FF3B3B', redL: 'rgba(255,59,59,0.08)',
  teal: '#00BFBF', tealL: 'rgba(0,191,191,0.10)', tealB: 'rgba(0,191,191,0.28)',
  dark: '#0A0A0A', darkL: 'rgba(10,10,10,0.06)',
  ink: '#0A0A0A', ink2: 'rgba(0,0,0,0.50)', ink3: 'rgba(0,0,0,0.28)',
  mag: '#E0007C', shopTick: '#B8A400',
}
```

---

## Family Members
```ts
const FAMILY_MEMBERS = [
  { id:'1', name:'Anna',    color:'#0057FF' },
  { id:'2', name:'Richard', color:'#FF8C00' },
  { id:'3', name:'Poppy',   color:'#9B6DD6' },
  { id:'4', name:'Gab',     color:'#00B4D8' },
  { id:'5', name:'Duke',    color:'#4A90E2' },
];
const PARENTS = [
  { id:'1', name:'Anna',    color:'#0057FF', initials:'A' },
  { id:'2', name:'Richard', color:'#FF8C00', initials:'R' },
];
const KIDS = [
  { id:'3', name:'Poppy', color:'#9B6DD6', initials:'P', age:12 },
  { id:'4', name:'Gab',   color:'#00B4D8', initials:'G', age:10 },
  { id:'5', name:'Duke',  color:'#4A90E2', initials:'D', age:8  },
];
```

---

## Tab / Screen Structure
All tabs hidden from tab navigator (`href: null`). Navigation via hamburger menu (top-right) only.

| File | Screen | Hero colour |
|------|---------|-------------|
| `app/(tabs)/index.tsx` | Home | `#0057FF` blue |
| `app/(tabs)/calendar.tsx` | Calendar | `#E0007C` magenta |
| `app/(tabs)/shopping.tsx` | Shopping | `#0A0A0A` dark |
| `app/(tabs)/mealplanner.tsx` | Meal Planner | `#FF8C00` orange *(not yet built)* |
| `app/(tabs)/chores.tsx` | Kids | `#0A0A0A` dark *(stub)* |
| `app/(tabs)/more.tsx` | More hub | `#0A0A0A` dark |
| `app/(tabs)/zaeli-chat.tsx` | Zaeli Chat | white *(no tab)* |

### Navigation structure (hamburger menu)
```
Hamburger menu
├── To-dos        → more.tsx?initialPage=todo (stub)
├── Notes         → more.tsx?initialPage=notes (stub)
├── Travel        → more.tsx?initialPage=travel (stub)
├── Our Family    → more.tsx?initialPage=family (stub)
└── Settings      → more.tsx?initialPage=settings
    ├── Our Family     (stub)
    ├── Permissions    ✅ built
    ├── Notifications  (stub)
    └── Account        (stub)
```

---

## Shopping Screen — Sub-tabs
`shopping.tsx` has three sub-tabs: **List** | **Pantry** | **Receipts**

### List tab
- Add item flow: sheet → Ask Zaeli (routes to chat) or manual form
- View toggle: List / Aisle (grouped by category)
- Purchased banner separates checked/unchecked
- Brief card (blue, dismissible)
- Ask Zaeli bar at bottom

### Pantry tab ✅ built (March 13-14 2026)
- Two scan cards: Scan Fridge / Scan Pantry (expo-image-picker → Claude vision)
- Scan review screen: user confirms before any save
- Scan logic: matching name → update stock only; new name → add; unseen items untouched
- Stock levels: critical / low / medium / good (horizontal bar fill)
- Running Low section + Well Stocked section
- Zaeli insight card (orange) with "Add all to shopping list" when items are low
- + List button per row (checks for dupes, shows "On list ✓" if already there)
- Delete only visible for parents (IS_PARENT = true for Anna/Richard)
- Add manually button
- Ask Zaeli bar at bottom (same as List tab)
- **Scanning animation**: bottom sheet slides up with animated dots + 3-step progress ("Reading your photo…" → "Identifying items…" → "Almost done…")
- **Pantry nudge**: Zaeli chat and manual add both check pantry and surface a soft note if item already stocked

### Receipts tab
- Stub ("coming soon") with Ask Zaeli bar

### Pantry Supabase table
```sql
create table if not exists pantry_items (
  id         uuid primary key default gen_random_uuid(),
  family_id  uuid not null,
  name       text not null,
  emoji      text not null default '🛒',
  stock      text not null default 'good',
  quantity   text,
  created_at timestamptz default now()
);
```

---

## Home Screen Updates (March 14 2026)
- Brief card **always visible immediately** — `cardFade` starts at 1, no fade-in wait
- Shows **"Zaeli is thinking…"** with animated dots while API call is in flight
- **Typewriter animation** when text arrives: 18ms per char, blinking blue cursor
- After typing completes: hands off to sentence-by-sentence fade animation
- **Option C tiles** with coloured footer bar (screen name + → arrow)
- Tile order: Calendar / Shopping (top), Meals / To-dos (bottom)

---

## Supabase Tables (all current)
`events`, `shopping_items`, `meal_plans`, `todos`, `missions`, `mission_completions`,
`rewards`, `family_members`, `reminders`, `notes`, `family_insights`, `family_milestones`,
`conversation_memory`, `weekly_digests`, `pattern_log`, `recipes`, `list_items`,
`tutoring_sessions`, `member_permissions` (family_id, member_id, shopping, calendar, meals, todos, notes, zaeli),
`pantry_items` (see above)

**Supabase date convention**: local ISO 8601 without timezone suffix (AEST = UTC+10)

---

## Lib Files
| File | Key exports |
|------|-------------|
| `lib/supabase.ts` | `supabase` client |
| `lib/zaeli-persona.ts` | `ZAELI_SYSTEM`, `ZAELI_KIDS_SYSTEM`, `zaeliPrompt()`, `generateBriefingInsight()` |
| `lib/zaeli-memory.ts` | `buildMemoryContext()`, `saveConversation()`, `writeInsight()`, `logPatternEvent()` |
| `lib/notifications.ts` | `requestNotificationPermission()`, `scheduleReminder()`, `detectReminderIntent()`, `parseReminderTime()` |
| `lib/useProductScanner.ts` | `pickImage()`, `scanProduct()`, `scanPantry()`, `scanReceipt()` |

---

## AI Model + Token Budgets
- Model: always `claude-sonnet-4-20250514`
- Max tokens: 600 chat, 500 brief, 120 greetings, 100 extractions, 1000 scan/vision

---

## Coding Rules
1. `SafeAreaView` always with `edges={['top']}` from `react-native-safe-area-context`
2. `StatusBar`: `style="light"` on dark/coloured heroes, `style="dark"` on light screens
3. Fonts: always use `fontFamily` from Poppins/DMSerif — never `fontWeight` alone on iOS
4. No fabrication — always use DUMMY_ constants or Supabase
5. Supabase dates: local ISO 8601, no timezone suffix
6. AI model: always `claude-sonnet-4-20250514`
7. **No floating FAB on any screen**
8. **Full file rewrites only** — never partial edits except single-line bug fixes
9. Windows PowerShell: run git commands separately (no `&&`), quote paths with spaces
10. Always put `npx expo start --clear` at end of every file delivery
11. User is beginner — step-by-step with copy-paste boxes
12. Tile icons: coloured boxes 42×42 borderRadius 12. Nav icons: 38×38 borderRadius 11. Solid light hex colours, NOT rgba tokens
13. **Icons are SVG components** — never emoji for UI icons
14. Import paths from `app/(tabs)/`: `../../lib/supabase`, `../components/NavMenu` (named: `{ NavMenu, HamburgerButton }`)
15. Brief cards: white card with coloured tint border. Blue ✦ avatar. Primary + ghost buttons
16. Ask Zaeli bar: white card, blue ✦, mic icon, coloured send button. Use `useSafeAreaInsets`
17. **Always full file rewrites** for screen updates (user does one copy-paste). Only give targeted edits for single-line fixes

---

## Expo / Dev Commands
```powershell
npx expo start --clear          # standard start
npx expo start --tunnel         # if localhost timeout
Remove-Item -Recurse -Force .expo   # clear cache
npx expo start --clear
```

---

## Pre-Launch To-Do (tracked in chat widget — March 2026)

### 🔴 Must ship before launch
1. Replace `DUMMY_FAMILY_ID` with real Supabase Auth
2. Build onboarding + family linking flow
3. Add Supabase Realtime to Shopping + Calendar
4. **Add per-family API usage logging to Supabase** *(next task)*
5. Replace `require('expo-image-picker')` inline with proper top-level import
6. Add camera/photo permissions to `app.json` (iOS NSCameraUsageDescription etc.)
7. Rate-limit brief generation per family (daily cap in Supabase)
8. **Move Anthropic API key server-side** — currently exposed in bundle via `EXPO_PUBLIC_`. Proxy through Supabase Edge Function before App Store submission

### 🟡 Before beta
9. Category guessing — local lookup table before API call
10. Brief caching — persist across app restarts (AsyncStorage or Supabase)
11. Fix blue bottom banner on Home screen (SafeAreaView bleed)
12. Fix `app/onboarding/calendar.tsx` font (DMSans → Poppins)
13. Build Meal Planner screen (reference: platform-v6 s-meals-plan)
14. Build Receipts tab in Shopping
15. Kids hub redesign (new brief pending)
16. Build Travel screen
17. Camera image upload in Zaeli Chat

### 🔵 Nice to have
18. Gmail / Outlook calendar integration (after core screens done)
19. Realtime on Home brief radar tiles
20. Per-family cost dashboard (admin view)

---

## API Cost Reference (March 2026)
| Call type | Approx cost |
|-----------|-------------|
| Brief generation | ~$0.0005 per open |
| Chat message | ~$0.001–0.003 per exchange |
| Category guess | ~$0.00002 per item |
| Pantry/receipt scan (vision) | ~$0.004–0.005 per scan |
| **Per family per month** | **~$0.20–0.30 normal use** |

At 1,000 families: ~$200–300/month API cost.
**Critical**: API key must be moved server-side before launch — currently exposed in app bundle.

---

## Tile Colours (Home screen 2×2 grid)
| Tile | Colour |
|------|--------|
| Calendar (top-left) | Magenta `#E0007C` |
| Shopping (top-right) | Black `#0A0A0A` |
| Meals (bottom-left) | Orange `#FF8C00` |
| To-dos (bottom-right) | Gold `#B8A400` |

---

## Completed Screens / Features (as of March 14 2026)
- ✅ `index.tsx` — Home with brief card, radar tiles, Ask Zaeli bar, NavMenu
- ✅ `calendar.tsx` — Full calendar, Add/Edit event, Zaeli brief, dismissed card, hamburger
- ✅ `shopping.tsx` — List tab, Pantry tab, Receipts stub, all with Ask Zaeli bar
- ✅ `zaeli-chat.tsx` — Multi-channel chat, memory, reminder detection
- ✅ `more.tsx` — Hub + Settings + Permissions screen
- ✅ `NavMenu.tsx` + `HamburgerButton` component
- ✅ `_layout.tsx` — Tab layout (all tabs hidden from bar)
- ✅ `lib/useProductScanner.ts` — pickImage, scanProduct, scanPantry, scanReceipt
- ✅ `zaeli-brief-logic-spec.md` — Full brief logic specification
- ✅ Pantry tab in shopping.tsx — scan, review, stock bars, insight card, nudge
- ✅ index.tsx — Option C tiles, typewriter brief, instant card load
- ✅ zaeli-chat.tsx — freeze fix, batched state, 60-msg cap, pantry nudge
- ✅ Sticky toolbar on Shopping List tab (+ Add item always visible)

## Pending Screens
- ⏳ `mealplanner.tsx` — after Receipts tab
- ⏳ Receipts tab (in shopping.tsx) ← IMMEDIATE NEXT
- ⏳ Travel screen
- ⏳ Kids hub (redesign brief pending)
- ⏳ API usage logging (Supabase table + wrapper)

---

## Session Notes
- CLAUDE.md lives at `C:\Users\richa\zaeli\CLAUDE.md`
- Reference HTML mockups: `/mnt/user-data/uploads/platform-v5.html`, `platform-v6__2_.html`
- Transcripts: `/mnt/transcripts/` — see `journal.txt` for catalog
- Always check transcripts if context is unclear — full source history is there
