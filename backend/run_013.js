const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  try {
    const file = path.join(__dirname, 'migrations', '013_user_niche_settings.sql');
    const sql = fs.readFileSync(file, 'utf-8');
    await pool.query(sql);
    console.log("Success: 013 executed");
  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
run();
