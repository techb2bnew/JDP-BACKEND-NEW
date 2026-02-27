import { Estimate } from '../models/Estimate.js';
import { supabase } from '../config/database.js';
import {
  createQuickBooksInvoice,
  updateQuickBooksInvoice,
  deleteQuickBooksInvoice,
} from './quickbooksClient.js';

export class EstimateService {
  static async deleteProductFromEstimate(estimateProductId) {
    try {
      const result = await Estimate.deleteProductFromEstimate(estimateProductId);
      return result;
    } catch (error) {
      throw error;
    }
  }

  // Helper: Build QuickBooks invoice payload from estimate
  static async buildQuickBooksInvoicePayload(estimate) {
    // Customer ka qb_customer_id nikaalo
    const { data: customer } = await supabase
      .from('customers')
      .select('qb_customer_id')
      .eq('id', estimate.customer_id)
      .single();

    if (!customer || !customer.qb_customer_id) {
      throw new Error('Customer not found or not synced with QuickBooks. Please sync customer first.');
    }

    // Line items: products + additional costs
    const { data: estimateProducts } = await supabase
      .from('estimate_products')
      .select(`
        product:products(
          product_name,
          jdp_price,
          total_cost,
          description
        )
      `)
      .eq('estimate_id', estimate.id);

    const { data: additionalCosts } = await supabase
      .from('estimate_additional_costs')
      .select('description, amount')
      .eq('estimate_id', estimate.id);

    const lineItems = [];

    // Products ko line items me convert karo
    if (estimateProducts && estimateProducts.length > 0) {
      estimateProducts.forEach((ep) => {
        const product = ep.product;
        if (product) {
          lineItems.push({
            DetailType: 'SalesItemLineDetail',
            Amount: parseFloat(product.total_cost || product.jdp_price || 0),
            SalesItemLineDetail: {
              ItemRef: {
                value: '1', // Default service item (QuickBooks me pehle se hona chahiye)
                name: product.product_name || 'Service',
              },
              UnitPrice: parseFloat(product.jdp_price || 0),
              Qty: 1,
            },
            Description: product.product_name || product.description || 'Product',
          });
        }
      });
    }

    // Additional costs ko line items me convert karo
    if (additionalCosts && additionalCosts.length > 0) {
      additionalCosts.forEach((cost) => {
        lineItems.push({
          DetailType: 'SalesItemLineDetail',
          Amount: parseFloat(cost.amount || 0),
          SalesItemLineDetail: {
            ItemRef: {
              value: '1',
              name: 'Service',
            },
            UnitPrice: parseFloat(cost.amount || 0),
            Qty: 1,
          },
          Description: cost.description || 'Additional Cost',
        });
      });
    }

    // Agar koi line item nahi hai, ek default add karo
    if (lineItems.length === 0) {
      lineItems.push({
        DetailType: 'SalesItemLineDetail',
        Amount: parseFloat(estimate.total_amount || 0),
        SalesItemLineDetail: {
          ItemRef: {
            value: '1',
            name: 'Service',
          },
          UnitPrice: parseFloat(estimate.total_amount || 0),
          Qty: 1,
        },
        Description: estimate.estimate_title || estimate.description || 'Invoice Item',
      });
    }

    // QuickBooks invoice payload
    const qbPayload = {
      CustomerRef: {
        value: customer.qb_customer_id,
      },
      DocNumber: estimate.invoice_number || undefined,
      TxnDate: estimate.issue_date || estimate.estimate_date || new Date().toISOString().split('T')[0],
      DueDate: estimate.due_date || undefined,
      Line: lineItems,
      TotalAmt: parseFloat(estimate.total_amount || 0),
    };

    return qbPayload;
  }

  static async createEstimate(estimateData, createdByUserId) {
    try {
      
      const cleanedData = {
        ...estimateData,
        created_by: createdByUserId
      };

      
      if (cleanedData.total_amount === '' || cleanedData.total_amount === null) {
        cleanedData.total_amount = 0;
      }
      if (cleanedData.payment_credits === '' || cleanedData.payment_credits === null) {
        cleanedData.payment_credits = null;
      }
      if (cleanedData.balance_due === '' || cleanedData.balance_due === null) {
        cleanedData.balance_due = null;
      }

     
      if (cleanedData.valid_until === '' || cleanedData.valid_until === null) {
        cleanedData.valid_until = null;
      }
      if (cleanedData.issue_date === '' || cleanedData.issue_date === null) {
        cleanedData.issue_date = null;
      }
      if (cleanedData.due_date === '' || cleanedData.due_date === null) {
        cleanedData.due_date = null;
      }

     
      if (cleanedData.bill_to_address === '') {
        cleanedData.bill_to_address = null;
      }
      if (cleanedData.po_number === '') {
        cleanedData.po_number = null;
      }
      if (cleanedData.notes === '') {
        cleanedData.notes = null;
      }
      if (cleanedData.rep === '') {
        cleanedData.rep = null;
      }
      if (cleanedData.description === '') {
        cleanedData.description = null;
      }

      console.log('Cleaned estimate data:', cleanedData);

      const estimate = await Estimate.create(cleanedData);

      // QuickBooks me invoice create karo (agar customer_id hai aur qb_customer_id mapped hai)
      if (estimate.customer_id) {
        try {
          // Pehle check karo customer ka qb_customer_id hai ya nahi
          const { data: customer, error: customerError } = await supabase
            .from('customers')
            .select('qb_customer_id, customer_name')
            .eq('id', estimate.customer_id)
            .single();

          if (customerError) {
            console.error('Error fetching customer:', customerError);
          }

          if (!customer || !customer.qb_customer_id) {
            console.warn(`QuickBooks sync skipped: Customer "${customer?.customer_name || estimate.customer_id}" is not synced with QuickBooks. Please sync customer first using POST /api/quickbooks/customers/sync-to-db`);
          } else {
            console.log(`Creating QuickBooks invoice for customer ID ${estimate.customer_id} with QB Customer ID: ${customer.qb_customer_id}`);
            
            const qbPayload = await EstimateService.buildQuickBooksInvoicePayload(estimate);
            console.log('QuickBooks invoice payload:', JSON.stringify(qbPayload, null, 2));
            
            const qbResponse = await createQuickBooksInvoice(qbPayload);
            console.log('QuickBooks invoice response:', JSON.stringify(qbResponse, null, 2));
            
            const qbInvoice = qbResponse.Invoice;
            const qbInvoiceId = qbInvoice?.Id;

            console.log('QuickBooks Invoice ID received:', qbInvoiceId);

            // qb_invoice_id ko estimate me update karo
            if (qbInvoiceId) {
              const { error: updateError } = await supabase
                .from('estimates')
                .update({ qb_invoice_id: qbInvoiceId })
                .eq('id', estimate.id);
              
              if (updateError) {
                console.error('Error updating qb_invoice_id:', updateError);
              } else {
                console.log(`Successfully updated estimate ${estimate.id} with qb_invoice_id: ${qbInvoiceId}`);
              }
              
              // Updated estimate return karo
              const { data: updatedEstimate } = await supabase
                .from('estimates')
                .select('*')
                .eq('id', estimate.id)
                .single();
              
              if (updatedEstimate) {
                estimate.qb_invoice_id = updatedEstimate.qb_invoice_id;
              }
            } else {
              console.warn('QuickBooks invoice created but no Invoice ID in response');
            }
          }
        } catch (qbError) {
          // QuickBooks error ko log karo but estimate creation fail mat karo
          console.error('QuickBooks invoice creation failed:', qbError.message);
          console.error('Error stack:', qbError.stack);
          if (qbError.response) {
            console.error('QuickBooks API error response:', JSON.stringify(qbError.response.data, null, 2));
          }
          // User ko warning de sakte ho but estimate create ho gaya hai
        }
      }
      
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
      
      const cleanedData = { ...updateData };

      
      if (cleanedData.total_amount === '' || cleanedData.total_amount === null) {
        cleanedData.total_amount = 0;
      }
      if (cleanedData.payment_credits === '' || cleanedData.payment_credits === null) {
        cleanedData.payment_credits = null;
      }
      if (cleanedData.balance_due === '' || cleanedData.balance_due === null) {
        cleanedData.balance_due = null;
      }


      if (cleanedData.valid_until === '' || cleanedData.valid_until === null) {
        cleanedData.valid_until = null;
      }
      if (cleanedData.issue_date === '' || cleanedData.issue_date === null) {
        cleanedData.issue_date = null;
      }
      if (cleanedData.due_date === '' || cleanedData.due_date === null) {
        cleanedData.due_date = null;
      }

     
      if (cleanedData.bill_to_address === '') {
        cleanedData.bill_to_address = null;
      }
      if (cleanedData.po_number === '') {
        cleanedData.po_number = null;
      }
      if (cleanedData.notes === '') {
        cleanedData.notes = null;
      }
      if (cleanedData.rep === '') {
        cleanedData.rep = null;
      }
      if (cleanedData.description === '') {
        cleanedData.description = null;
      }

      console.log('Cleaned update data:', cleanedData);

      const estimate = await Estimate.update(estimateId, cleanedData);

      // QuickBooks me invoice update karo (agar qb_invoice_id hai)
      if (estimate.qb_invoice_id) {
        try {
          const qbPayload = await EstimateService.buildQuickBooksInvoicePayload(estimate);
          await updateQuickBooksInvoice(estimate.qb_invoice_id, qbPayload);
        } catch (qbError) {
          console.error('QuickBooks invoice update failed:', qbError.message);
          // Error ko log karo but estimate update successful hai
        }
      }
      
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
     
      
      
      let estimate;
      try {
        estimate = await Estimate.simpleFindById(estimateId);
        if (!estimate) {
          
          throw new Error('Estimate not found');
        }
      } catch (findError) {
        console.error('Error finding estimate:', findError);
        throw new Error(`Failed to find estimate: ${findError.message}`);
      }

     
      let relationshipCheck = { canDelete: true, relationships: [] };
      try {
        console.log('Checking estimate relationships...');
        relationshipCheck = await Estimate.checkEstimateRelationships(estimateId);
        console.log('Relationship check result:', relationshipCheck);
      } catch (relationshipError) {
        console.error('Error checking relationships, proceeding with deletion:', relationshipError);
        
        relationshipCheck = { canDelete: true, relationships: [] };
      }
      
      // QuickBooks me invoice delete/inactive karo (agar qb_invoice_id hai)
      if (estimate.qb_invoice_id) {
        try {
          await deleteQuickBooksInvoice(estimate.qb_invoice_id);
        } catch (qbError) {
          console.error('QuickBooks invoice delete failed:', qbError.message);
          // Error ko log karo but estimate delete continue karo
        }
      }
      
      
      try {
        console.log('Proceeding with estimate deletion...');
        await Estimate.delete(estimateId);
        console.log('Estimate deleted successfully');
      } catch (deleteError) {
        console.error('Error deleting estimate, trying simple delete:', deleteError);
        try {
          
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

  
  static async createAdditionalCost(additionalCostData, createdByUserId) {
    try {
      const costWithCreator = {
        ...additionalCostData,
        created_by: createdByUserId
      };

      const additionalCost = await Estimate.createAdditionalCost(costWithCreator);
      

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


}

