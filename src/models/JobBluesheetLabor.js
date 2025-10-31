import { supabase } from '../config/database.js';
import { Configuration } from './Configuration.js';

export class JobBluesheetLabor {
  static async create(laborData) {
    try {
      // Calculate total hours and total cost using dynamic rates
      const regularHours = laborData.regular_hours || '0h';
      const overtimeHours = laborData.overtime_hours || '0h';
      
      // Convert hours to decimal for calculation
      const regularHoursDecimal = JobBluesheetLabor.convertHoursToDecimal(regularHours);
      const overtimeHoursDecimal = JobBluesheetLabor.convertHoursToDecimal(overtimeHours);
      const totalHoursDecimal = regularHoursDecimal + overtimeHoursDecimal;
      
      // Get hourly rate from configuration based on regular hours
      const hourlyRate = await JobBluesheetLabor.getHourlyRateFromConfig(regularHoursDecimal);
      
      // Calculate total cost using dynamic rates from configuration
      const totalCost = await JobBluesheetLabor.calculateDynamicCost(regularHoursDecimal, overtimeHoursDecimal);
      
      // Convert back to hours format
      const totalHours = JobBluesheetLabor.convertDecimalToHours(totalHoursDecimal);
      
      const laborEntryData = {
        ...laborData,
        hourly_rate: hourlyRate, // Store calculated rate from configuration
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
      // If regular_hours or overtime_hours are being updated, recalculate cost
      if (updateData.regular_hours || updateData.overtime_hours) {
        const regularHours = updateData.regular_hours || '0h';
        const overtimeHours = updateData.overtime_hours || '0h';
        
        // Convert hours to decimal
        const regularHoursDecimal = JobBluesheetLabor.convertHoursToDecimal(regularHours);
        const overtimeHoursDecimal = JobBluesheetLabor.convertHoursToDecimal(overtimeHours);
        const totalHoursDecimal = regularHoursDecimal + overtimeHoursDecimal;
        
        // Get hourly rate from configuration based on regular hours
        const hourlyRate = await JobBluesheetLabor.getHourlyRateFromConfig(regularHoursDecimal);
        
        // Calculate total cost using dynamic rates from configuration
        const totalCost = await JobBluesheetLabor.calculateDynamicCost(regularHoursDecimal, overtimeHoursDecimal);
        const totalHours = JobBluesheetLabor.convertDecimalToHours(totalHoursDecimal);
        
        updateData.hourly_rate = hourlyRate; // Store calculated rate from configuration
        updateData.total_hours = totalHours;
        updateData.total_cost = totalCost;
      }

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

  // Get hourly rate from configuration based on regular hours
  static async getHourlyRateFromConfig(regularHoursDecimal) {
    try {
      // Get configuration
      const config = await Configuration.getConfiguration();
      
      // Default values if config not found
      let hourlyRates = [
        { max_hours: 3, rate: 50 },
        { max_hours: 5, rate: 60 }
      ];
      
      // Extract hourly rates from configuration
      if (config && config.settings && config.settings.hourly_rates) {
        hourlyRates = config.settings.hourly_rates;
      }
      
      // Sort rates by max_hours ascending
      const sortedRates = hourlyRates.sort((a, b) => a.max_hours - b.max_hours);
      const firstTier = sortedRates[0];
      const lastTier = sortedRates[sortedRates.length - 1];

      const fullHours = Math.ceil(regularHoursDecimal || 0);

      // If hours cross first tier max, return tier 2 rate (for display)
      if (fullHours > firstTier.max_hours) {
        return lastTier.rate;
      }

      // Within tier 1: return tier 1 rate
      return firstTier.rate;
    } catch (error) {
      // Fallback to default rate if config fetch fails
      console.error('Error fetching configuration for hourly rate:', error);
      return 60; // Default rate
    }
  }

  // Calculate dynamic cost based on regular hours and configuration
  static async calculateDynamicCost(regularHoursDecimal, overtimeHoursDecimal) {
    try {
      // Get configuration
      const config = await Configuration.getConfiguration();
      
      // Default values if config not found
      let hourlyRates = [
        { max_hours: 3, rate: 50 },
        { max_hours: 5, rate: 60 }
      ];
      
      // Extract hourly rates from configuration
      if (config && config.settings && config.settings.hourly_rates) {
        hourlyRates = config.settings.hourly_rates;
      }
      
      // Sort rates by max_hours ascending
      const sortedRates = hourlyRates.sort((a, b) => a.max_hours - b.max_hours);
      
      let totalCost = 0;

      // Calculate cost for regular hours using tier-crossing logic
      if (regularHoursDecimal > 0) {
        const fullHours = Math.ceil(regularHoursDecimal); // Round up to next hour for billing
        const firstTier = sortedRates[0];
        const lastTier = sortedRates[sortedRates.length - 1];

        // If hours cross first tier max, ALL rounded hours at tier 2 rate
        if (fullHours > firstTier.max_hours) {
          // All hours charged at tier 2 rate
          totalCost = fullHours * lastTier.rate;
        } else {
          // Within tier 1: all hours at tier 1 rate (minimum 3h)
          const billableTier1Hours = Math.max(firstTier.max_hours, fullHours);
          totalCost = billableTier1Hours * firstTier.rate;
        }
      }
      
      // Calculate cost for overtime hours (use highest rate)
      if (overtimeHoursDecimal > 0) {
        const overtimeRate = sortedRates[sortedRates.length - 1].rate;
        const fullOvertimeHours = Math.ceil(overtimeHoursDecimal); // Round up to next hour
        totalCost += fullOvertimeHours * overtimeRate;
      }
      
      return Math.round(totalCost * 100) / 100; // Round to 2 decimal places
    } catch (error) {
      // Fallback to default calculation if config fetch fails
      console.error('Error fetching configuration for labor rates:', error);
      const regularRate = 60;
      const overtimeRate = 70;
      return (regularHoursDecimal > 0 ? regularRate : 0) + (overtimeHoursDecimal > 0 ? overtimeRate : 0);
    }
  }

  // Helper method to convert hours string to decimal
  static convertHoursToDecimal(hoursString) {
    if (!hoursString || typeof hoursString !== 'string') return 0;
    
    // Handle time format like "12:00:00", "02:30:00", "00:01:12"
    const timeMatch = hoursString.match(/(\d+):(\d+):(\d+)/);
    if (timeMatch) {
      const hours = parseInt(timeMatch[1]);
      const minutes = parseInt(timeMatch[2]);
      const seconds = parseInt(timeMatch[3]);
      return hours + (minutes / 60) + (seconds / 3600);
    }
    
    // Handle formats like "8h", "8h30m", "8.5h"
    const match = hoursString.match(/(\d+(?:\.\d+)?)h(?:\d+m)?/);
    if (match) {
      return parseFloat(match[1]);
    }
    
    // Handle formats like "8:30" (8 hours 30 minutes)
    const shortTimeMatch = hoursString.match(/(\d+):(\d+)/);
    if (shortTimeMatch) {
      const hours = parseInt(shortTimeMatch[1]);
      const minutes = parseInt(shortTimeMatch[2]);
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
