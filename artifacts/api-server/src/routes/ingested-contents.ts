import { Router, type Request, type Response } from "express";
import { pool } from "@workspace/db";
import { logger } from "../lib/logger";
import { authMiddleware } from "../middlewares/auth";

const router: Router = Router();

router.get("/", authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const result = await pool.query(
      `SELECT ic.*, s.source_name, s.source_type
       FROM ingested_contents ic
       LEFT JOIN sources s ON ic.source_id = s.id
       WHERE ic.user_id = $1
       ORDER BY ic.created_at DESC`,
      [userId]
    );
    const data = result.rows.map((row: any) => ({
      ...row,
      sources: { source_name: row.source_name, source_type: row.source_type }
    }));
    res.json(data);
  } catch (err: any) {
    logger.error({ err }, "Error listing ingested content");
    res.status(500).json({ error: "Failed to list content" });
  }
});

router.get("/:id", authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const result = await pool.query(
      `SELECT ic.*, s.source_name, s.source_type
       FROM ingested_contents ic
       LEFT JOIN sources s ON ic.source_id = s.id
       WHERE ic.id = $1 AND ic.user_id = $2`,
      [id, userId]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ error: "Content not found" });
      return;
    }
    const row = result.rows[0];
    res.json({ ...row, sources: { source_name: row.source_name, source_type: row.source_type } });
  } catch (err: any) {
    logger.error({ err }, "Error fetching content");
    res.status(500).json({ error: "Failed to fetch content" });
  }
});

export default router;
