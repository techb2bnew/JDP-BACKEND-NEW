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
      await sendEmail({
        to: estimate.customer.email,
        subject: `Invoice ${estimate.invoice_number} - ${estimate.job?.job_title || 'Project Invoice'}`,
        html: invoiceHtml,
        text: `Invoice ${estimate.invoice_number} for ${estimate.job?.job_title || 'Project'}. Please see attached invoice details.`
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
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      const dueDate = estimate.due_date 
        ? new Date(estimate.due_date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
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
          unit_price: product.unit_cost || product.total_price || 0
        }));
      }

      let labor = [];
      if (estimate.labor) {
        if (Array.isArray(estimate.labor)) {
          // Convert labor format to template format
          labor = estimate.labor.map(laborItem => ({
            labor_name: laborItem.user?.full_name || 'N/A',
            description: laborItem.trade || 'Labor work',
            hours: laborItem.hours_worked || 0,
            rate: laborItem.hourly_rate || 0
          }));
        } else if (typeof estimate.labor === 'string') {
          try {
            const parsedLabor = JSON.parse(estimate.labor);
            if (Array.isArray(parsedLabor)) {
              labor = parsedLabor;
            }
          } catch (e) {
            labor = [];
          }
        }
      }

      let additionalCosts = [];
      if (estimate.additional_costs_details && Array.isArray(estimate.additional_costs_details)) {
        // Use additional_costs_details if available
        additionalCosts = estimate.additional_costs_details.map(cost => ({
          description: cost.description || 'N/A',
          amount: cost.amount || 0
        }));
      } else if (estimate.additional_costs) {
        if (Array.isArray(estimate.additional_costs)) {
          additionalCosts = estimate.additional_costs;
        } else if (typeof estimate.additional_costs === 'string') {
          try {
            additionalCosts = JSON.parse(estimate.additional_costs);
            if (!Array.isArray(additionalCosts)) {
              additionalCosts = [];
            }
          } catch (e) {
            additionalCosts = [];
          }
        }
      }

      // Use calculated totals if available, otherwise calculate
      let materialsTotal, laborTotal, additionalCostsTotal, subtotal, taxAmount, total;
      
      if (estimate.calculated_totals) {
        materialsTotal = estimate.calculated_totals.materials_cost || 0;
        laborTotal = estimate.calculated_totals.labor_cost || 0;
        additionalCostsTotal = estimate.calculated_totals.additional_costs || 0;
        subtotal = estimate.calculated_totals.subtotal || 0;
        taxAmount = estimate.calculated_totals.tax_amount || 0;
        total = estimate.calculated_totals.total_amount || 0;
      } else {
        // Fallback calculation
        materialsTotal = materials.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
        laborTotal = labor.reduce((sum, item) => sum + (item.hours * item.rate), 0);
        additionalCostsTotal = additionalCosts.reduce((sum, item) => sum + item.amount, 0);
        subtotal = materialsTotal + laborTotal + additionalCostsTotal;
        taxAmount = subtotal * (estimate.tax_percentage || 8) / 100;
        total = subtotal + taxAmount;
      }

      const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Invoice ${estimate.invoice_number}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            color: #333;
            background-color: #fff;
            max-width: 800px;
            margin: 0 auto;
        }
        .header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
            border-bottom: 2px solid #007bff;
            padding-bottom: 20px;
        }
        .invoice-title {
            color: #007bff;
            font-size: 32px;
            font-weight: bold;
            margin: 0 0 20px 0;
        }
        .invoice-details {
            font-size: 14px;
            line-height: 1.5;
        }
        .company-info {
            font-weight: bold;
            font-size: 18px;
            margin-bottom: 10px;
        }
        .company-details {
            font-size: 14px;
            line-height: 1.5;
        }
        .section {
            margin: 20px 0;
            display: flex;
            justify-content: space-between;
        }
        .bill-to, .job-details {
            width: 45%;
        }
        .section-title {
            font-weight: bold;
            margin-bottom: 10px;
            font-size: 16px;
        }
        .line {
            border-top: 1px solid #ddd;
            margin: 20px 0;
        }
        .table-title {
            font-weight: bold;
            margin: 20px 0 10px 0;
            font-size: 16px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        th {
            background-color: #f8f9fa;
            font-weight: bold;
        }
        .totals {
            text-align: right;
            margin-top: 20px;
            width: 300px;
            margin-left: auto;
        }
        .total-row {
            margin: 5px 0;
            font-size: 14px;
            display: flex;
            justify-content: space-between;
        }
        .final-total {
            font-weight: bold;
            font-size: 18px;
            color: #007bff;
            margin-top: 10px;
            border-top: 2px solid #007bff;
            padding-top: 10px;
        }
        .notes-section {
            margin-top: 30px;
            border-top: 1px solid #ddd;
            padding-top: 20px;
        }
        .notes-title, .payment-title {
            font-weight: bold;
            margin-bottom: 10px;
        }
        .payment-terms {
            margin-top: 20px;
            border-top: 1px solid #ddd;
            padding-top: 20px;
        }
    </style>
</head>
<body>
    <div class="header">
        <div>
            <h1 class="invoice-title">INVOICE</h1>
            <div class="invoice-details">
                <div>Invoice #: ${estimate.invoice_number}</div>
                <div>Issue Date: ${currentDate}</div>
                <div>Due Date: ${dueDate}</div>
            </div>
        </div>
        <div>
            <div class="company-info">JDP Corporation</div>
            <div class="company-details">
                <div>1234 Business Street</div>
                <div>City, State 12345</div>
                <div>Phone: (555) 123-4567</div>
                <div>Email: billing@jdpcorp.com</div>
            </div>
        </div>
    </div>

    <div class="section">
        <div class="bill-to">
            <div class="section-title">Bill To:</div>
            <div>${estimate.customer?.customer_name || estimate.customer?.company_name || 'N/A'}</div>
            <div>${estimate.customer?.address || 'N/A'}</div>
            <div>${estimate.customer?.city || ''} ${estimate.customer?.state || ''} ${estimate.customer?.zip_code || ''}</div>
            <div>Phone: ${estimate.customer?.phone || 'N/A'}</div>
            <div>Email: ${estimate.customer?.email || 'N/A'}</div>
        </div>
        <div class="job-details">
            <div class="section-title">Job Details:</div>
            <div>Job ID: ${estimate.job?.id || 'N/A'}</div>
            <div>Project: ${estimate.job?.job_title || 'N/A'}</div>
            <div>Type: ${estimate.invoice_type || 'Invoice'}</div>
        </div>
    </div>

    <div class="line"></div>

    ${materials.length > 0 ? `
    <div class="table-title">Items/Materials</div>
    <table>
        <thead>
            <tr>
                <th>SKU</th>
                <th>Description</th>
                <th>Qty</th>
                <th>Unit Price</th>
                <th>Total</th>
            </tr>
        </thead>
        <tbody>
            ${materials.map(item => `
            <tr>
                <td>${item.sku || 'N/A'}</td>
                <td>${item.description || 'N/A'}</td>
                <td>${item.quantity || 0}</td>
                <td>$${(item.unit_price || 0).toFixed(2)}</td>
                <td>$${((item.quantity || 0) * (item.unit_price || 0)).toFixed(2)}</td>
            </tr>
            `).join('')}
        </tbody>
    </table>
    ` : ''}

    ${labor.length > 0 ? `
    <div class="table-title">Labor</div>
    <table>
        <thead>
            <tr>
                <th>Labor Name</th>
                <th>Description</th>
                <th>Hours</th>
                <th>Rate</th>
                <th>Total</th>
            </tr>
        </thead>
        <tbody>
            ${labor.map(item => `
            <tr>
                <td>${item.labor_name || 'N/A'}</td>
                <td>${item.description || 'N/A'}</td>
                <td>${item.hours || 0}h</td>
                <td>$${(item.rate || 0).toFixed(2)}/h</td>
                <td>$${((item.hours || 0) * (item.rate || 0)).toFixed(2)}</td>
            </tr>
            `).join('')}
        </tbody>
    </table>
    ` : ''}

    ${additionalCosts.length > 0 ? `
    <div class="table-title">Additional Costs</div>
    <table>
        <thead>
            <tr>
                <th>Description</th>
                <th>Amount</th>
            </tr>
        </thead>
        <tbody>
            ${additionalCosts.map(item => `
            <tr>
                <td>${item.description || 'N/A'}</td>
                <td>$${(item.amount || 0).toFixed(2)}</td>
            </tr>
            `).join('')}
        </tbody>
    </table>
    ` : ''}

    <div class="totals">
        <div class="total-row">
            <span>Subtotal:</span>
            <span>$${subtotal.toFixed(2)}</span>
        </div>
        <div class="total-row">
            <span>Tax (${estimate.tax_percentage || 8}%):</span>
            <span>$${taxAmount.toFixed(2)}</span>
        </div>
        <div class="final-total">
            <span>Total Amount:</span>
            <span>$${total.toFixed(2)}</span>
        </div>
    </div>

    <div class="notes-section">
        <div class="notes-title">Notes:</div>
        <div>${estimate.notes || 'Payment received in full. Thank you for your business.'}</div>
    </div>

    <div class="payment-terms">
        <div class="payment-title">Payment Terms:</div>
        <div>Payment is due within ${estimate.payment_terms || '14'} days of invoice date. Late payments may be subject to a 1.5% monthly service charge.</div>
        <div style="margin-top: 10px;">Thank you for your business!</div>
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
