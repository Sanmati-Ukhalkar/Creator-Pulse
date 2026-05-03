import { Router, type Request, type Response } from "express";
import { pool } from "@workspace/db";
import { logger } from "../lib/logger";
import { authMiddleware } from "../middlewares/auth";

const router: Router = Router();

router.get("/", authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { date } = req.query;

    let query = "SELECT * FROM topics WHERE user_id = $1";
    const params: any[] = [userId];

    if (date) {
      const dateObj = new Date(date as string);
      const start = new Date(dateObj);
      start.setHours(0, 0, 0, 0);
      const end = new Date(dateObj);
      end.setHours(23, 59, 59, 999);
      query += ` AND created_at >= $2 AND created_at <= $3`;
      params.push(start.toISOString(), end.toISOString());
    }

    query += " ORDER BY trend_score DESC NULLS LAST";
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    logger.error({ err }, "Error fetching topics");
    res.status(500).json({ error: "Failed to fetch topics" });
  }
});

router.post("/", authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { title, description, keywords, trend_score, confidence_score, is_trending, topic_type } = req.body;
    const result = await pool.query(
      `INSERT INTO topics (user_id, title, description, keywords, trend_score, confidence_score, is_trending, topic_type, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       RETURNING *`,
      [userId, title, description, keywords || [], trend_score || 0, confidence_score || 0, is_trending || false, topic_type]
    );
    res.json(result.rows[0]);
  } catch (err) {
    logger.error({ err }, "Error creating topic");
    res.status(500).json({ error: "Failed to create topic" });
  }
});

export default router;
