import { Request, Response } from 'express';
import pool from '../config/database';
import { logger } from '../utils/logger';

export const ingestedContentController = {
    /**
     * GET /api/ingested-contents
     * List all ingested content for the user
     */
    async listContent(req: Request, res: Response) {
        try {
            const userId = req.user!.id;

            const result = await pool.query(`
        SELECT 
          ic.*,
          s.source_name,
          s.source_type
        FROM ingested_contents ic
        LEFT JOIN sources s ON ic.source_id = s.id
        WHERE ic.user_id = $1
        ORDER BY ic.created_at DESC
      `, [userId]);

            // Transform result to match frontend expectations (nested sources object)
            const data = result.rows.map(row => ({
                ...row,
                sources: {
                    source_name: row.source_name,
                    source_type: row.source_type
                }
            }));

            res.json(data);
        } catch (error: any) {
            logger.error('Error listing ingested content', { error: error.message });
            res.status(500).json({ error: 'Failed to list content' });
        }
    },

    /**
     * GET /api/ingested-contents/:id
     * Get a single content item
     */
    async getContent(req: Request, res: Response) {
        try {
            const userId = req.user!.id;
            const { id } = req.params;

            const result = await pool.query(`
        SELECT ic.*, s.source_name, s.source_type
        FROM ingested_contents ic
        LEFT JOIN sources s ON ic.source_id = s.id
        WHERE ic.id = $1 AND ic.user_id = $2
      `, [id, userId]);

            if (result.rowCount === 0) {
                res.status(404).json({ error: 'Content not found' });
                return;
            }

            const row = result.rows[0];
            const data = {
                ...row,
                sources: {
                    source_name: row.source_name,
                    source_type: row.source_type
                }
            };

            res.json(data);
        } catch (error: any) {
            logger.error('Error fetching content', { error: error.message });
            res.status(500).json({ error: 'Failed to fetch content' });
        }
    }
};
