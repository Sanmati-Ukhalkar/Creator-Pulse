import { Router, type Request, type Response } from "express";
import { pool } from "@workspace/db";
import { logger } from "../lib/logger";
import { authMiddleware } from "../middlewares/auth";

const router: Router = Router();

router.post("/", authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { topic, description, content_type, keywords, voice_samples, hook_text } = req.body;

    if (!topic) {
      res.status(400).json({ error: "topic is required" });
      return;
    }

    logger.info({ userId, topic, content_type }, "Content generation requested (AI not configured)");

    const placeholder = `[AI generation not configured]\n\nTopic: ${topic}\n\nDescription: ${description || ""}`;

    const draftResult = await pool.query(
      `INSERT INTO drafts (user_id, platform, content_type, title, content, status)
       VALUES ($1, 'linkedin', $2, $3, $4, 'draft')
       RETURNING *`,
      [userId, content_type || "linkedin_short", topic, JSON.stringify({ text: placeholder })]
    );

    res.json({
      success: true,
      generated_content: placeholder,
      draft: draftResult.rows[0],
      note: "AI service is not configured. Connect an AI provider to enable real content generation."
    });
  } catch (err) {
    logger.error({ err }, "Error in content generation");
    res.status(500).json({ error: "Content generation failed" });
  }
});

router.post("/hooks", authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { topic, description, angle } = req.body;

    if (!topic) {
      res.status(400).json({ error: "topic is required" });
      return;
    }

    logger.info({ userId, topic }, "Hook generation requested (AI not configured)");

    const hooks = [
      `Here's what nobody tells you about ${topic}...`,
      `I spent months studying ${topic}. Here's what I learned:`,
      `Stop making this mistake with ${topic}.`,
    ];

    res.json({
      success: true,
      hooks,
      note: "AI service is not configured. Connect an AI provider to enable real hook generation."
    });
  } catch (err) {
    logger.error({ err }, "Error in hook generation");
    res.status(500).json({ error: "Hook generation failed" });
  }
});

export default router;
