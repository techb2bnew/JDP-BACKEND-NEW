import { Notification } from '../models/Notification.js';
import { successResponse } from '../helpers/responseHelper.js';
import { supabase } from '../config/database.js';
import { getFirebaseAdmin } from '../config/firebaseAdmin.js';

const MAX_FCM_BATCH_SIZE = 500;

const normalizeRoleValue = (value) => (value ? value.toString().trim().toLowerCase() : '');

const chunkArray = (array, size) => {
  if (!Array.isArray(array) || array.length === 0) {
    return [];
  }

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

  const firebaseAdmin = getFirebaseAdmin();
  if (!firebaseAdmin) {
    console.warn('Firebase admin SDK is not initialized. Skipping push notifications.');
    return;
  }

  const messaging = firebaseAdmin.messaging();
  const uniqueTokens = Array.from(new Set(tokens.filter(Boolean)));

  if (uniqueTokens.length === 0) {
    return;
  }

  const normalizedData = Object.entries(data).reduce((acc, [key, value]) => {
    if (value !== undefined && value !== null) {
      acc[key] = String(value);
    }
    return acc;
  }, {});

  const batches = chunkArray(uniqueTokens, MAX_FCM_BATCH_SIZE);

  for (const batch of batches) {
    await Promise.all(
      batch.map(async (token) => {
        try {
          await messaging.send({
            token,
            notification: {
              title,
              body
            },
            data: normalizedData
          });
        } catch (error) {
          console.error(`Push notification failed for token ${token}:`, error.message || error);
        }
      })
    );
  }
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

      const normalizedRoleTargets = notificationData.send_to_all
        ? null
        : new Set(
            notificationData.recipient_roles
              .map((role) => normalizeRoleValue(role))
              .filter(Boolean)
          );

      if (!notificationData.send_to_all && (!normalizedRoleTargets || normalizedRoleTargets.size === 0)) {
        return successResponse(
          {
            notification,
            recipients: 0,
            push_recipients: 0
          },
          'Notification sent successfully'
        );
      }

      const recipients = [];
      const pushTokenSet = new Set();

      for (const user of allActiveUsers || []) {
        const roleNormalized = normalizeRoleValue(user.role);
        const managementNormalized = normalizeRoleValue(user.management_type);
        const effectiveRole = managementNormalized || roleNormalized;

        const isTargeted =
          notificationData.send_to_all ||
          (normalizedRoleTargets &&
            (normalizedRoleTargets.has(effectiveRole) ||
              normalizedRoleTargets.has(roleNormalized) ||
              normalizedRoleTargets.has(managementNormalized)));

        if (!isTargeted) {
          continue;
        }

        recipients.push({
          notification_id: notification.id,
          user_id: user.id,
          role: effectiveRole,
          status: 'unread',
          delivered_at: new Date().toISOString()
        });

        const trimmedToken = user.push_token ? user.push_token.trim() : '';
        if (trimmedToken) {
          pushTokenSet.add(trimmedToken);
        }
      }

      if (recipients.length > 0) {
        const { error: recipientError } = await supabase
          .from('notification_recipients')
          .insert(recipients);

        if (recipientError) {
          console.error('Failed to insert notification recipients:', recipientError.message);
        }
      }

      const pushTokens = Array.from(pushTokenSet);

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
          recipients: recipients.length,
          push_recipients: pushTokens.length
        },
        'Notification sent successfully'
      );
    } catch (error) {
      throw error;
    }
  }

  static async getNotificationsForUser({ userId, status, page, limit }) {
    try {
      if (!userId) {
        throw new Error('User ID is required to fetch notifications');
      }

      const constrainedLimit = Math.min(Math.max(limit, 1), 100);
      const safePage = Math.max(page, 1);
      const offset = (safePage - 1) * constrainedLimit;

      const { items, totalCount, unreadCount } = await Notification.fetchByUser({
        userId,
        status,
        offset,
        limit: constrainedLimit
      });

      const totalPages = constrainedLimit > 0 ? Math.ceil(totalCount / constrainedLimit) : 0;

      return successResponse(
        {
          items,
          pagination: {
            page: safePage,
            limit: constrainedLimit,
            total_count: totalCount,
            total_pages: totalPages,
            unread_count: unreadCount
          }
        },
        'Notifications fetched successfully'
      );
    } catch (error) {
      throw error;
    }
  }
}

