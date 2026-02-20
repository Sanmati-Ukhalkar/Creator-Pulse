import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

// Load env explicitly to ensure DATABASE_URL is available
dotenv.config({ path: path.join(__dirname, '../.env') });

const DB_URL = process.env.DATABASE_URL;

if (!DB_URL) {
    console.error('DATABASE_URL is not defined in .env');
    process.exit(1);
}

// Extract base connection string (to 'postgres' db)
// Assuming format postgresql://user:pass@host:port/dbname
const urlParts = new URL(DB_URL);
const targetDbName = urlParts.pathname.substring(1); // remove leading /
urlParts.pathname = '/postgres';
const postgresUrl = urlParts.toString();

async function setup() {
    console.log('🔌 Connecting to Postgres to check database existence...');
    const client = new Client({ connectionString: postgresUrl });

    try {
        await client.connect();

        // Check if database exists
        const res = await client.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [targetDbName]);

        if (res.rowCount === 0) {
            console.log(`✨ Database '${targetDbName}' does not exist. Creating...`);
            await client.query(`CREATE DATABASE "${targetDbName}"`);
            console.log(`✅ Database '${targetDbName}' created.`);
        } else {
            console.log(`ℹ️  Database '${targetDbName}' already exists.`);
        }
    } catch (err) {
        console.error('❌ Error checking/creating database:', err);
        // If connection failed, maybe password is wrong or postgres is not running.
        // Or user provided a URL that points to the target DB but user privileges prevent creating DBs.
        // We will proceed to migration attempt anyway, in case DB exists.
    } finally {
        await client.end();
    }

    // Now connect to the target database and run migrations
    console.log(`🚀 Connecting to '${targetDbName}' to run migrations...`);
    const dbClient = new Client({ connectionString: DB_URL });

    try {
        await dbClient.connect();

        const migrationsDir = path.join(__dirname, '../migrations');
        const files = fs.readdirSync(migrationsDir).sort();

        console.log(`Found ${files.length} migration files.`);

        for (const file of files) {
            if (file.endsWith('.sql')) {
                console.log(`Running ${file}...`);
                const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
                try {
                    await dbClient.query(sql);
                    console.log(`✅ ${file} executed successfully.`);
                } catch (e: any) {
                    console.error(`❌ Error executing ${file}:`, e.message);
                    // Decide whether to stop or continue. Usually stop.
                    // But for idempotent scripts (CREATE IF NOT EXISTS), we might continue?
                    // Let's stop to be safe.
                    process.exit(1);
                }
            }
        }

        console.log('🎉 All migrations completed successfully!');
    } catch (err) {
        console.error('❌ Error running migrations:', err);
        process.exit(1);
    } finally {
        await dbClient.end();
    }
}

setup();
