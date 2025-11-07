import { NotificationController } from '../controllers/notificationController.js';

export default async function notificationRoutes(fastify, options) {
  fastify.addHook('preHandler', fastify.authenticateToken);

  fastify.post('/sendNotification', NotificationController.sendNotification);
}

