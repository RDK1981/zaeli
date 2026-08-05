# Google Calendar OAuth setup — kickoff guide

**Goal**: get Google Cloud project + OAuth consent screen + calendar scope + domain verification all ready NOW, so when we later write the code + record the demo video, verification submission is 15 minutes instead of an afternoon of paperwork.

**Time**: ~30-45 minutes of clicking through the Google Cloud Console.

**Prerequisites**:
- A Google account for the app (recommend using `hello@zaeli.ai` or `richarddekretser@gmail.com` — you'll be logging into Google Cloud Console with it)
- `zaeli.app` domain live (it is — we ship the AASA from there)
- App logo — the `za + orbs` icon at `assets/images/icon.png` works

---

## Part A — Do NOW (this guide)

### Step 1 · Create the Google Cloud project

1. Go to https://console.cloud.google.com/
2. Sign in with your chosen Google account (see prerequisites)
3. Top bar → project dropdown (says "Select a project") → **New Project**
4. Project name: `Zaeli`
5. Organization: leave blank (no need)
6. Location: leave blank
7. Click **Create**
8. Wait ~10 seconds for provisioning
9. Top bar → project dropdown → select **Zaeli**

### Step 2 · Enable the Google Calendar API

1. Left sidebar (three-line menu, top left) → **APIs & Services** → **Library**
2. Search bar: `Google Calendar API`
3. Click the result
4. Click **Enable**
5. Wait ~5 seconds

### Step 3 · Configure the OAuth consent screen

1. Left sidebar → **APIs & Services** → **OAuth consent screen**
2. User Type: **External** (Zaeli is for the general public, not a Google Workspace org)
3. Click **Create**

**App information page:**
- App name: `Zaeli`
- User support email: your chosen Google account
- App logo: upload `assets/images/icon.png` (the 2B "za + orbs" 1024×1024 file). Must be square, PNG, ≤ 1 MB.

**App domain:**
- Application home page: `https://zaeli.app`
- Application privacy policy link: `https://zaeli.app/privacy.html`
- Application terms of service link: `https://zaeli.app/terms.html`

**Authorized domains:**
- Click **Add domain**
- Enter: `zaeli.app`
- (Google auto-verifies via the Search Console association we'll do in Step 5. If prompted to verify domain now, follow the DNS TXT flow — instructions in Step 5.)

**Developer contact:**
- Email address: your chosen Google account

Click **Save and Continue**.

### Step 4 · Add scopes

You're now on the **Scopes** page.

1. Click **Add or Remove Scopes**
2. Filter: `calendar`
3. Check the box next to:
   - `.../auth/calendar.readonly` — **"See and download any calendar you can access using your Google Calendar"**
4. **Do NOT** add any other calendar scopes (write scopes need bigger justification).
5. **Do NOT** add non-calendar scopes.
6. Click **Update** at the bottom of the panel
7. You should see `calendar.readonly` listed under "Restricted scopes"
8. Click **Save and Continue**

**Test users** page:
- Add `hello@zaeli.ai` (or your Google account) + `anna@example.com` (Anna's Google account if she has one)
- Test users can use the OAuth flow BEFORE verification lands — this is how you'll dev-test the code path
- Add up to 100 test users; anyone not on the list gets a scary "unverified app" warning
- Click **Save and Continue**

Review the **Summary** → click **Back to Dashboard**.

### Step 5 · Verify domain ownership (zaeli.app)

Google needs to confirm you own `zaeli.app` before it'll trust the privacy policy / terms URLs you gave it.

1. Left sidebar → **APIs & Services** → **Domain verification**
2. Click **Add Domain** → enter `zaeli.app`
3. Google will show a TXT record you need to add to DNS. Something like:
   `google-site-verification=<long-string>`
4. Go to Cloudflare → `zaeli.app` DNS management (Cloudflare dashboard → zaeli.app zone → DNS → Records)
5. **Add record**: Type = `TXT`, Name = `@` (or leave blank for root), Content = the full `google-site-verification=<long-string>` value, TTL = Auto, Proxy status = DNS only (grey cloud)
6. **Save**
7. Wait 30-60 seconds for DNS propagation
8. Back in Google Cloud Console: click **Verify**
9. Should show ✓ Verified within a minute (if not, wait a bit longer and retry)

You can leave the TXT record in DNS permanently — it doesn't affect anything else.

### Step 6 · Create the OAuth client credentials

You need Client ID + Client Secret for the mobile app to actually use the OAuth flow.

1. Left sidebar → **APIs & Services** → **Credentials**
2. **+ Create Credentials** → **OAuth client ID**
3. Application type: **iOS**
4. Name: `Zaeli iOS`
5. Bundle ID: `com.zaeli.app`
6. App Store ID: leave blank for now (will fill after TestFlight submission)
7. Team ID: `V37VPTPKQ8` (your Apple team ID, same as AASA)
8. Click **Create**
9. **Copy the Client ID** that appears. Save it somewhere safe (a `1Password` note or similar). Client Secret isn't shown for iOS apps — Google uses PKCE for mobile, no secret needed.

### Step 7 · Publish the app (Testing → Production)

Right now the OAuth consent screen is in **Testing** mode. Only your test users can use it.

For verification review to start, you need to switch to **Production** mode.

⚠️ **DON'T DO THIS YET** if you haven't recorded the demo video. Once you switch to Production, you can't add features/scopes without re-review. And the demo video is a required part of the Production submission for calendar scopes.

**Instead**: leave the app in **Testing** mode for now. Your dev testing works (up to 100 test users). When we've built the code + recorded the demo video, we'll:
1. Add the video URL to the OAuth consent screen submission
2. Switch app to Production
3. Google verification review begins (4-6 weeks)

---

## Part A ✅ Complete — what you now have

- ✅ Google Cloud project for Zaeli
- ✅ Google Calendar API enabled
- ✅ OAuth consent screen configured with scope, branding, domains
- ✅ Domain ownership verified for zaeli.app
- ✅ OAuth client ID for iOS
- ✅ App in Testing mode — dev-usable up to 100 test users

**What's still needed for verification submission (Part B, later):**
- Working code path (Supabase Edge Function + PKCE flow in the app)
- YouTube video demo showing:
  - User opens Zaeli, taps "Connect Google Calendar"
  - iOS OAuth flow launches (SFAuthenticationSession)
  - User signs into their Google account
  - Consent screen shows scopes clearly
  - User grants access
  - Zaeli's Calendar sheet shows their Google events
  - User can toggle off / disconnect

That video is 90 seconds of screen recording. Non-blocking on Google.

---

## Part B — Do LATER (when code is ready)

### When we've built the code path

1. Set `EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID` in EAS Environment Variables (Sensitive, Preview + Production)
2. Test the full OAuth flow end-to-end with a test user
3. Record the demo video (Screen recording on Mac / QuickTime, upload unlisted to YouTube)
4. In Google Cloud Console → OAuth consent screen → edit → paste the YouTube URL in the video field
5. Click **Publish App** → moves from Testing → In production
6. Click **Submit for verification**
7. **Wait 4-6 weeks.** Google may email with clarifying questions — respond within 10 days or the submission drops.

### Common rejection reasons + how to preempt

- **"Scope not clearly used"** — the demo video must show data being read + displayed. Not just the OAuth flow.
- **"Privacy policy doesn't mention Google user data"** — our zaeli.app/privacy.html needs a section on Google Calendar data handling. Add before submitting.
- **"App name mismatch"** — the video, the OAuth consent screen, and the App Store listing must all say "Zaeli". Consistent branding.

### After verification lands

- App shows up as verified in the OAuth flow (no scary "unverified" warning)
- Any user can connect their Google Calendar (not just test users)
- 100-user cap lifts

---

## Scope justification (paste-ready for the review form)

When Google asks "Why do you need `calendar.readonly`?", paste this:

> Zaeli is a family life management app. Users create family events (school pickups, appointments, activities) inside Zaeli, and many also have personal or work events in Google Calendar. The `calendar.readonly` scope allows Zaeli to display the user's Google Calendar events alongside their family events in a single unified view — so parents see everything in one glance instead of switching between apps.
>
> Data handling:
> - Events are fetched on demand and cached briefly (30 seconds) in device memory only.
> - No calendar event data is stored on our servers.
> - The user's OAuth refresh token is stored per-user in Supabase, encrypted at rest, used only to re-authenticate against Google when tokens expire.
> - Users can revoke access at any time via Google Account permissions or in-app via Settings → Integrations → toggle off.
>
> Why read-only:
> - Users continue to manage events in Google Calendar directly. Zaeli does not add, edit, or delete Google events. Read-only is the minimum scope sufficient for the feature.
> - Write scopes are not requested because they are not needed.

---

## Outlook (Microsoft Graph) — separate exercise

Different Cloud Console (Azure AD), different scopes (`Calendars.Read`), similar consent flow but Microsoft's review is days-weeks instead of weeks-months. We'll write a separate `OUTLOOK-CALENDAR-SETUP.md` when we decide Outlook is worth it (after Google validates the demand).

For now: park Outlook. Consumer families are 90% Google/Apple.

---

## When you're done with Part A

Send me the **Client ID** from Step 6 (it's not a secret — it's OK to share). I'll store it somewhere useful in the codebase so it's ready when we write the code path.

Nothing else needed from you until we decide to build. The verification-prep work you just did shaves weeks off the future submission timeline.
