## Zaeli App — New Chat Handover Brief
*15 March 2026 — copy this entire message to start a new chat*

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
**Master brief (CLAUDE.md):** `C:\Users\richa\zaeli\CLAUDE.md` — full stack, colours, family members, coding rules, all screen statuses. Read this first.

**Key constants:**
- `DUMMY_FAMILY_ID = '00000000-0000-0000-0000-000000000001'`
- `DUMMY_MEMBER_NAME = 'Anna'`
- AI model: always `claude-sonnet-4-20250514`

---

### What's been built (as of 15 March 2026)

✅ `index.tsx` — Home screen
- Blue hero, brief card (thinking dots → fade in full bold text, no typewriter), tiles (Option C coloured footer bars), radar, Ask Zaeli bar
- Brief text: no typewriter animation — shows "Zaeli is thinking…" until full response ready, then fades in with bold already applied
- Logo taps → home on all screens

✅ `calendar.tsx` — Full calendar, add/edit events, Zaeli brief, dismissed card, logo → home

✅ `shopping.tsx` — Major update this session:
- **List tab:** sticky toolbar (+ Add item + List/Aisle toggle), Recently Bought in MAGENTA (no strikethrough), ticking food items → auto-syncs to Pantry
- **Pantry tab:** sticky toolbar with List/Aisle toggle, List mode (Running Low/Well Stocked), Aisle mode (grouped by food category via keyword matching), scan buttons detect receipt vs pantry photo automatically
- **Spend tab** (was Receipts): monthly spend summary + receipt history, tap to expand items, "show all" for long receipts
- Receipt scan → saves to `receipts` table + syncs to Pantry + adds to Recently Bought
- Recently Bought re-add logic: Zaeli unchecks existing row instead of creating duplicate

✅ `zaeli-chat.tsx` — Multi-channel chat, shopping duplicate check (active dupes skipped, recently bought dupes moved back to active list), pantry nudge, memory

✅ `more.tsx` — Hub + Settings + Permissions + To-dos

✅ `NavMenu.tsx` + `HamburgerButton`

✅ `_layout.tsx` — Tab layout (all hidden, hamburger nav only)

✅ `pantry_items` Supabase table — working

✅ `receipts` Supabase table — created this session:
```sql
create table receipts (
  id uuid default gen_random_uuid() primary key,
  family_id uuid not null,
  store text,
  purchase_date date,
  total_amount numeric(10,2),
  item_count integer,
  items jsonb,
  raw_text text,
  created_at timestamptz default now()
);
```

---

### What we worked on in this session (15 March)

1. **Brief card animation fixed** — removed typewriter entirely. Now shows "Zaeli is thinking…" dots until API response, then fades in complete formatted text. No asterisk flash, no transition glitch.

2. **Shopping logo → home** — full rewrite of shopping.tsx with TouchableOpacity on logo

3. **Recently Bought behaviour redesigned:**
   - Renamed from "Purchased" to "Recently Bought"
   - Items show in MAGENTA (no strikethrough, no opacity) — functions as quick-reorder list
   - Re-adding an item in Recently Bought: Zaeli unchecks existing row (no duplicate)
   - Aisle mode applies to Recently Bought too, grouped by category

4. **Pantry tab redesigned:**
   - Sticky toolbar with + Add item and List/Aisle toggle (matches List tab)
   - Aisle mode groups by food category (keyword matching)
   - Scan buttons updated: "Fridge, pantry or receipt"

5. **Receipt scanning built:**
   - Auto-detects image type (receipt vs pantry scan)
   - Receipt → saves to `receipts` table, syncs to Pantry (good stock), adds to Recently Bought
   - Pantry scan → existing review flow

6. **Spend tab built** (replaced "Coming soon" stub):
   - Monthly spend card, receipt list with store/date/total
   - Tap to expand, "show all" for receipts with many items

7. **Food item tick → Pantry sync:**
   - Ticking off a food category item on the shopping list auto-upserts to Pantry (stock=good)
   - Household/Other categories do NOT sync

8. **Kids homework helper — feature spec agreed:**
   - Zaeli guides without giving answers (Socratic method)
   - Tested with Grade 6 decimal addition
   - Will be part of Kids Hub

---

### Immediate next tasks (in priority order)
1. **API usage logging** — Supabase table + wrapper on all API calls (per-family cost tracking)
2. **Meal Planner screen** — connect to Supabase, replace dummy data
3. **Travel screen** stub
4. **Kids Hub redesign** — include homework helper
5. **Test receipt scanning** with real photos and polish Spend tab

---

### Key design decisions (don't revisit without reason)
- No floating FAB anywhere
- Hamburger menu only navigation
- Tiles: Option C (coloured footer bar)
- To-dos: Gold `#B8A400`
- Logo on every screen taps → home
- Brief: thinking dots → fade in (no typewriter)
- Recently Bought: magenta text, no strikethrough
- Receipt capture: lives in Pantry tab (not Spend tab)
- Food items ticked off → auto-sync to Pantry
- Household/Other → do NOT sync to Pantry

---

### Tech reminders
- Import paths from `app/(tabs)/`: `../../lib/supabase`, `../components/NavMenu`
- SafeAreaView always `edges={['top']}`
- Poppins font for all UI, DMSerifDisplay for hero titles only
- Always `npx expo start --clear` after copying files
- PowerShell: no `&&` — use separate lines

---

Please confirm you've read this and are ready to continue. First priority is **API usage logging**.
