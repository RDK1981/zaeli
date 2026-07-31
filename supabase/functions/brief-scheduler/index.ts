/**
 * brief-scheduler — Session 32 v2 Phase 07
 *
 * Runs on cron (every 15 minutes via pg_cron). For each family whose
 * morning or evening brief time falls in the last 15 minutes AND
 * hasn't fired yet today for that window:
 *   1. Gather LIVE DATA (events, meals, shopping, tasks) same shape as
 *      client-side buildBriefContext
 *   2. Call Anthropic Sonnet with the brief system prompt
 *   3. Upsert to zaeli_briefs cache
 *   4. Send rich lockscreen push to every family adult with push token —
 *      the brief prose goes in the notification body so families read it
 *      on the lockscreen without opening the app
 *
 * Deploy:
 *   supabase functions deploy brief-scheduler
 *
 * Required secrets:
 *   ANTHROPIC_API_KEY — already set for anthropic-proxy
 *   SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY — auto-injected
 *
 * Schedule (pg_cron):
 *   See supabase-brief-scheduler.sql for the setup — runs every 15 min.
 *
 * Design notes:
 *   - Idempotent: checks zaeli_briefs for existing row before generating,
 *     no double-sends even if cron fires multiple times in a window.
 *   - Time zone: uses Australia/Brisbane fixed for now (matches project
 *     dev context). When we go multi-region, move to profile.timezone.
 *   - Push body carries the [BODY] paragraph of the brief text, so users
 *     read a meaningful preview on lockscreen without opening.
 */

import { createClient } from 'npm:@supabase/supabase-js@2';

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const SONNET_MODEL = 'claude-sonnet-4-6';

// Fixed to Brisbane for v1 — swap to per-profile timezone later.
const TZ = 'Australia/Brisbane';

interface FamilyToBrief {
  familyId: string;
  window:   'morning' | 'evening';
  primaryUser: string;
  scheduledAt: string;  // human "07:00" for logging
}

// ── Handler ─────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const started = Date.now();
  const results: any[] = [];

  try {
    // Session 32 v2 — pg_cron POSTs here with no body. Occasional manual
    // testing via curl can pass { dry_run: true } to skip Anthropic + push.
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const dryRun = !!body?.dry_run;

    // 1. Find families whose brief time falls in the last 15 minutes.
    // profiles.user_preferences JSONB stores briefMorningTime/briefEveningTime
    // as "HH:MM" strings. We compare against current local time in TZ.
    const now = new Date();
    const localHM = new Intl.DateTimeFormat('en-AU', {
      timeZone: TZ, hour12: false, hour: '2-digit', minute: '2-digit',
    }).format(now);  // "07:03"

    const [nowH, nowM] = localHM.split(':').map(Number);
    const nowMinutes = nowH * 60 + nowM;

    // Fetch all owner/adult profiles + prefs. Server-side, no RLS.
    const { data: profiles, error: pErr } = await supabaseAdmin
      .from('profiles')
      .select('id, family_id, name, user_preferences, kind')
      .in('kind', ['owner', 'adult']);
    if (pErr) return json({ error: 'profile query failed', detail: pErr.message }, 500);

    // Group by family (one brief per family per window per day)
    const familyPrimary: Record<string, { firstName: string; morningTime: string; eveningTime: string; morningOn: boolean; eveningOn: boolean }> = {};
    for (const p of profiles ?? []) {
      const prefs = (p.user_preferences as any) ?? {};
      const morningTime = typeof prefs.briefMorningTime === 'string' ? prefs.briefMorningTime : '07:00';
      const eveningTime = typeof prefs.briefEveningTime === 'string' ? prefs.briefEveningTime : '17:00';
      const morningOn = prefs.briefMorningOn !== false;
      const eveningOn = prefs.briefEveningOn !== false;
      // Owner wins as primary; else first adult
      const existing = familyPrimary[p.family_id];
      if (!existing || p.kind === 'owner') {
        const first = (p.name ?? 'Rich').split(/\s+/)[0];
        familyPrimary[p.family_id] = { firstName: first, morningTime, eveningTime, morningOn, eveningOn };
      }
    }

    const toBrief: FamilyToBrief[] = [];
    for (const [familyId, info] of Object.entries(familyPrimary)) {
      const morningTarget = parseHM(info.morningTime);
      const eveningTarget = parseHM(info.eveningTime);
      // Round A fix — wider firing window. Previously "< 15" meant only ONE
      // cron slot per brief time (the exact target minute) fired. If that
      // cron missed for any reason (Supabase pg_cron latency), the user got
      // no brief that day. New rule: fire if we're AT or PAST the target
      // by up to 45 minutes AND today's brief hasn't already been generated
      // (the idempotent check below prevents duplicates). Gives 3 cron slots
      // to succeed per brief window.
      const morningDelta = nowMinutes - morningTarget;
      const eveningDelta = nowMinutes - eveningTarget;
      if (info.morningOn && morningDelta >= 0 && morningDelta <= 45) {
        toBrief.push({ familyId, window: 'morning', primaryUser: info.firstName, scheduledAt: info.morningTime });
      }
      if (info.eveningOn && eveningDelta >= 0 && eveningDelta <= 45) {
        toBrief.push({ familyId, window: 'evening', primaryUser: info.firstName, scheduledAt: info.eveningTime });
      }
    }
    console.log(`[brief-scheduler] now_local=${localHM}, profiles_checked=${profiles?.length ?? 0}, families=${Object.keys(familyPrimary).length}, candidates=${toBrief.length}`);

    // 2. For each family+window, check if brief already generated today
    const todayKey = new Intl.DateTimeFormat('en-CA', {
      timeZone: TZ, year:'numeric', month:'2-digit', day:'2-digit'
    }).format(now);

    for (const f of toBrief) {
      const { data: existing } = await supabaseAdmin
        .from('zaeli_briefs')
        .select('id')
        .eq('family_id', f.familyId)
        .eq('date_key', todayKey)
        .eq('time_window', f.window)
        .maybeSingle();
      if (existing?.id) {
        results.push({ familyId: f.familyId, window: f.window, status: 'skipped_cached' });
        continue;
      }

      // 3. Gather LIVE DATA for the family
      const liveData = await gatherLiveData(f.familyId, todayKey);

      // 4. Call Anthropic Sonnet
      if (dryRun) {
        results.push({ familyId: f.familyId, window: f.window, status: 'dry_run', liveData });
        continue;
      }
      if (!ANTHROPIC_API_KEY) {
        results.push({ familyId: f.familyId, window: f.window, status: 'no_api_key' });
        continue;
      }

      let briefText = '';
      try {
        briefText = await generateBriefText(f.window, f.primaryUser, liveData);
      } catch (e:any) {
        results.push({ familyId: f.familyId, window: f.window, status: 'anthropic_failed', error: e?.message });
        continue;
      }

      // 5. Upsert to zaeli_briefs cache (client reads on chat open)
      const { error: upErr } = await supabaseAdmin
        .from('zaeli_briefs')
        .upsert({
          family_id:    f.familyId,
          date_key:     todayKey,
          time_window:  f.window,
          text:         briefText,
          chips:        [],
          data_signature: 'server-scheduled',
          generated_at: new Date().toISOString(),
        }, { onConflict: 'family_id,date_key,time_window' });
      if (upErr) {
        results.push({ familyId: f.familyId, window: f.window, status: 'upsert_failed', error: upErr.message });
        continue;
      }

      // 6. Send lockscreen push with the BODY paragraph of the brief
      const bodyPara = extractBodyParagraph(briefText);
      const pushResult = await sendBriefPush(f.familyId, f.window, bodyPara || briefText.slice(0, 300));
      results.push({
        familyId: f.familyId,
        window: f.window,
        status: pushResult.sent > 0 ? 'sent' : 'generated_but_no_push',
        briefLen: briefText.length,
        bodyLen: (bodyPara || briefText).length,
        push: pushResult,
      });
    }

    return json({
      ok: true,
      elapsed_ms: Date.now() - started,
      now_local: localHM,
      candidates: toBrief.length,
      results,
    });
  } catch (e:any) {
    console.error('[brief-scheduler] error:', e?.message);
    return json({ error: 'scheduler failed', detail: e?.message }, 500);
  }
});

// ── Helpers ─────────────────────────────────────────────────────────────
function parseHM(hm: string): number {
  const m = hm.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return 0;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

async function gatherLiveData(familyId: string, dateKey: string) {
  // Match the shape of client-side buildBriefContext — enough for Sonnet
  // to write a competent, honest brief. Empty domains omitted (invisible-
  // domain rule from Session 26 — don't invite Sonnet to nudge on missing
  // data).
  const tomorrowKey = new Date(new Date(dateKey + 'T00:00:00').getTime() + 24*3600*1000).toISOString().slice(0,10);

  const [evTodayRes, evTmwRes, mealRes, shopRes, tasksRes] = await Promise.all([
    supabaseAdmin.from('events').select('title,start_time,assignees').eq('family_id', familyId).eq('date', dateKey).order('start_time'),
    supabaseAdmin.from('events').select('title,start_time,assignees').eq('family_id', familyId).eq('date', tomorrowKey).order('start_time'),
    supabaseAdmin.from('meal_plans').select('meal_name').eq('family_id', familyId).eq('date', dateKey).limit(1),
    supabaseAdmin.from('shopping_items').select('id').eq('family_id', familyId).neq('checked', true),
    supabaseAdmin.from('personal_tasks').select('id, title').eq('family_id', familyId).eq('status', 'active').order('due_date', { ascending: true }).limit(5),
  ]);

  const shape: Record<string, any> = {};
  if ((evTodayRes.data ?? []).length) shape.today_events = evTodayRes.data;
  if ((evTmwRes.data ?? []).length)   shape.tomorrow_events = evTmwRes.data;
  if (mealRes.data?.[0]?.meal_name)   shape.tonight_meal = mealRes.data[0].meal_name;
  if ((shopRes.data ?? []).length)    shape.shopping_count = (shopRes.data ?? []).length;
  if ((tasksRes.data ?? []).length)   shape.open_tasks = tasksRes.data;
  return shape;
}

async function generateBriefText(window: 'morning' | 'evening', primaryUser: string, liveData: any): Promise<string> {
  // Compact prompt — mirrors the shape of lib/brief-generator.ts but simpler
  // (server-side doesn't need full parity — client-side is source of truth
  // for the interactive chat brief). Server brief is FOR PUSH — needs to be
  // short and self-contained.
  const openerHint = window === 'morning'
    ? 'Warm morning opener, then a body sentence about the day, then optionally one nudge.'
    : 'Reflective evening opener, then a body sentence about tomorrow, then optionally one nudge.';

  const system = `You are Zaeli — a warm, witty family AI. Write a brief for ${primaryUser}. Max 90 words.

FORMAT (strict 2-3 paragraphs):
[OPENER] one warm line
[BODY] 2 sentences naming what's coming (from LIVE DATA)
[ONE THING] optional single nudge (omit if nothing warrants)

INVISIBLE-DOMAIN RULE: if a domain isn't in LIVE DATA, it doesn't appear anywhere.
NEVER nudge to plan dinner. Never manufacture warmth.
1 emoji per paragraph max.
${openerHint}

Output plain text, no headers, no markdown.`;

  const userMsg = `LIVE DATA:\n${JSON.stringify(liveData, null, 2)}`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type':     'application/json',
      'x-api-key':        ANTHROPIC_API_KEY!,
      'anthropic-version':'2023-06-01',
    },
    body: JSON.stringify({
      model: SONNET_MODEL,
      max_tokens: 400,
      system,
      messages: [{ role: 'user', content: userMsg }],
    }),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Anthropic ${res.status}: ${txt.slice(0, 200)}`);
  }
  const j = await res.json();
  const text = j?.content?.[0]?.text ?? '';
  return String(text).trim();
}

function extractBodyParagraph(brief: string): string {
  const paras = brief.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  return paras[1] ?? paras[0] ?? brief;
}

async function sendBriefPush(familyId: string, window: 'morning' | 'evening', body: string): Promise<{ sent: number; failed: number; reason?: string; ticketErrors?: string[] }> {
  const { data: profiles, error: pErr } = await supabaseAdmin
    .from('profiles')
    .select('expo_push_token')
    .eq('family_id', familyId)
    .in('kind', ['owner', 'adult'])
    .not('expo_push_token', 'is', null);

  if (pErr) {
    console.error(`[brief-scheduler] family=${familyId} token query error:`, pErr.message);
    return { sent: 0, failed: 0, reason: 'token_query_failed' };
  }

  const tokens = (profiles ?? []).map(p => p.expo_push_token).filter(Boolean);
  console.log(`[brief-scheduler] family=${familyId} tokens_found=${tokens.length}`);
  if (tokens.length === 0) return { sent: 0, failed: 0, reason: 'no_registered_tokens' };

  const title = window === 'morning' ? '☀️ Morning brief from Zaeli' : '🌙 Evening brief from Zaeli';

  const messages = tokens.map(t => ({
    to:    t,
    title,
    body:  body.slice(0, 300),
    sound: 'default',
    data:  { type: 'brief', window },
  }));

  try {
    const r = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(messages),
    });
    if (!r.ok) {
      const txt = await r.text().catch(() => '');
      console.error(`[brief-scheduler] family=${familyId} Expo push API ${r.status}:`, txt.slice(0, 200));
      return { sent: 0, failed: tokens.length, reason: `expo_${r.status}` };
    }
    const j = await r.json();
    const tickets = (j?.data ?? []) as any[];
    const sent = tickets.filter(t => t?.status === 'ok').length;
    const failed = tickets.length - sent;
    const ticketErrors = tickets.filter(t => t?.status !== 'ok').map(t => t?.message ?? 'unknown').slice(0, 5);
    if (failed > 0) {
      console.error(`[brief-scheduler] family=${familyId} push errors:`, ticketErrors.join(' | '));
    }
    return { sent, failed, ticketErrors: failed > 0 ? ticketErrors : undefined };
  } catch (e:any) {
    console.error(`[brief-scheduler] family=${familyId} push threw:`, e?.message);
    return { sent: 0, failed: tokens.length, reason: `exception:${e?.message ?? 'unknown'}` };
  }
}

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
