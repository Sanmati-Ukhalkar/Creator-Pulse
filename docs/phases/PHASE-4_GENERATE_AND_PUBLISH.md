# Phase 4 — Content Generation & Publish Now

> **Timeline:** Week 3 (Days 11–14)  
> **Depends On:** Phase 2 (AI Service running) + Phase 3 (LinkedIn tokens stored)  
> **Unlocks:** Phase 5 (Scheduler — reuses publish logic)  
> **Status:** 🔲 Not Started

---

## 🎯 Phase Objective

Wire the complete content generation and publishing pipeline:
- Backend generation controller calls AI service, saves drafts to DB
- Backend publish controller posts to LinkedIn via API
- Frontend "Generate" button triggers AI content creation
- Frontend "Publish Now" button pushes approved draft to LinkedIn
- Full logging to `ai_processing_logs` and `usage_tracking`
- Error handling with user-friendly messages

**End state:** User selects a trend → generates a LinkedIn draft → reviews/edits → publishes directly to LinkedIn.

---

## 📁 Files to Create / Modify

```
backend/src/
├── controllers/
│   └── generation.controller.ts      # NEW — Generate + Publish handlers
├── routes/
│   └── generation.routes.ts          # NEW — Route definitions
├── utils/
│   └── validators.ts                 # NEW — Zod request schemas
└── server.ts                         # MODIFY — Add generation routes

frontend/src/
├── hooks/
│   └── useBackendApi.ts              # NEW — Axios client for backend
├── components/
│   └── drafts/
│       ├── GenerateButton.tsx        # NEW or MODIFY
│       └── PublishButton.tsx         # NEW or MODIFY
└── pages/
    ├── Drafts.tsx                    # MODIFY — Wire generate/publish
    └── Intelligence.tsx              # MODIFY — Wire generate from trends
```

---

## 📋 Task Breakdown

### Task 4.1 — Request Validators (`utils/validators.ts`)
**Priority:** 🔴 Critical  
**Estimated Time:** 20 min

**Purpose:** Zod schemas for validating all incoming request bodies. Reject malformed requests before they reach controllers.

**Implementation Pattern:**
```typescript
// backend/src/utils/validators.ts
import { z } from 'zod';

export const generateLinkedInSchema = z.object({
  trend_id: z.string().uuid(),
  content_type: z.enum(['linkedin_short', 'linkedin_long']),
});

export const publishNowSchema = z.object({
  content_draft_id: z.string().uuid(),
});

export const schedulePostSchema = z.object({
  content_draft_id: z.string().uuid(),
  scheduled_at: z.string().datetime(),
});

// Generic validation middleware factory
export function validateBody<T>(schema: z.ZodSchema<T>) {
  return (req: any, res: any, next: any) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: result.error.flatten().fieldErrors,
      });
    }
    req.validatedBody = result.data;
    next();
  };
}
```

**Acceptance Criteria:**
- [ ] Invalid UUID returns 400 with field-level errors
- [ ] Missing required fields return 400
- [ ] Invalid `content_type` returns 400
- [ ] Valid requests pass through to controller

---

### Task 4.2 — Generation Controller (`controllers/generation.controller.ts`)
**Priority:** 🔴 Critical  
**Estimated Time:** 60 min

**Two endpoints:**

#### `POST /api/generate-linkedin`
Flow: Validate → Fetch trend → Fetch voice samples → Call AI → Save draft → Log → Return

#### `POST /api/publish-now`
Flow: Validate → Fetch draft → Get LinkedIn token → Post to LinkedIn → Update draft status → Log → Return

**Implementation Pattern:**
```typescript
// backend/src/controllers/generation.controller.ts
import { Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { aiService } from '../services/ai.service';
import { linkedinService } from '../services/linkedin.service';
import { logger } from '../utils/logger';

export const generationController = {
  /**
   * POST /api/generate-linkedin
   * Generate AI LinkedIn content from a trend
   */
  async generateLinkedIn(req: Request, res: Response) {
    const { trend_id, content_type } = req.validatedBody;
    const userId = req.user!.id;
    const startTime = Date.now();

    try {
      // 1. Fetch trend from DB
      const { data: trend, error: trendError } = await supabaseAdmin
        .from('trend_insights')
        .select('*')
        .eq('id', trend_id)
        .single();

      if (trendError || !trend) {
        return res.status(404).json({ error: 'Trend not found' });
      }

      // 2. Fetch user's voice samples (latest 5)
      const { data: voiceSamples } = await supabaseAdmin
        .from('voice_training_data')
        .select('sample_content')
        .eq('user_id', userId)
        .eq('platform', 'linkedin')
        .eq('is_training_sample', true)
        .order('sample_rank', { ascending: false })
        .limit(5);

      const samples = voiceSamples?.map(s => s.sample_content) || [];

      // 3. Call AI service
      const aiResult = await aiService.generateContent({
        trend: {
          topic: trend.trend_topic,
          description: trend.trend_description,
          source_url: trend.source_evidence?.[0]?.url,
          keywords: trend.relevant_keywords || [],
        },
        voice_samples: samples,
        content_type,
        platform: 'linkedin',
      });

      // 4. Save draft to DB
      const { data: draft, error: draftError } = await supabaseAdmin
        .from('content_drafts')
        .insert({
          user_id: userId,
          platform: 'linkedin',
          content_type,
          content: aiResult.content,
          hook: aiResult.hook,
          hashtags: aiResult.hashtags,
          trend_source_id: trend_id,
          voice_confidence_score: aiResult.engagement_prediction.confidence,
          engagement_prediction: aiResult.engagement_prediction,
          status: 'pending',
        })
        .select()
        .single();

      if (draftError) {
        logger.error('Failed to save draft', { error: draftError });
        return res.status(500).json({ error: 'Failed to save generated content' });
      }

      // 5. Log AI processing
      await supabaseAdmin.from('ai_processing_logs').insert({
        user_id: userId,
        processing_type: 'content_generation',
        input_data: { trend_id, content_type },
        output_data: { draft_id: draft.id, tokens: aiResult.tokens_consumed },
        model_version: aiResult.model_version,
        processing_time_ms: aiResult.processing_time_ms,
        tokens_consumed: aiResult.tokens_consumed,
        status: 'completed',
        completed_at: new Date().toISOString(),
      });

      // 6. Track usage
      await supabaseAdmin.from('usage_tracking').insert({
        user_id: userId,
        usage_date: new Date().toISOString().split('T')[0],
        action_type: 'draft_generated',
        platform: 'linkedin',
        credits_consumed: 1.0,
        metadata: { content_type, trend_topic: trend.trend_topic },
      });

      logger.info('LinkedIn content generated', {
        userId,
        draftId: draft.id,
        contentType: content_type,
        processingMs: aiResult.processing_time_ms,
      });

      res.status(201).json({
        draft,
        generation_stats: {
          tokens_consumed: aiResult.tokens_consumed,
          processing_time_ms: aiResult.processing_time_ms,
          model: aiResult.model_version,
        },
      });

    } catch (err: any) {
      // Log failed attempt
      await supabaseAdmin.from('ai_processing_logs').insert({
        user_id: userId,
        processing_type: 'content_generation',
        input_data: { trend_id, content_type },
        status: 'failed',
        error_message: err.message,
        processing_time_ms: Date.now() - startTime,
      }).catch(() => {}); // Don't fail on logging failure

      logger.error('Content generation failed', { error: err.message, userId });
      res.status(500).json({ error: 'Content generation failed', details: err.message });
    }
  },

  /**
   * POST /api/publish-now
   * Publish an approved draft to LinkedIn immediately
   */
  async publishNow(req: Request, res: Response) {
    const { content_draft_id } = req.validatedBody;
    const userId = req.user!.id;

    try {
      // 1. Fetch draft
      const { data: draft, error: draftError } = await supabaseAdmin
        .from('content_drafts')
        .select('*')
        .eq('id', content_draft_id)
        .eq('user_id', userId)
        .single();

      if (draftError || !draft) {
        return res.status(404).json({ error: 'Draft not found' });
      }

      if (draft.status === 'published') {
        return res.status(400).json({ error: 'Draft already published' });
      }

      // 2. Get valid LinkedIn token
      const accessToken = await linkedinService.getValidToken(userId);

      // 3. Get LinkedIn profile ID
      const { data: connection } = await supabaseAdmin
        .from('platform_connections')
        .select('platform_user_id')
        .eq('user_id', userId)
        .eq('platform', 'linkedin')
        .single();

      if (!connection) {
        return res.status(400).json({ error: 'LinkedIn not connected' });
      }

      // 4. Post to LinkedIn
      const linkedinResponse = await linkedinService.createPost(
        accessToken,
        connection.platform_user_id,
        draft.content
      );

      // 5. Update draft status
      const publishedUrl = `https://www.linkedin.com/feed/update/${linkedinResponse.id}`;
      await supabaseAdmin
        .from('content_drafts')
        .update({
          status: 'published',
          published_at: new Date().toISOString(),
          published_url: publishedUrl,
        })
        .eq('id', content_draft_id);

      // 6. Log
      await supabaseAdmin.from('usage_tracking').insert({
        user_id: userId,
        usage_date: new Date().toISOString().split('T')[0],
        action_type: 'draft_accepted',
        platform: 'linkedin',
        credits_consumed: 0,
        metadata: { draft_id: content_draft_id },
      });

      logger.info('Published to LinkedIn', {
        userId,
        draftId: content_draft_id,
        linkedinPostId: linkedinResponse.id,
      });

      res.json({
        published: true,
        linkedin_post_url: publishedUrl,
        linkedin_post_id: linkedinResponse.id,
      });

    } catch (err: any) {
      logger.error('Publish to LinkedIn failed', { error: err.message, userId });
      res.status(500).json({ error: 'Failed to publish to LinkedIn', details: err.message });
    }
  },
};
```

---

### Task 4.3 — Add `createPost` to LinkedIn Service
**Priority:** 🔴 Critical  
**Estimated Time:** 30 min

**Add to `services/linkedin.service.ts`:**
```typescript
/**
 * Create a LinkedIn post via UGC API
 */
async createPost(
  accessToken: string,
  authorUrn: string,
  content: string
): Promise<{ id: string }> {
  try {
    const response = await axios.post(
      LINKEDIN_UGC_URL,
      {
        author: `urn:li:person:${authorUrn}`,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: { text: content },
            shareMediaCategory: 'NONE',
          },
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0',
        },
      }
    );

    return { id: response.headers['x-restli-id'] || response.data.id };
  } catch (error: any) {
    const status = error.response?.status;
    const message = error.response?.data?.message || error.message;

    if (status === 429) {
      throw new Error('LinkedIn rate limit exceeded. Try again later.');
    }
    if (status === 401) {
      throw new Error('LinkedIn token expired. Please reconnect.');
    }

    logger.error('LinkedIn API error', { status, message });
    throw new Error(`LinkedIn post failed: ${message}`);
  }
},
```

**Acceptance Criteria:**
- [ ] Successfully creates a LinkedIn post
- [ ] Returns the LinkedIn post ID
- [ ] Handles 429 (rate limit) with clear message
- [ ] Handles 401 (expired token) with clear message

---

### Task 4.4 — Generation Routes (`routes/generation.routes.ts`)
**Priority:** 🔴 Critical  
**Estimated Time:** 10 min

```typescript
// backend/src/routes/generation.routes.ts
import { Router } from 'express';
import { generationController } from '../controllers/generation.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validateBody, generateLinkedInSchema, publishNowSchema } from '../utils/validators';
import { aiLimiter } from '../middleware/rateLimiter.middleware';

const router = Router();

router.post(
  '/generate-linkedin',
  authMiddleware,
  aiLimiter,
  validateBody(generateLinkedInSchema),
  generationController.generateLinkedIn
);

router.post(
  '/publish-now',
  authMiddleware,
  validateBody(publishNowSchema),
  generationController.publishNow
);

export default router;
```

**Wire into `server.ts`:**
```typescript
import generationRoutes from './routes/generation.routes';
app.use('/api', generationRoutes);
```

---

### Task 4.5 — Frontend: Backend API Client (`hooks/useBackendApi.ts`)
**Priority:** 🔴 Critical  
**Estimated Time:** 30 min

**Purpose:** Centralized Axios client that automatically attaches the Supabase JWT to every request.

**Implementation Pattern:**
```typescript
// frontend/src/hooks/useBackendApi.ts
import axios from 'axios';
import { supabase } from '@/integrations/supabase/client';

const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const backendApi = axios.create({
  baseURL: BACKEND_URL,
  timeout: 60000,
});

// Attach JWT to every request
backendApi.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
});

export { backendApi };
```

**Also add to `.env`:**
```bash
VITE_API_URL=http://localhost:4000
```

---

### Task 4.6 — Frontend: Wire Generate & Publish Buttons
**Priority:** 🟡 Important  
**Estimated Time:** 60 min

**Modify existing components:**

1. **Intelligence page:** "Generate Content" button on trend cards → calls `backendApi.post('/api/generate-linkedin', { trend_id, content_type })`
2. **Drafts page:** "Publish to LinkedIn" button on approved drafts → calls `backendApi.post('/api/publish-now', { content_draft_id })`

**UX Requirements:**
- Loading state with spinner during generation (can take 5-15 seconds)
- Success toast: "LinkedIn post published! View it here →"
- Error toast with specific LinkedIn error message
- Disable button after publish (prevent double-post)
- Show published URL link after success

**Acceptance Criteria:**
- [ ] "Generate" on Intelligence page creates a new draft
- [ ] New draft appears on Drafts page
- [ ] "Publish" on Drafts page posts to LinkedIn
- [ ] Published draft shows LinkedIn URL
- [ ] Loading states work correctly
- [ ] Error messages are user-friendly

---

## ✅ Phase 4 Completion Checklist

| # | Check | Status |
|---|-------|--------|
| 1 | `POST /api/generate-linkedin` with valid trend_id → returns generated draft | 🔲 |
| 2 | Generated draft saved in `content_drafts` with correct fields | 🔲 |
| 3 | AI processing logged in `ai_processing_logs` | 🔲 |
| 4 | Usage tracked in `usage_tracking` | 🔲 |
| 5 | `POST /api/publish-now` with valid draft_id → posts to LinkedIn | 🔲 |
| 6 | Draft status updated to "published" with URL | 🔲 |
| 7 | Invalid requests return 400 with clear validation errors | 🔲 |
| 8 | Rate limiter blocks excessive AI generation requests | 🔲 |
| 9 | Frontend "Generate" and "Publish" buttons work end-to-end | 🔲 |
| 10 | Full flow: Trend → Generate → Review → Publish → Live on LinkedIn | 🔲 |

---

## 📎 References

- **Architecture:** `docs/ARCHITECTURE.md` → Section 7 (Flows 1 & 2)
- **API Contract:** `docs/ARCHITECTURE.md` → Section 11
- **LinkedIn UGC API:** https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/ugc-post-api
