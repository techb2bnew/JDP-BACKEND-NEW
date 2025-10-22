import { supabase } from '../config/database.js';

export class HourlyRate {
  static async findAll() {
    try {
      const { data, error } = await supabase
        .from('hourly_rates')
        .select(`
          *,
          created_by_user:users!hourly_rates_created_by_fkey(
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

  static async findById(id) {
    try {
      const { data, error } = await supabase
        .from('hourly_rates')
        .select(`
          *,
          created_by_user:users!hourly_rates_created_by_fkey(
            id,
            full_name,
            email
          )
        `)
        .eq('id', id)
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

  static async create(rateData) {
    try {
      const { data, error } = await supabase
        .from('hourly_rates')
        .insert([rateData])
        .select(`
          *,
          created_by_user:users!hourly_rates_created_by_fkey(
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

  static async update(id, updateData) {
    try {
      const { data, error } = await supabase
        .from('hourly_rates')
        .update(updateData)
        .eq('id', id)
        .eq('is_active', true)
        .select(`
          *,
          created_by_user:users!hourly_rates_created_by_fkey(
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
        .from('hourly_rates')
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

  static async updateOrder(rates) {
    try {
      const { data, error } = await supabase
        .from('hourly_rates')
        .upsert(rates)
        .select();

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return data;
    } catch (error) {
      throw error;
    }
  }
}
