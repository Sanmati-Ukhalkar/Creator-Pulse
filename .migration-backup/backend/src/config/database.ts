import { Pool } from 'pg';
import { env } from './env';
import { logger } from '../utils/logger';

// Create a new pool instance using the connection string from environment variables
const pool = new Pool({
    connectionString: env.DATABASE_URL,
});

// Test the connection
pool.on('connect', () => {
    // logger.info('Connected to the PostgreSQL database'); // Avoid too much noise
});

pool.on('error', (err) => {
    logger.error('Unexpected error on idle client', err);
    process.exit(-1);
});

/**
 * Cleanup function to close the pool on shutdown
 */
export const closeDatabaseConnection = async () => {
    await pool.end();
    logger.info('Database connection closed');
};

export default pool;
