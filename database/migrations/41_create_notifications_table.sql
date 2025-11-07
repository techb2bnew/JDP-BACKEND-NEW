-- Create notifications table (new structure)
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    notification_title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    custom_link TEXT,
    image_url TEXT,

    send_to_all BOOLEAN DEFAULT FALSE,
    recipient_roles TEXT[] DEFAULT ARRAY[]::TEXT[],

    order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
    job_id INTEGER REFERENCES jobs(id) ON DELETE SET NULL,
    product_id BIGINT REFERENCES products(id) ON DELETE SET NULL,
    customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
    contractor_id INTEGER REFERENCES contractors(id) ON DELETE SET NULL,
    bluesheet_id INTEGER REFERENCES job_bluesheet(id) ON DELETE SET NULL,
    staff_id INTEGER REFERENCES staff(id) ON DELETE SET NULL,
    lead_labor_id INTEGER REFERENCES lead_labor(id) ON DELETE SET NULL,
    labor_id INTEGER REFERENCES labor(id) ON DELETE SET NULL,
    supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,

    created_at TIMESTAMP DEFAULT NOW()
);

-- Helpful indexes for querying
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_send_to_all ON notifications(send_to_all);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_roles ON notifications USING GIN(recipient_roles);
CREATE INDEX IF NOT EXISTS idx_notifications_job_id ON notifications(job_id);
CREATE INDEX IF NOT EXISTS idx_notifications_order_id ON notifications(order_id);
CREATE INDEX IF NOT EXISTS idx_notifications_customer_id ON notifications(customer_id);
CREATE INDEX IF NOT EXISTS idx_notifications_contractor_id ON notifications(contractor_id);
CREATE INDEX IF NOT EXISTS idx_notifications_lead_labor_id ON notifications(lead_labor_id);
CREATE INDEX IF NOT EXISTS idx_notifications_labor_id ON notifications(labor_id);
CREATE INDEX IF NOT EXISTS idx_notifications_staff_id ON notifications(staff_id);
CREATE INDEX IF NOT EXISTS idx_notifications_supplier_id ON notifications(supplier_id);

-- Documentation comments
COMMENT ON TABLE notifications IS 'System notifications with optional links to jobs, orders, and related entities';
COMMENT ON COLUMN notifications.image_url IS 'Optional image or icon path associated with the notification';

