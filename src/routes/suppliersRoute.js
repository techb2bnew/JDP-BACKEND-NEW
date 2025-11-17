import { suppliersController } from '../controllers/suppliersController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

export default async function suppliersRoutes(fastify, options) {
  fastify.addHook('preHandler', authenticateToken);
  fastify.post('/createSupplier', suppliersController.createSupplier);
  fastify.get('/getAllSuppliers', suppliersController.getAllSuppliers);
  fastify.get('/searchSuppliers', suppliersController.searchSuppliers);
  fastify.get('/getSupplierById/:supplierId', {
    schema: {
      params: {
        type: 'object',
        required: ['supplierId'],
        properties: {
          supplierId: { type: 'string', pattern: '^[0-9]+$' }
        }
      }
    }
  }, suppliersController.getSupplierById);
  fastify.post('/updateSupplier/:supplierId', suppliersController.updateSupplier);
  fastify.delete('/deleteSupplier/:supplierId', {
    schema: {
      params: {
        type: 'object',
        required: ['supplierId'],
        properties: {
          supplierId: { type: 'string', pattern: '^[0-9]+$' }
        }
      }
    }
  }, suppliersController.deleteSupplier);
}
