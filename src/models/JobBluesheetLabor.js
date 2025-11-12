import { supabase } from '../config/database.js';
import { Configuration } from './Configuration.js';

export class JobBluesheetLabor {
  static async create(laborData) {
    try {
    
      const regularHours = laborData.regular_hours || '0h';
      const overtimeHours = laborData.overtime_hours || '0h';

     
      const regularHoursDecimal = JobBluesheetLabor.convertHoursToDecimal(regularHours);
      const overtimeHoursDecimal = JobBluesheetLabor.convertHoursToDecimal(overtimeHours);
      const totalHoursDecimal = regularHoursDecimal + overtimeHoursDecimal;

   
      const { rates: activeRates, snapshot: rateSnapshot } = await JobBluesheetLabor.loadActiveRates(true);
      const { hourlyRate, totalCost, matchedTier } = JobBluesheetLabor.calculateBillingFromNormalizedRates(
        regularHoursDecimal,
        overtimeHoursDecimal,
        activeRates
      );

 
      const totalHours = JobBluesheetLabor.convertDecimalToHours(totalHoursDecimal);

      const laborEntryData = {
        ...laborData,
        hourly_rate: hourlyRate,
        total_hours: totalHours,
        total_cost: totalCost,
        rate_snapshot: {
          ...rateSnapshot,
          matched_tier: matchedTier 
        }
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
        let originalRates = null;

        if (rateSnapshot && Array.isArray(rateSnapshot.hourly_rates) && rateSnapshot.hourly_rates.length > 0) {
        
          originalRates = rateSnapshot.hourly_rates;
          normalizedRates = JobBluesheetLabor.normalizeRates(rateSnapshot.hourly_rates);
        } else {
       
          const { rates: activeRates, snapshot } = await JobBluesheetLabor.loadActiveRates(true);
          normalizedRates = activeRates;
          rateSnapshot = snapshot;
          originalRates = snapshot.hourly_rates;
        }

        const { hourlyRate, totalCost, matchedTier } = JobBluesheetLabor.calculateBillingFromNormalizedRates(
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
              hourly_rates: originalRates || rateSnapshot.hourly_rates, 
              matched_tier: matchedTier 
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
        hourly_rates: hourlyRates.map((rate) => ({ ...rate })) 
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
        const hasMin = rate.min_hours !== undefined && rate.min_hours !== null;
        const numericMax = hasMax ? Number(rate.max_hours) : null;
        const numericMin = hasMin ? Number(rate.min_hours) : null;

        if (!Number.isFinite(numericRate)) {
          throw new Error('Hourly rate value must be numeric');
        }

        if (hasMax && !Number.isFinite(numericMax)) {
          throw new Error('Hourly rate max_hours must be numeric');
        }

        if (hasMin && !Number.isFinite(numericMin)) {
          throw new Error('Hourly rate min_hours must be numeric');
        }

        return {
          ...rate,
          rate: numericRate,
          max_hours: hasMax ? numericMax : null,
          min_hours: hasMin ? numericMin : null
        };
      })
      .sort((a, b) => {
     
        const maxA = a.max_hours === null ? Number.POSITIVE_INFINITY : a.max_hours;
        const maxB = b.max_hours === null ? Number.POSITIVE_INFINITY : b.max_hours;
        
        if (maxA !== maxB) {
        return maxA - maxB;
        }
        
     
        const minA = a.min_hours === null ? 0 : a.min_hours;
        const minB = b.min_hours === null ? 0 : b.min_hours;
        return minA - minB;
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
  

      let matchedTier = null;

     
      const exactMinMatch = normalizedRates.find((tier) => {
        const hasMinHours = tier.min_hours !== null && tier.min_hours !== undefined;
        return hasMinHours && fullRegularHours === tier.min_hours;
      });

      
      const exactMaxMatch = normalizedRates.find((tier) => {
        const hasMaxHours = tier.max_hours !== null && tier.max_hours !== undefined;
        return hasMaxHours && fullRegularHours === tier.max_hours;
      });

      if (exactMinMatch && exactMaxMatch) {
      
        matchedTier = exactMinMatch.rate > exactMaxMatch.rate ? exactMinMatch : exactMaxMatch;
      } else if (exactMinMatch) {

        matchedTier = exactMinMatch;
      } else if (exactMaxMatch) {
    
        matchedTier = exactMaxMatch;
      } else {
       
        const rangeTiers = normalizedRates.filter((tier) => {
          const hasMinHours = tier.min_hours !== null && tier.min_hours !== undefined;
          const hasMaxHours = tier.max_hours !== null && tier.max_hours !== undefined;
          return hasMinHours && hasMaxHours;
        });

       
        const betweenTiers = rangeTiers.filter((tier) => {
          return fullRegularHours > tier.min_hours && fullRegularHours < tier.max_hours;
        });

        if (betweenTiers.length > 0) {
        
          betweenTiers.sort((a, b) => a.max_hours - b.max_hours);
          matchedTier = betweenTiers[0];
        } else {
         
          const matchingTiers = normalizedRates.filter((tier) => {
            const hasMaxHours = tier.max_hours !== null && tier.max_hours !== undefined;
            const hasMinHours = tier.min_hours !== null && tier.min_hours !== undefined;

          
            if (!hasMaxHours && !hasMinHours) {
              return true;
            }

       
            let matches = true;

        
            if (hasMaxHours) {
              matches = matches && (fullRegularHours <= tier.max_hours);
            }

          
            if (hasMinHours) {
              matches = matches && (fullRegularHours >= tier.min_hours);
            }

            return matches;
          });

          if (matchingTiers.length > 0) {
           
            const sortedMatchingTiers = matchingTiers.sort((a, b) => {
              const hasMinA = a.min_hours !== null && a.min_hours !== undefined;
              const hasMinB = b.min_hours !== null && b.min_hours !== undefined;

          
              if (hasMinA && !hasMinB) return -1;
              if (!hasMinA && hasMinB) return 1;

            
              if (hasMinA && hasMinB) {
                return b.min_hours - a.min_hours;
              }

              const hasMaxA = a.max_hours !== null && a.max_hours !== undefined;
              const hasMaxB = b.max_hours !== null && b.max_hours !== undefined;
              if (hasMaxA && hasMaxB) {
                return a.max_hours - b.max_hours;
              }

              return 0;
            });

            matchedTier = sortedMatchingTiers[0];
          } else {
      
            const defaultTier = normalizedRates.find(tier =>
              (tier.max_hours === null || tier.max_hours === undefined) &&
              (tier.min_hours === null || tier.min_hours === undefined)
            );

            if (defaultTier) {
              matchedTier = defaultTier;
            } else {
       
              matchedTier = lastTier;
            }
          }
        }
      }

      if (matchedTier) {
        tierForRegular = matchedTier;
      }
    }

    let hourlyRate = tierForRegular.rate;
    let totalCost = 0;

    if (regularHours > 0) {
   
        totalCost = fullRegularHours * tierForRegular.rate;
    }

    if (overtimeHours > 0) {
      const overtimeBillableHours = Math.ceil(Math.max(0, overtimeHours));
      totalCost += overtimeBillableHours * lastTier.rate;
    }

    return {
      hourlyRate,
      totalCost: Math.round(totalCost * 100) / 100,
      matchedTier: {
        id: tierForRegular.id,
        rate: tierForRegular.rate,
        min_hours: tierForRegular.min_hours,
        max_hours: tierForRegular.max_hours,
        description: tierForRegular.description,
        regular_hours: fullRegularHours
      }
    };
  }

 
  static convertHoursToDecimal(hoursString) {
    if (!hoursString || typeof hoursString !== 'string') return 0;
    
  
    const timeMatch = hoursString.match(/(\d+):(\d+):(\d+)/);
    if (timeMatch) {
      const hours = parseInt(timeMatch[1]);
      const minutes = parseInt(timeMatch[2]);
      const seconds = parseInt(timeMatch[3]);
      return hours + (minutes / 60) + (seconds / 3600);
    }
    
    
    const match = hoursString.match(/(\d+(?:\.\d+)?)h(?:\d+m)?/);
    if (match) {
      return parseFloat(match[1]);
    }
    
  
    const shortTimeMatch = hoursString.match(/(\d+):(\d+)/);
    if (shortTimeMatch) {
      const hours = parseInt(shortTimeMatch[1]);
      const minutes = parseInt(shortTimeMatch[2]);
      return hours + (minutes / 60);
    }
    
    return 0;
  }


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
