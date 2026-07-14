# CLAUDE.md — Zaeli Project Context
*Last updated: 14 July 2026 — Session 30 ✅ · FAMILY PUSH NOTIFICATIONS + MULTI-PHOTO CHAT + TRIVIA GUARD + SPLASH LATENCY + EXPO-NOTIFICATIONS PLUGIN DISCOVERY · **Family push infra shipped** (commit `8bbf7e3`) — `supabase-push-tokens.sql` adds `profiles.expo_push_token`, Edge Function `supabase/functions/family-notify/index.ts` (JWT-verified, family-boundary-enforced, batches to Expo push API), `lib/notifications.ts` `registerPushToken`/`unregisterPushToken`/`notifyFamily`, `_layout.tsx` fire-and-forget register after auth, `index.tsx` Notify chip on calendar confirm cards + `send_family_message` tool with fuzzy name matching + "family"/"everyone" shortcuts. Plus Spend Processing overlay (full-screen dark backdrop + ActivityIndicator + "Processing..." status label, silent success, Alert on error) + tutor Play icon removed (matches home chat) · **Multi-photo chat + Stripe testability + foreground refresh** (commit `e6c8ea6`) — `pendingImage: string | null` → `pendingImages: string[]` with `MAX_CHAT_PHOTOS = 4` cap, additive Camera/Photos pickers, horizontal thumbnail strip with per-photo ✕, `send(text?, overrideImages?: string[])`, ONE Sonnet call for ALL images with multi-photo aggregation prompt, `Msg.imageUris?: string[]` alongside legacy `imageUri`, horizontal grid render for 2+ photos (110×110). Stripe: Developer row "💳 Test Stripe checkout" force-opens Payment Link even when beta grant hides Subscribe button. Foreground refresh: `_layout.tsx` AppState listener reloads profile on background→active transition (Stripe checkout return path — user completes payment in Safari, returns to app, subscription card auto-updates) · **Trivia answer-in-question guard + cold-start splash latency fix** (commit `34b57eb`) — Duke saw "Which sport is played with a round ball and goals, and is called soccer in many countries?" answer "Soccer". Three-layer defence: prompt rule with BAD/GOOD examples + client-side word-boundary regex filter (4+ char answers, drops self-revealing). Splash: 3s splash on foreground return after iOS jetsammed app. Root cause: `await loadProfile()` blocking `setAuthed` in cold-start useEffect (Supabase network 1-2s decent, 3s+ flaky). Fix: setAuthed immediately once session verified (fast AsyncStorage), kick loadProfile background. Route guard already tolerates null profile. Cuts splash ~2s · **⭐ CRITICAL DISCOVERY: `expo-notifications` plugin was missing from `app.json` plugins array** (commit `6eab45a`) — without it, iOS never gets `aps-environment` entitlement → `getExpoPushTokenAsync` throws at boot → the `.catch(() => {})` in `_layout.tsx` swallowed silently → `profiles.expo_push_token` stayed null forever. Local scheduled notifications (briefs) still worked because they don't need APNs — that's what confused diagnosis. Fixes: added expo-notifications plugin, replaced silent catch with `.catch(e => console.log(...))`, added Developer row "🔔 Register push token now" that manually triggers + shows result via Alert · **Verbose push diagnostic** (commit `dcb263b`) — `debugPushToken()` returns structured state (step name, detail, userId, permission, projectId, token snippet, dbWrite outcome) so on-device Alert shows exactly where the failure is · **EAS Starter plan upgrade** (14 iOS builds/month) — free tier build cap hit mid-session. `eas build` and `eas submit` are separate commands (confused Rich twice) · **GIPHY key discovery** — Kids Hub rewards GIFs failing in standalone because `EXPO_PUBLIC_GIPHY_API_KEY` in local `.env` never added to EAS Environment Variables (same Session 27 pattern) · Prior Session 29 (Anna beta round 1 + API cost fix + meal pivot) + Session 28 (Stripe end-to-end) + Session 25 (Universal Links LIVE) all still current — remaining: verbose diagnostic build to nail push failure step, GIPHY EAS env var, website v5 rewrite (parked), Anna beta round 2 (awaiting successful push build), Sonnet 5 migration (still queued), per-user brief cache (still queued), **Phase 5 (BEFORE PUBLIC LAUNCH) — move Anthropic/OpenAI keys server-side (client-bundled keys extractable)*** (commit `92a35d4`) — Tutor math accuracy via three-layer defence (anti-sycophancy prompt rules + hidden `<expected>N</expected>` marker Sonnet emits + LAST_EXPECTED_ANSWER injection on next call — fixes "12 is wrong for 84÷7" and "360 is wrong for 15×24"), pantry data injected into chat context + PANTRY RULES prompt block (Zaeli stops saying "not in pantry" for items IN pantry), pantry "yesterday" date bug fixed (midnight-normalise both dates before diffing), multi-photo receipt scan (up to 4 photos batched into ONE Sonnet call), in-sheet scan UX (progress banner + result toast — no more nav-to-Chat handoff), Dashboard reshuffled Calendar → Shopping → Bento → Radar → Meals (honest usage priority), "Welcome In" → "Welcome!" · **Onboarding gate + polish** — route guard bounces new owner accounts to /onboarding via AsyncStorage `onboarding_complete` flag, grandfather clause skips profiles >24h old (Rich pre-gate signup safe), sign-in defaults to sign-up mode (new users vastly outnumber returning), Stripe "Coming soon" alert cleared on Manage subscription (commit `916f2ab`), dynamic user name in brief prompts via `${primaryUser}` template replacing 7 hardcoded "Rich" spots, computeSignature includes primaryUser so cached briefs don't leak names across family members · **API cost fix** (commit `0b65420`) — negative-cost bug in `lib/api-logger.ts` (was subtracting cache_read + cache_write from input_tokens which is ALREADY the uncached portion), Haiku 4.5 pricing corrected $0.25/$1.25 → $1.00/$5.00 (4× too low), Sonnet 5 + Opus 4.8 pricing added for future migrations, prompt caching wired onto Sonnet tool-calling path in `send()` (both initial call AND previously-unlogged follow-up call — real cost was 2× what api_logs showed), expected impact home_chat A$0.02-0.04 → A$0.005-0.01 per repeat-turn call — at ~250 chats/mo/family that's A$3.30 → ~A$0.50/family/mo (loss-making → 60% margin) · **Meal planner pivot (uncommitted)** — Anna feedback: meal planning daily is friction no busy family sustains; recipes + regulars is where the real value lives. DinnerCard label "MEAL PLANNER" → "TONIGHT'S MEALS", empty-state CTA "See family regulars →" (not "Plan it →"), tab order Meals/Recipes/Favourites → Recipes/Regulars/Plan (default opens Recipes). buildContext queries recipes WHERE 'favourite' IN tags → adds "Family regulars" line to chat LIVE DATA (12 hearted recipes). New MEAL IDEAS RULES prompt block: Zaeli reaches for regulars FIRST on "quick dinner?" queries · **Calendar max_tokens bump (uncommitted)** — Anna's 10-event paste dropped the last event; api_logs showed `output_tokens: 800` exactly (the ceiling), each add_calendar_event tool_use block ~80 tokens, 10 × 80 + preamble ≈ 800 → truncated mid-block → malformed JSON silently dropped. Fix: max_tokens 800→2000 (initial) and 500→1500 (followup) · **Admin console Session 29 refresh** — moved source-of-truth from Downloads to `app/(tabs)/zaeli-admin/index.html`. Wordmark accent yellow → sky blue #A8D8F0, model ID claude-sonnet-4-20250514 → claude-sonnet-4-6, price sliders A$9.99/A$7.99, per-family margin card replaces nonsensical break-even, real subscription state in Accounts table (beta_end_date + subscription_status), memory system health card, double-$ display bug fixed (13 rows) · **Stripe beta grant infrastructure** — profiles.beta_end_date column, lib/stripe.ts helpers (getSubscription with beta override, isFamilyInBeta), family-roster.ts beta override (kids get tutor_active=true while family in beta), TutorSidebar uses isFamilyInBeta to unlock locked children · Prior Session 28 (Stripe end-to-end + calendar phantom fix + splash saga) + Session 27 (app icon 2B, first preview build, brief bucket-check + dedup fixes) + Session 25 (Universal Links LIVE) all still current — remaining: build #15 (holding to bundle more Anna feedback), Sonnet 5 migration (intro pricing $2/$10 through Aug 2026 makes it CHEAPER than 4.6), per-user brief cache when scaling past 100 families, TestFlight submission, **Phase 5 (BEFORE PUBLIC LAUNCH) — move Anthropic/OpenAI keys server-side (client-bundled keys extractable)***

---

## ══════════════════════════════════
## SCREEN ARCHITECTURE — CRITICAL (REBUILT Session 14 ✅)
## ══════════════════════════════════

**Two-page swipe world — Chat-first:**
```
Chat (0) ← OPENS HERE          Dashboard (1)
           ← swipe right →
```
App opens on Chat (page 0). Swipe right for Dashboard. **My Space moved to standalone route** (`/(tabs)/my-space`) accessed via MoreSheet.

**PHILOSOPHY B — LOCKED (Session 9, reinforced Session 14):**
Zaeli is an AI companion that also manages family life — NOT a family dashboard with AI bolted on. Chat is the product's beating heart. Dashboard is a reference layer. Everything flows from Zaeli's relationship with the family.

**92% SHEETS (opened via MoreSheet or in-app triggers):**
Calendar · Shopping · Meal Planner · Notes & Tasks · Travel (not built)

**Dedicated full screens (via MoreSheet or direct routes):**
My Space · Tutor · Kids Hub · Our Family · Settings · Our Budget (coming soon)

**FAB — KILLED entirely (Session 14):**
Replaced by hamburger ☰ button top-right of each screen's header. Opens the universal MoreSheet (92% bottom sheet).

**Chat bar — ONLY on Chat screen:**
Dashboard and My Space do NOT have chat bars. Each screen has a clear purpose. Chat = conversation, Dashboard = glance, My Space = personal zone. Chat bar lives in index.tsx only.

**LOCKED architecture decisions:**
- Pulse as swipe screen = SCRAPPED (pre-Session 9)
- My Space = standalone route, not a swipe page (Session 14)
- Zen = card inside My Space, NOT a screen
- WotD = My Space only, NOT on Dashboard
- swipe-world.tsx = 2-page container (Chat + Dashboard + 2-dot indicator + landing splash)
- index.tsx = re-exports SwipeWorld as default (expo-router entry point) + HomeScreen is Chat
- Landing splash (Option C Deep Slate + Mint) = in swipe-world.tsx, shows ONCE per app session via module-level flag `_splashShownThisSession`
- Hamburger ☰ universally accessed via `<MoreSheet />` component (app/components/MoreSheet.tsx)
- Back arrows on standalone routes (Tutor, Kids Hub, Family, My Space) next to zaeli wordmark
- Navigation architecture review = LOCKED, no longer deferred

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
- Family plan: A$9.99/month inc GST · Tutor add-on: A$7.99/child/month inc GST · 100% web sales (Session 25 — reduced from A$14.99 / A$9.99 for competitive positioning in a tight economy)
- Core differentiator: Zaeli is an AI-first product. Not a better calendar app. A family companion.
- Word of mouth is the primary growth mechanism — Zaeli must consistently earn it.

---

## ══════════════════════════════════
## ZAELI PERSONA — FULL SPEC (LOCKED Session 9 ✅)
## ══════════════════════════════════

### Core character
Sharp, warm, genuinely enthusiastic about this family. Finds the funny angle through delight, not detachment. Energy matches the moment — get-up-and-go in the morning, calm and settled at night. Makes the user feel capable, in control, and like they're winning at family life.

### The winning mantra (CRITICAL)
Zaeli's job is to make Rich feel like he's on top of it — not overwhelmed by it. Every interaction should leave him feeling more in control than before he opened the app. This is not forced positivity. It's genuine acknowledgement of what's working, what's handled, what's ahead.

**How to apply it:**
- Notice and acknowledge progress — "Shopping's sorted, calendar's updated, you're ahead of this week"
- Take active credit for what Zaeli has done — "I've already moved Gab's soccer to Sunday"
- Reframe problems as solvable — "The plumber's the only thing hanging — five minutes and it's off your plate"
- On genuinely good days, say so — "That's a lot for a Thursday. Solid."
- Never manufacture positivity when it isn't earned — Zaeli is warm, not sycophantic

### Hard rules
- NEVER "mate"
- Never starts with "I"
- Plain text only — no markdown, no asterisks, no bullet points in conversational responses
- Always ends on a confident offer or a warm close
- Never lectures, never passive-aggressive, never counts down failures
- Matches the user's energy — jokes back when they joke, calm when they're stressed

### Banned words/phrases
"queued up", "locked in", "tidy", "sorted", "chaos", "sprint", "breathing room", "quick wins", "you've got this", "make it count", "absolutely", "certainly", "of course", "no problem"

### Active credit rule
Zaeli uses first person for actions SHE took. "I've updated Gab's soccer" not "Gab's soccer has been updated." She is an active participant, not a reporter.

### Tone by time of day
- **Morning:** Energising, forward-looking, sets up the day confidently
- **Midday:** Shorter, warmer check-in, acknowledges morning progress before new items
- **Evening:** Calm, reflective, wraps the day with genuine acknowledgement, looks to tomorrow

---

## ══════════════════════════════════
## AI BRIEF SYSTEM — FULL SPEC (Session 9 ✅)
## ══════════════════════════════════

### Overview
Three proactive briefs per day per family — morning, midday, evening. Generated by Claude Sonnet. Cached family-wide (not per member). Displayed as the opening message in Chat when Zaeli fires a brief.

### Brief firing logic
Brief fires on app open IF:
- The time window has changed since last brief (morning → midday → evening)
- AND there has been a natural break — app was closed, OR last message was >15 minutes ago

Brief is HELD if:
- User is actively mid-conversation (last message <15 minutes ago)
- Held brief fires on next app open or after 15-minute inactivity threshold

When a held brief fires mid-existing thread, it appears below a subtle time divider so Rich knows it's proactive, not a response.

### Time windows
- **Morning:** 05:00–11:59 · first open of the day
- **Midday:** 12:00–16:59 · first open after 12pm
- **Evening:** 17:00–23:59 · first open after 5pm

### Data inputs for each brief
- Calendar events (today + tomorrow)
- Tonight's meal + who's cooking
- Shopping list status + any flagged items
- Open family tasks + overdue tasks
- Weather (wttr.in)
- Zaeli Noticed changes since last brief
- Actions taken since last brief (don't re-surface resolved items)

### Brief format rules
- **Morning:** Max 120 words. Open with a positive framing if warranted. Cover today + overnight changes + tomorrow if relevant.
- **Midday:** Max 80 words. Always acknowledge morning progress before new items. Focus on afternoon + dinner.
- **Evening:** Max 90 words. NEVER open with a task. Open with genuine day acknowledgement. Look to tomorrow. Chips minimal — max 2.
- **Win banner:** Mint left-border highlight inside the brief bubble. Used MAX once per brief. Only when there is a genuine encouraging moment. Never forced.
- **Never repeat** information from a previous brief in the same day if already resolved.
- **Never invent** data not in the context.
- **If nothing notable:** one honest line, no padding — "Quiet one today — nothing urgent on the radar."

### Chips after brief
- Max 4 chips
- Only offer actions Zaeli can actually perform
- Primary chip (coral) = single most time-sensitive action
- Always include one dismissal chip ("Got it", "All good", "Night ✓")

### Brief caching
- Generated brief text saved to Supabase `zaeli_briefs` table with timestamp + time_window
- All family members read same cached brief (family-scoped, not member-scoped)
- Brief regenerates when: time window changes OR significant family data changes (new calendar event, meal change)
- Prompt caching (Anthropic API) used on input tokens — system prompt + family context cached, ~90% input cost reduction

---

## ══════════════════════════════════
## MODEL ROUTING — LOCKED (Session 9 ✅)
## ══════════════════════════════════

### Models in use
```
SONNET   = 'claude-sonnet-4-6'    — $3.00/$15.00 per M tokens
MINI     = 'gpt-5.4-mini'               — $0.75/$4.50 per M tokens  ← UPDATE from gpt-4o-mini
GPT_MINI = 'gpt-4o-mini'               — keep for Zaeli Noticed only (already working)
WHISPER  = 'whisper-1'                  — voice transcription (unchanged)
```

**Note:** GPT-4o-mini remains ONLY for Zaeli Noticed dashboard generation where it is already working. All new chat routing uses GPT-5.4 mini.

### Routing rules
**Use Sonnet for:**
- All three daily briefs (morning/midday/evening)
- Vision calls (receipt scan, recipe photo upload, camera uploads)
- Complex multi-tool requests (multiple CRUD actions in one message)
- Any response where Zaeli's personality is front and centre
- Calendar tool-calling (existing — unchanged)

**Use GPT-5.4 mini for:**
- General chat responses
- Simple CRUD — add item, update record, delete event
- Quick lookups and confirmations
- Any response where Zaeli is confirming an action rather than leading a conversation

**Why not Haiku:** GPT-5.4 mini benchmarks significantly higher than Claude Haiku 4.5 on reasoning and general knowledge, and produces noticeably better conversational quality. At $0.75/M input it sits between Haiku and Sonnet in cost but much closer to Sonnet in quality.

### Cost modelling (per family/month)
- Assume 1,500 calls/month (stress test — engaged family)
- 20% Sonnet (300 calls) + 80% GPT-5.4 mini (1,200 calls)
- ~1,500 input tokens + ~200 output tokens per call average
- Without caching: ~$4.68/family/month
- With prompt caching (90% discount on input): ~$2.67/family/month
- As % of $14.99 revenue: ~18% — acceptable
- Average family (750 calls/month with caching): ~$1.35/family/month — very comfortable

### Mini warmth rules (CRITICAL for Zaeli voice consistency)
GPT-5.4 mini must sound like Zaeli, not like a generic assistant. Apply these rules in the system prompt for mini:

1. **Never just confirm.** "Done" is cold. "Added — you're all set for tonight" is warm.
2. **Match the user's energy.** If Rich jokes, mini plays along briefly. If he's stressed, mini is calm.
3. **After a casual reply** ("haha", "cheers", "nice one") — mini closes with one warm line and stops. Never ignores a casual reply. Never over-responds.
4. **Occasional acknowledgement of effort** — "That's a lot for a Thursday" / "You've earned a quiet evening." Max one per conversation thread. Only when genuinely warranted.
5. **Never manufactured warmth** — mini warmth is earned by context, not sprayed on every message.

---

## Stack
- React Native + Expo (iOS-first), iPhone 11 Pro Max dev device
- Supabase (Sydney ap-southeast-2, ID: rsvbzakyyrftezthlhtd)
- Claude Sonnet (`claude-sonnet-4-6`) — briefs, tool-calling, vision
- OpenAI `gpt-5.4-mini` — general chat responses (NEW — replaces gpt-4o-mini for chat)
- OpenAI `gpt-4o-mini` — Zaeli Noticed notices only (keep as-is, already working)
- OpenAI Whisper-1 — voice transcription
- expo-router, expo-image-picker, expo-document-picker, react-native-svg, expo-file-system, expo-av
- Poppins (ALL UI text) · DMSerifDisplay (ghost numbers ONLY)
- Weather: wttr.in API (replaced Open-Meteo which was timing out)
- HealthKit · NASA APOD API · Dictionary API (My Space — future phases)

---

## Key Constants (NEVER get these wrong)
```
DUMMY_FAMILY_ID    = '00000000-0000-0000-0000-000000000001'
SONNET             = 'claude-sonnet-4-6'
CHAT_MODEL         = 'gpt-5.4-mini'                          ← NEW
NOTICED_MODEL      = 'gpt-4o-mini'                           ← Zaeli Noticed only
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
Wordmark a+i       = Dashboard:#FAC8A8 peach · Chat:#C4B4FF lavender · MySpace:#A8D8F0 sky · OurBudget:#059669 emerald
ZaeliFAB           = KILLED Session 14 — component file exists but not rendered anywhere
Hamburger ☰        = Session 14+ — 42px square button top-right of every header (Chat, Dashboard, My Space, Tutor, Kids Hub, Family) AND in every 92% sheet header (Calendar, Shopping, Meals, Notes & Tasks — Session 15). Opens MoreSheet.
Hamburger SVG      = 22px icon, lines at y=6,12,18 (symmetric around y=12). strokeWidth 2.2
MoreSheet          = app/components/MoreSheet.tsx — 92% bottom sheet, Option 1 tiles (NO upload section)
MoreSheet sections = Session 15 restructure: NAVIGATE top (Chat+Dashboard 50/50) · FAMILY CHANNELS (6 tiles, 3x2) · PERSONAL (My Space + Our Budget 50/50) · MODULES (Tutor+Kids Hub 50/50) · ACCOUNT (Our Family+Settings 50/50)
MoreSheet onAction = parent passes callback from Chat/Dashboard to route in-swipe-world nav; My Space uses default
Chat bar           = Session 15 = SINGLE PILL (Tutor-style unified): [Mic | sep | TextInput | Camera | Send] in one white pill. 60px min height. 44×44 buttons. Font 17px. Still ONLY on Chat page (Dashboard and My Space have NO chat bar). NEVER conditional render.
Chat bar styles    = barPillV2 (borderRadius 32, paddingVertical 10), barBtnV2 (44×44), barSepV2 (24px vertical divider), barInputV2 (17px font), barSendV2 (44×44 coral circle)
Tutor bar          = Session 15 matches Chat V2 spec exactly (minHeight 60, 44×44 buttons, font 17, etc.)
Chat bar camera    = SVG camera icon between TextInput and Send, coral #FF4545 stroke. Opens Add-to-Chat picker (Camera/Photos — Live removed Session 15)
Chat bar alignment = alignItems:'flex-end' in pill so mic + send anchor to bottom as input grows (iMessage pattern)
MoreSheet → sheets = OPTION A hamburger cross-nav. Tap hamburger in Calendar/Shopping/Meals/Notes&Tasks → close current sheet → 600ms → open MoreSheet. X in MoreSheet → restore original sheet. Tap different tile → switch to that sheet.
Modal stacking     = CRITICAL Session 15 learning: iOS can't stack Modals reliably. Pattern: use Modal onDismiss callback + 600ms fallback timeout + MoreSheet backdrop tap guard (400ms after open). Never present Modal while another is dismissing.
MoreSheet handleItem = MUST call onAction SYNCHRONOUSLY BEFORE onClose (Session 15 fix). Prevents closeMoreSheet reading stale ref and restoring origin sheet over the nav target.
sheetBeforeMoreRef = React ref (NOT state) so onAction can clear it synchronously before closeMoreSheet reads it
Shopping/Cal/Meals open = use openShopSheet/openCalSheet/openMealSheet (NOT bare setters). Bare setters flip visibility but don't load data.
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
_splashShownThisSession = module-level flag — splash only fires ONCE per app session, not on every swipe-world re-mount
Splash design      = Option C (Deep Slate + Mint + Lavender orbs — Session 15 polish). bg #1C2330, wordmark 96px white with SKY BLUE #A8D8F0 "a+i" (My Space identity — Session 15 change from mint), "Less Chaos." bold MINT #B8EDD0 + "More Family." soft white, 40px mint divider, "TAP TO CONTINUE" uppercase bottom
Splash orbs        = Session 15 — lavender orbs at top-right + bottom-left using Shopping tile lavender #D8CCFF at 55-65% opacity (low opacity blended to grey on dark bg, needed high opacity to read as purple)
Splash wordmark    = lineHeight 128 + paddingTop 12 to prevent "i" dot clipping at top
Native splash      = app.json backgroundColor #1C2330 (matches landing). REQUIRES dev-client rebuild (npx expo prebuild --clean)
Swipe pages        = Chat(0) · Dashboard(1) — My Space moved to standalone route
2-dot indicator    = KILLED Session 15 (was floating mid-air on Dashboard without chat bar). Navigate via swipe or MoreSheet NAVIGATE section.
Chat wordmark a+i  = #A8D8F0 sky blue (Session 15 change from #C4B4FF lavender) — ties to My Space identity
Dashboard header   = wordmark + back arrow (left) · date + "Dashboard" label + hamburger (right) — Session 14
Chat header        = wordmark (sky blue a+i) · "Home" label + hamburger (right) — Session 15 "Chat"→"Home" rename
✦ active colour    = #A8D8F0 sky blue
Delete             = optimistic UI first, Supabase background
Todos fetch        = IN ['active','done'] — NEVER eq('status','active')
Tick handler       = TOGGLE only — done↔active, never one-directional
Modal stacking     = close → setTimeout 350ms → open
Card buttons       = full-width, borderRadius:14, paddingVertical:14, Poppins_700Bold 15px
Nav store types    = edit_event · add_event · shopping · shopping_sheet · actions · meals · noticed · notes_tasks_sheet (NEW Session 14 — with tab:'notes'|'tasks' field)
Nav returnTo       = ONLY set when coming from Dashboard card. MoreSheet items must NOT set returnTo (was causing "← Dashboard" pill to appear on every MORE-triggered nav)
Chat header label  = 'Home' (Session 14 — was 'Chat')
Dashboard header   = wordmark + back arrow (to Chat) on left · date + "Dashboard" label + hamburger on right (Session 14)
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

## Channel Accent Colours (LOCKED)
```
Home/Chat          = Electric Coral #FF4545
Calendar           = Cobalt Blue #2055F0
Shopping           = Lavender #D8CCFF / deep purple #5020C0
Meals              = Mint #B8EDD0 / deep green #2D7A52   ← updated from Terracotta
Tutor              = Deep Violet #6B35D9
Family Tasks       = Zaeli Gold #F0DC80 (renamed from Todos)
Travel             = Ocean Cyan #0096C7 / #A8D8F0
Notes & Tasks      = Peach #FAC8A8 (My Space — personal)
Our Family         = Magenta Pink #D4006A
Our Budget         = Mint #2D7A52 deep / #B8EDD0 mint / #E6F7EF tint (Session 17 — swapped from Emerald to match Meals palette)
Settings           = Slate Grey #6B7280
```

---

## Naming Conventions (LOCKED — session 6)
```
Dashboard card/sheet  →  "Family Tasks"   (NOT Todos)
My Space card/sheet   →  "Notes & Tasks"  (NOT Notes)
Full-screen module    →  "Our Budget"     (NOT Budget)
Dashboard radar card  →  "On the Radar"   (NOT Family Tasks — see session 9)
Supabase (personal)   →  personal_tasks   (member-scoped)
Supabase (family)     →  budget_transactions, budget_categories (family-scoped)
Supabase (briefs)     →  zaeli_briefs     (family-scoped, new session 9)
```

---

## ══════════════════════════════════
## DASHBOARD — REDESIGNED (Session 9 ✅)
## ══════════════════════════════════

**New card order — LOCKED:**
1. **Calendar** — dark slate `#2D3748` · full width · collapsed shows headline · expands to today's events with family colour dots · + Add button always visible
2. **Meal Planner** — mint `#B8EDD0` · full width · collapsed shows tonight's dinner · expands to full week view · renamed from "Dinner"
3. **Weather + Zaeli Noticed** — bento row · Weather left `#E8F4FD` · Zaeli Noticed right `#F0EDE8` · both read-only · Zaeli Noticed PROMOTED from bottom row
4. **Shopping** — lavender `#D8CCFF` · full width · unchanged
5. **On the Radar** — gold `#F0DC80` · full width · RENAMED from "Family Tasks" · see spec below

**Removed from Dashboard:**
- Our Budget tile (moved to More sheet as "Coming soon" placeholder)
- Zaeli brief card (was on Dashboard previously — brief now lives in Chat)

**Our Budget in More sheet:**
- Navigation row in ZaeliFAB More sheet alongside Our Family, Tutor, Settings
- Shows "Coming soon — bank feed integration" placeholder screen
- Emerald identity preserved for when it's built properly

### On the Radar card spec
- **Collapsed:** "X things coming up." + "Your tasks + shared · next 7 days"
- **Expanded sections:** Today & overdue (coral dot) · Coming up (gold dot)
- **Data:** `personal_tasks` WHERE member_name = 'Rich' OR is_shared = true AND due within 7 days AND status = 'active'. Order: overdue first, then by due_date ASC.
- **View only** — no tick boxes. Ticking lives in My Space Notes & Tasks sheet only.
- **Two action buttons on expand:**
  - "+ Add task" (dark) — inline quick-add input, saves to personal_tasks, no navigation away
  - "View full list →" (gold tint) — router.navigate to My Space, opens Notes & Tasks sheet to Tasks tab

---

## ══════════════════════════════════
## CAMERA & UPLOAD — SPEC (Session 9 ✅)
## ══════════════════════════════════

### Chat bar camera icon
- SVG camera icon inside RIGHT side of the text input field
- Input becomes a row: TextInput (flex 1) + camera icon (right)
- No layout shift to the bar — mic stays left, send stays right
- Tapping icon opens 92% action sheet with THREE options:
  1. **Take a photo** — `ImagePicker.launchCameraAsync()` from expo-image-picker
  2. **Choose from library** — `ImagePicker.launchImageLibraryAsync()`
  3. **Upload a file** — `DocumentPicker` from expo-document-picker (PDF, doc, images)
- After selection: image/file goes into chat as attachment → sent to Sonnet vision
- Permissions: request on first use only (not on app launch)

### FAB More sheet — upload section
- Top section of More sheet: 3-column grid — Take photo · Choose photo · Upload file
- Same three options as chat bar
- After selection: navigate to Chat (router.navigate) with image pre-loaded as pending attachment
- Below divider: existing navigation rows (Our Family, Tutor, Our Budget, Settings)

### Sonnet vision system prompt addition
"The user has shared an image or file. Analyse it and respond helpfully. If it looks like a document, fixture, invitation, receipt, or list — identify what it is and offer relevant actions (add to calendar, add to shopping list, save note etc). Be specific and practical."

### Image display in chat
Thumbnail above user message text. width:180, height:120, borderRadius:12, right-aligned.

### Files to edit
- `app/(tabs)/index.tsx` — add camera icon to chat bar input wrapper
- `app/components/ZaeliFAB.tsx` — add upload grid to More sheet top section

---

## ══════════════════════════════════
## MEAL PLANNER SHEET — SPEC (Session 9 ✅)
## ══════════════════════════════════

Reference file: `zaeli-meals-mockup.html` (in repo root)

### Three tabs
1. **Meals** — 7 day planner
2. **Recipes** — recipe library
3. **Favourites** — hearted recipes

### Meals tab
- 7 day cards, one per day, mint `#B8EDD0` accent throughout
- Today card: mint border `#2D7A52`, mint background tint, "Tonight" badge
- Each day shows: meal name · family avatar(s) cooking · heart to favourite · Swap or + Add
- **Swap picker** (inline, below day card):
  - Two tabs: ❤️ Favourites · 📅 Move night
  - Favourites tab: shows hearted recipes as quick pick options + free-type field
  - Move night tab: shows all 7 days as destination buttons — empty nights highlighted in mint
- **Who's cooking** — tap avatar row or + to open picker. Family circles, tap to select. Same colour system as Calendar (Rich #4D8BFF · Anna #FF7B6B · Poppy #A855F7 · Gab #22C55E · Duke #F59E0B)
- **Heart on day card** — saves meal to Favourites directly from Meals tab

### Recipes tab
- "+ Add Recipe" (primary, mint deep) and "Upload Recipe" (secondary, mint light) buttons at top
- Search bar below
- 2-column recipe grid: emoji thumb · name · cook time · heart toggle
- Tap card → Recipe detail sheet

### Recipe detail
- Back button + heart toggle in header
- Emoji hero banner (mint background)
- Meta pills: cook time · serves · difficulty
- Two action buttons: "+ Meal plan" (pick day) · "🛒 Shopping list" (with pantry cross-check)
- Ingredients list: each shows pantry status (In pantry ✓ in mint · Need to buy in coral)
- Numbered method steps (mint circle numbers)

### Add recipe — manual
- Name · cook time · ingredients (one per line, Zaeli auto-splits) · method (free text, Zaeli numbers steps)

### Upload recipe — photo
- Two options: camera or library
- Sonnet vision reads recipe book page → pre-fills form for review before saving
- Same expo-image-picker as camera/upload feature

### Send to shopping list — pantry cross-check
- Shows all ingredients with pantry status
- Tap any "In pantry ✓" badge to override → flips to "Adding →" (in case pantry data stale)
- Confirm button count updates dynamically
- Only adds items not already in pantry/recently bought

### Supabase tables needed
- `recipes` — family-scoped, stores recipe data (name, cook_time, serves, ingredients JSONB, method JSONB, is_favourite bool)
- `meal_plan` — family-scoped, date + meal_name + cooks JSONB (array of member names)

---

## ══════════════════════════════════
## SESSIONS 7+8 — PREVIOUSLY LOCKED ✅
## ══════════════════════════════════

### Session 7 — all My Space sheets built:
- Notes sheet (full editor, share toggle, send, Supabase)
- Tasks tab (dual-tab, due dates, checkboxes, Supabase)
- Goals module (6 types, 5-step wizard, logging, milestones, Supabase)
- Fitness sheet (SVG ring, metrics, weekly chart, workouts, goal editor, Android splash)
- Stretch sheet (Adriene + MadFit videos, movements, mark done)
- Zen sheet (4 moods, 12 sessions, time-of-day hero, YouTube WebView)
- Wordle (full playable game, coral/gold/slate tiles, lavender design, family leaderboard, Supabase)

### Session 8 — Calendar/Shopping fix + polish:
- Calendar sheet: collapsible cards, manual add stays in sheet, end time auto-fill
- Shopping sheet: crash fix, data loading fix, text sizes
- Navigation unified: all router.navigate removed, everything uses sheets/context
- FAB More: Calendar + Shopping open sheets directly
- Whisper spelling correction, meal/calendar clash awareness, Wordle expanded

---

## ══════════════════════════════════
## SESSION 9 — DESIGN SESSION (13 April 2026) ✅
## ══════════════════════════════════

No code written — full design + strategy session.

### Decisions locked:
- **Philosophy B** — Zaeli is AI-first. Chat is home. Dashboard is reference layer.
- **Dashboard redesigned** — 5 clean rows, Our Budget removed, Zaeli Noticed promoted, Family Tasks → "On the Radar"
- **Meal Planner sheet** — full design with 3 tabs, swap/move, who's cooking, recipe upload, pantry cross-check
- **Camera/Upload** — chat bar icon + FAB More sheet, Sonnet vision
- **Model routing** — Sonnet for briefs/vision/complex, GPT-5.4 mini for general chat
- **AI Brief system** — 3 per day, family-scoped, firing logic, caching, format rules
- **Zaeli persona** — winning mantra, active credit, mini warmth rules all locked
- **Our Budget** — deferred to Phase 2. Upload-only approach acceptable for v1 but not compelling enough for Dashboard. Basiq enquiry sent.
- **Nav architecture** — leave as-is until real usage data. Review in Phase 2.

### Handover files produced this session:
- `zaeli-dashboard-redesign.html` — 5-card redesign with expanded states + build spec
- `zaeli-meals-mockup.html` — full meal planner 10 screens + build notes
- `zaeli-camera-upload.html` — chat bar + FAB More sheet mockups + build spec
- `zaeli-brief-examples.html` — 3 brief examples (morning/midday/evening) + prompt engineering spec
- `zaeli-fitness-sheet.html` — updated with goal editor + Android splash
- `zaeli-wordle.html` — rebuilt lavender design, coral/gold/slate tiles
- `zaeli-zen-sheet.html` — YouTube embed spec + 12 session library
- `zaeli-stretch-sheet.html` — YouTube embeds, instructor picker, mark done

---

## ══════════════════════════════════
## SESSION 10 — SHOPPING SHEET COMPLETE (13 April 2026) ✅
## ══════════════════════════════════

Full build session — Shopping sheet polished to production quality across all 3 tabs.

### Navigation fix:
- **contextTrigger** added to swipe-world → fixes race condition where `handleScroll` clobbered `activePage` during programmatic scroll
- Dashboard `onOpenSheet` + FAB `onMoreItem` both bump `contextTrigger` counter
- ChatScreen watches `contextTrigger` in dedicated useEffect — reliable sheet opening regardless of `isActive` timing
- **← Dashboard pill** fixed — was using `router.navigate()` (broken), now uses `onNavigateDashboard()` which calls `scrollToPage()` properly

### List tab:
- Trash bin icons removed from item rows — cleaner design
- Tap item → expand panel with Edit + Delete buttons
- Delete → red border card + "Tap bin again to delete" confirm row (matches screenshot pattern)
- **Tick/undo flow**: tap checkbox → green fill + strikethrough + "Undo" link, 5-second timer, then item disappears to Recently Bought. No flash on commit.
- **Structured add form**: collapsed "Add an item..." bar expands to Item name + Qty fields + "Add to list" coral button + Done. Green "✓ Added [name]" confirmation flash.
- **Duplicate checking**: manual add checks `shopSheetItems` locally, shows amber "⚠ already on the list" warning
- **Keyboard handling**: `shopKbHeight` state from Keyboard listener (KAV doesn't work in Modals), applied as `marginBottom` on add bar
- Recently Bought items: card-style layout, muted grey text (`rgba(0,0,0,0.38)`), tap to expand Edit/Delete, same red confirm pattern
- Share button in header — formats list as text, opens iOS share sheet

### Pantry tab:
- Same structured add form as List tab (Add to pantry + Zaeli button)
- Tap-to-expand on pantry items → Edit + Delete buttons
- Inline edit form (name field + Save/Cancel)
- Delete with red border confirm pattern
- "+ List" button adds to shopping list, "On list ✓" tappable to remove from list (toggle)
- Duplicate checking on add
- Scan/Upload buttons: "📷 Scan/Upload Receipt" + "🥦 Scan/Upload Pantry" → source picker overlay (Take photo / Choose from library)
- Pantry item limit increased from 100 → 500

### Spend tab:
- Monthly total font changed from DM Serif → Poppins_800ExtraBold
- All currency symbols changed to A$ (never £ or US$)
- Scan/Upload receipt button added
- Receipt cards: expand to see items, "Delete receipt" with confirm
- Deleting a receipt recalculates spend totals immediately
- Spend totals now calculated on sheet open AND after scan

### Receipt scan pipeline (dedicated — single Sonnet call):
- Image resized to 1200px wide JPEG via `expo-image-manipulator` (fixes HEIC from iOS camera)
- HEIC → JPEG conversion in both scan pipeline and general `send()` flow
- Single Sonnet call with receipt-specific prompt → structured JSON response
- Extracts: store, purchase date, items (name/qty/price), total
- **Pantry cross-check**: existing items → update `last_bought`, new items → add to pantry
- **Shopping list tick-off**: only ticks items where `created_at < receipt_date` (items added after receipt = left on list)
- Receipt saved to `receipts` table for Spend tab
- Post-scan refresh: pantry + spend data + shopping list all refresh
- Cost: ~A$0.02-0.04 per scan (single call vs old triple-call A$0.05)
- Receipt date extraction prompt insists on reading actual printed date, not defaulting to today

### Pantry scan pipeline (dedicated — single Sonnet call):
- Same image resize/HEIC conversion
- Extracts visible items → add/update pantry with today's date
- Summary: "Found X items. Y refreshed, Z new."

### AI shopping improvements:
- `add_shopping_item` tool now checks for duplicates (existing list + pantry stock level)
- Returns DUPLICATE: or PANTRY: warnings that AI relays naturally
- Shopping context detection: checks for "Back to Full List"/"Add more items" chips on last Zaeli message (not just inline cards)
- SHOPPING RULES in system prompt: one tool call per item, never write chips as markdown text
- CURRENCY rule added: "Always Australian dollars (A$). Never £, US$, or bare $."
- Inline shopping card removed after add actions — just text confirmation + chips
- Chip text stripping: AI's markdown chip text cleaned from response, proper chips injected
- Mic from shopping sheet routes through AI (not regex parsing) for smart multi-item parsing

### Scroll arrows:
- All 3 tabs have chat-style arrows: 38px white circles, side by side, shadow + border

### Key patterns established:
- `shopKbHeight` + `marginBottom` for keyboard in Modals (not KAV)
- `shopPendingBought` Set + timers for tick/undo flow
- `scanFromSheet()` dedicated pipeline pattern for vision tasks
- `contextTrigger` counter for reliable cross-component sheet opening
- Receipt date > item created_at comparison for smart tick-off

---

## ══════════════════════════════════
## SESSION 10b — MEAL PLANNER SHEET (13 April 2026 evening) ✅
## ══════════════════════════════════

Full Meal Planner 92% sheet built inside index.tsx. Same Modal pattern as Shopping.

### Meals tab (7-day planner):
- Day cards Mon–Sun with date label, meal name or "Nothing planned"
- Today: mint border + mint bg + "Tonight" badge (12px)
- Cook avatars: 28px family colour circles, tap to open cook picker
- Heart toggle on meals (persists via recipes tags)
- "Swap" button (open inline swap picker) or "+ Add" (same picker for empty days)
- Tap meal name → opens recipe detail

### Swap picker (inline below day card):
- Two sub-tabs: "❤️ Favourites" | "📅 Move night"
- Favourites: list favourite recipes as pick options + free-type input + "Set" button
- Move night: 7 day buttons, empty in mint, occupied show meal name. Tap to swap/move.

### Cook picker overlay:
- Family circles (56px, tap to toggle, green check on selected)
- Save → checks if kid selected → triggers kids job popup

### Kids job popup:
- "Create a job for [KidName]?" with point pills (5/10/15/Custom)
- Saves to `kids_jobs` Supabase table (family_id, child_name, title, points, source, linked_date)

### Recipes tab:
- "+ Add Recipe" (mint primary) + "Upload Recipe" (mint secondary) buttons
- Search bar, 2-column recipe grid (emoji thumb, name, cook time, heart)
- Tap recipe → recipe detail

### Favourites tab:
- Same grid filtered to `is_favourite` (via tags array containing 'favourite')
- Empty state with 🤍 icon

### Add recipe form:
- Name, cook time, ingredients (multiline, one per line), method (multiline)
- Save button → inserts to `recipes` table (stores ingredients/method in `notes` field)

### Upload recipe (multi-image):
- Camera + library buttons, multi-select from library (`allowsMultipleSelection: true`)
- Collect multiple photos (thumbnails with ✕ remove)
- "Scan X photos with Zaeli" → single Sonnet call with all images → pre-fills form

### Recipe detail:
- Emoji hero banner (120px, mint bg)
- Title, meta pills (time/serves/difficulty)
- Action buttons: "+ Meal plan" + "🛒 Shopping list"
- "Edit recipe" button → same form layout pre-filled, saves updates
- Ingredients with pantry status badges (In pantry ✓ / Need to buy)
- Numbered method steps with mint circle numbers
- Delete recipe option

### Send to list (pantry cross-check):
- Three-state badges — all tappable:
  - "In pantry ✓" (green) → "Adding →" (coral) → "Skipping" (grey, strikethrough)
- Dynamic confirm button count
- Batch insert to shopping_items

### Navigation:
- `meals_sheet` context type added to contextTrigger, isActive, and useFocusEffect handlers
- Dashboard dinner card → opens meal sheet directly
- FAB More "Meals" → opens meal sheet directly
- "Open Meal Planner" chip → opens meal sheet
- Dynamic header: back arrow ← on sub-views, heart toggle on recipe detail

### Supabase schema notes:
- `recipes` table: uses `prep_mins` (not cook_time), `notes` (stores ingredients + method as text), `tags` (array, 'favourite' tag for favourites)
- `meal_plans` table: uses `source` field to store cook_ids as JSON. No cook_ids or is_favourite columns.
- `kids_jobs` table: NEW — id, family_id, child_name, title, points, source, linked_date, is_complete, created_at

### Chat bar fix:
- Added `inputRef.current?.clear()` as native backup on send (onTouchStart + onSubmitEditing) to prevent text sticking

---

## ══════════════════════════════════
## SESSION 11 — MEAL PLANNER POLISH + LOCK (14 April 2026) ✅
## ══════════════════════════════════

Stress testing and polish session. Meal Planner now locked.

### Changes:
- **Rolling 10-day planner** — starts from today, no past days. Was Mon–Sun fixed week.
- **Today border = coral `#FF4545`** — distinct from mint swap border. Day number also coral.
- **Active swap border** wraps entire card + picker as one unit (parent View with overflow:hidden)
- **Unicode escapes fixed** — all remaining `\u2014`, `\u00b7`, `\u2026` replaced with actual characters
- **Swap placeholder** — "Add a meal..." (was "Type anything...")
- **Recipe photos** — tap hero to add photo (camera or library picker). Resized to 600px JPEG. Stored in `recipes.image_url`. Shows in grid thumbnails + detail hero. "Change photo" overlay when photo exists. Zero AI cost.
- **Move in recipe detail** — "Move to another night" button with inline move picker (same as Meals tab)
- **Search Recipes with day context** — "Search Recipes" button in swap picker Favourites tab. Routes to Recipes tab with mint banner showing selected day. Tapping a recipe assigns it and returns to Meals tab. `mealPendingRecipeDay` state tracks context.
- **Recipe detail from day card** — tapping meal name opens recipe detail with `mealDetailDayKey` set for move/context
- **Supabase schema** — `recipes.image_url` column used for photo storage
- **Tonight badge + cook avatars** — bumped sizes (badge 12px, avatars 28px)

---

## ══════════════════════════════════
## SESSION 11b — KIDS HUB COMPLETE (14 April 2026) ✅
## ══════════════════════════════════

Massive build — Kids Hub from dummy data to full Supabase-wired module with 5 games.

### Core Kids Hub:
- Child selector → unified hub layout for all kids (no more 3 tier variants)
- Hey [Name]! header + 3 stat row (Streak / Jobs today / To next reward)
- Child-themed backgrounds: Poppy lavender, Gab green, Duke yellow
- Wordmark a+i tints to child's colour in hub
- Points badge: child colour background, white text, 26px

### Jobs:
- Supabase-wired: kids_jobs, kids_points_log tables
- Active jobs with checkbox to complete → GIPHY celebration → points awarded
- Completed today: strikethrough + undo (tap checkbox reverts, removes points)
- Tap card body → expand for Repeat/Undo options
- Completed jobs history (previous days) expandable section with Repeat
- Suggest a Job form → kids_pending_approvals table → parent approval in Our Family

### Rewards:
- Supabase-wired: kids_rewards table
- Three affordability tiers (can afford / almost / saving)
- Redeem confirmation with balance breakdown
- Redemption → kids_pending_approvals → parent approval
- Suggest a Reward card

### Games (5 built, all with embedded keyboards):
- **Wordle**: age-tiered (4-letter Little, 5-letter Middle/Older), embedded QWERTY, key states, save/resume via AsyncStorage, info button with colour guide
- **Word Scramble**: embedded keyboard + input tiles, hint hidden (tap to reveal), celebration between rounds, Submit button below keyboard, save/resume
- **Maths Sprint**: custom number pad, 2-minute timer bar, green/red flash feedback
- **World Trivia**: 20 questions per tier (Aussie + World), celebration between questions
- **Mini Crossword**: interactive grid with clue numbers, tap to select, embedded keyboard, Check Answers

### Architecture:
- Games render as absolute overlay (not Modal — avoids re-render flicker)
- Celebration overlay: auto-dismiss 2.5s, tap to dismiss
- AsyncStorage for game save/resume (daily key per child)
- Our Family (family.tsx): pending approvals wired — approve/decline jobs + rewards

### Supabase tables created:
- kids_jobs, kids_rewards, kids_points_log, kids_pending_approvals
- All seeded with test data
- SQL in supabase-kids-hub-tables.sql

### Session 12 polish (all resolved):
- Game overlay changed from Modal to absolute View (fixes flicker)
- Wordle: active tile highlighted, Submit button below keyboard, key states for all word lengths
- Word Scramble: bigger Submit, hint hidden by default
- Maths Sprint: 2min timer, always coral, flashes last 10s, bigger responsive keypad, distinct answer box, Correct/Wrong text feedback
- World Trivia: renamed from Aussie Trivia, 20 questions per tier
- Crossword: grid+clues side by side, keyboard always visible, bigger cells (48px), Done button
- All DEL icons bumped to 22-24px across all games
- All unicode escapes fixed
- Kids Hub LOCKED

---

## ══════════════════════════════════
## SESSION 14 — ARCHITECTURAL REBUILD (17 April 2026) ✅
## ══════════════════════════════════

Massive session: Kids Hub AI trivia, Tutor difficulty bands, prompt caching, conversation summarisation, Dashboard redesign, Chat-first 2-page architecture, FAB killed, hamburger + MoreSheet, splash Option C, many polish fixes.

### Kids Hub improvements:
- **AI trivia via GPT-5.4 mini** — fresh questions every session, tracks history in `kids_trivia_history` Supabase table, prompt includes last 200 Q's to avoid repeats. Static arrays kept as offline fallback (shuffled).
- **Crossword selection** — per-child seen-tracking via AsyncStorage, daily rotation, siblings get different puzzles. Pool expansion to 100 crosswords PARKED (content task).
- **Supabase migration:** `supabase-kids-trivia-history.sql`

### Tutor improvements:
- **Topic chips reworked** — all 4 subjects (Maths/English/Science/HASS), Foundation–Year 12. Core-first (not Extension-first). E.g. Year 4 Maths now: Times tables · Multiplication · Division · Zaeli picks (was: Long multiplication · Decimals · Fractions).
- **Difficulty band system wired up:**
  - Loads prior band from `tutor_progress` when subject selected (new default = Foundation, not Core)
  - Tracks `consecutiveCorrect` (no hints), `consecutiveWrong` state
  - Injects structured state into Sonnet system prompt each call
  - 3 correct in a row (no hints) → UPGRADE (foundation→core→extension)
  - 3 wrong in a row → DOWNGRADE
  - Band persists to both `tutor_sessions.difficulty_band` AND `tutor_progress.difficulty_band` on session exit
- **Prompt caching** — `anthropic-beta: prompt-caching-2024-07-31` header auto-added when system prompt is array with `cache_control`. Static base + curriculum cached, dynamic state NOT cached. ~30-40% cost saving.
- **Conversation summarisation** — after 8 exchanges, older turns collapsed into 1-line summaries. Keeps input tokens bounded at ~1,500 (was growing to 3,000+ by turn 14).
- **Hint thinking indicator** — `handleHint` now calls `setSending(true)` immediately; also `setSending(false)` at end of `generateAIResponse` (was missing).
- **Floating mic pill** — tutor now uses the same waveform pill overlay as chat (Cancel/Send buttons), replacing inline recording indicator.
- **Cost analysis** — Poppy's Session 14 test: 18 turns, ~A$0.156. With caching + summarisation: estimated ~A$0.10-0.11 (~30% saving). Heavy use (30 sessions/month): A$3.00-3.30/child = 30% of A$9.99 revenue — comfortable.

### Dashboard redesign (Session 14 build of Session 9 spec):
- **New card order:** Calendar · Meal Planner (renamed from Dinner) · Weather+Zaeli Noticed (bento) · Shopping · On the Radar (renamed from Family Tasks)
- **Our Budget tile REMOVED** from Dashboard → MoreSheet
- **On the Radar** — new card using `personal_tasks` query for Rich + shared tasks due in 7 days. Inline + Add task input. View full list → navigates to My Space Notes & Tasks sheet (Tasks tab).
- **Header** — matches My Space (wordmark + date + Dashboard label + hamburger). Back arrow added to Dashboard header Session 14 (tap = go to Chat).
- **Card specs bumped to match My Space** — padding 22, borderRadius 22, cardLabel 13px letter 0.8, headline 24px, sub 13px.
- **Supabase migration:** `supabase-personal-tasks-sharing.sql` — adds `is_shared` + `member_name` columns to `personal_tasks`.

### Architecture rebuild (Session 14 radical):
- **Two-page swipe world** — Chat is page 0 (opens here), Dashboard is page 1. My Space moved to standalone route `/(tabs)/my-space`.
- **FAB KILLED** everywhere — `ZaeliFAB.tsx` component file still exists but not rendered.
- **Hamburger ☰ button** top-right of every screen's header — opens `MoreSheet` (92% bottom sheet with Family Channels, Personal, Modules, Navigation sections).
- **MoreSheet** (`app/components/MoreSheet.tsx`) — Option 1 refined tiles design. Uses `onAction` callback from parent (Chat/Dashboard) to handle in-swipe-world nav, or default router.navigate for standalone routes.
- **Back arrows** added to Tutor, Kids Hub, Our Family, Dashboard headers (next to zaeli wordmark, matching My Space pattern).
- **Chat bar camera** now opens Add-to-Chat sheet (Camera/Photos/Live) instead of camera-only.
- **Chat header label** — 'Home' (was 'Chat').
- **Legacy "← Dashboard" pill bug** — fixed by removing `returnTo: 'dashboard'` from all MoreSheet contexts (was appearing on every MORE-triggered nav).

### Splash screen:
- **Option C chosen — Deep Slate + Mint** — bg `#1C2330`, 96px wordmark white with mint `#B8EDD0` "a+i", "Less Chaos." bold mint + "More Family." soft white, 40px mint divider, "TAP TO CONTINUE" uppercase bottom.
- **Mint glow ring** behind wordmark (520×520 radial at 12% opacity).
- **Once per session** — module-level flag `_splashShownThisSession` prevents re-trigger when returning from standalone routes (My Space, Tutor, etc.).
- **Native splash updated** — `app.json` backgroundColor set to `#1C2330` for seamless transition. REQUIRES `npx expo prebuild --clean` + dev-client rebuild.

### Design mockup HTMLs produced this session (in repo root):
- `zaeli-fab-options.html` — 4 FAB option explorations
- `zaeli-chatbar-options.html` — 3 chat bar layouts (hamburger top-right chosen)
- `zaeli-more-sheet-options.html` — 4 MoreSheet designs (Option 1 chosen)
- `zaeli-splash-options.html` — 3 splash designs (Option C chosen)

### Files changed:
- `app/(tabs)/swipe-world.tsx` — rebuilt for 2-page, Chat-first, FAB removed, splash Option C, session flag
- `app/(tabs)/index.tsx` — hamburger added, MoreSheet render, camera picker, 'Home' label, legacy FAB removed
- `app/(tabs)/dashboard.tsx` — full redesign per Session 9 spec, hamburger + back arrow, MoreSheet, OnTheRadarCard
- `app/(tabs)/my-space.tsx` — standalone route, back button, hamburger, MoreSheet, initialTab prop for notes/tasks
- `app/(tabs)/tutor.tsx` — back arrow
- `app/(tabs)/tutor-session.tsx` — difficulty band system, prompt caching, conversation summarisation, hint thinking, floating mic pill
- `app/(tabs)/tutor-curriculum.ts` — all topic chips reworked Foundation–Year 12
- `app/(tabs)/kids.tsx` — AI trivia, crossword selection, back arrow
- `app/(tabs)/kids-games-data.ts` — no changes (fallback data preserved)
- `app/(tabs)/family.tsx` — back arrow
- `app/components/MoreSheet.tsx` — NEW component
- `app/components/ChatBarFacade.tsx` — NEW component (currently unused after revert, kept for future)
- `lib/api-logger.ts` — prompt caching support, cache metric logging, beta header auto-add
- `lib/navigation-store.ts` — added `notes_tasks_sheet` context type with `tab` field
- `app.json` — splash backgroundColor #1C2330, userInterfaceStyle 'light'

### Supabase migrations produced:
- `supabase-kids-trivia-history.sql` — kids_trivia_history table
- `supabase-personal-tasks-sharing.sql` — personal_tasks ADD is_shared + member_name columns

### Still TO DO from Session 14 feedback:
- Test on device once `app.json` rebuilt
- AI Brief system (4 time windows: morning/lunch/afternoon/evening, Sonnet, Supabase cache, time-relevant rule)
- Settings screen
- 100 crosswords (parked content task)
- Tutor session resume (reload from tutor_messages)

---

## ══════════════════════════════════
## SESSION 15 — POLISH + UX REFINEMENT (18 April 2026) ✅
## ══════════════════════════════════

Follow-up to Session 14's big rebuild. Focus: make everything feel right through many small but meaningful fixes.

### MoreSheet restructure (Option B with ACCOUNT section):
- **NAVIGATE section promoted to TOP** of the sheet (Chat + Dashboard, 50/50 tiles) — makes primary nav first thing user sees
- **PERSONAL section** now has 2 tiles side-by-side: My Space + Our Budget (was My Space full-width)
- **MODULES section** reduced to 2-tile row: Tutor + Kids Hub (their premium modules)
- **ACCOUNT section** NEW — houses Our Family + Settings (50/50). Label "ACCOUNT" chosen (alternatives considered: MANAGE, HOUSEHOLD)
- Tiles: bigger icons (18→26px) and labels (15→17px), cards same size
- X close button: proper SVG (not × text char), bumped 14→18px
- Layout: MORE section at bottom removed (Settings now inline in ACCOUNT)

### Universal hamburger across 92% sheets (Option A stacked):
- Hamburger ☰ button added to: **Calendar, Shopping, Meals, Notes & Tasks** sheet headers
- Only shown in top-level view (not sub-views like recipe detail or event edit form)
- Cross-sheet nav: tap hamburger in Meals → Meals closes → MoreSheet opens → tap Shopping → switches to Shopping (Shopping's opener `openShopSheet` called so data loads)
- X on MoreSheet → restore origin sheet

### Modal stacking bug fixes (critical learnings):
1. **iOS Modal can't stack reliably** — presenting MoreSheet while Calendar's Modal is mid-dismiss silently fails
2. **onDismiss + fallback timeout pattern** — use `<Modal onDismiss={handler}>` to get guaranteed post-dismiss signal. 600ms setTimeout as fallback for iOS edge cases.
3. **Phantom backdrop tap** — when hamburger tapped, touch-up event falls through onto newly-opening MoreSheet's backdrop → closes it instantly. Fix: MoreSheet `canCloseRef` ignores backdrop taps for first 400ms after open.
4. **Tile-tap race** — `handleItem` fires `onClose()` BEFORE `onAction()` (180ms later). Parent couldn't clear `sheetBeforeMoreRef` in time, so closeMoreSheet read stale ref and restored origin over the new nav. Fix: MoreSheet now calls `onAction` SYNCHRONOUSLY first, then `onClose` — parent clears ref before close reads it.
5. **Ref instead of state** — `sheetBeforeMoreRef = useRef()` not useState, so synchronous updates.
6. **Use real openers** — `openShopSheet()`, `openCalSheet()`, `openMealSheet()` (NOT bare `setShopSheetOpen(true)`). Bare setters flip visibility but don't load data → "list is clear" bug.

### Chat bar unification (two rebuilds in one session):
- Tried 3-piece floating design (mic circle + input pill + send circle) — user preferred Tutor's single-pill style
- **Final: single pill (Tutor style, bumped taller)** — `[Mic | sep | TextInput | Camera | Send]`
- Specs: minHeight 60, paddingVertical 10, buttons 44×44, font 17px, borderRadius 32
- `alignItems: 'flex-end'` so mic + send anchor to bottom as input grows (iMessage pattern)
- **Applied identically to Tutor** — both bars now look/feel the same
- Tutor icon sizes bumped (IcoMic 18→24, IcoSend 13→20, attach +18→22)
- All safety rules preserved (TextInput ref untouched, Send uses onTouchStart raw View, no onBlur, no Keyboard.addListener)

### Splash screen polish:
- **Wordmark "a+i"** changed from mint → **sky blue `#A8D8F0`** (My Space identity — better signals "home")
- "Less Chaos." stays mint bold — mint is still the tagline accent
- **Lavender orbs added** — top-right + bottom-left, using Shopping tile lavender `#D8CCFF` at 55-65% opacity (low opacity blended to grey on dark bg, needed HIGH opacity to read as purple)
- **"i" dot cut-off fixed** — lineHeight 104→128 + paddingTop 12 so the i-dot doesn't clip
- **Splash re-trigger fixed** — module-level `_splashShownThisSession` flag prevents splash re-mount when returning from My Space standalone route

### Dashboard improvements:
- **Tap-anywhere-on-card to expand** — Calendar, Meal Planner, Shopping, On the Radar cards all now use outer TouchableOpacity. Inner buttons (+Add, View Full Calendar, etc.) still work — React Native's responder system gives inner touchables priority.
- **Weather/Zaeli Noticed bento split** — changed from 50/50 → 35/65 (flex: 35 vs 65). Weather gets compact column, Zaeli Noticed gets readable space for expanded content.
- **Back arrow added to Dashboard header** — next to zaeli wordmark, quick return to Chat
- **Chat bar facade attempted and removed** — decided Dashboard/MySpace don't need chat bars. Each screen has its own purpose (Dashboard=glance, Chat=conversation, MySpace=personal). ChatBarFacade.tsx component kept in `/components` for future use but not rendered.

### Camera picker (Add-to-Chat sheet):
- **Camera icon in chat bar** now opens existing Add-to-Chat sheet (not camera-only)
- Sheet offers: Camera · Photos (Live option removed Session 15)
- Proper picker UX: user chooses before OS permission prompt

### 2-dot indicator killed:
- Looked awkward floating on Dashboard without a chat bar
- Removed entirely from swipe-world.tsx. Swipe + MoreSheet NAVIGATE section handle nav.

### Legacy "← Dashboard" pill:
- Completely removed from Chat header (was appearing whenever pendingChatContext had returnTo:'dashboard', which triggered on every MoreSheet nav)
- Navigation now handled via swipe + hamburger

### Chat header:
- "Chat" label → **"Home"** (Session 15 rename — Chat is the home screen)
- Heading size 18px (matches My Space page label)

### Small but important fixes:
- Chat bar camera → picker sheet (Camera / Photos). Live removed.
- Hamburger icon: bigger (36→42 container, 18→22 icon), lines at y=6/12/18 (symmetric, was y=8/14/20)
- Tutor, Kids Hub, Our Family headers — back arrows next to wordmark (matches My Space pattern)
- Splash orbs properly lavender on dark slate bg (0.65/0.55 opacity)
- Removed `returnTo:'dashboard'` from all MoreSheet contexts (was triggering legacy pill)

### Files changed Session 15:
- `app/(tabs)/index.tsx` — chat bar V2 rebuild, camera picker (Live removed), onAction order fix, modal stacking guards, Home label, sky blue a+i, legacy pill removed
- `app/(tabs)/dashboard.tsx` — all 4 cards tap-anywhere, Weather/Noticed 35/65, back arrow, hamburger
- `app/(tabs)/my-space.tsx` — onDismiss support in Sheet component, hamburger cross-nav via NotesSheet, ref-based sheetBeforeMore
- `app/(tabs)/swipe-world.tsx` — 2-dot indicator killed, splash polish (sky blue a+i, lavender orbs, wordmark height)
- `app/(tabs)/tutor-session.tsx` — chat bar bumped to match Chat V2
- `app/components/MoreSheet.tsx` — section restructure (NAVIGATE top, ACCOUNT bottom), bigger icons/fonts, X as SVG, backdrop tap guard, onAction SYNC before onClose

### Still TO DO from Session 15:
- Settings screen
- Tutor session resume
- 100 crosswords (parked)

---

## ══════════════════════════════════
## SESSION 16 — AI BRIEF SYSTEM v2 + CALENDAR FIX (19 April 2026) ✅
## ══════════════════════════════════

### AI Brief System (Phase 16 — Philosophy B centrepiece)

**Architecture:**
- **3 time windows** (per CLAUDE.md Session 9): Morning 05:00–11:59 · Midday 12:00–16:59 · Evening 17:00–04:59
- **Firing logic** — `lib/brief-firing.ts` pure functions:
  - New day → always fire
  - Window changed → fire (unless mid-conversation, then HELD)
  - Same window already fired → skip
  - Held brief fires on next app open OR 15 min inactivity
- **Generation** — `lib/brief-generator.ts`:
  - Check `zaeli_briefs` cache first (family_id + date_key + time_window)
  - `data_signature` = hash of today/tomorrow events + meal + shop count + tasks. If changed → regen.
  - Sonnet with prompt caching on system prompt (`cache_control: ephemeral`)
  - Returns strict JSON: `{ text, chips, winBanner? }`
  - Persona + format rules baked into system prompt (winning mantra, active credit, banned words)
- **Chat integration** — briefs render INSIDE the chat feed as Zaeli messages (isBrief: true)
  - Dark slate bubble `#2D3748` with mint left-border win banner
  - Coral primary chip + outlined secondary chips + dismissal chip
  - Time divider ("Midday · 12:31pm") shown above brief ONLY when firing into existing thread
  - Auto-scroll to bottom on fire
- **Cost** — ~A$0.01-0.02 per brief with prompt caching. 3 briefs/day stress-tested = ~A$2.50-3.00/family/month

**New files:**
- `supabase-zaeli-briefs.sql` — migration for zaeli_briefs table (with data_signature + cost tracking)
- `lib/brief-firing.ts` — shouldFireBrief, currentWindow, windowLabel, hashString
- `lib/brief-generator.ts` — generateBrief (cache-first), FamilyContext, buildSystemPrompt per window

**Files modified (index.tsx):**
- Msg type extended with `briefWindow`, `briefChips`, `briefWinBanner`, `briefDividerLabel`
- `tryFireBrief()` function — unified entry point (called on mount, isActive, 60s timer)
- `buildBriefContext()` — live Supabase data aggregation
- `handleBriefChipTap()` — primary chip → send() as user message, dismissal silent
- Mount effect: 400ms delay then `tryFireBrief({ appJustOpened: true })` + 60s interval for held briefs
- isActive effect: `tryFireBrief({ appJustOpened: false })`
- `lastMessageAtRef` tracks user sends for inactivity check
- Old lavender brief card DISABLED (`false &&` gate) — new brief in feed only
- Brief bubble styles in StyleSheet (briefBubble, briefWinBanner, briefChip, briefTimeDivider, briefEyebrow, etc.)

**Old brief system:**
- LandingBrief overlay kept for now (tied to splash landing — separate concern)
- Old `generateBrief()` still exists but old lavender render gate removed
- Can fully clean up old brief code once new system proven stable

### Calendar month-view fix (Session 15 carryover)
- Bug: `null === null` matched spillover cells making every prev/next month day red
- Fix: explicit null guards on `isToday` + `isSelected`
- Bug: "Nothing on" section disappeared on month change (selectedDay set to null)
- Fix: auto-select today (current month) or day 1 (other months), with `userTapped` flag
- Red circle only shows on genuine user-tap, never on auto-select
- Today is permanent slate anchor (Option A) — never overridden to red even if tapped
- Arrow buttons: bigger circular containers (40×40), SVG chevrons, hitSlop 12px

---

## ══════════════════════════════════
## SESSION 17 — BRIEF POLISH · SETTINGS · KIDS HUB FIX · OUR BUDGET v2 PURE PLANNER (22 April 2026) ✅
## ══════════════════════════════════

Big session. Brief system polished and critical shadowing bug fixed. Settings shipped. Kids Hub keyboard flash resolved. Our Budget built v1 then pivoted to v2 Pure Planner (no live tracking). Mint palette + Option D allocation chart.

### AI Brief system polish
- **Quiet-day persona rewrite** ([brief-generator.ts:59](lib/brief-generator.ts:59)) — replaced rules-heavy "BE PROACTIVE" block with "QUIET DAYS — WHERE YOUR PERSONALITY LIVES". Zaeli leads with observation/character before offers. Per-window examples added to morning/midday/evening suffixes.
- **Eyebrow star** — was sky blue SVG on sky blue tile = invisible. Fill now `#0A0A0A` black.
- **Bubble colour** — `#F0EDE8` → Dashboard peach `#FAC8A8`.
- **Font sizing** — briefText 15/24 → 17/27. briefWinText 13/20 → 15/22. Win banner tint bumped to 0.55 alpha so mint stays readable on peach.
- **Primary chip softer** — `#FF4545` coral fill → `#FFE4E0` soft coral with `#B83333` deep coral text, border `#F5C2BA`.
- **Dismiss chip works** — was silent. Now sets `msg.briefDismissed = true`, chips hide, brief text stays as reference.

### Brief system CRITICAL bug (fixed Session 17)
- Root cause: local `async function generateBrief(force, focusHint)` in index.tsx was **shadowing the imported** `generateBrief` from `lib/brief-generator`. `tryFireBrief` was calling the old GPT brief the whole time.
- Symptoms: 10s blank screen on reload, "Nothing on today" cards appearing after unrelated responses, weird two-message briefs.
- Fix during investigation: imported as `generateBriefV2`. After deleting the old function entirely, renamed back to `generateBrief`.
- Also fixed: one orphan caller at `_finishEntry` (line 5379) that would crash with the renamed imported signature.

### Instant brief feedback
- `tryFireBrief` now pushes a **loading placeholder bubble** (peach bubble + `TypingDots`) immediately, updates in place when Sonnet returns.
- Dropped the 200ms mount delay — fires the moment chat is ready.
- On error, placeholder is removed (no stuck empty bubble).

### Old brief system FULL CLEANUP
- Removed ~380 lines: module-level cache vars · 8 dead state vars (`briefReplies`, `chatBriefText/Chips`, `briefHero`, `briefChips`, `activePill`, `overviewOpen`, `briefSeed`) · `cardAnims` ref + `briefHero` effect · old `generateBrief` function · `generatePostCardPrompt` · `renderCardStack` (never called) · dead lavender brief card JSX · stale-session 30-min splash-replay reset · dead style block (heroSection, overviewToggle, cardStack, shadowed brief chip duplicates).
- Renamed `generateBriefV2` import back to clean `generateBrief`.
- Patched orphan call at `_finishEntry` to use `tryFireBrief({ appJustOpened: true })` instead.

### Calendar keyword tightening (bug from chat hijacking bike-hire question)
- `CALENDAR_KEYWORDS` list narrowed from ~50 entries (including bare "next week", "today", day names, "school", "pickup") to ~20 intent-bearing phrases only.
- Now triggers only on: "what's on", "anything on", "when is", "coming up", "remind me", "am I busy", etc. Time refs only trigger when paired with intent.
- Narrative mentions of time no longer hijack chat responses with calendar cards.

### Settings screen built (Phase 18)
- New file [settings.tsx](app/(tabs)/settings.tsx) — replaces the 16-line stub with full implementation.
- 3 internal views: `main` / `notifications` / `memory` (no separate routes, state-driven).
- **Main**: account hero (slate gradient + peach avatar + plan tag), Subscription card (mint), Family row → `/family`, Preferences rows, Data & Privacy, About, Danger (Sign out / Delete).
- **Notifications**: brief times (Morning/Midday/Evening) — tappable rows open `DateTimePicker` modal. Display as exact time ("6 am", "7:15 am") — never "around". Toggles for reminders, kids activity, quiet hours (expands Start/End pickers when on), sound & vibration.
- **Memory**: dummy routines / preferences / milestones (Supabase wiring deferred), `×` delete per row, "Let Zaeli learn from chats" toggle, Clear all.
- Persistence: all toggles/times saved to AsyncStorage under `zaeli_settings_prefs_v1`. Supabase migration in backend pass.
- MoreSheet → Settings tile already wired in MoreSheet default handler.

### Settings → Our Family back navigation
- Problem: router params don't reliably survive tab-route navigation in expo-router.
- Fix: added `setFamilyFromSettings()` + `consumeFamilyFrom()` to [navigation-store.ts](lib/navigation-store.ts). Bulletproof module-level flag (same pattern as `pendingChatContext`).
- Settings calls `setFamilyFromSettings()` before `router.navigate('/family')`. family.tsx consumes on mount via `useState(() => consumeFamilyFrom())`. `goBack()` checks origin — Settings → `router.navigate('/settings')`, else default `swipe-world`.

### Kids Hub keyboard flash (classic React anti-pattern)
- Root cause: `JobsTab`, `RewardsTab`, `GamesTab`, `LeaderboardTab`, `Banner`, `ChildSelectView`, `HubHomeView` were functions declared inside `KidsHubScreen` but rendered as JSX elements `<JobsTab />`. Every parent re-render → new function identity → React unmounts/remounts the whole subtree → TextInput unmount → keyboard dismisses → mount → keyboard reopens. Cycle per keystroke.
- Fix: convert all 7 call sites to function expressions `{JobsTab()}`. JSX becomes plain render result, no remount on parent re-render.
- Applies any time you declare sub-components inside a parent — either hoist out, or call as function.

### Standard header rule (Session 17 — now locked)
- **Page label standard**: `Poppins_700Bold · fontSize 17 · color rgba(10,10,10,0.72)` — replaces the mixed 14/18/17 and varying alpha across screens.
- **Wordmark standard**: `Poppins_800ExtraBold · fontSize 40 · letterSpacing -1.5 · lineHeight 46` — confirmed across family/kids/my-space, now applied to settings (was 26).
- Applied to: [dashboard.tsx:1433](app/(tabs)/dashboard.tsx:1433), [my-space.tsx:2583](app/(tabs)/my-space.tsx:2583), [index.tsx:8415](app/(tabs)/index.tsx:8415) (`topBarChannelName`), [tutor.tsx:324](app/(tabs)/tutor.tsx:324), [kids.tsx:1555](app/(tabs)/kids.tsx:1555).

### Our Budget v1 built then v2 PIVOT ✅

**v1 build (then superseded)**:
- Built full 3-tab UI shell (Overview / Categories / Goals) with static seed data, then wired CRUD sheets for income editor, add transaction, add/edit category, add/edit goal.
- Screenshot upload with Claude Sonnet vision → statement review sheet with confidence thresholds, accept/edit/skip per transaction.

**Strategic pivot — Option B Pure Planner (LOCKED Session 17)**:
- Richard observed: uploaded November ATM withdrawals got imported as "this month" spend — structural failure of the live-tracking premise without a bank feed (Basiq).
- Discussed and agreed: without a bank feed, "live spend tracking" lies to users the moment data is stale. Shifted positioning: **Zaeli Our Budget = a family budget PLANNER, not a tracker.**
- **What's IN**: monthly income streams, fixed categories with line items (auto-sum), variable categories with single target, savings goals (manual, forward-looking), one-off AI helper for budget suggestions (data not persisted).
- **What's OUT**: live "spent this month" numbers, transaction ledger, status tiles (on track/watch/over), persisted monthly review rows, reality-check banner, add-transaction UI.

**v2 implementation**:
- Fixed categories hold line items — budget = `SUM(line_items.monthlyAmount)`, auto-calculated. Variable categories have a single `monthlyTarget` field.
- AI helper produces 3 kinds of suggestions: variable averages (map to existing cats), new variable categories (if pattern doesn't fit), recurring subscription detections (auto-added as line items to Subscriptions category).
- Paste statement works via Clipboard API. Photo works via ImagePicker + Claude Sonnet vision. CSV/PDF shows install instructions (needs `expo-document-picker` + EAS rebuild).
- Tab rename: **Goals → Savings**. (Internal items still called "goals".)
- Hero label: **Spare → Surplus**. Over-budget: shows `−$X`, label becomes "Over", peach coloring.
- **Target date picker** in EditGoalSheet — Pick-a-month / Flexible toggle. `DateTimePicker` in date mode, stored as "Oct 2025".
- Mint palette swap (match Meals): `#2D7A52` deep / `#B8EDD0` mint / `#E6F7EF` tint / `#C8F0DA` border. Savings = `#A8D8F0` sky. Over = `#FAC8A8` peach with `#8A3A00` warm brown text.
- **Allocation chart Option D** — single labelled stacked bar with `%` inside each segment + 3 tinted chips below with dollar amounts. Over state: scales to fit 100%, 3rd chip turns peach with `−$X`. Warm warning note below.

**Budget access fix**: "Coming soon" alert lived in 3 places — [MoreSheet.tsx:213](app/components/MoreSheet.tsx:213), [dashboard.tsx:1395](app/(tabs)/dashboard.tsx:1395), [index.tsx:5997](app/(tabs)/index.tsx:5997). All now route to `/our-budget`.

### HTML mockups produced this session
- `zaeli-settings-mockup.html` — Settings main + Notifications + Memory detail
- `zaeli-budget-v2-mockup.html` — Pure Planner redesign (5 frames)
- `zaeli-budget-v2-theming.html` — mint palette + 4 chart options (Option D picked)

### Files touched this session
- `app/(tabs)/index.tsx` — brief polish, old brief cleanup, standard page label, calendar keyword tightening, budget access, brief loading placeholder
- `app/(tabs)/settings.tsx` — full rewrite (~740 lines)
- `app/(tabs)/family.tsx` — back-to-settings origin detection
- `app/(tabs)/our-budget.tsx` — NEW (~1700 lines, v2)
- `app/(tabs)/dashboard.tsx` — standard page label + budget route
- `app/(tabs)/my-space.tsx` — standard page label
- `app/(tabs)/tutor.tsx` — standard page label
- `app/(tabs)/kids.tsx` — standard page label + keyboard flash fix (call-as-function pattern)
- `app/components/MoreSheet.tsx` — budget tile routes to `/our-budget`
- `lib/navigation-store.ts` — added `setFamilyFromSettings` / `consumeFamilyFrom`
- `lib/brief-generator.ts` — quiet-day persona rewrite + per-window examples

---

## ══════════════════════════════════
## SESSION 18 — TRAVEL MODULE · KEYBOARD FIX (22 April 2026) ✅
## ══════════════════════════════════

Follow-on to Session 17 same day. Travel module built from scratch against the new design system.

### Travel module ([travel.tsx](app/(tabs)/travel.tsx))
- Full rewrite — replaces the pre-Session-14 March 1382-line version
- **Standalone route** (not 92% sheet — too much depth for a sheet: Trip Stack → Trip Detail → 4 tabs)
- **Two views**: Trip Stack (Upcoming + Past sections + `Plan a trip` CTA + Zaeli insight) → Trip Detail
- **Trip Detail 4 tabs**: Overview / Bookings / Packing / Notes (segmented switcher)
- **Overview**: gradient hero card with destination (38px) + flag + dates + countdown pill, tap-to-edit Who's Going card, tap-to-edit Budget card, inline packing progress, Zaeli insight, Delete trip
- **Bookings**: grouped by category (Flights / Accommodation / Transport / Activities), **tap row to edit** (was long-press-to-delete — changed Session 18)
- **Packing**: sky progress pill, sections by person (Shared + each trip member), tap-to-tick with ocean-deep check, long-press to remove
- **Notes**: tagged cards (Important/Idea/Info/Question — each with own colour), author attribution, long-press to remove
- **Sheets**: unified BookingSheet (add+edit in one component), NewPackingSheet, NewNoteSheet, NewTripSheet (6 card-bg options, 14 icon emojis), EditTotalBudgetSheet, EditMembersSheet
- **Routing**: MoreSheet travel tile wired in all 3 onAction handlers ([MoreSheet.tsx:217](app/components/MoreSheet.tsx:217), [dashboard.tsx:1396](app/(tabs)/dashboard.tsx:1396), [index.tsx:5995](app/(tabs)/index.tsx:5995))
- **Design rules followed**: 40px wordmark, `a+i` sky `#A8D8F0` (Travel identity), 17/700Bold/0.72 page label, segmented tabs, big fonts (trip dest 30px stack / 38px detail, budget 34px, hero Zaeli text 17px), no in-module chat bar

### Travel Budget = Pure Planner (applied Session 18 pivot)
- **No manual "Spent so far"** — same reason we ripped it from Our Budget: without a bank feed, manual spend data is drift + lies
- **Booked** auto-sums booking amounts (committed dollars)
- **Still to plan** = Total − Booked (runway for food / activities / anything not booked yet)
- Edit button on Budget card opens EditTotalBudgetSheet — one field (total only)

### Keyboard glitch fix — root cause
- **Symptom**: typing in Travel's Add Booking / Add Note forms, screen went out of whack, couldn't see the focused input
- **Root cause**: `KeyboardAvoidingView` wrapping the entire Modal + `sheetCard: height: H * 0.92` fixed height. When keyboard opened, KAV pushed the whole fixed-height card up off the top of the screen.
- **Fix**: move KAV *inside* the sheet card, wrapping only the body. Card stays pinned to bottom, body shrinks to accommodate keyboard. Applied to [travel.tsx SheetShell](app/(tabs)/travel.tsx) and backported to [our-budget.tsx SheetShell](app/(tabs)/our-budget.tsx).
- **Also**: added `keyboardShouldPersistTaps="handled"` to all Travel + Our Budget sheet ScrollViews so tapping between fields while keyboard is up doesn't dismiss it.

### Session 18 polish round
- Who's Going card tappable → EditMembersSheet (family pill multi-select)
- Bookings tap-to-edit via unified BookingSheet (`payload: 'new' | Booking`), Delete button inside sheet (replaces long-press-to-delete)
- Budget card now shows Total / Booked auto-sum / Still to plan
- Same keyboard fix backported to Our Budget sheets

### Files touched this session
- `app/(tabs)/travel.tsx` — full rewrite (~1500 lines)
- `app/(tabs)/our-budget.tsx` — SheetShell KAV moved inside card
- `app/components/MoreSheet.tsx` — travel tile routes to /travel
- `app/(tabs)/dashboard.tsx` — same in onAction handler
- `app/(tabs)/index.tsx` — same in onAction handler (closes sheets first)

### Deferred to backend pass (Travel)
- 6 Supabase tables: `trips`, `trip_members`, `trip_bookings`, `trip_packing_items`, `trip_notes`, `trip_budget`
- AI brief per trip (Sonnet cached)
- Vision for booking confirmations (auto-extract REF / dates / amount from screenshot)
- Real family_members wiring (not seed data)

### Pending for backend pass (all together)
- Our Budget: 4 Supabase tables (`income_streams`, `budget_categories`, `category_line_items`, `savings_goals`) + AI helper persists accepted suggestions
- Settings: `user_preferences` table (migrate from AsyncStorage) + push notification scheduling tied to brief times / quiet hours
- Account / Auth: Supabase auth user, real name / email / family_members hookup
- Subscription: Stripe metadata + customer portal WebView
- Memory: wire Settings → Memory to real `family_insights` / `family_milestones` / `conversation_memory` data
- Push notification registration for brief times
- Export data, Clear chat history, Privacy/Terms WebViews
- Our Budget CSV/PDF: `expo-document-picker` install + dev client rebuild
- Our Budget share extension: native module, EAS build step

---

## ══════════════════════════════════
## SESSION 19 — BRIEF v3 · ONBOARDING POLISH · TOUR · INVITES (23–24 April 2026) ✅
## ══════════════════════════════════

The largest single body of work in the build so far. Five interlocking workstreams:

### A. Brief system v3 — 2 windows + structured prose

- **Reduced from 3 windows to 2** — morning (05:00–15:59) "here's your day" + evening (16:00–04:59) "today's wrap + tomorrow's shape". Midday killed; evening now carries tomorrow-morning prep so morning brief doesn't need to. Per [lib/brief-firing.ts](lib/brief-firing.ts) + the locked rule in this doc.
- **Render redesigned to Option B** ([app/(tabs)/index.tsx](app/(tabs)/index.tsx)):
  - Bubble shape matches standard chat bubble (radius 18, BBL 6, no border)
  - Soft tint per window — peach `#FDF1E5` morning, lavender `#F0EBFF` evening
  - Time-of-day pill at top of bubble — `☀️ MORNING` (peach pill) / `🌙 EVENING` (lavender pill)
  - Win banner KILLED entirely. Encouragement folds into the prose itself.
  - Eyebrow simplified to `Zaeli · 12:31pm` (window context lives in pill, no redundancy)
- **Generator prompt rewritten** ([lib/brief-generator.ts](lib/brief-generator.ts)):
  - Enforces 3-paragraph structure: `[OPENER]` (1 line + emoji) / `[BODY]` (2-3 sentences with specifics) / `[ONE THING]` (single nudge with emoji)
  - Max 100 words total; quiet-day mode collapses to opener + one thing only
  - 1 emoji per paragraph max (so 2-3 emoji across whole brief, never more)
  - `winBanner` field stripped from JSON spec, parser, BriefPayload type, and DB writes (column stays for migration safety, set null)
- **`briefWinBanner` Msg field also removed** from the chat code (state field, push site, render path)

### B. Onboarding polish

- **Splash WelcomeStep + ReadyStep** ([app/onboarding/index.tsx](app/onboarding/index.tsx)) — both got the new palette orb design (peach top-right, mint bottom-left, lavender mid-left, sky bottom-right) on warm BG. `wmHuge` lineHeight 96 → 120 + paddingTop 14 fixes the i-dot clip. "Less **chaos**." in coral. ReadyStep's ✦ → ✨, sub gets a 💬, `overflow:hidden` on wrap so orbs stay contained.
- **Step 2 (OpenerStep)** — opener changed `Hello — I'm Zaeli` → `Hey 👋 I'm Zaeli`. Forward-looking copy: *"Once we're set up, you'll be able to **message me**, **tap the mic**, or **show me a photo**…"* with sprinkled emoji 📸/📚/⏱️.
- **Duplicate "is this rash anything?"** — Step 2 line replaced with `"what's this homework asking?" 📚` (teases the Tutor demo coming up). Original kept in Step 10 LifeDemoStep where it's the headline demo.
- **Brentwood example (Step 10 LifeDemoStep)** — bigger fonts (body 11→14, answer 14→16), photo card → white with stronger border, answer card → sky-blue tint with sky-deep left border, `demoCard` padding 16→20.
- **Brief preview (Step 11 BriefPreviewStep)** — updated to match new live brief Option B exactly: peach bubble + ☀️ MORNING pill + structured 3-paragraph prose (☔/🥞/🍽). Win banner killed. Eyebrow simplified.
- **Chat bar removed from onboarding entirely** — `<ChatBar/>` instances stripped, component definition + styles deleted. Onboarding has no fake chat bar; CTAs land in-flow.
- **CTA rename** — `Go on then` → `Let's go` (both CTA + user-echo line in Step 3).
- **User text matched Zaeli text** — both `Poppins_400Regular`, `lineHeight: 26`. Onboarding `uText` updated for cross-surface consistency.

### C. Cold-start splash redesigned (matches onboarding)

- [app/(tabs)/swipe-world.tsx](app/(tabs)/swipe-world.tsx) — dark slate (Option C) **REPLACED** with warm bg `#FAF8F5` + palette orbs (peach/mint/lavender/sky)
- Wordmark now INK black with sky `a+i`, "Less **chaos**." in coral `#FF4545`, "More family." in INK
- TAP TO CONTINUE in INK4
- 40px mint divider killed
- Native splash bg in [app.json](app.json) updated `#1C2330` → `#FAF8F5` so cold-start transition is seamless. **REQUIRES `npx expo prebuild --clean` + dev-client rebuild.**

### D. Main chat bubble unification

- **Zaeli text** now wrapped in soft-grey bubble (`rgba(10,10,10,0.04)`, BBL 6, padding 13/16, alignSelf flex-start, maxWidth 90%)
- **User bubble** background: `#F2F2F2` → sky `#E8F4FD` (T.userBubble token), shape radius 18 / BBR 6 / padding 11/15, maxWidth 86%
- **Both texts** matched: `Poppins_400Regular` / 17px / `lineHeight: 26` (was Medium 27 for one, Regular 27 for the other)
- New `s.zaeliBubble` style added — wrapped 5 paragraph render points (calendar inline, shopping inline, other-inline intro+followUp, plain text path) plus typing-dots state plus dead-code brief render path

### E. TOUR SYSTEM — full build (Phase 30)

**State machine:** [lib/tour-state.ts](lib/tour-state.ts)
- `loadTourState()` / `getCurrentStop()` / `advanceStop()` / `goBackStop()` / `skipToFinale()` / `completeTour()` / `replayFromStart()` / `replayStop(n)` / `isCompleted()` / `isInProgress()` / `getProgressPct()` / `getStopById(n)`
- Inactivity helpers: `shouldShowResumePrompt()` / `markResumePromptShown()` (24h inactivity threshold + 24h prompt cooldown)
- `STOPS` array with all 11 stop definitions: id / emoji / pageH1 / pageSub / cardTitle / cardSub / trySaying / trySayingType / features[] / ctaLabel / ctaTarget (sheet|route|chat) / accent palette / isHero / trialBadge / priceLine / secondaryCtaLabel
- AsyncStorage key `tour_state_v1` — currentStop (1..11 or 'finale'), startedAt, completedAt, lastOpenedAt, lastResumePromptAt
- Progress formula `((cur-1)/(TOTAL-1))*100` so stop 1 = 0% and stop 11 = 100% (even 10% jumps per step)

**Route:** [app/tour/index.tsx](app/tour/index.tsx)
- Header (× close + Skip-to-end) / eyebrow / h1 / sub / **animated** progress bar (Animated.Value, 320ms cubic-out) / per-stop card / bottom nav (Back + Next-or-Finish)
- Tutor stop 7 = HERO — violet accent throughout (icon ring, eyebrow, h1 highlight, CTAs, progress fill), trial badge ✨ FREE FOR 14 DAYS at top of card (inline row, not absolute — was getting clipped), secondary CTA "Just have a look", price line below
- Finale celebration screen — 🎉 emoji, summary recap (Daily loop / Hero / Bonus), "Take me to chat ✨" → `completeTour()` + routes home
- 11 stops: Shopping → Meals → Calendar → Kids Hub → Tasks → Photos → **Tutor (HERO)** → Travel → Our Budget → My Space → Our Family
- Stop CTAs route via `pendingChatContext` (Shopping/Meals/Calendar/Tasks → swipe-world opens sheet) or direct `router.navigate` (Kids/Tutor/Travel/Budget/MySpace/Family)
- Photos stop CTA = "Open chat →" (camera lives in chat bar; trySayingType `'tap'` shows sky callout instead of mint)

**Chat integration:** [app/(tabs)/index.tsx](app/(tabs)/index.tsx)
- `🧭 Take the tour` chip → `replayFromStart()` (CRITICAL — wipes finale state from prior runs) then `router.navigate('/tour')`
- **Tour pill** floats bottom-LEFT (was right — collided with chat scroll arrows) when tour is mid-progress: `🧭 Resume tour` + mint badge `X/11`. Tap → /tour at saved stop. Refreshes on focus + on chat mount.
- **Inactivity prompt** — `maybeFireTourResume()` on mount + focus. Pushes Zaeli message *"We were on the [Stop] stop. Want to pick up where we left off, or skip ahead? You're 3 of 11 through 🧭"* with chips ▶ Continue / 🏁 Skip to end / Not right now. `markResumePromptShown()` runs synchronously to prevent double-fire.

**First-time mint banner inside live sheets:** [app/components/TourBanner.tsx](app/components/TourBanner.tsx)
- Reusable `<TourBanner sheetKey="..." message="..."/>` — renders only when tour-in-progress AND not previously dismissed for that sheet
- Per-sheet AsyncStorage flag `tour_banner_seen_<sheetKey>`; × dismiss persists
- Wired into 4 sheets: **Shopping**, **Meals**, **Calendar**, **Notes & Tasks** (Tasks tab specifically)

**Settings → Replay tour view:** [app/(tabs)/settings.tsx](app/(tabs)/settings.tsx)
- Added 'tour' to View union, page label handling, mint compass row in Preferences
- TourReplayView component — hero card "Run the whole tour" + "▶ Start full tour" CTA + "Last completed: <date>" + 11-row per-stop picker with palette-coloured icons matching tour route accents (Tutor row tagged "Hero feature")
- Wired `replayFromStart()` and `replayStop(n)` from parent

**Mockup:** [zaeli-tour-mockup.html](zaeli-tour-mockup.html) — v2, 18 frames across 5 acts (tour offer → daily loop → Tutor hero → bonus modules → finale + Settings replay + inactivity)

### F. INVITE SYSTEM — full build (Phase 31)

**State libs:**
- [lib/invite-state.ts](lib/invite-state.ts) — `loadInvites()` / `getPendingInvites()` / `getPendingForName()` / `findByToken()` / `createInvite()` (returns `{invite, link, sms}`) / `markAccepted()` / `resendInvite()` / `revokeInvite()` / `recentlyAcceptedInvites()` (heads-up windowing) / `clearJustAcceptedFlag()` / `relTime()`. Mock 6-char token. Per-role SMS composer. AsyncStorage key `invite_state_v1`.
- [lib/account-state.ts](lib/account-state.ts) — current account identity. Three kinds: `owner` (Rich, default) / `adult` (invited adult) / `kid` (invited kid with own device). `loadAccount()` / `getAccount()` / `isKidAccount()` / `isAdultAccount()` / `setAccount()` / `resetToOwner()`. AsyncStorage key `account_state_v1`. Used by MoreSheet for permission gating.

**Inviter side:**
- [app/invite/index.tsx](app/invite/index.tsx) — role picker (Adult sky / Kid lavender — **no emoji**, just color-coded names per Richard) + form (name + optional phone + live SMS preview) + iOS share sheet trigger via `Share.share({ message: sms, url: link })`. Returns to `/(tabs)/family` after share dismisses.
- Optional `?role=kid&name=Anna` query params — pre-set when launched from inline "+ Invite" tap on existing kid.
- [app/(tabs)/family.tsx](app/(tabs)/family.tsx) updates:
  - Per-member status grid: Rich = "You · Account owner" / Anna = "+ Invite to Zaeli" tap (mock changed `'full'` → `'invite'`) / Poppy = "Joined" / Gab = "+ Invite to Zaeli" tap / Duke = "Uses parent's device" + "+ Give them their own" outlined mint button
  - Status badges bumped — fontSize 9→11/12, padding 7×2→10×5/12×7, hitSlop 10px on all action chips, action chips promoted to filled mint pills
  - PendingInviteRow component (mint for adult / lavender for kid) with PENDING tag + Copy/Resend/Revoke chips
  - Mint dashed "+ Invite" CTA card replaces old "Add a family member" — bottom CTA stays for *new* people not in onboarding
  - Old "Add a member without a device" demoted to lighter dashed fallback
  - Back button on member profile bumped — was barely-visible grey `‹ Back`, now white pill with dark text + hitSlop, label expanded to "‹ Back to family"
- **Inviter heads-up message** in chat ([app/(tabs)/index.tsx](app/(tabs)/index.tsx)) — `maybeFireInviteHeadsUp()` on mount + focus. Tinted message: mint for adult acceptance / lavender for kid. **CRITICAL fix**: `clearJustAcceptedFlag()` runs SYNCHRONOUSLY before message-pushing setTimeout to prevent double-fire from concurrent mount+focus calls.

**Receiver side:**
- [app/invite/[token].tsx](app/invite/[token].tsx) — deep link route. Loads invite by token, branches:
  - **Adult flow** (4 steps): welcome splash (orbs) → confirm name+email+password → own brief times → preferences (skip-able) → `markAccepted()` + `setAccount({kind:'adult'})` + sets `onboarding_complete` + `onboarding_just_completed` → routes to `/(tabs)/swipe-world` → tour offer auto-fires
  - **Kid flow** (3 steps): welcome splash (lavender orbs) → pick avatar (8 options) + 4-digit PIN → capability intro tiles → `markAccepted()` + `setAccount({kind:'kid', name, avatar})` → routes to `/(tabs)/kids`
  - Invalid/revoked token → friendly 🤔 "This link doesn't work" screen

**Permission gating:**
- [app/components/MoreSheet.tsx](app/components/MoreSheet.tsx) — loads account on each open, hides **Budget** + **Family** tiles when `isKidAccount()` is true. (Direct route navigation NOT yet gated — kid could type `/our-budget` and reach it. Defer to backend pass.)

**Dev rows for testing on a single device** ([app/(tabs)/settings.tsx](app/(tabs)/settings.tsx) Developer section):
- 🧪 Re-do onboarding (existing)
- 📨 Simulate invite accepted — marks oldest pending as accepted, fires heads-up in chat
- 🔗 Open latest invite as receiver — navigates to `/invite/<token>` of newest pending invite for end-to-end testing
- ↩️ Reset to owner account — switch back to Rich after testing as kid/adult invitee

**Mockup:** [zaeli-invite-mockup.html](zaeli-invite-mockup.html) — 18 frames across 4 acts (inviter open + role/form → share sheet + pending state → adult stripped onboarding + chat landing + heads-up → kid stripped onboarding + Hub landing + heads-up)

### Locked decisions Session 19

- **Brief = 2 windows only**, never 3
- **Brief = structured 3-paragraph prose** (opener / body / one thing), 1 emoji per paragraph max, no win banner
- **Cold-start splash + onboarding splash = same warm-bg + palette-orbs design** (no more dark slate)
- **Tour = 11 stops**, Tutor as HERO at stop 7 with violet treatment + trial badge
- **Tour pill = bottom-LEFT** (right side reserved for chat scroll arrows)
- **Invites = Adult or Kid roles only** (no Helper / granular permissions for v1 — kid access = full app minus Budget + Family management)
- **Invite delivery = iOS share sheet only** (no backend in v1; backend pass adds real token validation)
- **Trust the link** — no approval flow on invite acceptance
- **Account state = local AsyncStorage** (`account_state_v1`) — backend pass migrates to Supabase auth user + JWT claims
- **Invitee onboarding stripped** — Adult 4 steps, Kid 3 steps. Adult lands in chat → tour fires. Kid lands in Kids Hub.

### Critical bugs fixed Session 19

- **Tour finale instead of stop 1** — `🧭 Take the tour` chip from post-onboarding offer was loading stale `currentStop = 'finale'` from AsyncStorage. Fix: chip handler calls `tourReplayFromStart()` first, wipes prior completion state.
- **Inviter heads-up double-fire** — mount + focus effects both calling `maybeFireInviteHeadsUp()` read the same unsurfaced invites before either could clear the flag. Fix: `clearJustAcceptedFlag()` now runs synchronously before the message-pushing setTimeout.
- **Tour progress bar inconsistent steps** — formula `(cur/TOTAL)*100` gave stop 1 = 9% which felt jumpy. Changed to `((cur-1)/(TOTAL-1))*100` so 0%/10%/20%/.../100%. Plus smooth Animated.Value timing.
- **Trial badge clipped at top** — was absolute `top:-10` getting clipped by ScrollView. Now inline at top of card content via right-aligned flexbox row.
- **Tour pill collision with chat scroll arrows** — moved from `right: 16` to `left: 16`.
- **Tour fonts too small** — bumped sizes throughout (eyebrow 12→13, h1 28→32, sub 14→16, cardTitle 22→26, cardSub 14→16+INK2, tryText 13→16, feature pills 11→13, primary CTA 14→16, finale h1 30→34, etc).
- **Family screen status badges hard to tap** — fontSize 9→11/12, padding 7×2→10×5/12×7, action chips promoted to filled mint pills with hitSlop 10.
- **Member profile back button barely visible** — was rgba(10,10,10,0.40) text. Now white pill with dark text + hitSlop, label "‹ Back to family".

### Files touched Session 19

- `lib/brief-firing.ts` — 2 windows only
- `lib/brief-generator.ts` — 3-paragraph prompt rewrite, winBanner stripped from spec/parser/payload/upsert
- `lib/tour-state.ts` — NEW
- `lib/invite-state.ts` — NEW
- `lib/account-state.ts` — NEW
- `app/onboarding/index.tsx` — splash orbs, ReadyStep orbs, Step 2 + Brentwood + brief preview updates, finale sets `onboarding_just_completed`, chat bar removed
- `app/(tabs)/swipe-world.tsx` — splash redesign (warm bg + palette orbs, INK wordmark, coral chaos)
- `app/(tabs)/index.tsx` — bubble unification (zaeliBubble wrap + sky user bubble), brief render Option B, tour offer + tour pill + tour resume + invite heads-up logic, chip handlers for tour/invite/resume
- `app/(tabs)/settings.tsx` — TourReplayView + Replay tour row + 3 dev rows (Simulate accepted, Open latest invite, Reset account)
- `app/(tabs)/family.tsx` — per-member invite status grid, PendingInviteRow, mint Invite CTA card, bigger badges + back button, Anna mock changed to 'invite'
- `app/components/MoreSheet.tsx` — kid account hides Budget + Family tiles
- `app/components/TourBanner.tsx` — NEW reusable
- `app/tour/index.tsx` — NEW route
- `app/invite/index.tsx` — NEW route (role picker + form + share sheet)
- `app/invite/[token].tsx` — NEW receiver route (Adult + Kid flows)
- `app.json` — native splash bg `#1C2330` → `#FAF8F5`

### Mockups produced

- [zaeli-tour-mockup.html](zaeli-tour-mockup.html) — v2, 18 frames, 5 acts
- [zaeli-brief-card-mockup.html](zaeli-brief-card-mockup.html) — 4 options (current + A/B/C/D); B picked
- [zaeli-invite-mockup.html](zaeli-invite-mockup.html) — 18 frames, 4 acts

### Deferred from Session 19 (small)

- **Kid tour = 9 stops** (skip Budget + Family) — ✅ shipped Session 19 quick-wins commit (28 April).
- **Welcome banner inside Kids Hub** for fresh kid invitees — ✅ shipped Session 19 quick-wins commit.
- **Direct-route gating** — ✅ shipped Session 19 quick-wins commit (Budget + Family redirect kid accounts to /kids on mount).
- **Trial-period pill countdown** (post-completion 14-day timer) — Richard explicitly skipped this as "too pushy". Note for future if Stripe integration changes the calculus.
- **Real cross-device invite** — current mock token only works on the inviting device. Backend pass adds Supabase invite tokens + real deep linking.

---

## ══════════════════════════════════
## SESSION 19 QUICK WINS (28 April 2026 — early) ✅
## ══════════════════════════════════

Closed the four small Session 19 deferred items in one commit ([`e22164d`](https://github.com/RDK1981/zaeli/commit/e22164d)):

### A. Kid tour = 9 stops
- New `KID_SKIP_IDS = [9, 11]` in [lib/tour-state.ts](lib/tour-state.ts) (Our Budget + Our Family)
- New `getEffectiveStops()` / `getEffectiveTotal()` helpers — filter by `isKidAccount()`
- `loadTourState()` now also calls `loadAccount()` so account kind is available
- `advanceStop` / `goBackStop` / `getProgressPct` / `replayStop` all step through the EFFECTIVE list
- Tour route eyebrow shows "STOP X OF 9" for kids; bottom-nav last-stop check uses effective index instead of fixed `position === TOTAL_STOPS`
- Chat tour pill shows `X/9`, post-onboarding offer text says "9 stops" (`stopWord = total === 11 ? 'eleven stops' : '${total} stops'`), inactivity prompt uses effective totals
- Settings → Replay tour picker hides Budget + Family rows for kid accounts via `getEffectiveStops()`

### B. Kids Hub welcome banner
- Receiver flow ([app/invite/[token].tsx](app/invite/[token].tsx)) `finishKid()` now sets `kid_just_joined = 'true'` AsyncStorage flag
- [app/(tabs)/kids.tsx](app/(tabs)/kids.tsx) reads + clears flag on mount → renders lavender welcome card with × dismiss above the 3-stat row
- Bonus: kid accounts now AUTO-jump straight into their hub (skipping the kid picker `view = 'select'`) and `selectedChild` is set to their name from `getAccount()`

### C. Direct-route gating
- [app/(tabs)/our-budget.tsx](app/(tabs)/our-budget.tsx) + [app/(tabs)/family.tsx](app/(tabs)/family.tsx) — both call `loadAccount()` on mount, redirect kid accounts to `/(tabs)/kids` via `router.replace`
- Belt-and-braces with MoreSheet's tile hiding — kid can't reach these via deep link, back button, or any other path
- Note: Settings + standalone routes (Tutor, Travel, MySpace) NOT gated — kids may legitimately want to use them with their own context

### D. Calendar month-view glitch fixed
- Root cause: `fetchMonthDayEvents` used `.eq('date', dateStr)` while `fetchMonthDots` used `.gte/.lte` range. If `events.date` column ever has a timestamp/timezone component (which the dots query tolerates), `eq` silently misses
- Fix: switched day query to `.gte(dateStr).lt(nextDayStr)` — same pattern as the dots query

### Plus: incidental config tidies
- `app.json` — Android RECORD_AUDIO permission + `package: com.zaeli.app`
- `package.json` — npm `ios`/`android` → `expo run:*` for native builds

---

## ══════════════════════════════════
## SESSION 20 — ON-DEVICE POLISH ROUND (28 April 2026 — late) ✅
## ══════════════════════════════════

Three bugs surfaced during real device testing — all fixed in one commit. Plus the voice timing decision locked.

### A. Tutor session resume — STUB → real implementation

**Bug:** Gab finished a Read Aloud session, returned to Tutor menu, tapped the "Recent sessions" row → nothing happened. Reason: `goSessionReview(sessionId)` in [app/(tabs)/tutor-child.tsx](app/(tabs)/tutor-child.tsx) was a `console.log` stub. Active sessions called `goPillar(sess.pillar)` which started a NEW session instead of resuming the original.

**Fix** ([app/(tabs)/tutor-session.tsx](app/(tabs)/tutor-session.tsx) + [app/(tabs)/tutor-child.tsx](app/(tabs)/tutor-child.tsx)):
- Tutor-session accepts new optional `resumeSessionId` query param
- New `loadExistingSession(sid)` function:
  1. Fetches session row from `tutor_sessions` (id, pillar, subject, topic, difficulty_band, duration_seconds, hints_used, question_count, status)
  2. Fetches all rows from `tutor_messages` for that session, ordered by `created_at`
  3. Converts each row to a `Message` object (role / content / timestamp) — photo rows show `[Photo uploaded]` placeholder
  4. Hydrates state: messages array, conversationHistory, sessionId, subject, topic, difficultyBand, questionNum, hintsUsed, timer
  5. Sets phase = 'active' if subject was already picked; else 'select'
  6. If session was 'completed', flips status back to 'active' so the exit-save logic on next back-button still works cleanly
- Reset `useEffect` dependency includes `resumeSessionId` so navigating between resume/fresh works
- `goSessionReview` removed entirely. Replaced by `goResumeSession(sess)` — same path for active OR completed sessions
- Row tap handler simplified: `onPress={() => goResumeSession(sess)}` (was `sess.status === 'active' ? goPillar(sess.pillar) : goSessionReview(sess.id)`)
- Works for ALL pillars (Practice, Homework, Read Aloud, Write & Review, Comprehension, Money & Life) since they all share `tutor-session.tsx`
- Falls back to `sendInitialMessage()` if the session row isn't found or load fails

### B. Chat VIEW-query inline cards (across the board)

**Bug:** Asking Zaeli "what's on the shopping list" returned a plain-text wall of 31 items. No `InlineShoppingCard` render. No quick-reply chips. Same problem for meals + tasks queries.

**Root cause:** `send()` only intercepted CALENDAR view queries (`isCalendarQuery`) before the GPT chat path. Shopping/Meals/Tasks fell through to plain GPT, which helpfully typed out everything.

**Fix** ([app/(tabs)/index.tsx](app/(tabs)/index.tsx)):
- Three new keyword arrays: `SHOPPING_VIEW_KEYWORDS` / `MEALS_VIEW_KEYWORDS` / `TASKS_VIEW_KEYWORDS`
- Three new detection functions: `isShoppingViewQuery` / `isMealsViewQuery` / `isTasksViewQuery` — all check `isActionQuery` first so action queries ("add milk to shopping") still go through the tool path
- Three new branches in `send()` after the calendar branch — each fetches data directly + updates the loading reply with intro text + inlineData + quickReplies, then `return`
- Shopping branch: fetches first 4 unchecked items + total count → intro that scales with size ("Just one thing on the list" / "8 items — tap any to tick off" / "31 items — that's a chunky one") → chips: `Open full list` / `Add an item` / `Got it`
- Meals branch: fetches next 7 days of meal_plans → tonight call-out + week count → chips: `Open Meal Planner` / `Plan tomorrow` (or `Plan tonight` if not planned) / `Got it`
- Tasks branch: fetches active todos sorted by due_date → overdue count + intro → chips: `Open Tasks` / `Add a task` / `Got it`
- Chip handlers wired in `handleQuickReply`:
  - `Open full list` → `openShopSheet('list')`
  - `Open Tasks` / `Open To-dos` / `Add a task` → `setPendingChatContext({ type: 'notes_tasks_sheet', tab: 'tasks' })` + `router.navigate('/(tabs)/my-space')`
  - `Add an item` (shopping) / `Add more items` → `startRecording()` (mic for voice add)
  - `Got it` / `All good` / `Thanks` / `Cheers` → just clears the chips on the originating message, leaves the text in feed
- Action queries unaffected — saying "add milk to shopping" still routes to the tool path (action keywords are checked first)

### C. Shopping sheet add-bar layout fix

**Bug:** First time the Shopping sheet opens, the "Add an item…" bar at the bottom is squashed against the bottom edge of the phone (mic + Zaeli buttons partially obscured). After the user taps the add bar to expand it and then closes it again, the layout corrects.

**Root cause:** The sheet wraps content in `<SafeAreaView edges={['bottom']}>`. react-native-safe-area-context's `SafeAreaView` doesn't reliably resolve the bottom inset on first render INSIDE a Modal. Layout settles correctly only after a state-triggered re-measure (which is what tapping expand/collapse triggers).

**Fix** ([app/(tabs)/index.tsx](app/(tabs)/index.tsx)):
- Imported `useSafeAreaInsets()` alongside `SafeAreaView` from `react-native-safe-area-context`
- Read `const insets = useSafeAreaInsets()` once at component mount
- Shopping sheet `SafeAreaView edges={['bottom']}` → `edges={[]}` — no automatic bottom padding application
- List + Pantry add-bar wrappers now own the bottom inset explicitly:
  - Keyboard CLOSED: `paddingBottom: Math.max(insets.bottom, 8)`, `marginBottom: 0`
  - Keyboard OPEN: `paddingBottom: 2 (iOS) / 4 (Android)`, `marginBottom: Math.max(shopKbHeight - insets.bottom, 0)`
- Spend tab ScrollView contentContainer `paddingBottom: 50` → `50 + insets.bottom` (no add bar, just receipts — needed explicit padding so last receipt isn't tucked under home indicator)

### D. Voice (ElevenLabs) timing — LOCKED

Locked decision: voice integration goes **AFTER backend pass**, not before. Reasons:
- Backend pass unlocks real users (auth, push, real cross-device invites). Voice on a single-device prototype demos well but can't actually go live yet
- Voice needs its own design conversation (when does it play, playback settings, cost controls) — that takes time
- Best reveal moment = TestFlight build with voice + real auth + real push all together
- Risk: if voice is wired now and chat UX shifts during backend work, we re-do the integration

Small exception: if voice gets wired pre-backend, it should be ONLY for the brief (already locked UX) — not chat replies or other surfaces.

### Locked decisions Session 20

- **Chat VIEW queries → inline render**, not text walls. Pattern: detect via keyword array → check `isActionQuery` first to exclude actions → fetch data directly → `updateMsg(replyId, { text, inlineData, quickReplies, isLoading: false })` → `return`. Apply this anywhere a query naturally maps to existing inline-card rendering.
- **SafeAreaView inside Modal is unreliable on first render** — for any element whose position depends on bottom safe area, OWN the inset via `useSafeAreaInsets()` and apply `paddingBottom` directly. Don't rely on `<SafeAreaView edges={['bottom']}>` alone.
- **Tutor session resume** = `resumeSessionId` query param to tutor-session route. Loads from `tutor_messages` ordered by created_at, hydrates state including conversationHistory. Always flips status 'completed' → 'active' on resume so exit-save logic stays clean.
- **Voice (ElevenLabs) AFTER backend pass.** Don't wire it now — would risk re-work when chat UX shifts. Only exception: brief-only voice (since brief render is locked).

### Files touched Session 20

- `lib/tour-state.ts` — Session 19 quick wins (kid skip IDs + effective stops/total + account-aware advance/back/progress/replay)
- `app/tour/index.tsx` — Session 19 quick wins (effective list for eyebrow + bottom nav)
- `app/(tabs)/our-budget.tsx` + `app/(tabs)/family.tsx` — Session 19 quick wins (kid account redirect)
- `app/(tabs)/kids.tsx` — Session 19 quick wins (welcome banner + auto-select kid's hub)
- `app/(tabs)/settings.tsx` — Session 19 quick wins (Replay tour view shows effective stops)
- `app/invite/[token].tsx` — Session 19 quick wins (sets kid_just_joined flag)
- `app/(tabs)/tutor-child.tsx` — Session 20 (goResumeSession replaces stub)
- `app/(tabs)/tutor-session.tsx` — Session 20 (loadExistingSession + resumeSessionId param)
- `app/(tabs)/index.tsx` — Session 20 (3 view-query branches in send + 3 keyword arrays + chip handlers + useSafeAreaInsets + Shopping sheet edges + add-bar paddings + Spend tab paddingBottom)

### Test paths

**Tutor resume:** Open Tutor → pick child → Read Aloud (or any pillar) → say a few things → back → see "Recent sessions" row → tap it → session reopens with all messages + timer in place. Continue talking, hit back → saves cleanly.

**Chat view-query inline cards:**
- "what's on shopping list" → soft intro + InlineShoppingCard + chips
- "what's for dinner" → tonight call-out + InlineMealsCard + chips
- "any tasks for me" → top-of-pile + overdue count + InlineTodos + chips
- "add milk to shopping" → still goes to tool path (action keyword wins)

**Shopping add-bar layout:** Open Shopping sheet → "Add an item…" bar should sit cleanly above home indicator on FIRST open (no need to expand-collapse to fix).

---

## ══════════════════════════════════
## SESSION 21 — BACKEND PASS KICKOFF (14–18 May 2026) ✅
## ══════════════════════════════════

Four-phase backend migration shipped + a chat bar photo bug fix. Largest single block of backend infrastructure work to date. All four phases verified end-to-end on device.

### A. Backend Phase 1 — Auth foundation (commit `91dbf1e`)

First real Supabase auth in the project. Sign-up + sign-in via DB trigger, atomic family + profile creation, AsyncStorage session persistence, polished sign-in UI with palette orbs matching onboarding.

**NEW SQL: `supabase-auth-tables.sql`** (idempotent)
- `public.families` table (id, name, created_at)
- `public.profiles` table (id PK = auth.users.id, family_id, kind ENUM 'owner'/'adult'/'kid', name, email, avatar, colour, year_level, brief_morning_at, brief_evening_at, created_at, updated_at)
- `handle_new_user()` SECURITY DEFINER trigger on `auth.users` INSERT — reads `name` + `family_name` from `raw_user_meta_data`, creates a families row + matching profile in one transaction. Avoids the classic Supabase RLS-vs-fresh-session chicken-and-egg.
- `public.current_family_id()` helper — single source of truth for "what family does this user belong to". Used by every RLS policy downstream.
- RLS policies: "Read own profile" (id = auth.uid()), "Read family profiles" (family_id = current_family_id()), "Update own profile".

**NEW `lib/auth.ts`** — public API: `signUpOwner({email, password, name, familyName?})` / `signInWithPassword({email, password})` / `signOut()` / `getSession()` / `getCurrentUserId()` / `loadProfile()` / `getProfile()` / `getCurrentFamilyId()` / `onAuthChange(cb)`. Module-level `_profile` cache for sync reads.

**NEW `app/(auth)/sign-in.tsx`** — three states: 'sign-in' | 'sign-up' | 'check-email'. Palette orb splash design (matches onboarding). Layout polish: explicit `lineHeight` on every text style to prevent 'y'/'g' descender clipping (was cutting off "family" and "Sign in"). Bottom-right sky orb removed (was overlapping Sign in button). `zIndex: 1` on ScrollView.

**`app/_layout.tsx`** — auth guard with session check on mount. `onAuthChange` listener calls `invalidateAccount()` + `loadProfile()` on SIGNED_IN. Returns blank `<View>` until `loaded && authed !== null`.

**Critical setup**: Disable "Confirm email" in Supabase dashboard for dev (otherwise sign-up sends confirmation email and stalls).

### B. Backend Phase 2a — RLS on data tables + DUMMY_FAMILY_ID swap (commit `24aa73c` then fixes in `4884290`)

The big lift. Move from the hardcoded `DUMMY_FAMILY_ID = '00000000-0000-0000-0000-000000000001'` constant scattered across 12 files to dynamic `getFamilyId()` resolving at query time via the authenticated profile.

**NEW SQL: `supabase-data-rls.sql`**
- Standard RLS policies (SELECT/INSERT/UPDATE/DELETE) added via DO-block iterating 19 family-scoped tables: events, todos, shopping_items, pantry_items, receipts, meal_plans, recipes, family_members, zaeli_briefs, personal_tasks, kids_jobs, kids_rewards, kids_points_log, kids_pending_approvals, kids_trivia_history, tutor_sessions, tutor_progress, reminders, notes
- All policies: `family_id = public.current_family_id()`
- `tutor_messages` gets session-aware policy: `session_id IN (SELECT id FROM tutor_sessions WHERE family_id = current_family_id())`
- `claim_legacy_data()` helper RPC — reassigns rows on DUMMY_FAMILY_ID to caller's real family (returns per-table counts for verification)

**NEW `lib/family.ts`** — `getFamilyId()` calls `getCurrentFamilyId()` from auth.ts. If profile not loaded yet (race condition), falls back to DUMMY_FAMILY_ID + logs once + auto-triggers `loadProfile()` to self-heal.

**99 swaps across 12 files** — perl word-boundary regex `\bFAMILY_ID\b` → `getFamilyId()`. Files: `app/(tabs)/index.tsx` (99 refs — the bulk), `dashboard.tsx` (9), `my-space.tsx` (11), `family.tsx` (11), `kids.tsx` (11), `tutor.tsx` (2), `tutor-child.tsx` (3), `tutor-session.tsx` (5), `calendar.tsx` (9 — DUMMY_FAMILY_ID variant), `lib/tutor-summaries.ts` (6). `lib/zaeli-memory.ts` and `lib/notifications.ts` kept DUMMY_FAMILY_ID as imported constant for default-parameter fallback.

**Three NEW view-query branches added to `send()` in index.tsx** (Shopping/Meals/Tasks "what's on…" queries). These had to go BEFORE the calendar branch — otherwise CALENDAR_KEYWORDS' "what's on" matched first and intercepted shopping queries with a calendar render.

### C. Backend Phase 2a follow-up fixes (commit `4884290`) — session persistence + RLS finally working

After initial Phase 2a, three issues surfaced during on-device testing:

**Issue 1: User signed out on every reload.** Root cause: Supabase auth defaulted to `window.localStorage` which doesn't exist in RN. Fix in `lib/supabase.ts`:
- Wire `AsyncStorage` as `auth.storage`
- `react-native-url-polyfill/auto` import (required for RN auth — Supabase tokens don't serialize properly without it)
- `AppState` listener to call `supabase.auth.startAutoRefresh()` / `stopAutoRefresh()` on foreground / background
- Required `npx expo start --dev-client --clear` after install

**Issue 2: `lib/family.ts` warned-once fallback hardening.** When `getFamilyId()` called before profile cache populated, log once + auto-trigger `loadProfile()`. Surfaces race conditions cleanly + self-heals.

**Issue 3 (the big one): Shopping list still returned 0 rows despite all auth context correct.**

Diagnosed end-to-end:
- ✅ JWT working (`auth_uid: 700edaa4-...`)
- ✅ Function returns right family (`family_id_from_fn: 51dff810-...`)
- ✅ Profile row exists
- ❌ Query returned `rows: 0`

Cause: `current_family_id()` SECURITY DEFINER function was created without `SET search_path = public, auth`. Inside SECURITY DEFINER context running as `postgres` role, `auth.uid()` didn't resolve and the function silently returned NULL. Then `family_id = NULL` was always false → zero rows.

Compounded by a SECOND silent failure: original `supabase-data-rls.sql` DO-block had rolled back during its first run (probably because the function existed at the wrong moment) — so RLS was ON with ZERO policies, which is Postgres' deny-everything default.

**Fix:**
1. `CREATE OR REPLACE FUNCTION public.current_family_id() ... SET search_path = public, auth ...` — auth.uid() resolves cleanly inside SECURITY DEFINER
2. Re-ran the policy DO-block (idempotent DROP IF EXISTS + CREATE) — all 19 tables got their 4 policies
3. Verified end-to-end: shopping list, calendar, meals, tasks, kids hub, tutor — all rendered correctly under signed-in auth

**Lesson locked**: any SECURITY DEFINER function that calls `auth.uid()` MUST have `SET search_path = public, auth`. No exceptions.

### D. Backend Phase 2b — invite tokens + tour state to Supabase (commit `a632852`)

Two state libs migrated from AsyncStorage to Supabase so they work cross-device. Public API surface preserved on both libs so call sites in chat, family, tour route, and settings replay didn't change.

**NEW SQL: `supabase-invites-tour.sql`**
- `public.invite_tokens` table (token PK + family_id + role + name + phone + status + surfaced_heads_up + accepted_user_id + inviter_user_id + timestamps)
- 4 RLS policies on invite_tokens scoped by `family_id = current_family_id()` — inviters only see their own family's invites
- SECURITY DEFINER RPC `public.get_invite_by_token(text)` → returns jsonb. **GRANT EXECUTE TO anon** so receivers without a session can lookup by token without RLS visibility. Token IS the secret — same security model as Stripe idempotency keys / password reset links.
- SECURITY DEFINER RPC `public.accept_invite(text, uuid)` → marks invite accepted + records timestamp. Also anon-callable.
- `profiles.tour_state JSONB` column for tour state persistence

**`lib/invite-state.ts` rewrite**
- Inviter side: `loadInvites/getInvites/getPendingInvites/findByToken/createInvite/markAccepted/resendInvite/revokeInvite` all preserved but now backed by Supabase (RLS-scoped SELECT to hydrate the module cache, mutations write through to DB)
- `createInvite` resolves family_id from current user's profile, INSERTs to invite_tokens with retry-on-token-collision (5x for unique violation)
- NEW `lookupInviteByToken(token)` and `acceptInviteRemote(token, userId)` for the receiver-side flow — both go through the SECURITY DEFINER RPCs so no session required

**`lib/tour-state.ts` rewrite**
- Source of truth: `profiles.tour_state` JSONB when signed in. AsyncStorage stays as offline fallback + pre-auth path (kid receivers don't have a Supabase user yet — Phase 2d)
- `persist()` is write-through: AsyncStorage fire-and-forget + `profiles.tour_state` UPDATE if signed in. Cache is authoritative locally between persist() and next loadTourState()
- All 16 public exports unchanged so /tour route + chat tour pill + settings replay picker work as-is
- Inline emoji unicode escape sequences (`📅` etc) replaced with literal emoji characters since they were rendering literally in some JSX text contexts — no functional change

**`app/invite/[token].tsx`** — receiver flow updated: `loadInvites + findByToken` → `lookupInviteByToken` (one RPC, no AsyncStorage), `markAccepted` → `acceptInviteRemote`

### E. Backend Phase 2c — Settings preferences to Supabase (commit `8b7d543`)

Smallest of the four phases. Same write-through pattern as tour-state.

**NEW SQL: `supabase-user-prefs.sql`** — `ALTER TABLE profiles ADD COLUMN user_preferences jsonb`. No new RLS — profiles already has the right policies.

**NEW `lib/user-prefs.ts`** — same shape as `lib/tour-state.ts`: module-level cache, `sanitise()` for forward-compat (extra keys ignored, missing keys filled from DEFAULT_PREFS), `persist()` write-through to AsyncStorage + `profiles.user_preferences` UPDATE if signed in. Public API: `loadPrefs / getPrefs / updatePref / savePrefs / invalidateCache + DEFAULT_PREFS + Prefs` type. All 15 settings fields preserved (briefMorningTime, briefEveningTime, brief on/off, notification toggles, quiet hours, sound + vibration, memory learning).

**`app/(tabs)/settings.tsx`** — removed the inline `Prefs` interface, `DEFAULT_PREFS`, `PREFS_KEY`, and inline `loadPrefs/savePrefs` functions (now in lib). Imports from `lib/user-prefs`. `updatePref()` still updates local React state for immediate re-render, then fire-and-forgets the write-through via `persistUpdatePref()`.

### F. Chat bar photo upload bug (commit `7b125d4`)

Surfaced during testing after Phase 2c. User taps camera icon → picker opens → user selects → nothing visible happens.

**Root cause — three combined issues:**
1. **Missing thumbnail preview.** `pendingImage` state set on photo selection but never rendered. User had zero feedback that anything happened.
2. **Send button disabled with photo-only.** Opacity check was `!input.trim()` — stayed at 30% even when pendingImage was present.
3. **Send tap blocked with photo-only.** `onTouchStart` guard was `if (input.trim())` which rejected photo-only attempts.

**Fix:**
- 64px thumbnail above chat bar pill with "Photo ready — tap send" label + small ✕ dismiss
- Opacity check: `!input.trim() && !pendingImage`
- Tap guard: `if (t.trim() || pendingImage)` — calls `send('')` when no text but photo pending. The existing `send()` guard already accepts empty text + image (line 4185 `if ((!text && !imageUri) || loading) return`).

### Locked decisions Session 21

- **SECURITY DEFINER functions calling `auth.uid()` MUST have `SET search_path = public, auth`.** Otherwise auth.uid() silently returns NULL inside the function's role context. Single biggest lesson of this whole backend pass.
- **State lib pattern is locked**: module-level cache for sync render reads + `loadX()` hydrates from profile JSONB (or table) when signed in / AsyncStorage when not + `persist()` write-through to both. Used in `lib/tour-state.ts` and `lib/user-prefs.ts`. Future state libs should follow this exact pattern.
- **Receiver-side data lookups via anon-callable SECURITY DEFINER RPCs**, not direct table queries. RLS would otherwise hide every row from anon. Token IS the secret.
- **Supabase SQL editor only shows the LAST query result** when running multiple queries together — known UX quirk. Run verification queries individually if you want all results.
- **`pg_class.relrowsecurity = true` with no policies = deny-everything** by default. Always verify both RLS-on AND policies-exist when debugging "everything's empty" symptoms.
- **For SQL backfills that need to bypass RLS during dev**: `ALTER TABLE x DISABLE ROW LEVEL SECURITY` → `UPDATE x SET ...` → `ALTER TABLE x ENABLE ROW LEVEL SECURITY`. `SET LOCAL row_security = off` does NOT work for non-postgres roles.
- **Voice (ElevenLabs) stays deferred to after Phase 2 backend pass.** Session 20 decision still holds.

### Files touched Session 21

**NEW files:**
- `supabase-auth-tables.sql`
- `supabase-data-rls.sql`
- `supabase-invites-tour.sql`
- `supabase-user-prefs.sql`
- `lib/auth.ts`
- `lib/family.ts`
- `lib/user-prefs.ts`
- `app/(auth)/sign-in.tsx`

**MODIFIED:**
- `app/_layout.tsx` — auth guard + onAuthChange listener
- `lib/supabase.ts` — AsyncStorage storage + url-polyfill + AppState refresh
- `lib/invite-state.ts` — full rewrite to use Supabase + new receiver RPC functions
- `lib/tour-state.ts` — full rewrite to use profile JSONB + AsyncStorage fallback
- `lib/zaeli-memory.ts` + `lib/notifications.ts` — DUMMY_FAMILY_ID kept as imported default-parameter fallback
- `app/invite/[token].tsx` — receiver flow uses new RPC functions
- `app/(tabs)/settings.tsx` — inline prefs removed, uses lib
- `app/(tabs)/index.tsx` — 99 getFamilyId() swaps + chat bar photo fix (thumbnail + photo-only send) + 3 view-query branches added earlier same phase
- `app/(tabs)/dashboard.tsx`, `my-space.tsx`, `family.tsx`, `kids.tsx`, `tutor.tsx`, `tutor-child.tsx`, `tutor-session.tsx`, `calendar.tsx` — getFamilyId() swaps
- `lib/tutor-summaries.ts` — getFamilyId() swaps

### What's next — Phase 2d

The remaining backend piece: **real auth wiring at invite acceptance.** Adult/kid invitees should actually create Supabase auth users, get profiles linked to the inviter's family_id, and sign in on a real second device. Modifies `handle_new_user()` trigger to detect `invite_token` in `raw_user_meta_data` and create profile linked to inviter's family_id (instead of new family). Updates `signUpFromInvite()` helper in `lib/auth.ts`. Updates `app/invite/[token].tsx` to do real signup + auto-mark invite accepted with new user id.

After Phase 2d: cross-device verification on a real second device. Then memory wiring (Phase 2f), then external integrations (Push, Stripe, deep links — Phase 3), then ship-ready cleanup (Phase 4).

---

## ══════════════════════════════════
## SESSION 22 — BACKEND PHASE 2d + MULTI-USER SAFETY (20 May 2026) ✅
## ══════════════════════════════════

Phase 2d done. Real auth at invite acceptance is wired and verified end-to-end. Six combined multi-user safety fixes surfaced during testing, plus a fresh-invitee welcome polish — all shipped in one commit.

### A. Real auth at invite acceptance (the headline)

**NEW SQL: `supabase-invite-signup.sql`** (idempotent)
- `handle_new_user()` trigger now branches on whether `raw_user_meta_data` includes an `invite_token`:
  - **No token** (original owner flow): create fresh families row + matching owner profile.
  - **With token** (NEW invitee flow): validate token (must exist, not revoked, not already accepted). Create profile linked to the INVITE's `family_id` (not a new one). Use `invite.role` as the new profile's `kind` ('adult' or 'kid'). Mark the invite_tokens row accepted with the new user's id — all in one transaction.
- Bad tokens (missing/revoked/already-accepted) raise an exception → Postgres rolls back the `auth.users` INSERT → no orphan users.
- `SET search_path = public, auth` preserved (the Phase 2a lesson lives on).

**`lib/auth.ts`** — NEW `signUpFromInvite({inviteToken, email, password, name})` helper. Wraps `supabase.auth.signUp` with `invite_token` in `raw_user_meta_data` so the trigger can branch on it. Same 250ms post-signup wait as `signUpOwner()` for trigger settle.

**`app/invite/[token].tsx`**:
- `finishAdult` now collects email + password from the form and calls `signUpFromInvite` + `loadProfile` so `getCurrentFamilyId()` resolves on the next screen. Real auth, real session.
- `finishKid` generates a synthetic email (`kid-<token>@invitees.zaeli.app`) + uses `<token>-<PIN>` as the password (Supabase requires 6+ chars; 4-digit PIN alone is too short). Kid sign-IN ergonomics for separate device use come in a later phase — they just stay signed in via AsyncStorage session persistence for now.
- `AdultAccountStep` validates email (`/^\S+@\S+\.\S+$/`) + password length (≥ 6) client-side. Continue button greys out + disabled until valid so we don't fail 3 steps later with a confusing alert.
- Signup errors wrap in user-friendly `Alert.alert` — "An account already exists with that email. Try a different one, or sign in." if duplicate, else raw message.

### B. Multi-user safety — six fixes surfaced during testing

Once we could actually switch users mid-session, six leak bugs surfaced. All fixed in the same commit:

**1. Heads-up filter is inviter-only.** Previous filter used `accepted_user_id !== currentUserId` which correctly hid the heads-up from the accepter themselves, BUT still surfaced it to other family members (e.g. GMa would see "Test3 just joined" even though she didn't send the invite). Now uses `inviter_user_id === currentUserId` — only the actual sender of the invite sees it. Added `inviter_user_id` to the `Invite` type + cache SELECT + `rowToInvite()` mapping. Plus `getProfile()?.id ?? null` resolved sync via the auth module cache. Fail-closed: returns `[]` if profile not loaded yet (no false positives during the loading race window).

**2. Chat persistence per-user.** `useChatPersistence` was keyed by channel only (`zaeli_chat_home.json`) — globally shared across all users. After auth switch, the new user would load the PREVIOUS user's chat history from disk. Fix: hook now subscribes to `supabase.auth.onAuthStateChange`, tracks `userId` state, and scopes the filename with it (`zaeli_chat_home_<userId>.json` or `_anon` for no session). When user changes, scopedKey changes, load effect re-runs, state resets to empty, new file (if any) loads.

**3. Local chat messages state in index.tsx resets on user switch.** Even with the hook fixed, the local `messages` state array in chat still held the previous user's messages. Detect via the `chatLoaded` true→false transition (signal that the persistence hook is reloading because user changed). On that transition: clear local `messages`, reset `persistenceHasLoaded.current = false`, reset `lastBriefWindowRef` + `lastBriefDateRef` so the brief re-fires fresh for the new user.

**4. tour-state + user-prefs don't fall back to AsyncStorage when signed in.** Previously: if a fresh user's `profiles.tour_state` (or `user_preferences`) was null, the lib fell back to AsyncStorage — which still held the previous user's data. Silent leak. Now: when a session exists, profile is the ONLY source of truth (even if null → start fresh with DEFAULT_STATE). AsyncStorage fallback ONLY fires when no session (pre-auth flows like kid receivers mid-onboarding). Same pattern in both libs.

**5. All module caches invalidated on auth change.** `_layout.tsx`'s `onAuthChange` listener now also calls `invalidateTourCache()` + `invalidatePrefsCache()` + `resetCache()` (invites) alongside the existing `invalidateAccount()`, on BOTH `SIGNED_IN` and `SIGNED_OUT` events. NEW `invalidateCache()` exports added to `lib/tour-state.ts` and `lib/user-prefs.ts` (the others already had them). Each lib's next `loadX()` re-hydrates from the correct profile.

**6. Fresh-invitee welcome polish.** New invitees who land in chat for the first time would see the family brief (because brief is family-scoped — they're in the family). Mid-context: "One thing: bins go out tomorrow night…" Jarring as someone's first ever Zaeli message. Fix: in chat mount effect, check `onboarding_just_completed === 'true'` AND `getProfile()?.kind !== 'owner'`. If both true: suppress `tryFireBrief`, push a warm welcome message instead — "Hey <name> 👋 Welcome in. Family stuff is already wired up — you'll get your first proper brief tomorrow morning. Until then, ask me anything." Tour offer still fires below. The flag gets cleared by `maybeFireTourOffer` so subsequent sessions show the normal family brief.

### C. Debugging insights from testing

**The "nested invites" gotcha.** During testing Richard created multiple test invites in a row. Each time, the dev row "Open latest invite as receiver" signed him in as the PREVIOUS invitee, and then when he tapped "+ Invite" again, the new invite's `inviter_user_id` was that previous invitee's user id — not Rich's. So when Rich signed back in, he didn't see heads-ups for those chained invites (correctly — he wasn't the inviter). The inviter-only filter is functioning as designed; just need to be careful in the test workflow to STAY as Rich (or whoever you want as inviter) when creating each test invite.

**Brief leak vs family brief — important distinction.** When a new family member lands in chat, the family brief firing for them is NOT a leak — it's correct. The brief is keyed by `family_id + date + window` in `zaeli_briefs`. Different users in the same family see the same brief. That's the design. The welcome polish (fix #6) is a UX layer on top — first-session invitees don't get the brief because mid-context "bins go out tomorrow" is a bad first impression. Their second session onwards, they get the brief normally.

### Locked decisions Session 22

- **Real cross-device invite works end-to-end via DB trigger.** No app-side workaround needed — the trigger atomically validates + creates profile + marks invite accepted. If the trigger raises, the auth user creation rolls back. No orphans, no partial state.
- **Kid sign-up uses synthetic email + token+PIN password.** They stay signed in via AsyncStorage session persistence. Kid sign-IN ergonomics (separate device, lost PIN recovery, etc) come in a later phase.
- **Adult signup form validates client-side** before allowing Continue. Email regex + password length 6+. Otherwise sign-up failures land 3 steps later in a confusing alert.
- **Chat persistence is per-user** by Supabase user id. The old global file (`zaeli_chat_home.json`) becomes orphaned on first new-user load — that's one-time and acceptable for dev.
- **When signed in, profile JSONB is the ONLY source of truth** for tour state + user prefs. No AsyncStorage fallback in that path. AsyncStorage stays as offline / pre-auth fallback only.
- **All module caches MUST be invalidated on auth change.** `_layout.tsx` onAuthChange is the single place this happens. Future per-user state libs (memory wiring etc) should add their `invalidateCache()` to the list.
- **Heads-up filter = inviter-only.** `inviter_user_id === currentUserId`. Other family members don't get heads-ups for invites they didn't send.
- **Fresh invitees suppress the family brief on first session.** Warm welcome message instead. Triggered by `onboarding_just_completed` flag + `profile.kind !== 'owner'`. Flag cleared by `maybeFireTourOffer` so it's one-shot.

### Files touched Session 22

**NEW:**
- `supabase-invite-signup.sql` — updated handle_new_user trigger

**MODIFIED:**
- `lib/auth.ts` — NEW signUpFromInvite() + updated docstring
- `lib/invite-state.ts` — inviter_user_id field + cache SELECT + heads-up filter (inviter-only)
- `lib/tour-state.ts` — no-AsyncStorage-fallback when signed in + NEW invalidateCache()
- `lib/user-prefs.ts` — no-AsyncStorage-fallback when signed in (already had invalidateCache)
- `lib/use-chat-persistence.ts` — per-user scopedKey via auth.onAuthStateChange subscriber
- `app/_layout.tsx` — invalidate all module caches on SIGNED_IN/SIGNED_OUT
- `app/invite/[token].tsx` — finishAdult real signup, finishKid synthetic email signup, client-side form validation, error alerts
- `app/(tabs)/index.tsx` — local messages state reset on user switch + fresh-invitee welcome polish

### What's next — Phase 2e + beyond

- **Phase 2e:** Real cross-device verification — sign up an invitee on a SECOND physical device (not via the same-device dev row) and confirm everything works.
- **Phase 2f:** Memory wiring — Settings → Memory view connected to real `family_insights` / `family_milestones` / `conversation_memory` tables.
- **Phase 3:** External integrations — Push notifications scheduled to brief times, Stripe customer portal WebView, real cross-device deep links (`zaeli.app/i/<token>`).
- **Phase 4:** Cleanup + ship-ready — Remove dev rows, LANDING_TEST_MODE=false, expo-document-picker for Our Budget CSV (EAS rebuild), share extension (EAS), GDPR / export data / privacy WebViews.

---

## ══════════════════════════════════
## SESSION 23 — MEMORY LOOP · PUSH NOTIFICATIONS · CROSS-DEVICE PREP (28 May 2026) ✅
## ══════════════════════════════════

Backend pass continued to ~85%. Three substantial pieces shipped + the Phase 2e cross-device test fully prepped.

### A. Phase 2f — Settings Memory view wired to real Supabase data (commit `8dbfb08`)

- Memory view was rendering hardcoded dummy data. Now reads real rows from `family_insights` + `family_milestones` via NEW lib fetchers.
- **NEW exports in `lib/zaeli-memory.ts`:** `fetchInsightsByCategory(familyId, 'routine'|'preference'|'pattern')`, `fetchMilestones(familyId)`, `deleteInsight(id)`, `deleteMilestone(id)`, `clearAllMemory(familyId)` (wipes insights + milestones + conversation_memory + pattern_log, returns per-table error list).
- **`settings.tsx`:** dummy state removed; fetches on view-enter (always re-fetches so new data shows up — the `!loaded` gate was a bug that cached the empty first load). Per-category empty states with friendly copy. Insight rows show "Strong pattern · noticed 6×" derived from confidence + occurrence_count. × delete = optimistic UI + DB delete. Clear-all wired to confirm dialog.
- **Lesson:** view-mount data effects should re-fetch on every entry, not gate on a `loaded` flag — otherwise the first (empty) load sticks.

### B. Phase 2f+ — COMPLETED the memory capture + recall loop (commit `83738a7`) ⭐

The big one. Phase 2f wired the *display*, but the chat never called ANY memory functions — so for real users the view would always be empty and Zaeli never actually remembered anything across conversations. This closes the loop — the core Philosophy B promise made real.

- **The gap:** `saveConversation` / `writeInsight` / `buildMemoryContext` all existed in `lib/zaeli-memory.ts` but were never invoked from `index.tsx`. And `detectAndSavePatterns` reads `pattern_log` (also never populated, since `logPatternEvent` is never called) — the wrong source for a feature whose toggle says "learn from **chats**".
- **NEW `detectInsightsFromConversations(familyId)`** in `lib/zaeli-memory.ts` — reads last 40 `conversation_memory` turns, feeds the transcript to Sonnet, extracts DURABLE facts only (recurring routines, stable preferences/allergies/commitments — never one-off events or chit-chat), writes via `writeInsight()` (which dedupes + bumps confidence). Distinct from the pattern_log-based `detectAndSavePatterns`.
- **RECALL** (`index.tsx` `buildContext`): injects `buildMemoryContext()` into the chat system prompt ("WHAT YOU'VE LEARNED ABOUT THIS FAMILY (use naturally, don't recite)") when `memoryLearningOn` is set. Zaeli now uses learned facts without being re-told.
- **CAPTURE** (`index.tsx` new `captureMemory(userText, replyText)`): saves each completed exchange to `conversation_memory`; every 6th exchange fires `detectInsightsFromConversations` in the background (fire-and-forget — it's a Sonnet call, never block UI). Gated by `memoryLearningOn`. Wired at ALL chat completion points: general chat path, tool path (with + without tool_use), calendar-confirm early-return. Skips empty-text (image-only) sends.
- **Dev row** "🧠 Run memory extraction now" in Settings → Developer triggers extraction on demand (the 6-exchange auto-trigger is too slow to test).
- **Verified end-to-end:** chatted durable facts → conversation_memory populated → ran extraction → insights appeared in Memory view → asked Zaeli a related question, she recalled without being re-told → toggling learning off stopped capture.

### C. Phase 3a — daily brief push notifications (commit `25490a9`)

- Wires morning + evening brief times from `profiles.user_preferences` into iOS local notifications (daily recurring trigger — fires even when app closed).
- **NEW in `lib/notifications.ts`:** `scheduleBriefNotifications({morningTime, eveningTime, morningOn, eveningOn})` (idempotent — cancel both by stable id then re-add whichever are on; skips silently if permission not granted), `cancelBriefNotifications()`, `debugBriefNotifications()`.
- **`_layout.tsx`:** after auth completes, request permission (one-shot) + schedule from `loadPrefs()`.
- **`settings.tsx`:** `updatePref` re-schedules whenever a brief time/toggle changes (uses fresh `next` values from the state updater — no stale closure). Two dev rows: "🔔 Fire test notification (10s)" (timeInterval — isolates delivery from daily-trigger format) + "📋 List scheduled briefs".
- **Note:** there's a pre-existing `requestNotificationPermission()` call in `app/(tabs)/_layout.tsx` that only asks. The new `_layout.tsx` one asks AND schedules. Redundant ask can be removed in Phase 4.
- **Design clarification:** notification = OS nudge at set time; in-app brief = once-per-window-per-day content. Tapping a notification when the brief already fired today does NOT duplicate it (tryFireBrief's already-fired guard). They can be out of sync (brief fires on first open within window; notification at exact time) — acceptable.

### D. Phase 2e prep — QR code for cross-device invite testing (commit `ac048d6`)

- The SMS invite link is `https://zaeli.app/i/<token>` — a Universal Link that won't work until the domain's live + apple-app-site-association hosted (Phase 3c). For testing NOW, the `zaeli://` custom scheme works (scheme already in app.json).
- **`react-native-qrcode-svg`** installed (JS over already-linked react-native-svg, no rebuild).
- **`family.tsx`:** "📷 Show QR for second device" chip on each pending invite row → Modal with a 240px QR encoding `zaeli://invite/<token>`. Anna scans with Camera → iOS offers "Open in Zaeli" → app launches at /invite/[token]. Copy link button now copies the single working `zaeli://invite/<token>` dev link (multi-line clipboard confused Notes' auto-linker; switch back to https form in Phase 3c).
- **`_layout.tsx`:** Linking debug listener logs `[link] initial URL:` / `[link] incoming URL:` so we can verify the scheme fires.
- **NEW `PHASE-2E-TEST-PLAN.md`** — full step-by-step cross-device procedure for when Anna's device is available, with failure-diagnosis table + success criteria.
- **iOS gotcha:** Safari blocks custom-scheme URLs typed in the address bar. Use Notes / Messages (auto-link the URL → tap), or the Camera-scan-QR path (the real flow).

### Spoonacular decision

- Asked about timing. **Parked until after backend pass + initial TestFlight feedback.** Meals module already does the core job (manual entry + photo upload). Spoonacular adds recipe *discovery* — a "real users will tell us if they want it" feature, not a launch-blocker. Philosophy B positioning makes recipe MANAGEMENT more central than DISCOVERY. Revisit in a Phase 5 polish round if families ask for it.

### Locked decisions Session 23

- **Memory loop is the real Philosophy B engine.** Three parts, all gated by `memoryLearningOn`: recall (buildMemoryContext → prompt), capture (saveConversation per exchange), extract (detectInsightsFromConversations every 6 exchanges, Sonnet, fire-and-forget). The "learn from chats" toggle now genuinely controls all three.
- **Insight extraction reads `conversation_memory`, NOT `pattern_log`.** `detectInsightsFromConversations` is the chat-learning engine. `detectAndSavePatterns` (pattern_log) stays unused until/unless we wire `logPatternEvent` at structured app events (deferred — not needed for v1).
- **View-mount data effects re-fetch on every entry**, never gate on a stale `loaded` flag (the Memory empty-first-load bug).
- **Brief notifications = local (expo-notifications), daily recurring trigger, scheduled from prefs.** Re-scheduled on any brief time/toggle change. Permission denial is non-fatal (briefs still fire in-app).
- **Invite link: `zaeli://` custom scheme for dev/QR today, `https://zaeli.app/i/` Universal Link for production** (Phase 3c, needs domain). QR + Camera scan is the cross-device test path until then.
- **Spoonacular parked** to post-TestFlight.

### Files touched Session 23

**NEW:**
- `PHASE-2E-TEST-PLAN.md`

**MODIFIED:**
- `lib/zaeli-memory.ts` — fetchInsightsByCategory / fetchMilestones / deleteInsight / deleteMilestone / clearAllMemory / detectInsightsFromConversations
- `lib/notifications.ts` — scheduleBriefNotifications / cancelBriefNotifications / debugBriefNotifications
- `app/_layout.tsx` — Linking debug listener + push-notification permission & scheduling on auth
- `app/(tabs)/index.tsx` — memory recall in buildContext + captureMemory + wiring at all completion points + getProfile/memory/prefs imports
- `app/(tabs)/settings.tsx` — Memory view real data + delete/clear-all handlers + 3 dev rows (test notif, list briefs, run extraction) + re-schedule on brief pref change
- `app/(tabs)/family.tsx` — QR chip + QR modal + copy-link dev-link fix
- `package.json` / `package-lock.json` — react-native-qrcode-svg

### What's next

- **Phase 2e:** real second-device test (Anna's phone) — follow PHASE-2E-TEST-PLAN.md
- **Phase 3b:** Stripe customer portal WebView (needs Stripe account + products configured)
- **Phase 3c:** Universal Links (needs zaeli.app domain live + apple-app-site-association + associatedDomains in app.json + native rebuild)
- **Phase 4:** cleanup + ship-ready (remove dev rows incl. the new memory/notif ones, remove redundant requestNotificationPermission in (tabs)/_layout.tsx, LANDING_TEST_MODE=false, expo-document-picker for Budget CSV, GDPR/export/privacy WebViews)

---

## ══════════════════════════════════
## SESSION 24 — REAL-DATA IDENTITY · FAMILY ROSTER · RECURRING EVENTS (29 May 2026) ✅
## ══════════════════════════════════

Large follow-on to Session 23. Removed launch-blocking hardcoded identity, made the family roster real + dynamic, fixed two calendar bugs, fixed a memory hallucination, and shipped full recurring events.

### A. Profile identity wired into UI (commit `f58988d`)

Two hardcoded "Rich" values that would be wrong once any adult uses the app:
- **Settings account hero** — was hardcoded "R" / "Rich de Kretser" / fixed email. Now reads the real signed-in profile (`loadProfile()` on mount): initial from name, real name, real email, kind-aware tag ("Family plan · Active" / "Adult · Family plan" / "Kid account").
- **Invite inviter name** — was `const INVITER_FIRST_NAME = 'Rich'` in both invite files. Now: inviter side (`invite/index.tsx`) derives from `getProfile()` first name; receiver side (`invite/[token].tsx`) reads `invite.inviterName`. **NEW SQL `supabase-invite-inviter-name.sql`** adds `invite_tokens.inviter_name` + returns it from the `get_invite_by_token` RPC (anon-readable). `createInvite` stores it. So if Anna sends an invite, the recipient correctly sees "Anna invited you", not "Rich".

### B. Family roster → real DB data (commit `eec133f`) ⭐

Replaced the hardcoded `FAMILY_MEMBERS = [5 members, ids '1'-'5']` arrays (duplicated across index/dashboard/calendar) with a dynamic DB-backed roster.

- **NEW `lib/family-roster.ts`** — `RosterMember { id, name, color, role, yearLevel, avatarEmoji, tutorActive }`, module cache, `loadRoster(familyId)` (limit `MAX_FAMILY_MEMBERS = 8`), `getRoster()` / `getMemberById()` / `getMemberByName()` sync reads, `invalidateRosterCache()`. `colorFor()` maps the DB's old generic colour (`#4A90D9` — every row had it) to the canonical palette by name, so colours are right even pre-migration. NEW `resolveAssigneeId(name)` (fuzzy name→UUID, replaces hardcoded NAME_TO_ID maps) + `defaultAssigneeIds()` (new-event default = signed-in user).
- **Migration approach:** the 3 big files removed the const, replaced all `FAMILY_MEMBERS` reads with `getRoster()`, and added a `setRosterVersion` bump + `loadRoster()` effect so render picks up DB rows. `_layout.tsx` invalidates the roster cache on auth change.
- **Assignee WRITE paths fixed everywhere** — chat add/update tools, calendar's own AI tools, manual-add form defaults, calendar system prompt — all resolve names → real UUIDs. Tool schemas now ask for first names, not numeric ids.
- **NEW SQL:** `supabase-family-member-colours.sql` (set the 5 rows to canonical palette), `supabase-remap-event-assignees.sql` (one-time remap of legacy '1'-'5' assignee ids on existing events → real UUIDs, JSONB-safe).
- **Key finding:** all existing `events.assignees` were empty `[]`, so zero event-migration risk. `family_members` was already seeded (UUIDs); the only data issue was the generic colour.
- **Now supports up to 8 members** + edits via Our Family (the hardcoded 5 was a real limit).

### C. Calendar inline-card date-label fix (in `eec133f`)

The confirm-after-add inline card always showed "TODAY" even for tomorrow/future events (it dumped the new event into the today bucket). Fix: `InlineData` gained `initialTab` + `dateLabelOverride`; `InlineCalendarCard` honours them; the confirm builder is now date-aware (today → today bucket; tomorrow → tomorrow tab; beyond → real-date label like "TUE 2 JUN").

### D. Memory hallucination fix (commit `7d9597b`)

After the Session 23 memory loop, Zaeli started treating background memory as scheduled events — asked to "add poppy dance", she said "Poppy's dance is already locked in" because `family_insights` held "preference · Poppy · Enjoys dance". Fix: `buildContext()`'s memory injection is now explicitly labelled **BACKGROUND KNOWLEDGE** (likes/routines/patterns), NOT the calendar; she must never claim something is "already locked in / booked / on the calendar" from memory; the LIVE DATA section is the only source of truth for what's scheduled. The insights themselves were correct — only the prompt framing needed fixing.

### E. RECURRING EVENTS (commit `c089d95`) ⭐

Zaeli can now create true recurring events from chat (she used to say the system didn't support it). Mirrors the manual form's instance-generation.

- **NEW SQL `supabase-event-repeat-group.sql`** — `events.repeat_group_id uuid` (+ index) ties a series together for precise series ops + ending detection.
- **`add_calendar_event`** gained `repeat` (`none|daily|weekdays|weekly|fortnightly|monthly`) + `repeat_days` (`["mon","tue","fri"]`). `generateRecurrenceDates()` produces a **~12-month horizon** of concrete instances (weekly 52w, daily 365, weekdays 260, fortnightly 26, monthly 12; capped 400). Each instance shares a `uuidv4` `repeat_group_id` + `repeat_rule`. **Multi-day weekly** (Mon/Tue/Fri in one request) — the manual form can't do this.
- **`update_calendar_event`** gained `update_all` — applies title/notes/assignees across EVERY instance (by group_id, fallback title+future). Fixes "add me to all of Gab's soccer" only hitting one. Date/time stay per-instance. Also now prefers a today/future instance when matching so series ops don't grab a stale past event.
- **`delete_calendar_event`** gained `delete_all` (cancel a whole series).
- **NEW `extend_recurring_event` tool** — rolls a series on another ~12 months from its current end, reusing group_id/time/assignees/repeat_rule.
- **Morning-brief "ending soon"** — `FamilyContext.endingSoonSeries`; `buildBriefContext` groups future recurring instances by repeat_group_id, flags any whose last date is within 6 weeks; the morning brief offers a one-line "want me to roll X on?" (morning only). Not testable until a series nears its end, but the detection + extend tool are wired.

### Locked decisions Session 24

- **Family roster is DB-backed + dynamic** (`lib/family-roster.ts`). NEVER reintroduce a hardcoded FAMILY_MEMBERS array. All member reads go through `getRoster()`; all assignee writes resolve names → real UUIDs via `resolveAssigneeId`; new-event default assignee = `defaultAssigneeIds()` (signed-in user). Supports up to `MAX_FAMILY_MEMBERS` (8).
- **Memory = background knowledge, calendar = source of truth.** The memory injection prompt must keep that distinction; never let a preference/routine insight be treated as a scheduled event.
- **Recurring events = generated instances** (not rule+expand-on-read), 12-month horizon, grouped by `repeat_group_id`. Series ops: `update_all` / `delete_all` / `extend_recurring_event`. Ending-soon surfaces in the morning brief only.
- **Identity comes from the profile** — Settings hero + invite inviter name read real auth data. No more hardcoded "Rich" for current-user identity (the family-member *roster* names Rich/Anna/etc. are separate seed data, now in the DB).

### Files touched Session 24

**NEW:** `lib/family-roster.ts`, `supabase-invite-inviter-name.sql`, `supabase-family-member-colours.sql`, `supabase-remap-event-assignees.sql`, `supabase-event-repeat-group.sql`

**MODIFIED:** `app/(tabs)/settings.tsx` (account hero real profile), `app/invite/index.tsx` + `app/invite/[token].tsx` (inviter name), `lib/invite-state.ts` (inviterName field), `app/(tabs)/index.tsx` (roster migration + assignee resolve + inline-card date fix + memory framing + recurring tools), `app/(tabs)/calendar.tsx` + `app/(tabs)/dashboard.tsx` (roster migration), `app/_layout.tsx` (roster cache invalidation), `lib/brief-generator.ts` (endingSoonSeries)

### Known follow-ups

- Recurring **edit-a-single-instance vs whole-series** UX is coarse (update_all is all-or-one). Fine for v1.
- The **edit-focused** inline calendar cards (not the add-confirm) could also use the date-label fix — minor.
- calendar.tsx's **own AI tools** don't do recurring (only the main chat does) — acceptable, main chat is the primary surface.
- Ending-soon brief prompt only fires when a series nears its end — can't be tested until then.

---

## ══════════════════════════════════
## SESSION 25 — UNIVERSAL LINKS LIVE · PHASE 4a · STRIPE SCAFFOLDING (1 July 2026) ✅
## ══════════════════════════════════

Multi-strand session that took the backend pass from ~85% to ~90%. The headline: **Universal Links working end-to-end on device** — tapping `https://zaeli.app/invite/<token>` in Messages opens the app straight to the receiver flow. That unblocks TestFlight / real cross-device invites without any custom-scheme workarounds.

### A. Swipe affordance (commit `ad32064`)

Small polish shipped before the big work. `app/(tabs)/swipe-world.tsx` now renders a **2-dot page indicator anchored to the header** (top: `insets.top + 10`) — coral active `#FF4545`, grey idle. A **first-run swipe hint pill** ("Swipe → for Dashboard") shows once per install then vanishes forever (AsyncStorage flag `SWIPE_HINT_KEY`). The indicator moved from the middle of the screen (killed Session 15) to the header — the middle-air position looked awkward when the chat bar wasn't beneath it. Chat home = subtle wayfinding without demanding attention.

### B. Phase 4a — safe cleanup (commit `bd4fdbb`)

The pre-launch cleanup slice that doesn't block Phase 2e testing. Six removals:

1. **`LANDING_TEST_MODE = false`** in `swipe-world.tsx`. Splash now fires only once per app session (not every render).
2. **Redundant `requestNotificationPermission()`** in `app/(tabs)/_layout.tsx` removed — Session 23 wired it in the root `_layout.tsx` where it runs after auth. Was firing twice.
3. **3 memory/notif dev rows** removed from Settings → Developer (🔔 Fire test notification / 📋 List scheduled briefs / 🧠 Run memory extraction now). Kept: 🧪 Re-do onboarding, 📨 Simulate invite accepted, 🔗 Open latest invite as receiver, ↩️ Reset to owner account — these are still needed for Phase 2e.
4. **Deleted `app/components/ZaeliFAB.tsx`** — killed Session 14 but file kept around. No references, safe to remove.
5. **Deleted `app/(tabs)/landing.tsx`** and its `Tabs.Screen` entry — old separate landing route, superseded by the in-swipe-world splash Session 14.
6. **Kept the QR chip in family.tsx** — still needed for Phase 2e on Anna's device.

### C. Phase 3b — Stripe scaffolding (commit `0398a07`)

Everything needed to wire Stripe once Richard creates the account and gets Price IDs. Cannot go live without external steps (documented in `STRIPE-SETUP.md`).

**Migrations:**
- `supabase-stripe-fields.sql` — adds five columns to `profiles`: `stripe_customer_id`, `subscription_status` (enum: trialing/active/past_due/cancelled/incomplete/null), `subscription_plan`, `subscription_renews_at`, `trial_ends_at`.

**Lib:**
- `lib/stripe.ts` — `getSubscription()` reads the profile fields, `subscriptionLabel()` renders "Family plan · Active" style, `fetchCustomerPortalUrl()` currently returns `null` (stub). Wires up once the Edge Function is live.
- `lib/auth.ts` — `Profile` type extended with the 5 Stripe fields.

**Settings integration** (`app/(tabs)/settings.tsx`) — Subscription card reads real data via `getSubscription()`. "Manage subscription" button calls `fetchCustomerPortalUrl()` + opens in WebBrowser. Friendly placeholder alert if endpoint isn't ready yet ("Manage subscription is coming soon — Stripe integration is being wired up.").

**Edge Functions (Deno)** — deploy scripts ready, code committed but not deployed (waiting on Stripe secrets):
- `supabase/functions/stripe-portal/index.ts` — verifies JWT, looks up `stripe_customer_id`, creates `billingPortal.sessions`, returns `{ url }`.
- `supabase/functions/stripe-webhook/index.ts` — verifies Stripe signature via `constructEventAsync`, handles `customer.subscription.*` + `invoice.payment_failed` + `customer.created`, updates profile fields accordingly. Deploy with `--no-verify-jwt` (Stripe uses signature auth).
- `supabase/functions/README.md` — full deploy sequence with curl + Stripe CLI test recipes.

**`STRIPE-SETUP.md`** — step-by-step for the external activation (account creation with Australia country, pk_test/sk_test keys, Family Plan A$9.99 + Tutor Add-on A$7.99 products both tax-inclusive, Customer Portal config with return URL `zaeli://settings`, webhook endpoint registration). Estimated 25 min once Richard sits down.

### D. Phase 3c — Universal Links wiring (same commit `0398a07`)

Two code changes + one path rename:

1. **`app.json`** — added `"associatedDomains": ["applinks:zaeli.app"]` to the iOS section. Requires a native rebuild (EAS) to take effect — this is the biggest cost of the wire-up.
2. **Invite path swap** — `lib/invite-state.ts` `INVITE_LINK_BASE` changed from `zaeli.app/i/` to `zaeli.app/invite/`. The receiver route is `/invite/[token]` in Expo Router, so the URL path must match for the app to auto-route on Universal Link tap. Web fallback pages match the same path.
3. **`app/(tabs)/family.tsx`** — Copy Link button + Resend share now use `https://zaeli.app/invite/<token>` (production Universal Link) instead of `zaeli://invite/<token>` (dev scheme). Real cross-device path.

### E. Team ID (commit `b0d8dc1`)

Filled in Richard's Apple Team ID `V37VPTPKQ8` across:
- `well-known/apple-app-site-association` in the deploy template
- `UNIVERSAL-LINKS-SETUP.md` documentation

Team ID is grabbed from Apple Developer → Membership Details in the browser (the native app was blocked; browser worked immediately).

### F. Deploy template (commit `2a32cac`)

`zaeli-app-links-template/` folder scaffolded in the repo — ready to become its own GitHub repo (`zaeli-app-links`) for Netlify auto-deploy. Contents:

- **`public/.well-known/apple-app-site-association`** — AASA file with real Team ID + `com.zaeli.app` bundle ID + `/invite/*` component match.
- **`public/index.html`** — landing page at `zaeli.app/` — palette orbs (peach/mint/lavender/sky) + INK wordmark with sky `a+i` + "Less **chaos**. More family." tagline + "Learn more →" CTA linking to `zaeli.ai` (marketing site, parked). Matches app aesthetic.
- **`public/invite/index.html`** — browser fallback at `zaeli.app/invite/<anything>` for someone who taps a link on a non-iOS device or before installing. Peach + mint orbs, "You've been invited 🏡", App Store CTA (placeholder App ID).
- **`netlify.toml`** — `publish = "public"` + **CRITICAL** `Content-Type: application/json` header for the AASA path (Netlify's default `application/octet-stream` breaks Universal Links).
- **`README.md`** — quick verify with `curl -I` for the maintainer.

### G. INFRASTRUCTURE — Cloudflare + Netlify + Let's Encrypt (external, this session)

The parts that don't sit in the git repo but are now live:

- **`zaeli-app-links` GitHub repo** created (deploy source, auto-deploys on push to main).
- **Netlify site** at `zaeli-app-links.netlify.app` connected to the GitHub repo. Build: `publish = "public"`, no build command needed (pure static).
- **Cloudflare DNS** for `zaeli.app`:
  - Apex: `zaeli.app` → CNAME `apex-loadbalancer.netlify.com` (CNAME flattening, grey cloud DNS-only)
  - www: `www.zaeli.app` → CNAME `zaeli-app-links.netlify.app` (grey cloud DNS-only)
  - **Grey cloud is deliberate** — Cloudflare's orange-cloud proxy can rewrite Content-Type headers on extension-less files, which breaks the AASA fetch. Later once verified, orange cloud can be turned on with a specific Cloudflare Rule keeping the AASA path unproxied.
- **Let's Encrypt SSL** provisioned by Netlify covering `zaeli.app` + `www.zaeli.app`, auto-renews before 29 Sep 2026.
- **Cloudflare Email Routing** enabled on `zaeli.ai` (separate domain for the marketing site). `hello@zaeli.ai` forwards to `richarddekretser@gmail.com`. MX + TXT records auto-added by Cloudflare's onboarding flow. Free tier, unlimited forwards.

**Verification** — `curl -I https://zaeli.app/.well-known/apple-app-site-association` returns `HTTP/2 200` + `content-type: application/json`. AASA lives.

### H. First EAS Build for iOS (external, this session)

Richard's first ever EAS Build. Trigger: dev-client with the new `associatedDomains` entitlement needed to be rebuilt (associatedDomains is a native entitlement, not something Metro can hot-reload).

- Cloud build via `eas build --platform ios --profile development` on `eas.dev`.
- Authenticated with Apple Developer credentials — **regular password + 2FA code** (not an App-Specific Password — Fastlane/EAS uses the Developer API which accepts regular credentials with 2FA).
- Build completed, install link generated. Installing on iPhone updated the existing app (same bundle ID `com.zaeli.app`) — did NOT create a duplicate app icon.
- Session persistence survived the reinstall (AsyncStorage kept the auth session), so the app auto-logged in.

**Test path:** Richard tapped an invite link in Messages → app opened directly to the invite receiver welcome screen showing "Hey Universal…" (the invitee name). No Safari intermediary, no scheme prompt. First try. Working.

### Locked decisions Session 25

- **Universal Links = production path.** `zaeli://` custom scheme is now DEV-ONLY. Invite links generated by the app use `https://zaeli.app/invite/<token>`. Copy-link + Resend share both use the https form.
- **Cloudflare grey cloud (DNS-only) for AASA** — orange-cloud proxy can rewrite Content-Type on extension-less files, which is silently fatal for Universal Links. When enabling proxy later, add a Rule to bypass proxy on `/.well-known/apple-app-site-association`.
- **AASA MUST be served with `Content-Type: application/json`.** Netlify's default `application/octet-stream` for extension-less files fails silently — Apple's iOS parser rejects and Universal Links never activate. `netlify.toml` `[[headers]]` block is mandatory.
- **Native entitlement changes = new EAS build.** `associatedDomains` (and any other native entitlement / capability) can't be hot-reloaded by Metro. Every entitlement change → `eas build`.
- **EAS authenticates with regular Apple ID password + 2FA**, NOT an App-Specific Password. Fastlane uses the Developer API which expects regular credentials.
- **Same bundle ID = update-in-place on iOS.** New EAS build with `com.zaeli.app` overwrites the previous dev-client without creating a duplicate app icon. Session state survives.
- **Team ID `V37VPTPKQ8`** captured in AASA + documentation. If it ever changes (app transfer, new dev account), the AASA needs updating + the app needs rebuilding.
- **Stripe scaffolding is done, activation is Richard's move.** Code + SQL + Edge Functions committed. Cannot ship without external account setup (Stripe dashboard: products + Portal config + Price IDs + Webhook endpoint registration). `STRIPE-SETUP.md` has the full path — ~25 min.
- **Voice (ElevenLabs) still deferred to after full backend pass + TestFlight.** Session 20 decision unchanged.

### Files touched Session 25

**NEW:**
- `supabase-stripe-fields.sql`
- `lib/stripe.ts`
- `supabase/functions/stripe-portal/index.ts`
- `supabase/functions/stripe-webhook/index.ts`
- `supabase/functions/README.md`
- `STRIPE-SETUP.md`
- `UNIVERSAL-LINKS-SETUP.md`
- `zaeli-app-links-template/` (full folder — AASA, index.html, invite/index.html, netlify.toml, README.md)

**MODIFIED:**
- `app.json` — added `associatedDomains: ["applinks:zaeli.app"]`
- `lib/auth.ts` — Profile type + 5 Stripe fields
- `lib/invite-state.ts` — `INVITE_LINK_BASE` swapped `/i/` → `/invite/`
- `app/(tabs)/family.tsx` — Copy Link + Resend use production https URL
- `app/(tabs)/settings.tsx` — Subscription card real data + Manage subscription handler
- `app/(tabs)/swipe-world.tsx` — anchored 2-dot page indicator + first-run swipe hint, `LANDING_TEST_MODE = false`
- `app/(tabs)/_layout.tsx` — redundant `requestNotificationPermission` removed
- `app/(tabs)/settings.tsx` — 3 memory/notif dev rows removed

**DELETED:**
- `app/components/ZaeliFAB.tsx`
- `app/(tabs)/landing.tsx` (+ its `Tabs.Screen` entry)

### What's next

- **Phase 2e — Anna's phone.** QR + Universal Link both wired. `PHASE-2E-TEST-PLAN.md` walks the path. Waiting on Anna's device availability.
- **Phase 3b Stripe activation** — Richard's ~25 min setup at `stripe.com/register`. Once Price IDs are in hand: deploy Edge Functions (`supabase functions deploy`), set `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` secrets, register webhook in Stripe dashboard, fill in `PRICE_TO_PLAN` map in `lib/stripe.ts`, replace `fetchCustomerPortalUrl` stub with real fetch.
- **TestFlight submission** (for Anna, then broader dogfood): `eas build --profile preview` (standalone, no Metro dependency) → `eas submit --platform ios` → TestFlight review (usually same-day) → Anna installs via TestFlight app.
- **Phase 4b** (post-Anna): remove the 4 remaining dev rows (Re-do onboarding, Simulate invite accepted, Open latest invite as receiver, Reset to owner account), remove the QR chip, expo-document-picker for Budget CSV, GDPR / export data / privacy WebViews.
- **zaeli.ai marketing site** — parked. `hello@zaeli.ai` already routes. Pricing page + landing content when the Stripe path is live.

---

## ══════════════════════════════════
## SESSION 26 — BRIEF QUALITY DEEP-DIVE · PRICING PIVOT (1 July 2026, late evening) ✅
## ══════════════════════════════════

Same-day continuation of Session 25 that turned into a substantial body of work. Six commits — brief system fine-tune, table backfill, and a strategic pricing decision.

### A. Brief v1 — competence-first prompt (commit `18f38d5`)

Richard noticed he'd stopped reading briefs because they kept nagging about dinner even when he had it handled off-app. **The bug is a classic AI-product failure mode**: the assistant treats "no data" as "user is behind" — an empty `meal_plans` row becomes "Nothing planned for dinner," and every brief becomes a data-entry chase. Opposite of the winning mantra.

Four targeted changes to the Sonnet prompt in `lib/brief-generator.ts`:
- `TONIGHT MEAL` context line reframed: "not planned yet" (reads as problem) → "no meal_plan row (may be handled off-app — do NOT nudge)".
- NEW `COMPETENCE FIRST` rule block: explicit list of banned nudge phrases ("Nothing planned for dinner", "You haven't added...", "Time to plan the week"), default assumption that Rich has empty fields handled off-app.
- Sparse-day chip examples cleaned up — dropped "Plan tomorrow's dinner", replaced with genuinely warm moves ("Add a note", "Chat with me"). Explicit ban on data-entry chips.
- "One thing" paragraph made OPTIONAL in both morning + evening blocks. Only fires when there's a genuine nudge tied to real data. If nothing warrants a nudge, the paragraph is dropped entirely. Explicit good-vs-bad examples inline.

### B. zaeli_briefs table backfill + RLS fix (commit `be2fc90`)

Trying to `DELETE FROM zaeli_briefs` returned `ERROR 42P01: relation does not exist`. **The table had never been created in Richard's dev DB.** Which means every brief since Session 16 has been a fresh Sonnet call with a silent upsert failure — no caching at all. The migration file (`supabase-zaeli-briefs.sql`) also predated Session 21's real RLS, using a `USING (true)` allow-all policy that would've been a security hole once real users signed up.

Fixed the migration to the Session 21 standard (family-scoped SELECT/INSERT/UPDATE/DELETE via `public.current_family_id()`) then Richard ran it. Table live, RLS wired, caching finally working.

### C. Brief v2 — invisible-domain rule (commit `5e19e54`) ⭐

V1 stopped the body opening with "Nothing planned for dinner" but Sonnet **compensated by pushing the dinner nudge into the One Thing + primary chip** ("dinner's still unplanned" / "Plan tonight's dinner"). My explicit bans on those phrases didn't stick — the model's helpful-assistant training bias found wiggle room.

Root cause: even with `TONIGHT MEAL: no meal_plan row (do NOT nudge)`, I was still signalling that dinner EXISTS as a domain and is empty. That's an invitation for a "helpful" AI to fill the void. Real fix: **don't tell Sonnet the domain exists at all when it's empty.**

Changes in `lib/brief-generator.ts`:
- `formatContext` only includes populated domains. If `TONIGHT MEAL` is null → line is omitted entirely. Same for `OPEN TASKS`, `TODAY EVENTS`, `TOMORROW EVENTS`. `SHOPPING` replaced with `SHOPPING FLAGGED` — only appears when flagged items exist.
- New `── LIVE DATA ──` fence around populated domains in the context; closing `REMINDER` line reiterates the rule.
- New ABSOLUTE `INVISIBLE-DOMAIN RULE` at top of common prompt: if a domain isn't in LIVE DATA, it does NOT appear in opener / body / one thing / chip.
- Strengthened banned-phrase list ("Dinner's still unplanned", "A quick decision now saves the 6pm scramble").
- New explicit `BANNED CHIP LABELS` block: no chip starting with "Plan" / "Add" / "Sort" unless the label names a concrete item present in LIVE DATA.

**Verified working**: fresh 10:47pm brief was "Wednesday's done, Rich — and the bins are already out 🌙" + body about tomorrow's real events (soccer at 2pm, morning run) + soft one-thing tied to soccer + primary chip "Which kid has soccer?" (clarifying question, not a data-entry nudge). No dinner mention anywhere.

### D. Pricing pivot — A$9.99 family / A$7.99 tutor per child, inc GST (commit `3220703`) ⭐

Strategic reduction from A$14.99 / A$9.99. Driven by real conversations with prospective users — the old pricing was a barrier in the current Australian economy. Sub-A$10 base plan changes the conversion conversation. Tutor at A$7.99 keeps the biggest revenue lever affordable for multi-kid families (family with 3 kids on Tutor = A$23.97/mo, more than 2x the base plan — that math is what makes the base reduction sustainable).

**Production surfaces updated**: sign-up fineprint (`app/(auth)/sign-in.tsx`), onboarding Ready step (`app/onboarding/index.tsx`), Tutor upsell + status rows in Family screen (`app/(tabs)/family.tsx`), Tutor lock upsell (`app/(tabs)/tutor.tsx`), Tour stop 7 (Tutor HERO) price line (`lib/tour-state.ts`).

**Docs synced**: CLAUDE.md Business section, ZAELI-PRODUCT.md pitch + revenue line + Tour section, STRIPE-SETUP.md new prices **plus critical tax-inclusive setup note** (Stripe AU adds 10% GST on top by default — must set price behaviour to "Inclusive" or customer gets charged A$10.99 / A$8.79), new-chat-handover.md Session 25 narrative + What's NEXT + Tour stop.

**Cost implication**: API cost was ~10% of A$14.99 revenue, now ~15% of A$9.99. Still healthy. Any new feature that materially increases per-family API cost should be evaluated against the A$9.99 anchor, not the old A$14.99.

### E. 3-hour bucket refresh (commit `ab90557`) ⭐

Richard opened Chat at 10:30pm and was still seeing a brief written at 5:33pm — "get bins out after dinner" reading absurd once bedtime was close and bins were already out. **The evening window is 13 hours wide** (16:00–04:59), and neither `shouldFireBrief` nor `data_signature` captured how far time had moved within it.

Fix: coarse 3-hour bucket in the signature + gate the persistence-restore path on bucket match.

`lib/brief-firing.ts`:
- New `currentBucket(now)` helper: `Math.floor(now.getHours() / 3)`.

`lib/brief-generator.ts`:
- `FamilyContext` gains optional `hourBucket: number`.
- `computeSignature` includes bucket. Bucket shift = cache miss = Sonnet regenerates with fresh time-of-day framing.

`app/(tabs)/index.tsx`:
- `buildBriefContext` sets `hourBucket: getCurrentBucket()`.
- Persistence-restore of `lastBriefWindowRef` only carries the "already fired" signal forward if the persisted brief's bucket matches now. Stale bucket → refs stay null → `shouldFireBrief` fires fresh on next mount.

**Cost**: at ~A$0.008 / brief with prompt caching, worst case adds A$0.03-0.05/family/day on top of the 2/day baseline. Comfortable at A$9.99 revenue.

### F. Auto-dismiss earlier same-window briefs on refire (commit `93c7065`)

After the bucket refresh worked, the old 5:33pm brief was still visible in the chat feed alongside the fresh 10:47pm one — with its stale "Plan tonight's dinner" chip still tappable. Two sets of competing chips, old set pushing bad nudges.

Fix in `tryFireBrief`'s placeholder-swap step: in addition to filling the placeholder with the real Sonnet response, walk `messages` and set `briefDismissed=true` on any other same-window brief that isn't already dismissed. Text stays as chat history; chip row hides. Uses the same `briefDismissed` mechanism the manual dismiss chip already uses (Session 17), so render path is unchanged.

### Locked decisions Session 26

- **Empty state signal is fragile — remove the signal, not just add a "don't nudge" rule.** Sonnet's helpful-assistant training bias fights explicit bans. If a domain is empty, the domain shouldn't appear in the AI's context at all. This is the invisible-domain pattern — applicable to any future AI-generated content surface.
- **Pricing: A$9.99 family / A$7.99 tutor per child, both inc GST** (locked Session 26). Sub-A$10 anchor. Stripe products must be set as tax-inclusive (default behaviour adds 10% on top in AU). See [[project-pricing-decision]] memory.
- **3-hour bucket in brief signature** — briefs stay time-of-day-current within wide windows. 4-5 buckets per window × 2 windows = at most 8-10 briefs/family/day worst case. Bucket size chosen for balance: shorter = more Sonnet calls, longer = staleness returns.
- **Same-window brief auto-dismiss** — when a new brief fires, previous same-window briefs' chips hide but text stays as history. Old chips would push stale nudges; text stays as truthful record of what Zaeli said at 5pm vs 10pm.
- **Cache tables with SECURITY DEFINER-scoped RLS must depend on the helper being created first.** `supabase-zaeli-briefs.sql` was written Session 16 with a legacy `USING (true)` policy — updating it to the Session 21 `current_family_id()` pattern before running was necessary. Any future family-scoped cache table needs the same pattern.
- **Silent upsert failure is a real risk.** Session 16's migration was never run in dev DB — briefs ran uncached from Session 16 through Session 25 with `zaeli_briefs` upsert failing silently. Always verify migrations landed. Consider adding a startup check that surfaces missing tables to Metro logs.

### Files touched Session 26

**NEW:**
- `.claude/projects/C--Users-richa-zaeli/memory/project-pricing-decision.md`

**MODIFIED:**
- `lib/brief-generator.ts` — v1 + v2 prompt changes, `formatContext` filters empty domains, `computeSignature` includes bucket, `FamilyContext.hourBucket` optional
- `lib/brief-firing.ts` — `currentBucket(now)` helper
- `app/(tabs)/index.tsx` — persistence-restore bucket gate, `hourBucket` in `buildBriefContext`, auto-dismiss in `tryFireBrief` placeholder swap, `currentBucket` import
- `supabase-zaeli-briefs.sql` — legacy allow-all policy replaced with Session 21 family-scoped SELECT/INSERT/UPDATE/DELETE
- `app/(auth)/sign-in.tsx`, `app/onboarding/index.tsx`, `app/(tabs)/family.tsx`, `app/(tabs)/tutor.tsx`, `lib/tour-state.ts` — pricing updated to A$9.99 / A$7.99
- `CLAUDE.md`, `ZAELI-PRODUCT.md`, `STRIPE-SETUP.md`, `new-chat-handover.md` — pricing sweep + tax-inclusive setup note

### What's next (unchanged from Session 25)

- Phase 2e — Anna's phone
- Phase 3b Stripe activation (external, ~25 min)
- TestFlight submission (`eas build --profile preview`)
- Phase 4b post-Anna cleanup

Nothing to do with the brief system tonight — v2 + bucket refresh + auto-dismiss are working well. Watch for a few days; if any nag pattern re-emerges we'd escalate to memory-driven back-off (fix #2 from the original diagnosis).

---

## ══════════════════════════════════
## SESSION 27 — APP ICON · EAS PREVIEW INFRASTRUCTURE · BRIEF POLISH (2 July 2026, early hours) ✅
## ══════════════════════════════════

Continuation of Session 26's late-evening work that ran into the early morning. Two headline deliverables: **app icon shipped** and **first working iOS preview build**. Also cleared up brief-system bugs that were still lurking after Session 26's dedup fix.

### A. App icon designed + shipped

Icon needed for TestFlight — Apple requires a proper 1024×1024 asset before you can submit. Approach was to mockup options rather than commissioning a designer.

**Design mockup**: `zaeli-icon-options.html` — 6 options across 2 themes (letterform + sparkle) rendered at three sizes each (1024/152/60) plus a fake iPhone home-screen strip showing how the recommended option lands next to Messages / Safari / Mail / Notes.

**Themes:**
- Theme 2 (wordmark fragment): 2A `za` clean, 2B `za` + orbs, 2C `z` + sparkle corner
- Theme 3 (sparkle motif): 3A sky ✦, 3B coral ✦, 3C multi-orb + `z`

**Pick: 2B (za + orbs)** — instantly recognisable to anyone who's seen the wordmark (sky-blue `a` is the strongest identity move), plus the peach/mint/lavender orbs echo the splash design. Distinctive against the gradient icons everyone else uses.

**Generator tool**: `zaeli-icon-generator.html` — browser-based Canvas renderer that draws the exact design at 1024 and 2048, then triggers a PNG download. No third-party tools, no SVG-to-PNG conversion, no font path conversion. Uses `ctx.letterSpacing` + measured widths to position `z` and `a` glyphs pixel-perfectly. Also renders a home-screen preview for context.

**Assets shipped:**
- `assets/images/icon.png` (1024×1024, opaque, no alpha, warm bg — Apple requires all three)
- `assets/images/splash-icon.png` (2048×2048, same design)
- `app.json` already pointed to these paths (Expo defaults), so no config change

### B. EAS preview build unblocked

**First attempt**: `eas build --platform ios --profile preview` completed, install link generated, install-in-place on iPhone (same bundle ID `com.zaeli.app` = update the existing app). Native splash + icon rendered fine. Then **crashed immediately** as JS bundle started.

**Diagnosis** (via crash pattern "splash briefly shows → crash"): the crash happened after native boot but before RN could render, meaning JS-side. `eas.json` had no environment variables configured. EAS cloud builds don't inherit the local `.env` file — they only see what's set in EAS Secrets / Environment Variables. So `EXPO_PUBLIC_SUPABASE_URL` etc. were `undefined` at boot, `createClient(undefined, undefined)` in `lib/supabase.ts` threw immediately on module load, whole JS bundle failed.

**Fix**: added 4 env vars via the expo.dev web UI → Environment Variables:
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_ANTHROPIC_API_KEY`
- `EXPO_PUBLIC_OPENAI_API_KEY`

All scoped to Preview + Production environments.

**Important gotcha**: Expo refuses to let you mark `EXPO_PUBLIC_*` variables as "Secret" visibility. Message: *"Variables prefixed with EXPO_PUBLIC_ can't have Secret visibility."* Correct reason: these variables get **baked into the JavaScript bundle at build time** — anyone who inspects the app can read them. So Expo won't let you lie by calling them secret.

**Pick "Sensitive" instead** (middle option). Values hidden in EAS UI but still bundled into the app. Both `Plain text` and `Sensitive` bake into the bundle the same way; the difference is only about who can see them in the EAS dashboard.

**Result**: second preview build (with env vars) boots cleanly. Universal Links working. Chat loads. Everything functional.

### C. Security implication — Phase 5 note

`EXPO_PUBLIC_*` variables live in the compiled app. A determined user can extract the Anthropic + OpenAI keys from the app bundle and use them on Richard's bill. This is the same category of risk that exists in every "direct API call from mobile" pattern.

**Fine for TestFlight dogfooding** with people Richard trusts (Anna, tester friends). **Not fine for public App Store launch.**

**Phase 5 work (deferred)**: route Anthropic + OpenAI calls through Supabase Edge Functions (same pattern as the Stripe portal Edge Function already scaffolded). Keys live server-side, JWT-authenticated. Client never sees them.

Supabase URL + anon key are safe to bundle either way — anon key is designed to be client-side, security enforced by Row Level Security (which has been the pattern since Phase 2a).

### D. Brief bucket-check bug (real fix)

Session 26 added a bucket-check to the persistence-restore path that gated "already fired" ref restoration on `sameBucket`. Idea: if the persisted brief's bucket matches now, mark as fired; if not, allow fresh fire. This was the bug: `last.ts` is a display string (`"9:31 pm"`), not an ISO timestamp. `new Date("9:31 pm")` returns Invalid Date. The `try/catch` swallowed the failure silently. `persistedBucket` stayed `null`, `sameBucket` was always `false`, refs were never restored → every kill+reopen fired a fresh Sonnet brief.

Diagnostic logging (`[brief-restore]`) surfaced the problem in one round: log showed `persistedBucket: null` when it should have been 7 (bucket 7 = 21:00-23:59).

**Fix**: parse the millis timestamp from the message id (`brief-<win>-<YYYY-MM-DD>-<millis>`). tryFireBrief already constructs the id with `Date.now()`, so the info is right there. Regex `/-(\d{13})$/` captures the trailing 13-digit millis, then `new Date(persistedMs).getHours() / 3` gives the bucket.

Commit `e78efa3`. Verified working via same diagnostic logging.

### E. Brief dedup on restore — the ACTUAL cause of the "brief re-firing"

After the bucket fix, logs still showed `fire: false, reason: "already-fired-this-window"` — i.e., no new briefs generated. But the chat feed still showed multiple briefs stacked. Log revealed `briefOnlyCount: 7` — the persistence file had accumulated **7 briefs** from tonight's iterations (v1 prompt tests, v2 prompt tests, bucket refresh tests, auto-dismiss tests). Each iteration left behind a persisted brief that never got dismissed.

**Fix**: on persistence restore, from the today+current-window brief set, keep only the LATEST (highest millis in id). Older briefs in the same window are stale time-of-day content. Setting `messages` to just the latest also means the save effect writes back a clean single-brief array, so accumulation is self-healing across future cycles.

Commit `ac04038`. Post-fix: feed shows exactly one brief per window per day. Kill+reopen keeps it clean.

### F. Splash — Option C (first install ever + time windows)

Richard was expecting splash to fire at any time, but Session 15 locked splash to 6-9am / 12-2pm / 5-8pm windows only. That's correct behaviour for a daily-use app (splash is a "moment", not every-open friction) BUT on a fresh install, a first-time user should meet Zaeli's brand before hitting Chat cold.

**Fix**: AsyncStorage flag `splash_first_install_seen_v1`. If unset, splash fires regardless of time + flag is set. Subsequent launches respect the original time windows.

Commit `ac04038` (same as dedup). Both flowed together.

### G. Cosmetic flashes (dev-client-specific, deferred)

After all the above shipped, Richard reported two visual glitches on kill+reopen:

1. Brief flash of "old stacked briefs" before the feed rendered cleanly — most likely the persistence file save-debounce (500ms in `useChatPersistence`) hadn't fired before a rapid swipe-kill, so the file still held the pre-dedup state. First cold-open reads it, dedup runs, saves clean state. Should self-resolve after 2-3 clean cycles.
2. "Flat bright blue page" flash — likely dev-client Metro bundle-fetching artifact. Standalone preview/production builds have the bundle baked in and boot straight into the app. Not reproducible outside dev-client.

**Both deferred to verify in a fresh preview build the next day.** If they persist in the standalone build, they're real; if they vanish, they were dev-client artifacts. No code change tonight.

### Locked decisions Session 27

- **App icon = 2B "za + orbs"** — sky-blue `a` fragment of the wordmark + peach/mint/lavender orbs on warm bg. Never plain letterform or dark background — the warm-bg + sky-blue-`a` combination IS the brand identity moment.
- **Icon exports**: 1024×1024 for `icon.png`, 2048×2048 for `splash-icon.png`. Opaque. No alpha. No rounded corners (iOS applies its own mask). No gradients. Flat warm bg `#FAF8F5`. Any redesign must follow the same rules.
- **`EXPO_PUBLIC_*` env vars go in EAS Environment Variables as "Sensitive"** — Expo blocks "Secret" for `EXPO_PUBLIC_*` because they bake into the bundle. Sensitive hides them in the EAS UI but still bundles them. All 4 (SUPABASE URL + ANON, ANTHROPIC, OPENAI) required for standalone builds to boot.
- **Anthropic + OpenAI keys are extractable from the client bundle** — acceptable for TestFlight dogfood, NOT for public launch. Phase 5 must migrate these calls to Supabase Edge Functions.
- **Brief bucket-check must parse from message id, NEVER from `ts`** — the `ts` field is a locale-formatted display string. Millis are in the id's trailing 13 digits.
- **Brief dedup on restore keeps only the LATEST brief per window** — older briefs in the same window are stale time-of-day content. Self-healing via save effect.
- **Splash Option C** — first install ever fires splash regardless of time (AsyncStorage flag), then respects 6-9am / 12-2pm / 5-8pm windows. Do NOT change to "fire every open" — that gets annoying fast.
- **Dev-client rendering artifacts don't predict standalone behaviour** — Metro bundle-fetch flashes, hot-reload glitches, and other dev-client oddities are NOT reliable signals for production UX. Always verify cosmetic concerns in a standalone preview build.

### Files touched Session 27

**NEW:**
- `zaeli-icon-options.html` — 6-option design mockup
- `zaeli-icon-generator.html` — browser-based Canvas PNG generator
- `assets/images/icon.png` — 1024×1024 exported (overwrote Expo placeholder)
- `assets/images/splash-icon.png` — 2048×2048 exported (overwrote Expo placeholder)

**MODIFIED:**
- `app/(tabs)/index.tsx` — bucket-check id parsing (Session 26 bug fix) + dedup-on-restore + diagnostic logging added-then-removed
- `app/(tabs)/swipe-world.tsx` — splash Option C (first-install AsyncStorage override)

**EAS DASHBOARD (not in git):**
- 4 environment variables added: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_ANTHROPIC_API_KEY`, `EXPO_PUBLIC_OPENAI_API_KEY` (all Sensitive visibility, scoped to Preview + Production)

### What's next

- **Fresh preview build** to verify the two cosmetic flashes are dev-client artifacts (very likely) — `eas build --platform ios --profile preview`.
- **Phase 2e Anna's phone** — Universal Link path is production-ready.
- **Phase 3b Stripe activation** — ~25 min external (products, Portal, Price IDs, webhook).
- **Phase 4b TestFlight submission** — `eas submit --platform ios` after preview build passes verification.
- **Phase 5 (BEFORE PUBLIC LAUNCH — new addition)**: migrate Anthropic + OpenAI API calls to Supabase Edge Functions. Keys must not live in the compiled app bundle for public distribution.

---

## ══════════════════════════════════
## SESSION 28 — STRIPE END-TO-END + CALENDAR PHANTOM FIX + SPLASH SAGA (10 July 2026) ✅
## ══════════════════════════════════

Big multi-strand session. Three headline pieces of work plus polish:

### A. Stripe Phase 3b — proven live in sandbox ⭐

The external activation Richard was queuing since Session 25 finally happened. Full walkthrough tracked in-conversation. Everything wired end-to-end.

**External work Richard did:**
- Created Stripe sandbox account (Australia)
- Went with **"I'll do it"** on the "Who should handle global sales?" question (not Managed Payments — the 3.5% add-on doesn't make sense for AU-only, and Stripe Tax + Radar cover the same ground for free-standard)
- Stripe Tax activation deferred (sandbox doesn't need it; pre-launch chore for automated AU GST reporting)
- Two products created with **tax-inclusive** pricing:
  - `Zaeli Family Plan` — A$9.99/month recurring, price_id `price_1Tp3x30kUsgPd6wFSSOUucBW`
  - `Zaeli Tutor Add-on (per child)` — A$7.99/month recurring, price_id `price_1Tp3xn0kUsgPd6wF7zonHLyo`
- Customer Portal configured — default return URL `https://zaeli.app` (Stripe dashboard rejects `zaeli://` custom scheme; needs http(s))

**Supabase CLI + Edge Functions:**
- `npm install -g supabase` + `supabase login` + `supabase link --project-ref rsvbzakyyrftezthlhtd`
- `supabase secrets set STRIPE_SECRET_KEY=sk_test_...` — sandbox secret key
- `supabase functions deploy stripe-portal` — deployed cleanly
- `supabase functions deploy stripe-webhook --no-verify-jwt` — deployed (the `--no-verify-jwt` flag is required because Stripe uses signature auth, not JWT)
- Webhook endpoint registered in Stripe: `https://rsvbzakyyrftezthlhtd.supabase.co/functions/v1/stripe-webhook` subscribed to `customer.subscription.created/updated/deleted`, `invoice.payment_succeeded/failed`, `customer.created`
- `supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...` — the signing secret from Stripe

**Smoke test that proved the loop:**
- Created a test customer in Stripe (initially without metadata — learning moment: the `customer.created` webhook fires but can't link back to Supabase profile without `supabase_user_id` metadata)
- Manually pasted `stripe_customer_id` into the profile row via Supabase Table Editor
- Then added metadata `supabase_user_id: <richard's UID>` to the Stripe customer for future events
- Attached subscription with test card `4242 4242 4242 4242`
- **Timing gotcha**: Stripe fires `customer.subscription.created` immediately on subscription attach. If this fires BEFORE the profile has `stripe_customer_id` set, the webhook's `.eq('stripe_customer_id', customerId)` matches zero rows and silently does nothing. Fix: **resend the event from Stripe Dashboard → Developers → Events → find the event → Resend button.** Once profile is linked, the resend syncs correctly.

**Bug found + fixed during testing (commit `5f0f622`):** `subscription_renews_at` stayed NULL after the sync. Stripe moved `current_period_end` from the Subscription object to individual line items around API 2024-06-20. Fix in `syncSubscription`: read `sub.current_period_end` first (backwards compat), fall back to `sub.items.data[0].current_period_end`. Redeployed webhook, resent event, `subscription_renews_at` populated with `2026-08-10T01:13:42+00`.

**Client wiring (commit `0a250f3`, done just before external activation):**
- `supabase/functions/stripe-webhook/index.ts` — PRICE_TO_PLAN map populated with real sandbox Price IDs
- `supabase/functions/stripe-portal/index.ts` — RETURN_URL default swapped from `zaeli://settings` to `https://zaeli.app` (matches what dashboard-level config accepts)
- `lib/stripe.ts` — added `STRIPE_PRICE_FAMILY` + `STRIPE_PRICE_TUTOR` exported constants for future checkout wiring; replaced `fetchCustomerPortalUrl` stub with real fetch against the Edge Function (JWT auth via `session.access_token`)

**End-to-end verified on device (with fresh preview build carrying commit `0a250f3`+):**
- Settings → Subscription card shows `Family · Active · next bill 10 Aug` (was "Free trial" before)
- Tap Manage subscription → real Stripe Customer Portal opens in Safari showing the active Zaeli Family Plan A$9.99/month, next bill Aug 10, Visa •••• 4242 payment method, Cancel subscription button available
- Full loop proven both directions (Stripe → Supabase profile via webhook, and Supabase → Stripe portal via Edge Function)

### B. Calendar phantom-event bug ⭐ (commit `b5a06fa`)

Richard shared 5 screenshots from a session the previous night showing a real UX bug: Zaeli confidently said "Added Duke's Soccer Carnival for Saturday 18 July..." — but nothing was actually in the DB. Repeat pattern for 3 attempts. On the 4th, the row finally landed.

Diagnosis from reading `executeTool` in `app/(tabs)/index.tsx:1618-1685`:
- `add_calendar_event` was doing `await supabase.from('events').insert(row)` and checking `if (error) return TOOL_FAILED`
- BUT Supabase can return `{ error: null, data: null }` when RLS silently blocks the INSERT (WITH CHECK evaluated at runtime — if `current_family_id()` momentarily returns null due to auth resolving to wrong family_id in a race, no error, no row, no signal)
- Tool returned `"✅ added"` in this case. Zaeli then correctly reported success to the user based on tool_result. Zaeli wasn't lying — the tool was.

Fix:
- Use `.insert(row).select('id').maybeSingle()` — pulls the inserted row's ID back if the write actually landed
- Check `data?.id` after the insert. If null, treat as `TOOL_FAILED` with an honest error message ("write didn't take — permissions or family context issue")
- Same treatment for the recurring batch case at line 1673 (uses `.select('id')` and counts returned rows)
- Added diagnostic logging: `[calendar-add]` with input params, `[calendar-add] assignee resolution` with roster snapshot + requested names + resolved IDs, `[calendar-add] inserted OK: <id>` on success, or the specific error on failure

**Verified working**: Richard tested next weekend event added cleanly on first try after the fix. The diagnostic logs are still in place for any future reproduction.

### C. Splash blue flash — five attempts, mostly fixed, parked

Session 27 shipped the icon and preview build. During testing, Richard captured two screenshots: a warm-bg splash with the "za + orbs" icon (correct — Expo splash from plugin), then a bright blue frame with the icon showing through (unexpected). Order: warm → blue → app.

Five fix attempts today:
1. **`df9e445` — top-level `splash` config in app.json** — added alongside the existing plugin config, to update the iOS LaunchScreen storyboard. Native fingerprint changed on next build (confirming the config was picked up), but blue persisted.
2. **`c10ae4c` — Fabric Stack wrapper + contentStyle** — wrapped Stack in a warm-bg View + added `contentStyle: { backgroundColor: '#FAF8F5' }` to Stack.screenOptions. Theory: newArchEnabled (Fabric) renders react-native-screens' default background as system blue rather than transparent. Didn't help.
3. **`2553c3e` — explicit `ios.splash` block + dark variants** — added platform-specific splash config with explicit `dark.backgroundColor`. Belt-and-suspenders. Didn't help.
4. **`1b5fa48` — expo-system-ui plugin** — added the plugin with `backgroundColor: #FAF8F5` + called `SystemUI.setBackgroundColorAsync('#FAF8F5')` at module load. Theory: raw iOS UIWindow color peeking through during RN boot handoff. Didn't help.
5. **`ba638a4` — onLayout-gated hideAsync + fade** ⭐ — the actual mostly-fix. Changed from "hide splash the moment auth resolves" to "hide splash when the root View's onLayout fires" (meaning the tree is laid out and about to paint, not just when the JS state check passed). Plus added `SplashScreen.setOptions({ fade: true, duration: 300 })` for a smoother transition. **Reduced the flash from clearly visible (~500ms) to barely visible (<100ms flicker).**

Full elimination would require inspecting the actual generated `SplashScreen.storyboard` XML on iOS to see what color is baked in. That requires running `expo prebuild --platform ios --clean` in Linux (Windows can't generate iOS files locally). WSL setup would fix that — parked as a follow-up for when the cosmetic flicker becomes annoying enough to justify the diagnostic effort.

### D. Small polish

**MoreSheet Settings icon (`3ea23d4`):** the gear icon at the bottom-right of the More sheet had subtle clipping at the tile edge — strokes at the cog teeth extremes were touching the viewBox="0 0 24 24" edges and stroke width 1.7 pushed half the stroke outside. Fix: expand viewBox to `-1 -1 26 26` for 1 unit padding on each side. Icon renders at same visual size, no clipping.

**Stripe email automation** (deferred): Stripe handles transactional emails automatically (payment receipts, cancellation confirmations, failed payment notifications). Product-side "Welcome to Zaeli" emails are a separate concern — will be a Supabase Edge Function triggered on `auth.users` insert, built when we have real onboarded users.

### Locked decisions Session 28

- **Supabase INSERT with `.select('id').maybeSingle()`** — always verify the write actually landed. Silent RLS blocks return `{ error: null, data: null }` and were the root cause of the calendar phantom-event bug. Apply this pattern anywhere silent failure would mislead the user.
- **Stripe API newer versions moved `current_period_end` to items level.** Always read subscription-level first (backwards compat), fall back to `sub.items.data[0].current_period_end`. Same principle applies to any other Stripe field that gets migrated across API versions.
- **Stripe Customer Portal default return URL requires http(s), NOT custom schemes.** Use `https://zaeli.app` for now. A polished return-to-app page (auto-redirect to `zaeli://settings`) is a pre-launch chore for a Netlify `/return` route.
- **Stripe customer metadata (`supabase_user_id`) MUST be set at customer creation** for the webhook to auto-link. If added later, manually paste `stripe_customer_id` into the profile row (Table Editor → paste → save).
- **Stripe webhook events fire in real-time.** If your profile isn't set up when the event arrives, the sync silently matches 0 rows. Fix: **Resend event from Stripe Dashboard → Developers → Events → Resend button.** Idempotent and safe.
- **Splash blue flash reduction requires timing fix, not colour fix.** All the config-level attempts to override colours failed. The actual near-fix was gating `SplashScreen.hideAsync()` on root View's `onLayout` — waiting for the tree to actually paint before dropping the splash. Documenting this pattern so future splash issues start with timing before colour.
- **Email automation is Stripe's job for transactional (receipts, cancellations, failures).** Product-side welcome emails are ours to build when we have real users.

### Files touched Session 28

**MODIFIED:**
- `app.json` — top-level splash config + ios.splash + expo-system-ui plugin (multiple commits during flash saga)
- `app/_layout.tsx` — Fabric Stack wrapper, SystemUI init, SplashScreen.setOptions + onLayout gate
- `app/(tabs)/index.tsx` — calendar `add_calendar_event` verified-insert fix + diagnostic logging (single insert + recurring batch)
- `app/components/MoreSheet.tsx` — IcoSettings viewBox expanded to `-1 -1 26 26`
- `lib/stripe.ts` — real `fetchCustomerPortalUrl` implementation + `STRIPE_PRICE_FAMILY` + `STRIPE_PRICE_TUTOR` exports
- `supabase/functions/stripe-portal/index.ts` — RETURN_URL default swap
- `supabase/functions/stripe-webhook/index.ts` — PRICE_TO_PLAN map populated + `current_period_end` items-level fallback

**EXTERNAL (not in git — one-time activation, documented for reproducibility):**
- Stripe sandbox account (Australia)
- Two Stripe products with Price IDs recorded in `PRICE_TO_PLAN`
- Customer Portal config (return URL `https://zaeli.app`)
- Webhook endpoint registered (6 events subscribed)
- Supabase secrets: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- One test customer + subscription (delete when done sandbox testing)

### What's next (unchanged priorities)

- **Checkout flow** — currently users have no path to become a Stripe customer from within the app. Options: (a) Stripe Payment Link (no code, hosted page — fastest for TestFlight), (b) Stripe Checkout via WebBrowser (still hosted, more control), (c) custom Payment Sheet (most code, best UX). Recommend (a) for beta.
- **Phase 2e Anna's phone** — Universal Link path ready.
- **Phase 4b TestFlight submission** — production build + `eas submit --platform ios`.
- **Phase 5 API keys server-side migration** — Anthropic + OpenAI to Supabase Edge Functions before public launch.
- **Splash flash full elimination** — WSL setup + storyboard inspection. Deferred until it bothers real users.
- **Product-side welcome email** — Supabase Edge Function on `auth.users` insert, deferred until real users.
- **Stripe Tax activation** — pre-launch chore for automated AU GST reporting.
- **Live-mode Stripe** — repeat product/portal setup in live mode before public launch.

---

## ══════════════════════════════════
## SESSION 29 — ANNA BETA ROUND 1 + API COST FIX + MEAL PLANNER PIVOT (13 July 2026) ✅
## ══════════════════════════════════

Anna beta is running. Feedback landed as a substantial iteration: Tutor accuracy fixes, chat context corrections, receipt UX overhaul, Dashboard reshuffle, onboarding gate, brief personalisation, plus a real-money API cost fix and a strategic meal-planner pivot. Five commits landed and three more sit in the working tree.

### A. Anna beta round 1 (commit `92a35d4`)

Anna surfaced six issues across a weekend of use. All fixed in one commit.

**Tutor math accuracy — three-layer defence** ([app/(tabs)/tutor-session.tsx](app/(tabs)/tutor-session.tsx)):
- Gab did 84÷7 and said "12" — Zaeli said "correct". Then 15×24 → "360" → "correct". Classic sycophancy pattern where the model is more likely to agree than double-check its own arithmetic. Three layers of defence:
  1. **Anti-sycophancy rules** added to the tutor system prompt — explicit "verify the answer yourself before agreeing" + "if the user's answer is wrong, tell them warmly and let them try again"
  2. **Hidden `<expected>N</expected>` marker** — Sonnet is instructed to emit the correct answer inside this marker after every question. Rendered invisible to the user (stripped by the display layer).
  3. **`lastExpectedAnswer` state** — extracted per turn, injected as `LAST_EXPECTED_ANSWER: N` into the system prompt on the next call. Sonnet now has ground truth from its own previous turn rather than re-computing.
- Belt-and-braces. Rules alone fight the training bias; marker alone can drift; state injection alone doesn't cover freshly-generated questions. Three layers together = accuracy.

**Pantry "yesterday" bug** ([app/(tabs)/index.tsx](app/(tabs)/index.tsx) `fmtLastBought`):
- Item bought at 6pm today displayed as "yesterday" three hours later. Root cause: `Math.round(msDiff / (24*60*60*1000))` — sub-24h differences rounded up to 1 = "yesterday".
- Fix: normalise BOTH dates to midnight local before diffing. Now compares day-buckets, not raw millis. "today" until midnight, "yesterday" from midnight onwards.

**Pantry context injection**:
- Anna said "we have maple syrup" and Zaeli said "not in your pantry" — but it WAS in her pantry. `buildContext` wasn't reading pantry rows.
- Fix: pantry query added to `buildContext`, top ~40 items formatted into a "PANTRY" line block. New PANTRY RULES prompt block ("check pantry before saying we don't have X"). Zaeli stops fabricating absence.

**Multi-photo receipt scan + in-sheet UX**:
- Anna scanned a Coles receipt that spanned 3 photos; had to scan each one separately, each one navigated her out of Shopping into Chat, disorienting.
- Fix in `scanFromSheet`: `allowsMultipleSelection: true` (up to 4 photos), all photos batched into ONE Sonnet call with an updated prompt that expects multi-page aggregation ("this is a multi-page receipt — combine all pages before extracting"). Response format unchanged.
- UX: no more `router.navigate('/(tabs)')` after scan starts. New state `shopScanBusy` + `shopScanBusyLabel` drives an in-sheet progress banner ("Reading page 2 of 3…"). New state `shopScanResult` drives a post-scan toast ("Added 12 items, updated 3 pantry entries"). User stays inside Shopping the whole time.

**Dashboard reshuffle** ([app/(tabs)/dashboard.tsx](app/(tabs)/dashboard.tsx)):
- Old order: Calendar, Meal Planner, Bento, Shopping, On the Radar. Meals second slot was aspirational — Anna said "I never plan meals in advance so this card is mostly noise up top".
- New order: **Calendar → Shopping → Bento (Weather + Zaeli Noticed) → On the Radar → Meal Planner**. Reflects the honest priority order: calendar is glance-frequency #1, shopping second most used, meals bottom because least frequently used in a busy family.

**Welcome copy**:
- "Welcome In" felt to Anna like a truncated phrase ("welcome in what?"). Simplified to "Welcome!" — pure warm greeting, no ambiguity.

### B. Onboarding gate + sign-in polish (commits `c02bba0`, `15529b8`, `916f2ab`)

Three small commits that clean up the pre-chat user experience.

**Owner onboarding gate** ([app/_layout.tsx](app/_layout.tsx), commit `c02bba0`):
- New route guard checks `AsyncStorage.getItem('onboarding_complete')` for OWNER accounts (kind === 'owner'). If unset → `router.replace('/onboarding')`.
- Adult/kid invitees skip this — they have their own inline onboarding via `/invite/[token]`.
- **Grandfather clause**: profiles where `created_at` is >24h old auto-stamp the `onboarding_complete` flag on load. Rich (pre-gate signup) doesn't get bounced to onboarding on his next open.
- Fixes the previous state where a fresh owner signup landed straight in an empty chat with no context.

**Dynamic user name in briefs** ([lib/brief-generator.ts](lib/brief-generator.ts), part of commit `c02bba0`):
- Brief prompts hardcoded "Rich" in 7 spots ("helping Rich today", "Rich has it handled", "Rich runs a family", "Makes Rich feel capable", "Morning Rich" example, "Solid Thursday, Rich" example, and one more in the winning mantra section).
- Fix: `buildBriefContext` reads `getProfile()?.name?.split(/\s+/)[0]` as `primaryUser` (first name only). `buildSystemPrompt` templates `${primaryUser}` at every hardcoded spot.
- **Cache invalidation gotcha**: `computeSignature` now includes `primaryUser` so cached briefs don't leak names across users in the same family. Consequence: 2-adult family = ~240 briefs/month cache calls (was 120 for cache-shared). Documented under Session 29 investigations — real fix at scale is per-user brief cache (unique constraint change on `zaeli_briefs`).

**Sign-in default flip** (commit `15529b8`):
- `app/(auth)/sign-in.tsx` default mode changed from `'sign-in'` to `'sign-up'`. Reasoning: at this stage of the product, new users vastly outnumber returning users on the sign-in screen. Force-clicking "Create account" every time was friction for the majority.
- Sub copy genericized to work for both modes without switching per state.

**Stripe alert cleared** (commit `916f2ab`):
- Settings → Manage subscription button previously fired a friendly "Coming soon — Stripe integration is being wired up" alert. Session 28 wired Stripe end-to-end; the alert was now lying.
- Alert removed. Button opens the real Stripe Customer Portal via `fetchCustomerPortalUrl()`.

### C. API cost fix — negative-cost bug + Sonnet caching on chat (commit `0b65420`) ⭐

Big cost win. Two coupled bugs that were silently costing real money on Anna's beta.

**Negative-cost bug** ([lib/api-logger.ts:172](lib/api-logger.ts)):
- Cost formula was `input_tokens - cache_read - cache_write` treating the three fields as overlapping. They are **disjoint** — Anthropic's API already returns `input_tokens` as the UNCACHED portion. Subtracting made the number negative on cached turns, breaking every downstream chart in the admin console.
- Fix: just sum. `total_uncached_input * priceInput + cache_read * priceCacheRead + cache_write * priceCacheWrite + output * priceOutput`.

**Pricing corrections and additions**:
- Haiku 4.5 was in the PRICING table at $0.25 / $1.25 per M tokens. Correct number is $1.00 / $5.00 — my table was 4× too low. Ripple effect: any cost calc that used Haiku pricing was undercounting by 4×.
- Added Sonnet 5 ($3/$15 with $2/$10 intro through Aug 2026) and Opus 4.8 ($5/$25) to PRICING for future migrations. Intro pricing on Sonnet 5 means it's actually CHEAPER per token than Sonnet 4.6 until Aug 2026.

**Prompt caching on Sonnet tool-calling path** ([app/(tabs)/index.tsx](app/(tabs)/index.tsx) `send()`):
- Sonnet was called on the tool-calling path in `send()` (calendar tools, view queries with cards, etc.) with NO caching. Chat used Sonnet for the initial + follow-up call. Real cost was uncached input on every message.
- Fix: added `cache_control: { type: 'ephemeral' }` to the system-prompt block on BOTH the initial call AND the follow-up call, plus the `anthropic-beta: prompt-caching-2024-07-31` header. Also **NEWLY LOGS the follow-up call** which was previously unlogged — real chat cost was 2× what api_logs showed.
- Cache-aware cost math applied on both call sites.

**Expected impact**:
- home_chat cost drops from A$0.02-0.04/call (uncached) to A$0.005-0.01/call (cached repeat turns) — 60-80% reduction on turn 2+.
- At real family usage (~250 chats/mo per Anna's data): A$3.30 → ~A$0.50/family/mo.
- Difference between loss-making and 60% margin at A$9.99 revenue.

### D. Stripe beta grant infrastructure

Anna's beta needs Tutor unlocked without her paying for the add-on. Rather than paper over it with a hardcoded flag, built a real beta-grant path so future beta grants work the same way.

- **NEW `profiles.beta_end_date` column** — nullable timestamp. When set + `NOW() < beta_end_date`, family is in beta.
- **`lib/stripe.ts`** — `getSubscription()` now checks beta_end_date. If beta is active, returns `{ status: 'active', plan: 'family' }` regardless of actual Stripe state. New helper `isFamilyInBeta()` — sync read from profile.
- **`lib/family-roster.ts`** — when `isFamilyInBeta()` is true, kids get `tutor_active: true` in the roster override. Otherwise falls through to their real DB value.
- **TutorSidebar** — uses `isFamilyInBeta()` to unlock the "child locked" tile so Anna can pick any kid without paying.
- **Design**: beta doesn't create fake Stripe state (no phantom subscriptions). It's a parallel truthful signal. When beta ends, the profile's real Stripe state takes over cleanly.

### E. Meal planner pivot (working tree, not yet committed) ⭐

Anna feedback distilled: "I open the meal planner, see 'nothing planned', feel bad, close it." Same category of problem as the Session 26 brief "downer" pattern. Real families don't plan dinner in advance — they cook what's on hand from a small rotation. **Recipes + regulars is where the value lives.** Planning is where the friction lives.

**Dashboard DinnerCard**:
- Label "MEAL PLANNER" → "TONIGHT'S MEALS" (focus on tonight, not on the future)
- Empty-state CTA "Plan it →" → "See family regulars →" (invites recognition, not commitment)
- Bottom button "Open Meal Planner →" → "Recipes & regulars →"

**Meal sheet tab reorder**:
- Old order: Meals · Recipes · Favourites (planning first, browsing second)
- New order: **Recipes · Regulars · Plan** (browsing first, planning last-and-optional). Sheet defaults to Recipes on open.
- Label changes: "Favourites" → "Regulars" (acknowledges busy-family reality — favourites sounds aspirational, regulars sounds honest), "Meals" → "Plan".
- Internal state keys unchanged for backwards compat (still `activeMealTab: 'meals' | 'recipes' | 'favourites'`) — only the display label + order changed.

**Family regulars in chat LIVE DATA**:
- `buildContext` now queries `recipes` WHERE `'favourite'` IN tags → adds a "Family regulars" line to LIVE DATA with 12 hearted recipes (name + prep_mins).
- New MEAL IDEAS RULES prompt block: when asked "quick dinner?" / "what's for dinner?" / "any ideas?" → reach for Family regulars FIRST, cross-check pantry to filter to what's actually doable tonight, never nudge to plan.
- `dinnerRule` softened: if no meal planned, "Do NOT nudge to plan. If asked for ideas, suggest from Family regulars first."

**Design rationale**:
- Recipes + regulars is a repeated-value surface (the same 12 meals will be relevant to the same family every week for years). Planning is a one-shot surface (needed only when someone wants a specific new decision).
- Weighting the app around the repeated surface reduces the empty-state problem to zero — Recipes tab always has content, Regulars tab always has content.

### F. Calendar bulk-paste max_tokens bump (working tree, not yet committed)

Anna pasted a school newsletter with 10 events on 8 July at 7:48pm. Nine landed. The 10th ("Last day of school term - 18 Sept") never appeared in the DB under any variant title.

**Diagnosis** (via api_logs query):
- The 7:48pm home_chat call showed `output_tokens: 800` — **exactly the max_tokens ceiling** for that path.
- Each `add_calendar_event` tool_use block is ~80 output tokens (JSON schema for date/title/assignees/etc).
- 10 events × 80 tokens + preamble ≈ 800 tokens.
- Sonnet was truncated mid-way through the 10th `add_calendar_event` block. Truncated tool_use block was malformed JSON. Client parser silently dropped the malformed block. It never became a DB insert.
- Zaeli reported "Added 9 events" (correctly — that's what the tool results said) but the user thought 10 was the goal.

**Fix** ([app/(tabs)/index.tsx](app/(tabs)/index.tsx)):
- Initial call `max_tokens: 800` → `2000`.
- Follow-up call `max_tokens: 500` → `1500`.
- Zero cost impact unless Sonnet actually uses the extra ceiling (output tokens are metered only when emitted).
- Now handles up to ~20 events in one paste without truncation.

### G. Admin console Session 29 refresh

The admin console at [app/(tabs)/zaeli-admin/index.html](app/(tabs)/zaeli-admin/index.html) had drifted badly. Multiple issues surfaced at once.

**Source-of-truth moved from Downloads to the repo**:
- Prior sessions edited a Downloads copy that got moved/deleted. The Downloads copy today is the original untouched file — my earlier edits are gone. Going forward, source of truth is INSIDE the repo (`app/(tabs)/zaeli-admin/index.html`) and edits to Downloads are ignored.

**Visual + model fixes**:
- Wordmark accent yellow → sky blue `#A8D8F0` (matches app identity)
- Setup banner Sonnet model ID `claude-sonnet-4-20250514` → `claude-sonnet-4-6`
- Price sliders default: A$9.99 family / A$7.99 tutor (was 14.99 / 9.99). Slider ID rename `sl-hw-price` → `sl-tutor-price`. Variable `hwPrice` → `tutorPrice`.

**Cost model corrections**:
- `COST_BRIEF` constant `0.00065` → `0.0050` (reflects Sonnet, was assuming GPT briefs when we were actually running Sonnet — the same underlying gap that Session 26's zaeli_briefs table backfill exposed)
- **Break-even card replaced with per-family margin card** — old math was nonsense ("2 families for A$0.26 margin" made no sense at A$9.99 revenue). Per-family margin is the metric that actually matters during beta.
- Slider defaults reset to Anna's real usage from api_logs: briefs 420 → 240 (2-adult family × bucket refresh reality), chat 300 → 250, scans 90 → 15.

**Real subscription state in Accounts table**:
- Was showing hardcoded "Trial" pill for every account. Now queries `profiles.beta_end_date` + `subscription_status` → renders correctly as "Beta · ends 15 Oct", "Family · Active", "Past due", etc.
- Owner name + email + member count added.

**Memory system health card** (Usage view):
- Queries `family_insights` + `family_milestones` + `conversation_memory` counts per family.
- Warning banner if `conversation_memory > 0` but `family_insights = 0` — surfaces the case where chats are being captured but the extraction Sonnet call is failing silently.

**Feature badge fixes**:
- Colour maps + labels updated with tutor_practice, tutor_session, tutor_vision, zaeli_chat (grouped by product surface).
- Cost breakdown labels: Chat "GPT-5.4 mini" → "GPT-5.4 mini + Sonnet 4.6 for tool calls" (chat has TWO paths). Briefs "GPT-5.4 mini" → "Sonnet 4.6, prompt caching". Homework → Tutor.

**Double-$ display bug fix**:
- All `A$$${...}` template literal patterns → `A$${...}` — 13 rows across the Financial Model tab. The extra `$` was rendering as a literal dollar sign next to the number.

**SQL snippet in Settings**:
- Ready-to-copy SQL for enabling anon SELECT policies (with a security caveat that anon SELECT is a broad grant, only for internal admin console use).

### H. Session 29 investigations

Verified in this session:
- **home_chat runs on BOTH models** — Sonnet on the tool-calling path (calendar tools, view-query cards) via `callSonnet` and GPT-5.4 mini on the general chat path via `callGPT`. CLAUDE.md was right for pure-chat model routing but home_chat log entries are a mix. Cost breakdown labels in admin console updated to reflect this.
- **Brief cache invalidates between family members** — with `primaryUser` in the signature, Rich and Anna get separate cache entries. For a 2-adult family: ~240 briefs/month cache calls (not 120). Fix at scale: per-user brief cache with unique constraint change on `zaeli_briefs`. Queued for post-100-families.
- **Sonnet 4.6 → Sonnet 5 migration path** — intro pricing $2/$10 through Aug 2026 makes Sonnet 5 CHEAPER than Sonnet 4.6 today. Better instruction following would compound today's anti-sycophancy fixes. Queued for after Anna beta settles (don't migrate during active user testing).
- **Rejected GPT-5.4 mini for briefs** — persona quality matters most here, and Sonnet with prompt caching is now CHEAPER than GPT-mini on input ($0.30/M cache read vs GPT $0.75/M). No reason to downshift.

### Locked decisions Session 29

- **Meal planner pivot: recipes-first + regulars-in-context is the design.** Plan tab kept for the ~5% of families who plan. Never revert to planning-first — Anna's beta feedback is the anchor.
- **Family regulars = recipes with `'favourite'` tag** — injected into chat LIVE DATA via `buildContext` (top ~12). Zaeli reaches for regulars FIRST on any "what's for dinner?" query. MEAL IDEAS RULES prompt block enforces.
- **`max_tokens` ceiling for bulk operations**: 2000 initial, 1500 follow-up. Prevents multi-event paste from cutting off mid-block. Zero cost unless actually consumed.
- **Sonnet stays on briefs** — persona quality trumps small cost delta now that caching is applied. Do NOT switch briefs to GPT-mini.
- **Admin console lives at `app/(tabs)/zaeli-admin/index.html`** — NOT Downloads. Source of truth is INSIDE the repo. Downloads copy will always drift.
- **Beta grants use `profiles.beta_end_date`, NEVER phantom Stripe state.** `getSubscription()` returns the beta signal transparently; when beta ends, real Stripe state takes over cleanly. No cleanup dance.
- **Investment order**: (1) polish Anna's beta iteration, (2) migrate to Sonnet 5, (3) per-user brief cache when scaling past 100 families.
- **Per-family margin is the metric to watch during beta**, not break-even. Break-even math is nonsense at small user counts.
- **Anti-sycophancy = three layers** (prompt rules + hidden marker + ground-truth injection). Any future accuracy-sensitive AI surface (tutor, memory extraction, factual chat) should follow the same defence pattern — training bias fights any single-layer fix.
- **Cost math with prompt caching**: input_tokens is ALREADY the uncached portion; cache_read + cache_write are separate. Sum, don't subtract. Any future logger touching Anthropic's usage fields must respect the disjoint-fields rule.
- **Onboarding gate + grandfather clause** — new owner accounts route to onboarding via AsyncStorage flag. Profiles >24h old auto-stamp the flag to avoid bouncing pre-gate users. Adult/kid invitees skip entirely (they have inline onboarding).
- **Dynamic user name in briefs** — always template `${primaryUser}` from `getProfile()?.name?.split(/\s+/)[0]`. Never hardcode "Rich" (or any name) in AI-facing prompts. `computeSignature` MUST include `primaryUser` so cached briefs don't leak names across users.
- **Pantry data in chat context is mandatory** — Zaeli must never say "not in pantry" for items that ARE in pantry. PANTRY RULES prompt block enforces the check.
- **Multi-photo receipt scan = ONE Sonnet call, up to 4 photos.** Multi-page aggregation prompt asks Sonnet to combine before extracting. Response format unchanged.
- **In-sheet scan UX** — receipt/pantry scans never navigate the user out of Shopping. Progress banner + result toast keep them where they are.

### Files touched Session 29

**MODIFIED (committed):**
- `app/(tabs)/tutor-session.tsx` — anti-sycophancy rules + `<expected>` marker + `lastExpectedAnswer` state + LAST_EXPECTED_ANSWER injection (commit `92a35d4`)
- `app/(tabs)/index.tsx` — pantry `fmtLastBought` midnight normalise, pantry context injection + PANTRY RULES prompt block, `scanFromSheet` multi-photo + in-sheet progress/result state, `send()` Sonnet caching (initial + follow-up + newly logged follow-up + anthropic-beta header + cache-aware cost math), calendar bulk-paste max_tokens 800→2000/500→1500 (working tree — uncommitted), meal planner pivot (working tree — uncommitted) (commit `92a35d4` + `0b65420` + working tree)
- `app/(tabs)/dashboard.tsx` — card reshuffle Calendar→Shopping→Bento→Radar→Meals, DinnerCard label + CTA changes (commit `92a35d4` + working tree)
- `app/(tabs)/settings.tsx` — Stripe "Coming soon" alert removed on Manage subscription (commit `916f2ab`)
- `app/(auth)/sign-in.tsx` — default mode 'sign-in' → 'sign-up', generic sub copy (commit `15529b8`)
- `app/_layout.tsx` — owner onboarding gate + grandfather clause (commit `c02bba0`)
- `lib/brief-generator.ts` — dynamic `${primaryUser}` template (7 spots), computeSignature includes primaryUser (commit `c02bba0`)
- `lib/api-logger.ts` — negative-cost bug fix (input_tokens is already uncached), Haiku 4.5 pricing correction $0.25/$1.25 → $1.00/$5.00, Sonnet 5 + Opus 4.8 pricing added (commit `0b65420`)
- `lib/stripe.ts` — `getSubscription` beta override + `isFamilyInBeta` helper
- `lib/family-roster.ts` — beta override so kids get `tutor_active: true` while family in beta
- `app/(tabs)/tutor.tsx` — TutorSidebar uses `isFamilyInBeta` to unlock locked children
- `app/(tabs)/zaeli-admin/index.html` — comprehensive refresh (wordmark colour, model IDs, price sliders, COST_BRIEF, per-family margin card, real subscription state in Accounts, memory health card, cost breakdown labels, double-$ display bug fix, slider defaults, SQL snippet for anon SELECT)

**NEW SQL (external, applied to dev DB):**
- `profiles.beta_end_date` column added (nullable timestamp)

### What's next

- **Build #15 holding** — meal pivot + max_tokens bump + already-committed API cost fix + calendar phantom bundled up, but sitting on the working tree until more Anna feedback arrives. Last free build this month; want to spend it well.
- **Sonnet 5 migration** — queued for after Anna beta settles. Intro pricing makes it cheaper than 4.6. Better instruction following would compound today's accuracy fixes.
- **Per-user brief cache** — DB migration queued for scale past 100 families. Current family-scoped cache means each family member triggers a new cache miss.
- **Multi-photo chat upload** — still deferred (would benefit from the same multi-photo pattern used in receipt scan).
- **ElevenLabs voice** — still deferred to after backend pass polish.
- **Phase 5 API keys server-side** — Anthropic + OpenAI to Supabase Edge Functions before public launch. Unchanged from Session 27.
- **Live-mode Stripe + Stripe Tax activation** — pre-launch chores, unchanged.

---

## ══════════════════════════════════
## SESSION 30 — FAMILY PUSH + MULTI-PHOTO CHAT + TRIVIA GUARD + SPLASH FIX + PLUGIN DISCOVERY (14 July 2026) ✅
## ══════════════════════════════════

Five commits pushed. Headline: family push notification infrastructure shipped end-to-end (with a critical discovery about a missing Expo plugin that had been silently breaking it), multi-photo chat upload delivered (matching Session 29's receipt-scan pattern), Kids Trivia answer-in-question guard fixed Anna feedback, and a cold-start splash latency fix that cuts ~2s off foreground return. Substantial infrastructure round on top of a stalled iteration cycle — EAS free tier hit mid-session, Rich upgraded to Starter plan.

### A. Family push notification infrastructure (commit `8bbf7e3`) ⭐

The headline Session 30 build. Full push infra shipped: someone can now say "tell Anna soccer's moved to Sunday" in chat and Anna gets a real push notification on her phone.

**NEW SQL: `supabase-push-tokens.sql`**
- Adds `profiles.expo_push_token TEXT` column (nullable, indexed).
- No new RLS needed — profiles already has the right policies. Client can only read/write its own profile row.

**NEW Edge Function: `supabase/functions/family-notify/index.ts`**
- JWT-verified via `Authorization: Bearer <session.access_token>` header.
- Enforces family boundary: sender's `family_id` MUST match every recipient's `family_id` — otherwise 403. No cross-family push leakage even if the client sends malformed UIDs.
- Reads recipient `expo_push_token` values from `profiles`, batches to Expo push API (`https://exp.host/--/api/v2/push/send`), returns per-token result array.
- Silent-skips recipients with no token (invitees who never registered).
- Deploy: `supabase functions deploy family-notify` (no `--no-verify-jwt` — this ONE uses JWT).

**`lib/notifications.ts` additions:**
- `registerPushToken()` — calls `getExpoPushTokenAsync({ projectId })` + upserts to `profiles.expo_push_token`. Wraps in try/catch, logs failure.
- `unregisterPushToken()` — nulls out the profile column on sign-out.
- `notifyFamily({ userIds, title, body, data })` — calls the Edge Function with JWT.
- `debugPushToken()` — added later (commit `dcb263b`), returns structured diagnostic state.

**`app/_layout.tsx` wiring:**
- After auth completes, fire-and-forget `registerPushToken()`. Initially wrapped in `.catch(() => {})` — silent (fix in commit `6eab45a` below).

**`app/(tabs)/index.tsx` chat integration:**
- Calendar confirm inline cards gained a **Notify** chip that offers to push the new event to selected family members ("Want me to let Anna know?").
- NEW `send_family_message` tool — Sonnet can call it with `{ recipientNames: string[], title, body }`. Fuzzy name matching via `resolveAssigneeId` roster helper. Shortcuts: "family" or "everyone" expands to all family members except the sender.
- CAPABILITY_RULES updated so Zaeli knows when to reach for it ("if user asks to tell/notify/let someone know...").

### B. Spend Processing overlay (part of commit `8bbf7e3`)

Follow-on to Session 29's in-sheet scan UX. When a receipt scan is running, Shopping Spend tab now shows a **full-screen dark-backdrop overlay** with `ActivityIndicator` + "Processing..." + status label ("Reading receipt", "Updating pantry", "Saving to spend"). Silent on success — the receipt just appears in the list. Errors surface via `Alert.alert`. No more silent multi-second wait during scan.

### C. Tutor Play icon removed (part of commit `8bbf7e3`)

Small consistency polish — Play icon removed from Zaeli action row in tutor-session, matching home chat where the equivalent was already removed. Both surfaces now match.

### D. Multi-photo chat upload (commit `e6c8ea6`) ⭐

Session 29 shipped multi-photo receipt scan (up to 4 photos, one Sonnet call). Same pattern now applied to the main chat bar. Rich can attach up to 4 photos in a single message.

**State change** ([app/(tabs)/index.tsx](app/(tabs)/index.tsx)):
- `pendingImage: string | null` → `pendingImages: string[]`
- New `MAX_CHAT_PHOTOS = 4` constant. Camera and Photos pickers are ADDITIVE (adds to existing array, respects cap).
- Horizontal thumbnail strip above the chat bar shows each pending photo with per-photo ✕ dismiss.
- `send(text?, overrideImages?: string[])` — accepts optional image array override. Existing `send('')` for photo-only still works.
- ONE Sonnet call attaches ALL image parts (both tool path and pure-vision path). Prompt updated with multi-photo aggregation language.
- `Msg.imageUris?: string[]` field added alongside legacy `imageUri` for backwards compat with older persisted messages. Render logic prefers `imageUris` if present.
- Chat feed renders horizontal grid for 2+ photos (110×110 each with 6px gaps). Single photo still uses the original 180×120 layout.

### E. Stripe checkout testability (part of commit `e6c8ea6`)

New Developer row in Settings: **"💳 Test Stripe checkout"**. Force-opens the Stripe Payment Link in Safari even when the beta grant hides the Subscribe button. Everything else was already wired in Session 28 — this is testing infrastructure so Rich can exercise the full checkout return path (Safari → payment complete → back to app → Session 30 foreground refresh reloads profile → subscription card updates).

### F. Foreground profile refresh (part of commit `e6c8ea6`) ⭐

`app/_layout.tsx` gained an `AppState.addEventListener('change', ...)` handler. On background→active transition for any signed-in user, calls `loadProfile()`. Critical for the Stripe checkout return path — otherwise the user completes payment in Safari, returns to the app, and the Settings subscription card is stale until they force-restart. Generalisable pattern for any per-user state that can change out-of-app.

### G. Kids Trivia answer-in-question guard (commit `34b57eb`) ⭐

Anna feedback: Duke saw "Which sport is played with a round ball and goals, and is called soccer in many countries?" — answer "Soccer". The AI-generated question literally revealed the answer inline. Classic prompt-only failure — the model wanted to be helpful and defined the term while asking about it.

**Three-layer defence** (same pattern as Session 29 tutor math accuracy):
1. **Prompt rule** — explicit instruction in the trivia system prompt: "Never include the answer, or a paraphrase of the answer, anywhere in the question text."
2. **BAD/GOOD examples** inline in prompt — showing "Which sport... called soccer" (BAD) vs "Which sport is played with a round ball and goals?" (GOOD) so the model has a concrete pattern to avoid.
3. **Client-side filter** — after the model returns, word-boundary regex checks each 4+ character word in the answer against the question text. If any answer word appears in the question, the question is dropped and the next one is generated. Threshold of 4 chars avoids false positives on articles/prepositions.

### H. Cold-start splash latency fix (part of commit `34b57eb`) ⭐

Anna feedback: 3s+ splash on foreground return after iOS jetsammed the app in background.

**Root cause** ([app/_layout.tsx](app/_layout.tsx)) — cold-start `useEffect` was `await loadProfile()` BEFORE `setAuthed(true)`. Session verification from AsyncStorage is fast (~50ms), but `loadProfile()` is a Supabase network query — 1-2s on decent reception, 3s+ on flaky.

**Fix** — restructured cold-start flow:
- Verify session (fast AsyncStorage read) → `setAuthed(true)` IMMEDIATELY → app renders.
- Kick `loadProfile()` in the background (fire-and-forget).
- Route guard already tolerates null profile (treats as owner default — the exact fallback pattern from Session 21).
- Expected cut: ~2s off foreground-return splash time.

### I. ⭐ CRITICAL DISCOVERY: `expo-notifications` plugin missing from app.json (commit `6eab45a`)

Session 29's `registerPushToken()` was wired correctly. Anna wasn't getting push notifications on her preview build. Diagnosis went through several suspects before landing:

1. Suspected Anna on old build — ruled out (both on 1.0.0 build 6).
2. Suspected permission denied — ruled out (brief notifications were firing, so permission granted).
3. Suspected `auth.uid()` NULL in SQL editor — was actually right, needed a different query.
4. **Actual root cause**: `app.json` `plugins` array had no `expo-notifications` entry.

Without the plugin, iOS never gets the `aps-environment` entitlement at build time → `getExpoPushTokenAsync` throws at boot → the `.catch(() => {})` in `_layout.tsx` swallowed the exception silently → `profiles.expo_push_token` stayed null forever. **Local scheduled notifications (briefs) still worked because they don't need APNs** — that's what threw the diagnosis off. Briefs use expo-notifications' local trigger path which doesn't require the entitlement; push tokens do.

**Fixes shipped in `6eab45a`:**
- Added `"expo-notifications"` to `app.json` plugins array (with `icon` + `color` config).
- Replaced silent `.catch(() => {})` in `_layout.tsx` with `.then(...).catch(e => console.log('[push] register threw:', e?.message))` so future failures surface in Metro/EAS logs.
- Added Developer row "🔔 Register push token now" — manually triggers `registerPushToken()` and shows result via `Alert.alert` so Rich can verify on-device without a rebuild cycle.

### J. Verbose push token diagnostic (commit `dcb263b`)

Post-`6eab45a` on-device test still failed. Previous "returned null" Alert was too coarse — didn't say WHICH step. New `debugPushToken()` returns structured state:

```
{
  step: 'auth' | 'permissions' | 'getExpoPushTokenAsync' | 'db-write' | 'done',
  detail: string,
  userId: string | null,
  permission: 'granted' | 'denied' | 'undetermined',
  projectId: string | null,
  token: string | null,  // first 20 chars for privacy
  dbWrite: 'ok' | 'error' | 'skipped',
  error: string | null,
}
```

Developer row Alert now shows the full state block so the actual failure step surfaces without another guess-and-rebuild cycle.

### K. External infrastructure work (non-code, this session)

**EAS Starter plan upgrade** — free tier build cap (15 iOS/month) hit mid-session with rapid push diagnostic iteration. Rich upgraded to Starter (14 iOS builds/month tier). Cost implication: shipping cycle no longer bottlenecked by build quota during active testing rounds.

**`eas build` vs `eas submit` are separate commands** — confused Rich twice this session:
- `eas build --profile preview` → creates .ipa, gives internal install link (not TestFlight). Only for internal distribution.
- `eas build --profile production` → creates .ipa AND auto-increments `buildNumber` in expo.dev. Still doesn't push to Apple.
- **`eas submit --platform ios --latest` is the SEPARATE command** that uploads the latest build to App Store Connect → TestFlight. Both preview and production builds require this to appear in TestFlight; only production builds are App-Store-distributable.

**APNs push credentials** — already auto-provisioned by `eas credentials` (Push Key set up for zaeli / com.zaeli.app during first EAS build). Not the missing piece — the plugin was.

**GIPHY key discovery** — Kids Hub rewards GIFs failing in standalone builds because `EXPO_PUBLIC_GIPHY_API_KEY` sits in local `.env` but was never added to EAS Environment Variables. Same Session 27 pattern as the other 4 `EXPO_PUBLIC_*` keys. Rich needs to add via expo.dev UI as Sensitive visibility for Preview + Production before Kids Hub GIFs render on standalone builds.

**Website v5 rewrite** — parked but 4-round plan drafted (correctness pass with new pricing → beta framing → chat mockup refresh → new sections). Deploy to zaeli.app (replacing current orb splash). ~1 day of work total.

**Outlook/Gmail calendar sync** — discussed and agreed not urgent right now. Revisit if Anna asks twice.

### Locked decisions Session 30

- **`expo-notifications` plugin is REQUIRED in `app.json` plugins array** — without it, iOS never gets the `aps-environment` entitlement and push tokens silently fail. Local notifications (briefs) work either way — that's what makes diagnosis tricky. NEVER remove the plugin entry. If it's ever missing, push token registration will fail invisibly.
- **Never use `.catch(() => {})` for async fire-and-forget** — swallows errors invisibly. ALWAYS use `.catch(e => console.log('[surface] threw:', e?.message))` at minimum so failures surface in build logs. The silent catch is what cost this session ~2 diagnostic cycles on the missing plugin.
- **Sensitive silent-failure paths deserve verbose on-device diagnostic** — when a feature depends on OS/API interactions that can fail invisibly in production (push tokens, image picker permissions, background modes), add a Developer row that surfaces structured state via `Alert.alert`. Saves guess-and-rebuild cycles when the failure only reproduces on real devices. Pattern: `debug<Feature>()` returns a state object, Developer row calls it + shows JSON.stringify in Alert.
- **`eas build` and `eas submit` are separate commands** — build creates the .ipa. Submit uploads to App Store Connect → TestFlight. Preview profile can't be App-Store-submitted (internal distribution only). Only production profile is App-Store-distributable. Both preview and production require `eas submit --platform ios --latest` to appear in TestFlight.
- **EAS Starter plan** — 14 iOS builds/month, worth the upgrade once beta is active with multiple testers or during rapid diagnostic iteration. Below that, free tier's 15/mo is fine.
- **Foreground profile refresh pattern** — `_layout.tsx` `AppState.addEventListener('change', ...)` reloads profile on `background → active` transition for any signed-in user. Critical for Stripe checkout return path. Any future per-user state that can change out-of-app (subscription, tier, family members) should hook into this pattern via `_layout.tsx`.
- **Chat photo attachments cap = 4** — `MAX_CHAT_PHOTOS` constant. Matches receipt scan cap (Session 29). Larger caps would blow up API payloads, latency, and cost per Sonnet vision call. Never raise without cost modelling.
- **Trivia questions never contain the answer** — three-layer defence pattern (prompt rule + BAD/GOOD examples + client-side word-boundary regex filter, 4+ char threshold). Same pattern as Session 29 tutor math accuracy. Any AI-generated content surface where factual correctness matters should follow this pattern — training bias fights any single-layer fix.
- **Family push = JWT + family-boundary-enforced Edge Function** — `supabase/functions/family-notify/index.ts` validates that sender's `family_id` MATCHES every recipient's `family_id`. Otherwise 403. Never trust client-supplied recipient UIDs directly; always cross-check family membership server-side.
- **Cold-start `useEffect` never blocks `setAuthed` on network calls** — verify session (fast AsyncStorage) → `setAuthed(true)` → kick network work in background. Route guards must tolerate null profile (treat as owner default) so the fast path always renders first. Anna's 3s splash was caused by breaking this rule.
- **Any new `EXPO_PUBLIC_*` env var must be added to BOTH local `.env` AND EAS Environment Variables** (Sensitive visibility, Preview + Production scopes). Local `.env` alone works for dev-client + Metro but silently missing from standalone builds. Same Session 27 lesson keeps biting — every new key = check EAS.

### Files touched Session 30

**NEW SQL:**
- `supabase-push-tokens.sql` — adds `profiles.expo_push_token`

**NEW Edge Function:**
- `supabase/functions/family-notify/index.ts` — JWT-verified, family-boundary-enforced, batches to Expo push API

**NEW app.json plugin entry:**
- `expo-notifications` (with icon + color config)

**MODIFIED:**
- `lib/notifications.ts` — `registerPushToken` / `unregisterPushToken` / `notifyFamily` / `debugPushToken`
- `app/_layout.tsx` — fire-and-forget `registerPushToken()` after auth (non-silent catch), AppState listener for foreground profile refresh, cold-start splash latency fix (setAuthed before loadProfile network call)
- `app/(tabs)/index.tsx` — Notify chip on calendar confirm cards, `send_family_message` tool + CAPABILITY_RULES update, multi-photo state (`pendingImages: string[]` + `MAX_CHAT_PHOTOS = 4`), horizontal thumbnail strip, `send(text?, overrideImages?: string[])` signature, `Msg.imageUris?: string[]` field + horizontal grid render for 2+ photos, tool-path multi-imagePart attachment
- `app/(tabs)/tutor-session.tsx` — Play icon removed from Zaeli action row (matches home chat)
- `app/(tabs)/kids-games-data.ts` (or trivia prompt location) — three-layer defence: prompt rule with BAD/GOOD examples + client-side word-boundary regex filter
- Shopping Spend tab (in `app/(tabs)/index.tsx`) — Processing overlay with ActivityIndicator + status label + Alert on error
- `app/(tabs)/settings.tsx` — Developer rows: "💳 Test Stripe checkout" (force-opens Payment Link), "🔔 Register push token now" (manual trigger with structured Alert)

**EXTERNAL (not in git):**
- EAS Starter plan upgrade (14 iOS builds/month)

### What's next

- **Rich builds + submits again tomorrow** to get the verbose diagnostic (`dcb263b`) on-device. Then taps "🔔 Register push token now" — the Alert will show exactly which step is failing (auth / permissions / getExpoPushTokenAsync / db-write) with the actual exception message. That's the final unlock for family push.
- **GIPHY EAS env var still not added** — Kids Hub GIFs will keep showing 🎉 placeholder until Rich adds `EXPO_PUBLIC_GIPHY_API_KEY = g7MhCcPu2yT62HvslNpnEoG4LxwC7Lga` at expo.dev → Environment Variables (Sensitive visibility, Preview + Production).
- **Website v5 rewrite** — parked but 4-round plan drafted. Deploy to zaeli.app (replacing current orb splash). ~1 day total.
- **Outlook/Gmail calendar sync** — parked. Revisit if Anna asks twice.
- **Anna beta round 2 testing** — awaiting successful build #16 (or #17 if push works first-try on diagnostic build) so she can test family push + multi-photo chat + trivia guard + splash fix.
- **Sonnet 5 migration** — still queued for after Anna beta settles.
- **Per-user brief cache** — still queued for scale past 100 families.
- **Phase 5 API keys server-side** — still critical before public launch (Anthropic + OpenAI to Supabase Edge Functions).

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
Phase 5: Chat v5 / fix         ✅ RESOLVED sessions 3+4
Phase 5b: Design refresh       ✅ Session 5 — all 3 pages, briefs, new brand colours
Phase 7a: Dashboard restructure ✅
Phase 7b: My Space reshuffle   ✅
Phase 7c: Notes & Tasks sheet  ✅
Phase 8a: Notes sheet          ✅
Phase 8b: Goals module         ✅
Phase 8c: Fitness sheet        ✅
Phase 8d: Stretch sheet        ✅
Phase 8e: Zen sheet            ✅
Phase 8f: Wordle               ✅
Phase 8g: Calendar/Shopping fix ✅
Phase 10a: Shopping sheet      ✅ Full rebuild — List/Pantry/Spend all polished
Phase 10b: Meal Planner sheet  ✅ 3 tabs, 7-day planner, recipes, favourites, cook picker, kids jobs
Phase 11:  Meal Planner polish ✅ Recipe photos, rolling 10-day, Search Recipes day context, move in detail
Phase 12:  Kids Hub wired      ✅ Supabase tables, job completion, GIPHY, rewards, suggest job, parent approvals
Phase 12b: Kids Hub games      ✅ 5 games rebuilt with embedded keyboards, age-tiered content, celebrations
Phase 12c: Kids Hub polish     ✅ Games polished, flicker fixed, crossword layout, all UX feedback addressed
Phase 12d: Our Family v2       ✅ 3-tab layout, member profiles, add member, jobs/rewards management
Phase 14a: Kids Hub AI Trivia  ✅ Session 14 — GPT-5.4 mini fresh questions, kids_trivia_history table, fallback to static
Phase 14b: Kids crossword pool 🅿️ PARKED — content task (100 puzzles), pickup anytime
Phase 14c: Tutor topic chips   ✅ Session 14 — reworked all 4 subjects Foundation–Year 12 (Core-first)
Phase 14d: Tutor difficulty    ✅ Session 14 — bands load from tutor_progress, consecutive tracking, upgrade/downgrade, persist
Phase 14e: Prompt caching      ✅ Session 14 — Anthropic cache_control on tutor system prompt, ~30-40% cost reduction
Phase 14f: Conversation summ   ✅ Session 14 — after 8 turns, older exchanges compressed to keep input bounded
Phase 14g: Dashboard redesign  ✅ Session 14 — 5-card layout, On the Radar, header match My Space, personal_tasks sharing
Phase 14h: Swipe-world v4      ✅ Session 14 — 2-page (Chat+Dashboard), open on Chat, My Space standalone, 2-dot indicator
Phase 14i: FAB killed          ✅ Session 14 — all FABs removed, hamburger ☰ top-right everywhere
Phase 14j: MoreSheet           ✅ Session 14 — Option 1 refined tiles, 92% sheet, Family Channels + Personal + Modules + Nav sections
Phase 14k: Splash Option C     ✅ Session 14 — Deep Slate #1C2330 + Mint accents, once-per-session fire
Phase 14l: Back arrows         ✅ Session 14 — added to Tutor, Kids Hub, Family, My Space, Dashboard headers
Phase 14m: Camera picker       ✅ Session 14 — chat bar camera opens Add-to-Chat sheet (Camera/Photos)
Phase 15a: MoreSheet restructure ✅ Session 15 — NAVIGATE top, ACCOUNT section, bigger icons/fonts
Phase 15b: Cross-sheet hamburger ✅ Session 15 — Calendar/Shopping/Meals/Notes&Tasks headers + Option A stacked
Phase 15c: Modal stacking fixes ✅ Session 15 — onDismiss, fallback timeout, backdrop guard, sync onAction
Phase 15d: Chat bar V2         ✅ Session 15 — single pill Tutor-style, 60px tall, 44×44 buttons. Tutor matched.
Phase 15e: Splash polish       ✅ Session 15 — sky blue a+i, lavender orbs, i-dot fix, once-per-session flag
Phase 15f: Dashboard cards     ✅ Session 15 — tap-anywhere-to-expand, 35/65 bento, back arrow
Phase 15g: 2-dot indicator     ✅ Session 15 — killed entirely
Phase 15h: Legacy pill         ✅ Session 15 — "← Dashboard" removed from Chat header
Phase 15i: Chat "Home" label   ✅ Session 15 — renamed from "Chat"
Phase 15j: Live picker option  ✅ Session 15 — removed, only Camera/Photos now

Phase 16: AI Brief system      ✅ Session 16 — 3 windows, Sonnet + prompt caching, zaeli_briefs cache, dark slate bubble in chat feed, data_signature detects drift, held-brief during active chat
Phase 17a: Our Budget v1       ✅ Session 17 — full UI shell built (3 tabs, CRUD, screenshot vision)
Phase 17b: Our Budget v2 PIVOT ✅ Session 17 — PURE PLANNER (no live tracking), line items on fixed, single target on variable, AI helper for suggestions only, mint palette, Option D chart, Savings tab
Phase 18:  Settings            ✅ Session 17 — main/notifications/memory views, DateTimePicker for brief times, AsyncStorage persistence
Phase 19:  Travel sheet        🔨
Phase 20:  Tutor session resume 🔨 ← reload conversation from tutor_messages when resuming active session
Phase 21:  Calendar month glitch ✅ Session 16 — null guard + userTapped flag + today anchor + bigger arrows
Phase 22:  Brief polish        ✅ Session 17 — quiet-day persona, loading placeholder, black star, peach bubble, softer chip, dismiss works
Phase 23:  Old brief cleanup   ✅ Session 17 — ~380 lines removed (dead state, old fn, generatePostCardPrompt, renderCardStack, lavender card, stale-session reset)
Phase 24:  Standard header     ✅ Session 17 — 17px/700Bold/0.72 page label rule · 40px wordmark rule · applied across 5 screens
Phase 25:  Kids keyboard fix   ✅ Session 17 — component-as-JSX anti-pattern fixed (call as fn)
Phase 26:  Calendar keywords   ✅ Session 17 — narrowed to intent-bearing phrases, no more bare time-refs hijacking chat
Phase 27:  Backend pass        🔨 ← batched: Supabase migrations, push notifications, auth, Stripe, memory wiring, CSV document picker, share extension
Phase 28:  Travel module       ✅ Session 18 — standalone route, Trip Stack + Trip Detail (4 tabs), BookingSheet unified add/edit, Pure Planner budget (auto-sum Booked), tap-to-edit Who's Going, keyboard fix (KAV inside card), mint/sky palette per new design rules
Phase 29:  Keyboard fix        ✅ Session 18 — KAV moved inside SheetShell card + keyboardShouldPersistTaps='handled' on all sheet ScrollViews (travel + our-budget)

Phase 30a: Brief v3 (2 windows)  ✅ Session 19 — reduced from 3 to 2 (morning + evening). Evening covers tomorrow-prep so morning brief doesn't need to.
Phase 30b: Brief render Option B ✅ Session 19 — peach (morning) / lavender (evening) tinted bubble + time-of-day pill + structured 3-paragraph prose + win banner KILLED
Phase 30c: Brief generator v3   ✅ Session 19 — 3-paragraph structure prompt rewrite, 1 emoji per paragraph max, winBanner stripped from spec/parser/payload/upsert
Phase 31a: Onboarding polish    ✅ Session 19 — splash orbs (Welcome + Ready), wordmark i-dot fix, "Hey 👋 I'm Zaeli", emoji throughout, "homework" replacement, Brentwood example bigger, brief preview Option B, chat bar removed, "Let's go" CTA
Phase 31b: Cold-start splash    ✅ Session 19 — warm bg + palette orbs (matches onboarding), INK wordmark, coral "chaos", app.json native splash bg #FAF8F5
Phase 31c: Chat bubble unification ✅ Session 19 — Zaeli text wrapped in soft-grey bubble (BBL 6), user bubble sky #E8F4FD, both Regular 17/26
Phase 32a: Tour state machine   ✅ Session 19 — lib/tour-state.ts (11 STOPS data + load/advance/back/skip/complete/replay + inactivity helpers), AsyncStorage tour_state_v1
Phase 32b: Tour route           ✅ Session 19 — app/tour/index.tsx (header + animated progress + per-stop card + bottom nav + finale celebration). Tutor stop 7 = HERO (violet, trial badge, secondary CTA, price line)
Phase 32c: Tour pill + chip     ✅ Session 19 — bottom-LEFT pill on chat when mid-tour. 🧭 Take the tour chip → replayFromStart() + navigate
Phase 32d: First-time banner    ✅ Session 19 — TourBanner reusable + wired into Shopping/Meals/Calendar/Tasks. Per-sheet AsyncStorage flag
Phase 32e: Settings replay      ✅ Session 19 — Replay tour view + 11-row per-stop picker + last-completed date
Phase 32f: Inactivity prompt    ✅ Session 19 — 24h+ → "We were on [stop]" with Continue/Skip/Not now chips. Synchronous flag-clear prevents double-fire
Phase 33a: Invite state         ✅ Session 19 — lib/invite-state.ts (mock token + SMS composer + Copy/Resend/Revoke + heads-up windowing) + lib/account-state.ts (owner/adult/kid)
Phase 33b: Invite inviter       ✅ Session 19 — /invite role picker (no emoji) + form + iOS share sheet. Family screen per-member status grid + bigger badges + PendingInviteRow + mint CTA card
Phase 33c: Invite receiver      ✅ Session 19 — /invite/[token] with Adult flow (4 steps → chat → tour) and Kid flow (3 steps → Kids Hub). Invalid-link state included
Phase 33d: Inviter heads-up     ✅ Session 19 — chat pushes mint/lavender Zaeli message on invite acceptance. Synchronous flag-clear prevents double-fire
Phase 33e: Kid permission gating ✅ Session 19 — MoreSheet hides Budget + Family for kid accounts. (Direct route guards deferred)
Phase 34: Kid tour 9 stops     ✅ Session 19 quick wins (28 Apr) — KID_SKIP_IDS [9, 11], getEffectiveStops/Total, all nav/progress/replay account-aware. Settings picker + chat pill + inactivity prompt + post-onboarding offer all use effective totals
Phase 35: Kids Hub welcome     ✅ Session 19 quick wins (28 Apr) — kid_just_joined AsyncStorage flag set in finishKid, lavender welcome card with × dismiss above 3-stat row. Bonus: kid auto-jumps to their own hub
Phase 36: Direct-route gating  ✅ Session 19 quick wins (28 Apr) — Budget + Family screens loadAccount + redirect kid accounts to /kids on mount
Phase 37: Calendar month-view  ✅ Session 19 quick wins (28 Apr) — fetchMonthDayEvents .eq('date') → range query .gte/.lt to match fetchMonthDots' tolerance for timestamp/timezone column types

Phase 38a: Tutor session resume ✅ Session 20 (28 Apr) — Phase 20 from earlier sessions finally unblocked. resumeSessionId param to tutor-session, loadExistingSession hydrates from tutor_messages, status flips 'completed' → 'active' on resume so exit-save stays clean. Replaces goSessionReview stub. Works for all 6 pillars
Phase 38b: Chat view-query inline cards ✅ Session 20 — Shopping/Meals/Tasks "what's on..." queries intercepted before GPT chat path, render existing inline cards + chips. Action queries unaffected
Phase 38c: Shopping add-bar layout ✅ Session 20 — useSafeAreaInsets() for explicit bottom inset on add bar. SafeAreaView edges='bottom' was unreliable on first render inside Modal
Phase 38d: Voice (ElevenLabs)   🅿️ DEFERRED — explicit decision to do AFTER backend pass. Brief-only voice could go pre-backend if needed

Phase 39a: Backend Phase 1 (auth foundation) ✅ Session 21 (14 May) — supabase-auth-tables.sql (families + profiles + handle_new_user SECURITY DEFINER trigger + current_family_id helper + 3 RLS policies). lib/auth.ts (signUpOwner/signIn/signOut/loadProfile + module cache). app/(auth)/sign-in.tsx (3-state UI with palette orbs). app/_layout.tsx auth guard + onAuthChange listener. Disabled email confirmation in Supabase dashboard.
Phase 39b: Backend Phase 2a (RLS + DUMMY_FAMILY_ID swap) ✅ Session 21 (14-15 May) — supabase-data-rls.sql (19 tables × 4 policies + claim_legacy_data backfill RPC + tutor_messages session-aware policy). lib/family.ts (getFamilyId at query time, warned-once fallback). 99 swaps across 12 files via perl word-boundary regex. Plus 3 NEW view-query branches in send() (Shopping/Meals/Tasks) — must go BEFORE calendar branch.
Phase 39c: Backend Phase 2a fixes (session persistence + RLS unblocked) ✅ Session 21 (15 May) — lib/supabase.ts AsyncStorage + react-native-url-polyfill + AppState refresh. Critical SQL fix: current_family_id() SET search_path = public, auth (was silently returning NULL because auth.uid() didn't resolve in SECURITY DEFINER without search_path). Re-ran policy DO-block (had silently rolled back on first run — RLS was ON with ZERO policies).
Phase 39d: Backend Phase 2b (invite tokens + tour state to Supabase) ✅ Session 21 (15 May) — supabase-invites-tour.sql (invite_tokens + RLS + get_invite_by_token/accept_invite RPCs anon-callable + profiles.tour_state JSONB). lib/invite-state.ts rewrite (inviter side Supabase-backed, NEW receiver-side lookupInviteByToken/acceptInviteRemote via RPC). lib/tour-state.ts rewrite (profile JSONB source of truth, AsyncStorage offline fallback). app/invite/[token].tsx receiver uses new RPC functions.
Phase 39e: Backend Phase 2c (settings prefs to Supabase) ✅ Session 21 (15 May) — supabase-user-prefs.sql (profiles.user_preferences JSONB). NEW lib/user-prefs.ts (same write-through pattern as tour-state). settings.tsx removed inline Prefs/DEFAULT_PREFS/loadPrefs/savePrefs.
Phase 39f: Backend Phase 2d (real auth at invite acceptance) ✅ Session 22 (20 May) — handle_new_user trigger branches on invite_token in raw_user_meta_data, creates profile linked to inviter's family_id, marks invite accepted atomically. signUpFromInvite() helper in lib/auth.ts. AdultFlow: real signup with form email+password + client-side validation. KidFlow: synthetic email (kid-<token>@invitees.zaeli.app) + token+PIN password. Bad tokens raise → auth user rolled back. Verified end-to-end on device.
Phase 39g: Backend Phase 2e (cross-device verification) 🔨 NEXT — Test real invite + sign-up on a SECOND physical device (waiting on Anna's device). QR + scheme + PHASE-2E-TEST-PLAN.md all prepped Session 23.
Phase 39h: Backend Phase 2f (memory wiring) ✅ Session 23 (28 May) — Memory view → real family_insights / family_milestones (fetch + delete + clear-all). PLUS Phase 2f+ COMPLETED the capture+recall loop: buildMemoryContext injected into chat prompt (recall), saveConversation per exchange (capture), detectInsightsFromConversations every 6 exchanges (Sonnet extraction). All gated by memoryLearningOn. Zaeli now genuinely remembers the family.
Phase 39i: Backend Phase 3a (push notifications) ✅ Session 23 (28 May) — scheduleBriefNotifications wires morning+evening brief times → iOS local daily notifications. Permission on auth, re-schedule on prefs change. Dev rows for test + list. (3b Stripe + 3c Universal Links still pending external setup.)
Phase 39j: Backend Phase 3b/3c (Stripe + Universal Links) 🔨 — Stripe customer portal WebView (needs account + products). Real cross-device deep links zaeli.app/i/<token> (needs domain live + apple-app-site-association + associatedDomains + native rebuild).
Phase 39k: Backend Phase 4 (cleanup + ship-ready) 🔨 — Remove dev rows (incl. Session 23 memory/notif ones), remove redundant requestNotificationPermission in (tabs)/_layout.tsx, LANDING_TEST_MODE=false, expo-document-picker for Our Budget CSV (EAS rebuild), share extension (EAS), GDPR / export data / privacy WebViews.

Phase 42: Phase 2e QR prep ✅ Session 23 (28 May) — react-native-qrcode-svg, "📷 Show QR" chip + modal in family.tsx (zaeli://invite/<token>), Linking debug listener in _layout.tsx, copy-link switched to working dev link, PHASE-2E-TEST-PLAN.md.
Phase 43: Profile identity wiring ✅ Session 24 (29 May) — Settings account hero reads real signed-in profile (name/email/initial/kind tag); invite inviter name from profile (supabase-invite-inviter-name.sql adds invite_tokens.inviter_name + RPC return). No more hardcoded "Rich" for current-user identity.
Phase 44: Family roster → real DB ✅ Session 24 (29 May) — lib/family-roster.ts (dynamic, up to 8, getRoster/getMemberById/getMemberByName/resolveAssigneeId/defaultAssigneeIds). Replaced hardcoded FAMILY_MEMBERS across index/dashboard/calendar. Assignee writes resolve names → real family_members UUIDs everywhere. SQL: family-member-colours + remap-event-assignees. Cache invalidated on auth change.
Phase 45: Calendar inline-card date label ✅ Session 24 (29 May) — InlineData.initialTab + dateLabelOverride; confirm-after-add card shows the event's real day, not always "TODAY".
Phase 46: Memory hallucination fix ✅ Session 24 (29 May) — buildContext memory block reframed as BACKGROUND KNOWLEDGE so a preference ("Poppy enjoys dance") isn't treated as a scheduled/booked event.
Phase 47: Recurring events ✅ Session 24 (29 May) — add_calendar_event repeat + repeat_days, 12-month horizon, repeat_group_id series grouping (supabase-event-repeat-group.sql), update_all/delete_all + extend_recurring_event tools, morning-brief ending-soon nudge. Multi-day weekly supported.

Phase 40: Chat bar photo upload bug ✅ Session 21 (18 May) — 64px thumbnail above bar with "Photo ready — tap send" + ✕ dismiss. Send button opacity + tap guard updated to allow photo-only (send('') with imageUri). Three combined bugs presenting as one symptom (picker opens, select does nothing).
Phase 41: Multi-user safety patches ✅ Session 22 (20 May) — six combined fixes surfaced during 2d testing: (1) heads-up filter inviter-only via inviter_user_id === currentUserId, (2) chat persistence file scoped per user via auth.onAuthStateChange subscription in useChatPersistence, (3) local chat messages state resets on user switch via chatLoaded transition, (4) tour-state + user-prefs don't fall back to AsyncStorage when signed in (profile JSONB is sole source), (5) all module caches invalidated in _layout.tsx onAuthChange (tour, prefs, invites + existing account), (6) fresh-invitee welcome polish — suppress family brief on first session, show warm welcome instead.

Phase 48: Swipe affordance ✅ Session 25 (1 July) — anchored 2-dot page indicator (top: insets.top+10, coral active/grey idle) + first-run "Swipe → for Dashboard" hint pill (AsyncStorage SWIPE_HINT_KEY, one-shot). Middle-air indicator (killed Session 15) replaced with header-anchored positioning that works even without a chat bar underneath.
Phase 49: Phase 4a — safe cleanup ✅ Session 25 (1 July) — LANDING_TEST_MODE=false, redundant requestNotificationPermission in (tabs)/_layout.tsx removed, 3 dev rows removed (🔔 test notification, 📋 list scheduled briefs, 🧠 run memory extraction). DELETED: app/components/ZaeliFAB.tsx (killed Session 14) + app/(tabs)/landing.tsx + its Tabs.Screen entry. Kept: QR chip + 4 dev rows still needed for Phase 2e (Re-do onboarding, Simulate invite accepted, Open latest invite as receiver, Reset to owner account).
Phase 50: Phase 3b — Stripe scaffolding ✅ Session 25 (1 July) — supabase-stripe-fields.sql (profiles + 5 columns: stripe_customer_id, subscription_status, subscription_plan, subscription_renews_at, trial_ends_at). lib/stripe.ts (getSubscription/subscriptionLabel/fetchCustomerPortalUrl stub). lib/auth.ts Profile type extended. Settings Subscription card reads real data + Manage subscription handler with WebBrowser + friendly placeholder. Edge Functions ready to deploy (stripe-portal + stripe-webhook, Deno, --no-verify-jwt for webhook). STRIPE-SETUP.md + supabase/functions/README.md. **NEEDS EXTERNAL:** Stripe account (~25 min setup), Price IDs, deploy Edge Functions, register webhook.
Phase 51: Phase 3c — Universal Links LIVE ⭐ ✅ Session 25 (1 July) — app.json associatedDomains ["applinks:zaeli.app"]. INVITE_LINK_BASE 'zaeli.app/i/' → 'zaeli.app/invite/' (matches Expo Router route). Copy Link + Resend use https://zaeli.app/invite/<token>. AASA hosted at zaeli.app/.well-known/apple-app-site-association with Team ID V37VPTPKQ8 + Content-Type application/json. Deploy stack: Cloudflare DNS (grey cloud) → Netlify + Let's Encrypt SSL. Verified end-to-end on device: tap link in Messages → app opens to receiver flow, first try.
Phase 52: EAS Build infrastructure ✅ Session 25 (1 July) — First cloud iOS build via EAS. Apple Developer credentials (regular password + 2FA, NOT App-Specific Password — Fastlane uses Developer API). Same bundle ID (com.zaeli.app) → update-in-place on iOS (no duplicate icon). Session persistence survived reinstall. Blueprint for TestFlight (Phase 4b): eas build --profile preview + eas submit --platform ios.
Phase 53: External hosting infrastructure ✅ Session 25 (1 July) — zaeli-app-links GitHub repo → Netlify auto-deploy (netlify.toml with Content-Type: application/json for AASA path — CRITICAL, Netlify default application/octet-stream fails silently). Cloudflare DNS zaeli.app apex CNAME → apex-loadbalancer.netlify.com + www CNAME → zaeli-app-links.netlify.app (BOTH grey cloud DNS-only, orange proxy rewrites AASA Content-Type). Cloudflare Email Routing on zaeli.ai: hello@ → richarddekretser@gmail.com (free tier). Let's Encrypt SSL covers both zaeli.app + www, auto-renews.

Phase 54: Brief v1 — competence-first prompt ✅ Session 26 (1 July late evening) — commit 18f38d5. TONIGHT MEAL context line reframed. NEW COMPETENCE FIRST rule block with banned phrase list. Sparse-day chip examples cleaned. One Thing paragraph made OPTIONAL with explicit good-vs-bad examples inline. Diagnosis: "empty state = to-do item" is a category-standard AI-product failure mode.
Phase 55: zaeli_briefs table backfill + RLS fix ✅ Session 26 (1 July late evening) — commit be2fc90. Table had never been created in dev DB (Session 16 migration never run) — every brief was uncached with silent upsert failures. Migration also used pre-Session-21 "USING (true)" allow-all. Updated to Session 21 pattern (family-scoped SELECT/INSERT/UPDATE/DELETE via current_family_id()). Table created, caching finally working.
Phase 56: Brief v2 — invisible-domain rule ⭐ ✅ Session 26 (1 July late evening) — commit 5e19e54. V1 stopped the body opener but Sonnet compensated by pushing dinner nudge into One Thing + primary chip. Real fix: don't tell Sonnet the domain exists when empty. formatContext filters out empty domains entirely. New ── LIVE DATA ── fence + closing REMINDER. New ABSOLUTE INVISIBLE-DOMAIN RULE at top of prompt. BANNED CHIP LABELS block. Verified working: 10:47pm brief was warm, real-event-tied, no dinner mention anywhere.
Phase 57: Pricing pivot ⭐ ✅ Session 26 (1 July late evening) — commit 3220703. **A$9.99 family / A$7.99 tutor per child, inc GST** (from A$14.99 / A$9.99). Strategic reduction for competitive positioning in a tight economy. 5 production surfaces + 4 docs updated + STRIPE-SETUP.md gained critical tax-inclusive setup note (Stripe AU defaults to adding 10% on top). Memory saved in [[project-pricing-decision]].
Phase 58: 3-hour bucket refresh ⭐ ✅ Session 26 (1 July late evening) — commit ab90557. Coarse hourBucket = Math.floor(hour / 3) added to FamilyContext + computeSignature. Persistence-restore of lastBriefWindowRef gated on bucket match — stale bucket means "already fired" signal is not carried forward, so shouldFireBrief refires fresh. Fixes 5pm brief still showing "get bins out after dinner" at 10:30pm.
Phase 59: Auto-dismiss earlier same-window briefs ✅ Session 26 (1 July late evening) — commit 93c7065. tryFireBrief placeholder-swap step now walks messages and sets briefDismissed=true on any other same-window brief. Text stays as chat history, chips hide. Uses existing briefDismissed mechanism (Session 17) — no render path change.

Phase 60: App icon 2B shipped ⭐ ✅ Session 27 (2 July early hours) — Icon 2B (za + peach/mint/lavender orbs on warm bg) designed via zaeli-icon-options.html (6 options) then generated as 1024×1024 + 2048×2048 PNGs via zaeli-icon-generator.html browser Canvas tool. Assets dropped into assets/images/icon.png + splash-icon.png. Opaque, no alpha, no rounded corners (iOS applies mask), flat warm bg #FAF8F5.
Phase 61: EAS Environment Variables setup ⭐ ✅ Session 27 (2 July early hours) — first preview build crashed on boot because cloud builds don't inherit local .env. Fixed via expo.dev web UI: added EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY, EXPO_PUBLIC_ANTHROPIC_API_KEY, EXPO_PUBLIC_OPENAI_API_KEY as "Sensitive" visibility (Expo blocks "Secret" for EXPO_PUBLIC_* because they bake into bundle). Scoped Preview + Production. Second build boots cleanly.
Phase 62: Brief bucket-check bug fix ✅ Session 27 (2 July early hours) — commit e78efa3. Session 26's bucket-check parsed last.ts (display string like "9:31 pm") as a Date → Invalid Date → sameBucket always false → refs never restored → every kill+reopen fired a fresh Sonnet brief. Fix: parse the trailing 13-digit millis from the message id (brief-<win>-<date>-<millis>). Diagnostic logging in 403f781 surfaced the bug in one round; logging removed in ac04038.
Phase 63: Brief dedup on restore ✅ Session 27 (2 July early hours) — commit ac04038. The "brief re-firing" symptom was actually 7 briefs stacked in the persistence file from tonight's iteration tests. Dedup on restore keeps only the LATEST brief per window (highest millis in id); older briefs are stale time-of-day content. Save effect writes back clean single-brief array; self-healing across future cycles.
Phase 64: Splash Option C — first install override ✅ Session 27 (2 July early hours) — commit ac04038. Session 15 splash timing (6-9am/12-2pm/5-8pm windows only) was correct steady-state but hostile to first-time users. Added AsyncStorage flag splash_first_install_seen_v1: unset → fire regardless of time + set flag; set → respect original windows.
Phase 65: First preview EAS build LIVE ✅ Session 27 (2 July early hours) — new dev-client + icon + env vars all working end-to-end. Universal Links continue to route. Same bundle ID = update-in-place install (no duplicate icon, session persisted). Blueprint reusable for TestFlight (Phase 4b): eas submit --platform ios once we're ready for Anna's TestFlight round.

Phase 66: Stripe Phase 3b activation ⭐ ✅ Session 28 (10 July) — external activation completed: Stripe sandbox account (AU), two products with tax-inclusive prices (Family A$9.99 → price_1Tp3x30kUsgPd6wFSSOUucBW, Tutor A$7.99 → price_1Tp3xn0kUsgPd6wF7zonHLyo), Customer Portal (return https://zaeli.app), Supabase CLI installed + linked, both Edge Functions deployed (stripe-portal + stripe-webhook --no-verify-jwt), STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET secrets set, webhook endpoint registered with 6 events, test customer + metadata + subscription verified syncing to profile end-to-end.
Phase 67: Stripe client wiring ✅ Session 28 (10 July) — commit 0a250f3. lib/stripe.ts real fetchCustomerPortalUrl (JWT via session.access_token to Edge Function). STRIPE_PRICE_FAMILY + STRIPE_PRICE_TUTOR exports for future checkout. PRICE_TO_PLAN map populated in webhook with sandbox Price IDs. Edge Function RETURN_URL default swap zaeli://settings → https://zaeli.app (Stripe rejects custom schemes in dashboard-level config).
Phase 68: Stripe webhook current_period_end fix ✅ Session 28 (10 July) — commit 5f0f622. Stripe moved current_period_end from Subscription to items level around API 2024-06-20. syncSubscription now reads sub.current_period_end first, falls back to sub.items.data[0].current_period_end. subscription_renews_at populated correctly after resend.
Phase 69: Calendar phantom-event fix ⭐ ✅ Session 28 (10 July) — commit b5a06fa. Supabase .insert() returns { error: null, data: null } on silent RLS block (e.g. current_family_id() momentarily null during auth race). Old code checked only `if (error)` → false-positive success → Zaeli confidently confirmed events that never landed in DB. Fix: .insert(row).select('id').maybeSingle() and check data?.id. TOOL_FAILED with honest message if no ID returned. Same treatment for recurring batch case. Diagnostic logging added: [calendar-add] input params + assignee resolution + inserted OK/failed. Verified working on device.
Phase 70: Splash blue flash reduction saga ✅ Session 28 (10 July) — five attempts: df9e445 (top-level splash config), c10ae4c (Fabric Stack contentStyle wrapper), 2553c3e (explicit ios.splash + dark variants), 1b5fa48 (expo-system-ui plugin + SystemUI.setBackgroundColorAsync), ba638a4 (onLayout-gated hideAsync + fade — THE mostly-fix). Reduced flash from clearly visible ~500ms to barely visible <100ms flicker. Full elimination would need WSL for storyboard inspection. Parked as cosmetic.
Phase 71: MoreSheet Settings icon clip fix ✅ Session 28 (10 July) — commit 3ea23d4. IcoSettings gear teeth strokes were touching viewBox 24x24 edges with strokeWidth 1.7, half-stroke rendering outside canvas caused subtle clip at bottom-right tile. Fix: viewBox="-1 -1 26 26" for 1 unit padding on each side. Icon same visual size, no clipping.

Phase 72: Tutor math accuracy — three-layer defence ⭐ ✅ Session 29 (13 July) — commit 92a35d4 (part). tutor-session.tsx. Layer 1: anti-sycophancy prompt rules ("verify the answer yourself before agreeing"). Layer 2: hidden `<expected>N</expected>` marker Sonnet emits after every question, stripped from user-visible display. Layer 3: lastExpectedAnswer state extracted per turn, LAST_EXPECTED_ANSWER injected into system prompt on next call. Fixes "12 is correct for 84÷7" and "360 is correct for 15×24" bugs. Single-layer fixes fight training bias; three layers together give accuracy.
Phase 73: Pantry data + "yesterday" fix ✅ Session 29 (13 July) — commit 92a35d4 (part). Pantry rows added to buildContext (top ~40 items). New PANTRY RULES prompt block ("check pantry before saying we don't have X"). Zaeli stops fabricating absence. Plus fmtLastBought bug: Math.round on ms diff misread sub-24h difference as "1 day = yesterday". Fix normalises both dates to midnight local before diffing.
Phase 74: Multi-photo receipt scan + in-sheet UX ✅ Session 29 (13 July) — commit 92a35d4 (part). scanFromSheet — allowsMultipleSelection true (up to 4 photos), all batched into ONE Sonnet call with multi-page aggregation prompt. UX no longer navigates to Chat: new state shopScanBusy + shopScanBusyLabel + shopScanResult drives in-sheet progress banner + result toast. User stays in Shopping.
Phase 75: Dashboard reshuffle + welcome copy ✅ Session 29 (13 July) — commit 92a35d4 (part). Card order: Calendar → Shopping → Bento (Weather+Noticed) → On the Radar → Meal Planner (was Calendar/Meals/Bento/Shopping/Radar). Reflects honest priority — Meals bottom because least frequently used in a busy family. "Welcome In" → "Welcome!" resolves Anna's confusion feedback.
Phase 76: Owner onboarding gate ✅ Session 29 (13 July) — commit c02bba0 (part). app/_layout.tsx route guard checks AsyncStorage.getItem('onboarding_complete') for owner accounts, routes to /onboarding if unset. Adult/kid invitees skip (they have inline onboarding via /invite/[token]). Grandfather clause: profiles >24h old auto-stamp the flag so pre-gate users don't get bounced.
Phase 77: Dynamic user name in briefs ✅ Session 29 (13 July) — commit c02bba0 (part). buildBriefContext reads getProfile()?.name?.split(/\s+/)[0] as primaryUser. buildSystemPrompt templates ${primaryUser} where "Rich" was hardcoded (7 spots — "helping X today", "X has it handled", "X runs a family", "Makes X feel capable", morning/evening examples, winning mantra). computeSignature includes primaryUser so cached briefs don't leak names across users. NOTE: creates cache invalidation between family members — 2 adults = ~240 briefs/month not 120. Real fix at scale: per-user brief cache (Phase 85).
Phase 78: Sign-in default flip ✅ Session 29 (13 July) — commit 15529b8. Default mode 'sign-in' → 'sign-up' (new users vastly outnumber returning users on that screen). Sub copy genericized for both modes.
Phase 79: Stripe alert cleared ✅ Session 29 (13 July) — commit 916f2ab. Settings Manage subscription "Coming soon — Stripe integration is being wired up" alert removed now that Session 28's Stripe is live. Real Customer Portal opens via fetchCustomerPortalUrl.
Phase 80: Beta grant infrastructure ✅ Session 29 (13 July) — profiles.beta_end_date column added (nullable timestamp). lib/stripe.ts getSubscription checks beta first; isFamilyInBeta helper (sync). lib/family-roster.ts beta override — kids get tutor_active=true while family in beta. TutorSidebar uses isFamilyInBeta to unlock locked children. No phantom Stripe state — beta is a parallel truthful signal. When beta ends, real Stripe state takes over cleanly.
Phase 81: API cost fix — negative-cost bug + Sonnet caching on chat ⭐ ✅ Session 29 (13 July) — commit 0b65420. lib/api-logger.ts: input_tokens - cache_read - cache_write was wrong because input_tokens is ALREADY the uncached portion (three fields are disjoint). Fix: just sum. Haiku 4.5 pricing corrected $0.25/$1.25 → $1.00/$5.00 (4× too low). Added Sonnet 5 ($3/$15 with $2/$10 intro through Aug 2026) and Opus 4.8 ($5/$25) to PRICING for future migrations. index.tsx send(): added cache_control ephemeral to Sonnet tool-calling path (initial + previously-unlogged follow-up call, anthropic-beta prompt-caching-2024-07-31 header, cache-aware cost math both calls). Expected impact: home_chat A$0.02-0.04/call uncached → A$0.005-0.01/call cached repeat turns. At ~250 chats/mo/family: A$3.30 → ~A$0.50/family/mo. Difference between loss-making and 60% margin.
Phase 82: Meal planner pivot (working tree, uncommitted) 🔨 Session 29 (13 July) — Anna feedback: meal planning daily is friction no busy family sustains. Same category as brief "downer" pattern. DinnerCard label MEAL PLANNER → TONIGHT'S MEALS, empty-state CTA "Plan it →" → "See family regulars →", bottom button "Open Meal Planner →" → "Recipes & regulars →". Meal sheet tab order Meals/Recipes/Favourites → Recipes/Regulars/Plan (default opens Recipes). Label changes: Favourites → Regulars (honest not aspirational), Meals → Plan. Internal state keys unchanged for backwards compat. buildContext queries recipes WHERE 'favourite' IN tags → adds Family regulars line to LIVE DATA (12 hearted recipes with prep_mins). New MEAL IDEAS RULES prompt block: reach for regulars FIRST on "quick dinner?" queries, cross-check pantry, never nudge to plan. dinnerRule softened.
Phase 83: Calendar bulk-paste max_tokens bump (working tree, uncommitted) 🔨 Session 29 (13 July) — Anna's 10-event newsletter paste dropped the 10th event. Diagnosis: api_logs showed output_tokens exactly 800 (the ceiling). Each add_calendar_event tool_use block ~80 tokens; 10 × 80 + preamble ≈ 800 → truncated mid-10th block → malformed JSON silently dropped by client parser → never became a DB insert. Fix: max_tokens 800→2000 (initial) and 500→1500 (follow-up). Zero cost impact unless Sonnet uses the extra ceiling. Now handles ~20 events in one paste.
Phase 84: Admin console Session 29 refresh ✅ Session 29 (13 July) — source-of-truth moved to app/(tabs)/zaeli-admin/index.html (Downloads copy will always drift). Comprehensive fixes: wordmark accent yellow → sky #A8D8F0, Sonnet model ID claude-sonnet-4-20250514 → claude-sonnet-4-6, price sliders default A$9.99/A$7.99 (was 14.99/9.99, slider ID sl-hw-price → sl-tutor-price), COST_BRIEF 0.00065 → 0.0050 (Sonnet not GPT), break-even card replaced with per-family margin (old math was nonsense at small user counts), real subscription state in Accounts table (reads profiles.beta_end_date + subscription_status), owner name + email + member count, memory system health card (queries family_insights + family_milestones + conversation_memory counts, warns if conversations > 0 but insights = 0), SQL snippet in Settings for enabling anon SELECT policies (with caveat), double-$ display bug fix (13 rows: A$$${...} → A$${...}), cost breakdown labels (Chat "GPT-5.4 mini + Sonnet 4.6 for tool calls" reflects both paths, Briefs "Sonnet 4.6, prompt caching", Homework → Tutor), slider defaults reset to Anna's real usage (briefs 420→240, chat 300→250, scans 90→15).
Phase 85: Per-user brief cache 🅿️ QUEUED — scale trigger: past 100 families. DB migration on zaeli_briefs (currently unique on family_id+date+window+data_signature; add user_id to unique constraint). Would eliminate the Session 29 cross-user cache invalidation caused by primaryUser in signature. Deferred because at current scale the additional Sonnet calls are still cheap with prompt caching.
Phase 86: Sonnet 5 migration 🅿️ QUEUED — intro pricing $2/$10 through Aug 2026 makes Sonnet 5 CHEAPER than Sonnet 4.6. Better instruction following would compound today's anti-sycophancy fixes (Phase 72). Deferred until Anna beta settles — don't migrate during active user testing.

Phase 87: Family push notification infrastructure ⭐ ✅ Session 30 (14 July) — commit 8bbf7e3. supabase-push-tokens.sql (profiles.expo_push_token nullable indexed). Edge Function supabase/functions/family-notify/index.ts (JWT-verified, family-boundary-enforced — sender's family_id MUST match every recipient's family_id else 403, batches to Expo push API https://exp.host/--/api/v2/push/send, silent-skips recipients without token). lib/notifications.ts registerPushToken/unregisterPushToken/notifyFamily. app/_layout.tsx fire-and-forget register after auth. index.tsx: Notify chip on calendar confirm inline cards + send_family_message tool (fuzzy roster name matching via resolveAssigneeId, "family"/"everyone" shortcuts, CAPABILITY_RULES updated).
Phase 88: Spend Processing overlay ✅ Session 30 (14 July) — part of commit 8bbf7e3. Follow-on to Session 29 in-sheet scan UX. Full-screen dark backdrop overlay in Shopping Spend tab with ActivityIndicator + "Processing..." + rotating status label ("Reading receipt", "Updating pantry", "Saving to spend"). Silent success (receipt appears in list). Errors via Alert.alert.
Phase 89: Tutor Play icon removed ✅ Session 30 (14 July) — part of commit 8bbf7e3. Play icon removed from Zaeli action row in tutor-session (matches home chat where already removed). Small consistency polish.
Phase 90: Multi-photo chat upload ⭐ ✅ Session 30 (14 July) — commit e6c8ea6. pendingImage: string | null → pendingImages: string[] with MAX_CHAT_PHOTOS = 4 cap. Additive Camera/Photos pickers. Horizontal thumbnail strip above chat bar with per-photo ✕. send(text?, overrideImages?: string[]) signature. ONE Sonnet call for ALL images with multi-photo aggregation prompt (both tool path and pure-vision path attach all imageParts). Msg.imageUris?: string[] added alongside legacy imageUri (backwards compat with persisted messages). Chat feed renders horizontal grid for 2+ photos (110×110, 6px gaps). Same pattern as Session 29 receipt scan.
Phase 91: Stripe checkout testability ✅ Session 30 (14 July) — part of commit e6c8ea6. New Developer row "💳 Test Stripe checkout" force-opens Payment Link even when beta grant hides Subscribe button. Rich testing infrastructure — everything else was already wired Session 28. Lets Rich exercise full checkout return path (Safari → payment → back to app → foreground refresh reloads profile → subscription card updates).
Phase 92: Foreground profile refresh ⭐ ✅ Session 30 (14 July) — part of commit e6c8ea6. _layout.tsx AppState.addEventListener('change', ...) reloads profile on background→active transition for any signed-in user. Critical for Stripe checkout return path — otherwise subscription card is stale until force-restart. Generalisable pattern for any per-user state that can change out-of-app.
Phase 93: Kids Trivia answer-in-question guard ⭐ ✅ Session 30 (14 July) — commit 34b57eb. Duke saw "Which sport is played with a round ball and goals, and is called soccer in many countries?" answer "Soccer". Three-layer defence (same pattern as Session 29 tutor math): (1) prompt rule "never include the answer or a paraphrase in the question", (2) BAD/GOOD examples inline in prompt, (3) client-side word-boundary regex filter checks 4+ char answer words against question text, drops self-revealing questions.
Phase 94: Cold-start splash latency fix ⭐ ✅ Session 30 (14 July) — part of commit 34b57eb. Anna feedback: 3s+ splash on foreground return after iOS jetsammed app. Root cause: await loadProfile() blocking setAuthed in cold-start useEffect (Supabase network 1-2s decent, 3s+ flaky). Fix: setAuthed IMMEDIATELY once session verified (fast AsyncStorage read), kick loadProfile in background. Route guard already tolerates null profile (owner default from Session 21). Cuts splash ~2s.
Phase 95: expo-notifications plugin discovery ⭐ ✅ Session 30 (14 July) — commit 6eab45a. CRITICAL DISCOVERY. Root cause: app.json plugins array had no expo-notifications entry. Without it, iOS never gets aps-environment entitlement → getExpoPushTokenAsync throws at boot → the .catch(() => {}) in _layout.tsx swallows silently → profiles.expo_push_token stays null forever. Local scheduled notifications (briefs) still worked because they don't need APNs — that's what confused diagnosis. Fixes: added expo-notifications plugin with icon+color config, replaced silent catch with .catch(e => console.log('[push] register threw:', e?.message)) so future failures surface in logs, added Developer row "🔔 Register push token now" that manually triggers + shows result via Alert.
Phase 96: Verbose push token diagnostic ✅ Session 30 (14 July) — commit dcb263b. Previous "returned null" Alert was too coarse. New debugPushToken() returns structured state: { step: 'auth'|'permissions'|'getExpoPushTokenAsync'|'db-write'|'done', detail, userId, permission, projectId, token (first 20 chars for privacy), dbWrite: 'ok'|'error'|'skipped', error }. Developer row Alert shows the full state block so actual failure step surfaces without another guess-and-rebuild cycle.
Phase 97: EAS Starter plan upgrade ✅ Session 30 (14 July) — external (Rich upgraded mid-session). Free tier build cap (15 iOS/mo) hit during rapid push diagnostic iteration. Starter = 14 iOS builds/mo tier. Cost implication: shipping cycle no longer bottlenecked by build quota during active beta testing rounds. Documented: eas build (creates .ipa) and eas submit --platform ios --latest (uploads to App Store Connect → TestFlight) are SEPARATE commands. Preview profile = internal distribution only. Only production profile is App-Store-distributable.
Phase 98: GIPHY EAS env var 🔨 NEXT — Kids Hub rewards GIFs failing in standalone builds because EXPO_PUBLIC_GIPHY_API_KEY sits in local .env but never added to EAS Environment Variables. Same Session 27 pattern as the other 4 EXPO_PUBLIC_* keys. Rich needs to add via expo.dev UI as Sensitive visibility for Preview + Production before Kids Hub GIFs render on standalone builds.
Phase 99: Website v5 rewrite 🅿️ PARKED — 4-round plan drafted (correctness pass with new pricing → beta framing → chat mockup refresh → new sections). Deploy to zaeli.app (replacing current orb splash). ~1 day of work total.
Phase 100: Outlook/Gmail calendar sync 🅿️ PARKED — discussed and agreed not urgent right now. Revisit if Anna asks twice.
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
- CHAT_MODEL = 'gpt-5.4-mini' · NOTICED_MODEL = 'gpt-4o-mini' (never swap these)
- NEVER pass fabActive/setFabActive as props from swipe-world unless certain input bar is outside ScrollView
- ALWAYS add console.log before attempting any touch/send fix
- useFocusEffect does NOT fire on swipe in swipe-world — use isActive prop + useEffect instead
- Dashboard + Chat both need isActive prop from swipe-world for data refresh
- Chat bar must NOT have onTouchEnd focus handler on barPill
- Mic in chat = startRecording()/stopRecording() directly (FAB is unmounted on chat page)
- FAB mic transcript passes via pendingMicText prop through swipe-world to chat
- swipe-world keyboardShouldPersistTaps = "handled" (NOT "always")
- Tool CAPABILITY_RULES must explicitly say update vs add, meal vs calendar
- Meal add_meal tool checks for date clashes — returns CLASH: warning, never auto-swaps
- All edits go to C:\Users\richa\zaeli (NOT the worktree) — Expo runs from main folder
- personal_tasks table = member-scoped (NOT family-scoped)
- budget_transactions table = family-scoped
- zaeli_briefs table = family-scoped (one brief per family per time window per day)
- Date rule for all dates: bare local YYYY-MM-DD, never toISOString()
- What If mode = zero Supabase writes, nothing persisted, amber banner always visible
- Our Budget upload: privacy rule — raw statement content never stored
- Brief model = SONNET always · Chat model = gpt-5.4-mini · Noticed model = gpt-4o-mini
- **Brief system = 2 windows** (Session 19 — reduced from 3). Morning 05:00–15:59 "here's your day" · Evening 16:00–04:59 "today's wrap + tomorrow's shape". Midday removed. Evening now carries tomorrow-morning prep (dinner plans, pack-ahead) so morning brief doesn't need to. Never add a third brief window — notification burden isn't justified.
- Our Budget = PURE PLANNER (Session 17) — NEVER live tracking. No "spent this month" numbers. No transaction ledger. Uploads produce suggestions (ephemeral) or line items (accepted), never a running spend total.
- Our Budget Fixed categories = line items (auto-sum). Variable categories = single `monthlyTarget`. Never mix.
- Our Budget tab = "Savings" NOT "Goals" (Session 17 rename). Individual items still called "goals".
- Our Budget accent = Mint (Meals palette): `#2D7A52` deep / `#B8EDD0` mint / `#E6F7EF` tint / `#C8F0DA` border. Savings cells = sky `#A8D8F0`. Over state = peach `#FAC8A8` + `#8A3A00` brown text. Never red/alarm.
- Standard page label rule: `Poppins_700Bold · 17px · rgba(10,10,10,0.72)`. Never 14/18 or 0.32/0.35.
- Wordmark rule: `Poppins_800ExtraBold · 40px · letterSpacing -1.5 · lineHeight 46`. Always.
- NEVER declare sub-components (JobsTab, etc) inside a parent and render as `<X />` — kills keyboards. Either hoist out OR call as function `{X()}`.
- Brief system has ONE generator now: `generateBrief` from `lib/brief-generator.ts`. NO local function by that name inside index.tsx — would shadow the import silently.
- `tryFireBrief` pushes a loading placeholder message IMMEDIATELY (peach bubble + TypingDots), updates in place on Sonnet return. Never a blank screen during brief generation.
- Calendar keyword trigger list = intent-bearing phrases only. Bare time refs ("next week", "today", day names) DO NOT trigger calendar routing on their own — narrative usage must pass through chat.
- Module-level nav flags pattern (for tab→tab back-routing): use `lib/navigation-store.ts` setters/consumers. Router params unreliable across tab routes.
- `@react-native-community/datetimepicker` used for time + date pickers (inline spinner on iOS, native dialog on Android).
- Settings prefs stored in AsyncStorage under `zaeli_settings_prefs_v1` (pre-backend pass).
- Travel = STANDALONE full-screen route (not 92% sheet — too much depth). Wordmark `a+i` = sky `#A8D8F0`, primary = ocean deep `#0060A0`. Segmented tabs (Overview/Bookings/Packing/Notes).
- Travel Budget = PURE PLANNER (Session 18) — total budget set by user, Booked auto-sums booking amounts, no manual "spent". Same reason as Our Budget.
- BookingSheet in Travel is unified — one component handles add (`payload: 'new'`) and edit (`payload: Booking`). Delete button lives inside edit mode.
- **SheetShell pattern** (use this for any 92% bottom sheet with text inputs): `Modal > View backdrop > View card > KAV inside card wrapping only body`. Never wrap the whole Modal with KAV — fixed-height card gets shoved off screen. Also add `keyboardShouldPersistTaps="handled"` to the body ScrollView.
- **Brief = 2 windows ONLY** (Session 19) — morning (05:00–15:59) + evening (16:00–04:59). Never reintroduce midday. Evening covers tomorrow-morning prep.
- **Brief render = Option B** (Session 19) — soft tinted bubble (peach morning #FDF1E5 / lavender evening #F0EBFF) + time-of-day pill (☀️ MORNING peach `#FAC8A8`/`#8A3A00` or 🌙 EVENING lavender `#D8CCFF`/`#5020C0`) + structured 3-paragraph prose. NO win banner. NO border on bubble. Eyebrow simplified to `Zaeli · time` (window context lives in pill, no redundancy).
- **Brief generator format** (Session 19) — strict 3-paragraph: `[OPENER]` (1 line + 1 emoji) / `[BODY]` (2-3 sentences with specifics + optional emoji) / `[ONE THING]` (single nudge + emoji). Max 100 words. 1 emoji per paragraph max (so 2-3 across whole brief). Quiet-day mode collapses to opener + one thing.
- **Splash = warm bg + palette orbs** (Session 19) — both onboarding (`WelcomeStep` + `ReadyStep`) and cold-start (`swipe-world.tsx`) use `#FAF8F5` bg with peach/mint/lavender/sky orbs. INK wordmark, sky `a+i`, "Less **chaos**." in coral. Native splash bg in `app.json` is `#FAF8F5` — requires `npx expo prebuild --clean` after change.
- **Wordmark lineHeight rule** — for sizes 92px+, set `lineHeight` to `fontSize + ~28` AND `paddingTop: 12-14` so the i-dot doesn't clip. (Original 96-on-96 chopped the dot.)
- **Chat bubble unification** (Session 19) — Zaeli text wrapped in `s.zaeliBubble` (bg `rgba(10,10,10,0.04)`, radius 18, BBL 6, padding 13/16, alignSelf flex-start, maxWidth 90%). User bubble bg `#E8F4FD` (sky), shape radius 18 / BBR 6 / padding 11/15. Both texts: `Poppins_400Regular` 17px lineHeight 26. Identical font weight + lineHeight is the rule.
- **Tour state machine** = `lib/tour-state.ts`. AsyncStorage key `tour_state_v1`. Stop list lives in `STOPS` array. **Tutor is stop 7 = HERO** (violet accent, trial badge, 2 CTAs, price line). 11 stops total. Progress formula `((cur-1)/(TOTAL-1))*100` so stop 1 = 0% and stop 11 = 100%.
- **Tour pill = bottom-LEFT** (`left: 16`). Right side reserved for chat scroll up/down arrows. Visible only when `isInProgress()`.
- **Tour offer chip handler** must call `replayFromStart()` BEFORE navigating to `/tour` — otherwise stale `currentStop = 'finale'` from prior runs lands the user on the finale screen.
- **First-time tour banner inside sheets** uses `<TourBanner sheetKey="..." message="..."/>` — per-sheet AsyncStorage flag `tour_banner_seen_<key>`. Only renders if `tourInProgress()` AND not previously dismissed.
- **Invite state** = `lib/invite-state.ts`. AsyncStorage key `invite_state_v1`. Mock 6-char token. Real Supabase-backed token validation comes with backend pass.
- **Account state** = `lib/account-state.ts`. Three kinds: `owner` (Rich, default) / `adult` / `kid`. AsyncStorage key `account_state_v1`. Used for permission gating in MoreSheet.
- **Invites = Adult or Kid only** (Session 19). Adult = full access. Kid = full access EXCEPT Our Budget + Our Family management. No granular roles for v1.
- **Invite delivery = iOS share sheet only** (`Share.share({ message, url })`). Recipient = any device. SMS link → App Store → deep-link. Backend pass adds real cross-device.
- **Trust the link** — accepting an invite = joined. No approval flow on inviter side.
- **Inviter heads-up message must clear flag SYNCHRONOUSLY** before message-pushing setTimeout — concurrent mount + focus calls would double-fire. Same pattern for `markResumePromptShown()` on tour inactivity.
- **Adult invitee onboarding** = 4 steps (welcome / account / rhythm / preferences). Sets `onboarding_complete` + `onboarding_just_completed` flags + `setAccount({kind:'adult'})` → routes to chat → tour offer auto-fires.
- **Kid invitee onboarding** = 3 steps (welcome / avatar+PIN / capability intro). Sets `onboarding_complete` + `setAccount({kind:'kid', name, avatar})` → routes to `/(tabs)/kids`. PIN instead of password.
- **MoreSheet kid gating** — `loadAccount()` on each visible-true, `isKidAccount()` hides Budget + Family tiles. NOTE: doesn't gate direct route navigation yet — kid could type `/our-budget`. Defer to Phase 36.
- **Status badge sizing rule** (Family screen) — `fontSize: 11px+`, `padding: 10×5+`, `borderRadius: 8+`, `letterSpacing: 0.2`. Action chips (tappable) bumped to `fontSize: 12`, `padding: 12×7`, `borderRadius: 10`, filled mint pill bg with white text, `hitSlop: { top: 10, bottom: 10, left: 10, right: 10 }`. Never use `fontSize: 9`.
- **Onboarding finale → tour handoff** — `finishOnboarding()` sets BOTH `onboarding_complete` AND `onboarding_just_completed`. Chat `maybeFireTourOffer()` reads + clears the latter on mount, pushes tour offer message with chips ['🧭 Take the tour', 'Maybe later'].
- **Kid tour skips Budget + Family** (Session 19 quick wins) — `lib/tour-state.ts` exports `getEffectiveStops()` / `getEffectiveTotal()` filtered by `isKidAccount()`. ALL tour navigation (advanceStop, goBackStop, getProgressPct, replayStop) and ALL surfaces showing tour totals (chat pill, post-onboarding offer text, inactivity prompt, Settings replay picker, tour route eyebrow + bottom nav) MUST use the effective list, not raw `STOPS`/`TOTAL_STOPS`. Stop IDs stay 1-11; kids just skip 9 + 11.
- **Kids Hub auto-jump for kid accounts** — on mount, if `isKidAccount()` and account name matches a known child, set `selectedChild` and `view = 'hub'` so kid skips the picker and lands directly in their hub.
- **Kid_just_joined welcome banner** — receiver flow `finishKid()` sets `kid_just_joined = 'true'` AsyncStorage flag. Kids Hub reads + clears on mount, shows lavender welcome card with × dismiss above the 3-stat row. One-shot only.
- **Kid account direct-route gating** — Budget + Family routes call `loadAccount()` on mount and `router.replace('/(tabs)/kids')` if `isKidAccount()`. Belt-and-braces with MoreSheet's tile hiding. NOT applied to Settings, Tutor, Travel, MySpace — kids may use those legitimately.
- **Supabase date queries — prefer range over eq** (Session 19 quick wins). If you write `.eq('date', dateStr)`, you'll silently miss any row where the column has a timestamp/timezone component. Always use `.gte(dateStr).lt(nextDayStr)` for single-day queries unless the column type is guaranteed bare DATE.
- **Tutor session resume** (Session 20) — pass `resumeSessionId` query param to `/tutor-session` route. `loadExistingSession(sid)` fetches session row + tutor_messages, hydrates state (messages, conversationHistory, sessionId, subject, topic, difficultyBand, questionNum, hintsUsed, timer), sets phase based on whether subject was picked, flips status 'completed' → 'active' so exit-save logic works on next back. Same pattern works for all 6 pillars.
- **Chat VIEW queries → inline cards** (Session 20) — for any data domain with an existing inline card render path (calendar/shopping/meals/todos), intercept "what's on..." queries in `send()` BEFORE the action path or GPT chat path. Pattern: keyword array → detection function (`isXxxViewQuery` — must check `isActionQuery` first to exclude actions) → branch in `send()` that fetches data + `updateMsg(replyId, { text, inlineData, quickReplies, isLoading: false })` + `return`. Never let GPT type out long lists.
- **SafeAreaView edges in Modal is unreliable on first render** (Session 20) — react-native-safe-area-context's `<SafeAreaView edges={['bottom']}>` doesn't always resolve insets on first render inside a Modal. For any element whose layout depends on bottom safe area, OWN the inset via `useSafeAreaInsets()` and apply `paddingBottom` directly. Don't rely on SafeAreaView alone.
- **Voice (ElevenLabs) AFTER backend pass** (Session 20 decision). Don't wire it now — would risk re-work when chat UX shifts. Only exception: brief-only voice (since brief render is locked).
- **SECURITY DEFINER functions calling `auth.uid()` MUST have `SET search_path = public, auth`** (Session 21 — single biggest lesson of the backend pass). Without it, `auth.uid()` silently returns NULL inside the function's `postgres` role context. Function appears to succeed but returns NULL/false from any policy that uses it. Cost us a half day of debugging "shopping list empty" when everything else looked correct.
- **State lib pattern is locked** (Session 21) — for any data that lives on a user-by-user basis (tour state, settings prefs, account state, etc): module-level cache for sync render reads + `loadX()` hydrates from `profiles.<col>` JSONB when signed in / AsyncStorage when not + `persist()` write-through to both. Used in `lib/tour-state.ts`, `lib/user-prefs.ts`. Future per-user state libs should follow this exact shape — public API matches what the lib used to do with pure AsyncStorage, so call sites don't change.
- **Receiver-side data lookups via anon-callable SECURITY DEFINER RPCs** (Session 21), not direct table queries. RLS would otherwise hide every row from `anon` role. Token IS the secret (same security model as Stripe idempotency keys / password reset links). Example: `lib/invite-state.ts` `lookupInviteByToken()` + `acceptInviteRemote()` both hit `get_invite_by_token` / `accept_invite` RPCs with `GRANT EXECUTE TO anon`.
- **Supabase SQL editor only shows the LAST query result** when running multiple queries together (Session 21). Run verification queries individually if you need to confirm each. Earlier queries DID execute — Postgres would error loudly if they failed.
- **`pg_class.relrowsecurity = true` with no policies = deny-everything** by default (Session 21). When debugging "everything's empty" symptoms, always verify both RLS-on AND policies-exist via `SELECT polname FROM pg_policy WHERE polrelid = 'public.<table>'::regclass`.
- **For SQL backfills that need to bypass RLS during dev** (Session 21): `ALTER TABLE x DISABLE ROW LEVEL SECURITY` → `UPDATE x SET ...` → `ALTER TABLE x ENABLE ROW LEVEL SECURITY`. `SET LOCAL row_security = off` does NOT work for non-postgres roles. SQL editor's own role enforces RLS on UPDATE, so silent zero-affected-rows is the silent failure mode.
- **Chat bar photo-only send must work** (Session 21) — `pendingImage` state has a thumbnail preview above the bar (64px + ✕ dismiss + "Photo ready — tap send"). Send button opacity check + tap guard must allow `pendingImage` alone (no text required). `send('')` with `pendingImage` triggers the existing image-handling path in send().
- **Trigger-based invitee signup** (Session 22) — `handle_new_user()` is the single place that branches on `invite_token` in `raw_user_meta_data`. Client just calls `signUpFromInvite()` with metadata; trigger validates + creates profile linked to inviter's family + marks invite accepted in one transaction. If token is invalid/revoked/already accepted, trigger raises → auth.users INSERT rolls back → no orphan users. Never bypass this — DON'T accept invites client-side then try to fix the family link after.
- **Kid invitee signup = synthetic email + token+PIN password** (Session 22) — kids don't have email. Format: `kid-<token>@invitees.zaeli.app` + password `<token>-<PIN>` (≥6 chars for Supabase). They stay signed in via AsyncStorage session persistence. Kid sign-IN ergonomics on separate devices come in a later phase.
- **All module caches MUST be invalidated on auth change** (Session 22) — `_layout.tsx` `onAuthChange` is the single place this happens. Currently calls `invalidateAccount()` + `invalidateTourCache()` + `invalidatePrefsCache()` + `resetCache()` (invites) on both SIGNED_IN AND SIGNED_OUT. Future per-user state libs (memory wiring etc) MUST add their `invalidateCache()` to this list — otherwise the previous user's data silently leaks to the new user.
- **When signed in, profile JSONB is the ONLY source of truth** for per-user state libs (Session 22) — tour-state + user-prefs do NOT fall back to AsyncStorage when there's a session, even if profile.X is null (fresh user = start clean with DEFAULT). AsyncStorage fallback ONLY fires when there's no session (pre-auth flows like kid receivers mid-onboarding). Without this, fresh user inherits previous user's data silently.
- **Chat persistence files are scoped per-user by Supabase user id** (Session 22) — `useChatPersistence` subscribes to `supabase.auth.onAuthStateChange`, includes userId in filename (`zaeli_chat_home_<userId>.json` or `_anon`). When user changes, scopedKey changes, state resets, new file loads. Previous user's file stays on disk but invisible to new user. Also: local `messages` state in index.tsx resets via `chatLoaded` true→false→true transition detection.
- **Heads-up filter = inviter-only** (Session 22) — `recentlyAcceptedInvites()` filters by `inviter_user_id === currentUserId` (NOT `accepted_user_id !== currentUserId`). Only the actual sender of the invite sees "X just joined". Other family members don't. Fail-closed: returns `[]` if profile not loaded yet.
- **Fresh invitees suppress the family brief on first session** (Session 22) — chat mount effect checks `onboarding_just_completed === 'true'` AND `getProfile()?.kind !== 'owner'`. If both: skip `tryFireBrief`, push warm welcome message ("Hey <name> 👋 Welcome in. Family stuff is already wired up — you'll get your first proper brief tomorrow morning."). Flag cleared by `maybeFireTourOffer` so subsequent sessions show normal brief. Mid-context family brief ("bins go out tomorrow") is jarring as someone's first-ever Zaeli message.
- **Adult invitee signup form validates client-side** (Session 22) — Continue button disabled until email matches `/^\S+@\S+\.\S+$/` AND password length ≥ 6. Otherwise sign-up fails 3 steps later in a confusing alert.
- **Family brief is family-scoped, not user-scoped** (Session 22 distinction) — when a new family member sees the family brief on second-session-onwards, that's NOT a leak. The brief is keyed by `family_id + date + window` in `zaeli_briefs`. All family members see the same brief. The Session 22 welcome polish is a UX layer on first session only.
- **Test workflow gotcha — "nested invites"** (Session 22) — the dev row "Open latest invite as receiver" signs you in as the new invitee. If you then create another invite WITHOUT signing back in as the owner, the new invite's `inviter_user_id` is that invitee's id (not yours). Heads-ups won't fire for the owner because the owner isn't the inviter. Always sign back in as the intended inviter before creating each test invite.
- **Memory loop = 3 gated parts** (Session 23) — recall (`buildMemoryContext` → chat system prompt in `buildContext`), capture (`saveConversation` per exchange via `captureMemory`), extract (`detectInsightsFromConversations` every 6 exchanges, fire-and-forget Sonnet call). ALL gated by `memoryLearningOn` pref. When adding new chat completion paths, remember to call `captureMemory(userText, replyText)` there too — it's currently wired at general-chat, tool (both branches), and calendar-confirm early-return.
- **Insight extraction reads `conversation_memory`, NOT `pattern_log`** (Session 23) — `detectInsightsFromConversations` is the "learn from chats" engine. `detectAndSavePatterns` reads pattern_log (still unused — `logPatternEvent` never called). Don't confuse the two; the toggle says "learn from chats" so conversations are the source.
- **detectInsightsFromConversations only extracts DURABLE facts** (Session 23) — recurring routines, stable preferences/allergies/standing commitments. Never one-off events, single-date scheduling, or chit-chat. Sonnet prompt enforces this; returns [] if nothing durable. writeInsight dedupes + bumps confidence on repeats.
- **View-mount data effects re-fetch on every entry** (Session 23) — never gate a view's data load on a `loaded` flag that persists across entries. The Memory view's first (empty) load stuck because `if (view==='memory' && !memory.loaded)` never re-ran. Use `if (view === 'memory')` and let "Loading…" show only when `!loaded`.
- **Brief notifications = expo-notifications local, daily recurring** (Session 23) — `scheduleBriefNotifications` in `lib/notifications.ts`, stable ids `zaeli_brief_morning`/`_evening`, idempotent (cancel + re-add). Scheduled in `_layout.tsx` after auth; re-scheduled in `settings.tsx` `updatePref` when any brief time/toggle changes (use the fresh `next` values from the state updater, not the closure's stale `prefs`). Permission denial is non-fatal — briefs still fire in-app on chat open.
- **Notification = nudge, brief = content** (Session 23) — the OS notification fires at the user's set time; the in-app brief is once-per-window-per-day. Tapping a notification when the brief already fired does NOT duplicate (tryFireBrief already-fired guard). They can be out of sync — acceptable.
- **Invite link formats** (Session 23) — `zaeli://invite/<token>` (custom scheme, works today via QR/Notes/Messages) for dev + cross-device testing; `https://zaeli.app/i/<token>` (Universal Link) for production once the domain + apple-app-site-association are live (Phase 3c). Copy-link button currently copies the `zaeli://` form. iOS Safari blocks typing custom schemes in the address bar — use Notes/Messages or Camera-scan-QR.
- **Custom URL scheme already configured** — `app.json` has `"scheme": "zaeli"`, so Expo Router auto-routes `zaeli://invite/<token>` → `/invite/[token]`. No native change needed for the scheme itself; only Universal Links (associatedDomains entitlement) need a rebuild.
- **Family roster = `lib/family-roster.ts`, DB-backed** (Session 24) — NEVER reintroduce a hardcoded `FAMILY_MEMBERS` array. Read members via `getRoster()` (sync cache) / `getMemberById()` / `getMemberByName()`. Screens load via `loadRoster(getFamilyId())` + a version-bump state to re-render. Cache invalidated in `_layout.tsx` on auth change. Supports up to `MAX_FAMILY_MEMBERS` (8).
- **Calendar assignees are real `family_members` UUIDs** (Session 24) — NEVER use the old numeric ids ('1'-'5') or a NAME_TO_ID map. Resolve names → UUIDs with `resolveAssigneeId(name)` (fuzzy: exact / name-prefix / query-prefix). New-event default assignee = `defaultAssigneeIds()` (signed-in user). Tool schemas ask the model for first names, not ids.
- **Current-user identity comes from the profile** (Session 24) — Settings hero, invite inviter name, etc. read `getProfile()`. No hardcoded "Rich" for *identity*. (The roster member *names* are separate seed data, now in `family_members`.)
- **Memory is BACKGROUND KNOWLEDGE, the calendar is the source of truth** (Session 24) — `buildContext()`'s memory block is explicitly labelled background (likes/routines/patterns). Zaeli must never claim something is "already locked in / booked / scheduled" from a memory insight. Keep this framing if you touch the memory injection — a "Poppy enjoys dance" preference must not become a phantom calendar event.
- **Recurring events = generated instances** (Session 24) — `add_calendar_event` with `repeat` + `repeat_days`. `generateRecurrenceDates()` produces a ~12-month horizon (capped 400 rows). All instances share a `uuidv4` `repeat_group_id` + `repeat_rule`. NOT a rule+expand-on-read engine — every calendar surface reads concrete rows. Multi-day weekly via `repeat_days: ["mon","tue","fri"]`.
- **Recurring series operations** (Session 24) — `update_all` (apply title/notes/assignees to every instance), `delete_all` (cancel series), `extend_recurring_event` (roll on ~12 months). All target by `repeat_group_id` (fallback title+future). Date/time changes stay per-instance. CAPABILITY_RULES tells Zaeli recurring IS supported + when to use each flag.
- **Recurring "ending soon" → morning brief only** (Session 24) — `buildBriefContext` groups future recurring instances by `repeat_group_id`, flags any whose last date is within 6 weeks into `FamilyContext.endingSoonSeries`; the morning brief offers a one-line roll-on. Never spam other windows.
- **Calendar inline confirm card is date-aware** (Session 24) — `InlineData.initialTab` + `dateLabelOverride`; the add-confirm card shows the event's real day (today bucket / tomorrow tab / explicit "TUE 2 JUN" label), never always "TODAY".
- **calendar.tsx month view loads from the displayed month forward** — `loadEvents` queries `date >= firstOfDisplayedMonth`. A past-month event won't appear when viewing a later month (by design). If "an event is missing", check which month is displayed before assuming a data bug.
- **Universal Links are the production invite path** (Session 25) — `https://zaeli.app/invite/<token>` served via Netlify with `apple-app-site-association` at `/.well-known/`. The `zaeli://` custom scheme is dev-only now. `INVITE_LINK_BASE` in `lib/invite-state.ts` is `zaeli.app/invite/` (matches the Expo Router `/invite/[token]` route — the path MUST match exactly for iOS to route the tap into the app). Copy Link + Resend share generate the https form.
- **AASA file MUST be served with `Content-Type: application/json`** (Session 25) — Netlify's default for extension-less files is `application/octet-stream`, which iOS silently rejects. Universal Links then never activate and there is no error message. The `netlify.toml` `[[headers]]` block for `/.well-known/apple-app-site-association` is mandatory. Verify with `curl -I https://zaeli.app/.well-known/apple-app-site-association` — must see `content-type: application/json`.
- **Cloudflare DNS for AASA host = grey cloud (DNS-only), NOT orange cloud (proxied)** (Session 25) — Cloudflare's orange-cloud proxy can rewrite Content-Type headers on extension-less files, which breaks Universal Links exactly the same way. Keep grey cloud until you write a specific Cloudflare Rule bypassing proxy on `/.well-known/apple-app-site-association`. Even then, test with curl before assuming it worked.
- **iOS Universal Link path must EXACTLY match** the AASA `components` pattern (Session 25) — AASA declares `"/": "/invite/*"`. Links generated by the app therefore MUST be `zaeli.app/invite/<token>`. When we had `/i/<token>` in the app but `/invite/*` in the AASA, iOS opened Safari instead of the app because the paths didn't match.
- **Apple Team ID `V37VPTPKQ8`** captured in AASA (`well-known/apple-app-site-association` in the deploy repo) + `app.json` (via bundle ID association). If it ever changes (app transfer, new dev account), update the AASA + rebuild the app.
- **Native entitlement changes require a new EAS build** (Session 25) — `associatedDomains`, HealthKit, background modes, camera capabilities, etc. Metro can't hot-reload iOS entitlements. Every entitlement change = `eas build`. Budget the wait time (~15-30 min cloud build).
- **EAS authenticates with regular Apple ID password + 2FA code**, NOT an App-Specific Password (Session 25) — Fastlane uses the Developer API which expects your normal credentials. App-Specific Passwords are for third-party services accessing iCloud data, not Apple's own Dev tools. Save yourself the confusion — regular password.
- **Same bundle ID = update-in-place on iOS**, no duplicate app icon (Session 25) — new EAS build with `com.zaeli.app` overwrites the previous install, keeps AsyncStorage (session survives). Only bundle-ID changes create a second app on the phone.
- **Stripe activation is Richard's move** (Session 25) — code + SQL + Edge Functions committed, but nothing goes live until Richard finishes stripe.com setup (products with Australian pricing, Customer Portal config with `zaeli://settings` return URL, Price IDs, webhook endpoint). `STRIPE-SETUP.md` has the ~25 min path. Don't offer to do the account setup — it needs Richard's identity + banking details.
- **Stripe webhook deploys with `--no-verify-jwt` flag** (Session 25) — Stripe uses signature-based auth via `constructEventAsync`, not JWT. The portal endpoint verifies JWT normally (user must be signed in). Two different security models — don't cross-wire them.
- **Universal Link generation MUST match app's route path** (Session 25) — if you rename the receiver route from `/invite/[token]` to anything else, update BOTH `INVITE_LINK_BASE` in `lib/invite-state.ts` AND the AASA file's `components` pattern in the deploy repo. Ship both together or Universal Links break silently.
- **Post-deploy Universal Link verification** (Session 25) — before assuming things work, hit `https://zaeli.app/.well-known/apple-app-site-association` from browser + `curl -I` to confirm HTTP 200 + `content-type: application/json`. Then test tap in Messages (not Safari address bar — Safari blocks Universal Links from address-bar navigation, use Messages / Mail / Notes / a shared link).
- **Empty state should not leak into AI context — invisible-domain rule** (Session 26). Sonnet's helpful-assistant training bias fights explicit "don't nudge" instructions. If an AI-generated surface (brief, chat, notification) can be gamed by fabricating from absent data, the fix is not to add stricter bans — it's to remove the empty state from context entirely. If TONIGHT MEAL is null, the line is omitted; if OPEN TASKS is empty, the line is omitted. Sonnet literally cannot propose "plan dinner" if it doesn't know dinner is a thing to think about. This is a general pattern for any AI content surface — apply the same discipline anywhere Sonnet is asked to summarise state.
- **Brief signature includes hour bucket** (Session 26) — coarse `Math.floor(hour / 3)` in `lib/brief-firing.ts` `currentBucket()`, added to `FamilyContext.hourBucket`, included in `computeSignature`. Fixes 5pm briefs still showing at 10:30pm within the 13-hour evening window. Bucket size chosen for balance: shorter = more Sonnet calls, longer = staleness. If you ever change the size, update the `hourBucket` type comment in `FamilyContext` too.
- **Brief persistence-restore is bucket-gated** (Session 26) — the `lastBriefWindowRef` "already fired" signal is only carried forward from the persisted chat feed if the persisted brief's bucket matches now. Stale bucket → refs stay null → `shouldFireBrief` fires fresh on next mount (treats stale-bucket like a natural window change). Any future addition to the brief-restore path needs the same bucket check or it'll silently gate refresh.
- **Auto-dismiss earlier same-window briefs on refire** (Session 26) — when `tryFireBrief` completes its placeholder-swap, walk `messages` and set `briefDismissed=true` on any OTHER same-window brief that isn't already dismissed. Text stays as chat history, chip row hides. Uses existing `briefDismissed` mechanism (Session 17). Don't remove briefs from `messages` — dismissing preserves history and reuses the render path.
- **Silent upsert failure is a real risk** (Session 26) — `zaeli_briefs` never existed in dev DB from Session 16 through Session 25, briefs upserted with no error surfaced. Whenever adding a new Supabase table dependency, run the migration explicitly + confirm at least one row lands before trusting the code path. Consider a startup check that surfaces missing tables to Metro logs.
- **Cache table migrations depending on `current_family_id()` must use the Session 21 RLS pattern** (Session 26) — the `supabase-zaeli-briefs.sql` original was Session 16 pre-auth with `USING (true)` allow-all. Updated to standard 4 policies (SELECT / INSERT / UPDATE / DELETE) scoped by `family_id = public.current_family_id()`. Any future family-scoped cache table has to follow this exact pattern — copy from `supabase-zaeli-briefs.sql` as a template.
- **Pricing anchor is A$9.99 family / A$7.99 tutor per child, inc GST** (Session 26 — locked in [[project-pricing-decision]] memory). Stripe products must be set to tax-inclusive (AU defaults to adding 10% on top). Any new feature that materially increases per-family API cost must be evaluated against A$9.99, not A$14.99. Tutor stays the single biggest revenue lever — a family with 3 kids on Tutor adds A$23.97/mo, more than 2x the base.
- **Never rewrite historical cost calculations** (Session 26) — when pricing changes, update the LIVE reference lines in CLAUDE.md's Business section and any narrative that mentions old figures in current-truth framing. Leave old cost-analysis paragraphs from prior sessions (e.g. "18% of A$14.99 revenue") as historical point-in-time observations. Rewriting them scrambles the audit trail.
- **App icon is 2B "za + orbs"** (Session 27) — sky-blue `a` letterform fragment of the wordmark + peach/mint/lavender orbs on warm bg `#FAF8F5`. Files: `assets/images/icon.png` (1024×1024) + `assets/images/splash-icon.png` (2048×2048). Both opaque, no alpha, no rounded corners (iOS applies its own mask), no gradients. If the icon needs a redesign or splash size tuning, regenerate from `zaeli-icon-generator.html` (browser Canvas tool) — do NOT hand-edit the PNGs.
- **EAS cloud builds don't inherit local `.env`** (Session 27) — every `EXPO_PUBLIC_*` var used at runtime must be registered as an EAS Environment Variable (via the expo.dev web UI, scoped to Preview + Production). Missing vars → `undefined` at boot → `createClient(undefined, undefined)` → immediate crash of the whole JS bundle. Preview builds are standalone (no Metro fallback).
- **`EXPO_PUBLIC_*` cannot have "Secret" visibility in EAS** (Session 27) — Expo blocks it because these variables bake into the JavaScript bundle at build time and can be extracted from the compiled app. Use **"Sensitive"** instead (values hidden in EAS UI, but same bundle behaviour). Both "Plain text" and "Sensitive" bake identically — the difference is only about who can see the value in EAS dashboards.
- **Client-bundled API keys are extractable — Phase 5 must move them server-side before public launch** (Session 27) — `EXPO_PUBLIC_ANTHROPIC_API_KEY` and `EXPO_PUBLIC_OPENAI_API_KEY` are readable from the compiled bundle by any determined user. Fine for TestFlight dogfood (trusted testers). NOT fine for App Store distribution. Route those calls through Supabase Edge Functions before launch. Supabase URL + anon key are safe to bundle either way — RLS enforces security.
- **Preview builds are standalone; dev-client uses Metro** (Session 27) — `eas build --profile preview` produces a standalone binary with the JS bundle baked in. Doesn't connect to Metro. `eas build --profile development` produces a dev-client that fetches JS from Metro. Same bundle ID = install-in-place, so switching between them on the same phone overwrites the previous. When testing, know which build you have on the phone before wondering why hot-reload doesn't work.
- **Brief bucket-check parses from message id, NEVER from `ts`** (Session 27) — `ts` is a locale-formatted display string (`"9:31 pm"`), not an ISO timestamp. `new Date("9:31 pm")` returns Invalid Date. The 13-digit millis timestamp lives in the message id's trailing capture group (`brief-<win>-<YYYY-MM-DD>-<millis>`). Regex: `/-(\d{13})$/`. Apply the same rule to any future "when did this happen" comparison — parse from id, not from display strings.
- **Brief dedup on restore keeps only the LATEST brief per window** (Session 27) — the persistence file can accumulate multiple briefs in the same window (bucket refires, hot-reload iterations, test cycles). On restore, filter to the newest millis in id. Setting `messages` to just that one also means the debounced save effect writes back a clean single-brief array, so accumulation is self-healing across future cycles.
- **Splash Option C** (Session 27) — first install ever fires splash regardless of time (AsyncStorage flag `splash_first_install_seen_v1`), then respects the 6-9am / 12-2pm / 5-8pm windows. NEVER change to "fire on every open" — that gets annoying fast. If you're testing splash after first install, clear the AsyncStorage flag manually.
- **Dev-client rendering artifacts don't predict standalone behaviour** (Session 27) — Metro bundle-fetch flashes, hot-reload glitches, and other dev-client oddities are NOT reliable signals for production UX. If a user reports a cosmetic issue during dev-client testing, verify in a fresh standalone preview build before spending time diagnosing. Real issues persist across build types; dev-client artifacts vanish.
- **Same bundle ID = update-in-place on iOS** (Session 27 confirmation) — new EAS build with `com.zaeli.app` overwrites the previous install (dev-client or preview). Session state survives (AsyncStorage kept). No duplicate app icon. When you want to keep both a dev-client and a preview on the same phone for comparison, they'd need different bundle IDs — but so far one-at-a-time has been fine.
- **Supabase INSERT always verify with `.select('id').maybeSingle()`** (Session 28) — `.insert(row)` can return `{ error: null, data: null }` on silent RLS block. Old pattern of `let { error } = await ...insert(...); if (error) return fail;` gives false-positive success when RLS's WITH CHECK evaluated null (e.g. `current_family_id()` momentarily returned null due to auth race). NEW pattern: `let res = await supabase.from(t).insert(row).select('id').maybeSingle(); if (res.error) return fail; if (!res.data?.id) return fail;`. Apply wherever silent failure would mislead the user (calendar, todos, shopping items, etc). This was the root cause of the Session 28 calendar phantom-event bug.
- **Stripe `current_period_end` moved to items level in newer API** (Session 28) — as of API 2024-06-20+, `sub.current_period_end` on the Subscription object returns null; the actual timestamp lives on `sub.items.data[0].current_period_end`. Read subscription-level first (backwards compat), fall back to items. Same principle applies to any Stripe field migrated across API versions — check both places.
- **Stripe Customer Portal default return URL requires http(s), NOT custom schemes** (Session 28) — the dashboard-level "Default return URL" input rejects `zaeli://settings`. Use `https://zaeli.app` for now. Pre-launch polish: add a Netlify `/return` route that auto-redirects to `zaeli://settings` via JS + fallback link so cancel-in-portal → back to Settings screen in app.
- **Stripe customer metadata (`supabase_user_id`) MUST be set at customer CREATION** (Session 28) — the `customer.created` webhook fires immediately on customer creation and uses metadata to link to Supabase profile. If metadata is added later (via customer edit), no new webhook fires and the link never happens. Two paths: (a) set metadata at creation time in the Stripe API/dashboard, or (b) manually paste `stripe_customer_id` into the profile row via Supabase Table Editor after the fact.
- **Stripe webhook events fire in real-time** (Session 28) — if your profile isn't ready when the event arrives, the sync silently matches 0 rows and does nothing (webhook returns 200 but nothing updates). Fix: resend the event from Stripe Dashboard → Developers → Events → find the event → **Resend** button. Idempotent, safe to run multiple times. Same fix if you deploy a webhook code change and need to re-sync historical state.
- **Splash blue flash is a timing issue, not a colour issue** (Session 28) — five colour-config attempts (top-level splash, ios.splash, expo-system-ui root view, Fabric Stack contentStyle) all failed to eliminate the flash on iOS with newArchEnabled. The only fix that landed was gating `SplashScreen.hideAsync()` on the root View's `onLayout` callback (waits for the tree to be measured + about to paint before dropping the splash) plus `SplashScreen.setOptions({ fade: true, duration: 300 })` for a softer transition. Documenting so future splash issues start with timing before colour.
- **Splash fixes verified in preview builds ONLY, never dev-client** (Session 28 reinforcement) — dev-client + Metro bundle-fetch introduces its own flashes that don't exist in standalone preview builds. Any "flash" report tested in dev-client is unreliable. Fresh `eas build --profile preview` is the source of truth.
- **Supabase CLI + Edge Functions deploy: `--no-verify-jwt` is required for the Stripe webhook** (Session 28 confirmation) — Stripe authenticates via signature header, not JWT. Deploying without `--no-verify-jwt` would make Supabase reject all Stripe events with 401. The portal endpoint DOES use JWT auth (client passes user's session token) so no flag needed there.
- **Stripe email automation is Stripe's job (transactional)** (Session 28) — payment receipts, cancellation confirmations, failed payment notifications all fire automatically from Stripe. Configurable in Stripe Dashboard → Settings → Emails. Product-side welcome emails ("Welcome to Zaeli, Rich — here's how to get started") are ours to build as a Supabase Edge Function on `auth.users` insert, deferred until we have real onboarded users.
- **Stripe Tax activation deferred to pre-launch** (Session 28) — not required for sandbox testing. Tax-inclusive pricing at the Price level is what matters for A$ figure accuracy in sandbox. Stripe Tax adds automated AU GST calculation + reporting on top, 0.5% per transaction in live mode. Enable via Stripe Dashboard → Settings → Tax → Get started before flipping to live mode.
- **SVG icon clipping fix — expand viewBox by 1 unit each side** (Session 28) — for icons with strokes at the viewBox extremes and reasonable strokeWidth (1.5-2), half the stroke will render outside the SVG canvas. Symptom: subtle clip at container edge. Fix: `viewBox="-1 -1 26 26"` instead of `viewBox="0 0 24 24"`. Icon renders at same visual size (same width/height on Svg element), just more breathing room around the paths. Applied to IcoSettings gear in MoreSheet.
- **Diagnostic logging in silent-failure tool paths** (Session 28) — when a tool can silently return false success (calendar phantom event), add console.log for input params, resolution steps (roster/assignees), and outcome (id inserted or error). Metro logs are the only surface for diagnosing this class of bug on device. Keep logs terse but structured so future reproductions surface the failure layer in one round.
- **`expo-notifications` plugin is REQUIRED in `app.json` plugins array** (Session 30) — without it, iOS never gets the `aps-environment` entitlement at build time. `getExpoPushTokenAsync` then throws at boot with an entitlement error, silently failing every push token registration. Local scheduled notifications (briefs) DO still work because they don't need APNs — that's what makes diagnosis tricky. NEVER remove the plugin entry from `app.json`. If added later, requires a fresh EAS build (native entitlement change).
- **Never use `.catch(() => {})` for async fire-and-forget** (Session 30) — swallows errors invisibly and cost this project ~2 diagnostic cycles on the missing expo-notifications plugin. ALWAYS use `.catch(e => console.log('[surface] threw:', e?.message))` at minimum so failures surface in Metro/EAS logs. Silent catches are a class of bug that only surface when someone spends hours wondering why the feature doesn't work.
- **Sensitive silent-failure paths deserve verbose on-device diagnostic** (Session 30) — when a feature depends on OS/API interactions that can fail invisibly in production (push tokens, image picker permissions, background modes, HealthKit access), add a Developer row that surfaces structured state via `Alert.alert`. Saves guess-and-rebuild cycles when the failure only reproduces on real devices. Pattern: `debug<Feature>()` returns a state object with named steps + errors, Developer row calls it + shows `JSON.stringify` in the Alert body.
- **`eas build` and `eas submit` are SEPARATE commands** (Session 30) — build creates the .ipa (preview = internal distribution install link, production = auto-increments buildNumber). `eas submit --platform ios --latest` is the SEPARATE command that uploads to App Store Connect → TestFlight. Preview builds cannot be App-Store-submitted (internal-only). Only production builds are App-Store-distributable. Both preview and production require `eas submit` to appear in TestFlight — build alone does NOT push to Apple.
- **EAS Starter plan is worth it during active beta** (Session 30) — 14 iOS builds/month. Rapid diagnostic iteration (push token debugging, entitlement changes, prompt tuning) can eat the free tier's 15/mo quota fast. Upgrade when beta is active with multiple testers or during high-iteration diagnostic rounds. Below that, free tier is fine.
- **Foreground profile refresh pattern** (Session 30) — `_layout.tsx` uses `AppState.addEventListener('change', ...)` to reload profile on `background → active` transition for any signed-in user. Critical for Stripe checkout return path (user completes payment in Safari, returns to app, subscription card must be fresh). Generalisable to any per-user state that can change out-of-app (subscription, tier, family members added by another device). Any new per-user state lib that can change outside the app should hook into this pattern.
- **Cold-start `useEffect` never blocks `setAuthed` on network calls** (Session 30) — verify session (fast AsyncStorage) → `setAuthed(true)` IMMEDIATELY → kick network work (`loadProfile`, roster hydrate, brief context, etc) in the background as fire-and-forget. Route guards MUST tolerate null profile (treat as owner default from Session 21) so the fast path always renders first. Anna's 3s+ splash on foreground return was caused by breaking this rule with `await loadProfile()` before `setAuthed`.
- **Chat photo attachments cap = 4** (Session 30) — `MAX_CHAT_PHOTOS` constant in `app/(tabs)/index.tsx`. Matches receipt scan cap (Session 29). Larger caps would blow up API payloads, latency, and cost per Sonnet vision call. Never raise without cost modelling.
- **Multi-photo state shape**: `pendingImages: string[]` + `MAX_CHAT_PHOTOS` cap + additive Camera/Photos pickers (Session 30) — not `pendingImage: string | null`. `send(text?, overrideImages?: string[])` signature accepts optional array override. `Msg.imageUris?: string[]` field added alongside legacy `Msg.imageUri` for backwards compat with persisted messages. Render logic prefers `imageUris` if present (horizontal grid for 2+, single layout for 1).
- **AI-generated content: correctness needs three-layer defence** (Session 30 — Kids Trivia guard, matches Session 29 tutor math pattern) — prompt rule + BAD/GOOD examples inline in prompt + client-side validation filter. Single-layer fixes fight training bias and drift. For trivia: word-boundary regex checks 4+ char answer words against question text, drops self-revealing questions. Any AI-generated surface where factual correctness matters should follow this pattern.
- **Family push = JWT + family-boundary-enforced Edge Function** (Session 30) — `supabase/functions/family-notify/index.ts` validates that sender's `family_id` MATCHES every recipient's `family_id`. Otherwise returns 403. Never trust client-supplied recipient UIDs directly; always cross-check family membership server-side. Same principle applies to any future cross-user Edge Function.
- **Any new `EXPO_PUBLIC_*` env var must be added to BOTH local `.env` AND EAS Environment Variables** (Session 30 reinforcement of Session 27) — as Sensitive visibility, scoped to Preview + Production. Local `.env` alone works for dev-client + Metro but is silently missing from standalone builds. Every new key added to `.env` = check EAS immediately. Kids Hub GIPHY key kept failing in standalone until Rich added it via expo.dev UI.
- **`eas credentials` auto-provisions APNs Push Key on first iOS build** (Session 30 confirmation) — no manual Apple Developer Portal work needed for push. If push tokens are failing, the credentials are almost certainly fine; check the `expo-notifications` plugin entry first, then permission grants, then `getExpoPushTokenAsync` exception.
