const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:LOkBSScR4wqigGim@db.qpsmgcsbabgfncwrypmb.supabase.co:5432/postgres' });

async function check() {
  await client.connect();
  try {
    const res = await client.query("SELECT table_schema FROM information_schema.tables WHERE table_name = 'users'");
    console.log('users schemas:', res.rows);
    
    // Check if the UUID exists in public.users
    const userRes = await client.query("SELECT * FROM public.users WHERE id = '2a58b9fd-a732-4a7a-b6ef-1ffa43bd968c'");
    console.log('user in public:', userRes.rowCount);
    
    const fkRes = await client.query(`
        SELECT
            tc.table_schema, 
            tc.constraint_name, 
            tc.table_name, 
            kcu.column_name, 
            ccu.table_schema AS foreign_table_schema,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name 
        FROM 
            information_schema.table_constraints AS tc 
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
              AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage AS ccu
              ON ccu.constraint_name = tc.constraint_name
              AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name='platform_connections';
    `);
    console.log('platform_connections FKs:', fkRes.rows);
  } finally {
    await client.end();
  }
}
check();
