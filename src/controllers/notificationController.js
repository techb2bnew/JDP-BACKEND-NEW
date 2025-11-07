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
        supplier_id
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
        supplier_id: parseOptionalInt(supplier_id)
      };

      const result = await NotificationService.sendNotification(payload);

      return responseHelper.success(reply, result.data, result.message);
    } catch (error) {
      return responseHelper.error(reply, error.message, 500);
    }
  }
}

