import axios from 'axios';
import { env } from '../config/env';
import { logger } from '../utils/logger';

interface GenerateRequest {
    trend: {
        topic: string;
        description: string;
        source_url?: string;
        keywords?: string[];
    };
    voice_samples: string[];
    content_type: 'linkedin_short' | 'linkedin_long';
    platform: string;
}

interface GenerateResponse {
    content: string;
    hook: string;
    hashtags: string[];
    engagement_prediction: {
        estimated_likes: number;
        estimated_comments: number;
        estimated_shares: number;
        confidence: number;
    };
    ai_model_version: string;
    tokens_consumed: number;
    processing_time_ms: number;
}

/**
 * AI Service HTTP Client
 * 
 * Bridges the backend to the AI microservice.
 * All calls are authenticated via shared API key (X-API-Key header).
 */
export const aiService = {
    async generateContent(request: GenerateRequest): Promise<GenerateResponse> {
        try {
            logger.info('Calling AI service', {
                topic: request.trend.topic,
                contentType: request.content_type,
            });

            const response = await axios.post<GenerateResponse>(
                `${env.AI_SERVICE_URL}/generate`,
                request,
                {
                    headers: {
                        'X-API-Key': env.AI_SERVICE_KEY || '',
                        'Content-Type': 'application/json',
                    },
                    timeout: 60000, // 60s — LLM calls can be slow
                }
            );

            logger.info('AI service responded', {
                contentLength: response.data.content.length,
                tokens: response.data.tokens_consumed,
                processingMs: response.data.processing_time_ms,
            });

            return response.data;
        } catch (error: any) {
            const status = error.response?.status;
            const detail = error.response?.data?.detail || error.message;

            logger.error('AI service call failed', { status, detail });

            if (status === 403) {
                throw new Error('AI service authentication failed. Check AI_SERVICE_KEY.');
            }
            if (status === 422) {
                throw new Error(`Invalid request to AI service: ${detail}`);
            }

            throw new Error(`AI service error: ${detail}`);
        }
    },
};
