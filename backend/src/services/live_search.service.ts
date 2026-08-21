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

            let sourceId: string;
            const sourceRes = await pool.query(
                `SELECT id FROM sources WHERE user_id = $1 AND source_type = 'tavily' LIMIT 1`,
                [userId]
            );
            if (sourceRes.rowCount && sourceRes.rowCount > 0) {
                sourceId = sourceRes.rows[0].id;
            } else {
                const insertSource = await pool.query(
                    `INSERT INTO sources (user_id, source_name, source_type, source_url)
                     VALUES ($1, 'Live Data Engine', 'tavily', 'https://tavily.com')
                     RETURNING id`,
                    [userId]
                );
                sourceId = insertSource.rows[0].id;
            }

            let insertedCount = 0;
            for (const item of results) {
                // Generate hash
                const rawContent = item.content || '';
                let hashNum = 0;
                for (let i = 0; i < rawContent.length; i++) {
                    const char = rawContent.charCodeAt(i);
                    hashNum = ((hashNum << 5) - hashNum) + char;
                    hashNum = hashNum & hashNum;
                }
                const hashStr = Math.abs(hashNum).toString(36);

                // Insert into ingested_contents
                const insertRes = await pool.query(
                    `INSERT INTO ingested_contents 
                     (user_id, source_id, url, title, raw_content, hash, published_at, metadata, status)
                     VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, 'fetched')
                     ON CONFLICT (user_id, url) DO NOTHING
                     RETURNING id`,
                    [
                        userId,
                        sourceId,
                        item.url,
                        item.title || 'Untitled',
                        rawContent,
                        hashStr,
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

    async runNewsApiQuery(userId: string, queryId: string, queryStr: string) {
        if (!env.NEWS_API_KEY) {
            logger.warn('NEWS_API_KEY is not set. Skipping NewsAPI live search.');
            return;
        }

        let sourceId: string;
        try {
            const sourceRes = await pool.query(
                `SELECT id FROM sources WHERE user_id = $1 AND source_type = 'newsapi' LIMIT 1`,
                [userId]
            );
            if (sourceRes.rowCount && sourceRes.rowCount > 0) {
                sourceId = sourceRes.rows[0].id;
            } else {
                const insertSource = await pool.query(
                    `INSERT INTO sources (user_id, source_name, source_type, source_url)
                     VALUES ($1, 'NewsAPI Live Data', 'newsapi', 'https://newsapi.org')
                     RETURNING id`,
                    [userId]
                );
                sourceId = insertSource.rows[0].id;
            }
        } catch (err) {
            logger.error("Failed to fetch/create NewsAPI source", err);
            return;
        }

        try {
            logger.info('Running NewsAPI search query', { userId, queryStr });

            // Use the top headlines or everything endpoint. 'everything' is better for niche queries.
            const response = await axios.get('https://newsapi.org/v2/everything', {
                params: {
                    q: queryStr,
                    sortBy: 'relevancy',
                    pageSize: 5,
                    language: 'en'
                },
                headers: {
                    'X-Api-Key': env.NEWS_API_KEY,
                    'User-Agent': 'CreatorPulse/1.0'
                },
                timeout: 15000
            });

            const articles = response.data.articles || [];

            let insertedCount = 0;
            for (const item of articles) {
                // Generate hash
                const rawContent = (item.content || item.description || '') as string;
                if (!rawContent) continue;
                
                let hashNum = 0;
                for (let i = 0; i < rawContent.length; i++) {
                    const char = rawContent.charCodeAt(i);
                    hashNum = ((hashNum << 5) - hashNum) + char;
                    hashNum = hashNum & hashNum;
                }
                const hashStr = Math.abs(hashNum).toString(36);

                const url = item.url || `https://newsapi.org/?hash=${hashStr}`;

                // Insert into ingested_contents
                const insertRes = await pool.query(
                    `INSERT INTO ingested_contents 
                     (user_id, source_id, url, title, raw_content, hash, published_at, metadata, status)
                     VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, 'fetched')
                     ON CONFLICT (user_id, url) DO NOTHING
                     RETURNING id`,
                    [
                        userId,
                        sourceId,
                        url,
                        item.title || 'Untitled',
                        rawContent,
                        hashStr,
                        JSON.stringify({ from_newsapi: true, query: queryStr, author: item.author })
                    ]
                );
                
                if (insertRes.rowCount && insertRes.rowCount > 0) {
                    insertedCount++;
                }
            }

            // Update last_run_at for the query is already done by Tavily, or we can do it here if we want.
            // We'll skip updating last_run_at here to avoid conflicting writes.

            logger.info('NewsAPI search query completed', { userId, queryStr, newItems: insertedCount });
            return insertedCount;

        } catch (error: any) {
            logger.error('Error running NewsAPI query', { error: error.message, data: error.response?.data, queryStr });
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
                await Promise.all([
                    this.runListeningQuery(userId, queryId, q),
                    this.runNewsApiQuery(userId, queryId, q)
                ]);
            }

            logger.info('Successfully generated and ran listening queries', { userId, queryCount: queries.length });
        } catch (error: any) {
            logger.error('Failed to generate and run listening queries', { error: error.message, userId });
        }
    }
};
