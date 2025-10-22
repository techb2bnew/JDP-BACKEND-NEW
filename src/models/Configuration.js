import { supabase } from '../config/database.js';

export class Configuration {
  static async getConfiguration() {
    try {
      const { data, error } = await supabase
        .from('configuration')
        .select(`
          *,
          last_updated_by_user:users!configuration_last_updated_by_fkey(
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

  static async updateConfiguration(settings, markupPercentage, userId) {
    try {
      const { data, error } = await supabase
        .from('configuration')
        .update({
          settings: settings,
          markup_percentage: markupPercentage,
          last_updated_by: userId
        })
        .eq('is_active', true)
        .select(`
          *,
          last_updated_by_user:users!configuration_last_updated_by_fkey(
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

  static async createConfiguration(settings, markupPercentage, userId) {
    try {
      const { data, error } = await supabase
        .from('configuration')
        .insert([{
          settings: settings,
          markup_percentage: markupPercentage,
          last_updated_by: userId
        }])
        .select(`
          *,
          last_updated_by_user:users!configuration_last_updated_by_fkey(
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

  static async upsertConfiguration(settings, markupPercentage, userId) {
    try {
      // First check if configuration exists
      const existingConfig = await this.getConfiguration();
      
      if (existingConfig) {
        // Update existing configuration
        return await this.updateConfiguration(settings, markupPercentage, userId);
      } else {
        // Create new configuration
        return await this.createConfiguration(settings, markupPercentage, userId);
      }
    } catch (error) {
      throw error;
    }
  }
}
