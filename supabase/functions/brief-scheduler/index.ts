/**
 * brief-scheduler — Session 32 v2 Phase 07 · rewritten Build 54 (Session 36)
 *   for per-user brief generation.
 *
 * WHAT CHANGED (Build 54):
 *   Before: one brief per FAMILY per window per day, cached by (family, date,
 *     window). Every family adult received the same brief. Personal iCal
 *     events (privacy_scope='personal', imported_by_user_id=X) were INVISIBLE
 *     to the shared brief — Andy would see "clear day" while his iPhone
 *     Calendar was full of work meetings. Trust-breaking.
 *   Now: one brief per ADULT USER per window per day, cached by (family, user,
 *     date, window). Each adult gets a personalised brief that includes their
 *     own personal iCal events + all family shared events. Push goes only to
 *     that user's token.
 *
 * Runs on cron (every 15 minutes via pg_cron). For each adult profile whose
 * morning or evening brief time falls in the last 15 minutes AND hasn't
 * fired yet today for that window:
 *   1. Gather LIVE DATA (this user's events — personal + shared, meals,
 *      shopping, tasks, family reminders)
 *   2. Call Anthropic Sonnet with the brief system prompt
 *   3. Upsert to zaeli_briefs cache (keyed by family_id + user_id + date + window)
 *   4. Send rich lockscreen push to that user's device only
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
 * Migration prerequisite:
 *   supabase-zaeli-briefs-per-user.sql (adds user_id column + swaps unique
 *   constraint). MUST be run BEFORE deploying this version.
 *
 * Design notes:
 *   - Idempotent per-user: checks zaeli_briefs for existing row keyed on
 *     (family, user, date, window) before generating.
 *   - Time zone: uses Australia/Brisbane fixed for now.
 *   - Push body carries the [BODY] paragraph of the brief text.
 *   - Cost: 2× briefs per family with 2 adults. At beta scale (~5 families,
 *     mostly single-adult) negligible. Per-brief cost ~A$0.005 with caching.
 */

import { createClient } from 'npm:@supabase/supabase-js@2';

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const SONNET_MODEL = 'claude-sonnet-5';

// Fixed to Brisbane for v1 — swap to per-profile timezone later.
const TZ = 'Australia/Brisbane';

interface UserToBrief {
  userId:      string;
  familyId:    string;
  firstName:   string;
  window:      'morning' | 'evening';
  scheduledAt: string;  // human "07:00" for logging
  pushToken:   string | null;
}

// ── Handler ─────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const started = Date.now();
  const results: any[] = [];

  try {
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const dryRun = !!body?.dry_run;

    // 1. Find adults whose brief time falls in the last 45 minutes.
    // profiles.user_preferences JSONB stores briefMorningTime/briefEveningTime
    // as "HH:MM" strings. We compare against current local time in TZ.
    const now = new Date();
    const localHM = new Intl.DateTimeFormat('en-AU', {
      timeZone: TZ, hour12: false, hour: '2-digit', minute: '2-digit',
    }).format(now);  // "07:03"

    const [nowH, nowM] = localHM.split(':').map(Number);
    const nowMinutes = nowH * 60 + nowM;

    // Fetch all owner/adult profiles + prefs + push token. Server-side, no RLS.
    const { data: profiles, error: pErr } = await supabaseAdmin
      .from('profiles')
      .select('id, family_id, name, user_preferences, kind, created_at, expo_push_token')
      .in('kind', ['owner', 'adult']);
    if (pErr) return json({ error: 'profile query failed', detail: pErr.message }, 500);

    // Track fresh signups so the dormant gate below lets brand-new users
    // through even before their first api_log row exists.
    const freshFamilyIds = new Set<string>();
    const freshCutoffMs = Date.now() - 7 * 24 * 3600 * 1000;
    for (const p of profiles ?? []) {
      const createdMs = p.created_at ? new Date(p.created_at as string).getTime() : 0;
      if (createdMs >= freshCutoffMs) freshFamilyIds.add(p.family_id);
    }

    // Build the per-user brief candidate list. Each adult with brief times
    // set in their user_preferences produces up to 2 candidates (morning,
    // evening) if they fall in the firing window.
    const toBrief: UserToBrief[] = [];
    for (const p of profiles ?? []) {
      const prefs = (p.user_preferences as any) ?? {};
      const morningTime = typeof prefs.briefMorningTime === 'string' ? prefs.briefMorningTime : '07:00';
      const eveningTime = typeof prefs.briefEveningTime === 'string' ? prefs.briefEveningTime : '17:00';
      const morningOn = prefs.briefMorningOn !== false;
      const eveningOn = prefs.briefEveningOn !== false;

      const firstName = (p.name ?? 'there').split(/\s+/)[0];

      const morningTarget = parseHM(morningTime);
      const eveningTarget = parseHM(eveningTime);
      const morningDelta = nowMinutes - morningTarget;
      const eveningDelta = nowMinutes - eveningTarget;
      if (morningOn && morningDelta >= 0 && morningDelta <= 45) {
        toBrief.push({
          userId: p.id, familyId: p.family_id, firstName,
          window: 'morning', scheduledAt: morningTime,
          pushToken: p.expo_push_token ?? null,
        });
      }
      if (eveningOn && eveningDelta >= 0 && eveningDelta <= 45) {
        toBrief.push({
          userId: p.id, familyId: p.family_id, firstName,
          window: 'evening', scheduledAt: eveningTime,
          pushToken: p.expo_push_token ?? null,
        });
      }
    }
    console.log(`[brief-scheduler] now_local=${localHM}, profiles_checked=${profiles?.length ?? 0}, candidates=${toBrief.length}`);

    // 2. Compute today's date key
    const todayKey = new Intl.DateTimeFormat('en-CA', {
      timeZone: TZ, year:'numeric', month:'2-digit', day:'2-digit'
    }).format(now);

    // 3. Dormant-family gate. Skip briefs for families with no api_logs
    // activity in the last 7 days. Fresh families (any adult profile <7d
    // old) are exempt so brand-new signups get their first-ever brief.
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
    const activeFamilyIds = new Set<string>();
    {
      const familyIds = Array.from(new Set(toBrief.map(f => f.familyId)));
      if (familyIds.length) {
        const { data: activityRows } = await supabaseAdmin
          .from('api_logs')
          .select('family_id')
          .in('family_id', familyIds)
          .gte('created_at', sevenDaysAgo)
          .limit(500);
        (activityRows ?? []).forEach(r => activeFamilyIds.add(r.family_id));
      }
    }

    for (const f of toBrief) {
      // Dormant-family skip. Cheap early exit before any expensive work.
      // Fresh signups (family <7d old) exempt.
      if (!activeFamilyIds.has(f.familyId) && !freshFamilyIds.has(f.familyId)) {
        results.push({ userId: f.userId, familyId: f.familyId, window: f.window, status: 'skipped_dormant' });
        continue;
      }

      // Per-user idempotency check
      const { data: existing } = await supabaseAdmin
        .from('zaeli_briefs')
        .select('id')
        .eq('family_id', f.familyId)
        .eq('user_id', f.userId)
        .eq('date_key', todayKey)
        .eq('time_window', f.window)
        .maybeSingle();
      if (existing?.id) {
        results.push({ userId: f.userId, familyId: f.familyId, window: f.window, status: 'skipped_cached' });
        continue;
      }

      // Gather LIVE DATA for this user (personal events + family shared)
      const liveData = await gatherLiveData(f.userId, f.familyId, todayKey);

      if (dryRun) {
        results.push({ userId: f.userId, familyId: f.familyId, window: f.window, status: 'dry_run', liveData });
        continue;
      }
      if (!ANTHROPIC_API_KEY) {
        results.push({ userId: f.userId, familyId: f.familyId, window: f.window, status: 'no_api_key' });
        continue;
      }

      let briefText = '';
      try {
        briefText = await generateBriefText(f.window, f.firstName, liveData);
      } catch (e:any) {
        results.push({ userId: f.userId, familyId: f.familyId, window: f.window, status: 'anthropic_failed', error: e?.message });
        continue;
      }

      // Upsert to zaeli_briefs cache (per-user)
      const { error: upErr } = await supabaseAdmin
        .from('zaeli_briefs')
        .upsert({
          family_id:      f.familyId,
          user_id:        f.userId,
          date_key:       todayKey,
          time_window:    f.window,
          brief_text:     briefText,
          chips:          [],
          data_signature: 'server-scheduled',
          generated_at:   new Date().toISOString(),
        }, { onConflict: 'family_id,user_id,date_key,time_window' });
      if (upErr) {
        results.push({ userId: f.userId, familyId: f.familyId, window: f.window, status: 'upsert_failed', error: upErr.message });
        continue;
      }

      // Send lockscreen push to THIS user only
      const bodyPara = extractBodyParagraph(briefText);
      const pushResult = await sendUserPush(f.pushToken, f.window, bodyPara || briefText.slice(0, 300));
      results.push({
        userId: f.userId,
        familyId: f.familyId,
        window: f.window,
        status: pushResult.sent > 0 ? 'sent' : (f.pushToken ? 'generated_but_no_push' : 'generated_no_token'),
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

async function gatherLiveData(userId: string, familyId: string, dateKey: string) {
  // Per-user LIVE DATA (Build 54). Events are the split:
  //   - Family SHARED events (source IS NULL — Zaeli-authored; OR
  //     privacy_scope='shared' — imported iCal that a user has explicitly
  //     shared with the family)
  //   - This user's PERSONAL events (source='apple-ical' + imported_by_user_id
  //     = this user + privacy_scope='personal' — their imported iPhone
  //     calendar events)
  // Shopping/meals/tasks stay family-shared; family_reminders too (which
  // are already scoped to shared visibility only).
  //
  // Events include a `_source` field so the brief prompt can distinguish
  // "family calendar" from "your iPhone calendar" if it wants to. For MVP
  // Sonnet just treats them all as "your day" — mixed presentation is
  // fine, and matches how the user actually experiences their calendar.
  const tomorrowKey = new Date(new Date(dateKey + 'T00:00:00').getTime() + 24*3600*1000).toISOString().slice(0,10);

  // Two queries per day (today + tomorrow) — each fetches shared + this-user's-personal
  // in a single call using .or() so we don't double round-trip.
  //
  // Session 36 hotfix 3 (Build 54.3) — was 'shared', but the actual schema
  // convention (supabase-calendar-sync.sql line 32) uses 'family' for the
  // whole-family visibility scope. 'shared' isn't a valid privacy_scope value.
  // Fixed brief-scheduler + client toggle to use 'family'.
  const eventFilter = `and(source.is.null),and(privacy_scope.eq.family),and(source.eq.apple-ical,imported_by_user_id.eq.${userId},privacy_scope.eq.personal)`;

  const [evTodayRes, evTmwRes, mealRes, shopRes, tasksRes, membersRes, remRes] = await Promise.all([
    supabaseAdmin.from('events')
      .select('title,start_time,assignees,source,privacy_scope,imported_by_user_id')
      .eq('family_id', familyId)
      .eq('date', dateKey)
      .or(eventFilter)
      .order('start_time'),
    supabaseAdmin.from('events')
      .select('title,start_time,assignees,source,privacy_scope,imported_by_user_id')
      .eq('family_id', familyId)
      .eq('date', tomorrowKey)
      .or(eventFilter)
      .order('start_time'),
    supabaseAdmin.from('meal_plans').select('meal_name').eq('family_id', familyId).eq('date', dateKey).limit(1),
    supabaseAdmin.from('shopping_items').select('id').eq('family_id', familyId).neq('checked', true),
    supabaseAdmin.from('personal_tasks').select('id, title').eq('family_id', familyId).eq('status', 'active').order('due_date', { ascending: true }).limit(5),
    supabaseAdmin.from('family_members').select('id,name').eq('family_id', familyId),
    supabaseAdmin.from('reminders').select('id,title,remind_at,remind_on,visibility').eq('family_id', familyId).eq('status', 'active').eq('visibility', 'shared').limit(10),
  ]);

  const nameById = new Map<string, string>();
  for (const m of (membersRes.data ?? [])) {
    if (m?.id && m?.name) nameById.set(m.id, String(m.name).split(/\s+/)[0]);
  }
  const attachNames = (ev: any) => {
    const ids = Array.isArray(ev?.assignees) ? ev.assignees : [];
    const names = ids.map((id: any) => nameById.get(id) ?? '').filter(Boolean);
    const isPersonal = ev?.source === 'apple-ical' && ev?.privacy_scope === 'personal';
    return {
      title: ev.title,
      start_time: ev.start_time,
      assignees: names,
      _source: isPersonal ? 'iphone' : 'family',
    };
  };

  const shape: Record<string, any> = {};
  if ((evTodayRes.data ?? []).length) shape.today_events = (evTodayRes.data ?? []).map(attachNames);
  if ((evTmwRes.data ?? []).length)   shape.tomorrow_events = (evTmwRes.data ?? []).map(attachNames);
  if (mealRes.data?.[0]?.meal_name)   shape.tonight_meal = mealRes.data[0].meal_name;
  if ((shopRes.data ?? []).length)    shape.shopping_count = (shopRes.data ?? []).length;
  if ((tasksRes.data ?? []).length)   shape.open_tasks = tasksRes.data;
  if ((remRes.data ?? []).length)     shape.family_reminders = (remRes.data ?? []).map((r: any) => ({
    title: r.title, when: r.remind_at ?? r.remind_on ?? null,
  }));
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

WHOLE-DAY LENS — mix events from the shared family calendar (_source='family') and ${primaryUser}'s own iPhone calendar (_source='iphone') into a single coherent "your day" picture. Don't label them differently in the brief — Zaeli should treat them as one calendar from ${primaryUser}'s perspective.

Parents drive kids' events. Any event with a kid's name in "assignees" is something ${primaryUser} probably has to drive to, pick up from, or supervise. NEVER call the day "quiet" if there are events on. Name specifics from LIVE DATA — e.g. "<kid>'s soccer at 4" not "an event at 4". Use only real names from the data; never invent names.

Family reminders (if listed) are things a family member has already flagged — surface the most relevant one if it matters today.

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

// Build 54 (Session 36) — send push to a SINGLE user's token. Was
// sendBriefPush(familyId) which fanned out to every family adult with the
// same brief body. Now each user gets a brief written FOR them.
async function sendUserPush(pushToken: string | null, window: 'morning' | 'evening', body: string): Promise<{ sent: number; failed: number; reason?: string; ticketErrors?: string[] }> {
  if (!pushToken) return { sent: 0, failed: 0, reason: 'no_registered_token' };

  const title = window === 'morning' ? '☀️ Morning brief from Zaeli' : '🌙 Evening brief from Zaeli';

  const message = {
    to:    pushToken,
    title,
    body:  body.slice(0, 300),
    sound: 'default',
    data:  { type: 'brief', window },
  };

  try {
    const r = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify([message]),
    });
    if (!r.ok) {
      const txt = await r.text().catch(() => '');
      console.error(`[brief-scheduler] Expo push API ${r.status}:`, txt.slice(0, 200));
      return { sent: 0, failed: 1, reason: `expo_${r.status}` };
    }
    const j = await r.json();
    const tickets = (j?.data ?? []) as any[];
    const sent = tickets.filter(t => t?.status === 'ok').length;
    const failed = tickets.length - sent;
    const ticketErrors = tickets.filter(t => t?.status !== 'ok').map(t => t?.message ?? 'unknown').slice(0, 5);
    if (failed > 0) {
      console.error(`[brief-scheduler] push errors:`, ticketErrors.join(' | '));
    }
    return { sent, failed, ticketErrors: failed > 0 ? ticketErrors : undefined };
  } catch (e:any) {
    console.error(`[brief-scheduler] push threw:`, e?.message);
    return { sent: 0, failed: 1, reason: `exception:${e?.message ?? 'unknown'}` };
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
