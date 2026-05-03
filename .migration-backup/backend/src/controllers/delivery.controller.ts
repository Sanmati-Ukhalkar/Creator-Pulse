import { Request, Response } from 'express';
import pool from '../config/database';
import { logger } from '../utils/logger';

export const deliveryController = {
    /**
     * GET /api/delivery/settings
     * Get user's delivery preferences
     */
    async getSettings(req: Request, res: Response) {
        try {
            const userId = req.user!.id;

            const result = await pool.query(
                'SELECT * FROM delivery_preferences WHERE user_id = $1',
                [userId]
            );

            if (result.rowCount === 0) {
                // Return default settings if none exist
                return res.json({
                    delivery_time: '09:00',
                    frequency: 'daily',
                    channels: ['email'],
                    timezone: 'UTC'
                });
            }

            res.json(result.rows[0]);
        } catch (error: any) {
            logger.error('Error fetching delivery settings', { error: error.message });
            res.status(500).json({ error: 'Failed to fetch settings' });
        }
    },

    /**
     * PUT /api/delivery/settings
     * Update or create delivery preferences
     */
    async updateSettings(req: Request, res: Response) {
        try {
            const userId = req.user!.id;
            const { delivery_time, frequency, channels, timezone } = req.body;

            // Upsert: Try update, if not exist insert
            // Standard PostgreSQL ON CONFLICT requires a constraint on user_id (which we verified migration created)

            const result = await pool.query(
                `INSERT INTO delivery_preferences (user_id, delivery_time, frequency, channels, timezone, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (user_id) 
         DO UPDATE SET 
            delivery_time = EXCLUDED.delivery_time,
            frequency = EXCLUDED.frequency,
            channels = EXCLUDED.channels,
            timezone = EXCLUDED.timezone,
            updated_at = NOW()
         RETURNING *`,
                [userId, delivery_time || '09:00', frequency || 'daily', channels || ['email'], timezone || 'UTC']
            );

            res.json(result.rows[0]);
        } catch (error: any) {
            logger.error('Error updating delivery settings', { error: error.message });
            res.status(500).json({ error: 'Failed to update settings' });
        }
    },

    /**
     * GET /api/delivery/status
     * Get recent delivery status (for realtime hook replacement)
     */
    async getDeliveryStatus(req: Request, res: Response) {
        try {
            const userId = req.user!.id;
            // Get latest 5 deliveries
            const result = await pool.query(
                'SELECT * FROM delivery_schedules WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5',
                [userId]
            );
            res.json(result.rows);
        } catch (error: any) {
            logger.error('Error fetching delivery status', { error: error.message });
            res.status(500).json({ error: 'Failed to fetch status' });
        }
    }
};
