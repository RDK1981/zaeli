/**
 * openai-proxy — Supabase Edge Function (Session 30 Phase 5 ⭐)
 *
 * Pass-through relay for OpenAI /v1/chat/completions calls with the API key
 * held server-side. Companion to anthropic-proxy — removes the need to
 * bundle EXPO_PUBLIC_OPENAI_API_KEY into the client.
 *
 * Client → POST here with the caller's JWT + OpenAI chat completions body
 * Function → verifies JWT, forwards to api.openai.com with server-side
 *            Authorization: Bearer, returns raw OpenAI response verbatim
 *
 * Deploy:
 *   supabase functions deploy openai-proxy
 *   supabase secrets set OPENAI_API_KEY=sk-proj-...
 *
 * Client body is the standard OpenAI chat completions payload:
 *   { model, messages, max_completion_tokens?, temperature?, response_format?, ... }
 *
 * Whisper audio transcriptions go through whisper-proxy (separate function
 * because they use multipart/form-data instead of JSON).
 */

import { createClient } from 'npm:@supabase/supabase-js@2';

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

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

    // 2. Server-side API key check
    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) {
      console.error('[openai-proxy] OPENAI_API_KEY not set');
      return json({ error: 'Server misconfigured — missing OPENAI_API_KEY secret' }, 500);
    }

    // 3. Parse client body
    const payload = await req.json().catch(() => null);
    if (!payload || typeof payload !== 'object') {
      return json({ error: 'Invalid JSON body' }, 400);
    }
    if (typeof (payload as any).model !== 'string') {
      return json({ error: 'Missing "model" in request body' }, 400);
    }
    if (!Array.isArray((payload as any).messages)) {
      return json({ error: 'Missing "messages" array in request body' }, 400);
    }

    // 4. Forward to OpenAI
    const upstream = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    // 5. Return response verbatim (preserves usage stats + choices shape)
    const respText = await upstream.text();
    return new Response(respText, {
      status:  upstream.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error('[openai-proxy] error:', e?.message ?? e);
    return json({ error: 'Proxy failed', detail: e?.message }, 500);
  }
});
