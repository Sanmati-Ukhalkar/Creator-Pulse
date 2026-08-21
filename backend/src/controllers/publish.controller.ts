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

            // Check if draft has an image or PDF in its metadata
            let imageToPublish: { b64: string; format: string } | undefined = undefined;
            let documentToPublish: { path: string; name: string } | undefined = undefined;

            if (req.body.draft_id) {
                const draftResult = await pool.query(
                    `SELECT title, metadata FROM drafts WHERE id = $1 AND user_id = $2`,
                    [req.body.draft_id, userId]
                );
                if (draftResult.rows.length > 0) {
                    const metadata = draftResult.rows[0].metadata || {};
                    const title = draftResult.rows[0].title || 'Carousel';

                    if (metadata.export_pdf_path) {
                        const path = require('path');
                        logger.info('Found PDF in draft metadata. Will attach to LinkedIn post.', { draftId: req.body.draft_id });
                        documentToPublish = {
                            path: path.join(__dirname, '..', '..', '..', 'storage', 'carousel_exports', metadata.export_pdf_path),
                            name: title
                        };
                    } else if (metadata.image_b64) {
                        logger.info('Found image in draft metadata. Will attach to LinkedIn post.', { draftId: req.body.draft_id });
                        imageToPublish = {
                            b64: metadata.image_b64,
                            format: metadata.image_format || 'jpeg',
                        };
                    }
                }
            }

            // 3. Post to LinkedIn
            const result = await linkedinService.createPost(
                accessToken,
                connection.platform_user_id,
                content,
                imageToPublish,
                documentToPublish
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
                error: err.message,
                details: err.message,
            });
        }
    },
};
