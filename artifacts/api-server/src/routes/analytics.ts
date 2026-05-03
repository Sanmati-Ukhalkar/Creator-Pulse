import { Router, type Request, type Response } from "express";
import { pool } from "@workspace/db";
import { logger } from "../lib/logger";
import { authMiddleware } from "../middlewares/auth";

const router: Router = Router();
router.use(authMiddleware);

router.post("/sync/:draftId", async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { draftId } = req.params;
    const result = await pool.query(
      `SELECT upstream_id FROM drafts WHERE id = $1 AND user_id = $2 AND status = 'published'`,
      [draftId, userId]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ error: "Published draft not found or missing upstream LinkedIn ID." });
      return;
    }
    res.status(501).json({ error: "LinkedIn analytics sync requires LinkedIn OAuth configuration." });
  } catch (err: any) {
    logger.error({ err }, "Failed to sync analytics");
    res.status(500).json({ error: "Failed to sync analytics." });
  }
});

export default router;
