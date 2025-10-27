-- Migration: Add description field to job_bluesheet_labor table
-- This adds a description field for labor entries to provide additional details

-- Add description column to job_bluesheet_labor table
ALTER TABLE job_bluesheet_labor ADD COLUMN IF NOT EXISTS description TEXT;

-- Add comment for documentation
COMMENT ON COLUMN job_bluesheet_labor.description IS 'Description or notes for the labor entry';

-- Add index for better performance on description searches (if needed)
-- CREATE INDEX IF NOT EXISTS idx_job_bluesheet_labor_description ON job_bluesheet_labor USING gin(to_tsvector('english', description));
