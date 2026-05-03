import { Router } from 'express';
import { linkedinController } from '../controllers/linkedin.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Generate OAuth URL — requires JWT (need to know which user)
router.get('/auth-url', authMiddleware, linkedinController.getAuthUrl);

// OAuth callback — NO auth (LinkedIn redirects here directly)
router.get('/callback', linkedinController.callback);

// Check connection status — requires JWT
router.get('/status', authMiddleware, linkedinController.getStatus);

// Disconnect LinkedIn — requires JWT
router.delete('/disconnect', authMiddleware, linkedinController.disconnect);

export default router;
