-- Remove CHECK constraint from invoice_type column
ALTER TABLE estimates DROP CONSTRAINT IF EXISTS estimates_invoice_type_check;

-- Update column to allow any varchar value
ALTER TABLE estimates ALTER COLUMN invoice_type TYPE VARCHAR(100);

-- Add comment
COMMENT ON COLUMN estimates.invoice_type IS 'Invoice type - can be any custom value';
