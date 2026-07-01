# zaeli-app-links

Static site hosted at **zaeli.app**. Two jobs:

1. Serve the **Apple App Site Association (AASA)** file so iOS Universal Links work — tapping `https://zaeli.app/invite/<token>` in Messages / Mail / Safari opens the Zaeli app.
2. Serve simple **fallback pages** for people who visit zaeli.app URLs in a browser (either they don't have the app yet, or they're not on iPhone).

## Structure

```
public/
  .well-known/
    apple-app-site-association    ← the AASA file. Apple fetches this to authorize the domain.
  index.html                       ← what shows if someone types just zaeli.app
  invite/
    index.html                     ← what shows if someone visits /invite/<anything> in a browser
netlify.toml                       ← Netlify config: publish dir + AASA Content-Type header
```

## Deploy

Auto-deploys via Netlify on every push to `main`. No manual steps.

## Verifying

After deploy + custom domain attached, this should work:

```bash
curl -I https://zaeli.app/.well-known/apple-app-site-association
```

Expected:
- `HTTP/2 200`
- `content-type: application/json`

If either is wrong, Universal Links won't activate.

## When to edit the AASA file

Only if:
- You change the app's bundle ID from `com.zaeli.app`
- You change your Apple Team ID (currently `V37VPTPKQ8`)
- You add new URL paths beyond `/invite/*` that should also open the app
