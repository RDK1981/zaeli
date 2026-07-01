# Supabase Edge Functions

Server-side pieces for Stripe integration. Everything here is **prepared but not yet deployed** — deploy after you complete the Stripe setup in `STRIPE-SETUP.md`.

## Functions

| Function | Purpose | Auth |
|---|---|---|
| `stripe-portal` | Returns a Stripe Customer Portal URL for the signed-in user. Called by the "Manage subscription" button in Settings. | User JWT |
| `stripe-webhook` | Receives Stripe events (`customer.subscription.*`, `invoice.payment_*`). Keeps `profiles.subscription_status` etc. in sync. | Stripe signature (no JWT) |

## Prerequisites

1. **Supabase CLI installed** — https://supabase.com/docs/guides/cli
2. **Signed in to the CLI:** `supabase login`
3. **Linked to the Zaeli project:**
   ```powershell
   supabase link --project-ref rsvbzakyyrftezthlhtd
   ```
4. **Phase 3b SQL migration run** (adds `stripe_customer_id`, `subscription_status`, etc. to `profiles`)
5. **Stripe products created** in Test mode (Stage 3 of STRIPE-SETUP.md) — you'll need the Price IDs

## Deploy — Step by step

### Step 1: Set the Stripe secrets

```powershell
# Test-mode secret key from Stripe Dashboard → Developers → API keys
supabase secrets set STRIPE_SECRET_KEY=sk_test_YourSecretHere

# Optional — override the app's return URL after portal actions.
# Defaults to zaeli://settings, which is what you want for production.
# supabase secrets set STRIPE_PORTAL_RETURN_URL=zaeli://settings
```

### Step 2: Deploy the portal function

```powershell
supabase functions deploy stripe-portal
```

The function URL will be:
`https://rsvbzakyyrftezthlhtd.supabase.co/functions/v1/stripe-portal`

### Step 3: Deploy the webhook function

The `--no-verify-jwt` flag is critical — Stripe won't send a JWT; the request is authenticated via the signed body instead.

```powershell
supabase functions deploy stripe-webhook --no-verify-jwt
```

The function URL:
`https://rsvbzakyyrftezthlhtd.supabase.co/functions/v1/stripe-webhook`

### Step 4: Register the webhook in Stripe

Stripe Dashboard → Developers → Webhooks → **+ Add endpoint**

- **Endpoint URL:** the webhook URL from Step 3
- **Events to send:**
  - `customer.created`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`
- Click **Add endpoint**
- **Copy the Signing secret** (starts with `whsec_...`) — you'll need it in Step 5

### Step 5: Set the webhook secret

```powershell
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_YourSecretHere
```

### Step 6: Update PRICE_TO_PLAN in the webhook

Open `stripe-webhook/index.ts` and replace the placeholder Price IDs:

```ts
const PRICE_TO_PLAN: Record<string, string> = {
  'price_1AbC...family':      'family',
  'price_1AbC...tutor_child': 'family_tutor',
};
```

Redeploy after editing:

```powershell
supabase functions deploy stripe-webhook --no-verify-jwt
```

### Step 7: Wire the client

In `lib/stripe.ts`, replace the `fetchCustomerPortalUrl` stub body with a real call to the portal function. Template is in the function's TODO comment.

## Testing

### Portal function

```powershell
# Get a session's access token from the app (or supabase.auth.getSession() in a client), then:
curl -X POST "https://rsvbzakyyrftezthlhtd.supabase.co/functions/v1/stripe-portal" `
  -H "Authorization: Bearer YOUR_JWT_HERE"
```

Expected response:
```json
{ "url": "https://billing.stripe.com/session/..." }
```

If the user has no `stripe_customer_id` yet:
```json
{ "error": "no_customer", "message": "No subscription yet..." }
```

### Webhook function

Best done via Stripe's own testing tool:

```powershell
# From Stripe CLI, in test mode:
stripe listen --forward-to https://rsvbzakyyrftezthlhtd.supabase.co/functions/v1/stripe-webhook
stripe trigger customer.subscription.created
```

Then check the profile row in Supabase — `subscription_status` should have updated.

## Reading logs

```powershell
supabase functions logs stripe-portal
supabase functions logs stripe-webhook
```

Or in the Supabase dashboard → Edge Functions → the function → Logs tab.

## Local development (optional)

You can run functions locally with the Supabase CLI:

```powershell
supabase functions serve stripe-portal --env-file supabase/.env.local
```

Where `.env.local` has:
```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

Never commit `.env.local` — add it to `.gitignore` (already gitignored via the default patterns).

## Costs

Supabase free tier includes **500,000 Edge Function invocations / month**. For a family app with (say) 10k subscribers making a Manage Subscription tap once a month + a handful of webhook events per user per month, you'll be nowhere near the limit. No cost concern until well after PMF.
