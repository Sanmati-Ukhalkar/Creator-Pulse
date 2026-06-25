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
                `SELECT cp.*, u.niche, u.target_audience 
                 FROM creator_profiles cp 
                 RIGHT JOIN users u ON cp.user_id = u.id 
                 WHERE u.id = $1`,
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
            const { full_name, email, creator_handle, bio, industry, creator_type, platforms, timezone } = req.body;

            // Upsert profile
            const result = await pool.query(
                `INSERT INTO creator_profiles (user_id, full_name, email, creator_handle, bio, industry, creator_type, platforms, timezone, updated_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
                 ON CONFLICT (user_id) DO UPDATE SET
                    full_name = COALESCE(EXCLUDED.full_name, creator_profiles.full_name),
                    email = COALESCE(EXCLUDED.email, creator_profiles.email),
                    creator_handle = COALESCE(EXCLUDED.creator_handle, creator_profiles.creator_handle),
                    bio = COALESCE(EXCLUDED.bio, creator_profiles.bio),
                    industry = COALESCE(EXCLUDED.industry, creator_profiles.industry),
                    creator_type = COALESCE(EXCLUDED.creator_type, creator_profiles.creator_type),
                    platforms = COALESCE(EXCLUDED.platforms, creator_profiles.platforms),
                    timezone = COALESCE(EXCLUDED.timezone, creator_profiles.timezone),
                    updated_at = NOW()
                 RETURNING *`,
                [
                    userId, 
                    full_name !== undefined ? full_name : null, 
                    email !== undefined ? email : null, 
                    creator_handle !== undefined ? creator_handle : null,
                    bio !== undefined ? bio : null,
                    industry !== undefined ? industry : null, 
                    creator_type !== undefined ? creator_type : null, 
                    platforms !== undefined ? platforms : null, 
                    timezone !== undefined ? timezone : null
                ]
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
    },

    /**
     * PUT /api/profile/niche
     * Update user niche and generate listening queries
     */
    async updateNiche(req: Request, res: Response) {
        try {
            const userId = req.user!.id;
            const { niche, target_audience } = req.body;

            // Update user table
            await pool.query(
                `UPDATE users SET niche = $1, target_audience = $2, updated_at = NOW() WHERE id = $3`,
                [niche, target_audience, userId]
            );

            // Import dynamically to avoid circular dependencies if any, though it should be fine
            const { liveSearchService } = require('../services/live_search.service');
            
            // Generate queries in the background (fire and forget)
            liveSearchService.generateAndRunQueries(userId, niche, target_audience).catch((err: any) => {
                logger.error('Background liveSearchService error', { error: err.message });
            });

            res.json({ success: true, message: 'Niche updated, listening queries are being generated.' });
        } catch (error: any) {
            logger.error('Error updating niche', { error: error.message });
            res.status(500).json({ error: 'Failed to update niche' });
        }
    }
};
