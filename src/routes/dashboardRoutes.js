import { DashboardController } from '../controllers/dashboardController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

export default async function dashboardRoutes(fastify) {
  fastify.addHook('preHandler', authMiddleware);

  // GET /api/dashboard/summary
  fastify.get('/summary', DashboardController.getSummary);
}


