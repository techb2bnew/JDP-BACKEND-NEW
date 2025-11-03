import { Notification } from '../models/Notification.js';
import { Job } from '../models/Job.js';
import { User } from '../models/User.js';
import { successResponse } from '../helpers/responseHelper.js';
import { supabase } from '../config/database.js';
import { safeJsonParse } from '../utils/helpers.js';

export class NotificationService {
  /**
   * Get user IDs from assigned lead labor and labor IDs
   */
  static async getAssignedUserIds(leadLaborIds, laborIds) {
    try {
      const userIds = new Set();

      // Get user IDs from lead labor
      if (leadLaborIds && leadLaborIds.length > 0) {
        const { data: leadLaborData, error: leadError } = await supabase
          .from('lead_labor')
          .select('user_id')
          .in('id', leadLaborIds);

        if (!leadError && leadLaborData) {
          leadLaborData.forEach(item => {
            if (item.user_id) userIds.add(item.user_id);
          });
        }
      }

      // Get user IDs from labor
      if (laborIds && laborIds.length > 0) {
        const { data: laborData, error: laborError } = await supabase
          .from('labor')
          .select('user_id')
          .in('id', laborIds);

        if (!laborError && laborData) {
          laborData.forEach(item => {
            if (item.user_id) userIds.add(item.user_id);
          });
        }
      }

      return Array.from(userIds);
    } catch (error) {
      console.error('Error getting assigned user IDs:', error);
      return [];
    }
  }

  /**
   * Get user to lead_labor/labor mapping
   * @returns {Array<{userId: number, lead_labor_id: number|null, labor_id: number|null}>}
   */
  static async getUserToLaborMapping(leadLaborIds, laborIds) {
    try {
      const mappings = [];

      // Get mappings from lead labor
      if (leadLaborIds && leadLaborIds.length > 0) {
        const { data: leadLaborData, error: leadError } = await supabase
          .from('lead_labor')
          .select('id, user_id')
          .in('id', leadLaborIds);

        if (!leadError && leadLaborData) {
          leadLaborData.forEach(item => {
            if (item.user_id) {
              mappings.push({
                userId: item.user_id,
                lead_labor_id: item.id,
                labor_id: null
              });
            }
          });
        }
      }

      // Get mappings from labor
      if (laborIds && laborIds.length > 0) {
        const { data: laborData, error: laborError } = await supabase
          .from('labor')
          .select('id, user_id')
          .in('id', laborIds);

        if (!laborError && laborData) {
          laborData.forEach(item => {
            if (item.user_id) {
              mappings.push({
                userId: item.user_id,
                lead_labor_id: null,
                labor_id: item.id
              });
            }
          });
        }
      }

      return mappings;
    } catch (error) {
      console.error('Error getting user to labor mapping:', error);
      return [];
    }
  }

  /**
   * Create a notification
   */
  static async createNotification(notificationData) {
    try {
      const notification = await Notification.create(notificationData);
      return successResponse(notification, 'Notification created successfully');
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create job completed notification
   * @param {number} jobId - Job ID
   * @param {string} milestone - Optional milestone name
   * @param {Array<number>} userIds - Array of user IDs to notify
   */
  static async createJobCompletedNotification(jobId, milestone = null, userIds = []) {
    try {
      const job = await Job.findById(jobId);
      if (!job) {
        throw new Error('Job not found');
      }

      // Get mappings for all users
      const leadLaborIds = safeJsonParse(job.assigned_lead_labor_ids, []);
      const laborIds = safeJsonParse(job.assigned_labor_ids, []);
      const userMappings = await this.getUserToLaborMapping(leadLaborIds, laborIds);

      // If no userIds provided, get from mappings
      if (!userIds || userIds.length === 0) {
        userIds = userMappings.map(m => m.userId);
      }

      const jobNumber = `JOB-${String(jobId).padStart(3, '0')}`;
      const jobTitle = job.job_title || 'Unknown Job';
      const jobType = job.job_type || 'service';

      let title = 'Job Completed';
      let message = `Job ${jobNumber} "${jobTitle}" has been completed.`;

      if (milestone) {
        title = 'Milestone Completed';
        message = `Milestone "${milestone}" completed for Job ${jobNumber} ${jobTitle}. ${
          jobType === 'contract_based' ? 'Contract-based job ready for next phase approval.' : 'Job ready for final review.'
        }`;
      } else {
        message += jobType === 'contract_based' ? ' Contract-based job ready for final approval.' : ' Ready for final invoicing.';
      }

      const notifications = [];
      for (const userId of userIds) {
        // Find the mapping for this user to get lead_labor_id or labor_id
        const userMapping = userMappings.find(m => m.userId === userId) || {};

        const notification = await Notification.create({
          user_id: userId,
          type: 'job_completed',
          title,
          message,
          related_entity_type: 'job',
          related_entity_id: jobId,
          lead_labor_id: userMapping.lead_labor_id || null,
          labor_id: userMapping.labor_id || null,
          metadata: {
            job_id: jobId,
            job_number: jobNumber,
            job_title: jobTitle,
            job_type: jobType,
            milestone: milestone || null
          }
        });
        notifications.push(notification);
      }

      return successResponse(notifications, 'Job completed notifications created successfully');
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create job assigned notification
   * @param {number} jobId - Job ID
   * @param {Array<number>} userIds - Array of user IDs to notify (assigned users)
   */
  static async createJobAssignedNotification(jobId, userIds = []) {
    try {
      const job = await Job.findById(jobId);
      if (!job) {
        throw new Error('Job not found');
      }

      // Get mappings for all users
      const leadLaborIds = safeJsonParse(job.assigned_lead_labor_ids, []);
      const laborIds = safeJsonParse(job.assigned_labor_ids, []);
      const userMappings = await this.getUserToLaborMapping(leadLaborIds, laborIds);

      // If no userIds provided, get from mappings
      if (!userIds || userIds.length === 0) {
        userIds = userMappings.map(m => m.userId);
      }

      const jobNumber = `JOB-${String(jobId).padStart(3, '0')}`;
      const jobTitle = job.job_title || 'Unknown Job';

      const title = 'New Job Assigned to You';
      const message = `New job assigned to you: Job ${jobNumber}, ${jobTitle}. Please review the job details and timeline.`;

      const notifications = [];
      for (const userId of userIds) {
        // Find the mapping for this user to get lead_labor_id or labor_id
        const userMapping = userMappings.find(m => m.userId === userId) || {};

        const notification = await Notification.create({
          user_id: userId,
          type: 'job_assigned',
          title,
          message,
          related_entity_type: 'job',
          related_entity_id: jobId,
          lead_labor_id: userMapping.lead_labor_id || null,
          labor_id: userMapping.labor_id || null,
          metadata: {
            job_id: jobId,
            job_number: jobNumber,
            job_title: jobTitle
          }
        });
        notifications.push(notification);
      }

      return successResponse(notifications, 'Job assigned notifications created successfully');
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create job status updated notification
   * @param {number} jobId - Job ID
   * @param {string} oldStatus - Previous status
   * @param {string} newStatus - New status
   * @param {number} updatedByUserId - User ID who updated the status
   * @param {Array<number>} userIds - Array of user IDs to notify
   */
  static async createJobStatusUpdatedNotification(jobId, oldStatus, newStatus, updatedByUserId, userIds = []) {
    try {
      const [job, updatedByUser] = await Promise.all([
        Job.findById(jobId),
        User.findById(updatedByUserId)
      ]);

      if (!job) {
        throw new Error('Job not found');
      }

      // Get mappings for all users
      const leadLaborIds = safeJsonParse(job.assigned_lead_labor_ids, []);
      const laborIds = safeJsonParse(job.assigned_labor_ids, []);
      const userMappings = await this.getUserToLaborMapping(leadLaborIds, laborIds);

      // If no userIds provided, get from mappings
      if (!userIds || userIds.length === 0) {
        userIds = userMappings.map(m => m.userId);
      }

      const jobNumber = `JOB-${String(jobId).padStart(3, '0')}`;
      const jobTitle = job.job_title || 'Unknown Job';
      const updatedByName = updatedByUser?.full_name || 'Unknown User';

      const title = 'Job Status Updated';
      let statusMessage = '';
      
      if (newStatus.toLowerCase() === 'completed') {
        statusMessage = `Job ${jobNumber} "${jobTitle}" status updated to Completed by ${updatedByName}. Ready for final invoicing.`;
      } else {
        statusMessage = `Job ${jobNumber} "${jobTitle}" status updated from ${oldStatus} to ${newStatus} by ${updatedByName}.`;
      }

      const notifications = [];
      for (const userId of userIds) {
        // Don't notify the user who made the update
        if (userId === updatedByUserId) continue;

        // Find the mapping for this user to get lead_labor_id or labor_id
        const userMapping = userMappings.find(m => m.userId === userId) || {};

        const notification = await Notification.create({
          user_id: userId,
          type: 'job_status_updated',
          title,
          message: statusMessage,
          related_entity_type: 'job',
          related_entity_id: jobId,
          lead_labor_id: userMapping.lead_labor_id || null,
          labor_id: userMapping.labor_id || null,
          metadata: {
            job_id: jobId,
            job_number: jobNumber,
            job_title: jobTitle,
            old_status: oldStatus,
            new_status: newStatus,
            updated_by: updatedByUserId,
            updated_by_name: updatedByName
          }
        });
        notifications.push(notification);
      }

      return successResponse(notifications, 'Job status updated notifications created successfully');
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create job deleted notification
   * @param {number} jobId - Job ID (before deletion)
   * @param {string} jobNumber - Job number
   * @param {string} jobTitle - Job title
   * @param {number} deletedByUserId - User ID who deleted the job
   * @param {Array<number>} userIds - Array of user IDs to notify
   */
  static async createJobDeletedNotification(jobId, jobNumber, jobTitle, deletedByUserId, userIds = []) {
    try {
      const deletedByUser = await User.findById(deletedByUserId);
      const deletedByName = deletedByUser?.full_name || 'Unknown User';

      const title = 'Job Deleted';
      const message = `Job ${jobNumber} "${jobTitle}" has been deleted by ${deletedByName}.`;

      const notifications = [];
      for (const userId of userIds) {
        // Don't notify the user who deleted
        if (userId === deletedByUserId) continue;

        const notification = await Notification.create({
          user_id: userId,
          type: 'job_deleted',
          title,
          message,
          related_entity_type: 'job',
          related_entity_id: jobId,
          metadata: {
            job_id: jobId,
            job_number: jobNumber,
            job_title: jobTitle,
            deleted_by: deletedByUserId,
            deleted_by_name: deletedByName
          }
        });
        notifications.push(notification);
      }

      return successResponse(notifications, 'Job deleted notifications created successfully');
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create new job created notification
   * @param {number} jobId - Job ID
   * @param {number} createdByUserId - User ID who created the job
   * @param {Array<number>} userIds - Array of user IDs to notify
   */
  static async createJobCreatedNotification(jobId, createdByUserId, userIds = []) {
    try {
      const [job, createdByUser] = await Promise.all([
        Job.findById(jobId),
        User.findById(createdByUserId)
      ]);

      if (!job) {
        throw new Error('Job not found');
      }

      // Get mappings for all users
      const leadLaborIds = safeJsonParse(job.assigned_lead_labor_ids, []);
      const laborIds = safeJsonParse(job.assigned_labor_ids, []);
      const userMappings = await this.getUserToLaborMapping(leadLaborIds, laborIds);

      // If no userIds provided, get from mappings
      if (!userIds || userIds.length === 0) {
        userIds = userMappings.map(m => m.userId);
      }

      const jobNumber = `JOB-${String(jobId).padStart(3, '0')}`;
      const jobTitle = job.job_title || 'Unknown Job';
      const createdByName = createdByUser?.full_name || 'Unknown User';

      const title = 'New Job Created';
      const message = `New job created: Job ${jobNumber} "${jobTitle}" by ${createdByName}.`;

      const notifications = [];
      for (const userId of userIds) {
        // Don't notify the user who created
        if (userId === createdByUserId) continue;

        // Find the mapping for this user to get lead_labor_id or labor_id
        const userMapping = userMappings.find(m => m.userId === userId) || {};

        const notification = await Notification.create({
          user_id: userId,
          type: 'job_created',
          title,
          message,
          related_entity_type: 'job',
          related_entity_id: jobId,
          lead_labor_id: userMapping.lead_labor_id || null,
          labor_id: userMapping.labor_id || null,
          metadata: {
            job_id: jobId,
            job_number: jobNumber,
            job_title: jobTitle,
            created_by: createdByUserId,
            created_by_name: createdByName
          }
        });
        notifications.push(notification);
      }

      return successResponse(notifications, 'Job created notifications created successfully');
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get notifications for a user
   */
  static async getNotifications(userId, options = {}) {
    try {
      const result = await Notification.findByUserId(userId, options);
      return successResponse(result, 'Notifications retrieved successfully');
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get unread notification count
   */
  static async getUnreadCount(userId) {
    try {
      const count = await Notification.getUnreadCount(userId);
      return successResponse({ unread_count: count }, 'Unread count retrieved successfully');
    } catch (error) {
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId) {
    try {
      const notification = await Notification.markAsRead(notificationId);
      return successResponse(notification, 'Notification marked as read');
    } catch (error) {
      throw error;
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(userId) {
    try {
      const notifications = await Notification.markAllAsRead(userId);
      return successResponse(
        { count: notifications.length, notifications },
        'All notifications marked as read'
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete notification
   */
  static async deleteNotification(notificationId) {
    try {
      const result = await Notification.delete(notificationId);
      return successResponse(result, 'Notification deleted successfully');
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete all notifications for a user
   */
  static async deleteAllNotifications(userId) {
    try {
      const result = await Notification.deleteByUserId(userId);
      return successResponse(result, 'All notifications deleted successfully');
    } catch (error) {
      throw error;
    }
  }
}

