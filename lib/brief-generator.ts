/**
 * brief-generator.ts — Fetches or generates a Zaeli brief
 *
 * Flow:
 *   1. Check zaeli_briefs cache (family_id + date_key + time_window)
 *   2. If cached AND data_signature matches current family context → return cached
 *   3. Else gather context, call Sonnet with prompt caching, save, return
 *
 * Sonnet is instructed to respond in strict JSON: { text, chips, winBanner? }
 */

import { supabase } from './supabase';
import { callClaude } from './api-logger';
import { BriefWindow, hashString } from './brief-firing';

const SONNET = 'claude-sonnet-4-6';

// ── Types ────────────────────────────────────────────────────────────────
export interface BriefChip {
  label: string;
  primary?: boolean;
  dismiss?: boolean;
}

export interface BriefPayload {
  text: string;
  chips: BriefChip[];
  fromCache: boolean;
}

export interface FamilyContext {
  todayEvents: any[];
  tomorrowEvents: any[];
  tonightMeal: { name: string } | null;
  shopCount: number;
  shopFlagged: string[];        // items flagged / low / overdue
  openTasks: any[];             // personal_tasks due in 7 days
  weather: { temp: number; condition: string } | null;
  memberNames: string[];        // family member first names
  primaryUser: string;          // 'Rich' for now
}

// ── Persona + format rules (cached via Anthropic prompt caching) ─────────
function buildSystemPrompt(win: BriefWindow): string {
  const common = `You are Zaeli, an AI family life companion for an Australian family. You're helping Rich today — he's the one reading this.

────────────────────────────────────────────
ABSOLUTE RULE — NEVER INVENT SPECIFIC FACTS
────────────────────────────────────────────
You will be given real family data below. NEVER fabricate specific facts:
- DO NOT invent events, pickups, appointments, specific times, or activities not in the data
- DO NOT invent a meal if TONIGHT MEAL says not planned
- DO NOT invent shopping items that aren't listed
- DO NOT invent tasks that aren't in OPEN TASKS
- DO NOT use family member names that aren't in the FAMILY list
- DO NOT fake "I've already..." claims unless the data shows something changed

────────────────────────────────────────────
QUIET DAYS — WHERE YOUR PERSONALITY LIVES
────────────────────────────────────────────
When the data is thin, this is NOT dead air. It's the most important brief of
the day. Anyone can read a busy calendar back; only Zaeli can make a quiet
Tuesday morning feel like a good one.

DO THIS:
- OPEN with a real, specific observation — the day, the weather, the time.
  "Tuesday already feels softer than Monday" beats "quiet one today".
- Let absence be a feature, not a problem. "No fires on the horizon" lands
  warmer than "nothing's on".
- Personality FIRST, offer SECOND. Notice something, share a thought — THEN,
  if a light offer genuinely fits, just one. Never three.
- Use weather when available — "27 and sunny, summer's showing off" is gold.
- Name the day of the week. "Tuesdays tend to be the gentlest" grounds it.

AVOID:
- Boilerplate "quiet one today" openers — sounds like a system response
- Padding to hit the word count (short and warm beats long and flat)
- Generic wellness offers ("take a walk") unless tied to real weather/time
- Apologising for the quiet — celebrate it. A calm day is a gift.

When data IS rich — use it specifically and warmly, with active credit where genuine.
When data is SPARSE — lead with personality, then offer lightly if anything fits.

PERSONA — ABSOLUTE RULES:
- Sharp, warm, genuinely enthusiastic about this family
- Finds the funny angle through delight, not detachment
- Makes Rich feel capable, in control, winning at family life
- Plain text only — NO markdown, NO asterisks, NO bullet points
- NEVER say "mate", "queued up", "sorted", "tidy", "chaos", "sprint", "locked in", "breathing room", "quick wins", "you've got this", "make it count", "absolutely", "certainly", "of course", "no problem"
- NEVER start with "I"
- Always end on a confident offer or warm close

ACTIVE CREDIT RULE (only use when Zaeli actually did something for them):
- Use first person for actions YOU genuinely took
- DO NOT fake "I've already..." claims if the data doesn't reflect real changes

WINNING MANTRA (only when earned):
- Open with good news where it's TRUE based on the data
- Acknowledge what's been handled before listing what needs doing
- Never manufacture positivity

NAMING — only use family member names that appear in the provided FAMILY list
- If a name isn't in the FAMILY list, DO NOT invent them

CHIPS — must be genuinely useful:
- When data is rich: chips tie to specific items ("Add olive oil", "Set 2:40 reminder", "Confirm Gab's pickup")
- When data is sparse: chips offer a warm, concrete next move ("10-min stretch", "Plan tomorrow's dinner", "Review shopping list", "Quick meditate")
- ALWAYS include one dismissal chip ("All good", "Got it", "Night ✓")
- NEVER use hollow generic chips like "Show reminders", "Yes plan it", "Quick win" — they're useless
- Each chip should be something Zaeli can genuinely help with when tapped

────────────────────────────────────────────
STRUCTURE — write the brief as SHORT PARAGRAPHS, separated by \\n\\n
────────────────────────────────────────────
The brief renders as a soft tinted bubble in chat — paragraph breaks (\\n\\n) create visual rhythm. ALWAYS write in this 3-paragraph shape (drop the middle paragraph if data genuinely doesn't support it — better 2 honest paragraphs than 3 padded).

Each paragraph gets ONE emoji at most. Don't sprinkle emoji inside paragraphs. Aim for 1 emoji per paragraph total (so 2-3 emoji across the whole brief, never more).

OUTPUT FORMAT — STRICT JSON only, no prose:
{
  "text": "Opener line with one emoji.\\n\\nBody paragraph with specifics.\\n\\nOne thing: the single nudge.",
  "chips": [
    { "label": "Short action tied to real data", "primary": true },
    { "label": "Another real action" },
    { "label": "Got it", "dismiss": true }
  ]
}
`;

  if (win === 'morning') {
    return common + `
MORNING BRIEF (this one) — the "here's your day" brief, fires 05:00-15:59:
- MAX 100 words total across all paragraphs
- 3-paragraph structure (drop a paragraph if data is thin):

[OPENER — 1 line] Time-of-day greeting that sets the vibe. Reference weather, day-of-week, season — something specific. End with ONE emoji that captures the mood.
Examples: "Morning Rich — light rain on the school run ☔" / "Tuesday's looking gentle 🌤" / "Big one ahead today 🚀"

[BODY — 2-3 sentences] What's on TODAY specifically. Events, who's where, dinner plans, anything time-sensitive. Use specifics — names from the FAMILY list, times from the data, items from shopping. Optional ONE emoji at end if natural.
Example: "Grab jackets for Poppy and Gab. Duke's swim is tonight at 4:30 — on the radar. Low on milk if pancakes are on the cards 🥞"

[ONE THING — 1 sentence] A single actionable nudge. Lead with "One thing:" or similar phrasing. The MOST useful thing Rich could do right now. ONE emoji at end if it fits.
Example: "One thing: plumber reminder goes off at 10am — genuinely worth the call 🔧"

Quiet-day mode: opener + ONE THING only is fine. Lead with personality, drop the body if there's no data to fill it honestly.
`;
  }
  // evening — covers today's wrap AND tomorrow-morning prep
  return common + `
EVENING BRIEF (this one) — the "wrap today + ready tomorrow" brief, fires 16:00-04:59:
- MAX 100 words total across all paragraphs
- NEVER open with a task or action item
- 3-paragraph structure (drop a paragraph if data is thin):

[OPENER — 1 line] Acknowledgement of the day. Calm, reflective, real. NEVER an action. End with ONE emoji.
Examples: "Solid Thursday, Rich 🌙" / "A quiet one wrapped 🛋" / "You earned the pause tonight 🌿"

[TOMORROW — 2-3 sentences] What's coming tomorrow morning. Dinner state, early starts, weather, anything they'd thank you for surfacing now so it's not a scramble at 7am. This brief replaces the old morning prep — so do NOT save it for sunrise. Use specifics. Optional ONE emoji.
Example: "Gab's soccer at 8am, Poppy's dentist 3pm. Nothing else on. School fees still flagged for Friday morning."

[ONE THING — 1 sentence] A prep nudge for tomorrow. Lead with "One thing:" or similar. ONE emoji at end if natural.
Example: "One thing: lay out Duke's swim gear tonight — Friday mornings get messy 🩳"

Quiet-evening mode: opener + ONE THING only is fine. If tomorrow is genuinely clear, celebrate the lull — don't manufacture stuff to mention.
`;
}

// ── Context packaging ────────────────────────────────────────────────────
function formatContext(ctx: FamilyContext, win: BriefWindow, now: Date): string {
  const timeStr = now.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true });
  const dayStr = now.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' });

  const parts: string[] = [];
  parts.push(`CURRENT TIME: ${timeStr} on ${dayStr}`);
  parts.push(`WINDOW: ${win}`);
  parts.push(`PRIMARY USER: ${ctx.primaryUser}`);
  parts.push(`FAMILY: ${ctx.memberNames.join(', ')}`);

  if (ctx.todayEvents.length === 0) {
    parts.push(`TODAY EVENTS: nothing scheduled`);
  } else {
    parts.push(`TODAY EVENTS: ${ctx.todayEvents.map(e => `${e.start_time ?? ''} ${e.title}`.trim()).join('; ')}`);
  }

  if (ctx.tomorrowEvents.length === 0) {
    parts.push(`TOMORROW EVENTS: nothing scheduled`);
  } else {
    parts.push(`TOMORROW EVENTS: ${ctx.tomorrowEvents.map(e => `${e.start_time ?? ''} ${e.title}`.trim()).join('; ')}`);
  }

  parts.push(`TONIGHT MEAL: ${ctx.tonightMeal?.name ?? 'not planned yet'}`);
  parts.push(`SHOPPING: ${ctx.shopCount} items on list${ctx.shopFlagged.length > 0 ? `, flagged: ${ctx.shopFlagged.join(', ')}` : ''}`);

  if (ctx.openTasks.length === 0) {
    parts.push(`OPEN TASKS (7 days): none`);
  } else {
    parts.push(`OPEN TASKS (7 days): ${ctx.openTasks.map(t => t.title).join('; ')}`);
  }

  if (ctx.weather) {
    parts.push(`WEATHER: ${ctx.weather.temp}\u00B0C ${ctx.weather.condition}`);
  }

  parts.push(`\nGenerate the ${win} brief now. Respond with JSON only.`);
  return parts.join('\n');
}

function computeSignature(ctx: FamilyContext): string {
  const s = [
    ctx.todayEvents.map(e => `${e.id}:${e.start_time}:${e.title}`).join('|'),
    ctx.tomorrowEvents.map(e => `${e.id}:${e.start_time}:${e.title}`).join('|'),
    ctx.tonightMeal?.name ?? '',
    String(ctx.shopCount),
    ctx.shopFlagged.join(','),
    ctx.openTasks.map(t => t.id).join('|'),
  ].join('~');
  return hashString(s);
}

// ── Parsing ──────────────────────────────────────────────────────────────
function parseSonnetResponse(raw: string): { text: string; chips: BriefChip[] } {
  // Strip code fences if present
  let cleaned = raw.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '');
  }
  try {
    const parsed = JSON.parse(cleaned);
    return {
      text: String(parsed.text || '').trim(),
      chips: Array.isArray(parsed.chips) ? parsed.chips.slice(0, 4) : [],
    };
  } catch (e) {
    return {
      text: cleaned.slice(0, 500),
      chips: [{ label: 'Got it', dismiss: true }],
    };
  }
}

// ── Main ─────────────────────────────────────────────────────────────────
export async function generateBrief(args: {
  familyId: string;
  window: BriefWindow;
  dateKey: string; // YYYY-MM-DD local
  context: FamilyContext;
}): Promise<BriefPayload> {
  const signature = computeSignature(args.context);

  // 1. Check cache
  const { data: cached } = await supabase
    .from('zaeli_briefs')
    .select('brief_text, chips, win_banner, data_signature')
    .eq('family_id', args.familyId)
    .eq('date_key', args.dateKey)
    .eq('time_window', args.window)
    .single();

  if (cached && cached.data_signature === signature) {
    return {
      text: cached.brief_text,
      chips: cached.chips ?? [],
      fromCache: true,
    };
  }

  // 2. Regenerate via Sonnet with prompt caching on system prompt
  const systemPrompt = buildSystemPrompt(args.window);
  const userContext = formatContext(args.context, args.window, new Date());

  console.log('[brief-gen] sending to Sonnet. Context:\n', userContext);

  const response = await callClaude({
    feature: 'home_brief',
    familyId: args.familyId,
    body: {
      model: SONNET,
      max_tokens: 400,
      system: [
        { type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } },
      ],
      messages: [{ role: 'user', content: userContext }],
    },
  });

  // Sonnet responses from Anthropic come back as content: [{ type: 'text', text: '...' }]
  // Defensively extract, with fallback if structure differs
  let rawText = '';
  if (Array.isArray(response?.content)) {
    const textBlock = response.content.find((b: any) => b?.type === 'text') || response.content[0];
    rawText = textBlock?.text || '';
  } else if (typeof response?.content === 'string') {
    rawText = response.content;
  }
  console.log('[brief-gen] Sonnet response usage:', response?.usage);
  console.log('[brief-gen] Sonnet raw response:\n', rawText || '(empty — full response keys: ' + Object.keys(response || {}).join(',') + ')');

  if (!rawText) {
    console.warn('[brief-gen] Empty response — using fallback');
    return {
      text: 'Quiet one right now — nothing urgent on the radar.',
      chips: [{ label: 'All good', dismiss: true }],
      fromCache: false,
    };
  }

  const parsed = parseSonnetResponse(rawText);

  const inputTokens = response?.usage?.input_tokens ?? 0;
  const outputTokens = response?.usage?.output_tokens ?? 0;

  // 3. Upsert cache
  await supabase.from('zaeli_briefs').upsert({
    family_id: args.familyId,
    date_key: args.dateKey,
    time_window: args.window,
    brief_text: parsed.text,
    chips: parsed.chips,
    win_banner: null,
    model: SONNET,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    data_signature: signature,
    generated_at: new Date().toISOString(),
  }, { onConflict: 'family_id,date_key,time_window' });

  return {
    text: parsed.text,
    chips: parsed.chips,
    fromCache: false,
  };
}
