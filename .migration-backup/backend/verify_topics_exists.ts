import { Pool } from 'pg';

const pool = new Pool({
    connectionString: 'postgresql://postgres:nopass@1@localhost:5432/creatorpulse'
});

async function run() {
    const result = await pool.query(`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' ORDER BY table_name
  `);
    console.log('📋 Tables in DB:', result.rows.map(r => r.table_name).join(', '));
    await pool.end();
}

run().catch(console.error);
