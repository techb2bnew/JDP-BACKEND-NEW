import { supabase } from '../config/database.js';

export class Estimate {
  static inStr(haystack, needle) {
    return (haystack || '').toString().toLowerCase().includes((needle || '').toString().toLowerCase());
  }

  static async search(filters, pagination = {}) {
    try {
      const q = (filters.q || '').toLowerCase().trim();

      const { data, error } = await supabase
        .from('estimates')
        .select(`
          *,
          job:jobs!estimates_job_id_fkey(
            id,
            job_title,
            job_type,
            status
          ),
          customer:customers!estimates_customer_id_fkey(
            id,
            customer_name,
            company_name,
            email,
            phone
          ),
          contractor:contractors!estimates_contractor_id_fkey(
            id,
            contractor_name,
            company_name,
            email,
            phone
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      const matches = (est) => {
        if (q) {
          const textHit =
            Estimate.inStr(est.invoice_number, q) ||
            Estimate.inStr(est.customer?.customer_name, q) ||
            Estimate.inStr(est.customer?.company_name, q) ||
            Estimate.inStr(est.customer?.email, q) ||
            Estimate.inStr(est.job?.job_title, q) ||
            Estimate.inStr(est.job?.id?.toString(), q);
          if (!textHit) return false;
        }

        if (filters.status && (est.status || '').toLowerCase() !== String(filters.status).toLowerCase()) return false;
        if (filters.invoice_type && (est.invoice_type || '').toLowerCase() !== String(filters.invoice_type).toLowerCase()) return false;
        if (filters.customer &&
            !(
              Estimate.inStr(est.customer?.customer_name, filters.customer) ||
              Estimate.inStr(est.customer?.company_name, filters.customer) ||
              Estimate.inStr(est.customer?.email, filters.customer)
            )) return false;
        if (filters.job &&
            !(
              Estimate.inStr(est.job?.job_title, filters.job) ||
              Estimate.inStr(est.job?.id?.toString(), filters.job)
            )) return false;

        return true;
      };

      const filtered = (data || []).filter(matches);

      const page = parseInt(pagination.page) || 1;
      const limit = parseInt(pagination.limit) || 10;
      const offset = (page - 1) * limit;
      const sliced = filtered.slice(offset, offset + limit);

      return {
        estimates: sliced,
        total: filtered.length,
        page,
        limit,
        totalPages: Math.ceil(filtered.length / limit) || 1
      };
    } catch (error) {
      throw error;
    }
  }
  static async generateInvoiceNumber() {
    try {
      const { data, error } = await supabase.rpc('generate_invoice_number');
      
      if (error) {
        const currentYear = new Date().getFullYear();
        const prefix = `INV-${currentYear}-`;
        
        const { data: lastInvoice, error: fetchError } = await supabase
          .from('estimates')
          .select('invoice_number')
          .like('invoice_number', prefix + '%')
          .order('invoice_number', { ascending: false })
          .limit(1);
        
        if (fetchError) {
          throw new Error(`Database error: ${fetchError.message}`);
        }
        
        let nextNumber = 1;
        if (lastInvoice && lastInvoice.length > 0) {
          const lastNumber = lastInvoice[0].invoice_number;
          const match = lastNumber.match(new RegExp(`${prefix}(\\d+)`));
          if (match) {
            nextNumber = parseInt(match[1]) + 1;
          }
        }
        
        return `${prefix}${nextNumber.toString().padStart(3, '0')}`;
      }
      
      return data;
    } catch (error) {
      throw error;
    }
  }

  static async generateLaborCode() {
    try {
      const currentYear = new Date().getFullYear();
      const prefix = `LB-${currentYear}-`;
      
      const { data, error } = await supabase
        .from('labor')
        .select('labor_code')
        .like('labor_code', `${prefix}%`)
        .order('labor_code', { ascending: false })
        .limit(1);

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      let nextNumber = 1;
      
      if (data && data.length > 0) {
        const lastCode = data[0].labor_code;
        const match = lastCode.match(new RegExp(`${prefix}(\\d+)`));
        if (match) {
          nextNumber = parseInt(match[1]) + 1;
        }
      }

      const formattedNumber = nextNumber.toString().padStart(3, '0');
      
      return `${prefix}${formattedNumber}`;
    } catch (error) {
      throw error;
    }
  }

  static async generateProductSku() {
    try {
      const currentYear = new Date().getFullYear();
      const prefix = `JDP-PROD-${currentYear}-`;
      
      const { data, error } = await supabase
        .from('products')
        .select('jdp_sku')
        .like('jdp_sku', `${prefix}%`)
        .order('jdp_sku', { ascending: false })
        .limit(1);

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      let nextNumber = 1;
      
      if (data && data.length > 0) {
        const lastSku = data[0].jdp_sku;
        const match = lastSku.match(new RegExp(`${prefix}(\\d+)`));
        if (match) {
          nextNumber = parseInt(match[1]) + 1;
        }
      }

      const formattedNumber = nextNumber.toString().padStart(4, '0');
      
      return `${prefix}${formattedNumber}`;
    } catch (error) {
      throw error;
    }
  }

  static async create(estimateData) {
    try {
      const additionalCost = estimateData.additional_cost;
      const customProducts = estimateData.custom_products;
      
      delete estimateData.additional_cost;
      delete estimateData.custom_products;

      if (!estimateData.invoice_number) {
        estimateData.invoice_number = await Estimate.generateInvoiceNumber();
      }

      const { data, error } = await supabase
        .from("estimates")
        .insert([estimateData])
        .select(`
          *,
          job:jobs!estimates_job_id_fkey(
            id,
            job_title,
            job_type,
            status
          ),
          customer:customers!estimates_customer_id_fkey(
            id,
            customer_name,
            company_name,
            email,
            phone
          ),
          contractor:contractors!estimates_contractor_id_fkey(
            id,
            contractor_name,
            company_name,
            email,
            phone
          ),
          created_by_user:users!estimates_created_by_fkey(
            id,
            full_name,
            email
          )
        `)
        .single();

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      if (additionalCost && additionalCost.description && additionalCost.amount) {
        const additionalCostData = {
          estimate_id: data.id,
          description: additionalCost.description,
          amount: additionalCost.amount,
          created_by: estimateData.created_by || null,
          system_ip: estimateData.system_ip || null
        };

        const { error: additionalCostError } = await supabase
          .from("estimate_additional_costs")
          .insert([additionalCostData]);

        if (additionalCostError) {
          console.error('Error creating additional cost:', additionalCostError);
        }
      }

      // Custom products handling - create new or update existing products
      if (customProducts && Array.isArray(customProducts) && customProducts.length > 0) {
        for (const productItem of customProducts) {
          try {
            // Check if product_id exists in payload (for update)
            console.log('UPDATE - Processing product:', { id: productItem.id, product_id: productItem.product_id, name: productItem.product_name });
            if (productItem.id || productItem.product_id) {
              const productId = productItem.id || productItem.product_id;
              console.log('UPDATE - Updating existing product with ID:', productId);
              
              // Update existing product
              const updateData = {
                product_name: productItem.product_name,
                supplier_id: productItem.supplier_id,
                supplier_sku: productItem.supplier_sku || '',
                stock_quantity: productItem.stock_quantity,
                unit: productItem.unit,
                unit_cost: productItem.unit_cost,
                jdp_price: productItem.jdp_price || productItem.unit_cost,
                estimated_price: productItem.estimated_price || null,
                total_cost: productItem.total_cost || productItem.unit_cost,
                status: 'active',
                is_custom: true
              };

              // Only update jdp_sku if provided
              if (productItem.jdp_sku) {
                updateData.jdp_sku = productItem.jdp_sku;
              }

              const { error: updateError } = await supabase
                .from('products')
                .update(updateData)
                .eq('id', productId);

              if (updateError) {
                console.error('Error updating product:', updateError);
              } else {
                console.log(`UPDATE - Product ${productId} updated successfully`);
              }
            } else {
              // Create new product
              console.log('UPDATE - Creating new product:', productItem.product_name);
              let jdpSku = productItem.jdp_sku;
              if (!jdpSku) {
                jdpSku = await Estimate.generateProductSku();
              }

              const productData = {
                product_name: productItem.product_name,
                supplier_id: productItem.supplier_id,
                supplier_sku: productItem.supplier_sku || '',
                jdp_sku: jdpSku,
                stock_quantity: productItem.stock_quantity,
                unit: productItem.unit,
                job_id: parseInt(productItem.job_id),
                is_custom: true,
                unit_cost: productItem.unit_cost,
                jdp_price: productItem.jdp_price || productItem.unit_cost,
                estimated_price: productItem.estimated_price || null,
                total_cost: productItem.total_cost || productItem.unit_cost,
                status: 'active',
                created_by: estimateData.created_by || null,
                system_ip: estimateData.system_ip || null
              };

              const { error: productError } = await supabase
                .from('products')
                .insert([productData]);

              if (productError) {
                console.error('Error creating custom product:', productError);
              } else {
                console.log('New product created successfully');
              }
            }
          } catch (error) {
            console.error('Error processing custom product item:', error);
          }
        }
      }

      const { data: completeEstimate, error: fetchError } = await supabase
        .from("estimates")
        .select(`
          *,
          job:jobs!estimates_job_id_fkey(
            id,
            job_title,
            job_type,
            status
          ),
          customer:customers!estimates_customer_id_fkey(
            id,
            customer_name,
            company_name,
            email,
            phone
          ),
          contractor:contractors!estimates_contractor_id_fkey(
            id,
            contractor_name,
            company_name,
            email,
            phone
          ),
          created_by_user:users!estimates_created_by_fkey(
            id,
            full_name,
            email
          )
        `)
        .eq('id', data.id)
        .single();

      if (fetchError) {
        throw new Error(`Database error: ${fetchError.message}`);
      }

      // Get additional costs
      const additionalCosts = await Estimate.getAdditionalCosts(data.id);

      // Get products if job exists
      let products = [];
      if (completeEstimate.job && completeEstimate.job.id) {
        const { data: jobProducts } = await supabase
          .from("products")
          .select(`
            id,
            product_name,
            jdp_sku,
            supplier_sku,
            unit_cost,
            jdp_price,
            estimated_price,
            total_cost,
            stock_quantity,
            unit,
            category,
            description,
            supplier_id
          `)
          .eq("job_id", completeEstimate.job.id)
          .eq("is_custom", true);

        if (jobProducts) {
          products = jobProducts;
        }
      }

      // Calculate total amount from products and additional costs
      const productsTotalCost = products.reduce((sum, product) => {
        return sum + (parseFloat(product.total_cost) || 0);
      }, 0);
      
      const additionalCostsTotal = additionalCosts.reduce((sum, cost) => {
        return sum + (parseFloat(cost.amount) || 0);
      }, 0);
      
      const calculatedTotalAmount = productsTotalCost + additionalCostsTotal;

      return {
        ...completeEstimate,
        total_amount: calculatedTotalAmount,
        additional_costs_details: additionalCosts,
        products: products,
        labor: []
      };
    } catch (error) {
      console.error('Error in Estimate.create:', error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      throw error;
    }
  }

  static async findAll(filters = {}, pagination = {}) {
    try {
      let query = supabase
        .from("estimates")
        .select(`
          *,
          job:jobs!estimates_job_id_fkey(
            id,
            job_title,
            job_type,
            status
          ),
          customer:customers!estimates_customer_id_fkey(
            id,
            customer_name,
            company_name,
            email,
            phone
          ),
          contractor:contractors!estimates_contractor_id_fkey(
            id,
            contractor_name,
            company_name,
            email,
            phone
          ),
          created_by_user:users!estimates_created_by_fkey(
            id,
            full_name,
            email
          )
        `, { count: 'exact' });

      if (filters.job_id) {
        query = query.eq("job_id", filters.job_id);
      }
      if (filters.customer_id) {
        query = query.eq("customer_id", filters.customer_id);
      }
      if (filters.status) {
        query = query.eq("status", filters.status);
      }
      if (filters.priority) {
        query = query.eq("priority", filters.priority);
      }
      if (filters.service_type) {
        query = query.eq("service_type", filters.service_type);
      }
      if (filters.estimate_date) {
        query = query.eq("estimate_date", filters.estimate_date);
      }

      if (pagination.page && pagination.limit) {
        const offset = (pagination.page - 1) * pagination.limit;
        query = query.range(offset, offset + pagination.limit - 1);
      }

      const sortBy = pagination.sortBy || 'created_at';
      const sortOrder = pagination.sortOrder || 'desc';
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      const { data, error, count } = await query;

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      // Fetch products and calculate totals for each estimate
      const estimatesWithDetails = await Promise.all(
        (data || []).map(async (estimate) => {
          // Fetch products for this estimate's job
          let products = [];
          if (estimate.job_id) {
            const { data: jobProducts, error: productsError } = await supabase
              .from("products")
              .select(`
                id,
                product_name,
                jdp_sku,
                supplier_sku,
                jdp_price,
                estimated_price,
                supplier_cost_price,
                stock_quantity,
                unit,
                category,
                description,
                supplier_id
              `)
              .eq("job_id", estimate.job_id);
            // .eq("is_custom", true);

            if (!productsError && jobProducts) {
              products = jobProducts;
              console.log(`Found ${products.length} products for job_id ${estimate.job_id}:`, products.map(p => ({ id: p.id, name: p.product_name, jdp_price: p.jdp_price })));
            } else {
              console.log(`No products found for job_id ${estimate.job_id}. Error:`, productsError);
            }
          }

          // Fetch additional costs
          const { data: additionalCosts, error: additionalCostsError } = await supabase
            .from("estimate_additional_costs")
            .select(`
              id,
              description,
              amount,
              created_at,
              created_by
            `)
            .eq("estimate_id", estimate.id);

          const additionalCostsData = additionalCostsError ? [] : (additionalCosts || []);

          // Calculate total amount from products and additional costs
          const productsTotalCost = products.reduce((sum, product) => {
            // Use jdp_price if available, otherwise estimated_price, otherwise supplier_cost_price
            const price = parseFloat(product.jdp_price) || parseFloat(product.estimated_price) || parseFloat(product.supplier_cost_price) || 0;
            return sum + price;
          }, 0);
          
          const additionalCostsTotal = additionalCostsData.reduce((sum, cost) => {
            return sum + (parseFloat(cost.amount) || 0);
          }, 0);
          
          const calculatedTotalAmount = productsTotalCost + additionalCostsTotal;

          return {
            ...estimate,
            total_amount: calculatedTotalAmount,
            products: products,
            additional_costs_details: additionalCostsData
          };
        })
      );

      return {
        estimates: estimatesWithDetails,
        total: count || 0,
        page: pagination.page || 1,
        limit: pagination.limit || 10,
        totalPages: pagination.limit ? Math.ceil((count || 0) / pagination.limit) : 1
      };
    } catch (error) {
      throw error;
    }
  }

  static async findById(estimateId) {
    try {
      console.log(`Fetching estimate with ID: ${estimateId}`);
      
      const { data, error } = await supabase
        .from("estimates")
        .select(`
          *,
          customer:customers!estimates_customer_id_fkey(
            id,
            customer_name,
            company_name,
            email,
            phone,
            address
          ),
          contractor:contractors!estimates_contractor_id_fkey(
            id,
            contractor_name,
            company_name,
            email,
            phone,
            address
          ),
          job:jobs!estimates_job_id_fkey(
            id,
            job_title,
            job_type,
            status,
            address,
            city_zip,
            phone,
            email
          ),
          created_by_user:users!estimates_created_by_fkey(
            id,
            full_name,
            email
          )
        `)
        .eq("id", estimateId)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Database error in findById:", error);
        console.error("Error details:", JSON.stringify(error, null, 2));
        throw new Error(`Database error: ${error.message}`);
      }

      if (!data) {
        console.log(`No estimate found with ID: ${estimateId}`);
        return null;
      }

      // Get additional costs
      const additionalCosts = await Estimate.getAdditionalCosts(estimateId);
      
      // Get products from job
      let products = [];
      if (data.job && data.job.id) {
        const { data: jobProducts, error: productsError } = await supabase
          .from("products")
          .select(`
            id,
            product_name,
            jdp_sku,
            supplier_sku,
            unit_cost,
            jdp_price,
            estimated_price,
            total_cost,
            stock_quantity,
            unit,
            category,
            description,
            supplier_id
          `)
          .eq("job_id", data.job.id)
          // .eq("is_custom", true);

        if (!productsError && jobProducts) {
          products = jobProducts;
        }
      }

      // Calculate total amount from products and additional costs
      const productsTotalCost = products.reduce((sum, product) => {
        return sum + (parseFloat(product.total_cost) || 0);
      }, 0);
      
      const additionalCostsTotal = additionalCosts.reduce((sum, cost) => {
        return sum + (parseFloat(cost.amount) || 0);
      }, 0);
      
      const calculatedTotalAmount = productsTotalCost + additionalCostsTotal;

      console.log(`Estimate found: ${data.id}, title: ${data.estimate_title}`);
      return {
        ...data,
        total_amount: calculatedTotalAmount,
        additional_costs_details: additionalCosts,
        products: products,
        labor: []
      };
      } catch (error) {
      console.error("Error in findById method:", error);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
      throw error;
    }
  }

  static async simpleFindById(estimateId) {
    try {
      console.log(`Simple find estimate with ID: ${estimateId}`);

      const { data, error } = await supabase
        .from("estimates")
        .select("id, estimate_title, total_amount, status")
        .eq("id", estimateId)
            .single();

      if (error && error.code !== "PGRST116") {
        console.error("Simple findById error:", error);
        throw new Error(`Estimate not found: ${error.message}`);
      }

      if (!data) {
        console.log(`No estimate found with ID: ${estimateId}`);
        return null;
      }

      console.log(`Simple find - Estimate found: ${data.id}, title: ${data.estimate_title}`);
      return data;
      } catch (error) {
      console.error("Error in simpleFindById method:", error);
      throw error;
    }
  }

  static async update(estimateId, updateData) {
    try {
      const additionalCost = updateData.additional_cost;
      const customLabor = updateData.custom_labor;
      const customProducts = updateData.custom_products;
      
      delete updateData.additional_cost;
      delete updateData.custom_labor;
      delete updateData.custom_products; 

     
      const { data, error } = await supabase
        .from("estimates")
        .update(updateData)
        .eq("id", estimateId)
        .select(`
          *,
          job:jobs!estimates_job_id_fkey(
            id,
            job_title,
            job_type,
            status
          ),
          customer:customers!estimates_customer_id_fkey(
            id,
            customer_name,
            company_name,
            email,
            phone
          ),
          contractor:contractors!estimates_contractor_id_fkey(
            id,
            contractor_name,
            company_name,
            email,
            phone
          ),
          created_by_user:users!estimates_created_by_fkey(
            id,
            full_name,
            email
          )
        `)
        .single();

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      
      if (additionalCost !== undefined) {
        
        const { error: deleteError } = await supabase
          .from("estimate_additional_costs")
          .delete()
          .eq("estimate_id", estimateId);

        if (deleteError) {
          console.error('Error deleting existing additional cost:', deleteError);
        }

       
        if (additionalCost && additionalCost.description && additionalCost.amount) {
          const additionalCostData = {
            estimate_id: estimateId,
            description: additionalCost.description,
            amount: additionalCost.amount,
            created_by: updateData.created_by || null,
            system_ip: updateData.system_ip || null
          };

          const { error: additionalCostError } = await supabase
            .from("estimate_additional_costs")
            .insert([additionalCostData]);

          if (additionalCostError) {
            console.error('Error creating additional cost:', additionalCostError);
          }
        }
      }

      // Custom products handling - create new or update existing products
      if (customProducts && Array.isArray(customProducts) && customProducts.length > 0) {
        for (const productItem of customProducts) {
          try {
            // Check if product_id exists in payload (for update)
            console.log('UPDATE - Processing product:', { id: productItem.id, product_id: productItem.product_id, name: productItem.product_name });
            if (productItem.id || productItem.product_id) {
              const productId = productItem.id || productItem.product_id;
              console.log('UPDATE - Updating existing product with ID:', productId);
              
              // Update existing product
              const updateData = {
                product_name: productItem.product_name,
                supplier_id: productItem.supplier_id,
                supplier_sku: productItem.supplier_sku || '',
                stock_quantity: productItem.stock_quantity,
                unit: productItem.unit,
                unit_cost: productItem.unit_cost,
                jdp_price: productItem.jdp_price || productItem.unit_cost,
                estimated_price: productItem.estimated_price || null,
                total_cost: productItem.total_cost || productItem.unit_cost,
                status: 'active',
                is_custom: true
              };

              // Only update jdp_sku if provided
              if (productItem.jdp_sku) {
                updateData.jdp_sku = productItem.jdp_sku;
              }

              const { error: updateError } = await supabase
                .from('products')
                .update(updateData)
                .eq('id', productId);

              if (updateError) {
                console.error('Error updating product:', updateError);
              } else {
                console.log(`UPDATE - Product ${productId} updated successfully`);
              }
            } else {
              // Create new product
              console.log('UPDATE - Creating new product:', productItem.product_name);
              let jdpSku = productItem.jdp_sku;
              if (!jdpSku) {
                jdpSku = await Estimate.generateProductSku();
              }

              const productData = {
                product_name: productItem.product_name,
                supplier_id: productItem.supplier_id,
                supplier_sku: productItem.supplier_sku || '',
                jdp_sku: jdpSku,
                stock_quantity: productItem.stock_quantity,
                unit: productItem.unit,
                job_id: parseInt(productItem.job_id),
                is_custom: true,
                unit_cost: productItem.unit_cost,
                jdp_price: productItem.jdp_price || productItem.unit_cost,
                estimated_price: productItem.estimated_price || null,
                total_cost: productItem.total_cost || productItem.unit_cost,
                status: 'active',
                created_by: updateData.created_by || null,
                system_ip: updateData.system_ip || null
              };

              const { error: productError } = await supabase
                .from('products')
                .insert([productData]);

              if (productError) {
                console.error('Error creating custom product:', productError);
              }
            }
          } catch (error) {
            console.error('Error processing custom product item:', error);
          }
        }
      }

      
      const { data: completeEstimate, error: fetchError } = await supabase
        .from("estimates")
        .select(`
          *,
          job:jobs!estimates_job_id_fkey(
            id,
            job_title,
            job_type,
            status
          ),
          customer:customers!estimates_customer_id_fkey(
            id,
            customer_name,
            company_name,
            email,
            phone
          ),
          contractor:contractors!estimates_contractor_id_fkey(
            id,
            contractor_name,
            company_name,
            email,
            phone
          ),
          created_by_user:users!estimates_created_by_fkey(
            id,
            full_name,
            email
          )
        `)
        .eq('id', estimateId)
        .single();

      if (fetchError) {
        throw new Error(`Database error: ${fetchError.message}`);
      }

      // Get additional costs
      const additionalCosts = await Estimate.getAdditionalCosts(estimateId);

      // Get products if job exists
      let products = [];
      if (completeEstimate.job && completeEstimate.job.id) {
        const { data: jobProducts } = await supabase
          .from("products")
          .select(`
            id,
            product_name,
            jdp_sku,
            supplier_sku,
            unit_cost,
            jdp_price,
            estimated_price,
            total_cost,
            stock_quantity,
            unit,
            category,
            description,
            supplier_id
          `)
          .eq("job_id", completeEstimate.job.id)
          .eq("is_custom", true);

        if (jobProducts) {
          products = jobProducts;
        }
      }

      // Calculate total amount from products and additional costs
      const productsTotalCost = products.reduce((sum, product) => {
        return sum + (parseFloat(product.total_cost) || 0);
      }, 0);
      
      const additionalCostsTotal = additionalCosts.reduce((sum, cost) => {
        return sum + (parseFloat(cost.amount) || 0);
      }, 0);
      
      const calculatedTotalAmount = productsTotalCost + additionalCostsTotal;

      return {
        ...completeEstimate,
        total_amount: calculatedTotalAmount,
        additional_costs_details: additionalCosts,
        products: products,
        labor: []
      };
    } catch (error) {
      console.error('Error in Estimate.update:', error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      throw error;
    }
  }

  static async delete(estimateId) {
    try {
      console.log(`Deleting estimate with ID: ${estimateId}`);

      
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Delete query timeout')), 15000)
      );

      const deleteQuery = supabase
        .from("estimates")
        .delete()
        .eq("id", estimateId);

      const { error } = await Promise.race([
        deleteQuery,
        timeoutPromise
      ]);

      if (error) {
        console.error("Database error in delete:", error);
        console.error("Error details:", JSON.stringify(error, null, 2));
        throw new Error(`Database error: ${error.message}`);
      }


      return true;
    } catch (error) {
      console.error("Error in delete method:", error);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
      throw error;
    }
  }


  static async simpleDelete(estimateId) {
    try {

      const { error } = await supabase
        .from("estimates")
        .delete()
        .eq("id", estimateId);

      if (error) {
        console.error("Simple delete error:", error);
        throw new Error(`Delete failed: ${error.message}`);
      }

      console.log(`Estimate ${estimateId} deleted successfully (simple method)`);
      return true;
    } catch (error) {
      console.error("Error in simpleDelete method:", error);
      throw error;
    }
  }

  static async getStats() {
    try {
      const { data: totalEstimates, error: totalError } = await supabase
        .from("estimates")
        .select("id", { count: 'exact' });

      if (totalError) {
        throw new Error(`Database error: ${totalError.message}`);
      }

      const { data: draftEstimates, error: draftError } = await supabase
        .from("estimates")
        .select("id", { count: 'exact' })
        .eq("status", "draft");

      if (draftError) {
        throw new Error(`Database error: ${draftError.message}`);
      }

      const { data: sentEstimates, error: sentError } = await supabase
        .from("estimates")
        .select("id", { count: 'exact' })
        .eq("status", "sent");

      if (sentError) {
        throw new Error(`Database error: ${sentError.message}`);
      }

      const { data: acceptedEstimates, error: acceptedError } = await supabase
        .from("estimates")
        .select("id", { count: 'exact' })
        .eq("status", "accepted");

      if (acceptedError) {
        throw new Error(`Database error: ${acceptedError.message}`);
      }

      const { data: rejectedEstimates, error: rejectedError } = await supabase
        .from("estimates")
        .select("id", { count: 'exact' })
        .eq("status", "rejected");

      if (rejectedError) {
        throw new Error(`Database error: ${rejectedError.message}`);
      }

      
      const { data: additionalCostsData, error: additionalCostsError } = await supabase
        .from("estimate_additional_costs")
        .select("amount");

      if (additionalCostsError) {
        throw new Error(`Database error: ${additionalCostsError.message}`);
      }

      const total = totalEstimates?.length || 0;
      const draft = draftEstimates?.length || 0;
      const sent = sentEstimates?.length || 0;
      const accepted = acceptedEstimates?.length || 0;
      const rejected = rejectedEstimates?.length || 0;


      const totalBilled = (additionalCostsData || []).reduce((sum, cost) => {
        return sum + (parseFloat(cost.amount) || 0);
      }, 0);

      const paid = accepted; 
      const pending = draft + sent; 
      const expired = rejected;

      return {
        dashboard_cards: {
          total_invoices: {
            label: "Total Invoices",
            value: total,
            icon: "document",
            color: "blue"
          },
          total_billed: {
            label: "Total Billed", 
            value: `$${totalBilled.toFixed(2)}`,
            icon: "dollar",
            color: "green"
          },
          paid_invoices: {
            label: "Paid Invoices",
            value: paid,
            icon: "checkmark",
            color: "green"
          },
          pending_invoices: {
            label: "Pending",
            value: pending,
            icon: "exclamation",
            color: "orange"
          }
        },
        
        detailed_stats: {
        total,
        draft,
        sent,
        accepted,
        rejected,
          paid,
          pending,
          expired,
          totalBilled: totalBilled.toFixed(2),
        draftPercentage: total > 0 ? ((draft / total) * 100).toFixed(1) : "0.0",
        sentPercentage: total > 0 ? ((sent / total) * 100).toFixed(1) : "0.0",
        acceptedPercentage: total > 0 ? ((accepted / total) * 100).toFixed(1) : "0.0",
          rejectedPercentage: total > 0 ? ((rejected / total) * 100).toFixed(1) : "0.0",
          paidPercentage: total > 0 ? ((paid / total) * 100).toFixed(1) : "0.0",
          pendingPercentage: total > 0 ? ((pending / total) * 100).toFixed(1) : "0.0"
        }
      };
    } catch (error) {
      throw error;
    }
  }

  static async getEstimatesByJob(jobId, page = 1, limit = 10) {
    try {
      const result = await Estimate.findAll({ job_id: jobId }, { page, limit });
      
      if (result.estimates && result.estimates.length > 0) {
        const estimatesWithCalculations = await Promise.all(
          result.estimates.map(async (estimate) => {
            try {
              const additionalCosts = await Estimate.getAdditionalCosts(estimate.id);
              
              const materialsCost = parseFloat(estimate.materials_cost) || 0;
              const laborCost = parseFloat(estimate.labor_cost) || 0;
              const additionalCostsTotal = additionalCosts.reduce((sum, cost) => {
                return sum + (parseFloat(cost.amount) || 0);
              }, 0);
              
              const subtotal = materialsCost + laborCost + additionalCostsTotal;
              const taxAmount = (subtotal * (parseFloat(estimate.tax_percentage) || 0)) / 100;
              const totalAmount = subtotal + taxAmount;
              
              return {
                ...estimate,
                additional_costs_list: additionalCosts,
                materials_cost: materialsCost,
                labor_cost: laborCost,
                additional_costs: additionalCostsTotal,
                subtotal: subtotal,
                tax_amount: taxAmount,
                total_amount: totalAmount
              };
            } catch (error) {
              console.error(`Error processing estimate ${estimate.id}:`, error);
              return {
                ...estimate,
                additional_costs_list: [],
                additional_costs: 0,
                subtotal: (parseFloat(estimate.materials_cost) || 0) + (parseFloat(estimate.labor_cost) || 0),
                tax_amount: 0,
                total_amount: (parseFloat(estimate.materials_cost) || 0) + (parseFloat(estimate.labor_cost) || 0)
              };
            }
          })
        );
        
        result.estimates = estimatesWithCalculations;
      }
      
      return result;
    } catch (error) {
      throw error;
    }
  }

  static async getEstimatesByCustomer(customerId, page = 1, limit = 10) {
    try {
      const result = await Estimate.findAll({ customer_id: customerId }, { page, limit });
      return result;
    } catch (error) {
      throw error;
    }
  }

 
  static async createAdditionalCost(additionalCostData) {
    try {
      const { data, error } = await supabase
        .from("estimate_additional_costs")
        .insert([additionalCostData])
        .select("*")
        .single();

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  static async getAdditionalCosts(estimateId) {
    try {
      const { data, error } = await supabase
        .from("estimate_additional_costs")
        .select("*")
        .eq("estimate_id", estimateId)
        .order("created_at", { ascending: true });

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      throw error;
    }
  }

  static async updateAdditionalCost(additionalCostId, updateData) {
    try {
      const { data, error } = await supabase
        .from("estimate_additional_costs")
        .update(updateData)
        .eq("id", additionalCostId)
        .select("*")
        .single();

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  static async deleteAdditionalCost(additionalCostId) {
    try {
      const { error } = await supabase
        .from("estimate_additional_costs")
        .delete()
        .eq("id", additionalCostId);

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return true;
    } catch (error) {
      throw error;
    }
  }

  static async calculateTotalCosts(estimateId) {
    try {
      const estimate = await Estimate.findById(estimateId);
      if (!estimate) {
        throw new Error('Estimate not found');
      }

      // Get additional costs from estimate_additional_costs table
      const additionalCosts = await Estimate.getAdditionalCosts(estimateId);
      
      const additionalCostsTotal = additionalCosts.reduce((sum, cost) => {
        return sum + (parseFloat(cost.amount) || 0);
      }, 0);

      // Update total amount with additional costs
      await Estimate.update(estimateId, {
        total_amount: additionalCostsTotal
      });

      return {
        additional_costs: additionalCostsTotal,
        total_amount: additionalCostsTotal
      };
    } catch (error) {
      throw error;
    }
  }

 
  static async checkEstimateRelationships(estimateId) {
    try {

      if (!estimateId) {
        console.error('Estimate ID is required');
        return {
          hasRelationships: false,
          relationships: [],
          canDelete: true
        };
      }

      const relationships = [];

      console.log('Checking additional costs...');
      try {
        const additionalCostsQuery = supabase
        .from('estimate_additional_costs')
        .select('id, description')
        .eq('estimate_id', estimateId)
        .limit(1);

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Query timeout')), 10000)
        );

        const { data: additionalCostsData, error: additionalCostsError } = await Promise.race([
          additionalCostsQuery,
          timeoutPromise
        ]);

      if (additionalCostsError) {
        console.error('Error checking additional costs:', additionalCostsError);
          console.error('Error details:', JSON.stringify(additionalCostsError, null, 2));
      } else if (additionalCostsData && additionalCostsData.length > 0) {
          console.log(`Found ${additionalCostsData.length} additional costs`);
        relationships.push({
          table: 'estimate_additional_costs',
          count: additionalCostsData.length,
          message: 'This estimate has associated additional costs'
        });
        } else {
          console.log('No additional costs found');
        }
      } catch (queryError) {
        console.error('Query error in checkEstimateRelationships:', queryError);
        console.error('Query error message:', queryError.message);
      }

      const result = {
        hasRelationships: relationships.length > 0,
        relationships: relationships,
        canDelete: relationships.length === 0
      };

      return result;
    } catch (error) {


      return {
        hasRelationships: false,
        relationships: [],
        canDelete: true
      };
    }
  }
}
