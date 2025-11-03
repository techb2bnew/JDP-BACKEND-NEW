import { JobBluesheetController } from '../controllers/jobBluesheetController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

export async function jobBluesheetRoutes(fastify, options) {
  fastify.addHook('preHandler', authMiddleware);

  fastify.post('/bluesheet', JobBluesheetController.createBluesheet);
  fastify.post('/bluesheet/complete', JobBluesheetController.createCompleteBluesheet);
  fastify.get('/lead-labor/bluesheets', JobBluesheetController.getLeadLaborBluesheets);
  fastify.get('/labor/bluesheets', JobBluesheetController.getLaborBluesheets);
  fastify.get('/bluesheet/:id', JobBluesheetController.getBluesheetById);
  fastify.get('/job/:jobId/bluesheets', JobBluesheetController.getBluesheetsByJobId);
  fastify.put('/bluesheet/:id', JobBluesheetController.updateBluesheet);
  fastify.delete('/bluesheet/:id', JobBluesheetController.deleteBluesheet);
  fastify.get('/bluesheets', JobBluesheetController.searchBluesheets);

  fastify.post('/bluesheet/:bluesheetId/labor', JobBluesheetController.addLaborEntry);
  fastify.get('/bluesheet/:bluesheetId/labor', JobBluesheetController.getLaborEntries);
  fastify.get('/labor/:id', JobBluesheetController.getLaborEntryById);
  fastify.put('/labor/:id', JobBluesheetController.updateLaborEntry);
  fastify.delete('/labor/:id', JobBluesheetController.deleteLaborEntry);

  fastify.post('/bluesheet/:bluesheetId/material', JobBluesheetController.addMaterialEntry);
  fastify.get('/bluesheet/:bluesheetId/material', JobBluesheetController.getMaterialEntries);
  fastify.get('/material/:id', JobBluesheetController.getMaterialEntryById);
  fastify.put('/material/:id', JobBluesheetController.updateMaterialEntry);
  fastify.delete('/material/:id', JobBluesheetController.deleteMaterialEntry);

  fastify.get('/bluesheet/:id/summary', JobBluesheetController.getBluesheetSummary);
  fastify.get('/product/:productId/usage-stats', JobBluesheetController.getMaterialUsageStats);

  fastify.post('/bluesheet/:id/submit', JobBluesheetController.submitBluesheetForApproval);
  fastify.post('/bluesheetApproved/:id', JobBluesheetController.approveBluesheet);
  fastify.put('/bluesheet/:id/additional-charges', JobBluesheetController.updateAdditionalCharges);
  fastify.post('/bluesheet/:id/calculate-total', JobBluesheetController.calculateAndUpdateTotalCost);
}
