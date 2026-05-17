# ZAELI-PRODUCT.md — Product Vision & Decisions
*Last updated: 18 May 2026 — Session 21 ✅ · Backend Pass kickoff: Phases 1 (auth foundation), 2a (RLS + DUMMY_FAMILY_ID swap + session persistence), 2b (invite tokens + tour state to Supabase), 2c (settings preferences to Supabase) — all shipped, all verified on device · Chat bar photo upload bug fixed · Phase 2d (real auth at invite acceptance) NEXT*

---

## What Zaeli Is

Zaeli is an iOS-first AI family life platform for Australian families with children. An AI companion that knows your family's life — through conversation, not data entry. Zaeli speaks first. You respond. Everything else flows from that conversation.

**Tagline:** Less Chaos. More Family.

**Core positioning (LOCKED Session 9):** Zaeli is not competing with better calendars or better shopping apps. Zaeli is competing on *relationship*. Rich doesn't open Zaeli to check his calendar — he opens Zaeli to talk to someone who already knows what's going on and has been thinking about his family. That's a different category entirely.

---

## Philosophy B — AI First (LOCKED Session 9 ✅)

Every product decision flows from this: **Zaeli is an AI companion that also manages family life — not a family management platform that has AI.**

What this means in practice:
- Chat is the product's beating heart, not a feature
- Zaeli speaks first every time Rich opens the app — the conversation has already started
- Dashboard is a reference layer, not the home
- Zaeli Noticed is not a card — it's Zaeli being proactive
- The brief is Zaeli's daily audition. Every morning she gets one chance to remind Rich why he pays $14.99/month.

**The navigation architecture review** — LOCKED in Session 14. Chat is now page 0 (opens here), Dashboard is page 1 (swipe right), My Space moved to standalone route accessed via MoreSheet. FAB completely removed; replaced by universal hamburger ☰ button top-right of every header. Was deferred to Phase 2 — executed Session 14.

---

## Zaeli's Voice (LOCKED — expanded Session 9)

Sharp, warm, genuinely enthusiastic about this family. Finds the funny angle through delight, not detachment. Energy matches the moment — get-up-and-go in the morning, calm and settled at night.

**The winning mantra:** Zaeli makes Rich feel capable, in control, and like he's winning at family life. This is the core emotional job. Not organisation. Not reminders. Winning.

**Hard rules:** Never 'mate'. Never starts with 'I'. Plain text only. Always ends on a confident offer or warm close.

**Active credit:** Zaeli uses first person for actions she took. "I've updated Gab's soccer" — not passive voice. She is an active participant, not a reporter.

**Banned:** 'queued up', 'sorted', 'tidy', 'chaos', 'ambush', 'sprint', 'locked in', 'breathing room', 'quick wins', 'you've got this', 'make it count', 'absolutely', 'certainly', 'of course'.

**Mini warmth rules:** GPT-5.4 mini responses must sound like Zaeli too. Never just confirms. Matches user energy. Closes casual exchanges with one warm line. Occasional acknowledgement of effort — "You've earned a quiet evening." Never manufactured, always earned.

---

## Target Market

Australian families with children. Priority: dual-income metro couples with primary school-aged kids.

**Revenue:** A$14.99/month family · A$9.99/child/month Tutor · 100% web sales.

**Word of mouth is the primary growth mechanism.** People don't talk about apps — they talk about experiences that surprised them. Zaeli has to earn that surprise every single morning brief.

---

## ══════════════════════════════════
## INTERFACE PHILOSOPHY (REBUILT Session 14 ✅)
## ══════════════════════════════════

**Two screens. No FAB. Hamburger menu. Chat-first.**

```
CHAT (page 0, opens here)  ↔  DASHBOARD (page 1)
```

**Core UX principle:** Chat = relationship (home). Dashboard = glance. My Space = personal (standalone route, accessed via MoreSheet). Zaeli lives in Chat — Rich opens the app and Zaeli is already talking.

**Universal hamburger ☰** top-right of every screen AND every 92% sheet (Session 15) opens MoreSheet — a 92% bottom sheet with:
- **NAVIGATE** (2 tiles): Chat · Dashboard
- **FAMILY CHANNELS** (6 tiles, 3×2): Calendar · Shopping · Meals · Tasks · Notes · Travel
- **PERSONAL** (2 tiles): My Space · Our Budget
- **MODULES** (2 tiles): Tutor · Kids Hub
- **ACCOUNT** (2 tiles): Our Family · Settings

**Cross-sheet navigation (Session 15)** — user can jump from Meals sheet → hamburger → tap Shopping → go straight to Shopping. Option A stacked: close current sheet, open MoreSheet, tap tile = switch. X on MoreSheet restores origin sheet.

**Chat bar lives ONLY on Chat (and Tutor sessions)** — single white pill, `[Mic | sep | TextInput | Camera | Send]`. Tutor bar matches identical specs. Camera opens Add-to-Chat picker (Camera/Photos). Dashboard and My Space have NO chat bar — each screen has its own purpose.

---

## ══════════════════════════════════
## AI BRIEF SYSTEM v3 (Session 19 ✅ — UPDATED from Session 9)
## ══════════════════════════════════

**Two** proactive briefs per day — morning + evening. Reduced from 3 (midday killed Session 19 — notification burden wasn't justified). Generated by Sonnet. Cached family-wide in `zaeli_briefs`. Displayed as a tinted bubble at the top of chat.

**Brief firing logic:** Fires on app open if time window has changed AND there's been a natural break (app closed, or last message >15 min ago). Held if actively mid-conversation — fires on next open or after 15 min inactivity.

**Time windows:**
- **Morning** 05:00–15:59 — "here's your day" (forward-looking)
- **Evening** 16:00–04:59 — "today's wrap + tomorrow's shape" (reflective + one step ahead)

Evening now carries tomorrow-morning prep (dinner plans, pack-ahead nudges) so morning brief doesn't have to. **Never reintroduce a third window.**

**Render — Option B** (Session 19 redesign — replaces Session 16's dark slate card):
- Soft tinted bubble matching standard chat bubble shape (radius 18, BBL 6, no border)
- Time-of-day tint: peach `#FDF1E5` morning · lavender `#F0EBFF` evening
- Time-of-day pill at top of bubble: `☀️ MORNING` (peach pill) · `🌙 EVENING` (lavender pill)
- **Win banner KILLED** — encouragement folds into the prose itself. The mint-banner-on-peach-card felt "all over the shop"
- Eyebrow simplified to `Zaeli · 12:31pm` (window context lives in pill, no redundancy)

**Format rules — structured 3-paragraph prose** (Session 19 generator rewrite):
- `[OPENER]` — 1 line + 1 emoji. Sets the day's vibe. Reference weather/day-of-week/season.
- `[BODY]` — 2-3 sentences with specifics (names, times, items). Optional 1 emoji at end.
- `[ONE THING]` — single actionable nudge. Lead with "One thing:" or similar.
- Max 100 words total. 1 emoji per paragraph max (so 2-3 across whole brief, never more).
- Quiet-day mode collapses to opener + one thing only. Drop the body if there's no data to fill it honestly.
- Plain text only. No markdown. No bullets. NEVER "mate", "sorted", "locked in", "you've got this", etc.

**Caching:** Brief text saved to `zaeli_briefs` Supabase table, family-scoped. Prompt caching (Anthropic API) used on input tokens — ~90% cost reduction on repeated context. `data_signature` hash detects family-context drift and triggers regen.

---

## ══════════════════════════════════
## ONBOARDING FLOW (LOCKED Session 19 ✅)
## ══════════════════════════════════

13-step Zaeli-led conversation. Lives at `app/onboarding/index.tsx`. Routes to `/(tabs)/swipe-world` on finish, sets two AsyncStorage flags: `onboarding_complete` + `onboarding_just_completed` (the latter triggers the tour offer in chat).

**The 13 steps:**
1. **Welcome splash** — orb design (peach/mint/lavender/sky on warm BG), wordmark with sky `a+i`, "Less **chaos**." in coral. CTA "Let's meet".
2. **Opener (Zaeli intro)** — `Hey 👋 I'm Zaeli` greeting, voice-pill demo, forward-looking message-me/mic/photo line with sprinkled emoji. CTA "Let's go".
3. **Name + email** — collected via chat exchange.
4. **Family setup** — primary user auto-seeded as first parent. Add other parents + kids inline.
5. **Daily rhythm** — school run + dinner + bedtime times. Family greeting plays in.
6. **Preferences** — chip multi-select (no "All of the above" pill).
7. **Permissions** — location + notifications.
8. **Pantry demo** — chat-driven shopping demo.
9. **Homework demo** — practice session card (multi-choice A/B/C/D) + parent recap card (stats grid + tags + extension badge).
10. **Life demo** — "Brentwood Primary excursion consent" photo card → Zaeli extracts date/cost/deadline → suggests calendar add. (White photo card + sky-blue answer card, NOT old peach-on-peach.)
11. **Brief preview** — pixel-matches the live brief. Peach bubble + ☀️ MORNING pill + structured 3-paragraph prose (☔/🥞/🍽). Win banner killed.
12. **Dashboard reveal** — interactive swipe to see real Dashboard with all 5 cards.
13. **Ready** — "You're in good hands" with same orb design + "✨" star + "Start with Zaeli" CTA + 14-day free trial fine print.

**Locked rules Session 19:**
- No fake chat bar in onboarding (removed — was misleading since locked)
- Splash + Ready use the SAME orb design (4 orbs, warm BG)
- Brief preview MUST mirror the live brief render (Option B)
- "Let's go" everywhere as the standard CTA (was "Go on then")
- Forward-looking copy on Step 2 — no contradictions about features that aren't tappable yet

---

## ══════════════════════════════════
## TOUR SYSTEM (LOCKED Session 19 ✅)
## ══════════════════════════════════

Post-onboarding 11-stop guided tour. Fires automatically when user lands in chat fresh from onboarding (`onboarding_just_completed` flag). Replayable forever from Settings.

**Architecture:**
- `lib/tour-state.ts` — state machine + 11 STOPS data array. AsyncStorage `tour_state_v1`. Single source of truth.
- `app/tour/index.tsx` — single dedicated route renders current stop. Animated progress bar. Bottom Back/Next nav. Finale celebration screen.
- `app/components/TourBanner.tsx` — reusable first-time banner inside live sheets. Per-sheet AsyncStorage flag.
- Settings → Replay tour view (in `app/(tabs)/settings.tsx`) — "Start full tour" hero + 11-row per-stop picker.

**The 11 stops:**
1. Smart Shopping List · 🛒 · lavender → opens Shopping sheet
2. Meal Planner · 🍝 · mint → opens Meals sheet
3. Calendar · 📅 · cobalt → opens Calendar sheet
4. Kids Hub · 🎮 · lavender → routes to /(tabs)/kids
5. Tasks & Reminders · ✓ · gold → opens Notes & Tasks sheet (Tasks tab)
6. Photos & Docs · 📸 · peach → routes to chat (camera lives in chat bar)
7. **Tutor (HERO)** · 📚 · violet → routes to /(tabs)/tutor — trial badge "✨ FREE FOR 14 DAYS", 2 CTAs ("Open Tutor" + "Just have a look"), price line "$9.99 / child / month"
8. Travel · ✈️ · sky → routes to /(tabs)/travel
9. Our Budget · 💰 · mint → routes to /(tabs)/our-budget
10. My Space · 🌿 · peach → routes to /(tabs)/my-space
11. Our Family · 👨‍👩‍👧‍👦 · magenta → routes to /(tabs)/family

**Per-stop card structure:** icon · cardTitle · cardSub · "Try saying" callout (mint dashed, sky for tap-actions) · feature pills · primary CTA. Hero (Tutor) adds trial badge inline at top + secondary "Just have a look" CTA + price line.

**Tour pill on chat:** floats bottom-LEFT (right reserved for scroll arrows) when `isInProgress()`. "🧭 Resume tour" + mint badge "X/11". Tap → /tour at saved stop.

**First-time mint banner inside live sheets:** mint banner appears at top of Shopping/Meals/Calendar/Notes&Tasks the first time the user opens that sheet during the tour. Dismissable. Per-sheet flag `tour_banner_seen_<key>`.

**Inactivity re-prompt:** if mid-tour and chat closed >24h, next morning chat pushes Zaeli message *"We were on the [Stop] stop. Want to pick up where we left off, or skip ahead? You're 3 of 11 through 🧭"* with chips ▶ Continue / 🏁 Skip to end / Not right now. 24h cooldown between prompts.

**Settings → Replay tour:** always accessible. Hero card "▶ Start full tour" + per-stop picker. Tutor row tagged "Hero feature" with violet styling.

**Locked rules:**
- 11 stops total. Tutor at 7 = HERO with violet treatment.
- Trial-period pill countdown DELIBERATELY skipped — felt "too pushy" (Richard's call).
- Tour offer chip MUST call `replayFromStart()` first or stale finale state lands user wrong.
- Progress formula `((cur-1)/(TOTAL-1))*100` — stop 1 = 0%, stop 11 = 100%.

---

## ══════════════════════════════════
## INVITE SYSTEM (LOCKED Session 19 ✅)
## ══════════════════════════════════

Anyone with a device can be invited (other parent, grandparent, carer, kid with own device). Two roles only: **Adult** (full access, equal) and **Kid** (full access EXCEPT Our Budget + Our Family management).

**Why no Helper / granular roles for v1:** simpler to ship, real cross-device requires backend anyway. Layer in if needed when we have actual user data.

**Architecture:**
- `lib/invite-state.ts` — pending invite store. Mock 6-char token. Per-role SMS composer. Copy/Resend/Revoke. AsyncStorage `invite_state_v1`.
- `lib/account-state.ts` — current account identity (`owner` / `adult` / `kid`). AsyncStorage `account_state_v1`. Used by MoreSheet for permission gating.
- `app/invite/index.tsx` — inviter side: role picker (no emoji, color-coded names) + form (name + optional phone + live SMS preview) + iOS share sheet trigger.
- `app/invite/[token].tsx` — receiver side: branches by role into Adult flow (4 steps) or Kid flow (3 steps).

**Invite flow (inviter):**
1. Family screen → "+ Invite" CTA card (mint dashed, bottom of list — for *new* people not in onboarding)
2. **OR** inline "+ Invite to Zaeli" button on existing member rows (Anna, Gab, Duke who haven't joined yet)
3. **OR** "+ Give them their own" outlined button on members marked "Uses parent's device" (Duke turning 11 etc)
4. Pick role (Adult sky tile · Kid lavender tile)
5. Enter name (pre-filled if from inline tap) + optional phone
6. Live SMS preview shows what the invitee will receive
7. "Send invite" → `createInvite()` saves pending row → iOS share sheet opens with pre-composed message
8. User picks Messages / Mail / WhatsApp / Copy → SMS goes out
9. Returns to Family screen — pending row appears with PENDING tag + Copy/Resend/Revoke chips

**Per-member status grid on Family screen:**

| Member status | What shows |
|---|---|
| Account owner (you) | "You · Account owner" green tag |
| Joined (own device, accepted) | "Joined" green tag |
| Invite sent (pending) | "⏳ Invite sent · X ago" yellow tag |
| Has device, never invited | "+ Invite to Zaeli" filled mint pill (tap → role pre-set) |
| Uses parent's device | "Uses parent's device" + "+ Give them their own" outlined mint button |

Status badges are 11-12px font, padding 10×5+, hitSlop 10 — not the tiny 9px illegible originals.

**Receiver side — Adult flow (4 steps, ~90 sec):**
1. Welcome splash (same orb design as onboarding) — "Hey [Name] 👋 [Inviter] already set up your family"
2. Confirm name + email + create password
3. Their own brief times (rhythm — different from inviter's is fine)
4. Personal preferences (chip multi-select, skip-able with hint that family setup is done)
5. → `markAccepted()` + `setAccount({kind:'adult'})` + sets `onboarding_just_completed` → routes to chat → tour offer auto-fires (full 11 stops)

**Receiver side — Kid flow (3 steps):**
1. Welcome splash (lavender orbs) — "Hi [Name]! ✨ Welcome to your hub"
2. Pick avatar (8 emoji options) + 4-digit PIN (not password, kid-friendly)
3. Capability intro tiles (Jobs & Rewards · Games · Tutor · Chat with me)
4. → `markAccepted()` + `setAccount({kind:'kid', name, avatar})` → routes to /(tabs)/kids (Kids Hub, NOT chat)

**Inviter heads-up:** when invitee accepts, chat pushes a tinted Zaeli message:
- Adult: *"✨ [Name] just joined — they'll have their own brief tomorrow morning. Anything you want me to flag for their first day?"*
- Kid: *"🎉 [Name] just joined their Hub. Want me to add a reward they can save towards?"*

**Permission gating (kid accounts):**
- MoreSheet hides **Budget** and **Family** tiles
- Direct route navigation NOT yet gated — kid could type `/our-budget`. Backend pass adds route-level guards.

**Trust the link** — no approval flow. Anyone with the link joins. Safer flows (token expiry, single-use) come with backend pass.

**Mock token note:** v1 invites use a local AsyncStorage-only token (`zaeli.app/i/<6-char>`). Real cross-device validation requires Supabase invite_tokens table + real deep-link domain — Phase 37 (backend pass).

---

## ══════════════════════════════════
## MODEL ROUTING (Session 9 ✅)
## ══════════════════════════════════

```
Sonnet 4.6      → briefs · vision · complex multi-tool · personality-heavy
GPT-5.4 mini    → general chat · simple CRUD · confirmations
GPT-4o-mini     → Zaeli Noticed ONLY (already working, don't change)
Whisper-1       → voice transcription (unchanged)
```

**Cost:** ~$2.67/family/month with prompt caching (18% of revenue) at 1,500 calls/month stress test. Average family ~$1.35/month. Comfortable at $14.99 revenue.

**Why GPT-5.4 mini not Haiku:** Benchmarks significantly higher on reasoning and general knowledge. Better conversational quality. At $0.75/$4.50 per M tokens, similar cost to Haiku but meaningfully better output for Zaeli's voice.

---

## ══════════════════════════════════
## DASHBOARD — REDESIGNED (Session 9 ✅)
## ══════════════════════════════════

**5 clean rows — LOCKED:**
1. **Calendar** — dark slate · full width · collapsed headline + events on expand
2. **Meal Planner** — mint · full width · tonight's meal + week on expand · renamed from Dinner
3. **Weather + Zaeli Noticed** — bento · Weather left · Zaeli Noticed RIGHT (promoted from bottom)
4. **Shopping** — lavender · full width · unchanged
5. **On the Radar** — gold · full width · personal + shared tasks due in 7 days · renamed from Family Tasks

**Removed:** Our Budget tile (→ More sheet placeholder) · Zaeli brief card (→ Chat)
**Promoted:** Zaeli Noticed from bottom bento to weather bento row
**Renamed:** Family Tasks → "On the Radar" on Dashboard (My Space card still "Notes & Tasks")

---

## ══════════════════════════════════
## CAMERA & UPLOAD (Session 9 ✅)
## ══════════════════════════════════

**Chat bar:** SVG camera icon (coral) inside right of text input. Taps open 92% action sheet: Take photo · Choose from library · Upload file. Image/file → Sonnet vision → conversational response.

**FAB More sheet:** 3-column upload grid at top of More sheet. Same three options. After selection → navigate to Chat with image pre-loaded.

**Permissions:** Request on first use only. Camera permission for camera. Library permission for library. Toast if denied.

---

## ══════════════════════════════════
## MEAL PLANNER SHEET (Session 9 ✅)
## ══════════════════════════════════

Three tabs: **Meals · Recipes · Favourites**

**Meals tab:** 7-day planner with today highlighted. Each day: meal name, cooking avatar(s), heart to favourite, Swap or + Add. Swap picker inline with Favourites + Move night tabs. Who's cooking picker with family colour circles.

**Recipes tab:** + Add Recipe + Upload Recipe buttons. Search. 2-column grid. Tap → detail with pantry-aware ingredient list + "Send to shopping list" (cross-checks pantry, user can override status).

**Favourites tab:** Same grid, hearted only. Empty state. Recipes saved from both Meals tab hearts and Recipes tab hearts.

**Recipe upload:** Photo of recipe book via Sonnet vision → pre-filled form for review before saving.

**Shopping list send:** Shows all ingredients with pantry status. User can tap "In pantry ✓" to override to "Adding →". Confirm button count updates live.

**Reference:** `zaeli-meals-mockup.html` — 10 screen states + build notes

---

## ══════════════════════════════════
## OUR BUDGET — PURE PLANNER (LOCKED Session 17 ✅)
## ══════════════════════════════════

### Strategic positioning (Session 17 pivot)

**What we tried (v1):** Classic live-tracking budget app. Upload statement → parse transactions → show "spent this month vs budget" → status tiles (on track / watch / over) → transaction ledger.

**Why it broke:** Without a bank feed (Basiq / Open Banking), live tracking is a lie. Real families don't upload every week. The moment data is stale, the app misleads them. Richard confirmed this with real data — November ATM withdrawals got imported as "this month" spend, breaking user trust immediately.

**The pivot:** **Our Budget is a PLANNER, not a tracker.** Zaeli helps families *plan* a realistic monthly budget. They *see* it. They *adjust* it. They *work toward* savings goals. She never pretends to know what they spent this month without a real feed.

This is honest positioning. Trades off "daily accountability" (which users drift from anyway) for "planning clarity" (which stays relevant forever).

### What's in (Session 17 build)
- **Monthly income streams** — per earner, edit any, combined total
- **Fixed categories with line items** — families enumerate actual commitments (Netflix $22, Spotify $12, iCloud $5...). Budget = sum, auto-calculated. Different families have wildly different lists, so itemisation matters.
- **Variable categories with a single target** — Groceries $450, Dining $250. Estimates, not enumerations.
- **Savings goals** — forward-looking, manual progress. User updates "saved so far" when they move money.
- **One-off AI helper** — "Help me set realistic budgets". Upload a statement → Zaeli produces 3 kinds of suggestions: (1) variable category averages to accept/edit/skip, (2) new categories detected (e.g. "Fuel"), (3) recurring subscriptions detected → added as line items. **Raw statement content never stored** — only accepted amounts persist.

### What's out (deliberately removed)
- Live "spent this month" numbers
- Transaction ledger / per-category history
- Status tiles (on track / watch / over)
- Monthly review rows / spent-vs-budget surfaces
- Add transaction UI
- Reality-check banner

### Zaeli's value in the planner model
- Setup nudges when categories are empty — "Want help setting realistic budgets?"
- Plan quality commentary — "74% budgeted, 15% savings rate — strong plan"
- Comparative nudges — "Groceries at $450 is low for 5 people. Typical is $520-580."
- Goal nudges — "$50 more per month finishes Noosa by July."
- Future: What-If mode (pay rise / part time / remove car loan) — pure math, no tracking

### UI spec (Session 17 v2)
- **3 tabs**: Overview · Categories · Savings (renamed from Goals)
- **Overview hero**: monthly income ($48px) + Expenses / Savings / Surplus grid
- **Allocation chart (Option D)**: labelled stacked bar with `%` inside each segment + 3 tinted chips below with dollar amounts. Over state: peach chip + warm warning.
- **Your Expenses** section: Fixed row + Variable row (tap to go to Categories tab)
- **Your Savings** section: Goals row (tap to go to Savings tab)
- **AI helper** CTA at bottom: dashed mint border
- **Fixed category detail**: line items list, auto-sum budget, + Add line item
- **Variable category detail**: single editable monthly target
- **Savings tab**: goal cards with saved/target/contribution/date stats, tap to edit

### Palette (Meals-aligned, Session 17)
- Primary: `#2D7A52` deep green (Meals palette) — replaces emerald `#059669`
- Accent: `#B8EDD0` mint (wordmark `a+i`, surplus, AI helper icon)
- Card tint: `#E6F7EF`
- Border tint: `#C8F0DA`
- Savings: `#A8D8F0` sky (My Space palette)
- Over/warning: `#FAC8A8` peach (Notes palette) + `#8A3A00` brown text — warm, not alarm red
- Destructive (delete): `#C53030` kept for Delete Category / Delete Goal

### Basiq status (unchanged)
Bank feed integration still on the roadmap for Phase 2+. A feed would unlock:
- Optional retrospective "reality check" feature ("last 3 months you averaged $520 on groceries — raise to $520?")
- Accurate What-If sandbox
- Possibly automatic line-item refresh for fixed categories (detects subscription price changes)

But the pure planner is now the baseline product — Basiq becomes an enhancement, not a requirement.

**Reference HTML**: `zaeli-budget-v2-mockup.html` (planner design) + `zaeli-budget-v2-theming.html` (mint palette + 4 chart options → D picked).

---

## ══════════════════════════════════
## SCREEN ARCHITECTURE (REBUILT Session 14 ✅)
## ══════════════════════════════════

**Two navigable swipe screens — Chat-first:**
```
CHAT (page 0) ← opens here    DASHBOARD (page 1)
              ← swipe right →
```

**Standalone routes (accessed via MoreSheet):**
My Space (`/(tabs)/my-space`) · Tutor · Kids Hub · Our Family · Settings · Our Budget

**92% SHEETS (triggered from Chat or MoreSheet):**
Calendar · Shopping · Meal Planner · Notes & Tasks · Travel

**Hamburger ☰ MoreSheet contents (app/components/MoreSheet.tsx):**
- Family Channels (6): Calendar · Shopping · Meals · Tasks · Notes · Travel
- Personal (1): My Space
- Modules (4): Tutor · Kids Hub · Our Family · Our Budget
- Navigation (3): Chat · Dashboard · Settings

**Camera + Library** live inside the Chat bar (coral camera icon opens Add-to-Chat picker with Camera/Photos/Live options). NOT in MoreSheet (camera only makes sense in Chat context).

**Back arrows** on all standalone routes (next to zaeli wordmark): Tutor · Kids Hub · Our Family · My Space · Dashboard (yes, Dashboard has one to jump back to Chat quickly).

---

## ══════════════════════════════════
## MY SPACE — CARD ORDER (LOCKED ✅)
## ══════════════════════════════════

1. Zaeli brief + quote (dark slate)
2. Word of the Day (sage — inline expand only)
3. **Goals — FULL WIDTH** (gold)
4. **2-col:** Fitness (slate) + Notes & Tasks (peach)
5. **2-col:** Daily Stretch (sage) + Zen (light blue)
6. Wordle — full width (lavender)

---

## ══════════════════════════════════
## WORDMARK & BRAND IDENTITY (LOCKED ✅)
## ══════════════════════════════════

**The wordmark:** `zaeli` — Poppins_800ExtraBold
- Dashboard: 'a' + 'i' = peach `#FAC8A8`
- Chat: 'a' + 'i' = lavender `#C4B4FF`
- My Space: 'a' + 'i' = sky blue `#A8D8F0`
- Our Budget: 'a' + 'i' = mint `#B8EDD0` (Session 17 — swapped from emerald to Meals palette)

---

## ══════════════════════════════════
## KEY PRODUCT MOMENTS
## ══════════════════════════════════

**The morning brief** — Zaeli has already been thinking about the family. "You're in good shape today." That's the word-of-mouth moment.

**Zaeli takes credit** — "I've already moved Gab's soccer to Sunday." Not a notification. A partner.

**The winning close** — "You've earned a quiet evening." Eight words. Rich reads it out to Anna when she gets home. That's the referral.

**The pantry cross-check** — Rich finds a recipe, sends ingredients to the list, Zaeli already knows what's in the pantry. Only adds what's needed. Genuinely magical.

**The all-done moment** — Everything handled. Calendar clear. Shopping sorted. Dinner planned. "Enjoy the evening." That exhale is the product working.

**The casual reply** — Rich says "haha ok thanks" and Zaeli closes with "Enjoy lunch. You've got a good afternoon ahead." Nobody expects an AI to handle that well. That's the surprise.

---

## ══════════════════════════════════
## FULL PROJECT PLAN (Updated 13 April 2026)
## ══════════════════════════════════

### Phase A — Make it solid
1. ✅ Fix Dashboard load speed + Zaeli Noticed AI
2. ✅ Fix weather (wttr.in)
3. ✅ Fix Chat interface — context flow, CRUD tools, mic, UI
4. ✅ Design refresh — all 3 pages, briefs, 6-card grid
5. ✅ All My Space sheets built (Notes, Tasks, Goals, Fitness, Stretch, Zen, Wordle)
6. ✅ Calendar + Shopping sheets fixed
7. ✅ Navigation unified
8. ✅ Dashboard redesign locked (Session 9)
9. ✅ Meal Planner sheet designed (Session 9)
10. ✅ Camera/Upload designed (Session 9)
11. ✅ AI Brief system designed (Session 9)
12. ✅ Zaeli persona + model routing locked (Session 9)
13. ✅ Shopping sheet complete (Session 10) — List/Pantry/Spend, receipt scan, tick/undo
14. ✅ Meal Planner sheet built + polished (Sessions 10-11) — 3 tabs, recipes with photos, cook picker, kids jobs, rolling 10-day, search with day context
15. ✅ Kids Hub — built (Session 12) + trimmed to 3 games (Session 13) — Wordle, Trivia, Crossword
16. ✅ Our Family — v2 built (Session 12) + tutor progress wired (Session 13)
17. ✅ Tutor module — built (Session 13) — 6 pillars, ACARA curriculum, AI summaries, parent views, camera, Whisper
18. ✅ Kids Hub AI trivia (Session 14) — GPT-5.4 mini fresh questions, Supabase history tracking, fallback
19. ✅ Tutor topic chips reworked (Session 14) — Foundation–Year 12, Core-first, all 4 subjects
20. ✅ Tutor difficulty bands wired (Session 14) — load from tutor_progress, track consecutive correct/wrong, persist on exit
21. ✅ Prompt caching for tutor (Session 14) — 30-40% cost saving
22. ✅ Conversation summarisation (Session 14) — bounds input tokens after 8 turns
23. ✅ Dashboard redesign built (Session 14) — 5 rows, On the Radar, header matches My Space, personal_tasks sharing migration
24. ✅ Architecture rebuild (Session 14) — 2-page swipe (Chat+Dashboard), FAB killed, hamburger everywhere, MoreSheet
25. ✅ Camera + Library in chat bar (Session 14) — Add-to-Chat picker sheet
26. ✅ Splash Option C built (Session 14) — Deep Slate + Mint, once per session
27. ✅ MoreSheet restructure (Session 15) — NAVIGATE top, ACCOUNT section, bigger icons/fonts
28. ✅ Cross-sheet hamburger (Session 15) — Option A stacked, works Calendar/Shopping/Meals/Notes & Tasks
29. ✅ Modal stacking bug fixes (Session 15) — onDismiss + fallback timeout, backdrop guard, sync onAction
30. ✅ Chat bar V2 unified with Tutor (Session 15) — single pill style, taller, same on both screens
31. ✅ Splash polish (Session 15) — sky blue a+i, lavender orbs, i-dot fix, once-per-session flag
32. ✅ Dashboard tap-anywhere-to-expand (Session 15) — all 4 cards fully tappable
33. ✅ 2-dot indicator killed (Session 15) — navigation via swipe + MoreSheet NAVIGATE
34. ✅ "Chat" header → "Home" (Session 15)
35. ✅ Legacy "← Dashboard" pill removed (Session 15)
36. ✅ AI Brief system v1 — 3 windows, Sonnet, Supabase cache (Session 16)
36b. ✅ Brief polish + cleanup (Session 17) — quiet-day persona, loading placeholder, ~380 lines of dead code removed
36c. ✅ **Brief v3** (Session 19) — reduced to 2 windows, Option B render (peach/lavender tinted bubble + time-of-day pill, win banner killed), generator rewritten to enforce 3-paragraph structured prose (opener / body / one thing) with 1 emoji per paragraph
37. ✅ Travel module (Session 18 — standalone route, Pure Planner budget, 4 tabs)
37b. ✅ **Onboarding polish** (Session 19) — splash orbs both Welcome + Ready, brief preview Option B, Brentwood example bigger, "Hey 👋", chat bar removed, "Let's go" CTA, emoji throughout, finale sets `onboarding_just_completed`
37c. ✅ **Cold-start splash redesigned** (Session 19) — warm bg + palette orbs (matches onboarding), INK wordmark, coral "chaos", app.json native splash bg #FAF8F5
37d. ✅ **Chat bubble unification** (Session 19) — Zaeli text wrapped in soft-grey bubble, user bubble sky #E8F4FD, both Regular 17/26
38. ✅ **TOUR system** (Session 19) — full build: state machine + 11-stop dedicated route + tour pill on chat + first-time mint banner inside live sheets + Settings replay + inactivity prompt. Tutor stop 7 = HERO with violet treatment + trial badge
39. ✅ **INVITE system** (Session 19) — full build: Adult/Kid roles, mock token via iOS share sheet, per-member status grid + bigger badges, PendingInviteRow with Copy/Resend/Revoke, Receiver flow (Adult 4-step + Kid 3-step), inviter heads-up message in chat, MoreSheet hides Budget+Family for kids, Settings dev rows for testing
40. 🔨 Tutor stress testing — kids testing all 6 pillars (ongoing — surfaced 2 bugs Session 20 already fixed)
41. ✅ Calendar month-view event highlighting glitch — Session 19 quick wins (28 Apr) — fetchMonthDayEvents range query
42. ✅ Tutor session resume — Session 20 (28 Apr) — resumeSessionId param, loadExistingSession from tutor_messages, status flips on resume
43. 🅿️ 100 crossword pool expansion — content task, parked
44. ✅ Kid tour = 9 stops — Session 19 quick wins (28 Apr)
45. ✅ Kids Hub welcome banner — Session 19 quick wins (28 Apr) — kid_just_joined flag + lavender card + auto-jump to kid's hub
46. ✅ Direct-route gating for kid accounts — Session 19 quick wins (28 Apr) — Budget + Family redirect kids to /kids
47. ✅ Chat VIEW-query inline cards — Session 20 (28 Apr) — Shopping/Meals/Tasks "what's on..." now renders inline card + chips, not text walls
48. ✅ Shopping sheet add-bar layout — Session 20 (28 Apr) — explicit useSafeAreaInsets, SafeAreaView edges='[]'
49. ✅ **Backend Phase 1 — Auth foundation** — Session 21 (14 May) — `supabase-auth-tables.sql` (families + profiles + handle_new_user DB trigger + current_family_id helper + 3 RLS policies). `lib/auth.ts` (signUpOwner / signIn / signOut / loadProfile + module cache). `app/(auth)/sign-in.tsx` (3-state UI with palette orbs matching onboarding). `app/_layout.tsx` auth guard + onAuthChange listener. Sign-up flow lands directly in chat (email confirmation disabled for dev).
50. ✅ **Backend Phase 2a — RLS on data tables + getFamilyId() swap** — Session 21 (14-15 May) — `supabase-data-rls.sql` (19 family-scoped tables × 4 policies + claim_legacy_data backfill RPC + tutor_messages session-aware policy). `lib/family.ts` (getFamilyId resolves at query time, warned-once fallback with self-healing loadProfile). 99 swaps from DUMMY_FAMILY_ID constant to getFamilyId() across 12 files (perl word-boundary regex). Plus 3 NEW view-query branches added to send() in index.tsx (Shopping/Meals/Tasks "what's on…" — must go BEFORE calendar branch).
51. ✅ **Backend Phase 2a fixes — session persistence + RLS unblocked** — Session 21 (15 May) — `lib/supabase.ts` AsyncStorage as auth.storage + `react-native-url-polyfill` + AppState foreground/background token refresh. **Critical SQL fix:** `current_family_id()` `SET search_path = public, auth` (was silently returning NULL because `auth.uid()` didn't resolve in SECURITY DEFINER without search_path — biggest backend lesson learned). Re-ran policy DO-block which had silently rolled back on first run (RLS was ON with ZERO policies = deny-everything default).
52. ✅ **Backend Phase 2b — Invite tokens + tour state to Supabase** — Session 21 (15 May) — `supabase-invites-tour.sql` (invite_tokens table + RLS + get_invite_by_token/accept_invite RPCs SECURITY DEFINER and **anon-callable** for receiver lookup + profiles.tour_state JSONB). `lib/invite-state.ts` full rewrite — inviter side hydrates from family-scoped SELECT; receiver side uses new `lookupInviteByToken` / `acceptInviteRemote` via RPC. `lib/tour-state.ts` full rewrite — profile JSONB source of truth, AsyncStorage offline fallback. Public APIs preserved so call sites in chat / family / tour route / settings replay didn't change. Unlocks real cross-device invite tracking at the DB level.
53. ✅ **Backend Phase 2c — Settings preferences to Supabase** — Session 21 (15 May) — `supabase-user-prefs.sql` (profiles.user_preferences JSONB). NEW `lib/user-prefs.ts` with same write-through pattern as tour-state. `settings.tsx` removed inline Prefs interface / DEFAULT_PREFS / PREFS_KEY / loadPrefs / savePrefs (now in lib). All 15 settings fields persist across devices.
54. ✅ **Chat bar photo upload fix** — Session 21 (18 May) — Three combined bugs presenting as one "picker opens, select does nothing" symptom: (1) missing thumbnail preview above bar, (2) send button disabled with photo-only, (3) send tap blocked with photo-only. Fixed all three: 64px thumbnail with "Photo ready — tap send" + ✕ dismiss; opacity check now `!input.trim() && !pendingImage`; tap guard now `if (t.trim() || pendingImage)` calls `send('')` with image.

### Phase B — Make it testable
31. 🔨 Real authentication (replace DUMMY_FAMILY_ID + replace `account-state` AsyncStorage)
32. 🔨 EAS build + TestFlight
33. 🔨 LANDING_TEST_MODE = false
34. ✅ Settings (Session 17 — account, family, subscription, notifications, memory) + tour replay (Session 19) + dev rows (Session 19)
35. ✅ Our Budget v2 Pure Planner built (Session 17)
36. ✅ Nav architecture review — EXECUTED Session 14 (Chat-first, FAB killed, hamburger)
37. ✅ Onboarding flow built (Session 19 polished)

### Phase C — Make it launchable
26. 🔨 Zaeli Voice (ElevenLabs) — **LOCKED Session 20: AFTER backend pass** (avoids re-work when chat UX shifts; brief-only voice could go pre-backend if needed)
27. 🔨 Push notifications (daily brief trigger — wire to Settings brief times) — part of backend pass
28. 🔨 Gmail + Outlook Calendar integration
29. 🔨 Spoonacular integration (Recipes tab)
30. ✅ Interactive onboarding (Session 19 — full polish + tour handoff wired)
31. 🔨 Website + Stripe + web signup flow
32. 🔨 Admin console updates + billing
33. 🔨 **Backend pass — IN PROGRESS, ~50% complete** (multi-session). Status as of 18 May:
    - ✅ Phase 1: Auth foundation (sign-up + sign-in via DB trigger)
    - ✅ Phase 2a: RLS on 19 data tables + DUMMY_FAMILY_ID swap + session persistence
    - ✅ Phase 2b: invite_tokens table + tour state migrated to Supabase (cross-device unlocked at DB level)
    - ✅ Phase 2c: Settings preferences migrated to Supabase (profiles.user_preferences JSONB)
    - 🔨 Phase 2d (NEXT): Real auth wiring at invite acceptance — adult/kid invitees create real Supabase auth users + profiles linked to inviter's family_id (modify handle_new_user trigger to detect invite_token in raw_user_meta_data). Unlocks real cross-device invite usage.
    - 🔨 Phase 2e: Cross-device verification on a real second device.
    - 🔨 Phase 2f: Memory wiring (Settings → Memory view to real family_insights / family_milestones / conversation_memory tables).
    - 🔨 Phase 3: External integrations — Push notifications scheduled to brief times. Stripe customer portal WebView. Real cross-device deep links (zaeli.app/i/<token>).
    - 🔨 Phase 4: Cleanup + ship-ready — Remove dev rows, LANDING_TEST_MODE=false, expo-document-picker for Our Budget CSV (EAS rebuild), share extension (EAS), GDPR / export data / privacy WebViews.

### Phase D — Scale
33. 🔨 Live testing with 10 families
34. 🔨 Analytics
35. 🔨 Data export / GDPR compliance
36. 🔨 Multi-user real-time sync
37. 🔨 App Store submission
38. 🔨 Offline mode (post-launch)

---

## Pre-Launch Checklist

- [x] v5 architecture locked ✅
- [x] ZaeliFAB ✅
- [x] Landing overlay ✅
- [x] Dashboard — all cards ✅
- [x] Dashboard → Chat context injection ✅
- [x] swipe-world.tsx container ✅
- [x] Wordmark updated ✅
- [x] My Space — all 7 cards + full sheets ✅
- [x] AI Zaeli Noticed (GPT mini) ✅
- [x] Weather switched to wttr.in ✅
- [x] Chat interface — context flow, CRUD tools, mic ✅
- [x] Design refresh — all 3 pages ✅
- [x] Calendar sheet fixed ✅
- [x] Shopping sheet complete ✅ (Session 10 — List/Pantry/Spend, receipt scan, tick/undo, duplicate check)
- [x] Navigation unified ✅
- [x] Dashboard redesign — design locked ✅
- [x] Meal Planner sheet — design locked ✅
- [x] Camera/Upload — design locked ✅
- [x] AI Brief system — design locked ✅
- [x] Zaeli persona + model routing — locked ✅
- [x] Philosophy B — locked ✅
- [x] Meal Planner sheet — built ✅ (Session 10)
- [x] Dashboard redesign — built ✅ (Session 14)
- [x] Camera/Upload — built ✅ (Session 14, Add-to-Chat picker)
- [x] Architecture rebuild — 2-page Chat-first, FAB killed, hamburger + MoreSheet ✅ (Session 14)
- [x] Splash Option C — built ✅ (Session 14)
- [x] Tutor difficulty bands + prompt caching + conversation summarisation ✅ (Session 14)
- [x] Kids Hub AI trivia ✅ (Session 14)
- [x] GPT-5.4 mini routing — already live
- [ ] AI Brief system — implement (BIGGEST remaining)
- [ ] zaeli_briefs Supabase table
- [x] Real authentication ✅ (Session 21 — Phase 1 sign-up/sign-in via DB trigger; Phase 2d will add invitee signup)
- [ ] EAS build · TestFlight · native splash rebuild (for app.json changes)
- [ ] LANDING_TEST_MODE = false
- [x] Kids Hub ✅ (Session 12 — built, Session 13 — trimmed to 3 games, crossword fixed)
- [x] Tutor module ✅ (Session 13 — 6 pillars, ACARA curriculum, AI summaries, parent views)
- [x] Our Family ✅ (Session 12 — v2 tabs, Session 13 — live tutor progress + session review)
- [x] Settings ✅ (Session 17 — main/notifications/memory, DateTimePicker for brief times, AsyncStorage)
- [x] Our Budget ✅ (Session 17 — v2 Pure Planner, mint palette, Option D chart, AI helper with paste + photo)
- [x] Travel ✅ (Session 18 — standalone route, Trip Stack + Trip Detail 4 tabs, pure-planner budget auto-summing bookings, unified add/edit sheets, keyboard fix)
- [ ] Zaeli Voice (ElevenLabs)
- [ ] Push notifications
- [ ] Gmail + Outlook Calendar integration
- [ ] Spoonacular integration
- [ ] Interactive onboarding
- [ ] Website + Stripe + web signup
- [ ] HealthKit (Fitness sheet — EAS build)
- [ ] YouTube embedded player (Stretch + Zen — EAS build)
- [ ] Wordle cross-family challenges (after real auth)
- [ ] Live testing with 10 families
- [ ] Analytics
- [ ] GDPR / data export
- [ ] Multi-user sync
- [ ] App Store submission
- [ ] Offline mode
