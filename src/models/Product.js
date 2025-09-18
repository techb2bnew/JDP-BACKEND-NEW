import { supabase } from '../config/database.js';

export class Product {
  static async create(productData) {
    try {
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

      let query = supabase
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
        `, { count: 'exact' });

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

      const { count, error: countError } = await query;

      if (countError) {
        throw new Error(`Database error: ${countError.message}`);
      }

      let dataQuery = supabase
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
        `);

   
      if (filters.category) {
        dataQuery = dataQuery.ilike('category', `%${filters.category}%`);
      }
      if (filters.supplier_id) {
        dataQuery = dataQuery.eq('supplier_id', filters.supplier_id);
      }
      if (filters.job_id) {
        dataQuery = dataQuery.eq('job_id', filters.job_id);
      }
      if (filters.is_custom) {
        dataQuery = dataQuery.eq('is_custom', filters.is_custom === 'true');
      }
      if (filters.status) {
        dataQuery = dataQuery.eq('status', filters.status);
      }
      if (filters.search) {
        dataQuery = dataQuery.or(`product_name.ilike.%${filters.search}%,description.ilike.%${filters.search}%,jdp_sku.ilike.%${filters.search}%`);
      }

      const { data, error } = await dataQuery
        .order('id', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      const totalPages = Math.ceil(count / limit);

      return {
        data: data || [],
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
          markup_percentage,
          markup_amount,
          jdp_price,
          profit_margin,
          stock_quantity,
          unit,
          status,
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

  static async delete(productId) {
    try {
      const product = await this.getProductById(productId);
      
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

      const { count, error: countError } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('supplier_id', supplierId);

      if (countError) {
        throw new Error(`Database error: ${countError.message}`);
      }

      const { data, error } = await supabase
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
          markup_percentage,
          markup_amount,
          jdp_price,
          profit_margin,
          stock_quantity,
          unit,
          status,
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
        .range(offset, offset + limit - 1);

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      const totalPages = Math.ceil(count / limit);

      return {
        data: data || [],
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

      const { count, error: countError } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('job_id', jobId);

      if (countError) {
        throw new Error(`Database error: ${countError.message}`);
      }

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
        .eq('job_id', jobId)
        .order('id', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      const totalPages = Math.ceil(count / limit);

      return {
        data: data || [],
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

      let query = supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('is_custom', true);

      if (jobId) {
        query = query.eq('job_id', jobId);
      }

      const { count, error: countError } = await query;

      if (countError) {
        throw new Error(`Database error: ${countError.message}`);
      }

      let dataQuery = supabase
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
        .eq('is_custom', true);

      if (jobId) {
        dataQuery = dataQuery.eq('job_id', jobId);
      }

      const { data, error } = await dataQuery
        .order('id', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      const totalPages = Math.ceil(count / limit);

      return {
        data: data || [],
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
      // Get total products count
      const { data: totalProducts, error: totalError } = await supabase
        .from('products')
        .select('id', { count: 'exact' });

      if (totalError) {
        throw new Error(`Database error: ${totalError.message}`);
      }

      // Get active products count (status = 'active')
      const { data: activeProducts, error: activeError } = await supabase
        .from('products')
        .select('id', { count: 'exact' })
        .eq('status', 'active');

      if (activeError) {
        throw new Error(`Database error: ${activeError.message}`);
      }

      // Get inactive products count (status = 'inactive')
      const { data: inactiveProducts, error: inactiveError } = await supabase
        .from('products')
        .select('id', { count: 'exact' })
        .eq('status', 'inactive');

      if (inactiveError) {
        throw new Error(`Database error: ${inactiveError.message}`);
      }

      // Get draft products count (status = 'draft')
      const { data: draftProducts, error: draftError } = await supabase
        .from('products')
        .select('id', { count: 'exact' })
        .eq('status', 'draft');

      if (draftError) {
        throw new Error(`Database error: ${draftError.message}`);
      }

      // Get low stock products count (stock <= 10)
      const { data: lowStockProducts, error: lowStockError } = await supabase
        .from('products')
        .select('id', { count: 'exact' })
        .lte('stock_quantity', 10);

      if (lowStockError) {
        throw new Error(`Database error: ${lowStockError.message}`);
      }

      // Get total inventory value
      const { data: inventoryData, error: inventoryError } = await supabase
        .from('products')
        .select('jdp_price, stock_quantity');

      if (inventoryError) {
        throw new Error(`Database error: ${inventoryError.message}`);
      }

      // Calculate total inventory value
      const totalInventoryValue = inventoryData?.reduce((total, product) => {
        const price = parseFloat(product.jdp_price) || 0;
        const quantity = parseInt(product.stock_quantity) || 0;
        return total + (price * quantity);
      }, 0) || 0;

      const total = totalProducts?.length || 0;
      const active = activeProducts?.length || 0;
      const inactive = inactiveProducts?.length || 0;
      const draft = draftProducts?.length || 0;
      const lowStock = lowStockProducts?.length || 0;

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
}
