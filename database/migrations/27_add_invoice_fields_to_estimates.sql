-- Migration: Add invoice fields to estimates table
-- Created: 2025-01-17
-- Description: Add rep, payment_credits, and balance_due fields to estimates table

-- Add new columns to estimates table
ALTER TABLE estimates 
ADD COLUMN IF NOT EXISTS rep VARCHAR(100),
ADD COLUMN IF NOT EXISTS payment_credits DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS balance_due DECIMAL(10,2);

-- Add comments for documentation
COMMENT ON COLUMN estimates.rep IS 'Representative name for the invoice';
COMMENT ON COLUMN estimates.payment_credits IS 'Total payments and credits received';
COMMENT ON COLUMN estimates.balance_due IS 'Outstanding balance due';

-- Create index on rep for faster queries (optional)
CREATE INDEX IF NOT EXISTS idx_estimates_rep ON estimates(rep);

-- Update existing records to have default values
UPDATE estimates 
SET payment_credits = 0.00 
WHERE payment_credits IS NULL;

-- Set balance_due based on total_amount - payment_credits for existing records
UPDATE estimates 
SET balance_due = (total_amount - COALESCE(payment_credits, 0.00))
WHERE balance_due IS NULL AND total_amount IS NOT NULL;
