import { EstimateController } from '../controllers/estimateController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

export default async function estimateRoutes(fastify, options) {
  fastify.addHook('preHandler', authenticateToken);

  // Estimate CRUD Routes
  fastify.post('/createEstimate', EstimateController.createEstimate);

  fastify.get('/getEstimates', EstimateController.getEstimates);

  fastify.get('/getEstimateById/:estimateId', EstimateController.getEstimateById);

  fastify.post('/updateEstimate/:estimateId', EstimateController.updateEstimate);

  fastify.delete('/deleteEstimate/:estimateId', EstimateController.deleteEstimate);

  // Estimate Statistics
  fastify.get('/getEstimateStats', EstimateController.getEstimateStats);

  // Estimate by Job
  fastify.get('/getEstimatesByJob/:jobId', EstimateController.getEstimatesByJob);

  // Estimate by Customer
  fastify.get('/getEstimatesByCustomer/:customerId', EstimateController.getEstimatesByCustomer);

  // Calculate Total Costs
  fastify.post('/calculateTotalCosts/:estimateId', EstimateController.calculateTotalCosts);

  // Additional Cost Routes
  fastify.post('/createAdditionalCost', EstimateController.createAdditionalCost);

  fastify.get('/getAdditionalCosts/:estimateId', EstimateController.getAdditionalCosts);

  fastify.put('/updateAdditionalCost/:additionalCostId', EstimateController.updateAdditionalCost);

  fastify.delete('/deleteAdditionalCost/:additionalCostId', EstimateController.deleteAdditionalCost);
}
