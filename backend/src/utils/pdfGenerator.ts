import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { logger } from './logger';

export interface SlideData {
    title: string;
    body: string;
    slide_order: number;
}

/**
 * Generates a basic PDF carousel from text slides.
 * Returns the absolute path to the generated PDF.
 */
export async function generateCarouselPdf(jobId: string, slides: SlideData[]): Promise<string> {
    return new Promise((resolve, reject) => {
        try {
            // Ensure the exports directory exists
            const exportsDir = path.join(__dirname, '..', '..', '..', 'storage', 'carousel_exports');
            if (!fs.existsSync(exportsDir)) {
                fs.mkdirSync(exportsDir, { recursive: true });
            }

            const fileName = `${jobId}.pdf`;
            const pdfPath = path.join(exportsDir, fileName);

            // PDF is typically 1080x1080 for LinkedIn carousels, which is roughly 792x792 points (1 point = 1/72 inch)
            // But we can just use a standard square dimension like 800x800
            const doc = new PDFDocument({
                size: [800, 800],
                margin: 50,
                autoFirstPage: false
            });

            const stream = fs.createWriteStream(pdfPath);
            doc.pipe(stream);

            // Sort slides by order
            const sortedSlides = [...slides].sort((a, b) => a.slide_order - b.slide_order);

            sortedSlides.forEach((slide, index) => {
                doc.addPage();
                
                // Background
                doc.rect(0, 0, 800, 800).fill('#1E1E2E'); // Dark background

                // Page Number
                doc.fillColor('#6C7086')
                   .fontSize(20)
                   .text(`${index + 1} / ${sortedSlides.length}`, 50, 50, { align: 'right' });

                // Title
                doc.fillColor('#F5E0DC')
                   .fontSize(48)
                   .text(slide.title || '', 80, 200, {
                       width: 640,
                       align: 'left'
                   });

                // Body
                doc.fillColor('#CDD6F4')
                   .fontSize(32)
                   .text(slide.body || '', 80, doc.y + 40, {
                       width: 640,
                       align: 'left',
                       lineGap: 10
                   });
            });

            doc.end();

            stream.on('finish', () => {
                logger.info(`Generated PDF for job ${jobId}`, { pdfPath });
                resolve(fileName); // Return just the filename, frontend expects relative path
            });

            stream.on('error', (err) => {
                logger.error(`Error writing PDF for job ${jobId}`, { error: err.message });
                reject(err);
            });
        } catch (error) {
            logger.error(`Error in generateCarouselPdf`, { error });
            reject(error);
        }
    });
}
