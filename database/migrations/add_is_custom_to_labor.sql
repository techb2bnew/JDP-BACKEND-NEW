-- Add is_custom column to labor table
-- This migration adds the is_custom column to distinguish custom labor from regular labor

-- Add is_custom column to labor table
ALTER TABLE labor ADD COLUMN IF NOT EXISTS is_custom BOOLEAN DEFAULT FALSE;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_labor_is_custom ON labor(is_custom);

-- Update existing labor records to have is_custom = false (optional)
-- UPDATE labor SET is_custom = FALSE WHERE is_custom IS NULL;
