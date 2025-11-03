import { NotificationService } from '../services/notificationService.js';
import { errorResponse, successResponse } from '../helpers/responseHelper.js';

export class NotificationController {
  /**
   * Get notifications for current user
   * GET /api/notifications
   */
  static async getNotifications(request, reply) {
    try {
      const userId = request.user.id;
      const { page = 1, limit = 20, is_read, type, orderBy = 'created_at', order = 'desc' } = request.query;

      // Validate pagination
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);

      if (isNaN(pageNum) || pageNum < 1) {
        return reply.code(400).send(errorResponse('Page must be a positive number', 400));
      }

      if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
        return reply.code(400).send(errorResponse('Limit must be between 1 and 100', 400));
      }

      const options = {
        page: pageNum,
        limit: limitNum,
        is_read: is_read !== undefined ? is_read === 'true' : undefined,
        type: type || undefined,
        orderBy,
        order
      };

      const result = await NotificationService.getNotifications(userId, options);
      return reply.code(200).send(result);
    } catch (error) {
      return reply.code(500).send(errorResponse(`Failed to retrieve notifications: ${error.message}`, 500));
    }
  }

  /**
   * Get unread notification count
   * GET /api/notifications/unread-count
   */
  static async getUnreadCount(request, reply) {
    try {
      const userId = request.user.id;
      const result = await NotificationService.getUnreadCount(userId);
      return reply.code(200).send(result);
    } catch (error) {
      return reply.code(500).send(errorResponse(`Failed to get unread count: ${error.message}`, 500));
    }
  }

  /**
   * Mark notification as read
   * PUT /api/notifications/:id/read
   */
  static async markAsRead(request, reply) {
    try {
      const { id } = request.params;
      const userId = request.user.id;

      // Verify notification belongs to user
      const notification = await NotificationService.getNotifications(userId, { page: 1, limit: 1 });
      const userNotifications = notification.data?.notifications || [];
      const notificationExists = userNotifications.some(n => n.id === parseInt(id));

      if (!notificationExists) {
        // Check if notification exists at all
        const { Notification } = await import('../models/Notification.js');
        const notif = await Notification.findById(id);
        if (!notif) {
          return reply.code(404).send(errorResponse('Notification not found', 404));
        }
        if (notif.user_id !== userId) {
          return reply.code(403).send(errorResponse('You do not have permission to mark this notification as read', 403));
        }
      }

      const result = await NotificationService.markAsRead(id);
      return reply.code(200).send(result);
    } catch (error) {
      return reply.code(500).send(errorResponse(`Failed to mark notification as read: ${error.message}`, 500));
    }
  }

  /**
   * Mark all notifications as read
   * PUT /api/notifications/read-all
   */
  static async markAllAsRead(request, reply) {
    try {
      const userId = request.user.id;
      const result = await NotificationService.markAllAsRead(userId);
      return reply.code(200).send(result);
    } catch (error) {
      return reply.code(500).send(errorResponse(`Failed to mark all notifications as read: ${error.message}`, 500));
    }
  }

  /**
   * Delete notification
   * DELETE /api/notifications/:id
   */
  static async deleteNotification(request, reply) {
    try {
      const { id } = request.params;
      const userId = request.user.id;

      // Verify notification belongs to user
      const { Notification } = await import('../models/Notification.js');
      const notification = await Notification.findById(id);

      if (!notification) {
        return reply.code(404).send(errorResponse('Notification not found', 404));
      }

      if (notification.user_id !== userId) {
        return reply.code(403).send(errorResponse('You do not have permission to delete this notification', 403));
      }

      const result = await NotificationService.deleteNotification(id);
      return reply.code(200).send(result);
    } catch (error) {
      return reply.code(500).send(errorResponse(`Failed to delete notification: ${error.message}`, 500));
    }
  }

  /**
   * Delete all notifications for current user
   * DELETE /api/notifications
   */
  static async deleteAllNotifications(request, reply) {
    try {
      const userId = request.user.id;
      const result = await NotificationService.deleteAllNotifications(userId);
      return reply.code(200).send(result);
    } catch (error) {
      return reply.code(500).send(errorResponse(`Failed to delete all notifications: ${error.message}`, 500));
    }
  }

  /**
   * Create job completed notification (Admin/System only)
   * POST /api/notifications/job-completed
   */
  static async createJobCompletedNotification(request, reply) {
    try {
      const { job_id, milestone, user_ids } = request.body;

      if (!job_id) {
        return reply.code(400).send(errorResponse('job_id is required', 400));
      }

      if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
        return reply.code(400).send(errorResponse('user_ids array is required', 400));
      }

      const result = await NotificationService.createJobCompletedNotification(job_id, milestone, user_ids);
      return reply.code(201).send(result);
    } catch (error) {
      return reply.code(500).send(errorResponse(`Failed to create notification: ${error.message}`, 500));
    }
  }

  /**
   * Create job assigned notification (Admin/System only)
   * POST /api/notifications/job-assigned
   */
  static async createJobAssignedNotification(request, reply) {
    try {
      const { job_id, user_ids } = request.body;

      if (!job_id) {
        return reply.code(400).send(errorResponse('job_id is required', 400));
      }

      if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
        return reply.code(400).send(errorResponse('user_ids array is required', 400));
      }

      const result = await NotificationService.createJobAssignedNotification(job_id, user_ids);
      return reply.code(201).send(result);
    } catch (error) {
      return reply.code(500).send(errorResponse(`Failed to create notification: ${error.message}`, 500));
    }
  }

  /**
   * Create job status updated notification (Admin/System only)
   * POST /api/notifications/job-status-updated
   */
  static async createJobStatusUpdatedNotification(request, reply) {
    try {
      const { job_id, old_status, new_status, updated_by_user_id, user_ids } = request.body;

      if (!job_id || !old_status || !new_status || !updated_by_user_id) {
        return reply.code(400).send(errorResponse('job_id, old_status, new_status, and updated_by_user_id are required', 400));
      }

      if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
        return reply.code(400).send(errorResponse('user_ids array is required', 400));
      }

      const result = await NotificationService.createJobStatusUpdatedNotification(
        job_id,
        old_status,
        new_status,
        updated_by_user_id,
        user_ids
      );
      return reply.code(201).send(result);
    } catch (error) {
      return reply.code(500).send(errorResponse(`Failed to create notification: ${error.message}`, 500));
    }
  }

  /**
   * Create job deleted notification (Admin/System only)
   * POST /api/notifications/job-deleted
   */
  static async createJobDeletedNotification(request, reply) {
    try {
      const { job_id, job_number, job_title, deleted_by_user_id, user_ids } = request.body;

      if (!job_id || !job_number || !job_title || !deleted_by_user_id) {
        return reply.code(400).send(errorResponse('job_id, job_number, job_title, and deleted_by_user_id are required', 400));
      }

      if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
        return reply.code(400).send(errorResponse('user_ids array is required', 400));
      }

      const result = await NotificationService.createJobDeletedNotification(
        job_id,
        job_number,
        job_title,
        deleted_by_user_id,
        user_ids
      );
      return reply.code(201).send(result);
    } catch (error) {
      return reply.code(500).send(errorResponse(`Failed to create notification: ${error.message}`, 500));
    }
  }

  /**
   * Create job created notification (Admin/System only)
   * POST /api/notifications/job-created
   */
  static async createJobCreatedNotification(request, reply) {
    try {
      const { job_id, created_by_user_id, user_ids } = request.body;

      if (!job_id || !created_by_user_id) {
        return reply.code(400).send(errorResponse('job_id and created_by_user_id are required', 400));
      }

      if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
        return reply.code(400).send(errorResponse('user_ids array is required', 400));
      }

      const result = await NotificationService.createJobCreatedNotification(job_id, created_by_user_id, user_ids);
      return reply.code(201).send(result);
    } catch (error) {
      return reply.code(500).send(errorResponse(`Failed to create notification: ${error.message}`, 500));
    }
  }
}

