import { Request, Response } from 'express';
import pool from '../config/database';
import { logger } from '../utils/logger';

export const profileController = {
    /**
     * GET /api/profile
     * Fetch user profile
     */
    async getProfile(req: Request, res: Response) {
        try {
            const userId = req.user!.id;
            const result = await pool.query(
                'SELECT * FROM creator_profiles WHERE user_id = $1',
                [userId]
            );

            if (result.rowCount === 0) {
                // Return empty object or default profile if not found
                res.json({});
                return;
            }

            res.json(result.rows[0]);
        } catch (error: any) {
            logger.error('Error fetching profile', { error: error.message });
            res.status(500).json({ error: 'Failed to fetch profile' });
        }
    },

    /**
     * PUT /api/profile
     * Update user profile
     */
    async updateProfile(req: Request, res: Response) {
        try {
            const userId = req.user!.id;
            const { full_name, email, industry, creator_type, platforms, timezone } = req.body;

            // Upsert profile
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
        } catch (error: any) {
            logger.error('Error updating profile', { error: error.message });
            res.status(500).json({ error: 'Failed to update profile' });
        }
    },

    /**
     * POST /api/profile/onboarding
     * Complete onboarding process
     */
    async completeOnboarding(req: Request, res: Response) {
        const client = await pool.connect();
        try {
            const userId = req.user!.id;
            const { profileData, contentSamples, deliveryPrefs } = req.body;

            await client.query('BEGIN');

            // 1. Update Profile
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
                [
                    userId,
                    profileData.industry,
                    profileData.creatorType,
                    profileData.platforms,
                    deliveryPrefs.timezone
                ]
            );

            // 2. Insert Content Samples
            if (contentSamples && contentSamples.length > 0) {
                for (const sample of contentSamples) {
                    await client.query(
                        `INSERT INTO content_samples (user_id, platform, content, engagement_metrics)
                         VALUES ($1, $2, $3, $4)`,
                        [userId, sample.platform, sample.content, sample.engagementMetrics || {}]
                    );
                }
            }

            // 3. Upsert Delivery Preferences
            await client.query(
                `INSERT INTO delivery_preferences (user_id, delivery_time, frequency, channels, timezone)
                 VALUES ($1, $2, $3, $4, $5)
                 ON CONFLICT (user_id) DO UPDATE SET
                    delivery_time = EXCLUDED.delivery_time,
                    frequency = EXCLUDED.frequency,
                    channels = EXCLUDED.channels,
                    timezone = EXCLUDED.timezone`,
                [
                    userId,
                    deliveryPrefs.deliveryTime,
                    deliveryPrefs.frequency,
                    deliveryPrefs.channels,
                    deliveryPrefs.timezone
                ]
            );

            await client.query('COMMIT');
            res.json({ success: true, message: 'Onboarding completed' });

        } catch (error: any) {
            await client.query('ROLLBACK');
            logger.error('Error completing onboarding', { error: error.message });
            res.status(500).json({ error: 'Failed to complete onboarding' });
        } finally {
            client.release();
        }
    }
};
