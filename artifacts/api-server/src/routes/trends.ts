import { Router, type Request, type Response } from "express";
import { pool } from "@workspace/db";
import { logger } from "../lib/logger";
import { authMiddleware } from "../middlewares/auth";

const router: Router = Router();

router.get("/", authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const result = await pool.query(
      "SELECT * FROM trend_research WHERE user_id = $1 ORDER BY created_at DESC",
      [userId]
    );
    res.json(result.rows);
  } catch (err: any) {
    logger.error({ err }, "Error listing trends");
    res.status(500).json({ error: "Failed to list trends" });
  }
});

router.get("/:id", authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const result = await pool.query(
      "SELECT * FROM trend_research WHERE id = $1 AND user_id = $2",
      [id, userId]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ error: "Trend research not found" });
      return;
    }
    res.json(result.rows[0]);
  } catch (err: any) {
    logger.error({ err }, "Error fetching trend");
    res.status(500).json({ error: "Failed to fetch trend" });
  }
});

router.post("/trigger", authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { title, categories = [] } = req.body;

    const result = await pool.query(
      `INSERT INTO trend_research (user_id, query, title, status, categories, created_at)
       VALUES ($1, $2, $3, 'pending', $4, NOW())
       RETURNING *`,
      [userId, title, title, categories]
    );

    res.json({
      success: true,
      trend: result.rows[0],
      message: "Trend research queued"
    });
  } catch (err: any) {
    logger.error({ err }, "Error triggering trend research");
    res.status(500).json({ error: "Failed to trigger trend research" });
  }
});

export default router;
