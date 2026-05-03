import { Router, type Request, type Response } from "express";
import { pool } from "@workspace/db";
import { logger } from "../lib/logger";
import { authMiddleware } from "../middlewares/auth";

const router: Router = Router();

router.get("/settings", authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const result = await pool.query(
      "SELECT * FROM delivery_preferences WHERE user_id = $1",
      [userId]
    );
    if (result.rowCount === 0) {
      res.json({ delivery_time: "09:00", frequency: "daily", channels: ["email"], timezone: "UTC" });
      return;
    }
    res.json(result.rows[0]);
  } catch (err: any) {
    logger.error({ err }, "Error fetching delivery settings");
    res.status(500).json({ error: "Failed to fetch settings" });
  }
});

router.put("/settings", authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { delivery_time, frequency, channels, timezone } = req.body;
    const result = await pool.query(
      `INSERT INTO delivery_preferences (user_id, delivery_time, frequency, channels, timezone, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
          delivery_time = EXCLUDED.delivery_time,
          frequency = EXCLUDED.frequency,
          channels = EXCLUDED.channels,
          timezone = EXCLUDED.timezone,
          updated_at = NOW()
       RETURNING *`,
      [userId, delivery_time || "09:00", frequency || "daily", channels || ["email"], timezone || "UTC"]
    );
    res.json(result.rows[0]);
  } catch (err: any) {
    logger.error({ err }, "Error updating delivery settings");
    res.status(500).json({ error: "Failed to update settings" });
  }
});

router.get("/status", authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const result = await pool.query(
      "SELECT * FROM delivery_preferences WHERE user_id = $1",
      [userId]
    );
    res.json({
      configured: result.rowCount! > 0,
      settings: result.rowCount! > 0 ? result.rows[0] : null
    });
  } catch (err: any) {
    logger.error({ err }, "Error fetching delivery status");
    res.status(500).json({ error: "Failed to fetch delivery status" });
  }
});

export default router;
