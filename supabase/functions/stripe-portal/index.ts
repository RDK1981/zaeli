/**
 * stripe-portal — Supabase Edge Function
 *
 * Generates a Stripe Customer Portal URL for the signed-in user, so the
 * app can open it in a WebView (or Linking.openURL) via the "Manage
 * subscription" button in Settings.
 *
 * Client → POST here with the user's JWT in the Authorization header.
 * Function → verifies JWT, looks up profiles.stripe_customer_id, creates
 *            a Stripe billingPortal.sessions, returns { url }.
 *
 * Deploy:
 *   supabase functions deploy stripe-portal
 *   supabase secrets set STRIPE_SECRET_KEY=sk_test_...
 *
 * Requires:
 *   - profiles table with stripe_customer_id column (Phase 3b SQL migration)
 *   - The user must ALREADY be a Stripe Customer (created via Checkout /
 *     Payment Link). If they aren't yet, returns a friendly error.
 */

import Stripe from 'npm:stripe@14';
import { createClient } from 'npm:@supabase/supabase-js@2';

// ── Init ────────────────────────────────────────────────────────────────────
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-06-20',
});

// Service-role client — bypasses RLS so we can read any user's profile
// when we've already verified their JWT.
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

// The URL Stripe redirects the user back to after they finish managing
// their subscription. Session 27 note: Stripe's dashboard-level default
// return URL only accepts http(s), so we use zaeli.app here to match.
// A follow-up polish (post-TestFlight) is to create a /return page on
// Netlify that auto-redirects to zaeli://settings so iOS resolves back
// into the Settings screen instead of the landing page.
const RETURN_URL = Deno.env.get('STRIPE_PORTAL_RETURN_URL') ?? 'https://zaeli.app';

// ── Handler ─────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  // CORS preflight (for local web testing)
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  try {
    // 1. Verify the caller's JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Missing Authorization header' }, 401);
    }
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(jwt);
    if (authError || !user) {
      return json({ error: 'Invalid or expired token' }, 401);
    }

    // 2. Look up their stripe_customer_id
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return json({ error: 'Profile not found' }, 404);
    }
    if (!profile.stripe_customer_id) {
      // User hasn't subscribed yet — no Stripe Customer exists.
      // Client can direct them to the pricing/checkout page instead.
      return json({
        error: 'no_customer',
        message: 'No subscription yet. Subscribe first via the pricing page.',
      }, 400);
    }

    // 3. Create the portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: RETURN_URL,
    });

    return json({ url: session.url });
  } catch (e: any) {
    console.error('[stripe-portal] error:', e?.message ?? e);
    return json({ error: 'Portal session failed', detail: e?.message }, 500);
  }
});

// ── Helpers ─────────────────────────────────────────────────────────────────
const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
