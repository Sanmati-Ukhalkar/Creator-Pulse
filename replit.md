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
- **UI Theme**: Clean professional light mode — white backgrounds (#F8FAFC), solid primary blue (#2563EB), solid accent violet (#7C3AED), dark sidebar (#0F172A). NO neon/cyan/glass/glow effects.
- CSS Variables in `artifacts/creatorpulse/src/index.css`:
  - `--primary: 221 83% 53%` (blue-600)
  - `--accent: 262 83% 58%` (violet-600)
  - `--creator-cyan: 221 83% 53%` (solid blue, replaces neon cyan)
  - `glass-card` = clean white card with border/shadow
  - `glass-button` = clean outlined button
  - `creator-gradient` = blue-to-purple gradient (no neon)
  - `creator-text-gradient` = solid primary text (no gradient text)
- Routes: `/login`, `/signup`, `/onboarding`, `/dashboard`, `/drafts`, `/sources`, `/trends`, `/topics`, `/settings`, `/workflow`, `/delivery`, `/voice-training`

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

## Design System Notes

The UI was completely redesigned from a dark/neon/cyberpunk aesthetic to a clean professional light mode.
- **Removed**: animated backgrounds, floating particles/orbs, glass morphism, neon cyan/violet gradients, glow effects
- **Added**: solid blue primary, clean white cards, subtle shadows, professional SaaS look
- `animated-background.tsx` returns `null` — keep it that way
- Semantic tokens like `text-creator-cyan` now map to solid blue (not neon) via CSS variables
- `glass-card`, `glass-button`, `creator-gradient`, `creator-text-gradient` are redefined as clean utilities in `index.css`
