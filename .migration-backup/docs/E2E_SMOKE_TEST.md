# CreatorPulse — E2E Smoke Test Checklist

> **Purpose:** Verify that the deployed stack (Frontend + Backend + AI Service) functions correctly end-to-end.
> **Prerequisites:** `docker-compose up --build -d` has completed successfully.

## 1. Environment Health Checks
- [ ] **Frontend**: Open `http://localhost:8080`.
  - [ ] Page loads without console errors.
  - [ ] Title is "CreatorPulse".
- [ ] **Backend**: Open `http://localhost:4000/health`.
  - [ ] Returns JSON: `{"status":"healthy", "supabase":"connected"}`.
- [ ] **AI Service**: Open `http://localhost:8000/health`.
  - [ ] Returns JSON: `{"status":"healthy", "model":"gpt-4"}`.

## 2. Authentication Flow (Frontend -> Supabase)
- [ ] **Sign Up / Login**:
  - [ ] Navigate to `/login`.
  - [ ] Enter credentials.
  - [ ] Redirects to Dashboard (`/dashboard`).
- [ ] Verify session persists on refresh.

## 3. LinkedIn Integration (Backend -> LinkedIn)
- [ ] **Connect Account**:
  - [ ] Go to Settings page.
  - [ ] Click "Connect LinkedIn".
  - [ ] Redirects to LinkedIn Auth -> returns to App -> shows "Connected".
- [ ] **Verify Database**: `platform_connections` table has a new row.

## 4. Content Generation (Frontend -> Backend -> AI Service)
- [ ] **Generate Post**:
  - [ ] Go to Create Post page.
  - [ ] Enter a topic (e.g., "AI Trends 2026").
  - [ ] Click "Generate".
  - [ ] Loading spinner appears.
  - [ ] Generated content appears in editor (~5-15s).
- [ ] **Verify Content**: Text is coherent, formatted properly.

## 5. Publishing (Backend -> LinkedIn API)
- [ ] **Publish Now**:
  - [ ] Click "Publish to LinkedIn" button.
  - [ ] Success toast appears.
  - [ ] Check actual LinkedIn profile for the new post.
  - [ ] Verify `published_posts` table has a new entry.

## 6. Scheduling (Backend Cron)
- [ ] **Schedule Post**:
  - [ ] Select a time 2 minutes from now.
  - [ ] Click "Schedule".
  - [ ] Verify `scheduled_posts` table has entry with status `pending`.
- [ ] **Wait for Cron**:
  - [ ] Wait 2-3 minutes.
  - [ ] Refresh page / check logs.
  - [ ] Verify `scheduled_posts` status changed to `published`.
  - [ ] Check LinkedIn profile for the post.

## Troubleshooting
- **Backend Logs**: `docker-compose logs -f backend`
- **AI Service Logs**: `docker-compose logs -f ai-service`
- **Restart Service**: `docker-compose restart [service_name]`
