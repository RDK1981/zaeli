/**
 * anthropic-proxy — Supabase Edge Function (Session 30 Phase 5 ⭐)
 *
 * Pass-through relay for Anthropic /v1/messages calls with the API key
 * held server-side. Removes the need to bundle EXPO_PUBLIC_ANTHROPIC_API_KEY
 * into the client (which is extractable from the compiled app).
 *
 * Client → POST here with the caller's JWT + Anthropic request body
 * Function → verifies JWT, forwards to api.anthropic.com with server-side
 *            x-api-key, returns raw Anthropic response verbatim
 *
 * Deploy:
 *   supabase functions deploy anthropic-proxy
 *   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
 *
 * Client body is the standard Anthropic /v1/messages payload:
 *   { model, max_tokens, messages, system?, tools?, ... }
 *
 * Optional top-level field client can include (proxy-only, not forwarded):
 *   { _betaHeaders?: string[] }  — e.g. ["prompt-caching-2024-07-31"]
 *
 * Response: exact Anthropic response body forwarded verbatim, including
 * usage stats so client-side api_logs still work.
 */

import { createClient } from 'npm:@supabase/supabase-js@2';

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST')    return json({ error: 'Method not allowed' }, 405);

  try {
    // 1. Verify JWT (caller must be signed in)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Missing Authorization header' }, 401);
    }
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(jwt);
    if (authError || !user) {
      return json({ error: 'Invalid or expired token' }, 401);
    }

    // 2. Server-side API key check
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) {
      console.error('[anthropic-proxy] ANTHROPIC_API_KEY not set');
      return json({ error: 'Server misconfigured — missing ANTHROPIC_API_KEY secret' }, 500);
    }

    // 3. Parse client body — extract proxy-only fields, forward the rest
    const payload = await req.json().catch(() => null);
    if (!payload || typeof payload !== 'object') {
      return json({ error: 'Invalid JSON body' }, 400);
    }
    const { _betaHeaders, ...anthropicPayload } = payload as {
      _betaHeaders?: string[];
      [k: string]: unknown;
    };

    // Sanity check — model + messages are required by Anthropic
    if (typeof (anthropicPayload as any).model !== 'string') {
      return json({ error: 'Missing "model" in request body' }, 400);
    }
    if (!Array.isArray((anthropicPayload as any).messages)) {
      return json({ error: 'Missing "messages" array in request body' }, 400);
    }

    // 4. Build headers for upstream Anthropic call
    const upstreamHeaders: Record<string, string> = {
      'Content-Type':      'application/json',
      'x-api-key':         apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
    };
    if (Array.isArray(_betaHeaders) && _betaHeaders.length > 0) {
      upstreamHeaders['anthropic-beta'] = _betaHeaders.join(',');
    }

    // 5. Forward the request
    const upstream = await fetch(ANTHROPIC_URL, {
      method:  'POST',
      headers: upstreamHeaders,
      body:    JSON.stringify(anthropicPayload),
    });

    // 6. Return the response verbatim (preserves usage stats, error shape, etc)
    const respText = await upstream.text();
    return new Response(respText, {
      status:  upstream.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error('[anthropic-proxy] error:', e?.message ?? e);
    return json({ error: 'Proxy failed', detail: e?.message }, 500);
  }
});
