import { supabase } from '../config/database.js';

export class Staff {
  static async create(staffData) {
    try {
      const { data, error } = await supabase
        .from('staff')
        .insert([staffData])
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

  static async getAllStaff(page = 1, limit = 10) {
    try {
      const offset = (page - 1) * limit;

      const { count, error: countError } = await supabase
        .from('staff')
        .select('*', { count: 'exact', head: true });

      if (countError) {
        throw new Error(`Database error: ${countError.message}`);
      }

      const { data, error } = await supabase
        .from('staff')
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

  static async getStaffById(staffId) {
    try {      
      const { data, error } = await supabase
        .from('staff')
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
        .eq('id', staffId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new Error(`Database error: ${error.message}`);
      }

      if (!data) {
        throw new Error(`Staff not found with ID: ${staffId}`);
      }
      return data;
    } catch (error) {
      throw error;
    }
  }

  static async update(staffId, updateData) {
    try {
      const { data, error } = await supabase
        .from('staff')
        .update(updateData)
        .eq('id', staffId)
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

  static async delete(staffId) {
    try {
      const staff = await this.getStaffById(staffId);
      const userId = staff.user_id;
      const { error: staffError } = await supabase
        .from('staff')
        .delete()
        .eq('id', staffId);

      if (staffError) {
        throw new Error(`Database error: ${staffError.message}`);
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
        message: `Staff "${staff.users.full_name}" deleted successfully`,
        deleted_staff: {
          id: staff.id,
          full_name: staff.users.full_name,
          email: staff.users.email,
          position: staff.position,
          department: staff.department
        }
      };
    } catch (error) {
      throw error;
    }
  }

  static async getStaffByUserId(userId) {
    try {
      const { data, error } = await supabase
        .from('staff')
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
}
