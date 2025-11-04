import { Configuration } from '../models/Configuration.js';
import { Product } from '../models/Product.js';
import { supabase } from '../config/database.js';

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
            markup_percentage: 0,
            last_updated_by: null,
            last_updated_by_user: null,
            updated_at: null
          },
          message: 'Configuration fetched successfully'
        };
      }

      return {
        success: true,
        data: {
          hourly_rates: config.settings.hourly_rates || [],
          markup_percentage: config.markup_percentage || 0,
          last_updated_by: config.last_updated_by || null,
          last_updated_by_user: config.last_updated_by_user || null,
          updated_at: config.updated_at || null
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
                max_hours: rate.max_hours !== undefined ? rate.max_hours : null,
                min_hours: rate.min_hours !== undefined ? rate.min_hours : null,
                rate: rate.rate
              };
            } else {
              // Add new rate if ID doesn't exist
              settings.hourly_rates.push({
                id: rate.id,
                description: rate.description,
                max_hours: rate.max_hours !== undefined ? rate.max_hours : null,
                min_hours: rate.min_hours !== undefined ? rate.min_hours : null,
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
              max_hours: rate.max_hours !== undefined ? rate.max_hours : null,
              min_hours: rate.min_hours !== undefined ? rate.min_hours : null,
              rate: rate.rate
            });
          }
        }
      }

      // Get markup percentage
      let markupPercentage = currentConfig ? currentConfig.markup_percentage : 0;
      let markupChanged = false;
      if (data.markup_percentage !== undefined) {
        markupChanged = (currentConfig?.markup_percentage !== data.markup_percentage);
        markupPercentage = data.markup_percentage;
      }

      // Save configuration
      const result = await Configuration.upsertConfiguration(settings, markupPercentage, userId);

      // If markup percentage is provided (even if same), update all existing products
      if (data.markup_percentage !== undefined && markupPercentage > 0) {
        try {
          console.log(`Markup percentage provided: ${markupPercentage}%, updating non-custom products only...`);
          
          // Get only non-custom products (is_custom = false) and update their markup percentage
          const { data: products, error } = await supabase
            .from('products')
            .select('id, supplier_cost_price, markup_percentage, markup_amount, jdp_price, profit_margin, is_custom')
            .eq('is_custom', false);

          if (error) {
            console.error('Error fetching products:', error);
          } else {
            console.log(`Found ${products ? products.length : 0} products to update`);
            
            if (products && products.length > 0) {
            
            let updatedCount = 0;
            const updatePromises = [];

            for (const product of products) {
              let costPrice = product.supplier_cost_price;
              let jdpPrice = product.jdp_price;
              
              // If no supplier_cost_price or it's 0, calculate it from jdp_price
              if (!costPrice || costPrice <= 0) {
                if (jdpPrice && jdpPrice > 0) {
                  // Calculate cost price from jdp_price assuming current markup
                  if (product.markup_percentage && product.markup_percentage > 0) {
                    costPrice = jdpPrice / (1 + (product.markup_percentage / 100));
                  } else {
                    // If no markup, assume cost price is 70% of jdp_price
                    costPrice = jdpPrice * 0.7;
                  }
                } else {
                  // If no jdp_price either, set a default cost price
                  costPrice = 100; // Default cost price
                  jdpPrice = costPrice * (1 + (markupPercentage / 100));
                }
              } else if (!jdpPrice || jdpPrice <= 0) {
                // If we have cost price but no jdp_price, calculate it
                jdpPrice = costPrice * (1 + (markupPercentage / 100));
              }

              // Calculate new values with updated markup percentage
              const newMarkupAmount = (costPrice * markupPercentage) / 100;
              const newJdpPrice = costPrice + newMarkupAmount;
              const newProfitMargin = (newMarkupAmount / newJdpPrice) * 100;

              console.log(`Updating product ${product.id}: cost=${costPrice}, markup=${markupPercentage}%, new_price=${newJdpPrice}`);

              // Update ALL pricing fields
              const updatePromise = supabase
                .from('products')
                .update({
                  supplier_cost_price: costPrice,
                  markup_percentage: markupPercentage,
                  markup_amount: Math.round(newMarkupAmount * 100) / 100,
                  jdp_price: Math.round(newJdpPrice * 100) / 100,
                  profit_margin: Math.round(newProfitMargin * 100) / 100,
                  updated_at: new Date().toISOString()
                })
                .eq('id', product.id);

              updatePromises.push(updatePromise);
            }

            // Execute all updates
            const results = await Promise.all(updatePromises);
            
            // Count successful updates
            for (const result of results) {
              if (result.error) {
                console.error('Error updating product:', result.error);
              } else {
                updatedCount++;
              }
            }

            console.log(`Updated markup percentage for ${updatedCount} products`);
            } else {
              console.log('No products found to update');
            }
          }
        } catch (error) {
          console.error('Error updating products markup:', error);
          // Don't fail the configuration update if product update fails
        }
      }

      return {
        success: true,
        data: {
          hourly_rates: settings.hourly_rates || [],
          markup_percentage: markupPercentage,
          products_updated: data.markup_percentage !== undefined ? 'Products update attempted' : 'No markup percentage provided'
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

  // Update markup for all existing products
  static async updateAllProductsMarkup(newMarkupPercentage) {
    try {
      // Get all products that have either supplier_cost_price or jdp_price
      const { data: products, error } = await supabase
        .from('products')
        .select('id, supplier_cost_price, markup_percentage, markup_amount, jdp_price, profit_margin')
        .or('supplier_cost_price.gt.0,jdp_price.gt.0');

      if (error) {
        throw new Error(`Database error fetching products: ${error.message}`);
      }

      if (!products || products.length === 0) {
        console.log('No products found to update markup');
        return { updated: 0, message: 'No products found to update' };
      }

      console.log(`Found ${products.length} products to potentially update`);

      let updatedCount = 0;
      const updatePromises = [];

      for (const product of products) {
        // Only update products that don't have a custom markup_percentage set
        // or if the current markup_percentage is different from the new one
        if (!product.markup_percentage || product.markup_percentage !== newMarkupPercentage) {
          let costPrice = product.supplier_cost_price;
          let jdpPrice = product.jdp_price;
          
          // If no supplier_cost_price or it's 0, calculate it from jdp_price
          if (!costPrice || costPrice <= 0) {
            if (jdpPrice && jdpPrice > 0) {
              // Calculate cost price from jdp_price and current markup
              if (product.markup_percentage && product.markup_percentage > 0) {
                costPrice = jdpPrice / (1 + (product.markup_percentage / 100));
              } else {
                // If no markup, assume cost price is 70% of jdp_price (common business practice)
                costPrice = jdpPrice * 0.7;
              }
            } else {
              // If no jdp_price either, set a default cost price and calculate jdp_price
              costPrice = 100; // Default cost price
              jdpPrice = costPrice * (1 + (newMarkupPercentage / 100));
            }
          } else if (!jdpPrice || jdpPrice <= 0) {
            // If we have cost price but no jdp_price, calculate it
            jdpPrice = costPrice * (1 + (newMarkupPercentage / 100));
          }

          const newMarkupAmount = (costPrice * newMarkupPercentage) / 100;
          const newJdpPrice = costPrice + newMarkupAmount;
          const newProfitMargin = (newMarkupAmount / newJdpPrice) * 100;

          console.log(`Updating product ${product.id}: cost=${costPrice}, markup=${newMarkupPercentage}%, new_price=${newJdpPrice}`);

          const updatePromise = supabase
            .from('products')
            .update({
              supplier_cost_price: costPrice, // Update cost price if it was missing
              markup_percentage: newMarkupPercentage,
              markup_amount: Math.round(newMarkupAmount * 100) / 100,
              jdp_price: Math.round(newJdpPrice * 100) / 100,
              profit_margin: Math.round(newProfitMargin * 100) / 100,
              updated_at: new Date().toISOString()
            })
            .eq('id', product.id);

          updatePromises.push(updatePromise);
        }
      }

      console.log(`Preparing to update ${updatePromises.length} products`);

      // Execute all updates
      const results = await Promise.all(updatePromises);
      
      // Count successful updates
      for (const result of results) {
        if (result.error) {
          console.error('Error updating product:', result.error);
        } else {
          updatedCount++;
        }
      }

      console.log(`Updated markup for ${updatedCount} products with new percentage: ${newMarkupPercentage}%`);
      
      return {
        updated: updatedCount,
        message: `Successfully updated markup for ${updatedCount} products`
      };
    } catch (error) {
      throw new Error(`Error updating products markup: ${error.message}`);
    }
  }

}
