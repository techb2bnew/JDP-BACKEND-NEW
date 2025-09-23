import { supabase } from '../config/database.js';

export class Suppliers {
  static async create(supplierData) {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .insert([supplierData])
        .select(`
          *,
          users!suppliers_user_id_fkey (
            id,
            full_name,
            email,
            phone,
            role,
            status,
            photo_url,
            created_at
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

  static async getAllSuppliers(page = 1, limit = 10) {
    try {
      const offset = (page - 1) * limit;

    
      const { count, error: countError } = await supabase
        .from('suppliers')
        .select('*', { count: 'exact', head: true });

      if (countError) {
        throw new Error(`Database error: ${countError.message}`);
      }

      
      const { data, error } = await supabase
        .from('suppliers')
        .select(`
          *,
          users!suppliers_user_id_fkey (
            id,
            full_name,
            email,
            phone,
            role,
            status,
            photo_url,
            created_at
          )
        `)
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

  static async getSupplierById(supplierId) {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select(`
          *,
          users!suppliers_user_id_fkey (
            id,
            full_name,
            email,
            phone,
            role,
            status,
            photo_url,
            created_at
          )
        `)
        .eq('id', supplierId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new Error(`Database error: ${error.message}`);
      }

      if (!data) {
        throw new Error(`Supplier not found with ID: ${supplierId}`);
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  static async update(supplierId, updateData) {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .update(updateData)
        .eq('id', supplierId)
        .select(`
          *,
          users!suppliers_user_id_fkey (
            id,
            full_name,
            email,
            phone,
            role,
            status,
            photo_url,
            created_at
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

  static async delete(supplierId) {
    try {
      const supplier = await this.getSupplierById(supplierId);
      const userId = supplier.user_id;
      
      const { error: supplierError } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', supplierId);

      if (supplierError) {
        throw new Error(`Database error: ${supplierError.message}`);
      }

      const { error: userError } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (userError) {
        throw new Error(`Database error: ${userError.message}`);
      }

      return {
        success: true,
        message: `Supplier "${supplier.users.full_name}" deleted successfully`,
        deleted_supplier: {
          id: supplier.id,
          full_name: supplier.users.full_name,
          email: supplier.users.email,
          supplier_code: supplier.supplier_code,
          company_name: supplier.company_name
        }
      };
    } catch (error) {
      throw error;
    }
  }

  static async getSupplierByUserId(userId) {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select(`
          *,
          users!suppliers_user_id_fkey (
            id,
            full_name,
            email,
            phone,
            role,
            status,
            photo_url,
            created_at
          )
        `)
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new Error(`Database error: ${error.message}`);
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  static async findBySupplierCode(supplierCode) {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('supplier_code', supplierCode)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new Error(`Database error: ${error.message}`);
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  static async generateNextSupplierCode() {
    try {
      const currentYear = new Date().getFullYear();
      const prefix = `SUP-${currentYear}-`;
      
      
      const { data, error } = await supabase
        .from('suppliers')
        .select('supplier_code')
        .like('supplier_code', `${prefix}%`)
        .order('supplier_code', { ascending: false })
        .limit(1);

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      let nextNumber = 1;
      
      if (data && data.length > 0) {
       
        const lastCode = data[0].supplier_code;
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

  // Check if supplier has relationships with other tables before deletion
  static async checkSupplierRelationships(supplierId) {
    try {
      if (!supplierId) {
        throw new Error('Supplier ID is required');
      }

      const relationships = [];

      // Check products table
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('id, product_name')
        .eq('supplier_id', supplierId)
        .limit(1);

      if (!productsError && productsData && productsData.length > 0) {
        relationships.push({
          table: 'products',
          count: productsData.length,
          message: 'This supplier has associated products'
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
}
