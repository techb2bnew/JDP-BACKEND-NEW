import { CustomerController } from '../controllers/customerController.js';
import { 
  createCustomerSchema, 
  updateCustomerSchema, 
  getCustomersSchema, 
  getCustomerByIdSchema, 
  deleteCustomerSchema 
} from '../validations/customerValidation.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

export async function customerRoutes(fastify, options) {
  fastify.addHook('preHandler', authenticateToken);

  fastify.post('/createCustomer', {
    schema: createCustomerSchema,
    handler: CustomerController.createCustomer
  });

  fastify.get('/getCustomers', {
    schema: getCustomersSchema,
    handler: CustomerController.getCustomers
  });

  fastify.get('/getCustomerStats/stats', {
    handler: CustomerController.getCustomerStats
  });


  fastify.get('/getCustomerById/:id', {
    schema: getCustomerByIdSchema,
    handler: CustomerController.getCustomerById
  });

  fastify.post('/updateCustomer/:id', {
    schema: updateCustomerSchema,
    handler: CustomerController.updateCustomer
  });

  fastify.delete('/deleteCustomer/:id', {
    schema: deleteCustomerSchema,
    handler: CustomerController.deleteCustomer
  });
}
