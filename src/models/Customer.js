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

      const [totalResult, activeResult, inactiveResult] = await Promise.all([
        supabase
          .from("customers")
          .select("id", { count: 'exact', head: true }),
        supabase
          .from("customers")
          .select("id", { count: 'exact', head: true })
          .eq("status", "active"),
        supabase
          .from("customers")
          .select("id", { count: 'exact', head: true })
          .eq("status", "inactive")
      ]);

      if (totalResult.error) {
        throw new Error(`Database error: ${totalResult.error.message}`);
      }

      if (activeResult.error) {
        throw new Error(`Database error: ${activeResult.error.message}`);
      }

      if (inactiveResult.error) {
        throw new Error(`Database error: ${inactiveResult.error.message}`);
      }

      const total = totalResult.count || 0;
      const active = activeResult.count || 0;
      const inactive = inactiveResult.count || 0;

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

  static async checkCustomerRelationships(customerId) {
    try {
      if (!customerId) {
        throw new Error('Customer ID is required');
      }

 
      const [jobsResult, ordersResult] = await Promise.all([
        supabase
          .from('jobs')
          .select('id, job_title')
          .eq('customer_id', customerId)
          .limit(1),
        supabase
          .from('orders')
          .select('id')
          .eq('customer_id', customerId)
          .limit(1)
      ]);

      const relationships = [];

      if (!jobsResult.error && jobsResult.data && jobsResult.data.length > 0) {
        relationships.push({
          table: 'jobs',
          count: jobsResult.data.length,
          message: 'This customer has associated jobs'
        });
      }

      if (!ordersResult.error && ordersResult.data && ordersResult.data.length > 0) {
        relationships.push({
          table: 'orders',
          count: ordersResult.data.length,
          message: 'This customer has associated orders'
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
