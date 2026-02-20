import rateLimit from 'express-rate-limit';

/**
 * General Rate Limiter
 * 100 requests per 15 minutes per IP.
 * Applied globally to all routes.
 */
export const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests. Please try again later.' },
});

/**
 * AI Generation Rate Limiter
 * 10 requests per 15 minutes per IP.
 * Applied specifically to AI content generation routes (Phase 2+).
 */
export const aiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'AI generation rate limit reached. Try again in 15 minutes.' },
});
