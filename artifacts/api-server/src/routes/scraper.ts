import { Router, type Request, type Response } from "express";
import { pool } from "@workspace/db";
import { logger } from "../lib/logger";
import { authMiddleware } from "../middlewares/auth";

const router: Router = Router();

router.post("/validate-rss", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { url } = req.body;
    if (!url) {
      res.status(400).json({ error: "url is required" });
      return;
    }

    const isValidUrl = /^https?:\/\/.+/.test(url);
    if (!isValidUrl) {
      res.json({ valid: false, message: "Invalid URL format" });
      return;
    }

    res.json({ valid: true, message: "URL format is valid (deep validation requires content scraping service)" });
  } catch (err) {
    logger.error({ err }, "Error validating RSS feed");
    res.status(500).json({ error: "Validation failed" });
  }
});

router.post("/run", authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { source_id } = req.body;

    if (!source_id) {
      res.status(400).json({ error: "source_id is required" });
      return;
    }

    const sourceResult = await pool.query(
      "SELECT * FROM sources WHERE id = $1 AND user_id = $2",
      [source_id, userId]
    );

    if (sourceResult.rowCount === 0) {
      res.status(404).json({ error: "Source not found" });
      return;
    }

    await pool.query(
      "UPDATE sources SET sync_status = 'syncing', last_sync_at = NOW(), updated_at = NOW() WHERE id = $1",
      [source_id]
    );

    logger.info({ userId, source_id }, "Scrape requested (scraping service not configured)");

    await pool.query(
      "UPDATE sources SET sync_status = 'synced', updated_at = NOW() WHERE id = $1",
      [source_id]
    );

    res.json({
      success: true,
      scraped_count: 0,
      note: "Content scraping service is not configured. Connect a scraping provider to enable real content ingestion."
    });
  } catch (err) {
    logger.error({ err }, "Error running scraper");
    res.status(500).json({ error: "Scraping failed" });
  }
});

router.post("/import-tweet", authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { source_id, tweet_url } = req.body;

    if (!tweet_url) {
      res.status(400).json({ error: "tweet_url is required" });
      return;
    }

    logger.info({ userId, source_id, tweet_url }, "Tweet import requested (Twitter API not configured)");

    res.json({
      success: true,
      imported: 0,
      note: "Twitter API integration is not configured."
    });
  } catch (err) {
    logger.error({ err }, "Error importing tweet");
    res.status(500).json({ error: "Tweet import failed" });
  }
});

export default router;
