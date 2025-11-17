import { NotificationController } from '../controllers/notificationController.js';

export default async function notificationRoutes(fastify, options) {
  fastify.addHook('preHandler', fastify.authenticateToken);

  fastify.post('/sendNotification', NotificationController.sendNotification);
  fastify.get('/user/:userId', NotificationController.getNotificationsForUser);
  fastify.get('/search', NotificationController.searchNotifications);
  fastify.put('/markNotificationAsRead/:recipientId/read', NotificationController.markNotificationAsRead);
  fastify.put('/markAllAsRead', NotificationController.markAllNotificationsAsRead);
  fastify.delete('/deleteNotificationRecipient/:recipientId', NotificationController.deleteNotificationRecipient);
}

