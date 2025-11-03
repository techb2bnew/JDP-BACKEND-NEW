-- Migration: Create notifications table
-- This table stores all system notifications

CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (
        type IN ('job_completed', 'job_assigned', 'job_status_updated', 'job_deleted', 'job_created')
    ),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    related_entity_type VARCHAR(50), -- e.g., 'job', 'estimate'
    related_entity_id INTEGER, -- ID of related job, estimate, etc.
    lead_labor_id INTEGER REFERENCES lead_labor(id) ON DELETE SET NULL, -- Reference to lead labor if applicable
    labor_id INTEGER REFERENCES labor(id) ON DELETE SET NULL, -- Reference to labor if applicable
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    metadata JSONB, -- Store additional data like job details, status changes, etc.
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_related_entity ON notifications(related_entity_type, related_entity_id);
CREATE INDEX IF NOT EXISTS idx_notifications_lead_labor_id ON notifications(lead_labor_id);
CREATE INDEX IF NOT EXISTS idx_notifications_labor_id ON notifications(labor_id);

-- Add comments for documentation
COMMENT ON TABLE notifications IS 'System notifications for users';
COMMENT ON COLUMN notifications.type IS 'Type of notification: job_completed, job_assigned, job_status_updated, job_deleted, job_created';
COMMENT ON COLUMN notifications.related_entity_type IS 'Type of related entity (job, estimate, etc.)';
COMMENT ON COLUMN notifications.related_entity_id IS 'ID of the related entity';
COMMENT ON COLUMN notifications.lead_labor_id IS 'Reference to lead labor if notification is specific to a lead labor';
COMMENT ON COLUMN notifications.labor_id IS 'Reference to labor if notification is specific to a labor';
COMMENT ON COLUMN notifications.metadata IS 'Additional JSON data like job details, status changes, etc.';

