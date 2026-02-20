import { Request, Response } from 'express';
import { aiService } from '../services/ai.service';
import { logger } from '../utils/logger';
import { GenerateContentInput } from '../middleware/validate.middleware';

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
                voice_samples: body.voice_samples,
                content_type: body.content_type,
                platform: 'linkedin',
            });

            logger.info('Content generated successfully', {
                userId,
                contentLength: result.content.length,
                tokens: result.tokens_consumed,
                processingMs: result.processing_time_ms,
            });

            res.json({
                success: true,
                data: result,
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
};
