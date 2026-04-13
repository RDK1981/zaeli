# Zaeli — New Chat Handover
*13 April 2026 — Session 10 ✅ · Shopping sheet complete · Receipt/Pantry scan · Duplicate checking · Tick/undo · contextTrigger nav fix*
*Copy this entire message to start a new chat.*

---

## Hi! Continuing development of Zaeli.

Zaeli is an iOS-first AI family life platform built in React Native / Expo.
Read **CLAUDE.md** before starting — full stack, architecture, colours, ALL specs.
Then **ZAELI-PRODUCT.md** for product vision and full project plan.

---

## ══════════════════════════════════
## CURRENT STATE — ALL WORKING ✅
## ══════════════════════════════════

### Pages:
- **Dashboard** — peach-branded. 5 clean cards. Calendar · Meal Planner · Weather+Zaeli Noticed (bento) · Shopping · On the Radar. Brief lives in Chat (not Dashboard). Our Budget removed from Dashboard.
- **Chat** — lavender-branded. Fixed [Mic][TextInput+Camera][Send] bar. Full CRUD tools. Context flow from dashboard. Mic with waveform. Camera icon inside input field (Session 9 design — not yet built).
- **My Space** — sky-branded. Fixed header. WotD inline expand. Fitness full-width. 4-card grid (Goals, Notes & Tasks, Stretch, Zen) + Wordle. ALL sheets fully built with real content + Supabase persistence.

### Shopping sheet (Session 10 — COMPLETE):
- **List tab**: structured add form (Item+Qty), tick/undo (5s timer, green checkbox, strikethrough, Undo link), tap-to-expand Edit/Delete, red border delete confirm, duplicate checking, Recently Bought in muted grey
- **Pantry tab**: same add form, tap-to-expand Edit/Delete, "+ List" / "On list ✓" toggle, Scan/Upload buttons (receipt + pantry), pantry limit 500
- **Spend tab**: Poppins total (not DM Serif), A$ currency, Scan/Upload receipt, expandable receipt cards with delete, spend totals recalculate on delete
- **Receipt scan pipeline**: single Sonnet call, structured JSON extraction, pantry cross-check (update last_bought / add new), shopping list tick-off (only if item.created_at < receipt_date), receipt saved to Spend tab, ~A$0.02-0.04 per scan
- **Pantry scan pipeline**: single Sonnet call, add/update pantry items
- **HEIC fix**: expo-image-manipulator converts iOS HEIC → JPEG before API calls
- **Share button**: header icon, formats list as text for SMS/copy

### Infrastructure:
- Context flow: isActive prop + contextTrigger counter from swipe-world (fixes scroll race condition)
- ← Dashboard pill: uses onNavigateDashboard() not router.navigate() (fixes FAB disappearing)
- Dashboard refresh: isActive triggers loadData() on swipe back
- Full CRUD tools: calendar, todos, shopping, meals (add/update/delete)
- Shopping tools: duplicate check (list + pantry), SHOPPING RULES in system prompt, A$ currency rule
- Meal clash detection: warns before swapping
- Mic: direct startRecording/stopRecording in chat + FAB mic pipeline via pendingMicText
- Mic from shopping: routes through AI (not regex) for smart multi-item parsing
- Shopping context detection: checks for shopping chips on last Zaeli message
- 3-dot indicators: peach(0) · lavender(1) · sky(2)

---

## ══════════════════════════════════
## SESSION 9 — WHAT WAS DESIGNED (no code written)
## ══════════════════════════════════

Full design + strategy session. Five Claude handover HTML files produced.

### Philosophy B — LOCKED
Zaeli is AI-first. Chat is the product's beating heart. Dashboard is a reference layer. Zaeli speaks first. The conversation has already started before Rich types a word. Navigation architecture review deferred to Phase 2 with real usage data.

### Dashboard redesigned — 5 clean rows:
1. Calendar (dark slate) — collapsible, today's events with family colour dots
2. Meal Planner (mint) — tonight's dinner + week on expand, renamed from Dinner
3. Weather + Zaeli Noticed (bento) — Zaeli Noticed PROMOTED from bottom row
4. Shopping (lavender) — unchanged
5. On the Radar (gold) — personal + shared tasks due in 7 days, RENAMED from Family Tasks

**Removed from Dashboard:** Our Budget tile (→ More sheet placeholder), Zaeli brief card (→ Chat)

### Meal Planner sheet — full design:
- 3 tabs: Meals · Recipes · Favourites
- Meals tab: 7-day planner, mint highlights, today badge, family cooking avatars, heart to favourite, Swap picker (Favourites + Move night tabs inline), Who's cooking picker
- Recipes tab: + Add Recipe + Upload Recipe, search, 2-column grid, recipe detail with pantry-aware ingredient list
- Favourites tab: hearted recipes only, empty state
- Recipe upload: Sonnet vision reads recipe book photo, pre-fills form for review
- Send to list: pantry cross-check, user can override "In pantry ✓" → "Adding →"
- Reference: `zaeli-meals-mockup.html` (10 screens)

### Camera & Upload — designed:
- Chat bar: camera SVG icon (coral) inside right of text input field
- Taps open 92% action sheet: Take photo · Choose from library · Upload file
- Image → Sonnet vision → conversational response
- FAB More sheet: 3-column upload grid at top, same 3 options, then navigate to Chat
- Reference: `zaeli-camera-upload.html`

### AI Brief system — designed and locked:
- 3 briefs per day: morning (05:00–11:59) · midday (12:00–16:59) · evening (17:00–23:59)
- Generated by Sonnet, cached family-wide in `zaeli_briefs` Supabase table
- Fires on app open if time window changed AND natural break (app closed OR last msg >15min)
- Held if actively mid-conversation, fires on next open
- Morning: max 120 words · Midday: max 80 · Evening: max 90, never opens with task
- Winning mantra: positive open where true, acknowledge progress before tasks, Zaeli takes active credit
- Win banner (mint highlight): max once per brief, genuine moments only
- Max 4 chips, primary chip coral, always one dismissal chip
- Prompt caching on input tokens — ~90% cost reduction
- Reference: `zaeli-brief-examples.html`

### Zaeli persona — locked and expanded:
- **The winning mantra**: Make Rich feel capable, in control, winning at family life
- **Active credit rule**: "I've already updated Gab's soccer" — first person, not passive
- **Mini warmth rules**: GPT-5.4 mini must sound like Zaeli too. Never just confirms. One warm closing line after casual replies. Earned not manufactured.
- Full spec in CLAUDE.md Zaeli Persona section

### Model routing — locked:
```
Sonnet 4.6    → briefs · vision · complex · personality-heavy
GPT-5.4 mini  → general chat · CRUD · confirmations  (NEW — replaces gpt-4o-mini for chat)
GPT-4o-mini   → Zaeli Noticed ONLY (keep as-is)
Whisper-1     → voice transcription (unchanged)
```
Cost: ~$2.67/family/month with caching (18% of $14.99 revenue) at stress-test volume.
GPT-5.4 mini: $0.75/$4.50 per M tokens. Significantly better quality than Haiku for Zaeli's voice.

### Our Budget — deferred:
Upload-only approach without live bank feeds not compelling enough for Dashboard real estate. Basiq enquiry sent. Deferred to Phase 2 after bank feed pricing confirmed. Currently a "Coming soon" placeholder in FAB More sheet.

---

## ══════════════════════════════════
## NEXT PRIORITIES (in order)
## ══════════════════════════════════

**Immediate — Claude Code with handover files:**
1. ✅ **Shopping sheet** — COMPLETE (Session 10)
2. **Meal Planner sheet** — 3 tabs, swap/move, who's cooking, recipe upload (`zaeli-meals-mockup.html`)
3. **Dashboard redesign** — 5 clean rows, On the Radar card, Our Budget removed (`zaeli-dashboard-redesign.html`)
4. **Camera/Upload** — chat bar icon + FAB More sheet (`zaeli-camera-upload.html`)
5. **AI Brief system** — implement Sonnet briefs, GPT-5.4 mini routing, `zaeli_briefs` table (`zaeli-brief-examples.html`)

**Then:**
5. **Dedicated pages** — Kids Hub, Tutor, Our Family, Settings
6. **Our Budget** — when Basiq pricing confirmed (`zaeli-budget-final.html`)
7. **EAS Build** — HealthKit, embedded YouTube, real auth, TestFlight
8. **Nav architecture review** — Phase 2, with real usage data

---

## Key files:
- `app/(tabs)/index.tsx` — Chat (exports SwipeWorld default + HomeScreen named)
- `app/(tabs)/swipe-world.tsx` — Container (FAB, dots, landing, isActive props, pendingMicText)
- `app/(tabs)/dashboard.tsx` — Dashboard (cards + brief, isActive refresh)
- `app/(tabs)/my-space.tsx` — My Space (brief + WotD + grid + Wordle + all sheets)
- `app/components/ZaeliFAB.tsx` — FAB with mic waveform, peach dashboard active
- `lib/navigation-store.ts` — Context passing between dashboard↔chat

---

## Key constants
```
Dashboard logo a+i  = #FAC8A8 peach
Chat logo a+i       = #C4B4FF lavender
My Space logo a+i   = #A8D8F0 sky blue
Our Budget logo a+i = #059669 emerald
Dinner/Meal card    = #B8EDD0 mint
On the Radar card   = #F0DC80 gold (renamed from Family Tasks on Dashboard)
Notes & Tasks card  = #FAC8A8 peach (My Space personal)
FAB dash active     = #FAC8A8 bg, #8A3A00 icon
3-dot colours       = peach(0) · lavender(1) · sky(2)
All logos           = 40px Poppins_800ExtraBold
Send button         = #FF4545 coral ALWAYS
Body bg             = #FAF8F5 warm white
SONNET              = claude-sonnet-4-20250514
CHAT_MODEL          = gpt-5.4-mini          ← NEW (replaces gpt-4o-mini for chat)
NOTICED_MODEL       = gpt-4o-mini           ← Zaeli Noticed ONLY
DUMMY_FAMILY_ID     = 00000000-0000-0000-0000-000000000001
92% sheets          = height: H * 0.92 (NEVER maxHeight)
Date rule           = bare local YYYY-MM-DD, NEVER toISOString()
```

---

## Naming conventions (LOCKED)
```
Dashboard card       →  "On the Radar"    (NOT Family Tasks — session 9 rename)
My Space card/sheet  →  "Notes & Tasks"   (NOT Notes)
Dashboard card       →  "Meal Planner"    (NOT Dinner — session 9 rename)
Full-screen module   →  "Our Budget"      (NOT Budget)
Supabase (personal)  →  personal_tasks    (member-scoped)
Supabase (briefs)    →  zaeli_briefs      (family-scoped, NEW session 9)
Supabase (recipes)   →  recipes           (family-scoped, NEW session 9)
Supabase (meals)     →  meal_plan         (family-scoped, NEW session 9)
```

---

## CRITICAL RULES (learned from 15+ hours debugging)
- Chat bar = ALWAYS [Mic][TextInput][Send] — NEVER conditional render
- Send button = `<View onTouchStart>` — NEVER onPress/onPressIn/TouchableOpacity
- Clear input BEFORE calling send()
- NO onBlur handler on TextInput
- NO Keyboard.addListener setState
- useFocusEffect does NOT fire on swipe in swipe-world — use isActive prop + useEffect
- Chat mic = startRecording()/stopRecording() directly (FAB unmounted on chat page)
- swipe-world keyboardShouldPersistTaps = "handled" (NOT "always")
- barPill must NOT have onTouchEnd focus handler
- All edits to C:\Users\richa\zaeli (NOT worktree) — Expo reads from main
- personal_tasks = member-scoped (NOT family-scoped)
- zaeli_briefs = family-scoped (one per family per time window per day)
- What If mode = zero Supabase writes, amber banner always visible
- Budget raw statement data = never stored (privacy)
- CHAT_MODEL = gpt-5.4-mini · NOTICED_MODEL = gpt-4o-mini · NEVER swap these
- Brief model = SONNET always — never downgrade briefs to mini
- Camera icon = inside right of TextInput wrapper, NOT outside the bar
- KAV doesn't work in Modals on iOS — use Keyboard listener + shopKbHeight marginBottom instead
- contextTrigger counter for reliable sheet opening (not just isActive transitions)
- ← Dashboard pill = onNavigateDashboard() not router.navigate() (fixes FAB + activePage)
- Receipt scan = single Sonnet call, structured JSON, local cross-check (not general send() pipeline)
- Receipt tick-off = only if item.created_at < receipt_date (protects re-added items)
- HEIC → JPEG via expo-image-manipulator before any API call
- Currency = A$ always (system prompt CURRENCY rule)
- Pantry limit = 500 (not 100)

---

**Read CLAUDE.md fully before starting any code work.**
**For dashboard build: read zaeli-dashboard-redesign.html first.**
**For meal planner build: read zaeli-meals-mockup.html first.**
**For camera/upload build: read zaeli-camera-upload.html first.**
**For brief system build: read zaeli-brief-examples.html first.**
**For budget build (when ready): read zaeli-budget-final.html first.**
