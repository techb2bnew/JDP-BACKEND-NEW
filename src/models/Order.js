import { supabase } from "../config/database.js";

export class Order {
  static async generateOrderNumber() {
    try {
      const year = new Date().getFullYear();
      const { data, error } = await supabase
        .from("orders")
        .select("order_number")
        .like("order_number", `ORD-${year}-%`)
        .order("created_at", { ascending: false })
        .limit(1);

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      let nextNumber = 1;
      if (data && data.length > 0) {
        const lastOrderNumber = data[0].order_number;
        const lastNumber = parseInt(lastOrderNumber.split("-")[2]);
        nextNumber = lastNumber + 1;
      }

      return `ORD-${year}-${String(nextNumber).padStart(3, "0")}`;
    } catch (error) {
      throw error;
    }
  }

  static async create(orderData) {
    try {
      // Generate order number if not provided
      if (!orderData.order_number) {
        orderData.order_number = await Order.generateOrderNumber();
      }

      const { data, error } = await supabase
        .from("orders")
        .insert([orderData])
        .select(`
          *,
          customer:customers!orders_customer_id_fkey(
            id,
            customer_name,
            company_name,
            email,
            phone
          ),
          contractor:contractors!orders_contractor_id_fkey(
            id,
            contractor_name,
            company_name,
            email,
            phone
          ),
          job:jobs!orders_job_id_fkey(
            id,
            job_title,
            job_type,
            status
          ),
          supplier:suppliers!orders_supplier_id_fkey(
            id,
            supplier_code,
            company_name,
            contact_person
          ),
          lead_labour:lead_labor!orders_lead_labour_id_fkey(
            id,
            labor_code,
            user_id,
            department,
            specialization
          ),
          created_by_user:users!orders_created_by_fkey(
            id,
            full_name,
            email
          )
        `)
        .single();

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      if (!data) return null;

      // Fetch order items
      const orderWithItems = await Order.addOrderItems(data);
      return orderWithItems;
    } catch (error) {
      throw error;
    }
  }

  static async addOrderItems(order) {
    try {
      const { data: items, error } = await supabase
        .from("order_items")
        .select(`
          *,
          product:products!order_items_product_id_fkey(
            id,
            product_name,
            jdp_sku,
            supplier_sku,
            jdp_price,
            stock_quantity,
            unit,
            category,
            description
          )
        `)
        .eq("order_id", order.id)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching order items:", error);
        return { ...order, order_items: [] };
      }

      return { ...order, order_items: items || [] };
    } catch (error) {
      console.error("Error in addOrderItems:", error);
      return { ...order, order_items: [] };
    }
  }

  static async findById(orderId) {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          customer:customers!orders_customer_id_fkey(
            id,
            customer_name,
            company_name,
            email,
            phone
          ),
          contractor:contractors!orders_contractor_id_fkey(
            id,
            contractor_name,
            company_name,
            email,
            phone
          ),
          job:jobs!orders_job_id_fkey(
            id,
            job_title,
            job_type,
            status
          ),
          supplier:suppliers!orders_supplier_id_fkey(
            id,
            supplier_code,
            company_name,
            contact_person
          ),
          lead_labour:lead_labor!orders_lead_labour_id_fkey(
            id,
            labor_code,
            user_id,
            department,
            specialization
          ),
          created_by_user:users!orders_created_by_fkey(
            id,
            full_name,
            email
          )
        `)
        .eq("id", orderId)
        .single();

      if (error && error.code !== "PGRST116") {
        throw new Error(`Database error: ${error.message}`);
      }

      if (!data) return null;

      return await Order.addOrderItems(data);
    } catch (error) {
      throw error;
    }
  }

  static async findAll(filters = {}, pagination = {}) {
    try {
      let query = supabase
        .from("orders")
        .select(`
          *,
          customer:customers!orders_customer_id_fkey(
            id,
            customer_name,
            company_name,
            email,
            phone
          ),
          contractor:contractors!orders_contractor_id_fkey(
            id,
            contractor_name,
            company_name,
            email,
            phone
          ),
          job:jobs!orders_job_id_fkey(
            id,
            job_title,
            job_type,
            status
          ),
          supplier:suppliers!orders_supplier_id_fkey(
            id,
            supplier_code,
            company_name,
            contact_person
          ),
          lead_labour:lead_labor!orders_lead_labour_id_fkey(
            id,
            labor_code,
            user_id,
            department,
            specialization
          ),
          created_by_user:users!orders_created_by_fkey(
            id,
            full_name,
            email
          )
        `, { count: 'exact' });

      // Apply filters
      if (filters.status) {
        query = query.eq("status", filters.status);
      }
      if (filters.payment_status) {
        query = query.eq("payment_status", filters.payment_status);
      }
      if (filters.customer_id) {
        query = query.eq("customer_id", filters.customer_id);
      }
      if (filters.contractor_id) {
        query = query.eq("contractor_id", filters.contractor_id);
      }
      if (filters.job_id) {
        query = query.eq("job_id", filters.job_id);
      }
      if (filters.supplier_id) {
        query = query.eq("supplier_id", filters.supplier_id);
      }
      if (filters.lead_labour_id) {
        query = query.eq("lead_labour_id", filters.lead_labour_id);
      }
      if (filters.order_number) {
        query = query.eq("order_number", filters.order_number);
      }
      if (filters.search) {
        query = query.or(`order_number.ilike.%${filters.search}%,notes.ilike.%${filters.search}%`);
      }

      // Pagination
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

      // Add order items to each order
      const ordersWithItems = await Promise.all(
        (data || []).map(order => Order.addOrderItems(order))
      );

      return {
        orders: ordersWithItems,
        total: count || 0,
        page: pagination.page || 1,
        limit: pagination.limit || 10,
        totalPages: pagination.limit ? Math.ceil((count || 0) / pagination.limit) : 1
      };
    } catch (error) {
      throw error;
    }
  }

  static async update(orderId, updateData) {
    try {
      const { data, error } = await supabase
        .from("orders")
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq("id", orderId)
        .select(`
          *,
          customer:customers!orders_customer_id_fkey(
            id,
            customer_name,
            company_name,
            email,
            phone
          ),
          contractor:contractors!orders_contractor_id_fkey(
            id,
            contractor_name,
            company_name,
            email,
            phone
          ),
          job:jobs!orders_job_id_fkey(
            id,
            job_title,
            job_type,
            status
          ),
          supplier:suppliers!orders_supplier_id_fkey(
            id,
            supplier_code,
            company_name,
            contact_person
          ),
          lead_labour:lead_labor!orders_lead_labour_id_fkey(
            id,
            labor_code,
            user_id,
            department,
            specialization
          ),
          created_by_user:users!orders_created_by_fkey(
            id,
            full_name,
            email
          )
        `)
        .single();

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      if (!data) return null;

      return await Order.addOrderItems(data);
    } catch (error) {
      throw error;
    }
  }

  static async delete(orderId) {
    try {
      const { error } = await supabase
        .from("orders")
        .delete()
        .eq("id", orderId);

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return true;
    } catch (error) {
      throw error;
    }
  }

  static async getStats() {
    try {
      const { data: totalOrders, error: totalError } = await supabase
        .from("orders")
        .select("id, total_amount", { count: 'exact' });

      if (totalError) {
        throw new Error(`Database error: ${totalError.message}`);
      }

      const { data: pendingOrders, error: pendingError } = await supabase
        .from("orders")
        .select("id", { count: 'exact' })
        .eq("status", "pending");

      const { data: processingOrders, error: processingError } = await supabase
        .from("orders")
        .select("id", { count: 'exact' })
        .eq("status", "processing");

      const { data: completedOrders, error: completedError } = await supabase
        .from("orders")
        .select("id", { count: 'exact' })
        .eq("status", "completed");

      const total = totalOrders?.length || 0;
      const pending = pendingOrders?.length || 0;
      const processing = processingOrders?.length || 0;
      const completed = completedOrders?.length || 0;

      const totalRevenue = (totalOrders || []).reduce((sum, order) => {
        return sum + (parseFloat(order.total_amount) || 0);
      }, 0);

      return {
        total,
        pending,
        processing,
        completed,
        totalRevenue: totalRevenue.toFixed(2),
        pendingPercentage: total > 0 ? ((pending / total) * 100).toFixed(1) : "0.0",
        processingPercentage: total > 0 ? ((processing / total) * 100).toFixed(1) : "0.0",
        completedPercentage: total > 0 ? ((completed / total) * 100).toFixed(1) : "0.0"
      };
    } catch (error) {
      throw error;
    }
  }
}
