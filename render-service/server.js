const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const PORT = process.env.RENDER_PORT || 5000;
const STORAGE_PATH = path.join(__dirname, '..', 'storage', 'png_slides');

if (!fs.existsSync(STORAGE_PATH)) {
    fs.mkdirSync(STORAGE_PATH, { recursive: true });
}

// Sandbox configuration for SSRF protection
const LAUNCH_ARGS = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-web-security',
    '--disable-features=IsolateOrigins,site-per-process'
];

app.post('/render', async (req, res) => {
    const { 
        jobId, slideId, headline, subtext, 
        visual_description, layout, color_scheme, font_size, elements 
    } = req.body;

    if (!jobId || !slideId) {
        return res.status(400).json({ error: 'jobId and slideId are required' });
    }

    let browser = null;
    try {
        const templatePath = path.join(__dirname, 'templates', `${color_scheme || 'dark_modern'}.html`);
        if (!fs.existsSync(templatePath)) {
            return res.status(404).json({ error: `Template ${color_scheme} not found` });
        }
        
        const htmlTemplate = fs.readFileSync(templatePath, 'utf8');

        browser = await puppeteer.launch({
            headless: 'new',
            args: LAUNCH_ARGS
        });
        
        const page = await browser.newPage();
        
        // Strict Network request interception (SSRF protection)
        await page.setRequestInterception(true);
        page.on('request', (request) => {
            // Block all external network requests, templates must be self-contained
            if (!request.url().startsWith('data:')) {
                request.abort();
            } else {
                request.continue();
            }
        });

        // Set viewport for 1080x1080 at 2x resolution = 2160x2160
        await page.setViewport({ width: 1080, height: 1080, deviceScaleFactor: 2 });
        
        const contentHtml = htmlTemplate
            .replace('{{HEADLINE}}', escapeHtml(headline || ''))
            .replace('{{SUBTEXT}}', escapeHtml(subtext || ''))
            .replace('{{LAYOUT}}', layout || 'centered_bold')
            .replace('{{FONT_SIZE}}', font_size || 'medium')
            .replace('{{ELEMENTS_META}}', escapeHtml(JSON.stringify(elements || [])));

        await page.setContent(contentHtml, { waitUntil: 'load', timeout: 15000 });
        
        const filename = `${jobId}_${slideId}.png`;
        const outputPath = path.join(STORAGE_PATH, filename);
        
        await page.screenshot({ path: outputPath, type: 'png' });
        
        res.status(200).json({ success: true, path: outputPath, filename });
    } catch (error) {
        console.error('Render error:', error);
        res.status(500).json({ error: 'Render failed', details: error.message });
    } finally {
        if (browser) await browser.close();
    }
});

function escapeHtml(unsafe) {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

app.listen(PORT, () => {
    console.log(`Render Microservice running on port ${PORT}`);
});
