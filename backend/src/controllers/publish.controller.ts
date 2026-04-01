import { Request, Response } from 'express';
import { linkedinService } from '../services/linkedin.service';
import pool from '../config/database';
import { logger } from '../utils/logger';
import { PublishContentInput } from '../middleware/validate.middleware';

export const publishController = {
    /**
     * POST /api/publish
     *
     * Publish content directly to LinkedIn ("Publish Now" button).
     *
     * Flow:
     * 1. Get valid LinkedIn token for user (auto-refreshes if expired)
     * 2. Get LinkedIn author URN from stored connection
     * 3. Post content via LinkedIn UGC API
     * 4. Log the published post in the database
     */
    async publishNow(req: Request, res: Response): Promise<void> {
        const { content } = req.body as PublishContentInput;
        const userId = req.user!.id;

        try {
            // 1. Get valid access token (auto-refresh if needed)
            logger.info('Publishing to LinkedIn', { userId });
            const accessToken = await linkedinService.getValidToken(userId);

            // 2. Get the stored LinkedIn user ID (author URN)
            const connResult = await pool.query(
                `SELECT platform_user_id FROM platform_connections 
                 WHERE user_id = $1 AND platform = 'linkedin' AND is_active = true`,
                [userId]
            );

            const connection = connResult.rows[0];

            if (!connection?.platform_user_id) {
                res.status(400).json({
                    error: 'LinkedIn profile ID not found. Please reconnect your account.',
                });
                return;
            }

            // 3. Post to LinkedIn
            const result = await linkedinService.createPost(
                accessToken,
                connection.platform_user_id,
                content
            );

            // 4. Log the published post
            const pubPost = await pool.query(
                `INSERT INTO published_posts (user_id, platform, platform_post_id, content, published_at, status)
                 VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
                [userId, 'linkedin', result.id, content, new Date().toISOString(), 'published']
            );

            // 5. Update the Draft if a draft_id was provided
            if (req.body.draft_id) {
                await pool.query(
                    `UPDATE drafts 
                     SET status = 'published', upstream_id = $1, upstream_status = 'live', updated_at = NOW()
                     WHERE id = $2 AND user_id = $3`,
                    [result.id, req.body.draft_id, userId]
                );
            }

            logger.info('Post published to LinkedIn', {
                userId,
                postId: result.id,
                contentLength: content.length,
            });

            res.json({
                success: true,
                data: {
                    post_id: result.id,
                    platform: 'linkedin',
                    published_at: new Date().toISOString(),
                },
            });
        } catch (err: any) {
            logger.error('Publish failed', {
                error: err.message,
                userId,
            });

            // Return specific status codes for known error types
            if (err.message.includes('not connected') || err.message.includes('reconnect')) {
                res.status(401).json({ error: err.message });
                return;
            }
            if (err.message.includes('rate limit')) {
                res.status(429).json({ error: err.message });
                return;
            }

            res.status(500).json({
                error: 'Failed to publish content',
                details: err.message,
            });
        }
    },
};
