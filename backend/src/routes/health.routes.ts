import { Router, Request, Response } from 'express';
import pool from '../config/database';
import axios from 'axios';
import { env } from '../config/env';

const router = Router();

/**
 * GET /health
 * No authentication required.
 * Used by Docker health checks, monitoring tools, and startup verification.
 */
router.get('/health', async (_req: Request, res: Response) => {
    try {
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
            database: 'disconnected',
        });
    }
});

/**
 * GET /api/ai-status
 * Proxies health check to the Python AI service.
 * No auth required — used by the Engine Monitor.
 */
router.get('/api/ai-status', async (_req: Request, res: Response) => {
    try {
        const aiUrl = env.AI_SERVICE_URL || 'http://localhost:8000';
        const response = await axios.get(`${aiUrl}/health`, { timeout: 5000 });
        res.json({ status: 'ok', ...response.data });
    } catch (err: any) {
        const detail = err.code === 'ECONNREFUSED'
            ? 'AI service is not running (start_service.bat)'
            : err.message;
        res.status(503).json({ status: 'unreachable', detail });
    }
});

export default router;
