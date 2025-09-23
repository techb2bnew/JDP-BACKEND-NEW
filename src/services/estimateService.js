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
      const estimate = await Estimate.findById(estimateId);
      if (!estimate) {
        throw new Error('Estimate not found');
      }

      // Check if estimate has relationships with other tables
      const relationshipCheck = await Estimate.checkEstimateRelationships(estimateId);
      
      if (!relationshipCheck.canDelete) {
        const relationshipMessages = relationshipCheck.relationships.map(rel => rel.message).join(', ');
        throw new Error(`Cannot delete this estimate because it has related data: ${relationshipMessages}. Please remove all related data first.`);
      }

      await Estimate.delete(estimateId);

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
