import rateLimit from 'express-rate-limit';

const isDev = process.env.NODE_ENV !== 'production';

/**
 * General Rate Limiter
 * Dev: 1000 req / 15 min (effectively unlimited for local testing)
 * Prod: 100 req / 15 min
 */
export const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isDev ? 1000 : 100,
    standardHeaders: true,
    legacyHeaders: false,
    // Skip rate limiting for localhost in development
    skip: (req) => isDev && (req.ip === '::1' || req.ip === '127.0.0.1' || req.ip === '::ffff:127.0.0.1'),
    message: { error: 'Too many requests. Please try again later.' },
});

/**
 * AI Generation Rate Limiter
 * Dev: 50 req / 15 min
 * Prod: 10 req / 15 min
 */
export const aiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isDev ? 50 : 10,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => isDev && (req.ip === '::1' || req.ip === '127.0.0.1' || req.ip === '::ffff:127.0.0.1'),
    message: { error: 'AI generation rate limit reached. Try again in 15 minutes.' },
});
