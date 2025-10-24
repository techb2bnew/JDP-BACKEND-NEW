import { supabase } from '../config/database.js';

export class LaborTimesheet {
  static async create(timesheetData) {
    try {
      const { data, error } = await supabase
        .from('labor_timesheets')
        .insert([timesheetData])
        .select(`
          *,
          labor:labor_id (
            id,
            labor_code,
            users!labor_user_id_fkey (
              id,
              full_name,
              email
            )
          ),
          lead_labor:lead_labor_id (
            id,
            labor_code,
            users!lead_labor_user_id_fkey (
              id,
              full_name,
              email
            )
          ),
          job:job_id (
            id,
            job_title,
            status
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

  static async findByJobId(jobId) {
    try {
      const { data, error } = await supabase
        .from('labor_timesheets')
        .select(`
          *,
          labor:labor_id (
            id,
            labor_code,
            users!labor_user_id_fkey (
              id,
              full_name,
              email
            )
          ),
          lead_labor:lead_labor_id (
            id,
            labor_code,
            users!lead_labor_user_id_fkey (
              id,
              full_name,
              email
            )
          )
        `)
        .eq('job_id', jobId)
        .order('date', { ascending: false });

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      throw error;
    }
  }

  static async findByLaborId(laborId, filters = {}) {
    try {
      let query = supabase
        .from('labor_timesheets')
        .select(`
          *,
          job:job_id (
            id,
            job_title,
            status
          )
        `)
        .eq('labor_id', laborId);

      if (filters.date_from) {
        query = query.gte('date', filters.date_from);
      }
      if (filters.date_to) {
        query = query.lte('date', filters.date_to);
      }

      const { data, error } = await query.order('date', { ascending: false });

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      throw error;
    }
  }

  static async update(timesheetId, updateData) {
    try {
      const { data, error } = await supabase
        .from('labor_timesheets')
        .update(updateData)
        .eq('id', timesheetId)
        .select(`
          *,
          labor:labor_id (
            id,
            labor_code,
            users!labor_user_id_fkey (
              id,
              full_name,
              email
            )
          ),
          lead_labor:lead_labor_id (
            id,
            labor_code,
            users!lead_labor_user_id_fkey (
              id,
              full_name,
              email
            )
          ),
          job:job_id (
            id,
            job_title,
            status
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

  static async delete(timesheetId) {
    try {
      const { error } = await supabase
        .from('labor_timesheets')
        .delete()
        .eq('id', timesheetId);

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return true;
    } catch (error) {
      throw error;
    }
  }

  static async getTimesheetSummary(jobId) {
    try {
      const { data, error } = await supabase
        .from('labor_timesheets')
        .select('*')
        .eq('job_id', jobId);

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      if (!data || data.length === 0) {
        return {
          total_entries: 0,
          total_work_activity: 0,
          total_hours: 0,
          labor_summary: {}
        };
      }

      // Calculate summary
      const totalEntries = data.length;
      const totalWorkActivity = data.reduce((sum, entry) => sum + (entry.work_activity || 0), 0);
      
      // Calculate total hours
      let totalHours = 0;
      data.forEach(entry => {
        if (entry.start_time && entry.end_time) {
          const start = new Date(`2000-01-01T${entry.start_time}`);
          const end = new Date(`2000-01-01T${entry.end_time}`);
          const diffMs = end - start;
          const diffHours = diffMs / (1000 * 60 * 60);
          totalHours += diffHours;
        }
      });

      // Labor summary
      const laborSummary = {};
      data.forEach(entry => {
        const laborId = entry.labor_id;
        if (!laborSummary[laborId]) {
          laborSummary[laborId] = {
            total_entries: 0,
            total_work_activity: 0,
            total_hours: 0
          };
        }
        laborSummary[laborId].total_entries++;
        laborSummary[laborId].total_work_activity += entry.work_activity || 0;
        
        if (entry.start_time && entry.end_time) {
          const start = new Date(`2000-01-01T${entry.start_time}`);
          const end = new Date(`2000-01-01T${entry.end_time}`);
          const diffMs = end - start;
          const diffHours = diffMs / (1000 * 60 * 60);
          laborSummary[laborId].total_hours += diffHours;
        }
      });

      return {
        total_entries: totalEntries,
        total_work_activity: totalWorkActivity,
        total_hours: totalHours,
        labor_summary: laborSummary
      };
    } catch (error) {
      throw error;
    }
  }
}
