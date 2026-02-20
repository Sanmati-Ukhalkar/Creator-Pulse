import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import { logger } from './utils/logger';
import { generalLimiter } from './middleware/rateLimiter.middleware';
import { errorHandler } from './middleware/errorHandler.middleware';
import { authMiddleware } from './middleware/auth.middleware';
import authRoutes from './routes/auth.routes';
import healthRoutes from './routes/health.routes';
import linkedinRoutes from './routes/linkedin.routes';
import contentRoutes from './routes/content.routes';
import scheduleRoutes from './routes/schedule.routes';
import draftsRoutes from './routes/drafts.routes';
import sourcesRoutes from './routes/sources.routes';
import scraperRoutes from './routes/scraper.routes';
import profileRoutes from './routes/profile.routes';
import trendsRoutes from './routes/trends.routes';
import researchRoutes from './routes/research.routes';
import topicsRoutes from './routes/topics.routes';
import ingestedContentRoutes from './routes/ingested_content.routes';
import { schedulerService } from './services/scheduler.service';

const app = express();

// ═══════════════════════════════════════════
// Security Middleware
// ═══════════════════════════════════════════
app.use(helmet());
app.use(cors({
    origin: [
        'http://localhost:8080',
        'http://localhost:5173',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(generalLimiter);

// ═══════════════════════════════════════════
// Request Logging
// ═══════════════════════════════════════════
app.use((req, _res, next) => {
    logger.info(`→ ${req.method} ${req.path}`, {
        ip: req.ip,
    });
    next();
});

// ═══════════════════════════════════════════
// Routes
// ═══════════════════════════════════════════
app.use(healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/drafts', draftsRoutes);
app.use('/api/sources', sourcesRoutes);
app.use('/api/scraper', scraperRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/trends', trendsRoutes);
app.use('/api/research', researchRoutes);
app.use('/api/topics', topicsRoutes);
app.use('/api/ingested-contents', ingestedContentRoutes);

// Temporary test route — verifies auth middleware is working
app.get('/api/me', authMiddleware, (req, res) => {
    res.json({ user: req.user, message: 'Auth middleware working!' });
});

// LinkedIn OAuth routes (Phase 3)
app.use('/api/linkedin', linkedinRoutes);

// Content generation & publish routes (Phase 4)
app.use('/api', contentRoutes);

// Scheduler routes (Phase 5)
app.use('/api', scheduleRoutes);

// ═══════════════════════════════════════════
// Error Handler (must be LAST)
// ═══════════════════════════════════════════
app.use(errorHandler);

// ═══════════════════════════════════════════
// Start Server
// ═══════════════════════════════════════════
const server = app.listen(env.PORT, () => {
    logger.info(`🚀 CreatorPulse Backend running on port ${env.PORT}`);
    logger.info(`📍 Health check: http://localhost:${env.PORT}/health`);

    // Initialize Scheduler Cron Job
    schedulerService.init();

    logger.info(`🔧 Environment: ${env.NODE_ENV}`);
});

// ═══════════════════════════════════════════
// Graceful Shutdown
// ═══════════════════════════════════════════
const shutdown = (signal: string) => {
    logger.info(`${signal} received. Shutting down gracefully...`);
    server.close(() => {
        logger.info('Server closed.');
        process.exit(0);
    });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export default app;
