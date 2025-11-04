import { Order } from "../models/Order.js";
import { OrderItem } from "../models/OrderItem.js";
import { supabase } from "../config/database.js";
import { successResponse } from "../helpers/responseHelper.js";

export class OrderService {
  static async createOrder(orderData, cartItems, userId, systemIp) {
    try {
      let subtotal = 0;
      const orderItemsToCreate = [];

      for (const item of cartItems) {
        const { data: product, error } = await supabase
          .from("products")
          .select("id, product_name, jdp_price, stock_quantity")
          .eq("id", item.product_id)
          .single();

        if (error || !product) {
          throw new Error(`Product with ID ${item.product_id} not found`);
        }

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

     
      const taxAmount = orderData.tax_amount || 0;
      const discountAmount = orderData.discount_amount || 0;
      const totalAmount = subtotal + taxAmount - discountAmount;

     
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

      
      const orderItemsWithOrderId = orderItemsToCreate.map(item => ({
        ...item,
        order_id: newOrder.id
      }));

      await OrderItem.createBulk(orderItemsWithOrderId);


      for (const item of cartItems) {
    
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

      // Extract cartItems if provided
      const { cartItems, ...orderDataToUpdate } = updateData;

      // If cartItems are provided, update order items
      if (cartItems && Array.isArray(cartItems) && cartItems.length > 0) {
        // Step 1: Restore stock for old order items
        if (existingOrder.items && existingOrder.items.length > 0) {
          for (const oldItem of existingOrder.items) {
            const { data: currentProduct } = await supabase
              .from("products")
              .select("stock_quantity")
              .eq("id", oldItem.product_id)
              .single();

            if (currentProduct) {
              const restoredStock = currentProduct.stock_quantity + oldItem.quantity;
              
              await supabase
                .from("products")
                .update({
                  stock_quantity: restoredStock
                })
                .eq("id", oldItem.product_id);
            }
          }
        }

        // Step 2: Delete old order items
        await OrderItem.deleteByOrderId(orderId);

        // Step 3: Calculate new totals and create new order items
        let subtotal = 0;
        const orderItemsToCreate = [];

        for (const item of cartItems) {
          const { data: product, error } = await supabase
            .from("products")
            .select("id, product_name, jdp_price, stock_quantity")
            .eq("id", item.product_id)
            .single();

          if (error || !product) {
            throw new Error(`Product with ID ${item.product_id} not found`);
          }

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

        // Step 4: Update order totals
        const taxAmount = orderDataToUpdate.tax_amount !== undefined ? orderDataToUpdate.tax_amount : (existingOrder.tax_amount || 0);
        const discountAmount = orderDataToUpdate.discount_amount !== undefined ? orderDataToUpdate.discount_amount : (existingOrder.discount_amount || 0);
        const totalAmount = subtotal + taxAmount - discountAmount;

        orderDataToUpdate.total_items = cartItems.length;
        orderDataToUpdate.subtotal = subtotal;
        orderDataToUpdate.tax_amount = taxAmount;
        orderDataToUpdate.discount_amount = discountAmount;
        orderDataToUpdate.total_amount = totalAmount;

        // Step 5: Create new order items
        const orderItemsWithOrderId = orderItemsToCreate.map(item => ({
          ...item,
          order_id: orderId
        }));

        await OrderItem.createBulk(orderItemsWithOrderId);

        // Step 6: Deduct stock for new items
        for (const item of cartItems) {
          const { data: currentProduct } = await supabase
            .from("products")
            .select("stock_quantity")
            .eq("id", item.product_id)
            .single();

          if (currentProduct) {
            const newStock = currentProduct.stock_quantity - item.quantity;
            
            await supabase
              .from("products")
              .update({
                stock_quantity: newStock
              })
              .eq("id", item.product_id);
          }
        }
      }

      // Step 7: Update order data (excluding cartItems as it's already handled)
      const updatedOrder = await Order.update(orderId, orderDataToUpdate);
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

      // Step 1: Restore stock for all order items
      if (existingOrder.order_items && existingOrder.order_items.length > 0) {
        for (const item of existingOrder.order_items) {
          if (item.product_id) {
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

        // Step 2: Delete all order items
        await OrderItem.deleteByOrderId(orderId);
      }

      // Step 3: Delete the order
      await Order.delete(orderId);
      
      return { 
        message: "Order deleted successfully",
        deletedOrderId: orderId
      };
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


      await supabase
        .from("products")
        .update({
          stock_quantity: product.stock_quantity - quantity
        })
        .eq("id", product.id);


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

  static async searchOrders(filters, pagination) {
    try {
      const result = await Order.search(filters, pagination);
      return successResponse(
        {
          orders: result.orders,
          pagination: {
            page: result.page,
            limit: result.limit,
            total: result.total,
            totalPages: result.totalPages
          }
        },
        "Orders searched successfully"
      );
    } catch (error) {
      throw error;
    }
  }
}
