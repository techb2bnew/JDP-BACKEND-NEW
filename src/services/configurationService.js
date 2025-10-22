import { Configuration } from '../models/Configuration.js';

export class ConfigurationService {
  // Get full configuration
  static async getFullConfiguration() {
    try {
      const config = await Configuration.getConfiguration();
      if (!config) {
        return {
          success: true,
          data: {
            hourly_rates: [],
            markup_percentage: 0
          },
          message: 'Configuration fetched successfully'
        };
      }

      return {
        success: true,
        data: {
          hourly_rates: config.settings.hourly_rates || [],
          markup_percentage: config.markup_percentage || 0
        },
        message: 'Configuration fetched successfully'
      };
    } catch (error) {
      throw new Error(`Error fetching configuration: ${error.message}`);
    }
  }

  // Update configuration
  static async createOrUpdateConfiguration(data, userId) {
    try {
      // Get current configuration
      const currentConfig = await Configuration.getConfiguration();
      let settings = {};

      if (currentConfig) {
        settings = currentConfig.settings;
      }

      // Update hourly rates if provided
      if (data.hourly_rates && Array.isArray(data.hourly_rates)) {
        // Initialize hourly_rates array if it doesn't exist
        if (!settings.hourly_rates) {
          settings.hourly_rates = [];
        }
        
        // Update or add rates from payload
        for (const rate of data.hourly_rates) {
          if (rate.id) {
            // Find existing rate by ID
            const existingIndex = settings.hourly_rates.findIndex(r => r.id === rate.id);
            
            if (existingIndex !== -1) {
              // Update existing rate
              settings.hourly_rates[existingIndex] = {
                id: rate.id,
                description: rate.description,
                max_hours: rate.max_hours,
                rate: rate.rate
              };
            } else {
              // Add new rate if ID doesn't exist
              settings.hourly_rates.push({
                id: rate.id,
                description: rate.description,
                max_hours: rate.max_hours,
                rate: rate.rate
              });
            }
          } else {
            // Create new rate with auto-generated ID
            const maxId = settings.hourly_rates.length > 0 
              ? Math.max(...settings.hourly_rates.map(r => r.id)) 
              : 0;
            const newId = maxId + 1;
            
            settings.hourly_rates.push({
              id: newId,
              description: rate.description,
              max_hours: rate.max_hours,
              rate: rate.rate
            });
          }
        }
      }

      // Get markup percentage
      let markupPercentage = currentConfig ? currentConfig.markup_percentage : 0;
      if (data.markup_percentage !== undefined) {
        markupPercentage = data.markup_percentage;
      }

      // Save configuration
      const result = await Configuration.upsertConfiguration(settings, markupPercentage, userId);

      return {
        success: true,
        data: {
          hourly_rates: settings.hourly_rates || [],
          markup_percentage: markupPercentage
        },
        message: 'Configuration updated successfully'
      };
    } catch (error) {
      throw new Error(`Error updating configuration: ${error.message}`);
    }
  }

  static async removeHourlyRates(rateIds, userId) {
    try {
      // Get current configuration
      const currentConfig = await Configuration.getConfiguration();
      let settings = {};

      if (currentConfig) {
        settings = currentConfig.settings;
      }

      // Initialize hourly_rates array if it doesn't exist
      if (!settings.hourly_rates) {
        settings.hourly_rates = [];
      }

      // Remove rates by IDs
      const removedRates = [];
      settings.hourly_rates = settings.hourly_rates.filter(rate => {
        if (rateIds.includes(rate.id)) {
          removedRates.push(rate);
          return false; // Remove this rate
        }
        return true; // Keep this rate
      });

      // Save configuration
      const result = await Configuration.upsertConfiguration(settings, currentConfig?.markup_percentage || 0, userId);

      return {
        success: true,
        data: {
          hourly_rates: settings.hourly_rates || [],
          markup_percentage: currentConfig?.markup_percentage || 0,
          removed_rates: removedRates
        },
        message: `Successfully removed ${removedRates.length} hourly rate(s)`
      };
    } catch (error) {
      throw new Error(`Error removing hourly rates: ${error.message}`);
    }
  }
}
