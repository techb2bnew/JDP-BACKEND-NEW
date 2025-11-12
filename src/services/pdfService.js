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
    
      const templatePath = path.join(__dirname, '../templates/estimateTemplate.html');
      const templateSource = fs.readFileSync(templatePath, 'utf8');
      
   
      const template = handlebars.compile(templateSource);
      
    
      let calculatedSubtotal = 0;
      let calculatedTaxAmount = 0;
      let calculatedTotal = 0;

    
      if (estimateData.items && Array.isArray(estimateData.items)) {
        calculatedSubtotal = estimateData.items.reduce((sum, item) => {
          const amount = parseFloat(item.amount) || 0;
          console.log(`Item: ${item.item || 'N/A'}, Amount: ${amount}`);
          return sum + amount;
        }, 0);
        console.log(`Calculated Subtotal from items: ${calculatedSubtotal}`);
      }


      if (estimateData.additionalCosts && Array.isArray(estimateData.additionalCosts)) {
        const additionalTotal = estimateData.additionalCosts.reduce((sum, cost) => {
          const amount = parseFloat(cost.amount) || 0;
          console.log(`Additional Cost: ${cost.description || 'N/A'}, Amount: ${amount}`);
          return sum + amount;
        }, 0);
        calculatedSubtotal += additionalTotal;
        console.log(`Additional costs total: ${additionalTotal}`);
      }

     
      const taxPercentage = parseFloat(estimateData.taxPercentage) || 0;
      calculatedTaxAmount = (calculatedSubtotal * taxPercentage) / 100;

   
      calculatedTotal = calculatedSubtotal + calculatedTaxAmount;

      console.log(`Final Calculation - Subtotal: ${calculatedSubtotal}, Tax: ${calculatedTaxAmount}, Total: ${calculatedTotal}`);
      console.log(`Input Data - Subtotal: ${estimateData.subtotal}, Tax: ${estimateData.taxAmount}, Total: ${estimateData.total}`);

      
      const templateData = {
        estimateNumber: estimateData.estimateNumber || estimateData.invoice_number || 'INV-2025-001',
        estimateDate: estimateData.estimateDate || new Date().toLocaleDateString(),
        customerName: estimateData.customerName || 'Customer Name',
        customerAddress: estimateData.customerAddress || 'Address',
        billToAddress: estimateData.billToAddress || undefined, 
        poNumber: estimateData.poNumber || 'N/A',
        projectName: estimateData.projectName || 'Project Name',
        dueDate: estimateData.dueDate || undefined,
        items: estimateData.items || [],
        additionalCosts: estimateData.additionalCosts || [],
        subtotal: calculatedSubtotal.toFixed(2),
        taxAmount: calculatedTaxAmount.toFixed(2), 
        total: calculatedTotal.toFixed(2), 
        paymentsCredits: estimateData.paymentsCredits || undefined,
        balanceDue: estimateData.balanceDue || undefined,
        rep: estimateData.rep || undefined,
        notes: estimateData.notes || [
          'JDP WILL REQUIRE HALF DOWN UPON SIGNED ESTIMATE',
          'JDP is not responsible for repair of lamps & landscaping, house owner utilities including cables, sprinkler systems, television or telephone cables, etc. that may be cut or damaged during installation. Price are subject to change prior to receipt of down payment.'
        ],
        email: estimateData.email || 'jen@jdpelectric.us',
        phone: estimateData.phone || '952-449-1088'
      };
      
     
      const html = template(templateData);
      
     
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
      
 
      await page.setContent(html, { 
        waitUntil: 'networkidle0',
        timeout: 30000
      });
      
    
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
