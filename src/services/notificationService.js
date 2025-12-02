import { Notification } from '../models/Notification.js';
import { successResponse } from '../helpers/responseHelper.js';
import { supabase } from '../config/database.js';
import { getFirebaseAdmin } from '../config/firebaseAdmin.js';
import { User } from '../models/User.js';

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

const sendPushNotifications = async (tokensWithPlatform, title, body, data = {}, tokenToUserIdMap = new Map()) => {
  if (!Array.isArray(tokensWithPlatform) || tokensWithPlatform.length === 0) {
    return;
  }

  const firebaseAdmin = getFirebaseAdmin();
  console.log("firebaseAdminfirebaseAdminfirebaseAdmin",firebaseAdmin);

  
  if (!firebaseAdmin) {
    console.warn('Firebase admin SDK is not initialized. Skipping push notifications.');
    return;
  }

  const messaging = firebaseAdmin.messaging();

  console.log("messagingmessagingmessaging",messaging);
  
  // Remove duplicates based on token, but keep first occurrence's platform
  const uniqueTokensMap = new Map();
  tokensWithPlatform.forEach(item => {
    if (item && item.token) {
      if (!uniqueTokensMap.has(item.token)) {
        uniqueTokensMap.set(item.token, item.platform || null);
      }
    }
  });

  if (uniqueTokensMap.size === 0) {
    return;
  }

  const normalizedData = Object.entries(data).reduce((acc, [key, value]) => {
    if (value !== undefined && value !== null) {
      acc[key] = String(value);
    }
    return acc;
  }, {});

  const tokensArray = Array.from(uniqueTokensMap.entries());
  const batches = chunkArray(tokensArray, MAX_FCM_BATCH_SIZE);

  const invalidTokens = []; // Track invalid tokens for cleanup

  for (const batch of batches) {
    await Promise.all(
      batch.map(async ([token, platform]) => {
        try {
          // Detect platform: explicit platform or try to detect from token
          const normalizedPlatform = platform ? platform.trim().toLowerCase() : null;
          const isWeb = normalizedPlatform && (normalizedPlatform === 'web' || normalizedPlatform === 'browser');
          
          const message = {
            token,
            notification: {
              title,
              body
            },
            data: normalizedData
          };

          // Add webpush configuration for web tokens
          // Web push notifications require webpush field for proper browser handling
          if (isWeb) {
            message.webpush = {
              notification: {
                title,
                body,
                icon: '/icon-192x192.png', // Default icon, can be customized
                badge: '/badge-72x72.png' // Default badge, can be customized
              },
              fcmOptions: {
                link: data.custom_link || '/' // Link to open when notification is clicked
              }
            };
          }
          // For mobile (iOS/Android), no webpush config needed - FCM handles it automatically

          await messaging.send(message);
          console.log(`Push notification sent successfully to ${normalizedPlatform || 'mobile'} platform for token: ${token.substring(0, 20)}...`);
        } catch (error) {
          console.error(`Push notification failed for token ${token.substring(0, 20)}... (platform: ${platform || 'unknown'}):`, error.message || error);
          
          // If token is invalid, mark it for removal
          if (error.code === 'messaging/invalid-registration-token' || 
              error.code === 'messaging/registration-token-not-registered' ||
              error.message?.includes('Requested entity was not found')) {
            console.warn(`Invalid token detected, will remove from database: ${token.substring(0, 20)}...`);
            invalidTokens.push(token);
          }
        }
      })
    );
  }

  // Cleanup invalid tokens from database asynchronously
  if (invalidTokens.length > 0 && tokenToUserIdMap.size > 0) {
    setImmediate(async () => {
      for (const invalidToken of invalidTokens) {
        const userId = tokenToUserIdMap.get(invalidToken);
        if (userId) {
          try {
            await User.update(userId, {
              push_token: null,
              push_platform: null
            });
            console.log(`Removed invalid push token for user ID: ${userId}`);
          } catch (cleanupError) {
            console.error(`Failed to remove invalid token for user ${userId}:`, cleanupError.message);
          }
        }
      }
    });
  }
};

export class NotificationService {
  static async sendNotification(notificationPayload) {
    try {
      const rawTargetUserIds = Array.isArray(notificationPayload.recipient_user_ids)
        ? notificationPayload.recipient_user_ids
        : [];

      // Fetch user_ids from labor_ids array if provided
      const laborIds = Array.isArray(notificationPayload.labor_ids) 
        ? notificationPayload.labor_ids.filter(id => id !== null && id !== undefined)
        : [];
      
      let laborUserIds = [];
      if (laborIds.length > 0) {
        try {
          const { data: laborData, error: laborError } = await supabase
            .from('labor')
            .select('user_id')
            .in('id', laborIds)
            .not('user_id', 'is', null);
          
          if (!laborError && laborData) {
            laborUserIds = laborData
              .map(l => l.user_id)
              .filter(id => id !== null && id !== undefined);
          }
        } catch (error) {
          console.error('Error fetching user_ids from labor_ids:', error);
        }
      }

      // Fetch user_ids from lead_labor_ids array if provided
      const leadLaborIds = Array.isArray(notificationPayload.lead_labor_ids)
        ? notificationPayload.lead_labor_ids.filter(id => id !== null && id !== undefined)
        : [];
      
      let leadLaborUserIds = [];
      if (leadLaborIds.length > 0) {
        try {
          const { data: leadLaborData, error: leadLaborError } = await supabase
            .from('lead_labor')
            .select('user_id')
            .in('id', leadLaborIds)
            .not('user_id', 'is', null);
          
          if (!leadLaborError && leadLaborData) {
            leadLaborUserIds = leadLaborData
              .map(ll => ll.user_id)
              .filter(id => id !== null && id !== undefined);
          }
        } catch (error) {
          console.error('Error fetching user_ids from lead_labor_ids:', error);
        }
      }

      // Merge all user_ids: existing + labor + lead_labor
      const allUserIds = [
        ...rawTargetUserIds,
        ...laborUserIds,
        ...leadLaborUserIds
      ];

      const targetUserIds = new Set(
        allUserIds
          .map((value) => {
            if (typeof value === 'number' && Number.isFinite(value)) {
              return value;
            }
            if (typeof value === 'string') {
              const parsed = parseInt(value, 10);
              return Number.isNaN(parsed) ? null : parsed;
            }
            return null;
          })
          .filter((value) => value !== null)
      );
      const hasTargetUsers = targetUserIds.size > 0;

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
        .select('id, role, management_type, push_token, push_platform')
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
      const hasRoleTargets = normalizedRoleTargets && normalizedRoleTargets.size > 0;

      if (!notificationData.send_to_all && !hasRoleTargets && !hasTargetUsers) {
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
      const pushTokensWithPlatform = [];
      const tokenToUserIdMap = new Map(); // Track which token belongs to which user

      for (const user of allActiveUsers || []) {
        const roleNormalized = normalizeRoleValue(user.role);
        const managementNormalized = normalizeRoleValue(user.management_type);
        const effectiveRole = managementNormalized || roleNormalized;

        const roleMatched =
          notificationData.send_to_all ||
          !hasRoleTargets ||
          normalizedRoleTargets.has(effectiveRole) ||
          normalizedRoleTargets.has(roleNormalized) ||
          normalizedRoleTargets.has(managementNormalized);

        const userMatched = notificationData.send_to_all || !hasTargetUsers || targetUserIds.has(user.id);

        if (!roleMatched || !userMatched) {
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
        const platform = user.push_platform ? user.push_platform.trim().toLowerCase() : null;
        
        if (trimmedToken) {
          pushTokensWithPlatform.push({
            token: trimmedToken,
            platform: platform
          });
          // Map token to user ID for cleanup
          tokenToUserIdMap.set(trimmedToken, user.id);
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

      await sendPushNotifications(
        pushTokensWithPlatform,
        notification.notification_title,
        notification.message,
        {
          notification_id: notification.id.toString(),
          custom_link: notification.custom_link || '/'
        },
        tokenToUserIdMap
      );

      console.log("checkkkkkkkkkkkk",{
          notification,
          recipients: recipients.length,
          push_recipients: pushTokensWithPlatform.length
        },);
      
      return successResponse(
        {
          notification,
          recipients: recipients.length,
          push_recipients: pushTokensWithPlatform.length
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

  static async markNotificationAsRead({ recipientId }) {
    try {
      if (!recipientId) {
        throw new Error('Recipient ID is required');
      }

      const updated = await Notification.updateRecipientStatus({
        recipientId,
        status: 'read'
      });

      return successResponse(
        {
          recipient_id: updated.id,
          notification_id: updated.notification_id,
          user_id: updated.user_id,
          status: updated.status,
          read_at: updated.read_at,
          delivered_at: updated.delivered_at,
          created_at: updated.created_at
        },
        'Notification marked as read successfully'
      );
    } catch (error) {
      throw error;
    }
  }

  static async markAllNotificationsAsRead({ userId }) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const result = await Notification.markAllAsReadForUser({ userId });

      return successResponse(
        {
          user_id: result.user_id,
          updated_count: result.updated_count,
          read_at: result.read_at
        },
        `Successfully marked ${result.updated_count} notification(s) as read`
      );
    } catch (error) {
      throw error;
    }
  }

  static async deleteNotificationRecipient({ recipientId }) {
    try {
      if (!recipientId) {
        throw new Error('Recipient ID is required');
      }

      await Notification.deleteRecipient({ recipientId });

      return successResponse(
        {
          recipient_id: recipientId
        },
        'Notification deleted successfully'
      );
    } catch (error) {
      throw error;
    }
  }

  static async searchNotifications({ userId, searchQuery, status, page, limit }) {
    try {
      if (!userId) {
        throw new Error('User ID is required to search notifications');
      }

      const constrainedLimit = Math.min(Math.max(limit, 1), 100);
      const safePage = Math.max(page, 1);
      const offset = (safePage - 1) * constrainedLimit;

      const { items, totalCount, unreadCount } = await Notification.search({
        userId,
        searchQuery: searchQuery || null,
        status: status || null,
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
          },
          search_query: searchQuery || null,
          status_filter: status || null
        },
        'Notifications searched successfully'
      );
    } catch (error) {
      throw error;
    }
  }
}

