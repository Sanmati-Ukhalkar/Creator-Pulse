## CreatorPulse Implementation Plan

Status tags: [Done], [In progress], [Next], [Deferred]

### Phase 0 — Core fixes and wiring [Done]
- Sources: aligned `sync_status`, wired Sync button, RSS validation via edge function.
- Drafts: basic edit dialog (title/text) with persistence to `drafts`.
- Onboarding: persist `creator_profiles`, `content_samples`, `delivery_preferences`.
- Delivery: schedule from Drafts and Delivery Scheduling; Queue shows statuses; edit scheduled deliveries.

### Phase 1 — Delivery UX polish [Done]
- Retry failed deliveries
  - Add “Retry” in Queue to set `status='scheduled'` and `scheduled_for=now()+2m`.
  - Acceptance: item returns to Scheduled; processor can pick it up.
- Queue filters/refresh
  - Manual Refresh; filters by platform/type/date.
- Timezone consistency
  - Store UTC; render in user timezone; 9:00 remains 9:00 locally. [Note: local rendering added; full normalization scheduled if needed.]

### Phase 2 — Email delivery MVP (Brevo) [Deferred until sender/domain ready]
- Edge function `process-delivery` sends via Brevo SMTP API.
- Required secrets: `BREVO_API_KEY`, `BREVO_FROM_EMAIL` (non‑Gmail), `BREVO_FROM_NAME` (optional).
- Cron: Supabase Scheduled Function POST body `{ "minutesAhead": 1 }` every minute.
- Acceptance: due schedules flip to sent/failed; logs visible in Brevo.

### Phase 3 — Real LLM outputs [Next]
- Enable real generation and topic research (OpenAI).
  - Secret: `OPENAI_API_KEY`.
- Feedback loop MVP
  - `draft_feedback` (👍/👎/reason); acceptance rate card on Drafts.

### Phase 4 — Draft editor improvements [In progress]
- Edit hashtags/mentions; platform character counts; autosave; visual previews.

### Phase 5 — Social ingestion [In progress]
- Twitter URL import [Done]
  - Manual import via tweet URL (oEmbed); stored in `ingested_contents`; visible under Intelligence → Latest Ingested Content.
  - UI: “Import Tweet by URL” in Sources.
- Twitter API ingestion [Hardened but Limited]
  - since_id support, 429 handling with retry-after messaging; however free limits remain restrictive → de‑prioritized.
- RSS ingestion [Next]
  - Current: Core path implemented in `content-scraper` → `scrapeRSSFeed`, and Add RSS Source + validate via `validate-rss` function.
  - Next work:
    1) QA end‑to‑end (add feed, validate, sync, see items under Intelligence).
    2) Improve parsing: prefer `<content:encoded>`/full text, sanitize HTML, capture main image into `metadata`.
    3) Incremental fetch: cache `metrics.last_item_guid_or_date` to avoid re‑ingesting older items.
    4) UX: add “Sync All RSS Sources” and better per‑source error messages.
    5) Optional: scheduled sync (Supabase Scheduled Function) for active RSS sources.

### Source analytics [Next]
- Per‑source daily metrics (posts analyzed, errors, last_sync_at, last_scrape_count).

### Phase 6 — Delivery expansion [Next]
- “Run delivery now” (admin) button to invoke `process-delivery` with `scheduleId`.
- Channel templates (email formatting presets); future: WhatsApp.

### Phase 7 — Analytics & KPIs [Next]
- Pipeline stats: totals, scheduled, sent, failed.
- Creator KPIs: acceptance rate, cadence, time‑to‑send.

### Phase 8 — Auth & OAuth [Next]
- Social OAuth (Twitter/LinkedIn/Instagram) for ingestion/publishing.
- MFA (Supabase) hardening.

### Phase 9 — Billing & Plans [Later]
- Stripe subscriptions (free/pro), usage quotas, portal.

### Phase 10 — Agency features [Later]
- Multi‑client profiles, roles, approvals.

---

## Environments & Secrets
- Current (no email): none required.
- Phase 2 (Brevo): `BREVO_API_KEY`, `BREVO_FROM_EMAIL`, `BREVO_FROM_NAME` (optional). From must be a verified domain/sender (not Gmail).
- Phase 3 (LLM): `OPENAI_API_KEY`.
- Cron: Supabase Scheduled Function → POST `/functions/v1/process-delivery` with `{ "minutesAhead": 1 }`.

## QA / Smoke Tests
- Draft edit: change title/text → reload → persists.
- Schedule: create 2–5 min ahead; appears in Scheduled; edit time/date → updates.
- Retry: failed → retry → shows in Scheduled.
- Processor: POST with `{ "minutesAhead": 10 }` or `{ "scheduleId": "…" }` → statuses update.
- Onboarding/Profile: update name/email in Settings → saved to `creator_profiles`.

## Current Status Snapshot
- Phase 0: completed.
- Delivery Queue: edit working; shows scheduled/processing/sent/failed.
- Email: deferred until verified sender/domain.

## Next Up (suggested order)
1. RSS ingestion polish: full‑text parsing, incremental fetch, Sync All, QA
2. Rich draft editor (hashtags/mentions, counters)
3. Real LLM outputs (requires `OPENAI_API_KEY`)
4. “Run delivery now” button
5. Source analytics + KPIs & dashboard cards


