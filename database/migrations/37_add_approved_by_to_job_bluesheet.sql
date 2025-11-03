-- Migration: Add approved_by to job_bluesheet table
-- This adds a column to track who approved the bluesheet

-- Add approved_by column to job_bluesheet table
ALTER TABLE job_bluesheet 
ADD COLUMN IF NOT EXISTS approved_by INTEGER REFERENCES users(id);

-- Add comment to the column for documentation
COMMENT ON COLUMN job_bluesheet.approved_by IS 'Reference to the user who approved this bluesheet';

-- Create index for better performance when querying by approver
CREATE INDEX IF NOT EXISTS idx_job_bluesheet_approved_by ON job_bluesheet(approved_by);

