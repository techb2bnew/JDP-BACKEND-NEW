import { Configuration } from '../models/Configuration.js';
import { Product } from '../models/Product.js';
import { supabase } from '../config/database.js';

export class ConfigurationService {
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


  static async createOrUpdateConfiguration(data, userId) {
    try {

      const currentConfig = await Configuration.getConfiguration();
      let settings = {};

      if (currentConfig) {
        settings = currentConfig.settings;
      }

   
      if (data.hourly_rates && Array.isArray(data.hourly_rates)) {
       
        if (!settings.hourly_rates) {
          settings.hourly_rates = [];
        }

      
        for (const rate of data.hourly_rates) {
          if (rate.id) {
      
            const existingIndex = settings.hourly_rates.findIndex(r => r.id === rate.id);

            if (existingIndex !== -1) {

              settings.hourly_rates[existingIndex] = {
                id: rate.id,
                description: rate.description,
                max_hours: rate.max_hours !== undefined ? rate.max_hours : null,
                min_hours: rate.min_hours !== undefined ? rate.min_hours : null,
                rate: rate.rate
              };
            } else {

              settings.hourly_rates.push({
                id: rate.id,
                description: rate.description,
                max_hours: rate.max_hours !== undefined ? rate.max_hours : null,
                min_hours: rate.min_hours !== undefined ? rate.min_hours : null,
                rate: rate.rate
              });
            }
          } else {

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


      let markupPercentage = currentConfig ? currentConfig.markup_percentage : 0;
      let markupChanged = false;
      if (data.markup_percentage !== undefined) {
        markupChanged = (currentConfig?.markup_percentage !== data.markup_percentage);
        markupPercentage = data.markup_percentage;
      }


      const result = await Configuration.upsertConfiguration(settings, markupPercentage, userId);


      if (data.markup_percentage !== undefined && markupPercentage > 0) {
        try {
          console.log(`Markup percentage provided: ${markupPercentage}%, updating non-custom products only...`);


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


                if (!costPrice || costPrice <= 0) {
                  if (jdpPrice && jdpPrice > 0) {

                    if (product.markup_percentage && product.markup_percentage > 0) {
                      costPrice = jdpPrice / (1 + (product.markup_percentage / 100));
                    } else {

                      costPrice = jdpPrice * 0.7;
                    }
                  } else {

                    costPrice = 100;
                    jdpPrice = costPrice * (1 + (markupPercentage / 100));
                  }
                } else if (!jdpPrice || jdpPrice <= 0) {

                  jdpPrice = costPrice * (1 + (markupPercentage / 100));
                }


                const newMarkupAmount = (costPrice * markupPercentage) / 100;
                const newJdpPrice = costPrice + newMarkupAmount;
                const newProfitMargin = (newMarkupAmount / newJdpPrice) * 100;

                console.log(`Updating product ${product.id}: cost=${costPrice}, markup=${markupPercentage}%, new_price=${newJdpPrice}`);


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


              const results = await Promise.all(updatePromises);


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

      const currentConfig = await Configuration.getConfiguration();
      let settings = {};

      if (currentConfig) {
        settings = currentConfig.settings;
      }


      if (!settings.hourly_rates) {
        settings.hourly_rates = [];
      }


      const removedRates = [];
      settings.hourly_rates = settings.hourly_rates.filter(rate => {
        if (rateIds.includes(rate.id)) {
          removedRates.push(rate);
          return false;
        }
        return true;
      });


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


  static async updateAllProductsMarkup(newMarkupPercentage) {
    try {

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

        if (!product.markup_percentage || product.markup_percentage !== newMarkupPercentage) {
          let costPrice = product.supplier_cost_price;
          let jdpPrice = product.jdp_price;


          if (!costPrice || costPrice <= 0) {
            if (jdpPrice && jdpPrice > 0) {

              if (product.markup_percentage && product.markup_percentage > 0) {
                costPrice = jdpPrice / (1 + (product.markup_percentage / 100));
              } else {

                costPrice = jdpPrice * 0.7;
              }
            } else {

              costPrice = 100;
              jdpPrice = costPrice * (1 + (newMarkupPercentage / 100));
            }
          } else if (!jdpPrice || jdpPrice <= 0) {

            jdpPrice = costPrice * (1 + (newMarkupPercentage / 100));
          }

          const newMarkupAmount = (costPrice * newMarkupPercentage) / 100;
          const newJdpPrice = costPrice + newMarkupAmount;
          const newProfitMargin = (newMarkupAmount / newJdpPrice) * 100;

          console.log(`Updating product ${product.id}: cost=${costPrice}, markup=${newMarkupPercentage}%, new_price=${newJdpPrice}`);

          const updatePromise = supabase
            .from('products')
            .update({
              supplier_cost_price: costPrice,
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


      const results = await Promise.all(updatePromises);


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
