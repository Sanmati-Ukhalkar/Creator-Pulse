import { Request, Response } from 'express';
import pool from '../config/database';
import { logger } from '../utils/logger';

export const trendsController = {
    /**
     * GET /api/trends/:id
     * Fetch a specific trend research item by ID
     */
    async getTrend(req: Request, res: Response) {
        try {
            const userId = req.user!.id;
            const { id } = req.params;

            const result = await pool.query(
                'SELECT * FROM trend_research WHERE id = $1 AND user_id = $2',
                [id, userId]
            );

            if (result.rowCount === 0) {
                res.status(404).json({ error: 'Trend research not found' });
                return;
            }

            res.json(result.rows[0]);
        } catch (error: any) {
            logger.error('Error fetching trend', { error: error.message });
            res.status(500).json({ error: 'Failed to fetch trend' });
        }
    },

    /**
     * GET /api/trends
     * List all trend research items
     */
    async listTrends(req: Request, res: Response) {
        try {
            const userId = req.user!.id;
            const result = await pool.query(
                'SELECT * FROM trend_research WHERE user_id = $1 ORDER BY created_at DESC',
                [userId]
            );
            res.json(result.rows);
        } catch (error: any) {
            logger.error('Error listing trends', { error: error.message });
            res.status(500).json({ error: 'Failed to list trends' });
        }
    },

    /**
     * POST /api/trends/trigger
     * Trigger new trend research (Stub)
     */
    async triggerResearch(req: Request, res: Response) {
        try {
            const { title, categories } = req.body;
            const userId = req.user!.id;
            logger.info('Triggering trend research (stub)', { userId, title, categories });

            // Insert a pending record
            const result = await pool.query(
                `INSERT INTO trend_research (user_id, query, title, categories, status, requested_at, created_at)
                 VALUES ($1, $2, $2, $3, 'pending', NOW(), NOW())
                 RETURNING *`,
                [userId, title, categories || []]
            );

            res.json(result.rows[0]);
        } catch (error: any) {
            logger.error('Error triggering research', { error: error.message });
            res.status(500).json({ error: 'Failed to trigger research' });
        }
    }
};
