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
            unit_cost,
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

      // Recalculate totals from order items
      let recalculatedSubtotal = 0;
      if (items && items.length > 0) {
        recalculatedSubtotal = items.reduce((sum, item) => {
          const unitCost = parseFloat(item.product?.unit_cost || 0);
          const quantity = parseInt(item.quantity || 0);
          return sum + (unitCost * quantity);
        }, 0);
      }

      const recalculatedTaxAmount = parseFloat(order.tax_amount || 0);
      const recalculatedDiscountAmount = parseFloat(order.discount_amount || 0);
      const recalculatedTotalAmount = recalculatedSubtotal + recalculatedTaxAmount - recalculatedDiscountAmount;

      // Add formatted currency fields
      const formattedOrder = {
        ...order,
        order_items: items || [],
        // Use recalculated values
        subtotal: recalculatedSubtotal,
        total_amount: recalculatedTotalAmount,
        subtotal_formatted: `$${recalculatedSubtotal.toFixed(2)}`,
        tax_amount_formatted: `$${recalculatedTaxAmount.toFixed(2)}`,
        discount_amount_formatted: `$${recalculatedDiscountAmount.toFixed(2)}`,
        total_amount_formatted: `$${recalculatedTotalAmount.toFixed(2)}`
      };

      return formattedOrder;
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
            status,
            bill_to_address,
            bill_to_city_zip,
            bill_to_phone,
            bill_to_email
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

  static async search(filters, pagination = {}) {
    try {
      const q = (filters.q || '').toLowerCase().trim();

      // Fetch all orders with relationships
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
            status,
            priority
          ),
          supplier:suppliers!orders_supplier_id_fkey(
            id,
            company_name,
            contact_person,
            address,
            users (
              id,
              full_name,
              email,
              phone
            )
          ),
          lead_labor:lead_labor!orders_lead_labour_id_fkey(
            id,
            labor_code,
            department,
            specialization,
            users (
              id,
              full_name,
              email,
              phone
            )
          ),
          created_by_user:users!orders_created_by_fkey(
            id,
            full_name,
            email
          )
        `);

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      const inStr = (s) => (s || '').toString().toLowerCase().includes(q);

      const matches = (order) => {
        // Text search across multiple fields
        if (q) {
          const orderMatch = inStr(order.order_number) ||
                            inStr(order.id.toString()) ||
                            inStr(order.job_id?.toString()) ||
                            inStr(order.customer_id?.toString()) ||
                            inStr(order.contractor_id?.toString()) ||
                            inStr(order.customer?.customer_name) ||
                            inStr(order.customer?.company_name) ||
                            inStr(order.customer?.email) ||
                            inStr(order.contractor?.contractor_name) ||
                            inStr(order.contractor?.company_name) ||
                            inStr(order.contractor?.email) ||
                            inStr(order.job?.job_title) ||
                            inStr(order.supplier?.company_name) ||
                            inStr(order.supplier?.users?.full_name) ||
                            inStr(order.lead_labor?.users?.full_name);
          if (!orderMatch) return false;
        }

        // Exact field filters
        if (filters.order_id && order.id !== parseInt(filters.order_id)) return false;
        if (filters.job_id && order.job_id !== parseInt(filters.job_id)) return false;
        if (filters.customer && !inStr(order.customer?.customer_name) && !inStr(order.customer?.company_name) && !inStr(order.customer?.email)) return false;
        if (filters.contractor && !inStr(order.contractor?.contractor_name) && !inStr(order.contractor?.company_name) && !inStr(order.contractor?.email)) return false;
        if (filters.status && filters.status.toLowerCase() !== 'all' && order.status !== filters.status) return false;

        // Date range filters
        if (filters.order_date_from && order.order_date && new Date(order.order_date) < filters.order_date_from) return false;
        if (filters.order_date_to && order.order_date && new Date(order.order_date) > filters.order_date_to) return false;

        return true;
      };

      let filtered = (data || []).filter(matches);

      // Sort by created_at (most recent first)
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
        orders: sliced,
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
