import { DashboardController } from '../controllers/dashboardController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

export default async function dashboardRoutes(fastify) {
  fastify.addHook('preHandler', authMiddleware);

  // GET /api/dashboard/summary
  fastify.get('/summary', DashboardController.getSummary);

  // GET /api/dashboard/job-status-distribution
  fastify.get('/job-status-distribution', DashboardController.getJobStatusDistribution);

  // GET /api/dashboard/recent-activities?limit=20
  fastify.get('/recent-activities', DashboardController.getRecentActivities);
}


