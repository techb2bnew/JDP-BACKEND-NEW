import { supabase } from '../config/database.js';

export class Product {
  static async create(productData) {
    try {
    
      if (!productData.total_cost && (productData.jdp_price || productData.supplier_cost_price)) {
        productData.total_cost = productData.jdp_price || productData.supplier_cost_price || 0;
      }
      
      const { data, error } = await supabase
        .from('products')
        .insert([productData])
        .select(`
          *,
          created_by_user:users!products_created_by_fkey(
            id,
            full_name,
            email
          ),
          job:jobs!products_job_id_fkey(
            id,
            job_title,
            job_type,
            status,
            priority
          ),
          suppliers (
            id,
            user_id,
            supplier_code,
            company_name,
            contact_person,
            address,
            contract_start,
            contract_end,
            notes,
            created_at,
            users (
              id,
              full_name,
              email,
              phone,
              role,
              status,
              photo_url,
              created_at
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

  static async getAllProducts(page = 1, limit = 10, filters = {}) {
    try {
      const offset = (page - 1) * limit;


      const buildQuery = (includeSelect = true) => {
        let query = includeSelect
          ? supabase
              .from('products')
              .select(`
                *,
                created_by_user:users!products_created_by_fkey(
                  id,
                  full_name,
                  email
                ),
                job:jobs!products_job_id_fkey(
                  id,
                  job_title,
                  job_type,
                  status,
                  priority
                ),
                suppliers (
                  id,
                  user_id,
                  supplier_code,
                  company_name,
                  contact_person,
                  address,
                  contract_start,
                  contract_end,
                  notes,
                  created_at,
                  users (
                    id,
                    full_name,
                    email,
                    phone,
                    role,
                    status,
                    photo_url,
                    created_at
                  )
                )
              `, includeSelect && { count: 'exact' })
          : supabase
              .from('products')
              .select('*', { count: 'exact', head: true });

        if (filters.category) {
          query = query.ilike('category', `%${filters.category}%`);
        }
        if (filters.supplier_id) {
          query = query.eq('supplier_id', filters.supplier_id);
        }
        if (filters.job_id) {
          query = query.eq('job_id', filters.job_id);
        }
        if (filters.is_custom) {
          query = query.eq('is_custom', filters.is_custom === 'true');
        }
        if (filters.status) {
          query = query.eq('status', filters.status);
        }
        if (filters.search) {
          query = query.or(`product_name.ilike.%${filters.search}%,description.ilike.%${filters.search}%,jdp_sku.ilike.%${filters.search}%`);
        }

        return query;
      };

      const [countResult, dataResult] = await Promise.all([
        buildQuery(false),
        buildQuery(true)
          .order('id', { ascending: false })
          .range(offset, offset + limit - 1)
      ]);

      if (countResult.error) {
        throw new Error(`Database error: ${countResult.error.message}`);
      }

      if (dataResult.error) {
        throw new Error(`Database error: ${dataResult.error.message}`);
      }

      const count = countResult.count || 0;
      const data = dataResult.data || [];
      const totalPages = Math.ceil(count / limit);


      let totalCost = 0;
      for (let i = 0; i < data.length; i++) {
        const product = data[i];
        const cost = product.is_custom === true
          ? (parseFloat(product.unit_cost) || 0)
          : (parseFloat(product.jdp_price) || 0);
        totalCost += cost;
      }

      return {
        data: data,
        totalCost: totalCost.toFixed(2),
        pagination: {
          currentPage: page,
          totalPages: totalPages,
          totalItems: count,
          itemsPerPage: limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      };
    } catch (error) {
      throw error;
    }
  }

  static async getProductById(productId) {
    try {      
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select(`
          *,
          created_by_user:users!products_created_by_fkey(
            id,
            full_name,
            email
          ),
          job:jobs!products_job_id_fkey(
            id,
            job_title,
            job_type,
            status,
            priority
          ),
          suppliers (
            id,
            user_id,
            supplier_code,
            company_name,
            contact_person,
            address,
            contract_start,
            contract_end,
            notes,
            created_at,
            users (
              id,
              full_name,
              email,
              phone,
              role,
              status,
              photo_url,
              created_at
            )
          )
        `)
        .eq('id', productId)
        .single();

      if (productError) {
        throw new Error(`Database error: ${productError.message}`);
      }

      if (!productData) {
        throw new Error(`Product not found with ID: ${productId}`);
      }

      return productData;
    } catch (error) {
      throw error;
    }
  }

  static async update(productId, updateData) {
    try {
      updateData.updated_at = new Date().toISOString();
      
      
      if (!updateData.total_cost && (updateData.jdp_price || updateData.supplier_cost_price)) {
        updateData.total_cost = updateData.jdp_price || updateData.supplier_cost_price || 0;
      }
      
      const { data, error } = await supabase
        .from('products')
        .update(updateData)
        .eq('id', productId)
        .select(`
          id,
          product_name,
          category,
          supplier_id,
          job_id,
          description,
          supplier_sku,
          jdp_sku,
          supplier_cost_price,
          estimated_price,
          markup_percentage,
          markup_amount,
          jdp_price,
          profit_margin,
          stock_quantity,
          unit,
          status,
          total_cost,
          system_ip,
          created_by,
          created_at,
          updated_at,
          job:jobs!products_job_id_fkey(
            id,
            job_title,
            job_type,
            status,
            priority
          ),
          suppliers (
            id,
            user_id,
            supplier_code,
            company_name,
            contact_person,
            address,
            contract_start,
            contract_end,
            notes,
            created_at,
            users (
              id,
              full_name,
              email,
              phone,
              role,
              status,
              photo_url,
              created_at
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

  static async checkProductRelationships(productId) {
    try {
      if (!productId) {
        throw new Error('Product ID is required');
      }

      const relationships = [];

      
      const [bluesheetResult, orderItemsResult, estimateProductsResult] = await Promise.all([
    
        supabase
          .from('job_bluesheet_material')
          .select('id')
          .eq('product_id', productId)
          .limit(1),
       
        supabase
          .from('order_items')
          .select('id')
          .eq('product_id', productId)
          .limit(1),
    
        supabase
          .from('estimate_products')
          .select('id')
          .eq('product_id', productId)
          .limit(1)
      ]);

      if (!bluesheetResult.error && bluesheetResult.data && bluesheetResult.data.length > 0) {
        relationships.push({
          table: 'job_bluesheet_material',
          count: bluesheetResult.data.length,
          message: 'This product is used in bluesheets'
        });
      }

      if (!orderItemsResult.error && orderItemsResult.data && orderItemsResult.data.length > 0) {
        relationships.push({
          table: 'order_items',
          count: orderItemsResult.data.length,
          message: 'This product is used in orders'
        });
      }

      if (!estimateProductsResult.error && estimateProductsResult.data && estimateProductsResult.data.length > 0) {
        relationships.push({
          table: 'estimate_products',
          count: estimateProductsResult.data.length,
          message: 'This product is used in estimates'
        });
      }

      return {
        hasRelationships: relationships.length > 0,
        relationships: relationships,
        canDelete: relationships.length === 0
      };
    } catch (error) {
      throw error;
    }
  }

  static async delete(productId) {
    try {
    
      const { data: product, error: fetchError } = await supabase
        .from('products')
        .select('id, product_name, jdp_sku, category')
        .eq('id', productId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw new Error(`Database error: ${fetchError.message}`);
      }

      if (!product) {
        throw new Error('Product not found');
      }
      
      
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return {
        success: true,
        message: `Product "${product.product_name}" deleted successfully`,
        deleted_product: {
          id: product.id,
          product_name: product.product_name,
          jdp_sku: product.jdp_sku,
          category: product.category
        }
      };
    } catch (error) {
      throw error;
    }
  }

  static async getProductsBySupplier(supplierId, page = 1, limit = 10) {
    try {
      const offset = (page - 1) * limit;


      const [countResult, dataResult] = await Promise.all([
        supabase
          .from('products')
          .select('*', { count: 'exact', head: true })
          .eq('supplier_id', supplierId),
        supabase
          .from('products')
          .select(`
            id,
            product_name,
            category,
            supplier_id,
            job_id,
            description,
            supplier_sku,
            jdp_sku,
            supplier_cost_price,
            estimated_price,
            markup_percentage,
            markup_amount,
            jdp_price,
            profit_margin,
            stock_quantity,
            unit,
            status,
            total_cost,
            system_ip,
            created_by,
            created_at,
            updated_at,
            job:jobs!products_job_id_fkey(
              id,
              job_title,
              job_type,
              status,
              priority
            ),
            suppliers (
              id,
              user_id,
              supplier_code,
              company_name,
              contact_person,
              address,
              contract_start,
              contract_end,
              notes,
              created_at,
              users (
                id,
                full_name,
                email,
                phone,
                role,
                status,
                photo_url,
                created_at
              )
            )
          `)
          .eq('supplier_id', supplierId)
          .order('id', { ascending: false })
          .range(offset, offset + limit - 1)
      ]);

      if (countResult.error) {
        throw new Error(`Database error: ${countResult.error.message}`);
      }

      if (dataResult.error) {
        throw new Error(`Database error: ${dataResult.error.message}`);
      }

      const count = countResult.count || 0;
      const data = dataResult.data || [];
      const totalPages = Math.ceil(count / limit);

      return {
        data: data,
        pagination: {
          currentPage: page,
          totalPages: totalPages,
          totalItems: count,
          itemsPerPage: limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      };
    } catch (error) {
      throw error;
    }
  }

  static async getProductCategories() {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('category')
        .not('category', 'is', null);

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

     
      const categories = [...new Set(data.map(item => item.category).filter(Boolean))];
      return categories;
    } catch (error) {
      throw error;
    }
  }

  static async updateStock(productId, newStockQuantity) {
    try {
      const { data, error } = await supabase
        .from('products')
        .update({ 
          stock_quantity: newStockQuantity,
          updated_at: new Date().toISOString()
        })
        .eq('id', productId)
        .select(`
          *,
          job:jobs!products_job_id_fkey(
            id,
            job_title,
            job_type,
            status,
            priority
          ),
          suppliers (
            id,
            user_id,
            supplier_code,
            company_name,
            contact_person,
            address,
            contract_start,
            contract_end,
            notes,
            created_at,
            users (
              id,
              full_name,
              email,
              phone,
              role,
              status,
              photo_url,
              created_at
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

  static async getLowStockProducts(threshold = 10) {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          job:jobs!products_job_id_fkey(
            id,
            job_title,
            job_type,
            status,
            priority
          ),
          suppliers (
            id,
            user_id,
            supplier_code,
            company_name,
            contact_person,
            address,
            contract_start,
            contract_end,
            notes,
            created_at,
            users (
              id,
              full_name,
              email,
              phone,
              role,
              status,
              photo_url,
              created_at
            )
          )
        `)
        .lte('stock_quantity', threshold)
        .order('stock_quantity', { ascending: true });

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      throw error;
    }
  }

  static async getProductsByJob(jobId, page = 1, limit = 10) {
    try {
      const offset = (page - 1) * limit;

 
      const [countResult, dataResult] = await Promise.all([
        supabase
          .from('products')
          .select('*', { count: 'exact', head: true })
          .eq('job_id', jobId),
        supabase
          .from('products')
          .select(`
            *,
            job:jobs!products_job_id_fkey(
              id,
              job_title,
              job_type,
              status,
              priority
            ),
            suppliers (
              id,
              user_id,
              supplier_code,
              company_name,
              contact_person,
              address,
              contract_start,
              contract_end,
              notes,
              created_at,
              users (
                id,
                full_name,
                email,
                phone,
                role,
                status,
                photo_url,
                created_at
              )
            )
          `)
          .eq('job_id', jobId)
          .order('id', { ascending: false })
          .range(offset, offset + limit - 1)
      ]);

      if (countResult.error) {
        throw new Error(`Database error: ${countResult.error.message}`);
      }

      if (dataResult.error) {
        throw new Error(`Database error: ${dataResult.error.message}`);
      }

      const count = countResult.count || 0;
      const data = dataResult.data || [];
      const totalPages = Math.ceil(count / limit);

    
      let totalCost = 0;
      for (let i = 0; i < data.length; i++) {
        const product = data[i];
        const cost = product.is_custom === true
          ? (parseFloat(product.unit_cost) || 0)
          : (parseFloat(product.jdp_price) || 0);
        totalCost += cost;
      }

      return {
        data: data,
        totalCost: totalCost.toFixed(2),
        pagination: {
          currentPage: page,
          totalPages: totalPages,
          totalItems: count,
          itemsPerPage: limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      };
    } catch (error) {
      throw error;
    }
  }

  static async getCustomProducts(jobId = null, page = 1, limit = 10) {
    try {
      const offset = (page - 1) * limit;

 
      const buildQuery = (includeSelect = true) => {
        let query = includeSelect
          ? supabase
              .from('products')
              .select(`
                *,
                job:jobs!products_job_id_fkey(
                  id,
                  job_title,
                  job_type,
                  status,
                  priority
                ),
                suppliers (
                  id,
                  user_id,
                  supplier_code,
                  company_name,
                  contact_person,
                  address,
                  contract_start,
                  contract_end,
                  notes,
                  created_at,
                  users (
                    id,
                    full_name,
                    email,
                    phone,
                    role,
                    status,
                    photo_url,
                    created_at
                  )
                )
              `, { count: 'exact' })
          : supabase
              .from('products')
              .select('*', { count: 'exact', head: true });

        query = query.eq('is_custom', true);

        if (jobId) {
          query = query.eq('job_id', jobId);
        }

        return query;
      };

      
      const [countResult, dataResult] = await Promise.all([
        buildQuery(false),
        buildQuery(true)
          .order('id', { ascending: false })
          .range(offset, offset + limit - 1)
      ]);

      if (countResult.error) {
        throw new Error(`Database error: ${countResult.error.message}`);
      }

      if (dataResult.error) {
        throw new Error(`Database error: ${dataResult.error.message}`);
      }

      const count = countResult.count || 0;
      const data = dataResult.data || [];
      const totalPages = Math.ceil(count / limit);


      let totalCost = 0;
      for (let i = 0; i < data.length; i++) {
        totalCost += (parseFloat(data[i].unit_cost) || 0);
      }

      return {
        data: data,
        totalCost: totalCost.toFixed(2),
        pagination: {
          currentPage: page,
          totalPages: totalPages,
          totalItems: count,
          itemsPerPage: limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      };
    } catch (error) {
      throw error;
    }
  }

  static async getStats() {
    try {
   
      const [totalResult, activeResult, inactiveResult, draftResult, lowStockResult, inventoryResult] = await Promise.all([
        supabase
          .from('products')
          .select('id', { count: 'exact', head: true }),
        supabase
          .from('products')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'active'),
        supabase
          .from('products')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'inactive'),
        supabase
          .from('products')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'draft'),
        supabase
          .from('products')
          .select('id', { count: 'exact', head: true })
          .lte('stock_quantity', 10),
        supabase
          .from('products')
          .select('jdp_price, stock_quantity')
      ]);

      if (totalResult.error) {
        throw new Error(`Database error: ${totalResult.error.message}`);
      }

      const total = totalResult.count || 0;
      const active = activeResult.count || 0;
      const inactive = inactiveResult.count || 0;
      const draft = draftResult.count || 0;
      const lowStock = lowStockResult.count || 0;

    
      let totalInventoryValue = 0;
      if (!inventoryResult.error && inventoryResult.data) {
        for (let i = 0; i < inventoryResult.data.length; i++) {
          const product = inventoryResult.data[i];
          const price = parseFloat(product.jdp_price) || 0;
          const quantity = parseInt(product.stock_quantity) || 0;
          totalInventoryValue += (price * quantity);
        }
      }

      return {
        total,
        active,
        inactive,
        draft,
        lowStock,
        totalInventoryValue: totalInventoryValue.toFixed(2),
        activePercentage: total > 0 ? ((active / total) * 100).toFixed(1) : "0.0",
        inactivePercentage: total > 0 ? ((inactive / total) * 100).toFixed(1) : "0.0",
        draftPercentage: total > 0 ? ((draft / total) * 100).toFixed(1) : "0.0",
        lowStockPercentage: total > 0 ? ((lowStock / total) * 100).toFixed(1) : "0.0"
      };
    } catch (error) {
      throw error;
    }
  }

  static async search(filters, pagination = {}) {
    try {
      const q = (filters.q || '').toLowerCase().trim();

  
      const { data, error } = await supabase
        .from("products")
        .select(`
          *,
          created_by_user:users!products_created_by_fkey(
            id,
            full_name,
            email
          ),
          job:jobs!products_job_id_fkey(
            id,
            job_title,
            job_type,
            status,
            priority
          ),
          suppliers (
            id,
            user_id,
            supplier_code,
            company_name,
            contact_person,
            address,
            contract_start,
            contract_end,
            notes,
            created_at,
            users (
              id,
              full_name,
              email,
              phone,
              role,
              status,
              photo_url,
              created_at
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      const inStr = (s) => (s || '').toString().toLowerCase().includes(q);

      const matches = (product) => {
    
        if (q) {
          const productMatch = inStr(product.product_name) || 
                              inStr(product.description) || 
                              inStr(product.supplier_sku) || 
                              inStr(product.jdp_sku) ||
                              inStr(product.category) ||
                              inStr(product.suppliers?.company_name) ||
                              inStr(product.suppliers?.users?.full_name);
          if (!productMatch) return false;
        }

        
        if (filters.product_name && !inStr(product.product_name)) return false;
        if (filters.supplier_sku && !inStr(product.supplier_sku)) return false;
        if (filters.jdp_sku && !inStr(product.jdp_sku)) return false;
        if (filters.status && product.status !== filters.status) return false;
        if (filters.category && product.category !== filters.category) return false;
        if (filters.supplier_id && product.supplier_id !== filters.supplier_id) return false;

       
        if (filters.supplier_cost_price_min && product.supplier_cost_price < filters.supplier_cost_price_min) return false;
        if (filters.supplier_cost_price_max && product.supplier_cost_price > filters.supplier_cost_price_max) return false;
        if (filters.markup_percentage_min && product.markup_percentage < filters.markup_percentage_min) return false;
        if (filters.markup_percentage_max && product.markup_percentage > filters.markup_percentage_max) return false;
        if (filters.jdp_price_min && product.jdp_price < filters.jdp_price_min) return false;
        if (filters.jdp_price_max && product.jdp_price > filters.jdp_price_max) return false;
        if (filters.stock_quantity_min && product.stock_quantity < filters.stock_quantity_min) return false;
        if (filters.stock_quantity_max && product.stock_quantity > filters.stock_quantity_max) return false;

        return true;
      };

      const filtered = (data || []).filter(matches);

      const page = parseInt(pagination.page) || 1;
      const limit = parseInt(pagination.limit) || 10;
      const offset = (page - 1) * limit;
      const sliced = filtered.slice(offset, offset + limit);

      return {
        products: sliced,
        total: filtered.length,
        page,
        limit,
        totalPages: Math.ceil(filtered.length / limit) || 1
      };
    } catch (error) {
      throw error;
    }
  }
}
