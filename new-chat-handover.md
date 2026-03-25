## Zaeli App — New Chat Handover
*25 March 2026 — Sessions 17-18 complete. Copy this entire message to start a new chat.*

---

Hi! I'm continuing development of **Zaeli** — an iOS-first AI family life platform built in React Native / Expo. We've been building this together across many sessions. Please read CLAUDE.md carefully before we start — it's in the repo root.

---

### How I like to work
- I'm a **beginner developer** — always give me **full file rewrites** I can copy-paste, never partial diffs
- **Two fixes at a time** — bulk changes cause too many variables when something breaks
- One PowerShell command at a time, never chained with &&
- Explain what you're doing in plain English before code
- **Design before code** — for any new screen, discuss and show an HTML mockup first
- Always ask to upload the current working file before editing — never build from memory

---

### Who I am
- My name is Richard. Logged-in user is Anna
- Family: Anna, Richard, Poppy (Yr6, age 12, girl), Gab (Yr4, age 10, BOY — Gabriel, he/him), Duke (Yr1, age 8, boy)
- Local path: C:\Users\richa\zaeli (Windows, PowerShell)
- PowerShell escape: app\`(tabs`)\filename.tsx
- Repo: https://github.com/RDK1981/zaeli (private)
- Admin: https://incomparable-gumdrop-32e4ba.netlify.app

---

### Key constants
```
DUMMY_FAMILY_ID = '00000000-0000-0000-0000-000000000001'
SONNET    = 'claude-sonnet-4-20250514'   ← correct (NOT claude-sonnet-4-6)
GPT_MINI  = 'gpt-4.1-mini'
CRITICAL: OpenAI = max_completion_tokens. Claude = max_tokens. Never mix.
```

---

### What's been built (as of 25 Mar 2026)

**index.tsx — Home chat (PRIMARY — replaces zaeli-chat.tsx)**
- Zaeli home screen IS the chat — splash → chat, entry screen removed
- Anthropic Claude tool-calling for calendar events, todos, shopping items
- Tools: add_calendar_event, update_calendar_event (with search_date), delete_calendar_event, add_todo, add_shopping_item
- Whisper voice → auto-transcribes → sends to chat
- autoMic param: navigating from calendar with autoMic:'true' auto-starts recording
- seedMessage param: navigating with seedMessage pre-fills and sends a message
- Photo upload via calendarScan param — reads image, passes to Anthropic vision
- Events context fetches start_time (NOT 'time') across 7-day window, limit 20

**calendar.tsx — Calendar screen**
- Full time grid (48px/hour, 0am-midnight, auto-scrolls to now-2hrs)
- Day strip with multi-colour family dots
- Month view with legend and selected day preview
- Add/edit/delete events (manual form + Zaeli AI path)
- All-day event lane
- Overlap detection with conflict badges
- CalendarChatBar: typed text properly linked to send button via calendarChatSubmitRef
- Scan photo: camera or library → stores URI → passes to home → Zaeli reads it
- Chat bar: position:absolute inside contentWrap (position:relative), pushed up by KAV

**zaeli-chat.tsx — DEPRECATED**
- Replaced by index.tsx as primary chat interface

**Other screens — all complete:**
- shopping.tsx, mealplanner.tsx, more.tsx, tutor.tsx, tutor-child.tsx, tutor-session.tsx

---

### CANONICAL CHAT BAR SPEC (apply to every screen)

See ZAELI-CHAT-BAR-SPEC.md in outputs. Key points:

```typescript
// Wrapper: position:absolute, bg:transparent
inputArea: { position:'absolute', bottom:0, left:0, right:0, paddingH:14, paddingBottom: iOS?30:18, paddingTop:10, bg:'transparent' }
inputAreaKb: { paddingBottom: iOS?8:6 }  // when keyboard open

// Pill
barPill: { flexDirection:'row', alignItems:'center', gap:8, borderRadius:30, paddingVertical:14, paddingHorizontal:16, borderWidth:1, shadow }

// Icons (all 20×20 SVG except send which is 16×16)
IcoPlus: 20×20, stroke rgba(0,0,0,0.4)
IcoMic:  20×20, stroke rgba(10,10,10,0.32)
IcoSend: 16×16, stroke #fff, on barSend (32×32, borderRadius:16, bg:#FF4545)

// KAV structure (EXACT — do not deviate)
<KAV behavior=padding offset=0>
  <View style={contentWrap}>  // flex:1, position:relative
    <ScrollView/>
    <View style={[inputArea, keyboardOpen && inputAreaKb]}/>  // absolute inside contentWrap
  </View>
</KAV>
```

---

### Calendar troubleshooting — current state

As of 25 Mar 2026, the calendar is mostly working. Known remaining issues to verify:

1. **Event CRUD via chat** — add/update/delete all implemented with tool-calling. update_calendar_event preserves event duration when only start time is changed, and uses search_date to find the right occurrence. Verify these work consistently.

2. **Photo scan → event creation** — camera/library picker → stores URI via getPendingCalendarImage/setPendingCalendarImage → navigates home with calendarScan:'true' → home reads URI, calls send(text, imgUri) → Anthropic vision reads image → Zaeli extracts event details. Needs end-to-end verification.

3. **Day strip scroll** — strips scrolls to approximately today using onLayout callback. May still land slightly off. PILL_W=54 accounts for pill width + gap.

4. **Chat bar keyboard behaviour** — inputArea is position:absolute inside contentWrap (position:relative), all inside KAV. This matches index.tsx exactly. Keyboard listeners fire keyboardWillShow/Hide to switch inputAreaKb.

5. **Console logs** — diagnostic console.log statements are still in send() and executeTool() from debugging. These can be removed once everything is confirmed working.

---

### Critical architecture reminders

**Navigation:** Always `router.navigate()` — never `router.push()` (stacks copies) or `router.replace()` (crashes when called from inside Modals)

**Date handling:** Always local date construction — NEVER toISOString().split('T')[0] (UTC shifts in AEST)

**Events table:** Column is `start_time` NOT `time`. Context query must select `start_time`.

**Model strings:** `claude-sonnet-4-20250514` (NOT claude-sonnet-4-6). `gpt-4.1-mini` (NOT gpt-5.4-mini — old name).

**Image picker:** Use `['images'] as any` NOT deprecated `MediaTypeOptions.Images`

**Keyboard:** KAV wraps contentWrap (position:relative) which contains ScrollView + inputArea (position:absolute). inputAreaKb reduces paddingBottom from 30 to 8 when keyboard is open.

---

### Immediate next steps

1. Verify calendar event add/update/delete all working end-to-end
2. Verify photo scan → Zaeli vision → event creation
3. Remove console.log diagnostic statements from index.tsx send() and executeTool()
4. tutor-practice.tsx UX review
5. tutor-reading.tsx UX review
6. Home brief quality pass (zaeli-brief-logic-spec.md)

---

### Tech reminders
- Always npx expo start --dev-client after changes
- Import paths from app/(tabs)/: ../../lib/supabase, ../../lib/api-logger, ../../lib/zaeli-provider
- Supabase: rsvbzakyyrftezthlhtd (Sydney, ap-southeast-2)
- Admin file: C:\Users\richa\Downloads\zaeli-admin\index.html → drag to Netlify to redeploy

---

**Please confirm you've read this and CLAUDE.md. First priority: verify calendar event CRUD is working, then clean up console.log statements.**
