const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const users = await pool.query('SELECT id, niche, target_audience FROM users');
  console.log('Users:', users.rows);
  const queries = await pool.query('SELECT * FROM listening_queries');
  console.log('Queries:', queries.rows);
  const contents = await pool.query('SELECT count(*) FROM ingested_contents');
  console.log('Ingested count:', contents.rows);
  pool.end();
}
run();
