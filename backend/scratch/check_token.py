import asyncio
import asyncpg

async def main():
    d = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
    conn = await asyncpg.connect(d)
    row = await conn.fetchrow("SELECT access_token FROM platform_connections WHERE platform = 'linkedin' LIMIT 1")
    print('Token:', row['access_token'])
    await conn.close()

asyncio.run(main())
