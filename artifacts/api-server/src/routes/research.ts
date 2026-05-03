import { Router, type Request, type Response } from "express";
import { pool } from "@workspace/db";
import { logger } from "../lib/logger";
import { authMiddleware } from "../middlewares/auth";

const router: Router = Router();

router.post("/topic", authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { topic_id, depth_level } = req.body;
    logger.info({ userId, topic_id, depth_level }, "Topic research triggered");
    res.json({ success: true, message: "Research queued", cached: false });
  } catch (err) {
    logger.error({ err }, "Research error");
    res.status(500).json({ error: "Failed to conduct research" });
  }
});

router.get("/topic/:topicId", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { topicId } = req.params;
    const result = await pool.query(
      `SELECT * FROM trend_research WHERE id = $1`,
      [topicId]
    );
    res.json(result.rows[0] ?? null);
  } catch (err) {
    logger.error({ err }, "Get topic research error");
    res.status(500).json({ error: "Failed to get topic research" });
  }
});

export default router;
