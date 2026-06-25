import { Request, Response } from 'express';
import { aiService } from '../services/ai.service';
import { logger } from '../utils/logger';
import { GenerateContentInput } from '../middleware/validate.middleware';
import pool from '../config/database';

export const generateController = {
    /**
     * POST /api/generate
     *
     * Accepts trend data from the frontend, forwards it to the AI microservice,
     * and returns the generated LinkedIn content.
     *
     * Flow: Frontend → Backend (auth + validate) → AI Service → Backend → Frontend
     */
    async generate(req: Request, res: Response): Promise<void> {
        const body = req.validatedBody as GenerateContentInput;
        const userId = req.user!.id;

        try {
            logger.info('Content generation requested', {
                userId,
                topic: body.topic.substring(0, 50),
                contentType: body.content_type,
            });

            const result = await aiService.generateContent({
                trend: {
                    topic: body.topic,
                    description: body.description,
                    source_url: body.source_url || undefined,
                    keywords: body.keywords,
                },
                hook_text: req.body.hook_text, // Get the exact hook selected by user if provided
                content_type: body.content_type,
                platform: 'linkedin',
            });

            // Step 4: Full Post Drafting - Saving to DB automatically
            const draftContent = {
                text: result.content,
                hashtags: result.hashtags || [],
                mentions: []
            };

            const draftInsert = await pool.query(
                `INSERT INTO drafts (user_id, platform, content_type, title, content, status, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, $5, 'draft', NOW(), NOW())
                 RETURNING id`,
                [userId, 'linkedin', body.content_type, body.topic.substring(0, 100), JSON.stringify(draftContent)]
            );

            logger.info('Content generated successfully and saved to drafts', {
                userId,
                draftId: draftInsert.rows[0].id,
                contentLength: result.content.length,
                tokens: result.tokens_consumed,
                processingMs: result.processing_time_ms,
            });

            res.json({
                success: true,
                data: {
                    ...result,
                    draft_id: draftInsert.rows[0].id
                },
            });
        } catch (err: any) {
            logger.error('Content generation failed', {
                error: err.message,
                userId,
            });
            res.status(502).json({
                error: 'Content generation failed',
                details: err.message,
            });
        }
    },

    /**
     * POST /api/generate/stream
     * Streams LinkedIn content and saves the draft when complete.
     */
    async generateStream(req: Request, res: Response): Promise<void> {
        const body = req.validatedBody as GenerateContentInput;
        const userId = req.user!.id;

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        try {
            logger.info('Content stream requested', { userId, topic: body.topic.substring(0, 50) });

            let fullContent = '';

            await aiService.generateContentStream(
                {
                    trend: {
                        topic: body.topic,
                        description: body.description,
                        source_url: body.source_url || undefined,
                        keywords: body.keywords,
                    },
                    hook_text: req.body.hook_text,
                    content_type: body.content_type,
                    platform: 'linkedin',
                },
                (chunkStr) => {
                    // The python generator yields: json.dumps({"chunk": chunk.content}) + "\n"
                    // We forward this as SSE.
                    const lines = chunkStr.split('\n').filter(Boolean);
                    for (const line of lines) {
                        try {
                            const parsed = JSON.parse(line);
                            if (parsed.chunk) {
                                fullContent += parsed.chunk;
                                res.write(`data: ${JSON.stringify({ chunk: parsed.chunk })}\n\n`);
                            }
                        } catch (e) {
                            // Ignored or log
                        }
                    }
                }
            );

            // Step 4: Full Post Drafting - Saving to DB automatically
            const draftContent = {
                text: fullContent,
                hashtags: [], 
                mentions: []
            };

            const draftInsert = await pool.query(
                `INSERT INTO drafts (user_id, platform, content_type, title, content, status, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, $5, 'draft', NOW(), NOW())
                 RETURNING id`,
                [userId, 'linkedin', body.content_type, body.topic.substring(0, 100), JSON.stringify(draftContent)]
            );

            logger.info('Stream generated successfully and saved to drafts', { userId, draftId: draftInsert.rows[0].id });

            // Send a final message with the draft_id so frontend knows it finished
            res.write(`data: ${JSON.stringify({ draft_id: draftInsert.rows[0].id, done: true })}\n\n`);
            res.end();
        } catch (err: any) {
            logger.error('Content stream failed', { error: err.message, userId });
            res.write(`data: ${JSON.stringify({ error: 'Content generation failed', details: err.message })}\n\n`);
            res.end();
        }
    },

    /**
     * POST /api/generate/hooks
     * Accepts a topic and generates 3-5 distinct hooks.
     */
    async generateHooks(req: Request, res: Response): Promise<void> {
        const body = req.validatedBody as GenerateContentInput;
        const userId = req.user!.id;
        const angle = req.body.angle; // optional UI field

        try {
            logger.info('Hook generation requested', { userId, topic: body.topic.substring(0, 50) });

            const result = await aiService.generateHooks({
                trend: {
                    topic: body.topic,
                    description: body.description,
                    source_url: body.source_url || undefined,
                    keywords: body.keywords,
                },
                angle: angle,
            });

            res.json({
                success: true,
                data: result,
            });
        } catch (err: any) {
            logger.error('Hook generation failed', { error: err.message, userId });
            res.status(502).json({ error: 'Hook generation failed', details: err.message });
        }
    },
};
