/**
 * lib/calendar-sync.ts — iCal two-way sync (Build 49+ Read-in path)
 *
 * Andy asked for two-way sync between iPhone Calendar and Zaeli. This is
 * the CLIENT side of the sync engine. Backing schema: supabase-calendar-sync.sql
 * (events.privacy_scope + external_id + imported_by_user_id + calendar_sync_config).
 *
 * DESIGN DECISIONS (Session 34, locked with Rich):
 *   - Per-user external sync — Andy's iPhone events show ONLY for Andy in
 *     Zaeli (privacy_scope='personal', imported_by_user_id=Andy). Anna
 *     doesn't see Andy's work meetings via RLS.
 *   - Opt-in per calendar — user picks which of their 8+ iOS calendars to
 *     sync via Settings UI. Config persisted in calendar_sync_config JSONB.
 *   - Store in Supabase — enables Sonnet brief to reference external events
 *     ("Dentist at 3pm — leave by 2:45") and cross-device consistency.
 *   - Full two-way (Build 49 = read-in only; write-back in Build 50).
 *
 * BUILD 49 SCOPE (this file):
 *   - Permission request (handle iOS 17+ two-tier — limited access grants OK)
 *   - listUserCalendars() — reads user's iOS calendars via expo-calendar
 *   - loadSyncConfig() / saveSyncConfig() — persist user's per-calendar
 *     toggles to calendar_sync_config table
 *   - syncNow() — main read-in engine. For each enabled calendar:
 *       * Fetch events in a rolling window (-30 days to +90 days)
 *       * Upsert to events table (source='apple-ical', external_id set,
 *         privacy_scope='personal', imported_by_user_id=userId,
 *         assignees=[user's family_members id])
 *       * Delete stale rows (external_id no longer present in iOS =
 *         user deleted from iPhone Calendar = mirror the delete)
 *
 * BUILD 50 (not yet):
 *   - createZaeliCalendar() — creates a dedicated "Zaeli" EventKit calendar
 *   - mirrorToEventKit() — writes Zaeli events into the Zaeli calendar
 *
 * BUILD 51 (not yet):
 *   - Delta detection on user edits in iPhone Calendar
 *   - Deletion propagation both ways
 *   - Recurring RRULE mapping
 *   - Android parity via expo-calendar's Android path
 */

import * as Calendar from 'expo-calendar';
import { supabase } from './supabase';
import { getRoster, getMemberByName } from './family-roster';
import { getProfile } from './auth';

// ─────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────

export interface ExternalCalendar {
  id: string;              // EventKit identifier
  title: string;           // "iCloud", "Work", "Kids school" etc.
  color: string;           // hex #RRGGBB (calendar's own colour on iOS)
  source: string;          // "iCloud", "Local", "Subscribed", etc.
  allowsModifications: boolean;
  sync_enabled: boolean;   // user's per-calendar toggle
}

export interface SyncConfig {
  user_id: string;
  family_id: string;
  external_calendars: ExternalCalendar[];
  zaeli_calendar_id: string | null;
  sync_enabled: boolean;
  permission_granted: boolean;
  last_synced_at: string | null;
  mirror_schema_version?: number;
}

// Version marker for the mirror logic. Bump this whenever we ship a fix
// that requires re-mirroring existing users' Zaeli events. On sync, if a
// user's stored mirror_schema_version < this constant → auto-wipe their
// mirrored events (Supabase mirrored_apple_id → null + delete EventKit
// events in Zaeli calendar) and re-mirror fresh with current code. Bumps
// once per fix that changes what/how we write to EventKit.
//
//   0 = pre-Build-52 (users installed Build 49/50/51 with the timezone bug
//       + no update/delete propagation)
//   1 = Build 52 (timezone fixed, update/delete propagation via reconciliation)
export const MIRROR_SCHEMA_VERSION = 1;

export type PermissionStatus =
  | 'granted'          // Full access — read + write
  | 'limited'          // iOS 17+ user picked a subset of calendars
  | 'denied'           // Explicitly denied
  | 'undetermined';    // Not asked yet

// ─────────────────────────────────────────────────────────────────────────
// Permission handling
// ─────────────────────────────────────────────────────────────────────────

// iOS 17+ introduced write-only vs full-access permissions. We need full
// access for two-way sync. On <17, calendars permission grants both.
export async function requestCalendarPermission(): Promise<PermissionStatus> {
  try {
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    // expo-calendar returns 'granted' when user grants full access on <17
    // OR when user picks calendars on iOS 17+ (limited). 'undetermined'
    // means the modal was dismissed without a choice.
    if (status === 'granted') return 'granted';
    if (status === 'denied') return 'denied';
    return 'undetermined';
  } catch (e: any) {
    console.log('[calendar-sync] permission request threw:', e?.message);
    return 'denied';
  }
}

export async function getCurrentPermission(): Promise<PermissionStatus> {
  try {
    const { status } = await Calendar.getCalendarPermissionsAsync();
    if (status === 'granted') return 'granted';
    if (status === 'denied') return 'denied';
    return 'undetermined';
  } catch {
    return 'undetermined';
  }
}

// ─────────────────────────────────────────────────────────────────────────
// List user calendars (from iOS EventKit)
// ─────────────────────────────────────────────────────────────────────────

// Reads the user's iOS calendars and merges with saved sync_enabled flags
// from calendar_sync_config. Newly-seen calendars default to sync_enabled=false
// (opt-in — user must explicitly tick each one).
export async function listUserCalendars(userId: string): Promise<ExternalCalendar[]> {
  try {
    const cals = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    const config = await loadSyncConfig(userId);
    const savedEnabledMap: Record<string, boolean> = {};
    (config?.external_calendars ?? []).forEach(c => {
      savedEnabledMap[c.id] = !!c.sync_enabled;
    });

    return cals
      // Skip Zaeli's own calendar if it exists (added Build 50)
      .filter(c => c.title !== 'Zaeli')
      .map(c => ({
        id: c.id,
        title: c.title || 'Untitled',
        color: c.color || '#4D8BFF',
        source: (c as any).source?.name || (c as any).source?.type || 'Local',
        allowsModifications: c.allowsModifications !== false,
        sync_enabled: !!savedEnabledMap[c.id],
      }))
      .sort((a, b) => a.title.localeCompare(b.title));
  } catch (e: any) {
    console.log('[calendar-sync] listUserCalendars threw:', e?.message);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Sync config persistence
// ─────────────────────────────────────────────────────────────────────────

export async function loadSyncConfig(userId: string): Promise<SyncConfig | null> {
  try {
    const { data, error } = await supabase
      .from('calendar_sync_config')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) {
      console.log('[calendar-sync] loadSyncConfig error:', error.message);
      return null;
    }
    return (data ?? null) as SyncConfig | null;
  } catch {
    return null;
  }
}

// Upsert config. RLS enforces user_id = auth.uid() so a user can only
// touch their own row.
export async function saveSyncConfig(
  userId: string,
  familyId: string,
  patch: Partial<Omit<SyncConfig, 'user_id' | 'family_id'>>,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const now = new Date().toISOString();
    const row = {
      user_id: userId,
      family_id: familyId,
      ...patch,
      updated_at: now,
    };
    const { error } = await supabase
      .from('calendar_sync_config')
      .upsert(row, { onConflict: 'user_id' });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? 'unknown' };
  }
}

// Convenience — toggle one calendar's sync_enabled flag + save.
export async function setCalendarSyncEnabled(
  userId: string,
  familyId: string,
  calendarId: string,
  enabled: boolean,
): Promise<{ ok: boolean; error?: string }> {
  const current = await loadSyncConfig(userId);
  const cals = current?.external_calendars ?? [];
  const nextCals = cals.map(c => c.id === calendarId ? { ...c, sync_enabled: enabled } : c);
  // If the calendar wasn't in the saved list yet (first-time toggle), we
  // need to look it up from iOS to include it. Cheaper: caller passes
  // the FULL list of calendars from listUserCalendars(), so patch behind
  // the scenes with the FULL list here to keep the JSONB in sync.
  const allFromDevice = await listUserCalendars(userId);
  const merged = allFromDevice.map(c => ({
    ...c,
    sync_enabled: c.id === calendarId ? enabled : (nextCals.find(x => x.id === c.id)?.sync_enabled ?? false),
  }));
  return await saveSyncConfig(userId, familyId, { external_calendars: merged });
}

// ─────────────────────────────────────────────────────────────────────────
// Sync now — main read-in engine
// ─────────────────────────────────────────────────────────────────────────

// Time window for the pull. Wide enough to catch upcoming stuff + recent
// history for the brief context.
const WINDOW_BACK_DAYS = 30;
const WINDOW_FORWARD_DAYS = 90;

// Build 54 (Session 36) — in-flight guard. Rich hit a nasty flicker: mount
// fires syncNow AND every foreground transition fires syncNow, with no
// debounce or reentrancy guard. Concurrent syncs raced through the DELETE
// step (below) → events flickered between deleted and re-created every open.
// Fix: coalesce concurrent syncNow calls per-user. Second caller gets the
// same promise the first is already awaiting. NO extra Supabase round-trips.
const _syncInFlight = new Map<string, Promise<SyncNowResult>>();

type SyncNowResult = {
  ok: boolean;
  inserted: number;
  updated: number;
  deleted: number;
  perCalendar: Array<{ id: string; title: string; count: number }>;
  error?: string;
};

// Fetch events from enabled iOS calendars → upsert to Supabase events
// table. Returns per-calendar counts + total inserted/updated/deleted.
export async function syncNow(userId: string, familyId: string): Promise<SyncNowResult> {
  // In-flight guard — coalesce concurrent calls per user.
  const inFlight = _syncInFlight.get(userId);
  if (inFlight) {
    console.log('[calendar-sync] syncNow already in-flight for user', userId, '— reusing promise');
    return inFlight;
  }
  const p = _syncNowImpl(userId, familyId).finally(() => {
    _syncInFlight.delete(userId);
  });
  _syncInFlight.set(userId, p);
  return p;
}

async function _syncNowImpl(userId: string, familyId: string): Promise<SyncNowResult> {
  try {
    // 1. Permission check
    const perm = await getCurrentPermission();
    if (perm !== 'granted') {
      return { ok: false, inserted: 0, updated: 0, deleted: 0, perCalendar: [], error: 'no permission' };
    }

    // 2. Load enabled calendars from config
    const config = await loadSyncConfig(userId);
    const enabledCals = (config?.external_calendars ?? []).filter(c => c.sync_enabled);
    if (enabledCals.length === 0) {
      return { ok: true, inserted: 0, updated: 0, deleted: 0, perCalendar: [], error: 'no calendars enabled' };
    }

    // 3. External events don't get an assignee. Rich reported that stamping
    // himself as assignee made his "R" avatar sit on every event AND hid
    // the "📱 iPhone" badge. Cleaner: empty assignees — the badge alone
    // tells the user which calendar the event came from.
    const assignees: string[] = [];

    // 4. Fetch events for the window from each enabled calendar
    const start = new Date();
    start.setDate(start.getDate() - WINDOW_BACK_DAYS);
    const end = new Date();
    end.setDate(end.getDate() + WINDOW_FORWARD_DAYS);

    let allExternalIds: Set<string> = new Set();
    const perCalendar: Array<{ id: string; title: string; count: number }> = [];
    let inserted = 0;
    let updated = 0;
    // Build 54 (Session 36) — track per-calendar read success. If ANY calendar
    // read fails, we CANNOT safely delete-stale below: a transient EventKit
    // read failure would make allExternalIds miss real events → the delete
    // step wipes them from Supabase → next sync re-inserts → flicker. Better
    // to have a stale row for one sync than yo-yo events between deleted +
    // present. Recurring events ("Albert Lumines - Monthly 1:1") are the
    // typical failure case — EventKit occasionally throws on their instance
    // materialisation.
    let allReadsSucceeded = true;
    const failedCalendars: string[] = [];

    // Session 36 hotfix 2 (Build 54.2) — CHUNK the date range into 30-day
    // windows. Root cause of Rich's "iCal events flash then disappear":
    // iOS EventKit silently truncates or throws when asked for a large
    // range with lots of recurring event instances. Rich's Aatroxcomm work
    // calendar has 30+ "Monthly 1:1 Catch Up" recurring series which
    // materialise as hundreds of instances over the -30/+90 day window.
    // iOS returns partial results (or throws), we get ~1 event when the
    // iPhone has 15+ for the same day.
    //
    // Fix: fetch per calendar in 30-day chunks, dedupe by event.id
    // (recurring instances can appear at chunk boundaries). Small enough
    // per-call to avoid EventKit's truncation limits; overhead is
    // negligible (a few extra async calls per sync).
    const CHUNK_DAYS = 30;
    const chunks: Array<{ start: Date; end: Date }> = [];
    {
      let cs = new Date(start);
      while (cs < end) {
        const ce = new Date(cs);
        ce.setDate(ce.getDate() + CHUNK_DAYS);
        if (ce > end) ce.setTime(end.getTime());
        chunks.push({ start: new Date(cs), end: new Date(ce) });
        cs = new Date(ce);
      }
    }
    console.log(`[calendar-sync] fetching ${enabledCals.length} calendars × ${chunks.length} × ${CHUNK_DAYS}-day chunks`);

    for (const cal of enabledCals) {
      let iosEvents: Calendar.Event[] = [];
      let chunkFailures = 0;
      const seen = new Set<string>();
      for (const chunk of chunks) {
        try {
          const chunkEvents = await Calendar.getEventsAsync([cal.id], chunk.start, chunk.end);
          for (const e of chunkEvents) {
            if (!e?.id || seen.has(e.id)) continue;
            seen.add(e.id);
            iosEvents.push(e);
          }
        } catch (e: any) {
          console.log(`[calendar-sync] getEventsAsync chunk failed for ${cal.title} (${chunk.start.toISOString().slice(0,10)} → ${chunk.end.toISOString().slice(0,10)}):`, e?.message);
          chunkFailures++;
        }
      }
      if (chunkFailures > 0) {
        // ANY chunk failure for this calendar marks the whole calendar unreliable
        // for this sync — skip delete-stale so we don't wipe rows the failed
        // chunk would have returned.
        allReadsSucceeded = false;
        failedCalendars.push(`${cal.title} (${chunkFailures}/${chunks.length} chunks failed)`);
      }
      console.log(`[calendar-sync] ${cal.title}: fetched ${iosEvents.length} unique events (${chunkFailures} chunk failures)`);
      perCalendar.push({ id: cal.id, title: cal.title, count: iosEvents.length });

      // Upsert each event to Supabase
      for (const ev of iosEvents) {
        allExternalIds.add(ev.id);
        const startIso = normaliseIsoLocal(ev.startDate);
        const endIso = normaliseIsoLocal(ev.endDate);
        const dateOnly = startIso.split('T')[0];

        const row = {
          family_id: familyId,
          title: (ev.title || 'Untitled').trim(),
          date: dateOnly,
          start_time: startIso,
          end_time: endIso,
          notes: (ev.notes || '').trim(),
          timezone: ev.timeZone || 'Australia/Brisbane',
          assignees,
          source: 'apple-ical' as const,
          external_id: ev.id,
          external_calendar_id: cal.id,
          imported_by_user_id: userId,
          privacy_scope: 'personal' as const,
          synced_at: new Date().toISOString(),
        };

        // Upsert on (imported_by_user_id, external_id) — the partial unique
        // index we added in supabase-calendar-sync.sql. If already exists,
        // update; else insert.
        const { data: existing } = await supabase
          .from('events')
          .select('id')
          .eq('imported_by_user_id', userId)
          .eq('external_id', ev.id)
          .maybeSingle();

        if (existing?.id) {
          // Build 54 (Session 36) — DON'T reset privacy_scope on update.
          // If the user has manually shared this imported event with the
          // family (via CalSheetEventCard toggle), we need to preserve
          // that. Only INSERT gets privacy_scope='personal' as the default;
          // subsequent syncs leave it alone.
          const { privacy_scope: _drop, ...updateRow } = row;
          const { error: upErr } = await supabase
            .from('events')
            .update(updateRow)
            .eq('id', existing.id);
          if (!upErr) updated++;
          else console.log('[calendar-sync] update failed:', upErr.message);
        } else {
          const { error: insErr } = await supabase.from('events').insert(row);
          if (!insErr) inserted++;
          else console.log('[calendar-sync] insert failed:', insErr.message);
        }
      }
    }

    // 5. Delete stale rows — events in Supabase with source='apple-ical'
    // and imported_by_user_id=userId whose external_id is no longer present
    // in the iOS pull (user deleted from iPhone Calendar).
    //
    // Build 54 (Session 36) — CRITICAL: skip the delete step entirely if
    // ANY calendar read failed above. `allExternalIds` doesn't include the
    // failed calendars' events, so deleting-what's-not-in-the-set would wipe
    // real rows and re-create them next sync → flicker. One skipped delete
    // cycle is fine; the next successful sync catches genuine deletes.
    let deleted = 0;
    if (allReadsSucceeded) {
      const { data: existingRows } = await supabase
        .from('events')
        .select('id, external_id')
        .eq('imported_by_user_id', userId)
        .eq('source', 'apple-ical')
        .gte('date', localDateStr(start))
        .lte('date', localDateStr(end));

      const staleIds = (existingRows ?? [])
        .filter(r => r.external_id && !allExternalIds.has(r.external_id))
        .map(r => r.id);

      if (staleIds.length > 0) {
        const { error: delErr } = await supabase
          .from('events')
          .delete()
          .in('id', staleIds);
        if (!delErr) deleted = staleIds.length;
        else console.log('[calendar-sync] delete stale failed:', delErr.message);
      }
    } else {
      console.log(`[calendar-sync] skipping delete-stale — ${failedCalendars.length} calendar(s) failed to read (${failedCalendars.join(', ')}). Would re-flicker deleted rows on next sync.`);
    }

    // 6. Auto-remediation (Build 52) — if user's stored mirror_schema_version
    // is older than the current code's canonical value, wipe all their
    // mirrored events (Supabase mirrored_apple_id → null + delete EventKit
    // events in the Zaeli calendar) and re-mirror fresh with current code.
    // One-time wipe per version bump. Saves users from manual
    // "disconnect + reconnect" instructions when we ship schema fixes.
    try {
      const cfgVer = (config?.mirror_schema_version ?? 0) as number;
      if (cfgVer < MIRROR_SCHEMA_VERSION) {
        console.log(`[calendar-sync] auto-remediate: cfg v${cfgVer} < code v${MIRROR_SCHEMA_VERSION}, wiping mirror`);
        await wipeAllMirroredEvents(userId, familyId, config?.zaeli_calendar_id ?? null);
        await saveSyncConfig(userId, familyId, { mirror_schema_version: MIRROR_SCHEMA_VERSION });
      }
    } catch (e: any) {
      console.log('[calendar-sync] auto-remediate threw (non-fatal):', e?.message);
    }

    // 7. Build 50 write-back — mirror Zaeli-native events to the user's
    // dedicated Zaeli EventKit calendar. Reconciliation-based (Build 52):
    // INSERTS new events, UPDATES existing mirrored events (title/time/notes
    // change on the Zaeli side propagates), and DELETES orphaned EventKit
    // events (Zaeli event deleted → EventKit copy removed). Runs on every
    // sync so changes propagate within one app open. Fire-and-forget-ish:
    // log result but don't fail the whole sync.
    let mirroredIn = 0;
    let mirroredUpd = 0;
    let mirroredDel = 0;
    try {
      const mirrorRes = await mirrorZaeliEventsToEventKit(userId, familyId);
      mirroredIn = mirrorRes.mirrored;
      mirroredUpd = mirrorRes.updated ?? 0;
      mirroredDel = mirrorRes.deleted ?? 0;
      if (mirrorRes.failed > 0) {
        console.log(`[calendar-sync] mirror had ${mirrorRes.failed} failures`);
      }
    } catch (e: any) {
      console.log('[calendar-sync] mirror step threw (non-fatal):', e?.message);
    }

    // 7. Stamp last_synced_at
    await saveSyncConfig(userId, familyId, {
      last_synced_at: new Date().toISOString(),
      sync_enabled: true,
      permission_granted: true,
    });

    console.log(`[calendar-sync] done. IN +${inserted} ~${updated} -${deleted} across ${enabledCals.length} cals · OUT +${mirroredIn} ~${mirroredUpd} -${mirroredDel}`);
    return { ok: true, inserted, updated, deleted, perCalendar };
  } catch (e: any) {
    console.log('[calendar-sync] syncNow threw:', e?.message);
    return { ok: false, inserted: 0, updated: 0, deleted: 0, perCalendar: [], error: e?.message ?? 'unknown' };
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Write-back (Build 50) — Zaeli events → iPhone Calendar
// ─────────────────────────────────────────────────────────────────────────

const ZAELI_CALENDAR_TITLE = 'Zaeli';
const ZAELI_CALENDAR_COLOR = '#FF4545';  // coral (matches Zaeli brand)

// Find or create the dedicated "Zaeli" calendar on the user's iPhone.
// This is a separate EventKit calendar (not one of the user's existing ones)
// so Zaeli only touches events it owns — never other calendars.
//
// Stores the created ekid in calendar_sync_config.zaeli_calendar_id so
// subsequent syncs skip the create step + go straight to writing events.
export async function ensureZaeliCalendar(userId: string, familyId: string): Promise<{
  ok: boolean;
  calendarId?: string;
  created?: boolean;
  error?: string;
}> {
  try {
    // 1. Check saved config first
    const cfg = await loadSyncConfig(userId);
    if (cfg?.zaeli_calendar_id) {
      // Verify it still exists on the device (user may have deleted it manually)
      const cals = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      if (cals.some(c => c.id === cfg.zaeli_calendar_id)) {
        return { ok: true, calendarId: cfg.zaeli_calendar_id, created: false };
      }
      // Otherwise fall through to re-create
    }

    // 2. Look for an existing "Zaeli" calendar (in case one was manually
    // created before this code shipped, or config got out of sync)
    const cals = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    const existing = cals.find(c => c.title === ZAELI_CALENDAR_TITLE && c.allowsModifications !== false);
    if (existing?.id) {
      await saveSyncConfig(userId, familyId, { zaeli_calendar_id: existing.id });
      return { ok: true, calendarId: existing.id, created: false };
    }

    // 3. Create a new one. Source selection is trickier than it first looks.
    // Rich's device (Aug 15) had 8 sources — Gmail, iCloud, aatroxcommunications,
    // Coastal Luxe Organic Cleaning, Local, plus subscribed/birthdays. The
    // strict "type=caldav AND name=iCloud" check missed his iCloud source
    // (name might have been "iCloud" with different casing, or "iCloud
    // Calendar", etc). Fix: loose matching + broad fallback chain.
    const sources = await Calendar.getSourcesAsync();
    console.log('[calendar-sync] available sources:', sources.map(s => ({ id: s.id, name: s.name, type: s.type })));

    // Skip read-only sources (subscriptions, holidays, birthdays) — can't
    // create calendars in them.
    const writableSources = sources.filter(s => {
      const t = String(s.type || '').toLowerCase();
      const n = String(s.name || '').toLowerCase();
      if (t === 'subscribed' || t === 'birthdays') return false;
      if (n.includes('subscribed') || n.includes('holidays') || n.includes('birthdays')) return false;
      return true;
    });

    // Prefer iCloud (syncs across user's Apple devices) via loose match on name.
    // Then any CalDAV source. Then Local. Then any writable source.
    const source =
         writableSources.find(s => String(s.name || '').toLowerCase().includes('icloud'))
      || writableSources.find(s => String(s.type || '').toLowerCase() === 'caldav')
      || writableSources.find(s => String(s.type || '').toLowerCase() === 'local')
      || writableSources[0];

    if (!source) {
      console.log('[calendar-sync] ensureZaeliCalendar: no writable source found from', sources.length, 'sources');
      return { ok: false, error: 'no writable calendar source on device' };
    }
    console.log('[calendar-sync] ensureZaeliCalendar: using source', { id: source.id, name: source.name, type: source.type });

    // iOS-only params. The previous version passed Android-only fields
    // (name, ownerAccount, accessLevel) which iOS may silently reject.
    // On iOS, expo-calendar accepts sourceId OR source (whole object) —
    // sourceId is preferred and simpler.
    let newId: string;
    try {
      newId = await Calendar.createCalendarAsync({
        title:      ZAELI_CALENDAR_TITLE,
        color:      ZAELI_CALENDAR_COLOR,
        entityType: Calendar.EntityTypes.EVENT,
        sourceId:   source.id,
      });
    } catch (createErr: any) {
      console.log('[calendar-sync] createCalendarAsync failed with sourceId — trying with full source object:', createErr?.message);
      // Fallback: pass the source object instead of sourceId (some iOS
      // versions prefer this format).
      newId = await Calendar.createCalendarAsync({
        title:      ZAELI_CALENDAR_TITLE,
        color:      ZAELI_CALENDAR_COLOR,
        entityType: Calendar.EntityTypes.EVENT,
        source:     source as any,
      });
    }

    await saveSyncConfig(userId, familyId, { zaeli_calendar_id: newId });
    console.log('[calendar-sync] created Zaeli EventKit calendar:', newId, 'in source', source.name);
    return { ok: true, calendarId: newId, created: true };
  } catch (e: any) {
    console.log('[calendar-sync] ensureZaeliCalendar threw:', e?.message);
    return { ok: false, error: e?.message ?? 'unknown' };
  }
}

// Mirror Zaeli-native events (source=null) to the user's Zaeli EventKit
// calendar — full reconciliation (Build 52). Three operations in one pass:
//
//   INSERT — event has no mirrored_apple_id → create in EventKit, save ekid
//   UPDATE — event has mirrored_apple_id → update the EventKit copy (idempotent)
//   DELETE — EventKit event whose ekid isn't in any Supabase row → delete
//
// Runs on every sync so mutations propagate within one app-open cycle. Not
// perfectly efficient (UPDATE re-writes every mirror on every sync) but
// correct + simple. Optimise later if it becomes a bottleneck.
//
// Family-scope events get mirrored to EVERY family adult's iPhone with sync
// enabled. Personal events only mirror if the user IS the owner. Since this
// function is called per-user, the caller controls scope.
export async function mirrorZaeliEventsToEventKit(
  userId: string,
  familyId: string,
): Promise<{ ok: boolean; mirrored: number; updated: number; deleted: number; failed: number; error?: string }> {
  try {
    // 1. Ensure the Zaeli calendar exists (create on first sync)
    const ensured = await ensureZaeliCalendar(userId, familyId);
    if (!ensured.ok || !ensured.calendarId) {
      return { ok: false, mirrored: 0, updated: 0, deleted: 0, failed: 0, error: ensured.error ?? 'no zaeli calendar' };
    }
    const zaeliCalId = ensured.calendarId;

    // 2. Time window: -30 days to +365 days
    const start = new Date();
    start.setDate(start.getDate() - 30);
    const end = new Date();
    end.setDate(end.getDate() + 365);
    const startStr = start.toISOString().slice(0, 10);
    const endStr = end.toISOString().slice(0, 10);

    // 3. Fetch ALL Zaeli-native events in the window (both un-mirrored and
    // mirrored — we'll INSERT vs UPDATE based on mirrored_apple_id).
    const { data: events, error: qErr } = await supabase
      .from('events')
      .select('id, title, date, start_time, end_time, notes, timezone, mirrored_apple_id')
      .eq('family_id', familyId)
      .is('source', null)
      .gte('date', startStr)
      .lte('date', endStr)
      .limit(1000);
    if (qErr) return { ok: false, mirrored: 0, updated: 0, deleted: 0, failed: 0, error: qErr.message };

    let mirrored = 0;
    let updated = 0;
    let deleted = 0;
    let failed = 0;

    // Track ekids we've touched so we can find orphans below
    const activeEkids = new Set<string>();

    for (const ev of events ?? []) {
      try {
        const startDate = parseIsoAsDate(ev.start_time);
        const endDate = parseIsoAsDate(ev.end_time || ev.start_time);
        const safeEnd = endDate.getTime() > startDate.getTime()
          ? endDate
          : new Date(startDate.getTime() + 60 * 60 * 1000);

        const payload = {
          title:    ev.title || 'Untitled',
          startDate,
          endDate:  safeEnd,
          notes:    ev.notes || '',
          timeZone: ev.timezone || 'Australia/Brisbane',
        };

        if (ev.mirrored_apple_id) {
          // UPDATE path — event already mirrored, re-write to reflect
          // current Supabase state. updateEventAsync is idempotent.
          try {
            await Calendar.updateEventAsync(ev.mirrored_apple_id, payload);
            activeEkids.add(ev.mirrored_apple_id);
            updated++;
          } catch (updErr: any) {
            // If the EventKit event is gone (user deleted from iPhone
            // Calendar), updateEventAsync throws. Fall through to
            // create fresh + save new ekid.
            console.log('[calendar-sync] mirror update failed, re-creating:', ev.id, updErr?.message);
            try {
              const newEkid = await Calendar.createEventAsync(zaeliCalId, payload);
              await supabase.from('events').update({ mirrored_apple_id: newEkid }).eq('id', ev.id);
              activeEkids.add(newEkid);
              mirrored++;
            } catch (recreateErr: any) {
              console.log('[calendar-sync] mirror recreate failed:', ev.id, recreateErr?.message);
              failed++;
            }
          }
        } else {
          // INSERT path — first mirror. Create in EventKit + save ekid.
          const ekid = await Calendar.createEventAsync(zaeliCalId, payload);
          const { error: upErr } = await supabase
            .from('events')
            .update({ mirrored_apple_id: ekid })
            .eq('id', ev.id);
          if (upErr) {
            console.log('[calendar-sync] mirror save-ekid failed for', ev.id, upErr.message);
            failed++;
          } else {
            activeEkids.add(ekid);
            mirrored++;
          }
        }
      } catch (e: any) {
        console.log('[calendar-sync] mirror event failed for', ev.id, e?.message);
        failed++;
      }
    }

    // 4. DELETE orphans — Build 52. Walk all EventKit events in the Zaeli
    // calendar within our window. Any event NOT in activeEkids was deleted
    // from Supabase since we last mirrored → remove from EventKit.
    try {
      const ekitEvents = await Calendar.getEventsAsync([zaeliCalId], start, end);
      for (const ee of ekitEvents) {
        if (!activeEkids.has(ee.id)) {
          try {
            await Calendar.deleteEventAsync(ee.id);
            deleted++;
          } catch (delErr: any) {
            console.log('[calendar-sync] mirror delete orphan failed:', ee.id, delErr?.message);
            failed++;
          }
        }
      }
    } catch (e: any) {
      console.log('[calendar-sync] mirror orphan-delete scan threw (non-fatal):', e?.message);
    }

    console.log(`[calendar-sync] mirror done: +${mirrored} ~${updated} -${deleted} · ${failed} failed`);
    return { ok: true, mirrored, updated, deleted, failed };
  } catch (e: any) {
    console.log('[calendar-sync] mirrorZaeliEventsToEventKit threw:', e?.message);
    return { ok: false, mirrored: 0, updated: 0, deleted: 0, failed: 0, error: e?.message ?? 'unknown' };
  }
}

// Wipe all mirrored events for auto-remediation. Nulls mirrored_apple_id
// on all Zaeli-native events for the family + deletes every EventKit event
// in the Zaeli calendar. Called when mirror_schema_version bumps.
async function wipeAllMirroredEvents(
  userId: string,
  familyId: string,
  zaeliCalendarId: string | null,
): Promise<void> {
  // Delete every event in the Zaeli EventKit calendar (best-effort)
  if (zaeliCalendarId) {
    try {
      const start = new Date();
      start.setDate(start.getDate() - 60);
      const end = new Date();
      end.setDate(end.getDate() + 400);
      const cals = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      if (cals.some(c => c.id === zaeliCalendarId)) {
        const evs = await Calendar.getEventsAsync([zaeliCalendarId], start, end);
        for (const ee of evs) {
          try { await Calendar.deleteEventAsync(ee.id); } catch {}
        }
        console.log(`[calendar-sync] wipe: removed ${evs.length} EventKit events from Zaeli calendar`);
      }
    } catch (e: any) {
      console.log('[calendar-sync] wipe EventKit-side threw (non-fatal):', e?.message);
    }
  }
  // Null out mirrored_apple_id on every Zaeli-native event in the family
  try {
    await supabase
      .from('events')
      .update({ mirrored_apple_id: null })
      .eq('family_id', familyId)
      .is('source', null)
      .not('mirrored_apple_id', 'is', null);
  } catch (e: any) {
    console.log('[calendar-sync] wipe DB-side threw (non-fatal):', e?.message);
  }
}

// Parse a Supabase timestamp as a LOCAL wall-clock Date.
//
// CRITICAL Aug 15 fix — Zaeli events land in EventKit at the wrong time
// (off by Brisbane offset +10h). Root cause: the events.start_time column
// is `timestamp with time zone`, but the app stores LOCAL wall-clock
// strings via a Session 24 convention ("bare local YYYY-MM-DDTHH:MM:SS,
// never toISOString(), never +10:00 suffix"). Postgres receives the local
// string, interprets it in the connection's TimeZone (UTC on Supabase),
// stores as UTC. On SELECT, Postgres returns "2026-08-15T08:30:00+00:00"
// — the wall-clock is preserved but with a spurious UTC marker.
//
// The app's read paths treat that as local. If we use `new Date(iso)` we'd
// get the wall-clock interpreted as UTC → 8:30am local becomes 6:30pm
// Brisbane on iPhone Calendar. Bug.
//
// Fix: strip ANY timezone suffix and construct the Date from local
// components. Same class of fix as parseLocalIsoAsDate in lib/reminders.ts
// (Session 32 Round A reminder-time bug).
function parseIsoAsDate(iso: string | null | undefined): Date {
  if (!iso) return new Date();
  // Strip timezone suffix (Z or ±HH:MM or ±HHMM or " +00" style).
  const bare = String(iso).replace(/([+-]\d{2}:?\d{2}|Z)$/, '').replace(/\s+/g, 'T');
  const [datePart, timePart] = bare.split('T');
  if (!datePart) return new Date();
  const [y, m, d] = datePart.split('-').map(Number);
  const [h, mi, s] = (timePart || '00:00:00').split(':').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, h ?? 0, mi ?? 0, s ?? 0);
}

// ─────────────────────────────────────────────────────────────────────────
// Disconnect — user turns off sync entirely. Clear config + delete all
// external events they had imported.
// ─────────────────────────────────────────────────────────────────────────

export async function disconnectSync(userId: string): Promise<{ ok: boolean; deleted: number; error?: string }> {
  try {
    // 1. Delete all imported apple-ical events from Supabase (IN direction).
    const { data: rows } = await supabase
      .from('events')
      .select('id')
      .eq('imported_by_user_id', userId)
      .eq('source', 'apple-ical');
    const ids = (rows ?? []).map(r => r.id);
    if (ids.length > 0) {
      const { error: delErr } = await supabase.from('events').delete().in('id', ids);
      if (delErr) return { ok: false, deleted: 0, error: delErr.message };
    }

    // 2. Build 50 — delete the dedicated Zaeli EventKit calendar from the
    // user's iPhone (removes ALL mirrored Zaeli events). Best-effort — if
    // the calendar was already deleted manually or permission was revoked,
    // silently continue. User's other iOS calendars are never touched.
    const cfg = await loadSyncConfig(userId);
    if (cfg?.zaeli_calendar_id) {
      try {
        await Calendar.deleteCalendarAsync(cfg.zaeli_calendar_id);
        console.log('[calendar-sync] disconnect: deleted Zaeli EventKit calendar', cfg.zaeli_calendar_id);
      } catch (e: any) {
        console.log('[calendar-sync] disconnect: EventKit delete failed (non-fatal):', e?.message);
      }
    }

    // 3. Null out mirrored_apple_id on all Zaeli-native events for this
    // family so if the user re-enables sync later, we re-mirror fresh.
    const familyId = cfg?.family_id;
    if (familyId) {
      await supabase
        .from('events')
        .update({ mirrored_apple_id: null })
        .eq('family_id', familyId)
        .is('source', null)
        .not('mirrored_apple_id', 'is', null);
    }

    // 4. Clear the config
    await saveSyncConfig(userId, familyId ?? '', {
      external_calendars: [],
      zaeli_calendar_id: null,
      sync_enabled: false,
      last_synced_at: null,
    });
    return { ok: true, deleted: ids.length };
  } catch (e: any) {
    return { ok: false, deleted: 0, error: e?.message ?? 'unknown' };
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────

// EventKit returns date strings like "2026-08-14T09:00:00.000Z". We store
// local ISO without tz suffix to match everything else in the codebase.
function normaliseIsoLocal(raw: string | Date): string {
  const d = raw instanceof Date ? raw : new Date(raw);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function localDateStr(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
