import { Router, type Request, type Response } from "express";
import { pool } from "@workspace/db";
import { logger } from "../lib/logger";
import { authMiddleware } from "../middlewares/auth";

const router: Router = Router();

router.get("/", authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { status } = req.query;

    let query = "SELECT * FROM scheduled_posts WHERE user_id = $1";
    const params: (string | number | boolean | null)[] = [userId];

    if (status) {
      query += " AND status = $2";
      params.push(status);
    }

    query += " ORDER BY scheduled_at ASC";
    const result = await pool.query(query, params);
    res.json({ data: result.rows });
  } catch (err) {
    logger.error({ err }, "Error listing schedules");
    res.status(500).json({ error: "Failed to list schedules" });
  }
});

router.post("/", authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { platform, content, scheduled_at, draft_id } = req.body;

    const result = await pool.query(
      `INSERT INTO scheduled_posts (user_id, platform, content, scheduled_at, status)
       VALUES ($1, $2, $3, $4, 'scheduled')
       RETURNING *`,
      [userId, platform, content, scheduled_at]
    );
    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    logger.error({ err }, "Error creating schedule");
    res.status(500).json({ error: "Failed to create schedule" });
  }
});

router.put("/:id", authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { platform, content, scheduled_at, status } = req.body;

    const fields: string[] = [];
    const values: (string | number | boolean | null)[] = [];
    let idx = 1;

    if (platform !== undefined) { fields.push(`platform = $${idx++}`); values.push(platform); }
    if (content !== undefined) { fields.push(`content = $${idx++}`); values.push(content); }
    if (scheduled_at !== undefined) { fields.push(`scheduled_at = $${idx++}`); values.push(scheduled_at); }
    if (status !== undefined) { fields.push(`status = $${idx++}`); values.push(status); }

    if (fields.length === 0) {
      res.status(400).json({ error: "No fields to update" });
      return;
    }

    fields.push(`updated_at = NOW()`);
    values.push(userId, id);

    const result = await pool.query(
      `UPDATE scheduled_posts SET ${fields.join(", ")} WHERE user_id = $${idx++} AND id = $${idx++} RETURNING *`,
      values
    );

    if (result.rowCount === 0) {
      res.status(404).json({ error: "Schedule not found" });
      return;
    }
    res.json({ data: result.rows[0] });
  } catch (err) {
    logger.error({ err }, "Error updating schedule");
    res.status(500).json({ error: "Failed to update schedule" });
  }
});

router.delete("/:id", authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const result = await pool.query(
      "UPDATE scheduled_posts SET status = 'cancelled', updated_at = NOW() WHERE user_id = $1 AND id = $2 RETURNING id",
      [userId, id]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ error: "Schedule not found" });
      return;
    }
    res.json({ message: "Schedule cancelled" });
  } catch (err) {
    logger.error({ err }, "Error cancelling schedule");
    res.status(500).json({ error: "Failed to cancel schedule" });
  }
});

export default router;
