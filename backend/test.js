const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:LOkBSScR4wqigGim@db.qpsmgcsbabgfncwrypmb.supabase.co:5432/postgres' });

async function test() {
  await client.connect();
  try {
    const res = await client.query(`
        INSERT INTO platform_connections (
            user_id, platform, platform_user_id, platform_username, 
            access_token, refresh_token, token_expires_at, is_active, 
            last_sync_at, platform_data
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (user_id, platform) DO UPDATE SET
            platform_user_id = EXCLUDED.platform_user_id,
            platform_username = EXCLUDED.platform_username,
            access_token = EXCLUDED.access_token,
            refresh_token = EXCLUDED.refresh_token,
            token_expires_at = EXCLUDED.token_expires_at,
            is_active = EXCLUDED.is_active,
            last_sync_at = EXCLUDED.last_sync_at,
            platform_data = EXCLUDED.platform_data
    `, [
        '2a58b9fd-a732-4a7a-b6ef-1ffa43bd968c', 'linkedin', '123', 'test', 'acc', 'ref', '2026-06-25T12:00:00Z', true, '2026-06-25T12:00:00Z', '{}'
    ]);
    console.log('SUCCESS');
  } catch(e) {
    console.error('ERROR:', e.message);
    console.error('DETAIL:', e.detail);
    console.error('HINT:', e.hint);
  } finally {
    await client.end();
  }
}
test();
