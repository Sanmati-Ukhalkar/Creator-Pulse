import { Request, Response } from 'express';
import pool from '../config/database';
import { logger } from '../utils/logger';
import { linkedinService } from '../services/linkedin.service';

export const analyticsController = {
    /**
     * POST /api/analytics/sync/:draftId
     * Force sync LinkedIn metrics (likes, comments) for a specific published draft.
     */
    async syncDraftAnalytics(req: Request, res: Response): Promise<void> {
        const userId = req.user!.id;
        const { draftId } = req.params;

        try {
            // 1. Get the draft and verify it belongs to user & has upstream_id
            const draftResult = await pool.query(
                `SELECT upstream_id FROM drafts WHERE id = $1 AND user_id = $2 AND status = 'published'`,
                [draftId, userId]
            );

            if (draftResult.rowCount === 0) {
                res.status(404).json({ error: 'Published draft not found or missing upstream LinkedIn ID.' });
                return;
            }

            const { upstream_id } = draftResult.rows[0];

            if (!upstream_id) {
                res.status(400).json({ error: 'This draft has never been successfully published to LinkedIn.' });
                return;
            }

            // 2. Get the valid LinkedIn token for the user
            const accessToken = await linkedinService.getValidToken(userId);

            // 3. Fetch metrics from LinkedIn API
            try {
                const metrics = await linkedinService.getPostMetrics(accessToken, upstream_id);

                // 4. Update the draft with the new metrics
                const rawMetrics = {
                    likes: metrics.likes,
                    comments: metrics.comments,
                    shares: 0, // socialActions doesn't directly return shares in v2 without extra scope, defaulting 0
                    views: 0
                };

                const updateResult = await pool.query(
                    `UPDATE drafts SET metrics = $1::jsonb, upstream_status = 'live' WHERE id = $2 RETURNING metrics, upstream_status`,
                    [JSON.stringify(rawMetrics), draftId]
                );

                res.json({
                    success: true,
                    data: updateResult.rows[0]
                });

            } catch (err: any) {
                // If LinkedIn returns 404, we mark the draft as deleted upstream
                if (err.message === 'POST_DELETED') {
                    await pool.query(
                        `UPDATE drafts SET upstream_status = 'deleted' WHERE id = $1`,
                        [draftId]
                    );

                    res.status(404).json({
                        success: false,
                        error: 'Post was deleted directly on LinkedIn.',
                        upstream_status: 'deleted'
                    });
                    return;
                }

                throw err;
            }

        } catch (error: any) {
            logger.error('Failed to sync analytics', { error: error.message, draftId });
            res.status(500).json({ error: 'Failed to sync analytics.' });
        }
    }
};
