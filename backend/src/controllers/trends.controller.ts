import { Request, Response } from 'express';
import pool from '../config/database';
import { logger } from '../utils/logger';
import { aiService } from '../services/ai.service';

export const trendsController = {
    /**
     * GET /api/trends/:id
     * Fetch a specific trend research item by ID
     */
    async getTrend(req: Request, res: Response) {
        try {
            const userId = req.user!.id;
            const { id } = req.params;

            const result = await pool.query(
                'SELECT * FROM trend_research WHERE id = $1 AND user_id = $2',
                [id, userId]
            );

            if (result.rowCount === 0) {
                res.status(404).json({ error: 'Trend research not found' });
                return;
            }

            res.json(result.rows[0]);
        } catch (error: any) {
            logger.error('Error fetching trend', { error: error.message });
            res.status(500).json({ error: 'Failed to fetch trend' });
        }
    },

    /**
     * GET /api/trends
     * List all trend research items
     */
    async listTrends(req: Request, res: Response) {
        try {
            const userId = req.user!.id;
            const result = await pool.query(
                'SELECT * FROM trend_research WHERE user_id = $1 ORDER BY created_at DESC',
                [userId]
            );
            res.json(result.rows);
        } catch (error: any) {
            logger.error('Error listing trends', { error: error.message });
            res.status(500).json({ error: 'Failed to list trends' });
        }
    },

    /**
     * POST /api/trends/trigger
     * Digs through the latest ingested_contents and invokes the AI to identify emerging topics.
     */
    async triggerResearch(req: Request, res: Response) {
        try {
            const userId = req.user!.id;
            logger.info('Triggering AI trend research', { userId });

            // 1. Fetch latest raw scraped content
            const latestContent = await pool.query(
                `SELECT raw_content FROM ingested_contents 
                 WHERE user_id = $1 
                 ORDER BY published_at DESC 
                 LIMIT 50`,
                [userId]
            );

            if (latestContent.rowCount === 0) {
                res.status(400).json({ error: 'No scraped content found to analyze. Please add sources first.' });
                return;
            }

            const rawTexts = latestContent.rows.map(row => row.raw_content).filter(text => text && text.length > 50);

            if (rawTexts.length === 0) {
                res.status(400).json({ error: 'Scraped content was too short or empty.' });
                return;
            }

            // 2. Call AI Service to find trends
            const aiResponse = await aiService.analyzeTrends({ raw_texts: rawTexts });

            // 3. Save resulting trends into the topics table
            const savedTopics = [];
            for (const topicData of aiResponse.topics) {
                const topicInsert = await pool.query(
                    `INSERT INTO topics (user_id, title, description, keywords, trend_score, confidence_score, created_at)
                     VALUES ($1, $2, $3, $4, $5, $6, NOW())
                     RETURNING *`,
                    [userId, topicData.topic, topicData.description, topicData.keywords || [], topicData.score || 0, 80]
                );
                savedTopics.push(topicInsert.rows[0]);
            }

            logger.info('Trend research completed successfully', {
                userId,
                topicsFound: savedTopics.length,
                tokensUsed: aiResponse.tokens_consumed
            });

            res.json({
                success: true,
                topics: savedTopics,
                meta: {
                    tokens: aiResponse.tokens_consumed,
                    processing_ms: aiResponse.processing_time_ms
                }
            });

        } catch (error: any) {
            logger.error('Error triggering trend research', { error: error.message });
            res.status(500).json({ error: 'Failed to conduct trend research via AI' });
        }
    }
};
