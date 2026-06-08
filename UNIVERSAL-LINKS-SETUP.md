# Universal Links setup — Phase 3c

When this is done, tapping `https://zaeli.app/invite/<token>` from SMS / Mail / Safari opens the **Zaeli app** directly to the invite screen (instead of a webpage). The QR + `zaeli://` scheme keep working as a dev fallback.

## What's already done in the app

- `app.json` → `ios.associatedDomains: ["applinks:zaeli.app"]` ✅
- `lib/invite-state.ts` → `INVITE_LINK_BASE = 'zaeli.app/invite/'` (path matches the Expo Router route) ✅
- `family.tsx` → Copy Link now copies `https://zaeli.app/invite/<token>` ✅
- `family.tsx` → Resend SMS uses the https form ✅
- `well-known/apple-app-site-association` → template ready to upload ✅

## What you need to do

### 1. Get your Apple Team ID

Either:
- Apple Developer portal → Account → Membership → Team ID (e.g. `ABC123XYZ4`), or
- `cat ios/zaeli.xcodeproj/project.pbxproj | grep DEVELOPMENT_TEAM` after `npx expo prebuild`

### 2. Fill in the AASA file

Edit `well-known/apple-app-site-association` and replace `REPLACE_WITH_TEAM_ID` with your Team ID:

```json
{
  "applinks": {
    "details": [
      {
        "appIDs": ["ABC123XYZ4.com.zaeli.app"],
        "components": [
          { "/": "/invite/*", "comment": "Family invite links" }
        ]
      }
    ]
  }
}
```

### 3. Host it at zaeli.app

Upload the file to: `https://zaeli.app/.well-known/apple-app-site-association`

**Critical requirements:**
- **Exact path**: `/.well-known/apple-app-site-association` (no extension, no `.json`)
- **HTTPS** only (Apple won't fetch from HTTP)
- **No redirects** — must serve the file directly
- **Content-Type**: `application/json`
- **No authentication** — must be publicly accessible

Hosting options:
- **Vercel**: drop the file in `public/.well-known/apple-app-site-association`, deploy
- **Netlify**: same — put in `public/` directory, configure `Content-Type` via `_headers` file:
  ```
  /.well-known/apple-app-site-association
    Content-Type: application/json
  ```
- **Cloudflare Pages / GitHub Pages**: same pattern

### 4. Verify the file is live

Test from your laptop:

```powershell
curl -I https://zaeli.app/.well-known/apple-app-site-association
```

Should return `200 OK` with `Content-Type: application/json`. If you see a redirect or 404, fix that first.

Apple's own validator: https://branch.io/resources/aasa-validator/ — paste `zaeli.app`.

### 5. Rebuild the dev-client

`associatedDomains` is an iOS entitlement — it requires a native rebuild, the JS hot-reload won't pick it up.

```powershell
npx expo prebuild --clean
npx expo run:ios --device
```

(Or via EAS: `eas build --profile development --platform ios`.)

After install, the app's entitlements include `webcredentials:zaeli.app + applinks:zaeli.app`. iOS will fetch the AASA file on first launch + cache it.

### 6. Test on device

1. Create an invite in the app → copy link → paste into Messages (to yourself or another device)
2. **Tap the link in Messages** → iOS should offer "Open in Zaeli" or open it directly
3. App should land on the invite welcome screen for that token

If it opens Safari instead:
- AASA file not yet picked up (Apple caches; try uninstall + reinstall the app)
- AASA file misconfigured (re-check Team ID + bundle ID match)
- HTTPS / redirect issue with the hosted file

### 7. (Optional) Web landing page at zaeli.app/invite/*

If a non-iPhone user (or someone without the app installed) taps the link, Safari currently loads a non-existent page. Nice to have: a small landing page that says "Open in Zaeli — download from the App Store" with the deep link button.

Not required for the iOS Universal Link to work — just nicer UX for non-app users.

---

## How it works once live

| Path | What happens |
|---|---|
| Tap link in iMessage | iOS checks the AASA file. Domain matches. App opens. Routes to `/invite/[token]`. ✅ |
| Tap link in Safari (with app installed) | Safari → "Open in Zaeli" banner at top → app opens. ✅ |
| Tap link in Safari (without app) | Loads the webpage (or 404). Nice to have a landing page. |
| Old `zaeli://invite/<token>` | Still works — Expo Router handles both schemes for the same route. |
| QR code in app | Still encodes `zaeli://invite/<token>` — useful for cross-device dev test even after launch. |

---

## Why we changed the path

Before: `zaeli.app/i/<token>` (short, but routes to `/i/[token]` in Expo Router — would have needed a new route file).

Now: `zaeli.app/invite/<token>` — matches the existing `/invite/[token]` route directly. One route, both schemes.
