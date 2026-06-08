/**
 * lib/stripe.ts — Stripe subscription helpers (Phase 3b scaffolding).
 *
 * SCAFFOLDING ONLY — no real Stripe wiring yet. When you create the Stripe
 * account + the server-side customer-portal endpoint, slot the real URL in
 * fetchCustomerPortalUrl() and you're done client-side. See
 * STRIPE-SETUP.md for the full setup steps.
 *
 * Data shape lives on `profiles` (see supabase-stripe-fields.sql):
 *   - stripe_customer_id     — Stripe Customer ID, set after first signup
 *   - subscription_status    — trialing / active / past_due / cancelled / null=free
 *   - subscription_plan      — internal plan code, e.g. 'family' / 'family_tutor_1'
 *   - subscription_renews_at — next billing date
 *   - trial_ends_at          — when the free trial ends
 *
 * Server endpoint to build:
 *   POST /api/stripe/portal { user_id } → { url }
 *     Uses Stripe secret key + stripe.billingPortal.sessions.create()
 *     See STRIPE-SETUP.md for the Supabase Edge Function template.
 */

import { getProfile } from './auth';

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
 * SCAFFOLDING: returns null until the server endpoint is built. When it is,
 * implement the body to POST to /api/stripe/portal with the user id and
 * return the `url` from the response.
 */
export async function fetchCustomerPortalUrl(): Promise<string | null> {
  // TODO (Stripe wiring):
  //   const userId = getProfile()?.id;
  //   if (!userId) return null;
  //   const res = await fetch(STRIPE_PORTAL_ENDPOINT, {
  //     method: 'POST',
  //     headers: { 'Content-Type': 'application/json' },
  //     body: JSON.stringify({ user_id: userId }),
  //   });
  //   if (!res.ok) return null;
  //   const data = await res.json();
  //   return data.url ?? null;
  return null;
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
