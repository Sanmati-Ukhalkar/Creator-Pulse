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
  } catch (err) {
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
  } catch (err) {
    logger.error({ err }, "Error fetching trend");
    res.status(500).json({ error: "Failed to fetch trend" });
  }
});

router.post("/trigger", authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { title, categories = [] } = req.body;

    if (!title) {
      res.status(400).json({ error: "title is required" });
      return;
    }

    const insertResult = await pool.query(
      `INSERT INTO trend_research (user_id, query, title, status, categories, created_at)
       VALUES ($1, $2, $3, 'processing', $4, NOW())
       RETURNING *`,
      [userId, title, title, categories]
    );
    const trend = insertResult.rows[0];

    res.json({
      success: true,
      trend,
      message: "Trend research started"
    });

    (async () => {
      try {
        const { openai } = await import("@workspace/integrations-openai-ai-server");
        const categoryStr = categories.length > 0 ? `Categories: ${(categories as string[]).join(", ")}.` : "";
        const completion = await openai.chat.completions.create({
          model: "gpt-5-mini",
          max_completion_tokens: 8192,
          messages: [
            {
              role: "system",
              content: `You are a trend research analyst for content creators. Analyze trends and provide actionable insights. Return your analysis as a JSON object with these fields:
- summary: string (2-3 sentence overview)
- trending_angles: array of strings (3-5 specific content angles)
- target_audience: string (who benefits from this topic)
- content_formats: array of strings (recommended content formats like short-form, long-form, carousel, etc.)
- key_hooks: array of strings (3-5 attention-grabbing hooks for the topic)
- posting_tips: array of strings (2-3 platform-specific tips)
- priority_score: number 1-100 (how trending/relevant this topic is right now)
- estimated_engagement: string (low/medium/high/very high)`,
            },
            {
              role: "user",
              content: `Analyze this trend topic for content creation: "${title}". ${categoryStr} Provide comprehensive research data to help a creator capitalize on this trend.`,
            },
          ],
        });

        const rawContent = completion.choices[0]?.message?.content ?? "{}";
        let researchData: Record<string, unknown> = {};
        try {
          const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
          researchData = jsonMatch ? JSON.parse(jsonMatch[0]) : { summary: rawContent };
        } catch {
          researchData = { summary: rawContent };
        }

        const priorityScore = typeof researchData.priority_score === "number"
          ? researchData.priority_score
          : null;

        await pool.query(
          `UPDATE trend_research
           SET status = 'completed', research_data = $1, priority_score = $2, generated_at = NOW(), updated_at = NOW()
           WHERE id = $3`,
          [JSON.stringify(researchData), priorityScore, trend.id]
        );
        logger.info({ trendId: trend.id }, "Trend research completed");
      } catch (aiErr) {
        logger.error({ aiErr, trendId: trend.id }, "AI trend research failed");
        await pool.query(
          `UPDATE trend_research
           SET status = 'failed', error_message = $1, updated_at = NOW()
           WHERE id = $2`,
          [String(aiErr), trend.id]
        );
      }
    })();
  } catch (err) {
    logger.error({ err }, "Error triggering trend research");
    res.status(500).json({ error: "Failed to trigger trend research" });
  }
});

export default router;
