const { Client } = require('pg');
const axios = require('axios');

async function test() {
    const client = new Client({ connectionString: 'postgresql://postgres:nopass%401@localhost:5432/creatorpulse' });
    await client.connect();
    const res = await client.query(`SELECT upstream_id FROM drafts WHERE status='published' AND upstream_status='live' ORDER BY updated_at DESC LIMIT 1`);
    if (res.rowCount === 0) { console.log('No live embedded post'); return; }
    const urn = res.rows[0].upstream_id;
    console.log('URN:', urn);
    
    try {
        const embed = await axios.get(`https://www.linkedin.com/embed/feed/update/${urn}`);
        const html = embed.data;
        
        // Let's use generic regex to try picking out reaction and comment counts from LinkedIn embed page.
        // It's typically inside an aria-label like "15 Like" or data-tracking-control-name or similar text like `"numLikes":15`
        const likesMatch = html.match(/"numLikes":(\d+)/) || html.match(/>(\d+)\s+Likes?</i);
        const commentsMatch = html.match(/"numComments":(\d+)/) || html.match(/>(\d+)\s+Comments?</i);
        
        console.log('LIKES:', likesMatch ? likesMatch[1] : 0);
        console.log('COMMENTS:', commentsMatch ? commentsMatch[1] : 0);
        
        // Backup: extract all numbers before "Like" and "Comment"
        const likeBackup = html.match(/([\d,]+)\s*(?:Reactions?|Likes?)/i);
        const commentBackup = html.match(/([\d,]+)\s*Comments?/i);
        console.log('Backup LIKES:', likeBackup ? likeBackup[1] : 0);
        console.log('Backup COMMENTS:', commentBackup ? commentBackup[1] : 0);
    } catch (e) {
        console.error(e.message);
    }
    client.end();
}
test();
