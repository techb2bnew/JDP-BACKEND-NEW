import { supabase } from "../config/database.js";

export class JobTimeLog {
  static async create(timeLogData) {
    try {
      const { data, error } = await supabase
        .from("job_time_logs")
        .insert([timeLogData])
        .select(`
          *,
          job:jobs!job_time_logs_job_id_fkey(
            id,
            job_title,
            job_type,
            status,
            priority
          ),
          labor:labor!job_time_logs_labor_id_fkey(
            id,
            labor_code,
            trade,
            experience,
            hourly_rate,
            user_id,
            user:users!labor_user_id_fkey(
              id,
              full_name,
              email,
              phone
            )
          ),
          lead_labor:lead_labor!job_time_logs_lead_labor_id_fkey(
            id,
            labor_code,
            department,
            specialization,
            trade,
            experience,
            user_id,
            user:users!lead_labor_user_id_fkey(
              id,
              full_name,
              email,
              phone
            )
          ),
          created_by_user:users!job_time_logs_created_by_fkey(
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

  static async findById(timeLogId) {
    try {
      const { data, error } = await supabase
        .from("job_time_logs")
        .select(`
          *,
          job:jobs!job_time_logs_job_id_fkey(
            id,
            job_title,
            job_type,
            status,
            priority
          ),
          labor:labor!job_time_logs_labor_id_fkey(
            id,
            labor_code,
            trade,
            experience,
            hourly_rate,
            user_id,
            user:users!labor_user_id_fkey(
              id,
              full_name,
              email,
              phone
            )
          ),
          lead_labor:lead_labor!job_time_logs_lead_labor_id_fkey(
            id,
            labor_code,
            department,
            specialization,
            trade,
            experience,
            user_id,
            user:users!lead_labor_user_id_fkey(
              id,
              full_name,
              email,
              phone
            )
          ),
          created_by_user:users!job_time_logs_created_by_fkey(
            id,
            full_name,
            email
          )
        `)
        .eq("id", timeLogId)
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
        .from("job_time_logs")
        .select(`
          *,
          job:jobs!job_time_logs_job_id_fkey(
            id,
            job_title,
            job_type,
            status,
            priority
          ),
          labor:labor!job_time_logs_labor_id_fkey(
            id,
            labor_code,
            trade,
            experience,
            hourly_rate,
            user_id,
            user:users!labor_user_id_fkey(
              id,
              full_name,
              email,
              phone
            )
          ),
          lead_labor:lead_labor!job_time_logs_lead_labor_id_fkey(
            id,
            labor_code,
            department,
            specialization,
            trade,
            experience,
            user_id,
            user:users!lead_labor_user_id_fkey(
              id,
              full_name,
              email,
              phone
            )
          ),
          created_by_user:users!job_time_logs_created_by_fkey(
            id,
            full_name,
            email
          )
        `, { count: 'exact' });

      if (filters.job_id) {
        query = query.eq("job_id", filters.job_id);
      }
      if (filters.labor_id) {
        query = query.eq("labor_id", filters.labor_id);
      }
      if (filters.lead_labor_id) {
        query = query.eq("lead_labor_id", filters.lead_labor_id);
      }
      if (filters.work_date) {
        query = query.eq("work_date", filters.work_date);
      }
      if (filters.worker_name) {
        query = query.ilike("worker_name", `%${filters.worker_name}%`);
      }
      if (filters.role) {
        query = query.ilike("role", `%${filters.role}%`);
      }
      if (filters.status) {
        query = query.eq("status", filters.status);
      }

      if (pagination.page && pagination.limit) {
        const offset = (pagination.page - 1) * pagination.limit;
        query = query.range(offset, offset + pagination.limit - 1);
      }

      const sortBy = pagination.sortBy || 'work_date';
      const sortOrder = pagination.sortOrder || 'desc';
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      const { data, error, count } = await query;

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      // Calculate total cost for all time logs
      const totalCost = (data || []).reduce((sum, log) => {
        return sum + (parseFloat(log.total_cost) || 0);
      }, 0);

      return {
        timeLogs: data || [],
        total: count || 0,
        totalCost: totalCost.toFixed(2),
        page: pagination.page || 1,
        limit: pagination.limit || 10,
        totalPages: pagination.limit ? Math.ceil((count || 0) / pagination.limit) : 1
      };
    } catch (error) {
      throw error;
    }
  }

  static async update(timeLogId, updateData) {
    try {
      const { data, error } = await supabase
        .from("job_time_logs")
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq("id", timeLogId)
        .select(`
          *,
          job:jobs!job_time_logs_job_id_fkey(
            id,
            job_title,
            job_type,
            status,
            priority
          ),
          labor:labor!job_time_logs_labor_id_fkey(
            id,
            labor_code,
            trade,
            experience,
            hourly_rate,
            user_id,
            user:users!labor_user_id_fkey(
              id,
              full_name,
              email,
              phone
            )
          ),
          lead_labor:lead_labor!job_time_logs_lead_labor_id_fkey(
            id,
            labor_code,
            department,
            specialization,
            trade,
            experience,
            user_id,
            user:users!lead_labor_user_id_fkey(
              id,
              full_name,
              email,
              phone
            )
          ),
          created_by_user:users!job_time_logs_created_by_fkey(
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

  static async delete(timeLogId) {
    try {
      const { error } = await supabase
        .from("job_time_logs")
        .delete()
        .eq("id", timeLogId);

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return true;
    } catch (error) {
      throw error;
    }
  }

  static async getTimeLogsByJob(jobId, page = 1, limit = 10) {
    try {
      const offset = (page - 1) * limit;

      const { count, error: countError } = await supabase
        .from("job_time_logs")
        .select("*", { count: 'exact', head: true })
        .eq("job_id", jobId);

      if (countError) {
        throw new Error(`Database error: ${countError.message}`);
      }

      const { data, error } = await supabase
        .from("job_time_logs")
        .select(`
          *,
          job:jobs!job_time_logs_job_id_fkey(
            id,
            job_title,
            job_type,
            status,
            priority
          ),
          labor:labor!job_time_logs_labor_id_fkey(
            id,
            labor_code,
            trade,
            experience,
            hourly_rate,
            user_id,
            user:users!labor_user_id_fkey(
              id,
              full_name,
              email,
              phone
            )
          ),
          lead_labor:lead_labor!job_time_logs_lead_labor_id_fkey(
            id,
            labor_code,
            department,
            specialization,
            trade,
            experience,
            user_id,
            user:users!lead_labor_user_id_fkey(
              id,
              full_name,
              email,
              phone
            )
          ),
          created_by_user:users!job_time_logs_created_by_fkey(
            id,
            full_name,
            email
          )
        `)
        .eq("job_id", jobId)
        .order("work_date", { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      const totalPages = Math.ceil(count / limit);

      // Calculate total cost for all time logs in this job
      const totalCost = (data || []).reduce((sum, log) => {
        return sum + (parseFloat(log.total_cost) || 0);
      }, 0);

      return {
        timeLogs: data || [],
        totalCost: totalCost.toFixed(2),
        pagination: {
          currentPage: page,
          totalPages: totalPages,
          totalItems: count,
          itemsPerPage: limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      };
    } catch (error) {
      throw error;
    }
  }

  static async getTimeLogsByLabor(laborId, page = 1, limit = 10) {
    try {
      const offset = (page - 1) * limit;

      const { count, error: countError } = await supabase
        .from("job_time_logs")
        .select("*", { count: 'exact', head: true })
        .eq("labor_id", laborId);

      if (countError) {
        throw new Error(`Database error: ${countError.message}`);
      }

      const { data, error } = await supabase
        .from("job_time_logs")
        .select(`
          *,
          job:jobs!job_time_logs_job_id_fkey(
            id,
            job_title,
            job_type,
            status,
            priority
          ),
          labor:labor!job_time_logs_labor_id_fkey(
            id,
            labor_code,
            trade,
            experience,
            hourly_rate,
            user_id,
            user:users!labor_user_id_fkey(
              id,
              full_name,
              email,
              phone
            )
          ),
          lead_labor:lead_labor!job_time_logs_lead_labor_id_fkey(
            id,
            labor_code,
            department,
            specialization,
            trade,
            experience,
            user_id,
            user:users!lead_labor_user_id_fkey(
              id,
              full_name,
              email,
              phone
            )
          ),
          created_by_user:users!job_time_logs_created_by_fkey(
            id,
            full_name,
            email
          )
        `)
        .eq("labor_id", laborId)
        .order("work_date", { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      const totalPages = Math.ceil(count / limit);

      const totalCost = (data || []).reduce((sum, log) => {
        return sum + (parseFloat(log.total_cost) || 0);
      }, 0);

      return {
        timeLogs: data || [],
        totalCost: totalCost.toFixed(2),
        pagination: {
          currentPage: page,
          totalPages: totalPages,
          totalItems: count,
          itemsPerPage: limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      };
    } catch (error) {
      throw error;
    }
  }

  static async getStats() {
    try {
      const { data: totalLogs, error: totalError } = await supabase
        .from("job_time_logs")
        .select("id", { count: 'exact' });

      if (totalError) {
        throw new Error(`Database error: ${totalError.message}`);
      }

      const { data: hoursData, error: hoursError } = await supabase
        .from("job_time_logs")
        .select("hours_worked");

      if (hoursError) {
        throw new Error(`Database error: ${hoursError.message}`);
      }

      const { data: costData, error: costError } = await supabase
        .from("job_time_logs")
        .select("total_cost");

      if (costError) {
        throw new Error(`Database error: ${costError.message}`);
      }

      const total = totalLogs?.length || 0;
      const totalHours = (hoursData || []).reduce((sum, log) => {
        return sum + (parseFloat(log.hours_worked) || 0);
      }, 0);
      const totalCost = (costData || []).reduce((sum, log) => {
        return sum + (parseFloat(log.total_cost) || 0);
      }, 0);

      return {
        total,
        totalHours: totalHours.toFixed(2),
        totalCost: totalCost.toFixed(2),
        averageHoursPerLog: total > 0 ? (totalHours / total).toFixed(2) : "0.00",
        averageCostPerLog: total > 0 ? (totalCost / total).toFixed(2) : "0.00"
      };
    } catch (error) {
      throw error;
    }
  }
}
