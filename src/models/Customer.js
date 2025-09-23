import { supabase } from "../config/database.js";

export class Customer {
  static async create(customerData) {
    try {
      const { data, error } = await supabase
        .from("customers")
        .insert([customerData])
        .select(`
          *,
          created_by_user:users!customers_created_by_fkey(
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

  static async findById(customerId) {
    try {
      const { data, error } = await supabase
        .from("customers")
        .select(`
          *,
          created_by_user:users!customers_created_by_fkey(
            id,
            full_name,
            email
          )
        `)
        .eq("id", customerId)
        .single();

      if (error && error.code !== "PGRST116") {
        throw new Error(`Database error: ${error.message}`);
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  static async findByEmail(email) {
    try {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("email", email)
        .single();

      if (error && error.code !== "PGRST116") {
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
        .from("customers")
        .select(`
          *,
          created_by_user:users!customers_created_by_fkey(
            id,
            full_name,
            email
          )
        `, { count: 'exact' });

      if (filters.status) {
        query = query.eq("status", filters.status);
      }
      if (filters.search) {
        query = query.or(`customer_name.ilike.%${filters.search}%,company_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`);
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
        customers: data || [],
        total: count || 0,
        page: pagination.page || 1,
        limit: pagination.limit || 10,
        totalPages: pagination.limit ? Math.ceil((count || 0) / pagination.limit) : 1
      };
    } catch (error) {
      throw error;
    }
  }

  static async update(customerId, updateData) {
    try {
      const { data, error } = await supabase
        .from("customers")
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq("id", customerId)
        .select()
        .single();

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  static async delete(customerId) {
    try {
      const { error } = await supabase
        .from("customers")
        .delete()
        .eq("id", customerId);

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
      const { data: totalCustomers, error: totalError } = await supabase
        .from("customers")
        .select("id", { count: 'exact' });

      if (totalError) {
        throw new Error(`Database error: ${totalError.message}`);
      }

      const { data: activeCustomers, error: activeError } = await supabase
        .from("customers")
        .select("id", { count: 'exact' })
        .eq("status", "active");

      if (activeError) {
        throw new Error(`Database error: ${activeError.message}`);
      }

      const { data: inactiveCustomers, error: inactiveError } = await supabase
        .from("customers")
        .select("id", { count: 'exact' })
        .eq("status", "inactive");

      if (inactiveError) {
        throw new Error(`Database error: ${inactiveError.message}`);
      }

      const total = totalCustomers?.length || 0;
      const active = activeCustomers?.length || 0;
      const inactive = inactiveCustomers?.length || 0;

      return {
        total,
        active,
        inactive,
        activePercentage: total > 0 ? ((active / total) * 100).toFixed(1) : "0.0",
        inactivePercentage: total > 0 ? ((inactive / total) * 100).toFixed(1) : "0.0"
      };
    } catch (error) {
      throw error;
    }
  }

  // Check if customer has relationships with other tables before deletion
  static async checkCustomerRelationships(customerId) {
    try {
      if (!customerId) {
        throw new Error('Customer ID is required');
      }

      const relationships = [];

      // Check jobs table
      const { data: jobsData, error: jobsError } = await supabase
        .from('jobs')
        .select('id, job_title')
        .eq('customer_id', customerId)
        .limit(1);

      if (!jobsError && jobsData && jobsData.length > 0) {
        relationships.push({
          table: 'jobs',
          count: jobsData.length,
          message: 'This customer has associated jobs'
        });
      }

      // Check estimates table
      const { data: estimatesData, error: estimatesError } = await supabase
        .from('estimates')
        .select('id, estimate_title')
        .eq('customer_id', customerId)
        .limit(1);

      if (!estimatesError && estimatesData && estimatesData.length > 0) {
        relationships.push({
          table: 'estimates',
          count: estimatesData.length,
          message: 'This customer has associated estimates'
        });
      }

      return {
        hasRelationships: relationships.length > 0,
        relationships: relationships,
        canDelete: relationships.length === 0
      };
    } catch (error) {
      throw error;
    }
  }
}
