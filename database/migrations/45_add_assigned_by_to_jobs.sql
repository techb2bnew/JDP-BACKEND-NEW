-- Migration: Add assigned_by field to jobs table
-- This field stores the user ID who assigned the job to labor/lead labor

-- Add assigned_by field to jobs table
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS assigned_by INTEGER REFERENCES users(id) ON DELETE SET NULL;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_jobs_assigned_by ON jobs(assigned_by);

COMMENT ON COLUMN jobs.assigned_by IS 'User ID who assigned the job to labor/lead labor';

