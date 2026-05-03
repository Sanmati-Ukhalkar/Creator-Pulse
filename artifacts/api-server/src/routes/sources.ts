import { Router, type Request, type Response } from "express";
import { pool } from "@workspace/db";
import { logger } from "../lib/logger";
import { authMiddleware } from "../middlewares/auth";

const router: Router = Router();

router.get("/", authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const result = await pool.query(
      "SELECT * FROM sources WHERE user_id = $1 ORDER BY created_at DESC",
      [userId]
    );
    res.json(result.rows);
  } catch (err: any) {
    logger.error({ err }, "Error fetching sources");
    res.status(500).json({ error: "Failed to fetch sources" });
  }
});

router.post("/", authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { source_type, source_name, source_url, source_config } = req.body;
    const result = await pool.query(
      `INSERT INTO sources (user_id, source_type, source_name, source_url, source_config, is_active, sync_status)
       VALUES ($1, $2, $3, $4, $5, true, 'pending')
       RETURNING *`,
      [userId, source_type, source_name, source_url, source_config]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    logger.error({ err }, "Error creating source");
    res.status(500).json({ error: "Failed to create source" });
  }
});

router.patch("/:id", authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { is_active } = req.body;

    if (is_active === undefined) {
      res.status(400).json({ error: "Missing is_active field" });
      return;
    }

    const result = await pool.query(
      "UPDATE sources SET is_active = $1, updated_at = NOW() WHERE user_id = $2 AND id = $3 RETURNING *",
      [is_active, userId, id]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ error: "Source not found or unauthorized" });
      return;
    }

    res.json(result.rows[0]);
  } catch (err: any) {
    logger.error({ err }, "Error updating source");
    res.status(500).json({ error: "Failed to update source" });
  }
});

router.delete("/:id", authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const result = await pool.query(
      "DELETE FROM sources WHERE user_id = $1 AND id = $2 RETURNING id",
      [userId, id]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ error: "Source not found or unauthorized" });
      return;
    }
    res.json({ message: "Source deleted successfully" });
  } catch (err: any) {
    logger.error({ err }, "Error deleting source");
    res.status(500).json({ error: "Failed to delete source" });
  }
});

export default router;
