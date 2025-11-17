import { supabase } from '../config/database.js';

export class Notification {
  static async create(notificationData) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert([notificationData])
        .select('*')
        .single();

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  static async fetchByUser({ userId, status, offset, limit }) {
    try {
      const rangeEnd = offset + limit - 1;

      const notificationsQuery = supabase
        .from('notification_recipients')
        .select(
          `
            id,
            notification_id,
            status,
            delivered_at,
            read_at,
            created_at,
            notification:notifications (
              id,
              notification_title,
              message,
              custom_link,
              image_url,
              send_to_all,
              recipient_roles,
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
              created_at
            )
          `,
          { count: 'exact' }
        )
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, rangeEnd);

      if (status) {
        notificationsQuery.eq('status', status);
      }

      const unreadCountQuery = supabase
        .from('notification_recipients')
        .select('id', { head: true, count: 'exact' })
        .eq('user_id', userId)
        .eq('status', 'unread');

      const [
        { data, error, count },
        { count: unreadCount, error: unreadError }
      ] = await Promise.all([notificationsQuery, unreadCountQuery]);

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      if (unreadError) {
        throw new Error(`Database error: ${unreadError.message}`);
      }

      const items = (data || []).map((item) => ({
        recipient_id: item.id,
        notification_id: item.notification_id,
        status: item.status,
        delivered_at: item.delivered_at,
        read_at: item.read_at,
        created_at: item.created_at,
        notification: item.notification || null
      }));

      return {
        items,
        totalCount: count || 0,
        unreadCount: unreadCount || 0
      };
    } catch (error) {
      throw error;
    }
  }

  static async updateRecipientStatus({ recipientId, status }) {
    try {
      const payload = {
        status
      };

      if (status === 'read') {
        payload.read_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('notification_recipients')
        .update(payload)
        .eq('id', recipientId)
        .select('id, notification_id, user_id, status, read_at, delivered_at, created_at');

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return Array.isArray(data) ? data[0] : data;
    } catch (error) {
      throw error;
    }
  }

  static async markAllAsReadForUser({ userId }) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const readAt = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('notification_recipients')
        .update({
          status: 'read',
          read_at: readAt
        })
        .eq('user_id', userId)
        .eq('status', 'unread')
        .select('id');

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return {
        updated_count: data ? data.length : 0,
        user_id: userId,
        read_at: readAt
      };
    } catch (error) {
      throw error;
    }
  }

  static async deleteRecipient({ recipientId }) {
    try {
      const { data, error } = await supabase
        .from('notification_recipients')
        .delete()
        .eq('id', recipientId)
        .select('id')
        .single();

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  static async search({ userId, searchQuery, status, offset, limit }) {
    try {
     
      let matchingNotificationIds = null;
      
      if (searchQuery && searchQuery.trim()) {
        const searchTerm = `%${searchQuery.trim()}%`;
        
       
        const { data: matchingNotifications, error: searchError } = await supabase
          .from('notifications')
          .select('id')
          .or(`notification_title.ilike.${searchTerm},message.ilike.${searchTerm}`)
          .order('created_at', { ascending: false })
          .limit(500); 

        if (searchError) {
          throw new Error(`Database error: ${searchError.message}`);
        }

        matchingNotificationIds = (matchingNotifications || []).map(n => n.id);

        
        if (matchingNotificationIds.length === 0) {
          const { count: unreadCount } = await supabase
            .from('notification_recipients')
            .select('id', { head: true, count: 'exact' })
            .eq('user_id', userId)
            .eq('status', 'unread');
          
          return {
            items: [],
            totalCount: 0,
            unreadCount: unreadCount || 0
          };
        }
      }

      // Build optimized query with minimal fields in join
      let query = supabase
        .from('notification_recipients')
        .select(
          `
            id,
            notification_id,
            status,
            delivered_at,
            read_at,
            created_at,
            notification:notifications (
              id,
              notification_title,
              message,
              custom_link,
              image_url,
              send_to_all,
              recipient_roles,
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
              created_at
            )
          `,
          { count: 'exact' }
        )
        .eq('user_id', userId);

      // Filter by status if provided
      if (status) {
        query = query.eq('status', status);
      }

      // Filter by matching notification IDs if search was provided
      if (matchingNotificationIds && matchingNotificationIds.length > 0) {
        // Use in() with the IDs - PostgreSQL handles this efficiently with indexes
        query = query.in('notification_id', matchingNotificationIds);
      }

      // Apply pagination and ordering
      const rangeEnd = offset + limit - 1;
      query = query
        .order('created_at', { ascending: false })
        .range(offset, rangeEnd);

      // Get unread count in parallel (optimized - only if needed)
      const unreadCountQuery = supabase
        .from('notification_recipients')
        .select('id', { head: true, count: 'exact' })
        .eq('user_id', userId)
        .eq('status', 'unread');

      const [
        { data, error, count },
        { count: unreadCount, error: unreadError }
      ] = await Promise.all([query, unreadCountQuery]);

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      if (unreadError) {
        throw new Error(`Database error: ${unreadError.message}`);
      }

      const items = (data || []).map((item) => ({
        recipient_id: item.id,
        notification_id: item.notification_id,
        status: item.status,
        delivered_at: item.delivered_at,
        read_at: item.read_at,
        created_at: item.created_at,
        notification: item.notification || null
      }));

      return {
        items,
        totalCount: count || 0,
        unreadCount: unreadCount || 0
      };
    } catch (error) {
      throw error;
    }
  }
}

