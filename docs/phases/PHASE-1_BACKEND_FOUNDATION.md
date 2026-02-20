# Phase 1 — Backend Foundation

> **Timeline:** Week 1 (Days 1–5)  
> **Depends On:** Nothing — this is the starting phase  
> **Unlocks:** Phase 2 (AI Service), Phase 3 (LinkedIn OAuth)  
> **Status:** 🔲 Not Started

---

## 🎯 Phase Objective

Stand up the Node.js + Express + TypeScript backend API server with:
- Production-grade project scaffolding
- Environment validation (fail-fast)
- Supabase server-side client (service role key)
- JWT authentication middleware
- Health check endpoint
- CORS, Helmet, rate limiting
- Structured logging (Winston)
- Global error handling
- Dockerfile for containerization

**End state:** A running backend on port `4000` that validates JWTs, rejects bad requests, and responds to `/health`.

---

## 📁 Files to Create

```
backend/
├── src/
│   ├── config/
│   │   ├── env.ts                    # Zod-validated environment config
│   │   └── supabase.ts              # Supabase service role client
│   │
│   ├── middleware/
│   │   ├── auth.middleware.ts        # JWT verification via Supabase
│   │   ├── rateLimiter.middleware.ts # Express rate limiter
│   │   └── errorHandler.middleware.ts# Global error handler
│   │
│   ├── routes/
│   │   └── health.routes.ts         # GET /health
│   │
│   ├── utils/
│   │   └── logger.ts                # Winston structured logger
│   │
│   └── server.ts                    # Express app entry point
│
├── package.json
├── tsconfig.json
├── .env.example
├── Dockerfile
└── README.md
```

---

## 📋 Task Breakdown

### Task 1.1 — Initialize Backend Project
**Priority:** 🔴 Critical  
**Estimated Time:** 30 min

**Steps:**
1. Create `backend/` directory at project root
2. Run `npm init -y` inside `backend/`
3. Install production dependencies:
   ```bash
   npm install express @supabase/supabase-js axios dotenv cors helmet express-rate-limit winston zod node-cron
   ```
4. Install dev dependencies:
   ```bash
   npm install -D typescript @types/express @types/node @types/cors tsx nodemon
   ```
5. Update `package.json` scripts:
   ```json
   {
     "scripts": {
       "dev": "tsx watch src/server.ts",
       "build": "tsc",
       "start": "node dist/server.js",
       "lint": "tsc --noEmit"
     }
   }
   ```

**Acceptance Criteria:**
- [ ] `backend/package.json` exists with all dependencies
- [ ] `npm install` completes without errors

---

### Task 1.2 — TypeScript Configuration
**Priority:** 🔴 Critical  
**Estimated Time:** 15 min

**Create `backend/tsconfig.json`:**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "baseUrl": "./src",
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Acceptance Criteria:**
- [ ] `tsc --noEmit` passes with zero errors

---

### Task 1.3 — Environment Validation (`config/env.ts`)
**Priority:** 🔴 Critical  
**Estimated Time:** 30 min

**Purpose:** Validate ALL required environment variables on startup. If any are missing, the server crashes immediately with a clear error — not a cryptic runtime failure 10 minutes later.

**Required Variables (Phase 1):**
```
SUPABASE_URL          - Supabase project URL
SUPABASE_SERVICE_ROLE_KEY - Service role key (NEVER expose to frontend)
PORT                  - Server port (default: 4000)
NODE_ENV              - development | production
ENCRYPTION_KEY        - 32-byte hex for AES-256-GCM (can be placeholder for now)
```

**Implementation Pattern:**
```typescript
// config/env.ts
import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  PORT: z.string().default('4000').transform(Number),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  ENCRYPTION_KEY: z.string().min(32),
  // These will be added in later phases:
  // AI_SERVICE_URL: z.string().url().optional(),
  // AI_SERVICE_KEY: z.string().optional(),
  // LINKEDIN_CLIENT_ID: z.string().optional(),
  // LINKEDIN_CLIENT_SECRET: z.string().optional(),
  // LINKEDIN_REDIRECT_URI: z.string().url().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Environment validation failed:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
```

**Acceptance Criteria:**
- [ ] Server refuses to start if `SUPABASE_URL` is missing
- [ ] Server refuses to start if `SUPABASE_SERVICE_ROLE_KEY` is missing
- [ ] Clear error messages printed to console on failure
- [ ] `env` object is fully typed

---

### Task 1.4 — Supabase Server Client (`config/supabase.ts`)
**Priority:** 🔴 Critical  
**Estimated Time:** 15 min

**Purpose:** Initialize a Supabase client with the **service role key** — this bypasses RLS and has full DB access. This is why it MUST only exist in the backend.

**Implementation Pattern:**
```typescript
// config/supabase.ts
import { createClient } from '@supabase/supabase-js';
import { env } from './env';

export const supabaseAdmin = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
```

**Acceptance Criteria:**
- [ ] `supabaseAdmin` can query any table (bypasses RLS)
- [ ] Service role key is never logged or exposed

---

### Task 1.5 — Structured Logger (`utils/logger.ts`)
**Priority:** 🟡 Important  
**Estimated Time:** 20 min

**Purpose:** Consistent, structured logging across the backend. JSON format for production, pretty-print for development.

**Implementation Pattern:**
```typescript
// utils/logger.ts
import winston from 'winston';
import { env } from '../config/env';

export const logger = winston.createLogger({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    env.NODE_ENV === 'production'
      ? winston.format.json()
      : winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
  ),
  defaultMeta: { service: 'creatorpulse-backend' },
  transports: [
    new winston.transports.Console(),
  ],
});
```

**Acceptance Criteria:**
- [ ] Logs include timestamp, level, message
- [ ] Different formats for dev vs prod
- [ ] Can be imported and used from any file

---

### Task 1.6 — Auth Middleware (`middleware/auth.middleware.ts`)
**Priority:** 🔴 Critical  
**Estimated Time:** 30 min

**Purpose:** Every protected route must verify the Supabase JWT from the `Authorization: Bearer <token>` header. This middleware extracts the token, validates it via Supabase, and attaches the user to the request.

**Implementation Pattern:**
```typescript
// middleware/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { logger } from '../utils/logger';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email?: string;
      };
    }
  }
}

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }

    const token = authHeader.split(' ')[1];
    const { data, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !data.user) {
      logger.warn('Auth failed', { error: error?.message });
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.user = {
      id: data.user.id,
      email: data.user.email,
    };

    next();
  } catch (err) {
    logger.error('Auth middleware error', { error: err });
    return res.status(500).json({ error: 'Authentication service error' });
  }
};
```

**Acceptance Criteria:**
- [ ] Returns 401 if no Authorization header
- [ ] Returns 401 if token is invalid/expired
- [ ] Attaches `req.user.id` on success
- [ ] Logs auth failures at warn level

---

### Task 1.7 — Rate Limiter (`middleware/rateLimiter.middleware.ts`)
**Priority:** 🟡 Important  
**Estimated Time:** 15 min

**Two rate limiters:**
1. **General:** 100 requests per 15 minutes per IP
2. **AI Generation:** 10 requests per 15 minutes per IP (added in Phase 2)

**Implementation Pattern:**
```typescript
// middleware/rateLimiter.middleware.ts
import rateLimit from 'express-rate-limit';

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});

export const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'AI generation rate limit reached. Try again in 15 minutes.' },
});
```

**Acceptance Criteria:**
- [ ] 101st request in 15 minutes returns 429
- [ ] Rate limit headers present in responses

---

### Task 1.8 — Global Error Handler (`middleware/errorHandler.middleware.ts`)
**Priority:** 🟡 Important  
**Estimated Time:** 15 min

**Purpose:** Catch all unhandled errors, log them, and return a clean 500 response. Never leak stack traces to the client in production.

**Implementation Pattern:**
```typescript
// middleware/errorHandler.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { env } from '../config/env';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    method: req.method,
    path: req.path,
  });

  res.status(500).json({
    error: 'Internal server error',
    ...(env.NODE_ENV === 'development' && { details: err.message }),
  });
};
```

---

### Task 1.9 — Health Check Route (`routes/health.routes.ts`)
**Priority:** 🔴 Critical  
**Estimated Time:** 10 min

**Purpose:** Docker Compose and monitoring tools need a way to verify the server is alive AND can reach Supabase.

**Implementation Pattern:**
```typescript
// routes/health.routes.ts
import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase';

const router = Router();

router.get('/health', async (_req, res) => {
  try {
    // Verify Supabase connectivity
    const { error } = await supabaseAdmin.from('creator_profiles').select('id').limit(1);
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      supabase: error ? 'degraded' : 'connected',
      uptime: process.uptime(),
    });
  } catch {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
```

**Acceptance Criteria:**
- [ ] `GET /health` returns 200 with status info
- [ ] Returns 503 if Supabase is unreachable
- [ ] No authentication required

---

### Task 1.10 — Express Server Entry Point (`server.ts`)
**Priority:** 🔴 Critical  
**Estimated Time:** 30 min

**Purpose:** Wire everything together — middleware stack, routes, graceful shutdown.

**Implementation Pattern:**
```typescript
// server.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import { logger } from './utils/logger';
import { generalLimiter } from './middleware/rateLimiter.middleware';
import { errorHandler } from './middleware/errorHandler.middleware';
import healthRoutes from './routes/health.routes';

const app = express();

// === Security Middleware ===
app.use(helmet());
app.use(cors({
  origin: ['http://localhost:8080', 'http://localhost:5173'],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(generalLimiter);

// === Request logging ===
app.use((req, _res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  next();
});

// === Routes ===
app.use(healthRoutes);
// Future phases will add:
// app.use('/api/linkedin', linkedinRoutes);
// app.use('/api', generationRoutes);
// app.use('/api', scheduleRoutes);

// === Error Handler (must be last) ===
app.use(errorHandler);

// === Start Server ===
const server = app.listen(env.PORT, () => {
  logger.info(`🚀 CreatorPulse Backend running on port ${env.PORT}`);
  logger.info(`📍 Health check: http://localhost:${env.PORT}/health`);
  logger.info(`🔧 Environment: ${env.NODE_ENV}`);
});

// === Graceful Shutdown ===
const shutdown = (signal: string) => {
  logger.info(`${signal} received. Shutting down gracefully...`);
  server.close(() => {
    logger.info('Server closed.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export default app;
```

**Acceptance Criteria:**
- [ ] Server starts on configured port
- [ ] Logs startup info including port and environment
- [ ] CORS only allows configured origins
- [ ] Graceful shutdown on SIGTERM/SIGINT

---

### Task 1.11 — Environment Example File
**Priority:** 🟢 Minor  
**Estimated Time:** 5 min

**Create `backend/.env.example`:**
```bash
# Supabase (required)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...your-service-role-key

# Server
PORT=4000
NODE_ENV=development

# Encryption (generate: openssl rand -hex 32)
ENCRYPTION_KEY=your-64-char-hex-string

# === Added in Phase 2 ===
# AI_SERVICE_URL=http://localhost:8000
# AI_SERVICE_KEY=your-shared-secret

# === Added in Phase 3 ===
# LINKEDIN_CLIENT_ID=
# LINKEDIN_CLIENT_SECRET=
# LINKEDIN_REDIRECT_URI=http://localhost:4000/api/linkedin/callback

# === Added in Phase 2 (AI Service) ===
# OPENAI_API_KEY=sk-...
```

---

### Task 1.12 — Dockerfile
**Priority:** 🟡 Important  
**Estimated Time:** 15 min

**Create `backend/Dockerfile`:**
```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production
EXPOSE 4000

HEALTHCHECK --interval=10s --timeout=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/health || exit 1

CMD ["node", "dist/server.js"]
```

---

### Task 1.13 — Backend README
**Priority:** 🟢 Minor  
**Estimated Time:** 10 min

**Create `backend/README.md`** with:
- Project description
- Setup instructions
- How to run locally (`npm run dev`)
- Environment variable reference
- API endpoint list (just `/health` for now)

---

## ✅ Phase 1 Completion Checklist

| # | Check | Status |
|---|-------|--------|
| 1 | `cd backend && npm install` — no errors | 🔲 |
| 2 | `npm run dev` — server starts on port 4000 | 🔲 |
| 3 | `GET http://localhost:4000/health` — returns 200 | 🔲 |
| 4 | Request without Auth header to protected route — returns 401 | 🔲 |
| 5 | Request with valid Supabase JWT — returns user info | 🔲 |
| 6 | 101st request in 15 min — returns 429 | 🔲 |
| 7 | Missing env var — server refuses to start with clear message | 🔲 |
| 8 | `tsc --noEmit` — zero TypeScript errors | 🔲 |
| 9 | Logs print in structured format | 🔲 |
| 10 | CORS rejects requests from unauthorized origins | 🔲 |

---

## 🚧 What This Phase Does NOT Include

| Item | Deferred To |
|------|-------------|
| LinkedIn OAuth routes | Phase 3 |
| AI generation routes | Phase 2 |
| Scheduling routes | Phase 5 |
| Token encryption utility | Phase 3 |
| Request body validation schemas | Phase 2-3 (per-route) |
| Docker Compose integration | Phase 6 |

---

## 📎 References

- **Architecture:** `docs/ARCHITECTURE.md` → Sections 4, 5, 6, 9
- **Folder Structure:** `docs/ARCHITECTURE.md` → Section 6
- **Security Model:** `docs/ARCHITECTURE.md` → Section 9
- **API Contracts:** `docs/ARCHITECTURE.md` → Section 11
