-- Add hours_worked column to labor table
-- This migration adds the hours_worked column to track total hours worked by labor

-- Add hours_worked column to labor table
ALTER TABLE labor ADD COLUMN IF NOT EXISTS hours_worked DECIMAL(8,2) DEFAULT 0;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_labor_hours_worked ON labor(hours_worked);

-- Update existing labor records to have 0 hours_worked (optional)
-- UPDATE labor SET hours_worked = 0 WHERE hours_worked IS NULL;
