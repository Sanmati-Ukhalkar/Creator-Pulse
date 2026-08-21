import { Pool } from 'pg';

const pool = new Pool({
    connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
});

async function main() {
    try {
        await pool.query(`
            UPDATE topics 
            SET trend_score = 85, confidence_score = 90, is_trending = true 
            WHERE id IN (
                SELECT id FROM topics 
                ORDER BY created_at DESC 
                LIMIT 5
            )
        `);
        console.log("Updated 5 recent topics to be trending!");
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
main();
