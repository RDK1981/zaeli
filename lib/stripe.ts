/**
 * lib/stripe.ts — Stripe subscription helpers.
 *
 * fetchCustomerPortalUrl() calls the Supabase Edge Function `stripe-portal`,
 * which uses the Stripe secret key server-side to create a billing portal
 * session and returns its URL. The client opens that URL via WebBrowser.
 *
 * Session 28 — Beta program: test families get 3 months free without any
 * Stripe interaction. Set `beta_end_date` on their profile row. While
 * beta_end_date > now(), getSubscription() returns status='trialing' with
 * plan='beta', overriding any real Stripe state. Zero friction to test,
 * real subscription decision at end of beta.
 *
 * Data shape lives on `profiles` (see supabase-stripe-fields.sql +
 * supabase-beta-end-date.sql):
 *   - stripe_customer_id     — Stripe Customer ID, set after first checkout
 *   - subscription_status    — trialing / active / past_due / cancelled / null=free
 *   - subscription_plan      — internal plan code, e.g. 'family' / 'family_tutor'
 *   - subscription_renews_at — next billing date
 *   - trial_ends_at          — Stripe's real trial end (from webhook)
 *   - beta_end_date          — comp beta window for test families
 *
 * Sandbox price IDs (Session 27):
 *   Family Plan  A$9.99/mo → price_1Tp3x30kUsgPd6wFSSOUucBW
 *   Tutor Add-on A$7.99/mo → price_1Tp3xn0kUsgPd6wF7zonHLyo
 *   (Both tax-inclusive; live IDs will be added when we switch modes.)
 *
 * Payment Link (Session 28) — used to bounce users to Stripe-hosted checkout
 * when their beta ends or they otherwise want to subscribe. Configured in
 * Stripe Dashboard on the Family Plan product. Sandbox for now.
 */

import { getProfile } from './auth';
import { supabase } from './supabase';

// Stripe price IDs — LIVE (Session 30 Phase 5).
// Migrated from sandbox on 17 July 2026 when Rich flipped Stripe live-mode.
// Sandbox IDs (reference only, do not use):
//   Family: price_1Tp3x30kUsgPd6wFSSOUucBW
//   Tutor:  price_1Tp3xn0kUsgPd6wF7zonHLyo
export const STRIPE_PRICE_FAMILY = 'price_1Ttl54P6r3YzpJLXj3nySAYA';
export const STRIPE_PRICE_TUTOR  = 'price_1Ttl54P6r3YzpJLX4SUE4mnn';

// Stripe Payment Link — Family Plan LIVE. 14-day free trial (card required
// upfront), then A$9.99/mo tax-inclusive. Users open this URL via
// Linking.openURL() from the Subscribe button in Settings. On success,
// Stripe fires customer.subscription.created (status='trialing') → our
// webhook syncs profile → user returns to app → foreground refresh in
// _layout.tsx re-reads profile → Subscription card shows the trial state.
// Sandbox URL (reference): https://buy.stripe.com/test_9B6dR165ie276QY3ROdnW00
export const STRIPE_PAYMENT_LINK_FAMILY = 'https://buy.stripe.com/fZubJ36EM1QR2z6eBl83C01';

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
  betaEndDate: string | null;  // Session 28 — comp beta program end date (ISO)
}

/** Read the current subscription state from the cached profile (sync). */
export function getSubscription(): SubscriptionState {
  const p = getProfile();
  // Beta override: if beta_end_date is in the future, treat as trialing/beta
  // regardless of any real Stripe state. Test families never enter payment
  // details, just have their beta_end_date set via SQL.
  const betaEnd = p?.beta_end_date ? new Date(p.beta_end_date) : null;
  const isInBeta = betaEnd !== null && !isNaN(betaEnd.getTime()) && betaEnd > new Date();
  if (isInBeta) {
    return {
      status:      'trialing',
      plan:        'beta',
      renewsAt:    null,
      trialEndsAt: p!.beta_end_date,
      customerId:  p?.stripe_customer_id ?? null,
      betaEndDate: p!.beta_end_date,
    };
  }
  return {
    status:      p?.subscription_status     ?? null,
    plan:        p?.subscription_plan       ?? null,
    renewsAt:    p?.subscription_renews_at  ?? null,
    trialEndsAt: p?.trial_ends_at           ?? null,
    customerId:  p?.stripe_customer_id      ?? null,
    betaEndDate: p?.beta_end_date           ?? null,
  };
}

/** Human-readable badge for the Settings hero / subscription card. */
export function subscriptionLabel(s: SubscriptionState = getSubscription()): string {
  if (!s.status) return 'Free';
  switch (s.status) {
    case 'trialing':
      // Session 28 — differentiate beta from real Stripe trials.
      if (s.plan === 'beta') {
        return s.betaEndDate ? `Beta · ends ${formatShortDate(s.betaEndDate)}` : 'Beta';
      }
      return s.trialEndsAt ? `Free trial · ends ${formatShortDate(s.trialEndsAt)}` : 'Free trial';
    case 'active':     return s.renewsAt    ? `Active · next bill ${formatShortDate(s.renewsAt)}` : 'Active';
    case 'past_due':   return 'Past due — update payment';
    case 'cancelled':  return 'Cancelled';
    case 'incomplete': return 'Setup incomplete';
    default:           return 'Free';
  }
}

/**
 * Is the current family inside the comp beta window?
 *
 * Session 28: while beta_end_date > now(), test families get FULL product
 * access — including Tutor for all kids — without paying. When beta ends,
 * they auto-convert to paid Family Plan (base A$9.99) but Tutor add-ons
 * do NOT auto-enable. Users who genuinely love Tutor add it themselves
 * later — real conversion signal rather than default enrollment.
 *
 * Wired into: family-roster.ts (overrides tutorActive for children),
 * TutorSidebar.tsx (overrides isLocked check).
 */
export function isFamilyInBeta(): boolean {
  return getSubscription().plan === 'beta';
}

/**
 * Does the user need to see a "Subscribe now" prompt?
 *
 * Returns true when:
 *   - No status at all (never subscribed, never in beta)
 *   - In beta with <14 days left (soft prompt window)
 *   - Cancelled (want to re-subscribe)
 *
 * Returns false when they have an active paid subscription (no reason to
 * push checkout) or in the middle of a healthy beta.
 */
export function shouldPromptSubscribe(s: SubscriptionState = getSubscription()): boolean {
  if (!s.status) return true;
  if (s.status === 'cancelled') return true;
  if (s.status === 'trialing' && s.plan === 'beta' && s.betaEndDate) {
    const daysLeft = (new Date(s.betaEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return daysLeft < 14;
  }
  return false;
}

/**
 * Build the Payment Link URL with `client_reference_id` pointing at the
 * signed-in Supabase user, so we can link the resulting Stripe customer
 * back to their profile via the webhook.
 *
 * Returns null if the Payment Link isn't configured yet or the user isn't
 * signed in — callers should show a friendly "coming soon" placeholder.
 */
export function getCheckoutUrl(): string | null {
  const base = STRIPE_PAYMENT_LINK_FAMILY;
  if (!base) return null;
  const p = getProfile();
  if (!p?.id) return base; // signed out — just open the base link
  // client_reference_id shows up in Stripe's Checkout Session and can be
  // read from the checkout.session.completed webhook to link the resulting
  // customer to our profile. Also included as prefilled_email for convenience.
  const params = new URLSearchParams({
    client_reference_id: p.id,
    ...(p.email ? { prefilled_email: p.email } : {}),
  });
  return `${base}?${params.toString()}`;
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
