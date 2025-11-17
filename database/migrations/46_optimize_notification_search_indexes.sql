-- Optimize notification search queries with composite indexes
-- This migration adds indexes to improve search performance

-- Composite index for notification_recipients queries (user_id + status + created_at)
-- This covers the common query pattern: WHERE user_id = X AND status = Y ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_notification_recipients_user_status_created 
  ON notification_recipients(user_id, status, created_at DESC);

-- Composite index for notification_recipients queries with just user_id and created_at
-- For queries without status filter
CREATE INDEX IF NOT EXISTS idx_notification_recipients_user_created 
  ON notification_recipients(user_id, created_at DESC);

-- Index for notification_id lookups (for search filtering)
CREATE INDEX IF NOT EXISTS idx_notification_recipients_notification_id_created 
  ON notification_recipients(notification_id, created_at DESC);

-- Index for notifications table on created_at (for search ordering)
CREATE INDEX IF NOT EXISTS idx_notifications_created_at_desc 
  ON notifications(created_at DESC);

-- Enable pg_trgm extension for faster ILIKE searches (if not already enabled)
-- Note: This requires superuser privileges. Run manually if needed:
-- CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- GIN indexes for text search (uncomment after enabling pg_trgm extension)
-- These dramatically speed up ILIKE queries on notification_title and message
-- CREATE INDEX IF NOT EXISTS idx_notifications_title_trgm 
--   ON notifications USING gin(notification_title gin_trgm_ops);
-- CREATE INDEX IF NOT EXISTS idx_notifications_message_trgm 
--   ON notifications USING gin(message gin_trgm_ops);

