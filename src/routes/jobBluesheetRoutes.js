import { JobBluesheetController } from '../controllers/jobBluesheetController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

export async function jobBluesheetRoutes(fastify, options) {
  // Apply authentication middleware to all routes
  fastify.addHook('preHandler', authMiddleware);

  // Main Bluesheet CRUD Routes
  fastify.post('/bluesheet', JobBluesheetController.createBluesheet);
  fastify.post('/bluesheet/complete', JobBluesheetController.createCompleteBluesheet);
  fastify.get('/bluesheet/:id', JobBluesheetController.getBluesheetById);
  fastify.get('/job/:jobId/bluesheets', JobBluesheetController.getBluesheetsByJobId);
  fastify.put('/bluesheet/:id', JobBluesheetController.updateBluesheet);
  fastify.delete('/bluesheet/:id', JobBluesheetController.deleteBluesheet);
  fastify.get('/bluesheets', JobBluesheetController.searchBluesheets);

  // Labor Entry Routes
  fastify.post('/bluesheet/:bluesheetId/labor', JobBluesheetController.addLaborEntry);
  fastify.get('/bluesheet/:bluesheetId/labor', JobBluesheetController.getLaborEntries);
  fastify.put('/labor/:id', JobBluesheetController.updateLaborEntry);
  fastify.delete('/labor/:id', JobBluesheetController.deleteLaborEntry);

  // Material Entry Routes
  fastify.post('/bluesheet/:bluesheetId/material', JobBluesheetController.addMaterialEntry);
  fastify.get('/bluesheet/:bluesheetId/material', JobBluesheetController.getMaterialEntries);
  fastify.put('/material/:id', JobBluesheetController.updateMaterialEntry);
  fastify.delete('/material/:id', JobBluesheetController.deleteMaterialEntry);

  // Summary and Statistics Routes
  fastify.get('/bluesheet/:id/summary', JobBluesheetController.getBluesheetSummary);
  fastify.get('/product/:productId/usage-stats', JobBluesheetController.getMaterialUsageStats);

  // Submit and Approval Routes
  fastify.post('/bluesheet/:id/submit', JobBluesheetController.submitBluesheetForApproval);
  fastify.put('/bluesheet/:id/additional-charges', JobBluesheetController.updateAdditionalCharges);
  fastify.post('/bluesheet/:id/calculate-total', JobBluesheetController.calculateAndUpdateTotalCost);
}
