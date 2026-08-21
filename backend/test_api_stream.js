const axios = require('axios');
const jwt = require('jsonwebtoken');
require('dotenv').config();

async function run() {
  try {
    const token = jwt.sign(
      { id: '2a58b9fd-a732-4a7a-b6ef-1ffa43bd968c' },
      process.env.JWT_SECRET || 'supersecretkey',
      { expiresIn: '1h' }
    );

    const res = await axios({
      method: 'post',
      url: 'http://localhost:4000/api/generate/stream',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      data: {
        topic: "AI in Healthcare",
        description: "AI in Healthcare is big.",
        content_type: "linkedin_short",
        keywords: ["ai", "healthcare"],
        hook_text: "Imagine a world where..."
      },
      responseType: 'stream'
    });

    res.data.on('data', (chunk) => {
      console.log('CHUNK:', chunk.toString());
    });

    res.data.on('end', () => {
      console.log('END OF STREAM');
    });

    res.data.on('error', (err) => {
      console.error('STREAM ERROR:', err);
    });

  } catch(e) {
    console.error('ERROR:', e.response?.data || e.message);
  }
}
run();
