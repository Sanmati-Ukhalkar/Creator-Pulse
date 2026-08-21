const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function testRender() {
    const jobId = 'test-job-123';
    const slideId = 'slide-1';
    
    console.log("Triggering render-service...");
    try {
        const res = await axios.post('http://localhost:5000/render', {
            jobId,
            slideId,
            headline: "This is a test headline",
            subtext: "Testing the render service",
            color_scheme: "dark_modern",
            layout: "centered_bold"
        });
        
        console.log("Render API Response:", res.data);
        
        const storagePath = path.join(__dirname, '..', 'storage', 'png_slides');
        const expectedFile = path.join(storagePath, `${jobId}_${slideId}.png`);
        
        console.log("Checking if file exists at:", expectedFile);
        if (fs.existsSync(expectedFile)) {
            console.log("SUCCESS! File generated correctly.");
        } else {
            console.log("FAILED! File not found.");
        }
    } catch (e) {
        console.error("Error calling render-service:", e.message);
    }
}

testRender();
