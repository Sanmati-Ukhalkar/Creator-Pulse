import { env } from '../src/config/env';
import pool from '../src/config/database';
import { scraperController } from '../src/controllers/scraper.controller';
import { Request, Response } from 'express';

// Mock Express Request/Response
const mockRequest = (body: any, userId: string) => ({
    body,
    user: { id: userId, email: 'test@example.com' }
}) as unknown as Request;

const mockResponse = () => {
    const res: any = {};
    res.status = (code: number) => {
        res.statusCode = code;
        return res;
    };
    res.json = (data: any) => {
        console.log('Response JSON:', JSON.stringify(data, null, 2));
        return res;
    };
    return res as Response;
};

async function runTest() {
    console.log('--- Starting Scraper Test ---');

    // 1. Create Test User
    console.log('Creating test user...');
    const userRes = await pool.query(`
        INSERT INTO users (email, password_hash) 
        VALUES ('scraper_test@example.com', 'hash')
        ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
        RETURNING id
    `);
    const userId = userRes.rows[0].id;
    console.log('Test User ID:', userId);

    try {
        // 2. Validate RSS
        console.log('\n1. Testing RSS Validation...');
        const req1 = mockRequest({ url: 'https://techcrunch.com/feed/' }, userId);
        await scraperController.validateRss(req1, mockResponse());

        // 3. Create Test Source (needed for foreign key if importTweet creates relation?)
        // scraperController.importTweet uses source_id. Table ingested_contents has FK to sources(id).
        // I need a source.
        console.log('\nCreating test source...');
        const sourceRes = await pool.query(`
            INSERT INTO sources (user_id, source_name, source_type, source_url)
            VALUES ($1, 'Test Source', 'twitter', 'https://twitter.com/jack')
            RETURNING id
        `, [userId]);
        const sourceId = sourceRes.rows[0].id;

        // 4. Import Tweet
        console.log('\n2. Testing Tweet Import...');
        const req2 = mockRequest({
            source_id: sourceId,
            user_id: userId,
            tweet_url: 'https://twitter.com/jack/status/20'
        }, userId);
        await scraperController.importTweet(req2, mockResponse());

        // 5. Check DB
        console.log('\nVerifying DB...');
        const count = await pool.query('SELECT count(*) FROM ingested_contents WHERE user_id = $1', [userId]);
        console.log('Ingested Contents Count:', count.rows[0].count);

    } catch (err) {
        console.error('Test failed:', err);
    } finally {
        // Cleanup? Optional.
        console.log('\n--- Test Complete ---');
        pool.end();
    }
}

runTest().catch(console.error);
