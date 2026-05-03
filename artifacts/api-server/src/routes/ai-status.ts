import { Router, type Request, type Response } from "express";

const router: Router = Router();

router.get("/", async (_req: Request, res: Response) => {
  res.status(503).json({ status: "unreachable", detail: "AI service is not configured in this environment" });
});

export default router;
