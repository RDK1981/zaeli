/**
 * zaeli-memory.ts
 * ─────────────────────────────────────────────────────────────
 * Drop this file at:  lib/zaeli-memory.ts
 *
 * Handles all memory operations:
 *   • buildMemoryContext()   — assembles AI prompt context from memory
 *   • saveConversation()     — saves chat turns to conversation_memory
 *   • writeInsight()         — stores a new observation
 *   • detectAndSavePatterns()— analyses recent activity for patterns
 * ─────────────────────────────────────────────────────────────
 */

import { supabase } from './supabase';
import { DUMMY_FAMILY_ID } from './family';

// DUMMY_FAMILY_ID kept as the default-parameter fallback so callers without
// auth context (legacy / dev flows) still work. Authenticated callers should
// pass getFamilyId() explicitly.

// ── TYPES ─────────────────────────────────────────────────────
export type Insight = {
  category: string;
  subject:  string;
  insight:  string;
  confidence: number;
};

export type Milestone = {
  title:       string;
  description: string;
  happened_on: string;
  emoji:       string;
};

// ─────────────────────────────────────────────────────────────
//  buildMemoryContext
//  Call this before every Zaeli AI request.
//  Returns a rich context string injected into the system prompt.
// ─────────────────────────────────────────────────────────────
export async function buildMemoryContext(familyId: string = DUMMY_FAMILY_ID): Promise<string> {
  try {
    const [insightsRes, milestonesRes, digestRes] = await Promise.all([
      // Top insights ordered by confidence
      supabase
        .from('family_insights')
        .select('category, subject, insight, confidence')
        .eq('family_id', familyId)
        .order('confidence', { ascending: false })
        .limit(15),

      // Recent milestones (last 12 months)
      supabase
        .from('family_milestones')
        .select('title, description, happened_on, emoji')
        .eq('family_id', familyId)
        .order('happened_on', { ascending: false })
        .limit(10),

      // Last weekly digest
      supabase
        .from('weekly_digests')
        .select('summary, week_start')
        .eq('family_id', familyId)
        .order('week_start', { ascending: false })
        .limit(1),
    ]);

    const insights:    Insight[]   = insightsRes.data   || [];
    const milestones:  Milestone[] = milestonesRes.data || [];
    const lastDigest               = digestRes.data?.[0];

    let context = '';

    // Family patterns & routines
    if (insights.length > 0) {
      const routines    = insights.filter(i => i.category === 'routine');
      const patterns    = insights.filter(i => i.category === 'pattern');
      const preferences = insights.filter(i => i.category === 'preference');

      if (routines.length > 0) {
        context += `\nFAMILY ROUTINES:\n`;
        routines.forEach(i => context += `• ${i.subject}: ${i.insight}\n`);
      }
      if (patterns.length > 0) {
        context += `\nFAMILY PATTERNS:\n`;
        patterns.forEach(i => context += `• ${i.insight}\n`);
      }
      if (preferences.length > 0) {
        context += `\nFAMILY PREFERENCES:\n`;
        preferences.forEach(i => context += `• ${i.subject}: ${i.insight}\n`);
      }
    }

    // Important milestones
    if (milestones.length > 0) {
      context += `\nFAMILY MILESTONES (recent):\n`;
      milestones.forEach(m => {
        context += `• ${m.emoji || '⭐'} ${m.title} (${m.happened_on})${m.description ? ': ' + m.description : ''}\n`;
      });
    }

    // Last week's digest for continuity
    if (lastDigest) {
      context += `\nLAST WEEK SUMMARY (${lastDigest.week_start}):\n${lastDigest.summary}\n`;
    }

    return context;
  } catch (e) {
    console.log('Memory context error:', e);
    return '';
  }
}

// ─────────────────────────────────────────────────────────────
//  saveConversation
//  Call after each AI exchange to build long-term memory.
//  Pass the user message + assistant response.
// ─────────────────────────────────────────────────────────────
export async function saveConversation(
  familyId: string = DUMMY_FAMILY_ID,
  userMessage: string,
  assistantResponse: string,
  tags: string[] = []
): Promise<void> {
  try {
    await supabase.from('conversation_memory').insert([
      {
        family_id: familyId,
        role:      'user',
        content:   userMessage,
        tags,
      },
      {
        family_id: familyId,
        role:      'assistant',
        content:   assistantResponse,
        tags,
      },
    ]);
  } catch (e) {
    console.log('Save conversation error:', e);
  }
}

// ─────────────────────────────────────────────────────────────
//  writeInsight
//  Call whenever Zaeli notices a pattern worth remembering.
//  If the same insight_key exists, increment occurrence_count.
// ─────────────────────────────────────────────────────────────
export async function writeInsight(
  familyId: string = DUMMY_FAMILY_ID,
  insight: Omit<Insight, 'confidence'> & { confidence?: number }
): Promise<void> {
  try {
    // Check if insight already exists (by matching text similarity)
    const { data: existing } = await supabase
      .from('family_insights')
      .select('id, occurrence_count, confidence')
      .eq('family_id', familyId)
      .eq('subject', insight.subject)
      .eq('category', insight.category)
      .ilike('insight', `%${insight.insight.slice(0, 30)}%`)
      .limit(1);

    if (existing && existing.length > 0) {
      // Update existing — increase confidence
      const current = existing[0];
      const newConfidence = Math.min(95, current.confidence + 5);
      await supabase
        .from('family_insights')
        .update({
          occurrence_count: current.occurrence_count + 1,
          confidence:       newConfidence,
          last_seen:        new Date().toISOString(),
        })
        .eq('id', current.id);
    } else {
      // New insight
      await supabase.from('family_insights').insert({
        family_id:  familyId,
        category:   insight.category,
        subject:    insight.subject,
        insight:    insight.insight,
        confidence: insight.confidence ?? 40,
      });
    }
  } catch (e) {
    console.log('Write insight error:', e);
  }
}

// ─────────────────────────────────────────────────────────────
//  logPatternEvent
//  Call whenever something happens that might form a pattern.
//  e.g. meal cooked, job done, shop completed.
// ─────────────────────────────────────────────────────────────
export async function logPatternEvent(
  familyId:  string = DUMMY_FAMILY_ID,
  eventType: string,
  eventKey:  string,
  value:     string,
  memberId?: string,
  metadata:  Record<string, any> = {}
): Promise<void> {
  try {
    const now = new Date();
    await supabase.from('pattern_log').insert({
      family_id:   familyId,
      event_type:  eventType,
      event_key:   eventKey,
      value,
      member_id:   memberId,
      day_of_week: now.getDay(),
      metadata,
      occurred_at: now.toISOString(),
    });
  } catch (e) {
    console.log('Log pattern event error:', e);
  }
}

// ─────────────────────────────────────────────────────────────
//  detectAndSavePatterns
//  Run this weekly (or on-demand) to analyse pattern_log
//  and write new insights automatically.
//  Uses Claude AI to interpret the patterns.
// ─────────────────────────────────────────────────────────────
export async function detectAndSavePatterns(
  familyId: string = DUMMY_FAMILY_ID
): Promise<void> {
  try {
    // Get last 30 days of pattern events
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: events } = await supabase
      .from('pattern_log')
      .select('event_type, event_key, value, day_of_week, occurred_at')
      .eq('family_id', familyId)
      .gte('occurred_at', thirtyDaysAgo.toISOString())
      .order('occurred_at', { ascending: false });

    if (!events || events.length < 5) return; // Not enough data yet

    // Ask Claude to identify patterns
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':                          'application/json',
        'x-api-key':                             process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY || '',
        'anthropic-version':                     '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model:      'claude-sonnet-4-6',
        max_tokens: 500,
        system: `You are analysing a family's activity log to find meaningful patterns.
Return a JSON array of insights. Each insight has:
{ "category": "routine|pattern|preference", "subject": "person or 'family'", "insight": "one clear sentence" }
Only include confident patterns that repeat at least 3 times. Max 5 insights. Return ONLY valid JSON, no other text.`,
        messages: [{
          role:    'user',
          content: `Activity log (last 30 days): ${JSON.stringify(events)}`,
        }],
      }),
    });

    const d = await res.json();
    const text = d.content?.[0]?.text || '[]';

    let newInsights: Array<{category:string;subject:string;insight:string}> = [];
    try {
      newInsights = JSON.parse(text);
    } catch {
      return;
    }

    // Save each new insight
    for (const insight of newInsights) {
      await writeInsight(familyId, {
        category:   insight.category,
        subject:    insight.subject,
        insight:    insight.insight,
        confidence: 50,
      });
    }

    console.log(`Pattern detection: saved ${newInsights.length} insights`);
  } catch (e) {
    console.log('Pattern detection error:', e);
  }
}

// ─────────────────────────────────────────────────────────────
//  saveMilestone
//  Call whenever something milestone-worthy happens.
// ─────────────────────────────────────────────────────────────
export async function saveMilestone(
  familyId:    string = DUMMY_FAMILY_ID,
  title:       string,
  description: string,
  happenedOn:  string,  // YYYY-MM-DD
  category:    string,
  emoji:       string,
  memberId?:   string
): Promise<void> {
  try {
    await supabase.from('family_milestones').insert({
      family_id:   familyId,
      member_id:   memberId,
      title,
      description,
      happened_on: happenedOn,
      category,
      emoji,
    });
  } catch (e) {
    console.log('Save milestone error:', e);
  }
}

// ─────────────────────────────────────────────────────────────
//  detectInsightsFromConversations  (Phase 2f memory loop)
//  Reads recent conversation_memory turns and asks Sonnet to extract
//  DURABLE facts (routines + preferences). Writes via writeInsight()
//  which dedupes + bumps confidence on repeats.
//
//  This is the "learn from chats" engine — distinct from
//  detectAndSavePatterns() which reads the (currently-unused)
//  pattern_log of structured events. Call this periodically from the
//  chat flow (e.g. every N exchanges), gated by the user's
//  memoryLearningOn preference.
// ─────────────────────────────────────────────────────────────
export async function detectInsightsFromConversations(
  familyId: string = DUMMY_FAMILY_ID
): Promise<void> {
  try {
    // Pull recent conversation turns (most recent 40)
    const { data: convos } = await supabase
      .from('conversation_memory')
      .select('role, content, created_at')
      .eq('family_id', familyId)
      .order('created_at', { ascending: false })
      .limit(40);

    if (!convos || convos.length < 6) return; // not enough signal yet

    // Chronological order so the AI reads the thread naturally
    const transcript = [...convos]
      .reverse()
      .map(c => `${c.role}: ${c.content}`)
      .join('\n');

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':                              'application/json',
        'x-api-key':                                 process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY || '',
        'anthropic-version':                         '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model:      'claude-sonnet-4-6',
        max_tokens: 400,
        system: `You analyse a family's chat with their assistant to extract DURABLE facts worth remembering long-term.
Return a JSON array. Each item: { "category": "routine|preference", "subject": "person's name or 'family'", "insight": "one clear sentence" }
ONLY include durable facts: recurring routines (e.g. "Soccer training Tuesdays"), stable likes/dislikes/allergies, standing commitments.
NEVER include one-off events, questions, scheduling for a single date, or transient chit-chat.
Max 5 items. If nothing durable, return []. Return ONLY valid JSON, no markdown, no other text.`,
        messages: [{ role: 'user', content: `Recent chat:\n${transcript}` }],
      }),
    });

    if (!res.ok) {
      console.log('[memory] detectInsightsFromConversations API error:', res.status);
      return;
    }

    const d = await res.json();
    const raw = (d.content?.[0]?.text || '[]').replace(/```json|```/g, '').trim();
    let insights: Array<{ category: string; subject: string; insight: string }> = [];
    try {
      insights = JSON.parse(raw);
    } catch {
      return;
    }
    if (!Array.isArray(insights)) return;

    for (const ins of insights) {
      if (ins.category !== 'routine' && ins.category !== 'preference') continue;
      if (!ins.insight || !ins.insight.trim()) continue;
      await writeInsight(familyId, {
        category:   ins.category,
        subject:    ins.subject || 'family',
        insight:    ins.insight.trim(),
        confidence: 45,
      });
    }
    console.log(`[memory] detectInsightsFromConversations: processed ${insights.length} insight(s)`);
  } catch (e) {
    console.log('detectInsightsFromConversations error:', e);
  }
}

// ─────────────────────────────────────────────────────────────
//  Settings → Memory view fetchers (Phase 2f)
//  Display + delete operations for the user-facing Memory list.
// ─────────────────────────────────────────────────────────────

export type InsightRow = {
  id:               string;
  category:         string;     // 'routine' | 'preference' | 'pattern'
  subject:          string;
  insight:          string;
  confidence:       number;
  occurrence_count: number | null;
  last_seen:        string | null;
};

export type MilestoneRow = {
  id:          string;
  title:       string;
  description: string | null;
  happened_on: string;
  emoji:       string | null;
  category:    string | null;
};

// Fetch insights for a specific category. Caller decides which category to
// pull (settings.tsx shows routines + preferences in separate sections).
export async function fetchInsightsByCategory(
  familyId: string,
  category: 'routine' | 'preference' | 'pattern',
): Promise<InsightRow[]> {
  try {
    const { data, error } = await supabase
      .from('family_insights')
      .select('id, category, subject, insight, confidence, occurrence_count, last_seen')
      .eq('family_id', familyId)
      .eq('category', category)
      .order('confidence', { ascending: false })
      .limit(50);
    if (error) {
      console.log('[memory] fetchInsightsByCategory error:', error.message);
      return [];
    }
    return (data || []) as InsightRow[];
  } catch (e: any) {
    console.log('[memory] fetchInsightsByCategory exception:', e?.message);
    return [];
  }
}

// Fetch recent + upcoming milestones. Ordered with most-recent first.
export async function fetchMilestones(familyId: string): Promise<MilestoneRow[]> {
  try {
    const { data, error } = await supabase
      .from('family_milestones')
      .select('id, title, description, happened_on, emoji, category')
      .eq('family_id', familyId)
      .order('happened_on', { ascending: false })
      .limit(50);
    if (error) {
      console.log('[memory] fetchMilestones error:', error.message);
      return [];
    }
    return (data || []) as MilestoneRow[];
  } catch (e: any) {
    console.log('[memory] fetchMilestones exception:', e?.message);
    return [];
  }
}

// Delete a single insight by id. RLS enforces family scope.
export async function deleteInsight(id: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('family_insights').delete().eq('id', id);
    if (error) { console.log('[memory] deleteInsight error:', error.message); return false; }
    return true;
  } catch (e: any) {
    console.log('[memory] deleteInsight exception:', e?.message);
    return false;
  }
}

// Delete a single milestone by id. RLS enforces family scope.
export async function deleteMilestone(id: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('family_milestones').delete().eq('id', id);
    if (error) { console.log('[memory] deleteMilestone error:', error.message); return false; }
    return true;
  } catch (e: any) {
    console.log('[memory] deleteMilestone exception:', e?.message);
    return false;
  }
}

// Clear EVERYTHING Zaeli remembers about this family — insights,
// milestones, conversation memory, pattern log. Destructive.
// Caller should confirm via Alert before invoking.
export async function clearAllMemory(familyId: string): Promise<{ ok: boolean; errors: string[] }> {
  const errors: string[] = [];
  const tables = ['family_insights', 'family_milestones', 'conversation_memory', 'pattern_log'];
  for (const t of tables) {
    try {
      const { error } = await supabase.from(t).delete().eq('family_id', familyId);
      if (error) errors.push(`${t}: ${error.message}`);
    } catch (e: any) {
      errors.push(`${t}: ${e?.message ?? 'unknown'}`);
    }
  }
  return { ok: errors.length === 0, errors };
}