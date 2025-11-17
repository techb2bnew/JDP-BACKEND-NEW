import { InvoiceController } from '../controllers/invoiceController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

export default async function invoiceRoutes(fastify) {
  fastify.addHook('preHandler', authenticateToken);
  fastify.post('/sendInvoiceToCustomer/:estimateId', InvoiceController.sendInvoiceToCustomer);
}
