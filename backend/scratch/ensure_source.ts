import pool from '../src/config/database';
import { logger } from '../src/utils/logger';

const USER_ID = 'b32da2bf-ac3a-4ab4-91f0-59148cade337';

(async () => {
  try {
    const { rowCount } = await pool.query('SELECT 1 FROM sources WHERE user_id = $1', [USER_ID]);
    
    if (rowCount === 0) {
      await pool.query(
        `INSERT INTO sources (user_id, source_type, source_name, source_url, source_config, is_active, sync_status)
         VALUES ($1, 'rss', 'TechCrunch AI', 'https://techcrunch.com/category/artificial-intelligence/feed/', '{}'::jsonb, true, 'pending')`,
        [USER_ID]
      );
      console.log('Demo RSS source created for user');
    } else {
      console.log('User already has sources');
    }
  } catch (error) {
    console.error('Error creating source:', error);
  } finally {
    process.exit(0);
  }
})();
