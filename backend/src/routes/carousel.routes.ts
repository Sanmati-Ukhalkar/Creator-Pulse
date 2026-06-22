import { Router } from 'express';
import { generateCarousel, getCarouselStatus, serveCarouselAsset } from '../controllers/carousel.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.post('/generate', authMiddleware, generateCarousel);
router.get('/:id', authMiddleware, getCarouselStatus);
router.get('/:jobId/asset/:filename', serveCarouselAsset);

export default router;
