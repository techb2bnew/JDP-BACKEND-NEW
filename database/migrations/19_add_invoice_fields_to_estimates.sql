-- Add invoice-related fields to estimates table
ALTER TABLE estimates 
ADD COLUMN IF NOT EXISTS invoice_link TEXT,
ADD COLUMN IF NOT EXISTS invoice_sent_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS invoice_sent_to VARCHAR(255),
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'draft';

-- Add comments for documentation
COMMENT ON COLUMN estimates.invoice_link IS 'S3 URL of the generated invoice PDF';
COMMENT ON COLUMN estimates.invoice_sent_at IS 'Timestamp when invoice was sent to customer';
COMMENT ON COLUMN estimates.invoice_sent_to IS 'Email address where invoice was sent';
COMMENT ON COLUMN estimates.status IS 'Status of the estimate: draft, sent, viewed, accepted, rejected';
