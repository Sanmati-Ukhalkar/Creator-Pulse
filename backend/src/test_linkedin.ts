import pool from './config/database';
import axios from 'axios';

async function run() {
    try {
        const urn = 'urn:li:share:7443555139682185216';
        
        try {
            const res = await axios.get(`https://www.linkedin.com/embed/feed/update/${urn}`, {
            });
            console.log('STATUS:', res.status);
            console.log('Includes post not found?', res.data.includes('Post not found') || res.data.includes('been deleted'));
        } catch (e: any) {
            console.error('EMBED ERROR:', e.response?.status);
            console.error('EMBED ERROR DATA (snippet):', e.response?.data?.substring(0, 200));
        }

    } catch (e: any) {
        console.error('Main Error:', e.message);
    } finally {
        pool.end();
    }
}
run();
