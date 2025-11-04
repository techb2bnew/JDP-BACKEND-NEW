import { NotificationController } from '../controllers/notificationController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

export default async function notificationRoutes(fastify, options) {
  fastify.addHook('preHandler', authenticateToken);

  fastify.get('/notifications', NotificationController.getNotifications);


  fastify.get('/notifications/unread-count', NotificationController.getUnreadCount);

  fastify.put('/notifications/:id/read', NotificationController.markAsRead);

 
  fastify.put('/notifications/read-all', NotificationController.markAllAsRead);


  fastify.delete('/notifications/:id', NotificationController.deleteNotification);

  
  fastify.delete('/notifications', NotificationController.deleteAllNotifications);


  fastify.post('/notifications/job-completed', NotificationController.createJobCompletedNotification);


  fastify.post('/notifications/job-assigned', NotificationController.createJobAssignedNotification);


  fastify.post('/notifications/job-status-updated', NotificationController.createJobStatusUpdatedNotification);

  fastify.post('/notifications/job-deleted', NotificationController.createJobDeletedNotification);


  fastify.post('/notifications/job-created', NotificationController.createJobCreatedNotification);
}

