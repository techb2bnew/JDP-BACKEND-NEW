-- Fix work_activity column type from JSONB to INTEGER
-- Run this script if you get the JSONB/INTEGER type error

-- Step 1: Drop the existing work_activity column if it exists
ALTER TABLE jobs DROP COLUMN IF EXISTS work_activity;

-- Step 2: Add work_activity as INTEGER column
ALTER TABLE jobs ADD COLUMN work_activity INTEGER DEFAULT 0;

-- Step 3: Add total_work_time if it doesn't exist
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS total_work_time INTERVAL DEFAULT '00:00:00';

-- Step 4: Update existing records to have default values
UPDATE jobs SET 
    work_activity = 0,
    total_work_time = '00:00:00'::interval
WHERE work_activity IS NULL OR total_work_time IS NULL;

-- Step 5: Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_jobs_work_activity ON jobs (work_activity);
CREATE INDEX IF NOT EXISTS idx_jobs_total_work_time ON jobs (total_work_time);

-- Step 6: Verify the changes
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'jobs' 
AND column_name IN ('work_activity', 'total_work_time');

-- Step 7: Test insert
INSERT INTO jobs (
    job_title, 
    job_type, 
    description, 
    priority, 
    status,
    work_activity,
    total_work_time,
    created_from
) VALUES (
    'Test Job - Simple Activity',
    'service_based',
    'Test job with simple activity count',
    'medium',
    'active',
    1,
    '01:30:00'::interval,
    'app'
);

-- Step 8: Verify the test insert
SELECT 
    id,
    job_title,
    work_activity,
    total_work_time
FROM jobs 
WHERE job_title = 'Test Job - Simple Activity';

-- Step 9: Clean up test data
DELETE FROM jobs WHERE job_title = 'Test Job - Simple Activity';

-- Success message
SELECT 'Migration completed successfully! work_activity is now INTEGER type.' as status;
