# CLAUDE.md — Zaeli Project Context
*Last updated: 7 April 2026 — My Space Phase 3b complete ✅*

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
- **CRITICAL:** Always delete old file before copying new one to avoid stale cache issues.
- **CRITICAL:** Always verify file updated with `Get-Content ... | Select-Object -First 5` before starting Expo.

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
- OpenAI `gpt-5.4-mini` — landing brief, Zaeli Noticed notices
- OpenAI Whisper-1 — voice transcription
- expo-router, expo-image-picker, react-native-svg, expo-file-system, expo-av
- Poppins (ALL UI text) · DMSerifDisplay (ghost numbers ONLY)
- HealthKit · NASA APOD API · Dictionary API (My Space — future phases)

---

## Key Constants (NEVER get these wrong)
```
DUMMY_FAMILY_ID    = '00000000-0000-0000-0000-000000000001'
SONNET             = 'claude-sonnet-4-20250514'
GPT_MINI           = 'gpt-5.4-mini'
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
Wordmark a+i       = #A8D8F0 sky blue — always, light and dark
ZaeliFAB           = forwardRef, exposes startMic()
FAB hides          = activeButton === 'keyboard' — restores on blur only
LANDING_TEST_MODE  = true (in swipe-world.tsx) — set false before launch
Swipe pages        = Dashboard(0) · Chat(1) · My Space(2) — LOCKED
3-dot colours      = coral(0) · coral(1) · sky #A8D8F0(2)
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
```

---

## ══════════════════════════════════
## WORDMARK & IDENTITY (LOCKED ✅)
## ══════════════════════════════════

**Font:** `Poppins_800ExtraBold`
**On light:** `#0A0A0A` ink base · `#A8D8F0` sky on a + i
**On dark:** `#ffffff` white base · `#A8D8F0` sky on a + i
**Top bar size:** 36px · letterSpacing: -1.5px · lineHeight: 42px
**Landing size:** 56px · letterSpacing: -2px · lineHeight: 64px

**✦ My Space mark (U+2756 — Black Four Pointed Star):**
- FAB button only — never decorative
- Active: `#A8D8F0` sky fill · Resting: `rgba(10,10,10,0.42)`
- 22px in FAB context

---

## ══════════════════════════════════
## ZAELIFAX — 5 BUTTONS (LOCKED ✅)
## ══════════════════════════════════

```
[ Grid(Dashboard) ] | [ Chat ][ Mic ] | [ ✦(My Space) ][ ···(More) ]
58×58px buttons · borderRadius:22 · FAB pill borderRadius:36
```

| Button | Resting | Active |
|--------|---------|--------|
| Dashboard grid | rgba(10,10,10,0.48) | #0A0A0A dark fill |
| Chat bubble | rgba(10,10,10,0.48) | #0A0A0A dark fill |
| Mic | rgba(10,10,10,0.48) | #FF4545 coral fill |
| ✦ My Space | rgba(10,10,10,0.42) | #A8D8F0 sky fill |
| ··· More | rgba(10,10,10,0.48) | #FF4545 coral fill |

**Props:** `userInitial`, `userColor`, `onDashboard`, `onChat`, `onMySpace`, `onChatKeyboard`, `onMoreItem`, `onMicResult`

**More overlay — two sections:**
- Family: Calendar · Shopping · Meals · Todos · Notes · Travel → sheets
- Screens: Tutor · Kids Hub · Our Family → router.navigate()
- Settings: quiet row at bottom

---

## ══════════════════════════════════
## SWIPE WORLD (✅ complete)
## ══════════════════════════════════

**`app/(tabs)/swipe-world.tsx`** — owns:
- Horizontal ScrollView (pagingEnabled, 3 pages)
- ZaeliFAB (position:absolute, zIndex:999)
- 3-dot indicator (position:absolute, bottom:112 iOS)
- Landing overlay (position:absolute, zIndex:1000)
- `activePage` + `fabActive` state

**`app/(tabs)/index.tsx`** — thin entry point:
- Default export = `SwipeWorld` (re-exported from swipe-world.tsx)
- `HomeScreen` available as named export (workaround for require cycle)

**Current page status:**
- Page 0 (Dashboard): `DashboardScreen` ✅
- Page 1 (Chat): `HomeScreen` named export from index.tsx ✅ (require cycle warn — fix in Phase 5)
- Page 2 (My Space): `MySpaceScreen` ✅ Phase 3b complete

**Phase 5 fix:** Extract `HomeScreen` from `index.tsx` into `app/components/ChatPage.tsx`. Eliminates require cycle.

---

## ══════════════════════════════════
## MY SPACE (✅ Phase 3b complete)
## ══════════════════════════════════

**`app/(tabs)/my-space.tsx`** — all 7 cards built.

| Card | Colour | Interaction |
|------|--------|-------------|
| Health | `#3A3D4A` slate | Inline expand — steps, distance, calories, workouts |
| Goals | `#F0DC80` gold | Tap 1 = inline (3 goals, progress bars) · Tap goal row = 92% sheet · + Add = 92% sheet |
| Word of the Day | `#E8F4E8` sage | Inline expand — def, example, SVG play button |
| NASA APOD | `#3A3D4A` slate | Inline expand — star placeholder, description |
| Zen | `#FAC8A8` peach | Inline expand — 4 tracks, SVG play/pause icons |
| Notes | `#D8CCFF` lavender | Tap → 92% sheet — note list + new note button |
| Wordle | `#F0DC80` gold | Tap → 92% sheet — full 6×5 grid + coloured keyboard |

**All data is hardcoded dummy data** — real APIs wired in later phases.
**Card sizing matches dashboard exactly:** borderRadius:22, padding:22, headlines 24px, body text 17px, meta 13px.
**SVG icons from index.tsx:** IcoPlay (Polygon 5 3 19 12 5 21 5 3) · IcoPause (two Lines).
**92% sheets:** `height: H * 0.92` — Goals detail, New Goal, Notes, Wordle.

---

## ══════════════════════════════════
## DASHBOARD — OPTION A (✅ COMPLETE + STRESS TESTED)
## ══════════════════════════════════

Card order: Calendar(slate) → Dinner(peach) → Weather+ZaeliNoticed → Shopping(lavender) → Actions(gold)
All 5 cards stress tested. Full spec in ZAELI-PRODUCT.md.

---

## ══════════════════════════════════
## BRAND PACK (✅)
## ══════════════════════════════════

`zaeli-brand-pack-2026.html` — committed to repo root.
8 tabs: Wordmark · Palette · Typography · Dashboard · Navigation · Channels · Family · Specs · Rules

---

## Build Phase Plan
```
Phase 1: ZaeliFAB              ✅ 5 buttons, ✦, userColor
Phase 2: Landing overlay       ✅ in swipe-world.tsx
Phase 4: Dashboard Option A    ✅ all 5 cards
Phase 4b: Chat input bar       ✅
Dashboard stress testing       ✅ all 5 cards
Phase 3: swipe-world.tsx       ✅ container built
Phase 3b: My Space             ✅ all 7 cards, 4 sheets
Phase 5: Chat v5               🔨 NEXT — extract ChatPage.tsx
Phase 6: Zaeli Noticed (AI)    🔨 GPT mini
Phase 7: Todos sheet           🔨
Phase 8: Kids Hub              🔨
Phase 9: Tutor rebuild         🔨
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
