import { Router, type Request, type Response } from "express";
import { pool } from "@workspace/db";
import { logger } from "../lib/logger";
import { authMiddleware } from "../middlewares/auth";

const router: Router = Router();

router.get("/", authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const result = await pool.query(
      "SELECT * FROM creator_profiles WHERE user_id = $1",
      [userId]
    );
    res.json(result.rowCount === 0 ? {} : result.rows[0]);
  } catch (err: any) {
    logger.error({ err }, "Error fetching profile");
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

router.put("/", authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { full_name, email, industry, creator_type, platforms, timezone } = req.body;
    const result = await pool.query(
      `INSERT INTO creator_profiles (user_id, full_name, email, industry, creator_type, platforms, timezone, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
          full_name = COALESCE(EXCLUDED.full_name, creator_profiles.full_name),
          email = COALESCE(EXCLUDED.email, creator_profiles.email),
          industry = COALESCE(EXCLUDED.industry, creator_profiles.industry),
          creator_type = COALESCE(EXCLUDED.creator_type, creator_profiles.creator_type),
          platforms = COALESCE(EXCLUDED.platforms, creator_profiles.platforms),
          timezone = COALESCE(EXCLUDED.timezone, creator_profiles.timezone),
          updated_at = NOW()
       RETURNING *`,
      [userId, full_name, email, industry, creator_type, platforms, timezone]
    );
    res.json(result.rows[0]);
  } catch (err: any) {
    logger.error({ err }, "Error updating profile");
    res.status(500).json({ error: "Failed to update profile" });
  }
});

router.post("/onboarding", authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { profileData, deliveryPrefs } = req.body;

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      await client.query(
        `INSERT INTO creator_profiles (user_id, industry, creator_type, platforms, timezone, onboarding_completed, updated_at)
         VALUES ($1, $2, $3, $4, $5, true, NOW())
         ON CONFLICT (user_id) DO UPDATE SET
            industry = EXCLUDED.industry,
            creator_type = EXCLUDED.creator_type,
            platforms = EXCLUDED.platforms,
            timezone = EXCLUDED.timezone,
            onboarding_completed = true,
            updated_at = NOW()`,
        [userId, profileData?.industry, profileData?.creatorType, profileData?.platforms || [], profileData?.timezone || "UTC"]
      );

      if (deliveryPrefs) {
        await client.query(
          `INSERT INTO delivery_preferences (user_id, delivery_time, frequency, channels, timezone, updated_at)
           VALUES ($1, $2, $3, $4, $5, NOW())
           ON CONFLICT (user_id) DO UPDATE SET
              delivery_time = EXCLUDED.delivery_time,
              frequency = EXCLUDED.frequency,
              channels = EXCLUDED.channels,
              timezone = EXCLUDED.timezone,
              updated_at = NOW()`,
          [userId, deliveryPrefs.deliveryTime || "09:00", deliveryPrefs.frequency || "daily", deliveryPrefs.channels || ["email"], deliveryPrefs.timezone || "UTC"]
        );
      }

      await client.query("COMMIT");
      res.json({ success: true });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err: any) {
    logger.error({ err }, "Error completing onboarding");
    res.status(500).json({ error: "Failed to complete onboarding" });
  }
});

export default router;
