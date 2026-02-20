import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../.env') });

const DB_URL = process.env.DATABASE_URL;

if (!DB_URL) {
    console.error('DATABASE_URL is not defined');
    process.exit(1);
}

const filesToRun = [
    '006_ingested_contents.sql',
    '007_trend_research.sql'
];

async function apply() {
    console.log('Applying new migrations...');
    const client = new Client({ connectionString: DB_URL });
    await client.connect();

    try {
        const migrationsDir = path.join(__dirname, '../migrations');
        for (const file of filesToRun) {
            console.log(`Running ${file}...`);
            const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
            await client.query(sql);
            console.log(`✅ ${file} applied.`);
        }
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await client.end();
    }
}

apply();
