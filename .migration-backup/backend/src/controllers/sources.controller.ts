import { Request, Response } from 'express';
import pool from '../config/database';
import { logger } from '../utils/logger';

export const sourcesController = {
    /**
     * GET /api/sources
     * Fetch all sources for the authenticated user
     */
    async getAll(req: Request, res: Response) {
        try {
            const userId = req.user!.id;
            const result = await pool.query(
                'SELECT * FROM sources WHERE user_id = $1 ORDER BY created_at DESC',
                [userId]
            );
            res.json(result.rows);
        } catch (error: any) {
            logger.error('Error fetching sources', { error: error.message });
            res.status(500).json({ error: 'Failed to fetch sources' });
        }
    },

    /**
     * POST /api/sources
     * Create a new source
     */
    async create(req: Request, res: Response) {
        try {
            const userId = req.user!.id;
            const { source_type, source_name, source_url, source_config } = req.body;

            const result = await pool.query(
                `INSERT INTO sources (user_id, source_type, source_name, source_url, source_config, is_active, sync_status)
                 VALUES ($1, $2, $3, $4, $5, $6, 'pending')
                 RETURNING *`,
                [userId, source_type, source_name, source_url, source_config, true]
            );
            res.status(201).json(result.rows[0]);
        } catch (error: any) {
            logger.error('Error creating source', { error: error.message });
            res.status(500).json({ error: 'Failed to create source' });
        }
    },

    /**
     * PATCH /api/sources/:id
     * Update source (e.g., toggle active status)
     */
    async update(req: Request, res: Response) {
        try {
            const userId = req.user!.id;
            const { id } = req.params;
            const { is_active } = req.body;

            if (is_active === undefined) {
                res.status(400).json({ error: "Missing is_active field" });
                return;
            }

            const result = await pool.query(
                'UPDATE sources SET is_active = $1, updated_at = NOW() WHERE user_id = $2 AND id = $3 RETURNING *',
                [is_active, userId, id]
            );

            if (result.rowCount === 0) {
                res.status(404).json({ error: 'Source not found or unauthorized' });
                return;
            }

            res.json(result.rows[0]);
        } catch (error: any) {
            logger.error('Error updating source', { error: error.message });
            res.status(500).json({ error: 'Failed to update source' });
        }
    },

    /**
     * DELETE /api/sources/:id
     * Delete a source
     */
    async delete(req: Request, res: Response) {
        try {
            const userId = req.user!.id;
            const { id } = req.params;

            const result = await pool.query(
                'DELETE FROM sources WHERE user_id = $1 AND id = $2 RETURNING id',
                [userId, id]
            );

            if (result.rowCount === 0) {
                res.status(404).json({ error: 'Source not found or unauthorized' });
                return;
            }

            res.json({ message: 'Source deleted successfully' });
        } catch (error: any) {
            logger.error('Error deleting source', { error: error.message });
            res.status(500).json({ error: 'Failed to delete source' });
        }
    }
};
