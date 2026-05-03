import cron from 'node-cron';
import pool from '../config/database';
import { logger } from '../utils/logger';
import { linkedinService } from './linkedin.service';

/**
 * Analytics Worker Service
 * Runs in the background (node-cron) to sync post metrics periodically.
 */
export const analyticsWorker = {
    /**
     * Initializes the cron job.
     */
    init() {
        logger.info('🕒 Initializing Analytics Worker: Polling LinkedIn every hour');
        
        // Run every hour at minute 0
        cron.schedule('0 * * * *', async () => {
             logger.info('🔄 Running hourly Analytics Sync Worker');
             await this.syncAllActivePosts();
        });
    },

    /**
     * Finds all "live" posts published in the last 7 days and updates them.
     * We limit it to 7 days to avoid hitting rate limits on old posts
     * that aren't accumulating much new engagement anyway.
     */
    async syncAllActivePosts() {
        try {
            // Find live drafts published in the last 7 days with an upstream_id
            const recentDrafts = await pool.query(`
                SELECT id, user_id, upstream_id 
                FROM drafts
                WHERE status = 'published' 
                  AND upstream_status = 'live'
                  AND upstream_id IS NOT NULL
                  AND updated_at >= NOW() - INTERVAL '7 days'
            `);

            if (recentDrafts.rowCount === 0) {
                logger.info('Analytics Worker: No recent active posts to sync');
                return;
            }

            logger.info(`Analytics Worker: Found ${recentDrafts.rowCount} posts to sync`);

            // Loop through each (sequentially to respect rate limits)
            for (const draft of recentDrafts.rows) {
                try {
                    const accessToken = await linkedinService.getValidToken(draft.user_id);
                    
                    const metrics = await linkedinService.getPostMetrics(accessToken, draft.upstream_id);
                    
                    const rawMetrics = {
                        likes: metrics.likes,
                        comments: metrics.comments,
                        shares: 0,
                        views: 0
                    };

                    await pool.query(
                        `UPDATE drafts SET metrics = $1::jsonb WHERE id = $2`,
                        [JSON.stringify(rawMetrics), draft.id]
                    );

                    logger.info(`Analytics Worker: Successfully synced draft ${draft.id}`);

                } catch (err: any) {
                    if (err.message === 'POST_DELETED') {
                        logger.info(`Analytics Worker: Draft ${draft.id} was natively deleted on LinkedIn. Updating status.`);
                        await pool.query(
                            `UPDATE drafts SET upstream_status = 'deleted' WHERE id = $1`,
                            [draft.id]
                        );
                    } else {
                        logger.error(`Analytics Worker: Failed to sync draft ${draft.id}`, { error: err.message });
                    }
                }
                
                // Add a slightly small delay to prevent rate limit striking (LinkedIn limit: 100k/day = fast, but still)
                await new Promise(res => setTimeout(res, 500));
            }

        } catch (error: any) {
            logger.error('Analytics Worker System Failure', { error: error.message });
        }
    }
};
