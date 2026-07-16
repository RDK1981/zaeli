/**
 * whisper-proxy — Supabase Edge Function (Session 30 Phase 5 ⭐)
 *
 * Pass-through relay for OpenAI /v1/audio/transcriptions calls with the
 * API key held server-side. Separate function from openai-proxy because
 * Whisper uses multipart/form-data instead of JSON — different pass-through
 * shape.
 *
 * Client → POST here with the caller's JWT + multipart form
 *          (file, model=whisper-1, language, ...)
 * Function → verifies JWT, forwards the exact multipart body to OpenAI
 *            with server-side Authorization: Bearer, returns raw response
 *
 * Deploy:
 *   supabase functions deploy whisper-proxy
 *   (uses the same OPENAI_API_KEY secret that openai-proxy uses)
 *
 * Response: { text: "…" } — verbatim from OpenAI Whisper API.
 *
 * Note: Deno's Request supports the FormData API natively; we re-emit
 * the multipart body via a fresh FormData object so upstream fetch
 * handles the multipart boundary correctly.
 */

import { createClient } from 'npm:@supabase/supabase-js@2';

const WHISPER_URL = 'https://api.openai.com/v1/audio/transcriptions';

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
      console.error('[whisper-proxy] OPENAI_API_KEY not set');
      return json({ error: 'Server misconfigured — missing OPENAI_API_KEY secret' }, 500);
    }

    // 3. Parse the multipart form from the client and rebuild it for upstream.
    // We can't just pass req.body through because the Content-Type header
    // (with its multipart boundary) needs to match the body — fresh FormData
    // ensures fetch generates a matching Content-Type on the way out.
    const incoming = await req.formData();
    const forward = new FormData();
    for (const [key, value] of incoming.entries()) {
      // Preserve file blobs verbatim; strings pass as strings.
      if (value instanceof File) {
        forward.append(key, value, value.name);
      } else {
        forward.append(key, value);
      }
    }
    // Safety net — if the client somehow didn't include model, force it.
    if (!forward.has('model')) forward.append('model', 'whisper-1');
    // Force English by default (matches Session 30 client-side fix — Whisper's
    // language detector occasionally routes unclear English audio to Welsh
    // etc). Client can override by including language in the request.
    if (!forward.has('language')) forward.append('language', 'en');

    // 4. Forward to Whisper
    const upstream = await fetch(WHISPER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        // NB: DO NOT set Content-Type — fetch generates the multipart boundary automatically
      },
      body: forward,
    });

    // 5. Return response verbatim
    const respText = await upstream.text();
    return new Response(respText, {
      status:  upstream.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error('[whisper-proxy] error:', e?.message ?? e);
    return json({ error: 'Whisper proxy failed', detail: e?.message }, 500);
  }
});
