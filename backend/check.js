const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres' });
pool.query("SELECT id, metadata FROM drafts WHERE content_type = 'carousel' ORDER BY created_at DESC LIMIT 5")
  .then(res => console.log(JSON.stringify(res.rows, null, 2)))
  .catch(console.error)
  .finally(() => pool.end());
