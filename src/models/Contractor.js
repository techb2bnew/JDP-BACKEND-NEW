import { supabase } from "../config/database.js";

export class Contractor {
  static async create(contractorData) {
    try {
      const { data, error } = await supabase
        .from("contractors")
        .insert([contractorData])
        .select(`
          *,
          created_by_user:users!contractors_created_by_fkey(
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

  static async findById(contractorId) {
    try {
      const { data, error } = await supabase
        .from("contractors")
        .select(`
          *,
          created_by_user:users!contractors_created_by_fkey(
            id,
            full_name,
            email
          )
        `)
        .eq("id", contractorId)
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
        .from("contractors")
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

  static async findByJobId(jobId) {
    try {
      const { data, error } = await supabase
        .from("contractors")
        .select(`
          *,
          created_by_user:users!contractors_created_by_fkey(
            id,
            full_name,
            email
          )
        `)
        .eq("job_id", jobId);

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      throw error;
    }
  }

  static async findAll(filters = {}, pagination = {}) {
    try {
      let query = supabase
        .from("contractors")
        .select(`
          *,
          created_by_user:users!contractors_created_by_fkey(
            id,
            full_name,
            email
          )
        `, { count: 'exact' });

      if (filters.status) {
        query = query.eq("status", filters.status);
      }
      if (filters.job_id) {
        query = query.eq("job_id", filters.job_id);
      }
      if (filters.search) {
        query = query.or(`contractor_name.ilike.%${filters.search}%,company_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`);
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
        contractors: data || [],
        total: count || 0,
        page: pagination.page || 1,
        limit: pagination.limit || 10,
        totalPages: pagination.limit ? Math.ceil((count || 0) / pagination.limit) : 1
      };
    } catch (error) {
      throw error;
    }
  }

  static async update(contractorId, updateData) {
    try {
      const { data, error } = await supabase
        .from("contractors")
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq("id", contractorId)
        .select(`
          *,
          created_by_user:users!contractors_created_by_fkey(
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

  static async delete(contractorId) {
    try {
      const { error } = await supabase
        .from("contractors")
        .delete()
        .eq("id", contractorId);

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
      const { data: totalContractors, error: totalError } = await supabase
        .from("contractors")
        .select("id", { count: 'exact' });

      if (totalError) {
        throw new Error(`Database error: ${totalError.message}`);
      }

      const { data: activeContractors, error: activeError } = await supabase
        .from("contractors")
        .select("id", { count: 'exact' })
        .eq("status", "active");

      if (activeError) {
        throw new Error(`Database error: ${activeError.message}`);
      }

      const { data: inactiveContractors, error: inactiveError } = await supabase
        .from("contractors")
        .select("id", { count: 'exact' })
        .eq("status", "inactive");

      if (inactiveError) {
        throw new Error(`Database error: ${inactiveError.message}`);
      }

      const total = totalContractors?.length || 0;
      const active = activeContractors?.length || 0;
      const inactive = inactiveContractors?.length || 0;

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

  // Check if contractor has relationships with other tables before deletion
  static async checkContractorRelationships(contractorId) {
    try {
      if (!contractorId) {
        throw new Error('Contractor ID is required');
      }

      const relationships = [];

      // Check jobs table
      const { data: jobsData, error: jobsError } = await supabase
        .from('jobs')
        .select('id, job_title')
        .eq('contractor_id', contractorId)
        .limit(1);

      if (!jobsError && jobsData && jobsData.length > 0) {
        relationships.push({
          table: 'jobs',
          count: jobsData.length,
          message: 'This contractor has associated jobs'
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
