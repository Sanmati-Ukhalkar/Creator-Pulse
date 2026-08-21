import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { aiLimiter } from '../middleware/rateLimiter.middleware';
import { imageController } from '../controllers/image.controller';

const router = Router();

/**
 * POST /api/generate-image
 *
 * Generate a LinkedIn banner image from post text.
 * Protected by: JWT auth + AI rate limiter (shared 10 req/15min bucket).
 *
 * Body: { post_text, topic, provider?, seed?, draft_id? }
 */
router.post('/', authMiddleware, aiLimiter, imageController.generate);

export default router;
