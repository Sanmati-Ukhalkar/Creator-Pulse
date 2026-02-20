import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { trendsController } from '../controllers/trends.controller';

const router = Router();

router.get('/', authMiddleware, trendsController.listTrends);
router.get('/:id', authMiddleware, trendsController.getTrend);
router.post('/trigger', authMiddleware, trendsController.triggerResearch);

export default router;
