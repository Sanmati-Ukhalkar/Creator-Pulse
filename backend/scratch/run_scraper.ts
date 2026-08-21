import pool from '../src/config/database';
import { logger } from '../src/utils/logger';

const USER_ID = 'b32da2bf-ac3a-4ab4-91f0-59148cade337';

(async () => {
  try {
    const { rowCount } = await pool.query('SELECT 1 FROM sources WHERE user_id = $1 LIMIT 1', [USER_ID]);
    
    if (rowCount > 0) {
      const source = (await pool.query('SELECT id FROM sources WHERE user_id = $1 LIMIT 1', [USER_ID])).rows[0];
      const sourceId = source.id;

      const mockData = [
        {
          title: "The Future of AI in the Creator Economy",
          url: "https://example.com/ai-creator-economy",
          raw: "AI tools are revolutionizing how creators build content. Automation saves time and allows for personalization at scale. Creators who leverage AI will have a significant advantage."
        },
        {
          title: "10 Tips for Better LinkedIn Posts",
          url: "https://example.com/linkedin-tips",
          raw: "To succeed on LinkedIn, you need a strong hook, clear formatting, and engaging content. Use carousels to increase read time and always end with a question to drive comments."
        },
        {
          title: "How to Grow Your Newsletter in 2024",
          url: "https://example.com/newsletter-growth",
          raw: "Building an email list is crucial for creators. You own the audience. Try offering a free lead magnet like a checklist or template to encourage sign-ups."
        },
        {
          title: "The Rise of Short-Form Video",
          url: "https://example.com/short-form-video",
          raw: "Short-form video is dominating social media algorithms. Platforms like TikTok, Reels, and Shorts are prioritizing 15-60 second clips that capture attention immediately."
        },
        {
          title: "Monetizing Your Audience",
          url: "https://example.com/monetization",
          raw: "Don't rely solely on ad revenue. Diversify your income streams with digital products, consulting, sponsorships, and paid communities to build a sustainable creator business."
        }
      ];

      let saved = 0;
      for (const item of mockData) {
        const exists = await pool.query('SELECT id FROM ingested_contents WHERE url = $1 AND user_id = $2', [item.url, USER_ID]);
        if (exists.rowCount === 0) {
          await pool.query(
            `INSERT INTO ingested_contents (user_id, source_id, url, title, raw_content, content_md, published_at, fetched_at, status)
             VALUES ($1, $2, $3, $4, $5, $5, NOW(), NOW(), 'processed')`,
            [USER_ID, sourceId, item.url, item.title, item.raw]
          );
          saved++;
        }
      }
      console.log(`Inserted ${saved} mock ingested contents`);
    } else {
      console.log("No source found for user");
    }
  } catch (error) {
    console.error('Error inserting mock data:', error);
  } finally {
    process.exit(0);
  }
})();
