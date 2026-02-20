import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { researchController } from '../controllers/research.controller';

const router = Router();

router.post('/topic', authMiddleware, researchController.conductResearch);
router.get('/topic/:topicId', authMiddleware, researchController.getTopicResearch);

export default router;
