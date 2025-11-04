import { DashboardController } from '../controllers/dashboardController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

export default async function dashboardRoutes(fastify) {
  fastify.addHook('preHandler', authMiddleware);

  
  fastify.get('/summary', DashboardController.getSummary);

  
  fastify.get('/job-status-distribution', DashboardController.getJobStatusDistribution);


  fastify.get('/recent-activities', DashboardController.getRecentActivities);


  fastify.get('/management-stats', DashboardController.getManagementStats);
}


