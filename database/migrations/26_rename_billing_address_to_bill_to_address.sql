-- Rename billing_address to bill_to_address
ALTER TABLE estimates 
RENAME COLUMN billing_address TO bill_to_address;

-- Update index name
DROP INDEX IF EXISTS idx_estimates_billing_address;
CREATE INDEX IF NOT EXISTS idx_estimates_bill_to_address ON estimates(bill_to_address);

-- Update comment
COMMENT ON COLUMN estimates.bill_to_address IS 'Bill to address for the estimate';
