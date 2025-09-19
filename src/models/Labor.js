import { supabase } from '../config/database.js';

export class Labor {
  static parseLaborData(data) {
    if (!data) return data;
    
    if (!Array.isArray(data)) {
      const parsedData = { ...data }; 
      
      if (parsedData.certifications && typeof parsedData.certifications === 'string') {
        try {
          parsedData.certifications = JSON.parse(parsedData.certifications);
        } catch (e) {
        }
      }
      if (parsedData.skills && typeof parsedData.skills === 'string') {
        try {
          parsedData.skills = JSON.parse(parsedData.skills);
        } catch (e) {
        }
      }
      return parsedData;
    }
    
    return data.map(item => this.parseLaborData(item));
  }
  static async create(laborData) {
    try {
      const { data, error } = await supabase
        .from('labor')
        .insert([laborData])
        .select(`
          *,
          users!labor_user_id_fkey (
            id,
            full_name,
            email,
            phone,
            role,
            status,
            photo_url,
            created_at
          ),
          supervisor:users!labor_supervisor_id_fkey (
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

      return this.parseLaborData(data);
    } catch (error) {
      throw error;
    }
  }

  static async getAllLabor(page = 1, limit = 10) {
    try {
      const offset = (page - 1) * limit;

      const { count, error: countError } = await supabase
        .from('labor')
        .select('*', { count: 'exact', head: true });

      if (countError) {
        throw new Error(`Database error: ${countError.message}`);
      }

      const { data, error } = await supabase
        .from('labor')
        .select(`
          *,
          users!labor_user_id_fkey (
            id,
            full_name,
            email,
            phone,
            role,
            status,
            photo_url,
            created_at
          ),
          supervisor:users!labor_supervisor_id_fkey (
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
        .order('id', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      const totalPages = Math.ceil(count / limit);

      return {
        data: this.parseLaborData(data || []),
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

  static async getLaborById(laborId) {
    try {
      const { data, error } = await supabase
        .from('labor')
        .select(`
          *,
          users!labor_user_id_fkey (
            id,
            full_name,
            email,
            phone,
            role,
            status,
            photo_url,
            created_at
          ),
          supervisor:users!labor_supervisor_id_fkey (
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
        .eq('id', laborId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new Error(`Database error: ${error.message}`);
      }

      if (!data) {
        throw new Error(`Labor not found with ID: ${laborId}`);
      }

      return this.parseLaborData(data);
    } catch (error) {
      throw error;
    }
  }

  static async update(laborId, updateData) {
    try {
      const { data, error } = await supabase
        .from('labor')
        .update(updateData)
        .eq('id', laborId)
        .select(`
          *,
          users!labor_user_id_fkey (
            id,
            full_name,
            email,
            phone,
            role,
            status,
            photo_url,
            created_at
          ),
          supervisor:users!labor_supervisor_id_fkey (
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

      return this.parseLaborData(data);
    } catch (error) {
      throw error;
    }
  }

  static async delete(laborId) {
    try {
      const labor = await this.getLaborById(laborId);
      const userId = labor.user_id;
      
      const { error: laborError } = await supabase
        .from('labor')
        .delete()
        .eq('id', laborId);

      if (laborError) {
        throw new Error(`Database error: ${laborError.message}`);
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
        message: `Labor "${labor.users.full_name}" deleted successfully`,
        deleted_labor: {
          id: labor.id,
          full_name: labor.users.full_name,
          email: labor.users.email,
          labor_code: labor.labor_code,
          trade: labor.trade
        }
      };
    } catch (error) {
      throw error;
    }
  }

  static async getLaborByUserId(userId) {
    try {
      const { data, error } = await supabase
        .from('labor')
        .select(`
          *,
          users!labor_user_id_fkey (
            id,
            full_name,
            email,
            phone,
            role,
            status,
            photo_url,
            created_at
          ),
          supervisor:users!labor_supervisor_id_fkey (
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

      return this.parseLaborData(data);
    } catch (error) {
      throw error;
    }
  }

  static async findByLaborCode(laborCode) {
    try {
      const { data, error } = await supabase
        .from('labor')
        .select('*')
        .eq('labor_code', laborCode)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new Error(`Database error: ${error.message}`);
      }

      return this.parseLaborData(data);
    } catch (error) {
      throw error;
    }
  }

  static async generateNextLaborCode() {
    try {
      const currentYear = new Date().getFullYear();
      const prefix = `LB-${currentYear}-`;
      
      const { data, error } = await supabase
        .from('labor')
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
        const match = lastCode.match(new RegExp(`${prefix}(\\d+)`));
        if (match) {
          nextNumber = parseInt(match[1]) + 1;
        }
      }

      const formattedNumber = nextNumber.toString().padStart(3, '0');
      
      return `${prefix}${formattedNumber}`;
    } catch (error) {
      throw error;
    }
  }

  static async getCustomLabor(page = 1, limit = 10) {
    try {
      const offset = (page - 1) * limit;

      const { data, error, count } = await supabase
        .from('labor')
        .select(`
          *,
          users!labor_user_id_fkey (
            id,
            full_name,
            email,
            phone,
            role,
            status,
            photo_url,
            created_at
          ),
          supervisor:users!labor_supervisor_id_fkey (
            id,
            full_name,
            email,
            phone,
            role,
            status,
            photo_url,
            created_at
          )
        `, { count: 'exact' })
        .eq('is_custom', true)
        .order('id', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return {
        labor: this.parseLaborData(data || []),
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit)
      };
    } catch (error) {
      throw error;
    }
  }
}
