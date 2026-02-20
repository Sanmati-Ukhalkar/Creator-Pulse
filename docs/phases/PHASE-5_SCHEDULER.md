# Phase 5 — Post Scheduler (Cron + DB Polling)

> **Timeline:** Week 3–4 (Days 14–18)  
> **Depends On:** Phase 4 (Publish flow must work)  
> **Unlocks:** Phase 6 (Docker integration — all services ready)  
> **Status:** 🔲 Not Started

---

## 🎯 Phase Objective

Build the scheduled posting system:
- Database migration for `scheduled_posts` table
- CRUD endpoints for managing scheduled posts
- Background `node-cron` job that polls DB every 60 seconds
- Execute publish flow for due posts
- Retry logic with exponential backoff (max 3 retries)
- Frontend scheduling UI — pick date/time for a draft
- Frontend schedule management view

**End state:** User can schedule a draft for a future time, and it automatically publishes to LinkedIn at that time.

---

## 📁 Files to Create / Modify

```
supabase/migrations/
└── XXXXXXXXXX_add_scheduled_posts.sql  # NEW — DB migration

backend/src/
├── controllers/
│   └── schedule.controller.ts           # NEW — CRUD handlers
├── routes/
│   └── schedule.routes.ts               # NEW — Route definitions
├── services/
│   └── scheduler.service.ts             # NEW — Cron job + DB polling
└── server.ts                            # MODIFY — Add routes + start scheduler

frontend/src/
├── components/
│   └── drafts/
│       ├── ScheduleDialog.tsx           # NEW — Date/time picker modal
│       └── ScheduledPostsList.tsx       # NEW — List of scheduled posts
└── pages/
    └── Delivery.tsx                     # MODIFY — Add scheduled posts view
```

---

## 📋 Task Breakdown

### Task 5.1 — Database Migration: `scheduled_posts` Table
**Priority:** 🔴 Critical  
**Estimated Time:** 20 min

**Create new migration file in `supabase/migrations/`:**

```sql
-- Migration: Add scheduled_posts table for LinkedIn publishing scheduler

-- 1. Create table
CREATE TABLE IF NOT EXISTS scheduled_posts (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  content_draft_id uuid NOT NULL REFERENCES content_drafts(id) ON DELETE CASCADE,
  scheduled_at     timestamptz NOT NULL,
  status           text NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'processing', 'published', 'failed', 'cancelled')),
  retry_count      integer NOT NULL DEFAULT 0,
  max_retries      integer NOT NULL DEFAULT 3,
  last_error       text,
  published_at     timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- 2. Indexes
CREATE INDEX idx_scheduled_posts_user
  ON scheduled_posts(user_id);

CREATE INDEX idx_scheduled_posts_due
  ON scheduled_posts(status, scheduled_at)
  WHERE status = 'pending';

CREATE INDEX idx_scheduled_posts_draft
  ON scheduled_posts(content_draft_id);

-- 3. Enable RLS
ALTER TABLE scheduled_posts ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
CREATE POLICY "Users can view their own scheduled posts"
  ON scheduled_posts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own scheduled posts"
  ON scheduled_posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scheduled posts"
  ON scheduled_posts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scheduled posts"
  ON scheduled_posts FOR DELETE
  USING (auth.uid() = user_id);

-- 5. Backend service role policy (for cron job)
CREATE POLICY "Service role can manage all scheduled posts"
  ON scheduled_posts FOR ALL
  USING (true)
  WITH CHECK (true);

-- 6. Updated_at trigger
CREATE TRIGGER update_scheduled_posts_updated_at
  BEFORE UPDATE ON scheduled_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 7. Prevent scheduling in the past
CREATE OR REPLACE FUNCTION check_scheduled_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.scheduled_at <= now() AND TG_OP = 'INSERT' THEN
    RAISE EXCEPTION 'Cannot schedule a post in the past';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_scheduled_at_trigger
  BEFORE INSERT ON scheduled_posts
  FOR EACH ROW
  EXECUTE FUNCTION check_scheduled_at();
```

**Run migration:**
```bash
# If using Supabase CLI:
supabase db push

# If using Supabase Dashboard:
# Paste SQL in SQL Editor and run
```

**Acceptance Criteria:**
- [ ] `scheduled_posts` table created with all columns
- [ ] Indexes created for performance
- [ ] RLS policies enable user-level access
- [ ] Service role can access all rows (for cron)
- [ ] `updated_at` auto-updates on changes
- [ ] Cannot insert a post scheduled in the past

---

### Task 5.2 — Schedule Controller (`controllers/schedule.controller.ts`)
**Priority:** 🔴 Critical  
**Estimated Time:** 45 min

**Endpoints:**

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/schedule` | Create a scheduled post |
| `GET` | `/api/schedule` | List user's scheduled posts |
| `PUT` | `/api/schedule/:id` | Update schedule (time or cancel) |
| `DELETE` | `/api/schedule/:id` | Cancel/delete scheduled post |

**Implementation Pattern:**
```typescript
// backend/src/controllers/schedule.controller.ts
import { Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { logger } from '../utils/logger';

export const scheduleController = {
  /**
   * POST /api/schedule
   * Schedule a draft for future publishing
   */
  async create(req: Request, res: Response) {
    const { content_draft_id, scheduled_at } = req.validatedBody;
    const userId = req.user!.id;

    try {
      // Verify draft exists and belongs to user
      const { data: draft, error: draftError } = await supabaseAdmin
        .from('content_drafts')
        .select('id, status, platform')
        .eq('id', content_draft_id)
        .eq('user_id', userId)
        .single();

      if (draftError || !draft) {
        return res.status(404).json({ error: 'Draft not found' });
      }

      if (draft.status === 'published') {
        return res.status(400).json({ error: 'Draft already published' });
      }

      // Verify LinkedIn is connected
      const { data: connection } = await supabaseAdmin
        .from('platform_connections')
        .select('id')
        .eq('user_id', userId)
        .eq('platform', 'linkedin')
        .eq('is_active', true)
        .single();

      if (!connection) {
        return res.status(400).json({ error: 'LinkedIn not connected. Connect first in Settings.' });
      }

      // Check for existing schedule for this draft
      const { data: existing } = await supabaseAdmin
        .from('scheduled_posts')
        .select('id')
        .eq('content_draft_id', content_draft_id)
        .in('status', ['pending', 'processing'])
        .single();

      if (existing) {
        return res.status(409).json({ error: 'This draft already has a pending schedule' });
      }

      // Create scheduled post
      const { data: scheduled, error } = await supabaseAdmin
        .from('scheduled_posts')
        .insert({
          user_id: userId,
          content_draft_id,
          scheduled_at,
          status: 'pending',
        })
        .select()
        .single();

      if (error) {
        logger.error('Failed to create schedule', { error });
        return res.status(500).json({ error: 'Failed to schedule post' });
      }

      // Update draft status
      await supabaseAdmin
        .from('content_drafts')
        .update({ status: 'approved' })
        .eq('id', content_draft_id);

      logger.info('Post scheduled', {
        userId,
        draftId: content_draft_id,
        scheduledAt: scheduled_at,
      });

      res.status(201).json({ scheduled });

    } catch (err: any) {
      logger.error('Schedule creation failed', { error: err.message });
      res.status(500).json({ error: 'Failed to schedule post' });
    }
  },

  /**
   * GET /api/schedule
   * List all scheduled posts for the current user
   */
  async list(req: Request, res: Response) {
    const userId = req.user!.id;
    const status = req.query.status as string | undefined;

    let query = supabaseAdmin
      .from('scheduled_posts')
      .select(`
        *,
        content_drafts (
          id, content, content_type, hook, hashtags, platform
        )
      `)
      .eq('user_id', userId)
      .order('scheduled_at', { ascending: true });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('Failed to fetch schedules', { error });
      return res.status(500).json({ error: 'Failed to fetch scheduled posts' });
    }

    res.json({ scheduled_posts: data });
  },

  /**
   * PUT /api/schedule/:id
   * Update a scheduled post (reschedule or cancel)
   */
  async update(req: Request, res: Response) {
    const { id } = req.params;
    const userId = req.user!.id;
    const { scheduled_at, status } = req.body;

    // Only allow updating pending posts
    const { data: existing } = await supabaseAdmin
      .from('scheduled_posts')
      .select('status')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (!existing) {
      return res.status(404).json({ error: 'Scheduled post not found' });
    }

    if (existing.status !== 'pending') {
      return res.status(400).json({ error: `Cannot update a ${existing.status} post` });
    }

    const updates: any = {};
    if (scheduled_at) updates.scheduled_at = scheduled_at;
    if (status === 'cancelled') updates.status = 'cancelled';

    const { data, error } = await supabaseAdmin
      .from('scheduled_posts')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to update schedule' });
    }

    res.json({ scheduled_post: data });
  },

  /**
   * DELETE /api/schedule/:id
   * Delete/cancel a scheduled post
   */
  async delete(req: Request, res: Response) {
    const { id } = req.params;
    const userId = req.user!.id;

    const { error } = await supabaseAdmin
      .from('scheduled_posts')
      .update({ status: 'cancelled' })
      .eq('id', id)
      .eq('user_id', userId)
      .in('status', ['pending']);

    if (error) {
      return res.status(500).json({ error: 'Failed to cancel schedule' });
    }

    res.json({ cancelled: true });
  },
};
```

---

### Task 5.3 — Schedule Routes (`routes/schedule.routes.ts`)
**Priority:** 🔴 Critical  
**Estimated Time:** 10 min

```typescript
// backend/src/routes/schedule.routes.ts
import { Router } from 'express';
import { scheduleController } from '../controllers/schedule.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validateBody, schedulePostSchema } from '../utils/validators';

const router = Router();

router.post(
  '/schedule',
  authMiddleware,
  validateBody(schedulePostSchema),
  scheduleController.create
);

router.get('/schedule', authMiddleware, scheduleController.list);
router.put('/schedule/:id', authMiddleware, scheduleController.update);
router.delete('/schedule/:id', authMiddleware, scheduleController.delete);

export default router;
```

**Wire into `server.ts`:**
```typescript
import scheduleRoutes from './routes/schedule.routes';
app.use('/api', scheduleRoutes);
```

---

### Task 5.4 — Scheduler Service (`services/scheduler.service.ts`)
**Priority:** 🔴 Critical  
**Estimated Time:** 60 min

**Purpose:** Background cron job that runs every 60 seconds, checks for due posts, and publishes them.

**Key Design Decisions:**
- Uses `node-cron` (MVP acceptable)
- Reads ALL due posts from DB on each tick (survives restarts)
- Processes posts one at a time (prevents race conditions)
- Exponential backoff on failures: 2min → 10min → 1hr
- Updates status in DB before and after each attempt

**Implementation Pattern:**
```typescript
// backend/src/services/scheduler.service.ts
import cron from 'node-cron';
import { supabaseAdmin } from '../config/supabase';
import { linkedinService } from './linkedin.service';
import { logger } from '../utils/logger';

// Retry delays in minutes: attempt 1 → 2min, attempt 2 → 10min, attempt 3 → 60min
const RETRY_DELAYS = [2, 10, 60];

export function startScheduler() {
  logger.info('📅 Scheduler started — checking every 60 seconds');

  // Run every minute
  cron.schedule('* * * * *', async () => {
    try {
      await processScheduledPosts();
    } catch (err: any) {
      logger.error('Scheduler tick failed', { error: err.message });
    }
  });
}

async function processScheduledPosts() {
  // Fetch all due posts
  const { data: duePosts, error } = await supabaseAdmin
    .from('scheduled_posts')
    .select(`
      *,
      content_drafts (
        id, content, user_id, platform, content_type
      )
    `)
    .eq('status', 'pending')
    .lte('scheduled_at', new Date().toISOString())
    .order('scheduled_at', { ascending: true })
    .limit(10); // Process max 10 per tick

  if (error) {
    logger.error('Failed to fetch due posts', { error });
    return;
  }

  if (!duePosts || duePosts.length === 0) return;

  logger.info(`Processing ${duePosts.length} due post(s)`);

  for (const post of duePosts) {
    await publishScheduledPost(post);
  }
}

async function publishScheduledPost(post: any) {
  const userId = post.user_id;
  const draftId = post.content_draft_id;

  // Mark as processing (prevents double-processing)
  await supabaseAdmin
    .from('scheduled_posts')
    .update({ status: 'processing' })
    .eq('id', post.id);

  try {
    // 1. Get valid LinkedIn token
    const accessToken = await linkedinService.getValidToken(userId);

    // 2. Get LinkedIn profile ID
    const { data: connection } = await supabaseAdmin
      .from('platform_connections')
      .select('platform_user_id')
      .eq('user_id', userId)
      .eq('platform', 'linkedin')
      .eq('is_active', true)
      .single();

    if (!connection) {
      throw new Error('LinkedIn not connected');
    }

    // 3. Publish to LinkedIn
    const content = post.content_drafts?.content;
    if (!content) {
      throw new Error('Draft content is empty');
    }

    const result = await linkedinService.createPost(
      accessToken,
      connection.platform_user_id,
      content
    );

    // 4. Mark as published
    const publishedUrl = `https://www.linkedin.com/feed/update/${result.id}`;

    await supabaseAdmin
      .from('scheduled_posts')
      .update({
        status: 'published',
        published_at: new Date().toISOString(),
      })
      .eq('id', post.id);

    // Update draft status too
    await supabaseAdmin
      .from('content_drafts')
      .update({
        status: 'published',
        published_at: new Date().toISOString(),
        published_url: publishedUrl,
      })
      .eq('id', draftId);

    logger.info('Scheduled post published', {
      postId: post.id,
      draftId,
      linkedinPostId: result.id,
    });

  } catch (err: any) {
    const newRetryCount = post.retry_count + 1;

    if (newRetryCount >= post.max_retries) {
      // Max retries exceeded — mark as failed
      await supabaseAdmin
        .from('scheduled_posts')
        .update({
          status: 'failed',
          retry_count: newRetryCount,
          last_error: err.message,
        })
        .eq('id', post.id);

      logger.error('Scheduled post failed permanently', {
        postId: post.id,
        error: err.message,
        retryCount: newRetryCount,
      });
    } else {
      // Schedule retry with exponential backoff
      const delayMinutes = RETRY_DELAYS[newRetryCount - 1] || 60;
      const nextAttempt = new Date(Date.now() + delayMinutes * 60 * 1000);

      await supabaseAdmin
        .from('scheduled_posts')
        .update({
          status: 'pending',
          retry_count: newRetryCount,
          last_error: err.message,
          scheduled_at: nextAttempt.toISOString(),
        })
        .eq('id', post.id);

      logger.warn('Scheduled post failed, retrying', {
        postId: post.id,
        error: err.message,
        retryCount: newRetryCount,
        nextAttempt: nextAttempt.toISOString(),
      });
    }
  }
}
```

**Wire into `server.ts`:**
```typescript
import { startScheduler } from './services/scheduler.service';

// After server starts:
server.on('listening', () => {
  startScheduler();
});
```

---

### Task 5.5 — Frontend: Schedule Dialog
**Priority:** 🟡 Important  
**Estimated Time:** 45 min

**Create `ScheduleDialog.tsx`:**
- Modal with date/time picker
- Shows draft content preview
- "Schedule" button calls `backendApi.post('/api/schedule', { content_draft_id, scheduled_at })`
- Validates scheduled_at is in the future
- Success toast: "Post scheduled for [date/time]"
- Uses existing Radix UI Dialog + React Day Picker components

---

### Task 5.6 — Frontend: Scheduled Posts List
**Priority:** 🟡 Important  
**Estimated Time:** 30 min

**Create `ScheduledPostsList.tsx`:**
- Fetches from `backendApi.get('/api/schedule')`
- Shows cards with: draft preview, scheduled time, status badge
- "Cancel" button per post
- "Reschedule" button opens ScheduleDialog
- Status badges: 🟡 Pending, 🔵 Processing, 🟢 Published, 🔴 Failed
- Show retry count and last error for failed posts

**Integrate into Delivery page** or create a new `/schedule` page.

---

## ✅ Phase 5 Completion Checklist

| # | Check | Status |
|---|-------|--------|
| 1 | `scheduled_posts` table created via migration | 🔲 |
| 2 | `POST /api/schedule` creates a pending scheduled post | 🔲 |
| 3 | `GET /api/schedule` lists user's scheduled posts with draft content | 🔲 |
| 4 | `PUT /api/schedule/:id` can reschedule or cancel | 🔲 |
| 5 | `DELETE /api/schedule/:id` cancels a pending post | 🔲 |
| 6 | Cannot schedule in the past (DB constraint) | 🔲 |
| 7 | Cannot schedule an already-published draft | 🔲 |
| 8 | Cron job runs every 60 seconds | 🔲 |
| 9 | Due posts automatically publish to LinkedIn | 🔲 |
| 10 | Failed posts retry with exponential backoff (2m → 10m → 1hr) | 🔲 |
| 11 | After 3 failures, post marked as permanently failed | 🔲 |
| 12 | Frontend schedule dialog works with date/time picker | 🔲 |
| 13 | Frontend shows list of scheduled posts with statuses | 🔲 |
| 14 | Scheduler survives backend restart (reads from DB) | 🔲 |

---

## ⚠️ Important Design Notes

### Why `node-cron` is Acceptable for MVP
- Persistent state is in the DB, not in memory
- On restart, the cron simply re-reads all pending posts
- No posts are "lost" — worst case is a 60-second delay

### Future Upgrade Path (Post-MVP)
- Replace `node-cron` with **Redis + BullMQ**
- Add dedicated worker process
- Support priority queues
- Add dead-letter queue for permanently failed posts
- Add webhook notifications on publish/fail

### LinkedIn Rate Limit Awareness
- Max 10 posts processed per cron tick
- If user has multiple due posts, they're processed sequentially
- 429 errors trigger retry with backoff
- Monitor daily API call budget (100/day on developer tier)

---

## 📎 References

- **Architecture:** `docs/ARCHITECTURE.md` → Section 7 (Flow 3), Section 8 (scheduled_posts SQL)
- **API Contract:** `docs/ARCHITECTURE.md` → Section 11 (Schedule endpoints)
- **node-cron docs:** https://www.npmjs.com/package/node-cron
