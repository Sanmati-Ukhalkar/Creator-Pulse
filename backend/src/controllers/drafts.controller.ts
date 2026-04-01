import { Request, Response } from 'express';
import pool from '../config/database';
import { logger } from '../utils/logger';
import { linkedinService } from '../services/linkedin.service';

export const draftsController = {
    /**
     * GET /api/drafts
     * Fetch all drafts for the authenticated user
     */
    async getAll(req: Request, res: Response) {
        try {
            const userId = req.user!.id;
            const result = await pool.query(
                'SELECT * FROM drafts WHERE user_id = $1 ORDER BY created_at DESC',
                [userId]
            );
            res.json(result.rows);
        } catch (error: any) {
            logger.error('Error fetching drafts', { error: error.message });
            res.status(500).json({ error: 'Failed to fetch drafts' });
        }
    },

    /**
     * POST /api/drafts
     * Create a new draft
     */
    async create(req: Request, res: Response) {
        try {
            const userId = req.user!.id;
            const { platform, content_type, title, content, metadata, status } = req.body;

            const result = await pool.query(
                `INSERT INTO drafts (user_id, platform, content_type, title, content, metadata, status)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 RETURNING *`,
                [userId, platform, content_type, title, content, metadata, status || 'draft']
            );
            res.status(201).json(result.rows[0]);
        } catch (error: any) {
            logger.error('Error creating draft', { error: error.message });
            res.status(500).json({ error: 'Failed to create draft' });
        }
    },

    /**
     * PUT /api/drafts/:id
     * Update an existing draft
     */
    async update(req: Request, res: Response) {
        try {
            const userId = req.user!.id;
            const { id } = req.params;
            const { title, content, status, metadata } = req.body;

            // Build dynamic update query
            const fields: string[] = [];
            const values: any[] = [];
            let idx = 1;

            if (title !== undefined) { fields.push(`title = $${idx++}`); values.push(title); }
            if (content !== undefined) { fields.push(`content = $${idx++}`); values.push(content); }
            if (status !== undefined) { fields.push(`status = $${idx++}`); values.push(status); }
            if (metadata !== undefined) { fields.push(`metadata = $${idx++}`); values.push(metadata); }

            if (fields.length === 0) {
                res.status(400).json({ error: 'No fields to update' });
                return;
            }

            fields.push(`updated_at = NOW()`);
            values.push(userId);
            values.push(id);

            const query = `UPDATE drafts SET ${fields.join(', ')} WHERE user_id = $${idx++} AND id = $${idx++} RETURNING *`;

            const result = await pool.query(query, values);

            if (result.rowCount === 0) {
                res.status(404).json({ error: 'Draft not found or unauthorized' });
                return;
            }

            res.json(result.rows[0]);

        } catch (error: any) {
            logger.error('Error updating draft', { error: error.message });
            res.status(500).json({ error: 'Failed to update draft' });
        }
    },

    /**
     * DELETE /api/drafts/:id
     * Delete a draft
     */
    async delete(req: Request, res: Response) {
        try {
            const userId = req.user!.id;
            const { id } = req.params;

            // Get the draft to see if it has a native post linked to it
            const draftResult = await pool.query(
                'SELECT upstream_id FROM drafts WHERE user_id = $1 AND id = $2',
                [userId, id]
            );

            if (draftResult.rowCount === 0) {
                res.status(404).json({ error: 'Draft not found or unauthorized' });
                return;
            }

            const { upstream_id } = draftResult.rows[0];

            // If it's published to LinkedIn, delete it natively first
            if (upstream_id) {
                try {
                    const token = await linkedinService.getValidToken(userId);
                    await linkedinService.deletePost(token, upstream_id);
                    logger.info('Successfully deleted post natively from LinkedIn', { upstream_id });
                } catch (linkedinErr: any) {
                    logger.error('Failed to natively delete post from LinkedIn', { error: linkedinErr.message, upstream_id });
                    res.status(500).json({ error: 'Failed to delete the post natively on LinkedIn. The local draft was kept.' });
                    return;
                }
            }

            // Delete the local reference
            await pool.query(
                'DELETE FROM drafts WHERE user_id = $1 AND id = $2',
                [userId, id]
            );

            res.json({ message: 'Post permanently deleted from local drafts and LinkedIn' });
        } catch (error: any) {
            logger.error('Error deleting draft', { error: error.message });
            res.status(500).json({ error: 'Failed to delete draft' });
        }
    }
};
