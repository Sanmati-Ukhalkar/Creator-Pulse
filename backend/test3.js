const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:LOkBSScR4wqigGim@db.qpsmgcsbabgfncwrypmb.supabase.co:5432/postgres' });

async function check() {
  await client.connect();
  try {
    const res = await client.query("SELECT conname, pg_get_constraintdef(c.oid) FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid WHERE t.relname = 'platform_connections' AND contype = 'f'");
    console.log(res.rows);
  } finally {
    await client.end();
  }
}
check();
