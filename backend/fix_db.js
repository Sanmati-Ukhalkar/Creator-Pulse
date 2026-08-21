const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:LOkBSScR4wqigGim@db.qpsmgcsbabgfncwrypmb.supabase.co:5432/postgres' });

async function fix() {
  await client.connect();
  try {
    console.log('Dropping bad constraint...');
    await client.query("ALTER TABLE platform_connections DROP CONSTRAINT platform_connections_user_id_fkey;");
    console.log('Adding correct constraint to public.users...');
    await client.query("ALTER TABLE platform_connections ADD CONSTRAINT platform_connections_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;");
    console.log('Success!');
  } catch(e) {
    console.error('ERROR:', e.message);
  } finally {
    await client.end();
  }
}
fix();
