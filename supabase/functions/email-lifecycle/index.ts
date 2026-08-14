/**
 * email-lifecycle — Supabase Edge Function (Session 33 · Admin Console v3 Batch 5)
 *
 * Two modes:
 *
 *   mode: 'sweep'          — daily cron path (default). Scans all beta users,
 *                            fires day-3 / day-14 / beta-ending emails to
 *                            those hitting the thresholds today. Logs every
 *                            send to email_log so nothing double-sends.
 *
 *   mode: 'send_template'  — immediate one-off. Called by admin-actions on
 *                            beta grant to fire the welcome email right away.
 *                            Payload: { mode: 'send_template', template_id,
 *                            user_id }.
 *
 * Auth: SERVICE_ROLE only. Verified via a strict compare of the caller's
 *       Bearer token against SUPABASE_SERVICE_ROLE_KEY. pg_cron passes it
 *       from the schedule; admin-actions passes it server-to-server.
 *       Anyone else → 401.
 *
 * Templates: hard-coded below. Kept in sync with admin/index.html manual
 * templates by convention — copy owner is Rich, changes rare. If they
 * diverge, admin console is authoritative for manual sends and this
 * file is authoritative for lifecycle sends.
 *
 * Deploy:
 *   supabase functions deploy email-lifecycle
 *
 * Required secrets (auto-injected):
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ZOHO_APP_PASSWORD
 *
 * Test locally / manually:
 *   curl -X POST 'https://rsvbzakyyrftezthlhtd.supabase.co/functions/v1/email-lifecycle' \
 *     -H 'Authorization: Bearer <SERVICE_ROLE_KEY>' \
 *     -H 'Content-Type: application/json' \
 *     -d '{"mode":"sweep","dry_run":true}'
 */

import { createClient } from 'npm:@supabase/supabase-js@2';
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';

const SUPABASE_URL      = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const FROM_ADDRESS = 'hello@zaeli.ai';
const FROM_NAME    = 'Zaeli';
const SMTP_HOST    = 'smtp.zoho.com.au';
const SMTP_PORT    = 465;

// Day thresholds for lifecycle. Tight ranges (day X exactly, not ≥X) so
// each user gets each email once. Combined with email_log dedup this is
// bulletproof.
const CHECKIN_DAYS_MIN = 3;   // day 3 or 4 (spans 2 days to survive a missed cron run)
const CHECKIN_DAYS_MAX = 4;
const TIPS_DAYS_MIN    = 14;
const TIPS_DAYS_MAX    = 15;
const ENDING_DAYS_MIN  = 13;  // beta ends in 13-14 days
const ENDING_DAYS_MAX  = 14;

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json(405, { error: 'method not allowed' });

  // Service-role check
  const authHeader = req.headers.get('Authorization') || '';
  if (!authHeader.startsWith('Bearer ')) return json(401, { error: 'missing bearer token' });
  const token = authHeader.slice(7);
  if (token !== SERVICE_ROLE_KEY) return json(401, { error: 'invalid service role token' });

  let body: any;
  try { body = await req.json(); } catch { body = {}; }
  const mode = String(body?.mode || 'sweep');
  const dryRun = !!body?.dry_run;

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (mode === 'send_template') {
    return await handleSendTemplate(admin, body, dryRun);
  }
  if (mode === 'sweep') {
    return await handleSweep(admin, dryRun);
  }
  return json(400, { error: `unknown mode: ${mode}` });
});

// ═══════════════════════════════════════════════════════════════════════
// SEND_TEMPLATE — immediate single-user fire (called by admin-actions grant)
// ═══════════════════════════════════════════════════════════════════════
// Batch 7 — accepts EITHER `user_id` (existing profile — original grant flow)
// OR `email` (raw email — for signup queue where the person hasn't installed
// + signed up yet, so no profile exists). Dedup by whichever we have.
// Also accepts optional `triggered_by` (default 'grant') so callers can tag
// the send source in email_log ('grant' | 'invite' | 'manual' | 'lifecycle').
async function handleSendTemplate(admin: any, body: any, dryRun: boolean) {
  const userId = String(body?.user_id || '').trim();
  const explicitEmail = String(body?.email || '').trim().toLowerCase();
  const templateId = String(body?.template_id || '').trim();
  const triggeredBy = String(body?.triggered_by || 'grant').trim();
  if (!userId && !explicitEmail) return json(400, { error: 'missing user_id or email' });
  if (!templateId) return json(400, { error: 'missing template_id' });
  const tpl = TEMPLATES[templateId];
  if (!tpl) return json(400, { error: `unknown template_id: ${templateId}` });

  // Resolve recipient email + optional profile id
  let recipientEmail = explicitEmail;
  let recipientUserId: string | null = null;
  let recipientName: string | null = null;

  if (userId) {
    const { data: prof, error: pErr } = await admin.from('profiles')
      .select('id, email, name').eq('id', userId).maybeSingle();
    if (pErr) return json(500, { error: pErr.message });
    if (!prof) return json(404, { error: 'user not found' });
    if (!prof.email) return json(400, { error: 'user has no email' });
    recipientEmail = prof.email;
    recipientUserId = prof.id;
    recipientName = prof.name;
  } else if (explicitEmail) {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(explicitEmail)) return json(400, { error: 'invalid email' });
    // Best-effort: also try to link to a profile if one exists (dedup smarter)
    const { data: prof } = await admin.from('profiles')
      .select('id, name').ilike('email', explicitEmail).limit(1).maybeSingle();
    if (prof) { recipientUserId = prof.id; recipientName = prof.name; }
  }

  // Dedup: check by whichever key we have. If both, either match blocks the send.
  let dedupQuery = admin.from('email_log').select('id').eq('template_id', templateId).limit(1);
  if (recipientUserId) dedupQuery = dedupQuery.eq('recipient_user_id', recipientUserId);
  else dedupQuery = dedupQuery.eq('recipient_email', recipientEmail);
  const { data: existing } = await dedupQuery;
  if (existing?.length) {
    return json(200, { ok: true, skipped: true, reason: 'already_sent', recipient_email: recipientEmail, template_id: templateId });
  }

  if (dryRun) {
    return json(200, { ok: true, dry_run: true, would_send_to: recipientEmail, template_id: templateId });
  }

  try {
    await sendOne(recipientEmail, tpl.subject, tpl.body);
    await admin.from('email_log').insert({
      recipient_email: recipientEmail,
      recipient_user_id: recipientUserId,
      template_id: templateId,
      subject: tpl.subject,
      triggered_by: triggeredBy,
      status: 'sent',
    });
    console.log(`[email-lifecycle] send_template ${templateId} → ${recipientEmail} (${triggeredBy})`);
    return json(200, { ok: true, sent_to: recipientEmail, template_id: templateId });
  } catch (e: any) {
    await admin.from('email_log').insert({
      recipient_email: recipientEmail,
      recipient_user_id: recipientUserId,
      template_id: templateId,
      subject: tpl.subject,
      triggered_by: triggeredBy,
      status: 'failed',
      error: e?.message || String(e),
    });
    return json(500, { error: e?.message || 'send failed', template_id: templateId });
  }
}

// ═══════════════════════════════════════════════════════════════════════
// SWEEP — daily cron, fires day-3/day-14/beta-ending for matching users
// ═══════════════════════════════════════════════════════════════════════
async function handleSweep(admin: any, dryRun: boolean) {
  const started = Date.now();
  const nowMs = Date.now();

  // Fetch all owner profiles with beta_start_date set
  const { data: profs, error: pErr } = await admin.from('profiles')
    .select('id, email, name, kind, beta_start_date, beta_end_date')
    .eq('kind', 'owner')
    .not('beta_start_date', 'is', null)
    .not('email', 'is', null);
  if (pErr) return json(500, { error: `profile scan failed: ${pErr.message}` });

  // Build the plan (each row = one candidate email to send)
  const plan: Array<{ user_id: string; email: string; name: string | null; template_id: string; reason: string; }> = [];
  for (const p of (profs || [])) {
    const startMs = new Date(p.beta_start_date).getTime();
    const endMs = p.beta_end_date ? new Date(p.beta_end_date).getTime() : null;
    const daysIn = Math.floor((nowMs - startMs) / 86400000);
    const daysUntilEnd = endMs != null ? Math.floor((endMs - nowMs) / 86400000) : null;

    if (daysIn >= CHECKIN_DAYS_MIN && daysIn <= CHECKIN_DAYS_MAX) {
      plan.push({ user_id: p.id, email: p.email, name: p.name, template_id: 'checkin-3day', reason: `day ${daysIn} in beta` });
    }
    if (daysIn >= TIPS_DAYS_MIN && daysIn <= TIPS_DAYS_MAX) {
      plan.push({ user_id: p.id, email: p.email, name: p.name, template_id: 'tips-14day', reason: `day ${daysIn} in beta` });
    }
    if (daysUntilEnd != null && daysUntilEnd >= ENDING_DAYS_MIN && daysUntilEnd <= ENDING_DAYS_MAX) {
      plan.push({ user_id: p.id, email: p.email, name: p.name, template_id: 'beta-ending', reason: `beta ends in ${daysUntilEnd}d` });
    }
  }

  // Dedup against email_log — skip anything already sent to this user
  const filtered = [];
  for (const item of plan) {
    const { data: prev } = await admin.from('email_log')
      .select('id').eq('recipient_user_id', item.user_id).eq('template_id', item.template_id).limit(1);
    if (prev?.length) continue;
    filtered.push(item);
  }

  if (dryRun) {
    return json(200, {
      ok: true, dry_run: true,
      candidates: plan.length,
      to_send: filtered.length,
      plan: filtered,
      elapsed_ms: Date.now() - started,
    });
  }

  // Actually send
  const results = { sent: 0, failed: 0, skipped: plan.length - filtered.length, errors: [] as string[] };
  for (const item of filtered) {
    const tpl = TEMPLATES[item.template_id];
    if (!tpl) { results.failed++; results.errors.push(`no template: ${item.template_id}`); continue; }
    try {
      await sendOne(item.email, tpl.subject, tpl.body);
      await admin.from('email_log').insert({
        recipient_email: item.email,
        recipient_user_id: item.user_id,
        template_id: item.template_id,
        subject: tpl.subject,
        triggered_by: 'lifecycle',
        status: 'sent',
      });
      results.sent++;
    } catch (e: any) {
      const err = e?.message || String(e);
      results.failed++; results.errors.push(`${item.email}: ${err}`);
      await admin.from('email_log').insert({
        recipient_email: item.email,
        recipient_user_id: item.user_id,
        template_id: item.template_id,
        subject: tpl.subject,
        triggered_by: 'lifecycle',
        status: 'failed',
        error: err,
      });
    }
  }

  console.log(`[email-lifecycle] sweep: sent=${results.sent} failed=${results.failed} skipped=${results.skipped}`);
  return json(200, { ok: true, ...results, elapsed_ms: Date.now() - started });
}

// ═══════════════════════════════════════════════════════════════════════
// SMTP send helper
// ═══════════════════════════════════════════════════════════════════════
async function sendOne(email: string, subject: string, html: string) {
  const password = Deno.env.get('ZOHO_APP_PASSWORD');
  if (!password) throw new Error('ZOHO_APP_PASSWORD not set');
  const client = new SMTPClient({
    connection: {
      hostname: SMTP_HOST, port: SMTP_PORT, tls: true,
      auth: { username: FROM_ADDRESS, password },
    },
  });
  try {
    await client.send({
      from:    `${FROM_NAME} <${FROM_ADDRESS}>`,
      to:      email,
      subject,
      content: 'auto',
      html,
    });
  } finally {
    try { await client.close(); } catch {}
  }
}

// ═══════════════════════════════════════════════════════════════════════
// TEMPLATES — flat strings (no indentation) so quoted-printable doesn't
// inject =20. Subject lines ASCII-only for the same reason (avoids
// RFC 2047 encoded-word wrapping in mail clients that render it raw).
// KEEP IN SYNC with admin/index.html by convention (both edit rarely).
// ═══════════════════════════════════════════════════════════════════════
function emailShell(inner: string): string {
  return `<div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;max-width:520px;margin:0 auto;color:#0A0A0A;line-height:1.55;font-size:16px;">` +
    `<p style="font-size:36px;font-weight:800;letter-spacing:-1.5px;line-height:1;margin:0 0 20px;">z<span style="color:#A8D8F0;">a</span>el<span style="color:#A8D8F0;">i</span></p>` +
    inner +
    `<p style="margin:32px 0 0;font-size:12px;color:rgba(10,10,10,0.45);">Made in Australia &middot; reply anytime &middot; <a href="https://zaeli.app" style="color:rgba(10,10,10,0.55);">zaeli.app</a></p>` +
    `</div>`;
}

// Batch 8 — rewritten copy per HTML mockup. All emails sign off "Rich"
// personally so replies feel human. Explicit feedback asks + AU voice.
// Kept in sync with admin-actions/index.ts inline templates.
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

const CHECKIN_3DAY_BODY = emailShell(
  `<p style="margin:0 0 18px;">Hi there,</p>` +
  `<p style="margin:0 0 18px;">Three days in &mdash; how&#39;s Zaeli feeling?</p>` +
  `<p style="margin:0 0 18px;">No pressure to reply with anything polished. Even a one-liner is genuinely useful. A few prompts if it helps:</p>` +
  `<div style="font-style:italic;color:rgba(10,10,10,0.72);padding-left:16px;border-left:3px solid #A8D8F0;margin-bottom:18px;">` +
  `&ldquo;The bit that actually worked well was ___&rdquo;<br>` +
  `&ldquo;The bit that felt clunky was ___&rdquo;<br>` +
  `&ldquo;What I couldn&#39;t figure out was ___&rdquo;<br>` +
  `&ldquo;What I wish it would do is ___&rdquo;` +
  `</div>` +
  `<p style="margin:0 0 18px;">If it&#39;s <strong>not clicking</strong>, tell me. That&#39;s more useful than polite silence &mdash; every single &ldquo;this bit is weird&rdquo; text I get shapes what I ship next week.</p>` +
  `<p style="margin:0 0 18px;">Two things worth trying if you haven&#39;t yet:</p>` +
  `<ul style="margin:0 0 18px;padding-left:20px;">` +
  `<li style="margin-bottom:8px;"><strong>Photo &rarr; calendar</strong>: snap a school note, invitation, or fixture list in the chat. Zaeli extracts every event.</li>` +
  `<li style="margin-bottom:8px;"><strong>Shared reminders</strong>: say &ldquo;remind Anna to pick up milk tomorrow at 3pm&rdquo;. It goes on her list too, not just yours.</li>` +
  `</ul>` +
  `<p style="margin:0 0 18px;">Cheers,</p>` +
  `<p style="margin:0 0 4px;">Rich</p>` +
  `<p style="margin:0;color:rgba(10,10,10,0.55);font-size:14px;">Zaeli &middot; <a href="https://zaeli.app" style="color:rgba(10,10,10,0.55);">zaeli.app</a></p>`
);

const TIPS_14DAY_BODY = emailShell(
  `<p style="margin:0 0 18px;">Hi there,</p>` +
  `<p style="margin:0 0 18px;">Two weeks in &mdash; thanks for sticking with it. A quick note on three habits I see from the families getting the most out of Zaeli:</p>` +
  `<ol style="margin:0 0 18px;padding-left:20px;">` +
  `<li style="margin-bottom:12px;"><strong>Voice-first on the go.</strong> The mic on the home screen is faster than opening any other app for adding stuff. Try it walking to the car, at pickup, in the aisle at Woolies. It becomes muscle memory quickly.</li>` +
  `<li style="margin-bottom:12px;"><strong>Read the brief on lockscreen, don&#39;t open the app.</strong> Around your morning brief time, a push lands with the full day&#39;s shape &mdash; meals, events, one nudge. Read it there and get on with your day. Zero-friction glance.</li>` +
  `<li style="margin-bottom:12px;"><strong>Actually share with your partner.</strong> If they&#39;re still on Notes or the iCloud Calendar and you&#39;re on Zaeli, half the value is lost. More &rarr; Our Family &rarr; invite. Takes 90 seconds and unlocks the whole point.</li>` +
  `</ol>` +
  `<p style="margin:0 0 18px;"><strong>Bonus:</strong> reminders can be personal (just you) OR shared (whole family). Say &ldquo;remind me to grab milk&rdquo; vs &ldquo;remind us bins out tonight&rdquo; &mdash; Zaeli picks up on the difference.</p>` +
  `<p style="margin:0 0 18px;"><strong>Halfway through the beta &mdash; how&#39;s it holding up?</strong> If there&#39;s a feature you wish existed, or one that&#39;s clunky enough to be worth mentioning, hit reply. I&#39;m still adjusting a lot based on what real families tell me.</p>` +
  `<p style="margin:0 0 18px;">Talk soon,</p>` +
  `<p style="margin:0 0 4px;">Rich</p>` +
  `<p style="margin:0;color:rgba(10,10,10,0.55);font-size:14px;">Zaeli &middot; <a href="https://zaeli.app" style="color:rgba(10,10,10,0.55);">zaeli.app</a></p>`
);

const BETA_ENDING_BODY = emailShell(
  `<p style="margin:0 0 18px;">Hi there,</p>` +
  `<p style="margin:0 0 18px;">Quick heads up &mdash; your Zaeli beta ends in <strong>2 weeks</strong>. First, thanks. Being one of the earliest families to trust an unfinished app is a genuinely generous thing to do, and it&#39;s shaped what Zaeli is today more than you probably realise.</p>` +
  `<p style="margin:0 0 18px;"><strong>Two paths from here:</strong></p>` +
  `<div style="background:rgba(240,220,128,0.35);border-left:3px solid #8B6914;padding:14px 18px;border-radius:6px;margin-bottom:18px;">` +
  `<p style="margin:0;"><strong>Stay on:</strong> Zaeli is A$6.99/month, tax-inclusive. Whole family plan. Nothing extra to pay per kid. Cancel anytime from Settings. To subscribe: open the app &rarr; Settings &rarr; Subscribe.</p>` +
  `</div>` +
  `<p style="margin:0 0 18px;"><strong>Not for you:</strong> completely fine. Zaeli will stop working for you when the beta ends &mdash; no card was ever saved, no auto-charge. But before you go, I&#39;d love one last favour: <strong>tell me why</strong>. A one-line reply saying &ldquo;it didn&#39;t stick because ___&rdquo; is worth more to me than any five-star review. Genuinely, that shapes what I fix.</p>` +
  `<p style="margin:0 0 18px;"><strong>Either way &mdash; thank you.</strong> Testing something raw takes patience and I don&#39;t forget it. If you know another family who might get something out of Zaeli, forwarding this email or sharing <a href="https://zaeli.app">zaeli.app</a> is the highest compliment.</p>` +
  `<p style="margin:0 0 4px;">Rich</p>` +
  `<p style="margin:0;color:rgba(10,10,10,0.55);font-size:14px;">Zaeli &middot; <a href="https://zaeli.app" style="color:rgba(10,10,10,0.55);">zaeli.app</a></p>`
);

// Batch 7 — TestFlight invite email. Fires when Rich clicks "Send TestFlight
// invite" on a signup queue row. Bridges the gap between website signup and
// actual install (previously the person got Apple's generic invite with no
// Zaeli context — this one carries the Zaeli voice + clear install steps).
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

const TEMPLATES: Record<string, { subject: string; body: string }> = {
  'welcome':           { subject: 'You\'re in - welcome to Zaeli',                      body: WELCOME_BODY },
  'testflight-invite': { subject: 'Your Zaeli beta invite - install on iPhone',         body: TESTFLIGHT_INVITE_BODY },
  'checkin-3day':      { subject: 'How is it going so far?',                            body: CHECKIN_3DAY_BODY },
  'tips-14day':        { subject: 'Two weeks in - a few things you might have missed',  body: TIPS_14DAY_BODY },
  'beta-ending':       { subject: 'Your Zaeli beta ends in 2 weeks',                    body: BETA_ENDING_BODY },
};
