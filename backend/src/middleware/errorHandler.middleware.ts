import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { env } from '../config/env';

/**
 * Global Error Handler
 * 
 * Catches all unhandled errors, logs them, and returns a clean 500 response.
 * Stack traces are only included in development mode — never leaked in production.
 * 
 * ⚠️ Must be registered LAST in the middleware chain (after all routes).
 */
export const errorHandler = (
    err: Error,
    req: Request,
    res: Response,
    _next: NextFunction
): void => {
    logger.error('Unhandled error', {
        error: err.message,
        stack: err.stack,
        method: req.method,
        path: req.path,
        ip: req.ip,
    });

    res.status(500).json({
        error: 'Internal server error',
        ...(env.NODE_ENV === 'development' && { details: err.message }),
    });
};
