# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL (raw `pool` queries, not Drizzle ORM for app routes)
- **Validation**: Zod
- **Build**: esbuild (ESM bundle for api-server), Vite (frontend)

## Artifacts

### CreatorPulse (`artifacts/creatorpulse`) — main web app
- React + Vite + Tailwind CSS v3 (PostCSS config)
- React Router DOM v7 (BrowserRouter, basename = BASE_URL)
- Axios for API calls to `/api/*`
- JWT auth stored in `localStorage` as `auth_token`
- State: Zustand (onboarding store), TanStack Query (server state)
- Dark UI theme with cyan/violet gradients
- Routes: `/login`, `/signup`, `/onboarding`, `/dashboard`, `/drafts`, `/sources`, `/trends`, `/topics`, `/settings`

### API Server (`artifacts/api-server`) — Express backend
- Serves all routes under `/api/`
- Auth: JWT (jsonwebtoken + bcryptjs), middleware in `src/middlewares/auth.ts`
- Routes registered in `src/routes/index.ts`:
  - `/api/auth` — register, login, /me
  - `/api/drafts` — CRUD for content drafts
  - `/api/sources` — content source management
  - `/api/trends` — trend research
  - `/api/topics` — topic management
  - `/api/profile` — creator profile + onboarding
  - `/api/delivery` — delivery preferences
  - `/api/ingested-contents` — ingested content listing
  - `/api/linkedin` — LinkedIn OAuth (stub)
  - `/api/analytics` — post analytics sync (stub)
  - `/api/research` — topic deep research (stub)
  - `/api/ai-status` — AI service status

## Database Tables

- `users` (id, email, password_hash, created_at)
- `drafts` (id, user_id, platform, content_type, title, content, metadata, status, created_at, updated_at)
- `sources` (id, user_id, source_type, source_name, source_url, source_config, is_active, sync_status, created_at, updated_at)
- `ingested_contents` (id, user_id, source_id, title, content, summary, url, metadata, created_at)
- `trend_research` (id, user_id, query, title, status, categories, results, created_at)
- `topics` (id, user_id, title, description, keywords, trend_score, confidence_score, created_at)
- `delivery_preferences` (id, user_id, delivery_time, frequency, channels, timezone, updated_at)
- `scheduled_posts` (id, user_id, draft_id, platform, scheduled_at, status, created_at)
- `creator_profiles` (id, user_id, full_name, email, industry, creator_type, platforms, timezone, onboarding_completed, updated_at)
- `platform_connections` (id, user_id, platform, access_token, refresh_token, expires_at, created_at)

## Environment Variables

- `JWT_SECRET` — required for auth token signing
- `DATABASE_URL` — PostgreSQL connection string (auto-provisioned)
- `ENCRYPTION_KEY` — for sensitive data encryption

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/api-server run dev` — run API server locally
- `pnpm --filter @workspace/creatorpulse run dev` — run frontend locally
