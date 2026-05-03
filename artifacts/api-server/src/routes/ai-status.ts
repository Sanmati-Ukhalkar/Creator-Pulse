import { Router, type Request, type Response } from "express";
import { logger } from "../lib/logger";

const router: Router = Router();

router.get("/", async (_req: Request, res: Response) => {
  if (!process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || !process.env.AI_INTEGRATIONS_OPENAI_API_KEY) {
    res.status(503).json({
      status: "unreachable",
      provider: "openai",
      detail: "AI service not configured: environment variables missing",
    });
    return;
  }

  try {
    const { openai } = await import("@workspace/integrations-openai-ai-server");
    const completion = await openai.chat.completions.create({
      model: "gpt-5-nano",
      max_completion_tokens: 5,
      messages: [{ role: "user", content: "ping" }],
    });

    const model = completion.model ?? "gpt-5-nano";
    res.json({
      status: "ok",
      provider: "openai",
      model,
      detail: "AI service is connected and operational",
    });
  } catch (err) {
    logger.error({ err }, "AI status check failed");
    res.status(503).json({
      status: "unreachable",
      provider: "openai",
      detail: "AI service connectivity check failed",
    });
  }
});

export default router;
