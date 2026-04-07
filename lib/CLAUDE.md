# CLAUDE.md — Zaeli Project Context
*Last updated: 7 April 2026 — Outdated doc, refer to root CLAUDE.md for current state*

---

## What is Zaeli?

Zaeli is a family life platform — iOS-first React Native / Expo app. Think of it as a warm, intelligent family operating system: calendar, meals, shopping, kids' chores, todos, and an AI assistant that knows the family's rhythms. The AI persona is Zaeli — Anne Hathaway energy, Australian warmth, deadpan British wit used sparingly.

**Primary user:** Natalie (mum, Brisbane). Family: Sarah (🦁, Year 5), Jack (🐯, Year 3), Mum (👩), Dad (👨).

---

## Stack

| Layer | Tech |
|-------|------|
| Framework | React Native + Expo (iOS-first) |
| Router | Expo Router (file-based, `app/(tabs)/`) |
| Backend | Supabase (direct client calls, no server) |
| AI | Anthropic API direct from client (`claude-sonnet-4-20250514`) |
| Fonts | DMSerifDisplay_400Regular + Poppins (400/500/600/700/800) |

**Key constants:**
```ts
DUMMY_FAMILY_ID = '00000000-0000-0000-0000-000000000001'
DUMMY_MEMBER_NAME = 'Natalie'
EXPO_PUBLIC_ANTHROPIC_API_KEY — env var
```

**Anthropic API headers (always include):**
```ts
'x-api-key': process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY || ''
'anthropic-version': '2023-06-01'
'anthropic-dangerous-direct-browser-access': 'true'
'Content-Type': 'application/json'
```

---

## Color Tokens (C object — copy exactly)

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
}
```

---

## Tab Structure

| File | Tab label | Hero color | Accent |
|------|-----------|------------|--------|
| `index.tsx` | Home | `#0057FF` | blue |
| `calendar.tsx` | Cal | `#E0007C` | magenta |
| `shopping.tsx` | Shop | `#0A0A0A` dark hero | `#B8A400` yellowD |
| `mealplanner.tsx` | Meals | TBD | `#FF8C00` orange |
| `chores.tsx` | Kids | `#0A0A0A` dark hero | `#00C97A` green |
| `more.tsx` | More | `#0A0A0A` | dark |
| `lists.tsx` | (hidden) | dark | — |
| `settings.tsx` | (hidden, empty) | — | — |
| `zaeli-chat.tsx` | (no tab, no tabBar) | white | — |

---

## V6 Hero Pattern (THE reference — from index.tsx)

Every screen with a hero follows this structure:

```tsx
<SafeAreaView style={{flex:1, backgroundColor: HERO_COLOR}} edges={['top']}>
  <StatusBar style="light"/>
  <ScrollView>
    <Animated.View style={[s.hero, {opacity, transform}]}>
      {/* Orb glows: heroOrbOuter, heroOrbInner, heroOrb2 */}
      {/* Logo row: logoMark (44x44, rgba(255,255,255,0.2), borderRadius:14) + logoWord (DMSerif 30px white) */}
      {/* Greeting: greetLine (DMSerif 34, rgba(255,255,255,0.75)) + nameLine (DMSerif 44, #fff) */}
      {/* Zaeli Brief Card — white card, borderRadius:22 */}
    </Animated.View>
    <Animated.View style={[s.body, {backgroundColor:'#F7F7F7'}]}>
      {/* Screen content */}
    </Animated.View>
  </ScrollView>
</SafeAreaView>
```

**Orb glows (copy from index.tsx):**
```tsx
heroOrbOuter: position absolute, width 260, height 260, borderRadius 130, top -80, right -60, backgroundColor rgba(255,255,255,0.06)
heroOrbInner: position absolute, width 160, height 160, borderRadius 80, top -20, right 20, backgroundColor rgba(255,255,255,0.08)
heroOrb2: position absolute, width 100, height 100, borderRadius 50, bottom 10, left -20, backgroundColor rgba(255,255,255,0.04)
```

---

## Zaeli Brief Card (index.tsx pattern)

White card inside the hero. Structure:
- Header: `PulsingAvatar` (28px) + "Zaeli" (DMSerif 16) + live green dot + time
- Loading: typing dots animation (3 dots, stagger)
- Text: `AnimatedBriefSentences` — sentence-per-line, stagger fade+slide
- Bold: `**text**` parsed inline → `Poppins_700Bold`
- Primary CTA: `#E0007C` magenta, `borderRadius:14`, `Poppins_600SemiBold`
- Ghost CTA: `rgba(0,0,0,0.055)` bg, `borderWidth:1.5`, `rgba(0,0,0,0.09)` border
- Dismissed → relaxedCard: avatar + "Still here if you need me" + "Let's chat ✦" in `rgba(0,87,255,0.08)`

**Brief generation:** 4-part structure per `zaeli-brief-logic-spec.md`:
1. Callback (something that already happened)
2. What's coming that matters (most important upcoming event)
3. What's quietly slipping (overdue/at-risk items)
4. Contextual question → CTA label must match

**Dismiss flow:** `cardFade` Animated.Value → fade+slide out (300ms) → 350ms delay → relaxedCard fades in. Persists for session.

---

## Zaeli Brief Logic Spec (condensed)

Full spec in `zaeli-brief-logic-spec.md`. Key rules:

**Time windows:**
- 6am–noon: morning frame, today's events
- noon–4pm: today + tonight
- 4pm–7pm: tonight, dinner urgency
- 7pm–9pm: wrap today + tomorrow preview
- 9pm–11pm: tomorrow frame
- 11pm–6am: tomorrow, minimal

**Dinner logic:**
- Before 7pm, unplanned → mention in brief, offer ideas
- Before 7pm, planned → tile only, not in brief
- 7–9pm, unplanned → shift to "tomorrow's dinner"
- After 9pm → never mention dinner

**Tone rules:**
- No italic text
- Bold sparingly — names, times, deadlines only (max 3)
- Never start with "I"
- Max 4 sentences, min 2
- Never sound like a push notification
- Never be vague — name things specifically

---

## Zaeli Persona (from zaeli-persona.ts)

Import: `import { ZAELI_SYSTEM, zaeliPrompt, generateBriefingInsight } from '@/lib/zaeli-persona'`

**Voice:** Warm, brilliant, sparkling. Anne Hathaway energy. Australian warmth — real, unpretentious. Ultra-intelligent but wears it lightly.

**Wit style:** Occasionally deadpan British — mock-formality about household chaos. Used sparingly. Examples: *"a scheduling conflict of some ambition"*, *"proceed with misplaced confidence"*, *"I thrive on chaos"*, *"I refuse to let the adults go unrepresented"*.

**Length:** Two sentences max unless genuinely needed. Never pad.

**Never says:** "Certainly", "Absolutely!", "Of course!", "I'd be happy to help", "As an AI", "mate", hollow praise, corporate language.

**Screen-specific focus strings** are in `SCREEN_FOCUS` record in `zaeli-persona.ts` — use `generateBriefingInsight(context, screenName, gender)` for proactive brief insights per screen.

**Capability rules (CRITICAL — never violate):**
- CANNOT make phone calls
- CANNOT send messages/emails autonomously (can draft)
- CAN: add calendar events, todos, shopping items, meal plans

---

## Lib Files

| File | Key exports |
|------|-------------|
| `lib/supabase.ts` | `supabase` client |
| `lib/zaeli-persona.ts` | `ZAELI_SYSTEM`, `ZAELI_KIDS_SYSTEM`, `zaeliPrompt()`, `generateBriefingInsight()` |
| `lib/zaeli-memory.ts` | `buildMemoryContext()`, `saveConversation()`, `writeInsight()`, `logPatternEvent()` |
| `lib/notifications.ts` | `requestNotificationPermission()`, `scheduleReminder()`, `detectReminderIntent()`, `parseReminderTime()` |

**`buildMemoryContext(familyId)`** — call before every AI request. Returns string with family routines, patterns, preferences, milestones, last week's digest. Inject into system prompt.

---

## Components

| Component | Path | Usage |
|-----------|------|-------|
| `SwipeToDelete` | `../components/SwipeToDelete` | Named export. Props: `onDelete`, `accentColour`, `deleteLabel`, `deleteEmoji`, `children`, `style`, `enabled` |
| `TodoCard` | `../components/TodoCard` | Default export. Props: `todo: Todo`, `onToggle` |

---

## Supabase Tables

| Table | Key columns |
|-------|-------------|
| `events` | `family_id, title, date, start_time, end_time, event_type, notes` |
| `shopping_items` | `family_id, name, checked, category, aisle` |
| `meal_plans` | `family_id, day_key (YYYY-MM-DD), meal_type, title, emoji, prep_mins, notes` |
| `todos` | `family_id, title, status, priority, context, due_date, show_in_brief, pinned, reminder_time, notif_id` |
| `missions` | `family_id` — kids jobs/chores |
| `mission_completions` | completions requiring approval |
| `rewards` | `family_id, title, points_cost, icon` |
| `family_members` | `family_id, name, avatar_emoji, colour, role` |
| `reminders` | `family_id, title, body, remind_at, repeat, notif_id, status, source` |
| `notes` | `family_id, title, body, linked_type, linked_label, linked_colour, colour, pinned` |
| `family_insights` | `family_id, category, subject, insight, confidence, occurrence_count` |
| `family_milestones` | `family_id, title, description, happened_on, emoji, category` |
| `conversation_memory` | `family_id, role, content, tags` |
| `weekly_digests` | `family_id, summary, week_start` |
| `pattern_log` | `family_id, event_type, event_key, value, day_of_week, metadata` |
| `recipes` | `family_id, title, content, source` |
| `list_items` | general lists |
| `tutoring_sessions` | kids tutoring |

---

## Tool Definitions (zaeli-chat.tsx)

Zaeli supports these tools in the agentic loop:
- `add_calendar_event` — start_time as ISO 8601 LOCAL time, no timezone suffix
- `add_shopping_item` — items array with name + category
- `add_todo` — title, due_label, priority, assignee
- `save_recipe` — title, content
- `add_meal_plan` — day_key YYYY-MM-DD, meal_type, title
- `complete_todo` — title (fuzzy match)

**Agentic loop:** Up to 6 turns. Execute ALL tool_use blocks per turn. Show text blocks between tool calls. Final text reply after `stop_reason !== 'tool_use'`.

---

## Screen Inventory

| Screen | Status | Notes |
|--------|--------|-------|
| `index.tsx` | ✅ Built | V6 hero, brief card, animated sentences, dismiss flow |
| `calendar.tsx` | ✅ Built | Not yet received in session |
| `chores.tsx` | ✅ Built | Kids jobs, tutoring, rewards, missions |
| `more.tsx` | ✅ Built | Hub + Todo + Notes + Family + Jobs/Rewards sub-screens |
| `zaeli-chat.tsx` | ✅ Built | Multi-channel, tool use, agentic loop, SVG icons |
| `shopping.tsx` | 🔨 To build | Dark hero, brief card, list/aisle toggle, tool integration |
| `mealplanner.tsx` | 🔨 To build | Not yet received |
| `settings.tsx` | ⬜ Empty | Placeholder only |
| `lists.tsx` | ✅ Built | Hidden tab, dark theme |

---

## Onboarding Screens (app/onboarding/)

Files: `_layout.tsx`, `briefing.tsx`, `calendar.tsx`, `chores.tsx`, `family.tsx`, `index.tsx`, `ready.tsx`, `signup.tsx`, `time.tsx`, `voice.tsx`

Stack navigator, `headerShown: false`, `animation: slide_from_right`.

---

## HTML Mockups — Design Intent

### Dismissed Card Variations (`dismissed-card-variations.html`)
After tapping "I'm sorted, thanks" the brief card animates out and is replaced by a **relaxed state**:
- Small avatar + "No worries! 😊" or "All good! 👍" or "Got it! ✅" (varies by screen)
- `Ask Zaeli anything` input bar below
- CTA button label varies by screen context:
  - Home: "Let's chat ✦"
  - Calendar: "Open Zaeli ✦"
  - Shopping: "Chat to Zaeli ✦"
  - Meals: "Let's cook something ✦"
- Each screen has its OWN brief card with context-specific Zaeli message (not just home):
  - **Home brief:** "Soccer pickup at 3:30 — want me to loop in a dinner plan around that so you're not scrambling at 5pm?"
  - **Calendar brief:** "Heads up — soccer pickup and dentist both land at 3:30pm Thursday. Want me to help sort that clash?"
  - **Shopping brief:** "8 items on your list — milk and eggs are running low based on last week. Want me to check if anything's missing before your run?"
  - **Meals brief:** "Thursday and Friday have nothing planned for dinner — want me to suggest something easy that uses what's already on the shopping list?"

### Lunchbox Builder (`lunchbox-guided-v2.html`, `lunchbox-ipad.html`)
A guided lunchbox building flow inside the **Kids screen**. Three-step flow:

**Step 1 — Pick items** (pre-filled from child's history):
- Sections: 🥪 Main, 🍓 Fruit, 🌽 Snack, 🍫 Treat, 🥒 Extra
- Each item shows: emoji + name + frequency count (e.g. "8×") + ❤️ favourite tag
- Icons: ✕ (already in box) / 🛒+ (add to shopping) / heart (favourite)
- ⚠️ Warning if category missing (e.g. "3 days no fruit")
- Zaeli insight at top: *"His favourites are pre-selected — just swap anything you'd like to change. I've flagged that there's been no fruit since Tuesday!"*

**Step 2 — Preview + nutrition check:**
- Live preview of lunchbox contents
- Nutrition check: Protein ✓ / Fruit ! / Carbs ✓ / Veg ✓ / Treat 1×
- ⚠️ Warning if required category empty
- 🛒 items can be added to shopping list inline

**Step 3 — Save**

**Per-child personalisation:** Duke (🔵 #4A90E2), Poppy (🟣 #9B6DD6), Gab (🔵 #00B4D8)

**iPad version:** Sidebar nav + split-pane layout. Sidebar shows child tabs with box count (Duke 15 boxes, Poppy 11 boxes, Gab 9 boxes). Sub-nav: Lunchbox / Pantry / Build / Scan Photo / Weekly Planner.

**Supabase tables needed:** `lunchbox_items`, `lunchbox_history`, `pantry_items` (or use `shopping_items` with lunchbox flag)

**Status:** HTML mockup complete — React Native screen not yet built. Will live inside `chores.tsx` or as a sub-screen of Kids.

### Tone Examples (`zaeli-tone-examples-v8.html`)
The definitive Zaeli voice reference. Key examples to preserve:

**Signature lines in action:**
- *"Send carrier pigeon — whatever works, I'll sort it"* — removes barrier to using her
- *"Thursday has developed a scheduling conflict of some ambition"* — mock-grand, deadpan
- *"Sarah — a woman of singular culinary conviction"* — affectionate, British
- *"I refuse to let the adults go unrepresented"* — warm, on their side
- *"I thrive on chaos"* — alive, not mechanical
- *"The obligations, I'm afraid, persist"* — to a kid avoiding chores
- *"Worth a quick check first — I'd rather ask than proceed with misplaced confidence"* — before meal suggestions
- *"You're very organised when you have help"* — cheeky, warm, to Dad
- *"Tonight is completely yours — just breathe"* — when love is what's needed, no spark

**Mum (Natalie) voice:** Full sparkle. "Oh love." Mock-British flourishes. Asks what SHE wants, not just the kids.

**Dad (Mark) voice:** Same Zaeli, touch more direct. "Now we're talking." "I refuse to let the adults go unrepresented." Still funny, still warm.

**Kids voice:** Full aunty mode. Turns chores into heroics. "The obligations, I'm afraid, persist." "She needs her person. Go be her hero." Genuine specific praise only.

**Go-between role:** Zaeli bridges Natalie and Mark naturally. *"I noticed Mark added a work dinner Friday evening — wanted to give you a heads up before it sneaks up on you!"* Never heavy, always warm.

**The brain dump pattern:** User dumps chaos → Zaeli structures it → user feels brilliant. *"You just handed me a week's worth of chaos and it took thirty seconds — honestly, you're a joy to work with."*

**Hard moments:** Fewest words. No wit. *"Oh love. Vent or sort — what do you need?"* → *"Tonight is completely yours — just breathe 💛"*

**The test:** Would a family tell their neighbour about this? *"Zaeli is hilarious — but she helps tremendously."*

---

## Coding Patterns & Rules

1. **SafeAreaView** always with `edges={['top']}` from `react-native-safe-area-context`
2. **StatusBar** — `style="light"` on dark heroes, `style="dark"` on light screens
3. **Fonts** — Always use `fontFamily` from Poppins/DMSerif, never `fontWeight` alone on iOS
4. **No fabrication** — Never invent data, always use DUMMY_ constants or Supabase
5. **Supabase timezone** — Store dates as local ISO 8601 without timezone suffix (AEST = UTC+10)
6. **Animation** — Use `Animated` from RN. Hero uses `opacity` + `translateY` on scroll
7. **Bold parsing** — `**text**` → split on regex, render as `Poppins_700Bold` spans
8. **SwipeToDelete** import: `../components/SwipeToDelete` (named export)
9. **AI model**: always `claude-sonnet-4-20250514`
10. **Max tokens**: 600 for chat, 200 for brief, 120 for greetings, 100 for extractions

---

## Platform V5 Mockup — Reference Only (`platform-v5.html`)
**Note: This mockup predates current V6 implementation. Use for feature ideas only — not for UI patterns.**

Features shown that aren't yet built but are planned:
- **Shopping → Pantry tab:** Running low items (Critical/Low/Well Stocked), scan fridge/pantry, Zaeli auto-adds low items
- **Shopping → Receipts tab:** Past receipts from Woolworths/Coles, monthly spend tracking (*"$342 this month — $28 less than February"*)
- **Meals → History tab:** Past meals with "Cook again" option, last made date, star ratings
- **Meals → Recipes tab:** Saved recipes with time/serves/rating, "Add to plan" + shopping list button
- **Kids → Learning sub-screen:** Read to Zaeli (mic-based), Maths/Science practice, Homework tracker with subject breakdown + accuracy %
- **Kids → Holidays/Trips:** Japan 2026, Bali 2025 etc. — trip planning with flights, hotels, activities, budget, docs
- **More → Holidays:** Holiday planning hub (currently not in more.tsx)
- **Home tiles:** Next Up, Kids today (jobs done/total), Shopping (item count), Tonight (meal + ingredients status)
- **Chat:** Pantry-aware responses (*"You've got everything except bok choy"*), reminder setting from chat

Family name in mockup: **The Johnsons** (Natalie, Mark, Sarah age 9, Jack age 7) — slightly different to current dummy data.

Tab structure in V5 was: Home / Cal / Shop (List+Pantry+Receipts) / Meals (Plan+Recipes+History) / Kids / More — sub-tabs within screens rather than separate top-level tabs.

---

## Pending / Planned Features

- `shopping.tsx` — full V6 build with brief card + list/aisle toggle
- `mealplanner.tsx` — meal planning screen
- Kids lunchbox section (HTML mockup exists)
- `settings.tsx` — account, privacy, theme
- Learning/tutoring screen (marked "Soon" in more.tsx hub)
- Pattern detection running weekly
- Weekly digest generation
- Family member device profiles

---

## Session Notes

- Timezone: AEST (UTC+10, Brisbane). Always use local time in ISO 8601 without Z suffix.
- Location: Brisbane (-27.4698, 153.0251)
- GitHub repo: https://github.com/RDK1981/zaeli (private)
- `CLAUDE.md` lives at repo root — update after significant changes
- Previous session (March 2026): Built index, chores, more, zaeli-chat. Shopping is next.
