import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import pool from '../config/database';

export const researchController = {
    /**
     * POST /api/research/topic
     * Conduct topic research (Stub)
     */
    async conductResearch(req: Request, res: Response) {
        try {
            const { topic_id, depth_level } = req.body;
            const userId = req.user!.id; // or req.body.user_id

            logger.info('Topic research triggered (stub)', { userId, topic_id, depth_level });

            // Mock success response
            res.json({ success: true, message: "Research queued (stub)", cached: false });
        } catch (error: any) {
            logger.error('Research error', { error: error.message });
            res.status(500).json({ error: 'Failed to conduct research' });
        }
    },

    /**
     * GET /api/research/topic/:topicId
     * Get research data for a topic
     */
    async getTopicResearch(req: Request, res: Response) {
        try {
            const { topicId } = req.params;
            // Check if table exists, otherwise return null or error. 
            // We haven't created topic_research table migration yet.
            // If table doesn't exist, this will error. 
            // I'll return empty/null for now to prevent crash if table missing.

            // Check database for table existence first or just try query
            try {
                const result = await pool.query(
                    'SELECT * FROM topic_research WHERE topic_id = $1 ORDER BY created_at DESC LIMIT 1',
                    [topicId]
                );

                if (result.rowCount === 0) {
                    res.json(null);
                    return;
                }
                res.json(result.rows[0]);
            } catch (dbErr: any) {
                if (dbErr.code === '42P01') { // undefined_table
                    res.json(null);
                } else {
                    throw dbErr;
                }
            }
        } catch (error: any) {
            logger.error('Get topic research error', { error: error.message });
            res.status(500).json({ error: 'Failed to get topic research' });
        }
    }
};
