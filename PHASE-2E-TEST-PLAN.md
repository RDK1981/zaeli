# Phase 2e — Cross-Device Invite Verification

**Goal:** Confirm an invitee can sign up on a SECOND physical device (Anna's phone) and reach the family's data via real Supabase auth + RLS — not the same-device dev shortcut we used during Phase 2d.

**What we've already verified (Phase 2d, single device):**
- Adult invitee sign-up creates a real Supabase auth user
- Profile correctly links to inviter's `family_id`
- All family RLS-protected data is readable by the invitee
- Tour state, prefs, chat persistence all scope per-user correctly
- Heads-up message fires for the inviter (only) when invitee accepts

**What this test verifies (new):**
- The invite link actually reaches a second device
- That device can launch the app via the `zaeli://invite/<token>` scheme
- Sign-up works against the live Supabase project from the second device
- The invitee sees the family's existing data (calendar / shopping / meals / etc) on their device
- A new event added by Rich on Device 1 appears on Anna's Device 2 (within the page's normal refresh window)

---

## Prerequisites

- [x] Phase 2d shipped (commit `7d2e418`)
- [x] QR code chip available in family.tsx PendingInviteRow
- [x] Linking debug listener in `_layout.tsx`
- [ ] Both devices have the latest dev-client build installed (Rich's iPhone + Anna's iPhone)
- [ ] Both devices on the same Metro dev server OR each connected to their own (use `--host lan` if needed)
- [ ] Anna's iPhone has the `zaeli://` scheme registered (achieved automatically when dev-client is installed since `scheme: "zaeli"` is in `app.json`)

---

## Test workflow

### 1. Set the stage on Device 1 (Rich's iPhone)

- Sign in as Rich (`richarddekretser@gmail.com`)
- Confirm you're seeing your normal data: evening brief, shopping list with items, calendar events for the week
- Make a small change so we have something to verify cross-device:
  - **Add a calendar event** for tomorrow titled "Phase 2e test event"
  - **Add a shopping item** "test cheese"
  - Both should land in Supabase against your family_id

### 2. Create the invite on Device 1

- Hamburger ☰ → Our Family
- Tap "+ Invite to Zaeli" on Anna's row
- Phone number can be skipped (we'll use QR)
- Tap "📨 Send invite" → iOS share sheet opens
- **Cancel the share sheet** — we're using QR for this test, not SMS
- You land back on the Family screen with Anna showing as "Pending"

### 3. Show the QR

- Scroll down to Pending Invites section
- Find Anna's pending row
- Tap "📷 Show QR for second device"
- QR overlay appears

### 4. Scan from Device 2 (Anna's iPhone)

- Open the **Camera** app (not the Zaeli app)
- Point it at the QR code on Device 1
- iOS should show a notification banner: "Open in zaeli" (or similar)
- **Tap the banner** → Zaeli launches → routes to `/invite/<token>`
- Metro logs on Device 1 won't show anything (it's Device 2 launching), but check Device 2's Metro logs for `[link] initial URL: zaeli://invite/<token>` OR `[link] incoming URL: ...`

### 5. Walk through the Adult flow on Device 2

- "Hey Anna 👋 I'm Zaeli" welcome → Let's go
- Form: confirm name, enter `anna@example.com` (or her real email), 6+ char password → Continue
- Rhythm step: leave defaults → Continue
- Preferences: tap a few chips or skip → Finish

### 6. Verify Anna's chat on Device 2

- **Expected:**
  - Warm welcome message: "Hey Anna 👋 Welcome in. Family stuff is already wired up..."
  - Tour offer: "You're set up. Want a quick tour..."
  - **NO** family brief on this first session (welcome polish from Phase 2d)
  - **NO** heads-up about herself joining

### 7. Verify family data is accessible on Device 2

- Hamburger → Dashboard
- **Expected:** Calendar tile shows "Phase 2e test event" (the one Rich added in step 1)
- Hamburger → Shopping (or chat "what's on the shopping list")
- **Expected:** Shopping list includes "test cheese"
- Hamburger → Meals
- **Expected:** Same meal plan Rich sees

This proves the RLS chain is working: Anna's profile.family_id matches Rich's, so `current_family_id()` returns the right value when her JWT hits the policies.

### 8. Verify cross-device sync direction (Anna → Rich)

- On Device 2 (Anna): add a shopping item "milk-from-anna"
- On Device 1 (Rich): open the shopping sheet (or pull-to-refresh the dashboard tile)
- **Expected:** Rich sees "milk-from-anna" within a few seconds of the open / refresh

### 9. Verify the inviter heads-up

- On Device 1 (Rich): sign out → sign back in as Rich
- **Expected:** Chat shows mint heads-up: "✨ Anna just joined — they'll have their own brief tomorrow morning..."

If the heads-up does NOT fire, check via SQL:
```sql
SELECT inviter_user_id, accepted_user_id, surfaced_heads_up
FROM invite_tokens WHERE name = 'Anna' ORDER BY created_at DESC LIMIT 1;
```
- `inviter_user_id` should match Rich's auth.users.id
- `accepted_user_id` should match Anna's auth.users.id
- `surfaced_heads_up` should be false (or true if already shown earlier)

### 10. Verify Anna's tour-state + prefs persist cross-mount (already known to work but worth confirming)

- On Device 2 (Anna): take the tour, advance to stop 4
- Force-close + reopen the app
- **Expected:** Tour pill in chat shows "🧭 Resume tour · 4/11"
- Open Settings → Notifications → toggle "Calendar events" off
- Force-close + reopen the app, navigate to Settings
- **Expected:** "Calendar events" still off (loaded from her profile.user_preferences)

---

## What can go wrong + how to diagnose

| Symptom | Likely cause | Check |
|---|---|---|
| Camera scans QR but no "Open in zaeli" banner | Scheme not registered on Device 2 | Reinstall dev-client. Check `app.json` has `"scheme": "zaeli"` |
| App opens but lands on chat, not `/invite/<token>` | Linking handler not routing | Look for `[link]` console log on Device 2. Expo Router should auto-handle — verify the URL Metro logged |
| Sign-up fails with "An account already exists" | Email is reused from a prior test invitee | Use a fresh email each test |
| Sign-up succeeds but invitee sees empty calendar / shopping | Profile's family_id wrong | Run `SELECT id, email, family_id FROM profiles WHERE email = 'anna@example.com'` — must match Rich's family_id |
| Sign-up succeeds but invitee sees ZERO data | RLS broken or current_family_id() returning NULL | Run `SELECT debug_auth_state()` from Device 2 (would need temporary RPC button or just check via SQL with the user's session) |
| Anna can sign in on Device 2 but later sign-in attempt fails | Session not persisting | Check `lib/supabase.ts` AsyncStorage config still in place |

---

## Success criteria

- [ ] QR scan opens Zaeli on Device 2 directly to invite route
- [ ] Sign-up creates real Supabase auth user
- [ ] Profile linked to Rich's family_id (verify SQL)
- [ ] Anna sees Rich's family data on Device 2 (calendar / shopping / meals)
- [ ] Anna's shopping addition appears on Device 1 after refresh
- [ ] Rich sees heads-up "Anna just joined" after signing back in
- [ ] No data leak between users (Anna's chat doesn't show Rich's old messages, etc)

If all green: Phase 2e ✅ — backend pass is real-cross-device-verified. Move to Phase 2f (memory wiring).

---

## Cleanup after test

- On Device 2: Sign out (Settings → Sign out) so the test invitee doesn't linger
- On Device 1: Optional — revoke the test invite (no real impact, just keeps the Family screen tidy)
- Test invitee profile + family_id row stay in the DB. Not worth cleaning up; they're just dev artifacts.

---

## What's NOT tested here (and why)

- **SMS link tap → app launch** — that needs Universal Links on a live `zaeli.app` domain. Phase 3.
- **Kid sign-up on second device** — kids use synthetic email + token+PIN password, which works but sign-IN ergonomics aren't built yet. Defer to a later phase.
- **Push notifications** — Phase 3a.
- **Network failure handling** — covered by the existing app resilience, not specific to 2e.
