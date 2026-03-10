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

const DUMMY_FAMILY_ID = '00000000-0000-0000-0000-000000000001';

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
        model:      'claude-sonnet-4-20250514',
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