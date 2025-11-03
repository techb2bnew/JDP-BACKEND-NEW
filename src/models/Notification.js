import { supabase } from '../config/database.js';

export class Notification {
  static async create(notificationData) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert([notificationData])
        .select(`
          *,
          user:users!notifications_user_id_fkey (
            id,
            full_name,
            email
          ),
          lead_labor:lead_labor_id (
            id,
            labor_code,
            department,
            specialization
          ),
          labor:labor_id (
            id,
            labor_code,
            trade,
            experience
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
        .from('notifications')
        .select(`
          *,
          user:users!notifications_user_id_fkey (
            id,
            full_name,
            email
          ),
          lead_labor:lead_labor_id (
            id,
            labor_code,
            department,
            specialization
          ),
          labor:labor_id (
            id,
            labor_code,
            trade,
            experience
          )
        `)
        .eq('id', id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new Error(`Database error: ${error.message}`);
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  static async findByUserId(userId, options = {}) {
    try {
      const { page = 1, limit = 20, is_read, type, orderBy = 'created_at', order = 'desc' } = options;
      const offset = (page - 1) * limit;

      let query = supabase
        .from('notifications')
        .select(`
          *,
          user:users!notifications_user_id_fkey (
            id,
            full_name,
            email
          ),
          lead_labor:lead_labor_id (
            id,
            labor_code,
            department,
            specialization
          ),
          labor:labor_id (
            id,
            labor_code,
            trade,
            experience
          )
        `, { count: 'exact' })
        .eq('user_id', userId);

      if (is_read !== undefined) {
        query = query.eq('is_read', is_read);
      }

      if (type) {
        query = query.eq('type', type);
      }

      query = query.order(orderBy, { ascending: order === 'asc' })
        .range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return {
        notifications: data || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit)
        }
      };
    } catch (error) {
      throw error;
    }
  }

  static async update(id, updateData) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .update({
          ...updateData,
          ...(updateData.is_read && !updateData.read_at ? { read_at: new Date().toISOString() } : {})
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

  static async markAsRead(id) {
    try {
      return await this.update(id, {
        is_read: true,
        read_at: new Date().toISOString()
      });
    } catch (error) {
      throw error;
    }
  }

  static async markAllAsRead(userId) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('is_read', false)
        .select();

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      throw error;
    }
  }

  static async getUnreadCount(userId) {
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return count || 0;
    } catch (error) {
      throw error;
    }
  }

  static async delete(id) {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return { success: true, message: 'Notification deleted successfully' };
    } catch (error) {
      throw error;
    }
  }

  static async deleteByUserId(userId) {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', userId);

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return { success: true, message: 'All notifications deleted successfully' };
    } catch (error) {
      throw error;
    }
  }
}

