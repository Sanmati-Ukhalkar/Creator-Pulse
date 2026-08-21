const {Pool}=require('pg'); require('dotenv').config(); const pool=new Pool({connectionString:process.env.DATABASE_URL}); 
async function run() {
  await pool.query("ALTER TABLE sources DROP CONSTRAINT sources_source_type_check;");
  await pool.query("ALTER TABLE sources ADD CONSTRAINT sources_source_type_check CHECK (source_type IN ('twitter', 'rss', 'tags', 'tavily'));");
  console.log("Updated check constraint!");
  pool.end();
}
run();
