import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
    // Database (PostgreSQL)
    DATABASE_URL: z.string().url('DATABASE_URL must be a valid PostgreSQL connection string'),

    // Server
    PORT: z.string().default('4000').transform(Number),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

    // Authentication (JWT)
    JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),

    // Encryption (required — generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
    ENCRYPTION_KEY: z.string().length(64, 'ENCRYPTION_KEY must be a 64-char hex string (32 bytes)'),

    // AI Service (optional in Phase 1, required from Phase 2+)
    AI_SERVICE_URL: z.string().url().default('http://localhost:8000'),
    AI_SERVICE_KEY: z.string().min(8).optional(),

    // LinkedIn OAuth (optional in Phase 3+)
    LINKEDIN_CLIENT_ID: z.string().min(10).optional(),
    LINKEDIN_CLIENT_SECRET: z.string().min(10).optional(),
    LINKEDIN_REDIRECT_URI: z.string().url().optional(),

    // Twitter (Scraper)
    TWITTER_BEARER_TOKEN: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    console.error('\n❌ Environment validation failed:\n');
    const errors = parsed.error.flatten().fieldErrors;
    for (const [field, messages] of Object.entries(errors)) {
        console.error(`  • ${field}: ${messages?.join(', ')}`);
    }
    console.error('\n📄 See backend/.env.example for required variables.\n');
    process.exit(1);
}

export const env = parsed.data;
