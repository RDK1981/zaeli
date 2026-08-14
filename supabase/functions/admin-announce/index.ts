/**
 * admin-announce — Supabase Edge Function (Session 33 · Admin Console v3 Batch 4)
 *
 * Sends a single batch of an admin announcement email via Zoho SMTP.
 * Client is expected to chunk larger recipient lists into batches of ≤50
 * and invoke this endpoint once per batch (each invocation = one SMTP
 * handshake, safely within the ~200ms CPU budget).
 *
 * Client → POST here with the caller's JWT + { subject, body_html, recipients: string[] }
 * Function → verifies JWT → verifies is_admin() → sends ONE email with the
 *            recipient list as BCC. From/To = hello@ / signups@ (anti-spoof
 *            dodge, same as beta-notify).
 *
 * Deploy:
 *   supabase functions deploy admin-announce
 *
 * Required secrets:
 *   ZOHO_APP_PASSWORD (already set for beta-notify)
 *
 * Security model:
 *   - JWT verified via user-scoped client → auth.getUser()
 *   - is_admin() RPC re-check with SET search_path = public, auth
 *   - Recipients list is trusted from an admin caller — no per-recipient
 *     validation beyond regex + max 50
 *   - Rate limit: caller-side responsibility (Zoho typical is 50/hr on
 *     free, 200/hr on paid tiers — burst above and Zoho throttles)
 */

import { createClient } from 'npm:@supabase/supabase-js@2';
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const ANON_KEY     = Deno.env.get('SUPABASE_ANON_KEY')!;

const FROM_ADDRESS = 'hello@zaeli.ai';
const FROM_NAME    = 'Zaeli';
const TO_ADDRESS   = 'signups@zaeli.ai'; // mailing-list style, real recipients are BCC
const SMTP_HOST    = 'smtp.zoho.com.au';
const SMTP_PORT    = 465;
const MAX_PER_BATCH = 50;

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

function isEmail(s: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json(405, { error: 'method not allowed' });

  const authHeader = req.headers.get('Authorization') || '';
  if (!authHeader.startsWith('Bearer ')) return json(401, { error: 'missing bearer token' });
  const jwt = authHeader.slice(7);

  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userRes, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userRes?.user) return json(401, { error: 'invalid session' });
  const callerEmail = userRes.user.email || '';

  const { data: isAdminData, error: isAdminErr } = await userClient.rpc('is_admin');
  if (isAdminErr) return json(500, { error: 'admin check failed' });
  if (!isAdminData) return json(403, { error: 'not an admin' });

  let body: any;
  try { body = await req.json(); } catch { return json(400, { error: 'invalid json body' }); }

  const subject = String(body?.subject || '').trim();
  const bodyHtml = String(body?.body_html || '').trim();
  const rawRecipients: unknown = body?.recipients;

  if (!subject) return json(400, { error: 'missing subject' });
  if (!bodyHtml) return json(400, { error: 'missing body_html' });
  if (!Array.isArray(rawRecipients)) return json(400, { error: 'recipients must be an array' });

  const recipients = Array.from(new Set(
    rawRecipients
      .map(r => String(r || '').trim().toLowerCase())
      .filter(r => isEmail(r))
  ));
  if (!recipients.length) return json(400, { error: 'no valid recipients' });
  if (recipients.length > MAX_PER_BATCH) return json(400, { error: `too many recipients — max ${MAX_PER_BATCH} per invocation. Chunk client-side.` });

  const password = Deno.env.get('ZOHO_APP_PASSWORD');
  if (!password) return json(500, { error: 'server_not_configured — ZOHO_APP_PASSWORD not set' });

  const client = new SMTPClient({
    connection: {
      hostname: SMTP_HOST, port: SMTP_PORT, tls: true,
      auth: { username: FROM_ADDRESS, password },
    },
  });

  // Aug 26 fix — single recipient goes TO them directly (more personal for
  // welcome / one-off sends). Multi-recipient keeps BCC pattern (hides
  // other recipients' emails from each other + gets around Zoho's
  // anti-spoof block on TO=hello@zaeli.ai).
  const isSingle = recipients.length === 1;
  const mailPayload: any = {
    from:    `${FROM_NAME} <${FROM_ADDRESS}>`,
    subject,
    content: 'auto',
    html:    bodyHtml,
  };
  if (isSingle) {
    mailPayload.to = recipients[0];
  } else {
    mailPayload.to  = TO_ADDRESS;
    mailPayload.bcc = recipients;
  }

  // Aug 27 fix — even fire-and-forget close wasn't enough. The `await
  // client.send()` itself burns enough CPU (TLS handshake + auth + DATA
  // transmission of the HTML body) to trip the ~200ms budget and get the
  // worker killed before the response ships. Client saw HTTP 546 "failed"
  // reliably while the email actually delivered (Zoho Sent proved it).
  //
  // New approach: return 200 IMMEDIATELY, run SMTP in the background via
  // EdgeRuntime.waitUntil. Trade-off: we lose the ability to report a
  // genuine SMTP failure back to the client (rare — Zoho is stable). Rich
  // eyeballs Zoho Sent for delivery confirmation. This matches the pattern
  // any transactional email service uses (queue-and-forget, not sync send).
  const sendPromise = (async () => {
    try {
      await client.send(mailPayload);
      console.log(`[admin-announce] ${callerEmail} sent to ${recipients.length} recipient${isSingle ? ' (direct)' : 's (BCC)'}. Subject: ${subject}`);
    } catch (e: any) {
      console.error('[admin-announce] bg send failed:', e?.message || e);
    } finally {
      try { await client.close(); } catch {}
    }
  })();

  // Keep the isolate alive long enough for SMTP to finish. Supabase's
  // EdgeRuntime.waitUntil is not always reliable but it's the correct hook.
  try {
    // deno-lint-ignore no-explicit-any
    (globalThis as any).EdgeRuntime?.waitUntil?.(sendPromise);
  } catch { /* ignore — will still run to completion on best-effort basis */ }

  return json(200, { ok: true, sent: recipients.length, recipients_hash: hashList(recipients), queued: true });
});

function hashList(list: string[]): string {
  // Short deterministic tag for logging — first 8 chars of sha256-ish surrogate
  let h = 0;
  for (const s of list) for (let i = 0; i < s.length; i++) h = ((h * 31) + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}
