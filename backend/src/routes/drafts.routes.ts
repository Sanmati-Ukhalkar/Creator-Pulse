import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { draftsController } from '../controllers/drafts.controller';

const router = Router();

router.get('/', authMiddleware, draftsController.getAll);
router.post('/', authMiddleware, draftsController.create);
router.put('/:id', authMiddleware, draftsController.update);
router.delete('/:id', authMiddleware, draftsController.delete);

export default router;
