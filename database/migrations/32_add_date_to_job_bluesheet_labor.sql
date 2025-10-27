-- Migration: Add date field to job_bluesheet_labor table
-- This allows each labor entry to have its own specific date

-- Add date column to job_bluesheet_labor table
ALTER TABLE job_bluesheet_labor 
ADD COLUMN IF NOT EXISTS date DATE;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_job_bluesheet_labor_date ON job_bluesheet_labor(date);

-- Add comment for documentation
COMMENT ON COLUMN job_bluesheet_labor.date IS 'Specific date for this labor entry (optional - inherits from bluesheet if not provided)';
