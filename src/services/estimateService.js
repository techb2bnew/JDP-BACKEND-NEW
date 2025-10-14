import { Estimate } from '../models/Estimate.js';
import { supabase } from '../config/database.js';

export class EstimateService {
  static async createEstimate(estimateData, createdByUserId) {
    try {
      const estimateWithCreator = {
        ...estimateData,
        created_by: createdByUserId
      };

      const estimate = await Estimate.create(estimateWithCreator);
      
      return {
        estimate,
        message: 'Estimate created successfully'
      };
    } catch (error) {
      throw error;
    }
  }

  static async searchEstimates(filters, pagination) {
    try {
      const result = await Estimate.search(filters, pagination);
      return {
        estimates: result.estimates,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages
        }
      };
    } catch (error) {
      throw error;
    }
  }

  static async getEstimates(page = 1, limit = 10, filters = {}) {
    try {
      const result = await Estimate.findAll(filters, { page, limit });
      return result;
    } catch (error) {
      throw error;
    }
  }

  static async getEstimateById(estimateId) {
    try {
      const estimate = await Estimate.findById(estimateId);
      if (!estimate) {
        throw new Error('Estimate not found');
      }
      return estimate;
    } catch (error) {
      throw error;
    }
  }

  static async updateEstimate(estimateId, updateData, updatedByUserId) {
    try {
      const estimate = await Estimate.update(estimateId, updateData);
      
      return {
        estimate,
        message: 'Estimate updated successfully'
      };
    } catch (error) {
      throw error;
    }
  }

  static async deleteEstimate(estimateId) {
    try {
      console.log(`Starting deleteEstimate for ID: ${estimateId}`);
      
      // First, try to find the estimate using simple method
      let estimate;
      try {
        estimate = await Estimate.simpleFindById(estimateId);
        if (!estimate) {
          console.log(`Estimate not found for ID: ${estimateId}`);
          throw new Error('Estimate not found');
        }
        console.log(`Found estimate: ${estimate.id}, title: ${estimate.estimate_title}`);
      } catch (findError) {
        console.error('Error finding estimate:', findError);
        throw new Error(`Failed to find estimate: ${findError.message}`);
      }

      // Try to check relationships, but don't fail if this step has issues
      let relationshipCheck = { canDelete: true, relationships: [] };
      try {
        console.log('Checking estimate relationships...');
        relationshipCheck = await Estimate.checkEstimateRelationships(estimateId);
        console.log('Relationship check result:', relationshipCheck);
      } catch (relationshipError) {
        console.error('Error checking relationships, proceeding with deletion:', relationshipError);
        // Continue with deletion even if relationship check fails
        relationshipCheck = { canDelete: true, relationships: [] };
      }
      
      // if (!relationshipCheck.canDelete) {
      //   const relationshipMessages = relationshipCheck.relationships.map(rel => rel.message).join(', ');
      //   console.log(`Cannot delete estimate due to relationships: ${relationshipMessages}`);
      //   throw new Error(`Cannot delete this estimate because it has related data: ${relationshipMessages}. Please remove all related data first.`);
      // }

      // Proceed with deletion
      try {
        console.log('Proceeding with estimate deletion...');
        await Estimate.delete(estimateId);
        console.log('Estimate deleted successfully');
      } catch (deleteError) {
        console.error('Error deleting estimate, trying simple delete:', deleteError);
        try {
          // Try simple delete as fallback
          await Estimate.simpleDelete(estimateId);
          console.log('Estimate deleted successfully using simple method');
        } catch (simpleDeleteError) {
          console.error('Simple delete also failed:', simpleDeleteError);
          throw new Error(`Failed to delete estimate: ${deleteError.message}`);
        }
      }

      return {
        message: `Estimate "${estimate.estimate_title}" deleted successfully`,
        deletedEstimate: {
          id: estimate.id,
          estimate_title: estimate.estimate_title,
          total_amount: estimate.total_amount,
          status: estimate.status
        }
      };
    } catch (error) {
      console.error('Error in deleteEstimate service:', error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      throw error;
    }
  }

  static async getEstimateStats() {
    try {
      const stats = await Estimate.getStats();
      return stats;
    } catch (error) {
      throw error;
    }
  }

  static async getEstimatesByJob(jobId, page = 1, limit = 10) {
    try {
      const result = await Estimate.getEstimatesByJob(jobId, page, limit);
      return result;
    } catch (error) {
      throw error;
    }
  }

  static async getEstimatesByCustomer(customerId, page = 1, limit = 10) {
    try {
      const result = await Estimate.getEstimatesByCustomer(customerId, page, limit);
      return result;
    } catch (error) {
      throw error;
    }
  }

  // Additional Cost Methods
  static async createAdditionalCost(additionalCostData, createdByUserId) {
    try {
      const costWithCreator = {
        ...additionalCostData,
        created_by: createdByUserId
      };

      const additionalCost = await Estimate.createAdditionalCost(costWithCreator);
      
      // Recalculate total costs
      await Estimate.calculateTotalCosts(additionalCostData.estimate_id);
      
      return {
        additionalCost,
        message: 'Additional cost added successfully'
      };
    } catch (error) {
      throw error;
    }
  }

  static async getAdditionalCosts(estimateId) {
    try {
      const additionalCosts = await Estimate.getAdditionalCosts(estimateId);
      return additionalCosts;
    } catch (error) {
      throw error;
    }
  }

  static async updateAdditionalCost(additionalCostId, updateData, updatedByUserId) {
    try {
      const additionalCost = await Estimate.updateAdditionalCost(additionalCostId, updateData);
      
      // Recalculate total costs
      await Estimate.calculateTotalCosts(additionalCost.estimate_id);
      
      return {
        additionalCost,
        message: 'Additional cost updated successfully'
      };
    } catch (error) {
      throw error;
    }
  }

  static async deleteAdditionalCost(additionalCostId) {
    try {
      const { data: additionalCost, error } = await supabase
        .from('estimate_additional_costs')
        .select('*')
        .eq('id', additionalCostId)
        .single();

      if (error || !additionalCost) {
        throw new Error('Additional cost not found');
      }

      await Estimate.deleteAdditionalCost(additionalCostId);
      
      await Estimate.calculateTotalCosts(additionalCost.estimate_id);

      return {
        message: `Additional cost "${additionalCost.description}" deleted successfully`,
        deletedCost: {
          id: additionalCost.id,
          description: additionalCost.description,
          amount: additionalCost.amount
        }
      };
    } catch (error) {
      throw error;
    }
  }

  static async calculateTotalCosts(estimateId) {
    try {
      const costs = await Estimate.calculateTotalCosts(estimateId);
      return costs;
    } catch (error) {
      throw error;
    }
  }

  static async sendInvoiceToCustomer(estimateId) {
    try {
      const estimate = await Estimate.findById(estimateId);
      
      if (!estimate) {
        throw new Error('Estimate not found');
      }

      if (!estimate.customer?.email) {
        throw new Error('Customer email not found');
      }

      // Generate invoice template
      const invoiceHtml = await EstimateService.generateInvoiceTemplate(estimate);
      
      // Send email
      const { sendEmail } = await import('../email/emailConfig.js');
      const invoiceTypeDisplay = estimate.invoice_type === 'down_payment' ? 'Down Payment' : 
                                estimate.invoice_type === 'proposal_invoice' ? 'Proposal Invoice' :
                                estimate.invoice_type === 'progressive_invoice' ? 'Progressive Invoice' :
                                estimate.invoice_type === 'final_invoice' ? 'Final Invoice' : 'Invoice';
      
      await sendEmail({
        to: estimate.customer.email,
        subject: `${invoiceTypeDisplay} ${estimate.invoice_number} - ${estimate.job?.job_title || 'Project'}`,
        html: invoiceHtml,
        text: `${invoiceTypeDisplay} ${estimate.invoice_number} for ${estimate.job?.job_title || 'Project'}. Please see attached invoice details.`
      });

      // Update estimate status to 'sent' if it was 'draft'
      if (estimate.status === 'draft') {
        await Estimate.update(estimateId, { status: 'sent' });
      }

      return {
        message: `Invoice sent successfully to ${estimate.customer.email}`,
        invoiceNumber: estimate.invoice_number,
        customerEmail: estimate.customer.email,
        status: 'sent'
      };
    } catch (error) {
      throw error;
    }
  }

  static async generateInvoiceTemplate(estimate) {
    try {
      const currentDate = new Date().toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric'
      });

      const dueDate = estimate.due_date 
        ? new Date(estimate.due_date).toLocaleDateString('en-US', {
            month: '2-digit',
            day: '2-digit',
            year: 'numeric'
          })
        : 'N/A';

      // Parse estimate data - check for both materials and products
      let materials = [];
      if (estimate.materials) {
        if (Array.isArray(estimate.materials)) {
          materials = estimate.materials;
        } else if (typeof estimate.materials === 'string') {
          try {
            materials = JSON.parse(estimate.materials);
            if (!Array.isArray(materials)) {
              materials = [];
            }
          } catch (e) {
            materials = [];
          }
        }
      } else if (estimate.products && Array.isArray(estimate.products)) {
        // Convert products to materials format
        materials = estimate.products.map(product => ({
          sku: product.jdp_sku || product.supplier_sku || 'N/A',
          description: product.product_name || product.description || 'N/A',
          quantity: 1, // Default quantity since products don't have quantity in this structure
          unit_price: product.total_cost || product.unit_cost || product.jdp_price || 0
        }));
      }

      // Calculate totals from materials only
      const materialsTotal = materials.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
      const subtotal = materialsTotal;
      const taxPercentage = 8; // Default tax percentage
      const taxAmount = subtotal * taxPercentage / 100;
      const total = subtotal + taxAmount;

      const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>${estimate.invoice_type === 'estimate' ? 'Estimate' : 'Invoice'} ${estimate.invoice_number}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            color: #333;
            background-color: #fff;
            max-width: 800px;
            margin: 0 auto;
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 20px;
            padding: 20px 0;
        }
        .logo-section {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
        }
        .logo {
            font-size: 48px;
            font-weight: bold;
            color: #1a365d;
            margin-bottom: 8px;
            letter-spacing: -2px;
        }
        .logo .d {
            position: relative;
            display: inline-block;
        }
        .logo .d::after {
            content: "⚡";
            position: absolute;
            right: -8px;
            top: -5px;
            font-size: 20px;
        }
        .phone {
            font-size: 14px;
            color: #666;
        }
        .invoice-box {
            background-color: #4a5568;
            color: white;
            padding: 15px;
            border-radius: 4px;
            min-width: 200px;
        }
        .invoice-type {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 8px;
        }
        .invoice-date {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            font-size: 14px;
        }
        .invoice-number {
            display: flex;
            justify-content: space-between;
            font-size: 14px;
        }
        .to-section {
            background-color: #4a5568;
            color: white;
            padding: 10px 15px;
            margin-bottom: 20px;
            font-weight: bold;
            font-size: 14px;
        }
        .customer-info {
            margin-bottom: 20px;
            line-height: 1.6;
            font-size: 14px;
        }
        .project-details {
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;
            font-size: 14px;
        }
        .po-number, .project {
            width: 48%;
        }
        .po-label, .project-label {
            font-weight: bold;
            margin-bottom: 5px;
        }
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        .items-table th {
            background-color: #4a5568;
            color: white;
            padding: 12px 8px;
            text-align: left;
            font-weight: bold;
            font-size: 14px;
        }
        .items-table td {
            padding: 12px 8px;
            border-bottom: 1px solid #e2e8f0;
            font-size: 14px;
        }
        .qty-col { width: 60px; }
        .item-col { width: 200px; }
        .description-col { width: 300px; }
        .rate-col { width: 80px; }
        .total-col { width: 80px; }
        .subtotal {
            text-align: right;
            margin-top: 10px;
            font-size: 16px;
            font-weight: bold;
        }
        .project-section {
            margin: 20px 0;
            font-size: 14px;
        }
        .project-title {
            font-weight: bold;
            margin-bottom: 5px;
        }
        .thank-you {
            margin: 10px 0;
            font-size: 14px;
        }
        .disclaimer {
            font-size: 12px;
            color: #666;
            line-height: 1.4;
            margin: 20px 0;
        }
        .grand-total {
            text-align: center;
            margin: 20px 0;
            font-size: 24px;
            font-weight: bold;
            color: #1a365d;
        }
        .contact-info {
            text-align: center;
            margin: 20px 0;
            font-size: 14px;
            color: #666;
        }
        .footer-buttons {
            display: flex;
            justify-content: space-between;
            margin-top: 30px;
            padding: 15px 0;
            border-top: 1px solid #e2e8f0;
        }
        .btn {
            padding: 10px 20px;
            border: 1px solid #4a5568;
            background: white;
            cursor: pointer;
            border-radius: 4px;
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .btn.primary {
            background-color: #4a5568;
            color: white;
        }
        .close-btn {
            margin-right: auto;
        }
        .send-btn {
            margin-left: auto;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo-section">
            <div class="logo">J<span class="d">D</span>P</div>
            <div class="phone">952-449-1088</div>
        </div>
        <div class="invoice-box">
            <div class="invoice-type">${estimate.invoice_type === 'estimate' ? 'Estimate' : 'Invoice'}</div>
            <div class="invoice-date">
                <span>${estimate.invoice_type === 'estimate' ? 'Estimate' : 'Invoice'}</span>
                <span>${currentDate}</span>
            </div>
            <div class="invoice-number">
                <span>${estimate.invoice_type === 'estimate' ? 'Estimate' : 'Invoice'} #</span>
                <span>${estimate.invoice_number || 'EST-2025-006'}</span>
            </div>
        </div>
    </div>

    <div class="to-section">To</div>
    
    <div class="customer-info">
        <div><strong>${estimate.customer?.company_name || estimate.customer?.customer_name || 'ABC Corporation'}</strong></div>
        <div>${estimate.customer?.address || '123 Business Ave, New York'}</div>
    </div>

    <div class="project-details">
        <div class="po-number">
            <div class="po-label">P.O. No.</div>
            <div>${estimate.billing_address_po_number || ''}</div>
        </div>
        <div class="project">
            <div class="project-label">Project</div>
            <div>${estimate.job?.job_title || 'Electrical Panel Installation'}</div>
        </div>
    </div>

    <table class="items-table">
        <thead>
            <tr>
                <th class="qty-col">Qty</th>
                <th class="item-col">Item</th>
                <th class="description-col">Description</th>
                <th class="rate-col">Rate</th>
                <th class="total-col">Total</th>
            </tr>
        </thead>
        <tbody>
            ${materials.length > 0 ? materials.map(item => `
            <tr>
                <td>${item.quantity || 1}</td>
                <td>${item.sku || 'LED Ceiling Light Fixture - 24W'}</td>
                <td>${item.description || 'Energy-efficient LED ceiling fixture 24W power consumption, 3000K warm white Dimmable with standard dimmer switches UL listed, 5-year manufacturer warranty'}</td>
                <td>$${(item.unit_price || 74).toFixed(2)}</td>
                <td>$${((item.quantity || 1) * (item.unit_price || 74)).toFixed(2)}</td>
            </tr>
            `).join('') : `
            <tr>
                <td>1</td>
                <td>LED Ceiling Light Fixture - 24W</td>
                <td>Energy-efficient LED ceiling fixture 24W power consumption, 3000K warm white Dimmable with standard dimmer switches UL listed, 5-year manufacturer warranty</td>
                <td>$74.00</td>
                <td>$74.00</td>
            </tr>
            <tr>
                <td>1</td>
                <td>Electrical Panel Upgrade</td>
                <td>Professional electrical panel installation and upgrade service</td>
                <td>$400.00</td>
                <td>$400.00</td>
            </tr>
            `}
        </tbody>
    </table>

    <div class="subtotal">Total $${total.toFixed(2)}</div>

    <div class="project-section">
        <div class="project-title">Project: ${estimate.job?.job_title || 'Electrical Panel Installation'}</div>
        <div class="thank-you">Thank you for your business!</div>
    </div>

    <div class="disclaimer">
        JDP is not responsible for repair of lamps & landscaping, house owner utilities including cables, sprinkler systems, television or telephone cables, etc. that may be cut or damaged during installation. Price are subject to change prior to receipt of down payment.
    </div>

    <div class="grand-total">Total $${total.toFixed(2)}</div>

    <div class="contact-info">
        EMAIL: jen@jdpelectric.us 952-445-1088
    </div>

    <div class="footer-buttons">
        <div class="btn close-btn">✕ Close</div>
        <div class="btn">🖨️ Print</div>
        <div class="btn primary">✈️ Send Invoice</div>
    </div>
</body>
</html>
      `;

      return html;
    } catch (error) {
      throw new Error(`Failed to generate invoice template: ${error.message}`);
    }
  }
}

