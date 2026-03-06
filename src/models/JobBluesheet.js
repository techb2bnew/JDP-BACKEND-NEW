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
            job_type,
            status,
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
            updated_at
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
            date,
            created_at,
            updated_at
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

     
      if (filters.start_date && filters.end_date) {
        query = query.gte('date', filters.start_date).lte('date', filters.end_date);
      }


      const { page = 1, limit = 10, offset = 0 } = pagination;
      
      
      const { count, error: countError } = await supabase
        .from('job_bluesheet')
        .select('*', { count: 'exact', head: true });
      
      if (countError) {
        throw new Error(`Database error: ${countError.message}`);
      }

      const totalRecords = count || 0;
      const totalPages = Math.ceil(totalRecords / limit);

      
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

  /**
   * Search bluesheets and group by job: one row per job with bluesheet_count.
   * Used for list API; full bluesheets for a job are fetched via GET /job/:jobId/bluesheets.
   */
  static async searchGroupedByJob(filters = {}, pagination = {}) {
    try {
      let query = supabase
        .from('job_bluesheet')
        .select(`
          id,
          job_id,
          date,
          status,
          total_cost,
          created_at,
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
          )
        `);

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
      if (filters.start_date && filters.end_date) {
        query = query.gte('date', filters.start_date).lte('date', filters.end_date);
      }

      const { data: allRows, error } = await query.order('date', { ascending: false });

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      const rows = allRows || [];

      // Group by job_id (first occurrence has job details; count all; sum amount; latest row = submitted_by)
      const byJobId = {};
      for (const row of rows) {
        const jid = row.job_id;
        if (!byJobId[jid]) {
          byJobId[jid] = {
            job_id: jid,
            job: row.job,
            bluesheet_count: 0,
            latest_date: row.date,
            latest_bluesheet_id: row.id,
            total_amount: 0,
            submitted_by: row.created_by_user,
            approved_by: row.approved_by_user
          };
        }
        byJobId[jid].bluesheet_count += 1;
        byJobId[jid].total_amount += parseFloat(row.total_cost) || 0;
        if (row.date && (!byJobId[jid].latest_date || row.date > byJobId[jid].latest_date)) {
          byJobId[jid].latest_date = row.date;
          byJobId[jid].latest_bluesheet_id = row.id;
          byJobId[jid].submitted_by = row.created_by_user;
          byJobId[jid].approved_by = row.approved_by_user;
        }
      }

      const jobsList = Object.values(byJobId).sort((a, b) => {
        const dA = a.latest_date || '';
        const dB = b.latest_date || '';
        return dB.localeCompare(dA);
      });

      const totalRecords = jobsList.length;
      const { page = 1, limit = 10 } = pagination;
      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
      const offset = (pageNum - 1) * limitNum;
      const paged = jobsList.slice(offset, offset + limitNum);

      const jobs = paged.map(({ job_id, job, bluesheet_count, latest_date, latest_bluesheet_id, total_amount, submitted_by, approved_by }) => ({
        job_id,
        job,
        bluesheet_count,
        latest_bluesheet_date: latest_date,
        latest_bluesheet_id,
        amount: Math.round(total_amount * 100) / 100,
        total_cost: Math.round(total_amount * 100) / 100,
        submitted_by: submitted_by || null,
        approved_by: approved_by || null
      }));

      const totalPages = Math.ceil(totalRecords / limitNum);

      return {
        jobs,
        pagination: {
          current_page: pageNum,
          total_pages: totalPages,
          total_records: totalRecords,
          records_per_page: limitNum,
          has_next_page: pageNum < totalPages,
          has_prev_page: pageNum > 1
        }
      };
    } catch (error) {
      throw error;
    }
  }
}
