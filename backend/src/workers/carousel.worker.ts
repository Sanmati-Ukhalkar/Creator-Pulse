import { Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import axios from 'axios';
import pool from '../config/database';
import { logger } from '../utils/logger';
import { env } from '../config/env';
import { generateCarouselPdf } from '../utils/pdfGenerator';

// ═══════════════════════════════════════════
// Redis connection for BullMQ worker
// ═══════════════════════════════════════════
const redisConnection = new Redis(env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null, // Required by BullMQ
});

// ═══════════════════════════════════════════
// Job Processor
// ═══════════════════════════════════════════
async function processCarouselJob(job: Job): Promise<void> {
    const { jobId, userId, topic } = job.data;

    logger.info(`🎠 Processing carousel job`, { jobId, userId, topic, jobName: job.name });

    // 1. Mark job as generating
    await pool.query(
        `UPDATE carousel_jobs SET status = 'generating', updated_at = NOW() WHERE id = $1`,
        [jobId]
    );

    try {
        // 2. Call AI service
        const aiResponse = await axios.post(
            `${env.AI_SERVICE_URL}/generate-carousel`,
            { topic, slide_count: 6 },
            {
                headers: {
                    'x-api-key': env.AI_SERVICE_KEY ?? '',
                    'Content-Type': 'application/json',
                },
                timeout: 120_000,
            }
        );

        const slides: Array<{ title: string; body: string; visual_hint: string }> = aiResponse.data?.slides ?? [];

        // 3. Persist each slide
        for (let i = 0; i < slides.length; i++) {
            const { title, body, visual_hint } = slides[i];
            await pool.query(
                `INSERT INTO carousel_slides (job_id, slide_order, title, body, visual_hint, slide_type, idea, headline, subtext, visual_description, layout, color_scheme, font_size)
                 VALUES ($1, $2, $3, $4, $5, 'content', $6, $7, $8, $9, 'centered_minimal', 'dark_modern', 'medium')`,
                [jobId, i, title, body, visual_hint, title || 'content', title, body, visual_hint]
            );
        }

        // 4. Generate PDF natively
        logger.info(`🎠 Generating PDF for job ${jobId}`);
        const slidesForPdf = slides.map((s, i) => ({ title: s.title, body: s.body, slide_order: i }));
        const pdfFileName = await generateCarouselPdf(jobId, slidesForPdf);

        // 5. Save Export Record
        await pool.query(
            `INSERT INTO carousel_exports (job_id, pdf_storage_path) VALUES ($1, $2)`,
            [jobId, pdfFileName]
        );

        // 6. Mark job as done
        await pool.query(
            `UPDATE carousel_jobs SET status = 'done', updated_at = NOW() WHERE id = $1`,
            [jobId]
        );

        logger.info(`🎠 Carousel job completed`, { jobId, slideCount: slides.length });
    } catch (err: any) {
        logger.error(`🎠 Carousel processing failed for job ${jobId}`, {
            jobId,
            error: err.message,
        });

        await pool.query(
            `UPDATE carousel_jobs
             SET status = 'failed', error_message = $2, updated_at = NOW()
             WHERE id = $1`,
            [jobId, err.message]
        );

        throw err;
    }
}

// ═══════════════════════════════════════════
// Worker Factory
// ═══════════════════════════════════════════
export function startCarouselWorker(): Worker {
    const worker = new Worker('carousel-jobs-node', processCarouselJob, {
        connection: redisConnection,
        concurrency: 5,
    });

    worker.on('completed', (job: Job) => {
        logger.info(`🎠 Carousel job completed successfully`, {
            jobId: job.data?.jobId,
            bullJobId: job.id,
        });
    });

    worker.on('failed', (job: Job | undefined, err: Error) => {
        logger.error(`🎠 Carousel job failed`, {
            jobId: job?.data?.jobId,
            bullJobId: job?.id,
            error: err.message,
        });
    });

    worker.on('error', (err: Error) => {
        logger.error('🎠 Carousel worker encountered an error', { error: err.message });
    });

    return worker;
}
