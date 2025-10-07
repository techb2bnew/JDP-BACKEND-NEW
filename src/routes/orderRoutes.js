import { OrderController } from "../controllers/orderController.js";

export default async function orderRoutes(fastify, options) {
  fastify.post('/createOrder', {
    preHandler: [fastify.authenticateToken],
  }, OrderController.createOrder);

  fastify.get('/getAllOrders', {
    preHandler: [fastify.authenticateToken],
  }, OrderController.getAllOrders);

  fastify.get('/searchOrders', {
    preHandler: [fastify.authenticateToken],
  }, OrderController.searchOrders);

  fastify.get('/getOrderStats', {
    preHandler: [fastify.authenticateToken],
  }, OrderController.getOrderStats);

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
