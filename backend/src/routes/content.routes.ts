import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { aiLimiter } from '../middleware/rateLimiter.middleware';
import {
    validate,
    generateContentSchema,
    publishContentSchema,
} from '../middleware/validate.middleware';
import { generateController } from '../controllers/generate.controller';
import { publishController } from '../controllers/publish.controller';

const router = Router();

/**
 * POST /api/generate
 *
 * Generate LinkedIn content from a trend/topic.
 * Protected by: JWT auth + AI rate limiter (10 req/15min) + Zod validation
 */
router.post(
    '/generate',
    authMiddleware,
    aiLimiter,
    validate(generateContentSchema),
    generateController.generate
);

/**
 * POST /api/publish
 *
 * Publish content directly to LinkedIn.
 * Protected by: JWT auth + Zod validation
 */
router.post(
    '/publish',
    authMiddleware,
    validate(publishContentSchema),
    publishController.publishNow
);

export default router;
