import asyncio
import asyncpg

async def test_conn():
    print("Connecting...")
    try:
        conn = await asyncpg.connect("postgresql://postgres:postgres@127.0.0.1:54322/postgres", timeout=5)
        print("Connected successfully!")
        res = await conn.fetch("SELECT version()")
        print("Version:", res)
        await conn.close()
    except Exception as e:
        print("Error:", e)

asyncio.run(test_conn())
