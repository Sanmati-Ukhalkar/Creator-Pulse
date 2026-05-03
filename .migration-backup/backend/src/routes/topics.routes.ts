import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { topicsController } from '../controllers/topics.controller';

const router = Router();

router.get('/', authMiddleware, topicsController.getTopics);
router.post('/', authMiddleware, topicsController.createTopic);

export default router;
