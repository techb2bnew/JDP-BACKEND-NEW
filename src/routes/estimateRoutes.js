import { EstimateController } from '../controllers/estimateController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

export default async function estimateRoutes(fastify, options) {
  fastify.addHook('preHandler', authenticateToken);

  fastify.post('/createEstimate', EstimateController.createEstimate);

  fastify.get('/getEstimates', EstimateController.getEstimates);

  fastify.get('/getEstimateById/:estimateId', EstimateController.getEstimateById);

  fastify.post('/updateEstimate/:estimateId', EstimateController.updateEstimate);

  fastify.delete('/deleteEstimate/:estimateId', EstimateController.deleteEstimate);

  fastify.get('/getEstimateStats', EstimateController.getEstimateStats);

  fastify.get('/getEstimatesByJob/:jobId', EstimateController.getEstimatesByJob);

  fastify.get('/getEstimatesByCustomer/:customerId', EstimateController.getEstimatesByCustomer);

  fastify.post('/calculateTotalCosts/:estimateId', EstimateController.calculateTotalCosts);

  fastify.post('/createAdditionalCost', EstimateController.createAdditionalCost);

  fastify.get('/getAdditionalCosts/:estimateId', EstimateController.getAdditionalCosts);

  fastify.put('/updateAdditionalCost/:additionalCostId', EstimateController.updateAdditionalCost);

  fastify.delete('/deleteAdditionalCost/:additionalCostId', EstimateController.deleteAdditionalCost);

}

