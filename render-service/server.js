const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const os = require('os');
const dotenv = require('dotenv');

dotenv.config();

/**
 * Resolve Chrome executable path from the Puppeteer user cache.
 * puppeteer v22+ uses ~/.cache/puppeteer/chrome/
 * Falls back to letting puppeteer auto-detect.
 */
function findChromeExecPath() {
    // Check if puppeteer can resolve it itself first
    try {
        const execPath = puppeteer.executablePath();
        if (execPath && fs.existsSync(execPath)) return execPath;
    } catch (_) {}

    // Manual fallback: scan the user puppeteer cache
    const cacheDir = path.join(os.homedir(), '.cache', 'puppeteer', 'chrome');
    if (!fs.existsSync(cacheDir)) return null;
    const versions = fs.readdirSync(cacheDir).sort().reverse(); // newest first
    for (const ver of versions) {
        const candidate = path.join(cacheDir, ver, 'chrome-win64', 'chrome.exe');
        if (fs.existsSync(candidate)) return candidate;
        const candidateMac = path.join(cacheDir, ver, 'chrome-mac-arm64', 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing');
        if (fs.existsSync(candidateMac)) return candidateMac;
        const candidateLinux = path.join(cacheDir, ver, 'chrome-linux64', 'chrome');
        if (fs.existsSync(candidateLinux)) return candidateLinux;
    }
    return null;
}

const CHROME_EXEC = findChromeExecPath();
if (CHROME_EXEC) {
    console.log(`Using Chrome at: ${CHROME_EXEC}`);
} else {
    console.warn('Chrome executable not found! Puppeteer will attempt auto-detect.');
}

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

        const launchOptions = {
            headless: 'new',
            args: LAUNCH_ARGS
        };
        if (CHROME_EXEC) launchOptions.executablePath = CHROME_EXEC;
        browser = await puppeteer.launch(launchOptions);
        
        const page = await browser.newPage();
        
        // Strict Network request interception (SSRF protection)
        await page.setRequestInterception(true);
        page.on('request', (request) => {
            const url = request.url();
            // Allow local resources: data URIs, about:, blank pages used by puppeteer
            if (url.startsWith('data:') || url.startsWith('about:') || url.startsWith('file:')) {
                request.continue();
            } else {
                // Block all external network requests — templates must be self-contained
                request.abort();
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
