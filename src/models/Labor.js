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

  static async getLaborByJob(jobId, page = 1, limit = 10) {
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
        .eq('job_id', jobId)
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

  static async search(filters, pagination = {}) {
    try {
      const q = (filters.q || '').toLowerCase().trim();

      // Fetch all labor with user relationships
      const { data, error } = await supabase
        .from("labor")
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
          )
        `);

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      const inStr = (s) => (s || '').toString().toLowerCase().includes(q);

      const matches = (labor) => {
        // Text search across multiple fields
        if (q) {
          const laborMatch = inStr(labor.users?.full_name) || 
                            inStr(labor.users?.email) || 
                            inStr(labor.users?.phone) || 
                            inStr(labor.trade) ||
                            inStr(labor.experience) ||
                            inStr(labor.availability);
          if (!laborMatch) return false;
        }

        // Exact field filters
        if (filters.name && !inStr(labor.users?.full_name)) return false;
        if (filters.contact && !inStr(labor.users?.phone) && !inStr(labor.users?.email)) return false;
        if (filters.trade && !inStr(labor.trade)) return false;
        if (filters.experience && !inStr(labor.experience)) return false;
        if (filters.availability && !inStr(labor.availability)) return false;
        if (filters.status && labor.users?.status !== filters.status) return false;

        return true;
      };

      let filtered = (data || []).filter(matches);

      // Sort by created_at (most recent first)
      filtered = filtered.sort((a, b) => {
        const dateA = new Date(a.created_at || 0);
        const dateB = new Date(b.created_at || 0);
        return dateB - dateA;
      });

      const page = parseInt(pagination.page) || 1;
      const limit = parseInt(pagination.limit) || 10;
      const offset = (page - 1) * limit;
      const sliced = filtered.slice(offset, offset + limit);

      return {
        labor: this.parseLaborData(sliced),
        total: filtered.length,
        page,
        limit,
        totalPages: Math.ceil(filtered.length / limit) || 1
      };
    } catch (error) {
      throw error;
    }
  }
}
