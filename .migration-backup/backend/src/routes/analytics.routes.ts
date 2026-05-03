import { Router } from 'express';
import { analyticsController } from '../controllers/analytics.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// All analytics routes require authentication
router.use(authMiddleware);

/**
 * POST /api/analytics/sync/:draftId
 * Trigger manual sync of metrics for a draft
 */
router.post('/sync/:draftId', analyticsController.syncDraftAnalytics);

export default router;
