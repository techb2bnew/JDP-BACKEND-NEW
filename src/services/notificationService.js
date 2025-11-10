import { Notification } from '../models/Notification.js';
import { successResponse } from '../helpers/responseHelper.js';
import { supabase } from '../config/database.js';

const FCM_ENDPOINT = 'https://fcm.googleapis.com/fcm/send';
const MAX_FCM_BATCH_SIZE = 500;

const normalizeRoleValue = (value) => (value ? value.toString().trim().toLowerCase() : '');

const matchesRole = (user, role) => {
  const normalizedRole = normalizeRoleValue(user.role);
  const manag5ementType = normalizeRoleValue(user.management_type);
  const target = normalizeRoleValue(role);

  switch (target) {
    case 'admin':
      return normalizedRole.includes('admin');
    case 'staff':
      return normalizedRole.startsWith('staff');
    case 'lead_labor':
      return managementType === 'lead_labor';
    case 'labor':
      return managementType === 'labor';
    case 'supplier':
      return managementType === 'supplier' || normalizedRole.includes('supplier');
    case 'contractor':
      return managementType === 'contractor' || normalizedRole.includes('contractor');
    case 'customer':
      return managementType === 'customer' || normalizedRole.includes('customer');
    default:
      return normalizedRole === target || managementType === target;
  }
};

const chunkArray = (array, size) => {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

const sendPushNotifications = async (tokens, title, body, data = {}) => {
  if (!Array.isArray(tokens) || tokens.length === 0) {
    return;
  }

  const serverKey = process.env.FCM_SERVER_KEY;
  if (!serverKey) {
    console.warn('FCM_SERVER_KEY is not configured. Skipping push notifications.');
    return;
  }

  const uniqueTokens = Array.from(new Set(tokens.filter(Boolean)));
  const batches = chunkArray(uniqueTokens, MAX_FCM_BATCH_SIZE);

  await Promise.all(
    batches.map(async (batch) => {
      try {
        const response = await fetch(FCM_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `key=${serverKey}`
          },
          body: JSON.stringify({
            registration_ids: batch,
            notification: {
              title,
              body
            },
            data
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('FCM push failed:', errorText);
        }
      } catch (error) {
        console.error('Error sending push notification:', error);
      }
    })
  );
};

export class NotificationService {
  static async sendNotification(notificationPayload) {
    try {
      const notificationData = {
        notification_title: notificationPayload.notification_title,
        message: notificationPayload.message,
        custom_link: notificationPayload.custom_link || null,
        image_url: notificationPayload.image_url || null,
        send_to_all: Boolean(notificationPayload.send_to_all),
        recipient_roles: Array.isArray(notificationPayload.recipient_roles)
          ? notificationPayload.recipient_roles
          : [],
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

      const { data: allActiveUsers, error: usersError } = await supabase
        .from('users')
        .select('id, role, management_type, push_token')
        .eq('status', 'active');

      if (usersError) {
        throw new Error(`Database error: ${usersError.message}`);
      }

      const normalizedRoles = notificationData.send_to_all
        ? []
        : notificationData.recipient_roles.map((role) => normalizeRoleValue(role)).filter(Boolean);

      const targetedUsers = (allActiveUsers || []).filter((user) => {
        if (notificationData.send_to_all) {
          return true;
        }
        return normalizedRoles.some((role) => matchesRole(user, role));
      });

      const recipientRows = targetedUsers.map((user) => ({
        notification_id: notification.id,
        user_id: user.id,
        role: normalizeRoleValue(user.management_type) || normalizeRoleValue(user.role),
        status: 'unread',
        delivered_at: new Date().toISOString()
      }));

      if (recipientRows.length > 0) {
        const { error: recipientError } = await supabase
          .from('notification_recipients')
          .insert(recipientRows);

        if (recipientError) {
          console.error('Failed to insert notification recipients:', recipientError.message);
        }
      }

      const pushTokens = targetedUsers
        .map((user) => (user.push_token ? user.push_token.trim() : null))
        .filter(Boolean);

      await sendPushNotifications(
        pushTokens,
        notification.notification_title,
        notification.message,
        {
          notification_id: notification.id
        }
      );

      return successResponse(
        {
          notification,
          recipients: recipientRows.length,
          push_recipients: pushTokens.length
        },
        'Notification sent successfully'
      );
    } catch (error) {
      throw error;
    }
  }
}

