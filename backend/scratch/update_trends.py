import asyncio
import asyncpg

async def main():
    d = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
    conn = await asyncpg.connect(d)
    
    # Update some topics to be trending so the UI populates
    # Let's just update the top 5 most recent topics
    await conn.execute("""
        UPDATE topics 
        SET trend_score = 85, confidence_score = 90, is_trending = true 
        WHERE id IN (
            SELECT id FROM topics 
            ORDER BY created_at DESC 
            LIMIT 5
        )
    """)
    print("Updated 5 recent topics to be trending!")
    await conn.close()

asyncio.run(main())
