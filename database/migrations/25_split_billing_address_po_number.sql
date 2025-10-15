-- Split billing_address_po_number into separate fields
ALTER TABLE estimates 
ADD COLUMN IF NOT EXISTS billing_address TEXT;

ALTER TABLE estimates 
ADD COLUMN IF NOT EXISTS po_number VARCHAR(100);

-- Copy existing data from billing_address_po_number to po_number
UPDATE estimates 
SET po_number = billing_address_po_number 
WHERE billing_address_po_number IS NOT NULL;

-- Drop the old column
ALTER TABLE estimates DROP COLUMN IF EXISTS billing_address_po_number;

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_estimates_billing_address ON estimates(billing_address);
CREATE INDEX IF NOT EXISTS idx_estimates_po_number ON estimates(po_number);

-- Add comments
COMMENT ON COLUMN estimates.billing_address IS 'Billing address for the estimate';
COMMENT ON COLUMN estimates.po_number IS 'Purchase Order number for the estimate';
