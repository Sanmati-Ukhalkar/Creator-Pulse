import pool from '../src/config/database';
import { aiService } from '../src/services/ai.service';

const USER_ID = 'b32da2bf-ac3a-4ab4-91f0-59148cade337';

(async () => {
    try {
        console.log("Fetching latest scraped content...");
        const latestContent = await pool.query(
            `SELECT raw_content FROM ingested_contents 
             WHERE user_id = $1 
             ORDER BY published_at DESC 
             LIMIT 50`,
            [USER_ID]
        );

        if (latestContent.rowCount === 0) {
            console.error("No content found!");
            process.exit(1);
        }

        const rawTexts = latestContent.rows.reduce<string[]>((acc, row) => {
            if (row.raw_content && row.raw_content.length > 50) {
                acc.push(row.raw_content);
            }
            return acc;
        }, []);

        console.log(`Sending ${rawTexts.length} articles to AI Service...`);
        const aiResponse = await aiService.analyzeTrends({ raw_texts: rawTexts });
        
        console.log("AI Response topics count:", aiResponse.topics.length);
        
        const savedTopics = [];
        for (const topicData of aiResponse.topics) {
            const topicInsert = await pool.query(
                `INSERT INTO topics (user_id, title, description, keywords, trend_score, confidence_score, is_trending, created_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
                 RETURNING *`,
                [USER_ID, topicData.topic, topicData.description, topicData.keywords || [], topicData.score || 0, topicData.confidence_score || 80, (topicData.score || 0) >= 75]
            );
            savedTopics.push(topicInsert.rows[0]);
        }
        console.log(`Successfully saved ${savedTopics.length} topics to DB`);
    } catch (err) {
        console.error("Error saving to DB:", err);
    } finally {
        process.exit(0);
    }
})();
