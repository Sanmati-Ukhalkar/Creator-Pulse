require('dotenv').config();
const linkedinService = require('./dist/services/linkedin.service').linkedinService;
const path = require('path');

async function testPost() {
    try {
        const token = process.env.LINKEDIN_ACCESS_TOKEN || 'test-token';
        const docPath = path.join(__dirname, '..', 'storage', 'carousel_exports', '746c271a-6d5d-407d-aca2-80c50219ab72.pdf');
        
        console.log('Testing document post...', docPath);
        const res = await linkedinService.createPost(
            'sanmati', // mock urn
            token,
            'Test Document Post',
            null,
            { path: docPath, name: 'test.pdf' }
        );
        console.log('Result:', res);
    } catch (err) {
        console.error('Error:', err.message);
        if (err.response) {
            console.error('Response Data:', err.response.data);
        }
    }
}
testPost();
