import { Notification } from '../models/Notification.js';
import { successResponse } from '../helpers/responseHelper.js';

export class NotificationService {
  static async sendNotification(notificationPayload) {
    try {
      const notificationData = {
        notification_title: notificationPayload.notification_title,
        message: notificationPayload.message,
        custom_link: notificationPayload.custom_link || null,
        image_url: notificationPayload.image_url || null,
        send_to_all: notificationPayload.send_to_all,
        recipient_roles: notificationPayload.recipient_roles || [],
        order_id: notificationPayload.order_id,
        job_id: notificationPayload.job_id,
        product_id: notificationPayload.product_id,
        customer_id: notificationPayload.customer_id,
        contractor_id: notificationPayload.contractor_id,
        bluesheet_id: notificationPayload.bluesheet_id,
        staff_id: notificationPayload.staff_id,
        lead_labor_id: notificationPayload.lead_labor_id,
        labor_id: notificationPayload.labor_id,
        supplier_id: notificationPayload.supplier_id,
        created_at: new Date().toISOString()
      };

      const notification = await Notification.create(notificationData);

      return successResponse(
        notification,
        'Notification sent successfully'
      );
    } catch (error) {
      throw error;
    }
  }
}

