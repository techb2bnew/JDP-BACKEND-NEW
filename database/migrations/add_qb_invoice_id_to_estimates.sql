-- Add QuickBooks Invoice ID column to estimates table
ALTER TABLE estimates 
ADD COLUMN IF NOT EXISTS qb_invoice_id VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_estimates_qb_invoice_id 
ON estimates(qb_invoice_id);

COMMENT ON COLUMN estimates.qb_invoice_id IS 'QuickBooks Invoice ID for syncing invoices with QuickBooks Online';
