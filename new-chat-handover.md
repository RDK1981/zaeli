# Zaeli — New Chat Handover
*1 July 2026 (late evening) — Session 26 ✅ · BRIEF QUALITY DEEP-DIVE + STRATEGIC PRICING PIVOT · Brief prompt v1 (competence-first) + v2 (invisible-domain rule — remove empty-state signals from context entirely, fixes Sonnet finding wiggle room to nag) · zaeli_briefs table finally created (had never been run since Session 16 — briefs were silently uncached) + RLS updated to Session 21 pattern · **PRICING REDUCED: A$9.99 family / A$7.99 tutor per child inc GST** (was A$14.99 / A$9.99 — competitive positioning in tight economy) · 3-hour bucket refresh so briefs stay time-of-day-current within wide windows · Auto-dismiss earlier same-window briefs on refire · Prior Session 25 (Universal Links LIVE, EAS Build proven, Cloudflare/Netlify hosting deployed, Stripe scaffolded) still current · **NEXT: 2e Anna's phone, 3b Stripe activation (external ~25 min with tax-inclusive setup), Phase 4b (TestFlight + post-Anna dev-row cleanup)***
*Copy this entire message to start a new chat.*

---

## Hi! Continuing development of Zaeli.

Zaeli is an iOS-first AI family life platform built in React Native / Expo.
Read **CLAUDE.md** before starting — full stack, architecture, colours, ALL specs.
Then **ZAELI-PRODUCT.md** for product vision and full project plan.

Session 26 was a brief-system deep-dive plus a strategic pricing pivot. Six commits: brief v1 + v2 prompt fine-tuning, backfill of the `zaeli_briefs` table that had never been created, pricing reduction to A$9.99 / A$7.99 inc GST, 3-hour bucket refresh so briefs stay time-of-day-current, and auto-dismiss of earlier same-window briefs when a new one fires. All verified working on device.

---

## ══════════════════════════════════
## CURRENT STATE — ALL WORKING ✅ (Session 26)
## ══════════════════════════════════

### NEW THIS SESSION (Session 26 — brief quality + pricing, 1 July late evening)

**A. Brief v1 — competence-first prompt** (commit `18f38d5`). Richard stopped reading briefs because they kept nagging about dinner even when he had it handled off-app. Classic "empty state = to-do item" AI failure mode. Four targeted changes to `lib/brief-generator.ts`: `TONIGHT MEAL` context line reframed ("not planned yet" → "no meal_plan row do NOT nudge"), new `COMPETENCE FIRST` rule block with banned-phrase list, sparse-day chip examples cleaned up (dropped "Plan tomorrow's dinner"), One Thing paragraph made OPTIONAL with explicit good-vs-bad examples inline.

**B. zaeli_briefs table backfill + RLS fix** (commit `be2fc90`). Trying to `DELETE FROM zaeli_briefs` returned "relation does not exist." The Session 16 migration had NEVER been run in Richard's dev DB — every brief since had been a fresh Sonnet call with silent upsert failure. Also updated the legacy `USING (true)` allow-all policy to the Session 21 standard (family-scoped SELECT/INSERT/UPDATE/DELETE via `current_family_id()`). Table live, caching finally working after ~10 sessions of silent failure.

**C. Brief v2 — invisible-domain rule** ⭐ (commit `5e19e54`). V1 stopped body opener but Sonnet compensated by pushing dinner nudges into the One Thing + primary chip ("dinner's still unplanned" / "Plan tonight's dinner"). Even with explicit bans, the model's helpful-assistant training bias found wiggle room. Real fix: **don't tell Sonnet the domain exists at all when empty**. `formatContext` filters out empty domains (no `TONIGHT MEAL` line if null, no `OPEN TASKS: none`, no `TODAY EVENTS: nothing scheduled`). New `── LIVE DATA ──` fence + closing REMINDER. New ABSOLUTE `INVISIBLE-DOMAIN RULE` at top of prompt. BANNED CHIP LABELS block. **Verified**: 10:47pm brief was warm and event-tied ("Wednesday's done, Rich — and the bins are already out 🌙" + tomorrow's real events + soccer nudge tied to real 2pm event + clarifying "Which kid has soccer?" primary chip). No dinner mention anywhere.

**D. Pricing pivot — A$9.99 family / A$7.99 tutor per child, inc GST** ⭐ (commit `3220703`). Strategic reduction from A$14.99 / A$9.99. Driven by real conversations with prospective users: old pricing was a barrier in the current Australian economy. Sub-A$10 base plan changes the conversion conversation; Tutor at A$7.99 keeps the biggest revenue lever affordable for multi-kid families (3 kids on Tutor = A$23.97/mo, more than 2x the base — that math makes the base reduction sustainable). 5 production surfaces updated (sign-up, onboarding, Tutor upsells, Tour hero) + 4 docs synced + `STRIPE-SETUP.md` gained **critical tax-inclusive setup note** (Stripe AU adds 10% GST on top by default — must set behaviour to Inclusive). Memory `project-pricing-decision.md` written.

**E. 3-hour bucket refresh** ⭐ (commit `ab90557`). Evening window is 13 hours wide — Richard at 10:30pm was still seeing a 5:33pm brief telling him to get bins out after dinner. Added coarse `Math.floor(hour / 3)` bucket to `FamilyContext` + `computeSignature`. `lib/brief-firing.ts` exports new `currentBucket(now)`. Persistence-restore of `lastBriefWindowRef` in index.tsx now gated on bucket match — stale bucket means "already fired" signal is not carried forward, so `shouldFireBrief` fires fresh on next mount. Cost: A$0.03-0.05/family/day worst case, comfortable at A$9.99 revenue.

**F. Auto-dismiss earlier same-window briefs** (commit `93c7065`). After bucket refresh worked, the old brief was still visible with stale interactive chips ("Plan tonight's dinner") competing with the fresh brief. `tryFireBrief` placeholder-swap step now walks messages and sets `briefDismissed=true` on any OTHER same-window brief. Text stays as chat history, chip row hides. Uses existing Session 17 mechanism — no render path change.

### Key decisions Session 26

- **Empty state is fragile as an AI signal — remove the signal, not just add a "don't nudge" rule.** Sonnet's helpful-assistant training bias fights explicit bans. General pattern for any AI content surface.
- **Pricing: A$9.99 family / A$7.99 tutor per child, both inc GST.** Sub-A$10 anchor. Stripe products must be set as tax-inclusive.
- **3-hour bucket in brief signature.** Briefs stay time-of-day-current within wide windows. 4-5 buckets per window × 2 windows = at most 8-10 briefs/family/day worst case.
- **Same-window brief auto-dismiss** — old chips would push stale nudges; text stays as truthful record.
- **Cache tables with SECURITY DEFINER-scoped RLS must use the Session 21 `current_family_id()` pattern.**
- **Silent upsert failure is a real risk** — always verify migrations landed. Consider a startup check that surfaces missing tables.

### What's NEXT (unchanged from Session 25)

- **Phase 2e** — Anna's phone (Universal Link is now the primary invite path).
- **Phase 3b Stripe activation** — Richard's ~25 min at stripe.com. Products must be tax-inclusive (see STRIPE-SETUP.md).
- **TestFlight submission** — `eas build --profile preview` → `eas submit --platform ios`.
- **Phase 4b** — remove 4 remaining dev rows, QR chip, expo-document-picker, GDPR / privacy WebViews.

### SQL migrations to run for Session 26 (if setting up fresh)

`supabase-zaeli-briefs.sql` (updated — proper RLS + still-idempotent). Session 24 migrations still required first: `supabase-invite-inviter-name.sql`, `supabase-family-member-colours.sql`, `supabase-remap-event-assignees.sql`, `supabase-event-repeat-group.sql`.

### Session 25 (still current — historical, 1 July earlier same day)

Universal Links LIVE end-to-end + Phase 4a cleanup + Stripe Phase 3b scaffolding. Tap `https://zaeli.app/invite/<token>` in Messages → app opens direct to receiver flow, verified on device. Cloudflare DNS + Netlify + Let's Encrypt SSL + AASA serving `application/json`. First EAS Build proven with new dev-client carrying `associatedDomains: ["applinks:zaeli.app"]` entitlement. Cloudflare Email Routing on zaeli.ai (hello@ → Gmail). Apple Team ID `V37VPTPKQ8`. Commits: `ad32064`, `bd4fdbb`, `0398a07`, `b0d8dc1`, `cff0ed6`, `2a32cac`, `5e4e0a9`.

---

## ══════════════════════════════════
## PRIOR STATE — SESSION 25 REFERENCE (historical)
## ══════════════════════════════════

### NEW THIS SESSION (Session 25 — Universal Links · Phase 4a · Stripe scaffolding, 1 July)

**A. Swipe affordance** (commit `ad32064`). Anchored 2-dot page indicator on Chat header (`top: insets.top + 10`) — coral active `#FF4545`, grey idle. First-run "Swipe → for Dashboard" hint pill (AsyncStorage `SWIPE_HINT_KEY`, one-shot). Replaces the middle-air indicator killed Session 15 — that position looked awkward on Dashboard when the chat bar wasn't underneath.

**B. Phase 4a — safe cleanup** (commit `bd4fdbb`). Six removals that don't block Phase 2e testing: `LANDING_TEST_MODE = false` in swipe-world; redundant `requestNotificationPermission()` in `(tabs)/_layout.tsx` removed (Session 23 wired it in root `_layout.tsx`, was firing twice); 3 memory/notif dev rows removed from Settings (🔔 test notification / 📋 list scheduled briefs / 🧠 run memory extraction); deleted `app/components/ZaeliFAB.tsx` (killed Session 14, no refs); deleted `app/(tabs)/landing.tsx` + `Tabs.Screen` entry (superseded by in-swipe-world splash). Kept: QR chip + 4 core dev rows still needed for Phase 2e (Re-do onboarding / Simulate invite accepted / Open latest invite as receiver / Reset to owner account).

**C. Phase 3b — Stripe scaffolding** (commit `0398a07` + `cff0ed6`). Everything needed to wire Stripe once Richard finishes the external account setup:
- `supabase-stripe-fields.sql` — profiles + 5 columns (stripe_customer_id, subscription_status, subscription_plan, subscription_renews_at, trial_ends_at).
- `lib/stripe.ts` — `getSubscription`/`subscriptionLabel`/`fetchCustomerPortalUrl` (stub returns null until endpoint deployed).
- `lib/auth.ts` — Profile type extended with 5 Stripe fields.
- Settings Subscription card reads real data via `getSubscription`. "Manage subscription" button opens portal URL in WebBrowser or shows friendly placeholder.
- **Edge Functions ready to deploy** (`supabase/functions/`): `stripe-portal` (JWT-verified, creates billing portal session) + `stripe-webhook` (signature-verified via `constructEventAsync`, handles subscription lifecycle, deploy with `--no-verify-jwt`). Deploy scripts + curl/Stripe CLI test recipes in the folder's README.
- `STRIPE-SETUP.md` — ~25 min external activation path (Stripe account with AU country, products **A$9.99 Family + A$7.99 Tutor both tax-inclusive** — pricing reduced Session 25 for competitive positioning, Customer Portal config with `zaeli://settings` return URL, Price IDs, webhook endpoint registration).

**D. Phase 3c — Universal Links LIVE** ⭐ (commits `0398a07` + `b0d8dc1`). The headline:
- `app.json` — added `"associatedDomains": ["applinks:zaeli.app"]` to iOS.
- `lib/invite-state.ts` — `INVITE_LINK_BASE` swapped `zaeli.app/i/` → `zaeli.app/invite/` (MUST match Expo Router `/invite/[token]` route + AASA's `/invite/*` component pattern).
- `app/(tabs)/family.tsx` — Copy Link + Resend share now use `https://zaeli.app/invite/<token>` (production https, not `zaeli://` dev scheme).
- AASA hosted at `zaeli.app/.well-known/apple-app-site-association` with real Team ID `V37VPTPKQ8` + `com.zaeli.app` bundle ID + `/invite/*` component.
- **Verified on device**: tap invite link in Messages → app opens direct to receiver welcome ("Hey Universal..." showing the invitee name). First try. No Safari intermediary.

**E. External hosting infrastructure** (this session, not in the app repo):
- **`zaeli-app-links` GitHub repo** — static site source, auto-deploys on push to main. Template folder committed to app repo: `zaeli-app-links-template/` (commit `2a32cac`).
- **Netlify** at `zaeli-app-links.netlify.app` connected to the repo. `netlify.toml` sets `publish = "public"` + **CRITICAL** `Content-Type: application/json` header for AASA path (Netlify default `application/octet-stream` breaks Universal Links silently).
- **Cloudflare DNS** for `zaeli.app`: apex CNAME → `apex-loadbalancer.netlify.com`, www CNAME → `zaeli-app-links.netlify.app`. **Both grey cloud (DNS-only)** — orange-cloud proxy can rewrite Content-Type headers on extension-less files, same silent failure.
- **Let's Encrypt SSL** covers `zaeli.app` + `www.zaeli.app`, auto-renews before 29 Sep 2026.
- **Cloudflare Email Routing** enabled on `zaeli.ai` (separate marketing domain): `hello@zaeli.ai` → `richarddekretser@gmail.com`. Free tier, unlimited forwards. MX + TXT auto-added.

**F. First EAS Build for iOS** (this session, external). Cloud build via `eas build --platform ios --profile development`. Authenticated with **regular Apple ID password + 2FA code** (Fastlane uses Developer API — NOT App-Specific Password, that's for third-party services). Same bundle ID `com.zaeli.app` = update-in-place install on iPhone (no duplicate app icon). Session persistence survived (AsyncStorage kept the auth token). **Blueprint for TestFlight**: `eas build --profile preview` (standalone) → `eas submit --platform ios`.

**G. Deploy template folder** (commit `2a32cac`). `zaeli-app-links-template/` in the app repo — ready to spin up as its own GitHub repo:
- `public/.well-known/apple-app-site-association` — AASA with Team ID V37VPTPKQ8, bundle `com.zaeli.app`, `/invite/*` match.
- `public/index.html` — landing page (palette orbs + INK wordmark + coral "chaos" + Learn more → `zaeli.ai`).
- `public/invite/index.html` — browser fallback for `/invite/<anything>` (peach + mint orbs, App Store CTA).
- `netlify.toml` — `publish = "public"` + AASA `Content-Type: application/json` header.

### Key decisions Session 25

- **Universal Links = production path** — `zaeli://` custom scheme is dev-only now.
- **AASA MUST be served with `Content-Type: application/json`** — Netlify default fails silently. `netlify.toml` `[[headers]]` block is mandatory.
- **Cloudflare grey cloud (DNS-only) for AASA host** — orange proxy rewrites Content-Type. Only turn on orange with a specific Rule bypassing proxy on the AASA path, and test with curl.
- **Universal Link path MUST match the Expo Router route path** — AASA declares `/invite/*`, app has `/invite/[token]`, `INVITE_LINK_BASE` generates `/invite/`. All three must agree.
- **Native entitlement changes require a new EAS build** — `associatedDomains` can't be hot-reloaded by Metro. Every entitlement change = `eas build`.
- **EAS auth = regular Apple ID password + 2FA**, NOT App-Specific Password.
- **Same bundle ID = update-in-place on iOS** — new build overwrites, session survives.
- **Stripe activation is Richard's move** — code committed, but needs ~25 min external account setup before going live. `STRIPE-SETUP.md` has the path.
- **Voice (ElevenLabs) still deferred** to after full backend pass + TestFlight (Session 20 decision).

### What's NEXT

- **Phase 2e — Anna's phone.** Universal Link + QR both wired. `PHASE-2E-TEST-PLAN.md` walks the flow. Waiting on Anna's device.
- **Phase 3b — Stripe activation** (Richard's external action, ~25 min): stripe.com account (AU) → create **Family Plan A$9.99/mo + Tutor Add-on A$7.99/mo both tax-inclusive** → Customer Portal config with return URL `zaeli://settings` → collect Price IDs. Then I'll deploy the Edge Functions, register the webhook, fill in `PRICE_TO_PLAN` in `lib/stripe.ts`, and replace `fetchCustomerPortalUrl` stub with real fetch.
- **TestFlight submission** (Phase 4b, for Anna): `eas build --profile preview` (standalone, no Metro dependency) → `eas submit --platform ios` → TestFlight review → Anna installs via TestFlight app.
- **Phase 4b full cleanup** (post-Anna): remove the 4 remaining dev rows (Re-do onboarding, Simulate invite accepted, Open latest invite as receiver, Reset to owner account), remove QR chip, expo-document-picker for Budget CSV, GDPR / export data / privacy WebViews.
- **zaeli.ai marketing site** — parked. `hello@zaeli.ai` already routes. Pricing page + landing content when Stripe path is live.

### SQL migrations to run for Session 25 (if setting up fresh)

`supabase-stripe-fields.sql` (idempotent — adds 5 columns to profiles).

Session 24 migrations still current: `supabase-invite-inviter-name.sql`, `supabase-family-member-colours.sql`, `supabase-remap-event-assignees.sql`, `supabase-event-repeat-group.sql`.

### Session 24 (still current — historical, 29 May)

Real-data identity + family roster + recurring events. Profile identity wired (Settings hero + invite inviter name); family roster now dynamic DB-backed via `lib/family-roster.ts` (up to 8 members, replaces hardcoded arrays); calendar inline-card date-label fix; memory hallucination fix (background knowledge ≠ scheduled events); RECURRING EVENTS shipped (12-month horizon, `repeat_group_id` series grouping, update_all/delete_all/extend tools, morning-brief ending-soon nudge). Commits: `f58988d`, `eec133f`, `7d9597b`, `c089d95`, `15cef8a`.

### Earlier this same backend pass (Session 23 — historical, 28 May)

#### Session 23 — memory loop, push notifications, cross-device prep

**A. Phase 2f — Memory view → real Supabase data** (commit `8dbfb08`). Settings → Memory now reads `family_insights` + `family_milestones` via new lib fetchers (`fetchInsightsByCategory`, `fetchMilestones`, `deleteInsight`, `deleteMilestone`, `clearAllMemory`). Per-category empty states, confidence-derived sub labels, × delete (optimistic + DB), clear-all. Lesson: view-mount data effects must re-fetch on every entry, not gate on a `loaded` flag (the empty-first-load bug).

**B. Phase 2f+ — COMPLETED the memory capture + recall loop** ⭐ (commit `83738a7`). The big one. The gap: chat never called any memory functions, so the Memory view would always be empty for real users and Zaeli never remembered anything. Now:
- RECALL — `buildContext()` injects `buildMemoryContext()` into the chat system prompt when `memoryLearningOn`.
- CAPTURE — new `captureMemory(userText, replyText)` saves each exchange to `conversation_memory`; every 6th fires extraction (fire-and-forget). Wired at ALL completion points (general chat, tool path both branches, calendar-confirm).
- EXTRACT — NEW `detectInsightsFromConversations(familyId)` reads recent conversation_memory, Sonnet pulls DURABLE facts only, writes via `writeInsight` (dedupe + confidence bump). Reads conversations, NOT pattern_log (that's `detectAndSavePatterns`, still unused).
- Dev row "🧠 Run memory extraction now" to test without waiting 6 exchanges.

**C. Phase 3a — daily brief push notifications** (commit `25490a9`). `scheduleBriefNotifications` in `lib/notifications.ts` wires morning+evening brief times → iOS local daily notifications. Permission on auth (`_layout.tsx`), re-schedule on prefs change (`settings.tsx` updatePref). Idempotent, stable ids, permission-denial non-fatal. Dev rows: "🔔 Fire test notification (10s)" + "📋 List scheduled briefs". Notification = nudge; in-app brief = once-per-window content (no dupe).

**D. Phase 2e prep — QR cross-device invite test** (commit `ac048d6`). `react-native-qrcode-svg` + "📷 Show QR" chip/modal in family.tsx (encodes `zaeli://invite/<token>`). Camera scan → app opens at invite route. Linking debug listener in `_layout.tsx`. Copy-link copies the working `zaeli://` dev link. NEW `PHASE-2E-TEST-PLAN.md`. iOS gotcha: Safari blocks custom schemes in the address bar — use Notes/Messages/QR.

### Key decisions Session 23

- **Memory loop = 3 gated parts** (recall / capture / extract), all controlled by the "learn from chats" toggle. Insight extraction reads `conversation_memory`, extracts DURABLE facts only.
- **Brief notifications = local expo-notifications, daily recurring, scheduled from prefs.** Re-scheduled on any brief time/toggle change.
- **Invite link: `zaeli://` for dev/QR today, `https://zaeli.app/i/` Universal Link for production** (Phase 3c, needs domain).
- **Spoonacular parked to post-TestFlight** — Meals already does recipe management; discovery isn't a launch-blocker.

### Earlier this same backend pass (Session 22 — historical, 20 May)

#### Session 22 — Backend Phase 2d + multi-user safety

Single commit `7d2e418` covers all of it.

**A. Real auth at invite acceptance (the headline).** `supabase-invite-signup.sql` updates `handle_new_user()` trigger to branch on `invite_token` in `raw_user_meta_data`. With token: validates (must exist, not revoked, not already accepted), creates profile linked to the INVITE's `family_id` (not a new family), uses `invite.role` as the new profile's `kind` ('adult'/'kid'), marks invite_tokens accepted — all in one transaction. Bad tokens raise → Postgres rolls back the auth.users INSERT → no orphan users. SET search_path = public, auth preserved.

`lib/auth.ts` NEW `signUpFromInvite({inviteToken, email, password, name})` helper. Wraps `supabase.auth.signUp` with invite_token in metadata.

`app/invite/[token].tsx`:
- `finishAdult` collects email + password from form, calls signUpFromInvite + loadProfile. Real auth, real session.
- `finishKid` generates synthetic email (`kid-<token>@invitees.zaeli.app`) + uses `<token>-<PIN>` as password (Supabase needs 6+ chars). Kid sign-IN ergonomics for separate device come later.
- AdultAccountStep validates email regex + password length client-side; Continue button disabled until valid.
- Error alerts user-friendly ("An account already exists with that email...").

**B. Multi-user safety patches (six combined fixes).** Once user-switching actually worked, six leak bugs surfaced:

1. **Heads-up filter is inviter-only.** Previously `accepted_user_id !== currentUserId` (excluded only the accepter). Now `inviter_user_id === currentUserId` — only the actual sender sees "X just joined". Added inviter_user_id to Invite type + cache SELECT + rowToInvite. Fail-closed if profile not loaded yet.
2. **Chat persistence per-user.** `useChatPersistence` subscribes to `auth.onAuthStateChange`, scopes file by userId (`zaeli_chat_home_<userId>.json`). Old global file (`zaeli_chat_home.json`) becomes orphaned on first new-user load.
3. **Local chat messages state resets on user switch.** Detect via `chatLoaded` true→false→true transition in index.tsx, clear `messages` + `persistenceHasLoaded.current = false` + brief refs.
4. **tour-state + user-prefs don't fall back to AsyncStorage when signed in.** Profile JSONB is the ONLY source when there's a session (even if null = fresh user → DEFAULT). AsyncStorage fallback only fires when no session (pre-auth flows).
5. **All module caches invalidated in `_layout.tsx` `onAuthChange`.** NEW `invalidateCache()` exports on tour-state + user-prefs added to the existing `invalidateAccount()` + `resetCache()` (invites) call list, on both SIGNED_IN AND SIGNED_OUT.
6. **Fresh-invitee welcome polish.** Mount effect checks `onboarding_just_completed === 'true'` AND `getProfile()?.kind !== 'owner'`. If both: suppress `tryFireBrief`, push warm welcome ("Hey <name> 👋 Welcome in. Family stuff is already wired up — you'll get your first proper brief tomorrow morning."). Flag cleared by maybeFireTourOffer so subsequent sessions show the normal brief. Mid-context family brief is jarring as someone's first-ever Zaeli message.

### Important debugging insights from Session 22

**The "nested invites" gotcha.** Dev row "Open latest invite as receiver" signs you in as the new invitee. If you then create another invite WITHOUT signing back in as the owner, the new invite's `inviter_user_id` is that invitee's id — not yours. Heads-ups won't fire for the owner because the owner isn't the inviter. Always sign back in as the intended inviter before creating each test invite.

**Brief leak vs family brief — important distinction.** When a new family member sees the family brief, that's NOT a leak — the brief is keyed by `family_id + date + window` in `zaeli_briefs`. Different users in the same family see the same brief. That's the design. The Session 22 welcome polish (fix #6) is a UX layer on top — first-session invitees don't get the brief because the mid-context content is a bad first impression.

### Locked decisions Session 22

- **Real cross-device invite works end-to-end via DB trigger.** Atomic profile creation + invite acceptance. If trigger raises, auth user creation rolls back. No orphans, no partial state.
- **Kid sign-up = synthetic email + token+PIN password.** Stay signed in via AsyncStorage session persistence. Kid sign-IN ergonomics on separate device come later.
- **Adult invitee signup form validates client-side** before Continue. Email regex + password length ≥ 6.
- **Chat persistence is per-user** by Supabase user id. Old global file becomes orphaned on first new-user load.
- **When signed in, profile JSONB is the ONLY source of truth** for tour-state + user-prefs. No AsyncStorage fallback in signed-in path.
- **All module caches MUST be invalidated on auth change.** `_layout.tsx` onAuthChange is the single place. Future per-user state libs (memory etc) add their `invalidateCache()` here.
- **Heads-up filter = inviter-only.** `inviter_user_id === currentUserId`. Other family members don't get heads-ups for invites they didn't send.
- **Fresh invitees suppress the family brief on first session.** Warm welcome instead. Triggered by `onboarding_just_completed` flag + non-owner kind. One-shot (flag cleared by maybeFireTourOffer).

### Earlier this same backend pass (Session 21 — historical, 14–18 May)

Five distinct pieces shipped:

**A. Backend Phase 1 — Auth foundation (commit `91dbf1e`).** First real Supabase auth in the project. `supabase-auth-tables.sql` (idempotent) creates `families` + `profiles` tables with RLS + a `handle_new_user()` SECURITY DEFINER trigger that creates families row + matching profile in one atomic transaction (reads `name` + `family_name` from `raw_user_meta_data`). `public.current_family_id()` helper used by every RLS policy downstream. NEW `lib/auth.ts` (signUpOwner / signInWithPassword / signOut / loadProfile / getCurrentFamilyId + module cache). NEW `app/(auth)/sign-in.tsx` (3-state UI sign-in/sign-up/check-email with palette orbs matching onboarding splash). `app/_layout.tsx` auth guard + `onAuthChange` listener. **Critical dev setup**: disable "Confirm email" in Supabase dashboard.

**B. Backend Phase 2a — RLS + DUMMY_FAMILY_ID swap (commits `24aa73c` and `4884290`).** The big lift. `supabase-data-rls.sql` adds standard RLS policies (SELECT/INSERT/UPDATE/DELETE) to 19 family-scoped tables via DO-block iteration. All policies: `family_id = public.current_family_id()`. `tutor_messages` gets session-aware policy. `claim_legacy_data()` RPC for reassigning dummy-family rows. NEW `lib/family.ts` — `getFamilyId()` resolves at query time via auth context, warned-once fallback with self-healing `loadProfile()` trigger. **99 swaps** across 12 files (`app/(tabs)/index.tsx` had the bulk — 99 refs alone) via perl word-boundary regex. Plus 3 NEW view-query branches added to `send()` in index.tsx for Shopping/Meals/Tasks "what's on…" queries — **must go BEFORE the calendar branch** otherwise CALENDAR_KEYWORDS' "what's on" intercepts shopping queries with calendar render.

**C. Backend Phase 2a follow-up fixes (commit `4884290`) — session persistence + RLS finally working.** Three issues after the initial Phase 2a landing:
  1. **User signed out on every reload.** Cause: Supabase auth defaulted to `window.localStorage` which doesn't exist in RN. Fix in `lib/supabase.ts`: AsyncStorage as `auth.storage` + `react-native-url-polyfill/auto` import (required for RN auth) + `AppState` listener for token refresh. Required `npx expo start --dev-client --clear`.
  2. **`lib/family.ts` warned-once fallback hardening.**
  3. **Shopping list returned 0 rows despite all auth context correct.** JWT ✅, function returned right family ✅, profile row exists ✅, query returned 0 rows ❌. Root cause: `current_family_id()` SECURITY DEFINER function was created **without `SET search_path = public, auth`**. Inside SECURITY DEFINER context running as `postgres` role, `auth.uid()` didn't resolve and the function silently returned NULL. Then `family_id = NULL` was always false. Compounded by a SECOND silent failure: original `supabase-data-rls.sql` DO-block had rolled back during its first run (likely a function-ordering issue) — so RLS was ON with ZERO policies = Postgres' deny-everything default. Fix: `CREATE OR REPLACE FUNCTION current_family_id() ... SET search_path = public, auth` AND re-ran the policy DO-block. **Single biggest lesson of the whole backend pass — any SECURITY DEFINER function calling auth.uid() MUST have explicit search_path.**

**D. Backend Phase 2b — invite tokens + tour state to Supabase (commit `a632852`).** Two state libs migrated from AsyncStorage to Supabase so they work cross-device. Public API surface preserved on both libs so call sites didn't change. `supabase-invites-tour.sql` creates `invite_tokens` table + RLS + SECURITY DEFINER RPCs (`get_invite_by_token` + `accept_invite`) **anon-callable** for receiver lookup without a session (token IS the secret) + `profiles.tour_state` JSONB column. `lib/invite-state.ts` rewritten — inviter side hydrates from family-scoped SELECT; receiver side uses NEW `lookupInviteByToken` / `acceptInviteRemote` via RPC. `lib/tour-state.ts` rewritten — `profiles.tour_state` JSONB is source of truth when signed in, AsyncStorage as offline fallback + pre-auth path. `app/invite/[token].tsx` updated to use new RPC functions. **Unlocks real cross-device invite tracking at the DB level** (but not yet real cross-device sign-up — that's Phase 2d).

**E. Backend Phase 2c — settings preferences to Supabase (commit `8b7d543`).** Smallest of the four phases. `supabase-user-prefs.sql` adds `profiles.user_preferences` JSONB column. NEW `lib/user-prefs.ts` with same write-through pattern as tour-state. `settings.tsx` removed inline `Prefs` interface / `DEFAULT_PREFS` / `PREFS_KEY` / `loadPrefs` / `savePrefs` (now in lib). All 15 settings fields (brief times, notification toggles, quiet hours, sound + vibration, memory learning) now persist across devices.

**F. Chat bar photo upload bug fix (commit `7b125d4`).** Surfaced after Phase 2c. User taps camera icon → picker opens → user selects → nothing visible happens. Three combined bugs: (1) `pendingImage` state set but never rendered as preview, (2) Send button opacity check `!input.trim()` stayed 30% with photo-only, (3) Send tap guard `if (input.trim())` rejected photo-only sends. Fixed all three: 64px thumbnail above bar with "Photo ready — tap send" + ✕ dismiss; opacity now `!input.trim() && !pendingImage`; tap guard now `if (t.trim() || pendingImage)` calls `send('')` with image (existing send() guard already accepts empty text + image).

### Locked decisions Session 21

- **SECURITY DEFINER functions calling `auth.uid()` MUST have `SET search_path = public, auth`.** Single biggest lesson of the backend pass. Otherwise auth.uid() silently returns NULL → policies that depend on it silently fail → "everything's empty" symptom.
- **State lib pattern is locked**: module-level cache for sync render reads + `loadX()` hydrates from profile JSONB when signed in / AsyncStorage when not + `persist()` write-through to both. Used in `lib/tour-state.ts` + `lib/user-prefs.ts`. Future per-user state libs should follow this exact shape.
- **Receiver-side data lookups via anon-callable SECURITY DEFINER RPCs**, not direct table queries. Token IS the secret. Used in `lib/invite-state.ts` for `lookupInviteByToken` + `acceptInviteRemote`.
- **Supabase SQL editor only shows the LAST query result** when running multiple queries together — known UX quirk.
- **`pg_class.relrowsecurity = true` with no policies = deny-everything default.** Always verify both RLS-on AND policies-exist when debugging.
- **For backfill SQL that needs to bypass RLS**: `ALTER TABLE DISABLE ROW LEVEL SECURITY` → `UPDATE` → `ENABLE`. `SET LOCAL row_security = off` does NOT work for non-postgres roles.
- **Voice (ElevenLabs) stays deferred to after backend pass.** Session 20 decision still holds.

### Earlier this same session block (Session 20 — on-device polish round, 28 April — historical)

Three bugs surfaced during real device testing — all fixed in one commit. Plus the voice timing decision locked.

**Tutor session resume** — `goSessionReview` was a `console.log` stub. **Fix:** `resumeSessionId` param to tutor-session. New `loadExistingSession(sid)` fetches session row + tutor_messages, hydrates state. Status flips 'completed' → 'active' so exit-save works on next back. Works for all 6 pillars.

**Chat VIEW-query inline cards** — only CALENDAR view queries were intercepted before GPT chat path. **Fix:** three keyword arrays + detection functions + branches in `send()`. Each fetches data + renders inline card + chips. Action queries unaffected.

**Shopping sheet add-bar layout** — `SafeAreaView edges={['bottom']}` doesn't reliably resolve insets on first render inside a Modal. **Fix:** `useSafeAreaInsets()` + explicit padding. Spend tab paddingBottom: `50 + insets.bottom`.

**Voice (ElevenLabs) — LOCKED AFTER backend pass.** Voice on a single-device prototype demos but can't go live; best reveal moment = TestFlight build with voice + auth + push together.

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
- **Tutor stop 7 = HERO** — violet accent throughout, trial badge "✨ FREE FOR 14 DAYS" inline at top of card, secondary CTA "Just have a look", price line "$7.99 / child / month" (Session 25 pricing reduction).
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
