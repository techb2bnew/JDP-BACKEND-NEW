import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';
import handlebars from 'handlebars';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class PDFService {
  static async generateEstimatePDF(estimateData) {
    try {
      // Read the HTML template
      const templatePath = path.join(__dirname, '../templates/estimateTemplate.html');
      const templateSource = fs.readFileSync(templatePath, 'utf8');
      
      // Compile the template
      const template = handlebars.compile(templateSource);
      
      // Prepare data for template
      const templateData = {
        estimateNumber: estimateData.estimateNumber || estimateData.invoice_number || 'INV-2025-001',
        estimateDate: estimateData.estimateDate || new Date().toLocaleDateString(),
        customerName: estimateData.customerName || 'Customer Name',
        customerAddress: estimateData.customerAddress || 'Address',
        billToAddress: estimateData.billToAddress || null, // Will be null if not provided
        poNumber: estimateData.poNumber || 'N/A',
        projectName: estimateData.projectName || 'Project Name',
        items: estimateData.items || [],
        subtotal: estimateData.subtotal || '0.00',
        total: estimateData.total || '0.00',
        notes: estimateData.notes || [
          'JDP WILL REQUIRE HALF DOWN UPON SIGNED ESTIMATE',
          'JDP is not responsible for repair of lamps & landscaping, house owner utilities including cables, sprinkler systems, television or telephone cables, etc. that may be cut or damaged during installation. Price are subject to change prior to receipt of down payment.'
        ],
        email: estimateData.email || 'jen@jdpelectric.us',
        phone: estimateData.phone || '952-449-1088'
      };
      
      // Generate HTML
      const html = template(templateData);
      
      // Launch puppeteer with Chrome flags for Linux server
      const browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ],
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined
      });
      
      const page = await browser.newPage();
      
      // Set content with timeout
      await page.setContent(html, { 
        waitUntil: 'networkidle0',
        timeout: 30000
      });
      
      // Generate PDF
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20px',
          right: '20px',
          bottom: '20px',
          left: '20px'
        }
      });
      
      await browser.close();
      
      return pdfBuffer;
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw new Error(`PDF generation failed: ${error.message}`);
    }
  }
}
