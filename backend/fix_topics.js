const {Pool}=require('pg'); require('dotenv').config(); const pool=new Pool({connectionString:process.env.DATABASE_URL}); 
async function run() {
  await pool.query("ALTER TABLE topics ALTER COLUMN source_content_id DROP NOT NULL;");
  console.log("Dropped NOT NULL from source_content_id");
  pool.end();
}
run();
