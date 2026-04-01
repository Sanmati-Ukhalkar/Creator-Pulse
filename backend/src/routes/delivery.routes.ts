import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { deliveryController } from '../controllers/delivery.controller';

const router = Router();

router.get('/settings', authMiddleware, deliveryController.getSettings);
router.put('/settings', authMiddleware, deliveryController.updateSettings);
router.get('/status', authMiddleware, deliveryController.getDeliveryStatus);

export default router;
