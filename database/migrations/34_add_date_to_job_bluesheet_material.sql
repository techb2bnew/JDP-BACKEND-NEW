-- Migration: Add date field to job_bluesheet_material table
-- This adds a date field for material entries to track when materials were used

-- Add date column to job_bluesheet_material table
ALTER TABLE job_bluesheet_material ADD COLUMN IF NOT EXISTS date DATE;

-- Add comment for documentation
COMMENT ON COLUMN job_bluesheet_material.date IS 'Date of the material entry';

-- Add index for better performance on date queries
CREATE INDEX IF NOT EXISTS idx_job_bluesheet_material_date ON job_bluesheet_material(date);
