# CreatorPulse Frontend Architecture

> **Stack:** React 18, Vite, Tailwind CSS, Shadcn/UI, React Query, Zustand, Supabase Auth.
> **Backend Integration:** All business logic (LinkedIn, AI, Schedule) goes through the Express Backend API. Auth goes directly to Supabase.

## Core Principles
1.  **Authentication**: Use Supabase Auth (Email/Password) on the client. Send the JWT to the backend for API access.
2.  **State Management**: 
    -   `React Query`: Server state (posts, user profile, schedules).
    -   `Zustand`: Client UI state (sidebar toggle, theme, session).
    -   `React Hook Form`: Form state (login, create post).
3.  **Components**: Use modular `shadcn/ui` components.
4.  **API Layer**: Centralized API client (`src/lib/api.ts`) with Axios interceptors to inject the token.

## Phase Roadmap

| Phase | Focus | Key Features |
|-------|-------|--------------|
| **[Phase 1](./PHASE-1_FOUNDATION.md)** | **Foundation & Auth** | Project structure, Theme, Layouts, Login/Signup, Auth Context, API Client setup. |
| **[Phase 2](./PHASE-2_LINKEDIN.md)** | **Settings & Connections** | Settings Page, Connect LinkedIn button, Handle OAuth Callback, Connection Status. |
| **[Phase 3](./PHASE-3_GENERATOR.md)** | **Content Studio** | Create Post Page, Topic Input, AI Generation UI, Post Editor, Publish Now action. |
| **[Phase 4](./PHASE-4_SCHEDULER.md)** | **Smart Scheduler** | Schedule Page, Calendar/List View, Schedule Post action, Cancel Scheduler. |
| **[Phase 5](./PHASE-5_DASHBOARD.md)** | **Dashboard & Polish** | Home Dashboard, Recent Activity, Stats, Final Polish. |

## Directory Structure
```
src/
├── components/         # Reusable UI components (shadcn)
├── context/            # Global providers (Auth, Theme)
├── hooks/              # Custom hooks (useAuth, useToast)
├── lib/                # Utilities (api.ts, utils.ts)
├── pages/              # Page components (Login, Dashboard, Create)
├── services/           # Service adapters (api calls)
├── store/              # Global state (zustand stores)
├── App.tsx             # Main router setup
└── main.tsx            # Entry point
```
