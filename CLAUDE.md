# CLAUDE.md — Zaeli Project Context
*Last updated: 9 April 2026 — Session 5 ✅ · Design refresh all 3 pages · Peach dashboard · Lavender chat · My Space 6-card grid · Briefs on all pages*

---

## ══════════════════════════════════
## SCREEN ARCHITECTURE — CRITICAL (LOCKED ✅)
## ══════════════════════════════════

**Three screens, swipe world:**
```
Dashboard (0)  →  Chat (1)  →  My Space (2)
```
App opens on Dashboard (page 0). Swipe right for Chat, right again for My Space.

**92% SHEETS over Chat — NEVER dedicated screens:**
Calendar · Shopping · Meal Planner · Todos / Reminders · Notes · Travel

**Dedicated full screens only:**
Tutor · Kids Hub · Our Family · Settings

**More overlay routes:**
- Family channels → 92% sheet over Chat
- Tutor / Kids Hub / Our Family / Settings → router.navigate()

**LOCKED architecture decisions:**
- Pulse as swipe screen = SCRAPPED
- My Space = page 2 (right swipe from Chat)
- Zen = card inside My Space, NOT a screen
- WotD = My Space only, NOT on Dashboard
- swipe-world.tsx = container (owns FAB, dots, landing, all 3 pages)
- index.tsx = re-exports SwipeWorld as default (expo-router entry point)
- Landing overlay = stays (lives in swipe-world.tsx, user likes it)

---

## Who You Are Talking To
- **Richard** — beginner developer. Full file rewrites always. One PowerShell command at a time.
- Plain English before code. Design before build. Two fixes at a time max.
- Family: Rich (logged-in user), Anna, Poppy (Yr6, 12, girl), Gab (Yr4, 10, BOY — Gabriel, he/him), Duke (Yr1, 8, boy)
- Local: `C:\Users\richa\zaeli` (Windows, PowerShell — no && chaining)
- Repo: https://github.com/RDK1981/zaeli (private)
- Screen: `Copy-Item "C:\Users\richa\Downloads\file.tsx" "C:\Users\richa\zaeli\app\`(tabs`)\file.tsx"`
- Component: `Copy-Item "C:\Users\richa\Downloads\ZaeliFAB.tsx" "C:\Users\richa\zaeli\app\components\ZaeliFAB.tsx"`
- Lib: `Copy-Item "C:\Users\richa\Downloads\file.ts" "C:\Users\richa\zaeli\lib\file.ts"`
- **CRITICAL:** Upload files from `C:\Users\richa\zaeli\app\(tabs)\` — NEVER from Downloads.
- **CRITICAL:** Always `Remove-Item` old file before `Copy-Item` new one.
- **CRITICAL:** Always verify with `Get-Content ... | Select-Object -First 5` before running Expo.

---

## Business
- iOS-first AI family life platform · Australian families with kids
- Family plan: A$14.99/month · Tutor add-on: A$9.99/child/month · 100% web sales

---

## Zaeli Persona (LOCKED)
Sharp, warm, genuinely enthusiastic. Finds the funny angle through delight, not detachment.
- NEVER "mate" · Never starts with "I" · Plain text only · Always ends on a confident offer
- Banned: "queued up", "locked in", "tidy", "sorted", "chaos", "sprint", "breathing room", "quick wins", "you've got this", "make it count"

---

## Stack
- React Native + Expo (iOS-first), iPhone 11 Pro Max dev device
- Supabase (Sydney ap-southeast-2, ID: rsvbzakyyrftezthlhtd)
- Claude Sonnet (`claude-sonnet-4-20250514`) — tool-calling + vision
- OpenAI `gpt-4o-mini` — Zaeli Noticed notices (dashboard)
- OpenAI Whisper-1 — voice transcription
- expo-router, expo-image-picker, react-native-svg, expo-file-system, expo-av
- Poppins (ALL UI text) · DMSerifDisplay (ghost numbers ONLY)
- Weather: wttr.in API (replaced Open-Meteo which was timing out)
- HealthKit · NASA APOD API · Dictionary API (My Space — future phases)

---

## Key Constants (NEVER get these wrong)
```
DUMMY_FAMILY_ID    = '00000000-0000-0000-0000-000000000001'
SONNET             = 'claude-sonnet-4-20250514'
GPT_MINI           = 'gpt-4o-mini'
OPENAI env var     = EXPO_PUBLIC_OPENAI_API_KEY (exact, in both files)
OpenAI             = max_completion_tokens · Claude = max_tokens (never mix)
KAV                = backgroundColor:'#fff' always
Send button        = #FF4545 coral ALWAYS — no exceptions
Body bg            = #FAF8F5 warm white ALWAYS
expo-file-system   = 'expo-file-system/legacy'
NEVER toISOString() · NEVER +10:00 timezone suffix
NEVER router.replace() or router.push() — always router.navigate()
NEVER SafeAreaView in individual page files — swipe-world.tsx ONLY
Individual pages   = useSafeAreaInsets() for manual paddingTop
DM Serif           = ghost numbers ONLY (never readable UI text)
Wordmark font      = Poppins_800ExtraBold (NOT DM Serif)
Wordmark a+i       = Dashboard:#FAC8A8 peach · Chat:#C4B4FF lavender · MySpace:#A8D8F0 sky
ZaeliFAB           = forwardRef, exposes startMic() + openMore()
FAB hides          = activeButton === 'keyboard' OR hideFabBar prop
FAB on chat page   = HIDDEN via activePage !== PAGE_CHAT in swipe-world
Chat bar           = fixed [Mic][TextInput][Send] — NEVER conditional render
Chat send          = onTouchStart on raw <View> — NEVER onPress/onPressIn (blur race)
Chat send button   = clear input BEFORE calling send() — setInput('') then send(text)
Chat bar position  = position:absolute inside flex View inside KAV
Chat bar width     = 100% with paddingHorizontal:14 on barFloat wrapper
Chat bar bg        = solid #FFFFFF (NOT transparent/semi-transparent)
Chat bar border    = rgba(220,220,220,0.6) — subtle grey not white
Chat KAV offset    = keyboardVerticalOffset={-16} on iOS (tighter to keyboard)
Chat paddingBottom = 200 on ScrollView contentContainer (clears bar + arrows)
Chat scroll arrows = UP/DOWN side-by-side, 38px white circles, right:14, bottom:110
Chat mic overlay   = floating pill above bar — exact copy of FAB micPill design
Chat mic           = calls startRecording()/stopRecording() directly (NOT fabRef)
Keyboard dismiss   = Keyboard.dismiss() on mic start
Mic waveform       = 7 bars [10,18,28,36,28,18,10] width:4 coral, Cancel+Send buttons
swipe-world scroll = keyboardShouldPersistTaps="handled" (dismiss on feed tap, keep on buttons)
LANDING_TEST_MODE  = true (in swipe-world.tsx) — set false before launch
Swipe pages        = Dashboard(0) · Chat(1) · My Space(2) — LOCKED
3-dot colours      = peach #FAC8A8(0) · lavender #D8CCFF(1) · sky #A8D8F0(2)
✦ active colour    = #A8D8F0 sky blue (userColor)
Delete             = optimistic UI first, Supabase background
Todos fetch        = IN ['active','done'] — NEVER eq('status','active')
Tick handler       = TOGGLE only — done↔active, never one-directional
Modal stacking     = close → setTimeout 350ms → open
Card buttons       = full-width, borderRadius:14, paddingVertical:14, Poppins_700Bold 15px
Nav store types    = edit_event · add_event · shopping · shopping_sheet · actions · meals · noticed
Chip intercepts    = 'Open Meal Planner' · 'Open Shopping List' · 'Open To-dos'
Family colours     = Rich:#4D8BFF · Anna:#FF7B6B · Poppy:#A855F7 · Gab:#22C55E · Duke:#F59E0B
92% sheets         = height: H * 0.92 (NOT maxHeight) · borderTopLeftRadius:24 · borderTopRightRadius:24
Sheet handle       = 36px wide · 4px tall · rgba(10,10,10,0.14) · alignSelf:center · marginTop:12
IcoPlay SVG        = Polygon points="5 3 19 12 5 21 5 3" · 15×15 · strokeWidth 2
IcoPause SVG       = two Lines x1=6/18 y1=4 x2=6/18 y2=20 · 15×15 · strokeWidth 2.5
Weather API        = wttr.in (NOT Open-Meteo — was timing out in dev client)
wttr.in URL        = https://wttr.in/{LAT},{LON}?format=j1
wttr.in codes      = mapWttrCode() in dashboard.tsx translates to internal codes
```

---

## ══════════════════════════════════
## CHAT FIX — RESOLVED ✅ (session 3, 8 April 2026)
## ══════════════════════════════════

**Commit:** `590fb35` — working chat with fixed input bar

### The problem (sessions 1–3, ~15+ hours)
React Native fires TextInput.onBlur BEFORE sibling TouchableOpacity.onPress. The old input bar was conditionally rendered: `{(fabActive === 'keyboard' || keyboardOpen) && ...}`. Tapping Send blurred the TextInput, which set the condition to false, which UNMOUNTED the bar before onPress could fire.

### What FAILED (do NOT repeat):
- onTouchEnd, onPressIn, Pressable — all still subject to blur ordering
- Delayed onBlur (setTimeout) — caused keyboard flashing loop
- Always-mounted with opacity:0 / height:0 — keyboard glitch from layout change in KAV
- Two bars (overlay + hidden pill) — duplicates, touch confusion
- Content swapping based on kbVisible or inputFocused — blur swaps before press fires
- Keyboard.addListener setState — re-render during keyboard animation = glitch
- Full rebuild to new file (chat-screen.tsx) — missing variable references, broken business logic

### What WORKED (the solution):
**Fixed bar with 3 elements that NEVER change:**
```
[Mic 58x58] [TextInput flex:1] [Send 58x58 coral]
```

**Critical implementation details:**
1. Send button = `<View onTouchStart={send}>` — NOT onPress, NOT onPressIn, NOT TouchableOpacity
2. Bar is `position:'absolute'` inside a `<View style={{flex:1, position:'relative'}}>` inside the KAV
3. KAV resizes the parent View on keyboard open → bar (at bottom:0 of parent) rises above keyboard
4. `keyboardShouldPersistTaps="always"` on ScrollView
5. NO onBlur handler on TextInput
6. NO conditional rendering — bar is always 3 elements, always mounted
7. NO state changes during keyboard animation — zero layout thrash
8. FAB hidden on chat page: `{activePage !== PAGE_CHAT && <ZaeliFAB .../>}` in swipe-world
9. No fabActive/setFabActive coupling between swipe-world and chat

### Render structure (LOCKED — do not change):
```
KAV (flex:1, behavior='padding')
  View (flex:1, position:'relative')
    ScrollView (flex:1, keyboardShouldPersistTaps='always')
      date divider
      renderMessages()
    /ScrollView
    View (position:'absolute', bottom:0, alignItems:'center')  ← barFloat
      View (FAB styling: borderRadius:36, padding:10, gap:4)   ← barPill
        [Mic] [TextInput] [Send via onTouchStart]
      /View
    /View
  /View
/KAV
```

### Bar styles (session 4 refined):
```
barFloat: position:absolute, bottom:0, paddingHorizontal:14, paddingBottom:24(iOS)/14
barPill: width:100%, gap:4, backgroundColor:'#FFFFFF' (solid white),
         borderRadius:36, padding:10, borderWidth:1,
         borderColor:'rgba(220,220,220,0.6)',
         shadow: #000 0.14 radius:28 offset:{0,10}
barBtn:  width:58, height:58, borderRadius:22
Mic SVG: 26x26, strokeWidth:1.7, stroke:'rgba(10,10,10,0.48)' / coral when recording
Send:    backgroundColor:'#FF4545', opacity:0.3 when empty
         onTouchStart — clear input first, then send
```

---

## ══════════════════════════════════
## DASHBOARD (✅ COMPLETE + STRESS TESTED)
## ══════════════════════════════════

**`app/(tabs)/dashboard.tsx`** — Phase 6 complete.

- All 5 cards: Calendar(slate) → Dinner(peach) → Weather+ZaeliNoticed → Shopping(lavender) → Actions(gold)
- **Zaeli Noticed:** AI-generated via GPT mini. Fires once per session after data loads.
- **Weather:** wttr.in API with 8s timeout. Fires independently.
- All context injection wired to Chat via navigation store.

---

## ══════════════════════════════════
## SWIPE WORLD (✅ complete)
## ══════════════════════════════════

**`app/(tabs)/swipe-world.tsx`** — owns all 3 pages, FAB, dots, landing overlay.

- Page 0: DashboardScreen ✅
- Page 1: HomeScreen (named export from index.tsx) ✅
- Page 2: MySpaceScreen ✅
- FAB HIDDEN on chat page: `{activePage !== PAGE_CHAT && <ZaeliFAB/>}`
- Chat has its own input bar (not FAB-driven)

**Landing overlay:** Stays as-is. `LANDING_TEST_MODE = true` — flip before launch.

---

## ══════════════════════════════════
## MY SPACE (✅ Phase 3b complete)
## ══════════════════════════════════

All 7 cards built, 4 × 92% sheets. All dummy data.

---

## ══════════════════════════════════
## CHAT — FULLY WORKING ✅ (sessions 3+4, 8 April 2026)
## ══════════════════════════════════

**Session 3 commit:** `590fb35` — chat sends, keyboard works, bar floats
**Session 4:** Context flow, full CRUD tools, mic, UI refinements

### Session 3 (send fix):
- `screen` starts as `'chat'` (splash/entry skipped)
- `chatOpacity` starts at `1`
- Mount useEffect: `generateBrief(true); loadCardData();`
- DM Serif hero + card stack + overview toggle REMOVED from chat scroll
- Banner: Poppins_800ExtraBold 36px, warm white `#FAF8F5`
- Old conditional input bar REPLACED with fixed [Mic][TextInput][Send]
- Send uses `onTouchStart` (bypasses blur race condition)
- FAB hidden on chat page in swipe-world

### Session 4 (context flow + tools + UI):
- **Context flow WORKING:** `isActive` prop from swipe-world + useEffect checks `getPendingChatContext()`
- **Dashboard refresh on swipe back:** `isActive` prop on DashboardScreen triggers `loadData()` when becoming active
- **Full CRUD tools (all save to Supabase, dashboard refreshes on swipe back):**
  - Calendar: add / update / delete ✅ (was already there)
  - Todos: add / update / delete ✅ (NEW — update supports mark_done)
  - Shopping: add / update / delete ✅ (NEW)
  - Meals: add / update / delete ✅ (NEW — add checks for date clashes, warns user)
- **CAPABILITY_RULES expanded:** update vs add distinction, meal vs calendar distinction, day accuracy, no hallucinated confirmations
- **Mic in chat bar:** calls startRecording()/stopRecording() directly (FAB is unmounted on chat page)
- **Mic overlay:** floating pill above bar — exact copy of FAB micPill (7 waveform bars, Cancel/Send buttons)
- **Mic from Dashboard/MySpace:** FAB onMicResult passes transcript via pendingMicText prop → chat sends it
- **Thinking dots:** appear immediately when mic stops (before Whisper transcription), also aggressive scrollToEnd after text send
- **Chat bar:** solid white #FFFFFF, full width with paddingHorizontal:14, borderColor grey not white
- **Keyboard gap:** keyboardVerticalOffset={-16} on iOS pulls bar closer to keyboard
- **Scroll arrows:** UP/DOWN side-by-side, 38px, right-aligned, above bar
- **Keyboard dismiss:** swipe-world uses keyboardShouldPersistTaps="handled" (tap feed = dismiss, tap buttons = persist)
- **Input clearing:** setInput('') called BEFORE send() so bar empties instantly
- **ScrollView paddingBottom:** 200 (clears bar + arrows)

---

## ══════════════════════════════════
## SESSION 5 — DESIGN REFRESH (9 April 2026) ✅
## ══════════════════════════════════

**All 3 pages redesigned to match new brand specs.**

### Dashboard changes:
- Logo a+i tinted peach `#FAC8A8` (was sky blue)
- Logo 40px (was 36)
- Date header 17px/700 weight
- NEW peach Zaeli brief card (#FAC8A8) above all cards — GPT mini, 2 sentences, fires once per session
- Dinner/Meal planner card changed to mint `#B8EDD0` (was peach — too much peach with new branding)
- FAB dashboard icon: peach `#FAC8A8` bg when active (was black)
- 3-dot page indicator: peach for dashboard

### Chat changes:
- Avatar removed from header
- Header label "Home" → "Chat" (18px/700)
- Logo a+i tinted lavender `#C4B4FF` (was sky blue)
- Logo 40px
- NEW lavender brief card (#D8CCFF) above chat thread — sparkle + ZAELI label, Poppins 17 text, white chips (13px matching feed)
- 3-dot page indicator: lavender for chat
- Reduced gap above date divider, increased gap before brief

### My Space changes:
- Header now FIXED (doesn't scroll with content)
- Logo 40px, "My Space" label 18px/700
- NEW dark slate Zaeli brief card (#3A3D4A) with DM Serif italic quote (18px)
- WotD card: stays as inline expand
- **NEW 6-card grid (2×3):** Fitness(slate) | Goals(gold) | Budget(blue #E8F0FF) | Notes(peach) | Stretch(sage) | Zen(light blue #E0F3FC)
- Wordle card: full width below grid (lavender)
- NASA APOD card: REMOVED from layout
- All grid cards uniform: minHeight 120, borderRadius 16, padding 14
- Grid labels 11px/700 uppercase
- Grid numbers 30px/800 Poppins
- Grid headlines 15px/700
- Stretch + Zen: use big number style (22px) for "Morning" / "4"
- All grid cards + Wordle open 92% shell sheets (placeholder "Coming soon")

### Swipe-world changes:
- 3-dot colours: peach(0) · lavender(1) · sky(2)

### Key constants updated:
```
Dashboard logo a+i   = #FAC8A8 peach
Chat logo a+i        = #C4B4FF lavender
My Space logo a+i    = #A8D8F0 sky blue (unchanged)
Dinner card          = #B8EDD0 mint (was #FAC8A8 peach)
Budget card          = #E8F0FF blue
Zen card             = #E0F3FC light blue
FAB dash active      = #FAC8A8 peach bg, #8A3A00 icon
3-dot colours        = peach(0) · lavender(1) · sky(2)
All logos            = 40px Poppins_800ExtraBold
All page labels      = 18px Poppins_700Bold
Brief text           = Poppins 17px on all 3 pages
```

---

## Build Phase Plan
```
Phase 1: ZaeliFAB              ✅
Phase 2: Landing overlay       ✅
Phase 4: Dashboard Option A    ✅ all 5 cards
Phase 4b: Chat input bar       ✅
Dashboard stress testing       ✅
Phase 3: swipe-world.tsx       ✅
Phase 3b: My Space             ✅ redesigned — 6-card grid + brief + shell sheets
Phase 6: Zaeli Noticed (AI)    ✅ GPT mini, wttr.in weather
Phase 5: Chat v5 / fix         ✅ RESOLVED sessions 3+4 — send, context flow, CRUD tools, mic, UI
Phase 5b: Design refresh       ✅ Session 5 — all 3 pages, briefs, new brand colours
Phase 7: My Space sheets       🔨 ← NEXT (Fitness, Goals, Budget, Notes, Stretch, Zen, Wordle)
Phase 8: Dashboard sheets      🔨 (Todos, Shopping, Calendar, Meals)
Phase 9: Dedicated pages       🔨 (Kids Hub, Tutor, Our Family, Settings)
Phase 10: Travel sheet         🔨
Phase 11: Notes sheet (family) 🔨
```

---

## Coding Rules
- SafeAreaView = swipe-world.tsx ONLY · individual pages = useSafeAreaInsets()
- PowerShell: no && · separate lines
- Always `npx expo start --dev-client --clear`
- Always `Remove-Item` old file before `Copy-Item` new one
- Always verify with `Get-Content ... | Select-Object -First 5` before running Expo
- Date: local only — NEVER toISOString() · NEVER +10:00
- KAV: backgroundColor:'#fff' · Send: '#FF4545' · Body: '#FAF8F5'
- expo-file-system: 'expo-file-system/legacy'
- No literal newlines in JSX — use \n
- stopPropagation on nested tappable rows
- Modal stacking: close → 350ms → open
- Delete: optimistic first, Supabase background
- router.navigate() only for dedicated screens
- Upload from zaeli folder, never Downloads
- Wordmark = Poppins_800ExtraBold (never DM Serif for readable text)
- 92% sheets = height: H * 0.92 (never maxHeight)
- Weather = wttr.in only (Open-Meteo times out in dev client)
- GPT_MINI = 'gpt-5.4-mini' (updated model)
- NEVER pass fabActive/setFabActive as props from swipe-world unless you are certain the input bar is outside the ScrollView
- ALWAYS add console.log before attempting any touch/send fix — confirm the tap is registering first
- useFocusEffect does NOT fire on swipe in swipe-world — use isActive prop + useEffect instead
- Dashboard + Chat both need isActive prop from swipe-world for data refresh
- Chat bar must NOT have onTouchEnd focus handler on barPill (steals mic taps → raises keyboard)
- Mic in chat = startRecording()/stopRecording() directly (FAB is unmounted on chat page)
- FAB mic transcript passes via pendingMicText prop through swipe-world to chat
- swipe-world keyboardShouldPersistTaps = "handled" (NOT "always" which traps keyboard)
- Tool CAPABILITY_RULES must explicitly say update vs add, meal vs calendar
- Meal add_meal tool checks for date clashes — returns CLASH: warning, never auto-swaps
- All edits go to C:\Users\richa\zaeli (NOT the worktree) — Expo runs from main folder
