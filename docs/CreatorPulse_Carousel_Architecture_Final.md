# CREATORPULSE: Carousel Engine
*Implementation Architecture - Version 3.0 (Local DB Hardened)*

Production-Ready • Async-First • Security-Hardened • Race-Condition Proof

---

## 1. Overview & Design Principles

The Carousel Engine is a structured content-to-image generation pipeline inside CreatorPulse. It converts a topic or trending idea into a fully designed, export-ready LinkedIn carousel. The architecture is production-grade: fully asynchronous, security-hardened at every agent boundary, and built for horizontal scaling from day one.

### 1.1 Core Principles
*   **ASYNC FIRST:** Zero LLM or HTML-to-Image rendering work runs in the HTTP request path. Every heavy operation is background-queued. The API always returns in under 200ms.
*   **GUARD EVERY BOUNDARY:** Every LLM output is validated with a strict Pydantic schema before it is persisted or passed downstream. Bad output fails the step and triggers a retry.
*   **RENDER ISOLATED:** HTML-to-image rendering runs in a dedicated Node microservice, separate from all AI workers. It cannot touch the database, operates under an enforced network-sandbox, has its own resource limits, and scales independently.
*   **RACE-CONDITION PROOF:** All quota checks and limits leverage atomic operations. Parent/child queue workflows are used for reliable map-reduce fan-out/fan-in steps.

### 1.2 Integration into CreatorPulse
The Carousel Engine integrates with existing systems:
*   **Input:** RSS/Trend Discovery feed pre-populates topics.
*   **Output:** Carousels auto-create records in the existing `drafts` table with `format = carousel` and `status = approved`.
*   **Auth:** Leverages existing local application JWT auth layer payload validation.

---

## 2. End-to-End System Flow

### Phase 1 — Request Intake (Synchronous, <200ms)
User submits a validated topic. The backend:
1. Validates the JWT context.
2. Performs an atomic quota check (using Redis `INCR` to prevent TOCTOU concurrency bypass).
3. Validates the `idempotency_key` via Redis (TTL 24 hours).
4. Creates a `carousel_jobs` record in the local PostgreSQL database (`status = queued`).
5. Drops a job message onto BullMQ and returns `202 Accepted` with the `job_id`.

### Phase 2 — Async Worker Pipeline (Background)
A scalable pool of Python/FastAPI workers pulls jobs from the BullMQ queue and executes a series of sequential and parallel steps. BullMQ manages job states and retries (with exponential backoff). If all retries exhaust, the job enters a Dead Letter Queue, marks the DB `status = failed`, and triggers a quota refund (decrementing the Redis quota key).

### Phase 3 — Result Delivery (Polling / SSE)
The frontend utilizes a hybrid observer pattern:
1. On page load, it performs a GET request to fetch the current job status.
2. It sets up a Server-Sent Event (SSE) stream or executes short-polling to track `carousel_jobs` changes via API endpoints (which enforce application-layer user ID ownership filters).
3. When `status = done`, the backend verifies ownership and generates short-lived signed URLs (15-min TTL) or local proxies for downloads.

---

## 3. Pipeline Step Specifications

| # | Step | Responsibility | Model / Tool | Output Store |
| :--- | :--- | :--- | :--- | :--- |
| **A** | **Content Brain** | Decide angle, tone, audience. | GPT-4o-mini | `carousel_jobs` |
| **B** | **Carousel Planner** | Build 5-6 slide blueprint. | GPT-4o | `carousel_slides` |
| **C** | **Slide Enhancer** | Headline + subtext per slide. (Parallel Map) | GPT-4o-mini | `carousel_slides` |
| **D** | **Design Engine** | Assign layout + tokens. | Rule-based | `carousel_slides` |
| **E** | **Render Engine** | HTML template to PNG per slide. | Puppeteer Node Service | Local Storage / S3 |
| **F** | **Export Engine** | Bundle PNG ZIP + construct PDF. | py (zip/pdf) | `carousel_exports` |

*(Detailed logic for each step remains largely the same as V1, with critical additions to strict prompt-isolation and BullMQ Flow mapping for step C -> D).*

### Step C & D Interaction (Hardened Fan-Out / Fan-In)
*   **Vulnerability Addressed:** Race conditions when waiting for all 6 slides to finish parallel processing.
*   **Solution:** Use BullMQ's native `FlowProducer`. Step C creates a parent job (Step D) that natively depends on 6 child jobs (individual slide enhancements). BullMQ guarantees Step D only executes exactly once when all 6 Step C children are completely resolved.

---

## 4. Render Microservice (Hardened against SSRF / Exfiltration)

Responsibility: Converts each slide's complete data into a PNG. Runs completely isolated from Python backend.

### Security Defenses
*   **Network Sandbox:** Puppeteer explicitly intercepts and aborts ANY external network request (`request.abort()`). This ensures if a payload somehow injects an image or iframe tag, it cannot hit an internal AWS metadata endpoint (SSRF) or exfiltrate data.
*   **Input Sanitization:** Entity-escapes all strings. The render service accepts only strong-typed JSON, preventing generic malicious HTML. Text is injected safely via `textContent` dynamically instead of raw `innerHTML`.
*   **Resource Limits:** 15s timeout per render, `--disable-dev-shm-usage`, `--no-sandbox` strictly governed if running in heavily sandboxed containers (like Docker minimal constraints). Max 3 concurrent renders per node.

---

## 5. Security & Stability Checklist

### 5.1 Quota TOCTOU (Time-Of-Check-To-Time-Of-Use) Fix
*   Instead of `SELECT COUNT(*)` from the DB, generation endpoints will use a **Redis Atomic Counter** scoped to `{user_id}:{YYYY-MM-DD}`. 
*   `INCR` limit up to max quota. If exceeded, return `429 Too Many Requests`. This entirely prevents abuse if a user sends 50 requests at the exact same millisecond. 
*   If a background job reaches the `failed` state and goes to the DLQ, a hook fires to `DECR` the Redis quota token to refund the user.

### 5.2 Strict Input Validations
*   **Validation:** `topic` lengths are capped at `250` characters at the API boundary, rejecting larger payloads with `400 Bad Request` before hitting the database or queuing system. This prevents DoS and context window blowouts.

### 5.3 Stale Data / Ghost Runs Garbage Collection
*   **Problem:** Aborting a run, crashing mid-render, or orphaned storage uploads slowly leak cloud storage and DB rows.
*   **Solution:** A daily cron job triggers to purge:
    *   `carousel_jobs` stuck in `queued`, `rendering`, etc. for > 2 hours.
    *   Local storage/S3 PNGs older than 24 hours (carousels are temporary until finalized/downloaded).

### 5.4 Application-Level Authorization (No Supabase RLS)
*   Since RLS is removed, every API endpoint and database query MUST have explicit user filtering.
*   **carousel_jobs:** Explicitly execute `WHERE user_id = incoming_jwt.user_id` on all `SELECT, UPDATE, DELETE` ops.
*   **carousel_slides:** Verified through the `carousel_jobs` join.
*   **Storage Access:** APIs proxy signed or validated requests to internal stored files to prevent unauthorized enumeration.

---

## 6. Implementation Order & Milestones

1. **DB Migrations:** Setup 4 tables in Postgres (`carousel_jobs`, `carousel_slides`, `design_templates`, `carousel_exports`).
2. **Infrastructure Prep:** Configure local application Redis, BullMQ connections, atomic quota check scaffolding.
3. **Core API Sync Layer:** Build `POST /generate` endpoint enforcing token lengths, local JWT contexts, and atomic rate limits.
4. **LLM Chain Workers:** Setup Steps A and B. Implement strict Pydantic parsing.
5. **Fan-out/Fan-in Flow Producers:** Build Steps C and D utilizing BullMQ Parent/Child architecture.
6. **Isolated Rendering Environment:** Create Node Puppeteer service, implement network SSRF restrictions and template rendering to local storage.
7. **Packaging & Cleanup:** Step F for Python ZIP/PDF assembling, plus the DLQ refund/cron cleanup mechanisms.
8. **Frontend Integration:** Setup `TopicInput`, `GenerationProgress` (hydration on mount + API Polling/SSE), and `ExportBar`.

---
*End of Design Document.*
