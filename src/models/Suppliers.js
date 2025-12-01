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

      
      const [countResult, dataResult, ordersResult] = await Promise.all([
        supabase
          .from('suppliers')
          .select('*', { count: 'exact', head: true }),
        supabase
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
          .range(offset, offset + limit - 1),
   
        supabase
          .from('orders')
          .select('id, supplier_id, status, total_amount')
      ]);

      if (countResult.error) {
        throw new Error(`Database error: ${countResult.error.message}`);
      }

      if (dataResult.error) {
        throw new Error(`Database error: ${dataResult.error.message}`);
      }

      const count = countResult.count || 0;
      const data = dataResult.data || [];

    
      let supplierIdToOrderCount = {};
      if (!ordersResult.error && ordersResult.data) {

        const supplierIdsSet = new Set(data.map(s => s.id));
        
        for (const order of ordersResult.data) {
          const supplierIdNum = parseInt(order.supplier_id);
          if (!Number.isNaN(supplierIdNum) && supplierIdsSet.has(supplierIdNum)) {
            if (!supplierIdToOrderCount[supplierIdNum]) {
              supplierIdToOrderCount[supplierIdNum] = { total: 0, total_value: 0 };
            }
            supplierIdToOrderCount[supplierIdNum].total += 1;
            const parsedAmount = parseFloat(order.total_amount || 0);
            if (!Number.isNaN(parsedAmount)) {
              supplierIdToOrderCount[supplierIdNum].total_value += parsedAmount;
            }
          }
        }
      }

      const totalPages = Math.ceil(count / limit);

      return {
        data: data.map(s => ({
          ...s,
          total_orders: supplierIdToOrderCount[s.id]?.total || 0,
          total_orders_value: supplierIdToOrderCount[s.id]?.total_value || 0
        })),
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

      const { data: supplier, error: supplierError } = await supabase
        .from('suppliers')
        .select(`
          id,
          supplier_code,
          company_name,
          user_id,
          users!suppliers_user_id_fkey (
            id,
            full_name,
            email
          )
        `)
        .eq('id', supplierId)
        .single();

      if (supplierError || !supplier) {
        throw new Error(`Supplier not found with ID: ${supplierId}`);
      }

      const userId = supplier.user_id;
      

      const [supplierDeleteResult, userDeleteResult] = await Promise.all([
        supabase
          .from('suppliers')
          .delete()
          .eq('id', supplierId),
        supabase
          .from('users')
          .delete()
          .eq('id', userId)
      ]);

      if (supplierDeleteResult.error) {
        throw new Error(`Database error: ${supplierDeleteResult.error.message}`);
      }

      if (userDeleteResult.error) {
        throw new Error(`Database error: ${userDeleteResult.error.message}`);
      }

      return {
        success: true,
        message: `Supplier "${supplier.users?.full_name || 'Unknown'}" deleted successfully`,
        deleted_supplier: {
          id: supplier.id,
          full_name: supplier.users?.full_name || 'Unknown',
          email: supplier.users?.email || 'Unknown',
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

  
  static async checkSupplierRelationships(supplierId) {
    try {
      if (!supplierId) {
        throw new Error('Supplier ID is required');
      }

      const relationships = [];

      
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

  static async search(filters, pagination = {}) {
    try {
      const q = (filters.q || '').toLowerCase().trim();


      const [suppliersResult, ordersResult] = await Promise.all([
        supabase
          .from("suppliers")
          .select(`
            *,
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
          `),
      
        supabase
          .from('orders')
          .select('id, supplier_id, status, total_amount')
      ]);

      if (suppliersResult.error) {
        throw new Error(`Database error: ${suppliersResult.error.message}`);
      }

      const data = suppliersResult.data || [];

      const inStr = (s) => (s || '').toString().toLowerCase().includes(q);

      const matches = (supplier) => {
    
        if (q) {
          const supplierMatch = inStr(supplier.users?.full_name) || 
                               inStr(supplier.users?.email) || 
                               inStr(supplier.users?.phone) || 
                               inStr(supplier.company_name) ||
                               inStr(supplier.contact_person);
          if (!supplierMatch) return false;
        }

   
        if (filters.name && !inStr(supplier.users?.full_name)) return false;
        if (filters.email && !inStr(supplier.users?.email)) return false;
        if (filters.company && !inStr(supplier.company_name)) return false;
        if (filters.contact && !inStr(supplier.contact_person) && !inStr(supplier.users?.phone)) return false;
        if (filters.status && supplier.users?.status !== filters.status) return false;

        return true;
      };

      let filtered = data.filter(matches);

   
      let supplierIdToOrderCount = {};
      if (!ordersResult.error && ordersResult.data) {
    
        const filteredSupplierIds = new Set(filtered.map(s => s.id));
        
        for (const order of ordersResult.data) {
          const supplierIdNum = parseInt(order.supplier_id);
          if (!Number.isNaN(supplierIdNum) && filteredSupplierIds.has(supplierIdNum)) {
            if (!supplierIdToOrderCount[supplierIdNum]) {
              supplierIdToOrderCount[supplierIdNum] = { total: 0, total_value: 0 };
            }
            supplierIdToOrderCount[supplierIdNum].total += 1;
            const parsedAmount = parseFloat(order.total_amount || 0);
            if (!Number.isNaN(parsedAmount)) {
              supplierIdToOrderCount[supplierIdNum].total_value += parsedAmount;
            }
          }
        }
      }

  
      filtered = filtered.sort((a, b) => {
        const dateA = new Date(a.created_at || 0);
        const dateB = new Date(b.created_at || 0);
        return dateB - dateA;
      });

      const page = parseInt(pagination.page) || 1;
      const limit = parseInt(pagination.limit) || 10;
      const offset = (page - 1) * limit;
      const sliced = filtered.slice(offset, offset + limit);

      return {
        suppliers: sliced.map(s => ({
          ...s,
          total_orders: supplierIdToOrderCount[s.id]?.total || 0,
          total_orders_value: supplierIdToOrderCount[s.id]?.total_value || 0
        })),
        total: filtered.length,
        page,
        limit,
        totalPages: Math.ceil(filtered.length / limit) || 1
      };
    } catch (error) {
      throw error;
    }
  }

  static async getStats() {
    try {

      const [suppliersResult, ordersResult] = await Promise.all([
        supabase
          .from('suppliers')
          .select(`
            *,
            users!suppliers_user_id_fkey (
              id,
              status
            )
          `),
        supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
      ]);

      if (suppliersResult.error) {
        throw new Error(`Database error: ${suppliersResult.error.message}`);
      }

      if (ordersResult.error) {
        throw new Error(`Database error: ${ordersResult.error.message}`);
      }

      const allSuppliers = suppliersResult.data || [];
      
     
      let activeSuppliers = 0;
      let inactiveSuppliers = 0;
      for (const supplier of allSuppliers) {
        if (supplier.users?.status === 'active') {
          activeSuppliers++;
        } else {
          inactiveSuppliers++;
        }
      }

      const totalSuppliers = allSuppliers.length;
      const totalOrders = ordersResult.count || 0;

      return {
        total_suppliers: totalSuppliers,
        active_suppliers: activeSuppliers,
        inactive_suppliers: inactiveSuppliers,
        total_orders: totalOrders
      };
    } catch (error) {
      throw error;
    }
  }

  static async findByName(name) {
    try {
      if (!name) return null;

      const { data, error } = await supabase
        .from('suppliers')
        .select('id, company_name, contact_person')
        .or(`company_name.ilike.%${name}%,contact_person.ilike.%${name}%`)
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        return null;
      }

      return data;
    } catch (error) {
      return null;
    }
  }
}
