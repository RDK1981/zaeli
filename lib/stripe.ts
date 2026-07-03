/**
 * lib/stripe.ts — Stripe subscription helpers.
 *
 * fetchCustomerPortalUrl() calls the Supabase Edge Function `stripe-portal`,
 * which uses the Stripe secret key server-side to create a billing portal
 * session and returns its URL. The client opens that URL via WebBrowser.
 *
 * Data shape lives on `profiles` (see supabase-stripe-fields.sql):
 *   - stripe_customer_id     — Stripe Customer ID, set after first signup
 *   - subscription_status    — trialing / active / past_due / cancelled / null=free
 *   - subscription_plan      — internal plan code, e.g. 'family' / 'family_tutor'
 *   - subscription_renews_at — next billing date
 *   - trial_ends_at          — when the free trial ends
 *
 * Sandbox price IDs (Session 27):
 *   Family Plan  A$9.99/mo → price_1Tp3x30kUsgPd6wFSSOUucBW
 *   Tutor Add-on A$7.99/mo → price_1Tp3xn0kUsgPd6wF7zonHLyo
 *   (Both tax-inclusive; live IDs will be added when we switch modes.)
 */

import { getProfile } from './auth';
import { supabase } from './supabase';

// Stripe price IDs — used when building checkout flows. Sandbox for now.
export const STRIPE_PRICE_FAMILY = 'price_1Tp3x30kUsgPd6wFSSOUucBW';
export const STRIPE_PRICE_TUTOR  = 'price_1Tp3xn0kUsgPd6wF7zonHLyo';

export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'cancelled'
  | 'incomplete'
  | null;  // null = no subscription / free tier

export interface SubscriptionState {
  status:     SubscriptionStatus;
  plan:       string | null;
  renewsAt:   string | null;   // ISO
  trialEndsAt: string | null;  // ISO
  customerId: string | null;
}

/** Read the current subscription state from the cached profile (sync). */
export function getSubscription(): SubscriptionState {
  const p = getProfile();
  return {
    status:      p?.subscription_status     ?? null,
    plan:        p?.subscription_plan       ?? null,
    renewsAt:    p?.subscription_renews_at  ?? null,
    trialEndsAt: p?.trial_ends_at           ?? null,
    customerId:  p?.stripe_customer_id      ?? null,
  };
}

/** Human-readable badge for the Settings hero / subscription card. */
export function subscriptionLabel(s: SubscriptionState = getSubscription()): string {
  if (!s.status) return 'Free';
  switch (s.status) {
    case 'trialing':   return s.trialEndsAt ? `Free trial · ends ${formatShortDate(s.trialEndsAt)}` : 'Free trial';
    case 'active':     return s.renewsAt    ? `Active · next bill ${formatShortDate(s.renewsAt)}` : 'Active';
    case 'past_due':   return 'Past due — update payment';
    case 'cancelled':  return 'Cancelled';
    case 'incomplete': return 'Setup incomplete';
    default:           return 'Free';
  }
}

/**
 * Fetch the Stripe Customer Portal URL for the signed-in user.
 *
 * Calls the Supabase Edge Function `stripe-portal` which:
 *   - Verifies the user's JWT
 *   - Looks up their profiles.stripe_customer_id
 *   - Creates a Stripe billingPortal.sessions
 *   - Returns { url }
 *
 * Returns null if:
 *   - User isn't signed in
 *   - User has no Stripe Customer yet (hasn't subscribed via checkout)
 *   - The Edge Function errored
 *
 * Callers should handle null by either showing a friendly "subscribe first"
 * prompt or directing the user to the pricing/checkout page.
 */
export async function fetchCustomerPortalUrl(): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) return null;

    const res = await fetch(`${supabaseUrl}/functions/v1/stripe-portal`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    });
    if (!res.ok) {
      console.warn('[stripe] portal fetch failed:', res.status);
      return null;
    }
    const data = await res.json();
    return data.url ?? null;
  } catch (e) {
    console.warn('[stripe] portal fetch error:', e);
    return null;
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────
function formatShortDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
  } catch {
    return iso;
  }
}
