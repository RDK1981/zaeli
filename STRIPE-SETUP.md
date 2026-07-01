# Stripe setup — Phase 3b finish line

The app-side scaffolding is done (commit reference: this session). To go from "scaffolding" → "live subscriptions" you need a **Stripe account + a small server endpoint**. The client never holds a Stripe secret key.

## What's already wired up in the app

- `supabase-stripe-fields.sql` — `profiles` gets: `stripe_customer_id`, `subscription_status`, `subscription_plan`, `subscription_renews_at`, `trial_ends_at`
- `lib/stripe.ts` — `getSubscription()`, `subscriptionLabel()`, `fetchCustomerPortalUrl()` stub
- `Profile` type (lib/auth.ts) — includes the five Stripe fields
- Settings → Subscription card reads real data (or shows "Free trial" when fields are null)
- "Manage subscription" button calls `fetchCustomerPortalUrl()` → opens in browser (or shows a friendly placeholder until the endpoint exists)

## What you need to do

### 1. Run the SQL migration

In Supabase SQL editor:

```sql
-- copy from supabase-stripe-fields.sql
```

### 2. Create a Stripe account

Sign up at https://stripe.com. **Use test mode** for development — get the test API keys from the dashboard.

### 3. Create the products + prices in Stripe

In Stripe Dashboard → Products → Add product:

- **Family plan** — A$9.99 / month recurring, **tax-inclusive** (see note below) → note the **Price ID** (looks like `price_1AbC...`)
- **Tutor add-on (per child)** — A$7.99 / month recurring, **tax-inclusive** → note its **Price ID**

**Tax-inclusive setup (important for AU):** the A$ figures above are what the customer pays end-to-end (GST included). Under the price setup, set tax behaviour to "Inclusive" — otherwise Stripe adds 10% GST on top and the user gets charged ~A$11 / A$8.79 instead of the intended A$9.99 / A$7.99. Also enable **Stripe Tax** in Settings → Tax so GST is calculated and remitted automatically.

You'll reference these Price IDs in your checkout flow when users subscribe.

### 4. Build the customer-portal server endpoint

The client can't hold the Stripe secret key, so the portal URL must be generated server-side. Easiest: a **Supabase Edge Function**.

`supabase/functions/stripe-portal/index.ts`:

```ts
import Stripe from 'npm:stripe@14';
import { createClient } from 'npm:@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-06-20' });
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  // Authenticate via the user's JWT
  const auth = req.headers.get('Authorization');
  if (!auth) return new Response('Unauthorized', { status: 401 });
  const { data: { user } } = await supabase.auth.getUser(auth.replace('Bearer ', ''));
  if (!user) return new Response('Unauthorized', { status: 401 });

  // Look up the user's stripe_customer_id from profiles
  const { data: profile } = await supabase
    .from('profiles').select('stripe_customer_id').eq('id', user.id).single();
  if (!profile?.stripe_customer_id) {
    return Response.json({ error: 'No Stripe customer yet — finish signup first' }, { status: 400 });
  }

  const portal = await stripe.billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: 'zaeli://settings',  // bring them back to the app
  });
  return Response.json({ url: portal.url });
});
```

Deploy:

```powershell
supabase functions deploy stripe-portal --no-verify-jwt
supabase secrets set STRIPE_SECRET_KEY=sk_test_...
```

### 5. Wire the client call

In `lib/stripe.ts`, replace the `fetchCustomerPortalUrl()` stub body with:

```ts
const { data: { session } } = await supabase.auth.getSession();
if (!session) return null;
const res = await fetch(
  `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/stripe-portal`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
  },
);
if (!res.ok) return null;
const data = await res.json();
return data.url ?? null;
```

### 6. Sign-up flow → create the Stripe Customer

When a new owner signs up (or you wire the checkout), create a Stripe Customer for them and store the id:

```ts
// in your signup / first-billing flow (server-side):
const customer = await stripe.customers.create({
  email: user.email,
  name: profile.name,
  metadata: { supabase_user_id: user.id },
});
await supabase.from('profiles').update({
  stripe_customer_id: customer.id,
}).eq('id', user.id);
```

### 7. Webhook to keep subscription state in sync

Add a webhook endpoint that handles `customer.subscription.*` events and updates `profiles.subscription_status / plan / renews_at` accordingly.

Events to handle:
- `customer.subscription.created` / `updated` → set status, plan, renews_at
- `customer.subscription.deleted` → status = 'cancelled'
- `invoice.payment_failed` → status = 'past_due'
- `invoice.payment_succeeded` → confirm status = 'active'

In Stripe Dashboard → Developers → Webhooks → Add endpoint:
`https://<project>.supabase.co/functions/v1/stripe-webhook`

### 8. Test in test mode

- Create a test subscription via Stripe Checkout (or directly via Customer Portal)
- Verify `profiles.subscription_status` flips to 'active' via webhook
- Verify Settings → Subscription card reflects the new state
- Verify "Manage subscription" → opens portal → cancel → webhook fires → card shows 'cancelled'

### 9. Switch to live mode for launch

Repeat 2-5 with live API keys + live webhook secret.

---

## What the user sees right now (pre-Stripe)

- Settings → Subscription card → "Free trial" (since all fields are null)
- Tap "Manage subscription" → friendly alert: *"Subscription management opens in your browser. Stripe isn't wired up yet — see STRIPE-SETUP.md."*

Nothing breaks. Everything slots in cleanly once the server endpoint exists.
