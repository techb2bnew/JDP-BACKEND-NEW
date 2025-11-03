import { NotificationController } from '../controllers/notificationController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

export default async function notificationRoutes(fastify, options) {
  fastify.addHook('preHandler', authenticateToken);

  // Get notifications for current user
  fastify.get('/notifications', NotificationController.getNotifications);

  // Get unread notification count
  fastify.get('/notifications/unread-count', NotificationController.getUnreadCount);

  // Mark notification as read
  fastify.put('/notifications/:id/read', NotificationController.markAsRead);

  // Mark all notifications as read
  fastify.put('/notifications/read-all', NotificationController.markAllAsRead);

  // Delete notification
  fastify.delete('/notifications/:id', NotificationController.deleteNotification);

  // Delete all notifications for current user
  fastify.delete('/notifications', NotificationController.deleteAllNotifications);

  // Admin/System routes for creating notifications
  // These routes should be protected with admin/super admin middleware if needed
  
  // Create job completed notification
  fastify.post('/notifications/job-completed', NotificationController.createJobCompletedNotification);

  // Create job assigned notification
  fastify.post('/notifications/job-assigned', NotificationController.createJobAssignedNotification);

  // Create job status updated notification
  fastify.post('/notifications/job-status-updated', NotificationController.createJobStatusUpdatedNotification);

  // Create job deleted notification
  fastify.post('/notifications/job-deleted', NotificationController.createJobDeletedNotification);

  // Create job created notification
  fastify.post('/notifications/job-created', NotificationController.createJobCreatedNotification);
}

