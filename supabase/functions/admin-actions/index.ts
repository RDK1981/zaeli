/**
 * admin-actions — Supabase Edge Function (Session 33 · Admin Console v3 Batch 2)
 *
 * Server-side entry point for destructive admin actions the browser client
 * cannot do directly (no admin UPDATE policy on profiles for privilege reasons).
 *
 * Client → POST here with the caller's JWT + { action, ...payload }
 * Function → verifies JWT → verifies is_admin() → performs the mutation with
 *            SERVICE_ROLE so RLS is bypassed. Never returns the service key.
 *
 * Actions:
 *   grant_beta            { user_id, months }  — sets beta_end_date = now + months
 *   extend_beta           { user_id, months }  — bumps beta_end_date by months
 *                                                (from now if expired, else from current end)
 *   revoke_beta           { user_id }          — sets beta_end_date to now
 *   grant_beta_by_email   { email,   months }  — lookup owner by email, then grant
 *   mark_signup_invited   { signup_id }        — beta_signups.invited_at = now (no email)
 *   mark_signup_uninvited { signup_id }        — beta_signups.invited_at = null (undo)
 *   send_testflight_invite { signup_id }       — Batch 7: sends testflight-invite email
 *                                                via email-lifecycle + marks invited_at.
 *                                                Bridges gap between website signup + install.
 *   resend_welcome        { user_id }          — re-fire beta-notify style welcome email
 *   admin_whitelist_add   { email, notes? }    — add admin email to whitelist
 *   admin_whitelist_remove{ email }            — remove admin from whitelist
 *   run_lifecycle_sweep   { dry_run? }         — Batch 5: manually trigger email-lifecycle sweep
 *   delete_family         { family_id, confirm_name }
 *                                              — DESTRUCTIVE: iterates DELETE across every
 *                                                family-scoped table, deletes profiles rows,
 *                                                deletes the family row, then deletes matching
 *                                                auth.users. confirm_name must match the family
 *                                                name (case-insensitive). Returns per-table row
 *                                                counts. Cannot be undone.
 *
 * Batch 5 note: grant_beta / extend_beta / grant_beta_by_email now stamp
 * beta_start_date on FIRST grant (not on subsequent extends — start date
 * is preserved so lifecycle day-3/14 emails key off the true start). On
 * a fresh grant, welcome email fires immediately via email-lifecycle
 * send_template mode (fire-and-forget; won't block the grant response).
 *
 * Deploy:
 *   supabase functions deploy admin-actions
 *
 * Required secrets (auto-injected):
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * Security model:
 *   - JWT verified via user-scoped client → auth.getUser()
 *   - Admin check runs is_admin() through the SAME user client so the RPC
 *     evaluates auth.uid() correctly (SET search_path = public, auth applied).
 *   - Only after both checks pass do we switch to the service_role client.
 *   - Errors return generic messages to the client; details logged server-side.
 */

import { createClient } from 'npm:@supabase/supabase-js@2';
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

// SMTP config — must match email-lifecycle + beta-notify (all Zoho)
const FROM_ADDRESS = 'hello@zaeli.ai';
const FROM_NAME    = 'Zaeli';
const SMTP_HOST    = 'smtp.zoho.com.au';
const SMTP_PORT    = 465;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

function addMonthsIso(baseIso: string | null, months: number): string {
  const base = baseIso ? new Date(baseIso) : new Date();
  const now = new Date();
  // If expired, extend from NOW; otherwise extend from the existing end date
  const start = base.getTime() > now.getTime() ? base : now;
  const next = new Date(start);
  next.setMonth(next.getMonth() + months);
  return next.toISOString();
}

// ─────────────────────────────────────────────────────────────────
// Inline SMTP send. Replaces the previous fetch → email-lifecycle
// pattern that was hitting WORKER_RESOURCE_LIMIT (nested Edge
// Function invocations double the resource budget). Now admin-actions
// sends directly via Zoho SMTP in the same worker. One handshake,
// well within limits. Templates below are duplicated with the ones
// in email-lifecycle for the cron-fired versions — small trade-off
// for architectural simplicity + reliability.
// ─────────────────────────────────────────────────────────────────

function emailShell(inner: string): string {
  return `<div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;max-width:520px;margin:0 auto;color:#0A0A0A;line-height:1.55;font-size:16px;">` +
    `<p style="font-size:36px;font-weight:800;letter-spacing:-1.5px;line-height:1;margin:0 0 20px;">z<span style="color:#A8D8F0;">a</span>el<span style="color:#A8D8F0;">i</span></p>` +
    inner +
    `<p style="margin:32px 0 0;font-size:12px;color:rgba(10,10,10,0.45);">Made in Australia &middot; reply anytime &middot; <a href="https://zaeli.app" style="color:rgba(10,10,10,0.55);">zaeli.app</a></p>` +
    `</div>`;
}

// Batch 8 — rewritten copy per mockup. Signs off "Rich" personally so replies
// feel like they're going to a human. Assumes person is already installed
// (welcome fires post-install via the auto-grant DB trigger). TestFlight
// install button REMOVED from welcome — testflight-invite email has that job.
const WELCOME_BODY = emailShell(
  `<p style="margin:0 0 18px;">Hi there,</p>` +
  `<p style="margin:0 0 18px;">You&#39;re in &mdash; thank you. Being an early beta tester for a small AU-built app is a real thing to say yes to, and I don&#39;t take it lightly.</p>` +
  `<div style="background:rgba(240,220,128,0.35);border-left:3px solid #8B6914;padding:14px 18px;border-radius:6px;margin-bottom:18px;">` +
  `<p style="margin:0;"><strong>Your 3 months free start now.</strong> No card on file, no auto-renew &mdash; just the full app, on you, for the whole trial. If Zaeli sticks, it&#39;s A$6.99/month after that. If it doesn&#39;t, no drama.</p>` +
  `</div>` +
  `<p style="margin:0 0 18px;"><strong>What I actually need from you:</strong> honest feedback. Good, bad, weird, half-baked &mdash; all of it useful. The absolute best thing you can do is text me the moment something feels clunky, or reply to this email with a one-liner. I read every reply personally, no support desk.</p>` +
  `<p style="margin:0 0 18px;"><strong>Three things to try in the first day or two:</strong></p>` +
  `<ul style="margin:0 0 18px;padding-left:20px;">` +
  `<li style="margin-bottom:8px;"><strong>Tap the mic on the Home screen</strong> and say &ldquo;add tennis Tuesday at 5pm&rdquo; &mdash; that&#39;s the whole loop right there.</li>` +
  `<li style="margin-bottom:8px;"><strong>Snap a photo of a school newsletter</strong> from the chat bar. Zaeli reads it and adds every event to your calendar in one tap.</li>` +
  `<li style="margin-bottom:8px;"><strong>Invite your partner or older kids</strong> from More &rarr; Our Family. Then calendar, shopping, and reminders sync across everyone.</li>` +
  `</ul>` +
  `<p style="margin:0 0 18px;">Your morning and evening briefs will start landing on your lockscreen at times you can set in Settings. Read them there &mdash; most days you won&#39;t need to open the app.</p>` +
  `<p style="margin:0 0 18px;">Thanks again for being one of the first. Reply anytime.</p>` +
  `<p style="margin:0 0 4px;">Rich</p>` +
  `<p style="margin:0;color:rgba(10,10,10,0.55);font-size:14px;">Zaeli &middot; <a href="https://zaeli.app" style="color:rgba(10,10,10,0.55);">zaeli.app</a></p>`
);

// Testflight-invite — content unchanged, just sign-off changed to Rich for
// consistency with welcome + lifecycle emails.
const TESTFLIGHT_INVITE_BODY = emailShell(
  `<p style="margin:0 0 18px;">Hi there,</p>` +
  `<p style="margin:0 0 18px;">You&#39;re in &mdash; welcome to the Zaeli beta.</p>` +
  `<p style="margin:0 0 12px;"><strong>To install:</strong> tap the button below on your iPhone. If TestFlight isn&#39;t installed yet, the App Store will offer it first (free, 30 seconds).</p>` +
  `<p style="margin:0 0 24px;text-align:center;"><a href="https://testflight.apple.com/join/DspnjNvM" style="display:inline-block;background:#0A0A0A;color:#FFFFFF;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:600;font-size:15px;">Install Zaeli via TestFlight</a></p>` +
  `<p style="margin:0 0 18px;">Once installed, open Zaeli and create your account with the same email you used to sign up. Your <strong>3 months free</strong> starts the moment you&#39;re in.</p>` +
  `<p style="margin:0 0 18px;">Zaeli is a family productivity companion &mdash; calendar, shopping, reminders and a smart AI teammate that quietly knows your family&#39;s rhythms. iPhone-only for now.</p>` +
  `<p style="margin:0 0 18px;">Reply to this email anytime if you get stuck. I read every reply personally.</p>` +
  `<p style="margin:0 0 4px;">Rich</p>` +
  `<p style="margin:0;color:rgba(10,10,10,0.55);font-size:14px;">Zaeli &middot; <a href="https://zaeli.app" style="color:rgba(10,10,10,0.55);">zaeli.app</a></p>`
);

const INLINE_TEMPLATES: Record<string, { subject: string; body: string }> = {
  'welcome':           { subject: 'You\'re in - welcome to Zaeli',                 body: WELCOME_BODY },
  'testflight-invite': { subject: 'Your Zaeli beta invite - install on iPhone',    body: TESTFLIGHT_INVITE_BODY },
};

// Send email inline (same worker) + log to email_log.
//
// Fix (HTTP 546 diagnosis): SMTP handshake + Supabase client calls exceeded
// the ~200ms CPU budget per Supabase Edge Function invocation. Worker was
// being killed AFTER SMTP send but BEFORE email_log insert completed → dedup
// couldn't work → duplicate sends on retry.
//
// New pattern: dedup check first (cheap DB call). SMTP send + email_log
// insert + client.close() ALL run via EdgeRuntime.waitUntil so the response
// returns quickly. Caller doesn't wait for SMTP to complete. Log entries
// still land after response, dedup works for subsequent clicks.
//
// Trade-off: the returned {ok:true} means "queued for send" not "delivered".
// SMTP failures land in email_log with status='failed' for post-hoc audit.
// For our beta scale (dozens of families, low click rate), this is fine.
async function sendEmailInline(
  admin: any,
  opts: {
    templateId: 'welcome' | 'testflight-invite';
    email: string;
    userId?: string | null;
    triggeredBy: 'grant' | 'invite' | 'manual';
  },
): Promise<{ ok: boolean; error?: string; skipped?: boolean }> {
  const tpl = INLINE_TEMPLATES[opts.templateId];
  if (!tpl) return { ok: false, error: `unknown template: ${opts.templateId}` };

  // Dedup — CHEAP, do inline
  let dedupQuery = admin.from('email_log').select('id').eq('template_id', opts.templateId).limit(1);
  if (opts.userId) dedupQuery = dedupQuery.eq('recipient_user_id', opts.userId);
  else dedupQuery = dedupQuery.eq('recipient_email', opts.email);
  const { data: existing } = await dedupQuery;
  if (existing?.length) {
    return { ok: true, skipped: true };
  }

  const password = Deno.env.get('ZOHO_APP_PASSWORD');
  if (!password) return { ok: false, error: 'ZOHO_APP_PASSWORD not set' };

  // Insert email_log row FIRST (dedup guarantee) — subsequent clicks find the
  // row and skip. Uses status='queued' initially; updated to 'sent' or
  // 'failed' after the SMTP attempt.
  const { data: logRow, error: logErr } = await admin.from('email_log').insert({
    recipient_email: opts.email,
    recipient_user_id: opts.userId ?? null,
    template_id: opts.templateId,
    subject: tpl.subject,
    triggered_by: opts.triggeredBy,
    status: 'queued',
  }).select('id').maybeSingle();
  if (logErr) return { ok: false, error: `email_log insert failed: ${logErr.message}` };
  const logId = logRow?.id;

  // Batch 8 — SMTP send is AWAITED (not backgrounded via waitUntil, which
  // wasn't reliably completing in Supabase's Deno runtime — status stayed
  // 'queued' forever). Single SMTP handshake (~150ms CPU) + the dedup insert
  // above (~50ms) fits comfortably in the ~200ms CPU budget. Status update
  // + client.close() are fire-and-forget so they don't eat into the budget.
  const client = new SMTPClient({
    connection: {
      hostname: SMTP_HOST, port: SMTP_PORT, tls: true,
      auth: { username: FROM_ADDRESS, password },
    },
  });

  try {
    await client.send({
      from:    `${FROM_NAME} <${FROM_ADDRESS}>`,
      to:      opts.email,
      subject: tpl.subject,
      content: 'auto',
      html:    tpl.body,
    });
    // Fire-and-forget status update — best-effort, not blocking response
    if (logId) {
      admin.from('email_log').update({ status: 'sent' }).eq('id', logId)
        .then(() => {}, (e: any) => console.error('[admin-actions] status update failed:', e?.message));
    }
    // Fire-and-forget close
    client.close().catch(() => {});
    console.log(`[admin-actions] sent ${opts.templateId} → ${opts.email} (${opts.triggeredBy})`);
    return { ok: true };
  } catch (e: any) {
    const err = e?.message || String(e);
    if (logId) {
      admin.from('email_log').update({ status: 'failed', error: err }).eq('id', logId)
        .then(() => {}, () => {});
    }
    client.close().catch(() => {});
    console.error(`[admin-actions] send FAILED ${opts.templateId} → ${opts.email}: ${err}`);
    return { ok: false, error: err };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json(405, { error: 'method not allowed' });

  const authHeader = req.headers.get('Authorization') || '';
  if (!authHeader.startsWith('Bearer ')) return json(401, { error: 'missing bearer token' });
  const jwt = authHeader.slice(7);

  // ─────────────────────────────────────────────────────────────────
  // Batch 8 — SERVICE-ROLE BYPASS for internal DB-trigger calls.
  // The handle_new_user() Postgres trigger calls this endpoint via
  // pg_net when a new profile is created whose email matches an
  // invited beta_signups row. It uses service_role auth, so we skip
  // the user JWT + is_admin flow and only allow a small allowlist of
  // internal actions.
  // ─────────────────────────────────────────────────────────────────
  if (jwt === SERVICE_ROLE_KEY) {
    let body: any;
    try { body = await req.json(); } catch { return json(400, { error: 'invalid json body' }); }
    const action = String(body?.action || '').trim();
    if (action !== 'auto_send_welcome') {
      return json(403, { error: `service-role action not allowed: ${action}` });
    }
    const userId = String(body?.user_id || '').trim();
    if (!userId) return json(400, { error: 'missing user_id' });
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: prof, error: pErr } = await admin.from('profiles')
      .select('id, email, name').eq('id', userId).maybeSingle();
    if (pErr) return json(500, { error: pErr.message });
    if (!prof?.email) return json(404, { error: 'user not found or no email' });
    const result = await sendEmailInline(admin, {
      templateId: 'welcome',
      email: prof.email,
      userId: prof.id,
      triggeredBy: 'grant',
    });
    console.log(`[admin-actions] auto_send_welcome (DB trigger) → ${prof.email}. ok=${result.ok}, skipped=${!!result.skipped}`);
    return json(200, { ok: true, ...result, action });
  }

  // ── User-scoped client (for JWT verify + is_admin RPC) ──────────
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userRes, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userRes?.user) return json(401, { error: 'invalid session' });
  const callerId = userRes.user.id;
  const callerEmail = userRes.user.email || '';

  const { data: isAdminData, error: isAdminErr } = await userClient.rpc('is_admin');
  if (isAdminErr) {
    console.error('[admin-actions] is_admin RPC failed:', isAdminErr);
    return json(500, { error: 'admin check failed' });
  }
  if (!isAdminData) return json(403, { error: 'not an admin' });

  // ── Parse body ─────────────────────────────────────────────
  let body: any;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: 'invalid json body' });
  }
  const action = String(body?.action || '').trim();
  if (!action) return json(400, { error: 'missing action' });

  // ── Service-role client (bypasses RLS) ─────────────────────
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    if (action === 'grant_beta' || action === 'extend_beta') {
      const userId = String(body?.user_id || '').trim();
      const months = Math.max(1, Math.min(24, parseInt(body?.months, 10) || 0));
      if (!userId) return json(400, { error: 'missing user_id' });
      if (!months) return json(400, { error: 'invalid months' });

      // Read current beta_end_date + beta_start_date
      const { data: prof, error: rErr } = await admin.from('profiles')
        .select('id, email, name, kind, beta_end_date, beta_start_date, family_id')
        .eq('id', userId).maybeSingle();
      if (rErr) throw rErr;
      if (!prof) return json(404, { error: 'user not found' });
      if (prof.kind !== 'owner') return json(400, { error: 'target must be an owner' });

      const newEnd = action === 'extend_beta'
        ? addMonthsIso(prof.beta_end_date, months)
        : addMonthsIso(null, months); // fresh grant from now

      // Stamp beta_start_date if not already set (preserves first-grant
      // date across extends — lifecycle emails key off it)
      const updateFields: Record<string, unknown> = { beta_end_date: newEnd };
      const isFreshGrant = !prof.beta_start_date;
      if (isFreshGrant) updateFields.beta_start_date = new Date().toISOString();

      const { data: upd, error: uErr } = await admin.from('profiles')
        .update(updateFields)
        .eq('id', userId)
        .select('id, beta_end_date, beta_start_date').maybeSingle();
      if (uErr) throw uErr;
      if (!upd?.id) return json(500, { error: 'update returned no row (RLS?)' });

      console.log(`[admin-actions] ${callerEmail} → ${action} ${months}mo → ${prof.email} (${prof.id}). New end: ${upd.beta_end_date}. Fresh grant: ${isFreshGrant}`);

      // Auto-fire welcome ONLY on fresh grant (not extends). AWAITED so the
      // send completes before the response returns — otherwise the worker
      // dies before SMTP finishes (silent failure since Batch 5).
      let welcomeResult = null;
      if (isFreshGrant) {
        welcomeResult = await sendEmailInline(admin, {
          templateId: 'welcome',
          email: prof.email,
          userId: prof.id,
          triggeredBy: 'grant',
        });
      }

      return json(200, {
        ok: true, user_id: upd.id,
        beta_end_date: upd.beta_end_date, beta_start_date: upd.beta_start_date,
        action, welcome_sent: welcomeResult?.ok === true && !welcomeResult?.skipped,
        welcome_skipped: welcomeResult?.skipped === true,
        welcome_error: welcomeResult?.error,
      });
    }

    if (action === 'revoke_beta') {
      const userId = String(body?.user_id || '').trim();
      if (!userId) return json(400, { error: 'missing user_id' });
      const nowIso = new Date().toISOString();
      const { data: upd, error: uErr } = await admin.from('profiles')
        .update({ beta_end_date: nowIso })
        .eq('id', userId)
        .select('id, beta_end_date').maybeSingle();
      if (uErr) throw uErr;
      if (!upd?.id) return json(404, { error: 'user not found or update failed' });
      console.log(`[admin-actions] ${callerEmail} → revoke_beta → ${userId}`);
      return json(200, { ok: true, user_id: upd.id, beta_end_date: upd.beta_end_date, action });
    }

    if (action === 'grant_beta_by_email') {
      const email = String(body?.email || '').trim().toLowerCase();
      const months = Math.max(1, Math.min(24, parseInt(body?.months, 10) || 0));
      if (!email) return json(400, { error: 'missing email' });
      if (!months) return json(400, { error: 'invalid months' });

      // Case-insensitive lookup
      const { data: matches, error: sErr } = await admin.from('profiles')
        .select('id, email, name, kind, beta_end_date, beta_start_date')
        .ilike('email', email)
        .eq('kind', 'owner');
      if (sErr) throw sErr;
      if (!matches?.length) return json(404, { error: `no owner profile with email ${email}. Have they signed up yet?` });
      if (matches.length > 1) return json(400, { error: 'ambiguous — multiple matching profiles found' });

      const target = matches[0];
      const newEnd = addMonthsIso(target.beta_end_date, months);

      const updateFields: Record<string, unknown> = { beta_end_date: newEnd };
      const isFreshGrant = !target.beta_start_date;
      if (isFreshGrant) updateFields.beta_start_date = new Date().toISOString();

      const { data: upd, error: uErr } = await admin.from('profiles')
        .update(updateFields)
        .eq('id', target.id)
        .select('id, email, beta_end_date, beta_start_date').maybeSingle();
      if (uErr) throw uErr;
      if (!upd?.id) return json(500, { error: 'update returned no row' });

      console.log(`[admin-actions] ${callerEmail} → grant_beta_by_email ${months}mo → ${email}. Fresh grant: ${isFreshGrant}`);

      // Auto-fire welcome on fresh grant. AWAITED (see note in grant_beta).
      let welcomeResult = null;
      if (isFreshGrant) {
        welcomeResult = await sendEmailInline(admin, {
          templateId: 'welcome',
          email: target.email,
          userId: target.id,
          triggeredBy: 'grant',
        });
      }

      return json(200, {
        ok: true, user_id: upd.id, email: upd.email,
        beta_end_date: upd.beta_end_date, beta_start_date: upd.beta_start_date,
        action, welcome_sent: welcomeResult?.ok === true && !welcomeResult?.skipped,
        welcome_skipped: welcomeResult?.skipped === true,
        welcome_error: welcomeResult?.error,
      });
    }

    if (action === 'resend_welcome') {
      const userId = String(body?.user_id || '').trim();
      if (!userId) return json(400, { error: 'missing user_id' });
      const { data: prof, error: rErr } = await admin.from('profiles')
        .select('id, email, name, kind').eq('id', userId).maybeSingle();
      if (rErr) throw rErr;
      if (!prof) return json(404, { error: 'user not found' });
      if (!prof.email) return json(400, { error: 'user has no email' });

      const fnRes = await fetch(`${SUPABASE_URL}/functions/v1/beta-notify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'apikey': SERVICE_ROLE_KEY,
        },
        body: JSON.stringify({ email: prof.email, name: prof.name || null }),
      });
      const fnBody = await fnRes.json().catch(() => ({}));
      if (!fnRes.ok || !fnBody?.ok) {
        console.error('[admin-actions] resend_welcome beta-notify failed:', fnBody);
        return json(500, { error: fnBody?.error || `beta-notify HTTP ${fnRes.status}` });
      }
      console.log(`[admin-actions] ${callerEmail} → resend_welcome → ${prof.email}`);
      return json(200, { ok: true, user_id: prof.id, email: prof.email, action });
    }

    if (action === 'admin_whitelist_add') {
      const email = String(body?.email || '').trim().toLowerCase();
      const notes = String(body?.notes || '').trim() || null;
      if (!email) return json(400, { error: 'missing email' });
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json(400, { error: 'invalid email' });
      const { data: upsert, error: uErr } = await admin.from('admin_whitelist')
        .upsert({ email, notes }, { onConflict: 'email' })
        .select('email, notes').maybeSingle();
      if (uErr) throw uErr;
      console.log(`[admin-actions] ${callerEmail} → admin_whitelist_add → ${email}`);
      return json(200, { ok: true, email: upsert?.email, action });
    }

    if (action === 'admin_whitelist_remove') {
      const email = String(body?.email || '').trim().toLowerCase();
      if (!email) return json(400, { error: 'missing email' });
      if (email === callerEmail.toLowerCase()) return json(400, { error: 'cannot remove yourself from whitelist' });
      const { error: dErr } = await admin.from('admin_whitelist').delete().eq('email', email);
      if (dErr) throw dErr;
      console.log(`[admin-actions] ${callerEmail} → admin_whitelist_remove → ${email}`);
      return json(200, { ok: true, email, action });
    }

    if (action === 'delete_family') {
      const familyId = String(body?.family_id || '').trim();
      const confirmName = String(body?.confirm_name || '').trim().toLowerCase();
      if (!familyId) return json(400, { error: 'missing family_id' });
      if (!confirmName) return json(400, { error: 'missing confirm_name' });

      // Verify family exists + name matches (case-insensitive). Uses coalesce
      // to handle families with null name (derives "owner's family" fallback).
      const { data: fam, error: fErr } = await admin.from('families')
        .select('id, name').eq('id', familyId).maybeSingle();
      if (fErr) throw fErr;
      if (!fam) return json(404, { error: 'family not found' });

      // Resolve owner for name-fallback + auth cleanup
      const { data: members, error: mErr } = await admin.from('profiles')
        .select('id, email, name, kind').eq('family_id', familyId);
      if (mErr) throw mErr;
      const ownerRow = (members || []).find((m: any) => m.kind === 'owner');
      const derivedName = fam.name || (ownerRow?.name ? `${ownerRow.name}'s family` : '(unnamed)');
      if (derivedName.toLowerCase() !== confirmName) {
        return json(400, { error: `confirm_name mismatch. Expected "${derivedName}" (case-insensitive), got "${body?.confirm_name}"` });
      }

      // Tables to sweep. Order: dependents FIRST, family last, auth.users after.
      // Each wrapped so a missing table (schema drift) doesn't abort the whole run.
      const tablesFamilyScoped = [
        'events', 'todos', 'shopping_items', 'pantry_items', 'receipts',
        'meal_plans', 'recipes', 'reminders', 'notes', 'zaeli_briefs',
        'personal_tasks', 'kids_jobs', 'kids_rewards', 'kids_points_log',
        'kids_pending_approvals', 'kids_trivia_history',
        'conversation_memory', 'family_insights', 'family_milestones',
        'pattern_log', 'weekly_digests', 'api_logs', 'invite_tokens',
        'budget_expenses', 'income_streams', 'savings_goals',
        'family_members',
      ];

      const counts: Record<string, number | string> = {};
      for (const table of tablesFamilyScoped) {
        try {
          const { error: dErr, count } = await admin.from(table)
            .delete({ count: 'exact' }).eq('family_id', familyId);
          if (dErr) {
            counts[table] = `error: ${dErr.message}`;
            console.error(`[admin-actions] delete_family ${table}: ${dErr.message}`);
          } else {
            counts[table] = count || 0;
          }
        } catch (e: any) {
          counts[table] = `threw: ${e?.message || e}`;
        }
      }

      // budget_categories has line_items child — do children first
      try {
        const { data: cats } = await admin.from('budget_categories').select('id').eq('family_id', familyId);
        const catIds = (cats || []).map((c: any) => c.id);
        if (catIds.length) {
          const { count: liCount, error: liErr } = await admin.from('category_line_items')
            .delete({ count: 'exact' }).in('category_id', catIds);
          counts['category_line_items'] = liErr ? `error: ${liErr.message}` : (liCount || 0);
        } else {
          counts['category_line_items'] = 0;
        }
        const { count: cCount, error: cErr } = await admin.from('budget_categories')
          .delete({ count: 'exact' }).eq('family_id', familyId);
        counts['budget_categories'] = cErr ? `error: ${cErr.message}` : (cCount || 0);
      } catch (e: any) {
        counts['budget_categories'] = `threw: ${e?.message || e}`;
      }

      // email_log — nullable recipient_user_id, better to keep audit trail
      // for deleted families, so we skip it here.

      // Collect member user_ids BEFORE deleting profiles (need them for auth cleanup)
      const memberUserIds = (members || []).map((m: any) => m.id).filter(Boolean);

      // Delete profile rows
      try {
        const { count: pCount, error: pErr } = await admin.from('profiles')
          .delete({ count: 'exact' }).eq('family_id', familyId);
        counts['profiles'] = pErr ? `error: ${pErr.message}` : (pCount || 0);
      } catch (e: any) {
        counts['profiles'] = `threw: ${e?.message || e}`;
      }

      // Delete family row
      try {
        const { count: fdCount, error: fdErr } = await admin.from('families')
          .delete({ count: 'exact' }).eq('id', familyId);
        counts['families'] = fdErr ? `error: ${fdErr.message}` : (fdCount || 0);
      } catch (e: any) {
        counts['families'] = `threw: ${e?.message || e}`;
      }

      // Delete auth.users — releases the emails so they can sign up again
      const authResults: Record<string, string> = {};
      for (const uid of memberUserIds) {
        try {
          const { error: aErr } = await admin.auth.admin.deleteUser(uid);
          authResults[uid] = aErr ? `error: ${aErr.message}` : 'deleted';
        } catch (e: any) {
          authResults[uid] = `threw: ${e?.message || e}`;
        }
      }

      console.log(`[admin-actions] ${callerEmail} → delete_family → ${derivedName} (${familyId}). Counts:`, counts, 'Auth:', authResults);
      return json(200, {
        ok: true,
        family_id: familyId,
        family_name: derivedName,
        counts,
        auth_users_deleted: authResults,
        action,
      });
    }

    if (action === 'run_lifecycle_sweep') {
      const dryRun = !!body?.dry_run;
      const res = await fetch(`${SUPABASE_URL}/functions/v1/email-lifecycle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ mode: 'sweep', dry_run: dryRun }),
      });
      const fnBody = await res.json().catch(() => ({}));
      if (!res.ok) return json(res.status, { error: fnBody?.error || `HTTP ${res.status}` });
      console.log(`[admin-actions] ${callerEmail} → run_lifecycle_sweep (dry_run=${dryRun}) → sent=${fnBody?.sent ?? '?'} failed=${fnBody?.failed ?? '?'}`);
      return json(200, { ok: true, ...fnBody, action });
    }

    if (action === 'send_testflight_invite') {
      const signupId = String(body?.signup_id || '').trim();
      if (!signupId) return json(400, { error: 'missing signup_id' });
      const { data: sig, error: sErr } = await admin.from('beta_signups')
        .select('id, email, name').eq('id', signupId).maybeSingle();
      if (sErr) throw sErr;
      if (!sig) return json(404, { error: 'signup not found' });
      if (!sig.email) return json(400, { error: 'signup has no email' });

      // Aug 26 fix — mark invited_at FIRST (cheap DB op, ~50ms) so the queue
      // state is correct even if SMTP burns through the CPU budget below.
      // Previously the order was SMTP → update; worker died mid-SMTP + never
      // reached the update, leaving invited_at NULL while email had shipped.
      const { data: upd, error: uErr } = await admin.from('beta_signups')
        .update({ invited_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', signupId)
        .select('id, email, invited_at').maybeSingle();
      if (uErr) throw uErr;

      // Now the SMTP send (heavier). If this hits the CPU limit, at least
      // invited_at is committed and Rich can retry from the admin console.
      const emailResult = await sendEmailInline(admin, {
        templateId: 'testflight-invite',
        email: sig.email,
        userId: null,          // no profile yet — dedup by email
        triggeredBy: 'invite',
      });

      console.log(`[admin-actions] ${callerEmail} → send_testflight_invite → ${sig.email}. email_ok=${emailResult.ok}, skipped=${!!emailResult.skipped}`);
      return json(200, {
        ok: true,
        signup_id: signupId,
        email: sig.email,
        email_sent: emailResult.ok && !emailResult.skipped,
        already_sent: !!emailResult.skipped,
        email_error: emailResult.error,
        invited_at: upd?.invited_at,
        action,
      });
    }

    if (action === 'mark_signup_invited' || action === 'mark_signup_uninvited') {
      const signupId = String(body?.signup_id || '').trim();
      if (!signupId) return json(400, { error: 'missing signup_id' });
      const nextValue = action === 'mark_signup_invited' ? new Date().toISOString() : null;
      const { data: upd, error: uErr } = await admin.from('beta_signups')
        .update({ invited_at: nextValue, updated_at: new Date().toISOString() })
        .eq('id', signupId)
        .select('id, email, invited_at').maybeSingle();
      if (uErr) throw uErr;
      if (!upd?.id) return json(404, { error: 'signup not found' });
      console.log(`[admin-actions] ${callerEmail} → ${action} → ${upd.email} (${upd.id})`);
      return json(200, { ok: true, signup_id: upd.id, email: upd.email, invited_at: upd.invited_at, action });
    }

    return json(400, { error: `unknown action: ${action}` });
  } catch (e) {
    console.error('[admin-actions] mutation failed:', e);
    return json(500, { error: e?.message || 'internal error' });
  }
});
