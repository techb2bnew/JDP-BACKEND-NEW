import { OrderService } from "../services/orderService.js";

export class OrderController {
  static async createOrder(request, reply) {
    try {
      const { cartItems, ...orderData } = request.body;
      const userId = request.user?.id;
      const systemIp = request.ip || request.socket.remoteAddress;

      if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
        return reply.status(400).send({
          success: false,
          message: "Cart items are required",
          statusCode: 400
        });
      }

      const order = await OrderService.createOrder(
        orderData,
        cartItems,
        userId,
        systemIp
      );

      return reply.status(201).send({
        success: true,
        message: "Order created successfully",
        data: order,
        statusCode: 201
      });
    } catch (error) {
      console.error("Error in createOrder:", error);
      return reply.status(500).send({
        success: false,
        message: error.message || "Failed to create order",
        statusCode: 500
      });
    }
  }

  static async getOrderById(request, reply) {
    try {
      const { id } = request.params;
      const order = await OrderService.getOrderById(parseInt(id));
      
      return reply.status(200).send({
        success: true,
        message: "Order retrieved successfully",
        data: order,
        statusCode: 200
      });
    } catch (error) {
      console.error("Error in getOrderById:", error);
      return reply.status(500).send({
        success: false,
        message: error.message || "Failed to retrieve order",
        statusCode: 500
      });
    }
  }

  static async getAllOrders(request, reply) {
    try {
      const {
        page = 1,
        limit = 10,
        sortBy = 'created_at',
        sortOrder = 'desc',
        status,
        payment_status,
        customer_id,
        contractor_id,
        job_id,
        supplier_id,
        lead_labour_id,
        order_number,
        search
      } = request.query;

      const filters = {};
      if (status) filters.status = status;
      if (payment_status) filters.payment_status = payment_status;
      if (customer_id) filters.customer_id = parseInt(customer_id);
      if (contractor_id) filters.contractor_id = parseInt(contractor_id);
      if (job_id) filters.job_id = parseInt(job_id);
      if (supplier_id) filters.supplier_id = parseInt(supplier_id);
      if (lead_labour_id) filters.lead_labour_id = parseInt(lead_labour_id);
      if (order_number) filters.order_number = order_number;
      if (search) filters.search = search;

      const pagination = {
        page: parseInt(page),
        limit: parseInt(limit),
        sortBy,
        sortOrder
      };

      const result = await OrderService.getAllOrders(filters, pagination);
      
      return reply.status(200).send({
        success: true,
        message: "Orders retrieved successfully",
        data: result,
        statusCode: 200
      });
    } catch (error) {
      console.error("Error in getAllOrders:", error);
      return reply.status(500).send({
        success: false,
        message: error.message || "Failed to retrieve orders",
        statusCode: 500
      });
    }
  }

  static async updateOrder(request, reply) {
    try {
      const { id } = request.params;
      const userId = request.user?.id;
      const updateData = request.body;

      const order = await OrderService.updateOrder(parseInt(id), updateData, userId);
      
      return reply.status(200).send({
        success: true,
        message: "Order updated successfully",
        data: order,
        statusCode: 200
      });
    } catch (error) {
      console.error("Error in updateOrder:", error);
      return reply.status(500).send({
        success: false,
        message: error.message || "Failed to update order",
        statusCode: 500
      });
    }
  }

  static async updateOrderStatus(request, reply) {
    try {
      const { id } = request.params;
      const { status } = request.body;
      const userId = request.user?.id;

      if (!status) {
        return reply.status(400).send({
          success: false,
          message: "Status is required",
          statusCode: 400
        });
      }

      const order = await OrderService.updateOrderStatus(parseInt(id), status, userId);
      
      return reply.status(200).send({
        success: true,
        message: "Order status updated successfully",
        data: order,
        statusCode: 200
      });
    } catch (error) {
      console.error("Error in updateOrderStatus:", error);
      return reply.status(500).send({
        success: false,
        message: error.message || "Failed to update order status",
        statusCode: 500
      });
    }
  }

  static async updatePaymentStatus(request, reply) {
    try {
      const { id } = request.params;
      const { payment_status, payment_method } = request.body;

      if (!payment_status) {
        return reply.status(400).send({
          success: false,
          message: "Payment status is required",
          statusCode: 400
        });
      }

      const order = await OrderService.updatePaymentStatus(
        parseInt(id),
        payment_status,
        payment_method
      );
      
      return reply.status(200).send({
        success: true,
        message: "Payment status updated successfully",
        data: order,
        statusCode: 200
      });
    } catch (error) {
      console.error("Error in updatePaymentStatus:", error);
      return reply.status(500).send({
        success: false,
        message: error.message || "Failed to update payment status",
        statusCode: 500
      });
    }
  }

  static async deleteOrder(request, reply) {
    try {
      const { id } = request.params;
      const result = await OrderService.deleteOrder(parseInt(id));
      
      return reply.status(200).send({
        success: true,
        message: "Order deleted successfully",
        data: result,
        statusCode: 200
      });
    } catch (error) {
      console.error("Error in deleteOrder:", error);
      return reply.status(500).send({
        success: false,
        message: error.message || "Failed to delete order",
        statusCode: 500
      });
    }
  }

  static async getOrderStats(request, reply) {
    try {
      const stats = await OrderService.getOrderStats();
      
      return reply.status(200).send({
        success: true,
        message: "Order statistics retrieved successfully",
        data: stats,
        statusCode: 200
      });
    } catch (error) {
      console.error("Error in getOrderStats:", error);
      return reply.status(500).send({
        success: false,
        message: error.message || "Failed to retrieve order statistics",
        statusCode: 500
      });
    }
  }

  static async getOrdersByCustomer(request, reply) {
    try {
      const { customerId } = request.params;
      const { page = 1, limit = 10 } = request.query;

      const pagination = {
        page: parseInt(page),
        limit: parseInt(limit)
      };

      const result = await OrderService.getOrdersByCustomer(parseInt(customerId), pagination);
      
      return reply.status(200).send({
        success: true,
        message: "Customer orders retrieved successfully",
        data: result,
        statusCode: 200
      });
    } catch (error) {
      console.error("Error in getOrdersByCustomer:", error);
      return reply.status(500).send({
        success: false,
        message: error.message || "Failed to retrieve customer orders",
        statusCode: 500
      });
    }
  }

  static async getOrdersByJob(request, reply) {
    try {
      const { jobId } = request.params;
      const { page = 1, limit = 10 } = request.query;

      const pagination = {
        page: parseInt(page),
        limit: parseInt(limit)
      };

      const result = await OrderService.getOrdersByJob(parseInt(jobId), pagination);
      
      return reply.status(200).send({
        success: true,
        message: "Job orders retrieved successfully",
        data: result,
        statusCode: 200
      });
    } catch (error) {
      console.error("Error in getOrdersByJob:", error);
      return reply.status(500).send({
        success: false,
        message: error.message || "Failed to retrieve job orders",
        statusCode: 500
      });
    }
  }

  static async getOrdersBySupplier(request, reply) {
    try {
      const { supplierId } = request.params;
      const { page = 1, limit = 10 } = request.query;

      const pagination = {
        page: parseInt(page),
        limit: parseInt(limit)
      };

      const result = await OrderService.getOrdersBySupplier(parseInt(supplierId), pagination);
      
      return reply.status(200).send({
        success: true,
        message: "Supplier orders retrieved successfully",
        data: result,
        statusCode: 200
      });
    } catch (error) {
      console.error("Error in getOrdersBySupplier:", error);
      return reply.status(500).send({
        success: false,
        message: error.message || "Failed to retrieve supplier orders",
        statusCode: 500
      });
    }
  }

  static async addOrderItem(request, reply) {
    try {
      const { orderId } = request.params;
      const itemData = request.body;

      const item = await OrderService.addOrderItem(parseInt(orderId), itemData);
      
      return reply.status(201).send({
        success: true,
        message: "Order item added successfully",
        data: item,
        statusCode: 201
      });
    } catch (error) {
      console.error("Error in addOrderItem:", error);
      return reply.status(500).send({
        success: false,
        message: error.message || "Failed to add order item",
        statusCode: 500
      });
    }
  }

  static async removeOrderItem(request, reply) {
    try {
      const { orderId, itemId } = request.params;

      const result = await OrderService.removeOrderItem(parseInt(orderId), parseInt(itemId));
      
      return reply.status(200).send({
        success: true,
        message: "Order item removed successfully",
        data: result,
        statusCode: 200
      });
    } catch (error) {
      console.error("Error in removeOrderItem:", error);
      return reply.status(500).send({
        success: false,
        message: error.message || "Failed to remove order item",
        statusCode: 500
      });
    }
  }
}
