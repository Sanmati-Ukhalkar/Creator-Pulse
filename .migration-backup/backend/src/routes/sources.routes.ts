import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { sourcesController } from '../controllers/sources.controller';

const router = Router();

router.get('/', authMiddleware, sourcesController.getAll);
router.post('/', authMiddleware, sourcesController.create);
router.patch('/:id', authMiddleware, sourcesController.update);
router.delete('/:id', authMiddleware, sourcesController.delete);

export default router;
