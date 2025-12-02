import { NotificationService } from '../services/notificationService.js';
import { responseHelper } from '../helpers/responseHelper.js';

const parseOptionalInt = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

export class NotificationController {
  static async sendNotification(request, reply) {
    try {
      const {
        notification_title,
        message,
        custom_link,
        image_url,
        send_to_all = false,
        recipient_roles = [],
        order_id,
        job_id,
        product_id,
        customer_id,
        contractor_id,
        bluesheet_id,
        staff_id,
        lead_labor_id,
        labor_id,
        supplier_id,
        labor_ids,
        lead_labor_ids,
        recipient_user_ids
      } = request.body;

      if (!notification_title || !notification_title.trim()) {
        return responseHelper.validationError(reply, {
          notification_title: 'Notification title is required'
        });
      }

      if (!message || !message.trim()) {
        return responseHelper.validationError(reply, {
          message: 'Notification message is required'
        });
      }

      const sendToAll = Boolean(send_to_all);
      let rolesArray = [];

      if (!sendToAll) {
        if (!Array.isArray(recipient_roles) || recipient_roles.length === 0) {
          return responseHelper.validationError(reply, {
            recipient_roles: 'At least one role must be selected when send_to_all is false'
          });
        }
        rolesArray = recipient_roles
          .map((role) => role.toString().trim().toLowerCase())
          .filter(Boolean);
        if (rolesArray.length === 0) {
          return responseHelper.validationError(reply, {
            recipient_roles: 'At least one valid role must be provided'
          });
        }
      }

      // Parse labor_ids and lead_labor_ids arrays
      const parsedLaborIds = Array.isArray(labor_ids) 
        ? labor_ids.map(id => parseOptionalInt(id)).filter(id => id !== null)
        : [];
      
      const parsedLeadLaborIds = Array.isArray(lead_labor_ids)
        ? lead_labor_ids.map(id => parseOptionalInt(id)).filter(id => id !== null)
        : [];

      // Parse recipient_user_ids array if provided
      const parsedRecipientUserIds = Array.isArray(recipient_user_ids)
        ? recipient_user_ids.map(id => parseOptionalInt(id)).filter(id => id !== null)
        : [];

      const payload = {
        notification_title: notification_title.trim(),
        message: message.trim(),
        custom_link: custom_link ? custom_link.trim() : null,
        image_url: image_url ? image_url.trim() : null,
        send_to_all: sendToAll,
        recipient_roles: sendToAll ? [] : rolesArray,
        order_id: parseOptionalInt(order_id),
        job_id: parseOptionalInt(job_id),
        product_id: parseOptionalInt(product_id),
        customer_id: parseOptionalInt(customer_id),
        contractor_id: parseOptionalInt(contractor_id),
        bluesheet_id: parseOptionalInt(bluesheet_id),
        staff_id: parseOptionalInt(staff_id),
        lead_labor_id: parseOptionalInt(lead_labor_id),
        labor_id: parseOptionalInt(labor_id),
        supplier_id: parseOptionalInt(supplier_id),
        labor_ids: parsedLaborIds,
        lead_labor_ids: parsedLeadLaborIds,
        recipient_user_ids: parsedRecipientUserIds
      };

      const result = await NotificationService.sendNotification(payload);

      return responseHelper.success(reply, result.data, result.message);
    } catch (error) {
      return responseHelper.error(reply, error.message, 500);
    }
  }

  static async getNotificationsForUser(request, reply) {
    try {
      const userId = parseOptionalInt(request.params.userId);

      if (!userId) {
        return responseHelper.validationError(reply, {
          user_id: 'Valid user_id parameter is required'
        });
      }

      const { status, page, limit } = request.query;
      const allowedStatuses = new Set(['unread', 'read', 'delivered', 'failed']);

      const normalizedStatus = status ? status.toString().trim().toLowerCase() : null;

      if (normalizedStatus && !allowedStatuses.has(normalizedStatus)) {
        return responseHelper.validationError(reply, {
          status: 'Status must be one of unread, read, delivered, or failed'
        });
      }

      const pageNumber = Math.max(parseOptionalInt(page) || 1, 1);
      const limitNumber = Math.max(parseOptionalInt(limit) || 20, 1);

      const result = await NotificationService.getNotificationsForUser({
        userId,
        status: normalizedStatus,
        page: pageNumber,
        limit: limitNumber
      });

      return responseHelper.success(reply, result.data, result.message);
    } catch (error) {
      return responseHelper.error(reply, error.message, 500);
    }
  }

  static async markNotificationAsRead(request, reply) {
    try {
      const recipientId = parseOptionalInt(request.params.recipientId);

      if (!recipientId) {
        return responseHelper.validationError(reply, {
          recipient_id: 'Valid recipient_id parameter is required'
        });
      }

      const result = await NotificationService.markNotificationAsRead({ recipientId });

      return responseHelper.success(reply, result.data, result.message);
    } catch (error) {
      return responseHelper.error(reply, error.message, 500);
    }
  }

  static async markAllNotificationsAsRead(request, reply) {
    try {
    
      const userIdFromBody = parseOptionalInt(request.body?.user_id);
      const userIdFromToken = request.user?.id;
      const userId = userIdFromBody || userIdFromToken;
      
      if (!userId) {
        return responseHelper.error(reply, 'User ID is required. Please ensure you are authenticated or provide user_id in request body.', 401);
      }

      const result = await NotificationService.markAllNotificationsAsRead({ userId });

      return responseHelper.success(reply, result.data, result.message);
    } catch (error) {
      return responseHelper.error(reply, error.message, 500);
    }
  }

  static async deleteNotificationRecipient(request, reply) {
    try {
      const recipientId = parseOptionalInt(request.params.recipientId);

      if (!recipientId) {
        return responseHelper.validationError(reply, {
          recipient_id: 'Valid recipient_id parameter is required'
        });
      }

      const result = await NotificationService.deleteNotificationRecipient({ recipientId });

      return responseHelper.success(reply, result.data, result.message);
    } catch (error) {
      return responseHelper.error(reply, error.message, 500);
    }
  }

  static async searchNotifications(request, reply) {
    const startTime = Date.now(); 
    
    try {
      const userId = request.user?.id;
      
      if (!userId) {
        return responseHelper.error(reply, 'User ID is required. Please ensure you are authenticated.', 401);
      }

      const { search, status, page, limit } = request.query;
      const allowedStatuses = new Set(['unread', 'read', 'delivered', 'failed']);

      const normalizedStatus = status ? status.toString().trim().toLowerCase() : null;

      if (normalizedStatus && !allowedStatuses.has(normalizedStatus)) {
        return responseHelper.validationError(reply, {
          status: 'Status must be one of unread, read, delivered, or failed'
        });
      }

      const pageNumber = Math.max(parseOptionalInt(page) || 1, 1);
      const limitNumber = Math.max(parseOptionalInt(limit) || 20, 1);

      const searchQuery = search ? search.toString().trim() : null;

      const result = await NotificationService.searchNotifications({
        userId,
        searchQuery,
        status: normalizedStatus,
        page: pageNumber,
        limit: limitNumber
      });

      // Calculate response time in milliseconds
      const responseTime = Date.now() - startTime;
      
      // Add response time to the data
      const responseData = {
        ...result.data,
        responseTime: `${responseTime}ms`
      };

      return responseHelper.success(reply, responseData, result.message);
    } catch (error) {
      return responseHelper.error(reply, error.message, 500);
    }
  }
}

