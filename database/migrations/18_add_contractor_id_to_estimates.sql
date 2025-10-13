-- Migration: Add contractor_id to estimates table
-- This adds a foreign key reference to contractors table

-- Add contractor_id column to estimates table
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS contractor_id INTEGER;

-- Add foreign key constraint
ALTER TABLE estimates 
ADD CONSTRAINT estimates_contractor_id_fkey 
FOREIGN KEY (contractor_id) 
REFERENCES contractors(id) 
ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_estimates_contractor_id ON estimates(contractor_id);

-- Add comment
COMMENT ON COLUMN estimates.contractor_id IS 'Foreign key reference to contractors table';
