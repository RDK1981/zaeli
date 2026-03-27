# CLAUDE.md — Zaeli Project Context
*Last updated: 27 March 2026 — Session 22 complete (Calendar polish, mic wiring, admin logging, chat icons)*

---

## Who You Are Talking To
- **Richard** — beginner developer. Always give **full file rewrites**, easy copy-paste PowerShell commands, one step at a time
- Never give partial diffs or targeted edits unless it's a single truly isolated line
- Always explain what you're doing in plain English before diving into code
- Family: Rich (logged-in user), Anna, Poppy (Yr6, age 12, girl), Gab (Yr4, age 10, BOY — Gabriel, always he/him), Duke (Yr1, age 8, boy)
- Local path: `C:\Users\richa\zaeli` (Windows, PowerShell — no && chaining)
- Repo: https://github.com/RDK1981/zaeli (private)
- PowerShell rule: (tabs) folder needs backtick escaping: app\`(tabs`)\filename.tsx
- Full file rewrites only — never partial diffs
- Design before code — always discuss/mockup new screens before writing code
- **Two fixes at a time max** — bulk changes create too many variables when something breaks

---

## The Business

Zaeli is an iOS-first AI family life platform for Australian families with children.

**Revenue model:**
- Family plan: A$14.99/month
- Homework add-on: A$9.99/child/month
- 100% web sales (no App Store cut)

**Unit economics (updated 27 Mar 2026):**
- GPT-5.4 mini chat: ~A$0.003/msg (~250 in / 750 out tokens avg)
- Calendar chat (Sonnet): ~A$0.009/msg (~1,800 in / 100 out tokens avg)
- Realistic family monthly API cost: ~A$1.50–2.50 → ~83–85% margin
- Only Home generates a brief on cold open — no brief on channel transitions

---

## Zaeli Persona

Core: Anne Hathaway energy — smart, warm, magnetic.
- Australian warmth. NEVER "mate" or "guys"
- Never start with "I"
- No asterisks or markdown bold in spoken responses — plain text only
- NEVER sound like a push notification or task manager
- Never ends on a bare open question — always offers something specific first

---

## Stack
- React Native + Expo (iOS-first), dev build on iPhone 11 Pro Max (bundle ID com.zaeli.app)
- Supabase (Postgres, Sydney ap-southeast-2, ID: rsvbzakyyrftezthlhtd)
- Claude Sonnet (`claude-sonnet-4-20250514`) — calendar tool-calling + vision/scan
- OpenAI GPT-5.4 mini (`gpt-5.4-mini`) — Home chat/briefs
- OpenAI Whisper-1 — voice transcription (Home + Calendar)
- expo-router, expo-image-picker, expo-av, react-native-svg
- Poppins font (UI), DMSerifDisplay (hero titles only)
- No bottom tab bar — no channel nav UI — Zaeli is the only navigation

---

## Key Constants
```
DUMMY_FAMILY_ID = '00000000-0000-0000-0000-000000000001'
FAMILY_ID       = '00000000-0000-0000-0000-000000000001'
SONNET          = 'claude-sonnet-4-20250514'  ← CORRECT (NOT claude-sonnet-4-6)
GPT_MINI        = 'gpt-5.4-mini'             ← CORRECT (NOT gpt-4.1-mini — retired Feb 2026)
WHISPER_URL     = 'https://api.openai.com/v1/audio/transcriptions'
CRITICAL: OpenAI = max_completion_tokens. Claude = max_tokens. Never mix.
```

---

## API Logging (WORKING as of 27 Mar 2026)
```
Table: api_logs
Columns: family_id, feature, model, input_tokens, output_tokens, cost_usd, created_at
CRITICAL: column is input_tokens / output_tokens — NOT prompt_tokens / completion_tokens
CRITICAL: total_tokens column does NOT exist — never insert it
CRITICAL: always use await on supabase insert — silent failures were the logging bug

Feature names in use:
  home_brief            → Home cold-open brief (GPT)
  chat_response         → Home chat messages (GPT)
  calendar_chat         → Calendar Zaeli conversation (Sonnet)
  chat_vision           → Claude vision photo scan (Sonnet)
  whisper_transcription → Voice recording transcription (Whisper)
```

---

## Navigation Model (LOCKED)

**There is no channel navigation UI anywhere in the app.**
- No hamburger menu, no grid, no tab bar, no channel switcher
- Zaeli is the only navigation mechanism
- Avatar (top right) opens: Settings, Billing, Our Family, Tutor (premium badge)
- Always `router.navigate()` — never `router.push()` or `router.replace()`
- DEV ONLY: 📅 button next to Home avatar → navigates to Calendar (remove pre-launch)

---

## Channel Architecture (LOCKED)

```
app/(tabs)/index.tsx       → Home channel          ✅ Complete (Session 20)
app/(tabs)/calendar.tsx    → Calendar channel       ✅ Complete (Session 22)
app/(tabs)/shopping.tsx    → Shopping channel       Needs colour refactor
app/(tabs)/mealplanner.tsx → Meals channel          Needs colour refactor
app/(tabs)/kids.tsx        → Kids Hub channel       Not built
app/(tabs)/todos.tsx       → To-dos channel         Not built
app/(tabs)/notes.tsx       → Notes channel          Not built
app/(tabs)/travel.tsx      → Travel channel         Not built
app/(tabs)/family.tsx      → Our Family channel     Not built
app/(tabs)/tutor.tsx       → Tutor (standalone premium — NOT a channel)
```

---

## Pill System (LOCKED)

**Portal pills:** Filled bg = destination channel bg colour. Chevron in accent colour. Max 3.
**Quick reply chips:** White bg, ink border `rgba(0,0,0,0.15)`. Never navigate.

---

## Per-Channel Colour System (LOCKED)

| Channel | Banner bg | AI colour (letters/eyebrow/send/pills) | Accent dark |
|---------|-----------|----------------------------------------|-------------|
| Home | `#F5EAD8` | `#A8D8F0` Sky Blue | `#0A7A3A` |
| Calendar | `#B8EDD0` | `#F0C8C0` Warm Blush | `#0A7A3A` |
| Shopping | `#F0E880` | `#D8CCFF` Lavender | `#6A6000` |
| Meals | `#FAC8A8` | `#A8E8CC` Fresh Green | `#C84010` |
| Kids Hub | `#A8E8CC` | `#FAC8A8` Warm Peach | `#0A6040` |
| Tutor | `#D8CCFF` | `#A8E8CC` Fresh Green | `#5020C0` |
| To-dos | `#F0DC80` | `#D8CCFF` Lavender | `#806000` |
| Notes | `#C8E8A8` | `#F0C8C0` Warm Blush | `#2A6010` |
| Travel | `#A8D8F0` | `#B8EDD0` Soft Mint | `#0060A0` |
| Our Family | `#F0C8C0` | `#D8CCFF` Lavender | `#A01830` |

**The rule:** AI colour = eyebrow star = send button bg = portal pill bg. Send arrow always ink `#0A0A0A`.
**Exception:** Calendar send button uses `#B8EDD0` mint (matches page bg).

---

## Family Member Colours (LOCKED)
```
Rich:  #4D8BFF  ← logged-in user
Anna:  #FF7B6B
Poppy: #A855F7
Gab:   #22C55E
Duke:  #F59E0B
```

---

## Splash Screen (LOCKED)
- Bg: `#A8E8CC` Aqua Green, hold 3s → Home channel
- Wordmark: DM Serif 96px, ink + `#FAC8A8` peach on 'a' and 'i', bounces in
- Greeting: "Good morning/afternoon/evening, Rich 👋" Poppins 400 18px
- Tagline: "LESS CHAOS. MORE FAMILY." Poppins 500 12px uppercase
- Dots: 3 × 6px `#FAC8A8` peach, orbs top-right and bottom-left

---

## Home Channel — Design (LOCKED Session 20)

### Fixed top bar
- Wordmark: DM Serif 40px, ink + sky blue ai letters
- Right: "Home" Poppins 600 16px + Rich avatar 36×36 blue circle
- DEV: 📅 calendar shortcut between label and avatar (remove pre-launch)
- Divider `rgba(10,10,10,0.08)` below

### Brief
- GPT returns `{"hero":"[bracketed] key words","detail":"prose","replies":["..."]}`
- Hero: DM Serif 28px, [brackets] → italic DM Serif spans
- Detail: Poppins 17px / lineHeight 27 chat message, brackets stripped
- Placeholder cycles 4s: "Chat with Zaeli…" → "Or just speak…" → "Ask anything…"
- Mic: `#F5C8C8` blush 26px, 32×32 touch target — when recording shows animated WaveformBars
- Send: `#A8D8F0` sky blue, ink arrow

### Chat message render (Home — replicate in all channels)
- Zaeli eyebrow: star icon (blush rounded square 16×16) + "ZAELI" label + timestamp right
- Zaeli text: Poppins 400 17px / lineHeight 27 / letterSpacing -0.1
- Zaeli icon row: Play, Copy, Forward, ThumbUp (highlights ai colour), ThumbDown
- User bubble: `#F2F2F2` bg, Poppins 400 17px / lineHeight 27
- User icon row (right-aligned): timestamp, Copy, Forward

---

## Calendar Channel — Design (LOCKED Session 22)

### Banner — two rows, mint `#B8EDD0` bg
- Row 1: zaeli 40px (blush ai letters) + "Calendar" 15px Poppins 600 + Rich avatar 36×36
- Row 2: full-width Day/Month toggle

### Day strip — white bg, PINNED above fixed divider
- 7 days back + 120 days forward (127 total)
- Auto-scrolls on load to position 7 × 54px = today anchors left edge
- Month view = escape hatch for dates older than 7 days
- ACC red today pill, Poppins 700 Bold numbers, family colour dots under dates

### Fixed divider — permanent scroll boundary

### Event Card spec (ONE component — used in Day, Month, Home inline)
- Tinted bg: primary assignee colour + `'2E'` hex (18% opacity), no left accent bar
- Emoji: auto-assigned by `getEventEmoji()` keyword matching (40+ patterns)
- Title: Poppins 600 18px
- Time: Poppins 500 14px, coloured to primary assignee colour
- Location: shown below time as "📍 location" if present
- Avatars: RIGHT side, dynamic sizing by count:
  - 1-2 members: 28×28, col layout
  - 3 members: 24×24, col layout
  - 4+ members: 22×22, 2-col wrap grid, maxWidth 64
- Conflict: red tinted panel + dot inline
- Tap → EventDetailModal

### Event Detail Modal
- View mode: shows time, 📍 location (separate row), 📝 notes (separate row)
- Edit mode: location field above notes field, saves as "notes | location"
- Title: Poppins 700 Bold (not DM Serif)

### Zaeli opening prompt — seeded as real message on mount (no API call)
- Fires once when events load for today
- 0 events: "Nothing locked in today — want to add something?"
- 1 event: "Quiet one — just [title]. Anything to add or change?"
- 3+ events: "[X] things on today. Need anything added, moved, or flagged?"
- Conflict detected: leads with the conflict

### Month view
- Numbers: Poppins 500 Medium (not DM Serif)
- Month name: Poppins 700 Bold
- Tap date → events appear below grid; Toggle → Day jumps to selected date

### Chat (Calendar)
- Self-contained Anthropic tool-calling (Option A — Sonnet)
- Tools: add/update/delete calendar_event
- `assignees` is array type in schema with full family mapping in description
- System prompt includes: today's date+day, pre-computed next 7 days dates, explicit family assignee shortcuts
- PAST DATE RULE in prompt: never schedule to past, flag and suggest future alternative
- PHOTO SCAN RULE in prompt: flag past dates from scans, ask for next occurrence
- One shared thread across Day and Month views
- Photo scan handled locally (no navigation to Home)
- Mic: fully wired — tap to record → Whisper transcription → auto-send → logged

### Chat message render (Calendar — matches Home exactly)
- Zaeli: blush star icon eyebrow, Poppins 400 17px / lineHeight 27, icon row (Play/Copy/Forward/ThumbUp/ThumbDown)
- User: `#F2F2F2` bubble, Poppins 400 17px, icon row (Copy/Forward)
- Thumbs up highlights in `CAL_AI` blush

### Scroll behaviour
- Scroll-down arrow: dark circle, animated fade, taps to scroll to end (replicated from Home)
- "View events" pill: white frosted, bottom-right corner, appears when scrolled past events
- Keyboard open/closed: pill position adjusts to maintain consistent gap above chat bar

### Known remaining issues / not yet built
- Home inline calendar render — next major feature
- Shopping channel colour refactor
- Admin dashboard: photo scan (chat_vision) badge colour to add

---

## CANONICAL CHAT BAR SPEC

```
barPill (borderRadius:30, paddingVertical:14, paddingHorizontal:16, borderWidth:1, shadow)
  ├── barBtn 34×34 → IcoPlus 20×20 stroke rgba(0,0,0,0.4)
  ├── barSep 1×18px rgba(10,10,10,0.1)
  ├── TextInput fontSize:15 Poppins_400Regular
  ├── barMicBtn 32×32 → IcoMic 26px #F5C8C8 (idle)
  │   OR barWaveBtn 40×40 borderRadius 20 bg=channel ai colour → WaveformBars (recording)
  └── barSend 32×32 borderRadius:16 bg=channel send colour → IcoSend 16×16 ink #0A0A0A
```

KAV `backgroundColor:'#fff'` → contentWrap (relative, `backgroundColor:'#fff'`) → ScrollView + inputArea (absolute bottom:0)

**Green/colour bleed fix:** KAV must have `backgroundColor:'#fff'` to prevent channel bg colour bleeding behind keyboard.

---

## Voice Recording Pattern (Home + Calendar)
```typescript
// State
const [isRecording, setIsRecording] = useState(false);
const recordingRef = useRef<Audio.Recording | null>(null);

// Start
await Audio.requestPermissionsAsync();
await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
recordingRef.current = recording;
setIsRecording(true);

// Stop → Whisper → auto-send
await recordingRef.current.stopAndUnloadAsync();
const uri = recordingRef.current.getURI();
// POST to WHISPER_URL → get transcript → sendMessage(transcript)

// Log
supabase.from('api_logs').insert({ feature: 'whisper_transcription', model: 'whisper-1', input_tokens: 0, output_tokens: 0, cost_usd: durationSec/60 * 0.006 });
```

---

## Tool-Calling

**index.tsx:** add_calendar_event, update_calendar_event, delete_calendar_event, add_todo, add_shopping_item
**calendar.tsx:** add_calendar_event, update_calendar_event, delete_calendar_event (self-contained Option A)

**Critical rules:**
- `assignees` is array type `['1','2','3','4','5']` — NOT a string
- search_date (YYYY-MM-DD) narrows update/delete to right occurrence
- New events default assignees: `['2']` (Rich only)
- "whole family" → `['1','2','3','4','5']`, "the kids" → `['3','4','5']`
- NEVER schedule to past — flag and ask user to confirm
- System prompt pre-computes next 7 days as exact dates — model looks up, never calculates

---

## Supabase Tables
```
events         → date, start_time (ISO local), end_time, assignees (jsonb), notes, all_day (boolean)
todos          → family_id, title, priority, status, due_date
shopping_items → family_id, name, category, quantity, checked
pantry_items   → family_id, name, category, stock_level
receipts       → family_id, store, purchase_date, total_amount, items (jsonb)
meal_plans     → family_id, date, meal_name, recipe_id
recipes        → family_id, name, ingredients, instructions
family_members → family_id, name, colour, role
api_logs       → family_id, feature, model, input_tokens, output_tokens, cost_usd, created_at
tutor_sessions → family_id, child_id, subject, messages (jsonb)

NOTE: events.notes stores "notes | location" — split on ' | ' to separate
NOTE: events.all_day added Session 22 — alter table events add column all_day boolean default false;
```

---

## Admin Dashboard
- URL: https://incomparable-gumdrop-32e4ba.netlify.app
- Deploy: drag `index.html` onto Netlify site dashboard
- Feature badge colours: blue=home_brief/chat, green=calendar_chat, gold=shopping, pink=chat_vision, orange=whisper_transcription
- Logging confirmed working for: home_brief, calendar_chat, whisper_transcription (27 Mar 2026)

---

## Coding Rules
- SafeAreaView edges={['top']} always
- No floating FAB
- Logo taps = router.navigate('/(tabs)/')
- PowerShell: no && — separate lines
- Always npx expo start --dev-client after changes
- Image picker: use `['images'] as any`
- Date: always local construction — NEVER toISOString() (UTC/AEST shift)
- KAV must have backgroundColor:'#fff' to prevent colour bleed behind keyboard
- Always await supabase inserts — silent failures are the #1 logging bug

---

## Next Priorities (Session 23)

1. **Home inline calendar render** — EventCards render inline in Home chat when Zaeli shows calendar data; portal pill "See full calendar →" below. Discuss approach first.
2. **Shopping channel colour refactor** — apply `#F0E880` / `#D8CCFF` colour system
3. **Meals channel colour refactor**
4. **New channels** — kids, todos, notes, travel, family
5. **Pre-launch** — new EAS build (keyboard tint), remove AI toggle from more.tsx, replace DUMMY_FAMILY_ID with real auth, website + Stripe + onboarding
