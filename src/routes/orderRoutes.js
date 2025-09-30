import { OrderController } from "../controllers/orderController.js";

export default async function orderRoutes(fastify, options) {
  // Create order
  fastify.post('/createOrder', {
    preHandler: [fastify.authenticateToken],
  }, OrderController.createOrder);

  // Get all orders with filters
  fastify.get('/getAllOrders', {
    preHandler: [fastify.authenticateToken],
  }, OrderController.getAllOrders);

  // Get order statistics
  fastify.get('/getOrderStats', {
    preHandler: [fastify.authenticateToken],
  }, OrderController.getOrderStats);

  // Get order by ID
  fastify.get('/getOrderById/:id', {
    preHandler: [fastify.authenticateToken],
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', pattern: '^[0-9]+$' }
        },
        required: ['id']
      }
    }
  }, OrderController.getOrderById);

  // Update order
  fastify.post('/updateOrder/:id', {
    preHandler: [fastify.authenticateToken],
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', pattern: '^[0-9]+$' }
        },
        required: ['id']
      }
    }
  }, OrderController.updateOrder);

  // Delete order
  fastify.delete('/deleteOrder/:id', {
    preHandler: [fastify.authenticateToken],
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', pattern: '^[0-9]+$' }
        },
        required: ['id']
      }
    }
  }, OrderController.deleteOrder);

  // Update order status
  fastify.patch('/updateOrderStatus/:id', {
    preHandler: [fastify.authenticateToken],
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', pattern: '^[0-9]+$' }
        },
        required: ['id']
      }
    }
  }, OrderController.updateOrderStatus);

  // Update payment status
  fastify.patch('/updatePaymentStatus/:id', {
    preHandler: [fastify.authenticateToken],
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', pattern: '^[0-9]+$' }
        },
        required: ['id']
      }
    }
  }, OrderController.updatePaymentStatus);

  // Get orders by customer
  fastify.get('/getOrdersByCustomer/:customerId', {
    preHandler: [fastify.authenticateToken],
    schema: {
      params: {
        type: 'object',
        properties: {
          customerId: { type: 'string', pattern: '^[0-9]+$' }
        },
        required: ['customerId']
      }
    }
  }, OrderController.getOrdersByCustomer);

  // Get orders by job
  fastify.get('/getOrdersByJob/:jobId', {
    preHandler: [fastify.authenticateToken],
    schema: {
      params: {
        type: 'object',
        properties: {
          jobId: { type: 'string', pattern: '^[0-9]+$' }
        },
        required: ['jobId']
      }
    }
  }, OrderController.getOrdersByJob);

  // Get orders by supplier
  fastify.get('/getOrdersBySupplier/:supplierId', {
    preHandler: [fastify.authenticateToken],
    schema: {
      params: {
        type: 'object',
        properties: {
          supplierId: { type: 'string', pattern: '^[0-9]+$' }
        },
        required: ['supplierId']
      }
    }
  }, OrderController.getOrdersBySupplier);

  // Add order item
  fastify.post('/addOrderItem/:orderId', {
    preHandler: [fastify.authenticateToken],
    schema: {
      params: {
        type: 'object',
        properties: {
          orderId: { type: 'string', pattern: '^[0-9]+$' }
        },
        required: ['orderId']
      }
    }
  }, OrderController.addOrderItem);

  // Remove order item
  fastify.delete('/removeOrderItem/:orderId/:itemId', {
    preHandler: [fastify.authenticateToken],
    schema: {
      params: {
        type: 'object',
        properties: {
          orderId: { type: 'string', pattern: '^[0-9]+$' },
          itemId: { type: 'string', pattern: '^[0-9]+$' }
        },
        required: ['orderId', 'itemId']
      }
    }
  }, OrderController.removeOrderItem);
}
