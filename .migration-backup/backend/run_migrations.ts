import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

const pool = new Pool({
  connectionString: 'postgresql://postgres:nopass@1@localhost:5432/creatorpulse'
});

async function run() {
  const migrations = [
    '009_delivery.sql'
  ];

  for (const file of migrations) {
    const filePath = path.join(__dirname, 'migrations', file);
    if (!fs.existsSync(filePath)) {
      console.log(`Skipping ${file} — not found`);
      continue;
    }
    const sql = fs.readFileSync(filePath, 'utf8');
    try {
      await pool.query(sql);
      console.log(`✅ Applied: ${file}`);
    } catch (err: any) {
      console.log(`⚠️  ${file}: ${err.message}`);
    }
  }

  await pool.end();
}

run().catch(console.error);
