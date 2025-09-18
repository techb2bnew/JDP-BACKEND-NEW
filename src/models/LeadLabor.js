import { supabase } from '../config/database.js';

export class LeadLabor {
  static async create(leadLaborData) {
    try {
      const { data, error } = await supabase
        .from('lead_labor')
        .insert([leadLaborData])
        .select(`
          *,
          users (
            id,
            full_name,
            email,
            phone,
            role,
            status,
            photo_url,
            created_at
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

  static async getAllLeadLabor(page = 1, limit = 10) {
    try {
      const offset = (page - 1) * limit;

      const { count, error: countError } = await supabase
        .from('lead_labor')
        .select('*', { count: 'exact', head: true });

      if (countError) {
        throw new Error(`Database error: ${countError.message}`);
      }

      const { data, error } = await supabase
        .from('lead_labor')
        .select(`
          *,
          users!inner (
            id,
            full_name,
            email,
            phone,
            role,
            status,
            created_at
          )
        `)
        .order('id', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      const totalPages = Math.ceil(count / limit);

      return {
        data: data || [],
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

  static async getLeadLaborById(leadLaborId) {
    try {
      const { data, error } = await supabase
        .from('lead_labor')
        .select(`
          *,
          users (
            id,
            full_name,
            email,
            phone,
            role,
            status,
            photo_url,
            created_at
          )
        `)
        .eq('id', leadLaborId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new Error(`Database error: ${error.message}`);
      }

      if (!data) {
        throw new Error(`Lead Labor not found with ID: ${leadLaborId}`);
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  static async update(leadLaborId, updateData) {
    try {
      const { data, error } = await supabase
        .from('lead_labor')
        .update(updateData)
        .eq('id', leadLaborId)
        .select(`
          *,
          users (
            id,
            full_name,
            email,
            phone,
            role,
            status,
            photo_url,
            created_at
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

  static async delete(leadLaborId) {
    try {
      const leadLabor = await this.getLeadLaborById(leadLaborId);
      const userId = leadLabor.user_id;
      
      const { error: leadLaborError } = await supabase
        .from('lead_labor')
        .delete()
        .eq('id', leadLaborId);

      if (leadLaborError) {
        throw new Error(`Database error: ${leadLaborError.message}`);
      }

      const { error: userError } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (userError) {
        throw new Error(`Database error: ${userError.message}`);
      }

      return {
        success: true,
        message: `Lead Labor "${leadLabor.users.full_name}" deleted successfully`,
        deleted_lead_labor: {
          id: leadLabor.id,
          full_name: leadLabor.users.full_name,
          email: leadLabor.users.email,
          labor_code: leadLabor.labor_code,
          department: leadLabor.department
        }
      };
    } catch (error) {
      throw error;
    }
  }

  static async getLeadLaborByUserId(userId) {
    try {
      const { data, error } = await supabase
        .from('lead_labor')
        .select(`
          *,
          users (
            id,
            full_name,
            email,
            phone,
            role,
            status,
            photo_url,
            created_at
          )
        `)
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new Error(`Database error: ${error.message}`);
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  static async findByLaborCode(laborCode) {
    try {
      const { data, error } = await supabase
        .from('lead_labor')
        .select('*')
        .eq('labor_code', laborCode)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new Error(`Database error: ${error.message}`);
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  static async generateNextLaborCode() {
    try {
      const currentYear = new Date().getFullYear();
      const prefix = `LL-${currentYear}-`;
      
      const { data, error } = await supabase
        .from('lead_labor')
        .select('labor_code')
        .like('labor_code', `${prefix}%`)
        .order('labor_code', { ascending: false })
        .limit(1);

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      let nextNumber = 1;
      if (data && data.length > 0) {
        const lastCode = data[0].labor_code;
        const lastNumber = parseInt(lastCode.split('-')[2]);
        nextNumber = lastNumber + 1;
      }

      return `${prefix}${nextNumber.toString().padStart(3, '0')}`;
    } catch (error) {
      throw error;
    }
  }
}
