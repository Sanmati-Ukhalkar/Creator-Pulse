import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import draftsRouter from "./drafts";
import sourcesRouter from "./sources";
import trendsRouter from "./trends";
import topicsRouter from "./topics";
import profileRouter from "./profile";
import deliveryRouter from "./delivery";
import ingestedContentsRouter from "./ingested-contents";
import linkedinRouter from "./linkedin";
import analyticsRouter from "./analytics";
import researchRouter from "./research";
import aiStatusRouter from "./ai-status";
import scheduleRouter from "./schedule";
import generateRouter from "./generate";
import scraperRouter from "./scraper";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/drafts", draftsRouter);
router.use("/sources", sourcesRouter);
router.use("/trends", trendsRouter);
router.use("/topics", topicsRouter);
router.use("/profile", profileRouter);
router.use("/delivery", deliveryRouter);
router.use("/ingested-contents", ingestedContentsRouter);
router.use("/linkedin", linkedinRouter);
router.use("/analytics", analyticsRouter);
router.use("/research", researchRouter);
router.use("/ai-status", aiStatusRouter);
router.use("/schedule", scheduleRouter);
router.use("/generate", generateRouter);
router.use("/scraper", scraperRouter);

export default router;
