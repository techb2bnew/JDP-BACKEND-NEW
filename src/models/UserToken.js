import { supabase } from '../config/database.js';

export class UserToken {
  static async create(tokenData) {
    try {
      const { data, error } = await supabase
        .from('user_tokens')
        .insert([tokenData])
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

  static async findByToken(token) {
    try {
      const { data, error } = await supabase
        .from('user_tokens')
        .select(`
          *,
          users!user_tokens_user_id_fkey (
            id,
            full_name,
            email,
            role,
            status,
            photo_url,
            management_type
          )
        `)
        .eq('token', token)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new Error(`Database error: ${error.message}`);
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  static async deactivateToken(token) {
    try {
      const existingToken = await this.findByToken(token);
      if (!existingToken) {
        throw new Error('Token not found');
      }

      const { data, error } = await supabase
        .from('user_tokens')
        .delete()
        .eq('token', token)
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

  static async deactivateAllUserTokens(userId) {
    try {
      
      const { data, error } = await supabase
        .from('user_tokens')
        .delete()
        .eq('user_id', userId)
        .eq('is_active', true)
        .select();

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  static async cleanupExpiredTokens() {
    try {
    
      const { data, error } = await supabase
        .from('user_tokens')
        .delete()
        .lt('expires_at', new Date().toISOString())
        .eq('is_active', true)
        .select();

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  static async getUserActiveTokens(userId) {
    try {
      const { data, error } = await supabase
        .from('user_tokens')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return data;
    } catch (error) {
      throw error;
    }
  }
}
