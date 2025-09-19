import { supabase } from '../config/database.js';

export class Estimate {
  static async create(estimateData) {
    try {
      const { data, error } = await supabase
        .from("estimates")
        .insert([estimateData])
        .select(`
          *,
          job:jobs!estimates_job_id_fkey(
            id,
            job_title,
            job_type,
            status
          ),
          customer:customers!estimates_customer_id_fkey(
            id,
            customer_name,
            company_name,
            email,
            phone
          ),
          created_by_user:users!estimates_created_by_fkey(
            id,
            full_name,
            email
          )
        `)
        .single();

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  static async findAll(filters = {}, pagination = {}) {
    try {
      let query = supabase
        .from("estimates")
        .select(`
          *,
          job:jobs!estimates_job_id_fkey(
            id,
            job_title,
            job_type,
            status
          ),
          customer:customers!estimates_customer_id_fkey(
            id,
            customer_name,
            company_name,
            email,
            phone
          ),
          created_by_user:users!estimates_created_by_fkey(
            id,
            full_name,
            email
          )
        `, { count: 'exact' });

      // Apply filters
      if (filters.job_id) {
        query = query.eq("job_id", filters.job_id);
      }
      if (filters.customer_id) {
        query = query.eq("customer_id", filters.customer_id);
      }
      if (filters.status) {
        query = query.eq("status", filters.status);
      }
      if (filters.priority) {
        query = query.eq("priority", filters.priority);
      }
      if (filters.service_type) {
        query = query.eq("service_type", filters.service_type);
      }
      if (filters.estimate_date) {
        query = query.eq("estimate_date", filters.estimate_date);
      }

      if (pagination.page && pagination.limit) {
        const offset = (pagination.page - 1) * pagination.limit;
        query = query.range(offset, offset + pagination.limit - 1);
      }

      const sortBy = pagination.sortBy || 'created_at';
      const sortOrder = pagination.sortOrder || 'desc';
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      const { data, error, count } = await query;

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return {
        estimates: data || [],
        total: count || 0,
        page: pagination.page || 1,
        limit: pagination.limit || 10,
        totalPages: pagination.limit ? Math.ceil((count || 0) / pagination.limit) : 1
      };
    } catch (error) {
      throw error;
    }
  }

  static async findById(estimateId) {
    try {
      const { data, error } = await supabase
        .from("estimates")
        .select(`
          *,
          job:jobs!estimates_job_id_fkey(
            id,
            job_title,
            job_type,
            status
          ),
          customer:customers!estimates_customer_id_fkey(
            id,
            customer_name,
            company_name,
            email,
            phone
          ),
          created_by_user:users!estimates_created_by_fkey(
            id,
            full_name,
            email
          )
        `)
        .eq("id", estimateId)
        .single();

      if (error && error.code !== "PGRST116") {
        throw new Error(`Database error: ${error.message}`);
      }

      if (!data) return null;

      // Get additional costs for this estimate
      const additionalCosts = await Estimate.getAdditionalCosts(estimateId);
      data.additional_costs_list = additionalCosts;

      return data;
    } catch (error) {
      throw error;
    }
  }

  static async update(estimateId, updateData) {
    try {
      const { data, error } = await supabase
        .from("estimates")
        .update(updateData)
        .eq("id", estimateId)
        .select(`
          *,
          job:jobs!estimates_job_id_fkey(
            id,
            job_title,
            job_type,
            status
          ),
          customer:customers!estimates_customer_id_fkey(
            id,
            customer_name,
            company_name,
            email,
            phone
          ),
          created_by_user:users!estimates_created_by_fkey(
            id,
            full_name,
            email
          )
        `)
        .single();

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  static async delete(estimateId) {
    try {
      const { error } = await supabase
        .from("estimates")
        .delete()
        .eq("id", estimateId);

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return true;
    } catch (error) {
      throw error;
    }
  }

  static async getStats() {
    try {
      const { data: totalEstimates, error: totalError } = await supabase
        .from("estimates")
        .select("id", { count: 'exact' });

      if (totalError) {
        throw new Error(`Database error: ${totalError.message}`);
      }

      const { data: draftEstimates, error: draftError } = await supabase
        .from("estimates")
        .select("id", { count: 'exact' })
        .eq("status", "draft");

      if (draftError) {
        throw new Error(`Database error: ${draftError.message}`);
      }

      const { data: sentEstimates, error: sentError } = await supabase
        .from("estimates")
        .select("id", { count: 'exact' })
        .eq("status", "sent");

      if (sentError) {
        throw new Error(`Database error: ${sentError.message}`);
      }

      const { data: acceptedEstimates, error: acceptedError } = await supabase
        .from("estimates")
        .select("id", { count: 'exact' })
        .eq("status", "accepted");

      if (acceptedError) {
        throw new Error(`Database error: ${acceptedError.message}`);
      }

      const { data: rejectedEstimates, error: rejectedError } = await supabase
        .from("estimates")
        .select("id", { count: 'exact' })
        .eq("status", "rejected");

      if (rejectedError) {
        throw new Error(`Database error: ${rejectedError.message}`);
      }

      const { data: totalAmountData, error: amountError } = await supabase
        .from("estimates")
        .select("total_amount");

      if (amountError) {
        throw new Error(`Database error: ${amountError.message}`);
      }

      const total = totalEstimates?.length || 0;
      const draft = draftEstimates?.length || 0;
      const sent = sentEstimates?.length || 0;
      const accepted = acceptedEstimates?.length || 0;
      const rejected = rejectedEstimates?.length || 0;

      const totalRevenue = (totalAmountData || []).reduce((sum, estimate) => {
        return sum + (parseFloat(estimate.total_amount) || 0);
      }, 0);

      return {
        total,
        draft,
        sent,
        accepted,
        rejected,
        totalRevenue: totalRevenue.toFixed(2),
        draftPercentage: total > 0 ? ((draft / total) * 100).toFixed(1) : "0.0",
        sentPercentage: total > 0 ? ((sent / total) * 100).toFixed(1) : "0.0",
        acceptedPercentage: total > 0 ? ((accepted / total) * 100).toFixed(1) : "0.0",
        rejectedPercentage: total > 0 ? ((rejected / total) * 100).toFixed(1) : "0.0"
      };
    } catch (error) {
      throw error;
    }
  }

  static async getEstimatesByJob(jobId, page = 1, limit = 10) {
    try {
      const result = await Estimate.findAll({ job_id: jobId }, { page, limit });
      return result;
    } catch (error) {
      throw error;
    }
  }

  static async getEstimatesByCustomer(customerId, page = 1, limit = 10) {
    try {
      const result = await Estimate.findAll({ customer_id: customerId }, { page, limit });
      return result;
    } catch (error) {
      throw error;
    }
  }

  // Additional Costs Methods
  static async createAdditionalCost(additionalCostData) {
    try {
      const { data, error } = await supabase
        .from("estimate_additional_costs")
        .insert([additionalCostData])
        .select("*")
        .single();

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  static async getAdditionalCosts(estimateId) {
    try {
      const { data, error } = await supabase
        .from("estimate_additional_costs")
        .select("*")
        .eq("estimate_id", estimateId)
        .order("created_at", { ascending: true });

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      throw error;
    }
  }

  static async updateAdditionalCost(additionalCostId, updateData) {
    try {
      const { data, error } = await supabase
        .from("estimate_additional_costs")
        .update(updateData)
        .eq("id", additionalCostId)
        .select("*")
        .single();

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  static async deleteAdditionalCost(additionalCostId) {
    try {
      const { error } = await supabase
        .from("estimate_additional_costs")
        .delete()
        .eq("id", additionalCostId);

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return true;
    } catch (error) {
      throw error;
    }
  }

  static async calculateTotalCosts(estimateId) {
    try {
      const estimate = await Estimate.findById(estimateId);
      if (!estimate) {
        throw new Error('Estimate not found');
      }

      const additionalCosts = await Estimate.getAdditionalCosts(estimateId);
      
      const materialsCost = parseFloat(estimate.materials_cost) || 0;
      const laborCost = parseFloat(estimate.labor_cost) || 0;
      const additionalCostsTotal = additionalCosts.reduce((sum, cost) => {
        return sum + (parseFloat(cost.amount) || 0);
      }, 0);

      const subtotal = materialsCost + laborCost + additionalCostsTotal;
      const taxAmount = (subtotal * parseFloat(estimate.tax_percentage)) / 100;
      const totalAmount = subtotal + taxAmount;

      // Update estimate with calculated values
      await Estimate.update(estimateId, {
        additional_costs: additionalCostsTotal,
        subtotal: subtotal,
        tax_amount: taxAmount,
        total_amount: totalAmount
      });

      return {
        materials_cost: materialsCost,
        labor_cost: laborCost,
        additional_costs: additionalCostsTotal,
        subtotal: subtotal,
        tax_amount: taxAmount,
        total_amount: totalAmount
      };
    } catch (error) {
      throw error;
    }
  }
}
