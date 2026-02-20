# Phase 6 — Docker Compose & End-to-End Integration

> **Timeline:** Week 4 (Days 18–21)  
> **Depends On:** Phase 1–5 (All services must be individually functional)  
> **Unlocks:** Deployment to production, further feature development  
> **Status:** 🔲 Not Started

---

## 🎯 Phase Objective

Containerize all services and verify the complete system works end-to-end:
- Docker Compose orchestrates frontend, backend, and AI service
- Health checks ensure startup order
- Environment variables centralized in root `.env`
- Frontend Dockerfile (multi-stage build + nginx)
- End-to-end smoke test: Login → Generate → Schedule → Publish
- Root `.env.example` with ALL required variables
- Updated project README

**End state:** `docker compose up` starts the entire CreatorPulse stack. A single E2E flow from login to published LinkedIn post works.

---

## 📁 Files to Create / Modify

```
Creator_Pulse/
├── docker-compose.yml                  # NEW
├── Dockerfile                          # NEW — Frontend multi-stage build
├── nginx.conf                          # NEW — Frontend nginx config
├── .env.example                        # NEW — All vars documented
├── .dockerignore                       # NEW
├── backend/
│   └── Dockerfile                      # EXISTS (from Phase 1)
├── ai-service/
│   └── Dockerfile                      # EXISTS (from Phase 2)
└── README.md                           # MODIFY — Full setup guide
```

---

## 📋 Task Breakdown

### Task 6.1 — Frontend Dockerfile (Multi-Stage)
**Priority:** 🔴 Critical  
**Estimated Time:** 30 min

**Purpose:** Build the Vite React app and serve via nginx. Multi-stage keeps the image small (~25MB vs ~1GB).

**Create `Dockerfile` at project root:**
```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

# Build with env vars baked in
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_API_URL
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# Stage 2: Serve
FROM nginx:alpine AS runner

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config for SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080

HEALTHCHECK --interval=10s --timeout=3s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
```

**Create `nginx.conf`:**
```nginx
server {
    listen 8080;
    server_name localhost;

    root /usr/share/nginx/html;
    index index.html;

    # SPA routing — redirect all routes to index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;
    gzip_min_length 1000;
}
```

**Create `.dockerignore` at project root:**
```
node_modules
dist
.git
.env
*.md
backend/node_modules
backend/dist
ai-service/venv
ai-service/__pycache__
```

**Acceptance Criteria:**
- [ ] `docker build -t creatorpulse-frontend .` builds successfully
- [ ] Container serves the app on port 8080
- [ ] SPA routing works (refresh on `/dashboard` doesn't 404)
- [ ] Static assets are cached

---

### Task 6.2 — Docker Compose Configuration
**Priority:** 🔴 Critical  
**Estimated Time:** 45 min

**Create `docker-compose.yml`:**
```yaml
version: "3.8"

services:
  # ─── Frontend (React + Vite + Nginx) ───
  frontend:
    build:
      context: .
      dockerfile: Dockerfile
      args:
        VITE_SUPABASE_URL: ${VITE_SUPABASE_URL}
        VITE_SUPABASE_PUBLISHABLE_KEY: ${VITE_SUPABASE_PUBLISHABLE_KEY}
        VITE_API_URL: http://localhost:4000
    ports:
      - "8080:8080"
    depends_on:
      backend:
        condition: service_healthy
    restart: unless-stopped

  # ─── Backend API (Node.js + Express) ───
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "4000:4000"
    environment:
      - NODE_ENV=production
      - PORT=4000
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
      - ENCRYPTION_KEY=${ENCRYPTION_KEY}
      - AI_SERVICE_URL=http://ai-service:8000
      - AI_SERVICE_KEY=${AI_SERVICE_KEY}
      - LINKEDIN_CLIENT_ID=${LINKEDIN_CLIENT_ID}
      - LINKEDIN_CLIENT_SECRET=${LINKEDIN_CLIENT_SECRET}
      - LINKEDIN_REDIRECT_URI=${LINKEDIN_REDIRECT_URI}
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:4000/health"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s
    depends_on:
      ai-service:
        condition: service_healthy
    restart: unless-stopped

  # ─── AI Microservice (Python + FastAPI) ───
  ai-service:
    build:
      context: ./ai-service
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - AI_SERVICE_KEY=${AI_SERVICE_KEY}
      - OPENAI_MODEL=${OPENAI_MODEL:-gpt-4}
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s
    restart: unless-stopped
```

**Acceptance Criteria:**
- [ ] `docker compose up --build` starts all 3 services
- [ ] Health checks pass for backend and AI service
- [ ] Frontend waits for backend to be healthy before starting
- [ ] Backend waits for AI service to be healthy
- [ ] Environment variables properly passed from root `.env`

---

### Task 6.3 — Root Environment Example
**Priority:** 🟡 Important  
**Estimated Time:** 15 min

**Create `.env.example` at project root:**
```bash
# ============================================
# CreatorPulse — Environment Configuration
# ============================================
# Copy this to .env and fill in your values
# NEVER commit .env to version control!

# === Supabase (Frontend + Backend) ===
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJ...your-anon-key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...your-service-role-key

# === Backend ===
PORT=4000
NODE_ENV=development
ENCRYPTION_KEY=                    # Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# === AI Service ===
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4                 # or gpt-4-turbo, gpt-3.5-turbo
AI_SERVICE_KEY=                     # Generate: node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"

# === LinkedIn OAuth ===
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=
LINKEDIN_REDIRECT_URI=http://localhost:4000/api/linkedin/callback

# === Frontend ===
VITE_API_URL=http://localhost:4000

# === Optional (Future) ===
# REDIS_URL=redis://localhost:6379
```

---

### Task 6.4 — End-to-End Smoke Test
**Priority:** 🔴 Critical  
**Estimated Time:** 60 min

**Purpose:** Verify the ENTIRE flow works with all services running together.

**Test Script (Manual):**

```
E2E SMOKE TEST CHECKLIST
========================

SETUP:
[ ] All env vars filled in .env
[ ] docker compose up --build — all 3 services start
[ ] All health checks pass (check docker compose ps)

TEST 1: Health Checks
[ ] GET http://localhost:8080 → Frontend loads
[ ] GET http://localhost:4000/health → Backend healthy + Supabase connected
[ ] GET http://localhost:8000/health → AI service healthy

TEST 2: Authentication
[ ] Open http://localhost:8080 → Login page
[ ] Login with existing Supabase credentials → Dashboard loads
[ ] Protected backend route without token → 401
[ ] Protected backend route with valid token → 200

TEST 3: LinkedIn OAuth
[ ] Navigate to Settings
[ ] Click "Connect LinkedIn" → LinkedIn OAuth page opens
[ ] Authorize → Redirects back to Settings with success
[ ] LinkedIn status shows "Connected" with username

TEST 4: Content Generation
[ ] Navigate to Intelligence / Trends
[ ] Select a trend → Click "Generate LinkedIn Post"
[ ] Loading spinner shows (5-15 seconds)
[ ] Generated draft appears on Drafts page
[ ] Draft has: content, hook, hashtags, engagement prediction

TEST 5: Publish Now
[ ] On Drafts page, find generated draft
[ ] Click "Publish to LinkedIn"
[ ] Loading spinner → Success toast
[ ] Draft status changes to "Published"
[ ] LinkedIn post URL is shown
[ ] Verify post exists on LinkedIn

TEST 6: Schedule Post
[ ] Generate a new draft
[ ] Click "Schedule" → Date/time picker opens
[ ] Set time 2-3 minutes in the future
[ ] Confirm → Post appears in Scheduled list with "Pending" badge
[ ] Wait for scheduled time to pass
[ ] Post auto-publishes and status changes to "Published"

TEST 7: Error Handling
[ ] Try to publish without LinkedIn connected → Clear error message
[ ] Try to schedule in the past → Validation error
[ ] Try to publish an already-published draft → "Already published" error
[ ] Disconnect LinkedIn → Scheduled posts should fail and retry

RESULTS:
[ ] All 7 test groups pass
[ ] No console errors in browser
[ ] No unhandled errors in docker compose logs
```

---

### Task 6.5 — Update Project README
**Priority:** 🟡 Important  
**Estimated Time:** 30 min

**Update `README.md` with:**

1. **Project Overview** — What CreatorPulse is
2. **Architecture Diagram** — ASCII or link to ARCHITECTURE.md
3. **Quick Start:**
   ```bash
   # 1. Clone
   git clone <repo>
   cd Creator_Pulse

   # 2. Configure
   cp .env.example .env
   # Fill in all required values

   # 3. Run with Docker
   docker compose up --build

   # 4. Open
   # Frontend: http://localhost:8080
   # Backend:  http://localhost:4000/health
   # AI Docs:  http://localhost:8000/docs
   ```
4. **Development (without Docker):**
   ```bash
   # Terminal 1: Frontend
   npm install && npm run dev

   # Terminal 2: Backend
   cd backend && npm install && npm run dev

   # Terminal 3: AI Service
   cd ai-service && pip install -r requirements.txt
   python -m app.main
   ```
5. **Environment Variables** — Reference table
6. **API Documentation** — Link to ARCHITECTURE.md Section 11
7. **Phase Documentation** — Links to all phase docs

---

### Task 6.6 — Update `.gitignore`
**Priority:** 🟢 Minor  
**Estimated Time:** 5 min

**Ensure the following are ignored:**
```
# Backend
backend/node_modules/
backend/dist/
backend/.env

# AI Service
ai-service/venv/
ai-service/__pycache__/
ai-service/.env

# Docker
*.log

# Environment
.env
!.env.example
```

---

## ✅ Phase 6 Completion Checklist

| # | Check | Status |
|---|-------|--------|
| 1 | Frontend Dockerfile builds successfully | 🔲 |
| 2 | nginx serves SPA with proper routing | 🔲 |
| 3 | `docker compose up --build` starts all 3 services | 🔲 |
| 4 | All health checks pass | 🔲 |
| 5 | Services start in correct order (AI → Backend → Frontend) | 🔲 |
| 6 | E2E: Login → Generate → Publish works | 🔲 |
| 7 | E2E: Login → Generate → Schedule → Auto-publish works | 🔲 |
| 8 | Error scenarios handled gracefully | 🔲 |
| 9 | `.env.example` documents all required variables | 🔲 |
| 10 | `README.md` has complete setup instructions | 🔲 |
| 11 | `.gitignore` covers all generated/sensitive files | 🔲 |
| 12 | `docker compose down` cleanly stops all services | 🔲 |

---

## 🎉 MVP COMPLETE

After Phase 6, you have:

```
✅ Frontend   — React + Vite + Tailwind (existing, enhanced)
✅ Backend    — Express + TypeScript (new, production-grade)
✅ AI Service — FastAPI + LangChain (new, content generation)
✅ Database   — Supabase PostgreSQL with RLS (existing + scheduled_posts)
✅ Docker     — All services containerized and orchestrated
✅ LinkedIn   — OAuth + Generate + Publish + Schedule

Full pipeline: Trend → AI Content → Review → Publish/Schedule → LinkedIn
```

---

## 🚀 Post-MVP Roadmap

| Phase | Feature | Priority |
|-------|---------|----------|
| 7 | Redis + BullMQ job queue (replace node-cron) | High |
| 8 | Analytics dashboard + KPIs | Medium |
| 9 | Twitter/X platform support | Medium |
| 10 | Stripe billing + usage quotas | Medium |
| 11 | Agency multi-client support | Low |
| 12 | CI/CD pipeline (GitHub Actions) | High |
| 13 | Production deployment (Vercel + Render + Fly.io) | High |
| 14 | Advanced voice training (RAG) | Low |

---

## 📎 References

- **Architecture:** `docs/ARCHITECTURE.md` → Sections 10 (Docker), 13 (Deployment)
- **All Phase Docs:**
  - `docs/phases/PHASE-1_BACKEND_FOUNDATION.md`
  - `docs/phases/PHASE-2_AI_SERVICE.md`
  - `docs/phases/PHASE-3_LINKEDIN_OAUTH.md`
  - `docs/phases/PHASE-4_GENERATE_AND_PUBLISH.md`
  - `docs/phases/PHASE-5_SCHEDULER.md`
  - `docs/phases/PHASE-6_DOCKER_INTEGRATION.md` (this file)
