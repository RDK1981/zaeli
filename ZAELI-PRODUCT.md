# ZAELI-PRODUCT.md — Product Vision & Decisions
*Last updated: 14 July 2026 — Session 30 ✅ · FAMILY PUSH NOTIFICATIONS + MULTI-PHOTO CHAT + TESTFLIGHT CYCLE + STRIPE CHECKOUT TESTABLE · **Family push notifications infrastructure** — `profiles.expo_push_token` column, `family-notify` Supabase Edge Function (Deno, JWT-verified, family-boundary-enforced, batches to Expo push API), client-side `registerPushToken` on sign-in, `notifyFamily` helper. New "Notify" chip on calendar confirm cards. New `send_family_message` chat tool ("text Anna to say home in 20"). Installation blocker found + fixed: `expo-notifications` plugin was missing from `app.json`, causing silent APNs failures — needs one more build cycle (#17) to verify end-to-end. Push credentials confirmed auto-provisioned. Family push is the last piece of the "Zaeli lives across every family member's phone" story · **Multi-photo chat upload** — up to 4 attachments per send. Additive picker (Camera + Photos both append rather than replace). Horizontal thumbnail strip above chat bar. Single Sonnet call for all images with aggregation prompt (same pattern as Session 29's multi-photo receipt scan). School newsletters, multi-page consent forms, and multi-angle photo questions now handled in one shot · **Spend receipt scan UX overhaul** — replaced the confusing bottom banner + result popup with a clean full-screen "Processing..." overlay. Silent success (receipt just appears in the list). Errors surface via Alert. Coherent visual language across all scan operations · **Stripe checkout testability** — new Developer row force-opens Stripe Payment Link even when beta grant would hide the Subscribe button. Foreground profile refresh so returning from Stripe checkout auto-updates subscription state without a manual sign-out cycle. Full checkout loop now testable end-to-end without leaving beta mode · **Kids Trivia answer-in-question guard** — Anna beta feedback: Duke got a question that literally said "...and is called soccer in many countries?" with answer "Soccer". Three-layer defence (prompt rule against answer leaks + client-side word-boundary regex filter). Same shape as Session 29's Tutor accuracy fix — quality bugs that only surface when kids actually use the product · **Splash cold-start latency fix** — 3-second splash on foreground return reduced by not blocking `setAuthed` on `loadProfile()`. Splash-hide gate now fires on session-verified (fast AsyncStorage read) rather than profile-loaded (slow Supabase network round-trip) · **TestFlight cycle unblocked** — EAS free-tier build cap hit; Rich upgraded to Starter plan (14 builds/month). First iOS TestFlight submission cycle for build #15 completed; the expo-notifications discovery required additional cycle #16, verification pending on #17. Build cadence no longer a bottleneck for Anna beta round 2 · Prior Session 29 (meal planner pivot, Anna beta round 1 fixes, cost economics) + Session 28 (Stripe end-to-end, calendar phantom fix, splash saga) + Session 27 (icon 2B, preview build) + Session 26 (brief invisible-domain rule, pricing pivot A$9.99 / A$7.99) + Session 25 (Universal Links LIVE) all still current · Remaining: build #17 push verification, Anna beta round 2, Anna's phone (Phase 2e cross-device), Phase 5 API keys server-side*

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
- The brief is Zaeli's daily audition. Every morning she gets one chance to remind Rich why he pays $9.99/month inc GST.

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

**Revenue (Session 25 — reduced for competitive positioning in a tight economy):** A$9.99/month family inc GST · A$7.99/child/month Tutor inc GST · 100% web sales. Prior pricing (A$14.99 / A$9.99) held back conversion conversations — the sub-A$10 anchor materially changes the pitch. Tutor stays the largest revenue lever (family of 3 kids on Tutor = A$23.97 additional / month, more than 2x the base plan).

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
7. **Tutor (HERO)** · 📚 · violet → routes to /(tabs)/tutor — trial badge "✨ FREE FOR 14 DAYS", 2 CTAs ("Open Tutor" + "Just have a look"), price line "$7.99 / child / month"
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
## CAMERA & UPLOAD (Session 9 · multi-photo Session 30 ✅)
## ══════════════════════════════════

**Chat bar:** SVG camera icon (coral) inside right of text input. Taps open 92% action sheet: Take photo · Choose from library · Upload file. Image/file → Sonnet vision → conversational response.

**Multi-photo (Session 30):** Up to 4 attachments per send. Picker is **additive** — tapping Camera OR Photos appends to the pending set rather than replacing. Horizontal thumbnail strip above the input pill (64px thumbs + ✕ per photo). One Sonnet vision call for all images with an aggregation prompt. Same pattern used by the Session 29 multi-photo receipt scan. Unblocks: multi-page school newsletters, multi-page consent forms, multi-angle photo questions.

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
## MEAL PLANNER v2 — RECIPES-FIRST (LOCKED Session 29 ✅)
## ══════════════════════════════════

### The Anna insight

Session 29 was Anna's second round of beta testing. One line of feedback shifted the whole module: *"meal planning daily is too much effort — no busy family will sustain it."*

Same shape as the Session 26 brief pivot. Something that presents as helpfulness (a 7-day meal planner) is actually friction. Busy families don't have the time or headspace to plan every meal every week. They rely on 15-20 dinners they know how to cook, rotating with what's in the pantry. The old Meals-first design pretended otherwise.

### The pivot

**Old orientation:** Meals tab first · Recipes middle · Favourites last. Meals tab was a 7-day planner asking families to make daily decisions.

**New orientation:** **Recipes tab first · Regulars middle · Meals demoted to "Plan" mode.** Zaeli asks about tonight's dinner and suggests from the family's saved recipes — cross-checking pantry — instead of pushing users into a planning UI.

**Rename: "Favourites" → "Regulars".** Same underlying `is_favourite` flag, but the label reframes what the tab is for. "Favourites" is aspirational (the meals I love in theory). "Regulars" is honest (the meals we actually cook). Busy families have a rotation, not a wishlist.

**Dashboard card: "Meal Planner" → "Tonight's Meals"** with a "See family regulars" CTA. Same shift — from planning surface to suggestion surface. The Session 9 spec called this card "Meal Planner"; Session 29 supersedes that name.

### Zaeli's new job

Regulars are wired into Zaeli's chat context. When Rich asks "quick dinner suggestion?", she picks from THEIR saved recipes, factors in what's in the pantry, and proposes 2-3 options with a one-line rationale each. No planning UI required. She works with the family's real rotation instead of asking them to invent one.

The Meals (Plan) tab is retained — families who *want* to plan a week ahead can — but it's no longer the entry point. Discovery starts with recipes; commitment happens through Zaeli asking, not through the user pushing.

### Why this is a Philosophy B win

Same discipline as the invisible-domain rule for briefs (Session 26). Same discipline as Our Budget's pure-planner pivot (Session 17). **Zaeli becomes MORE useful by asking families to DO LESS.**

The counterfactual is common in productivity apps: teams add features, force users to enter more data, then wonder why engagement drops. Every "less is more" call we've made — dropping midday brief, invisible domains, pure planner budget, regulars-first meals — has strengthened the product's core value proposition (Zaeli notices, suggests, remembers) at the expense of features that felt like value but were actually friction.

Locked. Never reintroduce the "7-day planner as home" surface for Meals.

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
55. ✅ **Backend Phase 2d — Real auth at invite acceptance** — Session 22 (20 May) — `supabase-invite-signup.sql` updates the `handle_new_user()` trigger to branch on `invite_token` in `raw_user_meta_data`. With token: validates, creates profile linked to inviter's `family_id`, marks invite accepted atomically. Bad tokens raise → auth.users INSERT rolls back → no orphan users. `lib/auth.ts` NEW `signUpFromInvite()` helper. `app/invite/[token].tsx` adult flow does real signup with form email+password (client-side validated), kid flow uses synthetic email (`kid-<token>@invitees.zaeli.app`) + token+PIN password. **Cross-device invite + signup now works end-to-end.**
56. ✅ **Multi-user safety patches** — Session 22 (20 May) — six combined fixes surfaced during 2d on-device testing: (1) heads-up filter now `inviter_user_id === currentUserId` so only the actual sender sees "X just joined"; (2) chat persistence file scoped per-user (`zaeli_chat_home_<userId>.json`) via auth.onAuthStateChange subscription in `useChatPersistence`; (3) local chat `messages` state resets on user switch via `chatLoaded` true→false→true transition detection; (4) tour-state + user-prefs no longer fall back to AsyncStorage when signed in (profile JSONB is sole source — pre-empts silent leak when fresh user's profile.X is null); (5) all module caches invalidated in `_layout.tsx` `onAuthChange` (tour, prefs, invites + existing account) on both SIGNED_IN and SIGNED_OUT; (6) fresh-invitee welcome polish — when `onboarding_just_completed === 'true'` AND `profile.kind !== 'owner'`, suppress family brief on first session and push warm welcome ("Hey <name> 👋 Welcome in...") instead.
57. ✅ **Backend Phase 2f — Memory view → real Supabase data** — Session 23 (28 May) — Settings → Memory was dummy data; now reads `family_insights` + `family_milestones` via new lib fetchers (`fetchInsightsByCategory`, `fetchMilestones`), with × delete (optimistic + DB) and clear-all (wipes insights + milestones + conversation_memory + pattern_log). Per-category empty states + confidence-derived sub labels.
58. ✅ **Backend Phase 2f+ — COMPLETED the memory capture + recall loop** ⭐ — Session 23 (28 May) — the core Philosophy B promise made real. Chat now: RECALLS (`buildMemoryContext` injected into the system prompt so Zaeli uses learned facts), CAPTURES (`saveConversation` after each exchange), and EXTRACTS (new `detectInsightsFromConversations` runs every 6 exchanges — Sonnet reads recent conversation_memory, pulls DURABLE facts only, writes via `writeInsight` which dedupes + bumps confidence). All gated by the "learn from chats" toggle. Verified: chatted facts → ran extraction → insights appeared → Zaeli recalled them unprompted. Previously the entire memory system was display-only — nothing wrote to it and Zaeli never remembered anything across conversations.
59. ✅ **Backend Phase 3a — daily brief push notifications** — Session 23 (28 May) — `scheduleBriefNotifications` wires morning + evening brief times from `user_preferences` into iOS local daily notifications (fire even when app closed). Permission requested on auth, re-scheduled whenever a brief time/toggle changes. Idempotent (stable ids, cancel + re-add). Permission denial non-fatal (briefs still fire in-app). Notification = nudge; in-app brief = once-per-window content (no duplication).
60. ✅ **Phase 2e prep — QR cross-device invite test** — Session 23 (28 May) — `react-native-qrcode-svg` + "📷 Show QR" chip/modal in family.tsx encoding `zaeli://invite/<token>`. Anna scans with Camera → app opens at invite route. Linking debug listener + PHASE-2E-TEST-PLAN.md. Bridges the gap until Universal Links (Phase 3c, needs zaeli.app domain).
61. ✅ **Profile identity wiring** — Session 24 (29 May) — Settings account hero reads the real signed-in profile (name/email/initial/kind tag); invite inviter name comes from the profile (new `invite_tokens.inviter_name` + RPC). If Anna sends an invite, the recipient sees "Anna invited you", not "Rich". Removed launch-blocking hardcoded identity.
62. ✅ **Family roster → real DB data** — Session 24 (29 May) — `lib/family-roster.ts` replaces the hardcoded 5-member arrays with a dynamic DB-backed roster (up to 8 members, edits via Our Family). Calendar/meal/task assignees now use real `family_members` UUIDs (fuzzy name→UUID resolver). Member colours + avatars come from real data. SQL: colour fix + legacy-assignee remap.
63. ✅ **Calendar inline-card date-label fix** — Session 24 (29 May) — the confirm-after-add card now shows the event's real day (tomorrow/future), not always "TODAY".
64. ✅ **Memory hallucination fix** — Session 24 (29 May) — reframed the memory injection as BACKGROUND KNOWLEDGE so Zaeli stops treating a preference (e.g. "Poppy enjoys dance") as a scheduled calendar event. Calendar/live data is the only source of truth for what's booked.
65. ✅ **Recurring events** ⭐ — Session 24 (29 May) — Zaeli creates true recurring events from chat (12-month horizon, multi-day weekly like Mon/Tue/Fri). Series grouped by `repeat_group_id` enabling update-all ("add me to all of Gab's soccer"), delete-all, and extend ("roll it on another year"). Morning brief offers to extend a series nearing its end. Previously she couldn't do recurring at all.
66. ✅ **Swipe affordance** — Session 25 (1 July) — anchored 2-dot page indicator on Chat header + first-run "Swipe → for Dashboard" hint pill (AsyncStorage `SWIPE_HINT_KEY`, one-shot). Subtle wayfinding without demanding attention. Replaces the middle-air indicator killed Session 15.
67. ✅ **Phase 4a — safe cleanup** — Session 25 (1 July) — `LANDING_TEST_MODE = false`, redundant `requestNotificationPermission` in `(tabs)/_layout.tsx` removed (was firing twice), 3 dev rows removed (test notification, list scheduled briefs, run memory extraction). Deleted dead files: `app/components/ZaeliFAB.tsx` (killed Session 14) + `app/(tabs)/landing.tsx` + `Tabs.Screen` entry. Doesn't block Phase 2e — QR chip + 4 core dev rows retained for cross-device testing.
68. ✅ **Backend Phase 3b — Stripe scaffolding** — Session 25 (1 July) — `supabase-stripe-fields.sql` (profiles + 5 columns). `lib/stripe.ts` (`getSubscription` / `subscriptionLabel` / `fetchCustomerPortalUrl` stub). Profile type extended. Settings Subscription card reads real data. Manage subscription button opens portal URL in WebBrowser (friendly placeholder until endpoint is live). Edge Functions ready to deploy: `supabase/functions/stripe-portal` (JWT-verified, creates billing portal session) + `supabase/functions/stripe-webhook` (signature-verified via `constructEventAsync`, handles subscription lifecycle events, deployed with `--no-verify-jwt`). Deploy scripts + curl/Stripe CLI test recipes in `supabase/functions/README.md`. `STRIPE-SETUP.md` documents the ~25 min external activation path (Stripe account + products + Portal + Price IDs + webhook registration).
69. ✅ **Backend Phase 3c — Universal Links LIVE** ⭐ — Session 25 (1 July) — the headline. `app.json` `associatedDomains: ["applinks:zaeli.app"]`. `lib/invite-state.ts` `INVITE_LINK_BASE` swapped `zaeli.app/i/` → `zaeli.app/invite/` (must match Expo Router `/invite/[token]` route). Copy Link + Resend share now generate production `https://zaeli.app/invite/<token>`. AASA file hosted at `zaeli.app/.well-known/apple-app-site-association` with real Team ID `V37VPTPKQ8` + `com.zaeli.app` bundle ID + `/invite/*` component match. **Verified on device: tap invite link in Messages → app opens directly to receiver welcome screen, first try, no Safari intermediary.**
70. ✅ **External hosting infrastructure** — Session 25 (1 July) — the plumbing. **`zaeli-app-links` GitHub repo** created (static site source, auto-deploys on push). **Netlify site** at `zaeli-app-links.netlify.app` connected to repo. `netlify.toml` sets `publish = "public"` + **CRITICAL** `Content-Type: application/json` header for the AASA path (Netlify's default `application/octet-stream` breaks Universal Links silently). **Cloudflare DNS** for `zaeli.app`: apex CNAME → `apex-loadbalancer.netlify.com`, www CNAME → `zaeli-app-links.netlify.app`, both **grey cloud (DNS-only)** — orange proxy can rewrite Content-Type. **Let's Encrypt SSL** covers both, auto-renews. **Cloudflare Email Routing** on `zaeli.ai`: `hello@zaeli.ai` → `richarddekretser@gmail.com` (free tier, MX + TXT auto-added). **First EAS Build** for iOS completed — dev-client with `associatedDomains` entitlement (native change, can't hot-reload). Authenticated with regular Apple ID password + 2FA (Fastlane uses Developer API, NOT App-Specific Password). Same bundle ID = update-in-place install on iPhone (no duplicate icon, session persisted). **Blueprint for TestFlight** (Phase 4b): `eas build --profile preview` → `eas submit --platform ios`.
71. ✅ **Brief v1 — competence-first prompt tune** — Session 26 (1 July late evening) — Richard stopped reading briefs because they kept nagging about dinner even when he had it handled off-app. Fixed the "empty state = to-do item" AI failure mode: TONIGHT MEAL context line reframed, new COMPETENCE FIRST rule block with banned-phrase list, sparse-day chip examples cleaned up, One Thing paragraph made OPTIONAL with good-vs-bad examples inline. Commit `18f38d5`.
72. ✅ **zaeli_briefs table backfill + RLS fix** — Session 26 (1 July late evening) — turned out the Session 16 migration had never been run in dev DB. Briefs had been running silently uncached from Session 16 through Session 25 with upsert failures. Also updated the legacy `USING (true)` allow-all policy to Session 21 family-scoped standard before creating the table. Commit `be2fc90`.
73. ✅ **Brief v2 — invisible-domain rule** ⭐ — Session 26 (1 July late evening) — V1 stopped body opener but Sonnet's helpful-assistant bias compensated by pushing dinner nudges into One Thing + primary chip. Real fix: don't tell Sonnet the domain exists at all when empty. `formatContext` filters empty domains; new `── LIVE DATA ──` fence; new ABSOLUTE INVISIBLE-DOMAIN RULE at top of prompt; explicit BANNED CHIP LABELS block. Verified working on device — 10:47pm brief was warm and event-tied, no dinner mention. Commit `5e19e54`.
74. ✅ **Pricing pivot — A$9.99 family / A$7.99 tutor per child, inc GST** ⭐ — Session 26 (1 July late evening) — reduced from A$14.99 / A$9.99. Strategic call driven by real conversations with prospective users: the old pricing was a barrier in the current Australian economy. Sub-A$10 base plan changes the conversion conversation; Tutor at A$7.99 keeps the biggest revenue lever affordable for multi-kid families. 5 production surfaces + 4 docs updated + STRIPE-SETUP.md gained critical tax-inclusive setup note (Stripe AU defaults to adding 10% on top). Memory `project-pricing-decision.md` written. Commit `3220703`.
75. ✅ **Brief 3-hour bucket refresh** ⭐ — Session 26 (1 July late evening) — evening window is 13 hours wide, a brief written at 5:33pm was still on screen at 10:30pm framing "get bins out after dinner" (absurd). Added `currentBucket(now)` helper to `lib/brief-firing.ts`, `hourBucket` field to `FamilyContext`, bucket included in `computeSignature`, persistence-restore gated on bucket match. Now briefs stay time-of-day-current within the window. Cost impact: A$0.03-0.05/family/day worst case, comfortable at A$9.99 revenue. Commit `ab90557`.
76. ✅ **Auto-dismiss earlier same-window briefs** — Session 26 (1 July late evening) — after bucket refresh worked, the old brief was still visible with stale chips ("Plan tonight's dinner") competing with the fresh brief. `tryFireBrief` now walks messages on placeholder-swap and sets `briefDismissed=true` on any other same-window brief. Text stays as chat history, chip row hides. Reuses Session 17 mechanism. Commit `93c7065`.
77. ✅ **App icon 2B shipped** ⭐ — Session 27 (2 July early hours) — first proper app identity moment. Icon 2B ("za" wordmark fragment in Poppins ExtraBold with sky-blue `a`, on warm bg, with peach/mint/lavender orbs behind) chosen after `zaeli-icon-options.html` mockup (6 options, letterform + sparkle themes). Exported at 1024×1024 + 2048×2048 via `zaeli-icon-generator.html` browser Canvas tool — no third-party design software, no SVG-to-PNG conversion, no font path issues. Opaque, no alpha, no rounded corners (iOS applies mask), flat warm bg `#FAF8F5`. Icon replaces Expo default placeholder; both `assets/images/icon.png` + `assets/images/splash-icon.png` shipped.
78. ✅ **EAS preview build unblocked** ⭐ — Session 27 (2 July early hours) — first standalone iOS build was crashing on boot. Cloud builds don't inherit local `.env`, so all `EXPO_PUBLIC_*` variables were `undefined` at bundle load, `createClient(undefined, undefined)` in `lib/supabase.ts` threw immediately. Fixed via expo.dev web UI: 4 environment variables (SUPABASE URL + ANON, ANTHROPIC, OPENAI) added as **Sensitive** visibility (Expo blocks Secret for `EXPO_PUBLIC_*` — they bake into the bundle regardless). Scoped Preview + Production. Second build boots cleanly. Same bundle ID = install-in-place, Universal Links continue routing.
79. ✅ **Brief bucket-check bug fix** — Session 27 (2 July early hours) — commit `e78efa3`. Session 26's bucket-check gated ref restoration on `sameBucket`, but parsed `last.ts` (locale display string like "9:31 pm") as a Date. `new Date("9:31 pm")` returns Invalid Date, `try/catch` swallowed it, `persistedBucket` always `null`, refs never restored, every kill+reopen fired a fresh Sonnet brief. Fix: parse trailing 13-digit millis from message id. Diagnostic logging (`403f781`) surfaced the bug in one round; logging removed in `ac04038`.
80. ✅ **Brief dedup on persistence restore** — Session 27 (2 July early hours) — commit `ac04038`. Log data revealed the "brief re-firing" wasn't new fires (`decision.fire: false`) — it was 7 briefs stacked in the persistence file from Session 26's iteration tests, all rendering on restore. Fix: from today's same-window brief set, keep only the LATEST (highest millis in id). Older briefs are stale time-of-day content. Save effect writes back clean single-brief array; self-healing across future cycles.
81. ✅ **Splash first-install override (Option C)** — Session 27 (2 July early hours) — commit `ac04038`. Session 15 locked splash to fire only during 6-9am/12-2pm/5-8pm windows. That's right steady-state UX, but a fresh install at any other time gave first-time users no brand moment. AsyncStorage flag `splash_first_install_seen_v1`: unset → splash fires regardless of time + flag set; set → respect original windows. Icon + splash + first-brand-moment now all cohesive on install.
82. ✅ **Stripe Phase 3b activation LIVE end-to-end** ⭐ — Session 28 (10 July) — the external activation Richard was queuing since Session 25 finally happened. Stripe sandbox account (AU) + two products with tax-inclusive prices (Family A$9.99 → `price_1Tp3x30kUsgPd6wFSSOUucBW`, Tutor A$7.99 → `price_1Tp3xn0kUsgPd6wF7zonHLyo`) + Customer Portal (return URL `https://zaeli.app` — Stripe rejects custom schemes at dashboard-level config). Supabase CLI installed + linked. Both Edge Functions deployed with `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` secrets. Webhook endpoint registered subscribed to 6 events (subscription.created/updated/deleted, invoice.payment_succeeded/failed, customer.created). Test customer + metadata + subscription attached with card `4242 4242 4242 4242` — full loop verified: `customer.subscription.created` fired → webhook synced profile → `subscription_status: active, subscription_plan: family, subscription_renews_at: 2026-08-10`. Manage subscription button in Settings opens real Stripe Customer Portal showing active plan + Visa **** 4242 + Cancel button. Full end-to-end Phase 3b done.
83. ✅ **Stripe client wiring** — Session 28 (10 July) — commit `0a250f3` (done just before external activation). `lib/stripe.ts`: real `fetchCustomerPortalUrl` implementation (POST to Edge Function with JWT via `session.access_token`); `STRIPE_PRICE_FAMILY` + `STRIPE_PRICE_TUTOR` exports for future checkout wiring. `supabase/functions/stripe-webhook/index.ts`: `PRICE_TO_PLAN` map populated with sandbox Price IDs. `supabase/functions/stripe-portal/index.ts`: `RETURN_URL` default swap `zaeli://settings` → `https://zaeli.app`.
84. ✅ **Stripe webhook current_period_end fix** — Session 28 (10 July) — commit `5f0f622`. Stripe moved `current_period_end` from Subscription level to line items around API 2024-06-20. `syncSubscription` now reads `sub.current_period_end` first (backwards compat), falls back to `sub.items.data[0].current_period_end`. Fixed the `subscription_renews_at` NULL issue after webhook resend.
85. ✅ **Calendar phantom-event bug fixed** ⭐ — Session 28 (10 July) — commit `b5a06fa`. Diagnosis from 5 screenshots Richard shared: Zaeli was confidently saying "Added Duke's Soccer Carnival for Saturday 18 July..." on 3 attempts, none of which actually landed in the DB. Root cause: `.insert(row)` returns `{ error: null, data: null }` on silent RLS block (WITH CHECK evaluated null due to auth race), old code only checked `if (error)` → false-positive success → Zaeli reported success from tool_result in good faith. Fix: `.insert(row).select('id').maybeSingle()` and `if (!res.data?.id) return TOOL_FAILED`. Same treatment for recurring batch case. Added `[calendar-add]` diagnostic logging: input params, assignee resolution (roster snapshot + requested vs resolved names), inserted OK / failed. Verified working on device — next event added cleanly on first try.
86. ✅ **Splash blue flash reduction (5 attempts, mostly fixed, parked)** — Session 28 (10 July) — Session 27 shipped icon + preview build. During testing Richard captured screenshots showing warm-bg splash → bright blue frame → app. Five fix attempts: (1) `df9e445` top-level splash config — no help; (2) `c10ae4c` Fabric Stack wrapper + contentStyle — no help; (3) `2553c3e` explicit ios.splash + dark variants — no help; (4) `1b5fa48` expo-system-ui plugin + `SystemUI.setBackgroundColorAsync` — no help; (5) `ba638a4` **onLayout-gated `hideAsync` + fade** — the mostly-fix. Reduced flash from clearly visible (~500ms) to barely visible (<100ms flicker). Full elimination would need WSL for iOS storyboard inspection. **Key learning: splash blue flash is a timing issue, not a colour issue** — all colour-config attempts failed; the timing fix (wait for root View to lay out before hiding splash) was what worked. Parked as cosmetic.
87. ✅ **MoreSheet Settings icon clip fix** — Session 28 (10 July) — commit `3ea23d4`. IcoSettings gear teeth strokes were touching viewBox 24x24 edges with strokeWidth 1.7 causing half-stroke clip at tile corner. Fix: `viewBox="-1 -1 26 26"` for 1 unit padding on each side. Same visual size, no clipping. Reusable pattern for any SVG icon with edge-hugging strokes.

88. ✅ **Meal planner pivots recipes-first** ⭐ — Session 29 (13 July) — Anna's second beta round surfaced a strategic insight: daily meal planning is friction, not helpfulness. "No busy family will sustain it." Reshuffle: Meals tab demoted to "Plan" mode (still available), Recipes tab promoted to entry point, Favourites renamed to **Regulars** (acknowledges busy-family reality, not aspiration). Dashboard card "Meal Planner" → "Tonight's Meals" with "See family regulars" CTA. Zaeli's chat context now includes family regulars — when asked "quick dinner suggestion?", she picks from THEIR saved recipes and cross-checks against pantry. Zero data-entry pressure, all suggestion-forward. Same Philosophy B shape as Session 26 brief pivot and Session 17 budget pivot: Zaeli becomes MORE useful by asking users to DO LESS. New locked spec section: "MEAL PLANNER v2 — RECIPES-FIRST (LOCKED Session 29)".

89. ✅ **Anna beta round 1+2 fixes** — Session 29 (13 July) — real usage informing real fixes, none visible in solo development:
    - **Tutor math accuracy** — Anna reported Zaeli wrongly rejecting correct answers to 84÷7 and 15×24. Make-or-break bug for Tutor's A$7.99/child revenue: a tutor that marks correct answers wrong loses the parent's trust in one session. Three-layer fix: (1) prompt hardening around arithmetic verification, (2) hidden `<expected>` marker Sonnet emits before scoring, (3) ground-truth injection on next call so state carries forward.
    - **Pantry visibility** — Zaeli was saying "not in pantry" for maple syrup that was clearly there. Pantry data added to chat context with a PANTRY RULES block forcing her to check first before confabulating.
    - **Multi-photo receipt scan** — Anna's multi-page receipts were creating 2×$0 rows + 1 correct summary (three separate Sonnet calls, first two failing to see the total). Now batches into a single Sonnet call with all pages.
    - **In-sheet Spend UX** — receipt upload was navigating away from the Shopping sheet to Chat mid-flow. Fixed to stay in-sheet with inline progress.
    - **Dashboard reshuffle** — reordered per Anna's stated priority: Calendar → Shopping → Bento (weather + Noticed) → Radar → Meal Planner. Was arbitrary before.
    - **Onboarding gate wired** — new owners now actually get the onboarding flow (was silently skipped on Anna's first test — she landed straight in cold chat).
    - **Dynamic user name in briefs** — hardcoded "Rich" in brief prompts replaced with templated `getProfile().name`. Anna sees "Morning Anna", not "Morning Rich". Small change, big trust implications.

90. ✅ **Cost economics deep-dive** ⭐ — Session 29 (13 July) — analysis of Anna's real `api_logs` revealed home_chat was costing ~A$3.30/family/mo, over 3× the modeled estimate. Root cause: the Sonnet tool-calling path (65% of chat calls) was running uncached at $3/M input while briefs and tutor already used prompt caching. Fix: added prompt caching to both the initial and followup Sonnet tool calls (beta header + `cache_control` marker on system block). Also: the followup call was previously silent in `api_logs` — real cost was 2× what the logs showed. Now logged. **Projection: A$3.30 → ~A$0.50/family/mo** — the difference between unit-loss-making and a healthy 60% margin at A$9.99. Also fixed a negative-cost bug in `lib/api-logger.ts` (was subtracting `cache_read` from `input_tokens`, but the three token fields are disjoint per Anthropic docs) and corrected Haiku 4.5 pricing which was 4× too low. Discovered separately: brief cache invalidates between adults (each adult's primaryUser signature triggers a new Sonnet call) — at a 2-adult family = ~240 briefs/mo. Per-user brief cache queued as a future scale optimization.

91. ✅ **Calendar bulk-paste `max_tokens` fix** — Session 29 (13 July) — Anna pasted a screenshot of 10 school events; Zaeli reported adding all but "Last day of school term — 18 Sept". Investigation via `api_logs` showed the 07:48pm home_chat call had `output_tokens=800` — exactly the max_tokens ceiling. Root cause: 10 tool_use blocks × ~80 output tokens each + preamble ≈ 800 = truncated mid-10th block. The malformed final JSON block was silently dropped by the client parser. Fix: raised `max_tokens` 800 → 2000 (initial call), 500 → 1500 (followup). Zero cost impact unless Sonnet actually uses the ceiling. Prevents multi-event pastes from cutting off silently — a critical fix for the "school newsletter dump" use case that Zaeli should handle in one shot.

92. ✅ **Admin console Session 29 refresh** — Session 29 (13 July) — the internal admin dashboard at `app/(tabs)/zaeli-admin/index.html`. Fixed double-$ template literal bugs (A$$$X.XX rendering), reset slider defaults to match real usage from Anna's api_logs (briefs 420→240/mo, scans 90→15/mo). Break-even card replaced with per-family margin card (old math was nonsense). Feature labels corrected (Briefs run on Sonnet, NOT GPT — the label was stale from pre-Session-9 era when routing was still being debated). Real subscription state in Accounts table (reads `beta_end_date` + `subscription_status`). Memory system health card added to Usage view. Also relocated: session started on a stale copy in Downloads before realising the source of truth lives inside the repo. **Locked:** admin console source of truth is `app/(tabs)/zaeli-admin/`, not scratchpads or Downloads.

### Session 29 strategic reflection

Anna's beta round surfaced a class of issue only real usage reveals:

- **Quality bugs** (Zaeli getting math wrong) that would kill Tutor conversion
- **UX friction** (meal planner ask) that busy families quietly abandon
- **Cost overruns** (uncached chat) that would make the business model unviable at scale
- **Silent truncation** (calendar bulk paste dropping the 10th event) that erodes trust one screenshot at a time

None of these were visible in solo development. All are the kind of thing that only lands when someone else is using the product to run their actual family.

Post-Session-29 economics per family (with caching applied, realistic volumes): ~A$3-5/mo API cost = 30-50% of A$9.99 revenue. Healthy. Add Tutor at 30% adoption = 50-60% margin overall. Tutor stays the biggest lever.

The meal planner pivot is the most important product decision of the session. It joins a pattern: Session 17 (budget = planner, not tracker), Session 26 (brief = quiet on empty domains), Session 29 (meals = suggest from regulars, not push planning). Every one of these calls made Zaeli more useful by asking families to do less. That's the shape of Philosophy B in practice — not a feature list, a discipline.

### Session 29 locked decisions

- **Meal planner UX = recipes-first, regulars-in-context.** Meals tab retained but demoted. Never reintroduce the "7-day planner as home" surface.
- **max_tokens ceiling for bulk operations = 2000 initial / 1500 followup.** Prevents silent tool_use truncation.
- **Sonnet stays on briefs.** Persona quality > small cost difference now that caching is applied.
- **Sonnet 5 migration queued for after Anna beta settles.** Intro pricing $2/$10 through Aug 2026 makes it CHEAPER than 4.6 — free perf upgrade if we time the swap right.
- **Per-family MARGIN (not break-even)** is the metric to watch during beta. Admin console updated to reflect this.
- **Admin console source of truth = in-repo** (`app/(tabs)/zaeli-admin/`), never Downloads or scratchpads.

93. ✅ **Family push notifications infrastructure** ⭐ — Session 30 (14 July) — the last piece of "Zaeli lives across every family member's phone". `profiles.expo_push_token` column added. New `family-notify` Supabase Edge Function (Deno) — JWT-verified, enforces family boundary (`sender.family_id === recipient.family_id` before send), batches to Expo push API. Client helpers: `registerPushToken` fires on sign-in and stashes the device token to the profile; `notifyFamily` is a single function chat + calendar surfaces call. UX: new **Notify** chip on calendar confirm cards (one tap after adding an event and everyone on the assignee list gets an OS push). Chat tool: `send_family_message` — Zaeli parses natural-language notify intents like "text Anna to say I'll be home in 20" and calls the tool with the right recipient. **Installation blocker found + fixed:** the `expo-notifications` plugin was missing from `app.json`, causing silent APNs registration failures (device tokens registered but no delivery). Needs one more build cycle (#17) to verify delivery end-to-end. Push credentials confirmed auto-provisioned by EAS.

94. ✅ **Multi-photo chat upload** ⭐ — Session 30 (14 July) — chat bar now supports up to 4 attachments per send. Picker is **additive**: tapping Camera OR Photos appends to the pending set rather than replacing. Horizontal thumbnail strip above the input pill (64px thumbs + ✕ per photo). One Sonnet vision call for all images with an aggregation prompt (mirrors Session 29's multi-photo receipt scan pattern). Real use cases this unblocks: multi-page school newsletters ("read all these and add the dates"), multi-page consent forms, multi-angle photos of a homework problem, side-by-side product comparisons. Previously the chat bar was one-photo-at-a-time; Anna hit the limit on her first school newsletter dump.

95. ✅ **Spend receipt scan UX overhaul** — Session 30 (14 July) — full-screen "Processing..." overlay replaces Session 29's inline progress banner + result toast. Silent success (receipt appears in the list without a popup). Errors surface via Alert. Same visual language now across all scan operations (receipt, pantry, chat vision). The Session 29 in-sheet fix stopped the navigation-away problem; Session 30 finishes the polish so the whole flow feels intentional.

96. ✅ **Stripe checkout testability** — Session 30 (14 July) — currently families become paid customers via a hosted Stripe Payment Link (option (a) from Session 28's checkout options). New Developer row **force-opens** the Payment Link even when the family's beta grant would normally hide the Subscribe button. Foreground `_layout.tsx` now refreshes the profile on app resume so returning from Stripe checkout in Safari automatically updates the subscription state — no manual sign-out cycle. Full checkout loop now testable end-to-end (real sandbox card → Stripe → webhook → profile update → in-app state) without leaving beta mode.

97. ✅ **Kids Trivia answer-in-question guard** — Session 30 (14 July) — Anna beta feedback: Duke saw *"Which sport is played with a round ball and goals, and is called soccer in many countries?"* Answer: "Soccer". Zaeli literally gave away the answer inside the question. Same shape as the Session 29 Tutor math bug — quality issues that only surface when a real kid uses the product. Three-layer defence: (1) prompt rule against embedding the answer in the question, (2) client-side word-boundary regex filter that rejects any generated question containing the answer as a whole word, (3) retry loop that regenerates when the filter trips. Applied to `kids-trivia` generation path.

98. ✅ **Splash cold-start latency fix** — Session 30 (14 July) — 3-second splash flash on foreground return was blocking `setAuthed` on `loadProfile()` (Supabase network round-trip). Fix: split the gate — `setAuthed` fires on session-verified (fast AsyncStorage read), profile continues to load in the background. Splash-hide waits on session, not profile. Cold-start feels instant now; profile-dependent surfaces (Settings hero, brief primaryUser) render as soon as they're ready. No functional change to what data is available where — just decoupled the two async chains.

99. ✅ **Tutor Play icon removed** — Session 30 (14 July) — matches the home chat surface which never had a play icon. Small consistency win.

100. ✅ **EAS Starter plan + first TestFlight cycle** ⭐ — Session 30 (14 July, external) — hit the EAS free-tier build cap during Session 30's iteration. Rich upgraded to **EAS Starter plan (14 builds/month)** — TestFlight cadence no longer a bottleneck. First iOS TestFlight submission cycle for **build #15** completed. The expo-notifications discovery (Phase 93) required additional cycle **#16**; verification of push delivery pending on **#17**. `GIPHY_API_KEY` currently in local `.env` but not in EAS env vars — Rich needs to add it at expo.dev before the next build for GIPHY celebrations to work in TestFlight. Blueprint from Session 25 (Phase 3c) held up: same bundle ID = update-in-place, session persists, Universal Links keep working.

### Session 30 strategic reflection

Session 30 is where the product started to feel like something families would actually pass phones around for.

Family push notifications are the piece that makes Zaeli feel like a shared surface rather than a solo AI companion — the moment Anna gets an OS push because Rich added Duke's soccer carnival is the moment Zaeli becomes "our app" rather than "Rich's app". The infrastructure is shipped; verification is one build cycle away.

Multi-photo chat and the Spend UX overhaul are the "boring polish" that determines whether real users trust the product. Anna hit both of these in her first week. Both are fixed.

Stripe checkout testability and the EAS Starter upgrade unlock the operational cadence Anna beta round 2 needs. Instead of hoarding build tokens, we can iterate as fast as feedback arrives. That changes the shape of what beta testing surfaces — small quality bugs that used to wait weeks now get fixed same-day.

The kids trivia answer-leak bug is a reminder that "AI got math wrong" (Session 29) and "AI gave away the answer" (Session 30) are the same category. Quality regressions that only real usage catches, that only real usage kills conversion for. Every AI-generated question needs a filter, and every filter needs a retry.

### Session 30 locked decisions

- **Family push notifications = single Edge Function (`family-notify`) with server-enforced family boundary.** Never allow client-side sends without JWT + boundary check. Push token is per-device (profiles.expo_push_token), family membership is per-user (profiles.family_id). Both must match at send time.
- **Multi-photo chat = additive picker, up to 4 per send, one Sonnet call.** Never replace-on-pick (that was the Session 21 single-photo pattern). Never fire per-image Sonnet calls (Session 29's multi-photo receipt scan proved the aggregation prompt works fine).
- **All scan surfaces use full-screen "Processing..." overlay.** Silent success. Errors via Alert. No inline banners, no result toasts. Consistent across receipt scan, pantry scan, chat vision.
- **Splash-hide gate = session-verified (AsyncStorage), NOT profile-loaded (Supabase network).** Fast-path the visual, slow-path the data. Any future "make cold-start faster" work follows the same principle.
- **AI-generated content needs a client-side validator + retry loop.** Kids trivia answer-in-question is the pattern; Tutor answer-verification (Session 29) is the pattern. If Sonnet CAN produce a bad output, the client MUST catch it and retry.
- **EAS Starter plan is now the baseline.** 14 builds/month covers realistic iteration. Never revert to holding build tokens as scarcity.
- **TestFlight cycle is the delivery surface for Anna beta round 2+.** Universal Links + Stripe checkout + push notifications all work in TestFlight builds. Solo dev-client is no longer sufficient for beta feedback loops.

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
33. 🔨 **Backend pass — IN PROGRESS, ~95% complete** (multi-session). Status as of 14 July:
    - ✅ Phase 1: Auth foundation (sign-up + sign-in via DB trigger)
    - ✅ Phase 2a: RLS on 19 data tables + DUMMY_FAMILY_ID swap + session persistence
    - ✅ Phase 2b: invite_tokens table + tour state migrated to Supabase (cross-device DB-level)
    - ✅ Phase 2c: Settings preferences migrated to Supabase (profiles.user_preferences JSONB)
    - ✅ Phase 2d: Real auth at invite acceptance — invitees create Supabase users + family-linked profiles via DB trigger. Six multi-user safety patches shipped alongside (per-user chat persistence, all-cache invalidation, inviter-only heads-up filter, fresh-invitee welcome polish, etc).
    - ✅ Phase 2f: Memory wiring + the full capture/recall loop (Session 23) — Memory view reads real data; chat captures conversations, extracts durable facts via Sonnet, recalls them in-prompt. Zaeli genuinely remembers the family now.
    - ✅ Phase 3a: Daily brief push notifications (Session 23) — local notifications scheduled from prefs, re-scheduled on change.
    - ✅ Phase 3b (SCAFFOLDING): Stripe scaffolding shipped Session 25 — SQL migration + `lib/stripe.ts` + Edge Functions + Settings integration. Needs external Stripe account activation (~25 min at stripe.com — products + Portal + Price IDs + webhook registration) before going live.
    - ✅ Phase 3c (LIVE): Universal Links working end-to-end Session 25 — `https://zaeli.app/invite/<token>` opens the app directly to the receiver flow. Cloudflare DNS + Netlify + Let's Encrypt SSL + AASA serving `application/json`. First EAS Build proven. Verified on device.
    - ✅ Phase 4a: Safe cleanup shipped Session 25 — `LANDING_TEST_MODE = false`, dead files deleted, 3 dev rows removed, redundant permission call removed.
    - ✅ App icon + preview build shipped Session 27 — Icon 2B ("za + orbs") designed, PNGs exported via browser Canvas tool, dropped into `assets/images/`. First preview EAS build LIVE after adding `EXPO_PUBLIC_*` env vars to EAS Environment Variables as "Sensitive" (cloud builds don't inherit local `.env`). Bucket-check bug fixed (parsing millis from id, not display string). Brief dedup on restore (feed shows single brief per window). Splash Option C (first-install override).
    - ✅ **Stripe Phase 3b LIVE end-to-end Session 28 (10 July)** — external activation completed. Sandbox account (AU), two products with tax-inclusive prices, Customer Portal, Supabase CLI + linked, two Edge Functions deployed with secrets, webhook registered subscribed to 6 events, test customer + subscription verified syncing to profile. Manage subscription button in Settings opens real Stripe Customer Portal. Backend proof-of-work done.
    - ✅ **Calendar phantom-event bug fixed Session 28** — commit `b5a06fa`. `.insert().select('id').maybeSingle()` verification pattern applied. Silent RLS blocks no longer misreported as success. Diagnostic logging added.
    - ✅ **Family push notifications infrastructure Session 30 (14 July)** — `profiles.expo_push_token` + `family-notify` Edge Function (Deno, JWT + family-boundary enforced, batches to Expo push API) + `registerPushToken` on sign-in + `notifyFamily` helper + Notify chip on calendar confirm + `send_family_message` chat tool. Blocker discovered: `expo-notifications` plugin was missing from `app.json`; added. Awaiting build #17 to verify end-to-end delivery on TestFlight.
    - ✅ **Stripe checkout testable end-to-end Session 30 (14 July)** — Payment Link opens even under beta grant via a Developer row. Foreground profile refresh on app resume so Stripe checkout return auto-updates subscription state. Beta users can now stress-test the full paid-signup loop without leaving beta mode.
    - ✅ **First TestFlight submission cycle Session 30 (14 July)** — build #15 submitted; build #16 for the push-plugin fix; build #17 pending for verification. Rich upgraded to **EAS Starter plan (14 builds/month)** — build cadence is no longer a bottleneck for iteration.
    - 🔨 Phase 2e (NEXT): Cross-device verification on Anna's phone — Universal Link + TestFlight build is now the primary path. `PHASE-2E-TEST-PLAN.md` walks through the flow. Anna beta round 2 waiting on push-fix build #17.
    - 🔨 **GIPHY_API_KEY in EAS env vars** — Session 30 discovery: currently only in local `.env`, missing from EAS env config, so GIPHY celebrations won't render in TestFlight until added at expo.dev. Small chore, matches the Session 27 pattern for `EXPO_PUBLIC_*` vars.
    - 🔨 Phase 4b: post-Anna final cleanup — remove the 4 remaining dev rows (Re-do onboarding, Simulate invite accepted, Open latest invite as receiver, Reset to owner account), remove QR chip, remove Session 30 Developer row for force-opening Stripe Payment Link, expo-document-picker for Budget CSV (EAS rebuild), share extension (EAS), GDPR / export data / privacy WebViews.
    - 🔨 **Phase 5 (BEFORE PUBLIC LAUNCH — NEW Session 27):** Migrate Anthropic + OpenAI API calls to Supabase Edge Functions. Currently `EXPO_PUBLIC_ANTHROPIC_API_KEY` and `EXPO_PUBLIC_OPENAI_API_KEY` are baked into the compiled app bundle (Expo's rule for client-runtime env vars) and can be extracted by any determined user. Fine for TestFlight dogfood with trusted testers, NOT fine for App Store distribution. Same pattern as the Stripe portal Edge Function already scaffolded. Supabase URL + anon key can stay client-side (RLS enforces security — anon key is designed for this).
    - 🔨 **Stripe live-mode activation (pre-launch)** — repeat the sandbox product/portal/webhook setup in live mode. Enable Stripe Tax (0.5% per transaction for automated AU GST). Update `PRICE_TO_PLAN` map with live Price IDs.
    - 🔨 **Splash blue flash full elimination** — Session 28's 5 fixes reduced from clearly visible to barely visible flicker. Full fix requires WSL for iOS storyboard inspection. Deferred until it bothers real users.
    - 🔨 **Product-side welcome email** — Supabase Edge Function on `auth.users` insert. Deferred until we have real onboarded users. Stripe handles transactional emails (receipts, cancellations) already.
    - 🅿️ Spoonacular (recipe discovery): parked to post-TestFlight — Meals module already handles recipe management; discovery is a "real users will ask for it" feature, not a launch-blocker.

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
- [x] Push notifications — daily brief local (Session 23) + family push infrastructure (Session 30, verification on build #17)
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
