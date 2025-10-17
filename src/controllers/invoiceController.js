import { Estimate } from '../models/Estimate.js';
import { successResponse, errorResponse, validationErrorResponse } from '../helpers/responseHelper.js';
import { s3, BUCKET_NAME } from '../config/s3.js';
import { PDFService } from '../services/pdfService.js';
import { EstimateService } from '../services/estimateService.js';
import { sendEmailWithAttachment } from '../email/emailConfig.js';

export class InvoiceController {
  static async sendInvoiceToCustomer(req, reply) {
    try {
      const { estimateId } = req.params;
      const estimateData = req.body;

      if (!estimateId) {
        return reply.status(400).send(validationErrorResponse(['Estimate ID is required']));
      }

      const estimateIdNum = parseInt(estimateId);
      if (isNaN(estimateIdNum)) {
        return reply.status(400).send(validationErrorResponse(['Estimate ID must be a valid number']));
      }

      // Get estimate details from database
      const estimate = await Estimate.findById(estimateIdNum);
      if (!estimate) {
        return reply.status(404).send(errorResponse('Estimate not found', 404));
      }

      // Get customer email from payload or database
      const customerEmail = estimateData.customerEmail || estimate.customer?.email;
      if (!customerEmail) {
        return reply.status(400).send(errorResponse('Customer email not found in payload or database', 400));
      }

      // Prepare estimate data for PDF generation with proper totals
      const pdfData = {
        ...estimateData,
        estimateNumber: estimate.invoice_number || estimateData.estimateNumber,
        invoice_number: estimate.invoice_number || estimateData.estimateNumber,
        customerName: estimateData.customerName || estimate.customer?.customer_name || 'Customer',
        customerAddress: estimateData.customerAddress || `${estimate.customer?.company_name || ''} ${estimate.customer?.address || ''}`.trim(),
        billToAddress: estimateData.billToAddress || estimate.bill_to_address,
        projectName: estimateData.projectName || estimate.job?.job_title || 'Project',
        poNumber: estimateData.poNumber || estimate.po_number || 'N/A',
        dueDate: estimateData.dueDate || estimate.due_date || new Date().toLocaleDateString(),
        items: estimateData.items || [],
        additionalCosts: estimateData.additionalCosts || [],
        taxPercentage: estimateData.taxPercentage || 0
      };

      // Generate PDF from template
      const pdfBuffer = await PDFService.generateEstimatePDF(pdfData);

      // Use actual invoice number from database or generate one
      const invoiceNumber = estimate.invoice_number || estimateData.estimateNumber || await Estimate.generateInvoiceNumber();
      
      // Always PDF now
      const s3FileName = `invoices/${estimateId}/${invoiceNumber}.pdf`;

      // Upload to S3
      const uploadParams = {
        Bucket: BUCKET_NAME,
        Key: s3FileName,
        Body: pdfBuffer,
        ContentType: 'application/pdf'
      };

      const s3Result = await s3.upload(uploadParams).promise();
      const invoiceLink = s3Result.Location;

      // Save invoice link to database
      try {
        await EstimateService.updateEstimate(estimateIdNum, { 
          invoice_link: invoiceLink,
          invoice_sent_at: new Date(),
          invoice_sent_to: customerEmail,
          status: estimateData.status || 'sent'
        }, req.user?.id);
        console.log('Invoice link and status saved to database successfully');
      } catch (dbError) {
        console.log('Database save failed (columns may not exist):', dbError.message);
        // Continue even if database save fails
      }

      // Send email with PDF attachment
      const emailData = {
        to: customerEmail,
        subject: `Estimate #${invoiceNumber} - JDP Electric`,
        html: `
          <h2>Dear ${estimateData.customerName || estimate.customer?.customer_name || 'Valued Customer'},</h2>
          <p>Please find attached your estimate from JDP Electric.</p>
          <p><strong>Estimate Number:</strong> ${invoiceNumber}</p>
          <p><strong>Total Amount:</strong> $${estimateData.total || estimate.total_amount || '0.00'}</p>
          <br>
          <p>Thank you for choosing JDP Electric!</p>
          <p>Best regards,<br>JDP Electric Team</p>
        `,
        attachments: [
          {
            filename: `${invoiceNumber}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf'
          }
        ]
      };

      // Send email
      await sendEmailWithAttachment(emailData);

      return reply.status(200).send(successResponse({
        estimateId: estimateIdNum,
        customerEmail: customerEmail,
        invoiceNumber: invoiceNumber,
        invoiceLink: invoiceLink,
        s3Key: s3Result.Key,
        status: estimateData.status || 'sent',
        emailSent: true,
        uploadedAt: new Date().toISOString()
      }, 'Estimate PDF generated, uploaded to S3, and sent via email successfully'));

    } catch (error) {
      console.error('Error in sendInvoiceToCustomer:', error);
      return reply.status(500).send(errorResponse(`Failed to process estimate: ${error.message}`, 500));
    }
  }
}
