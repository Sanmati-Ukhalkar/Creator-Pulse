import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { profileController } from '../controllers/profile.controller';

const router = Router();

router.get('/', authMiddleware, profileController.getProfile);
router.put('/', authMiddleware, profileController.updateProfile);
router.post('/onboarding', authMiddleware, profileController.completeOnboarding);

export default router;
