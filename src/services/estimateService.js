import { Estimate } from '../models/Estimate.js';
import { supabase } from '../config/database.js';

export class EstimateService {
  static async deleteProductFromEstimate(estimateProductId) {
    try {
      const result = await Estimate.deleteProductFromEstimate(estimateProductId);
      return result;
    } catch (error) {
      throw error;
    }
  }

  static async createEstimate(estimateData, createdByUserId) {
    try {
      // Clean data - convert empty strings to null for numeric and date fields
      const cleanedData = {
        ...estimateData,
        created_by: createdByUserId
      };

      // Clean numeric fields
      if (cleanedData.total_amount === '' || cleanedData.total_amount === null) {
        cleanedData.total_amount = 0;
      }
      if (cleanedData.payment_credits === '' || cleanedData.payment_credits === null) {
        cleanedData.payment_credits = null;
      }
      if (cleanedData.balance_due === '' || cleanedData.balance_due === null) {
        cleanedData.balance_due = null;
      }

      // Clean date fields
      if (cleanedData.valid_until === '' || cleanedData.valid_until === null) {
        cleanedData.valid_until = null;
      }
      if (cleanedData.issue_date === '' || cleanedData.issue_date === null) {
        cleanedData.issue_date = null;
      }
      if (cleanedData.due_date === '' || cleanedData.due_date === null) {
        cleanedData.due_date = null;
      }

      // Clean string fields that should be null instead of empty string
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
      // Clean data - convert empty strings to null for numeric and date fields
      const cleanedData = { ...updateData };

      // Clean numeric fields
      if (cleanedData.total_amount === '' || cleanedData.total_amount === null) {
        cleanedData.total_amount = 0;
      }
      if (cleanedData.payment_credits === '' || cleanedData.payment_credits === null) {
        cleanedData.payment_credits = null;
      }
      if (cleanedData.balance_due === '' || cleanedData.balance_due === null) {
        cleanedData.balance_due = null;
      }

      // Clean date fields
      if (cleanedData.valid_until === '' || cleanedData.valid_until === null) {
        cleanedData.valid_until = null;
      }
      if (cleanedData.issue_date === '' || cleanedData.issue_date === null) {
        cleanedData.issue_date = null;
      }
      if (cleanedData.due_date === '' || cleanedData.due_date === null) {
        cleanedData.due_date = null;
      }

      // Clean string fields that should be null instead of empty string
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


}

