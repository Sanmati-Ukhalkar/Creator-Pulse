import { Router, type Request, type Response } from "express";
import { pool } from "@workspace/db";
import { logger } from "../lib/logger";
import { authMiddleware } from "../middlewares/auth";

const router: Router = Router();

router.post("/", authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { topic, description, content_type } = req.body;

    if (!topic) {
      res.status(400).json({ error: "topic is required" });
      return;
    }

    logger.info({ userId, topic, content_type }, "Content generation requested");

    const generated_content = `${topic}\n\n${description || ""}`.trim();

    const draftResult = await pool.query(
      `INSERT INTO drafts (user_id, platform, content_type, title, content, status)
       VALUES ($1, 'linkedin', $2, $3, $4, 'draft')
       RETURNING *`,
      [userId, content_type || "linkedin_short", topic, JSON.stringify({ text: generated_content })]
    );

    res.json({
      success: true,
      generated_content,
      draft: draftResult.rows[0],
    });
  } catch (err) {
    logger.error({ err }, "Error in content generation");
    res.status(500).json({ error: "Content generation failed" });
  }
});

router.post("/hooks", authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { topic } = req.body;

    if (!topic) {
      res.status(400).json({ error: "topic is required" });
      return;
    }

    logger.info({ userId, topic }, "Hook generation requested");

    const hooks = [
      `Here's what nobody tells you about ${topic}...`,
      `I spent months studying ${topic}. Here's what I learned:`,
      `Stop making this mistake with ${topic}.`,
    ];

    res.json({ success: true, hooks });
  } catch (err) {
    logger.error({ err }, "Error in hook generation");
    res.status(500).json({ error: "Hook generation failed" });
  }
});

export default router;
