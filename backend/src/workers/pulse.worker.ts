import cron from 'node-cron';
import pool from '../config/database';
import { logger } from '../utils/logger';
import { liveSearchService } from '../services/live_search.service';

export function startPulseWorker() {
    logger.info('Starting Pulse Worker (Live Data Ingestion)');

    // Run every 6 hours
    cron.schedule('0 */6 * * *', async () => {
        logger.info('Running scheduled Pulse live data ingestion...');

        try {
            // Get all queries that haven't been run in the last 6 hours
            const res = await pool.query(`
                SELECT id, user_id, query_string
                FROM listening_queries
                WHERE last_run_at IS NULL OR last_run_at < NOW() - INTERVAL '5 hours'
            `);

            const queries = res.rows;
            logger.info(`Found ${queries.length} listening queries to execute`);

            for (const query of queries) {
                await liveSearchService.runListeningQuery(query.user_id, query.id, query.query_string);
                
                // Add a small delay to avoid hitting API rate limits
                await new Promise(resolve => setTimeout(resolve, 2000));
            }

            logger.info('Completed scheduled Pulse live data ingestion');
        } catch (error: any) {
            logger.error('Error in Pulse worker', { error: error.message });
        }
    });
}
