const { Client } = require('pg');

async function setupLocalDb() {
  const client = new Client({
    connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
  });
  await client.connect();
  try {
    console.log("Adding missing/unmigrated columns to local database tables...");

    // 1. users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    // 2. scheduled_posts table
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.scheduled_posts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        platform TEXT NOT NULL,
        content JSONB NOT NULL DEFAULT '{}'::jsonb,
        scheduled_at TIMESTAMPTZ NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        error_message TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    // 3. published_posts table
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.published_posts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        platform TEXT NOT NULL,
        platform_post_id TEXT NOT NULL,
        content TEXT NOT NULL,
        published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        status TEXT NOT NULL DEFAULT 'published',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    // 4. platform_connections table
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.platform_connections (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        platform TEXT NOT NULL,
        platform_user_id TEXT NOT NULL,
        platform_username TEXT NOT NULL,
        access_token TEXT NOT NULL,
        refresh_token TEXT,
        token_expires_at TIMESTAMPTZ NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        last_sync_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        platform_data JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT uq_user_platform UNIQUE (user_id, platform)
      );
    `);

    // 5. listening_queries table
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.listening_queries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        query_string TEXT NOT NULL,
        source_platform TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    // 6. Alter carousel_jobs to add updated_at and error_message
    await client.query(`
      ALTER TABLE public.carousel_jobs 
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        ADD COLUMN IF NOT EXISTS error_message TEXT;
    `);
    console.log("  - Altered carousel_jobs");

    // 7. Alter carousel_slides to add title, body, and visual_hint
    await client.query(`
      ALTER TABLE public.carousel_slides 
        ADD COLUMN IF NOT EXISTS title TEXT,
        ADD COLUMN IF NOT EXISTS body TEXT,
        ADD COLUMN IF NOT EXISTS visual_hint TEXT;
    `);
    console.log("  - Altered carousel_slides");

    console.log("🎉 Local Database Table Alterations Complete!");
  } catch (e) {
    console.error("Error setting up local DB tables:", e.message);
  } finally {
    await client.end();
  }
}

setupLocalDb();
