/**
 * family-notify — Supabase Edge Function (Session 29 ⭐)
 *
 * Sends push notifications to specified family members via the Expo Push
 * Service. Used by lib/notifications.ts `notifyFamily()`.
 *
 * Client → POST here with the caller's JWT + { recipient_user_ids, title, body, data }
 * Function → verifies JWT, verifies each recipient shares a family with the caller,
 *            fetches their expo_push_token, batches to Expo's push API.
 *
 * Deploy:
 *   supabase functions deploy family-notify
 *
 * Required secrets: none (uses SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY which
 * are automatically injected by the Supabase runtime for Edge Functions).
 *
 * Requires:
 *   - profiles.expo_push_token column (supabase-push-tokens.sql)
 *   - The recipients must have opened the app on the new build so their
 *     token is registered. Otherwise they're returned in the "failed" count.
 *
 * Security model:
 *   - JWT verified via supabaseAdmin.auth.getUser(jwt)
 *   - Recipients filtered by family_id = caller's family_id — this is the
 *     boundary. If the caller passes a user_id from a different family, that
 *     recipient is silently dropped from the batch (counted as failed).
 *   - Push tokens are never returned to the client.
 */

import { createClient } from 'npm:@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

// ── Handler ─────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  try {
    // 1. Verify JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Missing Authorization header' }, 401);
    }
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(jwt);
    if (authError || !user) {
      return json({ error: 'Invalid or expired token' }, 401);
    }

    // 2. Parse + validate body
    const payload = await req.json().catch(() => null);
    if (!payload || typeof payload !== 'object') {
      return json({ error: 'Invalid JSON body' }, 400);
    }
    const {
      recipient_user_ids,
      title,
      body,
      data: extraData,
    } = payload as {
      recipient_user_ids?: string[];
      title?: string;
      body?: string;
      data?: Record<string, unknown>;
    };

    if (!Array.isArray(recipient_user_ids) || recipient_user_ids.length === 0) {
      return json({ error: 'recipient_user_ids must be a non-empty array' }, 400);
    }
    if (recipient_user_ids.length > 20) {
      return json({ error: 'Max 20 recipients per call' }, 400);
    }
    if (!title || typeof title !== 'string' || title.length === 0) {
      return json({ error: 'title required' }, 400);
    }
    if (!body || typeof body !== 'string' || body.length === 0) {
      return json({ error: 'body required' }, 400);
    }
    if (title.length > 200 || body.length > 500) {
      return json({ error: 'title/body too long' }, 400);
    }

    // 3. Get caller's family_id
    const { data: callerProfile, error: cpErr } = await supabaseAdmin
      .from('profiles')
      .select('family_id, name')
      .eq('id', user.id)
      .single();
    if (cpErr || !callerProfile) {
      return json({ error: 'Caller profile not found' }, 404);
    }
    const familyId = callerProfile.family_id;

    // 4. Fetch recipient profiles — MUST share family_id with caller.
    // The .in() + .eq() combination enforces the family boundary.
    const { data: recipients, error: rErr } = await supabaseAdmin
      .from('profiles')
      .select('id, expo_push_token, name')
      .in('id', recipient_user_ids)
      .eq('family_id', familyId);
    if (rErr) {
      return json({ error: 'Failed to look up recipients', detail: rErr.message }, 500);
    }

    // Recipients that don't share the family are silently missing from `recipients`
    // — count them as failed. Same for recipients with NULL tokens.
    const requestedCount = recipient_user_ids.length;
    const withTokens = (recipients ?? []).filter(r => r.expo_push_token);
    const failedNoToken = requestedCount - withTokens.length;

    if (withTokens.length === 0) {
      return json({ sent: 0, failed: requestedCount, reason: 'no_deliverable_recipients' });
    }

    // 5. Batch-send to Expo Push API. Expo accepts an array of up to 100
    // messages in one call. We're capped at 20 recipients so one call is enough.
    const messages = withTokens.map(r => ({
      to:    r.expo_push_token,
      title: title,
      body:  body,
      sound: 'default',
      data:  {
        ...(extraData ?? {}),
        source:      'family-notify',
        from_user:   user.id,
        from_name:   callerProfile.name ?? null,
      },
    }));

    const expoRes = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Accept':          'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type':    'application/json',
      },
      body: JSON.stringify(messages),
    });

    if (!expoRes.ok) {
      const errTxt = await expoRes.text().catch(() => '');
      console.error('[family-notify] Expo push API error:', expoRes.status, errTxt.slice(0, 300));
      return json({ sent: 0, failed: requestedCount, error: `Expo API ${expoRes.status}` }, 502);
    }

    // Expo returns { data: [{ status: 'ok'|'error', id?, message?, details? }, ...] }
    const expoJson = await expoRes.json();
    const tickets: any[] = expoJson.data ?? [];
    const sent = tickets.filter(t => t?.status === 'ok').length;
    const failedFromExpo = tickets.length - sent;
    const totalFailed = failedNoToken + failedFromExpo;

    return json({
      sent,
      failed: totalFailed,
      // Include a debug summary in dev — helpful when tokens go stale
      // (DeviceNotRegistered is the common one). Client can log this.
      details: totalFailed > 0 ? {
        no_token: failedNoToken,
        expo_errors: tickets.filter(t => t?.status !== 'ok').map(t => t?.message ?? 'unknown'),
      } : undefined,
    });
  } catch (e: any) {
    console.error('[family-notify] error:', e?.message ?? e);
    return json({ error: 'Notification dispatch failed', detail: e?.message }, 500);
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
