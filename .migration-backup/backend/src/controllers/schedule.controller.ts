import { Request, Response } from 'express';
import pool from '../config/database';
import { logger } from '../utils/logger';
import { SchedulePostInput } from '../middleware/validate.middleware';

export const scheduleController = {
    /**
     * POST /api/schedule
     *
     * Create a new scheduled post.
     */
    async create(req: Request, res: Response): Promise<void> {
        const { content, scheduled_at } = req.body as SchedulePostInput; // Use req.body if validatedBody is not reliable, but validatedBody should be fine if typed correctly.
        // Assuming validatedBody is populated by validate middleware.
        // But TS says req.validatedBody exists? Need to check validate middleware typing.
        // For safety, I'll cast req.body or use req.validatedBody if I'm sure.
        // The original code used req.validatedBody. I'll stick to that but cast it properly.
        // Actually, Express Request type doesn't have validatedBody by default.
        // I'll use req.body as it should be validated by Zod middleware already.

        const userId = req.user!.id;

        try {
            logger.info('Scheduling post', { userId, scheduledAt: scheduled_at });

            const result = await pool.query(
                `INSERT INTO scheduled_posts (user_id, platform, content, scheduled_at, status)
                 VALUES ($1, $2, $3, $4, $5)
                 RETURNING *`,
                [userId, 'linkedin', content, new Date(scheduled_at).toISOString(), 'pending']
            );

            const data = result.rows[0];

            logger.info('Post scheduled successfully', { userId, postId: data.id });
            res.status(201).json({ success: true, data });
        } catch (err: any) {
            logger.error('Failed to schedule post', { error: err.message, userId });
            res.status(500).json({ error: 'Failed to schedule post', details: err.message });
        }
    },

    /**
     * GET /api/schedule
     *
     * List all scheduled posts for the user (pending + future).
     * Optional query param ?status=pending|published|failed
     */
    async list(req: Request, res: Response): Promise<void> {
        const userId = req.user!.id;
        const status = req.query.status as string;

        try {
            let query = 'SELECT * FROM scheduled_posts WHERE user_id = $1';
            const params: any[] = [userId];

            if (status) {
                query += ' AND status = $2';
                params.push(status);
            }

            query += ' ORDER BY scheduled_at ASC';

            const result = await pool.query(query, params);

            res.json({ success: true, count: result.rowCount, data: result.rows });
        } catch (err: any) {
            logger.error('Failed to list scheduled posts', { error: err.message, userId });
            res.status(500).json({ error: 'Failed to fetch schedule' });
        }
    },

    /**
     * DELETE /api/schedule/:id
     *
     * Cancel/delete a scheduled post.
     * Can only delete posts that belong to the user.
     */
    async delete(req: Request, res: Response): Promise<void> {
        const userId = req.user!.id;
        const postId = req.params.id;

        if (!postId) {
            res.status(400).json({ error: 'Post ID is required' });
            return;
        }

        try {
            const result = await pool.query(
                'DELETE FROM scheduled_posts WHERE id = $1 AND user_id = $2 RETURNING id',
                [postId, userId]
            );

            if (result.rowCount === 0) {
                res.status(404).json({ error: 'Scheduled post not found' });
                return;
            }

            logger.info('Scheduled post deleted', { userId, postId });
            res.json({ success: true, message: 'Scheduled post cancelled' });
        } catch (err: any) {
            logger.error('Failed to delete scheduled post', { error: err.message, userId, postId });
            res.status(500).json({ error: 'Failed to delete post' });
        }
    },

    /**
     * PUT /api/schedule/:id
     * 
     * Update a scheduled post.
     */
    async update(req: Request, res: Response): Promise<void> {
        const userId = req.user!.id;
        const postId = req.params.id;
        const { scheduledFor, status, content } = req.body;

        try {
            const updates: any[] = [];
            let i = 1;
            const values: any[] = [];

            if (scheduledFor) {
                updates.push(`scheduled_at = $${i++}`);
                values.push(new Date(scheduledFor).toISOString());
            }
            if (status) {
                updates.push(`status = $${i++}`);
                values.push(status);
            }
            if (content) {
                updates.push(`content = $${i++}`);
                values.push(content);
            }

            if (updates.length === 0) {
                res.status(400).json({ error: 'No fields to update' });
                return;
            }

            values.push(postId);
            values.push(userId);

            const query = `
                UPDATE scheduled_posts 
                SET ${updates.join(', ')} 
                WHERE id = $${i++} AND user_id = $${i++} 
                RETURNING *
            `;

            const result = await pool.query(query, values);

            if (result.rowCount === 0) {
                res.status(404).json({ error: 'Scheduled post not found' });
                return;
            }

            res.json({ success: true, data: result.rows[0] });
        } catch (err: any) {
            logger.error('Failed to update scheduled post', { error: err.message, userId, postId });
            res.status(500).json({ error: 'Failed to update post' });
        }
    },
};
