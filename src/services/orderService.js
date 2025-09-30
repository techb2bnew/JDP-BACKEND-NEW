import { Order } from "../models/Order.js";
import { OrderItem } from "../models/OrderItem.js";
import { supabase } from "../config/database.js";

export class OrderService {
  static async createOrder(orderData, cartItems, userId, systemIp) {
    try {
      // Calculate totals from cart items
      let subtotal = 0;
      const orderItemsToCreate = [];

      // Validate and prepare order items
      for (const item of cartItems) {
        const { data: product, error } = await supabase
          .from("products")
          .select("id, product_name, jdp_price, stock_quantity")
          .eq("id", item.product_id)
          .single();

        if (error || !product) {
          throw new Error(`Product with ID ${item.product_id} not found`);
        }

        // Check stock availability
        if (product.stock_quantity < item.quantity) {
          throw new Error(`Insufficient stock for product: ${product.product_name}. Available: ${product.stock_quantity}`);
        }

        const unitPrice = parseFloat(product.jdp_price) || 0;
        const quantity = parseInt(item.quantity) || 1;
        const totalPrice = unitPrice * quantity;

        subtotal += totalPrice;

        orderItemsToCreate.push({
          product_id: product.id,
          quantity: quantity,
          total_price: totalPrice
        });
      }

      // Calculate tax and total
      const taxAmount = orderData.tax_amount || 0;
      const discountAmount = orderData.discount_amount || 0;
      const totalAmount = subtotal + taxAmount - discountAmount;

      // Create order
      const newOrder = await Order.create({
        ...orderData,
        total_items: cartItems.length,
        subtotal: subtotal,
        tax_amount: taxAmount,
        discount_amount: discountAmount,
        total_amount: totalAmount,
        created_by: userId,
        system_ip: systemIp
      });

      // Create order items
      const orderItemsWithOrderId = orderItemsToCreate.map(item => ({
        ...item,
        order_id: newOrder.id
      }));

      await OrderItem.createBulk(orderItemsWithOrderId);

      // Update product stock quantities
      for (const item of cartItems) {
        // Get current stock
        const { data: currentProduct } = await supabase
          .from("products")
          .select("stock_quantity")
          .eq("id", item.product_id)
          .single();

        if (currentProduct) {
          const newStock = currentProduct.stock_quantity - item.quantity;
          
          const { error: updateError } = await supabase
            .from("products")
            .update({
              stock_quantity: newStock
            })
            .eq("id", item.product_id);

          if (updateError) {
            console.error(`Error updating stock for product ${item.product_id}:`, updateError);
          }
        }
      }

      // Fetch complete order with items
      const completeOrder = await Order.findById(newOrder.id);
      return completeOrder;
    } catch (error) {
      throw error;
    }
  }

  static async getOrderById(orderId) {
    try {
      const order = await Order.findById(orderId);
      if (!order) {
        throw new Error("Order not found");
      }
      return order;
    } catch (error) {
      throw error;
    }
  }

  static async getAllOrders(filters = {}, pagination = {}) {
    try {
      return await Order.findAll(filters, pagination);
    } catch (error) {
      throw error;
    }
  }

  static async updateOrder(orderId, updateData, userId) {
    try {
      const existingOrder = await Order.findById(orderId);
      if (!existingOrder) {
        throw new Error("Order not found");
      }

      const updatedOrder = await Order.update(orderId, updateData);
      return updatedOrder;
    } catch (error) {
      throw error;
    }
  }

  static async updateOrderStatus(orderId, status, userId) {
    try {
      const validStatuses = ['pending', 'processing', 'confirmed', 'shipped', 'delivered', 'cancelled', 'completed'];
      
      if (!validStatuses.includes(status)) {
        throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
      }

      const updatedOrder = await Order.update(orderId, { status });
      return updatedOrder;
    } catch (error) {
      throw error;
    }
  }

  static async updatePaymentStatus(orderId, paymentStatus, paymentMethod = null) {
    try {
      const validPaymentStatuses = ['unpaid', 'partial', 'paid', 'refunded'];
      
      if (!validPaymentStatuses.includes(paymentStatus)) {
        throw new Error(`Invalid payment status. Must be one of: ${validPaymentStatuses.join(', ')}`);
      }

      const updateData = { payment_status: paymentStatus };
      if (paymentMethod) {
        updateData.payment_method = paymentMethod;
      }

      const updatedOrder = await Order.update(orderId, updateData);
      return updatedOrder;
    } catch (error) {
      throw error;
    }
  }

  static async deleteOrder(orderId) {
    try {
      const existingOrder = await Order.findById(orderId);
      if (!existingOrder) {
        throw new Error("Order not found");
      }

      // Restore product stock before deleting
      if (existingOrder.order_items && existingOrder.order_items.length > 0) {
        for (const item of existingOrder.order_items) {
          if (item.product_id) {
            // Get current stock
            const { data: currentProduct } = await supabase
              .from("products")
              .select("stock_quantity")
              .eq("id", item.product_id)
              .single();

            if (currentProduct) {
              const newStock = currentProduct.stock_quantity + item.quantity;
              
              await supabase
                .from("products")
                .update({
                  stock_quantity: newStock
                })
                .eq("id", item.product_id);
            }
          }
        }
      }

      await Order.delete(orderId);
      return { message: "Order deleted successfully" };
    } catch (error) {
      throw error;
    }
  }

  static async getOrderStats() {
    try {
      return await Order.getStats();
    } catch (error) {
      throw error;
    }
  }

  static async getOrdersByCustomer(customerId, pagination = {}) {
    try {
      return await Order.findAll({ customer_id: customerId }, pagination);
    } catch (error) {
      throw error;
    }
  }

  static async getOrdersByJob(jobId, pagination = {}) {
    try {
      return await Order.findAll({ job_id: jobId }, pagination);
    } catch (error) {
      throw error;
    }
  }

  static async getOrdersBySupplier(supplierId, pagination = {}) {
    try {
      return await Order.findAll({ supplier_id: supplierId }, pagination);
    } catch (error) {
      throw error;
    }
  }

  static async addOrderItem(orderId, itemData) {
    try {
      const order = await Order.findById(orderId);
      if (!order) {
        throw new Error("Order not found");
      }

      const { data: product, error } = await supabase
        .from("products")
        .select("id, product_name, jdp_price, stock_quantity")
        .eq("id", itemData.product_id)
        .single();

      if (error || !product) {
        throw new Error(`Product with ID ${itemData.product_id} not found`);
      }

      // Check stock availability
      if (product.stock_quantity < (itemData.quantity || 1)) {
        throw new Error(`Insufficient stock for product: ${product.product_name}. Available: ${product.stock_quantity}`);
      }

      const unitPrice = parseFloat(product.jdp_price) || 0;
      const quantity = itemData.quantity || 1;
      const totalPrice = unitPrice * quantity;

      const newItem = await OrderItem.create({
        order_id: orderId,
        product_id: product.id,
        quantity: quantity,
        total_price: totalPrice
      });

      // Update product stock
      await supabase
        .from("products")
        .update({
          stock_quantity: product.stock_quantity - quantity
        })
        .eq("id", product.id);

      // Update order totals
      const newSubtotal = parseFloat(order.subtotal) + totalPrice;
      const newTotalAmount = newSubtotal + parseFloat(order.tax_amount) - parseFloat(order.discount_amount);
      
      await Order.update(orderId, {
        total_items: order.total_items + 1,
        subtotal: newSubtotal,
        total_amount: newTotalAmount
      });

      return newItem;
    } catch (error) {
      throw error;
    }
  }

  static async removeOrderItem(orderId, orderItemId) {
    try {
      const item = await OrderItem.findById(orderItemId);
      if (!item || item.order_id !== orderId) {
        throw new Error("Order item not found");
      }

      await OrderItem.delete(orderItemId);

      // Update order totals
      const order = await Order.findById(orderId);
      const newSubtotal = parseFloat(order.subtotal) - parseFloat(item.total_price);
      const newTotalAmount = newSubtotal + parseFloat(order.tax_amount) - parseFloat(order.discount_amount);
      
      await Order.update(orderId, {
        total_items: Math.max(0, order.total_items - 1),
        subtotal: Math.max(0, newSubtotal),
        total_amount: Math.max(0, newTotalAmount)
      });

      return { message: "Order item removed successfully" };
    } catch (error) {
      throw error;
    }
  }
}
