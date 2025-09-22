-- Add work activity and total work time fields to existing jobs table
-- Run this script to add the new fields to your existing database

-- Add work_activity field (INTEGER to store simple activity count like 1, 2, 20)
-- First check if column exists and change type if it's JSONB
DO $$ 
BEGIN
    -- If column exists as JSONB, drop it and recreate as INTEGER
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'jobs' 
        AND column_name = 'work_activity' 
        AND data_type = 'jsonb'
    ) THEN
        ALTER TABLE jobs DROP COLUMN work_activity;
    END IF;
    
    -- Add the column as INTEGER
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'jobs' 
        AND column_name = 'work_activity'
    ) THEN
        ALTER TABLE jobs ADD COLUMN work_activity INTEGER DEFAULT 0;
    END IF;
END $$;

-- Add total_work_time field (INTERVAL to store work time)
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS total_work_time INTERVAL DEFAULT '00:00:00';

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_jobs_work_activity ON jobs (work_activity);
CREATE INDEX IF NOT EXISTS idx_jobs_total_work_time ON jobs (total_work_time);

-- Update existing records to have default values
UPDATE jobs SET 
    work_activity = 0,
    total_work_time = '00:00:00'::interval
WHERE work_activity IS NULL OR total_work_time IS NULL;

-- Verify the changes
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'jobs' 
AND column_name IN ('work_activity', 'total_work_time');
