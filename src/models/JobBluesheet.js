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
          ),
          approved_by_user:users!job_bluesheet_approved_by_fkey (
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
            job_type,
            status,
            priority,
            description,
            bill_to_address,
            bill_to_city_zip,
            bill_to_phone,
            bill_to_email,
            customer:customers!jobs_customer_id_fkey (
              id,
              customer_name,
              company_name,
              email,
              phone,
              address
            ),
            contractor:contractors!jobs_contractor_id_fkey (
              id,
              contractor_name,
              company_name,
              email,
              phone,
              address
            )
          ),
          created_by_user:users!job_bluesheet_created_by_fkey (
            id,
            full_name,
            email
          ),
          approved_by_user:users!job_bluesheet_approved_by_fkey (
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
            date,
            description,
            created_at,
            updated_at,
            labor:labor_id (
              id,
              labor_code,
              hourly_rate,
              users!labor_user_id_fkey (
                id,
                full_name,
                email,
                phone
              )
            ),
            lead_labor:lead_labor_id (
              id,
              labor_code,
              users!lead_labor_user_id_fkey (
                id,
                full_name,
                email,
                phone
              )
            )
          ),
          material_entries:job_bluesheet_material (
            id,
            product_id,
            material_name,
            quantity,
            unit,
            total_ordered,
            material_used,
            supplier_order_id,
            return_to_warehouse,
            unit_cost,
            total_cost,
            date,
            created_at,
            updated_at,
            product:product_id (
              id,
              product_name,
              jdp_sku,
              supplier_sku,
              jdp_price,
              supplier_cost_price,
              unit,
              category,
              description,
              supplier_id,
              suppliers (
                id,
                company_name,
                contact_person
              )
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
          approved_by_user:users!job_bluesheet_approved_by_fkey (
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

  static async findByIds(bluesheetIds = []) {
    try {
      const uniqueIds = Array.from(new Set(bluesheetIds)).filter((id) => id !== null && id !== undefined);

      if (uniqueIds.length === 0) {
        return [];
      }

      const results = await Promise.all(uniqueIds.map((id) => this.findById(id)));

      return results.filter(Boolean);
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

  static async search(filters = {}, pagination = {}) {
    try {
      let query = supabase
        .from('job_bluesheet')
        .select(`
          *,
          job:job_id (
            id,
            job_title,
            job_type,
            status,
            priority,
            description,
            bill_to_address,
            bill_to_city_zip,
            bill_to_phone,
            bill_to_email,
            customer:customers!jobs_customer_id_fkey (
              id,
              customer_name,
              company_name,
              email,
              phone,
              address
            ),
            contractor:contractors!jobs_contractor_id_fkey (
              id,
              contractor_name,
              company_name,
              email,
              phone,
              address
            )
          ),
          created_by_user:users!job_bluesheet_created_by_fkey (
            id,
            full_name,
            email
          ),
          approved_by_user:users!job_bluesheet_approved_by_fkey (
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
            date,
            description,
            created_at,
            updated_at,
            labor:labor_id (
              id,
              labor_code,
              hourly_rate,
              users!labor_user_id_fkey (
                id,
                full_name,
                email,
                phone
              )
            ),
            lead_labor:lead_labor_id (
              id,
              labor_code,
              users!lead_labor_user_id_fkey (
                id,
                full_name,
                email,
                phone
              )
            )
          ),
          material_entries:job_bluesheet_material (
            id,
            product_id,
            material_name,
            quantity,
            unit,
            total_ordered,
            material_used,
            supplier_order_id,
            return_to_warehouse,
            unit_cost,
            total_cost,
            date,
            created_at,
            updated_at,
            product:product_id (
              id,
              product_name,
              jdp_sku,
              supplier_sku,
              jdp_price,
              supplier_cost_price,
              unit,
              category,
              description,
              supplier_id,
              suppliers (
                id,
                company_name,
                contact_person
              )
            )
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

      // Apply pagination
      const { page = 1, limit = 10, offset = 0 } = pagination;
      
      // First get total count for pagination info
      const { count, error: countError } = await supabase
        .from('job_bluesheet')
        .select('*', { count: 'exact', head: true });
      
      if (countError) {
        throw new Error(`Database error: ${countError.message}`);
      }

      const totalRecords = count || 0;
      const totalPages = Math.ceil(totalRecords / limit);

      // Apply pagination to main query
      query = query.range(offset, offset + limit - 1);

      const { data, error } = await query.order('date', { ascending: false });

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return {
        bluesheets: data || [],
        pagination: {
          current_page: page,
          total_pages: totalPages,
          total_records: totalRecords,
          records_per_page: limit,
          has_next_page: page < totalPages,
          has_prev_page: page > 1
        }
      };
    } catch (error) {
      throw error;
    }
  }
}
