const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function runMigrations() {
  try {
    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(migrationsDir)
                    .filter(f => f.endsWith('.sql'))
                    .sort(); // Sorts 000, 001, etc.

    console.log(`Found ${files.length} migration files in ${migrationsDir}`);

    for (const file of files) {
      console.log(`Executing ${file}...`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
      await pool.query(sql);
      console.log(`Success: ${file}`);
    }
    
    // Also run db_updates.sql
    const updatesFile = path.join(__dirname, 'db_updates.sql');
    if (fs.existsSync(updatesFile)) {
      console.log(`Executing db_updates.sql...`);
      const updatesSql = fs.readFileSync(updatesFile, 'utf-8');
      await pool.query(updatesSql);
      console.log(`Success: db_updates.sql`);
    }

    console.log("All migrations executed successfully!");
  } catch (error) {
    console.error("Migration failed:");
    console.error(error);
  } finally {
    pool.end();
  }
}

runMigrations();
