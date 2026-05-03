import { Router, type Request, type Response } from "express";
import { pool } from "@workspace/db";
import { logger } from "../lib/logger";
import { authMiddleware } from "../middlewares/auth";

const router: Router = Router();

router.post("/topic", authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const {
      topicId,
      topic_id,
      depthLevel,
      depth_level,
    } = req.body;

    const resolvedTopicId: string = topicId || topic_id;
    const resolvedDepthLevel: string = depthLevel || depth_level || "standard";

    if (!resolvedTopicId) {
      res.status(400).json({ error: "topic_id is required" });
      return;
    }

    const topicResult = await pool.query(
      "SELECT * FROM topics WHERE id = $1 AND user_id = $2",
      [resolvedTopicId, userId]
    );

    if (topicResult.rowCount === 0) {
      res.status(404).json({ error: "Topic not found" });
      return;
    }

    const topic = topicResult.rows[0];

    const existing = await pool.query(
      `SELECT * FROM trend_research WHERE user_id = $1 AND query = $2 AND status = 'completed' ORDER BY created_at DESC LIMIT 1`,
      [userId, topic.title]
    );

    if (existing.rowCount! > 0) {
      res.json({ success: true, message: "Using cached research", cached: true, research: existing.rows[0] });
      return;
    }

    const insertResult = await pool.query(
      `INSERT INTO trend_research (user_id, query, title, status, n8n_execution_id, created_at)
       VALUES ($1, $2, $3, 'processing', $4, NOW())
       RETURNING *`,
      [userId, topic.title, `Deep Research: ${topic.title}`, resolvedTopicId]
    );
    const research = insertResult.rows[0];

    res.json({ success: true, message: "Deep research started", cached: false, research_id: research.id });

    (async () => {
      try {
        const { openai } = await import("@workspace/integrations-openai-ai-server");
        const maxTokens = resolvedDepthLevel === "comprehensive" || resolvedDepthLevel === "deep" ? 8192 : 4096;
        const depthInstruction = (resolvedDepthLevel === "comprehensive" || resolvedDepthLevel === "deep")
          ? "Provide extremely comprehensive, expert-level analysis with data points, statistics where possible, and nuanced insights."
          : "Provide thorough, actionable analysis suitable for content creation planning.";

        const completion = await openai.chat.completions.create({
          model: "gpt-5-mini",
          max_completion_tokens: maxTokens,
          messages: [
            {
              role: "system",
              content: `You are a deep research analyst specializing in content strategy for creators. ${depthInstruction} Return your analysis as a JSON object with these fields:
- summary: string (comprehensive overview)
- key_insights: array of strings (5-8 critical insights)
- audience_segments: array of objects with {segment, pain_points, content_opportunities}
- content_pillars: array of strings (3-5 core themes to explore)
- competitor_landscape: string (brief analysis of who covers this topic)
- content_gaps: array of strings (underserved angles or formats)
- monetization_angles: array of strings (2-4 ways to monetize content on this topic)
- viral_triggers: array of strings (psychological hooks that make this content shareable)
- long_tail_keywords: array of strings (10+ specific search terms)
- recommended_series: array of objects with {title, episodes_count, description}
- priority_score: number 1-100`,
            },
            {
              role: "user",
              content: `Conduct deep research on this topic for content creation: "${topic.title}". ${topic.description ? `Description: ${topic.description}.` : ""} ${topic.keywords ? `Keywords: ${topic.keywords.join(", ")}.` : ""}`,
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
          [JSON.stringify(researchData), priorityScore, research.id]
        );
        logger.info({ researchId: research.id, topicId: resolvedTopicId }, "Deep topic research completed");
      } catch (aiErr) {
        logger.error({ aiErr, researchId: research.id }, "AI topic research failed");
        await pool.query(
          `UPDATE trend_research
           SET status = 'failed', error_message = $1, updated_at = NOW()
           WHERE id = $2`,
          [String(aiErr), research.id]
        );
      }
    })();
  } catch (err) {
    logger.error({ err }, "Research error");
    res.status(500).json({ error: "Failed to conduct research" });
  }
});

router.get("/topic/:topicId", authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { topicId } = req.params;

    const topicResult = await pool.query(
      "SELECT title FROM topics WHERE id = $1 AND user_id = $2",
      [topicId, userId]
    );

    if (topicResult.rowCount === 0) {
      res.json(null);
      return;
    }

    const topicTitle = topicResult.rows[0].title;

    const result = await pool.query(
      `SELECT * FROM trend_research WHERE user_id = $1 AND (query = $2 OR n8n_execution_id = $3) ORDER BY created_at DESC LIMIT 1`,
      [userId, topicTitle, topicId]
    );
    res.json(result.rows[0] ?? null);
  } catch (err) {
    logger.error({ err }, "Get topic research error");
    res.status(500).json({ error: "Failed to get topic research" });
  }
});

export default router;
