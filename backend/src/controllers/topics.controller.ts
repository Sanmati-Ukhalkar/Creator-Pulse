import { Request, Response } from 'express';
import pool from '../config/database';
import { logger } from '../utils/logger';

export const topicsController = {
    /**
     * GET /api/topics
     * Filter topics by date if query param provided, otherwise return all
     */
    async getTopics(req: Request, res: Response) {
        try {
            const userId = req.user!.id;
            const { date } = req.query;

            let query = 'SELECT * FROM topics WHERE user_id = $1';
            const params: any[] = [userId];

            if (date) {
                const dateObj = new Date(date as string);
                const start = new Date(dateObj);
                start.setHours(0, 0, 0, 0);
                const end = new Date(dateObj);
                end.setHours(23, 59, 59, 999);

                query += ` AND created_at >= $2 AND created_at <= $3`;
                params.push(start.toISOString(), end.toISOString());
            }

            query += ' ORDER BY trend_score DESC';

            const result = await pool.query(query, params);
            res.json(result.rows);
        } catch (error: any) {
            logger.error('Error fetching topics', { error: error.message });
            res.status(500).json({ error: 'Failed to fetch topics' });
        }
    },

    /**
     * POST /api/topics
     * Create a new topic (for manual entry or AI generation)
     */
    async createTopic(req: Request, res: Response) {
        try {
            const userId = req.user!.id;
            const { title, description, keywords, trend_score, confidence_score } = req.body;

            const result = await pool.query(
                `INSERT INTO topics (user_id, title, description, keywords, trend_score, confidence_score, created_at)
               VALUES ($1, $2, $3, $4, $5, $6, NOW())
               RETURNING *`,
                [userId, title, description, keywords || [], trend_score || 0, confidence_score || 0]
            );

            res.json(result.rows[0]);
        } catch (error: any) {
            logger.error('Error creating topic', { error: error.message });
            res.status(500).json({ error: 'Failed to create topic' });
        }
    }
};
