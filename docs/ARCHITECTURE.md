# CreatorPulse — LinkedIn Automation MVP Architecture

> **Version:** 1.0  
> **Last Updated:** 2026-02-18  
> **Scope:** LinkedIn-only MVP · Local-first · Production-style  
> **Status:** Architecture Finalized — Ready for Phase 1 Build

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture Verification Report](#2-architecture-verification-report)
3. [Identified Flaws & Corrections](#3-identified-flaws--corrections)
4. [Final System Architecture](#4-final-system-architecture)
5. [Technology Stack](#5-technology-stack)
6. [Folder Structure](#6-folder-structure)
7. [Data Flow Diagrams](#7-data-flow-diagrams)
8. [Database Strategy](#8-database-strategy)
9. [Security Model](#9-security-model)
10. [Docker & DevOps](#10-docker--devops)
11. [API Contract Reference](#11-api-contract-reference)
12. [Phased Build Plan](#12-phased-build-plan)
13. [Deployment Path](#13-deployment-path)

---

## 1. Executive Summary

CreatorPulse LinkedIn MVP is a **local-first, production-grade AI LinkedIn publishing engine** consisting of four services:

| # | Service | Tech | Port |
|---|---------|------|------|
| 1 | Frontend | React + Vite + TailwindCSS | `8080` |
| 2 | Backend API | Node.js + Express + TypeScript | `4000` |
| 3 | AI Microservice | Python + FastAPI + LangChain | `8000` |
| 4 | Supabase | Auth + PostgreSQL + RLS | `54321` (local) / Cloud |
| 5 | Redis *(optional, Phase 5+)* | Job queue / rate-limit cache | `6379` |

---

## 2. Architecture Verification Report

### ✅ What's Already Solid

| Area | Status | Notes |
|------|--------|-------|
| Frontend (Vite + React + TS + Tailwind) | ✅ Verified | `package.json` confirms React 18, Vite 5, Tailwind 3, Supabase JS, TanStack Query, Zustand, Framer Motion |
| Supabase Integration | ✅ Verified | Client at `src/integrations/supabase/client.ts`, types at `types.ts` (25KB), `.env` has project keys |
| Database Schema | ✅ Verified | 15+ tables with RLS, indexes, triggers — enterprise-grade (`database.md`, 1183 lines) |
| Edge Functions | ✅ Verified | 10 functions deployed: `content-generator`, `content-scraper`, `process-delivery`, `topic-research`, etc. |
| Migrations | ✅ Verified | 9 migration files in `supabase/migrations/` |
| Frontend Pages | ✅ Verified | 12 pages: Dashboard, Intelligence, Sources, Drafts, Delivery, Voice Training, Settings, Login, Signup, Onboarding, TrendDetails |
| Custom Hooks | ✅ Verified | 15 hooks covering auth, content generation, delivery scheduling, sources, topics, trends |
| Component Library | ✅ Verified | 11 component directories (94 files), including 50 UI primitives (shadcn/Radix) |
| Implementation Plan | ✅ Verified | `docs/IMPLEMENTATION_PLAN.md` — Phases 0-10, current status tracked |
| PRD | ✅ Verified | `prd.md` — detailed product requirements for multi-platform support |

### ⚠️ What Your Architecture Correctly Identifies as Needed

| Need | Rationale |
|------|-----------|
| Backend API layer | Frontend currently calls Supabase directly — backend needed for LinkedIn OAuth, token encryption, cron jobs |
| AI Microservice | Edge functions are limited; dedicated Python service enables LangChain, BeautifulSoup, proper RAG |
| Docker Compose | Isolates services, simulates production, makes onboarding trivial |
| `scheduled_posts` table | Cleaner than overloading `content_drafts` for scheduling logic |

---

## 3. Identified Flaws & Corrections

### 🔴 Critical Issues

#### Flaw 1: PRD says Next.js 14 — You're using Vite
- **Evidence:** `package.json` uses `vite@5.4.1`, `@vitejs/plugin-react-swc`. No Next.js dependency.
- **Impact:** `techanduiux.md` and `prd.md` reference Next.js 14, App Router, server components — none of these exist.
- **Correction:** All architecture docs must reference **Vite + React SPA**. No SSR, no server components. The backend API handles server-side concerns.

#### Flaw 2: Frontend calls Supabase directly with anon key — security risk for LinkedIn tokens
- **Evidence:** `.env` exposes `VITE_SUPABASE_PUBLISHABLE_KEY` (anon key). No service role key.
- **Impact:** LinkedIn access/refresh tokens stored via anon key can be read by any authenticated user if RLS is misconfigured. Token encryption happens where?
- **Correction:** All token operations (store, refresh, encrypt/decrypt) **must** go through the backend API using the Supabase service role key. Frontend never touches tokens directly.

#### Flaw 3: No CORS / rate limiting strategy defined
- **Impact:** Backend API will be exposed locally on port 4000 — without CORS config, any origin can call it. No rate limiting means runaway AI calls.
- **Correction:** Added CORS middleware (whitelist `localhost:8080`), Helmet for security headers, and `express-rate-limit` to the backend stack.

#### Flaw 4: `node-cron` for scheduling is fragile
- **Impact:** `node-cron` runs in-process. If the backend crashes or restarts, scheduled jobs are lost. No persistence, no retry.
- **Correction Phase 1-4:** Use `node-cron` as MVP scheduler, but persist schedule state in `scheduled_posts` table. On startup, the cron job re-reads all pending posts from DB. This is acceptable for MVP.
- **Correction Phase 5+:** Migrate to Redis + BullMQ for persistent, retryable job queues.

#### Flaw 5: Missing health check / readiness endpoints
- **Impact:** Docker Compose has no way to know if services are healthy. Dependent services may start before upstream is ready.
- **Correction:** Both backend and AI service must expose `/health` endpoints. Docker Compose uses `healthcheck` directives with `depends_on` conditions.

### 🟡 Moderate Issues

#### Flaw 6: Supabase Edge Functions overlap with new backend
- **Current state:** 10 edge functions handle content generation, scraping, delivery processing, topic research.
- **Risk:** Dual ownership — some logic in edge functions, some in backend API.
- **Correction:** For MVP, edge functions remain as-is for existing features. New LinkedIn-specific logic (OAuth, posting, scheduling) goes exclusively in the backend. Post-MVP, migrate edge function logic to backend for single ownership.

#### Flaw 7: `content_drafts.content_type` has multi-platform types — LinkedIn MVP doesn't need all
- **Current:** `single_tweet`, `thread`, `quote_tweet`, `linkedin_short`, `linkedin_long`, `linkedin_carousel`, `instagram_reel`, `instagram_carousel`
- **Correction:** Keep the schema as-is (backward compatible), but backend/AI service only generates `linkedin_short` and `linkedin_long` for MVP. No schema changes needed.

#### Flaw 8: No error recovery strategy for LinkedIn API failures
- **Impact:** LinkedIn API has aggressive rate limits (100 API calls/day for basic apps). Posts can fail silently.
- **Correction:** `scheduled_posts` table includes `retry_count` (max 3) and `error_message`. Backend implements exponential backoff: 2min → 10min → 1hr.

#### Flaw 9: Missing environment variable validation
- **Impact:** Missing keys cause cryptic runtime errors.
- **Correction:** Backend `config/env.ts` validates all required vars on startup and fails fast with clear messages.

### 🟢 Minor / Cosmetic

| Issue | Fix |
|-------|-----|
| `techanduiux.md` references Victory charts — not installed | Remove reference or add when needed |
| `prd.md` mentions Pinecone vector DB | Not needed for MVP; defer to Phase 3+ |
| No `.env.example` file | Create `.env.example` with all required vars (no values) |
| No `README.md` for backend or AI service | Include in folder structure |

---

## 4. Final System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        BROWSER (User)                           │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTP (port 8080)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   FRONTEND (React + Vite)                       │
│  • Auth UI (Supabase JS)     • Dashboard / Drafts / Delivery   │
│  • Direct Supabase reads     • Axios calls to Backend API      │
└──────────┬──────────────────────────────┬───────────────────────┘
           │ Supabase JS (anon key)       │ HTTP (port 4000)
           │ (reads, auth only)           │
           ▼                              ▼
┌────────────────────┐    ┌──────────────────────────────────────┐
│     SUPABASE       │    │         BACKEND API (Express)        │
│                    │    │                                      │
│  • Auth (JWT)      │◄───│  • JWT validation (middleware)       │
│  • PostgreSQL      │    │  • LinkedIn OAuth controller         │
│  • RLS policies    │    │  • Generation controller → AI svc    │
│  • Realtime        │    │  • Schedule controller + node-cron   │
│  • Edge Functions  │    │  • Token encryption (AES-256-GCM)    │
│    (existing)      │    │  • Supabase service role client      │
└────────────────────┘    └──────────────┬───────────────────────┘
                                         │ HTTP (port 8000)
                                         ▼
                          ┌──────────────────────────────────────┐
                          │      AI MICROSERVICE (FastAPI)        │
                          │                                      │
                          │  • /generate endpoint                │
                          │  • Article scraping (BeautifulSoup)  │
                          │  • LLM call (LangChain + OpenAI)     │
                          │  • Structured JSON response          │
                          └──────────────────────────────────────┘
```

### Service Communication Rules

| From | To | Method | Auth |
|------|----|--------|------|
| Frontend → Supabase | Direct (JS client) | Anon key + JWT | Read-only data, auth flows |
| Frontend → Backend | Axios REST | Bearer JWT (Supabase token) | All write operations, LinkedIn actions |
| Backend → Supabase | Server client | Service role key | Full DB access, token storage |
| Backend → AI Service | Internal HTTP | Shared API key (`AI_SERVICE_KEY`) | Content generation |
| Backend → LinkedIn API | HTTPS | OAuth2 access token | Post publishing |

---

## 5. Technology Stack

### Frontend (Existing — No Changes)

| Package | Version | Purpose |
|---------|---------|---------|
| React | 18.3 | UI framework |
| Vite | 5.4 | Build tool + HMR |
| TypeScript | 5.5 | Type safety |
| Tailwind CSS | 3.4 | Styling |
| @supabase/supabase-js | 2.52 | Auth + DB reads |
| @tanstack/react-query | 5.56 | Server state |
| Zustand | 5.0 | Client state |
| Framer Motion | 12.23 | Animations |
| React Router DOM | 6.26 | Routing |
| Recharts | 2.12 | Charts |
| Axios | *add* | Backend API calls |

### Backend API (New)

| Package | Purpose |
|---------|---------|
| express | HTTP server |
| typescript + ts-node + tsx | TypeScript runtime |
| @supabase/supabase-js | Server-side Supabase client (service role) |
| axios | Call AI service + LinkedIn API |
| dotenv | Environment config |
| node-cron | MVP scheduler |
| helmet | Security headers |
| cors | CORS middleware |
| express-rate-limit | Rate limiting |
| crypto (built-in) | AES-256-GCM token encryption |
| winston | Structured logging |
| zod | Request validation |

### AI Microservice (New)

| Package | Purpose |
|---------|---------|
| fastapi + uvicorn | HTTP server |
| langchain + langchain-openai | LLM orchestration |
| beautifulsoup4 + lxml | Article scraping / cleaning |
| pydantic | Request/response schemas |
| python-dotenv | Environment config |
| httpx | Async HTTP client |

---

## 6. Folder Structure

```
Creator_Pulse/
│
├── frontend/                          ← MOVE existing src here (or keep at root)
│   ├── src/
│   │   ├── components/               (94 files — existing)
│   │   ├── hooks/                    (15 hooks — existing)
│   │   ├── integrations/supabase/    (client.ts, types.ts)
│   │   ├── pages/                    (12 pages — existing)
│   │   ├── store/                    (onboardingStore.ts)
│   │   ├── types/                    (3 type files)
│   │   ├── lib/                      (utilities)
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── public/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   └── tsconfig.json
│
├── backend/                           ← NEW
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── linkedin.controller.ts    # OAuth callback, token management
│   │   │   ├── generation.controller.ts  # Trigger AI generation
│   │   │   └── schedule.controller.ts    # CRUD scheduled posts
│   │   │
│   │   ├── routes/
│   │   │   ├── linkedin.routes.ts
│   │   │   ├── generation.routes.ts
│   │   │   ├── schedule.routes.ts
│   │   │   └── health.routes.ts          # Health check endpoint
│   │   │
│   │   ├── services/
│   │   │   ├── linkedin.service.ts       # LinkedIn API wrapper
│   │   │   ├── ai.service.ts             # HTTP client to AI microservice
│   │   │   └── scheduler.service.ts      # node-cron + DB polling
│   │   │
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts         # JWT verification via Supabase
│   │   │   ├── rateLimiter.middleware.ts  # Express rate limiter
│   │   │   └── errorHandler.middleware.ts # Global error handler
│   │   │
│   │   ├── utils/
│   │   │   ├── encrypt.ts                # AES-256-GCM encrypt/decrypt
│   │   │   ├── logger.ts                 # Winston structured logger
│   │   │   └── validators.ts             # Zod schemas for requests
│   │   │
│   │   ├── config/
│   │   │   ├── supabase.ts               # Service role client init
│   │   │   └── env.ts                    # Env validation (fail-fast)
│   │   │
│   │   └── server.ts                     # Express app entry point
│   │
│   ├── package.json
│   ├── tsconfig.json
│   ├── Dockerfile
│   ├── .env.example
│   └── README.md
│
├── ai-service/                        ← NEW
│   ├── app/
│   │   ├── main.py                    # FastAPI app + CORS + health
│   │   ├── routes/
│   │   │   └── generate.py            # POST /generate
│   │   ├── services/
│   │   │   ├── article_scraper.py     # BeautifulSoup article cleaner
│   │   │   └── generator.py           # LangChain content generator
│   │   ├── models/
│   │   │   └── schemas.py             # Pydantic request/response models
│   │   └── config.py                  # Settings from env
│   │
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── .env.example
│   └── README.md
│
├── supabase/                          ← EXISTING
│   ├── migrations/                    (9 migration files)
│   ├── functions/                     (10 edge functions)
│   └── config.toml
│
├── docs/                              ← EXISTING + NEW
│   ├── IMPLEMENTATION_PLAN.md         (existing)
│   └── ARCHITECTURE.md                (this file)
│
├── docker-compose.yml                 ← NEW
├── .env                               ← EXISTING (add new vars)
├── .env.example                       ← NEW
├── database.md                        (existing)
├── prd.md                             (existing)
├── techanduiux.md                     (existing)
└── README.md                          (existing — update)
```

> **Note on frontend location:** The existing frontend code lives at the project root (not in a `frontend/` subfolder). For MVP, **keep it at root** to avoid breaking imports and build config. Docker Compose can reference `.` as the frontend build context. Post-MVP, consider moving to `frontend/` with updated configs.

---

## 7. Data Flow Diagrams

### Flow 1: Trend → Generate LinkedIn Post

```
User selects trend in UI
        │
        ▼
Frontend: POST /api/generate-linkedin
  Body: { trend_id, content_type: "linkedin_short" | "linkedin_long" }
  Header: Authorization: Bearer <supabase_jwt>
        │
        ▼
Backend (generation.controller.ts):
  1. Validate JWT → extract user_id
  2. Fetch trend from DB (trend_insights WHERE id = trend_id)
  3. Fetch user voice profile (content_samples or voice_training_data)
  4. POST to AI Service: http://ai-service:8000/generate
     Body: { trend, voice_samples, content_type, platform: "linkedin" }
        │
        ▼
AI Service (generate.py):
  1. Scrape trend source article (BeautifulSoup)
  2. Clean content → extract key points
  3. Build LangChain prompt with voice samples
  4. Call OpenAI GPT-4
  5. Return structured JSON:
     { content, hook, hashtags, engagement_prediction }
        │
        ▼
Backend:
  1. Save to content_drafts (status: "pending")
  2. Log to ai_processing_logs
  3. Track in usage_tracking
  4. Return draft to frontend
        │
        ▼
Frontend: Display draft in editor
```

### Flow 2: Publish Now (LinkedIn)

```
User clicks "Publish" on approved draft
        │
        ▼
Frontend: POST /api/publish-now
  Body: { content_draft_id }
        │
        ▼
Backend (linkedin.controller.ts):
  1. Validate JWT
  2. Fetch draft from content_drafts
  3. Fetch LinkedIn connection from platform_connections
  4. Decrypt access_token (AES-256-GCM)
  5. Check token expiry → refresh if needed via LinkedIn OAuth
  6. Call LinkedIn UGC/Posts API:
     POST https://api.linkedin.com/v2/ugcPosts
  7. Update content_drafts: status → "published", published_at, published_url
  8. Log to ai_processing_logs
  9. Return success + LinkedIn post URL
```

### Flow 3: Schedule Post

```
User sets date/time for draft
        │
        ▼
Frontend: POST /api/schedule
  Body: { content_draft_id, scheduled_at: "2026-02-20T09:00:00Z" }
        │
        ▼
Backend (schedule.controller.ts):
  1. Validate JWT
  2. Insert into scheduled_posts:
     { user_id, content_draft_id, scheduled_at, status: "pending" }
  3. Return confirmation

─── Background (scheduler.service.ts) ───
  node-cron runs every 60 seconds:
  1. SELECT * FROM scheduled_posts
     WHERE status = 'pending' AND scheduled_at <= NOW()
  2. For each due post:
     a. Update status → "processing"
     b. Execute publish flow (same as Flow 2)
     c. On success: status → "published"
     d. On failure: retry_count++, status → "failed" or "pending" (if retry < 3)
```

---

## 8. Database Strategy

### Tables Used for MVP

| Table | Status | MVP Role |
|-------|--------|----------|
| `creator_profiles` | ✅ Existing | User profiles, settings, subscription tier |
| `platform_connections` | ✅ Existing | LinkedIn OAuth tokens (encrypted) |
| `content_drafts` | ✅ Existing | AI-generated LinkedIn drafts |
| `trend_insights` | ✅ Existing | Detected trends for content generation |
| `content_sources` | ✅ Existing | Monitored sources for trend detection |
| `usage_tracking` | ✅ Existing | Credit consumption, action logging |
| `ai_processing_logs` | ✅ Existing | AI request/response debugging |
| `content_performance` | ✅ Existing | Post-publish engagement tracking |
| `scheduled_posts` | 🆕 **New** | MVP scheduling engine |

### Tables Deferred (Post-MVP)

| Table | Reason |
|-------|--------|
| `voice_models` | Advanced voice training — Phase 3+ |
| `voice_training_data` | Voice learning — keep schema, don't populate yet |
| `agency_clients` | Agency features — Phase 10 |
| `subscription_billing` | Stripe integration — Phase 9 |
| `delivery_preferences` | Email/WhatsApp delivery — Phase 6 |
| `daily_deliveries` | Daily pulse system — Phase 6 |
| `creator_analytics` | Advanced analytics — Phase 7 |
| `trend_content_mapping` | Trend effectiveness — Phase 7 |
| `system_health_metrics` | Ops monitoring — Phase 8+ |

### New Table: `scheduled_posts`

```sql
CREATE TABLE scheduled_posts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  content_draft_id uuid NOT NULL REFERENCES content_drafts(id) ON DELETE CASCADE,
  scheduled_at    timestamptz NOT NULL,
  status          text NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'processing', 'published', 'failed', 'cancelled')),
  retry_count     integer DEFAULT 0,
  max_retries     integer DEFAULT 3,
  last_error      text,
  published_at    timestamptz,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_scheduled_posts_user ON scheduled_posts(user_id);
CREATE INDEX idx_scheduled_posts_status_time ON scheduled_posts(status, scheduled_at);
CREATE INDEX idx_scheduled_posts_draft ON scheduled_posts(content_draft_id);

-- RLS
ALTER TABLE scheduled_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own schedules"
  ON scheduled_posts FOR ALL
  USING (auth.uid() = user_id);

-- Trigger
CREATE TRIGGER update_scheduled_posts_updated_at
  BEFORE UPDATE ON scheduled_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

## 9. Security Model

### Authentication Flow

```
Frontend (Supabase JS) → Supabase Auth → JWT issued
        │
        ▼
Frontend sends JWT in Authorization header to Backend
        │
        ▼
Backend auth.middleware.ts:
  1. Extract Bearer token
  2. supabase.auth.getUser(token) → validates + returns user
  3. Attach user_id to request context
  4. Reject if invalid/expired
```

### Token Encryption (LinkedIn)

```
encrypt.ts:
  Algorithm: AES-256-GCM
  Key: ENCRYPTION_KEY from env (32-byte hex)
  Process:
    1. Generate random 16-byte IV
    2. Encrypt token → ciphertext + auth tag
    3. Store as: iv:authTag:ciphertext (base64)
    4. Decrypt reverses the process
```

### Security Rules

| Rule | Implementation |
|------|---------------|
| Service role key never in frontend | Only in `backend/.env`, only used by backend Supabase client |
| All LinkedIn token ops go through backend | Frontend has no access to `platform_connections.access_token` |
| CORS restricted | Backend allows only `http://localhost:8080` |
| Rate limiting | 100 req/15min per IP (general), 10 req/15min for `/generate` |
| Helmet headers | XSS protection, content-type sniffing prevention, HSTS |
| AI service internal only | Port 8000 not exposed to browser; only backend calls it |
| Input validation | Zod schemas on all request bodies |

---

## 10. Docker & DevOps

### docker-compose.yml Structure

```yaml
version: "3.8"

services:
  frontend:
    build: .
    ports:
      - "8080:8080"
    environment:
      - VITE_SUPABASE_URL=${VITE_SUPABASE_URL}
      - VITE_SUPABASE_PUBLISHABLE_KEY=${VITE_SUPABASE_PUBLISHABLE_KEY}
      - VITE_API_URL=http://localhost:4000
    depends_on:
      backend:
        condition: service_healthy

  backend:
    build: ./backend
    ports:
      - "4000:4000"
    environment:
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
      - ENCRYPTION_KEY=${ENCRYPTION_KEY}
      - AI_SERVICE_URL=http://ai-service:8000
      - AI_SERVICE_KEY=${AI_SERVICE_KEY}
      - LINKEDIN_CLIENT_ID=${LINKEDIN_CLIENT_ID}
      - LINKEDIN_CLIENT_SECRET=${LINKEDIN_CLIENT_SECRET}
      - LINKEDIN_REDIRECT_URI=${LINKEDIN_REDIRECT_URI}
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:4000/health"]
      interval: 10s
      timeout: 5s
      retries: 3
    depends_on:
      ai-service:
        condition: service_healthy

  ai-service:
    build: ./ai-service
    ports:
      - "8000:8000"
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - AI_SERVICE_KEY=${AI_SERVICE_KEY}
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 10s
      timeout: 5s
      retries: 3
```

### Required Environment Variables

```bash
# .env.example

# === Supabase ===
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJ...
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...             # NEVER expose to frontend

# === Backend ===
ENCRYPTION_KEY=                               # 32-byte hex string for AES-256
AI_SERVICE_URL=http://localhost:8000
AI_SERVICE_KEY=                               # Shared secret for backend↔AI auth
PORT=4000

# === LinkedIn OAuth ===
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=
LINKEDIN_REDIRECT_URI=http://localhost:4000/api/linkedin/callback

# === AI Service ===
OPENAI_API_KEY=sk-...

# === Optional (Phase 5+) ===
REDIS_URL=redis://localhost:6379
```

---

## 11. API Contract Reference

### Backend API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/health` | None | Health check |
| `GET` | `/api/linkedin/auth-url` | JWT | Get LinkedIn OAuth URL |
| `GET` | `/api/linkedin/callback` | OAuth | Handle OAuth callback |
| `GET` | `/api/linkedin/status` | JWT | Check connection status |
| `DELETE` | `/api/linkedin/disconnect` | JWT | Remove LinkedIn connection |
| `POST` | `/api/generate-linkedin` | JWT | Generate LinkedIn content via AI |
| `POST` | `/api/publish-now` | JWT | Publish draft to LinkedIn immediately |
| `POST` | `/api/schedule` | JWT | Schedule a draft for future publishing |
| `GET` | `/api/schedule` | JWT | List user's scheduled posts |
| `PUT` | `/api/schedule/:id` | JWT | Update scheduled post |
| `DELETE` | `/api/schedule/:id` | JWT | Cancel scheduled post |

### AI Service Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/health` | None | Health check |
| `POST` | `/generate` | API Key | Generate LinkedIn content |

#### `POST /generate` Request
```json
{
  "trend": {
    "topic": "AI in Healthcare",
    "description": "...",
    "source_url": "https://..."
  },
  "voice_samples": ["sample1...", "sample2..."],
  "content_type": "linkedin_short",
  "platform": "linkedin"
}
```

#### `POST /generate` Response
```json
{
  "content": "Generated LinkedIn post...",
  "hook": "Opening hook line",
  "hashtags": ["#AI", "#Healthcare"],
  "engagement_prediction": {
    "estimated_likes": 45,
    "estimated_comments": 8,
    "confidence": 0.72
  },
  "model_version": "gpt-4",
  "tokens_consumed": 850,
  "processing_time_ms": 3200
}
```

---

## 12. Phased Build Plan

### Phase 1: Backend Foundation *(Week 1)*
- [ ] Create `backend/` folder with Express + TypeScript boilerplate
- [ ] Setup `config/env.ts` with Zod validation — fail fast on missing vars
- [ ] Setup `config/supabase.ts` with service role client
- [ ] Implement `middleware/auth.middleware.ts` — JWT verification
- [ ] Implement `middleware/errorHandler.middleware.ts`
- [ ] Add `/health` endpoint
- [ ] Add CORS, Helmet, rate limiting
- [ ] Create `Dockerfile` for backend
- [ ] Verify: backend starts, health check passes, JWT validation works

### Phase 2: AI Service Foundation *(Week 1-2)*
- [ ] Create `ai-service/` folder with FastAPI boilerplate
- [ ] Implement `config.py` with env validation
- [ ] Implement `services/article_scraper.py` — BeautifulSoup article cleaning
- [ ] Implement `services/generator.py` — LangChain + OpenAI pipeline
- [ ] Implement `routes/generate.py` — POST /generate endpoint
- [ ] Implement `models/schemas.py` — Pydantic models
- [ ] Add `/health` endpoint
- [ ] Add API key auth middleware
- [ ] Create `Dockerfile` for AI service
- [ ] Create `requirements.txt`
- [ ] Verify: AI service generates LinkedIn content from trend data

### Phase 3: LinkedIn OAuth *(Week 2)*
- [ ] Register LinkedIn Developer App
- [ ] Implement `controllers/linkedin.controller.ts`:
  - `/auth-url` — generate OAuth2 authorize URL
  - `/callback` — exchange code for tokens
  - `/status` — check connection
  - `/disconnect` — remove connection
- [ ] Implement `utils/encrypt.ts` — AES-256-GCM
- [ ] Implement `services/linkedin.service.ts`:
  - Token refresh
  - Profile fetch
  - Post creation (UGC API)
- [ ] Store encrypted tokens in `platform_connections`
- [ ] Add frontend "Connect LinkedIn" button

### Phase 4: Publish Now *(Week 3)*
- [ ] Implement `POST /api/publish-now` in generation controller
- [ ] Wire frontend "Publish" button → backend endpoint
- [ ] Handle LinkedIn API errors gracefully
- [ ] Update `content_drafts` status on success/failure
- [ ] Log to `ai_processing_logs`

### Phase 5: Scheduler *(Week 3-4)*
- [ ] Run migration for `scheduled_posts` table
- [ ] Implement `controllers/schedule.controller.ts` — CRUD endpoints
- [ ] Implement `services/scheduler.service.ts`:
  - `node-cron` job every 60s
  - Poll `scheduled_posts` for due items
  - Execute publish flow
  - Handle retries (max 3, exponential backoff)
- [ ] Wire frontend scheduling UI → backend
- [ ] Verify: scheduled post publishes at correct time

### Phase 6: Docker Compose & Integration *(Week 4)*
- [ ] Create `docker-compose.yml`
- [ ] Frontend Dockerfile (multi-stage: build + nginx)
- [ ] Test all 3 services start together
- [ ] Health checks pass
- [ ] End-to-end test: Login → Select Trend → Generate → Schedule → Publish

---

## 13. Deployment Path (Future)

This architecture enables zero-change deployment to production:

| Service | Local | Production |
|---------|-------|------------|
| Frontend | `localhost:8080` | Vercel |
| Backend | `localhost:4000` | Render / Railway |
| AI Service | `localhost:8000` | Fly.io / Modal |
| Supabase | Cloud (current) | Supabase Cloud (same) |
| Redis | `localhost:6379` | Upstash / Redis Cloud |

### Migration Steps
1. Push backend to separate repo → deploy to Render
2. Push AI service → deploy to Fly.io
3. Frontend: update `VITE_API_URL` → deploy to Vercel
4. Update CORS origins in backend
5. Update LinkedIn OAuth redirect URI

---

## Architecture Maturity Assessment

| Dimension | Score | Notes |
|-----------|-------|-------|
| Modularity | ⭐⭐⭐⭐⭐ | Clean separation: frontend, backend, AI, DB |
| Security | ⭐⭐⭐⭐ | JWT + encryption + RLS. Needs CSP headers post-MVP |
| Scalability | ⭐⭐⭐⭐ | Each service independently scalable |
| Maintainability | ⭐⭐⭐⭐ | TypeScript + Pydantic + clear folder structure |
| Observability | ⭐⭐⭐ | Winston logging. Needs Sentry/metrics post-MVP |
| Testability | ⭐⭐⭐ | Structure supports testing. Tests not defined yet |
| Production Readiness | ⭐⭐⭐⭐ | Docker + health checks + env validation. Needs CI/CD |

**Overall: Pre-production SaaS architecture. Built locally. Ready to scale.**

---

*© CreatorPulse — Architecture Document v1.0. This document is the single source of truth for system design decisions.*
