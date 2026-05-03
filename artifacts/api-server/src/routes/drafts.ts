import { Router, type Request, type Response } from "express";
import { pool } from "@workspace/db";
import { logger } from "../lib/logger";
import { authMiddleware } from "../middlewares/auth";

const router: Router = Router();

router.get("/", authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const result = await pool.query(
      "SELECT * FROM drafts WHERE user_id = $1 ORDER BY created_at DESC",
      [userId]
    );
    res.json(result.rows);
  } catch (err: any) {
    logger.error({ err }, "Error fetching drafts");
    res.status(500).json({ error: "Failed to fetch drafts" });
  }
});

router.post("/", authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { platform, content_type, title, content, metadata, status } = req.body;
    const result = await pool.query(
      `INSERT INTO drafts (user_id, platform, content_type, title, content, metadata, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [userId, platform, content_type, title, content, metadata, status || "draft"]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    logger.error({ err }, "Error creating draft");
    res.status(500).json({ error: "Failed to create draft" });
  }
});

router.put("/:id", authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { title, content, status, metadata } = req.body;

    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (title !== undefined) { fields.push(`title = $${idx++}`); values.push(title); }
    if (content !== undefined) { fields.push(`content = $${idx++}`); values.push(content); }
    if (status !== undefined) { fields.push(`status = $${idx++}`); values.push(status); }
    if (metadata !== undefined) { fields.push(`metadata = $${idx++}`); values.push(metadata); }

    if (fields.length === 0) {
      res.status(400).json({ error: "No fields to update" });
      return;
    }

    fields.push(`updated_at = NOW()`);
    values.push(userId, id);

    const query = `UPDATE drafts SET ${fields.join(", ")} WHERE user_id = $${idx++} AND id = $${idx++} RETURNING *`;
    const result = await pool.query(query, values);

    if (result.rowCount === 0) {
      res.status(404).json({ error: "Draft not found or unauthorized" });
      return;
    }

    res.json(result.rows[0]);
  } catch (err: any) {
    logger.error({ err }, "Error updating draft");
    res.status(500).json({ error: "Failed to update draft" });
  }
});

router.delete("/:id", authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const result = await pool.query(
      "DELETE FROM drafts WHERE user_id = $1 AND id = $2 RETURNING id",
      [userId, id]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ error: "Draft not found or unauthorized" });
      return;
    }
    res.json({ message: "Draft deleted successfully" });
  } catch (err: any) {
    logger.error({ err }, "Error deleting draft");
    res.status(500).json({ error: "Failed to delete draft" });
  }
});

export default router;
