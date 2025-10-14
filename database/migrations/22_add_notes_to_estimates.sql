-- Migration: Add notes column to estimates table
-- Date: 2025-10-14

-- Add notes column to estimates table
ALTER TABLE estimates 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add index for better performance on notes search
CREATE INDEX IF NOT EXISTS idx_estimates_notes ON estimates(notes);

-- Add comment for documentation
COMMENT ON COLUMN estimates.notes IS 'Additional notes or comments for the estimate';
