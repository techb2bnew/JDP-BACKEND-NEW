-- Migration: Add down_payment to invoice_type enum
-- This adds 'down_payment' as a new invoice type option

-- First, drop the existing check constraint
ALTER TABLE estimates DROP CONSTRAINT IF EXISTS estimates_invoice_type_check;

-- Add the new check constraint with down_payment included
ALTER TABLE estimates ADD CONSTRAINT estimates_invoice_type_check 
CHECK (invoice_type IN ('estimate', 'proposal_invoice', 'progressive_invoice', 'final_invoice', 'down_payment'));

-- Update the default value if needed (keeping 'estimate' as default)
ALTER TABLE estimates ALTER COLUMN invoice_type SET DEFAULT 'estimate';

-- Add comment
COMMENT ON COLUMN estimates.invoice_type IS 'Invoice type: estimate, proposal_invoice, progressive_invoice, final_invoice, or down_payment';
