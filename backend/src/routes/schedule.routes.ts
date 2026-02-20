import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { validate, schedulePostSchema } from '../middleware/validate.middleware';
import { scheduleController } from '../controllers/schedule.controller';

const router = Router();

// Create new scheduled post
router.post(
    '/schedule',
    authMiddleware,
    validate(schedulePostSchema),
    scheduleController.create
);

// List scheduled posts
router.get(
    '/schedule',
    authMiddleware,
    scheduleController.list
);

// Delete/Cancel scheduled post
router.delete(
    '/schedule/:id',
    authMiddleware,
    scheduleController.delete
);

// Update scheduled post
router.put(
    '/schedule/:id',
    authMiddleware,
    scheduleController.update
);

export default router;
