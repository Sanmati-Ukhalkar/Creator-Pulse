const {Pool}=require('pg'); require('dotenv').config(); 
const pool=new Pool({connectionString:process.env.DATABASE_URL}); 
async function run() {
  try {
    const userId = '2a58b9fd-a732-4a7a-b6ef-1ffa43bd968c';
    const draftContent = { text: "Mock", hashtags: [], mentions: [] };
    const dbContentType = 'text_post';
    const topic = "AI in Healthcare";

    const draftInsert = await pool.query(
        `INSERT INTO drafts (user_id, platform, content_type, title, content, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, 'draft', NOW(), NOW())
         RETURNING id`,
        [userId, 'linkedin', dbContentType, topic.substring(0, 100), JSON.stringify(draftContent)]
    );
    console.log("Success:", draftInsert.rows[0].id);
  } catch(e) {
    console.error("DB Error:", e);
  } finally {
    pool.end();
  }
}
run();
