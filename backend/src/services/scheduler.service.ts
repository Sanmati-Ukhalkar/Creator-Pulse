import cron from 'node-cron';
import pool from '../config/database';
import { linkedinService } from './linkedin.service';
import { logger } from '../utils/logger';

export const schedulerService = {
    /**
     * Start the scheduler cron job
     * Run every minute to check for due posts
     */
    init() {
        logger.info('Starting Cron Scheduler: * * * * *');
        cron.schedule('* * * * *', async () => {
            logger.info('Scheduler tick: Checking for due posts...');
            await this.processDuePosts();
        });
    },

    /**
     * Process all pending posts that are scheduled for now or in the past
     */
    async processDuePosts() {
        try {
            // 1. Fetch pending posts that are due
            const result = await pool.query(
                `SELECT * FROM scheduled_posts 
                 WHERE status = 'pending' 
                 AND scheduled_at <= NOW() 
                 LIMIT 10`
            );

            const duePosts = result.rows;

            if (duePosts.length === 0) {
                // No posts due
                return;
            }

            logger.info(`Found ${duePosts.length} posts due for publishing.`);

            // 2. Process each post sequentially (simpler for MVP than parallel)
            for (const post of duePosts) {
                await this.publishPost(post);
            }

        } catch (err: any) {
            logger.error('Unexpected error in scheduler tick', { error: err.message });
        }
    },

    /**
     * Publish a single scheduled post
     */
    async publishPost(post: any) {
        logger.info(`Processing scheduled post ${post.id} for user ${post.user_id}`);

        try {
            // 1. Get valid access token (auto-refresh)
            const accessToken = await linkedinService.getValidToken(post.user_id);

            // 2. Get user's LinkedIn ID
            const connectionResult = await pool.query(
                `SELECT platform_user_id FROM platform_connections 
                 WHERE user_id = $1 AND platform = 'linkedin' AND is_active = true`,
                [post.user_id]
            );

            const connection = connectionResult.rows[0];

            if (!connection?.platform_user_id) {
                throw new Error('LinkedIn not connected or inactive');
            }

            // 3. Publish to LinkedIn
            const result = await linkedinService.createPost(
                accessToken,
                connection.platform_user_id,
                post.content
            );

            // 4. Update status to 'published'
            await pool.query(
                `UPDATE scheduled_posts SET status = 'published', updated_at = NOW() WHERE id = $1`,
                [post.id]
            );

            // 5. Create entry in published_posts log (for history)
            await pool.query(
                `INSERT INTO published_posts 
                (user_id, platform, platform_post_id, content, published_at, status)
                VALUES ($1, $2, $3, $4, NOW(), 'published')`,
                [post.user_id, 'linkedin', result.id, post.content]
            );

            logger.info(`Scheduled post ${post.id} published successfully as regular post ${result.id}`);

        } catch (err: any) {
            logger.error(`Failed to publish scheduled post ${post.id}`, { error: err.message });

            // Update status to 'failed' with error message
            await pool.query(
                `UPDATE scheduled_posts SET status = 'failed', error_message = $1, updated_at = NOW() WHERE id = $2`,
                [err.message, post.id]
            );
        }
    }
};
