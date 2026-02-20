import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { logger } from '../utils/logger';

// Extend Express Request to include authenticated user
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                email?: string;
            };
            validatedBody?: any;
        }
    }
}

/**
 * JWT Authentication Middleware
 * 
 * Verifies the local JWT from the Authorization header.
 * On success, attaches `req.user` with { id, email }.
 * On failure, returns 401.
 */
export const authMiddleware = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader?.startsWith('Bearer ')) {
            res.status(401).json({ error: 'Missing or invalid Authorization header' });
            return;
        }

        const token = authHeader.split(' ')[1];

        if (!token) {
            res.status(401).json({ error: 'Token not provided' });
            return;
        }

        const decoded = jwt.verify(token, env.JWT_SECRET) as { id: string, email: string };

        req.user = {
            id: decoded.id,
            email: decoded.email,
        };

        next();
    } catch (err: any) {
        logger.warn('Authentication failed', {
            error: err.message,
            ip: req.ip,
            path: req.path,
        });
        res.status(401).json({ error: 'Invalid or expired token' });
    }
};
