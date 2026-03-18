# Zaeli — Build Tracker
*Last updated: 18 March 2026 — Session 8*

---

## ROI Key
- 🟢 ROI boost — directly increases revenue or retention
- 🟡 ROI medium — important but indirect revenue impact
- ⚪ ROI neutral — compliance, polish, completeness
- 🔴 Cost risk — must do before scaling or costs blow out

---

## Tier 1 — Before Any Real Users
*Revenue is blocked without these*

| # | Feature | Why | ROI | Effort |
|---|---|---|---|---|
| 1 | **Usage cap** (500 msgs/month) | One power-user family costs A$50+/month without this. Must ship before any paying customers. | 🔴 Cost risk | 1 session |
| 2 | **Homework module** | Turns A$15 family → A$35. Biggest single revenue lever. Socratic method, Sonnet, grade-aware. | 🟢 +A$20/family | 2 sessions |
| 3 | **Whisper AI** (voice input) | A$0.09/month per family. Makes "ask Zaeli first" feel natural. Low cost, high UX impact. Add now for testing. | 🟢 UX + testing | 1 session |
| 4 | **Multi-user / family sync** | Families won't stay if only one person can use the app. Core retention requirement. | 🟢 Retention | 2–3 sessions |
| 5 | **Website** (zaeli.app) | Nowhere to send people without this. Needed for trial signups and web-first distribution. | 🟢 Revenue gate | 1–2 sessions |
| 6 | **Stripe + onboarding UX** | Trial → paid conversion flow. No revenue without this. 7-day trial, email capture, plan selection. | 🟢 Revenue gate | 2–3 sessions |
| 7 | **Privacy policy + T&Cs** | Required for App Store, payment processing, and any Australian consumer product. | ⚪ Compliance | 0.5 sessions |

---

## Tier 2 — Core Product Completeness
*Retention and stickiness*

| # | Feature | Why | ROI | Effort |
|---|---|---|---|---|
| 8 | **Kids Hub** (jobs + rewards) | Makes kids active app users, not just subjects. Drives daily opens and family engagement. | 🟢 Retention | 2 sessions |
| 9 | **Family module** | Profiles, permissions, parent controls. Needed once multi-user is live. | 🟡 Foundation | 1 session |
| 10 | **To-do module** (full build) | Currently a stub. Full task management with assignees, priorities, due dates, recurring tasks. | 🟡 Core feature | 1–2 sessions |
| 11 | **Notes module** | Family notes, Zaeli-assisted drafting. Light lift, adds completeness to the platform. | ⚪ Completeness | 1 session |
| 12 | **Push notifications** | Reminders, meal prep alerts, kids job nudges. Critical for daily active use habit formation. | 🟢 Retention | 1–2 sessions |
| 13 | **Calendar integration** (Google/Apple) | Two-way sync with existing family calendars. High request likelihood from real families. | 🟡 Stickiness | 2 sessions |
| 14 | **Settings** (full build) | Notification prefs, family management, subscription details, data export. Needed pre-launch. | ⚪ Completeness | 1 session |
| 15 | **Spoonacular integration** | Live recipe search, pantry matching, nutritional data. Adds ~A$0.005/lookup cost. Worth it for meal UX. | 🟡 Meal UX | 1–2 sessions |

---

## Tier 3 — Differentiation + Delight
*Word of mouth and premium feel*

| # | Feature | Why | ROI | Effort |
|---|---|---|---|---|
| 16 | **Holidays module** | School holidays, public holidays, family trip planning. High emotional value for Aussie families. | 🟡 Delight | 1 session |
| 17 | **Zaeli memory improvements** | Remembers allergies, favourites, routines across sessions. Makes Zaeli feel genuinely personal. | 🟢 Retention | 1–2 sessions |
| 18 | **ElevenLabs** (voice output) | A$0.46–1.85/month per family. Nice to have but adds cost without clear revenue uplift. Post-launch only. | ⚪ Delight | 1 session |
| 19 | **Meal planning improvements** | Weekly nutritional view, budget tracking, prep time totals. Adds depth to existing screen. | ⚪ Polish | 1 session |
| 20 | **Shopping improvements** | Store-specific aisle mode, shared list editing in real time, budget tracking. | ⚪ Polish | 1 session |
| 21 | **Parent controls** | Pin-lock features, approve kids actions, content restrictions. Important for family trust. | 🟡 Trust | 1 session |

---

## Tier 4 — Scale and Operations
*When you have real users*

| # | Feature | Why | ROI | Effort |
|---|---|---|---|---|
| 22 | **Admin console updates** | Match all new features — homework usage, voice costs, per-feature analytics by family. | ⚪ Ops | Ongoing |
| 23 | **App Store submission** | TestFlight, review process, compliance. Required for iOS distribution beyond your own device. | 🟡 Distribution | 1–2 sessions |
| 24 | **Analytics for families** | Spending trends, meal variety, task completion rates. Adds value and increases stickiness. | ⚪ Retention | 1 session |
| 25 | **Data export / GDPR** | Families can export their data. Required for Australian privacy compliance at scale. | ⚪ Compliance | 0.5 sessions |
| 26 | **Offline mode** | Read-only when no internet. Nice to have but complex to build. Post-launch only. | ⚪ Polish | 2 sessions |
| 27 | **Backup / restore** | Family data safety. Important at scale but Supabase handles most of this automatically. | ⚪ Safety | 0.5 sessions |

---

## Summary

| Tier | Items | Est. sessions |
|---|---|---|
| Tier 1 — Before any real users | 7 | ~10–12 |
| Tier 2 — Core completeness | 8 | ~11–14 |
| Tier 3 — Differentiation | 6 | ~7–9 |
| Tier 4 — Scale + ops | 6 | ~6–8 |
| **Total** | **27** | **~34–43 sessions** |

---

## Next 3 Sessions (recommended order)
1. **Usage cap** — protect margin before any real users
2. **Whisper AI** — voice input, cheap, improves testing
3. **Homework module** — biggest revenue lever

---

*Maintained alongside CLAUDE.md and new-chat-handover.md*
