import { supabase } from '../config/database.js';

export class SystemSetting {
  static async getMarkupPercentage() {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select(`
          *,
          last_updated_by_user:users!system_settings_last_updated_by_fkey(
            id,
            full_name,
            email
          )
        `)
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

  static async findAll() {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select(`
          *,
          last_updated_by_user:users!system_settings_last_updated_by_fkey(
            id,
            full_name,
            email
          )
        `)
        .eq('is_active', true)
        .order('id', { ascending: true });

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  static async create(settingData) {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .insert([settingData])
        .select(`
          *,
          last_updated_by_user:users!system_settings_last_updated_by_fkey(
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

  static async updateMarkupPercentage(updateData) {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .update(updateData)
        .eq('is_active', true)
        .select(`
          *,
          last_updated_by_user:users!system_settings_last_updated_by_fkey(
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

  static async upsert(settingData) {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .upsert([settingData])
        .select(`
          *,
          last_updated_by_user:users!system_settings_last_updated_by_fkey(
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

  static async delete(id) {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .update({ is_active: false })
        .eq('id', id)
        .eq('is_active', true)
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
}
