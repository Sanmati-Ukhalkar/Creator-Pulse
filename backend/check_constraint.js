const {Pool}=require('pg'); require('dotenv').config(); 
const pool=new Pool({connectionString:process.env.DATABASE_URL}); 
async function run() {
  try {
    const res = await pool.query(`
      SELECT pg_get_constraintdef(c.oid) AS constraint_def
      FROM pg_constraint c
      JOIN pg_class t ON c.conrelid = t.oid
      WHERE t.relname = 'drafts' AND c.conname = 'drafts_content_type_check';
    `);
    console.log("Constraint:", res.rows[0].constraint_def);
  } catch(e) {
    console.error("DB Error:", e);
  } finally {
    pool.end();
  }
}
run();
