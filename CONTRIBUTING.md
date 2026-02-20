# Developer Guide — Running CreatorPulse

## 🚀 Quick Start (Docker)

Run the entire stack (Frontend + Backend + AI Service) with one command:

```bash
docker-compose up --build
```

- **Frontend**: http://localhost:8080
- **Backend**: http://localhost:4000
- **AI Service**: http://localhost:8000/docs

---

## 🛠️ Development Mode (Manual)

To develop features, run services individually in separate terminals.

### 1. Database Setup (Required Once)
Run these SQL files in your [Supabase Dashboard](https://supabase.com/dashboard/project/kbkxttsrwivgbjvxqsfu/sql):
1. `backend/migrations/001_platform_connections.sql`
2. `backend/migrations/002_published_posts.sql`
3. `backend/migrations/003_scheduled_posts.sql`

### 2. Start Backend (Port 4000)
```bash
cd backend
npm install
npm run dev
```

### 3. Start AI Service (Port 8000)
```bash
cd ai-service
# Activate venv
.\venv\Scripts\activate
# Install deps
pip install -r requirements.txt
# Run
uvicorn app.main:app --reload --port 8000
```

### 4. Start Frontend (Port 5173 / 8080)
```bash
# Root directory
npm install
npm run dev
```

---

## 🔑 Environment Variables

Ensure `.env` files are set up:

| Service | File | Required Keys |
|---------|------|---------------|
| **Frontend** | `.env` | `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` |
| **Backend** | `backend/.env` | `SUPABASE_SERVICE_ROLE_KEY`, `ENCRYPTION_KEY`, `AI_SERVICE_KEY`, `LINKEDIN_CLIENT_ID` |
| **AI Service** | `ai-service/.env` | `OPENAI_API_KEY`, `AI_SERVICE_KEY` |
