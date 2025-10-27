import { supabase } from '../config/database.js';

export class JobBluesheetLabor {
  static async create(laborData) {
    try {
      const { data, error } = await supabase
        .from('job_bluesheet_labor')
        .insert([laborData])
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
          job_bluesheet:job_bluesheet_id (
            id,
            date,
            job:job_id (
              id,
              job_title
            )
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

  static async findByBluesheetId(bluesheetId) {
    try {
      const { data, error } = await supabase
        .from('job_bluesheet_labor')
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
        .eq('job_bluesheet_id', bluesheetId)
        .order('created_at', { ascending: true });

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      throw error;
    }
  }

  static async update(id, updateData) {
    try {
      const { data, error } = await supabase
        .from('job_bluesheet_labor')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
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
        .single();

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  static async delete(id) {
    try {
      const { error } = await supabase
        .from('job_bluesheet_labor')
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return { success: true, message: 'Labor entry deleted successfully' };
    } catch (error) {
      throw error;
    }
  }

  static async calculateTotalCost(bluesheetId) {
    try {
      const { data, error } = await supabase
        .from('job_bluesheet_labor')
        .select('total_cost')
        .eq('job_bluesheet_id', bluesheetId);

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      const totalCost = (data || []).reduce((sum, entry) => {
        return sum + (parseFloat(entry.total_cost) || 0);
      }, 0);

      return totalCost;
    } catch (error) {
      throw error;
    }
  }
}
