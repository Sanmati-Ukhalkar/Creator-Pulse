# Carousel Engine Implementation Task List

Below is the structured, phase-by-phase implementation plan for the Local DB architecture (Supabase removed).

## Phase 1: Database & Core Infrastructure Setup
- [x] **Task 1.1:** Initialize the 4 new PostgreSQL tables (`carousel_jobs`, `carousel_slides`, `design_templates`, `carousel_exports`) via SQL migrations. Add necessary foreign key relationships.
- [x] **Task 1.2:** Add indexes on `carousel_jobs.user_id` and `carousel_slides.job_id` to ensure speedy application-level authorization queries.
- [x] **Task 1.3:** Setup the local Redis instance (for both the BullMQ queue and atomic quota logic).
- [x] **Task 1.4:** Prepare a local file storage directory (or local MinIO/S3 compatible blob storage setup) for `png_slides` and `carousel_exports`.

## Phase 2: Core API & Quota System
- [x] **Task 2.1:** Implement the `POST /api/carousel/generate` endpoint.
- [x] **Task 2.2:** Add application-level JWT parsing to extract `user_id`.
- [x] **Task 2.3:** Implement string length guarding (`topic` max 250 characters).
- [x] **Task 2.4:** Implement atomic Redis quota handling (`INCR` checks for the `{user_id}:{date}` key limit).
- [x] **Task 2.5:** Validate the `idempotency_key` via Redis.
- [x] **Task 2.6:** Insert job to the local Postgres DB `carousel_jobs` and enqueue it to BullMQ.

## Phase 3: AI Workers (Content Brain & Carousel Planner)
- [x] **Task 3.1:** Set up base Python BullMQ `Worker` loop and Redis connection logic.
- [x] **Task 3.2:** Implement **Step A (Content Brain)**: Connect to GPT-4o-mini, force structured JSON (Pydantic schema), read from static prompt TXT files, and update DB.
- [x] **Task 3.3:** Implement **Step B (Carousel Planner)**: Break focus down into 5-6 structured slides using GPT-4o. Write the 5-6 empty proxy slide records to `carousel_slides`.

## Phase 4: Map-Reduce Workers (Enhancer & Design)
- [x] **Task 4.1:** Implement **Step C (Slide Enhancer)**: Create the mapping function that expands each Slide.
- [x] **Task 4.2:** Implement BullMQ `FlowProducer` topology: Step C must dispatch individual slide enhancement jobs and specify **Step D (Design Engine)** as the parent job.
- [x] **Task 4.3:** Implement **Step D (Design Engine)**: Parse all child results, map layout & rules deterministic output (no LLMs), and save layout tokens to DB.

## Phase 5: Render Microservice (Node.js)
- [x] **Task 5.1:** Scaffold a lightweight minimal Express/Fastify Node service restricted strictly to localhost logic.
- [x] **Task 5.2:** Install `puppeteer` with necessary sandbox flags (`--no-sandbox` if local docker, or just strict mode).
- [x] **Task 5.3:** Set up the HTML/CSS templates. Ensure network isolation (`request.abort()` for any external script/image requests). 
- [x] **Task 5.4:** Implement the `POST /render` route, which takes JSON tokens, replaces HTML securely (`textContent`), generates the PNG, and saves the file locally. Returns internal local file paths.

## Phase 6: Export Engine & Cleanup
- [x] **Task 6.1:** Implement **Step F (Export Engine)** in the Python worker.
- [x] **Task 6.2:** Read isolated PNG files from local storage, bundle to ZIP, and compose an A4 PDF via `reportlab`/`img2pdf`.
- [x] **Task 6.3:** Complete the job transition to `status = done`, and integrate into the preexisting `drafts` table.
- [x] **Task 6.4:** Implement Error handlers & Dead Letter Queue hooks: If anything fatally fails, refund the user API quota via Redis `DECR`.
- [x] **Task 6.5:** Setup a daily automated cron task for stale local storage cleanup and stale DB row purging.

## Phase 7: Frontend Integration
- [x] **Task 7.1:** Modify the `<TopicInput />` logic to post to the `generate` endpoint and transition UI state to progress.
- [x] **Task 7.2:** Implement Polling or SSE locally: Continually query `GET /api/carousel/:id` (using the JWT auth) rather than trying to use removed Supabase Realtime subscriptions. 
- [x] **Task 7.3:** Scaffold `<SlidePreviewGrid />` which uses authenticated local proxy endpoints to access images securely without exposing raw folder paths.
- [x] **Task 7.4:** Connect `<ExportBar />` bindings for ZIP/PDF final downloads upon job completion.
