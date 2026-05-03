# CreatorPulse — Development Phases Index

> **Project:** CreatorPulse LinkedIn Automation MVP  
> **Total Phases:** 6  
> **Estimated Timeline:** 4 Weeks  
> **Architecture Reference:** [`ARCHITECTURE.md`](../ARCHITECTURE.md)

---

## 📊 Phase Overview

```
Week 1          Week 2          Week 3          Week 4
├─────────┤    ├─────────┤    ├─────────┤    ├─────────┤

█████████████                                            Phase 1: Backend Foundation
    ████████████████                                     Phase 2: AI Service
         ████████████████                                Phase 3: LinkedIn OAuth
                    ████████████████                      Phase 4: Generate & Publish
                         ████████████████                 Phase 5: Scheduler
                                   ████████████████       Phase 6: Docker & E2E
```

---

## 🗂 Phase Documents

| Phase | Name | Status | Depends On | Files |
|-------|------|--------|------------|-------|
| **1** | [Backend Foundation](./PHASE-1_BACKEND_FOUNDATION.md) | 🔲 Not Started | — | 13 tasks |
| **2** | [AI Microservice](./PHASE-2_AI_SERVICE.md) | 🔲 Not Started | Phase 1 | 10 tasks |
| **3** | [LinkedIn OAuth](./PHASE-3_LINKEDIN_OAUTH.md) | 🔲 Not Started | Phase 1 | 7 tasks |
| **4** | [Generate & Publish](./PHASE-4_GENERATE_AND_PUBLISH.md) | 🔲 Not Started | Phase 2 + 3 | 6 tasks |
| **5** | [Scheduler](./PHASE-5_SCHEDULER.md) | 🔲 Not Started | Phase 4 | 6 tasks |
| **6** | [Docker & Integration](./PHASE-6_DOCKER_INTEGRATION.md) | 🔲 Not Started | Phase 1–5 | 6 tasks |

---

## 🔗 Dependency Graph

```
Phase 1 (Backend Foundation)
  ├──→ Phase 2 (AI Service)
  │      └──→ Phase 4 (Generate & Publish) ──→ Phase 5 (Scheduler)
  └──→ Phase 3 (LinkedIn OAuth)                    │
         └──→ Phase 4 (Generate & Publish)         │
                                                    ▼
                                          Phase 6 (Docker & E2E)
```

**Parallel work possible:**
- Phase 2 (AI Service) and Phase 3 (LinkedIn OAuth) can be built simultaneously after Phase 1
- Phase 2 focuses on Python/FastAPI, Phase 3 focuses on Node.js/OAuth — no conflicts

---

## 🏗 What Each Phase Builds

### Phase 1 — Backend Foundation
> Express server, TypeScript config, Supabase service client, JWT auth middleware, CORS, Helmet, rate limiting, health check, Winston logging, env validation, Dockerfile

### Phase 2 — AI Microservice
> FastAPI server, LangChain pipeline, OpenAI integration, article scraper (BeautifulSoup), Pydantic schemas, API key auth, Dockerfile, backend→AI HTTP client

### Phase 3 — LinkedIn OAuth
> OAuth2 flow (authorize → callback → token exchange), AES-256-GCM encryption, token storage in platform_connections, token refresh, LinkedIn profile fetch, frontend Connect button

### Phase 4 — Generate & Publish
> Generation controller (trend → AI → draft), publish controller (draft → LinkedIn API), request validation (Zod), logging to ai_processing_logs + usage_tracking, frontend generate/publish buttons

### Phase 5 — Scheduler
> scheduled_posts DB migration, CRUD endpoints, node-cron background job, exponential backoff retries, frontend schedule dialog + scheduled posts list

### Phase 6 — Docker & Integration
> docker-compose.yml, frontend Dockerfile (nginx), health check orchestration, E2E smoke test, .env.example, README update, .gitignore update

---

## 📈 Progress Tracker

Update this section as you complete phases:

```
Phase 1: [░░░░░░░░░░] 0%   ← START HERE
Phase 2: [░░░░░░░░░░] 0%
Phase 3: [░░░░░░░░░░] 0%
Phase 4: [░░░░░░░░░░] 0%
Phase 5: [░░░░░░░░░░] 0%
Phase 6: [░░░░░░░░░░] 0%
─────────────────────────
Overall: [░░░░░░░░░░] 0%
```

---

## 📌 Quick Reference

### Service Ports
| Service | Port | Health Check |
|---------|------|-------------|
| Frontend | `8080` | `http://localhost:8080` |
| Backend | `4000` | `http://localhost:4000/health` |
| AI Service | `8000` | `http://localhost:8000/health` |

### Key Files Created Across All Phases
| Service | Key Files |
|---------|-----------|
| Backend | `server.ts`, `env.ts`, `supabase.ts`, `auth.middleware.ts`, `linkedin.controller.ts`, `generation.controller.ts`, `schedule.controller.ts`, `linkedin.service.ts`, `ai.service.ts`, `scheduler.service.ts`, `encrypt.ts` |
| AI Service | `main.py`, `config.py`, `generate.py`, `article_scraper.py`, `generator.py`, `schemas.py` |
| Database | `scheduled_posts` migration |
| Docker | `docker-compose.yml`, `Dockerfile` (frontend), `nginx.conf` |
| Frontend | `useBackendApi.ts`, `useLinkedIn.ts`, `LinkedInConnect.tsx`, `ScheduleDialog.tsx`, `ScheduledPostsList.tsx` |
