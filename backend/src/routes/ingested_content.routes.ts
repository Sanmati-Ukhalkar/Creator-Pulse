import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { ingestedContentController } from '../controllers/ingested_content.controller';

const router = Router();

router.get('/', authMiddleware, ingestedContentController.listContent);
router.get('/:id', authMiddleware, ingestedContentController.getContent);

export default router;
