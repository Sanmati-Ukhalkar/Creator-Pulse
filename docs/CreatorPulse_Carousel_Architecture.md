+-----------------------------------------------------------------------+
| **CREATORPULSE**                                                      |
|                                                                       |
| **Carousel Engine**                                                   |
|                                                                       |
| *Implementation Architecture*                                         |
|                                                                       |
| Production-Ready • Async-First • Security-Hardened                    |
+-----------------------------------------------------------------------+

  ----------------- ----------------- ----------------- -----------------
  **Version 1.0**   **Ready for Dev** **3 Services**    **7-Step
                                                        Pipeline**

  ----------------- ----------------- ----------------- -----------------

**1. Overview & Design Principles**

The Carousel Engine is a structured content-to-image generation pipeline
inside CreatorPulse. It converts a topic or trending idea into a fully
designed, export-ready LinkedIn carousel. The architecture is
production-grade: fully asynchronous, security-hardened at every agent
boundary, and built for horizontal scaling from day one.

**1.1 Three non-negotiable principles**

  ---------- ------------------------------------------------------------
  **ASYNC    Zero LLM or rendering work runs in the HTTP request path.
  FIRST**    Every heavy operation is background-queued. The API always
             returns in under 200ms.

  ---------- ------------------------------------------------------------

  ------------ ------------------------------------------------------------
  **GUARD      Every LLM output is validated with a strict Pydantic schema
  EVERY        before it is persisted or passed downstream. Bad output
  BOUNDARY**   fails the step --- it never propagates.

  ------------ ------------------------------------------------------------

  ------------ ------------------------------------------------------------
  **RENDER     HTML-to-image rendering runs in a dedicated Node
  ISOLATED**   microservice, separate from all AI workers. It cannot touch
               the database, has its own resource limits, and is
               independently scalable.

  ------------ ------------------------------------------------------------

**1.2 How it fits into existing CreatorPulse**

The Carousel Engine integrates with three existing systems. The
RSS/Trend Discovery feed pre-populates the topic input, so users can tap
a trending topic directly into carousel generation. When a carousel is
complete, it automatically creates a record in the existing drafts table
with format = carousel and status = approved, feeding your existing
content pipeline and LinkedIn scheduling flow without any parallel
system. User authentication uses your existing Supabase Auth JWT --- no
new auth layer is needed.

**2. End-to-End System Flow**

The pipeline runs across three phases. Phase 1 is synchronous and
completes in under 200ms. Phases 2 and 3 are fully asynchronous.

+-----------------------------------------------------------------------+
| **Phase 1 --- Request Intake**                                        |
|                                                                       |
| *Synchronous · Always completes in \<200ms · No LLM work*             |
+-----------------------------------------------------------------------+

User submits a topic from the frontend. The backend validates the JWT,
checks the user\'s daily quota, checks the idempotency key to prevent
duplicate submissions, creates a carousel_jobs row in Supabase with
status = queued, drops one job message onto the BullMQ queue, and
immediately returns 202 Accepted with the job_id. The HTTP request is
done. The user sees a live progress screen powered by Supabase Realtime.

+-----------------------------------------------------------------------+
| **Phase 2 --- Async Worker Pipeline**                                 |
|                                                                       |
| *Background · Independent workers · Each step persists before passing |
| forward*                                                              |
+-----------------------------------------------------------------------+

A pool of Python workers pulls the job off the queue and executes six
sequential steps. Each step persists its output to Supabase before the
next step begins. If any step fails, BullMQ retries it up to three times
with exponential backoff. If all retries are exhausted the job is moved
to the Dead Letter Queue and the job status is set to failed, which
triggers a Supabase Realtime notification to the frontend.

+-----------------------------------------------------------------------+
| **Phase 3 --- Result Delivery**                                       |
|                                                                       |
| *Frontend-driven · Realtime subscription · Short-TTL signed URLs*     |
+-----------------------------------------------------------------------+

When the pipeline completes, the final worker sets job status to done.
The frontend, which has been subscribed to carousel_jobs changes via
Supabase Realtime since Phase 1, receives this update and triggers a GET
/api/carousel/:id request. The backend verifies the requesting user owns
the job, generates short-lived signed URLs (15-minute TTL) for each PNG,
and returns the full slide data. The user sees the preview grid and can
download the export.

**3. Pipeline Step Specifications**

Six worker steps execute in sequence inside Phase 2. The table below
summarises each step. Full specifications follow.

  -------- --------------- -------------------- --------------- ------------------
  **\#**   **Step**        **Responsibility**   **Model**       **Persists to**

  **A**    **Content       Decide angle, tone,  GPT-4o-mini     carousel_jobs
           Brain**         audience                             

  **B**    **Carousel      Build 5--6 slide     GPT-4o          carousel_slides
           Planner**       blueprint                            

  **C**    **Slide         Headline + subtext   GPT-4o-mini     carousel_slides
           Enhancer**      per slide                            

  **D**    **Design        Assign layout +      No LLM (rules)  carousel_slides
           Engine**        design tokens                        

  **E**    **Render        HTML template → PNG  Node            Supabase Storage
           Engine**        per slide            microservice    

  **F**    **Export        Bundle PNG ZIP + PDF No LLM (Python) carousel_exports
           Engine**                                             
  -------- --------------- -------------------- --------------- ------------------

**Step A --- Content Brain**

Responsibility: Receives the raw topic and produces the strategic
framing for all downstream steps.

-   Input: { topic, user_id, voice_profile_id (optional --- from
    existing voice training) }

-   Output: { topic, angle, tone, target_audience, format }

-   Angle values (enum): bold \| educational \| controversial \|
    storytelling

-   Tone values (enum): founder \| expert \| relatable \| provocateur

-   Model: GPT-4o-mini --- this is a framing decision, not complex
    reasoning. Mini is sufficient and 10x cheaper.

-   Guard: Pydantic strict model. All four fields required. Angle and
    tone must match enums exactly. Any deviation = step fails → retry.

-   If voice_profile_id is provided, the system prompt injects the
    user\'s voice descriptors from the existing voice training table.

**Step B --- Carousel Planner**

Responsibility: Breaks the framed topic into a logical 5--6 slide
narrative sequence. This is the most important step --- it determines
the story quality of the carousel.

-   Input: Full output from Step A

-   Output: Array of slide objects: { slide_order, slide_type, idea }

-   Slide type values (enum): hook \| insight \| example \| stat \|
    comparison \| cta

-   Slide count: minimum 5, maximum 6

-   Model: GPT-4o --- the structural narrative logic benefits from the
    stronger model. This is the one step where quality directly
    determines whether someone would share the carousel.

-   Guard: Validate slide count (5--6). Validate all slide_type values
    against enum. Validate idea field is non-empty and under 200
    characters. Sanitize: strip any markdown, HTML, or special
    characters from idea text.

-   Narrative rules enforced in system prompt: first slide must be hook
    type, last slide must be cta type, no two consecutive slides of the
    same type.

**Step C --- Slide Enhancer**

Responsibility: Converts each raw idea into visual-ready slide content.
Runs as parallel sub-jobs --- all 6 slides are enhanced concurrently,
not sequentially.

-   Input: One slide object from Step B per sub-job

-   Output: { headline, subtext (optional), visual_description }

-   Headline rule: maximum 8 words, enforced by guard

-   Subtext rule: maximum 15 words if present, enforced by guard

-   Visual description: plain English description of what should appear
    visually (e.g. \"minimalist bar chart showing 3x growth\" or
    \"single bold statistic centered\")

-   Model: GPT-4o-mini --- short creative text generation. Mini is fully
    capable.

-   Guard: Word count enforcement on headline and subtext. Strip all
    HTML. Reject if headline is empty. Validate visual_description is
    under 100 characters.

-   Fan-out: BullMQ child jobs, one per slide. Fan-in: Step D only
    starts when all 6 child jobs are complete.

**Step D --- Design Engine**

Responsibility: Assigns layout, color, and typography tokens to each
slide. Pure rule-based logic --- no LLM. This is what guarantees visual
consistency across all slides.

-   Input: Enhanced slide objects from Step C

-   Output: Per-slide design token object: { layout, color_scheme,
    font_size, elements\[\] }

-   Layout rule: hook slides → centered_bold, insight slides →
    left_heavy, stat slides → centered_minimal, cta slides →
    centered_action

-   Color scheme: locked to user\'s selected template (dark_modern is
    default MVP template). Template is fetched from design_templates
    table.

-   Font size rule: determined by headline word count. 1--3 words →
    large, 4--6 words → medium, 7--8 words → small.

-   Elements array: rule-based mapping of visual_description keywords to
    visual element types (e.g. \"chart\" → bar_chart_placeholder,
    \"stat\" → big_number, \"list\" → icon_bullets).

-   No LLM call. This step is pure deterministic mapping and takes under
    50ms.

**Step E --- Render Engine**

Responsibility: Converts each slide\'s complete data into a PNG image.
Runs as a dedicated Node.js microservice, fully isolated from the Python
AI workers.

-   Architecture: Separate Node.js service, not inside FastAPI. Accepts
    POST requests from the Python workers via internal HTTP.

-   Rendering stack: Puppeteer (Node-native) renders a Jinja2-equivalent
    HTML template to PNG at 1080x1080px at 2x resolution (2160x2160px
    output).

-   Template: One HTML/CSS file per design template in the
    design_templates table. The render service injects slide data into
    the template and screenshots it. Templates are pure HTML/CSS --- no
    JavaScript in templates, no external resource loading.

-   Security: Templates are server-controlled files, never
    user-controlled. The render service accepts only a JSON payload of
    typed design tokens --- no raw HTML, no raw text injected into
    templates unsanitized. All text values are HTML-entity-escaped
    before injection.

-   Resource limits: Each Puppeteer instance has a 15-second timeout.
    Maximum 3 concurrent renders per service instance. Memory limit
    enforced at container level.

-   Output: PNG written directly to Supabase Storage private bucket.
    Returns signed URL with 24-hour TTL to the worker (internal use only
    --- frontend gets its own short-TTL URLs at request time).

-   Isolation benefit: If the render service crashes, the Python workers
    are unaffected. The render step simply retries via BullMQ.

**Step F --- Export Engine**

Responsibility: Bundles all slide PNGs into a ZIP archive and a PDF
document for download.

-   Input: All PNG signed URLs for the job

-   ZIP: Python zipfile module. Downloads all PNGs from Supabase
    Storage, bundles them. Named 0_hook.png, 1_insight.png, etc.

-   PDF: reportlab or img2pdf. All slides assembled in order as
    full-page PDF at A4 / 1:1 aspect ratio.

-   Output: ZIP and PDF uploaded to Supabase Storage carousel_exports
    bucket. carousel_exports row created with both URLs.

-   Final action: Updates carousel_jobs.status to done. This Supabase
    row change is broadcast via Realtime to the frontend.

-   Draft integration: Creates a record in the existing CreatorPulse
    drafts table with format = carousel, status = approved, and a
    reference to the carousel_jobs.id.

**4. Database Schema**

Four new tables added to your existing Supabase PostgreSQL database. All
tables have Row Level Security enabled, tied to your existing
auth.users.

**4.1 carousel_jobs**

One row per generation request. Tracks the entire job lifecycle.

  ----------------- ------------- ----------------------------------------
  **Column**        **Type**      **Purpose**

  id                UUID PK       Primary key, auto-generated

  user_id           UUID FK       References auth.users --- RLS anchor

  idempotency_key   TEXT UNIQUE   Client-generated UUID --- prevents
                                  duplicate jobs

  topic             TEXT          Raw topic string from user input

  source_id         UUID FK       References existing sources table
                    nullable      (RSS/trend)

  angle             TEXT          Output from Content Brain (enum)

  tone              TEXT          Output from Content Brain (enum)

  target_audience   TEXT          Output from Content Brain

  status            TEXT          queued \| brain \| planning \| enhancing
                                  \| designing \| rendering \| exporting
                                  \| done \| failed

  template_id       UUID FK       References design_templates

  cost_usd          DECIMAL       Tracked after completion for quota
                    nullable      monitoring

  created_at        TIMESTAMPTZ   Auto-set on insert

  completed_at      TIMESTAMPTZ   Set when status = done
                    nullable      
  ----------------- ------------- ----------------------------------------

**4.2 carousel_slides**

One row per slide per job. Updated progressively as each pipeline step
completes.

  -------------------- ------------- ----------------------------------------
  **Column**           **Type**      **Purpose**

  id                   UUID PK       Primary key

  job_id               UUID FK       References carousel_jobs --- cascade
                                     delete

  slide_order          INT           Position in carousel (0-indexed)

  slide_type           TEXT          hook \| insight \| example \| stat \|
                                     comparison \| cta

  idea                 TEXT          Raw idea from Carousel Planner (Step B)

  headline             TEXT          Max 8 words --- from Slide Enhancer
                                     (Step C)

  subtext              TEXT nullable Max 15 words --- from Slide Enhancer

  visual_description   TEXT          Visual intent --- from Slide Enhancer

  layout               TEXT          Design token --- from Design Engine
                                     (Step D)

  color_scheme         TEXT          Design token --- from Design Engine

  font_size            TEXT          large \| medium \| small --- from Design
                                     Engine

  elements             JSONB         Array of visual element tokens from
                                     Design Engine

  png_url              TEXT nullable Internal Supabase Storage path (not
                                     signed URL)

  render_status        TEXT          pending \| rendered \| failed
  -------------------- ------------- ----------------------------------------

**4.3 design_templates**

Reusable brand configurations. Seeded at launch with the dark_modern MVP
template. User-selectable in future iterations.

  -------------------- ------------- ----------------------------------------
  **Column**           **Type**      **Purpose**

  id                   UUID PK       Primary key

  name                 TEXT          Template display name (e.g. dark_modern)

  config               JSONB         Full layout/color/font spec used by
                                     Design Engine

  html_template_path   TEXT          Path to HTML template file used by
                                     Render Engine

  preview_url          TEXT          Static preview image for template picker
                                     UI

  is_default           BOOLEAN       True for dark_modern at launch
  -------------------- ------------- ----------------------------------------

**4.4 carousel_exports**

Final output references. Created when Step F completes.

  ------------------ ------------- ----------------------------------------
  **Column**         **Type**      **Purpose**

  id                 UUID PK       Primary key

  job_id             UUID FK       References carousel_jobs

  pdf_storage_path   TEXT          Internal Supabase Storage path for PDF

  zip_storage_path   TEXT          Internal Supabase Storage path for ZIP

  created_at         TIMESTAMPTZ   Auto-set on insert
  ------------------ ------------- ----------------------------------------

**4.5 RLS Policies**

Every table requires these Row Level Security policies. These are
non-negotiable for data isolation.

-   carousel_jobs: SELECT, UPDATE, DELETE --- only where user_id =
    auth.uid()

-   carousel_slides: SELECT, UPDATE --- only via join to carousel_jobs
    where user_id = auth.uid()

-   carousel_exports: SELECT --- only via join to carousel_jobs where
    user_id = auth.uid()

-   Supabase Storage --- png_slides bucket: private, no public access.
    Signed URLs generated server-side only after auth check.

-   Supabase Storage --- carousel_exports bucket: private, same policy.

-   Supabase Realtime: Subscribe to carousel_jobs filtered by user_id =
    auth.uid(). Never subscribe to unfiltered table changes.

**5. Backend API Endpoints**

All endpoints live in /backend/src/routes/carousel.ts. All require a
valid JWT. All quota and idempotency checks happen synchronously before
any queue interaction.

  ------------ -------------------------- ------------------ --------------------------
  **Method**   **Path**                   **Response**       **Purpose**

  POST         /api/carousel/generate     202 { job_id }     Validate, quota check,
                                                             enqueue job

  GET          /api/carousel/:id          200 job + slides   Poll job state + slide
                                                             data

  GET          /api/carousel/:id/slides   200 slides\[\]     Get all enhanced slide
                                                             content

  GET          /api/carousel/:id/export   200 { pdf_url,     Generate short-TTL signed
                                          zip_url }          URLs

  GET          /api/carousel              200 jobs\[\]       List user\'s past
                                                             carousels

  DELETE       /api/carousel/:id          204                Delete job + slides +
                                                             storage files
  ------------ -------------------------- ------------------ --------------------------

**POST /api/carousel/generate --- detailed flow**

-   1\. Verify JWT → extract user_id

-   2\. Check daily quota: count carousel_jobs where user_id = auth and
    created_at \> today. Reject with 429 if over limit.

-   3\. Check idempotency_key: if a job with this key already exists for
    this user, return 200 with the existing job_id (no new job created).

-   4\. Create carousel_jobs row with status = queued

-   5\. Add job to BullMQ queue with job_id as payload

-   6\. Return 202 { job_id }

-   Total time: under 200ms. No LLM calls. No rendering.

**GET /api/carousel/:id/export --- security detail**

-   Verify JWT → extract user_id

-   Fetch carousel_jobs row --- verify job.user_id === requesting
    user_id. Return 403 if mismatch.

-   Verify job.status === done. Return 409 if not yet complete.

-   Generate signed URL for pdf_storage_path with TTL = 900 seconds (15
    minutes)

-   Generate signed URL for zip_storage_path with TTL = 900 seconds (15
    minutes)

-   Return both signed URLs. Signed URLs are never stored in the
    database --- generated fresh on every request.

**6. AI Service Structure**

The AI service is a Python/FastAPI application. Its only responsibility
in this architecture is to run the worker pipeline. It does not serve
the frontend directly. All worker steps are triggered by BullMQ via an
internal HTTP endpoint or a direct Python BullMQ worker binding.

**6.1 Directory structure**

-   ai-service/app/workers/ --- one file per pipeline step
    (brain_worker.py, planner_worker.py, enhancer_worker.py,
    design_worker.py, export_worker.py)

-   ai-service/app/guards/ --- one Pydantic model per step output
    (brain_output.py, planner_output.py, enhancer_output.py,
    design_output.py)

-   ai-service/app/prompts/ --- system prompts stored as .txt files, not
    hardcoded in Python

-   ai-service/app/services/supabase_client.py --- single shared
    Supabase client

-   ai-service/app/services/render_client.py --- HTTP client for calling
    the Render microservice

-   ai-service/app/queue.py --- BullMQ worker binding and job routing

**6.2 LLM call discipline**

-   Every LLM call uses response_format: json_object to force structured
    JSON output. Never parse free-form text.

-   Every LLM call has a timeout of 25 seconds. If it times out, the
    step raises an exception and BullMQ handles the retry.

-   System prompts are loaded from .txt files at startup, not
    constructed dynamically in Python. This prevents accidental prompt
    injection via f-string interpolation.

-   User-provided text (topic, voice descriptors) is injected into a
    fixed user message slot only --- never into the system prompt.

-   Temperature: 0.7 for Content Brain and Carousel Planner (creative
    decisions), 0.3 for Slide Enhancer (short deterministic copy).

**6.3 Cost model per carousel**

  ------------------ ---------------- --------------- --------------------
  **Step**           **Model**        **Est. tokens** **Est. cost**

  Content Brain      GPT-4o-mini      \~800           \~\$0.0005

  Carousel Planner   GPT-4o           \~1,200         \~\$0.006

  Slide Enhancer x6  GPT-4o-mini      \~300 x6        \~\$0.001

  Design Engine      No LLM           ---             \$0.000

  Total per carousel ---              \~3,800         \~\$0.008
  ------------------ ---------------- --------------- --------------------

*At 100 carousels per day: approximately \$0.80/day in LLM costs. The
total cost per carousel including compute is estimated at under \$0.02
end-to-end.*

**7. Render Microservice**

The Render Engine is a standalone Node.js service. It is not part of the
FastAPI AI service. It accepts internal HTTP POST requests from the
Python workers, renders one slide at a time to PNG, and uploads the
result to Supabase Storage.

**7.1 Why a separate service**

-   Puppeteer is Node-native. Running it inside Python requires a
    subprocess wrapper which adds latency, error handling complexity,
    and debugging pain.

-   The render service can be scaled independently from AI workers. If
    rendering becomes the bottleneck, you add render instances without
    touching the AI pipeline.

-   Isolation: a Puppeteer crash, memory leak, or zombie process cannot
    affect the AI workers or the backend API.

-   Security boundary: the render service has no database credentials.
    It only receives a typed JSON payload and writes to one specific
    Supabase Storage bucket via a scoped service key.

**7.2 Render service contract**

-   Input: POST /render with body { slide_id, template_id, headline,
    subtext, visual_description, layout, color_scheme, font_size,
    elements\[\] }

-   Processing: Load HTML template file by template_id. Inject all
    fields after HTML-entity-escaping. Launch Puppeteer, navigate to the
    rendered HTML as a data URL, screenshot at 1080x1080px with
    deviceScaleFactor=2.

-   Output: Upload PNG to Supabase Storage. Return { png_storage_path }
    to the calling worker.

-   Timeout: 15 seconds per render. If exceeded, return 500 and let
    BullMQ retry the parent step.

-   Concurrency: Maximum 3 simultaneous Puppeteer instances per service
    container.

-   No external network calls from inside the template: templates must
    not reference external fonts, images, or scripts. All assets are
    bundled into the template file.

**8. Security Checklist**

Every item below must be implemented before the first production
deployment. None of these are optional.

**8.1 Prompt injection prevention**

-   User-controlled text (topic string) is injected only into the user
    message, never into system prompts.

-   System prompts are static files loaded at startup. They are never
    constructed via string interpolation with user data.

-   Every LLM output is validated by a strict Pydantic model before use.
    If the model returns unexpected fields, extra keys, or mismatched
    types, the step fails and retries.

-   The Slide Enhancer strips all HTML tags and markdown from LLM output
    before persistence.

-   The Render Engine HTML-entity-escapes all injected values before
    inserting them into templates.

**8.2 Storage security**

-   All Supabase Storage buckets used by the carousel engine are
    private. There is no public bucket.

-   Storage paths never contain user_id or job_id in a guessable format.
    Use UUID v4 paths.

-   Signed URLs are generated with a maximum 15-minute TTL for frontend
    access.

-   The render service uses a separate Supabase service role key scoped
    to write-only access on the png_slides bucket. It cannot read, list,
    or delete.

-   The export engine uses a separate service role key scoped to
    write-only access on the carousel_exports bucket.

-   The backend API generates signed URLs only after verifying
    job.user_id === requesting user_id at the application layer, in
    addition to RLS at the database layer.

**8.3 Rate limiting and quotas**

-   API-level: express-rate-limit on POST /api/carousel/generate ---
    maximum 10 requests per minute per IP.

-   User-level quota: configurable daily generation limit per user tier.
    Checked synchronously in Phase 1. Default for MVP: 10 carousels per
    user per day.

-   Queue-level: BullMQ concurrency limit --- maximum 5 jobs processing
    simultaneously across all workers.

-   Render-level: 3 concurrent Puppeteer instances per render service
    container.

**8.4 Error handling and observability**

-   Every worker step wraps its execution in try/catch. On exception:
    log the error with job_id and step name, update carousel_jobs.status
    to the failed step name, and throw to trigger BullMQ retry.

-   BullMQ retry policy: 3 attempts with exponential backoff (1s, 5s,
    25s delays).

-   Dead Letter Queue: jobs that exhaust all retries land here. Set job
    status to failed. This triggers a Supabase Realtime event to the
    frontend.

-   All worker logs include job_id as a structured field for easy
    filtering.

-   Recommended: Bull Board UI deployed as an internal admin route for
    job monitoring.

**9. Frontend Components**

All carousel UI lives under /src/pages/CarouselPage.tsx and its child
components. The page has two modes: generation mode (while the job is
running) and result mode (once status = done).

  -------------------- ----------------------------------------------------
  **Component**        **Responsibility**

  TopicInput           Topic text field + trend suggestion chips from
                       existing RSS feed. Generates idempotency key on
                       submit. Calls POST /api/carousel/generate.

  GenerationProgress   Supabase Realtime subscriber on carousel_jobs
                       filtered by job_id + user_id. Displays step-by-step
                       progress (brain → planning → enhancing → designing →
                       rendering → done). Shows estimated time remaining.

  SlidePreviewGrid     Six-card grid. Each card shows the slide\'s
                       headline, subtext, slide type badge, and PNG
                       thumbnail once rendered. Cards populate
                       progressively as each slide\'s render_status
                       updates.

  SlideEditor          Click any slide card to open an inline editor for
                       headline and subtext. Saves to carousel_slides via
                       PATCH /api/carousel/:id/slides/:slideId. Does not
                       re-render the PNG automatically in MVP.

  ExportBar            Shown only when job status = done. Two buttons:
                       Download PNG ZIP and Download PDF. Calls GET
                       /api/carousel/:id/export to fetch fresh signed URLs,
                       then triggers browser download.

  ErrorState           Shown when job status = failed. Displays which step
                       failed. Offers a Retry button that calls POST
                       /api/carousel/generate with the same topic and a new
                       idempotency key.
  -------------------- ----------------------------------------------------

**Realtime subscription pattern**

The frontend subscribes to carousel_jobs changes the moment it receives
the 202 response with the job_id. The subscription filter must be: event
= UPDATE, table = carousel_jobs, filter = id=eq.{job_id} AND
user_id=eq.{user_id}. Never subscribe without the user_id filter ---
this is the RLS enforcement at the client layer. The subscription is
torn down when the component unmounts or when status reaches done or
failed.

**10. Implementation Order**

Build in this exact sequence. Each step is independently testable before
the next begins. Do not skip ahead to the render or frontend work until
the text pipeline is verified end-to-end.

  -------- -------------------- -----------------------------------------------
  **\#**   **Milestone**        **Definition of done**

  1        DB migrations        All 4 tables created, RLS policies active,
                                realtime enabled on carousel_jobs

  2        Redis + BullMQ setup Queue running locally, Bull Board accessible,
                                test job enqueues and dequeues successfully

  3        POST /generate       202 response in \<200ms, job row created in
           endpoint             Supabase, job visible in Bull Board

  4        Content Brain        Worker pulls job, calls GPT-4o-mini, Pydantic
           worker + guard       validates output, persists angle/tone to DB

  5        Carousel Planner     Worker produces 5-6 slides with correct types,
           worker + guard       carousel_slides rows created

  6        Slide Enhancer       All 6 slides enhanced in parallel, headline
           worker + guard       word count enforced, DB updated

  7        Design Engine worker Design tokens assigned to all slides, rule
                                mapping verified against all slide types

  8        One HTML template    Pixel-perfect template in HTML/CSS, renders
           (dark_modern)        correctly in Puppeteer manually

  9        Render microservice  Node service accepts POST, renders template to
                                PNG, uploads to Supabase Storage

  10       Export engine        ZIP and PDF generated, carousel_exports row
                                created, job status = done

  11       GET /carousel/:id    Job data returned, signed URLs generated with
           endpoints            TTL, ownership check verified

  12       Frontend ---         Realtime subscription working, step progress
           GenerationProgress   visible end-to-end

  13       Frontend ---         PNG thumbnails loading, progressive population
           SlidePreviewGrid     as slides complete

  14       Frontend ---         ZIP and PDF download working with fresh signed
           ExportBar            URLs

  15       Retry + DLQ          Force a step failure, verify 3 retries fire,
                                verify status = failed, verify frontend error
                                state

  16       Quota + rate         Exceed daily limit, verify 429 response, verify
           limiting             no job created

  17       Security audit       Attempt cross-user job access, attempt prompt
                                injection via topic field, verify all guards
  -------- -------------------- -----------------------------------------------

**11. New Dependencies**

These are the only new packages required beyond the existing
CreatorPulse stack. Everything else reuses what is already installed.

  ---------------------- ------------- ---------------------------------------------
  **Package**            **Service**   **Purpose**

  bullmq                 Backend       Job queue --- enqueue from backend, consume
                         (Node)        in workers

  ioredis                Backend       Redis client for BullMQ
                         (Node)        

  \@bull-board/express   Backend       Admin UI for job monitoring (internal route
                         (Node)        only)

  puppeteer              Render        Headless Chrome for HTML → PNG
                         service       
                         (Node)        

  python-bullmq          AI service    BullMQ worker binding for Python
                         (Python)      

  pydantic v2            AI service    Strict output validation --- upgrade if on v1
                         (Python)      

  reportlab or img2pdf   AI service    PDF assembly in Export Engine
                         (Python)      

  Redis (infrastructure) All services  Upstash Redis recommended for managed hosting
  ---------------------- ------------- ---------------------------------------------

**12. Explicitly Out of Scope for MVP**

These features are noted here to prevent scope creep. They are valid
future additions but must not block the initial implementation.

-   Multiple design templates --- dark_modern is the only template at
    launch. Template picker UI comes later.

-   Re-render after slide edit --- editing headline/subtext does not
    trigger a new PNG render in MVP. User edits text only.

-   Video carousels --- not in this pipeline. Different rendering stack
    required.

-   AI-generated illustrations --- visual_description is a
    human-readable hint passed to the HTML template. No image generation
    API calls in this pipeline.

-   Multi-model routing --- all LLM calls use OpenAI. No model
    abstraction layer needed yet.

-   Vector database for semantic slide caching --- future optimization.

-   User-created templates --- users cannot create custom templates in
    MVP. Admin-seeded only.

-   WhatsApp/multi-channel export --- carousels are LinkedIn-optimized
    only at launch.

+-----------------------------------------------------------------------+
| **Architecture complete. Ready for implementation.**                  |
|                                                                       |
| *Start with Milestone 1 --- database migrations.*                     |
+-----------------------------------------------------------------------+
