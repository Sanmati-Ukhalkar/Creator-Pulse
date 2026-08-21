const axios = require('axios');
const jwt = require('jsonwebtoken');

async function run() {
  try {
    const { Pool } = require('pg');
    require('dotenv').config();
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });

    const userId = '2a58b9fd-a732-4a7a-b6ef-1ffa43bd968c';

    const latestContent = await pool.query(
        `SELECT raw_content FROM ingested_contents 
         WHERE user_id = $1 
         ORDER BY published_at DESC 
         LIMIT 50`,
        [userId]
    );

    const rawTexts = latestContent.rows.reduce((acc, row) => {
        if (row.raw_content && row.raw_content.length > 50) {
            acc.push(row.raw_content);
        }
        return acc;
    }, []);

    console.log(`Found ${rawTexts.length} texts`);

    if (rawTexts.length === 0) return;

    console.log("Sending to AI service...");
    const aiResponse = await axios.post(`http://127.0.0.1:8000/analyze-trends`, {
        raw_texts: rawTexts
    }, {
        headers: {
            'X-API-Key': process.env.AI_SERVICE_KEY || 'dev-secret-key',
            'Content-Type': 'application/json'
        }
    });

    console.log("AI Response:", aiResponse.data);

    pool.end();
  } catch (e) {
    console.error("ERROR:", e.response ? e.response.data : e.message);
  }
}
run();
