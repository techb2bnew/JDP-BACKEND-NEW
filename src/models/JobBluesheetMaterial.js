import { supabase } from '../config/database.js';

export class JobBluesheetMaterial {
  static async create(materialData) {
    try {
      const { data, error } = await supabase
        .from('job_bluesheet_material')
        .insert([materialData])
        .select(`
          *,
          product:product_id (
            id,
            product_name,
            jdp_price,
            supplier_cost_price,
            unit
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
        .from('job_bluesheet_material')
        .select(`
          *,
          product:product_id (
            id,
            product_name,
            jdp_price,
            supplier_cost_price,
            unit
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
        .from('job_bluesheet_material')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select(`
          *,
          product:product_id (
            id,
            product_name,
            jdp_price,
            supplier_cost_price,
            unit
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
        .from('job_bluesheet_material')
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return { success: true, message: 'Material entry deleted successfully' };
    } catch (error) {
      throw error;
    }
  }

  static async calculateTotalCost(bluesheetId) {
    try {
      const { data, error } = await supabase
        .from('job_bluesheet_material')
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

  static async getMaterialUsageStats(productId, startDate, endDate) {
    try {
      const { data, error } = await supabase
        .from('job_bluesheet_material')
        .select(`
          material_used,
          total_ordered,
          job_bluesheet:job_bluesheet_id (
            date,
            job:job_id (
              id,
              job_title
            )
        `)
        .eq('product_id', productId)
        .gte('job_bluesheet.date', startDate)
        .lte('job_bluesheet.date', endDate);

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      const totalUsed = (data || []).reduce((sum, entry) => {
        return sum + (parseInt(entry.material_used) || 0);
      }, 0);

      const totalOrdered = (data || []).reduce((sum, entry) => {
        return sum + (parseInt(entry.total_ordered) || 0);
      }, 0);

      return {
        total_used: totalUsed,
        total_ordered: totalOrdered,
        usage_rate: totalOrdered > 0 ? (totalUsed / totalOrdered) * 100 : 0,
        entries: data || []
      };
    } catch (error) {
      throw error;
    }
  }
}
