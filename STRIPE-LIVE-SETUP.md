# Stripe Live-Mode Setup

*Session 30 — Phase 5 of the pre-launch checklist. This is the doc for activating **live-mode** Stripe (real money), migrating from sandbox.*

You're taking Zaeli from "test cards work" to "real subscriptions charge real money." Take your time. About 1 hour end to end.

---

## Before you start — have these ready

- **ABN** (or ACN if you've incorporated)
- **Business address** (can be home address if sole trader)
- **Bank account** for payouts (BSB + account number)
- **Personal ID** (driver's licence or passport — Stripe verifies you're a real person)
- **A phone** — Stripe may 2FA you

If any of these aren't ready, stop here and come back when they are. Stripe won't let you activate live mode without them, and half-completed KYC is worse than not started.

---

## Critical mental model — TEST vs LIVE modes

Stripe has TWO parallel environments:
- **TEST mode** = sandbox. Everything you set up in Session 28 lives here. Test cards (4242…) work. No real money moves.
- **LIVE mode** = production. Real cards. Real money. Real invoices.

**Every dashboard page has a toggle in the top-left**: "Test mode" (orange banner) vs no banner (live mode). Products, prices, Payment Links, webhooks, API keys — all EXIST SEPARATELY in each mode. You have to redo everything.

**Rule of thumb**: if you see an orange banner at the top of the Stripe dashboard, you're in test mode. NO orange banner = live mode.

---

## Step 1 — Activate live mode in Stripe

1. Go to https://dashboard.stripe.com → sign in
2. If you see an orange "Test mode" banner, click the toggle (top-left) to switch to **live mode**
3. You'll see a prompt: **"Activate your account"** or **"Complete your profile"** — click it
4. Stripe walks you through:
   - Business type (Sole Trader if just you / Company if incorporated)
   - ABN
   - Business address
   - Your personal details + ID upload
   - Bank account for payouts
   - What Zaeli does (short description — say "AI-powered family life management app, subscription SaaS")

**Time**: 15-30 min if you have all the info ready.

Stripe may take a few hours to a couple of days to fully verify you. **You can continue with the next steps below in the meantime** — most things work while verification is pending, they just can't pay out until verification completes.

---

## Step 2 — Create the two products in LIVE mode

Confirm you're in live mode (no orange banner). Then:

1. **Products** (left sidebar) → **+ Create product**
2. **Product 1 — Zaeli Family Plan**
   - Name: `Zaeli Family Plan`
   - Description: `Full family access — Chat, Calendar, Meals, Shopping, Kids Hub, Tasks, Travel, Budget, Notifications`
   - Pricing model: **Recurring**
   - Price: `9.99`
   - Currency: `AUD - Australian Dollar`
   - Billing period: **Monthly**
   - **⚠️ CRITICAL: Tax behavior → click "More pricing options" → Tax behavior: `Inclusive`** (Australian GST is 10% — if you leave this as "Exclusive" Stripe adds 10% on top, so a customer gets charged A$10.99. Inclusive means the A$9.99 already contains GST.)
   - **Save product**
3. **On the product page you just created**, note the **API ID** of the price (starts with `price_1...`). Copy it to a text file — you'll paste it into the code later.
4. **Product 2 — Zaeli Tutor Add-on**
   - Products → + Create product
   - Name: `Zaeli Tutor Add-on (per child)`
   - Description: `AI Tutor — homework help, practice, read aloud, Socratic method. Per child.`
   - Pricing model: **Recurring**
   - Price: `7.99`
   - Currency: `AUD`
   - Billing period: **Monthly**
   - **⚠️ Tax behavior: `Inclusive`** (same as above)
   - **Save product**
5. Note this price's API ID too. `price_1...`

**You should now have 2 Price IDs written down** — Family (A$9.99) and Tutor (A$7.99).

---

## Step 3 — Create the Payment Link (Family Plan)

The Payment Link is the hosted checkout page users open when they tap "Subscribe" in Settings.

1. **Payment Links** (left sidebar) → **+ New**
2. Select **Zaeli Family Plan** (the product you just created)
3. Confirm quantity: 1
4. **Advanced options** → enable **Collect customer's email address**
5. **After payment** → **Show confirmation page** (default is fine — later we can add a Netlify /return page that auto-redirects to `zaeli://settings`, but not blocking)
6. Enable **Allow customers to update quantity**: OFF
7. Enable **Create customer** (this is usually on by default — makes sure customer records get created)
8. **Create link**
9. Copy the URL. Format is `https://buy.stripe.com/XXXXXXXX...` (NO `test_` prefix like sandbox had). Paste to your text file.

---

## Step 4 — Configure Customer Portal (live mode)

The portal is where users manage their subscription after they've bought.

1. **Settings** (gear icon top-right) → **Billing** → **Customer portal**
2. Confirm you're on the live tab (should be if you toggled at the start)
3. Set **Default return URL**: `https://zaeli.app`
4. Enable these features (all should be on by default):
   - Customer information updates: ✅
   - Payment methods: ✅ update
   - Invoice history: ✅
   - Cancel subscriptions: ✅ (Cancellation mode: "At end of billing period" is more forgiving)
5. **Save changes**

---

## Step 5 — Register webhook endpoint (live mode)

Same URL as sandbox — different mode toggle, different signing secret.

1. **Developers** (top nav) → **Webhooks** → **+ Add endpoint**
2. **Endpoint URL**: `https://rsvbzakyyrftezthlhtd.supabase.co/functions/v1/stripe-webhook`
3. **Events to send** → **Select events**:
   - `customer.created`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. **Add endpoint**
5. On the endpoint page you just created, click **Reveal** next to **Signing secret**. It looks like `whsec_...`. Copy it to your text file (labelled as **LIVE webhook secret**).

---

## Step 6 — Grab your live API keys

1. **Developers** → **API keys**
2. Confirm you're on the live tab
3. You'll see two keys:
   - **Publishable key**: `pk_live_...` — copy to text file (we don't use it currently but nice to have)
   - **Secret key**: `sk_live_...` — click **Reveal** to see it. Copy to text file. **This is highly sensitive — treat like a password.**

---

## Step 7 — Update Supabase secrets with LIVE keys

In PowerShell, from `C:\Users\richa\zaeli`:

```powershell
supabase secrets set STRIPE_SECRET_KEY=sk_live_YOUR_ACTUAL_LIVE_KEY_HERE
```

Replace the placeholder with the actual `sk_live_...` from Step 6.

Then:

```powershell
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_YOUR_ACTUAL_LIVE_WEBHOOK_SECRET
```

Replace the placeholder with the `whsec_...` from Step 5.

Verify:

```powershell
supabase secrets list
```

Both `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` should be listed. (The DIGEST will change from what it was in sandbox — that's how you know it took.)

**Important**: The Edge Functions (`stripe-portal` and `stripe-webhook`) will automatically use the new live keys on their next invocation. No redeploy needed.

---

## Step 8 — Give me the values so I can update the code

Paste the following back to me in chat (or edit `lib/stripe.ts` yourself if you're comfortable):

```
LIVE Family Price ID:   price_1XXXXXX...
LIVE Tutor Price ID:    price_1XXXXXX...
LIVE Payment Link URL:  https://buy.stripe.com/XXXXXXX...
```

I'll update `lib/stripe.ts`:
- `STRIPE_PRICE_FAMILY` = live Family price ID
- `STRIPE_PRICE_TUTOR` = live Tutor price ID
- `STRIPE_PAYMENT_LINK_FAMILY` = live Payment Link URL
- Webhook `PRICE_TO_PLAN` map = same live IDs

Then commit + push. Your next build will use live Stripe end-to-end.

---

## Step 9 (OPTIONAL but recommended before launch) — Enable Stripe Tax

Automates Australian GST reporting.

1. **Products** → **Tax**
2. Follow the prompts to enable Stripe Tax
3. Confirm your tax jurisdictions (Australia)
4. Cost: 0.5% per transaction in live mode. For A$9.99 plan that's ~$0.05 per subscription per month — tiny.

**You can skip this if you're comfortable filing GST manually** (BAS quarterly). Skipping is fine for the first few months of low volume.

---

## Test the live flow (⚠️ WITH REAL MONEY)

Once code is updated + build shipped:

1. Sign in on your phone as a NEW test account (not your beta account, since that has a beta grant that hides the Subscribe button)
   - Easiest: use the "🔗 Open latest invite as receiver" dev row to become an adult invitee, OR sign up a fresh account with a spare email
2. Go to Settings → Subscription → tap **Subscribe · A$9.99/mo**
3. Stripe checkout opens in Safari with the live Payment Link
4. **Use YOUR REAL credit/debit card** (a real card of yours — you'll be charged A$9.99)
5. Complete checkout
6. Return to app → subscription card auto-updates to "Active · next bill [date]"
7. **In Stripe live dashboard → refund yourself** (Payments → find your test transaction → Refund) so you get the A$9.99 back

This is the ONLY way to truly test live mode. Sandbox test cards don't work in live mode.

---

## Rollback if something goes wrong

If live-mode payments start failing and you need to fall back to sandbox temporarily:

```powershell
supabase secrets set STRIPE_SECRET_KEY=sk_test_YOUR_OLD_SANDBOX_KEY
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_YOUR_OLD_SANDBOX_WEBHOOK
```

Then revert `lib/stripe.ts` values to the sandbox ones from Session 28. Your beta users on beta grant aren't affected either way.

---

## Session 28 sandbox values (for reference / rollback)

```
Sandbox Family Price ID:   price_1Tp3x30kUsgPd6wFSSOUucBW
Sandbox Tutor Price ID:    price_1Tp3xn0kUsgPd6wF7zonHLyo
Sandbox Payment Link URL:  https://buy.stripe.com/test_9B6dR165ie276QY3ROdnW00
```

Don't confuse these with the live ones you're about to create.
