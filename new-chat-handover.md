# Zaeli — New Chat Handover
*28 April 2026 — Session 20 ✅ · On-device polish round (Tutor session resume from tutor_messages, chat VIEW-query inline cards across Shopping/Meals/Tasks, Shopping sheet add-bar layout fix using explicit useSafeAreaInsets) · Voice (ElevenLabs) LOCKED to AFTER backend pass · Session 19 quick wins shipped earlier same day (kid tour 9 stops, Kids Hub welcome banner + auto-jump, kid-account route gating, calendar month-view glitch fixed)*
*Copy this entire message to start a new chat.*

---

## Hi! Continuing development of Zaeli.

Zaeli is an iOS-first AI family life platform built in React Native / Expo.
Read **CLAUDE.md** before starting — full stack, architecture, colours, ALL specs.
Then **ZAELI-PRODUCT.md** for product vision and full project plan.

Session 19 was the largest single body of work to date. Five interlocking workstreams: Brief v3, Onboarding polish, Cold-start splash redesign, Main chat bubble unification, full TOUR system, and full INVITE system. Tour and Invite are entirely new modules with state libs, dedicated routes, and chat integration.

---

## ══════════════════════════════════
## CURRENT STATE — ALL WORKING ✅ (Session 20)
## ══════════════════════════════════

### NEW THIS SESSION (Session 20 — on-device polish round, 28 April)

Three bugs surfaced during real device testing — all fixed. Plus the voice timing decision locked.

**A. Tutor session resume — STUB → real implementation.** Gab finished a Read Aloud session, returned to menu, tapped "Recent sessions" row → nothing happened. `goSessionReview` was a `console.log` stub. Active sessions called `goPillar(sess.pillar)` which started a NEW session. **Fix:** tutor-session accepts `resumeSessionId` param. New `loadExistingSession(sid)` fetches session row + tutor_messages, hydrates state (messages, conversationHistory, sessionId, subject, topic, difficultyBand, questionNum, hintsUsed, timer), sets phase based on whether subject was picked, flips status 'completed' → 'active' so exit-save works on next back. `goSessionReview` removed; replaced by `goResumeSession(sess)` for active OR completed. Works for all 6 pillars.

**B. Chat VIEW-query inline cards across the board.** Asking "what's on shopping list" returned a wall of 31 plain-text items. Same for meals + tasks. **Root cause:** only CALENDAR view queries were intercepted before the GPT chat path. **Fix:** three new keyword arrays (`SHOPPING_VIEW_KEYWORDS` / `MEALS_VIEW_KEYWORDS` / `TASKS_VIEW_KEYWORDS`), three detection functions (`isXxxViewQuery` — all check `isActionQuery` first to exclude actions), three new branches in `send()` after the calendar branch. Each fetches data + updates the loading reply with intro text + inlineData + quickReplies. Action queries unaffected. Chip handlers wired: `Open full list`, `Open Tasks` / `Open To-dos` / `Add a task` (route to my-space + open Notes & Tasks sheet on Tasks tab), `Add an item` (mic), `Got it` / `All good` / `Thanks` / `Cheers` (just clears chips, leaves text in feed).

**C. Shopping sheet add-bar layout fix.** First open: "Add an item…" bar squashed against bottom edge. After expand+collapse: corrects. **Root cause:** `<SafeAreaView edges={['bottom']}>` doesn't reliably resolve insets on first render INSIDE a Modal. **Fix:** imported `useSafeAreaInsets()`, read `insets` at component mount. Shopping sheet `SafeAreaView edges={['bottom']}` → `edges={[]}`. List + Pantry add-bar wrappers own the bottom inset explicitly: keyboard-closed `paddingBottom: max(insets.bottom, 8)`, keyboard-open small padding + `marginBottom: max(shopKbHeight - insets.bottom, 0)`. Spend tab ScrollView contentContainer `paddingBottom: 50 + insets.bottom`.

**D. Voice (ElevenLabs) timing — LOCKED.** Decision: AFTER backend pass. Reasons: backend pass unlocks real users (auth, push, real cross-device invites); voice on a single-device prototype demos but can't go live; voice needs its own design conversation; best reveal moment = TestFlight build with voice + auth + push together; risk of re-work if chat UX shifts. Small exception: brief-only voice could go pre-backend (brief render is locked).

### EARLIER THIS SAME DAY (Session 19 quick wins, committed `e22164d`)

Closed the four small Session 19 deferred items in one commit:

- **Kid tour = 9 stops** — `KID_SKIP_IDS = [9, 11]` (Budget + Family) in `lib/tour-state.ts`. New `getEffectiveStops()` / `getEffectiveTotal()` helpers. `loadTourState()` now also calls `loadAccount()`. All nav/progress/replay account-aware. Settings replay picker hides Budget + Family rows for kid accounts. Chat tour pill shows `X/9`. Post-onboarding offer text: "9 stops" instead of "eleven stops".
- **Kids Hub welcome banner** — receiver flow `finishKid()` sets `kid_just_joined = 'true'` AsyncStorage flag. Kids Hub reads + clears on mount, shows lavender card with × dismiss above 3-stat row. Bonus: kid auto-jumps to their own hub (skipping picker) and `selectedChild` set from `getAccount()`.
- **Direct-route gating** — `our-budget.tsx` + `family.tsx` both `loadAccount()` on mount, redirect kid accounts to `/(tabs)/kids` via `router.replace`. Belt-and-braces with MoreSheet's tile hiding.
- **Calendar month-view glitch fixed** — `fetchMonthDayEvents` `.eq('date', dateStr)` → `.gte(dateStr).lt(nextDayStr)` (matches `fetchMonthDots`'s tolerance for timestamp/timezone column types).

### Session 19 summary (still current — historical)

**A. Brief system v3** — reduced from 3 windows to 2 (morning + evening). Midday killed; evening now carries tomorrow-morning prep. Render redesigned to **Option B**: soft tinted bubble (peach `#FDF1E5` morning / lavender `#F0EBFF` evening) + time-of-day pill (`☀️ MORNING` / `🌙 EVENING`) + structured 3-paragraph prose. **Win banner KILLED** — encouragement folds into prose. Generator prompt rewritten to enforce 3-paragraph structure (opener + body + "One thing:") with 1 emoji per paragraph max. `winBanner` field stripped from spec/parser/payload/upsert.

**B. Onboarding polish** — splash WelcomeStep + ReadyStep both got palette orb design (peach/mint/lavender/sky on warm BG). Wordmark lineHeight fix so "i" dot doesn't clip. Step 2 `Hey 👋 I'm Zaeli` greeting + emoji throughout copy. Duplicate "is this rash anything?" replaced with "what's this homework asking?". Brentwood Primary example bigger (white photo card + sky-tinted answer card). Brief preview (Step 11) updated to match Option B exactly. Chat bar removed from onboarding entirely. "Let's go" CTA standard.

**C. Cold-start splash redesigned** — `swipe-world.tsx` dark slate Option C **REPLACED** with warm BG `#FAF8F5` + palette orbs (matches onboarding). INK wordmark, sky `a+i`, "Less **chaos**." in coral. Native splash bg in `app.json` updated `#1C2330` → `#FAF8F5`. **REQUIRES `npx expo prebuild --clean` + dev-client rebuild.**

**D. Chat bubble unification** — Zaeli text now wrapped in soft-grey bubble (`rgba(10,10,10,0.04)`, BBL 6) matching onboarding. User bubble background `#F2F2F2` → sky `#E8F4FD`, shape radius 18 / BBR 6. Both texts matched: `Poppins_400Regular` 17px lineHeight 26.

**E. TOUR system — full build (Phase 32)**
- `lib/tour-state.ts` — state machine with 11 STOPS data + AsyncStorage `tour_state_v1` (currentStop, startedAt, completedAt, lastOpenedAt, lastResumePromptAt). Inactivity helpers: `shouldShowResumePrompt()` / `markResumePromptShown()`.
- `app/tour/index.tsx` — single dedicated route. Header (× close + Skip-to-end) + eyebrow + h1 + sub + **animated** progress bar + per-stop card + bottom nav. Finale celebration screen with summary recap.
- 11 stops: Shopping → Meals → Calendar → Kids Hub → Tasks → Photos → **Tutor (HERO)** → Travel → Our Budget → My Space → Our Family
- **Tutor stop 7 = HERO** — violet accent throughout, trial badge "✨ FREE FOR 14 DAYS" inline at top of card, secondary CTA "Just have a look", price line "$9.99 / child / month".
- Stop CTAs route via `pendingChatContext` for sheets, direct `router.navigate` for modules. Photos = "Open chat →".
- **Tour pill** floats bottom-LEFT on chat (right reserved for scroll arrows) when `isInProgress()`. Refreshes on focus + mount.
- **First-time mint banner** inside live sheets via reusable `app/components/TourBanner.tsx`. Wired into Shopping/Meals/Calendar/Notes&Tasks. Per-sheet AsyncStorage flag.
- **Settings → Replay tour** view with hero "Start full tour" + 11-row per-stop picker + last-completed date. Tutor row tagged "Hero feature".
- **Inactivity re-prompt** — 24h+ since last tour open, push Zaeli message "We were on [stop]" with chips ▶ Continue / 🏁 Skip / Not right now. 24h cooldown. Synchronous flag-clear prevents double-fire.
- `🧭 Take the tour` chip from post-onboarding offer calls `replayFromStart()` BEFORE nav (was loading stale finale state).

**F. INVITE system — full build (Phase 33)**
- `lib/invite-state.ts` — pending invite store. Mock 6-char token. Per-role SMS composer. Copy/Resend/Revoke. AsyncStorage `invite_state_v1`. `recentlyAcceptedInvites()` + `clearJustAcceptedFlag()` for chat heads-up.
- `lib/account-state.ts` — current account identity (`owner` / `adult` / `kid`). AsyncStorage `account_state_v1`. Used by MoreSheet for permission gating.
- `app/invite/index.tsx` — inviter side: role picker (Adult sky / Kid lavender, **no emoji**) + form + iOS share sheet trigger via `Share.share({ message, url })`.
- `app/invite/[token].tsx` — receiver side: branches by role. **Adult flow** (4 steps: welcome / account / rhythm / preferences) → marks accepted, sets account, sets `onboarding_just_completed` → routes to chat → tour offer auto-fires. **Kid flow** (3 steps: welcome / avatar+PIN / capability intro) → marks accepted, sets kid account → routes to /(tabs)/kids.
- `app/(tabs)/family.tsx` — per-member inline invite + status grid (You · Account owner / Joined / Pending / + Invite to Zaeli / Uses parent's device · Give them their own). PendingInviteRow with Copy/Resend/Revoke chips. Status badges bumped from tiny 9px to 11-12px with hitSlop.
- `app/(tabs)/index.tsx` — inviter heads-up message in chat when invite accepted (mint for adult / lavender for kid). **Synchronous flag-clear prevents double-fire.**
- `app/components/MoreSheet.tsx` — hides Budget + Family tiles when `isKidAccount()` true.
- `app/(tabs)/settings.tsx` — 3 dev rows for testing: 📨 Simulate invite accepted / 🔗 Open latest invite as receiver / ↩️ Reset to owner account.
- **Roles locked**: Adult (full access, equal) and Kid (full app EXCEPT Our Budget + Our Family management). No Helper/granular for v1.
- **Trust the link** — accepting = joined. No approval flow.

**Mockups produced this session:**
- `zaeli-tour-mockup.html` (v2 — 18 frames, 5 acts)
- `zaeli-brief-card-mockup.html` (4 options; B picked)
- `zaeli-invite-mockup.html` (18 frames, 4 acts)

**Critical bugs fixed:**
- Tour finale instead of stop 1 — chip handler now calls `replayFromStart()` first
- Inviter heads-up double-fire — `clearJustAcceptedFlag()` runs synchronously before message-pushing setTimeout
- Tour progress bar inconsistent steps — formula `((cur-1)/(TOTAL-1))*100`
- Trial badge clipped — moved from absolute `top:-10` to inline at top of card
- Tour pill collision with chat scroll arrows — moved from `right:16` to `left:16`
- Tour fonts too small — bumped throughout
- Family screen status badges hard to tap — fontSize/padding bumped, hitSlop added
- Member profile back button barely visible — now white pill with dark text + hitSlop

### Session 18 summary (still current — historical)

**Travel module shipped** — standalone route at `/(tabs)/travel`. Trip Stack → Trip Detail with 4 tabs (Overview / Bookings / Packing / Notes). Pure-planner budget. Unified BookingSheet (add+edit). Keyboard glitch fix: KAV moved **inside** the sheet card.

### Session 17 summary (still current — historical)

**Our Budget v2 — Pure Planner (the big one)**
- Positioned as a budget PLANNER, not a tracker. Without a bank feed, live tracking lies to users the moment data is stale (confirmed with real test — Nov ATM withdrawals imported as "this month").
- Fixed categories hold line items (auto-sum). Variable categories have single target. Savings goals forward-looking, manual.
- AI helper: one-off statement upload (photo or paste) → Zaeli suggests variable averages + detects new categories + detects recurring subscriptions. Accept/Edit/Skip per suggestion. Raw data never stored.
- Mint palette (Meals-aligned). Option D allocation chart (labelled bar + chips). "Surplus" with peach over-state. Target date picker with Flexible toggle.
- Supabase wiring → backend pass.

**Settings screen shipped** — 3 views (main/notifications/memory). DateTimePicker modal for brief times. Persistence in AsyncStorage (`zaeli_settings_prefs_v1`). Our Family → back returns to Settings via module-level nav flag.

**AI Brief polish** — quiet-day persona rewrite, black star on sky-blue eyebrow, peach bubble, 17px text, softer coral primary chip, dismiss chip now hides chips.

**CRITICAL brief bug fixed** — a local `generateBrief` function in index.tsx was shadowing the imported one, so `tryFireBrief` was silently calling the OLD GPT brief. Explained the 10s blank screens, ghost calendar cards, and weird two-message briefs. Fixed + all old brief code ripped (~380 lines).

**Kids Hub keyboard flash** — fixed the classic React anti-pattern: JobsTab/etc declared inside KidsHubScreen but rendered as `<JobsTab />`. Every keystroke re-rendered parent → new function identity → subtree remount → keyboard dismisses. Fixed by calling as function expression `{JobsTab()}`.

**Standard header rule** — all pages now use `Poppins_700Bold · 17px · rgba(10,10,10,0.72)` page label and `Poppins_800ExtraBold · 40px` wordmark.

**Calendar keyword tightening** — was matching bare "next week", "today", day names → hijacked unrelated chat responses. Now only intent-bearing phrases ("what's on", "anything on", "when is", etc.) trigger calendar routing.

**Budget access unblocked** — "Coming soon" alert was in 3 places (MoreSheet, Dashboard onAction, Chat onAction). All now route to `/our-budget`.

### Architecture — 2-page swipe, Chat-first, unified chat bar

```
CHAT (page 0, opens here) ← → DASHBOARD (page 1)
                (no dot indicator — killed Session 15)
```

- App opens on Chat (sky blue wordmark `a+i`). Swipe right for Dashboard (peach).
- My Space is a standalone route (`/(tabs)/my-space`), accessed via MoreSheet.
- **FAB killed everywhere.** Hamburger ☰ top-right of every screen + every 92% sheet.
- **Chat bar** (Tutor-style single pill): only on Chat and Tutor sessions. Dashboard/My Space have NO chat bar.
- **Splash (Deep Slate + Mint + Sky + Lavender):** fires ONCE per session.

### MoreSheet — universal menu (Session 15 restructure)

Opens from hamburger ☰ on every screen AND inside every 92% sheet.

```
NAVIGATE          [Home] [Dashboard]         ← 50/50
FAMILY CHANNELS   [Calendar][Shopping][Meals]
                  [Tasks][Notes][Travel]     ← 3×2
PERSONAL          [My Space] [Our Budget]    ← 50/50
MODULES           [Tutor] [Kids Hub]         ← 50/50
ACCOUNT           [Our Family] [Settings]    ← 50/50 (NEW label Session 15)
```

**Cross-sheet nav:** User in Meals → hamburger → MoreSheet opens on top of Meals → tap Shopping → both close → Shopping opens. X on MoreSheet restores origin sheet.

### Chat bar (Session 15 V2 — unified with Tutor)

Single white pill: `[Mic | sep | TextInput | Camera | Send]`
- minHeight 60, borderRadius 32, paddingVertical 10
- Buttons 44×44, Send coral circle, font 17px
- alignItems: flex-end so mic+send anchor to bottom as input grows
- Camera → opens Add-to-Chat picker (Camera/Photos, NO Live)
- **Same bar on Tutor sessions** — identical specs

### Pages:
- **Chat** — header: zaeli wordmark (sky blue `a+i`) + "Home" label + hamburger ☰. Chat bar at bottom.
- **Dashboard** — header: back arrow + zaeli wordmark (peach `a+i`) + date + "Dashboard" label + hamburger ☰. 5 cards: Calendar / Meal Planner / Weather+Zaeli Noticed (35/65 bento) / Shopping / On the Radar. **Tap anywhere on a card to expand/collapse**.
- **My Space** — header: back arrow + zaeli wordmark (sky blue `a+i`) + "My Space" label + hamburger ☰. 6-card grid + Wordle + all sheets.

### Splash (Option C — Deep Slate + Mint + Sky + Lavender)
- Background: `#1C2330` deep slate
- Wordmark: 96px white, `a+i` in **sky blue `#A8D8F0`** (Session 15 change — was mint)
- Tagline: "**Less Chaos.**" bold mint `#B8EDD0` + "More Family." soft white
- 40px mint divider
- **Lavender orbs** top-right + bottom-left (Shopping tile lavender `#D8CCFF`, 55-65% opacity to be visible on dark bg)
- "TAP TO CONTINUE" uppercase bottom
- Fires once per app session via `_splashShownThisSession` flag

---

## ══════════════════════════════════
## SESSION 15 — WHAT WAS BUILT
## ══════════════════════════════════

### MoreSheet restructure (done)
- NAVIGATE section promoted to TOP (Chat + Dashboard 50/50)
- Our Budget moved into PERSONAL row with My Space (was in Modules)
- Modules reduced to 2-tile row (Tutor + Kids Hub)
- NEW "ACCOUNT" section with Our Family + Settings
- Bigger icons (20→26px) and labels (15→17px) — same card sizes
- X close button: proper SVG, bumped 14→18px

### Hamburger on every 92% sheet (done)
- Added to Calendar, Shopping, Meals, Notes & Tasks sheet headers
- Option A stacked with Modal sequencing:
  - User in Meals → tap hamburger → Meals dismisses → `onDismiss` fires → MoreSheet opens (or 600ms fallback)
  - Tap Shopping tile in MoreSheet → `onAction` fires synchronously, clears `sheetBeforeMoreRef` → `onClose` fires → no restore → Shopping opens via proper `openShopSheet()` (loads data)
  - X on MoreSheet → restores origin sheet (reads ref before clearing)

### Modal stacking bug fixes (critical Session 15 learnings)
1. **iOS Modal can't stack reliably** — if MoreSheet tries to present while another Modal is dismissing, iOS silently fails
2. **onDismiss callback + 600ms fallback** — `<Modal onDismiss={handler}>` gives guaranteed post-dismiss signal
3. **Phantom backdrop tap guard** — user's touch-up falls through onto new MoreSheet's backdrop → instant close. Fix: `canCloseRef` ignores backdrop for 400ms after open.
4. **Sync `onAction` before `onClose`** — was: `onClose()` then `setTimeout(onAction, 180)`. Parent couldn't clear `sheetBeforeMoreRef` in time, so `closeMoreSheet` read stale ref and restored origin over nav target. Fixed: MoreSheet calls `onAction` SYNCHRONOUSLY first, then `onClose`.
5. **Ref instead of state** — `sheetBeforeMoreRef = useRef()` so synchronous updates work.
6. **Use real openers** — `openShopSheet()`, `openCalSheet()`, `openMealSheet()` (not bare setters). Bare setters don't load data → "list is clear" bug.

### Chat bar unification (done, two iterations)
- First tried: 3-piece floating design (mic circle + input pill + send circle)
- User preferred Tutor's single-pill style → **final: single pill, bumped taller**
- Chat and Tutor bars now identical specs
- Icon sizes bumped (Tutor IcoMic 18→24, IcoSend 13→20, attach +18→22)
- All safety rules preserved (ref untouched, Send raw `<View onTouchStart>`, no onBlur, etc.)

### Splash polish (done)
- Wordmark `a+i` changed mint → sky blue `#A8D8F0` (My Space identity)
- Lavender orbs at high opacity (55-65% of `#D8CCFF`) so they're visible on dark slate
- `lineHeight 128 + paddingTop 12` so "i" dot doesn't clip
- `_splashShownThisSession` module-level flag prevents re-trigger when returning from standalone routes

### Dashboard improvements (done)
- All 4 expandable cards now tap-anywhere-to-expand (outer `TouchableOpacity`)
- Weather/Zaeli Noticed bento: 35/65 split (was 50/50) — gives Zaeli Noticed readable space
- Back arrow added to Dashboard header (quick return to Chat)
- Chat bar facade attempted and removed — decided Dashboard/MySpace don't need chat bars

### Other Session 15 wins
- Chat header "Chat" → "Home"
- Chat wordmark `a+i` → sky blue `#A8D8F0`
- 2-dot swipe indicator killed (no chat bar = floated mid-air)
- Legacy "← Dashboard" pill completely removed
- Camera picker sheet: Live option removed (Camera + Photos only)
- Back arrows on Tutor/Kids Hub/Our Family headers
- Hamburger bumped bigger (36→42px container, 18→22px icon, centered lines y=6/12/18)

---

## ══════════════════════════════════
## KEY FILES (Session 15 state)
## ══════════════════════════════════

### Core screens:
- `app/(tabs)/swipe-world.tsx` — 2-page container, splash, no dot indicator
- `app/(tabs)/index.tsx` — Chat (V2 single-pill bar, Home label, cross-sheet hamburger)
- `app/(tabs)/dashboard.tsx` — 5-card redesign with tap-anywhere, 35/65 bento, back arrow, hamburger
- `app/(tabs)/my-space.tsx` — standalone route, Sheet component with onDismiss, cross-sheet hamburger
- `app/(tabs)/tutor.tsx` — back arrow in banner
- `app/(tabs)/tutor-session.tsx` — chat bar matches Chat V2, difficulty bands, prompt caching
- `app/(tabs)/tutor-curriculum.ts` — topic chips reworked Foundation–Year 12
- `app/(tabs)/kids.tsx` — AI trivia, back arrow
- `app/(tabs)/family.tsx` — back arrow

### Components:
- `app/components/MoreSheet.tsx` — 5-section restructure, SYNC onAction before onClose, backdrop tap guard, SVG X button
- `app/components/ChatBarFacade.tsx` — kept but unused (potential future use)
- `app/components/ZaeliFAB.tsx` — kept but not rendered (killed Session 14)

### Infrastructure:
- `lib/api-logger.ts` — prompt caching support
- `lib/navigation-store.ts` — `notes_tasks_sheet` context type

### Config:
- `app.json` — splash bg `#1C2330`, userInterfaceStyle 'light'

### Supabase migrations (already run):
- `supabase-kids-trivia-history.sql`
- `supabase-personal-tasks-sharing.sql`

---

## ══════════════════════════════════
## KEY CONSTANTS
## ══════════════════════════════════

```
Dashboard logo a+i  = #FAC8A8 peach
Chat logo a+i       = #A8D8F0 sky blue (Session 15 — was lavender)
My Space logo a+i   = #A8D8F0 sky blue
Our Budget logo a+i = #059669 emerald
Splash a+i          = #A8D8F0 sky blue (Session 15 — was mint)
Splash tagline bold = #B8EDD0 mint
Splash orbs         = #D8CCFF lavender at 55-65% opacity
Splash bg           = #1C2330 deep slate
Meal card           = #B8EDD0 mint
On the Radar card   = #F0DC80 gold
Notes & Tasks card  = #FAC8A8 peach
All logos           = 40px Poppins_800ExtraBold (96px on splash)
Send button         = #FF4545 coral ALWAYS
Body bg             = #FAF8F5 warm white
SONNET              = claude-sonnet-4-6
CHAT_MODEL          = gpt-5.4-mini
NOTICED_MODEL       = gpt-4o-mini
DUMMY_FAMILY_ID     = 00000000-0000-0000-0000-000000000001
92% sheets          = height: H * 0.92
Date rule           = bare local YYYY-MM-DD, NEVER toISOString()
Hamburger ☰         = 42×42 button, SVG 22px, lines y=6,12,18 (symmetric)

Chat bar V2 specs:
  barPillV2         = borderRadius 32, paddingVertical 10, minHeight 60, alignItems flex-end
  barBtnV2          = 44×44
  barSepV2          = 1×24 divider
  barInputV2        = 17px, lineHeight 22, paddingVertical 10, maxHeight 140
  barSendV2         = 44×44 coral circle
```

---

## ══════════════════════════════════
## NAMING CONVENTIONS
## ══════════════════════════════════

```
Dashboard card       →  "On the Radar"
MoreSheet tile       →  "Tasks"
My Space sheet       →  "Notes & Tasks"
Full-screen module   →  "Our Budget"
Chat header label    →  "Home" (Session 15 — was "Chat")
MoreSheet sections   →  NAVIGATE · FAMILY CHANNELS · PERSONAL · MODULES · ACCOUNT
```

---

## ══════════════════════════════════
## NEXT PRIORITIES (in order)
## ══════════════════════════════════

### Immediate — small Session 19 deferreds (all minor polish)
1. **Kid tour = 9 stops** — kids currently get the full 11 if they tap Take the tour. Wire `tour-state` to read account kind and skip Budget + Family stops for kid invitees.
2. **Welcome banner inside Kids Hub** — first-time banner for fresh kid invitees when they land in `/kids` after acceptance.
3. **Direct-route gating for kid accounts** — kid could type `/our-budget` or `/family` and reach them. MoreSheet only hides the tile. Add route-level guards.
4. **Native splash rebuild** — `app.json` bg changed to `#FAF8F5`. Run `npx expo prebuild --clean` + rebuild dev client so cold-start transition doesn't flash dark.
5. **Calendar month-view event glitch** — pre-existing bug. Days highlighted red (events present) but event list below is empty.

### Backend pass — BIGGEST remaining work (Phase 33)

The accumulated backlog now spans Settings, Budget, Travel, Tour, Invite, Account, Memory:

**Supabase migrations needed:**
- `tour_state` (per-user state, not family) — currentStop, startedAt, completedAt, lastOpenedAt, lastResumePromptAt
- `invite_tokens` — id, family_id, role, invited_name, invited_email/phone, token, status, created_at, accepted_at, revoked_at, expires_at (7-day default)
- `account_state` — kind (owner/adult/kid), name, avatar (kids), tied to auth user
- `user_preferences` — migrate Settings AsyncStorage (`zaeli_settings_prefs_v1`) to per-user table
- `income_streams` / `budget_categories` / `category_line_items` / `savings_goals` — Our Budget v2 (Session 17)
- `trips` / `trip_members` / `trip_bookings` / `trip_packing_items` / `trip_notes` / `trip_budget` — Travel module (Session 18)
- Memory wiring: `family_insights` / `family_milestones` / `conversation_memory` for Settings → Memory view

**Other backend pass items:**
- **Real auth** — Supabase auth user + JWT with `account.kind` claim. Replace DUMMY_FAMILY_ID + AsyncStorage `account_state_v1`.
- **Real cross-device invite tokens** — `zaeli.app/i/<token>` deep link → server validates → routes to receiver flow. Replaces local mock.
- **Stripe** — customer portal WebView, subscription metadata. Current "Manage subscription" row stub.
- **Push notifications** — registration + scheduling tied to brief times + quiet hours from Settings.
- **Direct-route gating** for kid accounts (alongside MoreSheet).
- **Export data, Clear chat history, Privacy/Terms WebViews** — Settings rows currently stubs.
- **Our Budget CSV/PDF** — `expo-document-picker` install + EAS dev-client rebuild.
- **Our Budget share extension** — native module, EAS build step.
- **Travel vision-for-bookings** — Sonnet vision auto-extract REF/dates/amount from booking screenshots.

### Other pending work:
- Tutor stress testing with real kids (difficulty bands, all 6 pillars)
- Tutor session resume (reload from `tutor_messages`)
- 100 crosswords (content task, parked)
- EAS Build + TestFlight (for HealthKit, embedded YouTube, real auth)

---

## ══════════════════════════════════
## CRITICAL RULES (learned from battle scars)
## ══════════════════════════════════

### Chat bar sanctity
- Chat bar = ALWAYS [Mic][TextInput][Camera][Send] — NEVER conditional render
- Send button = `<View onTouchStart>` — NEVER onPress/onPressIn/TouchableOpacity
- Clear input BEFORE calling send() — `setInput('') + inputRef.current?.clear()` both
- NO onBlur handler on TextInput
- NO Keyboard.addListener setState (causes render races)
- barPill must NOT have onTouchEnd focus handler
- Chat mic = startRecording()/stopRecording() directly
- swipe-world keyboardShouldPersistTaps = "handled"

### Modal stacking (Session 15 new learnings)
- iOS can't stack Modals reliably — present during dismiss silently fails
- Use `<Modal onDismiss={handler}>` for post-dismiss guaranteed signal
- Add 600ms fallback timeout in case onDismiss doesn't fire
- Add 400ms backdrop tap guard on newly-opened Modal (phantom taps from prior touch)
- If MoreSheet's `onAction` is set, it must fire SYNCHRONOUSLY BEFORE `onClose` (parent clears refs before close reads them)
- Use `useRef` not `useState` for values onAction must clear before onClose reads
- Always use real openers `openShopSheet()/openCalSheet()/openMealSheet()` — NOT bare setters

### Other rules
- useFocusEffect does NOT fire on swipe in swipe-world — use isActive prop + useEffect
- All edits to `C:\Users\richa\zaeli` (NOT worktree)
- personal_tasks = member-scoped (is_shared + member_name added Session 14)
- zaeli_briefs = family-scoped (one per family per time window per day)
- CHAT_MODEL = gpt-5.4-mini · NOTICED_MODEL = gpt-4o-mini · NEVER swap
- Brief model = SONNET always
- Camera icon opens Add-to-Chat picker (NOT camera-only) — Camera + Photos (Live removed)
- contextTrigger counter for reliable sheet opening
- Receipt scan = single Sonnet call, local cross-check
- Receipt tick-off = only if item.created_at < receipt_date
- HEIC → JPEG via expo-image-manipulator
- Currency = A$ always
- Pantry limit = 500
- recipes table = prep_mins (NOT cook_time), notes (ingredients+method as text)
- meal_plans = cooks stored in source field as JSON
- kids_trivia_history = NEW Session 14
- Tutor sessions: expo-router reuses component — reset ALL state on [childId, pillar]
- Tutor message keys: use incrementing counter (nextMsgId())
- Unicode escapes in JSX text must be wrapped in {'·'} expressions
- fixZaeliSpelling() needed in both index.tsx AND tutor-session.tsx
- Prompt caching requires `anthropic-beta: prompt-caching-2024-07-31` header (auto-added by api-logger)
- MoreSheet onAction pattern — parent handles in-swipe-world nav
- `_splashShownThisSession` module-level flag prevents splash re-trigger
- MoreSheet contexts must NOT set `returnTo: 'dashboard'` (was triggering legacy pill)

### New rules Session 20 (28 April — late)
- **Tutor session resume** = `resumeSessionId` query param to `/tutor-session` route. `loadExistingSession(sid)` fetches session row + `tutor_messages`, hydrates state (messages, conversationHistory, sessionId, subject, topic, difficultyBand, questionNum, hintsUsed, timer), sets phase based on whether subject was picked, flips status 'completed' → 'active' so exit-save logic stays clean. Same pattern works for all 6 pillars. Replaces the old `goSessionReview` stub.
- **Chat VIEW queries → inline cards** — for any data domain with an existing inline card render (calendar/shopping/meals/todos), intercept "what's on..." queries in `send()` BEFORE the action path or GPT chat path. Pattern: keyword array → detection function (`isXxxViewQuery` — must check `isActionQuery` first) → branch in `send()` that fetches data + `updateMsg(replyId, { text, inlineData, quickReplies, isLoading: false })` + `return`. NEVER let GPT type out long lists.
- **SafeAreaView edges in Modal is unreliable on first render** — react-native-safe-area-context's `<SafeAreaView edges={['bottom']}>` doesn't always resolve insets on first render inside a Modal. For any element whose layout depends on bottom safe area, OWN the inset via `useSafeAreaInsets()` and apply `paddingBottom` directly. Don't rely on SafeAreaView alone. (Only Shopping sheet fixed so far — apply same pattern to Meals/Calendar/Notes&Tasks sheets if they show similar squashing.)
- **Voice (ElevenLabs) AFTER backend pass** — explicit decision. Don't wire it now — would risk re-work when chat UX shifts. Only exception: brief-only voice (since brief render is locked).

### New rules Session 19 quick wins (28 April — early)
- **Kid tour skips Budget + Family** — `lib/tour-state.ts` exports `getEffectiveStops()` / `getEffectiveTotal()` filtered by `isKidAccount()`. ALL tour navigation (advanceStop, goBackStop, getProgressPct, replayStop) and ALL surfaces showing tour totals MUST use the effective list, not raw `STOPS`/`TOTAL_STOPS`. Stop IDs stay 1-11; kids just skip 9 + 11.
- **Kids Hub auto-jump for kid accounts** — on mount, if `isKidAccount()` and account name matches a known child, set `selectedChild` and `view = 'hub'` so kid skips the picker.
- **kid_just_joined welcome banner** — receiver flow `finishKid()` sets the AsyncStorage flag. Kids Hub reads + clears on mount, shows lavender welcome card with × dismiss above the 3-stat row. One-shot only.
- **Kid account direct-route gating** — Budget + Family routes call `loadAccount()` on mount and `router.replace('/(tabs)/kids')` if `isKidAccount()`. Belt-and-braces with MoreSheet's tile hiding. NOT applied to Settings/Tutor/Travel/MySpace.
- **Supabase date queries — prefer range over eq.** If you write `.eq('date', dateStr)` you'll silently miss any row where the column has a timestamp/timezone component. Always use `.gte(dateStr).lt(nextDayStr)` for single-day queries unless the column type is guaranteed bare DATE.

### New rules Session 19
- **Brief = 2 windows ONLY.** Morning (05:00–15:59) + Evening (16:00–04:59). Never reintroduce midday. Evening covers tomorrow-morning prep.
- **Brief render = Option B.** Soft tinted bubble (peach `#FDF1E5` morning / lavender `#F0EBFF` evening) + time-of-day pill at top of bubble. NO win banner. NO border. Eyebrow = `Zaeli · time` only (no window word — pill carries it).
- **Brief generator format** — strict 3-paragraph structure: opener (1 line + emoji) / body (2-3 sentences) / one thing (single nudge). Max 100 words. 1 emoji per paragraph max. Quiet-day mode collapses to opener + one thing.
- **Splash = warm bg + palette orbs** — both onboarding (Welcome + Ready) and cold-start (`swipe-world.tsx`) use `#FAF8F5` bg with peach/mint/lavender/sky orbs. INK wordmark, sky `a+i`, "Less **chaos**." in coral. `app.json` native splash bg `#FAF8F5` — requires `npx expo prebuild --clean`.
- **Wordmark lineHeight rule** — for sizes 92px+, set `lineHeight: fontSize + ~28` AND `paddingTop: 12-14` so the i-dot doesn't clip.
- **Chat bubble unification** — Zaeli text wrapped in `s.zaeliBubble` (bg `rgba(10,10,10,0.04)`, BBL 6, padding 13/16, alignSelf flex-start, maxWidth 90%). User bubble bg `#E8F4FD` (sky), shape radius 18 / BBR 6 / padding 11/15. Both texts: `Poppins_400Regular` 17px lineHeight 26.
- **Tour state machine** = `lib/tour-state.ts`. AsyncStorage `tour_state_v1`. STOPS array is single source of truth. **Tutor stop 7 = HERO** (violet, trial badge, 2 CTAs, price line). Progress formula `((cur-1)/(TOTAL-1))*100`.
- **Tour pill = bottom-LEFT** (`left: 16`). Right side reserved for chat scroll arrows.
- **Tour offer chip handler** must call `replayFromStart()` BEFORE navigating to `/tour` — otherwise stale `currentStop = 'finale'` lands user wrong.
- **First-time tour banner** uses `<TourBanner sheetKey="..." message="..."/>`. Per-sheet AsyncStorage flag. Renders only if tour-in-progress AND not previously dismissed.
- **Inactivity prompt** — `markResumePromptShown()` runs synchronously to prevent double-fire (same pattern as invite heads-up).
- **Invite state** = `lib/invite-state.ts`, AsyncStorage `invite_state_v1`. Mock 6-char token. **Account state** = `lib/account-state.ts`, AsyncStorage `account_state_v1`. Three kinds: owner / adult / kid.
- **Invites = Adult or Kid only** for v1. Adult = full access. Kid = full access EXCEPT Our Budget + Our Family management.
- **Invite delivery = iOS share sheet only** (`Share.share({ message, url })`). No backend in v1.
- **Trust the link** — accepting = joined. No approval flow.
- **Inviter heads-up + tour resume** must clear flags SYNCHRONOUSLY before message-pushing setTimeout — concurrent mount + focus calls would double-fire otherwise.
- **Adult invitee onboarding** = 4 steps (welcome / account / rhythm / preferences). Sets `onboarding_just_completed` so tour offer fires.
- **Kid invitee onboarding** = 3 steps (welcome / avatar+PIN / capability intro). Lands in Kids Hub, NOT chat.
- **MoreSheet kid gating** — `loadAccount()` on visible-true, `isKidAccount()` hides Budget + Family tiles. Direct route navigation NOT yet gated (deferred).
- **Status badge sizing** (Family screen) — fontSize 11px+, padding 10×5+, borderRadius 8+, letterSpacing 0.2. Action chips: fontSize 12, padding 12×7, borderRadius 10, filled mint pill bg, white text, hitSlop 10. NEVER fontSize 9.
- **Onboarding finale → tour handoff** — `finishOnboarding()` sets BOTH `onboarding_complete` AND `onboarding_just_completed`. Chat reads + clears the latter on mount, pushes tour offer.
- **No emoji on Adult/Kid role tiles** — Richard's call (felt off). Color-coded names (sky-deep "Adult", lavender-deep "Kid") + features carry the visual difference.

### New rules Session 18
- **Travel = STANDALONE route.** Not a 92% sheet. Wordmark `a+i` = sky `#A8D8F0`, primary = ocean deep `#0060A0`.
- **Travel Budget = PURE PLANNER.** No manual "Spent" — Booked auto-sums booking amounts. Still to plan = Total − Booked.
- **Unified add/edit pattern** (Travel BookingSheet): single component, `payload: 'new' | T` prop toggles mode. Delete button inside edit mode, title changes. Reuse this pattern for other CRUD sheets.
- **SheetShell KAV rule**: KAV goes **inside** the sheet card wrapping only the body. NEVER wrap the whole Modal with KAV — fixed-height sheet gets pushed off screen. Always add `keyboardShouldPersistTaps="handled"` to sheet body ScrollView.

### New rules Session 17
- **Our Budget = PURE PLANNER.** Never live tracking. No "spent this month" surfaces. No transaction ledger. Uploads are ephemeral suggestion fuel — only accepted amounts persist.
- **Our Budget accent = mint** (Meals palette): `#2D7A52` / `#B8EDD0` / `#E6F7EF` / `#C8F0DA`. Savings = sky `#A8D8F0`. Over = peach `#FAC8A8` + `#8A3A00` brown. Never red/alarm.
- **Our Budget tab label = "Savings"** (not Goals). Individual items still called "goals".
- **Standard page label**: `Poppins_700Bold · 17px · rgba(10,10,10,0.72)`. Standard wordmark: `Poppins_800ExtraBold · 40px · letterSpacing -1.5 · lineHeight 46`. Applied across Chat / Dashboard / My Space / Tutor / Kids / Family / Settings / Our Budget.
- **Brief system** — ONLY one `generateBrief` (imported from `lib/brief-generator`). NEVER declare a local function by that name in index.tsx — would shadow silently.
- **tryFireBrief** pushes a loading placeholder bubble IMMEDIATELY on fire decision, updates in place on Sonnet return. Never blank screen during generation.
- **Dismiss brief chip** now sets `msg.briefDismissed = true`, chip row hides, text stays in thread.
- **Component-as-JSX anti-pattern** — NEVER declare sub-components inside a parent function and render as `<X />`. Either hoist out or call as function `{X()}`. Killed keyboards in Kids Hub.
- **Calendar keywords** — intent-bearing phrases only. Bare time refs (today, next week, Monday) do NOT trigger. Narrative mentions must pass through normal chat.
- **Settings back-to-settings from Family** — use module-level flag `setFamilyFromSettings()` / `consumeFamilyFrom()` in `lib/navigation-store.ts`. Router params flaky across tab routes.
- **Settings prefs** — AsyncStorage under `zaeli_settings_prefs_v1` (pre-backend pass).
- **DateTimePicker** (from `@react-native-community/datetimepicker`) used for both time (Settings brief times, quiet hours) and date (Our Budget goal target date). iOS = spinner in modal; Android = native dialog.
- **Fixed category budget** = `SUM(line_items.monthlyAmount)` auto-calculated. Variable budget = `monthlyTarget` field. Never mix.
- **Option D allocation chart** — stacked bar with % labels inside segments + 3 tinted chips below. When over-budget, bar scales to fit 100%, 3rd chip shows `−$X` in peach.

---

**Read CLAUDE.md fully before starting any code work.**
**Design HTMLs (in repo root)**: `zaeli-splash-options.html`, `zaeli-more-sheet-options.html`, `zaeli-chatbar-options.html`, `zaeli-fab-options.html`, `zaeli-dashboard-redesign.html`, `zaeli-settings-mockup.html`, `zaeli-budget-v2-mockup.html`, `zaeli-budget-v2-theming.html`.
**Brief system spec**: `zaeli-brief-examples (1).html` in Downloads.

### Open for next session

All Session 19 quick wins ✅ shipped 28 April. Tutor session resume ✅ shipped 28 April. Voice timing ✅ locked (after backend pass).

**Backend pass — THE NEXT BIG BLOCK** (multi-session). Batched across all modules:
- Supabase migrations: `tour_state` + `invite_tokens` + `account_state` + `user_preferences` + budget (4 tables: `income_streams` / `budget_categories` / `category_line_items` / `savings_goals`) + travel (6 tables: `trips` / `trip_members` / `trip_bookings` / `trip_packing_items` / `trip_notes` / `trip_budget`)
- Real auth — Supabase user + JWT with `account.kind` claim. Replace DUMMY_FAMILY_ID + AsyncStorage `account_state_v1`
- Real cross-device invite tokens — `zaeli.app/i/<token>` deep link → server validates → routes to receiver flow
- Stripe customer portal WebView, subscription metadata
- Push notification scheduling tied to Settings brief times + quiet hours
- Memory wiring — Settings → Memory to real `family_insights` / `family_milestones` / `conversation_memory`
- Direct-route guards extension (Settings rows that should hide for kid accounts: Subscription, Family management)
- Export data + Clear chat history + Privacy/Terms WebViews — Settings rows currently stubs
- CSV document picker (`expo-document-picker` install + EAS rebuild) for Our Budget
- Travel vision-for-bookings — Sonnet vision auto-extract REF/dates/amount

**After backend pass:**
- Voice (ElevenLabs) — Phase C launchable. Brief + chat reply playback. Voice settings UI in Settings. Cost controls.
- EAS Build + TestFlight (real auth blocker is the main thing waiting on backend)
- Native splash rebuild — `npx expo prebuild --clean` after `app.json` bg change

**Smaller / parked:**
- 100 crossword pool expansion (content task, parked)
- Tutor stress testing with real kids (ongoing — surfaced 2 bugs Session 20 already fixed)
- Apply SafeAreaView fix pattern to Meals/Calendar/Notes&Tasks sheets if similar squashing surfaces
- 100 crosswords (parked content task)
