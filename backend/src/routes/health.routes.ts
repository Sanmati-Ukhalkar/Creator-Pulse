import { Router, Request, Response } from 'express';
import pool from '../config/database';

const router = Router();

/**
 * GET /health
 * 
 * No authentication required.
 * Used by Docker health checks, monitoring tools, and startup verification.
 * Verifies both server liveness and Database connectivity.
 */
router.get('/health', async (_req: Request, res: Response) => {
    try {
        // Verify Postgres connectivity
        const client = await pool.connect();
        client.release();

        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            service: 'creatorpulse-backend',
            database: 'connected',
            uptime: Math.floor(process.uptime()),
        });
    } catch {
        res.status(503).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            service: 'creatorpulse-backend',
        });
    }
});

export default router;
