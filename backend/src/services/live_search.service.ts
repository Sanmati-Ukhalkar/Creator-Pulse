import axios from 'axios';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import pool from '../config/database';

export const liveSearchService = {
    async runListeningQuery(userId: string, queryId: string, queryStr: string) {
        if (!env.TAVILY_API_KEY) {
            logger.warn('TAVILY_API_KEY is not set. Skipping live search.');
            return;
        }

        try {
            logger.info('Running live search query', { userId, queryStr });

            const response = await axios.post('https://api.tavily.com/search', {
                api_key: env.TAVILY_API_KEY,
                query: queryStr,
                search_depth: 'basic',
                max_results: 5,
                days: 2
            }, { timeout: 15000 });

            const results = response.data.results || [];

            let insertedCount = 0;
            for (const item of results) {
                // Insert into ingested_contents
                // We use a conflict clause on url to prevent duplicates
                const insertRes = await pool.query(
                    `INSERT INTO ingested_contents 
                     (user_id, source_id, title, url, content, content_type, published_at, metadata)
                     VALUES ($1, NULL, $2, $3, $4, $5, NOW(), $6)
                     ON CONFLICT (url) DO NOTHING
                     RETURNING id`,
                    [
                        userId,
                        item.title || 'Untitled',
                        item.url,
                        item.content || '',
                        'article',
                        JSON.stringify({ from_live_search: true, query: queryStr })
                    ]
                );
                
                if (insertRes.rowCount && insertRes.rowCount > 0) {
                    insertedCount++;
                }
            }

            // Update last_run_at for the query
            await pool.query(
                `UPDATE listening_queries SET last_run_at = NOW() WHERE id = $1`,
                [queryId]
            );

            logger.info('Live search query completed', { userId, queryStr, newItems: insertedCount });
            return insertedCount;

        } catch (error: any) {
            logger.error('Error running live search query', { error: error.message, queryStr });
        }
    },

    async generateAndRunQueries(userId: string, niche: string, audience: string) {
        try {
            logger.info('Generating listening queries for user', { userId, niche });
            
            // Call AI Service
            const response = await axios.post(`${env.AI_SERVICE_URL}/generate-queries`, {
                niche,
                audience
            }, {
                headers: {
                    'X-API-Key': env.AI_SERVICE_KEY || '',
                    'Content-Type': 'application/json'
                }
            });

            const queries = response.data.queries || [];

            // Delete old queries for this user
            await pool.query(`DELETE FROM listening_queries WHERE user_id = $1`, [userId]);

            // Insert new queries
            for (const q of queries) {
                const insertRes = await pool.query(
                    `INSERT INTO listening_queries (user_id, query_string, source_platform)
                     VALUES ($1, $2, 'tavily') RETURNING id`,
                    [userId, q]
                );
                
                // Run it immediately for instant feedback
                const queryId = insertRes.rows[0].id;
                await this.runListeningQuery(userId, queryId, q);
            }

            logger.info('Successfully generated and ran listening queries', { userId, queryCount: queries.length });
        } catch (error: any) {
            logger.error('Failed to generate and run listening queries', { error: error.message, userId });
        }
    }
};
