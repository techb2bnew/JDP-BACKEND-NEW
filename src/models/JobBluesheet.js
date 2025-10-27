import { supabase } from '../config/database.js';

export class JobBluesheet {
  static async create(bluesheetData) {
    try {
      const { data, error } = await supabase
        .from('job_bluesheet')
        .insert([bluesheetData])
        .select(`
          *,
          job:job_id (
            id,
            job_title,
            status
          ),
          created_by_user:users!job_bluesheet_created_by_fkey (
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

  static async findById(id) {
    try {
      const { data, error } = await supabase
        .from('job_bluesheet')
        .select(`
          *,
          job:job_id (
            id,
            job_title,
            status,
            customer:customers!jobs_customer_id_fkey (
              id,
              customer_name,
              company_name
            ),
            contractor:contractors!jobs_contractor_id_fkey (
              id,
              contractor_name,
              company_name
            )
          ),
          created_by_user:users!job_bluesheet_created_by_fkey (
            id,
            full_name,
            email
          ),
          labor_entries:job_bluesheet_labor (
            id,
            labor_id,
            lead_labor_id,
            employee_name,
            role,
            regular_hours,
            overtime_hours,
            total_hours,
            hourly_rate,
            total_cost,
            status,
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
          ),
          material_entries:job_bluesheet_material (
            id,
            product_id,
            material_name,
            unit,
            total_ordered,
            material_used,
            supplier_order_id,
            return_to_warehouse,
            unit_cost,
            total_cost,
            status,
            product:product_id (
              id,
              product_name,
              jdp_price,
              supplier_cost_price
            )
          )
        `)
        .eq('id', id)
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
        .from('job_bluesheet')
        .select(`
          *,
          job:job_id (
            id,
            job_title,
            status
          ),
          created_by_user:users!job_bluesheet_created_by_fkey (
            id,
            full_name,
            email
          ),
          labor_entries:job_bluesheet_labor (
            id,
            labor_id,
            lead_labor_id,
            employee_name,
            role,
            regular_hours,
            overtime_hours,
            total_hours,
            hourly_rate,
            total_cost,
            status
          ),
          material_entries:job_bluesheet_material (
            id,
            product_id,
            material_name,
            unit,
            total_ordered,
            material_used,
            supplier_order_id,
            return_to_warehouse,
            unit_cost,
            total_cost,
            status
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

  static async update(id, updateData) {
    try {
      const { data, error } = await supabase
        .from('job_bluesheet')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
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

  static async delete(id) {
    try {
      const { error } = await supabase
        .from('job_bluesheet')
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return { success: true, message: 'Job bluesheet deleted successfully' };
    } catch (error) {
      throw error;
    }
  }

  static async search(filters = {}) {
    try {
      let query = supabase
        .from('job_bluesheet')
        .select(`
          *,
          job:job_id (
            id,
            job_title,
            status,
            customer:customers!jobs_customer_id_fkey (
              id,
              customer_name,
              company_name
            ),
            contractor:contractors!jobs_contractor_id_fkey (
              id,
              contractor_name,
              company_name
            )
          ),
          created_by_user:users!job_bluesheet_created_by_fkey (
            id,
            full_name,
            email
          )
        `);

      // Apply filters
      if (filters.job_id) {
        query = query.eq('job_id', filters.job_id);
      }
      if (filters.date) {
        query = query.eq('date', filters.date);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.created_by) {
        query = query.eq('created_by', filters.created_by);
      }

      // Date range filter
      if (filters.start_date && filters.end_date) {
        query = query.gte('date', filters.start_date).lte('date', filters.end_date);
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
}
