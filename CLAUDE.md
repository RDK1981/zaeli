# CLAUDE.md — Zaeli Project Context
*Last updated: 13 March 2026*

---

## What is Zaeli?

Zaeli is a family life platform — iOS-first React Native / Expo app. A warm, intelligent family operating system: calendar, meals, shopping, kids' chores, todos, and an AI assistant that knows the family's rhythms.

**AI persona:** Zaeli — Anne Hathaway energy, Australian warmth, deadpan British wit used sparingly.

**Logged-in user:** Anna. Family: Anna, Richard, Poppy, Gab, Duke.

```ts
DUMMY_FAMILY_ID   = '00000000-0000-0000-0000-000000000001'
DUMMY_MEMBER_NAME = 'Anna'
```

---

## Stack

| Layer | Tech |
|-------|------|
| Framework | React Native + Expo (iOS-first) |
| Router | Expo Router (file-based, `app/(tabs)/`) |
| Backend | Supabase (direct client calls, no server) |
| AI | Anthropic API direct from client (`claude-sonnet-4-20250514`) |
| Fonts | DMSerifDisplay_400Regular + Poppins (400/500/600/700/800) |

**Anthropic API headers (always include):**
```ts
'x-api-key': process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY || ''
'anthropic-version': '2023-06-01'
'anthropic-dangerous-direct-browser-access': 'true'
'Content-Type': 'application/json'
```

**Max tokens:** 600 chat · 500 brief · 120 greetings · 100 extractions
**Model:** always `claude-sonnet-4-20250514`

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
  mag: '#E0007C',
}
```

---

## Tab Structure

| File | Screen | Hero color |
|------|---------|------------|
| `index.tsx` | Home | `#0057FF` blue |
| `calendar.tsx` | Calendar | `#E0007C` magenta |
| `shopping.tsx` | Shopping | `#0A0A0A` dark |
| `mealplanner.tsx` | Meal Planner | `#FF8C00` orange |
| `chores.tsx` | Kids | `#0A0A0A` dark |
| `more.tsx` | More (hub) | `#0A0A0A` dark |
| `zaeli-chat.tsx` | Chat (no tab) | white |

All tabs hidden from tab bar (`href: null`). Navigation via hamburger menu only.

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
```

---

## NavMenu (`app/components/NavMenu.tsx`)

- Panel: 300px wide, maxHeight 740px, white card, borderRadius 22px
- Slides from top-right with scale + translateX animation
- Icons: bare emoji at fontSize 22, NO coloured background squares
- Sections: Daily (Home, Calendar, To-dos) · Household (Shopping, Meal Planner, Kids) · Personal (Notes, Travel, Our Family) · Settings

---

## Hero Pattern (all screens)

```tsx
<SafeAreaView style={{flex:1, backgroundColor: HERO_COLOR}} edges={['top']}>
  <StatusBar style="light"/>
  <ScrollView>
    <Animated.View style={[s.hero, {opacity, transform}]}>
      {/* Orb glows: heroOrbOuter, heroOrbInner, heroOrb2 */}
      {/* Logo row: logoMark (44x44, rgba(255,255,255,0.2), br:14) + logoWord (DMSerif 30px white) */}
      {/* Greeting: greetLine (DMSerif 34, rgba(255,255,255,0.75)) + nameLine (DMSerif 44, #fff) */}
      {/* Zaeli Brief Card */}
    </Animated.View>
    <Animated.View style={[s.body, {backgroundColor:'#F7F7F7'}]}>
      {/* Screen content */}
    </Animated.View>
  </ScrollView>
  {/* Ask Zaeli bar — position absolute bottom */}
</SafeAreaView>
```

---

## Ask Zaeli Bar (Home + Calendar)

Sticky bar, `position:'absolute'` bottom. Uses `useSafeAreaInsets()`.
Structure: ✦ diamond + placeholder + mic + send button.
- **Home:** blue (`#0057FF`) send + diamond
- **Calendar:** magenta (`#E0007C`) send + diamond
- Tapping anywhere → opens zaeli-chat with appropriate channel

---

## Home Screen (`index.tsx`)

### Tiles (2×2 grid)
Layout: `justifyContent:'space-between'` — icon pinned top, `tileBottom` View for text at bottom.
Handles long titles without crowding the icon.

| Tile | Icon | Label | Nav |
|------|------|-------|-----|
| Next Up | 📅 | NEXT UP | `/(tabs)/calendar` |
| Dinner | 🍽 | DINNER/TOMORROW | `/(tabs)/mealplanner` |
| Shopping | 🛒 | SHOPPING | `/(tabs)/shopping` |
| To-dos | ✅ | TO-DOS | `/(tabs)/more` → todo |

Use `🍽` not `🍽️` (no variation selector).

### Radar
- Deduplicates recurring events by title — only next occurrence per title shown
- Reminder classification uses `event_type === 'reminder'` ONLY — never notes/title text
- All rows are tappable TouchableOpacity → calendar or more screen

### Brief
- Pre-format all event times with `fmtEv()` → 12-hour AM/PM before passing to model
- Current time passed explicitly; model checks if events already passed
- After 9pm: no dinner; after 11pm: no tonight events
- JSON response shape: `{brief, cta, signoff}`

---

## Calendar Screen (`calendar.tsx`)

- Day / Week / Month tab views
- 180-day horizontal date strip, selected date = magenta pill
- Brief card with calendar-context system prompt
- **Add event:** Sheet (Zaeli-first) → seed message includes ISO date `(YYYY-MM-DD)`
- **AddEventSheet:** Uses `rendered` flag (not `!visible`) so sheet re-opens correctly every time
- **Event rows:** All tappable with `›` chevron → `EventDetailModal`
  - Shows: title, date, time, notes, timezone
  - ✨ Edit with Zaeli → zaeli-chat with edit seed
  - 🗑 Delete event → two-tap confirm + `loadEvents()` refresh
- **Ask Zaeli bar:** Magenta, always visible at bottom

---

## Zaeli Chat (`zaeli-chat.tsx`)

**Channels:** General · Calendar · Shopping · Meals · ✦

### Tools (full list)

| Tool | Key behaviour |
|------|---------------|
| `add_calendar_event` | Single event. LOCAL ISO 8601. Always `timezone:'Australia/Brisbane'`. |
| `add_recurring_event` | `frequency`: weekly/fortnightly/monthly. Inserts individual rows from first date → 31 Dec. Batches of 50. |
| `update_calendar_event` | Find by `search_title`. Updates in place. Use for ALL reschedules/edits. NEVER duplicate. |
| `delete_calendar_event` | Find by `search_title` + optional `date`. Single occurrence delete. |
| `add_shopping_item` | Items array: name + category |
| `add_todo` | title, due_label, priority, assignee |
| `save_recipe` | title, content |
| `add_meal_plan` | day_key YYYY-MM-DD, meal_type, title |
| `complete_todo` | title fuzzy match |

### Capability Rules (never violate)
- NO phone calls
- NO autonomous send — can draft only
- NO "draft a reminder" / "set a reminder" for calendar events — the event IS the reminder
- EDITING = `update_calendar_event`, never add + leave old
- RECURRING = `add_recurring_event`, books through 31 Dec current year

### Time
- Always LOCAL ISO 8601, no Z: `2026-03-15T18:45:00`
- Seed message includes both readable date AND ISO date — model must use seed date, not today

### Re-entry Greeting
On mount: if `loadedChans.has(activeCtx)` (channel has history) and no seed → show random warm note (5 options: "Hey, back again! What else can I help with? 😊" etc.)

---

## Supabase Tables

| Table | Key columns |
|-------|-------------|
| `events` | `family_id, title, date, start_time, end_time, event_type, notes, timezone TEXT DEFAULT 'Australia/Brisbane'` |
| `shopping_items` | `family_id, name, checked, category, aisle` |
| `meal_plans` | `family_id, day_key (YYYY-MM-DD), meal_type, title, emoji, prep_mins, notes` |
| `todos` | `family_id, title, status, priority, context, due_date, show_in_brief, pinned, reminder_time, notif_id` |
| `missions` | kids jobs/chores |
| `mission_completions` | completions needing approval |
| `rewards` | `family_id, title, points_cost, icon` |
| `family_members` | `family_id, name, avatar_emoji, colour, role` |
| `reminders` | `family_id, title, body, remind_at, repeat, notif_id, status, source` |
| `notes` | `family_id, title, body, linked_type, linked_label, colour, pinned` |
| `family_insights` | `family_id, category, subject, insight, confidence, occurrence_count` |
| `family_milestones` | `family_id, title, description, happened_on, emoji, category` |
| `conversation_memory` | `family_id, role, content, tags` |
| `weekly_digests` | `family_id, summary, week_start` |
| `pattern_log` | `family_id, event_type, event_key, value, day_of_week, metadata` |
| `recipes` | `family_id, title, content, source` |
| `list_items` | general lists |
| `tutoring_sessions` | kids tutoring |

**Add timezone column (already run):**
```sql
ALTER TABLE events ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Australia/Brisbane';
```

---

## Lib Files

| File | Key exports |
|------|-------------|
| `lib/supabase.ts` | `supabase` client |
| `lib/zaeli-persona.ts` | `ZAELI_SYSTEM`, `ZAELI_KIDS_SYSTEM`, `zaeliPrompt()`, `generateBriefingInsight()` |
| `lib/zaeli-memory.ts` | `buildMemoryContext()`, `saveConversation()`, `writeInsight()`, `logPatternEvent()` |
| `lib/notifications.ts` | `requestNotificationPermission()`, `scheduleReminder()`, `detectReminderIntent()`, `parseReminderTime()` |

---

## Screen Inventory

| Screen | Status | Notes |
|--------|--------|-------|
| `index.tsx` | ✅ | V6 hero, brief, tiles, radar, ask bar |
| `calendar.tsx` | ✅ | Day/week/month, add/edit/delete, ask bar |
| `zaeli-chat.tsx` | ✅ | All tools, agentic loop, recurring, re-entry |
| `NavMenu.tsx` | ✅ | Hamburger panel, clean emoji icons |
| `chores.tsx` | ✅ | Kids jobs, tutoring, rewards |
| `more.tsx` | ✅ | Hub + Todo + Notes + Family |
| `shopping.tsx` | 🔨 | To build |
| `mealplanner.tsx` | 🔨 | To build |
| `settings.tsx` | ⬜ | Empty placeholder |

---

## Coding Rules

1. `SafeAreaView` always `edges={['top']}` from `react-native-safe-area-context`
2. `StatusBar` — `style="light"` on coloured heroes, `style="dark"` on light screens
3. Fonts — always `fontFamily`, never `fontWeight` alone on iOS
4. No fabrication — DUMMY_ constants or Supabase only
5. Dates — local ISO 8601, no Z suffix (AEST = UTC+10)
6. **Full file rewrites only** — user does one copy-paste. Targeted edits only for single-line fixes.
7. No floating FAB on any screen
8. Windows PowerShell: run git commands separately (no `&&`)
9. Always end file delivery with `npx expo start --clear`

---

## Zaeli Brief Logic (from `zaeli-brief-logic-spec.md`)

**4-part structure:** Callback → Coming up → Quietly slipping → Contextual question

**Time frames:**
- 6am–noon: morning, today, energetic
- noon–4pm: today + tonight, steady
- 4pm–7pm: tonight, dinner urgency, warm
- 7–9pm: wrap today + tomorrow preview
- 9–11pm: tomorrow frame, calm
- 11pm–6am: tomorrow, minimal

**Dinner rules:**
- Before 7pm + unplanned → mention in brief, CTA = meal suggestions
- Before 7pm + planned → tile only
- 7–9pm + unplanned → "Tomorrow night's not planned yet either"
- After 9pm → never mention dinner
- After 9pm + tomorrow unplanned → one gentle mention only if brief is light

**Time output rules:**
- Always 12-hour AM/PM. Never "23:00". Never "21:00".
- Pre-format via `fmtEv()` before sending context to model
- If time has passed → skip/acknowledge as done, not upcoming
- After 11pm → no tonight events at all

**Tone:** Never nag. Bold sparingly (max 3). Never push-notification. Name things specifically.

---

## Zaeli Persona

**Voice:** Warm, brilliant, magnetic. Anne Hathaway energy. Australian warmth — real, not performative.

**Wit:** Deadpan British mock-formality, sparingly.
Examples: *"a scheduling conflict of some ambition"* · *"I thrive on chaos"* · *"proceed with misplaced confidence"*

**Never:** "Certainly!", "Absolutely!", "Of course!", "I'd be happy to help", "As an AI", hollow praise.

**Home brief tone:** Must be as alive and warm as a calendar chat response — never dry or robotic.

---

## Git & Dev

```
Repo: https://github.com/RDK1981/zaeli (private)
Local: C:\Users\richa\zaeli
Location: Brisbane (-27.4698, 153.0251), AEST UTC+10
```

**PowerShell (run each line separately):**
```powershell
cd C:\Users\richa\zaeli
git add -A
git commit -m "message"
git push
```

**Expo:**
```powershell
npx expo start --clear
npx expo start --tunnel   # if timeout
```

---

## Session Log

| Date | Work done |
|------|-----------|
| Mar 2026 wk1 | Built index, chores, more, zaeli-chat. V6 hero. |
| Mar 2026 wk2 | Calendar screen. NavMenu. Home refinements. |
| Mar 2026 wk2 | Calendar timezone. Zaeli-first add-event sheet. |
| **13 Mar 2026** | Calendar: event tap/detail/edit/delete modal, AddEventSheet re-open fix, ask bar. Chat: add_recurring_event (bulk rows to Dec 31), update_calendar_event, delete_calendar_event, edit-not-duplicate rule, no-reminder-drafting capability rule. Home: reminder classifier (event_type only), tile layout (icon top + tileBottom), radar dedup + tappable rows, 12hr time in brief + fmtEv pre-format. NavMenu: clean bare emoji icons. Re-entry greeting (loadedChans check on mount). |
