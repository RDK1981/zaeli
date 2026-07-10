/**
 * stripe-webhook — Supabase Edge Function
 *
 * Receives Stripe webhook events and keeps profiles.subscription_status /
 * subscription_plan / subscription_renews_at / trial_ends_at in sync.
 *
 * Register this endpoint in Stripe Dashboard → Developers → Webhooks:
 *   URL:    https://<project>.supabase.co/functions/v1/stripe-webhook
 *   Events: customer.subscription.created / updated / deleted,
 *           invoice.payment_succeeded / failed,
 *           customer.created (to backfill stripe_customer_id on first sub)
 *
 * Deploy:
 *   supabase functions deploy stripe-webhook --no-verify-jwt
 *   supabase secrets set STRIPE_SECRET_KEY=sk_test_...
 *   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
 *
 * IMPORTANT: --no-verify-jwt flag is REQUIRED. Stripe won't send a JWT;
 * the request is authenticated via the Stripe-Signature header instead
 * (verified below with the webhook secret).
 *
 * Requires:
 *   - profiles.stripe_customer_id / subscription_status / subscription_plan /
 *     subscription_renews_at / trial_ends_at columns (Phase 3b SQL migration)
 *   - Customers must have supabase_user_id in their Stripe metadata
 *     (set this when creating the Customer via Payment Link success handler
 *     or a checkout function — otherwise the webhook can't map Stripe →
 *     Supabase user).
 */

import Stripe from 'npm:stripe@14';
import { createClient } from 'npm:@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-06-20',
  // Edge runtime: use fetch-based HTTP client for edge compat.
  httpClient: Stripe.createFetchHttpClient(),
});
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

// Map Stripe Price IDs → your internal plan codes.
// Sandbox Price IDs (Session 27 — 2 July 2026, A$9.99 family + A$7.99 tutor inc GST).
// When switching to live mode, add the live Price IDs alongside — the map
// can hold both sandbox and live keys since they never collide.
const PRICE_TO_PLAN: Record<string, string> = {
  'price_1Tp3x30kUsgPd6wFSSOUucBW': 'family',        // Family Plan A$9.99/mo
  'price_1Tp3xn0kUsgPd6wF7zonHLyo': 'family_tutor',  // Tutor Add-on A$7.99/child/mo
};

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const signature = req.headers.get('Stripe-Signature');
  if (!signature) return new Response('Missing signature', { status: 400 });

  const body = await req.text();
  let event: Stripe.Event;
  try {
    // Async version — required in Deno / edge runtime for proper HMAC.
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (e: any) {
    console.error('[webhook] signature verify failed:', e?.message);
    return new Response(`Webhook Error: ${e?.message}`, { status: 400 });
  }

  console.log('[webhook] received:', event.type);

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        await syncSubscription(sub);
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        await markCancelled(sub);
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await markPastDue(invoice.customer as string);
        break;
      }
      case 'invoice.payment_succeeded': {
        // Nothing to do — subscription.updated fires alongside and handles state.
        break;
      }
      case 'customer.created': {
        // Backfill stripe_customer_id on the matching profile.
        const customer = event.data.object as Stripe.Customer;
        const supabaseUserId = customer.metadata?.supabase_user_id;
        if (supabaseUserId) {
          await supabaseAdmin
            .from('profiles')
            .update({ stripe_customer_id: customer.id })
            .eq('id', supabaseUserId);
        }
        break;
      }
      default:
        console.log('[webhook] unhandled:', event.type);
    }
    return new Response('ok', { status: 200 });
  } catch (e: any) {
    console.error('[webhook] handler error:', e?.message);
    return new Response(`Handler Error: ${e?.message}`, { status: 500 });
  }
});

// ── Handlers ────────────────────────────────────────────────────────────────
async function syncSubscription(sub: Stripe.Subscription) {
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;

  // Derive the plan code from the first line item's price.
  const priceId = sub.items.data[0]?.price?.id;
  const plan = priceId ? (PRICE_TO_PLAN[priceId] ?? null) : null;

  const status  = sub.status; // 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid' | 'incomplete' | ...
  // Stripe moved current_period_end from the Subscription level to individual
  // items around API 2024-06-20. Read subscription-level first (older subs),
  // fall back to the first item's period_end (newer subs).
  const periodEnd = sub.current_period_end
    ?? (sub.items.data[0] as any)?.current_period_end
    ?? null;
  const renews  = periodEnd
    ? new Date(periodEnd * 1000).toISOString()
    : null;
  const trialEnds = sub.trial_end
    ? new Date(sub.trial_end * 1000).toISOString()
    : null;

  // Map Stripe's 'canceled' → app's 'cancelled' (British spelling used in Profile type).
  const appStatus = status === 'canceled' ? 'cancelled' : status;

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({
      subscription_status:    appStatus,
      subscription_plan:      plan,
      subscription_renews_at: renews,
      trial_ends_at:          trialEnds,
    })
    .eq('stripe_customer_id', customerId);

  if (error) console.error('[webhook] sync update failed:', error.message);
}

async function markCancelled(sub: Stripe.Subscription) {
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
  await supabaseAdmin
    .from('profiles')
    .update({
      subscription_status:    'cancelled',
      subscription_renews_at: null,
    })
    .eq('stripe_customer_id', customerId);
}

async function markPastDue(customerId: string) {
  await supabaseAdmin
    .from('profiles')
    .update({ subscription_status: 'past_due' })
    .eq('stripe_customer_id', customerId);
}
