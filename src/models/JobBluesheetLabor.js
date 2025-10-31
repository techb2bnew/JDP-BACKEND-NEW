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

      // Load active configuration snapshot and compute billing
      const { rates: activeRates, snapshot: rateSnapshot } = await JobBluesheetLabor.loadActiveRates(true);
      const { hourlyRate, totalCost } = JobBluesheetLabor.calculateBillingFromNormalizedRates(
        regularHoursDecimal,
        overtimeHoursDecimal,
        activeRates
      );

      // Convert back to hours format
      const totalHours = JobBluesheetLabor.convertDecimalToHours(totalHoursDecimal);

      const laborEntryData = {
        ...laborData,
        hourly_rate: hourlyRate,
        total_hours: totalHours,
        total_cost: totalCost,
        rate_snapshot: rateSnapshot
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
      const shouldRecalculate = Object.prototype.hasOwnProperty.call(updateData, 'regular_hours') ||
        Object.prototype.hasOwnProperty.call(updateData, 'overtime_hours');

      if (shouldRecalculate) {
        const { data: existingEntry, error: fetchError } = await supabase
          .from('job_bluesheet_labor')
          .select('regular_hours, overtime_hours, rate_snapshot')
          .eq('id', id)
          .single();

        if (fetchError) {
          if (fetchError.code === 'PGRST116') {
            throw new Error('Labor entry not found for update recalculation');
          }
          throw new Error(`Database error while fetching labor entry: ${fetchError.message}`);
        }

        const regularHours = Object.prototype.hasOwnProperty.call(updateData, 'regular_hours')
          ? (updateData.regular_hours ?? '0h')
          : (existingEntry?.regular_hours ?? '0h');

        const overtimeHours = Object.prototype.hasOwnProperty.call(updateData, 'overtime_hours')
          ? (updateData.overtime_hours ?? '0h')
          : (existingEntry?.overtime_hours ?? '0h');

        const regularHoursDecimal = JobBluesheetLabor.convertHoursToDecimal(regularHours);
        const overtimeHoursDecimal = JobBluesheetLabor.convertHoursToDecimal(overtimeHours);
        const totalHoursDecimal = regularHoursDecimal + overtimeHoursDecimal;

        let rateSnapshot = existingEntry?.rate_snapshot || null;
        let normalizedRates;

        if (rateSnapshot && Array.isArray(rateSnapshot.hourly_rates) && rateSnapshot.hourly_rates.length > 0) {
          normalizedRates = JobBluesheetLabor.normalizeRates(rateSnapshot.hourly_rates);
        } else {
          const { rates: activeRates, snapshot } = await JobBluesheetLabor.loadActiveRates(true);
          normalizedRates = activeRates;
          rateSnapshot = snapshot;
        }

        const { hourlyRate, totalCost } = JobBluesheetLabor.calculateBillingFromNormalizedRates(
          regularHoursDecimal,
          overtimeHoursDecimal,
          normalizedRates
        );
        const totalHours = JobBluesheetLabor.convertDecimalToHours(totalHoursDecimal);

        updateData.hourly_rate = hourlyRate;
        updateData.total_hours = totalHours;
        updateData.total_cost = totalCost;
        updateData.rate_snapshot = rateSnapshot
          ? {
              ...rateSnapshot,
              hourly_rates: normalizedRates.map((rate) => ({ ...rate }))
            }
          : null;
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
  static async getHourlyRateFromConfig(regularHoursDecimal, ratesOverride = null) {
    try {
      const normalizedRates = ratesOverride
        ? JobBluesheetLabor.normalizeRates(ratesOverride)
        : (await JobBluesheetLabor.loadActiveRates()).rates;

      const { hourlyRate } = JobBluesheetLabor.calculateBillingFromNormalizedRates(
        regularHoursDecimal,
        0,
        normalizedRates
      );

      return hourlyRate;
    } catch (error) {
      console.error('Error fetching configuration for hourly rate:', error);
      throw error;
    }
  }

  // Calculate dynamic cost based on regular hours and configuration
  static async calculateDynamicCost(regularHoursDecimal, overtimeHoursDecimal, ratesOverride = null) {
    try {
      const normalizedRates = ratesOverride
        ? JobBluesheetLabor.normalizeRates(ratesOverride)
        : (await JobBluesheetLabor.loadActiveRates()).rates;

      const { totalCost } = JobBluesheetLabor.calculateBillingFromNormalizedRates(
        regularHoursDecimal,
        overtimeHoursDecimal,
        normalizedRates
      );

      return totalCost;
    } catch (error) {
      console.error('Error fetching configuration for labor rates:', error);
      throw error;
    }
  }

  static async loadActiveRates(includeSnapshot = false) {
    const config = await Configuration.getConfiguration();

    if (!config) {
      throw new Error('Active configuration not found');
    }

    const hourlyRates = config.settings?.hourly_rates;

    if (!Array.isArray(hourlyRates) || hourlyRates.length === 0) {
      throw new Error('Hourly rate configuration is missing or empty');
    }

    const normalizedRates = JobBluesheetLabor.normalizeRates(hourlyRates);

    if (!includeSnapshot) {
      return { rates: normalizedRates };
    }

    return {
      rates: normalizedRates,
      snapshot: {
        configuration_id: config.id ?? null,
        configuration_updated_at: config.updated_at ?? null,
        captured_at: new Date().toISOString(),
        hourly_rates: normalizedRates.map((rate) => ({ ...rate }))
      }
    };
  }

  static async findBluesheetIdsByLeadLaborId(leadLaborId) {
    return JobBluesheetLabor.findBluesheetIdsByField('lead_labor_id', leadLaborId);
  }

  static async findBluesheetIdsByLaborId(laborId) {
    return JobBluesheetLabor.findBluesheetIdsByField('labor_id', laborId);
  }

  static async findBluesheetIdsByField(field, value) {
    if (!value) {
      return [];
    }

    const { data, error } = await supabase
      .from('job_bluesheet_labor')
      .select('job_bluesheet_id')
      .eq(field, value);

    if (error) {
      throw new Error(`Database error (bluesheet lookup by ${field}): ${error.message}`);
    }

    const ids = new Set();

    for (const row of data || []) {
      if (row.job_bluesheet_id) {
        ids.add(row.job_bluesheet_id);
      }
    }

    return Array.from(ids);
  }

  static normalizeRates(rates) {
    if (!Array.isArray(rates) || rates.length === 0) {
      throw new Error('Hourly rate configuration is missing or empty');
    }

    const normalizedRates = rates
      .map((rate) => {
        const numericRate = Number(rate.rate);
        const hasMax = rate.max_hours !== undefined && rate.max_hours !== null;
        const numericMax = hasMax ? Number(rate.max_hours) : null;

        if (!Number.isFinite(numericRate)) {
          throw new Error('Hourly rate value must be numeric');
        }

        if (hasMax && !Number.isFinite(numericMax)) {
          throw new Error('Hourly rate max_hours must be numeric');
        }

        return {
          ...rate,
          rate: numericRate,
          max_hours: hasMax ? numericMax : null
        };
      })
      .sort((a, b) => {
        const maxA = a.max_hours === null ? Number.POSITIVE_INFINITY : a.max_hours;
        const maxB = b.max_hours === null ? Number.POSITIVE_INFINITY : b.max_hours;
        return maxA - maxB;
      });

    if (normalizedRates.length === 0) {
      throw new Error('Hourly rate configuration is missing or empty');
    }

    return normalizedRates;
  }

  static calculateBillingFromNormalizedRates(regularHoursDecimal, overtimeHoursDecimal, normalizedRates) {
    if (!Array.isArray(normalizedRates) || normalizedRates.length === 0) {
      throw new Error('Hourly rate configuration is missing or empty');
    }

    const regularHours = Number(regularHoursDecimal) || 0;
    const overtimeHours = Number(overtimeHoursDecimal) || 0;

    const firstTier = normalizedRates[0];
    const lastTier = normalizedRates[normalizedRates.length - 1];

    const fullRegularHours = Math.ceil(Math.max(0, regularHours));

    let tierForRegular = firstTier;

    if (normalizedRates.length > 1 && fullRegularHours > 0) {
      const matchingTier = normalizedRates.find((tier, index) => {
        if (tier.max_hours === null) {
          return index === normalizedRates.length - 1;
        }
        return fullRegularHours <= tier.max_hours;
      });

      if (matchingTier) {
        tierForRegular = matchingTier;
      } else {
        tierForRegular = lastTier;
      }
    }

    let hourlyRate = tierForRegular.rate;
    let totalCost = 0;

    if (regularHours > 0) {
      if (tierForRegular === firstTier && firstTier.max_hours !== null) {
        const billableTier1Hours = Math.max(firstTier.max_hours, fullRegularHours);
        totalCost = billableTier1Hours * firstTier.rate;
      } else {
        totalCost = fullRegularHours * tierForRegular.rate;
      }
    }

    if (overtimeHours > 0) {
      const overtimeBillableHours = Math.ceil(Math.max(0, overtimeHours));
      totalCost += overtimeBillableHours * lastTier.rate;
    }

    return {
      hourlyRate,
      totalCost: Math.round(totalCost * 100) / 100
    };
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
