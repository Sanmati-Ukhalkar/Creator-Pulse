const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function testInsert() {
  try {
    const userId = '4999f617-338b-4a5d-8b04-8395f1ab8ef8';
    
    // First let's make sure the user exists!
    await pool.query(`INSERT INTO users (id, email, password_hash) VALUES ($1, 'test@example.com', 'hash') ON CONFLICT DO NOTHING`, [userId]);

    await pool.query(
      `INSERT INTO platform_connections 
      (user_id, platform, platform_user_id, platform_username, access_token, refresh_token, token_expires_at, is_active, last_sync_at, platform_data)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (user_id, platform) 
      DO UPDATE SET 
          platform_user_id = EXCLUDED.platform_user_id,
          platform_username = EXCLUDED.platform_username,
          access_token = EXCLUDED.access_token,
          refresh_token = EXCLUDED.refresh_token,
          token_expires_at = EXCLUDED.token_expires_at,
          is_active = EXCLUDED.is_active,
          last_sync_at = EXCLUDED.last_sync_at,
          platform_data = EXCLUDED.platform_data`,
      [
          userId,
          'linkedin',
          'sub_123',
          'John Doe',
          'access_enc',
          'refresh_enc',
          new Date().toISOString(),
          true,
          new Date().toISOString(),
          { email: 'john@example.com' }
      ]
    );
    console.log("Insert successful!");
  } catch (error) {
    console.error("Insert failed:", error);
  } finally {
    pool.end();
  }
}

testInsert();
