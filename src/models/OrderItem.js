import { supabase } from "../config/database.js";

export class OrderItem {
  static async create(orderItemData) {
    try {
      const { data, error } = await supabase
        .from("order_items")
        .insert([orderItemData])
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
        .single();

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  static async createBulk(orderItemsArray) {
    try {
      const { data, error } = await supabase
        .from("order_items")
        .insert(orderItemsArray)
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
        `);

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  static async findById(orderItemId) {
    try {
      const { data, error } = await supabase
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
        .eq("id", orderItemId)
        .single();

      if (error && error.code !== "PGRST116") {
        throw new Error(`Database error: ${error.message}`);
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  static async findByOrderId(orderId) {
    try {
      const { data, error } = await supabase
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
        .eq("order_id", orderId)
        .order("created_at", { ascending: true });

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      throw error;
    }
  }

  static async update(orderItemId, updateData) {
    try {
      const { data, error } = await supabase
        .from("order_items")
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq("id", orderItemId)
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
        .single();

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  static async delete(orderItemId) {
    try {
      const { error } = await supabase
        .from("order_items")
        .delete()
        .eq("id", orderItemId);

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return true;
    } catch (error) {
      throw error;
    }
  }

  static async deleteByOrderId(orderId) {
    try {
      const { error } = await supabase
        .from("order_items")
        .delete()
        .eq("order_id", orderId);

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return true;
    } catch (error) {
      throw error;
    }
  }
}
