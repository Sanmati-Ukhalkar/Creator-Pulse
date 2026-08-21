import asyncio
import asyncpg

async def main():
    d = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
    conn = await asyncpg.connect(d)
    count = await conn.fetchval("SELECT COUNT(*) FROM sources WHERE source_type = 'newsapi'")
    print('Count:', count)
    await conn.close()

asyncio.run(main())
