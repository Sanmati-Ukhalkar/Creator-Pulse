import cron from 'node-cron';
import fs from 'fs';
import path from 'path';
import pool from '../config/database';
import { logger } from '../utils/logger';

const STORAGE_ROOT = path.resolve(__dirname, '..', '..', '..', 'storage');
const PNG_DIR = path.join(STORAGE_ROOT, 'png_slides');

export const initCleanupCron = () => {
    // Run daily at midnight
    cron.schedule('0 0 * * *', async () => {
        logger.info('Running background garbage collection cron job...');
        
        try {
            const staleTime = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
            
            // Clean up stale database rows (failed or hanging jobs > 2 hours)
            const staleRes = await pool.query(
                `UPDATE carousel_jobs 
                 SET status = 'failed' 
                 WHERE status NOT IN ('done', 'failed') AND created_at < $1
                 RETURNING id`, 
                [staleTime]
            );
            
            if (staleRes.rowCount > 0) {
                logger.info(`Cleaned up ${staleRes.rowCount} stale jobs.`);
            }

            // Clean up temporary PNG files older than 24 hours
            if (fs.existsSync(PNG_DIR)) {
                const now = Date.now();
                const msInDay = 24 * 60 * 60 * 1000;
                
                fs.readdirSync(PNG_DIR).forEach(file => {
                    const filePath = path.join(PNG_DIR, file);
                    const stats = fs.statSync(filePath);
                    if (now - stats.mtimeMs > msInDay) {
                        try {
                            fs.unlinkSync(filePath);
                            logger.debug(`Deleted stale file: ${filePath}`);
                        } catch (err) {
                            logger.error(`Failed to delete file: ${filePath}`, err);
                        }
                    }
                });
            }
        } catch (error) {
            logger.error('Cron garbage collection failed', error);
        }
    });
};
