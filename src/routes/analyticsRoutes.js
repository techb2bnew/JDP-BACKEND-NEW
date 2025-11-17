import { AnalyticsController } from '../controllers/analyticsController.js';

export default async function analyticsRoutes(fastify) {
  fastify.addHook('preHandler', fastify.authenticateToken);
  fastify.get('/overview', AnalyticsController.getOverview);
}

