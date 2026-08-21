import asyncio
import asyncpg

async def main():
    d = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
    conn = await asyncpg.connect(d)
    
    await conn.execute("ALTER TABLE topics ALTER COLUMN source_content_id DROP NOT NULL")
    print("Dropped NOT NULL constraint on source_content_id")
    
    await conn.close()

asyncio.run(main())
