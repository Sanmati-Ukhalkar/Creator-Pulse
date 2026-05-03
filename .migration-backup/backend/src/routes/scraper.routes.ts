import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { scraperController } from '../controllers/scraper.controller';

const router = Router();

router.post('/run', authMiddleware, scraperController.run);
router.post('/import-tweet', authMiddleware, scraperController.importTweet);
router.post('/validate-rss', authMiddleware, scraperController.validateRss);

export default router;
