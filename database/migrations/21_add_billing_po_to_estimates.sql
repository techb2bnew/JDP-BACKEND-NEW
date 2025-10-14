-- Migration: Add billing_address_po_number to estimates table
-- Description: Add PO number field for billing address

-- Add billing_address_po_number column to estimates table
ALTER TABLE estimates 
ADD COLUMN IF NOT EXISTS billing_address_po_number VARCHAR(100);

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_estimates_billing_po ON estimates(billing_address_po_number);

-- Add comment
COMMENT ON COLUMN estimates.billing_address_po_number IS 'Purchase Order number for billing address';

