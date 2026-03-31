# Zaeli — New Chat Handover
*31 March 2026 — Shopping rebuild ✅ Chat persistence ✅ Calendar arrows + persistence ✅ Copy this entire message to start a new chat.*

---

## Hi! Continuing development of Zaeli.

Zaeli is an iOS-first AI family life platform built in React Native / Expo. Please read **CLAUDE.md** before we start — full stack, architecture, colours, coding rules. Then **ZAELI-PRODUCT.md** for product vision and all module specs.

---

## How I like to work
- **Beginner developer** — always full file rewrites, never partial diffs
- **Two fixes at a time** — bulk changes = too many variables
- One PowerShell command at a time, never chained with &&
- Plain English before code
- **Design before code** — mockup first for any new channel
- Always ask me to upload the current working file before editing — never build from memory

---

## Who I am
- Richard. **Logged-in user = Rich**
- Family: Rich, Anna, Poppy (Yr6, 12, girl), Gab (Yr4, 10, BOY — Gabriel, he/him), Duke (Yr1, 8, boy)
- Local path: `C:\Users\richa\zaeli` (Windows, PowerShell)
- PowerShell escape: `app\`(tabs`)\filename.tsx`
- Repo: https://github.com/RDK1981/zaeli (private)
- Admin: https://incomparable-gumdrop-32e4ba.netlify.app

---

## Key constants (CRITICAL — never get these wrong)
```
DUMMY_FAMILY_ID = '00000000-0000-0000-0000-000000000001'
SONNET          = 'claude-sonnet-4-20250514'  ← NOT claude-sonnet-4-6
GPT_MINI        = 'gpt-5.4-mini'             ← NOT gpt-4.1-mini (retired)
OpenAI = max_completion_tokens · Claude = max_tokens
api_logs = input_tokens / output_tokens (NO total_tokens column)
KAV must have backgroundColor:'#fff'
always await supabase inserts
Send button = #FF4545 coral ALWAYS
Our Family = NO chat bar
Channel body bg = #FAF8F5 warm white — never full colour bleed
No left-border accent strips on cards — dots, icons, badges only
isActionQuery() runs BEFORE isCalendarQuery()
Apostrophes in JSX: always double-quoted strings
expo-file-system: import as 'expo-file-system/legacy'
Do NOT use @react-native-async-storage — requires native rebuild, use expo-file-system instead
```

---

## What's built (31 Mar 2026)

### index.tsx — Home ✅ COMPLETE
- inlineData pattern for all inline renders
- Tool-calling: add/update/delete events, todos, shopping items
- isActionQuery() before isCalendarQuery() routing
- isFullCalendarRequest() — renders today's events + Open Calendar portal pill
- Brief chips in hero banner ONLY
- Whisper voice. API logging working.
- **HOME CARD STACK REDESIGN LOCKED** — full spec in CLAUDE.md

### calendar.tsx — Calendar ✅ COMPLETE (updated 31 Mar)
Two-row mint banner. Day strip. Event cards. Month view. Tool-calling. Whisper. Mic overlay.
**NEW:** Chat persistence (24hr via expo-file-system) · Up/down scroll arrows · Greeting guard (skips if returning user has messages) · Chip rules fixed (action-only, never "Show tomorrow")

### shopping.tsx — Shopping ✅ MAJOR REBUILD COMPLETE (31 Mar)
**Full rebuild this session:**
- **Colour:** Yellow `#F0E880` → Lavender `#EDE8FF` (yellow looked mustard on iPhone)
- **Logo 'a' and 'i':** `#A8E8CC` mint (not lavender — clashes)
- **AI model:** GPT mini JSON hack → Claude Sonnet with proper two-pass tool-calling
- **Chat:** Three separate chats → One shared chat across List/Pantry/Spend (Calendar model)
- **Context:** Full live context every call — shopping list + pantry stock + receipts
- **Tools:** add_shopping_item · remove_shopping_item · tick_shopping_item · clear_shopping_list
- **guessCategory:** Now local keyword lookup — zero API calls (was 5× Sonnet calls per add)
- **Persistence:** 24hr via useChatPersistence('shopping')
- **Chat rendering:** Full Calendar-style (eyebrow, star, timestamp, icons, chips)
- **Quick reply chips:** Claude appends [chips: a|b|c] → parseChips() strips before display
- **Scroll arrows:** Up/down side-by-side floating pair (bottom-right)
- **Pantry rows:** Flat design (no white card bubbles) matching list rows
- **Spend card:** Mint `#A8E8CC` monthly summary

### lib/use-chat-persistence.ts ✅ NEW (31 Mar)
Shared hook for all channels. expo-file-system storage. 24hr TTL. 30-message rolling cap.
Debounced saves. Strips stuck isLoading states. Greeting guard via `loaded` flag.
```typescript
const { messages, setMessages, clearMessages, loaded } = useChatPersistence('shopping');
// Keys: 'shopping' | 'calendar' | 'home' (next) | 'meals' (next) | 'todos' (next)
```

### Admin dashboard ✅
https://incomparable-gumdrop-32e4ba.netlify.app · March 2026: A$3.17 / 1,048 calls.

---

## CANONICAL CHAT BAR SPEC (LOCKED ✅ — apply to every channel)

```
barPill: borderRadius:30, paddingVertical:14, paddingHorizontal:16, borderWidth:1
  bg:#fff, borderColor:rgba(10,10,10,0.09)
  ├── barBtn 34×34 → IcoPlus
  ├── barSep 1×18px rgba(10,10,10,0.1)
  ├── TextInput fontSize:15 Poppins_400Regular maxHeight:100 multiline
  ├── barMicBtn 32×32 → IcoMic color="#F5C8C8" size={26}   ← blush, size 26
  │     OR barWaveBtn 40×40 borderRadius:20 bg=channel AI colour (when recording)
  └── barSend 32×32 borderRadius:16 bg=#FF4545              ← CORAL ALWAYS
inputArea: position:absolute bottom:0 paddingBottom: iOS?30:18 paddingHorizontal:14
KAV: behavior=padding backgroundColor='#fff'
```

---

## SCROLL ARROWS SPEC (LOCKED ✅ — apply to every channel)

All scrollable channels: side-by-side up/down floating arrows, bottom-right, above chat bar.
```
scrollArrowPair: position:absolute, bottom:110, right:16, flexDirection:row, gap:8, zIndex:50
scrollArrowBtn:  width:38, height:38, borderRadius:19, bg:rgba(10,10,10,0.40)
Up → scrollTo({y:0}) · Down → scrollToEnd()
```
**Implemented:** Shopping ✅ · Calendar ✅
**Next:** Home (card stack rebuild) · Meals · Todos

---

## CHAT PERSISTENCE SPEC (LOCKED ✅)

`lib/use-chat-persistence.ts` — expo-file-system (no native rebuild needed).
24hr TTL · 30-message cap · debounced saves · strips isLoading on restore.
**Greeting guard:** `if (!chatLoaded || messages.length > 0) return;` before firing opening brief.
**Implemented:** Shopping ✅ · Calendar ✅
**Next:** Home · Meals · Todos (wire during their respective builds)

---

## CHAT MESSAGE RENDERING SPEC (Calendar-style — all channels)

**Zaeli:** Eyebrow row (star badge channel AI colour + "Zaeli" + timestamp right) · Poppins 400 17px lineHeight 27 · chips row · icon row (copy/forward/thumbUp/thumbDown)
**User:** #F2F2F2 grey bubble right-aligned · timestamp + copy/forward below
**Chips:** borderWidth:1.5, white bg, Poppins 400 12px — ACTION ONLY, never display/show/list

---

## QUICK REPLY CHIP RULES (ALL channels — LOCKED)

Never suggest chips implying Zaeli can DISPLAY or LIST data the user already sees on screen.
- Calendar: never "Show tomorrow", "Show this week", "Any conflicts?" → Add/Edit/Move/Delete only
- Shopping: never "Check the pantry" (Zaeli has pantry data in context already)
- All: chips = things Zaeli can actually DO

---

## Immediate next tasks (in priority order)

1. **Meals colour refactor** — `mealplanner.tsx` · wire useChatPersistence('meals') during refactor
2. **Home card stack rebuild** — `index.tsx` · wire useChatPersistence('home') · upgrade to up/down arrows · full spec in CLAUDE.md + `zaeli-home-card-tweaks-v2.html`
3. **Create reminders Supabase table** (SQL in ZAELI-PRODUCT.md)
4. **Todos + Reminders channel** — `todos.tsx` · 5-screen spec in `zaeli-todos-reminders-v2.html`
5. **Kids Hub** — `kids.tsx`
6. **Our Family** — `family.tsx`
7. **Notes** — `notes.tsx`
8. **Tutor rebuild** — `zaeli-tutor-final-mockup-v4.html`
9. **Travel** — design session first

---

## Key design decisions (don't revisit without reason)
- Shopping banner: `#EDE8FF` lavender (not yellow — looked mustard on iPhone)
- Shopping logo 'a' and 'i': `#A8E8CC` mint (not lavender — clashes on banner)
- Shopping send button: `#FF4545` coral (not lavender — locked rule)
- Single chat across all shopping tabs (Calendar model)
- Claude Sonnet for all tool-calling channels (not GPT mini — hallucination risk)
- expo-file-system for persistence (not AsyncStorage — requires native rebuild)
- Up/down arrows side-by-side bottom-right (not centred single arrow)
- Chips = actions only, never display verbs
- No floating FAB anywhere
- Hamburger menu only navigation
- Channel body bg = `#FAF8F5` warm white always

---

## Tech reminders
- `npx expo start --dev-client` after copying files (`--clear` for bundle issues)
- Import paths from `app/(tabs)/`: `../../lib/supabase`
- expo-file-system: `import * as FileSystem from 'expo-file-system/legacy'`
- Supabase: `rsvbzakyyrftezthlhtd` (Sydney)
- Admin deploy: drag `C:\Users\richa\Downloads\index.html` to Netlify
- Windows dev environment — no && chaining in PowerShell

---

**Read CLAUDE.md and ZAELI-PRODUCT.md first. Always ask Richard to upload the current file before editing.**
