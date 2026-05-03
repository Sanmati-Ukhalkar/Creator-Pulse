import { Router, type Request, type Response } from "express";
import { logger } from "../lib/logger";
import { authMiddleware } from "../middlewares/auth";

const router: Router = Router();

router.get("/status", authMiddleware, async (req: Request, res: Response) => {
  res.json({ connected: false, tokenValid: false, message: "LinkedIn OAuth not configured" });
});

router.get("/auth-url", authMiddleware, async (req: Request, res: Response) => {
  res.status(501).json({ error: "LinkedIn OAuth not configured. Set LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET." });
});

router.get("/callback", async (req: Request, res: Response) => {
  res.status(501).json({ error: "LinkedIn OAuth callback not configured." });
});

router.delete("/disconnect", authMiddleware, async (req: Request, res: Response) => {
  res.status(501).json({ error: "LinkedIn not connected." });
});

export default router;
