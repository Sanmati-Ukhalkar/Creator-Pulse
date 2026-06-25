import { Request, Response } from 'express';
import { imageService } from '../services/image.service';
import { logger } from '../utils/logger';

export const imageController = {
    /**
     * POST /api/generate-image
     *
     * Generate a professional LinkedIn banner image based on a post's text.
     * Optionally saves it to the draft's metadata if draft_id is provided.
     *
     * Body:
     *   post_text   string   Required. The full post text (to derive visual concept)
     *   topic       string   Required. The trend topic title
     *   provider    string   Optional. 'pollinations' (default) | 'gemini'
     *   seed        number   Optional. Change for a different Pollinations variation
     *   draft_id    string   Optional. If provided, saves image to draft metadata
     */
    async generate(req: Request, res: Response): Promise<void> {
        const userId = req.user!.id;
        const { post_text, topic, provider, seed, draft_id } = req.body;

        // Basic validation
        if (!post_text || typeof post_text !== 'string' || post_text.trim().length < 10) {
            res.status(400).json({ error: 'post_text is required and must be at least 10 characters.' });
            return;
        }
        if (!topic || typeof topic !== 'string') {
            res.status(400).json({ error: 'topic is required.' });
            return;
        }
        if (provider && !['pollinations', 'gemini'].includes(provider)) {
            res.status(400).json({ error: "provider must be 'pollinations' or 'gemini'." });
            return;
        }

        try {
            logger.info('Image generation controller invoked', {
                userId,
                provider: provider || 'pollinations',
                topic: topic.substring(0, 50),
                draftId: draft_id,
            });

            const result = await imageService.generateImage(
                {
                    post_text: post_text.trim(),
                    topic: topic.trim(),
                    provider: provider || 'pollinations',
                    seed: typeof seed === 'number' ? seed : 42,
                    draft_id: draft_id,
                },
                userId
            );

            res.json({
                success: true,
                data: result,
            });
        } catch (err: any) {
            logger.error('Image generation failed in controller', {
                error: err.message,
                userId,
            });

            // Surface provider-specific errors clearly
            const statusCode = err.response?.status === 400 ? 400 : 502;
            res.status(statusCode).json({
                error: 'Image generation failed',
                details: err.response?.data?.detail || err.message,
            });
        }
    },
};
