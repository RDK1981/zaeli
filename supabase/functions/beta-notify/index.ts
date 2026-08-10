/**
 * beta-notify — Supabase Edge Function
 *
 * Fires two transactional emails when someone signs up for the beta on
 * the public website (zaeli.app):
 *
 *   1. Welcome email → the signup, confirming they're on the list.
 *   2. Notification email → Rich (hello@zaeli.ai), so he can send a
 *      TestFlight invite promptly (within 24hrs per current copy).
 *
 * Called AFTER the register_beta_signup RPC has already saved the row
 * to public.beta_signups. This lives as a separate call so if SMTP
 * fails, the signup is still captured — Rich can manually reach out.
 *
 * Client → POST { email, name } (no auth — website has no user session)
 * Function → sends both emails via Zoho SMTP + returns {ok}
 *
 * Deploy:
 *   supabase functions deploy beta-notify --no-verify-jwt
 *
 * Required secrets (set via `supabase secrets set`):
 *   ZOHO_APP_PASSWORD — App-Specific Password from Zoho Mail settings
 *                       (NOT your main Zoho login password)
 *
 * The FROM address (hello@zaeli.ai) + SMTP host (smtp.zoho.com.au) are
 * hardcoded — they're not sensitive and hardcoding keeps deploys simple.
 */

import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';

const FROM_ADDRESS   = 'hello@zaeli.ai';
const FROM_NAME      = 'Rich at Zaeli';
const NOTIFY_ADDRESS = 'hello@zaeli.ai';    // where Rich reads new-signup alerts
const SMTP_HOST      = 'smtp.zoho.com.au';
const SMTP_PORT      = 465;                 // SSL

// ── Handler ─────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json({ ok: false, error: 'Method not allowed' }, 405);
  }

  try {
    // 1. Parse + validate
    const payload = await req.json().catch(() => null);
    if (!payload || typeof payload !== 'object') {
      return json({ ok: false, error: 'Invalid JSON body' }, 400);
    }
    const emailRaw = String((payload as any).email ?? '').trim();
    const nameRaw  = String((payload as any).name  ?? '').trim();
    if (!emailRaw || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(emailRaw)) {
      return json({ ok: false, error: 'Invalid email' }, 400);
    }
    const email    = emailRaw.toLowerCase();
    const name     = nameRaw || null;
    const greeting = name ? `Hi ${firstName(name)},` : 'Hi,';

    // 2. SMTP client — cheap to open per invocation for our volume.
    const password = Deno.env.get('ZOHO_APP_PASSWORD');
    if (!password) {
      console.log('[beta-notify] ZOHO_APP_PASSWORD secret not set');
      return json({ ok: false, error: 'server_not_configured' }, 500);
    }

    const client = new SMTPClient({
      connection: {
        hostname: SMTP_HOST,
        port:     SMTP_PORT,
        tls:      true,
        auth: {
          username: FROM_ADDRESS,
          password,
        },
      },
    });

    // 3. Welcome email → the signup
    await client.send({
      from:    `${FROM_NAME} <${FROM_ADDRESS}>`,
      to:      email,
      subject: `You're on the Zaeli beta list ✓`,
      content: 'auto',
      html:    welcomeHtml(greeting),
    });

    // 4. Notification email → Rich
    await client.send({
      from:    `Zaeli signups <${FROM_ADDRESS}>`,
      to:      NOTIFY_ADDRESS,
      subject: `New Zaeli beta signup — ${email}`,
      content: 'auto',
      html:    notifyHtml(email, name),
    });

    await client.close();
    console.log(`[beta-notify] sent 2 emails for signup ${email}${name ? ` (${name})` : ''}`);
    return json({ ok: true });
  } catch (e: any) {
    console.log('[beta-notify] threw:', e?.message ?? String(e));
    return json({ ok: false, error: e?.message ?? 'unknown_error' }, 500);
  }
});

// ── Email templates ─────────────────────────────────────────────────────────

function welcomeHtml(greeting: string): string {
  return `
<div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;max-width:520px;margin:0 auto;color:#0A0A0A;line-height:1.55;font-size:16px;">
  <p style="font-size:36px;font-weight:800;letter-spacing:-1.5px;line-height:1;margin:0 0 16px;">z<span style="color:#A8D8F0;">a</span>el<span style="color:#A8D8F0;">i</span></p>
  <p style="margin:0 0 20px;">${greeting}</p>
  <p style="margin:0 0 20px;">Thanks for signing up to the Zaeli beta — you're on the list.</p>
  <p style="margin:0 0 20px;"><strong>What happens next:</strong> Rich will send you a TestFlight invite within 24 hours. One tap to install Zaeli on your iPhone.</p>
  <p style="margin:0 0 20px;">Beta users get the full app free for 3 months — no card, no strings. In return, we just ask for your honest feedback along the way.</p>
  <p style="margin:0 0 8px;">Talk soon,</p>
  <p style="margin:0;"><strong>Rich</strong><br>Zaeli · <a href="https://zaeli.app" style="color:#0A5C80;text-decoration:none;border-bottom:1px solid rgba(10,10,10,0.25);">zaeli.app</a></p>
  <p style="margin:32px 0 0;font-size:12px;color:rgba(10,10,10,0.45);">Made with 💛 in Australia. Reply to this email anytime.</p>
</div>
  `.trim();
}

function notifyHtml(email: string, name: string | null): string {
  const displayName = name ?? '(no name provided)';
  return `
<div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;max-width:520px;color:#0A0A0A;line-height:1.55;font-size:15px;">
  <p style="font-size:20px;font-weight:700;margin:0 0 16px;">New Zaeli beta signup 🎉</p>
  <table style="border-collapse:collapse;margin:0 0 20px;">
    <tr><td style="padding:4px 12px 4px 0;color:rgba(10,10,10,0.55);">Name</td><td style="padding:4px 0;"><strong>${escapeHtml(displayName)}</strong></td></tr>
    <tr><td style="padding:4px 12px 4px 0;color:rgba(10,10,10,0.55);">Email</td><td style="padding:4px 0;"><strong>${escapeHtml(email)}</strong></td></tr>
    <tr><td style="padding:4px 12px 4px 0;color:rgba(10,10,10,0.55);">Source</td><td style="padding:4px 0;">website</td></tr>
  </table>
  <p style="margin:0 0 8px;">Next step: send them a TestFlight invite within 24 hours.</p>
  <p style="margin:0;font-size:13px;color:rgba(10,10,10,0.45);">Full signup list in Supabase → beta_signups table.</p>
</div>
  `.trim();
}

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

function firstName(full: string): string {
  const first = full.trim().split(/\s+/)[0] ?? '';
  return first.charAt(0).toUpperCase() + first.slice(1);
}

function escapeHtml(s: string): string {
  return s
    .replaceAll('&',  '&amp;')
    .replaceAll('<',  '&lt;')
    .replaceAll('>',  '&gt;')
    .replaceAll('"',  '&quot;')
    .replaceAll("'",  '&#39;');
}
