const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:LOkBSScR4wqigGim@db.qpsmgcsbabgfncwrypmb.supabase.co:5432/postgres' });
client.connect().then(async () => {
  const res = await client.query("SELECT id, topic, status, created_at FROM carousel_jobs ORDER BY created_at DESC LIMIT 5");
  console.log(JSON.stringify(res.rows, null, 2));
  client.end();
}).catch(console.error);
