/**
 * End-to-End Carousel Pipeline Test
 * 1. Authenticate (Register if user doesn't exist, otherwise Login)
 * 2. Trigger carousel generation
 * 3. Poll status until done/failed
 * 4. Verify storage files on disk
 */
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:4000';
const EMAIL = 'sanmatijain@gmail.com';
const PASS = 'sanmatijain';

async function testCarousel() {
    // ── Step 1: Login or Register ─────────────────────────────────────────────
    console.log('Step 1: Authenticating...');
    let token;
    try {
        // Attempt login
        console.log('Attempting login...');
        const loginRes = await axios.post(`${BASE}/api/auth/login`, { email: EMAIL, password: PASS });
        token = loginRes.data.token;
        console.log('✅ Login successful!');
    } catch (e) {
        console.log('Login failed (user probably does not exist). Attempting registration...');
        try {
            const regRes = await axios.post(`${BASE}/api/auth/register`, {
                firstName: 'Sanmati',
                lastName: 'Jain',
                email: EMAIL,
                password: PASS
            });
            token = regRes.data.token;
            console.log('✅ Registration and login successful!');
        } catch (regErr) {
            console.error('❌ Authentication failed completely:', regErr.response?.data || regErr.message);
            return;
        }
    }

    const headers = { Authorization: `Bearer ${token}` };

    // ── Step 2: Trigger Carousel Generation ──────────────────────────────────
    console.log('\nStep 2: Triggering carousel generation...');
    let jobId;
    try {
        const res = await axios.post(`${BASE}/api/carousel/generate-smart`, {
            source_text: "5 tips to grow your LinkedIn audience:\n1. Be consistent\n2. Engage others\n3. Write actionable advice\n4. Use visuals\n5. Track analytics",
            slide_count: 5,
            template: 'dark_modern',
            idempotency_key: 'e2e-test-' + Date.now()
        }, { headers });
        jobId = res.data.jobId;
        console.log('✅ Job created:', jobId);
    } catch (e) {
        console.error('❌ Carousel creation failed:', e.response?.data || e.message);
        return;
    }

    // ── Step 3: Poll status ───────────────────────────────────────────────────
    console.log('\nStep 3: Polling status...');
    let status = 'queued';
    let retries = 0;
    const MAX = 120; // 120 * 3s = 6 min

    while (!['done', 'failed'].includes(status) && retries < MAX) {
        await new Promise(r => setTimeout(r, 3000));
        try {
            const sr = await axios.get(`${BASE}/api/carousel/${jobId}`, { headers });
            const newStatus = sr.data.job?.status;
            if (newStatus !== status) {
                status = newStatus;
                console.log(`\n  [${new Date().toISOString()}] ➜ ${status}`);
            } else {
                process.stdout.write('.');
            }
        } catch (e) {
            console.error('\nPoll error:', e.message);
        }
        retries++;
    }

    console.log(`\n\nFinal status: ${status}`);

    // ── Step 4: Verify storage ────────────────────────────────────────────────
    console.log('\nStep 4: Checking storage...');
    const storageRoot = path.join(__dirname, '..', 'storage');

    const pngDir = path.join(storageRoot, 'png_slides');
    const pngs = fs.existsSync(pngDir) ? fs.readdirSync(pngDir).filter(f => f.startsWith(jobId)) : [];
    console.log(`  PNG slides (${pngs.length}):`);
    pngs.forEach(f => console.log(`    ✅ ${f}`));

    const exportDir = path.join(storageRoot, 'carousel_exports');
    const exports = fs.existsSync(exportDir) ? fs.readdirSync(exportDir).filter(f => f.startsWith(jobId)) : [];
    console.log(`  Export files (${exports.length}):`);
    exports.forEach(f => console.log(`    ✅ ${f}`));

    if (status === 'done') {
        console.log('\n🎉 CAROUSEL PIPELINE FULLY WORKING!');
    } else {
        console.log('\n❌ Job did not complete successfully.');
    }
}

testCarousel().catch(e => console.error('Fatal:', e.message));
