import { Router, type Request, type Response } from "express";
import { pool } from "@workspace/db";
import { logger } from "../lib/logger";
import { authMiddleware } from "../middlewares/auth";

const router: Router = Router();

router.post("/", authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const {
      topic,
      description,
      content_type,
      hook_text,
      keywords = [],
    } = req.body;

    if (!topic) {
      res.status(400).json({ error: "topic is required" });
      return;
    }

    logger.info({ userId, topic, content_type }, "Content generation requested");

    const { openai } = await import("@workspace/integrations-openai-ai-server");

    const platformMap: Record<string, string> = {
      linkedin_short: "LinkedIn short post (under 300 characters)",
      linkedin_long: "LinkedIn long-form article (600-1200 words)",
      text_post: "LinkedIn short professional post (150-300 words)",
      article: "LinkedIn long-form article (600-1200 words)",
      twitter: "Twitter/X thread (5-8 tweets)",
      instagram: "Instagram caption with hashtags",
      newsletter: "Email newsletter section (400-600 words)",
    };

    const formatGuide = platformMap[content_type] ?? "professional social media post";
    const hookInstruction = hook_text ? `Start with this hook as the opening line: "${hook_text}"` : "";
    const keywordsStr = Array.isArray(keywords) && keywords.length > 0
      ? `Naturally incorporate these keywords: ${keywords.join(", ")}.`
      : "";
    const descStr = description ? `Context: ${description}.` : "";

    const completion = await openai.chat.completions.create({
      model: "gpt-5-mini",
      max_completion_tokens: 8192,
      messages: [
        {
          role: "system",
          content: `You are an expert content writer for creators and professionals. Write engaging, high-quality content that resonates with the target audience. Format your output as ready-to-post content — no preamble, no explanations, just the content itself.`,
        },
        {
          role: "user",
          content: `Write a ${formatGuide} about: "${topic}". ${hookInstruction} ${descStr} ${keywordsStr} Make it engaging, authentic, and optimized for maximum reach and engagement. Tone: professional yet conversational.`,
        },
      ],
    });

    const generated_content = completion.choices[0]?.message?.content?.trim() ?? topic;

    const draftResult = await pool.query(
      `INSERT INTO drafts (user_id, platform, content_type, title, content, status)
       VALUES ($1, 'linkedin', $2, $3, $4, 'draft')
       RETURNING *`,
      [userId, content_type || "linkedin_short", topic, JSON.stringify({ text: generated_content })]
    );

    const draft = draftResult.rows[0];

    res.json({
      success: true,
      data: {
        content: generated_content,
        draft_id: draft.id,
      },
      draft,
    });
  } catch (err) {
    logger.error({ err }, "Error in content generation");
    res.status(500).json({ error: "Content generation failed" });
  }
});

router.post("/hooks", authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { topic, description, angle, count = 5 } = req.body;

    if (!topic) {
      res.status(400).json({ error: "topic is required" });
      return;
    }

    logger.info({ userId, topic }, "Hook generation requested");

    const { openai } = await import("@workspace/integrations-openai-ai-server");

    const contextStr = description ? `Context: ${description}.` : "";
    const angleStr = angle ? `Specific angle: ${angle}.` : "";

    const completion = await openai.chat.completions.create({
      model: "gpt-5-mini",
      max_completion_tokens: 2048,
      messages: [
        {
          role: "system",
          content: `You are a master copywriter specializing in attention-grabbing hooks for LinkedIn and social media content. Generate exactly ${count} diverse, high-impact opening hooks. Return ONLY a valid JSON array of objects — no preamble, no explanations, no markdown. Each object must have exactly two string fields: "hook" (the opening line) and "reasoning" (why it works, 1 sentence).`,
        },
        {
          role: "user",
          content: `Generate ${count} compelling opening hooks for content about: "${topic}". ${contextStr} ${angleStr} Vary the styles: curiosity gap, contrarian take, personal story, statistic, direct value statement.`,
        },
      ],
    });

    const rawContent = completion.choices[0]?.message?.content ?? "[]";
    let hooks: Array<{ hook: string; reasoning: string }> = [];
    try {
      const jsonMatch = rawContent.match(/\[[\s\S]*\]/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
      hooks = parsed.map((h: unknown) => {
        if (typeof h === "string") return { hook: h, reasoning: "Engaging opening line" };
        const obj = h as Record<string, string>;
        return { hook: obj.hook ?? String(h), reasoning: obj.reasoning ?? "Engaging opening line" };
      });
    } catch {
      hooks = [{ hook: rawContent.slice(0, 200), reasoning: "AI-generated hook" }];
    }

    res.json({
      success: true,
      data: { hooks },
    });
  } catch (err) {
    logger.error({ err }, "Error in hook generation");
    res.status(500).json({ error: "Hook generation failed" });
  }
});

export default router;
