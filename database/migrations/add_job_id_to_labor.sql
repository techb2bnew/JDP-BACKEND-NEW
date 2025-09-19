-- Add job_id column to labor table
-- This migration adds the job_id foreign key to link custom labor with jobs

-- Add job_id column to labor table
ALTER TABLE labor ADD COLUMN IF NOT EXISTS job_id INT REFERENCES jobs(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_labor_job_id ON labor(job_id);

-- Update existing labor records to have NULL job_id (optional)
-- UPDATE labor SET job_id = NULL WHERE job_id IS NULL;
