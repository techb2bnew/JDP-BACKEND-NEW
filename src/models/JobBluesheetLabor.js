import { supabase } from '../config/database.js';

export class JobBluesheetLabor {
  static async create(laborData) {
    try {
      // Calculate total hours and total cost
      const regularHours = laborData.regular_hours || '0h';
      const overtimeHours = laborData.overtime_hours || '0h';
      const hourlyRate = parseFloat(laborData.hourly_rate) || 0;
      
      // Convert hours to decimal for calculation
      const regularHoursDecimal = JobBluesheetLabor.convertHoursToDecimal(regularHours);
      const overtimeHoursDecimal = JobBluesheetLabor.convertHoursToDecimal(overtimeHours);
      const totalHoursDecimal = regularHoursDecimal + overtimeHoursDecimal;
      
      // Calculate total cost
      const totalCost = totalHoursDecimal * hourlyRate;
      
      // Convert back to hours format
      const totalHours = JobBluesheetLabor.convertDecimalToHours(totalHoursDecimal);
      
      const laborEntryData = {
        ...laborData,
        total_hours: totalHours,
        total_cost: totalCost
      };

      const { data, error } = await supabase
        .from('job_bluesheet_labor')
        .insert([laborEntryData])
        .select(`
          *,
          labor:labor_id (
            id,
            labor_code,
            users!labor_user_id_fkey (
              id,
              full_name,
              email
            )
          ),
          lead_labor:lead_labor_id (
            id,
            labor_code,
            users!lead_labor_user_id_fkey (
              id,
              full_name,
              email
            )
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

  static async findById(id) {
    try {
      const { data, error } = await supabase
        .from('job_bluesheet_labor')
        .select(`
          *,
          labor:labor_id (
            id,
            labor_code,
            users!labor_user_id_fkey (
              id,
              full_name,
              email
            )
          ),
          lead_labor:lead_labor_id (
            id,
            labor_code,
            users!lead_labor_user_id_fkey (
              id,
              full_name,
              email
            )
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
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new Error('Labor entry not found');
        }
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
        .from('job_bluesheet_labor')
        .select(`
          *,
          labor:labor_id (
            id,
            labor_code,
            users!labor_user_id_fkey (
              id,
              full_name,
              email
            )
          ),
          lead_labor:lead_labor_id (
            id,
            labor_code,
            users!lead_labor_user_id_fkey (
              id,
              full_name,
              email
            )
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
        .from('job_bluesheet_labor')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select(`
          *,
          labor:labor_id (
            id,
            labor_code,
            users!labor_user_id_fkey (
              id,
              full_name,
              email
            )
          ),
          lead_labor:lead_labor_id (
            id,
            labor_code,
            users!lead_labor_user_id_fkey (
              id,
              full_name,
              email
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

  static async delete(id) {
    try {
      const { error } = await supabase
        .from('job_bluesheet_labor')
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return { success: true, message: 'Labor entry deleted successfully' };
    } catch (error) {
      throw error;
    }
  }

  static async calculateTotalCost(bluesheetId) {
    try {
      const { data, error } = await supabase
        .from('job_bluesheet_labor')
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

  // Helper method to convert hours string to decimal
  static convertHoursToDecimal(hoursString) {
    if (!hoursString || typeof hoursString !== 'string') return 0;
    
    // Handle formats like "8h", "8h30m", "8.5h"
    const match = hoursString.match(/(\d+(?:\.\d+)?)h(?:\d+m)?/);
    if (match) {
      return parseFloat(match[1]);
    }
    
    // Handle formats like "8:30" (8 hours 30 minutes)
    const timeMatch = hoursString.match(/(\d+):(\d+)/);
    if (timeMatch) {
      const hours = parseInt(timeMatch[1]);
      const minutes = parseInt(timeMatch[2]);
      return hours + (minutes / 60);
    }
    
    return 0;
  }

  // Helper method to convert decimal hours to hours string
  static convertDecimalToHours(decimalHours) {
    if (!decimalHours || decimalHours === 0) return '0h';
    
    const hours = Math.floor(decimalHours);
    const minutes = Math.round((decimalHours - hours) * 60);
    
    if (minutes === 0) {
      return `${hours}h`;
    } else {
      return `${hours}h${minutes}m`;
    }
  }
}
